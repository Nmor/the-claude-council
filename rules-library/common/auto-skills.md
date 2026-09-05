---
paths:
  - "**/*"
---

# Auto-Skill & Agent Activation

> This rule fires on every file. It ensures all installed skills AND agents are automatically applied based on file context — no slash commands or explicit invocation needed.

## How It Works

When you touch any file, automatically apply the relevant skills from `~/.claude/skills/` AND delegate to the relevant agents from `~/.claude/agents/` based on the file type and context below. Read and follow each skill's SKILL.md guidelines as part of your work. Delegate to agents when their expertise is needed. Do not announce activations — just apply them silently.

## File-to-Skill-and-Agent Mapping

### Go Files (*.go, go.mod, go.sum)

Skills:

- **golang-patterns** — Idiomatic Go, interfaces, error handling
- **golang-testing** — Table-driven tests, subtests, benchmarks, fuzzing
- **coding-quality-rules** — Universal code quality
- **security-review** — Input validation, auth, secrets
- **tdd-workflow** — Red-Green-Refactor methodology

Agents:

- **go-reviewer** — Idiomatic Go review, concurrency safety, race detection
- **go-build-resolver** — Fix build errors, vet warnings, linter issues
- **tdd-guide** — Write tests first, enforce coverage
- **security-reviewer** — OWASP, secrets, auth bypass

### TypeScript/JavaScript (*.ts,*.tsx, *.js,*.jsx)

Skills:

- **coding-quality-rules** — Universal code quality
- **typescript-patterns** — Discriminated unions, branded types, narrowing, strictness flags (TS files only)
- **frontend-patterns** — React/Vue component patterns, state, hooks
- **backend-patterns** — Node.js/Express/Next.js server patterns
- **security-review** — XSS, injection, auth
- **tdd-workflow** — Red-Green-Refactor methodology
- **e2e-testing** — Playwright patterns (when test files)
- **observability-patterns** — Structured logging, EMF metrics, correlation ids (when handler / lib code)

Agents:

- **code-reviewer** — Cross-language review, severity-based findings
- **build-error-resolver** — Fix TypeScript/JS build failures, type errors
- **tdd-guide** — Write tests first, enforce coverage
- **e2e-runner** — Playwright E2E tests, critical user journeys
- **security-reviewer** — OWASP, secrets, XSS

### Vue/React UI Files (*.vue, *.tsx, *.jsx, views/*, components/*, pages/*)

Skills:

- **frontend-patterns** — Component architecture, performance, AND visual design quality (typography, color, motion, spatial composition)
- **vue3-patterns** — Composition API, `<script setup>`, composables, Pinia, reactivity gotchas (Vue files only)
- **coding-quality-rules** — Code quality and naming

Agents:

- **code-reviewer** — UI code quality review

### Python (*.py,*.pyi)

Skills:

- **python-patterns** — PEP 8, type hints, Pythonic idioms
- **python-testing** — pytest, fixtures, mocking, parametrization
- **coding-quality-rules** — Universal code quality
- **security-review** — Input validation, secrets

Agents:

- **python-reviewer** — PEP 8, type hints, framework patterns, security
- **tdd-guide** — Write tests first, enforce coverage
- **security-reviewer** — OWASP, secrets, injection

### Django Python (*.py in django projects)

Skills:

- **django-patterns** — Architecture, DRF, ORM, middleware
- **django-patterns** — Auth, CSRF, SQL injection, XSS
- **django-testing** — pytest-django, factory_boy, mocking
- **django-testing** — Migrations, linting, coverage, deployment

Agents:

- **python-reviewer** — Django-specific Python review
- **security-reviewer** — OWASP for Django
- **database-reviewer** — Django ORM query optimization

### C/C++ (*.cpp,*.hpp, *.c,*.h, CMakeLists.txt, *.cmake)

Skills:

- **cpp-coding-standards** — C++ Core Guidelines, modern idioms
- **cpp-testing** — GoogleTest, CTest, sanitizers (when test files)
- **coding-quality-rules** — Universal code quality
- **security-review** — Buffer overflows, memory safety

Agents:

- **code-reviewer** — C++ code quality review
- **security-reviewer** — Memory safety, buffer overflows

### Swift (*.swift, Package.swift)

Skills:

- **swift-actor-persistence** — Thread-safe actors, data persistence
- **swift-protocol-di-testing** — Protocol DI, mock patterns
- **coding-quality-rules** — Universal code quality
- **security-review** — Keychain, ATS, input validation

Agents:

- **code-reviewer** — Swift code quality review
- **tdd-guide** — Swift testing patterns
- **security-reviewer** — iOS/macOS security

### Dart/Flutter (*.dart, pubspec.yaml)

Skills:

- **coding-quality-rules** — Universal code quality
- **security-review** — Secure storage, network security
- **tdd-workflow** — Red-Green-Refactor methodology

Agents:

- **code-reviewer** — Dart/Flutter code quality review
- **tdd-guide** — Flutter test patterns
- **security-reviewer** — Mobile security

### C# (*.cs,*.csproj)

Skills:

- **coding-quality-rules** — Universal code quality
- **security-review** — SQL injection, auth, input validation
- **tdd-workflow** — Red-Green-Refactor methodology

Agents:

- **code-reviewer** — C# code quality review
- **security-reviewer** — .NET security

### Java/Spring Boot (*.java, pom.xml,*.gradle)

Skills:

