---
name: iso27001-controls
description: ISO/IEC 27001:2022 Information Security Management System (ISMS) implementation patterns — Annex A 93 controls in 4 themes (Organizational, People, Physical, Technological), Statement of Applicability, risk assessment / treatment, and the engineering-side controls that auditors actually verify.
---

# ISO/IEC 27001 Controls

> Standards: **ISO/IEC 27001:2022** (the ISMS standard), **ISO/IEC 27002:2022** (the implementation guidance — 93 controls organized in 4 themes), **ISO/IEC 27005:2022** (risk management), **ISO/IEC 27017:2015** (cloud security controls extension), **ISO/IEC 27018:2019** (PII in public cloud), **ISO/IEC 27701:2019** (Privacy Information Management System extension), **ISO/IEC 27031:2011** (BC/DR), **ISO/IEC 27035:2023** (incident management).

## Purpose

ISO/IEC 27001 is the international standard for an Information Security Management System (ISMS) — a documented, risk-driven, continually improved approach to managing information security. Certification is a procurement requirement for selling to enterprise, government, healthcare, and financial services customers in most of the world outside North America (where SOC 2 dominates but ISO 27001 still wins multinational deals).

This skill teaches the **engineering side** of ISO 27001: the technical controls in Annex A that engineering teams implement, the evidence that auditors verify, and the operational practices (access reviews, change management, vulnerability management, incident response) that the ISMS coordinates. The management-system side (policies, roles, management reviews, internal audits) is the security/compliance team's domain — but the engineering team builds the systems that demonstrate the controls work.

The 2022 revision consolidated the 114 controls from the 2013 version into 93 controls across 4 themes — Organizational (37), People (8), Physical (14), Technological (34). This is the version currently audited; certifications against the 2013 version expired 31 October 2025.

## Standards Cited

- **ISO/IEC 27001:2022** Clauses 4-10 (Context, Leadership, Planning, Support, Operation, Performance Evaluation, Improvement)
- **ISO/IEC 27001:2022** Annex A — 93 controls in 4 themes
- **ISO/IEC 27002:2022** §5 (Organizational, 37 controls), §6 (People, 8), §7 (Physical, 14), §8 (Technological, 34)
- **ISO/IEC 27002:2022** §8.2 — Privileged access rights
- **ISO/IEC 27002:2022** §8.5 — Secure authentication
- **ISO/IEC 27002:2022** §8.8 — Management of technical vulnerabilities
- **ISO/IEC 27002:2022** §8.9 — Configuration management
- **ISO/IEC 27002:2022** §8.15 — Logging
- **ISO/IEC 27002:2022** §8.16 — Monitoring activities
- **ISO/IEC 27002:2022** §8.24 — Use of cryptography
- **ISO/IEC 27002:2022** §8.25 — Secure development lifecycle
- **ISO/IEC 27002:2022** §8.26 — Application security requirements
- **ISO/IEC 27002:2022** §8.28 — Secure coding
- **ISO/IEC 27002:2022** §8.32 — Change management
- **ISO/IEC 27005:2022** — Risk management process
- **ISO/IEC 27017:2015** — Cloud-specific controls (CLD.6.3, CLD.8.1, CLD.9.5, CLD.12.1, CLD.12.4, CLD.13.1)
- **ISO/IEC 27018:2019** — PII processor obligations in public cloud
- **ISO/IEC 27701:2019** — PIMS extension (privacy management)
- **NIST SP 800-53 Rev 5** — Reference control mapping (Annex A informative mapping in 27002:2022 §Annex B)

## When to Fire

- Building or auditing systems under ISO 27001 scope
- Preparing for Stage 1 (documentation review) or Stage 2 (implementation audit) certification audit
- Annual surveillance audit or 3-year recertification
- Writing or reviewing the Statement of Applicability (SoA)
- Risk assessment / risk treatment plan updates
- Adding a new system, vendor, or cloud service to ISMS scope
- Responding to an audit finding (nonconformity, observation, opportunity for improvement)
- Customer due-diligence questionnaires referencing 27001 controls
- ISMS internal audit or management review
- Incident classified as security-relevant (triggers A.5.24-A.5.28)
- Cloud-region expansion (27017 + 27018 considerations)
- PII processing changes (27701 considerations)

## Core Patterns

### Pattern 1: Statement of Applicability (SoA) as the engineering contract

The SoA lists every Annex A control, marks it Applicable / Not Applicable, and references the implementation evidence. For engineering, the SoA is the inventory of "what we claim we do, and where the auditor can verify it."

