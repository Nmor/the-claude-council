# observability-patterns: Per-Request Correlation IDs

> Covers **Per-Request Correlation IDs** for the `observability-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
