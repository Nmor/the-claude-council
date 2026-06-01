# Plan-Execution-Progress Rule (Always-On, Global)

> Auto-fires on every file. Companion to `done-criteria.md`,
> `no-overclaim.md`, `verify-before-claim.md`, `plan-task-breakdown.md`,
> and any active plan file under `~/.claude/plans/` or
> `<project>/.claude/plans/`.

## Core Principle

**When executing a multi-phase plan (anything with explicit phase
boundaries, a TodoWrite list of 3+ items, or a Council-approved
implementation), the agent produces detailed, structured progress
updates that let the user understand at a glance: what just
happened, what changed numerically, what's pending, what was
verified, and what comes next — without having to dig through
tool output.**

The pattern this rule prevents: silent batches of edits where the
user only sees an end-of-run summary, can't intervene mid-stream
because they don't know the agent's current direction, and can't
trust completion claims because they can't audit the trajectory.

## Hard rules

### 1. Phase-header announcements

Every phase begins with a one-line announcement BEFORE the first
tool call of that phase. The header names:
- The phase id (matches the plan file)
- A short summary of the phase's goal
- The first concrete action

### 2. Numbered before/after on bulk changes

Any operation that touches 5+ files, deletes a directory, or moves
significant data MUST report the count + size, before and after.
Not "cleaned up the cache" — the exact bytes moved.

### 3. Verification-block per phase

Each phase ends with a verification block listing the gates that
passed THIS turn (per `verify-before-claim.md`):

```
Phase <id> verification:
- <gate 1>: <result this turn>
- <gate 2>: <result this turn>
- <gate 3>: skipped (<reason>)
```

If a gate was skipped, name it explicitly. No silent skips.

### 4. Explicit next-step line

Every progress update ends with a single line stating the next
concrete action, so the user can redirect before it lands.

NOT: "moving on" / "continuing" / "next step." Always: the exact
next file / command / decision.

### 5. Commit boundaries are progress milestones

When a phase produces a commit, the progress update includes:
- The commit SHA + subject (so the user can `git show <sha>`)
- The branch name (so multi-phase workflows stay traceable)
- The count of files in the commit

### 6. Blockers surface immediately with recovery direction

When a phase hits a blocker, the update names:
- The blocker (specific error, not "something went wrong")
- The root cause (not the symptom — per `proper-fixes-first.md`)
- The recovery direction (what to try next, OR what user input is
  needed)
- The fallback (if the recovery fails)

NEVER silent retry. NEVER "I'll work around it" without surfacing.

### 7. Per-tool-call narration: phase tag minimum

The "before each tool call" narration described in the assistant
guidelines is the floor. For plan execution, the narration MUST
include WHICH phase + WHICH gate the call belongs to. NOT just
"Checking now." The phase tag is what makes a long multi-phase
session navigable.

### 8. Plan-file is the source of truth — and it stays current

When a phase completes, the agent updates the plan file to reflect
the new state (mark the phase ✓, add a one-line outcome note). The
plan is a living artifact, not a frozen contract.

### 9. TodoWrite reflects real state

The TodoWrite list mirrors the plan's phase / task boundaries
(per `plan-task-breakdown.md`). As tasks finish, they move to
`completed` IMMEDIATELY — not batched at end of session. The user
can read the todo list at any moment and see exact progress.

### 10. No silent skip-and-continue

If the agent decides to skip a phase, defer it, or reorder phases,
the progress update names:
- Which phase is being skipped/deferred/reordered
- Why (the constraint that drove the change)
- When the deferred phase will resume
- Whether the user needs to approve the re-ordering

Re-ordering without telling the user is a silent-drop variant
(per `no-silent-drops.md`).

## Canonical progress-update shape

```
<phase id> complete.

Changes:
- <bullet — file touched, count, size>
- <bullet — file touched, count, size>
- <bullet — file touched, count, size>

Verification:
- <gate 1>: <result this turn>
- <gate 2>: <result this turn>
- <gate 3>: <result this turn or "skipped: <reason>">
- code-graph (touched files + phase-boundary sweep, per
  `code-graph-validation.md` rule 8): outbound N/N resolve;
  inbound: 0 orphans; cross-artifact integrity: green

Next: <one-line concrete action>.
```

## Anti-pattern: what NOT to write

```
Done with <phase>. Moving on.
```

This violates rules 2, 3, 4, 5 simultaneously. The user has no
visibility into what happened, what passed, what's next, or where
to look in git.

## When this rule fires

- Any session containing a TodoWrite list with 3+ pending items
- Any session reading a plan file with explicit phase headings
- Any session that says "executing the plan" / "implementing the
  refactor" / "shipping the migration"
- The Council Protocol's Implementation phase — every Council-
  mediated task is plan execution by definition

## Cross-references

- `plan-task-breakdown.md` — granular task structure these updates
  report against
- `plan-completion-before-push.md` — push gate that runs after the
  plan is fully verified
- `done-criteria.md` — every phase end runs the checklist
- `code-graph-validation.md` — phase-boundary code-graph sweep
  is part of every verification block
- `no-overclaim.md` — never claim phase-done without verification
- `verify-before-claim.md` — verification paired with claim, same
  turn
- `no-silent-drops.md` — silently skipping a phase is a silent drop
- `no-silent-failures.md` — silently retrying a failed gate is a
  silent failure of the gate itself

## Why this rule exists

Without explicit progress structure during multi-phase execution,
the user can't tell whether a phase finished cleanly or partially,
which side-effects actually happened vs were only attempted,
whether safety gates were verified or guessed, and what the next
concrete action is. The cost of the structured update is one tool
call's worth of prose. The cost of leaving the user blind through
a multi-phase session is interrupt fatigue, mistrust of completion
claims, and re-verification work later.

User directive (verbatim): "Rule should exist for detailed plan
execution and progress updates."

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Phase-header announcement missing before first tool call of that phase (rule 1 weakening)
- Bulk change (5+ files, directory delete, large data move) reported without before/after counts (rule 2 violation)
- Verification block missing from a phase end (rule 3 violation)
- Phase progress update ends without an explicit next-step line (rule 4 weakening)
- Commit boundary reached without SHA + subject + branch + file count in the progress update (rule 5 weakening)
- Blocker hit and surfaced as "something went wrong" without root cause + recovery direction (rule 6 violation)
- Per-tool-call narration omits phase tag in long multi-phase sessions (rule 7 weakening)
- Plan file not updated after a phase completes (rule 8 weakening — frozen contract anti-pattern)
- Phase skipped or reordered without explicit user-visible justification (rule 10 violation)

**Refinement candidates**:
- New row in the canonical progress-update shape when a new artifact class (commit / tag / push / migration) needs reporting
- Tightening of the "bulk change" threshold (currently 5 files) when small-batch silent edits prove load-bearing
- New cross-reference when a sister rule (verify-before-claim, no-silent-drops) provides a per-phase gate
- New blocker-shape template when a recurring blocker class (auth-expired, dep-not-installed, env-not-set) emerges
