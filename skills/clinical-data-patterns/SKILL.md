---
name: clinical-data-patterns
description: Principal-level clinical data interoperability — FHIR R5, USCDI v4, HL7 v2 / CDA / CCDA, SMART on FHIR + SMART Health Cards / Links, ICD-10 / SNOMED-CT / LOINC / RxNorm / CPT terminologies, DICOM imaging, telehealth, mHealth (HealthKit / Health Connect). Sister to hipaa-compliance (regulation) and security (cryptography).
---

# Clinical Data Patterns

> One-line mission: every clinical fact (vital, observation,
> medication, allergy, condition, encounter, lab result, image)
> moves through the system in a standards-compliant, version-
> aware, terminology-coded shape that an EHR, a payer, a patient
> app, and a regulator can all consume without translation
> work.

## Purpose

Principal-level engineering guidance for building clinical data
interoperability into health-tech systems. Covers FHIR R5 +
R4 (still the production majority through 2026-2027), HL7 v2
(the workhorse of US EHRs since 1989), CDA / CCDA documents,
SMART on FHIR launch flows, USCDI v4 (the US federal data
floor as of 2024), DICOM imaging, clinical terminologies
(ICD-10-CM / ICD-10-PCS / SNOMED-CT / LOINC / RxNorm / CPT /
HCPCS), telehealth + mHealth platforms (Apple HealthKit, Google
Health Connect), and the ONC information-blocking + Cures Act
API mandates.

**Out of scope (deliberate)**:

- HIPAA regulation + BAAs + breach + audit — covered by
  `hipaa-compliance`
- Generic security baseline — covered by `security` + `owasp-asvs`
- FDA SaMD device classification — separate domain
- Clinical decision support algorithms — separate scope (this
  skill covers the data shapes; algorithm validation is its own
  discipline)
- Medical billing claims (837/835) — separate revenue-cycle scope

## Standards Cited

- **HL7 FHIR R5** — published 2023-03-26 (current normative
  release)
- **HL7 FHIR R4** — published 2019-10-30 (production majority
  through 2026-2027 across CMS-regulated systems)
- **US Core Implementation Guide STU 7.0** — US national FHIR
  profile (aligns with USCDI v4)
- **USCDI v4** — United States Core Data for Interoperability
  (effective Jan 1, 2026)
- **USCDI+** — domain-specific extensions (cancer, behavioral
  health, public health, etc.)
- **HL7 v2.5.1 / v2.8** — ADT, ORM, ORU, MDM, DFT message types
- **HL7 CDA R2** + **C-CDA R2.1** — Continuity of Care, Discharge
  Summary, Care Plan document templates
- **DICOM PS3** (DICOM Standard 2025a) — medical imaging
- **SMART App Launch v2.2.0** — OAuth 2.0 + OIDC for health
  apps
- **SMART Health Cards v1.4.0** — verifiable health credentials
- **SMART Health Links v1.0.0** — shareable health resource
  links
- **Bulk FHIR Access (Flat FHIR) v2.0.0** — population-level
  export
- **CDS Hooks v2.0** — clinical decision support integration
- **ONC Final Rule** — 45 CFR Part 170 (information blocking,
  API access, certification)
- **ONC HTI-1 Final Rule** (2024) — algorithm transparency
- **CMS Interoperability + Patient Access Rule** (CMS-9115-F)
- **CMS Interoperability + Prior Authorization Rule** (CMS-0057-F,
  effective Jan 2026 - Jan 2027)
- **NIST SP 800-66 Rev 2** — HIPAA Security Rule for IT
- **ICD-10-CM** (FY2026 effective Oct 1, 2025) — diagnosis codes
- **ICD-10-PCS** — procedure codes
- **ICD-11** — global classification (WHO; US adoption deferred)
- **SNOMED-CT International + US Edition** — clinical terminology
- **LOINC 2.78** (Dec 2024) — lab + clinical observations
- **RxNorm** (monthly release) — medication terminology
- **CPT 2026** — procedure codes (AMA)
- **HCPCS Level II** — supplies, services
- **NDC** — National Drug Code
- **NPI Registry** — National Provider Identifier (NPPES)

