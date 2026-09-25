# IFRS / GAAP Reporting — Consolidation and Restatement

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers group reporting — the consolidated-entity and intercompany-balance tables and the
elimination step — and retrospective restatement of prior periods under IAS 8 / ASC 250. Pointed at
by the SKILL.md Core Patterns rows "Pattern 6: Consolidation + intercompany eliminations" and
"Pattern 7: Restating prior periods (IAS 8 / ASC 250)".

## Core Patterns

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

At consolidation: eliminate intercompany A/R against A/P, intercompany revenue against intercompany
expense, intercompany loans, intercompany profit in inventory.

### Pattern 7: Restating prior periods (IAS 8 / ASC 250)

When a material error is discovered, restate retrospectively. Engineering pattern:

- Re-run the period's journals with corrections
- Generate restated comparative statements
- Maintain audit trail showing what changed + why
- Disclose the nature, amount per affected line, and impact on prior-period EPS

Voluntary changes in accounting policy (e.g., switching inventory cost method) follow the same
retrospective application unless a specific transition rule allows prospective.
