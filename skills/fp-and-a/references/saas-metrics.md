# SaaS Metrics, MRR Roll-Forward and Cohorts

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the canonical SaaS metric dictionary, the MRR/ARR roll-forward decomposition, and cohort
retention curves — the measurement layer every board deck reads from. Pointed at by the **SaaS
metrics, roll-forward, cohorts** row of the Reference Map in `SKILL.md`.

## Core Patterns

Scope in this file: Patterns 2-4.

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

Every metric MUST be defined with rigour. The most common dispute in board meetings: "our NRR is
130%" — but did you include expansion at renewal price increases? Did you measure cohort-based or
company-aggregate?

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

The chart finance presents: opening MRR + new + expansion + reactivation − contraction − churn =
ending MRR. Every dollar of MRR change has a category.

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

The output renders as a triangular heatmap (cohort month on Y, months-since-start on X). The shape
reveals whether cohorts are improving / worsening over time and whether expansion eventually exceeds
churn (NRR > 100%).
