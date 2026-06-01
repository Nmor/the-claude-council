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

- Generic skill (e.g., `coding-standards`, `api-design`,
  `tdd-workflow`) → `~/.claude/skills/`
- Project skill (e.g., a specific feature's domain skill that
  only matters in one codebase) → `<project>/.claude/skills/`

Default: skills are MOSTLY global (they encode patterns + best
practices, not project specifics). Agents are MOSTLY global
(they encode review / build / test workflows, not project
specifics).

### 10. The classification decision is recorded

When a new rule lands, the agent's response includes:

```
Rule added:
- Path: ~/.claude/rules/common/<rule>.md  (or workspace path)
- Classification: global | project
- Why: <one-line rationale>
- Cross-references: <related rules>
```

The classification + rationale go in the rule's "Why this rule
exists" section for durable record.

## Anti-pattern: project ref in global

```
# WRONG — global rule with workspace-specific reference
"For projects with verify-local.sh (<project-a>, <project-b>,
<project-c>), add this gate inline."

# RIGHT — abstract reference
"For projects with a local pre-flight script (typical names:
infra/verify-local.sh, scripts/preflight.sh), add this gate
inline."
```

## Anti-pattern: global principle in project

```
# WRONG — project rule restating global principle
"This project does not allow `// eslint-disable` comments." (the
global no-discards / extreme-lint-policy rules already say this)

# RIGHT — project rule that extends global with project-specific
"In this project, `// eslint-disable` is forbidden (per global
no-discards.md) AND any necessary lint config exception is
documented in `docs/lint-debt.md` with a re-tightening date."
```

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

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
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
