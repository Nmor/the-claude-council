# Changelog

All notable changes to **The Claude Council** are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing pending.

## [1.2.0] — 2026-06-28

The enforcement release. Promotes silent-failure / wiring / no-bloat /
payload-validation disciplines into the always-on Floor, adds mechanical
hook + CI enforcement for plan-marker strays, and completes the
public-ready scrub so every file ships as reusable guidance.

### Added — Floor rules

- `rules/common/no-silent-failures.md` — promoted from `rules-library/`
  to the Floor. New rule 8 (an observable best-effort swallow emits a
  metric + alert, not just a log) and rule 9 (absence-class detection via
  dead-man alerts + a startup effective-config log). The `rules-library/`
  copy is now a redirect stub.
- `rules/common/wiring-and-usage-review.md` — every new symbol has a live
  consumer; the NETWORK + INFRA path (NetworkPolicy / Service / IAM-IRSA /
  resource-applied / quota) is part of the live path, not just the call
  graph.
- `rules/common/no-bloat.md` — least code that solves the problem; no
  speculative or inert surface; every plan ends with a bloat-removal
  phase.
- `rules/common/validate-payloads-before-coding.md` — validate any
  external payload against the real contract before writing the code that
  produces or consumes it.
- `rules/common/principal-level-review-after-each-phase.md` +
  `rules/common/post-phase-retrospective-review.md` +
  `rules/common/phase-retrospective-sweep.md` — every phase boundary
  re-audits all prior phases for principal-level depth + intact
  cross-phase wiring via a different gate.
- `skills/codebase-memory/SKILL.md` — knowledge-graph query skill (cites
  ISO/IEC 39075:2024 GQL for the property-graph model).

### Changed — enforcement + hooks

- `scripts/hooks/lib/no-discards-rules.js` — `task-pointer` rule now also
  catches `GAP-?<n>` markers; new `silent-except` file rule flags
  `except: pass` / `except: ...` swallows.
- `scripts/hooks/pre-push-gate.js` — the authorized-push reminder asserts
  every changed symbol / flag / env / config is confirmed AND wired (no
  inert config).
- `rules/common/plan-task-breakdown.md` — unified the canonical plan-marker
  grammar (`P<n>.<segment>`, typed Gap / Review / Finding rows);
  deprecated standalone `GAP8` / `R-W2` forms.
- `rules/common/plan-completion-before-push.md` — push gate now requires
  every changed symbol / flag / env / config to be confirmed + wired.
- `tests/verify-link-integrity.sh` — skips gitignored runtime dirs
  (`plans/`, `audits/`, …) so the sweep matches what CI actually checks
  out.

### Changed — public-ready scrub

- Removed personal / workspace / vendor references and absolute machine
  paths across `CLAUDE.md`, `CHANGELOG.md`, the language-pattern skills,
  and `rules/common/done-criteria.md` — every file ships as reusable
  guidance.
- `.gitignore` — excludes machine-local MCP config (`.mcp.json`) and
  tool-installed `cbm-*` hooks so per-machine state never enters the repo.

### Changed — dependencies

- `actions/checkout` bumped to v7.0.0 (was v4.3.1) across the CI workflow
  (folds the dependabot `gh-actions-major` group; pinned by SHA).

## [1.1.0] — 2026-06-02

The lazy-rules-loading release. Reduces cold-load context from ~1.7 MB
to ~140 KB (~92% drop) while preserving every rule + skill + agent's
full content. Closes the `auto-skills.md` catch-all glob that was
defeating the skill-system's lazy-load mechanism.

### Added — dual-surface architecture

- `rules-library/` — 160 lazy-loaded files (60 common + 100
  language-specific across 20 language subdirs). NOT auto-walked;
  loaded ON DEMAND via skill `paths:` triggers + skill body
  references.
- `skills/` — 13 new pattern skills (csharp-patterns,
  dart-flutter-patterns, dockerfile-patterns, kotlin-patterns,
  lua-patterns, ruby-rails-patterns, rust-patterns, sql-patterns,
  yaml-patterns, ci-rules, dependency-rules, i18n-rules,
  resilience-rules) each declaring `paths:` triggers.
- `scripts/hooks/pre-compact-council-brief.js` — PreCompact hook
  that each Core Five Council Division contributes preservation
  items to before context compaction. Written to active session
  `.tmp` so the summariser sees the structured "preserve verbatim"
  block.
- `docs/lazy-loading-classification.md` — taxonomy of what's Floor
  vs Library vs Skill-routed.

