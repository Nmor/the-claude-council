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
- <API + the StewardBot feature it backs>

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
