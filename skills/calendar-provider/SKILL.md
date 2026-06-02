---
name: calendar-provider
description: Patterns for integrating business calendar providers (Google Workspace, Microsoft 365, Zoho Workplace, business CalDAV). OAuth flow, push subscriptions, echo suppression, etag concurrency, and write-back via the outbox pattern.
---

# Calendar Provider Integration

Companion skill to `provider-research` and the global
`official-docs-first` rule. Activates when touching any
calendar-provider integration code (`lib/calendar/providers/*`,
calendar OAuth, sync, write-back, alarms).

## Scope

**Business providers only.**

| Provider | Auth | Push? | Cron floor |
| --- | --- | --- | --- |
| Google Workspace | OAuth — `openid email profile calendar.events calendar.readonly` | Yes — Push Notifications API, channel TTL 7 days, X-Goog-Channel-Token HMAC | n/a (push covers it) |
| Microsoft 365 Business | OAuth — `openid email profile offline_access Calendars.ReadWrite` | Yes — Graph change notifications, TTL up to 4230 min, `clientState` HMAC | n/a |
| Zoho Workplace | App-specific password — CalDAV `caldav.zoho.com` | No — Zoho has no push | 60s active tab, 5min otherwise |
| Generic business CalDAV (Fastmail / Nextcloud / Posteo / mailbox.org) | App-specific password — caller-supplied URL | No — RFC 4791 has no push | 60s active, 5min otherwise |

**Out of scope:** Apple iCloud (consumer), personal Gmail / Outlook /
Yahoo / Proton (consumer). Rejection lives in `lib/emailDomainPolicy.ts`
at signup AND social-callback parity.

## Required reading before any change

- `docs/provider-research/google-calendar.md` — scopes, push channel
  TTL, Workspace admin-policy interactions.
- `docs/provider-research/microsoft-graph.md` — `Calendars.ReadWrite`
  vs `Calendars.ReadWrite.Shared`, `tid` claim for tenant rejection,
  change-notification renewal.
- `docs/provider-research/zoho-workplace.md` — Application-Specific
  Password format, Workplace server URL distinct from personal Zoho.
- `docs/provider-research/fastmail-nextcloud-posteo.md` — per-provider
  server URL formats.

If any of these doesn't exist or hasn't been touched within 6 months,
refresh it first (see `provider-research` skill).

## Core invariants

### 1. Email-match server-side

A user signed in as `alice@acme.com` can ONLY connect a calendar
whose verified email matches `alice@acme.com`. Enforced in
`calendarOAuth.ts` after the token exchange, before persisting the
connection. Mismatch → 403 `email_mismatch` + audit row.

For CalDAV, verify the `current-user-principal` returned by PROPFIND
matches the username the user entered.

### 2. Cell-bound + plan-gated

Every read/write route runs through `authenticate()` (cell check) +
`checkFeature(orgId, "calendarImport")` (PRO+). Write routes
additionally check the per-connection `writable` flag and the
per-feature `auto_write_prefs` toggle.

### 3. Token refresh persistence

When the provider returns a refreshed access token, the calling lib
MUST persist it back to the connection row via the shared
`persistRefreshedTokens` helper. NOT persisting means every sync
re-refreshes from the (potentially long-since-rotated) refresh token
— wastes API calls and trips reuse-detection.

Code shape:

```ts
const client = await buildGoogleCalendarClient(connection, {
  onTokenRefresh: (newTokens) =>
    persistRefreshedTokens(connection.connection_id, newTokens),
});
```

### 4. Echo suppression on push

When we write to a provider, we stamp the event with
`app_origin_id` extended property. The provider push channel
then sends the event back to us as a "new event". The sync worker:

1. Looks up the row via the `origin_index` GSI by
   `app_origin_id`.
2. If status = `pending_external_write`: reconcile (update etag +
   external_event_id, flip to `synced`).
3. If status = `synced`: no-op (recognise our own echo).
4. If status = `synced` AND local copy is stale: provider wins on
   title/time, we keep alarm bindings.

Without this the sync creates a duplicate for every event we wrote.

### 5. Etag-guarded writes

On update, supply the cached `external_etag`. On `412 Precondition
Failed`:

1. Re-fetch the latest provider state.
2. Three-way merge (provider wins on title/time, we keep alarm
   bindings).
3. Retry up to 3×.
4. On persistent failure → status `write_conflict` + audit row + UI
   banner.

### 6. Outbox-published writes

Manual writes (user clicks "+ Add event" or any "mirror to calendar"
path) go through `lib/outbox.ts` so retries and DLQ routing are
handled centrally. The HTTP response is 202 with the local row
already visible to the client. The outbox worker dispatches via
`lib/calendar/writeBack.ts`.

