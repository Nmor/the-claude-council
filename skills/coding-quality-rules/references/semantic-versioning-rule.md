# Semantic Versioning Rule (Always-On, Global)

> Auto-fires on every file. Sister to `api-versioning.md` (when
> authored), `deprecation-lifecycle.md` (when authored),
> `updated-frameworks.md`, `dependency-vulnerabilities.md`,
> `docs-sync-with-code.md` (CHANGELOG kept current). Standards:
> **Semantic Versioning 2.0.0** (semver.org), **Conventional
> Commits 1.0.0** (drives version bumps), **Keep a Changelog 1.1.0**
> (release-notes format).

## Core Principle

**Every package, library, service, API, and tool that ships
versions follows Semantic Versioning 2.0.0 — three numbers
`MAJOR.MINOR.PATCH` carrying explicit promises about backwards
compatibility. Consumers can upgrade with confidence within a
major version and know to brace for change at a major bump.**

## What each number means

```text
MAJOR.MINOR.PATCH

MAJOR — breaking changes to the public API (consumers MUST update)
MINOR — backwards-compatible feature additions
PATCH — backwards-compatible bug fixes
```

Pre-release suffix: `1.2.3-rc.1`, `2.0.0-beta.4`, `3.1.0-alpha.7`
Build metadata: `1.2.3+20260526.git.abc1234` (does not affect
precedence)

## Hard rules

### 1. Version 0.x is special

Pre-1.0 releases (`0.x.y`) signal "API is unstable." Bumps can
break consumers at ANY level. Consumers depending on a 0.x
package MUST pin exact versions; range pins (`^0.5.2`) are
risky because npm/cargo/etc. interpret 0.x ranges
inconsistently.

When the public API stabilises, release `1.0.0`. Don't stay on
0.x indefinitely "because it's pre-stable" — the version
signals trust to consumers.

### 2. Bump rules (the contract)

