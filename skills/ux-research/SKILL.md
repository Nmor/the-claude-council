---
name: ux-research
description: Principal-level user research methodology — generative vs evaluative methods, study design, recruitment, sample sizing, qualitative coding, statistical rigour for usability tests, persona + JTBD synthesis, ethical research practice, and the discipline that turns user observations into decisions product teams actually use.
---

# UX Research

> User research either drives decisions or it's decoration.
> Decoration is expensive; decision-grade research is even more
> so when done wrong. This skill is the discipline that earns
> the budget.

## Purpose

UX research answers three classes of question: WHY do users
behave this way (generative), DOES this design work for them
(evaluative), and HOW MUCH (quantitative). Each class has
appropriate methods, sample sizes, biases to defend against,
and synthesis patterns. Mismatching method to question — running
a quantitative survey to discover unmet needs, or running five
qualitative interviews to claim a statistical effect — wastes
budget and produces unreliable conclusions.

This skill names the methods, the conditions under which each is
appropriate, the recruitment + sample-size discipline, the
analysis frameworks, the ethical baseline, the synthesis outputs
(personas, journey maps, JTBD statements, opportunity maps), and
the operational pattern that connects research to product
decisions and back to research again.

NOT in scope: visual design patterns (see `interaction-design` +
`design-systems`); accessibility-specific evaluation (see
`wcag-accessibility`); A/B test statistics on shipped features
(see `mlops-patterns`); customer-success-driven account
research.

## Standards Cited

- **ISO 9241-210:2019** — Human-centred design for interactive
  systems (the canonical international standard)
- **ISO 9241-11:2018** — Usability: definitions and concepts
  (effectiveness + efficiency + satisfaction)
- **Nielsen J., Landauer T. (1993)** — "A mathematical model of
  the finding of usability problems" (5 users finds ~85% of
  usability issues — with caveats)
- **Krug S. (2014)** — "Don't Make Me Think, Revisited" — task-
  based usability framework
- **Christensen C., Hall T., et al. (2016)** — "Know Your
  Customers' Jobs to Be Done", HBR
- **Cooper A. (1999)** — "The Inmates Are Running the Asylum"
  (personas)
- **Sauro J., Lewis J. (2016)** — "Quantifying the User
  Experience", 2e — statistical methods for UX
- **Kuniavsky M. (2003)** — "Observing the User Experience"
- **Portigal S. (2013)** — "Interviewing Users"
- **NN/g Research Reports** — UX research methods inventory
- **Belmont Report (1979)** — research ethics principles
  (respect for persons, beneficence, justice)
- **GDPR Articles 6, 7, 9, 32** — lawful basis, consent,
  special-category data, security
- **HIPAA §164.512(i)** — health research authorisations (when
  applicable)
- **APA Ethics Code (2017)** — psychological research ethics
- **ICC/ESOMAR International Code on Market, Opinion and Social
  Research (2016)**
- **WCAG 2.2** — inclusive research with disabled participants
- **Diátaxis** — applies to research documentation
- **Promptfoo / Maze / dscout / UserTesting / Lookback /
  Userlytics** — research platforms

## When to Fire

- Defining a new product or feature where target users are not
  well understood
- Stakeholders disagree about what users want (a sign that
  nobody actually knows)
- Quantitative analytics show drop-offs that need qualitative
  explanation
- Before shipping a major redesign — baseline measurements
- Before launching to a new market or persona segment
- Recurring support tickets that cluster around the same task
- Sales / customer success reporting recurring objections
- Annual or quarterly persona refresh
- A change in regulatory or accessibility scope that requires
  evidence of inclusion

Pairs with `interaction-design` (informs design decisions),
`design-systems` (research surfaces patterns worth elevating),
`wcag-accessibility` (research with disabled participants),
`gdpr-ccpa.md` (lawful basis + special-category data handling),
`audit-logging.md` (consent + recording retention),
`task-intake-due-diligence.md` Q12 + Q22 (success criteria),
`feature-flags.md` (research can drive flag-gated rollouts).

