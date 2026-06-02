---
name: resilience-rules
description: Resilience patterns — circuit-breaker (per-DEPENDENCY breaker; CLOSED/OPEN/HALF-OPEN), graceful-degradation (P0-P3 criticality tiers; explicit degraded UX never silent), feature-flags (every flag has owner + expiry + decision criteria; OpenFeature spec; kill switches pre-built), idempotency (Stripe keys; RFC 9110 method semantics; webhook event-id dedupe), rate-limiting (multi-layer; per-endpoint defaults; RFC 6585), deploy-failures-become-checks (every deploy failure becomes a pre-deploy check). Sister to observability-patterns. Auto-fires on resilience/feature-flag/rate-limit code paths.
paths:
  - "**/*circuit*"
  - "**/*breaker*"
  - "**/*resilience*"
  - "**/*feature*flag*"
  - "**/*idempot*"
  - "**/*rate*limit*"
  - "**/health*"
  - "**/readiness*"
  - "**/liveness*"
  - "**/deploy*"
  - "**/release*"
  - "**/canary*"
  - "**/rollback*"
---

> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H will delete the source files to close the eager-load loop.

# resilience-rules

## Source files migrated

- `rules-library/common/circuit-breaker.md`
- `rules-library/common/graceful-degradation.md`
- `rules-library/common/feature-flags.md`
- `rules-library/common/idempotency.md`
- `rules-library/common/rate-limiting.md`
- `rules-library/common/deploy-failures-become-checks.md`

---

<!-- ============================================================
     Section: circuit-breaker.md (from rules/common/)
     ============================================================ -->

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

```
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

```
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

---

<!-- ============================================================
     Section: graceful-degradation.md (from rules/common/)
     ============================================================ -->

# Graceful Degradation Rule (Always-On, Global)

> Auto-fires on every file. Sister to `circuit-breaker.md` (the
> mechanism that triggers degradation), `feature-flags.md` (the
> kill-switch surface), `error-codes.md` (`dependency_down_<name>`,
> `degraded_mode`), `observability.md` (degradation metrics),
> `runbook-template.md` (degraded-mode playbook),
> `no-silent-failures.md` (degradation is COMMUNICATED, never silent).
> Pattern reference: **Google SRE Book**, **Release It! (Nygard)**.

## Core Principle

**When a non-critical dependency, sub-feature, or downstream service
fails, the system continues to serve its core function with reduced
capability — never an opaque 500. Degradation is INTENTIONAL +
COMMUNICATED: code paths know they're degraded, users see explicit
"this feature is temporarily unavailable" UX, and metrics track
both the degradation and its blast radius.**

The opposite of graceful degradation is brittle coupling: one
downstream blip and the entire product is offline. The cost of
designing for degradation is ranking your features by criticality
upfront. The cost of NOT designing for it is total outages every
time a third-party API hiccups.

## Criticality tiers

Every product surface is categorised:

| Tier | Definition | Outage behaviour |
| --- | --- | --- |
| **P0 — Core** | The product is unusable without it | Serve from cache OR queue requests; never return error to user |
| **P1 — Important** | Heavy user impact but product still works | Degrade gracefully with banner; serve cached or default |
| **P2 — Enhancement** | Improves experience but optional | Silently skip; log; offer manual alternative |
| **P3 — Best-effort** | Nice-to-have | Fire-and-forget; never block on it |

Example (e-commerce):
- P0: Browse products, place an order, see order history
- P1: Personalised recommendations, search ranking
- P2: Real-time inventory levels, related-products carousel
- P3: Sentiment analysis of reviews, AI summaries

Every feature is tagged with its tier in `docs/criticality.md`
or equivalent. The Criticality Tier is reviewed quarterly.

## Hard rules

### 1. Identify the dependency graph at design time

For every new feature, the design phase enumerates:

- What does this feature CALL? (downstream deps)
- What CALLS this feature? (upstream consumers)
- What happens when each downstream dep is unavailable?
- What happens when each downstream dep is slow (> SLA)?
- What's the user-visible behaviour in each failure mode?

The answers go in the design doc + the runbook entry. Per
`task-intake-due-diligence.md` Q7 (integration map) + Q8 (FMEA).