### Changed

- `rules/common/` reduced from 74 files to 15 Floor rules
  (always-loaded). The other 59 moved to `rules-library/common/`.
- `rules/<lang>/` (20 language subdirs, 100 files) moved to
  `rules-library/<lang>/`.
- `CLAUDE.md` (14 KB Floor pointer) replaces the prior ~70 KB
  monolith. Per-language verification, full Council Protocol
  templates, and Division Personas now lazy-load via skill paths.
- `coding-standards` skill demoted from 19 KB body to 2.6 KB
  redirect stub pointing at `coding-quality-rules` (which carries
  the canonical content).
- `bootstrap/verify.sh` Phase B + F rewritten to match the
  dual-surface architecture. Reports Floor + Library counts
  separately; `paths:` trigger sweep added.
- Per-workspace `CLAUDE.md` files updated to point at the new
  `rules-library/` layout (67 broken refs fixed).
- IDE config templates (cursor, jetbrains, vscode, windsurf)
  updated to reference `rules-library/`.

### Hooks (wired in `settings.json`)

- `PostToolUse → Edit|Write → post-edit-no-discards.js` — was
  orphaned (script existed but not referenced).
- `PreToolUse → Write → pre-write-governance-sweep.js` — same.
- `PreCompact → pre-compact-council-brief.js` — runs BEFORE the
  existing state-snapshot hook.
- `PreToolUse → Bash → pre-push-gate.js` — fixed to accept the
  documented `CLAUDE_PUSH_AUTHORIZED=yes <cmd>` inline bypass
  shape (was only reading harness env).

### Fixed

- 331 broken cross-references across the repo (docs, agents,
  skills, IDE templates) all rewritten to point at the correct
  Floor / Library location.
- Illustrative Stripe documentation key (Stripe's own widely-published
  `sk_live_4eC39Hq...` example) in YAML "CATASTROPHIC" examples
  replaced with `REPLACE_WITH_VAULT_REF` so the teaching surface
  doesn't trip GitHub Secret Scanning.

### Removed

- ~95 KB of bloat: stale `settings.json` backup, duplicate
  `CLAUDE.md.pre-phase-h.*` (the `.local/backups/` copy is
  canonical), `scripts/.DS_Store`, `hooks/__pycache__/`, orphan
  `hooks/hooks.json` (Claude Code reads only `settings.json`).

### Verification (release-time)

- Floor + Library: 15 + 160 files; 116 unique skill-to-library
  refs all resolve.
- `bootstrap/verify.sh` Phases A-H: all green.
- `tests/verify-link-integrity.sh`: 1076 / 1076 links resolve
  across 394 files.
- `tests/verify-no-orphans.sh`: 0 orphans across 239 candidates.
- `tests/verify-standards-citations.sh`: 113 pass / 28 skip / 0
  flagged.
- `settings.json`: 14 hook script paths, all resolve.

## [1.0.0] — 2026-05-31

The peppy-painting-parrot rebuild. Single commit covering all 17 phases.
Establishes the 16-division Council, lifts every artifact to
principal-engineer level, and ships a cross-platform install surface
(macOS / Linux / Windows-native / WSL2) under MIT.

### Added

#### Phase 0 — Safety net

- `.gitignore` excluding the 5+ GB conversation tree
  (`projects/`, `sessions/`, `file-history/`, `telemetry/`,
  `statsig/`, `downloads/`, `cache/`)
- Git baseline commit (`8a07d9c`) as the rollback anchor
- Local `.local/project-tokens` opt-in pattern for per-user
  contamination audits (gitignored)

#### Phase 1 — Orphan cleanup + project relocation

- All workspace-specific plans / memories relocated to their
  respective project `.claude/` directories
- New global rules:
  - `plan-execution-progress.md` — structured per-phase progress
  - `plan-task-breakdown.md` — long-list-of-small-tasks discipline
  - `plan-completion-before-push.md` — no push without explicit OK

#### Phase 1.5 — Global-rule purity sweep

- Every global rule, skill, agent, and command stripped of
  workspace / vendor / session-specific content
- Generic `<workspace>` / `<project>` / `<provider>` placeholders
  used throughout
- `rule-authoring-global-vs-project.md` codifying the classification
  policy

#### Phase 2 — Rule consolidation + deepening

- `no-discards.md` umbrella consolidates `no-silent-failures.md`
  and `no-silent-drops.md`-class patterns at the canonical home
