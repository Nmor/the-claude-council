---
name: gdpr-ccpa-compliance
description: GDPR + CCPA/CPRA implementation patterns — lawful basis documentation, data subject rights, consent management, cross-border transfers, breach notification, DPIA, and RoPA. Implementation arm of the gdpr-ccpa.md rule. Also lazy-loads data-retention.md / audit-logging.md content migrated from rules/common/ on 2026-06-02.
paths:
  - "**/privacy*"
  - "**/consent*"
  - "**/gdpr*"
  - "**/ccpa*"
  - "**/cpra*"
  - "**/dsar*"
  - "**/dpa*"
  - "**/dpia*"
  - "**/ropa*"
  - "**/cookie*"
  - "**/terms*"
  - "**/pii*"
  - "**/retention*"
  - "**/audit*log*"
  - "**/audit-trail*"
  - "**/data-subject*"
  - "**/data-export*"
  - "**/data-deletion*"
  - "**/right-to-be-forgotten*"
  - "**/user-data/**"
  - "**/legal/**"
  - "**/compliance/**"
  - "**/users.*"
  - "**/accounts.*"
  - "**/customers.*"
---

# GDPR / CCPA / CPRA Compliance

The privacy regulation landscape is mechanical at the code level. This skill encodes the patterns that move a product from "we have a privacy policy" to "we can answer a regulator's questions with evidence."

## Purpose

GDPR (EU), UK GDPR, CCPA + CPRA (California), LGPD (Brazil), POPIA (South Africa), PIPEDA (Canada), APPI (Japan), PDPA (Singapore) — different regulators, similar shapes. The patterns below cover the lowest-common-denominator implementation that satisfies all named regimes.

The expensive failures: GDPR fines up to €20M / 4% global turnover; CCPA $7,500/intentional violation; class actions in jurisdictions that allow them; loss of customer trust + brand damage.

## Standards Cited

- **GDPR (EU Regulation 2016/679)** — primary
- **UK GDPR + Data Protection Act 2018** — post-Brexit UK
- **CCPA (California Civil Code §1798.100 et seq.)** + **CPRA amendments (2023)**
- **LGPD (Brazil — Lei 13.709/2018)**
- **POPIA (South Africa)** + **PIPEDA (Canada)** + **APPI (Japan)** + **PDPA (Singapore)**
- **ISO/IEC 27701:2019** — Privacy Information Management
- **ISO/IEC 29100:2011** — Privacy framework
- **NIST Privacy Framework v1.0**
- **EU-US Data Privacy Framework (DPF)** — adequacy mechanism (effective July 2023)
- **2021 EU Standard Contractual Clauses (SCCs)** — cross-border transfers

## When to Fire

- Any field collection touching personal data (signup, profile, KYC, contact form)
- Any analytics event capturing user behaviour
- Any cookie / local storage / tracker
- Any third-party processor (Stripe, Twilio, OpenAI, etc.)
- Any data export to another region
- Any account-deletion / data-export endpoint
- Any consent banner
- Any data-retention setting

## Core Patterns

### Records of Processing Activities (RoPA — Article 30)

Every controller (and processor over 250 employees) maintains a written register. Template — lives at `docs/ropa.md`:

```markdown
# Records of Processing — <date>

## Activity: User authentication
- Purpose: Authenticate users for service access
- Lawful basis: Contract (Article 6(1)(b))
- Categories of subjects: Customers, prospects
- Categories of data: Email, hashed password, IP (truncated), session metadata
- Recipients: Internal (auth service), AWS (infra processor), CloudFlare (DDoS)
- Cross-border transfers: AWS us-east-1 + eu-west-1 (DPF + SCCs)
- Retention: Active for life-of-account + 30 days; deleted within 90 days incl backups
- Security measures: TLS 1.2+, argon2id hashing, MFA available, rate-limited
- Last reviewed: 2025-12-15
```

Updated in the SAME PR that adds a field / processor / export (per `~/.claude/rules-library/common/docs-sync-with-code.md`).

### Lawful basis at every collection point

Encode as metadata on the field:

```sql
ALTER TABLE users
  ALTER COLUMN email
  SET COMMENT 'lawful_basis:contract,retention:7d_post_account_close,subject_rights:[access,rectification,erasure,portability]';
```

Or in IaC:

```yaml
fields:
  users.email:
    classification: identity
    lawful_basis: contract
    retention_days: 7
    rights: [access, rectification, erasure, portability]
    special_category: false
```

