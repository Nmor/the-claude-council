# ferpa-coppa-compliance: Verification Checklist

> The concrete checks a student-data platform runs when this skill activates. Pointed at by the
> SKILL.md row "Verification Checklist".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Verification Checklist

- [ ] Determine FERPA status: covered entity vs school-official vendor vs out-of-scope
- [ ] If school-official: DPA signed before any student data collection
- [ ] If COPPA-covered (directed to under-13 OR actual knowledge of under-13): VPC workflow
  implemented per §312.5(b)
- [ ] COPPA 2025 Final Rule compliance: biometric protections, retention review, info-sec program,
  third-party-disclosure consent
- [ ] Age-gate is neutral (DOB or age range), prevents re-attempt
- [ ] PPRA workflow for surveys covered by 20 USC §1232h
- [ ] GDPR Art 8 age-of-consent honored per member state
- [ ] Directory-information opt-out respected per student per LEA
- [ ] Educational records distinguished from directory information in schema + access control
- [ ] Eligible-student rights (after 18 / post-secondary) override parent rights in code
- [ ] No behavioural advertising or third-party ad SDKs on student-facing screens
- [ ] Student Privacy Pledge commitments met if vendor signed
- [ ] State-specific overlays: NY §2-d + Parent Bill of Rights, CT 16-189, CA SOPIPA + AB-1584, IL
  SOPPA
- [ ] Background checks on vendor employees with student-data access per state law
- [ ] Sub-processor / third-party AI integration listed in DPA addendum
- [ ] Annual privacy compliance report filed where required (NY, CT)
- [ ] Annual penetration test where required (NY §2-d)
- [ ] Breach-notification SLA documented + tested (NY 7 days; varies by state)
- [ ] Data residency / region constraints honored per DPA
- [ ] Data-retention schedule documented + automated
- [ ] Data-deletion workflow + verification (provable destruction)
- [ ] Parent + student access / correction / deletion rights implemented
- [ ] Audit-log every access to a student record per `audit-logging.md`
- [ ] Encryption at rest + in transit (NY §2-d explicit; AES-256 / TLS 1.2+)
- [ ] CIPA compliance if E-rate-funded school is a customer (filtering / monitoring)
- [ ] If health-related: HIPAA overlay; IDEA for special-ed; FERPA for school-counselor
