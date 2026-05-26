---
name: dynamodb-patterns
description: DynamoDB single-table design, composite keys, GSI design, conditional writes, BatchWrite/BatchGet chunking, atomic counters, TTL, streams, and cross-tenant isolation patterns. Auto-fires for files importing from `@aws-sdk/lib-dynamodb` or `@aws-sdk/client-dynamodb`.
---

# DynamoDB Patterns

DynamoDB is a key-value store dressed up as a database. Get the access patterns right at design time and it scales effortlessly; get them wrong and the only fix is a multi-month migration. These patterns prevent the common production-grade mistakes.

## When to Activate

- Designing a new table or GSI
- Writing or reviewing any `ddb.send(...)` call
- Adding a new query pattern to an existing table
- Auditing for cross-tenant leak risk
- Migrating between key shapes
- Diagnosing throttling / hot-partition incidents

## The Core Rule: Access Patterns Define the Schema

In a relational DB, you model the data, then query it. In DynamoDB, you enumerate the QUERIES first, then design keys to make each one a single Query (never a Scan). Skipping this step always ends in a costly redesign.

For each entity, write down:

1. **List X by Y** — needs `PK = Y` or a GSI on Y
2. **Get specific X** — needs the full PK + SK
3. **List X sorted by date** — SK should be a date-prefixed string

If your access pattern is "list all rows that match attribute Z" — that's a Scan, and Scans are forbidden in production code paths. Either add a GSI on Z or denormalize.

## Tenant Isolation: `organization_id` In Every Key

Multi-tenant systems MUST use `organization_id` (or equivalent) as the partition key on every base table. Two reasons:

1. **Hot-partition prevention** — one tenant's traffic can't dominate another's RCU/WCU.
2. **Cross-tenant leak prevention** — a forgotten filter on a Query is impossible because the Query's PK requires the org.

Allowed deviations:
- Tables keyed by a server-minted unique id (e.g. `connection_id`, `webhook_event_id`) where the org is on a GSI.
- Lookup tables (Slack workspace → org, share token → diagram) where the key IS the lookup value.

Both deviations require a defense-in-depth check at read time: confirm the resolved row's `organization_id` matches the caller's.

A custom ESLint rule (or equivalent static check) should enforce this on every new `QueryCommand` / `GetCommand` / `UpdateCommand` / `DeleteCommand`.

## Composite Sort Keys For Hierarchies

Sort keys can encode hierarchy:

```
PK: organization_id        SK: USER#<user_id>
PK: organization_id        SK: TEAM#<team_id>
PK: organization_id        SK: TEAM#<team_id>#MEMBER#<user_id>
```

A single Query with `begins_with(SK, "TEAM#<team_id>")` returns the team plus every member in one round-trip.

## GSI Design

Each GSI is a separate table in cost. Don't add one casually. Rules:

- **PK = the dimension you query by**, not the original PK. If you query by `(workspace_id)`, the GSI PK is `workspace_id`.
- **Project only what callers need** (`KEYS_ONLY` or `INCLUDE`). Default `ALL` doubles your storage cost for the table.
- **Sparse indexes** — set the GSI key only on rows that participate in the index (e.g. `is_published` only present when `true`). Indexed rows = cost; sparse means cheap.
- **Eventually consistent reads only** — GSIs don't support strong consistency. If you need read-your-writes guarantees, query the base table.

## Conditional Writes For Atomicity

DynamoDB has no transactions across partitions, but `ConditionExpression` makes single-item updates atomic. Use them everywhere a race could land an inconsistent state:

```ts
// "Claim this idempotency key" — fails if already claimed
await ddb.send(new PutCommand({
  TableName: RATE_LIMIT_TABLE,
  Item: { pk: `idemp:${eventId}`, ttl, claimed_at: now },
  ConditionExpression: "attribute_not_exists(pk)",
}));

// "Increment if balance >= cost" — fails atomically if not enough
await ddb.send(new UpdateCommand({
  TableName: BALANCE_TABLE,
  Key: { user_id },
  UpdateExpression: "SET balance = balance - :cost",
  ConditionExpression: "balance >= :cost",
  ExpressionAttributeValues: { ":cost": cost },
}));
```

A `ConditionalCheckFailedException` is the success-as-failure signal — catch it and treat it as the "already happened" branch.

## Atomic Counters

`UpdateExpression: "ADD count :delta"` is atomic. No need to read-modify-write:

```ts
await ddb.send(new UpdateCommand({
  TableName: COUNTERS,
  Key: { metric: "page_views" },
  UpdateExpression: "ADD #c :one",
  ExpressionAttributeNames: { "#c": "count" },
  ExpressionAttributeValues: { ":one": 1 },
}));
```

Concurrent increments compose correctly without a lock.

## BatchWriteItem: Chunk + Retry Unprocessed