### Consent management (when consent is the basis)

```typescript
type ConsentScope =
  | 'marketing_email'
  | 'marketing_sms'
  | 'analytics_cookies'
  | 'advertising_cookies'
  | 'personalization'
  | 'ai_training';

type ConsentRecord = {
  user_id: string;
  scope: ConsentScope;
  granted: boolean;
  granted_at: Date;
  withdrawn_at: Date | null;
  policy_version: string;     // privacy notice version at time of grant
  ip_hash: string;            // truncated + hashed
  user_agent: string;
  source: 'banner' | 'settings' | 'signup_form';
};
```

Required:

- **Granular** — separate toggles per scope (not "I agree to everything")
- **Opt-in** — default OFF; pre-ticked checkboxes are illegal in EU (CJEU Planet49 ruling)
- **Revocable** — withdrawing is as easy as granting (one-click unsubscribe, settings toggle)
- **Logged** — every grant + withdrawal recorded with timestamp + policy version
- **Re-consent on material change** — new processing purpose / new processor / privacy notice update triggers re-prompt

### Cookie banner — CJEU-compliant

```text
┌─────────────────────────────────────────────────────────┐
│  Cookie preferences                                      │
│                                                          │
│  We use cookies. Choose which categories you allow.     │
│                                                          │
│  ☐ Strictly necessary  [always on, no toggle]            │
│  ☐ Functional          [on/off toggle]                   │
│  ☐ Analytics           [on/off toggle, DEFAULT OFF]      │
│  ☐ Marketing           [on/off toggle, DEFAULT OFF]      │
│                                                          │
│  [Accept all]   [Reject all]   [Save preferences]        │
│                                                          │
│  Both buttons must be visually equal-weight (CJEU).     │
└─────────────────────────────────────────────────────────┘
```

Non-essential cookies do NOT load until consent granted. No "by continuing to browse you agree" — that is not consent under GDPR.

### Data Subject Access Requests (DSAR — Article 15-22)

Required self-service flows:

| Right | GDPR Art | CCPA equivalent | Implementation |
| --- | --- | --- | --- |
| Access | 15 | §1798.110 | "Download my data" — JSON/CSV; 30-day SLA |
| Rectification | 16 | §1798.106 | "Edit profile" + admin tool |
| Erasure | 17 | §1798.105 | "Delete account" — cascades; 30-day soft / 90-day hard incl backups |
| Restriction | 18 | — | "Pause processing" — flag; data preserved but not used |
| Portability | 20 | — | Same as Access but JSON Schema-validated for re-import |
| Objection | 21 | §1798.120 | Marketing / analytics / sale opt-out |
| Automated decision | 22 | §1798.185 | Right to human review |

Implementation:

```typescript
// POST /api/dsar
async function handleDsar(req: Request) {
  const userId = await reauthenticate(req); // Password + TOTP — not cookie alone
  const requestType = req.body.type; // 'access' | 'erasure' | ...
  await rateLimitDsar(userId);  // 5/month per user (abuse prevention)
  await auditLog('dsar.requested', { userId, type: requestType });

  const requestId = await enqueueDsar({ userId, type: requestType });
  await sendEmail(userId, 'dsar.confirmation', { requestId });

  return { request_id: requestId, sla_days: 30 };
}
```

The DSAR worker:

- Collects from all stores (DB, blob, cache, search index, analytics warehouse, processors)
- Generates the export package (signed URL, expires 7 days)
- Cascades deletion (per `data-retention.md`)
- Records every step in audit log (per `audit-logging.md`)
- Confirms completion to the user

### Cross-border transfers

When data leaves the EU/UK, mechanism MUST exist:

| Destination | Mechanism |
| --- | --- |
| Adequacy country (UK, Switzerland, Japan, Canada commercial, Korea, US under DPF) | Adequacy decision — no extra contracts |
| Non-adequacy country | 2021 EU SCCs + Transfer Impact Assessment (TIA, post-Schrems II) |
| Intra-group multinational | Binding Corporate Rules (BCRs) — regulator-approved |
| Narrow case-by-case | Article 49 derogations (explicit consent / contract / legal claims) |

For US transfers post-Schrems II: SCCs + supplementary measures (encryption at rest with EU-controlled keys, pseudonymisation, contractual safeguards). Verify US importer's DPF certification at `dataprivacyframework.gov/list`.

