# Project `.claude/` Scaffold Template

> Canonical scaffold for a workspace-level `.claude/` directory.
> Copied into `<workspace>/.claude/` on first non-trivial
> Council-mediated task in a project that doesn't yet have one.
> Per [`../../docs/PROJECT-BOOTSTRAP.md`](../../docs/PROJECT-BOOTSTRAP.md)
> and [`../../rules/common/project-scoped-artifacts.md`](../../rules/common/project-scoped-artifacts.md).

## What this template is

This directory is a SKELETON, not a working project. It carries:

- The canonical layout (`rules/`, `skills/`, `agents/`, `plans/`,
  `memory/`, `audits/`)
- Stub files that hint at what each surface holds
- A workspace `CLAUDE.md` template you customize per project
- A `.gitignore` that excludes runtime + user-specific artifacts
- A `MEMORY.md` skeleton for the workspace memory index

The bootstrap flow:

1. Agent detects no `<workspace>/.claude/` on first significant edit.
2. Surfaces an AskUserQuestion: "create the scaffold?"
3. On approval, copies this template into `<workspace>/.claude/`.
4. Customises `CLAUDE.md` with project name + detected tech stack.
5. Proceeds with the edit, using the now-bootstrapped `.claude/`.

## Canonical layout (what gets copied)

```text
<workspace>/.claude/
├── CLAUDE.md               # workspace-level rules + vendor table
├── README.md               # how this .claude/ is organised
├── .gitignore              # excludes settings.local.json, audits/jsonl
├── rules/                  # workspace-specific rules (extend global)
│   └── 00-index.md
├── skills/                 # workspace-specific skills (rare)
├── agents/                 # workspace-specific agents (rare)
├── plans/                  # multi-phase plan files for this project
├── memory/                 # workspace-specific memories
│   └── MEMORY.md           # index of memory files
└── audits/                 # learning events, security audits
    ├── learning-events.jsonl
    └── bypass-log.jsonl
```

## Rules of engagement

- Workspace rules ADD to global; never relax a global threshold
- Project-specific plans live in `<workspace>/.claude/plans/`,
  NEVER in `~/.claude/plans/`
- Project memories live in `<workspace>/.claude/memory/`
- The workspace `CLAUDE.md` is loaded by every session that cd's
  into the workspace

## See also

- [`../../docs/PROJECT-BOOTSTRAP.md`](../../docs/PROJECT-BOOTSTRAP.md)
  — first-touch flow
- [`../../rules/common/project-scoped-artifacts.md`](../../rules/common/project-scoped-artifacts.md)
  — the rule that mandates the scaffold
- [`../../rules/common/rule-authoring-global-vs-project.md`](../../rules/common/rule-authoring-global-vs-project.md)
  — classification of rules into global vs project
