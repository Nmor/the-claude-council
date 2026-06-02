# Skills Catalog

> Index of every skill shipped with The Claude Council. Skills are
> reusable patterns and methodologies — where a rule says "do not
> write X," a skill says "here is how to design Y." Skills auto-fire
> based on file type per
> [`auto-skills.md`](../rules-library/common/auto-skills.md). Total: 99
> skills across 13 domain clusters.

## Each skill follows the principal-level template

Per
[`principal-level-mandate.md`](../rules/common/principal-level-mandate.md),
every `SKILL.md` carries:

- **Purpose** — why this skill exists; what problem class it solves
- **Standards Cited** — primary-source references with version +
  section (RFC / ISO / NIST / OWASP / W3C / WCAG / IFRS / ITIL)
- **When to Fire** — file globs / keywords / scope conditions
- **Core Patterns** — concrete examples with named trade-offs
- **Anti-Patterns** — what to reject + why + named alternative
- **Verification Checklist** — concrete green/red predicates
- **Cross-References** — sister rules, skills, agents
- **Why This Skill Exists** — failure mode it prevents + cost of
  getting it wrong

## Skills by cluster

### Code quality + cross-language

| Skill | Purpose |
| ----- | ------- |
| [`coding-standards`](../skills/coding-standards/) | Universal code quality baseline |
| [`tdd-workflow`](../skills/tdd-workflow/) | Red-Green-Refactor; 90% touched / 80% project coverage |
| [`verification-loop`](../skills/verification-loop/) | After-implementation build/lint/test verification + strategic context management |
| [`search-first`](../skills/search-first/) | Sweep before write; codebase + sister workspaces + OSS |
| [`security-review`](../skills/security-review/) | OWASP Top 10 + ASVS + STRIDE pass per language |
| [`prompt-improver`](../skills/prompt-improver/) | Research-grounded clarifying questions for vague prompts |
| [`continuous-learning-v2`](../skills/continuous-learning-v2/) | Instinct-based learning; confidence scoring; pattern evolution |
| [`i18n-rules`](../skills/i18n-rules/) | Internationalisation — ICU MessageFormat, RTL layout mirroring, locale-aware sort + collation, Unicode normalisation |
| [`resilience-rules`](../skills/resilience-rules/) | Resilience patterns — circuit breakers, graceful degradation, idempotency, retry-with-jitter, rate limiting, deploy-failures-become-checks |

### Backend + systems

| Skill | Purpose |
| ----- | ------- |
| [`backend-patterns`](../skills/backend-patterns/) | Server architecture, DB optimization, fire-and-forget, content-hash caching |
| [`api-design`](../skills/api-design/) | REST patterns; status codes; pagination; versioning; error envelope |
| [`observability-patterns`](../skills/observability-patterns/) | Structured logs; EMF metrics; correlation IDs; W3C trace context |
| [`cost-aware-llm-pipeline`](../skills/cost-aware-llm-pipeline/) | Model routing; budget tracking; regex-first parsing |
| [`mcp-builder`](../skills/mcp-builder/) | MCP server: stdio + HTTP transports; tools / resources / prompts; capability negotiation |

### Per-language skills

| Skill | Purpose |
| ----- | ------- |
| [`golang-patterns`](../skills/golang-patterns/) | Idiomatic Go; interfaces; error handling |
| [`golang-testing`](../skills/golang-testing/) | Table-driven tests; subtests; benchmarks; fuzzing |
| [`typescript-patterns`](../skills/typescript-patterns/) | Discriminated unions; branded types; narrowing; strictness |
| [`python-patterns`](../skills/python-patterns/) | PEP 8; type hints; Pythonic idioms |
| [`python-testing`](../skills/python-testing/) | pytest; fixtures; mocking; parametrization |
| [`java-coding-standards`](../skills/java-coding-standards/) | Effective Java 3e; immutability; Optional; streams |
| [`cpp-coding-standards`](../skills/cpp-coding-standards/) | C++ Core Guidelines; modern idioms |
| [`cpp-testing`](../skills/cpp-testing/) | GoogleTest; CTest; sanitizers |
| [`swift-actor-persistence`](../skills/swift-actor-persistence/) | Thread-safe actors; data persistence |
| [`swift-protocol-di-testing`](../skills/swift-protocol-di-testing/) | Protocol DI; mock patterns |

### Frontend + UI