### Data Protection Impact Assessment (DPIA — Article 35)

Required when processing is "likely to result in high risk":

- New technology (LLM-powered features, biometric auth)
- Large-scale special-category processing (health, religious, political)
- Systematic monitoring (employee, public-space)
- Automated decision with significant effect (credit, hiring, insurance)
- Children's data
- Combined datasets (data brokering)

Template — `docs/dpia-<feature>.md`:

```markdown
# DPIA — <feature>

## Description
What processing happens; what data; what for.

## Necessity + proportionality
Is the processing necessary? Could the purpose be achieved with less data?

## Risks to data subjects
- Likelihood × Severity for each risk

## Mitigations
What we do to reduce each risk

## Consultation
- DPO sign-off
- Supervisory authority consultation (if high residual risk per Art 36)

## Decision
Proceed / Modify / Reject
```

### Breach notification

GDPR Article 33: notify supervisory authority within **72 HOURS** of becoming aware unless unlikely to result in risk.

GDPR Article 34: notify affected subjects "without undue delay" when high risk to rights and freedoms.

CCPA: notify "in the most expedient time possible and without unreasonable delay."

Runbook (per `~/.claude/rules-library/common/runbook-template.md`) names:

- The 72-hour clock + DPO
- The "affected users" query (pre-built, not invented during incident)
- Notification templates per channel (email, status page, regulator submission)
- Decision tree for severity classification

### Pseudonymisation + anonymisation

| Technique | What it does | GDPR status |
| --- | --- | --- |
| **Hashing email** | Reversible with rainbow table OR if email known | Still personal data |
| **Truncating IP (last octet)** | Coarse but re-identifiable with auxiliary data | Still personal data (in EU) |
| **K-anonymity ≥ 5 + l-diversity ≥ 2** | Each quasi-id group has ≥5 records, ≥2 sensitive variants | Anonymous IF properly applied |
| **Differential privacy (ε ≤ 1)** | Mathematical guarantee | Anonymous |
| **Synthetic data from PII** | Still derivative | Treat as personal data |

True anonymisation is hard. "We removed names" is not anonymisation if DOB + ZIP + gender still re-identify 87% of US population (Sweeney 2000).

### Children's data

- **GDPR Article 8** — parental consent required for under-16 (Member States can lower to 13; UK is 13)
- **COPPA (US)** — parental consent for under-13 if service is knowingly child-directed
- **Age gate** — collect AGE (not DOB — minimum data principle); reject under-threshold without parental flow
- **Behavioural advertising** — banned for minors regardless of consent

## Anti-Patterns

- **"Consent" via continued use of the site** — not consent under GDPR
- **Single "I agree to everything" checkbox** — fails granularity
- **Pre-ticked consent boxes** — illegal (CJEU Planet49)
- **"Reject all" smaller / less prominent than "Accept all"** — fails CJEU equivalence
- **Storing IP in plaintext in EU jurisdictions** — Article 5 violation unless lawful basis + retention limit
- **Logging full email, phone, password (hashed or not) in app logs** — per `security.md` A09
- **DSAR endpoint authenticated by cookie alone** — re-authentication required
- **"We don't sell data" but Facebook Pixel ships PII to Meta** — CCPA defines "sale" broadly; ad-tech sharing counts
- **Consent at signup never refreshed** — material processing changes require re-consent
- **30-day backup window not disclosed in privacy notice** — users have right to know retention timing

## Verification Checklist

- [ ] `docs/ropa.md` exists and is current
- [ ] Every data field has lawful_basis metadata
- [ ] Consent banner: granular toggles, default OFF for non-essential, "Reject all" equivalent prominence
- [ ] Consent records logged with timestamp + policy version + IP hash
- [ ] DSAR endpoint requires re-authentication
- [ ] DSAR endpoint rate-limited (5/month/user)
- [ ] DSAR worker cascades to all stores + processors
- [ ] Deletion cascades to backups within documented window
- [ ] Cookie banner blocks non-essential cookies until consent
- [ ] No PII in logs (IP hashed, email truncated to `j***@example.com`, no passwords/tokens)
- [ ] Cross-border transfer mechanism documented per destination
- [ ] DPIA written for new high-risk features
- [ ] Breach runbook lists 72-hour clock + DPO + affected-users query
- [ ] Privacy notice up-to-date with retention windows + processors + DSAR contact
- [ ] Material processing changes trigger consent re-prompt
- [ ] No "Do Not Sell" gap if any ad-tech is wired
- [ ] Children's age gate present (if applicable)

