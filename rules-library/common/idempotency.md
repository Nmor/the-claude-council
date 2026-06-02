# Idempotency Rule (Always-On, Global)

> Auto-fires on every file. Sister to `error-handling-with-context.md`,
> `no-silent-failures.md`, `security.md` (replay protection),
> `task-intake-due-diligence.md` Q8 (FMEA) + Q11 (compliance).
> Standards: **RFC 9110 §9.2.2** (HTTP safe + idempotent methods),
> **RFC 7231**, **Stripe-style idempotency keys**.

## Core Principle

**Every mutation that can be retried — by the client, by an
upstream proxy, by a webhook redelivery, by an at-least-once
queue — MUST produce the same outcome whether executed once or
N times. The system NEVER produces double charges, double
emails, double inserts, double sends, double anything.**

Idempotency is not a feature — it's a property the system
either has or doesn't. Without it, every retry is a Russian
roulette.

## Hard rules

### 1. HTTP methods follow RFC 9110 semantics

| Method | Safe? | Idempotent? | Notes |
| --- | --- | --- | --- |
| GET | yes | yes | Pure read |
| HEAD | yes | yes | Headers only |
| OPTIONS | yes | yes | Preflight |
| PUT | no | yes | Full replace; same outcome on repeat |
| DELETE | no | yes | Same outcome on repeat (gone is gone) |
| POST | no | **no by default** | Use idempotency key (rule 2) |
| PATCH | no | depends | JSON-Patch can be non-idempotent (e.g. `add`); JSON-Merge-Patch typically is |

POST endpoints accept an `Idempotency-Key` header. Implementations
that ignore it MUST document the omission + the user-visible
consequence (e.g., "double-click submits twice").

### 2. Idempotency keys are first-class on every mutation API

