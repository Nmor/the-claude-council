# IFRS / GAAP Reporting — Lease Accounting

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers lease accounting under IFRS 16 / ASC 842: right-of-use asset and lease liability, initial
measurement, and the monthly depreciation / interest / payment journals. Pointed at by the SKILL.md
Core Patterns row "Pattern 3: Lease accounting (IFRS 16 / ASC 842)".

## Core Patterns

### Pattern 3: Lease accounting (IFRS 16 / ASC 842)

The 2019 lease standards eliminated operating lease off-balance-sheet treatment. Every lease > 12
months produces:

- **Right-of-use asset** (asset, depreciable)
- **Lease liability** (split current / non-current)
- **Depreciation expense** (straight-line over lease term)
- **Interest expense** on the liability

```typescript
interface Lease {
  id: string;
  description: string;            // "Office at 123 Main St"
  start_date: string;
  end_date: string;
  monthly_payment_minor: bigint;
  currency: string;
  discount_rate: number;           // incremental borrowing rate; e.g., 0.05 = 5%
  classification?: 'finance' | 'operating';  // ASC 842 distinguishes; IFRS 16 single model
}

function initialMeasurement(lease: Lease) {
  const periods = monthsBetween(lease.start_date, lease.end_date);
  const monthlyRate = lease.discount_rate / 12;
  const initialLiability = presentValueOfAnnuity(
    lease.monthly_payment_minor,
    monthlyRate,
    periods,
  );
  // Right-of-use asset = lease liability + initial direct costs + prepayments − incentives
  const initialROU = initialLiability;  // assuming no IDC / prepayments / incentives

  // Initial recognition journal
  return {
    type: 'lease_recognition',
    description: `Initial recognition: ${lease.description}`,
    source_ref: lease.id,
    idempotency_key: `lease-init-${lease.id}`,
    entries: [
      // Debit ROU asset
      { account_code: '1730', debit_minor: initialROU, credit_minor: 0n, currency: lease.currency },
      // Credit lease liability (split current / non-current is presentation)
      { account_code: '2510', debit_minor: 0n, credit_minor: initialLiability, currency: lease.currency },
    ],
  };
}

function monthlyJournal(lease: Lease, periodEnd: Date) {
  // Each month: depreciation expense + interest expense + payment
  const monthsRemaining = monthsBetween(periodEnd, lease.end_date);
  const monthlyRate = lease.discount_rate / 12;

  // Recompute current liability balance from amortization schedule
  const currentLiability = currentLiabilityAt(lease, periodEnd);

  const interestExpense = BigInt(Math.round(Number(currentLiability) * monthlyRate));
  const principalPayment = lease.monthly_payment_minor - interestExpense;
  const depreciationExpense = initialROU(lease) / BigInt(totalLeaseMonths(lease));

  return [
    {
      // Depreciation
      type: 'lease_depreciation',
      idempotency_key: `lease-dep-${lease.id}-${formatPeriod(periodEnd)}`,
      entries: [
        { account_code: '6040', debit_minor: depreciationExpense, credit_minor: 0n },  // depr expense
        { account_code: '1740', debit_minor: 0n, credit_minor: depreciationExpense },  // accum depr ROU
      ],
    },
    {
      // Interest + principal
      type: 'lease_payment',
      idempotency_key: `lease-pay-${lease.id}-${formatPeriod(periodEnd)}`,
      entries: [
        { account_code: '6910', debit_minor: interestExpense, credit_minor: 0n },      // interest expense
        { account_code: '2510', debit_minor: principalPayment, credit_minor: 0n },     // reduce liability
        { account_code: '1010', debit_minor: 0n, credit_minor: lease.monthly_payment_minor }, // cash out
      ],
    },
  ];
}
```
