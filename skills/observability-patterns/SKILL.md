---
name: observability-patterns
description: Structured logging, EMF metrics, request-id propagation, per-tenant dimensions, and CloudWatch / OTEL conventions for serverless and long-running services. Auto-fires for handler files, lib code, and middleware where logs / metrics are emitted. Also lazy-loads observability.md content migrated from rules/common/ on 2026-06-02.
paths:
  - "**/handlers/**"
  - "**/handler.*"
  - "**/middleware/**"
  - "**/lib/**"
  - "**/logging/**"
  - "**/logger.*"
  - "**/logs/**"
  - "**/metrics/**"
  - "**/observability/**"
  - "**/telemetry/**"
  - "**/tracing/**"
  - "**/otel*"
  - "**/opentelemetry*"
  - "**/prometheus*"
  - "**/datadog*"
  - "**/grafana*"
  - "**/cloudwatch*"
  - "**/alerts*"
  - "**/runbook*"
---

# Observability Patterns

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`

Logs, metrics, and traces are how production speaks back to you. The patterns
here keep that signal high without ballooning cost or PII surface area.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Three Pillars, Picked Deliberately | [`references/three-pillars-picked-deliberately.md`](references/three-pillars-picked-deliberately.md) |
| Structured Logs Always | [`references/structured-logs-always.md`](references/structured-logs-always.md) |
| Per-Request Correlation IDs | [`references/per-request-correlation-ids.md`](references/per-request-correlation-ids.md) |
| Don't Log Secrets — Or PII By Default | [`references/don-t-log-secrets-or-pii-by-default.md`](references/don-t-log-secrets-or-pii-by-default.md) |
| EMF Metrics: Free On Lambda | [`references/emf-metrics-free-on-lambda.md`](references/emf-metrics-free-on-lambda.md) |
| Cardinality Discipline | [`references/cardinality-discipline.md`](references/cardinality-discipline.md) |
| SLO-Aligned Metrics, Not Vanity Metrics | [`references/slo-aligned-metrics-not-vanity-metrics.md`](references/slo-aligned-metrics-not-vanity-metrics.md) |
| Tracing: Use OpenTelemetry If You Have It | [`references/tracing-use-opentelemetry-if-you-have-it.md`](references/tracing-use-opentelemetry-if-you-have-it.md) |
| Alarm Discipline: Alarm On Symptoms, Not Causes | [`references/alarm-discipline-alarm-on-symptoms-not-causes.md`](references/alarm-discipline-alarm-on-symptoms-not-causes.md) |
| Common Smells | [`references/common-smells.md`](references/common-smells.md) |
| observability (migrated rule) | [`references/observability.md`](references/observability.md) |

## When to Activate

- Authoring or reviewing a handler / worker / middleware
- Adding a new metric or log line
- Diagnosing a production incident from CloudWatch / Datadog / Honeycomb
- Onboarding a new service to the org's observability stack
- Auditing for secret-in-logs leakage

## Skill Chain

1. **observability-patterns** — this skill
2. **aws-serverless-patterns** — Lambda-specific log / metric quirks
3. **deployment-patterns** — alarms wired to SNS / PagerDuty
4. **security-review** — secret-in-logs scanning, PII handling

## Purpose

Principal-level observability: the three pillars (logs, metrics,
traces) with W3C trace-context propagation, OpenTelemetry semantic
conventions, structured logging with correlation ids, RED + USE +
Four Golden Signals dashboards, SLO + error-budget arithmetic,
alerting on burn-rate not raw thresholds, log-level discipline,
CloudWatch EMF for serverless cost control, exemplar linking from
metrics to traces, and the PII-redaction + retention discipline
that keeps observability legal.

**Negative scope** (NOT what this skill covers):

- Application performance tuning (the analysis after observation)
- Business analytics (out — see `clickhouse-io`)
- Audit logging (different retention + integrity contract — see
  `~/.claude/rules-library/common/audit-logging.md`)
- Browser RUM specifics — touched but not the core focus

## When NOT to use

- Single-developer hobby projects with no on-call
- Pure offline batch processes where progress logs to stdout suffice
- Throwaway scripts run once on a workstation

## Standards Cited

- **OpenTelemetry Specification v1.x** (opentelemetry.io) — traces,
  metrics, logs, propagation
- **W3C Trace Context** (w3.org/TR/trace-context/) — `traceparent`
  - `tracestate` headers
- **W3C Baggage** (w3.org/TR/baggage/) — user-context propagation
- **OTel Semantic Conventions** — http.*, db.*, messaging.*
- **OpenMetrics** (RFC pending) — Prometheus-compatible exposition
- **SRE Workbook (Google, O'Reilly 2018)** — SLO arithmetic,
  burn-rate alerting, Four Golden Signals
- **The USE Method (Brendan Gregg)** — Utilisation, Saturation, Errors
- **The RED Method (Tom Wilkie)** — Rate, Errors, Duration
- **`~/.claude/rules-library/common/observability.md`** — global mandate
- **`~/.claude/rules-library/common/log-levels.md`** — canonical level taxonomy
- **`~/.claude/rules-library/common/error-handling-with-context.md`** —
  structured log fields on every failure
- **NIST SP 800-92** — log management guide
- **OWASP ASVS 4.0.3 §7 (Error Handling + Logging)**

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `console.log("got request")` | Unstructured, ungreppable | Structured logger with fields |
| Log level threshold = DEBUG in production | Ingestion cost explodes, signal-to-noise floor | INFO+ in prod; flip per-request via header w/ auth |
| `log.error("failed")` with no fields | Cannot correlate; cannot filter | Include `error_code`, `request_id`, `trace_id`, operation, ids |
| Single `latency` metric without tags | Cannot partition by endpoint / tenant / outcome | `request_duration_seconds{method, route, status}` |
| Free-form message in alert subject | Cannot dedupe; cannot route | Stable alert name + tags |
| Alerting on raw threshold (CPU > 80%) | Fires on cosmetic spikes; alert fatigue | Burn-rate alert against SLO (multi-window multi-burn-rate) |
| No correlation id across services | Cannot reconstruct a request's path | W3C `traceparent` propagated end-to-end |
| Logging PII (email, full IP, cookie) | Privacy violation; GDPR exposure | Hash / truncate / redact at logger config; never raw |
| Logging credentials / tokens | Catastrophe on log breach | Logger redact paths + `no-discards` hook |
| One million metric tag values | Cardinality explosion → cost / latency | Drop high-cardinality dims (user_id, request_id) — those belong on traces |
| `OK` action on alarm not set | Pager stays lit after resolution | `OKActions = AlarmActions` so resolution silences |
| Distributed trace ends at service boundary | Cannot follow upstream cause | Inject `traceparent` on every outbound call |

## Verification Checklist

- [ ] Three pillars present (logs + metrics + traces)
- [ ] W3C `traceparent` propagated across every service boundary
- [ ] OTel SDK initialised at boot for every service
- [ ] Structured JSON logs with required fields (timestamp, level,
      service, version, request_id, trace_id, span_id)
- [ ] Log level discipline: ERROR reserved for alerting (per
      `log-levels.md`)
- [ ] No PII / secrets in logs (redaction paths configured)
- [ ] Four Golden Signals dashboard exists for every long-running
      service
- [ ] RED / USE method applied to per-handler / per-resource
- [ ] SLO defined for every customer-facing surface
- [ ] Burn-rate alerts (1h / 6h windows) wired to on-call
- [ ] Trace exemplars link from metrics to specific failing requests
- [ ] Metric cardinality monitored + capped
- [ ] Log retention matches regulatory requirement (per
      `data-retention.md`)
- [ ] Audit log is SEPARATE from operational log (per
      `audit-logging.md`)

## Cross-References

- `~/.claude/skills/aws-serverless-patterns/SKILL.md` — Lambda /
  EMF specifics
- `~/.claude/skills/deployment-patterns/SKILL.md` — SLO predicate
  for auto-rollback
- `~/.claude/rules-library/common/observability.md` — global mandate
- `~/.claude/rules-library/common/log-levels.md` — level taxonomy
- `~/.claude/rules-library/common/error-handling-with-context.md` — log
  fields on failure
- `~/.claude/rules-library/common/audit-logging.md` — separate audit stream
- `~/.claude/rules-library/common/data-retention.md` — retention per regulation
- `~/.claude/agents/ops-reviewer.md` — Council Division 8

## Why this skill exists

Without observability, on-call's first hour of every incident is
"where did this happen, what was being attempted, what were the
inputs" — answers that structured logs + traces + metrics provide
in seconds. The patterns above codify the production-ready posture:
W3C trace-context propagation, OTel semantic conventions,
SLO-driven alerts, burn-rate alarms, PII-redacted structured logs,
exemplar-linked traces. Teams that adopt these resolve incidents in
minutes; teams that don't pay for it in mean-time-to-resolution
and customer trust.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Free-form `console.log` / `console.error` in production handler (structured-logger weakening)
- Log line without `request_id` / `trace_id` / `user_id` / `tenant_id` correlation fields
- New external call without a metric (latency / error-rate / throughput) — Four Golden Signals
  weakening
- Alarm fires on CPU / memory instead of error rate / SLO burn rate (heuristic-alert anti-pattern)
- New SLO declared without alert routing + runbook entry
- Sensitive data appearing in log lines (PII / token / password — A09 violation)
- EMF dimension cardinality explosion (high-cardinality field used as dimension)
- DEBUG enabled globally in production (cost + signal-loss anti-pattern)
- New service ships without `/healthz` + `/readyz` + `/metrics` + `/version` endpoints
- Trace span missing on a cross-service call (W3C trace-context propagation weakening)

**Refinement candidates**:

- New metric template when a new handler class emerges (e.g., webhook handler, scheduled job, stream
  consumer)
- New alarm template when a new failure class is observed in production
- New cross-reference when a sister rule / skill (log-levels, audit-logging, runbook-template,
  error-handling-with-context) gains an observability gate
- Tightening of the structured-field set when a new correlation id becomes useful (e.g.,
  feature-flag variant, cell-id, region)

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the
lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/observability.md`

---
