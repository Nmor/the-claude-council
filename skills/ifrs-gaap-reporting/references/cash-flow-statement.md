# IFRS / GAAP Reporting — Statement of Cash Flows

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the statement of cash flows under IAS 7 / ASC 230: operating / investing / financing
categories, the indirect-method generator, and the opening-plus-net-change-equals-closing
validation. Pointed at by the SKILL.md Core Patterns row "Pattern 4: Statement of Cash Flows
(IAS 7 / ASC 230)".

## Core Patterns

### Pattern 4: Statement of Cash Flows (IAS 7 / ASC 230)

Three categories: Operating, Investing, Financing. Two methods to present operating: direct (line by
line of cash receipts/payments) or indirect (start with profit, adjust for non-cash + working
capital changes).

The indirect method (more common):

```typescript
async function generateCashFlowStatement(period: string) {
  const profit = await getIncomeStatementProfit(period);

  // Adjustments for non-cash items
  const depreciation = await getAccountActivity('6040', period);  // depreciation expense
  const amortization = await getAccountActivity('6050', period);
  const stockComp = await getAccountActivity('6020', period);     // SBC
  const deferredTax = await getAccountActivity('7100', period);

  // Changes in working capital
  const trade_receivables_change = await balanceChange('1200', period);  // negative = use of cash
  const inventory_change = await balanceChange('1400', period);
  const trade_payables_change = await balanceChange('2000', period);     // positive = source of cash
  const deferred_revenue_change = await balanceChange('2300', period);   // positive = source of cash

  const cfo = profit
    + depreciation
    + amortization
    + stockComp
    + deferredTax
    - trade_receivables_change   // increase in A/R is a use
    - inventory_change
    + trade_payables_change      // increase in A/P is a source
    + deferred_revenue_change;

  // Investing
  const capex = await getAccountActivity('1710', period, 'debit');   // PP&E additions
  const acquisitions = await getAccountActivity('1800', period, 'debit');  // intangibles

  const cfi = -capex - acquisitions;

  // Financing
  const debtIssued = await getAccountActivity('2600', period, 'credit');
  const debtRepaid = await getAccountActivity('2600', period, 'debit');
  const stockIssued = await getAccountActivity('3000', period, 'credit');
  const dividends = await getAccountActivity('3200', period, 'debit');

  const cff = debtIssued - debtRepaid + stockIssued - dividends;

  const netChangeInCash = cfo + cfi + cff;

  return {
    period,
    operating_activities: cfo,
    investing_activities: cfi,
    financing_activities: cff,
    net_change: netChangeInCash,
    cash_beginning: await getOpeningCash(period),
    cash_ending: await getClosingCash(period),
    // Validate: opening + net change == closing
  };
}
```

The validation `opening + net change = closing` must hold exactly. If it doesn't, working-capital
signs or cash classification is wrong.
