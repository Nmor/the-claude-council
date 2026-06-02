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

The most common way agents reintroduce a previously-fixed issue is by
focusing narrowly on the requested change and skipping the broader sweep
the file already deserves. This workflow makes the sweep explicit so
the failure mode can't slip past.

### When this applies

Every time you `Read` or `Edit` a file, before you mark the task
involving that file as complete, run **all five** steps below for
that file. There is no exception for "small" edits — the same hooks
that catch new violations don't catch pre-existing ones, so the audit
is the only safety net.

### The five steps

1. **Inventory duplicated literals (S1192).** For Go / TS / Python:

   ```bash
   grep -oE '"[^"]{8,}"' <file> | sort | uniq -c | sort -rn | awk '$1 >= 3'
   ```

   Every line in the output is a violation. If you decide to extract,
   do **declare + replace in the SAME edit** — never declare a
   const and stop, that produces the unused-const warning state the
   hook flags. If a duplicate is genuinely inside a doc comment
   (e.g., swagger `// @Param ...`), note it as a known Sonar
   false-positive in the response but do not extract.

2. **Inventory discards.** Run the relevant grep set for the file's
   language from the "Pre-delivery self-audit checklist" section
   below. Fix every hit. Common offenders in Go:

   ```bash
   grep -nE '\bfor [_, ]+_[, ]* := range\b' <file>
   grep -nE '_, err :=|, _ :=|^\s*_ =' <file>
   grep -nE 'defer [a-zA-Z_.]+\.Close\(\)$' <file>
   ```

3. **Inventory silent failures.** Look for any of the SonarLint
   shape patterns from `no-silent-failures.md`: empty catch blocks,
   fire-and-forget `.catch(() => null)`, `c.Data()` /
   `response.end()` inside a per-row loop (this terminates the
   response stream — every later iteration silently fails). One
   `c.Data` inside a loop has happened twice in this codebase
   already; treat it as a known-bad pattern.

4. **Run the project's lint + static-analysis chain on the file.**
   Go: `go build`, `go vet`, `staticcheck`, `golangci-lint run`
   (all must be zero). TS: `tsc --noEmit`, `eslint --max-warnings 0`.
   If any tool reports anything, fix it before marking done.

5. **Re-check IDE diagnostics for the file** (the PostToolUse hook
   reports them — read every entry). The IDE is the source of truth
   for SonarLint warnings the linters above don't catch (e.g.,
   `go:S1192`, `go:S3776`, `go:S107`). Address each one or, if the
   warning is a genuine false-positive (swagger comment etc.),
   document why in the response and do NOT introduce a per-line
   suppression.

