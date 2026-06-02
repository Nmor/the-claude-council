---
name: ifrs-gaap-reporting
description: Financial statement preparation under IFRS and US GAAP — Balance Sheet, Income Statement, Cash Flow, Statement of Changes in Equity, revenue recognition (IFRS 15 / ASC 606), leases (IFRS 16 / ASC 842), the key IFRS↔GAAP differences, and the engineering-side patterns for producing audit-quality reports from the general ledger.
---

# IFRS / GAAP Reporting

> Standards: **IFRS Foundation Standards (IAS + IFRS, currently IAS 1, IAS 2, IAS 7, IAS 8, IAS 12, IAS 16, IAS 19, IAS 36, IAS 38, IFRS 9, IFRS 15, IFRS 16, IFRS 17, IFRS 18)**, **FASB Accounting Standards Codification (ASC) — ASC 105, ASC 205, ASC 230, ASC 250, ASC 326, ASC 330, ASC 350, ASC 360, ASC 606, ASC 740, ASC 805, ASC 842, ASC 944**, **AICPA Statements on Auditing Standards**, **IFRS Conceptual Framework (2018)**, **FASB Conceptual Framework (SFAC 8)**, **SEC Regulation S-X** (US listed-company financial statements), **IFRS for SMEs Standard**.

## Purpose

Financial statements are the universal language of business — how the company reports its position (balance sheet) and performance (income statement, cash flow, equity changes) to investors, lenders, tax authorities, regulators, customers, and partners. IFRS (used by 140+ countries) and US GAAP (used by the United States, Japan partially) are the two dominant frameworks; both converged significantly through the 2007-2018 joint projects but remain distinct on important topics.

This skill teaches the engineering-side patterns for producing IFRS/GAAP-compliant financial statements from the general ledger: the chart-of-accounts mapping to statement lines, the revenue recognition logic (IFRS 15 / ASC 606), the lease accounting transformation (IFRS 16 / ASC 842), period-close mechanics, consolidation patterns, and the IFRS↔GAAP differences that matter for cross-border systems. The skill builds on `bookkeeping-patterns` — that one defines the ledger; this one renders it into statements.

The reporting layer is where finance, accounting, audit, and engineering meet. Engineering owns the systems that produce the data; finance owns the interpretation and the policy choices; auditors verify the outcome; regulators (SEC, IFRS-IOSCO, ESMA, tax authorities) enforce it. Getting the engineering right means finance closes faster, auditors find less, and the company can move with confidence.

## Standards Cited

- **IFRS Conceptual Framework for Financial Reporting (2018)** — objective + qualitative characteristics
- **IAS 1** Presentation of Financial Statements
- **IAS 2** Inventories
- **IAS 7** Statement of Cash Flows
- **IAS 8** Accounting Policies, Changes in Accounting Estimates and Errors
- **IAS 12** Income Taxes
- **IAS 16** Property, Plant and Equipment
- **IAS 36** Impairment of Assets
- **IAS 38** Intangible Assets
- **IFRS 9** Financial Instruments (including expected credit loss model)
- **IFRS 15** Revenue from Contracts with Customers (effective 2018; aligned with ASC 606)
- **IFRS 16** Leases (effective 2019)
- **IFRS 17** Insurance Contracts (effective 2023)
- **IFRS 18** Presentation and Disclosure in Financial Statements (effective 2027; replaces IAS 1)
- **ASC 105** GAAP hierarchy
- **ASC 205** Presentation of Financial Statements
- **ASC 230** Statement of Cash Flows
- **ASC 250** Accounting Changes and Error Corrections
- **ASC 326** Credit Losses (CECL, effective 2020)
- **ASC 330** Inventory
- **ASC 350** Intangibles — Goodwill and Other
- **ASC 360** Property, Plant, and Equipment
- **ASC 606** Revenue from Contracts with Customers (effective 2018)
- **ASC 740** Income Taxes
- **ASC 805** Business Combinations
- **ASC 842** Leases (effective 2019)
- **AICPA SAS 145** Identifying and Assessing the Risks of Material Misstatement
- **PCAOB AS 1101** Audit Risk
- **SEC Regulation S-X** (US listed-company statements)

