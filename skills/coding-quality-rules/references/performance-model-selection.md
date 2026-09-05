# Performance + Model Selection (Always-On, Global)

> Auto-fires on every file. Sister to `model-tier-selection.md` (the CANONICAL
> model-selection policy) and the Council agent definitions in `~/.claude/agents/`.
> Model selection defers to `model-tier-selection.md`.

## Model selection → canonical in `model-tier-selection.md`

Model selection is owned by `model-tier-selection.md` — the capability-aware
ladders (role → best → floor), per-install availability with graceful
degradation, the Fable exclusions (security), and alias-vs-version behavior. Do
NOT maintain a second agent-model table here; that duplication is what went
stale. Sources of truth: that rule + each agent's `model:` frontmatter.

Alias-level summary (see the rule for the full ladders):

| Work | Tier alias |
| --- | --- |
| Strategic / long-horizon / hardest non-security | `fable → opus → sonnet` |
| Security & regulated review; deep + standard review; planning | `opus → sonnet` (Fable excluded from security) |
| Mechanical build/compile fixes + refactor | `sonnet → haiku` (the build-resolvers + `refactor-cleaner` are **sonnet**) |
| Search / docs / codemaps | `haiku → sonnet` |

Aliases (`opus` / `sonnet` / `haiku` / `fable`) auto-resolve to the current model
of each tier — today `opus` → `claude-opus-5`. Never pin a dated ID.

## Per-task escalation

Even with opus-by-default, some sessions benefit from explicit
escalation:

- **Architectural pivot mid-task**: stay on opus.
- **Cross-language migration** (e.g., Python → Rust port): opus,
  with extended-thinking budget raised.
- **Security incident response**: opus (`security-reviewer`).
- **Compliance / regulatory review**: opus (multi-step legal +
  technical analysis).
- **AI / ML ethics review**: opus.

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

1. **Strategic compaction** (per the `verification-loop` skill's
   "Strategic context management" section) at logical phase
   boundaries.
2. **Sub-agent delegation** — spawn an Agent (Explore / general-
   purpose) to do the next chunk in its own context window.
3. **Plan-file persistence** — write progress + state to
   `~/.claude/plans/<slug>.md` so the next session resumes
   without re-deriving context.

## Extended Thinking + Plan Mode

Extended thinking is enabled by default, reserving up to 31,999
tokens for internal reasoning.

Control extended thinking via:

- **Toggle**: Option+T (macOS) / Alt+T (Windows/Linux)
- **Config**: Set `alwaysThinkingEnabled` in `~/.claude/settings.json`
- **Budget cap**: `export MAX_THINKING_TOKENS=10000` (lift to
  31,999 for opus-heavy work)
- **Verbose mode**: Ctrl+O to see thinking output

For complex tasks:

1. Ensure extended thinking is enabled (on by default).
2. Enable **Plan Mode** for structured approach.
3. Use multiple critique rounds for thorough analysis.
4. Use split-role sub-agents for diverse perspectives.

## Build Troubleshooting

If build fails:

1. Use `build-error-resolver` (TS/JS/TSX) or `go-build-resolver`
   (Go) agent — both on opus.
2. Analyse error messages.
3. Fix incrementally per `proper-fixes-first.md` — root cause,
   not symptom.
4. Verify after each fix; never batch fixes that mask each other.

## Cross-references

- `~/.claude/agents/*.md` — every agent declares its `model:`
  in frontmatter
- `task-intake-due-diligence.md` Q16 (cost model) — task-level
  cost is part of the intake; opus-by-default sits in the
  context of the user's quality-first preference
- `extreme-lint-policy.md` — strictness thresholds the agents
  enforce
- `proper-fixes-first.md` — never trade quality for symptom-only
  fixes

## Why this rule exists

Multi-stack development (Go + TypeScript + Python + Java + SQL +
IaC) within a single session benefits from opus's broader
knowledge surface — quality drops between languages are visible
when a session pivots from one stack to another. Cost is a
secondary consideration; the user's explicit preference is quality
first, and the rule codifies that.

User directive (verbatim): **"use different models for things
they are good at and make code writing high quality but not too
expensive"** AND **"I prefer opus for the coding, reviewing and
planning. also remember we are dealing with multiple stacks /
languages"** — resolved as opus-by-default for coding / reviewing
/ planning agents, haiku for doc / codemap work, sonnet rarely
used.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New coding / reviewing / planning agent created with `model: sonnet` (opus-default policy weakening)
- New agent on `model: haiku` for non-mechanical work (haiku scope violation)
- Cross-language session pivots show quality drop (opus's broader knowledge surface not engaged)
- Context window > 80% full and no strategic compaction taken (context discipline weakening)
- Sub-agent delegation skipped when context filling rapidly
- Plan-file persistence skipped at logical phase boundaries (plan re-derivation cost incurred)
- Extended-thinking budget hit ceiling repeatedly without escalation to higher tier
- Build failure not delegated to `build-error-resolver` / `go-build-resolver` agent

**Refinement candidates**:

- New agent role row when a recurring expertise gap surfaces (e.g., Solidity reviewer, Terraform refactor specialist)
- Tightening of the haiku scope when a doc-class artifact proves to need depth (codemap quality drops)
- New escalation row when an agent's track record on a domain warrants per-task model bump (e.g., security-incident response → opus by default)
- New cross-reference when a sister rule (council-default, verification-loop skill) provides the canonical delegation flow

---

<!-- ============================================================
     Section: testing.md (from rules/common/)
     ============================================================ -->
