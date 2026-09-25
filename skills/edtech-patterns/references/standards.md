# edtech-patterns: Standards Cited

> Every standard this skill cites, with version + issuing body. Pointed at by the SKILL.md row
> "Standards Cited".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Standards Cited

### Interoperability (1EdTech / IMS Global)

- **LTI 1.3 + LTI Advantage** (Learning Tools Interoperability —
  1EdTech Final Spec) — OAuth 2.0 + OIDC + JWT-based launch,
  replaces LTI 1.1's shared-secret model; Names + Role Provisioning
  (NRPS), Assignment + Grade Services (AGS), Deep Linking 2.0.
  LTI 1.1 / 1.2 deprecated; new integrations MUST be 1.3+.
- **OneRoster 1.2** (1EdTech) — Roster sync for SIS ↔ LMS ↔
  tool; users / classes / enrollments / courses / academic
  sessions / demographics; CSV and REST API bindings; replaces
  PowerSchool's PSCB SIF where possible.
- **Caliper Analytics 1.2** (1EdTech) — Learning event vocabulary
  (Sensor API + Event model); contrasts with xAPI in that
  Caliper is opinionated about LMS-flavoured events while xAPI
  is open vocabulary.
- **QTI 3.0** (Question + Test Interoperability — 1EdTech) —
  XML-based item + test format, replaces QTI 2.x; widely used
  in K-12 + higher-ed assessment.
- **Common Cartridge 1.3** (1EdTech) — Package format for course
  content (HTML + LTI links + assessment + discussion-forum +
  web-link); the IMS Thin Common Cartridge variant is the
  practical floor.

### Experience tracking

- **xAPI 2.0 / IEEE 9274.1.1-2023** — Statement-based "Actor →
  Verb → Object" event model with LRS (Learning Record Store)
  backing; supersedes SCORM for tracking learning outside the
  LMS (simulations, VR, mobile, workplace).
- **cmi5** (ADL) — xAPI profile that defines a SCORM-replacement
  contract (course structure + AU launch + completion +
  satisfaction); the deployable answer when an org wants xAPI
  benefits with SCORM-like packaging.
- **SCORM 2004 4th Edition** (ADL) — Legacy but still dominant in
  corporate L&D; complete in scope (sequencing + navigation +
  rollup); strict packaging via Content Aggregation Model.
- **SCORM 1.2** (ADL) — Older but still ubiquitous; simpler
  (no sequencing); minimum support for any platform that ingests
  external content.

### Credentialing

- **Open Badges 3.0 / W3C Verifiable Credentials** (W3C
  Recommendation, 2023+ alignment) — Cryptographically signed
  credentials with JSON-LD; replaces Open Badges 2.0's
  baked-image model with a VC envelope; aligns with EBSI
  (European Blockchain Services Infrastructure) and CLR
  (Comprehensive Learner Record).
- **CLR Standard 2.0** (1EdTech) — Verifiable record of
  competencies + achievements; envelope for Open Badges + skill
  - assertion data.

### Accessibility (learner-specific)

- **WCAG 2.2 AA + AAA** (W3C, Oct 2023) — Floor for any
  learning surface. AAA recommended for assessment paths (the
  educational record depends on the learner being able to
  demonstrate knowledge, not on whether the UI happens to work).
- **AccessForAll 3.0** (ISO/IEC 24751) — Personal needs +
  preferences (PNP) framework; lets learners declare
  accommodations (preferred-modality, captions, audio
  description, alt-text density, signing avatars, reading
  speed) and the system delivers matching DRD (Digitally
  Resource Description) variants.
- **Section 504** (29 USC §794 + 34 CFR Part 104) — US
  prohibition on disability discrimination in federally-funded
  programs; reasonable accommodations required.
- **IDEA** (Individuals with Disabilities Education Act, 20 USC
  §1400+) — IEP (Individualized Education Program) + 504 Plan
  compliance for K-12.
- **DOJ Title II Web Accessibility Final Rule** (April 2024,
  effective dates 2026-2027) — Mandates WCAG 2.1 AA for state +
  local government public-facing AND learner-facing digital
  content; bigger districts (≥50,000) effective Apr 24, 2026.
- **EAA** (European Accessibility Act 2019/882, effective Jun
  28, 2025) — Mandates WCAG 2.1 AA for ed-tech sold to EU.

### Pedagogy + Universal Design

- **UDL 3.0** (Universal Design for Learning — CAST) — Multiple
  means of engagement / representation / action + expression;
  the framework that turns "accessibility add-on" into
  "designed-in flexibility".
- **IRT 2PL / 3PL / Rasch** (Item Response Theory) — Psychometric
  foundation for adaptive testing; replaces "raw score / total"
  with item-difficulty + learner-ability latent estimation.
- **Bloom's Revised Taxonomy** (Anderson + Krathwohl, 2001) — The
  cognitive-process dimension that learning objectives align to.

### Proctoring / Integrity

- **NCME Standards for Educational + Psychological Testing** (AERA
  / APA / NCME, 2014 + supplements) — Validity + reliability +
  fairness floor.
- **ABA Model Rules** (for legal-ed remote bar exam) — Strict
  identity-verification + monitoring rules adopted post-COVID.