| Skill | Purpose |
| ----- | ------- |
| [`frontend-patterns`](../skills/frontend-patterns/) | Component architecture + visual design quality (typography / colour / motion / spatial composition) |
| [`vue3-patterns`](../skills/vue3-patterns/) | Composition API; `<script setup>`; composables; Pinia; reactivity |
| [`design-systems`](../skills/design-systems/) | Design tokens; multi-platform theming; component API; a11y-built-in; versioning |
| [`interaction-design`](../skills/interaction-design/) | Affordances; signifiers; feedback; error prevention + recovery; microcopy; motion as functional language |
| [`ux-research`](../skills/ux-research/) | Generative + evaluative methods; recruitment; sample sizing; persona + JTBD synthesis |
| [`e2e-testing`](../skills/e2e-testing/) | Playwright patterns; critical user journeys |

### Accessibility

| Skill | Purpose |
| ----- | ------- |
| [`wcag-accessibility`](../skills/wcag-accessibility/) | WCAG 2.2 AA + AAA; semantic HTML; ARIA 1.2; keyboard; screen reader; contrast; motion; 9 new SCs |
| [`accessible-forms`](../skills/accessible-forms/) | Labels; errors; autocomplete; validation timing; multi-step; file inputs; Redundant Entry + Accessible Authentication |

### Security + compliance

| Skill | Purpose |
| ----- | ------- |
| [`owasp-asvs`](../skills/owasp-asvs/) | OWASP ASVS 4.0.3 control catalogue; L1/L2/L3 mapping |
| [`gdpr-ccpa-compliance`](../skills/gdpr-ccpa-compliance/) | Lawful basis; DSR; consent; cross-border; breach notification; DPIA; RoPA |
| [`iso27001-controls`](../skills/iso27001-controls/) | Annex A 93 controls; SoA; risk treatment |
| [`soc2-readiness`](../skills/soc2-readiness/) | Trust Service Criteria; control-to-evidence mapping |
| [`pci-dss-patterns`](../skills/pci-dss-patterns/) | Scope reduction via tokenization; SAQ selection; 12 requirements mapped |
| [`hipaa-compliance`](../skills/hipaa-compliance/) | HIPAA Privacy + Security + Breach Notification + HITECH + 42 CFR Part 2 |
| [`ferpa-coppa-compliance`](../skills/ferpa-coppa-compliance/) | FERPA + COPPA + GDPR-K + AADC + state student-privacy laws |
| [`security-scan`](../skills/security-scan/) | Audit Claude Code config itself (meta-skill) |

### Industry + payments + clinical + edtech

| Skill | Purpose |
| ----- | ------- |
| [`payment-processing-patterns`](../skills/payment-processing-patterns/) | Idempotency; 3DS2 + SCA; tokenization; subscriptions; refunds; payouts; escrow; ledger reconciliation; MTL |
| [`clinical-data-patterns`](../skills/clinical-data-patterns/) | FHIR R5 + USCDI v4; HL7 v2; CDA / CCDA; SMART on FHIR; ICD-10 / SNOMED-CT / LOINC; DICOM |
| [`edtech-patterns`](../skills/edtech-patterns/) | LTI 1.3; xAPI 2.0; cmi5; SCORM; OneRoster; Caliper; QTI; Open Badges 3.0; UDL 3.0 |
| [`calendar-provider`](../skills/calendar-provider/) | Calendar API integration patterns (RFC 4791 / 5545 / 5546 / 6638) |
| [`provider-research`](../skills/provider-research/) | Primary-source docs for any external provider |
| [`web-push-notifications`](../skills/web-push-notifications/) | RFC 8030 / 8291 / 8292; W3C Push API; VAPID |

### Database

| Skill | Purpose |
| ----- | ------- |
| [`database-migrations`](../skills/database-migrations/) | Schema changes; rollbacks; zero-downtime |
| [`postgres-patterns`](../skills/postgres-patterns/) | Query optimization; indexing; RLS |
| [`dynamodb-patterns`](../skills/dynamodb-patterns/) | Single-table design; composite keys; GSIs; conditional writes; BatchWrite; TTL; streams; tenant isolation |
| [`clickhouse-io`](../skills/clickhouse-io/) | Analytics queries; ClickHouse data engineering |
| [`jpa-patterns`](../skills/jpa-patterns/) | JPA entity design; relationships; queries |

### Framework-specific

