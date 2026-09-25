# ferpa-coppa-compliance: Dpas and state law

> The contracts and state-law overlays governing vendor access to student data. Pointed at by the
> SKILL.md rows "Pattern 7" and "Pattern 10".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 7: Data Privacy Agreements (DPAs)

The contract between a covered entity (school / LEA / district) and a service provider is the legal
vehicle that makes FERPA's "School Official Exception" valid. Required DPA elements:

- Service provider acts under the "direct control" of the LEA
- Subject to the same FERPA restrictions
- Specifies what data is shared, for what purpose, retention, deletion
- Prohibits secondary use / sale
- Limits subcontractor disclosure
- Defines data-security requirements
- Defines incident-notification requirements
- Defines parent + student rights (access, correction, deletion)
- Includes termination + data-destruction clause

Multiple model DPAs exist:

- **NDPA (National Data Privacy Agreement)** — Student Data Privacy Consortium (SDPC) — most-adopted
  in US K-12
- **CSDPA (California Student Data Privacy Agreement)**
- **MEC-NDPA** — multi-LEA executable
- **State-specific** — NY Education Law §2-d Parent's Bill of Rights addendum; CT-specific addendum

Engineering: the contract has DATA RESIDENCY + RETENTION + DELETION clauses that drive technical
implementation. Wire your platform's per-tenant config to reflect each LEA's specific DPA terms
(retention period, sub-processor allowlist, regional storage).

## Pattern 10: New York Education Law §2-d (the toughest state law)

NY §2-d + 8 NYCRR Part 121 set the strictest US student-privacy floor:

- **Parent Bill of Rights** must accompany every contract
- **No sale** of PII (broader than COPPA — applies to ALL students, not just under-13)
- **No use** of PII for marketing
- **No use** for predictive analytics that affect students without explicit district authorisation
- **Annual privacy compliance** reports to NYSED
- **Data-security standards** (NIST CSF aligned)
- **Breach notification** within 7 days of discovery to district + NYSED + affected parents
- **Encryption at rest + in transit** — explicit requirement
- **NIST 800-53 Moderate-Baseline-aligned** controls
- **Annual penetration testing** required

If you sell to any NY school district, your platform must meet NY §2-d standards globally — you
cannot run a "NY-only" stripped-down profile.