## Core Patterns

### Pattern 1: Method-to-question matching

```text
┌──────────────────────────────────┬─────────────────────────────────┐
│ Research question                │ Appropriate method              │
├──────────────────────────────────┼─────────────────────────────────┤
│ What problems do users have?     │ Generative interviews +         │
│                                  │ contextual inquiry              │
├──────────────────────────────────┼─────────────────────────────────┤
│ How do users currently solve X?  │ Diary studies, ethnography,     │
│                                  │ shadowing                       │
├──────────────────────────────────┼─────────────────────────────────┤
│ What jobs are users hiring our   │ JTBD interviews (switch + first │
│ product for?                     │ purchase moments)               │
├──────────────────────────────────┼─────────────────────────────────┤
│ Can users complete task X with   │ Moderated usability test (5-8   │
│ this design?                     │ users per persona)              │
├──────────────────────────────────┼─────────────────────────────────┤
│ How does this design compare to  │ Unmoderated comparative test    │
│ that one?                        │ (30-50 per cell)                │
├──────────────────────────────────┼─────────────────────────────────┤
│ How big is the problem? Who is   │ Quantitative survey (N=200+)    │
│ affected?                        │                                 │
├──────────────────────────────────┼─────────────────────────────────┤
│ How easy is the system to use?   │ SUS, UMUX-LITE, SUPR-Q          │
│                                  │ benchmarks (N=30+)              │
├──────────────────────────────────┼─────────────────────────────────┤
│ Did the new design improve task  │ Pre/post quantitative usability │
│ completion?                      │ benchmark or A/B in production  │
├──────────────────────────────────┼─────────────────────────────────┤
│ What do users say about feature  │ Sentiment analysis of support / │
│ X?                               │ reviews / social + interviews   │
├──────────────────────────────────┼─────────────────────────────────┤
│ Which information architecture   │ Card sort + tree test           │
│ matches user mental models?      │                                 │
└──────────────────────────────────┴─────────────────────────────────┘
```

### Pattern 2: Sample sizing — the right N for the right question

| Method | Recommended N | Notes |
| --- | --- | --- |
| Generative interviews (per segment) | 5-8 until saturation | Saturation = next interview adds no new themes |
| Moderated usability test (per persona) | 5-8 | Nielsen's 85% rule applies WITHIN a homogeneous segment |
| Unmoderated usability / preference | 30-50 per cell | Detects medium effects with reasonable power |
| Comparative quantitative usability | 50+ per condition | Powered for statistical significance |
| Surveys (descriptive) | 200+ | Margin of error < 7% on proportions |
| Surveys (sub-group analysis) | 400+ | Detects sub-group differences |
| Card sort | 30-50 | Open card sorts need more to surface consistent groupings |
| Tree test | 50-100 | Quantifies findability |
| SUS / SUPR-Q benchmarks | 30+ | For reliable score; <30 makes intervals wide |

The "5 users is enough" rule from Nielsen is OFTEN misapplied. It
holds when:

- Users are homogeneous (one persona)
- You are looking for usability issues (presence/absence)
- You will iterate quickly and test again

It DOES NOT hold when:

- You serve multiple distinct personas — need 5 per persona
- You are quantifying (effect sizes, satisfaction scores)
- You are doing comparative evaluation
- You need stakeholder buy-in that statistical thresholds
  satisfy

### Pattern 3: Recruitment discipline

The biggest source of bad research is bad participants. Defences:

1. **Screener that excludes pre-existing knowledge**: rule out
   employees, competitors, recent contractors, anyone who has
   already seen the design
2. **Quotas for representation**: gender, age, technical
   proficiency, accessibility needs, locale — match the actual
   user base, not the convenient one
3. **Disability-inclusive recruitment**: at least one
   participant with a vision, motor, cognitive, or hearing
   disability in each evaluative study
