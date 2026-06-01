# Security Audit Extension — 2026-05-23 (Phase 2)

Builds on `SECURITY-AUDIT-2026-05-23.md`. Phase 2 covers items #1–#8 from
the "If you want to keep going" list and adds findings from 3 parallel
deep-research agents (macOS posture, project-level deps, browser extensions).

## ✅ Auto-remediated this session

### #1 — Docker containers on fresh images (5/5)

All 5 audit-flagged containers now running latest images, all healthy:

- `unvamp-crowdsec` v1.6.4 → **v1.7.8**
- `unvamp-nginx-hls` 1.27-alpine → **1.28-alpine**
- `unvamp-ollama` 0.4.7 → **0.24.0** (pinned, not `:latest`)
- `mobile-number-statuses-db` postgres:15 → **postgres:17-alpine**
  - Migrated via `pg_dumpall` + restore. All 2,769,528 rows verified.
  - Backup volume `mobile-number-statuses_postgres_data_pg15_bak_20260523` retained
  - SQL dump at `/Users/APPLE/Downloads/pg15-migration-backup/`
- `stewardbot-localstack` 3.8 → **4.14** (community edition, free tier confirmed)

Old images cleaned up — ~9GB disk reclaimed.

### #4 — macOS posture (auto-applied subset)

- Screen lock — `askForPassword=1`, `askForPasswordDelay=0` (password
  required immediately after sleep)

### #5 — AWS account hardening (auto-applied subset)