| Skill | Purpose |
| ----- | ------- |
| [`django-patterns`](../skills/django-patterns/) | Architecture; DRF; ORM; middleware |
| [`django-security`](../skills/django-security/) | Auth; CSRF; SQL injection; XSS |
| [`django-tdd`](../skills/django-tdd/) | pytest-django; factory_boy; mocking |
| [`django-verification`](../skills/django-verification/) | Migrations; linting; coverage; deployment |
| [`springboot-patterns`](../skills/springboot-patterns/) | Layered architecture; REST; caching |
| [`springboot-security`](../skills/springboot-security/) | Auth; validation; CSRF; secrets |
| [`springboot-tdd`](../skills/springboot-tdd/) | JUnit 5; Mockito; Testcontainers |
| [`springboot-verification`](../skills/springboot-verification/) | Build; analysis; coverage; security scans |

### Cloud + infrastructure

| Skill | Purpose |
| ----- | ------- |
| [`cloud-architecture`](../skills/cloud-architecture/) | Well-Architected pillars; region / AZ topology; multi-region patterns |
| [`network-patterns`](../skills/network-patterns/) | OSI / TCP-IP; CIDR design; routing; DNS; TLS; load balancing; service mesh; zero-trust |
| [`datacenter-ops`](../skills/datacenter-ops/) | Uptime Institute tiers; BICSI / ANSI-TIA-942; PUE/WUE/CUE; capacity |
| [`aws-serverless-patterns`](../skills/aws-serverless-patterns/) | Lambda + API Gateway + Step Functions + EventBridge + SQS/SNS |
| [`docker-patterns`](../skills/docker-patterns/) | Container security; networking; volumes; compose |
| [`deployment-patterns`](../skills/deployment-patterns/) | CI/CD; health checks; rollback strategies |

### AI/ML

| Skill | Purpose |
| ----- | ------- |
| [`prompt-engineering`](../skills/prompt-engineering/) | Task decomposition; RCIEF structure; few-shot; chain-of-thought; tool-use; versioning; eval |
| [`ml-model-selection`](../skills/ml-model-selection/) | Match problem class to model family; CV with proper splits; cost / latency / interpretability / compliance |
| [`rag-design`](../skills/rag-design/) | Chunking; embeddings; vector storage; hybrid retrieval; reranking; grounding; eval; RAG-vs-fine-tune-vs-long-context |
| [`mlops-patterns`](../skills/mlops-patterns/) | Feature stores; model registry; training pipelines; deployment; drift monitoring; A/B; rollback |
| [`fine-tuning-workflows`](../skills/fine-tuning-workflows/) | When fine-tuning beats prompting + RAG; SFT / DPO / RLHF; LoRA / QLoRA; eval; safety re-tune |
| [`eval-harness`](../skills/eval-harness/) | Formal evaluation harness for AI/ML systems |
| [`iterative-retrieval`](../skills/iterative-retrieval/) | Sub-agent pattern for retrieval-augmented work |

### Finance + accounting + investment

| Skill | Purpose |
| ----- | ------- |
| [`bookkeeping-patterns`](../skills/bookkeeping-patterns/) | Double-entry; chart of accounts; journal entries; ledger reconciliation; immutable accounting events |
| [`ifrs-gaap-reporting`](../skills/ifrs-gaap-reporting/) | Balance Sheet / Income Statement / Cash Flow / SOCIE; IFRS 15 + ASC 606 revenue; IFRS 16 + ASC 842 leases |
| [`fp-and-a`](../skills/fp-and-a/) | Budget vs actual variance; rolling forecasts; driver-based models; scenario planning; SaaS metrics; cohort analysis |
| [`valuation-models`](../skills/valuation-models/) | DCF; trading comparables; precedent transactions; LBO; SOTP; VC method; real options |
| [`financial-analyst`](../skills/financial-analyst/) | Earnings model maintenance; ratio analysis; accounting-quality assessment; channel checks; sector-relative valuation |
| [`investment-research`](../skills/investment-research/) | Thesis development; primary research; financial modelling; valuation triangulation |
| [`investor-due-diligence`](../skills/investor-due-diligence/) | Operational / financial / legal / commercial / tech / ESG / reference diligence |
| [`portfolio-theory`](../skills/portfolio-theory/) | Markowitz mean-variance; CAPM; factor models; risk budgeting; rebalancing; drawdown + tail-risk |
| [`stock-broker`](../skills/stock-broker/) | Order types; routing; TCA; best execution; Reg NMS / MiFID II; suitability |

### Organisation + people + management