- **java-coding-standards** — Naming, immutability, Optional, streams
- **springboot-patterns** — Layered architecture, REST, caching
- **springboot-patterns** — Auth, validation, CSRF, secrets
- **springboot-testing** — JUnit 5, Mockito, Testcontainers
- **springboot-testing** — Build, analysis, coverage, security scans
- **jpa-patterns** — Entity design, relationships, queries (when JPA entities)

Agents:

- **code-reviewer** — Java code quality review
- **tdd-guide** — Spring Boot TDD
- **security-reviewer** — Spring Security audit
- **database-reviewer** — JPA/Hibernate query optimization

### Lua (*.lua,*.rockspec)

Skills:

- **coding-quality-rules** — Universal code quality

Agents:

- **code-reviewer** — Lua code quality review

### API/Route Files (routes/*, handlers/*, controllers/*, middleware/*)

Skills:

- **api-design** — REST patterns, status codes, pagination, versioning
- **security-review** — Auth, OWASP, rate limiting
- **backend-patterns** — Server architecture, DB optimization
- **aws-serverless-patterns** — Lambda handler shape, async-by-default webhooks, idempotency, cold-start hygiene (when handler files target AWS Lambda)
- **observability-patterns** — Structured logs, EMF metrics, request-id propagation

Agents:

- **security-reviewer** — Endpoint security, auth bypass, injection
- **code-reviewer** — API code quality review

### Docker/Deployment (Dockerfile*, docker-compose*, serverless.yml, template.yaml, .github/workflows/*, k8s/*, deploy/*, infra/*)

Skills:

- **docker-patterns** — Container security, networking, volumes, compose
- **deployment-patterns** — CI/CD, health checks, rollback strategies
- **aws-serverless-patterns** — IAM least privilege, SQS/SNS/EventBridge wiring, canary deploys, reserved concurrency (when `serverless.yml` / SAM / CDK)
- **security-review** — No secrets in images, minimal attack surface

Rules (auto-load when any compose / Dockerfile is touched):

- [`docker-localhost-binding.md`](docker-localhost-binding.md) — every host port mapping must be `127.0.0.1:` prefixed on developer machines. Sweep + patch script included.

Agents:

- **security-reviewer** — Container security, exposed secrets, attack surface

### Database (*.sql, migrations/*, **/migrate/*)

Skills:

- **database-migrations** — Schema changes, rollbacks, zero-downtime
- **postgres-patterns** — Query optimization, indexing, RLS
- **dynamodb-patterns** — Single-table design, composite keys, GSI design, conditional writes, BatchWrite chunking, TTL, streams, tenant isolation (when `@aws-sdk/lib-dynamodb` or `@aws-sdk/client-dynamodb` is imported)
- **security-review** — SQL injection, access control

Agents:

- **database-reviewer** — PostgreSQL queries, schema design, RLS, indexing
- **security-reviewer** — SQL injection, access control

### ClickHouse (clickhouse/*, **/events/*, analytics queries)

Skills:

- **clickhouse-io** — Query optimization, analytics, data engineering

Agents:

- **database-reviewer** — Analytical query optimization

### Documentation (*.md, README*, docs/*, CHANGELOG*)

Skills:

- **communication-patterns** — Pyramid Principle, audience analysis, edit ruthlessly, mode selection

Agents:

- **doc-updater** — Codemaps, READMEs, guides, documentation generation

### Accessibility-touching UI (`<form>`, `<input>`, ARIA refs, `aria-*` attrs, `role=` attrs, error/validation copy)

Skills:

- **wcag-accessibility** — WCAG 2.2 AA + AAA, semantic HTML, ARIA 1.2, keyboard, screen reader, contrast, motion, the 9 new SCs
- **accessible-forms** — Labels, errors, autocomplete, validation timing, multi-step flows, file inputs, date pickers, Redundant Entry + Accessible Authentication SCs
- **interaction-design** — Affordances, signifiers, feedback, error prevention, recovery, microcopy, motion-as-function

### ML / AI / LLM Files (imports `openai`/`anthropic`/`@google-cloud/aiplatform`/`@aws-sdk/client-bedrock-runtime`, prompts/, embeddings/, training/, fine-tune/, RAG pipelines)

Skills:

- **prompt-engineering** — Task decomposition, RCIEF structure, few-shot, chain-of-thought, tool-use, versioning, eval
- **ml-model-selection** — Match problem class to model family, CV with proper splits, cost/latency/interpretability/compliance
- **rag-design** — Chunking, embeddings, vector storage, hybrid retrieval, reranking, grounding, eval, RAG-vs-fine-tune-vs-long-context
- **mlops-patterns** — Feature stores, model registry, training pipelines, deployment (online/batch/streaming), drift monitoring, A/B, rollback
- **fine-tuning-workflows** — When fine-tuning beats prompting + RAG; SFT / DPO / RLHF; LoRA / QLoRA; eval; safety re-tune; deploy; monitor
- **cost-aware-llm-pipeline** — Model routing, budget tracking, retry logic, prompt caching

Agents:

- **ai-ethics-reviewer** — AI safety, fairness, bias, dataset provenance (Council Division 15 — VETO authority)
- **security-reviewer** — Prompt-injection, data exfil, secrets in prompts

### MCP Servers (`*.mcp.json`, `mcp-server/**`, `mcp_servers/**`, `mcp/**`, files importing `@modelcontextprotocol/sdk` (TS/JS), `mcp` or `fastmcp` (Python), `modelcontextprotocol` (any), `tools/<tool-name>.{ts,py}` inside an MCP server)

