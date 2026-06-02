# Official-Docs-First Rule (Always-On, Global)

> Auto-fires on every file. Sister to `done-criteria.md`, `no-discards.md`,
> `no-silent-failures.md`, and `docs-sync-with-code.md`.

## Core Principle

**Before writing ANY integration code against an external provider, the
agent MUST read and cite the provider's canonical developer
documentation for the specific API surface being touched.**

"External provider" means anything the codebase calls out to that isn't
its own infrastructure: identity providers (OIDC, OAuth, SAML, LDAP),
calendar / mail / messaging APIs (Google, Microsoft, Zoho, Slack,
Twilio, SendGrid, SES), payment processors (Stripe, Adyen, Paystack,
Flutterwave), push services (FCM, APNs, web push / VAPID), object
stores (S3, GCS, Azure Blob, R2), ML / AI vendors (Bedrock, OpenAI,
Anthropic, Replicate), observability (Datadog, Honeycomb, Sentry,
Grafana Cloud), background-job platforms, mobile push platforms,
analytics SDKs.

The pattern this rule prevents: integration code that *looks* right
because it follows the npm package's README example but breaks in
production because the README and the provider's docs disagree, or
because the README is silent on an edge case that the official docs
spell out (token-rotation cadence, scope deprecations, tenant-policy
rejection codes, retry semantics, content-encoding requirements).

## Hard rules

1. **Locate and read the provider's CANONICAL developer documentation
   for the specific API surface.** Not Stack Overflow. Not a blog post.
   Not the README of an npm package wrapping the provider. The
   provider's own docs at the provider's own domain (e.g.
   `developers.google.com`, `learn.microsoft.com`, `stripe.com/docs`,
   `developer.apple.com`).

2. **Confirm the auth model from the official docs:** OAuth 2.0 / OIDC
   scopes (and which scopes are deprecated), app-specific passwords,
   service accounts, IAM federation, mTLS, signed JWT
   client-assertion. Token lifetime, refresh semantics, what
   `invalid_grant` actually means for *that* provider.

3. **Cite primary-source URLs in the implementation plan** before the
   first handler / lib file is written. Plan files live at
   `~/.claude/plans/` (or per-project equivalent) and must include an
   "ONLINE RESEARCH" section with at least one canonical URL + section
   per major integration point.

4. **For business / commercial vs personal-tier products, research
   BOTH and document which is supported.** Many providers split:
   - Google Workspace vs personal Gmail
   - Microsoft 365 commercial tenants vs personal Outlook.com / MSA
   - iCloud+ custom-domain vs personal `@icloud.com`
   - Zoho Workplace (business) vs `@zoho.com` (personal)
   - Slack Enterprise Grid vs free workspace
   - Fastmail Business vs personal Fastmail

   The auth model, available scopes, tenant-policy options, and
   billing differ. State explicitly which tier is in scope and how
   the code rejects the other.

5. **If primary-source docs are paywalled / restricted / unavailable,
   surface the risk to the user BEFORE writing code.** Don't guess
   from the npm package's example and ship.

6. **Stub or example code from the library's GitHub README is NOT a
   substitute for the official docs.** The provider's docs win on any
   behaviour question. The library may be out of date, may handle a
   scope the provider has since removed, may omit edge cases.

## What "canonical" looks like per common providers

The table below names the canonical doc surface — start here, then
deep-link as needed.

| Provider | Canonical entry point |
| --- | --- |
| Google Workspace APIs | `developers.google.com/workspace` (per-product subpages: Calendar, Drive, People, Admin SDK) |
| Microsoft Graph | `learn.microsoft.com/en-us/graph/` (resources, permissions, change notifications) |
| OpenID Connect | `openid.net/specs/openid-connect-core-1_0.html` (the spec itself; library docs second) |
| OAuth 2.1 / 2.0 | `datatracker.ietf.org/doc/html/rfc6749`, `datatracker.ietf.org/doc/html/rfc7636` (PKCE) |
| Apple ID + SSO | `developer.apple.com/documentation/signinwithapplerestapi` |
| Slack APIs | `api.slack.com/docs` |
| Stripe | `stripe.com/docs/api`, `stripe.com/docs/webhooks/signatures` |
| AWS | `docs.aws.amazon.com/<service>/latest/<APIReference,DeveloperGuide>/` |
| Web Push / VAPID | RFC 8030, RFC 8291, RFC 8292; W3C Push API spec |
| Zoho | `zoho.com/<product>/help/api` (Workplace, Mail, CRM each separate) |
| CalDAV | RFC 4791, RFC 6638 (scheduling); plus each server's deviation notes |
| CardDAV | RFC 6352 |
| iCal / iCalendar | RFC 5545, RFC 5546 (iTIP), RFC 6047 (iMIP) |
| FCM | `firebase.google.com/docs/cloud-messaging` |
| APNs | `developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server` |
| Twilio | `twilio.com/docs/api` |

