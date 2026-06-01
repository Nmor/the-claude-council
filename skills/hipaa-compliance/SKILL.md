---
name: hipaa-compliance
description: Principal-level guidance for HIPAA Privacy + Security + Breach Notification + HITECH + 42 CFR Part 2 compliance — BAAs, minimum-necessary, ePHI encryption, audit controls, breach 60-day clock, OCR enforcement. Sister to gdpr-ccpa-compliance, audit-logging, data-retention, security.
---

# HIPAA Compliance

> One-line mission: every byte of electronic Protected Health
> Information (ePHI) the system touches lives under a documented
> control set that survives an OCR audit, an HHS investigation,
> and a covered-entity Business Associate review.

## Purpose

Principal-level guidance for any system that creates, receives,
maintains, or transmits ePHI on behalf of a Covered Entity (CE)
or as a Business Associate (BA). Covers the HIPAA Privacy Rule
(45 CFR Part 164 Subpart E), Security Rule (45 CFR Part 164
Subpart C), Breach Notification Rule (45 CFR Part 164 Subpart D),
HITECH Act amendments, the Omnibus Rule (2013), 42 CFR Part 2
substance-use-disorder records, and the ONC interoperability +
information-blocking rules under the 21st Century Cures Act.

Applies to: telehealth platforms, EHR / EMR systems, mHealth apps,
clinical decision support, medical-device data platforms, health
analytics, wellness apps that integrate with HealthKit /
Health Connect, billing / RCM systems, claims processors, health
insurance portals, employer-sponsored health plans, and any
SaaS that processes ePHI on a CE's behalf.

**Out of scope (deliberate)**:
- Clinical-data interoperability (FHIR / HL7 / USCDI) — covered
  by `clinical-data-patterns`
- General data privacy (GDPR / CCPA) — covered by
  `gdpr-ccpa-compliance`
- General security baseline — covered by `security` (the rule)
  and `owasp-asvs` (the skill)
- FDA SaMD device regulation — separate domain
- Drug-pricing transparency (Hospital Price Transparency Rule,
  Transparency in Coverage Rule) — separate scope

## Standards Cited

- **HIPAA Privacy Rule** — 45 CFR §164.500–§164.534
- **HIPAA Security Rule** — 45 CFR §164.302–§164.318
- **HIPAA Breach Notification Rule** — 45 CFR §164.400–§164.414
- **HIPAA Enforcement Rule** — 45 CFR Part 160 Subpart C-E
- **HITECH Act** — Pub. L. No. 111-5, Title XIII (2009)
- **Omnibus Rule** — 78 FR 5566 (Jan 25, 2013)
- **HIPAA Privacy Rule NPRM** (in flight 2024-2026) — 89 FR 26000
- **42 CFR Part 2** — Confidentiality of Substance Use Disorder
  Patient Records (revised 2024 to align with HIPAA)
- **21st Century Cures Act** — Pub. L. No. 114-255 (2016)
- **ONC Final Rule (Cures Act)** — 45 CFR Part 170 (information
  blocking, API access, USCDI)
- **NIST SP 800-66 Rev 2** — Implementing the HIPAA Security Rule
  (Feb 2024)
- **NIST SP 800-53 Rev 5** — control catalogue (control mapping
  to HIPAA)
- **NIST SP 800-111** — encryption at rest guidance
- **NIST SP 800-52 Rev 2** — TLS guidance
- **HHS OCR Guidance** — de-identification (Safe Harbor + Expert
  Determination), risk analysis, encryption + decryption,
  audit controls
- **State health-privacy laws** — CA CMIA (Cal Civ Code §§56),
  TX HB 300, WA My Health My Data Act (2024), NY SHIELD Act,
  IL HIPAA-equivalent
- **GINA** — Genetic Information Nondiscrimination Act (when
  genetic data in scope)
- **CLIA + CLIA-waived** — when lab data in scope

## When to Fire

File path triggers:
- `**/health/**`, `**/clinical/**`, `**/patient/**`,
  `**/medical/**`, `**/ehr/**`, `**/emr/**`, `**/telehealth/**`,
  `**/fhir/**`, `**/hl7/**`, `**/dicom/**`, `**/phi/**`,
  `**/ephi/**`, `**/hipaa/**`, `**/baa/**`
