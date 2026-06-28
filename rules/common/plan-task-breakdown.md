# Plan-Task-Breakdown Rule (Always-On, Global)

> Auto-fires on every file. Sister to `plan-execution-progress.md`
> (this rule governs PLAN AUTHORING; that rule governs PLAN
> EXECUTION). Companion to `done-criteria.md`,
> `plan-completion-before-push.md`, and `no-overclaim.md`.

## Core Principle

**Every plan — internal, Council-approved, or user-facing —
decomposes the work into a long list of small, atomic, verifiable
tasks. Each task is the smallest unit of work that produces a
useful, verifiable outcome. Big goals appear as the sum of many
small tasks, never as a single coarse "do everything in this
area" line.**

The pattern this rule prevents: a plan whose phases say "build the
marketplace feature" with no further breakdown. The reader can't
estimate the work, can't spot missing steps, can't reorder
priorities, can't interrupt before a wrong direction lands, can't
track progress mid-phase, and can't verify completeness when the
phase reports done.

## Hard rules

### 1. Atomic granularity

Each task is the smallest unit that:

- Produces a single verifiable outcome (one file written, one
  function refactored, one config gate added, one commit boundary)
- Can be completed in roughly 15 minutes to 4 hours by a single
  agent
- Has a clear "done" predicate (test passes, file exists, grep
  returns the expected count, gate emits green)
- Doesn't require a sub-plan to execute

A task that says "rewrite the auth module" is too coarse. An
atomic task names a file path, the change shape, and a verifiable
outcome.

### 2. Long lists are the norm, not the exception

A real-world plan typically produces:

- **Small fix**: 3–8 tasks
- **Medium feature**: 15–40 tasks
- **Large migration / refactor**: 50–200 tasks
- **Multi-phase rebuild**: 200–500+ tasks across phases

If the plan has < 10 tasks for non-trivial work, the breakdown is
wrong — go finer.

### 3. Hierarchy: Phase → Sub-step → Task

Every plan uses a three-level structure. The canonical shape —
not the specifics — is universal across plans:

```text
Phase N — <one-line goal>
├── N.A — <one-line sub-step goal>
│   ├── Task N.A.1 — <atomic action with path + outcome> · verify: <predicate>
│   ├── Task N.A.2 — <atomic action with path + outcome> · verify: <predicate>
│   ├── ...
│   └── Task N.A.k — <commit + verification gate>      · verify: <predicate>
└── N.B — <next sub-step>
    ├── Task N.B.1 — ...
    └── ...
```

Each Task line is ≤ 1 sentence, names a verifiable outcome, and
fits the granularity rule above. Specific task content lives in
the project's plan file under `~/.claude/plans/<slug>.md` or
`<project>/.claude/plans/<slug>.md` — never in this rule.

### 4. Every task has explicit verification

Each task in the plan names HOW it will be verified done — a
green/red predicate (e.g., a grep that returns 0, a `du` size
delta, a test that passes, a `git log` line that exists). No "I
think this worked."

### 5. Tasks list THE OUTCOME, not the activity

Wrong shape: "Investigate the orphan dirs."
Right shape: "Identify orphan dirs not paired with any active
session. Report count + total size."

The activity is implicit; the outcome is what the next agent /
user can act on. Outcome-shaped tasks are also easier to mark
done.

### 6. Tasks include their preconditions

When a task has prerequisites (another task complete, a file
exists, a gate is green), the plan names them as a `Precondition:`
field. Precondition blocks form the dependency graph; the agent
can parallelize tasks that don't share a precondition.

### 7. Tasks include their commit boundary

Each task names whether it lands in its own commit or batches
with sibling tasks under a single commit boundary. Atomicity
matters when sibling tasks must land together (e.g., a config
change and the code that depends on it).

### 8. TodoWrite mirrors the granular task list

`TodoWrite` is the live execution surface — it must reflect the
plan's task IDs, not just phase names. As tasks complete, they
move to `completed` IMMEDIATELY (per `plan-execution-progress.md`).

A `TodoWrite` list with N phase-level entries for a 10×N-task plan
is wrong. Either:

- Use phase-level entries that LINK into the plan file's task
  list (acceptable for very long plans), AND tick the plan file's
  tasks as they finish, OR
- Mirror every task in TodoWrite (preferred for plans under 100
  tasks)

### 9. Plans grow during execution

When mid-execution a task reveals new sub-work (a missed gate, a
discovered orphan, a hidden dependency), the agent:

1. Pauses the current task
2. Adds the new tasks to the plan + TodoWrite with explicit IDs
3. Resumes execution

