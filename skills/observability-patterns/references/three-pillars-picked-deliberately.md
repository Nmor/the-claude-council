# observability-patterns: Three Pillars, Picked Deliberately

> Covers **Three Pillars, Picked Deliberately** for the `observability-patterns` skill. Routed from
> the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Three Pillars, Picked Deliberately

| Pillar | Strength | When to lean on it |
| ------ | -------- | ------------------ |
| Structured logs | Cheap, easy to grep, free-form | The default; covers 80% of debugging |
| Metrics (EMF / Prometheus / OTEL) | Aggregate, cardinality-cheap, alerting source-of-truth | SLO tracking, dashboards, paging |
| Distributed traces | Request-flow visibility across services | Multi-service latency root-cause |

Don't ship all three uniformly — you'll pay 3x for marginal lift on the
last one. Logs everywhere, metrics on the boundary you alert on, traces
on the critical user-path.