- Imports / SDK use: `@google-cloud/healthcare`, `aws-sdk` (HCLS
  services: Comprehend Medical, HealthLake, HealthOmics),
  `azure-healthcare-apis`, `fhir.js`, `fhir-kit-client`,
  `hapi-fhir`, `redoxengine`, `1up-health`, `particle.health`

Keyword triggers:
- "PHI", "ePHI", "HIPAA", "BAA", "Business Associate",
  "Covered Entity", "minimum necessary", "treatment / payment /
  operations (TPO)", "Notice of Privacy Practices", "NPP",
  "authorization", "de-identification", "Safe Harbor",
  "Expert Determination", "limited data set", "breach", "OCR",
  "HHS investigation", "42 CFR Part 2", "substance use disorder",
  "information blocking", "Cures Act"

Change-scope triggers:
- Any new health-data ingestion / export path
- Any new third-party processor handling PHI
- Any AI / ML training on patient data
- Any new authentication flow for clinicians / patients
- Any new audit-log surface for PHI access
- Any breach detection or notification flow

## Core Patterns

### Pattern 1: Identify scope — CE vs BA vs Subcontractor BA

The first question on every health-data project:
- **Covered Entity (CE)**: health plans, healthcare providers
  that transmit health info electronically, healthcare
  clearinghouses
- **Business Associate (BA)**: anyone who performs functions
  involving PHI on behalf of a CE (SaaS vendor, hosting, billing
  service, etc.)
- **Subcontractor BA**: cloud infrastructure, sub-processors of
  a BA — also bound by HIPAA, requires their own BAA

Document scope in `docs/hipaa-scope.md`: which party you are,
which CEs you serve, which BAs / subcontractors you use, BAA
status (signed / expired / pending).

### Pattern 2: Business Associate Agreement (BAA) — non-negotiable

Every BA-CE relationship and every BA-Subcontractor relationship
MUST have a signed BAA before any ePHI flows. Per §164.504(e)(2):
- Permitted uses + disclosures
- Safeguards (administrative, physical, technical)
- Subcontractor BAA flow-down
- Breach notification (typically 60-day inner deadline)
- Termination clauses
- Return / destruction of PHI on termination

AWS / Azure / GCP all sign BAAs for their HIPAA-eligible services.
Use ONLY HIPAA-eligible services from the cloud provider's
published list (AWS list: 175+ services; verify with the BAA
addendum). Non-eligible services = PHI must not touch them.

### Pattern 3: Minimum Necessary

§164.502(b) — limit PHI use / disclosure / request to the
minimum necessary for the purpose. Engineering implications:
- Field-level access control (RBAC + ABAC) — clinicians see
  full chart; billing sees only billing-relevant fields; intake
  sees demographics only
- API response filtering — DON'T return the whole patient record
  if the caller asked for the address
- Logging — never log full PHI; log identifiers + operation
- Reporting — aggregate / de-identified when possible

Exceptions: treatment, individual request, authorization, required
by law. Minimum-necessary doesn't apply to TPO between CEs.

### Pattern 4: Encryption + addressable safeguards

The Security Rule distinguishes "Required" from "Addressable"
specifications. Addressable does NOT mean optional — it means
"implement OR document why an alternative is equivalent":

| Spec | Type | Implementation |
| --- | --- | --- |
| §164.312(a)(2)(iv) Encryption at rest | Addressable | AES-256-GCM via KMS; per-tenant key where feasible |
| §164.312(e)(2)(ii) Encryption in transit | Addressable | TLS 1.2+ everywhere; HSTS; certificate pinning for mobile |
| §164.312(a)(2)(i) Unique user IDs | Required | No shared accounts; SSO with audit |
| §164.312(a)(2)(iii) Auto logoff | Addressable | Session timeout ≤ 15 min for clinician portals |
| §164.312(b) Audit controls | Required | Per `audit-logging.md` — every PHI access logged |
| §164.312(c) Integrity controls | Required | Hash-chained audit log; tamper-evident |
| §164.312(d) Person / entity authentication | Required | MFA mandatory for any PHI access |

Encryption is the safe harbor under the Breach Notification Rule
— properly-encrypted ePHI that's exfiltrated does NOT trigger
breach notification (45 CFR §164.402, OCR Guidance 74 FR 19006).

### Pattern 5: De-identification — Safe Harbor vs Expert Determination

To use PHI for research, ML training, or analytics WITHOUT
authorization, the data must be de-identified per §164.514(b):

