---
name: design-thinking
description: Human-centred problem solving via Stanford d.school / IDEO five-stage cycle (Empathize → Define → Ideate → Prototype → Test). Activates on UX research, service design, innovation workshops, problem-framing sessions, or when the solution space is unknown and the users are not the designers.
---

# Design Thinking

> Solve human-centred problems through a structured cycle of
> empathy, problem-framing, ideation, prototyping, and testing
> — repeated until the solution clearly serves real users in
> real contexts, not just satisfies internal expectations.
>
> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Patterns | [`references/core-patterns.md`](references/core-patterns.md) |

## Purpose

Design thinking is the methodology for tackling problems where
the answer is unknown, the users are not the designers, and the
solution must serve human needs that nobody articulated
explicitly. Originating at IDEO and codified by Stanford's
d.school + Tim Brown's *Change by Design*, it has become the
default operating mode for product, service, and policy
innovation across industries.

This skill provides a principal-level practice of design
thinking: how to frame a fuzzy problem worth solving, how to do
the empathy work properly (instead of substituting personas for
real users), how to ideate generatively without strangling
weird ideas early, how to prototype at the right fidelity for
the question being asked, and how to test in ways that produce
honest signal rather than confirmation. It also covers the
common failure modes — design thinking as PR theatre, sticky-
note workshops with no follow-through, "innovation" without
business commitment.

This skill does NOT replace specialist disciplines: ethnography
(deep cultural research takes years), industrial design
(material + manufacturing competence), service design (cross-
channel orchestration), or UX research (statistical rigour).
It frames how design thinking integrates with those disciplines
and when to call them in.

## Standards Cited

- **Tim Brown, *Change by Design*** (2009, expanded 2019) —
  IDEO's foundational text; defines the discipline.
- **Stanford d.school *Design Thinking Bootleg*** (2018) — the
  open-source field manual; five-mode model (Empathize /
  Define / Ideate / Prototype / Test).
- **Jeanne Liedtka, *Designing for Growth*** (2011) — Darden
  School business-school framing; four questions (What is? /
  What if? / What wows? / What works?).
- **Roger Martin, *The Design of Business*** (2009) — design
  thinking as a strategic capability; knowledge funnel
  (mystery → heuristic → algorithm).
- **IDEO U Field Guide to Human-Centered Design** (2015,
  3rd ed) — process + methods workbook.
- **Tom + David Kelley, *Creative Confidence*** (2013) —
  cultivating the disposition.
- **Don Norman, *The Design of Everyday Things*** (1988,
  revised 2013) — foundational on affordances + user-centred
  design.
- **Bill Buxton, *Sketching User Experiences*** (2007) —
  prototyping fluency.
- **Klaus Krippendorff, *The Semantic Turn*** (2006) —
  design as meaning-making.
- **Erika Hall, *Just Enough Research*** (2013, 2nd ed 2019)
  — research discipline within product development.
- **ISO 9241-210:2019** — Human-centred design for
  interactive systems.

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

This skill engages when work involves:

- Open-ended "innovation" briefs, especially ones with weak
  problem definition
- New product / service / experience design
- Strategic discovery of what to build before how to build it
- Customer journey mapping + service blueprinting
- Wicked problems (per Rittel + Webber 1973) — problems
  without clear formulation
- "We need to be more innovative" organizational asks
- Persona + jobs-to-be-done research (typically alongside
  UX research)
- Prototyping decisions — fidelity, technology, audience
- Workshop facilitation for ideation, alignment, or
  framing sessions
- Innovation lab / studio / corporate venturing setup
- Public-sector + civic problems where design thinking has
  become standard (USDS, GDS, 18F, Code for America)
- Healthcare experience redesign (the canonical proving
  ground)
- Business-model innovation alongside product innovation
  (often via Strategyzer / Osterwalder's Business Model
  Canvas)
- Educational + curriculum design
- Organizational change with strong human dimension

It does NOT engage when:

- The problem is well-defined and the answer is technical
  (in which case it's engineering)
- The constraint is regulatory + the path is prescribed
- The brief asks for design thinking as decoration without
  organizational commitment to act on the findings

## Anti-Patterns

### Design thinking as sticky-note theatre

The five-day workshop with sticky notes, post-its, and
playful exercises produces enthusiasm + photos for LinkedIn,
then nothing changes. Cure: organizational commitment
upstream (clear sponsor, clear decision rights, real
budget), and downstream commitment (designs proceed to
real prototypes + real deployment).

### Empathy without users

"Empathy phase" conducted via internal stakeholders + sales
data + executive intuition. Real users never appear. The
output reflects insiders' assumptions about users, not user
reality.

### Sample of one — designer's friends

"I asked five people at the cafe what they think." Five
people demographically + situationally similar to the
designer is not user research. Recruit deliberately for
diversity of context + use.

### Personas as decoration

Polished persona documents with names + headshots + favorite
hobbies — and zero behavioural insight that guides design
decisions. If the persona doesn't change decisions, it's
decoration. Better: use JTBD or behavioural archetypes.

### Convergence skipped

The team brainstormed 100 ideas + built every one. Or worse:
brainstormed 100 ideas + built none, because no convergence
forced commitment.

### Prototype = polished mockup

Prototype reviewed as a finished product; team gets stuck
debating typography. Cure: lower-fidelity prototypes that
clearly signal "this is for learning, not approval."

### Testing for validation

The team shows the prototype to users + asks "would you use
this?" Users say yes (politeness bias). The team interprets
this as validation. Real testing: observe behaviour;
disconfirming hypotheses; let users complete tasks; surface
struggles.

### Design thinking without manufacturing / engineering /

operations early

The product is desirable + the prototype works on a designer's
laptop. Engineering says no (architecture is wrong);
manufacturing says no (cannot make it at scale); ops says no
(cannot service it). Cure: cross-functional participation
through the cycle; involve engineering + ops in ideation +
prototyping.

### "Innovation" without sponsorship

The design team produces brilliant work. The executive
sponsor changes. Nothing happens with the output. Cure:
sponsor commitment as gating; commercial / operational
ownership identified from Day 1.

### Design thinking applied to wrong problem class

The problem is genuinely an engineering optimization
(reduce queue time by 30%); design thinking goes through
empathy + ideation that adds time without insight, then
arrives at the same engineering answer. Cure: triage the
problem class first.

### Design thinking as cultural posturing

The company adopts "design thinking" + buys IDEO methods,
but rewards traditional command-and-control behaviour.
Designers leave; the brand declines. Cure: leadership
behaviour change + structural commitments (budget,
authority, time).

### "Move fast and break things" without empathy

Speed without user research produces fast + wrong. The
high-velocity teams (Stripe, Figma, Linear) succeed because
they research + test + iterate at high velocity, not because
they skip those steps.

## Verification Checklist

For a design thinking engagement:

- [ ] The problem is genuinely human-centred + open-ended,
      not a well-defined engineering optimization.
- [ ] Empathy research includes real users in real contexts,
      not synthesized personas alone.
- [ ] Research participant recruiting is deliberate +
      diverse, not convenience-sampled.
- [ ] Problem framing converged on a clear POV + HMW.
- [ ] Ideation produced significantly more options than were
      taken forward.
- [ ] Convergence is explicit — criteria + dot-voting +
      decision documented.
- [ ] Prototypes match fidelity to the questions being tested.
- [ ] Testing seeks to DISCONFIRM, with task-based observation
      rather than opinion polling.
- [ ] Cross-functional involvement throughout (engineering,
      manufacturing, operations, finance, legal).
- [ ] Sponsor + commercial owner committed to act on findings.
- [ ] Output includes both design recommendations + the
      organizational changes needed to deliver them.
- [ ] Process iterates — not a one-pass waterfall.
- [ ] Equity + inclusion considered — designed-for-everyone
      includes marginalized users.

## Cross-References

- [[ux-research]] — methodological rigour for the empathy +
  testing phases
- [[interaction-design]] — design of the interactions DT
  ideates
- [[design-systems]] — design system practice integrates the
  outputs of repeated DT cycles
- [[triz-patterns]] — TRIZ contributes structured ideation +
  contradiction resolution
- [[lean-startup]] — DT discovers the problem; Lean Startup
  validates the business model
- [[org-design]] — organizational structures that support DT
  vs those that destroy it
- [[performance-management]] — how do you reward DT work
  whose value materializes late?
- [[supply-chain-patterns]] — when DT-led products require
  new supply patterns

## Why This Skill Exists

Design thinking has been simultaneously over-hyped + under-
practiced for fifteen years. The hype claimed it was a
universal innovation methodology that anyone could adopt with
a one-week workshop. The under-practice produced
sticky-note theatre, abandoned prototypes, and consultant-led
"innovation initiatives" that produced no innovations.

What design thinking actually is:

- A disciplined methodology for tackling problems where the
  user's needs are unknown, the solution space is open, and
  the organization is willing to test + iterate
- A counterweight to spec-driven, requirements-driven,
  inside-out product development
- A force-multiplier when integrated with strong execution
  disciplines (Agile, Lean Startup, manufacturing engineering,
  service operations)
- A genuine corporate competence — at IDEO, Apple, Stripe,
  Procter & Gamble, Intuit — when sustained over years

What design thinking is NOT:

- A substitute for engineering rigor on well-defined problems
- A replacement for statistical UX research at scale
- A magic wand for organizational change
- A one-time workshop deliverable
- An apology for not having a strategy

This skill exists to ensure that when design thinking is
invoked, the principal-level practitioner can tell whether
the conditions support it, whether the work is being done
properly or theatrically, and what the organizational
prerequisites for actual impact are.

Done right, design thinking produces products + services that
people genuinely love because they were designed for the
people who use them. Done wrong, it produces nothing — or
worse, it produces the illusion of user-centredness while
optimizing for internal politics.

The user's expectation is: build with empathy, prototype with
honesty, test with rigour, ship with conviction. This skill is
the discipline that makes that possible.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Empathise phase skipped — team jumps to solution without user interviews
- HMW questions phrased as solutions in disguise ("how might we add a search bar?")
- Ideate phase converges too fast (first idea picked without divergent exploration)
- Prototype fidelity too high too early (sunk-cost on rejected concept)
- Test phase counts impressions instead of qualitative learnings
- "Listening" to users is selective (confirmation bias)
- Iteration loops > 6 weeks (lean weakening — feedback loop slows)
- Stakeholder politics override user insight (validated learning ignored)

**Refinement candidates**:

- New phase-template row when a recurring design-process gap emerges
- New cross-reference when a sister skill (ux-research, lean-startup, interaction-design) adds a DT
  gate
- Tightening of the divergent-ideation discipline when convergence-too-fast recurs
- New stakeholder-management template when politics-override pattern surfaces
