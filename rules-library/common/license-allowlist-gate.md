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
