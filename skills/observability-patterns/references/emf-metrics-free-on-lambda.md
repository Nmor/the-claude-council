# observability-patterns: EMF Metrics: Free On Lambda

> Covers **EMF Metrics: Free On Lambda** for the `observability-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
