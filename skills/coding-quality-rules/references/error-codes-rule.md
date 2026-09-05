# Error Codes Rule (Always-On, Global)

> Auto-fires on every file. Sister to `error-handling-with-context.md`
> (the wrapping + structured logging), `runbook-template.md`
> (runbook entries indexed by error code), `no-silent-failures.md`
> (every failure surfaces a stable code), `api-versioning.md`
> (codes evolve under a contract).

## Core Principle

**Every error path emits a stable `error_code` string that is
part of the API contract. Codes are SHORT, MACHINE-READABLE,
NEVER CHANGE once published, and map to runbook entries +
client-side UX behavior. Status code (HTTP / RPC) is the
class; `error_code` is the SPECIFIC reason.**

## Canonical envelope

Every error response (HTTP / RPC / WebSocket) carries:

```jsonc
{
  "error_code": "wallet_insufficient_funds",
  "message": "Not enough balance to complete this purchase.",
  "details": {
    "required": 5000,
    "available": 3200,
    "currency": "USD"
  },
  "request_id": "<correlation id>"
}
```

Per `error-handling-with-context.md` rule 4 — `message` is
human-readable (or i18n key), `details` is optional structured
payload, `request_id` lets the user pass the failure to
support.

## Hard rules

### 1. Codes are snake_case + stable

```text
wrong_cell
wallet_insufficient_funds
auth_invalid_token
auth_2fa_required
auth_session_revoked
plan_gate_pro_required
rate_limited
validation_failed
duplicate_resource
not_found
internal_error
```

- **snake_case** (consistent with metric / log field names)
- **Stable** — once published, NEVER change the spelling
- **Short** — ≤ 40 characters
- **Descriptive** — the code names the FAILURE, not the
  endpoint

### 2. Codes form a flat namespace, not a tree

Wrong (nested): `auth.token.invalid` / `wallet.balance.insufficient`
Right (flat): `auth_invalid_token` / `wallet_insufficient_funds`

The reasoning: flat codes are easier to map to runbook
entries, alert rules, and i18n keys. Nesting invites
inconsistency.

### 3. Codes map to HTTP status, not the other way around

| HTTP status | Class | Example codes |
| --- | --- | --- |
| 400 | Client bad input | `validation_failed`, `bad_json`, `malformed_id` |
| 401 | Authentication | `auth_missing_token`, `auth_invalid_token`, `auth_expired_token` |
| 403 | Authorization | `forbidden`, `plan_gate`, `role_required`, `tenant_isolation_violated` |
| 404 | Not found | `not_found`, `<resource>_not_found` |
| 409 | Conflict | `duplicate_resource`, `idempotency_in_progress`, `version_conflict` |
| 410 | Gone | `deprecated`, `resource_archived` |
| 412 | Precondition | `etag_mismatch`, `if_match_failed` |
| 422 | Unprocessable | `business_rule_violated`, `state_machine_violation` |
| 429 | Rate limit | `rate_limited`, `quota_exceeded` |
| 451 | Legal | `geo_blocked`, `compliance_blocked` |
| 5xx | Server error | `internal_error`, `dependency_down_<name>`, `timeout` |

The HTTP status tells the CLIENT how to react at the transport
layer; the `error_code` tells the CLIENT how to react at the
UX layer.

### 4. Every code maps to UX + runbook + i18n

The canonical code registry lives at `docs/error-codes.md`
(per project) with this shape:

| Code | HTTP | UX behaviour | i18n key | Runbook entry |
| --- | --- | --- | --- | --- |
| `wrong_cell` | 421 | Toast "Account not available on this region." No retry. | `errors.wrong_cell` | `runbook.md#wrong-cell` |
| `auth_2fa_required` | 403 | Redirect to `/settings/security?enroll=true` | `errors.auth_2fa_required` | `runbook.md#auth-2fa` |
| `rate_limited` | 429 | Toast "Slow down — try again in a moment." Honour `Retry-After` header. | `errors.rate_limited` | `runbook.md#rate-limited` |
| `wallet_insufficient_funds` | 422 | Inline error on amount field; "Required X, available Y" | `errors.wallet_insufficient_funds` | `runbook.md#wallet-insufficient` |

The registry is the source of truth shared by BE + FE + ops.

### 5. New codes go through review

Adding a code is a contract change. The PR adds:

- The code to `docs/error-codes.md` (registry entry)
- The runbook entry it maps to
- The i18n key (default copy + locale stubs)
- The client-side UX handler (per `useApiError` composable
  pattern or equivalent)