**Safe Harbor** (§164.514(b)(2)): remove 18 specific identifiers:
1. Names
2. Geographic subdivisions smaller than state (except first 3
   digits of ZIP if population > 20,000)
3. All elements of dates (except year) related to an individual
4. Telephone numbers
5. Fax numbers
6. Email addresses
7. SSN
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate / license numbers
12. Vehicle identifiers + license plates
13. Device identifiers + serial numbers
14. URLs
15. IP addresses
16. Biometric identifiers
17. Full-face photographs + comparable images
18. Any other unique identifying number / characteristic / code

PLUS: no actual knowledge that the remaining info could
re-identify the individual.

**Expert Determination** (§164.514(b)(1)): a qualified
statistician determines the re-identification risk is "very
small". Required when you need date-of-service or 5-digit ZIP
for analytical utility.

**Limited Data Set** (§164.514(e)) — stripped of most direct
identifiers, but may retain dates + ZIP + city; requires a
Data Use Agreement.

### Pattern 6: Audit controls — per §164.312(b)

Log EVERY PHI access event (read + write + delete + export):

```jsonc
{
  "event_id": "01HXXX...",
  "timestamp": "2026-05-30T14:32:18.342Z",
  "actor": {
    "user_id": "usr_abc",
    "role": "physician",
    "npi": "1234567890"
  },
  "subject": {
    "patient_mrn": "MRN-...",
    "ehr_record_id": "..."
  },
  "action": "read",
  "resource": "Observation",
  "purpose_of_use": "treatment",
  "context": {
    "request_id": "...",
    "trace_id": "...",
    "ip_hash": "sha256:...",
    "device_id": "...",
    "auth_method": "smart-on-fhir + mfa-totp"
  }
}
```

Audit log is append-only (per `audit-logging.md`), retained for
6 years per §164.530(j)(2), tamper-evident via hash chain.
Patient Right of Access (45 CFR §164.524) AND Accounting of
Disclosures (§164.528) both depend on this log.

### Pattern 7: Breach detection + 60-day clock

§164.404 — notify affected individuals within 60 days of
discovery. §164.406 — notify media if breach affects > 500
residents of a state. §164.408 — notify HHS Secretary within
60 days (single breach > 500 affected) OR annually (smaller
breaches).

"Discovery" = the first day a workforce member knew OR should
have known (with reasonable diligence). Clock starts then, not
when investigation concludes.

Breach = unauthorized acquisition / access / use / disclosure of
PHI. Exceptions: unintentional good-faith access by workforce,
inadvertent disclosure within a CE/BA, recipient could not
reasonably have retained the information. Otherwise: presumed
breach unless 4-factor risk assessment shows low probability of
compromise.

The runbook (per `runbook-template.md`) MUST name: the breach
classification workflow, the notification template, the
designated Privacy Officer + Security Officer contact, the
HHS OCR portal URL.

### Pattern 8: Patient rights

| Right | CFR | Engineering surface |
| --- | --- | --- |
| Notice of Privacy Practices | §164.520 | Versioned NPP page; consent timestamp |
| Access to PHI | §164.524 | "Download my chart" — 30-day SLA, machine-readable format if requested |
| Amendment | §164.526 | Patient-initiated correction workflow |
| Accounting of Disclosures | §164.528 | 6-year history of non-TPO disclosures |
| Restriction Request | §164.522 | Honour where granted (mandatory for self-pay services) |
| Confidential Communications | §164.522(b) | Alternate phone / email / address |
| Complaint | §164.530(d) | In-product complaint workflow + Privacy Officer routing |

### Pattern 9: 42 CFR Part 2 (SUD records) — stricter than HIPAA

Substance Use Disorder records have an extra layer:
- Patient written consent required for most disclosures (not
  just TPO like HIPAA)
- Specific consent revocation procedure
- Restrictions on use in legal proceedings
- 2024 alignment rule allows SUD info into TPO with single
  patient consent — but still tighter than HIPAA baseline

If the system holds SUD records (treatment centre, addiction
medicine, Medicaid-funded behavioural health), apply 42 CFR
Part 2 layered on HIPAA.

### Pattern 10: Information blocking + Cures Act

ONC Final Rule (45 CFR Part 170) prohibits "information blocking"
— interfering with access / use / exchange of electronic health
information. Eight exceptions (preventing harm, privacy, security,
infeasibility, content + manner, fees, licensing, health-IT
performance). Penalties: CMS Medicare provider exclusion, ONC
disincentives.

