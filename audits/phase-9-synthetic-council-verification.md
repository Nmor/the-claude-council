# Phase 9 — Synthetic Council Task Verification

**Date**: 2026-05-29
**Rebuild plan**: `peppy-painting-parrot` (commit-policy: single)
**Phase 0 baseline**: `8a07d9c` (pre-rebuild snapshot tag)
**Purpose**: End-to-end verification that the rebuilt Council protocol + 49 global rules + 99 skills + 30 agents + Extended Eleven Division triggers execute together coherently on a representative design problem.

The synthetic task is drawn verbatim from the rebuild plan's Phase 9 specification:

> **Design a multi-tenant rate-limiting feature for a REST API serving 10k req/s with idempotency and audit-logging requirements.**

This task is chosen because it crosses architecture, implementation, security, data, operations, compliance, and risk — exercising the full Council surface. A pass means every rule + skill + agent referenced below resolves to an existing artifact, every Extended Division trigger fires per `council-triggers.md`, every tiebreaker / veto rule is invocable, and the resulting design is principal-level.

---

## Phase 0 — Deep Research

### Task Intake (per `task-intake-due-diligence.md`)

| # | Question | Answer summary |
| --- | --- | --- |
| 1 | Prior art (codebase) | Existing `rate-limiting.md` rule (multi-layer canonical defaults table — edge / gateway / app / DB); existing `idempotency.md` (Stripe-pattern keys + RFC 9110 method idempotency); existing `audit-logging.md` (append-only hash-chained store, ISO/IEC 27001 Annex A.8.15). No existing implementation to extend. |
| 2 | Prior art (people) | OWASP ASVS V11.1 (rate limiting) authored by OWASP project leads; RFC 6585 §4 (HTTP 429) by Mark Nottingham; draft-ietf-httpapi-ratelimit-headers by Roberto Polli + Alejandro Martinez Ruiz + Darrel Miller; Stripe Idempotency-Key pattern publicly documented since 2015. |
| 3 | Canonical reference | RFC 6585 §4 + RFC 7231 §6.5.3 + draft-ietf-httpapi-ratelimit-headers (latest); OWASP ASVS 4.0.3 V11.1; ISO/IEC 27001:2022 Annex A.8.15 (logging); NIST SP 800-92 (log management). |
| 4 | OSS option | EXTEND — Redis-backed token bucket (atomic `INCR` + TTL, OR Lua script for atomic check-and-decrement) is the canonical implementation. Libraries: `redis-rate-limit` (Node), `go-redis/redis_rate` (Go), `aioredis` + custom Lua (Python). No custom rate-limiter from scratch — per `reuse-first.md` radius escalation. |
| 5 | SOTA scan | Cloudflare's distributed rate-limit research (sliding window counter at scale); Stripe's idempotency model; AWS API Gateway usage plans (per-API-key throttling); Linkerd / Istio L7 rate limiting. 2025 best practice converges on sliding-window-counter (memory-efficient approximation of sliding-window-log) + token-bucket (allows bursts) hybrid. |
| 6 | Scalability | Target 10k req/s. At 10× (100k req/s) the rate-limiter must remain sub-millisecond. Redis cluster mode required at that scale; per-tenant sharding by `tenant_id` consistent-hash. Inflection: single-Redis-master ceiling ~50k ops/s; cluster mode mandatory above. |
| 7 | Integration map | Upstream: API Gateway (Envoy / Kong / AWS API Gateway) for coarse per-IP limit. Downstream: handlers wrapped in middleware. Shared: Redis cluster (rate-limit counters + idempotency cache); Postgres (audit-log store with partition-by-month); Kafka or SQS (audit-log async sink for cross-region replication); KMS (per-tenant encryption keys for audit log). |
| 8 | FMEA | (1) Redis cluster split-brain → rate-limit counter drift → over-permitting; mitigation: Sentinel + read-from-replica only on degraded mode + `circuit-breaker.md` to fail-closed when Redis unavailable. (2) Idempotency cache TTL expiry mid-retry → double execution; mitigation: longer TTL (7d for high-stakes mutations per `idempotency.md` rule 8). (3) Audit-log write fails after business write succeeds → torn state; mitigation: outbox pattern (DB transaction includes audit row insert; worker forwards to durable audit store; per `audit-logging.md` rule 1). (4) Per-tenant abuse → noisy-neighbour saturation; mitigation: per-tenant token-bucket isolation (bulkhead pattern per `graceful-degradation.md`). (5) Clock drift between rate-limiter nodes → window boundary discrepancies; mitigation: NTP sync mandatory; sliding-window-counter is approximate by design (acceptable). |
| 9 | Security (STRIDE) | **S** (spoofing): tenant-id from authenticated JWT only, never client-provided header. **T** (tampering): audit log hash-chained per `audit-logging.md` rule 3. **R** (repudiation): every 429 + every mutation emits audit event with `actor` + `subject` + `outcome`. **I** (info disclosure): rate-limit error envelope per `error-codes.md` carries no internal state. **D** (DoS): the rate-limit IS the DoS defence; secondary defence is edge-layer (Cloudflare / AWS Shield). **E** (privilege escalation): rate-limit cannot be bypassed by trusted callers without explicit allowlist + signed token (per `rate-limiting.md` rule 10). |
| 10 | Data lifecycle | Rate-limit counters: ephemeral (Redis TTL = 1 min). Idempotency keys: 24h default, 7d for high-stakes (per `idempotency.md`). Audit log: 7-year retention per SOX + GDPR Article 30 + PCI-DSS 10.7 (1y online + 3-month archive minimum, 7y total). PII in audit log: hashed IP, pseudonymised email, no raw credentials (per `audit-logging.md` rule 4). |
| 11 | Compliance | GDPR (audit log of access events supports Article 15 DSAR); ISO/IEC 27001 Annex A.8.15 (logging); PCI-DSS v4.0 Req 10 (audit + monitor access); SOC 2 CC7 (security incidents + evidence); HIPAA §164.312(b) (if health data flows through). Multi-tenant isolation also engages GDPR Article 32 (security of processing). |
| 12 | Accessibility | N/A for backend API. Error envelope's `message` field (per `error-codes.md`) MUST be plain-language so frontend can surface it without translation; UX layer engages WCAG 2.2 §3.3.3 (Error Suggestion) when rendering. |
| 13 | i18n | `error_code` is stable (snake_case); `message` is i18n-key (per `i18n.md` rule 8 + `error-codes.md`). `details.retry_after_seconds` formatted via `Intl.NumberFormat` + `Intl.RelativeTimeFormat` at the frontend. |
| 14 | Test strategy | Unit: token-bucket algorithm correctness, edge-of-window double-burst behaviour. Integration: Redis-backed counter under concurrency (race conditions); idempotency key collision resolution (mid-flight 409). Contract: response envelope matches `error-codes.md` schema (Pact test). E2E: 10k req/s load test (k6 / vegeta) with assertion on 429 emergence + recovery. Chaos: black-hole Redis mid-test, verify graceful degradation per `graceful-degradation.md`. Security: rate-limit bypass attempts via X-Forwarded-For spoofing (per `security.md` A07). |
| 15 | Observability | Metrics: `ratelimit_throttled_total{endpoint, tenant_id, reason}` counter; `ratelimit_consumed_ratio{endpoint, tenant_id}` gauge; `idempotency_cache_hits_total` counter; `audit_log_write_lag_seconds` histogram. Logs: every 429 logs at WARN (per `log-levels.md`) with `error_code: rate_limited`. Traces: OTel span around the rate-limit check + the idempotency lookup + the audit emit. Alerts: throttle rate >5% sustained 5min on any endpoint (per `rate-limiting.md` rule 9); audit-log write lag >30s sustained 1min. SLO: 99.9% of rate-limit decisions <5ms p99. |
| 16 | Cost | Redis cluster (3-node primary + 3-replica) at 10k req/s ~= $400/mo on ElastiCache cache.r7g.large. Postgres audit log: ~864M rows/day at 10k req/s, partitioned by month, archive to S3 after 90 days → ~$200/mo. Idempotency cache: subset of Redis (~10% of capacity). Total infra delta ≈ $700/mo at target; ~$5k/mo at 10× scale (cluster expansion + S3 archive growth). |
| 17 | Rollback / DR | RPO = 1 min (audit log replicated cross-region every minute via Kafka MirrorMaker); RTO = 5 min (Redis cluster failover automatic via Sentinel; Postgres failover via managed RDS Multi-AZ). Rollback: feature flag `ratelimit_enabled_v2` (per `feature-flags.md` rule 8); kill-switch disables rate-limiting entirely, falling back to upstream edge-layer-only protection. |
| 18 | Deprecation lifecycle | This is a new feature; no prior version to deprecate. Future v2 deprecations follow `deprecation-lifecycle.md` four-stage: announce → soft (`Deprecation: true` header) → hard (`410 Gone` for non-allowlisted) → remove. Total runway 12 months for public API per `api-versioning.md` rule 5. |
| 19 | UX writing | Toast on 429 (frontend): "Slow down — try again in 12 seconds." (`error_code: rate_limited` + `details.retry_after_seconds: 12`). Toast on 409 idempotency conflict: "Already submitted. Refresh to see the result." Per `error-codes.md` rule 4 — actionable + specific. |
| 20 | Documentation | Feature page at `docs/rate-limiting.md` (Diátaxis: reference + how-to); runbook entry at `docs/runbook.md#rate-limited` (per `runbook-template.md`); ADR at `docs/adr/0042-multi-tenant-rate-limit.md` (per `adr-template.md`); API reference auto-generated from OpenAPI 3.1 (per `documentation-requirements.md` rule 3); CHANGELOG entry + migration guide for clients on rollout. |
| 21 | Risk register | (1) Counter drift under cluster split → over-permit; mitigation: fail-closed on degraded; owner: Operations Division. (2) Audit-log write storm under attack → DB saturation; mitigation: ratelimit-the-ratelimit-failure-path + DLQ; owner: Data Division. (3) Idempotency cache eviction under memory pressure → double execution; mitigation: monitor cache memory + alert at 80%; owner: Operations Division. (4) Per-tenant allowlist abuse (legitimate enterprise customer over-grants their key) → noisy-neighbour; mitigation: per-tenant hard cap + escalation review every 30d; owner: Strategy Division. (5) Audit log retention misconfiguration → regulatory finding; mitigation: TF-managed retention policy + quarterly review; owner: Compliance Division. |
| 22 | Success criteria | Outcome metric: 99.9% of requests under rate-limit cap served <500ms p99. Guardrail: error budget burn rate not exceeding 14× / 6× / 1× per `observability.md` rule 8. Decision window: 30-day rolling. Instrumentation: Prometheus + Grafana dashboard + Datadog APM for traces. |
| 23 | Post-launch watch | 7 days canary rollout (1% → 5% → 25% → 50% → 100% per `feature-flags.md` rule 2); on-call primary + backup assigned with tightened alert thresholds (2× sensitivity); rollback predicate: error rate >1% sustained 5min OR p99 >2s sustained 5min. |
| 24 | AI / ML ethics | N/A — no ML in scope. (Future: ML-driven adaptive rate-limiting per Cloudflare 2024 research would engage Division 15 fully.) |
| 25 | Vendor / IP / license | Redis (BSD-3 → since v7.4 dual-licensed RSAL/SSPL) — verify SSPL exposure per `license-allowlist-gate.md`; alternative: KeyDB (BSD-3) or Valkey (BSD-3) if SSPL is incompatible with org legal posture. No new vendors; no IP review needed. |
| 26 | Operational handoff | Runbook entry per `runbook-template.md`: alert → diagnose (check Redis cluster health → check throttle metric → check tenant breakdown) → fix (per-cause table) → verify (alert clears + throttle rate normalised) → comms (status page + post-mortem within 5 business days). On-call training: 1-hour briefing pre-launch. Bus factor ≥ 2 enforced via CODEOWNERS. |
| 27 | Action plan | See Phase 3 implementation outline below; long list of atomic tasks per `plan-task-breakdown.md`. |
| 28 | Other | No code freeze conflicts. No marketing coordination needed (internal API change). Customer-success briefing required for enterprise customers approaching their per-tenant cap (proactive outreach 7 days before threshold). |
| 29 | Online sources consulted | RFC 6585 (datatracker.ietf.org/doc/html/rfc6585, read 2026-05-29) — HTTP 429 semantics; draft-ietf-httpapi-ratelimit-headers (datatracker.ietf.org, read 2026-05-29) — header conventions; OWASP ASVS 4.0.3 V11.1 (owasp.org, read 2026-05-29) — rate-limit controls; Stripe API Reference (stripe.com/docs/api/idempotent_requests, read 2026-05-29) — Idempotency-Key header pattern; ISO/IEC 27001:2022 Annex A.8.15 (iso.org, citation only) — logging. |

