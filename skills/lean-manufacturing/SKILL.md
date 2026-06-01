---
name: lean-manufacturing
description: Lean operating philosophy — Just-in-Time, Jidoka, heijunka, kaizen, value-stream mapping, eight wastes, takt time, kanban, andon, single-piece flow. Applied to any value-producing system (manufacturing, software, healthcare, services), not just factories. Sister to six-sigma (variation reduction), supply-chain-patterns (cross-org flow).
---

# Lean Manufacturing

> Eliminate waste, build quality in at the source, respect the
> people doing the work, and improve continuously — applied to
> any value-producing system, not just factories.

## Purpose

Lean is a complete operating philosophy developed at Toyota
across four decades. It rests on two pillars (Just-in-Time and
Jidoka), one foundation (heijunka — level loading), and one
non-negotiable cultural commitment (respect for people).
Stripped to its essence: produce only what the next customer
in the chain has pulled, build quality in at the source so
defects can't propagate, and run continuous experiments to
remove waste.

This skill covers lean as it actually works — not the
sanitized Six Sigma-fusion version, not the "lean as
cost-cutting" misreading, and not the "we have a kanban board
in Jira so we're lean" fake. Manufacturing context is the
canonical reference; the principles apply to software, ops,
finance, healthcare, construction, and any process where work
moves through stages.

This skill does NOT solve: cultural change in organizations
unwilling to commit to lean's people-respect foundation
(consultants can install kanban; they cannot install the
culture). It does NOT cover Six Sigma's statistical rigor in
depth — that lives in the sister `six-sigma` skill.

## Standards Cited

- **Taiichi Ohno, *Toyota Production System: Beyond Large-Scale
  Production*** (1978 JP, 1988 English). The foundational text
  by the system's principal architect.
- **Shigeo Shingo, *A Study of the Toyota Production System***
  (1981 JP, 1989 English) — Shingo's parallel formalization
  including SMED and poka-yoke.
- **Womack, Jones, Roos, *The Machine That Changed the World***
  (1990) — MIT IMVP study that named "lean production" and
  brought it to Western awareness.
- **Womack + Jones, *Lean Thinking*** (1996, 2nd ed 2003) —
  formalised the five lean principles (value, value stream,
  flow, pull, perfection).
- **Jeffrey Liker, *The Toyota Way*** (2004, 2nd ed 2020) — 14
  principles in four categories (Philosophy, Process, People +
  Partners, Problem Solving).
- **Mike Rother, *Toyota Kata*** (2010) — improvement kata +
  coaching kata as the daily practice that creates lean
  thinkers.
- **Poppendieck + Poppendieck, *Lean Software Development***
  (2003) — translation of lean principles to software.
- **ISO 18404:2015** — Quantitative methods in process
  improvement — Lean and Six Sigma competency standard.
- **Shingo Institute Model** — cultural transformation
  framework (Results / Enterprise Alignment / Continuous
  Improvement / Cultural Enablers).
- **Lean Enterprise Institute** — body of knowledge curated by
  Womack + Shook.
- **Lean Construction Institute** — Last Planner System for
  construction.

## When to Fire

This skill engages when work involves:

- Process design or redesign across any workflow with stages,
  handoffs, queues, and customer-visible output
- Cycle time, lead time, takt time, throughput, or WIP
  conversations
- Value stream mapping (VSM) — current state / future state
- Continuous improvement programs (kaizen events, daily
  improvement)
- Kanban systems (real ones with WIP limits, not Trello
  boards with "To Do / Doing / Done")
- Quality-at-the-source initiatives, stop-the-line authority,
  andon
- 5S, visual management, standardised work
- Poka-yoke (mistake-proofing) for any error-prone process
- Setup/changeover reduction (SMED)
- Heijunka (level loading) when demand is uneven
- Operations strategy reviews
- Manufacturing engineering decisions
- Lean software / lean office / lean healthcare adoptions
- Toyota Kata coaching relationships

It does NOT engage when the request is for lean as a synonym
for "do more with less" or "headcount reduction" — that's
cost-cutting wearing lean's vocabulary and the skill flags
it as such.

## Core Patterns

### The five lean principles (Womack + Jones)

1. **Specify value** from the customer's perspective —
   what the customer would pay for if they could see the
   process clearly.
2. **Identify the value stream** — every step from raw
   material to customer (or from feature idea to user
   value), separating value-adding from non-value-adding.
3. **Make value flow** — eliminate stoppages, queues, and
   batches that block continuous movement.
4. **Let the customer pull** — produce only when downstream
   has signalled need; never push inventory or work that
   isn't requested.
5. **Pursue perfection** — continuous improvement (kaizen)
   forever; the state is never "done."

### The seven (plus one, plus one) wastes — *muda*

