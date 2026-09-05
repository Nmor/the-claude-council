# No-Discards Rule (Strict, Always-On, Global)

> Auto-fires on every file. Sister to `no-silent-failures.md` (don't swallow errors), `no-silent-drops.md` (don't bury work), and `sonarlint-checks.md` (linter rule reference). This rule is **hook-enforced** by `~/.claude/scripts/hooks/lib/no-discards-rules.js` — edits that introduce a discard pattern are rejected with exit status 2.

## Core principle

**Every value must be bound, every error must be wrapped with context, and every failure must produce an actionable message on both the server side (logs, traces, metrics) AND the client side (toast, banner, status, retry affordance).**

A discard is any place where a meaningful value position is filled with `_` (Go), `,` with omission (JS destructuring), `void` casts, or other ignore-this-value patterns. Discards bury information that the caller either needed but threw away, or didn't need but couldn't be bothered to think about. Both are bugs in slow motion.

A *silent failure* is worse: an error is caught, the user sees a "success" state, and the broken state only surfaces hours later when a downstream consumer notices. The cost of one extra logged warning is zero; the cost of an undebuggable failure is hours of incident response.

The rule applies to: production source, tests, scripts, generated code wrappers, anything Claude or any agent writes. Test files have **no exemption** — bind the index, name the subtest, use the position.

## Error-message contract (server + client)

For every failure path the codebase must produce **all three** of:

1. **Server log entry** — structured (slog/zerolog/etc.), includes the operation name, the relevant ids (user_id, event_id, request_id), and the wrapped error chain. Never just `log.Error(err)`. Always include context that helps oncall reproduce the failure without re-reading the source.

2. **API response payload** — when the request originated from a client, the response body must include a stable error `code` (e.g. `ERR_PAY_001`) and a human-readable `message` that the client can render verbatim. The HTTP status must match the semantics (`400` for client error, `409` for conflict, `422` for validation, `500` only for genuine server bugs).

3. **Client surface** — the frontend must turn the error code into a toast/banner/inline message with actionable copy. The message tells the user *what* went wrong and *what to do next* (retry, contact support, fill the missing field). Optimistic UI updates roll back on failure (see `no-silent-failures.md`, rule 6).

A failure that produces only one of these three is a regression even if the code "works" in the happy path.

### Server-side (Go) — wrapping and logging

```go
// BAD — log dump with no actionable info
if err != nil {
    slog.Error("failed", "err", err)
    return err
}

// GOOD — wrapped error chain + structured fields + return wrapped
tag, err := r.db.Exec(ctx, `UPDATE events SET ...`, eventID)
if err != nil {
    slog.Error("event update failed",
        "event_id", eventID,
        "organiser_id", organiserID,
        "error", err)
    return fmt.Errorf("update event %s: %w", eventID, err)
}
if tag.RowsAffected() == 0 {
    return fmt.Errorf("event not found: %s", eventID)
}
```

### Server-side (Go) — HTTP handler response envelope

```go
// Every handler routes errors through a single response helper that
// maps the wrapped error chain to an envelope the client can render.
type errorEnvelope struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Detail  string `json:"detail,omitempty"`
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    body, err := json.Marshal(errorEnvelope{Code: code, Message: msg})
    if err != nil {
        slog.Error("marshal error envelope failed", "code", code, "err", err)
        return
    }
    if _, werr := w.Write(body); werr != nil {
        slog.Warn("error envelope write failed", "code", code, "err", werr)
    }
}

// At the handler:
if errors.Is(err, ErrEventNotFound) {
    writeError(w, http.StatusNotFound, "ERR_EVT_001", "Event not found")
    return
}
if errors.Is(err, ErrInsufficientFunds) {
    writeError(w, http.StatusConflict, "ERR_WAL_002", "Insufficient wallet balance")
    return
}
slog.Error("unexpected handler error", "path", r.URL.Path, "err", err)
writeError(w, http.StatusInternalServerError, "ERR_GEN_003", "Service unavailable, try again shortly")
```

### Client-side (TS/React) — service layer to UI

