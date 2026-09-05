---
name: council-maintenance
description: Learning hooks for every Council rule — the per-rule "signals to watch" (what observation means a rule is being weakened or missed) and "refinement candidates" (what kind of change that rule accepts). Use when refining, auditing or authoring a Council rule / skill / agent / CLAUDE.md, when running the continuous-learning batch (/learn, /evolve), when deciding whether an observed failure warrants a rule change, or when promoting a workspace pattern to global.
paths:
  - "~/.claude/rules/**/*.md"
  - "**/.claude/rules/**/*.md"
  - "~/.claude/skills/**/SKILL.md"
  - "**/.claude/skills/**/SKILL.md"
  - "~/.claude/agents/**/*.md"
  - "**/.claude/agents/**/*.md"
  - "**/CLAUDE.md"
---

# Council Maintenance — Learning Hooks

> The self-improvement surface for the Council's own rules. Sister to
> `continuous-learning-mandate.md` (the loop these feed),
> `rule-authoring-global-vs-project.md` (where a refinement lands),
> `principal-level-mandate.md` (the depth a refinement must hold).

## Standards Cited

- **ISO 9001:2015 §10.3** — *Continual improvement*: the organisation shall
  continually improve the suitability, adequacy and effectiveness of the system.
  These hooks are that mechanism for the rule corpus: each rule declares how its
  own effectiveness is observed.
- **ISO/IEC 27001:2022 §10.1** — *Continual improvement*, paired with §10.2
  *Nonconformity and corrective action*. A fired signal is a nonconformity; a
  refinement candidate is the bounded corrective action it may take.
- **NIST SP 800-53 Rev. 5, CA-7** — *Continuous Monitoring*: define metrics and
  the frequency of assessment. Each rule's "signals to watch" is its metric set;
  the phase boundary is its assessment frequency.
- **ISO/IEC/IEEE 12207:2017** — *Systems and software engineering — Software life
  cycle processes*, which places process improvement inside the life cycle rather
  than beside it. Same argument for why upkeep guidance is versioned with the
  rules it maintains.

## Purpose

