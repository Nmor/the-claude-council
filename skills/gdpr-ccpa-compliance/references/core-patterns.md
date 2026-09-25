# Core Patterns — GDPR / CCPA Implementation

> **Size budget: 12 KB** — `token-budget.mjs --check`.

Covers the standards this skill is built on and the ten implementation
patterns: RoPA, lawful basis, consent, cookies, DSAR, cross-border
transfers, DPIA, breach notification, anonymisation, children's data.
Pointed at by the SKILL.md reference-map rows "Standards cited" and
"Core patterns".

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

## Core Patterns

### Records of Processing Activities (RoPA — Article 30)

Every controller (and processor over 250 employees) maintains a written register. Template — lives
at `docs/ropa.md`:

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

Updated in the SAME PR that adds a field / processor / export (per
`~/.claude/rules-library/common/docs-sync-with-code.md`).

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
- **Re-consent on material change** — new processing purpose / new processor / privacy notice update
  triggers re-prompt

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

Non-essential cookies do NOT load until consent granted. No "by continuing to browse you agree" —
that is not consent under GDPR.

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

For US transfers post-Schrems II: SCCs + supplementary measures (encryption at rest with
EU-controlled keys, pseudonymisation, contractual safeguards). Verify US importer's DPF
certification at `dataprivacyframework.gov/list`.

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

GDPR Article 33: notify supervisory authority within **72 HOURS** of becoming aware unless unlikely
to result in risk.

GDPR Article 34: notify affected subjects "without undue delay" when high risk to rights and
freedoms.

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

True anonymisation is hard. "We removed names" is not anonymisation if DOB + ZIP + gender still
re-identify 87% of US population (Sweeney 2000).

### Children's data

- **GDPR Article 8** — parental consent required for under-16 (Member States can lower to 13; UK
  is 13)
- **COPPA (US)** — parental consent for under-13 if service is knowingly child-directed
- **Age gate** — collect AGE (not DOB — minimum data principle); reject under-threshold without
  parental flow
- **Behavioural advertising** — banned for minors regardless of consent
