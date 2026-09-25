# Verification Checklist and Compliance Mapping

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the concrete green/red checks an FP&A engineering surface must pass, plus the regulatory and
standards mapping those checks sit under. Pointed at by the **Verification checklist** and
**Compliance mapping** rows of the Reference Map in `SKILL.md`.

## Verification Checklist

- [ ] Budget vs actual variance generated from ledger automatically
- [ ] Variance commentary captured + linked to material lines
- [ ] Forecast pipeline runs at least monthly
- [ ] Drivers documented + versioned
- [ ] Sensitivity analysis available per major driver
- [ ] SaaS metrics definitions documented + versioned in metric dictionary
- [ ] MRR roll-forward chart auto-generated per period
- [ ] NRR / GRR computed per cohort + company-aggregate
- [ ] CAC / LTV / payback / magic number / Rule of 40 dashboarded
- [ ] Cohort retention triangle generated + visualised
- [ ] 13-week cash forecast updated at least weekly
- [ ] Treasury alerts on projected cash below operating minimum
- [ ] Scenario branches modelled (base / upside / downside)
- [ ] Long-range plan grounded in capacity constraints
- [ ] Board deck data sources versioned + reproducible
- [ ] FP&A team can self-serve (engineering doesn't bottleneck routine analysis)
- [ ] Forecast accuracy tracked over time (compare to actuals)
- [ ] Departmental cost ownership defined + reviewed quarterly
- [ ] Headcount plan reconciled to HRIS quarterly
- [ ] Cloud cost allocated to product / department for unit economics
- [ ] Customer-level profitability available (revenue − COGS − allocated S&M − support)

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
