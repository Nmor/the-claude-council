# Schema Evolution Rule (Always-On, Global)

> Auto-fires on every file. Sister to `api-versioning.md` (API-side
> versioning), `contract-testing.md` (verify the shape),
> `deprecation-lifecycle.md` (retire schema fields),
> `data-retention.md` (data lives on across schema changes),
> `idempotency.md` (re-runnable migrations). Standards: **Avro
> evolution rules**, **Protocol Buffers — Updating a Message
> Type**, **Confluent Schema Registry compatibility modes**,
> **PostgreSQL DDL transactional semantics**, **expand-contract
> migration pattern**.

## Core Principle

**Database schemas, event payloads, stored documents, message
formats — anything written by one version of code and read by
another — evolve through ADDITIVE, REVERSIBLE, ZERO-DOWNTIME
migrations. Breaking changes ship as parallel schemas during a
deprecation window; old + new readers and writers coexist until
the migration is complete.**

Schema evolution is harder than API evolution because the data
already exists. Renaming a field in an API affects future
requests; renaming a column affects every row already written.

## Compatibility modes

| Mode | Old readers ↔ new data | New readers ↔ old data | When to use |
| --- | --- | --- | --- |
| **Backward** | Old reader can read new data | New reader can read old data is NOT required | Default — producers upgrade first |
| **Forward** | Old reader can read new data is NOT required | New reader can read old data | Consumers upgrade first |
| **Full** | Both directions | Both directions | Symmetric — safest, most restrictive |
| **None** | Anything goes | Anything goes | Test/dev only |

For most production systems: **Backward compatibility** is the
default — producers (services that emit events / write rows)
upgrade first; consumers (services that read) keep working with
both old and new shapes during the transition.

## Expand-contract migration pattern

The canonical zero-downtime schema change:

### Phase 1: EXPAND

- Add new columns / fields / formats WITHOUT removing the old
- Code writes to BOTH old + new
- Code reads from old (still authoritative)
- Backfill old → new (background migration)

### Phase 2: TRANSITION

- Code reads from NEW (now authoritative)
- Code writes to BOTH (still)
- Old data still exists; comparison + rollback possible

### Phase 3: CONTRACT

- Code stops writing to OLD
- Old column is DROP-ready (no consumer)

### Phase 4: REMOVE

- DROP COLUMN
- Final cleanup

Each phase ships separately. The PR boundaries match the phase
boundaries. Rollback at any phase reverts to the previous phase
safely.

## Hard rules

### 1. Migrations are ADDITIVE in production

A single migration that does BOTH "add new column" AND "drop
old column" requires the code to be deployed in two states
atomically — impossible without downtime. Split.

The rule: **never DROP, RENAME, or change the TYPE of a column
in the same migration that adds new state.**

### 2. Migrations are REVERSIBLE

Every migration has a tested rollback path:

- `ADD COLUMN` → `DROP COLUMN`
- `CREATE TABLE` → `DROP TABLE`
- `ADD INDEX` → `DROP INDEX`
- Data backfill → reverse-backfill script

Irreversible migrations (e.g., dropping data) require explicit
backup + sign-off; rollback means restoring from backup.

### 3. Migrations are RE-RUNNABLE (idempotent)

Per `idempotency.md` — running a migration twice is a no-op.
Use `IF NOT EXISTS` / `IF EXISTS`:

```sql
-- BAD — fails on retry
CREATE INDEX orders_status_idx ON orders (status);

-- GOOD — safe to re-run
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
```

Re-runnable migrations survive partial-run failures and parallel
deploys.

### 4. Long-running migrations don't block writes

- **PostgreSQL**: `CREATE INDEX CONCURRENTLY` (slower but
  non-blocking); `ALTER TABLE` of NOT NULL on a populated column
  requires a temporary check constraint, NOT a direct ALTER
- **MySQL**: `ALGORITHM=INPLACE, LOCK=NONE` for compatible
  changes; pt-online-schema-change for complex ones
- **MongoDB**: schema changes are application-level; backfills
  via batched updates with sleep between batches
- **DynamoDB**: schema-less at the table level; new attributes
  are additive by definition; GSI creation is async

Lock-acquiring DDL on production tables > 1M rows is an outage
in waiting.

### 5. Backfills are batched + rate-limited

A backfill UPDATE that touches every row is a transaction that
locks the table:

```sql
-- BAD — single transaction over 50M rows
UPDATE users SET email_lower = LOWER(email) WHERE email_lower IS NULL;

-- GOOD — batched with progress + sleep
DO $$
DECLARE
  affected INT;
BEGIN
  LOOP
    UPDATE users SET email_lower = LOWER(email)
    WHERE id IN (
      SELECT id FROM users
      WHERE email_lower IS NULL
      LIMIT 1000
    );
    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    PERFORM pg_sleep(0.1);  -- yield to readers
    COMMIT;
  END LOOP;
END $$;
```

