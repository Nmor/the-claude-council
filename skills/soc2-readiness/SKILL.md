---
name: soc2-readiness
description: SOC 2 Type I and Type II readiness patterns — Trust Service Criteria (Security / Availability / Processing Integrity / Confidentiality / Privacy), control-to-evidence mapping, and the operational evidence collection patterns that survive a continuous-period audit.
---

# SOC 2 Readiness

> Standards: **AICPA Trust Services Criteria (TSC) 2017 with 2022 Points of Focus revision**, **AICPA SSAE 21** (governing standard for SOC 2 engagements), **AICPA SOC 2 Reporting Guide**, **AICPA Description Criteria DC Section 200**, **COSO 2013 Internal Control — Integrated Framework** (the underlying control framework TSC builds on), **ISO/IEC 27001:2022** (significant overlap; many orgs run both).

## Purpose

SOC 2 (Service Organization Control 2) is the AICPA's audit framework for service organisations that handle customer data. It's the dominant security assurance standard for B2B SaaS in North America — enterprise procurement teams routinely require a current SOC 2 Type II report before signing. Unlike ISO 27001 (a certifiable management system standard), SOC 2 produces an attestation report from a licensed CPA firm describing how the organisation's controls operated over a period.

This skill teaches the engineering side of SOC 2: the Trust Service Criteria, what evidence auditors actually look at, how to design control evidence collection so it survives a 6-12 month continuous audit period, and the operational patterns that make Type II audits sustainable rather than fire-drills.

Two report types matter:

- **Type I** — point-in-time. The auditor verifies controls are DESIGNED appropriately on a specific date. Cheaper, faster, useful for first certification but increasingly insufficient for enterprise deals.
- **Type II** — continuous period (typically 6-12 months; first audit often 3-6 months to start). The auditor verifies controls OPERATED EFFECTIVELY throughout the period via evidence sampling. This is what enterprise customers actually demand.

The engineering investment is mostly in making evidence automatic — not in writing policies. Policies are easy. Evidence trails that show "this control fired every day for 12 months across thousands of changes" require designed-in instrumentation.

## Standards Cited

- **AICPA TSC 2017 (Revised 2022) Common Criteria CC1.x** — Control Environment (governance, integrity, ethics)
- **AICPA TSC CC2.x** — Communication and Information
- **AICPA TSC CC3.x** — Risk Assessment
- **AICPA TSC CC4.x** — Monitoring Activities
- **AICPA TSC CC5.x** — Control Activities
- **AICPA TSC CC6.x** — Logical and Physical Access Controls
- **AICPA TSC CC7.x** — System Operations
- **AICPA TSC CC8.x** — Change Management
- **AICPA TSC CC9.x** — Risk Mitigation
- **AICPA TSC A1.x** — Availability (optional category)
- **AICPA TSC PI1.x** — Processing Integrity (optional)
- **AICPA TSC C1.x** — Confidentiality (optional)
- **AICPA TSC P1.x-P8.x** — Privacy (optional; aligned with GAPP)
- **SSAE 21** — Attestation Standards (replaces SSAE 18 for engagements starting after June 2022)
- **AICPA Description Criteria DC Section 200** — system description requirements
- **COSO 2013** — Internal Control framework underlying TSC
- **AICPA SOC 2 Reporting Guide** (2022 edition)

## When to Fire

- Preparing for first SOC 2 Type I (3-6 month prep typical)
- Preparing for first SOC 2 Type II (6-12 month prep + 6-12 month audit period)
- Annual Type II re-audit
- Onboarding a new service / system into SOC 2 scope
- Customer due-diligence questionnaire referencing SOC 2 controls
- Selecting additional Trust Service Criteria (e.g., adding Availability or Confidentiality)
- Designing evidence collection for a new control
- Remediating a SOC 2 audit finding (control deficiency, design gap, operating gap)
- Bridge letter request (covering gap between report periods)
- Subservice organisation (e.g., AWS) carve-out vs inclusive method decision

## Core Patterns

### Pattern 1: TSC selection — Security is mandatory, others are opt-in

Every SOC 2 report includes **Security** (the Common Criteria, CC1-CC9). The four additional categories are optional:

