# Rebuild State Report — 2026-05-29

> Status snapshot of the `peppy-painting-parrot` rebuild on branch
> `rebuild/phase-1-orphans` (single-commit policy in force; final
> commit pending Phase 8 + Phase 17). Phase-0 baseline:
> `8a07d9c snapshot: pre-rebuild baseline`.

## Current artifact counts

| Surface | Plan target | Current | Notes |
| --- | --- | --- | --- |
| Agents | 30 | 29 | 16 Council Division leads + 13 supporting agents. Includes 7 newly-authored Division-lead agents (risk-, ai-ethics-, finance-, strategy-, people-, esg-, comms-reviewer) |
| Skills (including SKILL.md per dir) | ~99 | 93 | Phase 5 added 45 domain skills; Phase 4 folded 5 into siblings; `skills/learned/SKILL.md` added as learning-loop staging |
| Rules in `rules/common/` | ~49 + 12 deepened | 73 | Higher than plan — additional cross-cutting rules added during execution (continuous-learning-mandate, principal-level-mandate, council-default + triggers, etc.) |
| Language rule subfolders | 21 | 21 | Exact match: common, golang, typescript, python, cpp, csharp, dart, lua, swift + 12 new (java, ruby, rust, kotlin, solidity, sql, bash, markdown, yaml, dockerfile, terraform, html-css) |
| Files modified vs Phase-0 baseline | n/a | 203 | All staged into single commit per `commit-policy: single` |

## Phase completion matrix

| Phase | Status | Notes |
| --- | --- | --- |
| 0 — Safety net + git baseline | DONE | Commit `8a07d9c`; `.git/` under 500 MB confirmed |
| 1A — Orphan cleanup | DONE | 13 orphan items resolved; `session-env/` pruned 257 dirs; `file-history/` pruned 107 orphan UUIDs |
| 1.5 — Global-rule purity sweep | DONE | Project-specific tokens stripped from all global rules; `bfree-africa-git-identity.md` relocated to BFREE workspace |
| 1B — Project-file relocation | PARTIAL | Universal-preference memories kept global; project-specific memories require workspace authorization for relocation (gated on Phase 8) |
| 2 — Rule consolidations | DONE | `no-discards.md` absorbed silent-failures + silent-drops content; `security.md` promoted to OWASP umbrella; `hooks.md` per-language merged |
| 3 — 27 new rules | DONE + EXPANDED | Original 27 plus continuous-learning-mandate, principal-level-mandate, council-default, council-triggers, project-scoped-artifacts, rule-authoring-global-vs-project, etc. |
| 4 — Skill consolidations | DONE | Strategic-compact → verification-loop; frontend-design → frontend-patterns; error-shape-contract-testing → api-design; content-hash + fire-and-forget → backend-patterns; regex-vs-llm → cost-aware-llm-pipeline |
| 5 — 45 new domain skills | DONE | All 45 authored at principal-level depth with standards citations (WCAG 2.2, OWASP ASVS 4.0.3, ISO/IEC 27001:2022, GDPR Art, IFRS 15, CFA, etc.) |
| 6 — Agent roster expansion | DONE | `security-reviewer` → opus; new Division-lead agents authored: infra-, performance-, java-, mobile-, compliance-, accessibility-, ux-, ops-, data-, risk-, ai-ethics-, finance-, strategy-, people-, esg-, comms-reviewer |
| 7 — Council protocol overhaul | DONE | CLAUDE.md updated to 16 Divisions with tiebreaker matrix + veto authority; bypass surfaces eliminated; council-default.md + council-triggers.md authored |
| 8 — Workspace ripple sweep | BLOCKED | Reback / Unvamp / StewardBot / BFREE-Africa / lago-api CLAUDE.md updates need explicit user authorization to touch other repos |
| 9 — Verification (synthetic Council task) | DONE | `audits/phase-9-synthetic-council-verification.md` records end-to-end Phase 0-1-2-3 on rate-limit + idempotency + audit-log task |
| 10 — Final cleanup + commit | GATED | Awaiting Phase 8 + Phase 17 completion; single-commit policy + branch protection in force |
| 11 — Project-bound artifact generation principle | DONE | `rules/common/project-scoped-artifacts.md` + `templates/project-claude-scaffold/` |
| 12.5 — Verify-before-claim + local-testability | DONE | `rules/common/verify-before-claim.md` + `rules/common/local-testability.md` |
| 13 — External Claude skills inventory | BLOCKED | Needs WebFetch access; deferred to next session |
| 14 — Public repo + cross-IDE distribution | BLOCKED | Needs `gh auth` + user authorization to create `bfree-claude-config` repo |
| 15 — Recommended extensions per IDE | DONE | VS Code + Cursor + JetBrains + Windsurf curated extensions.json + settings.json + README.md |
| 16 — Continuous learning mandate | AGENTS DONE / RULES + SKILLS PARTIAL | `rules/common/continuous-learning-mandate.md` authored; **learning_hooks now on all 29/29 agents** (16 Division leads + 13 supporting); remaining ~110 rules + skills acquire learning_hooks during natural touches per mandate rule 6 |
| 17 — Workspace consistency sweep | BLOCKED | Same authorization gate as Phase 8 |

