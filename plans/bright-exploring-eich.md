# Plan — PR #48 post-merge hardening: IaC, IAM, routes, docs, landing

## Context

PR #48 (`feat/calendar-foundations`) merged to `dev` at 2026-05-26 07:51 UTC
as squash commit `5c9422e`. The merge was clean but the auto-fired staging
deploy (`run 26439592626`) failed: the **Test** job OOMed (Jest, exit 134,
`Ineffective mark-compacts near heap limit`, ~30s in, peak ~2040 MB) because
`deploy-staging.yml` ran `pnpm test` without the same memory tuning
`ci.yml` carries. The `Deploy Staging` job was skipped (`needs: test`).

The user (correctly) refused a narrow "fix only the test OOM" patch and asked
for a full audit of:
1. Routes (httpApi sub-handler dispatch)
2. Tables (IAM + CFN resources for the new calendar surface)
3. Migrations (any backfill needed for new tables)
4. Landing page (LandingView.vue marketing accuracy)
5. Tutorials pages (TutorialsView, SetupView, OnboardingWizard, docs/setup/)
6. README.md (handlers table, plan-tier matrix, tables list, integrations)
7. API docs (docs/api-reference.md, docs/openapi.yaml)

Three parallel Explore agents ran the audit. Findings consolidated below.
Plus the Council protocol is applied — all 5 divisions weigh in.

## Council weigh-in (per ~/.claude/CLAUDE.md Phase 1)

### Division 1: Architecture & Planning  *[architect, planner]*

- **No new architecture decisions required** — every gap is a documentation
  / IaC / CI sync; the calendar feature surface itself is sound.
- One observation: **deploy-staging.yml + deploy-prod.yml diverged from
  ci.yml** on Jest memory tuning. Council recommends a follow-up
  refactor (out of scope for this plan) to extract the Jest invocation
  into a shared composite action or a reusable workflow so all three
  surfaces stay in lockstep.
- Risk: the **30-min staging bake clock** does NOT start until this
  re-deploy lands green. We will reset that timer on the next push.
- Concern: the verification block on EACH fix below must run THIS turn
  per `~/.claude/rules/common/no-overclaim.md`.

### Division 2: Implementation & Build  *[build-error-resolver, refactor-cleaner, database-reviewer]*

- All 13 new tables (`CALENDAR_*`, `ALARM_CONFIGS`, `SOUND_LIBRARY`,
  `WEB_PUSH_SUBSCRIPTIONS`, `BOOKING_PAGES`, `AVAILABILITY_PUBLICATIONS`,
  `NOTIFICATIONS`, `NOTIFICATION_PREFERENCES`, `ORG_OAUTH_APPS`,
  `OAUTH_STATE`, `INTEGRATION_CREDENTIALS`, `ROADMAP_ITEM_COMMENTS`)
  have CFN resources, env-var bindings, and IAM coverage via the
  cell-wildcard policy. **Zero IaC gaps.**
- All 20 new sub-handler files (`calendarOAuth`, `alarmsApi`,
  `soundsApi`, `webPushApi`, `bookingPageApi`, `availabilityApi`,
  `iCalFeedApi`, `notificationsApi`, `notificationPreferencesApi`,
  `twoFactorApi`, `socialAuthApi`, `orgOauthAppsApi`, `gdprApi`,
  `aiCalendarApi`, `calendarApi`, `calendarMirrorApi`,
  `calendarWriteApi`, `calendarContactsApi`, `roadmapItemCommentsApi`)
  are imported AND have at least one route registered in `httpApi.ts`.
  `twoFactorApi` is wired indirectly through `authApi.routes` spread
  (line 18656) — fragile but correct. `calendarWebhooks` is a
  dedicated Lambda — not an httpApi sub-handler. **Zero route gaps.**
- Migrations: no calendar-related backfill files exist under
  `backend/src/lib/migrations/`. Per `database-reviewer`, this is
  correct — these are net-new tables with no historical rows to
  backfill. **Zero migration gaps.**
