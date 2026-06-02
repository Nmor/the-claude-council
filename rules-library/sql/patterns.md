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

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/common/schema-evolution.md`
- `~/.claude/rules/sql/coding-style.md`
- `~/.claude/rules/sql/security.md`
- Designing Data-Intensive Applications (Kleppmann)
- The Art of PostgreSQL (Tagliaferri)
- High Performance MySQL (Schwartz et al.)