## Blocked items — what needs user input

### 1. Workspace authorization (gates Phase 8 + 17 + 10)

The rebuild touches 5 other workspaces. Pre-flight status checks
(read-only — no edits made):

| Workspace | Git status | `.claude/` exists? | Action gate |
| --- | --- | --- | --- |
| `/Users/APPLE/Reback/` | NOT a git repo at top level | yes | confirm which sub-project is the workspace anchor; OR git-init at top |
| `/Users/APPLE/Unvamp/` | NOT a git repo at top level | yes | same — confirm anchor |
| `/Users/APPLE/BFREE-Africa/` | NOT a git repo at top level | yes | same — confirm anchor (lago-api is the known sub-repo) |
| `/Users/APPLE/stewardbot/` | clean except for 16 dirty files on feature branch `fix/iam-policy-size-cap` | yes | stash dirty work OR wait until feature branch lands; then ripple |
| `/Users/APPLE/BFREE-Africa/lago-api/` | 1 dirty file | does NOT exist | new branch off main; create `.claude/` scaffold per `templates/project-claude-scaffold/`; ripple |

Each workspace's `CLAUDE.md` needs ripple updates to reflect the
consolidated rule names (no-discards → umbrella; security →
OWASP umbrella; etc.). Project-specific memories that landed
in global during prior sessions need relocation to each
workspace's `.claude/memory/`.

**To proceed**: user provides per-workspace direction:

- For the 3 non-git directories: name the workspace anchor (a
  specific sub-project that IS a git repo) OR authorize
  top-level `git init`.
- For `stewardbot`: stash dirty files OR confirm we wait until
  feature branch lands.
- For `lago-api`: confirm new branch off main + scaffold creation.

The agent will NOT touch any workspace without per-workspace
authorization per `plan-completion-before-push.md`.

### 2. External skills inventory (Phase 13)

Needs WebFetch / WebSearch access to:

- `github.com/anthropics/skills`
- `github.com/anthropics/claude-cookbooks`
- `github.com/hesreallyhim/awesome-claude-code`
- `github.com/VoltAgent/awesome-agent-skills`
- `github.com/alirezarezvani/claude-skills`
- `github.com/jeremylongshore/claude-code-plugins-plus-skills`
- `github.com/wshobson/agents`
- `claudemarketplaces.com`

**To proceed**: enable WebFetch in this session OR run a dedicated
session for the inventory.

### 3. Public repo creation (Phase 14)

Needs:

- `gh auth status` confirming authenticated GitHub session
- User authorization to create `bfree-claude-config` (private →
  org-internal → optional public later)
- Decision on org name + visibility tier

**To proceed**: user provides repo name + visibility + confirms
gh auth.

## Doable without further authorization (handover items)

