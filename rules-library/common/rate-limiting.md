# Rate Limiting Rule (Always-On, Global)

> Auto-fires on every file. Sister to `security.md` A07 + A10 +
> A04 (OWASP rate-limit requirements), `idempotency.md` (retry +
> rate-limit interplay), `error-codes.md` (`rate_limited` is a
> first-class code), `observability.md` (rate-limit metrics +
> alerts). Standards: **RFC 6585** (HTTP 429 Too Many Requests),
> **RFC 7231 §6.5.3**, **draft-ietf-httpapi-ratelimit-headers**
> (the modern Retry-After + rate-limit headers).

## Core Principle

**Every public endpoint, every auth endpoint, every endpoint
that triggers a side effect (email, SMS, payment, write to a
shared resource), and every API that costs money or capacity
per call MUST be rate-limited. The default is to limit per
user / per tenant / per IP, with explicit overrides per
endpoint. Unlimited endpoints are a DoS exposure + a cost
exposure.**

## Hard rules

### 1. Limit at multiple layers

| Layer | Purpose | Where |
| --- | --- | --- |
| **Edge / CDN** (Cloudflare, AWS WAF, Fastly) | Block obvious abuse before it hits the origin | WAF rules + bot management |
| **API Gateway** (API GW, Kong, Envoy) | Per-IP + per-token coarse limits | Gateway plugin or native |
| **Application** | Per-user / per-tenant / per-endpoint fine limits | App middleware (Redis-backed token bucket) |
| **Database** | Per-query cost limits (statement timeout, connection cap) | DB config |

Defense in depth — if one layer is misconfigured, the next
catches it.

### 2. Per-endpoint limits (sane defaults)

| Endpoint class | Default limit | Window |
| --- | --- | --- |
| Public read (`GET /api/products`) | 100 req | 1 min per IP |
| Authenticated read | 300 req | 1 min per user |
| Authenticated write | 60 req | 1 min per user |
| Auth endpoints (login, signup, password-reset) | 10 req | 5 min per IP + per email |
| Webhook receiver (provider → us) | 10000 req | 1 min per provider |
| Bulk import / export | 5 req | 1 hour per user |
| AI / LLM calls | 30 req | 1 min per user (per tier) |
| Email / SMS triggers | 5 req | 1 min per user |
| Search | 30 req | 1 min per user |

Per-tenant limits are PRODUCT of per-user × user count, with a
ceiling that protects shared infrastructure.

### 3. Use the right algorithm

| Algorithm | Use when | Trade-off |
| --- | --- | --- |
| **Token bucket** | Most cases — allows bursts | Default |
| **Leaky bucket** | Steady throughput, no bursts | Smooths but adds latency |
| **Fixed window** | Simple counters | Edge-of-window double-burst |
| **Sliding window log** | Fairness at low scale | Memory cost |
| **Sliding window counter** | Fairness at high scale | Approximation of log |

The default is **token bucket** with Redis backing — `INCR` +
TTL pattern, or Lua script for atomic check-and-decrement.

### 4. RFC-compliant response headers

