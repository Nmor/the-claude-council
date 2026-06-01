# `~/.claude/` Comprehensive Rebuild — Peppy Painting Parrot

> **commit-policy: single** — per user directive, ALL 17 phases land
> in ONE final commit at the end of the rebuild. No intermediate
> commits. The Phase-0 baseline commit (`8a07d9c`) is the rollback
> point; the final commit closes the rebuild. Every per-phase
> "Atomicity: one commit" note below is superseded by this top-level
> declaration — those notes are kept for documentation of the
> intended logical boundary but DO NOT trigger a `git commit` step.
> The user reviews the final commit candidate (full diff + complete
> verification block) before it lands.

## Context

The `~/.claude/` directory is the user's global configuration surface for Claude Code: 34 rules, 57 skills, 13 agents, 33 commands, 10 plans, and the Council protocol that orchestrates them. The scope of this rebuild extends beyond `~/.claude/` to ALL relevant global config locations (see "Scope" section). After 6+ months of accretion, four Explore-agent audits identified accumulated debt:

- **Orphans** — 13 stale files including 3 SECURITY-AUDIT-*.md at root, dangling symlinks, 264 empty session-env subdirs, 66 stale IDE locks, 234 KB stale cache.
- **Duplicates / shallowness** — `no-discards.md` + `no-silent-failures.md` + `no-silent-drops.md` share core "log + surface" content; `security.md` is a shallow umbrella; 25 rules under 50 LOC are stub-only; 4 `hooks.md` files (1 common + 3 lang) are all <40 LOC stubs.
- **Missing scope** — 27 rules should exist but don't (idempotency, observability, a11y, gdpr-ccpa, semver, ADR template, runbook template, circuit-breaker, etc.). Language subfolders lack `no-discards` extensions for Go/TS/Python.
- **Council weaknesses** — 8 enumerated protocol gaps (quick-bypass too easy, GO has no tiebreaker, no rollback protocol, no deprecation lifecycle, coverage target inconsistent 70/80/previous, etc.).
- **Domain coverage** — software-only. Zero skills for design (UX/UI), accounting, investment, finance, organization, management, infrastructure (cloud/network/datacenter), industrial (lean, six-sigma, supply chain), structural engineering, innovation (design thinking, TRIZ, lean startup), interpersonal (negotiation, comms), history/research, AI/ML.
- **Standards gaps** — no skills citing OWASP ASVS, ISO 27001, NIST 800-53, GDPR/CCPA/POPIA, PCI-DSS, SOC 2, IFRS/GAAP, ITIL 4, COBIT, IEEE SW Eng, WCAG 2.2 AAA.

The user's intended outcome: extreme-quality global rules + skills that adhere to international standards, span software AND non-software domains, with a Council protocol that closes its current bypass surfaces. End-state goal: "every plan or piece of work routed through Claude should shock the world."

User pre-approvals collected via AskUserQuestion before plan mode activated:

1. **Scan scope**: read every file in `rules/`, `skills/`, `agents/`, `commands/`, `plans/`, `hooks/`, `scripts/`, `contexts/`, `plugins/`, `memory/`, root `.md`/`.json` (skips `projects/`, `sessions/`, `file-history/` — 5.4 GB of auto-managed conversation logs not relevant to rebuild).
2. **Approval model**: bulk approve all 10 phases as one scope. Internal commit boundaries are for rollback safety, not approval gates.

Post-plan-v1 critiques returned by user (drove the v2 expansions below):

- **C1**: Language subfolders need expansion as new languages enter the skill matrix (Java, Ruby, Rust, Kotlin, Solidity, SQL, Bash, Markdown, YAML, Dockerfile, Terraform, HTML/CSS).
- **C2**: Council must be the **default** for every request / ask / comment on the coding environment. Close every bypass — no more `*`-prefix skip, no more "quick check" shortcut.
- **C3**: Council division completeness verified via web research against ISO 9001:2026, Team Topologies, C-suite org-design literature, 2026 engineering team role surveys, ISO 27001, ITIL 4. Result: 5 → 16 divisions (5 core + 11 extended), not the earlier 5 → 9.
- **C4**: Scope extends beyond `~/.claude/` — other global locations carry relevant config (see "Scope: All global config locations" below).
- **C5**: NO project-related files in global folders. Every project-bound file in `~/.claude/` is relocated to its workspace `<project>/.claude/`. New global rule codifies: every project auto-spawns its own `.claude/` with rules/skills/agents/plans on first significant work, and improves them through learning.

Post-plan-v2 critiques returned by user (drove the v3 expansions below):

- **C6**: **Verify-before-claim mandate** + **local testability mandate**. Every coding request must be testable locally; if not, Claude MUST generate an environment-setup request before writing code. Every claim ("done", "fixed", "shipped") must be preceded by verification. Strengthens existing `no-overclaim.md`.
- **C7**: **Docs + UX writing + UX review in every coding flow.** Council Divisions 7 (Product/UX & CX) and 16 (Communications & Documentation) auto-engage on EVERY coding task, not just user-facing UI work. UX writing covers microcopy, error messages, button labels, log messages, API response shapes. UX review covers user impact analysis.
- **C8**: **Inventory external Claude skills.** Audit `anthropics/skills`, `anthropics/claude-cookbooks`, `hesreallyhim/awesome-claude-code`, `VoltAgent/awesome-agent-skills` (1000+ cross-vendor skills), `alirezarezvani/claude-skills` (329 skills + 30 agents + 70 commands), `jeremylongshore/claude-code-plugins-plus-skills` (425 plugins, 2810 skills, 200 agents), `wshobson/agents`, `claudemarketplaces.com`. Selectively import high-value skills not yet present; respect Anthropic Agent Skills open standard (Dec 2025 spec).
- **C9**: **Deep repo review BEFORE any code on new/existing repos.** Expand `repo-setup-checklist.md` from 20-point security checklist to comprehensive **gap analysis**: coding standards, test coverage, build health, dependency CVEs, license posture, IaC hygiene, docs quality, secrets posture, error-handling patterns, observability, accessibility, performance budgets, deployment readiness. No claims, no edits, no commits until the gap analysis is logged.
- **C10**: **Publish global setup as a cross-IDE org-shareable repo.** Create a public/private GitHub repo (e.g. `bfree-claude-config` or org-name-dependent) so other engineers can `git clone` + bootstrap. Cross-IDE support: VS Code, Cursor, JetBrains (GoLand, IntelliJ IDEA, WebStorm, PyCharm — via official Anthropic JetBrains Marketplace plugin), Windsurf. Includes: bootstrap script, per-IDE integration shims, comprehensive README, versioning, CHANGELOG.
- **C11**: **Curated recommended extensions per IDE.** Phase 14 ships a curated extensions list per IDE (VS Code, Cursor, JetBrains family) with install scripts. Cross-references the install-allowlist rule so only verified publishers appear.
- **C12**: **Continuous learning baked into every artifact.** Council, agents, skills, and rules ALL have a learning loop. Every interaction produces a `learning-candidate` event; the assistant proposes refinements; user approves via AskUserQuestion; approved learnings update the artifact. Cross-project learnings get promoted from project-`.claude/` to global. Integrates with existing `continuous-learning-v2` skill.

## Scope: All global config locations (not just `~/.claude/`)

Locations that carry global Claude Code config or related tooling state:

| Path | Size | Role | In rebuild scope? |
|------|------|------|---|
| `~/.claude/` | 5.5 GB | Primary global config (rules, skills, agents, commands, plans, hooks, memory) | YES — primary |
| `~/.claude.json` | 40 KB | Claude Code root config (model, theme, MCP, settings) | YES — review + audit |
| `~/Library/Application Support/Code/User/settings.json` | 16 KB | VS Code global settings | Already audited 2026-05-23 (security posture sweep); confirm still aligned |
| `~/Library/Application Support/Cursor/User/settings.json` | 12 KB | Cursor global settings | Already audited; confirm still aligned |
| `~/Library/Application Support/Cursor/User/globalStorage` | 59 MB | Cursor extension data | Out of scope (per-extension state) |
| `~/.cursor/` | 1.3 GB | Cursor extensions + caches | Audited; extensions inventory done this session |
| `~/.vscode/` | 1.8 GB | VS Code extensions + caches | Audited; extensions inventory done this session |
| `~/Library/Application Support/Claude` | 11 GB | Claude Desktop app data | Out of scope (separate product) |
| `~/.gemini/` | 11 MB | Gemini CLI config | Out of scope (separate vendor) |
| `~/.codex/` | 44 MB | Codex CLI config | Out of scope (separate vendor) |
| `~/.aws/`, `~/.gitconfig`, `~/.zshrc` | varies | Shell + cloud aliases that may reference Claude | Spot-check only — no rewrites |
| Per-project `.claude/` dirs | varies | Workspace-scoped config | YES — Phase 1.5 + Phase 11 (project-bound principle) |

**Conclusion**: `~/.claude/` is the canonical home; `~/.claude.json` is the auxiliary root config that the rebuild must also audit. VS Code/Cursor settings were already hardened in the May 2026 security sweep — Phase 0 of this rebuild includes a re-verification of those.

---

## Final Targets (post-rebuild)

