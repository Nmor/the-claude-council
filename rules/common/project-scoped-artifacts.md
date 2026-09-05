# Project-Scoped Artifacts Rule (Always-On, Global)

> Auto-fires on every file. Sister to
> `rule-authoring-global-vs-project.md` (the classification
> rule), the workspace `CLAUDE.md` of each project, and the
> scaffold template at `~/.claude/templates/project-claude-scaffold/`.

## Core Principle

**Every project the user works in spawns its own `.claude/`
directory with a standardised scaffold (rules, skills, agents,
plans, memory, audits) on its first non-trivial Council-mediated
task. The scaffold is additive to global — workspace rules
extend global, never relax. As the project evolves, learnings
get captured in the workspace `.claude/`; learnings that appear
in 2+ workspaces are eligible for promotion to global.**

## Hard rules (summary)

1. First-touch detection
2. Scaffold structure (canonical)
3. Scaffold template lives at the global root
4. Workspace rules ADD to global; never override down
5. Learning loop (workspace-side)
6. Promotion path (workspace → global)
7. Demotion path (global → workspace)
8. The first significant edit triggers scaffold creation
9. Plan files belong in the workspace `.claude/plans/`
10. Workspace memories belong in the workspace `.claude/memory/`
11. Plans + audits are always gitignored + never referenced as repo paths

## Full text

The hard rules above are the always-on trigger — enough to know the rule applies and
what it demands. Their full text (worked examples, anti-patterns, tables, procedures)
lives in the
**`council-maintenance`** skill, which fires when you touch `.claude/**` — i.e. exactly when the workspace scaffold is in play.

Read it before acting on this rule. Carrying the full body on the always-on Floor cost
every turn of every unrelated task for guidance that applies at one specific moment.

## Cross-references

- `rule-authoring-global-vs-project.md` — classification of new
  rules (global vs project) at write time
- `plan-task-breakdown.md` — every project's plans live in its
  `<workspace>/.claude/plans/`
- `auto-skills.md` — file-to-skill mapping is global; workspace
  skills add to it
- `~/.claude/templates/project-claude-scaffold/` — the canonical
  scaffold template
- The workspace `CLAUDE.md` of each project — declares the
  vendor table + project-specific Council divisions to engage

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill, which auto-fires when you touch a rule, skill,
agent or CLAUDE.md — i.e. exactly when you are refining the framework. They are
instructions for maintaining THIS ARTIFACT, not for doing the task at hand, so
they load then rather than on every turn.
