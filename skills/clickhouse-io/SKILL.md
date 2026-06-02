---
name: clickhouse-io
description: ClickHouse database patterns, query optimization, analytics, and data engineering best practices for high-performance analytical workloads.
---

# ClickHouse Analytics Patterns

ClickHouse-specific patterns for high-performance analytics and data engineering.

## When to Activate

- Designing ClickHouse table schemas (MergeTree engine selection)
- Writing analytical queries (aggregations, window functions, joins)
- Optimizing query performance (partition pruning, projections, materialized views)
- Ingesting large volumes of data (batch inserts, Kafka integration)
- Migrating from PostgreSQL/MySQL to ClickHouse for analytics
- Implementing real-time dashboards or time-series analytics

## Overview

ClickHouse is a column-oriented database management system (DBMS) for online analytical processing (OLAP). It's optimized for fast analytical queries on large datasets.

**Key Features:**

- Column-oriented storage
- Data compression
- Parallel query execution
- Distributed queries
- Real-time analytics

## Table Design Patterns

### MergeTree Engine (Most Common)

```sql
CREATE TABLE markets_analytics (
    date Date,
    market_id String,
    market_name String,
    volume UInt64,
    trades UInt32,
    unique_traders UInt32,
    avg_trade_size Float64,
    created_at DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, market_id)
SETTINGS index_granularity = 8192;
```

### ReplacingMergeTree (Deduplication)

```sql
-- For data that may have duplicates (e.g., from multiple sources)
CREATE TABLE user_events (
    event_id String,
    user_id String,
    event_type String,
    timestamp DateTime,
    properties String
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, event_id, timestamp)
PRIMARY KEY (user_id, event_id);
```

### AggregatingMergeTree (Pre-aggregation)

```sql
-- For maintaining aggregated metrics
CREATE TABLE market_stats_hourly (
    hour DateTime,
    market_id String,
    total_volume AggregateFunction(sum, UInt64),
    total_trades AggregateFunction(count, UInt32),
    unique_users AggregateFunction(uniq, String)
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, market_id);

-- Query aggregated data
SELECT
    hour,
    market_id,
    sumMerge(total_volume) AS volume,
    countMerge(total_trades) AS trades,
    uniqMerge(unique_users) AS users
FROM market_stats_hourly
WHERE hour >= toStartOfHour(now() - INTERVAL 24 HOUR)
GROUP BY hour, market_id
ORDER BY hour DESC;
```

## Query Optimization Patterns

### Efficient Filtering

```sql
-- ✅ GOOD: Use indexed columns first
SELECT *
FROM markets_analytics
WHERE date >= '2025-01-01'
  AND market_id = 'market-123'
  AND volume > 1000
ORDER BY date DESC
LIMIT 100;

-- ❌ BAD: Filter on non-indexed columns first
SELECT *
FROM markets_analytics
WHERE volume > 1000
  AND market_name LIKE '%election%'
  AND date >= '2025-01-01';
```

### Aggregations

```sql
-- ✅ GOOD: Use ClickHouse-specific aggregation functions
SELECT
    toStartOfDay(created_at) AS day,
    market_id,
    sum(volume) AS total_volume,
    count() AS total_trades,
    uniq(trader_id) AS unique_traders,
    avg(trade_size) AS avg_size
FROM trades
WHERE created_at >= today() - INTERVAL 7 DAY
GROUP BY day, market_id
ORDER BY day DESC, total_volume DESC;

-- ✅ Use quantile for percentiles (more efficient than percentile)
SELECT
    quantile(0.50)(trade_size) AS median,
    quantile(0.95)(trade_size) AS p95,
    quantile(0.99)(trade_size) AS p99
FROM trades
WHERE created_at >= now() - INTERVAL 1 HOUR;
```

### Window Functions

```sql
-- Calculate running totals
SELECT
    date,
    market_id,
    volume,
    sum(volume) OVER (
        PARTITION BY market_id
        ORDER BY date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_volume
FROM markets_analytics
WHERE date >= today() - INTERVAL 30 DAY
ORDER BY market_id, date;
```

## Data Insertion Patterns

### Bulk Insert (Recommended)

