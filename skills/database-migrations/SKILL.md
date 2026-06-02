---
name: database-migrations
description: Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments across PostgreSQL, MySQL, and common ORMs (Prisma, Drizzle, Django, TypeORM, golang-migrate).
---

# Database Migration Patterns

Safe, reversible database schema changes for production systems.

## When to Activate

- Creating or altering database tables
- Adding/removing columns or indexes
- Running data migrations (backfill, transform)
- Planning zero-downtime schema changes
- Setting up migration tooling for a new project

## Core Principles

1. **Every change is a migration** — never alter production databases manually
2. **Migrations are forward-only in production** — rollbacks use new forward migrations
3. **Schema and data migrations are separate** — never mix DDL and DML in one migration
4. **Test migrations against production-sized data** — a migration that works on 100 rows may lock on 10M
5. **Migrations are immutable once deployed** — never edit a migration that has run in production

## Migration Safety Checklist

Before applying any migration:

- [ ] Migration has both UP and DOWN (or is explicitly marked irreversible)
- [ ] No full table locks on large tables (use concurrent operations)
- [ ] New columns have defaults or are nullable (never add NOT NULL without default)
- [ ] Indexes created concurrently (not inline with CREATE TABLE for existing tables)
- [ ] Data backfill is a separate migration from schema change
- [ ] Tested against a copy of production data
- [ ] Rollback plan documented

## PostgreSQL Patterns

### Adding a Column Safely

```sql
-- GOOD: Nullable column, no lock
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- GOOD: Column with default (Postgres 11+ is instant, no rewrite)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- BAD: NOT NULL without default on existing table (requires full rewrite)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
-- This locks the table and rewrites every row
```

### Adding an Index Without Downtime

```sql
-- BAD: Blocks writes on large tables
CREATE INDEX idx_users_email ON users (email);

-- GOOD: Non-blocking, allows concurrent writes
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- Note: CONCURRENTLY cannot run inside a transaction block
-- Most migration tools need special handling for this
```

### Renaming a Column (Zero-Downtime)

Never rename directly in production. Use the expand-contract pattern:

```sql
-- Step 1: Add new column (migration 001)
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Step 2: Backfill data (migration 002, data migration)
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- Step 3: Update application code to read/write both columns
-- Deploy application changes

-- Step 4: Stop writing to old column, drop it (migration 003)
ALTER TABLE users DROP COLUMN username;
```

### Removing a Column Safely

```sql
-- Step 1: Remove all application references to the column
-- Step 2: Deploy application without the column reference
-- Step 3: Drop column in next migration
ALTER TABLE orders DROP COLUMN legacy_status;

-- For Django: use SeparateDatabaseAndState to remove from model
-- without generating DROP COLUMN (then drop in next migration)
```

### Large Data Migrations

```sql
-- BAD: Updates all rows in one transaction (locks table)
UPDATE users SET normalized_email = LOWER(email);

-- GOOD: Batch update with progress
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users
      WHERE normalized_email IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % rows', rows_updated;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## Prisma (TypeScript/Node.js)

### Workflow

```bash
# Create migration from schema changes
npx prisma migrate dev --name add_user_avatar

# Apply pending migrations in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

### Schema Example

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  orders    Order[]

  @@map("users")
  @@index([email])
}
```

### Custom SQL Migration

For operations Prisma cannot express (concurrent indexes, data backfills):

```bash
# Create empty migration, then edit the SQL manually
npx prisma migrate dev --create-only --name add_email_index
```

```sql
-- migrations/20240115_add_email_index/migration.sql
-- Prisma cannot generate CONCURRENTLY, so we write it manually
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

## Drizzle (TypeScript/Node.js)

### Workflow

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (dev only, no migration file)
npx drizzle-kit push
```

### Schema Example

```typescript
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## Django (Python)

### Workflow

```bash
# Generate migration from model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Generate empty migration for custom SQL
python manage.py makemigrations --empty app_name -n description
```

### Data Migration

