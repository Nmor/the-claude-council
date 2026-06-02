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

## Hard rules

### 1. First-touch detection

A project gets its workspace `.claude/` scaffold when ANY of:

- The user starts a non-trivial Council-mediated task in a
  workspace that has no `.claude/` directory yet
- A multi-file refactor, new feature, or integration begins
- A `git init` happens in a new directory and Claude is used
  for the first commits

NOT triggered by trivial work (single-line fix, typo, config
tweak). Trivial work uses inherited global rules only.

### 2. Scaffold structure (canonical)

Every workspace `.claude/` contains:

```
<workspace>/.claude/
├── CLAUDE.md              # workspace-level rules + vendor list
├── README.md              # how this .claude/ is organised
├── settings.json          # workspace-scoped settings (optional)
├── settings.local.json    # per-user overrides (gitignored)
├── .gitignore             # excludes settings.local.json, plans/, audits/, sessions/ — see rule 11
├── rules/                 # workspace-specific rules (extend global)
│   ├── 00-index.md
│   └── <rule>.md
├── skills/                # workspace-specific skills
│   └── <skill>/SKILL.md
├── agents/                # workspace-specific agents (rare)
│   └── <agent>.md
├── plans/                 # multi-phase plan files for this project
│   └── <slug>.md
├── memory/                # workspace-specific memories
│   ├── MEMORY.md          # index of memory files
│   └── feedback_*.md      # individual memories
└── audits/                # security audits, learning events
    ├── learning-events.jsonl
    ├── bypass-log.jsonl
    └── <date>/            # dated audit reports
```

### 3. Scaffold template lives at the global root

The canonical template lives at
`~/.claude/templates/project-claude-scaffold/`. On first-touch,
the agent copies the template into the workspace + customises
the `CLAUDE.md` with the project's name + detected tech stack.

The template is part of the global config; updates to it
propagate to new project scaffolds. Existing projects do NOT
auto-update — they evolve at their own pace, with a manual
diff-and-apply for template improvements.

### 4. Workspace rules ADD to global; never override down

Per `rule-authoring-global-vs-project.md`:

- Workspace rules extend global rules with project-specific
  specifics (vendor names, file paths, schema fields)
- Workspace rules MAY raise thresholds (stricter than global)
- Workspace rules MUST NOT lower thresholds (weaker than global)
- A workspace rule that contradicts a global rule is a bug; the
  agent flags it and refuses to apply it

### 5. Learning loop (workspace-side)

After every Council-mediated task in a workspace:

1. The agent emits a `learning-candidate` event to
   `<workspace>/.claude/audits/learning-events.jsonl`.
2. The event names: the task summary, what worked, what didn't,
   a proposed refinement to a workspace rule / skill / agent /
   memory.
3. Once per session OR on explicit `/learn` invocation, the
   agent batches candidates + presents refinements via
   AskUserQuestion.
4. Approved refinements update the workspace artifact in the
   same session.
5. The candidate event is closed (status: applied / rejected /
   deferred).

### 6. Promotion path (workspace → global)

A pattern observed in 2+ workspaces is eligible for promotion
to global:

1. The agent detects the cross-workspace pattern (same rule
   shape in two `.claude/rules/` dirs).
2. Surfaces the candidate via AskUserQuestion: "This rule
   appears in workspaces A and B. Promote to global?"
3. On approval: extract the generic principle (strip all
   workspace specifics per
   `rule-authoring-global-vs-project.md` rule 2); write to
   `~/.claude/rules/common/<rule>.md`.
4. Replace the workspace copies with one-line redirects:
   `> See ~/.claude/rules/common/<rule>.md`.

### 7. Demotion path (global → workspace)

A global rule that turns out to be workspace-specific gets
demoted:

1. The agent (or user) identifies the demotion candidate
   (e.g., global rule references one workspace's specific
   deployment shape).
2. Surfaces via AskUserQuestion: "This rule has workspace-
   specific content; relocate to <workspace>/.claude/rules/?"
3. On approval: copy to the workspace; remove from global.
4. Add a redirect stub in global if the rule was widely
   referenced: `> Relocated to <workspace>/.claude/rules/<rule>.md`.

### 8. The first significant edit triggers scaffold creation

On first-touch:

1. The agent surfaces: "I'm about to make a non-trivial edit
   in `<workspace>/`. This workspace has no `.claude/`
   directory yet. Per
   `~/.claude/rules/common/project-scoped-artifacts.md`, I'll
   create the scaffold from
   `~/.claude/templates/project-claude-scaffold/`. Confirm?"
2. On user approval: copy the scaffold + initialise
   `CLAUDE.md` with project name + detected tech stack.
3. Proceed with the edit, using the now-bootstrapped `.claude/`
   for plan files, learning events, etc.

If the user declines the scaffold creation, the agent proceeds
with global rules only, logs the decline in
`<workspace>/.claude-skipped` file (one-line note), and
re-prompts on next non-trivial task.

### 9. Plan files belong in the workspace `.claude/plans/`

Project-specific plan files live at
`<workspace>/.claude/plans/<slug>.md`, NEVER in `~/.claude/plans/`.

The global `~/.claude/plans/` is reserved for plans that govern
the global config itself (meta-config plans).

### 10. Workspace memories belong in the workspace `.claude/memory/`

