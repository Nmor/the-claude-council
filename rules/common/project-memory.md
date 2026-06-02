# Project Memory Rule (Always-On, Global)

> Auto-fires on every file. Sister to `project-scoped-artifacts.md`
> (the broader `.claude/` workspace scaffold),
> `plan-execution-progress.md` (running progress reports),
> `plan-task-breakdown.md` (the granular task list),
> `continuous-learning-mandate.md` (the learning loop that writes
> learnings to memory). Owns the `MEMORY.md` discipline that
> survives context compaction.

## Core Principle

**Every project has a `<workspace>/.claude/memory/MEMORY.md` file
that the agent maintains incrementally throughout every session.
It is gitignored, never referenced as a repo path in checked-in
code, and serves as the durable replacement for context that
will be summarised away during compaction. The agent treats
`MEMORY.md` as the source of truth for project state between
sessions — what's in flight, what was decided, what was learned —
because the conversation context cannot be relied on to persist
verbatim.**

The context window in Claude Code is not infinite. When it fills,
the system compresses prior turns into a summary; the summary is
informative but lossy. File-system memory bypasses the lossy step:
the agent reads `MEMORY.md` at session start, writes to it as
work proceeds, and reads it again after compaction. The
conversation is ephemeral; the memory file is durable.

## Why compaction cannot be disabled

Compaction is a system-level feature of the Claude Code runtime,
not a user-tunable setting. The agent CANNOT disable it. What
the agent CAN do is make compaction harmless by externalising
state to durable files BEFORE the compaction event lands. This
rule mandates that discipline.

The user-visible question "can I disable compaction" has the
honest answer: no. The equivalent achievable goal — "compaction
no longer loses load-bearing state" — is reachable via this
rule.

## Hard rules

### 1. Every project has `<workspace>/.claude/memory/MEMORY.md`

On first significant touch of any workspace (per
`project-scoped-artifacts.md` rule 8), the agent creates:

```text
<workspace>/.claude/memory/
├── MEMORY.md                    # the index + active state
├── feedback_<topic>.md          # feedback entries (per CLAUDE.md auto-memory)
├── project_<topic>.md           # project state entries
├── reference_<topic>.md         # external pointers
└── user_<topic>.md              # workspace-specific user preferences
```

`MEMORY.md` is the single-line-per-entry INDEX (under 200 lines
total per the global memory format); the per-topic files carry
the body content.

### 2. `MEMORY.md` index format

```markdown
# Memory Index (<project-name>)

> Project-scoped memory. Survives context compaction. Gitignored.
> Sister to `~/.claude/projects/-Users-APPLE/memory/MEMORY.md`
> (universal-preferences index).

## Active plan
- Slug: `<plan-slug>` at `.claude/plans/<slug>.md`
- Phase: `<phase-id>` (`<short summary>`)
- Commit policy: `single` | `per-phase` | `per-task`
- Next concrete action: `<one line>`

## Project state (durable facts)
- [<topic>](<file>.md) — one-line summary

## Project feedback (rules-of-the-road for this project)
- [<topic>](<file>.md) — one-line summary

## External references
- [<topic>](<file>.md) — one-line summary

## Last updated
<timestamp>
```

### 3. Auto-maintenance: write often, read at session start

The agent writes to `MEMORY.md` at minimum:

- **Session start** — read every entry; treat as authoritative
- **Phase boundary** (per `plan-execution-progress.md`) — update
  the Active plan section with the new phase + next action
- **Plan task complete** — update the Active plan's next-action
  line
- **New durable fact learned** (user preference, project
  constraint, vendor pin) — add or update the topic entry
- **PreCompact event** (when the hook fires) — flush the current
  in-flight state to the durable file
- **SessionEnd** — final write capturing the session's last
  known state

This is NOT chatty narration of every tool call; it's discrete
durable facts. One write per phase boundary is the floor.

### 4. Gitignore enforcement

The workspace `.gitignore` MUST include:

```gitignore
# Project-scoped Claude state — never tracked
.claude/memory/
.claude/plans/
.claude/audits/
.claude/sessions/
.claude/.local/
```

The agent verifies these lines are present on every workspace
first-touch. If missing, the agent appends them with a comment
naming this rule. CI link-integrity (per
`project-scoped-artifacts.md` rule 11) fails the build if any
checked-in file references `.claude/memory/...` / `.claude/
plans/...` / `.claude/audits/...` as a repo path.

### 5. Never reference memory paths in checked-in code

Per `project-scoped-artifacts.md` rule 11 (project memories +
plans + audits are gitignored and NEVER repo paths). This rule
narrows that for the memory class specifically:

- Markdown links pointing at `.claude/memory/<file>.md` as if
  it were a repo artifact are forbidden
- Source-code references to memory paths are forbidden
- Agent / skill / rule / command frontmatter or body must not
  cite a memory file as a runtime path that exists in the repo
- Acceptable: documenting in `<workspace>/CLAUDE.md` that
  `<workspace>/.claude/memory/MEMORY.md` is the per-user
  runtime state — but as runtime state, not as a tracked
  artifact

### 6. PreCompact hook persists in-flight state

The agent's PreCompact hook (registered in
`~/.claude/settings.json` per `~/.claude/rules/common/hooks.md`)
runs BEFORE compaction. The hook MUST:

1. Read the active TodoWrite list and the active plan file
2. Write the current Active-plan block to
   `<workspace>/.claude/memory/MEMORY.md`
3. Append a `feedback_compaction_<timestamp>.md` entry naming:
   - The last completed phase
   - The next-action line
   - Any open user questions still pending
   - The set of files most recently touched
4. Confirm write success via file existence check

If the hook fails to write, the agent surfaces the failure to
the user BEFORE compaction proceeds; manual persistence is the
fallback.

### 7. SessionStart hook reads project memory first

The agent's SessionStart hook reads:

1. `~/.claude/projects/-Users-APPLE/memory/MEMORY.md` (global
   user preferences)
2. `<workspace>/.claude/memory/MEMORY.md` (project state)
3. `<workspace>/.claude/plans/<active-plan>.md` (if Active plan
   section references one)
4. The 5 most recent `<workspace>/.claude/audits/learning-events.jsonl`
   entries (for un-applied learning candidates)

The hook reports the loaded state to the agent's first
response: "Read MEMORY.md: active plan `<slug>` at phase
`<phase>`, next: `<action>`."

### 8. Memory entries follow the global format

Per `~/.claude/CLAUDE.md` auto-memory section, every per-topic
memory file uses the frontmatter:

```markdown
---
name: <short-kebab-case-slug>
description: <one-line summary — used to decide relevance>
metadata:
  type: user | feedback | project | reference
---

<body — for feedback/project types, structure as: rule/fact,
then **Why:** and **How to apply:** lines>
```

The same format used by global memory; project memory just lives
under `<workspace>/.claude/memory/` instead of `~/.claude/
projects/-Users-APPLE/memory/`.

### 9. Project memory is NOT a substitute for plans

Plans (`<workspace>/.claude/plans/<slug>.md`) capture the
detailed task hierarchy + execution narrative; per
`plan-task-breakdown.md`. Memory captures durable facts +
preferences + ACTIVE STATE POINTERS. The Active plan section of
`MEMORY.md` points at the active plan file by slug — it does
not duplicate the plan's content.

Example shape:

```markdown
## Active plan
- Slug: `peppy-painting-parrot`
- File: `.claude/plans/peppy-painting-parrot.md`
- Phase: ζ (authoring 5 missing language rule sets)
- Last completed task: ζ.D.4 — author dockerfile/testing.md
- Next concrete action: author dockerfile/hooks.md (5 of 6)
- Commit policy: single
```

### 10. Memory survives a fresh clone

A teammate cloning the project has NO `.claude/memory/` (it's
gitignored). That's CORRECT — project memory is per-user. What
SHOULD survive a fresh clone:

- Source code
- Tests
- `<workspace>/CLAUDE.md` (project rules)
- `<workspace>/.claude/rules/` (project rules)
- `<workspace>/.claude/skills/` (project skills)
- `<workspace>/.claude/agents/` (project agents)
- `docs/` (durable documentation)
- ADRs (`docs/adr/*.md`)

What does NOT survive (intentionally, gitignored):

- `<workspace>/.claude/memory/` (per-user runtime state)
- `<workspace>/.claude/plans/` (per-user plan narratives)
- `<workspace>/.claude/audits/` (per-user audit logs)
- `<workspace>/.claude/sessions/` (per-user session state)
- `<workspace>/.claude/.local/` (per-user overrides)

Institutional knowledge that DOES need to survive a fresh clone
moves UP to `docs/adr/`, `<workspace>/CLAUDE.md`, or
`<workspace>/.claude/rules/`. The promotion is explicit per
`continuous-learning-mandate.md` rule 3.

### 11. Cross-session continuity contract

Between session N and session N+1, the only guaranteed
information transfer is:

- Files on disk (source + memory + plans + audits)
- Git history
- The user's verbal context if they choose to recap

Conversation memory is NOT guaranteed across sessions. The
agent MUST behave as if every session started fresh, then read
memory + plans + recent audits to reconstruct state.

This rule makes that reconstruction reliable: write memory
during the session so the next session can read it.

### 12. Memory bloat policy

`MEMORY.md` is INDEX only. The 200-line cap (per global memory
format) is enforced. Entries that exceed one line move to a
per-topic file under `<workspace>/.claude/memory/`.

Per-topic file size cap: ~5 KB. Larger durable narratives are
ADRs (per `adr-template.md`), not memory entries.

Stale memory (entries past 6 months without reference) gets
audited at session start; if still relevant, refresh the
"Last updated" timestamp; if stale, archive to
`<workspace>/.claude/memory/.archive/<file>.md` (still
gitignored).

### 13. Forbidden in project memory

| Type | Why forbidden |
| --- | --- |
| Secrets (API keys, tokens, passwords) | Sister `secrets-management.md` rule 3 — secrets live in vault |
| Customer / patient / student PII | Sister `gdpr-ccpa.md` — memory is not a compliant data store |
| Verbatim copies of plan files | Memory references plans by path; doesn't duplicate them |
| Architectural decisions | Those are ADRs (per `adr-template.md`) |
| Project rules | Those are `<workspace>/.claude/rules/` |
| Source-code excerpts | The code itself is the source of truth |

### 14. Memory + the learning loop

Per `continuous-learning-mandate.md`, learning candidates
accumulate in `<workspace>/.claude/audits/learning-events.jsonl`.
Approved candidates that affect project state get written to
`<workspace>/.claude/memory/feedback_<topic>.md`. The candidate
event is closed (status: applied); the memory entry is the
durable record.

The MEMORY.md index lists the feedback entry; the agent reads
both at session start.

### 15. Project memory works alongside global memory

Two memory surfaces, two purposes:

| Surface | Scope | Contents |
| --- | --- | --- |
| `~/.claude/projects/-Users-APPLE/memory/` | Universal | Cross-project preferences ("use pnpm", "React 19 quirks") |
| `<workspace>/.claude/memory/` | Per-project | Project state, project feedback, project plans pointer |

The agent reads BOTH at session start. Conflicts are resolved
by specificity: project memory wins for project-specific facts;
global memory wins for universal preferences.

## Mandatory bootstrap on first-touch

When the agent encounters a workspace for the first time (no
existing `<workspace>/.claude/memory/MEMORY.md`):

1. Surface to the user: "This workspace has no project memory.
   Per `~/.claude/rules/common/project-memory.md`, I'll create
   `.claude/memory/MEMORY.md` (gitignored) to persist project
   state across sessions + survive compaction. Confirm?"
2. On approval:
   - Create `.claude/memory/MEMORY.md` from the template (rule 2)
   - Verify `.gitignore` includes `.claude/memory/` (rule 4); add if missing
   - Write the initial Active plan section (empty until a plan is registered)
   - Write the first project memory file `project_<topic>.md` as an
     example with name, stack, and first observed constraint
