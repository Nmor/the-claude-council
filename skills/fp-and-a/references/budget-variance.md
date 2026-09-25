# Budget vs Actual Variance

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the budget-version / budget-line schema and the generated variance view that turns the
general ledger into an automated budget-vs-actual report. Pointed at by the **Budget vs actual
variance** row of the Reference Map in `SKILL.md`.

## Core Patterns

Scope in this file: Pattern 1.

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

Variance commentary (the WHY behind the gap) is captured separately by finance — engineering
provides the data, finance writes the narrative.
