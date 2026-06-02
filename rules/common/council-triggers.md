# Council Trigger Ruleset (Always-On, Global)

> Auto-fires on every file. Sister to `council-default.md` (Council
> is the default mode), `~/.claude/CLAUDE.md` (Council protocol),
> every agent file under `~/.claude/agents/`.

## Core Principle

**Every Extended Division has a documented trigger ruleset: file
patterns, keywords, change scope, plan-tier impact, regulatory
context. When the work matches a trigger, that Division
auto-engages alongside the Core Five. Triggers are mechanical —
the assistant detects them from the file paths, the diff, and
the task description.**

The triggers eliminate "should we consult Compliance for this?"
judgment calls. If the trigger matches, the Division engages. If
it doesn't, the Division is on standby.

## Core Five — always engaged (no trigger needed)

| # | Division | Always-on signal |
| --- | --- | --- |
| 1 | Architecture & Planning | Every task — even trivial ones get architectural sanity |
| 2 | Implementation & Build | Every task that writes / modifies code |
| 3 | Quality & Review | Every task that writes / modifies code OR docs |
| 4 | Security | Every task — security is cross-cutting |
| 5 | Testing & QA | Every task that writes / modifies code |

## Extended Eleven — trigger rulesets

### Division 6 — Compliance & Legal

**Lead agent**: `compliance-reviewer` (opus)

**Domain sub-leads** (engage alongside `compliance-reviewer` when the
matching sub-cluster triggers fire):

- `payments-reviewer` (opus) — payments / escrow / open-banking
  / PCI-DSS / PSD2 / MTL / AML cluster
- `health-reviewer` (opus) — HIPAA / 42 CFR Part 2 / FDA SaMD /
  FHIR / clinical-data / state telehealth cluster
- `education-reviewer` (opus) — FERPA / COPPA / state student-
  privacy / LTI / SCORM / xAPI / proctoring / edtech cluster

The sub-leads bring domain depth the generic compliance-reviewer
doesn't carry; both engage together on triggered tasks and
share the Division 6 veto authority within their respective
domain scopes.

**File triggers** (path glob, case-insensitive):

- General compliance:
  `**/consent*`, `**/gdpr*`, `**/ccpa*`, `**/privacy*`,
  `**/cookie*`, `**/terms*`, `**/dsar*`, `**/dpa*`,
  `**/dpia*`, `**/ropa*`,
  `**/auth*`, `**/login*`, `**/signup*`, `**/sso*`, `**/oauth*`,
  `**/saml*`,
  `**/kyc*`, `**/aml*`, `**/sanctions*`, `**/ofac*`,
  `**/legal/*`, `**/compliance/*`, `**/regulatory/*`,
  `**/license*`, `**/LICENSE*`, `**/THIRD_PARTY*`
- Payments / escrow sub-cluster (engages `payments-reviewer`):
  `**/payment*`, `**/payments/**`, `**/billing*`, `**/invoice*`,
  `**/checkout*`, `**/stripe*`, `**/adyen*`, `**/square*`,
  `**/braintree*`, `**/paypal*`, `**/plaid*`, `**/dwolla*`,
  `**/modulr*`, `**/wise*`, `**/refund*`, `**/chargeback*`,
  `**/dispute*`, `**/subscription*`, `**/dunning*`,
  `**/payout*`, `**/transfer*`, `**/escrow*`, `**/wallet*`,
  `**/ledger*`, `**/reconcil*`, `**/3ds*`, `**/sca*`,
  `**/psd2*`, `**/fapi*`, `**/open-banking*`, `**/tokeniz*`,
  `**/merchant-of-record*`, `**/mtl*`, `**/fincen*`, `**/msb*`,
  `**/bsa*`
