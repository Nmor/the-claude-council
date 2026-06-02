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

```
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
