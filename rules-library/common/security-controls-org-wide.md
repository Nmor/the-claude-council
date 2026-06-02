# Org-Wide Security Controls (Global Default)

> Auto-fires on every file. Sister to `dependency-vulnerabilities.md`,
> `license-allowlist-gate.md`, `security.md`, `done-criteria.md`.

## Core Principle

**Security controls live at the org level and are non-bypassable from
the consumer side. A control that can be disabled by editing a
single file in a single consumer repo is not a control — it is a
suggestion.**

Every meaningful security gate (CVE allowlist, license allowlist,
required-status-check, branch protection, deploy preflight) is
implemented in five layers. Bypassing the gate requires bypassing
ALL five — which by design requires org-admin action AND generates
an audit trail.

## The Five-Layer Enforcement Pattern

For every security gate (CVE allowlist, license allowlist, secrets
scan, dep audit, signed-commits requirement, branch protection):

| Layer | Where it lives | What it catches |
| --- | --- | --- |
| **1. Local pre-push hook** | `.githooks/pre-push` enabled via `git config core.hooksPath .githooks` | Catches the violation BEFORE the push reaches the remote |
| **2. Required CI status check** | `.github/workflows/<gate>.yml` (per repo) OR a required-workflow ruleset pinned to the org's `.github` repo | Catches the violation on every PR; GitHub branch-protection ruleset blocks the merge button at the UI level |
| **3. Org-level required workflow** | `<org>/.github/.github/workflows/<gate>.yml` referenced by an org-level branch-protection ruleset SHA-pinned to a specific commit | Forces the gate on EVERY consumer repo; cannot be disabled in the consumer |
| **4. Pre-deploy gate** | The same script the CI runs, re-invoked as a step in every deploy workflow (staging + prod) | Catches a violation that somehow merged anyway (e.g., via an emergency admin override) — the deploy still aborts |
| **5. CODEOWNERS approval** | `.github/CODEOWNERS` requires security-team approval on every change to lockfiles, `package.json`, `.npmrc`, IaC files, gate scripts themselves | Prevents a single rogue PR from removing the gate |

A violation that bypasses layer 1 hits layer 2. A merged-anyway
violation that bypasses layers 1+2 hits layer 4. A change to the
gate itself hits layer 5. Bypassing all five requires multiple
org-admin actions, each audit-logged.

## Centralize controls in the org's `.github` repo

The canonical security gate (workflow + allowlists + cross-check
scripts) lives at:

```text
<org>/.github/
├── .github/
│   ├── workflows/
│   │   └── security-baseline.yml      # the actual gate
│   ├── CODEOWNERS                     # security-team owns gate edits
│   └── branch-protection-rulesets.md  # docs the org ruleset
└── docs/
    └── security-templates/            # consumer-repo templates
```

**Never put security allowlists in consumer repos.** A `docs/security-
exceptions.json` (or similar) in a consumer is a write-access bypass:
any contributor with push to that consumer can grant themselves
arbitrary exceptions. Allowlists + exceptions live in the org repo,
under CODEOWNERS approval by the security team.

This applies to:

- License-allowlist exceptions
- CVE-allowlist entries (LOW findings, unfixable advisories with
  documented non-exploitability)
- Secrets-scan allowlists (test fixtures, intentional public keys)
- Signed-commit bypass actors (none, ideally)
- Branch-protection bypass actors (none, ideally)

The org ruleset SHA-pins to a specific commit of `<org>/.github/main`
so a malicious push to `main` doesn't take effect until the SHA is
explicitly bumped (which requires security-team CODEOWNERS approval
on the ruleset config).

## Required-workflow SHA-pin lifecycle

1. New gate logic lands in `<org>/.github` via PR → security-team
   review → merge.
2. New `main` SHA on `<org>/.github` is calculated.
3. Org ruleset (e.g., `require-security-baseline`) is updated to pin
   the new SHA:

   ```bash
   gh api orgs/<org>/rulesets/<id> > /tmp/r.json
   jq '.rules[].parameters.workflows[0].sha = "<new-sha>"' \
     /tmp/r.json > /tmp/r-bumped.json
   gh api orgs/<org>/rulesets/<id> -X PUT --input /tmp/r-bumped.json
   ```

4. The next CI run on every consumer PR picks up the new gate
   logic. No consumer-side change needed.

## Gate-output contract

Every security gate produces a verification block the developer +
reviewer reads:

```text
Security baseline (this turn):
  pnpm audit (backend):        0 HIGH, 0 CRITICAL, 0 MODERATE
  pnpm audit (frontend):       0 HIGH, 0 CRITICAL, 0 MODERATE
  osv-scanner CVE scan:        0 MODERATE+ (1 LOW tracked)
  license-allowlist scan:      0 violations (4 carved out via cross-check)
  secrets scan:                clean
  signed commits:              all signed
  branch protection ruleset:   active

Status: PASS
```

A failing block names the specific blocker + the documented fix path:

```text
Security baseline (this turn):
  osv-scanner CVE scan:        1 MODERATE — qs@6.15.1 (CVSS 6.3)
                               Fix: pnpm.overrides "qs": ">=6.15.2"

Status: FAIL — blocking PR
```

## Documented exception flow

Real exceptions exist (an unpatched upstream, a transitive dep with
no exposure, a dev-only dep that never reaches production). The flow:

1. **Document in the org's `docs/security-advisories.md`** with:
   - The finding (CVE id, license value, secret pattern)
   - The affected package + version
   - The reachability analysis (why this isn't exploitable in our
     usage — code path, network exposure, runtime context)
   - The granting reviewer + date
   - An expiry date (typically 90 days)
2. **Add the corresponding allowlist entry** in the org workflow.
3. **PR review** by security-team CODEOWNERS — without their approval
   the exception cannot land (layer 5).
4. **On expiry**, the gate fails again until either the upstream
   patch lands or the exception is renewed with fresh justification.

## Reachability matters

Not every finding is a production risk. Document the reachability
analysis when an exception is justified:

- **Dev-only transitive** (e.g., a CLI tool's HTTP client): never
  runs in Lambda / browser; uses local credentials, not IMDS;
  documented as "dev tooling only."
- **Code-path unreachable** (e.g., a function we don't call): verified
  via CodeQL / staticcheck reachability; documented with the analysis.
- **Mitigated at runtime** (e.g., a SQL-injection risk in a function
  we always parameterize): documented + tested.

The exception document must enumerate the reachability path. "We
don't think it's exploitable" without analysis is not a documented
exception — it's wishful thinking.

## What the consumer repo carries

Consumer repos under this regime carry:

- A `.githooks/pre-push` symlink + the `git config core.hooksPath
  .githooks` setup documented in the README
- A `docs/security-advisories.md` listing the LOW findings tracked
  (NOT the exceptions — those are org-side)
- A `.github/CODEOWNERS` requiring security-team review on lockfile
  - IaC changes
- A `infra/verify-local.sh` (or equivalent) wiring the same gates CI
  runs, so `git push` triggers them locally

Consumers do NOT carry:

- The security-baseline workflow source (org repo owns it)
- Allowlist values (org repo owns them)
- Exception lists (org repo owns them)
- Ruleset SHA pins (org-level configuration)

## Cross-references

- `license-allowlist-gate.md` — license-check policy + Trove
  cross-check pattern
- `dependency-vulnerabilities.md` — CVE enforcement; 5-layer pattern
  applies to this gate too
- `security.md` — broader OWASP + secret-management baseline
- `done-criteria.md` — every "done" claim runs all 5 layers
- `deploy-failures-become-checks.md` — every deploy failure becomes
  a pre-deploy check (same family)
- `dependency-overrides-not-exceptions.md` — prefer fix-the-dep over
  add-an-exception

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Per-consumer security-exceptions file found (rule 2 violation — exceptions live in org repo)
- Layer skipped (e.g., pre-push hook bypassed via `--no-verify`) — defence-in-depth weakening
- Required-workflow ruleset's SHA pin not bumped after gate logic change (org-side drift)
- CODEOWNERS approval bypassed on a gate-script change (layer 5 weakening)
- Exception without expiry date (anti-pattern — permanent exception)
- New control class added but only enforced in 1-2 of 5 layers (rule needs broadening)
- Deploy pipeline running gates that differ from PR-time gates (CI vs deploy drift)
- Bypass actor allowlist non-empty for branch protection on `main` (configuration drift)

**Refinement candidates**:

- New row in the 5-layer table when a new enforcement surface emerges (e.g., MCP gateway, IDE plugin)
- Tightening of the SHA-pin lifecycle when a malicious-tag retargeting incident is observed
- New cross-reference when a sister rule (dependency-vulnerabilities, license-allowlist-gate) provides the gate this enforces
- New exception-flow row when a new exception class (vendor-pending-fix, etc.) recurs
