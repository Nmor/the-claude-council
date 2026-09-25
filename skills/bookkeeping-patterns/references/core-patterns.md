# bookkeeping-patterns: Core Patterns

> Covers **Core Patterns** for the `bookkeeping-patterns` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 17 KB** — `token-budget.mjs --check`.

## Core Patterns

### Pattern 1: Chart of Accounts (the schema of money)

Every account has: code, name, type (asset / liability / equity / income / expense), parent (for
hierarchy), normal balance (debit or credit), currency, and active flag.

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

```text
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

Account codes follow a hierarchy: 1xxx = assets, 2xxx = liabilities, etc. The hierarchy makes
financial reports (Balance Sheet, P&L) straightforward to aggregate.

### Pattern 2: Journal + Ledger schema (immutable, idempotent)

Two-table pattern: `journals` (the transactions, one row per business event) and `ledger_entries`
(the lines, two or more per journal):

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

Amounts are stored in **minor units** (cents for USD, pence for GBP, etc.) as integers — never
floats. `BIGINT` because 64 bits covers $92 quintillion which is sufficient for any conceivable
transaction.

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

Period close (e.g., monthly) sets `locked = true` on all journals in the period; no further postings
allowed except via prior-period adjustments approved by finance.

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

Every webhook from the payment processor becomes a candidate for a journal. Stripe events:
`charge.succeeded`, `charge.refunded`, `charge.dispute.created`, `payout.paid`, `invoice.paid`,
`customer.subscription.updated`, etc. Each maps to a journal template.

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

Discrepancies investigated within 24 hours. Common causes: missed webhooks (replay from Stripe's
event log), webhook processed but journal posting failed (idempotency keys help diagnose), or timing
differences (in-flight transactions).

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

When a foreign-currency transaction occurs, capture the FX rate at the transaction date and
translate to base currency. Period-end revaluation re-translates open foreign-currency balances at
the period-end rate; the difference posts to FX gain (4910) or loss (6910).

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

After period lock, no new entries to that period (except prior-period adjustments with finance
approval, which post as separate journals in the open period referencing the closed period).
