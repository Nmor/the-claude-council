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

```
Dependency vulnerability scan (this turn):
  pnpm audit:        0 HIGH, 0 CRITICAL (3 MEDIUM tracked in docs/security-advisories.md)
  govulncheck:       0 findings
  trivy image:       0 HIGH, 0 CRITICAL (2 MEDIUM in base image — pinned in Dockerfile comment)

Status: PASS
```

A failing block looks like:

```
Dependency vulnerability scan (this turn):
  pnpm audit:        1 HIGH (CVE-2025-XXXXX in lodash@4.17.20 → upgrade to 4.17.21)

Status: FAIL — blocking PR
```

Failure reports the CVE id, the affected package + version, the
recommended fix, and the file/lockfile entry that needs updating.

## Authoring the gate

The check goes wherever the project keeps its local pre-flight (in
StewardBot that's `infra/verify-local.sh`; in a typical Node project
it's `scripts/preflight.sh` or a `predeploy` npm script). CI runs
the same script, so the same output appears locally and in PR
checks.

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