```markdown
| Control | Title | Applicable | Implementation | Evidence |
| --- | --- | --- | --- | --- |
| A.5.1 | Policies for information security | Yes | docs/policies/infosec-policy.md | Policy doc + approval record |
| A.5.15 | Access control | Yes | IAM service via Okta + RBAC | Quarterly access review reports |
| A.8.2 | Privileged access rights | Yes | Just-in-time elevation via Teleport | Teleport audit log |
| A.8.5 | Secure authentication | Yes | WebAuthn + FIDO2 + Okta SSO | Auth config + sample audit log |
| A.8.8 | Management of technical vulnerabilities | Yes | Snyk + Dependabot + monthly patch SLA | Snyk reports + remediation tickets |
| A.8.15 | Logging | Yes | CloudWatch Logs + Datadog + immutable S3 | Log retention config + sample queries |
| A.8.24 | Use of cryptography | Yes | TLS 1.3, AES-256-GCM, AWS KMS | Crypto policy + KMS config |
| A.8.25 | Secure development lifecycle | Yes | Code review + SAST + DAST + SCA + threat model | SDLC policy + sample PR + tool reports |
| A.8.28 | Secure coding | Yes | OWASP ASVS + ESLint security plugin + secrets scan | Lint config + sample scan results |
| A.7.4 | Physical security monitoring | No | Cloud-only; data centers operated by AWS | AWS SOC 2 / ISO 27001 / inheritable controls statement |
```

When something's marked "Not Applicable", state the inheritance — for cloud-native organisations, A.7.* (physical) is largely inherited from AWS/GCP/Azure and supported by the provider's own ISO 27001 certification.

### Pattern 2: Risk register feeds the SoA + the SDLC

Every system change runs through risk assessment (ISO 27005). For engineering, the risk register translates threats (T) + vulnerabilities (V) + impact (I) + likelihood (L) into prioritized treatment actions:

```yaml
# risks/RISK-2026-014.yaml
id: RISK-2026-014
title: Magecart-style injection on checkout page
asset: checkout.example.com
threat: Supply-chain compromise of third-party JS (Stripe.js, analytics, ad pixel)
vulnerability: No CSP allowlist; no SRI; no script inventory monitoring
impact: 5  # 1-5 scale; cardholder data exfiltration; brand damage; regulatory exposure
likelihood: 3  # active threat landscape; multiple peer-companies hit
inherent_risk: 15  # impact * likelihood

treatments:
  - id: TRT-A
    control_refs: [A.8.24, A.8.28, A.5.21]  # crypto / secure coding / supply chain
    action: Implement strict CSP with allowlist on checkout pages
    owner: frontend-platform-team
    due: 2026-06-30
    status: in-progress
  - id: TRT-B
    control_refs: [A.5.21, A.8.8]
    action: Add SRI hashes for every external script
    owner: frontend-platform-team
    due: 2026-07-15
    status: planned
  - id: TRT-C
    control_refs: [A.8.16, A.5.25]
    action: SIEM alert on CSP violation reports from payment pages
    owner: security-operations
    due: 2026-07-15
    status: planned

residual_risk: 4  # after all treatments applied; impact 4 * likelihood 1
risk_owner: cto@example.com
review_date: 2026-12-15
```

The risk register entries reference Annex A controls explicitly — that's the bidirectional traceability auditors require.

### Pattern 3: A.5.15 + A.8.2 + A.8.3 — Access control architecture

Access control is the most-audited control family. The implementation pattern:

```typescript
// AccessControl service combining RBAC, ABAC, and just-in-time elevation
interface AccessDecision {
  allowed: boolean;
  reason: string;
  requires_elevation: boolean;
  audit: AuditPayload;
}

class AccessControl {
  async authorize(
    user: Principal,
    action: string,
    resource: Resource,
    context: RequestContext,
  ): Promise<AccessDecision> {
    // A.5.18 — Access rights aligned to roles
    const role = await this.identity.getRole(user.id);

    // A.5.15 — Access policy enforced
    if (!this.policy.allows(role, action, resource)) {
      return {
        allowed: false,
        reason: 'role-denied',
        requires_elevation: false,
        audit: { user_id: user.id, action, resource: resource.urn, decision: 'deny' },
      };
    }

    // A.8.2 — Privileged access requires elevation (just-in-time)
    if (resource.privileged && !user.elevation_token) {
      return {
        allowed: false,
        reason: 'elevation-required',
        requires_elevation: true,
        audit: { user_id: user.id, action, resource: resource.urn, decision: 'elevation-required' },
      };
    }

    // A.8.3 — Data access restricted by classification + need-to-know
    if (resource.classification === 'confidential' && !user.clearances.includes('confidential')) {
      return {
        allowed: false,
        reason: 'classification-denied',
        requires_elevation: false,
        audit: { user_id: user.id, action, resource: resource.urn, decision: 'classification-deny' },
      };
    }

    // A.8.15 — Logged
    await this.audit.record({
      user_id: user.id,
      action,
      resource: resource.urn,
      decision: 'allow',
      source_ip: context.ip,
      timestamp: new Date().toISOString(),
    });

    return {
      allowed: true,
      reason: 'authorized',
      requires_elevation: false,
      audit: { user_id: user.id, action, resource: resource.urn, decision: 'allow' },
    };
  }
}
```

