---
name: org-design
description: Principal-level organisational design — team topologies, span of control, reporting structures, decision rights (DACI / RACI), Conway's Law, coordination cost, scaling from 10 to 1000, the difference between functional / divisional / matrix / network structures, and the discipline that aligns the org chart to the product strategy.
---

# Organisational Design

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> The org chart you draw becomes the architecture you ship.
> Conway's Law isn't a metaphor — it's a forcing function. Design
> the team boundaries with the same care you design service
> boundaries; the product will mirror them either way.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Patterns | [`references/core-patterns.md`](references/core-patterns.md) |

## Purpose

Organisational design is the conscious construction of team
boundaries, reporting lines, decision rights, and coordination
mechanisms so the work that matters can happen with low
coordination cost. Good org design produces teams that ship
fast, decisions that are clear, and a product whose internal
structure matches its external surface. Bad org design produces
endless cross-team dependencies, decision paralysis, and a
product whose seams reveal the political compromises of the
people who built it.

This skill names the canonical structures (functional,
divisional, matrix, network, holacracy), the team topologies
that work at scale (Team Topologies — stream-aligned, platform,
enabling, complicated-subsystem), the decision-rights frameworks
(DACI, RACI, RAPID), the span-of-control discipline, the
coordination-cost math (Brooks's Law), the operational patterns
(operating rhythms, planning cadences, escalation paths), and
the discipline that lets the org evolve with the product
without rewriting itself every time something interesting
happens.

NOT in scope: individual people management (see
`performance-management`); hiring (see `hiring-process`); goal
setting (see `okr-framework`); compensation and equity bands;
HR compliance.

## Standards Cited

- **Skelton M., Pais M. (2019)** — "Team Topologies: Organizing
  Business and Technology Teams for Fast Flow" (four team types,
  three interaction modes)
- **Conway M. (1968)** — "How Do Committees Invent?" (Conway's
  Law: systems mirror communication structures)
- **Galbraith J. (1973, ongoing)** — "Designing Organizations"
  (the Star Model: strategy → structure → processes → rewards →
  people)
- **Mintzberg H. (1979)** — "The Structuring of Organizations"
  (five organisational configurations)
- **Bridgwater P. (Bain), Rogers P., Blenko M. (HBR, 2006)** —
  "Who Has the D?" (RAPID decision-rights framework)
- **Christensen C., Raynor M. (2003)** — "The Innovator's
  Solution" (autonomous BU for disruptive innovation)
- **Brooks F. (1975)** — "The Mythical Man-Month" (Brooks's
  Law: adding people to a late project makes it later;
  coordination cost grows quadratically)
- **Dunbar R. (1992)** — Dunbar's number (~150 stable
  relationships; nested at 5 / 15 / 50 / 150 / 500)
- **Larman C., Vodde B. (2016)** — "Large-Scale Scrum: More with
  LeSS"
- **Adkins L., Adkins L. (2019)** — "Scaling Agile Across the
  Enterprise"
- **Spotify model (Kniberg + Ivarsson, 2012)** — squads /
  tribes / chapters / guilds (and its critique by Spotify itself
  in 2020)
- **Holacracy Constitution v5.0** — Robertson; role-based
  governance (with caveats from sceptics)
- **ISO/IEC 38500:2024** — Governance of IT
- **OECD Principles of Corporate Governance**
- **Kotter J. (1996, 2014)** — "Leading Change" + "Accelerate"
  (dual-system organisations)
- **Edmondson A. (2018)** — "The Fearless Organization"
  (psychological safety as enabler of team performance)
- **Lencioni P. (2002)** — "The Five Dysfunctions of a Team"
- **DevOps Research and Assessment (DORA)** — team structure
  correlates with delivery performance

- **ISO 9001:2015 + 2026 revision** — Quality management systems
  (process approach, risk-based thinking, leadership)
- **ISO 9004:2018** — Quality management — quality of an
  organization (sustained success)
- **ISO 31000:2018** — Risk management guidelines
- **ISO 14001:2015** — Environmental management
- **ISO 45001:2018** — Occupational health and safety
- **ASQ Body of Knowledge — Six Sigma Black Belt** — DMAIC, DMADV,
  SIPOC, Cp/Cpk, DOE, control charts
- **APICS CPIM / CSCP Body of Knowledge** — Supply chain operations
  reference, S&OP, demand planning, SCOR model
