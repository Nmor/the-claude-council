# Idempotency for Money Movement

> Covers Core Pattern 1 — idempotency keys on every mutation: cache-key composition, in-progress
> collision (409), payload-hash binding, TTL per operation class, multi-region key-store
> consistency, key generation, webhook idempotency, and idempotency observability. Pointed at by
> the "Idempotency" row of the reference map in `SKILL.md`.
>
> **Size budget: 10 KB** — `token-budget.mjs --check`.

## Core Patterns

### Pattern 1: Idempotency keys on every mutation

```typescript
// CORRECT — client generates UUID v4/v7; sends on every retry-eligible call
const idempotencyKey = crypto.randomUUID();
const intent = await stripe.paymentIntents.create({
  amount: 5000, currency: 'usd', customer: 'cus_...',
  payment_method: 'pm_...', confirm: true,
}, { idempotencyKey });
```

Per `~/.claude/rules-library/common/idempotency.md` + Stripe's
Idempotency-Key convention — every POST that moves money,
issues a refund, transfers funds, creates a payout, or
modifies a subscription carries an idempotency key. The
following sub-patterns make idempotency PRINCIPAL-LEVEL
correct, not just present.

**1a. Cache-key composition.** The server-side dedupe cache
key is NEVER the idempotency_key alone. It is the tuple:

```text
cache_key = sha256(tenant_id + ":" + endpoint + ":" + api_version + ":" + idempotency_key)
```

Reasons:

- **Multi-tenant isolation**: tenant A's key cannot collide
  with tenant B's (intentional or otherwise)
- **Endpoint scoping**: same key sent to `POST /charges` vs
  `POST /refunds` must NOT alias to the same result
- **API-version pinning**: a key replayed against a new API
  version with a different response shape is a different
  request; cache it separately to prevent shape drift
- **SHA-256 hash**: cache backends with key-length limits
  (Redis 512MB ceiling, DDB 2KB SK limit) stay safe

**1b. In-progress collision (HTTP 409).** When a second
request with the SAME key arrives while the FIRST is still
processing (network retry mid-flight; concurrent click), the
server MUST NOT execute twice. The pattern:

```typescript
// Atomic INSERT ... ON CONFLICT DO NOTHING with status='in_progress'
const inserted = await db.query(`
  INSERT INTO idempotency_log (cache_key, status, request_hash, started_at)
  VALUES ($1, 'in_progress', $2, NOW())
  ON CONFLICT (cache_key) DO NOTHING
  RETURNING id
`, [cacheKey, requestHash]);

if (inserted.rowCount === 0) {
  // Lookup existing entry
  const existing = await db.query(
    'SELECT status, response_body, request_hash FROM idempotency_log WHERE cache_key=$1',
    [cacheKey]);
  if (existing.rows[0].status === 'in_progress') {
    return res.status(409).json({
      error_code: 'idempotency_in_progress',
      message: 'A request with this key is currently processing.',
      retry_after_ms: 500,
    });
  }
  if (existing.rows[0].request_hash !== requestHash) {
    // Same key, different payload — reject hard
    return res.status(422).json({
      error_code: 'idempotency_key_payload_mismatch',
      message: 'This idempotency key was previously used with a different request body.',
    });
  }
  // Replay — return cached response
  return res.json(JSON.parse(existing.rows[0].response_body));
}

// First-time execution path
try {
  const result = await processPayment(req.body);
  await db.query(
    'UPDATE idempotency_log SET status=$1, response_body=$2, finished_at=NOW() WHERE cache_key=$3',
    ['succeeded', JSON.stringify(result), cacheKey]);
  return res.json(result);
} catch (err) {
  await db.query(
    'UPDATE idempotency_log SET status=$1, response_body=$2 WHERE cache_key=$3',
    ['failed', JSON.stringify({ error_code: err.code }), cacheKey]);
  throw err;
}
```

