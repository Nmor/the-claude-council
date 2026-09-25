# FP&A Anti-Patterns

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the seven FP&A engineering anti-patterns and the named alternative for each. Pointed at by
the **Anti-patterns** row of the Reference Map in `SKILL.md`.

## Anti-Patterns

### Anti-Pattern 1: SaaS metrics computed three different ways

When ops, finance, and the CEO each have a slightly different NRR number, board meetings descend
into reconciliation. Define every metric ONCE in a metric dictionary; expose it as a view; every
dashboard reads from the same source.

### Anti-Pattern 2: Excel as the system of record

Spreadsheets as the source of truth for budgets, forecasts, headcount plans, board decks. They break
when employee leaves; can't audit; conflict across copies; lose history. Move every persistent FP&A
artefact to versioned database tables OR a purpose-built tool (Mosaic, Pigment, Anaplan, Cube,
Causal, Vena, Adaptive Planning).

### Anti-Pattern 3: Variance commentary written by no-one

A budget vs actual report with 50-line items showing 25% variance on each — and no commentary
explaining WHY — is noise. Finance writes commentary; engineering surfaces material variances
(e.g., > 10% AND > $50K) to a review queue.

### Anti-Pattern 4: Forecast precision without calibration

A forecast accurate to 4 decimal places is comforting but misleading. Hubbard ("How to Measure
Anything") teaches calibrated estimation: provide ranges (e.g., "95% confident MRR ends FY26 between
$14M-$18M") not point estimates. Track forecast accuracy over time; recalibrate the team.

### Anti-Pattern 5: ARR with no definition

"$10M ARR" can mean: end-of-period MRR × 12, sum of annual contract values for active subs,
recognised revenue annualised, billable contract value, signed-not-yet-started contracts included.
Each definition produces a different number. Publish the definition; lock it; deviations become
exceptions, not redefinitions.

### Anti-Pattern 6: Cohort analysis with broken cohorts

If you redefine "cohort start" between reports (e.g., "first invoice" vs "first $500 invoice" vs
"free trial start"), the cohorts shift and prior reports stop matching. Lock the cohort definition;
new definitions create parallel cohorts, not replacements.

### Anti-Pattern 7: Long-range plan that ignores capacity

A 5-year LRP showing $500M ARR at year 5 from a current run-rate of $20M ARR with no plan for
engineering capacity, sales hiring, or platform scaling is fantasy. Ground long-range plans in
driver constraints (sales rep ramp time, engineering hiring + onboarding, platform throughput).
