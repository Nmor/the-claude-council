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

Conventions and best practices for designing consistent, developer-friendly REST APIs.

## When to Activate

- Designing new API endpoints
- Reviewing existing API contracts
- Adding pagination, filtering, or sorting
- Implementing error handling for APIs
- Planning API versioning strategy
- Building public or partner-facing APIs

## Resource Design

### URL Structure

```text
# Resources are nouns, plural, lowercase, kebab-case
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

# Sub-resources for relationships
GET    /api/v1/users/:id/orders
POST   /api/v1/users/:id/orders

# Actions that don't map to CRUD (use verbs sparingly)
POST   /api/v1/orders/:id/cancel
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
```

### Naming Rules

```text
# GOOD
/api/v1/team-members          # kebab-case for multi-word resources
/api/v1/orders?status=active  # query params for filtering
/api/v1/users/123/orders      # nested resources for ownership

# BAD
/api/v1/getUsers              # verb in URL
/api/v1/user                  # singular (use plural)
/api/v1/team_members          # snake_case in URLs
/api/v1/users/123/getOrders   # verb in nested resource
```

## HTTP Methods and Status Codes

### Method Semantics

| Method | Idempotent | Safe | Use For |
|--------|-----------|------|---------|
| GET | Yes | Yes | Retrieve resources |
| POST | No | No | Create resources, trigger actions |
| PUT | Yes | No | Full replacement of a resource |
| PATCH | No* | No | Partial update of a resource |
| DELETE | Yes | No | Remove a resource |

*PATCH can be made idempotent with proper implementation

### Status Code Reference

```text
# Success
200 OK                    — GET, PUT, PATCH (with response body)
201 Created               — POST (include Location header)
204 No Content            — DELETE, PUT (no response body)

# Client Errors
400 Bad Request           — Validation failure, malformed JSON
401 Unauthorized          — Missing or invalid authentication
403 Forbidden             — Authenticated but not authorized
404 Not Found             — Resource doesn't exist
409 Conflict              — Duplicate entry, state conflict
422 Unprocessable Entity  — Semantically invalid (valid JSON, bad data)
429 Too Many Requests     — Rate limit exceeded

# Server Errors
500 Internal Server Error — Unexpected failure (never expose details)
502 Bad Gateway           — Upstream service failed
503 Service Unavailable   — Temporary overload, include Retry-After
```

### Common Mistakes

```text
# BAD: 200 for everything
{ "status": 200, "success": false, "error": "Not found" }

# GOOD: Use HTTP status codes semantically
HTTP/1.1 404 Not Found
{ "error": { "code": "not_found", "message": "User not found" } }

# BAD: 500 for validation errors
# GOOD: 400 or 422 with field-level details

# BAD: 200 for created resources
# GOOD: 201 with Location header
HTTP/1.1 201 Created
Location: /api/v1/users/abc-123
```

## Response Format

### Success Response

```json
{
  "data": {
    "id": "abc-123",
    "email": "alice@example.com",
    "name": "Alice",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### Collection Response (with Pagination)

```json
{
  "data": [
    { "id": "abc-123", "name": "Alice" },
    { "id": "def-456", "name": "Bob" }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  },
  "links": {
    "self": "/api/v1/users?page=1&per_page=20",
    "next": "/api/v1/users?page=2&per_page=20",
    "last": "/api/v1/users?page=8&per_page=20"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address",
        "code": "invalid_format"
      },
      {
        "field": "age",
        "message": "Must be between 0 and 150",
        "code": "out_of_range"
      }
    ]
  }
}
```

### Response Envelope Variants

```typescript
// Option A: Envelope with data wrapper (recommended for public APIs)
interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  links?: PaginationLinks;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
}

// Option B: Flat response (simpler, common for internal APIs)
// Success: just return the resource directly
// Error: return error object
// Distinguish by HTTP status code
```

## Pagination

### Offset-Based (Simple)

```text
GET /api/v1/users?page=2&per_page=20

# Implementation
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 20;
```

**Pros:** Easy to implement, supports "jump to page N"
**Cons:** Slow on large offsets (OFFSET 100000), inconsistent with concurrent inserts

### Cursor-Based (Scalable)

```text
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ&limit=20

# Implementation
SELECT * FROM users
WHERE id > :cursor_id
ORDER BY id ASC
LIMIT 21;  -- fetch one extra to determine has_next
```

```json
{
  "data": [...],
  "meta": {
    "has_next": true,
    "next_cursor": "eyJpZCI6MTQzfQ"
  }
}
```

**Pros:** Consistent performance regardless of position, stable with concurrent inserts
**Cons:** Cannot jump to arbitrary page, cursor is opaque

### When to Use Which

| Use Case | Pagination Type |
|----------|----------------|
| Admin dashboards, small datasets (<10K) | Offset |
| Infinite scroll, feeds, large datasets | Cursor |
| Public APIs | Cursor (default) with offset (optional) |
| Search results | Offset (users expect page numbers) |

## Filtering, Sorting, and Search

### Filtering

```text
# Simple equality
GET /api/v1/orders?status=active&customer_id=abc-123

# Comparison operators (use bracket notation)
GET /api/v1/products?price[gte]=10&price[lte]=100
GET /api/v1/orders?created_at[after]=2025-01-01

# Multiple values (comma-separated)
GET /api/v1/products?category=electronics,clothing

# Nested fields (dot notation)
GET /api/v1/orders?customer.country=US
```

### Sorting

```text
# Single field (prefix - for descending)
GET /api/v1/products?sort=-created_at

# Multiple fields (comma-separated)
GET /api/v1/products?sort=-featured,price,-created_at
```

### Full-Text Search

```text
# Search query parameter
GET /api/v1/products?q=wireless+headphones

# Field-specific search
GET /api/v1/users?email=alice
```

### Sparse Fieldsets

```text
# Return only specified fields (reduces payload)
GET /api/v1/users?fields=id,name,email
GET /api/v1/orders?fields=id,total,status&include=customer.name
```

## Authentication and Authorization

### Token-Based Auth

```text
# Bearer token in Authorization header
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# API key (for server-to-server)
GET /api/v1/data
X-API-Key: sk_live_abc123
```

### Authorization Patterns

```typescript
// Resource-level: check ownership
app.get("/api/v1/orders/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: { code: "not_found" } });
  if (order.userId !== req.user.id) return res.status(403).json({ error: { code: "forbidden" } });
  return res.json({ data: order });
});

// Role-based: check permissions
app.delete("/api/v1/users/:id", requireRole("admin"), async (req, res) => {
  await User.delete(req.params.id);
  return res.status(204).send();
});
```

## Rate Limiting

### Headers

```text
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000

# When exceeded
HTTP/1.1 429 Too Many Requests
Retry-After: 60
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Try again in 60 seconds."
  }
}
```

### Rate Limit Tiers

| Tier | Limit | Window | Use Case |
|------|-------|--------|----------|
| Anonymous | 30/min | Per IP | Public endpoints |
| Authenticated | 100/min | Per user | Standard API access |
| Premium | 1000/min | Per API key | Paid API plans |
| Internal | 10000/min | Per service | Service-to-service |

## Versioning

### URL Path Versioning (Recommended)

```text
/api/v1/users
/api/v2/users
```

**Pros:** Explicit, easy to route, cacheable
**Cons:** URL changes between versions

### Header Versioning

```text
GET /api/users
Accept: application/vnd.myapp.v2+json
```

**Pros:** Clean URLs
**Cons:** Harder to test, easy to forget

### Versioning Strategy

```text
1. Start with /api/v1/ — don't version until you need to
2. Maintain at most 2 active versions (current + previous)
3. Deprecation timeline:
   - Announce deprecation (6 months notice for public APIs)
   - Add Sunset header: Sunset: Sat, 01 Jan 2026 00:00:00 GMT
   - Return 410 Gone after sunset date
