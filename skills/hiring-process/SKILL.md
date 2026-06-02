---
name: hiring-process
description: Principal-level hiring system design — role definition, sourcing, structured interviewing, bar-raising, calibration, offer, and onboarding. Treat hiring as the highest-leverage decision an organisation makes and engineer the process to minimise predictable failure modes (unstructured interviews, halo effect, like-me bias, rushed decisions, weak onboarding).
auto_activate: true
---

# Hiring Process

## Purpose

Build and operate a hiring process that consistently selects high-
performing people, rejects low-performing people, treats candidates
with the dignity owed to anyone investing hours of their life in
your funnel, and survives audit under equal-opportunity employment
law. Hiring is the most leveraged decision an organisation makes —
a bad hire costs 1-3x the role's annual compensation between
recruiting waste, ramp time, opportunity cost, performance
management, and exit transition; a great hire compounds value for
years.

The skill activates on role openings, hiring-system audits, leveling
debates, calibration discussions, candidate funnel diagnostics,
diversity gap analysis, post-mortem on regretted hires, and the
recurring crisis question "we're missing the bar, what changed?"
It also fires whenever interview loops are being designed,
scorecards drafted, panels assembled, or rejection / offer
communications written.

## Standards Cited

- **Laszlo Bock, "Work Rules!" (Twelve, 2015)** — Google's hiring
  research distilled: structured interviews + work samples + general
  cognitive ability > unstructured interviews; the 4-person panel
  upper bound; the bar-raiser role
- **Geoff Smart + Randy Street, "Who: The A Method for Hiring"
  (Ballantine, 2008)** — Topgrading and the Who Method; scorecard +
  source + select + sell framework
- **Schmidt + Hunter, "The Validity and Utility of Selection Methods
  in Personnel Psychology" (Psychological Bulletin, 1998)** —
  meta-analysis establishing the predictive validity ranking of
  selection methods (work sample 0.54, structured interview 0.51,
  GMA 0.51, unstructured interview 0.38, job knowledge 0.48,
  references 0.26, age 0.01)
- **Sackett, Zhang, Berry, Lievens (2022)** — updated meta-analyses
  recalibrating Schmidt + Hunter; structured interviews + work
  samples remain top predictors
- **Adler + Klimoski, "Hiring Top Performers" (Career Press, 2019)**
  — Performance-based hiring + situational interviews
- **EEOC Uniform Guidelines on Employee Selection Procedures (1978,
  updated 2024)** — US federal law on adverse impact, the 4/5ths
  rule, and validation requirements
- **UK Equality Act 2010 + EU Equal Treatment Directive 2000/78/EC**
  — protected-characteristic frameworks
- **Society for Industrial and Organizational Psychology (SIOP)
  "Principles for Validation and Use of Personnel Selection
  Procedures" 5th ed (2018)** — the canonical validation standard
- **Amazon "Bar Raiser" program (publicly documented)** — calibration
  via a trained interviewer with no stake in the role
- **CIPD "Resourcing and Talent Planning" annual survey** — UK
  practitioner benchmark data
- **DORA "State of DevOps" report** — correlation between
  psychological safety + hiring quality + team performance

## When to Fire

Auto-engage on these signals:

- A role is being opened — even before sourcing begins
- A hiring loop is being designed (panel selection, interview kit
  authoring, scorecard drafting)
- Quarterly hiring metrics review — funnel conversion, time-to-fill,
  offer-to-acceptance rate, first-year regretted attrition,
  diversity at each stage
- A debate about leveling (is this candidate L4 or L5?)
- Calibration disagreement between interviewers post-debrief
- A bar-raiser veto being challenged or escalated
- A diversity gap analysis showing adverse impact at a particular
  funnel stage
- Post-mortem on a regretted hire ("what would have caught this?")
- Crisis moments: "we're missing the bar", "we lost three offers
  this quarter", "the team isn't shipping after the headcount
  increase", "this candidate ghosted us"
- Onboarding redesign (the last mile of hiring)
- Compensation philosophy debates — pay band, equity, COL
  adjustments
