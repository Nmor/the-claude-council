---
name: lean-startup
description: Principal-level methodology for building products under extreme uncertainty — validated learning, build-measure-learn loops, MVPs, innovation accounting, pivot-or-persevere, customer development, and engines of growth.
---

# Lean Startup

> **Size budget: 25 KB.** Check: wc -c. Gate:
> node ~/.claude/scripts/token-budget.mjs --check
>
> Auto-fires on: new venture ideation, product-discovery work, MVP
> scoping conversations, pivot/persevere decisions, growth strategy
> design, innovation accounting setups, customer-development
> interviews, business-model-canvas exercises, problem/solution-fit
> assessments, dual-track-agile planning, OKR setting for early-stage
> products. Sister to `design-thinking` (problem framing),
> `triz-patterns` (inventive solving), `ux-research`
> (discovery methods), `okr-framework` (outcome metrics),
> `business-model-canvas` (strategy), `product-discovery` (delivery
> integration). Standards: Ries 2011/2017, Blank 2005/2012, Osterwalder
>
> - Pigneur 2010/2014, Maurya 2010/2022, Cagan 2008/2020, Ellis +
> Brown 2017, Torres 2021, Perri 2018.

## Purpose

Lean Startup is a methodology for building businesses + products
under conditions of **extreme uncertainty** — when you don't yet
know who the customer is, what they want, or whether they will
pay. It replaces the traditional "write a business plan, raise
money, build the thing, launch big" model with a disciplined
loop: form hypotheses, build the smallest possible test, measure
real customer behaviour, learn what's true, decide to **pivot**
or **persevere**, and repeat.

Lean Startup answers a specific class of question: "Should this
thing exist at all? Will anyone pay? Which version of it?" It
does **not** answer "How do we execute a known plan efficiently?"
— that's a Lean Manufacturing question. Confusing the two is the
single most common misapplication.

This skill provides:

1. The build–measure–learn loop and its inversion (think-do-check)
2. MVP taxonomy and the discipline of "minimum AND viable"
3. Innovation accounting (actionable vs vanity metrics)
4. Pivot/persevere decision frameworks (10 pivot types)
5. Steve Blank's Customer Development integration
6. Business Model Canvas + Value Proposition Canvas
7. Three engines of growth (sticky, viral, paid)
8. Problem-solution fit → product-market fit → scale stages
9. Continuous deployment as a lean enabler
10. When NOT to use Lean Startup (and what to use instead)

It does NOT substitute for execution craft once product-market
fit is reached — Lean is for the *search* phase; scaling is a
different discipline.

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

## Reference map

This file is the router. Every section that carries detail now lives in
`references/` and is read on demand; only these rows stay loaded.

- **Standards Cited** → `references/standards.md`
  The methodology sources with editions, ISBNs, and the chapter each pattern
  comes from: Foundational · Business modelling · Product + discovery ·
  Growth · Statistical / experimental · Adjacent foundations.