| Surface | Before | After | Delta |
|---------|--------|-------|-------|
| Rules in `common/` | 34 | 49 + 12 deepened | +15 net new (after consolidations) |
| Language rule subfolders | 9 | 21 | +12 (java, ruby, rust, kotlin, solidity, sql, bash, markdown, yaml, dockerfile, terraform, html-css) |
| Rules in language subfolders | 27 | ~80 | +53 (deepen existing + populate 12 new langs) |
| Skills | 57 | ~99 | +42 net (48 new − 6 consolidated; +3 finance/investment per user) |
| Agents | 13 | 30 | +16 new + 1 model upgrade |
| Council Divisions | 5 | **16** (5 core + 11 extended) | +11 — verified vs C-suite literature, ISO 9001:2026, Team Topologies, 2026 engineering org surveys |
| Council bypass surfaces | 4 | 0 | Every bypass eliminated — Council is the default mode |
| Standards-cited references | ~0 | every new rule/skill | International standards baseline |
| Orphan files | 13 | 0 | Cleaned |
| Project-specific files in `~/.claude/` | 8+ | 0 | Relocated to respective workspace `.claude/` dirs |
| Workspace `.claude/` consistency | 4/5 with content; 1 missing | 5/5 with standardized scaffold | Unvamp gets `.claude/`; minimal repos expanded |
| Project-bound artifact generation | none | global rule: every project auto-spawns `.claude/` on first significant work | New `~/.claude/rules/common/project-scoped-artifacts.md` |
| Disk size | 5.5 GB | ~5.2 GB | -300 MB (file-history prune + caches) |

---

## Council Structure (post-rebuild — 16 divisions, verified)

**Verification basis** (web-researched 2026-05-26): C-suite executive structure literature (Cowen Partners, IE Business School, Workhuman, OneDirectory, HBS), Microsoft's 2026 7-division restructure, ISO 9001:2026 organizational integration with sustainability/ESG, Team Topologies (Skelton & Pais — 4 team archetypes), 2026 engineering team role surveys (Cortex, Platform Engineering Community, Microsoft Learn). Sources cited in "Sources" at the end of this plan.

### Core Five (engaged on EVERY task — never bypassed)

| # | Division | Lead Agents | Scope |
|---|----------|-------------|-------|
| 1 | **Architecture & Planning** | architect (opus), planner (opus) | System design, ADRs, phased delivery, trade-off analysis, build-vs-buy |
| 2 | **Implementation & Build** | build-error-resolver, go-build-resolver, refactor-cleaner, database-reviewer, **infra-reviewer (new)** | Code, builds, schema, IaC, CI/CD |
| 3 | **Quality & Review** | code-reviewer, go-reviewer, python-reviewer, **java-reviewer (new)**, **mobile-reviewer (new)**, doc-updater | Cross-language review, naming, complexity, idioms |
| 4 | **Security** | security-reviewer (upgrade to opus) | OWASP Top 10, secrets, auth, dependency CVEs, threat modeling |
| 5 | **Testing & QA** | tdd-guide, e2e-runner, **performance-reviewer (new)** | TDD, coverage, E2E, load testing, perf budgets |

### Extended Eleven (auto-fire on relevance signals — listed in Council weight order)

| # | Division | Lead Agent | Auto-fires when... |
|---|----------|------------|-------------------|
| 6 | **Compliance & Legal** | **compliance-reviewer (new, opus)** | PII / GDPR / CCPA / HIPAA / PCI-DSS / SOC 2 / payments / licensing / contracts / IP |
| 7 | **Product, UX & Customer Experience** | **ux-reviewer (new)**, **accessibility-reviewer (new, opus)** | UI / view / page files; Figma; user-facing copy; WCAG / a11y |
| 8 | **Operations & Reliability** | **ops-reviewer (new)** | Runbooks, SLO, on-call, deploy, post-incident, monitoring |
| 9 | **Data & Analytics** | **data-reviewer (new)** | Event taxonomy, schema, analytics pipelines, PII flows |
| 10 | **Finance & FinOps** | **finance-reviewer (new)** | Cloud cost, unit economics, ROI, budget impact, pricing |
| 11 | **Risk Management** | **risk-reviewer (new)** | BCP/DR, scenario planning, blast-radius assessment, change risk; distinct from Security (which is technical exploit-class) |
| 12 | **Strategy & Innovation** | **strategy-reviewer (new)** | New features, market positioning, R&D, competitive scan, deprecation |
| 13 | **People & Culture** | **people-reviewer (new)** | Work that affects team comp, knowledge mgmt, hiring criteria, dev experience |
| 14 | **Sustainability & ESG** | **esg-reviewer (new)** | Cloud carbon, ethical sourcing, social impact, ESG reporting (ISO 9001:2026 + ESG anchor) |
| 15 | **Ethics & Responsible AI** | **ai-ethics-reviewer (new, opus)** | AI/ML work, model selection, bias, fairness, AI safety, dataset provenance |
| 16 | **Communications & Documentation** | doc-updater (existing) + **comms-reviewer (new)** | Public-facing artifacts, marketing copy, release notes, crisis comms, API docs |

### Council operating principle (post-rebuild)

**Council is the default mode for every interaction, every request, every comment on the coding environment.** No bypasses:

- `*` prefix no longer skips Council — it skips ONLY the prompt-improver clarification step. Council still convenes.
- "Quick Council Check" mode deleted entirely. Every task goes through full Phase 0-1-2-3.
- The "abbreviated" variant for trivial changes is preserved as a SPEED option (2-3 sentences per division) but is still mandatory — never zero divisions.
- Bypass attempts are logged to `~/.claude/audits/bypass-log.jsonl` with timestamp + justification + user-id.

Trigger model:

- **Core Five always engage.** They write minimum 2 sentences each on every task; no exceptions.
- **Extended Eleven auto-fire on signals.** File patterns, keywords, change scope, plan-tier impact — each Division has its own trigger ruleset in `~/.claude/rules/common/council-triggers.md` (new rule, Phase 9).
- **Any Division can request convening of any other** mid-discussion if scope crosses their domain (e.g., Architecture identifies a regulatory question → Compliance Division engages).
- **Tiebreaker rule**: Architecture has casting vote on technical ties. Security has veto on unresolved BLOCKER. Compliance has veto on unresolved regulatory finding. Ethics has veto on AI safety finding.

## Language Coverage (post-rebuild)

Current language subfolders (9): common, cpp, csharp, dart, golang, lua, python, swift, typescript.

**New language subfolders (12)** to populate from scratch with baseline 4 rules each (coding-style.md, security.md, testing.md, patterns.md) + per-language no-discards / hooks extensions where applicable:

| Subfolder | Why | Authoritative standards |
|-----------|-----|------------------------|
| `rules/java/` | Spring Boot ecosystem in BFREE (lago-api is Ruby; many BFREE services are Java) | Oracle Java SE specs, Effective Java (Bloch), JSR-303 validation |
| `rules/ruby/` | Lago is Ruby on Rails; BFREE has Ruby code | Ruby Style Guide (rubocop), Rails Guides |
| `rules/rust/` | No current Rust but increasingly used (Tauri apps, Cloudflare workers) | Rust API Guidelines, Rustonomicon, RFC track |
| `rules/kotlin/` | Mobile + Spring alternative | Kotlin Coding Conventions, Effective Kotlin |
| `rules/solidity/` | Smart contracts; user does Web3 / NordPass-adjacent work via MetaMask | Solidity docs, OpenZeppelin patterns, SWC Registry |
| `rules/sql/` | DDL/DML beyond ORM | SQL:2023 standard, PostgreSQL/MySQL/SQLite specifics |
| `rules/bash/` | Shell scripts everywhere (deploy, infra, hooks) | Bash Reference Manual, ShellCheck, Google Shell Style Guide |
| `rules/markdown/` | Documentation lives here | CommonMark spec, markdownlint MD-rules |
| `rules/yaml/` | Compose, K8s, CI configs | YAML 1.2.2 spec |
| `rules/dockerfile/` | Production images | Dockerfile reference, OCI image spec, Docker best practices |
| `rules/terraform/` | IaC | HCL spec, Terraform style conventions, Anton Babenko modules |
| `rules/html-css/` | Frontend specifics | HTML Living Standard, CSS specifications (CSS Working Group), WCAG |

**Total post-rebuild**: 21 language subfolders, ~80 language-specific rule files.

---

## Execution Plan (12 phases, dependency-ordered)

Sequencing principle: **anything that reads a file is updated before files are deleted or renamed.** Phases run on git branches off a Phase-0 snapshot; each phase has a verification gate before merging to main.

### Phase 0 — Safety Net + Git Baseline

**Prerequisite for everything else.** Currently `~/.claude/` is NOT a git repo.

Steps:
1. Write `.gitignore` excluding `projects/`, `sessions/`, `session-env/`, `telemetry/`, `statsig/`, `downloads/`, `file-history/`, `*.lock`, `*.tmp`, `.DS_Store`, `mcp-needs-auth-cache.json`, `stats-cache.json`.
2. `git init ~/.claude/` + initial `git add -A` + commit `"snapshot: pre-rebuild baseline"`.
3. Confirm size of `.git/` is reasonable (should be <500 MB given gitignore excludes the 5+ GB conversation tree).
4. Branch: `git checkout -b rebuild/phase-1-orphans`.