## When to Fire

- Building the period-end financial statement generation pipeline (BS, IS, CF, equity)
- Implementing revenue recognition logic (subscription, multi-element contracts, milestones)
- Setting up the lease accounting (right-of-use asset, lease liability)
- Cross-border systems where US GAAP and IFRS both apply
- Mapping ledger accounts to financial statement line items (account mapping)
- Implementing inventory valuation (FIFO / weighted average / LIFO — LIFO permitted under US GAAP only)
- Computing depreciation / amortization across the asset register
- Goodwill / intangible asset impairment testing
- Provision calculations (warranties, returns, deferred tax)
- Group reporting / consolidation (intercompany eliminations)
- Restating prior-period figures after error discovery (IAS 8 / ASC 250)
- First-time IFRS adoption (IFRS 1) or IFRS-to-GAAP / GAAP-to-IFRS conversion
- IPO readiness (S-1 / F-1 filings)
- Internal management reporting vs external statutory reporting differences
- Tax provision (deferred tax, current tax, ETR computation)

## Core Patterns

### Pattern 1: Account-to-statement-line mapping

The chart of accounts (from `bookkeeping-patterns`) needs a mapping to the BS / IS / CF line items. Maintain it as data, not code:

```sql
CREATE TABLE statement_line_mappings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework       TEXT NOT NULL CHECK (framework IN ('ifrs', 'gaap')),
    statement       TEXT NOT NULL CHECK (statement IN ('balance_sheet', 'income_statement', 'cash_flow', 'equity')),
    line_item       TEXT NOT NULL,                   -- e.g., 'Property, plant and equipment'
    line_order      INTEGER NOT NULL,                -- presentation order
    account_codes   TEXT[] NOT NULL,                 -- accounts that roll up to this line
    sign            TEXT NOT NULL CHECK (sign IN ('positive', 'negative')),  -- contra accounts negative
    parent_line     UUID REFERENCES statement_line_mappings(id),
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    UNIQUE(framework, statement, line_item, effective_from)
);
```

Examples of statement line items + their account roll-ups for a SaaS company:

**Balance Sheet (IFRS — IAS 1 §54)**
```
ASSETS
  Non-current assets
    Property, plant and equipment       → 1710 - 1720
    Right-of-use assets                  → 1730 - 1740      (IFRS 16)
    Intangible assets                    → 1800 - 1810
    Deferred tax assets                  → 1900
  Current assets
    Cash and cash equivalents            → 1000-1099
    Trade receivables                    → 1200 - 1220
    Contract assets                       → 1230            (IFRS 15)
    Prepaid expenses                     → 1500

EQUITY AND LIABILITIES
  Equity
    Share capital                        → 3000
    Share premium                        → 3100
    Retained earnings                    → 3200, 3900
  Non-current liabilities
    Lease liabilities — non-current       → 2510            (IFRS 16)
    Deferred tax liabilities              → 2700
  Current liabilities
    Trade payables                        → 2000
    Accrued expenses                      → 2100
    Tax payables                          → 2200-2299
    Deferred revenue                      → 2300-2399       (IFRS 15: contract liability)
    Lease liabilities — current           → 2520
    Customer wallet balances              → 2400 (marketplace)
```

**Income Statement (IFRS — IAS 1 §82)**
```
Revenue                                  → 4000-4099
Cost of sales                            → 5000-5099
Gross profit                             → (computed)
Operating expenses
  Selling and marketing                  → 6100-6199
  General and administrative             → 6200-6299
  Research and development               → 6300-6399
Operating profit                         → (computed)
Finance income                           → 4910, 4920
Finance costs                            → 6910, 6920
Profit before tax                        → (computed)
Income tax expense                       → 7000
Profit for the period                    → (computed)
```

