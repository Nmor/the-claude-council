---
name: performance-management
description: Principal-level performance management — feedback systems, calibration, ratings (or no ratings), career frameworks, performance improvement plans, and the operational discipline that turns reviews from anxiety-inducing theatre into a real engine of growth, retention, and accountability.
auto_activate: true
---

# Performance Management

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Patterns | [`references/core-patterns.md`](references/core-patterns.md) |

## Purpose

Operate a performance management system that produces clear, fair,
timely signals to every employee about how they're performing, what
they need to improve, what they need to keep doing, and what they
can expect from the organisation in return. Performance management
is the highest-touch lever a leader has — done well, it compounds
high performers and surfaces low performers honestly + early; done
poorly, it demoralises the strong, retains the weak, and converts
every review cycle into a paperwork tax that delivers no useful
signal.

The skill activates on review-cycle design, calibration meetings,
360 feedback rollouts, compensation discussions tied to performance,
career-ladder design, performance improvement plan (PIP)
conversations, ratings debate ("should we abolish ratings?"),
attrition spikes, "manager satisfaction is dropping" surveys, and
the recurring crisis of "we don't know who our top performers
actually are."

## Standards Cited

- **Andy Grove, "High Output Management" (Random House, 1983)** —
  origin of the manager-as-coach frame; output as the unit of
  performance
- **Marcus Buckingham + Ashley Goodall, "Reinventing Performance
  Management" (Harvard Business Review, April 2015) + "Nine Lies
  About Work" (HBR Press, 2019)** — Deloitte + Cisco's empirical
  case against ratings, rankings, calibration sessions; the team-
  leader-as-data-source model
- **Laszlo Bock, "Work Rules!" (Twelve, 2015) — chapter 8** —
  Google's performance review redesign; separating ratings,
  compensation, and development conversations
