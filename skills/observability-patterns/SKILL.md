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

Logs, metrics, and traces are how production speaks back to you. The patterns
here keep that signal high without ballooning cost or PII surface area.

## When to Activate

- Authoring or reviewing a handler / worker / middleware
- Adding a new metric or log line
- Diagnosing a production incident from CloudWatch / Datadog / Honeycomb
- Onboarding a new service to the org's observability stack
- Auditing for secret-in-logs leakage

## Three Pillars, Picked Deliberately

| Pillar | Strength | When to lean on it |
| ------ | -------- | ------------------ |
| Structured logs | Cheap, easy to grep, free-form | The default; covers 80% of debugging |
| Metrics (EMF / Prometheus / OTEL) | Aggregate, cardinality-cheap, alerting source-of-truth | SLO tracking, dashboards, paging |
| Distributed traces | Request-flow visibility across services | Multi-service latency root-cause |

Don't ship all three uniformly — you'll pay 3x for marginal lift on the
last one. Logs everywhere, metrics on the boundary you alert on, traces
on the critical user-path.

## Structured Logs Always

The line `console.log("user " + id + " did " + action)` is unparsable at
scale. Emit JSON and let the log platform index by field:

```ts
log.info("user_action", {
  user_id: userId,
  organization_id: orgId,
  action: "create_task",
  request_id: ctx.requestId,
  duration_ms: Date.now() - start,
});
```

A logger lib (Pino, Winston, AWS Lambda Powertools) does the JSON serialization,
sets log level, and respects an environment-level minimum level. Don't roll
your own — they get edge cases right (circular refs, BigInt, Error objects).

## Per-Request Correlation IDs

Every log line emitted while handling one request must carry the same
`request_id` (and `organization_id` / `user_id` if multi-tenant). Without it
you cannot reconstruct what one request did when CloudWatch interleaves N
parallel invocations.

Pattern: a request-scoped middleware stores `{ request_id, organization_id, user_id }`
in `AsyncLocalStorage` (Node) / `context.Context` (Go) / `request.state` (Python).
Every log call pulls from that store. The handler doesn't pass it explicitly;
it's ambient.

```ts
// observabilityMiddleware.ts
const als = new AsyncLocalStorage<RequestContext>();

export function withObservability(handler: Handler): Handler {
  return async (event, ctx) => {
    const requestId = event.requestContext?.requestId ?? randomUUID();
    return als.run({ requestId, ...resolveAuth(event) }, () => handler(event, ctx));
  };
}

export function logInfo(msg: string, meta: object = {}) {
  console.log(JSON.stringify({ level: "info", msg, ...als.getStore(), ...meta }));
}
```

## Don't Log Secrets — Or PII By Default

The single fastest way to leak credentials is a stack trace that includes
the request body. Defenses, in order:

1. **Allowlist** — log only fields you explicitly include. `log.info("event", { user_id, action })` is safe; `log.info("event", { req: req })` is not.
2. **Redact** — if you must log a body, run it through a redactor that masks
   any field matching `password`, `token`, `secret`, `key`, `authorization`,
   `card_number`, `ssn`, etc.
3. **Periodic scan** — a weekly CloudWatch Logs Insights query for
   `^(sk_live_|xoxb-|AKIA|Bearer eyJ)` is the floor. Hits page on-call.

PII (email, phone, name) deserves the same care for GDPR / HIPAA scope.
Use hashed identifiers in logs (`sha256(email)[:8]`) when you only need
"is this the same user?" not "who is this user?".

## EMF Metrics: Free On Lambda

CloudWatch Embedded Metric Format lets a Lambda emit metrics by writing
JSON to stdout. No SDK call, no IAM permission, no latency cost.

```ts
console.log(JSON.stringify({
  _aws: {
    Timestamp: Date.now(),
    CloudWatchMetrics: [{
      Namespace: "MyApp",
      Dimensions: [["organization_id", "endpoint"]],
      Metrics: [
        { Name: "RequestDuration", Unit: "Milliseconds" },
        { Name: "RequestCount", Unit: "Count" },
      ],
    }],
  },
  organization_id: orgId,
  endpoint: "POST /api/tasks",
  RequestDuration: durationMs,
  RequestCount: 1,
}));
```

CloudWatch parses the `_aws` envelope and indexes the metric by the
declared dimensions. The same line is also a structured log — one write,
two consumers.

## Cardinality Discipline

Metric cost scales with **unique combinations of dimensions × metric names**.
A dimension on `user_id` blows up to millions; a dimension on `organization_id`
is bounded by tenant count. Rules:

- High-cardinality dimensions (`user_id`, `request_id`, `task_id`) → logs only
- Low-cardinality dimensions (`organization_id`, `cell_id`, `endpoint`, `status_code`) → metrics
- Bucket continuous values (`duration_ms` → `latency_bucket: "p50" | "p99"`) before they become a dimension
- Audit weekly: a dashboard "top 20 dimensions by series count" surfaces a runaway

A free-tier CloudWatch account has bitten teams that dimensioned by
`request_id` — their first month's bill was four figures.

## SLO-Aligned Metrics, Not Vanity Metrics

A metric exists to drive a decision. Decision-driving metrics roll up to
SLOs (availability, latency, error rate, saturation). Vanity metrics
(uptime%, total requests) feel useful but rarely answer "should I page?".

Pick four golden signals per service:

1. **Latency** (`http_request_duration_seconds`) — p50 / p99 by endpoint
2. **Traffic** (`http_requests_total`) — req/sec by endpoint
3. **Errors** (`http_errors_total`) — by `status_code` and `error_class`
4. **Saturation** (`worker_queue_depth`, `db_pool_inuse`) — backpressure leading indicator

Everything else is a log query, not a metric.

## Tracing: Use OpenTelemetry If You Have It

If the org runs OTEL / Datadog APM / Honeycomb / X-Ray, propagate the
trace context (`traceparent` header). The default instrumentation libs
(`@opentelemetry/auto-instrumentations-node`, `aws-xray-sdk-core`) wire
into HTTP / DB / SDK calls automatically — your job is to:

- Initialize the tracer once at module scope
- Attach business context to the active span (`span.setAttribute("organization_id", orgId)`)
- Don't create spans by hand inside hot loops — the auto-instrumentation
  already covers IO; manual spans should be reserved for "this whole
  business transaction" (e.g. `processWebhook`).

## Alarm Discipline: Alarm On Symptoms, Not Causes

Page on what the user sees:

- ✅ "Error rate > 5% for 5 minutes" (symptom)
- ✅ "p99 latency > 2s for 5 minutes" (symptom)
- ❌ "DDB throttling > 0" (cause — alarm if it's load-bearing, otherwise it's a log)
- ❌ "CPU > 80%" (cause — only matters if it correlates with latency)

Cause alarms are useful for diagnostics, not for waking someone at 3 AM.
A noisy alarm policy makes on-call ignore real pages. One alarm fired
incorrectly is more damaging than ten missed cause-alarms.

## Common Smells

| Smell | Fix |
| ----- | --- |
| `console.log("foo " + bar)` | Structured JSON or a logger lib |
| Logging the full request body | Allowlist + redact |
| Metric dimensioned by `user_id` / `request_id` | Move to logs; bucket if needed |
| `console.error(err)` (loses stack + context) | `log.error("op-failed", { error: err.message, stack: err.stack, ...ctx })` |
| Trace-id absent from logs | Inject `request_id` via request-scoped middleware |
| Alarm on CPU instead of error rate | Alarm on the symptom users observe |
| No `OK` action on alarms | `OKActions = AlarmActions` so resolution silences pagers |
| Free-form log message → grep doesn't work | Structured field instead of a sentence |

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
- New external call without a metric (latency / error-rate / throughput) — Four Golden Signals weakening
- Alarm fires on CPU / memory instead of error rate / SLO burn rate (heuristic-alert anti-pattern)
- New SLO declared without alert routing + runbook entry
- Sensitive data appearing in log lines (PII / token / password — A09 violation)
- EMF dimension cardinality explosion (high-cardinality field used as dimension)
- DEBUG enabled globally in production (cost + signal-loss anti-pattern)
- New service ships without `/healthz` + `/readyz` + `/metrics` + `/version` endpoints
- Trace span missing on a cross-service call (W3C trace-context propagation weakening)

**Refinement candidates**:

- New metric template when a new handler class emerges (e.g., webhook handler, scheduled job, stream consumer)
- New alarm template when a new failure class is observed in production
- New cross-reference when a sister rule / skill (log-levels, audit-logging, runbook-template, error-handling-with-context) gains an observability gate
- Tightening of the structured-field set when a new correlation id becomes useful (e.g., feature-flag variant, cell-id, region)

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/observability.md`

---

<!-- ============================================================
     Section: observability.md (from rules/common/)
     ============================================================ -->

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

```text
<service>_<operation>_<unit>{tag1="value1",tag2="value2"}
```

Examples:

```text
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

---
