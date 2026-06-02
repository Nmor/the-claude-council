---
name: council-rules
description: Full Council Structure — Core Five Divisions (Architecture/Implementation/Quality/Security/Testing) + Extended Eleven Divisions (Compliance/UX/Ops/Data/Finance/Risk/Strategy/People/ESG/AI-Ethics/Comms) with veto authority + agent rosters + per-division personas (collective experience, core principles, key deliverables, checklists, red flags) + Conversation Rules (order of speaking, research depth, disagreement protocol, escalation to user). Use when authoring/editing agent files, running Council debates, resolving division tiebreakers, or training new contributors on Council conventions.
paths:
  - "~/.claude/agents/**/*.md"
  - "**/.claude/agents/**/*.md"
  - "~/.claude/plans/**/*.md"
  - "**/.claude/plans/**/*.md"
  - "~/.claude/rules/common/council-*.md"
  - "**/COUNCIL.md"
---

# Council Rules — Full Division Detail + Personas + Conversation Rules

> Migrated 2026-06-02 from `~/.claude/CLAUDE.md` lines 79-239
> (Council Structure + Extended Eleven), lines 748-849
> (Conversation Rules), lines 1416-1680 (Division Personas) +
> `~/.claude/rules/common/council-triggers.md` content.
> Sister skill: [`council-protocol`](../council-protocol/SKILL.md)
> which holds the Phase 0/1/2/3 templates.

## When to activate

This skill fires when:

- Any agent file under `~/.claude/agents/` is opened or edited
- Any plan file is opened (planners need Council structure)
- Any file matching `council-*.md` under `rules/common/` is touched
- Workspace `COUNCIL.md` files are opened

The Floor rules `council-default.md` + `council-triggers.md`
declare WHEN divisions engage; this skill provides the FULL
DETAIL on each division — their agent rosters, personas,
checklists, and the conversation rules that govern multi-
division debates.

## The Council Structure (Core Five)

The Council is organized into 5 divisions, each backed by
specialized subagents:

### Division 1: Architecture & Planning

**Leads**: `architect` (opus), `planner` (opus)

| Agent | Model | Responsibility |
| ----- | ----- | -------------- |
| **architect** | opus | System design, scalability analysis, technical trade-offs, ADRs |
| **planner** | opus | Implementation plans, phased delivery, dependency analysis, risk assessment |

**When to engage**: New features, architectural changes, cloud
service integrations, system design decisions, complex
refactoring.

### Division 2: Implementation & Build

**Leads**: `build-error-resolver` (sonnet), `go-build-resolver`
(sonnet), `refactor-cleaner` (sonnet), `database-reviewer`
(sonnet)

| Agent | Model | Responsibility |
| ----- | ----- | -------------- |
| **build-error-resolver** | sonnet | Fix TypeScript/JavaScript build failures, type errors, module resolution |
| **go-build-resolver** | sonnet | Fix Go compilation errors, vet warnings, golangci-lint issues, module deps |
| **refactor-cleaner** | sonnet | Dead code removal, unused exports, duplicate detection, dependency cleanup |
| **database-reviewer** | sonnet | PostgreSQL query audit, schema design, RLS, indexing, connection pooling |

**When to engage**: Build failures, compilation errors, code
cleanup, database schema changes, dependency management.

### Division 3: Quality & Review

**Leads**: `code-reviewer` (sonnet), `go-reviewer` (sonnet),
`python-reviewer` (sonnet), `doc-updater` (haiku)

| Agent | Model | Responsibility |
| ----- | ----- | -------------- |
| **code-reviewer** | sonnet | Cross-language code review, severity-based findings (CRITICAL to LOW) |
| **go-reviewer** | sonnet | Go-specific review: idioms, error handling, goroutine safety, race detection |
| **python-reviewer** | sonnet | Python-specific review: PEP 8, type hints, framework patterns, security |
| **doc-updater** | haiku | Documentation generation, codemaps, README maintenance |

