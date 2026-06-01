# No-Silent-Failures Rule (Always-On, Global)

> Auto-fires on every file. Sister to `no-discards.md` (the
> hook-enforced canonical), `error-handling-with-context.md`
> (every error wraps with operation + ids), `no-silent-drops.md`
> (don't bury work), `verify-before-claim.md` (no claim of
> success without proof).
>
> **De-duplication note**: the discard / empty-catch / silent
> `.catch` / `console.log` / `as`-cast bans live in `no-discards.md`
> (hook-enforced). This rule focuses on the UNIQUE patterns that
> sister rules don't cover: false-positive success reporting,
> async state-transition completeness, optimistic-rollback, and
> partial-success surfacing in webhook / queue handlers.

## Core Principle

**Every error is a status. Every status the user is waiting on
must visibly resolve. Operations whose user-visible outcome
doesn't match what actually happened are false-positive
successes — bugs in slow motion. The user can't act on what
they can't see; on-call can't debug what wasn't surfaced.**

## Unique rules (not covered by sister rules)

### 1. No false-positive success

The user-visible outcome must reflect what actually happened —
across cascading operations, batch operations, optional
sub-steps, retries, and partial-success boundaries.

```ts
// WRONG — success toast fires even when the optional sub-step
// (clipboard write) failed
await store.share(id);
await navigator.clipboard.writeText(url).catch(() => null);
toast.success("Share link copied");

// RIGHT — separate the outcomes
await store.share(id);
let copied = true;
try { await navigator.clipboard.writeText(url); }
catch { copied = false; }
if (copied) toast.success("Share link copied", { description: url });
else toast.info("Share link ready (clipboard blocked)", { description: url });
```

Applies to:

- **Cascading deletes / batch operations**: if some children
  failed, the response says so ("deleted 7 of 10").
- **Partial sync results**: "synced N of M items" not "Sync
  complete."
- **Idempotent retries**: "already done" distinct from "did it
  now."
- **Optional sub-steps**: if the optional step failed, the
  toast names that explicitly.
- **Multi-tenant fan-out**: per-tenant success vs failure
  reported.

### 2. Every async op has a known status

When the user is actively waiting on an async operation, the
UI MUST visibly transition through:

- **idle → pending** (button disabled, spinner, optimistic
  state)
- **pending → success** (toast / state update / navigation)
- **pending → error** (toast.error + actionable copy + rollback
  of any optimistic state)

The transition fires on EVERY code path:

- Thrown exceptions
- Network timeouts
- AbortController cancellations
- Browser tab-close / navigation away
- Server-sent retry-after responses

The state machine has NO terminal "unknown" — every leaf is
success or error, never "pending forever."

### 3. Optimistic updates roll back on failure

When the client updates state BEFORE the server confirms, the
update reverses if the server returns an error:

```ts
// WRONG — leaves the UI showing read=true when the API call
// failed
notification.read_at = new Date().toISOString();
unreadCount--;
await apiPost("/notifications/mark-read", ...).catch(() => {});

// RIGHT — snapshot, update, rollback on failure
const snapshot = { read_at: notification.read_at, unreadCount };
notification.read_at = new Date().toISOString();
unreadCount--;
try {
  await apiPost("/notifications/mark-read", { id });
} catch (err) {
  notification.read_at = snapshot.read_at;
  unreadCount = snapshot.unreadCount;
  log.warn("mark-read failed; rolled back", { error: String(err) });
  toast.error("Couldn't mark as read — try again");
}
```

Pattern by pattern:

- **List add**: rollback removes the optimistic item; toast
  the failure.
- **List remove**: rollback re-inserts at the original index;
  toast.
- **Counter increment / decrement**: rollback restores the
  prior count.
- **Form-field update**: rollback restores the prior value;
  re-focuses the field.
- **Status transition** (draft → published): rollback restores
  draft.

### 4. Webhook / queue handlers report partial success

A webhook handler that processes 10 events where 3 fail MUST:

1. **Acknowledge** the original webhook (200 to the platform)
   so the platform doesn't retry the whole batch.
2. **DLQ-route** the 3 failures with full context (event id,
   payload, failure reason, retry-count).
