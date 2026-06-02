# Project Bootstrap

> How a new project gets its own `<workspace>/.claude/` scaffold and
> how project-specific rules / skills / agents / plans / memory
> coexist with the global Claude Council. Grounded in
> [`project-scoped-artifacts.md`](../rules/common/project-scoped-artifacts.md)
> and
> [`rule-authoring-global-vs-project.md`](../rules/common/rule-authoring-global-vs-project.md).

## Why workspaces have their own `.claude/`

Global rules contain only pure guidance — abstract principles, no
project-specific names, vendors, paths, or session-specific dates.
Project specifics need a home, and that home is
`<workspace>/.claude/`.

Without this split, two failure modes occur:

1. **Global pollution** — project-specific learnings leak into
   global, polluting the shared surface for every other project.
2. **Lost cross-project patterns** — broadly useful patterns land
   in one workspace and never get shared.

The fix is mechanical: every workspace has its own `.claude/`;
project specifics live there; global stays pure. Patterns observed
in 2+ workspaces are eligible for promotion to global; global
rules contradicted in practice are flagged for demotion review.

## When does a workspace get scaffolded?

Per
[`project-scoped-artifacts.md`](../rules/common/project-scoped-artifacts.md),
a workspace gets its `.claude/` scaffold when **any** of:

- A non-trivial Council-mediated task starts in a workspace with no
  `.claude/` directory yet.
- A multi-file refactor, new feature, or integration begins.
- A `git init` happens in a new directory and Claude is used for
  the first commits.

NOT triggered by trivial work (single-line fix, typo, config tweak).
Trivial work uses inherited global rules only.

## The canonical scaffold

```text
<workspace>/.claude/
├── CLAUDE.md                  # workspace-level rules + vendor table
├── README.md                  # how this .claude/ is organised
├── settings.json              # workspace-scoped settings (optional)
├── settings.local.json        # per-user overrides (gitignored)
├── .gitignore                 # excludes settings.local.json, audits/jsonl, etc.
├── rules/                     # workspace-specific rules (extend global)
│   ├── 00-index.md
│   └── <rule>.md
├── skills/                    # workspace-specific skills
│   └── <skill>/SKILL.md
├── agents/                    # workspace-specific agents (rare)
│   └── <agent>.md
├── plans/                     # multi-phase plan files for this project
│   └── <slug>.md
├── memory/                    # workspace-specific memories
│   ├── MEMORY.md              # index of memory files
│   └── feedback_*.md          # individual memories
└── audits/                    # security audits + learning events
    ├── learning-events.jsonl
    ├── bypass-log.jsonl
    └── <date>/                # dated audit reports
```

The canonical template lives at
`~/.claude/templates/project-claude-scaffold/`. On first-touch,
the agent copies the template into the workspace and customises
`CLAUDE.md` with the project's name and detected tech stack.

## Tech-stack auto-detection

When the agent creates the workspace scaffold, it detects the tech
stack from the project's manifest files:

| Detector | Signal | Inferred stack |
| -------- | ------ | -------------- |
| `package.json` | exists | Node / TS / JS |
| `package.json` → `dependencies.react` | present | React |
| `package.json` → `dependencies.vue` | present | Vue |
| `package.json` → `dependencies.next` | present | Next.js |
| `package.json` → `dependencies.vite` | present | Vite-based build |
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

The detected stack drives the initial workspace `CLAUDE.md`: which
Council divisions auto-engage, which skills auto-fire, which agents
are most relevant.

## Workspace rule rules

Per
[`rule-authoring-global-vs-project.md`](../rules/common/rule-authoring-global-vs-project.md):

1. **Classify before writing.** Every new rule is classified as
   global or project before the first character is typed.
2. **Project rules ADD to global.** Workspace rules layer on top of
   global rules ADDITIVELY. They MAY raise thresholds (stricter)
   but MUST NOT lower them (looser).
3. **Workspace conflicts with global → strictest wins.** A
   workspace rule that lowers a threshold is a bug in the workspace
   file. The assistant flags it, does not apply it.
4. **Project specifics belong in projects.** Vendor names, file
   paths, schema fields, deployment shapes, incident details —
   never in global rules; always in workspace rules.
5. **Cross-project patterns get promoted.** A pattern that appears
   in 2+ workspaces is eligible for promotion to global. The agent
   surfaces the candidate via AskUserQuestion: "This rule appears
   in workspaces A and B. Promote to global?"
6. **Global rules contradicted in practice get demoted.** A global
   rule consistently overridden gets demoted to the affected
   workspace's `.claude/rules/`.

## Workspace CLAUDE.md template

Every workspace `CLAUDE.md` carries at minimum:

```markdown
# <Workspace Name>

> Workspace-level rules + vendor table. Layered on top of global
> per `~/.claude/CLAUDE.md`. Strictest wins on conflict.

## Tech stack

- **Language**: <Go / TS / Python / etc.>
- **Framework**: <Next.js / FastAPI / Rails / Spring Boot / etc.>
- **Cloud**: <AWS / GCP / Azure>
- **Database**: <Postgres / DynamoDB / MongoDB>
- **CI**: <GitHub Actions / GitLab CI / CircleCI>

## Vendor table

| Category | Choice | Reason |
| -------- | ------ | ------ |
| Payments | <vendor> | <rationale> |
| Email | <vendor> | <rationale> |
| Auth | <vendor> | <rationale> |
| Observability | <vendor> | <rationale> |
| ...

## Project-specific rules

See `<workspace>/.claude/rules/`. Each rule extends a global rule
with project-specific specifics.

| Rule | Purpose |
| ---- | ------- |
| `<rule>.md` | <one-line summary> |

## Project-specific skills

See `<workspace>/.claude/skills/`. Workspace skills are rare —
they exist when the project has a domain skill that no other
codebase needs.

## Project-specific agents

See `<workspace>/.claude/agents/`. Workspace agents are rare —
prefer global agents.

## Workspace memory

See `<workspace>/.claude/memory/MEMORY.md` for the index.
```