When the provider names a specific RFC for an interoperable protocol
(CalDAV → 4791, OAuth → 6749), the RFC is the authoritative reference
even if the provider has its own quirks doc.

## Plan-file contract

Every plan that introduces a new integration must include a section:

```markdown
## ONLINE RESEARCH (per official-docs-first rule)

### <Provider name>
- **API surface**: Calendar Events, push notifications subscribe
- **Auth model**: OAuth 2.0 + offline_access for refresh tokens; PKCE recommended
- **Primary sources read**:
  - https://developers.google.com/calendar/api/guides/push (push channel TTL = 7 days)
  - https://developers.google.com/identity/protocols/oauth2/scopes#calendar (scope list)
  - https://developers.google.com/calendar/api/v3/reference/events/watch (subscribe request shape)
- **Risks identified**:
  - Push channel auto-expires every 7 days; need re-subscribe cron
  - Workspace admins can globally restrict the app via Marketplace policy
  - Personal Gmail accounts present but out of scope per business-only policy
```

Plan-mode work that lacks this section MUST NOT proceed to implementation.
The Architecture & Planning division refuses to sign Phase 0 without it.

## What we read does not stay implicit

The cited URLs go in:

1. The plan file (as above).
2. The `docs/provider-research/<provider>.md` file (one per provider) —
   so the citations survive after the plan archive rolls.
3. The PR description summary table.

Code comments do NOT carry the URLs (they rot — see `coding-style.md`
ban on tracker pointers in comments). The provider-research file is
the durable home.

## When to re-read the docs

- A new feature on an already-integrated provider — re-read the
  relevant subpage even if you wrote the integration last month.
- Provider deprecation notice received — re-read the migration guide
  before any change.
- Provider returns an unexpected error code — read the docs for that
  code before writing a retry / fallback.
- More than 6 months since the integration was authored — re-read
  before the next non-trivial change.

## Why this rule exists

A recent calendar / social-login feature was implemented against the
npm packages' READMEs without reading Google Workspace's actual scope
deprecation cadence, Microsoft Graph's commercial-vs-personal-tenant
`tid` claim, or Zoho Workplace's Application-Specific Password format.
The code looked right and passed local tests; production exposed
multiple edge cases the README didn't cover. The fix path was:

1. Stop the line.
2. Backfill `docs/provider-research/<provider>.md` with primary-source
   citations.
3. Re-derive the integration shape from the citations.
4. Re-write the code against the now-known contract.

The cost of reading the docs once at plan time is one hour. The cost
of debugging an integration built on guesses is days plus a P1
incident.

## Cross-references

- `done-criteria.md` — "done" claims require the provider-research
  file to exist and to be up to date.
- `docs-sync-with-code.md` — provider-research files are part of the
  docs-sync gate.
- `no-overclaim.md` — "the integration works" isn't done until the
  citations exist.
- Council protocol Phase 0 (`~/.claude/CLAUDE.md`) — Architecture &
  Planning division enforces this rule.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `docs/provider-research/<provider>.md` missing for an integration that shipped (rule violation pattern)
- Provider-research note > 6 months stale and integration touched without refresh (cadence rule needs reinforcement)
- Integration shaped from npm README / Stack Overflow instead of provider docs (Phase 0 discipline weak)
- Personal-tier vs commercial-tier scope unclear — boundary missing (rule needs new section example)
- Auth model assumed instead of cited (recurring shortcut pattern)
- Deprecation notice from provider arrived but integration not re-read (cadence rule needs reinforcement)
- Same provider integrated by multiple agents independently (candidate for shared provider-research template)

**Refinement candidates**:

- New canonical-doc-surface entry when a provider's docs need named anchor (table extension)
- New anti-pattern entry when a shortcut recurs across 2+ integrations
- Tightening of the 6-month refresh cadence when provider deprecations get missed
- New pairing entry when sister rules consistently catch what this rule misses