- Health / clinical sub-cluster (engages `health-reviewer`):
  `**/phi*`, `**/ephi*`, `**/hipaa*`, `**/patient*`,
  `**/clinical*`, `**/medical*`, `**/health*`, `**/ehr*`,
  `**/emr*`, `**/fhir*`, `**/hl7*`, `**/dicom*`, `**/ccda*`,
  `**/cda*`, `**/smart-on-fhir*`, `**/healthkit*`,
  `**/health-connect*`, `**/telehealth*`, `**/encounter*`,
  `**/observation*`, `**/medication*`, `**/diagnosis*`,
  `**/allergy*`, `**/immunization*`, `**/procedure*`,
  `**/condition*`, `**/lab*`, `**/imaging*`, `**/prescription*`,
  `**/eprescrib*`, `**/erx*`, `**/icd-10*`, `**/snomed*`,
  `**/loinc*`, `**/rxnorm*`, `**/cpt*`, `**/x12*`, `**/edi*`,
  `**/eob*`, `**/eligibility*`, `**/claim*`, `**/baa*`,
  `**/business-associate*`, `**/42-cfr-part-2*`,
  `**/substance*`, `**/samd*`, `**/21-cfr-part-11*`, `**/gxp*`
- Education / edtech sub-cluster (engages `education-reviewer`):
  `**/lti/**`, `**/lti-1p3/**`, `**/scorm/**`, `**/xapi/**`,
  `**/cmi5/**`, `**/oneroster/**`, `**/caliper/**`, `**/qti/**`,
  `**/common-cartridge/**`, `**/badge/**`, `**/openbadges/**`,
  `**/credential/**`, `**/clr/**`, `**/lms/**`, `**/sis/**`,
  `**/canvas-api/**`, `**/schoology/**`, `**/moodle/**`,
  `**/blackboard/**`, `**/brightspace/**`, `**/d2l/**`,
  `**/google-classroom/**`, `**/clever*/**`, `**/classlink*/**`,
  `**/proctor*`, `**/proctoring/**`, `**/respondus/**`,
  `**/proctortrack/**`, `**/proctoru/**`, `**/grade-passback/**`,
  `**/grade-sync/**`, `**/ags/**`, `**/nrps/**`, `**/student*`,
  `**/learner*`, `**/coppa*`, `**/ferpa*`, `**/student-privacy*`,
  `**/parental-consent*`, `**/vpc*`, `**/sopipa*`, `**/iep*`,
  `**/504-plan*`, `**/accommodat*`,
  `**/imsmanifest.xml`, `**/cmi5.xml`

**Keyword triggers** (in diff or task description):

- General compliance:
  "personal data", "PII", "PHI", "PCI", "card", "credit card",
  "ssn", "passport", "national id",
  "GDPR", "CCPA", "CPRA", "HIPAA", "PCI-DSS", "PCI", "SOC 2",
  "ISO 27001", "ISO27001", "SOX", "LGPD", "PIPEDA", "POPIA",
  "consent", "lawful basis", "data subject", "right to be
  forgotten", "right to deletion",
  "encrypt at rest", "encryption key", "KMS", "HSM",
  "data residency", "cross-border transfer", "SCC", "DPA",
  "DPF", "BCR",
  "audit log", "audit trail", "retention", "minimum necessary",
  "minor", "child", "COPPA", "EU consumer"
- Payments sub-cluster (engages `payments-reviewer`):
  "Stripe", "Adyen", "Square", "Braintree", "PayPal", "Plaid",
  "Dwolla", "Modulr", "ACH", "SEPA", "FedNow", "RTP", "Faster
  Payments", "Pix", "UPI", "3D Secure", "3DS2", "SCA", "Strong
  Customer Authentication", "network token", "tokenization",
  "PAN", "CVV", "CVC", "BIN", "checkout", "charge", "capture",
  "refund", "chargeback", "dispute", "decline", "PCI-DSS", "QSA",
  "ROC", "AOC", "SAQ", "CHD", "cardholder data", "CDE",
  "PSD2", "FAPI", "open banking", "instant payment", "rail",
  "settlement", "interchange", "merchant of record", "MoR",
  "escrow", "trust account", "FBO", "MTL", "money transmitter",
  "FinCEN", "MSB", "AMLD", "AML", "KYC", "KYB", "OFAC",
  "sanctions", "SDN", "CTR", "SAR", "BSA", "subscription",
  "billing cycle", "dunning", "involuntary churn", "payout",
  "platform payments", "Connect", "Marketplace", "split tender",
  "1099-K", "Form 8300"