The mapping changes when standards evolve (new IFRS, new ASC). Versioning via `effective_from` / `effective_to` lets prior periods reproduce using the then-current mapping.

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

Variable consideration (volume discounts, refund rights, performance bonuses) requires constraining the recognised amount to the portion highly probable of not reversing.

### Pattern 3: Lease accounting (IFRS 16 / ASC 842)

The 2019 lease standards eliminated operating lease off-balance-sheet treatment. Every lease > 12 months produces:

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

### Pattern 4: Statement of Cash Flows (IAS 7 / ASC 230)

Three categories: Operating, Investing, Financing. Two methods to present operating: direct (line by line of cash receipts/payments) or indirect (start with profit, adjust for non-cash + working capital changes).

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

The validation `opening + net change = closing` must hold exactly. If it doesn't, working-capital signs or cash classification is wrong.

### Pattern 5: IFRS ↔ GAAP differences that matter

Many differences are immaterial in practice; these aren't:

| Topic | IFRS | US GAAP |
| --- | --- | --- |
| **Inventory — LIFO** | Prohibited | Permitted |
| **Inventory write-downs** | Reversible to original cost if recovery | Cannot reverse (LCM permanent) |
| **Development costs** | Capitalised when criteria met (IAS 38) | Generally expensed (ASC 730) except limited cases |
| **Component depreciation** | Required for material components (IAS 16) | Not required |
| **Asset impairment** | One-step test using recoverable amount (IAS 36) | Two-step test using undiscounted then discounted (ASC 360) |
| **Goodwill** | Annual impairment test; no amortisation | Annual impairment OR amortisation for private companies (ASC 350) |
| **Leases lessee** | Single model — all on BS (IFRS 16) | Operating + finance distinction (ASC 842) but both on BS |
| **Convertible instruments** | Split between debt + equity (IAS 32) | Generally classified entirely as debt (ASC 470) |
| **Provisions for restructuring** | When announced (IAS 37) | When committed + announced (ASC 420) |
| **Statement of comprehensive income** | OCI items reclassifiable (e.g., FX, cash flow hedges) | Similar classification but item-by-item differs |
| **Reversed prior-period error** | Restate via opening retained earnings (IAS 8) | Similar (ASC 250) |
| **Investments in associates** | Equity method mandatory (IAS 28) | Equity method or fair value (ASC 323) |

For dual-reporting entities (e.g., a US-headquartered company with EU subsidiaries reporting under IFRS), engineering may need to maintain parallel ledger views or sub-ledgers reflecting each framework.

### Pattern 6: Consolidation + intercompany eliminations

Group reporting requires consolidating subsidiaries:

```sql
CREATE TABLE consolidated_entities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name      TEXT NOT NULL,
    country         TEXT NOT NULL,
    functional_currency TEXT NOT NULL,
    ownership_pct   NUMERIC(5, 2) NOT NULL,  -- 100.00 for wholly-owned
    consolidation_method TEXT CHECK (consolidation_method IN ('full', 'equity', 'proportional')),
    parent_entity_id UUID REFERENCES consolidated_entities(id),
    effective_from  DATE NOT NULL,
    effective_to    DATE
);

-- Intercompany transactions tagged + eliminated at consolidation
CREATE TABLE intercompany_balances (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id      UUID NOT NULL REFERENCES consolidated_entities(id),
    to_entity_id        UUID NOT NULL REFERENCES consolidated_entities(id),
    period              TEXT NOT NULL,
    amount_minor        BIGINT NOT NULL,
    currency            TEXT NOT NULL,
    nature              TEXT NOT NULL,         -- 'trade', 'loan', 'management_fee', 'royalty'
    elimination_journal_id UUID REFERENCES journals(id)
);
```

At consolidation: eliminate intercompany A/R against A/P, intercompany revenue against intercompany expense, intercompany loans, intercompany profit in inventory.

