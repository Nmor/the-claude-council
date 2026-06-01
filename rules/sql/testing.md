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
Ruby, factory-boy for Python). Per `~/.claude/rules/common/reuse-first.md`.

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

- `~/.claude/rules/common/testing.md`
- `~/.claude/rules/common/schema-evolution.md`
- `~/.claude/rules/sql/coding-style.md`
- `~/.claude/rules/sql/security.md`
- `~/.claude/rules/sql/no-discards.md`
- pgTAP documentation (pgtap.org)
- Testcontainers (testcontainers.com)
- squawk migration safety