The plan is a living artifact. NEVER smuggle un-listed work into a
phase. NEVER drop discovered work because "the plan didn't list
it." Either it gets added to the plan and tracked, OR it's
explicitly deferred with the user's awareness.

### 10. Every plan ends with a bloat-removal phase

The final phase of every multi-phase plan (BEFORE the
plan-completion verification + commit) is a **bloat-removal
phase**. It fires only when every prior phase reports 100%
verified done, and it removes everything the plan made obsolete:

| Class | Examples |
| --- | --- |
| Stub redirects | Files left as 1-line redirects after consolidation; once references are migrated, delete the stubs |
| Deprecated wrappers | Backward-compat shims kept "just in case" through the migration |
| Now-unused dependencies | Packages whose last consumer the plan removed |
| Now-unused exports | Functions/types only the deprecated path used |
| Empty directories | Source / test / docs dirs whose last file the plan moved out |
| Dead config keys | Env vars / feature flags / TF locals the plan no longer reads |
| Old migrations / fixtures | Stale seed data, dev-only mocks that drifted from prod |
| Workaround comments | TODO / FIXME / XXX placeholders the plan's proper fix made redundant |
| Outdated docs | Wiki pages / README sections that describe the old architecture |
| Sanitized intermediate artifacts | Temp files, snapshot dumps, `.tmp` / `.bak` left by previous phases |

The bloat-removal phase MUST run AFTER:

- Every prior phase's verification block is green this turn
- Every consumer of the about-to-be-removed surface has migrated
- A link-integrity grep shows zero inbound references to each
  target of removal

The bloat-removal phase MUST run BEFORE:

- The plan-completion commit (per `plan-completion-before-push.md`)
- Any tag, release, or PR merge

Skipping or deferring the bloat-removal phase is a silent drop
(per `no-silent-drops.md`) — the plan finished WITH the bloat
still present, which is a different outcome than the user
expected. If genuine reason exists to defer (e.g. consumer not
yet migrated, observability needs a cooldown window), document
the defer in the plan with an explicit re-run date.

### 11. Tasks are written so an interruption resumes cleanly

After each task completes, a fresh agent (or fresh session) should
be able to read the plan + TodoWrite + git log and resume from
the next pending task without re-deriving context.

This means tasks include:

- The file paths they touch (absolute or repo-rooted)
- The commands they run (verbatim)
- The expected outcome (verifiable predicate)
- The reason they exist (one line — what bug / risk this closes)

A task that says "fix the thing" is unrecoverable on resume.

## Canonical plan-marker naming convention (mandatory)

EVERY plan artifact — plan, wave, phase, task, gap, review, finding —
uses ONE typed grammar, always rooted at `P<plan-number>` with
dot-segments. One grammar ⇒ one hook family catches every stray.

```text
P<plan>.<segment>[.<segment>…]    root form (P + digits, dot-segments)
```

| Artifact | Canonical form | Example |
| --- | --- | --- |
| Plan | `P<n>` | `P11` |
| Wave | `P<n>.W<k>` | `P11.W2` |
| Phase | `P<n>.<PHASE>` (letter or `PH<k>`) | `P9.C`, `P11.PH3` |
| Task / item | `P<n>.<wave\|phase>.<item>` | `P11.W2.G2`, `P9.C.8` |
| Gap | `P<n>.GAP<k>` | `P11.GAP8` |
| Review | `P<n>.RV<k>` (or `P<n>.W<k>.RV`) | `P11.RV1`, `P11.W2.RV` |
| Finding | `P<n>.F<k>` | `P11.F3` |

- ALWAYS prefix with `P<digits>` and use dot-segments. NEVER invent a
  bare ad-hoc scheme — `C6`, `R-W2`, `G1`, AND standalone `GAP8` /
  `GAP-9` are all DEPRECATED: a gap is `P<n>.GAP<k>`, a review is
  `P<n>.RV<k>`. The typed `P<n>.…` form is the ONE allowed shape, so a
  single hook family covers every artifact type.
- This is not cosmetic: the global `no-discards` hook (`task-pointer`
  rule) catches the `P<n>.<seg>.<seg>` form in any committed
  source/test/IaC with ZERO false positives (cell `C6`, hex
  `#C6C6C6`, note `G1`, version `1.2.3` are all correctly ignored).
  Conform and a stray marker is auto-blocked at edit time; deviate and
  it ships silently. The hook ALSO catches the deprecated standalone
  forms — `R-W<n>` and `GAP<n>`/`GAP-<n>` — as belt-and-braces, so a
  leaked gap pointer (`GAP8`) is blocked even though new plans must use
  the `P<n>.GAP<k>` form.