`continuous-learning-mandate.md` rule 6 requires every rule, skill and agent to
carry a `learning_hooks` section naming **signals to watch** ("what observations
matter for refining this artifact") and **refinement candidates** ("what kinds of
refinement this artifact accepts").

That content is addressed to whoever is **maintaining the Council** — not to the
agent doing the current task. Carried inline on all 24 always-on rules it cost
~30 KB of every single turn's context, on every task, forever, to serve the
rare turn that actually refines a rule. It is collected here instead, behind a
`paths:` gate that fires on exactly the artifacts a refinement touches.

Nothing was dropped: every rule's hooks are reproduced verbatim below, and each
rule retains a pointer to this skill.

## What this skill does NOT cover

The rules themselves. This is the maintenance layer — the normative content stays
in `~/.claude/rules/common/`, always on. If you are asking "what does the rule
require?", read the rule. If you are asking "how would I know this rule is being
weakened, and what change would fix it?", read below.

## How to use these hooks

1. **Observing** — when a task goes wrong, find the rule that should have caught
   it and read its *signals to watch*. A signal that fired is a
   learning-candidate event per `continuous-learning-mandate.md` rule 1.
2. **Refining** — a rule's *refinement candidates* bound what change it accepts.
   A refinement outside that list is usually a NEW rule, or belongs in a sister
   rule; check `rule-authoring-global-vs-project.md` before authoring either.
3. **Classifying** — global vs workspace per `rule-authoring-global-vs-project.md`
   rules 1-2. Confidence + session thresholds per
   `continuous-learning-mandate.md` rule 2. The user approves every change.
4. **Never mutate silently** — `continuous-learning-mandate.md` anti-pattern 1.

## Anti-Patterns

- **Silent rule mutation** — changing a rule on one session's observation. Needs
  confidence >= 0.8, 2+ sessions, and explicit user approval.
- **Rule sprawl** — a new rule per observation. Cluster into an existing rule
  first; a new sibling needs a genuinely new principle
  (`rule-authoring-global-vs-project.md` learning hooks record an incident where
  a duplicate rule was created because nobody grepped first).
- **Candidate hoarding** — candidates accumulating unreviewed. The batch fires at
  every session boundary.
- **Project specifics into global** — a workspace name, path or incident inside a
  global rule. `rule-authoring-global-vs-project.md` rule 2.
- **Refining the hook instead of the rule** — editing a signal so it stops firing,
  rather than fixing what it detected.
- **Treating a signal as proof** — a signal is an observation to investigate, not
  a verified defect. `verify-before-claim.md` still applies.

## Verification Checklist

- Refinement classified global vs workspace, with the rationale recorded
  (`rule-authoring-global-vs-project.md` rule 10). Green: the response names the
  path, the classification, and the rationale.
- Existing rules grepped for the concept before authoring a new one. Green:
  `ls`/`grep` of `rules/common/` ran this turn.
- The changed rule still carries its "Why this rule exists" naming a SPECIFIC
  failure mode. Green: not a vague "improves quality".
- Cross-references updated both ways. Green: `tests/verify-link-integrity.sh`.
- The rule's hooks below updated to match the change. Green: this file edited in
  the same commit as the rule.
- No project name / path / session date entered a global artifact. Green: the
  contamination sweep in `principal-level-mandate.md`.

## Cross-References

- `continuous-learning-mandate.md` — the loop these hooks feed (rule 6 mandates them)
- `rule-authoring-global-vs-project.md` — where a refinement lands; promotion + demotion
- `principal-level-mandate.md` — the depth bar a refined artifact must still meet
- `project-scoped-artifacts.md` — the workspace-side learning loop + audit log
- `post-phase-retrospective-review.md` — recurring misses become candidates here
- Skill `council-rules` — the Division catalog a trigger refinement edits
- Commands `/learn`, `/evolve`, `/instinct-status` — the operator interface

## Why This Skill Exists

Measured on a real install, `rules/common` cost ~74,000 tokens of every turn —
roughly 30x the entire 123-skill listing, and 2.3x the "~110-130 KB" cold-load
budget `CLAUDE.md` claims for itself. ~30 KB of that was learning hooks: guidance
for refining the framework, loaded on every turn of every unrelated task.

The framework already had the answer in its own file. `council-triggers.md` kept
the trigger MECHANISM always-on and moved its 326-glob catalog into the
`council-rules` skill, for exactly this reason. This applies the same split to
the maintenance layer: the rules stay on the Floor, their upkeep instructions
load when you are doing upkeep.

The failure mode it prevents is the one that motivated it — a context window
spent on instructions for a task nobody is doing, degrading the model's attention
on the task someone IS doing.

## `rule-authoring-global-vs-project.md` — full text

## Hard rules

### 1. Classify the rule BEFORE writing it

When a directive surfaces during project work, ask:

- Is this guidance applicable to every codebase the user works on?
  → **global**
- Is this guidance tied to a specific project's stack, vendor list,
  architecture, or domain model?
  → **project**
- Could it be split into a generic principle + a project-specific
  config?
  → **global principle + project config** (the canonical shape)

Default: when in doubt, write the principle in global, the
specifics in project. Re-classify later if needed.

### 2. Global rules contain ONLY pure guidance

Banned in global (per the broader rule purity sweep):

- Project / workspace names (any client name, any product name,
  any internal codename — use `<workspace>` / `<project>` /
  `<vendor>` placeholders instead)
- Per-project file paths (`/Users/<user>/<workspace>/...`,
  `frontend/src/components/SpecificComponent.vue`, etc.)
- Session-specific dates ("session 2026-05-26", "Q4 incident")
- Incident details that name a specific service, container,
  vendor, or runtime in a way that ties the rule to one
  codebase
- Vendor brand names that come from a specific project's vendor
  list (vs broadly-available tools the rule must name to give
  guidance)

Allowed in global:

- Abstract examples (`<some-noisy-container>`, `<workspace>/
  CLAUDE.md`, `<provider>`)
- Standards citations (RFC numbers, OWASP ASVS sections, ISO /
  IEC numbers, NIST publications, IFRS / GAAP / FASB sections,
  ITIL processes)
- Broadly-used tool names (Docker, Kubernetes, AWS, Postgres,
  Redis, Jest, eslint, ruff, clippy, etc.)
- Industry-standard incident classes ("OOM-killed under load",
  "thundering herd on cache miss", "credential rotation race")
  WITHOUT naming the project that hit them

### 3. Project rules live under `<project>/.claude/rules/`

The path `<project>/.claude/rules/<rule>.md` is the canonical
home for any rule that:

- Names the project's specific vendors, services, container
  names, endpoint URLs
- Encodes the project's specific architecture / naming
  conventions / type system
- References the project's specific files, modules, or PR
  history
- Extends a global rule with project-specific thresholds (e.g.
  "Sonar S3776 cap is 10 globally; this project allows 12 only
  in `lib/router/`")

Project rules MAY reference global rules they extend; the
reference makes the relationship explicit. Project rules MUST
NOT redeclare or override the global rule's hard limits — they
can only add stricter project-specific overlays.

### 4. Mid-work rule additions follow the same flow

When a user directive arrives during project work and creates a
new rule, the agent:

1. Classifies (global vs project) per rules 1-2.
2. Writes the rule in the correct location.
3. If the rule belongs partially in both: drafts the global
   principle (pure guidance) AND the project overlay (specific
   config), as two files.
4. Cross-links them.
5. Updates the workspace `CLAUDE.md` (if the rule is project-
   side) or the global cross-reference list (if global-side) so
   the rule is discoverable.

NEVER write a project-specific rule in global "for now,
refactor later." The refactor never happens; the global rule
accumulates project debt.

### 5. Continuous improvement of global rules

Global rules + skills + agents are continuously kept clean and
improved. Triggers:

- Quarterly review: re-read every global rule for accumulated
  project-specific content; relocate as needed.
- Post-incident: if the incident reveals a missing rule, add
  the principle to global (NOT the incident-specific replay).
- Cross-project pattern recognition: when 2+ workspaces have a
  similar project-specific rule, the principle deserves
  promotion to global.

### 6. Demotion path

A global rule that turns out to be project-specific (e.g., it
references one workspace's specific deployment shape that
doesn't generalize) is demoted to the affected workspace's
`.claude/rules/`. The demotion preserves the rule's history via
`git mv` when both source and destination are in the same git
repo; otherwise via copy + delete with a note in the new file
naming the demotion date.

### 7. Promotion path

A project-specific rule that turns out to apply broadly is
promoted to global. The promotion strips every project-specific
reference (per rule 2). The original project rule is replaced
with a one-line redirect: "See `~/.claude/rules/common/<name>.md`."

### 8. The workspace `CLAUDE.md` is the project index

Every workspace `CLAUDE.md` carries a "Project rules" section
listing every file under `<workspace>/.claude/rules/`, with one-
line summaries. The global `CLAUDE.md` does NOT enumerate global
rules (auto-discovery via `rules/common/`); workspace files DO
enumerate workspace rules because they're not auto-discovered
the same way.

### 9. Skills + agents follow the same classification

The same global-vs-project split applies to skills and agents:

- Generic skill (e.g., `coding-quality-rules`, `api-design`,
  `tdd-workflow`) → `~/.claude/skills/`
- Project skill (e.g., a specific feature's domain skill that
  only matters in one codebase) → `<project>/.claude/skills/`

Default: skills are MOSTLY global (they encode patterns + best
practices, not project specifics). Agents are MOSTLY global
(they encode review / build / test workflows, not project
specifics).

### 10. The classification decision is recorded

When a new rule lands, the agent's response includes:

```text
Rule added:
- Path: ~/.claude/rules/common/<rule>.md  (or workspace path)
- Classification: global | project
- Why: <one-line rationale>
- Cross-references: <related rules>
```

The classification + rationale go in the rule's "Why this rule
exists" section for durable record.

## Anti-pattern: project ref in global

```text
# WRONG — global rule with workspace-specific reference
"For projects with verify-local.sh (<project-a>, <project-b>,
<project-c>), add this gate inline."

# RIGHT — abstract reference
"For projects with a local pre-flight script (typical names:
infra/verify-local.sh, scripts/preflight.sh), add this gate
inline."
```

## Anti-pattern: global principle in project

```text
# WRONG — project rule restating global principle
"This project does not allow `// eslint-disable` comments." (the
global no-discards / extreme-lint-policy rules already say this)

# RIGHT — project rule that extends global with project-specific
"In this project, `// eslint-disable` is forbidden (per global
no-discards.md) AND any necessary lint config exception is
documented in `docs/lint-debt.md` with a re-tightening date."
```

## Why this rule exists

Without explicit classification, rules accumulate the wrong way:
each new rule lands wherever was convenient at the moment the
directive arrived. Over months, global rules absorb every
project's specifics, becoming a sticky catch-all rather than
reusable guidance. The reverse also happens — broadly-useful
patterns land in one workspace and never get shared.

The fix is mechanical: classify on entry, write to the right
location, demote / promote on review.

User directive (verbatim): **"even when rule updates are request
when working on a project you are ensure that only rule guides
make it to global rules and project related rules stay in
projects. Global rule and all skills and agents always stay
improved and clean"**.

## `project-scoped-artifacts.md` — full text

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

```text
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
   specific content; relocate to `<workspace>`/.claude/rules/?"
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

## Per-rule learning hooks

### `competitive-parity-per-phase.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Phase / wave closed without the Step 6 parity output block (rule 1 +
  rule 2 violation)
