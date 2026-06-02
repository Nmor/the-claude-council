# ADR Template Rule (Always-On, Global)

> Auto-fires on every file. Sister to `docs-sync-with-code.md`,
> `task-intake-due-diligence.md` Q20 (documentation footprint),
> `architect` agent. Standards: **Michael Nygard's ADR format**
> (2011, original definition), **MADR** (Markdown Any Decision
> Records) format.

## Core Principle

**Every non-trivial architectural decision is recorded as a
short Markdown file under `docs/adr/` BEFORE the
implementation lands. The ADR captures the trade-off, the
chosen path, and the consequences — so the next contributor
(or the same engineer six months later) understands WHY the
system is shaped this way, not just WHAT it does.**

## What counts as an "architectural decision"

Decisions that warrant an ADR:

- Adopting a new technology / framework / library (e.g.,
  "we use Postgres for everything except event streams,
  which use ClickHouse")
- Choosing between competing patterns (e.g., "REST vs gRPC
  for internal service-to-service", "monorepo vs polyrepo")
- Database schema design (e.g., "single-table DDB for
  multi-tenant data", "Postgres RLS on every multi-tenant
  table")
- Authentication / authorization shape (e.g., "JWT vs
  session cookies; cell-bound JWTs in multi-region")
- Async pattern (e.g., "SQS for outbox; SNS for fan-out;
  EventBridge for scheduling")
- Cross-cutting concern resolution (e.g., "structured logs
  via @logger module; metrics via EMF inline")
- Migration approach (e.g., "dual-write for 30 days then
  cutover")
- Compliance choice (e.g., "GDPR data deletion via DDB TTL
  - DB column tombstone")
- Tooling / build / deploy (e.g., "pnpm not npm; serverless-
  framework not SAM")

Decisions that do NOT need an ADR:

- Naming conventions (those live in `coding-style.md`)
- Per-PR design choices that don't cross service boundaries
- Library version bumps (those live in `CHANGELOG.md`)
- One-off bug fixes

## Required ADR structure

Every ADR follows this template (MADR-compatible):

```markdown
# ADR-NNNN: <short title>

**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-MMMM
**Date**: YYYY-MM-DD
**Deciders**: <names / roles>
**Tags**: <area1>, <area2>, <area3>

## Context

Why are we making this decision now? What forces are at play
(user load, regulatory requirement, vendor change, performance
ceiling, security incident, team capacity)?

## Decision drivers

Bullet list of the criteria that matter for this decision:

- [Criterion 1] — e.g., "cost at 10× current scale"
- [Criterion 2] — e.g., "complies with GDPR data residency"
- [Criterion 3] — e.g., "compatible with existing TS stack"

## Considered options

| Option | Pros | Cons |
| --- | --- | --- |
| A — <name> | <pros> | <cons> |
| B — <name> | <pros> | <cons> |
| C — <name> | <pros> | <cons> |

## Decision

Option <X> — <name>.

State the decision in present-tense first-person plural:
"We use Postgres + Row-Level Security for multi-tenant data."

## Rationale

Why this option over the others — keyed against the decision
drivers. Cite primary-source references (per
`official-docs-first.md`) where the trade-off relies on
external claims.

## Consequences

### Positive

- [What we gain by choosing this option]
- [Second-order benefit]

### Negative

- [What we give up]
- [Future risk this introduces]

### Neutral

- [Things that change but aren't strictly better or worse]

## Implementation footprint

Files / modules / services this decision affects. (Not the
implementation itself — that's the PR. The ADR names the
surface.)

## Migration / rollout plan

If this is a change from the current state, name the migration
shape (per `task-intake-due-diligence.md` Q17 — rollback / DR
plan):

- Step 1
- Step 2
- ...

## Compliance / regulatory considerations

Any compliance, accessibility, security, or regulatory
implications (per `security.md` compliance table + `a11y.md`
+ `task-intake-due-diligence.md` Q11).

## Related ADRs + references

- ADR-MMMM — <related decision>
- RFC <number> — <protocol reference>
- Vendor docs — <URL>
- Per `task-intake-due-diligence.md`, the intake's Q1-Q29
  populates this ADR's Context + Considered Options +
  Consequences.
```

## Hard rules

### 1. ADRs use a stable numbering scheme

Numbered sequentially from `0001`. Once assigned, an ADR
number is permanent — even if the ADR is deprecated /
superseded, its number stays. Filename:
`docs/adr/0042-postgres-row-level-security.md`.

### 2. Status changes are recorded inline

When an ADR is superseded, the original ADR's status changes
to "Superseded by ADR-MMMM" but the body is left intact for
historical record. The superseding ADR cross-references back.

### 3. ADRs are committed BEFORE the implementation PR

The ADR PR lands first (status: Proposed → Accepted on merge).
The implementation PR(s) reference the accepted ADR. This
order makes the decision reviewable separate from the
implementation, which is reviewable separate from the
architectural rationale.

### 4. ADRs are immutable after acceptance (mostly)

Once an ADR is Accepted, the body is immutable. Status +
"Related ADRs" can be amended; content cannot. To change the
decision, write a superseding ADR.

### 5. ADRs link to the code they govern

The implementation PR includes a comment in the touched files
referencing the ADR number when the architectural choice is
not self-evident. Example:

```typescript
// See ADR-0042 (Postgres RLS) for why every multi-tenant
// query goes through `withTenant(orgId)` instead of WHERE
// clauses on org_id.
```

But the comment is short — the ADR has the full context.

### 6. ADRs cite primary sources

Per `official-docs-first.md`, ADRs that depend on external
behaviour (vendor docs, RFCs, regulation text) cite the
canonical URL — never Stack Overflow / blog posts as the sole
source.

### 7. ADRs are part of every architectural Council Phase 0

Per the Council Protocol Phase 0, architectural decisions
produce an ADR draft as the output. The draft is reviewed by
Council divisions 1 (Architecture) + 4 (Security) + 6
(Compliance) at minimum.

### 8. Repository layout

```text
docs/
├── adr/
│   ├── README.md           # index + acceptance process
│   ├── template.md         # the canonical empty template
│   ├── 0001-record-architecture-decisions.md
│   ├── 0002-...
│   └── 0NNN-...
```

`docs/adr/README.md` lists every ADR with status + date +
title + tags, sorted by number.

### 9. ADRs use plain English

ADRs are read by future engineers (junior, senior, external
auditors, compliance officers). Avoid jargon when possible;
when unavoidable, link to a glossary.

### 10. Bad ADRs are worth more than no ADRs

A short, half-finished ADR that captures the decision +
rationale is better than no ADR. Iterate later. The risk is
losing the "why" — write it down NOW even if rough.

## Cross-references

- `docs-sync-with-code.md` — every architectural change ships
  with the ADR in the same PR
- `task-intake-due-diligence.md` Q20 (docs footprint) — ADR
  is part of the docs footprint
- `task-intake-due-diligence.md` Q9 + Q11 — STRIDE + compliance
  feed the ADR's Compliance section
- `architect` agent — produces ADR drafts during Council
  Phase 0
- `official-docs-first.md` — ADRs cite primary sources
- `done-criteria.md` — ADR is part of every "done" claim that
  introduces architectural change

## Standards cited

- **Michael Nygard's ADR format** (2011, "Documenting
  Architecture Decisions")
- **MADR — Markdown Any Decision Records** (adr.github.io)
- **ARC42** — architecture documentation framework (often
  references ADRs)
- **C4 Model** — Simon Brown — context / containers /
  components / code (architecture diagrams that
  ADRs reference)

## Why this rule exists

Without ADRs, architectural decisions live in:

- Slack threads (vanish after 90 days on free tier)
- PR descriptions (hard to find later)
- Tribal knowledge (vanishes when people leave)
- Implementation code (the WHAT is visible; the WHY isn't)

The cost of writing an ADR at decision time is 30-60 minutes.
The cost of re-deriving an architectural rationale from cold
code six months later is hours, and often produces a different
answer that contradicts the original (causing thrash).

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Architectural decision made without an ADR landing in the same PR (rule 3 weakening)
- ADR amended after acceptance (rule 4 violation — body is immutable; supersede instead)
- ADR not referenced from the code path that implements it (rule 5 weakening — discoverability gap)
- Sequential numbering broken / reused (rule 1 violation — stable numbering)
- Status not updated when an ADR is superseded (rule 2 weakening)
- ADR cites Stack Overflow / blog post as primary source (rule 6 violation per official-docs-first.md)
- Compliance / security implications missing from a regulated-domain ADR (template weakening)
- Council Phase 0 architectural output not crystallised into an ADR (council-default.md weakening)

**Refinement candidates**:

- New required-section row when an ADR class consistently lacks a load-bearing dimension
- Tightening of the "Considered options" requirement when ADRs ship with only one option compared
- New cross-reference when a sister rule (runbook-template, docs-sync-with-code) prescribes companion artifacts
- New tag taxonomy row when a recurring decision domain emerges (data, security, compliance, AI, etc.)