- Plan-marker IDs live in the gitignored plan + the commit/PR body
  ONLY — never in a source/test comment (per
  `feedback-no-plan-markers-in-code`). The convention exists so that
  IF one leaks, the hook catches it.

## Canonical task-row shape

```text
Task <id> — <verb> <object> [in <file/dir>] · verify: <predicate>
```

Examples of correctly-shaped rows (generic, substitute your
domain):

```text
Task M.N.1 — Read primary-source spec / RFC / regulation §<section>
             · verify: docs/provider-research/<name>.md cites the URL
Task M.N.2 — Draft <artifact> at <path> per the template
             · verify: file exists, structural checks pass,
               code-graph: outbound refs in <artifact> resolve
Task M.N.3 — Wire <artifact> into the index / auto-discovery layer
             · verify: grep across consumers returns the new entry,
               code-graph: inbound edges to <artifact> present
Task M.N.4 — Commit atomically: <artifact> + index update together
             · verify: `git log -1` shows the commit; `git status`
               clean; code-graph pre-commit sweep green
```

Per `code-graph-validation.md` rule 7, every atomic task that
touches code, config, or wiring carries a code-graph predicate
in its verification field. The predicate is mechanical (the
incremental check exits clean on the touched surface + its
immediate neighbors).

## How this rule shapes the plan file

Every plan file under `~/.claude/plans/` or `<project>/.claude/
plans/` MUST follow this structure:

```text
# <Plan slug>

## Context
<the WHY — what problem, what outcome>

## Critical files
<paths>

## Execution plan

### Phase N — <one-line goal>
**Sub-steps**:
- N.A — <one-line goal>
**Tasks**:
- [ ] N.A.1 — <atomic task> · verify: <predicate>
- [ ] N.A.2 — <atomic task> · verify: <predicate>
...
```

The plan length is intentional. A long plan for a non-trivial
rebuild is correct; a two-page plan for the same work is wrong.

## Anti-pattern: what NOT to write

```text
Phase N: Add domain skills
  - Security
  - Finance
  - Design
  - AI/ML
```

This violates rules 1, 3, 4, 5, 6, 7 simultaneously. The reader
can't estimate, can't reorder, can't track, and the agent can't
resume after interruption.

## Cross-references

- `plan-execution-progress.md` — how the agent reports progress
  through this task list during execution
- `plan-completion-before-push.md` — push gate runs only after
  every task in the plan is ticked + verified
- `done-criteria.md` — every task's "done" runs the gate
- `code-graph-validation.md` — every atomic task's verification
  predicate includes a code-graph check when the task touches
  code, config, or wiring
- `no-overclaim.md` — never claim a phase done with un-ticked
  tasks
- `no-silent-drops.md` — never silently drop a task from the list
- `verify-before-claim.md` — task done = verified done

## Why this rule exists

Multi-phase plans approved without per-phase task breakdowns
produce predictable failures: the user cannot tell what sub-step
the agent is currently on; the agent skips small mandatory items
because they weren't named in the plan; resuming a session
requires re-deriving the entire phase shape; completion claims
arrive without anyone able to audit them. The cost of writing
many small tasks at plan time is some extra planning hours. The
cost of executing fuzzy phases is repeated re-verification,
mistrust, and lost work when a sub-step is silently skipped.

User directive (verbatim): "plans should always have proper
breakdown of tasks so that you always have a long list of small
items that lead to big goals."

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Phase header lacks a sub-step or task list (granularity rule violation)
- A "task" in the plan spans > 4 hours of work (atomic-task threshold breached)
- Plan has < 10 tasks for non-trivial work (rule 2 weakening)
- Tasks describe activity ("investigate X") instead of outcome ("identify Y; report count")
- Verification predicate missing from a task row (rule 4 weakening)
- Plan completes without a bloat-removal phase (rule 10 violation)
- Mid-execution work added without updating the plan + TodoWrite (rule 9 weakening)
- TodoWrite list has phase-level entries for a 50+-task plan with no task-level mirror

**Refinement candidates**:

- New row in the task-row shape table when a new artifact kind recurs (e.g., new IaC type, new schema migration template)
- Tightening of the atomic-task time threshold when 4h tasks consistently overrun
- New cross-reference when a sister rule (verify-before-claim, no-silent-drops, proper-fixes-first) provides a gate the task list must verify
- New bloat-class row in the rule 10 table when a recurring leftover class emerges from rebuilds (stub redirects, dead config keys, etc.)