- Legal review of rejection / offer language
- Vendor selection: ATS (Greenhouse, Lever, Ashby, Workable, Recruitee),
  technical interview platform (CodeSignal, HackerRank, Karat,
  Coderpad)

## Core Patterns

### The Scorecard — Define the Job Before You Interview For It

Per Smart + Street and Bock: nothing in the hiring process matters
more than a clear, written, agreed scorecard BEFORE the first
candidate enters the funnel. A scorecard is NOT a job description.
A job description is a marketing artifact for candidates; a
scorecard is the internal definition of what success looks like in
this role.

A scorecard contains:

- **Mission** — one paragraph: what this role exists to do
- **Outcomes** — 3-7 measurable results the person must deliver in
  the first 6-12 months ("Ship the v2 billing platform end-to-end
  with 99.9% uptime by Q3"; not "be a great engineer")
- **Competencies** — 5-8 abilities required to deliver the outcomes
  (with leveling: "Expert in distributed systems", "Strong in
  SaaS finance"; not "team player")
- **Cultural commitments** — explicit, observable behaviours that
  reflect the org's actual operating values (not the wall-poster
  values)

Drafting the scorecard forces the team to answer the questions
they'll otherwise discover during the loop, when it's expensive:
What level is this role? What's it worth? How does it overlap with
the existing team? What outcomes does the team genuinely commit to
supporting this person on? Most hiring failures are scorecard
failures discovered late.

### The Source — Where the Top of Funnel Actually Comes From

| Source | Conversion to hire | Time | Notes |
| --- | --- | --- | --- |
| Inbound applications | 1-3% | High volume, low signal | Diversity-friendly if anonymised |
| Recruiter outbound | 5-15% | Slow, expensive, scalable | Default for senior roles |
| Employee referral | 10-30% | Fast, biased toward existing-network demographics | Must pair with debias practice |
| Direct community / OSS | 15-40% | Time-intensive, very high signal | Best for specialist + senior roles |
| Boomerang (returning ex-employees) | 30-60% | Highest conversion | Limited supply |
| University / new-grad | 1-5% | Pipeline-investment play | Diversity-friendly |
| Acquihire | n/a | Strategic | Different process |

Sourcing diversity matters more than process diversity. If the top
of the funnel is 90% one demographic, no amount of "structured
interviewing" produces a diverse hire. Engineer sourcing channels
to deliver representative pipelines before tightening the loop.

### The Loop — Structured Interviews + Work Samples

The Schmidt + Hunter predictive-validity finding has been replicated
hundreds of times: structured interviews outperform unstructured
interviews substantially, and work samples (the candidate
demonstrating the actual work) outperform both. Process implications:

- **Structured interviews** — every interviewer in a given role
  asks the same competency-mapped questions in the same order with
  the same probing strategy. Free-form "tell me about yourself"
  loops produce nothing decision-quality.
- **Work samples** — a coding exercise, a writing exercise, a
  case study, a portfolio review — should comprise at least one
  loop stage for any technical role. The exercise must match the
  actual work (rejecting whiteboard-puzzles that don't resemble
  the job).
- **Behavioural / STAR-format** — Situation, Task, Action, Result —
  for competency questions. "Tell me about a time when you led
  a cross-team initiative against resistance" prompts a specific,
  verifiable answer rather than abstract self-claim.
- **Calibration questions** — one or two questions every candidate
  for the role is asked, to compare across the cohort.
- **Take-home or live coding** — both have trade-offs; take-home
  tests breadth of approach but disadvantages busy candidates and
  parents; live tests under-pressure performance but introduces
  observer effects. Most strong teams offer choice.

| Method | Predictive validity (Schmidt & Hunter 1998 / Sackett 2022) |
| --- | --- |
| Work sample | 0.54 / 0.33 |
| Structured interview | 0.51 / 0.42 |
| General Mental Ability | 0.51 / 0.31 |
| Job knowledge test | 0.48 |
| Integrity test | 0.41 |
| Unstructured interview | 0.38 / 0.19 |
| Job tryout | 0.44 |
| Peer rating | 0.49 |
| Reference check | 0.26 |
| Years of experience | 0.18 |
| Years of education | 0.10 |
| Graphology / handwriting | 0.02 |
| Age | 0.01 |

Note: Sackett 2022 estimates trend lower than Schmidt + Hunter
1998 due to corrected statistical methods; rank order is similar.

### The Loop Shape (Recommendation for Senior IC Engineering)

Four to five total interviews, max 60 minutes each:

1. **Recruiter screen** (30 min) — alignment on scorecard, candidate
   motivation, compensation expectations
2. **Hiring manager screen** (45-60 min) — competency mapping, past
   work depth, team fit assessment
3. **Technical work sample** (60-90 min) — coding, system design, or
   architecture exercise mapped to the role
4. **Behavioural / leadership** (60 min) — for senior roles;
   conflict navigation, influence without authority, culture
   contribution
5. **Bar-raiser / cross-team panel** (60 min) — a trained interviewer
   without stake in the role; calibrates against company bar

Total candidate time investment: 4-6 hours over 2-3 weeks. Longer
loops have diminishing predictive validity and significant attrition
(candidates accept other offers).

### The Bar-Raiser

A hiring-system invariant that solves the "manager wants headcount,
manager lowers bar" problem: every hire requires sign-off from a
trained interviewer (the bar-raiser) who has no stake in the
specific role — they don't manage the team, they don't get the
headcount, they don't lose anything if the role stays open.
Bar-raisers are trained, certified, calibrated, and rotated; they
have veto power.

The bar-raiser pattern works because it externalises the
calibration function. Without it, hiring drift is inevitable —
each manager's "yes" raises the team's tolerance for marginal
candidates, eventually saturating the team with B-players. With a
bar-raiser, the bar is maintained at the company level, not the
team level.

### Calibration + Debrief

Every interview produces a written scorecard with:

- Strong yes / yes / neutral / no / strong no (5-point scale; some
  teams use 4-point to force a non-neutral position)
- Specific evidence supporting the rating (quotes, code snippets,
  observed reasoning)
- Competency-by-competency rating
- Explicit risks or caveats

The debrief is a structured meeting:

- Each interviewer presents independently BEFORE seeing others'
  scorecards (prevents anchoring)
- Disagreements are surfaced and discussed with evidence
- The hiring manager + bar-raiser make the final call (depending
  on the organisation's decision-rights model)
- Decisions are documented with rationale

### Bias Mitigation

| Bias | Counter |
| --- | --- |
| **Halo effect** | Independent scorecards before debrief; structured questions |
| **Like-me bias** | Diverse panels; calibrated rubrics; explicit bias training |
| **Confirmation bias** | Pre-defined rubric; ask probing questions on weak signals |
| **Anchoring** | Independent ratings before discussion; suppress résumé during interview where possible |
| **Status bias** | School / company prestige obscured in initial screening when feasible |
| **Recency bias** | Score on full interview, not last 10 minutes |
| **Affinity / out-group** | Diverse interviewers; ID training; structured competency questions |
| **Attractiveness / accent / appearance** | Phone-only first screen; explicit awareness |

### Offer + Closing

The offer stage is where many strong candidates are lost. Patterns:

- **Move fast** — top candidates have 2-3 active processes; a 5-day
  delay between final interview and offer doubles the loss rate
- **Pre-close, don't surprise** — recruiter checks comp expectations
  before the offer is constructed
- **Personalise** — handwritten note from the hiring manager; loop
  team intros; address the candidate's specific concerns from the
  interview
- **Transparent compensation** — base, equity vest, signing bonus,
  benefits, relocation, levelling; provide the leveling rationale
- **Window** — 1-2 weeks to respond; longer windows favour the
  candidate playing offers off each other but signal flexibility

### Onboarding — The Last Mile of Hiring

90 days. The onboarding is the rest of the hiring process; a great
hire who's onboarded badly looks like a regretted hire by month 4.
The skeleton:

- **Week 1** — environment access, tooling, org overview, manager
  1:1, peer introductions, a small first commit / first deliverable
- **Week 2-4** — shadowing, deeper context, structured reading list,
  pair-up on real work
- **30 days** — first meaningful contribution shipped; 30-day check-in
  with manager + onboarding buddy
- **60 days** — owning a piece of work end-to-end; calibration on
  scorecard
- **90 days** — first formal performance check-in; confirm hire
  decision was correct (rare cases of "this was a mismatch" are
  better surfaced now than after the probationary window closes)

Onboarding documentation, buddy programs, structured first
deliverables, and explicit ramp expectations turn a 6-month
productivity ramp into a 2-3-month one.

### Metrics

| Metric | Target |
| --- | --- |
| Time-to-hire (open to accepted) | 30-45 days |
| Offer-to-acceptance rate | > 70% |
| First-year regretted attrition | < 5% |
| Manager satisfaction at 6 months | > 80% strong / very strong |
| Funnel diversity vs market | Within 10% at every stage |
| Cost per hire | benchmark-relative |
| Quality of hire at 12 months (performance distribution) | Right-shifted vs population |

Adverse-impact ratio (4/5ths rule per EEOC Uniform Guidelines): the
selection rate for any protected group should be at least 80% of
the rate for the highest-selected group at every funnel stage.
Below 80% triggers a validation review.

## Anti-Patterns

- **Unstructured interviews.** Predictive validity ~0.19-0.38; you
  could do approximately as well by flipping a coin and saving the
  loop's time. Yet most companies still rely on these.
- **The "culture fit" veto.** Without operational definition, "culture
  fit" is a euphemism for like-me bias. Replace with explicit
  cultural commitments and structured behavioural questions.
- **Brain-teasers / puzzle interviews.** Bock's research at Google
  showed zero predictive validity. The team that asked "how many
  golf balls fit in a 747" learned nothing about candidate
  performance.
- **Whiteboarding that doesn't match the job.** Asking a candidate to
  invert a binary tree on a whiteboard tests interview prep, not
  ability to ship production code. If your team writes prod code
  in an IDE with debugging tools, interview in the same environment.
- **Take-homes longer than 4 hours.** Disadvantages candidates with
  caregiving duties or full-time jobs; predictive value plateaus
  after 2 hours.
- **No bar-raiser / single decision-maker.** Manager bias compounds
  over hires; no external calibration means bar drift over time.
- **Debrief discussion before independent scorecards.** Anchoring +
  groupthink + halo. Every interviewer submits independently
  first.
- **"We can't find anyone qualified."** Usually means the scorecard
  is unclear, the comp band is below market, the sourcing pipeline
  is thin, or the loop is broken — not that the candidate pool is
  bad.
- **Hiring panel without diversity.** When every interviewer comes
  from the same demographic, sourcing and pattern-matching both
  fail.
- **Reference checks as the deciding signal.** Predictive validity
  0.26 — use as confirmation, not decision.
- **Comp negotiation theatre.** Lowballing top candidates produces
  resentful hires or lost offers. Determine the pay band by market
  - role + level + experience and offer a fair number.
- **No "regret offer" review.** Lost offers should produce a review:
  why did the candidate go elsewhere? Often the answer is loop
  experience, comp, or speed — all fixable.
- **Underinvested onboarding.** Hire and ship them to the team
  without context. 60-day ramp becomes 6-month ramp; some leave
  before they ramp.
- **Probation as a "we'll see" period.** Probation is an active
  evaluation, not a passive wait. If the hire isn't working, the
  90-day mark is the cleanest exit; missing it locks in a longer,
  more painful performance-management cycle.
- **"We had to fill the role."** Bar-lowered hires haunt teams for
  years. An unfilled role costs less than a wrong hire.

## Verification Checklist

- [ ] Scorecard is written and signed off BEFORE sourcing begins
- [ ] Loop structure is documented: who interviews, what each
      session covers, what competency each maps to
- [ ] Structured questions + rubric exist per interview slot
- [ ] At least one work sample stage in the loop for the role's
      core function
- [ ] Bar-raiser (or external calibration role) participates in
      every hire
- [ ] Interviewers submit independent scorecards BEFORE debrief
- [ ] Debrief produces documented decision + rationale
- [ ] Adverse-impact ratios monitored at every funnel stage
- [ ] Compensation band is documented and consistently applied
- [ ] Time-to-hire and offer-to-acceptance metrics are tracked
- [ ] 90-day structured onboarding exists for the role
- [ ] Quarterly hiring retrospective reviews quality + funnel +
      diversity metrics
- [ ] Regret-hire post-mortems are run and feed scorecard +
      loop improvements
- [ ] Rejection communications are timely, respectful, and
      provide feedback where lawful
- [ ] All recruiters + interviewers receive interview + bias
      training annually

## Cross-References

- `org-design` — hiring fills team gaps that org-design defines
- `okr-framework` — role outcomes ladder to team + company OKRs
- `performance-management` — onboarding success feeds into the
  performance system
- `code-of-conduct.md` — interview process embodies the
  organisation's commitments
- `gdpr-ccpa.md` — candidate data handling is regulated
- `audit-logging.md` — hiring decisions are audit-grade records
- `documentation-requirements.md` — scorecards + rubrics + decision
  records live in canonical docs

## Why This Skill Exists

Without a principal-level hiring process, organisations fail in
predictable, expensive ways:

- **Bar drift** — managers under headcount pressure lower the bar
  hire after hire; within 18 months the team is full of B-players
  who can't carry the work, leading to A-player attrition and
  death spiral
- **Diversity gap** — unstructured interviews systematically favour
  the existing-team demographic; the company hits inflection at
  100 employees with a homogeneous workforce that fails on
  market-coverage, customer-empathy, and recruitment-pipeline
  dimensions
- **Wrong hires** — without scorecards, the team hires for
  surface-similarity rather than role-fit; 6-month performance
  problems become 18-month exits with severance, replacement
  costs, and team morale damage
- **Lost offers** — slow, unstructured, low-empathy loops lose
  the top candidates to competitors who simply respect the
  candidate's time
- **Legal exposure** — adverse-impact disparities without
  validation invite EEOC complaints, class actions, and consent
  decrees
- **Culture erosion** — when "culture fit" becomes a back door for
  bias, the actual culture is the bias

Conversely, when hiring is principal-grade:

- The team is full of A-players who attract more A-players
- Diversity outcomes match aspirations because the pipeline +
  process are engineered for them
- Time-to-hire is short because the loop is tight + decisive
- Offer-to-acceptance rate is high because candidates feel
  respected
- Regretted hires are rare because scorecard + bar-raiser + 90-day
  probation catch mismatches early
- The team's bar rises over time as A-player networks deliver
  more A-players

The cost of a principal hiring system is upfront investment in
scorecards, interview training, calibration, ATS instrumentation,
and onboarding infrastructure. The cost of an amateur hiring system
is years of compounding talent debt, unrecoverable cultural
erosion, and competitive disadvantage in every market where
talent is the limit.

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

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Unstructured interview (free-form chat) replacing structured rubric
- Loop missing one role-type (no peer collaborator, no manager, no skip-level)
- Scorecard absent or unused (gut-feel hiring)
- Interviewer untrained / uncalibrated (rating drift across panels)
- "Culture fit" used as veto (homogeneity ratchet — bias risk)
- Time-to-decision > 2 weeks (candidate-experience erosion)
- Offer extended without comp calibration (within-band vs market check)
- Reference check skipped or only references the candidate provided
- Bar-raiser absent from senior hires (calibration weakening)
- Onboarding time-to-productivity unmeasured

**Refinement candidates**:

- New role-rubric row when a new function is added (e.g., ML engineer, RevOps)
- New cross-reference when a sister skill (org-design, performance-management) adds a hiring gate
- New diversity-hiring template when bias pattern recurs
- Tightening of the calibration cadence when rating-drift recurs
