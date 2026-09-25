# Checklists

> Covers the pre-release security checklist and the architecture + security verification checklist.
> Pointed at by the "Checklists" row in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Checklist Before Release

- [ ] Auth tokens validated and expired correctly
- [ ] Authorization guards on every sensitive path
- [ ] All inputs validated and sanitized
- [ ] No string-concatenated SQL
- [ ] CSRF posture correct for app type
- [ ] Secrets externalized; none committed
- [ ] Security headers configured
- [ ] Rate limiting on APIs
- [ ] Dependencies scanned and up to date
- [ ] Logs free of sensitive data

**Remember**: Deny by default, validate inputs, least privilege, and secure-by-configuration first.

## Verification Checklist

- [ ] All `@Service`/`@Repository`/`@Controller` use constructor injection (no `@Autowired` fields)
- [ ] Controllers do NO business logic (parse → service → respond only)
- [ ] `@Transactional` on service layer only, never controllers
- [ ] `@ControllerAdvice` handles ALL domain exceptions with `ProblemDetail` (RFC 9457)
- [ ] `RestClient` / `WebClient` beans configured at startup, not constructed per request
- [ ] `@Async` methods use an explicit bounded `Executor`
- [ ] HikariCP pool size + connection timeout tuned for load
- [ ] Actuator endpoints (`/actuator/health`, `/actuator/metrics`) secured behind admin auth
- [ ] OpenAPI spec generated via `springdoc-openapi` and served at `/v3/api-docs`

- [ ] `SecurityFilterChain` ends with `.anyRequest().authenticated()` (deny-by-default)
- [ ] CSRF enabled for stateful endpoints; disabled only with documented stateless-JWT rationale
- [ ] Password encoder is `Argon2PasswordEncoder` OR `BCryptPasswordEncoder(13)` minimum
- [ ] JWT uses asymmetric algo (`RS256` / `ES256`); key from Secrets Manager, not properties
- [ ] CORS allowlist explicit (no wildcard `*` for credentialed requests)
- [ ] Actuator endpoints minimal exposure + admin role
- [ ] `@PreAuthorize` uses domain-aware authorisers, not just `ROLE_X`
- [ ] All inputs validated via `@Valid` + JSR 380 constraints
- [ ] Security events emitted to audit log (per `audit-logging.md`)
- [ ] Dependency CVE scan green (OWASP Dependency-Check / Snyk)
