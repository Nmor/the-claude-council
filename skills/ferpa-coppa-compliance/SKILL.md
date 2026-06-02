---
name: ferpa-coppa-compliance
description: Principal-level guidance for FERPA (20 USC §1232g), COPPA (15 USC §6501-6506 + 16 CFR Part 312 + 2025 FTC Final Rule), GDPR-K (Art 8), CIPA, state student-privacy laws (SOPIPA, NY Ed Law 2-d, Student Privacy Pledge), and platform compliance for K-12 + higher-ed + edtech. Sister to gdpr-ccpa-compliance, hipaa-compliance (where school-based health), audit-logging, data-retention.
---

# FERPA / COPPA / Student Privacy Compliance

> Not legal advice. Engineering implementation of student-privacy regimes — operationalising the controls. Final interpretation rests with school district counsel, state attorneys-general guidance, FTC + Department of Education enforcement actions, and (for SEAs/LEAs) the institution's Senior Agency Official for Privacy.

## Purpose

US K-12 and higher-education software operates under the strictest student-data-privacy regime in the United States: FERPA + COPPA + state laws + voluntary frameworks like the Student Privacy Pledge. International expansions add GDPR-K (Art 8 children), UK Age-Appropriate Design Code, and California AB-1584. This skill maps the regulatory surface to concrete engineering controls so a product team building an edtech SaaS, a school-issued device, a tutoring platform, an LMS plug-in, an after-school enrichment app, or a research-data-collection instrument can ship without (a) ED investigation, (b) FTC consent decree, (c) state attorney-general enforcement, or (d) the reputational damage of a single high-profile student-data incident.

This skill does NOT cover: general-purpose corporate privacy compliance (see `gdpr-ccpa-compliance`), payment processing for school billing (see `payment-processing-patterns`), or healthcare-on-campus (see `hipaa-compliance` — covers school nurses, counsellors, and IDEA / Section 504 records that overlap).

## Standards Cited

- **FERPA** — Family Educational Rights and Privacy Act of 1974 (20 USC §1232g; 34 CFR Part 99) — the foundational US law governing education records
- **PPRA** — Protection of Pupil Rights Amendment (20 USC §1232h) — surveys and physical exams
- **IDEA** — Individuals with Disabilities Education Act (20 USC §1400 et seq.) — special-education records (overlapping FERPA + HIPAA in some cases)
- **Section 504 of the Rehabilitation Act of 1973** (29 USC §794) — disability accommodations records
- **COPPA** — Children's Online Privacy Protection Act of 1998 (15 USC §6501-6506; 16 CFR Part 312)
- **COPPA Final Rule 2025** (FTC, effective April 22, 2025) — strengthened consent requirements + retention limits + biometric protections
- **CIPA** — Children's Internet Protection Act (47 USC §254(h)) — E-rate filtering requirement
- **NSL — National Sex Offender Registry** + state SOR APIs (relevant for tutoring / mentoring platforms)
- **EARLY ACT** + **National Child Protection Act** — background-check requirements for K-12 vendors
- **HIPAA** — overlaps school health records when LEA operates a clinic billing Medicaid; school-counselor records typically NOT HIPAA (FERPA covers)
- **Section 1232g(b)(4)(B)** — disclosure of "directory information"
- **GDPR Article 8** — children's consent (member-state-set age, EU floor 13-16)
- **UK Age-Appropriate Design Code** (UK ICO, 2021) — 15 standards for online services likely to be accessed by children
- **California AB-1584** (Cal Educ Code §49073.1) — contracts between LEAs + service providers
- **SOPIPA** — California Student Online Personal Information Protection Act (Cal BPC §22584)
- **New York Education Law §2-d** + **Parent's Bill of Rights** — strongest US state student-privacy law; data-security regulations 8 NYCRR Part 121
- **Connecticut Public Act 16-189** — strongest CT student-privacy framework
- **Student Privacy Pledge 2020** (Future of Privacy Forum + SIIA) — voluntary commitments by ed-tech vendors
- **NIST SP 800-171** — protecting controlled unclassified information; required for DoD-funded education contracts
- **PCI-DSS** — when school billing involves cards (see `pci-dss-patterns`)
- **FTC Health Breach Notification Rule** — overlaps for school-based health-app integrations
- **Department of Education PTAC** — Privacy Technical Assistance Center guidance