### 2. Cache-then-fallback for read paths

Read-heavy paths use the cache-aside pattern with explicit
stale-handling:

```typescript
async function getProductRecommendations(userId: string) {
  // Try fresh
  if (breaker.state === 'CLOSED') {
    try {
      const fresh = await recsService.fetch(userId, { timeout: 500 });
      await cache.set(`recs:${userId}`, fresh, { ttl: '1h' });
      return { recommendations: fresh, source: 'fresh' };
    } catch (err) {
      log.warn('recs.fetch.failed', { userId, error: String(err) });
    }
  }

  // Fallback to cache (stale OK)
  const stale = await cache.get(`recs:${userId}`);
  if (stale) {
    metrics.increment('recs.degraded.served_stale');
    return { recommendations: stale, source: 'stale' };
  }

  // Fallback to default
  metrics.increment('recs.degraded.served_default');
  return { recommendations: getPopularProducts(), source: 'default' };
}
```

The response carries a `source` field; the UI can show a
"showing popular items" indicator when source is `default`.

### 3. Queue-and-retry for write paths

When an external write fails (charge a card, send an email, post
to a webhook), the canonical pattern is:

1. Write the intent to a durable outbox (DB row, SQS message)
2. Worker process retries with exponential backoff + jitter
3. After N failures, message moves to DLQ with full context
4. DLQ is monitored; on-call investigates within SLO

The user sees "your order is being processed" — not a 500 —
because the order intent was captured durably.

### 4. Degraded-mode UX is explicit

When a feature is in degraded mode, the user sees it:

- **Banner**: "Search results may be incomplete. We're working
  on it."
- **Inline status**: "Real-time inventory unavailable — showing
  last-known counts."
- **Disabled controls**: greyed out + tooltip ("Recommendations
  are temporarily unavailable.")
- **Progress indicator with retry**: "Saving... (will retry
  automatically)"

NEVER show a generic spinner that spins forever. NEVER show a
green check when the action didn't fully complete. Per
`no-silent-failures.md`.

### 5. Synchronous calls have timeouts; async paths have circuit breakers

- **Timeout** on EVERY external call (per
  `task-intake-due-diligence.md` Q8). Default: 5 seconds for
  user-facing, 30 seconds for background.
- **Circuit breaker** wrapping every external call (per
  `circuit-breaker.md`). When OPEN, the fallback path runs
  without hitting the dep.
- **Retry** with backoff + jitter; cap at N attempts; never
  retry forever.

### 6. Critical paths run on a separate pool

If recommendations + checkout share a thread pool / connection
pool / queue, a slow recommendations service can saturate the
pool and break checkout. Isolate:

- Separate Lambda functions per criticality
- Separate Kubernetes namespaces / deployments / HPA
- Separate connection pools per upstream dep
- Bulkhead pattern (Hystrix, resilience4j) for thread isolation

Each pool has its own SLO + capacity planning.

### 7. Feature kill switches are pre-built

For every P1+ feature, a kill switch flag exists (per
`feature-flags.md` rule 8). On-call can disable the feature in
seconds when:

- A bug is causing widespread failures
- A downstream is permanently broken and the workaround is to
  hide the feature
- Marketing campaign overflow is causing traffic to spike
  unsustainably

Kill switches are pre-tested in staging — never flipped for the
first time in production during an incident.

### 8. Observability differentiates degraded from broken

Metrics + alerts distinguish three states:

| State | Metric | Alert |
| --- | --- | --- |
| **Healthy** | `feature_state{name, state="ok"} = 1` | Silent |
| **Degraded** | `feature_state{name, state="degraded"} = 1` + degradation reason tag | Page if sustained > 5 min |
| **Broken** | `feature_state{name, state="broken"} = 1` | Page immediately |

The graphed timeline shows the transitions; post-incident review
includes "how long were we in degraded mode" as a key metric.

### 9. Test the degraded path

Per `testing.md` — every feature's test suite includes:

- **Happy path** — dep works as expected
- **Degraded path** — dep returns errors / timeouts → verify
  fallback is served
- **Broken path** — dep is fully down → verify error UX is
  correct + user can recover

