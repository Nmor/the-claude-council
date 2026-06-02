---
name: git-rules
description: Git + repo discipline — git-workflow (per-org identity, conventional commits, PR workflow), repo-setup-checklist (20-point first-touch security audit), docs-sync-with-code (every PR ships docs + code together), documentation-requirements (Diátaxis four-quadrant: tutorials / how-tos / reference / explanation). Auto-fires on git config + repo setup files + docs/.
paths:
  - ".gitignore"
  - ".gitattributes"
  - ".git/**"
  - ".githooks/**"
  - "CONTRIBUTING.md"
  - "README.md"
  - "**/CONTRIBUTING.md"
  - "**/README.md"
  - "docs/**/*.md"
  - "**/docs/**/*.md"
---

> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H will delete the source files to close the eager-load loop.

# git-rules

## Source files migrated

- `rules-library/common/git-workflow.md`
- `rules-library/common/repo-setup-checklist.md`
- `rules-library/common/docs-sync-with-code.md`
- `rules-library/common/documentation-requirements.md`

---

<!-- ============================================================
     Section: git-workflow.md (from rules/common/)
     ============================================================ -->

# Git Workflow

## Per-org git identity (set before the first commit)

When a developer or agent works across multiple GitHub organisations
with distinct email identities (personal account, employer org, side
project org, client orgs), the canonical shape is:

1. **Global default** in `~/.gitconfig` — set to the most-used or
   least-sensitive identity (typically personal).
2. **Per-org override** via `[includeIf
   "hasconfig:remote.*.url:https://github.com/<org>/**"]` blocks
   loading a `~/.gitconfig-<org>` snippet that pins `user.name`,
   `user.email`, AND `user.signingkey`.
3. **Per-org signing key** registered as a *Signing Key* (not just
   an Authentication Key) on the matching GitHub account.
4. **First-touch protocol**: on first clone / first edit of a repo
   from a new org, the agent verifies `git config user.email`
   matches the org's identity BEFORE the first commit. Mismatched
   commits create attribution accidents; never rewrite already-
   pushed history without explicit user authorization.
5. **Per-workspace specifics** (exact identities, signing-key paths,
   path-coverage globs) live in that workspace's `.claude/rules/`,
   not in global. Global states only the principle.

## Commit Message Format

```text
<type>: <description>

<optional body>
```

Types: feat, fix, refactor, docs, test, chore, perf, ci

Note: Attribution disabled globally via ~/.claude/settings.json.

## Pull Request Workflow

When creating PRs:

1. Analyze full commit history (not just latest commit)
2. Use `git diff [base-branch]...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch

## Feature Implementation Workflow

1. **Plan First**
   - Use **planner** agent to create implementation plan
   - Identify dependencies and risks
   - Break down into phases

2. **TDD Approach**
   - Use **tdd-guide** agent
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 70%+ coverage

3. **Code Review**
   - Use **code-reviewer** agent immediately after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Commit authored with wrong identity for the target org (per-org `includeIf` block missing or misconfigured)
- Commit unsigned when the repo's policy requires signing (signing-key not registered for that org's identity)
- First-touch protocol skipped — agent commits before verifying `git config user.email` matches the org (rule "First-touch protocol" weakening)
- PR created from only the latest commit's diff instead of the full divergence diff vs base (PR workflow violation)
- Branch pushed without `-u` flag on first push (workflow weakening — upstream tracking missing)
- TDD coverage gate of 70% used instead of canonical 90% touched / 80% project (sister rule `extreme-lint-policy.md` weakening — stale threshold)
- Already-pushed history rewritten without explicit user authorization
- Conventional-commits type misused (e.g., `feat:` for a pure refactor; `fix:` for a feature)

**Refinement candidates**:

- New conventional-commit type row when a recurring change class needs distinct labelling (e.g., `revert:`, `deps:`, `i18n:`)
- Tightening of the per-org first-touch check when identity mismatches recur in retrospectives
- New cross-reference when a sister rule (plan-completion-before-push, no-overclaim) provides a pre-push gate
- New PR template row when a recurring section (security checklist, accessibility checklist) belongs in every PR body

---

<!-- ============================================================
     Section: repo-setup-checklist.md (from rules/common/)
     ============================================================ -->

# Repo Setup Checklist (Global Default)

> Auto-fires on every file. Triggered explicitly when a new repo is
> cloned, initialised, or first-touched by Claude. Sister to
> `secrets-management.md`, `docker-localhost-binding.md`,
> `dependency-vulnerabilities.md`, `license-allowlist-gate.md`, and
> `done-criteria.md`.

## Core Principle

**Before any real work happens in a freshly cloned repo, run the
20-point setup-time security & posture checklist. Every item is
either green or gets remediated in the same session.** A repo that
fails any item is not "ready to work in" — it's "broken on arrival,
fix first."

The cost of these checks at clone-time is ~3 minutes. The cost of
discovering a tracked `.env` or an unbound port after a week of
edits is hours of git-history surgery and credential rotation.

## When this rule fires

- A new repo is cloned (`git clone <url>` or similar).
- An existing-but-never-touched repo is opened for the first time
  in this Claude Code session.
- A repo whose last touch was > 30 days ago — re-run since posture
  drifts (dep CVEs accumulate, .env patterns evolve).
- Explicitly: any time the user says "set up this repo" / "start
  working on X" / "let's audit repo Y".

## The checklist (20 items)

### Tracked-state hygiene (5 items)

1. **`.gitignore` covers secret patterns.** Required entries:
   `.env`, `.env.*` (with `!.env.example` whitelist), `*.pem`,
   `*.key`, `id_rsa*`, `id_ed25519*`, `.aws/credentials`,
   `*.postman_environment.json`, `.vault-token`, `.netrc`. See
   `secrets-management.md` for the full list.

2. **No `.env` tracked by git.**
   `git ls-files | grep -E "^\.env(\.|$)" | grep -v example`
   must return empty. Any match → `git rm --cached <file>` + add
   to `.gitignore`.

3. **No `*.pem` / `*.key` / `id_*` tracked by git** EXCEPT:
   - `*.pub` (public material — verify the file is genuinely public)
   - `.example`-suffixed placeholders with a 1-line "this is a
     generated test fixture" comment at top

4. **No Postman / Insomnia / Bruno collection with real response
   bodies.** Open each `*.postman_collection.json` and verify:
   - No `AKIA[A-Z0-9]{16}` (AWS Access Key)
   - No `ghp_` / `gho_` / `xoxb-` / `sk-` / `sk_live_` prefixes in
     `response` blocks
   - All auth tokens reference `{{variable}}` placeholders

5. **No commited `Secret` manifest with raw base64 data.**
   `grep -rn "kind: Secret" --include='*.yml' --include='*.yaml'`
   then verify each is a `SealedSecret`, `ExternalSecret`, or has
   `stringData:` populated by a deploy-time tool.

### Dependency posture (4 items)

1. **CVE gate passes.**
   - Node: `pnpm audit --audit-level=moderate` (or `npm audit`)
     returns exit 0
   - Go: `go run golang.org/x/vuln/cmd/govulncheck@latest ./...`
     returns "No vulnerabilities found"
   - Python: `pip-audit -r requirements.txt` exit 0
   - Ruby: `gem exec bundler-audit check` exit 0

2. **License-allowlist gate passes** (`osv-scanner --licenses=<list>`)
   per `license-allowlist-gate.md`.

3. **No abandoned-dep flags.** Per `updated-frameworks.md`, the
   known-bad list (`request`, `node-sass`, `aws-sdk` v1,
   `dgrijalva/jwt-go`, `golang/mock`, `jinzhu/gorm` v1, etc.) is
   absent.

4. **Lockfile present and committed.** `package-lock.json` /
   `pnpm-lock.yaml` / `go.sum` / `Pipfile.lock` / `poetry.lock` /
   `Gemfile.lock` / `Cargo.lock` is present.

### Infra posture (4 items)

1. **Docker compose ports loopback-bound.** Per
    `docker-localhost-binding.md`, every `ports:` entry in every
    `docker-compose*.yml` is `127.0.0.1:` prefixed (or uses a
    `${PUBLIC_BIND:-127.0.0.1}` env-var pattern for prod-aware repos).

2. **Dockerfile uses a non-root user** for production stages.
    `grep "^USER" Dockerfile` must show a non-root identity.

3. **Health checks declared** for every long-running service.
    Compose entries have `healthcheck:` blocks; Dockerfiles use
    `HEALTHCHECK CMD`.

4. **Multi-stage builds** for any image that includes a compiler
    or full SDK. The final stage carries only the binary +
    runtime deps.

### Secrets posture (3 items)

1. **`.env.example` exists** at the repo root (or service root in
    a monorepo) and lists every env var the app reads, with
    placeholder values (`changeme`, `your-token-here`,
    `EXAMPLE_VALUE`).

2. **`docs/secrets.md`** (or equivalent) documents where each
    real secret comes from in production AND in dev:
    - "STRIPE_SECRET_KEY: prod = AWS Secrets Manager `prod/stripe`;
       local = `aws-vault exec <profile> -- pnpm dev`"

3. **No long-term AWS key on disk.** `cat ~/.aws/credentials` shows
    no `aws_access_key_id = AKIA...` lines. The IAM key lives in
    Keychain via `aws-vault`; `.aws/config` uses
    `credential_process`.

### CI / quality gates (4 items)

1. **CI runs the same gates the local pre-flight script runs.**
    `.github/workflows/*.yml` (or equivalent) includes:
    - CVE scan (gitleaks + dep-audit + license-check)
    - Build
    - Test with coverage threshold
    - Static analysis (eslint / staticcheck / ruff / rubocop)

2. **Pre-commit hook installed.** `.pre-commit-config.yaml` exists
    OR `.githooks/pre-commit` is enabled via `git config
    core.hooksPath .githooks`. Hooks must include gitleaks and
    the dep-CVE gate.

3. **Test runner configured and passing.** `pnpm test` / `go test
    ./...` / `pytest` / `bundle exec rspec` succeeds on a fresh
    checkout.

4. **Branch protection on the default branch** (when GitHub /
    GitLab repo). Requires PR review + status checks before merge,
    blocks force-push to default, requires signed commits.

## Mechanical sweep script (the canonical pattern)

A one-shot script that runs all 20 checks in order. Each project's
local pre-flight script (`infra/verify-local.sh`,
`scripts/preflight.sh`, or equivalent) should embed this.

Minimal shape:

```bash
#!/usr/bin/env bash
# infra/verify-repo-setup.sh
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FAILED=()

echo "── Tracked-state hygiene ──"
if git -C "$REPO_ROOT" ls-files | grep -qE "^\.env(\.|$)" | grep -vq example; then
  FAILED+=(".env tracked by git")
fi

# ... etc, one section per item

if [ ${#FAILED[@]} -eq 0 ]; then
  echo "✓ repo setup green"
else
  printf "✗ %s\n" "${FAILED[@]}"
  exit 1
fi
```

The full script + per-language adaptations live at
`docs/security-templates/verify-repo-setup.sh` in the org's
`.github` repo (when present).

## What happens when this rule fires

Claude (or any agent) presented with a new repo MUST:

1. State explicitly: "Running repo-setup checklist on `<repo>` per
   `~/.claude/rules-library/common/repo-setup-checklist.md`."
2. Run each of the 20 checks (or the subset that applies to the
   repo's stack).
3. Report findings grouped by section.
4. Remediate the safe items automatically (gitignore additions,
   `git rm --cached` of tracked .env, etc.).
5. Surface the unsafe items (key rotation needed, history scrub
   needed) for user action.
6. Do not begin substantive feature work until the checklist is
   green OR the user has explicitly accepted a finding as
   documented technical debt.

## Why this rule exists

Repository security drifts over time. A repo that was green a year
ago accumulates:

- `.env.prod` checked in "just for a moment" that nobody reverted
- A Postman collection with a presigned-URL example response that
  carries a real AKIA key
- A test fixture private key that's been "fine for years" until a
  vulnerability scanner finds it
- Docker compose ports exposed on `0.0.0.0` because the original
  author "ran it on a server"
- Dep CVEs accumulated past `MODERATE+` because nobody renamed the
  audit-ignore list
- A CI workflow that runs tests but not the secret-scan step

Each of those is a 30-second fix at clone-time, OR a 4-hour
incident-response at discovery-time. This checklist is the cheap
side of that trade.

## Cross-references

- `secrets-management.md` — the secret-handling rule this enforces
  at setup time
- `dependency-vulnerabilities.md` — CVE gate item 6
- `license-allowlist-gate.md` — license gate item 7
- `updated-frameworks.md` — abandoned-dep list for item 8
- `docker-localhost-binding.md` — port binding item 10
- `done-criteria.md` — the full "ready to ship" gate; this
  checklist is the "ready to start" complement
- `no-overclaim.md` — never claim "repo is ready" until all 20
  items are green

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New repo opened without the 20-point checklist run on first touch (rule "When this rule fires" weakening)
- `.env` found tracked in git on first-touch (item 2 violation)
- Private key (`*.pem`, `*.key`, `id_rsa*`) found tracked (item 3 violation)
- Postman / Insomnia collection with real response bodies committed (item 4 violation)
- `Secret` manifest with raw base64 found (item 5 violation)
- Lockfile missing on first-touch (item 9 violation)
- Compose ports on `0.0.0.0` discovered on a developer machine (item 10 violation — sister rule `docker-localhost-binding.md`)
- Container running as root in production stage (item 11 violation)
- `.env.example` missing or stale relative to `application.yml` / `config.go` (item 14 weakening)
- CI gates diverge from local pre-flight (item 17 weakening)
- Branch protection missing on default branch (item 20 violation)

**Refinement candidates**:

- New checklist row when a recurring posture gap surfaces (e.g., `dependabot.yml` missing, `CODEOWNERS` missing, secret-scan CI step missing)
- Tightening of the 30-day re-check cadence when posture drift is observed sooner
- New cross-reference when a sister rule (secrets-management, install-allowlist, docker-localhost-binding) adds a new mechanical check
- Per-language addendum when a stack-specific item (e.g., `pnpm-lock.yaml` vs `package-lock.json`, `go.sum` integrity) recurs

---

<!-- ============================================================
     Section: docs-sync-with-code.md (from rules/common/)
     ============================================================ -->

# Docs-Sync-With-Code Rule (Always-On, Global)

> Auto-fires on every file. Sister to `done-criteria.md`,
> `official-docs-first.md`, and `no-overclaim.md`.

## Core Principle

**Every PR that adds or changes user-visible behaviour MUST update the
corresponding doc page in the same PR. Doc pages cannot lag code
across deploys.**

The pattern this rule prevents: code ships, doc lags by one deploy,
the next contributor reads the stale doc, repeats the bug or misuses
the new API, and the loop continues. The user has explicitly named
this as a recurring problem: "many document pages and landing are
still multiple deployments stale and the rules around these updates
are clear or should be very clear project and global wise."

The rule is on by default, global, on every project.

## Hard rules

Every PR's reviewer checklist MUST include:

- [ ] Every new feature has a doc page under `docs/`.
- [ ] Every behaviour change to an existing feature updates that
      feature's doc page.
- [ ] `README.md` lists every shipped feature accurately. Features
      that don't exist (yet) are NOT listed.
- [ ] `CLAUDE.md` (or project-equivalent) reflects the current
      architecture for the area touched.
- [ ] Marketing surfaces (landing pages, public site) describe only
      features that work today, not features in flight.
- [ ] `docs/runbook.md` (or project equivalent) has an entry for every
      new failure-mode the change introduces.
- [ ] Provider-research notes under `docs/provider-research/` are
      added or refreshed when external integrations change (see
      `official-docs-first.md`).
- [ ] `CHANGELOG.md` (when project keeps one) has an entry.

## What "doc page exists" means

The doc page IS the feature. A feature without a doc page is
unfinished. The doc page:

- States what the feature does in product terms (not implementation
  terms).
- Names the plan-tier gate (FREE / STANDARD / PRO / PRO_MAX, or
  equivalent).
- States the supported scope and the rejected scope (e.g. "business
  email providers only — personal Gmail / Outlook.com / iCloud /
  Yahoo / Proton are blocked at signup").
- Names the failure modes a user can encounter and what they mean.
- Cites the canonical provider docs (via the provider-research file).

## Mechanical gate

Every project's local preflight script
(`infra/verify-local.sh` / `scripts/preflight.sh` / `predeploy`) must
include a docs-sync gate. The gate greps the touched feature name in:

- `docs/`
- `README.md`
- `CLAUDE.md` (or project equivalent)
- The marketing landing page (e.g. `views/LandingView.vue`)

Missing references fail the gate. The gate runs locally AND in CI.

For repos that don't have a verify script yet, the docs-sync gate is
the FIRST script the next docs-touching PR should add. The check is
~30 lines of shell.

### Minimal gate shape (illustrative)

```bash
#!/usr/bin/env bash
# infra/verify-docs-sync.sh
set -euo pipefail

FEATURE="${1:?Usage: $0 <feature-keyword>}"

missing=()
grep -ri "$FEATURE" docs/ >/dev/null   || missing+=("docs/")
grep -i  "$FEATURE" README.md >/dev/null || missing+=("README.md")
grep -i  "$FEATURE" CLAUDE.md >/dev/null || missing+=("CLAUDE.md")
grep -ri "$FEATURE" frontend/src/views/LandingView.vue >/dev/null \
    || missing+=("LandingView.vue")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "FAIL: feature '$FEATURE' missing from: ${missing[*]}"
  exit 1
fi
echo "OK: feature '$FEATURE' is documented across all surfaces"
```

The PR that adds a new feature must add a call to this gate (one
line) for its feature keyword.

## When the doc lags AND the user has reported it

The user has explicitly flagged this rule with: docs / landing are
multiple deploys stale. When you encounter a stale doc surface while
working on something else:

1. The doc fix lands in the SAME PR as the work touching that area —
   not a follow-up.
2. If the doc gap is larger than the in-flight work (e.g. an entire
   feature page is missing), the in-flight PR adds at least a
   placeholder doc page and a `BUG(docs-gap-<short-id>)` marker
   pointing at what's missing. The next PR completes it.
3. Never silently move on. The "I'll do the docs next" pattern is
   how doc drift happens.

## What lives where

The provider-research files
(`docs/provider-research/<provider>.md`) carry primary-source URLs
and the *durable* technical contract — auth model, scope deprecation
cadence, rate limits, retry semantics. The runbook
(`docs/runbook.md`) carries failure-mode procedures. The feature doc
(`docs/<feature>.md`) carries the product-facing description. The
README + CLAUDE.md + landing carry the elevator-pitch / index.

When a feature changes, every layer it appears in is updated.

## Why this rule exists

The user has explicitly named documentation drift as a
trust-eroding pattern. Recurring instances:

- Feature pages described features that didn't work end-to-end.
- Landing copy advertised features that were broken from a fresh
  clone.
- Runbook entries existed for an old architecture and were never
  updated when the architecture changed.
- Provider integration code shipped without any
  `docs/provider-research/<provider>.md` file, so the next
  contributor had no record of what was supposed to be true.

The cost of writing the doc in the same PR is low. The cost of
debugging "is the docs lying or is the code lying" is high.

## Cross-references

- `done-criteria.md` — "done" requires the docs are in sync.
- `official-docs-first.md` — every external integration requires a
  `docs/provider-research/<provider>.md` file before any handler is
  written.
- `no-overclaim.md` — never claim "done" when the docs are stale.
- `no-silent-drops.md` — silently letting docs drift behind code is
  itself a silent drop of the work the doc was supposed to capture.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Feature PR merged without corresponding `docs/<feature>.md` update (rule 1 violation)
- README lists a feature that doesn't work end-to-end from fresh clone (advertised-but-broken pattern)
- Marketing / landing page references a feature that isn't shipped yet
- Provider integration ships without `docs/provider-research/<provider>.md` (sister-rule `official-docs-first.md` weakening)
- Runbook entry stale > 6 months yet still referenced by alerts (decay pattern)
- "I'll do the docs next" markers introduced (deferred-docs anti-pattern)
- Docs-sync gate missing from local pre-flight script in a docs-touching repo
- New failure-mode shipped without `docs/runbook.md` entry in the same PR
- CHANGELOG.md entry missing on releases that change user-visible behaviour

**Refinement candidates**:

- New row in the doc surface table when a recurring artifact class (status page, partner portal, ToS update) emerges
- Tightening of the docs-sync gate's grep scope when a new surface (e.g., `docs/api/` for OpenAPI) appears
- New cross-reference when a sister rule (deprecation-lifecycle, runbook-template, adr-template) provides the canonical home for a docs artifact
- Promotion of `BUG(docs-gap-*)` markers to real tickets when they accumulate past N per service

---

<!-- ============================================================
     Section: documentation-requirements.md (from rules/common/)
     ============================================================ -->

# Documentation Requirements Rule (Always-On, Global)

> Auto-fires on every file. Sister to `docs-sync-with-code.md`
> (docs stay in sync), `adr-template.md` (architectural decisions),
> `runbook-template.md` (incident response), `official-docs-first.md`
> (research before writing), `task-intake-due-diligence.md` Q20.
> Standards: **Diátaxis framework**, **CommonMark**, **OpenAPI 3.1**,
> **Conventional Comments**, **arc42**, **C4 Model**.

## Core Principle

**Every shipped feature ships with documentation. Every documented
surface follows the Diátaxis four-quadrant model so users can find
what they need: a tutorial when learning, a how-to when doing, a
reference when looking up, an explanation when understanding.
Documentation is code's peer — it's reviewed, versioned, tested,
and deployed together.**

A feature without docs isn't done. Code without docs is undocumented
debt; docs without code is fiction. They ship together or neither
ships.

## The Diátaxis quadrant

The framework (diataxis.fr — Daniele Procida) splits docs into
FOUR distinct types, each serving a different user need:

| Type | When user needs | Style |
| --- | --- | --- |
| **Tutorials** | Learning by doing — first contact | Lessons, step-by-step, narrative |
| **How-to guides** | Doing a specific task | Goal-oriented, "to do X, do Y" |
| **Reference** | Looking something up | Exhaustive, accurate, terse |
| **Explanation** | Understanding | Discursive, "why" + "how it relates" |

Mixing types in one doc confuses readers. A tutorial that pivots
into reference loses learners. A how-to that explains theory
loses experts. Each artifact picks ONE type.

## Documentation surfaces (what + where)

### Code-level

| Surface | Standard | Required |
| --- | --- | --- |
| **Function / method docstring** | JSDoc, godoc, docstring (Python), Javadoc, rustdoc | Public APIs always; private when non-obvious |
| **Module / package README** | Markdown at repo / package root | Every package has one |
| **Type definitions** | TypeScript types, OpenAPI, Proto IDL | Generated docs reflect canonical schema |
| **Inline comments** | `// why this is shaped this way` | Only when non-obvious (per `coding-style.md`) |

### Project-level

| Surface | Standard | Required |
| --- | --- | --- |
| **README.md** | CommonMark | Every repo |
| **CHANGELOG.md** | Keep a Changelog 1.1.0 | Every released package |
| **CONTRIBUTING.md** | Markdown | Open-source repos |
| **CODE_OF_CONDUCT.md** | Contributor Covenant | Open-source repos |
| **LICENSE** | SPDX-named license | Every repo |
| **SECURITY.md** | GitHub-recognised | Repos with security implications |
| **`docs/architecture.md`** | arc42 or C4 | Non-trivial projects |
| **`docs/runbook.md`** | Internal runbook template | Production services |
| **`docs/adrs/`** | ADR per `adr-template.md` | Every architectural decision |
| **`docs/api/`** | OpenAPI / GraphQL SDL / Proto | Every external API |
| **`docs/provider-research/`** | per `official-docs-first.md` | Every external integration |

### User-facing

| Surface | Standard | Required |
| --- | --- | --- |
| **Product documentation** | Diátaxis-organised | Every customer-facing feature |
| **API reference** | Generated from OpenAPI / GraphQL SDL | Every public API |
| **SDK reference** | Generated from typedoc / godoc / sphinx | Every SDK |
| **Tutorials / getting started** | Step-by-step | Every product |
| **Release notes** | Per release | Every release |
| **Migration guides** | Per major version | Per `deprecation-lifecycle.md` |
| **Status page** | Status communication | Every customer-facing system |

## Hard rules

### 1. Documentation lives in source control alongside code

`docs/` directory in the repo. NOT a separate wiki, NOT
Confluence, NOT Notion. (Status pages, marketing pages, and
similar surfaces can live elsewhere — but technical docs are in
the repo.)

Reasons:

- Docs version with code (a v1 doc is the v1 codebase's doc)
- PR review covers docs (no "I'll do the docs later" — see
  `docs-sync-with-code.md`)
- Search + diff + history work
- Branches expose proposed doc changes

### 2. Every PR that changes user-visible behaviour updates docs

Per `docs-sync-with-code.md`. The PR's checklist enforces it.

### 3. Generated reference docs are generated, not handwritten

API reference is generated from OpenAPI/GraphQL SDL/Proto/
typedoc/sphinx. Hand-written reference docs DRIFT — within a
year, the reference describes a different API than the running
code.

Generated docs are CI-built; the doc deploy fails if the
generation fails.

### 4. The README is the front door

Every README MUST cover:

```markdown
# <Project Name>

> One-line tagline.

[Badges: build, coverage, license, version, npm/pypi]

## What is this?

A paragraph explaining what the project does + who it's for.

## Quick start

```bash
# 5 lines max — get to first success
git clone ...
pnpm install
pnpm dev
```text

## Documentation

- [Tutorial](docs/tutorial.md) — first time
- [How-to guides](docs/how-to/) — task-specific
- [Reference](docs/reference/) — exhaustive
- [Explanation](docs/explanation/) — deep dives

## Status

What's stable, what's beta, what's experimental.

## License

SPDX identifier + LICENSE link.

```

The reader decides in 30 seconds whether to use the project.
Make those 30 seconds count.

### 5. Examples are tested

Code examples in docs MUST be tested. Otherwise they rot:

- **doctest** (Python): docstrings are executable tests
- **rustdoc**: tests embedded in doc comments run via `cargo test`
- **godoc Examples**: `func ExampleFoo() { ... }` runs as a test
- **MDX + Vitest** / **Jest snapshot from markdown**: extract +
  run code blocks
- **CI deploy preview**: run README's quick-start against a
  fresh container

Examples that diverge from the code are worse than no examples
— they teach wrong patterns.

### 6. Documentation has owners

Every doc page has a frontmatter owner:

```markdown
---
owner: team-payments
last-reviewed: 2026-05-26
review-cadence: quarterly
applies-to: api/v2/payments
---
```

Reviews are scheduled. Stale docs are flagged. Owners are
accountable.

### 7. Documentation is accessible (per `a11y.md`)

- Semantic markdown (headings, lists, tables — not screenshot-
  of-text)
- Alt text on every image (mandatory for content images;
  empty `alt=""` for decorative)
- Code blocks have language tags (`​```typescript`) so screen
  readers can announce + syntax highlight
- Sufficient contrast in custom-styled docs
- Search functionality is keyboard-accessible

### 8. Documentation is internationalised (per `i18n.md`)

For public-facing docs:

- Source language (typically English) is canonical
- Localised versions are stored under `docs/<locale>/`
- Locale fallback: if `docs/fr/api.md` doesn't exist, render
  `docs/en/api.md` with a "Translation pending" banner
- Translation memory + glossary apply (per `i18n.md`)

### 9. The doc deploy is automated

Every commit to `main` (or per-PR for preview):

- Build the docs site (Docusaurus, MkDocs, Sphinx, Astro Starlight,
  Nextra, VitePress)
- Run link-checker (lychee, markdown-link-check)
- Run accessibility check (Lighthouse)
- Deploy to docs.example.com / GitHub Pages / Netlify / Vercel
- Generate API reference from the live schemas

Manual doc deploys = stale docs.

### 10. Documentation has its own quality metrics

| Metric | Target |
| --- | --- |
| **Coverage**: features with docs / total features | 100% |
| **Currency**: % of docs reviewed in last 90 days | ≥ 80% |
| **Broken links** | 0 |
| **Search success**: % of queries returning a useful result | ≥ 90% |
| **Time to first action**: from arrival to first command run | < 5 minutes |
| **Reading level**: Flesch reading ease | ≥ 50 (for technical content) |
| **Image alt-text coverage** | 100% |

These are tracked + published. Doc debt is visible like code
debt.

## Reference architectures + templates

### arc42 — software architecture documentation

12 sections, broadly applicable. Use `architecture.md` template:

1. Introduction + Goals
2. Architecture Constraints
3. System Scope + Context
4. Solution Strategy
5. Building Block View (C4 levels)
6. Runtime View
7. Deployment View
8. Cross-cutting Concepts
9. Architectural Decisions (ADR index)
10. Quality Requirements
11. Risks + Technical Debt
12. Glossary

### C4 Model — architecture diagrams

Four nested views:

- **C1 Context**: system + external entities
- **C2 Container**: applications + datastores
- **C3 Component**: modules within a container
- **C4 Code**: classes (often skipped — code is the doc)

Tools: PlantUML, Structurizr, Mermaid C4 diagrams.

### ADRs — Architecture Decision Records

Per `adr-template.md`. Every non-trivial architectural decision
gets an ADR. Format (MADR or Nygard):

- Title + ID
- Status (proposed / accepted / deprecated / superseded)
- Context
- Decision
- Consequences
- Alternatives considered

### Runbooks

Per `runbook-template.md`. Every production service has a
runbook covering common incidents.

## Per-language doc tools

| Language | Tool |
| --- | --- |
| **TypeScript / JavaScript** | TypeDoc, JSDoc, API Extractor |
| **Python** | Sphinx + autodoc; pdoc; mkdocs + mkdocstrings |
| **Go** | godoc / pkg.go.dev (built into the language) |
| **Rust** | rustdoc (built into cargo) |
| **Java** | Javadoc (built into JDK) |
| **C# / .NET** | XML docs + DocFX |
| **Ruby** | YARD; RDoc |
| **Swift** | DocC |
| **Dart** | dartdoc |
| **Multi-language** | Docusaurus, MkDocs, Astro Starlight, VitePress, Nextra, Hugo |

## OpenAPI / GraphQL documentation

- **Redoc** / **Swagger UI** / **Stoplight Elements** — OpenAPI
- **GraphiQL** / **GraphQL Playground** / **Apollo Studio** —
  GraphQL
- Both ship inside the docs site for one-click try-it

## Anti-patterns

### Anti-pattern 1: "The code is self-documenting"

Self-documenting code documents WHAT it does. Documentation
explains WHY, WHEN, and HOW IT FITS. Even perfectly-named
functions need usage context.

### Anti-pattern 2: Bullet-point firehose

Documentation that's nothing but bullet points has no narrative
flow. Tutorials need narrative; how-tos need order; reference
needs structure beyond lists.

### Anti-pattern 3: Outdated screenshots

Every UI screenshot is a snapshot that goes stale. Either:

- Generate screenshots in CI on a baseline UI
- Use animated GIFs for complex flows (with text describing
  every step for accessibility)
- Skip screenshots and rely on text + a live demo link

### Anti-pattern 4: One giant document

The "complete guide" that's 50 pages long teaches no-one. Split
into Diátaxis quadrants; let users find the doc that matches
their goal.

### Anti-pattern 5: Marketing pretending to be docs

"Beautiful, blazing-fast, enterprise-grade" — that's marketing
copy. Docs need actual content: types, parameters, examples,
limits, gotchas.

### Anti-pattern 6: TODO-littered docs

`<!-- TODO: explain this -->` markers in published docs are
broken promises. Either finish the section or remove it.

## Documentation as code

Like code, documentation:

- Is version-controlled
- Is reviewed in PRs
- Has tests (link checks, example validations, accessibility)
- Has CI/CD (preview deploys, production deploys)
- Has owners
- Has metrics
- Has style guides (tone, voice, terminology — see also
  `i18n.md` glossary)

## Cross-references

- `docs-sync-with-code.md` — PRs update docs together
- `adr-template.md` — architectural decisions
- `runbook-template.md` — incident response
- `official-docs-first.md` — primary-source research recorded
- `api-versioning.md` — versioned docs for versioned APIs
- `deprecation-lifecycle.md` — migration guides
- `a11y.md` — docs are accessible
- `i18n.md` — docs are localisable
- `task-intake-due-diligence.md` Q20 (documentation)
- `repo-setup-checklist.md` — README required at setup time

## Standards cited

- **Diátaxis** (diataxis.fr) — Procida four-quadrant framework
- **CommonMark** — Markdown specification
- **Keep a Changelog 1.1.0** — keepachangelog.com
- **OpenAPI 3.1** — API reference generation
- **arc42** — software architecture template
- **C4 Model** — Brown's architecture visualization
- **MADR** — Markdown Architecture Decision Records
- **ISO/IEC/IEEE 26515** — Developing user documentation
- **Conventional Comments** — code-review tone

## Why this rule exists

Undocumented features fail in predictable ways:

- New team members spend weeks learning what could have been
  learned in days
- Customers cannot adopt features they don't understand
- Support burden scales with adoption because answers aren't
  written down
- Bug reports describe "broken" features that work as designed
  but weren't documented
- Refactors break implicit contracts that nobody knew about

Documented features fail less. The cost: one PR's worth of
markdown per feature, generated reference from schemas,
runbooks at on-call time. The benefit: features that actually
get used + a team that scales without re-explaining the same
things forever.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Feature shipped without a doc page (docs-sync-with-code.md violation — feature is not done)
- Diátaxis quadrants mixed in a single artifact (tutorial pivots into reference, etc.) — rule 1 weakening
- Reference doc hand-written instead of generated (rule 3 violation — drift inevitable)
- README missing the canonical sections (rule 4 weakening)
- Doc examples not tested (rule 5 weakening — examples rot)
- Doc lacks an owner / last-reviewed metadata (rule 6 weakening)
- Image without alt text shipped to docs (rule 7 a11y weakening)
- Time-to-first-action > 5 minutes for a quick-start (rule 10 metric drift)
- Broken-link count rises in CI (rule 10 metric drift)

**Refinement candidates**:

- New required README section when a recurring user need surfaces as a question on day one
- Tightening of the "examples are tested" enforcement when documentation rot is observed
- New cross-reference when a sister rule (adr-template, runbook-template) defines an artifact this rule references
- New row in the per-language doc-tools table when a tool becomes the team's choice

---