- Health sub-cluster (engages `health-reviewer`):
  "PHI", "ePHI", "HIPAA", "HITECH", "covered entity", "business
  associate", "BAA", "minimum necessary", "FHIR", "USCDI", "HL7",
  "v2", "ADT", "ORU", "DICOM", "PACS", "C-CDA", "CCD", "SMART on
  FHIR", "SMART Health Card", "SMART Health Link", "EHR", "EMR",
  "Epic", "Cerner", "Oracle Health", "Athena", "NextGen",
  "Allscripts", "HealthKit", "Health Connect", "telehealth",
  "telemedicine", "ICD-10", "SNOMED-CT", "LOINC", "RxNorm",
  "CPT", "HCPCS", "NDC", "Bundle", "Observation", "Patient",
  "Encounter", "MedicationRequest", "ServiceRequest", "Condition",
  "AllergyIntolerance", "X12 EDI", "270/271", "835", "837",
  "EOB", "eligibility", "prior authorization", "42 CFR Part 2",
  "substance use disorder", "SUD", "SaMD", "Software as a
  Medical Device", "FDA", "21 CFR Part 11", "GxP", "EPCS"
- Education sub-cluster (engages `education-reviewer`):
  "FERPA", "COPPA", "GDPR Art 8", "GDPR-K", "AADC", "Age
  Appropriate Design Code", "Student Privacy Pledge", "NY §2-d",
  "Education Law 2-d", "SOPIPA", "CSDPA", "MEC-NDPA", "DPA",
  "Connecticut Public Act 16-189", "PPRA", "CIPA", "IDEA",
  "Section 504", "Title II ADA", "EAA", "school official
  exception", "studies exception", "directory information",
  "educational record", "verifiable parental consent", "VPC",
  "operator", "LTI", "LTI 1.3", "LTI Advantage", "AGS", "NRPS",
  "Deep Linking", "xAPI", "Experience API", "LRS", "Learning
  Record Store", "cmi5", "SCORM", "OneRoster", "Caliper", "QTI",
  "Common Cartridge", "Open Badges", "Verifiable Credential",
  "CLR", "K-12", "higher ed", "MOOC", "LMS", "VLE", "LXP",
  "SIS", "Student Information System", "IEP", "504 Plan",
  "accommodation", "extended time", "scribe", "read-aloud",
  "proctoring", "remote proctor", "AI proctor", "adaptive
  learning", "CAT", "IRT", "knowledge tracing", "AccessForAll",
  "PNP", "UDL", "Universal Design for Learning", "early warning
  system", "EWS", "at-risk model", "grade passback", "gradebook",
  "transcript"

**Change-scope triggers**:

- Any change to a `users`, `accounts`, `customers`,
  `patients`, `members`, `students`, `learners` table
- Any change to billing / payment / refund / chargeback /
  escrow / payout flow
- Any change to an authentication / authorisation system
- Any new external processor (third-party service receiving
  PII / PHI / student records)
- Any new field on a personal-data / clinical-data / student-
  data table
- Any export endpoint or DSAR-related flow
- Any new EHR integration, mHealth ingest, or telehealth surface
- Any new LMS integration, LTI tool, SCORM / xAPI / cmi5
  content ingest, OneRoster sync
- Any new credential issuance (Open Badges, certificate, CLR)
- Any new assessment or proctoring surface
- Any change to accommodation handling (IEP / 504 / institution-
  set)
- Any change to AI-grader / AI-tutor / AI-proctor / EWS
- Any new escrow / trust-account state machine
- Any change to KYC / AML / sanctions screening
- Any change to PCI scope (network segmentation, terminal, IVR,
  e-commerce flow)

**Veto authority**: Yes — on unresolved regulatory finding.
Sub-leads share the veto within their domain scopes:

- `payments-reviewer` — VETO on PCI-DSS BLOCKER, PSD2 bypass,
  webhook signature absence, idempotency missing on state-
  mutating endpoint, MTL absence on custodial flow, sanctions
  screening bypass, reconciliation gap
- `health-reviewer` — VETO on HIPAA Privacy / Security BLOCKER,
  42 CFR Part 2 violation, clinical-safety BLOCKER, FDA SaMD
  classification breach, breach-clock miss, BAA absence
- `education-reviewer` — VETO on COPPA / FERPA / NY §2-d / 2025
  COPPA Final Rule BLOCKER, WCAG 2.2 AA on assessment paths,
  Section 504 / IDEA accommodation bypass, proctoring without
  bias audit, AI grader without human review, LTI 1.1 in new
  code, DPA absence when school-as-agent claimed