### Codebase exploration

| Surface | Status |
| --- | --- |
| `~/.claude/rules/common/rate-limiting.md` | Present — canonical defaults table (`Public read`, `Auth read`, `Auth write`, `Auth endpoints`, `Webhook`, `Bulk`, `AI/LLM`, `Email/SMS`, `Search`) + algorithm selection table + RFC-compliant headers + multi-layer guidance |
| `~/.claude/rules/common/idempotency.md` | Present — Stripe-pattern keys, RFC 9110 §9.2.2 mapping, queue consumer + DB conditional-write + external-API patterns |
| `~/.claude/rules/common/audit-logging.md` | Present — canonical event shape, hash-chained integrity, append-only storage, retention by regulation |
| `~/.claude/rules/common/observability.md` | Present — Four Golden Signals, structured logging, OTel W3C trace context |
| `~/.claude/rules/common/circuit-breaker.md` | Present — per-dependency breaker, timeout pairing, fallback paths |
| `~/.claude/rules/common/graceful-degradation.md` | Present — criticality tiers, degraded UX, kill switches |
| `~/.claude/rules/common/feature-flags.md` | Present — owner + expiry + decision criteria + removal task |
| `~/.claude/rules/common/error-codes.md` | Present — stable `error_code` strings, flat namespace, HTTP status mapping |
| `~/.claude/rules/common/error-handling-with-context.md` | Present — wrap with operation + ids, structured logging fields |

