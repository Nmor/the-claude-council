# Scope and Standards

> Covers when this skill activates, when it does not, and every standard it cites. Pointed at by the
> "Scope + standards" row in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## When to Activate

- Building REST APIs with Spring MVC or WebFlux
- Structuring controller → service → repository layers
- Configuring Spring Data JPA, caching, or async processing
- Adding validation, exception handling, or pagination
- Setting up profiles for dev/staging/production environments
- Implementing event-driven patterns with Spring Events or Kafka

- Adding authentication (JWT, OAuth2, session-based)
- Implementing authorization (@PreAuthorize, role-based access)
- Validating user input (Bean Validation, custom validators)
- Configuring CORS, CSRF, or security headers
- Managing secrets (Vault, environment variables)
- Adding rate limiting or brute-force protection
- Scanning dependencies for CVEs

## When NOT to use

- Non-Spring JVM frameworks (Quarkus, Micronaut, Helidon — different DI / startup model)
- Kotlin coroutines-first servers (see Ktor patterns)
- Reactive WebFlux at high scale (defer to project-specific reactive guidance — back-pressure
  semantics differ from MVC)

- Non-Spring stacks (use the framework-specific security guidance)
- Pure REST gateways without business logic — consider an API-gateway-native auth (Kong, Tyk,
  Apigee) before pulling Spring Security into a thin proxy

## Standards Cited

- **Spring Framework 6.2 Reference** (`docs.spring.io/spring-framework/reference`) — DI,
  transactions, AOP, MVC
- **Spring Boot 3.4 Reference** (`docs.spring.io/spring-boot/reference`) — auto-config, actuator,
  observability
- **JSR 380 (Jakarta Bean Validation 3.0)** — `@Valid`, `@NotNull`, `@Email` semantics
- **RFC 7807 (Problem Details for HTTP APIs)** — Spring 6 `ProblemDetail` API
- **RFC 9457 (Problem Details — successor)** — current standard
- **OpenAPI 3.1** — `springdoc-openapi` integration
- **OWASP ASVS 4.0.3 §1, §4, §13** — architecture + access-control + API surface
- **Effective Java 3e (Bloch)** — Item 17 (immutability), Item 18 (composition), Item 50 (defensive
  copies)

- **OWASP ASVS 4.0.3 §2 (Authentication), §3 (Session), §4 (Access Control), §7 (Error Handling),
  §13 (API)** — control catalogue
- **OWASP Top 10 2021** — A01 / A02 / A03 / A07 mapping
- **RFC 6749 (OAuth 2.0)**, **RFC 8252 (OAuth Native Apps)**, **RFC 9126 (PAR)**, **RFC 9700 (OAuth
  2.0 Security BCP 2025)** — authorisation
- **RFC 7519 (JWT)**, **RFC 8725 (JWT Best Practices)** — token format + pitfalls
- **OpenID Connect Core 1.0** — OIDC flows
- **NIST SP 800-63B (Digital Identity)** — password + MFA guidance
- **Spring Security 6.4 Reference** (`docs.spring.io/spring-security/reference`) — config DSL,
  filter chain
- **CWE Top 25 (2026)** — CWE-22, CWE-79, CWE-89, CWE-287, CWE-862
