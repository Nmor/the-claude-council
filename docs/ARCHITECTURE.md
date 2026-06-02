# Architecture

> How The Claude Council is organised, what each layer does, and how
> the pieces compose. Pair with [COUNCIL.md](COUNCIL.md) for the
> 16-division detail and with [RULES.md](RULES.md) / [SKILLS.md](SKILLS.md) /
> [AGENTS.md](AGENTS.md) for the catalogs.

## Mental model

The Claude Council is a layered system that turns a single prompt
into the deliberate output of a multi-disciplinary team. The layers,
top to bottom:

```text
                       USER PROMPT
                            │
                            ▼
                ┌────────────────────────┐
                │  Prompt-improver       │  hook + skill
                │  (clarity gate)        │
                └───────────┬────────────┘
                            ▼
                ┌────────────────────────┐
                │  Council Protocol      │  CLAUDE.md
                │  Phase 0 → 1 → 2 → 3   │
                └───────────┬────────────┘
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
        ┌────────┐   ┌────────────┐   ┌────────────┐
        │ Rules  │   │   Skills   │   │   Agents   │
        │ load   │   │ auto-fire  │   │  delegate  │
        └────────┘   └────────────┘   └────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            ▼
                ┌────────────────────────┐
                │  Hooks                 │  PostToolUse,
                │  (mechanical gates)    │  pre-commit, CI
                └───────────┬────────────┘
                            ▼
                ┌────────────────────────┐
                │  Verification block    │  same-turn proof
                └────────────────────────┘
```

Every layer is composable, every layer is auditable, and every layer
is overridable by an explicit project rule that is **stricter**, never
looser, than the global one.

## The five primary surfaces

### 1. `CLAUDE.md` — the orchestrator

`~/.claude/CLAUDE.md` is loaded at the start of every Claude Code
session. It declares:

- The five Core Council Divisions (Architecture, Implementation,
  Quality, Security, Testing) that always speak.
- The eleven Extended Divisions that auto-fire on triggers.
- The Council Conversation Protocol (Phase 0 → Phase 1 → Phase 2 →
  Phase 3).
- The Tiebreaker Matrix (who casts ties, who holds veto).
- The five Golden Rules.

When a workspace `CLAUDE.md` exists, it loads ADDITIVELY — never
relaxing. When layers conflict, the stricter wins.

### 2. `rules/common/` + `rules/<lang>/` — the principles

Rules are pure guidance. They never name a specific project, vendor,
or session — only abstract principles, banned patterns, verification
checklists, and cross-references. Per
[`rule-authoring-global-vs-project.md`](../rules/common/rule-authoring-global-vs-project.md),
project specifics live in `<workspace>/.claude/rules/`.

Two flavors:

- **`rules/common/`** — universal guidance that applies regardless of
  language. Examples: `no-discards.md`, `verify-before-claim.md`,
  `secrets-management.md`, `audit-logging.md`, `idempotency.md`.
- **`rules/<lang>/`** — language-specific extensions of the common
  rules. Each language has its own `coding-style.md`,
  `no-discards.md`, `security.md`, `testing.md`, `patterns.md`,
  `hooks.md`. The lang rule **extends** the common rule with
  language-specific banned patterns and linter configs.

[Browse the rules catalog](RULES.md).

### 3. `skills/` — the patterns

Skills are reusable patterns and methodologies. Where a rule says
"do not write X," a skill says "here is how to design Y."

Auto-discovery: each skill lives in `~/.claude/skills/<name>/SKILL.md`.
The `auto-skills.md` rule maps file types to the skills that should
auto-fire when those file types are touched. For example, touching
a `*.go` file auto-fires `golang-patterns`, `golang-testing`,
`coding-standards`, `security-review`, `tdd-workflow` skills and the
`go-reviewer`, `go-build-resolver`, `tdd-guide`, `security-reviewer`
agents.

