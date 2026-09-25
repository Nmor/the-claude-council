---
name: planning-rules
description: Planning + verification discipline for multi-phase work — code-graph-validation (incremental per-task + phase-boundary + pre-push sweeps), ADR template (MADR / Nygard format), runbook template (canonical incident-response structure). Invoke when writing or reviewing a plan, an ADR or a runbook, and before acting on the detail of plan-completion-before-push.md.
---

# planning-rules

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H
> will delete the source files to close the eager-load loop.

## Purpose

Planning + verification discipline for multi-phase work. This file is a ROUTING
TABLE: it names each topic and the reference file that carries its full text.
Read the row that matches the work in hand, then open that reference — the
detail is unabridged there, not summarised here.

Progressive disclosure, per `no-bloat.md` rule 10: this skill is `paths:`-gated,
so whenever a glob matches, whatever lives in this file is added to the always-on
Floor in full. The routing table is what every match pays; the references are
what only the relevant task pays.

## Standards Cited

The documentation formats the migrated rules build on; detail lives in the references.

- **Nygard, "Documenting Architecture Decisions" (2011)**: the ADR format (`references/adr-template.md`)
- **MADR (Markdown Any Decision Records)**: the ADR structure these templates stay compatible with
- **C4 Model** (Simon Brown): context, container, component and code views
- **arc42**: the architecture-documentation template the ADR rule cross-references

## Routing table

| Topic | When you need it | Reference |
| --- | --- | --- |
| **Code-graph validation** | Any task, todo, commit, phase or completion claim that touches code, config or wiring. Incremental per-task checks, the per-surface + per-language command matrices, phase-boundary sweep, pre-push full-graph gate, `BUG(unwired-…)` discipline. | [`references/code-graph-validation.md`](references/code-graph-validation.md) |
| **ADR template** | Recording a non-trivial architectural decision before the implementation lands. What counts as architectural, the MADR-compatible structure, numbering / immutability / supersede rules, standards cited. | [`references/adr-template.md`](references/adr-template.md) |
| **Runbook template** | Introducing an alert, a failure mode or an error code. The required entry structure (What you'll see → Diagnose → Fix → Verify → Communicate), the eight hard rules, the canonical incident classes. | [`references/runbook-template.md`](references/runbook-template.md) |
| **Plan completion before push** | Any `git push`, `git push --tags`, or `gh pr create` during plan execution. Commit policy per plan, the push gate, the narrow bug-fix exception, branch protection, the AI-attribution trailer ban, the canonical push flow. | [`references/plan-completion-before-push.md`](references/plan-completion-before-push.md) |

## Source files migrated

- `rules-library/common/code-graph-validation.md`
- `rules-library/common/adr-template.md`
- `rules-library/common/runbook-template.md`
