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
+ remove direct identifiers + drop high-cardinality quasi-
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

```
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