- Reference competitor set unchanged for > 12 months (rule 8 signal)
- New feature dimension shipped without a discovery filter in the
  same wave (Discovery-parity rider violation)
- Parity backlog rows without a next-wave target (rule 7 violation)
- Press-summary citation used as sole source (rule 5 violation)
- Solo phase that touched user-visible surface skipped Step 6 as
  "abbreviated" (rule 9 weakening)

**Refinement candidates**:

- New reference-competitor row when a material new entrant emerges
- New Discovery-parity rider row when a feature class ships without
  a matching filter surface
- Tightening the cadence when a wave's parity gap re-opens because
  the scan didn't catch a competitor's shipment
- Promotion to a mechanical hook when the "did the wave-close block
  include Step 6?" check can be automated (grep the plan file for
  "Competitive parity (this")

### `continuous-learning-mandate.md`

Per this very rule (self-referential):

**Signals to watch**:

- Council-mediated task ends without a `learning-candidate` event emitted (rule 1 violation)
- Candidate auto-applied without user review prompt (rule 2 violation — silent mutation)
- Candidate observed in 2+ workspaces but never promoted to global (rule 3 weakening — promotion gap)
- Global rule contradicted 5+ times in 30 days but not flagged for refresh (rule 5 weakening — demotion gap)
- New rule / skill / agent shipped without `## Learning hooks` section (rule 6 violation — meta-rule)
- `/learn` invoked but no candidate batch surfaced (continuous-learning-v2 skill drift)
- Council Phase 2 ends without "Learning signals expected" output (rule 9 weakening)
- Council Phase 3 ends without "Learning event emitted" confirmation (rule 9 weakening)
- Learning-events.jsonl accumulates > 100 unreviewed candidates (review cadence weakening)
- Rule downgraded to "advisory" but still cited as enforced in agents / skills (status drift)

