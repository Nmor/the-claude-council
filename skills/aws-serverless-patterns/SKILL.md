---
name: aws-serverless-patterns
description: AWS Lambda + API Gateway + Step Functions + EventBridge + SQS/SNS patterns. Cold-start mitigation, async webhook backpressure, idempotency, fan-out via SNS topics, retry/DLQ design, and Serverless Framework / SAM / CDK conventions. Auto-fires for `serverless.yml`, `template.yaml` (SAM), and `handlers/*.ts`.
---

# AWS Serverless Patterns

Lambda + API Gateway + the surrounding event-driven AWS surface. The patterns here matter because the failure modes (cold starts, lost messages, double-processing, runaway concurrency) show up at customer scale, not in dev.

## When to Activate

- Authoring or reviewing a Lambda handler
- Designing a webhook ingest path (Stripe, Slack, ClickUp, Twilio, GitHub)
- Adding SQS / SNS / EventBridge wiring
- Diagnosing a cold-start tail or throttled-concurrency incident
- Building a Step Functions workflow
- Configuring `serverless.yml`, SAM `template.yaml`, or CDK stacks

## Cold Start: Minimize, Don't Eliminate

Cold-start latency comes from two places:
1. **Container provisioning** — AWS-controlled; ~100-300 ms for Node 20 / 256 MB
2. **Module import** — your code; can balloon to 1-3 s with heavy SDK imports

Fixes that work:

- **Tree-shake heavy SDKs** — `import { DynamoDBClient } from "@aws-sdk/client-dynamodb"` only pulls the DDB client, not the whole `aws-sdk` v2 monolith.
- **Top-of-file imports for the hot path** — keep `await import("...")` for genuinely conditional dependencies; static imports JIT-compile during cold start so they don't pay per-request.
- **Singleton AWS clients** — instantiate once at module scope so warm invocations reuse them. Never `new DynamoDBClient()` inside a handler.
- **Provisioned concurrency** — last resort. Use only for user-facing latency-critical endpoints (login, dashboard). Costs money even when idle.

Don't fix:

- **Most Lambdas** — async workers (SQS / Stream consumers) are forgiving of 500 ms cold starts. Engineering time spent shaving it off pays nothing.

## Async-By-Default For Webhooks

Every external webhook (Stripe, Slack, GitHub, ClickUp, Twilio, Shopify) has a tight deadline (3-30 s). The synchronous Lambda must:

1. **Verify the signature** (HMAC) — sync, < 10 ms
2. **Claim an idempotency key** — sync DDB Put with `ConditionExpression: "attribute_not_exists(pk)"`, < 50 ms
3. **Enqueue to SQS** — sync, < 50 ms
4. **Return 200** — total budget < 200 ms

The SQS worker then runs the heavy dispatch (API calls, AI inference, downstream writes) without blocking the upstream's retry timer.

```yaml
# serverless.yml
functions:
  stripeWebhook:
    handler: handlers/stripeWebhook.handler
    events:
      - httpApi: { path: /stripe/webhook, method: post }
    environment:
      STRIPE_INBOUND_QUEUE_URL: !Ref StripeInboundQueue

  stripeInboundWorker:
    handler: handlers/stripeInboundWorker.handler
    timeout: 60
    events:
      - sqs:
          arn: !GetAtt StripeInboundQueue.Arn
          batchSize: 5
          functionResponseType: ReportBatchItemFailures
    destinations:
      onFailure:
        type: sqs
        arn: !GetAtt AsyncWorkerDLQ.Arn
```

The synchronous handler stays thin; the worker owns the work.

## Idempotency Is Mandatory

Every async path delivers AT LEAST once. SQS, SNS, EventBridge, DynamoDB Streams, Step Functions — none of them guarantee exactly-once. Defenses:

- **Conditional writes** — `attribute_not_exists(pk)` rejects the second delivery atomically
- **Idempotency keys** — claim a key with TTL = max retry window; subsequent deliveries see the claim and short-circuit
- **Last-writer-wins updates** — order-independent operations (`SET last_seen = :now` if `:now > last_seen`)

A good idempotency key is the upstream's event ID (`stripe:<event_id>`, `slack:<event_id>`, `github:<delivery_id>`). Their uniqueness is part of their contract; you inherit it.

## SQS: Backpressure + Partial Failure

Configure every consumer Lambda with:

- `batchSize: 5-10` — small enough that one slow record doesn't block the rest
- `functionResponseType: ReportBatchItemFailures` — return `{ batchItemFailures: [...] }` to retry only the failing records, not the whole batch
- `RedrivePolicy: { maxReceiveCount: 3, deadLetterTargetArn }` — fail fast to a DLQ instead of redelivering forever
- `VisibilityTimeout` — at least `6 * function timeout` (covers the BatchWrite retry window)

A DLQ alarm is mandatory: any message in the DLQ is unprocessed business state and should page on-call.

## SNS Fan-Out For 1:N Delivery

When one event needs N independent consumers (notifications, search index, analytics), SNS Topic + SNS-to-SQS subscriptions decouple them. Each consumer's failure doesn't backpressure the others.

```yaml
RunCompletionTopic:
  Type: AWS::SNS::Topic

EmailDeliveryQueue:
  Type: AWS::SQS::Queue
  Properties:
    RedrivePolicy: { ... }

EmailSnsSubscription:
  Type: AWS::SNS::Subscription
  Properties:
    Protocol: sqs
    TopicArn: !Ref RunCompletionTopic
    Endpoint: !GetAtt EmailDeliveryQueue.Arn
```

