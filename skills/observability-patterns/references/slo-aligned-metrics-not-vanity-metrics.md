# observability-patterns: SLO-Aligned Metrics, Not Vanity Metrics

> Covers **SLO-Aligned Metrics, Not Vanity Metrics** for the `observability-patterns` skill. Routed
> from the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