4. Non-breaking changes don't need a new version:
   - Adding new fields to responses
   - Adding new optional query parameters
   - Adding new endpoints
5. Breaking changes require a new version:
   - Removing or renaming fields
   - Changing field types
   - Changing URL structure
   - Changing authentication method
```

## Implementation Patterns

### TypeScript (Next.js API Route)

```typescript
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({
      error: {
        code: "validation_error",
        message: "Request validation failed",
        details: parsed.error.issues.map(i => ({
          field: i.path.join("."),
          message: i.message,
          code: i.code,
        })),
      },
    }, { status: 422 });
  }

  const user = await createUser(parsed.data);

  return NextResponse.json(
    { data: user },
    {
      status: 201,
      headers: { Location: `/api/v1/users/${user.id}` },
    },
  );
}
```

### Python (Django REST Framework)

```python
from rest_framework import serializers, viewsets, status
from rest_framework.response import Response

class CreateUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=100)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "created_at"]

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return CreateUserSerializer
        return UserSerializer

    def create(self, request):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = UserService.create(**serializer.validated_data)
        return Response(
            {"data": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
            headers={"Location": f"/api/v1/users/{user.id}"},
        )
```

### Go (net/http)

```go
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "invalid_json", "Invalid request body")
        return
    }

    if err := req.Validate(); err != nil {
        writeError(w, http.StatusUnprocessableEntity, "validation_error", err.Error())
        return
    }

    user, err := h.service.Create(r.Context(), req)
    if err != nil {
        switch {
        case errors.Is(err, domain.ErrEmailTaken):
            writeError(w, http.StatusConflict, "email_taken", "Email already registered")
        default:
            writeError(w, http.StatusInternalServerError, "internal_error", "Internal error")
        }
        return
    }

    w.Header().Set("Location", fmt.Sprintf("/api/v1/users/%s", user.ID))
    writeJSON(w, http.StatusCreated, map[string]any{"data": user})
}
```

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
- [ ] Response shape pinned by a shared type AND a contract test (see "Response-shape contracts" below)

## Response-shape contracts

The canonical bug class an API design must prevent: the server
returns `{ items: [...] }` and the client reads `res.events`, or
backend returns `{ buckets: { uid: [...] } }` and frontend reads
`res.members`. The feature compiles, the backend test passes, and
the frontend renders an empty array — looking *empty* rather
than *broken*. Users find it weeks later when they expected data.

Common shapes this has happened in:

- Connections list — server returns `{ items: [...] }`, client
  reads `res.connections`. Settings page permanently empty.
- Events list — server returns `{ items: [...] }`, client reads
  `res.events`. List view permanently empty.
- Bucketed lookup — server returns `{ buckets: { [keyId]: [...] } }`,
  client reads `res.members`. Dashboard permanently empty.

### The contract

For every endpoint the frontend consumes:

1. **A shared typed shape lives in `lib/types.ts`** (or per-project
   equivalent). Backend and frontend both reference it via
   `import type`. Renaming a key changes the type at both call
   sites simultaneously — neither can drift without the other.

2. **The backend test pins the response key explicitly.** Not just
   the status code:

   ```ts
   expect(statusOf(res)).toBe(200);
   const body = parseBody(res);
   expect(Array.isArray(body.items)).toBe(true);
   expect(body.next_cursor).toBeNull();
   ```

   Tests that only assert `statusCode === 200` are blind to shape
   drift.

3. **The frontend store test mocks the canonical shape.** The
   mock payload comes from the same shared type, so a backend
   rename breaks the frontend test before any user sees the empty
   view.

4. **Shared discriminated `Result<T>` shape.** Stores return
   `{ ok: true, value: T } | { ok: false; reason: string; status?: number }`
   so callers can't accidentally consume an error as a success.

### Workflow when adding or changing an endpoint

1. Edit the shared type FIRST (`lib/types.ts` + frontend mirror).
   The compiler tells you every backend handler + every frontend
   store that needs to update.
2. Update the backend handler to write the new shape.
3. Update the frontend store to read the new shape.
4. Add a backend test that pins the exact key shape
   (`Array.isArray(body.items)`, etc.) — not just `statusCode`.
5. Add a frontend store test that mocks the canonical payload and
   asserts the parsed result matches the type.
6. Re-run both test suites in the same turn.

### Spot the bug — patterns that hint at silent shape drift

- A `parseBody(res)` followed by `body.someKey` without a typed
  cast.
- A `.then((res) => res.<some-key>)` that doesn't error on
  missing.
- A `?? []` fallback in the store action — fine for
  explicit-empty, but if it covers a key-name mismatch the UI
  silently shows empty.
- A frontend feature shipped "ready" with zero data observed in
  staging. Always re-run the contract test before claiming done.

### Cross-references

- `~/.claude/rules-library/common/no-silent-failures.md` —
  false-positive success states.
- `~/.claude/rules-library/common/no-discards.md` — `as any` casts that
  hide shape drift.
- `~/.claude/rules/common/done-criteria.md` — "done" requires
  the contract test to pin the shape.
- `~/.claude/rules-library/common/contract-testing.md` — broader CDC
  (Pact) + schema-based (OpenAPI / GraphQL / Proto) discipline.

## Purpose

Design REST API contracts that are consistent, predictable, and stable across versions. Covers resource naming, status codes, pagination, filtering, error envelopes, authentication shape, rate-limit semantics, and response-shape contracts between backend and frontend.

**Negative scope**: NOT GraphQL schema design (GraphQL evolves additively at field level, not URL level). NOT internal RPC contracts (gRPC / Proto live under their own discipline). NOT message-bus event schemas (Kafka / SNS contracts are the event payload, not a REST surface). NOT internal-only DB-backed handlers with no external consumer.

## When NOT to use

- GraphQL services — schema-level evolution rules differ; use a GraphQL-specific guide
- gRPC / Proto3 services — `proto` files are the contract
- Webhook-only outbound interfaces — see `~/.claude/rules-library/common/api-versioning.md` for sunset semantics
- Pure event-driven systems (Kafka, SNS, EventBridge) where the contract is the event schema
- Throw-away admin scripts with a single internal caller

## Standards Cited

- **RFC 9110** (HTTP Semantics, Jun 2022) §15.5 (Client Error 4xx) + §15.6 (Server Error 5xx) — status code semantics
- **RFC 9110 §9.2.2** — Idempotent methods (PUT, DELETE, GET, HEAD, OPTIONS)
- **RFC 9457** (Problem Details for HTTP APIs, Jul 2023) — standardised error response shape
- **RFC 8594** — `Sunset` HTTP header for deprecation
- **RFC 8288** — Web Linking (`Link` header for pagination + relations)
- **RFC 6585 §4** — `429 Too Many Requests`
- **OWASP ASVS 4.0.3 §13.1** (Generic Web Service Security) + §13.2.5 (HTTP method allowlist)
- **OWASP API Security Top 10 (2023)** API1 (BOLA), API4 (Unrestricted Resource Consumption), API9 (Improper Inventory Management)

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
- [ ] Error envelope has stable `error.code` + `error.message` + optional `details[]`; no internal stack traces
- [ ] List endpoints paginated (cursor preferred); response includes `meta.next_cursor` or `meta.total`
- [ ] POST returns `201 Created` + `Location` header
- [ ] `Idempotency-Key` supported on mutating POSTs (per `~/.claude/rules-library/common/idempotency.md`)
- [ ] Versioning via URL path (`/api/v1/`) OR Accept header; deprecation signalled via `Sunset` + `Link: rel="successor-version"`
- [ ] Rate-limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) on every endpoint
- [ ] Response shape pinned by shared type AND a contract test (per Response-shape contracts above)
- [ ] OWASP API Top 10 cross-check (BOLA on every object-level read, rate-limit on every public endpoint)

## Cross-References

- `~/.claude/rules-library/common/api-versioning.md` — major-vs-minor evolution rules + `Sunset` lifecycle
- `~/.claude/rules-library/common/idempotency.md` — `Idempotency-Key` contract
- `~/.claude/rules-library/common/error-handling-with-context.md` — error envelope shape (operation + ids)
- `~/.claude/rules-library/common/error-codes.md` — stable code catalogue
- `~/.claude/rules-library/common/rate-limiting.md` — RateLimit-* header standard
- `~/.claude/rules-library/common/contract-testing.md` — CDC (Pact) + OpenAPI / JSON Schema validation
- `~/.claude/skills/backend-patterns/SKILL.md` — handler / middleware patterns
- `~/.claude/agents/security-reviewer.md` — OWASP API Top 10 review

## Why this skill exists

REST APIs are the most-touched public contract any product ships. Every customer integration depends on URL shape, status semantics, error structure, and pagination behaviour. The recurring failure modes are mechanical and expensive:

- Status codes drift (`200 OK` becomes the universal envelope) → generic clients break, CDN-level retry logic mis-fires, error-rate alerting wrong
- Error shapes diverge per handler → frontend can't write one error handler → every screen ships its own
- Pagination breaks under writes → page 2 has rows from page 1 → users see duplicates, support tickets surge
- Version bumps land too eagerly (forced consumer work for additive change) or too late (breaking change inside a "minor")
- Primary keys leaked → IDOR exposure + customer enumeration on a public list endpoint

Each of these costs migration weeks across N consumers when the API has integrations. Cost of correct design at write-time: one design review. Cost of redesign with integrators in flight: quarters.

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

- New endpoint-class row when a recurring shape emerges (e.g., webhook receivers, SSE streams, gRPC unary, GraphQL mutation)
- Tightening of the response-envelope contract when sister rules (`error-codes.md`, `error-handling-with-context.md`) evolve
- New cross-reference when a sister skill (security-review, observability-patterns) adds an endpoint-level gate
- New versioning template when a recurring breaking-change pattern emerges (e.g., field rename, enum addition)

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/api-design.md`
- `rules-library/common/api-versioning.md`
- `rules-library/common/contract-testing.md`
- `rules-library/common/schema-evolution.md`
- `rules-library/common/deprecation-lifecycle.md`

