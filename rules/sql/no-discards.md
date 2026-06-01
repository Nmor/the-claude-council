# SQL — No-Discards Extension

> Auto-fires on every `*.sql`, `migrations/**`, `db/**` file.
> Extends `~/.claude/rules/common/no-discards.md`. Tooling:
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

Per `~/.claude/rules/common/secrets-management.md`.

### 11. Destructive migrations without backup verification

```sql
-- FORBIDDEN
alter table users drop column email;

-- CORRECT — multi-step per ~/.claude/rules/common/schema-evolution.md
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

```
SQL sweep (this turn):
  - sqlfluff lint: 0 issues
  - squawk migrations/: 0 warnings
  - EXPLAIN of touched queries: no seq scans on > 10k row tables
  - Test queries against staging DB: PASS
```

## Cross-references

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/schema-evolution.md`
- `~/.claude/rules/common/no-silent-failures.md`
- `~/.claude/rules/sql/security.md`
- `~/.claude/rules/sql/coding-style.md`
- sqlfluff docs (sqlfluff.com)
- squawk docs (squawkhq.com)
- Postgres EXPLAIN reference