Don't fan out from application code. SNS is purpose-built for this and gives you per-subscription DLQs for free.

## EventBridge Cron For Scheduled Work

Use `events: schedule:` on a Lambda for cron-like triggers. The schedule expression is `cron(min hour day-of-month month day-of-week year)` — note the year column AWS adds.

```yaml
auditIntegrityJob:
  handler: handlers/auditIntegrityJob.handler
  events:
    - schedule:
        rate: cron(0 3 * * ? *)  # 03:00 UTC daily
        enabled: true
```

EventBridge cron is at-least-once. Make scheduled jobs idempotent (timestamp-keyed run rows in DDB), or accept that occasional duplicate runs are OK.

## Reserved Concurrency: Capacity Insurance

Without `reservedConcurrency`, one runaway tenant (or a typo'd retry loop) can consume the account's entire concurrency pool and starve every other Lambda. Set it on:

- Webhook ingestion (cap so a flood doesn't cascade)
- Public APIs (cap so a 429 storm doesn't take down internal systems)
- Heavyweight jobs (audit walker, GDPR erasure)

Don't set it everywhere — reserved concurrency removes capacity from the pool even when idle.

## Step Functions Over State In Code

When a workflow has multiple async steps with retries, branches, and timeouts, use Step Functions. Encoding the same logic in handler code with DDB-backed state quickly becomes unmaintainable.

Default state-machine settings:

- `Catch: ["States.ALL"]` on every Task — surface failures, don't crash the execution
- `Retry: [{ ErrorEquals: [...], IntervalSeconds: 30, MaxAttempts: 3, BackoffRate: 2.0 }]` on idempotent steps
- `TimeoutSeconds` on every Task — must be less than the state machine's `TimeoutSeconds`

Use `waitForTaskToken` for human-in-the-loop or external callback steps. Lambdas inside Step Functions should be small enough to fit in 6 MB (the payload limit) — for bigger payloads, write to S3 and pass the key.

## IAM Least Privilege

Each Lambda's execution role grants only what THAT Lambda needs. Avoid one big role for all functions in the stack. Patterns:

- **Per-Lambda role** — Serverless Framework: `iamRoleStatements` per-function
- **Resource ARN locked to `${AWS::AccountId}`** — never `*` in the account-id slot
- **Resource ARN locked to the stage-suffixed table name** — never `arn:aws:dynamodb:*:*:table/*`

When a cell-based architecture spawns a second cell, per-stage table names + per-stage IAM roles automatically isolate the cells. Cross-cell data access is impossible at the IAM layer.

## Observability: Structured Logs + EMF Metrics

Lambdas log to CloudWatch automatically. Make the logs useful:

- **Structured JSON** — never `console.log("user " + id)`. Use `console.log(JSON.stringify({ msg: "...", user_id: id }))` or a logger lib that emits JSON.
- **Per-request correlation id** — pass through `request_id` (APIGW provides one) on every log line in the request's call chain
- **EMF metrics** — emit a JSON line with the `_aws.CloudWatchMetrics` envelope; CloudWatch parses it as a metric. Zero SDK calls, zero IAM perms, dimensioned by `organization_id` / `cell_id` / whatever you need.

```ts
console.log(JSON.stringify({
  _aws: {
    Timestamp: Date.now(),
    CloudWatchMetrics: [{
      Namespace: "MyApp",
      Dimensions: [["organization_id"]],
      Metrics: [{ Name: "WebhookFailures", Unit: "Count" }],
    }],
  },
  organization_id: orgId,
  WebhookFailures: 1,
}));
```

## Canary Deploys + Auto-Rollback

For production-traffic Lambdas, use `serverless-plugin-canary-deployments` (or CDK `CodeDeploy.LambdaDeploymentGroup`). Deploy 10% of traffic to the new version for 5-10 min; auto-rollback on any CloudWatch alarm breach.

```yaml
functions:
  httpApi:
    deploymentSettings:
      type: Canary10Percent5Minutes
      alias: live
      alarms:
        - HttpApiErrorAlarm
        - HttpApiDurationAlarm
```

The auto-rollback window is your safety net. Outside it, manual rollback (re-deploy the previous SHA) is the procedure.

## Common Smells

| Smell | Fix |
| ----- | --- |
| `console.log("foo " + bar)` | Structured JSON or a logger lib |
| `new DynamoDBClient()` inside a handler | Move to module scope |
| Synchronous webhook handler making external API calls | Split: sync handler enqueues; worker dispatches |
| `aws-sdk` v2 import | Migrate to v3 modular imports |
| Lambda with no `RedrivePolicy` on its trigger | Add a DLQ |
| `reservedConcurrency` unset on user-facing handler | Set a sensible cap |
| One IAM role for every Lambda in the stack | Split per-function |
| Cron job with no idempotency check | Idempotency key per scheduled run |
| `events: stream:` consumer that throws on bad row | Catch + log + ack; only retry on transient |
| `fs.writeFile`, `os.Create`, `open(path, "w")` in production source | Stream to in-memory buffer + S3 PutObject. Lambda's local disk dies on invocation end; relying on it is a P1 in waiting. See `~/.claude/rules/common/no-local-fs.md` |

## Skill Chain

1. **aws-serverless-patterns** — this skill
2. **deployment-patterns** — CI/CD, canary, rollback
3. **dynamodb-patterns** — when DDB is involved
4. **security-review** — IAM, secrets, signature verification
5. **backend-patterns** — handler / repository shape
