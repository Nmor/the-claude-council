---
name: ifrs-gaap-reporting
description: Financial statement preparation under IFRS and US GAAP — Balance Sheet, Income Statement, Cash Flow, Statement of Changes in Equity, revenue recognition (IFRS 15 / ASC 606), leases (IFRS 16 / ASC 842), the key IFRS↔GAAP differences, and the engineering-side patterns for producing audit-quality reports from the general ledger.
---

# IFRS / GAAP Reporting

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Standards: **IFRS Foundation Standards (IAS + IFRS, currently IAS 1, IAS 2, IAS 7, IAS 8, IAS 12,
> IAS 16, IAS 19, IAS 36, IAS 38, IFRS 9, IFRS 15, IFRS 16, IFRS 17, IFRS 18)**, **FASB Accounting
> Standards Codification (ASC) — ASC 105, ASC 205, ASC 230, ASC 250, ASC 326, ASC 330, ASC 350, ASC
> 360, ASC 606, ASC 740, ASC 805, ASC 842, ASC 944**, **AICPA Statements on Auditing Standards**,
> **IFRS Conceptual Framework (2018)**, **FASB Conceptual Framework (SFAC 8)**, **SEC Regulation
> S-X** (US listed-company financial statements), **IFRS for SMEs Standard**.

## Purpose

Financial statements are the universal language of business — how the company reports its position
(balance sheet) and performance (income statement, cash flow, equity changes) to investors, lenders,
tax authorities, regulators, customers, and partners. IFRS (used by 140+ countries) and US GAAP
(used by the United States, Japan partially) are the two dominant frameworks; both converged
significantly through the 2007-2018 joint projects but remain distinct on important topics.

This skill teaches the engineering-side patterns for producing IFRS/GAAP-compliant financial
statements from the general ledger: the chart-of-accounts mapping to statement lines, the revenue
recognition logic (IFRS 15 / ASC 606), the lease accounting transformation (IFRS 16 / ASC 842),
period-close mechanics, consolidation patterns, and the IFRS↔GAAP differences that matter for
cross-border systems. The skill builds on `bookkeeping-patterns` — that one defines the ledger; this
one renders it into statements.

The reporting layer is where finance, accounting, audit, and engineering meet. Engineering owns the
systems that produce the data; finance owns the interpretation and the policy choices; auditors
verify the outcome; regulators (SEC, IFRS-IOSCO, ESMA, tax authorities) enforce it. Getting the
engineering right means finance closes faster, auditors find less, and the company can move with
confidence.

## Reference Map

This file is the routing table. Every topic's detail — the code, the schemas, the tables, the
citations — lives in `references/`, loaded only when the topic is actually in play.

| Topic | Reference file |
| --- | --- |
| Account-to-statement-line mapping (Pattern 1) | `references/statement-mapping.md` |
| Revenue recognition, IFRS 15 / ASC 606 (Pattern 2) | `references/revenue-recognition.md` |
| Lease accounting, IFRS 16 / ASC 842 (Pattern 3) | `references/lease-accounting.md` |
| Statement of Cash Flows, IAS 7 / ASC 230 (Pattern 4) | `references/cash-flow-statement.md` |
| IFRS ↔ GAAP differences (Pattern 5) | `references/ifrs-gaap-differences.md` |
| Consolidation + restatement (Patterns 6-7) | `references/consolidation-and-restatement.md` |
| Anti-patterns — the seven rejected approaches | `references/anti-patterns.md` |
| Verification checklist | `references/verification-and-compliance.md` |
| Compliance and standards mapping | `references/verification-and-compliance.md` |
| Why this skill exists | `references/rationale.md` |
| Learning hooks | `references/rationale.md` |

## Standards Cited

- **IFRS Conceptual Framework for Financial Reporting (2018)** — objective + qualitative
  characteristics
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
- Implementing inventory valuation (FIFO / weighted average / LIFO — LIFO permitted under US GAAP
  only)
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

Seven patterns, each held in full in its own reference file. Read the one the task reaches.

| Pattern | Holds | Reference file |
| --- | --- | --- |
| Pattern 1: Account-to-statement-line mapping | `statement_line_mappings` schema; IFRS balance sheet (IAS 1 §54) and income statement (IAS 1 §82) roll-ups; effective-dated mapping versions | `references/statement-mapping.md` |
| Pattern 2: Revenue recognition (IFRS 15 / ASC 606 — the 5-step model) | The 5 steps; `Contract` + `PerformanceObligation` shapes; the monthly recognition job and `computeRecognition`; variable consideration | `references/revenue-recognition.md` |
| Pattern 3: Lease accounting (IFRS 16 / ASC 842) | Right-of-use asset + lease liability; initial measurement; monthly depreciation, interest and payment journals | `references/lease-accounting.md` |
| Pattern 4: Statement of Cash Flows (IAS 7 / ASC 230) | Operating / investing / financing; the indirect-method generator; the opening + net change = closing validation | `references/cash-flow-statement.md` |
| Pattern 5: IFRS ↔ GAAP differences that matter | The topic-by-topic difference table; what dual-reporting entities need | `references/ifrs-gaap-differences.md` |
| Pattern 6: Consolidation + intercompany eliminations | `consolidated_entities` + `intercompany_balances` schemas; the elimination step | `references/consolidation-and-restatement.md` |
| Pattern 7: Restating prior periods (IAS 8 / ASC 250) | Retrospective restatement; audit trail; voluntary policy changes | `references/consolidation-and-restatement.md` |

## Anti-Patterns

All seven are held in full in `references/anti-patterns.md`, with the reasoning and the named
alternative for each.

| Anti-pattern | Rejected because |
| --- | --- |
| 1. Statement generation as a one-off SQL query | Breaks on every chart-of-accounts change; use the mapping table |
| 2. Revenue = cash received | Violates the 5-step model; upfront subscriptions are a contract liability |
| 3. Lease accounting in Excel | Modifications and re-measurement fail the second audit cycle |
| 4. Cash flow as a manual reconciliation | Fragile and slow; generate from the ledger and validate |
| 5. Maintaining two separate ledgers for IFRS + GAAP | Diverges over time; use adjustment journals + parallel views |
| 6. Ignoring expected credit losses (IFRS 9 / ASC 326) | Receivables without an ECL / CECL allowance understate loss exposure |
| 7. Reporting prematurely | A fast close that skips reconciliations produces restatements |

## Cross-References

- `~/.claude/skills/bookkeeping-patterns/SKILL.md` — the ledger foundation this skill builds on
- `~/.claude/skills/fp-and-a/SKILL.md` — forecasting + variance against actuals
- `~/.claude/skills/soc2-readiness/SKILL.md` — controls around financial reporting
- `~/.claude/skills/iso27001-controls/SKILL.md` — A.5.34 (Privacy of accounting records)
- `~/.claude/rules-library/common/data-retention.md` — financial records retention (typically 7-10
  years)
- `~/.claude/rules-library/common/audit-logging.md` — restatement audit trail
- Council Division 10 (Finance & FinOps) — engaged on every reporting change
- IFRS Foundation: ifrs.org (free access to standards summaries; paid for full text)
- FASB: fasb.org (codification access free; XBRL taxonomies)
- IFRS Interpretations Committee (IFRIC) updates
- FASB Emerging Issues Task Force (EITF)
