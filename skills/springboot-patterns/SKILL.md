---
name: springboot-patterns
description: Spring Boot 3.x implementation discipline — layering (controller/service/repository), dependency injection, configuration properties, transaction boundaries, JPA usage, REST API design, error handling, AND the full Spring Security surface (authentication, authorization, method security, CSRF, CORS, headers, secret handling). Use when writing or reviewing any Spring Boot controller, service, repository, entity, configuration class, application.yml or build file.
paths:
  - "**/*Controller.java"
  - "**/*Service.java"
  - "**/*ServiceImpl.java"
  - "**/*Repository.java"
  - "**/*Application.java"
  - "**/*Config.java"
  - "**/*Configuration.java"
  - "**/*Entity.java"
  - "**/*Dto.java"
  - "**/application*.yml"
  - "**/application*.yaml"
  - "**/application*.properties"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
  - "**/*Controller.kt"
  - "**/*Service.kt"
  - "**/*Repository.kt"
---

# Spring Boot Development Patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> One source of truth per Spring concept — one `@ControllerAdvice`
> exception handler, one custom `Validator`, one common base
> entity, one shared `JpaRepository` interface per aggregate.
> Sweep `*Service`, `*Repository`, `dto/`, `mapper/` directories
> before adding new classes. Extend via interface / abstract base
> / `@Configuration` — never fork.

Spring Boot architecture and API patterns for scalable, production-grade services.

## Purpose

Principal-level Spring Boot architecture: layered separation (controller / service / repository),
constructor injection, transactional boundaries, centralised exception handling, observability,
caching, and async boundaries.

**Negative scope** (NOT what this skill covers):

- Spring Boot AUTH / security flows — see `springboot-patterns`
- Spring Boot TEST methodology — see `springboot-testing`
- JPA entity modelling + queries — see `jpa-patterns`
- Java language idioms (Optional, records, streams) — see `java-coding-standards`
- Build / CI / coverage gates — see `springboot-testing`

Principal-level Spring Security 6 architecture: deny-by-default authorisation chains, OAuth2 / OIDC
resource-server config, method security, CSRF + CORS posture, JWT / session strategy, password
hashing, secrets management for Spring properties.

**Negative scope** (NOT what this skill covers):

- Spring Boot layered architecture — see `springboot-patterns`
- Cryptographic primitives at large — see `owasp-asvs`
- Java language idioms — see `java-coding-standards`
- Test methodology for security flows — see `springboot-testing`
- Frontend XSS / CSP enforcement — see `frontend-patterns`

## Routing table

The detail lives in `references/`. Read only the row the work touches.

| Topic | Read when | Reference |
| --- | --- | --- |
| Scope + standards | Deciding whether this skill applies; citing a standard or RFC | `references/scope-and-standards.md` |
| Layering + REST API | Writing a controller, service, repository, DTO, or pagination | `references/layering-and-api.md` |
| Exception handling | Centralising error translation (`@ControllerAdvice`, RFC 9457) | `references/error-handling.md` |
| Caching + async + jobs | `@Cacheable`, `@Async`, `@Scheduled`, queue consumers | `references/caching-and-async.md` |
| Observability | SLF4J logging, request filters, metrics, tracing | `references/observability.md` |
| Resilience + rate limiting | Retrying external calls; Bucket4j filters; proxy / client-IP trust | `references/resilience-and-rate-limiting.md` |
| Production defaults | Injection, HikariCP, ProblemDetail, null-safety defaults | `references/production-defaults.md` |
| Authentication + authorization | JWT / session filters, `@PreAuthorize`, method security | `references/authentication-and-authorization.md` |
| Input + data safety | Bean Validation, SQL injection, password encoding, file uploads | `references/input-and-data-safety.md` |
| Web security posture | CSRF, security headers, CORS, per-endpoint rate limits | `references/web-security-posture.md` |
| Secrets + dependencies | Externalising credentials, CVE gates, PII in logs | `references/secrets-and-dependencies.md` |
| Anti-patterns | Reviewing code for known-bad Spring shapes | `references/anti-patterns.md` |
| Checklists | Gating a release or a completion claim | `references/checklists.md` |
| Rationale + learning hooks | Why the defaults exist; signals to watch | `references/rationale-and-learning.md` |

## Cross-References

- `~/.claude/skills/springboot-patterns/SKILL.md` — Spring Security 6 + OAuth2 + CSRF
- `~/.claude/skills/springboot-testing/SKILL.md` — JUnit 5 + Mockito + Testcontainers
- `~/.claude/skills/springboot-testing/SKILL.md` — Maven / Gradle build gates
- `~/.claude/skills/jpa-patterns/SKILL.md` — Hibernate query optimisation
- `~/.claude/skills/java-coding-standards/SKILL.md` — language idioms
- `~/.claude/skills/api-design/SKILL.md` — REST contract design
- `~/.claude/skills/observability-patterns/SKILL.md` — Micrometer + OTel
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI is the substrate
- `~/.claude/rules-library/common/error-handling-with-context.md` — RFC 9457 mapping
- `~/.claude/agents/code-reviewer.md` — Java code-review delegate

- `~/.claude/skills/springboot-patterns/SKILL.md` — broader Spring Boot architecture
- `~/.claude/skills/owasp-asvs/SKILL.md` — full ASVS control catalogue
- `~/.claude/skills/api-design/SKILL.md` — REST contract / error envelope
- `~/.claude/rules-library/common/secrets-management.md` — vault, never properties
- `~/.claude/rules-library/common/audit-logging.md` — security-event audit log
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — CVE gate
- `~/.claude/agents/security-reviewer.md` — Council Division 4
- `~/.claude/agents/compliance-reviewer.md` — Council Division 6 (regulatory)