Without these tests, the degraded path is unverified code that
only runs in production incidents (the worst time to discover
it's broken).

### 10. Periodic chaos testing

The degraded path's correctness erodes over time. Quarterly (or
more often for high-criticality systems):

- Black-hole a downstream dep in staging; verify all consumers
  degrade as expected
- Inject latency; verify timeouts fire + breakers open
- Disable a feature flag; verify graceful UX

Per `task-intake-due-diligence.md` Q14 (testing strategy). Tools:
**Chaos Monkey**, **Gremlin**, **AWS Fault Injection Simulator**,
**Litmus** (Kubernetes), **Toxiproxy** (network).

## Patterns

### Pattern 1: Cache-aside with stale fallback

```
Read → Cache hit?  YES → Return cached
            NO    → Try fresh
                    Fresh OK?  YES → Update cache, return fresh
                              NO  → Return cached (even if expired)
                                    OR return default
```

Use when: data changes slowly; user tolerates 1-hour-stale.

### Pattern 2: Outbox + worker

```
Request → Validate → Write to outbox + business state (same TX)
Outbox worker → Pick up → Call external → Retry on failure
                                       → Move to DLQ after N attempts
```

Use when: external write is non-real-time; user-visible
confirmation can be "in progress."

### Pattern 3: Async pre-warm + fast read

```
Background job: pre-compute recommendations every hour, store in
                cache.
Request: read from cache. Fresh fetch is impossible without the
         async job; if cache is cold, return defaults.
```

Use when: expensive computation; user tolerates "popular items"
fallback while cache warms.

### Pattern 4: Hedged requests

```
Request → Call primary → If no response in 100ms → Call secondary in parallel
                    → First response wins
```

Use when: tail latency matters; redundant downstreams exist
(read replicas, multi-region).

### Pattern 5: Bulkhead isolation

```
Pool A (critical): 50 connections, dedicated to checkout
Pool B (other):    50 connections, shared by everything else
```

A pool-B saturation cannot starve pool-A traffic.

## Anti-patterns

### Anti-pattern 1: Catch-all 500

Wrapping every handler with `try { ... } catch { return 500 }` is
not graceful degradation — it's outage propagation. The catch
must KNOW what failed and serve the appropriate fallback.

### Anti-pattern 2: Cascading retries

Layer A calls Layer B with 3 retries; Layer B calls Layer C with
3 retries. When C is slow, A's single request becomes 9 calls to
C — amplifying the load. Retry budgets must be aware of the
total stack depth.

### Anti-pattern 3: "It works on my machine" fallback testing

Manually testing the degraded path locally (with the dev DB
turned off) is not the same as testing with the real production
configuration. The degraded path's behaviour depends on the
exact cache layer, the exact load balancer, the exact CDN.

### Anti-pattern 4: Silent degradation

Falling back to default behaviour without telling the user that
real data was unavailable is a false-positive success. The UI
MUST communicate degradation (see Rule 4).

### Anti-pattern 5: One huge SPOF behind everything

A single auth service that EVERY page hits → auth outage = total
outage. Cache the auth result at the edge (signed JWT, short TTL)
so auth-down still allows logged-in users to keep browsing.

## Cross-references

- `circuit-breaker.md` — the breaker is the mechanism; this rule
  is the architecture
- `feature-flags.md` — kill switches enable on-call response
- `error-codes.md` — `dependency_down_<name>`, `degraded_mode`,
  `cache_only`, `partial_failure` codes
- `observability.md` — degradation metrics + alerts
- `no-silent-failures.md` — degraded paths COMMUNICATE state
- `runbook-template.md` — degraded-mode playbook
- `task-intake-due-diligence.md` Q7 (integration map), Q8 (FMEA),
  Q15 (observability)
- `idempotency.md` — outbox + retry depends on idempotency

## Standards cited

- **Google SRE Book** — Error Budgets + Graceful Degradation
- **Nygard, "Release It!"** — Stability Patterns chapter (Bulkhead,
  Steady State, Fail Fast, Handshaking)
- **AWS Well-Architected Framework — Reliability Pillar**
- **Azure Architecture Center — Resiliency patterns**

## Why this rule exists

Total outages happen when every code path assumes its downstream
is up. The pattern is universal:

1. Auth service has a hiccup (3 minutes)
2. Every product page that calls auth times out (60 seconds each)
3. Thread pool saturates; new requests queue
4. Load balancer marks pods unhealthy; traffic shifts
5. Healthy pods now overloaded; they fail too
6. Total outage of 45 minutes for a 3-minute root cause

With graceful degradation: auth times out → falls back to a
cached JWT (5-minute TTL) → product pages serve normally → users
who try to log in/out see "auth temporarily unavailable, try
again in a moment" → 3-minute partial degradation instead of
45-minute total outage.

The cost is one design decision per feature (criticality tier +
fallback strategy). The benefit is the difference between "the
product is slow today" and "the product is down today."

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Feature shipped without a criticality tier assigned (rule 1 weakening)
- Degraded state shown without explicit UX surface (rule 4 weakening — silent degradation pattern)
- Catch-all 500 wrapper found around handlers (anti-pattern 1 violation)
- Cascading retry pattern amplifying load on a slow dep (anti-pattern 2 violation)
- Cache-aside read missing the stale-fallback step (pattern 1 weakening)
- Outbox + worker not used for non-real-time external writes (pattern 2 not adopted)
- Bulkhead isolation missing on a saturation-prone resource (rule 6 weakening)
- Kill switch not pre-built for a P1+ feature (rule 7 weakening)
- Degraded path untested (rule 9 weakening — happy-path only coverage)
- Periodic chaos test cycle skipped > 6 months (rule 10 weakening)

**Refinement candidates**:
- New criticality tier when a recurring class of feature doesn't fit P0/P1/P2/P3
- New pattern entry when a canonical fallback shape emerges (e.g., hedged requests, request collapsing)
- New row in the anti-patterns when a recurring degradation failure mode surfaces
- New cross-reference when a sister rule (circuit-breaker, feature-flags, observability) defines the mechanism a degradation depends on

---

<!-- ============================================================
     Section: feature-flags.md (from rules/common/)
     ============================================================ -->

# Feature Flags Rule (Always-On, Global)

> Auto-fires on every file. Sister to `deprecation-lifecycle.md`
> (sister rollout pattern), `circuit-breaker.md` (kill switches),
> `observability.md` (flag metrics), `audit-logging.md` (flag changes
> are audited events), `task-intake-due-diligence.md` Q17 (rollback).
> Vendors: **Unleash** (OSS), **Flagsmith** (OSS), **OpenFeature**
> (CNCF spec), **GrowthBook** (OSS), **LaunchDarkly** (SaaS),
> **Statsig** (SaaS), **Optimizely** (SaaS).

## Core Principle

**Every code path whose behaviour might need to be changed without a
deploy — A/B experiments, gradual rollouts, kill switches, per-tenant
overrides, time-bombed migrations — sits behind a feature flag. The
flag's lifecycle is explicit: created, rolled out, observed, decided
on, and REMOVED. Flags that outlive their decision become technical
debt.**

A feature flag IS code that has not yet been deleted. The cost of a
flag is the test combinatorics it adds (every flag doubles the
state space), the cognitive load on readers, and the runtime cost
of the lookup. The benefit is decoupling release (the binary is
in production) from launch (users see the new behaviour).

## Flag categories

Different flag types have different lifecycles and risk profiles:

| Category | Lifecycle | Max age |
| --- | --- | --- |
| **Release toggle** | Hide in-progress features until ready; on for staging, off for prod | Days–weeks; removed at launch |
| **Experiment** | A/B/n test variants for a metric | Weeks; removed when stat-sig + decision |
| **Ops toggle / kill switch** | Disable a feature in incident response | Permanent (the flag stays, the value flips) |
| **Permission toggle** | Per-tenant / per-user feature gating | Permanent (lives with the entitlement system) |
| **Migration toggle** | Route reads to old vs new system during cutover | Weeks; removed when migration complete |

Mixing categories in the same flag is the leading cause of "we
can't remove this flag" debt. One flag, one purpose.

## Hard rules

### 1. Every flag has a documented owner + expiry

When the flag is created, the system records:

- **Name** — kebab-case, descriptive (`marketplace-checkout-v2`,
  NOT `flag1` or `temp`)
