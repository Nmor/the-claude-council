# api-design: Versioning

> The skill's own versioning section plus the migrated `rules-library/common/api-versioning.md`:
> strategies, breaking-vs-additive, ten hard rules, GraphQL + gRPC specifics, anti-patterns,
> tooling. Pointed at by the "Versioning" rows of `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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

## Documents

- [API Versioning Rule (Always-On, Global)](api-versioning-rule.md)