When the request is throttled, the response is `429 Too Many
Requests` with:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60                        # seconds OR HTTP-date
RateLimit-Limit: 60                    # the cap
RateLimit-Remaining: 0                 # tokens left
RateLimit-Reset: 1716729600            # unix timestamp when bucket refills
```

When a request is allowed but approaching the limit (e.g.
< 20% remaining), include `RateLimit-*` headers so the client
can self-pace.

Per `error-codes.md` — the response body carries
`{"error_code": "rate_limited", "message": "Slow down — try
again in <N>s.", "details": {"retry_after_seconds": <N>}}`.

### 5. Differentiate user-facing vs API-facing

- **User-facing endpoints** (web/mobile UI calls) — return
  429 with friendly toast UX
- **API-facing endpoints** (server-to-server, partner APIs) —
  return 429 with `Retry-After` so SDKs back off
- **Internal endpoints** — usually no rate limit, but
  protected by network policy + IAM

### 6. Auth endpoints have separate, stricter limits

Login, signup, password reset, MFA-challenge endpoints MUST
limit per BOTH:

- **Per IP** (block credential stuffing from a single source)
- **Per email/username** (block targeted brute force)
- **Per account** (block password-reset bombing)

Defaults:

- 5 failed attempts in 5 min → lock account for 15 min
- 10 failed attempts in 1 hour → lock account for 24 h + email
  user
- 100 attempts in 1 hour per IP → block IP for 24 h

Per `security.md` A07 + OWASP ASVS V2.2.1 — auth rate-limiting
is mandatory.

### 7. Account for distributed deployments

In a multi-instance deployment, the rate-limit counter MUST be
shared:

- **Redis** with atomic INCR + TTL — the standard
- **DDB** atomic counter — works but more cost
- Local in-memory counter — INCORRECT — each instance counts
  separately, effective limit = N × instances

### 8. Rate-limit the operations, not just the requests

For operations with side-effects (sending email, charging a
card, calling an expensive API), rate-limit on the OPERATION
not just the HTTP request:

```
Endpoint: POST /api/send-email
Rate limit:
  - 60 req/min per user (HTTP rate)
  - 5 emails/min per user (operation rate, after dedupe via idempotency key)
```

Otherwise an attacker batches operations in one HTTP request to
bypass.

### 9. Observability + alerting

Per `observability.md`:

- **Metric**: `ratelimit_throttled_total{endpoint, reason}` counter
- **Metric**: `ratelimit_consumed_ratio{endpoint, user_tier}` gauge
- **Alert**: throttle rate > 5% sustained 5 min on any endpoint
  (signals an attack OR a misconfigured client)
- **Alert**: any auth endpoint with > 100 throttles per minute
  (signals credential stuffing)

Dashboard: throttle rate per endpoint + per tenant, with
drill-down by user.

### 10. Trust + exception policy

Trusted callers (internal services, admin users, paid-tier
customers with elevated limits) get higher caps via:

- **JWT claim** — e.g., `tier: enterprise` raises limits
- **Header** — e.g., `X-Internal-Service: <signed token>`
- **Allowlist** — IPs of known-internal services

Exceptions are ALLOWLISTED, not "removed limits." Every caller
hits some limit; trusted callers hit a higher one.

## Mistakes to avoid

### Mistake 1: Rate-limit only the happy path

The error path can be the attack vector. Login that fails
rate-limited at the success step but unlimited at the
failure step → credential stuffing wins.

### Mistake 2: Rate-limit too late

Limit BEFORE the expensive work (DB query, external API call,
crypto). If the limit fires after `bcrypt.compare`, attackers
exhaust CPU before the limit kicks in.

### Mistake 3: Rate-limit by API key only when the key is
user-supplied

If clients can rotate keys cheaply, per-key limits don't
constrain. Limit on the EFFECTIVE PRINCIPAL — user id, account
id, IP — not just the key.

### Mistake 4: Forgetting to publish the limit

Clients can't self-pace without knowing the limit. Document in
the API reference + emit `RateLimit-*` response headers.

### Mistake 5: Returning 5xx when throttling

Throttling is a 4xx (client error — client should slow down),
NOT a 5xx (server error). Returning 5xx confuses SDKs that
implement different retry policies for 4xx vs 5xx.

## Cross-references

- `security.md` A07 / A10 / A04 — OWASP rate-limit context
- `error-codes.md` — `rate_limited` is a first-class code
- `idempotency.md` — retries respect `Retry-After`
- `observability.md` — throttle metrics + alerts
- `api-versioning.md` — rate-limit changes need a deprecation
  notice (per `deprecation-lifecycle` when written)

## Standards cited

- **RFC 6585** — HTTP 429 status code
- **RFC 7231 §6.5.3** — 4xx semantics
- **draft-ietf-httpapi-ratelimit-headers** — modern Retry-After
  + RateLimit-* header conventions
- **OWASP ASVS V11.1** — Rate Limiting
- **OWASP API Security Top 10 — API4:2023** — Unrestricted
  Resource Consumption

## Why this rule exists

Without rate limits, every endpoint is a free DoS amplifier.
The attack costs the attacker $0; defending costs you scaling
+ incident response + customer trust. Without rate limits on
auth endpoints, credential stuffing succeeds. Without rate
limits on email/SMS triggers, your service becomes a
spam-amplification vector for attackers.

Rate-limiting is mechanical: one Redis bucket + one middleware
+ one response shape. The cost is small; the protection is
large.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Endpoint shipped without rate limiting (rule 1 weakening — every public endpoint needs limits)
- Auth endpoint missing per-IP + per-account limits (rule 6 weakening — credential-stuffing exposure)
- Rate limit applied only on success path (mistake 1 pattern)
- Limit fires AFTER the expensive work, not before (mistake 2 — CPU exhaustion before guard)
- Per-instance in-memory counter used (mistake 3 — distributed counter required)
- 5xx returned instead of 429 (mistake 5 — confuses SDK retry semantics)
- New endpoint defaults don't appear in the per-endpoint limits table (table needs extension)
- Rate-limit headers not emitted per draft-ietf-httpapi-ratelimit-headers (rule 4 weakening)

**Refinement candidates**:
- New row in the per-endpoint defaults table when a new endpoint class needs its own limit
- Tightening of the auth-endpoint defaults when credential-stuffing patterns evolve
- New algorithm row when a new throttling pattern (e.g., hierarchical leaky-bucket) gains adoption
- New cross-reference when a sister rule (security A07/A10, idempotency) constrains the limit shape
