---
name: org-design
description: Principal-level organisational design — team topologies, span of control, reporting structures, decision rights (DACI / RACI), Conway's Law, coordination cost, scaling from 10 to 1000, the difference between functional / divisional / matrix / network structures, and the discipline that aligns the org chart to the product strategy.
---

# Organisational Design

> The org chart you draw becomes the architecture you ship.
> Conway's Law isn't a metaphor — it's a forcing function. Design
> the team boundaries with the same care you design service
> boundaries; the product will mirror them either way.

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

## Core Patterns

### Pattern 1: Conway's Law — design for the org you want

"Any organization that designs a system... will produce a design
whose structure is a copy of the organization's communication
structure" — Melvin Conway, 1968.

Implications:

- Want a modular product? Build modular teams with explicit
  interfaces.
- Want a monolithic product? Let one team own everything.
- Want a platform + product split? Make the platform team an
  internal supplier with a documented contract.
- Want fast horizontal scaling? Stream-aligned teams owning
  end-to-end customer value.

The "inverse Conway manoeuvre" (Forsgren, Humble, Kim — DORA):
intentionally restructure teams to produce the architecture you
want. Done before the technical refactor, it works. Done after,
the political cost is enormous.

### Pattern 2: Team Topologies — four team types

Skelton + Pais — the modern canon:

| Type | Purpose | Typical size |
| --- | --- | --- |
| **Stream-aligned** | End-to-end ownership of a flow of work (a product, feature, journey, segment) | 5-9 (Dunbar's first ring) |
| **Platform** | Internal products that reduce cognitive load for stream-aligned teams (auth, infra, design system, CI/CD) | 5-9 per platform |
| **Enabling** | Time-boxed help; transfer skills to stream-aligned teams (DevEx, ML enablement, accessibility consulting) | 3-6, often part-time |
| **Complicated-subsystem** | Specialist subsystems requiring deep expertise (search, ranking, ML core, video codec) | 5-9 |

Three interaction modes:

- **Collaboration**: two teams work tightly together for a
  bounded period (creates capability, then split)
- **X-as-a-Service**: platform team provides an interface;
  consumer team self-serves
- **Facilitation**: enabling team helps for a sprint, then
  leaves

The interaction mode should be explicit per team-pair and
revisited quarterly.

### Pattern 3: Span of control — the right number of reports

Healthy span of control depends on the work:

| Work type | Span |
| --- | --- |
| Highly creative / strategic (e.g., founders, principals) | 3-5 direct reports |
| Engineering management (knowledge work, mentorship) | 5-9 |
| Operations / production (well-defined work) | 9-15 |
| Customer service (well-defined, monitored) | 15-25 |

Below 3: layer redundancy, unclear value. Above 9 for knowledge
work: insufficient 1:1 time, mentorship suffers, employees feel
unmanaged. The classic mistake: a senior IC promoted to manager,
keeps doing IC work, ends up with 12 reports and no time. Set
the limit; honour it.

### Pattern 4: Functional vs Divisional vs Matrix

| Structure | Strength | Weakness | Use when |
| --- | --- | --- | --- |
| **Functional** (engineering, product, design, sales as separate orgs) | Deep expertise, career ladders, economies of scale | Slow cross-functional execution | Early stage; one product; functional excellence matters more than speed |
| **Divisional** (full-stack BU per product / market) | Customer focus, autonomous, fast | Duplication, weaker functional depth | Multi-product, distinct customer segments, BU-level P&L |
| **Matrix** (people report to both function + product/region) | Balance | Two-boss problem, slow decisions | Conditional; needs strong DACI + senior leaders who manage matrix tensions |
| **Network / Holacracy** (role-based, no permanent boxes) | Adaptive, distributed authority | Cognitive overhead, ambiguity, hard to scale | Early or research-heavy; rarely scales beyond ~150 |

Most companies oscillate: start functional, decentralise to
divisional as products multiply, attempt matrix when
cross-cutting concerns dominate, sometimes formalise networks
for specific work (guilds, communities of practice).

### Pattern 5: Decision rights — DACI / RACI / RAPID

Confusion about who decides is the largest single source of
slow decisions. Adopt one framework consistently:

**DACI** (per decision):
- **D**river: drives the decision to closure
- **A**pprover: makes the final call (single person)
- **C**ontributor: gives input
- **I**nformed: notified after

**RACI** (per task):
- **R**esponsible: does the work
- **A**ccountable: owns the outcome
- **C**onsulted: two-way input
- **I**nformed: one-way update

**RAPID** (Bain):
- **R**ecommend, **A**gree, **P**erform, **I**nput, **D**ecide

Pick one. Document for every recurring decision class. The "two
A's" anti-pattern (two people both think they're accountable) is
the recipe for either deadlock or after-the-fact recrimination.