```typescript
import { ClickHouse } from 'clickhouse'

const clickhouse = new ClickHouse({
  url: process.env.CLICKHOUSE_URL,
  port: 8123,
  basicAuth: {
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD
  }
})

// ✅ Batch insert (efficient)
async function bulkInsertTrades(trades: Trade[]) {
  const values = trades.map(trade => `(
    '${trade.id}',
    '${trade.market_id}',
    '${trade.user_id}',
    ${trade.amount},
    '${trade.timestamp.toISOString()}'
  )`).join(',')

  await clickhouse.query(`
    INSERT INTO trades (id, market_id, user_id, amount, timestamp)
    VALUES ${values}
  `).toPromise()
}

// ❌ Individual inserts (slow)
async function insertTrade(trade: Trade) {
  // Don't do this in a loop!
  await clickhouse.query(`
    INSERT INTO trades VALUES ('${trade.id}', ...)
  `).toPromise()
}
```

### Streaming Insert

```typescript
// For continuous data ingestion
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

async function streamInserts() {
  const stream = clickhouse.insert('trades').stream()

  for await (const batch of dataSource) {
    stream.write(batch)
  }

  await stream.end()
}
```

## Materialized Views

### Real-time Aggregations

```sql
-- Create materialized view for hourly stats
CREATE MATERIALIZED VIEW market_stats_hourly_mv
TO market_stats_hourly
AS SELECT
    toStartOfHour(timestamp) AS hour,
    market_id,
    sumState(amount) AS total_volume,
    countState() AS total_trades,
    uniqState(user_id) AS unique_users
FROM trades
GROUP BY hour, market_id;

-- Query the materialized view
SELECT
    hour,
    market_id,
    sumMerge(total_volume) AS volume,
    countMerge(total_trades) AS trades,
    uniqMerge(unique_users) AS users
FROM market_stats_hourly
WHERE hour >= now() - INTERVAL 24 HOUR
GROUP BY hour, market_id;
```

## Performance Monitoring

### Query Performance

```sql
-- Check slow queries
SELECT
    query_id,
    user,
    query,
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_duration_ms > 1000
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY query_duration_ms DESC
LIMIT 10;
```

### Table Statistics

```sql
-- Check table sizes
SELECT
    database,
    table,
    formatReadableSize(sum(bytes)) AS size,
    sum(rows) AS rows,
    max(modification_time) AS latest_modification
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes) DESC;
```

## Common Analytics Queries

### Time Series Analysis

```sql
-- Daily active users
SELECT
    toDate(timestamp) AS date,
    uniq(user_id) AS daily_active_users
FROM events
WHERE timestamp >= today() - INTERVAL 30 DAY
GROUP BY date
ORDER BY date;

-- Retention analysis
SELECT
    signup_date,
    countIf(days_since_signup = 0) AS day_0,
    countIf(days_since_signup = 1) AS day_1,
    countIf(days_since_signup = 7) AS day_7,
    countIf(days_since_signup = 30) AS day_30
FROM (
    SELECT
        user_id,
        min(toDate(timestamp)) AS signup_date,
        toDate(timestamp) AS activity_date,
        dateDiff('day', signup_date, activity_date) AS days_since_signup
    FROM events
    GROUP BY user_id, activity_date
)
GROUP BY signup_date
ORDER BY signup_date DESC;
```

### Funnel Analysis

```sql
-- Conversion funnel
SELECT
    countIf(step = 'viewed_market') AS viewed,
    countIf(step = 'clicked_trade') AS clicked,
    countIf(step = 'completed_trade') AS completed,
    round(clicked / viewed * 100, 2) AS view_to_click_rate,
    round(completed / clicked * 100, 2) AS click_to_completion_rate
FROM (
    SELECT
        user_id,
        session_id,
        event_type AS step
    FROM events
    WHERE event_date = today()
)
GROUP BY session_id;
```

### Cohort Analysis

```sql
-- User cohorts by signup month
SELECT
    toStartOfMonth(signup_date) AS cohort,
    toStartOfMonth(activity_date) AS month,
    dateDiff('month', cohort, month) AS months_since_signup,
    count(DISTINCT user_id) AS active_users
FROM (
    SELECT
        user_id,
        min(toDate(timestamp)) OVER (PARTITION BY user_id) AS signup_date,
        toDate(timestamp) AS activity_date
    FROM events
)
GROUP BY cohort, month, months_since_signup
ORDER BY cohort, months_since_signup;
```

## Data Pipeline Patterns

### ETL Pattern

