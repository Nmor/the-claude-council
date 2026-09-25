---
name: fp-and-a
description: Financial Planning & Analysis patterns for engineering teams supporting finance — budget vs actual variance, rolling forecasts, driver-based models, scenario planning, SaaS metrics (ARR, MRR, NRR, CAC, LTV, payback, magic number, Rule of 40), cohort analysis, and the data pipeline patterns that make FP&A self-serve.
---

# FP&A (Financial Planning & Analysis)

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Standards: **AICPA FP&A Maturity Model**, **Beyond Budgeting Roundtable principles (Hope +
> Fraser)**, **OpenSaaS / SaaSGrid / OpenView SaaS Benchmarks**, **Klipfolio + Geckoboard + Looker
> FP&A metric definitions**, **Statistical foundations (NIST/SEMATECH e-Handbook of Statistical
> Methods)**, **Monte Carlo / scenario analysis (Hubbard "How to Measure Anything")**, **AFP
> (Association for Financial Professionals) FP&A certification body of knowledge**.

## Purpose

Financial Planning & Analysis (FP&A) turns the static historical accounting record into
forward-looking business intelligence: budgets, forecasts, variance analysis, scenarios, what-if
modelling, and the SaaS / commerce / fintech metrics boards and investors actually care about.
Finance owns the analysis; engineering owns the pipelines, the data models, and the self-serve
tooling that lets the FP&A team work at speed.

This skill teaches the engineering patterns for FP&A: budget vs actuals tables, rolling 13-week cash
forecasts, driver-based models (revenue × take rate, headcount × loaded cost), scenario branches,
the canonical SaaS metric definitions (ARR / MRR with all the edge cases — upgrades, downgrades,
churn, contraction, expansion), cohort retention curves, CAC / payback / LTV, and the warehouse + BI
patterns that turn the general ledger plus operational data into Tableau / Looker / Hex / Sigma
dashboards finance can actually use.

Without good FP&A engineering, finance spends 80% of its time wrangling spreadsheets and 20% on
analysis. With good FP&A engineering, finance spends 80% on analysis and 20% on edge cases — and the
board sees decisions made on data that updates daily, not quarterly.

## Standards Cited

- **Beyond Budgeting Roundtable** — 12 principles for adaptive performance management (Hope &
  Fraser, 2003)
- **AICPA FP&A Maturity Model** — 5 levels from reactive to predictive
- **AFP FP&A Certification Body of Knowledge** — formal FP&A discipline
- **OpenView SaaS Benchmarks Report** (annual) — public SaaS metric distributions
- **SaaS Capital Index Benchmarks** — for B2B SaaS valuation drivers
- **Bessemer Cloud Index** — public SaaS company comparables
- **Bessemer State of the Cloud** (annual) — Cloud 100 metric definitions
- **Rule of 40** — Brad Feld + KPCB (growth rate + EBITDA margin ≥ 40)
- **SaaS Magic Number** — Lars Leckie / Scale Venture Partners (S&M ROI metric)
- **Cohort Retention Methodology** — Bain & Co / Fred Reichheld
- **Hubbard "How to Measure Anything"** — calibrated estimation + Monte Carlo
- **NIST/SEMATECH e-Handbook of Statistical Methods** — forecasting + control charts

## When to Fire

- Setting up budget vs actual reporting
- Building a rolling forecast pipeline (typically 12-24 months, refreshed monthly)
- Implementing a driver-based model
- Reporting SaaS metrics (ARR, MRR, NRR, GRR, CAC, LTV, payback, magic number)
- Cohort analysis (retention, expansion, LTV by cohort)
- Building a 13-week cash forecast for treasury
- Scenario planning (base / upside / downside; what-if questions from board / investors)
- Department-level expense tracking and variance
- Headcount planning + loaded cost modelling
- Sales pipeline-to-revenue conversion modelling
- ARR roll-forward (new + expansion - churn - contraction)
- KPI dashboard for executive team or board
- Investor / lender / acquirer due diligence data room preparation
- Capital allocation decisions (R&D vs S&M vs G&A trade-offs)
- Long-range plan (3-5 year) for strategic planning
- Cross-functional cost allocation (cloud cost to product line)
- Treasury management and working capital optimisation

## Reference Map

This skill uses progressive disclosure: the routing table below is what loads when the `paths:`
globs match. Read the reference file for the topic you are working on — each one holds its section
of the original skill verbatim (schema, SQL, TypeScript, standards and anti-patterns unchanged).

| Topic | Read this | Holds |
| --- | --- | --- |
| Budget vs actual variance | `references/budget-variance.md` | Pattern 1 — `budget_versions` / `budget_lines` schema, the `budget_vs_actual` view, variance-commentary ownership |
| SaaS metrics, roll-forward, cohorts | `references/saas-metrics.md` | Patterns 2-4 — the canonical metric dictionary (MRR, ARR, NRR, GRR, CAC, LTV, payback, magic number, Rule of 40, burn multiple, quick ratio), the MRR roll-forward SQL, cohort retention curves |
| Driver-based forecast, 13-week cash, scenarios | `references/forecasting-and-scenarios.md` | Patterns 5-7 — driver-based forecast engine, the 13-week treasury cash view, scenario branching (base / upside / downside) |
| Anti-patterns | `references/anti-patterns.md` | All seven FP&A anti-patterns with their named alternatives |
| Verification checklist | `references/verification-and-compliance.md` | The 21-row green/red checklist |
| Compliance mapping | `references/verification-and-compliance.md` | IFRS / US GAAP / SOX / ISO 27001 / NIST 800-53 / OWASP ASVS / PCI-DSS / CFA / CWE mapping |
| Rationale | `references/rationale-and-learning.md` | Why this skill exists; the behaviour shift it enables |
| Learning hooks | `references/rationale-and-learning.md` | Signals to watch + refinement candidates |

## Cross-References

- `~/.claude/skills/bookkeeping-patterns/SKILL.md` — the ledger this builds on
- `~/.claude/skills/ifrs-gaap-reporting/SKILL.md` — financial statements feed budget vs actual
- `~/.claude/skills/clickhouse-io/SKILL.md` — warehouse for cohort + metric queries
- `~/.claude/skills/postgres-patterns/SKILL.md` — operational stores for budget tables
- `~/.claude/rules-library/common/observability.md` — KPI dashboards are observability
- `~/.claude/rules-library/common/data-retention.md` — board-deck data retention
- Council Division 10 (Finance & FinOps) — auto-engages on FP&A engineering
- Council Division 12 (Strategy & Innovation) — uses FP&A scenarios
- OpenView SaaS Benchmarks (annual report)
- Bessemer State of the Cloud (annual)
- SaaS Capital Index Benchmarks
