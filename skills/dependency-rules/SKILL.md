---
name: dependency-rules
description: Dependency hygiene — dependency-pinning (lockfiles committed, image digest pins, Actions SHA-pinned), dependency-vulnerabilities (CVE gate: MODERATE+ blocks), dependency-overrides-not-exceptions (fix the tree first via pnpm.overrides), license-allowlist-gate (SPDX allowlist + Trove cross-check), install-allowlist (no silent global installs; publisher allowlist). Auto-fires on manifests + lockfiles across every ecosystem.
paths:
  - "package.json"
  - "pnpm-lock.yaml"
  - "package-lock.json"
  - "yarn.lock"
  - "go.mod"
  - "go.sum"
  - "Cargo.toml"
  - "Cargo.lock"
  - "pyproject.toml"
  - "poetry.lock"
  - "Pipfile"
  - "Pipfile.lock"
  - "requirements*.txt"
  - "Gemfile"
  - "Gemfile.lock"
  - "pom.xml"
  - "build.gradle*"
  - "*.csproj"
  - "*.sln"
  - "Package.swift"
  - "Package.resolved"
  - "pubspec.yaml"
  - "pubspec.lock"
  - "composer.json"
  - "composer.lock"
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - "**/go.mod"
  - "**/Cargo.toml"
  - "**/requirements*.txt"
---

> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H will delete the source files to close the eager-load loop.

# dependency-rules

## Source files migrated

- `rules-library/common/dependency-pinning.md`
- `rules-library/common/dependency-vulnerabilities.md`
- `rules-library/common/dependency-overrides-not-exceptions.md`
- `rules-library/common/license-allowlist-gate.md`
- `rules-library/common/install-allowlist.md`

---

<!-- ============================================================
     Section: dependency-pinning.md (from rules/common/)
     ============================================================ -->

# Dependency Pinning Rule (Always-On, Global)

> Auto-fires on every file. Sister to `dependency-vulnerabilities.md`
> (CVE gate), `dependency-overrides-not-exceptions.md` (force-upgrade
> transitives), `updated-frameworks.md` (stay on latest stable),
> `install-allowlist.md` (publisher allowlist), `semver.md` (range
> semantics). Standards: **Semantic Versioning 2.0.0**, **PEP 440**
> (Python), **OCI** (container images), **NPM Semver range syntax**,
> **Go Module Versioning**.

## Core Principle

**Every dependency is pinned in a way that guarantees deterministic
builds across machines, time, and rebuilds — while leaving the team
able to take security patches automatically. Lockfiles are
committed; ranges are documented; container base images are
digest-pinned; CI uses the exact lockfile.**

A build that produces different artifacts on different machines OR
on different days is a build that cannot be safely deployed.
Reproducibility is the precondition for everything else (security
scanning, rollback, debugging, compliance).

## Pinning strategies — pick the right one per layer

### Top-level applications

| Layer | Pin to | Why |
| --- | --- | --- |
| `package.json` `dependencies` | `^X.Y.Z` (caret) | Forward-compatible within major; lets Renovate batch minor updates |
| `pnpm-lock.yaml` / `package-lock.json` | Exact resolved versions | The lockfile IS the deterministic specification |
| Container `FROM` | Digest pin: `node:22.4.0-alpine3.20@sha256:...` | Tag mutability; the SHA never changes |
| OS package install | Pin version `apt-get install nodejs=22.4.0-1nodesource1` | Apt repos do mutate without notice |
| GitHub Actions | SHA pin: `actions/checkout@<sha> # v4.3.1` | Tag retargeting is a supply-chain vector |
| Terraform providers | Pin major + minor (`~> 5.45`) | Provider breaking changes |
| Helm charts | Exact version | Charts mutate |
| MCP servers | Exact + verify SHA | Per `install-allowlist.md` |

### Library / framework projects (consumed by other code)

| Layer | Pin to | Why |
| --- | --- | --- |
| `package.json` `peerDependencies` | `^X.Y.Z` (caret, MINIMUM range) | Don't fight consumer resolution |
| `package.json` `dependencies` | `^X.Y.Z` (caret) | Same as apps |
| `package.json` `devDependencies` | Exact (`X.Y.Z`) | Reproducibility for tests |
| Bundled types / runtime contracts | Tighter pin (sometimes exact) | Type-shape breaks are MAJOR |

The asymmetry: applications take more conservative pins to manage
their OWN supply chain; libraries take more permissive ranges so
they don't fight their consumers' resolutions.

## Hard rules

### 1. Lockfile is committed + authoritative

`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Pipfile.lock`,
`poetry.lock`, `Gemfile.lock`, `Cargo.lock`, `composer.lock`,
`go.sum` — committed in version control. CI fails if missing.

`pnpm install --frozen-lockfile` (or equivalent `--ci` flag) in
CI: the lockfile MUST match the manifest; no mid-build resolution.

### 2. Range syntax is documented per ecosystem

| Ecosystem | `^X.Y.Z` | `~X.Y.Z` | Exact |
| --- | --- | --- | --- |
| **npm / pnpm / yarn** | `>=X.Y.Z <X+1.0.0` (X≥1); `>=X.Y.Z <X.Y+1` (X=0) | `>=X.Y.Z <X.Y+1` | `X.Y.Z` |
| **Cargo (Rust)** | Same as npm for X≥1 | `>=X.Y.Z <X.Y+1` | `=X.Y.Z` (literal) |
| **pip / Python (PEP 440)** | `^` not native — use `>=X.Y.Z,<X+1.0.0` | `~=X.Y.Z` = compatible release | `==X.Y.Z` |
| **Go modules** | No caret — use `go.mod` exact + MVS resolution | n/a | Exact in `go.mod` |
| **Maven / Gradle** | `[X.Y.Z,X+1.0.0)` range syntax | n/a | `X.Y.Z` |
| **Composer (PHP)** | Same as npm | Same as npm | `X.Y.Z` |
| **NuGet (.NET)** | `[X.Y.Z,X+1.0.0)` | n/a | `X.Y.Z` |
| **Gemfile (Ruby)** | `~> X.Y` (loose); `~> X.Y.Z` (tight) | (no separate) | `X.Y.Z` |
| **Cabal (Haskell)** | `>=X.Y.Z && <X+1` | n/a | `==X.Y.Z` |

The IMPORTANT bit: caret (`^`) means "stay within major" except
when the major is 0 (per semver §4 — pre-1.0 is unstable; pnpm
applies caret as `^0.5.2 = 0.5.x`).

### 3. Container images: tag + digest

```dockerfile
# Wrong — only tag; the tag can be retargeted
FROM node:22-alpine

# Less wrong — version-locked tag
FROM node:22.4.0-alpine3.20

# Right — tag + digest; digest is immutable
FROM node:22.4.0-alpine3.20@sha256:a1b2c3...
```

The tag is human-readable; the digest is the cryptographic
identity. Renovate / Dependabot can bump BOTH when a new version
ships, with the SHA captured at bump time.

For multi-stage builds, pin EVERY stage:

```dockerfile
FROM node:22.4.0-alpine3.20@sha256:a1b2c3... AS build
FROM nginx:1.27.0-alpine@sha256:d4e5f6... AS runtime
```

### 4. CI: pinned tool versions

Don't `npm install -g foo` in a CI step. Pin the tool:

```yaml
# Wrong
- run: npm install -g typescript

# Right
- run: pnpm exec tsc --version       # uses repo's typescript
# OR with action
- uses: actions/setup-node@<sha> # v4.4.0
  with: { node-version-file: '.nvmrc' }
- run: corepack enable && corepack prepare pnpm@10.4.0 --activate
```