Better: a dedicated background worker that processes in batches
with metrics + the ability to pause.

### 6. Event schemas use a schema registry

Kafka / Pulsar / EventBridge / SNS events MUST be versioned via
schema registry:

- **Confluent Schema Registry** for Kafka (Avro, Protobuf, JSON
  Schema)
- **Amazon EventBridge Schema Registry** for AWS
- **Apicurio** as a self-hosted option

The registry enforces compatibility on schema evolution:
producers can't publish a breaking change without explicit
registry override (which requires consumer coordination).

### 7. NULL-able first, then required later

When adding a new field that should eventually be REQUIRED:

1. Add as NULLABLE (no constraint)
2. Application writes the field for new records
3. Backfill existing records
4. Once 100% non-null, ADD CONSTRAINT NOT NULL (cheap if all
   rows already non-null)
5. Update the schema registry / type definitions

Adding NOT NULL on a populated column with a non-default value
is an outage.

### 8. Renames are TWO migrations + a deprecation window

To rename column `email` → `email_address`:

1. Migration A: add `email_address` (nullable). Backfill from
   `email`.
2. Code: dual-write to both columns. Read from `email_address`.
3. Deprecation window (per `deprecation-lifecycle.md`): warn
   consumers, update queries.
4. Migration B: drop `email`.

NEVER `ALTER COLUMN email RENAME TO email_address` in one shot
on a live system.

### 9. Generated columns + computed fallbacks bridge migrations

PostgreSQL `GENERATED ALWAYS AS (... ) STORED` columns let you
present a new shape while old writers still emit the old:

```sql
ALTER TABLE orders ADD COLUMN total_cents INTEGER
  GENERATED ALWAYS AS (total_dollars * 100) STORED;
```

Consumers can migrate to `total_cents`; producers continue
writing `total_dollars` until they're ready.

### 10. Test schema migrations on production-sized data

A migration that runs in 30 seconds in dev (10K rows) can take
8 hours in production (50M rows) with locking. The pre-deploy
gate:

- **Restore a recent prod backup** into a staging environment
- Run the migration against the restored data
- Measure time + lock contention
- Validate the rollback path works

Per `deploy-failures-become-checks.md` — every observed
migration class becomes a documented gate.

## Per-store specifics

### PostgreSQL

| Change | Safe online? | Notes |
| --- | --- | --- |
| `ADD COLUMN ... NULL` | Yes | Constant-time (PG 11+) |
| `ADD COLUMN ... DEFAULT x` | Yes (PG 11+) | Default stored in catalog, not rewritten |
| `ADD COLUMN ... NOT NULL DEFAULT x` | Yes (PG 11+) | Same as above |
| `ALTER COLUMN ... SET NOT NULL` | Slow | Scans table; use CHECK constraint first as bridge |
| `ALTER COLUMN ... TYPE` | Slow (rewrite) | Use temp column + backfill + swap |
| `CREATE INDEX` | LOCK | Use `CONCURRENTLY` |
| `DROP COLUMN` | Fast | Logical drop, physical space reclaimed by VACUUM |
| `RENAME COLUMN` | Fast | Metadata-only |
| `ALTER TABLE ... ADD CONSTRAINT FK ... NOT VALID` | Fast | Use NOT VALID then VALIDATE separately |

### MySQL / MariaDB

| Change | Notes |
| --- | --- |
| Online DDL (5.7+) | Many changes support `ALGORITHM=INPLACE, LOCK=NONE` |
| pt-online-schema-change | Percona Toolkit for complex changes |
| gh-ost | GitHub's online schema migration tool |

### MongoDB

- Schema-less; new fields are additive at the application level
- Validation rules via `$jsonSchema` validators (added without
  rewriting existing docs)
- Migration scripts iterate via `find` + `updateMany` in batches

### DynamoDB

- Table-level: items can have heterogeneous shapes
- GSI changes: ADD GSI is online (slow); DELETE GSI is fast;
  CHANGE GSI requires create-new + delete-old
- TTL changes: instant
- Per-table-class changes (Standard ↔ IA): online

### Event streams (Kafka)

Avro / Protobuf / JSON Schema:

| Change | Backward compat | Forward compat | Full compat |
| --- | --- | --- | --- |
| Add field (with default) | Yes | Yes | Yes |
| Add field (required) | No | Yes | No |
| Remove field (had default) | Yes | No | No |
| Remove field (required) | No | No | No |
| Rename field | No | No | No |
| Change field type | Depends | Depends | No |
| Add enum value | Yes | No | No (use placeholder) |
| Remove enum value | No | Yes | No |

Confluent Schema Registry's BACKWARD / FORWARD / FULL modes
enforce these rules automatically.

## Anti-patterns

### Anti-pattern 1: Single "fix the schema" migration

A migration that adds 5 columns, drops 3, renames 2, and
reshapes JSON → ROW types is impossible to review, impossible
to roll back, and almost certainly will fail in production.
Split into one logical change per migration.