Idempotency key: `cal:write:<app_origin_id>:v<version>`.

### 7. PII envelope at rest

Event `title`, `description`, `attendees` are encrypted via the
`piiEncryption.ts` envelope. Free/busy buckets never decrypt — only
the per-event detail dialog does.

### 8. Cron-fallback active-window logic

CalDAV (Zoho + generic) connections poll on a 60s cron when the user
has had a WS connection open in the last 5 min (active-user fast
path), 5min otherwise. `last_active_at` is stamped by the
`useCalendarSocket` composable. Without this signal the default
floor is 15 min.

### 9. Write-back consent toggles

Auto-write per source-type (`task`, `todo`, `standup_run`,
`okr_checkin`, `roadmap_milestone`, `poll_book`, `invite`,
`ai_event`) is opt-in per user in `users.calendar_auto_write_prefs`.
Default OFF for every auto path. Manual writes (the `/calendar` view's
"+ Add event" button, poll closing, AI confirmation dialog) are always
allowed.

### 10. Health-sweep + reconnect banner

`calendarHealthSweep` cron runs hourly. After 3 consecutive 401/403
returns from a provider, the connection is flipped to
`status=token_expired` (refreshable) or `status=revoked` (not), an
audit row is written, and the frontend shows a sticky "Reconnect
`<provider>`" banner.

## Test contract

For every provider-touching change:

1. **OAuth happy-path test** — calls the provider mock, verifies
   email-match guard, persists encrypted tokens.
2. **OAuth email-mismatch test** — verifies 403 `email_mismatch` +
   audit row.
3. **Sync echo-suppression test** — writes a row, simulates provider
   push, asserts no duplicate.
4. **Etag conflict test** — provider returns 412, asserts three-way
   merge + status transition.
5. **Token-refresh-persistence test** — fakes a refresh, asserts the
   connection row's `access_token_encrypted` field changed.
6. **Health-sweep test** — 3 consecutive 401s, asserts status
   transitions + banner-emit hook.

## Cross-references

- `~/.claude/rules/common/official-docs-first.md` — primary-source
  citations required.
- `provider-research` skill — workflow for the citations.
- `~/.claude/rules-library/common/no-discards.md` — refresh-token rotation
  must be bound + persisted, never dropped.
- The consuming project's `docs/<calendar-feature>.md` — feature
  page describing user-visible behaviour.
- The consuming project's `docs/runbook.md` — recovery procedures
  for reconnect / token-expiry / write-conflict states.

## Purpose

Principal-level multi-provider calendar integration: OAuth scope
negotiation (read vs write vs free-busy), incremental sync via
`syncToken` (Google) / delta queries (Microsoft Graph) / CTag +
ETag (CalDAV), push notification channels with TTL rotation
(Google watch, Graph change-notifications, CalDAV `WebDAV-Sync`),
write conflict resolution (ETag If-Match), recurring-event
expansion (RFC 5545 RRULE), timezone correctness, business-tier
vs personal-tier rejection at sign-up, refresh-token storage with
rotation detection, and the iMIP / iTIP message contracts for
invite + reply flows.

**Negative scope** (NOT what this skill covers):

- Calendar UI components — out
- Local calendar (.ics file) parsing in isolation — see RFC 5545
  directly
- iCloud consumer-tier integration — explicitly out per
  business-tier scope policy
- Custom scheduling logic (free-busy availability matching) — see
  domain-specific scheduling skills

## When NOT to use

- Single-provider integrations where multi-vendor abstraction is
  premature (Google-only) — wire directly to the SDK
- Read-only consumption of an exported `.ics` URL with no live
  sync — parse the file; no provider integration needed
- Synchronous one-shot lookups (e.g., "what's my next meeting")
  where push channels are over-engineered

## Standards Cited

- **RFC 4791 (CalDAV)** — calendar access via WebDAV
- **RFC 6638 (CalDAV Scheduling)** — invite + reply protocol
- **RFC 5545 (iCalendar)** — VCALENDAR / VEVENT / RRULE format
- **RFC 5546 (iTIP)** — calendar transport
- **RFC 6047 (iMIP)** — iCalendar over MIME (email-borne invites)
- **RFC 6749 (OAuth 2.0)** — auth framework
- **RFC 7636 (PKCE)** — public-client flow
- **Google Calendar API v3 docs** (developers.google.com/calendar)
- **Microsoft Graph API v1.0** (learn.microsoft.com/graph)
- **W3C Push API** (web push channel deliveries on the client side)
- **OWASP ASVS 4.0.3 §3.5 (Token-based Session Management)** —
  refresh-token rotation + reuse detection