**Refinement candidates**:

- Tightening of the confidence-threshold table when low-confidence approvals prove load-bearing
- New event-schema field when a recurring learning class needs additional context (e.g., session-id, parent-plan-slug, rule-affected list)
- New cross-reference when a sister rule changes the artifact shape the loop depends on
- Promotion of `/learn` from manual invocation to scheduled batch when the user's session cadence makes manual triggering miss candidates

### `council-default.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Task shipped without a Council verification block (Council bypass attempted)
- Core Five division speaks in boilerplate ("looks fine") instead of real analysis (rule 1 weakening)
- Extended Division trigger matched but Division did not engage (council-triggers.md miscalibration)
- Tiebreaker invoked but the outcome contradicts the tiebreaker matrix (matrix needs review)
- Veto invoked without explicit documentation in the consensus block (rule 5 enforcement weak)
- Abbreviated mode degraded into zero-Council in practice (speed-mode discipline weak)
- Post-implementation review skipped on a Council-mediated task (rule 10 violation)

**Refinement candidates**:

- New trigger row in `council-triggers.md` when a Division consistently engages on a pattern that wasn't in its trigger ruleset
- Tightening of the tiebreaker matrix when an ambiguity surfaces in practice
- New row in the task-class table when a new shape of work needs its own Council pacing
- New cross-reference when Phase 0 / Phase 1 / Phase 2 / Phase 3 protocol gains a load-bearing artifact

### `council-triggers.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Division should have engaged but no trigger matched (false-negative — the
  CLAUDE.md summary or skill catalog needs a broader trigger)
- Division engaged but had nothing material to add repeatedly (false-positive —
  trigger needs narrowing in the `council-rules` skill)
- The `council-rules` skill did NOT load when precise adjudication was needed
  (its `paths:` gating missed a domain — extend the globs)
- A new file pattern emerges that no Division claims (new trigger row — add to the
  skill catalog, and the summary in CLAUDE.md if decision-critical)

**Refinement candidates**:

- New trigger glob / keyword in the `council-rules` skill when a recurring pattern
  doesn't fire the right Division
- New `paths:` entry on the `council-rules` skill when a domain's precise catalog
  is needed but the skill didn't fire