Taiichi Ohno's original seven, plus muri (overburden) and
mura (unevenness) — the trio together is the canonical
target:

| Waste | Definition | Examples |
| --- | --- | --- |
| **Overproduction** | Producing more than the next step has pulled — the worst waste because it generates the other six | Building features speculatively; printing reports nobody reads |
| **Waiting** | Idle time when value isn't being added | Queues for approval; waiting for build; waiting for the next handoff |
| **Transport** | Moving material or work products between locations | Shipping parts between plants; moving tickets through 7-stage workflows |
| **Over-processing** | Doing more than the customer values | Gold-plating; excessive documentation; CC'ing every email |
| **Inventory** | WIP, finished goods, raw materials sitting between steps | Unmerged branches; unreviewed PRs; backlog over 6 months |
| **Motion** | People moving more than necessary | Walking to a separate printer; clicking through 5 screens to find data |
| **Defects** | Anything requiring rework or scrap | Bug fixes; customer complaints; rework of incorrect specs |
| **Muri** (overburden) | Pushing people or equipment beyond reasonable limits | 60-hour weeks; running machines past spec; sprint commitments above team velocity |
| **Mura** (unevenness) | Demand or workload fluctuation that creates the other wastes | End-of-quarter scramble; weekend deployment freezes; release-day chaos |

Some practitioners add **Unused human creativity / skill** as
the eighth waste — talent left underutilised. Liker treats
this as foundational rather than a separate waste category.

### Just-in-Time (JIT) — the first pillar

Produce what's needed, when it's needed, in the amount
needed. Implementation requires:

- **Takt time** — available production time per period
  divided by customer demand per period. The drumbeat of
  the process.
- **Continuous flow** — one piece moves through each stage
  without stopping; batch sizes shrink toward 1.
- **Pull system** — downstream signals upstream (kanban
  cards or electronic equivalents) to produce only when
  there's a need.
- **Level loading (heijunka)** — smoothing the customer
  demand mix so the process can flow without scrambling.

### Jidoka (autonomation, "automation with a human mind") — the second pillar

Build quality in at the source. Components:

- **Stop the line authority** — every worker can halt
  production when a defect is detected (the andon cord at
  Toyota; the andon button in modern lines).
- **Andon** — visual signal that something is wrong;
  upstream comes immediately to help.
- **Poka-yoke** (mistake-proofing) — design features that
  make defects impossible or immediately detectable. Two
  kinds: contact (physical impossibility — the USB-C
  connector fits any orientation) and warning (alarms
  when an error condition is detected).
- **Separation of human work from machine work** — humans
  do what requires judgment; machines do what's
  repeatable.

### The foundation: heijunka

Production levelling. If the customer mix is 40% A, 30% B, 20%
C, 10% D, the heijunka pattern is A-B-A-C-A-B-A-D repeating —
not 40 As then 30 Bs then 20 Cs then 10 Ds. Level loading
makes flow possible because each step sees consistent demand
rather than spikes.

### 5S — workplace organisation

Five steps that go together:

1. **Sort (Seiri)** — remove what isn't needed
2. **Set in order (Seiton)** — a place for everything,
   everything in its place
3. **Shine (Seiso)** — clean the workspace; cleaning becomes
   inspection
4. **Standardize (Seiketsu)** — make the first three the
   normal state
5. **Sustain (Shitsuke)** — make 5S a daily habit

5S sounds trivial; it's transformative because the workspace
becomes visual — abnormalities (missing tool, dirty surface,
out-of-place item) are instantly visible.

### Value stream mapping (VSM)

A drawing of every step (process + information flow) from
customer order to delivery, with cycle time, changeover time,
uptime, defect rate, and inventory at each step. Two
artifacts:

- **Current state map** — what the process actually looks
  like today
- **Future state map** — what it should look like after
  improvement

Walking the floor (the *gemba walk*) is mandatory — the map
reflects observation, not what people say happens.

### Kaizen — continuous improvement

Two flavours:

- **Daily kaizen** — small improvements made by the people
  doing the work, every day. The team owns its process.
- **Kaizen events** (kaizen blitz) — 3-5 day focused
  improvements with cross-functional team, clear scope,
  measurable target.

Contrasts with **kaikaku** (radical change / breakthrough
improvement) — the rare, large-scale reorganisation. Kaizen
is the daily practice; kaikaku is the strategic pivot.

### The kanban system

Cards (physical or electronic) authorize production. Three
types:

- **Production kanban** — authorizes producing the next batch
- **Withdrawal kanban** — authorizes moving material from
  upstream
- **Signal kanban** — triggers setup for a different product

WIP limits enforce the pull discipline. No card → no work.
The number of cards in circulation determines maximum WIP.
Software equivalents (Jira, Linear, GitHub Projects) work
ONLY if WIP limits are enforced — without limits, kanban
boards are pretty backlogs.