- **OWASP ASVS 4.0.3 §4 (Access Control)** — per-tenant scope
  enforcement

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Full sync on every poll | API quota burn; slow | `syncToken` / delta-query incremental sync |
| Push channel without TTL renewal cron | Watch expires (Google: 7 days), updates silently stop | Scheduled re-subscribe before `expiration` |
| Storing refresh token unencrypted | Vault breach = calendar access for every user | Encrypt at field level + rotate on reuse |
| Single-write without ETag | Lost update on concurrent edit | `If-Match: <etag>` + 412 retry on conflict |
| Timezone derived from server clock | Wrong-day bug across DST + cross-region users | Always include `TZID` + canonical IANA zone |
| Treating personal Gmail as Workspace | Wrong scope set; tenant policy mismatch | Reject at signup via `tid` claim / email-domain blocklist |
| Ignoring `cancelled` / `tentative` status | Stale UI shows past invites | Parse `STATUS:` field on every event |
| RRULE expansion in DB query | Cartesian explosion | Expand on demand at read-time, capped horizon |
| Polling for write confirmation | Race + duplicate writes | Push notification + idempotency key |
| Single-provider abstraction leaking to UI | Switching cost on second provider is total rewrite | Domain-shape boundary + adapter per provider |

## Verification Checklist

- [ ] OAuth scope is minimum-necessary (read vs write vs free-busy)
- [ ] `docs/provider-research/<provider>.md` exists + cites primary
      sources per `official-docs-first.md`
- [ ] Refresh-token rotation + reuse-detection wired
- [ ] Personal-tier vs business-tier rejected at sign-up
      (documented in plan + handler)
- [ ] Incremental sync uses `syncToken` / delta / CTag (no
      poll-and-diff)
- [ ] Push channel TTL renewal cron scheduled
- [ ] ETag `If-Match` on every write
- [ ] Timezone stored as IANA zone + `TZID` round-tripped
- [ ] RRULE expansion capped to a horizon (e.g., 18 months out)
- [ ] iMIP / iTIP message handling tested (accept / decline /
      counter)
- [ ] Webhook signature verification on every change notification
- [ ] Audit log of every write per `audit-logging.md`
- [ ] Failure modes documented in `docs/runbook.md`

## Cross-References

- `~/.claude/skills/provider-research/SKILL.md` — primary-source
  citation discipline
- `~/.claude/skills/web-push-notifications/SKILL.md` — sister
  notification surface
- `~/.claude/skills/api-design/SKILL.md` — calendar API consumer
  patterns
- `~/.claude/rules/common/official-docs-first.md` — provider docs
  research mandate
- `~/.claude/rules-library/common/secrets-management.md` — refresh-token
  storage
- `~/.claude/rules-library/common/audit-logging.md` — write audit
- `~/.claude/agents/security-reviewer.md` — Council Division 4
- `~/.claude/agents/architect.md` — Council Division 1

## Why this skill exists

Multi-provider calendar integrations fail in predictable ways:
quota exhaustion from full polling, silent stop after watch
channel expiry, lost updates from missing ETag, wrong-day bugs
from naive timezone handling, personal-tier accounts leaking into
business scope. The patterns above codify the production posture:
incremental sync, push channel with TTL renewal, ETag-checked
writes, IANA-zoned timestamps, business-tier-only at signup,
refresh-token rotation with reuse detection. Teams that adopt
these survive scope changes; teams that don't rebuild from scratch
every time a provider deprecates a scope.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Calendar handler written before `docs/provider-research/<provider>.md` exists (RFC 4791 / Microsoft Graph / Google Calendar primary-source citation skipped)
- Refresh-token rotation silently dropped (no-discards extension fires on token write path)
- Personal Gmail / Outlook.com / iCloud consumer accepted instead of rejected at signup (commercial-tier scope drift)
- Write-conflict (ETag mismatch / If-Match-failed) silently overwriting remote state (lost-update class)
- Webhook channel subscription not auto-renewed (Google Calendar 7-day TTL, Graph subscription expiry) — push deliveries silently stop
- Recurrence expansion (RRULE) computed client-side without timezone-aware library (DST / locale bugs)
- All-day vs floating vs zoned events conflated (Outlook + Google + Apple disagree on semantics)
- Reconnect flow doesn't preserve in-flight pending writes (data loss on auth-expiry)

**Refinement candidates**:

- New provider row when a new calendar service (FastMail JMAP, ProtonMail Calendar, Zoho Calendar) is integrated
- Conflict-resolution policy update when a recurring write-collision pattern surfaces (last-write-wins vs OT vs CRDT decision)
- Webhook-renewal cron pattern when push subscriptions drop silently across multiple incidents
- Timezone-handling addendum when DST / locale bugs recur (e.g., floating events across user's home / travel locales)
