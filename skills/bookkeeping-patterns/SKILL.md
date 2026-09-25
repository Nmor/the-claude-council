---
name: bookkeeping-patterns
description: Double-entry bookkeeping patterns for engineering teams — chart of accounts, journal entries, ledger reconciliation, immutable accounting events, and the database schema patterns that produce auditable, restatable books for SaaS, marketplace, and fintech systems.
---

# Bookkeeping Patterns

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> Standards: **IFRS Conceptual Framework for Financial Reporting (2018)**, **US GAAP (ASC)
> Conceptual Framework Statement of Financial Accounting Concepts No. 8**, **FASB Accounting
> Standards Codification**, **AICPA Audit Standards**, **Pacioli's Summa de Arithmetica (1494, the
> original codification of double-entry)**, **ISO 4217** (currency codes), **ISO/IEC 20022**
> (financial messaging).

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Patterns | [`references/core-patterns.md`](references/core-patterns.md) |
| Compliance & Standards Mapping | [`references/compliance-standards-mapping.md`](references/compliance-standards-mapping.md) |

## Purpose

Every SaaS, marketplace, fintech, e-commerce, or B2B platform that handles money is operating an
accounting system whether engineering recognises it or not. Skill of bookkeeping pattern decides
whether finance can close the books each month, whether auditors can trace transactions, whether tax
authorities can verify revenue, and whether the founders can answer "how much did we make last
quarter" without a heroic spreadsheet exercise.

This skill teaches the engineering pattern for double-entry bookkeeping: the chart of accounts
(CoA), the journal-and-ledger schema, immutable accounting events, reconciliation patterns against
external systems (payment processors, banks), and the operational patterns that survive audit. It is
the foundation upon which IFRS/GAAP reporting (the `ifrs-gaap-reporting` skill) builds.

The principle invented by Luca Pacioli in 1494 still applies: every transaction touches at least two
accounts; debits equal credits; the ledger must always balance. Modern systems add timestamping,
immutability, idempotency, and multi-currency — but the core remains.

## Standards Cited

- **Pacioli "Summa de Arithmetica" (1494)** — original codification of double-entry bookkeeping
- **IFRS Conceptual Framework §2.12-2.22** — qualitative characteristics (relevance, faithful
  representation, comparability, verifiability, timeliness, understandability)
- **IFRS Conceptual Framework §4.3-4.46** — elements of financial statements (assets, liabilities,
  equity, income, expenses)
- **FASB SFAC 8** — Conceptual Framework: qualitative characteristics
- **FASB SFAC 6** — Elements of Financial Statements
- **ASC 606** — Revenue from contracts with customers (recognition principles)
- **IFRS 15** — Revenue from contracts with customers (international equivalent)
- **ISO 4217:2015** — Currency codes (USD, EUR, GBP, JPY, etc.)
- **ISO/IEC 20022** — Financial messaging (used by SWIFT, ACH, real-time payment networks)
- **AICPA Statements on Auditing Standards** — SAS 145 (risk assessment), SAS 142 (audit evidence)

## When to Fire

- Designing or extending a money-handling system (payments, refunds, payouts, invoicing, billing,
  marketplace flows, wallets)
- Defining a chart of accounts for a new product / business line / subsidiary
- Building a reconciliation between internal ledger and external system (Stripe, Adyen, bank,
  processor)
- Implementing month-end / period-close workflows
- Writing journal entries for adjustments, accruals, deferrals, write-offs
- Multi-currency systems: capturing FX rates, gain / loss on revaluation
- Marketplace systems: managing escrow, hold periods, payout schedules
- Tax computation that depends on accounting (sales tax, VAT, GST, withholding)
- Fraud / dispute / chargeback handling that affects the ledger
- Preparing data for revenue recognition (deferred revenue, contract liabilities)
- Migrating from a single-purpose ledger to a full accounting system (often: starting with the
  Stripe ledger → growing into NetSuite, Xero, QuickBooks, Sage Intacct, Getlago, custom)

## Anti-Patterns

### Anti-Pattern 1: Storing money as floats

`amount FLOAT NOT NULL` accumulates rounding errors that destroy reconciliation. Use integers in
minor units (`amount_cents BIGINT`) or fixed-point decimals (`NUMERIC(18, 2)`). Never floats.

### Anti-Pattern 2: Single-entry "transactions" table

A simple `transactions(id, type, amount, ...)` table forces every report to encode the accounting
logic in queries. Switch to journals + ledger entries; the schema then naturally supports balance
sheet, P&L, cash flow, and trial balance reports.

### Anti-Pattern 3: UPDATE on posted entries

"We just need to fix the amount" — no. Reverse + repost. The audit trail must show what was
originally posted, when, and why it was corrected. UPDATEs destroy that trail.

### Anti-Pattern 4: Idempotency keys based on internal IDs that can re-issue

If your idempotency key is `journal-${order_id}` and the order ID can be re-issued after a soft
delete, you can fail to post a valid journal because of a "duplicate". Idempotency keys must be
globally unique forever — typically prefixed with the source system + source object ID.

### Anti-Pattern 5: Recognising revenue at the wrong time

Stripe charge = customer paid us. That's NOT revenue under ASC 606/IFRS 15 — that's a CASH receipt
and a CONTRACT LIABILITY (deferred revenue). Revenue is recognised when the service is delivered
(over the subscription period). Two distinct events; two distinct journals.