- Test memory: `deploy-staging.yml:48` and `deploy-prod.yml:131`
  both run `pnpm test` without the heap tuning `ci.yml:70` uses.
  This is the immediate deploy-blocker.

### Division 3: Quality & Review  *[code-reviewer, doc-updater]*

- The largest gap class is **documentation drift**. Per
  `~/.claude/rules/common/docs-sync-with-code.md`, every
  user-visible behaviour change requires updating: feature doc +
  README + CLAUDE.md + LandingView + runbook + CHANGELOG.
- Per `~/.claude/rules/common/no-overclaim.md`, the bundled PR was
  declared "done" before docs caught up. This plan closes that.
- 22 distinct doc gaps (see "Findings" table below). `doc-updater`
  is the canonical agent for these.

### Division 4: Security  *[security-reviewer]*

- BYO-OAuth model preserves the org-isolation invariant — confirmed
  via IAM cell-wildcard + KMS envelope encryption.
- VAPID public/private keypair env exposure: must verify the
  **first Explore agent's truncated claim** that VAPID env vars are
  missing from `httpApi`'s function-level env block. Severity HIGH if
  true (web push subscribe endpoint 500s). The second IAM/route audit
  did not flag this, which lowers confidence. **Verify before push**
  — first fix-execution step.
- Frontend XSS / CSP: no new v-html sites. Calendar UI uses
  scoped Vue templates. No security review blocker.
- Plan-tier gating: every new endpoint is gated. Confirmed.

### Division 5: Testing & QA  *[tdd-guide, e2e-runner]*

- **Jest memory tuning is THE deploy blocker.** Fix applied locally
  in `deploy-staging.yml` (uncommitted), needs same fix in
  `deploy-prod.yml`.
- The `pnpm test` suite passed ON `ci.yml` for SHA `9f399cb` (2031
  tests, 15m36s) — same code, different memory config. The test
  suite itself is sound.
- After the deploy lands green, the existing E2E probes
  (`probe-view-controls.mts`, `probe-mobile-shell.mts`) already guard
  the new calendar UI. No new E2E coverage required for this fix
  bundle.
- Recommend: smoke-test the new calendar OAuth wizard
  (`/settings/integrations`) manually post-deploy.

## Findings table (22 gaps, prioritised)

Severity legend: **HIGH** = deploy-breaking;
**MEDIUM** = runtime-broken-after-deploy or user-visible-stale;
**LOW** = cleanup / hygiene.