### Standardised work

The currently best-known way to do a task. Three components:

- **Takt time** — the rate of demand
- **Work sequence** — the order of steps
- **Standard WIP** — the minimum inventory needed for flow

Standardised work is the BASELINE for improvement. You can't
improve what isn't standardised — variation hides patterns.

### Toyota Kata (Mike Rother)

The improvement kata is a four-step routine practiced daily:

1. Understand the direction (vision / challenge)
2. Grasp the current condition
3. Establish the next target condition
4. Iterate toward the target via experiments

The coaching kata is the manager's daily practice of guiding
the improver through the improvement kata via five questions
("What is your target condition? What is the actual condition
now? What obstacles are preventing you from reaching the
target? What is your next step? When can we go see what we
learned?").

Toyota Kata is the answer to "why doesn't lean stick after the
consultant leaves" — because lean is a habit pattern that
requires deliberate daily practice with coaching, not a set
of tools to install.

### Single-Minute Exchange of Die (SMED) — Shingo

Reduce setup/changeover from hours to single digits of
minutes. Two phases:

- **Internal setup** — must be done with the machine stopped
- **External setup** — can be done while the machine is
  running

The conversion: move as much internal setup to external as
possible; then streamline what remains. Software equivalent:
reduce time from "want to deploy" to "deployed" via
automated pipelines (CI/CD as SMED for software).

### Hoshin Kanri — policy deployment

Strategic alignment: 3-5 year breakthrough objectives cascade
through the organization to annual objectives, then to
quarterly improvements, then to daily kaizen — all aligned
with the breakthrough. Each level catches issues that
contradict the next level (the catchball process). Without
hoshin, lean becomes local optima that don't add up to
strategic results.

### Respect for people — the non-negotiable

Toyota's first principle isn't tools — it's that the people
doing the work know the work, and the system's job is to make
them successful. Practical implications:

- No layoffs from improvement (efficiency gains redeploy to
  growth, never to firing the people who made the gains)
- Workers redesign their own work
- Managers ask questions; they don't give answers
- Problems are opportunities to learn, not failures to punish
- Long-term employment commitment

Without this, every other lean tool produces resentment and
gaming. With this, lean produces decades of compounding
improvement (Toyota's track record).

### Lean beyond manufacturing

| Domain | Application |
| --- | --- |
| **Software** | Poppendieck principles — eliminate waste (build only what's pulled), amplify learning (short feedback loops), decide late, deliver fast, empower team, build integrity in, see the whole |
| **Startups** | Eric Ries *Lean Startup* — build/measure/learn cycle, MVP, validated learning, pivot/persevere |
| **Office / admin** | Eliminate paperwork, reduce approval queues, visual management of work in process |
| **Healthcare** | Virginia Mason Production System, ThedaCare — patient flow, error elimination, value stream redesign |
| **Construction** | Last Planner System — pull-based scheduling, commitment-based coordination, weekly look-aheads |
| **Government** | Lean in public services — cycle time of permits, reduced wait queues, standardised work |

## Anti-Patterns

### "Lean as cost-cutting"

The most damaging misuse. Executives hear "eliminate waste"
and translate it to "lay off staff." Lean explicitly rejects
this — improvement gains redeploy to growth, not to
firings. When layoffs follow lean adoption, every future
improvement gets buried because workers correctly conclude
that participating in lean accelerates their own
unemployment.

### "Tool box lean" without principles

Companies install 5S, kanban boards, andon lights, and
standardised work without the underlying respect-for-people
foundation or the system-thinking discipline. The tools
become theatre — clean workspaces, colourful boards, blinking
lights, no actual improvement. The Shingo Institute
explicitly warns against this; it's the predictable failure
mode.

### Fake kanban in software

A Jira board with "To Do / In Progress / Done" columns and no
WIP limits is NOT kanban. Real kanban requires:
- Visualised work
- Limited WIP at each stage
- Pull (downstream signals upstream)
- Flow management (tracking cycle time, identifying
  blockers)
- Explicit policies for moving cards
- Regular improvement (kaizen) sessions on the system itself

Without WIP limits the board is a backlog visualisation
tool, which is useful but not lean.

### Copying Toyota practices without Toyota Way culture

Touring a Toyota plant and copying the andon system does not
produce Toyota's results. The visible practices grew out of
the Toyota Way's 14 principles, particularly the cultural
ones. Copying the visible without copying the cultural
produces cargo cult lean.

### Treating workers as the problem

Every lean text emphasizes that bad processes produce bad
results, not bad workers. The manager's question is "what's
wrong with the process?" not "why didn't the worker follow
the process?" Disrespecting workers (blame, punishment for
raising problems, suppressed andon use) kills lean
permanently in the organization.

### Six-sigma + lean fusion done badly

"Lean Six Sigma" can work, but often degrades both. Lean's
people-respect foundation and continuous-improvement habit get
displaced by Six Sigma's statistical projects with belts and
champions. The fusion needs both philosophies present; usually
the Six Sigma project structure dominates and lean becomes
"tools we use during DMAIC."

### Batch-and-queue masked as flow

Renaming batches "flow" doesn't make them flow. If WIP
between stages is high, batch sizes are large, and handoffs
include queues, it's batch-and-queue regardless of what's
written on the wall. Real flow has WIP approaching 1 per
stage and cycle time approaching processing time.

### "Standard work" as imposed compliance

Standardised work that's written by managers and imposed on
workers produces resentment without improvement. The lean
practice: the people doing the work write the standard, then
improve it. Management's role is to make the standard
visible, help with the discipline of following it, and coach
improvement.

## Verification Checklist

For lean as a competence:

- [ ] Cycle time, lead time, and takt time are measured for the
      target process.
- [ ] Value stream map (current state) exists and was created by
      walking the gemba, not from interviews.
- [ ] The seven (plus muri, mura) wastes have been identified by
      name on the current state map.
- [ ] WIP limits are explicit and enforced — no kanban board
      without WIP limits passes.
- [ ] Pull signal exists — downstream demand triggers upstream
      work; there is no push.
- [ ] Stop-the-line authority is real — workers use it, and
      managers help rather than punish.
- [ ] Standardised work is documented and authored by the people
      doing the work.
- [ ] Daily kaizen is a habit — not "we improve sometimes" but
      "every day we look for waste."
- [ ] Improvement gains do not result in layoffs — there is an
      explicit commitment.
- [ ] Toyota Kata or equivalent coaching habit is practiced
      between manager and improver.
- [ ] Five whys or A3 problem solving is the routine response to
      defects, not blame.
- [ ] Hoshin Kanri or equivalent connects daily improvement to
      strategic direction.

## Cross-References

- [[six-sigma]] — statistical rigor for variation reduction;
  combined as Lean Six Sigma when both philosophies are present
- [[supply-chain-patterns]] — JIT depends on supply chain
  relationships; supplier development is part of Toyota's
  approach
- [[continuous-improvement]] — kaizen as a personal/team habit
  beyond manufacturing
- [[okr-framework]] — Hoshin Kanri is the Toyota equivalent;
  OKRs and hoshin can coexist or one can replace the other
- [[performance-management]] — performance reviews under lean
  separate the system from the worker; standard ratings often
  destroy lean
- [[design-thinking]] — value definition (lean step 1) overlaps
  with empathy phase of design thinking
- [[lean-startup]] — Eric Ries extension to product
  development; the build/measure/learn loop is software's
  version of the improvement kata

## Why This Skill Exists

Lean is the most-misunderstood operating philosophy in modern
business. Three failure patterns repeat:

1. **Cargo cult tooling** — kanban boards and 5S without
   pull, without WIP limits, without respect for people.
   The tools become decoration.
2. **Cost-cutting masquerade** — "lean" announcements followed
   by layoffs destroy any future lean adoption forever in
   that organization.
3. **Project-based "transformation"** — consultants deploy
   for 6 months, leave, and the system regresses to
   batch-and-queue within a year because no daily practice
   was established.

When done correctly — Toyota's record is the existence proof,
with decades of compounding gains — lean produces:

- 50-80% reductions in cycle time
- Quality levels of single-digit defects per million
- Inventory reductions of 60-90%
- Productivity gains of 30-100% with no headcount cuts
- A workforce that improves the system every day without
  being told

The cost is real: cultural commitment, daily discipline,
managerial behaviour change, executive patience over years.
The benefit compounds. This skill exists to ensure that when
lean is invoked, the principal-level practitioner can tell
which version is being requested — the real one or the
counterfeit — and act accordingly.

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
- Value-stream map > 12 months stale and still cited as current state
- Kanban WIP limits ignored (push-system regression)
- 5S audit reduced to "tidy up before the visitor" theatre
- Kaizen events one-shot only — no follow-up implementation
- Andon cord disabled or operators discouraged from pulling it (jidoka weakening)
- Takt time disconnected from customer demand rate
- Just-in-time becomes just-too-late (no safety stock for risk)
- Standard work documented but not actually followed on the line
- Tier-meetings replaced by status emails (gemba weakening)
- Lean implementation owned by consultants instead of operators

**Refinement candidates**:
- New tool row when a new lean technique becomes domain-applicable
- New cross-reference when a sister skill (six-sigma, supply-chain-patterns) adds a lean gate
- Tightening of the kaizen follow-through rule when one-shot pattern recurs
- New gemba template when a recurring waste class is observed
