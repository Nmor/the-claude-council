# IFRS / GAAP Reporting — Verification and Compliance Mapping

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the assurance surface: the period-close verification checklist run before any reporting
claim, and the compliance and standards mapping for the regimes a reporting system sits inside.
Pointed at by the SKILL.md Reference Map rows "Verification checklist" and "Compliance and
standards mapping".

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