| # | Sev | File:line | Gap | Owning division | Agent |
|---|---|---|---|---|---|
| 1 | HIGH | `.github/workflows/deploy-staging.yml:47-48` | Jest OOM — no maxWorkers/workerIdleMemoryLimit/heap tuning | Testing & QA | tdd-guide |
| 2 | HIGH | `.github/workflows/deploy-prod.yml:130-131` | Same Jest OOM risk as #1 — will OOM on first prod deploy | Testing & QA | tdd-guide |
| 3 | HIGH | `infra/serverless.yml` httpApi function env | (Claim from Explore-1, unverified) VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY missing from httpApi env → webPush routes 500 | Security | security-reviewer |
| 4 | MED | `docs/two-factor.md` | MISSING entirely — 2FA shipped without standalone doc | Quality & Review | doc-updater |
| 5 | MED | `frontend/src/views/LandingView.vue` (PRO_MAX block) | AI Calendar (PRO_MAX) not advertised | Quality & Review | doc-updater |
| 6 | MED | `frontend/src/views/TutorialsView.vue` | AI Calendar missing; no tutorial section for natural-language event creation | Quality & Review | doc-updater |
| 7 | MED | `docs/calendar-integration.md` | No AI Calendar (PRO_MAX) subsection | Quality & Review | doc-updater |
| 8 | MED | `frontend/src/views/SetupView.vue` | No BYO-OAuth / calendar step in wizard; doesn't link to `/settings/integrations` | Quality & Review | doc-updater |
| 9 | MED | `frontend/src/views/OnboardingWizard.vue` | No PR #48 features surfaced during new-user onboarding (calendar, 2FA, alarms) | Quality & Review | doc-updater |
| 10 | MED | `README.md:18` (Integrations line) | STALE — missing Google Workspace, Microsoft 365 Business, Zoho, CalDAV, social-login (OIDC) | Quality & Review | doc-updater |
| 11 | MED | `README.md:206-232` (Backend Handlers table) | STALE — 17 new sub-handlers absent; "246 routes" stat likely stale | Quality & Review | doc-updater |
| 12 | MED | `README.md:266-301` (Frontend Views table) | STALE — booking page, integrations route, 2FA enrol page missing | Quality & Review | doc-updater |
| 13 | MED | `README.md:236-263` (Shared Libraries) | STALE — calendar, alarm, VAPID, BYO-OAuth libs missing | Quality & Review | doc-updater |
| 14 | MED | `README.md:321-360` (DDB Tables) | STALE — new tables missing | Quality & Review | doc-updater |
| 15 | MED | `README.md:408-413` (Plan Tier matrix) | STALE — Calendar, Alarms, Custom sounds, Web Push, Booking page, AI Calendar, BYO-OAuth absent from FREE/STANDARD/PRO/PRO_MAX table | Quality & Review | doc-updater |
| 16 | MED | `docs/api-reference.md` | 9 of 17 new endpoint categories undocumented; 412 `oauth_app_not_configured` missing from error responses; plan-tier rate-limit docs stale | Quality & Review | doc-updater |
| 17 | MED | `docs/openapi.yaml` | ZERO coverage of 17 new endpoint categories; no 2FA management paths; no 412 error schema; no calendar/alarms/sounds/booking tags | Quality & Review | doc-updater |
| 18 | MED | `docs/changelog.md` | No 2026-05-26 release entry for PR #48 | Quality & Review | doc-updater |
| 19 | MED | `docs/getting-started.md` | STALE plan matrix; no "Set up your first calendar connection" walkthrough; no "Enable 2FA" walkthrough; new setup docs not linked | Quality & Review | doc-updater |
| 20 | LOW | `.github/workflows/deploy-staging.yml:73` + `deploy-prod.yml:141` | Frontend build heap 4 GB borderline given dbml 15 MB chunk — bump to 6 GB for headroom | Implementation & Build | build-error-resolver |
| 21 | LOW | `docs/provider-research/microsoft-365-business.md` | Doc convention expects `microsoft-365-graph.md`; aliasing or rename optional | Quality & Review | doc-updater |
| 22 | LOW | `docs/runbook.md:1757` | 2FA recovery procedure buried in prose, not in numbered §21.x sub-entry | Quality & Review | doc-updater |

## Concrete change content per file

### CI / IaC

**`.github/actions/run-backend-tests/action.yml`** (NEW — shared composite action)

```yaml
name: Run backend Jest suite
description: Memory-tuned Jest invocation shared by ci.yml + deploy-staging.yml + deploy-prod.yml
runs:
  using: composite
  steps:
    - name: Backend tests
      shell: bash
      env:
        NODE_OPTIONS: --max-old-space-size=6144
        CI: "true"
      run: |
        cd backend && pnpm test -- \
          --maxWorkers=2 \
          --workerIdleMemoryLimit=4500MB \
          --ci \
          --runInBand=false
```

**`.github/workflows/deploy-staging.yml`**

- Line 47–48: replace the inline Jest invocation with `uses: ./.github/actions/run-backend-tests`
- Line 73: `NODE_OPTIONS: --max-old-space-size=4096` → `6144` for Frontend build

**`.github/workflows/deploy-prod.yml`**

- Line 130–131: same composite-action replacement
- Line 141: same Frontend-build heap bump 4096 → 6144

**`.github/workflows/ci.yml`**

- Line 33–70: replace inline Jest invocation with `uses: ./.github/actions/run-backend-tests` for parity