6. **Commented-out code audit (no-silent-drops.md Rule 0).** Grep the
   file for commented-out source:

   ```bash
   grep -nE '^\s*//\s*(if|for|switch|return|err|var|const|func|import|package|[a-zA-Z_]+[ \t]*[:=]|c\.|i\.|a\.|h\.|k\.)' <file>
   ```

   Every match is one of three things:
   - **A genuine TODO marker** — leave it OR open a real ticket and
     remove it. Either way, surface it to the user.
   - **A verbatim duplicate of live code adjacent to it** (typo'd
     older copy that wasn't cleaned up) — name it explicitly in the
     response and ASK before deleting. Never silently delete.
   - **An unwired feature** (the path was started, stubbed, or
     disabled) — mark with `BUG(unwired-<short-name>)` and a
     reader-facing question: "is this still wanted? if yes, here's
     the implementation gap." Restore the block verbatim; do not
     delete to make the linter pass.

   The gocritic `commentedOutCode` warning is NOT permission to
   delete. It's permission to ASK. Deleting a commented block to
   silence the linter is a no-silent-drops violation regardless of
   what the linter says.

### Declare-and-stop is forbidden

If you decide to extract a constant or a helper:

- The same edit MUST replace every usage.
- Or revert the declaration before reporting done.

The half-finished "I declared the const, replacement is next turn"
state is itself a no-discards violation: it leaves the file with
unused-symbol warnings that block any reasonable "is this done?"
check.

### Same-pattern reintroduction is forbidden

If the codebase has ever extracted a constant for `"Content-Type"`,
`"text/csv"`, etc., and you write new code that hardcodes the same
literal, that is the violation the user has named multiple times.
Before adding a new string literal to a file, grep the file for
existing `const`s and use them. If the const doesn't exist yet but
the literal will repeat, add the const in the SAME edit and use it.

### Why this workflow exists

This section was added after a session where the agent fixed an S107
finding by extracting a constant, then immediately wrote new code
nearby that introduced four MORE duplicate-literal violations of the
same shape — visible to the IDE Sonar plugin but invisible to the
PostToolUse hook because the hook only checks the diff, not the file
as a whole. The user's correct critique:

> you fix an issue and when you write some more code you introduce
> the same issue even though these entire avoidance flow should be
> in the project and global rules. Is there a reason why you can't
> follow them or update them when you find a need issue

The rules were there. The agent wasn't running them. This section
exists so the workflow is explicit and the failure cannot recur as
"I forgot to audit."

## Pre-delivery self-audit checklist (MANDATORY)

**Before reporting any code change as complete, run this checklist against every file you touched.** This rule exists because the user has repeatedly observed agents reintroducing lint violations that the codebase already fixed. *Never* deliver code that contains a pattern from this list.

| # | Pattern to scan for | How to find it | What to do |
| - | ------------------- | -------------- | ---------- |
| 1 | `_` as a value position (Go, JS destructure, type assertion) | `grep -nE "\b_\b" file \| grep -E "_\s*[:=,)]"` | Bind to a named identifier and use it |
| 2 | `_, err :=`, `_, ok :=`, `if _, x :=` | `grep -nE "_,\s*\w+\s*:?=" file` | Bind first return |
| 3 | `_ = expr` | `grep -nE "^\s*_\s*=" file` | Bind and use |
| 4 | Empty catch `catch {` or `catch (_)` | `grep -nE "catch\s*(\(\s*\)\|\(\s*_\s*\)\|\{)" file` | Bind err, log via shared logger |
| 5 | `.catch(() => null/undefined/false/{}/"")` | `grep -nE "\.catch\(\(\)\s*=>\s*(null\|undefined\|false\|\{\s*\}\|\"\")" file` | Log + propagate |
| 6 | `void promise()` fire-and-forget | `grep -nE "void\s+\w+\(\)" file` | `.catch((err) => log.warn(...))` |
| 7 | `// eslint-disable*`, `// @ts-ignore`, `// @ts-expect-error`, `//nolint`, `# noqa`, `# type: ignore`, `# pragma: no cover`, `# rubocop:disable`, `@SuppressWarnings` | `grep -nE "(eslint-disable\|@ts-ignore\|@ts-expect-error\|//nolint\|noqa\|type: ignore\|pragma: no cover\|rubocop:disable\|SuppressWarnings)"` | Fix underlying issue; never suppress |
| 8 | Sonar IDs in comments (`S1192`, `S3776`, `S3358`, etc.) | `grep -nE "S[0-9]{3,4}" file \| grep "//"` | Describe invariant; never reference rule IDs |
| 9 | Phase markers (`Phase A`, `Phase 1`, `Initiative I10`, plan IDs) | `grep -niE "phase\s+[a-z0-9]\|plan\s+\w[0-9]"` | Move to PR description; remove from code |
| 10 | TODO / FIXME / XXX placeholders | `grep -nE "TODO\|FIXME\|XXX"` | Implement now or open a real ticket |
| 11 | Commented-out code blocks | Visual review | Delete; git remembers |
| 12 | `console.log/warn/error/info/debug` in product source | `grep -nE "console\.(log\|warn\|error\|info\|debug)"` | Route through `lib/log.ts` |
| 13 | Repeated string literal ≥ 3× (S1192) | `grep -oE "\"[^\"]{8,}\"" file \| sort \| uniq -c \| awk '$1 >= 3'` | Extract to module-level `const` |
| 14 | Cognitive complexity > 15 (S3776) | Visual: function > ~50 lines with nested if/for/switch | Extract helpers, dispatch via lookup, inline early-return guards |
| 15 | Nested ternary `a ? b : c ? d : e` (S3358) | `grep -nE "\?\s*[^:]+:\s*[^?]+\?"` | Extract a tone/state helper |
| 16 | Array index as React key (S6479) | `grep -nE "key=\`[^\`]*\$\{i\}" file` | Use a stable id from data |
| 17 | Component props not `Readonly<>` (S6759) | Visual: `({ ... }: { ... })` without `Readonly` | Wrap props type |
| 18 | Context provider `value` without `useMemo` (S6481) | `grep -nB2 "Context.Provider value="` | Wrap value in `useMemo` |
| 19 | Bare `parseInt`/`parseFloat` (S7773) | `grep -nE "\bparseInt\(\|\bparseFloat\("` | `Number.parseInt(s, 10)` / `Number.parseFloat(s)` |
| 20 | `.replace(/literal/g, ...)` (S7781) | `grep -nE "\.replace\(/[^/{]+/g,"` | `.replaceAll("literal", ...)` for literals |
| 21 | `.match(/regex/g)` (S6594) | `grep -nE "\.match\(/[^/]+/g\)"` | `[...s.matchAll(...)]` or `regex.exec(s)` |
| 22 | `Object.prototype.hasOwnProperty.call` (S6606) | `grep -nE "hasOwnProperty\.call"` | `Object.hasOwn(obj, k)` |
| 23 | `typeof x === "undefined"` (S7741) | `grep -nE "typeof\s+\w+\s*==[=]?\s*[\"']undefined" file` | `x === undefined` |
| 24 | Bare `window.` / `document.` in SSR-safe code (S7764) | `grep -nE "(^\|\W)window\." file`, same for document | `globalThis.window.` / `globalThis.document.` |
| 25 | `[...arr].sort()` (S4043) | `grep -nE "\[\.\.\.[^\]]+\]\.sort"` | `arr.toSorted(...)` or `arr.slice().sort(...)` |
| 26 | `as` cast widening typed value (S6571) | Visual after type predicates / narrowing | Use type predicate, narrow naturally |
| 27 | Unnecessary `as` after narrowing (S4325) | IDE diagnostics | Remove the assertion |
| 28 | Unused parameter (S1172) or unused local (S1481) | `go vet` / `tsc --noEmit` / IDE | Remove or use; never `_`-prefix |
| 29 | Magic numbers (S109) | Visual: large numeric literals inline | Extract to named `const` |
| 30 | `Map` / built-in name shadow (S2137) | `grep -nE "const\s+Map\b\|function\s+Map\b"` | Rename to `MapView`, `mapInstance`, etc. |
| 31 | Useless `return undefined` (S2138) | `grep -nE "return\s+undefined\s*;"` | Drop |
| 32 | Hardcoded credential (S2068) | Hook-enforced. Common prefixes: `sk-proj-`, `sk_live_`, `ghp_`, `xoxb-`, `AKIA`, `Bearer eyJ`, `BEGIN PRIVATE KEY` | Env var / secrets manager |
| 33 | Weak hash (S5547) — `md5`, `sha1`, `des` | `grep -nE "createHash\(\"(md5\|sha1)\"\|createCipheriv\(\"(des\|3des)\""` | SHA-256+, argon2/bcrypt for passwords |
| 34 | Login endpoint without rate limit (S5876) | Visual review of `/auth/*` handlers | Wire per-IP rate check |
| 35 | Hardcoded IP in production (S1313) | `grep -nE "([0-9]{1,3}\.){3}[0-9]{1,3}" file` | Config; SSRF validators allowlist |
| 36 | Missing body-size limit on handler (S5693) | Visual | Cap via middleware |
| 37 | XML parsing without XXE protection (S2755) | `grep -nE "xml\."` | Disable external entities |
| 38 | Empty function body (S108) | `grep -nE "\{\s*\}"` | Implement or document why |
| 39 | `catch (e) { throw e }` useless rethrow (S2737) | Visual | Drop the try/catch or add real handling |
| 40 | Caught exception used only for `instanceof`, never logged (S1166) | Visual | Always log on the way through |
| 41 | `throw` / `reject` / `raise` in a user-facing path WITHOUT a paired user-visible surface (toast / inline validation / banner / state transition / modal) — `no-silent-failures.md` rule 7 | Visual + grep for `throw` / `reject(` / `raise` in views / handlers / form-submit / API client; confirm each is caught + surfaced | Pair every throw in a user-facing path with toast.error / inline error / banner / status transition. NEVER rely on a generic ErrorBoundary as the first UX surface. Server-side throws route through a centralised exception handler that emits a typed `{error_code, message, details}` envelope per `error-handling-with-context.md` rule 4 |

### How to run the audit

For every file you touched in this turn, run **every** grep in the table above. If even one returns a match (other than the documented rune-iteration exception), the change is **not done** — fix the violation and re-run.

For Go: also run `go vet ./...`, `staticcheck ./...`, and `golangci-lint run ./...` and require all three to pass with zero output.

For TS/JS: also run `npx tsc --noEmit` and `npx eslint <file> --max-warnings 0`.

For test files: also run the test (`go test ./<pkg>/... -count=1 -race` or `npx jest --testPathPattern=...`) and require pass.

### The "we have fixed this before" rule

If a SonarLint or build warning has been fixed anywhere in this repo before, your new code MUST NOT reintroduce the same pattern. Before delivering any new function, sweep it for the patterns above — this is not optional. The user explicitly tracks recurrence and treats it as a contract violation.

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
