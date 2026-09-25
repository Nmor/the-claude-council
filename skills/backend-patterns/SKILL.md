---
name: backend-patterns
description: Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.
---

# Backend Development Patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check

Backend architecture patterns and best practices for scalable server-side applications.

> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> Before creating a new service / repository / middleware /
> handler helper / validator / DTO, sweep the project's `lib/`,
> `services/`, `repositories/`, `middleware/`, `validators/`,
> `dto/` (or language-equivalent) directories. One source of
> truth per concept (one auth middleware, one error envelope, one
> pagination helper, one rate limiter, one DB client factory).
> Extend with a parameter — never fork.

## When to Activate

- Designing REST or GraphQL API endpoints
- Implementing repository, service, or controller layers
- Optimizing database queries (N+1, indexing, connection pooling)
- Adding caching (Redis, in-memory, HTTP cache headers)
- Setting up background jobs or async processing
- Structuring error handling and validation for APIs
- Building middleware (auth, logging, rate limiting)

## Pattern Routing Table

The detail lives in `references/`. Load the row you need; do not load the whole set.

| Topic | Covers | Reference |
| --- | --- | --- |
| API design + layering | RESTful URL shape, repository, service layer, middleware | `references/api-layering.md` |
| Database patterns | Query optimization, N+1 prevention, transactions | `references/database.md` |
| Caching strategies | Redis caching layer, cache-aside | `references/caching.md` |
| Error handling | Centralized error handler, retry with exponential backoff | `references/error-handling.md` |
| Authentication and authorization | JWT token validation, role-based access control | `references/auth.md` |
| Rate limiting | Simple in-memory rate limiter | `references/rate-limiting.md` |
| Background jobs and queues | Simple queue pattern | `references/background-jobs.md` |
| Logging and monitoring | Structured logging | `references/logging.md` |
| Fire-and-forget side effects | Canonical helper, usage, wrong-shape test, bug signatures | `references/fire-and-forget.md` |
| Content-hash file caching | SHA-256 cache key, frozen entries, service wrapper, anti-patterns | `references/content-hash-caching.md` |

**Remember**: Backend patterns enable scalable, maintainable server-side applications. Choose
patterns that fit your complexity level.

## Purpose

Server-side architecture patterns for Node.js / TypeScript / Next.js backends: handler structure,
repository / service layering, validation, error envelopes, caching, background jobs, structured
logging, and fire-and-forget side effects.

**Negative scope**: NOT REST contract design (see `~/.claude/skills/api-design/SKILL.md` — that owns
URL shape, status codes, pagination). NOT database schema / migrations (separate skill). NOT cloud
deployment patterns (`~/.claude/skills/aws-serverless-patterns/SKILL.md` covers Lambda specifics).
NOT frontend state management.

## When NOT to use

- Stateless function-as-a-service workloads where Lambda + DynamoDB single-table covers the use case
  — use `aws-serverless-patterns`
- Pure database query optimisation — use `postgres-patterns` or `dynamodb-patterns`
- GraphQL servers (their middleware / resolver model differs)
- BFF (backend-for-frontend) layers that are thin pass-through — overengineering risk
- Embedded / batch / CLI workloads with no HTTP surface

## Standards Cited

- **RFC 9110** (HTTP Semantics, Jun 2022) §15 — status code semantics for handlers
- **RFC 9457** (Problem Details, Jul 2023) — error envelope shape
- **OWASP ASVS 4.0.3 §4** (Access Control), §5 (Validation, Sanitisation, Encoding), §7 (Error
  Handling + Logging)
- **OWASP API Security Top 10 (2023)** — API1 BOLA, API4 Resource Consumption, API8 Security
  Misconfiguration