Skills span 13 domain clusters: code-quality, accessibility,
security-compliance, finance-accounting, investment, AI/ML, design,
org/management, infrastructure, industrial, structural engineering,
innovation, interpersonal, research/history.

[Browse the skills catalog](SKILLS.md).

### 4. `agents/` — the specialists

Agents are delegatable specialists, each with a frontmatter declaring
`name`, `description`, `tools`, and `model`. The Council protocol
delegates to an agent when its expertise is needed.

The agents follow the principal-level mandate per
[`principal-level-mandate.md`](../rules/common/principal-level-mandate.md):
every agent has identity + mission, declared global-rules enforcement,
auto-fire triggers, decision authority, a review checklist or
workflow, standards-cited references, structured output shape,
anti-patterns to reject, pairing model, and escalation triggers.

Model selection follows the user's policy: opus for
coding/reviewing/planning work, sonnet for narrow-scope or
verification-loop work, haiku only for mechanical doc work.

[Browse the agents catalog](AGENTS.md).

### 5. `hooks/` + `scripts/hooks/` — the mechanical gates

Hooks turn rules into machinery. They run automatically at lifecycle
events:

| Event | What runs |
| ----- | --------- |
| `SessionStart` | Loads workspace `CLAUDE.md`, primes context, surfaces workspace rules |
| `UserPromptSubmit` | Prompt-improver evaluates clarity; vague prompts route through the `prompt-improver` skill |
| `PreToolUse` | Validates parameters; enforces allow/deny lists; asks the user on risky actions |
| `PostToolUse` | Auto-format, lint, IDE diagnostics, hook-enforced rule checks (no-discards, secret patterns, hardcoded creds) |
| `PreCompact` | Persists running plan + intermediate state to durable memory |
| `Stop` | Final verification of touched files; surfaces remaining gaps |
| `SessionEnd` | Persists learnings, evaluates patterns, logs telemetry |

The hooks make it impossible to silently drift past a rule — if a
banned pattern lands in a `PostToolUse` diff, the hook blocks the
edit and returns the error to the agent.

## How layers compose

A non-trivial task flows like this:

1. **Prompt arrives** → `UserPromptSubmit` hook evaluates clarity.
   Vague prompts route through the `prompt-improver` skill which
   runs the 29-question
   [task-intake-due-diligence](../rules/common/task-intake-due-diligence.md)
   questionnaire.
2. **Council Phase 0 (Deep Research)** → online research, codebase
   exploration, primary-source citation per
   [`official-docs-first.md`](../rules/common/official-docs-first.md).
3. **Council Phase 1 (Discussion)** → five Core Divisions speak in
   order. Extended Eleven auto-fire on
   [trigger signals](../rules/common/council-triggers.md).
4. **Council Phase 2 (Consensus)** → GO/NO-GO decision with the
   tiebreaker matrix applied if divisions disagree.
5. **Council Phase 3 (Implementation)** → tdd-guide writes tests
   first, implementation writes code, refactor-cleaner sweeps,
   security-reviewer audits, code-reviewer reviews, e2e-runner
   validates, doc-updater documents.
6. **Hooks fire continuously** during Phase 3 — every edit triggers
   `PostToolUse` checks for discards, suppressions, hardcoded
   credentials, raw colour literals, merge-conflict markers.
7. **Verification block** closes the task — same-turn proof per
   [`verify-before-claim.md`](../rules/common/verify-before-claim.md).

## Project layering

The repo's `claude-home/` directory is a one-to-one mirror of what
gets installed to `~/.claude/`. Workspaces add their own
`<workspace>/.claude/` on top with the same shape:

```text
<workspace>/.claude/
├── CLAUDE.md                  # workspace-level rules + vendor table
├── rules/                     # project-specific rules (extend global)
├── skills/                    # project-specific skills
├── agents/                    # project-specific agents (rare)
├── plans/                     # workspace plans
├── memory/                    # workspace memories (feedback/project/reference)
└── audits/                    # workspace audits + learning events
```