Project-specific memories (feedback / project /
reference) live at `<workspace>/.claude/memory/`. The global
memory dir at `~/.claude/projects/-Users-APPLE/memory/` holds
ONLY universal preferences (e.g., "Use pnpm not npm", "React
19 + SonarLint pitfalls", "Web quality bar").

### 11. Plans + audits are always gitignored + never referenced as repo paths

The workspace `.claude/plans/` and `.claude/audits/` directories
(and the global `~/.claude/plans/` + `~/.claude/audits/`)
carry per-session narrative + per-user state that MUST NOT
enter git history:

- **Plans** — In-flight architectural drafts, rebuild narratives,
  per-author phase tracking, references to teammates / vendors /
  customers / customers' specific incidents that don't belong in
  shared history.
- **Audits** — Learning-event streams, Council-bypass logs,
  security audit reports that can leak workspace names, user
  identifiers, internal vendor names, or sensitive scan output.

Mandatory hygiene:

1. Every `.gitignore` (global + every workspace) MUST include
   `plans/` and `audits/` as full-directory entries. The
   `templates/project-claude-scaffold/.gitignore` carries this
   by default.
2. No checked-in code file (source, doc, config, agent, skill,
   rule, command, template) may REFERENCE `plans/` or `audits/`
   as a REPO LOCATION (e.g., a markdown link pointing at
   `plans/<slug>` or `audits/<file>` as if it were a repo
   artifact, or an unquoted path token in agent / skill
   frontmatter). The only acceptable references are to RUNTIME
   PATHS that resolve at install time on the user's machine
   (paths under `~/.claude/plans/`, `<workspace>/.claude/plans/`,
   `<workspace>/.claude/audits/`).
3. README / CHANGELOG / docs that previously pointed at a plan
   or audit file as a repo artifact MUST be rewritten to point
   at the equivalent stable doc (e.g., `docs/ARCHITECTURE.md`,
   `docs/COUNCIL.md`).
4. CI link-integrity checks (per `done-criteria.md`) include
   a sweep that fails the build if any tracked file references
   `plans/...` or `audits/...` as a repo path (anchor:
   `^plans/` or `^audits/` in markdown links, or unquoted
   path tokens in agent / skill frontmatter).
5. If a plan needs to be archived for institutional memory,
   it lives in `~/.claude/.local/plans/` (per-user, gitignored
   at `.local/`) OR is rewritten into an ADR (per
   `adr-template.md`) and committed under `docs/adr/` —
   STRIPPED of every workspace / customer / teammate name.

User directive (verbatim): "plan and claude files should always
be gitignored and not be referenced in and code file. This
should be part of all relevant rules and files".

## Tech-stack auto-detection (on scaffold creation)

When the agent creates the workspace scaffold, it detects the
tech stack from:

| Detector | Signal | Inferred stack |
| --- | --- | --- |
| `package.json` | exists | Node / TS / JS |
| `package.json` → dependencies | `react` | React |
| `package.json` → dependencies | `vue` | Vue |
| `package.json` → dependencies | `next` | Next.js |
| `package.json` → dependencies | `vite` | Vite-based build |
| `pnpm-lock.yaml` | exists | pnpm package manager |
| `go.mod` | exists | Go |
| `requirements.txt` / `pyproject.toml` | exists | Python |
| `pyproject.toml` → `[tool.poetry]` | exists | Poetry |
| `Gemfile` | exists | Ruby / Rails |
| `Cargo.toml` | exists | Rust |
| `pom.xml` / `build.gradle` | exists | Java / Kotlin |
| `*.csproj` / `*.sln` | exists | .NET |
| `Package.swift` | exists | Swift |
| `pubspec.yaml` | exists | Dart / Flutter |
| `docker-compose.yml` | exists | Docker-orchestrated dev |
| `serverless.yml` / `template.yaml` | exists | Serverless framework / SAM |
| `*.tf` | exists | Terraform |
| `*.sol` | exists | Solidity / Web3 |

The detected stack drives the initial workspace `CLAUDE.md` —
which Council divisions auto-engage, which skills auto-fire,
which agents are most relevant.

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

## Why this rule exists

Project-specific learnings + plans + memories were historically
mixed into the global `~/.claude/` directory, polluting the
shared surface. The cost: every other project the user works
in inherits irrelevant specifics; global rules drift toward
"sticky catch-all" rather than reusable guidance.

The fix is mechanical: every workspace has its own `.claude/`;
project specifics live there; global stays pure.

User directive (verbatim): **"We should not have project
related files in global folders like ~/.claude/ and global
claude.md files. As a matter of improvements all cases for
every project should as part of its planning create and the
associated, skills, agents, rules etc etc required for that
project and improved by default with learnings as the project
proveeds (This is for global and workspace/projects)."**

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Non-trivial Council-mediated task in a workspace without `.claude/` directory + no first-touch scaffold offered (rule 1 violation)
- Scaffold copied but `CLAUDE.md` not customised for project name / tech stack (rule 3 weakening)
- Project rule LOWERS a global threshold (rule 4 violation — strictest wins)
- Workspace `.claude/audits/learning-events.jsonl` accumulates candidates without `/learn` batch review (rule 5 weakening)
- Cross-workspace pattern observed in 2+ projects without promotion proposal (rule 6 weakening)
- Global rule contradicted in a workspace 5+ times without demotion proposal (rule 7 weakening)
- Project-specific plan file written to `~/.claude/plans/` instead of `<workspace>/.claude/plans/` (rule 9 violation)
- Project-specific memory written to `~/.claude/projects/-Users-APPLE/memory/` instead of workspace memory dir (rule 10 violation)
- Tech-stack auto-detection skipped on first scaffold (heuristic-table gap)

**Refinement candidates**:
- New tech-stack detection row when a new ecosystem signal surfaces (e.g., `bun.lockb`, `deno.json`, `mise.toml`)
- Tightening of the "first-touch trigger" criteria when trivial-work cases are misclassified as non-trivial
- New cross-reference when a sister rule (rule-authoring-global-vs-project, continuous-learning-mandate) provides the classification or promotion pipeline
- New entry in the canonical scaffold structure when a recurring per-project artifact class (e.g., per-project ADR archive, per-project incident log) emerges