`.nvmrc`, `.tool-versions` (asdf), `.python-version` (pyenv),
`go.mod` `go 1.24`, `rust-toolchain.toml`, `Gemfile`-pinned Ruby —
all enforce the runtime version.

### 5. Renovate / Dependabot configured

Per `dependency-vulnerabilities.md`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "lockFileMaintenance": { "enabled": true, "schedule": ["before 5am on monday"] },
  "vulnerabilityAlerts": { "enabled": true, "labels": ["security"] },
  "pinDigests": true,
  "packageRules": [
    { "matchPackagePatterns": ["*"], "groupName": "non-major", "matchUpdateTypes": ["patch", "minor"], "automerge": true },
    { "matchUpdateTypes": ["major"], "automerge": false, "labels": ["major-bump"] },
    { "matchDepTypes": ["devDependencies"], "automerge": true }
  ]
}
```

The combination: minor + patch auto-merge on green CI; major
opens PR for human review.

### 6. Don't pin transitive dependencies (unless force-upgrading)

Direct dependencies are pinned. Transitive dependencies are
resolved by the package manager — you don't list every
transitive in `package.json`. The lockfile records the resolved
graph.

EXCEPTION: When a transitive has a CVE AND its parent hasn't
released a fix, use `pnpm.overrides` / `resolutions` / Cargo
`[patch]` to force-upgrade the transitive (per `dependency-
overrides-not-exceptions.md`).

### 7. Verify what's resolved

CI step that fails on UNEXPECTED resolutions:

```bash
# Verify the lockfile reflects intended versions
pnpm install --frozen-lockfile

# Audit the graph
pnpm why <package>   # confirm transitive paths
pnpm list --depth=Infinity  # full tree

# License + CVE gates
pnpm audit --audit-level=moderate
osv-scanner --lockfile=pnpm-lock.yaml
```

Per `dependency-vulnerabilities.md` — these gates are
non-bypassable; per `license-allowlist-gate.md` — license is
verified too.

### 8. Pre-release versions need explicit opt-in

`1.2.3-rc.1`, `2.0.0-beta.4` should not appear in the lockfile
UNLESS explicitly requested. Default Renovate config respects
the "stable only" policy; verify per-ecosystem.

For internal pre-release testing: use a separate branch / preview
deploy; don't promote pre-releases to main lockfile.

### 9. Pin documentation in changelogs

`CHANGELOG.md` documents not just feature changes but
DEPENDENCY changes:

```markdown
## [1.4.0] — 2026-05-26