```ts
// Service layer: parse the envelope, surface a typed error
async function postOffer(listingId: string, amount: number) {
  const res = await api.post(`/marketplace/${listingId}/offers`, { amount });
  if (!res.success) {
    throw new ApiError(res.error?.code ?? "ERR_GEN_003", res.error?.message ?? "Unknown error");
  }
  return res.data;
}

// Component: catch typed error, log via shared logger, surface to user
async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
  e.preventDefault();
  try {
    await postOffer(listingId, amount);
    toast.success("Offer placed");
  } catch (err) {
    const code = err instanceof ApiError ? err.code : "ERR_GEN_003";
    const msg = extractErrorMessage(err, "Couldn't place offer. Try again.");
    log.warn("place offer failed", { listing_id: listingId, code, error: String(err) });
    toast.error(msg);  // shows the message returned by the server
  }
}
```

The client never says "Something went wrong" when the server provided a real message. If no message is available, the fallback string must be actionable ("Couldn't place offer. Try again.") not generic ("Error occurred").

### Mobile-side (Swift / Dart) — same contract

The same three obligations apply. The mobile client surfaces the server message via a snackbar / alert / inline error, logs the failure via the project logger, and rolls back any optimistic UI state. Generic "Network error" banners are forbidden when the server returned a real code.

## Go (mechanically banned)

### Function/method results

```go
// FORBIDDEN
_, err := r.db.Exec(ctx, sql, args...)
n, _ := io.WriteString(w, payload)
_ = file.Close()
defer func() { _ = file.Close() }()

// CORRECT
tag, err := r.db.Exec(ctx, sql, args...)
if err != nil { return fmt.Errorf("exec: %w", err) }
if tag.RowsAffected() == 0 {
    return ErrNotFound // for UPDATE/DELETE-by-PK
}
// or: slog.Debug("exec ok", "table", "...", "rows", tag.RowsAffected())

n, werr := io.WriteString(w, payload)
if werr != nil {
    slog.Warn("write failed", "n", n, "err", werr)
}

defer func() {
    if closeErr := file.Close(); closeErr != nil {
        slog.Warn("file close failed", "path", path, "err", closeErr)
    }
}()
```

### Range loops

```go
// FORBIDDEN — _ in destructured position
for _, v := range slice { ... }
for k, _ := range m { ... }

// CORRECT — slice value-iteration: bind the index, index the slice
for i := range slice {
    v := slice[i]
    // ...
}

// CORRECT — map value-iteration: bind the key, look up the value
for k := range m {
    v := m[k]
    // ...
}

// CORRECT — already single-variable (no discard)
for v := range channel { ... }   // channel — single value
for i := range slice { ... }     // index only
for k := range m { ... }         // map keys only

// EXCEPTION — string rune iteration (only place `_` survives)
// String range over runes yields (byteOffset, rune). If the byte
// offset is irrelevant AND you need runes (not bytes), the only Go
// form that preserves rune semantics is `for _, r := range str`.
// Use this ONLY for rune iteration. For byte iteration use
// `for i := range str { b := str[i] }`.
for _, r := range str { // documented exception: rune iteration
    if r == '/' { ... }
}
```

### Receivers / parameters

```go
// FORBIDDEN
func (_ *Repository) helper() { ... }
func handler(_ http.ResponseWriter, r *http.Request) { ... }

// CORRECT — name everything, even when "unused"
func (r *Repository) helper() { ... }  // receiver named for symmetry
func handler(w http.ResponseWriter, r *http.Request) {
    // w may be unused in this handler; that is fine — the parameter
    // is bound. Interface implementations require named parameters.
}
```

### Type assertions

```go
// FORBIDDEN
v, _ := iface.(*Concrete)

// CORRECT
v, ok := iface.(*Concrete)
if !ok {
    return fmt.Errorf("expected *Concrete, got %T", iface)
}
```

### Test files — NO EXEMPTION

```go
// FORBIDDEN — even in _test.go
for _, tc := range cases {
    t.Run(tc.name, func(t *testing.T) { ... })
}

// CORRECT
for i := range cases {
    tc := cases[i]
    t.Run(tc.name, func(t *testing.T) { ... })
}
```

## TypeScript / JavaScript (mechanically banned)

### Destructuring discards