4. **No friends and family**: they are biased to like your work
5. **Compensate fairly**: market-rate incentives signal you take
   the participant's time seriously — and produce better data
6. **Avoid panel fatigue**: rotate participant pools; same-people
   bias creeps in fast on platforms with small pools
7. **Document inclusion + exclusion criteria** before recruitment
   to prevent rationalising-after-the-fact filtering

### Pattern 4: Study design — the structured discussion guide

Every interview / usability session uses a written guide:

```markdown
# Study: <task / persona>
# Researcher: <name>      Date: <yyyy-mm-dd>
# Participant: <P01>      Compensation: <amount, type>

## Pre-session checklist
- [ ] Consent form signed (recording / data use / right to withdraw)
- [ ] Screen recording + audio permissions OK
- [ ] Materials prepared (prototype URL, props, scenarios)
- [ ] Note-taker present + briefed

## Warm-up (3-5 min)
1. Brief intro of researcher + study purpose (no priming).
2. Confirm permissions.
3. "Tell me a bit about yourself — your role, how you use X."

## Background (5-10 min)
- Open questions that surface mental models BEFORE design exposure.
- Goal: understand existing workflow + pain points without
  contaminating with our solution.

## Tasks (25-40 min)
For each task:
- Scenario: "Imagine you need to <user-goal>. Show me how you
  would do that."
- Behaviour to observe: <list 3-5 things>
- Probes (only if needed): "What are you thinking?"
- Success criteria (silent — for the researcher only)

## Reflection (5-10 min)
- "What was easy? What was hard?"
- "How would you describe this to a friend?"
- "On a scale of 1-7, how easy was X?" (SEQ)
- "Is there anything I didn't ask that I should have?"

## Close (2-3 min)
- Thank participant.
- Confirm incentive delivery.
- Remind about right to withdraw data.
```

### Pattern 5: Bias mitigation

| Bias | Counter |
| --- | --- |
| Leading questions ("Don't you find this easy?") | Neutral phrasing; open-ended |
| Confirmation bias (only quoting supportive findings) | Quote disconfirming participants too |
| Recency / primacy in synthesis | Counterbalance task order across participants |
| Researcher demand (participants want to please) | "There are no right answers" + observe behaviour > opinion |
| Sampling bias (only enthusiastic users opt in) | Quotas; recruit lapsed and rejected users |
| Anchoring on the first participant | Refresh the analytical frame between sessions |
| Hawthorne effect (being observed changes behaviour) | Make sessions long enough for adaptation; complement with diary studies |
| Overgeneralising from small N | State sample size + caveats in every finding |

### Pattern 6: Qualitative coding + thematic analysis

After interviews / sessions:

1. **Transcribe** (auto + human review)
2. **Open coding**: tag passages with descriptive labels
3. **Axial coding**: cluster codes into categories
4. **Thematic synthesis**: identify cross-participant patterns
5. **Frequency table**: how many participants showed each theme;
   suppress themes from a single participant unless severity is
   high
6. **Verbatim anchors**: every theme paired with 1-3 quotes that
   make it concrete

Tools: **Dovetail**, **Reduct**, **Marvin**, **Notably**,
**Condens**, **EnjoyHQ**. NVivo / ATLAS.ti for academic depth.

### Pattern 7: Quantitative usability metrics

| Metric | Formula | When |
| --- | --- | --- |
| **Task completion rate** | % of users who finished | Every usability test |
| **Time on task** | Median + IQR | Compare designs |
| **Error rate** | Errors per task | Detect specific failure modes |
| **Single Ease Question (SEQ)** | 1-7 post-task | Quick proxy for difficulty |
| **System Usability Scale (SUS)** | 0-100 composite of 10 questions | Benchmark against industry (target ≥ 68) |
| **UMUX-LITE** | 2 questions; correlates with SUS | When SUS is too long |
| **Net Promoter Score (NPS)** | -100 to +100 | Loyalty, not usability — use with care |
| **Customer Satisfaction (CSAT)** | 1-5 post-interaction | Touchpoint-specific |
| **Customer Effort Score (CES)** | 1-7 "easy to deal with" | Support / self-service |