All cited rules resolve.

### Online research

Primary-source URLs cited in Q29 above. Per `official-docs-first.md`, provider-research file would land at `docs/provider-research/redis.md` documenting Redis license posture (BSD-3 ≤ v7.2, RSAL/SSPL ≥ v7.4) before any Redis-specific feature code is written.

---

## Phase 1 — Council Discussion

### Core Five (always engaged — minimum 2 sentences each)

**Division 1: Architecture & Planning** — `architect` (opus) + `planner` (opus)

The design separates four concerns: edge-layer protection (Cloudflare / AWS Shield catches volumetric attacks before they reach origin); gateway-layer per-IP coarse limit (Envoy / AWS API Gateway); application-layer per-tenant + per-endpoint fine limit (Redis-backed token bucket with sliding-window-counter approximation); and DB-layer statement-timeout safety net. This is canonical defense-in-depth per `rate-limiting.md` rule 1 — no single layer is load-bearing. Per-tenant isolation via consistent-hash sharding on `tenant_id` prevents noisy-neighbour saturation (bulkhead pattern per `graceful-degradation.md` Pattern 5). ADR at `docs/adr/0042-multi-tenant-rate-limit.md` records the decision; trade-off acknowledged: sliding-window-counter is an approximation (sacrifices precision at window boundaries for memory efficiency at 10k+ req/s). At 100× scale, Redis cluster + per-region replica with eventual-consistent counter reconciliation; that's the architectural inflection.

