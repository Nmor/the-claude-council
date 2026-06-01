---
name: provider-research
description: Read and cite primary-source provider documentation BEFORE writing any integration code against an external API. Enforces the official-docs-first rule across calendar, identity, payment, mail, push, ML, and observability providers.
---

# Provider Research

Companion skill to the global rule `~/.claude/rules/common/official-docs-first.md`.
Activates on any session that touches integration code against an external provider.

## When to Activate

- Adding or modifying integration code for any external API (OAuth /
  OIDC client, calendar / mail / messaging APIs, payment processors,
  push services, ML / AI vendors, observability vendors, mobile push
  platforms).
- Adding a new provider to an existing integration surface.
- Investigating an unexpected error code from a provider.
- Migrating off a deprecated provider scope, API version, or
  authentication shape.
- Plan-mode work that proposes a new external dependency.

## What to do (4 steps)

### 1. Locate the CANONICAL documentation

Not Stack Overflow. Not the npm package README. Not a blog post. The
provider's own docs at the provider's own domain.

Examples:

| Provider | Canonical home |
| --- | --- |
| Google Workspace | `developers.google.com/workspace` |
| Microsoft Graph | `learn.microsoft.com/en-us/graph/` |
| OpenID Connect Core | `openid.net/specs/openid-connect-core-1_0.html` |
| OAuth 2.0 / PKCE | RFC 6749 / RFC 7636 |
| Stripe | `stripe.com/docs/api` + `stripe.com/docs/webhooks/signatures` |
| AWS | `docs.aws.amazon.com/<service>/latest/<APIReference,DeveloperGuide>` |
| Web Push / VAPID | RFC 8030, RFC 8291, RFC 8292 + W3C Push API |
| Slack | `api.slack.com/docs` |
| Zoho | `zoho.com/<product>/help/api` (Workplace, Mail, CRM each separate) |
| Apple Sign in | `developer.apple.com/documentation/signinwithapplerestapi` |
| CalDAV | RFC 4791 + RFC 6638 |
| FCM | `firebase.google.com/docs/cloud-messaging` |
| APNs | `developer.apple.com/documentation/usernotifications` |

When the provider names a specific RFC for an interoperable protocol
(CalDAV → 4791, OAuth → 6749), the RFC is the authoritative reference
even if the provider has its own quirks doc.

### 2. Confirm the contract from the official docs

For each integration point, read and note:

- **Auth model.** OAuth 2.0 + offline_access? PKCE? Service account?
  App-specific password? Signed JWT client-assertion? mTLS? IAM
  federation?
- **Scope list and deprecation.** Which scopes you need + which scopes
  the provider has flagged for removal + their sunset date.
- **Token lifetime + refresh semantics.** What `invalid_grant` means
  for *this* provider. Whether the refresh token rotates per use.
- **Webhook signature shape.** HMAC scheme, header name, timestamp
  window, idempotency key.
- **Rate limits + retry guidance.** Per-second, per-user, per-token.
  Whether 429 carries `Retry-After`. Whether 5xx should be retried
  blindly.
- **Tenant model.** Commercial vs personal tier (Workspace vs Gmail,
  M365 vs MSA, Workplace vs `@zoho.com`, iCloud+ custom-domain vs
  `@icloud.com`). Which tier is in scope and how the code rejects
  the other.

### 3. Write the provider-research note

Create `docs/provider-research/<provider>.md` in the project (the
durable home for citations). Required sections:

```markdown
# <Provider name> — research notes

## Surface in scope
- <API + the application feature it backs>

## Auth model
- <OAuth scopes / app passwords / service account / etc.>
- <Token lifetime, refresh shape, rotation cadence>

## Primary sources (consulted on <YYYY-MM-DD>)
- <URL 1> — <one-line summary of what we read>
- <URL 2> — <one-line summary>
- <URL 3> — <one-line summary>

## Risks identified
- <Risk 1 — e.g. push channel TTL of 7 days requires re-subscribe cron>
- <Risk 2 — e.g. Workspace admin can disable the app via Marketplace policy>
- <Risk 3 — e.g. personal-tier account presents but is out of scope>

## Tier scope
- IN: <e.g. Google Workspace, Microsoft 365 Business>
- OUT: <e.g. personal Gmail, personal Outlook.com>
- How OUT is rejected at runtime: <e.g. `tid` claim check, email-domain blocklist>

## Open questions
- <Anything the docs didn't answer; flag to user before writing code>
```

### 4. Cite in the plan + PR

- **Plan file** — every integration plan has an "ONLINE RESEARCH"
  section that lists the canonical URLs + one-line takeaways.
- **PR description** — summary table naming each provider touched
  and the research-note path.
- **Code comments** — DO NOT carry URLs. They rot. The research file
  is the durable home (see `coding-style.md`).

## What this skill prevents

- Integration code that compiles + tests but breaks against the live
  provider because the README and the official docs disagree.
- Scope sets that were deprecated 18 months ago.
- Webhook handlers with wrong HMAC headers because the npm wrapper
  abstracts the verification away.
- Refresh tokens that never rotate because the code assumed Google
  semantics when the provider is Microsoft.
- Personal-tier accounts slipping through when only commercial-tier
  was supposed to be in scope.

## Cross-references

- `~/.claude/rules/common/official-docs-first.md` — the rule.
- `~/.claude/rules/common/docs-sync-with-code.md` — the docs-sync
  gate the provider-research file participates in.
- `~/.claude/rules/common/done-criteria.md` — "done" requires the
  provider-research file to exist and to be fresh.
- `~/.claude/rules/common/no-overclaim.md` — never claim the
  integration is done without the citations.

## Purpose