---

<!-- ============================================================
     Section: api-design.md (from rules/common/)
     ============================================================ -->

---
paths:

- "**/routes/**"
- "**/handlers/**"
- "**/controllers/**"
- "**/api/**"
- "**/middleware/**"
- "**/nodeApi.js"
- "**/customerApi.js"

---

# API Design Standards

> Auto-activates when working on route handlers, controllers, or API middleware. Chains with `api-design` skill for REST patterns and `security-review` skill for endpoint security.

## Checklist

When creating or modifying API endpoints:

- [ ] RESTful resource naming (nouns, not verbs)
- [ ] Correct HTTP status codes (201 for create, 204 for delete, 422 for validation)
- [ ] Consistent error response envelope (`{ error, message, details }`)
- [ ] Pagination on list endpoints (`page`, `limit`, `total`, `totalPages`)
- [ ] Input validation at the boundary (before business logic)
- [ ] Rate limiting on public/auth endpoints
- [ ] Proper CORS configuration

## Skill Chain

1. **api-design** - REST patterns, status codes, pagination, versioning
2. **security-review** - Auth, input validation, OWASP checks
3. **backend-patterns** - Server-side architecture, DB optimization

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New endpoint added with verb-based path (`/getUser`, `/createOrder`) — RESTful-naming weakening
- POST returning 200 instead of 201 / DELETE returning 200 instead of 204 / validation failure returning 400 instead of 422 (status-code mapping drift)
- Error envelope differs across handlers (some `{error}`, some `{message}`, some both) — consistency weakening
- List endpoint missing pagination fields (page / limit / total / totalPages)
- Input validation deferred to business logic instead of boundary
- Public / auth endpoint shipped without rate-limit middleware (sister rule `rate-limiting.md` weakening)
- CORS configuration permissive (`*`) on a credentialed endpoint
- Skill chain incomplete (api-design without security-review pass)

**Refinement candidates**:

- New checklist row when a recurring endpoint class emerges (webhook receivers, SSE streams, GraphQL mutations, gRPC unary)
- Tightening of the error-envelope shape when sister rules (`error-codes.md`, `error-handling-with-context.md`) evolve the canonical contract
- New cross-reference when the api-versioning / contract-testing / deprecation-lifecycle rules introduce new gate
- New "auto-activate paths" entry when a new framework's routing convention appears

---

<!-- ============================================================
     Section: api-versioning.md (from rules/common/)
     ============================================================ -->

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

---

<!-- ============================================================
     Section: contract-testing.md (from rules/common/)
     ============================================================ -->

# Contract Testing Rule (Always-On, Global)

> Auto-fires on every file. Sister to `api-versioning.md` (the
> contract being tested), `schema-evolution.md` (data contracts),
> `deprecation-lifecycle.md` (contracts that retire),
> `testing.md` (broader test strategy). Standards: **Pact**
> (Consumer-Driven Contracts), **OpenAPI 3.1**, **GraphQL Schema
> Registry**, **PACT spec v3+**, **Spring Cloud Contract**.

## Core Principle

**Every API consumer-producer relationship is verified by
automated contract tests that run on BOTH sides: consumers
declare what they expect; producers verify they deliver it.
Contract drift is detected at PR time, not in production at
3 AM.**

Contract tests sit between unit tests (too narrow — mock the
world) and end-to-end tests (too broad — slow + flaky). They
answer one question precisely: "Does the producer still meet the
consumer's expectations?"

## What contract tests catch

Failures that unit tests + e2e tests both miss:

- Producer renames a field; consumer still sends the old name
- Producer changes a response status (200 → 201); consumer
  switches on the status
- Producer drops a previously-optional field that the consumer
  was actually relying on
- Consumer expects a field with type `string`; producer changes
  it to `number`
- Producer adds a new required request parameter; consumer is
  unaware
- Producer changes pagination shape; consumer breaks
- Producer changes auth header format; consumer can't authenticate

These are all "the test suite was green; the deploy went out;
something downstream caught fire."

## Two flavors

### Consumer-Driven Contracts (CDC) — Pact pattern

Consumers WRITE the contract by declaring "when I send X, I
expect Y." The contracts are versioned, stored in a broker, and
producers verify against them.

**Workflow**:

1. Consumer test runs → generates contract file (JSON pact)
2. Contract is published to a broker (Pact Broker / PactFlow)
3. Producer's CI pulls the contracts of all known consumers
4. Producer runs its handlers against each consumer's
   expectations
5. If ALL pass: producer can deploy
6. If ANY fail: producer's deploy is blocked until the contract
   is renegotiated

This pattern is ideal when:

- Producer can identify all its consumers (internal teams,
  paid customers with API keys)
- Consumers can run a contract test step in their CI
- The producer can verify before deploy

### Schema-Based Contracts — OpenAPI / GraphQL / Proto

The schema is the contract. Tests verify:

- Producer responses MATCH the published schema (no drift)
- Consumer code COMPILES against the schema (generated clients)
- Schema changes are SEMVER-tracked (per `api-versioning.md`)

Tools: **Dredd**, **Schemathesis**, **Spectral** for OpenAPI;
**GraphQL Inspector**, **Apollo Studio**; **buf breaking** for
Proto.

Ideal when:

- API is public + has unknown consumers
- The schema is the canonical definition
- Generated clients flow from the schema

