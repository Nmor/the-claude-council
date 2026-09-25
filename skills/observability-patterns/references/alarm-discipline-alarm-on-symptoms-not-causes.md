# observability-patterns: Alarm Discipline: Alarm On Symptoms, Not Causes

> Covers **Alarm Discipline: Alarm On Symptoms, Not Causes** for the `observability-patterns` skill.
> Routed from the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Alarm Discipline: Alarm On Symptoms, Not Causes

Page on what the user sees:

- ✅ "Error rate > 5% for 5 minutes" (symptom)
- ✅ "p99 latency > 2s for 5 minutes" (symptom)
- ❌ "DDB throttling > 0" (cause — alarm if it's load-bearing, otherwise it's a log)
- ❌ "CPU > 80%" (cause — only matters if it correlates with latency)

Cause alarms are useful for diagnostics, not for waking someone at 3 AM.
A noisy alarm policy makes on-call ignore real pages. One alarm fired
incorrectly is more damaging than ten missed cause-alarms.