**`infra/serverless.yml`** (verify gap #3 first; resolve based on outcome)

- Read `webPushApi.ts` for actual `requireEnv` calls
- Read httpApi function-level `environment:` block (~line 730+)
- If `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` not present at either provider.environment OR httpApi function-level env, add to provider.environment (shared by every function so they're available at cold-start):
  ```yaml
  VAPID_PUBLIC_KEY: ${env:VAPID_PUBLIC_KEY}
  VAPID_PRIVATE_KEY: ${env:VAPID_PRIVATE_KEY}
  VAPID_SUBJECT: mailto:ops@stewardbot.app
  ```
- Verify `infra/check-lambda-env-bag.py` headroom doesn't get blown by the additions

### New docs

**`docs/two-factor.md`** (NEW)

Outline:

1. **What 2FA gives you** — second-factor proof of identity at login, prevents account takeover even when password is compromised
2. **TOTP enrolment** — `/settings/security` → "Enable 2FA" → QR code scan with Authenticator/1Password/Bitwarden → 6-digit verification
3. **Recovery codes** — 10 one-time codes generated at enrolment, downloadable PDF, each consumable once at login when authenticator unavailable, regenerate via `/settings/security` (invalidates the old set)
4. **Login challenge flow** — when 2FA is enabled, login returns `{requires_2fa: true, challenge_token}` instead of session cookies; client posts `{challenge_token, code | recovery_code}` to `/api/auth/2fa/verify-login`
5. **Org-wide policy** — owners can set `org.require_two_factor=true` to force every non-exempt user to enrol on next login (exempt paths: `/health`, `/api/auth/*`, `/api/profile`, `/api/orgs`, `/api/unsubscribe`)
6. **Trusted devices** — `sb_trust` httpOnly cookie set after successful 2FA; HMAC-signed via `TRUST_COOKIE_SECRET`; auto-version-bumps on credential change to invalidate every issued cookie
7. **Recovery if locked out** — see runbook §21.X (new sub-entry per gap #22); requires owner-initiated reset via `/api/auth/2fa/admin-reset`
8. **Plan tiers** — available on every plan including FREE

### Edited docs

**`docs/calendar-integration.md`** — add new section before "Provider configuration":

```markdown
## AI Calendar (PRO_MAX)

Natural-language event creation via Bedrock. Endpoint `POST /api/calendars/ai/prompt-to-event`. Example prompts:

- "schedule a 30-min standup with the engineering team every weekday at 9am"
- "book a 2-hour focus block tomorrow afternoon and decline overlapping meetings"
- "find 3 candidate times next week for a 45-min call with @alice and @bob"

The endpoint returns a structured event proposal (title, attendees, start/end, recurrence) for user confirmation before writing. Plan-gated to PRO_MAX only via the `aiCalendar` feature flag.
```

**`docs/api-reference.md`** — add the 9 missing endpoint categories:

- `POST /api/calendars/connect/:provider` — start BYO-OAuth flow (412 if no oauth-app configured)
- `GET /api/calendars/oauth/:provider/callback` — completion redirect
- `GET /api/calendars/freebusy` — 30-min bucket free/busy
- `POST /api/alarms`, `GET /api/alarms`, `PUT /api/alarms`, `DELETE /api/alarms/:alarmId`
- `GET /api/sounds`, `POST /api/sounds`, `DELETE /api/sounds/:soundId`
- `GET /api/push/vapid-public-key`, `POST /api/push/subscribe`, `DELETE /api/push/subscribe/:subscriptionId`
- `GET /api/booking/:userSlug`, `POST /api/booking/:userSlug` (public booking page submit), `PUT /api/booking-pages/:slug`, `DELETE /api/booking-pages/:slug`, `GET /api/booking-pages` (list user's pages)
- `PUT /api/availability/publish`, `GET /api/availability/team/:teamId`
- `GET /api/feeds/calendar/:userSlug.ics` — iCal feed
- `POST /api/auth/social/:provider/start`, `GET /api/auth/social/:provider/callback`, `POST /api/auth/social/link/confirm`, `GET /api/auth/social/providers`
- `GET /api/orgs/oauth-apps`, `GET/PUT/DELETE /api/orgs/oauth-apps/:provider`, `POST /api/orgs/oauth-apps/:provider/test`
- `POST /api/calendars/ai/prompt-to-event`, `POST /api/calendars/ai/find-time`
- Add 412 `oauth_app_not_configured` to the global error table (lines 170-188)
- Refresh the Plan Features table (lines 130-143) with: `calendar` (PRO+), `alarms` (PRO+), `customSounds` (PRO+), `webPush` (PRO+), `bookingPage` (PRO+), `aiCalendar` (PRO_MAX)

**`docs/openapi.yaml`** — add 17 endpoint categories as `paths:` entries with full request/response shapes; add tags `Calendar`, `Alarms`, `Sounds`, `WebPush`, `Booking`, `Availability`, `iCal`, `TwoFactor`, `SocialAuth`, `BYO-OAuth`, `AICalendar`, `NotificationPreferences`; add `OAuthAppNotConfigured` (412) component response

**`docs/changelog.md`** — add new dated entries:

```markdown
## [2026-05-26] — Calendar foundations + BYO-OAuth launch

### Added

- Calendar integration (PRO+) — Google Workspace, Microsoft 365 Business, Zoho Workplace, generic business CalDAV
- BYO-OAuth per-org credentials in Settings → Integrations (admin only)
- Alarms (PRO+) — polymorphic dispatch on calendar/task/todo/standup/okr/roadmap
- Custom sounds (PRO+) — audio upload + FFmpeg transcoder + magic-byte gate
- Web Push (PRO+) — VAPID-based browser push subscriptions
- Booking page (PRO+) — public Calendly-style `/book/:userSlug`
- AI Calendar (PRO_MAX) — natural-language event creation via Bedrock
- Two-factor auth (all plans) — TOTP + recovery codes + trusted-device cookie
- Social login (Google Workspace OIDC, Microsoft 365 Business OIDC)

### Changed

- Lambda concurrency policy: zero `reservedConcurrency` across every function
- Org-level signed-commits ruleset enforces verified signatures on all protected branches

### Fixed

- Refresh-token cross-tab race (Web Locks + BroadcastChannel)
- Stripe invoice receipts on `payment_succeeded`
```

Plus a sweep of merged PRs since the last `[YYYY-MM-DD]` heading — one entry per release date for accuracy.

**`docs/getting-started.md`**

- Refresh plan-comparison table (lines 151–182) with all 8 new feature rows
- Add new section "Connect your first calendar" with step-by-step (admin sets up BYO-OAuth → user clicks Connect on `/settings/integrations`)
- Add new section "Enable two-factor auth" linking `docs/two-factor.md`
- Add "Next Steps" links: `docs/setup/google-workspace-oauth.md`, `docs/setup/microsoft-365-oauth.md`, `docs/calendar-integration.md`, `docs/audio-alarms.md`, `docs/booking-page.md`, `docs/two-factor.md`

**`docs/runbook.md`**

- Promote line 1757 2FA recovery prose to a new numbered §21.X sub-entry titled "2FA lockout recovery" with steps: org admin verifies identity → `/api/auth/2fa/admin-reset` invalidates secret + recovery codes → user re-enrols on next login
- Add §21.Y "VAPID keypair rotation" if not already present

**`docs/provider-research/microsoft-365-business.md`** → rename to **`docs/provider-research/microsoft-365.md`** (matches `google-workspace.md` shape); update every reference (README, calendar-integration.md, both setup walkthroughs, runbook)

### `README.md` (substantial refresh — line numbers approximate)

- **Line 18 (Integrations)**: change to `Integrations: Slack (OAuth + Bot), ClickUp (OAuth + Webhooks), Google Workspace (BYO-OAuth, OIDC), Microsoft 365 Business (BYO-OAuth, OIDC), Zoho Workplace (OAuth), generic CalDAV (Fastmail Business, Nextcloud, Posteo, mailbox.org), Jira, Asana, Linear, Stripe, AWS Bedrock (AI), Web Push (VAPID)`
- **Backend Handlers table (lines 206–232)**: add rows for every new sub-handler — `calendarOAuth`, `calendarApi`, `calendarMirrorApi`, `calendarWriteApi`, `calendarContactsApi`, `calendarWebhooks` (separate Lambda), `alarmsApi`, `soundsApi`, `webPushApi`, `bookingPageApi`, `availabilityApi`, `iCalFeedApi`, `notificationsApi`, `notificationPreferencesApi`, `twoFactorApi`, `socialAuthApi`, `orgOauthAppsApi`, `gdprApi`, `aiCalendarApi`, `roadmapItemCommentsApi`, `audioTranscoder`, `alarmScheduler`, `alarmDispatcher`, `calendarSync`, `calendarHealthSweep`, `calendarReSubscribe`
- Recount routes in `httpApi` row to current value (run `grep -cE "routes\[\"|paramRoutes\.push" backend/src/handlers/httpApi.ts` post-fix)
- **Frontend Views table (lines 266–301)**: add rows for `CalendarView`, `BookingPageView` (public, `/book/:slug`), `SettingsIntegrationsView`, `SettingsAlarmsView`, `SettingsNotificationPreferencesView`, `Settings2FAEnrolView`, `Settings2FARecoveryView`
- **Shared Libraries table (lines 236–263)**: add rows for `lib/calendar/*`, `lib/calendar/providers/{google,microsoft,zoho,caldav,ics}.ts`, `lib/alarmDispatch.ts`, `lib/webPush.ts`, `lib/audio/*`, `lib/iCalEmitter.ts`, `lib/twoFactor.ts`, `lib/trustCookie.ts`, `lib/social/oidc.ts`, `lib/emailDomainPolicy.ts`
- **DDB Tables list (lines 321–360)**: add rows for `CalendarConnectionsTable`, `CalendarEventsTable`, `AlarmConfigsTable`, `SoundLibraryTable`, `WebPushSubscriptionsTable`, `BookingPagesTable`, `AvailabilityPublicationsTable`, `NotificationsTable`, `NotificationPreferencesTable`, `OrgOauthAppsTable`, `OAuthStateTable`, `IntegrationCredentialsTable`, `RoadmapItemCommentsTable`
- **Plan Tier matrix (lines 408–413)**: add columns/rows so the matrix shows: Calendar integration ✓ PRO+, BYO-OAuth ✓ PRO+ admin, Alarms ✓ PRO+, Custom sounds ✓ PRO+, Web Push ✓ PRO+, Booking page ✓ PRO+, AI Calendar ✓ PRO_MAX, 2FA ✓ all plans

### Frontend views

**`frontend/src/views/LandingView.vue`**

- PRO_MAX tier block (~line 297): add new bullet "AI Calendar — natural-language event creation, attendee suggestions, free/busy synthesis"
- Calendar card (~line 170): expand BYO-OAuth call-out to its own sentence "Admins configure their own Google Cloud / Azure Entra OAuth app — your customer data stays in your tenant"

**`frontend/src/views/TutorialsView.vue`**

- Add new section "AI Calendar (PRO_MAX)" with: what it is, example prompts, how to enable (plan upgrade), how to use (`/calendar` page → "+" button → "AI prompt"), troubleshooting (Bedrock token budget per org)
- Add FAQ entries: "Why does AI Calendar say my plan doesn't support it?", "Can I undo an AI-generated event?", "Does AI Calendar see my prior meetings?"

**`frontend/src/views/SetupView.vue`**

- Add new step block "Connect a calendar (optional, admin)" between Slack and ClickUp:
  - If org has `aiCalendar`-class feature gates enabled: show the BYO-OAuth wizard short-form
  - Link to `/settings/integrations` for the full BYO-OAuth setup
  - Link to `docs/setup/google-workspace-oauth.md` and `docs/setup/microsoft-365-oauth.md`

**`frontend/src/views/OnboardingWizard.vue`** (full reflow)

Restructure to 5 steps:

1. Account profile (existing, kept)
2. Team setup (existing, kept)
3. NEW: Connect Slack (existing — promoted to its own step)
4. NEW: Connect calendar (skippable, links `/settings/integrations`)
5. NEW: Set up security — Enable 2FA, customize notification preferences

Add per-step "Skip for now" affordances; each skipped step appears in an "Unfinished setup" banner on `/dashboard`.

## Concrete-edit verification matrix

| Gap # | File | Mechanical check post-edit |
| --- | --- | --- |
| 1 | deploy-staging.yml | `grep -c "run-backend-tests" .github/workflows/deploy-staging.yml` ≥ 1 |
| 2 | deploy-prod.yml | `grep -c "run-backend-tests" .github/workflows/deploy-prod.yml` ≥ 1 |
| 3 | serverless.yml | `grep -c "VAPID_PUBLIC_KEY" infra/serverless.yml` ≥ 1 (in provider.environment) |
| 4 | docs/two-factor.md | `test -f docs/two-factor.md && wc -l docs/two-factor.md` ≥ 100 |
| 5 | LandingView.vue | `grep -c "AI Calendar" frontend/src/views/LandingView.vue` ≥ 1 |
| 6 | TutorialsView.vue | `grep -c "AI Calendar" frontend/src/views/TutorialsView.vue` ≥ 1 |
| 7 | calendar-integration.md | `grep -c "AI Calendar" docs/calendar-integration.md` ≥ 1 |
| 8 | SetupView.vue | `grep -c "Connect a calendar\|/settings/integrations" frontend/src/views/SetupView.vue` ≥ 1 |
| 9 | OnboardingWizard.vue | grep for "Connect calendar" + "Enable 2FA" — both ≥ 1 |
| 10 | README.md | `grep -c "Google Workspace\|Microsoft 365 Business" README.md` ≥ 2 |
| 11 | README.md (Handlers) | `grep -c "calendarOAuth\|alarmsApi" README.md` ≥ 1 |
| 12 | README.md (Views) | `grep -c "BookingPageView\|CalendarView" README.md` ≥ 1 |
| 13 | README.md (Libs) | `grep -c "lib/calendar\|lib/webPush" README.md` ≥ 1 |
| 14 | README.md (DDB) | `grep -c "CalendarConnectionsTable\|AlarmConfigsTable" README.md` ≥ 1 |
| 15 | README.md (Plan Tiers) | `grep -c "AI Calendar.*PRO_MAX\|PRO_MAX.*AI Calendar" README.md` ≥ 1 |
| 16 | api-reference.md | `grep -c "oauth_app_not_configured\|/api/calendars/connect" docs/api-reference.md` ≥ 2 |
| 17 | openapi.yaml | `grep -cE "^  /api/(calendars\|alarms\|sounds\|booking\|push)" docs/openapi.yaml` ≥ 17 |
| 18 | changelog.md | `grep -c "## \[2026-05-26\]" docs/changelog.md` = 1 |
| 19 | getting-started.md | `grep -c "Enable two-factor\|Connect your first calendar" docs/getting-started.md` ≥ 2 |
| 20 | both workflows | `grep -c "max-old-space-size=6144" .github/workflows/deploy-*.yml` ≥ 2 |
| 21 | provider-research | `test -f docs/provider-research/microsoft-365.md && ! test -f docs/provider-research/microsoft-365-business.md` |
| 22 | runbook.md | `grep -c "2FA lockout recovery" docs/runbook.md` ≥ 1 |
| extra | composite action | `test -f .github/actions/run-backend-tests/action.yml` |
| extra | ci.yml parity | `grep -c "run-backend-tests" .github/workflows/ci.yml` ≥ 1 |

## Execution sequence (when plan exits)

1. **Verify gap #3** — read `infra/serverless.yml` httpApi function env block and the webPush handler's `requireEnv` calls. If VAPID vars missing, add them. If present, drop this finding from the bundle.
2. **Apply Jest memory tuning** to `deploy-prod.yml` (mirroring the existing edit to `deploy-staging.yml`).
3. **Bump Frontend-build heap** 4 GB → 6 GB in both workflows.
4. **Delegate to doc-updater** for all 18 doc gaps (#4–#19, #21, #22). Per the agents.md rule, this agent can run the full doc sweep in one pass.
5. **Stage all changes**, run pre-push verification:
   - `cd backend && npx tsc --noEmit` → 0 errors
   - `cd backend && pnpm test` → 2031 tests pass (locally; CI is the canonical run)
   - `cd frontend && npx vue-tsc --noEmit` → 0 errors
   - `cd frontend && pnpm run build` → succeeds
   - `npx eslint <touched files> --max-warnings 0` → clean
   - `bash infra/verify-local.sh staging` → all gates pass
   - markdownlint on touched .md files → clean (warnings tolerated on unbreakable table rows per done-criteria.md)
6. **Commit** signed by le-yanu with a single squash-style message referencing all addressed findings.
7. **Push** to `dev` directly (this is a follow-up fix on the merged feature, not a new PR — staging deploy fires automatically on push to dev).
8. **Watch staging deploy** end-to-end via Monitor.
9. **30-minute bake** starts when staging is green (`feedback_staging_bake_rule`).
10. **Open dev→main PR** for prod release after the bake (requires user action, not auto).

## Verification

After all fixes land + staging re-deploy completes:

- ✓ `gh run view <new-run-id> --json conclusion` returns "success"
- ✓ `deploy-staging.yml` "Deploy Staging" job status: success (no longer skipped)
- ✓ Stewardbot staging health endpoint returns 200 + the new env vars are bound
- ✓ Re-read `LandingView.vue`, README.md, docs/api-reference.md against the 8-feature checklist and confirm zero remaining "MISSING"
- ✓ `grep -rE "PRO_MAX.*AI Calendar|AI Calendar.*PRO_MAX" README.md frontend/src/views/LandingView.vue frontend/src/views/TutorialsView.vue docs/` returns at least one hit per file
- ✓ `docs/two-factor.md` exists and is referenced from runbook + README + getting-started
- ✓ `docs/openapi.yaml` `paths:` count > prior count by ≥ 17 entries
- ✓ `docs/changelog.md` has a `[2026-05-26]` heading
- ✓ Manual smoke: `/settings/integrations` page renders, BYO-OAuth wizard works, calendar connect for at least one provider succeeds (post-deploy)

## Nothing is out of scope (per user directive)

Previously deferred items now folded in:

- **Shared Jest composite action** — extract to `.github/actions/run-backend-tests/action.yml`; both `ci.yml`, `deploy-staging.yml`, and `deploy-prod.yml` call it via `uses: ./.github/actions/run-backend-tests`. Eliminates the divergence permanently.
- **Historical CHANGELOG entries** — sweep all PRs merged since the last `[YYYY-MM-DD]` heading in `docs/changelog.md` and add one entry per release date covering features that actually shipped.
- **`microsoft-365-business.md` rename** — rename to `microsoft-365.md` (the simpler form, matching `google-workspace.md` for the Google equivalent), update every reference (README, calendar-integration.md, setup walkthroughs).
- **OnboardingWizard reflow** — full restructure to surface calendar connect + 2FA enrol + notification preferences in the new-user onboarding flow.

## Critical references

- Findings sourced from 3 parallel Explore agents run during plan Phase 1 (this turn).
- Council protocol per `~/.claude/CLAUDE.md`.
- Docs-sync per `~/.claude/rules/common/docs-sync-with-code.md`.
- Done-criteria per `~/.claude/rules/common/done-criteria.md`.
- Memory tuning per `~/.claude/rules/common/ci-test-memory-tuning.md` gotcha 10 (OOM preempt) — the exact pattern hit here.
- Identity per `~/.claude/rules/common/bfree-africa-git-identity.md` (next commit signed by le-yanu).