**Most production systems use BOTH**: schema-based contracts for
the shape, CDC contracts for the specific consumer expectations
(which optional fields they actually rely on).

## Hard rules

### 1. Every API the system exposes has contract tests

Internal-facing or external-facing — same rule. The contract
test verifies the OpenAPI / GraphQL / Proto schema reflects the
running code. CI fails if the schema and the code drift.

### 2. CDC tests gate the producer's deploy

The producer's deploy pipeline includes a step:

```yaml
- name: Verify contracts
  run: |
    pact-broker-verify \
      --provider=my-service \
      --provider-base-url=http://localhost:3000 \
      --broker-base-url=https://pact.example.com \
      --publish-verification-results=true
```

If any consumer's contract fails, deploy is blocked. The
producer either:

- Fixes the regression
- Updates the contract with the consumer (coordinated change)
- Confirms the consumer has been deprecated + remove from broker

### 3. Schema-first or code-first — pick one

Two valid workflows:

| Approach | Flow | Tooling |
| --- | --- | --- |
| **Schema-first** | Write OpenAPI/GraphQL → generate server stubs → implement handlers → tests verify match | `openapi-generator`, `graphql-codegen` |
| **Code-first** | Annotate handlers (TypeScript decorators, JSDoc) → generate OpenAPI → tests verify match | `nestjs/swagger`, `tsoa`, `swag` (Go) |

Don't mix: half-annotated handlers + half-hand-written schemas
guarantee drift.

### 4. Backward-compatible changes must pass without consumer updates

A producer adds a new optional field (additive change per
`api-versioning.md`). The existing CDC contracts MUST still
pass without consumers updating. If they don't, the change
isn't truly backward-compatible.

### 5. Breaking changes are explicit

When a producer NEEDS to break the contract:

1. Coordinate with consumer teams before changing
2. Bump the major version (per `api-versioning.md`)
3. Publish a new contract for the new version
4. Run the old version's contract tests until consumers
   migrate (deprecation runway per `deprecation-lifecycle.md`)
5. Once all consumers are on the new version, remove the old
   contract from the broker

### 6. Contracts are versioned independently

The contract file has its own version. A consumer can run on
contract v1.2 while the producer publishes contract v1.3 — as
long as v1.2's expectations are still met by v1.3 behaviour.

Multiple contract versions can coexist in the broker during
migration.

### 7. Test the error cases too

Happy-path contract tests are easy. Real contracts include:

- 4xx error responses (400 validation, 401 auth, 404 not found)
- 5xx error responses (500 internal, 503 unavailable)
- Rate-limit responses (429 with `Retry-After`)
- Pagination edges (empty, first page, last page)
- Authentication boundaries (token expired, invalid scope)

The contract test asserts the SHAPE of error responses, the
status code, and the stable `error_code` (per `error-codes.md`).

### 8. The contract is the source of truth for mocks

When consumer tests need to mock the producer, the mock is
DERIVED from the contract — not hand-written. Tools like
**Mockoon** + **Prism** + **wiremock** can serve OpenAPI
schemas + Pact contracts directly as mock endpoints.

Hand-written mocks drift from the contract; derived mocks
update automatically.

### 9. Contracts are not load tests

A passing contract test does NOT verify:

- Performance under load
- Concurrent behaviour
- Long-running connection handling
- Resource limits

Use load tests (k6, Gatling, Locust) for those. Contract tests
verify CORRECTNESS, not capacity.

### 10. The broker is part of the supply chain

Pact Broker / PactFlow / Apollo Studio / GraphQL Hive — these
services hold the contracts. Treat them with supply-chain
discipline:

- Authentication required (no public unauthenticated brokers
  in production)
- Audit logs for contract publish + verification events
- Backups (lose the broker = lose contract history)
- Per `security-controls-org-wide.md` 5-layer enforcement

## Per-stack examples

### Node.js + Pact

```typescript
// Consumer test
import { Pact } from '@pact-foundation/pact';

describe('OrderService contract', () => {
  const provider = new Pact({
    consumer: 'frontend-app',
    provider: 'order-service',
  });

  it('gets an order by id', async () => {
    await provider.addInteraction({
      state: 'order ord_123 exists',
      uponReceiving: 'a request for order ord_123',
      withRequest: {
        method: 'GET',
        path: '/orders/ord_123',
        headers: { Authorization: 'Bearer token' },
      },
      willRespondWith: {
        status: 200,
        body: {
          id: 'ord_123',
          status: 'shipped',
          total: 4250,
          currency: 'USD',
        },
      },
    });
    const order = await client.getOrder('ord_123');
    expect(order.status).toBe('shipped');
  });
});
```

### Go + Pact

```go
func TestOrderServiceContract(t *testing.T) {
    pact := dsl.Pact{
        Consumer: "frontend-app",
        Provider: "order-service",
    }
    defer pact.Teardown()

    pact.
        AddInteraction().
        Given("order ord_123 exists").
        UponReceiving("a request for order ord_123").
        WithRequest(dsl.Request{
            Method: "GET",
            Path:   dsl.String("/orders/ord_123"),
        }).
        WillRespondWith(dsl.Response{
            Status: 200,
            Body:   dsl.Match(&Order{}),
        })

    err := pact.Verify(func() error {
        _, err := client.GetOrder("ord_123")
        return err
    })
    assert.NoError(t, err)
}
```

### Schema validation (Schemathesis + OpenAPI)

```bash
schemathesis run \
  --base-url http://localhost:3000 \
  --checks all \
  http://localhost:3000/openapi.json
```

Property-based testing: Schemathesis generates random valid
requests per the schema; the producer should never return an
unexpected shape.

### GraphQL schema regression (Inspector)

```bash
graphql-inspector diff \
  schema.graphql:main \
  schema.graphql:HEAD
```

Output:

```text
⚠️  Breaking changes:
  - Field "username" was removed from type "User"
  - Argument "limit" was added to field "User.orders" (required)
```

## Anti-patterns

### Anti-pattern 1: Contract tests as e2e tests

A "contract test" that spins up the producer + the consumer + the
database + Redis is an e2e test. Real contract tests run with the
producer in isolation (or with stubs for ITS dependencies).

### Anti-pattern 2: Provider mocks the contract

Provider-side contract test mocks the consumer's expectations
rather than declaring its own behaviour → the contract drift
isn't caught.

### Anti-pattern 3: Contract test that's always green

A contract test with no assertions (or only "status is 200") is
worthless. The assertions must include the SHAPE that the
consumer actually reads.

### Anti-pattern 4: Manually maintained contracts

Contracts that aren't generated from real consumer test runs
drift from reality. Either generate from tests OR generate from
the schema; never hand-write both.

### Anti-pattern 5: Contract tests bypassed in CI

CI configured with `--allow-pact-verification-failure=true` to
keep builds green when contracts fail is identical to having no
contract tests. Failed contracts block deploys.

## Tooling

| Tool | Use |
| --- | --- |
| **Pact** | CDC across languages (Node, Java, Go, Python, Ruby, .NET, JVM) |
| **PactFlow** | Hosted Pact Broker + analytics |
| **Spring Cloud Contract** | JVM-specific CDC |
| **Schemathesis** | Property-based OpenAPI testing |
| **Dredd** | OpenAPI conformance |
| **Prism** | OpenAPI mock server (Stoplight) |
| **Mockoon** | OpenAPI / arbitrary mock server |
| **Wiremock** | HTTP service mocking |
| **GraphQL Inspector** | GraphQL schema diff |
| **Apollo Studio** | GraphQL schema registry + field-usage analytics |
| **GraphQL Hive** | OSS GraphQL registry |
| **buf** | Protobuf breaking-change detection |
| **Confluent Schema Registry** | Kafka Avro/Proto schema management |