- **PMBOK Guide 7th Edition + PMI Standard for Project
  Management** — Project + portfolio + program management
- **Lean Enterprise Institute — Toyota Production System** — JIT,
  jidoka, kanban, kaizen, value-stream mapping, takt time
- **Eurocode 0/1/2/3 + AISC 360 + ACI 318** — Structural
  engineering basis (when civil / structural scope)
- **ASHRAE Handbook + ISO 19650 (BIM)** — Building services + MEP
  - digital coordination (when AEC scope)
- **TRIZ — Altshuller's 40 Inventive Principles + Contradiction
  Matrix** — Systematic innovation methodology
- **Stanford d.school + IDEO Field Guide** — Design thinking
  process (Empathise / Define / Ideate / Prototype / Test)
- **The Lean Startup (Ries 2011) + Customer Development (Blank)** —
  Build-measure-learn loop, MVP taxonomy, pivot types
- **Team Topologies (Skelton + Pais 2019)** — Stream-aligned /
  platform / enabling / complicated-subsystem teams + interaction
  modes
- **OKRs — Measure What Matters (Doerr 2018)** + **Andy Grove's
  HPM** — Objectives + Key Results, CFR, stretch goals
- **The Five Dysfunctions of a Team (Lencioni)** + **High Output
  Management (Grove)** — People + culture frameworks
- **Getting to Yes (Fisher + Ury) + Never Split the Difference
  (Voss)** — Negotiation: BATNA / ZOPA / tactical empathy

### Cross-cutting engineering standards

- **ISO/IEC/IEEE 12207:2017** — Software life cycle processes
  (process-engineering applies to software-delivery workflows)
- **ISO/IEC 25010:2011 §6** — Quality model (process maturity
  feeds product quality characteristics)
- **ISO/IEC 33001:2015** — Process assessment concepts +
  vocabulary (foundation for SPICE / Automotive SPICE)
- **ISO/IEC 33020:2019** — Process measurement framework for
  process capability assessment
- **NIST SP 800-160 Vol 1 Rev 1 + Vol 2 Rev 1** — Engineering
  trustworthy secure systems + cyber resiliency
- **NIST SP 800-218 SSDF §PO** — Prepare the organization
  (process governance + role definitions)
- **NIST SP 800-53 Rev 5 §PM** — Program management controls
  (apply to any organisational process)
- **OWASP SAMM v2** — Software Assurance Maturity Model
  (process-maturity assessment framework)
- **CWE-1059** — Insufficient technical documentation (process
  workflows MUST be documented)

## When to Fire

- Founding or restructuring a team / function / company
- Annual / quarterly planning where org gaps surface
- Recurring complaint: "every change requires three teams to
  coordinate"
- Slow time-to-decision; escalations stuck above the appropriate
  level
- Hiring plan: where do new roles report?
- M&A integration
- Crossing a Dunbar threshold (10 → 50 → 150 → 500 → 1500)
- New product line or business unit
- Shift in strategy that current structure can't deliver

Pairs with `okr-framework` (cascade follows reporting lines),
`hiring-process` (org gaps define hiring), `performance-management`
(career ladders match structure), `documentation-requirements.md`
(CODEOWNERS + RACI live in docs), `task-intake-due-diligence.md`
Q26 (operational handoff), `code-of-conduct.md` (org-wide
norms).

## Anti-Patterns

| Anti-pattern | Why bad | Fix |
| --- | --- | --- |
| Org chart copies competitor's | Competitor's structure was for their strategy, not yours | Design structure from strategy |
| Reorgs as response to performance | Performance issues are usually about goals + feedback + clarity, not structure | Diagnose first |
| Two-boss matrix without decision rights | Deadlock | DACI / RACI for every recurring decision class |
| Span of control > 9 for knowledge work | Mentorship fails | Restructure |
| Span < 3 | Hierarchy redundancy | Flatten |
| Senior IC promoted to manager keeps doing IC | Reports unmanaged | Hire managers separately; protect the IC track |
| Platform team without consumer voice | Builds the wrong thing | Treat consumers as customers; quarterly research |
| Reorgs every six months | Disruption cost dwarfs structural gains | Stable horizons; change in 18-24 month rhythms |
| Acquired team integrated dissolution | Loses what was acquired | Define autonomy + integration boundary |
| "Cross-functional team" with no decision authority | Theatre | Either give the team the decision OR don't pretend |
| Org chart doesn't match codeowners | Reality drifts from declared structure | CODEOWNERS as the truth; reconcile quarterly |
| Promotion to manager as reward | Performance suffers for everyone | Parallel IC track at every level |
| 200-person all-hands as decision forum | Dunbar broken | Use cascading communication; decisions in smaller forums |

