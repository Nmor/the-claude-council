# research-methods: Anti-Patterns

> The fifteen research anti-patterns and their named corrections — from Google-Scholar
> cherry-picking to conflating statistical with practical significance. Pointed at by the
> "Anti-patterns" row of `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Anti-Patterns

### Anti-Pattern 1: Google-Scholar Cherry Pick

Googling a topic, reading the first 3 results that confirm what
you already believe, and writing them up as "the research."
Misses the actual evidence base; entrenches confirmation bias.

**Correction**: systematic search across multiple databases
(Google Scholar, Web of Science, Scopus, PubMed if relevant);
inclusion / exclusion criteria written before searching;
disconfirming evidence actively sought.

### Anti-Pattern 2: Tertiary-Source Citation

Citing a Wikipedia entry, a textbook summary, or a blog post
as if it were primary evidence. Wikipedia is great for
orientation; don't cite it.

**Correction**: trace to the primary source. Read it. Cite
it. If the primary source isn't accessible, name the secondary
source explicitly + note you're citing secondhand.

### Anti-Pattern 3: Confusing Correlation with Causation

"Coffee drinkers have lower mortality" → "drink coffee for
longer life." Probably wrong: confounding (coffee drinkers may
be wealthier, healthier, more social). The correlation is real;
the causal claim is unsupported.

**Correction**: state correlations as correlations. For causal
claims, require explicit causal identification (RCT, natural
experiment, IV, etc.).

### Anti-Pattern 4: Sample-Size Theatre

Reporting "n = 12 interviews" or "n = 5,000 survey responses"
without addressing whether the sample is representative or
whether the sample size is adequate to detect meaningful
effects.

**Correction**: justify the sample. For interviews: theoretical
saturation. For surveys: power analysis. For experiments: pre-
registered power calculation.

### Anti-Pattern 5: HARKing — Hypothesising After Results Known

Running many analyses, finding a "significant" one, and writing
the paper as if you'd predicted it. Inflates apparent rigor;
makes findings unreplicable.

**Correction**: pre-register hypotheses. Distinguish
confirmatory from exploratory analyses explicitly. Report ALL
analyses run.

### Anti-Pattern 6: p < 0.05 as Truth

Treating any p-value below 0.05 as "the effect is real" and any
p-value above as "no effect." Neither is correct. p-values are
probability statements under the null; they don't establish
truth.

**Correction**: report effect sizes + confidence intervals.
Interpret in context of prior evidence, sample size, study
quality, replication status. Don't dichotomise.

### Anti-Pattern 7: Single-Study Salvation

Finding one paper that supports your position + presenting it
as proven. Single studies rarely establish anything; they
contribute evidence.

**Correction**: review the evidence base. Are there
replications? Meta-analyses? Are findings consistent across
studies? If a single study, how strong is it (sample, method,
risk of bias)?

### Anti-Pattern 8: Expert-Opinion as Evidence

"Andreessen says AI agents will replace engineers" presented
as evidence. Expert opinion is the lowest tier of the evidence
hierarchy for a reason — experts are biased, motivated, and
often wrong on predictions outside their specific domain.

**Correction**: cite expert opinion as opinion. For factual
claims, find primary evidence. For predictions, cite track
record.

### Anti-Pattern 9: Selection Bias in User Research

Interviewing 12 of your most engaged power users + generalising
to all users. The signal you're getting reflects the
engagement-biased sample.

**Correction**: explicit sampling strategy. Recruit across
segments. Acknowledge limitations of the sample in the writeup.

### Anti-Pattern 10: Confirmation Bias

Reading evidence with the hope of confirming your prior +
discounting evidence against it. Cognitively automatic; requires
active discipline to counter.

**Correction**: explicitly seek disconfirming evidence. Ask
"what would change my mind?" before researching + look for that
evidence. Have an adversarial reviewer.

### Anti-Pattern 11: Survivorship Bias

Studying successful startups to learn what makes startups
successful, without studying failed ones. The "lessons" reflect
selection — you're studying winners + can't tell what's causal.

**Correction**: include the failed cases. Match on baseline
characteristics. Acknowledge survivor selection.

### Anti-Pattern 12: Researcher-as-Activist

Conducting research to support a foregone conclusion. The
methodology bends to produce the desired answer; even when
honestly intended, the result is unreliable.

**Correction**: separate advocacy from research. Pre-register.
Submit to adversarial review. Report findings even when they
don't support your preferred narrative.

### Anti-Pattern 13: Stale Sources

Citing decades-old research on a topic where the field has
moved. Especially common in fast-moving areas (technology,
medicine).

**Correction**: check publication dates. Look for more recent
reviews. Note when foundational vs current.

### Anti-Pattern 14: Citation Without Reading

Citing a paper based on its abstract or title (or based on
someone else's citation). Often the cited paper says something
different from what's claimed.

**Correction**: read what you cite. At least skim the actual
paper, not just the abstract. Especially when the citation is
load-bearing.

### Anti-Pattern 15: Conflation of Statistical with Practical

Significance

A p-value of 0.001 with an effect size of 0.001% is
"statistically significant" but irrelevant. The opposite — a
large effect with a wide confidence interval — may matter even
if not "significant."

**Correction**: always report + interpret effect size + its
confidence interval + its practical importance.
