# IFRS / GAAP Reporting — Statement Mapping

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the account-to-statement-line mapping: the `statement_line_mappings` table, the IFRS balance
sheet and income statement roll-ups, and effective-dated mapping versions. Pointed at by the
SKILL.md Core Patterns row "Pattern 1: Account-to-statement-line mapping".

## Core Patterns

### Pattern 1: Account-to-statement-line mapping

The chart of accounts (from `bookkeeping-patterns`) needs a mapping to the BS / IS / CF line items.
Maintain it as data, not code:

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

#### Balance Sheet (IFRS — IAS 1 §54)

```text
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

#### Income Statement (IFRS — IAS 1 §82)

```text
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

The mapping changes when standards evolve (new IFRS, new ASC). Versioning via `effective_from` /
`effective_to` lets prior periods reproduce using the then-current mapping.
