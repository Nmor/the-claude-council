# Rule Authoring — Global vs Project (Always-On, Global)

> Auto-fires on every file. Sister to `plan-task-breakdown.md`,
> `plan-execution-progress.md`, `proper-fixes-first.md`, and the
> project-scoped-artifacts work. This rule governs WHERE a new rule
> lands when one is added mid-work.

## Core Principle

**Every rule added mid-work is classified before it's written:
either reusable guidance (lands in `~/.claude/rules/common/` and
applies to every project) OR project-specific guidance (lands in
`<project>/.claude/rules/` and applies only to that codebase).
Global rules NEVER contain project-specific names, paths, dates,
or incidents. Project rules MAY reference the global rule they
extend.**

The pattern this rule prevents: project-specific learnings leaking
into global, polluting the shared guidance surface; OR reusable
guidance being lost to a single project, when other projects would
benefit from it.

## Hard rules (summary)

1. Classify the rule BEFORE writing it
2. Global rules contain ONLY pure guidance
3. Project rules live under `<project>/.claude/rules/`
4. Mid-work rule additions follow the same flow
5. Continuous improvement of global rules
6. Demotion path
7. Promotion path
8. The workspace `CLAUDE.md` is the project index
9. Skills + agents follow the same classification
10. The classification decision is recorded

## Full text

The hard rules above are the always-on trigger — enough to know the rule applies and
what it demands. Their full text (worked examples, anti-patterns, tables, procedures)
lives in the
**`council-maintenance`** skill, which fires when you touch `.claude/rules/**`, `.claude/skills/**`, `.claude/agents/**` or `CLAUDE.md` — i.e. exactly when you are authoring or moving a rule.

Read it before acting on this rule. Carrying the full body on the always-on Floor cost
every turn of every unrelated task for guidance that applies at one specific moment.

## Cross-references

- `plan-task-breakdown.md` — every rule addition is one task in
  the active plan
- `plan-execution-progress.md` — rule additions surface in the
  progress update
- `proper-fixes-first.md` — a "quick rule" that lands in the
  wrong location is a shortcut, not a proper fix
- `no-silent-drops.md` — silently absorbing project specifics
  into global is a drift pattern
- `project-scoped-artifacts.md` — workspace `.claude/` scaffold
  standardisation

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill, which auto-fires when you touch a rule, skill,
agent or CLAUDE.md — i.e. exactly when you are refining the framework. They are
instructions for maintaining THIS ARTIFACT, not for doing the task at hand, so
they load then rather than on every turn.