```ts
// FORBIDDEN — `,` skips a position
const [, second] = pair;
const [first, , third] = triple;
const { unused: _, ...rest } = obj;

// CORRECT
const [first, second] = pair;
const { wanted, ...rest } = obj;
// or use explicit indexing if you only need one slot
const second = pair[1];
```

### Catch with `_`

```ts
// FORBIDDEN — empty catch is a silent failure (also covered by no-silent-failures.md)
try { thing(); } catch { ... }
try { thing(); } catch (_) { ... }

// CORRECT
try {
  thing();
} catch (err) {
  log.warn("thing failed", { error: String(err) });
}
```

### `void` cast for fire-and-forget

```ts
// FORBIDDEN — discards the promise rejection
void store.save();
void someAsync();

// CORRECT
store.save().catch((err) => log.warn("save failed", { error: String(err) }));

// or, in component effects:
useEffect(() => {
  let cancelled = false;
  store.save()
    .catch((err) => {
      if (!cancelled) log.warn("save failed", { error: String(err) });
    });
  return () => { cancelled = true; };
}, []);
```

### Unused parameters

```ts
// FORBIDDEN — silencing via `_` prefix
function handler(_event: SubmitEvent) { ... }

// CORRECT — name the parameter; if truly unused, document why
function handler(event: SubmitEvent) {
  event.preventDefault();
}

// Interface compliance with unused params is acceptable — name them anyway:
function onClick(event: MouseEvent) {
  doThing();
}
```

### Type assertions that mask discards

```ts
// FORBIDDEN — assertion hides that the parse may have failed
return JSON.parse(maybe) as T;
return (input as T).field;

// CORRECT
const parsed = parseJson<T>(maybe);
if (!parsed.ok) {
  log.warn("parse failed", { error: parsed.error });
  return null;
}
return parsed.value;
```

## Cross-language

### Suppression directives — NEVER write these

| Language | Forbidden |
| -------- | --------- |
| TS/JS | `// eslint-disable*`, `// @ts-ignore`, `// @ts-expect-error` |
| Go | `//nolint`, `//nolint:gosec`, `//nolint:errcheck`, etc. |
| Python | `# noqa`, `# type: ignore`, `# pragma: no cover` |
| Ruby | `# rubocop:disable` |
| Java | `@SuppressWarnings` (except where genuinely necessary at framework boundaries) |
| C# | `#pragma warning disable` |

If a linter rule is wrong for the project, change the project's lint config — never suppress per-line. If the code triggers the rule, fix the code.

### Empty catch / silent fail patterns

Covered in `no-silent-failures.md`. Summary:

- No empty `catch` blocks in any language.
- No `.catch(() => {})`, `.catch(() => null)`, `.catch(() => undefined)`, `.catch(() => false)`, `.catch(() => "")`.
- No `try { ... } catch { /* fall back */ }` without logging.
- Every async operation must transition through a visible state (idle → pending → success/error).

### Comments — no tracker pointers

Covered in `no-silent-drops.md`. Comments must NOT contain:

- Sonar rule IDs (`S1192`, `S3776`, etc.)
- Phase markers (`Phase A`, `Phase 1`)
- Plan IDs (`plan B2`, `Initiative I10`)
- Linear / Jira / GitHub issue numbers
- `TODO` / `FIXME` / `XXX` placeholders — implement or open a ticket
- Lint rule codes inline as justification

Comments describe WHY non-obvious code is shaped that way. Tracker references rot.

## SonarLint rule reference (consolidated)

These rules have surfaced in real code. Every one of them MUST be addressed when SonarLint flags them — see `sonarlint-checks.md` for the comprehensive table. The fixes below summarize the canonical patterns.

### Discard-related Sonar codes

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S1172** | Unused function parameter | Name it. Remove only if interface allows. Never `_arg`. |
| **S1481** | Unused local variable | Delete it OR use it. |
| **S1854** | Dead store (assigned then reassigned without read) | Delete the dead assignment. |
| **S6535** | Unused `eslint-disable` directive | Delete the directive. The fact that it's unused means the rule no longer triggers — celebrate, don't paper over. |
| **S125** | Commented-out code | Delete. Git remembers. |
| **S1128** | Unused import | Delete. |

