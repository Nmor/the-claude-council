# Forecasting, Treasury and Scenarios

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers driver-based forecast models, the 13-week treasury cash forecast, and scenario branching
(base / upside / downside). Pointed at by the **Driver-based forecast, 13-week cash, scenarios**
row of the Reference Map in `SKILL.md`.

## Core Patterns

Scope in this file: Patterns 5-7.

### Pattern 5: Driver-based forecast

Driver-based models tie expense to a business driver (headcount, ARR, transactions), making
forecasts auto-update when drivers change:

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

Now when finance updates a driver assumption (headcount +5 in Q3), every dependent expense
recomputes automatically — no Excel chains to maintain.

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

Treasury monitors: weeks where projected balance < operating minimum (e.g., 3 months opex). Alerts
on threshold breach trigger working capital actions (collect faster, defer payments, draw on line of
credit).

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

The forecast engine materializes each scenario into projected statements; dashboards compare
scenarios side-by-side; board reviews discuss the divergence drivers, not the numbers.
