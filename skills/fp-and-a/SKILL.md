---
name: fp-and-a
description: Financial Planning & Analysis patterns for engineering teams supporting finance — budget vs actual variance, rolling forecasts, driver-based models, scenario planning, SaaS metrics (ARR, MRR, NRR, CAC, LTV, payback, magic number, Rule of 40), cohort analysis, and the data pipeline patterns that make FP&A self-serve.
---

# FP&A (Financial Planning & Analysis)

> Standards: **AICPA FP&A Maturity Model**, **Beyond Budgeting Roundtable principles (Hope + Fraser)**, **OpenSaaS / SaaSGrid / OpenView SaaS Benchmarks**, **Klipfolio + Geckoboard + Looker FP&A metric definitions**, **Statistical foundations (NIST/SEMATECH e-Handbook of Statistical Methods)**, **Monte Carlo / scenario analysis (Hubbard "How to Measure Anything")**, **AFP (Association for Financial Professionals) FP&A certification body of knowledge**.

## Purpose

Financial Planning & Analysis (FP&A) turns the static historical accounting record into forward-looking business intelligence: budgets, forecasts, variance analysis, scenarios, what-if modelling, and the SaaS / commerce / fintech metrics boards and investors actually care about. Finance owns the analysis; engineering owns the pipelines, the data models, and the self-serve tooling that lets the FP&A team work at speed.

This skill teaches the engineering patterns for FP&A: budget vs actuals tables, rolling 13-week cash forecasts, driver-based models (revenue × take rate, headcount × loaded cost), scenario branches, the canonical SaaS metric definitions (ARR / MRR with all the edge cases — upgrades, downgrades, churn, contraction, expansion), cohort retention curves, CAC / payback / LTV, and the warehouse + BI patterns that turn the general ledger plus operational data into Tableau / Looker / Hex / Sigma dashboards finance can actually use.

Without good FP&A engineering, finance spends 80% of its time wrangling spreadsheets and 20% on analysis. With good FP&A engineering, finance spends 80% on analysis and 20% on edge cases — and the board sees decisions made on data that updates daily, not quarterly.

## Standards Cited

- **Beyond Budgeting Roundtable** — 12 principles for adaptive performance management (Hope & Fraser, 2003)
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

## Core Patterns

### Pattern 1: Budget vs actual variance schema

The foundational FP&A artefact. Schema:

```sql
CREATE TABLE budget_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,                   -- e.g., 'FY26 Annual Plan'
    fiscal_year     INTEGER NOT NULL,
    version_type    TEXT NOT NULL CHECK (version_type IN ('annual_plan', 'forecast', 'reforecast', 'long_range')),
    status          TEXT NOT NULL CHECK (status IN ('draft', 'locked', 'archived')),
    locked_at       TIMESTAMPTZ,
    locked_by       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(name, fiscal_year, version_type)
);

CREATE TABLE budget_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_version_id UUID NOT NULL REFERENCES budget_versions(id),
    account_code    TEXT NOT NULL,                   -- maps to ledger account
    department      TEXT NOT NULL,                   -- e.g., 'engineering', 'sales', 'marketing'
    cost_center     TEXT,                            -- finer cut, e.g., 'engineering-platform'
    period          TEXT NOT NULL,                   -- e.g., '2026-05' for May 2026
    amount_minor    BIGINT NOT NULL,
    currency        TEXT NOT NULL,
    driver          TEXT,                            -- e.g., 'headcount', 'arr', 'fixed'
    driver_value    NUMERIC,                         -- the underlying assumption
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated variance view
CREATE VIEW budget_vs_actual AS
SELECT
    bl.budget_version_id,
    bl.account_code,
    bl.department,
    bl.cost_center,
    bl.period,
    bl.amount_minor AS budget_minor,
    COALESCE(actuals.amount_minor, 0) AS actual_minor,
    COALESCE(actuals.amount_minor, 0) - bl.amount_minor AS variance_minor,
    CASE
        WHEN bl.amount_minor = 0 THEN NULL
        ELSE 100.0 * (COALESCE(actuals.amount_minor, 0) - bl.amount_minor) / bl.amount_minor
    END AS variance_pct,
    bl.currency
FROM budget_lines bl
LEFT JOIN (
    SELECT
        a.code AS account_code,
        le.metadata->>'department' AS department,
        le.metadata->>'cost_center' AS cost_center,
        j.period,
        SUM(CASE WHEN a.normal_balance = 'debit' THEN le.debit_minor - le.credit_minor
                 ELSE le.credit_minor - le.debit_minor END) AS amount_minor,
        le.currency
    FROM ledger_entries le
    JOIN journals j ON le.journal_id = j.id
    JOIN accounts a ON le.account_id = a.id
    GROUP BY a.code, le.metadata->>'department', le.metadata->>'cost_center', j.period, le.currency
) actuals ON actuals.account_code = bl.account_code
          AND actuals.department = bl.department
          AND actuals.period = bl.period
          AND actuals.currency = bl.currency;
```