## Cross-references

- `api-versioning.md` — the contract HAS a version
- `schema-evolution.md` — data-side schema rules (when consumers
  read from DBs / streams instead of APIs)
- `deprecation-lifecycle.md` — old contracts retire on a calendar
- `error-codes.md` — error responses are part of the contract
- `testing.md` — contract tests fit between unit + e2e
- `task-intake-due-diligence.md` Q7 (integration map), Q14 (test
  strategy)
- `feature-flags.md` — flag-controlled features need flag-aware
  contracts

## Standards cited

- **Pact specification v3+**
- **OpenAPI 3.1**
- **GraphQL Spec (October 2021)**
- **AsyncAPI 3.0** — for event-stream contracts
- **Protocol Buffers Style Guide** — proto-level versioning
- **JSON Schema Draft 2020-12** — schema definition

## Why this rule exists

Without contract tests, the typical failure mode:

1. Backend team renames a field "for clarity"
2. Backend's own tests pass (they updated everywhere)
3. Backend deploys to staging
4. Frontend integration tests pass (they cached the old shape)
5. Backend deploys to prod
6. Frontend starts returning errors at 3 AM
7. On-call diagnoses; rollback or hotfix

Contract tests catch this at step 2:

- Backend's PR runs the verification step
- The frontend's contract expects the OLD field name
- The PR fails
- Backend either reverts the rename or coordinates with frontend

Cost: ~5 minutes of CI per PR. Benefit: zero "the API changed and
broke us" production incidents.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- API change shipped but consumer contract test didn't fail (false-negative — contract was over-broad)
- Producer deploy blocked but the change was actually backwards-compatible (false-positive — contract was over-narrow)
- CDC broker (Pact / PactFlow / Apollo Studio) outage broke deploys (broker-dependency weakening)
- Schema-first OR code-first mixed in the same service (rule 3 violation — drift inevitable)
- Provider mocks the contract instead of declaring its own behaviour (anti-pattern 2)
- Hand-written mocks drifting from the generated schema (rule 8 weakening)
- Contract test asserts only on status 200 (anti-pattern 3 — error cases unverified)
- Contract test wrapping the whole stack (anti-pattern 1 — really an e2e test)

**Refinement candidates**:

- New tooling row when a contract-test framework (consumer-driven OR schema-based) becomes the team's choice
- Tightening of the "test the error cases too" requirement when production error paths consistently lack contracts
- New cross-reference when a sister rule (api-versioning, schema-evolution) defines the surface that contracts test
- New broker-resilience pattern when CDC broker outages become a deploy bottleneck

---

<!-- ============================================================
     Section: schema-evolution.md (from rules/common/)
     ============================================================ -->

# Schema Evolution Rule (Always-On, Global)

> Auto-fires on every file. Sister to `api-versioning.md` (API-side
> versioning), `contract-testing.md` (verify the shape),
> `deprecation-lifecycle.md` (retire schema fields),
> `data-retention.md` (data lives on across schema changes),
> `idempotency.md` (re-runnable migrations). Standards: **Avro
> evolution rules**, **Protocol Buffers — Updating a Message
> Type**, **Confluent Schema Registry compatibility modes**,
> **PostgreSQL DDL transactional semantics**, **expand-contract
> migration pattern**.

## Core Principle

**Database schemas, event payloads, stored documents, message
formats — anything written by one version of code and read by
another — evolve through ADDITIVE, REVERSIBLE, ZERO-DOWNTIME
migrations. Breaking changes ship as parallel schemas during a
deprecation window; old + new readers and writers coexist until
the migration is complete.**

Schema evolution is harder than API evolution because the data
already exists. Renaming a field in an API affects future
requests; renaming a column affects every row already written.

## Compatibility modes

| Mode | Old readers ↔ new data | New readers ↔ old data | When to use |
| --- | --- | --- | --- |
| **Backward** | Old reader can read new data | New reader can read old data is NOT required | Default — producers upgrade first |
| **Forward** | Old reader can read new data is NOT required | New reader can read old data | Consumers upgrade first |
| **Full** | Both directions | Both directions | Symmetric — safest, most restrictive |
| **None** | Anything goes | Anything goes | Test/dev only |

For most production systems: **Backward compatibility** is the
default — producers (services that emit events / write rows)
upgrade first; consumers (services that read) keep working with
both old and new shapes during the transition.

## Expand-contract migration pattern

The canonical zero-downtime schema change:

### Phase 1: EXPAND

- Add new columns / fields / formats WITHOUT removing the old
- Code writes to BOTH old + new
- Code reads from old (still authoritative)
- Backfill old → new (background migration)

### Phase 2: TRANSITION

- Code reads from NEW (now authoritative)
- Code writes to BOTH (still)
- Old data still exists; comparison + rollback possible

### Phase 3: CONTRACT

- Code stops writing to OLD
- Old column is DROP-ready (no consumer)

### Phase 4: REMOVE

- DROP COLUMN
- Final cleanup

Each phase ships separately. The PR boundaries match the phase
boundaries. Rollback at any phase reverts to the previous phase
safely.

## Hard rules

### 1. Migrations are ADDITIVE in production

A single migration that does BOTH "add new column" AND "drop
old column" requires the code to be deployed in two states
atomically — impossible without downtime. Split.

The rule: **never DROP, RENAME, or change the TYPE of a column
in the same migration that adds new state.**

### 2. Migrations are REVERSIBLE

Every migration has a tested rollback path:

- `ADD COLUMN` → `DROP COLUMN`
- `CREATE TABLE` → `DROP TABLE`
- `ADD INDEX` → `DROP INDEX`
- Data backfill → reverse-backfill script

Irreversible migrations (e.g., dropping data) require explicit
backup + sign-off; rollback means restoring from backup.

### 3. Migrations are RE-RUNNABLE (idempotent)

Per `idempotency.md` — running a migration twice is a no-op.
Use `IF NOT EXISTS` / `IF EXISTS`:

```sql
-- BAD — fails on retry
CREATE INDEX orders_status_idx ON orders (status);

-- GOOD — safe to re-run
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
```

Re-runnable migrations survive partial-run failures and parallel
deploys.

### 4. Long-running migrations don't block writes

- **PostgreSQL**: `CREATE INDEX CONCURRENTLY` (slower but
  non-blocking); `ALTER TABLE` of NOT NULL on a populated column
  requires a temporary check constraint, NOT a direct ALTER
- **MySQL**: `ALGORITHM=INPLACE, LOCK=NONE` for compatible
  changes; pt-online-schema-change for complex ones
- **MongoDB**: schema changes are application-level; backfills
  via batched updates with sleep between batches
- **DynamoDB**: schema-less at the table level; new attributes
  are additive by definition; GSI creation is async

Lock-acquiring DDL on production tables > 1M rows is an outage
in waiting.

### 5. Backfills are batched + rate-limited

A backfill UPDATE that touches every row is a transaction that
locks the table:

```sql
-- BAD — single transaction over 50M rows
UPDATE users SET email_lower = LOWER(email) WHERE email_lower IS NULL;

-- GOOD — batched with progress + sleep
DO $$
DECLARE
  affected INT;
BEGIN
  LOOP
    UPDATE users SET email_lower = LOWER(email)
    WHERE id IN (
      SELECT id FROM users
      WHERE email_lower IS NULL
      LIMIT 1000
    );
    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    PERFORM pg_sleep(0.1);  -- yield to readers
    COMMIT;
  END LOOP;
END $$;
```

Better: a dedicated background worker that processes in batches
with metrics + the ability to pause.

### 6. Event schemas use a schema registry

Kafka / Pulsar / EventBridge / SNS events MUST be versioned via
schema registry:

- **Confluent Schema Registry** for Kafka (Avro, Protobuf, JSON
  Schema)