- **Core Patterns** → `references/core-patterns.md`
  All twelve: 1 The Build–Measure–Learn Loop · 2 Validated Learning · 3 The
  MVP (Minimum AND Viable) · 4 Innovation Accounting · 5 Pivot or Persevere
  (ten pivot types) · 6 Customer Development (Blank's Four Steps) ·
  7 Business Model Canvas + Lean Canvas · 8 Engines of Growth · 9 Three
  Stages (Problem-Solution Fit → PMF → Scale) · 10 Continuous Discovery
  (Torres 2021) · 11 Small Batches + Continuous Deployment · 12 The Five
  Whys.

- **Anti-Patterns** → `references/anti-patterns.md`
  All thirteen, each with its correction: 1 MVP = Buggy v1 · 2 Vanity
  Metrics Theatre · 3 Pivot Without Validated Learning · 4 Build-Measure-
  Learn Run Once Then Abandoned · 5 "Lean = Cheap" · 6 Lean Startup Without
  Customer Development · 7 Build Trap · 8 Applying Lean Startup to Known
  Problems · 9 Pivot Fatigue · 10 MVP-Then-Stop · 11 Founder Gut
  Substituting for Validated Learning · 12 OKRs as Output Tracking Theatre ·
  13 Wrong-Problem-Class Misuse.

- **Verification Checklist** → `references/verification-checklist.md`
  Hypothesis & MVP · Innovation accounting · Customer Development · Decision
  cadence · Engine of growth · Build Trap avoidance · Scaling discipline ·
  Lean Startup applicability check.

- **Why This Skill Exists** → `references/why-this-skill-exists.md`
  The failure mode this skill prevents, the five misreadings it counters,
  the real-world signals that should fire it, and the verbatim
  edition-level grounding list.

## When to Fire

This skill activates on file patterns + keywords + scope signals.

**File patterns**:

- `**/lean-canvas*`, `**/business-model*`, `**/value-proposition*`
- `**/discovery-notes*`, `**/customer-interviews/**`,
  `**/user-research/**`
- `**/mvp-plan*`, `**/experiment-design*`, `**/hypothesis*`
- `**/north-star*`, `**/okrs/*`, `**/growth-strategy*`
- `**/pivot-analysis*`, `**/persevere*`, `**/innovation-accounting*`
- `**/cohort-analysis*`, `**/retention-report*`
- Strategy + product-management dirs (`product/`, `strategy/`,
  `discovery/`)

**Keyword triggers** (in prompts, plans, tickets):

- "MVP", "minimum viable product", "validated learning"
- "pivot", "persevere", "pivot-or-persevere"
- "build-measure-learn", "BML loop"
- "customer development", "get out of the building",
  "customer interviews"
- "problem–solution fit", "product–market fit", "PMF"
- "lean canvas", "business model canvas", "value proposition
  canvas"
- "innovation accounting", "actionable metrics", "vanity metrics"
- "cohort analysis", "split test", "A/B test", "concierge MVP",
  "Wizard of Oz", "smoke test"
- "engine of growth", "sticky/viral/paid"
- "JTBD", "jobs to be done"
- "north star metric", "OEC"
- "growth team", "growth hacking", "AARRR"

**Scope signals**:

- New venture / new product line / new market segment
- Existing product seeing unexplained churn or stagnant growth
- Roadmap planning where feature priorities have low confidence
- Investment / funding decisions requiring evidence of traction
- "We don't know if anyone wants this" conversations
- M&A integration where the acquired team's product-strategy is
  unclear
- Internal incubation / corporate venture / spin-out

If the work is **execution against a validated plan** (the
customer is known, the willingness-to-pay is known, the build is
the constraint), Lean Startup is NOT the right lens — use Agile
delivery + Lean Manufacturing discipline instead.

## Cross-References

- **`design-thinking`** — generates the problem framing + initial
  hypotheses that Lean Startup then tests at scale. The "Define"
  POV statement maps to Lean Startup's hypothesis.
- **`triz-patterns`** — when Lean Startup uncovers a hard
  technical contradiction at the heart of the solution, TRIZ
  resolves it.
- **`ux-research`** — qualitative customer discovery methods
  (interviews, ethnographies) used inside Customer Development
  and Continuous Discovery.
- **`okr-framework`** — outcome metrics that go in the Objectives;
  Lean Startup's actionable metrics make natural Key Results.
- **`business-model-canvas`** — strategic frame within which
  hypotheses are organised.
- **`product-discovery`** — Cagan + Torres delivery integration;
  dual-track agile execution detail.
- **`ab-testing`** — the experimentation discipline used inside
  the BML loop once the product has live traffic.
- **`cohort-analysis`** — innovation accounting requires cohort
  tables; this skill covers the analytic patterns.
- **`growth-engineering`** — once PMF is reached, growth team
  patterns (AARRR funnel, high-tempo testing).
- **`continuous-deployment`** — small batches lean enabler.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- MVP scope inflated to "minimum lovable product" (BMVP — Big Minimum Viable Product)
- Build-measure-learn loop > 4 weeks (cycle-time weakening)
- Validated learning conflated with feature usage (correlation ≠ causation)
- Pivot deferred past 3 failed cycles (sunk-cost weakening)
- Engine-of-growth (sticky / viral / paid) not declared and measured
- Vanity metrics (registrations, page views) used instead of actionable cohort metrics
- Customer development interviews replaced by surveys (interview discipline weakening)
- Innovation accounting metrics not tracked across pivots
- Pre-launch "perfectionism" delays release indefinitely
- Founder-led customer discovery delegated too early

**Refinement candidates**:

- New MVP-pattern row when a new prototyping technique becomes broadly applicable
- New cross-reference when a sister skill (design-thinking, ux-research, strategy-reviewer) adds a
  startup gate
- Tightening of the pivot-trigger discipline when sunk-cost incidents recur
- New cohort-metric template when a new engine-of-growth class emerges