- `security.md` promoted to an OWASP Top 10 + ASVS-mapped umbrella
- `hooks.md` umbrella consolidates per-language hook subfiles
- 25 shallow rules deepened with rationale, anti-patterns, examples,
  verification checklists, cross-references

#### Phase 3 — 27 new global rules

- **Resilience cluster**: `idempotency.md`, `error-codes.md`,
  `circuit-breaker.md`, `graceful-degradation.md`,
  `rate-limiting.md`
- **Observability cluster**: `observability.md`, `log-levels.md`,
  `audit-logging.md`, `runbook-template.md`
- **API / schema cluster**: `api-versioning.md`,
  `schema-evolution.md`, `contract-testing.md`
- **Lifecycle cluster**: `semver.md`, `feature-flags.md`,
  `dependency-pinning.md`, `adr-template.md`,
  `deprecation-lifecycle.md`
- **Compliance cluster**: `a11y.md` (WCAG 2.2 AA+), `i18n.md`,
  `data-retention.md`, `gdpr-ccpa.md`, `code-of-conduct.md`
- **Dev-process cluster**: `documentation-requirements.md`,
  `local-dev-setup.md`, `no-ambient-globals.md`
- **Per-language no-discards**: `golang/no-discards.md`,
  `typescript/no-discards.md`, `python/no-discards.md`

#### Phase 4 — Skill consolidation

- `continuous-learning` v1 retired; `continuous-learning-v2` is
  canonical
- `frontend-design` merged into `frontend-patterns`
- `error-shape-contract-testing`, `content-hash-cache-pattern`,
  `fire-and-forget`, `regex-vs-llm-structured-text` folded into
  their parent skills

#### Phase 5 — Domain-skill expansion (≥ 99 skills)

- **Accessibility**: `wcag-accessibility`, `accessible-forms`
- **Security / compliance**: `owasp-asvs`, `gdpr-ccpa-compliance`,
  `pci-dss-patterns`, `iso27001-controls`, `soc2-readiness`,
  `hipaa-compliance`, `ferpa-coppa-compliance`
- **Finance / accounting**: `bookkeeping-patterns`,
  `ifrs-gaap-reporting`, `fp-and-a`,
  `payment-processing-patterns`
- **Investment**: `valuation-models`, `portfolio-theory`,
  `investment-research`, `investor-due-diligence`,
  `financial-analyst`, `stock-broker`
- **AI / ML**: `ml-model-selection`, `mlops-patterns`,
  `rag-design`, `prompt-engineering`, `fine-tuning-workflows`
- **Design (UX / UI)**: `ux-research`, `interaction-design`,
  `design-systems`
- **Org / management**: `org-design`, `okr-framework`,
  `hiring-process`, `performance-management`
- **Infrastructure**: `cloud-architecture`, `network-patterns`,
  `datacenter-ops`
- **Industrial**: `lean-manufacturing`, `six-sigma`,
  `supply-chain-patterns`
- **Structural engineering**: `structural-basics`,
  `mep-coordination`
- **Innovation**: `design-thinking`, `triz-patterns`,
  `lean-startup`
- **Interpersonal**: `negotiation-patterns`,
  `communication-patterns`
- **Research**: `research-methods`, `historical-analysis`
- **Education / edtech**: `edtech-patterns`,
  `clinical-data-patterns`

#### Phase 6 — Agent expansion (32 agents across 16 divisions)

- `security-reviewer` upgraded to `model: opus`
- **Core Five new**: `infra-reviewer`, `java-reviewer`,
  `mobile-reviewer`, `performance-reviewer`
- **Extended Eleven new**: `compliance-reviewer` (opus),
  `accessibility-reviewer` (opus), `ux-reviewer`, `ops-reviewer`,
  `data-reviewer`, `finance-reviewer`, `risk-reviewer`,
  `strategy-reviewer`, `people-reviewer`, `esg-reviewer`,
  `ai-ethics-reviewer` (opus), `comms-reviewer`
- **Domain sub-leads**: `payments-reviewer` (opus),
  `health-reviewer` (opus), `education-reviewer` (opus)
- Every agent has standardised frontmatter (`name`,
  `description`, `tools`, `model`) and the principal-level body
  shape: identity + mission, global rules enforced, auto-fire
  triggers, decision authority, review checklist, standards
  cited, output template, anti-patterns, pairing model,
  escalation triggers

#### Phase 7 — Council protocol overhaul

- 16-division structure (5 core always engage; 11 extended
  auto-fire per `council-triggers.md`)