### Division 7 — Product, UX & Customer Experience

**Lead agents**: `ux-reviewer`, `accessibility-reviewer` (opus)

**File triggers**:

- `**/*.vue`, `**/*.jsx`, `**/*.tsx` (UI files)
- `**/views/**`, `**/components/**`, `**/pages/**`,
  `**/layouts/**`, `**/screens/**`, `**/widgets/**`
- `**/*.css`, `**/*.scss`, `**/*.module.css`, `**/*.styled.ts`
- `**/figma/**`, `**/design/**`
- `**/i18n/**`, `**/locales/**`, `**/translations/**`,
  `**/*.po`, `**/*.xliff`, `**/*.arb`
- `**/emails/**`, `**/templates/**`, `**/notifications/**`
- `**/microcopy/**`, `**/strings/**`, `**/copy/**`

**Keyword triggers**:

- "accessibility", "a11y", "WCAG", "ARIA", "screen reader",
  "keyboard navigation"
- "user", "customer", "UX", "UI", "user-facing", "user-visible",
  "user flow"
- "error message", "toast", "banner", "modal", "alert",
  "notification"
- "button label", "field label", "placeholder", "tooltip",
  "instructions"
- "onboarding", "signup flow", "login flow", "checkout flow",
  "form"
- "loading state", "empty state", "error state", "success state"
- "responsive", "mobile", "tablet", "touch target"
- "color contrast", "focus indicator", "alt text"
- "i18n", "internationalization", "localisation", "RTL",
  "Arabic", "Hebrew", "translation"

**Change-scope triggers**:

- Any new user-facing screen / page / view
- Any change to copy that users see
- Any change to error messages
- Any change to forms / inputs
- Any change to navigation / routing
- Any change to email templates
- Any change to push / SMS notifications

**Veto authority**: No — but BLOCKER-severity finding (WCAG
violation, error UX that violates user-rights) escalates to
Compliance.

### Division 8 — Operations & Reliability

**Lead agent**: `ops-reviewer`

**File triggers**:

- `**/runbook*`, `**/RUNBOOK*`, `**/playbook*`, `**/PLAYBOOK*`
- `**/SLO*`, `**/SLA*`, `**/SLI*`
- `**/oncall*`, `**/on-call*`, `**/pagerduty*`, `**/opsgenie*`
- `**/grafana/**`, `**/prometheus/**`, `**/loki/**`,
  `**/datadog/**`, `**/cloudwatch/**`
- `**/.github/workflows/**`, `**/.gitlab-ci.yml`,
  `**/Jenkinsfile`, `**/buildspec.yml`
- `**/k8s/**`, `**/kustomize/**`, `**/helm/**`,
  `**/terraform/**`, `**/cdk/**`, `**/pulumi/**`
- `**/Dockerfile*`, `**/docker-compose*.yml`
- `**/deploy*`, `**/deployment*`, `**/release*`

**Keyword triggers**:

- "SLO", "SLI", "SLA", "error budget", "burn rate"
- "monitoring", "observability", "metrics", "tracing", "logs"
- "alert", "page", "on-call", "rotation"
- "incident", "outage", "post-mortem", "RCA", "root cause",
  "5xx", "downtime"
- "rollback", "rollforward", "canary", "blue-green",
  "feature flag rollout"
- "capacity", "scaling", "autoscaling", "load test",
  "stress test"
- "deploy", "release", "ship", "promote"
- "circuit breaker", "rate limit", "throttling", "graceful
  degradation"

**Change-scope triggers**:

- Any change to deploy configuration
- Any change to CI/CD pipeline
- Any change to monitoring / alerting rules
- Any change to infrastructure-as-code
- Any change to the runbook
- Any new external dependency (affects SLO)
- Any change that affects capacity (new workload, new query
  pattern)

**Veto authority**: No, but invokes Risk (Div 11) for changes
affecting prod posture.

### Division 9 — Data & Analytics

**Lead agent**: `data-reviewer`

**File triggers**:

- `**/migrations/**`, `**/db/**`, `**/database/**`,
  `**/schema/**`, `**/models/**`
- `**/*.sql`, `**/*.dbml`, `**/*.prisma`,
  `**/schema.prisma`, `**/schema.rb`
- `**/dbt/**`, `**/airflow/**`, `**/dagster/**`,
  `**/prefect/**`, `**/luigi/**`
