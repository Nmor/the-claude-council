---
name: git-rules
description: Git + repo discipline — git-workflow (per-org identity, conventional commits, PR workflow), repo-setup-checklist (20-point first-touch security audit), docs-sync-with-code (every PR ships docs + code together), documentation-requirements (Diátaxis four-quadrant: tutorials / how-tos / reference / explanation). Auto-fires on git config + repo setup files + docs/.
paths:
  - "**/.gitignore"
  - "**/.gitattributes"
  - ".git/**"
  - ".githooks/**"
  - "CONTRIBUTING.md"
  - "README.md"
  - "**/CONTRIBUTING.md"
  - "**/README.md"
  - "docs/**/*.md"
  - "**/docs/**/*.md"
---

# git-rules

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H
> will delete the source files to close the eager-load loop.

## Purpose

Git and repo discipline: who a commit is authored as, what a repo must satisfy
before work starts in it, and the documentation that ships alongside the code.
This file is a ROUTING TABLE — the detail lives in `references/`, one file per
concern, read on demand rather than carried on every turn that touches a
`README.md` or a `docs/` page.

## Routing table

| Row | Read when | Reference file |
| --- | --- | --- |
| **Git workflow** | Committing, branching, opening a PR, or first-touching a repo in a different GitHub org (per-org identity + signing keys) | [`references/git-workflow.md`](references/git-workflow.md) |
| **Repo setup checklist** | A repo is cloned, initialised, first-touched this session, or last touched > 30 days ago — the 20-point tracked-state / dependency / infra / secrets / CI audit | [`references/repo-setup-checklist.md`](references/repo-setup-checklist.md) |
| **Docs sync with code** | A change alters user-visible behaviour, or a stale doc / landing page is encountered while working on something else | [`references/docs-sync-with-code.md`](references/docs-sync-with-code.md) |
| **Documentation requirements** | Authoring or reviewing any doc surface — README, architecture, ADR, runbook, API reference, tutorials — or choosing a doc toolchain | [`references/documentation-requirements.md`](references/documentation-requirements.md) |

## Source files migrated

- `rules-library/common/git-workflow.md`
- `rules-library/common/repo-setup-checklist.md`
- `rules-library/common/docs-sync-with-code.md`
- `rules-library/common/documentation-requirements.md`
