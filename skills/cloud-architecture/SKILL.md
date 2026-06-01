---
name: cloud-architecture
description: Principal-level cloud architecture — Well-Architected Framework pillars (operational excellence, security, reliability, performance, cost optimisation, sustainability), region/AZ/zone topology, compute and storage selection, multi-region patterns, and the disciplined decisions that turn cloud capability into resilient, cost-aware, secure systems instead of a sprawling spend graph.
auto_activate: true
---

# Cloud Architecture

## Purpose

Design and operate cloud systems against the published Well-
Architected frameworks (AWS, GCP, Azure) — applying the six pillars
(operational excellence, security, reliability, performance
efficiency, cost optimisation, sustainability) as routine checks
rather than once-a-year reviews. The goal is to choose the right
service for the right workload, place it in the right topology
(region / AZ / zone), wire it with the right network and identity
boundaries, instrument it for the right operational signals, and
make the cost-vs-resilience trade-offs explicitly rather than
discovering them when the next bill arrives.

The skill activates whenever a new system component is proposed,
when a service-vs-service decision is being debated (Lambda vs ECS
vs EKS, RDS vs Aurora vs DynamoDB, ALB vs NLB vs CloudFront +
Lambda@Edge), when a multi-region or DR design is on the table,
when a cost-optimisation push is underway, when a region migration
or cloud migration is being scoped, when an architectural review
is requested for an existing system, and when an incident reveals
an underlying architecture flaw (cross-AZ traffic charges
exploding, single-AZ blast radius, IAM blast radius, etc.).

## Standards Cited

- **AWS Well-Architected Framework** (current revision, including
  the Sustainability pillar added 2021 and the Generative AI Lens
  added 2024) — six pillars + lenses + design principles +
  questions
- **Google Cloud Architecture Framework** (cloud.google.com/
  architecture/framework) — operational excellence, security +
  privacy + compliance, reliability, cost optimisation, performance
  optimisation
- **Microsoft Azure Well-Architected Framework** (learn.microsoft.com)
  — same five pillars; tightly integrated with Microsoft Defender
  for Cloud
- **CNCF Cloud Native Trail Map** (cncf.io) — open-source projects
  mapped to architecture layers; container orchestration,
  observability, service mesh, etc.
- **NIST SP 800-145** — "The NIST Definition of Cloud Computing"
  (IaaS / PaaS / SaaS; public / private / hybrid / community)
- **NIST SP 800-204D (2024)** — Strategies for the Integration of
  Software Supply Chain Security in DevSecOps CI/CD Pipelines
- **CIS Foundations Benchmarks** for AWS / GCP / Azure (cisecurity.
  org) — concrete baseline hardening
- **The Twelve-Factor App (12factor.net)** — Wiggins; foundational
  for cloud-native application design
