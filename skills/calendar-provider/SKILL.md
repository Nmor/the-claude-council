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
`stewardbot_origin_id` extended property. The provider push channel
then sends the event back to us as a "new event". The sync worker:

1. Looks up the row via the `origin_index` GSI by
   `stewardbot_origin_id`.
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

Idempotency key: `cal:write:<stewardbot_origin_id>:v<version>`.

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
<provider>" banner.

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
- `~/.claude/rules/common/no-discards.md` — refresh-token rotation
  must be bound + persisted, never dropped.
- StewardBot project `docs/calendar-integration.md` — feature page.
- StewardBot project `docs/runbook.md` §21a–§21l — recovery
  procedures.