Report quantitative results with **confidence intervals** and
**effect sizes**, not just p-values. Visualise distributions
(box plots, violin plots), not just means.

### Pattern 8: Synthesis artefacts — personas, journey maps, JTBD

**Personas** (research-grounded, not invented):

```text
# Persona: "Maya the Migrating Manager"

Source: 12 generative interviews, segment "mid-market ops
managers", evidence cluster strength HIGH.

Context:
- Manages a team of 6-15 across two time zones
- Inherited legacy spreadsheet workflow; under pressure to modernise
- Limited budget authority; needs to build internal case

Top jobs to be done:
1. When my team is over-allocated, I want to rebalance work
   quickly, so I can keep deadlines without burning anyone out.
2. When stakeholders ask "how's it going?", I want a snapshot
   I can copy into a slide, so I look prepared.
3. When I'm evaluating tools, I want to predict adoption pain,
   so I can avoid the last three migrations' failure pattern.

Anti-jobs (will NOT spend energy on):
- Customising dashboards beyond a few widgets
- Learning new query languages

Top pains: <list>
Top gains sought: <list>
Quotes: <3 verbatim>
```

**JTBD statements** follow the Christensen pattern:

```text
When [SITUATION], I want to [MOTIVATION], so I can [EXPECTED OUTCOME].
```

**Journey maps**:

```text
Stage:        | Awareness | Consideration | Onboarding | Habit | Renewal
Goal:         | ...       | ...           | ...        | ...   | ...
Action:       | ...       | ...           | ...        | ...   | ...
Touchpoints:  | ...       | ...           | ...        | ...   | ...
Emotion:      |  😐       |  🙂           |  😣        | 😊    | 🤔
Pain points:  | ...       | ...           | ...        | ...   | ...
Opportunity:  | ...       | ...           | ...        | ...   | ...
```

### Pattern 9: ResearchOps — making research repeatable

Operational discipline so research stops being "the one
researcher's heroic effort":

- **Participant database** with consent metadata + last-contacted
  - privacy-tier metadata
- **Recruitment SLA** (X days from request → Y participants)
- **Study templates** (screeners, guides, consent forms)
- **Insight repository**: every finding tagged with persona,
  journey stage, severity, evidence (raw clips), and decision
  impact
- **Quarterly research roadmap** matching upcoming product
  decisions
- **Cross-functional intake**: PM / design / engineering submit
  research requests through a single channel
- **Synthesis output schedule**: insights surface within
  N business days of last session

### Pattern 10: Research ethics — non-negotiable baseline

Belmont Report principles applied:

- **Respect for persons**: informed consent, voluntary
  participation, right to withdraw at any time, right to delete
  recordings
- **Beneficence**: minimise harm (stop sessions if distressing,
  avoid sensitive probes without prior approval, don't use
  research data for marketing)
- **Justice**: equitable recruitment (no convenience-sampling
  from one demographic), fair compensation

Concrete requirements:

- Written consent BEFORE recording; renewed at recruitment +
  session start
- Special-category data (per GDPR Art. 9 — health, ethnicity,
  sexual orientation, biometric) requires explicit consent +
  documented lawful basis
- Data minimisation: collect only what the study needs
- Retention: define + enforce (typically 90 days for raw clips,
  longer for anonymised transcripts only)
- Storage: encrypted at rest, access-controlled, audit-logged
  (per `audit-logging.md`)
- IRB / ethics review for academic / health / children research

### Pattern 11: Connecting research to decisions

Research that doesn't change decisions is decoration. Patterns:

- **Decision logs**: every PRD / ADR cites the research that
  informed it