- **Owner** — a team or named engineer
- **Category** — release / experiment / ops / permission / migration
- **Created date**
- **Expiry date** — when the flag MUST be reviewed
- **Decision criteria** — what observation would flip / remove the
  flag (metrics + thresholds)
- **Removal task** — link to the ticket / TODO that will remove the
  flag

A flag without an owner + expiry is rejected at creation time
(linter / CI check on the flag registry).

### 2. Default-off, opt-in for rollouts

New behaviour defaults to OFF. Users opt IN by:

- **Internal cohort first** — staff accounts (`@yourcompany.com`)
- **Beta cohort** — opted-in users
- **Canary tenants** — small subset of paying customers
- **Percentage rollout** — 1% → 5% → 25% → 50% → 100% with
  observation between steps
- **Geographic rollout** — region-by-region for high-risk changes

The default-off rule is REVERSED for security or compliance fixes
— those default ON, with an opt-out flag for known-broken integrations.

### 3. Flags are evaluated at the boundary, not in the deep stack

```typescript
// WRONG — flag check buried in the data layer
async function getOrders(userId: string) {
  if (await flags.isEnabled('orders-v2', userId)) {
    return ordersV2.query(userId);
  }
  return ordersV1.query(userId);
}

// RIGHT — flag check at the handler / route, dispatching to
// implementation
async function handleGetOrders(req, res) {
  const useV2 = await flags.isEnabled('orders-v2', req.user.id);
  const orders = useV2
    ? await ordersV2Handler(req)
    : await ordersV1Handler(req);
  res.json(orders);
}
```

Boundary evaluation makes the diff between code paths visible at
the entry point and avoids scattering flag checks across the
codebase.

### 4. Flags carry context, not just boolean state

The flag SDK accepts an evaluation CONTEXT (user id, tenant id,
plan tier, country, device, app version) and returns either:

- A boolean (for simple toggles)
- A variant (for experiments — `control` / `variant_a` / `variant_b`)
- A typed config payload (for parameterised features — limits,
  thresholds, copy variants)

Context-driven evaluation lets one flag serve role-based access
("PRO tier only"), gradual rollouts ("10% of EU users"), and kill
switches simultaneously without coding each combination separately.

### 5. Server-side evaluation by default

Client-side flag evaluation (web / mobile) leaks the entire flag
state to anyone with browser devtools — including flags for
unreleased features. Defaults:

- **Server-side**: evaluate on the backend, send only the resolved
  values to the client (this user, right now)
- **Client-side**: only for non-sensitive UI flags (color scheme,
  experimental layout) where leakage is acceptable

For high-security features (payment flow changes, auth changes,
admin-only views), NEVER use client-side flags.

### 6. Flag SDK is fault-tolerant

The flag evaluation MUST not fail open or fail closed without
explicit configuration. Required:

- **Timeout** — flag evaluation < 100ms; fall back to default on
  timeout
- **Default value** — every flag check has an explicit fallback if
  the SDK is unreachable
- **Local cache** — flag values cached at process start +
  refreshed every 30-60 seconds
- **Circuit breaker** — if the flag service is down, the cached
  values persist; new flags evaluate to defaults

The Octopus principle: when in doubt, the safe behaviour wins.
Defaults are chosen so a flag service outage doesn't break the
product.

### 7. Flag changes are audit-logged

Per `audit-logging.md` — every flag change emits an event:

```json
{
  "event": "feature_flag.changed",
  "flag": "marketplace-checkout-v2",
  "actor": "alice@example.com",
  "before": { "enabled": false, "rollout": 0 },
  "after": { "enabled": true, "rollout": 5 },
  "reason": "Begin canary rollout per launch plan",
  "timestamp": "2026-05-26T14:32:18Z"
}
```

Changes by automation (auto-rollback on error spike) carry the
script id as the actor.

### 8. Kill switches are pre-built, not improvised

For every external dependency (per `circuit-breaker.md`) AND every
risky internal feature, a kill switch flag exists from day one:

- `kill_switch_stripe_payments` — disables payment routing
- `kill_switch_marketplace` — disables the marketplace feature
- `kill_switch_ai_suggestions` — disables AI-generated suggestions