### Anti-pattern 2: Production-only schema

Migrations that exist as raw SQL the DBA ran manually, not in
version control, are time bombs. Every schema change goes
through:

- A migration file in the repo (sqitch, Flyway, golang-migrate,
  alembic, ActiveRecord, Knex, prisma-migrate)
- Reviewed PR
- Applied via CI / deploy pipeline
- Audit-logged (per `audit-logging.md`)

### Anti-pattern 3: Implicit schema in JSON columns

A `metadata JSONB` column with no documented shape becomes a
write-anything dumping ground. Either:

- Promote fields to typed columns when they stabilise
- Document the JSON shape in a JSON Schema file
- Validate writes against the schema

### Anti-pattern 4: Breaking compat in event payloads

A producer that "just updates the event shape" breaks every
downstream consumer that's been deployed in the last six
months. Event schemas evolve like API contracts — additive
only, registry-enforced.

### Anti-pattern 5: Backfills as inline SQL

A migration file that includes `UPDATE 50M rows` in the same
transaction as `ALTER TABLE` is two outages: the DDL waits for
the DML, the DML holds the lock, all writes queue. Backfills
are separate, batched, observable.

## Tooling

| Tool | Use |
| --- | --- |
| **Flyway** | Java-ecosystem migrations |
| **Liquibase** | XML/YAML/SQL migrations, cross-DB |
| **golang-migrate** | Go-ecosystem migrations |
| **Alembic** | Python/SQLAlchemy migrations |
| **ActiveRecord migrations** | Rails |
| **Knex** / **Sequelize** / **Prisma Migrate** | Node.js |
| **sqitch** | DB-agnostic, dependency-aware |
| **pt-online-schema-change** | MySQL online DDL |
| **gh-ost** | MySQL online schema migration |
| **Squitch** | DB-agnostic CLI |
| **Confluent Schema Registry** | Kafka event evolution |
| **Apicurio Registry** | Open-source event registry |
| **buf** | Protobuf schema breaking-change detection |

## Cross-references

- `api-versioning.md` — API-level versioning depends on
  schema-level discipline
- `contract-testing.md` — verify the contract; schema is part
  of the contract
- `deprecation-lifecycle.md` — schema fields deprecate on a
  calendar
- `idempotency.md` — migrations are idempotent
- `data-retention.md` — schema changes don't change retention
  obligations
- `audit-logging.md` — schema changes are audited
- `task-intake-due-diligence.md` Q10 (data lifecycle), Q17
  (rollback)
- `error-codes.md` — `schema_version_mismatch`, `field_required`,
  `field_deprecated` codes

## Standards cited

- **Confluent Schema Registry — Compatibility Modes**
- **Avro Specification — Schema Resolution**
- **Protocol Buffers — Updating A Message Type**
- **JSON Schema Draft 2020-12**
- **PostgreSQL Documentation — DDL Concurrency**
- **MySQL Reference Manual — Online DDL**
- **AsyncAPI 3.0** — async API schemas
- **Expand-Contract pattern** — formalised by Pramod Sadalage +
  Scott Ambler in "Refactoring Databases" (2006)

## Why this rule exists

Schema migrations are the leading cause of "the deploy broke
production":

1. New column added with NOT NULL DEFAULT → 4-hour table rewrite
   → downtime
2. Column rename → old code still queries old name → 500s for
   minutes after deploy
3. Event payload field renamed → consumers can't deserialise →
   message backlog grows → SLA breached
4. Migration ran in dev, looks fine, deploys → prod has 1000x
   the data → migration takes 8 hours → can't roll back
5. Backfill UPDATE locks table → read traffic backs up → outage

Each one is a known pattern with a known mitigation. The cost
of expand-contract + zero-downtime DDL discipline is more
migration files (5 instead of 1) and a longer calendar for the
change. The cost of skipping it is production incidents that
take hours to recover from.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Migration combining ADD + DROP / RENAME in a single step (rule 1 violation — not zero-downtime)
- Long-running DDL on a populated table without CONCURRENTLY / online tooling (rule 4 weakening)
- Backfill UPDATE wrapped in one transaction over millions of rows (rule 5 violation — table-locking)
- New event payload shape published without schema-registry compatibility check (rule 6 weakening)
- ALTER COLUMN TYPE on a populated column (per-store specific risk)
- Column rename done in one step rather than expand-contract (rule 8 violation)
- Migration not tested on production-sized data (rule 10 weakening — dev-only validation)
- Hand-applied DDL discovered in prod (anti-pattern 2 — out-of-VCS migration)

**Refinement candidates**:
- New row in the per-store change-safety table when a DB version changes lock semantics
- Tightening of the "test on prod-sized data" gate when migration-time-bomb incidents recur
- New cross-reference when a sister rule (api-versioning, contract-testing) defines the API contract this rolls up to
- New tooling row when an online schema migration tool gains adoption