## Cross-References

- `~/.claude/rules-library/common/gdpr-ccpa.md` — always-on rule (this skill is implementation)
- `~/.claude/rules-library/common/data-retention.md` — retention windows
- `~/.claude/rules-library/common/audit-logging.md` — DSAR audit trail
- `~/.claude/rules-library/common/secrets-management.md` — encryption keys
- `~/.claude/rules-library/common/runbook-template.md` — breach response
- `owasp-asvs` skill — overlaps V8 (data protection)
- `iso27001-controls` skill — overlaps Annex A.5.34 (privacy)
- `soc2-readiness` skill — overlaps Privacy criterion
- `compliance-reviewer` agent (Division 6) — opus

## Why This Skill Exists

Privacy regulations are not aspirational — they are operational requirements with measurable controls + named penalties. The cost of building consent banners, DSAR endpoints, RoPA, and DPIA into the product at design time: a few sprints. The cost of retrofitting after a regulator's investigation: engineering quarters + outside counsel + brand damage.

Treat every collection point as if a regulator is reading the code, because eventually one will.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New data-collection point without entry in RoPA (Article 30 weakening)
- Consent obtained via pre-ticked checkbox (CJEU Planet49 violation)
- "Do Not Sell" link absent on US homepage when CCPA scope applies
- Cookie set before consent on EU traffic (PECR / ePrivacy violation)
- DSAR processed > 30 days (Article 12 deadline miss)
- Cross-border transfer without SCC / adequacy mechanism (Schrems II violation)
- DPIA absent on high-risk processing (Article 35 — new biometric / large-scale automated decision)
- Breach not notified within 72h (Article 33 deadline miss)
- Children's data collected without verifiable parental consent (Article 8 / COPPA)
- IP / email logged in plain text in EU jurisdiction (PII handling weakening)
- Right-to-be-forgotten executed via soft-delete only (incomplete erasure — Article 17)

**Refinement candidates**:

- New regulation row when a new privacy law passes (LGPD / POPIA / India DPDPA / state laws)
- New cross-reference when a sister skill (iso27001-controls, soc2-readiness, security-review) adds a privacy gate
- New DSAR workflow row when a new data category becomes subject to access right
- Tightening of the cross-border transfer rule when adequacy / SCC landscape shifts

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/gdpr-ccpa.md`
- `rules-library/common/data-retention.md`

---

<!-- ============================================================
     Section: gdpr-ccpa.md (from rules/common/)
     ============================================================ -->

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

---

<!-- ============================================================
     Section: data-retention.md (from rules/common/)
     ============================================================ -->

# Data Retention Rule (Always-On, Global)

> Auto-fires on every file. Sister to `gdpr-ccpa.md` (privacy
> rights), `audit-logging.md` (audit retention is different from
> operational), `security.md` A02 (encryption at rest), `schema-
> evolution.md` (retention survives schema changes), `task-
> intake-due-diligence.md` Q10. Standards: **GDPR Article 5(1)(e)**
> (storage limitation), **CCPA §1798.105** (deletion right),
> **PCI-DSS Requirement 9** + **3** (data lifecycle),
> **HIPAA §164.530(j)** (6-year retention), **SOX §404** (7-year
> financial), **ISO/IEC 27001 Annex A.8.10** (information
> deletion).

## Core Principle

**Every data class has an explicit retention period, a documented
deletion path, and a verified deletion record. Data is kept ONLY
as long as it serves a documented purpose and is required by law;
afterwards it is deleted, anonymised, or aggregated beyond
re-identification.**

The default is NOT "keep forever." Storage limitation is a GDPR
principle (Article 5(1)(e)): personal data may be kept "no longer
than is necessary for the purposes for which the personal data
are processed."

## Hard rules

### 1. Every data class is classified

Every table, every collection, every event topic, every blob
prefix is classified into a retention class:

| Class | Examples | Default retention |
| --- | --- | --- |
| **Operational** | Application state, session data | TTL by purpose; 30-90 days typical |
| **User content** | Documents, posts, uploads | While account active + grace period |
| **Identity** | User accounts, profiles | While account active; deletion on request |
| **Transactional** | Orders, payments, invoices | 7-10 years (tax/financial regs) |
| **Audit / compliance** | Security events, access logs | 1-7 years (per regulation) |
| **Analytics — identified** | Per-user events, sessions | 13-25 months (typical) |
| **Analytics — anonymised** | Aggregated counts, cohorts | Indefinite (no PII) |
| **Backups** | DB snapshots | 30-90 days; longer for compliance |
| **Marketing / consent-based** | Email subscriptions | Until user revokes consent |
| **Logs (operational)** | Server logs, error logs | 30 days (90 max) |

Classification is documented in `docs/data-classification.md`
alongside the RoPA (Records of Processing Activities; see
`gdpr-ccpa.md`).

### 2. Retention is enforced by automation, not policy

Don't rely on "we have a policy to delete old data." Encode the
retention rule in code:

- **TTL columns**: every table that retains personal data has
  an `expires_at` (or `delete_after`) column
- **Scheduled jobs**: daily / hourly cron deletes rows past TTL
- **Cloud TTL**: DynamoDB TTL, S3 Lifecycle Rules, BigQuery
  partition expiration
- **Stream retention**: Kafka topic-level retention; SQS message
  retention; EventBridge archive expiration

A retention policy without automation is wishful thinking; only
the policy that runs every night actually deletes data.

### 3. Deletion is REAL deletion, with cascade

When a record is "deleted," it's deleted from:

1. **Primary store** — DB, document store, blob store
2. **Replicas** — automatically via replication
3. **Caches** — Redis, Memcached, CDN
4. **Search indexes** — Elasticsearch, Algolia, Typesense
5. **Backups** — within the next backup cycle (typically 30
   days; document the lag in privacy notice)
6. **Analytics warehouses** — BigQuery, Snowflake, Redshift
7. **Third-party processors** — Mailchimp, Stripe, Segment,
   analytics SDKs (via their deletion APIs)
8. **Logs containing the record** — sometimes infeasible; document
   the lag

A "soft delete" (`deleted_at = now()`) is acceptable as a GRACE
PERIOD (default 30 days) before hard delete — but the hard
delete MUST follow.

### 4. Backups complicate deletion

Backups exist for disaster recovery. They cannot be edited
without compromising the backup's integrity. Two approaches:

| Approach | When | Trade-off |
| --- | --- | --- |
| **Lag tolerance** | Document the backup retention window; data is purged from backups by aging out | Simple; transparent to users; up to N days of "deleted but recoverable" state |
| **Crypto-shredding** | Encrypt with per-user (or per-record) keys; destroy the key on deletion | Backups still contain ciphertext, but plaintext is unrecoverable; works for high-security |

The privacy notice MUST state the backup-deletion lag (commonly
"deleted within 90 days including backups").

### 5. Anonymisation requires k-anonymity + l-diversity

"We hashed the email" is NOT anonymisation. True anonymisation:

- **k-anonymity** ≥ 5: every combination of quasi-identifiers
  (age, ZIP, gender) matches at least 5 records
- **l-diversity** ≥ 2: each k-anonymous group has at least 2
  distinct values for sensitive attributes
- **t-closeness**: the distribution of sensitive attributes in
  each group is close to the overall distribution
- **Differential privacy**: stronger guarantee — noise added so
  individual contributions are undetectable

For most analytics use cases: aggregate to cohorts (>1000 users)

- remove direct identifiers + drop high-cardinality quasi-
identifiers (precise location, device IDs).

### 6. DSAR deletion has SLAs

Per `gdpr-ccpa.md` — when a user requests deletion (GDPR Article
17 / CCPA §1798.105):

- Acknowledge within 30 days
- Complete deletion within 30 days of request (extendable to 90
  for complex cases with notice)
- Confirm deletion to the user
- Cascade to all processors + third parties
- Retain ONLY records legally required to keep (tax, financial,
  fraud-prevention) with documented retention reason

The DSAR workflow is rate-limited (per `rate-limiting.md`) and
audit-logged (per `audit-logging.md`).

### 7. Legal hold overrides retention

When data is subject to litigation hold, investigation, or
regulatory subpoena, deletion is SUSPENDED for that record /
that user / that scope until the hold is released. Mechanics:

- A `legal_hold` column or flag on the affected records
- A `legal_hold_reason`, `legal_hold_id`, `legal_hold_starts_at`,
  `legal_hold_owner` metadata block
- The retention job SKIPS records under hold
- The hold is documented + auditable + has an owner

Legal hold is NOT permanent retention. When the matter
resolves, the hold is released + standard retention resumes.

### 8. Retention applies to derivatives

A user's email may be deleted from the `users` table, but if it
was copied into analytics events, embedded in ML training data,
mentioned in customer support tickets, or pasted into chat logs,
deletion has not occurred. Two strategies:

- **Reference, don't copy**: store the user_id everywhere;
  resolve to email at display time; deletion automatically
  cascades
- **Forward-cascading deletion**: maintain a dependency map of
  every store that copies PII; the deletion job walks the map

The first strategy is dramatically simpler; design for it from
day one.

### 9. Retention for ML training data

If ML models are trained on personal data:

- **Document the data sources** in the model card (per
  `task-intake-due-diligence.md` Q24)
- **Honor deletion requests** — when a user requests deletion,
  remove their data from future training runs
- **Model "unlearning"** is hard — retraining is the safe path;
  budget for it
- **Synthetic data** generated from PII is still derivative —
  treat the synthetic data with the same care as the originals

### 10. Document retention in the privacy notice

The privacy notice MUST state, for each data class:

- What's collected
- Why (lawful basis per `gdpr-ccpa.md`)
- How long it's kept
- What triggers deletion
- Where it goes after deletion (anonymised? aggregated? truly
  gone?)
- How users can request earlier deletion

Vague "we keep data as long as needed" language fails GDPR
review.

## Retention by regulation — quick reference

| Regulation | Data class | Retention |
| --- | --- | --- |
| **GDPR Article 5(1)(e)** | Personal data | "No longer than necessary" |
| **GDPR Article 13(2)(a)** | Disclosed in privacy notice | (See above) |
| **CCPA §1798.130** | Records of consumer requests | 24 months |
| **HIPAA §164.530(j)** | Audit + privacy records | 6 years |
| **PCI-DSS Req 3.1** | Cardholder data | Minimum necessary; defined retention policy |
| **PCI-DSS Req 10.7** | Log records | 1 year (3 months immediately available) |
| **SOX §404** | Financial records | 7 years |
| **GDPR Article 30** | Records of processing | While the activity continues |
| **MiFID II** | Investment communications | 5 years (7 in some jurisdictions) |
| **HIPAA §164.316(b)(2)** | Designation of records (USA) | 6 years from creation OR last in effect |
| **Tax records (US IRS / EU)** | Receipts, invoices | 6-10 years (jurisdiction-specific) |
| **EU ePrivacy** | Communications metadata | 6-24 months (member state) |
| **Children (COPPA)** | Under-13 PII | Delete when no longer needed |
| **Employee records (US OSHA)** | Workplace safety | 5 years post-termination |

Retain at the LONGEST applicable horizon; never prune before the
maximum requirement.

## Tooling

| Tool | Purpose |
| --- | --- |
| **AWS S3 Lifecycle Policies** | Auto-transition + expire blobs |
| **DynamoDB TTL** | Per-item auto-delete |
| **PostgreSQL `pg_partman`** | Time-based partition + drop |
| **BigQuery Partition Expiration** | Time-partition tables auto-drop |
| **Snowflake Time Travel + Fail-Safe** | Built-in retention windows |
| **Kafka topic retention** | Per-topic `retention.ms` |
| **OneTrust / DataGrail / Transcend** | DSAR orchestration + cross-system deletion |
| **AWS Macie / Google DLP / Azure Purview** | Sensitive-data discovery (find PII you didn't know you had) |

Per `reuse-first.md` — use cloud-native lifecycle when possible;
don't reinvent.

## Anti-patterns

### Anti-pattern 1: "Keep everything forever, it's cheap"

Storage IS cheap; the LIABILITY isn't. Every record kept past
its retention period is a regulator's fine waiting to happen,
a breach impact magnifier, and a DSAR cost.

### Anti-pattern 2: Soft-delete forever

`deleted_at = '2020-01-15'` records that are still in the DB in
2026 are NOT deleted — they're hidden. The retention job must
hard-delete after the grace period.

### Anti-pattern 3: Per-table retention policies

10 tables, 10 different retention rules, 10 different cron jobs
to maintain. Centralise: every table inherits its rule from the
data classification; the retention service is one component.

### Anti-pattern 4: Ignoring backups

"We delete on request" but the request data is still in 90 days
of backups. Document the lag OR adopt crypto-shredding.

### Anti-pattern 5: Anonymising by removing names

Removing `first_name` + `last_name` from a record that still has
DOB + ZIP + gender is not anonymisation — those three together
re-identify ~87% of US individuals (Sweeney 2000). True
anonymisation needs k-anonymity verification.

## Verification block

```text
Data retention (this turn):
  - users.last_login retention: 24 months (was 5y) — aligned with EU norms
  - audit_log: 7 years (SOX) — partition by month + auto-archive after 6y
  - operational logs: 90 days (CloudWatch retention applied)
  - DSAR endpoint: 30-day SLA, audit-logged
  - Backups: 90-day window documented in privacy notice
