---
name: bookkeeping-patterns
description: Double-entry bookkeeping patterns for engineering teams — chart of accounts, journal entries, ledger reconciliation, immutable accounting events, and the database schema patterns that produce auditable, restatable books for SaaS, marketplace, and fintech systems.
---

# Bookkeeping Patterns

> Standards: **IFRS Conceptual Framework for Financial Reporting (2018)**, **US GAAP (ASC) Conceptual Framework Statement of Financial Accounting Concepts No. 8**, **FASB Accounting Standards Codification**, **AICPA Audit Standards**, **Pacioli's Summa de Arithmetica (1494, the original codification of double-entry)**, **ISO 4217** (currency codes), **ISO/IEC 20022** (financial messaging).

## Purpose

Every SaaS, marketplace, fintech, e-commerce, or B2B platform that handles money is operating an accounting system whether engineering recognises it or not. Skill of bookkeeping pattern decides whether finance can close the books each month, whether auditors can trace transactions, whether tax authorities can verify revenue, and whether the founders can answer "how much did we make last quarter" without a heroic spreadsheet exercise.

This skill teaches the engineering pattern for double-entry bookkeeping: the chart of accounts (CoA), the journal-and-ledger schema, immutable accounting events, reconciliation patterns against external systems (payment processors, banks), and the operational patterns that survive audit. It is the foundation upon which IFRS/GAAP reporting (the `ifrs-gaap-reporting` skill) builds.

The principle invented by Luca Pacioli in 1494 still applies: every transaction touches at least two accounts; debits equal credits; the ledger must always balance. Modern systems add timestamping, immutability, idempotency, and multi-currency — but the core remains.

## Standards Cited

- **Pacioli "Summa de Arithmetica" (1494)** — original codification of double-entry bookkeeping
- **IFRS Conceptual Framework §2.12-2.22** — qualitative characteristics (relevance, faithful representation, comparability, verifiability, timeliness, understandability)
- **IFRS Conceptual Framework §4.3-4.46** — elements of financial statements (assets, liabilities, equity, income, expenses)
- **FASB SFAC 8** — Conceptual Framework: qualitative characteristics
- **FASB SFAC 6** — Elements of Financial Statements
- **ASC 606** — Revenue from contracts with customers (recognition principles)
- **IFRS 15** — Revenue from contracts with customers (international equivalent)
- **ISO 4217:2015** — Currency codes (USD, EUR, GBP, JPY, etc.)
- **ISO/IEC 20022** — Financial messaging (used by SWIFT, ACH, real-time payment networks)
- **AICPA Statements on Auditing Standards** — SAS 145 (risk assessment), SAS 142 (audit evidence)

## When to Fire

- Designing or extending a money-handling system (payments, refunds, payouts, invoicing, billing, marketplace flows, wallets)
- Defining a chart of accounts for a new product / business line / subsidiary
- Building a reconciliation between internal ledger and external system (Stripe, Adyen, bank, processor)
- Implementing month-end / period-close workflows
- Writing journal entries for adjustments, accruals, deferrals, write-offs
- Multi-currency systems: capturing FX rates, gain / loss on revaluation
- Marketplace systems: managing escrow, hold periods, payout schedules
- Tax computation that depends on accounting (sales tax, VAT, GST, withholding)
- Fraud / dispute / chargeback handling that affects the ledger
- Preparing data for revenue recognition (deferred revenue, contract liabilities)
- Migrating from a single-purpose ledger to a full accounting system (often: starting with the Stripe ledger → growing into NetSuite, Xero, QuickBooks, Sage Intacct, Getlago, custom)

## Core Patterns

### Pattern 1: Chart of Accounts (the schema of money)

Every account has: code, name, type (asset / liability / equity / income / expense), parent (for hierarchy), normal balance (debit or credit), currency, and active flag.

```sql
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,        -- e.g., '1000', '1010', '4000'
    name            TEXT NOT NULL,                -- e.g., 'Cash', 'Stripe Receivable', 'Revenue'
    type            TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    subtype         TEXT,                         -- e.g., 'current_asset', 'long_term_liability'
    parent_id       UUID REFERENCES accounts(id),
    normal_balance  TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    currency        TEXT NOT NULL DEFAULT 'USD',  -- ISO 4217
    active          BOOLEAN NOT NULL DEFAULT true,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ                   -- when the account stops accepting new entries
);
```

A typical SaaS chart of accounts:

```
ASSETS (debit normal balance)
  1000 Cash and cash equivalents
    1010 Operating bank account — USD
    1020 Operating bank account — EUR
    1030 Stripe receivable
    1040 PayPal receivable
  1200 Accounts receivable
    1210 Customer A/R
    1220 Allowance for doubtful accounts (contra)
  1500 Prepaid expenses
  1700 Fixed assets
    1710 Equipment
    1720 Accumulated depreciation (contra)

LIABILITIES (credit normal balance)
  2000 Accounts payable
  2100 Accrued expenses
  2200 Sales tax payable
    2210 VAT payable - GB
    2220 VAT payable - DE
    2230 Sales tax payable - CA
  2300 Deferred revenue
    2310 Deferred subscription revenue
  2400 Customer wallet balances (marketplace)

EQUITY (credit normal balance)
  3000 Common stock
  3100 Additional paid-in capital
  3200 Retained earnings
  3900 Current year earnings (closed annually)

INCOME (credit normal balance)
  4000 Revenue
    4010 Subscription revenue
    4020 Transaction fee revenue
    4030 Marketplace commission
  4900 Other income
    4910 FX gain
    4920 Interest income

EXPENSES (debit normal balance)
  5000 Cost of revenue
    5010 Payment processing fees
    5020 Hosting (AWS, GCP)
    5030 Third-party API costs
  6000 Operating expenses
    6010 Salaries and wages
    6020 Software subscriptions
    6030 Office rent
  6900 Other expenses
    6910 FX loss
    6920 Interest expense
```

Account codes follow a hierarchy: 1xxx = assets, 2xxx = liabilities, etc. The hierarchy makes financial reports (Balance Sheet, P&L) straightforward to aggregate.

### Pattern 2: Journal + Ledger schema (immutable, idempotent)

Two-table pattern: `journals` (the transactions, one row per business event) and `ledger_entries` (the lines, two or more per journal):

```sql
-- Each business event = one journal
CREATE TABLE journals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posted_at       TIMESTAMPTZ NOT NULL,         -- business date
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),  -- system date
    period          TEXT NOT NULL,                -- '2026-05' for monthly closes
    type            TEXT NOT NULL,                -- 'invoice', 'payment', 'refund', 'adjustment'
    description     TEXT NOT NULL,
    source_system   TEXT NOT NULL,                -- 'stripe', 'manual', 'subscription-billing'
    source_ref      TEXT NOT NULL,                -- e.g., Stripe charge id 'ch_xxx'
    idempotency_key TEXT NOT NULL UNIQUE,         -- prevents double-posting
    metadata        JSONB,
    reversed_by     UUID REFERENCES journals(id), -- for reversing entries
    locked          BOOLEAN NOT NULL DEFAULT false  -- true after period close
);

-- Each journal has 2+ lines; sum of debits == sum of credits
CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id      UUID NOT NULL REFERENCES journals(id),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    debit_minor     BIGINT NOT NULL DEFAULT 0 CHECK (debit_minor >= 0),
    credit_minor    BIGINT NOT NULL DEFAULT 0 CHECK (credit_minor >= 0),
    currency        TEXT NOT NULL,
    fx_rate         NUMERIC(18, 8),               -- to base currency; NULL for base-currency entries
    fx_rate_date    DATE,
    base_debit_minor  BIGINT,                     -- translated to base currency
    base_credit_minor BIGINT,
    description     TEXT,
    metadata        JSONB,
    CONSTRAINT exactly_one_side CHECK ((debit_minor = 0) <> (credit_minor = 0))
);

-- Balance check: every journal must balance
CREATE OR REPLACE FUNCTION enforce_journal_balance() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM ledger_entries
        WHERE journal_id = NEW.journal_id
        GROUP BY journal_id, currency
        HAVING SUM(debit_minor) != SUM(credit_minor)
    ) THEN
        RAISE EXCEPTION 'Journal % does not balance per currency', NEW.journal_id;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
```

Amounts are stored in **minor units** (cents for USD, pence for GBP, etc.) as integers — never floats. `BIGINT` because 64 bits covers $92 quintillion which is sufficient for any conceivable transaction.

### Pattern 3: Immutability + reversal (never UPDATE/DELETE)

Accounting records are immutable after posting. Corrections happen via REVERSING entries:

```typescript
// WRONG — modifies history; auditors reject
async function fixWrongAmount(journalId: string, correctAmount: bigint) {
  await db.execute(
    'UPDATE ledger_entries SET debit_minor = $1 WHERE journal_id = $2',
    [correctAmount, journalId],
  );
}

// CORRECT — reverse original + post correct
async function fixWrongAmount(originalJournalId: string, correctAmount: bigint) {
  await db.transaction(async (tx) => {
    // 1. Reverse the original
    const reversalId = await postJournal(tx, {
      posted_at: new Date(),
      type: 'reversal',
      description: `Reversal of ${originalJournalId}`,
      source_ref: originalJournalId,
      idempotency_key: `reversal-${originalJournalId}`,
      entries: await getReversedEntries(tx, originalJournalId),
    });
    await tx.execute(
      'UPDATE journals SET reversed_by = $1 WHERE id = $2',
      [reversalId, originalJournalId],
    );

    // 2. Post the correct entry
    await postJournal(tx, {
      posted_at: new Date(),
      type: 'correction',
      description: `Correction of ${originalJournalId}`,
      source_ref: originalJournalId,
      idempotency_key: `correction-${originalJournalId}`,
      entries: buildCorrectEntries(correctAmount),
    });
  });
}
```

Period close (e.g., monthly) sets `locked = true` on all journals in the period; no further postings allowed except via prior-period adjustments approved by finance.

### Pattern 4: Standard business events → journal templates

Each business event has a deterministic journal pattern. Codify them:

```typescript
// Stripe charge succeeded — customer paid us
export function chargeSucceededJournal(charge: StripeCharge): JournalSpec {
  const grossMinor = BigInt(charge.amount);  // e.g., 10000 = $100.00
  const feeMinor = BigInt(charge.balance_transaction.fee);
  const netMinor = grossMinor - feeMinor;

  return {
    posted_at: new Date(charge.created * 1000),
    type: 'customer_payment',
    description: `Payment from customer ${charge.customer}`,
    source_system: 'stripe',
    source_ref: charge.id,
    idempotency_key: `stripe-charge-${charge.id}`,
    metadata: { customer_id: charge.customer, payment_method: charge.payment_method },
    entries: [
      // Debit Stripe receivable (we'll get the money soon)
      {
        account_code: '1030',
        debit_minor: netMinor,
        credit_minor: 0n,
        currency: charge.currency.toUpperCase(),
      },
      // Debit payment processing fees (expense)
      {
        account_code: '5010',
        debit_minor: feeMinor,
        credit_minor: 0n,
        currency: charge.currency.toUpperCase(),
      },
      // Credit deferred revenue (we owe service; recognize over time)
      {
        account_code: '2310',
        debit_minor: 0n,
        credit_minor: grossMinor,
        currency: charge.currency.toUpperCase(),
      },
    ],
  };
}

// Stripe payout — money moved from Stripe to bank
export function payoutJournal(payout: StripePayout): JournalSpec {
  const amountMinor = BigInt(payout.amount);

  return {
    posted_at: new Date(payout.arrival_date * 1000),
    type: 'payout',
    description: `Payout to bank account`,
    source_system: 'stripe',
    source_ref: payout.id,
    idempotency_key: `stripe-payout-${payout.id}`,
    entries: [
      // Debit bank account (money arrived)
      {
        account_code: '1010',
        debit_minor: amountMinor,
        credit_minor: 0n,
        currency: payout.currency.toUpperCase(),
      },
      // Credit Stripe receivable (Stripe no longer owes us)
      {
        account_code: '1030',
        debit_minor: 0n,
        credit_minor: amountMinor,
        currency: payout.currency.toUpperCase(),
      },
    ],
  };
}
```

Every webhook from the payment processor becomes a candidate for a journal. Stripe events: `charge.succeeded`, `charge.refunded`, `charge.dispute.created`, `payout.paid`, `invoice.paid`, `customer.subscription.updated`, etc. Each maps to a journal template.

### Pattern 5: Reconciliation (the trust-but-verify pattern)

Every internal ledger account that mirrors an external system needs daily reconciliation:

```sql
-- Daily reconciliation: account 1030 (Stripe receivable) vs Stripe Balance API
CREATE TABLE reconciliations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          UUID NOT NULL REFERENCES accounts(id),
    as_of_date          DATE NOT NULL,
    internal_balance    BIGINT NOT NULL,     -- from our ledger
    external_balance    BIGINT NOT NULL,     -- from external API
    currency            TEXT NOT NULL,
    difference          BIGINT GENERATED ALWAYS AS (internal_balance - external_balance) STORED,
    status              TEXT NOT NULL CHECK (status IN ('matched', 'investigating', 'resolved')),
    notes               TEXT,
    resolved_at         TIMESTAMPTZ,
    resolved_by         TEXT,
    UNIQUE(account_id, as_of_date)
);
```

