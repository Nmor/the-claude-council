# Circuit Breaker Rule (Always-On, Global)

> Auto-fires on every file. Sister to `error-handling-with-context.md`,
> `rate-limiting.md`, `idempotency.md`, `graceful-degradation.md`
> (when authored), `observability.md` (breaker-state metrics),
> `task-intake-due-diligence.md` Q8 (FMEA) + Q17 (rollback).
> Pattern reference: **Michael Nygard, "Release It!"** (the
> canonical book introducing the pattern); **Hystrix** (Netflix,
> archived but referenced); **Polly** (.NET), **resilience4j**
> (Java), **opossum** (Node), **gobreaker** (Go), **pybreaker**
> (Python).

## Core Principle

**Every call to an external dependency (third-party API,
upstream service, database, queue) is wrapped in a circuit
breaker that FAILS FAST when the dependency is unhealthy and
PROBES periodically to detect recovery. Naive retries against
a downed dependency amplify the failure across the system —
the breaker is the mechanism that contains it.**

## State machine

```text
   ┌────────────┐  threshold of failures exceeded   ┌────────────┐
   │   CLOSED   │ ────────────────────────────────► │    OPEN    │
   │  (healthy) │                                   │  (failing) │
   └────────────┘ ◄────── reset on success ──────── └────────────┘
         ▲                                                │
         │                                                │ timeout
         │ probe succeeds                                 │ expires
         │                                                ▼
         │                                          ┌────────────┐
         └─────────── probe fails ───────────────── │ HALF-OPEN  │
                       (back to OPEN)               │  (probing) │
                                                    └────────────┘
```

- **CLOSED** — calls pass through; failures counted
- **OPEN** — calls FAIL FAST without hitting the dependency;
  no traffic reaches the dep; returns the fallback path OR
  the error envelope (`dependency_down_<name>`)
- **HALF-OPEN** — limited probe traffic to detect recovery;
  on success, transition back to CLOSED; on failure, back to
  OPEN

## Hard rules

### 1. Wrap every external call

Every call leaving the service boundary gets a breaker:

- **Upstream services**: REST / gRPC clients
- **Third-party APIs**: Stripe, Twilio, OpenAI, SendGrid, etc.
- **Databases** at the boundary (especially when remote /
  cross-region)
- **Caches** (Redis / Memcached) — yes, even local ones
- **Queues** (publish-side; consume-side is naturally
  back-pressured)
- **Storage** (S3, GCS, Azure Blob) on the read path