- **Severity ratings**: usability findings labelled BLOCKER /
  MAJOR / MINOR with definitions
- **Recommendation specificity**: "Move the Save button to the
  top-right of the form" beats "improve form ergonomics"
- **Re-research after launch**: did the change move the metric?
- **Quarterly research review with leadership**: themes across
  studies, opportunity map, what's NOT being researched

### Pattern 12: Mixed methods — converging on truth

Single-method studies always have blind spots. Mix:

- **Analytics + interviews**: analytics show WHAT, interviews
  explain WHY
- **Surveys + interviews**: surveys size; interviews
  contextualise
- **Usability + diary**: usability shows in-session; diary shows
  over-time
- **Internal data + external benchmarks**: contextualise your
  numbers against industry comparators

Triangulation across methods is the strongest evidence base.

## Anti-Patterns

| Anti-pattern | Why bad | Fix |
| --- | --- | --- |
| 5 friends-and-family interviews "to validate the idea" | Biased + non-representative + no methodological discipline | Recruit external participants per screener |
| Survey to discover unmet needs | Surveys reward articulate, post-hoc reasoning, not lived behaviour | Interviews + diary studies for generative |
| Leading questions ("Wouldn't it be great if...") | Confirms predetermined hypothesis | Open-ended phrasing |
| Cherry-picked quotes for the deck | Hides disconfirming evidence | Quote ratio + frequency tables |
| Personas based on demographics | Demographics ≠ behaviour | Behaviour-clustering + JTBD |
| Research conducted, never connected to decisions | Wastes budget; researcher demoralised | Decision logs + cross-functional intake |
| Recording without consent | Legal + ethical breach | Written, renewable consent |
| Single method, claim "users want X" | Method-bias, weak evidence | Mixed methods + triangulation |
| Synthesis from memory after the session | Recency + emotional bias | Transcripts + structured coding |
| Saturation never reached, stopped at N=3 | Insufficient evidence | Run interviews until new themes stop emerging |
| Comparing a polished design to a competitor's mock | Stimulus quality bias | Match fidelity across comparators |
| "Average" persona aggregating all users | Loses the actual users on either tail | Multiple personas; design for specific segments |
| Quantitative usability test with N=5 | Underpowered, wide intervals | N≥30 for any quantitative claim |

## Verification Checklist

- [ ] Research question matched to appropriate method
- [ ] Sample size justified for the question being asked
- [ ] Recruitment screener filters out biased participants
- [ ] Quotas ensure persona / disability / locale representation
- [ ] Consent obtained in writing; participants briefed on
      right to withdraw + data retention
- [ ] Discussion guide neutral, with probes pre-defined
- [ ] Note-taker or recording for every session
- [ ] Sessions transcribed + coded systematically
- [ ] Findings include both supportive + disconfirming evidence
- [ ] Severity ratings applied to usability findings with shared
      definitions
- [ ] Synthesis artefacts include source counts + verbatim
      anchors
- [ ] Quantitative results reported with confidence intervals +
      effect sizes
- [ ] Recommendations specific enough for product to act on
- [ ] Insight repository updated with consistent tagging
- [ ] Decision log links from PRD / ADR to research evidence
- [ ] Ethics: special-category data has documented lawful basis
- [ ] Retention + access controls applied per
      `gdpr-ccpa.md` + `data-retention.md`
- [ ] Re-research scheduled after major launches to verify
      impact

## Cross-References

- `interaction-design` — research findings drive interaction
  design choices
- `design-systems` — research surfaces patterns worth
  standardising
- `wcag-accessibility` — accessible research practice + research
  with disabled participants
- `accessible-forms` — forms-specific evaluative testing
- `mlops-patterns` — A/B testing infrastructure that complements
  qualitative research
- `gdpr-ccpa.md` — lawful basis, special-category data, retention
- `audit-logging.md` — consent + recording audit trail
- `data-retention.md` — recording + transcript lifecycle
- `feature-flags.md` — research findings can drive flag-gated
  rollouts
