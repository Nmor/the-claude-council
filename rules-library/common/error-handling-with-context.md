# Error Handling With Context (Always-On, Global)

> Auto-fires on every file. Sister to `no-discards.md`,
> `no-silent-failures.md`, `no-silent-drops.md`,
> `observability-patterns` skill. Companion to language-specific
> error handling guidance in each language's rule subdirectory.

## Core Principle

**Every error path carries enough context for the on-call engineer
to reproduce the failure without re-reading the source. Errors
are WRAPPED with operation context, ENRICHED with structured
fields (request_id, user_id, organization_id, resource ids, the
inputs that produced the failure), and PROPAGATED through the
call stack without losing the originating cause. The client gets
a stable error code + actionable message; the server log gets
the full structured chain.**

Context-free errors (`return err`, `throw e`, `log.error("failed")`)
are bugs in slow motion — they pass review, ship to production,
and then waste the on-call engineer's first hour just figuring out
WHERE the error happened, WHAT was being attempted, and WHY.

## Hard rules

### 1. Wrap at every layer with operation context

Every layer that catches or returns an error MUST wrap it with a
short operation name + the relevant ids it had in scope. Per-
language idiom:

- **Go**: `fmt.Errorf("doThing<userID=%s>: %w", userID, err)` —
  the `%w` preserves `errors.Is` / `errors.As` chain walking.
- **Python**: `raise OperationError("doThing failed", user_id=…)
  from err` — the `from err` preserves the cause chain.
- **TypeScript / JavaScript**: `throw new OperationError("doThing
  failed", { cause: err, userId, … })` — the `cause` field is
  standardised (Error options bag, ES2022+).
- **Java / Kotlin**: `throw new OperationException("doThing
  failed: " + ctx, e)` — pass the cause as the second argument.
- **Ruby**: `raise OperationError.new("doThing failed: #{ctx}"),
  cause: e` — preserves backtrace.
- **Rust**: use `anyhow::Context` or `thiserror` — `result.context(||
  format!("doThing user={}", user_id))?`.
- **Swift**: throw a typed error case with associated values:
  `throw .doThingFailed(userId: userId, underlying: error)`.

Every wrap names:
- The operation (verb + noun: `doThing`, `commitTx`, `parseRequest`)
- The ids in scope (the smallest set that lets oncall reproduce)
- The cause (preserved, never stringified-and-lost)

### 2. Structured logging fields are mandatory

Every error log entry includes:

| Field | Purpose |
| --- | --- |
| `level` | `error` / `warn` (per severity) |
| `message` | Short operation-named description |
| `error_code` | Stable code (e.g. `wallet_insufficient_funds`, `auth_invalid_token`) |
| `error` | The wrapped chain (`String(err)` / `err.stack`) |
| `request_id` | Correlation across services |
| `trace_id` / `span_id` | When OTel is wired |
| `user_id` | When in user context |
| `organization_id` / `tenant_id` | When in multi-tenant context |
| `resource_id` | The id of the entity being operated on |
| `duration_ms` | When the failure is timing-sensitive |
| `attempt` | When inside a retry loop |

Banned: `log.error("failed")`, `log.error(err)`, `console.log(e)`.
Required: the field set above, populated from the AsyncLocalStorage
/ context.Context / trace span the request created.

### 3. The error code is a stable contract

`error_code` is part of the API contract. Clients map codes to UX:

- `wrong_cell` → toast + no retry
- `2fa_required` → redirect to enrollment
- `plan_gate` → upgrade dialog
- `rate_limited` → backoff toast
- `validation_failed` → inline field error with `details`

Once published, codes don't change. New cases get new codes. The
list of codes lives in the project's `docs/error-codes.md` (or
equivalent) so frontend + backend agree on every code.

### 4. The user-visible message is actionable

The HTTP response body (or RPC response, or websocket frame)
carries the shape:

```jsonc
{
  "error_code": "wallet_insufficient_funds",
  "message": "Not enough balance to complete this purchase.",
  "details": { "required": 5000, "available": 3200, "currency": "USD" }
}
```

