# Always-Updated Frameworks Rule (Global Default)

> Auto-fires on every file. Companion to `done-criteria.md`,
> `no-discards.md`, `no-silent-failures.md`, and `sonarlint-checks.md`.

## Core Principle

**Use the latest stable, security-supported, actively-maintained
version of every dependency in every file you touch. Never pin to a
deprecated, archived, EOL, or known-vulnerable version.**

Frameworks evolve to close CVEs, ship breaking-change deprecations, and
align with the surrounding ecosystem. A project that drifts a year
behind accumulates compounding hazards: known CVEs, missing
performance work, removed APIs the runtime no longer supports.

This rule is on by default. When you add an import, declare a
dependency, or pin a version, the chosen version MUST be the current
stable line. When you touch an existing pin, audit it — if it has
slipped behind, bump it as part of the work.

## Hard rules

1. **No archived packages.** If a package's repo is archived or the
   maintainer has tagged the project deprecated, switch to its
   community-maintained successor. Examples:
   - `github.com/dgrijalva/jwt-go` → `github.com/golang-jwt/jwt/v5`
     (CVE-2020-26160; original archived).
   - `github.com/golang/mock` → `go.uber.org/mock` (Uber maintains
     the fork; the original is archived).
   - `github.com/aws/aws-sdk-go` v1 → `github.com/aws/aws-sdk-go-v2`
     (v1 is deprecated; v2 is mandatory).
   - `github.com/jinzhu/gorm` v1 → `gorm.io/gorm` v2.
   - `node-sass` → `sass` (Dart Sass; node-sass is deprecated).
   - `request` (npm) → `undici` / `fetch` / `axios`.

2. **No EOL runtimes.** Go ≤ 1.21, Node ≤ 18, Python ≤ 3.9, Java ≤ 11,
   PHP ≤ 8.0, Ruby ≤ 3.1 are EOL or near-EOL. New code MUST target a
   currently-supported runtime. If you touch a file in a project on an
   EOL runtime, surface the migration to the user explicitly rather
   than silently writing code that depends on EOL features.

3. **No CVE-flagged versions.** Before pinning, check `govulncheck`,
   `npm audit`, `pip-audit`, `bundler-audit`, `composer audit`, or the
   equivalent for the language. Any HIGH or CRITICAL CVE must block
   the pin.

4. **Latest stable, not latest pre-release.** Pin to the most recent
   GA release of the current major. Do not pin to alpha / beta / RC /
   nightly unless the user explicitly asked for it AND the reason is
   documented in a comment near the pin.

5. **One major behind is the maximum drift.** If the ecosystem is on
   N, you may be on N-1 with a justification, but never N-2 or older.
   The justification lives in a project doc (`docs/dependencies.md`
   or `CHANGELOG.md`), not in code comments.

6. **Lock files are committed.** `go.sum`, `package-lock.json`,
   `pnpm-lock.yaml`, `yarn.lock`, `Pipfile.lock`, `poetry.lock`,
   `Gemfile.lock`, `composer.lock`, `Cargo.lock` — all checked in. CI
   fails if missing.

7. **Renovate / Dependabot enabled.** Every repo has automated
   dependency-update PRs on a weekly cadence. Security-tagged updates
   merge fast-track.

## What the rule applies to

| Layer | What "updated" means |
| ----- | -------------------- |
| Language runtime | Latest LTS / GA. Go 1.24+, Node 22 LTS, Python 3.12+, Java 21 LTS, .NET 8+, Ruby 3.3+, PHP 8.3+, Swift 5.9+, Rust stable |
| Web framework | Current stable: Next.js 16, React 19, Vue 3.5+, Nuxt 4, Angular 18+, Astro 5+, SvelteKit 2+ |
| Backend framework | Gin v1.10+, Echo v4+, Fastify v5, Express 5, Spring Boot 3, FastAPI ≥ 0.115, Django 5 LTS, Rails 7+ |
| Build tool | Vite 8+, Turbopack/Webpack 5, Rspack, Rollup 4, esbuild 0.24+, Vitest 2+ |
| Style framework | Tailwind v4, MUI v9, shadcn/ui current, Bootstrap 5.3+ |
| Database driver | `pgx/v5` over `lib/pq`; `mongo-go-driver` v2; latest `prisma`; latest `sqlx` |
| Test framework | `testing` + `testify` (Go), Vitest (TS), pytest (Py), JUnit 5 (Java), XCTest / swift-testing (Swift) |
| ORM / Query builder | GORM v2, Drizzle, Prisma 5+, SQLAlchemy 2, Hibernate 6, Diesel 2 |
| Cloud SDK | AWS SDK v2 (Go/Node/Python), Google Cloud SDK current, Azure SDK current |
| Container base image | Alpine current, Debian stable (bookworm+), distroless current; pinned by digest |
| Linter / formatter | `golangci-lint` v2+, `staticcheck` current, `ruff` current, `eslint` 9+, `prettier` 3+, `biome` 1.9+ |
| Type checker | `tsc` 5.5+, `pyright` current, `mypy` 1.x current |
| Browser engine | Playwright current, Puppeteer current (drop Selenium for new work unless cross-browser/Selenium-specific need) |
| Mobile | React Native 0.75+, Expo SDK 52+, Flutter stable, Kotlin Multiplatform stable |