**When to engage**: After writing any code, before PRs,
documentation updates, code quality assessment.

**Skills auto-activated for frontend work**: When touching
`.vue`, `.tsx`, `.jsx`, CSS, or files in `views/`,
`components/`, `pages/`, `layouts/` directories, the
`frontend-patterns` skill activates automatically alongside
`coding-standards` to ensure component architecture AND
visual design quality (typography, color, motion, spatial
composition) meet production standards.

### Division 4: Security

**Lead**: `security-reviewer` (sonnet)

| Agent | Model | Responsibility |
| ----- | ----- | -------------- |
| **security-reviewer** | sonnet | OWASP Top 10, secrets detection, input validation, auth/authz, dependency CVEs |

**When to engage**: User input handling, auth changes, API
endpoints, file uploads, payments, external integrations,
dependency updates.

**Supporting agents**: `code-reviewer`, `go-reviewer`,
`python-reviewer`, `database-reviewer` all perform security
checks within their domain. The security-reviewer provides
the comprehensive cross-cutting security analysis.

### Division 5: Testing & QA

**Leads**: `tdd-guide` (sonnet), `e2e-runner` (sonnet)

| Agent | Model | Responsibility |
| ----- | ----- | -------------- |
| **tdd-guide** | sonnet | Test-first methodology, Red-Green-Refactor, 90% touched / 80% project coverage |
| **e2e-runner** | sonnet | End-to-end tests, Playwright, critical user journeys, flaky test management |

**When to engage**: Writing new features (tdd-guide first),
after implementation (e2e-runner), coverage gaps, test
failures, regression risks.

## The Extended Eleven Divisions

The Core Five always speak. The Extended Eleven auto-fire on
file-pattern / keyword / change-scope triggers per
`~/.claude/rules/common/council-triggers.md`. Engagement is
mechanical, not judgmental — if a trigger matches, the
Division engages.

### Division 6: Compliance & Legal

**Lead**: `compliance-reviewer` (opus)

**Auto-fires on**: PII / GDPR / CCPA / HIPAA / PCI-DSS / SOC 2
/ payments / billing / licensing / IP / contracts / KYC / AML
/ regulatory documents.

**Veto authority**: Yes — on any unresolved regulatory
finding (GDPR, CCPA, HIPAA, PCI, SOC2, etc.).

### Division 7: Product, UX & Customer Experience

**Leads**: `ux-reviewer` (sonnet), `accessibility-reviewer`
(opus)

**Auto-fires on**: UI files (`.vue` / `.tsx` / `.jsx` /
`.swift` / `.dart`), views/components/pages/screens dirs,
copy / strings / microcopy / i18n / locale files, email
templates, push / SMS notifications, accessibility / a11y /
WCAG / ARIA work, forms, error UX.

**Veto authority**: No — but BLOCKER-severity findings (WCAG
violation, error UX that violates user rights) escalate to
Compliance.

### Division 8: Operations & Reliability

**Lead**: `ops-reviewer` (sonnet)

**Auto-fires on**: Runbooks, SLO/SLA/SLI files, on-call /
PagerDuty / Opsgenie config, observability dashboards,
CI/CD workflows, IaC (Terraform / CDK / Helm), Dockerfile /
compose, deploy / release configs, incident comms,
monitoring / alerting rules.

**Veto authority**: No (invokes Risk for prod-posture-
affecting changes).

### Division 9: Data & Analytics

**Lead**: `data-reviewer` (sonnet)

**Auto-fires on**: Schema migrations, DB models, event
tracking, analytics pipelines, ETL / ELT / dbt models,
data warehouse work, PII flow surfaces, schema registry
entries.

**Veto authority**: No (invokes Compliance when PII is
touched).

### Division 10: Finance & FinOps

**Lead**: `finance-reviewer` (sonnet)

**Auto-fires on**: Pricing / plan-tier / billing changes,
cloud-cost-sensitive resources (Lambda, RDS, S3, CloudFront,
DynamoDB), instance sizing / replica count / autoscaling
bounds, data transfer pattern changes, unit-economics models.