```

## Cross-references

- `gdpr-ccpa.md` — DSAR deletion right; lawful-basis-based retention
- `audit-logging.md` — audit logs have separate, longer retention
- `security.md` A02 — encryption at rest enables crypto-shredding
- `schema-evolution.md` — retention obligations survive schema
  migrations
- `task-intake-due-diligence.md` Q10 (data lifecycle), Q11
  (compliance)
- `error-codes.md` — `legal_hold_blocks_deletion`,
  `retention_minimum_not_met` codes
- `runbook-template.md` — DSAR + legal-hold procedures

## Standards cited

- **GDPR Article 5(1)(e)** — Storage limitation
- **GDPR Article 17** — Right to erasure
- **GDPR Article 30** — Records of processing
- **CCPA §1798.105** — Right to deletion
- **CCPA §1798.130** — Operational records
- **HIPAA §164.530(j)**, **§164.316(b)(2)** — 6-year retention
- **PCI-DSS 4.0 Requirements 3, 9, 10.7** — Data lifecycle + logs
- **SOX §404** — Financial controls + records
- **ISO/IEC 27001:2022 Annex A.8.10** — Information deletion
- **MiFID II RTS 11** — Investment record retention
- **Sweeney L. (2000)** — "Simple Demographics Often Identify
  People Uniquely" (k-anonymity foundation)

## Why this rule exists

Data retention failures hurt twice:

1. **Privacy violations** — keeping data past its purpose
   violates GDPR Article 5(1)(e); the fine is up to 4% of
   global annual turnover
2. **Breach amplification** — when a breach happens, the data
   lost includes records that should have been deleted years
   ago; user notification cost + reputational damage scale
   with the number of records affected

Common real-world incidents:

- Customer-support tools storing chat logs from 2015 still in
  production in 2026 — breach exposes a decade of PII
- ML training corpora that contain deleted-account data because
  the export was a one-time snapshot
- Analytics warehouses with raw events going back to founding,
  containing emails + IPs from users who deleted their accounts
- Backup retention windows quietly extended for "safety" — now
  spanning 7 years instead of the documented 90 days

The fix is mechanical: every data class has a TTL; the TTL is
enforced by automation; the privacy notice tells users what's
retained and for how long. The cost is one classification + one
scheduled job. The cost of getting it wrong is a fine + an
incident report.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New table introduced without retention metadata in `docs/data-classification.md` (rule 1 violation)
- TTL column / scheduled deletion job missing on a personal-data table (rule 2 weakening)
- Soft-delete state persisting past the documented grace period without hard-delete cascade (rule 3 weakening)
- Backup retention exceeds the documented privacy-notice lag without crypto-shredding adopted (rule 4 violation)
- "Anonymisation" applied via hash without k-anonymity ≥ 5 + l-diversity check (rule 5 weakening)
- DSAR deletion not cascaded to cache / search index / analytics warehouse / third-party processors (rule 3 incomplete)
- Legal hold introduced without owner + reason + start-time + expiry metadata (rule 7 weakening)
- ML training data retained after user-deletion request (rule 9 weakening)
- Privacy notice lacks per-class retention period (rule 10 violation)
- Tax / SOX / HIPAA-bound records pruned before the longest applicable retention (regulation-driven floor violated)

**Refinement candidates**:

- New regulation row in the retention quick-reference when a new framework emerges (e.g., new EU sector-specific law, US state privacy law)
- Tightening of the cascade enumeration when a recurring "forgot to delete from X" class appears
- New cross-reference when a sister rule (gdpr-ccpa, audit-logging, schema-evolution) provides the data-class metadata
- New anonymisation template when a recurring "we hashed the email" misuse class emerges

---
