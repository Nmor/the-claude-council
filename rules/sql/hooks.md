# SQL Hooks

> Auto-fires on every `*.sql`, `migrations/**`, `db/**` file.
> Sister to `~/.claude/rules/common/hooks.md`.

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

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/common/schema-evolution.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/sql/no-discards.md`
- `~/.claude/rules/sql/testing.md`
- sqlfluff docs (sqlfluff.com)
- squawk docs (squawkhq.com)
- Flyway docs (flywaydb.org)