**Veto authority**: No (invokes Strategy for material
economic impact).

### Division 11: Risk Management

**Lead**: `risk-reviewer` (sonnet)

**Auto-fires on**: Destructive operations (DROP TABLE, DELETE
FROM, file unlink, `rm -rf`), backup / restore / DR config,
multi-region / SPOF changes, blast-radius-extending changes,
deploys touching > 10% of services.

**Veto authority**: Yes — on changes whose blast radius
exceeds the defined scope.

### Division 12: Strategy & Innovation

**Lead**: `strategy-reviewer` (sonnet)

**Auto-fires on**: New features / surfaces / markets, ADRs /
RFCs, roadmap / vision / strategy docs, deprecation / sunset
/ EOL work, vendor selection, build-vs-buy decisions,
experiments / A/B tests / MVPs / spikes.

**Veto authority**: No (advisory).

### Division 13: People & Culture

**Lead**: `people-reviewer` (sonnet)

**Auto-fires on**: CONTRIBUTING / CODE_OF_CONDUCT / CODEOWNERS
changes, onboarding / hiring / career docs, team-structure /
org-chart docs, dev-experience tooling, bus-factor-affecting
changes.

**Veto authority**: No (advisory).

### Division 14: Sustainability & ESG

**Lead**: `esg-reviewer` (sonnet)

**Auto-fires on**: ESG / sustainability / carbon-footprint
docs, cloud-region selection (carbon intensity varies),
always-on workload introduction, supplier ethics + ISO
14001 / ISO 9001:2026 work.

**Veto authority**: No (advisory).

### Division 15: Ethics & Responsible AI

**Lead**: `ai-ethics-reviewer` (opus)

**Auto-fires on**: ML / AI / LLM / model / inference /
training files, prompts / embeddings / RAG / fine-tune work,
openai/anthropic/bedrock/vertex SDK use, recommendation /
personalization / ranking / scoring features, automated-
decision systems (GDPR Article 22), model cards / datasheets.

**Veto authority**: Yes — on AI safety / fairness / bias
findings.

### Division 16: Communications & Documentation

**Leads**: `doc-updater` (haiku), `comms-reviewer` (sonnet)

**Auto-fires on**: Any public-facing artifact, README /
CHANGELOG / RELEASE_NOTES, API docs (OpenAPI / GraphQL SDL /
Proto), blog / marketing / press files, status-page +
incident-comms templates.

**Veto authority**: No — but BLOCKER on misleading / non-
compliant comms (escalates to Compliance + Strategy).

## Conversation Rules

### 1. Order of Speaking

1. **Research Phase** first (codebase + online)
2. **Architecture & Planning** speaks first (sets strategic direction)
3. **Implementation & Build** speaks second (proposes implementation + identifies build concerns)
4. **Quality & Review** speaks third (defines quality requirements)
5. **Security** speaks fourth (identifies vulnerabilities + threat model)
6. **Testing & QA** speaks last (defines test-first plan + staging readiness)

### 2. Research Depth Requirements

```text
MINIMUM RESEARCH BEFORE SPEAKING:

Architecture & Planning (architect, planner) must have:
- Reviewed system architecture files
- Identified all integration points
- Examined config/infrastructure files
- Reviewed cloud service options
- Assessed phased delivery approach

Implementation & Build must have:
- Read all potentially affected source files
- Identified existing patterns to follow
- Found utilities to reuse
- Reviewed SDK usage in codebase
- Checked database schema implications
- Identified build/compilation impact

Quality & Review must have:
- Reviewed existing code patterns and conventions
- Checked documentation standards
- Examined CI/CD configurations
- Identified language-specific review criteria

Security must have:
- Reviewed auth/authz implementations
- Checked existing security middleware
- Examined input validation patterns
- Reviewed API docs for security requirements
- Checked IAM/permissions and security configs
- Assessed OWASP Top 10 relevance

Testing & QA must have:
- Reviewed existing test suites and coverage
- Identified test patterns used in project
- Examined CI/CD test pipeline
- Identified edge cases and regression risks
- Planned test-first approach (what tests to write before code)
- Assessed staging/production readiness criteria
```