### Pattern 7: Restating prior periods (IAS 8 / ASC 250)

When a material error is discovered, restate retrospectively. Engineering pattern:

- Re-run the period's journals with corrections
- Generate restated comparative statements
- Maintain audit trail showing what changed + why
- Disclose the nature, amount per affected line, and impact on prior-period EPS

Voluntary changes in accounting policy (e.g., switching inventory cost method) follow the same retrospective application unless a specific transition rule allows prospective.

## Anti-Patterns

### Anti-Pattern 1: Statement generation as a one-off SQL query

A 200-line SQL query that computes the balance sheet by hardcoding account codes breaks every time accounts are added. Use the mapping table; aggregate via configuration; the statement code becomes data-driven and resilient to chart-of-accounts evolution.

### Anti-Pattern 2: Revenue = cash received

ASC 606 / IFRS 15 explicitly separate cash receipts from revenue. Annual subscriptions paid upfront are a contract liability, not revenue, until the service is delivered. Conflating these violates the most-audited standard since both standards became effective in 2018.

### Anti-Pattern 3: Lease accounting in Excel

The lease amortisation schedule needs to live in a system, not a spreadsheet. Lease modifications, renewals, terminations, lessor concessions during periods like COVID — all require re-measurement. Spreadsheet-driven lease accounting fails the second audit cycle.

### Anti-Pattern 4: Cash flow as a manual reconciliation

The cash flow statement built by hand each month is fragile and slow. Generate it from the ledger using the indirect method formula; validate `opening + net change = closing`; close the period only when validation passes.

### Anti-Pattern 5: Maintaining two separate ledgers for IFRS + GAAP

Dual-reporting entities don't need two ledgers; they need adjustment journals + parallel views. Local subsidiary books in local GAAP + group adjustment journals to IFRS = clean consolidation. Two completely separate ledgers diverge over time and produce reconciliation nightmares.

### Anti-Pattern 6: Ignoring expected credit losses (IFRS 9 / ASC 326)

Both frameworks moved from incurred-loss to expected-loss models. A `trade_receivables` balance without an allowance for credit losses (ECL under IFRS 9, CECL under ASC 326) understates the loss exposure. Engineering supplies the data; finance computes the expected loss; the allowance is posted as a contra-asset.

### Anti-Pattern 7: Reporting prematurely

Closing the period in 2 days might feel like an achievement, but if it requires skipping reconciliations + accruals + tax provisions, the statements are wrong. A 5-day close with full evidence + reconciliation beats a 2-day close with restated quarterlies six months later.

## Verification Checklist

- [ ] Statement line mapping table maintained with effective dates
- [ ] Chart of accounts versions + re-mapping tested
- [ ] Balance sheet, income statement, cash flow generation automated
- [ ] Cash flow validates: opening + net change == closing cash
- [ ] Revenue recognition follows IFRS 15 / ASC 606 5-step model
- [ ] Deferred revenue (contract liability) separately presented
- [ ] Contract assets identified + presented separately from receivables
- [ ] Performance obligations + recognition methods documented per contract
- [ ] Lease register with right-of-use asset + lease liability per lease
- [ ] Lease amortisation schedule auto-generated + tested for modifications
- [ ] Expected credit losses (ECL/CECL) computed + posted
- [ ] Inventory valuation method documented + applied consistently
- [ ] Fixed asset register with depreciation policy + accumulated depreciation
- [ ] Goodwill + intangible impairment tested annually
- [ ] Intercompany transactions tagged + eliminated at consolidation
- [ ] Multi-currency: functional vs presentation currency translated per IAS 21
- [ ] Tax provision (current + deferred) computed + posted
- [ ] Disclosures collected (accounting policies, segment, related party, subsequent events)
- [ ] IFRS↔GAAP reconciliation maintained if dual reporting
- [ ] Restatement protocol documented (IAS 8 / ASC 250)
- [ ] Statement formats tested against auditor's PBC (Prepared by Client) list
- [ ] Auditor walkthrough of generation pipeline documented
- [ ] Sample audit trace: a customer contract → performance obligations → revenue → cash