- **Amazon EventBridge Schema Registry** for AWS
- **Apicurio** as a self-hosted option

The registry enforces compatibility on schema evolution:
producers can't publish a breaking change without explicit
registry override (which requires consumer coordination).

### 7. NULL-able first, then required later

When adding a new field that should eventually be REQUIRED:

1. Add as NULLABLE (no constraint)
2. Application writes the field for new records
3. Backfill existing records
4. Once 100% non-null, ADD CONSTRAINT NOT NULL (cheap if all
   rows already non-null)
5. Update the schema registry / type definitions

Adding NOT NULL on a populated column with a non-default value
is an outage.

### 8. Renames are TWO migrations + a deprecation window

To rename column `email` → `email_address`:

1. Migration A: add `email_address` (nullable). Backfill from
   `email`.
2. Code: dual-write to both columns. Read from `email_address`.
3. Deprecation window (per `deprecation-lifecycle.md`): warn
   consumers, update queries.
4. Migration B: drop `email`.

NEVER `ALTER COLUMN email RENAME TO email_address` in one shot
on a live system.

### 9. Generated columns + computed fallbacks bridge migrations

PostgreSQL `GENERATED ALWAYS AS (... ) STORED` columns let you
present a new shape while old writers still emit the old:

```sql
ALTER TABLE orders ADD COLUMN total_cents INTEGER
  GENERATED ALWAYS AS (total_dollars * 100) STORED;
```

Consumers can migrate to `total_cents`; producers continue
writing `total_dollars` until they're ready.

### 10. Test schema migrations on production-sized data

A migration that runs in 30 seconds in dev (10K rows) can take
8 hours in production (50M rows) with locking. The pre-deploy
gate:

- **Restore a recent prod backup** into a staging environment
- Run the migration against the restored data
- Measure time + lock contention
- Validate the rollback path works

Per `deploy-failures-become-checks.md` — every observed
migration class becomes a documented gate.

## Per-store specifics

### PostgreSQL

| Change | Safe online? | Notes |
| --- | --- | --- |
| `ADD COLUMN ... NULL` | Yes | Constant-time (PG 11+) |
| `ADD COLUMN ... DEFAULT x` | Yes (PG 11+) | Default stored in catalog, not rewritten |
| `ADD COLUMN ... NOT NULL DEFAULT x` | Yes (PG 11+) | Same as above |
| `ALTER COLUMN ... SET NOT NULL` | Slow | Scans table; use CHECK constraint first as bridge |
| `ALTER COLUMN ... TYPE` | Slow (rewrite) | Use temp column + backfill + swap |
| `CREATE INDEX` | LOCK | Use `CONCURRENTLY` |
| `DROP COLUMN` | Fast | Logical drop, physical space reclaimed by VACUUM |
| `RENAME COLUMN` | Fast | Metadata-only |
| `ALTER TABLE ... ADD CONSTRAINT FK ... NOT VALID` | Fast | Use NOT VALID then VALIDATE separately |

### MySQL / MariaDB

| Change | Notes |
| --- | --- |
| Online DDL (5.7+) | Many changes support `ALGORITHM=INPLACE, LOCK=NONE` |
| pt-online-schema-change | Percona Toolkit for complex changes |
| gh-ost | GitHub's online schema migration tool |

### MongoDB

- Schema-less; new fields are additive at the application level
- Validation rules via `$jsonSchema` validators (added without
  rewriting existing docs)
- Migration scripts iterate via `find` + `updateMany` in batches

### DynamoDB

- Table-level: items can have heterogeneous shapes
- GSI changes: ADD GSI is online (slow); DELETE GSI is fast;
  CHANGE GSI requires create-new + delete-old
- TTL changes: instant
- Per-table-class changes (Standard ↔ IA): online

### Event streams (Kafka)

Avro / Protobuf / JSON Schema:

| Change | Backward compat | Forward compat | Full compat |
| --- | --- | --- | --- |
| Add field (with default) | Yes | Yes | Yes |
| Add field (required) | No | Yes | No |
| Remove field (had default) | Yes | No | No |
| Remove field (required) | No | No | No |
| Rename field | No | No | No |
| Change field type | Depends | Depends | No |
| Add enum value | Yes | No | No (use placeholder) |
| Remove enum value | No | Yes | No |

Confluent Schema Registry's BACKWARD / FORWARD / FULL modes
enforce these rules automatically.

## Anti-patterns

### Anti-pattern 1: Single "fix the schema" migration

A migration that adds 5 columns, drops 3, renames 2, and
reshapes JSON → ROW types is impossible to review, impossible
to roll back, and almost certainly will fail in production.
Split into one logical change per migration.

### Anti-pattern 2: Production-only schema

Migrations that exist as raw SQL the DBA ran manually, not in
version control, are time bombs. Every schema change goes
through:

- A migration file in the repo (sqitch, Flyway, golang-migrate,
  alembic, ActiveRecord, Knex, prisma-migrate)
- Reviewed PR
- Applied via CI / deploy pipeline
- Audit-logged (per `audit-logging.md`)

### Anti-pattern 3: Implicit schema in JSON columns

A `metadata JSONB` column with no documented shape becomes a
write-anything dumping ground. Either:

- Promote fields to typed columns when they stabilise
- Document the JSON shape in a JSON Schema file
- Validate writes against the schema

### Anti-pattern 4: Breaking compat in event payloads

A producer that "just updates the event shape" breaks every
downstream consumer that's been deployed in the last six
months. Event schemas evolve like API contracts — additive
only, registry-enforced.

### Anti-pattern 5: Backfills as inline SQL

A migration file that includes `UPDATE 50M rows` in the same
transaction as `ALTER TABLE` is two outages: the DDL waits for
the DML, the DML holds the lock, all writes queue. Backfills
are separate, batched, observable.

## Tooling

| Tool | Use |
| --- | --- |
| **Flyway** | Java-ecosystem migrations |
| **Liquibase** | XML/YAML/SQL migrations, cross-DB |
| **golang-migrate** | Go-ecosystem migrations |
| **Alembic** | Python/SQLAlchemy migrations |
| **ActiveRecord migrations** | Rails |
| **Knex** / **Sequelize** / **Prisma Migrate** | Node.js |
| **sqitch** | DB-agnostic, dependency-aware |
| **pt-online-schema-change** | MySQL online DDL |
| **gh-ost** | MySQL online schema migration |
| **Squitch** | DB-agnostic CLI |
| **Confluent Schema Registry** | Kafka event evolution |
| **Apicurio Registry** | Open-source event registry |
| **buf** | Protobuf schema breaking-change detection |

## Cross-references

- `api-versioning.md` — API-level versioning depends on
  schema-level discipline
- `contract-testing.md` — verify the contract; schema is part
  of the contract
- `deprecation-lifecycle.md` — schema fields deprecate on a
  calendar
- `idempotency.md` — migrations are idempotent
- `data-retention.md` — schema changes don't change retention
  obligations
- `audit-logging.md` — schema changes are audited
- `task-intake-due-diligence.md` Q10 (data lifecycle), Q17
  (rollback)
- `error-codes.md` — `schema_version_mismatch`, `field_required`,
  `field_deprecated` codes

## Standards cited

- **Confluent Schema Registry — Compatibility Modes**
- **Avro Specification — Schema Resolution**
- **Protocol Buffers — Updating A Message Type**
- **JSON Schema Draft 2020-12**
- **PostgreSQL Documentation — DDL Concurrency**
- **MySQL Reference Manual — Online DDL**
- **AsyncAPI 3.0** — async API schemas
- **Expand-Contract pattern** — formalised by Pramod Sadalage +
  Scott Ambler in "Refactoring Databases" (2006)

## Why this rule exists