## Plans

Per
[`plan-task-breakdown.md`](../rules/common/plan-task-breakdown.md)
+
[`plan-completion-before-push.md`](../rules/common/plan-completion-before-push.md):

- Project-specific plan files live at
  `<workspace>/.claude/plans/<slug>.md`, NEVER in `~/.claude/plans/`.
- The global `~/.claude/plans/` is reserved for plans that govern
  the global config itself (meta-config plans like the rebuild
  plan).
- Every plan declares its commit-policy in the Context section:
  `single` (one commit at end), `per-phase` (one per phase
  boundary), or `per-task` (one per atomic task).
- No `git push` until the plan is complete + verified — narrow
  bug-fix exceptions require explicit user override.

## Memories

Per the auto-memory system documented in
[`../CLAUDE.md`](../CLAUDE.md):

- Workspace memories (project / feedback / reference) live in
  `<workspace>/.claude/memory/`.
- Global `~/.claude/projects/-Users-<user>/memory/` holds ONLY
  universal preferences (e.g., "Use pnpm not npm", "React 19 +
  SonarLint pitfalls", "Web quality bar").
- Each memory file carries frontmatter (`name`, `description`,
  `metadata.type`).
- `MEMORY.md` is an index, not a memory — one-line pointer per
  memory file.

## Audits

Two `.jsonl` streams live in `<workspace>/.claude/audits/`:

- **`learning-events.jsonl`** — every Council-mediated task emits
  ≥ 1 learning-candidate event per
  [`continuous-learning-mandate.md`](../rules/common/continuous-learning-mandate.md).
- **`bypass-log.jsonl`** — any attempt to bypass Council is logged
  (and Council convenes anyway) per
  [`council-default.md`](../rules/common/council-default.md).

Both files are gitignored in the working tree but kept as durable
per-workspace state.

## First-touch flow

When the agent encounters a workspace without `.claude/` and a
non-trivial task arrives, the flow is:

1. **Detection**: agent reads the workspace root; sees no `.claude/`.
2. **Surface**: "I'm about to make a non-trivial edit in `<workspace>/`.
   This workspace has no `.claude/` directory yet. Per
   `~/.claude/rules/common/project-scoped-artifacts.md`, I'll create
   the scaffold from `~/.claude/templates/project-claude-scaffold/`.
   Confirm?"
3. **On approval**: copy the scaffold + initialise `CLAUDE.md` with
   project name + detected tech stack.
4. **Proceed**: with the edit, using the now-bootstrapped `.claude/`
   for plan files, learning events, etc.

If the user declines, the agent proceeds with global rules only,
logs the decline in `<workspace>/.claude-skipped` (one-line note),
and re-prompts on the next non-trivial task.

## Promotion + demotion paths

### Workspace → global (promotion)

A pattern that appears in 2+ workspaces is eligible:

1. Agent detects the cross-workspace pattern.
2. Surfaces via AskUserQuestion: "Pattern observed in workspaces A
   and B. Promote to global?"
3. On approval: extract the generic principle (strip every
   project-specific reference per the rule-authoring purity rules);
   write to `~/.claude/rules/common/<name>.md`.
4. Replace workspace copies with one-line redirects:
   `> See ~/.claude/rules/common/<name>.md`.

### Global → workspace (demotion)

A global rule that turns out to be workspace-specific gets demoted:

1. Agent (or user) identifies the demotion candidate.
2. Surfaces via AskUserQuestion: "This rule has workspace-specific
   content; relocate to `<workspace>/.claude/rules/`?"
3. On approval: copy to the workspace; remove from global.
4. If the rule was widely referenced, add a redirect stub in global.

## Multi-workspace consistency sweep

Periodically (or on the user's request), the agent walks every
workspace under the user's home directory and confirms:

- Each workspace has its `.claude/` scaffold (or a documented opt-out).
- Each workspace's `CLAUDE.md` reflects the current tech stack.
- Each workspace's `rules/`, `skills/`, `agents/`, `plans/`, `memory/`
  subdirectories conform to the canonical scaffold.

The sweep surfaces drift candidates: missing subdirectories, stale
memories, plans past their `commit-policy` window, audits backed up
past the review cadence.

## See also

- [ARCHITECTURE.md](ARCHITECTURE.md) — how workspace + global compose
- [RULES.md](RULES.md) — the rules catalog
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to add a rule / skill /
  agent (workspace or global)
- [`../rules/common/project-scoped-artifacts.md`](../rules/common/project-scoped-artifacts.md)
  — the scaffold rule
- [`../rules/common/rule-authoring-global-vs-project.md`](../rules/common/rule-authoring-global-vs-project.md)
  — global-vs-project classification
- [`../rules/common/continuous-learning-mandate.md`](../rules/common/continuous-learning-mandate.md)
  — promotion / demotion via learning loop
- [`../templates/project-claude-scaffold/`](../templates/project-claude-scaffold/)
  — the scaffold template