**Risk**: `.gitignore` MUST be in place before `git add -A` or the 5.5 GB tree gets staged. Phase 0 verification: `du -sh ~/.claude/.git/` must report <500 MB.

**Rollback**: `git checkout main && git branch -D rebuild/phase-*` reverts any phase.

### Phase 1 — Orphan Cleanup + Project Relocation (Mechanical + judgment, ~1.5 hours)

**Two-pass cleanup**: orphan pass first (1A), then project-relocation pass (1B).

#### Phase 1A — Orphan Cleanup (mechanical, ~30 min)

13 items, all confirmed zero inbound references.

| Target | Action |
|--------|--------|
| `~/.claude/SECURITY-AUDIT-2026-05-23*.md` (3 files, 24 KB) | Move to `~/.claude/audits/archive/2026-05-23/` |
| `~/.claude/.DS_Store` + `.last-cleanup` | Delete |
| `~/.claude/debug/latest` (dangling symlink) | Delete |
| `~/.claude/cache/changelog.md` (234 KB) | Delete (auto-fetched on demand) |
| `~/.claude/stats-cache.json` (3 months stale) | Delete |
| `~/.claude/session-env/*/` (264 empty dirs) | `find session-env -type d -empty -delete` |
| `~/.claude/ide/*.lock` (66 stale, keep last 3) | Delete files older than 7 days |
| `~/.claude/sessions/2026-04-*.tmp` (53 files) | Delete |
| `~/.claude/plans/tasks/phases-1-2-3-5-6-7-8-9-10-tasks.md` (empty) | Delete |
| Stale plan files | Move to `~/.claude/plans/archive/` |
| `~/.claude/file-history/` (262 MB) | Prune UUIDs whose paired session is gone (audit-then-trim) |

Pre-deletion link-check: `grep -r "SECURITY-AUDIT\|changelog.md\|stats-cache\|session-env\|\.lock" ~/.claude/rules ~/.claude/skills ~/.claude/CLAUDE.md` must return zero results.

**Atomicity**: One commit. **Verification**: `du -sh ~/.claude/` drops ~270 MB.

**Phase 1A task list** (per `plan-task-breakdown.md`):

| # | Task | Verification |
| --- | --- | --- |
| 1A.1 | Confirm `~/.claude/` is NOT a git repo; inventory disk usage | `du -sh ~/.claude/` reports baseline |
| 1A.2 | Write `.gitignore` excluding heavy auto-managed runtime dirs | `git status --short` shows only config surface |
| 1A.3 | `git init` + create baseline commit `8a07d9c` | `git log --oneline -1` shows snapshot |
| 1A.4 | Verify `.git/` size < 500 MB | `du -sh ~/.claude/.git/` = 1.9 M |
| 1A.5 | Branch `rebuild/phase-1-orphans` | `git branch` shows current branch |
| 1A.6 | Pre-deletion link-check across rules/skills/agents/CLAUDE.md | Zero inbound refs to orphan filenames |
| 1A.7 | Update `.gitignore` to track `audits/archive/` | History preserved on SECURITY-AUDIT moves |
| 1A.8 | `git mv SECURITY-AUDIT-2026-05-23.md` to `audits/archive/2026-05-23/` | Staged rename in `git status` |
| 1A.9 | `git mv SECURITY-AUDIT-2026-05-23-EXTENDED.md` to archive | Same |
| 1A.10 | `git mv SECURITY-AUDIT-2026-05-23-PHASE3-DEPS.md` to archive | Same |
| 1A.11 | Delete root orphans (`.DS_Store`, `.last-cleanup`, `stats-cache.json`, `mcp-needs-auth-cache.json`, `history.jsonl`) | `ls` confirms removed |
| 1A.12 | Delete `debug/latest` dangling symlink + `cache/changelog.md` | `ls` confirms removed |
| 1A.13 | Delete untracked empty `plans/tasks/phases-1-2-3-5-6-7-8-9-10-tasks.md` | `ls` confirms removed |
| 1A.14 | Prune 257 empty `session-env/*/` subdirs | `find … -type d -empty \| wc -l` = 0 |
| 1A.15 | Prune 64 stale `ide/*.lock` files (>7 days) | ide files 72 → 8 |
| 1A.16 | Prune `sessions/*.tmp` older than 30 days | `find sessions -name '*.tmp' \| wc -l` = 0 |
| 1A.17 | Identify file-history orphan UUIDs not paired with any session | 107 orphans found |
| 1A.18 | Confirm current session UUID is NOT in orphan set | grep returns "safe" |
| 1A.19 | Prune 107 orphan file-history UUIDs | 117 → 10 dirs, 38378 → 9850 files |
| 1A.20 | Author new global rule `plan-execution-progress.md` | File exists; pure guidance |
| 1A.21 | Author new global rule `plan-task-breakdown.md` | File exists; pure guidance |
| 1A.22 | Author new global rule `plan-completion-before-push.md` | File exists; pure guidance |
| 1A.23 | Sweep three new rules; strip plan-specific content | Grep for tokens returns clean |
| 1A.24 | `git add -A` + commit (atomic with Phase 1.5) | `git log -1` shows the commit |

Status: 1A.1–1A.23 complete; 1A.24 pending (waits for Phase 1.5).

#### Phase 1.5 — Global-Rule Purity Sweep (NEW, ~1 hour)

**Why this phase exists**: Per user directive (verbatim):
*"Global is global guide and not project specific"*. The existing global rules under
`rules/common/` and skills under `skills/` contain project-specific
names, session dates, and incident-specific examples that should
live in workspace `.claude/` files, not global. This phase strips
every project-specific reference from global, relocating
project-specific rules out of global into their respective workspace
`.claude/` dirs.

**Task list**:

| # | Task | Verification |
| --- | --- | --- |
| 1.5.1 | Broad grep across `rules/common/`, `skills/`, `agents/`, `commands/`, `CLAUDE.md`, `docs/`, `contexts/` for project tokens + session-specific dates | Complete offender list compiled |
| 1.5.2 | Strip project refs from `rules/common/proper-fixes-first.md` | Grep returns clean |
| 1.5.3 | Strip "workspace cross-reference" section from `rules/common/no-local-fs.md` | Grep returns clean |
| 1.5.4 | Strip project list from `rules/common/docker-localhost-binding.md` | Grep returns clean |
| 1.5.5 | Strip project example from `rules/common/dependency-vulnerabilities.md` | Grep returns clean |
| 1.5.6 | Strip "workspace cross-references" section from `rules/common/updated-frameworks.md` | Grep returns clean |
| 1.5.7 | Strip project paths from `rules/common/deploy-failures-become-checks.md` | Grep returns clean |
| 1.5.8 | Strip project paths from `rules/common/license-allowlist-gate.md` | Grep returns clean |
| 1.5.9 | Relocate `rules/common/bfree-africa-git-identity.md` to BFREE workspace `.claude/rules/` | `git rm` from global; file lives in workspace |
| 1.5.10 | Strip project paths from root `CLAUDE.md` (lines 26, 31) | Generic `<workspace>` placeholder used |
| 1.5.11 | Strip project refs from `skills/error-shape-contract-testing/SKILL.md` | Grep returns clean |
| 1.5.12 | Strip project refs from `skills/calendar-provider/SKILL.md` | Grep returns clean |
| 1.5.13 | Strip project refs from `skills/provider-research/SKILL.md` | Grep returns clean |
| 1.5.14 | Strip project refs from `skills/web-push-notifications/SKILL.md` | Grep returns clean |
| 1.5.15 | Re-grep across `~/.claude/` for project tokens | Zero matches in rules/skills/agents/CLAUDE.md/docs/contexts |
| 1.5.16 | `git add -A` + commit (atomic with 1A) | `git log -1` shows the commit |

**Atomicity**: Phase 1A and Phase 1.5 land in a single commit since they share the same underlying directive (clean foundation before relocation).

#### Phase 1B — Project-File Relocation (judgment, ~1 hour)

Confirmed project-specific contamination in `~/.claude/` (no project-bound content allowed per C5):

