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

# sql-patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules-library/sql/` as part of the lazy-rules-loading plan.
> Phase H will delete the source files.

## Purpose

SQL discipline for every `*.sql`, `migrations/**`, `db/**`, `schema.sql` and
`seeds/**` file: how the SQL is written, what is banned, how schemas and indexes
are shaped, how the database is secured, how it is tested, and the gates that
enforce all of it.

This file is a ROUTING TABLE only. Each row's detail lives in one reference file
under `references/` — open the row you need, not the whole skill.

## Routing table

| Row | Read | What it holds |
| --- | --- | --- |
| **Coding style** | [`references/coding-style.md`](references/coding-style.md) | Core principle · Formatting · Naming · Hard rules 1-10 (no `SELECT *`, explicit JOIN, JOIN type, CTEs over nested subqueries, UTC timestamps, NOT NULL by default, FK `ON DELETE`/`ON UPDATE`, check constraints, index every FK, EXPLAIN every non-trivial query) · Migration style · Required tooling (`sqlfluff` + `.sqlfluff`) · Cross-references |
| **Hooks + CI** | [`references/hooks.md`](references/hooks.md) | Pre-commit gates (`.githooks/pre-commit`, `.githooks/pre-push`) · full `.sqlfluff` config · `.squawk.toml` (Postgres migration safety) · the `SQL CI` GitHub Actions workflow (lint / test / cve-scan) · Cross-references |
| **No-discards** | [`references/no-discards.md`](references/no-discards.md) | Core principle · 15 banned patterns (string interpolation, `DELETE`/`UPDATE` without `WHERE`, `SELECT *`, missing transaction boundary, implicit type coercion, `= NULL`, `count(*)` on huge tables, unbounded `IN`, ORM N+1, hardcoded credentials, destructive migrations, unbounded `statement_timeout`, unpaired `SET ROLE`, `CREATE INDEX` without `CONCURRENTLY`, `NOT IN (… NULL …)`) · Required tooling · Verification block · Cross-references |
| **Schema, index + query patterns** | [`references/patterns.md`](references/patterns.md) | Core principle · Schema patterns (identity columns, soft vs hard delete, created/updated timestamps) · Indexing patterns (B-tree, partial, covering `INCLUDE`, GIN/GIST) · Query patterns (cursor vs offset pagination, upsert, `RETURNING`, window functions, recursive CTE, materialised views) · Partitioning · Anti-patterns 1-4 (EAV, index-everything, generic key-value column, one giant base table) · Cross-references |
| **Security** | [`references/security.md`](references/security.md) | Core principle · OWASP SQL specifics (A01 broken access control / RLS, A02 cryptographic failures / pgcrypto, A03 injection, A07 authentication / roles, A09 logging / pgaudit) · Multi-tenant isolation patterns table · Backup + recovery encryption · Privilege-escalation defence (`SECURITY DEFINER` + `search_path`) · Required tooling · Cross-references |
| **Testing** | [`references/testing.md`](references/testing.md) | Core principle · Migration testing · pgTAP for Postgres · Test fixtures · Testcontainers (Java + Go) · Query testing patterns table · Hard rules 1-7 (real engine not a substitute, migration idempotency, rollback, multi-tenant isolation, EXPLAIN-plan regression, performance budget, data-integrity invariants) · CI integration · Cross-references |

## Standards cited across the references

SQL:2023 (ISO/IEC 9075) · PostgreSQL Style Guide · Mode Analytics SQL Style Guide ·
GitLab Data Team SQL Style Guide · sqlfluff · squawk · Flyway · OWASP SQL Injection
Cheat Sheet · OWASP Database Security Cheat Sheet · CIS PostgreSQL / MySQL Benchmarks ·
PostgreSQL Row-Level Security · PCI-DSS · HIPAA · GDPR · pgTAP · utPLSQL · tSQLt ·
Testcontainers · Designing Data-Intensive Applications (Kleppmann) · The Art of
PostgreSQL (Tagliaferri) · High Performance MySQL (Schwartz et al.) · dbt best practices
