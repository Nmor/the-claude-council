# Audit Logging Rule (Always-On, Global)

> Auto-fires on every file. Sister to `observability.md` (operational
> logs ≠ audit logs), `log-levels.md` (audit is INFO+), `security.md`
> A09 (security logging), `gdpr-ccpa.md` (subject-access requests
> include audit history), `error-codes.md`, `runbook-template.md`.
> Standards: **NIST SP 800-92** (log management), **ISO/IEC 27001
> Annex A.8.15** (logging), **PCI-DSS 4.0 Requirement 10**,
> **SOC 2 Trust Services Criteria CC7**, **HIPAA §164.312(b)**.

## Core Principle

**Every security-relevant, compliance-relevant, or
state-changing event MUST be recorded in an immutable, tamper-
evident audit log that answers: WHO did WHAT on WHICH RESOURCE
WHEN FROM WHERE WITH WHAT OUTCOME. Audit logs are separate from
operational logs, retained on a different schedule, and have
stricter integrity controls.**

Operational logs answer "what is the system doing right now?"
Audit logs answer "what did this user / actor do, and can we
prove it in a regulator's office?"

## Operational logs vs audit logs

| Dimension | Operational logs | Audit logs |
| --- | --- | --- |
| **Purpose** | Debug, monitor, alert | Compliance, forensics, accountability |
| **Audience** | Engineers, on-call | Security team, auditors, courts |
| **Retention** | 7-90 days typical | Years (regulated: 7+ years often) |
| **Mutability** | Rotated, sometimes overwritten | Append-only, integrity-verified |
| **Severity scope** | DEBUG → FATAL | INFO (audit events are normal lifecycle) |
| **Schema** | Flexible, evolves | Fixed canonical structure |
| **Storage** | CloudWatch, Loki, Datadog | Dedicated audit store (separate access policy) |
| **Access** | Engineering team | Security/compliance team only |

The two streams MAY share infrastructure but MUST be logically
separated. Operational log retention policies cannot truncate
audit data.

## What MUST be audit-logged

### Authentication events

- Successful login (with auth method: password, OAuth, SAML, SSO)
- Failed login (with reason: bad credential, account locked, MFA
  failed, account disabled)
- Logout (explicit + session expiry)
- Password change / reset
- MFA enrollment, MFA bypass attempts
- API key / token issued, rotated, revoked
- Session hijack indicator (sudden IP/device change)

### Authorization events

- Permission grant / revoke (role, group, ACL change)
- Privilege elevation (sudo, admin assumption, impersonation
  start/end)
- Access denial (RBAC denial — actor tried but lacked permission)
- Resource sharing change (made public, made private, link shared)

### Data access — sensitive

- Read of personal data (per `gdpr-ccpa.md` — required for DSAR
  history)
- Read of payment data (per PCI-DSS)
- Read of health data (per HIPAA)
- Bulk export / download
- Search queries that return sensitive fields

### Data mutation

- Create / update / delete of business-critical entities
  (accounts, orders, invoices, customer records)
- Configuration changes (feature flags per `feature-flags.md`,
  service settings, security rules)
- Schema migrations
- Mass updates (bulk operations affecting >N records)

### Administrative actions

- User account create / disable / delete
- Role changes
- Billing changes (subscription, plan tier, payment method)
- System parameter changes
- Compliance setting changes (data residency, retention policy)

### Security-sensitive operations

- Encryption key creation / rotation / destruction
- Certificate provisioning / revocation
- Secret access (vault read)
- Cross-tenant data access (must be RARE + always-justified)
- Webhook signing-key rotation
- Anti-fraud rule changes

### External integrations

- OAuth grants (which app, which scopes)
- Webhook subscriptions created / modified
- API integrations linked
- Data exports to third parties

## Canonical audit event shape

Every audit event is a structured record with these fields:

```jsonc
{
  // Identity
  "event_id": "01HXXXXX...",            // ULID; globally unique
  "timestamp": "2026-05-26T14:32:18.342Z",  // RFC 3339, UTC, ms precision
  "event_type": "user.login.success",   // dotted namespace; see catalog
  "event_version": 1,                   // schema version of this event_type

  // Actor — WHO did the thing
  "actor": {
    "type": "user",                     // user | service | system | api_key
    "id": "usr_abc123",
    "display": "alice@example.com",
    "tenant_id": "org_xyz789",
    "session_id": "sess_qrs456"         // null if applicable
  },

  // Subject — WHAT was acted upon
  "subject": {
    "type": "order",
    "id": "ord_def456",
    "tenant_id": "org_xyz789"
  },

  // Action — WHAT was done
  "action": "update",                   // create | read | update | delete | invoke | grant | revoke
  "outcome": "success",                 // success | failure | partial
  "reason_code": null,                  // populated on failure — see error-codes.md

  // Change details — before / after for mutations
  "changes": {
    "fields": ["status", "shipping_address"],
    "before": {"status": "pending", "shipping_address": "..."},
    "after":  {"status": "shipped",  "shipping_address": "..."}
  },

  // Context — FROM WHERE + HOW
  "context": {
    "request_id": "req_ghi789",          // correlates to operational logs
    "trace_id": "abc123...",             // W3C trace context
    "ip_address_hash": "sha256:...",     // hashed per `gdpr-ccpa.md`
    "user_agent": "...",
    "geo": {"country": "US", "region": "CA"},
    "auth_method": "password+totp",
    "api_version": "v2"
  },

  // Integrity
  "prev_event_hash": "sha256:...",       // chain anchor — see Hash chaining below
  "event_hash": "sha256:..."             // SHA-256 of canonical JSON of this event
}
```