### Changed
- Upgraded `axios` to `1.16.1` (security: GHSA-...) ([#127](https://github.com/example/proj/pull/127))

### Removed
- Dropped `moment` in favour of `date-fns` (~80 KB saved)
```

Consumers read the changelog before upgrading; dep changes
matter for downstream impact analysis.

### 10. Vendoring is a tool, not a default

Vendoring (committing `node_modules/`, `vendor/`, `_vendor/`) is
appropriate in narrow cases:

- Offline / air-gapped builds (regulated environments)
- Go's pre-modules era (now obsolete)
- Specific reproducibility requirements (academic publication)

The lockfile + registry verification (SRI integrity in
`pnpm-lock.yaml`, `go.sum` hashes) provides 95% of vendoring's
benefit without the repository bloat. Default to lockfile;
adopt vendoring only with documented justification.

## Per-language specifics

### JavaScript / TypeScript (pnpm)

```json
{
  "engines": { "node": ">=22.4.0", "pnpm": ">=10.4.0" },
  "packageManager": "pnpm@10.4.0",
  "dependencies": {
    "react": "^19.2.0",
    "axios": "^1.16.1"
  },
  "pnpm": {
    "overrides": {
      "qs": ">=6.15.2"
    }
  }
}
```

`packageManager` field (Corepack-aware) ensures everyone uses
the same pnpm version. `.npmrc` carries registry + auth config:

```ini
registry=https://registry.npmjs.org/
@my-org:registry=https://npm.pkg.github.com/
strict-peer-dependencies=true
auto-install-peers=true
```

### Go

`go.mod`:

```go
module example.com/svc

go 1.24

require (
    github.com/aws/aws-sdk-go-v2 v1.30.5
    github.com/golang-jwt/jwt/v5 v5.2.2
)

replace github.com/old/pkg => github.com/new/pkg v1.0.0
```

`go.sum` holds cryptographic checksums; both files committed.
MVS (Minimum Version Selection) algorithm: Go picks the MINIMUM
version that satisfies all requirements — different from npm's
"latest matching" semantics.

### Python (Poetry / pip-tools)

`pyproject.toml`:

```toml
[tool.poetry.dependencies]
python = "^3.12"
fastapi = "^0.115.0"
sqlalchemy = "^2.0.30"
```

`poetry.lock` committed. Alternative with `pip-tools`:
`requirements.in` (top-level) → `requirements.txt` (compiled,
committed) via `pip-compile --generate-hashes`. Hashes in
`requirements.txt` provide SRI for pip.

### Rust (Cargo)

`Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1.40", features = ["full"] }
serde = "1.0"

[patch.crates-io]
# Force-upgrade a vulnerable transitive
hyper = { git = "https://github.com/hyperium/hyper", tag = "v1.4.1" }
```

`Cargo.lock` committed for binaries; libraries can choose to
commit or not.

### Container images

```dockerfile
# Renovate auto-bumps + auto-updates the SHA
FROM node:22.4.0-alpine3.20@sha256:a1b2c3d4e5f6...

# OS pins
RUN apk add --no-cache --update \
    ca-certificates=20241121-r0 \
    curl=8.10.1-r0

# Tool pins
ARG PNPM_VERSION=10.4.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
```

## Anti-patterns

### Anti-pattern 1: `"foo": "*"` or `"foo": "latest"`

The lockfile resolves to A version, but the next `install`
might resolve to a DIFFERENT version. Builds diverge over time;
debugging becomes archaeology.

### Anti-pattern 2: Floating tags in production

`FROM node:lts` — the LTS pointer moves; the runtime changes
under you. Pin the major-minor + digest.

### Anti-pattern 3: Lockfile not committed

`.gitignore` includes `package-lock.json` — every team member
installs from the registry independently and gets different
versions. Production gets whatever was on the build machine
that day. Commit the lockfile.

### Anti-pattern 4: Exact pin on direct dependencies in apps

`"react": "19.2.0"` (no caret) means every patch release
requires a PR. Security patches that should auto-flow get
queued. Use `^` for apps; reserve exact for `devDependencies`
or specific compatibility constraints.

### Anti-pattern 5: Range pin on devDependencies

`"jest": "^30.0.0"` for tests — minor version difference
produces different test runs. Reproducibility suffers; CI flakes
appear that aren't really flakes. Pin devDependencies exactly OR
to a tight `~30.0.0` range.

### Anti-pattern 6: Pinning the lockfile to one Node version

`engines.node: "22.4.0"` (exact) — every developer must run that
exact version. Different patch versions of Node should be
fungible for the same lockfile. Use a range (`>=22.4.0 <23`) + a
documented test matrix.

## Verification block

```text
Dependency pinning (this turn):
  - Lockfile present + committed: pnpm-lock.yaml
  - CI runs `pnpm install --frozen-lockfile`: yes
  - Container FROM lines have @sha256 digests: 3/3
  - GitHub Actions SHA-pinned: 12/12
  - Renovate enabled + pinDigests: true
  - Pre-release versions in lockfile: 0
  - License + CVE gate: green
```

## Cross-references

- `dependency-vulnerabilities.md` — CVE gate runs against the
  lockfile
- `dependency-overrides-not-exceptions.md` — `pnpm.overrides`
  for transitive force-upgrades
- `updated-frameworks.md` — pin to latest stable; not EOL
- `install-allowlist.md` — pin to verified publishers
- `semver.md` — range syntax + bump rules
- `license-allowlist-gate.md` — license per pinned version
- `repo-setup-checklist.md` — lockfile present on first contact
- `deploy-failures-become-checks.md` — un-pinned dep is a
  deploy-failure class

## Standards cited

- **Semantic Versioning 2.0.0** — semver.org
- **NPM Semver range syntax** — npmjs.com/about-semver
- **PEP 440** — Python version identification + dependency
  specification
- **Go Modules Reference** — including Minimum Version Selection
  algorithm
- **OCI Image Spec** — digest pinning
- **PEP 503** — Simple Repository API
- **SLSA Framework** — Build-level integrity (Build L3 requires
  reproducible)

## Why this rule exists

Unpinned dependencies break in three predictable ways:

1. **Quiet upgrades** — `npm install` on Monday returns `axios
   1.7.5`; on Tuesday returns `1.7.6` with a behavioural change;
   tests pass but production fails differently
2. **Disappearing versions** — npm `unpublish`, Docker Hub
   tag deletion (left-pad incident class), Go proxy outages
3. **Tag retargeting** — `actions/checkout@v4` is updated by the
   maintainer to point at a malicious commit; every consumer
   silently picks it up

The cost of disciplined pinning: lockfile commits, Renovate
config, SHA pins in Dockerfiles. The cost of un-pinned
dependencies: irreproducible bugs, supply-chain incidents,
"works on my machine" CI failures.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `"*"` or `"latest"` as version string in `package.json` / `requirements.txt` (rule 1 violation)
- Container `FROM` line with floating tag (no `@sha256:...` digest) — rule 3 violation
- GitHub Actions used by tag (`@v4`) instead of full SHA — rule 3 violation, supply-chain risk
- `pnpm install` (without `--frozen-lockfile`) in CI — rule 1 weakening
- Lockfile not committed (`.gitignore` lists `package-lock.json`) — rule 1 violation
- `engines.node: "22.4.0"` (exact) instead of range — over-pinning anti-pattern
- Pre-release version (`-rc.1`, `-beta.4`) appearing in lockfile without explicit opt-in (rule 8 weakening)
- Renovate / Dependabot not configured + `pinDigests: true` missing (rule 5 weakening)
- Vendoring (`node_modules/` committed) without documented offline / regulated justification (rule 10 violation)
- Verification block shows un-pinned deps but PR merged anyway (CI gate weakening)

**Refinement candidates**:

- New ecosystem row in the range-syntax table when a new package manager emerges (e.g., `bun`, `deno`, new Python tools)
- Tightening of the auto-merge policy when minor / patch auto-merges break consumers
- New cross-reference when a sister rule (dependency-overrides-not-exceptions, license-allowlist-gate, install-allowlist) tightens the pinning contract
- New row in the pinning-strategies table when a new artifact class (Lambda layers, K8s sidecar images, Browser extensions) needs a documented pinning approach

---

<!-- ============================================================
     Section: dependency-vulnerabilities.md (from rules/common/)
     ============================================================ -->

# Dependency-Vulnerability Gate (Global Default)

> Auto-fires on every file. Sister to `updated-frameworks.md`
> (use latest stable versions), `done-criteria.md` (every "done"
> requires the gate to be green), and `security.md` (broader OWASP /
> supply-chain hardening).

## Core Principle

**Every commit, push, PR, and deploy passes a vulnerability scan
against the project's full dependency tree. CRITICAL, HIGH, AND
MODERATE CVEs all block. LOW is reported only.**

The cost of a CVE that makes it to production is hours of incident
response plus customer-trust damage. The cost of catching it at PR
time is one `pnpm audit` step. The gate exists because the latter
cost is two orders of magnitude lower.

The directive is intentionally strict on MODERATE. A backlog of
"deferred MODERATE CVEs" rots into unfixable transitive depth over
months; fixing each one at the time it lands keeps the dependency
tree healthy AND avoids the recurring "we'll defer this MODERATE
forever" trap.

## Hard rules

1. **Every TS/JS project has an `audit` step in its local
   pre-flight script.** Acceptable scanners (severity filter set to
   `moderate` or lower — never `high`):
   - `pnpm audit --json` parsed for MODERATE+ findings (preferred
     for pnpm-locked repos; pnpm's exit code can be unreliable, so
     parse the JSON yourself)
   - `npm audit --audit-level=moderate`
   - `yarn npm audit --severity moderate` (Yarn Berry)
   - `osv-scanner` for cross-ecosystem coverage (Go + Node + Python
     all from one binary)

2. **Every Go project runs `govulncheck`.** Install once with
   `go install golang.org/x/vuln/cmd/govulncheck@latest`; CI installs
   it on the runner.

3. **Every Python project runs `pip-audit` (or `safety check`).**

4. **Every Ruby project runs `bundler-audit`.**

5. **Every Rust project runs `cargo audit`.**

6. **Every PHP project runs `composer audit`.**

7. **Every Docker image runs `trivy image` against the built tag.**
   Catches both base-image CVEs and embedded-binary CVEs.

8. **CI fails on any CRITICAL, HIGH, or MODERATE.** LOW findings
   are reported as warnings; tracked in a `docs/security-advisories.md`
   (or equivalent) so the count is visible to the team and doesn't
   grow unboundedly. The MODERATE+ floor is non-negotiable — see
   the rationale in "Core Principle" above.

9. **The same scan runs locally and in CI.** No local-CI parity
   gap. If `infra/verify-local.sh` (or `scripts/preflight.sh`)
   doesn't include the audit step, the next PR adds it before any
   other work in the area.

10. **Renovate / Dependabot is enabled on every repo.** Security
    updates merge fast-track (auto-merge on green CI). Non-security
    updates batch weekly.

11. **Enforcement is non-bypassable.** PRs that violate the gate
    cannot merge; pushes that violate the gate cannot reach `main`;
    deploys that violate the gate cannot reach the target cloud.
    Implementation:
    - GitHub branch protection ruleset with the audit job as a
      required status check (blocks the merge button at the UI
      level).
    - Pre-push git hook installed via `git config core.hooksPath
      .githooks` (catches the violation before the push reaches
      the remote).
    - Pre-deploy step in every deploy workflow runs the same
      gate (catches a violation that somehow merged anyway, e.g.
      via an emergency admin bypass — the deploy still aborts).
    - CODEOWNERS file requires security-team approval on every
      change to `package.json`, lockfiles, `.npmrc`, and the gate
      scripts themselves.
    - Tag protection (`v*` pattern) restricts who can cut
      release tags.
    Bypass requires an org-admin override AND generates an audit
    event; routine PRs cannot opt out.

## Per-language scanner contract

### TypeScript / JavaScript (pnpm / npm / Yarn)

```bash
# Preferred — runs against pnpm-lock.yaml. Parse the JSON output
# rather than relying on pnpm's exit code (it's unreliable across
# pnpm versions; some return non-zero even on LOW-only findings
# with --audit-level=moderate).
cd <project> && pnpm audit --json | jq -e \
  '[.advisories[] | select(.severity == "moderate" or .severity == "high" or .severity == "critical")] | length == 0'

# For monorepos with workspaces:
cd <root> && pnpm -r audit --json

# When pnpm audit's advisory DB lags GitHub's, layer osv-scanner:
osv-scanner --lockfile=<root>/pnpm-lock.yaml
```

### Go

```bash
# Module-wide scan
cd <project> && govulncheck ./...

# Single-binary tag the entry point if you need finer scope
govulncheck -tags=integration ./cmd/api
```

### Python

```bash
# Lockfile-aware (Poetry / pipenv / pip-tools)
cd <project> && pip-audit --strict -r requirements.txt
# or:
cd <project> && safety check --policy-file .safety-policy.yml
```

### Container images

```bash
# Build first, then scan the built image
docker build -t myapp:pr-${SHA} .
trivy image --severity HIGH,CRITICAL --exit-code 1 myapp:pr-${SHA}
```

## What the gate output looks like

Every scan produces a verification block the developer / reviewer
reads:

```text
Dependency vulnerability scan (this turn):
  pnpm audit:        0 HIGH, 0 CRITICAL (3 MEDIUM tracked in docs/security-advisories.md)
  govulncheck:       0 findings
  trivy image:       0 HIGH, 0 CRITICAL (2 MEDIUM in base image — pinned in Dockerfile comment)

Status: PASS
```

A failing block looks like:

```text
Dependency vulnerability scan (this turn):
  pnpm audit:        1 HIGH (CVE-2025-XXXXX in lodash@4.17.20 → upgrade to 4.17.21)

Status: FAIL — blocking PR
```

Failure reports the CVE id, the affected package + version, the
recommended fix, and the file/lockfile entry that needs updating.

## Authoring the gate

The check goes wherever the project keeps its local pre-flight
(typical names: `infra/verify-local.sh`, `scripts/preflight.sh`,
or a `predeploy` npm script). CI runs the same script, so the
same output appears locally and in PR checks.

Minimal gate shape (illustrative — adapt to the project's
scanner mix):

```bash
#!/usr/bin/env bash
# infra/verify-dep-vulns.sh
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=()

check_pnpm() {
  local dir="$1"
  echo "── pnpm audit (${dir}) ─────────────────────────────────"
  if ! ( cd "${ROOT_DIR}/${dir}" && pnpm audit --audit-level=high ); then
    FAILED+=("pnpm audit: ${dir}")
  fi
}

# Adapt per-project — many repos have a backend + frontend split.
check_pnpm "backend"
check_pnpm "frontend"

# Add govulncheck / pip-audit / trivy stanzas here as the stack
# extends. Each call appends to FAILED on non-zero exit.

if [ "${#FAILED[@]}" -eq 0 ]; then
  echo "✓ Dependency vulnerability gate green."
  exit 0
fi
echo "✗ Dependency vulnerability gate FAILED for: ${FAILED[*]}"
exit 1
```

The PR that adds the gate also wires it into the project's local
`verify-local.sh` (or equivalent) so every developer hits it on
push, and into `.github/workflows/ci.yml` (or equivalent) so every
PR hits it in CI.

## CI integration

GitHub Actions example:

```yaml
- name: Dependency vulnerability scan
  run: bash infra/verify-dep-vulns.sh
```

GitLab CI:

```yaml
dep-vuln-scan:
  stage: test
  script: bash infra/verify-dep-vulns.sh
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_REF_NAME == "main"'
```

CircleCI / Buildkite / Drone: same shape — single shell call.

The scan also belongs in deploy pipelines (pre-deploy gate) so a
stale advisory caught after merge still blocks the deploy.

## Renovate / Dependabot configuration

Renovate is preferred (more configurable). Drop
`renovate.json` at the repo root:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "vulnerabilityAlerts": { "enabled": true, "labels": ["security"] },
  "schedule": ["before 6am on monday"],
  "packageRules": [
    { "matchPackagePatterns": ["*"], "groupName": "non-major", "matchUpdateTypes": ["patch","minor"] },
    { "matchDepTypes": ["devDependencies"], "automerge": true },
    { "matchPackageNames": ["typescript"], "automerge": false }
  ]
}
```

Vulnerability-tagged PRs bypass the weekly schedule (open
immediately) and are eligible for auto-merge when CI passes.

## Documented exceptions

Genuine cases where the scan reports a finding that can't be fixed
immediately:

1. **Upstream patch pending** — the maintainer has acknowledged
   the CVE but hasn't released a fix yet. Document in
   `docs/security-advisories.md` with the CVE id, the date logged,
   and the planned re-check date.
2. **Transitive dep with no exposure** — the vulnerable code path
   isn't reached by your application. Confirm with codeQL / staticcheck;
   document the analysis in `docs/security-advisories.md`. Do NOT
   silently ignore.
3. **Dev-only dependency** — the CVE only affects test fixtures or
   build tooling that never ships to production. Lower priority but
   still document; an exploited dev dep can poison the supply chain.

Every exception has an expiry date. When the expiry passes, the
gate fails again until either the upstream patch lands or the
exception is renewed with fresh justification.

## Why this rule exists

Recurring failure mode at every company that doesn't gate on this:
a CVE is published; nobody on the team sees the GitHub alert email;
weeks pass; an incident reports the same CVE; root cause is the
team didn't have a mechanical gate.

The fix is mechanical. Run the scan as part of the same script
that already runs tests + build + lint. The scan takes seconds.
The CVE catches that would otherwise hit production are worth
hours each.

## Cross-references

- `updated-frameworks.md` — use latest stable; this rule's gate
  catches the case where "latest stable" still has an unpatched CVE.
- `done-criteria.md` — every "done" claim runs this gate.
- `security.md` — broader OWASP / supply-chain rules.
- `deploy-failures-become-checks.md` — same family: every failure
  mode becomes a mechanical pre-deploy check.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- CVE published in a dep the project uses but no PR opened within 7 days (Renovate / Dependabot misconfigured)
- HIGH / MODERATE finding suppressed via `audit-ignore` / per-line comment (rule 1 weakening)
- MODERATE backlog growing > 5 entries in `docs/security-advisories.md` (rule 8 weakening — exception drift)
- `--audit-level=high` (instead of `moderate`) configured (rule 8 weakening — floor relaxation)
- Local pre-flight script lacks the dep-audit step (rule 1 weakening — local-CI parity gap)
- Pre-deploy gate diverges from CI gate (rule 9 weakening)
- Exception entry past expiry but gate still passing (rule 11 weakening — bypass drift)
- Deploy reached production with a CRITICAL CVE in the dep graph (5-layer enforcement weakening)

**Refinement candidates**:

- New scanner row when a new ecosystem ships (e.g., new Wasm registry, new mobile SDK store) and OSV-Scanner / npm-audit coverage gap
- Tightening of the MODERATE floor when a recurring CVE class shows MODERATE underestimates real exploitability
- New cross-reference when a sister rule (dependency-overrides-not-exceptions, install-allowlist, license-allowlist-gate) provides the toolkit to close a finding
- New exception template when a recurring "upstream patch pending" / "dev-only dep" / "reachability mitigated" class emerges

---

<!-- ============================================================
     Section: dependency-overrides-not-exceptions.md (from rules/common/)
     ============================================================ -->

# Dependency Overrides, Not Exceptions (Global Default)

> Auto-fires on every file. Sister to `dependency-vulnerabilities.md`,
> `license-allowlist-gate.md`, `updated-frameworks.md`,
> `security-controls-org-wide.md`.

## Core Principle

**When a security or license gate fails on a transitive dependency,
the first response is to FIX the dep tree — not to add an exception.**

Exceptions accumulate. Every exception is a permanent line item
some future contributor must justify and re-validate. Fixing the
tree closes the issue at its root and removes the recurring audit
cost.

The escalation order is strict:

1. **Replace the consumer** with a maintained alternative.
2. **Override the transitive** via `pnpm.overrides` / `resolutions` /
   `replace` directive.
3. **Patch the dep locally** via `patch-package` / `pnpm patch`.
4. **Document an exception** — only as a last resort, only with
   security-team CODEOWNERS approval, only with an expiry date.

Skip the lower-cost option and an exception lives in the codebase
forever. The user's directive: "Why are we using anything that has
not been maintained in years?"

## Hard rules

1. **No per-line suppression** of dep audit findings. No
   `// nolint:gosec`, `// audit-ignore`, `# pragma: ignore`,
   `// eslint-disable` for security rules. Fix the dep or the
   override; never the comment.

2. **No per-consumer security-exceptions file.** A
   `docs/security-exceptions.json` in a consumer repo is a
   write-access bypass: any contributor with push to that
   consumer can grant themselves arbitrary security exceptions.
   Exceptions live in the org's `.github` repo under
   security-team CODEOWNERS approval. See
   `security-controls-org-wide.md`.

3. **Investigate before excepting.** When a CVE / license finding
   surfaces, the response is:
   - `pnpm why <package>` (or `npm ls`, `go mod why`, `pip show`)
     to trace the dependency path
   - Read the changelog of the transitive's direct consumer to
     see if a newer version drops the dep
   - Check if the consumer itself is abandoned (often the root
     cause when transitive deps are abandoned too)
   Only after confirming no upgrade path exists is "exception"
   on the table.

4. **Prefer the SMALLEST override surface.** When a transitive
   needs bumping, override the transitive itself — not its parent.
   Smaller override → less risk of breaking unrelated code paths
   that depend on the parent's behavior.

5. **Override versions are pinned forward, not exact.** Use
   `>=X.Y.Z` (forward-compatible) rather than `X.Y.Z` (exact pin).
   Forward-compatible lets the override stay valid as the parent
   ecosystem moves; exact pinning creates the next override-bump
   chore.

## The pnpm.overrides idiom

The canonical tool for this in pnpm-based projects:

```jsonc
// package.json
{
  "pnpm": {
    "overrides": {
      "qs": ">=6.15.2",            // CVSS 6.3 DoS in qs.stringify
      "minimatch": ">=5.1.9",      // closes 3.x window
      "uuid": ">=11.1.1",          // GHSA-w5hq-g745-h8pq
      "unzipper": ">=0.12.3",      // drops abandoned `buffers` transitive
      "axios": "^1.16.1",          // forward-compat across 1.x security releases
      "fast-uri": ">=3.1.2",       // GHSA-v39h-62p7-jpjc
      "picomatch": ">=4.0.4",      // CVE-2026-33671
      "brace-expansion": ">=5.0.6" // ReDoS fix
    }
  }
}
```

Run `pnpm install --no-frozen-lockfile` after editing; commit the
updated `pnpm-lock.yaml`. Verify the override took effect:

```bash
pnpm why <package>  # confirms the new version is resolved
grep -E "^[[:space:]]+<package>@" pnpm-lock.yaml | sort -u
```

In multi-project repos (root + backend + frontend), each project's
`package.json` carries its own `pnpm.overrides`. Bumps must be
applied in every project that pulls the transitive.

### npm / yarn equivalents

- **npm 8.3+**: `package.json` → `"overrides": { "qs": ">=6.15.2" }`
- **yarn classic**: `package.json` → `"resolutions": { "qs": ">=6.15.2" }`
- **yarn berry**: same `resolutions` field
- **Go**: `go.mod` → `replace example.com/old => example.com/new vX.Y.Z`
- **Cargo**: `Cargo.toml` → `[patch.crates-io] qs = { version = ">=6.15.2" }`
- **Maven**: `dependencyManagement` block with the pinned version
- **Gradle**: `configurations.all { resolutionStrategy { force '...' } }`
- **pip / Poetry**: re-pin in `requirements.txt` / `pyproject.toml`
  (pip has no transitive-override mechanism — you upgrade the
  parent that pulls the bad dep)

## When override breaks the parent

Occasionally an override forces a transitive past a major-version
boundary the parent doesn't tolerate. Symptoms: build errors,
runtime crashes, broken APIs.

Decision tree:

1. **Is the parent abandoned?** Replace the parent. Bad transitive
   - abandoned parent = upstream isn't coming back; fork or swap.
2. **Is the broken behaviour exercised in your code?** Run the
   integration tests / e2e flow that touches it. If green, ship
   the override.
3. **Is there a stepwise override** (e.g., `>=5.x` instead of
   `>=10.x`) that closes the CVE without crossing the breaking
   boundary? Try it.
4. **Last resort: `pnpm patch <package>`** to apply a surgical
   diff that fixes the specific CVE on the old version. Commit
   the patch alongside the `patches/` directory.

## Replace abandoned consumers proactively

The user's recurring observation: when a transitive ships
unknown / unfixable licenses or CVEs, the root cause is usually
an abandoned consumer that hasn't been bumped in years. Common
replacements (always research the current state before swapping):

| Replace | With | Reason |
| --- | --- | --- |
| `request` (npm) | `undici`, `fetch`, `axios` | Archived 2020 |
| `node-sass` | `sass` (Dart Sass) | Deprecated |
| `aws-sdk` v1 | `aws-sdk-v2`, individual `@aws-sdk/*` | v1 EOL |
| `dgrijalva/jwt-go` (Go) | `golang-jwt/jwt/v5` | CVE-2020-26160; original archived |
| `golang/mock` (Go) | `go.uber.org/mock` | Original archived |
| `jinzhu/gorm` v1 (Go) | `gorm.io/gorm` v2 | v1 unmaintained |
| `moment` (npm) | `date-fns`, `dayjs`, `Temporal` (when stable) | Maintenance mode |
| `buffers` (npm) | (drop entirely — abandoned 2014) | GitHub repo deleted |

When a replacement exists, the override path is to bump the
consumer (`unzipper@0.10 → 0.12` drops `buffers` transitively),
not to add the transitive itself as an exception.

## Documented exceptions — when override is genuinely impossible

Three legitimate cases:

1. **Upstream patch pending** — the maintainer has acknowledged but
   not released. Document expected timeline; re-check date.
2. **Reachability mitigated** — the vulnerable code path isn't
   exercised by your application. Document the analysis (CodeQL,
   staticcheck, manual trace).
3. **Dev-only dependency** — the CVE only affects test fixtures or
   build tooling that never ships to production. Document the
   deployment-flow proof.

Every exception:

- Lives in the org's `docs/security-advisories.md` (NOT consumer).
- Carries the package + version + finding ID + reviewer + date +
  expiry.
- Is reviewed by security-team CODEOWNERS.
- Expires (90 days default). On expiry the gate fails again.

## Recognising the override-vs-exception fork

A snippet from a real session:

> Finding: `buffers@0.1.1` flagged license=UNKNOWN, repo archived 2014.
>
> **Exception path** (wrong): add `buffers@0.1.1: UNKNOWN-accepted`
> to `docs/license-exceptions.json`.
>
> **Override path** (right): `pnpm why buffers` shows
> `unzipper@0.10.14 → binary@0.3.0 → buffers@0.1.1`. `unzipper@0.12.x`
> dropped `binary` entirely. Override: `unzipper: ">=0.12.3"`.
> Result: `buffers` is gone from the lockfile.

The override is the same number of bytes of config as the
exception — but the exception leaves a permanent line item, and
the override fixes the tree.

## Cross-references

- `dependency-vulnerabilities.md` — CVE gate; this rule is the
  toolkit for fixing what the gate flags
- `license-allowlist-gate.md` — license gate; same rule applies
- `updated-frameworks.md` — use latest stable; abandoned consumers
  are the root cause this rule addresses
- `security-controls-org-wide.md` — where real exceptions live
  (org-side, not consumer-side)
- `no-discards.md` — don't suppress findings per-line; fix the code

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Exception added to `docs/security-exceptions.json` without first trying override path (escalation order violated)
- `pnpm.overrides` / `resolutions` / Go `replace` directive not attempted on a transitive CVE / license finding
- Override version pinned exactly (`X.Y.Z`) instead of forward-compatible (`>=X.Y.Z`) — rule 5 violation
- Per-line suppression (`// audit-ignore`, `//nolint:gosec`) used to silence a dep finding (rule 1 violation)
- Per-consumer security-exceptions file found in a consumer repo (rule 2 violation — must live in org-side)
- Exception applied to an abandoned consumer when the consumer should have been REPLACED (rule "Replace abandoned consumers" weakening)
- Override forces a transitive past a major-version boundary the parent doesn't tolerate without `pnpm patch` fallback considered (decision-tree gap)
- Exception added without expiry date (drift toward permanent state)

**Refinement candidates**:

- New row in the abandoned-consumer replacement table when a recurring class emerges (e.g., `formidable`, `multer`, new Go HTTP libs)
- Tightening of the override-vs-exception decision tree when a new framework's overrides syntax appears (e.g., `bun` overrides, `pnpm` v11 changes)
- New cross-reference when a sister rule (updated-frameworks, install-allowlist) provides a replacement target
- New ecosystem entry when a new package manager ships an override mechanism (Composer 3, Cargo's `[patch]` improvements)

---

<!-- ============================================================
     Section: license-allowlist-gate.md (from rules/common/)
     ============================================================ -->

# License-Allowlist Gate (Global Default)

> Auto-fires on every file. Sister to `dependency-vulnerabilities.md`
> (CVE gate), `security.md` (broader OWASP), and `updated-frameworks.md`
> (use latest stable).

## Core Principle

**Every package shipped into the dep graph carries a license. Every
license that ships into the dep graph appears on a curated, org-wide
SPDX allowlist. Unknown / unverifiable licenses block the gate.**

A dep with an unknown license is a legal hazard that compounds over
time: every consumer that pulls it inherits the same exposure, every
downstream customer adopting the product inherits it from them, and
the only way to remove it later is to surgically replace the
transitive root. Catching it at PR time costs minutes; removing it
from a shipped product costs days plus a re-audit.

This rule is the umbrella for license enforcement; the mechanical
gate lives in `security-controls-org-wide.md` (5-layer enforcement).

## Hard rules

1. **Every project's local pre-flight script runs a license-allowlist
   scan.** Acceptable scanners:
   - `osv-scanner --licenses=<ALLOWLIST>` (preferred — multi-ecosystem
     coverage, runs against pnpm/npm/yarn/Go/PyPI/Maven/Cargo
     lockfiles from one binary)
   - `pnpm licenses ls --json` parsed for non-allowlisted SPDX
   - `license-checker --onlyAllow=<SPDX-LIST>`
   - Equivalent per-language tool (`pip-licenses`, `bundle-audit
     --license-check`, `cargo-deny check licenses`)

2. **The SPDX allowlist is centralized at the org level**, not per
   consumer. Rationale: per-consumer allowlists let an attacker with
   write access to *any* consumer repo grant arbitrary license
   bypasses. The allowlist lives in the org's central `.github`
   repository (e.g. `<org>/.github/.github/workflows/security-baseline.yml`)
   and is referenced by every consumer via a required-workflow ruleset
   SHA pin. See `security-controls-org-wide.md`.

3. **Default-safe SPDX allowlist** (start here; extend with org
   counsel sign-off):

   ```text
   MIT, MIT-0, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC,
   MPL-2.0, CC0-1.0, CC-BY-4.0, CC-BY-SA-4.0, Unlicense, 0BSD,
   Zlib, BlueOak-1.0.0, Python-2.0, PSF-2.0, PostgreSQL,
   LGPL-3.0-only, LGPL-3.0-or-later, WTFPL
   ```

   Notably **NOT** on the safe-by-default list (require legal review
   before adding): GPL-2.0, GPL-3.0, AGPL-*, SSPL, BUSL, Commons
   Clause, Elastic License, Confluent Community License.

4. **Unknown / non-standard / blank licenses fail closed.** When
   `osv-scanner` reports `UNKNOWN` or `non-standard` on a package,
   the gate must FAIL unless a cross-check resolves it (see rule 5).

5. **Cross-check rescues legitimate licenses misclassified by the
   scanner.** Many scanners flag `UNKNOWN` / `non-standard` for:
   - **PyPI packages** using PEP 639 SPDX in `pyproject.toml`
     without the legacy `license=` field — cross-check with PyPI's
     Trove classifiers (`License :: OSI Approved :: <name>`)
   - **npm packages** with null `license` in `package.json` metadata
     — cross-check with the npm registry `license` field and the
     GitHub License API (`/repos/<owner>/<repo>/license`)
   - **Go modules** from private repos or the stdlib — cross-check
     with the canonical SPDX in the source-tree LICENSE file

   The cross-check itself is documented + scripted, not human
   judgement at scan time. Reference implementation lives in the
   project's local pre-flight directory (e.g. `infra/verify-licenses.sh`),
   and the org-wide cross-check script is shipped alongside the
   security-baseline workflow in the org's central `.github` repo.

6. **Replace, don't except.** When a transitive dep ships an
   unknown / non-allowlisted license, the first response is to
   *eliminate the dep*, not to add it to an exception list. Common
   tactics:
   - Upgrade the consumer to a version that drops the bad transitive
     (e.g., `unzipper@0.10.x` pulled `buffers@0.1.1` — abandoned and
     license-unknown — but `unzipper@0.12.x` rewrote the internals
     and dropped `buffers` entirely; the fix is `pnpm.overrides:
     unzipper: ">=0.12.3"`, not a license exception)
   - Swap the consumer for a maintained alternative (`request` →
     `undici`/`fetch`; `node-sass` → `sass`; `aws-sdk` v1 →
     `aws-sdk-v2`)
   - When no replacement exists, escalate to org legal sign-off
     before the exception lands

7. **License exceptions are org-level + time-bounded.** When a real
   exception is unavoidable, it lives in the org's centralized
   allowlist with: the package + version, the actual SPDX (or
   "unverifiable" with justification), the granting reviewer, the
   review date, and an expiry. On expiry the gate fails again until
   the exception is renewed or the dep is replaced.

## What the gate output looks like

A passing scan reports counted SPDX values + the cross-check resolutions:

```text
── License-allowlist scan (osv-scanner) ───────────────────────
+------------------------------------------+-------+
| LICENSE                                  | COUNT |
+------------------------------------------+-------+
| MIT                                      |  1462 |
| Apache-2.0                               |   698 |
| ISC                                      |   167 |
| BSD-3-Clause                             |    49 |
...
| non-standard                             |     1 |
| UNKNOWN                                  |     3 |
+------------------------------------------+-------+
+-------------------+-----------+---------------+---------+
| LICENSE VIOLATION | ECOSYSTEM | PACKAGE       | VERSION |
+-------------------+-----------+---------------+---------+
| UNKNOWN           | npm       | exit          | 0.1.2   |
| UNKNOWN           | npm       | reduce-object | 0.1.3   |
| non-standard      | npm       | url-template  | 2.0.8   |
+-------------------+-----------+---------------+---------+

── License cross-check (Trove + GitHub License API) ───────────
  exit@0.1.2: SAFE — npm registry license="MIT"
  reduce-object@0.1.3: SAFE — npm registry license="MIT"
  url-template@2.0.8: SAFE — GitHub BSD-3-Clause (probe: bramstein/url-template)

ⓘ Ignored 3 entries via license carve-outs.
✓ License-allowlist gate green (after cross-check carve-outs).
```

A failing scan names the package + the failure path:

```text
✗ License-allowlist gate FAILED — 1 violation(s) outside allowlist:
  - npm buffers@0.1.1: UNKNOWN — npm license=""; GitHub probe-failed
    (substack/node-buffers archived)
  Fix: drop the transitive via `pnpm.overrides: <consumer>: ">=<vsn>"`
```

## Authoring the gate

The local script mirrors the org workflow exactly. Reference:
`infra/verify-licenses.sh` in any consumer repo on the org workflow.
Minimum structure:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Run osv-scanner with --licenses=<ALLOWLIST>
osv-scanner scan source \
  --licenses="$ORG_ALLOWLIST_CSV" \
  --lockfile=pnpm-lock.yaml \
  --lockfile=backend/pnpm-lock.yaml \
  --lockfile=frontend/pnpm-lock.yaml \
  --recursive > "$JSON_OUT" 2>&1 || true

# 2. Parse violations → cross-check each via Trove + GitHub License API
#    + npm registry. Each cross-check that resolves to an allowlisted
#    SPDX → carve out. Each that remains UNKNOWN → real violation.

# 3. Fail closed on any real violation; report each by name.
```

## Cross-references

- `security-controls-org-wide.md` — 5-layer non-bypassable enforcement
  - centralize-in-org principle.
- `dependency-vulnerabilities.md` — sister gate for CVE enforcement.
- `updated-frameworks.md` — replace abandoned/unmaintained deps
  rather than adding exceptions.
- `dependency-overrides-not-exceptions.md` — `pnpm.overrides` as the
  canonical tool for force-upgrading transitive deps.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Non-allowlisted SPDX shipped (gate weakening — exception added instead of dep replaced)
- "UNKNOWN" / "non-standard" license carve-out without Trove / GitHub License API cross-check (rule 5 weakening)
- Per-consumer license-exceptions file found (rule 2 violation — must live in org repo)
- Exception without expiry (rule 7 weakening — permanent exception drift)
- New SPDX value emerging in deps that's not yet on allowlist or deny-list (allowlist needs review)
- GPL / AGPL / SSPL / BUSL dep added without legal sign-off (default-deny weakened)
- Cross-check script not run in CI (rule 5 — manual judgement re-emerged)

**Refinement candidates**:

- New SPDX row when a new permissive license gains adoption
- New deny-list entry when a viral / restrictive license emerges
- Tightening of the cross-check when "UNKNOWN" carve-outs prove load-bearing more often than expected
- New cross-reference when a sister rule (dependency-vulnerabilities, install-allowlist) overlaps the gate's scope

---

<!-- ============================================================
     Section: install-allowlist.md (from rules/common/)
     ============================================================ -->

# Install-Allowlist Rule (Global Default)

> Auto-fires on every file. Sister to `dependency-vulnerabilities.md`,
> `license-allowlist-gate.md`, `security-controls-org-wide.md`,
> `updated-frameworks.md`, `official-docs-first.md`.

## Core Principle

**No global install — of any package, extension, MCP, or runtime — happens
without an approval check against this allowlist. If the publisher is not on
the allowlist, the agent stops and asks the user. No silent installs, no
"npx -y" auto-runs, no curl-pipe-sh.**

This rule exists because the largest realised supply-chain attacks on
developer machines come not through application dependencies (caught by
the `dependency-vulnerabilities.md` CVE gate) but through global, IDE-level,
or shell-level installs where the user trusted the install command itself.
Examples include the `event-stream` npm package compromise, the `solana/
web3.js` 2024 backdoor, multiple VS Code marketplace extension take-overs
("Material Theme Free", "Solidity Visual Auditor", "ETHCode"), and the
recent wave of typosquatted MCP servers on uncurated registries.

The gate is preventive: it blocks the install BEFORE the compromised code
ever reaches the developer's machine.

## Hard rules

1. **No `npm install -g`, `pnpm add -g`, `pip install`, `pipx install`,
   `gem install`, `cargo install`, `go install`, or `brew install` runs
   without an explicit user approval.** All such commands are in the `ask`
   block of `~/.claude/settings.local.json`.

2. **No `npx -y <pkg>`, `pnpm dlx <pkg>`, `bunx -y <pkg>`, `pipx run --
   spec <pkg>`** — these auto-download and execute remote code. They are
   in the `deny` block of `~/.claude/settings.local.json`.

3. **No `curl … | sh` or `wget … | bash` installer pipes.** These are
   `deny`. Always download the script, read it, then run it.

4. **No VS Code / Cursor / Windsurf / Codex extension install runs
   silently.** `extensions.autoUpdate: false` is the default in
   `~/Library/Application Support/Code/User/settings.json`. Updates apply
   only after manual review.

5. **No new MCP server is registered without a publisher check.** See
   "MCP publisher allowlist" below. Adding an MCP from an unknown
   publisher requires:
   - Reading the source (the binary, the npm package, the git repo)
   - Confirming the publisher is verified (Anthropic, Docker, official
     vendor, well-known maintainer)
   - Documenting the decision in `~/.claude/plugins/installed_plugins.json`

6. **No `brew tap` for an unofficial tap without user approval.**
   Compromised third-party taps inject formulas the user did not request.

7. **Every install runs the corresponding vulnerability scan immediately
   after.** Per `dependency-vulnerabilities.md`. A successful install +
   skipped scan is not "done."

## Publisher allowlists

### npm / pnpm / yarn packages — DO-NOT-INSTALL list

These packages are abandoned, deprecated, or actively malicious. If a
project pulls them transitively, fix with `pnpm.overrides` (see
`dependency-overrides-not-exceptions.md`). Never install directly.

| Package | Replacement | Reason |
| --- | --- | --- |
| `request` | `undici`, `fetch`, `axios` | Archived 2020 |
| `node-sass` | `sass` (Dart Sass) | Deprecated |
| `aws-sdk` v1 | `aws-sdk-v2`, `@aws-sdk/*` | v1 EOL |
| `dgrijalva/jwt-go` (Go) | `golang-jwt/jwt/v5` | CVE-2020-26160 |
| `golang/mock` (Go) | `go.uber.org/mock` | Archived |
| `jinzhu/gorm` v1 (Go) | `gorm.io/gorm` v2 | Unmaintained |
| `moment` (npm) | `date-fns`, `dayjs`, `Temporal` | Maintenance mode |
| `buffers` (npm) | drop entirely | Repo deleted 2014 |
| `event-stream@>=3.3.6` (npm) | `Readable.from`, `node:stream` | 2018 backdoor |
| `flatmap-stream` (npm) | drop | Bundled the `event-stream` backdoor |
| `mafintosh/cli-progress-bar` | `cli-progress` | Account-take-over history |
| `chalk-template@1.x` | `chalk-template@1.0.0` (pinned) | 2025 supply-chain compromise of the chalk maintainer's npm token |

### VS Code / Cursor extensions — Known-bad and "do-not-install"

| Publisher / extension | Reason |
| --- | --- |
| `MaterialTheme-Free.material-theme` | 2024 malware variant pulled from marketplace |
| `tintinweb.solidity-visual-auditor` (variants) | 2023 backdoored copy circulated on open-vsx |
| `SimonSiefke.prettier-vscode` (typo) | Typosquat of `esbenp.prettier-vscode` |
| `Microsoft.CodeRunner` (typo) | Typosquat of `formulahendry.code-runner` |
| `chinwobble.ethcode` and copies | 2024 supply-chain compromise of ETHcode |
| Any publisher not on the allowlist below | Unknown → ask user before installing |

**Allowlist of trusted VS Code / Cursor publishers**
(install without per-extension approval — but Council still reviews
the specific extension):

- `ms-*` (Microsoft official, e.g., `ms-python.python`, `ms-azuretools.*`)
- `github.*` (GitHub official)
- `anthropic.*` (Anthropic)
- `amazonwebservices.*` (AWS)
- `hashicorp.*` (HashiCorp)
- `redhat.*` (Red Hat)
- `google.*`, `googlecloudtools.*` (Google)
- `shopify.*` (Shopify)
- `sonarsource.*` (SonarSource)
- `vue.*` (Vue.js core team)
- `dbaeumer.*` (Dirk Bäumer — ESLint maintainer)
- `esbenp.*` (Esben Petersen — Prettier maintainer)
- `eamodio.*` (Eric Amodio — GitLens maintainer)
- `editorconfig.editorconfig`
- `charliermarsh.ruff` (Astral / ruff)
- `golang.go`
- `oxc.oxc-vscode` (Oxc / Boshen)
- `vitest.explorer` (Vitest core team)
- `bierner.*` (Matt Bierner — Microsoft)
- `davidanson.vscode-markdownlint`
- `mtxr.sqltools*`, `ultram4rine.sqltools-clickhouse-driver`
- `vscodevim.vim`
- `ryanluker.vscode-coverage-gutters`
- `mikestead.dotenv`
- `mechatroner.rainbow-csv`
- `sumneko.lua`

Any publisher not on this list → STOP and ask the user before
installing. Single-author publishers (`cweijan.*`, `fanruten.*`, etc.)
are higher risk by default because the take-over surface is one
person's npm/marketplace credentials.

### MCP servers — Publisher allowlist

| Publisher | Status | Notes |
| --- | --- | --- |
| Anthropic (claude.ai-hosted Gmail/Calendar/Drive/etc.) | ALLOWED | OAuth-scoped; review scopes on connect |
| Docker (`docker mcp gateway run`) | ALLOWED | Docker Desktop's MCP gateway |
| Modelcontextprotocol official servers (github.com/modelcontextprotocol/servers) | ALLOWED | Read source before each version bump |
| Third-party MCPs from unknown publishers | ASK USER | No silent install |
| MCPs that bundle binary executables (not source) | ASK USER + verify SHA | Supply-chain substitution risk |
| MCPs that exec arbitrary shell on start | ASK USER + read the exec line | Most-attacked surface |

### Homebrew taps — Allowlist

| Tap | Status |
| --- | --- |
| `homebrew/core` | ALLOWED (default) |
| `homebrew/cask` | ALLOWED (default) |
| Vendor-official taps (`hashicorp/tap`, `aws/tap`, `mongodb/brew`, `github/gh`) | ALLOWED |
| Any other tap | ASK USER |

## What to do when the rule fires

### "User asked me to install `<X>`"

1. **Look up the publisher** in the allowlist above.
2. **If allowed**: proceed; immediately after install, run the
   corresponding vulnerability scan (`brew audit`, `npm audit`,
   `pip-audit`, etc.).
3. **If not allowed**: STOP. Tell the user:
   - The publisher is not on the verified allowlist
   - What the install would do (binary location, network access, scopes)
   - The recommended alternative (if known)
   - Ask explicitly: "Proceed anyway?" with the install command quoted
4. **Never silently install** an unknown publisher, even if the user's
   prompt sounded urgent. The 30 seconds of approval friction is the
   product, not the bug.

### "Renovate / Dependabot opened a PR bumping `<X>`"

1. Read the changelog of the bump. If it crosses a major version,
   surface the breaking changes.
2. Run the project's full test suite + CVE gate + license gate.
3. If green on every gate, the bump is safe to merge.

### "I see a new MCP I might want to register"

1. Stop. Open the MCP's source (npm package, git repo).
2. Read `package.json` / `pyproject.toml` / `Cargo.toml`. Check the
   author, the repo URL, the publish history (`npm info`, `pip show`).
3. Read the actual transport code (stdio handler, sse server). Note
   what tools it registers and whether any of them shell out.
4. Bring findings to the user before adding.

## VS Code / Cursor settings that enforce this rule

Already applied in `~/Library/Application Support/Code/User/settings.json`:

```jsonc
{
  "security.workspace.trust.untrustedFiles": "prompt",
  "security.workspace.trust.emptyWindow": false,
  "security.workspace.trust.enabled": true,
  "security.workspace.trust.startupPrompt": "always",
  "extensions.autoCheckUpdates": true,
  "extensions.autoUpdate": false,
  "task.allowAutomaticTasks": "off",
  "git.allowNoVerifyCommit": false,
  "git.allowForcePush": false,
  "telemetry.telemetryLevel": "off"
}
```

The same shape applies to Cursor (`~/Library/Application Support/Cursor/
User/settings.json`) and Windsurf when they are present.

## Shell-level enforcement

Already applied in `~/.claude/settings.local.json`:

- `deny`: `curl … | sh`, `curl … | bash`, `wget … | sh`, `wget … | bash`,
  `npx --yes`, `bunx --yes`, `pnpm dlx`, `brew install --HEAD`,
  `--dangerously-skip-permissions`.
- `ask`: every `brew install`, `npm install -g`, `pnpm add -g`,
  `pip install`, `pipx install`, `gem install`, `cargo install`,
  `go install`, `gh api`, `gh auth login`, `gh release`, `gh secret`,
  `gh variable`.

## Cross-references

- `dependency-vulnerabilities.md` — every install runs the CVE gate
- `license-allowlist-gate.md` — every install runs the license gate
- `security-controls-org-wide.md` — 5-layer enforcement pattern
- `updated-frameworks.md` — use latest stable; pair this with the
  allowlist check
- `official-docs-first.md` — every new external integration requires
  primary-source provider research first
- `~/.claude/plugins/blocklist.json` — programmatic deny-list

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Auto-run install (`npx -y`, `pnpm dlx`, `curl … | sh`) attempted (rule 2 / 3 violation)
- Unknown-publisher VS Code / Cursor extension installed without ask (publisher allowlist breach)
- New MCP server registered without source review (rule 5 weakening)
- Homebrew install from unofficial tap without ask (rule 6 violation)
- New typosquat / supply-chain-compromise incident matches an existing extension publisher pattern
- "Allowed" publisher discovered to have rotated maintainer with new account-takeover risk (allowlist needs revalidation)
- Post-install CVE scan skipped (rule 7 weakening)

**Refinement candidates**:

- New package on the DO-NOT-INSTALL list when a supply-chain compromise emerges
- New verified publisher row when an org maintainer proves trustworthy across multiple extensions
- Tightening of the MCP publisher check when a new MCP-specific attack surface (binary substitution, etc.) is observed
- New cross-reference when a sister rule (dependency-vulnerabilities, security-controls-org-wide) provides the post-install gate

---