- Bypass surfaces eliminated — `*` prefix only skips
  prompt-improver clarification; Council still convenes
- "Quick Council Check" deleted; "Abbreviated Council Check"
  preserves division participation with terser output
- Tiebreaker matrix codified — Architecture casting vote,
  Security / Compliance / Ethics / Risk vetoes named
- Bypass attempts logged to `~/.claude/audits/bypass-log.jsonl`
- New rule files: `council-default.md`, `council-triggers.md`
- Coverage target standardised at 80% project / 90% touched
- Rollback Protocol + Deprecation Lifecycle sections added

#### Phase 8 — Workspace ripple

- Workspace `CLAUDE.md` references updated for consolidated rule
  names (`no-discards.md` umbrella replaces older sibling
  references)
- Workspace plan + memory files relocated per
  `project-scoped-artifacts.md`

#### Phase 9 — Verification

- Synthetic Council task (multi-tenant rate-limiting) end-to-end
  pass
- Link-integrity grep, no-orphans, standards-citations checks
  green
- `bootstrap/verify.sh` reports 17 / 17 checks passing

#### Phase 10 — Final cleanup

- Stub redirects retired once references migrated
- Final link-check pass

#### Phase 11 — Project-scoped artifacts

- New rule `project-scoped-artifacts.md` — first-touch detection
  and workspace `.claude/` scaffold
- New template `templates/project-claude-scaffold/` shipped
- Tech-stack auto-detection table (Node / Go / Python / Ruby /
  Rust / Java / Kotlin / .NET / Swift / Dart / Solidity / IaC)

#### Phase 12.5 — Verify-before-claim + local-testability

- New rule `verify-before-claim.md` — every completion claim
  paired with same-turn verification block
- New rule `local-testability.md` — every code change locally
  testable BEFORE writing; missing prereqs surface env-setup
  request first

#### Phase 13 — External skill inventory

- Curated import from `anthropics/skills`,
  `claude-cookbooks`, `awesome-claude-code`,
  `VoltAgent/awesome-agent-skills`, `alirezarezvani/claude-skills`,
  `wshobson/agents`, claudemarketplaces.com
- Every imported skill normalised to the principal-level
  template + license + publisher allowlist check

#### Phase 14 — Public-repo packaging

- `README.md` — landing + 5-paragraph Council pitch +
  with-vs-without table
- `INSTALL.md` — macOS / Linux / Windows-native (PowerShell, no
  WSL2 required) / WSL2 sections; per-IDE walkthroughs
- `LICENSE` — MIT
- `bootstrap/install.sh` + `verify.sh` + `uninstall.sh`
  (POSIX shell)
- `bootstrap/install.ps1` + `verify.ps1` + `uninstall.ps1`
  (PowerShell 5.1+ / PowerShell Core 7+)
- `docs/ARCHITECTURE.md`, `docs/COUNCIL.md`, `docs/RULES.md`,
  `docs/SKILLS.md`, `docs/AGENTS.md`, `docs/PROJECT-BOOTSTRAP.md`,
  `docs/CONTRIBUTING.md`
- `tests/verify-link-integrity.sh`, `verify-no-orphans.sh`,
  `verify-standards-citations.sh`
- `.github/workflows/ci.yml` — runs all three verifiers on push
  and pull request
- `.github/PULL_REQUEST_TEMPLATE.md` + `.github/ISSUE_TEMPLATE/`

#### Phase 15 — Per-IDE templates

- `templates/ide-configs/vscode/settings.json` +
  `extensions.json` — security-hardened defaults, allowlisted
  publishers, strict SonarLint thresholds
- `templates/ide-configs/cursor/settings.json` — VS Code-engine
  parity plus `cursor.*` governance (Pyright, Cmd-K, Composer,
  Tab, Privacy Mode, Background Agent)
- `templates/ide-configs/windsurf/settings.json` +
  `extensions.json` — Windsurf parity
- `templates/ide-configs/jetbrains/README.md` — Anthropic
  Claude Code [Beta] plugin install + per-IDE keymap +
  code-style XML pointers
- **Gem extensions added across all VS Code-engine templates**:
  Error Lens (inline diagnostics), Todo Tree (BANNED-marker
  surface — TODO/FIXME/XXX highlighted bright red), cSpell
  (typo catch in code + docs), `problems.sortOrder: severity`,
  `yaml.schemas` (GitHub Actions / docker-compose / Kubernetes /
  Dependabot / Renovate / pre-commit auto-validation),
  `files.associations` (dotenv, Containerfile, tfvars, etc.)

