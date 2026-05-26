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
- **coding-standards** — Universal code quality
- **security-review** — Input validation, auth, secrets
- **tdd-workflow** — Red-Green-Refactor methodology

Agents:

- **go-reviewer** — Idiomatic Go review, concurrency safety, race detection
- **go-build-resolver** — Fix build errors, vet warnings, linter issues
- **tdd-guide** — Write tests first, enforce coverage
- **security-reviewer** — OWASP, secrets, auth bypass

### TypeScript/JavaScript (*.ts, *.tsx, *.js, *.jsx)

Skills:

- **coding-standards** — Universal code quality
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

- **frontend-design** — Typography, color, motion, aesthetics
- **frontend-patterns** — Component architecture, performance
- **vue3-patterns** — Composition API, `<script setup>`, composables, Pinia, reactivity gotchas (Vue files only)
- **coding-standards** — Code quality and naming

Agents:

- **code-reviewer** — UI code quality review

### Python (*.py, *.pyi)

Skills:

- **python-patterns** — PEP 8, type hints, Pythonic idioms
- **python-testing** — pytest, fixtures, mocking, parametrization
- **coding-standards** — Universal code quality
- **security-review** — Input validation, secrets

Agents:

- **python-reviewer** — PEP 8, type hints, framework patterns, security
- **tdd-guide** — Write tests first, enforce coverage
- **security-reviewer** — OWASP, secrets, injection

### Django Python (*.py in django projects)

Skills:

- **django-patterns** — Architecture, DRF, ORM, middleware
- **django-security** — Auth, CSRF, SQL injection, XSS
- **django-tdd** — pytest-django, factory_boy, mocking
- **django-verification** — Migrations, linting, coverage, deployment

Agents:

- **python-reviewer** — Django-specific Python review
- **security-reviewer** — OWASP for Django
- **database-reviewer** — Django ORM query optimization

### C/C++ (*.cpp, *.hpp, *.c, *.h, CMakeLists.txt, *.cmake)

Skills:

- **cpp-coding-standards** — C++ Core Guidelines, modern idioms
- **cpp-testing** — GoogleTest, CTest, sanitizers (when test files)
- **coding-standards** — Universal code quality
- **security-review** — Buffer overflows, memory safety

Agents:

- **code-reviewer** — C++ code quality review
- **security-reviewer** — Memory safety, buffer overflows

### Swift (*.swift, Package.swift)

Skills:

- **swift-actor-persistence** — Thread-safe actors, data persistence
- **swift-protocol-di-testing** — Protocol DI, mock patterns
- **coding-standards** — Universal code quality
- **security-review** — Keychain, ATS, input validation

Agents:

- **code-reviewer** — Swift code quality review
- **tdd-guide** — Swift testing patterns
- **security-reviewer** — iOS/macOS security

### Dart/Flutter (*.dart, pubspec.yaml)

Skills:

- **coding-standards** — Universal code quality
- **security-review** — Secure storage, network security
- **tdd-workflow** — Red-Green-Refactor methodology

Agents:

- **code-reviewer** — Dart/Flutter code quality review
- **tdd-guide** — Flutter test patterns
- **security-reviewer** — Mobile security

### C# (*.cs, *.csproj)

Skills:

- **coding-standards** — Universal code quality
- **security-review** — SQL injection, auth, input validation
- **tdd-workflow** — Red-Green-Refactor methodology

Agents:

- **code-reviewer** — C# code quality review
- **security-reviewer** — .NET security

### Java/Spring Boot (*.java, pom.xml, *.gradle)

Skills:

- **java-coding-standards** — Naming, immutability, Optional, streams
- **springboot-patterns** — Layered architecture, REST, caching
- **springboot-security** — Auth, validation, CSRF, secrets
- **springboot-tdd** — JUnit 5, Mockito, Testcontainers
- **springboot-verification** — Build, analysis, coverage, security scans
- **jpa-patterns** — Entity design, relationships, queries (when JPA entities)

Agents:

- **code-reviewer** — Java code quality review
- **tdd-guide** — Spring Boot TDD
- **security-reviewer** — Spring Security audit
- **database-reviewer** — JPA/Hibernate query optimization

### Lua (*.lua, *.rockspec)

Skills:

- **coding-standards** — Universal code quality

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

Agents:

- **doc-updater** — Codemaps, READMEs, guides, documentation generation

## Cross-Cutting Skills & Agents (Apply When Relevant)

These activate based on context, not file type:

Skills:

- **search-first** — Before writing custom code, search for existing solutions
- **verification-loop** — After implementation, verify build/lint/test pass
- **continuous-learning** — Extract reusable patterns from completed work
- **continuous-learning-v2** — Instinct-based learning, confidence scoring, pattern evolution
- **content-hash-cache-pattern** — When caching expensive file processing
- **cost-aware-llm-pipeline** — When building LLM-powered features
- **regex-vs-llm-structured-text** — When parsing structured text
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
  + `docs/secrets.md`, long-term AWS keys on disk, CI gate parity,
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

When Claude first touches a repo in a session, it states explicitly
that these are being applied, runs the relevant checks, and reports.

## What NOT to Auto-Apply

These are meta/config skills, not coding skills — only use when explicitly relevant:

- **configure-ecc** — Only when user wants to install/configure skills
- **project-guidelines-example** — Template reference only
- **iterative-retrieval** — Subagent pattern, used internally
- **strategic-compact** — Context management, used internally
- **eval-harness** — Only for formal eval sessions
- **nutrient-document-processing** — Only when processing documents via Nutrient API
- **security-scan** — Only when auditing Claude Code config itself