### Silence / hide-information codes

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S2486** | Empty `catch` block | Log via `log.warn`. Empty catch is forbidden. |
| **S108** | Empty function body | Implement or document; an explicit no-op needs a comment. |
| **S2737** | `catch (e) { throw e }` (useless rethrow) | Drop the try/catch OR add real handling. |
| **S1166** | Caught exception used only for `instanceof`, never logged | Always log. |
| **S6571** | `as` cast widens a typed value | Narrow type OR runtime guard. Type assertions are not error handling. |
| **S4325** | Unnecessary `as` assertion | Remove the assertion; TS already narrowed. |
| **S6551** | `String(v)` on an `unknown` that could be an object | Type-narrow before stringifying; handle each `typeof` branch. |
| **S1874** | Deprecated API | Replace with the recommended alternative (e.g., React 19 `FormEvent` → `SubmitEvent`). |
| **S7741** | `typeof x === "undefined"` | `x === undefined`. |
| **S6754** | `useState` setter not named `setX` for value `x` | Either rename setter to convention OR merge the wrapper into an effect. |
| **S6759** | Component props not `Readonly<>` | Wrap `Readonly<...>` around the props type. |
| **S6481** | Context provider `value` changes every render | Wrap value in `useMemo` with the right deps. |
| **S6479** | Array index used as React/Vue list key | Use a stable id from the data; if none exists, derive one. |

### Style / clarity codes

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S1192** | String literal repeated 3+ times | Extract to a `const` at module scope. |
| **S1067** | Boolean expression with > 3 operators | Extract a named predicate. |
| **S1117** | Local variable shadows an outer binding | Rename one. |
| **S3358** | Nested ternary | Extract to helper function or `if/else if`. JSX/template leaves are tolerable. |
| **S3776** | Cognitive complexity > 15 | Extract helpers, inline early-return guards. |
| **S138** | Function body > 200 lines | Decompose. |
| **S107** | Function with > 7 parameters | Group into an options object. |
| **S109** | Magic number literals | Extract to named `const`. |
| **S101** | Class name not PascalCase | Rename. |
| **S100** | Function name not camelCase | Rename. No underscores in test names — use `t.Run("sub test", ...)`. |
| **S6582** | `if (!x \|\| !x.foo)` | Optional chain: `if (!x?.foo)`. |
| **S7735** | Negated condition in ternary `!cond ? a : b` | Flip to `cond ? b : a`. |
| **S6606** | `Object.prototype.hasOwnProperty.call(obj, k)` | `Object.hasOwn(obj, k)`. |
| **S7773** | Bare `parseInt(s)` / `parseFloat(s)` | `Number.parseInt(s, 10)` / `Number.parseFloat(s)`. |
| **S7781** | `.replace(/literal/g, x)` | `.replaceAll("literal", x)` for literals; keep `.replaceAll(/regex/g, x)` for character classes. |
| **S7780** | Backslash-heavy regex source | `String.raw\`...\``. |
| **S6594** | `String.match(/regex/g)` | `[...s.matchAll(/regex/g)]` or `regex.exec(s)`. |
| **S2871** | `[1, 2, 10].sort()` (string compare on numbers) | Pass a comparator. |
| **S4043** | `[...arr].sort()` | `arr.toSorted(...)` or `arr.slice().sort(...)`. |
| **S4323** | Inline union used as alias | Extract `type` declaration. |
| **S7764** | Bare `window.` / `document.` | `globalThis.window.` / `globalThis.document.`. |
| **S2137** | `Map` used as variable/function name | Rename to `MapView`, `mapInstance`, etc. Built-ins are reserved. |
| **S3923** | All branches of `if/else` or `switch` produce same value | Drop the conditional. |
| **S7758** | Spread inside loop: `acc = [...acc, x]` | Push or concat once outside (O(n²) → O(n)). |
| **S6644** | `Array.from(generator)` where `[...gen]` works | Use spread. |
| **S2138** | Useless explicit `return undefined` | Drop. |
| **S4144** | Two functions in same scope with identical bodies | DRY: keep one. |

