---
name: research-methods
description: Principal-level research methodology — primary vs secondary sources, quantitative + qualitative + mixed methods, literature review, evidence hierarchies, experimental design, survey + interview craft, bias identification, statistical inference, reproducibility, citation discipline, and the discipline that separates "I read some articles" from "I produced load-bearing evidence that supports a real decision".
---

# Research Methods

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Auto-fires on: literature reviews, market sizing studies, competitive analysis, user research
> design, A/B test design + analysis, survey design + analysis, interview protocol design + coding,
> primary source research, due diligence research, vendor evaluation research, hypothesis testing,
> regression + causal inference, experimental design, meta-analysis, systematic review, academic
> paper writing, evidence-grading conversations, research-vs-opinion debates, citation management
> work, white-paper drafting, policy briefs, briefs for legal / compliance / regulatory work. Sister
> to `ux-research` (specific generative + evaluative user research), `investment-research`
> (sell-side / buy-side equity research), `investor-due-diligence` (private investment + M&A
> research), `historical-analysis` (longitudinal + archival), `provider-research` (external
> integration), `prompt-improver` (the discovery phase). Standards: Booth + Colomb + Williams
> 1995/2016, Creswell + Creswell 1994/2023, Maxwell 1996/2013, Yin 1984/2017, Babbie 1973/2024,
> Cochrane Handbook 2008/2023, PRISMA 2020, OECD Frascati Manual 2015, ICMJE 2019, Ioannidis 2005,
> Open Science Framework, RDA + FAIR Principles.

## Purpose

Research is the disciplined production of new knowledge or
verified evidence that supports a decision. It sits between
"opinion" and "data": opinions are unsupported beliefs;
research is belief with explicit grounding in evidence,
methodology, and source citation.

Most people "research" by Googling for a few minutes, reading
2-3 articles, and assembling a position. Principal-level
research is structurally different: it begins with an explicit
**question**, distinguishes **primary** from **secondary**
sources, picks methods (quantitative / qualitative / mixed)
fit for the question, manages **bias**, **reproducibility**,
and **citation discipline**, and produces evidence that someone
else could re-derive or extend.

This skill provides:

1. The research question — what makes a good one
2. Primary vs secondary sources + the evidence hierarchy
3. Method selection: quantitative, qualitative, mixed
4. Literature review + systematic review methodology
5. Experimental design + causal inference patterns
6. Survey design (Dillman tailored design method)
7. Interview design + qualitative coding (Braun + Clarke
   thematic analysis, grounded theory)
8. Bias identification (selection, response, confirmation,
   publication, survivorship, recall)
9. Statistical inference + p-values + confidence intervals
   - effect sizes
10. Reproducibility + replicability + FAIR data
11. Citation + reference management discipline
12. Research ethics (IRB, informed consent, data privacy)

It does NOT cover the substance of any specific domain — that's
the role of domain skills. Research is the cross-cutting
discipline of how you know what you know.

## What lives where

This file is the routing table. The detail lives in `references/`; open the
row that matches the work rather than carrying all of it.

| Topic | Read |
| --- | --- |
| When this skill fires — file-path globs, keyword triggers, conversation signals, and when it is explicitly NOT engaged | [`references/triggers.md`](references/triggers.md) |
| Research question, primary vs secondary vs tertiary sources, evidence hierarchy, quantitative / qualitative / mixed method selection, literature + systematic review (PRISMA 2020) — Patterns 1-5 | [`references/design-and-evidence.md`](references/design-and-evidence.md) |
| Causal inference (RCT, natural experiment, IV, RDD, diff-in-diff, synthetic control, propensity matching, DAGs), Dillman survey design, interview design + qualitative coding (Braun + Clarke, grounded theory) — Patterns 6-8 | [`references/methods-and-instruments.md`](references/methods-and-instruments.md) |
| Bias identification + mitigation table, statistical inference beyond p < 0.05 (effect size, CI, power, practical significance), reproducibility + replicability + FAIR — Patterns 9-11 | [`references/bias-statistics-reproducibility.md`](references/bias-statistics-reproducibility.md) |
| Citation + reference management discipline, research ethics (Belmont, Helsinki, IRB, informed consent), triangulation — Patterns 12-14 | [`references/citation-ethics-triangulation.md`](references/citation-ethics-triangulation.md) |
| The fifteen anti-patterns + their named corrections | [`references/anti-patterns.md`](references/anti-patterns.md) |
| The verification checklist run before declaring research principal-level | [`references/verification-checklist.md`](references/verification-checklist.md) |
| Full standards catalogue — editions, ISBNs, section numbers | [`references/standards.md`](references/standards.md) |
| Why this skill exists — the cost of bad research, the situations that fire it | [`references/why-this-skill-exists.md`](references/why-this-skill-exists.md) |