Principal-level provider-research discipline: read primary sources
(provider docs at provider's own domain, RFCs, W3C specs, ISO/IEC
standards) BEFORE writing integration code; emit a durable
`docs/provider-research/<provider>.md` artefact per integration;
include auth model, scope deprecation cadence, rate limits, retry
semantics, business-tier vs personal-tier separation, webhook
signature verification, idempotency primitives, breaking-change
calendar; refresh every 6 months or on provider-deprecation notice.

**Negative scope** (NOT what this skill covers):
- Code generation from OpenAPI / GraphQL SDL — out
- Provider-specific integration implementation — out; that's the
  per-provider skill (calendar-provider, web-push-notifications,
  etc.)
- Build-time API client generation tooling — defer to
  `openapi-generator` / `graphql-codegen`

## When NOT to use

- Internal-only APIs where the team owns the spec
- One-off, single-call integrations with no auth (e.g., public CDN)
- Throwaway prototypes scheduled to be deleted within the week

## Standards Cited

- **`~/.claude/rules/common/official-docs-first.md`** — the rule
- **`~/.claude/rules/common/docs-sync-with-code.md`** — keeps the
  research file in sync with code
- **`~/.claude/rules/common/done-criteria.md`** — completion gate
- **RFC 6749 (OAuth 2.0)** — typical auth model
- **RFC 7235 (HTTP Authentication)** — Bearer / Basic
- **RFC 8725 (JWT BCP)** — token validation
- **W3C Webhooks Working Group** — webhook delivery contracts
- **OWASP ASVS 4.0.3 §3 (Session Management)** — token storage
  + rotation
- **OWASP ASVS 4.0.3 §10 (Malicious Code)** — verify SDK provenance

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Reading the npm README only | Wrappers lag provider docs; miss deprecations | Read provider's canonical docs at the provider's own domain |
| Copying from Stack Overflow | Snippets are stale, tier-mismatched, security-naïve | Primary-source citation with URL + read-date in the research file |
| Single-tier assumption ("we'll only support Google Workspace") | Personal-tier traffic still arrives; rejected late, with leakage risk | Explicit IN / OUT tier table + runtime rejection |
| No webhook signature verification | Spoofed webhook payloads accepted | Implement provider's signed-payload check per their docs |
| Polling instead of webhooks | API quota burn; eventual-consistency UX | Use webhooks where available; fall back to polling with backoff |
| Treating retry policy as universal | Each provider has its own retry-after semantics | Document per-provider retry shape in research file |
| Provider-research file written AFTER the integration | Discovery work done blindly; rework | Write the file BEFORE the first handler / lib file |
| Stale file > 6 months untouched | Cited URLs may 404; scopes deprecated | Refresh quarterly OR on deprecation notice |

## Verification Checklist

- [ ] `docs/provider-research/<provider>.md` exists
- [ ] Cites primary-source URLs (no Stack Overflow / blog posts as
      sole source)
- [ ] Read-date stamped on every citation
- [ ] Auth model documented (OAuth flow, scopes, refresh semantics)
- [ ] Rate limits + retry shape documented
- [ ] Webhook signature verification documented
- [ ] Idempotency primitive documented (provider's `Idempotency-Key`
      pattern OR our app-side approach)
- [ ] Business-tier vs personal-tier explicitly named + rejected
      at runtime if out-of-scope
- [ ] Breaking-change cadence noted (provider's deprecation policy)
- [ ] File age ≤ 6 months OR refreshed on deprecation notice
- [ ] Cross-linked from the plan file's ONLINE RESEARCH section
- [ ] Cross-linked from any code module that consumes the provider

## Cross-References

- `~/.claude/skills/calendar-provider/SKILL.md` — applies this
  discipline to calendar
- `~/.claude/skills/web-push-notifications/SKILL.md` — applies it
  to web push (FCM / APNs / Web Push)
- `~/.claude/skills/api-design/SKILL.md` — consumer-side patterns
- `~/.claude/rules/common/official-docs-first.md` — the mandate
- `~/.claude/rules/common/docs-sync-with-code.md` — sync gate
- `~/.claude/rules/common/done-criteria.md` — completion gate
- `~/.claude/agents/architect.md` — Council Division 1 enforces
  this in Phase 0

## Why this skill exists

External integrations fail when teams skip primary-source research:
they read the npm wrapper's README, copy a tutorial snippet from
2021, and ship integration code against a deprecated scope or a
mistyped webhook secret. The cost is months of mystery failures
that primary-source docs would have prevented in one hour. The
research file + refresh cadence + tier discipline turn the
"$1k-of-engineering-time" research investment into a durable
artefact every future maintainer can read.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Integration code shipped before `docs/provider-research/<provider>.md` exists (rule weakening)
- Provider-research file older than 6 months and not refreshed before a change (staleness threshold breached)
- Stack Overflow / npm README / blog post cited as the canonical source (primary-source-first rule weakening)
- Auth model section missing scope deprecation cadence + token rotation semantics (failure-mode gap)
- Rate-limit section missing per-tenant + per-endpoint figures (capacity-planning gap)
- Commercial-vs-personal tier scope absent or ambiguous (out-of-scope tier silently accepted at runtime)
- Webhook signature verification + replay window absent from research note (security gap)
- File treated as one-shot artifact rather than living doc updated on every provider change

**Refinement candidates**:
- New section in template when a recurring research-gap surfaces (e.g., SDK breaking-change tracking, region-specific endpoint differences)
- Freshness-threshold tightening when staleness causes incidents (e.g., 3 months for fast-moving providers like OpenAI vs 6 months for stable like RFC-protocol providers)
- New provider type when an integration class arrives that doesn't fit existing slots (e.g., blockchain RPC, ML model provider, EDR / SIEM vendor)
- Automation candidate: provider-research file generator that scaffolds the template + queues canonical URLs for fresh-fetch
