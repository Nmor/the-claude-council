# API Versioning Rule (Always-On, Global)

> Auto-fires on every file. Sister to `semver.md` (library versioning),
> `deprecation-lifecycle.md` (how versions die), `error-codes.md`
> (stable codes across versions), `schema-evolution.md` (data-side
> versioning), `contract-testing.md` (verify-the-contract).
> Standards: **REST** (Fielding 2000), **GraphQL** (graphql.org spec),
> **gRPC** (grpc.io), **OpenAPI 3.1**, **AsyncAPI 3.0**.

## Core Principle

**Every public API contract is versioned. Breaking changes ship as a
new MAJOR version while the previous version continues to serve
existing clients. Clients are given a deprecation runway (typically
12 months) and explicit migration guidance before the old version
is removed.**

Versioning is not just for "external" APIs — internal APIs that
multiple teams depend on are public APIs from the perspective of
the team that consumes them.

## Versioning strategies (pick one + commit)

| Strategy | Example | When to use |
| --- | --- | --- |
| **URI path versioning** | `GET /api/v1/users/123` | REST APIs; most common, easiest to inspect |
| **Header versioning** | `Accept: application/vnd.example.v1+json` | When URLs must stay stable (search engines, public docs) |
| **Query parameter** | `GET /api/users/123?api_version=1` | Quick-and-dirty; not recommended for production |
| **Subdomain** | `https://v1.api.example.com/users/123` | Multi-region or multi-team where infra differs by version |
| **GraphQL field versioning** | `userV2` + `@deprecated` directive | GraphQL — schema evolves additively, no global versions |
| **gRPC service versioning** | `service UserServiceV1` + `service UserServiceV2` | gRPC — generated stubs differ per version |

**Recommendation**: URI path versioning for REST (`/api/v1/`,
`/api/v2/`); additive evolution for GraphQL; per-service versions
for gRPC.

## What counts as a breaking change

These changes REQUIRE a new MAJOR version (per `semver.md`):

- Removing or renaming an endpoint
- Removing or renaming a field in a response (clients deserialise
  by field name)
- Changing a field's type (`string` → `integer`)
- Tightening a constraint (newly-required field, narrower range)
- Changing the semantics of an existing field (timestamp format
  change, currency change)
- Removing or renaming an enum value
- Changing HTTP status codes for the same logical outcome
- Changing authentication mechanism
- Changing pagination shape (cursor vs offset)
- Changing default behaviour in a way callers observe

These changes are NON-breaking (additive — MINOR per `semver.md`):

- Adding a new endpoint
- Adding an optional query parameter
- Adding a new field to a response (clients ignore unknown fields)
- Adding a new enum value (if the client handles unknown values
  gracefully — see "tolerant reader" below)
- Loosening a constraint (accepting more values)
- Adding a new HTTP method to an existing path

These changes are PATCH:

- Bug fixes that don't change the documented contract
- Performance improvements
- Error message text changes (the code stays the same per
  `error-codes.md`)

## Hard rules

### 1. Tolerant reader, strict writer