## When to Fire

File path triggers:

- `**/fhir/**`, `**/hl7/**`, `**/cda/**`, `**/ccda/**`,
  `**/dicom/**`, `**/clinical/**`, `**/ehr/**`, `**/emr/**`,
  `**/patient-record/**`, `**/observation/**`, `**/medication/**`,
  `**/encounter/**`, `**/diagnostic-report/**`, `**/telehealth/**`,
  `**/smart-on-fhir/**`, `**/uscdi/**`
- Imports / SDK use: `fhir.js`, `fhir-kit-client`,
  `@bonfhir/*`, `hapi-fhir`, `pyfhir`, `fhir.resources`,
  `dicomjs`, `cornerstone-core`, `dcm4che`,
  `@google-cloud/healthcare`, `aws-sdk` (HealthLake, Comprehend
  Medical), `redoxengine`, `1up-health`,
  `particle.health`, `metriport`, `healthie`, `epicapi`,
  `oauth2-smart-on-fhir`

Keyword triggers:

- "FHIR", "HL7", "CDA", "CCDA", "DICOM", "USCDI", "SMART on FHIR",
  "Bulk FHIR", "Patient", "Encounter", "Observation",
  "MedicationRequest", "AllergyIntolerance", "Condition",
  "Procedure", "DiagnosticReport", "ImagingStudy",
  "ICD-10", "SNOMED", "LOINC", "RxNorm", "CPT", "NPI",
  "HealthKit", "Health Connect", "ADT", "ORU", "telehealth"

Change-scope triggers:

- New clinical data ingestion (EHR feed, lab feed, imaging,
  device)
- New clinical data export / API endpoint
- New terminology mapping (e.g., internal codes → SNOMED)
- New SMART on FHIR app launch flow
- Patient-access API surface (CMS-9115-F obligation)
- Provider-directory API (CMS-9115-F)
- Payer-to-payer data exchange (CMS-9115-F + CMS-0057-F)

## Core Patterns

### Pattern 1: FHIR R5 vs R4 — version your APIs explicitly

Most US production EHR APIs (Epic, Cerner/Oracle, athenahealth,
Allscripts/Veradigm, eClinicalWorks) expose R4. R5 is the
current normative release but adoption lags 3-5 years. The
right pattern: expose BOTH R4 and R5 endpoints during
transition. Per `api-versioning.md`:

```text
GET /fhir/R4/Patient/123
GET /fhir/R5/Patient/123
```

Mark each with `CapabilityStatement` resource declaring the
exact version + profile compliance. Consumers negotiate via
`Accept: application/fhir+json; fhirVersion=4.0`.

### Pattern 2: US Core profiles, not raw FHIR

Raw FHIR is too permissive for interoperability. US Core
Implementation Guide constrains FHIR to required + must-support
elements for US national use. For every resource, validate
against the US Core profile:

| Resource | US Core profile (STU 7.0) |
| --- | --- |
| Patient | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient` |
| Encounter | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter` |
| Condition | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns` |
| Observation (vitals) | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs` |
| Observation (labs) | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-laboratory-result-observation` |
| MedicationRequest | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest` |
| AllergyIntolerance | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance` |
| Procedure | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-procedure` |
| DiagnosticReport (lab) | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-diagnosticreport-lab` |
| Immunization | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-immunization` |

Use a validator (HL7 FHIR Validator, Inferno test framework,
HAPI ValidatorEngine) in CI. Resources that don't validate are
not interoperable.

### Pattern 3: USCDI v4 is the data floor

USCDI v4 (effective Jan 1, 2026) defines the minimum data set
that ONC-certified Health IT MUST exchange. Categories:

- Patient Demographics + Identifiers
- Allergies + Intolerances
- Assessment + Plan of Treatment
- Care Team Members
- Clinical Notes
- Clinical Tests
- Diagnostic Imaging
- Encounter Information
- Goals
- Health Insurance Information
- Health Status
- Immunizations
- Laboratory
- Medications
- Patient Summary
- Problems
- Procedures
- Provenance
- Smoking Status
- Unique Device Identifiers
- Vital Signs
- (new in v4) Facility Information, Care Plan, Health Concerns

If you're under ONC certification (real EHRs, payer portals
serving CMS-regulated populations), USCDI is non-optional.
If you're a non-certified app, USCDI is still the practical
baseline for what consumers expect.

### Pattern 4: SMART on FHIR launch contexts

Two launch types:

- **EHR Launch** — clinician clicks app from inside EHR; EHR
  provides launch context (patient, encounter, user). OAuth 2.0
  authorization with `launch` scope.
- **Standalone Launch** — patient launches app independently;
  app initiates OAuth with EHR. Patient selects context (or app
  has prior context via refresh token).

Scopes follow SMART syntax:

- `patient/Observation.r` — read patient's observations
- `patient/*.cruds` — full access in patient context
- `user/Patient.r` — user-level access to patients in their
  scope
- `system/Bulk.r` — system-level bulk export (backend)
- `launch/patient` — receive patient context at launch
- `online_access` — offline refresh token
- `openid fhirUser` — OIDC identity claims

Always validate the `aud` claim matches your FHIR endpoint.
Always validate the JWT signature via JWKS. Refresh tokens
rotate on use (per SMART v2.2.0 + OAuth 2.1).

### Pattern 5: Bulk FHIR for population-level export

For payer-to-payer (CMS-9115-F), public health, research,
quality reporting — single-resource API is too chatty. Use
Bulk FHIR async export:

```text
GET /fhir/Group/[id]/$export?_type=Patient,Observation,Condition&_since=2026-01-01
```

Returns 202 Accepted + `Content-Location` for status polling.
Final output: NDJSON files per resource type stored at signed
URLs (24h TTL typical). Each line one resource. Consumers
stream-parse. Implement with chunked async jobs +
backpressure; don't materialize 10M-patient export in memory.

### Pattern 6: HL7 v2 — still the EHR backbone

HL7 v2 (pipe + caret delimited) carries 80%+ of intra-hospital
clinical messaging in the US. Modern systems integrate by
parsing v2 → FHIR. Common message types:

| Trigger | Message | Use |
| --- | --- | --- |
| A01 | ADT | Patient admission |
| A03 | ADT | Patient discharge |
| A04 | ADT | Patient registration |
| A08 | ADT | Patient update |
| O01 | ORM | Order entry |
| R01 | ORU | Observation result |
| S12 | SIU | Schedule new appointment |
| T02 | MDM | Document transcription |
| Z01-Z99 | Custom | Vendor-specific |

Acknowledgement model: every message gets an ACK (AA accept,
AE error, AR reject). Production v2 pipelines use MLLP over
TCP with TLS (HL7 v2 over MLLP RFC 4571 + RFC 5246+). Modern
deployments use HL7 FHIR Subscription resource OR Kafka /
EventBridge wrappers over HTTPS.

### Pattern 7: Terminology — code, don't free-text

Every clinical concept gets a code from a standard system:

| Concept | Primary system | Backup |
| --- | --- | --- |
| Diagnosis | ICD-10-CM | SNOMED-CT |
| Lab result | LOINC | local code + map |
| Medication | RxNorm | NDC |
| Procedure | CPT (outpatient) / ICD-10-PCS (inpatient) | HCPCS |
| Immunization | CVX | + MVX (manufacturer) |
| Allergy substance | RxNorm / SNOMED-CT / UNII | text fallback |
| Clinical finding | SNOMED-CT | ICD-10 |
| Body site | SNOMED-CT | FMA |
| Race / Ethnicity | OMB 1997 + USCDI v4 expanded | |
| Language | BCP-47 | |