```typescript
// Extract, Transform, Load
async function etlPipeline() {
  // 1. Extract from source
  const rawData = await extractFromPostgres()

  // 2. Transform
  const transformed = rawData.map(row => ({
    date: new Date(row.created_at).toISOString().split('T')[0],
    market_id: row.market_slug,
    volume: parseFloat(row.total_volume),
    trades: parseInt(row.trade_count)
  }))

  // 3. Load to ClickHouse
  await bulkInsertToClickHouse(transformed)
}

// Run periodically
setInterval(etlPipeline, 60 * 60 * 1000)  // Every hour
```

### Change Data Capture (CDC)

```typescript
// Listen to PostgreSQL changes and sync to ClickHouse
import { Client } from 'pg'

const pgClient = new Client({ connectionString: process.env.DATABASE_URL })

pgClient.query('LISTEN market_updates')

pgClient.on('notification', async (msg) => {
  const update = JSON.parse(msg.payload)

  await clickhouse.insert('market_updates', [
    {
      market_id: update.id,
      event_type: update.operation,  // INSERT, UPDATE, DELETE
      timestamp: new Date(),
      data: JSON.stringify(update.new_data)
    }
  ])
})
```

## Best Practices

### 1. Partitioning Strategy

- Partition by time (usually month or day)
- Avoid too many partitions (performance impact)
- Use DATE type for partition key

### 2. Ordering Key

- Put most frequently filtered columns first
- Consider cardinality (high cardinality first)
- Order impacts compression

### 3. Data Types

- Use smallest appropriate type (UInt32 vs UInt64)
- Use LowCardinality for repeated strings
- Use Enum for categorical data

### 4. Avoid

- SELECT * (specify columns)
- FINAL (merge data before query instead)
- Too many JOINs (denormalize for analytics)
- Small frequent inserts (batch instead)

### 5. Monitoring

- Track query performance
- Monitor disk usage
- Check merge operations
- Review slow query log

**Remember**: ClickHouse excels at analytical workloads. Design tables for your query patterns, batch inserts, and leverage materialized views for real-time aggregations.

## Purpose

Principal-level ClickHouse engineering: MergeTree engine family
selection, sort-key + partitioning design, materialised views for
real-time aggregation, dictionary-based JOIN avoidance, batched
ingest, TTL-based retention, projection use, distributed table +
sharding semantics, query-plan reading (`EXPLAIN PLAN/PIPELINE`),
mutation cost awareness, and the ClickHouse data-type discipline
(LowCardinality, Nullable cost, codecs).

**Negative scope** (NOT what this skill covers):

- Relational OLTP — see `postgres-patterns`
- Document / key-value workloads — see `dynamodb-patterns`
- Druid / Pinot / StarRocks / Doris (different engines, similar shape)
- Stream processors (Kafka Streams, Flink) — ClickHouse consumes; doesn't replace
- ETL orchestration — see `database-migrations` + sister tooling

## When NOT to use

- Point lookups by primary key < 100ms p99 — use OLTP store
- High-frequency single-row INSERT/UPDATE/DELETE — wrong shape entirely
- Strong consistency across writers — ClickHouse is eventually consistent
- Complex multi-table OLTP JOINs — ClickHouse can JOIN, but the
  cost is paid in memory; denormalise or use Dictionary lookups
- Sub-second mutation visibility — MUTATIONs are async + expensive

## Standards Cited

- **ClickHouse Documentation v25.x** (clickhouse.com/docs) — engine
  reference + system tables + tuning