The runbook (per `runbook-template.md`) names which switch to flip
for which incident class. When the kill switch fires, the user
sees explicit "feature unavailable" UX — not a silent failure
(per `no-silent-failures.md`).

### 9. Experiments have a stop rule and a decision deadline

A/B experiments cannot run forever. Required up-front:

- **Sample size** — pre-computed for the target effect size +
  significance level (typically α = 0.05, power = 0.80)
- **Stop rule** — minimum days OR minimum sample (whichever later)
  to avoid peeking bias
- **Decision deadline** — when the experiment ends regardless of
  result; either ship the winner or kill the variant
- **Guardrail metrics** — secondary metrics that must NOT regress
  (latency, error rate, retention) — experiment auto-pauses if
  guardrails breach

Inconclusive experiments at deadline are killed (default = revert
to control), not extended indefinitely.

### 10. Flag cleanup is part of the launch checklist

When an experiment / release flag reaches 100% and stays there for
the bake period (typically 14 days), it MUST be removed:

1. The losing code path is deleted
2. The flag check is removed; the new code becomes unconditional
3. The flag entry is removed from the flag service
4. Tests covering the flag's old behaviour are deleted

The cleanup is a separate PR with its own review. It's tracked in
the launch retrospective; if cleanup hasn't happened by D+30, the
on-call rotation gets the chore.

## Anti-patterns

### Anti-pattern 1: Flag spaghetti

Multiple nested flag checks for related behaviour:

```typescript
if (await flags.isEnabled('new-checkout', user)) {
  if (await flags.isEnabled('new-checkout-stripe', user)) {
    if (await flags.isEnabled('new-checkout-stripe-3ds', user)) {
      // ...
    }
  }
}
```

This is exponential complexity. Either consolidate (one flag with
typed payload selecting variant) OR finish + remove the dependent
flags before adding the next layer.

### Anti-pattern 2: "Just leave the flag in case"

A flag at 100% rollout for 6+ months is dead code wrapped in an
`if (true)`. Remove it. If you need a kill switch, that's a
different (named, owned, documented) flag.

### Anti-pattern 3: Flag-as-config

Flags are not the config system. Static configuration (cache TTL,
log level, batch size) belongs in environment variables or a
config service. Flags are for behaviour that changes during the
process lifetime without redeploy.

### Anti-pattern 4: Flag-coupling tests

A test that runs only when a specific flag is on is a flaky test
in production. Either:

- Test both branches explicitly with the flag mocked
- Move the flag-specific assertion to an integration test that
  controls the flag state

Never assume the prod flag state in tests.

### Anti-pattern 5: Per-flag service-down behaviour

When the flag SDK is unreachable, the answer for EVERY flag should
be deterministic + safe. Not "this flag fails open, that flag
fails closed." Set defaults explicitly at the call site.

## Per-language SDKs

| Language | Library | OpenFeature compliance |
| --- | --- | --- |
| Node.js / TypeScript | `@openfeature/server-sdk` + provider | Yes |
| Browser | `@openfeature/web-sdk` | Yes |
| Go | `github.com/open-feature/go-sdk` | Yes |
| Java | `dev.openfeature.sdk` | Yes |
| Python | `openfeature-sdk` | Yes |
| Ruby | `openfeature-sdk` | Yes |
| Swift / Kotlin | `openfeature-swift` / `openfeature-kotlin` | Yes |
| .NET | `OpenFeature` | Yes |

**OpenFeature** (CNCF) is the standard interface — pick a provider
(Unleash, Flagsmith, GrowthBook, LaunchDarkly) and the call sites
stay portable.

## Flag registry shape

The flag service (or a flag registry file in IaC) carries:

```yaml
flags:
  marketplace-checkout-v2:
    owner: payments-team
    category: release
    created: 2026-05-01
    expiry: 2026-08-01
    decision_criteria:
      - "conversion_rate_v2 >= conversion_rate_v1"
      - "checkout_latency_p99_v2 <= checkout_latency_p99_v1 + 100ms"
      - "guardrail_metrics: error_rate, refund_rate"
    rollout:
      default: false
      rules:
        - segment: internal_staff
          enabled: true
        - segment: beta_users
          enabled: true
        - segment: paid_tier
          enabled: true
          percentage: 5
    removal_task: PAYMENTS-1234
```