Skills:

- **mcp-builder** — Stdio + streamable HTTP transports, tool / resource / prompt primitives, capability negotiation, auth model, idempotency, observability, MCP Inspector testing, 10-question evaluation framework
- **api-design** — Tool surface design (request / response shapes, idempotency, pagination, error envelope) — sister skill for the API-level concerns inside MCP tool definitions
- **prompt-engineering** — Prompt + resource design when the MCP server exposes prompt primitives or resource templates the client will compose with

Agents:

- **security-reviewer** — Auth model, secrets handling, supply-chain risk, prompt-injection surface in tool descriptions + responses
- **code-reviewer** — Tool schema correctness (Zod / JSON Schema), annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`), error-envelope discipline
- **architect** — Capability negotiation, transport selection (stdio vs streamable HTTP), single-server vs federated design

### Finance / Accounting / Billing Files (billing/, pricing/, ledger/, accounting/, invoices/, payments/, ifrs/, gaap/, gl/, plans-tier configs, Stripe/Adyen integrations)

Skills:

- **bookkeeping-patterns** — Double-entry, chart of accounts, journal entries, ledger reconciliation, immutable accounting events
- **ifrs-gaap-reporting** — Balance Sheet / Income Statement / Cash Flow / SOCIE; IFRS 15 + ASC 606 revenue; IFRS 16 + ASC 842 leases; IFRS↔GAAP differences
- **fp-and-a** — Budget vs actual variance, rolling forecasts, driver-based models, scenario planning, SaaS metrics (ARR/MRR/NRR/CAC/LTV/payback/magic-number/Rule of 40), cohort analysis
- **valuation-models** — DCF, trading comparables, precedent transactions, LBO, SOTP, VC method, real options
- **financial-analyst** — Earnings model maintenance, ratio analysis, accounting-quality assessment, channel checks, sector-relative valuation
- **pci-dss-patterns** — Scope reduction via tokenization, SAQ selection, segmentation, encryption, 12 PCI-DSS requirements mapped to controls

Agents:

- **finance-reviewer** — Cloud cost, unit economics, pricing impact, ROI (Council Division 10)
- **compliance-reviewer** — PCI-DSS / SOX / financial-reporting compliance (Council Division 6 — VETO)

### Payments / Escrow / Open-Banking Files (payments/, billing/, checkout/, refund/, chargeback/, subscription/, dunning/, payout/, escrow/, wallet/, ledger/, reconcil/, 3ds/, sca/, psd2/, fapi/, open-banking/, tokeniz/, stripe/, adyen/, square/, braintree/, plaid/, dwolla/, modulr/, kyc/, aml/, sanctions/, ofac/)

Skills:

- **payment-processing-patterns** — Idempotency (cache key composition + payload-hash binding + HTTP 409 in-progress); 3DS2 + SCA; network tokenization; subscriptions + dunning; refunds + chargebacks; payouts + Connect; ledger reconciliation; escrow taxonomy (platform-escrow / simple-hold / custodial / third-party agent); trust-account FBO segregation; state MTLs + FinCEN MSB + AMLD6
- **pci-dss-patterns** — PCI-DSS v4.0 scope reduction via tokenization-at-edge, SAQ selection, CDE segmentation, 12 requirements mapped to engineering controls
- **bookkeeping-patterns** — Double-entry ledger writes in-transaction with business state; immutable accounting events
- **security-review** — Section 11 (payment-security): webhook signature verification, idempotency-bypass detection, card-testing / BIN-attack, FAPI 2.0, refund-fraud / chargeback-abuse
- **owasp-asvs** — V2.10 + V5 + V6 + V8 + V11 controls for payment surfaces
- **soc2-readiness** — Trust Service Criteria for processing integrity

Agents:

- **payments-reviewer** — Payment-specific deep review (idempotency, 3DS/SCA, webhook security, escrow + MTL, reconciliation) — VETO on PCI BLOCKER / PSD2 bypass / sanctions miss / MTL absence (Council Division 4 + 6 overlap)
- **compliance-reviewer** — PCI-DSS / PSD2 / MTL / AML / OFAC regulatory umbrella (Council Division 6 — VETO)
- **security-reviewer** — Cross-cutting OWASP audit for payment paths (Council Division 4)
- **finance-reviewer** — Interchange optimisation, processor cost trade-offs, unit economics (Council Division 10)
- **risk-reviewer** — Chargeback rate thresholds (Visa VAMP / MC ECP), fraud-loss tolerance, settlement risk (Council Division 11)

### Healthcare / Clinical / PHI Files (phi/, ephi/, hipaa/, patient/, clinical/, medical/, health/, ehr/, emr/, fhir/, hl7/, dicom/, ccda/, cda/, smart-on-fhir/, healthkit/, health-connect/, telehealth/, encounter/, observation/, medication/, diagnosis/, allergy/, immunization/, procedure/, condition/, lab/, imaging/, prescription/, erx/, icd-10/, snomed/, loinc/, rxnorm/, cpt/, x12/, edi/, eob/, eligibility/, claim/, baa/, business-associate/, 42-cfr-part-2/, substance/, samd/, 21-cfr-part-11/, gxp/)

Skills:

- **hipaa-compliance** — HIPAA Privacy + Security + Breach Notification + HITECH + 42 CFR Part 2; BAAs; minimum-necessary; ePHI encryption; audit controls (§164.312(b)); breach 60-day clock; OCR enforcement patterns
- **clinical-data-patterns** — FHIR R5 + USCDI v4; HL7 v2 / CDA / CCDA; SMART on FHIR + SMART Health Cards / Links; ICD-10 / SNOMED-CT / LOINC / RxNorm / CPT terminologies; DICOM; telehealth; mHealth (HealthKit / Health Connect)
- **gdpr-ccpa-compliance** — When EU patients OR California consumer-health-data flows (Washington My Health My Data Act 2024)
- **security-review** — ePHI-specific controls (encryption at rest + in transit; audit controls; access management)
- **owasp-asvs** — V2 + V6 + V8 + V14 for ePHI surfaces

Agents:

- **health-reviewer** — Clinical + HIPAA + 42 CFR Part 2 + FDA SaMD + state telehealth deep review — VETO on HIPAA BLOCKER / clinical-safety BLOCKER / 42 CFR Part 2 violation / FDA SaMD breach (Council Division 6 + 4 overlap)
- **compliance-reviewer** — HIPAA / GDPR / state health-privacy regulatory umbrella (Council Division 6 — VETO)
- **security-reviewer** — Cross-cutting ePHI security audit (Council Division 4)
- **ai-ethics-reviewer** — AI in clinical decision support; FDA Predetermined Change Control Plan; bias audit for clinical AI (Council Division 15 — VETO)
- **accessibility-reviewer** — Patient-portal a11y (Section 1557 ACA + ADA + Section 508 — Council Division 7 — opus)
- **data-reviewer** — ePHI schema, patient-matching, accounting-of-disclosures storage (Council Division 9)

### Education / EdTech / Student-Data Files (lti/, lti-1p3/, scorm/, xapi/, cmi5/, oneroster/, caliper/, qti/, common-cartridge/, badge/, openbadges/, credential/, clr/, lms/, sis/, canvas-api/, schoology/, moodle/, blackboard/, brightspace/, d2l/, google-classroom/, clever*, classlink*, proctor/, proctoring/, grade-passback/, ags/, nrps/, student/, learner/, coppa/, ferpa/, student-privacy/, parental-consent/, vpc/, sopipa/, iep/, 504-plan/, accommodat/, imsmanifest.xml, cmi5.xml)

Skills:

- **ferpa-coppa-compliance** — FERPA (20 USC §1232g) + COPPA (15 USC §6501-6506 + 16 CFR Part 312 + 2025 FTC Final Rule); GDPR-K (Art 8); CIPA; state student-privacy laws (SOPIPA, NY §2-d, CT 16-189, Student Privacy Pledge); platform compliance K-12 + higher-ed + edtech
- **edtech-patterns** — LTI 1.3 / LTI Advantage; xAPI 2.0 (IEEE 9274.1.1); cmi5; SCORM 1.2 + 2004; OneRoster 1.2; Caliper 1.2; QTI 3.0; Common Cartridge 1.3; Open Badges 3.0 (W3C VC); AccessForAll 3.0; IRT-based adaptive assessment; UDL 3.0; WCAG 2.2 AAA for learners; proctoring + integrity; learning-analytics ethics
- **wcag-accessibility** — WCAG 2.2 AA floor + AAA for assessment paths (learner-specific)
- **accessible-forms** — Assessment + registration form accessibility
- **gdpr-ccpa-compliance** — When EU minors (GDPR Art 8) or California minors (CA AADC)
- **security-review** — LTI 1.3 JWT validation; OAuth client-credential rotation; JWKS handling

Agents:

- **education-reviewer** — EdTech + student-privacy deep review (FERPA + COPPA + state-law + LTI 1.3 + accommodation flow + proctoring bias + AI grader + EWS ethics) — VETO on COPPA / FERPA / 2025 COPPA Final Rule / NY §2-d / WCAG 2.2 AA / Section 504 / proctoring-bias / AI grader without human review / LTI 1.1 in new code (Council Division 6 + 7 overlap)
- **compliance-reviewer** — FERPA / COPPA / state student-privacy regulatory umbrella (Council Division 6 — VETO)
- **accessibility-reviewer** — WCAG 2.2 AAA for assessment + accommodation flow + AT compatibility for learners (Council Division 7 — opus)
- **ai-ethics-reviewer** — AI tutor / grader / EWS / proctoring AI fairness; automated-decision-making under GDPR Art 22 + EU AI Act high-risk (Council Division 15 — VETO)
- **security-reviewer** — LTI / OAuth / JWKS verification (Council Division 4)
- **ux-reviewer** — Age-appropriate UX (AADC, COPPA child-directed UI patterns, learner-error-recovery copy) (Council Division 7)
- **data-reviewer** — Student-data schema, accommodation storage, EWS feature engineering (Council Division 9)

### Investment / Portfolio / Trading Files (portfolio/, trading/, orders/, broker/, FIX/, market-data/, allocations/)

Skills:

- **portfolio-theory** — Markowitz mean-variance, CAPM, factor models, risk budgeting, rebalancing, drawdown + tail-risk
- **investment-research** — Thesis development, primary research, financial modelling, valuation triangulation, risk identification
- **investor-due-diligence** — Operational / financial / legal / commercial / tech / ESG / reference diligence; structured red-flag scoring
- **stock-broker** — Order types, routing, TCA, best execution, Reg NMS / MiFID II, suitability

### Security & Compliance Cross-Cutting (when work touches PII, payments, health data, regulated workflows, SOC 2 / ISO 27001 / GDPR / HIPAA scope)

Skills:

- **owasp-asvs** — OWASP ASVS 4.0.3 control catalogue, L1/L2/L3 mapping, implementation patterns + verification commands
- **gdpr-ccpa-compliance** — Lawful basis docs, DSR implementation, consent management, cross-border transfers, breach notification, DPIA, RoPA
- **iso27001-controls** — Annex A 93 controls (Org / People / Physical / Tech), SoA, risk assessment + treatment
- **soc2-readiness** — Trust Service Criteria (Security / Availability / Processing Integrity / Confidentiality / Privacy), control-to-evidence mapping
- **pci-dss-patterns** — Cardholder-data scope reduction, tokenization, segmentation, 12 requirements

Agents:

- **compliance-reviewer** — Regulatory finding VETO authority (Council Division 6)
- **security-reviewer** — Cross-cutting OWASP audit
- **data-reviewer** — PII flow surfaces, schema governance (Council Division 9)

### Cloud / Infrastructure / Network Files (Terraform / CDK / Pulumi / Helm; k8s/; VPC / subnet / SG configs; CDN configs; DNS configs)

Skills:

- **cloud-architecture** — Well-Architected pillars (Op-Excellence / Security / Reliability / Performance / Cost / Sustainability), region/AZ topology, multi-region patterns
- **network-patterns** — OSI/TCP-IP layering, CIDR design, routing, DNS, TLS, load balancing, CDN, service mesh, network security, zero-trust
- **datacenter-ops** — Uptime Institute tiers, BICSI/ANSI-TIA-942 cabling, power/cooling/space, PUE/WUE/CUE, capacity, vendor + SLA management
- **aws-serverless-patterns** — Lambda + API Gateway + Step Functions + EventBridge + SQS/SNS

Agents:

- **infra-reviewer** — Dockerfile, Terraform, CI/CD review (Council Division 2)
- **ops-reviewer** — SLO/SLA, runbooks, on-call, deploy posture (Council Division 8)
- **esg-reviewer** — Carbon footprint, region carbon intensity (Council Division 14)

### Operations / Industrial / Manufacturing / Supply-Chain Files (process docs, production workflows, supply-chain configs, FMEA docs)

Skills:

- **lean-manufacturing** — Toyota Production System, JIT, jidoka, kanban, 5S, value-stream mapping, kaizen, takt time
- **six-sigma** — DMAIC, DMADV, SIPOC, process capability (Cp/Cpk), control charts, DOE, sigma levels
- **supply-chain-patterns** — APICS CPIM/CSCP, S&OP, demand planning, inventory optimisation, supplier mgmt, bullwhip effect, SCOR model
- **structural-basics** — Eurocode / AISC / ACI, load paths, structural integrity (when civil / structural engineering scope)
- **mep-coordination** — ASHRAE, ISO 19650 BIM, MEP coordination, clash detection (when building services scope)

### Strategy / Innovation / Product Files (roadmaps/, strategy/, ADRs introducing new direction, vision docs, MVP plans, pivot proposals)

Skills:

- **design-thinking** — Empathise → Define → Ideate → Prototype → Test; HMW questions; divergent + convergent modes
- **triz-patterns** — TRIZ 40 inventive principles, contradiction matrix, ideal final result, evolution patterns
- **lean-startup** — Build-measure-learn, validated learning, MVP taxonomy, innovation accounting, pivot types, customer development, engines of growth

Agents:

- **strategy-reviewer** — Market positioning, build-vs-buy, deprecation (Council Division 12)

### Design / UX Files (`design/`, `figma/`, design tokens, design system configs, component library specs, IA + flows)

Skills:

- **ux-research** — Generative + evaluative methods, study design, recruitment, sample sizing, qualitative coding, persona + JTBD synthesis
- **interaction-design** — Affordances, signifiers, feedback, error prevention + recovery, microcopy, motion as functional language
- **design-systems** — Design tokens, multi-platform theming, component API design, a11y-built-in, versioning + governance, docs

Agents:

- **ux-reviewer** — Information architecture, usability, copy (Council Division 7)
- **accessibility-reviewer** — WCAG 2.2 + ARIA audit (Council Division 7 — opus)

### Organisation / People / Hiring Files (CONTRIBUTING, CODE_OF_CONDUCT, CODEOWNERS, onboarding docs, hiring rubrics, career-ladder docs, RACI/DACI matrices, org-chart docs, OKR docs)

Skills:

- **org-design** — Team topologies, span of control, reporting structures, DACI/RACI, Conway's Law, scaling 10→1000
- **okr-framework** — Objectives + Key Results design, deployment, grading, anti-pattern avoidance
- **hiring-process** — Role definition, sourcing, structured interviewing, bar-raising, calibration, offer, onboarding
- **performance-management** — Feedback systems, calibration, ratings (or no ratings), career frameworks, PIPs

Agents:

- **people-reviewer** — Knowledge mgmt, hiring criteria, dev experience (Council Division 13)

### Negotiation / Communication / Comms Files (vendor contracts, partnership agreements, customer comms, public statements, blog posts, marketing copy, press releases, status-page templates, incident comms templates, RFPs / SOWs / MSAs)

Skills:

- **negotiation-patterns** — Harvard Method, BATNA + ZOPA + reservation, tactical empathy (Voss), preparation, multi-issue tradeoffs, cross-cultural
- **communication-patterns** — Pyramid Principle, audience analysis, mode selection, executive presence, difficult conversations, listening, cross-cultural delivery

Agents:

- **comms-reviewer** — Public-facing artifact review, crisis comms, brand consistency (Council Division 16)
- **doc-updater** — README / CHANGELOG / RELEASE_NOTES / API docs

### Research / Investigation / Historical Tasks (when work involves research methodology, evidence-based claims, post-mortems with archival reconstruction, organisational history, founding-era documents, institutional memory reconstruction)

Skills:

- **research-methods** — Primary/secondary/tertiary sources, quant/qual/mixed methods, literature review, evidence hierarchy, bias identification, statistical inference, reproducibility, citation discipline
- **historical-analysis** — Primary-source critique, archival methodology, periodisation, oral history, cliometrics, historiography, the fallacies (presentism, Whig, anachronism, hindsight bias)

## Cross-Cutting Skills & Agents (Apply When Relevant)

These activate based on context, not file type:

Skills:

- **search-first** — Before writing custom code, search for existing solutions
- **verification-loop** — After implementation, verify build/lint/test pass (also owns strategic-context-management guidance)
- **continuous-learning-v2** — Instinct-based learning, confidence scoring, pattern evolution
- **backend-patterns** — Server architecture, DB optimization, fire-and-forget side effects, content-hash file caching
- **cost-aware-llm-pipeline** — LLM cost optimization, model routing, AND regex-first parsing for structured text
- **prompt-improver** — When user prompt needs clarification (via hook)

Agents:

- **architect** — System design, scalability, technical trade-offs (complex features, new services)
- **planner** — Implementation plans, phased delivery, risk assessment (complex features, refactoring)
- **refactor-cleaner** — Dead code removal, unused exports, duplicate detection (cleanup tasks)
- **doc-updater** — Documentation updates after significant changes

## Global rules that auto-load on EVERY repo touch

These are not file-type-mapped; they fire when ANY file in a repo is
touched. They are the "first contact with a repo" gate.

- [`repo-setup-checklist.md`](repo-setup-checklist.md) — 20-point
  security & posture checklist run on first touch of any repo (or
  every 30 days). Covers: tracked `.env` files, hardcoded secrets in
  source / Postman collections / k8s manifests, dep CVEs, license
  gate, abandoned-dep flags, lockfile presence, Docker port binding,
  non-root containers, healthchecks, multi-stage builds, `.env.example`
  - `docs/secrets.md`, long-term AWS keys on disk, CI gate parity,
  pre-commit hooks, test runner config, branch protection.
- [`secrets-management.md`](secrets-management.md) — every secret in
  a vault (Keychain via aws-vault, AWS Secrets Manager, Vault), never
  on disk. Gitignore patterns, pre-commit gitleaks, RSA/ed25519 key
  rules, k8s Sealed-Secrets / External-Secrets requirement, rotation
  policy, suspected-exposure flow (rotate FIRST, scrub LATER).
- [`docker-localhost-binding.md`](docker-localhost-binding.md) — every
  host port mapping `127.0.0.1:` prefixed on dev machines; prod
  exposure via `${PUBLIC_BIND:-127.0.0.1}` env-var pattern.
- [`proper-fixes-first.md`](proper-fixes-first.md) — every fix
  addresses the root cause, never just the symptom. Banned shortcut
  patterns: killing services to free resources, loosening
  healthchecks to mask slow code, editing config without canonical
  docs, storing secret values without format validation, non-atomic
  credential rotations, removing features to suppress startup
  errors, half-finished migrations. Audit runs before every "done"
  claim.
- [`task-intake-due-diligence.md`](../../rules/common/task-intake-due-diligence.md) —
  every task / plan begins with the 29-question intake (prior art,
  OSS option, scalability, FMEA, STRIDE, data lifecycle, compliance,
  a11y, i18n, test strategy, observability, cost, rollback,
  deprecation lifecycle, UX writing, docs, risk register, success
  criteria, post-launch watch, AI / ML ethics, vendor / IP / license,
  operational handoff). Online research mandatory.
- [`reuse-first.md`](reuse-first.md) — never rewrite anything that
  exists. Sweep codebase + sister workspaces + OSS before writing.
  Rule of three: extract on the SECOND occurrence. Extend with a
  prop / parameter / option; never fork.
- [`error-handling-with-context.md`](error-handling-with-context.md) —
  every failure wraps cause with operation + ids; server log
  structured; client receives `{error_code, message, details}`;
  tests assert on `error_code` not `message`.
- [`plan-execution-progress.md`](../../rules/common/plan-execution-progress.md) —
  structured per-phase progress updates: phase-header announcement,
  numbered before / after on bulk changes, verification block,
  explicit next-step line.
- [`plan-task-breakdown.md`](../../rules/common/plan-task-breakdown.md) — plans are
  long lists of small atomic tasks (Phase → Sub-step → Task
  hierarchy). Mandatory bloat-removal phase at end of every plan.
- [`plan-completion-before-push.md`](../../rules/common/plan-completion-before-push.md) —
  active plan declares its commit-policy in Context; no `git push`
  until the plan is complete + verified (narrow bug-fix exception
  requires explicit user override).
- [`extreme-lint-policy.md`](extreme-lint-policy.md) — every
  language runs strictest available linters with thresholds
  tightened beyond defaults; zero per-line suppression directives;
  fix the config or the code, never the rule.
- [`rule-authoring-global-vs-project.md`](../../rules/common/rule-authoring-global-vs-project.md) —
  every new rule classified as global (pure guidance) or project
  (specifics in `<workspace>/.claude/rules/`) before writing.
- [`council-default.md`](../../rules/common/council-default.md) — Council is the
  default for every interaction. Core Five always speak; Extended
  Eleven auto-fire per `council-triggers.md`. No bypass surfaces.
- [`council-triggers.md`](../../rules/common/council-triggers.md) — per-division
  engagement signals (file patterns, keywords, change scope) for
  the 11 Extended Council Divisions.
- [`error-codes.md`](error-codes.md) — stable `error_code` strings,
  flat namespace, mapped to HTTP status + UX + i18n + runbook.
- [`rate-limiting.md`](rate-limiting.md) — multi-layer (edge,
  gateway, app, DB), per-endpoint defaults, RFC 6585 + draft-
  ietf-httpapi-ratelimit-headers compliance.
- [`circuit-breaker.md`](circuit-breaker.md) — every external call
  wrapped; per-DEPENDENCY breaker, not per-call-site; combined
  with timeouts; observability metrics.
- [`graceful-degradation.md`](graceful-degradation.md) — every
  feature has a criticality tier; degraded mode is explicit +
  communicated, never silent.
- [`feature-flags.md`](feature-flags.md) — every flag has owner +
  expiry + decision criteria + removal task; kill switches
  pre-built; OpenFeature standard.
- [`idempotency.md`](idempotency.md) — Stripe-pattern idempotency
  keys; RFC 9110 method idempotency; safe retries.
- [`observability.md`](observability.md) — 3 pillars + Four Golden
  Signals + W3C trace context + OpenTelemetry.
- [`log-levels.md`](log-levels.md) — canonical FATAL/ERROR/WARN/
  INFO/DEBUG/TRACE; ERROR reserved for alerts; structured fields
  mandatory.
- [`audit-logging.md`](audit-logging.md) — append-only,
  tamper-evident, separate from operational logs; hash-chain
  integrity; per-tenant isolation; retention by regulation.
- [`api-versioning.md`](api-versioning.md) — every public API
  contract versioned; tolerant-reader / strict-writer; parallel
  versions during deprecation runway.
- [`schema-evolution.md`](schema-evolution.md) — additive,
  reversible, idempotent, zero-downtime migrations; expand-
  contract pattern; long-running backfills batched.
- [`contract-testing.md`](contract-testing.md) — CDC (Pact) +
  schema-based (OpenAPI/GraphQL/Proto); contract tests gate the
  producer's deploy.
- [`deprecation-lifecycle.md`](deprecation-lifecycle.md) — four-
  stage calendar-anchored lifecycle (Announce → Soft → Hard →
  Remove); RFC 8594 Sunset header.
- [`semver.md`](semver.md) — Semantic Versioning 2.0.0 +
  Conventional Commits 1.0.0 + Keep a Changelog 1.1.0.
- [`dependency-pinning.md`](dependency-pinning.md) — lockfiles
  committed; container images digest-pinned; GitHub Actions
  SHA-pinned; Renovate auto-bumps minor/patch.
- [`gdpr-ccpa.md`](gdpr-ccpa.md) — RoPA + lawful basis + 7 data-
  subject rights + cross-border transfer mechanisms + DPIA + 72h
  breach notification.
- [`data-retention.md`](data-retention.md) — every data class has
  TTL + deletion path; automation-enforced; legal hold overrides;
  per-regulation minimums.
- [`a11y.md`](a11y.md) — WCAG 2.2 AA minimum, AAA for critical
  paths; semantic HTML before ARIA; keyboard-first; tested with
  real assistive tech.
- [`i18n.md`](i18n.md) — every user-facing string in a catalog;
  ICU MessageFormat; Intl APIs; BCP 47 locales; RTL mirroring.
- [`documentation-requirements.md`](documentation-requirements.md) —
  Diátaxis four-quadrant model; docs as code; generated reference;
  examples tested; coverage tracked.
- [`local-dev-setup.md`](local-dev-setup.md) — one bootstrap
  command; 30-minute first-run target; vault-based secrets;
  prod-parity where feasible; verify script same as CI.
- [`no-ambient-globals.md`](no-ambient-globals.md) — DI everywhere;
  no module-level mutable state; logger + db + clock + flags on
  per-request context; test isolation is the proof.
- [`runbook-template.md`](runbook-template.md) — canonical incident-
  response structure; one runbook per production service.
- [`adr-template.md`](adr-template.md) — every architectural
  decision recorded (MADR / Nygard format).
- [`code-of-conduct.md`](code-of-conduct.md) — Contributor Covenant
  v2.1; documented enforcement team + reporting paths +
  retaliation protection.
- [`verify-before-claim.md`](../../rules/common/verify-before-claim.md) — every
  completion claim preceded by same-turn verification.
- [`local-testability.md`](local-testability.md) — code must be
  locally testable BEFORE writing; missing prereqs surface env-
  setup request first.
- [`code-graph-validation.md`](code-graph-validation.md) — every
  task / todo / commit / phase / claim of completion is paired
  with an INCREMENTAL code-graph validation run THIS turn on the
  touched surface + immediate neighbors. Outbound checks (every
  import / call / route / handler / schema column / env var /
  IAM action / agent / skill / hook / rule citation / docs link
  resolves) + inbound checks (every defined node is referenced
  OR documented as an entry point) + cross-artifact integrity
  (hook event → script path, agent / skill frontmatter, council-
  triggers ↔ agent files, commands → agent refs, auto-skills.md
  mapping resolution). Phase-boundary sweep wider than the
  per-task check; pre-push full-graph validation across plan
  surface + 2-hop closure. Discovered graph gaps are root-cause
  fixed (wired, defined, or removed with user confirmation) —
  never silently deleted, never bandaged with `// TODO: wire
  later` markers.
- [`project-scoped-artifacts.md`](../../rules/common/project-scoped-artifacts.md) —
  every project's `.claude/` is workspace-scoped + auto-bootstrapped
  on first significant work. Plans + audits are ALWAYS
  gitignored (per rule 11) and NEVER referenced as repo paths in
  checked-in code — only as runtime paths
  (`<workspace>/.claude/plans/<slug>.md`,
  `~/.claude/audits/learning-events.jsonl`). CI link-integrity
  fails on any tracked file referencing `plans/...` /
  `audits/...` as a repo location.

## Per-language no-discards extensions

Auto-load when the matching file extension is touched. They extend
the umbrella `~/.claude/rules/common/no-discards.md` with language-
specific banned patterns + linter configs.

- [`golang/no-discards.md`](../golang/no-discards.md) — Go: bind
  every return; `errors.Is` / `errors.As`; defer Close with error;
  no `_,` in any value position (rune iteration the only
  exception).
- [`typescript/no-discards.md`](../typescript/no-discards.md) —
  TS/JS: no floating promises; no `// @ts-ignore`; strict
  TypeScript; React-19 + SonarJS patterns.