- **MergeTree Engine Reference** — clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- **SQL:2023 (ISO/IEC 9075)** — base SQL semantics; ClickHouse extends
- **Altinity Best Practices** — community-canonical operational guide
- **OWASP ASVS 4.0.3 §13.3 (SQL Queries)** — parameterisation
- **CWE-89 (SQL Injection)** — applies even on OLAP
- **NIST SP 800-53 Rev 5 AC-3 (Access Enforcement)** — row policies

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Single-row `INSERT INTO events VALUES (...)` | Each INSERT creates a new part; merger overwhelmed → "Too many parts" error | Buffer at the producer; batch ≥ 1000 rows; or use Buffer engine / Kafka engine |
| `SELECT *` on wide event table | Reads every column (columnar penalty); breaks consumers on column add | Explicit projection list |
| ORDER BY in `MergeTree()` set to high-cardinality column | Sort-key bloat; merges slow; index ineffective | Sort key starts with low-cardinality filter columns |
| Missing PARTITION BY on time-series | Cannot drop old partitions cheaply; queries scan all data | `PARTITION BY toYYYYMM(event_time)` (or day for high-volume) |
| `MUTATION` (UPDATE/DELETE) on large table at scale | Rewrites every affected part; multi-hour ops | Use ReplacingMergeTree / CollapsingMergeTree / VersionedCollapsingMergeTree; or insert tombstones |
| Distributed query without sharding-key alignment | Cross-shard JOIN explodes to N²; ALL nodes scan | Co-locate by sharding key; use `GLOBAL` JOIN sparingly |
| `Nullable(Type)` everywhere | Nullable carries 1 bit/row + branch overhead; codecs less effective | Use sentinel values where semantics allow; reserve Nullable for true unknowns |
| Hand-rolled JOIN for ref data (users / accounts) | Memory blowup at scale | Dictionary (External Dict) + `dictGet*()` |
| Missing TTL on event tables | Cost balloon; old data slow merge | `TTL event_time + INTERVAL 90 DAY DELETE` |
| `OPTIMIZE TABLE FINAL` on production | Forces synchronous merge; blocks query path | Let background merges handle it; rare manual OPTIMIZE only at off-peak |

## Verification Checklist

- [ ] EXPLAIN PLAN/PIPELINE inspected for every hot query
- [ ] Sort key starts with the most-selective equality filter
- [ ] PARTITION BY chosen for the access pattern (time-series ⇒ time)
- [ ] Inserts batched (producer-side buffering or Buffer engine)
- [ ] TTL declared on event / log / metric tables
- [ ] LowCardinality applied to string columns with < ~10k distinct values
- [ ] Codecs (CODEC(ZSTD(level)) / Delta / DoubleDelta) tuned for data shape
- [ ] Materialised views target a real-time aggregate (not duplicate raw data)
- [ ] Dictionary lookups replace small-table JOINs
- [ ] Slow query log monitored (`system.query_log`)
- [ ] Disk usage + part count monitored (`system.parts`)
- [ ] Backup strategy via `clickhouse-backup` or managed-service equivalent

## Cross-References

- `~/.claude/skills/postgres-patterns/SKILL.md` — OLTP sister; ClickHouse is the OLAP complement
- `~/.claude/skills/dynamodb-patterns/SKILL.md` — operational NoSQL sister
- `~/.claude/skills/database-migrations/SKILL.md` — schema evolution discipline
- `~/.claude/skills/observability-patterns/SKILL.md` — ClickHouse is often the metrics / log store backend
- `~/.claude/rules-library/common/schema-evolution.md` — additive, reversible migrations
- `~/.claude/agents/database-reviewer.md` — Council Division 9 reviewer
- `~/.claude/agents/data-reviewer.md` — schema + analytics governance

## Why this skill exists

ClickHouse is the easiest-to-misuse OLAP engine in the market: it
accepts almost any SQL, hides cost beneath an interactive query
surface, and rewards naïve table designs with sub-second responses
on small data — then collapses at 100×. The patterns above codify
the production-ready posture: batched ingest, partition+sort key
discipline, materialised views over MUTATIONs, dictionaries over
JOINs, TTLs by default, EXPLAIN before merge. Teams that adopt
these scale from 1 GB to 100 TB without re-architecting; teams that
don't pay for it in merge stalls, "Too many parts" outages, and
ballooning storage cost.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Single-row INSERT into MergeTree (batching weakening — should be ≥ 1000 rows / batch)
- Query missing PRIMARY KEY prefix in WHERE clause (full-table scan)
- ORDER BY column not in sort key (sort-on-read latency balloon)
- Materialized view that re-aggregates the same data the source table already aggregates (cost duplication)
- Disk merging stuck (Too many parts warning — insert rate too high vs background merge)
- Dictionary lookup not used where it would replace a JOIN (perf opportunity)
- Skipping index (data_skipping_indices) absent on high-cardinality filter column
- TTL not declared on time-series table (cost balloon)
- Distributed table without sharding key (skewed shards)
- Query timing out via `max_execution_time` instead of optimised — slow-query log signal

**Refinement candidates**:

- New row in MergeTree engine selection guide (e.g., ReplicatedReplacingMergeTree, AggregatingMergeTree)
- New materialized-view pattern when a recurring real-time aggregation shape emerges
- New cross-reference when a sister skill (postgres-patterns, dynamodb-patterns, observability-patterns) adds an analytical pattern
- Tightening of the insert-batch rule when ingestion rate scales
