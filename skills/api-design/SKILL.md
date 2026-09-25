---
name: api-design
description: REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production APIs. Also lazy-loads api-versioning.md / contract-testing.md / schema-evolution.md / deprecation-lifecycle.md content migrated from rules/common/ on 2026-06-02.
paths:
  - "**/routes/**"
  - "**/handlers/**"
  - "**/controllers/**"
  - "**/middleware/**"
  - "**/api/**"
  - "**/openapi*"
  - "**/swagger*"
  - "**/asyncapi*"
  - "**/*.openapi.yaml"
  - "**/*.openapi.yml"
  - "**/*.openapi.json"
  - "**/*.proto"
  - "**/*.graphql"
  - "**/schema.graphql"
  - "**/schema.json"
  - "**/migrations/**"
  - "**/v[0-9]/**"
  - "**/v[0-9][0-9]/**"
  - "**/endpoints/**"
  - "**/resolvers/**"
  - "**/contracts/**"
  - "**/pact/**"
---

# API Design Patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check

Conventions and best practices for designing consistent, developer-friendly REST APIs.

## When to Activate

- Designing new API endpoints
- Reviewing existing API contracts
- Adding pagination, filtering, or sorting
- Implementing error handling for APIs
- Planning API versioning strategy
- Building public or partner-facing APIs

## Routing table

This skill is `paths:`-gated: when a glob above matches, this file is added to the
always-on context in full. It is therefore a ROUTER. The detail lives in
`references/`; read the row you need, not the whole set.

| Topic | Read |
| --- | --- |
| Resource design + HTTP methods / status codes — URL structure, naming rules, method semantics table, status-code reference, common mistakes | [`references/rest-conventions.md`](references/rest-conventions.md) |
| Response format + error envelope — success, collection, error bodies, envelope variants | [`references/response-format.md`](references/response-format.md) |
| Pagination, filtering, sorting, search — offset vs cursor (+ when to use which), filter/sort/search syntax, sparse fieldsets | [`references/pagination-filtering.md`](references/pagination-filtering.md) |
| Authentication, authorization, rate limiting — bearer/API key, ownership + role checks, `RateLimit-*` headers, tier table | [`references/auth-and-rate-limits.md`](references/auth-and-rate-limits.md) |
| Implementation examples — TypeScript (Next.js), Python (DRF), Go (net/http) handlers | [`references/implementation-examples.md`](references/implementation-examples.md) |
| Response-shape contracts (BE/FE drift) — the empty-not-broken bug class, the shared-type + pinned-test contract, endpoint-change workflow | [`references/response-shape-contracts.md`](references/response-shape-contracts.md) |
| Versioning — strategies, breaking vs additive, tolerant reader, parallel versions, `Sunset`/`Deprecation` headers, GraphQL + gRPC specifics, SDK versioning | [`references/api-versioning.md`](references/api-versioning.md) |
| Contract testing — CDC (Pact) vs schema-based (OpenAPI/GraphQL/Proto), deploy gating, per-stack examples | [`references/contract-testing.md`](references/contract-testing.md) |
| Schema evolution — compatibility modes, expand-contract, zero-downtime DDL, backfills, per-store specifics (PG/MySQL/Mongo/DynamoDB/Kafka) | [`references/schema-evolution.md`](references/schema-evolution.md) |
| Deprecation lifecycle — the four stages + calendar minimums, per-language `@deprecated` patterns, HTTP deprecation headers | [`references/deprecation-lifecycle.md`](references/deprecation-lifecycle.md) |
| API design standards (endpoint checklist + skill chain) — the migrated `rules-library/common/api-design.md` | [`references/api-design-standards.md`](references/api-design-standards.md) |

## API Design Checklist

Before shipping a new endpoint:

- [ ] Resource URL follows naming conventions (plural, kebab-case, no verbs)
- [ ] Correct HTTP method used (GET for reads, POST for creates, etc.)
- [ ] Appropriate status codes returned (not 200 for everything)
- [ ] Input validated with schema (Zod, Pydantic, Bean Validation)
- [ ] Error responses follow standard format with codes and messages
- [ ] Pagination implemented for list endpoints (cursor or offset)
- [ ] Authentication required (or explicitly marked as public)
- [ ] Authorization checked (user can only access their own resources)
- [ ] Rate limiting configured
- [ ] Response does not leak internal details (stack traces, SQL errors)
- [ ] Consistent naming with existing endpoints (camelCase vs snake_case)
- [ ] Documented (OpenAPI/Swagger spec updated)
- [ ] Response shape pinned by a shared type AND a contract test (see "Response-shape contracts"
  below)

## Purpose

Design REST API contracts that are consistent, predictable, and stable across versions. Covers
resource naming, status codes, pagination, filtering, error envelopes, authentication shape,
rate-limit semantics, and response-shape contracts between backend and frontend.

**Negative scope**: NOT GraphQL schema design (GraphQL evolves additively at field level, not URL
level). NOT internal RPC contracts (gRPC / Proto live under their own discipline). NOT message-bus
event schemas (Kafka / SNS contracts are the event payload, not a REST surface). NOT internal-only
DB-backed handlers with no external consumer.

## When NOT to use

- GraphQL services — schema-level evolution rules differ; use a GraphQL-specific guide
- gRPC / Proto3 services — `proto` files are the contract
- Webhook-only outbound interfaces — see `~/.claude/rules-library/common/api-versioning.md` for
  sunset semantics
- Pure event-driven systems (Kafka, SNS, EventBridge) where the contract is the event schema
- Throw-away admin scripts with a single internal caller

## Standards Cited

- **RFC 9110** (HTTP Semantics, Jun 2022) §15.5 (Client Error 4xx) + §15.6 (Server Error 5xx) —
  status code semantics
- **RFC 9110 §9.2.2** — Idempotent methods (PUT, DELETE, GET, HEAD, OPTIONS)
- **RFC 9457** (Problem Details for HTTP APIs, Jul 2023) — standardised error response shape
- **RFC 8594** — `Sunset` HTTP header for deprecation
- **RFC 8288** — Web Linking (`Link` header for pagination + relations)
- **RFC 6585 §4** — `429 Too Many Requests`
- **OWASP ASVS 4.0.3 §13.1** (Generic Web Service Security) + §13.2.5 (HTTP method allowlist)
- **OWASP API Security Top 10 (2023)** API1 (BOLA), API4 (Unrestricted Resource Consumption), API9
  (Improper Inventory Management)

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `200 OK` with `success: false` body | Loses HTTP semantics; generic middleware (CDN, load balancer, retry logic) can't branch | Map outcome to status — 4xx client, 5xx server per RFC 9110 §15 |
| Verb in URL (`/getUsers`, `/createOrder`) | REST URLs are nouns; the HTTP verb is the action | `GET /users`, `POST /orders` |
| Exposing DB primary keys (auto-incrementing IDs) | Enumeration leaks customer count + enables IDOR (OWASP API1) | UUIDs / ULIDs / opaque encoded IDs |
| Non-idempotent POST without `Idempotency-Key` | Double-charge / double-create on network retry | Accept `Idempotency-Key` header (Stripe pattern) — see `~/.claude/rules-library/common/idempotency.md` |
| `201 Created` without `Location` header | Client doesn't know the new resource URL | Always set `Location: /api/v1/<resource>/<id>` |
| Major version bump for additive changes (new optional field) | Forces unnecessary client migration; burns version slots | Additive = same major; only breaking = bump |
| Offset pagination on tables with concurrent writes | Items shift between pages → duplicates and gaps | Cursor pagination over indexed column |
| Server stack traces leaking through error body | Reveals framework, version, file paths to attackers | Strip at boundary; `error.code` + `error.message` only |

## Verification Checklist

- [ ] Status codes match RFC 9110 (404 missing, 409 conflict, 422 unprocessable, 429 rate-limit)
- [ ] Error envelope has stable `error.code` + `error.message` + optional `details[]`; no internal
  stack traces