## When you encounter a stale pin

The protocol:

1. **Investigate before bumping.** Read the changelog between current
   and latest. Are there breaking changes? Migration guides?
   Deprecations that affect call sites?

2. **Update as a discrete commit / PR.** Bump + adjust + tests. Do
   not bundle a dependency bump into an unrelated feature commit.

3. **Run the project's full test suite** (`-race` for Go,
   `--coverage` for TS) before pushing.

4. **Surface the migration to the user** when it's non-trivial. If
   the bump rewrites public types or removes APIs, the user should
   know — describe the blast radius and the affected files.

5. **Update CI matrix.** If CI tests against multiple language
   versions and the dependency drops support for an older one, update
   the matrix or add a justification.

## When the rule needs an exception

Genuine exceptions exist (a customer pin, an SDK that hasn't shipped
a 2.x yet, a deprecation that hasn't been migrated platform-wide).
The exception is documented:

- A short note in the project's `docs/dependencies.md` explains *why*
  this pin is pinned and *when* the migration will happen.
- The user is informed at the moment you discover the constraint —
  never silently work around it.

A `// keep on v1` comment in code is NOT documentation. The
justification lives where humans look for it.

## Cross-references

- `done-criteria.md` — every "done" claim runs the dep-CVE check.
- `sonarlint-checks.md` — S2068 (hardcoded credential), S5547 (weak
  hash), S5527 (disabled SSL cert verification) overlap with the
  CVE-flagged-versions rule.
- `security.md` — the dep-CVE gate sits in the same family as the
  broader OWASP / supply-chain hardening rules.
- `dependency-overrides-not-exceptions.md` — when a transitive
  dep is archived / abandoned, use overrides to force-upgrade the
  consumer; only request a documented exception as a last resort.

## How this rule pairs with workspace rules

This global rule states the principle (latest stable + no
abandoned deps). Workspace `CLAUDE.md` files codify the
project-specific pins + incidents that motivated each choice
(e.g., "JWT lib must be the maintained fork, not the archived
original"). The split keeps global guidance reusable across
workspaces while letting workspace files carry the concrete
package names a given codebase has burned on.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Archived / deprecated package added or kept on first-touch (Hard rule 1 violation)
- EOL runtime (Go ≤ 1.21, Node ≤ 18, Python ≤ 3.9) targeted by new code (Hard rule 2 violation)
- HIGH / CRITICAL CVE present in pinned version (Hard rule 3 violation — sister `dependency-vulnerabilities.md` gate weakening)
- Pre-release (alpha / beta / RC / nightly) pinned without documented user request (Hard rule 4 violation)
- Drift > 1 major behind ecosystem current (Hard rule 5 violation)
- Lockfile missing in committed tree (Hard rule 6 violation)
- Renovate / Dependabot not enabled on repo (Hard rule 7 violation — security PRs lag)
- "We'll bump it later" markers introduced (deferred-bump anti-pattern)

**Refinement candidates**:
- New row in the abandoned-deps table when a new archive surfaces (e.g., `node-postgres` ↔ `pg`, new SDK retirements)
- Tightening of the "one major behind maximum" cap when N-1 versions consistently carry security debt
- New cross-reference when a sister rule (dependency-overrides-not-exceptions, install-allowlist) provides the replacement workflow
- New layer row in the "what rule applies to" table when a new artifact class (browser extension, edge worker, IoT runtime) emerges
