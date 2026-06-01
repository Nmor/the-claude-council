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
  - Banners are more prominent ("Removal in <N> days")
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

```
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sun, 31 Dec 2026 23:59:59 GMT
Link: <https://docs.example.com/api/v2>; rel="successor-version"
Warning: 299 - "GET /api/v1/users is deprecated. Use /api/v2/users. Removal 2026-12-31"
```

During hard-deprecate (for non-allowlisted clients):

```
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
  + Link relation `successor-version`
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