- [ ] List endpoints paginated (cursor preferred); response includes `meta.next_cursor` or
  `meta.total`
- [ ] POST returns `201 Created` + `Location` header
- [ ] `Idempotency-Key` supported on mutating POSTs (per
  `~/.claude/rules-library/common/idempotency.md`)
- [ ] Versioning via URL path (`/api/v1/`) OR Accept header; deprecation signalled via `Sunset` +
  `Link: rel="successor-version"`
- [ ] Rate-limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) on every
  endpoint
- [ ] Response shape pinned by shared type AND a contract test (per Response-shape contracts above)
- [ ] OWASP API Top 10 cross-check (BOLA on every object-level read, rate-limit on every public
  endpoint)

## Cross-References

- `~/.claude/rules-library/common/api-versioning.md` — major-vs-minor evolution rules + `Sunset`
  lifecycle
- `~/.claude/rules-library/common/idempotency.md` — `Idempotency-Key` contract
- `~/.claude/rules-library/common/error-handling-with-context.md` — error envelope shape
  (operation + ids)
- `~/.claude/rules-library/common/error-codes.md` — stable code catalogue
- `~/.claude/rules-library/common/rate-limiting.md` — RateLimit-* header standard
- `~/.claude/rules-library/common/contract-testing.md` — CDC (Pact) + OpenAPI / JSON Schema
  validation
- `~/.claude/skills/backend-patterns/SKILL.md` — handler / middleware patterns
- `~/.claude/agents/security-reviewer.md` — OWASP API Top 10 review

## Why this skill exists

REST APIs are the most-touched public contract any product ships. Every customer integration depends
on URL shape, status semantics, error structure, and pagination behaviour. The recurring failure
modes are mechanical and expensive:

- Status codes drift (`200 OK` becomes the universal envelope) → generic clients break, CDN-level
  retry logic mis-fires, error-rate alerting wrong
- Error shapes diverge per handler → frontend can't write one error handler → every screen ships its
  own
- Pagination breaks under writes → page 2 has rows from page 1 → users see duplicates, support
  tickets surge
- Version bumps land too eagerly (forced consumer work for additive change) or too late (breaking
  change inside a "minor")
- Primary keys leaked → IDOR exposure + customer enumeration on a public list endpoint

Each of these costs migration weeks across N consumers when the API has integrations. Cost of
correct design at write-time: one design review. Cost of redesign with integrators in flight:
quarters.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Verb-based endpoint (`/getUsers`, `/createOrder`) introduced (REST naming weakening)
- HTTP status code mismatched to outcome (validation failure as 400 not 422, create as 200 not 201)
- Error envelope differs between handlers (consistency drift — sister `error-codes.md` violation)
- Pagination missing on a list endpoint (`page`, `limit`, `total`, `next_cursor` absent)
- Versioning omitted on public API (sister `api-versioning.md` violation)
- Idempotency key not accepted on a POST mutation (sister `idempotency.md` violation)
- Rate-limit headers (`RateLimit-*`, `Retry-After`) absent on a public endpoint
- Response shape evolves without contract test (sister `contract-testing.md` violation)
- `as` cast hiding shape drift between BE + FE (sister S6571 + `no-discards.md` rule 8)

**Refinement candidates**:

- New endpoint-class row when a recurring shape emerges (e.g., webhook receivers, SSE streams, gRPC
  unary, GraphQL mutation)
- Tightening of the response-envelope contract when sister rules (`error-codes.md`,
  `error-handling-with-context.md`) evolve
- New cross-reference when a sister skill (security-review, observability-patterns) adds an
  endpoint-level gate
- New versioning template when a recurring breaking-change pattern emerges (e.g., field rename, enum
  addition)

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the
lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/api-design.md`
- `rules-library/common/api-versioning.md`
- `rules-library/common/contract-testing.md`
- `rules-library/common/schema-evolution.md`
- `rules-library/common/deprecation-lifecycle.md`

---
