# historical-analysis: Counterfactual analysis

> Core Pattern 8: disciplined counterfactual analysis per Ferguson Virtual History rules. Pointed at
> by the "Counterfactual analysis" row of the SKILL.md routing table.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## 8. Counterfactual analysis (disciplined)

What if Napoleon had won at Waterloo? What if the patent had been filed three months earlier?
Counterfactuals are unavoidable in historical reasoning (any causal claim implies a counterfactual —
"X caused Y" means "without X, Y would not have occurred") but undisciplined counterfactuals become
fantasy. Niall Ferguson's *Virtual History* (1997) rules:

- Counterfactuals must be **plausible at the moment of decision** — not retrofitted from later
  knowledge
- Counterfactuals must hold the wider context **constant** — change one variable, not the world
- Counterfactuals must rest on **evidence about what actors knew + considered** — what alternatives
  were on the table for them
- Counterfactuals are **interpretive tools for assessing causal weight**, not predictions of
  alternative pasts

Engineering: "if we had chosen Postgres instead of MongoDB in 2014" is a useful counterfactual only
with evidence about the 2014 decision context, the alternatives genuinely available then, and the
constraints binding at the time.
