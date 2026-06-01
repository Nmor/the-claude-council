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