Evidence the auditor looks for: source code, audit log samples, quarterly access review records (A.5.18.1), elevation event logs (A.8.2), separation-of-duties matrix (A.5.3).

### Pattern 4: A.8.8 — Vulnerability management with SLA

A.8.8 requires "timely identification, evaluation, and remediation of vulnerabilities." Defines what "timely" means in your SLA policy:

| Severity | Source | SLA |
| --- | --- | --- |
| Critical (CVSS 9.0+) | Dependabot / Snyk / NVD | Patch within 24 hours |
| High (CVSS 7.0-8.9) | Same | Patch within 7 days |
| Medium (CVSS 4.0-6.9) | Same | Patch within 30 days |
| Low (CVSS 0.1-3.9) | Same | Patch within 90 days |
| Internal pentest finding | Annual or quarterly pentest | Per severity above |
| Customer-reported (responsible disclosure) | security@example.com | Acknowledge 1 day; per severity above |

Evidence: Snyk/Dependabot dashboards, remediation tickets with timestamps, exceptions register for accepted risks.

### Pattern 5: A.8.15 + A.8.16 — Logging + monitoring

The most-evidence-heavy control. Auditors want to see:

```yaml
# Log inventory mapped to A.8.15 requirements
logs:
  - source: application
    events:
      - authentication (success, failure, lockout)
      - authorization (allow, deny, elevation)
      - data_access (read, write, delete of classified data)
      - configuration_change (admin actions)
      - security_event (suspicious patterns)
    fields_required:
      - timestamp (ISO 8601 UTC)
      - user_id
      - source_ip
      - action
      - resource
      - outcome
    retention: 1 year
    integrity: append-only S3 + object lock + KMS

  - source: infrastructure
    events:
      - cloudtrail (AWS API calls)
      - vpc_flow_logs (network)
      - lb_access_logs (HTTP)
      - waf_logs (denied requests)
    retention: 1 year
    integrity: same as above

monitoring:
  siem: Datadog / Splunk / Elastic / Wazuh
  use_cases:
    - failed_login_spike (A.8.16)
    - unusual_data_access (A.8.16)
    - privileged_action_outside_business_hours (A.8.2)
    - geographic_anomaly (A.8.16)
    - malware_detection (A.8.7)
  alert_routing:
    high: pagerduty -> on-call
    medium: slack -> security channel + ticket
    low: dashboard only

incident_response:
  playbook: docs/runbooks/security-incident.md
  contacts: docs/contacts/security-team.md
  exercise: quarterly tabletop
```

### Pattern 6: A.5.21 — Supply chain (third-party) security

For SaaS-heavy organisations, this is one of the biggest scopes. Pattern:

```yaml
# Vendor inventory + risk-tier
vendors:
  - name: Stripe
    services: [payment processing]
    data_processed: [cardholder data, customer PII]
    tier: critical
    certifications: [PCI-DSS Level 1, SOC 2 Type II, ISO 27001]
    contract: signed; DPA in place; SCCs for EU data
    review_cycle: annual
    last_review: 2026-04-01
    next_review: 2027-04-01

  - name: Datadog
    services: [observability]
    data_processed: [application logs, may contain PII if not sanitised]
    tier: high
    certifications: [SOC 2 Type II, ISO 27001, HIPAA-eligible]
    review_cycle: annual
    log_sanitisation_pattern: docs/logging-pii-policy.md

# Per-vendor onboarding gate
onboarding_checklist:
  - [ ] Vendor security questionnaire completed
  - [ ] Certifications verified (or compensating controls documented)
  - [ ] DPA signed (if processing personal data)
  - [ ] SCCs in place (if cross-border)
  - [ ] Data classification documented
  - [ ] Access controls reviewed
  - [ ] Incident notification clause in contract
  - [ ] Exit / data-return procedure documented
```