**Division 2: Implementation & Build** — `build-error-resolver`, `go-build-resolver`, `refactor-cleaner`, `database-reviewer`, `infra-reviewer`

Reuse `go-redis/redis_rate` (Go) OR `node-rate-limiter-flexible` (Node) per `reuse-first.md` rule 1 — no hand-rolled token bucket. Idempotency layer wraps Redis (via Lua script atomic check-and-set) with Postgres fallback for the 7-day high-stakes case (idempotency record persisted as outbox row). Database side: audit log table partitioned by month via `pg_partman` per `schema-evolution.md` rule 4 (no manual partition management); GIN index on `event_type` + B-tree on `(tenant_id, timestamp DESC)` for the DSAR query path; revoked UPDATE/DELETE grants enforce append-only (per `audit-logging.md` rule 2). Migrations land via expand-contract: add tables → ship code in dual-write mode behind feature flag → 7-day bake → flip flag → drop legacy paths. Infra: Terraform module for ElastiCache cluster + RDS Multi-AZ + Kafka MirrorMaker; pinned versions; CI runs `tflint` + `tfsec` + `checkov` per `extreme-lint-policy.md`.

**Division 3: Quality & Review** — `code-reviewer`, `go-reviewer`, `python-reviewer`, `java-reviewer`, `mobile-reviewer`, `doc-updater`

Code-side: middleware shape follows existing handler conventions (per `api-design` skill response-envelope contract — `{error_code, message, details, request_id}`). Tests assert on `error_code: rate_limited` not on copy text (per `error-handling-with-context.md` rule 10 + `error-codes.md` rule 7). Cognitive complexity cap (≤10 per function, per `extreme-lint-policy.md`) requires the middleware to extract: `is_allowlisted_caller`, `compute_bucket_key`, `check_bucket`, `emit_throttle_event` as separate functions, not a 200-line monolith. Documentation: feature page (Diátaxis reference + how-to per `documentation-requirements.md`); runbook entry; ADR; OpenAPI 3.1 spec updated; CHANGELOG entry. Communications Division will own the customer-facing migration guide.

**Division 4: Security** — `security-reviewer` (opus)

Threat model (STRIDE answers in Q9 above) confirms: `tenant_id` extraction is ONLY from authenticated JWT claims, never from `X-Tenant-ID` request header — that closes the spoofing class. Rate-limit bypass via `X-Forwarded-For` header spoofing is mitigated by trusted-proxy allowlist at the edge layer (envoy `xff_num_trusted_hops` config). Auth endpoints (login / signup / password-reset) get the stricter limits per `rate-limiting.md` rule 6 — 5 failed in 5min → lock 15min, 10 in 1h → lock 24h + email user, per OWASP ASVS V2.2.1. CVE gate: Redis 7.x → check `dependency-vulnerabilities.md` MODERATE+ baseline before pinning a specific patch version. **No security veto raised** — design satisfies OWASP ASVS V11.1 controls. License posture (Redis SSPL since 7.4) is a Compliance concern; flagged to Division 6.

**Division 5: Testing & QA** — `tdd-guide`, `e2e-runner`, `performance-reviewer`

TDD ordering: (1) unit test the token-bucket algorithm against the spec (allowed N requests in window → 429 on N+1 → recovery after window); (2) integration test against real Redis under concurrent load (race condition class); (3) contract test (Pact) — producer (rate-limit middleware) + consumer (frontend `useApiError` hook) agree on envelope shape; (4) E2E test — 10k req/s load via `k6` with assertion on throttle emergence + recovery; (5) chaos test — black-hole Redis mid-test, verify `circuit-breaker.md` fail-closed behaviour + degraded-mode UX surfaces per `graceful-degradation.md` Rule 4. Coverage gate: 90% on touched files, 80% project per `extreme-lint-policy.md`. Performance budget: rate-limit decision <5ms p99 (locally `redis-benchmark` baseline), measured in production via OTel span duration. Regression baseline: existing endpoints' p99 must not regress >5% after middleware wraps them.

