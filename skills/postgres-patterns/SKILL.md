---
name: postgres-patterns
description: PostgreSQL database patterns for query optimization, schema design, indexing, and security. Based on Supabase best practices.
---

# PostgreSQL Patterns

Quick reference for PostgreSQL best practices. For detailed guidance, use the `database-reviewer` agent.

## When to Activate

- Writing SQL queries or migrations
- Designing database schemas
- Troubleshooting slow queries
- Implementing Row Level Security
- Setting up connection pooling

## Quick Reference

### Index Cheat Sheet

| Query Pattern | Index Type | Example |
|--------------|------------|---------|
| `WHERE col = value` | B-tree (default) | `CREATE INDEX idx ON t (col)` |
| `WHERE col > value` | B-tree | `CREATE INDEX idx ON t (col)` |
| `WHERE a = x AND b > y` | Composite | `CREATE INDEX idx ON t (a, b)` |
| `WHERE jsonb @> '{}'` | GIN | `CREATE INDEX idx ON t USING gin (col)` |
| `WHERE tsv @@ query` | GIN | `CREATE INDEX idx ON t USING gin (col)` |
| Time-series ranges | BRIN | `CREATE INDEX idx ON t USING brin (col)` |

### Data Type Quick Reference

| Use Case | Correct Type | Avoid |
|----------|-------------|-------|
| IDs | `bigint` | `int`, random UUID |
| Strings | `text` | `varchar(255)` |
| Timestamps | `timestamptz` | `timestamp` |
| Money | `numeric(10,2)` | `float` |
| Flags | `boolean` | `varchar`, `int` |

### Common Patterns

**Composite Index Order:**
```sql
-- Equality columns first, then range columns
CREATE INDEX idx ON orders (status, created_at);
-- Works for: WHERE status = 'pending' AND created_at > '2024-01-01'
```

**Covering Index:**
```sql
CREATE INDEX idx ON users (email) INCLUDE (name, created_at);
-- Avoids table lookup for SELECT email, name, created_at
```

**Partial Index:**
```sql
CREATE INDEX idx ON users (email) WHERE deleted_at IS NULL;
-- Smaller index, only includes active users
```

**RLS Policy (Optimized):**
```sql
CREATE POLICY policy ON orders
  USING ((SELECT auth.uid()) = user_id);  -- Wrap in SELECT!
```

**UPSERT:**
```sql
INSERT INTO settings (user_id, key, value)
VALUES (123, 'theme', 'dark')
ON CONFLICT (user_id, key)
DO UPDATE SET value = EXCLUDED.value;
```

**Cursor Pagination:**
```sql
SELECT * FROM products WHERE id > $last_id ORDER BY id LIMIT 20;
-- O(1) vs OFFSET which is O(n)
```

**Queue Processing:**
```sql
UPDATE jobs SET status = 'processing'
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY created_at LIMIT 1
  FOR UPDATE SKIP LOCKED
) RETURNING *;
```

### Anti-Pattern Detection

```sql
-- Find unindexed foreign keys
SELECT conrelid::regclass, a.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Check table bloat
SELECT relname, n_dead_tup, last_vacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

### Configuration Template

```sql
-- Connection limits (adjust for RAM)
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET work_mem = '8MB';

-- Timeouts
ALTER SYSTEM SET idle_in_transaction_session_timeout = '30s';
ALTER SYSTEM SET statement_timeout = '30s';

-- Monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Security defaults
REVOKE ALL ON SCHEMA public FROM public;

