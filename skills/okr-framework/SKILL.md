---
name: okr-framework
description: Principal-level OKR (Objectives + Key Results) design, deployment, grading, and anti-pattern avoidance for teams and organisations.
auto_activate: true
---

# OKR Framework

## Purpose

Operate the Objectives + Key Results framework as a strategic
alignment + execution-measurement system — not as a goal-setting
ceremony or performance-review surrogate. The goal is to make the
top three things any team is doing visible at every level of the
organisation, with measurable signals that close the loop on whether
those things actually moved the world. OKRs work when they create
focus, alignment, transparency, and accountability simultaneously;
they fail (often spectacularly) when teams treat them as a tax,
gamify the KRs, or confuse outputs with outcomes.

This skill activates on quarterly / annual planning, strategy
rollouts, team chartering, product roadmap setting, performance
calibration debates ("are OKRs an input to comp?"), and post-mortem
discussions on why a quarter's commitments didn't ship. It also fires
on the recurring symptom set: KRs that read like task lists, every
team having twelve OKRs, leadership reviewing OKRs once at the start
and once at the end of the quarter with nothing in between, and OKR
grades drifting toward the median because nobody wants to admit a
miss.

## Standards Cited

- **Andrew S. Grove, "High Output Management" (1983)** — origin of
  the Objective + Key Result construct at Intel; Grove's iMBOs
  (Intel Management by Objectives) inverted Drucker's MBO by making
  KRs measurable, time-bound, and explicitly disconnected from
  individual compensation
- **John Doerr, "Measure What Matters" (Portfolio, 2018)** — the
  canonical modern reference; documents the Google adoption story,
  the 70% rule, and the CFR (Conversations, Feedback, Recognition)
  partner system
- **Christina Wodtke, "Radical Focus" 2nd ed (2021)** — operational
  playbook for OKRs in startups + product teams; introduces the
  weekly 4-square (Priorities / Forecast / Status / Health) review
- **Paul R. Niven + Ben Lamorte, "Objectives and Key Results: Driving
  Focus, Alignment, and Engagement with OKRs" (Wiley, 2016)** —
  enterprise OKR deployment patterns + governance
- **Felipe Castro, "The Beginner's Guide to OKR" + the 9-step
  framework (felipecastro.com)** — widely-referenced practitioner
  guide; defines committed vs aspirational OKR distinction
