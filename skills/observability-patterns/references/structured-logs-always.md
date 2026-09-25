# observability-patterns: Structured Logs Always

> Covers **Structured Logs Always** for the `observability-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
