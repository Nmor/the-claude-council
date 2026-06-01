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
   + abandoned parent = upstream isn't coming back; fork or swap.
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