```python
from django.db import migrations

def backfill_display_names(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    batch_size = 5000
    users = User.objects.filter(display_name="")
    while users.exists():
        batch = list(users[:batch_size])
        for user in batch:
            user.display_name = user.username
        User.objects.bulk_update(batch, ["display_name"], batch_size=batch_size)

def reverse_backfill(apps, schema_editor):
    pass  # Data migration, no reverse needed

class Migration(migrations.Migration):
    dependencies = [("accounts", "0015_add_display_name")]

    operations = [
        migrations.RunPython(backfill_display_names, reverse_backfill),
    ]
```

### SeparateDatabaseAndState

Remove a column from the Django model without dropping it from the database immediately:

```python
class Migration(migrations.Migration):
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name="user", name="legacy_field"),
            ],
            database_operations=[],  # Don't touch the DB yet
        ),
    ]
```

## golang-migrate (Go)

### Workflow

```bash
# Create migration pair
migrate create -ext sql -dir migrations -seq add_user_avatar

# Apply all pending migrations
migrate -path migrations -database "$DATABASE_URL" up

# Rollback last migration
migrate -path migrations -database "$DATABASE_URL" down 1

# Force version (fix dirty state)
migrate -path migrations -database "$DATABASE_URL" force VERSION
```

### Migration Files

```sql
-- migrations/000003_add_user_avatar.up.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;
CREATE INDEX CONCURRENTLY idx_users_avatar ON users (avatar_url) WHERE avatar_url IS NOT NULL;

-- migrations/000003_add_user_avatar.down.sql
DROP INDEX IF EXISTS idx_users_avatar;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
```

## Zero-Downtime Migration Strategy

For critical production changes, follow the expand-contract pattern:

```text
Phase 1: EXPAND
  - Add new column/table (nullable or with default)
  - Deploy: app writes to BOTH old and new
  - Backfill existing data

Phase 2: MIGRATE
  - Deploy: app reads from NEW, writes to BOTH
  - Verify data consistency

Phase 3: CONTRACT
  - Deploy: app only uses NEW
  - Drop old column/table in separate migration
```

### Timeline Example