| Skill | Purpose |
| ----- | ------- |
| [`org-design`](../skills/org-design/) | Team topologies; span of control; reporting structures; DACI/RACI; Conway's Law; scaling |
| [`okr-framework`](../skills/okr-framework/) | Objectives + Key Results design; deployment; grading; anti-pattern avoidance |
| [`hiring-process`](../skills/hiring-process/) | Role definition; sourcing; structured interviewing; bar-raising; calibration |
| [`performance-management`](../skills/performance-management/) | Feedback systems; calibration; career frameworks; PIPs |

### Strategy + innovation

| Skill | Purpose |
| ----- | ------- |
| [`design-thinking`](../skills/design-thinking/) | Empathise → Define → Ideate → Prototype → Test; HMW questions |
| [`triz-patterns`](../skills/triz-patterns/) | TRIZ 40 inventive principles; contradiction matrix; ideal final result |
| [`lean-startup`](../skills/lean-startup/) | Build-measure-learn; validated learning; MVP taxonomy; innovation accounting; pivot types |

### Industrial + operations

| Skill | Purpose |
| ----- | ------- |
| [`lean-manufacturing`](../skills/lean-manufacturing/) | Toyota Production System; JIT; jidoka; kanban; 5S; value-stream mapping; kaizen |
| [`six-sigma`](../skills/six-sigma/) | DMAIC; DMADV; SIPOC; process capability (Cp/Cpk); control charts; DOE |
| [`supply-chain-patterns`](../skills/supply-chain-patterns/) | APICS CPIM/CSCP; S&OP; demand planning; inventory optimisation; SCOR |

### Structural + civil engineering

| Skill | Purpose |
| ----- | ------- |
| [`structural-basics`](../skills/structural-basics/) | Eurocode / AISC / ACI; load paths; structural integrity |
| [`mep-coordination`](../skills/mep-coordination/) | ASHRAE; ISO 19650 BIM; MEP coordination; clash detection |

### Interpersonal + communications + research

| Skill | Purpose |
| ----- | ------- |
| [`negotiation-patterns`](../skills/negotiation-patterns/) | Harvard Method; BATNA + ZOPA; tactical empathy (Voss); preparation; multi-issue tradeoffs |
| [`communication-patterns`](../skills/communication-patterns/) | Pyramid Principle; audience analysis; mode selection; difficult conversations |
| [`research-methods`](../skills/research-methods/) | Primary / secondary / tertiary sources; quant / qual / mixed methods; literature review |
| [`historical-analysis`](../skills/historical-analysis/) | Primary-source critique; archival methodology; periodisation; oral history; cliometrics |

### Meta + utility (not auto-fired)

| Skill | Purpose |
| ----- | ------- |
| [`configure-ecc`](../skills/configure-ecc/) | Install / configure skills |
| [`project-guidelines-example`](../skills/project-guidelines-example/) | Template reference |
| [`learned`](../skills/learned/) | Learning records repository |
| [`nutrient-document-processing`](../skills/nutrient-document-processing/) | Nutrient API document processing |

## How skills are auto-fired

Per [`auto-skills.md`](../rules-library/common/auto-skills.md), the
file-to-skill mapping triggers on file type. When you touch a file,
the matching skills auto-fire silently — no slash command, no
explicit invocation.

For example, touching a `*.go` file auto-fires:

- **Skills**: `golang-patterns`, `golang-testing`, `coding-standards`,
  `security-review`, `tdd-workflow`
- **Agents**: `go-reviewer`, `go-build-resolver`, `tdd-guide`,
  `security-reviewer`

Touching a `*.vue` UI file auto-fires:

- **Skills**: `frontend-patterns`, `vue3-patterns`, `coding-standards`
- **Agents**: `code-reviewer`

Touching a payments-related file (any of `payments/`, `billing/`,
`checkout/`, `stripe/`, `escrow/`, `wallet/`, etc.) auto-fires:

- **Skills**: `payment-processing-patterns`, `pci-dss-patterns`,
  `bookkeeping-patterns`, `security-review`, `owasp-asvs`,
  `soc2-readiness`
- **Agents**: `payments-reviewer`, `compliance-reviewer` (VETO),
  `security-reviewer`, `finance-reviewer`, `risk-reviewer`

## See also

- [RULES.md](RULES.md) — the rules catalog
- [AGENTS.md](AGENTS.md) — the agents catalog
- [ARCHITECTURE.md](ARCHITECTURE.md) — how skills compose with
  rules + agents
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to add a skill
- [`../rules-library/common/auto-skills.md`](../rules-library/common/auto-skills.md)
  — file-to-skill mapping
- [`../rules/common/principal-level-mandate.md`](../rules/common/principal-level-mandate.md)
  — depth bar every skill meets