Schema migrations are the leading cause of "the deploy broke
production":

1. New column added with NOT NULL DEFAULT → 4-hour table rewrite
   → downtime
2. Column rename → old code still queries old name → 500s for
   minutes after deploy
3. Event payload field renamed → consumers can't deserialise →
   message backlog grows → SLA breached
4. Migration ran in dev, looks fine, deploys → prod has 1000x
   the data → migration takes 8 hours → can't roll back
5. Backfill UPDATE locks table → read traffic backs up → outage

Each one is a known pattern with a known mitigation. The cost
of expand-contract + zero-downtime DDL discipline is more
migration files (5 instead of 1) and a longer calendar for the
change. The cost of skipping it is production incidents that
take hours to recover from.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Migration combining ADD + DROP / RENAME in a single step (rule 1 violation — not zero-downtime)
- Long-running DDL on a populated table without CONCURRENTLY / online tooling (rule 4 weakening)
- Backfill UPDATE wrapped in one transaction over millions of rows (rule 5 violation — table-locking)
- New event payload shape published without schema-registry compatibility check (rule 6 weakening)
- ALTER COLUMN TYPE on a populated column (per-store specific risk)
- Column rename done in one step rather than expand-contract (rule 8 violation)
- Migration not tested on production-sized data (rule 10 weakening — dev-only validation)
- Hand-applied DDL discovered in prod (anti-pattern 2 — out-of-VCS migration)

**Refinement candidates**:

- New row in the per-store change-safety table when a DB version changes lock semantics
- Tightening of the "test on prod-sized data" gate when migration-time-bomb incidents recur
- New cross-reference when a sister rule (api-versioning, contract-testing) defines the API contract this rolls up to
- New tooling row when an online schema migration tool gains adoption

---

<!-- ============================================================
     Section: deprecation-lifecycle.md (from rules/common/)
     ============================================================ -->

# Deprecation Lifecycle Rule (Always-On, Global)

> Auto-fires on every file. Sister to `api-versioning.md` (versioned
> APIs deprecate by major bumps), `semver.md` (deprecations
> introduced in MINOR; removals in MAJOR), `feature-flags.md` (kill
> switches for in-flight deprecations), `error-codes.md`
> (`deprecated` + `code_deprecated` codes), `docs-sync-with-code.md`
> (deprecation notices live in docs). Standards: **RFC 8594**
> (Sunset HTTP header), **draft-ietf-httpapi-deprecation-header**,
> **Semantic Versioning 2.0.0**.

## Core Principle

**Every deprecation follows a calendar-anchored four-stage lifecycle:
ANNOUNCE → SOFT-DEPRECATE → HARD-DEPRECATE → REMOVE. Each stage has
a minimum dwell time and explicit communication requirements.
Skipping stages or compressing the timeline destroys consumer trust
and amounts to a silent breaking change.**

A deprecation is a promise to the consumer: "We're removing this
on date X; here's what to use instead." Breaking that promise —
removing without notice, removing earlier than announced,
"deprecating" forever without removing — turns the deprecation
process into a trap.

## Four stages

### Stage 1: Announce

- **What**: Public statement that the API / feature / config / SDK
  surface is being retired
- **Where**: Release notes, CHANGELOG, public docs, email to
  customers / partners (for paid APIs)
- **Headers**: None yet — the API still works as before
- **Code**: `@deprecated` JSDoc / docstring annotation; IDE shows
  strikethrough on call sites
- **Calendar minimum**: 0 days (the announcement IS the start of
  the clock)

### Stage 2: Soft-deprecate

- **What**: API still works; warnings emitted to alert users
- **Where**:
  - HTTP responses include `Deprecation: true` + `Sunset:
    <date>` + `Link: <successor>; rel="successor-version"` headers
  - Library deprecation warnings printed at first call site
  - Admin tools / management consoles show banners
  - SDK clients log warnings
- **Code**: Runtime warning on call (debug-level log, OR stderr
  warning, OR analytics event)
- **Calendar minimum**: 30 days from Announce

### Stage 3: Hard-deprecate

- **What**: API rejects most usage; only allowlisted clients
  continue to work
- **Where**:
  - New clients get `410 Gone` + Link to migration guide
  - Existing clients on allowlist get `Deprecation: true` + final
    cutoff date
  - Banners are more prominent ("Removal in `<N>` days")
  - Tickets opened against integration partners that haven't
    migrated
- **Code**: Runtime ERROR on call for non-allowlisted clients;
  allowlist managed via feature flag (per `feature-flags.md`)
- **Calendar minimum**: 60 days from Soft

### Stage 4: Remove

- **What**: The API / feature is gone; the code is deleted
- **Where**:
  - Requests get `410 Gone` + Link to migration guide
  - Removed from documentation (with a tombstone entry: "X was
    removed on date Y; use Z")
  - SDK versions stop shipping the symbol
  - Registry entry removed
- **Code**: Deleted entirely; tests for the old behaviour deleted;
  feature flag retired
- **Calendar minimum**: 0 days from Hard (the cutoff date)

**Total minimum runway** for public APIs: **90 days**. Internal
APIs: 30 days. Customer-facing SDK APIs with slow client upgrade
cycles: 12-24 months.

## Hard rules

### 1. Calendar anchored, not "when ready"

Every stage has a hard date set at announcement time. "We'll
remove it when nobody's using it" is not a deprecation — it's a
permanent maintenance burden. The cutoff date forces resolution.

### 2. Communication channels match the audience

| Audience | Channel |
| --- | --- |
| Public API consumers | Email to API keys' billing contacts + docs banner |
| SDK users | Package README + release notes + first-call warning |
| Internal teams | Slack channel + tech-leads email + internal docs |
| End users (UI features) | In-product banner + email for active users |
| Partners with custom integrations | Account manager outreach + signed acknowledgment |

The deprecation isn't real until the relevant audience has been
notified through their primary channel.

### 3. The replacement MUST exist before announcement

Don't announce "we're removing X" without saying "use Y instead."
The replacement Y is shipped, documented, and stable BEFORE the
announcement. Otherwise consumers face "we know it's going away
but we don't have a path forward" panic.

If there's genuinely no replacement (the feature is going away
entirely), the announcement says so explicitly + provides
migration help (export tooling, manual paths).

### 4. Track usage during the deprecation window

Per `observability.md`:

- `deprecated_endpoint_calls_total{endpoint, version, client_id}`
- `deprecated_field_reads_total{field, client_id}` (GraphQL)
- `deprecated_sdk_method_calls_total{method, sdk_version}`

These metrics inform:

- Which clients still need outreach
- Whether the cutoff date is realistic
- When the "nobody's using it" state is genuinely true

### 5. Allowlist extension is the exception, not the rule

When a major customer can't migrate by the cutoff:

- The allowlist is extended for THAT customer only
- A new, fixed cutoff date is set (typically +30 days)
- The allowlist entry has a documented owner + reason + expiry
- The customer signs an acknowledgment of the extension

Allowlist-as-permanent-state is a deprecation failure. Each
extension is one-time; the next one requires escalation.

### 6. The deprecation IS audit-logged

Per `audit-logging.md`:

- `deprecation.announced` event when stage 1 begins
- `deprecation.soft_started` when stage 2 begins
- `deprecation.hard_started` when stage 3 begins
- `deprecation.removed` when stage 4 completes
- `deprecation.allowlist_extended` events for each extension

The audit log is the durable record auditors / customers /
support can query: "When did we announce the removal of X?"

### 7. Migration tooling is provided when feasible

When the old → new migration is mechanical (rename a field, add
a parameter, swap an endpoint), the deprecating party SHIPS:

- A migration codemod (`@example/migrate-v1-to-v2` npm package)
- A migration guide with before/after examples
- Office hours / slack support for migration questions
- Optional: in-product migration wizard for end-user features