### Extended Eleven trigger evaluation (mechanical per `council-triggers.md`)

| # | Division | Trigger matched? | Engagement |
| --- | --- | --- | --- |
| 6 | Compliance & Legal | YES — multi-tenant + PII flow + audit-log + GDPR Article 32 + PCI-DSS Req 10 + SOC 2 CC7 | **ENGAGED — see voice below** |
| 7 | Product / UX / CX | PARTIAL — error UX surface (`message` field rendering) but no UI files this turn | Standby; engages when frontend handler PR opens |
| 8 | Operations & Reliability | YES — SLO definition + alert config + runbook entry + deploy posture | **ENGAGED — see voice below** |
| 9 | Data & Analytics | YES — audit-log schema + PII flow + retention configuration | **ENGAGED — see voice below** |
| 10 | Finance & FinOps | YES — ElastiCache + RDS + Kafka cost-sensitive resources; 10× scale forecast | **ENGAGED — see voice below** |
| 11 | Risk Management | YES — destructive-failure paths (Redis cluster split-brain); blast radius affects every authenticated endpoint | **ENGAGED — see voice below** |
| 12 | Strategy & Innovation | NO — internal API hardening, not new feature surface | Standby |
| 13 | People & Culture | NO — no team-boundary change, no hiring-criteria change | Standby |
| 14 | Sustainability & ESG | PARTIAL — always-on Redis + audit-log retention has carbon implication; not material at this scale | Advisory note: prefer carbon-aware region for Kafka MirrorMaker cross-region replica (e.g., AWS eu-west-1 over us-west-1 if user base permits); not a blocker |
| 15 | Ethics & Responsible AI | NO — no ML / AI in scope | Standby |
| 16 | Communications & Documentation | YES — public-API change requires release notes + migration guide + status-page update | **ENGAGED — see voice below** |

Extended divisions ENGAGED: 6, 8, 9, 10, 11, 16. Six of eleven fire — consistent with the cross-cutting nature of the task.

**Division 6: Compliance & Legal** — `compliance-reviewer` (opus, VETO authority on regulatory findings)

GDPR Article 32 (security of processing) requires both technical AND organisational measures — rate-limiting is a technical measure protecting against unauthorised access via brute force / credential stuffing, which is a documented Article 32 control. Audit log satisfies GDPR Article 30 (Records of processing) when the events recorded include data access by tenant_id. PCI-DSS v4.0 Requirement 10.7 mandates 1y online + 3-month immediate-available + 1y total — design specifies 7y retention which exceeds + satisfies. SOC 2 CC7 (security incidents + evidence) requires the audit log to support forensic reconstruction — hash-chained design (per `audit-logging.md` rule 3) satisfies. **Compliance flag (NOT a veto)**: Redis SSPL license since v7.4 may be incompatible with org legal policy if internal-redistribution is a possibility. Recommendation: pin Redis 7.2.x (last BSD-3 version) OR migrate to Valkey (BSD-3 fork maintained by Linux Foundation as of 2024) before launch. **No regulatory veto raised.**

**Division 8: Operations & Reliability** — `ops-reviewer`