```text
Day 1: Migration adds new_status column (nullable)
Day 1: Deploy app v2 — writes to both status and new_status
Day 2: Run backfill migration for existing rows
Day 3: Deploy app v3 — reads from new_status only
Day 7: Migration drops old status column
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|-------------|-------------|-----------------|
| Manual SQL in production | No audit trail, unrepeatable | Always use migration files |
| Editing deployed migrations | Causes drift between environments | Create new migration instead |
| NOT NULL without default | Locks table, rewrites all rows | Add nullable, backfill, then add constraint |
| Inline index on large table | Blocks writes during build | CREATE INDEX CONCURRENTLY |
| Schema + data in one migration | Hard to rollback, long transactions | Separate migrations |
| Dropping column before removing code | Application errors on missing column | Remove code first, drop column next deploy |
| Long-running transaction holding table lock | Connection pool starves; downstream timeouts | Batch the data migration; commit per batch |
| Backfill loop with `WHERE id > $last` but no index on `id` | Sequential scan per batch | Verify primary-key / sequential index before backfill |
| Renaming column in one step | Old code still queries old name during deploy window | Add new column → dual-write → backfill → switch reads → drop old |
| Foreign-key add without `NOT VALID` | Locks both tables for validation | `ADD CONSTRAINT ... NOT VALID` then `VALIDATE CONSTRAINT` |
| Changing column type in place | Full table rewrite + downtime | Add new column with new type → backfill → swap → drop old |
| Migration that depends on application logic | Cannot be replayed deterministically | Migrations are pure SQL OR pure data-only scripts; not both |

## Purpose

Principal-level migration discipline: zero-downtime schema
evolution, expand-contract pattern, backfill batching, idempotent

- reversible migrations, blue/green schema compatibility, FK + index
add-without-lock semantics (Postgres `NOT VALID` / MySQL `ALGORITHM
INPLACE LOCK NONE`), the migration calendar (announce → deploy →
backfill → cutover → cleanup), and cross-ORM migration semantics
(Prisma / Drizzle / Django / TypeORM / golang-migrate / Alembic).

**Negative scope** (NOT what this skill covers):

- Application-level schema (Zod / Pydantic / class-validator) — out
- Data lake schema evolution (Iceberg / Delta) — separate domain
- NoSQL schema-less migration — see `dynamodb-patterns`
- ClickHouse analytics-side migration — see `clickhouse-io`

## When NOT to use

- Schema-less stores where each write may have its own shape — the
  application owns the shape contract instead
- Workloads where downtime is acceptable AND schema changes are rare
  (the discipline still helps, but is over-investment for the scale)
- Single-developer hobby projects without production users

## Standards Cited

- **PostgreSQL Documentation v17** — ALTER TABLE, CREATE INDEX
  CONCURRENTLY, NOT VALID + VALIDATE CONSTRAINT
- **MySQL Reference Manual 8.4** — Online DDL operations matrix
  (ALGORITHM=INPLACE, LOCK=NONE)
- **SQL:2023 (ISO/IEC 9075)** — DDL grammar
- **`~/.claude/rules-library/common/schema-evolution.md`** — expand-contract
- **`~/.claude/rules-library/common/deprecation-lifecycle.md`** — old-column
  retirement runway
- **OWASP ASVS 4.0.3 §1.4 (Architectural Documentation)** —
  versioned schema as ADR
- **NIST SP 800-53 Rev 5 CM-3 (Configuration Change Control)**

## Verification Checklist

- [ ] Migration is reversible OR a documented one-way exception
- [ ] Migration is idempotent (re-running is safe)
- [ ] EXPLAIN run on every ALTER on tables > 1M rows
- [ ] `CREATE INDEX` uses `CONCURRENTLY` (Postgres) / online DDL (MySQL)
- [ ] FK adds use `NOT VALID` + separate `VALIDATE CONSTRAINT`
- [ ] Backfills batched (≤ 10k rows per commit) with progress logging
- [ ] Expand-contract pattern used for any breaking change
- [ ] Old column retirement follows `deprecation-lifecycle.md`
- [ ] Migration tested against production-sized snapshot in staging
- [ ] Application deploys decoupled from migration deploys
- [ ] Rollback path documented + tested
- [ ] Migration runner has timeout + lock-wait limits configured

## Cross-References

- `~/.claude/skills/postgres-patterns/SKILL.md` — OLTP target
- `~/.claude/skills/clickhouse-io/SKILL.md` — OLAP migration shape
- `~/.claude/skills/dynamodb-patterns/SKILL.md` — NoSQL evolution
- `~/.claude/rules-library/common/schema-evolution.md` — expand-contract
- `~/.claude/rules-library/common/deprecation-lifecycle.md` — runway
- `~/.claude/rules-library/common/idempotency.md` — re-runnable migrations
- `~/.claude/agents/database-reviewer.md` — Council Division 9

## Why this skill exists

Migrations are where teams pay the deferred cost of every schema
shortcut they took during early development. Without zero-downtime
discipline, a single `ALTER TABLE ... ADD COLUMN NOT NULL` blocks
writes for minutes on a multi-million-row table; a one-step rename
breaks every running instance during deploy; a backfill in one
transaction holds locks until the connection pool exhausts. The
expand-contract pattern + online DDL + batched backfills + decoupled
deploys turn schema evolution from a calendared outage into a
non-event.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Migration not reversible (no down-migration; sister `schema-evolution.md` rule 2 violation)
- Migration not idempotent (re-run fails — rule 3 violation)
- `CREATE INDEX` without `CONCURRENTLY` on a > 1M row table (Postgres lock-wait)
- `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT x` on a populated table without bridge constraint (table rewrite)
- Schema + data backfill bundled in a single migration (long-transaction lock contention)
- Column dropped before consumer code removed (deploy ordering violated)
- Production-only schema change applied manually (no migration file in repo)
- Backfill UPDATE not batched (single transaction locks the table)
- Migration tested on dev (10k rows) but not production-sized data

**Refinement candidates**:

- New row in the anti-pattern table when a recurring migration failure class emerges
- Tightening of the "test against production size" gate when a recurring slow-migration incident recurs
- New cross-reference when a sister rule (schema-evolution, dependency-pinning, deploy-failures-become-checks) adds a migration gate
- New per-engine guidance when a new DB version's online-DDL semantics change (MySQL 8.4, Postgres 17 partitioning)