## Cross-references

- `deprecation-lifecycle.md` — sister rollout pattern; deprecations
  use the same gradual cohort approach
- `circuit-breaker.md` — kill switches integrate with circuit
  breakers for external deps
- `observability.md` — flag exposure events emitted as metrics +
  events; `feature_flag_exposure{flag, variant}` counter
- `audit-logging.md` — flag changes are audited events
- `task-intake-due-diligence.md` Q17 (rollback) — every non-trivial
  feature has a flag-based rollback
- `no-silent-failures.md` — flag-disabled state is communicated to
  the user explicitly, never silently
- `task-intake-due-diligence.md` Q22 (success criteria) — flag
  decision_criteria mirror the launch success criteria

## Standards cited

- **OpenFeature specification** (CNCF) — vendor-neutral flag API
- **Statistical hypothesis testing** for experiments — common
  practice: α = 0.05, power = 0.80
- **CAP-aware fallback** — flag SDK failure modes documented per
  the resilient-software best practices

## Why this rule exists

Feature flags solve a real problem: shipping risky changes safely
without a release-engineering bottleneck. The cost is
combinatorial state space + cognitive overhead + dead flags that
nobody dares to remove. The user-facing impact when flags rot:

- Experiments running for years past their decision deadline,
  polluting analytics
- Kill switches that are themselves broken (nobody tested the
  off-path in months)
- Tenant-permission flags overlapping with the entitlements
  system, with neither team owning the conflict
- Customer-reported bugs that depend on flag combinations the
  team didn't know were possible

The fix is mechanical: every flag has an owner, an expiry, a
decision criteria, and a removal task. Treat flags like FIFO —
first in, first out.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Flag created without owner / expiry / decision criteria (rule 1 weakening)
- Flag at 100% rollout for > 14 days without cleanup PR (rule 10 weakening — flag spaghetti accumulating)
- Flag evaluation buried in the data layer instead of at boundary (rule 3 violation)
- Client-side flag used for a security / payment / admin path (rule 5 violation — leaks via devtools)
- Flag SDK timeout / fallback missing (rule 6 weakening — fault tolerance gap)
- Multiple nested flag checks for related behaviour (anti-pattern 1 — flag spaghetti)
- Flag-as-config use case found (anti-pattern 3 — config belongs elsewhere)
- Experiment past decision deadline without ship / kill action (rule 9 weakening)
- Kill switch flipped for the first time during an incident (rule 8 weakening — not pre-tested)

**Refinement candidates**:
- New flag-category row when a recurring use case doesn't fit the current 5 categories
- Tightening of the cleanup-by-D+14 SLA when stale flags accumulate
- New cross-reference when a sister rule (graceful-degradation, audit-logging) defines the surface a flag depends on
- New vendor row when an OpenFeature provider gains adoption

---

<!-- ============================================================
     Section: idempotency.md (from rules/common/)
     ============================================================ -->

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

---

<!-- ============================================================
     Section: rate-limiting.md (from rules/common/)
     ============================================================ -->

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

---

<!-- ============================================================
     Section: deploy-failures-become-checks.md (from rules/common/)
     ============================================================ -->

# Every deploy failure becomes a pre-deploy check (global)

## The rule

When a deployment fails on a documented platform limit (AWS, GCP,
Azure, Vercel, Cloudflare, Fly, Render, Kubernetes, anything with a
cap that ships in vendor docs), the next commit MUST add a local
pre-deploy check that would have caught it. The check goes wherever
the project runs its local-pre-flight script (typical names:
`infra/verify-local.sh`, `scripts/preflight.sh`, or a `predeploy`
npm script). CI runs the same script, so the check fires both
locally and in pre-deploy.

The check is part of the SAME commit that fixes the failure — never a
follow-up ticket. Without this, the same class of bug will hit again
the next time someone touches the same area.

## Why

Same-shape failures recur because the local environment doesn't run
the exact validation the cloud provider does. Every recurrence is a
20-minute deploy + a 5–10 minute rollback. Every check we add is
30 seconds locally and prevents an hour in CI.

## What counts as a "platform limit"

