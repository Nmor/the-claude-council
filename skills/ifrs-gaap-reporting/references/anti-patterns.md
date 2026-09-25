# IFRS / GAAP Reporting — Rejected Approaches

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the seven anti-patterns in full — what to reject, why, and the named alternative. Pointed at
by the SKILL.md Anti-Patterns table.

## Anti-Patterns

### Anti-Pattern 1: Statement generation as a one-off SQL query

A 200-line SQL query that computes the balance sheet by hardcoding account codes breaks every time
accounts are added. Use the mapping table; aggregate via configuration; the statement code becomes
data-driven and resilient to chart-of-accounts evolution.

### Anti-Pattern 2: Revenue = cash received

ASC 606 / IFRS 15 explicitly separate cash receipts from revenue. Annual subscriptions paid upfront
are a contract liability, not revenue, until the service is delivered. Conflating these violates the
most-audited standard since both standards became effective in 2018.

### Anti-Pattern 3: Lease accounting in Excel

The lease amortisation schedule needs to live in a system, not a spreadsheet. Lease modifications,
renewals, terminations, lessor concessions during periods like COVID — all require re-measurement.
Spreadsheet-driven lease accounting fails the second audit cycle.

### Anti-Pattern 4: Cash flow as a manual reconciliation

The cash flow statement built by hand each month is fragile and slow. Generate it from the ledger
using the indirect method formula; validate `opening + net change = closing`; close the period only
when validation passes.

### Anti-Pattern 5: Maintaining two separate ledgers for IFRS + GAAP

Dual-reporting entities don't need two ledgers; they need adjustment journals + parallel views.
Local subsidiary books in local GAAP + group adjustment journals to IFRS = clean consolidation. Two
completely separate ledgers diverge over time and produce reconciliation nightmares.

### Anti-Pattern 6: Ignoring expected credit losses (IFRS 9 / ASC 326)

Both frameworks moved from incurred-loss to expected-loss models. A `trade_receivables` balance
without an allowance for credit losses (ECL under IFRS 9, CECL under ASC 326) understates the loss
exposure. Engineering supplies the data; finance computes the expected loss; the allowance is posted
as a contra-asset.

### Anti-Pattern 7: Reporting prematurely

Closing the period in 2 days might feel like an achievement, but if it requires skipping
reconciliations + accruals + tax provisions, the statements are wrong. A 5-day close with full
evidence + reconciliation beats a 2-day close with restated quarterlies six months later.