APIs MUST expose USCDI v3+ (now v4) via FHIR R4+ for patient
access (per §170.315(g)(10)). API access required at no cost to
patients. Read `clinical-data-patterns` for FHIR implementation.

## Anti-Patterns

### Anti-pattern 1: Cloud service used without BAA

GCP / AWS / Azure all have HIPAA-eligible service lists +
require an explicit BAA addendum. Using a non-eligible service
for PHI (e.g., AWS Translate without HIPAA addendum) is a per-se
violation regardless of how the data is handled.

### Anti-pattern 2: PHI in operational logs

Application logs are ePHI when they contain identifiers + health
context. Routing them to CloudWatch / Loki / Datadog without a
BAA + retention policy is a violation. Per `audit-logging.md` —
audit logs (separate store) hold the access trail; operational
logs are de-identified or use opaque tokens.

### Anti-pattern 3: "Minimum necessary" interpreted as "what's
in the schema"

A schema field exists ≠ disclosure is permitted. Minimum necessary
is per-purpose: a billing team's report should NOT include
diagnosis codes unless required for the claim. Build field-level
RBAC.

### Anti-pattern 4: De-identification by removing names only

Removing `first_name + last_name` from a record that retains
`dob + zip5 + gender` re-identifies ~87% of US individuals
(Sweeney 2000). Use Safe Harbor (all 18 identifiers) or Expert
Determination.

### Anti-pattern 5: BAA never reviewed for sub-processors

Your BAA flows down to subcontractors. If a sub-processor
changes (e.g., your CDN vendor swaps), the new vendor needs its
own BAA in place before PHI can route through it. Build a
quarterly subcontractor + BAA review.

### Anti-pattern 6: Encryption key shared across tenants

Per-tenant encryption keys (envelope encryption with tenant KMS
keys) limit blast radius. A breach of one tenant's encrypted
data doesn't decrypt another's. The pattern is standard on
HIPAA-eligible HCLS services (AWS HealthLake, GCP Healthcare
API).

### Anti-pattern 7: Right-of-access flow not tested

If a patient requests their data and you can't fulfil within 30
days (one 30-day extension allowed), OCR enforcement is likely.
HHS has settled cases for $5K-$150K specifically for §164.524
failures. Build + test the export flow end-to-end before launch.

### Anti-pattern 8: Treating addressable as optional

OCR investigations have repeatedly found that "addressable" was
read as "optional." If you don't implement an addressable spec,
you MUST document the alternative + why it's equivalent. Absent
documentation, OCR treats addressable as required.

## Verification Checklist

- [ ] CE / BA / Subcontractor BA scope documented in
      `docs/hipaa-scope.md`
- [ ] All BAAs signed + current; subcontractor BAAs flowed down
- [ ] Cloud services in use are on the provider's HIPAA-eligible
      list with BAA addendum signed
- [ ] All ePHI encrypted at rest (AES-256+) + in transit (TLS
      1.2+)
- [ ] Per-tenant encryption keys (envelope encryption with KMS)
- [ ] MFA required for any PHI access
- [ ] Auto-logoff implemented (session ≤ 15 min for clinician
      portals; longer with documented risk acceptance)
- [ ] RBAC + field-level ABAC for minimum-necessary
- [ ] Audit log captures every PHI access (read + write + delete
      + export) with 6-year retention
- [ ] De-identification path documented (Safe Harbor or Expert
      Determination) for analytics / ML training
- [ ] Limited Data Set + DUA workflow for research collaborations
- [ ] Patient Right of Access endpoint tested end-to-end (30-day
      SLA)
- [ ] Accounting of Disclosures endpoint queryable from audit
      log
- [ ] Breach detection alerts wired (unusual access, bulk export,
      failed auth spike)
- [ ] Breach notification runbook in place; 60-day clock + HHS
      reporting + media notification thresholds documented
- [ ] NPP versioned + tracked per patient
- [ ] Privacy Officer + Security Officer named, on-call rotation
- [ ] Annual HIPAA Security Risk Analysis (per §164.308(a)(1)(ii)(A))
      conducted + documented
- [ ] If SUD records in scope: 42 CFR Part 2 consent workflow
      implemented
- [ ] USCDI v3+ patient API exposed via FHIR R4+ (per ONC Cures
      Act)
- [ ] Workforce training: HIPAA awareness, completed annually,
      records retained
