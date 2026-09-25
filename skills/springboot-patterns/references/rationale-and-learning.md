# Rationale and Learning Hooks

> Covers why these defaults exist and the signals that refine them. Pointed at by the "Rationale +
> learning hooks" row in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Why this skill exists

Spring Boot's "convention over configuration" + auto-config saves time at the cost of subtle
defaults: `SimpleAsyncTaskExecutor` is unbounded, default `RestTemplate` shares no pool,
`@Transactional` placement determines connection-pool exhaustion under load, `@ControllerAdvice`
placement determines whether validation errors leak stacktraces. The patterns above codify the
production-ready defaults so Spring Boot apps survive the second deploy.

Spring Security 6's defaults are sane, but its DSL gives developers many ways to silently disable
protections (`csrf().disable()`, `permitAll()` on patterns that match too widely, shared HMAC keys
in `application.properties`). Every one of those defaults has caused real production breaches at
companies that thought they were "secured by Spring." This skill codifies the deny-by-default
posture + asymmetric-key + Argon2 + audit-log baseline that survives an OWASP ASVS L2 audit.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Field injection via `@Autowired` on private field (constructor injection weakening — testability
  cost)
- Fat controller (business logic in `@RestController` instead of `@Service`)
- `@Transactional` on public method called via `this.method()` (proxy bypass — TX not applied)
- HikariCP defaults left in place when QPS profile suggests tuning needed
- `@ControllerAdvice` missing for exception translation (per
  `~/.claude/rules-library/common/error-handling-with-context.md`)
- Bean cycle / circular `@Autowired` — startup-time signal of architectural smell
- DTO returned from repository (entity-vs-DTO leakage)
- Application properties hardcoded instead of using `@ConfigurationProperties` + validation
- Async method called within same class (proxy-bypass — `@Async` not applied)
- Reactive (`Mono`/`Flux`) mixed with blocking JDBC in same chain (thread-pool starvation)

**Refinement candidates**:

- New pattern row when Spring Boot ships a new feature (e.g., Spring Boot 4 GraalVM AOT)
- New cross-reference when a sister skill (springboot-patterns, springboot-testing, jpa-patterns)
  adds a related pattern
- Tightening of the `@Transactional` guidance when a recurring TX-bypass incident emerges
- New testability gate when constructor-injection regression recurs

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Endpoint not protected by `@PreAuthorize` / `SecurityFilterChain` matcher (broken access control —
  A01)
- CSRF disabled on stateful endpoint (`http.csrf(c -> c.disable())` without rationale)
- `BCryptPasswordEncoder` with low strength factor (< 12) or other weak encoder
- `permitAll()` / `anyRequest().permitAll()` reaching production (default-permit anti-pattern)
- JdbcTemplate / EntityManager with string-concat queries (SQL injection — A03)
- Actuator endpoints exposed without authentication
- `@CrossOrigin(origins = "*")` on a non-public-facing endpoint (CORS over-permission)
- JWT signed with HS256 + weak secret OR `none` algorithm accepted
- Spring Security version older than current major (CVE exposure — A06)
- `org.springframework.security.crypto.password.NoOpPasswordEncoder` used anywhere
- Sensitive request param logged via default `RequestLoggingFilter`

**Refinement candidates**:

- New OWASP A01-A10 mapping row when a recurring Spring Security anti-pattern surfaces
- New cross-reference when a sister skill (springboot-patterns, owasp-asvs, security-review) adds a
  Spring gate
- New row in security checklist when Spring Security ships a new feature (e.g., OAuth 2.1 default)
- Tightening of the authorization matrix when a new role / privilege class is added