These items can be picked up in any future session without
external dependencies:

| Item | Effort | Description |
| --- | --- | --- |
| Phase 16 rollout — wire learning_hooks across remaining ~110 rules + skills | ~6h | Mechanical edits per `continuous-learning-mandate.md` rule 6; agents now 29/29 ✓ |
| Audit `audits/phase-9-synthetic-council-verification.md` for any cross-reference drift after the 7 new agents landed | ~30min | Re-run synthetic Council task; confirm 16-division engagement |
| Add `templates/ide-configs/` for JetBrains family (GoLand, IntelliJ, WebStorm, PyCharm) | ~2h | Parallels VS Code / Cursor / Windsurf templates |
| Promote learnings from `skills/learned/` to permanent artifacts as the queue accumulates | ongoing | Per `continuous-learning-mandate.md` lifecycle |

## Verification block (this turn — 2026-05-30 update)

```
Rebuild state audit (refreshed):
  - Agents: 29 (16 Division leads + 13 supporting)
  - Skills with SKILL.md: 93 (incl. learning-loop staging)
  - Rules / common: 73
  - Language rule subfolders: 21
  - Link-integrity sweep: 0 broken refs (5/5 sweeps green)
  - Newly-authored Division-lead agents (prior session): 7
    (risk-, ai-ethics-, finance-, strategy-, people-, esg-, comms-reviewer)
  - learning_hooks coverage: 29/29 agents ✓
    (16 Division leads + 13 supporting agents:
     architect, planner, build-error-resolver, go-build-resolver,
     code-reviewer, go-reviewer, python-reviewer, database-reviewer,
     refactor-cleaner, doc-updater, security-reviewer, tdd-guide, e2e-runner)
  - Phase 16 agents dimension: COMPLETE
  - Phase 16 rules + skills dimension: DEFERRED (per mandate rule 6)
  - Files staged vs Phase-0 baseline: 203 (+ this report's diff)
  - Branch: rebuild/phase-1-orphans
  - Commit policy: single (final commit pending Phase 8 + 17)
  - Workspace pre-flight: 3 non-git anchors + 2 dirty branches — direction needed
```

## Council voices this turn (Abbreviated)

- **Architecture & Planning**: Phase 16 agents dimension closed cleanly; rebuild remains in handover state. Remaining gates are user-authorization on workspaces + Phase 13/14 external dependencies.
- **Implementation & Build**: 203 files staged plus this report's diff; tree clean; no half-finished migrations; single-commit policy intact; all 29 agents now have learning_hooks appended cleanly.
- **Quality & Review**: 29/29 agents carry `## Learning hooks` section per `continuous-learning-mandate.md` rule 6. Domain-specific signals + refinement candidates drafted per agent (build resolvers focus on lint-recurrence; reviewers on review-checklist gaps; tdd-guide on coverage gaming + flakiness; e2e-runner on stability creep; doc-updater on docs-sync drift).
- **Security**: No changes to veto-holders or tiebreaker matrix this turn; agents-only learning_hooks rollout doesn't touch CLAUDE.md.
- **Testing & QA**: Phase 9 synthetic Council verification artifact still valid; re-run still recommended before final commit.

**Extended fired**: 12 (Strategy — rebuild trajectory), 13 (People — handover discipline + bus-factor of the learning loop), 16 (Comms — this report is the handover artifact).

**Consensus**: GO for continued handover state. Phase 16 agents dimension complete. Final commit awaits user authorization for Phase 8 + 17.

## Cross-references

- `~/.claude/plans/peppy-painting-parrot.md` — full rebuild plan
- `~/.claude/audits/phase-9-synthetic-council-verification.md` —
  end-to-end Council verification artifact
- `~/.claude/CLAUDE.md` — 16-division Council protocol
- `~/.claude/rules/common/continuous-learning-mandate.md` — Phase
  16 mandate (rollout via natural touches)
- `~/.claude/rules/common/plan-completion-before-push.md` —
  commit-policy: single gate