Per FHIR: every coded element is a `CodeableConcept` with
`coding[]` (system + code + display) AND optional `text`.
Never store ONLY the display; the code is the truth, display
is for humans.

### Pattern 8: DICOM imaging — keep PHI out of pixels

DICOM files contain PHI in the metadata header (PatientName,
PatientID, AccessionNumber, InstitutionName, study date,
referring physician, etc.). The pixel data often contains
"burned-in" PHI in radiograph corners. Two patterns:

- **De-identification**: strip / pseudonymize headers per DICOM
  PS3.15 Annex E. Tools: dcm4che `Anon`, gdcm `gdcmanon`,
  pydicom `Deid`. Verify "burned-in PHI" header (0028,0301) +
  visual review.
- **DICOMweb** — modern RESTful access (WADO-RS for retrieval,
  STOW-RS for store, QIDO-RS for query). Standard in cloud-
  hosted PACS (AWS HealthImaging, Google Healthcare API).

### Pattern 9: Telehealth — state licensure + ATA standards

Telehealth platforms must respect state-level medical licensure
(provider must hold license in patient's state at time of
encounter), DEA registration for controlled-substance
prescribing (Ryan Haight Act / DEA in-person exception via 2023
final rule), and informed consent per state law. Technical
layer:

- WebRTC for video + audio (DTLS-SRTP encryption)
- HIPAA-eligible video providers (Zoom Healthcare, Doxy.me,
  Twilio Video Healthcare, AWS Chime SDK with BAA)
- Recording: explicit patient consent + 6-year retention
  (HIPAA audit + state malpractice statute of limitations)
- Geolocation check: confirm both provider + patient in
  expected jurisdictions

ATA (American Telemedicine Association) Practice Guidelines
2025 cover modality-specific clinical standards.

### Pattern 10: mHealth — HealthKit / Health Connect

Mobile health platforms integrate with:

- **iOS HealthKit** — read user-granted samples; cannot read
  without explicit per-type permission; cannot back up to
  iCloud without user consent
- **Android Health Connect** — Google's replacement for Google
  Fit, mediates access between apps
- **W3C WebHID + WebBluetooth** — for direct device pairing in
  browsers (limited support)

