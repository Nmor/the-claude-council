# IFRS / GAAP Reporting — Framework Differences

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the IFRS-to-US-GAAP differences that are material in practice, as a topic-by-topic table,
plus what dual-reporting entities need from engineering. Pointed at by the SKILL.md Core Patterns
row "Pattern 5: IFRS ↔ GAAP differences that matter".

## Core Patterns

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

For dual-reporting entities (e.g., a US-headquartered company with EU subsidiaries reporting under
IFRS), engineering may need to maintain parallel ledger views or sub-ledgers reflecting each
framework.