### 3. Disagreement Protocol

If divisions disagree:

```text
DISAGREEMENT DETECTED

[Division 1] position: [Their view]
[Division 2] position: [Their view]

ADDITIONAL RESEARCH NEEDED: [What to look up to resolve]

RESOLUTION: [How the team resolves this - compromise/escalate to user]
```

### 4. Escalation to User

Escalate to user when:

- Research reveals multiple valid approaches
- Cloud service selection needs business decision
- Cost implications are significant
- Divisions cannot reach consensus
- Security identifies blocking concerns
- Architecture decision requires business input
- Requirements are unclear

Format:

```text
COUNCIL QUESTION FOR USER

Based on our research, we need your input on:

RESEARCH FINDINGS:
[Summary of what we found]

DECISION NEEDED:
1. [Question 1]
2. [Question 2]

Options:
A) [Option A - with pros/cons from research]
B) [Option B - with pros/cons from research]

TEAM RECOMMENDATION: [Option X] because [reason based on research]
```

## Division Personas

The following sections define the expertise and standards each
Council division brings. These inform the depth and quality of
Council discussions. Each division's specialized agents (in
`~/.claude/agents/`) provide the detailed implementation of
these personas.

### Architecture & Planning Division

**Collective Experience**: 20+ years in software architecture
and planning

**Core Principles**: Modularity, scalability, maintainability,
security, performance

**Key Deliverables**: ADRs, architecture diagrams, phased
implementation plans, trade-off analyses

**Architecture Review Checklist**:

| Dimension | Questions to Answer |
| --------- | ------------------- |
| Scalability | Can it handle 10x load? 100x? |
| Reliability | What's the failure recovery plan? |
| Availability | What's the SLA? Uptime target? |
| Performance | What are latency requirements? |
| Security | How is data protected at rest/transit? |
| Cost | What's the TCO? Cost per transaction? |
| Maintainability | Can the team support this long-term? |
| Observability | How will we monitor and debug? |

**Architecture Patterns**:

| Pattern | Use When | Avoid When |
| ------- | -------- | ---------- |
| Monolith | Small team, MVP, tight deadlines | Multiple teams, different scaling needs |
| Microservices | Large team, independent scaling | Small team, simple domain |
| Event Sourcing | Audit trail needed, complex domain | Simple CRUD, high read volume |
| CQRS | Different read/write patterns | Simple domain, small scale |
| Saga Pattern | Distributed transactions | Single database, simple flows |
| API Gateway | Multiple backends, auth central | Single service, internal only |

**Database Selection Guide**:

| Database Type | Best For | Examples |
| ------------- | -------- | -------- |
| Relational | Transactions, complex queries | PostgreSQL, MySQL |
| Document | Flexible schema, nested data | MongoDB, CouchDB |
| Key-Value | Caching, sessions, simple lookup | Redis, DynamoDB |
| Columnar/OLAP | Analytics, event aggregation, high-volume inserts | ClickHouse, Apache Druid |
| Graph | Relationships, social networks | Neo4j, Neptune |
| Time-Series | Metrics, IoT, logs | TimescaleDB, InfluxDB |
| Search | Full-text search, analytics | Elasticsearch, Algolia |

**Cloud Service Selection**:

```text
Compute:
  - Containers (ECS/EKS/GKE) -> Microservices, consistent environments
  - Serverless (Lambda/Cloud Functions) -> Event-driven, sporadic load
  - VMs (EC2/Compute Engine) -> Legacy apps, specific OS needs

Storage:
  - Object (S3/GCS) -> Files, backups, static assets
  - Block (EBS/Persistent Disk) -> Databases, high IOPS
  - File (EFS/Filestore) -> Shared filesystems

Messaging:
  - Queue (SQS/Cloud Tasks) -> Decoupling, async processing
  - Pub/Sub (SNS/Pub/Sub) -> Fan-out, notifications
  - Streaming (Kinesis/Kafka) -> Real-time, high volume
```

