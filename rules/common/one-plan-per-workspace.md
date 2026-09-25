# One Plan Per Workspace (Always-On, Global)

> Sister to `plan-task-breakdown.md` (how the plan is shaped), `plan-execution-progress.md`
> (how it stays current), `project-memory.md` (where the pointer lives),
> `project-scoped-artifacts.md` (where plans live), `no-bloat.md` (one home per thing).
>
> **Size budget: 5 KB** — `token-budget.mjs --check`.

## Core Principle

**A workspace has exactly ONE plan file: the Active plan its memory index names. New work
ENRICHES that plan as a new part or phase. It never starts a second file.** Audits,
remediation waves, parity backlogs, sub-feature plans and sequencing notes are all sections
of the one plan. Two plans for one workspace always drift apart. Each goes stale in the
places the other moved, and nobody can say which one is true.

## What counts as a plan

Any top-level markdown file in `<workspace>/.claude/plans/` or in a nested repo's
`.claude/plans/`, plus the file the workspace's `Active plan:` pointer names, wherever it
lives. The workspace and its nested repos share ONE plan. Subfolders of a plans directory
hold data (manifests, fixtures), not plans.

**The shared `~/.claude/plans/`.** Plan mode writes there for every project. The file there
that a workspace's pointer names IS that workspace's plan (`project-scoped-artifacts.md`
rule 9). Any other file there is a draft: MERGE it into the Active plan before executing,
and never execute from it.

## The Active-plan pointer

The workspace memory index (`MEMORY.md`) carries one line, `Active plan: <absolute path>`,
or `Active plan: none`. `lib/project-context.js` reads it, and so does the docs-sync gate. It
is the only way a gate knows which plan is this workspace's. Keep it pointing at the one plan.

## Consolidating a violation

When a workspace is found holding more than one plan:

1. Choose the Active plan (the pointer's target, else the most complete).
2. Merge every other plan into it as parts or phases. Diff to prove nothing was lost:
   every task, status, decision and citation is carried forward.
3. Archive the superseded files recoverably OUTSIDE `.claude/plans/` (for example under
   `~/.claude/.local/plans/<workspace>/`). Never leave them beside the plan.
4. Update the `Active plan:` pointer, and any reference to the old files.

## Enforcement

`one-plan-gate.js` (PreToolUse, `Edit|Write|MultiEdit` and `Bash`):

- **Blocks** creating a new top-level plan when the workspace already has one: in that
  directory, in an enclosing workspace's plans directory (searched only inside the
  session's workspace, never at `$HOME`), or where the pointer names. It covers Write and
  Bash writes (redirects, copy/move/touch tools, `sh -c`, `eval`, inline interpreters),
  judged on what a command runs, not what it mentions.
  Renaming one of the workspace's plans is allowed.
- **Advises** when editing a plan that has siblings (consolidate them), and when a new draft
  lands in `~/.claude/plans/` while the workspace names an Active plan (merge it).
- **Fails open** on any internal error.
- Modes: `CLAUDE_ONE_PLAN_GATE=block` (default) | `warn` | `off`. An unknown value blocks.
- **Known limits:** paths in variables, archive extractors, editors that write (`sed w`,
  `awk >`) and scripts run from a file are not seen. Nested repos are not searched from
  above, so a plan made in one before its workspace has a plan passes. The pointer, named
  in each nested repo's memory, closes that gap.

## Anti-patterns

- **Plan-per-initiative**: "remediation.md", "audit-plan.md" beside the master. Make it a part.
- **Prose-only rule**: "only one plan remains" written inside the plan. Nothing reads it.
- **Delete-to-consolidate**: dropping a superseded plan without the nothing-lost diff.
- **Stale pointer**: `Active plan:` naming a file that was merged away.

## Provenance

Owner directive (2026-09-21), verbatim: **"strict planning rule to never have 2 plans per
project or workspace"** and **"This is why we added and had a rule to ensure we can only
have one plan per project and only enrich it when we need to do new things. If we had kept
that rule we would not have had 2 plan files and led ourselves to this level of conflict and
staleness. This remediation plan or any other addition could have been added to the main
master"**.

The incident: a workspace consolidated five plans into one and wrote "exactly one plan
remains" inside that plan. Nothing enforced it. A later audit started its own plan. The
master then went unedited for ten days while about 75 commits landed, its counters went
stale in both directions, and the two plans disagreed. By then the directory held six plan
files again. A rule that lives only as prose, inside the artefact it governs, binds nobody.
That is why this rule has a gate.

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill. Invoke it when refining this rule: it does not load
by itself. They are instructions for maintaining THIS ARTIFACT, not for doing
the task at hand, so they are not carried on every turn.
