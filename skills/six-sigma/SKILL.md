---
name: six-sigma
description: Data-driven variation reduction via DMAIC (Define / Measure / Analyse / Improve / Control), with Lean Six Sigma fusion when waste + variation co-exist. Belts framework (Yellow / Green / Black / Master Black), SPC charts, FMEA, design of experiments, hypothesis tests, capability indices (Cp / Cpk). Sister to lean-manufacturing (waste reduction).
---

# Six Sigma

> Reduce process variation to the point where defects are
> statistically rare (≤ 3.4 per million opportunities) using
> data-driven projects led by trained practitioners following
> the DMAIC cycle.

## Purpose

Six Sigma is a structured methodology for reducing variation
in any repeatable process. Where lean attacks waste (non-
value-adding activity), Six Sigma attacks variation (the
spread around a target). The two combine — "Lean Six Sigma" —
but they remain distinct philosophies and should be invoked
deliberately rather than fused thoughtlessly.

The defining promise: a process operating at "six sigma"
quality produces ≤ 3.4 defects per million opportunities
(DPMO) — far below the 6,210 DPMO typical of a "four sigma"
process. Achieving this requires statistical capability
analysis, root-cause investigation rooted in data, and
verified controls that hold the gains.

This skill covers Six Sigma at the depth required for
principal-level decisions: when to run a DMAIC project, when
to use DFSS for new designs, how to read a control chart,
when statistical conclusions are valid, and when "Six Sigma"
has degenerated into a belt-collecting bureaucracy. It does
NOT teach you to pass a Black Belt exam — that takes a
dedicated training program.

## Standards Cited

- **Walter Shewhart, *Economic Control of Quality of
  Manufactured Product*** (1931) — the foundation of
  statistical process control (SPC) + control charts.
- **W. Edwards Deming, *Out of the Crisis*** (1982) — the
  14 points; profound knowledge system; PDSA cycle.
- **Joseph Juran, *Quality Control Handbook*** (1951+) —
  Juran trilogy (planning / control / improvement); Pareto
  principle in quality.
- **Mikel Harry + Richard Schroeder, *Six Sigma: The
  Breakthrough Management Strategy*** (2000) — Motorola
  origin story + the methodology as practiced at GE.
- **ASQ Six Sigma Body of Knowledge** — green belt + black
  belt + master black belt syllabi.
- **ISO 13053-1:2011 / -2:2011** — Quantitative methods in
  process improvement — Six Sigma — Part 1: DMAIC, Part 2:
  Tools and techniques.
- **ISO 18404:2015** — Quantitative methods in process
  improvement — Lean Six Sigma — competency profiles for key
  personnel.
- **Box, Hunter, Hunter, *Statistics for Experimenters***
  (1978, 2nd ed 2005) — the design-of-experiments (DoE)
  reference.
- **Wheeler + Chambers, *Understanding Statistical Process
  Control*** (1992) — interpretation of control charts.
- **Forrest W. Breyfogle III, *Implementing Six Sigma***
  (2003) — practitioner reference for DMAIC tools.
- **Kaoru Ishikawa, *Guide to Quality Control*** (1968) —
  Ishikawa (fishbone) diagram, seven basic tools.

## When to Fire

This skill engages when work involves:

- Persistent defects, returns, rework, or customer complaints
  with no obvious single cause
- Process capability analysis (Cp, Cpk, Pp, Ppk)
- Control charts (X-bar/R, X-bar/S, p, np, c, u, I-MR, EWMA,
  CUSUM)
- Hypothesis testing for process improvement validity
- Design of experiments (full factorial, fractional factorial,
  response surface, Taguchi)
- Measurement system analysis (gauge R&R, attribute agreement)
- DMAIC project structure (Define / Measure / Analyse /
  Improve / Control)
- DFSS / DMADV for new product / process design (Define /
  Measure / Analyse / Design / Verify)
- Statistical process control (SPC) implementation
- Voice of the Customer (VoC) to Critical-to-Quality (CTQ)
  conversion
- FMEA (Failure Mode and Effects Analysis)
- Quality Function Deployment (QFD), House of Quality
- Pareto + fishbone (Ishikawa) cause analysis
- Cost of poor quality (COPQ) discussions
- Process scorecards using sigma level or DPMO
- "Lean Six Sigma" combined initiatives

It does NOT engage when the request is "do a Six Sigma
project" without a clear problem statement or measurable
target — in those cases the response is to push back on the
framing rather than launch a belt-led project.

## Core Patterns

### What "six sigma" means statistically

For a process with a normal output distribution centred on
target, with specification limits at ±6σ from the target:
the probability of an output falling outside spec is ~2 ppb
(parts per billion). However, Motorola's empirical
observation was that processes drift by ~1.5σ over time
("Motorola shift"), so the practical target is ±4.5σ from
the drifted mean, which gives 3.4 DPMO. The "Six Sigma"
brand encodes this 1.5σ shift in its definition.

