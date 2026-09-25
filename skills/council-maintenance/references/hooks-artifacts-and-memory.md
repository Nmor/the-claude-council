# council-maintenance: Hooks artifacts and memory

> Learning hooks for the rules governing where an artifact lives — global vs project classification,
> the workspace scaffold, project memory. Pointed at by the `## Per-rule learning hooks` routing
> table in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## `project-memory.md`

Per [`common/continuous-learning-mandate.md`](../../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- A session acting on a memory entry that turned out false (rule 3: the entry was not updated
  when its fact changed) — the class the Stop gate cannot prove; record which fact moved
- `memory-lint.mjs --all` counts rising in any project, or the Stop gate blocking on the same
  finding kind across projects (the lint needs a new check, or the rule a new line)
- A project asked for its `Active plan:` line more than once (rule 4: the pointer is being lost
  or not written back)
- Progress copied into memory (rule 3) — the one check the gate only makes on files a session wrote
- A multi-repo project's facts duplicated across its repos' memories (rule 1: candidate for a
  shared `autoMemoryDirectory`, on the owner's decision)
- Memory referenced as a repo path in a tracked file (rule 9)
- Secrets / PII observed in a memory file (rule 8 — escalate to security)

**Refinement candidates**:

- New per-topic file template when a recurring memory class emerges (e.g., per-cell deployment
  shape, per-tenant quirks)
- Tightening of the bloat policy when 200-line cap is exceeded across multiple projects
- A new memory-lint check when a stale-entry class recurs that a machine can prove
- New cross-reference when a sister rule (hooks, continuous-learning-mandate) adds a memory consumer

## `project-scoped-artifacts.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Non-trivial Council-mediated task in a workspace without `.claude/` directory + no first-touch
  scaffold offered (rule 1 violation)
- Scaffold copied but `CLAUDE.md` not customised for project name / tech stack (rule 3 weakening)
- Project rule LOWERS a global threshold (rule 4 violation — strictest wins)
- Workspace `.claude/audits/learning-events.jsonl` accumulates candidates without `/learn` batch
  review (rule 5 weakening)
- Cross-workspace pattern observed in 2+ projects without promotion proposal (rule 6 weakening)
- Global rule contradicted in a workspace 5+ times without demotion proposal (rule 7 weakening)
- A plan the gates cannot tie to its project: no `Active plan:` line naming it (rule 9)
- Universal preferences kept in a memory directory, which only one project loads, instead of
  user-level instructions (rule 10)
- Tech-stack auto-detection skipped on first scaffold (heuristic-table gap)

**Refinement candidates**:

- New tech-stack detection row when a new ecosystem signal surfaces (e.g., `bun.lockb`, `deno.json`,
  `mise.toml`)
- Tightening of the "first-touch trigger" criteria when trivial-work cases are misclassified as
  non-trivial
- New cross-reference when a sister rule (rule-authoring-global-vs-project,
  continuous-learning-mandate) provides the classification or promotion pipeline
- New entry in the canonical scaffold structure when a recurring per-project artifact class (e.g.,
  per-project ADR archive, per-project incident log) emerges

## `rule-authoring-global-vs-project.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New rule file created without first SEARCHING for an existing rule covering the same concern
  (duplicate-rule risk — reuse-first). Incident 2026-06-05: a `post-phase-principal-audit.md` was
  created when `post-phase-retrospective-review.md` already existed; the fix was to consolidate into
  the existing rule + delete the duplicate. ALWAYS `grep`/`ls` `rules/common/` for the concept
  before authoring; extend the nearest existing rule rather than adding a sibling.
- New rule written without classification step (rule 1 violation — classify-before-writing)
- Global rule contains project / workspace / vendor names or session-specific dates (rule 2
  violation — purity sweep failed)
- Workspace rule attempts to LOWER a global threshold (rule 4 violation — strictest wins)
- "For now, refactor later" comment on a misplaced rule (rule 4 weakening — refactor never lands)
- Workspace `CLAUDE.md` missing the "Project rules" index section (rule 8 weakening)
- New skill / agent shipped without classification step (rule 9 weakening)
- Cross-workspace pattern observed in 2+ projects without promotion proposed (rule 7 promotion gap)
- Global rule consistently overridden in practice without demotion proposed (rule 6 demotion gap)
- Classification rationale absent from the agent's response when adding a rule (rule 10 weakening —
  decision not recorded)

**Refinement candidates**:

- New banned-content row when a recurring project-specific leak class appears in global (e.g.,
  specific cloud region, specific compliance regulator)
- Tightening of the cross-workspace-pattern detection when 2+ similar rules accumulate without
  promotion
- New cross-reference when a sister rule (project-scoped-artifacts, continuous-learning-mandate)
  provides the promotion / demotion pipeline
- New per-language guidance when a workspace's stack-specific rule shape proves load-bearing across
  projects