- `**/analytics/**`, `**/events/**`, `**/segment/**`,
  `**/snowplow/**`, `**/amplitude/**`, `**/mixpanel/**`
- `**/etl/**`, `**/elt/**`, `**/pipeline/**`
- `**/bigquery/**`, `**/snowflake/**`, `**/redshift/**`,
  `**/clickhouse/**`

**Keyword triggers**:

- "schema migration", "ALTER TABLE", "CREATE TABLE", "DROP
  COLUMN"
- "event tracking", "analytics event", "tracking plan",
  "schema registry"
- "ETL", "ELT", "data warehouse", "lakehouse", "data lake"
- "PII flow", "data lineage", "data classification"
- "dbt model", "materialization", "incremental model"
- "aggregation", "metric definition", "dimension"

**Change-scope triggers**:

- Any schema migration
- Any new event type in analytics
- Any change to a tracking plan
- Any new data export / ingest
- Any change to dbt models / materialized views

**Veto authority**: No, but invokes Compliance (Div 6) if PII
is involved.

### Division 10 — Finance & FinOps

**Lead agent**: `finance-reviewer`

**File triggers**:

- `**/billing/**`, `**/pricing/**`, `**/plans/**`,
  `**/subscriptions/**`, `**/invoices/**`
- `**/cost/**`, `**/finops/**`, `**/budget/**`
- `**/payouts/**`, `**/payments/**`, `**/refunds/**`,
  `**/chargebacks/**`
- `**/terraform/**` (resource sizing has cost impact),
  `**/k8s/**` (HPA / requests / limits)
- `**/lambda/**`, `**/cloudfront/**`, `**/s3/**`,
  `**/dynamodb/**`, `**/rds/**` (cost-sensitive services)

**Keyword triggers**:

- "pricing", "plan tier", "subscription", "billing",
  "invoice", "refund", "chargeback"
- "cost", "spend", "budget", "FinOps", "unit economics",
  "CAC", "LTV", "MRR", "ARR"
- "cloud cost", "AWS cost", "GCP cost", "Azure cost"
- "reserved instance", "savings plan", "spot", "on-demand"
- "data transfer", "egress", "ingress"
- "API call cost", "per-request cost", "per-user cost"

**Change-scope triggers**:

- Any change to pricing / plan tier
- Any change to billing logic
- Any new cloud resource of significant cost class
- Any change to instance sizing / replica count / autoscaling
  bounds
- Any change to data transfer patterns

**Veto authority**: No, but invokes Strategy (Div 12) for
material economic impact.

### Division 11 — Risk Management

**Lead agent**: `risk-reviewer`

**File triggers**:

- `**/dr/**`, `**/disaster-recovery/**`, `**/bcp/**`,
  `**/business-continuity/**`
- `**/backup/**`, `**/restore/**`, `**/snapshot/**`
- `**/runbook/**` (overlap with Ops — both engage)
- `**/risk-register*`, `**/risk-log*`

**Keyword triggers**:

- "blast radius", "scope", "change risk", "scenario planning"
- "disaster recovery", "DR", "BCP", "business continuity"
- "RPO", "RTO", "MTTR", "MTBF"
- "backup", "restore", "rollback", "DR test"
- "single point of failure", "SPOF", "multi-region",
  "active-active", "active-passive"
- "data loss", "irreversible", "destructive"

**Change-scope triggers**:

- Any destructive operation (DROP TABLE, DELETE FROM, file
  unlink)
- Any change to backup configuration
- Any change to multi-region setup
- Any new SPOF being introduced
- Any change with blast radius beyond a single service
- Any deploy that touches > 10% of services in scope

**Veto authority**: Yes — on changes whose blast radius exceeds
defined scope.

### Division 12 — Strategy & Innovation

**Lead agent**: `strategy-reviewer`

**File triggers**:

- `**/adr/**`, `**/ADR-*`, `**/rfc/**`, `**/RFC-*`
- `**/roadmap*`, `**/strategy*`, `**/vision*`
- `**/CHANGELOG*`, `**/RELEASE*`
- `**/deprecation*`, `**/sunset*`

**Keyword triggers**:

- "new feature", "new product", "new surface", "new market"
- "competitive", "market positioning", "differentiation"
- "deprecate", "sunset", "end of life", "EOL", "retire"
- "vendor selection", "build vs buy"
- "experiment", "A/B test", "MVP", "POC", "spike"

**Change-scope triggers**:

- New feature with public-facing impact
- Major version bump
- Deprecation announcement
- New vendor / external integration
- Significant pivot or directional change

**Veto authority**: No, advisory.

### Division 13 — People & Culture

**Lead agent**: `people-reviewer`

**File triggers**:

- `**/CONTRIBUTING*`, `**/CODE_OF_CONDUCT*`, `**/CODEOWNERS*`
- `**/hiring/**`, `**/onboarding/**`, `**/career/**`
- `**/.github/CODEOWNERS`, `**/.gitlab/CODEOWNERS`
- `**/docs/team*`, `**/team-structure*`, `**/org-chart*`

**Keyword triggers**:

- "onboarding", "hiring", "interview", "career ladder",
  "performance"
- "knowledge management", "documentation gap", "bus factor",
  "single source of knowledge"
- "team structure", "org design", "team topology"
- "developer experience", "DX", "dev productivity"
- "ownership", "RACI", "responsibility matrix"

**Change-scope triggers**:

- Significant change to team boundaries / ownership
- Onboarding-impact changes (new tooling, new processes)
- Anything affecting bus-factor < 2 on critical systems

**Veto authority**: No, advisory.

### Division 14 — Sustainability & ESG

**Lead agent**: `esg-reviewer`

**File triggers**:

- `**/esg/**`, `**/sustainability/**`, `**/carbon/**`
- `**/cloud-carbon-footprint*`, `**/scope*-emissions*`

**Keyword triggers**:

- "carbon footprint", "emissions", "scope 1", "scope 2",
  "scope 3"
- "green computing", "low-carbon region", "renewable energy"
- "ESG", "sustainability report", "ISO 14001",
  "ISO 9001:2026"
- "supplier ethics", "modern slavery", "conflict minerals"
- "energy efficiency", "carbon-aware scheduling"

**Change-scope triggers**:

- New cloud region (carbon intensity varies)
- Significant compute increase (always-on workloads)
- New vendor with ESG implications

**Veto authority**: No, advisory.

### Division 15 — Ethics & Responsible AI

**Lead agent**: `ai-ethics-reviewer` (opus)

**File triggers**:

- `**/ml/**`, `**/ai/**`, `**/llm/**`, `**/model/**`,
  `**/inference/**`, `**/training/**`
- `**/prompts/**`, `**/embeddings/**`, `**/rag/**`,
  `**/fine-tune/**`
- `**/openai/**`, `**/anthropic/**`, `**/bedrock/**`,
  `**/vertex/**`, `**/azureopenai/**`, `**/replicate/**`
- `**/recommendation/**`, `**/personalization/**`,
  `**/ranking/**`, `**/scoring/**`
- `**/decision*` (algorithmic decision-making)

**Keyword triggers**:

- "LLM", "GPT", "Claude", "Gemini", "Llama", "Mistral"
- "embedding", "vector", "RAG", "fine-tune", "instruction tune"
- "bias", "fairness", "demographic parity", "equalised odds"
- "automated decision", "ADM", "GDPR Article 22"
- "model card", "datasheet for datasets", "fact sheet"
- "hallucination", "groundedness", "alignment"
- "training data", "synthetic data", "data poisoning"
- "prompt injection", "jailbreak"

**Change-scope triggers**:

- Any new ML / AI / LLM-powered feature
- Any change to model selection or version
- Any change to training data
- Any new prompt template that affects user-visible output
- Any feature that produces an automated decision affecting
  users

**Veto authority**: Yes — on AI safety / fairness / bias
findings.

### Division 16 — Communications & Documentation

**Lead agents**: `doc-updater`, `comms-reviewer`

**File triggers**:

- `**/*.md` (docs), `**/docs/**`, `**/README*`
- `**/CHANGELOG*`, `**/RELEASE_NOTES*`
- `**/api/openapi*`, `**/schema.graphql`, `**/proto/**`
- `**/blog/**`, `**/marketing/**`, `**/press/**`
- `**/status-page*`, `**/incident-comms*`

**Keyword triggers**:

- "release notes", "changelog", "migration guide"
- "marketing", "blog post", "press release", "announcement"
- "API docs", "documentation update"
- "status page", "incident communication", "post-mortem
  public"