## Hard rules

### 1. Audit events are emitted IN the same transaction as the change

For database-backed mutations: insert the audit row in the same
DB transaction as the business-data write. If the transaction
rolls back, so does the audit row. Otherwise the audit log
becomes a lie ("we recorded the action that didn't happen").

For non-transactional systems: emit the audit event via
**outbox pattern** — write to a local outbox in the same
transaction, then a worker forwards to the audit store. Failure
modes are limited to "audit delivery delayed" (caught by
monitoring), not "audit lost."

### 2. Append-only storage

Audit records are NEVER updated or deleted. Append-only is enforced
at the storage layer:

- **PostgreSQL**: revoked UPDATE/DELETE grants on the audit table;
  trigger blocks any update; partition by month + only INSERT
  allowed
- **Dedicated audit DB**: AWS CloudWatch Logs (write-once),
  Datadog Audit Trail, Splunk Enterprise Security
- **Blockchain-anchored** (extreme regulated environments): hash
  daily summary to a public chain (Ethereum, Bitcoin) for
  tamper-evidence

### 3. Hash-chained integrity

Each event references the hash of the previous event for the same
tenant + event_type stream. Tampering with any event invalidates
the chain for every later event in that stream:

```text
event N:
  prev_event_hash = sha256(canonical_json(event N-1))
  event_hash = sha256(canonical_json(event N))
```

Daily / hourly Merkle-tree root commits provide bulk integrity
verification. Storage compromised? The chain breaks; alerts fire.

### 4. PII handling within audit logs

Audit logs DO need to identify subjects + actors. But:

- **Hash IP addresses** — `sha256(ip + per-tenant salt)` to allow
  same-actor correlation without storing the raw IP (per
  `gdpr-ccpa.md` EU restrictions)
- **Pseudonymise email** in display fields — store the user_id,
  resolve to email via the user table when generating reports