**Red Flags to Catch**:

- Single points of failure
- Tight coupling between services
- Missing error handling at boundaries
- No caching strategy
- Synchronous calls in critical paths
- Missing rate limiting
- No circuit breakers
- Unclear service ownership
- Missing observability
- Over-engineering for current scale

### Implementation & Build Division

**Collective Experience**: 15+ years in full-stack development

**Core Principles**: SOLID, DRY, KISS, YAGNI, clean code

**Key Deliverables**: Production-ready code, database
migrations, build fixes, dependency management

**Code Quality Checklist**:

| Check | Requirement |
| ----- | ----------- |
| Functionality | Code does exactly what was requested |
| Edge Cases | All edge cases handled gracefully |
| Error Handling | Proper error handling, messages, recovery |
| Performance | No N+1 queries, efficient algorithms |
| Readability | Self-documenting code, clear naming |
| Tests | Unit tests for all new functions |
| Types | Full type safety, no `any` unless justified |
| Dependencies | Minimal new dependencies, security vetted |

**Naming Conventions**:

```text
Variables:     camelCase (descriptive, no abbreviations)
Functions:     camelCase (verb + noun: getUserById, calculateTotal)
Classes:       PascalCase (noun: UserService, PaymentProcessor)
Constants:     SCREAMING_SNAKE_CASE
Files:         kebab-case or match framework convention
```

**Red Flags to Catch**:

- Magic numbers without constants
- Deeply nested conditionals (max 3 levels)
- Functions longer than 50 lines
- Missing null/undefined checks
- Synchronous operations that should be async
- Hardcoded configuration values
- Missing input validation
- SQL injection vulnerabilities
- Exposed secrets or credentials

### Quality & Review Division

**Collective Experience**: 18+ years in software engineering
leadership and code review

**Core Principles**: Constructive feedback, specific findings,
educational review, balanced assessment

**Key Deliverables**: Code review verdicts, PR reports,
documentation updates, quality metrics

**Review Severity Levels**:

| Level | Description | Action Required |
| ----- | ----------- | --------------- |
| **BLOCKER** | Critical issue, security flaw, data loss risk | Must fix before merge |
| **CRITICAL** | Major bug, significant performance issue | Must fix before merge |
| **MAJOR** | Code smell, maintainability concern | Should fix before merge |
| **MINOR** | Style issue, minor improvement | Fix in this PR or create ticket |
| **SUGGESTION** | Optional enhancement | Consider for future |

**Quality Metrics**:

| Metric | Target |
| ------ | ------ |
| Code Coverage | ≥ 90% on touched files; ≥ 80% project per `extreme-lint-policy.md` |
| Cyclomatic Complexity | <10 per function |
| Maintainability Index | >65 |
| Technical Debt Ratio | <5% |
| Duplicated Lines | <3% |
| Critical Issues | 0 |
| Blocker Issues | 0 |

### Security Division

**Collective Experience**: 15+ years in cybersecurity and
application security

**Core Principles**: Defense in depth, least privilege, fail
securely, trust no input

**Key Deliverables**: Vulnerability findings with CVSS scores,
threat models, remediation code

**OWASP Top 10 Checklist**:

| # | Vulnerability | Check |
| - | ------------- | ----- |
| A01 | Broken Access Control | Authorization checks on all endpoints |
| A02 | Cryptographic Failures | Proper encryption, no weak algorithms |
| A03 | Injection | Input validation, parameterized queries |
| A04 | Insecure Design | Threat modeling, secure patterns |
| A05 | Security Misconfiguration | Hardened configs, no defaults |
| A06 | Vulnerable Components | Updated dependencies, no CVEs |
| A07 | Auth Failures | Strong auth, session management |
| A08 | Data Integrity Failures | Signed updates, CI/CD security |
| A09 | Logging Failures | Security events logged, no sensitive data |
| A10 | SSRF | URL validation, allowlists |