- "trademark", "brand guideline"

**Change-scope triggers**:

- Any public-facing artifact (blog, marketing, press)
- Any API change (consumes downstream docs)
- Any incident requiring external comms
- Any release with customer-visible changes

**Veto authority**: No — but BLOCKER on misleading or
non-compliant comms (escalates to Compliance + Strategy).

## Cross-cutting trigger composition

Many tasks fire MULTIPLE divisions. Examples:

- **New payment integration** → 4 (Security) + 6 (Compliance) +
  7 (UX for error states) + 8 (Operations — new dep) + 9 (Data
  — billing events) + 10 (Finance) + 16 (Comms — API docs)
- **New ML recommendation feature** → 4 (Security) + 7 (UX) +
  9 (Data — events) + 11 (Risk — model failure modes) + 15
  (Ethics) + 16 (Comms — model card)
- **Schema migration affecting user data** → 1 (Architecture) +
  2 (Implementation) + 4 (Security) + 6 (Compliance — data
  lifecycle) + 8 (Operations — deploy) + 9 (Data) + 11 (Risk —
  rollback)

The default is INCLUSIVE: if a trigger matches, the Division
engages. Better to consult one Division too many than miss a
critical perspective.

## How triggers are evaluated

At task entry, the assistant:

1. Reads the prompt, file paths, change scope
2. Matches against each Division's trigger ruleset
3. Builds the list of engaged Divisions (Core Five + any
   Extended that matched)
4. Phase 0 includes each engaged Division's intake
5. Phase 1 has each Division speak in order
6. Phase 2 consensus accounts for all engaged Divisions

The trigger detection is mechanical; the assistant should
SURFACE which Divisions are engaging at the start of the task
so the user can see the trigger logic:

```text
Council engaged this turn:
  - Core Five (always)
  - Division 6 (Compliance) — GDPR consent UX change
  - Division 7 (UX) — modifying user-facing copy
  - Division 9 (Data) — adding a new analytics event
```

## Cross-references

- `council-default.md` — Council is the default mode
- `~/.claude/CLAUDE.md` — Council protocol shape
- Every agent file under `~/.claude/agents/` — agents are
  Division members
- `task-intake-due-diligence.md` — Phase 0 intake
- `audit-logging.md` — Division engagement events logged
- `feature-flags.md`, `gdpr-ccpa.md`, `a11y.md`,
  `audit-logging.md`, `circuit-breaker.md`, etc. — specific
  rules that Divisions cite

## Why this rule exists

Without a trigger ruleset, Extended Division engagement
depends on the assistant's judgment — which is variable. A task
that should engage Compliance gets missed because the words
"GDPR" or "PII" weren't explicitly in the prompt; the
Compliance perspective is lost; a privacy gap ships.

Mechanical triggers solve this:

- File pattern matches → Division engages
- Keyword matches → Division engages
- Scope matches → Division engages

The triggers are conservative (over-include rather than
under-include). False positives cost a few seconds of "this
Division has nothing material to add"; false negatives cost
incidents.

User directive: "Council division completeness verified via web
research against ISO 9001:2026, Team Topologies, C-suite
org-design literature, 2026 engineering team role surveys, ISO
27001, ITIL 4. Result: 5 → 16 divisions (5 core + 11 extended).
Each has its own trigger ruleset."

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Division engaged but its trigger ruleset didn't fire (false-positive engagement — trigger needs narrowing)
- Division should have engaged but no trigger matched (false-negative — trigger needs broadening)
- Trigger fires across the wrong file class (file glob overshoots; needs refinement)
- New file pattern emerges in projects that no Division claims (new trigger row needed)
- Keyword set drifts behind industry usage (e.g., new regulation name, new vendor name)
- Multiple Divisions fire on the same task but one consistently has nothing material to add (right-sizing)
- Trigger-detection logic disagrees with manual judgement in 2+ retrospectives

**Refinement candidates**:

- New file glob / keyword entry when a recurring pattern doesn't fire the right Division
- Removal of an over-broad trigger when false-positive engagements waste cycles
- New Division when the trigger ruleset reveals a coverage gap not served by the existing 16
- Tightening of "auto-fire" logic when a Division consistently engages on edge cases that don't need it
