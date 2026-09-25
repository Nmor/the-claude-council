# research-methods: Bias statistics reproducibility

> Keeping the evidence honest: bias identification + mitigation, statistical inference beyond p <
> 0.05, and reproducibility + replicability (Patterns 9-11). Pointed at by the "Bias, statistical
> inference, reproducibility" row of `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 9: Bias Identification + Mitigation

Every study is biased somewhere. The discipline: name the
biases + mitigate where possible.

| Bias | What it is | Mitigation |
| --- | --- | --- |
| **Selection bias** | Sample doesn't represent the population of interest | Random sampling; stratified sampling; weighting |
| **Response bias** | Who replies differs from who doesn't | High response rate; follow-ups; non-response weighting |
| **Recall bias** | Memory is fallible + biased | Multiple methods; diary studies; near-real-time data capture |
| **Social desirability** | Respondents say what's socially approved | Anonymous responses; indirect questioning; behavioural data |
| **Confirmation bias** | Researcher sees what they expect | Pre-registration; blinded coding; adversarial review |
| **Publication bias** | Positive results published more than null | Pre-registration; trial registries; funnel plots in meta-analysis |
| **Survivorship bias** | Looking only at the survivors | Include cases that failed / dropped out / died |
| **Healthy worker effect** | Studied population is healthier than general | Match on relevant covariates; restrict generalisation |
| **Hawthorne effect** | Subjects change behaviour when observed | Naturalistic observation; longer studies; control group with placebo observation |
| **HARKing** | Hypothesising After Results are Known | Pre-registration; clearly label exploratory vs confirmatory |
| **p-hacking** | Running many tests, reporting only the "significant" ones | Pre-registration; multiple comparison corrections (Bonferroni, FDR); larger samples |

Ioannidis 2005 + the broader replication crisis: most published
findings, especially in fields with small samples + flexible
methods, are false or inflated. Modern principal-level research
takes this seriously.

## Pattern 10: Statistical Inference — Beyond p < 0.05

The p-value answers ONE narrow question: "Assuming the null
hypothesis, what's the probability of seeing data this extreme
or more so?" It does NOT tell you:

- Whether the effect is real
- How large the effect is
- Whether the effect matters
- Whether the result will replicate

Principal-level reporting includes:

- **Effect size** (Cohen's d, odds ratio, regression
  coefficient, relative risk)
- **Confidence interval** (range plausibly consistent with the
  data)
- **Sample size + power** (was there enough data to detect a
  meaningful effect?)
- **Practical significance** (is this big enough to matter?)
- **Replication status** (has this been independently
  replicated?)
- **Pre-registered or exploratory** (was this hypothesised
  before seeing data, or fished out after?)

Multiple comparison corrections (Bonferroni, FDR) when running
many tests. Bayesian inference where appropriate.

## Pattern 11: Reproducibility + Replicability

Two distinct concepts:

- **Reproducibility**: someone else, using your data + code,
  gets your numbers
- **Replicability**: someone else, running their own version of
  your study, gets a similar result

Modern open-science standards (FAIR principles, Open Science
Framework):

- Pre-register the hypothesis + methods + analysis plan BEFORE
  collecting data (osf.io)
- Make code public (GitHub, GitLab)
- Make data public when possible (Zenodo, OSF, domain
  repositories) — respecting privacy + IP
- Use standard data formats + metadata
- Cite using DOIs
- Disclose conflicts of interest
- Disclose funding sources

The replication crisis (psychology 2015, economics ~2016,
biomedicine ongoing) demonstrated that ~50-70% of high-profile
findings don't replicate. Pre-registration + open data are the
strongest mitigations.
