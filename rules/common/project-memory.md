# Project Memory Rule (Always-On, Global)

> Auto-fires on every file. Sister to `project-scoped-artifacts.md`
> (the broader `.claude/` workspace scaffold),
> `plan-execution-progress.md` (the plan is where progress lives),
> `plan-task-breakdown.md` (the granular task list),
> `continuous-learning-mandate.md` (the learning loop that writes
> learnings to memory). Owns the memory discipline that survives
> context compaction.
>
> **Size budget: 11 KB** — `token-budget.mjs --check`.

## Core Principle

**Every project keeps its durable facts in the Claude memory that
Claude Code actually loads for it, keeps that memory true as the facts
change, and points it at the plan instead of copying the plan. Progress
lives in the plan; memory holds what stays true between sessions. When
several projects share one `~/.claude`, each resolves its own memory and
its own plan — one project's state never stands in for another's.**

Compaction cannot be disabled: it is a runtime feature, not a setting.
What can be done is to keep load-bearing state on disk, where the next
session and the post-compaction turn read it fresh instead of trusting a
lossy summary.

## Hard rules

### 1. Memory lives where Claude Code loads it

Per the Claude Code memory docs (code.claude.com/docs/en/memory, read
2026-09-21):

- Auto memory is `~/.claude/projects/<project>/memory/`. `<project>` is
  derived from the git repository the session starts in, and all its
  worktrees and subdirectories share it. Outside a repo, the start
  directory is used.
- `autoMemoryDirectory` in settings (user, project, or the repo's
  gitignored `.claude/settings.local.json`) moves it.
- Only `MEMORY.md` is loaded at session start, and only its first
  200 lines or 25 KB; the rest is dropped. Topic files are read on
  demand.

Consequences:

- A workspace `.claude/memory/` is NOT loaded by Claude Code unless
  `autoMemoryDirectory` points at it. Memory kept only there is
  invisible to every session.
- A project spanning several repos gets one memory per repo unless its
  repos share an `autoMemoryDirectory`. Consolidate within one project
  only, and only on the owner's decision; never merge two projects.

### 2. `MEMORY.md` is an index plus one pointer

- One line per topic file: a markdown link to it, then ` — ` and a one-line hook. A topic file
  the index does not link is never pointed at, so it is lost.
- One `Active plan: <absolute path>` line naming the plan this project
  is executing, or `Active plan: none`. This is the only plan state
  memory holds. It is also what the gates read (rule 4).
- Stays within 200 lines and 25 KB.

### 3. Durable facts only, updated when they change

- Memory holds what stays true: decisions and their reasons, owner
  preferences, constraints, where things live, how to verify.
- Progress, status, branch tips, "next action", "IN PROGRESS" lists
  belong in the plan, which a gate keeps current. A copy in memory is
  current the day it is written and wrong soon after, and the next
  session reads it as fact.
- When a fact an entry states changes, update or delete that entry in
  the same turn. An entry that proves wrong is deleted, not left beside
  its correction. Two entries that disagree are a defect.
- Name paths as they resolve on this machine. A path inside a container
  or on another host is written `host:/path` (the `docker cp` form).

### 4. The active plan is named per project, never guessed

Plan mode writes every project's plans to one `~/.claude/plans/`, so
"the newest plan" is often another project's. Hooks resolve a project's
plan only from its `Active plan:` line
(`scripts/hooks/lib/project-context.js`). A project with no line is
asked for one; it is not assigned a guess.

### 5. Hooks never rewrite memory content

A hook may point at memory and may refuse to end a turn while memory is
stale. It never rewrites entries or stamps a "Last updated" line on
content it did not change: a fresh timestamp on old content claims a
review that did not happen.

### 6. Compaction: brief before, pointer after

- **PreCompact** (`pre-compact-council-brief.js`): the preservation
  brief summarises this project's named plan and memory index.
- **SessionStart, matcher `compact`** (`post-compact-memory-reload.js`):
  points Claude at the memory index and the named plan to re-read.
  PostCompact cannot do this: it has no channel to Claude (hooks
  reference, read 2026-09-21).