## When to Fire

File path triggers:

- `**/students/**`, `**/grades/**`, `**/transcripts/**`, `**/enrollment/**`, `**/parents/**`, `**/guardians/**`, `**/iep/**`, `**/504-plan/**`, `**/disabilities/**`
- `**/coppa/**`, `**/ferpa/**`, `**/parental-consent/**`, `**/age-gate/**`, `**/minor/**`, `**/under-13/**`
- `**/school/**`, `**/district/**`, `**/lea/**`, `**/sea/**`, `**/classroom/**`, `**/tutor/**`, `**/mentor/**`
- `**/sis/**` (Student Information System), `**/lms/**` (Learning Management System), `**/lti/**`, `**/onefoster/**`, `**/oneroster/**`
- `**/edtech/**`, `**/k12/**`, `**/higher-ed/**`, `**/university/**`, `**/college/**`
- Imports: `@learning-tools/lti-1.3-tool`, `node-ims-lti`, `@instructure/canvas-api`, `@google/classroom`, `@microsoft/teams-edu`, `@schoology/api`, `@powerschool/api`, `@clever/sdk`, `@infinite-campus/api`

Keyword triggers:

- "student", "pupil", "minor", "child", "parent", "guardian", "school", "district"
- "FERPA", "COPPA", "PPRA", "IDEA", "Section 504", "IEP", "504 plan"
- "directory information", "educational record", "school official", "legitimate educational interest", "consent"
- "age gate", "verifiable parental consent", "VPC", "under 13", "under 16", "under 18"
- "LMS", "SIS", "LTI", "OneRoster", "Caliper", "QTI", "xAPI"
- "grade", "transcript", "report card", "attendance", "discipline", "expulsion", "suspension"
- "background check", "fingerprint check", "BGC", "Sterling", "Checkr", "GoodHire"

Change-scope triggers:

- Any new K-12 or higher-ed customer onboarding flow
- Any feature collecting data from users under 18
- Any feature that integrates with a school's SIS / LMS
- Any LTI tool registration
- Any state expansion (each state has its own student-privacy law overlay)
- Any analytics, ads, or third-party SDK introduction
- Any AI / ML feature that processes student work, voice, image, or biometric data

## Core Patterns

### Pattern 1: FERPA scope — who is the regulated entity?

FERPA applies to EDUCATIONAL AGENCIES + INSTITUTIONS that receive federal funding from the US Department of Education. Almost every public K-12 school, public university, and most private non-profit colleges fall under FERPA. Private K-12 schools that don't receive federal funding are typically OUTSIDE FERPA but may be subject to state-law equivalents.

The engineering question: are YOU a covered entity, or are you a SERVICE PROVIDER to a covered entity?

| Role | Compliance posture |
| --- | --- |
| **Covered entity** (school, university) | Direct FERPA obligations; must comply with all rules; designate a FERPA Officer |
| **School Official** (vendor with legitimate educational interest) | Operates under the school's FERPA shield via a contract; school remains accountable; vendor functions as the school's outsourced operator |
| **Studies Exception** vendor (research) | Limited disclosure permitted under §99.31(a)(6) for educational studies; tight controls |
| **Audit/Evaluation** vendor (§99.35) | Federal/state auditors; specific exception |
| **Generic SaaS** | NOT FERPA-protected; school cannot share educational records with you without parent/eligible-student consent |

For an edtech vendor, the canonical path is to become a "School Official" via a Data Privacy Agreement (DPA). Without that contract, the school cannot legally share student PII with you.

### Pattern 2: COPPA scope — under 13 specifically

COPPA applies to commercial operators of websites + online services DIRECTED to children under 13, OR services with ACTUAL KNOWLEDGE that they are collecting personal information from children under 13. Key elements:

- **"Directed to children" test** — totality-of-circumstances: subject matter, visual content, animated characters, child-oriented activities + incentives, language, advertising, presence of celebrities / models, age of actual visitors (FTC empirical evidence)
- **"Actual knowledge"** — if you don't market to kids but registration data (DOB, school grade) reveals a user is < 13, you have actual knowledge
- **"Personal information"** — broad: name, address, phone, email, screen name, persistent identifier (cookie, device ID, IP), geolocation, photo/video/audio of a child, ANY information that PERMITS IDENTIFICATION of a child
- **"Operator"** — anyone who operates a website or online service collecting children's PI; includes apps, SDKs, plugins, smart speakers, IoT toys

### Pattern 3: COPPA 2025 Final Rule — what changed

FTC released the COPPA Final Rule effective April 22, 2025. Material changes:

- **New definition of "personal information"** explicitly includes biometric identifiers (facial recognition, voiceprints, fingerprints), location data with sub-700m precision, and "screen-or-device-name" that is reasonably linkable to a child
- **Explicit consent for third-party disclosures** — even if you have VPC for collection, separate consent required to share with third parties for non-essential purposes (ads, analytics with cross-site tracking)
- **Retention limits** — covered information cannot be retained "for longer than reasonably necessary"; mandatory periodic review; explicit written data-retention policy
- **Data-security program** — written info-sec program, including risk assessment, vendor management, training, incident response
- **Biometric protections** — special VPC for biometric, retention limits, deletion on request without parent intervention
- **Notice updates** — direct notice to parent more detailed; categories of third parties to whom info is disclosed

The 2025 Rule effectively imports many GDPR-K + UK AADC concepts into US law.

### Pattern 4: Verifiable Parental Consent (VPC) methods

COPPA §312.5(b) allows specific VPC mechanisms; the FTC publishes an updated list. Permitted methods (highest assurance first):

| Method | Description | When practical |
| --- | --- | --- |
| **Government-issued ID + facial-match** | Photo of driver's license + selfie + automated match | High-stakes; child-financial / biometric |
| **Credit card / debit card with transaction verification** | $0.01-$0.50 charge that parent must verify in their statement | Sufficient for most cases; standard |
| **Knowledge-based authentication (KBA)** | Questions from public records (former addresses, mortgage values) | Cheap; lower assurance |
| **Phone call to parent** | Trained operator confirms identity + consent | Manual; works for low volume |
| **Signed consent form (mail / fax / e-sign)** | Mailed-back / scanned consent | Slowest; used when others fail |
| **Email + post-confirmation step** ("email plus") | Email to parent + delayed activation + follow-up | DEPRECATED — no longer sufficient on its own under 2025 Rule |
| **In-person at school** | Teacher / counsellor witnesses + records consent | Common for school-deployed products via DPA |
| **School-as-agent-of-parent** | LEA contractually consents on parent's behalf; only for school-purpose uses (not for ads) | Standard for B2G/B2S edtech |

**The school-consent path is the dominant practical pattern**: an LEA signs a DPA agreeing to act as parent's agent for educational purposes; the vendor never directly obtains parental consent because the school did via enrollment paperwork. Limitations: only educational purposes; not advertising; not non-essential third-party disclosure.

### Pattern 5: GDPR Article 8 — children's age varies by member state

GDPR Art 8 sets the digital-consent age between 13 and 16, with member states choosing. As of 2026:

| Country | Age of digital consent |
| --- | --- |
| **France, Germany, Hungary, Ireland, Italy, Lithuania, Luxembourg, Malta, Netherlands, Romania, Slovakia, Slovenia** | 16 |
| **Austria, Bulgaria, Czechia, Cyprus, Denmark, Estonia, Latvia, Poland, Portugal, Spain, Sweden** | 14-15 (various) |
| **Belgium, Finland** | 13 |
| **UK (UK GDPR + Age-Appropriate Design Code)** | 13 |

Below the age of digital consent, parental consent required. Above, the child can consent — though best practice is parallel notice to parents.

### Pattern 6: Educational record vs directory information

FERPA defines two record classes:

**Educational records** (FERPA-protected, requires consent):

- Grades, transcripts, GPA, class rank
- Disciplinary records
- Attendance records
- Special-education / IDEA records (also IDEA-protected)
- Counseling notes (if kept and shared)
- Test scores (state assessment, AP, SAT — exception: ETS as test publisher has own status)