| Sigma level | DPMO | Yield % |
| --- | --- | --- |
| 2σ | 308,537 | 69.1% |
| 3σ | 66,807 | 93.3% |
| 4σ | 6,210 | 99.4% |
| 5σ | 233 | 99.977% |
| 6σ | 3.4 | 99.99966% |

A 4σ process is "good enough" in most contexts. 6σ is
required for high-volume, life-critical, or zero-tolerance
domains (semiconductors, aviation, pharmaceuticals, surgery).

### DMAIC — the canonical project cycle

The structured process for improving an existing process:

| Phase | Purpose | Key tools |
| --- | --- | --- |
| **Define** | Charter the project — problem statement, scope, goal, team, voice of customer, CTQs | Project charter, SIPOC diagram, VoC, CTQ tree |
| **Measure** | Quantify current performance — baseline | Process map, data collection plan, MSA (Gauge R&R), capability analysis (Cp/Cpk), sigma level |
| **Analyse** | Identify root causes of variation / defects | Pareto, fishbone, 5 whys, hypothesis testing (t-tests, ANOVA, chi-square), regression, FMEA |
| **Improve** | Develop + validate solutions | DoE, pilot studies, brainstorming, solution selection matrix, Poka-yoke |
| **Control** | Sustain the gains | Control plans, control charts, standard operating procedures (SOPs), training, audit cadence |

Each phase has a tollgate review before the next phase
starts. Skipping phases is the most common project failure;
projects that jump from Define straight to Improve produce
solutions to undefined problems.

### DFSS / DMADV — for new design

Six Sigma applied to designing new products or processes:

- **Define** — what is being designed; customer needs
- **Measure** — translate needs to measurable CTQs
- **Analyse** — develop concepts; select architecture
- **Design** — detailed design; transfer functions; tolerance
  allocation
- **Verify** — pilot; verify capability before launch

DFSS is harder than DMAIC because there's no baseline to
measure against — you're predicting capability from design.
Common DFSS toolkits: TRIZ, QFD/HoQ, Pugh matrix, Monte Carlo
simulation, tolerance design.

### Voice of the Customer (VoC) → Critical-to-Quality (CTQ)

The translation problem. Customers say "I want it fast" —
you need a measurable target with spec limits. The CTQ tree:

- Customer need: "fast checkout"
- Driver: response time
- CTQ: 95th-percentile page load < 1.0 s; 99th-percentile < 2.5 s

Without explicit CTQs, projects optimize the wrong thing.

### Measurement System Analysis (MSA)

Before you trust the data, prove the measurement system.
Gauge R&R partitions measurement variation into:

- **Repeatability** — same operator, same part, different
  measurements (instrument noise)
- **Reproducibility** — different operators measuring the
  same parts (operator-to-operator variation)

Rule of thumb: if measurement variation is > 30% of process
variation, the measurement system is unfit and must be fixed
before any improvement work.

### Capability analysis — Cp, Cpk, Pp, Ppk

Capability indices measure how well a process meets spec:

- **Cp = (USL − LSL) / (6σ)** — short-term capability
  (potential, ignoring centering)
- **Cpk = min((USL − μ) / 3σ, (μ − LSL) / 3σ)** — short-term
  capability accounting for centering
- **Pp / Ppk** — same calculations with overall (long-term)
  variation

Targets:
- Cpk ≥ 1.33 — capable
- Cpk ≥ 1.67 — highly capable (automotive standard)
- Cpk ≥ 2.0 — six sigma capable

### Control charts — the central tool of SPC

Plot data over time with control limits at ±3σ from the
process mean. Points outside the limits or showing
non-random patterns indicate "special cause variation" that
should be investigated. Common chart types:

| Chart | Data type | Use case |
| --- | --- | --- |
| **X-bar/R** | Continuous, small subgroups | Monitor mean + range of subgroups |
| **X-bar/S** | Continuous, larger subgroups | Mean + standard deviation |
| **I-MR** | Continuous, individuals | One measurement per period |
| **p** | Attribute, proportion defective, variable sample | Fraction defective |
| **np** | Attribute, count defective, constant sample | Number defective |
| **c** | Attribute, count of defects | Defects per unit, constant sample |
| **u** | Attribute, defects per unit, variable sample | Defects per unit |
| **EWMA / CUSUM** | Continuous, detect small shifts | Sensitive to small drifts |

Reading rules (Western Electric / Nelson rules) detect
special-cause patterns (e.g., 8 consecutive points on one
side of centerline; 2 of 3 in zone A; trend of 6).

### Hypothesis testing — checking if change is real