- `task-intake-due-diligence.md` Q12 (a11y), Q22 (success
  criteria), Q24 (AI ethics for AI-assisted research)
- `documentation-requirements.md` — research findings as
  long-lived documentation

## Why This Skill Exists

The most expensive UX decisions are the unresearched ones — a
year of engineering into a feature nobody uses, a redesign that
solves a problem users didn't have, a navigation reorganisation
that breaks the actual mental model. The second most expensive
are the misresearched ones — surveys that confirm what the team
already believes, five user tests where the testers were on the
build team's Slack, personas based on demographics that don't
predict behaviour.

The discipline this skill describes — matching method to
question, recruiting against quotas not convenience, written
consent and retention policies, structured guides, transcripts
not memory, frequency tables and verbatim quotes, decision logs
that tie research to choices — is what separates research
budgets that pay back from research budgets that produce decks
nobody reads. None of the patterns are exotic; they're the
operational scaffolding that turns researcher heroics into a
team capability.

The cost: a researcher (or designer doing serious double duty),
a participant database with consent metadata, a recording stack
with retention controls, time budgeted for synthesis. The
benefit: product decisions grounded in evidence, fewer
post-launch rebuilds, faster onboarding for new team members
because the persona map and journey map are real, and the
ability to defend choices to leadership and regulators with
data instead of opinion.

## Standards Cited

- **ISO 690:2021** — Information and documentation — guidelines
  for bibliographic references and citations
- **APA Publication Manual 7th Edition** — citation + research
  reporting (psychology / behavioural sciences default)
- **Chicago Manual of Style 17th Edition** — authoritative
  reference style (humanities + history)
- **IMRaD structure (ISO 215:1986)** — Introduction / Methods /
  Results / Discussion academic paper structure
- **PRISMA 2020 Statement** — Systematic reviews + meta-analyses
  reporting checklist
- **Cochrane Handbook for Systematic Reviews of Interventions** —
  Evidence synthesis methodology + risk-of-bias assessment
- **GRADE working group framework** — Evidence quality grading
  (High / Moderate / Low / Very Low)
- **OECD Frascati Manual 2015** — Standard practice for research
  - experimental development
- **AHA + APA + MLA citation styles** — Discipline-specific
  citation formats
- **Pyramid Principle (Barbara Minto)** — Top-down structured
  communication
- **Diátaxis Framework (Procida)** — Documentation organisation
  (tutorial / how-to / reference / explanation)
- **Nielsen Norman Group — User Research Methods** — Field studies,
  contextual inquiry, diary studies, usability testing, A/B
- **ISO 9241-210:2019** — Human-centred design for interactive
  systems
- **W3C WAI Research Methods** — Inclusive research practices
- **CWE-1426** — Improper validation of generative AI output
  (applies when AI assists synthesis)

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Feature decision made without research evidence (opinion-led product weakening)
- Persona / journey map > 12 months stale and still cited
- Research sample sized below statistical power (under-powered study claiming significance)
- Recruiting only convenience samples (sampling bias — internal users / friends)
- Leading questions in interview script (bias contamination)
- Qualitative coding done by one researcher only (inter-rater reliability gap)
- Evaluative study run on prototype without comparison to baseline
- Research findings not socialised back to product / design / engineering (knowledge silo)
- Generative research substituted with usability test (wrong tool for the question)
- Stakeholder pressure to ship despite red-flag findings (research-vs-roadmap conflict)

**Refinement candidates**:

- New method-selection row when a new research method becomes appropriate (e.g., diary studies for long-tail behaviour)
- New cross-reference when a sister skill (interaction-design, design-thinking, design-systems) adds a research gate
- New synthesis template when a recurring shape emerges (e.g., affinity diagram → JTBD map)
- Tightening of the sample-size policy when under-powered findings recur