### Pattern 7: A.8.25-A.8.28 — Secure SDLC

The technical controls auditors verify on every PR / release:

| Control | Practice | Evidence |
| --- | --- | --- |
| A.8.25 Secure development lifecycle | Documented SDLC policy with security gates | Policy doc + sample release |
| A.8.26 Application security requirements | OWASP ASVS or equivalent threat-model-driven requirements | ASVS mapping per service |
| A.8.27 Secure system architecture | Architecture review + ADRs reference security implications | ADR repo |
| A.8.28 Secure coding | Code review + lint + SAST | PR template + tool config |
| A.8.29 Security testing | DAST + pentest + bug bounty | Test reports |
| A.8.30 Outsourced development | Contract clauses + code review | Vendor management |
| A.8.31 Separation of dev/test/prod | Separate environments + access | Environment matrix |
| A.8.32 Change management | Change ticket + approval + rollback plan | Ticket samples |
| A.8.33 Test information protection | No production data in test environments without anonymisation | Data masking policy |

## Anti-Patterns

### Anti-Pattern 1: "We just need the certificate"

Treating ISO 27001 as a checkbox exercise produces brittle certifications that fail at the first surveillance audit. The standard requires demonstrable continuous improvement — incidents tracked, lessons learned, KPIs trending, management reviews showing decisions based on data. Auditors increasingly probe for "is this real?" — not just "does the document exist?"

### Anti-Pattern 2: SoA covers everything as "Applicable"

Marking every control Applicable means committing to evidence for every control. Genuine exclusions (e.g., no on-premise data centers → A.7.* physical controls largely inherited from cloud provider) should be clearly justified. Auditors prefer 50 well-implemented Applicable controls over 93 weakly-implemented ones.

### Anti-Pattern 3: Risk register frozen at certification time

The risk register must be a living document. New systems, new vendors, new threats (Log4Shell, SolarWinds, MOVEit, xz-utils backdoor) all update the register. A risk register last touched in the previous calendar year is a finding.

### Anti-Pattern 4: Annex A copied verbatim into "policies"

Many failed audits stem from policies that copy ISO 27002 text without adapting it to the organisation. Auditors want to see organisation-specific policies — "We use AWS Organizations + SSO + Okta for centralized identity (A.5.16)" beats "Identity management shall be implemented."

### Anti-Pattern 5: Access reviews as a quarterly fire-drill

Access reviews (A.5.18.1) done as a frantic spreadsheet exercise lose their value. Implement continuous access review: every joiner triggers role assignment, every leaver triggers role revocation within 24 hours, quarterly review verifies the continuous process worked. Identity governance tools (Okta Identity Governance, SailPoint, Saviynt) automate this.

### Anti-Pattern 6: Crypto policy = "TLS 1.2+"

A.8.24 requires "a policy on the use of cryptography." That's more than TLS. Document: hash algorithms (SHA-256+, no MD5/SHA-1), symmetric (AES-256-GCM minimum), asymmetric (RSA-2048+ deprecated for new; ECDSA P-256/P-384, Ed25519 preferred), key management (KMS, HSM, FIPS 140-2 Level 2/3 boundaries), key rotation, certificate lifecycle, post-quantum migration plan.

### Anti-Pattern 7: Incident response plan never tested

A.5.24-5.28 cover incident management. The plan must be tested — typically tabletop exercises quarterly + a full-scale exercise annually. Auditors ask for exercise reports + lessons-learned tracking. An untested plan is a fictional plan.

## Verification Checklist