Per
[`project-scoped-artifacts.md`](../rules/common/project-scoped-artifacts.md),
every workspace gets its scaffold on first significant Council-
mediated work. The scaffold template lives at
`~/.claude/templates/project-claude-scaffold/`.

[Read the project bootstrap guide](PROJECT-BOOTSTRAP.md).

## Cross-IDE integration

The repo's `ide-integrations/` directory contains drop-in configs
for VS Code, Cursor, JetBrains, and Windsurf. Each follows the same
principle: the IDE config provides the surface (extensions, settings,
keymaps), and the rules + skills + agents provide the logic.

| IDE | What ships |
| --- | --- |
| VS Code | `settings.json` (security-hardened), `extensions.json` (publisher-allowlisted), `keybindings.json` |
| Cursor | Same shape as VS Code (Cursor uses the VS Code engine) |
| JetBrains | Plugin install instructions for Claude Code [Beta], keymap XML, recommended plugins (publisher-allowlisted), per-language code style |
| Windsurf | VS Code-engine compatible settings + extensions |

The publisher allowlist comes from
[`install-allowlist.md`](../rules-library/common/install-allowlist.md).

## Cross-OS support

The repo is cross-platform by design. Two parallel bootstrap paths:

- **macOS / Linux / WSL2** — `bash bootstrap/install.sh` then
  `bash bootstrap/verify.sh`.
- **Windows (native PowerShell, no WSL2 required)** —
  `.\bootstrap\install.ps1` then `.\bootstrap\verify.ps1`.

Both flows are fully native to their host platform. Windows users
do not need WSL2 or Git Bash.

## Continuous learning

Every Council-mediated task produces learning candidates that land
in `audits/learning-events.jsonl`. The
[`continuous-learning-mandate.md`](../rules/common/continuous-learning-mandate.md)
rule + the `continuous-learning-v2` skill close the loop:
candidates are batched, surfaced to the user via AskUserQuestion,
and approved candidates update the artifact in the same session.

Patterns observed in 2+ workspaces are eligible for promotion to
global; global rules contradicted in practice are flagged for
demotion review.

## Verification + commit policy

Per [`verify-before-claim.md`](../rules/common/verify-before-claim.md),
every claim of completion attaches a same-turn verification block:

```text
Verification (this turn):
- tsc --noEmit: 0 errors
- eslint <files>: 0 warnings
- vitest run: PASS
- IDE diagnostics: 0
- proper-fixes audit: green
- docs-sync gate: feature page exists; landing accurate
```

For multi-phase plans, the active plan file declares its
`commit-policy` in the Context section. Three valid policies:
`single` (one commit at end), `per-phase` (one per phase boundary),
`per-task` (one per atomic task). Per
[`plan-completion-before-push.md`](../rules/common/plan-completion-before-push.md),
no `git push` until the plan is complete + verified — narrow
bug-fix exceptions require explicit user override.

## Why this shape

The Council protocol exists because individual model output drifts
toward the easiest plausible answer. Five divisions speaking in
order with named tiebreakers force a different shape: every task
gets architectural, implementation, quality, security, and testing
input before code is written, and Extended Divisions add
compliance, UX, ops, data, finance, risk, strategy, people, ESG,
ethics, and communications when their triggers match.

The rules + skills + agents + hooks make the protocol mechanical
rather than aspirational. The principal-level mandate ensures the
contributions are deep, cited, and decisive — not boilerplate.

## See also

- [COUNCIL.md](COUNCIL.md) — the 16-division reference
- [RULES.md](RULES.md) — the rules catalog
- [SKILLS.md](SKILLS.md) — the skills catalog
- [AGENTS.md](AGENTS.md) — the agents catalog
- [PROJECT-BOOTSTRAP.md](PROJECT-BOOTSTRAP.md) — workspace scaffold
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to add a rule / skill / agent
- [../CLAUDE.md](../CLAUDE.md) — the Council orchestrator
- [../CHANGELOG.md](../CHANGELOG.md) — release history