- [`python/no-discards.md`](../python/no-discards.md) — Python: no
  bare/blind `except`; `raise ... from err`; mypy + pyright
  strict; no `# noqa` / `# type: ignore`.
- [`cpp/no-discards.md`](../cpp/no-discards.md) — C/C++:
  [[nodiscard]] enforced; RAII for resource ownership; no raw
  new/delete; sanitizers enabled.
- [`csharp/no-discards.md`](../csharp/no-discards.md) — C#:
  nullable reference types enforced; no `_ = expr` discards;
  `using` for IDisposable; Tasks always awaited.
- [`dart/no-discards.md`](../dart/no-discards.md) — Dart/Flutter:
  no `_` in catch; `unawaited_futures` rejected; null safety
  strict; analyzer at max strictness.
- [`swift/no-discards.md`](../swift/no-discards.md) — Swift:
  `@discardableResult` only with intent; `do/try/catch` with
  specific Error types; force-unwrap banned.
- [`lua/no-discards.md`](../lua/no-discards.md) — Lua: `assert` +
  `error` over nil-returns where appropriate; pcall handles
  errors; luacheck max strict.
- [`java/no-discards.md`](../java/no-discards.md) — Java/Spring:
  no empty catch; `try-with-resources` for AutoCloseable;
  CompletableFuture exception-handled; SpotBugs + ErrorProne.
