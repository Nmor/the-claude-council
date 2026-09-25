# observability-patterns: Cardinality Discipline

> Covers **Cardinality Discipline** for the `observability-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Cardinality Discipline

Metric cost scales with **unique combinations of dimensions × metric names**.
A dimension on `user_id` blows up to millions; a dimension on `organization_id`
is bounded by tenant count. Rules:

- High-cardinality dimensions (`user_id`, `request_id`, `task_id`) → logs only
- Low-cardinality dimensions (`organization_id`, `cell_id`, `endpoint`, `status_code`) → metrics
- Bucket continuous values (`duration_ms` → `latency_bucket: "p50" | "p99"`) before they become a
  dimension
- Audit weekly: a dashboard "top 20 dimensions by series count" surfaces a runaway

A free-tier CloudWatch account has bitten teams that dimensioned by
`request_id` — their first month's bill was four figures.
