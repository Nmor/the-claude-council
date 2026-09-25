# research-methods: When to Fire

> When this skill fires — file-path patterns, keyword triggers, conversation signals, and when it is
> explicitly NOT engaged. Pointed at by the "When this skill fires" row of `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## When to Fire

This skill activates on file patterns, keywords, and project
signals.

**File patterns**:

- `**/research/**`, `**/lit-review*`, `**/literature-review*`
- `**/competitive-analysis*`, `**/market-research*`,
  `**/market-sizing*`
- `**/research-protocol*`, `**/methods.md`, `**/study-design*`
- `**/survey/**`, `**/interview-guide*`, `**/interview-notes*`
- `**/ab-test/**`, `**/experiment-design*`, `**/results.md`
- `**/citations.bib`, `**/references.md`, `**/bibliography*`
- `**/white-papers/**`, `**/policy-brief*`, `**/research-note*`
- `**/data-analysis*`, `**/notebook.ipynb` (if research-context)
- `**/preregistration*`, `**/protocol-v*`, `**/sap-*` (statistical
  analysis plan)

**Keyword triggers**:

- "research", "literature review", "lit review", "review the
  literature"
- "primary source", "secondary source", "tertiary"
- "evidence hierarchy", "level of evidence"
- "systematic review", "meta-analysis", "scoping review"
- "RCT", "randomised controlled trial", "quasi-experiment"
- "survey", "questionnaire", "Likert scale"
- "interview protocol", "coding scheme", "thematic analysis"
- "p-value", "confidence interval", "effect size", "power"
- "causal inference", "DAG", "instrumental variable",
  "regression discontinuity"
- "bias", "selection bias", "response bias", "confirmation
  bias"
- "reproducibility", "replication", "pre-registration"
- "FAIR data", "open science", "open data"
- "citation", "DOI", "BibTeX"
- "IRB", "informed consent", "ethics review"

**Conversation signals**:

- A claim needs supporting evidence
- Two studies appear to contradict each other
- A decision rests on whether a result generalises
- Someone says "the research shows" without specifying which
  research
- A market sizing or competitive analysis is being prepared
- An A/B test result needs interpretation
- A survey is being designed or analysed
- User interviews are being planned or coded
- A white paper / policy brief is being drafted
- A vendor's marketing claim needs verification
- Due diligence on an investment, vendor, or hire is happening

If the work is **opinion-formation** without claim of evidence,
this skill is NOT engaged. It fires when claims of knowledge,
evidence, or fact are being made + need to hold up to scrutiny.