Daily job:

```typescript
async function reconcileStripeReceivable(date: Date) {
  const internalBalance = await getLedgerBalance({
    account_code: '1030',
    as_of: date,
    currency: 'USD',
  });

  const stripeBalance = await stripe.balance.retrieve();
  const externalBalance = stripeBalance.available
    .filter(b => b.currency === 'usd')
    .reduce((sum, b) => sum + BigInt(b.amount), 0n);

  const diff = internalBalance - externalBalance;

  await db.insert('reconciliations', {
    account_id: STRIPE_RECEIVABLE_ACCOUNT_ID,
    as_of_date: date,
    internal_balance: internalBalance,
    external_balance: externalBalance,
    currency: 'USD',
    status: diff === 0n ? 'matched' : 'investigating',
    notes: diff !== 0n
      ? `Discrepancy ${diff}. Likely cause: in-flight charges not yet captured, or missed webhook.`
      : null,
  });

  if (diff !== 0n) {
    await alerting.page('finance-oncall', `Stripe reconciliation off by ${diff}`);
  }
}
```

Discrepancies investigated within 24 hours. Common causes: missed webhooks (replay from Stripe's event log), webhook processed but journal posting failed (idempotency keys help diagnose), or timing differences (in-flight transactions).

### Pattern 6: Multi-currency with daily FX

Multi-currency books require FX rate capture + revaluation:

```sql
CREATE TABLE fx_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency   TEXT NOT NULL,             -- ISO 4217; typically 'USD'
    quote_currency  TEXT NOT NULL,
    rate            NUMERIC(18, 8) NOT NULL,   -- quote per 1 unit of base
    rate_date       DATE NOT NULL,
    source          TEXT NOT NULL,             -- 'ecb', 'fed', 'oanda', 'manual'
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(base_currency, quote_currency, rate_date, source)
);
```

When a foreign-currency transaction occurs, capture the FX rate at the transaction date and translate to base currency. Period-end revaluation re-translates open foreign-currency balances at the period-end rate; the difference posts to FX gain (4910) or loss (6910).

### Pattern 7: Period-close pipeline

Monthly close (engineering-managed checklist; finance approves):

```yaml
period: 2026-05
close_target_date: 2026-06-05

steps:
  - day_1:
      - all_webhooks_processed: verified via DLQ empty + last 24h event count matches expected
      - all_pending_journals_posted: count(journals WHERE recorded_at < 2026-06-01) >= sum(events expected)
  - day_2:
      - bank_reconciliation: status=matched OR investigating for each bank account
      - stripe_reconciliation: status=matched
      - dispute_provisions_calculated: based on open disputes at period-end
  - day_3:
      - subscription_revenue_recognition: deferred revenue moved to revenue per ASC 606
      - prepaid_expenses_amortized: 1/N each month for N-month prepayments
      - depreciation_calculated: straight-line per asset register
      - accruals_posted: salaries earned but not paid, etc.
  - day_4:
      - fx_revaluation: open balances revalued at month-end rate
      - intercompany_eliminations: if consolidated
  - day_5:
      - financial_statements_generated: BS, IS, CF
      - variance_analysis: actual vs budget / prior period
      - finance_review_meeting
      - period_locked: UPDATE journals SET locked = true WHERE period = '2026-05'
```

After period lock, no new entries to that period (except prior-period adjustments with finance approval, which post as separate journals in the open period referencing the closed period).

## Anti-Patterns

### Anti-Pattern 1: Storing money as floats

`amount FLOAT NOT NULL` accumulates rounding errors that destroy reconciliation. Use integers in minor units (`amount_cents BIGINT`) or fixed-point decimals (`NUMERIC(18, 2)`). Never floats.

### Anti-Pattern 2: Single-entry "transactions" table

A simple `transactions(id, type, amount, ...)` table forces every report to encode the accounting logic in queries. Switch to journals + ledger entries; the schema then naturally supports balance sheet, P&L, cash flow, and trial balance reports.

### Anti-Pattern 3: UPDATE on posted entries

"We just need to fix the amount" — no. Reverse + repost. The audit trail must show what was originally posted, when, and why it was corrected. UPDATEs destroy that trail.

### Anti-Pattern 4: Idempotency keys based on internal IDs that can re-issue

If your idempotency key is `journal-${order_id}` and the order ID can be re-issued after a soft delete, you can fail to post a valid journal because of a "duplicate". Idempotency keys must be globally unique forever — typically prefixed with the source system + source object ID.

### Anti-Pattern 5: Recognising revenue at the wrong time

Stripe charge = customer paid us. That's NOT revenue under ASC 606/IFRS 15 — that's a CASH receipt and a CONTRACT LIABILITY (deferred revenue). Revenue is recognised when the service is delivered (over the subscription period). Two distinct events; two distinct journals.

### Anti-Pattern 6: Missing customer wallet liability

Marketplace platforms holding money on behalf of buyers/sellers (escrow, pending payouts, wallet balances) must record the obligation as a LIABILITY (2400 — customer wallet balances). The cash is yours; the obligation to disburse is yours. Hiding this in a "transactions" log produces an under-reported liability when the auditor finds it.

### Anti-Pattern 7: No reconciliation, no problem (until there is one)

Without daily reconciliation, a webhook gap from 3 months ago is undiscoverable. By the time finance notices the books are off, you have thousands of journals to investigate and no clear timeline. Reconcile every day; investigate every break within 24 hours.

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

- `~/.claude/skills/ifrs-gaap-reporting/SKILL.md` — builds on this for financial statement preparation
- `~/.claude/skills/fp-and-a/SKILL.md` — uses ledger data for forecasting + variance analysis
- `~/.claude/skills/pci-dss-patterns/SKILL.md` — payment-data side of money handling
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — financial records under retention obligations
- `~/.claude/rules-library/common/audit-logging.md` — immutability + integrity patterns
- `~/.claude/rules-library/common/idempotency.md` — idempotency-key design
- `~/.claude/rules-library/common/data-retention.md` — financial records retention (typically 7 years)
- Council Division 10 (Finance & FinOps) — auto-engages on ledger-affecting changes
- Getlago (open-source billing) for usage-based metering → invoicing → ledger feed

## Why This Skill Exists

Every product team building monetised software eventually realises they're operating an accounting system. The default approach — a `transactions` table with columns for amount, type, status — works until the first auditor, the first multi-currency, the first refund, the first chargeback, the first marketplace payout, the first month-end close. Each of these surfaces the fundamental gap: accounting requires double-entry, immutability, period-close, and reconciliation — none of which a flat transactions table supports.

Refactoring from a flat transactions table to a proper journal+ledger schema after the fact is one of the most painful migrations any engineering team faces. The historical data must be re-derived into double-entry; the reconciliation must be reconstructed across years of activity; the trust gap with finance (who has been working from spreadsheets) must be rebuilt.

This skill exists to make the foundation right from day one. The double-entry schema is mature — Pacioli codified it in 1494; the digital implementations have been refined for 60 years. Modern systems (Getlago, Modern Treasury, Increase, Mercoa, Beancount) all converge on this pattern. Following it produces books that close on time, reconcile cleanly, satisfy auditors, and answer business questions without heroic Excel.

When the founder asks "how much revenue did we recognise in Q2?", the answer comes from a single SQL query against `journals` joined to `ledger_entries` filtered by revenue accounts and period. When the auditor asks "trace this customer's payment to recognised revenue", the answer is a join across the payment journal, the deferred revenue account, and the revenue recognition journal. When the CFO asks "what's our cash position at month-end?", the answer is a sum of debits-credits on the cash accounts. The schema makes these queries trivial; the discipline of posting every event correctly makes the answers trustworthy.

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
- Flat transactions table proposed for new product (double-entry weakening — anti-pattern)
- Ledger entries mutated post-posting (immutability weakening; should be reversing entries)
- Trial balance not zero (debits != credits) on close (double-entry invariant violated)
- Multi-currency without explicit FX rate + functional-currency field (per IAS 21)
- Closing journals not period-locked (re-post after close → audit-trail break)
- Account-code drift (same purpose mapped to different chart entries across modules)
- Subsidiary ledger out of sync with general ledger (reconciliation gap)
- Bank reconciliation skipped or > 30 days behind
- Inter-company eliminations missing on consolidated reports
- Idempotency missing on payment posting (per `~/.claude/rules-library/common/idempotency.md` — double-post risk)

**Refinement candidates**:
- New journal-template row when a new business event class emerges (e.g., crypto-asset, ESG credit)
- New cross-reference when a sister skill (ifrs-gaap-reporting, fp-and-a, pci-dss-patterns) adds an accounting gate
- New reconciliation template when a new external system (PSP, bank, AP automation) is integrated
- Tightening of the period-lock rule when re-post incidents recur
