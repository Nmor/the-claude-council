# research-methods: Methods and instruments

> Generating the evidence: causal-inference identification strategies, Dillman survey design, and
> interview design + qualitative coding (Patterns 6-8). Pointed at by the "Causal inference, survey
> design, interview design" row of `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 6: Causal Inference Patterns

Correlation ≠ causation. To make a causal claim, you need
either:

1. **Randomised assignment** (RCT) — gold standard
2. **Natural experiment** — quasi-random variation in the
   "treatment" (policy change, weather, lottery)
3. **Instrumental variable** — a third variable that affects
   the treatment but not the outcome except through the
   treatment
4. **Regression discontinuity** — a sharp cut-off creates a
   quasi-randomised comparison around the threshold
5. **Difference-in-differences** — before/after × treatment/
   control comparison; requires parallel trends assumption
6. **Synthetic control** — construct a counterfactual from
   weighted donor pool
7. **Propensity score matching** — match treated vs untreated
   units on observable covariates

Each has assumptions; each can be wrong. Pearl's framework
(causality 2009, *Book of Why* 2018): draw a directed acyclic
graph (DAG) of your assumed causal structure; check whether the
data + identification strategy can recover the causal effect.

The honest move: when you can't identify a causal effect, say
"this is correlational." Don't dress up correlation as
causation.

## Pattern 7: Survey Design — Dillman's Tailored Design Method

The Dillman framework (Dillman + Smyth + Christian 2014) treats
survey response as a social exchange — you ask, the respondent
weighs costs vs benefits of replying. Increase response by
reducing perceived cost + increasing perceived reward + building
trust.

Key principles:

- **Construct validity first**: are you measuring what you
  think you're measuring?
- **Question wording**: avoid double-barrelled, leading,
  ambiguous, jargon-heavy questions
- **Response options**: balanced scales (e.g., 5- or 7-point
  Likert), neutral options when warranted, "don't know"
  available
- **Question order**: easy questions first; sensitive at end;
  demographics at end
- **Multiple touches**: pre-notice → invitation → reminder →
  thank-you
- **Pilot test**: 10-20 cognitive interviews before launch;
  catches ambiguity
- **Mode**: web > phone > mail for cost; phone > web for
  representative samples; mixed-mode for hard-to-reach
  populations
- **Sample size**: power analysis based on the smallest
  effect size you'd care to detect

Response rate is NOT the same as response bias. A 90% response
rate from a non-representative sample is worse than a 30%
response rate from a representative sample. Address both.

## Pattern 8: Interview Design + Qualitative Coding

Semi-structured interviews are the workhorse of qualitative
research. Design:

1. **Sampling strategy** — purposive (chosen to illuminate the
   question), theoretical (chosen to extend emerging theory),
   convenience (cheapest, weakest)
2. **Sample size** — saturation (no new themes after N
   interviews; typically 12-25 for homogeneous samples; more
   for diverse)
3. **Interview guide** — open-ended questions, ordered from
   broad to specific, probes for depth, neutral phrasing
4. **Conduct** — record (with consent), transcribe verbatim,
   listen more than speak, silence is OK
5. **Analysis** — thematic analysis (Braun + Clarke 2006,
   6 phases) or grounded theory (Glaser + Strauss 1967, open
   → axial → selective coding)
6. **Trustworthiness** — Lincoln + Guba: credibility,
   transferability, dependability, confirmability; via member
   checking, peer debriefing, audit trail, thick description

Braun + Clarke thematic analysis 6 phases:

1. Familiarise with the data (read, re-read)
2. Generate initial codes (label data segments)
3. Search for themes (cluster codes)
4. Review themes (do they hold up against all data?)
5. Define + name themes (sharpen)
6. Produce report (with quotes + interpretation)