Every non-trivial POST / non-idempotent mutation accepts an
`Idempotency-Key` request header (per Stripe's pattern):

```
POST /api/payments/intents HTTP/1.1
Idempotency-Key: <client-generated UUID v4 or v7>
Content-Type: application/json

{ "amount": 5000, "currency": "usd", "customer": "cus_..." }
```

Server-side:

1. Compute the cache key: `tenant_id + endpoint + idempotency_key`.
2. Look up in the idempotency store (Redis / Postgres /
   DynamoDB with TTL).
3. **First-call** (cache miss): execute the operation, write
   `(response, status_code, ts)` to the cache with a TTL of
   24h (Stripe default) — 7d for high-stakes mutations.
4. **Replay** (cache hit): return the cached response with
   the same status code. NEVER re-execute.
5. **Mid-flight collision** (cache hit but operation still
   running): return `409 Conflict` with body
   `{"error_code": "idempotency_in_progress"}`; client retries
   with backoff.

The cache layer is durable (Postgres / DDB / Redis with
persistence), not in-memory only.

### 3. Webhooks process events idempotently (no double-fire)

Every webhook handler:

1. **Verifies signature** (per `security.md` — Stripe signature,
   GitHub HMAC, etc.).
2. **Extracts the event id** (Stripe `evt_...`, GitHub
   `X-GitHub-Delivery`, Slack `event_id`).
3. **Looks up** the event id in the processed-events store.
4. **First-time**: execute the handler, mark event id as
   processed (with TTL — 30d is safe for most providers).
5. **Replay** (event id already processed): return 200 OK
   immediately. Do NOT re-execute. Do NOT 200-OK-and-skip
   silently — log the replay at `debug` level for visibility.

Webhook handlers that don't track event ids will double-process
on every provider retry. Providers retry on 5xx, on timeouts,
on receiver-side network blips — retries are NORMAL.

### 4. Queue consumers handle at-least-once delivery

SQS / SNS / Kafka / RabbitMQ deliver AT LEAST once, never
exactly once. Every consumer:

1. Designs the handler as idempotent (the same message, the
   same outcome).
2. Tracks processed message ids (in a side-table) when the
   handler has irreversible side effects.
3. Uses Conditional writes (DDB `ConditionExpression`,
   Postgres `INSERT ... ON CONFLICT DO NOTHING`) to make
   inserts naturally idempotent.
4. Wraps email / SMS / external-API calls in idempotency
   keys so duplicate deliveries don't double-send.

### 5. Database mutations use conditional writes

| Operation | Idempotent shape |
| --- | --- |
| Insert | `INSERT ... ON CONFLICT (key) DO NOTHING` (Postgres) or `PutItem` with `ConditionExpression: attribute_not_exists(pk)` (DDB) |
| Update with prior state | `UPDATE ... WHERE current_state = ?` — fails-silently if state changed; caller checks affected rows |
| Counter increment | Use a dedupe column (event id) keyed against the increment; or use atomic counters with a window |
| Soft-delete | `UPDATE ... SET deleted_at = NOW() WHERE deleted_at IS NULL` — second call is no-op |
| Transfer (debit + credit) | Wrap in a single transaction with an idempotency-token check at the top |

Affected-rows checks are mandatory. If the conditional write
affects 0 rows, the handler distinguishes "already done" from
"nothing matched" — per `no-silent-failures.md` rule 1
(false-positive success ban).

### 6. External-API calls use the vendor's idempotency primitive

| Vendor | Idempotency mechanism |
| --- | --- |
| Stripe | `Idempotency-Key` header — every API request supports it |
| AWS SQS | `MessageDeduplicationId` (FIFO queues) |
| AWS Kinesis | client-side dedupe via `SequenceNumber` |
| Twilio | `Idempotency-Key` header on SMS / voice |
| SendGrid | `X-SMTPAPI` unique-args; idempotency via vendor batch id |
| OpenAI / Anthropic | request `idempotency-key` (where supported) |
| GitHub | per-resource ETags + `If-Match` for conditional updates |
| Webhooks (any sender) | replay attacks via timestamp + signature; idempotency via event id |

When the vendor doesn't expose idempotency, the integration
adds a client-side layer (track sent message ids; dedupe
against retry).

### 7. State machines have idempotent transitions

State transitions that are idempotent:

```
draft → published   (idempotent: publishing a published doc = no-op)
active → archived   (idempotent: archiving an archive = no-op)
```

State transitions that are NOT idempotent (need explicit
guards):

```
balance + amount    (NOT idempotent — double-credits if retried)
counter++           (NOT idempotent)
publish-event       (NOT idempotent — fires the event twice)
```

For non-idempotent transitions, wrap in:

- Conditional write keyed on the source state, OR
- Idempotency token tracked per request, OR
- Compensating transaction if the second execution succeeds
  before dedupe detects it.

### 8. Test idempotency explicitly

Per `task-intake-due-diligence.md` Q14, every idempotent
operation has a test that verifies:

1. **First call**: side-effect happens.
2. **Second call** (same idempotency key): NO new side-effect;
   same response returned.
3. **Different idempotency key**: side-effect happens again
   (i.e., the dedupe is keyed correctly).
4. **Concurrent calls** with same key: only one side-effect;
   the other returns the cached / in-progress response.

Without these tests, idempotency is aspirational, not
provable.

### 9. Idempotency cache eviction is a feature, not a bug

The cache has a TTL. After expiry, the same idempotency key
will execute fresh:

- Stripe: 24h
- High-stakes mutations (payments, withdrawals): 7d
- Low-stakes (analytics events, audit logs): 1h-24h

Document the TTL in the API reference. Clients that need
longer-than-TTL retries must regenerate the key.

### 10. Idempotency + audit logs play well together

Audit logs of idempotent operations record:

- The idempotency key (so replays are visible)
- Whether the call was first-time or replay
- The outcome (executed / returned-cached / mid-flight conflict)

This lets investigators answer "did the user double-submit?"
without ambiguity.

## Anti-patterns

### Anti-pattern 1: "POST is idempotent because we use INSERT IGNORE"

INSERT IGNORE handles the INSERT side, but if the handler
also sends an email + emits a Kafka event + decrements a
counter, those side effects fire twice. Idempotency is a
property of the WHOLE handler, not just the DB write.

### Anti-pattern 2: "Webhook signature is enough"

Signature verifies authenticity; it does NOT prevent replay.
A captured request can be re-played; without the event-id
dedupe, the handler fires twice.

### Anti-pattern 3: Per-instance in-memory dedupe

A Lambda / pod restart wipes the cache; the next replay
processes again. Idempotency stores are durable — Redis with
persistence, Postgres, DDB, never in-memory only.

### Anti-pattern 4: Idempotency on read endpoints

GET is already idempotent + safe (per RFC 9110). Adding
idempotency keys to GETs adds complexity for no benefit.

### Anti-pattern 5: "Just retry on failure"

Retry without idempotency = double-execute on transient
failures. Every retry-able operation needs idempotency FIRST,
then retry semantics second.

## Cross-references

- `error-handling-with-context.md` — every mutation that
  fails returns a deterministic error code + the idempotency
  key in the response context
- `no-silent-failures.md` rule 1 — "already done" distinct
  from "did it now"; rule 4 — webhook partial-success
- `security.md` A02 / A08 — replay protection + data integrity
- `task-intake-due-diligence.md` Q8 (FMEA) — every mutation
  enumerates retry scenarios
- `dynamodb-patterns` skill — conditional writes + dedupe
- `aws-serverless-patterns` skill — Lambda + SQS + idempotency
  patterns

## Standards cited

- **RFC 9110 §9.2.2** — HTTP safe + idempotent methods
- **RFC 7231 §4.2** — method semantics
- **Stripe API Reference** — Idempotency-Key header convention
- **AWS SQS Developer Guide** — at-least-once delivery
- **CloudEvents 1.0** — `id` field for deduplication

## Why this rule exists

Every retry-able operation that isn't idempotent will, given
enough time, double-execute in production. The cost of design-
time idempotency is one cache lookup + one conditional write.
The cost of a double charge / double email / double order in
production is days of customer-support fallout + regulatory
exposure (PCI / financial-reporting).

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Webhook handler processed the same event twice (rule 3 weakening — event-id dedupe missing or broken)
- Double-charge / double-email / double-insert observed in production (idempotency cache miss or TTL too short)
- Retry storm caused by missing idempotency key (rule 2 not adopted on a non-trivial POST)
- Conditional write affected 0 rows but caller reported success (rule 5 weakening — "already done" vs "did it now" not distinguished)
- In-memory dedupe used instead of durable store (anti-pattern 3 violation)
- Idempotency key TTL too short for the operation's natural retry window
- New external SDK adopted without idempotency primitive verified (rule 6 weakening)

**Refinement candidates**:
- New TTL row in the defaults table when a new mutation class needs a different window
- New entry in the conditional-write pattern table when a new DB / queue technology surfaces
- Tightening of the "test idempotency explicitly" rule when a new state-machine gap is observed
- New cross-reference when a sister rule (error-handling-with-context, no-silent-failures) defines the response shape on replay