- **S3 account-level Public Access Block ENABLED** — all four toggles
  (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`,
  `RestrictPublicBuckets`). Previously: not configured. Now: every
  bucket in account 655848079299 cannot be made public.
- **CloudTrail log-file validation ENABLED** on both trails
  (`management-events` in eu-central-1, `codepipeline-source-trail` in
  us-east-2). Tamper-detection signatures now generated.
- Verified: Root MFA enabled ✓, strong IAM password policy ✓
  (14 chars, complexity, 90-day rotation, 24-history), GuardDuty
  detectors active in us-east-2 + eu-central-1 ✓, Security Hub with
  CIS standards subscribed ✓.

### #7 — SSH key

- `id_ed25519_signing` created 2026-05-20 (3 days old), ED25519 cipher
  — current best practice. No action needed.

---

## 🔴 Action items requiring YOU

### #2 — Anthropic OAuth connector revocation

Go to claude.ai → Settings → Connectors. Revoke any Gmail / Calendar /
Drive connection not actively used. Each holds delegated Google OAuth
tokens with read access; idle ones are unnecessary exfil surface.

### #4 — macOS posture (sudo required)

Paste these in your terminal as one block — review before running:

```bash
# Firewall stealth mode + logging (HIGH)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setloggingmode on

# TouchID for sudo (MEDIUM — survives macOS updates)
sudo bash -c 'cat > /etc/pam.d/sudo_local << "EOF"
# sudo_local: local config file which survives system update and is included for sudo
auth       sufficient     pam_tid.so
EOF'

# Disable Printer Sharing if not needed (HIGH)
sudo cupsctl --no-share-printers

# Explicit SoftwareUpdate auto-check (MEDIUM)
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled -bool true
```

Then in System Settings (no sudo):

- Verify **Find My Mac** is ON: System Settings → [Apple ID] → iCloud → Find My Mac

### #4b — Docker port localhost binding (HIGH)

The Unvamp infrastructure compose binds **all** service ports to
`0.0.0.0` (e.g. `"6379:6379"`, `"11434:11434"`, `"5432:5432"` if there
were one). On any shared Wi-Fi, every device can reach Redis, Ollama,
Postgres, MediaMTX, etc. on your Mac.

Fix shape: change every port mapping in
`/Users/APPLE/Unvamp/unvamp-api/infrastructure/docker-compose.yml` from
`"PORT:PORT"` to `"127.0.0.1:PORT:PORT"`. **Caveat**: if you ever
point a phone or LAN device at your Mac's IP for testing, that breaks.
Most local development is fine bound to localhost.

I can apply this as a single sweep across all 24 port mappings if you
approve — say "bind unvamp ports to localhost" and I'll do it.

### #6 — Chrome extensions (per browser-extension agent)

**Remove these in `chrome://extensions` immediately:**

| Priority | Extension | ID |
|---|---|---|
| 🔴 CRITICAL | "What Font - find font" (FAKE IMPERSONATOR — exfils to fontfind.net) | `acpcapnaopbhbelhmbbmppghilclpkep` |
| 🔴 CRITICAL | Honey (cookie + webRequest, affiliate hijacking) | `bmnlcjabgnpnenekpadlanbbkooimhnj` |
| 🔴 CRITICAL | RetailMeNot (all-URLs surveillance) | `jjfblogammkiefalfpafidabbnamoknm` |
| 🔴 CRITICAL | Rakuten Button Canada (all-URLs surveillance) | `idpbkophnbfijcnlffdmmppgnncgappc` |
| 🟡 MEDIUM | LinkedRadar Email Finder | `kgpckhbdfdhbkfkepcoebpabkmnbhoke` |
| 🟡 MEDIUM | ContactOut Email Lookup | `jjdemeiffadmmjhkbbpglgnlgeafomjo` |
| 🟡 MEDIUM | AI LinkedIn Post Generator | `kgojhlllchdepinmopmlhihnipicpoah` |
| 🟡 MEDIUM | Karma Shopping | `emalgedpdlghbkikiaeocoblajamonoh` |
| 🟢 REVIEW | Web Scraper (if unused) | `jnhgnonknehpejjnehehllkliplmbmhn` |

Real WhatFont (the one to install if you want font ID): `jabopobgcpjmedljpbcaablpmlmfcogm`

### #5b — AWS IAM hygiene (review)

5 IAM users with NULL `LastUsed` (never used or used before tracking
started):

- `github_new` — has TWO active keys (rotated 2026-05-19 + 2026-05-18)
- `justin-sg-whitelist` — recently created, never used
- `k8s-email-user` — key from 2025-03-19, never used
- `xcally` — TWO keys, older (2024-07-26 + 2025-09-08); user itself unused
- `ses-smtp-user.20210429-083205` — key from 2025-05-31

Recommendation: review whether each is still needed. If not,
deactivate (don't delete first — wait 7 days to confirm nothing
breaks). One-key-per-user is the AWS best practice for human users;
service users may have two for rotation.

### #8 — 2FA verification across accounts

Verify (or enable) hardware-key-grade 2FA on:

- **AWS root** — already enabled per audit (✓)
- **Apple ID** — System Settings → [Apple ID] → Password & Security → Two-Factor Authentication
- **GitHub** — github.com/settings/security (currently authed as `Nmor`; verify "Two-factor methods" lists a security key + a TOTP)
- **Anthropic / claude.ai** — Settings → Account → Two-step verification
- **Google Workspace** (for moses@bfree.africa) — admin.google.com 2-Step Verification policy
- **Primary email recovery** — whichever account can reset all the above

For each, prefer **WebAuthn hardware key** (YubiKey) over TOTP, and
TOTP over SMS.

---

## 🟠 Multi-session roadmap — project dep audit findings

Per the global dep-vuln rule, MODERATE+ CVEs block. The agent found
significant work across 14 services. Run these in dedicated sessions
(one repo at a time, full Council protocol, verification + tests after
each):

### Critical (P0 — fix this week)

1. **`/Users/APPLE/BFREE-Africa/mobile-number-statuses` (Node)** —
   3 CRITICAL, 27 HIGH. `protobufjs` RCE + `fast-xml-parser` injection
   + `xlsx` prototype pollution. Full dep refresh required.

2. **`/Users/APPLE/BFREE-Africa/lago-api` (Ruby)** — `ruby-lsp 0.23.6`
   CRITICAL RCE (CVE-2026-34060). Add `gem 'ruby-lsp', '>= 0.26.9'`
   and `gem 'rack-session', '>= 2.1.2'` to Gemfile.

### High (P1 — fix this sprint)

3. **All BFREE Go services** (partner-service, subscription-service,
   communication-service, template-engine, message-campaign,
   setting-service, auth-service, user-mgmt-service, go-commons) —
   11 HIGH each, root cause is **Go 1.25.8 → 1.25.10** + bump
   `golang.org/x/net >= v0.55.0` and `go.opentelemetry.io/otel/sdk
   >= v1.40.0`. Single coordinated bump across all 9.

4. **`/Users/APPLE/Reback/core-backend`** — same Go stdlib family, 10 HIGH.

5. **`/Users/APPLE/Unvamp/unvamp-admin`** + **`/Users/APPLE/Unvamp/unvamp-site`** —
   8 HIGH each. Next.js 16.2.2 installed but 16.2.6 pinned in
   `package.json`. Fix: `pnpm install` in each repo to sync lockfile,
   then verify advisories clear.

6. **`/Users/APPLE/BFREE-Africa/crm-fe`** — 23 HIGH from old Vue CLI 4
   stack (`@babel/*`, `defu`, `cross-spawn`, `tar`). Either migrate
   to Vite or apply targeted overrides.

### Medium (P2 — schedule in backlog)

- `/Users/APPLE/Unvamp/unvamp-web` — 1 MODERATE postcss XSS
- `/Users/APPLE/Reback/website` — 4 MODERATE postcss + Vue CLI

### Clean (no action needed)

- `stewardbot/backend`, `stewardbot/frontend`, `BFREE/lago-frontend`,
  `Reback/frontend-app`, `Reback/admin-dashboard`, `Reback/puppet`,
  `Reback/puppeteer`

### Skipped (build errors block scan)

- `unvamp-api` — `chat.NewHandler` arity mismatch (separate Go build issue to fix)
- `BFREE/report-submission-service` — undefined symbols (integration drift from `go-commons`)
- `Reback/screenshot` — `leptonica` C lib missing for CGo build

---

## Standing posture summary

### What's actively defending you right now (configurable controls in place)

- AWS S3 public access block at account level (any new bucket can't be public)
- AWS CloudTrail log-file validation (tamper detection)
- AWS GuardDuty (us-east-2 + eu-central-1) + Security Hub + CIS standards
- AWS root MFA + 14-char password policy + 90-day rotation
- macOS FileVault, SIP, Gatekeeper, secure VM, signed binaries
- macOS Keychain holds: aws-vault AWS key, gh CLI GitHub token, Docker creds
- ssh ed25519-only, no weak algorithms
- git commit + tag signing on
- Claude shell: every `brew install` / `npm -g` / `pip` / `gem` / `cargo` / `go install` / `gh api`/`secret` / `docker pull/run` requires explicit ASK
- Claude shell: `curl|sh`, `wget|sh`, `npx -y`, `pnpm dlx`, `bunx -y`,
  `--dangerously-skip-permissions` are DENIED outright
- npm postinstall scripts blocked globally
- VS Code + Cursor: workspace trust on, extension auto-update off, telemetry off
- Screen lock: password required immediately after sleep

### Known gaps (your action items above)

- Firewall stealth mode + logging (sudo required)
- TouchID for sudo (sudo required)
- Printer Sharing (cupsd broadcasting via Bonjour)
- Docker port binding to 0.0.0.0 on Unvamp infrastructure (compose edit)
- 4 CRITICAL + 6 MEDIUM Chrome extensions to remove
- 14 service repos with HIGH/MODERATE CVE remediation work
- IAM user cleanup (5 unused users with active keys)
- 2FA verification across non-AWS accounts
- Anthropic OAuth connectors to revoke

### Not covered yet

- WiFi router firmware
- Apple ID + iCloud account integrity (no API)
- Physical security (laptop disk physical access)
- 1Password / password manager configuration
- VPN policy (NordVPN + TunnelBear both as login items — pick one)