**1c. Payload-hash binding.** Stripe's convention: when a
client reuses an Idempotency-Key with a DIFFERENT payload,
the server returns an error rather than silently returning
the cached result for the old payload. Hash the canonical
JSON of the request body (sorted keys, normalised numbers)
and store alongside the cache entry. On replay, compare
hashes; on mismatch, return HTTP 422 `idempotency_key_payload_mismatch`.

**1d. Replay-attack window (TTL).** The cache lives for a
bounded period AFTER which the same key executes fresh:

| Operation class | TTL | Rationale |
| --- | --- | --- |
| Default (Stripe) | 24 hours | Covers 99.9% of legitimate retry windows |
| Payments / withdrawals / payouts | 7 days | Covers weekend + holiday delivery delays |
| Refunds / chargebacks | 30 days | Bank-side processing windows |
| Marketplace fund transfers | 14 days | Cross-jurisdiction settlement delays |
| One-off Bulk operations | 90 days | Compliance + reconciliation window |

After expiry, the same key with the same payload WILL execute
again. Clients that need beyond-TTL retries MUST generate a
new key. Document the TTL in API docs.

**1e. Multi-region key-store consistency.** The cache MUST
provide cross-region consistency at the latency tier that
matches the call frequency:

| Backend | Consistency model | When to use |
| --- | --- | --- |
| **DynamoDB Global Tables** | Last-writer-wins, eventually consistent (~1s cross-region) | Default; sufficient for 24h TTL |
| **Aurora Global Database** | Single-region writer + 1-second cross-region replication | When join with payment state required |
| **Redis Active-Active (CRDT)** | Cluster-side CRDT merge | When sub-100ms in-region SLA needed AND tenant-pinned routing acceptable |
| **Spanner / CockroachDB** | Strong consistency, multi-region | Highest stakes; financial regulators require atomic single-truth |

Pin the cache backend ONLINE during a deploy / failover; if
two regions process the same key before replication catches
up, the second region returns the cached result from the
slow stream — which may be a "succeeded" duplicate, not the
first-region's failure. Mitigation: short-circuit via a single
write-region for idempotency log, OR use a sticky-region cookie
on every retry from the same client.

**1f. Idempotency-key generation requirements.** The CLIENT
generates the key (NEVER the server, which would defeat the
purpose for retried requests). Requirements:

- **Format**: UUID v4 (random) or UUID v7 (time-ordered;
  better index locality)
- **Length**: 128 bits minimum; Stripe accepts up to 255 chars
- **Lifetime**: ONE key per LOGICAL operation. NOT per HTTP
  retry — the retry MUST reuse the same key. Documenting this
  in client SDK is non-negotiable.
- **Storage**: client persists the key with the operation
  intent BEFORE making the call; on retry (after crash,
  network failure), the SAME key is replayed

**1g. Webhook idempotency.** Per `idempotency.md` rule 3 —
the webhook handler is itself a retry-prone surface. The
provider redelivers on 5xx, on timeouts, and on receiver-
side errors. Every handler:

1. Verifies signature (per Anti-pattern 4)
2. Extracts the EVENT ID (Stripe `evt_...`, Adyen `eventCode`+`pspReference`)
3. Looks up event id in `webhook_processed_events` table
4. If first-time: execute handler in same DB transaction as
   insert into `webhook_processed_events`
5. If replay: return 200 immediately (provider stops retrying)
6. TTL: 30 days for Stripe, 90 days for Adyen

**1h. Idempotency observability.** Track + alert on:

- `idempotency_replay_rate{endpoint}` — high replay rate signals
  client retry storm
- `idempotency_collision_rate{endpoint}` — HTTP 409 rate;
  high means concurrent click-spam or retry-without-key-rotation
- `idempotency_payload_mismatch_rate` — should be near zero;
  spike means either client bug or replay attack
- `idempotency_cache_miss_after_failure_rate` — re-execution
  after the cache entry's TTL expired but the operation already
  ran; surfaces TTL mis-sizing