Variance commentary (the WHY behind the gap) is captured separately by finance — engineering provides the data, finance writes the narrative.

### Pattern 2: SaaS metric definitions (the canonical set)

The metrics that recur across every B2B SaaS board deck:

| Metric | Definition | Formula |
| --- | --- | --- |
| **MRR (Monthly Recurring Revenue)** | Normalised monthly subscription revenue | sum of (annual contract / 12) for active subscriptions |
| **ARR (Annual Recurring Revenue)** | MRR × 12 OR annualised at point-in-time | MRR × 12, or sum of annual contract values |
| **New MRR** | MRR from net-new customers this period | sum of MRR from customers with first invoice in period |
| **Expansion MRR** | Existing customers upgraded | (this period MRR for cohort) − (prior period MRR for same cohort) for upgrades |
| **Contraction MRR** | Existing customers downgraded | similar, negative direction |
| **Churned MRR** | Lost customers' MRR | sum of MRR of customers who cancelled in period |
| **Net New MRR** | Net change in MRR | New + Expansion − Contraction − Churned |
| **GRR (Gross Revenue Retention)** | Retention before upsell | (Prior MRR − Churn − Contraction) / Prior MRR |
| **NRR (Net Revenue Retention)** | Retention with upsell | (Prior MRR − Churn − Contraction + Expansion) / Prior MRR |
| **CAC (Customer Acquisition Cost)** | Cost to acquire one customer | Total S&M expense / new customers acquired |
| **LTV (Customer Lifetime Value)** | Total value of a customer over their lifetime | ARPU × Gross Margin × (1 / Churn rate) |
| **LTV:CAC ratio** | Efficiency of acquisition | LTV / CAC; > 3:1 healthy |
| **CAC Payback** | Months to recover CAC | CAC / (Monthly gross margin per customer) |
| **Magic Number** | Sales efficiency | (New ARR this quarter × 4) / S&M spend prior quarter; > 1.0 healthy |
| **Rule of 40** | Combined growth + profitability | Growth rate % + EBITDA margin %; ≥ 40 healthy |
| **Burn Multiple** | Cash burn efficiency | Net burn / Net new ARR; < 1.0 best-in-class |
| **Quick Ratio** | Growth efficiency | (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR); > 4 healthy |

Every metric MUST be defined with rigour. The most common dispute in board meetings: "our NRR is 130%" — but did you include expansion at renewal price increases? Did you measure cohort-based or company-aggregate?

### Pattern 3: MRR roll-forward (the canonical SaaS report)

The MRR / ARR roll-forward is the single most-scrutinised SaaS chart:

```sql
-- For each period, decompose MRR change
WITH period_subscriptions AS (
    SELECT
        s.customer_id,
        s.mrr_minor,
        s.period,
        s.status  -- 'active', 'cancelled', 'paused'
    FROM subscription_snapshots s
    WHERE s.period = '2026-05'
),
prior_period_subscriptions AS (
    SELECT
        s.customer_id,
        s.mrr_minor AS prior_mrr_minor,
        s.status AS prior_status
    FROM subscription_snapshots s
    WHERE s.period = '2026-04'
),
joined AS (
    SELECT
        COALESCE(p.customer_id, pp.customer_id) AS customer_id,
        COALESCE(p.mrr_minor, 0) AS current_mrr,
        COALESCE(pp.prior_mrr_minor, 0) AS prior_mrr,
        p.status,
        pp.prior_status
    FROM period_subscriptions p
    FULL OUTER JOIN prior_period_subscriptions pp ON p.customer_id = pp.customer_id
)
SELECT
    -- New: customer not in prior period; active this period
    SUM(CASE WHEN prior_mrr = 0 AND current_mrr > 0 THEN current_mrr ELSE 0 END) AS new_mrr,
    -- Expansion: existing customer; MRR increased
    SUM(CASE WHEN prior_mrr > 0 AND current_mrr > prior_mrr THEN current_mrr - prior_mrr ELSE 0 END) AS expansion_mrr,
    -- Contraction: existing customer; MRR decreased but still active
    SUM(CASE WHEN prior_mrr > 0 AND current_mrr > 0 AND current_mrr < prior_mrr THEN prior_mrr - current_mrr ELSE 0 END) AS contraction_mrr,
    -- Churn: customer was active in prior; not active this period
    SUM(CASE WHEN prior_mrr > 0 AND (current_mrr = 0 OR status = 'cancelled') THEN prior_mrr ELSE 0 END) AS churned_mrr,
    -- Reactivation: prior status cancelled; current active
    SUM(CASE WHEN prior_status = 'cancelled' AND current_mrr > 0 THEN current_mrr ELSE 0 END) AS reactivation_mrr
FROM joined;
```

The chart finance presents: opening MRR + new + expansion + reactivation − contraction − churn = ending MRR. Every dollar of MRR change has a category.

### Pattern 4: Cohort retention curves

Cohort analysis groups customers by their start month and tracks retention over time:

```sql
WITH cohort_assignment AS (
    SELECT
        c.id AS customer_id,
        DATE_TRUNC('month', c.first_paid_at) AS cohort_month
    FROM customers c
    WHERE c.first_paid_at IS NOT NULL
),
cohort_revenue AS (
    SELECT
        ca.cohort_month,
        DATE_TRUNC('month', s.period::date) AS active_month,
        COUNT(DISTINCT ca.customer_id) AS customers,
        SUM(s.mrr_minor) AS mrr_minor
    FROM cohort_assignment ca
    JOIN subscription_snapshots s ON s.customer_id = ca.customer_id
    WHERE s.mrr_minor > 0
    GROUP BY ca.cohort_month, DATE_TRUNC('month', s.period::date)
),
cohort_initial AS (
    SELECT
        cohort_month,
        SUM(mrr_minor) AS initial_mrr
    FROM cohort_revenue
    WHERE active_month = cohort_month
    GROUP BY cohort_month
)
SELECT
    cr.cohort_month,
    cr.active_month,
    (cr.active_month - cr.cohort_month) AS months_since_start,
    cr.customers,
    cr.mrr_minor,
    ROUND(100.0 * cr.mrr_minor / NULLIF(ci.initial_mrr, 0), 2) AS retention_pct
FROM cohort_revenue cr
JOIN cohort_initial ci ON cr.cohort_month = ci.cohort_month
ORDER BY cr.cohort_month, cr.active_month;
```

The output renders as a triangular heatmap (cohort month on Y, months-since-start on X). The shape reveals whether cohorts are improving / worsening over time and whether expansion eventually exceeds churn (NRR > 100%).

### Pattern 5: Driver-based forecast

Driver-based models tie expense to a business driver (headcount, ARR, transactions), making forecasts auto-update when drivers change:

```typescript
interface Driver {
  name: string;
  values: Record<string, number>;  // period -> value
}

interface ForecastLine {
  account_code: string;
  department: string;
  formula: (drivers: Record<string, number>, period: string) => bigint;
  description: string;
}

const drivers: Driver[] = [
  { name: 'headcount_engineering', values: { '2026-05': 50, '2026-06': 53, '2026-07': 56 } },
  { name: 'headcount_sales', values: { '2026-05': 20, '2026-06': 22, '2026-07': 24 } },
  { name: 'arr_minor', values: { '2026-05': 12_000_000_00n, '2026-06': 13_000_000_00n } },
  { name: 'aws_per_employee_minor', values: { '2026-05': 800_00, '2026-06': 800_00 } },
];

const forecastLines: ForecastLine[] = [
  {
    account_code: '6010',  // Engineering salaries
    department: 'engineering',
    formula: (d) => BigInt(d.headcount_engineering) * 17_000_00n,  // $170k loaded cost
    description: 'Engineering salaries: headcount × $170k loaded',
  },
  {
    account_code: '5020',  // Hosting
    department: 'engineering',
    formula: (d) => BigInt(d.headcount_engineering) * BigInt(d.aws_per_employee_minor),
    description: 'AWS hosting: $800/engineer/month',
  },
  {
    account_code: '6100',  // S&M
    department: 'sales',
    formula: (d) => BigInt(d.headcount_sales) * 25_000_00n,  // $250k OTE
    description: 'Sales OTE: headcount × $250k',
  },
];

async function generateForecast(periods: string[]): Promise<BudgetLine[]> {
  const lines: BudgetLine[] = [];
  for (const period of periods) {
    const driverValues: Record<string, number> = {};
    for (const d of drivers) {
      driverValues[d.name] = d.values[period] ?? interpolate(d.values, period);
    }
    for (const line of forecastLines) {
      lines.push({
        budget_version_id: 'forecast-202607-v1',
        account_code: line.account_code,
        department: line.department,
        period,
        amount_minor: line.formula(driverValues, period),
        currency: 'USD',
        driver: line.description,
      });
    }
  }
  return lines;
}
```

Now when finance updates a driver assumption (headcount +5 in Q3), every dependent expense recomputes automatically — no Excel chains to maintain.

### Pattern 6: 13-week cash forecast (treasury)

Short-horizon cash forecast at weekly granularity:

```sql
CREATE VIEW cash_forecast_13_week AS
WITH weeks AS (
    SELECT generate_series(
        DATE_TRUNC('week', CURRENT_DATE),
        DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '12 weeks',
        INTERVAL '1 week'
    )::date AS week_start
),
expected_collections AS (
    SELECT
        DATE_TRUNC('week', i.expected_payment_date)::date AS week_start,
        SUM(i.amount_minor) AS amount_minor
    FROM invoices i
    WHERE i.status IN ('sent', 'overdue')
      AND i.expected_payment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '13 weeks'
    GROUP BY 1
),
scheduled_payments AS (
    SELECT
        DATE_TRUNC('week', p.scheduled_date)::date AS week_start,
        SUM(p.amount_minor) AS amount_minor
    FROM scheduled_payments p
    WHERE p.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '13 weeks'
    GROUP BY 1
),
payroll_schedule AS (
    SELECT
        DATE_TRUNC('week', pay_date)::date AS week_start,
        SUM(estimated_amount_minor) AS amount_minor
    FROM payroll_calendar
    WHERE pay_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '13 weeks'
    GROUP BY 1
)
SELECT
    w.week_start,
    COALESCE(ec.amount_minor, 0) AS expected_collections,
    -(COALESCE(sp.amount_minor, 0) + COALESCE(ps.amount_minor, 0)) AS expected_outflows,
    COALESCE(ec.amount_minor, 0) - COALESCE(sp.amount_minor, 0) - COALESCE(ps.amount_minor, 0) AS net_flow,
    SUM(COALESCE(ec.amount_minor, 0) - COALESCE(sp.amount_minor, 0) - COALESCE(ps.amount_minor, 0))
        OVER (ORDER BY w.week_start) + (SELECT current_cash_minor FROM treasury_state LIMIT 1)
        AS projected_cash_balance
FROM weeks w
LEFT JOIN expected_collections ec ON ec.week_start = w.week_start
LEFT JOIN scheduled_payments sp ON sp.week_start = w.week_start
LEFT JOIN payroll_schedule ps ON ps.week_start = w.week_start
ORDER BY w.week_start;
```

Treasury monitors: weeks where projected balance < operating minimum (e.g., 3 months opex). Alerts on threshold breach trigger working capital actions (collect faster, defer payments, draw on line of credit).

### Pattern 7: Scenario planning (base / upside / downside)

Engineering provides the scenario branching; finance owns the assumptions:

```typescript
interface Scenario {
  id: string;
  name: string;                       // 'base', 'upside', 'downside', 'recession'
  description: string;
  driver_assumptions: Record<string, Record<string, number>>;  // driver -> period -> value
  inherited_from?: string;            // base scenario this branches from
  divergence_period: string;          // when this scenario starts to diverge
}

const baseScenario: Scenario = {
  id: 'base-fy26',
  name: 'Base FY26',
  description: 'Reflects current run-rate + planned hiring + observed growth',
  driver_assumptions: {
    new_logos_per_month: { '2026-05': 8, '2026-06': 9, '2026-07': 10 },
    nrr: { '2026-05': 1.12, '2026-06': 1.12 },  // 112% NRR
    headcount_engineering: { '2026-05': 50, '2026-12': 65 },
  },
  divergence_period: '2026-01',
};

const upsideScenario: Scenario = {
  id: 'upside-fy26',
  name: 'Upside FY26',
  description: 'Big enterprise deals close + NRR improves 5pp',
  inherited_from: 'base-fy26',
  driver_assumptions: {
    new_logos_per_month: { '2026-07': 12, '2026-08': 14 },
    nrr: { '2026-07': 1.17 },
  },
  divergence_period: '2026-07',
};

const downsideScenario: Scenario = {
  id: 'downside-fy26',
  name: 'Downside FY26',
  description: 'Sales pipeline slips + macro pressure on net retention',
  inherited_from: 'base-fy26',
  driver_assumptions: {
    new_logos_per_month: { '2026-07': 5, '2026-08': 5 },
    nrr: { '2026-07': 1.05 },  // contraction mostly
    headcount_engineering: { '2026-07': 50 },  // hiring frozen
  },
  divergence_period: '2026-07',
};
```

The forecast engine materializes each scenario into projected statements; dashboards compare scenarios side-by-side; board reviews discuss the divergence drivers, not the numbers.

## Anti-Patterns

### Anti-Pattern 1: SaaS metrics computed three different ways

When ops, finance, and the CEO each have a slightly different NRR number, board meetings descend into reconciliation. Define every metric ONCE in a metric dictionary; expose it as a view; every dashboard reads from the same source.

### Anti-Pattern 2: Excel as the system of record

Spreadsheets as the source of truth for budgets, forecasts, headcount plans, board decks. They break when employee leaves; can't audit; conflict across copies; lose history. Move every persistent FP&A artefact to versioned database tables OR a purpose-built tool (Mosaic, Pigment, Anaplan, Cube, Causal, Vena, Adaptive Planning).

### Anti-Pattern 3: Variance commentary written by no-one

A budget vs actual report with 50-line items showing 25% variance on each — and no commentary explaining WHY — is noise. Finance writes commentary; engineering surfaces material variances (e.g., > 10% AND > $50K) to a review queue.

### Anti-Pattern 4: Forecast precision without calibration

A forecast accurate to 4 decimal places is comforting but misleading. Hubbard ("How to Measure Anything") teaches calibrated estimation: provide ranges (e.g., "95% confident MRR ends FY26 between $14M-$18M") not point estimates. Track forecast accuracy over time; recalibrate the team.

### Anti-Pattern 5: ARR with no definition

"$10M ARR" can mean: end-of-period MRR × 12, sum of annual contract values for active subs, recognised revenue annualised, billable contract value, signed-not-yet-started contracts included. Each definition produces a different number. Publish the definition; lock it; deviations become exceptions, not redefinitions.

### Anti-Pattern 6: Cohort analysis with broken cohorts

If you redefine "cohort start" between reports (e.g., "first invoice" vs "first $500 invoice" vs "free trial start"), the cohorts shift and prior reports stop matching. Lock the cohort definition; new definitions create parallel cohorts, not replacements.

### Anti-Pattern 7: Long-range plan that ignores capacity

A 5-year LRP showing $500M ARR at year 5 from a current run-rate of $20M ARR with no plan for engineering capacity, sales hiring, or platform scaling is fantasy. Ground long-range plans in driver constraints (sales rep ramp time, engineering hiring + onboarding, platform throughput).

## Verification Checklist