In-process calls (your own service's modules) do NOT need
breakers — they're not network-dependent.

### 2. Tune thresholds for the dependency's SLA

Defaults to start with — adjust per dependency:

| Parameter | Default |
| --- | --- |
| Failure threshold (count or ratio) | 5 failures OR 50% failure rate in a 30s window |
| Open duration (timeout) | 30 s |
| Half-open probe count | 1 (single probe before transition) |
| Reset on success | 1 (CLOSED on first probe success) |

Tighter thresholds for critical dependencies (auth, payment);
looser for nice-to-have ones (analytics, search).

### 3. Use a per-DEPENDENCY breaker, not per-CALL-SITE

One breaker per remote service, NOT one per call site:

- WRONG: `getUserById` + `getOrgById` + `getProjectById` each
  have their own breaker against the same DB
- RIGHT: ONE breaker against `db-primary`; another against
  `db-replica`; another against `cache`; another against
  `stripe-api`

Per-call-site breakers fragment the failure signal — when
50% of `getUserById` calls fail because the DB is down,
`getOrgById`'s breaker doesn't know yet.

### 4. Combine with timeouts (always)

A breaker without timeouts is useless — if the dependency
hangs, calls never return, the breaker never trips:

```typescript
// Wrong — breaker without timeout
const result = await breaker.fire(() => fetch(url));

// Right — breaker around a timeout-bounded call
const result = await breaker.fire(() =>
  fetchWithTimeout(url, { timeout: 5000 })
);
```

Every call has a TIMEOUT (per `task-intake-due-diligence.md`
Q8 FMEA) BEFORE it gets the breaker.

### 5. Combine with retries (carefully)

Breakers and retries interact:

- **Retry within the breaker call**: Total attempts ×
  per-attempt timeout must fit inside the breaker's tolerance
  window; otherwise retries hide the failure from the breaker.
- **Don't retry on circuit-OPEN**: the breaker is the signal
  to STOP trying; respect it.
- **Use exponential backoff + jitter**: per AWS Architecture
  Blog "Exponential Backoff And Jitter" — uniform retries
  produce thundering herds.

### 6. Per-tenant / per-key isolation when load is uneven

Bulkhead pattern — separate breakers per tenant when one
tenant's heavy traffic can break the breaker for everyone:

```text
breaker_per_tenant[tenant_id].fire(() => stripeCharge(req))
```

The cost is more state; the benefit is that one tenant's
abuse doesn't open the breaker for every other tenant.

### 7. Fallback paths name the degradation explicitly

When the breaker is OPEN, return one of:

- **Cached data** — stale-but-okay (per `graceful-degradation.md`)
- **Empty / default** — explicit "no data right now" UX
- **Error envelope** — `{"error_code": "dependency_down_<name>"}`
  with HTTP 503 (Service Unavailable)
- **Queue-and-retry** — for write operations, enqueue to retry
  later when dep is healthy
- **Degraded feature flag** — disable the dependent feature
  entirely

Never silently return success when the breaker is OPEN — that's
a false-positive success (per `no-silent-failures.md`).

### 8. Observability is non-negotiable

Per `observability.md`:

- **Metric**: `circuit_breaker_state{name="<dep>"}` gauge
  (0=closed, 1=open, 2=half-open)
- **Metric**: `circuit_breaker_state_transitions_total{
  name="<dep>", from, to}` counter
- **Metric**: `circuit_breaker_rejected_total{name="<dep>"}`
  counter (calls rejected while OPEN)
- **Alert**: any breaker state = OPEN sustained 5 min → page
  on-call
- **Alert**: rapid OPEN ↔ CLOSED flapping (4+ transitions in
  10 min) → ticket-on-call (signals an unhealthy dep + too-
  aggressive thresholds)

### 9. Test breaker behaviour

Per `testing.md` Q14:

- **Unit test**: breaker opens on N failures, closes on
  recovery
- **Integration test**: simulate dep failure (mock + 5xx
  responses); assert client sees fallback / error code, not
  the raw timeout
- **Chaos test**: in staging, deliberately fail the dep
  (close the firewall to it, route to a black hole) and
  verify the service degrades gracefully

### 10. Document the breaker per dependency

In `docs/runbook.md` (per `runbook-template.md`), each
dependency has:

- Breaker name + library version
- Thresholds (failure count, ratio, timeout)
- Fallback behaviour when OPEN
- How to manually trip / reset (for incident response)
- Alert routing

## Per-language libraries

| Language | Library | Notes |
| --- | --- | --- |
| Go | `github.com/sony/gobreaker` | Most popular; sliding window |
| Node.js | `opossum` | Promise-based; battle-tested |
| Java / Kotlin | `resilience4j` | Successor to Hystrix; modular |
| .NET | `Polly` | Built-in to `.NET 8` (Microsoft.Extensions.Http.Resilience) |
| Python | `pybreaker` OR `circuitbreaker` | Both maintained |
| Ruby | `circuitbox` | Common choice |
| Rust | `failsafe-rs` | Less mature; consider tower-rs middleware |

Per `reuse-first.md` — use the canonical library, don't
hand-roll. Hand-rolled breakers miss edge cases (thread
safety, clock skew, jitter).

## Anti-patterns

### Anti-pattern 1: Breaker around your own database

Internal DB calls usually don't need breakers — they need
connection pools + timeouts. A breaker between your service
and its primary DB during a deployment can mask normal
behaviour as failure.

### Anti-pattern 2: One breaker per logical function

See rule 3 — fragments the signal.

### Anti-pattern 3: Breaker without timeout

See rule 4 — without timeout, the breaker can't measure
"failure."

### Anti-pattern 4: Silent success when OPEN

The breaker is OPEN; the call returns success without
touching the dep. This is a false-positive success — UX shows
"completed" when nothing happened. Always return an explicit
state.

### Anti-pattern 5: Fixed thresholds across all deps

Stripe and your analytics service have very different
acceptable-failure-rate profiles. Tune per-dep.

## Cross-references

- `task-intake-due-diligence.md` Q8 (FMEA) — every external
  call's failure mode is enumerated; the breaker is the
  mitigation
- `error-handling-with-context.md` — breaker-OPEN errors carry
  `dependency_down_<name>` + `request_id`
- `error-codes.md` — `dependency_down_<name>` is a code class
- `rate-limiting.md` — different protection layer; combine
- `observability.md` — state metrics + alerts
- `runbook-template.md` — every dep has a runbook entry
- `graceful-degradation.md` (when authored) — what to fall
  back to

## Why this rule exists

Without circuit breakers, a single slow dependency cascades:

1. Dep starts timing out
2. Service's request handlers block waiting
3. Thread pool / event loop saturates
4. Service stops accepting new requests
5. Upstream callers' requests time out
6. Cascade up the stack

Within minutes, a dep that's "just slow" takes down the
entire system. The breaker contains the failure — calls fail
fast, the dependent service stays healthy enough to serve
non-dep-related traffic, and the dep gets time to recover.

This pattern is so canonical it's named in every distributed-
systems book; it's in the OWASP Top 10 indirectly (A04 —
Insecure Design — system without resilience patterns).

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- External call wrapped in breaker but without timeout (rule 4 weakening — breaker can't measure failure)
- Per-call-site breaker found instead of per-dependency (rule 3 violation — fragmented failure signal)
- Breaker OPEN triggered silent success instead of fallback / error envelope (anti-pattern 4 violation)
- Retry-on-OPEN observed (rule 5 weakening — must respect breaker state)
- Breaker thresholds tuned identically across deps with very different SLAs (rule 2 weakening)
- New external dep introduced without a breaker (rule 1 weakening)
- Breaker flapping OPEN ↔ CLOSED (thresholds too tight OR upstream genuinely unstable)
- Hand-rolled breaker found instead of canonical library (reuse-first weakening)

**Refinement candidates**:

- New per-language library row when a canonical option emerges
- Tightening of default thresholds when chronic flapping or false-positive opens observed
- New fallback-path pattern entry when a recurring degradation shape needs naming
- New cross-reference when a sister rule (rate-limiting, graceful-degradation) defines a complementary signal
