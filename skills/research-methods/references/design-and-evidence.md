# research-methods: Core Patterns

> Framing the work and deciding what counts as evidence: the research question, primary vs secondary
> vs tertiary sources, the evidence hierarchy, quantitative / qualitative / mixed method selection,
> and literature + systematic review (Patterns 1-5). Pointed at by the "Research question, sources,
> evidence hierarchy" row of `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Core Patterns

### Pattern 1: The Research Question

Every research project begins with a question. Bad questions
produce bad research; good questions are:

- **Specific**: "How does X affect Y in population Z?" not
  "What about X?"
- **Answerable**: a real-world investigation could produce
  evidence
- **Significant**: someone would change their decision based on
  the answer
- **Bounded**: the scope is feasible given resources

Booth's framework (Craft of Research 2016): turn a topic into a
question by adding "so what?" pressure.

> Topic: AI agents
> Question: How do AI coding agents affect engineer productivity?
> So-what: → If they 2x productivity, hiring strategy changes
> Better question: How does Claude Code adoption affect lines-of-
> code-per-engineer-per-quarter at YC W23 startups?

The research question determines methodology. A descriptive
question ("how many?") wants different methods from a causal
question ("why?") or an exploratory question ("what's
happening here?").

### Pattern 2: Primary vs Secondary vs Tertiary Sources

| Type | Definition | Example |
| --- | --- | --- |
| **Primary** | Original evidence; first-hand observation; the actual study | Original RCT paper; SEC 10-K; raw interview transcripts; original archaeological dig report |
| **Secondary** | Synthesis or commentary on primary sources | Textbook chapter; review article; news article reporting on a study |
| **Tertiary** | Synthesis of secondary sources | Encyclopedia entry; Wikipedia; meta-meta-analysis |

Principal-level discipline: when a claim matters, **trace back
to the primary source**. Secondary sources distort. Common
distortions:

- Numbers misquoted
- Effect sizes inflated
- Caveats dropped
- Sample limitations omitted
- Correlation reported as causation
- Single study reported as "the research shows"

When citing a finding, cite the primary source — not the blog
post that cited the news article that cited the press release
that cited the secondary review that cited the primary.

### Pattern 3: The Evidence Hierarchy

Not all evidence is equal. For causal claims (X causes Y), the
canonical hierarchy (medical context, but the logic
generalises):

1. **Systematic review + meta-analysis** of multiple RCTs
2. **Single well-conducted RCT** with large sample
3. **Quasi-experimental** (regression discontinuity, diff-in-
   diff, instrumental variables, propensity matching)
4. **Cohort study** (observational, longitudinal)
5. **Case-control study**
6. **Cross-sectional / correlational** (observational, point-
   in-time)
7. **Case series / case report**
8. **Expert opinion** (lowest evidentiary weight; testable
   only by experiment)

For descriptive claims (what's happening), the hierarchy is
different: representative survey > convenience-sample survey >
expert interviews > anecdote.

For market sizing, due diligence, competitive analysis: triangulate
across multiple independent sources; flag where they disagree.

### Pattern 4: Method Selection — Quantitative, Qualitative, Mixed

| Method | Strength | When to use |
| --- | --- | --- |
| **Quantitative** (experiments, surveys, regression) | Generalisability, precise effect sizes, replicability | When the construct is measurable + sample is representative |
| **Qualitative** (interviews, ethnography, case studies, focus groups) | Depth, mechanism, unexpected findings, theory generation | When the construct is fuzzy + you need to understand "why" + "how" |
| **Mixed methods** | Both | When the question has descriptive + explanatory parts |

The wrong move: quantitative methods for questions that need
qualitative depth (e.g., asking users to rate satisfaction 1-5
when you don't know what "satisfaction" means to them). Equally
wrong: qualitative methods for questions that need
generalisability (e.g., 12 interviews used to set market
strategy across all customer segments).

Mixed methods (Creswell + Creswell 2023) often: qualitative
first to discover dimensions; quantitative second to measure
prevalence + effect sizes.

### Pattern 5: Literature Review + Systematic Review

A literature review summarises what's known about a topic. A
**systematic review** does so with explicit methodology that
makes it reproducible.

PRISMA 2020 framework (Page et al., BMJ 2021):

1. **Research question** — population / intervention /
   comparison / outcome (PICO) or equivalent
2. **Inclusion + exclusion criteria** — explicit, written
   before searching
3. **Search strategy** — databases, search strings, dates,
   languages
4. **Screening** — title/abstract → full text, with two
   independent reviewers + a third to resolve disagreements
5. **Data extraction** — standardised form
6. **Risk-of-bias assessment** — Cochrane RoB 2 (for RCTs),
   ROBINS-I (for non-randomised), or domain-specific tool
7. **Synthesis** — narrative + meta-analysis where appropriate
8. **PRISMA flow diagram** — n at each stage of screening
9. **Reporting** — PRISMA checklist

For non-medical research, the same discipline applies: explicit
methodology, transparent search, reproducible synthesis.
