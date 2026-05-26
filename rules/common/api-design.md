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