### Anti-Pattern 6: Missing customer wallet liability

Marketplace platforms holding money on behalf of buyers/sellers (escrow, pending payouts, wallet
balances) must record the obligation as a LIABILITY (2400 — customer wallet balances). The cash is
yours; the obligation to disburse is yours. Hiding this in a "transactions" log produces an
under-reported liability when the auditor finds it.

### Anti-Pattern 7: No reconciliation, no problem (until there is one)

Without daily reconciliation, a webhook gap from 3 months ago is undiscoverable. By the time finance
notices the books are off, you have thousands of journals to investigate and no clear timeline.
Reconcile every day; investigate every break within 24 hours.

## Verification Checklist

- [ ] Chart of accounts documented with code, name, type, normal balance
- [ ] Accounts have hierarchy (parent_id) supporting roll-up reports
- [ ] Amounts stored as integers in minor units (or fixed-point decimals)
- [ ] Journal table is immutable (no UPDATE/DELETE in source code)
- [ ] Ledger entries enforce debit==credit per currency
- [ ] Idempotency keys globally unique + source-prefixed
- [ ] Every external event has a deterministic journal template
- [ ] Reversal pattern documented + used for corrections
- [ ] Period-locking mechanism in place + tested
- [ ] Daily reconciliation against external systems (Stripe, bank, processor)
- [ ] Reconciliation discrepancies alerted within 24h
- [ ] FX rates captured per transaction date
- [ ] FX revaluation at period-end
- [ ] Multi-currency support tested with at least 3 currencies
- [ ] Deferred revenue separated from recognised revenue
- [ ] Customer wallet / escrow balances recorded as liabilities (not netted)
- [ ] Audit log on every journal posting (who, when, source)
- [ ] Sample audit trace: a customer payment → cash → revenue
- [ ] Year-end retained earnings closing entry automated
- [ ] Backup + point-in-time-recovery on accounting database tested

## Cross-References

- `~/.claude/skills/ifrs-gaap-reporting/SKILL.md` — builds on this for financial statement
  preparation
- `~/.claude/skills/fp-and-a/SKILL.md` — uses ledger data for forecasting + variance analysis
- `~/.claude/skills/pci-dss-patterns/SKILL.md` — payment-data side of money handling
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — financial records under retention obligations
- `~/.claude/rules-library/common/audit-logging.md` — immutability + integrity patterns
- `~/.claude/rules-library/common/idempotency.md` — idempotency-key design
- `~/.claude/rules-library/common/data-retention.md` — financial records retention (typically 7
  years)
- Council Division 10 (Finance & FinOps) — auto-engages on ledger-affecting changes
- Getlago (open-source billing) for usage-based metering → invoicing → ledger feed

## Why This Skill Exists

Every product team building monetised software eventually realises they're operating an accounting
system. The default approach — a `transactions` table with columns for amount, type, status — works
until the first auditor, the first multi-currency, the first refund, the first chargeback, the first
marketplace payout, the first month-end close. Each of these surfaces the fundamental gap:
accounting requires double-entry, immutability, period-close, and reconciliation — none of which a
flat transactions table supports.

Refactoring from a flat transactions table to a proper journal+ledger schema after the fact is one
of the most painful migrations any engineering team faces. The historical data must be re-derived
into double-entry; the reconciliation must be reconstructed across years of activity; the trust gap
with finance (who has been working from spreadsheets) must be rebuilt.

This skill exists to make the foundation right from day one. The double-entry schema is mature —
Pacioli codified it in 1494; the digital implementations have been refined for 60 years. Modern
systems (Getlago, Modern Treasury, Increase, Mercoa, Beancount) all converge on this pattern.
Following it produces books that close on time, reconcile cleanly, satisfy auditors, and answer
business questions without heroic Excel.

When the founder asks "how much revenue did we recognise in Q2?", the answer comes from a single SQL
query against `journals` joined to `ledger_entries` filtered by revenue accounts and period. When
the auditor asks "trace this customer's payment to recognised revenue", the answer is a join across
the payment journal, the deferred revenue account, and the revenue recognition journal. When the CFO
asks "what's our cash position at month-end?", the answer is a sum of debits-credits on the cash
accounts. The schema makes these queries trivial; the discipline of posting every event correctly
makes the answers trustworthy.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Flat transactions table proposed for new product (double-entry weakening — anti-pattern)
- Ledger entries mutated post-posting (immutability weakening; should be reversing entries)
- Trial balance not zero (debits != credits) on close (double-entry invariant violated)
- Multi-currency without explicit FX rate + functional-currency field (per IAS 21)
- Closing journals not period-locked (re-post after close → audit-trail break)
- Account-code drift (same purpose mapped to different chart entries across modules)
- Subsidiary ledger out of sync with general ledger (reconciliation gap)
- Bank reconciliation skipped or > 30 days behind
- Inter-company eliminations missing on consolidated reports
- Idempotency missing on payment posting (per `~/.claude/rules-library/common/idempotency.md` —
  double-post risk)

**Refinement candidates**:

- New journal-template row when a new business event class emerges (e.g., crypto-asset, ESG credit)
- New cross-reference when a sister skill (ifrs-gaap-reporting, fp-and-a, pci-dss-patterns) adds an
  accounting gate
- New reconciliation template when a new external system (PSP, bank, AP automation) is integrated
- Tightening of the period-lock rule when re-post incidents recur