3. Proceed with the original task

If the user declines, the agent logs the decline in
`<workspace>/.claude-skipped` (per `project-scoped-artifacts.md`
rule 8) and re-prompts on the next non-trivial task.

## Operator commands

| Command | Purpose |
| --- | --- |
| `/memory` | Show the current project + global memory index |
| `/memory-write <topic> <body>` | Append a new memory entry |
| `/memory-refresh` | Re-read MEMORY.md + plans + audits; report state |
| `/memory-promote <slug>` | Promote project memory entry to global (per `continuous-learning-mandate.md` rule 3) |
| `/memory-archive <slug>` | Move stale entry to `.archive/` |

These commands live under `~/.claude/commands/` and are the
explicit manual interface to the memory loop.

## Cross-references

- [`common/project-scoped-artifacts.md`](./project-scoped-artifacts.md) — broader workspace `.claude/` scaffold
- [`common/plan-execution-progress.md`](./plan-execution-progress.md) — phase-boundary writes
- [`common/plan-task-breakdown.md`](./plan-task-breakdown.md) — plans referenced by memory
- [`common/continuous-learning-mandate.md`](./continuous-learning-mandate.md) — learning loop feeds memory
- [`common/hooks.md`](./hooks.md) — SessionStart + PreCompact + SessionEnd hooks
- [`common/rule-authoring-global-vs-project.md`](./rule-authoring-global-vs-project.md) — global vs project classification
- [`common/secrets-management.md`](./secrets-management.md) — secrets never in memory
- [`common/adr-template.md`](./adr-template.md) — architectural decisions live in ADRs, not memory
- `~/.claude/CLAUDE.md` — global memory format + auto-memory

## Why this rule exists

The user-visible failure mode this rule prevents: a long session
hits compaction, the agent loses track of phase state /
plan position / user preferences, and the next turn re-derives
all of that from a lossy summary. The reconstruction is
inaccurate; load-bearing decisions get repeated, contradicted,
or skipped.

The fix is to externalise state to disk continuously. Memory
files survive compaction because the agent reads them FRESH
after compaction completes — the file content is whatever the
agent last wrote, not a compressed summary.

Per the user's directive (verbatim, 2026-06-01): "So I cannot
completely disable compacting? and enforce the use of project
based memory. and a global rule that ensure all projects have
their memory.md file that keeps up and is gitignored".

Compaction cannot be disabled at the system level. Project
memory can be enforced. This rule does both: names the
constraint honestly and mandates the workaround as policy.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](./continuous-learning-mandate.md):

**Signals to watch**:

- Workspace touched without `.claude/memory/MEMORY.md` and the bootstrap prompt skipped (rule "Mandatory bootstrap" weakening)
- `.claude/memory/` missing from `.gitignore` on first-touch (rule 4 violation — memory could leak to git history)
- Memory file referenced as a repo path in a tracked source file (rule 5 violation)
- PreCompact hook not firing or failing silently (rule 6 violation — durable persistence gap)
- SessionStart hook reads memory but the agent ignores the loaded state (rule 7 weakening)
- Memory entry exceeds the 200-line cap on `MEMORY.md` index (rule 12 — index discipline broken)
- Secrets / PII observed in a memory file (rule 13 violation — escalate to security)
- Memory entry duplicating plan content (rule 9 — memory is index + state pointers, not plan duplicate)
- Project memory containing facts that would survive a fresh clone (rule 10 — should be promoted to ADR / docs / project rule)

**Refinement candidates**:

- New per-topic file template when a recurring memory class emerges (e.g., per-cell deployment shape, per-tenant quirks)
- Tightening of the bloat policy when 200-line cap is exceeded across multiple projects
- New operator command when a recurring manual memory workflow surfaces (e.g., `/memory-diff` between sessions, `/memory-export` for handoff)
- New cross-reference when a sister rule (hooks, continuous-learning-mandate) adds a memory consumer