3. **Emit a metric** for the partial-failure count
   (`webhook_event_partial_failures{provider="stripe",
   reason="..."}`).
4. **Log** each failure individually with structured fields
   (per `error-handling-with-context.md`).

A 200 OK from a handler that silently dropped 3 of 10 is a
false-positive success — the platform thinks delivery
succeeded; downstream consumers never see the 3 events.

### 5. Confirmation-required mutations cannot fail silently

When a mutation requires explicit user confirmation
(delete account, transfer funds, publish post), the
confirmation flow ensures:

- **Pre-flight check**: server validates the user is in the
  expected state BEFORE asking confirmation.
- **Confirmation token**: server issues a short-lived token
  the client passes back; prevents replay.
- **Post-mutation verification**: server-side check that the
  mutation actually applied; client re-reads to confirm.

A confirmation that "succeeded" but didn't actually mutate
the state is a false-positive success.

### 6. Polling loops report timeout as failure, not "no data"

When a polling loop waits for an external state to converge
(e.g., webhook to arrive, job to finish):

- **Bounded retry** — every polling loop has a max attempt
  count + a timeout.
- **Timeout** is a distinct status from "still pending."
- **Timeout escalates** — the user sees an explicit timeout
  message + the suggested recovery (refresh, retry, contact
  support); not a perpetual spinner.

### 7. Every throw surfaces a user-visible signal (sync + async)

The strongest form of the rule, generalising rule 2 from
async-only to ANY code path the user is waiting on:

**Every `throw`, every `reject(err)`, every `raise`, every
async failure that reaches a code path the user is waiting on
MUST emit a user-visible surface in the same code path that
handles it.** Throwing into a generic error boundary,
`window.onerror`, or framework-level catch-all is the LAST
resort, never the first.

Acceptable user-visible surfaces (pick one that matches the
context):

| Surface | When |
| --- | --- |
| `toast.error` / `toast.warning` / `toast.info` | Transient feedback after an explicit action (submit / save / send) |
| Inline validation error anchored to the offending field | Form input that failed validation; ARIA-wired (`aria-describedby`, `aria-invalid`); focus moves to first invalid field |
| Banner at top of route / section | Cross-cutting failure (network down, auth expired, plan-tier gate, geo-blocked) |
| Empty / error state swap | List / grid / panel where the failure obviates the content |
| Status indicator transitioning to "error" | Long-running operations (upload, transcode, polling); paired with actionable copy + retry affordance |
| Modal / dialog | Destructive or confirmation-bound failure that the user MUST acknowledge before continuing |

Banned shapes (each is a rule violation, even when the error
is logged correctly):

- Silent catch + early return — no UX surface ever fires
- Returning `null` / `undefined` / `false` / empty-result to
  the caller without the caller surfacing the failure
- `console.error` / `log.warn` as the ONLY signal — those are
  developer signals, not user signals
- Generic ErrorBoundary catch-all WITHOUT a per-action UX
  before the boundary fires
- A spinner that never resolves
- A success toast fired before the failure-path branch runs
  (per rule 1 false-positive success ban)
- A "Something went wrong" generic message when the server
  returned a real `error_code` + `message` (per
  `error-codes.md` — codes map to specific UX copy + i18n key)
- A `throw` inside a Promise chain WITHOUT a downstream
  `.catch` that routes to UX
- A `raise` inside a Rails controller / FastAPI handler /
  Spring controller WITHOUT a centralised exception handler
  that maps to a typed response envelope the client renders
- Returning a 4xx / 5xx with body `null` or `""` — the body
  MUST carry the typed envelope per
  `error-handling-with-context.md` rule 4