- **Designing Data-Intensive Applications (Kleppmann, O'Reilly 2017)**
  — replication, partitioning, consistency models, batch vs stream
- **The Site Reliability Engineering Book + Workbook (Beyer et al,
  O'Reilly 2016 / 2018)** — SLO / SLI / error budget framework
- **ISO/IEC 27017:2015 + 27018:2019** — cloud-specific information
  security + PII processor controls
- **FinOps Foundation Framework** (finops.org) — capabilities +
  domains for cloud financial management
- **The Green Software Foundation Principles** — carbon-aware
  computing standards

## When to Fire

Auto-engage on these signals:

- A new system / service / module is being designed (greenfield
  or large addition)
- Compute selection debate (Lambda vs ECS / EKS vs EC2; Cloud Run
  vs GKE; App Service vs AKS)
- Data store selection debate (RDS vs Aurora vs DynamoDB; Spanner
  vs Cloud SQL; Cosmos vs SQL Server)
- Multi-region / multi-AZ / DR / business continuity planning
- Region migration (Europe data residency, US Gov region) or
  cloud migration (AWS ↔ GCP ↔ Azure)
- Architectural review of an existing system
- Cost optimisation push ("we need to cut cloud spend by 25%")
- Incident post-mortem revealing architecture gap (single-AZ
  outage, cross-AZ NAT charge spike, IAM blast radius)
- Compliance-driven architectural change (data residency,
  encryption, network isolation requirement from SOC2, ISO, PCI,
  HIPAA, GDPR)
- IaC (Terraform, Pulumi, CDK, CloudFormation, Bicep) module
  authoring
- Service mesh introduction debate (Istio, Linkerd, Consul, AWS
  App Mesh)
- Edge / CDN strategy work (CloudFront, Cloudflare, Fastly, Akamai)
- Database migration (RDBMS to NoSQL, on-prem to cloud-managed)
- High-availability uplift on an existing single-AZ workload
- An "AWS organisation" / multi-account landing-zone design

## Core Patterns

### The Six Well-Architected Pillars (AWS framing; near-identical
in GCP + Azure)

Every architectural decision is evaluated against all six. Trade-
offs are explicit, not hidden.

| Pillar | Question every design must answer |
| --- | --- |
| **Operational Excellence** | Can we deploy + observe + respond + improve continuously? |
| **Security** | Is the attack surface minimised, defence in depth, least privilege, encrypted in transit + at rest, identity-bounded? |
| **Reliability** | What's the SLO? Can we survive zone / region / dependency failure within the SLO? |
| **Performance Efficiency** | Right service + right size + right config; baseline + scale; latency budget |
| **Cost Optimisation** | Spend visibility, right-sizing, reserved capacity strategy, idle elimination, architectural choices that compound |
| **Sustainability** | Carbon-aware region selection, workload right-sizing, scheduling, managed services over self-hosted where carbon-positive |

### Region / AZ / Zone Topology

The single biggest determinant of reliability + cost is your
topology choice.

| Pattern | Reliability | Cost | When |
| --- | --- | --- | --- |
| **Single AZ** | Lowest — any AZ failure = outage | Lowest | Dev / lab / non-critical workloads only |
| **Multi-AZ in single region** | High — survives AZ failure | Moderate | Default for any prod workload |
| **Multi-region active-passive (warm standby)** | Very high — survives region failure with minutes of RTO | High | Customer-facing critical |
| **Multi-region active-active** | Highest — region failure transparent to most users | Highest | Globally distributed users + low-latency requirements |
| **Multi-region pilot light (data replicated, compute dormant)** | Moderate — region failure recoverable in hours | Moderate | Cost-sensitive DR strategies |
| **Multi-cloud** | Cloud-vendor failure tolerance | Very high | Regulatory / strategic; rare and complex |

Cross-AZ traffic costs are real and easy to miss. AWS charges
roughly $0.01-$0.02/GB for inter-AZ traffic; for a chatty
microservice architecture this becomes a five-figure monthly line
item invisibly. Architect for AZ-affinity where consistency
allows.

### Compute Selection Matrix

| Workload shape | Recommended (AWS) | Recommended (GCP) | Recommended (Azure) |
| --- | --- | --- | --- |
| **HTTP API, sub-second invocation, sporadic** | Lambda + API Gateway | Cloud Run / Cloud Functions | Azure Functions / App Service |
| **HTTP API, sustained, container-native** | ECS Fargate / Apprunner | Cloud Run | Container Apps |
| **HTTP API, complex orchestration** | EKS | GKE | AKS |
| **Background batch / cron** | Step Functions + Lambda / Batch | Cloud Tasks / Batch | Logic Apps + Functions |
| **Long-running stateful workload** | EC2 / ECS EC2 / EKS EC2 | Compute Engine / GKE | Virtual Machines / AKS |
| **GPU / ML training** | EC2 GPU / SageMaker / Bedrock | Compute Engine GPU / Vertex AI | NC-series VMs / Azure ML |
| **Edge compute** | Lambda@Edge / CloudFront Functions | Cloud CDN + Cloud Run | Front Door + Edge Functions |
| **Spot / preemptible-tolerant** | EC2 Spot / Fargate Spot / EKS Karpenter | Preemptible / Spot VMs | Azure Spot VMs |
| **Container-native dev velocity** | App Runner / Lightsail | Cloud Run | App Service / Container Apps |

The rule: prefer the highest-managed service that meets the
constraint. Serverless for sporadic + event-driven, managed
containers for steady microservices, orchestrated containers
(K8s) only when you need the orchestration capabilities (not
because K8s is trendy). EC2 / VMs only when you need OS-level
control or stateful behaviour the managed services can't deliver.

### Storage Selection

| Need | Service (AWS) | Service (GCP) | Service (Azure) |
| --- | --- | --- | --- |
| **Object store** | S3 (multi-tier: Standard / IA / Glacier) | Cloud Storage (Standard / Nearline / Coldline / Archive) | Blob Storage (Hot / Cool / Archive) |
| **Block storage** | EBS (gp3 default; io2 for IOPS) | Persistent Disk | Managed Disks |
| **File storage NFS** | EFS / FSx | Filestore | Azure Files |
| **Relational managed** | RDS / Aurora | Cloud SQL / AlloyDB / Spanner | Azure SQL / PostgreSQL |
| **NoSQL key-value** | DynamoDB | Firestore / Bigtable | Cosmos DB |
| **Wide-column** | Keyspaces | Bigtable | Cosmos for Cassandra |
| **Cache** | ElastiCache (Redis / Memcached) | Memorystore | Cache for Redis |
| **Search** | OpenSearch | (managed Elasticsearch via partner) | Cognitive Search |
| **Analytics warehouse** | Redshift | BigQuery | Synapse Analytics |
| **Lake** | S3 + Glue + Athena | Cloud Storage + BigLake + BigQuery | Data Lake + Synapse |
| **Stream** | Kinesis / MSK | Pub/Sub | Event Hubs |
| **Queue** | SQS | Cloud Tasks / Pub/Sub | Service Bus |

### Identity + Access Boundary Design

Multi-account / multi-project / multi-subscription is the default
isolation pattern. AWS Organizations, GCP Folders + Projects, Azure
Management Groups + Subscriptions provide hierarchical isolation
+ policy inheritance.

Pattern:
- **Per-environment isolation** — separate prod / staging / dev /
  sandbox accounts (or projects/subscriptions)
- **Per-business-unit isolation** — separate parent OUs / folders /
  management groups
- **Per-workload isolation** for high-blast-radius workloads
- **Centralised** — networking (Transit Gateway / Shared VPC /
  Hub-Spoke), security (GuardDuty / SCC / Defender), logging
  (CloudTrail / Audit / Activity Logs), identity (IAM Identity
  Center / Cloud Identity / Entra ID)
- **Permission boundaries** — IAM permission boundaries (AWS),
  IAM conditions (GCP), Conditional Access (Azure)
- **No long-lived credentials** — federated SSO + short-lived
  workload identities (IRSA, Workload Identity, Managed Identities)
- **Just-in-time access** for production — break-glass with
  approval workflow, full audit trail

### Network Architecture

Per `network-patterns`. Cloud-side highlights:
- **VPC / VNet design** — non-overlapping CIDRs across all accounts
  (plan in advance — overlap forces NAT gymnastics later)
- **Subnet tiers** — public (load balancers + NAT only) / private
  (compute) / data (databases, no internet egress)
- **Hub-and-spoke** for shared services (Transit Gateway / Shared
  VPC / Virtual WAN)
- **Private connectivity to managed services** — VPC Endpoints
  (Interface + Gateway) / Private Service Connect / Private Link;
  avoid public-internet hops to your own data plane
- **Edge ingress** — CDN + WAF + DDoS protection (CloudFront +
  AWS WAF + Shield; Cloud CDN + Cloud Armor; Front Door + WAF)
- **NAT** — managed NAT Gateway / Cloud NAT / NAT Gateway; cost
  scales with traffic, plan accordingly

### Reliability — SLO + Error Budget

Per the Google SRE Book:
- Define SLO per service (e.g., 99.9% availability over 28-day
  window)
- Compute error budget (0.1% = ~43 min/month of unavailability)
- Drive change cadence with the budget — fast deploys when budget
  is healthy, slowdown when burning
- Per `runbook-template.md`, every alert ties to an SLO

Failure modes to design against:
- AZ failure — multi-AZ everything in prod
- Region failure — multi-region for tier-1
- Dependency failure — circuit breakers (`circuit-breaker.md`),
  graceful degradation (`graceful-degradation.md`)
- Noisy neighbour — limits, throttling, isolation
- Cascade failures — rate limiting (`rate-limiting.md`), back-
  pressure, bulkheads
- Configuration error — staged rollouts, canaries, fast rollback

### Cost Optimisation

| Lever | Saving potential |
| --- | --- |
| **Right-sizing** instances | 20-50% |
| **Reserved instances / Savings Plans / Committed Use** | 30-70% on baseline |
| **Spot / preemptible** for tolerant workloads | 60-90% |
| **Storage tiering** (S3 lifecycle, Cool / Archive) | 50-80% on aged data |
| **Idle resource elimination** (zombie EBS, unattached EIPs, idle RDS) | varies wildly |
| **NAT Gateway optimisation** (VPC Endpoints) | 30-90% on egress |
| **Cross-AZ traffic reduction** (zonal architecture) | 5-30% on chatty workloads |
| **Compute architecture choice** (Lambda vs Fargate vs EC2) | varies |
| **Compression + caching** (CloudFront, in-app) | varies |
| **Data transfer optimisation** (CloudFront over direct S3 GET) | 20-50% on customer-facing |
| **Database query tuning** | varies, can be enormous |

FinOps practice (per FinOps Foundation): cross-functional team
(engineering + finance + product) operating cost as a feature,
chargeback / showback to teams, anomaly alerting, budget alerts,
quarterly architecture review for cost.

### Operational Excellence

- **IaC** — every resource provisioned via Terraform / Pulumi /
  CDK / Bicep / Deployment Manager; no clickops in production
- **CI/CD** — automated build + test + deploy with manual approval
  gate to prod for early days; progressive rollout (canary,
  blue/green) once mature
- **Observability** — metrics, logs, traces; per `observability.md`
  and `observability-patterns`
- **Runbooks** — per `runbook-template.md`
- **GameDays / chaos engineering** — Netflix Simian Army /
  Gremlin / AWS Fault Injection Simulator; verify failure-mode
  assumptions
- **Incident response** — defined severities, on-call rotation,
  blameless post-mortems

### Security

Per `security.md`, `iso27001-controls`, `owasp-asvs`:
- Identity perimeter (Zero Trust) — every request authenticated +
  authorised; no implicit trust based on network location
- Encryption at rest (KMS / Cloud KMS / Key Vault) + in transit
  (TLS 1.2+ everywhere)
- Secrets in managed vaults — never in code, env vars committed to
  source, or IaC variables
- Logging immutable + centralised — CloudTrail / Audit Logs /
  Activity Log with at least 1-year retention
- Vulnerability management — Inspector / Container Analysis /
  Defender for Containers
- DDoS — Shield Advanced / Cloud Armor / DDoS Protection Standard
- Data residency — region selection + KMS region binding
- Compliance — SOC 2 / ISO 27001 / HIPAA / PCI: cloud-provider
  certifications + customer-responsibility shared model

### Sustainability

Per the AWS Sustainability pillar (added 2021):
- **Region selection** — carbon intensity varies by region; AWS
  publishes carbon-neutral / 100% renewable-matched regions
- **Workload right-sizing** — don't pay carbon for idle capacity
- **Managed services** — generally higher utilisation than
  self-managed
- **Spot / preemptible** — uses otherwise-idle capacity
- **Data lifecycle** — delete what you don't need; cold-tier what
  you might

## Anti-Patterns

- **Lift-and-shift to EC2 then stop.** Moving an on-prem workload
  to EC2 captures none of the cloud's elasticity, managed-service,
  or operational-excellence benefits. The migration ROI shows up
  only when the workload is refactored.
- **Single AZ in prod.** "It's fine, AZ outages are rare." Until
  they aren't. AZ outages happen multiple times a year per
  provider.
- **Single account for everything.** Blast-radius nightmare; one
  IAM misconfiguration touches every workload. Multi-account
  isolation is the default.
- **NAT-egress everything.** $0.045/GB egress to AWS APIs adds up
  fast. Use VPC Endpoints / Private Link / Private Service
  Connect for AWS-to-AWS traffic.
- **CloudFront-less S3 serving customers.** Direct S3 GET from
  millions of users = high egress cost + poor cache + no edge
  performance. CDN it.
- **K8s for two services.** Operational complexity not paid back.
  Use ECS / Cloud Run / Container Apps until you have a real
  reason for K8s (>10 services, advanced workloads, multi-cluster).
- **Production RDS in default VPC.** Public-internet-accessible
  database is a breach waiting. Private subnet, no public IP, VPC
  Security Group locked to app tier.
- **Long-lived IAM users + access keys for CI/CD.** Use
  OIDC-federated workload identities (GitHub Actions →
  AssumeRoleWithWebIdentity, GitLab → JWT, etc.). Zero
  long-lived credentials.
- **Unbounded autoscaling.** A misconfigured horizontal autoscale
  with no upper bound + a query loop = $50K weekend bill. Always
  set max-replica + budget alarms.
- **No tags / no cost allocation.** Untagged resources can't be
  attributed; cost optimisation is impossible without
  attribution. Tag everything.
- **Single region for "global" customer base.** EU customers on
  US infrastructure = 150ms baseline latency + GDPR exposure.
  Multi-region or edge.
- **Active-active multi-region without thinking through write
  paths.** Multi-region writes require either CRDT-style data,
  bounded staleness models, or per-region partitioning. "Just
  replicate writes both ways" is a recipe for split-brain.
- **Custom-rolled what cloud provides.** Self-hosted Kafka, ELK,
  Postgres — when MSK, OpenSearch, RDS exist — burns engineering
  time that could be spent on customer-facing features. Use
  managed unless the constraint genuinely demands self-hosting.
- **No backup / no tested restore.** Backups that have never
  been restored are aspirational. Quarterly restore tests.
- **DR plan that lives in a doc.** Untested DR = no DR. GameDay
  the failover.
- **Vendor lock-in fear paralysis.** Multi-cloud abstractions to
  avoid lock-in usually cost more than the lock-in they prevent.
  Choose deliberately, document the exit cost, move on.

## Verification Checklist

- [ ] All six Well-Architected pillars explicitly addressed in
      the design doc
- [ ] Region + AZ topology chosen with explicit SLO and cost
      rationale
- [ ] Multi-AZ enforced for all production workloads
- [ ] Multi-region strategy explicit (active-active, warm-standby,
      pilot-light, or none with documented risk acceptance)
- [ ] Compute service selected from the matrix with rationale
- [ ] Storage service selected with consistency + durability + cost
      rationale
- [ ] Multi-account / multi-project isolation in place
- [ ] No long-lived IAM credentials in CI/CD (workload identity)
- [ ] No public-internet exposure of databases
- [ ] VPC Endpoints / Private Link used for in-cloud service-to-
      service traffic
- [ ] CDN + WAF in front of customer-facing surfaces
- [ ] All resources provisioned via IaC; no clickops in prod
- [ ] Centralised logging, metrics, tracing; per-service SLO + error
      budget
- [ ] Runbook + on-call rotation for every prod service
- [ ] Backup + tested restore procedures documented + exercised
      quarterly
- [ ] Cost allocation tags applied; cost monitored per
      team/service/environment
- [ ] Reserved capacity / Savings Plans strategy for baseline
- [ ] Region carbon-intensity considered in placement decisions
- [ ] Compliance certification posture aligns with regulatory
      scope (SOC 2, ISO 27001, HIPAA, PCI as applicable)
- [ ] DR runbook tested at least annually with measured RTO + RPO

## Cross-References

- `network-patterns` — VPC / VNet / subnet / routing / DNS / NAT /
  service-mesh patterns
- `datacenter-ops` — colocation + bare-metal + the on-prem side of
  hybrid architectures
- `aws-serverless-patterns` — Lambda + API Gateway + EventBridge +
  SQS / SNS specifics
- `dynamodb-patterns` — single-table design, GSI, RCU/WCU
- `postgres-patterns` — managed RDS / Aurora / Cloud SQL patterns
- `clickhouse-io` — analytical workload column-store
- `observability-patterns` — metrics + logs + traces wiring
- `observability.md` — SLO + Four Golden Signals
- `security.md`, `iso27001-controls`, `owasp-asvs`,
  `gdpr-ccpa-compliance` — compliance + control mappings
- `circuit-breaker.md`, `graceful-degradation.md`, `rate-limiting.md`
  — resilience patterns
- `deployment-patterns` — CI/CD + progressive rollout
- `cost-aware-llm-pipeline` — applies cost-optimisation thinking to
  the LLM stack
- `runbook-template.md` — incident response
- `secrets-management.md` — managed-vault patterns

## Why This Skill Exists

Without principal-level cloud architecture, organisations
predictably:

- **Run up unexplained bills** — cross-AZ traffic, NAT egress,
  unused snapshots, orphaned IPs, idle test environments
- **Hit reliability surprises** — single-AZ databases that
  weren't supposed to be single-AZ, missing backups, untested
  failover
- **Get breached via misconfigured IAM** — single account, wide
  permissions, long-lived credentials, no logging
- **Hit compliance walls late** — data residency, encryption,
  network isolation discovered during certification, requiring
  re-architecture mid-flight
- **Lock into one cloud accidentally** — no IaC, no exit story,
  rising negotiation weakness as committed-use renewal
  approaches
- **Spend years untangling kubernetes** they didn't need

Conversely, with principal-grade cloud architecture:
- The design doc names the trade-offs by pillar; reviewers can
  challenge or accept them on the merits
- The SLO + budget + region topology + service selection align
- Cost grows linearly with customers, not super-linearly with
  technical debt
- Security + compliance are baked in rather than bolted on
- The team can reason about failure modes because the
  architecture documents them
- New features ride on a platform that supports them, not on a
  platform they must keep working around

The cost is upfront architectural discipline — design docs,
ADRs, periodic reviews, refactors when the architecture no
longer fits the workload. The cost of skipping it is technical
debt + bill shock + outages + the slow drift toward an
architecture nobody understands until incident night, when the
person who designed it has long since left.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Workload deployed to a single AZ when the Reliability tier requires multi-AZ (Well-Architected Reliability pillar weakening)
- New service ships without an ADR documenting the architectural choice (per `~/.claude/rules/common/adr-template.md`)
- Region selection ignoring carbon-intensity heatmap when ESG tier requires it (Sustainability pillar weakening)
- Cost-allocation tags missing on new resources (FinOps weakening — per `~/.claude/rules/common/dependency-pinning.md` cost section)
- Cross-region replication not configured for a workload with multi-region RPO/RTO target
- New cloud-native managed service introduced without comparing OSS alternative (per `~/.claude/CLAUDE.md` technology selection policy)
- SPOF (single point of failure) introduced in a critical path
- Network egress between AZ / region not minimised (data-transfer cost balloon)
- Auto-scaling bounds set too tight (throttle under load) or too loose (cost overrun)
- Reserved Instances / Savings Plans not refreshed when usage stabilises (FinOps optimisation gap)

**Refinement candidates**:
- New row in cloud-service-selection guide when a new managed service materially changes the trade-off
- Tightening of the multi-AZ / multi-region rule when a customer SLA tier shifts
- New cross-reference when a sister skill (network-patterns, datacenter-ops, aws-serverless-patterns, esg-reviewer) adds an architectural gate
- New ADR template entry when a recurring architectural decision shape emerges (e.g., "service-mesh: yes/no", "saga vs 2PC")
