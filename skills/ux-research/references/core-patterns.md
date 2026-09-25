# ux-research: Core Patterns

> Covers **Core Patterns** for the `ux-research` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 18 KB** — `token-budget.mjs --check`.

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
