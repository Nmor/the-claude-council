# observability-patterns: Common Smells

> Covers **Common Smells** for the `observability-patterns` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
