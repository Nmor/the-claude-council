# observability-patterns: Tracing: Use OpenTelemetry If You Have It

> Covers **Tracing: Use OpenTelemetry If You Have It** for the `observability-patterns` skill.
> Routed from the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
