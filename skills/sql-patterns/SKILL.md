---
name: sql-patterns
description: SQL discipline — lowercase keywords (modern convention; consistent project-wide), explicit column names (no SELECT * in production), UTC timestamps (TIMESTAMPTZ in Postgres), singular vs plural table names consistent, explicit JOIN (no implicit comma-joins), CTEs over deeply nested subqueries, named indexes, NULL-aware semantics (NULL = NULL is UNKNOWN; use IS NULL), parameterised queries always (no string interpolation), DELETE/UPDATE always with WHERE, migrations idempotent + reversible (expand-contract pattern), sqlfluff strict + squawk Postgres migration safety. Auto-fires on SQL sources.
paths:
  - "**/*.sql"
  - "**/migrations/**/*.sql"
  - "**/db/**/*.sql"
  - "**/schema.sql"
  - "**/seeds/**/*.sql"
---

> Migrated 2026-06-02 from `~/.claude/rules-library/sql/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# sql-patterns

<!-- ============================================================
     Section: sql/coding-style.md
     ============================================================ -->

# SQL Coding Style

> Auto-fires on every `*.sql`, `migrations/**`, `db/**` file.
> Standards: **SQL:2023 (ISO/IEC 9075)**, **PostgreSQL Style Guide**,
> **Mode Analytics SQL Style Guide**, **GitLab Data Team SQL Style
> Guide**, **sqlfluff** (linter / formatter).

## Core Principle

**Lowercase keywords (modern convention; both `SELECT` and `select`
are widely used — pick ONE per project); explicit column names
(no `SELECT *` in production); UTC timestamps (`TIMESTAMPTZ` in
Postgres); singular table names + plural rare exceptions, OR
plural everywhere — pick ONE; explicit `JOIN` (no implicit
comma-joins); CTEs over deeply nested subqueries; named indexes;
NULL semantics understood (`NULL = NULL` is `UNKNOWN`).**

## Formatting

```sql
-- One-clause-per-line; trailing commas-first for diff-friendly edits
select
    o.id
  , o.customer_id
  , o.total
  , o.created_at
from orders as o
inner join customers as c on c.id = o.customer_id
where o.status = 'paid'
  and o.created_at >= now() - interval '30 days'
order by o.created_at desc
limit 100;
```

## Naming

| Object | Convention | Example |
| --- | --- | --- |
| Table | `snake_case`, plural | `orders`, `users`, `payment_intents` |
| Column | `snake_case` | `customer_id`, `created_at` |
| Primary key | `id` (BIGINT / UUID) | `id` |
| Foreign key | `<table>_id` | `customer_id` |
| Index | `idx_<table>_<col>[_<col>...]` | `idx_orders_customer_id` |
| Unique index | `uniq_<table>_<col>` | `uniq_users_email` |
| Constraint | `<table>_<col>_check` | `orders_total_positive_check` |
| Sequence | `<table>_<col>_seq` | `orders_id_seq` |
| Function / proc | `snake_case`, verb | `calculate_order_total` |
| View | `<table>_<purpose>_view` OR `vw_*` | `orders_active_view` |
| Materialised view | `<purpose>_mv` | `daily_revenue_mv` |

## Hard rules

### 1. No `SELECT *` in production

```sql
-- FORBIDDEN
select * from orders;

-- CORRECT
select id, customer_id, total, created_at from orders;
```

`SELECT *` breaks every consumer when a column is added; column
order is unstable; ORM round-tripping breaks.

### 2. Explicit JOIN syntax

```sql
-- FORBIDDEN — implicit join (ANSI SQL-89)
select o.id, c.name
from orders o, customers c
where o.customer_id = c.id;

-- CORRECT — explicit JOIN
select o.id, c.name
from orders as o
inner join customers as c on c.id = o.customer_id;
```

### 3. Always specify the JOIN type

```sql
-- FORBIDDEN — ambiguous
select ... from a join b on ...;

-- CORRECT
select ... from a inner join b on ...;
select ... from a left  join b on ...;
select ... from a right join b on ...;
select ... from a full  join b on ...;
```

### 4. CTEs over deeply nested subqueries

```sql
-- FORBIDDEN — unreadable
select * from (
    select * from (
        select id, sum(total) as t from orders group by id
    ) x where x.t > 100
) y order by y.t;

-- CORRECT — CTE
with order_totals as (
    select id, sum(total) as total
    from orders
    group by id
),
significant as (
    select id, total
    from order_totals
    where total > 100
)
select id, total
from significant
order by total desc;
```

### 5. Timestamps in UTC

```sql
-- WRONG (Postgres)
created_at timestamp,                       -- no zone

-- CORRECT
created_at timestamptz default now() not null,
```

For MySQL: use `DATETIME` + store UTC explicitly OR `TIMESTAMP`
(auto-UTC). For SQLite: store ISO-8601 strings.

### 6. NOT NULL by default

```sql
-- FORBIDDEN — every column nullable by default
create table users (
    id bigint primary key,
    email text,
    created_at timestamptz
);

-- CORRECT — explicit nullability
create table users (
    id bigint primary key generated always as identity,
    email text not null,
    created_at timestamptz not null default now(),
    deleted_at timestamptz null  -- nullable on purpose
);
```

### 7. Foreign keys with ON DELETE/ON UPDATE

```sql
-- FORBIDDEN — ambiguous cascade behaviour
alter table orders
  add constraint orders_customer_fk
  foreign key (customer_id) references customers(id);

-- CORRECT — explicit
alter table orders
  add constraint orders_customer_fk
  foreign key (customer_id) references customers(id)
  on update cascade
  on delete restrict;  -- or set null / cascade based on semantics
```

### 8. Check constraints for invariants

```sql
alter table orders
  add constraint orders_total_positive
  check (total >= 0);

alter table users
  add constraint users_email_format
  check (email ~ '^[^@]+@[^@]+\.[^@]+$');
```

### 9. Index every foreign key

```sql
create index idx_orders_customer_id on orders(customer_id);
create index idx_order_items_order_id on order_items(order_id);
```

Postgres does NOT auto-index foreign keys. Without the index,
DELETE on the referenced row scans the referencing table.

### 10. EXPLAIN every non-trivial query

Before merging:

```sql
explain analyze select ... from ...;
```

Watch for:

- `Seq Scan` on large tables (need index)
- `Nested Loop` with high row counts (might need hash join)
- High `loops=` on inner side (N+1 in disguise)

## Migration style

```sql
-- migrations/2026-05-26-add-orders-shipping-address.sql
-- ADD a nullable column first; backfill; then add NOT NULL
-- (per ~/.claude/rules-library/common/schema-evolution.md)

begin;

alter table orders
  add column shipping_address jsonb null;

-- Backfill in batches (separate migration / job for large tables)

commit;

-- Later migration:
begin;
alter table orders
  alter column shipping_address set not null;
commit;
```

Per `schema-evolution.md` — additive, reversible, idempotent.

## Required tooling

```bash
sqlfluff lint --dialect postgres migrations/
sqlfluff fix --dialect postgres migrations/
# or for MySQL
sqlfluff lint --dialect mysql ...
```

`.sqlfluff`:

```ini
[sqlfluff]
dialect = postgres
templater = jinja
max_line_length = 100
exclude_rules = L034,L036

[sqlfluff:rules:capitalisation.keywords]
capitalisation_policy = lower

[sqlfluff:rules:capitalisation.identifiers]
extended_capitalisation_policy = lower

[sqlfluff:indentation]
indent_unit = space
indented_joins = true
```

## Cross-references

- `~/.claude/rules-library/common/coding-style.md`
- `~/.claude/rules-library/sql/no-discards.md`
- `~/.claude/rules-library/sql/security.md`
- `~/.claude/rules-library/sql/testing.md`
- `~/.claude/rules-library/sql/patterns.md`
- `~/.claude/rules-library/common/schema-evolution.md`
- SQL:2023 standard (ISO/IEC 9075)
- PostgreSQL Coding Style (postgresql.org)
- Mode SQL Style Guide
- GitLab Data Team SQL Style Guide

---

<!-- ============================================================
     Section: sql/hooks.md
     ============================================================ -->

# SQL Hooks

> Auto-fires on every `*.sql`, `migrations/**`, `db/**` file.
> Sister to `~/.claude/rules-library/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_sql=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.sql$' || true)
[ -z "$staged_sql" ] && exit 0

# Lint
sqlfluff lint --dialect postgres $staged_sql

# Migration safety (Postgres)
staged_migrations=$(echo "$staged_sql" | grep -E 'migrations/' || true)
if [ -n "$staged_migrations" ]; then
    squawk $staged_migrations
fi
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Apply migrations against a fresh test DB
docker compose -f docker-compose.test.yml up -d postgres
until pg_isready -h localhost -p 5433; do sleep 1; done
flyway -url=jdbc:postgresql://localhost:5433/testdb migrate

# Run pgTAP tests
pg_prove -h localhost -p 5433 -d testdb tests/sql/*.sql

docker compose -f docker-compose.test.yml down -v
```

## sqlfluff config

`.sqlfluff` (per-project root):

```ini
[sqlfluff]
dialect = postgres
templater = jinja
max_line_length = 100
sql_file_exts = .sql,.sql.j2,.dml,.ddl

[sqlfluff:rules:capitalisation.keywords]
capitalisation_policy = lower

[sqlfluff:rules:capitalisation.identifiers]
extended_capitalisation_policy = lower

[sqlfluff:rules:capitalisation.functions]
extended_capitalisation_policy = lower

[sqlfluff:rules:capitalisation.literals]
capitalisation_policy = lower

[sqlfluff:rules:capitalisation.types]
extended_capitalisation_policy = lower

[sqlfluff:rules:layout.long_lines]
ignore_comment_lines = true

[sqlfluff:rules:layout.indent]
indent_unit = space
tab_space_size = 4

[sqlfluff:indentation]
indented_joins = true
indented_using_on = true
template_blocks_indent = true

[sqlfluff:rules:references.consistent]
force_enable = true

[sqlfluff:rules:ambiguous.column_references]
group_by_and_order_by_style = explicit
```

## squawk config (Postgres migration safety)

`.squawk.toml`:

```toml
excluded_rules = []  # all rules on

[ban-drop-column]
on = true

[require-concurrent-index-creation]
on = true

[adding-required-field]
on = true

[adding-field-with-default]
on = true

[changing-column-type]
on = true

[adding-foreign-key-constraint]
on = true

[disallowed-unique-constraint]
on = true

[constraint-missing-not-valid]
on = true

[transaction-nesting]
on = true
```

## CI workflow

```yaml
name: SQL CI

on:
  pull_request:
    paths:
      - '**/*.sql'
      - 'migrations/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-python@<sha>
        with: { python-version: '3.12' }
      - run: pip install sqlfluff squawk-cli

      - name: sqlfluff lint
        run: sqlfluff lint --dialect postgres migrations/ queries/

      - name: squawk (migration safety)
        run: squawk migrations/*.sql

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@<sha>
      - name: Install pgTAP
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-16-pgtap libtap-parser-sourcehandler-pgtap-perl

      - name: Apply migrations
        run: |
          PGPASSWORD=test psql -h localhost -U postgres -d postgres -c 'create database testdb'
          flyway -url=jdbc:postgresql://localhost/testdb -user=postgres -password=test migrate

      - name: Apply migrations again (idempotency)
        run: flyway -url=jdbc:postgresql://localhost/testdb -user=postgres -password=test migrate

      - name: Run pgTAP tests
        run: PGPASSWORD=test pg_prove -h localhost -U postgres -d testdb tests/sql/*.sql

  cve-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - name: Trivy DB image scan
        uses: aquasecurity/trivy-action@<sha>
        with:
          image-ref: 'postgres:16-alpine'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'
```

## Cross-references

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/common/schema-evolution.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/sql/no-discards.md`
- `~/.claude/rules-library/sql/testing.md`
- sqlfluff docs (sqlfluff.com)
- squawk docs (squawkhq.com)
- Flyway docs (flywaydb.org)

---

<!-- ============================================================
     Section: sql/no-discards.md
     ============================================================ -->

# SQL — No-Discards Extension

> Auto-fires on every `*.sql`, `migrations/**`, `db/**` file.
> Extends `~/.claude/rules-library/common/no-discards.md`. Tooling:
> **sqlfluff** strict; **psql --echo-errors**; **pg_lint**;
> **squawk** (Postgres migration safety).

## Core Principle

**Every query parameterised; no string interpolation; explicit
COMMIT / ROLLBACK; no `SELECT *` in production; no implicit
type coercion (`'1' = 1` works in MySQL, breaks in Postgres);
no DELETE / UPDATE without WHERE; every migration reversible;
every long-running statement bounded by `statement_timeout`.**

## Banned patterns

### 1. String interpolation in queries (SQL injection)

```python
# FORBIDDEN — Python example; same applies in any language
cur.execute(f"SELECT * FROM users WHERE id = '{user_id}'")
cur.execute("SELECT * FROM users WHERE id = '%s'" % user_id)

# CORRECT — parameterised
cur.execute("SELECT id, email FROM users WHERE id = %s", (user_id,))
```

```sql
-- In stored procedures, use EXECUTE FORMAT with proper escaping or
-- USING parameters:

-- FORBIDDEN
execute 'select * from ' || quote_ident(table_name) || ' where id = ''' || id || '''';

-- CORRECT
execute 'select * from ' || quote_ident(table_name) || ' where id = $1'
  using id;
```

### 2. `DELETE` / `UPDATE` without `WHERE`

```sql
-- FORBIDDEN — wipes the table
delete from orders;
update orders set status = 'cancelled';

-- CORRECT — intentional full deletion uses TRUNCATE explicitly
truncate orders;  -- with documentation
```

`safe-updates` mode in MySQL prevents accidental table-wide
modifications:

```sql
set sql_safe_updates = 1;
```

Postgres has no equivalent flag — code review + linting catches.

### 3. `SELECT *` (covered in coding-style)

Explicit column lists; never `*` except in EXPLAIN or
quick-check exploratory queries.

### 4. No transactional boundary

```sql
-- FORBIDDEN — multi-row operations without transaction
update orders set status = 'paid' where id = 1;
update payments set order_id = 1 where intent_id = 2;
-- If second statement fails, first is committed; orders + payments out of sync

-- CORRECT
begin;
update orders set status = 'paid' where id = 1;
update payments set order_id = 1 where intent_id = 2;
commit;
```

Or wrap at the application layer (Spring `@Transactional`,
SQLAlchemy `session.begin()`, etc.).

### 5. Implicit type coercion

```sql
-- WRONG in Postgres (errors); silently wrong in MySQL
select * from users where id = '42';  -- id is bigint, '42' is text

-- CORRECT
select * from users where id = 42;
-- OR with explicit cast
select * from users where id = '42'::bigint;
```

### 6. NULL comparison with `=` / `<>`

```sql
-- FORBIDDEN — NULL = NULL is UNKNOWN, not TRUE
where status = null;
where status <> null;

-- CORRECT
where status is null;
where status is not null;
where status is distinct from 'cancelled';  -- NULL-safe inequality (Postgres)
```

### 7. `count(*)` on huge tables in production

```sql
-- WRONG — full table scan on big tables
select count(*) from orders;  -- 100M rows; takes minutes

-- CORRECT — use approximate count from system catalogs (Postgres)
select reltuples::bigint as approx_count
from pg_class where relname = 'orders';

-- Or maintain a counter via trigger / outbox
```

### 8. Unbounded `IN ( ... )` lists

```sql
-- FORBIDDEN — 10,000-element IN list crashes plan optimiser
where id in (1, 2, 3, ..., 10000)

-- CORRECT — values / array / temp table
where id in (select id from temp_ids);
where id = any($1::bigint[]);  -- Postgres array
```

### 9. ORM N+1 queries

Application-side; surface via:

```sql
explain analyze ...;
```

Watch for `Loops=N` where N > expected. Fix with `JOIN` or
batch fetch (ORM-specific: Django `select_related` /
`prefetch_related`, Rails `includes`, SQLAlchemy `joinedload`).

### 10. Hardcoded credentials in connection strings

```sql
-- FORBIDDEN
psql 'host=db user=admin password=hunter2 dbname=mydb'

-- CORRECT — credentials from env / vault
psql "$DATABASE_URL"
```

Per `~/.claude/rules-library/common/secrets-management.md`.

### 11. Destructive migrations without backup verification

```sql
-- FORBIDDEN
alter table users drop column email;

-- CORRECT — multi-step per ~/.claude/rules-library/common/schema-evolution.md
-- 1. Stop writing to email
-- 2. Verify last-writer time > deploy time
-- 3. Drop in a later migration
```

### 12. Unbounded `statement_timeout`

```sql
-- Always set in production (per role / per connection)
alter role app_user set statement_timeout = '30s';
alter role report_user set statement_timeout = '5min';
```

Without `statement_timeout`, one bad query locks up
connections / pool indefinitely.

### 13. `SET ROLE` / `RESET ROLE` paired

```sql
-- FORBIDDEN — leaves session with elevated privileges
set role admin;
-- ... do stuff ...
-- forgot RESET ROLE

-- CORRECT — pair them
do $$
begin
    set local role admin;
    -- ...
    -- local scope ends at txn end
end $$;
```

### 14. `CREATE INDEX` without `CONCURRENTLY` in production (Postgres)

```sql
-- WRONG — locks the table
create index idx_orders_created_at on orders(created_at);

-- CORRECT — non-blocking
create index concurrently idx_orders_created_at on orders(created_at);
```

`CREATE INDEX CONCURRENTLY` is slower but doesn't lock writes.
Cannot run inside a transaction.

### 15. `NOT IN ( ... NULL ... )` semantic trap

```sql
-- WRONG — `not in` returns no rows if NULL is in the subquery result
select * from orders
where status not in (select status from forbidden_statuses);
-- ^ if forbidden_statuses has any NULL row, NO orders return

-- CORRECT — use NOT EXISTS or filter NULLs
select * from orders o
where not exists (
    select 1 from forbidden_statuses f where f.status = o.status
);
```

## Required tooling

```bash
sqlfluff lint --dialect postgres migrations/ queries/
sqlfluff lint --dialect mysql ...
squawk migrations/*.sql            # Postgres migration safety analyser
```

`squawk` warns on:

- `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT` without volatile-fn
  trick (rewrites table)
- `CREATE INDEX` without `CONCURRENTLY`
- `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` (acceptable) vs
  validate-immediately

## Verification block

```text
SQL sweep (this turn):
  - sqlfluff lint: 0 issues
  - squawk migrations/: 0 warnings
  - EXPLAIN of touched queries: no seq scans on > 10k row tables
  - Test queries against staging DB: PASS
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/schema-evolution.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- `~/.claude/rules-library/sql/security.md`
- `~/.claude/rules-library/sql/coding-style.md`
- sqlfluff docs (sqlfluff.com)
- squawk docs (squawkhq.com)
- Postgres EXPLAIN reference

---

<!-- ============================================================
     Section: sql/patterns.md
     ============================================================ -->

# SQL Patterns

> Auto-fires on every `*.sql`, `migrations/**` file. Standards:
> **SQL:2023**, **Designing Data-Intensive Applications (Kleppmann)**,
> **High Performance MySQL (Schwartz et al.)**, **The Art of
> PostgreSQL (Tagliaferri)**, **dbt best practices**.

## Core Principle

**Schema first; constraints enforce invariants; indexes match
query patterns (not "just in case"); partitioning when tables
exceed ~100M rows; CTEs for readability; window functions for
analytical queries; transactions for multi-row consistency;
materialised views for expensive read paths.**

## Schema patterns

### Identity columns

```sql
-- Postgres 10+
create table orders (
    id bigint generated always as identity primary key,
    ...
);

-- Postgres pre-10 (still common)
create table orders (
    id bigserial primary key,
    ...
);

-- UUID alternative (multi-region; client-generated)
create table orders (
    id uuid primary key default gen_random_uuid(),
    ...
);
```

| Choice | When |
| --- | --- |
| `bigint identity` | Single-region; clustered insert friendly; ~9 quintillion |
| `uuid` v4 | Multi-region / client-side generation; B-tree fragmentation cost |
| `uuid` v7 (time-ordered) | Multi-region + index locality (best of both, Postgres 17+) |
| `text` (slug) | Public-facing IDs; not the primary key |

### Soft delete vs hard delete

```sql
-- Soft delete (audit trail; common for compliance)
alter table orders add column deleted_at timestamptz;
create index idx_orders_active on orders(id) where deleted_at is null;

-- Queries use the partial index
select * from orders where id = $1 and deleted_at is null;
```

For GDPR-driven hard delete (per `data-retention.md`):
periodic job removes soft-deleted rows past their TTL.

### Created / updated timestamps

```sql
create table orders (
    id bigint primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Auto-update updated_at via trigger
create or replace function set_updated_at() returns trigger as $$
begin
    new.updated_at = now();
    return new;
end $$ language plpgsql;

create trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();
```

## Indexing patterns

### B-tree (default)

```sql
-- Equality + range
create index idx_orders_customer_id on orders(customer_id);
create index idx_orders_created_at on orders(created_at);

-- Composite (column order matters: most-selective first)
create index idx_orders_customer_created on orders(customer_id, created_at);
```

The composite serves queries that filter on `customer_id` OR
`customer_id + created_at`. A query that filters only on
`created_at` won't use it (leftmost prefix rule).

### Partial index

```sql
-- For "active" rows queried frequently
create index idx_orders_active_customer
  on orders(customer_id)
  where status = 'active';
```

Smaller index; faster scans; only valid for queries with the
same WHERE clause.

### Covering index (INCLUDE)

```sql
-- Postgres 11+
create index idx_orders_customer_covering
  on orders(customer_id)
  include (total, status);
-- Index-only scan; no table fetch for queries reading just these cols
```

### GIN / GIST for JSON / arrays / fulltext

```sql
-- JSON containment / @> queries
create index idx_orders_metadata_gin on orders using gin(metadata);

-- Fulltext search
alter table articles add column search_vector tsvector
  generated always as (to_tsvector('english', title || ' ' || body)) stored;
create index idx_articles_search on articles using gin(search_vector);
```

## Query patterns

### Pagination — cursor vs offset

```sql
-- WRONG — OFFSET scales O(N) with offset
select * from orders order by created_at desc offset 10000 limit 20;

-- CORRECT — cursor pagination (keyset)
select * from orders
where created_at < $1  -- cursor from previous page
order by created_at desc
limit 20;
```

### Upsert (INSERT ... ON CONFLICT)

```sql
-- Postgres
insert into users (email, name)
values ('test@example.com', 'Test')
on conflict (email) do update set name = excluded.name;

-- MySQL
insert into users (email, name) values ('test@example.com', 'Test')
on duplicate key update name = values(name);
```

### Returning (Postgres-specific)

```sql
insert into orders (...) values (...)
returning id, created_at;

-- One round-trip; better than INSERT + SELECT
```

### Window functions

```sql
-- Rank top 5 customers per region
select region, customer_id, total, rnk
from (
    select
        region,
        customer_id,
        sum(total) as total,
        rank() over (partition by region order by sum(total) desc) as rnk
    from orders
    group by region, customer_id
) ranked
where rnk <= 5;
```

### Recursive CTE (graph traversal)

```sql
with recursive ancestors as (
    select id, parent_id, 1 as depth from categories where id = 42
    union all
    select c.id, c.parent_id, a.depth + 1
    from categories c
    inner join ancestors a on a.parent_id = c.id
)
select * from ancestors;
```

### Materialised views

```sql
create materialized view daily_revenue as
select date(created_at) as day, sum(total) as revenue
from orders
where status = 'paid'
group by date(created_at);

create unique index on daily_revenue(day);

-- Refresh (lock-free with concurrent + unique index)
refresh materialized view concurrently daily_revenue;
```

## Partitioning (large tables)

```sql
-- Range partition by month
create table events (
    id bigserial,
    user_id bigint,
    created_at timestamptz not null,
    data jsonb
) partition by range (created_at);

create table events_2026_01 partition of events
    for values from ('2026-01-01') to ('2026-02-01');
create table events_2026_02 partition of events
    for values from ('2026-02-01') to ('2026-03-01');
```

Use when:
>
- > 100M rows in a single table
- Time-based access patterns (drop old partitions cheaply)
- Per-tenant isolation at the storage layer

## Anti-patterns

### Anti-pattern 1: EAV (Entity-Attribute-Value)

```sql
-- WRONG — every property is a separate row; impossible to query
create table user_attributes (
    user_id bigint,
    key text,
    value text
);
```

Use JSON columns instead:

```sql
create table users (
    id bigint primary key,
    attributes jsonb
);
```

### Anti-pattern 2: Indexing every column

Each index costs write throughput + storage. Only index columns
that appear in WHERE / JOIN / ORDER BY of real queries.

### Anti-pattern 3: Generic key-value column

```sql
-- WRONG — opaque values
notes text
```

If the field has structure, use typed columns or JSON. If it's
truly free-form, OK — but document.

### Anti-pattern 4: Inheritance from one giant base table

```sql
-- WRONG — every "subclass" carries every column
create table notification (
    id bigint, type text,
    email_to text, email_subject text,
    sms_to text, sms_body text,
    push_token text, push_title text
);
```

Use separate tables OR a typed JSON payload:

```sql
create table notification (
    id bigint primary key,
    type text not null,
    payload jsonb not null
);
```

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/common/schema-evolution.md`
- `~/.claude/rules-library/sql/coding-style.md`
- `~/.claude/rules-library/sql/security.md`
- Designing Data-Intensive Applications (Kleppmann)
- The Art of PostgreSQL (Tagliaferri)
- High Performance MySQL (Schwartz et al.)

---

<!-- ============================================================
     Section: sql/security.md
     ============================================================ -->

# SQL Security

> Auto-fires on every `*.sql`, `migrations/**`, `db/**` file.
> Sister to `~/.claude/rules-library/common/security.md`. Standards:
> **OWASP SQL Injection Cheat Sheet**, **OWASP Database Security
> Cheat Sheet**, **CIS PostgreSQL / MySQL Benchmarks**,
> **PostgreSQL Row-Level Security**, **PCI-DSS** (cardholder
> data tables), **HIPAA** (PHI tables), **GDPR** (PII tables).

## Core Principle

**Least-privilege per role; multi-tenant isolation enforced at
the DB layer via RLS where possible; sensitive columns encrypted
at field level (pgcrypto, MySQL encryption, AWS KMS); audit
logging at column-level for sensitive operations; no DB role
shared between humans and services.**

## OWASP — SQL specifics

### A01 — Broken Access Control

```sql
-- Postgres Row-Level Security (RLS) — strong tenant isolation
alter table orders enable row level security;

create policy orders_tenant_isolation
  on orders
  for all
  using (tenant_id = current_setting('app.tenant_id', true)::bigint);

-- Application sets the tenant on connection
set app.tenant_id = 42;
select * from orders;  -- only tenant 42's orders
```

### A02 — Cryptographic Failures

```sql
-- Postgres pgcrypto for field-level encryption
create extension if not exists pgcrypto;

create table users (
    id bigserial primary key,
    email text not null,
    ssn_encrypted bytea,  -- encrypted at rest
    ssn_hash bytea         -- for equality search
);

insert into users (email, ssn_encrypted, ssn_hash)
values (
    'user@example.com',
    pgp_sym_encrypt('123-45-6789', current_setting('app.kms_key')),
    digest('123-45-6789', 'sha256')
);

-- Search by hash, decrypt only when needed
select email, pgp_sym_decrypt(ssn_encrypted, current_setting('app.kms_key'))
from users
where ssn_hash = digest($1, 'sha256');
```

For PCI cardholder data: never store CVV / full PAN. Use Stripe
/ Adyen / Square — let the PSP hold the data.

### A03 — Injection (the canonical case)

Always parameterise. Application-layer (covered in
`no-discards.md` rule 1).

For dynamic table / column names within stored procs:

```sql
-- CORRECT — quote_ident escapes identifiers
execute 'select * from ' || quote_ident(table_name) || ' where id = $1'
  using id_value;

-- FORBIDDEN — string concat without escape
execute 'select * from ' || table_name || ' where id = ' || id;
```

### A07 — Authentication

```sql
-- Application user (read+write to app tables, NOTHING admin)
create role app_user noinherit;
grant connect on database mydb to app_user;
grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
revoke create on schema public from app_user;
alter role app_user set statement_timeout = '30s';

-- Report user (read-only)
create role report_user noinherit;
grant connect on database mydb to report_user;
grant select on all tables in schema public to report_user;
alter role report_user set statement_timeout = '5min';

-- Admin (humans only; MFA required at the IAM layer)
create role db_admin;
grant all on all tables in schema public to db_admin;
-- DB admin connects via SSO + audit log
```

### A09 — Logging

```sql
-- Postgres audit logging
create extension if not exists pgaudit;
alter system set pgaudit.log = 'write, ddl';
alter system set pgaudit.log_relation = on;
alter system set log_min_duration_statement = '500ms';  -- slow query log

-- Column-level audit for sensitive tables
create or replace function audit_user_changes() returns trigger as $$
begin
    insert into audit_log (table_name, op, actor, row_id, before, after, ts)
    values (
        TG_TABLE_NAME, TG_OP, session_user, NEW.id,
        case TG_OP when 'UPDATE' then to_jsonb(OLD) else null end,
        case TG_OP when 'DELETE' then null else to_jsonb(NEW) end,
        now()
    );
    return coalesce(NEW, OLD);
end $$ language plpgsql;

create trigger users_audit
  after insert or update or delete on users
  for each row execute function audit_user_changes();
```

Per `~/.claude/rules-library/common/audit-logging.md`.

## Multi-tenant isolation patterns

| Pattern | Tradeoffs |
| --- | --- |
| **Separate database per tenant** | Highest isolation; expensive at scale |
| **Schema per tenant** | Postgres native; good isolation; ~1000s of schemas before performance issues |
| **Shared schema + tenant_id column + RLS** | Most scalable; isolation enforced at DB; default pattern |
| **Shared schema + tenant_id column, app-layer filter** | Cheapest; isolation depends on every query getting WHERE right (risky) |

Prefer RLS for any new multi-tenant table.

## Backup + recovery (encryption)

```sql
-- Encrypted backups (pg_dump + age / gpg)
pg_dump -h db -d mydb -Fc \
  | age -r age1...recipient... \
  > backup-$(date +%F).dump.age

-- Point-in-time recovery (PITR) via continuous archiving
-- alter system set archive_mode = on;
-- alter system set archive_command = 'aws s3 cp %p s3://backups/%f';
```

Test restore quarterly. Backups you can't restore are
encryption-at-rest theatre.

## Privilege escalation defence

```sql
-- WRONG — function runs with caller's permissions; if user can write to it, they can escalate
create function notify_admin(message text) returns void as $$
begin
    -- runs as caller
    perform pg_notify('admin', message);
end $$ language plpgsql;

-- CORRECT — SECURITY DEFINER means the function runs as the OWNER
-- Use sparingly; review every SECURITY DEFINER function for injection paths
create function notify_admin(message text) returns void as $$
begin
    perform pg_notify('admin', message);
end $$ language plpgsql security definer set search_path = pg_catalog;
```

Always `set search_path` on SECURITY DEFINER functions to prevent
attackers from creating shadow tables in the public schema.

## Required tooling

```bash
# Postgres security audit
psql -c "select * from pg_roles;"          # who has what
psql -c "select * from pg_settings where name in ('log_statement', 'log_min_duration_statement');"

# Migration safety
squawk migrations/*.sql

# CVE scan (catches Postgres / MySQL CVEs via OS packages)
trivy filesystem /var/lib/postgresql

# RLS verification
psql -c "select schemaname, tablename, rowsecurity from pg_tables where rowsecurity = false and schemaname = 'public';"
```

## Cross-references

- `~/.claude/rules-library/common/security.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/common/audit-logging.md`
- `~/.claude/rules-library/common/gdpr-ccpa.md`
- `~/.claude/rules-library/common/data-retention.md`
- `~/.claude/rules-library/sql/no-discards.md`
- `~/.claude/rules-library/sql/coding-style.md`
- OWASP SQL Injection Cheat Sheet
- OWASP Database Security Cheat Sheet
- CIS PostgreSQL Benchmark
- PostgreSQL Row-Level Security

---

<!-- ============================================================
     Section: sql/testing.md
     ============================================================ -->

# SQL Testing

> Auto-fires on every `*_test.sql`, `tests/sql/**`,
> `migrations/**` file. Standards: **pgTAP** (Postgres), **utPLSQL**
> (Oracle), **tSQLt** (SQL Server), **Testcontainers** (any DB),
> **db-unit-test** patterns.

## Core Principle

**Every migration is tested against a real DB (Postgres / MySQL /
etc., NOT H2 / SQLite substitute); every non-trivial query has a
known-input → known-output test; data shape is verified with
explicit assertions, not "looks fine"; fixtures use factories
(Factory Bot, factory-boy), not raw SQL inserts in tests.**

## Migration testing

```bash
# Apply migrations on a fresh DB; verify schema + idempotence
docker run -d --name test-pg postgres:16-alpine
flyway migrate -url=jdbc:postgresql://localhost/test
flyway migrate -url=jdbc:postgresql://localhost/test    # idempotent — should no-op
flyway info                                              # all migrations applied
```

For golang-migrate / alembic / Rails ActiveRecord — same:
apply twice, no-op the second time.

## pgTAP for Postgres

```sql
-- tests/users_schema_test.sql
begin;

select plan(5);

select has_table('public', 'users', 'users table exists');
select has_column('public', 'users', 'email', 'email column exists');
select col_not_null('public', 'users', 'email', 'email is NOT NULL');
select has_index('public', 'users', 'uniq_users_email', 'email has unique index');

-- Behaviour test
insert into users (email) values ('test@example.com');
select is(
    (select count(*) from users where email = 'test@example.com'),
    1::bigint,
    'insert succeeded'
);

select * from finish();
rollback;
```

Run with:

```bash
pg_prove -d testdb tests/*.sql
```

## Test fixtures

```sql
-- tests/fixtures/users.sql
insert into users (id, email, created_at) values
    (1, 'alice@example.com', '2026-01-01'),
    (2, 'bob@example.com',   '2026-02-01'),
    (3, 'carol@example.com', '2026-03-01');

-- Reset sequences after fixed-id inserts
select setval('users_id_seq', (select max(id) from users));
```

Or use factories at the application layer (FactoryBot for
Ruby, factory-boy for Python). Per `~/.claude/rules-library/common/reuse-first.md`.

## Testcontainers (cross-language)

```java
// Java example — same pattern for Node / Python / Go
@Testcontainers
class UserRepositoryTest {
    @Container
    static PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16-alpine")
        .withInitScript("schema.sql");

    @Test
    void findsByEmail() {
        var repo = new UserRepository(db.getJdbcUrl());
        repo.insert(new User("test@example.com"));
        assertThat(repo.findByEmail("test@example.com")).isPresent();
    }
}
```

The same pattern in Go:

```go
func TestUserRepository(t *testing.T) {
    ctx := context.Background()
    pgC, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:16-alpine"),
        postgres.WithInitScripts(filepath.Join("..", "schema.sql")),
    )
    require.NoError(t, err)
    defer pgC.Terminate(ctx)
    // ... test against pgC ...
}
```

## Query testing patterns

| Pattern | Approach |
| --- | --- |
| **Pure SELECT** | Set up fixture; run query; assert result shape |
| **INSERT / UPDATE** | Run; assert row exists with expected values |
| **DELETE** | Run; assert row absent |
| **Trigger / function** | Verify side-effect (audit log row, derived column) |
| **CTE / complex JOIN** | Test edge cases (empty input, NULL handling, duplicate keys) |
| **Window functions** | Test partition boundaries, ORDER BY ties |

## Hard rules

### 1. Test against the real engine, not a substitute

H2 in Java, SQLite in Rails — they share ~80% of SQL with the
real engine. The other 20% (JSON ops, RLS, window functions,
specific datatype behaviour, lock semantics) is where bugs
live.

Use Testcontainers + the actual production DB image.

### 2. Test idempotency of migrations

A migration that runs cleanly twice is safe to re-run after a
deploy failure. One that fails on the second run is a bug.

```sql
-- GOOD — IF NOT EXISTS
create index if not exists idx_orders_customer_id on orders(customer_id);

-- BAD — fails on retry
create index idx_orders_customer_id on orders(customer_id);
```

### 3. Test rollback (when reversible)

```sql
-- migration up
alter table orders add column shipping_address jsonb;

-- migration down (separate file)
alter table orders drop column shipping_address;
```

Apply up + down + up in test; assert schema matches expected at
each step.

### 4. Test multi-tenant isolation

Specifically for RLS:

```sql
-- tests/rls_test.sql
begin;

insert into orders (tenant_id, total) values (1, 100), (2, 200);

set app.tenant_id = '1';
select is((select count(*) from orders), 1::bigint, 'tenant 1 sees 1 row');

set app.tenant_id = '2';
select is((select count(*) from orders), 1::bigint, 'tenant 2 sees 1 row');

rollback;
```

### 5. Test EXPLAIN plans don't regress

For critical queries:

```bash
psql -c "explain (format json, analyze) select ..." > current-plan.json
# Compare against committed baseline-plan.json
```

If the query plan changes (seq scan → index scan or vice versa),
flag for review.

### 6. Performance budget

```sql
-- Mark slow query budget
explain (analyze, buffers) select ...
-- expect: Execution Time < 100ms for hot-path queries
```

Track in CI: a query that crosses the budget threshold fails the
build.

### 7. Test data-integrity invariants

```sql
-- Run after every test suite
do $$
begin
    if exists (select 1 from orders where total < 0) then
        raise exception 'orders.total invariant violated';
    end if;
end $$;
```

## CI integration

```yaml
# .github/workflows/db-tests.yml
- name: Start Postgres
  run: docker compose up -d postgres

- name: Wait for ready
  run: until pg_isready -h localhost; do sleep 1; done

- name: Apply migrations
  run: flyway migrate -url=jdbc:postgresql://localhost/testdb

- name: Apply migrations (idempotency check)
  run: flyway migrate -url=jdbc:postgresql://localhost/testdb

- name: pgTAP tests
  run: pg_prove -d testdb tests/sql/*.sql

- name: EXPLAIN plan check
  run: ./scripts/verify-query-plans.sh
```

## Cross-references

- `~/.claude/rules-library/common/testing.md`
- `~/.claude/rules-library/common/schema-evolution.md`
- `~/.claude/rules-library/sql/coding-style.md`
- `~/.claude/rules-library/sql/security.md`
- `~/.claude/rules-library/sql/no-discards.md`
- pgTAP documentation (pgtap.org)
- Testcontainers (testcontainers.com)
- squawk migration safety

---
