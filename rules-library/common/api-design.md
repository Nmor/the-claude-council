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