- Tests that assert the code at the boundary (BE returns it
  - FE handles it per spec)

### 6. Codes never carry sensitive data

The `error_code` is logged + emitted to metrics + visible to
the client. It MUST NOT contain:

- User identifiers (use `details.user_id` if needed)
- Resource ids (use `details.resource_id`)
- Internal state details (use the runbook entry to explain)
- Stack traces or file paths

Per `error-handling-with-context.md` rule 8 — server log keeps
the full chain; client response stays sanitised.

### 7. Tests assert on code, not message

Per `error-handling-with-context.md` rule 10 — the test
contract is the code, not the copy:

```ts
// WRONG — brittle
expect(err.message).toBe("Not enough balance to complete this purchase.");

// RIGHT — survives copy edits
expect(err.code).toBe("wallet_insufficient_funds");
expect(err.details?.required).toBe(5000);
```

Copy iterates frequently; the code is the contract.

### 8. Deprecation lifecycle (per `deprecation-lifecycle`

rule, when authored)

When a code is deprecated:

1. **Announce** (release notes + email + in-product notice).
2. **Soft-deprecate** — server starts emitting both old and
   new codes for a window (default 30 days).
3. **Hard-deprecate** — server stops emitting the old code;
   clients still requesting old code get a new
   `code_deprecated` error pointing at the replacement.
4. **Remove** — the code is removed from the registry +
   runbook (with a "Superseded by `<new code>`" link).

Each step has a calendar minimum; clients need time to
update.

### 9. Per-language enforcement

The error envelope is implemented once per platform:

- **TypeScript (server)**: a single `APIError` class with
  `code`, `message`, `details`, `status`. Thrown from
  handlers; mapped to HTTP response by middleware.
- **Go (server)**: a single `APIError` type implementing
  `error`; mapped to HTTP via a single response helper.
- **Frontend (any)**: a single `useApiError` composable / hook
  that maps codes to UX behaviour.

Per `reuse-first.md` — ONE class / type / hook per concept.
No duplicate error envelopes across handlers.

### 10. Codes are the integration point between BE, FE, ops

support

When a customer reports a problem with `request_id` X:

1. Support pastes X into the log search
2. Sees `error_code: rate_limited`
3. Looks up `rate_limited` in `docs/error-codes.md` (or
   runbook)
4. Sees the user-facing copy + the recovery path
5. Tells the customer the right thing IMMEDIATELY

Without stable codes, this chain breaks at every step.

## Cross-references

- `error-handling-with-context.md` rule 3 — codes are part of
  the API contract; rule 10 — tests assert on code
- `no-silent-failures.md` — every failure surfaces a code
- `runbook-template.md` — runbook entries map FROM codes
- `api-versioning.md` — codes evolve under the API contract
- `i18n.md` — code → i18n key mapping
- `task-intake-due-diligence.md` Q7 (integration map) names
  the codes a feature emits

## Why this rule exists

Without stable codes, debugging spans:

- The frontend ("the toast said 'something went wrong'")
- The backend ("the log shows a 500")
- The database ("a constraint violated, somewhere")

Three people, three vocabularies, no shared signal. With
stable codes:

- The toast says `wallet_insufficient_funds`
- The log shows `wallet_insufficient_funds`
- The metric has a `result="wallet_insufficient_funds"` tag
- The runbook explains it
- The i18n file translates it
- The customer says "I saw this code" — support knows the
  path

The cost of adding the code at write time is one extra string

- one registry entry. The cost of debugging without codes is
hours per incident.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New code shipped without an entry in `docs/error-codes.md` registry (rule 4 violation)
- Same `error_code` reused with different semantics across services (taxonomy drift)
- Code spelling changed after publication (rule 1 violation — codes are stable)
- Code with sensitive data in the string (rule 6 violation — codes are sanitised)
- Test asserts on `message` instead of `code` (rule 7 violation; per `error-handling-with-context.md` rule 10)
- HTTP status disagrees with the code's class table (rule 3 mismatch)
- New code introduced without UX behaviour + i18n key + runbook entry simultaneously (rule 4 weakening)

**Refinement candidates**:

- New code class entry when a recurring failure shape needs a stable code
- New row in the HTTP-status-to-code class table when a new RFC status gains common use
- Tightening of the deprecation lifecycle steps when soft / hard windows prove too short in practice
- New cross-reference when a sister rule (runbook-template, i18n) defines artifacts that codes must align to

---

<!-- ============================================================
     Section: error-handling-with-context.md (from rules/common/)
     ============================================================ -->