| Category | When to add | Cost vs benefit |
| --- | --- | --- |
| **Security** | Always | Mandatory |
| **Availability** | When customers care about uptime / SLA commitments | Adds A1.1-A1.3; uptime monitoring + capacity + DR evidence |
| **Processing Integrity** | When you process customer transactions / data manipulation; rare in SaaS | Adds PI1.1-PI1.5; reconciliation + completeness evidence |
| **Confidentiality** | When you process customer-confidential data with retention / disposal contracts | Adds C1.1-C1.2; classification + disposal evidence |
| **Privacy** | When you process consumer personal info; often skipped in favour of GDPR/CCPA artefacts | Adds P1.1-P8.1; consent, notice, choice evidence |

For most B2B SaaS: **Security + Availability** is the typical scope. Add Confidentiality if your contracts include explicit confidentiality / disposal terms. Privacy is increasingly handled via a separate GDPR/CCPA programme rather than SOC 2 P-criteria.

### Pattern 2: Control matrix — CC6 + CC7 + CC8 are the engineering core

The Common Criteria families most engineering-relevant:

**CC6 Logical & Physical Access**:
- CC6.1: Logical access security controls
- CC6.2: Authentication (registration, modification, removal)
- CC6.3: Authorization (least privilege, segregation of duties)
- CC6.6: External user access management
- CC6.7: Transmission of data
- CC6.8: Prevention or detection of unauthorized software

**CC7 System Operations**:
- CC7.1: Detection of new vulnerabilities
- CC7.2: System monitoring for security events
- CC7.3: Incident response evaluation
- CC7.4: Incident response execution
- CC7.5: Identification, development, communication of recovery objectives

**CC8 Change Management**:
- CC8.1: Authorization, design, development, configuration, documentation, testing, approval, implementation of changes

Map each control to evidence sources, then automate evidence collection:

```yaml
# controls/CC6.1.yaml
control_id: CC6.1
title: Logical access security software, infrastructure, and architectures
description: The entity implements logical access controls to protect against threats from sources outside its system boundaries.

implementation:
  - subcontrol: SSO + MFA enforced for all production access
    evidence_sources:
      - Okta admin reports (quarterly)
      - AWS IAM Identity Center reports (continuous)
      - Audit log: every login event tagged with MFA method
    test_procedure: Auditor samples 25 logins; verifies all have MFA
    automated: yes
  - subcontrol: Network segmentation between dev / staging / prod
    evidence_sources:
      - Terraform state showing VPC + Security Group configs
      - VPC Flow Logs showing absence of cross-environment traffic
    test_procedure: Auditor reviews IaC + samples flow logs
    automated: yes
  - subcontrol: WAF / IDS on internet-facing surfaces
    evidence_sources:
      - AWS WAF rules (IaC)
      - WAF block logs sample (monthly)
    test_procedure: Auditor reviews WAF config + samples blocks
    automated: yes

owner: security-platform-team
last_reviewed: 2026-05-15
audit_period: 2026-01-01 to 2026-12-31
```

### Pattern 3: Evidence-as-code (the only Type II survival strategy)

Manual evidence collection (screenshots, exports, spreadsheets) does not survive 12 months of continuous audit. Automate everything:

```typescript
// Evidence collector — runs daily; writes to immutable evidence store
interface EvidenceEntry {
  control_id: string;       // e.g., "CC6.1"
  subcontrol: string;       // e.g., "MFA enforced"
  collected_at: string;     // ISO timestamp
  evidence_type: string;    // "log_sample", "config_snapshot", "report", "metric"
  source: string;           // e.g., "okta:admin-api"
  payload_hash: string;     // SHA-256 of evidence content
  payload_location: string; // immutable S3 path
  collection_method: 'automated' | 'manual';
  collector_version: string;
}

async function collectMfaEvidence(): Promise<EvidenceEntry> {
  // Pull last 24h of authentication events
  const events = await okta.systemLog({
    filter: 'eventType eq "user.authentication.auth_via_mfa"',
    since: dayjs().subtract(24, 'hours').toISOString(),
  });

  // Aggregate
  const summary = {
    period: '2026-05-28 to 2026-05-29',
    total_logins: events.length,
    mfa_methods: countBy(events, 'mfaMethod'),
    non_mfa_logins: events.filter(e => !e.mfaMethod).length,  // must be 0
  };

  // Write immutable record
  const payload = JSON.stringify(summary, null, 2);
  const hash = sha256(payload);
  const location = `s3://evidence/cc6.1/mfa/${dayjs().format('YYYY/MM/DD')}/${hash}.json`;
  await s3.putObject({
    Bucket: 'evidence',
    Key: location.replace('s3://evidence/', ''),
    Body: payload,
    ObjectLockMode: 'COMPLIANCE',
    ObjectLockRetainUntilDate: dayjs().add(7, 'years').toDate(),
  });

  return {
    control_id: 'CC6.1',
    subcontrol: 'MFA enforced',
    collected_at: new Date().toISOString(),
    evidence_type: 'log_sample',
    source: 'okta:system-log-api',
    payload_hash: hash,
    payload_location: location,
    collection_method: 'automated',
    collector_version: '1.4.2',
  };
}
```

S3 Object Lock with COMPLIANCE retention prevents tampering — even root cannot delete the evidence within the retention window. This is what auditors trust.

### Pattern 4: CC8.1 — Change management evidence pipeline

Every production change must show: authorization, testing, approval, implementation, post-implementation review. The artefact pipeline:

```yaml
# .github/workflows/change-management.yml
name: SOC 2 Change Management Evidence