SELECT pg_reload_conf();
```

## Related

- Agent: `database-reviewer` - Full database review workflow
- Skill: `clickhouse-io` - ClickHouse analytics patterns
- Skill: `backend-patterns` - API and backend patterns

## Purpose

Principal-level PostgreSQL design + query optimisation: index strategy (B-tree / GIN / GIST / BRIN), partitioning, RLS for multi-tenant, JSONB column patterns, foreign-key + check constraint discipline, EXPLAIN ANALYZE reading, connection pooling, autovacuum tuning.

**Negative scope** (NOT what this skill covers):
- ORM-level query patterns (Hibernate / Django ORM / SQLAlchemy / Active Record) — see ORM-specific skills
- Migration tooling — see `database-migrations`
- DynamoDB / NoSQL — see `dynamodb-patterns`
- Analytical queries — see `clickhouse-io`
- Backup / DR / replication topology — defer to project-specific

## When NOT to use

- DynamoDB / Spanner / Cosmos DB workloads (different consistency / pricing models)
- Pure cache layer (use Redis)
- Time-series at high cardinality (use TimescaleDB extension OR ClickHouse)

## Standards Cited

- **PostgreSQL 17 Documentation** (`www.postgresql.org/docs/17/`) — canonical reference
- **SQL:2023 (ISO/IEC 9075)** — standard SQL semantics
- **The Art of PostgreSQL (Dimitri Fontaine)** — community-canonical reference
- **PostgreSQL Anti-Patterns (Markus Winand — Use The Index, Luke!)** — index strategy
- **OWASP ASVS 4.0.3 §13.3 (SQL Queries)** — parameterisation
- **CWE-89 (SQL Injection)** — bug class
- **PCI-DSS Requirement 3** — data-at-rest encryption applied to Postgres
- **NIST SP 800-53 Rev 5 AC-3 (Access Enforcement)** — RLS for access control

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `SELECT *` in production code | Schema drift breaks consumers; over-fetch | Explicit column list |
| Index on every column | Write amplification; query planner confused | Index based on actual query predicates; review with `pg_stat_user_indexes` |
| `WHERE created_at::date = '2026-01-01'` | Cast breaks index use | Range predicate: `WHERE created_at >= '2026-01-01' AND created_at < '2026-01-02'` |
| `JSONB` for everything (no top-level columns) | Slow GROUP BY / index | Promote frequently-queried JSONB keys to top-level columns |
| `serial` for new primary keys | Pre-PG10; use `IDENTITY` | `GENERATED ALWAYS AS IDENTITY` (SQL standard) |
| `pg_dump` for terabyte-scale backup | Slow + load on prod | `pg_basebackup` + WAL streaming OR managed PITR |
| No foreign keys "for performance" | Orphan rows; integrity loss | FKs are cheap with proper indexes; absence is a debt |
| Connection-per-request | Pool exhaustion + 100ms+ connect overhead | PgBouncer transaction-mode for short queries; session-mode for prepared statements |
| `OFFSET 1000000` for pagination | Linear scan to offset | Keyset / seek pagination with WHERE on indexed column |
| `LIKE 'foo%'` with trailing wildcard but no index | Seq scan | `text_pattern_ops` index OR `pg_trgm` GIN index |
| Disabling autovacuum to "improve performance" | Bloat catastrophe | Tune `autovacuum_vacuum_cost_limit` instead |

## Verification Checklist

- [ ] EXPLAIN ANALYZE confirms index usage on all hot queries
- [ ] Foreign keys + check constraints on every relationship / invariant
- [ ] All queries parameterised; no string-interpolated user input
- [ ] PgBouncer (or equivalent) configured; pool size matches workload
- [ ] Autovacuum tuned for write volume (`autovacuum_vacuum_scale_factor`)
- [ ] RLS policies for multi-tenant tables (verified with non-superuser test)
- [ ] JSONB columns have GIN indexes only where queries need them
- [ ] Slow query log enabled (`log_min_duration_statement = 200`)
- [ ] Partitioning for tables > 100M rows (range / list / hash per access pattern)
- [ ] Backups verified via restore drill, not just creation

## Cross-References

- `~/.claude/skills/database-migrations/SKILL.md` — schema change discipline
- `~/.claude/skills/backend-patterns/SKILL.md` — service layer
- `~/.claude/skills/dynamodb-patterns/SKILL.md` — NoSQL alternative
- `~/.claude/skills/clickhouse-io/SKILL.md` — OLAP alternative
- `~/.claude/rules/common/schema-evolution.md` — expand-contract
- `~/.claude/rules/sql/no-discards.md` — SQL pattern hooks
- `~/.claude/agents/database-reviewer.md` — Council Division 9
- `~/.claude/agents/security-reviewer.md` — RLS / SQL-injection review

## Why this skill exists

Postgres is the most powerful open-source RDBMS — and the easiest to misuse: missing indexes, JSONB-everywhere schemas, OFFSET pagination, disabled autovacuum, queries that look fast on 10K rows and grind to a halt at 10M. The patterns above codify the production-ready posture: parameterised queries, intentional indexing, RLS for tenancy, EXPLAIN ANALYZE before merge, PgBouncer for connection management. Apps following these defaults survive growth without DB-rewrite quarters.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Sequential scan on table > 100k rows (missing index — EXPLAIN ANALYZE shows Seq Scan)
- N+1 query pattern in handler (multiple round-trips when a JOIN / IN-clause would suffice)
- Long-running transaction holding locks > 10s (advisory + connection-pool starvation risk)
- `SELECT *` in production code (over-fetch + schema-evolution coupling)
- Missing RLS policy on a new multi-tenant table (per `~/.claude/rules/common/no-ambient-globals.md`)
- DDL change without `CREATE INDEX CONCURRENTLY` (lock-the-world risk)
- Backfill UPDATE on full table without batching (long-transaction lock contention)
- JSONB column queried without GIN index (sequential scan on every query)
- Connection-pool exhaustion event in production (PgBouncer / pgpool not tuned)
- Foreign key without index on referencing column (cascade-delete becomes Seq Scan)

**Refinement candidates**:
- New query-pattern row when a recurring access pattern surfaces (e.g., reverse-chronological with cursor)
- New index template when a slow-query alert fires repeatedly
- Tightening of the RLS template when a new multi-tenant table is added
- New cross-reference when a sister skill (database-migrations, dynamodb-patterns, clickhouse-io) adds a related pattern

---

*Based on [Supabase Agent Skills](https://github.com/supabase/agent-skills) (MIT License)*
