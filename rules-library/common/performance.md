# Performance + Model Selection (Always-On, Global)

> Auto-fires on every file. Sister to `model-tier-selection.md` (the CANONICAL
> model-selection policy) and the Council agent definitions in
> `~/.claude/agents/`. This file holds general performance guidance (context
> window, thinking/effort, build troubleshooting); **model selection defers to
> `model-tier-selection.md`.**

## Model selection → canonical in `model-tier-selection.md`

**Model selection is owned by [`model-tier-selection.md`](../../rules/common/model-tier-selection.md).**
It defines the capability-aware ladders (role → best-for-the-job → floor), the
per-install availability resolution (best model AVAILABLE, graceful degradation),
the Fable exclusions (security), and the alias-vs-version behavior. Do NOT
maintain a second agent-model table here — that duplication is exactly what went
stale (it once pinned Opus 4.7 and mislabelled the mechanical resolvers). The
sources of truth are that rule + each agent's `model:` frontmatter.

One-line summary of the alias-level policy (see the rule for the full ladders):

| Work | Tier alias | Notes |
| --- | --- | --- |
| Strategic / long-horizon / hardest non-security | `fable → opus → sonnet` | Fable only here, where available |
| Security & regulated review; deep + standard review; planning | `opus → sonnet` | Fable excluded from security |
| Mechanical build/compile fixes + refactor | `sonnet → haiku` | the build-resolvers + `refactor-cleaner` are **sonnet**, not opus |
| Search / docs / codemaps | `haiku → sonnet` | cheapest that does the job |

Aliases (`opus`, `sonnet`, `haiku`, `fable`) auto-resolve to the current model of
each tier — today `opus` → `claude-opus-5`. Never pin a dated ID in agent
frontmatter or a ladder. New agent default: `opus` for deep review/planning,
`sonnet` for mechanical, `haiku` for pure-mechanical doc work — per the ladder.

## Context Window Management

Avoid the last 20% of the context window for:

- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower-context-sensitivity tasks (safe in the last 20%):

- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

When context fills, prefer:

1. **Strategic compaction** (per the `verification-loop` skill's "Strategic
   context management" section) at logical phase boundaries.
2. **Sub-agent delegation** — spawn an Agent (`Explore` / `general-purpose`) to
   do the next chunk in its own context window.
3. **Plan-file persistence** — write progress + state to
   `~/.claude/plans/<slug>.md` so the next session resumes without re-deriving
   context.

## Thinking + Effort

Current models (Opus 5, Sonnet 5, Fable 5) use **adaptive thinking** — Claude
decides depth per request; there is no fixed `budget_tokens` (the old
extended-thinking budget is deprecated/removed on Opus 4.7+ and the 5-series —
per the `claude-api` skill). Control depth + spend with the **effort** parameter
(`low` / `medium` / `high` / `xhigh` / `max`), which defaults to `high` on the
API and Claude Code. Use `high`/`xhigh` for intelligence-sensitive and agentic
work; `low`/`medium` for routine or latency-sensitive tasks. Fable 5 has adaptive
thinking always on (omit the `thinking` param).

For complex tasks: enable Plan Mode for a structured approach; use multiple
critique rounds; use split-role sub-agents for diverse perspectives.

## Build Troubleshooting

If a build fails, delegate to the matching per-stack resolver (all `sonnet`,
`mechanical-build-fix` role): `build-error-resolver` (TS/JS), `go-build-resolver`
(Go), `python/rust/java/dotnet/ruby/php/swift-build-resolver`. Then:

1. Analyse the error messages (collect ALL, not just the first).
2. Fix incrementally per `proper-fixes-first.md` — root cause, not symptom; no
   suppression directives.
3. Verify after each fix; never batch fixes that mask each other.

## Cross-references

- [`model-tier-selection.md`](../../rules/common/model-tier-selection.md) — the
  CANONICAL model-selection policy (ladders, availability, exclusions, aliases)
- `~/.claude/agents/*.md` — every agent declares its `model:` alias in frontmatter
- `claude-api` skill — current model IDs / pricing / thinking + effort semantics
- `task-intake-due-diligence.md` — Q16 (cost model) sits in the user's
  quality-first preference
- `proper-fixes-first.md` — never trade quality for symptom-only fixes

## Why this rule exists

Multi-stack development benefits from the right tier per task: deep review and
planning on Opus (broad cross-language knowledge surface), mechanical build/
refactor on Sonnet (deterministic, near-Opus on code), docs/search on Haiku, and
the hardest strategic work on Fable where the install can field it. Cost is
secondary to quality, but over-provisioning routine work is waste — the ladder
in `model-tier-selection.md` encodes both. This file previously duplicated that
policy and drifted (pinned Opus 4.7, mislabelled the mechanical resolvers as
opus); it now defers to the single source.

User directive (verbatim): **"use different models for things they are good at
and make code writing high quality but not too expensive"** AND **"I prefer opus
for the coding, reviewing and planning. also remember we are dealing with
multiple stacks / languages"** — realised as the capability-aware ladder
(`model-tier-selection.md`): opus for deep review/planning, sonnet for mechanical,
haiku for doc/search, fable for the hardest strategic work where available.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- A second agent-model table reappearing here (or in a skill) that can drift from
  `model-tier-selection.md` (duplication regression — this rule's own past failure)
- An agent's frontmatter pinned to a dated model ID instead of a tier alias
- A mechanical build/refactor agent set to `opus` (ladder-floor violation — should be sonnet)
- Context window > 80% full with no strategic compaction taken
- Stale `budget_tokens`/extended-thinking guidance reappearing (adaptive + effort superseded it)

**Refinement candidates**:

- New cross-reference when `model-tier-selection.md` adds a role class or tier
- Tightening of the context-window discipline if late-window quality drops recur
- New per-stack resolver row when a new build ecosystem gains an agent