### Security codes

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S2068** | Hardcoded credential | Env var or secrets manager. Hook-enforced. |
| **S5547** | Weak hash (MD5, SHA-1, DES) | SHA-256+, argon2/bcrypt for passwords. |
| **S5876** | Login endpoint without rate limit | Wire per-IP rate check. |
| **S1313** | Hardcoded IP literal | Use config. SSRF validators are explicit exceptions. |
| **S5693** | Missing request body size limit | Cap body size. |
| **S2755** | XML parsing without XXE protection | Disable external entities. |

### React-specific deprecation codes (React 19)

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S1874 / FormEvent** | `React.FormEvent<HTMLFormElement>` for onSubmit | `SubmitEvent<HTMLFormElement>` (import from `react`). |
| **react-hooks/set-state-in-effect** | `setState` inside `useEffect` | Tracked-deps render-time pattern or `useEffectEvent` to read latest closure. |
| **react-hooks/exhaustive-deps** | `useEffect` missing a dep | Add the dep OR restructure with `useRef` / `useEffectEvent`. Never `// eslint-disable-next-line`. |
| **react-hooks/refs** | Ref mutated during render | Move to effect or use `useEffectEvent`. |

## Sweep procedure (when this rule fires)

After every edit:

1. Run the project's lint command. Fix every reported issue.
2. Grep for `_,` / `_ =` / `// eslint-disable` / `// @ts-ignore` / `//nolint` / `# noqa` in the touched file and any referenced file. Fix every hit.
3. Check IDE diagnostics for any of the SonarLint codes listed above. Address each one.
4. Run the no-discards hook locally if it exists; verify the edit passes.

## Touched-file audit workflow (MANDATORY — read this before editing any file)

This workflow fires on **every** code change, so it lives inline in
[`SKILL.md`](../SKILL.md) rather than here — it must never be a lookup.

## Pre-delivery self-audit checklist (MANDATORY)

This workflow fires on **every** code change, so it lives inline in
[`SKILL.md`](../SKILL.md) rather than here — it must never be a lookup.

## Hook enforcement

The PostToolUse hook at `~/.claude/scripts/hooks/lib/no-discards-rules.js` rejects edits introducing:

- `_, err :=` / `, _ :=` / `_ = …` in Go
- `// eslint-disable*`, `// @ts-ignore`, `// @ts-expect-error` in TS/JS
- `//nolint` in Go
- Sonar IDs, Phase markers, tracker pointers in comments
- TODO/FIXME/XXX placeholders
- Raw `console.log/warn/error/info/debug` in production TS/JS source
- Hardcoded credentials (key prefixes)
- Underscore-prefixed Go test function names (e.g., `TestFoo_Bar`)
- Merge-conflict markers

Operator override (humans only, never the agent):
`export CLAUDE_NO_DISCARDS_HOOK=off`.

## Cross-references

- `no-silent-failures.md` — empty catches, silent fire-and-forget promises, false-positive success reporting.
- `no-silent-drops.md` — TODO/FIXME removal, suppression directives, meta-comments.
- `sonarlint-checks.md` — exhaustive SonarLint rule table with per-rule fix recipes.
- `done-criteria.md` — service-migration done checklist.
- `coding-style.md` — broader code style (comments, file organization, immutability).

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Hook rejection on a new pattern not in the current rule list (candidate for promotion to documented pattern)
- Discard pattern shipping despite the hook (hook coverage gap — refine the regex / AST query)
- Suppression directive (`// eslint-disable`, `//nolint`, `# noqa`) attempted (rule violation — log + reinforce)
- Same SonarLint code (S1192, S3776, S6571, etc.) recurring across PRs in 30 days (lint config or developer-pattern signal)
- New language added to the rebuild without a per-language `no-discards.md` extension (rule needs extension)
- Pre-delivery self-audit checklist row repeatedly missed (rule discipline weak — needs sharpening)
- Hardcoded credential prefix appearing in source despite hook (new prefix pattern to add to the hook)

**Refinement candidates**:

- New banned-pattern entry when a class recurs across 2+ services
- New hook check when a pattern bypass surfaces
- Tightening of complexity / length / parameter caps when chronic violation observed
- New per-language `no-discards.md` extension when a language enters the rebuild

---

<!-- ============================================================
     Section: no-ambient-globals.md (from rules/common/)
     ============================================================ -->