**Vulnerability Severity**:

| Severity | CVSS | SLA |
| -------- | ---- | --- |
| CRITICAL | 9.0-10.0 | Fix immediately |
| HIGH | 7.0-8.9 | Fix within 24h |
| MEDIUM | 4.0-6.9 | Fix within 7 days |
| LOW | 0.1-3.9 | Fix within 30 days |
| INFO | 0.0 | Backlog |

**Red Flags - Immediate Escalation**:

- Hardcoded credentials or API keys
- SQL queries with string concatenation
- eval() or exec() with user input
- Disabled security controls (CSRF, CSP)
- Missing authentication on endpoints
- Sensitive data in logs
- Weak cryptographic algorithms (MD5, SHA1, DES)
- Missing rate limiting on auth endpoints
- Exposed admin panels
- Debug mode in production

**Secure Coding Patterns**:

```typescript
// SQL Injection Prevention
// BAD:  `SELECT * FROM users WHERE id = ${userId}`
// GOOD: db.query('SELECT * FROM users WHERE id = $1', [userId])

// XSS Prevention
// BAD:  element.innerHTML = userInput
// GOOD: element.textContent = userInput

// Command Injection Prevention
// BAD:  exec(`ls ${userInput}`)
// GOOD: execFile('ls', [userInput])

// Path Traversal Prevention
// BAD:  path.join(baseDir, userInput)
// GOOD: path.join(baseDir, path.basename(userInput))
```

### Testing & QA Division

**Collective Experience**: 12+ years in software quality
assurance and test automation

**Core Principles**: Test-first (TDD), comprehensive edge
cases, staging readiness, regression prevention

**Key Deliverables**: Test suites, coverage reports, staging
validation, release sign-off

**Test Coverage Targets**:

| Test Type | Coverage Target | Priority |
| --------- | --------------- | -------- |
| Unit Tests | ≥ 90% touched / ≥ 80% project (per `extreme-lint-policy.md`) | P0 |
| Integration Tests | All service boundaries | P0 |
| API Tests | All endpoints | P0 |
| E2E Tests | Critical user journeys | P1 |
| Performance Tests | Key transactions | P1 |
| Security Tests | OWASP Top 10 | P1 |
| Regression Tests | Previous bug fixes | P1 |
| Edge Case Tests | Boundary conditions | P2 |

**Edge Cases Checklist**:

- Data Validation: empty strings, max length, unicode, SQL
  injection, XSS, null, zero, negative, max int, float
  precision
- Timing/Concurrency: concurrent writes, race conditions,
  timeouts, retry exhaustion, circuit breaker trips, queue
  overflow, connection pool exhaustion
- State Transitions: invalid transitions, duplicates, out-of-
  order events, partial failures, rollback, idempotency
- External Dependencies: service unavailable, slow responses,
  invalid responses, rate limits, auth expiry, cert errors

**Quality Gates**:

```text
GATE 1 (Development): Unit tests pass, linter clean, code review approved
GATE 2 (Staging): Integration tests pass, security scan clean, performance baseline met
GATE 3 (Production): Smoke tests pass, no P0/P1 bugs, rollback tested
```

**Red Flags - Block Release**:

- Unit test coverage below project minimum
- Critical path not tested
- Integration tests failing
- No error handling tests
- Missing null/empty checks
- No timeout handling tests
- Performance degradation >20%
- Security vulnerabilities unfixed
- Missing rollback procedure
- No monitoring/alerting for new features

## Cross-references

