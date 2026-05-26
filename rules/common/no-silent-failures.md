# No-Silent-Failures Rule (Always-On, Global)

> Auto-fires on every file. Sister to `no-silent-drops.md` (don't bury work) and `sonarlint-checks.md` (linter rules).

## Core Principle

**Every error is a status. Every status is reported.**

Code that swallows an exception, logs nothing on a failed network call, or shows the user a green checkmark for an operation whose sub-step actually failed — all of these are bugs, not subjective style. The user can't act on what they can't see, and on-call can't debug what wasn't logged.

This rule is enforced by lint config (see "Enforcement" below) so it is tool-agnostic — Claude, Cursor, ChatGPT, or a human committing manually all see the same failures.

## Specific Rules

### 1. No raw `console.*` in product code

Production source files do not call `console.log`, `console.warn`, `console.error`, `console.info`, or `console.debug` directly.

**Use the project's logger:**

```ts
// Frontend (Vue / React / vanilla TS):
import { log } from "@/lib/logger";
log.error("Roadmap export failed", err, { roadmap_id });

// Backend (Node):
import { logError, logInfo, logWarn } from "../lib/logger.js";
logError("DDB write failed", { table, key, error: err });
```

**Allowlisted exceptions** (and only these):

- The logger module itself.
- One-shot CLI scripts where the console *is* the output channel (`scripts/*.ts`).
- EMF metric emitters that write structured JSON for CloudWatch ingest.

Any new file that needs to log goes through the logger, not the console.

### 2. No empty `catch` blocks

```ts
// WRONG
try { await thing(); } catch {}

// WRONG (comment doesn't make it not silent)
try { await thing(); } catch { /* fall back */ }

// RIGHT
try { await thing(); } catch (err) {
  log.warn("thing failed; falling back", { error: String(err) });
}
```

If the failure is genuinely expected and recoverable (browser feature detection, optional best-effort cache write), still log at `debug` so we can see it during incident response.

### 3. No silent fire-and-forget `.catch()`

The following patterns are linted as errors:

```ts
// All forbidden:
foo().catch(() => {})
foo().catch(() => undefined)
foo().catch(() => null)
foo().catch(() => false)
foo().catch(() => "")
```

Replace with:

```ts
foo().catch((err) => {
  log.warn("foo failed", { error: String(err) });
});
```

If user-visible (toast, banner, redirect to error page), surface to the user too.

### 4. No false-positive success

The user-visible outcome must reflect what actually happened.

```ts
// WRONG — success toast fires even when clipboard write failed
await store.share(id);
await navigator.clipboard.writeText(url).catch(() => null);
toast.success("Share link copied");

// RIGHT
await store.share(id);
let copied = true;
try { await navigator.clipboard.writeText(url); } catch { copied = false; }
if (copied) toast.success("Share link copied", { description: url });
else toast.info("Share link ready (clipboard blocked)", { description: url });
```

This applies to:

- Cascading deletes / batch operations: if some children failed, say so.
- Partial sync results: report `synced N of M` instead of "Sync complete".
- Idempotent retries: report `already done` distinctly from `did it now`.
- Optional sub-steps: if the optional step failed, the toast says so.

### 5. Every async op has a known status

When the user is actively waiting on an async operation, the UI must visibly transition through:

- **idle → pending** (button disabled, spinner, optimistic state)
- **pending → success** (toast / state update / navigation)
- **pending → error** (toast.error with actionable copy, plus rollback of any optimistic state)

A status transition must happen on every code path, including thrown exceptions, network timeouts, and AbortController cancellations.

### 6. Optimistic updates roll back on failure

```ts
// WRONG — leaves the UI showing read=true when the API call failed
notification.read_at = new Date().toISOString();
unreadCount--;
await apiPost("/notifications/mark-read", ...).catch(() => {});

// RIGHT
notification.read_at = new Date().toISOString();
unreadCount--;
try {
  await apiPost("/notifications/mark-read", ...);
} catch (err) {
  notification.read_at = undefined;
  unreadCount++;
  log.warn("mark-read failed; rolled back", { error: String(err) });
  toast.error("Couldn't mark as read — try again");
}
```

### 7. No `as` casts that hide a failed operation

```ts
// WRONG — caller never finds out the parse failed
return JSON.parse(maybeBad) as MyType;

// RIGHT
const parsed = parseJson<MyType>(maybeBad);
if (!parsed.ok) {
  log.warn("payload parse failed", { error: parsed.error });
  return null;
}
return parsed.value;
```

Type assertions are not error handling.

### 8. Webhook / queue handlers report partial success

A webhook handler that processes 10 events and 3 fail must:

- Acknowledge the original webhook (so the platform doesn't retry the whole batch).
- Push the 3 failures to a DLQ or retry queue with logged context.
- Emit a metric for the partial-failure count.

A 200 OK from a handler that silently dropped 3 of 10 is a false-positive success.

## Enforcement

The lint config in every TS / JS project must include:

```js
// eslint.config.js
const SILENT_FAILURE_GUARDRAILS = {
  "no-console": "error",
  "no-empty": ["error", { allowEmptyCatch: false }],
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "CallExpression[callee.property.name='catch'][arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='BlockStatement'][arguments.0.body.body.length=0]",
      message: "Empty .catch() swallows errors silently. Use .catch((err) => log.warn(...)).",
    },
    {
      selector:
        "CallExpression[callee.property.name='catch'][arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='Literal']",
      message: "Returning a literal from .catch() is a silent fallback. Log the error or convert to an explicit Result type.",
    },
    {
      selector:
        "CallExpression[callee.property.name='catch'][arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='Identifier'][arguments.0.body.name='undefined']",
      message: "Returning undefined from .catch() is a silent fallback. Log the error.",
    },
  ],
};
```

Allowlist `src/lib/logger.ts` (or equivalent) for `no-console`. Do not add per-line `eslint-disable` directives — fix the underlying call instead.

## Logger contract

Every project's logger module exposes at minimum:

```ts
log.debug(message: string, meta?: object): void  // dev-only by default
log.info (message: string, meta?: object): void
log.warn (message: string, meta?: object): void
log.error(message: string, error?: unknown, meta?: object): void
```

`log.error` accepts the original `error` so the logger can extract `{name, message, stack}` for downstream RUM (Sentry, Datadog Browser, CloudWatch). The error never gets stringified and lost.

## Why this rule exists

A handful of recurring bugs in production all traced back to the same shape — an exception was caught, no one logged it, the user saw a success state, and the broken state only surfaced hours later when a downstream consumer noticed. The cost of one extra logged warning is zero; the cost of an undebuggable failure is hours of incident response.

## When the rule needs an exception

If a specific catch is genuinely best-effort and the failure is uninteresting (e.g., reading an HTTP error body for context, where missing body is fine), wrap the call so the error is captured at `debug` level — never let it disappear. The rule of thumb: if you'd want to see the error count in a metric over a year, log it. If the answer is "no", you're probably wrong about it being uninteresting.

## Cross-language equivalents

The same rule applies to every language. The mechanics differ; the
intent does not.

### Go

```go
// WRONG
result, err := doThing()
_ = err

// WRONG
defer func() { _ = file.Close() }()

// RIGHT
result, err := doThing()
if err != nil {
  log.Warn().Err(err).Msg("doThing failed")
  return nil, fmt.Errorf("doThing: %w", err)
}

// RIGHT (deferred close where the error matters)
defer func() {
  if err := file.Close(); err != nil {
    log.Warn().Err(err).Str("path", path).Msg("file close failed")
  }
}()
```

Lint: `errcheck`, `staticcheck`, `golangci-lint` (with `errcheck`,
`errorlint`, `revive` enabled). Disallow `_ = err` in production code.

### Python

```python
# WRONG
try:
    do_thing()
except Exception:
    pass

# WRONG
try:
    do_thing()
except Exception:  # noqa
    return None

# RIGHT
try:
    do_thing()
except Exception:
    logger.warning("do_thing failed", exc_info=True)
    raise
```

Lint: `ruff` rules `BLE001` (blind-except), `S110` (silent except-pass),
`TRY002`, `TRY400`. Forbid `except: pass` and `except Exception: pass`
except in vetted finalizers.

### Java / Spring

```java
// WRONG
try { thing(); } catch (Exception e) {}

// RIGHT
try {
    thing();
} catch (IOException e) {
    log.warn("thing failed", e);
    throw new ServiceException("thing failed", e);
}
```

Lint: SonarJava `S108` (empty catch block), `S2147`, `S1166`
(re-throw). Disallow `e.printStackTrace()` in production.

### C#

```csharp
// WRONG
try { Thing(); } catch { }

// RIGHT
try {
    Thing();
} catch (Exception ex) {
    _logger.LogWarning(ex, "Thing failed");
    throw;
}
```

Lint: SonarC# `S2486` (empty catch), `S108`. Disallow `catch { }`
without binding the exception.

### Swift

```swift
// WRONG
do { try thing() } catch { }

// RIGHT
do {
    try thing()
} catch {
    logger.warning("thing failed: \(error.localizedDescription)")
    throw error
}
```

Lint: SwiftLint `empty_catch` (warn → error), `discarded_notification_center_observer`.

### Rust

```rust
// WRONG
let _ = thing();

// WRONG
match thing() { Ok(v) => v, Err(_) => default }

// RIGHT
thing().unwrap_or_else(|err| {
    tracing::warn!(?err, "thing failed");
    default
})
```

Lint: clippy `let_underscore_must_use`, `let_underscore_drop`.

### Dart / Flutter

```dart
// WRONG
try { thing(); } catch (_) {}

// RIGHT
try {
  thing();
} catch (err, st) {
  log.warning('thing failed', err, st);
  rethrow;
}
```

Lint: `unawaited_futures`, `empty_catches`, `avoid_catches_without_on_clauses`.

### C / C++

```cpp
// WRONG
auto rc = doThing();
(void)rc;

// RIGHT
if (auto rc = doThing(); rc != Status::Ok) {
  spdlog::warn("doThing failed: rc={}", rc);
  return rc;
}
```

For exception code, the C# / Java rules apply; for return-code C, every
non-`Ok` return must be logged or propagated.

## Reference

- `no-silent-drops.md` — sister rule on not silently deleting work.
- `sonarlint-checks.md` — broader linter coverage.
- `done-criteria.md` — service-migration done checklist.
- `~/.claude/scripts/hooks/post-edit-no-discards.js` — PostToolUse hook that already blocks `console.log` in production source on save.