Migrations that are PURELY consumer effort (no tooling) extend
the runway proportionally.

### 8. Backward compatibility shims have explicit expiry

Sometimes the new API can serve old shapes via a compatibility
shim ("v1-compat mode"):

```typescript
// v2 handler with v1 shape support during deprecation window
async function handle(req: Request, res: Response) {
  if (req.headers['api-version'] === 'v1') {
    metrics.increment('compat.v1_shape_request', { client: req.headers['user-agent'] });
    return handleV1Compat(req, res);
  }
  return handleV2(req, res);
}
```

The compat shim itself has its own deprecation timeline — it's not
a permanent feature, just a transition aid.

### 9. Deprecation can be reversed in stage 1 or early stage 2

If consumer feedback reveals that the deprecation was premature
(major consumer can't migrate; replacement has unfixable gaps),
the deprecation can be REVERSED:

- New announcement: "Previously-announced removal of X has been
  cancelled."
- Rationale documented
- Reverse-announce date logged

Reversal in stage 3 or 4 is much harder — many consumers have
already migrated; reintroducing the old shape now creates a new
form of debt. Avoid.

### 10. Removal is final

Once Stage 4 completes, the deprecated thing is GONE. Restoring
it is a new feature work (with its own design, its own version,
its own announcement). The deprecation lifecycle is one-way.

## Annotation patterns per language

### TypeScript / JavaScript

```typescript
/**
 * @deprecated Use `fetchUser(id, options)` instead. Removal: 2026-12-31.
 *   See https://docs.example.com/migration/users-v2
 */
export function getUserById(id: string): User { ... }
```

ESLint rule `@typescript-eslint/no-deprecated` (or `import/no-deprecated`)
flags call sites.

### Go

```go
// Deprecated: Use FetchUser instead. Removal: 2026-12-31.
// See https://docs.example.com/migration/users-v2
func GetUserByID(id string) (*User, error) { ... }
```

`staticcheck` SA1019 flags call sites.

### Python

```python
import warnings

def get_user_by_id(user_id: str) -> User:
    """
    .. deprecated:: 2.4.0
       Use :func:`fetch_user` instead. Removal: 2026-12-31.
    """
    warnings.warn(
        "get_user_by_id is deprecated; use fetch_user. Removal: 2026-12-31",
        DeprecationWarning,
        stacklevel=2,
    )
    ...
```

`@deprecated` decorator from `typing_extensions` (PEP 702, Python
3.13+).

### Java

```java
/**
 * @deprecated Use {@link #fetchUser(String, Options)} instead.
 *   Removal: 2026-12-31.
 */
@Deprecated(since = "2.4.0", forRemoval = true)
public User getUserById(String id) { ... }
```

### Ruby

```ruby
# @deprecated Use {#fetch_user} instead. Removal: 2026-12-31.
def get_user_by_id(id)
  warn "[DEPRECATION] `get_user_by_id` is deprecated; use `fetch_user`. Removal: 2026-12-31"
  ...
end
```

### GraphQL

```graphql
type User {
  username: String @deprecated(reason: "Use handle. Removal: 2026-12-31")
  handle: String!
}
```

### Protobuf

```protobuf
message User {
  string username = 2 [deprecated = true];  // Use handle. Removal: 2026-12-31
  string handle = 3;
}
```

## HTTP response headers (REST)

During soft-deprecate:

```text
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sun, 31 Dec 2026 23:59:59 GMT
Link: <https://docs.example.com/api/v2>; rel="successor-version"
Warning: 299 - "GET /api/v1/users is deprecated. Use /api/v2/users. Removal 2026-12-31"
```

During hard-deprecate (for non-allowlisted clients):

```text
HTTP/1.1 410 Gone
Content-Type: application/json
Link: <https://docs.example.com/api/v2>; rel="successor-version"

{
  "error_code": "deprecated",
  "message": "This endpoint was removed on 2026-12-31. Use /api/v2/users.",
  "details": {
    "migration_guide": "https://docs.example.com/api/v2/migration",
    "removed_on": "2026-12-31"
  }
}
```

## Anti-patterns

### Anti-pattern 1: "Deprecated forever"

A `@deprecated` annotation that's been in place for 3+ years
without removal becomes invisible. Consumers learn to ignore
deprecation warnings. Set + honor the cutoff date.

### Anti-pattern 2: Quiet deprecation

Removing a feature without ever announcing it as deprecated is a
breaking change disguised as a bug fix. Customers find out via
their broken integration.

### Anti-pattern 3: Stage-jumping

Skipping from Announce straight to Remove (no soft / hard
period) is identical to no deprecation at all from the consumer's
perspective.

### Anti-pattern 4: Per-deprecation lifecycle invention

Each team inventing their own deprecation playbook means
consumers face different rules across products. Standardise on
the four-stage lifecycle company-wide.

### Anti-pattern 5: "Deprecated in v1.2" without removal date

The version isn't enough. Consumers don't know when v3.0 will
ship; they need a calendar date.

## Cross-references

- `api-versioning.md` — major versions deprecate older versions
- `semver.md` — deprecation in MINOR; removal in MAJOR
- `feature-flags.md` — allowlist managed via flag; kill switch
  available
- `error-codes.md` — `deprecated`, `code_deprecated`,
  `endpoint_removed` codes
- `docs-sync-with-code.md` — deprecation notice in docs + CHANGELOG
- `audit-logging.md` — deprecation events audited
- `observability.md` — usage metrics during deprecation window
- `task-intake-due-diligence.md` Q18 (deprecation lifecycle)

## Standards cited

- **RFC 8594** — Sunset HTTP header
- **draft-ietf-httpapi-deprecation-header** — Deprecation header
  - Link relation `successor-version`
- **Semantic Versioning 2.0.0** — semantics of MINOR vs MAJOR
  bumps for deprecation
- **PEP 702** (Python) — `@deprecated` decorator typing
- **JEP 277** (Java) — Enhanced Deprecation

## Why this rule exists

Without a calendar-anchored lifecycle, deprecations fall into one
of two failure modes:

1. **Permanent deprecation** — Marked deprecated for years; never
   removed; the code stays as technical debt; consumers stop
   trusting deprecation warnings; new APIs accumulate forever
   because old ones can't be cleaned up.

2. **Surprise removal** — Quiet deprecation, then removal without
   notice; consumers wake up to broken integrations; support
   tickets flood in; trust is destroyed.

The four-stage lifecycle solves both: the calendar forces
removal (no permanent state), the runway gives consumers time to
migrate (no surprise), and the public communication makes the
deprecation visible (no quiet removal).

The cost is process discipline. The benefit is APIs that can
actually evolve without breaking customers.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Stage skipped (Announce → Remove without Soft + Hard intermediate) — rule 1 weakening
- Deprecation marked but cutoff date missing or open-ended (anti-pattern 1 — permanent deprecation)
- Allowlist extension granted ad-hoc without fresh acknowledgment (rule 5 weakening)
- Replacement not shipped + stable BEFORE Announce (rule 3 violation)
- Communication channel mismatch — internal teams notified, paid API consumers not (rule 2 weakening)
- Usage metrics not tracked during deprecation window (rule 4 weakening — flying blind on migration progress)
- Stage 3 / 4 reversal attempted (rule 9 — late reversal creates new debt)
- Migration tooling absent for a mechanical migration (rule 7 weakening)

**Refinement candidates**:

- New runway-minimum row when an audience class (e.g., mobile SDK consumers) proves slower
- Tightening of the audit-log shape (rule 6) when forensics needs a dimension currently missing
- New cross-reference when a sister rule (api-versioning, semver) defines the version semantics this depends on
- New per-language annotation example when a language gains a canonical deprecation marker

---