- [ ] ISMS scope documented + approved by top management (Clause 4.3)
- [ ] Information security policy approved + communicated (A.5.1)
- [ ] Statement of Applicability current + signed (Clause 6.1.3)
- [ ] Risk assessment methodology documented (Clause 6.1.2, ISO 27005)
- [ ] Risk register reviewed within last 6 months
- [ ] Risk treatment plan in place with named owners + due dates
- [ ] Asset inventory current + classified (A.5.9-A.5.13)
- [ ] Access control policy + RBAC implementation (A.5.15-A.5.18, A.8.2-A.8.3)
- [ ] Quarterly access reviews completed + documented (A.5.18.1)
- [ ] Secure authentication (MFA enforced for privileged + remote) (A.8.5)
- [ ] Vulnerability management with SLA (A.8.8)
- [ ] Patch management evidence trail
- [ ] Logging + monitoring + SIEM (A.8.15, A.8.16)
- [ ] Logs retained per policy with integrity controls
- [ ] Backup + restore tested at least annually (A.8.13, A.5.30)
- [ ] Cryptography policy + KMS/HSM in place (A.8.24)
- [ ] Secure SDLC policy + evidence per release (A.8.25-A.8.28)
- [ ] Change management with approval + rollback (A.8.32)
- [ ] Supplier register + reviews (A.5.19-A.5.23)
- [ ] Incident response plan + exercise reports (A.5.24-A.5.28)
- [ ] BCP / DR plan tested annually (A.5.29-A.5.30)
- [ ] Security awareness training (A.6.3)
- [ ] Internal ISMS audit conducted annually (Clause 9.2)
- [ ] Management review conducted at least annually (Clause 9.3)
- [ ] Continual improvement actions tracked (Clause 10)

## Cross-References

- `~/.claude/skills/owasp-asvs/SKILL.md` — V1-V14 maps to many A.8.* technical controls
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — ISO 27701 extension covers PIMS
- `~/.claude/skills/pci-dss-patterns/SKILL.md` — overlap on A.5.15, A.5.18, A.8.2, A.8.5, A.8.15
- `~/.claude/skills/soc2-readiness/SKILL.md` — significant control overlap; many organisations carry both
- `~/.claude/rules-library/common/audit-logging.md` — A.8.15 + A.8.16 implementation
- `~/.claude/rules-library/common/secrets-management.md` — A.5.17 + A.8.24
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — A.8.8
- `~/.claude/rules-library/common/security.md` — overall security baseline
- Council Division 6 (Compliance & Legal) — auto-engages on ISMS-affecting changes
- ISO/IEC 27001:2022 + 27002:2022 standards (BSI / DIN / ANSI / national stocks)

## Why This Skill Exists

ISO 27001 is the world's most widely-recognised security management certification — adopted in 180+ countries with ~60,000 certified organisations as of 2025. For B2B SaaS selling to enterprises outside North America (and increasingly inside it), it's table stakes. Without certification, RFPs get filtered out before procurement reads them.

The cost of certification: typically 6-12 months of preparation for first-time certification, ongoing operational overhead of running the ISMS (monthly meetings, quarterly access reviews, annual internal audit + management review + external surveillance audit, 3-year recertification). Engineering touches most technical controls but rarely owns the management-system parts.

The cost of NOT certifying: lost deals, compensating-controls negotiations on every customer questionnaire, repeated point-in-time pentests instead of ongoing assurance, and the cognitive overhead of "do we do this?" turning into research projects every time a customer asks.

This skill exists to make the engineering side legible. The standard's 93 controls translate into concrete patterns — access control architecture, vulnerability SLA, logging architecture, vendor management, secure SDLC. Each pattern has an auditor-facing artefact: the SoA entry, the policy reference, the evidence sample. Knowing what auditors will ask for AT design time means the system is auditable BY design — instead of scrambling to assemble evidence retrospectively in the weeks before the audit.

When the audit asks "how do you control privileged access?", the answer is the just-in-time elevation system + the Teleport audit log + the quarterly review of break-glass usage. When the audit asks "how do you handle vulnerabilities?", the answer is Snyk + Dependabot + the SLA + the ticket sample with timestamps. The standard rewards organisations that built their systems with the controls in mind from the start, and punishes those who tried to retrofit them at certification time.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New control class becomes applicable (e.g., AI controls in Annex A 2026 update) without uplift
- SoA (Statement of Applicability) not updated when control scope changes
- Risk register entry missing for an identified threat
- Access review not run on cadence (per A.5.16 / A.5.18 — privileged-access weakening)
- Vendor / supplier change without re-assessment (A.5.19-A.5.21)
- Incident-management exercise not run quarterly (A.5.24)
- Logging / monitoring control gap (A.8.15 — recurring in audit findings)
- Change management process bypassed (A.8.32 — emergency change without retroactive review)
- Continual improvement cycle (clause 10) skipped — no learnings logged from incidents
- Internal audit + management review not scheduled annually

**Refinement candidates**:
- New control mapping row when ISO updates Annex A (e.g., 2026 revision)
- New cross-reference when a sister skill (soc2-readiness, gdpr-ccpa-compliance, owasp-asvs, pci-dss-patterns) adds a control gate
- New evidence-template row when a recurring auditor request emerges
- Tightening of the SoA review cadence when control drift recurs