Any documented vendor constraint with a publicly-known number that
can be computed from a local artifact (built template, packaged
zip, manifest, lockfile) without calling the platform's API. Examples:

| Platform | Limit class | How to check locally |
| --- | --- | --- |
| AWS IAM | Managed-policy size 10,240 bytes | Read the JSON policy, byte-count it |
| AWS Lambda | Env-bag size 4,096 bytes / function | Parse packaged CFN, sum per-function env JSON |
| AWS Lambda | Package size 250 MB unzipped | `unzip -l` the package |
| AWS CloudFormation | 500 resources / stack | Count `Resources:` entries in template |
| AWS API Gateway | 600 routes / stage | Count event blocks |
| AWS DynamoDB | 20 GSIs / table | Count GSIs in CFN |
| AWS WAF v2 | 1,500 WCU / web-ACL | Sum rule WCU from CFN |
| AWS SQS | 256 KB message size | n/a (runtime, not deploy) |
| Vercel | 4.5 MB API response | n/a (runtime) |
| Cloudflare Workers | 1 MB script size | `ls -l dist/worker.js` |
| Kubernetes | 1 MB annotation size | YAML byte-count |
| Docker | 4 KB env per container (Lambda-equivalent) | parse `Dockerfile`/`compose.yml` env |

Runtime-only limits (request size, payload size, message size) are
not in scope for pre-deploy checks — those belong in test suites.
Pre-deploy checks target the **deploy-fail** class.

## Authoring the check

1. Read the packaged / built artifact (CFN template, K8s manifest,
   built worker bundle).
2. Walk the relevant resource type. Compute the size the same way the
   platform does (UTF-8 bytes, JSON serialisation rules, count of
   nested resources, etc).
3. Fail at a SOFT limit slightly below the documented cap to leave
   headroom for platform-managed reserved keys / template expansion.
4. Print the offending resource name + computed size + documented cap
   + a one-line "Fix:" hint pointing to the conventional remediation.
5. Add the check to the project's local-pre-flight script. CI runs
   the same script.

## When the check fires repeatedly

The check is the floor, not the ceiling. If a check fires more than
once in a quarter (or twice in a year), the underlying architectural
pattern that's filling the budget is the real problem. The proper
fix is to redesign so the budget isn't continuously approached.

For the Lambda env-bag specifically, the recurring filler is
per-table env vars in a multi-cell deployment — each cell can
carry dozens of table-name vars in `provider.environment`. The
architectural fix is to derive table names in code from a
cell-id + stage + known suffix pattern (a single
`lib/tableNames.ts`-style module), reducing the env-bag to a
small handful of vars. The project rule should name the
threshold at which the architectural fix becomes mandatory
(e.g. when headroom drops below one full env-var-row's worth on
the largest function).

## Sister rules

- `done-criteria.md` — the broader "done" checklist this slots into.
- `feedback_verify_local_before_push` (project-level memory) — never
  push without running the pre-flight script.

## Pattern: keep adding rows

Every new deploy failure → new row in the table above (or in the
project's local equivalent) → new check function. The list grows
with the codebase. Never assume "we won't hit that again" — assume
the opposite and codify it.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Deploy failure on a documented platform limit + no pre-deploy check added in the SAME commit as the fix (core rule violation)
- Same-shape failure recurs across deploys (codification never happened)
- Pre-deploy check exists locally but not in CI (local-CI parity gap)
- Pre-deploy check exists but threshold is soft (warns instead of fails) when failure mode is hard
- Same check fires more than once in a quarter without an architectural fix considered (rule "When the check fires repeatedly" weakening)
- Verification block reports "deploy green" without naming the pre-deploy checks that ran
- New platform / vendor adopted without canvassing its documented limits before first deploy

**Refinement candidates**:
- New row in the platform-limits table when a new vendor or service class adopted (e.g., new edge runtime, new K8s admission limit)
- Tightening of the soft limit when the gap to the documented cap shrinks (e.g., from 90% headroom to 50%)
- New cross-reference when a sister rule (done-criteria, no-overclaim, runbook-template) provides the verification surface
- New "architectural fix" template when an architectural pattern (e.g., env-var consolidation, sidecar shedding) recurs across services

---