**Directory information** (FERPA-permitted disclosure WITHOUT consent if the institution has properly designated + notified):

- Name, address, telephone, email
- Date + place of birth
- Major field of study
- Dates of attendance
- Degrees + awards received
- Most recent previous school attended
- Photographs
- Participation in officially recognized activities + sports
- Weight + height of athletes

**Critical**: a school's directory-information designation must be PUBLISHED ANNUALLY to parents + eligible students, who must have the opportunity to OPT OUT. After opt-out, treat as full educational record.

NEVER assume an LEA's directory definition matches yours. Code defensive: store directory-info flag per student; respect opt-out.

### Pattern 7: Data Privacy Agreements (DPAs)

The contract between a covered entity (school / LEA / district) and a service provider is the legal vehicle that makes FERPA's "School Official Exception" valid. Required DPA elements:

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

- **NDPA (National Data Privacy Agreement)** — Student Data Privacy Consortium (SDPC) — most-adopted in US K-12
- **CSDPA (California Student Data Privacy Agreement)**
- **MEC-NDPA** — multi-LEA executable
- **State-specific** — NY Education Law §2-d Parent's Bill of Rights addendum; CT-specific addendum

Engineering: the contract has DATA RESIDENCY + RETENTION + DELETION clauses that drive technical implementation. Wire your platform's per-tenant config to reflect each LEA's specific DPA terms (retention period, sub-processor allowlist, regional storage).

### Pattern 8: Age-gating + age-verification

For COPPA-covered services, design the age-gate carefully:

- **Neutral age screen** (DOB or age range) — required by FTC; ASK age, don't infer; design to PREVENT re-attempt after rejection (cookie + IP record)
- **Below-13 path** — kids under 13 require VPC before ANY collection beyond minimal contact (parent's email for VPC purposes only)
- **13-17 path** — many state laws (Connecticut, NY) add restrictions even after 13; UK AADC applies under 18
- **18+ path** — adult flow

For "general audience" services that may have minor users, set up an AGE-FLAGGING workflow: if signals indicate a user might be under 13 (DOB in their profile, school grade, classroom context), trigger the under-13 protections automatically.

### Pattern 9: PPRA — surveys + physical exams

PPRA (20 USC §1232h) requires parental consent BEFORE students participate in surveys / analyses / evaluations funded by ED that reveal information about:

1. Political affiliations + beliefs
2. Mental or psychological problems
3. Sex behavior or attitudes
4. Illegal, anti-social, self-incriminating, or demeaning behavior
5. Critical appraisals of family
6. Privileged relationships (lawyer, doctor, minister)
7. Religious practices + beliefs
8. Income (other than required for program eligibility)

Engineering: if your platform conducts surveys / SEL (social-emotional learning) assessments / mental-health screeners in schools, build the PPRA workflow: parent notice → opt-out OR opt-in (depending on funding source) → audit log of consent state per student per survey instance.

### Pattern 10: New York Education Law §2-d (the toughest state law)

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

If you sell to any NY school district, your platform must meet NY §2-d standards globally — you cannot run a "NY-only" stripped-down profile.

## Anti-Patterns

### Anti-pattern 1: Treating FERPA as a privacy policy

FERPA is a CONTRACTUAL + REGULATORY framework, not a privacy policy. Writing "we respect FERPA" in your TOS does NOT grant you School Official status. Without a signed DPA, schools cannot lawfully give you student data — period.

### Anti-pattern 2: "We don't ask for age, so COPPA doesn't apply"

FTC's "actual knowledge" doctrine: if any signal (DOB, school grade, profile bio, classroom context, parental-account linkage, school-issued device login) reveals a user is under 13, COPPA applies. Designing-to-ignore is willful blindness; the 2025 Rule makes this riskier — explicit penalty enhancement for evasive design.

### Anti-pattern 3: Using student data for ads / marketing

Even with VPC, COPPA + Student Privacy Pledge + every state student-privacy law bans behavioural advertising to children. Cross-context tracking, ad targeting, look-alike audience building from student data — all prohibited. This includes Google Analytics, Facebook Pixel, and similar SDKs on student-facing screens.

### Anti-pattern 4: Letting parents access ALL student records

FERPA gives PARENTS the right to access student records UNTIL the student turns 18 OR enters post-secondary education (whichever first). After that, the "eligible student" holds the rights, and parents need consent. Many platforms incorrectly give parents life-time access; this is itself a FERPA violation.

### Anti-pattern 5: Indefinite retention for "alumni records"

Once a student leaves an institution, retention should be governed by the institution's records-retention schedule — typically state-mandated (e.g., NY 7-year retention for transcripts). Vendors holding alumni records "forever" without a written retention policy violate COPPA 2025 + state laws.

### Anti-pattern 6: Aggregating + deidentifying then selling

"We aggregate the data" is NOT a free pass. The Cambridge Analytica + many other incidents have shown deidentified data is re-identifiable. Under SOPIPA + NY §2-d + the Student Privacy Pledge, even aggregated/deidentified student data CANNOT be sold or used for purposes outside the educational scope.

### Anti-pattern 7: Skipping background checks on vendor employees

Many states require K-12 vendor employees with access to student data to undergo background checks (often fingerprint-based). NY (§3035), Illinois, Florida, Texas, California, and others have specific requirements. Failing this can void the DPA and trigger state-AG action.

### Anti-pattern 8: Forwarding to third-party AI providers without consent

Many edtech platforms integrate ChatGPT / Claude / Gemini / Vertex AI for tutoring, essay feedback, etc. Forwarding student work to a third-party AI vendor requires explicit consent + a sub-processor amendment to the DPA. Several state AGs (TX, CT, MA) have opened investigations into edtech AI integrations in 2024-2025.

## Verification Checklist

- [ ] Determine FERPA status: covered entity vs school-official vendor vs out-of-scope
- [ ] If school-official: DPA signed before any student data collection
- [ ] If COPPA-covered (directed to under-13 OR actual knowledge of under-13): VPC workflow implemented per §312.5(b)
- [ ] COPPA 2025 Final Rule compliance: biometric protections, retention review, info-sec program, third-party-disclosure consent
- [ ] Age-gate is neutral (DOB or age range), prevents re-attempt
- [ ] PPRA workflow for surveys covered by 20 USC §1232h
- [ ] GDPR Art 8 age-of-consent honored per member state
- [ ] Directory-information opt-out respected per student per LEA
- [ ] Educational records distinguished from directory information in schema + access control
- [ ] Eligible-student rights (after 18 / post-secondary) override parent rights in code
- [ ] No behavioural advertising or third-party ad SDKs on student-facing screens
- [ ] Student Privacy Pledge commitments met if vendor signed
- [ ] State-specific overlays: NY §2-d + Parent Bill of Rights, CT 16-189, CA SOPIPA + AB-1584, IL SOPPA
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

## Cross-References

- `gdpr-ccpa-compliance` — general privacy; Article 8 children-specific
- `hipaa-compliance` — school nurse / counsellor / Medicaid-billing overlap
- `audit-logging.md` — every student-record access logged immutably
- `data-retention.md` — retention defaults aligned to state-mandated education schedules
- `secrets-management.md` — DPA-defined data-residency keyed vaults
- `gdpr-ccpa.md` — DSR for parent + eligible-student access requests
- `edtech-patterns` — LTI 1.3, OneRoster, Caliper, xAPI, SCORM patterns
- `security` — OWASP umbrella + NIST 800-53 / 800-171 alignment
- `accessibility-reviewer` agent — IDEA + Section 504 + WCAG accommodations
- `compliance-reviewer` agent — DPA review + state law overlay
- `ai-ethics-reviewer` agent — AI tutoring + automated decision-making + FERPA / COPPA AI guidance

## Standards URLs (primary sources)

- 20 USC §1232g (FERPA) + 34 CFR Part 99
- 15 USC §6501-6506 (COPPA) + 16 CFR Part 312 + FTC 2025 Final Rule
- 47 USC §254(h) (CIPA)
- 20 USC §1232h (PPRA)
- 20 USC §1400 et seq. (IDEA)
- 29 USC §794 (Section 504)
- Cal Educ Code §49073.1 (AB-1584)
- Cal BPC §22584 (SOPIPA)
- 8 NYCRR Part 121 (NY DataPrivSec Regs)
- NY Education Law §2-d
- Connecticut Public Act 16-189
- Student Privacy Pledge 2020 (FPF + SIIA)
- GDPR Article 8 (Regulation (EU) 2016/679)
- UK Age-Appropriate Design Code (ICO 2021)
- US Department of Education PTAC guidance (studentprivacy.ed.gov)
- FTC COPPA Compliance Plan + FAQ (ftc.gov)

## Why This Skill Exists

Edtech is now a $300B+ global industry with deep penetration into US K-12 + higher-ed. Every classroom is a multi-tenant environment where students under 13 (COPPA), students 13-17 (CT / NY / SOPIPA), and adult students (FERPA) coexist. Get the regulatory shape wrong and the consequences run from federal investigation (ED OPP) + FTC consent decree + state attorney-general enforcement to district contract termination + reputational collapse + class-action lawsuit. Recent enforcement examples:

- **2023**: Edmodo $6M FTC settlement for COPPA violations + behavioural ads to children
- **2024**: Bark Technologies FTC settlement (parental monitoring app + COPPA)
- **2024**: NY OAG action against edtech vendor for §2-d Parent Bill of Rights non-distribution
- **2024**: Texas AG investigation into AI-tutoring vendor for student-work training without DPA amendment
- **2025**: COPPA Final Rule signals FTC's elevated scrutiny — biometric + AI + ads

Engineering's job: encode the regulatory shape in the data model + access controls + workflows so the platform CANNOT accidentally violate. The cost of doing this from day one is one-quarter of an engineer; the cost of retrofitting after a state-AG inquiry is product-development-paused-for-six-months + outside counsel.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Edtech vendor begins collecting student data without DPA signed — Pattern 7 violation; ED + state-AG exposure
- "Directed to children" service ships without VPC workflow — COPPA §312.5 violation
- Age-gate retried after rejection (user re-submits older DOB) without IP/cookie prevention — Pattern 8 weakening
- Biometric (face, voice, fingerprint) collected from under-13 without elevated VPC — COPPA 2025 Rule violation
- Behavioural advertising / cross-site tracking SDK appears on student-facing screen — Anti-pattern 3 violation
- Parent retains access to records after student turns 18 / post-secondary — Anti-pattern 4 FERPA violation
- AI tutoring forwards student work to third-party LLM without DPA sub-processor amendment — Anti-pattern 8 violation
- "Aggregated" student data sold / used for non-educational purpose — Anti-pattern 6 SOPIPA / §2-d violation
- Directory-information opt-out not respected at runtime — Pattern 6 weakening
- PPRA survey deployed in school without parent notice + opt-out — Pattern 9 violation
- NY §2-d Parent Bill of Rights not distributed to parents at contract execution — §2-d violation
- Background check missing on vendor employee with student-data access — Anti-pattern 7 state-law violation
- Retention period not configured per LEA's DPA — Pattern 7 weakening
- Breach notification SLA missed (NY 7-day, varies by state) — §2-d violation
- COPPA 2025 retention review not performed — Pattern 3 weakening

**Refinement candidates**:

- New state-law row when a new state passes student-privacy legislation (NJ A1493, MA H.4154, IL SB1463 currently in flight)
- New AI-in-education guidance row when ED OPP / FTC issues policy clarification on AI tutoring + student data
- New consent-method row when FTC approves a new VPC mechanism
- New DPA-template row when SDPC NDPA releases an updated version
- New cross-reference when a sister skill (hipaa-compliance for school-health, audit-logging) adds a control
- Tightening of biometric protections when state laws (IL BIPA expansion, TX CUBI, WA H.B. 1493) add to the floor

---

*Last verified: 2026-05-30. Federal + state regulatory landscape updates: FTC publishes COPPA FAQ updates quarterly; ED OPP publishes PTAC guidance bi-annually; state AGs publish enforcement actions on rolling basis. Refresh cadence: 90 days for FTC, 180 days for ED, 30 days for state-AG enforcement scan.*

*Not legal advice. Vendor-side engineering implementation guidance. Counsel + LEA Privacy Officer + state-AG-coordinated regulatory advisory remain authoritative.*