Clients implement the **Tolerant Reader pattern** (Postel's Law):
ignore unknown fields, accept unknown enum values gracefully,
tolerate field order changes. Servers implement strict writers:
output exactly the documented shape, no extra fields, stable
ordering.

This pattern lets servers add fields without breaking clients —
the basis of additive evolution.

### 2. OpenAPI / GraphQL / Proto schemas are the source of truth

The contract lives in machine-readable form:

- REST: `openapi.yaml` (OpenAPI 3.1+) — JSON Schema-validated
- GraphQL: `schema.graphql` — SDL
- gRPC: `*.proto` — Protocol Buffers
- AsyncAPI (events): `asyncapi.yaml` — for Kafka, Pub/Sub, etc.

The schema is committed to source control. Generated clients,
docs, and contract tests derive from it. Drift between the
schema and the actual behaviour is a contract bug.

### 3. Run two versions in parallel during the deprecation window

When v2 ships, v1 keeps running. Same backing services, same data,
but the API surface (handlers, validation, response shapes) is
duplicated. Common patterns:

- **Separate handler files** — `handlers/v1/users.ts`,
  `handlers/v2/users.ts`
- **Adapter layer** — both versions call a common service, each
  applies its own shape transformation
- **Schema-driven routing** — a single handler dispatches on the
  version, calling shape-specific marshallers

The right structure depends on how different the versions are;
the constraint is that v1 traffic doesn't degrade when v2 ships
new code.

### 4. Communicate the version explicitly

Clients see the version they're consuming:

```http
HTTP/1.1 200 OK
API-Version: v1
Deprecation: true
Sunset: Mon, 31 Dec 2026 23:59:59 GMT
Link: <https://docs.example.com/api/v2/migration>; rel="successor-version"
```

Headers per **RFC 8594** (`Sunset`) and the **deprecation HTTP
header** draft (`Deprecation: true` + `Link: rel="successor-version"`).

### 5. Deprecation lifecycle is calendar-anchored

Per `deprecation-lifecycle.md`:

1. **Announce** — release notes + email + in-product banner. Day 0.
2. **Soft-deprecate** — `Deprecation: true` header emitted; warning
   logs server-side; warning UI in admin tools. Calendar minimum
   30 days.
3. **Hard-deprecate** — endpoints return `410 Gone` for new
   clients; existing clients on allowlist get `Deprecation: true`
   - warning until their cutoff date. Calendar minimum 60 days
   from soft.
4. **Remove** — version is gone; requests get `410 Gone` + Link
   header to migration guide.

Total runway: minimum 12 months for major versions on public APIs.
Less for internal APIs (3-6 months); more for SDK-distributed
APIs (24 months) where clients can be slow to upgrade.

### 6. Pagination is part of the contract

Pagination shape never changes silently. The two canonical
patterns:

| Pattern | Shape | When |
| --- | --- | --- |
| **Cursor-based** | `?cursor=<opaque>&limit=20` + `next_cursor` in response | Default for new APIs; stable under inserts |
| **Offset-based** | `?offset=40&limit=20` + `total_count` | Only when total counts matter to the client and inserts are rare |

NEVER mix them in the same version. NEVER change from one to the
other without a major version bump.

### 7. Filtering, sorting, projection are versioned

The query language is part of the contract:

- Filters (`?status=active`) — adding new filter fields is MINOR;
  removing a filter is MAJOR
- Sort (`?sort=created_at:desc`) — adding sort fields is MINOR;
  changing default sort is MAJOR
- Field projection (`?fields=id,name,email`) — useful, but field
  removal still requires major version bump

### 8. Authentication is versioned

Auth schemes evolve. Document explicitly:

- v1 might accept HTTP Basic + API key
- v2 requires OAuth 2.1 + mTLS for service-to-service

The auth requirement is documented in the OpenAPI `securitySchemes`
block and the version's release notes. Clients upgrading versions
might also be upgrading auth.

### 9. Rate limits can differ by version

Per `rate-limiting.md` — newer versions may carry different rate
limits (often LOOSER as the new endpoints are more efficient).
The `RateLimit-*` headers report the version's specific limits.

### 10. SDK clients are versioned with the API

Official SDKs (Node, Python, Go, Java, etc.) carry per-API-version
classes:

```typescript
import { ExampleApiV1, ExampleApiV2 } from '@example/sdk';
const v1 = new ExampleApiV1({ apiKey });   // v1 endpoints
const v2 = new ExampleApiV2({ apiKey });   // v2 endpoints
```

The SDK itself follows `semver.md` — SDK version 4.x might support
both API v1 and v2; SDK version 5.x might drop v1 support.

## GraphQL specifics

GraphQL doesn't have URL versions. Versioning is FIELD-level:

```graphql
type User {
  id: ID!
  email: String!
  username: String! @deprecated(reason: "Use handle instead. Removal date: 2026-12-31")
  handle: String!
}
```

Rules:

- Additive changes only (new fields, new arguments with defaults,
  new enum values, new types)
- Removing a field requires `@deprecated` + deprecation runway +
  schema-registry sunset before removal
- Type changes require a new field (`emailAddress` vs `email`)
- The schema registry (Apollo Studio, GraphQL Hive) tracks
  client field usage so you know who's still using deprecated
  fields

## gRPC specifics

gRPC uses Protocol Buffers; the versioning rules are PB-specific:

| Change | Safe? |
| --- | --- |
| Add a new field with a new tag | YES |
| Rename a field (tag unchanged) | YES at proto level; consumer code must update |
| Change a field's type | NO (binary incompatible) |
| Remove a field | YES if the field is "reserved" (`reserved 5;`); NO if reused |
| Add a new enum value | YES if old clients use `optional` semantics |
| Add a new RPC method | YES |
| Remove an RPC method | NO (clients still call it) — soft-deprecate first |
| Change RPC method signature | NO — add a new method, deprecate the old |

The `.proto` files are version-controlled; `buf breaking` (Buf
CLI) is the canonical breaking-change detector.

## Internal vs external APIs

Both need versioning, but the rigor differs:

| Aspect | Public API | Internal API |
| --- | --- | --- |
| Deprecation runway | 12+ months | 3-6 months |
| Communication | Release notes, email, docs site | Slack, internal docs |
| Versioning shape | URI / header | Service version |
| Breaking-change tolerance | Very low — broken integrations cost customers | Moderate — paired with consumer team's roadmap |
| Discovery | Public docs + OpenAPI explorer | Internal API catalog + ownership doc |

Internal APIs that gradually become external (sold to customers,
exposed to partners) MUST be upgraded to public-grade versioning
before that transition — not after.

## Anti-patterns

### Anti-pattern 1: Versioning everything as v1 forever

If `/api/v1/` has existed for 5 years and the API has changed
materially in incompatible ways, you've been making breaking
changes inside v1 — clients have been broken; you just haven't
heard about it. Bump to v2 honestly.

### Anti-pattern 2: Per-endpoint versions

`/api/users/v1`, `/api/orders/v3`, `/api/payments/v2` — clients
have to track multiple versions to use one API. Coalesce to one
version per service.

### Anti-pattern 3: Server-side variant routing

Same URL serves different shapes based on a request header that's
not the version header — typically `User-Agent`-sniffing. This is
implicit versioning that no documentation captures; bugs are
unreproducible.

### Anti-pattern 4: Breaking changes inside a "minor" release

Quietly removing a field, changing the response shape, or
tightening validation under the SAME version is the worst kind of
break — clients didn't update, didn't know, and didn't get a
deprecation runway.

### Anti-pattern 5: Date-based versioning without semantics

Stripe's `Stripe-Version: 2026-05-26` pattern works for Stripe
because they document every dated change. Don't copy the format
without copying the rigor — without per-date changelogs, dated
versions are just opaque strings.

## Tooling

| Tool | Purpose |
| --- | --- |
| **Spectral** | OpenAPI linting |
| **buf** | Proto breaking-change detector |
| **GraphQL Inspector** | GraphQL schema diff + breaking detector |
| **Apollo Studio** / **GraphQL Hive** | Field-usage tracking |
| **Swagger Codegen** / **openapi-generator** | SDK generation per version |
| **Pact** | Consumer-driven contract tests |
| **Postman Collections** | Manual testing per version |

## Cross-references

- `semver.md` — what's MAJOR vs MINOR vs PATCH
- `deprecation-lifecycle.md` — calendar minimums + communication
- `error-codes.md` — stable codes survive across versions
- `schema-evolution.md` — database-side versioning that supports
  API versioning
- `contract-testing.md` — verify the contract holds (CDC tests)
- `rate-limiting.md` — versions can carry different limits
- `audit-logging.md` — version migration is an audited event when
  it affects billing tier
- `task-intake-due-diligence.md` Q7 (integration map), Q18
  (deprecation)

## Standards cited

- **RFC 8594** — Sunset HTTP header
- **draft-ietf-httpapi-deprecation-header** — Deprecation header
- **OpenAPI 3.1** — REST contract
- **GraphQL Spec (October 2021)** — `@deprecated` directive
- **Protocol Buffers — Updating a Message Type** — proto evolution
  rules
- **Stripe API Reference** — dated-version pattern (informational)

## Why this rule exists

API versioning failure modes destroy customer trust faster than
almost any other engineering choice:

- A "small backend cleanup" that removes an unused-looking field
  breaks 12% of customer integrations overnight
- A "renamed for clarity" field forces every SDK consumer to
  update on your timeline
- "We didn't think anyone was using v1 anymore" turns out to be
  wrong; customers are paying you for v1 access
- An internal API change is rolled to prod; two consuming services
  break in production because nobody coordinated

The cost of versioning correctly: schema files, two handler trees
during the runway, a deprecation header. The cost of versioning
wrong: customer churn, support load, emergency patches, brand
damage.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Breaking change shipped inside an existing major version (rule 4 violation — clients silently broken)
- New endpoint added without OpenAPI / GraphQL SDL / Proto schema update (rule 2 weakening)
- Tolerant-reader pattern not adopted by a client; new server field broke it (rule 1 weakening)
- `Sunset` / `Deprecation` headers missing on a deprecated endpoint (rule 4 weakening)
- "We've been on v1 for 5 years and silently broke compat" pattern (anti-pattern 1)
- Per-endpoint versioning emerging in the same API (anti-pattern 2)
- SDK shipped without per-version classes (rule 10 weakening)
- Internal API treated less rigorously than external (rule converges; treat both like contracts)

**Refinement candidates**:

- New row in the breaking-vs-non-breaking table when a new change shape emerges
- Tightening of the deprecation-runway minimums when SDK consumers prove slower to upgrade
- New tooling row when a linter / breaking-change detector (Spectral, buf, GraphQL Inspector) gains adoption
- New cross-reference when a sister rule (deprecation-lifecycle, contract-testing) prescribes complementary behaviour