- [ ] Budget vs actual variance generated from ledger automatically
- [ ] Variance commentary captured + linked to material lines
- [ ] Forecast pipeline runs at least monthly
- [ ] Drivers documented + versioned
- [ ] Sensitivity analysis available per major driver
- [ ] SaaS metrics definitions documented + versioned in metric dictionary
- [ ] MRR roll-forward chart auto-generated per period
- [ ] NRR / GRR computed per cohort + company-aggregate
- [ ] CAC / LTV / payback / magic number / Rule of 40 dashboarded
- [ ] Cohort retention triangle generated + visualised
- [ ] 13-week cash forecast updated at least weekly
- [ ] Treasury alerts on projected cash below operating minimum
- [ ] Scenario branches modelled (base / upside / downside)
- [ ] Long-range plan grounded in capacity constraints
- [ ] Board deck data sources versioned + reproducible
- [ ] FP&A team can self-serve (engineering doesn't bottleneck routine analysis)
- [ ] Forecast accuracy tracked over time (compare to actuals)
- [ ] Departmental cost ownership defined + reviewed quarterly
- [ ] Headcount plan reconciled to HRIS quarterly
- [ ] Cloud cost allocated to product / department for unit economics
- [ ] Customer-level profitability available (revenue − COGS − allocated S&M − support)

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

## Why This Skill Exists

FP&A is where finance translates the static historical record into forward-looking decisions. Boards approve budgets based on FP&A models. Investors fund growth based on FP&A projections. Executives reallocate capital based on FP&A scenarios. The quality of FP&A directly affects the quality of the company's strategic decisions.

The economic case for engineering investment in FP&A: a finance team supported by good engineering produces better analysis in less time, frees finance to be strategic instead of operational, and reduces the audit-prep cycle dramatically. The cost is moderate — typically a data warehouse, a BI tool, integration with the GL + HRIS + CRM + billing system, and the discipline of metric definition. The benefit is finance-as-business-partner instead of finance-as-spreadsheet-jockey.

The behaviour shift this skill enables: when the board asks "what happens if we close 3 fewer enterprise deals?", the answer is the downside scenario already modelled, with the cascade through MRR / cash / hiring already computed. When a department head asks "are we tracking to budget?", the answer is the live dashboard, not a finance request. When the CEO asks "what's our Rule of 40?", the answer matches what finance reports to investors, computed the same way, against the same ledger.

Engineering teams that build this well unlock finance as a multiplier. Engineering teams that don't leave finance to manual Excel work, slowing every business decision, and making the company react slower than competitors. The patterns here — variance schema, MRR roll-forward, cohort triangle, driver-based forecast, 13-week cash, scenario branching — are the canonical FP&A engineering set. They're stable across SaaS companies, across stages, across geographies, and across most exit outcomes (IPO, strategic acquisition, PE recap). Build them once, reuse them forever.

## Compliance & Standards Mapping

- **IFRS §1 Presentation of Financial Statements** — IFRS
  Foundation; statutory baseline
- **US GAAP — ASC §606** (Revenue from Contracts with Customers)
  and **ASC §842** (Leases) — FASB
- **SOX §404** — Internal control over financial reporting
- **ISO/IEC 27001:2022 Annex A** — Information security controls
  (financial systems in scope)
- **NIST SP 800-53 Rev 5 §AU** — Audit + accountability
  (financial transaction logging)
- **NIST SP 800-53 Rev 5 §AC-6** — Least privilege (segregation
  of duties)
- **OWASP ASVS 4.0.3 §V7** — Error handling + logging (financial
  events audited per `audit-logging.md`)
- **OWASP ASVS 4.0.3 §V8** — Data protection
- **PCI-DSS v4.0 §10** — Track + monitor access to network
  resources + cardholder data
- **CFA Institute Code of Ethics + Standards of Professional
  Conduct** — analyst integrity
- **CWE-840** — Business Logic Errors (financial calculations
  exposed)

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
- New cross-reference when a sister skill (bookkeeping-patterns, ifrs-gaap-reporting, valuation-models, financial-analyst) adds an FP&A gate
- New scenario template when a recurring business question emerges
- Tightening of the metric-definition discipline when engineering/finance drift recurs
