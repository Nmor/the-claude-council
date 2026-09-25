# council-rules: The Council Structure (Core Five)

> Core Five division structure, agent rosters and per-division engagement signals (Divisions 1-5).
> Pointed at by the SKILL.md routing row "Core Five — structure + agent roster".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
`coding-quality-rules` to ensure component architecture AND
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