## Standards Cited

The catalogue with editions, ISBNs and section numbers is in
[`references/standards.md`](references/standards.md). Which family lives there:

- **Research design + methods** — Booth + Colomb + Williams 2016, Creswell +
  Creswell 2023, Maxwell 2013, Yin 2017, Babbie 2024, Glaser + Strauss 1967,
  Braun + Clarke 2006, Strauss + Corbin 2014, Dillman + Smyth + Christian 2014.
- **Statistics + causal inference** — Gelman + Hill 2007 / 2020, Pearl 2009 +
  2018, Angrist + Pischke 2008 + 2014, Fisher 1935, Box + Hunter + Hunter 2005.
- **Evidence synthesis** — Cochrane Handbook 6.4 (2023), PRISMA 2020 (BMJ
  2021;372:n71), Petticrew + Roberts 2006, GRADE.
- **Bias + replication** — Ioannidis 2005, Open Science Collaboration 2015,
  the Wansink case.
- **Ethics + integrity** — Belmont Report 1979, Declaration of Helsinki (WMA
  1964, amended 2013), ICMJE 2019.
- **Data + reproducibility** — FAIR Principles (Wilkinson et al. 2016), Open
  Science Framework, OECD Frascati Manual 2015.
- **Reporting + documentation** — ISO 690:2021, APA 7th, Chicago 17th, IMRaD
  (ISO 215:1986), ISO/IEC/IEEE 26515:2018, ISO/IEC 25012:2008, ISO/IEC
  27037:2012, Diátaxis.
- **Cross-cutting overlays** — NIST SP 800-92, NIST SP 800-160 Vol 1, OWASP
  ASVS 4.0.3 §V7.1, W3C ACT, W3C WAI Research Methods, ISO 9241-210:2019,
  CWE-1059, CWE-1295, CWE-1426.

## Anti-Patterns

Fifteen of them, each with its named correction, in
[`references/anti-patterns.md`](references/anti-patterns.md): Google-Scholar
cherry pick · tertiary-source citation · correlation-as-causation ·
sample-size theatre · HARKing · p < 0.05 as truth · single-study salvation ·
expert-opinion as evidence · selection bias in user research · confirmation
bias · survivorship bias · researcher-as-activist · stale sources · citation
without reading · statistical conflated with practical significance.

## Cross-References

- **`ux-research`** — specific generative + evaluative
  user research methodology (this skill covers the broader
  research craft).
- **`investment-research`** — sell-side / buy-side equity
  research; analyst methodology.
- **`investor-due-diligence`** — private investment + M&A
  diligence methodology.
- **`historical-analysis`** — longitudinal + archival research
  patterns.
- **`provider-research`** — primary-source provider
  documentation discipline for integrations.
- **`prompt-improver`** — research-discovery phase of vague
  prompts.
- **`task-intake-due-diligence`** — the 29-question intake
  applies research discipline to every task.
- **`design-thinking`** — research informs empathy + define
  phases.
- **`communication-patterns`** — research findings must be
  communicated effectively; Pyramid Principle + SCQA apply.
- **`statistics-foundations`** — when authored, deeper
  coverage of inference, regression, causal estimation.
- **`data-analysis-patterns`** — when authored, applied
  analytics patterns.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Claims made without primary-source citation (secondary / tertiary substitution — evidence
  hierarchy weakening)
- Sample drawn without documented sampling frame (convenience sampling masquerading as
  representative)
- p-value cited without effect size + confidence interval (statistical-significance theatre)
- Qualitative research without coding rubric / inter-rater reliability (researcher-bias gateway)
- Literature review skipped before primary research (replication / prior-art waste)
- Pre-registration absent for confirmatory studies (HARKing — hypothesising after results known)
- FAIR principles ignored on data outputs (findable / accessible / interoperable / reusable gaps)
- Author / funder / institution conflicts of interest undisclosed

**Refinement candidates**:

- New method row when a recurring research class (e.g., A/B tests, user-interview studies, market
  sizing) needs codified protocol
- Update to evidence hierarchy when a domain (e.g., ML, behavioural econ, epidemiology) shifts what
  counts as gold-standard
- Bias-identification additions when a recurring blind spot surfaces in post-study reviews
- Reproducibility-template additions (notebook + data + code archive standards) as tooling evolves