`message` is plain English (or i18n key) the client can render
verbatim. `details` is optional structured payload the client uses
to enrich the UI ("required X, you have Y"). The frontend NEVER
renders a generic "Something went wrong" when the server provided
a real message.

### 5. Server side: the THREE deliverables on every failure

Per `no-silent-failures.md`, every server-side failure produces ALL
THREE of:

1. **Structured log entry** (per rule 2)
2. **EMF / Prometheus / OTel metric** with the same `error_code`
   tag (for alerting and dashboards)
3. **Typed HTTP / RPC response** with the error envelope above

Missing any one of the three = the failure is hidden from a
class of observers (logs, metrics, or users).

### 6. Client side: the THREE deliverables on every failure

Per `no-silent-failures.md` rule 7, every client-side caller in a
user-facing path produces ALL THREE of:

1. **Browser / RUM log entry** with the `error_code` + relevant
   request context (route, action, user-visible ids)
2. **User-visible surface** (mandatory — pick one that matches
   the context):
   - `toast.error` / `toast.warning` — transient feedback after
     an explicit action
   - **Inline validation error** anchored to the offending field,
     ARIA-wired (`aria-describedby`, `aria-invalid`), focus moves
     to the first invalid field
   - **Banner** at the top of the route / section — cross-cutting
     failure (auth expired, network down, plan-tier gate)
   - **Empty / error state swap** in the affected list / grid /
     panel
   - **Status indicator** transitioning visibly out of `pending`
     into `error` with actionable copy + retry affordance
   - **Modal / dialog** for destructive or confirmation-bound
     failures
3. **Typed return** (boolean / discriminated result) so the view
   can branch (success path vs failure path) instead of guessing

**Banned shapes** (each is a rule violation, even when the log
entry exists):

- Catching the error + returning early without surface
- Rendering "Something went wrong" when the server provided a
  real `error_code` + `message` (per `error-codes.md` — codes
  map to specific i18n copy via the central `useApiError`
  composable / hook)
- A spinner that never resolves
- ErrorBoundary catch-all as the FIRST surface — it's the last
  resort, not the per-action UX
- A `throw` inside a Promise chain with no downstream `.catch`
  routing to the UX

The same rule applies to **mobile + Swift + Dart** clients:
snackbar / alert / inline error + log + rollback.

### 7. Never lose the cause chain

Wrapping an error must PRESERVE the original — never
`fmt.Errorf("failed: %v", err)` (no `%w`), never
`raise NewError("failed: " + str(e))` (no `from`), never
`throw new Error("failed")` (no `cause`). The downstream handler
needs `errors.Is` / `errors.As` / `instanceof` / `try/except` to
work at every depth.

### 8. Inner errors are sanitized at the boundary

The server log keeps the full wrapped chain including stack
traces and any sensitive data (file paths, internal usernames,
DB error messages). The client response strips all of that — the
client sees only `error_code` + `message` + sanitized `details`.
Never leak internal stack traces, DB error messages, or file
paths through the HTTP response.

### 9. Per-language enforcement

| Language | Tooling | What it catches |
| --- | --- | --- |
| Go | `errcheck`, `errorlint`, `wrapcheck` | Bare `return err` without wrap; `==` against sentinel errors |
| TypeScript / JavaScript | `eslint-plugin-promise`, `no-throw-literal` | Throwing non-Error values; missing `cause:` on rethrow |
| Python | `ruff` rules `TRY003`, `TRY400`, `BLE001` | Blind except, missing `from err`, `logging.error` without `exc_info` |
| Java / Kotlin | `errorprone`, `pmd` | Swallowed exceptions, missing cause in wrapping constructor |
| Ruby | `rubocop-rails` `Lint/RescueException` | Bare rescue, missing `cause:` |
| Rust | `clippy::map_err_ignore` | Swallowed `Result::Err` via `_` ignore |

The lint command runs in CI (per `extreme-lint-policy.md`); a
context-free error path fails the build.

### 10. Tests assert on the error code, not the message

```ts
// WRONG — brittle, breaks on copy edits
expect(err.message).toBe("Not enough balance to complete this purchase.");

// RIGHT — stable across copy edits
expect(err.code).toBe("wallet_insufficient_funds");
expect(err.details?.required).toBe(5000);
```