- **Charles Goodhart (1975) + Donald T. Campbell (1979)** — "When a
  measure becomes a target, it ceases to be a good measure"
  (Goodhart's Law) and Campbell's Law on metric corruption; the
  theoretical foundation for OKR anti-patterns around gaming
- **Locke + Latham, "A Theory of Goal Setting and Task Performance"
  (1990)** — empirical foundation: specific + difficult goals
  outperform "do your best" by ~16%; relevant to the 70% stretch rule
- **Mike Cannon-Brookes + Atlassian "Team Playbook — OKR Plays"
  (atlassian.com/team-playbook)** — modern deployment patterns at
  cross-functional scale
- **DORA "State of DevOps Report" 2024** — correlation between
  outcome-based goals (vs output) and elite performer status
- **OKR International + What Matters Inc** — community reference
  material maintained by Doerr's group

## When to Fire

Auto-engage on these signals:

- Quarterly / annual planning cycles starting (Q4 prep for next year,
  end-of-quarter retros)
- New team chartering or team-of-teams formation
- Strategy rollouts cascading from executive level
- Product roadmap setting where prioritisation among initiatives is
  contested
- A specific OKR question surfacing in conversation ("how do we write
  KRs for a research team?", "should engineering KRs include
  velocity?", "are these committed or aspirational?")
- Performance review or compensation calibration where OKRs are being
  proposed as direct inputs (red flag — see anti-patterns)
- Post-mortem on why a quarter's commitments didn't ship; symptoms
  include: KRs achieved 100% but the underlying business metric
  flatlined (output-as-KR trap), or KRs missed badly but nobody can
  explain what changed
- Tooling decision: spreadsheet, Asana Goals, Lattice OKRs, Quantive,
  Workboard, Ally, Mooncamp, Perdoo, 15Five
- Adoption push from leadership ("we're rolling out OKRs company-
  wide") — most failure modes are introduced in the first six
  months, so the engagement window is now

## Core Patterns

### The Objective + Key Result Construct

An **Objective** is a qualitative, directional, time-bound statement
of where the team intends to be at quarter / year end. It is
inspirational, memorable, and aligned with the level above. It does
NOT contain numbers.

- ✗ "Increase ARR to $50M by end of Q4"
- ✓ "Become the default platform for mid-market healthcare billing"

A **Key Result** is a quantitative, measurable, time-bound signal
that — if achieved — provides high-confidence evidence the Objective
was reached. KRs are NOT tasks or initiatives; they are the outcome
that ships if the work succeeds.

- ✗ "Launch the v2 billing API" (task, not outcome)
- ✓ "60% of new mid-market customers onboard via v2 billing API"
- ✗ "Hire 3 senior engineers" (input, not outcome)
- ✓ "Reduce time-from-signup to first-invoice from 14 days to 3 days"

The mental test: if the KR is fully complete but the Objective is
unchanged in the world, the KR is wrong.

### The Anatomy of a Good OKR Set

For any team at any level, in any quarter:

```
Objective (1, sometimes 2; never more)
├── Key Result 1 (a leading or outcome metric)
├── Key Result 2 (different dimension of the same Objective)
└── Key Result 3 (third dimension; rarely a 4th)
```

The constraints:
- **One Objective is the strong default.** A team with three
  Objectives has no priority. Most teams that say "we have five
  Objectives" actually have one Objective with five competing
  initiatives behind it.
- **2-4 Key Results per Objective.** One KR risks gaming; five+ KRs
  hide the priority signal.
- **KRs span dimensions.** If all three KRs measure the same thing
  in different units, they're one KR.
- **Mix outcome + leading metrics.** Pure-outcome KRs are great
  signal but low controllability. Pure-leading KRs are easy to game.
  The right mix is usually 1 outcome + 1-2 leading + sometimes 1
  guardrail.
- **Include a guardrail KR for any aggressive primary KR.** If the
  primary KR is "increase signups 3x", the guardrail is "without
  CAC payback exceeding 18 months" or "with NPS not dropping below
  current baseline".

### Committed vs Aspirational OKRs

A foundational distinction (often skipped) is between **committed**
and **aspirational** OKRs.

- **Committed OKRs** are the team's contract with the org. They must
  ship at 100%. Missing a committed OKR is a serious event
  triggering re-planning and explanation. Committed OKRs are typically
  business-critical: revenue commitments, customer commitments,
  regulatory deadlines.
- **Aspirational (stretch) OKRs** are deliberately set so that
  achieving 70% is excellent, 100% is suspicious (the OKR was
  sandbagged), and 30% is acceptable when learning was captured.
  Aspirational OKRs are for ambitious bets, new markets, 10x
  initiatives.

The 70% rule applies ONLY to aspirational. A team that grades
committed OKRs at 70% has missed a commitment; a team that grades
aspirational OKRs at 70% has executed well.

Every OKR in the system is labelled committed or aspirational up
front. Mixing them silently is one of the top three OKR failure
modes.

### Cascade vs Alignment

The naive OKR model is cascade: company OKRs decompose into BU OKRs
decompose into team OKRs decompose into individual OKRs. This
produces three pathologies:
- Strict math errors — sum of teams ≠ BU goal
- Lost translation — by the time you reach the team, the connection
  to company strategy is invisible
- Top-down imposition — teams have no agency, OKRs feel like
  assignments

The mature pattern is **alignment via line-of-sight**, not cascade:
- Company OKRs are published before team planning
- Team OKRs are proposed bottom-up with explicit reference to which
  company OKR they ladder up to
- A negotiation cycle (typically 2-3 weeks) resolves gaps and
  conflicts
- Final OKRs are committed by both the team and their leader

Line-of-sight makes the connection explicit ("Our O ladders to
Company O2; our KR1 is a leading indicator of Company KR2.3") without
requiring rigid mathematical decomposition.

### Cadence

| Cadence | Activity |
| --- | --- |
| **Annual** | Company-level Objectives + 3-5 KRs |
| **Quarterly** | Team OKRs ratified; previous quarter graded |
| **Weekly** | OKR check-in (15-30 min): 4-square — Priorities for this week, Forecast for the quarter, Status of each KR (on track / at risk / off track), Health of team / processes |
| **Daily** | Standup references KR progress, not just tasks |

The weekly check-in is non-negotiable. Teams that skip it discover
at end-of-quarter that they're 20% on a KR that needed weekly
adjustment. Per Wodtke's "Radical Focus", the weekly 4-square is the
operating cadence that makes OKRs work or fail.

### Grading

At quarter end, each KR is graded 0.0 - 1.0:
- **1.0** — achieved at or beyond target
- **0.7** — achieved 70% of stretch target (the "Google goal")
- **0.5** — meaningful progress, missed target
- **0.0** — no progress

The Objective grade is the average of its KRs (sometimes weighted).

The grade is a learning signal, not a verdict:
- 0.7 on aspirational is excellent
- 1.0 on aspirational suggests sandbagging — the next OKR is set
  harder
- < 0.5 triggers a learning conversation: did we set the wrong
  Objective, miss execution, or face an unforeseen blocker?

Critically: **grades do NOT feed compensation or performance review
directly.** This is the strongest, most-violated rule. The moment OKR
grades become inputs to bonus or promotion, teams gravitate toward
sandbagging, which kills the stretch dynamic. (See anti-patterns.)

### OKRs ≠ Tasks ≠ Initiatives ≠ KPIs

| Construct | Definition | Cadence |
| --- | --- | --- |
| **Objective** | Where we want to be | Quarter / year |
| **Key Result** | Measurable signal of Objective achievement | Quarter |
| **Initiative / Bet** | Project or effort that drives the KR | Variable |
| **Task** | Atomic unit of work toward an Initiative | Day / week |
| **KPI** | Operational metric tracked perpetually | Always-on |
| **Commitment / Promise** | Ship-by-date contract (separate from OKR) | Variable |

A common confusion: KRs vs KPIs. KPIs are health metrics watched
continuously (uptime, latency, churn, ARR). KRs are time-bound
deltas — what we will move *this quarter*. A KPI like "uptime"
becomes a KR when phrased as "increase uptime from 99.5% to 99.95%
by Q3 end" with a specific intervention behind it.

### Connection to Org Structure

Per the `org-design` skill: OKRs follow team boundaries. A
cross-team OKR (e.g., "ship the unified billing platform") needs an
**accountable team** with clear API contracts to the contributing
teams. Otherwise the OKR is shared, which means nobody owns it.

The DACI / RAPID frame applies: every OKR has a single Accountable
owner. Contributing teams have informed / consulted relationships
through their own OKRs.

### Tooling

| Tool | Profile |
| --- | --- |
| **Spreadsheet** | Baseline. Works for <50 people. Fails on cross-team alignment + history. |
| **Asana Goals / Linear Goals** | Integrated with work tracking; good for teams already on those platforms |
| **Lattice OKRs** | Tied to performance reviews (which is exactly the anti-pattern — careful) |
| **Quantive / Mooncamp** | Dedicated OKR platforms; strong cascade visualisation |
| **Workboard** | Enterprise-grade; expensive; strong cadence enforcement |
| **15Five / Perdoo / Ally** | SMB to mid-market |
| **Custom** | When platform doesn't fit org shape (rare) |

Tool choice matters less than discipline. A spreadsheet with weekly
4-square discipline beats Workboard with quarterly-only check-ins
every time.

## Anti-Patterns

- **Output-as-KR.** "Ship v2 of the dashboard" is a task / initiative,
  not a KR. KRs measure the WORLD AFTER the work, not the work
  itself. Reframe: "30% of users adopt v2 dashboard within 30 days of
  launch."
- **Manager assigns OKRs top-down.** Kills agency, accountability,
  and the stretch dynamic. The right pattern: leader sets context,
  team proposes OKRs, negotiated commitment.
- **Twelve OKRs per team.** Hides the priority signal. Force the
  team to pick the top one or two; the rest are work that may happen
  but isn't the focus.
- **Mixing committed + aspirational silently.** Team treats all OKRs
  as aspirational; leadership treats critical ones as committed.
  Misalignment at grading time.
- **OKRs as performance review input.** Triggers sandbagging.
  Goodhart's Law applies: the KR stops measuring what it was
  intended to measure. Compensation should flow from impact +
  contribution, judged by the human leader; OKRs are an execution
  framework, not a comp framework.
- **Quarterly-only check-in.** OKRs that aren't reviewed weekly
  become a planning artifact, not an operating system.
- **KRs that measure activity, not outcome.** "Have 12 customer
  conversations" measures input. "Reach 80% of churned customers
  with a re-engagement offer and recover 20%" measures outcome.
- **The cascade pyramid.** Rigid mathematical decomposition collapses
  on first contact with reality. Use line-of-sight alignment instead.
- **Sandbagging.** Team sets KRs they know they'll hit; achieves 1.0
  every quarter; leadership believes the team is high-performing
  while real opportunity is being left on the table. Counter: ratchet
  up the difficulty when 1.0 happens; explicitly value the 0.7
  result on harder goals.
- **Gaming the metric.** Customer support team's KR is "reduce ticket
  resolution time to <4 hours"; team closes tickets without
  resolution to hit the number. Counter: pair primary KR with
  guardrail KR (CSAT not dropping).
- **OKRs as theatre.** Beautiful slides; no operational connection to
  daily work; no consequence for missing. Counter: weekly 4-square,
  visible to leadership, with action on at-risk KRs.
- **Annual OKRs that never get revisited.** The world changed in
  February; the OKRs were set in December. Mid-cycle adjustment is
  required when context shifts materially; document the adjustment
  with rationale.
- **Confusing OKRs with KPIs.** Team puts "maintain 99.9% uptime" as
  a KR. That's a KPI / SLO. The KR is what you will change about
  uptime this quarter.
- **No guardrails on aggressive KRs.** Growth team hits "3x signups"
  KR by lowering quality of acquisition; LTV craters next quarter.
  Counter: every aggressive primary KR has a guardrail KR.
- **Individual OKRs.** Most modern practice (post-Wodtke, post-Doerr
  current view) is that team OKRs are the unit; individual OKRs are
  optional and often counterproductive (they create internal
  competition where collaboration is needed).
- **OKRs for everything.** Some work — keeping the lights on, paying
  down debt, supporting customers — doesn't need OKRs. OKRs are for
  the FOCUS work. Tracking operational work happens via KPIs and
  ticket flows.

## Verification Checklist

- [ ] Every team has 1 (sometimes 2) Objectives, qualitative + directional
- [ ] Each Objective has 2-4 Key Results, measurable + outcome-shaped
- [ ] Each OKR labelled committed or aspirational
- [ ] Line-of-sight to company OKR is documented for each team OKR
- [ ] Weekly 4-square check-in is scheduled and held
- [ ] At-risk KRs trigger explicit action (intervention or
      re-forecast), not silent drift
- [ ] OKR grades are NOT direct inputs to compensation or performance
      reviews
- [ ] Quarter-end grading happens within two weeks of quarter close
- [ ] Sandbagging is explicitly addressed when 1.0 grades on
      aspirational OKRs recur
- [ ] Every aggressive primary KR has at least one guardrail KR
- [ ] No "ship X" or "launch Y" KRs (those are initiatives)
- [ ] Cross-team OKRs have a single accountable owner team
- [ ] Mid-cycle adjustments are permitted with documented rationale
      when context shifts
- [ ] Annual + quarterly + weekly cadences are all running, not just
      one

## Cross-References

- `org-design` — OKRs follow team boundaries; cross-team OKRs need
  an accountable team
- `performance-management` — OKR grades inform context for performance
  conversations but do NOT directly drive comp or promotion decisions
- `task-intake-due-diligence.md` — task intake's success criteria
  (Q22) aligns with KR shape
- `feature-flags.md` — KR-supporting experiments use flags for
  gradual rollout + measurement
- `observability.md` — KR signals come from real instrumentation,
  not hand-counted reports
- `audit-logging.md` — material business KR data is audit-grade
- `documentation-requirements.md` — OKRs live in canonical docs, not
  scattered slides

## Why This Skill Exists

Without principal-level OKR discipline, organisations fall into
predictable failure modes:

- **Focus failure** — every team works on twelve things, none
  prioritised; leadership wonders why critical strategy doesn't
  ship
- **Alignment failure** — teams optimise locally for their KRs while
  the company misses its goal because nobody's KRs ladder up
- **Measurement failure** — KRs measure activity not outcome;
  achievement of all KRs leaves the business metric flat
- **Cultural failure** — OKRs feel like a tax; teams treat the
  quarterly review as compliance theatre; the framework
  contaminates the trust needed for honest goal-setting
- **Performance management contamination** — OKRs feed comp;
  everyone sandbags; aspirational goal-setting dies; the
  organisation gradually loses its ability to take ambitious bets

Conversely, when OKRs work:
- The top three things any team is doing are visible to everyone
- Trade-off conversations happen with shared language and data
- New initiatives are evaluated against existing OKRs ("will this
  help our KRs or distract from them?")
- Quarter-end learning compounds: missed KRs reveal where the model
  of the business was wrong, not just where execution failed
- The org runs at a cadence that matches the speed of the market,
  not the speed of an annual planning cycle

The cost of doing OKRs well is a few hours per quarter per team in
planning, fifteen minutes per week in check-in, and disciplined
separation from compensation. The cost of doing OKRs badly is worse
than not doing them — because they look like alignment while quietly
producing local optimisation, sandbagging, and theatre. The principal
move is to choose disciplined adoption or no adoption; the middle
ground is the failure ground.

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
- Key Results that are activities ("ship feature X") instead of outcomes
- Objectives sandbagged to hit 100% (commitment-OKR misuse as aspirational)
- Cascading top-down without team-level translation (OKR theatre)
- Quarterly grade missing — no closure on prior cycle
- Compensation tied directly to OKR attainment (sandbagging incentive)
- OKR list > 5 per team (focus weakening)
- KRs without baseline + target + measurement instrumentation
- Mid-quarter pivot impossible (rigid OKR posture)
- Aspirational vs committed OKR distinction lost (mixed expectations)
- Tracking spreadsheet manual instead of automated against source systems

**Refinement candidates**:
- New OKR-template row when a new framework variant proves out
- New cross-reference when a sister skill (org-design, performance-management, fp-and-a) adds an OKR gate
- Tightening of the outcome-not-activity discipline when activity-KR recurs
- New cadence template when quarterly rhythm doesn't fit cycle length
