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

# resilience-rules

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H
> will delete the source files to close the eager-load loop.

## Purpose

Six resilience rules, one per concern. This file is a ROUTING TABLE: it names
each rule, says when it applies, and points at the reference file carrying its
full text — hard rules, code examples, standards cited, anti-patterns and
learning hooks, all verbatim as they were written. Nothing was summarised on
the way here.

Read the row that matches the work, then open that one reference. A `paths:`
match loads this file into context in full, which is why the detail is no
longer in it: the per-file weight in the last column is what a single matching
edit used to pay before any work began.

## Routing table

| Topic | Open this when | Reference | Size |
| --- | --- | --- | --- |
| **Circuit breaker** | Wrapping a call that leaves the service boundary — third-party API, upstream service, remote DB, cache, queue, object store. Carries the CLOSED/OPEN/HALF-OPEN state machine, per-dependency (never per-call-site) scoping, threshold defaults, timeout and retry interaction, per-tenant bulkheads, the five fallback shapes, breaker metrics and alerts, and the canonical library per language. | [`references/circuit-breaker.md`](references/circuit-breaker.md) | 11.7 KB |
| **Graceful degradation** | Deciding what a feature does when a dependency is down or slow. Carries the P0–P3 criticality tiers, cache-then-fallback reads, outbox queue-and-retry writes, explicit degraded-mode UX, separate pools for critical paths, pre-built kill switches, degraded-vs-broken observability, testing the degraded path, chaos testing, and the five fallback patterns. | [`references/graceful-degradation.md`](references/graceful-degradation.md) | 13.9 KB |
| **Feature flags** | Creating, rolling out, or removing a flag. Carries the five flag categories and their lifecycles, the mandatory owner + expiry + decision criteria + removal task, boundary (not deep-stack) evaluation, context-driven evaluation, server-side default, fault-tolerant SDK behaviour, audit logging, experiment stop rules, cleanup at D+14, the OpenFeature SDK table and the flag-registry YAML shape. | [`references/feature-flags.md`](references/feature-flags.md) | 14.4 KB |
| **Idempotency** | Writing anything that can be retried — a POST, a webhook handler, a queue consumer, an external write. Carries RFC 9110 method semantics, Stripe-style `Idempotency-Key` handling including mid-flight collisions, webhook event-id dedupe, at-least-once queue consumers, conditional-write shapes per database, per-vendor idempotency primitives, idempotent state transitions, the four tests that make it provable, and cache TTLs. | [`references/idempotency.md`](references/idempotency.md) | 11.6 KB |
| **Rate limiting** | Exposing an endpoint, or protecting an operation that costs money or capacity per call. Carries the four limiting layers, per-endpoint defaults, algorithm selection, RFC 6585 and `RateLimit-*` response headers, stricter auth-endpoint limits per IP and per account, distributed counters, limiting operations rather than requests, throttle metrics and alerts, and the trust/exception policy. | [`references/rate-limiting.md`](references/rate-limiting.md) | 9.9 KB |
| **Deploy failures become checks** | A deploy just failed on a documented platform limit. Carries the same-commit rule, what counts as a platform limit, the table of AWS / Vercel / Cloudflare / Kubernetes / Docker limits with how to check each one locally, how to author the check against the built artifact, and what repeated firing of a single check means architecturally. | [`references/deploy-failures-become-checks.md`](references/deploy-failures-become-checks.md) | 6.1 KB |

## Source files migrated

- `rules-library/common/circuit-breaker.md`
- `rules-library/common/graceful-degradation.md`
- `rules-library/common/feature-flags.md`
- `rules-library/common/idempotency.md`
- `rules-library/common/rate-limiting.md`
- `rules-library/common/deploy-failures-become-checks.md`