- **The Twelve-Factor App (12factor.net)** — IV (Backing Services), VIII (Concurrency), XI (Logs)
- **Node.js LTS Documentation** (current LTS) — stream + async patterns
- **Repository / Unit-of-Work pattern** — Fowler, *Patterns of Enterprise Application Architecture*
  (2002)

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Fat handler (DB call + business logic + serialisation in one function) | Untestable; violates single-responsibility; couples HTTP to domain | Handler → service → repository layering |
| DB connection per request (no pool) | Connection exhaustion under load; latency spike on every request | Singleton pool injected at app start; per-request connection acquired from pool |
| Synchronous `for` loop calling DB | N+1 query pattern; serial latency stacks | Batch fetch with `IN (…)` + Map lookup OR JOIN |
| `console.log` for production logging | No structure, no correlation IDs, no filterable severity | Structured logger (pino, winston, slog) with `request_id` + `trace_id` |
| Fire-and-forget `void store.save()` or `.catch(() => null)` | Silent failure; error never surfaces; bug found by user, not on-call | `fireAndForget(name, promise)` helper that logs with operation + cause |
| Caching without TTL + invalidation strategy | Cache becomes permanent stale state; user sees outdated data | Explicit TTL + invalidation hook on mutation |
| Middleware order matters (auth after parsing JSON of any size) | DoS via 100MB body before auth fires | Auth + body-size limit FIRST in middleware chain |
| Webhook handler that mutates state on every retry | Provider retries → double-charge / double-create | Idempotency key + dedupe table (see `~/.claude/rules-library/common/idempotency.md`) |

## Verification Checklist

- [ ] Handler delegates to service; service delegates to repository (3-layer)
- [ ] All input validated via schema (Zod / Joi / class-validator) at boundary
- [ ] Connection pool injected once at app start; never created per-request
- [ ] Structured logger with `request_id` propagated through async context
- [ ] Errors mapped to RFC 9457 envelope at boundary; no internal stack traces leaked
- [ ] No N+1 — every `forEach` over DB rows audited for batch alternative
- [ ] Fire-and-forget uses the canonical helper, never bare `void`/`.catch(() => null)`
- [ ] Cache keys carry version prefix so deploys can invalidate
- [ ] Rate limit + auth middleware fires BEFORE body parsing of unbounded size

## Cross-References

- `~/.claude/skills/api-design/SKILL.md` — REST contract design (URL, status, envelope)
- `~/.claude/rules-library/common/idempotency.md` — Idempotency-Key contract for mutating endpoints
- `~/.claude/rules-library/common/no-silent-failures.md` — fire-and-forget canonical shape
- `~/.claude/rules-library/common/error-handling-with-context.md` — wrap-with-context discipline
- `~/.claude/rules-library/common/rate-limiting.md` — middleware ordering + RateLimit-* headers
- `~/.claude/rules-library/common/no-ambient-globals.md` — connection pool injection vs module-level
  singleton
- `~/.claude/rules-library/common/reuse-first.md` — sweep before adding a new middleware /
  repository / DTO
- `~/.claude/skills/postgres-patterns/SKILL.md` — query optimisation
- `~/.claude/skills/observability-patterns/SKILL.md` — structured logging + trace propagation

## Why this skill exists

Backend handlers are where every customer-visible failure is born — and where the cost of
correctness is lowest at write time. The recurring failure modes:

- A handler that bundles DB + logic + serialisation grows to 300 lines, becomes untestable, and
  accumulates dark corners where validation is missed
- A connection pool created per-request exhausts under modest load (200 concurrent users ×
  1s/request = 200 simultaneous connections; Postgres default `max_connections=100`)
- N+1 queries hide in `await Promise.all(items.map(i => fetch(i.id)))` patterns; latency P99
  explodes as data grows
- Fire-and-forget side effects (audit logs, peer-tab broadcasts) lose their errors; on-call doesn't
  find out for hours
- Webhook handlers fire twice on every provider retry without an idempotency table → double-charges
  on Stripe, double-emails on SendGrid

Cost of the layered + structured-logger + idempotent + bounded-middleware pattern: minutes per
handler at write time. Cost of debugging the unstructured version: hours per incident.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Fire-and-forget side effect without `.catch` / structured failure log (sister
  `no-silent-failures.md` violation)
- Handler shape duplicates middleware logic that already exists (reuse-first weakening)
- Connection pool created per-request instead of injected from the application root
- DB call inside a loop where a JOIN / batch would work (N+1 pattern)
- Background job triggered synchronously when an outbox + worker would be safer
- Cache without TTL + invalidation strategy (cache becomes permanent stale state)
- Webhook handler not idempotent on retry (sister `idempotency.md` violation)
- Cross-request mutable state introduced (sister `no-ambient-globals.md` violation)
- Content-hash cache used as a write-through path without corruption-as-miss handling

**Refinement candidates**:

- New pattern row when a recurring backend shape emerges (e.g., outbox + transactional events, CQRS
  read model, materialized view refresh)
- New cross-reference when a sister rule (idempotency, observability, error-handling-with-context)
  adds a server-side gate
- Tightening of the fire-and-forget pattern when async errors slip past structured logging
- New cache-eviction template when a recurring staleness incident class recurs