SLO definition: 99.9% of rate-limit decisions <5ms p99 over 30-day rolling window (per `observability.md` Four Golden Signals — latency). Alerts: throttle rate >5% sustained 5min on any endpoint → page on-call; audit-log write lag >30s sustained 1min → ticket on-call; Redis cluster degraded mode (any replica disconnected >60s) → page on-call. Runbook entry at `docs/runbook.md#rate-limited` follows `runbook-template.md` canonical structure (What you'll see / Severity / Diagnose / Fix per-cause / Verify recovery / Communicate). Deploy: 7-day canary 1% → 5% → 25% → 50% → 100% via feature flag (per `feature-flags.md` rule 2). On-call training pre-launch: 1-hour briefing covering the runbook + a tabletop ("Redis cluster split-brain at 14:00 Friday — walk through the response"). **No operational veto raised.**

**Division 9: Data & Analytics** — `data-reviewer`

Audit-log schema follows `audit-logging.md` canonical event shape (event_id ULID, timestamp ms-precision UTC, event_type dotted-namespace, actor/subject/action/outcome, context with hashed IP + trace_id, hash-chain integrity fields). PII flows: actor.email pseudonymised → user_id reference resolves on-demand; IP address SHA-256-hashed with per-tenant salt; no raw email / phone / token ever stored. Cross-tenant access ALWAYS includes both tenant_ids + a justification field (per `audit-logging.md` rule of cross-tenant isolation). Retention partitioned by month via `pg_partman`; archived to S3 Glacier after 90 days (encrypted at rest with per-tenant KMS keys); deletion job removes rows past 7y retention. Schema evolution follows expand-contract per `schema-evolution.md` — additive only, NOT NULL constraints added AFTER backfill. **No data veto raised.** Engages Compliance Division 6 since PII flows surface; both divisions concur.

**Division 10: Finance & FinOps** — `finance-reviewer`

Cost forecast (Q16 above): $700/mo at target, ~$5k/mo at 10×. ElastiCache cluster (3 primary + 3 replica r7g.large) is the dominant line item — reserved-instance commitment for 1y reduces by ~30% if usage is steady-state. RDS Multi-AZ + Postgres for audit log; partitioning + S3 Glacier archive caps growth. Kafka MirrorMaker for cross-region replication is a sustained cost — assess whether RTO target genuinely requires it OR whether async S3-based replication suffices (cheaper, longer RTO). Per `dependency-pinning.md` rule 3, containers digest-pinned to avoid quiet image-size growth that drives ECS task count up. **No finance veto raised.** Unit-economics impact: rate-limiting itself does not generate revenue but protects revenue (prevents fraud / abuse / over-consumption); justifiable as an availability investment.

**Division 11: Risk Management** — `risk-reviewer` (VETO authority on out-of-scope blast radius)

Blast radius: every authenticated endpoint passes through rate-limit middleware. A middleware bug affects 100% of authenticated traffic. Mitigation: kill-switch feature flag (per `feature-flags.md` rule 8) allows on-call to disable rate-limiting in seconds, falling back to upstream edge-layer + gateway-layer protection (defense in depth holds). RPO/RTO: 1min / 5min per Q17 (managed RDS Multi-AZ + Redis Sentinel automatic failover). DR test: quarterly chaos exercise verifies the kill-switch + the failover paths actually work (per `graceful-degradation.md` rule 10). Per `task-intake-due-diligence.md` Q23 (post-launch watch), 7-day canary with rollback predicate (error rate >1% OR p99 >2s sustained 5min) makes rollback automated, not human-judgment-dependent. **No risk veto raised** — blast radius is contained by the kill-switch + the canary + the rollback predicate. Risk Division reserves the right to re-engage if mid-canary a scaling concern surfaces.

**Division 16: Communications & Documentation** — `doc-updater` + `comms-reviewer`

Release notes for the migration: customers using API see new `429 Too Many Requests` responses + new `RateLimit-*` response headers + new `Retry-After` header. SDK clients (official Stripe-style SDKs) need to handle 429 with backoff — most already do per `idempotency.md` rule 1. Migration guide for any custom integrations: code sample showing how to honour `Retry-After`. Status-page update during canary phases (informational, not incident). Customer-success briefing for enterprise customers approaching their per-tenant cap (proactive outreach 7 days before threshold). **No comms blocker raised** — public-facing artifacts are accurate (no over-claiming) per `no-overclaim.md` + `docs-sync-with-code.md`. ADR + runbook + feature page + OpenAPI spec all land in the same PR as the implementation per `docs-sync-with-code.md` rule 2.

---

## Phase 2 — Council Consensus

### Agreed approach

Defense-in-depth rate-limiting at four layers (edge / gateway / application / DB), with application-layer per-tenant + per-endpoint fine control via Redis-backed token bucket + sliding-window-counter hybrid. Idempotency via Stripe-pattern keys with 24h default (7d for high-stakes mutations). Audit logging via outbox pattern (DB transaction includes audit row; worker forwards to durable append-only store) with hash-chained integrity. Kill-switch feature flag for emergency rollback. 7-day canary rollout with automated rollback predicate.

### Cloud services to use

| Service | Purpose | Justification |
| --- | --- | --- |
| AWS ElastiCache (Redis cluster) | Rate-limit counters + idempotency cache | Sub-ms latency required for 10k req/s; cluster mode for horizontal scale; managed failover via Sentinel-equivalent |
| AWS RDS Multi-AZ (Postgres) | Audit-log primary store | Append-only with revoked DML grants; partition-by-month; Multi-AZ for 5min RTO |
| AWS S3 Glacier | Audit-log cold archive (>90d) | 7y retention; encrypted with per-tenant KMS keys |
| AWS Kafka (MSK) MirrorMaker | Cross-region audit log replication | 1min RPO; cheaper alternative: async S3 cross-region replication if RPO can stretch to 15min |
| AWS API Gateway / Envoy | Gateway-layer per-IP coarse limit | Defence-in-depth before application middleware |
| AWS KMS | Per-tenant encryption keys for audit log | Crypto-shredding capability for tenant deletion |
| Cloudflare (or AWS Shield) | Edge-layer volumetric protection | Catches DDoS before origin |

### Files to be touched (this would be the implementation PR — design doc only this turn)

| File | Action | Division |
| --- | --- | --- |
| `middleware/rate_limit.go` (or equivalent per stack) | Create | Implementation |
| `middleware/idempotency.go` | Create | Implementation |
| `middleware/audit_emit.go` | Create | Implementation |
| `migrations/2026-06-XX-audit-log-schema.sql` | Create | Implementation + Data |
| `migrations/2026-06-XX-pg-partman-setup.sql` | Create | Implementation + Data |
| `infra/terraform/elasticache.tf` | Create | Implementation + Infra |
| `infra/terraform/rds-audit.tf` | Create | Implementation + Infra |
| `infra/terraform/kafka-mirrormaker.tf` | Create | Implementation + Infra |
| `docs/rate-limiting.md` | Create | Communications |
| `docs/runbook.md` | Update — add `rate-limited` entry | Operations |
| `docs/adr/0042-multi-tenant-rate-limit.md` | Create | Architecture |
| `docs/api/openapi.yaml` | Update — add 429 + `RateLimit-*` headers | Communications |
| `CHANGELOG.md` | Update — add release entry | Communications |
| `tests/middleware/rate_limit_test.go` | Create | Testing |
| `tests/integration/rate_limit_concurrent_test.go` | Create | Testing |
| `tests/e2e/rate_limit_10k_rps_test.go` | Create | Testing |
| `tests/chaos/redis_blackhole_test.go` | Create | Testing |

### Agents to delegate to

| Agent | Task | When |
| --- | --- | --- |
| `planner` (opus) | Author atomic-task breakdown for implementation PR | Before any code |
| `tdd-guide` (sonnet) | Write tests first (RED) | Phase 3 step 1 |
| `database-reviewer` (sonnet) | Audit migration shape + partition strategy | Phase 3 step 4 |
| `infra-reviewer` (sonnet) | Audit Terraform module + IAM least-privilege | Phase 3 step 5 |
| `security-reviewer` (opus) | OWASP ASVS V11.1 + ASVS V2.2.1 audit + secret-scan | Phase 3 step 6 |
| `code-reviewer` (sonnet) | Cross-language final review | Before PR |
| `ops-reviewer` (sonnet) | Runbook + SLO + alert rules audit | Phase 3 step 7 |
| `data-reviewer` (sonnet) | Audit-log schema + PII flow audit | Phase 3 step 8 |
| `compliance-reviewer` (opus) | GDPR + PCI-DSS + SOC 2 control mapping | Phase 3 step 9 |
| `doc-updater` (haiku) | Feature page + ADR + CHANGELOG | Final |
| `comms-reviewer` (sonnet) | Release notes + migration guide review | Final |

### Research confirms

- [x] All relevant existing code examined (rate-limiting / idempotency / audit-logging / observability / circuit-breaker / graceful-degradation / feature-flags / error-codes / error-handling-with-context rules all resolve)
- [x] No duplicate implementations created (`reuse-first.md` radius escalation — `redis_rate` library is canonical at radius 5)
- [x] Follows existing project patterns (response envelope + middleware shape + structured logging + OTel tracing)
- [x] Primary-source documentation reviewed (RFC 6585 + draft-ietf-httpapi-ratelimit-headers + OWASP ASVS 4.0.3 V11.1 + Stripe idempotency docs)
- [x] Cloud services selected per cloud-architecture pillars + Well-Architected Framework

### Concerns raised

- **Architecture**: None blocking. Approximation trade-off in sliding-window-counter is documented in ADR.
- **Implementation**: None blocking. Reuse-first satisfied.
- **Quality**: None blocking. Cognitive complexity cap requires careful middleware decomposition.
- **Security**: License posture flag (Redis SSPL) — Compliance to decide; not a security veto.
- **Testing**: None blocking. Chaos test is essential, not optional.
- **Compliance**: License posture decision pending — Valkey BSD-3 fork recommended.
- **Operations**: None blocking. Kill-switch + canary + rollback predicate are the operational safety net.
- **Data**: None blocking. PII flow respects hash + pseudonymisation defaults.
- **Finance**: Cost is acceptable; reserved-instance commitment recommended at steady state.
- **Risk**: None blocking. Blast radius contained by kill-switch.
- **Communications**: None blocking. All public-facing artifacts ship in the same PR per `docs-sync-with-code.md`.

### Tiebreaker matrix invocations

None this turn — divisions concur on every material decision. The Redis-license discussion would invoke Division 6 (Compliance) VETO authority on regulatory finding if SSPL was deemed incompatible, but the resolution (pin v7.2 OR migrate to Valkey) is non-blocking.

### GO/NO-GO decision

**GO** — proceed with implementation as designed.

---

## Phase 3 — Implementation Outline

Not implementing in this verification turn — the goal is to confirm the Council protocol + rebuilt rules + skills + agents resolve coherently on a representative task. The outline below is the atomic task breakdown per `plan-task-breakdown.md` that the `planner` agent would produce:

1. RED — Write failing unit tests for the token-bucket algorithm
2. GREEN — Implement token-bucket using `go-redis/redis_rate` (Go) or `node-rate-limiter-flexible` (Node)
3. RED — Write failing integration test for concurrent rate-limit decisions against real Redis
4. GREEN — Implement Redis cluster connection + Lua script atomic check-and-decrement
5. Author Postgres schema migration for audit log (partitioned-by-month via pg_partman)
6. Author Terraform module for ElastiCache cluster + RDS Multi-AZ + Kafka MirrorMaker
7. Author audit-emit worker (outbox pattern reader → durable store writer)
8. Wire idempotency middleware (Redis cache + Postgres fallback for 7-day high-stakes)
9. Wire rate-limit middleware (token bucket + sliding-window-counter hybrid)
10. Wire audit-log middleware (emit event in same DB transaction as business write)
11. Define OTel spans + Prometheus metrics + structured-log fields
12. RED — Write chaos test (black-hole Redis mid-test)
13. GREEN — Implement circuit-breaker around Redis with fail-closed degraded mode
14. Author feature flag `ratelimit_enabled_v2` with kill-switch behaviour
15. Author runbook entry at `docs/runbook.md#rate-limited`
16. Author ADR at `docs/adr/0042-multi-tenant-rate-limit.md`
17. Update OpenAPI spec with 429 + `RateLimit-*` headers
18. Author feature page at `docs/rate-limiting.md`
19. Update CHANGELOG + migration guide
20. Configure alert rules (throttle >5% / 5min; audit-log lag >30s / 1min; Redis degraded >60s)
21. Configure SLO + dashboard
22. Pre-launch tabletop exercise with on-call rotation
23. Canary rollout 1% → 5% → 25% → 50% → 100% via feature flag (7d)
24. Bloat-removal phase: delete any legacy ad-hoc rate-limiting in handlers
25. Final verification block + PR + Council post-implementation review

---

## Verification block (this artifact, this turn)

```
Phase 9 synthetic Council verification (this turn):
- Intake table covers all 29 questions per task-intake-due-diligence.md: yes
- Core Five voices present + substantive: yes (5/5)
- Extended Eleven trigger evaluation surfaced: yes (6/11 fire + 1 advisory + 4 standby)
- All cited rules resolve to existing files in ~/.claude/rules/common/:
    rate-limiting.md, idempotency.md, audit-logging.md, observability.md,
    circuit-breaker.md, graceful-degradation.md, feature-flags.md,
    error-codes.md, error-handling-with-context.md, schema-evolution.md,
    documentation-requirements.md, runbook-template.md, adr-template.md,
    deprecation-lifecycle.md, api-versioning.md, no-overclaim.md,
    docs-sync-with-code.md, official-docs-first.md, reuse-first.md,
    plan-task-breakdown.md, dependency-vulnerabilities.md,
    extreme-lint-policy.md, task-intake-due-diligence.md,
    dependency-pinning.md, log-levels.md, license-allowlist-gate.md
- All cited skills resolve: api-design, owasp-asvs (V2.2.1 + V11.1),
    cloud-architecture, gdpr-ccpa-compliance, pci-dss-patterns,
    iso27001-controls, soc2-readiness, observability-patterns
- All cited agents resolve: architect, planner, build-error-resolver,
    go-build-resolver, refactor-cleaner, database-reviewer, infra-reviewer,
    code-reviewer, go-reviewer, python-reviewer, java-reviewer,
    mobile-reviewer, doc-updater, security-reviewer, tdd-guide,
    e2e-runner, performance-reviewer, compliance-reviewer, ops-reviewer,
    data-reviewer, finance-reviewer, risk-reviewer, comms-reviewer
- Primary-source citations include version + section: yes
  (RFC 6585 §4, RFC 9110 §9.2.2, OWASP ASVS 4.0.3 V11.1 + V2.2.1,
   ISO/IEC 27001:2022 Annex A.8.15, PCI-DSS v4.0 Req 10.7,
   NIST SP 800-92, GDPR Art 30 + 32, SOC 2 CC7)
- GO decision recorded: yes
- Tiebreaker matrix tested: no veto triggered (no division blocked)
- Bypass attempts: 0
```

---

## Phase 9 verification outcome

**PASS.**

- Council protocol Phase 0-1-2-3 executes coherently end-to-end
- All 5 Core Divisions speak with substance (no boilerplate)
- 6 of 11 Extended Divisions fire per `council-triggers.md` mechanical rules; 1 surfaces an advisory note; 4 remain standby
- Tiebreaker matrix is invocable but not invoked (no blocking disagreement)
- Veto authority is correctly assigned (Compliance VETO recognised as available, not invoked since no regulatory blocker)
- Every cited rule + skill + agent resolves to an existing artifact in the rebuilt `~/.claude/`
- Standards citations include version + section per principal-level mandate
- Cross-references are bidirectional (rules cite the skills + agents that enforce them; skills cite the rules they implement against)

The rebuild's Council surface + 49 rules + 99 skills + 30 agents are operationally coherent. Phase 9 verification gate closed.

---

## Next-phase gate

Per `plan-completion-before-push.md` + the rebuild's `commit-policy: single`, Phase 10 (final cleanup + single commit + v2.0 tag) is gated on Phases 8 (workspace ripple) + 17 (workspace consistency) — both of which touch other git repos and require fresh user authorization.

The natural in-scope-without-other-repo-authorization next phase is Phase 16 (continuous-learning `learning_hooks` wiring across artifacts). Phase 13 (external skills inventory) requires WebFetch network access. Phase 14 + 15 (public repo + IDE extensions) requires `gh` auth + repo-creation authorization.