- Promotion of a trigger from the skill's detail into the CLAUDE.md always-on
  summary when it proves decision-critical at task start

### `diagnose-before-fixing.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- A code change shipped to fix a runtime failure without a written proven root
  cause (rule 1 violation — guess-and-patch)
- A hypothesis coded without a refutation attempt first (rule 2 weakening)
- A diagnosis taken from a recording/replay/unit-test/default that diverges from
  the live path (rule 3 violation — validate-the-proxy)
- A speculative fix deployed while the suspect layer had no observability (rule 4
  — should have instrumented first)
- Multiple speculative changes stacked in one deploy/observation (rule 5)
- A comparison/SLO metric shipped without the dimension it exists to compare
  (rule 6 — blind comparison metric)
- A "fixed" claim without the before/after signal on the live path (rule 7 +
  `no-overclaim.md`)

**Refinement candidates**:

- New proxy class in rule 3's list when a fresh live-vs-proxy divergence bites
- New observability shape in rule 6 when a failure mode proves unobservable
- Promotion of a recurring instrument-first pattern into a language/stack skill
- New cross-reference when a sister rule provides a gate this discipline depends on

### `done-criteria.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- "Done" claims later proven incomplete (the checklist had a gap — capture which row was missed)
- Re-claiming "done" after the same gate failed in the prior turn (verification discipline weak)
- Verification block missing on a completion claim (no-overclaim.md enforcement weak)
- New language / runtime added to the project without a per-language section here (rule needs extension)
- Same gate repeatedly fired across services on different bug classes (gate name + scope might need split)
- Migration / refactor declared "done" then a follow-up reveals leftover references (mechanical sweep step needs reinforcement)

**Refinement candidates**:

- New per-language verification suite row when a language gains presence in the rebuild
- New checklist row when a missed dimension appears in 2+ retrospectives
- Tightening of any threshold (coverage, complexity, lint) when chronic miss observed
- New cross-reference when a sister rule's gate becomes part of every "done" decision

### `model-tier-selection.md`

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- A role hardcoded to a model instead of resolved via its ladder (rule violation)
- Fable selected for a `security-and-regulated-review` role (exclusion breached)
- Fable routed to mechanical / search / routine review (ladder-floor ignored — waste)
- A runtime model-unavailable / refusal handled by silent downgrade (no note)
- Availability config assumed present without the safe default fallback
- The same install repeatedly hitting a resolved model that isn't actually available (declaration drift — prompt the user to fix the config)

**Refinement candidates**:

- New ladder row when a new Council role class emerges
- New tier row when Anthropic ships a new model (re-cite + re-order capability)
- Tightening of an exclusion when a model class proves unfit for a role
- Promotion of a "metered/credits" nuance into the availability config if
  cost-throttling a gated model per-task proves load-bearing

### `no-bloat.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New interface / flag / parameter / endpoint added with no present consumer
  (rule 1 violation — speculative generality)
- Two methods / handlers with near-identical bodies shipped instead of one
  primitive (rule 2 — collapse missed)
- Same block duplicated 3+ times without extraction (rule 3 — DRY)
- A broad interface widened (forcing all implementers/mocks to grow) where a
  narrow new interface would do (rule 4 — segregation missed)
- Append to a file already past the soft cap instead of a cohesion split
  (rule 5 weakening)
- Superseded code left in "for now" in a change that obsoleted it (rule 6)
- New dependency added for standard-library-equivalent functionality (rule 7)
- Comment restates the code / obsolete prose retained (rule 8)
- Padded near-duplicate test cases exercising one path (rule 9)

**Refinement candidates**:

- New anti-pattern entry when a recurring bloat shape appears
- Tightening of the size-cap split guidance when god-file growth recurs
- New cross-reference when a sister rule provides a gate the no-bloat audit
  depends on
- A mechanical detector promoted to the edit-time hook when a bloat class proves
  catchable without false positives

### `no-overclaim.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- "Done" claim issued without a verification block this turn (rule violation pattern)
- User challenges a completion claim and finds it wrong (re-affirm discipline weak)
- Strong-completion language ("100%", "shipped", "bulletproof") used without proof
- Same rhetorical phrase ("looks clean", "should be fine") recurring across sessions
- Verification block missing a gate that later proved load-bearing (gate roster needs extension)
- Re-claim after the same gate failed in the prior turn (verify-before-claim discipline weak)

**Refinement candidates**:

- New banned-phrase entry when a rhetorical claim recurs without proof
- New verification gate when a missed dimension produces a false "done" in 2+ retrospectives
- Tightening of the "verified this turn" definition when stale-verification incidents recur
- New cross-reference when a sister rule's gate is the proof a "done" claim depended on

### `no-silent-failures.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- False-positive success toast where the optional sub-step actually failed (rule 1 violation pattern)
- Async op left in "pending forever" terminal state (rule 2 violation)
- Optimistic UI update without rollback on failure (rule 3 weakening)
- Webhook handler returning 200 OK while DLQ-routing failures silently (rule 4 weakening)
- Polling loop with no timeout escalation surfacing as "stuck spinner" UX (rule 6)
- Confirmation flow mutation that didn't actually apply but reported success (rule 5)
- Same partial-success pattern recurring across handlers (taxonomy needs new code class)
- `throw` / `reject` / `raise` shipped in a user-facing path without an accompanying toast / inline validation / banner / state transition (rule 7 violation — the strongest form)
- Generic ErrorBoundary catch-all relied on as the FIRST UX surface instead of per-action UX (rule 7 weakening)
- Server returns a typed `error_code` + `message` but the client renders generic "Something went wrong" (rule 7 banned-shape — the `useApiError` composable / hook isn't mapping the code)
- Sync handler `throw new ValidationError(...)` not caught + surfaced inline on a form (rule 7 sync-path violation)
- Server controller `throw` without centralised exception-mapping middleware turning into a generic 500 (rule 7 server-side weakening)

**Refinement candidates**:

- New rule when a new false-positive success shape appears in 2+ incidents
- New cross-reference when a sister rule (no-discards, error-handling-with-context) covers a pattern previously thought unique to this rule
- Tightening of the "every async op has a known status" rule when a new state-machine gap is observed
- New entry in the optimistic-rollback pattern table when a new domain case surfaces

### `official-docs-first.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `docs/provider-research/<provider>.md` missing for an integration that shipped (rule violation pattern)
- Provider-research note > 6 months stale and integration touched without refresh (cadence rule needs reinforcement)
- Integration shaped from npm README / Stack Overflow instead of provider docs (Phase 0 discipline weak)
- Personal-tier vs commercial-tier scope unclear — boundary missing (rule needs new section example)
- Auth model assumed instead of cited (recurring shortcut pattern)
- Deprecation notice from provider arrived but integration not re-read (cadence rule needs reinforcement)
- Same provider integrated by multiple agents independently (candidate for shared provider-research template)

**Refinement candidates**:

- New canonical-doc-surface entry when a provider's docs need named anchor (table extension)
- New anti-pattern entry when a shortcut recurs across 2+ integrations
- Tightening of the 6-month refresh cadence when provider deprecations get missed
- New pairing entry when sister rules consistently catch what this rule misses

### `plan-completion-before-push.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `git push` executed while plan phases still pending (rule 2 violation — push gate weakening)
- Active plan does not declare `commit-policy` in its Context (rule 1 violation — implicit policy drift)
- "Push" inferred from ambiguous user language ("ship", "ready", "looks good") without explicit confirmation (rule 10 weakening)
- Bug-fix exception claimed without an actual live-failure / explicit-override pair (rule 3 misuse)
- Multi-repo push approval reused across repos without per-repo confirmation (rule 7 weakening)
- `git push --tags` or PR creation done mid-plan without explicit per-action authorization (rules 8 + 9 weakening)
- Verification block missing or stale at push time (rule 6 violation — claim without proof)
- `--no-verify` / `--no-gpg-sign` used to bypass hooks (rule 5 violation)

**Refinement candidates**:

- New row in the "exception" rule when a recurring time-pressure class (security incident, regulator deadline) emerges with documented user-side authorization shape
- Tightening of the ambiguous-language list when a new phrase ("let's go", "all good") proves to silently authorize pushes
- New cross-reference when a sister rule (no-overclaim, verify-before-claim, no-silent-drops) provides a pre-push gate
- New row in the push-decision response shape when multi-repo / multi-branch / multi-tag pushes recur

### `plan-execution-progress.md`

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

### `plan-task-breakdown.md`

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

### `post-phase-retrospective-review.md`

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- Phase closeout without the five-step sweep block (Rule 1 violation)
- Step 2 re-used the same gate as the prior phase's verification (Rule 2 violation)
- Step 3 (wiring) skipped on a phase touching cross-repo seams (Rule 4 weakening)
- Step 4 reported "PASS" without naming the layer each prior gate did NOT exercise
  (Rules 6 + 8 principal-floor weakening)
- Step 5 follow-up absorbed into "I'll handle it later" without a durable record
  (`no-silent-drops.md` violation)
- User reports a regression the prior phase's gates "passed" (Rule 3 weakening)
- Multi-PR stream with no accumulated retrospective map (Rule 11 weakening)
- Same miss class across 3+ phases without an automated check added (Rule 10)
- User-visible fix marked "done" before user confirms (Rule 9 weakening)
- Council Phase 2 re-check skipped on a materially-touched prior phase (Rule 7)
- Durable phase-review artefact not written (Rule 12 violation)
- STOP-THE-LINE signal proceeded past silently (escalation weakening)

**Refinement candidates**:

- New gate-roster row when a new artifact class needs a retrospective gate
- New recurring-miss-class entry when 3+ phases hit the same class without a check
- Tightening of the "different-angle gate" requirement when same-gate retros recur
- New STOP-THE-LINE signal when a recurring escalation condition surfaces
- New cross-reference when a sister rule provides a gate the sweep depends on

### `principal-level-mandate.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New agent file written without all required body sections (depth-floor violation)
- New skill SKILL.md < 500 words (shallow-stub floor breached)
- Skill missing standards citations with version + section (rule "Standards Cited" weakening)
- "Best practices recommend" / "studies show" / "common patterns" used without primary source (non-cited claim recurrence)
- Council Division emits bare boilerplate ("looks fine") or fails to engage its domain — the coverage-guarantee violation (mere brevity is NOT a violation when the one-clause gated verdict shows real engagement)
- Tactical-only contribution shipped without trade-off + failure-mode + verification signal (breadth weakening)
- Single-domain reasoning on a cross-cutting topic (e.g., security agent ignoring compliance overlap)
- Project-specific names / paths / vendor identifiers found in a global artifact (rule "Banned in global" violation)
- Agent's `model:` is `sonnet` for a domain that warrants opus depth (depth-vs-model mismatch)
- Redirect stub left undocumented as such (implicit shallowness)

**Refinement candidates**:

- New required section in the agent / skill template when a recurring depth gap surfaces (e.g., new "Cost model" section, new "Rollback signal" section)
- Tightening of the word-count floor when 500-word skills consistently produce thin outputs
- New banned vocabulary entry when a non-cited claim shape recurs
- New cross-reference when a sister rule (rule-authoring-global-vs-project, continuous-learning-mandate, verify-before-claim) provides a gate the depth audit must run
- Model-tier reassignment when an agent's track record shows opus is genuinely warranted (or genuinely overkill)

### `project-memory.md`

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

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

### `project-scoped-artifacts.md`

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

### `rule-authoring-global-vs-project.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New rule file created without first SEARCHING for an existing rule covering the same concern (duplicate-rule risk — reuse-first). Incident 2026-06-05: a `post-phase-principal-audit.md` was created when `post-phase-retrospective-review.md` already existed; the fix was to consolidate into the existing rule + delete the duplicate. ALWAYS `grep`/`ls` `rules/common/` for the concept before authoring; extend the nearest existing rule rather than adding a sibling.
- New rule written without classification step (rule 1 violation — classify-before-writing)
- Global rule contains project / workspace / vendor names or session-specific dates (rule 2 violation — purity sweep failed)
- Workspace rule attempts to LOWER a global threshold (rule 4 violation — strictest wins)
- "For now, refactor later" comment on a misplaced rule (rule 4 weakening — refactor never lands)
- Workspace `CLAUDE.md` missing the "Project rules" index section (rule 8 weakening)
- New skill / agent shipped without classification step (rule 9 weakening)
- Cross-workspace pattern observed in 2+ projects without promotion proposed (rule 7 promotion gap)
- Global rule consistently overridden in practice without demotion proposed (rule 6 demotion gap)
- Classification rationale absent from the agent's response when adding a rule (rule 10 weakening — decision not recorded)

**Refinement candidates**:

- New banned-content row when a recurring project-specific leak class appears in global (e.g., specific cloud region, specific compliance regulator)
- Tightening of the cross-workspace-pattern detection when 2+ similar rules accumulate without promotion
- New cross-reference when a sister rule (project-scoped-artifacts, continuous-learning-mandate) provides the promotion / demotion pipeline
- New per-language guidance when a workspace's stack-specific rule shape proves load-bearing across projects

### `task-intake-due-diligence.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Task shipped without the always-fire core (rule violation)
- A domain question's trigger matched but the question didn't fire (gating gap —
  the trigger map or `council-triggers` needs the link)
- A domain gap shipped (e.g. an a11y / compliance miss) whose trigger SHOULD have
  fired the question (trigger too narrow — broaden, per over-include principle)
- A core question consistently answered shallowly (depth needs reinforcement)
- N/A rows reappearing in intake output (gating not applied — the rewrite regressed)
- Online research (Q29) skipped on an external integration

**Refinement candidates**:

- Move a domain question into the always-fire core if it proves near-universal in
  practice (or the reverse — demote a core question to gated if it's often N/A)
- New domain question + trigger when a missed dimension recurs in 2+ retrospectives
- Tightening of a trigger when a domain question fires but is consistently N/A
- New cross-reference when a sister rule's gate is the proof a question depends on

### `ui-ux-quality-bar.md`

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- A user-facing change shipped with no UI/UX verification block (rule 8)
- An empty / loading / error state missing from a surface that can reach it (rule 1)
- A raw exception, status code, or generic message shown to a user (rules 2 + 3)
- A destructive action confirmed without naming its consequence (rule 4)
- An a11y failure found AFTER ship that a keyboard pass would have caught (rule 5)
- Strings hardcoded with i18n deferred to a later phase (rule 6)
- A backend feature marked done with its UI tracked separately (rule 7)
- "Scaffold" used as a finish line on a user-facing feature

**Refinement candidates**:

- New anti-pattern row when a copy failure recurs across surfaces
- New state in rule 1 when a flow class needs one the list omits
- Promotion of a recurring check into an automated probe (contrast, focus, target size)
- Tightening of rule 6 when a locale gap ships despite the rule

### `validate-payloads-before-coding.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Parser/builder written without a live/fixture/schema validation of the shape (rule 1/3 violation)
- `data`/payload assumed list-vs-object and proven wrong later (anti-pattern recurrence)
- Test-write fired at production to learn a shape (rule 2 violation)
- PII probe committed or left in `/tmp` (rule 5 violation)
- Field reads empty in prod where data expected → shape was guessed (rule 6 signal)
- Completion claim on an integration without the payload-validation block (verification weakening)

**Refinement candidates**:

- New ground-truth source row when a project provides a contract registry / recorded-cassette tooling
- Tightening of the write-payload validation guidance when a safe non-prod write path becomes standard
- New cross-reference when a sister rule provides the fixture/contract gate

### `verify-before-claim.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Claim phrase issued without same-turn verification (rule 1 violation)
- Stale verification block (gate ran earlier turn; files have changed since)
- Re-affirm under user challenge without re-verification (rule 6 violation)
- Verification block missing a gate the claim class requires (rule 7 scope mismatch)
- Manual verification (UI smoke / accessibility / perf) skipped on a UI / a11y / perf change
- "No-op" claim made without confirming the diff scope is actually no-op
- Verifiable code change delegated to a sub-agent/tool that cannot run the gate (rule 11 violation)
- A delegate's edits accepted as "done" without the orchestrator running the gate on them this turn (rule 11)

**Refinement candidates**:

- New row in the "verification scopes by claim type" table when a claim class gains a load-bearing gate
- New banned claim phrase when a recurring rhetorical pattern slips past the rule
- Tightening of the "re-run when" triggers when stale verifications recur
- New cross-reference when a sister rule defines the gate a claim depends on

### `wiring-and-usage-review.md`

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- A new symbol shipped with no live-path consumer (rule 1 violation)
- A control unit-tested but not called on the live path (rule 2 — inert validator)
- A resource opened without a wired teardown (rule 3 — lifecycle asymmetry)
- A completion claim without the wiring + usage line (rule 5 weakening)
- The dead-code detector not run in the gate on a touched file (rule 6 weakening)
- A cross-artifact reference (runbook→alert, CLI→command, doc→path) that dangles
  (rule 7 violation)
- "Wire it next phase" deferral that ships an inert symbol (anti-pattern)
- Found-inert code deleted without per-item wire-vs-delete classification or live-path
  verification — esp. a batch/agent fan-out treating a trace as a delete-list (rule 9
  violation); a deliberately-authored-but-unwired feature deleted instead of wired

**Refinement candidates**:

- New detector row when a language/artifact class gains an unused-symbol tool
- New anti-pattern entry when a recurring inert-code shape appears
- Tightening of the "documented entry point" exception when it's used to excuse
  genuinely-orphan code
