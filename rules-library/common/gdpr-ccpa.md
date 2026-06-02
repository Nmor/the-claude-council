# GDPR / CCPA / Global Privacy Rule (Always-On, Global)

> Auto-fires on every file. Sister to `security.md` A02 + A09
> (cryptography + logging), `data-retention.md` (how long data
> lives), `audit-logging.md` (who-did-what-when), `error-codes.md`
> (`compliance_blocked`, `geo_blocked`), `task-intake-due-diligence.md`
> Q11 (compliance impact). Standards: **EU GDPR
> (Regulation 2016/679)**, **UK GDPR + Data Protection Act 2018**,
> **CCPA (Cal. Civ. Code §1798.100 et seq.)** + **CPRA amendments**,
> **LGPD (Brazil)**, **POPIA (South Africa)**, **PIPEDA (Canada)**,
> **APPI (Japan)**, **PDPA (Singapore)**, **ISO/IEC 27701:2019**
> (Privacy Information Management).

## Core Principle

**Every byte of personal data the system stores, processes, or
transmits has a documented LAWFUL BASIS, a documented RETENTION
PERIOD, a documented DELETION PATH, and a documented EXPORT PATH.
Privacy is enforced by code and config, not by policy PDFs that
nobody reads.**

The product side of GDPR/CCPA is not "we have a privacy policy
page." It is: every collection point declares its lawful basis,
every storage location is enumerated in a Records-of-Processing
register, every data subject's right (access, erasure, portability,
rectification, restriction, objection) is implemented as a
self-service flow, and every cross-border transfer has a documented
mechanism (SCCs, adequacy decision, BCRs).

## What counts as personal data

**Broader than "name + email."** Personal data is ANY information
relating to an identified or identifiable natural person:

- Direct identifiers: name, email, phone, address, government ID,
  passport number, social security
- Indirect identifiers: device ID, advertising ID (IDFA, AAID), IP
  address (in EU/UK), cookie ID, account ID
- Behavioural: browsing history, location trails, search queries,
  purchase history, clickstream
- Inferred: profile attributes derived from behaviour (interests,
  income bracket, sexual orientation, health status)
- Biometric: face embeddings, fingerprints, voice prints
- Special categories (Article 9 GDPR — STRICTER consent + lawful
  basis required): racial/ethnic origin, political opinions,
  religious beliefs, trade-union membership, genetic data,
  biometric data for unique identification, health data, sex life,
  sexual orientation

**Pseudonymised data is still personal data.** Only fully
anonymised data (re-identification impossible even with auxiliary
information) is outside the scope.

## Hard rules

### 1. Document the lawful basis at every collection point

Every field collected on a form, every event tracked in analytics,
every cookie set, every API request that captures user data has a
documented lawful basis (GDPR Article 6):

| Basis | When to use |
| --- | --- |
| **Consent** (6.1.a) | Marketing emails, non-essential cookies, optional features. Must be freely given, specific, informed, unambiguous, opt-in (not opt-out), revocable. |
| **Contract** (6.1.b) | Data necessary to deliver the service the user signed up for (order processing, account management, billing). |
| **Legal obligation** (6.1.c) | Tax records, AML/KYC, regulatory reporting. |
| **Vital interests** (6.1.d) | Life-threatening situations (rare in software). |
| **Public task** (6.1.e) | Public-sector workloads only. |
| **Legitimate interests** (6.1.f) | Fraud prevention, network security, internal analytics. REQUIRES a balancing test documented in the LIA (Legitimate Interest Assessment). |

The basis is encoded as metadata on the field (DB column comment,
schema annotation) and surfaced in the Records of Processing.

### 2. Maintain Records of Processing Activities (RoPA)

Per Article 30 GDPR, every controller (and processor over 250
employees, or for sensitive data) maintains a written register.
Required fields:

- Purpose of processing
- Categories of data subjects + data
- Categories of recipients (internal teams, third-party processors)
- Cross-border transfers + safeguards
- Retention period
- Security measures

Code-side enforcement: the RoPA lives at `docs/ropa.md` (or
project-equivalent) and is updated in the SAME PR as any change
that introduces a new field, new processor, new export, or new
retention rule.

### 3. Implement the seven data-subject rights

Every system MUST implement, as self-service flows where possible:

| Right | GDPR Art | CCPA equivalent | Implementation |
| --- | --- | --- | --- |
| **Access** | 15 | §1798.110 | "Download my data" — exports all PII in machine-readable format (JSON/CSV) within 30 days |
| **Rectification** | 16 | §1798.106 | "Edit my profile" + admin tool for correction requests |
| **Erasure** ("right to be forgotten") | 17 | §1798.105 (deletion) | "Delete my account" — cascades to all stores; soft-delete grace period ≤ 30 days, then hard delete |
| **Restriction** | 18 | — | "Pause processing" flag; data preserved but not actively processed |
| **Portability** | 20 | — | Same as Access but in a structured, commonly-used format (JSON Schema-validated) |
| **Objection** | 21 | §1798.120 (opt-out of sale) | "Opt out of marketing / analytics / sale" toggles in settings |
| **Automated decision-making** | 22 | §1798.185 | Right to human review of decisions with legal/significant effect |

The DSAR (Data Subject Access Request) endpoint is rate-limited
per `rate-limiting.md` (5 requests / month per user — abuse
prevention), audit-logged per `audit-logging.md`, and verified via
re-authentication (cannot be triggered by stolen cookie alone).

### 4. Consent management

When consent is the lawful basis:

- **Granular** — separate toggles for marketing email, marketing
  SMS, analytics cookies, advertising cookies, personalization, AI
  training. NEVER a single "I agree to everything" checkbox.
- **Opt-in** — the default state is "NO" for all non-essential.
  Pre-ticked checkboxes are illegal in EU (CJEU Planet49 ruling).
- **Revocable** — withdrawing consent is as easy as granting it.
  One-click unsubscribe; settings page toggles.
- **Documented** — every consent action (grant, withdraw, update)
  is logged with timestamp + version of the privacy notice +
  user-agent + IP (hashed).
- **Re-consent on material change** — a new processing purpose or
  a new processor requires fresh consent, not "by continuing to
  use the service you agree."

CCPA-specific: the "Do Not Sell or Share My Personal Information"
link is REQUIRED on the homepage footer if you sell or share data
with third parties for advertising.

### 5. Cookie compliance

Cookies fall into four categories:

| Category | Examples | Consent required |
| --- | --- | --- |
| **Strictly necessary** | Session, CSRF token, cart, language preference | No (always allowed) |
| **Functional** | Remember-me, theme, layout | Implied consent OR opt-in (varies by jurisdiction) |
| **Performance / analytics** | Plausible, Google Analytics, Mixpanel | Opt-in (EU) |
| **Marketing / advertising** | Facebook Pixel, Google Ads, retargeting | Opt-in (EU) + opt-out (CCPA) |

The cookie banner MUST:

- Block non-essential cookies until consent is granted (NOT "accept
  by scrolling" or "accept by continuing")
- Offer a "Reject all" button as prominent as "Accept all" (CJEU
  ruling)
- Provide a granular settings panel
- Be re-shown on privacy-notice updates
- Be testable: an automated check confirms no third-party cookies
  are set before consent

### 6. Cross-border transfers

Data leaving the EU/UK requires a transfer mechanism:

| Mechanism | When to use |
| --- | --- |
| **Adequacy decision** | Transferring to a country the EU has deemed adequate (UK, Switzerland, Japan, Canada (commercial), Israel, New Zealand, Argentina, Uruguay, Korea, Andorra, Faroe Islands, Isle of Man, Guernsey, Jersey, US under EU-US DPF as of July 2023) |
| **Standard Contractual Clauses (SCCs)** | Most common — signed contract between exporter + importer using EU-approved templates (2021 SCCs) |
| **Binding Corporate Rules (BCRs)** | Intra-group transfers in multinationals; requires regulator approval |
| **Article 49 derogations** | Narrow case-by-case (explicit consent, contract performance, legal claims) |

For US transfers post-Schrems II: SCCs PLUS supplementary measures
(encryption at rest with EU-controlled keys, pseudonymisation,
contractual safeguards). The EU-US Data Privacy Framework (2023)
provides adequacy for certified US importers — verify the
importer's certification on
`https://www.dataprivacyframework.gov/`.

### 7. Data Protection Impact Assessment (DPIA)

Required (Article 35 GDPR) when processing is "likely to result
in high risk" — new technology, large-scale processing of special
categories, systematic monitoring, profiling with legal effect,
data of vulnerable groups (children, employees).

DPIA template (matches the WP29 guidelines):

1. Description of processing
2. Necessity + proportionality assessment
3. Risks to data subjects (likelihood × severity)
4. Mitigations
5. Consultation with DPO + (if high residual risk) supervisory
   authority

Lives at `docs/dpia-<feature>.md`. Updated when the processing
changes materially.

### 8. Data breach notification

GDPR (Article 33): notify the supervisory authority within **72
HOURS** of becoming aware of a personal data breach (unless
unlikely to result in risk to rights and freedoms).

GDPR (Article 34): notify affected data subjects "without undue
delay" when high risk to rights and freedoms.

CCPA: notify affected California residents in "the most expedient
time possible and without unreasonable delay."

Implementation requirements:

- Incident-response runbook (per `runbook-template.md`) names the
  72-hour clock + the named DPO + the notification template
- Severity classification triggers the breach process (per
  `error-codes.md` security incident codes)
- Affected-user query is a pre-built capability (you cannot wait
  to figure out who was affected during the 72h window)

### 9. Privacy by design + by default

GDPR Article 25:

- **By design**: privacy considerations are baked into system
  design FROM the start, not bolted on. Every new feature passes
  the privacy review (Council Division 6: Compliance & Legal).
- **By default**: the strictest privacy settings are the default;
  users opt IN to less-private states. Public profile? Default:
  private. Location sharing? Default: off. Marketing email?
  Default: off.

Coded as feature-flag defaults and form-field defaults.

### 10. Children's data (special protections)

- **GDPR Article 8**: parental consent required for users under 16
  (Member States can lower to 13; UK is 13).
- **COPPA (US)**: parental consent required for under-13 services
  knowingly directed at children.
- **Age-gate at sign-up** — collect age (NOT date of birth — that's
  more PII than needed). Reject under-threshold without parental
  consent flow.
- **Avoid behavioural advertising to minors** entirely (regardless
  of consent).

## Per-data-store enforcement

Every data store enumerated in the RoPA has:

- **Field-level encryption** for special categories (Article 9)
- **At-rest encryption** for everything (AES-256 minimum)
- **In-transit encryption** (TLS 1.2+)
- **Access controls** with audit trail (per `audit-logging.md`)
- **Retention enforcement** (per `data-retention.md`) — TTL or
  scheduled deletion jobs
- **Deletion path** — DSAR-triggered erasure has been tested in
  staging
- **Export path** — DSAR-triggered access has been tested in
  staging

### Example metadata

DB column comment:

```sql
ALTER TABLE users.profiles
  ALTER COLUMN national_id_hash SET ...,
  COMMENT IS '{"category":"special_article_9","basis":"legal_obligation_kyc","retention":"7y","subject_rights":["access","rectification","restriction"]}';
```

Schema-level: in your service's IaC, every data store carries a
`tags` block with `data_classification`, `lawful_basis`,
`retention_days`, `dsar_export_enabled`, `dsar_erasure_enabled`.

## Mistakes to avoid

### Mistake 1: Treating IP address as non-personal

In EU/UK, IP addresses ARE personal data (Patrick Breyer judgment,
CJEU 2016). Logging IPs requires lawful basis + retention limit.
Common pattern: truncate (last octet for IPv4, last 80 bits for
IPv6) at ingest if you only need geolocation.

### Mistake 2: Logging PII in plaintext

Per `security.md` A09 — never log raw email, phone, password,
token. Truncate emails to `j***@example.com`, hash phone numbers,
redact tokens. The application logger config (e.g., pino's
`redact:` paths) enforces this at the framework layer.

### Mistake 3: Pseudo-anonymised data treated as anonymous

"We hashed the email" is NOT anonymisation — the hash is reversible
with auxiliary data (rainbow tables, known-plaintext). Real
anonymisation requires removing OR generalising every identifier
to the point where re-identification is mathematically infeasible
(k-anonymity ≥ 5 + l-diversity for sensitive attributes).

### Mistake 4: Forgetting backups

DSAR erasure must cascade to backups within the next backup cycle
(typically 30 days). Document the lag in the privacy notice.
Encrypted backups with rotating keys allow "crypto-shredding" — if
the key is destroyed, the backup is effectively erased.

### Mistake 5: "We don't sell data" but you share with ad-tech

CCPA's definition of "sale" is broad — sharing with ad-tech
(Facebook Pixel, Google Ads, programmatic exchanges) counts as a
sale under CPRA. The "Do Not Sell or Share" link is required
unless you genuinely don't share PII with third parties for
advertising.

### Mistake 6: Consent at sign-up never refreshed

A user who consented in 2020 to "use of your data for marketing"
under a then-current privacy notice has NOT consented to your 2026
ML training pipeline. Material changes require fresh consent.

### Mistake 7: DSAR endpoint without authentication

The DSAR endpoint MUST verify identity. A leaked cookie or session
token should not trigger an export. Re-authentication (password +
TOTP) before processing the request.

## Tooling

| Tool | Purpose |
| --- | --- |
| **OneTrust / TrustArc / Didomi / Cookiebot** | Consent management platforms (CMP) |
| **Securiti / DataGrail / Transcend** | DSAR orchestration |
| **Vault by HashiCorp** | Secrets + encryption-as-a-service for field-level encryption |
| **Apache Atlas / DataHub** | Data catalog + lineage (auto-discovers PII) |
| **BigID / Spirion** | Sensitive data discovery scanners |
| **Privacera / Immuta** | Policy enforcement on data warehouses |

Per `reuse-first.md` — don't build a CMP, use an established one.

## Cross-references

- `security.md` A02 — cryptographic failures (special-category data
  must be encrypted at field level)
- `security.md` A09 — security logging + monitoring failures (no
  PII in logs)
- `data-retention.md` — how long each data class lives
- `audit-logging.md` — who-did-what-when on personal data
- `error-codes.md` — `compliance_blocked`, `geo_blocked`,
  `consent_required` codes
- `task-intake-due-diligence.md` Q11 (compliance), Q12 (data
  lifecycle), Q13 (cross-border)
- `runbook-template.md` — 72-hour breach notification clock
- `feature-flags.md` — privacy-by-default flag defaults

## Standards cited

- **Regulation (EU) 2016/679 (GDPR)**
- **UK GDPR + Data Protection Act 2018**
- **California Consumer Privacy Act (CCPA) + CPRA**
- **LGPD (Brazil — Lei Geral de Proteção de Dados)**
- **POPIA (South Africa — Protection of Personal Information Act)**
- **PIPEDA (Canada)**
- **APPI (Japan)**
- **PDPA (Singapore + Thailand + Malaysia variants)**
- **ISO/IEC 27701:2019** — Privacy Information Management System
- **ISO/IEC 29100:2011** — Privacy framework
- **NIST Privacy Framework v1.0**

## Why this rule exists

Privacy regulation is mechanical at the code level, ambiguous at
the policy level, and ruinous at the enforcement level. Maximum
GDPR fines: €20M or 4% of global annual turnover, whichever is
higher. Maximum CCPA penalty: $7,500 per intentional violation.
Per-user damages claims in class actions exceed the regulatory
fines in jurisdictions where they're allowed.

The cost of building privacy into the system at design time is one
extra column metadata block, one extra DSAR endpoint, one extra
consent banner. The cost of retrofitting after a regulator
investigation is engineering quarters + outside counsel + brand
damage + (sometimes) the business itself.

Treat every collection point as if a regulator is reading the
code.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New collection point shipped without a lawful-basis annotation (rule 1 weakening)
- RoPA not updated in the SAME PR that adds a new processor / new field (rule 2 weakening)
- DSAR endpoint missing rate limiting or re-authentication (rule 3 / mistake 7 weakening)
- Pre-ticked consent checkbox shipped (rule 4 — CJEU Planet49 violation)
- "Reject all" not as prominent as "Accept all" on cookie banner (rule 5 — CJEU ruling)
- Cross-border transfer without SCC / adequacy / DPF citation (rule 6 weakening)
- DPIA missing on a high-risk processing change (rule 7 weakening)
- Breach-notification clock not started within 72h discovery window (rule 8 weakening)
- Special-category data (Article 9) stored without field-level encryption (rule 4 + rule 8 weakening)

**Refinement candidates**:
- New jurisdiction entry when a regulator adds a national-law variant (e.g., PIPEDA, LGPD update)
- New row in the RoPA template when a new processor class becomes common
- Tightening of consent UI requirements when a CJEU / supervisory-authority ruling adds a new constraint
- New cross-reference when a sister rule (data-retention, audit-logging) provides the evidence DSAR / breach response depends on