| Source (global) | Destination (workspace) | Type |
|-----------------|-------------------------|------|
| `~/.claude/plans/floofy-roaming-dream.md` (Reback 12-month plan) | `/Users/APPLE/Reback/.claude/plans/` | plan |
| `~/.claude/plans/floofy-roaming-dream-agent-a60fffb4a74868e60.md` (Reback verification report) | `/Users/APPLE/Reback/.claude/plans/` | plan |
| `~/.claude/plans/ii-fold-doc-updates-gleaming-bentley.md` (StewardBot calendar/alarms plan) | `/Users/APPLE/stewardbot/.claude/plans/` | plan |
| `~/.claude/plans/stateless-wandering-conway.md` (Unvamp v3 plan) | `/Users/APPLE/Unvamp/.claude/plans/` (create dir) | plan |
| `~/.claude/plans/typed-mapping-wreath.md` (VMS+Twilio+Xcally — research owner before move) | TBD per project ownership grep | plan |
| `~/.claude/plans/bright-exploring-eich.md` (PR #48 post-merge — research owner) | TBD per repo grep | plan |
| `~/.claude/projects/-Users-APPLE/memory/feedback_unvamp_scale_first.md` | `/Users/APPLE/Unvamp/.claude/memory/` | memory |
| `~/.claude/projects/-Users-APPLE/memory/feedback_no_phase_markers.md` (Unvamp-specific) | `/Users/APPLE/Unvamp/.claude/memory/` | memory |
| `~/.claude/projects/-Users-APPLE/memory/project_unvamp.md` | `/Users/APPLE/Unvamp/.claude/memory/` | memory |
| `~/.claude/projects/-Users-APPLE/memory/reference_unvamp_maps.md` | `/Users/APPLE/Unvamp/.claude/memory/` | memory |
| `~/.claude/projects/-Users-APPLE/memory/feedback_figma_designs.md` (likely Unvamp — verify) | TBD | memory |
| `~/.claude/projects/-Users-APPLE/memory/feedback_keep_moving.md` (Unvamp behavioral) | `/Users/APPLE/Unvamp/.claude/memory/` | memory |

**Stay global** (universal preferences):
- `feedback_pnpm.md`, `feedback_no_half_finishes.md`, `feedback_proper_fixes_only.md`, `feedback_web_quality.md`, `feedback_react_sonarlint.md` — apply across all projects.

**Plan file `peppy-painting-parrot.md` stays global** — it concerns the global config rebuild itself.

For each moved file:
1. `git mv` (preserves history) within the workspace's git repo after copying.
2. Update `MEMORY.md` index in BOTH global and workspace memory dirs.
3. Update any workspace `CLAUDE.md` that references the file.
4. Cross-reference grep: confirm zero global rules/skills/agents still point to the moved path.

**Atomicity**: One commit per workspace repo + one commit in `~/.claude/` for the global-side cleanup. **Verification**: `find ~/.claude -name '*unvamp*' -o -name '*reback*' -o -name '*stewardbot*' -o -name '*bfree*'` returns only the rebuild plan file (peppy-painting-parrot.md) and shared infrastructure files (none should match).

### Phase 2 — Rule Consolidations (Surgical, ~2 hours)

**Filename preservation** strategy: keep canonical names alive; replace removed siblings with one-line redirect stubs (1 phase) before final deletion in Phase 10.

**Sub-step 2a**: Merge `no-silent-failures.md` + `no-silent-drops.md` content into
`no-discards.md` (the most-cited, hook-enforced canonical name). Leave the other two
as single-line redirect stubs of the form shown below. Eight files reference the
deprecated names — they all continue working via stub. Workspace ripple (Phase 8)
updates those references.

```markdown
> Consolidated into [no-discards.md](no-discards.md). Migrate references.
```

**Sub-step 2b**: Promote `security.md` (currently 48 LOC umbrella shell) to a real OWASP Top 10 + ASVS-mapped umbrella. Strip overlapping security content from `api-design.md`. `secrets-management.md` and `security-controls-org-wide.md` stay as deep-dive sister files referenced by the new umbrella.

**Sub-step 2c**: Merge `golang/hooks.md` + `typescript/hooks.md` + `python/hooks.md` (all <40 LOC) into a deepened `common/hooks.md` with per-language subsections. Replace the three language-subfolder files with 1-line stubs pointing to common.

**Sub-step 2d**: Deepen 25 shallow rules. Each gets: rationale section, anti-patterns, concrete examples, verification checklist, cross-references. Files: `common/testing.md`, `common/api-design.md`, `common/patterns.md`, `common/git-workflow.md`, `common/security.md`, `common/agents.md`, `common/performance.md`, plus all language-specific `security.md`/`testing.md` stubs.

**Atomicity**: 4 commits (one per sub-step). **Verification**: link-check after each sub-step; all `[[name]]` and `rules/common/X.md` paths resolve.

### Phase 3 — 27 New Rules (Additive, ~4 hours)

All in `rules/common/` except per-language no-discards extensions. Batched by cluster, each batch = 1 commit:

- **Batch A — Resilience** (5): `idempotency.md`, `error-codes.md`, `circuit-breaker.md`, `graceful-degradation.md`, `rate-limiting.md`
- **Batch B — Observability** (4): `observability.md`, `log-levels.md`, `audit-logging.md`, `runbook-template.md`
- **Batch C — API/Schema** (3): `api-versioning.md`, `schema-evolution.md`, `contract-testing.md`
- **Batch D — Lifecycle** (5): `semver.md`, `feature-flags.md`, `dependency-pinning.md`, `adr-template.md`, `deprecation-lifecycle.md`
- **Batch E — Compliance** (5): `a11y.md` (WCAG 2.2 AA+), `i18n.md`, `data-retention.md`, `gdpr-ccpa.md`, `code-of-conduct.md`
- **Batch F — Dev process** (3): `documentation-requirements.md`, `local-dev-setup.md`, `no-ambient-globals.md`
- **Batch G — Per-language** (3): `golang/no-discards.md`, `typescript/no-discards.md`, `python/no-discards.md`

Each new rule cites the applicable international standard with section number (WCAG 2.2 §1.4.3, OWASP ASVS 4.0 §2.1, RFC 9110 §9.3.1, ISO/IEC 27001:2022 Annex A.8.7, etc.). After each batch, `auto-skills.md` is updated to reference the new rules where file-type triggers apply.

**Atomicity**: 7 batch commits. **Verification**: every new rule passes the SKILL.md-style template check (purpose / standards / when-to-fire / patterns / anti-patterns / verification / cross-references).

### Phase 4 — Skill Consolidations (Medium risk, ~2 hours)

| Action | Source | Target |
|--------|--------|--------|
| Delete | `continuous-learning` (v1) | `auto-skills.md` line 251 removed |
| Fold | `strategic-compact` | One-paragraph note in `verification-loop` |
| Merge | `frontend-design` → `frontend-patterns` | Keep `frontend-patterns/`, expand with design section |
| Fold | `error-shape-contract-testing` | Section in `api-design` skill |
| Fold | `content-hash-cache-pattern` | Section in `backend-patterns` |
| Fold | `fire-and-forget` | Section in `backend-patterns` |
| Fold | `regex-vs-llm-structured-text` | Section in `cost-aware-llm-pipeline` (or new `ai-ml-patterns`) |

Each delete + auto-skills.md update is ONE atomic commit (never split — risks a window where `auto-skills.md` references a non-existent skill).

### Phase 5 — 45 New Domain Skills (Deep content, ~40 hours)

**Content depth**: every SKILL.md follows the mandatory template (Purpose / Standards Cited / When to Fire / Core Patterns / Anti-Patterns / Verification Checklist / Cross-References). NO shallow stubs. The 92-LOC stubs identified in Phase 1 audit are the floor we must exceed.

**Standards citation format**: `[ORG] [SPEC] [VERSION] §[SECTION]: [TITLE]`. Examples:
- `WCAG 2.2 §1.4.11: Non-text Contrast`
- `OWASP ASVS 4.0.3 §2.2.1: General Authenticator Requirements`
- `ISO/IEC 27001:2022 Annex A.8.7: Protection against malware`
- `NIST SP 800-53 Rev 5 AC-2: Account Management`
- `RFC 9110 §9.3.1: GET`
- `IFRS 15 §31: Performance Obligations`
- `ITIL 4 §4.5.1: Change Enablement`

**Domain batches** (13 commits):

| Domain | New skills | Std anchors |
|--------|-----------|------------|
| Accessibility (2) | wcag-accessibility, accessible-forms | WCAG 2.2, ARIA 1.2, Section 508 |
| Security & Compliance (5) | owasp-asvs, gdpr-ccpa-compliance, pci-dss-patterns, iso27001-controls, soc2-readiness | OWASP ASVS, GDPR Art 5/15-22, PCI-DSS v4, ISO 27001, SOC 2 TSC |
| Finance & Accounting (3) | bookkeeping-patterns, ifrs-gaap-reporting, fp-and-a | IFRS, US GAAP (ASC), AICPA |
| Investment (6) | valuation-models, portfolio-theory, investment-research, investor-due-diligence, financial-analyst, stock-broker | CFA Institute body of knowledge, MPT, FINRA Series 7/63/65/79, MiFID II, SEC Rule 15c3-5 |
| AI/ML (5) | ml-model-selection, mlops-patterns, rag-design, prompt-engineering, fine-tuning-workflows | NIST AI RMF, Anthropic Cookbook, MLOps principles |
| Design (UX/UI) (3) | ux-research, interaction-design, design-systems | ISO 9241-210, Nielsen heuristics, IDEO methods |
| Org/Management (4) | org-design, okr-framework, hiring-process, performance-management | Team Topologies, Doerr OKR, Lazlo Bock hiring research |
| Infrastructure (3) | cloud-architecture, network-patterns, datacenter-ops | AWS/GCP/Azure Well-Architected, BICSI, Uptime Institute tiers |
| Industrial (3) | lean-manufacturing, six-sigma, supply-chain-patterns | Toyota Production System, ASQ Six Sigma, APICS CPIM/CSCP |
| Structural Engineering (2) | structural-basics, mep-coordination | Eurocode/AISC/ACI, ASHRAE, ISO 19650 (BIM) |
| Innovation (3) | design-thinking, triz-patterns, lean-startup | Stanford d.school, TRIZ contradiction matrix, Lean Startup |
| Interpersonal (2) | negotiation-patterns, communication-patterns | Fisher/Ury "Getting to Yes", Pyramid Principle (Minto) |
| History/Research (2) | research-methods, historical-analysis | Chicago Manual, APA, primary-source critique frameworks |

After all 13 batches: one large `auto-skills.md` update commit wiring file-type triggers + cross-cutting triggers for the new skills.

### Phase 6 — Agent Roster Expansion (Low risk, ~1.5 hours)

**One change to existing**:
- `security-reviewer.md`: `model: sonnet` → `model: opus` (OWASP/CVSS/auth-bypass reasoning warrants opus; verified `model: opus` is the exact valid string used by `architect.md` and `planner.md`).

**9 new agents** in `~/.claude/agents/`:

| Agent | Model | Division | Role |
|-------|-------|----------|------|
| `compliance-reviewer` | opus | Div 6 (Compliance) | GDPR, PCI-DSS, HIPAA, regulatory impact |
| `accessibility-reviewer` | opus | Div 7 (UX) | WCAG 2.2 + ARIA audit |
| `ux-reviewer` | sonnet | Div 7 (UX) | Information architecture, usability, copy |
| `ops-reviewer` | sonnet | Div 8 (Operations) | Runbooks, SLO, on-call, post-incident |
| `data-reviewer` | sonnet | Div 9 (Data) | Schema governance, event taxonomy, PII |
| `infra-reviewer` | sonnet | Div 2 (Implementation) | Dockerfile, Terraform, CI/CD |
| `performance-reviewer` | sonnet | Div 5 (Testing) | Profiling, load testing, perf budgets |
| `java-reviewer` | sonnet | Div 3 (Quality) | Java/Spring code review |
| `mobile-reviewer` | sonnet | Div 3 (Quality) | Swift + Dart/Flutter review |

Each agent file: standard frontmatter (`name`, `description`, `tools`, `model`) + system prompt section detailing scope, division, when-to-fire, what-not-to-do.

**Atomicity**: One commit (no interdependencies).

### Phase 7 — Council Protocol Overhaul (High blast radius, ~3 hours)

Single atomic commit to `/Users/APPLE/.claude/CLAUDE.md` + two new rule files (`council-default.md`, `council-triggers.md`). All 8 weaknesses closed + **16-division** Council adopted (5 core + 11 extended).

**Changes**:

1. **Adopt 16 divisions** per the Council Structure section above. Each gets its agents, when-to-engage signals, persona section, veto rules. CLAUDE.md grows from 55 KB to ~110 KB.
2. **Council is default — no bypasses**:
   - Delete "Quick Council Check" mode entirely. Replace with "Abbreviated Council Check" — same divisions, terser output (2-3 sentences each minimum) but still mandatory.
   - `*` prefix no longer skips Council — it only skips prompt-improver clarification.
   - Every interaction (request, ask, comment on coding environment) routes through Council. No exceptions.
3. **Tiebreaker matrix**:
   - **Architecture (Div 1)**: casting vote on technical ties.
   - **Security (Div 4)**: veto on unresolved technical-exploit BLOCKER.
   - **Compliance (Div 6)**: veto on unresolved regulatory finding (GDPR/PCI/HIPAA/SOC2).
   - **Ethics & Responsible AI (Div 15)**: veto on AI safety / fairness / bias finding.
   - **Risk Management (Div 11)**: veto on changes whose blast radius exceeds defined scope.
4. **Phase 0 online research = mandatory for ALL work**, not just external integrations. Internal refactors / IaC / migrations / data work all cite primary-source docs (RFC, ISO, IFRS, NIST, WCAG, etc.) before first edit.
5. **Post-impl review time gate**: All boxes ticked WITHIN 24 hours of merge OR before next deploy, whichever is sooner.
6. **Rollback Protocol section** added: explicit steps (snapshot id → revert path → verification → comms) with named owner per env.
7. **Deprecation Lifecycle section** added: announce → soft-deprecate (warnings) → hard-deprecate (errors) → remove. Each step has a calendar minimum.
8. **Bypass audit trail**: every Council-affecting bypass attempt logs to `~/.claude/audits/bypass-log.jsonl` with timestamp, justification, prompt, session-id.
9. **Coverage target standardized at 80%** everywhere. The 70/80/previous inconsistency removed.
10. **Council-by-default rule** codified as `~/.claude/rules/common/council-default.md` (NEW Phase 3 rule, referenced from CLAUDE.md): "The Council convenes on EVERY interaction. The 5 core divisions always speak; the 11 extended divisions auto-fire per trigger ruleset in `council-triggers.md`. No request, comment, or coding-environment interaction bypasses this."
11. **Council-triggers ruleset** codified as `~/.claude/rules/common/council-triggers.md` (NEW): per-division file-pattern / keyword / scope triggers for the 11 extended divisions. Each trigger has explicit signals (file glob, keyword regex, plan-tier impact, change scope) and a default engagement weight.
12. **Council weights** documented: when divisions disagree, the weight table (Architecture casts technical tie; Security/Compliance/Ethics/Risk hold veto) is followed, then user escalation if still deadlocked.

**Atomicity**: Single commit for all CLAUDE.md changes + the two new rule files. Do NOT split — partial Council protocol state causes incoherent behavior during sessions that load mid-update.

**Verification**: Synthetic Council task ("Design a multi-tenant rate-limiting feature for a REST API serving 10k req/s with idempotency and audit-logging requirements") run AFTER commit. Pass criteria: all 5 core divisions speak; extended divisions 6 (compliance — rate-limit triggers GDPR Art 32), 8 (operations — SLO impact), 9 (data — audit log schema), 11 (risk — abuse scenarios), 16 (comms — public API change notes) auto-fire; cite primary sources (RFC 6585, OWASP ASVS); no broken file refs; bypass attempt is logged.

### Phase 8 — Workspace Ripple Sweep (Medium risk, ~1.5 hours)

Workspace files in separate repos that reference now-changed global rules:

| Workspace | File | Updates needed |
|-----------|------|----------------|
| Reback | `/Users/APPLE/Reback/CLAUDE.md` | None — only references `no-discards.md` (preserved) + `sonarlint-checks.md` (untouched) |
| Unvamp | `/Users/APPLE/Unvamp/CLAUDE.md` | None — only references `no-discards.md` + `auto-skills.md` + `sonarlint-checks.md` |
| StewardBot | `/Users/APPLE/stewardbot/CLAUDE.md` lines 10, 16 | Update reference list to point to `no-discards.md` umbrella; remove standalone mentions of `no-silent-failures.md` and `no-silent-drops.md` |
| BFREE-Africa | `/Users/APPLE/BFREE-Africa/.claude/CLAUDE.md` | Full re-scan |
| BFREE lago-api | `/Users/APPLE/BFREE-Africa/lago-api/CLAUDE.md` (if present) | Full re-scan |

Each workspace edit is a separate commit in that workspace's repo. Take a `git stash` checkpoint in each repo before editing.

### Phase 9 — Verification (End-to-end, ~2 hours)

**Automated structural verification** (runs after every phase):

```bash
# 1. Inbound link integrity — every rule path referenced exists
grep -rh "rules/common/\|rules/golang/\|rules/typescript/\|rules/python/" \
  ~/.claude/rules ~/.claude/skills ~/.claude/CLAUDE.md ~/.claude/agents 2>/dev/null \
  | grep -oE '(rules/(common|golang|typescript|python|cpp|csharp|dart|lua|swift)/[a-z-]+\.md)' \
  | sort -u \
  | while read p; do [ -f ~/.claude/$p ] || echo "BROKEN: $p"; done

# 2. Skill references in auto-skills.md exist
grep -oE '\*\*[a-z][a-z0-9-]+\*\*' ~/.claude/rules/common/auto-skills.md \
  | tr -d '*' | sort -u \
  | while read s; do [ -d ~/.claude/skills/$s ] || echo "BROKEN SKILL: $s"; done

# 3. Every agent file has the required frontmatter (name, description, tools, model)
for f in ~/.claude/agents/*.md; do
  head -10 "$f" | grep -qE "^name:|^description:|^tools:|^model:" || echo "INCOMPLETE: $f"
done
```

**Synthetic Council task**: After Phase 7, submit "Design a multi-tenant rate-limiting feature for a REST API" and verify:
- All 9 divisions weigh in
- Phase 0 cites primary-source docs (RFC 6585 for 429, Redis pattern docs, etc.)
- New rules referenced by name: `idempotency.md`, `rate-limiting.md`, `api-versioning.md`, `observability.md`
- Post-impl review time-gate acknowledged

**Agent load test**: After Phase 6, dispatch `security-reviewer` on a known-vulnerable snippet to verify opus model loaded correctly.

### Phase 10 — Final Cleanup (Low risk, ~30 min)

After workspace ripple confirmed (Phase 8):
1. Delete stub redirects (`no-silent-failures.md`, `no-silent-drops.md`) — their references are migrated.
2. Delete `continuous-learning` v1 dir (entry removed from auto-skills.md in Phase 4).
3. Final link-check pass across all surfaces.
4. Merge all phase branches to main.
5. Tag: `git tag v1.0.0` (first public release per semver — this is
   the initial stable public surface, not a rebuild over an earlier
   published v1).
6. Write final state report to `~/.claude/audits/rebuild-2026-05-26-final-report.md`.

### Phase 11 — Project-Bound Artifact Generation Principle (NEW, ~3 hours)

Codify the user's directive: **every project's planning phase auto-generates its own `.claude/` scaffold (rules, skills, agents, plans), and the scaffold evolves through learning as the project proceeds.**

**New global rule**: `~/.claude/rules/common/project-scoped-artifacts.md`. Mandatory shape:

- On first significant work in a project (defined as: a non-trivial Council-mediated task, NOT a single-file fix), Claude auto-creates `<project>/.claude/` with:
  - `<project>/.claude/CLAUDE.md` — workspace rules (if not present)
  - `<project>/.claude/rules/` — project-specific rules layered on top of global
  - `<project>/.claude/skills/` — project-specific skills (auto-populated based on project's tech stack detected from package.json / go.mod / Gemfile / Cargo.toml / etc.)
  - `<project>/.claude/agents/` — project-specific agents (if needed beyond global)
  - `<project>/.claude/plans/` — project plans
  - `<project>/.claude/memory/` — project-specific feedback / project / reference memories
  - `<project>/.claude/audits/` — security audits, dependency audits, code reviews
- Project planning phase output INCLUDES the artifact-generation block: list of rules/skills/agents the plan needs the project to have, with auto-create instructions.
- **Learning loop**: after each Council-mediated task in a project, the assistant proposes additions/refinements to the project's `.claude/` based on what worked / what failed. The user reviews + approves additions via AskUserQuestion. Approved entries land in the project's `.claude/`.
- Project `.claude/` content is **additive** to global — never overrides global, only adds project-specific specifics.
- Cross-project learnings (patterns that apply to all projects) are promoted from project `.claude/` to global `~/.claude/` after appearing in 2+ projects (the user approves the promotion).

**Bootstrap template** `~/.claude/templates/project-claude-scaffold/` (NEW):

- Template directory shipped as part of this rebuild.
- Contains stub files (CLAUDE.md template, README.md, .gitignore for .claude/, MEMORY.md skeleton).
- The new global rule references this template; Claude copies it when bootstrapping a project `.claude/`.

**Verification**: dry-run on a fresh test project; verify the scaffold lands with the right shape and the workspace CLAUDE.md correctly references global+workspace+project layering.

### Phase 12.5 — Verify-Before-Claim + Local Testability Mandate (C6, NEW, ~1.5 hours)

Two new global rules + Council protocol updates:

**New rule `~/.claude/rules/common/local-testability.md`**:
- Every code change MUST be locally testable BEFORE the assistant writes it.
- Trigger sequence: receive coding request → detect testability prerequisites (build tools, deps, dev DB, env vars, mocks) → verify locally OR request environment setup → only then write code.
- If a prerequisite is missing, Claude MUST generate an explicit env-setup request (commands, files, secrets) and pause for user to confirm setup before writing code.
- No "I'll write it and you can test later" — every code emit pairs with a runnable test step.

**New rule `~/.claude/rules/common/verify-before-claim.md`** (sister to `no-overclaim.md`):
- Every claim of "done", "fixed", "shipped", "complete", "working" MUST be preceded by a verification action in the SAME turn (run tests, run build, run probe, hit endpoint, inspect output).
- The verification action's output is captured in the response BEFORE the claim phrase.
- If verification is impossible (no test infra, no local env), the claim is downgraded to "implemented — verification deferred to <specific gate>" with an explicit unblock task.
- Council Phase 3 (Implementation) and Council Phase 2 (Consensus / GO) now both require an explicit "verifiable how?" answer.

**Council protocol update** (Phase 7 amends CLAUDE.md):
- Phase 1 of every Council discussion adds a new mandatory output: **"Verification path"** — how this change will be tested locally before any claim.
- Division 5 (Testing & QA) owns this output; Division 7 (UX) signs off that user-facing behavior is also verifiable.

### Phase 13 — External Claude Skills Inventory & Selective Integration (C8, NEW, ~6 hours)

Audit the global Claude skill ecosystem for high-value additions not yet present. **DO NOT bulk-import** — every external skill is reviewed against the install-allowlist policy and adapted to the standards-citation template before landing.

Sources to inventory (per web research 2026-05-26):

| Source | Scope |
|--------|-------|
| `github.com/anthropics/skills` | Anthropic-official skills (document-skills, example-skills, MCP server gen, etc.) |
| `github.com/anthropics/claude-cookbooks` (skills dir) | Anthropic recipe-style skill examples |
| `github.com/hesreallyhim/awesome-claude-code` | Major community curated list |
| `github.com/GetBindu/awesome-claude-code-and-skills` | Community curated list |
| `github.com/VoltAgent/awesome-agent-skills` | 1000+ cross-vendor skills (Claude/Codex/Gemini/Cursor) |
| `github.com/travisvn/awesome-claude-skills` | 8.7k★ curated |
| `github.com/alirezarezvani/claude-skills` | 329 skills + 30 agents + 70 commands across engineering/marketing/product/compliance/C-level/research/business-ops/finance |
| `github.com/jeremylongshore/claude-code-plugins-plus-skills` | 425 plugins, 2810 skills, 200 agents (with ccpi CLI package manager) |
| `github.com/wshobson/agents` | Multi-harness agentic plugin marketplace |
| `claudemarketplaces.com` | 6700+ skills, 2500+ marketplaces, 840+ MCP servers (community directory) |
| `skillsmp.com` | Cross-vendor (Claude/Codex/ChatGPT) skill marketplace |

Selection criteria (in order of priority):

1. **Filling a gap** identified in Phase 1 audit (e.g. tax accounting, legal-research, regulatory-update tracking, OSINT, threat-intel feeds, vendor-management, contract-review).
2. **Publisher trust**: Anthropic-official > known-org (Vercel, Stripe, Cloudflare, Netlify, Google Labs) > known-maintainer-with-track-record > unknown (skip).
3. **Standards citation**: skill must include or be adaptable to the standards-citation template; if shallow stub-only, skip OR adapt.
4. **License**: MIT/Apache/BSD/0BSD/CC0 only (per `license-allowlist-gate.md`).
5. **No overlap** with existing skill — if it duplicates, harvest the best parts and merge, don't double-install.
6. **Anthropic Agent Skills v1.0 spec compliance** (Dec 2025 open standard; OpenAI/Codex/Gemini also adopt).

Process per candidate skill:
1. Source-read on GitHub.
2. Security audit (no malicious code, no `npm install` of untrusted deps, no shell-out without sandbox).
3. Adapt to the standards-citation template (Purpose / Standards Cited / When to Fire / Core Patterns / Anti-Patterns / Verification / Cross-Refs).
4. Attribute source in skill metadata.
5. Add to `auto-skills.md` with appropriate triggers.

Estimated outcome: 25-40 additional curated skills landing in `~/.claude/skills/` (on top of the 45 new domain skills from Phase 5). Total skill count: ~99 → ~125-140.

### Phase 14 — Public Repo + Cross-IDE Distribution (C10, NEW, ~6 hours)

Create a publishable repo for the global Claude config so org engineers can `git clone` + bootstrap in minutes.

**Repo name (proposed)**: `bfree-claude-config` (or org-name-specific — confirm with user before creating). Hosted on GitHub. Initial visibility: private to org, opt-in public later.

**Repo layout**:

```
bfree-claude-config/
├── README.md                      # quick-start, philosophy, how the Council works
├── INSTALL.md                     # detailed setup per OS + IDE
├── CHANGELOG.md                   # semver-tagged release history
├── LICENSE                        # MIT or org-specific
├── .gitignore
├── claude-home/                   # mirrors ~/.claude/ structure
│   ├── CLAUDE.md
│   ├── rules/
│   ├── skills/
│   ├── agents/
│   ├── commands/
│   ├── hooks/
│   ├── scripts/
│   ├── templates/project-claude-scaffold/
│   └── plugins/
├── ide-integrations/
│   ├── vscode/
│   │   ├── settings.json          # baseline settings (security hardened)
│   │   ├── keybindings.json       # Claude Code shortcuts
│   │   ├── extensions.json        # recommended extensions list
│   │   └── README.md
│   ├── cursor/
│   │   ├── settings.json
│   │   ├── extensions.json
│   │   └── README.md
│   ├── jetbrains/                 # GoLand, IntelliJ, WebStorm, PyCharm, PhpStorm, RubyMine
│   │   ├── README.md              # install official "Claude Code [Beta]" plugin
│   │   ├── keymap-claude.xml      # Cmd+Esc launch + project-pane integration
│   │   ├── recommended-plugins.md
│   │   └── code-style/            # per-language code style XML
│   └── windsurf/
│       ├── settings.json
│       └── README.md
├── bootstrap/
│   ├── install.sh                 # macOS/Linux one-shot installer
│   ├── install.ps1                # Windows PowerShell installer
│   ├── verify.sh                  # post-install self-test
│   └── uninstall.sh               # clean removal
├── docs/
│   ├── ARCHITECTURE.md            # why the Council protocol, how divisions work
│   ├── COUNCIL.md                 # 16-division reference
│   ├── RULES.md                   # rules index + when each fires
│   ├── SKILLS.md                  # skills index + auto-fire triggers
│   ├── AGENTS.md                  # agents index + delegation guide
│   ├── PROJECT-BOOTSTRAP.md       # how a new project gets its own .claude/
│   ├── CONTRIBUTING.md            # how to add a rule/skill/agent
│   ├── CODE-OF-CONDUCT.md
│   └── ADR/                       # Architecture Decision Records for the config itself
├── tests/
│   ├── synthetic-council-task.md  # the rate-limiting reference task
│   ├── verify-link-integrity.sh
│   ├── verify-no-orphans.sh
│   └── verify-standards-citations.sh
└── .github/
    ├── workflows/
    │   ├── ci.yml                 # link integrity, no orphans, citations present
    │   ├── release.yml            # semver tag + CHANGELOG
    │   └── stale-skill-detector.yml
    ├── PULL_REQUEST_TEMPLATE.md
    └── ISSUE_TEMPLATE/
```

**Bootstrap script `install.sh`** capabilities:
- Symlink or copy `claude-home/` to `~/.claude/` (with backup of any existing config).
- Detect installed IDEs (VS Code, Cursor, JetBrains family) and offer to apply per-IDE integration.
- For JetBrains: install official "Claude Code [Beta]" plugin from JetBrains Marketplace via `idea` CLI / `goland` CLI / `pycharm` CLI.
- Verify Anthropic CLI auth (`claude --version` + auth status).
- Run post-install verify.sh.

**Versioning**: semver. v1.0.0 = post-rebuild baseline. Patch bumps for rule deepening; minor for new skills/rules; major for Council/protocol changes.

**Documentation**: README explains the Council protocol in 5 paragraphs, INSTALL covers per-OS + per-IDE flow, ARCHITECTURE.md is the deep-dive for engineers who want to extend.

**Continuous integration**: CI runs link-integrity + no-orphans + standards-citations checks on every PR.

### Phase 15 — Recommended Extensions Per IDE (C11, NEW, ~2 hours)

Curate per-IDE extension lists in the repo from Phase 14. Cross-reference `~/.claude/rules/common/install-allowlist.md` so only verified-publisher extensions appear.

**VS Code (`ide-integrations/vscode/extensions.json`)**:
- Already allowlisted in `install-allowlist.md`: `ms-*`, `github.*`, `anthropic.*`, `amazonwebservices.*`, `hashicorp.*`, `redhat.*`, `dbaeumer.*` (ESLint), `esbenp.*` (Prettier), `eamodio.*` (GitLens), `editorconfig.editorconfig`, `charliermarsh.ruff`, `golang.go`, `oxc.oxc-vscode`, `vitest.explorer`, `mtxr.sqltools*`, `vscodevim.vim`, `ryanluker.vscode-coverage-gutters`, `mikestead.dotenv`, `mechatroner.rainbow-csv`, `sumneko.lua`, plus `sonarsource.sonarlint-vscode`, `bierner.markdown-mermaid`, `davidanson.vscode-markdownlint`, `vue.volar`.
- Add (post-rebuild research): `tamasfe.even-better-toml`, `signageos.signageos-vscode-sops`, `ms-toolsai.jupyter`, `ms-playwright.playwright`, `ms-vscode.cpptools`, `redhat.vscode-yaml`, `hashicorp.terraform`, `ms-kubernetes-tools.vscode-kubernetes-tools`.

**Cursor (`ide-integrations/cursor/extensions.json`)**:
- Cursor uses the same extension format. Same allowlist applies. Plus `anysphere.cursorpyright` (Cursor's official Python LSP).

**JetBrains family (`ide-integrations/jetbrains/recommended-plugins.md`)**:
- Anthropic's official "Claude Code [Beta]" plugin from JetBrains Marketplace.
- SonarLint (JetBrains version).
- GitToolBox.
- IdeaVim.
- .env files Support.
- Prettier (JetBrains version).
- Per-language: Go (GoLand built-in), Python (PyCharm built-in), JavaScript/TypeScript (WebStorm built-in).

**Windsurf**: Same VS Code extension format. Allowlist applies. Documented in `ide-integrations/windsurf/`.

Each per-IDE README cites the install command for the platform (`code --install-extension <id>`, JetBrains plugin URL, etc.).

### Phase 16 — Continuous Learning Mandate (C12, NEW, ~3 hours)

Codify learning as a cross-cutting mandate across all artifacts.

**New global rule `~/.claude/rules/common/continuous-learning-mandate.md`**:

- Every agent, every skill, every rule, every Council division has a `learning_hooks` section in its frontmatter (or footer).
- After every Council-mediated task, the assistant emits a `learning-candidate` event to `~/.claude/audits/learning-events.jsonl` with: task summary, division that fired, what worked, what failed, candidate refinement.
- Once per session (or on user invocation `/learn`), the assistant batches the candidates and proposes refinements via AskUserQuestion. Approved refinements update the artifact in the SAME session.
- **Promotion path**: a refinement that appears in 2+ projects (per project `.claude/audits/learning-events.jsonl`) is promoted to global `~/.claude/`.
- **Demotion path**: a rule that is consistently overridden / bypassed / contradicted in practice is flagged for review. After 5 contradictions, the rule is downgraded to "advisory" pending refresh.

**Integration with existing `continuous-learning-v2` skill**:
- The skill becomes the implementation arm of this rule.
- It runs on hook events (PostToolUse, SessionEnd).
- Existing `instinct-export`, `instinct-import`, `instinct-status`, `evolve`, `learn`, `learn-eval` commands wire into this loop.

**Council integration**:
- Council Phase 2 (Consensus) adds a new output: **"Learning signals expected"** — what should we observe to confirm the decision was right.
- Council Phase 3 (Implementation) closes with **"Learning event emitted"** — confirming the audit entry exists.

**Effect on rules / skills / agents**:
- Each of the 49 rules + ~125 skills + 30 agents gets a `learning_hooks:` section documenting what signals it watches for and what refinement it would propose.
- This is added DURING Phase 5 (skills creation) and Phase 6 (agents creation) so new artifacts have it baked in; existing artifacts get a one-line addition in Phase 2 (rules consolidation) and Phase 4 (skill consolidation).

### Phase 17 — Workspace Consistency Sweep (Medium risk, ~2 hours, was Phase 12)

Make every existing workspace `.claude/` dir conform to the scaffold from Phase 11.

Current state (per Phase 0 scan):
- `/Users/APPLE/Reback/.claude/` — 1 file (needs expansion)
- `/Users/APPLE/Unvamp/.claude/` — DOES NOT EXIST (needs creation)
- `/Users/APPLE/stewardbot/.claude/` — 16 files (already well-organized; verify against scaffold)
- `/Users/APPLE/BFREE-Africa/.claude/` — 2 files (needs expansion)
- `/Users/APPLE/elp-project/.claude/` — 1 file (needs expansion)

For each workspace:
1. Compare current `.claude/` content to scaffold template.
2. Create missing subdirs (`rules/`, `skills/`, `agents/`, `plans/`, `memory/`, `audits/`).
3. Populate with the project-specific files relocated in Phase 1B (Reback Finance plan → Reback's `.claude/plans/`; Unvamp v3 plan + Unvamp memories → Unvamp's `.claude/`; StewardBot calendar plan → StewardBot's `.claude/plans/`).
4. Add a project-specific `auto-skills.md` if the project has unique tech-stack triggers (e.g., StewardBot's serverless + DynamoDB stack; Reback's Go + Gin + RDS; Unvamp's Go + Next.js 16 + MediaMTX).
5. Each workspace gets its own first-iteration project skills based on the relocated memory + observed Council-mediated work patterns.

**Atomicity**: One commit per workspace repo. Each workspace edit is reviewed against the scaffold template before commit.

**Verification**: `find /Users/APPLE/*/. claude -maxdepth 1 -type d | sort` lists every workspace with the same subdir set (`{rules,skills,agents,plans,memory,audits}`).

---

## Critical Files

| Path | Why |
|------|-----|
| `/Users/APPLE/.claude/CLAUDE.md` | Council protocol — Phase 7 focus |
| `/Users/APPLE/.claude/rules/common/auto-skills.md` | File-type → skill mapping; updated in Phases 3, 4, 5 |
| `/Users/APPLE/.claude/rules/common/no-discards.md` | Consolidation target Phase 2a |
| `/Users/APPLE/.claude/rules/common/security.md` | Umbrella promotion Phase 2b |
| `/Users/APPLE/.claude/rules/common/hooks.md` | Merge target Phase 2c |
| `/Users/APPLE/.claude/agents/security-reviewer.md` | Model upgrade Phase 6 |
| `/Users/APPLE/.claude/agents/{architect,planner}.md` | Reference format for new opus agents |
| `/Users/APPLE/Reback/CLAUDE.md` + 4 other workspace files | Phase 8 ripple targets |

## Existing patterns to reuse

- **Rule structure template** — already canonical in `~/.claude/rules/common/proper-fixes-first.md` and `~/.claude/rules/common/no-discards.md`. New rules mirror this shape.
- **Agent frontmatter template** — copy from `~/.claude/agents/architect.md` (canonical opus) or `~/.claude/agents/code-reviewer.md` (canonical sonnet).
- **SKILL.md template** — review 2-3 deep existing skills (`backend-patterns`, `provider-research`, `vue3-patterns`) for structure cadence before writing new ones.
- **Cross-reference style** — markdown links to relative paths (`[[name]]` for memory; `~/.claude/rules/common/X.md` absolute for rules).
- **Standards citation format** — codified in Phase 5 above; consistent across all new artifacts.

---

## Verification (end-to-end)

After Phase 10, the rebuild is verified by running the synthetic Council task end-to-end:

1. **Trigger**: New session, submit "Design a multi-tenant rate-limiting feature for a REST API serving 10k req/s with idempotency and audit-logging requirements."
2. **Expected behavior**:
   - All 9 Council divisions speak in order
   - Phase 0 cites RFC 6585 (429 Too Many Requests), RFC 7231, RFC 9110, Redis rate-limit patterns, OWASP ASVS 4.0 §11 (Business Logic), GDPR Art 32 (security)
   - Division 3 (Quality) cites `idempotency.md`, `rate-limiting.md`, `api-versioning.md`, `audit-logging.md`
   - Division 4 (Security) cites `security.md` umbrella + `gdpr-ccpa.md`
   - Division 6 (Compliance) cites `gdpr-ccpa.md` + `data-retention.md`
   - Division 8 (Operations) cites `runbook-template.md` + `observability.md`
   - GO decision arrived at with tiebreaker rule available
3. **Pass criteria**: zero broken file references, all new skills/rules surfaced where applicable, no Council bypass attempted.
4. **Failure mode**: any broken reference → revert the implicated phase branch; fix; re-run.

---

## Estimated Effort

| Phase | Duration | Risk |
|-------|----------|------|
| 0 — Safety net + git baseline | 30 min | Low (gitignore-dependent) |
| 1 — Orphan cleanup | 30 min | Low |
| 2 — Rule consolidations | 2 hours | Medium (link integrity) |
| 3 — 27 new rules | 4 hours | Low (additive) |
| 4 — Skill consolidations | 2 hours | Medium (auto-skills.md timing) |
| 5 — 45 new domain skills (deep content) | 40 hours | Low (additive); deep-quality requirement is the bottleneck |
| 6 — Agent expansion + opus upgrade | 1.5 hours | Low |
| 7 — Council protocol overhaul | 2 hours | High (blast radius) |
| 8 — Workspace ripple sweep | 1.5 hours | Medium (cross-repo) |
| 9 — Verification | 2 hours | Low |
| 10 — Final cleanup | 30 min | Low |
| **Total** | **~56 hours** | |

The 56-hour total reflects deep-quality skill writing (estimated 1-4 hours per new skill with full standards citations). Phase 5 dominates; the rest is ~16 hours combined.

**Execution cadence**: phases will span multiple sessions. Each session resumes at the next un-merged phase branch. The plan file is self-contained — a fresh session can pick up at any phase by reading this file + checking git log for the last merged phase.

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Broken reference after delete/rename | Stub-redirect strategy for 1 phase; link-check after every phase |
| `auto-skills.md` references deleted skill | Same-commit atomicity for delete + auto-skills.md update |
| Workspace files reference removed name | Phase 8 sweep before Phase 10 final deletes |
| Shallow skill content | Mandatory template enforced; no SKILL.md under 500 words; standards citations required |
| Council protocol incoherent mid-edit | Phase 7 is one atomic commit; verification synthetic task before merge |
| 5+ GB conversation tree staged into git | `.gitignore` written BEFORE first `git add -A` in Phase 0; verify `.git/` size after init |
| Standards citations drift / become outdated | Each citation includes version (WCAG 2.2, OWASP ASVS 4.0.3, etc.) — re-validate at v3.0 rebuild |
| New domain skills outside my expertise | Cite authoritative bodies (CFA Institute, IEEE, ISO, AICPA, ASHRAE, etc.) and link to their canonical reference texts; do NOT invent guidance |
| Council bypass surface remains | After Phase 7, run a deliberate bypass attempt (`*` prefix + claim of "single-file fix") and verify audit log captures the attempt |

---

## Rollback

Per-phase via `git checkout main && git branch -D rebuild/phase-N`. The Phase 0 snapshot tag (`pre-rebuild-baseline`) is the ultimate rollback target. Workspace repo changes (Phase 8) are reverted via `git stash pop` of the pre-Phase-8 stash in each workspace.

If a phase corrupts state mid-execution, the safe shape is:
1. `git status` — confirm working tree clean (or stash dirty changes)
2. `git checkout main`
3. `git branch -D rebuild/phase-N`
4. Re-read this plan file; restart phase from clean state.

---

## Open scope decisions (deferred to execution time, not blocking approval)

1. **`projects/` and `file-history/` deeper pruning** — these contain conversation history. The current plan only prunes UUIDs paired with deleted sessions. A more aggressive prune (delete all conversation history older than 90 days) could free 3+ GB but is out of scope for this rebuild. Flag for future cleanup.

2. **MCP config consolidation** — `mcp-configs/` has only an `.example` file. If the user starts using custom MCP servers, this becomes relevant. Currently not blocking.

3. **Plans/ archive policy** — moved stale plans to `plans/archive/` in Phase 1. Long-term retention policy (delete after 1 year?) is a future cleanup.

4. **Multi-vendor AI tooling alignment** — user has Gemini CLI (`~/.gemini/`, 11 MB) and Codex CLI (`~/.codex/`, 44 MB) installed. Cross-vendor rule mirroring (so Gemini/Codex enforce the same Council protocol) is OUT of scope for this rebuild but flagged for a future "polyglot AI tooling" initiative.

---

## Sources (web-researched 2026-05-26 — basis for Council 16-division design)

C-suite executive structure (Sources for Divisions 6-16):

- [C-Suite Org Chart | Cowen Partners](https://cowenpartners.com/c-suite-org-chart/)
- [The evolution of the C-suite: New executive titles in 2026 | IE Business School](https://www.ie.edu/uncover-ie/the-evolution-of-the-c-suite-new-executive-titles-shaping-business/)
- [Microsoft Organization Structure: 7 Divisions Chart 2026 | FourWeekMBA](https://fourweekmba.com/microsoft-organizational-structure/) (basis for cross-cutting divisions vs siloed)
- [Organizational Design: Principles, Models & Implementation in 2026 | Workhuman](https://www.workhuman.com/blog/organizational-design/)
- [Organizational Structure Guide for 2026 | OneDirectory](https://www.onedirectory.com/blog/organizational-structure-guide/)
- [Who Lives in the C-Suite? HBS Working Paper](https://www.hbs.edu/ris/Publication%20Files/12-059_040a5ca7-f80c-4d01-abd3-57f431795613.pdf)

Team Topologies (basis for Div 8 Operations, Div 13 People, team-design principles):

- [The Four Team Types from Team Topologies | IT Revolution](https://itrevolution.com/articles/four-team-types/)
- [Team Topologies | Atlassian DevOps](https://www.atlassian.com/devops/frameworks/team-topologies)
- [Key concepts and practices | teamtopologies.com](https://teamtopologies.com/key-concepts)
- [Martin Fowler bliki: Team Topologies](https://martinfowler.com/bliki/TeamTopologies.html)
- [AWS Well-Architected DevOps Guidance: Organize teams](https://docs.aws.amazon.com/wellarchitected/latest/devops-guidance/oa.std.1-organize-teams-into-distinct-topology-types-to-optimize-the-value-stream.html)

Engineering team roles (basis for Div 2/3/5/8 agent additions):

- [Engineering Operations: What It Is | Cortex](https://www.cortex.io/post/what-is-engineering-operations-a-guide-to-the-discipline-transforming-software-teams)
- [10 Platform engineering predictions for 2026 | Platform Engineering Community](https://platformengineering.org/blog/10-platform-engineering-predictions-for-2026)
- [Build the Platform Engineering Team | Microsoft Learn](https://learn.microsoft.com/en-us/platform-engineering/team)
- [Platform Engineering vs. DevOps - Key Differences in 2026 | Spacelift](https://spacelift.io/blog/platform-engineering-vs-devops)
- [Future Outlook of Software Engineering in 2026 | Lemon.io](https://lemon.io/blog/future-outlook-of-software-engineering/)

ISO 9001:2026 + ESG integration (basis for Div 14 Sustainability & ESG):

- [ISO 9001:2026 – How to Prepare for the New Quality Standard | ProQC](https://proqc.com/blog/iso-9001-2026-how-to-prepare-for-the-new-version/)
- [ISO 9001:2026 – What Quality Leaders Need to Know Ahead | Quality Forward](https://www.qualityfwd.com/blog/iso-9001-2026/)
- [Driving sustainability with ISO 9001: future-proofing quality and ESG | ERM](https://www.erm.com/ermcvs/about/news/driving-sustainability-with-iso-9001/)
- [ISO 9001:2026 Transition: What's New | NQA](https://www.nqa.com/en-us/resources/blog/February-2026/iso-9001-changes)

Each new Council division added in this rebuild traces back to at least one of these sources. Each new domain skill (Phase 5) cites its own primary-source standard (OWASP ASVS, ISO 27001, GDPR, PCI-DSS, IFRS 15, ITIL 4, CFA Institute, etc.) inline within its SKILL.md per the "Standards Cited" template section.