## Verification Checklist

- [ ] Strategy stated explicitly; structure designed to deliver
      that strategy
- [ ] Team Topologies typing: each team identified as
      stream-aligned / platform / enabling / complicated-subsystem
- [ ] Interaction modes between teams documented
- [ ] Span of control honoured (3-9 for knowledge work managers)
- [ ] Decision rights framework chosen (DACI / RACI / RAPID) and
      applied to recurring decisions
- [ ] CODEOWNERS reflects current team ownership
- [ ] `docs/ownership.md` names team purpose, on-call, escalation
- [ ] Career ladder published; IC + manager tracks parallel
- [ ] Operating rhythm documented (cadences, owners, decision
      logs)
- [ ] Meeting hygiene: every recurring meeting has agenda, owner,
      sunset criteria
- [ ] Dunbar awareness: sub-teams sized below cohesion limits
- [ ] Psychological safety norms explicit; blameless post-mortems
      practised
- [ ] Reorg cadence ≥ 18 months unless strategy changes
- [ ] Reorg rationale documented as ADR
- [ ] Compensation bands aligned to career ladder
- [ ] Remote / hybrid / in-person mode chosen and norms
      documented
- [ ] Skip-level meetings scheduled quarterly
- [ ] Dual-system: hierarchy for run; network for change

## Cross-References

- `okr-framework` — goals cascade through the structure
- `hiring-process` — org gaps drive hiring plan
- `performance-management` — career ladders match structure
- `code-of-conduct.md` — org-wide norms
- `documentation-requirements.md` — CODEOWNERS + RACI in docs
- `task-intake-due-diligence.md` Q26 (handoff)
- `runbook-template.md` — escalation paths
- `audit-logging.md` — decision audit trail
- `feature-flags.md` — decisions affecting many teams may need
  gradual rollout
- `data-retention.md` — workforce-data retention obligations
- `gdpr-ccpa.md` — employee data protection

## Why This Skill Exists

Every product company's org chart is a hypothesis about how to
build the product. The hypothesis is rarely tested explicitly —
it's drawn on the back of a napkin during a founding meeting,
preserved as the team grows, and slowly diverges from what
would actually work today. By the time the symptoms surface
(slow decisions, endless cross-team dependencies, frustration
from people who feel they've never been managed), the
disruption cost of fixing the structure feels prohibitive, so
it doesn't get fixed; instead, the symptoms become the culture.

The discipline this skill describes — naming team topologies,
honouring span of control, documenting decision rights, sizing
teams to Dunbar's rings, maintaining operating rhythm, treating
career ladders as structural artefacts, picking modes
intentionally — is what separates organisations that grow their
capability with their headcount from organisations whose
headcount grows while their delivery slows. None of the
patterns are exotic; they are the converged learning of a
century of organisational research, applied to the
human-coordination problem of building software at scale.

The cost: thoughtful structural decisions take time, and
reorgs cost morale; doing them well requires resisting the
temptation to react to every quarter's friction. The benefit:
teams that ship without permission, decisions that close,
careers that progress, products whose architecture matches their
strategy, and an organisation that scales because the
coordination cost is bounded.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Manager span > 10 reports without enabling-team support (span-of-control weakening)
- Conway's Law mismatch: org chart inverted vs system architecture
- Team boundaries cut across value streams (cross-team coordination tax)
- Decision rights ambiguous (RACI / DACI absent on cross-cutting initiatives)
- Reorg announced without transition plan (productivity crater)
- Reporting structure changed without role-clarity update (career-path uncertainty)
- Platform / enabling teams understaffed relative to stream-aligned teams
- Bus factor < 2 on critical systems (knowledge SPOF)
- Career ladder ratings calibrated inconsistently across teams
- Onboarding time-to-productivity unmeasured

**Refinement candidates**:

- New team-topology row when a new pattern proves out (Team Topologies revisions)
- New cross-reference when a sister skill (hiring-process, performance-management, okr-framework)
  adds an org gate
- New transition-plan template when reorg-fatigue recurs
- Tightening of the bus-factor minimum when SPOF incident recurs