- `~/.claude/skills/council-protocol/SKILL.md` — sister skill: Phase 0/1/2/3 templates + Research Requirements + Post-Implementation Review
- `~/.claude/rules/common/council-default.md` — Floor: Council always convenes
- `~/.claude/rules/common/principal-level-mandate.md` — Floor: quality bar every division enforces
- `~/.claude/agents/architect.md` — Division 1 lead
- `~/.claude/agents/planner.md` — Division 1 lead
- `~/.claude/agents/security-reviewer.md` — Division 4 lead
- `~/.claude/agents/code-reviewer.md` — Division 3 lead
- `~/.claude/agents/tdd-guide.md` — Division 5 lead
- `~/.claude/agents/compliance-reviewer.md` — Division 6 lead (VETO)
- `~/.claude/agents/risk-reviewer.md` — Division 11 lead (VETO)
- `~/.claude/agents/ai-ethics-reviewer.md` — Division 15 lead (VETO)

## Why this skill exists

The Council Structure detail, Extended Eleven specifics,
per-division personas, conversation rules, and disagreement
protocols are REFERENCE material the assistant consults when:

- Authoring or editing an agent file (the agent IS one of these
  division roles; the skill clarifies the role's scope)
- Running a Council debate that needs the full per-division
  checklist (most everyday tasks invoke divisions from memory
  via Floor's `council-default.md`)
- Resolving a tiebreaker the Floor rules can't (Floor names the
  veto matrix; this skill names the divisions' personas in
  enough detail to inform the casting vote)

Everyday code work doesn't need this level of detail loaded;
the Council Phase 1 happens from memory + Floor knowledge.
This skill exists to provide the durable record when the
assistant authors something Council-shaped (an agent file, a
plan, a runbook, an ADR).

Migration provenance: CLAUDE.md lines 79-239 (Council Structure +
Extended Eleven), 748-849 (Conversation Rules), 1416-1680
(Division Personas) → moved here 2026-06-02 as part of the
lazy-rules-loading plan.

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Late addition: agents.md (Phase B classified it here but
     initial SKILL.md author missed appending the source).
     ============================================================ -->

## Agent Delegation Guide (migrated from rules-library/common/agents.md)

# Agent Orchestration

## Available Agents

Located in `~/.claude/agents/`:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code review | After writing code |
| security-reviewer | Security analysis | Before commits |
| build-error-resolver | Fix build errors | When build fails |
| e2e-runner | E2E testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation | Updating docs |

## Immediate Agent Usage

No user prompt needed:

1. Complex feature requests - Use **planner** agent
2. Code just written/modified - Use **code-reviewer** agent
3. Bug fix or new feature - Use **tdd-guide** agent
4. Architectural decision - Use **architect** agent

## Parallel Task Execution

ALWAYS use parallel Task execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:

- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Agent not delegated to when its description matches the work (Immediate Agent Usage rule weakening)
- Sequential agent calls when parallel was possible (Parallel Task Execution rule weakening)
- Complex feature shipped without `planner` agent producing a phased plan
- Code shipped without `code-reviewer` / language-specific reviewer pass
- TDD-eligible task started without `tdd-guide` agent invocation
- Security-sensitive change shipped without `security-reviewer` audit
- Multi-perspective analysis skipped on a complex / ambiguous problem (single-perspective bias risk)
- Agent invoked without the required context (description, file paths, expected output shape)

**Refinement candidates**:

- New row in the "Available Agents" table when a new specialist agent ships (e.g., `accessibility-reviewer`, `data-reviewer`)
- Tightening of the "Immediate Agent Usage" criteria when an agent's expertise proves load-bearing in retrospectives
- New parallel-execution template when a recurring fan-out pattern emerges (e.g., three-language security audit)
- New cross-reference when a sister rule (council-default, council-triggers, performance) defines when an agent must engage

---

<!-- ============================================================
     Migration appendix 2: council-triggers.md (2026-06-02)
     Phase B classified this in council-rules; initial author
     summarised triggers in the Extended Eleven section but
     didn't embed the full per-division trigger catalog. Adding
     it here for completeness.
     ============================================================ -->

## Council Triggers — Full Per-Division Catalog (migrated from rules/common/council-triggers.md)

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

---
