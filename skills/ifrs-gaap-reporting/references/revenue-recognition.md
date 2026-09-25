# IFRS / GAAP Reporting — Revenue Recognition

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers revenue recognition under IFRS 15 / ASC 606: the 5-step model, the contract and
performance-obligation shapes, the monthly recognition job, and variable consideration. Pointed at
by the SKILL.md Core Patterns row "Pattern 2: Revenue recognition (IFRS 15 / ASC 606 — the 5-step
model)".

## Core Patterns

### Pattern 2: Revenue recognition (IFRS 15 / ASC 606 — the 5-step model)

The 2018 converged revenue standard. Both IFRS 15 and ASC 606 are substantively identical:

1. **Identify the contract** with a customer
2. **Identify the performance obligations** in the contract
3. **Determine the transaction price**
4. **Allocate** the transaction price to the performance obligations
5. **Recognize revenue** when (or as) the entity satisfies a performance obligation

Engineering pattern: a contract object that holds performance obligations + scheduled recognition:

```typescript
interface Contract {
  id: string;
  customer_id: string;
  total_price_minor: bigint;
  currency: string;
  start_date: string;
  end_date: string;
  performance_obligations: PerformanceObligation[];
}

interface PerformanceObligation {
  id: string;
  description: string;             // e.g., "12-month SaaS subscription"
  allocated_price_minor: bigint;   // step 4
  recognition_method: 'point_in_time' | 'over_time_straight_line' | 'over_time_input' | 'over_time_output';
  start_date: string;
  end_date: string;                 // for over_time recognition
  satisfied_at?: string;            // for point_in_time
}

// Monthly job: recognise revenue for the period
async function recogniseRevenueForPeriod(period: string) {
  const periodStart = startOfMonth(period);
  const periodEnd = endOfMonth(period);

  const obligations = await db.query(`
    SELECT po.*, c.customer_id, c.currency
    FROM performance_obligations po
    JOIN contracts c ON po.contract_id = c.id
    WHERE po.start_date <= $1 AND po.end_date >= $2
       OR po.satisfied_at BETWEEN $2 AND $1
  `, [periodEnd, periodStart]);

  for (const po of obligations) {
    const recognisedAmount = computeRecognition(po, periodStart, periodEnd);
    if (recognisedAmount === 0n) continue;

    await postJournal({
      posted_at: periodEnd,
      type: 'revenue_recognition',
      description: `Recognise revenue for ${po.description}`,
      source_ref: po.id,
      idempotency_key: `rev-rec-${po.id}-${period}`,
      entries: [
        // Debit deferred revenue (reduce the contract liability)
        { account_code: '2310', debit_minor: recognisedAmount, credit_minor: 0n, currency: po.currency },
        // Credit subscription revenue
        { account_code: '4010', debit_minor: 0n, credit_minor: recognisedAmount, currency: po.currency },
      ],
    });
  }
}

function computeRecognition(
  po: PerformanceObligation,
  periodStart: Date,
  periodEnd: Date,
): bigint {
  switch (po.recognition_method) {
    case 'point_in_time':
      return po.satisfied_at &&
             new Date(po.satisfied_at) >= periodStart &&
             new Date(po.satisfied_at) <= periodEnd
        ? po.allocated_price_minor
        : 0n;

    case 'over_time_straight_line': {
      const totalDays = differenceInDays(po.end_date, po.start_date);
      const periodOverlapStart = maxDate(periodStart, po.start_date);
      const periodOverlapEnd = minDate(periodEnd, po.end_date);
      const overlapDays = differenceInDays(periodOverlapEnd, periodOverlapStart);
      if (overlapDays <= 0) return 0n;
      return (po.allocated_price_minor * BigInt(overlapDays)) / BigInt(totalDays);
    }

    case 'over_time_output':
      // Method based on outputs delivered (e.g., units shipped)
      return computeOutputBasedRecognition(po, periodStart, periodEnd);

    case 'over_time_input':
      // Method based on inputs consumed (e.g., labor hours, costs incurred)
      return computeInputBasedRecognition(po, periodStart, periodEnd);
  }
}
```

Variable consideration (volume discounts, refund rights, performance bonuses) requires constraining
the recognised amount to the portion highly probable of not reversing.
