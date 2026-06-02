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
-- (per ~/.claude/rules/common/schema-evolution.md)

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

- `~/.claude/rules/common/coding-style.md`
- `~/.claude/rules/sql/no-discards.md`
- `~/.claude/rules/sql/security.md`
- `~/.claude/rules/sql/testing.md`
- `~/.claude/rules/sql/patterns.md`
- `~/.claude/rules/common/schema-evolution.md`
- SQL:2023 standard (ISO/IEC 9075)
- PostgreSQL Coding Style (postgresql.org)
- Mode SQL Style Guide
- GitLab Data Team SQL Style Guide