### 7. Entry format

Every topic file carries frontmatter: `name`, `description` (what
recall uses to judge relevance), and `metadata.type` (one of `user`,
`feedback`, `project`, `reference`). For `feedback` and `project`, the
body gives the fact, then **Why:** and **How to apply:** lines. Related
entries link with `[[name]]`.

### 8. What never goes in memory

| Type | Where it belongs instead |
| --- | --- |
| Secrets (keys, tokens, passwords) | The vault (`secrets-management.md`) |
| Customer / patient / student PII | Nowhere in memory; it is not a compliant store |
| Plan content: tasks, progress, status | The plan, pointed at by `Active plan:` |
| Architectural decisions | ADRs (`adr-template.md`) |
| Project rules | `<workspace>/.claude/rules/` |
| Source excerpts | The code |

### 9. Memory is per user and per machine

Memory is not in any repository and does not survive a fresh clone or
another machine. Knowledge a teammate needs moves up into `docs/adr/`,
`CLAUDE.md` or `.claude/rules/`, explicitly, per
`continuous-learning-mandate.md` rule 3. Never reference a memory path
as a repo artifact in checked-in code or docs. If
`autoMemoryDirectory` places memory inside a repository, that path is
gitignored.

## Enforcement (hook-backed, not documentation-only)

- **`docs-sync-gate.js` (Stop).** When the turn changed code, it refuses
  to end while the project names no plan, names one that no longer
  exists, or names one older than the code. When the turn changed code
  or wrote memory, it refuses to end while `lib/memory-lint.js` proves
  the memory stale or unloadable:
  - an index link to a missing file, or a file the index does not link;
  - the index past the load limit;
  - missing frontmatter;
  - a cited path or named plan that no longer exists;
  - progress copied into a memory file written this session.

  It blocks once per stop. `CLAUDE_DOCS_SYNC=warn|off` loosens it.
- **`scripts/memory-lint.mjs`.** The same checks on demand:
  - no argument: this project's memory;
  - `--dir <path>`: one directory;
  - `--all`: read-only counts for every project;
  - `--check`: exit 1 on any finding.
- **`/memory`** (built in) opens the memory folder and toggles auto
  memory.

A machine can prove a path dead. It cannot prove a sentence false. Each
entry's truth is still the job of whoever changes the fact it states
(rule 3).

## Cross-references

- `plan-execution-progress.md` — the plan is the source of truth for
  progress; this rule keeps memory from duplicating it
- `project-scoped-artifacts.md` — the workspace `.claude/` scaffold
- `continuous-learning-mandate.md` — approved learnings land in memory
- `rule-authoring-global-vs-project.md` — global vs project placement
- `no-overclaim.md` — a stale memory entry is a claim nobody re-verified

## Why this rule exists

Memory is read as fact by every later session, so a wrong entry costs
more than a missing one. One review (2026-09-21) of a single project's
memory found:

- a branch tip that had moved;
- a build "fix" that a later entry forbade;
- a link to a deleted plan;
- a stash location that had moved repositories;
- three entries the index never linked.

The same review found the machinery around memory broken in three ways:

- The plan gate chose "the newest plan" from a folder shared by
  several projects, so one project's plan edit satisfied another's gate.
- The only hook that "refreshed" memory rewrote a timestamp.
- The post-compaction pointer ran on an event with no channel to
  Claude, so it was dropped at every compaction.

This rule, the gate and the lint replace an earlier version that
mandated a workspace memory Claude Code never loads.

Owner directives (verbatim): "enforce the use of project based memory"
(2026-06-01); "We saw a lot of cases where project memory was stale"
and "remember I am running different projects and they most likely have
their own memories" (2026-09-21).

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill. Invoke it when refining this rule: it does not load
by itself. They are instructions for maintaining THIS ARTIFACT, not for doing
the task at hand, so they are not carried on every turn.
