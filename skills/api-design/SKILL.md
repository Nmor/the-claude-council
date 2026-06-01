---
name: api-design
description: REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production APIs.
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

```
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

```
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

```
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

```
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

```
GET /api/v1/users?page=2&per_page=20

# Implementation
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 20;
```

**Pros:** Easy to implement, supports "jump to page N"
**Cons:** Slow on large offsets (OFFSET 100000), inconsistent with concurrent inserts

### Cursor-Based (Scalable)

```
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

```
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

```
# Single field (prefix - for descending)
GET /api/v1/products?sort=-created_at

# Multiple fields (comma-separated)
GET /api/v1/products?sort=-featured,price,-created_at
```

### Full-Text Search

```
# Search query parameter
GET /api/v1/products?q=wireless+headphones

# Field-specific search
GET /api/v1/users?email=alice
```

### Sparse Fieldsets

```
# Return only specified fields (reduces payload)
GET /api/v1/users?fields=id,name,email
GET /api/v1/orders?fields=id,total,status&include=customer.name
```

## Authentication and Authorization

### Token-Based Auth

```
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

```
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

```
/api/v1/users
/api/v2/users
```

**Pros:** Explicit, easy to route, cacheable
**Cons:** URL changes between versions

### Header Versioning

```
GET /api/users
Accept: application/vnd.myapp.v2+json
```

**Pros:** Clean URLs
**Cons:** Harder to test, easy to forget

### Versioning Strategy

```
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

- `~/.claude/rules/common/no-silent-failures.md` —
  false-positive success states.
- `~/.claude/rules/common/no-discards.md` — `as any` casts that
  hide shape drift.
- `~/.claude/rules/common/done-criteria.md` — "done" requires
  the contract test to pin the shape.
- `~/.claude/rules/common/contract-testing.md` — broader CDC
  (Pact) + schema-based (OpenAPI / GraphQL / Proto) discipline.

## Purpose

Design REST API contracts that are consistent, predictable, and stable across versions. Covers resource naming, status codes, pagination, filtering, error envelopes, authentication shape, rate-limit semantics, and response-shape contracts between backend and frontend.

**Negative scope**: NOT GraphQL schema design (GraphQL evolves additively at field level, not URL level). NOT internal RPC contracts (gRPC / Proto live under their own discipline). NOT message-bus event schemas (Kafka / SNS contracts are the event payload, not a REST surface). NOT internal-only DB-backed handlers with no external consumer.

## When NOT to use

- GraphQL services — schema-level evolution rules differ; use a GraphQL-specific guide
- gRPC / Proto3 services — `proto` files are the contract
- Webhook-only outbound interfaces — see `~/.claude/rules/common/api-versioning.md` for sunset semantics
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
| Non-idempotent POST without `Idempotency-Key` | Double-charge / double-create on network retry | Accept `Idempotency-Key` header (Stripe pattern) — see `~/.claude/rules/common/idempotency.md` |
| `201 Created` without `Location` header | Client doesn't know the new resource URL | Always set `Location: /api/v1/<resource>/<id>` |
| Major version bump for additive changes (new optional field) | Forces unnecessary client migration; burns version slots | Additive = same major; only breaking = bump |
| Offset pagination on tables with concurrent writes | Items shift between pages → duplicates and gaps | Cursor pagination over indexed column |
| Server stack traces leaking through error body | Reveals framework, version, file paths to attackers | Strip at boundary; `error.code` + `error.message` only |

## Verification Checklist

- [ ] Status codes match RFC 9110 (404 missing, 409 conflict, 422 unprocessable, 429 rate-limit)
- [ ] Error envelope has stable `error.code` + `error.message` + optional `details[]`; no internal stack traces
- [ ] List endpoints paginated (cursor preferred); response includes `meta.next_cursor` or `meta.total`
- [ ] POST returns `201 Created` + `Location` header
- [ ] `Idempotency-Key` supported on mutating POSTs (per `~/.claude/rules/common/idempotency.md`)
- [ ] Versioning via URL path (`/api/v1/`) OR Accept header; deprecation signalled via `Sunset` + `Link: rel="successor-version"`
- [ ] Rate-limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) on every endpoint
- [ ] Response shape pinned by shared type AND a contract test (per Response-shape contracts above)
- [ ] OWASP API Top 10 cross-check (BOLA on every object-level read, rate-limit on every public endpoint)

## Cross-References

- `~/.claude/rules/common/api-versioning.md` — major-vs-minor evolution rules + `Sunset` lifecycle
- `~/.claude/rules/common/idempotency.md` — `Idempotency-Key` contract
- `~/.claude/rules/common/error-handling-with-context.md` — error envelope shape (operation + ids)
- `~/.claude/rules/common/error-codes.md` — stable code catalogue
- `~/.claude/rules/common/rate-limiting.md` — RateLimit-* header standard
- `~/.claude/rules/common/contract-testing.md` — CDC (Pact) + OpenAPI / JSON Schema validation
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