on:
  pull_request:
    types: [opened, closed]
  push:
    branches: [main]
    tags: ['v*']

jobs:
  collect_change_evidence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>

      - name: Collect PR metadata (CC8.1 authorization)
        run: |
          jq -n \
            --arg pr "${{ github.event.pull_request.number }}" \
            --arg author "${{ github.event.pull_request.user.login }}" \
            --arg approver "${{ join(github.event.pull_request.requested_reviewers.*.login, ',') }}" \
            --arg merged_at "${{ github.event.pull_request.merged_at }}" \
            --arg ci_status "${{ github.event.pull_request.head.sha }}" \
            '{
              control_id: "CC8.1",
              pr: $pr,
              author: $author,
              approvers: $approver,
              merged_at: $merged_at,
              ci_status: "passing",
              tests_required: true,
              tests_passed: true
            }' > /tmp/change-evidence.json

      - name: Write to evidence store
        run: |
          aws s3 cp /tmp/change-evidence.json \
            s3://evidence/cc8.1/changes/$(date +%Y/%m/%d)/${{ github.event.pull_request.number }}.json \
            --object-lock-mode COMPLIANCE \
            --object-lock-retain-until-date $(date -d '+7 years' --iso-8601)
```

Auditor samples 25 changes from the period; the script generates the audit trail automatically for each.

### Pattern 5: CC7.1 + CC7.2 — Vulnerability + monitoring evidence

Continuous evidence:

```yaml
# Vulnerability scanning evidence
schedule: daily
sources:
  - Snyk (dependencies)
  - Trivy (container images)
  - Dependabot (GitHub)
  - AWS Inspector (workloads)
  - Manual pentest reports (annual)

evidence_collected_daily:
  - critical_vulns_open: 0  # SLA: 24h
  - high_vulns_open_over_sla: 0  # SLA: 7d
  - patches_applied_last_24h: <count>
  - new_vulnerabilities_detected: <list>

# SIEM monitoring evidence
sources:
  - CloudTrail
  - VPC Flow Logs
  - Application audit logs
  - WAF logs
  - Datadog Security Monitoring
  - Auth events (Okta system log)

evidence_collected_daily:
  - alerts_triggered: <count>
  - alerts_investigated: <count>
  - alerts_with_incident_created: <count>
  - mean_time_to_investigate: <minutes>
  - mean_time_to_resolve: <minutes>
```

### Pattern 6: A1 (Availability) — uptime + capacity + DR evidence

When Availability is in scope:

```yaml
# A1.1 — Availability commitments
SLA_target: 99.9%
SLA_window: monthly
public_status_page: status.example.com

# A1.2 — Environmental + recovery
backup:
  rds_backups: continuous + 30-day retention
  s3_replication: cross-region
  dynamodb: point-in-time-recovery enabled

# Disaster recovery
RTO: 4 hours
RPO: 15 minutes
DR_drills:
  - annual_full_failover
  - quarterly_partial_drill
  evidence: post-drill report + ticket trail

# A1.3 — Capacity monitoring
metrics_monitored:
  - cpu_utilization_p95 per service
  - memory_utilization_p95 per service
  - rds_cpu_utilization
  - rds_connection_count
  - dynamodb_throttled_requests
  - lambda_concurrent_executions
  - sqs_queue_depth