Tests against `error_code` survive UX copy changes; tests against
`message` break every time a writer edits the wording.

## Canonical Go handler shape

```go
func (h *Handler) DoThing(ctx context.Context, in DoThingInput) (DoThingOutput, error) {
    log := slog.With(
        "request_id", ctx.Value(requestIDKey),
        "user_id", in.UserID,
        "organization_id", in.OrgID,
        "operation", "DoThing",
    )

    if err := validate(in); err != nil {
        log.Warn("validation failed", "error", err, "error_code", "validation_failed")
        return DoThingOutput{}, errors.Wrap(err, "DoThing<userID=%s>: validate", in.UserID)
    }

    out, err := h.repo.Insert(ctx, in)
    if err != nil {
        if errors.Is(err, repo.ErrDuplicate) {
            log.Warn("duplicate", "error", err, "error_code", "duplicate_resource")
            return DoThingOutput{}, &APIError{Code: "duplicate_resource", Message: "Resource already exists", Status: 409}
        }
        log.Error("insert failed", "error", err, "error_code", "internal")
        return DoThingOutput{}, fmt.Errorf("DoThing<userID=%s>: insert: %w", in.UserID, err)
    }
    return out, nil
}
```

## Canonical TypeScript handler shape

```ts
export async function doThing(input: DoThingInput): Promise<DoThingOutput> {
  const log = logger.child({
    request_id: requestContext.id,
    user_id: input.userId,
    organization_id: input.orgId,
    operation: "doThing",
  });

  const validation = validate(input);
  if (!validation.ok) {
    log.warn("validation failed", { error: validation.error, error_code: "validation_failed" });
    throw new APIError("validation_failed", "Some fields are invalid.", 400, validation.details);
  }

  try {
    return await repo.insert(input);
  } catch (err) {
    if (err instanceof DuplicateError) {
      log.warn("duplicate", { error: err.message, error_code: "duplicate_resource" });
      throw new APIError("duplicate_resource", "Resource already exists.", 409, { cause: err });
    }
    log.error("insert failed", { error: String(err), stack: err instanceof Error ? err.stack : undefined, error_code: "internal" });
    throw new APIError("internal", "Something went wrong. Try again in a moment.", 500, { cause: err });
  }
}
```

## Cross-references

- `no-discards.md` — discards that drop errors are a context loss
- `no-silent-failures.md` — silent failures are this rule's
  inverse: no logging + no surfacing + no return signal
- `no-silent-drops.md` — half-finished error paths are silent
  drops of the failure case
- `observability-patterns` skill — structured logging + EMF +
  request-id propagation are the substrate this rule sits on
- `proper-fixes-first.md` — never silence an error path to make
  the symptom disappear
- `extreme-lint-policy.md` — error-handling lints are mandatory

## Why this rule exists

Error paths without context produce undebuggable production
failures. The on-call engineer's first hour goes to "where did
this happen, what was being attempted, what were the inputs" —
none of which the bare `error: failed` message answers. The cost
of adding context at write-time is one log line per layer; the
cost of adding it at debug-time is hours per incident.

User directive (verbatim): **"include error handling for with
context."**

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Bare `return err` / `raise X` / `throw e` without context wrap shipping (wrapping discipline weakening)
- Error chain lost on the way through a layer (`%v` instead of `%w`, no `from err`, no `cause:`)
- Test asserting on `message` instead of `error_code` (rule 10 enforcement weak)
- Error code drift — new codes added without updating `docs/error-codes.md` (registry-of-truth discipline weak)
- Sensitive data leaking through the client response envelope (sanitization at boundary missing)
- Same `error_code` reused with different semantics across services (taxonomy needs review)
- Log entry without `request_id` / `trace_id` / `error_code` (structured-fields discipline weak)

**Refinement candidates**:
- New error-code class entry when a recurring failure shape needs a stable code
- New required-field entry when a context dimension proves load-bearing in production debugging
- Tightening of the EXP test rubric on `error_code` assertions when chronic copy-fragile tests observed
- New per-language wrapping example when a language enters the rebuild
