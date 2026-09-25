# Rationale and Learning Hooks

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers why this skill exists (the failure mode it prevents, the behaviour shift it enables) and the
continuous-learning signals + refinement candidates for maintaining it. Pointed at by the
**Rationale** and **Learning hooks** rows of the Reference Map in `SKILL.md`.

## Why This Skill Exists

FP&A is where finance translates the static historical record into forward-looking decisions. Boards
approve budgets based on FP&A models. Investors fund growth based on FP&A projections. Executives
reallocate capital based on FP&A scenarios. The quality of FP&A directly affects the quality of the
company's strategic decisions.

The economic case for engineering investment in FP&A: a finance team supported by good engineering
produces better analysis in less time, frees finance to be strategic instead of operational, and
reduces the audit-prep cycle dramatically. The cost is moderate — typically a data warehouse, a BI
tool, integration with the GL + HRIS + CRM + billing system, and the discipline of metric
definition. The benefit is finance-as-business-partner instead of finance-as-spreadsheet-jockey.

The behaviour shift this skill enables: when the board asks "what happens if we close 3 fewer
enterprise deals?", the answer is the downside scenario already modelled, with the cascade through
MRR / cash / hiring already computed. When a department head asks "are we tracking to budget?", the
answer is the live dashboard, not a finance request. When the CEO asks "what's our Rule of 40?", the
answer matches what finance reports to investors, computed the same way, against the same ledger.

Engineering teams that build this well unlock finance as a multiplier. Engineering teams that don't
leave finance to manual Excel work, slowing every business decision, and making the company react
slower than competitors. The patterns here — variance schema, MRR roll-forward, cohort triangle,
driver-based forecast, 13-week cash, scenario branching — are the canonical FP&A engineering set.
They're stable across SaaS companies, across stages, across geographies, and across most exit
outcomes (IPO, strategic acquisition, PE recap). Build them once, reuse them forever.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- ARR / MRR computed differently across engineering and finance (definition drift)
- Cohort triangle recomputed from raw events ad-hoc instead of materialised view
- Budget vs actual variance manual in Excel instead of automated against GL
- Driver-based forecast missing drivers (revenue forecast without conversion-rate driver)
- 13-week cash forecast not refreshed weekly
- Scenario model not version-controlled (loses provenance + assumption history)
- LTV / CAC computed without cohort discipline (averages across heterogeneous cohorts)
- Rule of 40 / Magic Number / Payback Period missing from board reporting
- Net Revenue Retention (NRR) calculated on stale customer-segment definitions
- Forecast model not back-tested against prior-period actuals (calibration gap)

**Refinement candidates**:

- New metric row when SaaS measurement landscape evolves (e.g., new NRR variants)
- New cross-reference when a sister skill (bookkeeping-patterns, ifrs-gaap-reporting,
  valuation-models, financial-analyst) adds an FP&A gate
- New scenario template when a recurring business question emerges
- Tightening of the metric-definition discipline when engineering/finance drift recurs
