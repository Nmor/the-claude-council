---
name: ux-research
description: Principal-level user research methodology — generative vs evaluative methods, study design, recruitment, sample sizing, qualitative coding, statistical rigour for usability tests, persona + JTBD synthesis, ethical research practice, and the discipline that turns user observations into decisions product teams actually use.
---

# UX Research

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> User research either drives decisions or it's decoration.
> Decoration is expensive; decision-grade research is even more
> so when done wrong. This skill is the discipline that earns
> the budget.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Patterns | [`references/core-patterns.md`](references/core-patterns.md) |

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

- New method-selection row when a new research method becomes appropriate (e.g., diary studies for
  long-tail behaviour)
- New cross-reference when a sister skill (interaction-design, design-thinking, design-systems) adds
  a research gate
- New synthesis template when a recurring shape emerges (e.g., affinity diagram → JTBD map)
- Tightening of the sample-size policy when under-powered findings recur