- **Kim Scott, "Radical Candor" (St. Martin's, 2017)** — "care
  personally, challenge directly"; the manager-feedback frame
- **Patrick Lencioni, "The Advantage" (Jossey-Bass, 2012)** —
  organisational health as the foundation for performance
- **Edmondson, "The Fearless Organization" (Wiley, 2018)** —
  psychological safety as a precondition for honest performance
  conversations
- **Drucker, "The Practice of Management" (Harper, 1954)** —
  Management by Objectives (MBO) origin; performance-as-results
- **CIPD "Performance Management: An Introduction" (annual update)**
  — UK practitioner reference
- **SHRM "Performance Management" body of knowledge** — US
  practitioner reference; legal exposure on PIPs, terminations,
  rating disparities
- **EEOC + Title VII (US), Equality Act 2010 (UK), EU Equal
  Treatment Directive** — protected-characteristic frameworks
  governing performance decisions
- **DORA "State of DevOps" reports** — correlation of psychological
  safety + performance feedback quality with team performance
- **Atlassian + GitLab public handbooks** — modern transparent
  career-framework + feedback-system patterns

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

Auto-engage on these signals:

- Annual / semi-annual / quarterly review cycle approaching
- Career framework / leveling guide being authored or revised
- New manager onboarding (the highest-stakes hand-off in the system)
- Calibration debates: "Maria is M3, Jamal is M3, but Maria's
  bonus is 2x — why?"
- A PIP is being initiated, extended, or closed
- An employee escalates a perceived unfair review
- Attrition spike concentrated in high-performer demographic
- Engagement survey signals dropping on manager-quality questions
  ("My manager gives me useful feedback regularly")
- Ratings disparity surfacing across protected groups (legal flag)
- Promotion committee debating leveling for senior IC or manager
  candidates
- Compensation philosophy debate — pay-for-performance vs
  pay-for-skills, ratings tied to comp vs decoupled
- 360 feedback rollout being planned
- Manager training program being designed
- Hiring → first 90 days → first formal review handshake (the
  onboarding → performance handoff)
- An organisation switching from one performance model to another
  (ratings to no-ratings, annual to continuous)

## Anti-Patterns

- **Annual-only feedback.** A year of unsaid things compressed into
  one meeting where neither party can process it.
- **The surprise review.** Employee learns at review time that
  they're below expectations on something the manager hasn't
  mentioned in 11 months.
- **Ratings + comp coupled to OKR grades.** Sandbagging on goals
  becomes rational. Per `okr-framework`, OKR grades are NOT
  direct inputs to comp.
- **Forced-distribution ratings.** Politics + perverse incentives;
  GE's stack-rank era is a documented case study in collateral
  damage.
- **Ratings without calibration.** The easy-grading manager and the
  hard-grading manager produce incompatible signals; comp +
  promotion outcomes become unfair across teams.
- **PIPs as a paperwork formality before pre-decided termination.**
  The org pretends the PIP is a development opportunity; both
  parties know it isn't; trust erodes; legal exposure rises when
  the PIP outcome was predetermined.
- **Selective PIP issuance.** Disparate-impact statistical analysis
  reveals patterns of PIP issuance correlated with protected
  characteristics; this is a top legal exposure.
- **Manager-only feedback channel.** The employee's growth depends
  on one person's perception; if the manager is wrong, the employee
  has no recourse and no other signal.
- **"Performance management is HR's job."** No. The manager owns
  performance. HR partners. When HR drives the conversation, the
  manager has abdicated.
- **Vague feedback.** "You need to be more strategic" delivers no
  actionable signal. Replace with: "When you were leading the
  migration, you focused on the technical implementation without
  surfacing the business trade-offs to the leadership team; next
  time, send a one-pager with options + recommendation to `<name>`
  before starting."
- **Strength-only feedback.** "You're great at everything!" tells
  the employee nothing about where to grow. The honest manager
  delivers both.
- **Performance system as compliance theatre.** Forms get filled,
  meetings get held, no decisions change, no behaviours change.
  The system is the cost; nothing is the benefit.
- **Failure to retain top performers.** Outstanding employees who
  hear "meets expectations" for two cycles leave. The system must
  differentiate at the top with comp + opportunity + recognition.
- **Long-tail underperformer tolerance.** A consistently-below-bar
  employee who isn't addressed costs the team more than the
  awkward conversation costs the manager.
- **Comp opacity.** Bands undisclosed, ratings undisclosed,
  rationale undisclosed; the employee's only signal is the number;
  trust collapses.
- **One-size-fits-all framework.** A career framework for
  individual contributors that doesn't accommodate research,
  design, sales, customer success creates leveling injustice
  across functions.
- **Manager bias unchecked.** Without 360 feedback, calibration, or
  skip-level reviews, the manager's biases compound unchecked into
  the team's outcomes.

## Verification Checklist

- [ ] Real-time + weekly + quarterly + annual cadences are
      operating (not just the annual)
- [ ] Performance, compensation, and development conversations are
      separated by time and framing
- [ ] Career framework + leveling guide exist and are public to all
      employees
- [ ] Calibration meetings happen with structured process and
      facilitator
- [ ] Ratings (or rating categories) decouple from OKR grades
- [ ] PIPs are specific, measurable, time-bound, supported,
      documented, and equitable across demographics
- [ ] PIP outcome statistics are reviewed for disparate impact
- [ ] Promotion process is separate from performance review,
      documented, with cross-team committee for senior levels
- [ ] 360 feedback is used for development, not compensation
- [ ] Skip-level reviews happen (the manager's manager talks to ICs
      directly)
- [ ] Compensation philosophy + bands are documented and disclosed
      appropriately
- [ ] Top performer retention is tracked + actively managed
- [ ] Manager performance includes manager-quality metrics (eNPS,
      attrition, team engagement)
- [ ] All managers receive annual training in giving feedback +
      calibration + difficult conversations + bias mitigation
- [ ] All employees receive annual training in receiving feedback +
      requesting feedback + self-advocacy
- [ ] Performance-decision documentation exists for legal
      defensibility (rationale, evidence, conversations held)
- [ ] Engagement / pulse survey tracks "I get useful feedback from
      my manager regularly"

## Cross-References

- `org-design` — performance feedback structures depend on manager
  span of control
- `okr-framework` — OKR grades inform context but do NOT drive
  compensation or promotion directly
- `hiring-process` — onboarding (the last mile of hiring) feeds
  into the first formal performance check at 90 days
- `code-of-conduct.md` — performance system embodies organisational
  values
- `gdpr-ccpa.md` — performance records carry employment-data
  obligations
- `audit-logging.md` — performance decisions are auditable records
- `documentation-requirements.md` — career frameworks +
  performance documentation live in canonical docs

## Why This Skill Exists

Without principal-level performance management, organisations fail
in predictable, often-fatal ways:

- **High-performer attrition** — outstanding people who are told
  they're average leave for organisations that recognise them;
  the team's bar drops; remaining strong performers leave next
- **Low-performer retention** — managers avoid the hard
  conversation; underperformers stay for years, frustrating
  teammates and consuming disproportionate manager attention;
  high performers see the disparity and leave
- **Legal exposure** — disparate-impact statistics on ratings,
  PIPs, terminations, promotions invite class actions and
  regulatory action
- **Cultural erosion** — the system becomes the lie; everyone
  knows ratings are political, calibration is theatre, PIPs are
  exits in disguise; trust collapses; cynicism spreads
- **Promotion injustice** — favourites of the loudest managers
  get promoted; quiet high performers stagnate; demographic
  patterns emerge in promotion outcomes; HR briefs the lawyers
- **Manager burnout** — annual-cycle review writing turns into
  weeks of paperwork; managers resent the system; quality drops
- **Strategic misalignment** — what gets rated isn't what
  matters; the organisation rewards visibility over substance;
  output drifts from what the strategy needs

Conversely, when performance management is principal-grade:

- High performers are recognised, retained, developed, promoted
- Strong middle performers are clearly told what would make them
  exceed
- Low performers are addressed honestly, early, with support and
  with a clear off-ramp if support doesn't work
- Comp + promotion decisions are transparent, fair, and defended
  by documentation
- Managers grow as developers of people because the system asks
  them to
- The organisation's strategy is encoded in what gets recognised,
  rewarded, and called out

The cost of a principal performance system is calibration time,
manager training, framework authoring, and the courage to have
honest conversations. The cost of an amateur performance system
is the slow leak of trust + talent + alignment that no
compensation package can recover. The principal move is to invest
in the system as the load-bearing operational capability it
actually is, not the annual paperwork tax most organisations
pretend it is.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Performance feedback annual only (no quarterly / continuous touchpoints)
- Rating without supporting evidence (manager-impression-only)
- Calibration session skipped (rating drift across teams)
- PIP launched without clear measurable criteria + timeline + support
- Top performer not re-recruited (retention complacency)
- Bottom performer carried for > 2 cycles without remediation or exit
- Compensation decisions decoupled from performance ratings
- Career-ladder framework absent or stale (level definitions don't match current work)
- 360 feedback collected but never synthesised back to ratee
- Calibration data not reviewed for demographic equity

**Refinement candidates**:

- New rating-scale row when ratings-vs-no-ratings debate re-opens
- New cross-reference when a sister skill (hiring-process, org-design, okr-framework) adds a perf
  gate
- New PIP template when recurring exit-pattern emerges
- Tightening of the calibration cadence when drift recurs