Data exported from HealthKit / Health Connect to your servers
BECOMES ePHI under HIPAA (if you're a BA / CE) AND falls under
the FTC Health Breach Notification Rule (2024 final rule) if
you're not — yes, BOTH can apply to different data segments.

## Anti-Patterns

### Anti-pattern 1: Free-text where a code exists

"Diabetes type 2" as a string is uninteroperable. SNOMED-CT
44054006 + ICD-10 E11.x is. Always require coded
representation; free text is a backup, not the truth.

### Anti-pattern 2: Custom FHIR profiles without IG

Inventing your own `Observation` extension without a published
Implementation Guide breaks every consumer. Either use US Core

- existing IGs (CARIN BB, Da Vinci, IPS, Argonaut) OR publish
a formal IG with profile + value sets + examples on
simplifier.net / FHIR registry.

### Anti-pattern 3: HL7 v2 parser hand-rolled

V2's pipe + caret + ampersand + tilde + subcomponent escaping
has produced incident reports for 30+ years. Use HAPI-HL7 v2
(Java), python `hl7`, NodeJS `simple-hl7` or `nhl7`. Never
hand-roll the parser.

### Anti-pattern 4: PHI in DICOM headers

Sharing a DICOM study with research / vendor without
de-identification leaks PatientName, ReferringPhysician,
StudyDate, etc. Always run de-identification per DICOM PS3.15

- visual review for burned-in PHI before share.

### Anti-pattern 5: SMART on FHIR scopes too broad

`user/*.cruds` granted to a patient app is over-scope. Match
scope to use case: `patient/Observation.r` for a vitals app,
`patient/MedicationRequest.r` for a medication-list app.

### Anti-pattern 6: FHIR resources stored as opaque JSON

blobs

Storing the entire `Observation` as a JSON column means you
can't query "all glucose readings > 200 in the last 30 days"
without app-level scan. Either: (a) extract key fields to
typed columns + retain full FHIR for round-tripping, OR (b)
use a FHIR-native store (HAPI FHIR JPA, AWS HealthLake, Google
Healthcare FHIR Store).

### Anti-pattern 7: Patient.identifier without `system`

A patient ID without the system that issued it is ambiguous.
`Patient.identifier.system = "http://hospital.example/mrn"` +
`value = "12345"` lets consumers disambiguate cross-source
identifiers.

### Anti-pattern 8: Bulk FHIR export without rate-limit +

async

A naive bulk export of a 100K-patient cohort over the
synchronous API ties up workers + breaches timeouts. Always
async via `$export` per Bulk Data IG; never N+1 the
single-resource API for population queries.

### Anti-pattern 9: Telehealth without state-licensure check

If a provider licensed in CA conducts a telehealth visit with a
patient physically in TX, the provider has practiced medicine
in TX without TX licensure — a felony in most states. Check
patient + provider state at session start; refuse the session
if mismatch (unless interstate compact applies — e.g., IMLC,
Nurse Licensure Compact, PT Compact).

### Anti-pattern 10: USCDI fields silently dropped

CMS-certified systems that drop USCDI data (e.g., race /
ethnicity / language) get flagged in interoperability scores +
risk Cures Act information-blocking enforcement. Always
preserve all USCDI elements through your data pipeline; if
unknown, use `null` with a documented reason code (per
FHIR data-absent-reason extension).

## Verification Checklist

- [ ] FHIR endpoints declare version explicitly (R4 and / or R5)
- [ ] CapabilityStatement resource exposed at `/metadata`
- [ ] US Core STU 7.0 profile validation in CI
- [ ] USCDI v4 elements preserved end-to-end
- [ ] SMART on FHIR launch flow tested for both EHR + standalone
  modes
- [ ] OAuth scopes scoped tightly to use case (no `user/*.cruds`
  for a patient app)
- [ ] JWT validation: signature via JWKS, `aud` claim, scope claim
- [ ] Refresh tokens rotate on use
- [ ] Bulk FHIR `$export` implemented async with status polling
  - signed URL for download (24h TTL)
- [ ] HL7 v2 parsing via HAPI / `hl7` / `simple-hl7`, NOT
  hand-rolled
- [ ] MLLP over TLS for v2 transport
- [ ] DICOM de-identification per PS3.15 + burned-in PHI visual
  review before any external share
- [ ] DICOMweb (WADO-RS / STOW-RS / QIDO-RS) for modern
  integrations
- [ ] Every coded element has `system` URI explicit
- [ ] Code system + version stored (LOINC 2.78, SNOMED-CT
  September 2024 US Edition, etc.)
- [ ] Patient.identifier has `system` + `value` + `use`
- [ ] Provider NPI validated against NPPES
- [ ] Telehealth: state licensure check at session start +
  geolocation verification
- [ ] HealthKit / Health Connect data flowing to backend:
  HIPAA scope + FTC Health Breach Rule scope evaluated +
  documented
- [ ] FHIR resources queryable (indexed fields extracted or
  FHIR-native store)
- [ ] Inferno test suite passes for US Core + Bulk + SMART
- [ ] CMS Patient Access API (CMS-9115-F) compliance audit
  passed
- [ ] CMS Prior Authorization API (CMS-0057-F) compliance for
  applicable payers (effective Jan 2026 - Jan 2027)
- [ ] Information-blocking exceptions documented when API
  access is restricted

## Cross-References

- `hipaa-compliance` — regulatory layer over this data layer
- `gdpr-ccpa-compliance` — Article 9 sensitive data when
  patients are EEA / UK residents
- `audit-logging.md` (rule) — every PHI access logged
- `data-retention.md` (rule) — 6-year HIPAA retention
- `security.md` (rule) — TLS + encryption at rest
- `api-versioning.md` (rule) — R4 vs R5 versioning
- `rate-limiting.md` (rule) — FHIR endpoint rate limits
- `idempotency.md` (rule) — FHIR PUT semantics
- `pci-dss-patterns` — when health systems take payments
- `payment-processing-patterns` — billing + RCM overlap
- `accessible-forms` — patient intake forms WCAG compliance
- Agents: `health-reviewer`, `compliance-reviewer`,
  `data-reviewer`, `security-reviewer`

## Why This Skill Exists

Clinical data interoperability is mature but fragmented:

- **CMS-9115-F** (Patient Access + Provider Directory APIs):
  effective since Jul 2021; enforcement increasing
- **CMS-0057-F** (Prior Authorization API): effective Jan 2026
  / Jan 2027 with per-day per-claim penalties
- **ONC Cures Act information-blocking**: $1M / violation per
  HHS HTI-1 final rule (2024); enforcement-grade by HHS OIG
- **State-level interoperability mandates**: TEFCA (Trusted
  Exchange Framework + Common Agreement) — voluntary but
  becoming de facto standard

A health-tech system without principal-level interoperability
discipline:

- Cannot connect to Epic / Cerner / athenahealth (which own
  60%+ of US ambulatory + inpatient EHR market)
- Cannot satisfy ONC certification for federal funding
- Cannot serve regulated Medicare / Medicaid / VA populations
- Cannot meet CMS prior-auth + member-access timelines

Conversely, a system with FHIR + US Core + USCDI + SMART
discipline plugs into the broader US health-data graph and
inherits decades of standards investment instead of fighting
it.

Building this in from day one costs schema discipline +
validator wiring + terminology mapping work. Bolting it on
after launch is an 18-month re-architecture that delays every
EHR integration partnership.

**Important disclaimer**: this skill is engineering guidance,
NOT clinical or legal advice. Clinical workflows require RN /
MD / DO / PharmD review. Compliance questions require HIPAA
counsel.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New clinical data ingested without FHIR mapping (free-text strings, opaque codes)
- US Core profile validation absent from CI for FHIR resources (Pattern 2 weakening)
- USCDI v4 element silently dropped through pipeline (Pattern 3 violation + ONC enforcement exposure)
- SMART on FHIR scopes broader than use case requires (Anti-pattern 5; over-privileged app)
- HL7 v2 parser hand-rolled instead of HAPI / `hl7` / `simple-hl7` (Anti-pattern 3)
- DICOM share without de-identification + burned-in PHI check (Anti-pattern 4)
- FHIR resource stored as opaque JSON blob with no extracted indices (Anti-pattern 6)
- Bulk FHIR cohort export attempted via single-resource API (Anti-pattern 8)
- Telehealth session without state-licensure check (Anti-pattern 9; criminal exposure)
- HealthKit / Health Connect data flows to backend without HIPAA + FTC Health Breach Rule scope evaluation (Pattern 10 weakening)
- Patient identifier stored without `system` (Anti-pattern 7)
- ICD-9 codes lingering in 2026 production (ICD-10 mandatory since Oct 2015)
- LOINC / SNOMED code versions not stored (terminology drift)
- Code release versions stale > 18 months

**Refinement candidates**:

- New FHIR resource row when US Core IG publishes new profile (STU 8.0 expected 2026-2027)
- USCDI version row when ONC publishes v5+ (v4 effective Jan 2026; v5 likely 2027)
- Bulk Data IG version row when ONC publishes v2.1+
- HL7 message-type row when a new trigger gains adoption
- New imaging modality row when DICOM 2026 publishes
- Code system row when a terminology release introduces breaking changes (e.g., ICD-10-CM annual)
- CMS rule row when CMS publishes next phase of interoperability rulemaking
- Cross-reference deepening when sister skill (`hipaa-compliance`, `pci-dss-patterns`) gains overlap

---

*Last verified: 2026-05-30. Standards refresh cadence: 6 months for FHIR profiles + USCDI; quarterly for terminology releases; annual for ICD-10-CM (Oct 1).*
