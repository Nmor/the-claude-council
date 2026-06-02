---
name: aws-serverless-patterns
description: AWS Lambda + API Gateway + Step Functions + EventBridge + SQS/SNS patterns. Cold-start mitigation, async webhook backpressure, idempotency, fan-out via SNS topics, retry/DLQ design, and Serverless Framework / SAM / CDK conventions. Auto-fires for `serverless.yml`, `template.yaml` (SAM), and `handlers/*.ts`.
---

# AWS Serverless Patterns

> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> One source of truth per Lambda layer concern — one auth
> middleware, one error responder, one body parser, one
> idempotency helper, one DDB client factory, one outbox
> publisher. Lambda layers (or shared `/lib/` for monorepo
> deploys) are the canonical home. Each new handler imports the
> shared primitives; never re-implement them per handler.

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
| `fs.writeFile`, `os.Create`, `open(path, "w")` in production source | Stream to in-memory buffer + S3 PutObject. Lambda's local disk dies on invocation end; relying on it is a P1 in waiting. See `~/.claude/rules-library/common/no-local-fs.md` |

## Skill Chain

1. **aws-serverless-patterns** — this skill
2. **deployment-patterns** — CI/CD, canary, rollback
3. **dynamodb-patterns** — when DDB is involved
4. **security-review** — IAM, secrets, signature verification
5. **backend-patterns** — handler / repository shape

## Purpose

AWS serverless architecture patterns for Lambda + API Gateway + DynamoDB + SQS + EventBridge + Step Functions: handler structure, cold-start optimisation, async-by-default for webhooks, idempotent processing, observability with EMF + X-Ray, and IaC discipline (AWS SAM, CDK, Serverless Framework).

**Negative scope**: NOT general backend patterns (use `backend-patterns`). NOT DynamoDB single-table modelling (use `dynamodb-patterns`). NOT GCP / Azure serverless (different SDKs + IAM models). NOT container-on-Fargate workloads (different concurrency + cost model).

## When NOT to use

- Long-running tasks > 15 minutes (Lambda hard limit) → use ECS Fargate or Step Functions with task tokens
- Workloads with steady > 100 req/s sustained (Lambda becomes more expensive than containers around this point)
- Stateful WebSocket servers (use AppSync or API Gateway WebSocket + DDB session store)
- Heavy CPU-bound work (Lambda CPU scales with memory; cheaper on dedicated compute)
- Hot-path workloads with < 50ms P99 latency budget (cold-start tail will breach it)

## Standards Cited

- **AWS Lambda Developer Guide** (current) — execution model, cold starts, concurrency
- **AWS Well-Architected Framework — Serverless Lens (Dec 2023)** — operational excellence + cost
- **AWS Lambda Powertools v3** — structured logging, metrics, tracing, idempotency utility
- **AWS API Gateway Documentation** — REST vs HTTP API, throttling, custom authorizers
- **EventBridge / SQS / SNS Best Practices** — fan-out, dead-letter queues, retry semantics
- **OpenTelemetry on AWS Lambda** — trace context propagation
- **AWS IAM Best Practices** — least-privilege role design

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Webhook handler doing DB writes + external API calls inline | API Gateway 29-second timeout; provider retries on timeout → double-processing | Acknowledge fast (200 OK) → enqueue to SQS → worker processes |
| Lambda function with > 50MB deps zipped | Cold start > 2s; deploy slow; cost per invocation up | Trim bundle (esbuild / parcel); use Lambda layers for shared deps |
| Lambda concurrency unbounded | One viral request burst exhausts account-wide concurrency; other Lambdas throttle | Set `ReservedConcurrentExecutions` per function |
| `console.log` for production logging | No structure; no metrics; CloudWatch costs higher | Lambda Powertools `Logger` + EMF for metrics |
| IAM role wildcards (`Resource: "*"`) | Lateral movement on compromise | Least-privilege per-resource ARN |
| Hardcoded ARNs / endpoints in handler | Cross-environment deploys break; per-stage config impossible | Environment variables resolved via SSM Parameter Store / Secrets Manager |
| SQS consumer without DLQ | Poison-pill message blocks queue forever | Dead-letter queue + alarm on > 0 |
| Provisioned concurrency on every function | Cost surge for no benefit on rarely-invoked functions | Provisioned only on user-facing hot paths |

## Verification Checklist

