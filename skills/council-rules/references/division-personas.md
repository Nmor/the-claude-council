# council-rules: Division Personas

> Per-division personas: collective experience, core principles, key deliverables, checklists,
> metrics, secure-coding patterns and red flags. Pointed at by the SKILL.md routing row "Division
> personas".
>
> **Size budget: 13 KB** — `token-budget.mjs --check`.

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