#### Phase 16 — Continuous-learning mandate

- New rule `continuous-learning-mandate.md` — every
  Council-mediated task emits a learning candidate;
  cross-project patterns promote to global; contradicted rules
  flag for refresh
- Every rule + skill + agent acquired a `learning_hooks`
  section
- `/learn`, `/learn-eval`, `/evolve`, `/instinct-export`,
  `/instinct-import`, `/instinct-status` operator commands

#### Phase 17 — Workspace consistency

- Every workspace `.claude/` aligned to the scaffold template
  shape (`rules/`, `skills/`, `agents/`, `plans/`, `memory/`,
  `audits/`)
- Project-specific plans + memories landed in their owning
  workspace

### Changed

- Default agent model for coding / reviewing / planning agents
  is `opus` (per user preference + multi-stack quality bar)
- Touched-file coverage minimum raised to ≥ 90% (project ≥ 80%)
  per `extreme-lint-policy.md`
- Cognitive-complexity cap tightened to 10 (was 15 default)
- Function-lines cap tightened to 80 (was 200 default)
- Function-parameter cap tightened to 5 (was 7 default)
- File-lines cap tightened to 500 (was 1000 default)
- Cross-IDE settings: AWS credentials use macOS Keychain via
  `aws-vault` — no long-term keys on disk

### Removed

- `continuous-learning` v1 (superseded by v2)
- Hardcoded workspace / vendor / personal-project tokens from
  every global file
- Per-line lint suppressions across the entire global tree
- Stale plan files from `~/.claude/plans/` (relocated to
  workspaces or archived)
- Empty `session-env/*/` subdirectories; stale `ide/*.lock`
  files; `cache/changelog.md`; root `.DS_Store`,
  `.last-cleanup`, `stats-cache.json`, `mcp-needs-auth-cache.json`

### Fixed

- `bootstrap/verify.sh` Phase G silent-abort (hardcoded
  workspace tokens + `set -euo pipefail` propagating
  `grep`'s no-match exit) — replaced with the gitignored
  `.local/project-tokens` opt-in pattern + `set +e` guard
- VS Code drift items 1–13 in the live config (workspace trust,
  extension governance, git safety, telemetry, task safety,
  format-on-save, MCP gateway lockdown)
- Cursor settings parity with VS Code plus `cursor.*` governance

### Security

- Hook-enforced `no-discards`: discards, suppression directives,
  hardcoded credentials, weak crypto, raw `console.log`,
  merge-conflict markers rejected at edit time
- `dependency-vulnerabilities.md` CVE gate (MODERATE+ blocks)
- `license-allowlist-gate.md` SPDX allowlist + Trove
  cross-check
- `security-controls-org-wide.md` 5-layer non-bypassable
  enforcement pattern
- `secrets-management.md` — vault-first, never on disk in
  cleartext, atomic rotation, scrub-after-rotate
- `install-allowlist.md` — publisher allowlist for npm / VS
  Code / Cursor / MCP / Homebrew taps
- `docker-localhost-binding.md` — every host port `127.0.0.1:`
  prefixed on dev machines

---

## Versioning + commit policy

This rebuild followed **commit-policy: single** — all 17 phases
landed in ONE final commit at the end of the rebuild, with the
Phase-0 baseline (`8a07d9c`) as the rollback point. The final
commit is tagged `v1.0.0`.

Future releases follow `semver.md`:

- **MAJOR** for Council protocol changes, breaking template
  changes, breaking rule semantics
- **MINOR** for new rules / new skills / new agents / new
  commands / new templates
- **PATCH** for content deepening, bug fixes, typo corrections,
  doc clarifications

Each release ships with a CHANGELOG entry following Keep a
Changelog 1.1.0.

---

## Acknowledgements

The peppy-painting-parrot rebuild was driven by the user
directive: *"every plan or piece of work routed through Claude
should shock the world."* The standards cited across the global
rules + skills are property of their respective bodies —
[OWASP](https://owasp.org/), [NIST](https://www.nist.gov/),
[ISO / IEC](https://www.iso.org/),
[W3C](https://www.w3.org/), [IETF](https://www.ietf.org/) (RFCs),
[IFRS](https://www.ifrs.org/), [FASB](https://www.fasb.org/),
[ITIL](https://www.axelos.com/), and others.

[Unreleased]: https://github.com/Nmor/the-claude-council/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Nmor/the-claude-council/releases/tag/v1.0.0