| Change | Bump |
| --- | --- |
| Remove a public function / type / endpoint | MAJOR |
| Rename a public function / type / endpoint | MAJOR |
| Change a function signature (new required param, removed param, reordered params) | MAJOR |
| Change a public response shape (remove field, change field type) | MAJOR |
| Tighten a parameter constraint that previously allowed valid values | MAJOR |
| Drop support for a runtime / OS / browser version | MAJOR |
| Change default behaviour in a way callers can observe | MAJOR |
| Add a new public function / type / endpoint | MINOR |
| Add an optional parameter (with a default) | MINOR |
| Add a new field to a response | MINOR (per JSON additivity convention) |
| Loosen a constraint (accept more valid inputs) | MINOR |
| Deprecate (but don't remove) a public API | MINOR |
| Bug fix that doesn't change the documented contract | PATCH |
| Performance optimisation with no behaviour change | PATCH |
| Internal refactor with no public-API change | PATCH |
| Documentation-only update | PATCH (or no release, if not user-visible) |
| Security fix that doesn't change the contract | PATCH |

When a security fix REQUIRES a breaking change, ship the
patch fix on the OLD major + the breaking fix on the NEW
major; communicate the choice clearly.

### 3. Conventional Commits drive the version bump

Per the **Conventional Commits 1.0.0** spec, commit messages
have a structured prefix that maps to a version bump:

```text
feat: <description>          → MINOR bump
fix: <description>           → PATCH bump
docs: <description>          → PATCH (no release if internal)
style: <description>         → no release
refactor: <description>      → PATCH (internal refactor)
perf: <description>          → PATCH
test: <description>          → no release
chore: <description>         → no release
build: <description>         → PATCH if affects consumers
ci: <description>            → no release

feat!: <description>         → MAJOR bump (note the `!`)
fix!: <description>          → MAJOR bump
<type>(<scope>): description → same rules with optional scope
```

`BREAKING CHANGE:` in the commit body OR `!` after the type
triggers a MAJOR bump regardless of the type prefix.

This convention enables `semantic-release` (npm),
`release-please` (Google's tool), `cargo-release` (Rust), etc.
to auto-compute the next version from commit history.

### 4. CHANGELOG.md is the human-readable record

Per **Keep a Changelog 1.1.0**, every published release has a
CHANGELOG entry:

```markdown
# Changelog

## [Unreleased]

### Added
- Feature description.

### Changed
- Behaviour change description.

### Deprecated
- API marked deprecated; removal in MAJOR 3.0.0.

### Removed
- API removed (breaking).

### Fixed
- Bug description with issue / PR link.

### Security
- CVE-2026-XXXXX patched.

## [1.4.0] — 2026-05-26
### Added
- `getUserPreferences(userId, options)` — new options.includeArchived flag.

### Fixed
- Race condition in `flushCache()` when called concurrently.

[Unreleased]: https://github.com/example/proj/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/example/proj/compare/v1.3.0...v1.4.0
```

Sections (Added / Changed / Deprecated / Removed / Fixed /
Security) are standardised so tooling + humans can scan
predictably.

### 5. Pre-release identifiers are ordered

Per semver §11: `1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-beta <
1.0.0-rc.1 < 1.0.0`. Use the conventional sequence:

- `alpha.N` — internal testing
- `beta.N` — external beta testers
- `rc.N` — release candidate (no new features, only fixes)
- `final` — the released version (no suffix)

Skip `alpha` for low-risk features; `beta` for high-risk.

### 6. Build metadata is informational only

`+20260526.git.abc1234` doesn't affect precedence; it's a
human-readable build identifier. Useful for CI build numbers,
git SHAs, build dates. NOT for runtime feature gating.

### 7. Internal versioning for services

For services (not libraries), the version is usually:

- `MAJOR.MINOR.PATCH+<build>` where MAJOR.MINOR.PATCH follows
  semver based on the public API
- OR `<deploy-date>.<sequential>` for deploy tracking

Either works; the requirement is that the running service
exposes its version at `/version` or `/build-info`.

### 8. Pinning strategies for consumers

| Range | Behaviour | Recommended for |
| --- | --- | --- |
| `1.2.3` | Exact pin | Production lockfiles (auto-generated by `pnpm` etc.) |
| `~1.2.3` | Latest PATCH within 1.2.x | Security fixes auto-flow |
| `^1.2.3` | Latest MINOR within 1.x | Default for most deps |
| `*` | Latest anything | NEVER — drifts uncontrollably |
| `1.x` / `>=1.2.3 <2.0.0` | Equivalent to `^1.2.3` | Same |
| `>=1.2.3` | Anywhere including MAJOR bumps | NEVER outside lockfile |

For applications (top-level): `^1.2.3` for active deps;
lockfile pins exact. For libraries (mid-level): the
`peerDependencies` and `dependencies` ranges should be as
permissive as possible (`^1.2.3`) so they don't fight
consumers' resolutions.

### 9. Tagging + git workflow

Releases are git-tagged: `v1.2.3` (with the `v` prefix is
convention). Tags are signed (per `git-workflow.md` rule on
signed commits). The release notes from CHANGELOG are
duplicated into the GitHub Release for visibility.

Tag protection rules in branch protection prevent
unauthorized retagging.

### 10. Deprecation lifecycle precedes removal

Per the upcoming `deprecation-lifecycle.md`:

1. **Announce** — MINOR bump introducing deprecation notice
2. **Soft-deprecate** — emit warnings (runtime + lint), but
   the API still works. Calendar minimum 30 days.
3. **Hard-deprecate** — runtime errors but a clear "use X
   instead" message. Calendar minimum 60 days from soft.
4. **Remove** — MAJOR bump.

Going from Announce to Remove takes a MAJOR bump (or 2). Skip
steps only with explicit user override.

## Anti-patterns

### Anti-pattern 1: "Internal-only" versioning

A monorepo's internal packages aren't free from versioning —
even internal callers benefit from clear semver. Use
`workspace:*` references in pnpm for internal pinning, but
still maintain CHANGELOG + version numbers.

### Anti-pattern 2: MAJOR bump for "feels like a big release"

Marketing's "v2.0" is not the same as semver's `2.0.0`. Semver
is contractual; marketing version is editorial. They can match,
but the technical version must follow semver semantics
regardless of marketing.

### Anti-pattern 3: Quietly breaking changes inside a MINOR

or PATCH

Once a thing is in MINOR, you cannot change it in PATCH.
Strictly. Even one undocumented breaking change destroys
consumer trust + bumps the cost of the next upgrade.

### Anti-pattern 4: Skipping CHANGELOG for "minor releases"

Every published version has a CHANGELOG entry. Even patches.
If the entry is "no user-visible change," that's still an
entry.

### Anti-pattern 5: Releasing on a Friday

Per industry convention (and your on-call's preference):
release MAJOR bumps Mon-Wed. Don't ship breaking changes
before a weekend.

## Cross-references

- `updated-frameworks.md` — use latest STABLE; semver tells you
  whether a dep bump is safe
- `dependency-vulnerabilities.md` — security fixes follow
  semver (PATCH or MAJOR depending on whether contract changes)
- `dependency-overrides-not-exceptions.md` — `pnpm.overrides`
  uses semver ranges; choose `>= X.Y.Z` not exact pins
- `docs-sync-with-code.md` — CHANGELOG updated in same PR as
  the release
- `git-workflow.md` — release tags are signed; conventional
  commits drive bump computation
- `task-intake-due-diligence.md` Q18 (deprecation lifecycle)
  — deprecations follow semver

## Standards cited

- **Semantic Versioning 2.0.0** — semver.org
- **Conventional Commits 1.0.0** — conventionalcommits.org
- **Keep a Changelog 1.1.0** — keepachangelog.com
- **PEP 440** (Python) — compatible-with-semver variant
- **Go modules** — `+incompatible` suffix for pre-modules tags

## Why this rule exists

Without semver, every dependency bump is a leap of faith.
Consumers either pin exact (and miss security fixes) or accept
range pins (and get broken in random builds). With semver,
consumers know:

- `1.x.y` → safe; auto-merge
- `2.0.0` → breaking; read CHANGELOG; plan migration

The cost of adhering to semver is one decision per release
("does this change the public contract?"). The cost of
ignoring it is broken consumers + lost trust.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Breaking change shipped as MINOR or PATCH (rule 2 violation — consumers silently broken)
- 0.x version pinned with caret range by consumers (0.x semantics misunderstanding)
- CHANGELOG missing entry for a published release (rule 4 weakening — anti-pattern 4)
- Conventional Commits convention violated (rule 3 weakening — auto-bump tooling breaks)
- Marketing "v2.0" published as semver `2.0.0` without genuine breaking changes (anti-pattern 2)
- Release tagged on a Friday for a MAJOR bump (anti-pattern 5)
- Pre-release suffix non-canonical (rule 5 violation — alpha / beta / rc ordering broken)
- Internal package treated as exempt from semver (anti-pattern 1)

**Refinement candidates**:

- New bump-rule row when an emerging change class is ambiguous (e.g., enum addition in serialised form)
- Tightening of the "release notes published with every version" requirement when CHANGELOGs drift
- New cross-reference when a sister rule (deprecation-lifecycle, api-versioning) prescribes companion semantics
- New ecosystem row when a language's range syntax gains adoption

---

<!-- ============================================================
     Section: extreme-lint-policy.md (from rules/common/)
     ============================================================ -->
