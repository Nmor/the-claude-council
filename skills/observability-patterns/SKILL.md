---
name: observability-patterns
description: Structured logging, EMF metrics, request-id propagation, per-tenant dimensions, and CloudWatch / OTEL conventions for serverless and long-running services. Auto-fires for handler files, lib code, and middleware where logs / metrics are emitted.
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
  `~/.claude/rules/common/audit-logging.md`)
- Browser RUM specifics — touched but not the core focus

## When NOT to use

- Single-developer hobby projects with no on-call
- Pure offline batch processes where progress logs to stdout suffice
- Throwaway scripts run once on a workstation

## Standards Cited

- **OpenTelemetry Specification v1.x** (opentelemetry.io) — traces,
  metrics, logs, propagation
- **W3C Trace Context** (w3.org/TR/trace-context/) — `traceparent`
  + `tracestate` headers
- **W3C Baggage** (w3.org/TR/baggage/) — user-context propagation
- **OTel Semantic Conventions** — http.*, db.*, messaging.*
- **OpenMetrics** (RFC pending) — Prometheus-compatible exposition
- **SRE Workbook (Google, O'Reilly 2018)** — SLO arithmetic,
  burn-rate alerting, Four Golden Signals
- **The USE Method (Brendan Gregg)** — Utilisation, Saturation, Errors
- **The RED Method (Tom Wilkie)** — Rate, Errors, Duration
- **`~/.claude/rules/common/observability.md`** — global mandate
- **`~/.claude/rules/common/log-levels.md`** — canonical level taxonomy
- **`~/.claude/rules/common/error-handling-with-context.md`** —
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
- `~/.claude/rules/common/observability.md` — global mandate
- `~/.claude/rules/common/log-levels.md` — level taxonomy
- `~/.claude/rules/common/error-handling-with-context.md` — log
  fields on failure
- `~/.claude/rules/common/audit-logging.md` — separate audit stream
- `~/.claude/rules/common/data-retention.md` — retention per regulation
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