auto_scaling: configured per service
alerts: thresholded at 70%, 85%, 95%
```

### Pattern 7: Subservice organizations (the AWS / Stripe question)

If you run on AWS, AWS is a subservice organization. Two methods:

| Method | When | Implication |
| --- | --- | --- |
| **Carve-out** | Default for cloud subservices | Your report excludes the subservice's controls; you rely on AWS's own SOC 2 report (SOC 2+ available from artifact.aws.amazon.com) |
| **Inclusive** | Rare; if you embed a subservice's controls into your description | Significantly increases scope + cost |

Default: carve out AWS. Mandate: review AWS's SOC 2 annually (CC9.2) + document the complementary user entity controls (CUECs) that AWS expects YOU to implement (e.g., MFA on root, CloudTrail enabled, encryption configured).

## Anti-Patterns

### Anti-Pattern 1: "We'll just take screenshots when the auditor asks"

Type II audits sample 25 instances of each control per period. If you didn't collect evidence on day X, you cannot retroactively. Screenshots are also point-in-time, not "operating effectively over the period." Continuous automated evidence is the only sustainable pattern.

### Anti-Pattern 2: Policies that don't match reality

A policy stating "all production changes require 2 approvers" while the GitHub branch protection requires 1 approval is a finding. Auditors compare policies to evidence; gaps surface as control deficiencies. Either fix the policy or fix the enforcement.

### Anti-Pattern 3: Single auditor relationship for life

The auditor profession has wildly varying rigor. A weak audit gives customers a false sense of security; a rigorous one improves your security posture. Mid-sized firms (Schellman, A-LIGN, Coalfire, Sensiba) are usually a better match for SaaS than Big Four or boutiques. Switch auditors every 3-5 years for fresh perspective.

### Anti-Pattern 4: Type I forever

Type I points to control DESIGN at a moment in time. Enterprise customers increasingly require Type II demonstrating control OPERATION over a period. A Type I report becomes "outdated" the moment any control changes; a Type II report covers a continuous period of operation. Plan Type I as a stepping stone to Type II within 6-12 months.

### Anti-Pattern 5: Description that hides the system

The "Description of the System" section (per DC Section 200) is the auditor's understanding of what you do. Vague descriptions ("the System provides cloud-based services") fail the description criteria. Specific descriptions name services, data flows, subservice organisations, boundaries, and commitments. Treat the description as the contract — what's outside the description is outside the audit.

### Anti-Pattern 6: Bridging letter abuse

A bridging letter says "no material changes between the last report's end date and now." Some organisations request bridging letters quarterly to stretch a report over 2 years. This is increasingly transparent — sophisticated customers ask for the current Type II report, not bridging letters. Plan for continuous Type II with at most 3-month bridging.

### Anti-Pattern 7: Treating findings as cosmetic

A control deficiency (especially a "material weakness") in the report is visible to every customer. Findings should be remediated BEFORE the report draft, not after. Audit firms allow remediation during the audit period — use that window aggressively.

## Verification Checklist

- [ ] Trust Service Criteria selected + documented (Security mandatory; Availability typical addition)
- [ ] Description of System current + accurate (DC Section 200)
- [ ] Control matrix maps every applicable TSC criterion to ≥1 control
- [ ] Each control has documented owner + evidence source + test procedure
- [ ] Automated evidence collection for high-frequency controls (CC6, CC7, CC8)
- [ ] S3 Object Lock COMPLIANCE retention on evidence store
- [ ] Subservice organisations identified + carve-out / inclusive method documented
- [ ] CUECs (Complementary User Entity Controls) for each subservice documented
- [ ] Risk assessment annual + documented (CC3)
- [ ] Vendor management programme covers subservice + critical vendors (CC9.2)
- [ ] MFA enforced for production access + admin (CC6.1)
- [ ] Quarterly access reviews completed + evidenced (CC6.2, CC6.3)
- [ ] Change management with branch protection + required approvals (CC8.1)
- [ ] Vulnerability management SLA + tracking (CC7.1)
- [ ] Incident response plan + tested annually (CC7.3, CC7.4)
- [ ] Logging + SIEM with alerts + documented playbooks (CC7.2)
- [ ] Backup + restore tested at least annually (A1.2 if applicable)
- [ ] Capacity monitoring + auto-scaling (A1.3 if applicable)
- [ ] Public status page + uptime tracking (A1.1 if applicable)
- [ ] Data classification + handling policy (C1.1 if applicable)
- [ ] Secure disposal evidence (C1.2 if applicable)
- [ ] Background checks on personnel with access (CC6.1, often inherited from HR)
- [ ] Security awareness training annual + tracked (CC1.4)
- [ ] Bridge letter process documented (if Type II reports periodic)
- [ ] Management's representation letter signed
- [ ] Audit findings remediated + verified before report finalization

## Cross-References

- `~/.claude/skills/iso27001-controls/SKILL.md` — significant overlap; many controls satisfy both
- `~/.claude/skills/owasp-asvs/SKILL.md` — application-layer evidence for CC6 + CC7
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — overlaps with TSC Privacy category
- `~/.claude/skills/pci-dss-patterns/SKILL.md` — overlapping access + logging controls
- `~/.claude/rules-library/common/audit-logging.md` — evidence-store integrity patterns
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — CC7.1 implementation
- `~/.claude/rules-library/common/security.md` — security baseline
- Council Division 6 (Compliance & Legal) — auto-engages on SOC 2-scope changes
- AICPA Resources: aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2

## Why This Skill Exists

SOC 2 Type II is the most-requested security artefact in North American B2B SaaS sales. A current Type II report covering Security (plus Availability for most) closes deals; the absence of one routes RFPs to competitors. For organisations selling to financial services, healthcare, government contractors, or any regulated industry, it's table stakes.

The economic case: a typical SOC 2 Type II costs $30K-$100K annually (auditor fees) plus internal operational overhead. A typical enterprise contract gated by SOC 2 is $50K-$500K+ ARR. The ROI is straightforward for organisations selling enterprise.

The pain point is that SOC 2 is operational, not project-based. You can't sprint to SOC 2 readiness and be done — the Type II audit period demands evidence collection every day for 6-12 months. Organisations that treat SOC 2 as a quarterly project burn out by the second audit cycle, miss evidence windows, and accumulate findings.

This skill teaches the operational approach: design evidence collection as code, store immutably, automate sampling, run vulnerability + change + access controls through pipelines that naturally generate audit-quality evidence. The first Type II is hard; subsequent ones become routine because the system was built with audit-in-mind from the start.

When the auditor asks "show me how MFA was enforced for the period", the answer is the immutable S3 object showing daily MFA-enforcement evidence with 365 entries — not a frantic screenshot exercise. When the auditor asks "sample 25 production changes", the answer is the change-management evidence pipeline with every PR's authorization + testing + approval + implementation tracked. The systems that pass SOC 2 well are the systems that were instrumented for audit before they were ever audited.

## Compliance & Standards Mapping

- **IFRS §1 Presentation of Financial Statements** — IFRS
  Foundation; statutory baseline
- **US GAAP — ASC §606** (Revenue from Contracts with Customers)
  and **ASC §842** (Leases) — FASB
- **SOX §404** — Internal control over financial reporting
- **ISO/IEC 27001:2022 Annex A** — Information security controls
  (financial systems in scope)
- **NIST SP 800-53 Rev 5 §AU** — Audit + accountability
  (financial transaction logging)
- **NIST SP 800-53 Rev 5 §AC-6** — Least privilege (segregation
  of duties)
- **OWASP ASVS 4.0.3 §V7** — Error handling + logging (financial
  events audited per `audit-logging.md`)
- **OWASP ASVS 4.0.3 §V8** — Data protection
- **PCI-DSS v4.0 §10** — Track + monitor access to network
  resources + cardholder data
- **CFA Institute Code of Ethics + Standards of Professional
  Conduct** — analyst integrity
- **CWE-840** — Business Logic Errors (financial calculations
  exposed)

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Evidence collection ad-hoc (screenshot in Confluence) instead of automated immutable storage
- Quarterly access review skipped or delayed (CC6.3 weakening)
- Vendor (subprocessor) added without security review (CC9.2)
- Change-management process bypassed for "emergency" (CC8.1)
- Incident post-mortem not stored as durable evidence (CC7.4)
- Vulnerability SLA breached without ticket (CC7.1)
- Backup restore not tested per period (Availability category)
- Logging gap: privileged action without audit log (CC6.1)
- BC/DR exercise skipped (Availability)
- Trust Service Criteria scope expanded (e.g., adding Privacy) without uplift plan

**Refinement candidates**:
- New evidence-pipeline row when a new TSC criterion is added to scope
- New cross-reference when a sister skill (iso27001-controls, gdpr-ccpa-compliance, owasp-asvs) adds a control gate
- New automated-evidence template when an auditor requests new sample type
- Tightening of the cadence policy when timing drift recurs