**Sync paths count too.** A form-submit handler's `throw new
ValidationError(...)` MUST be caught and surfaced inline; a
service-object's `raise InsufficientFunds` MUST flow up to the
controller / view where it becomes a banner or toast. The
throw itself is fine — the unsurfaced throw is not.

**Mobile + Swift + Dart apply the same rule**: snackbar /
alert / inline error + log + rollback. The platform's idioms
differ; the contract is identical.

**Server-side handlers count too.** A handler that throws
without a centralised exception-mapping middleware turns into
a generic 500 with no `error_code`; the client renders
"Something went wrong"; the user is stuck. Per
`error-handling-with-context.md` rule 4, the server's response
envelope is the bridge between thrown error and rendered UX —
both ends MUST be wired.

**Why this rule exists** (in addition to rule 1's
"false-positive success" framing): the most-damaging incident
class is "the user thought it succeeded; the system thinks it
failed." Logs reveal the truth weeks later — usually via
support tickets, sometimes via legal complaints in regulated
contexts (failed payment, failed signup, failed consent
capture, failed deletion). The cost of pairing every throw
with a UX surface is one toast / one `aria-describedby` per
handler. The cost of NOT pairing is silent data loss the user
can't act on.

User directive (verbatim, 2026-06-01): **"Throwing errors
without surfacing a user facing toast or validation error. Is
not acceptable."**

## Cross-references for ancillary discard / silence patterns

These patterns are NOT in this rule (to avoid duplication).
See:

| Pattern | Canonical rule |
| --- | --- |
| `_` discards (`_, err :=`, `let _ = ...`) | `no-discards.md` (hook-enforced) |
| Empty `catch` / `catch (_)` | `no-discards.md` rule 4 + `error-handling-with-context.md` rule 1 |
| Silent fire-and-forget `.catch(() => null)` etc. | `no-discards.md` rule 5 |
| Raw `console.*` in product source | `no-discards.md` rule 12 (hook-enforced) |
| `as` casts hiding parse failures | `no-discards.md` rule 26 (S6571) |
| Empty function body | `no-discards.md` rule 38 (S108) |
| Useless rethrow | `no-discards.md` rule 39 (S2737) |
| Wrapping errors with context (`%w`, `from err`, `cause`) | `error-handling-with-context.md` rules 1-7 |
| Structured logging fields | `error-handling-with-context.md` rule 2 |
| Lint enforcement (eslint, gosec, bandit, etc.) | `extreme-lint-policy.md` |
| Commented-out code / TODO removal | `no-silent-drops.md` |

## Why this rule exists

A handful of recurring bugs in production traced back to the
same shape: an exception was caught, no one logged it, the
user saw a success state, and the broken state only surfaced
hours later when a downstream consumer noticed. Sister rules
(`no-discards.md`, `error-handling-with-context.md`) cover the
mechanical patterns. This rule covers the SEMANTIC shape: the
user's experience matches what actually happened, end-to-end,
across cascades + batches + optional sub-steps + retries +
async state machines.

The cost of one extra logged warning + one accurate toast is
zero; the cost of an undebuggable false-positive success is
hours of incident response.

User directive (verbatim): **"Always verify before claims"** /
**"no half-finishes"** — this rule enforces those at the
user-experience layer.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- False-positive success toast where the optional sub-step actually failed (rule 1 violation pattern)
- Async op left in "pending forever" terminal state (rule 2 violation)
- Optimistic UI update without rollback on failure (rule 3 weakening)
- Webhook handler returning 200 OK while DLQ-routing failures silently (rule 4 weakening)
- Polling loop with no timeout escalation surfacing as "stuck spinner" UX (rule 6)
- Confirmation flow mutation that didn't actually apply but reported success (rule 5)
- Same partial-success pattern recurring across handlers (taxonomy needs new code class)
- `throw` / `reject` / `raise` shipped in a user-facing path without an accompanying toast / inline validation / banner / state transition (rule 7 violation — the strongest form)
- Generic ErrorBoundary catch-all relied on as the FIRST UX surface instead of per-action UX (rule 7 weakening)
- Server returns a typed `error_code` + `message` but the client renders generic "Something went wrong" (rule 7 banned-shape — the `useApiError` composable / hook isn't mapping the code)
- Sync handler `throw new ValidationError(...)` not caught + surfaced inline on a form (rule 7 sync-path violation)
- Server controller `throw` without centralised exception-mapping middleware turning into a generic 500 (rule 7 server-side weakening)

**Refinement candidates**:
- New rule when a new false-positive success shape appears in 2+ incidents
- New cross-reference when a sister rule (no-discards, error-handling-with-context) covers a pattern previously thought unique to this rule
- Tightening of the "every async op has a known status" rule when a new state-machine gap is observed
- New entry in the optimistic-rollback pattern table when a new domain case surfaces