A change in metric average could be real or noise. Hypothesis
tests answer: how likely is this difference under chance
alone?

| Test | When |
| --- | --- |
| **One-sample t-test** | Single sample mean vs target |
| **Two-sample t-test** | Two independent sample means |
| **Paired t-test** | Before/after on the same units |
| **ANOVA (F-test)** | Three+ group means |
| **Chi-square** | Categorical data, independence / goodness of fit |
| **Mann-Whitney U** | Two-sample non-parametric |
| **Kruskal-Wallis** | ANOVA non-parametric |
| **Regression / correlation** | Continuous relationship |

The p-value threshold (0.05 by convention) controls type-I
error. Effect size + confidence interval are at least as
important as p-value alone.

### Design of Experiments (DoE)

Vary multiple factors simultaneously in structured ways:

- **Full factorial** — all combinations; expensive but
  complete
- **Fractional factorial** — subset (e.g., 2^(k-p))
  resolving main effects + key interactions
- **Response surface (CCD, Box-Behnken)** — model
  curvature near an optimum
- **Taguchi** — robust design, parameter design for
  noise rejection

DoE is what separates Six Sigma analysis from "we tried it
and it seemed better." One-factor-at-a-time experimentation
misses interactions; DoE finds them in a fraction of the
runs.

### FMEA — failure mode and effects analysis

For each failure mode of a process / product:

- **Severity (S)** — how bad if it happens (1-10)
- **Occurrence (O)** — how likely (1-10)
- **Detection (D)** — how easily we'd catch it before reaching
  customer (1-10)
- **RPN = S × O × D** — Risk Priority Number

Highest RPNs go first. Two flavours:
- **Design FMEA (DFMEA)** — failure modes during product use
- **Process FMEA (PFMEA)** — failure modes during the
  production / service process

### The Belt hierarchy

Practitioners earn ASQ-aligned belts:

- **White Belt** — basic concept awareness
- **Yellow Belt** — supports projects, basic tool kit
- **Green Belt** — leads simpler projects, ~50% of role
- **Black Belt** — leads complex projects, full-time role
  during project (typically 1-2 years)
- **Master Black Belt** — trains belts, mentors projects,
  selects projects, governs program
- **Champion** (Executive) — sponsors projects, allocates
  resources, removes barriers

The hierarchy exists to scale expertise. Without trained
Master Black Belts who select projects with real ROI, the
program degenerates into projects with no impact.

### Cost of Poor Quality (COPQ)

The financial argument for Six Sigma. Costs of NOT having
quality:

- **Internal failure** — scrap, rework, retests
- **External failure** — warranty, returns, recalls,
  litigation
- **Appraisal** — inspection, testing
- **Prevention** — training, quality engineering

COPQ typically runs 15-25% of revenue in undisciplined
organizations. Six Sigma's claim: reduce by half. A
black-belt project should typically save $100K-$500K/year;
program ROI demonstrates the investment in belts.

### Lean Six Sigma fusion

The combined methodology overlays lean's flow + waste
principles with Six Sigma's variation reduction. Best when:

- Lean addresses speed / flow / waste
- Six Sigma addresses defects / variation / capability

Worst when:
- Six Sigma's project rigidity kills lean's daily kaizen
  habit
- Lean tools get reframed as "Six Sigma tools" and lose
  their cultural foundation
- The fused program loses lean's people-respect commitment

Treat Lean Six Sigma as two methodologies practiced together
by the same team, not one fused thing.

## Anti-Patterns

### "Belt-collecting" without project results

Companies train hundreds of Yellow / Green Belts who never
complete projects that move metrics. The training spend is
visible; the impact is invisible. Cure: belt qualification
requires completed project with verified financial impact,
not just exam scores.

### "Vanity projects" picked for ease

Black Belts pick problems they can solve, not problems that
matter. Project selection should be top-down from strategic
problems with COPQ data — not bottom-up from "I have an idea
for a project."

### Statistical tools applied without measurement system
validation

Capability analysis on data whose Gauge R&R was never
performed produces nonsense. The same applies to control
charts: garbage in, garbage out. Always validate the
measurement system first.

### "p < 0.05 means it's true"

A statistically significant difference can be practically
meaningless (e.g., 0.1% improvement at huge sample). Effect
size + practical significance matter. Conversely, a
non-significant result with a small sample doesn't prove "no
effect" — it shows insufficient power.

### Control phase skipped or weak

Projects show improvement during Improve, then regress to
baseline within 6 months because no control plan was
implemented. The Control phase exists exactly for this
problem; it's the most commonly skipped phase. Without
control charts + SOPs + training + audit cadence, gains
evaporate.

### DMAIC applied to small problems

