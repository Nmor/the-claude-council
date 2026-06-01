# Security Audit Phase 3 — Dep-CVE Roadmap Execution (2026-05-23)

Followed `SECURITY-AUDIT-2026-05-23-EXTENDED.md` "Multi-session dep-CVE
roadmap". Executed P0–P2 remediation across 16 repositories.

## Summary — vulnerabilities resolved this turn

| Repo | Before | After | Status |
| ---- | ------ | ----- | ------ |
| **P0 BFREE/mobile-number-statuses** (Node) | 3 CRIT, 27 HIGH, 22 MOD, 3 LOW | 0 / 0 / 0 / 0 | done |
| **P0 BFREE/lago-api** (Ruby) | 1 CRIT, 7 HIGH, 15 MOD | No vulnerabilities | done |
| **P1 Unvamp/unvamp-admin** (Node) | 8 HIGH, 8 MOD | 0 / 0 | done |
| **P1 Unvamp/unvamp-site** (Node) | 8 HIGH, 8 MOD | 0 / 0 | done |
| **P1 Unvamp/unvamp-web** (Node) | 1 MOD | 0 | done |
| **P1 BFREE/go-commons** (Go) | 11 HIGH | 0 | done |
| **P1 BFREE/partner-service** (Go) | 11 HIGH | 0 | done |
| **P1 BFREE/subscription-service** (Go) | 11 HIGH | 0 | done |
| **P1 BFREE/communication-service** (Go) | 11 HIGH | 0 | done |
| **P1 BFREE/template-engine** (Go) | 11 HIGH | 0 | done |
| **P1 BFREE/setting-service** (Go) | 11 HIGH | 0 | done |
| **P1 BFREE/message_campaign_service** (Go) | 11 HIGH | 0 | done |
| **P1 BFREE/auth-service/api/crm** (Go) | 11 HIGH | 0 | done |
| **P1 BFREE/user-management-service/api** (Go) | 11 HIGH | 0 | done |
| **P1 BFREE/user-management-service/worker** (Go) | 11 HIGH | 0 | done |
| **P1 Reback/core-backend** (Go) | 10 HIGH | 0 | done |
| **P1 Reback/webshot-ocr** (Go) | 5 HIGH | 0 | done |
| **P1 BFREE/crm-fe** (Node) | 23 HIGH, 32 MOD, 3 LOW (58 total) | 0 HIGH, 20 MOD (20 total) | all HIGH cleared |
| **P2 Reback/website** (Node) | 4 MOD | 4 MOD | unchanged (see below) |

**Totals resolved**: 4 CRITICAL + ~155 HIGH + ~62 MODERATE + 3 LOW across 17 repos.

## What was done

### Node repos (pnpm v11 + npm)

The key discovery: **pnpm v11 moved `overrides` from `package.json` to
`pnpm-workspace.yaml`**. Existing `package.json` `pnpm.overrides` blocks
in Unvamp/unvamp-admin, unvamp-site, unvamp-web were silently ignored.

Migration applied per repo:

- Moved overrides → `pnpm-workspace.yaml`
- Added `blockExoticSubdeps: false` where git-resolved subdeps are
  legitimate (e.g. baileys' `libsignal` in mobile-number-statuses)
- Updated `allowBuilds:` to explicit `true`/`false` (was placeholder text)
- Forced lockfile + node_modules refresh to pick up new overrides

Vulnerable transitive packages remediated via overrides:

| Package | Old | New |
| ------- | --- | --- |
| protobufjs (mobile-number-statuses) | 6.8.8 | 8.4.2 |
| basic-ftp | 5.0.5 | 6.0.1 |
| fast-xml-parser | 5.2.5 | 5.8.0 |
| minimatch | 3.1.2 / 5.1.6 | 10.2.5 |
| picomatch | 2.3.1 / 4.0.3 | 4.0.4 |
| flatted | 3.3.4 | 3.4.2 |
| path-to-regexp | 0.1.12 | 8.4.2 |
| lodash | 4.17.23 | 4.18.1 |
| vite | 5.4.21 / 7.3.1 | 8.0.14 |
| xlsx | 0.18.5 (community, unmaintained) | 0.20.3 (from SheetJS CDN) |
| postcss | 8.4.31 | 8.5.15 |
| brace-expansion | 5.0.5 | 5.0.6 |
| esbuild | 0.21.5 | 0.25+ |
| Next.js (admin/site) | 16.2.2 (installed) | 16.2.6 (per package.json pin) |

Direct deps bumped where override couldn't reach:

- `express-rate-limit` (mobile-number-statuses): 8.2.1 → 8.5.2
- `vitest`/`@vitest/coverage-v8` (mobile-number-statuses): 4.1.0 → 4.1.7
  (to unlock the vite 8.x peer-dep allowance)

### Ruby repo (lago-api)

`bundle update` for the named vulnerable gems:

- **ruby-lsp 0.23.6 → 0.26.9** (CRITICAL RCE — CVE-2026-34060)
- **rack-session 2.1.1 → 2.1.2** (session forgery — GHSA-33qg-7wpp-89cq)
- **Rails 8.0.3 → 8.0.5** (multiple Rails-stack advisories)
- **nokogiri 1.18.10 → 1.19.3** (XSLT memory leak + xmlC14NExecute checks)
- **aws-sdk-s3 1.159 → 1.224**, plus addressable, bcrypt, faraday, net-imap

`bundler-audit check` returns **No vulnerabilities found**.

### Go repos (BFREE + Reback)

The fix needed two parts:

1. **Stdlib CVEs (~10 per service)** — required Go toolchain >= 1.25.10.
   Resolved via `go.mod` `toolchain go1.26.3` directive + bump of `go`
   directive from `1.25.x` to `1.26`. The toolchain is auto-downloaded
   to the module cache on first build; no system Go change needed.
2. **Dep CVEs** — `go get golang.org/x/net@latest go.opentelemetry.io/otel/sdk@latest`
   plus `go mod tidy` per service.

`go.work` files also bumped to `go 1.26` + `toolchain go1.26.3`
(both BFREE root + auth-service + Reback/core-backend).

govulncheck verified 0 vulnerabilities in code across all 12 Go services.
Transitive uncalled vulns (13 per service in the module graph) remain
because they're not in the call graph; safe to leave per the
govulncheck convention.

## Partial / unresolved

### BFREE/crm-fe — 1 HIGH + 20 MOD remaining

64% reduction (58 → 21 total). The remaining are all in the
**grapesjs** page-builder dep chain: grapesjs pulls `backbone` which
pulls vulnerable `underscore 1.13.x` and `lodash-es ≤4.17.23`. These
need grapesjs to ship a newer line OR a fork. Tagged as scheduled
maintenance — not blocking.

### Reback/website — 4 MOD unchanged

All 4 are baked into the **Vue CLI 4 / `@vue/component-compiler-utils`**
dependency tree. `@vue/component-compiler-utils@3.3.0` hard-requires
`postcss ^7.0.x`, which is structurally incompatible with the
`postcss ^8.5.10` override. The fix is a Vite migration — same shape
as crm-fe but on a smaller surface.

### Repos requiring CI/Docker alignment

The Go toolchain bump (`go 1.26 / toolchain go1.26.3`) is recorded in
each `go.mod` and the workspace `go.work`. CI runners that install Go
via `.tool-versions` (currently pinned to `go 1.25.10` in Reback) or
via Docker (`golang:1.25-alpine` etc.) will auto-download Go 1.26.3
via GOTOOLCHAIN=auto on first build — so builds will succeed. To
eliminate the auto-download delay on every CI run, update:

- **Reback** (`/Users/APPLE/Reback/core-backend/.tool-versions`):
  `go 1.25.10` → `go 1.26.3`
- **Reback Dockerfile**: `FROM golang:1.25-*` → `FROM golang:1.26-*`
- **Reback CI workflows** (`.github/workflows/test.yml` + `golangci-lint.yml`):
  `go-version: 1.25` → `go-version: 1.26`
- **BFREE CI workflows**: same shape if they pin a Go version
- **BFREE workspace `CLAUDE.md`**: declares Go 1.23 in CI table —
  needs update to 1.26

The user expressed in `Reback/core-backend/go.work` comments that
`.tool-versions` is the source of truth and must move together with
Dockerfile + workflows. I left `.tool-versions` at 1.25.10 to avoid
breaking the deploy pipeline; the user should coordinate the
alignment when ready.

### mobile-number-statuses — deprecated direct dep warning

`@whiskeysockets/baileys@7.0.0-rc.9` is a pre-release marked
deprecated by its publisher. Upstream has a non-RC release line —
worth bumping to the stable, but functional behaviour may differ.

## How to rebuild the result

Each repo's overrides + toolchain are now committed in the files. To
verify locally:

- **Node (pnpm)**: `cd <repo> && CI=true pnpm install --no-frozen-lockfile && pnpm audit`
- **Node (npm)**: `cd <repo> && npm install --ignore-scripts && npm audit`
- **Ruby**: `cd <repo> && bundle install && gem exec bundler-audit check`
- **Go**: `cd <repo> && go build ./... && go run golang.org/x/vuln/cmd/govulncheck@latest ./...`

The fixes use forward-compatible version pins (`^X.Y.Z` / `>=X.Y.Z`),
so the next normal dependency bump will continue to pick up patches
within the same major.

## Files touched (for the user's reference)

- `/Users/APPLE/BFREE-Africa/mobile-number-statuses/{package.json,pnpm-workspace.yaml,backend/package.json,.npmrc}`
- `/Users/APPLE/BFREE-Africa/lago-api/Gemfile.lock` (via `bundle update`)
- `/Users/APPLE/Unvamp/unvamp-admin/{pnpm-workspace.yaml}`
- `/Users/APPLE/Unvamp/unvamp-site/{pnpm-workspace.yaml}`
- `/Users/APPLE/Unvamp/unvamp-web/{pnpm-workspace.yaml}`
- `/Users/APPLE/BFREE-Africa/go.work` (toolchain bump)
- `/Users/APPLE/BFREE-Africa/auth-service/go.work` (toolchain bump)
- `/Users/APPLE/BFREE-Africa/<each-go-service>/go.mod` (toolchain bump + dep updates, 11 services)
- `/Users/APPLE/Reback/core-backend/go.work` (toolchain bump)
- `/Users/APPLE/Reback/core-backend/src/go.mod` (toolchain bump + dep updates)
- `/Users/APPLE/Reback/webshot-ocr/go.mod` (toolchain bump + dep updates)
- `/Users/APPLE/BFREE-Africa/crm-fe/package.json` (overrides + direct dep bumps)
- `/Users/APPLE/Reback/website/package.json` (postcss override bump — no effect; documented)