- **Never log credentials** — passwords, tokens, API keys, even
  hashed (forensics doesn't need them)
- **Mask sensitive change diffs** — for fields like SSN, credit
  card number, the diff records "field changed" but not the
  before/after values; the values are queryable from the source
  with separate access controls

### 5. Failed actions audit-log too

Successful operations are obvious; failures are arguably more
important. Failed login attempts, denied access, blocked
mutations — all logged. The `outcome: "failure"` + `reason_code`
fields capture the WHY.

### 6. Read access to sensitive data IS an event

Reads of GDPR-personal-data, PCI-payment-data, HIPAA-health-data
are audit events. The "I just searched for customers named
Smith" query against the CRM IS logged with the search criteria,
result count, and actor.

For high-volume systems where logging every read is impractical:
log at the access-path level (which endpoint was hit, with what
filters) instead of every record. Combined with per-tenant /
per-actor rate-limit metrics, this is acceptable.

### 7. Retention is regulation-driven

| Data class | Minimum retention |
| --- | --- |
| GDPR access logs (DSAR support) | 3 years |
| PCI-DSS log records | 1 year, 3 months online + archive |
| SOC 2 audit trail | 1 year |
| HIPAA audit records | 6 years |
| Financial records (SOX) | 7 years |
| Tax / billing audit | 7-10 years |

Retain at the LONGEST applicable. NEVER prune before the longest
retention requirement.

### 8. Access to audit logs is itself audit-logged

The audit log read endpoint is a sensitive resource. Reads of the
audit log emit `audit.access` events (in a separate
meta-audit stream that catches tampering attempts).

### 9. Standardised event type catalog

Every event_type follows a documented schema:

```yaml
event_type: user.login.success
schema_version: 1
description: Successful user authentication.
required_fields: [actor.id, context.auth_method, context.ip_address_hash]
retention_years: 3
compliance_tags: [gdpr, soc2]
```

The catalog lives at `docs/audit-events.md` (or equivalent) and
is updated in the SAME PR as the code that emits a new event
type.

### 10. Time-sync is critical

Audit logs MUST use UTC + millisecond precision + NTP-synced
clocks (every host syncs to a trusted source — AWS Time Sync
Service, Google Public NTP, internal NTP). Clock drift > 1
second is an alert; chain-of-custody depends on timestamp
ordering.

## Cross-tenant isolation

In a multi-tenant system:

- Every audit event carries `tenant_id` on BOTH actor + subject
- Cross-tenant access is rare + special — when it happens
  (admin support, cross-tenant report), the event MUST include
  both tenant IDs + a justification field (`reason: "support
  ticket SUP-12345"`)
- Tenants can query their own audit log (per `gdpr-ccpa.md`
  access right) but not others'
- Internal admins querying multi-tenant audit data MUST do so
  through a logged tool, not raw DB access

## Per-language implementation

| Language | Audit library / pattern |
| --- | --- |
| Node.js | OpenTelemetry events + dedicated `audit` logger via pino with redact paths |
| Go | `slog` with audit-specific handler + outbox writer |
| Python | `audit-logger` library OR custom structlog wrapper |
| Java | Spring Security `AuditEventRepository` + outbox |
| Ruby | `audited` gem + outbox forward to dedicated store |
| .NET | `Microsoft.Extensions.Logging` with an audit sink |

Per `reuse-first.md` — pick ONE audit framework per service; don't
emit ad-hoc events.

## Anti-patterns

### Anti-pattern 1: Operational log doubling as audit log

Routing audit events through CloudWatch Logs with a 30-day
retention defeats the point. Audit needs its own store, its own
retention, its own access policy.

### Anti-pattern 2: Logging only on success

The failed-action audit is often the most important one. Login
failures point at credential stuffing; access denials point at
privilege confusion; mutation rejections point at validation
bypass attempts.

### Anti-pattern 3: Mutable audit log

If anyone with DB access can `UPDATE audit_log SET ...`, the
audit log isn't an audit log — it's a chronicle. Enforce
append-only at the schema level.

### Anti-pattern 4: PII in audit fields

Storing raw IP, raw email, full DOB in audit records makes
the audit log a privacy hazard. Hash, tokenize, or reference
the canonical source.

### Anti-pattern 5: One audit stream for everything

When the audit log contains "user clicked a button" alongside
"admin granted root", finding the security signal in the noise
is impossible. Separate streams by event class:
authentication, authorization, data access, admin actions.

## Tooling

| Tool | Use |
| --- | --- |
| **AWS CloudTrail** | AWS API audit; mandatory for any AWS workload |
| **AWS Config** | Resource config history |
| **Datadog Audit Trail** | Dedicated audit store |
| **Splunk Enterprise Security** | Security + compliance audit |
| **Elastic Audit Beat** | Self-hosted audit collection |
| **OpenTelemetry Logs** | Standardised pipeline (vendor-neutral) |
| **Auth0 / Okta Audit** | Identity-side audit |
| **Sysdig / Falco** | Container + Kubernetes audit |

## Cross-references

- `observability.md` — operational vs audit log distinction
- `log-levels.md` — audit events are INFO+
- `security.md` A09 — security logging requirements
- `gdpr-ccpa.md` — audit logs support DSAR + breach investigations
- `error-codes.md` — `reason_code` field maps to stable error
  codes on failure
- `runbook-template.md` — incident response references audit log
- `feature-flags.md` — flag changes are audit events
- `task-intake-due-diligence.md` Q11 (compliance), Q15
  (observability)

## Standards cited

- **NIST SP 800-92** — Guide to Computer Security Log Management
- **ISO/IEC 27001:2022 Annex A.8.15** — Logging
- **PCI-DSS 4.0 Requirement 10** — Log + monitor access
- **SOC 2 Trust Services Criteria CC7** — Security incidents +
  evidence
- **HIPAA §164.312(b)** — Audit controls
- **GDPR Article 30** — Records of processing activities
- **SOX §404** — Internal controls (audit trail)
- **RFC 3339** — Timestamp format
- **W3C Trace Context** — `trace_id` propagation

## Why this rule exists

Audit logs are the difference between "we think this happened"
and "we can prove this happened." In every compliance audit,
breach investigation, and customer dispute, the audit log is the
primary evidence. Without it:

- Forensic teams cannot trace a breach back to its origin
- Regulators issue fines for missing controls (GDPR Article 30,
  SOX 404, PCI-DSS 10)
- Customers cannot get answers about who accessed their data
  (DSAR failure)
- Insider threats are invisible until they cause customer harm
- Legal disputes are decided on the other side's evidence

The cost of audit logging at design time is one outbox table + a
dedicated audit sink + retention policy. The cost of missing
audit logs is incidents you cannot investigate and fines you
cannot defend.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Audit event emitted on success but not on failure (rule 5 weakening — failed actions are often the most important)
- PII surfacing in audit fields (rule 4 PII-handling violation)
- Audit event not in the same DB transaction as the business write (rule 1 weakening — audit becomes a lie when txn rolls back)
- Mutable audit log discovered (append-only enforcement gap)
- New event class shipped without a schema entry in `docs/audit-events.md` (catalog discipline weak)
- Retention window too short for the applicable regulation (regulation-driven retention drift)
- Cross-tenant access without `reason` field justification (cross-tenant isolation weak)
- Clock drift > 1 second tolerated (chain-of-custody risk)

**Refinement candidates**:

- New event class in the catalog when a new security-relevant operation emerges
- New required field when forensics consistently needs a dimension the canonical shape lacks
- Tightening of retention minimums when a regulation update lengthens the floor
- New cross-reference when a sister rule (gdpr-ccpa, security A09) prescribes audit semantics not yet captured
