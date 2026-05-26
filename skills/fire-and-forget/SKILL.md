---
name: fire-and-forget
description: The canonical shape for "kick off this side effect but don't block the user". Use stringifyError-backed helpers, never raw .catch(() => null) or void promise().
---

# Fire-and-Forget Side Effects

Companion skill to `no-silent-failures.md` and `no-discards.md`.

## When to Activate

- Triggering a side effect that the user doesn't need to wait for
  (audit log write, analytics emit, optimistic cache warm, peer-tab
  broadcast, in-memory cache invalidation).
- Background work the response shouldn't block on (post-login
  reconciliation, idempotent telemetry, best-effort cleanup).
- Cleanup work in a `finally` / `try` tail that can't change the
  caller's observable behaviour.

## What this skill prevents

`.catch(() => null)`, `.catch(() => undefined)`, `.catch(() => {})`,
`void store.save()`, and friends — all silent failures. A fire-and-
forget that loses its error is a bug that surfaces hours later in
production when an operator looks at the count and can't find it.

## The canonical shape

A `fireAndForget(name, promise)` helper that:

1. Awaits the promise on a microtask queue (no blocking).
2. Catches and logs via the project logger with
   `stringifyError(err)` — never the `err instanceof Error ? err.message : String(err)`
   inline ternary that breaks on plain object errors.
3. Optionally emits an EMF metric so the failure rate is observable.

```ts
// backend/src/lib/fireAndForget.ts (canonical)
import { logError } from "./logger.js";
import { stringifyError } from "./logger.js";

export function fireAndForget(name: string, p: Promise<unknown>): void {
  p.catch((err: unknown) => {
    logError(`fireAndForget(${name}) failed`, {
      operation: name,
      error: stringifyError(err),
    });
  });
}
```

```ts
// frontend/src/lib/fireAndForget.ts (canonical)
import { log, stringifyError } from "./logger";

export function fireAndForget(name: string, p: Promise<unknown>): void {
  p.catch((err: unknown) => {
    log.warn(`fireAndForget(${name}) failed`, {
      operation: name,
      error: stringifyError(err),
    });
  });
}
```

## How to use

```ts
// WRONG — silent
void store.refreshAfterDelete();

// WRONG — silent fallback
store.refreshAfterDelete().catch(() => null);

// WRONG — partial: error captured but message is "[object Object]"
store.refreshAfterDelete().catch((err) => {
  log.warn("refresh failed", { error: String(err) });
});

// RIGHT — fire-and-forget, named, properly stringified
fireAndForget("refreshAfterDelete", store.refreshAfterDelete());
```

## When fire-and-forget is the WRONG shape

If the side effect's outcome is user-visible, fire-and-forget is the
wrong shape — surface the result via toast / banner / typed return
instead.

- "Did the save succeed?" → user must know → await + toast.
- "Did the audit row get written?" → operational, surface via metric
  / log → fire-and-forget.
- "Did the cache warm?" → never user-visible → fire-and-forget.
- "Did the Slack DM go out?" → may matter operationally → outbox
  pattern (at-least-once delivery), not fire-and-forget.

## Spot the bug

Patterns that hint at hidden silent failures:

- `void promise()` outside an explicit fire-and-forget wrapper.
- `.catch(() => null)` / `.catch(() => undefined)` / `.catch(() => false)` / `.catch(() => {})`.
- Inline `err instanceof Error ? err.message : String(err)` —
  produces `[object Object]` on plain-object errors; use
  `stringifyError` from the project logger.
- A try/catch that catches Error and logs without including the
  operation name + context.
- `setTimeout(() => x().catch(noop), 0)` — same shape, different
  syntax, same bug.

## Cross-references

- `~/.claude/rules/common/no-silent-failures.md` — the rule that
  bans the silent shapes.
- `~/.claude/rules/common/no-discards.md` — S6551 inline ternary
  ban; use `stringifyError` instead.
- Project `lib/logger.ts` — exports `stringifyError`.
