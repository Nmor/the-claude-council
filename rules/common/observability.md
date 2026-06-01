# Observability Rule (Always-On, Global)

> Auto-fires on every file. Sister to `error-handling-with-context.md`
> (structured logging shape), `no-silent-failures.md` (every
> failure visible to operators), `security.md` A09 (logging
> failures = OWASP risk), `task-intake-due-diligence.md` Q15
> (observability shape planned in intake).
> Standards: **OpenTelemetry**, **CloudWatch Embedded Metric
> Format (EMF)**, **W3C Trace Context** (`traceparent`),
> **OpenMetrics**, **Google SRE workbook** (Four Golden Signals).

## Core Principle

**Every code path that runs in production emits structured
signals (logs, metrics, traces) that let operators answer
three questions WITHOUT reading the source code: (1) is the
system healthy, (2) is the user being served, (3) what just
broke and why? Code without observability is a black box;
production incidents become guesswork.**

## Hard rules

### 1. Three pillars are all required

| Pillar | Purpose | Tooling |
| --- | --- | --- |
| **Logs** | What happened | Structured JSON, sent to stdout/stderr; collected by CloudWatch / Loki / Datadog Logs |
| **Metrics** | How often + how fast | EMF / OpenMetrics / OTLP — counters, gauges, histograms |
| **Traces** | What's the call path | OTel spans across every external call; W3C `traceparent` propagated |

A code path with only logs (no metrics) is unalertable. A code
path with only metrics (no logs) is undebuggable. A code path
with no traces in a multi-service architecture is unwalkable.

### 2. Logs are structured, never freeform

Every log entry is JSON with these required fields:

```jsonc
{
  "timestamp": "2026-05-26T11:32:45.123Z", // ISO 8601, UTC
  "level": "error",                         // error / warn / info / debug
  "message": "<short operation-named description>",
  "service": "<service name>",
  "version": "<git sha or release tag>",
  "environment": "production | staging | dev",
  "request_id": "<UUID>",                   // correlation across services
  "trace_id": "<W3C trace-id>",
  "span_id": "<W3C span-id>",
  "user_id": "<id when in user context>",
  "organization_id": "<id when in tenant context>",
  "error_code": "<stable code per error-handling-with-context.md>",
  "error": "<wrapped chain via err.toString() / String(err)>",
  "duration_ms": 123,                       // for timed operations
  "<domain-fields>": "<context>"            // resource ids, sizes, etc.
}
```

Per `error-handling-with-context.md` rule 2, request-scoped
fields (`request_id`, `user_id`, etc.) are auto-stamped from
AsyncLocalStorage / context.Context / `traceparent`. The
handler doesn't thread them manually on every log call.

### 3. Metric naming follows the canonical form

```
<service>_<operation>_<unit>{tag1="value1",tag2="value2"}
```

Examples:

```
auth_login_duration_seconds{provider="google",result="success"}
payment_charge_total{currency="usd",result="declined"}
webhook_event_processing_duration_seconds{provider="stripe",event="invoice.paid"}
```

Rules:

- **snake_case** for metric names + tags
- **Unit in the suffix**: `_seconds`, `_bytes`, `_count`, `_total`, `_ratio`
- **High-cardinality tags ARE BANNED**: never put `user_id`,
  `email`, `request_id`, free-form strings as a tag (it
  explodes cardinality + costs $$$)
- **Histograms over averages**: emit `_bucket` + `_sum` +
  `_count` so p50 / p95 / p99 are computable

### 4. The Four Golden Signals are mandatory on every service

Per Google SRE book — every long-running service exports:

| Signal | What it measures | Alert trigger |
| --- | --- | --- |
| **Latency** | p50 / p95 / p99 request duration | Sustained p99 > SLO threshold |
| **Traffic** | Requests per second / events per second | Drop > 50% from baseline (probable outage) |
| **Errors** | Rate of failed requests (HTTP 5xx, exception count) | Error rate > 1% sustained 5 min |
| **Saturation** | How "full" is the service (CPU, memory, connection pool, queue depth) | Utilisation > 80% sustained 10 min |

For Lambda / serverless, add:

| Signal | Alert trigger |
| --- | --- |
| **Cold start rate** | > 10% sustained (means concurrency under-provisioned OR memory misconfigured) |
| **Throttle count** | > 0 sustained (hit account / function concurrency limit) |
| **Iterator age** (streams) | > 60s sustained (consumer falling behind) |

### 5. Traces propagate across every external call

When service A calls service B:

1. Service A's handler creates a span (`http.client`,
   `db.query`, `cache.get`, etc.).
2. Service A injects the `traceparent` header into the
   outbound request.
3. Service B's handler extracts `traceparent` + creates a
   child span linked to A's trace.
4. Both spans share the same `trace_id`; B's `parent_id`
   = A's `span_id`.

Without propagation, distributed traces look like disconnected
trees — you can't follow a user request across services.

### 6. Log levels carry SLO + cost implications

| Level | Use for | Production filter |
| --- | --- | --- |
| **error** | Genuine handler failures (alert-page-on) | Always logged + alerted |
| **warn** | Recoverable failures, audit-worthy denials, transient retries | Always logged; aggregated for trends |
| **info** | Non-failure lifecycle events (audit-action-committed, service-started) | Always logged |
| **debug** | Diagnostic detail useful in incident review | Off in production by default; toggle on per-request via `?debug=1` header (with auth) |

`error` and `warn` cost more (alerts, dashboards, ingestion
volume) — don't downgrade real `error` to `info` to save cost;
fix the underlying issue.

### 7. PII never lands in logs / metrics / traces

Per `security.md` A09 + GDPR / CCPA:

- **Email**: hash for cardinality (`sha256(email)[:12]`); never
  log the plain address
- **Phone**: same — hash, never plain
- **Names**: never logged
- **Passwords / tokens / API keys**: ABSOLUTELY never; the
  PostToolUse `no-discards` hook blocks edits introducing
  hardcoded creds in source
- **Request bodies**: NEVER logged in full; if needed, log
  a sanitized subset with PII fields stripped / hashed
- **IP addresses**: GDPR-classified PII in EU; hash or
  truncate (zero the last octet for IPv4 / last 80 bits for
  IPv6) when logging-for-analytics
- **Authorization headers**: never logged

A linter / pre-commit gate that grep's for these patterns in
log calls is mandatory per `extreme-lint-policy.md`.

### 8. Alerts are SLO-driven, not heuristic

Every service publishes an SLO (e.g., "99.5% of requests <
500ms p95 over 30 days"). Alerts fire when:

- **Error budget burn rate > 14×** (1h alert) — page on-call
- **Error budget burn rate > 6×** (6h alert) — ticket on-call
- **SLO breached** (30d window) — engineering review

Heuristic alerts ("CPU > 80%", "any 5xx") cause alert fatigue.
SLO-driven alerts fire on user-impacting issues only.

### 9. Every metric + log + trace is correlatable via request_id

The pattern: when on-call sees a failed request, they paste
the `request_id` into a single query and see:

- The log entries from every service touched
- The trace spans for the request
- The metric tags for that request's path

Without correlation, debugging is a multi-tab guess. With it,
incidents resolve in minutes instead of hours.

### 10. Observability code is reviewed like product code

Logging / metrics / tracing code is NOT "infrastructure" —
it's part of the product:

- Same lint gates apply (per `extreme-lint-policy.md`)
- Same reuse-first rule applies (per `reuse-first.md`): one
  logger, one metric emitter, one tracer config; no parallel
  implementations
- Same test coverage applies (per `testing.md`): the logger
  module has unit tests; the metric emitter is tested for
  high-cardinality regression

## Per-platform conventions

### AWS Lambda

- **Logs**: stdout → CloudWatch Logs
- **Metrics**: EMF (Embedded Metric Format) inline in log lines
- **Traces**: X-Ray (AWS native) or OTel via Lambda extension

```typescript
// EMF example
log.info({
  _aws: {
    Timestamp: Date.now(),
    CloudWatchMetrics: [{
      Namespace: "MyService",
      Dimensions: [["service", "operation", "result"]],
      Metrics: [{ Name: "duration", Unit: "Milliseconds" }],
    }],
  },
  service: "auth",
  operation: "login",
  result: "success",
  duration: 123,
  request_id: ctx.awsRequestId,
});
```

### Kubernetes / long-running services

- **Logs**: stdout → kubectl logs / Fluentd / Loki
- **Metrics**: Prometheus exporter on `/metrics`
- **Traces**: OTel SDK → OTel Collector → Jaeger / Tempo /
  Honeycomb

### Containers (any orchestrator)

- Health endpoint at `/healthz` (liveness) + `/readyz`
  (readiness)
- Metrics endpoint at `/metrics`
- Build info exposed at `/version` or `/build-info` (commit
  SHA, build timestamp)

## Cross-references

- `error-handling-with-context.md` rule 2 — structured logging
  fields (matches this rule's required field set)
- `no-silent-failures.md` — every failure produces all three
  pillars (log + metric + typed response)
- `security.md` A09 — observability is OWASP Top 10 #9
- `task-intake-due-diligence.md` Q15 — observability shape
  planned in intake
- `done-criteria.md` — observability gates are part of every
  "done" claim
- `extreme-lint-policy.md` — observability code lint clean
- `observability-patterns` skill — implementation patterns +
  EMF + OTel examples

## Standards cited

- **OpenTelemetry Specification 1.x** — traces + metrics + logs
- **CloudWatch Embedded Metric Format** (AWS)
- **W3C Trace Context** — `traceparent` + `tracestate` headers
- **OpenMetrics 1.0** (RFC pending) — Prometheus-compatible
- **Google SRE workbook** — Four Golden Signals (Latency,
  Traffic, Errors, Saturation)
- **The USE Method** (Brendan Gregg) — Utilisation, Saturation,
  Errors per resource

## Why this rule exists

Without observability, incidents take 5-50× longer to resolve.
Every minute of mean-time-to-resolution costs customer trust +
revenue + on-call sanity. The cost of observability at write
time is one log line + one metric emit + one trace span per
operation. The cost of debugging without it is hours of
log-grepping in a multi-service ball of yarn.

This rule + `error-handling-with-context.md` + `security.md`
A09 form the observability triad that every service ships
with.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Incident takes > expected MTTR because traces / logs / metrics weren't correlated (rule 9 weakening)
- Alert fires on heuristic threshold instead of SLO breach (rule 8 weakening — alert fatigue)
- High-cardinality tag attached to a metric (rule 3 violation — cost explosion)
- Trace propagation broken across a service boundary (rule 5 weakening — disconnected traces)
- Four Golden Signals missing on a long-running service (rule 4 weakening)
- PII surfaces in a log entry / metric tag (rule 7 violation; per `security.md` A09)
- Log volume budget exceeded (cost discipline weak — needs gate)
- New platform (Lambda / K8s / etc.) shipped without its required signal set

**Refinement candidates**:
- New row in the required-field schema when a context dimension proves load-bearing in production debugging
- New Golden-Signal entry when a recurring class of failure (cold start, throttle, iterator age) needs its own metric
- Tightening of the "no PII in logs" linter when new PII shapes surface
- New cross-reference when a sister rule (log-levels, error-handling-with-context) defines the shape the pillar depends on