### Pattern 6: Dunbar's number + the law of nested teams

Robin Dunbar's research suggests social cohesion at ~150 with
nested rings:

```
Inner circle:   ~5     (immediate team / family)
Close colleagues: ~15
Working group:   ~50    (your "department")
Acquaintances:  ~150    (everyone you'd recognize)
Wider network:  ~500    (extended professional)
Group identity: ~1500   (company-wide attempt fails above this)
```

Practical:

- Squads / pods: 5-9 people (the inner ring)
- Tribes / chapters: 30-60 people (the working-group ring)
- Business unit / function: ≤ 150 (the cohesion ring)
- Above 150: introduce sub-cultures intentionally; expect
  identity fragmentation

### Pattern 7: Operating rhythm — meetings + cadences

Without rhythm, decisions slip and dependencies stack. Common
cadences:

| Cadence | Purpose | Participants |
| --- | --- | --- |
| **Daily standup** | Surface blockers (15 min) | Team |
| **Weekly 1:1** | Career + project + relationship | Manager + report |
| **Weekly team meeting** | Coordination + alignment | Team |
| **Bi-weekly sprint** (if agile) | Plan + review + retro | Team |
| **Monthly business review** | Metrics + decisions | Function leadership |
| **Quarterly OKR review** | Goal recalibration | Function + cross-function |
| **Quarterly skip-level** | Pulse from N-2 | VP + skip-level reports |
| **Quarterly all-hands** | Strategy + culture | Whole org |
| **Annual strategy** | Direction-setting | Leadership |
| **Annual perf review** | Career, compensation | Manager + report + HR |

Every meeting has an owner, an agenda, a decision-log, and the
explicit right to be cancelled when there's nothing to discuss.
Recurring meetings without value drain morale faster than almost
any other organisational dysfunction.

### Pattern 8: Coordination cost — Brooks's Law math

For N people, coordination paths grow as N × (N - 1) / 2:

- 5 people → 10 paths
- 10 people → 45 paths
- 50 people → 1225 paths

This is why "just add more engineers" produces slower delivery.
Mitigations:

- Cap effective team size at 9 (Amazon's "two-pizza rule")
- Define interfaces between teams as strictly as between
  services (API contracts, on-call rotations, SLAs)
- Make platform teams that absorb coordination cost (auth,
  infra, design system, observability)
- Reduce dependencies before adding headcount

### Pattern 9: Decision speed vs decision quality

Different decision types deserve different processes:

| Decision type | Process |
| --- | --- |
| **Reversible, low blast** (Bezos's "Type 2") | One person decides fast |
| **Irreversible, high blast** (Type 1) | Senior review, written memo, deliberate |
| **Routine operational** | Documented playbook |
| **Strategic / directional** | Workshop + ADR + board if needed |
| **People** (hire / fire / role change) | Hiring committee / promo committee / manager + skip + HR |

Mismatching: treating Type 2 as Type 1 wastes time; treating
Type 1 as Type 2 creates strategic accidents.

### Pattern 10: Scaling stages — what breaks at each threshold

| Stage | Headcount | What breaks | Add |
| --- | --- | --- | --- |
| Founding | 1-10 | Nothing — everyone knows everything | Stay small; document decisions for later |
| Tribal | 10-50 | Founder bottleneck; informal decisions don't scale | First management layer; written values; basic processes |
| Scaling | 50-150 | Cross-team dependencies; first culture fragmentation | Functional structure; OKRs; 1:1s; engineering management ladder |
| Mid-size | 150-500 | Functional silos; misalignment across BUs | Divisional structure; platform teams; matrix overlays; people-ops infrastructure |
| Large | 500-1500 | Decision velocity drops; bureaucracy creeps | Decentralisation; explicit decision rights; strong principal-IC track |
| Enterprise | 1500+ | Innovation slows; organisational inertia | Internal "skunkworks"; dual-system org per Kotter |

Each transition rewrites parts of the org. Anticipate; don't
react.

### Pattern 11: CODEOWNERS + RACI as code

Map team ownership to the code:

```
# .github/CODEOWNERS
/services/auth/         @team-platform-auth
/services/billing/      @team-payments
/web/components/ui/     @team-design-system
/.github/workflows/     @team-platform-cicd @team-security
```

Combined with a `docs/ownership.md` that names team purpose,
on-call, SLA, escalation paths, this is the operational
manifest of the org structure. When a CODEOWNERS file is stale,
the org chart is stale.

### Pattern 12: Career ladders that mirror the structure

Two tracks (IC + manager) at parallel levels:

| Level | IC | Manager |
| --- | --- | --- |
| L3 | Engineer | — |
| L4 | Senior Engineer | — |
| L5 | Staff Engineer | Engineering Manager |
| L6 | Senior Staff | Senior EM |
| L7 | Principal | Director |
| L8 | Distinguished | Senior Director |
| L9 | Fellow | VP |

Compensation bands parallel. Promotions to manager are a job
change, not a reward. Demotions from manager back to IC are
possible without stigma. Without this discipline, the org
becomes managed by people who didn't want the job, while the
best technical leaders are blocked from progression.

### Pattern 13: Psychological safety as enabling condition

Amy Edmondson's research (and Google's Project Aristotle) — the
strongest predictor of team performance is psychological safety:
the belief that the team is safe for interpersonal risk-taking.
Engineering implication: a team that can say "I don't know",
"I made a mistake", "this design has a flaw" early ships better
software than a team that hides those signals until they
explode. Org design enables safety via:

- Stable team membership (relationships need time)
- Blameless post-mortems (per `runbook-template.md`)
- Managers trained in active listening + non-defensive response
- Explicit norms around dissent + disagreement
- 1:1 time prioritised

### Pattern 14: Dual-system organisations (Kotter)

Established companies need both a hierarchy (running the
business today) and a network (inventing what's next).
Practical instantiations:

- Founder-mode + scaled-mode distinction
- Innovation lab / horizon-3 team with separate budget +
  governance
- 20% time / hack weeks (real, not theatre)
- Internal incubators with kill-criteria and graduation paths
- M&A as innovation source

The risk: the network gets crushed by the hierarchy when budgets
tighten. Protect it with executive sponsorship and outcome-
focused (not output-focused) metrics.

### Pattern 15: Remote, hybrid, in-person — design for the mode

Each mode has different org-design implications:

- **In-person**: high-bandwidth coordination by proximity;
  political dynamics by location; favour smaller teams
- **Remote-first**: written communication is mandatory; async
  decision-making; time-zone overlap is the scarce resource;
  favour smaller, fully-aligned-time-zone teams
- **Hybrid**: the hardest. Risks: in-person bias, two-track
  meetings (in-room + on-screen). Mitigate via "remote-first"
  norms even when most people are in-room

Don't pretend the mode is the same. Each requires distinct
operating norms.

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

## Standards Cited

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
  + digital coordination (when AEC scope)
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
- New cross-reference when a sister skill (hiring-process, performance-management, okr-framework) adds an org gate
- New transition-plan template when reorg-fatigue recurs
- Tightening of the bus-factor minimum when SPOF incident recurs