`BatchWriteItem` accepts at most 25 items per call. It can also return `UnprocessedItems` if the batch hits write capacity. Always chunk + retry:

```ts
const CHUNK = 25;
for (let i = 0; i < rows.length; i += CHUNK) {
  let unprocessed = { [TABLE]: rows.slice(i, i + CHUNK).map(toDeleteRequest) };
  let attempts = 0;
  while (unprocessed && Object.keys(unprocessed).length && attempts < 5) {
    const res = await ddb.send(new BatchWriteCommand({ RequestItems: unprocessed }));
    unprocessed = res.UnprocessedItems ?? {};
    attempts += 1;
  }
}
```

Naive `BatchWrite` callers leak rows under burst load. Don't.

## TTL For Ephemeral Data

Mark transient rows with `ttl: <epoch_seconds>`. DynamoDB sweeps expired rows (within ~48 hours) for free. Use it for:

- Idempotency keys (4-day window for Stripe; 6-hour for Slack)
- WebSocket connection rows
- Rate-limit buckets
- Verification codes / one-time tokens
- Subscription rows for transient peers

The TTL attribute name is set per-table in `TimeToLiveSpecification` — typically just `ttl`.

## Streams For Fan-Out

Enable `StreamSpecification: NEW_AND_OLD_IMAGES` on any table whose mutations another system needs to know about. A Lambda subscribed to the stream replaces:

- Cron jobs that scan for changes
- Application-layer dual writes to a second store
- "After-write" hooks scattered across handlers

Stream Lambdas must be idempotent — DynamoDB delivers at-least-once. They get retried with exponential backoff and finally land in a DLQ.

## Pagination Always

Every Query / Scan loops `LastEvaluatedKey`:

```ts
async function queryAllItems<T>(params: QueryCommandInput): Promise<T[]> {
  const out: T[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(
      new QueryCommand({ ...params, ExclusiveStartKey: lastKey }),
    );
    out.push(...((res.Items as T[] | undefined) ?? []));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return out;
}
```

Single-page Query results lie about completeness. Always loop, or apply an explicit `Limit` and surface "there are more" to the caller.

## Hot-Partition Avoidance

A single PK that takes >3000 RCU or >1000 WCU per second hot-partitions and throttles, regardless of table-level capacity. Defenses:

- Multi-tenant: `organization_id` partitioning naturally spreads load
- Single-tenant high-write workloads: append a write-shard suffix (`organization_id#<0-19>`) and Query each shard at read time
- Global counters: don't use one row; use sharded counters and aggregate

Watch CloudWatch's `ConsumedWriteCapacityUnits` per-partition to spot a hot key before it pages you.

## Don't Use Scans In Production

A Scan reads every row in the table. At 10k rows it's an annoyance; at 10M it's an outage. The two legitimate Scan use cases:

- One-shot data migrations / backfills (run from a script, not a request handler)
- Nightly integrity walkers (audit chain verification, GDPR sweep)

Both should respect a `MAX_ROWS` cap and emit "I hit the cap" telemetry so an unbounded scan can't silently exhaust memory.

## Single-Table vs Multi-Table

The "official" DynamoDB design pattern is single-table — one table holds every entity, distinguished by `PK` / `SK` shapes. Pros: every query is a single Query. Cons: schemas are encoded in code, not the table; new entities are easy but new queries on existing entities require GSIs or rewrites.

Multi-table is the simpler default. Use single-table when:

- You query across entity types in the same Query call
- You're running thousands of orgs and want to consolidate read capacity
- You have a stable, well-understood entity model

If unsure, start multi-table. It's easier to migrate towards single-table when access patterns settle than the reverse.

## Common Smells

| Smell | Fix |
| ----- | --- |
| Query without `organization_id` in a multi-tenant table | Add it; or document the deviation in an allowlist |
| `as` cast on `res.Items` to a domain type | Validate at the boundary; DDB returns `Record<string, unknown>` |
| `BatchWriteCommand` with > 25 items | Chunk |
| `UpdateExpression` reading then writing the same attribute in code | Use atomic `ADD` / `SET` with `ConditionExpression` |
| `Scan` in a request handler | Replace with a Query against a GSI |
| GSI with `ProjectionType: ALL` and few rows accessing it | Switch to `KEYS_ONLY` or `INCLUDE` |
| TTL attribute set in code but not declared in `TimeToLiveSpecification` | Declare it; DDB silently ignores otherwise |
| Stream consumer that isn't idempotent | Add an idempotency key check or a conditional write |

## Skill Chain

1. **dynamodb-patterns** — this skill
2. **backend-patterns** — handler / repository shape
3. **security-review** — multi-tenant isolation, defense in depth
4. **aws-serverless-patterns** — Lambda integration, stream handlers