DMAIC's overhead (project charter, tollgates, full analysis)
makes sense for problems worth ≥$50K-$100K in savings.
Smaller problems should be solved with rapid PDCA or kaizen,
not formal DMAIC. Applying DMAIC to a one-line bug fix is
process theatre.

### "Six Sigma" used as a synonym for "rigorous"

Mike at the cocktail party: "we should Six Sigma our hiring
process." This usage strips the term of meaning. Six Sigma
is a specific methodology with specific tools, not a
synonym for "thorough."

### Tools over thinking

Heavy use of control charts, Pareto analysis, fishbone
diagrams without the thinking they're meant to support
produces clutter. The tools amplify clear thinking; they
don't substitute for it.

### Lean and Six Sigma mashed badly

When "Lean Six Sigma" projects use Six Sigma's project
structure (DMAIC tollgates) but lose lean's people-respect
foundation and daily improvement habit, neither philosophy
gets its full value. The cure: practice both deliberately;
don't fuse them into mush.

## Verification Checklist

For a Six Sigma program or project:

- [ ] Problem statement is specific, measurable, and tied to
      strategic priorities or customer pain.
- [ ] CTQ is defined with measurable spec limits, not "we'd
      like things to be better."
- [ ] Measurement System Analysis (Gauge R&R) was performed
      before any capability analysis.
- [ ] Baseline capability is documented: Cp, Cpk, sigma
      level, DPMO.
- [ ] Improvement is statistically verified (hypothesis test
      with effect size, not just before/after eyeballing).
- [ ] Practical significance is demonstrated alongside
      statistical significance.
- [ ] Control plan exists and is being followed: control
      charts running, SOPs in place, training delivered,
      audit cadence set.
- [ ] Financial benefit is verified by Finance, not claimed
      by the project team.
- [ ] If DoE was used, factors + levels + interactions are
      documented; residual analysis confirms the model.
- [ ] FMEA RPN scores have been reduced for the highest-risk
      failure modes.
- [ ] Project team includes the people who do the work, not
      just analysts.
- [ ] The Belt hierarchy includes at least one trained Black
      Belt or Master Black Belt mentoring this project.

## Cross-References

- [[lean-manufacturing]] — combined as Lean Six Sigma when
  both philosophies are practiced together
- [[supply-chain-patterns]] — supplier quality requires
  capability + process control
- [[continuous-improvement]] — kaizen is the daily habit;
  Six Sigma projects are the periodic event
- [[performance-management]] — sigma level + DPMO as
  process scorecards
- [[design-thinking]] — VoC research is design thinking's
  empathy phase; Six Sigma converts it to measurable CTQs
- [[okr-framework]] — Six Sigma project outcomes can be
  framed as KRs

## Why This Skill Exists

Six Sigma's reputation has two competing realities. On one
hand: Motorola saved $16B over 11 years; GE attributed $12B
in 5 years to its program; Honeywell, Caterpillar, Bank of
America, and dozens more had material results. On the
other: countless companies trained thousands of belts, ran
hundreds of projects, and saw nothing move on the bottom
line.

The difference between the two outcomes is execution
discipline:

1. **Strategic project selection** — projects must address
   real, financially material problems
2. **Trained practitioners** — Black Belts who can read a
   control chart and design a DoE
3. **Tollgate discipline** — DMAIC phases completed, not
   skipped
4. **Validated measurement systems** — capability analysis
   on data that's been Gauge R&R'd
5. **Control phase honored** — gains hold for years, not
   weeks
6. **Finance verification** — claimed benefits audited by
   Finance

When all six are present, Six Sigma works. When any is
absent, the program drifts toward belt-collecting theatre.

This skill exists to ensure principal-level decisions about
Six Sigma — whether to adopt it, whether to combine with
lean, whether to launch this particular DMAIC project,
whether to trust this claimed improvement — are made on the
basis of what the methodology actually demands, not on its
brand.

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
- DMAIC project chartered without baseline measurement (skipping Measure phase)
- Cp / Cpk reported without verifying process is in statistical control (control-chart skipped)
- Defect definition not operationalised (different operators classify differently)
- DOE run with confounded factors (results uninterpretable)
- Improve phase changes implemented without Control phase plan (regression risk)
- Sigma level claimed without long-term Cp adjustment (z-shift not applied)
- Statistical significance reported on n < 30 without exact-test method
- Process change shipped without measurement system analysis (MSA — gauge R&R skipped)
- Quick-win pilot extrapolated to enterprise without verification
- Belt certification taken as competency proxy instead of project results

**Refinement candidates**:
- New tool row when a new statistical method becomes broadly applicable
- New cross-reference when a sister skill (lean-manufacturing, supply-chain-patterns, mlops-patterns) adds a Six Sigma gate
- Tightening of the MSA-first policy when measurement-quality regression recurs
- New SIPOC template when a recurring process shape emerges