- [ ] State privacy laws (CMIA, TX HB 300, WA My Health My Data,
      etc.) mapped + delta-implemented

## Cross-References

- `clinical-data-patterns` — FHIR R5 + USCDI + HL7 v2 + SMART on
  FHIR
- `gdpr-ccpa-compliance` — GDPR Article 9 + CCPA health data
- `pci-dss-patterns` — overlap when health systems take payments
- `iso27001-controls` — Annex A control mapping to HIPAA
  Security Rule
- `soc2-readiness` — TSC + HIPAA evidence overlap
- `audit-logging.md` (rule) — append-only PHI audit trail
- `data-retention.md` (rule) — 6-year minimum for audit + PHI
- `security.md` (rule) — Security Rule technical safeguards
- `error-codes.md` (rule) — patient-facing error language
- `gdpr-ccpa.md` (rule) — Article 9 sensitive data
- Agents: `health-reviewer`, `compliance-reviewer`,
  `security-reviewer`

## Why This Skill Exists

HIPAA enforcement is mature, well-funded, and increasingly
expensive:
- **OCR enforcement settlements 2024**: > $7M aggregate
- **Penalty tiers**: $137 (didn't know) to $2,067,813 (willful
  neglect) per violation per calendar year (2025 figures, indexed
  annually)
- **Largest settlements**: Anthem $16M (2018, 78.8M records),
  Premera $6.85M (2020), Excellus $5.1M (2021), Lifespan $1.04M
  (2020)
- **Right of Access enforcement initiative** (2019-current): 47+
  settlements specifically for §164.524 failures, mostly
  $15K-$150K

Plus: state AGs can independently enforce (HITECH §13410(e));
class-action plaintiffs use breaches as basis for state
consumer-protection claims; CMS can exclude providers from
Medicare; FDA SaMD adds device-regulation overlay.

Building HIPAA-aware from day one costs design discipline. Bolting
it on after launch costs an audit, remediation, possibly an
investigation, and the credibility of the platform with covered
entities who will not sign a BAA with a vendor that hasn't done
the work.

This skill exists because health-software defects don't just cost
money — they damage trust in an industry where trust is the
foundation of patient care.

**Important disclaimer**: this skill is engineering guidance, NOT
legal advice. Engage HIPAA counsel for organization-specific
interpretation of CFR sections, state-law overlays, and
enforcement risk.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New cloud service in use for PHI without BAA addendum verified (Anti-pattern 1)
- ePHI surfacing in operational logs / metrics / traces (Anti-pattern 2; sister rule `observability.md` + `audit-logging.md`)
- Schema permits a field that the requesting role doesn't have minimum-necessary right to (Anti-pattern 3)
- De-identification ships with < 18 identifiers stripped or no Expert Determination (Anti-pattern 4)
- BAA expired / pending for a sub-processor handling PHI (BAA-flowdown gap)
- Addressable safeguard not implemented + no documented alternative (Anti-pattern 8)
- Patient Right-of-Access endpoint untested or > 30-day SLA in practice (Anti-pattern 7)
- Audit log retention < 6 years (regulatory floor breach)
- Audit log writeable / mutable (tamper-evidence weak)
- Breach detection alert thresholds (unusual access, bulk export, failed auth spike) absent
- HIPAA Risk Analysis not done in the last 12 months (§164.308 weakening)
- SUD records present without 42 CFR Part 2 consent workflow
- USCDI patient API not exposed via FHIR (ONC information-blocking exposure)
- "encrypted in transit" but TLS < 1.2 or self-signed cert used (NIST SP 800-52 weakening)

**Refinement candidates**:
- New CFR section row when HIPAA NPRM proposals finalize (2024-26 modifications)
- USCDI version row when ONC publishes v5+
- State law row when a new state passes HIPAA-overlay law (WA My Health My Data 2024 → other states 2025+)
- Penalty figure refresh when HHS updates the annual CPI adjustment
- Enforcement-initiative row when OCR announces a new focus (Right of Access → next focus likely audit-controls / risk-analysis)
- Cross-reference deepening when sister skill (`clinical-data-patterns`, `gdpr-ccpa-compliance`) gains a HIPAA-overlapping pattern

---

*Last verified: 2026-05-30. Standards refresh cadence: 12 months for CFR + HHS guidance; 6 months for ONC USCDI; quarterly for state-law overlays.*