- [ ] Every Lambda function has reserved concurrency OR is documented as "best-effort burst"
- [ ] Every SQS queue has a DLQ + CloudWatch alarm on `ApproximateNumberOfMessagesVisible > 0`
- [ ] Webhook handlers acknowledge fast (200 OK) before doing the work
- [ ] Idempotency via Lambda Powertools `@idempotent` decorator on at-least-once consumers
- [ ] Structured logs via Powertools Logger; metrics via EMF inline
- [ ] X-Ray / OTel tracing enabled with sampling rate documented
- [ ] IAM role: no `*` resources; per-function least-privilege
- [ ] Cold-start budget documented per function (e.g., user-facing < 500ms p99 with provisioned conc.)
- [ ] Environment variables resolved from SSM / Secrets Manager — never hardcoded
- [ ] `sam validate` or `cdk synth` passes; no orphan resources

## Cross-References

- `~/.claude/skills/backend-patterns/SKILL.md` — handler / repository / service layering
- `~/.claude/skills/dynamodb-patterns/SKILL.md` — single-table modelling
- `~/.claude/skills/deployment-patterns/SKILL.md` — CI/CD + canary + rollback
- `~/.claude/skills/observability-patterns/SKILL.md` — EMF + X-Ray + structured logs
- `~/.claude/rules-library/common/idempotency.md` — Idempotency-Key + dedupe table
- `~/.claude/rules-library/common/secrets-management.md` — vault-first, never hardcoded
- `~/.claude/rules-library/common/no-local-fs.md` — Lambda /tmp is ephemeral
- `~/.claude/agents/security-reviewer.md` — IAM least-privilege audit

## Why this skill exists

Lambda's strengths (autoscaling, no server management, per-request billing) come with sharp edges: 15-min hard timeout, 29-sec API Gateway timeout, ephemeral /tmp, cold-start tail latency, account-wide concurrency limits. The recurring failure modes:

- Webhook handler does the work inline → 30s timeout → provider retries → double-processing on Stripe / Twilio
- No DLQ on SQS → one poison-pill message blocks the queue indefinitely → cascading backlog
- IAM wildcards (`Action: "*"`, `Resource: "*"`) → one compromised function pivots the whole account
- Hardcoded ARNs → cross-region / cross-account deploys break
- No reserved concurrency → one Lambda's burst starves the rest; account-wide throttle
- /tmp persistence assumption → container reuse caches it across invocations; assumption fails on cold container

Cost of disciplined serverless patterns: minutes per function at write time. Cost of skipping them: incidents that look like AWS bugs but are configuration gaps.

## Compliance & Standards Mapping

- **ISO/IEC 25010:2011 §6** — Product quality model (Functional
  Suitability, Reliability, Performance Efficiency, Usability,
  Security, Maintainability, Portability, Compatibility)
- **ISO/IEC/IEEE 12207:2017 §6.4** — Software construction +
  verification + validation processes
- **NIST SP 800-218 SSDF §PW** — Produce Well-Secured Software
  (applies to every code-authoring skill)
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing +
  evaluation
- **OWASP ASVS 4.0.3 §V1.1** — Secure SDLC requirements
- **OWASP ASVS 4.0.3 §V14.2** — Dependency lifecycle
- **CWE Top 25 (2026)** — Weakness classes the patterns in this
  skill prevent
- **SLSA Framework v1.0 Build L2+** — Provenance + integrity

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Lambda cold-start sustained > 1s p99 (provisioned concurrency / runtime / bundle-size review)
- Throttle alarms firing (reserved-concurrency / account-concurrency exhaustion)
- Webhook handler doing the work inline instead of enqueueing (async-by-default weakening)
- Local FS write in Lambda source (`fs.writeFile` / `os.Create` / `open(...,"w")` — `no-local-fs.md` violation)
- Env-bag size approaching 4 KB (multi-cell deployment filler — derive table names from cell-id + stage instead)
- IAM policy with `*:*` or overbroad resource scope (least-privilege weakening)
- Stream consumer's iterator-age sustained > 60s (consumer lagging behind producer)
- Function package > 50 MB (cold-start tax) — split into smaller functions or move to container image
- Step Function with > 25 states or > 10 deep nesting (split or use distributed map)
- API Gateway endpoint without throttling configured (DoS exposure)
- EventBridge rule without DLQ on target (poison-message loss)

**Refinement candidates**:

- New IaC template row when a new event-source binding becomes common (e.g., Kafka MSK trigger)
- Tightening of the env-bag size rule when multi-cell deployment scales
- New cross-reference when a sister skill (dynamodb-patterns, observability-patterns, deployment-patterns) adds a serverless gate
- New cold-start mitigation pattern when a new AWS feature ships (e.g., LLRT, SnapStart for Node)
