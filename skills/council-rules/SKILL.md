---
name: council-rules
description: Full Council Structure — Core Five Divisions (Architecture/Implementation/Quality/Security/Testing) + Extended Eleven Divisions (Compliance/UX/Ops/Data/Finance/Risk/Strategy/People/ESG/AI-Ethics/Comms) with veto authority + agent rosters + per-division personas (collective experience, core principles, key deliverables, checklists, red flags) + Conversation Rules (order of speaking, research depth, disagreement protocol, escalation to user). Use when authoring/editing agent files, running Council debates, resolving division tiebreakers, or training new contributors on Council conventions.
---

# Council Rules — Full Division Detail + Personas + Conversation Rules

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/CLAUDE.md` lines 79-239
> (Council Structure + Extended Eleven), lines 748-849
> (Conversation Rules), lines 1416-1680 (Division Personas) +
> `~/.claude/rules/common/council-triggers.md` content.
> Sister skill: [`council-protocol`](../council-protocol/SKILL.md)
> which holds the Phase 0/1/2/3 templates.

## When to activate

This skill fires when:

- Any agent file under `~/.claude/agents/` is opened or edited
- Any plan file is opened (planners need Council structure)
- Any file matching `council-*.md` under `rules/common/` is touched
- Workspace `COUNCIL.md` files are opened

The Floor rules `council-default.md` + `council-triggers.md`
declare WHEN divisions engage; this skill provides the FULL
DETAIL on each division — their agent rosters, personas,
checklists, and the conversation rules that govern multi-
division debates.

## Standards Cited

The frameworks the division catalogue triggers on and reviews against; the triggers and
vetoes that apply them live in the references.

- **OWASP Top 10**: Division 4's baseline review checklist
- **GDPR** (incl. Article 22 automated decisions, Article 8 children), **CCPA / CPRA**
- **HIPAA / HITECH** and **42 CFR Part 2**: the health sub-cluster
- **PCI-DSS**: the payments sub-cluster
- **FERPA / COPPA**: the education sub-cluster
- **ISO/IEC 27001**, **ISO 9001:2026**, **ISO 14001**, **ITIL 4**: the frameworks the
  division structure was researched against (`references/trigger-catalog.md`)
- **WCAG 2.2 AA**: accessibility on user-facing and assessment paths

## Routing table

This skill is `paths:`-gated, so whatever it holds is added to the always-on
Floor IN FULL whenever a glob matches. The detail therefore lives in
`references/`; this page routes to it. Read only the row(s) the task needs.

| Topic | Read this |
| --- | --- |
| Core Five — structure + agent roster (Divisions 1-5: leads, models, responsibilities, when to engage, frontend skill auto-activation) | [`references/core-five-divisions.md`](references/core-five-divisions.md) |
| Extended Eleven — leads + veto authority (Divisions 6-16 summaries: auto-fire signals, veto/escalation) | [`references/extended-eleven-divisions.md`](references/extended-eleven-divisions.md) |
| Conversation rules (order of speaking, research-depth minimums per division, disagreement protocol, escalation-to-user format) | [`references/conversation-rules.md`](references/conversation-rules.md) |
| Division personas (collective experience, core principles, deliverables, review checklists, quality metrics, OWASP + severity tables, secure-coding patterns, red flags) | [`references/division-personas.md`](references/division-personas.md) |
| Agent delegation + orchestration (available-agents table, immediate agent usage, parallel Task execution, multi-perspective analysis) | [`references/agent-delegation.md`](references/agent-delegation.md) |
| Full per-division trigger catalog (every file glob, keyword set, change-scope trigger + veto authority; payments / health / education sub-clusters; cross-cutting composition; how triggers are evaluated) | [`references/trigger-catalog.md`](references/trigger-catalog.md) |
| Model-tier ladders + availability (tier capability table, resolution algorithm, `~/.claude/.local/model-availability`, graceful degradation, alias currency, anti-patterns) | [`references/model-tier-ladders.md`](references/model-tier-ladders.md) |

## Cross-references

- `~/.claude/skills/council-protocol/SKILL.md` — sister skill: Phase 0/1/2/3 templates + Research
  Requirements + Post-Implementation Review
- `~/.claude/rules/common/council-default.md` — Floor: Council always convenes
- `~/.claude/rules/common/principal-level-mandate.md` — Floor: quality bar every division enforces
- `~/.claude/agents/architect.md` — Division 1 lead
- `~/.claude/agents/planner.md` — Division 1 lead
- `~/.claude/agents/security-reviewer.md` — Division 4 lead
- `~/.claude/agents/code-reviewer.md` — Division 3 lead
- `~/.claude/agents/tdd-guide.md` — Division 5 lead
- `~/.claude/agents/compliance-reviewer.md` — Division 6 lead (VETO)
- `~/.claude/agents/risk-reviewer.md` — Division 11 lead (VETO)
- `~/.claude/agents/ai-ethics-reviewer.md` — Division 15 lead (VETO)

## Why this skill exists

The Council Structure detail, Extended Eleven specifics,
per-division personas, conversation rules, and disagreement
protocols are REFERENCE material the assistant consults when:

- Authoring or editing an agent file (the agent IS one of these
  division roles; the skill clarifies the role's scope)
- Running a Council debate that needs the full per-division
  checklist (most everyday tasks invoke divisions from memory
  via Floor's `council-default.md`)
- Resolving a tiebreaker the Floor rules can't (Floor names the
  veto matrix; this skill names the divisions' personas in
  enough detail to inform the casting vote)

Everyday code work doesn't need this level of detail loaded;
the Council Phase 1 happens from memory + Floor knowledge.
This skill exists to provide the durable record when the
assistant authors something Council-shaped (an agent file, a
plan, a runbook, an ADR).

Migration provenance: CLAUDE.md lines 79-239 (Council Structure +
Extended Eleven), 748-849 (Conversation Rules), 1416-1680
(Division Personas) → moved here 2026-06-02 as part of the
lazy-rules-loading plan.