## Cross-References

- `~/.claude/skills/bookkeeping-patterns/SKILL.md` — the ledger foundation this skill builds on
- `~/.claude/skills/fp-and-a/SKILL.md` — forecasting + variance against actuals
- `~/.claude/skills/soc2-readiness/SKILL.md` — controls around financial reporting
- `~/.claude/skills/iso27001-controls/SKILL.md` — A.5.34 (Privacy of accounting records)
- `~/.claude/rules-library/common/data-retention.md` — financial records retention (typically 7-10 years)
- `~/.claude/rules-library/common/audit-logging.md` — restatement audit trail
- Council Division 10 (Finance & FinOps) — engaged on every reporting change
- IFRS Foundation: ifrs.org (free access to standards summaries; paid for full text)
- FASB: fasb.org (codification access free; XBRL taxonomies)
- IFRS Interpretations Committee (IFRIC) updates
- FASB Emerging Issues Task Force (EITF)

## Why This Skill Exists

Financial statements are not optional. Every operating company produces them — for taxes, for lenders, for investors, for boards, for regulators. The question is whether the statements are produced reliably and on time, or whether they're a heroic manual reconciliation each period.

The economic case for getting this right at engineering time: companies that close in 5 days versus 25 days have fundamentally different operating tempos. Faster close = faster business decisions = faster reaction to opportunities and threats. Slower close = decisions made on stale data, finance team burnout, repeated audit findings about prior-period adjustments.

The compliance case is even sharper. ASC 606 / IFRS 15 violations are the most-cited revenue recognition errors in SEC enforcement actions (2018-present). IFRS 16 / ASC 842 lease accounting requires significant re-measurement on modifications. ECL under IFRS 9 and CECL under ASC 326 changed the entire framework of credit loss recognition in 2018-2020. Every quarter brings new IFRIC interpretations, new EITF consensus, new SEC comment letters.

Engineering teams that treat financial reporting as "finance's problem" produce systems that finance cannot use — that require massive Excel post-processing, that miss revenue under the 5-step model, that fail to recognise lease modifications, that can't restate cleanly when errors are discovered. Engineering teams that internalise the standards build systems that finance can run themselves, that auditors can walk through transparently, that survive accounting standard changes without rewrites.

This skill exists to bridge that gap. The standards are public and stable. The patterns for translating them to code are well-understood. The systems that follow the patterns close on time, satisfy auditors, and produce statements the board, the bankers, and the regulators can trust. When the auditor asks "show me how you recognise revenue on this contract", the answer is the performance-obligation record + the monthly recognition journal + the contract-liability rollforward — generated by the same system that signed the contract. That's the bar.

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
- Revenue recognised on payment instead of performance-obligation satisfaction (IFRS 15 / ASC 606 5-step violation)
- Lease modification not re-measured (IFRS 16 / ASC 842 — RoU asset + lease liability drift)
- ECL / CECL not updated quarterly (IFRS 9 / ASC 326 — credit-loss recognition gap)
- Foreign currency monetary item not retranslated at closing rate (IAS 21)
- Deferred-tax position not maintained (IAS 12 / ASC 740)
- Going-concern assessment ad-hoc instead of structured (IAS 1)
- Restatement triggered without proper prior-period adjustment journals
- Cash flow statement reconciliation breaks (operating activities reconciliation)
- Segment reporting not aligned with CODM management view (IFRS 8 / ASC 280)
- New standard (e.g., IFRIC interpretation, new EITF consensus) not assessed for impact

**Refinement candidates**:
- New standard mapping row when IASB / FASB issues new pronouncement
- New cross-reference when a sister skill (bookkeeping-patterns, fp-and-a, valuation-models) adds a reporting gate
- New journal template when a new revenue / lease / instrument shape emerges
- Tightening of the IFRS↔GAAP difference table when convergence projects ship