- [`ruby/no-discards.md`](../ruby/no-discards.md) — Ruby/Rails:
  no bare `rescue`; specific exception classes; no `rescue
  nil`; brakeman + rubocop strict.
- [`rust/no-discards.md`](../rust/no-discards.md) — Rust: no
  `let _ = ...`; no `.unwrap()` outside tests; `?` for
  propagation; clippy pedantic.
- [`kotlin/no-discards.md`](../kotlin/no-discards.md) — Kotlin:
  `runCatching` not silent-catch; null-safety enforced; detekt
  - ktlint strict.
- [`sql/no-discards.md`](../sql/no-discards.md) — SQL: every
  query parameterised; no `SELECT *` in production; explicit
  COMMIT/ROLLBACK; sqlfluff strict.
- [`bash/no-discards.md`](../bash/no-discards.md) — Bash:
  `set -euo pipefail` always; `shellcheck -S style`; no
  unquoted variables; trap on EXIT.

When Claude first touches a repo in a session, it states explicitly
that these are being applied, runs the relevant checks, and reports.

## What NOT to Auto-Apply

These are meta/config skills, not coding skills — only use when explicitly relevant:

- **configure-ecc** — Only when user wants to install/configure skills
- **project-guidelines-example** — Template reference only
- **iterative-retrieval** — Subagent pattern, used internally
- **eval-harness** — Only for formal eval sessions
- **nutrient-document-processing** — Only when processing documents via Nutrient API
- **security-scan** — Only when auditing Claude Code config itself

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- File type touched without auto-activating its mapped skill (mapping gap or rule weakening)
- New file extension / framework arriving without a mapping row (e.g., new IaC tool, new mobile framework)
- Skill auto-fires but contributes no findings consistently across sessions (low-value skill — refinement candidate)
- Skill fires too late (after edits committed) instead of pre-edit (lifecycle drift)
- Auto-load global rule missing for a class of work that needs first-touch enforcement
- Per-language no-discards extension not loaded when matching language file is touched (sister rule weakening)
- "What NOT to auto-apply" list grows past 10 entries (meta-skill bloat — refinement audit needed)
- New skill added under `~/.claude/skills/` without a row in this rule's file-to-skill-and-agent mapping (drift)

**Refinement candidates**:

- New file-type row when a new file extension class becomes common (e.g., `*.sol`, `*.zig`, `*.gleam`, `*.elm`)
- New auto-load global rule row when a sister rule emerges and needs first-touch enforcement
- Tightening of the cross-cutting skills section when a new universal pattern (e.g., new observability standard, new compliance baseline) needs always-on coverage
- Promotion of a skill from "What NOT to Auto-Apply" to the active mapping when its triggers become broadly applicable
