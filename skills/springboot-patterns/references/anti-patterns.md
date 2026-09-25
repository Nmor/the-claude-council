# Anti-Patterns

> Covers the known-bad Spring Boot and Spring Security shapes with their correct alternatives.
> Pointed at by the "Anti-patterns" row in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `@Autowired` field injection | Hidden deps, untestable without reflection, mutable | Constructor injection (Spring 4.3+ auto-wires single-constructor) |
| Business logic in `@RestController` | Couples HTTP to domain; can't reuse from CLI / scheduled job / queue consumer | Move to `@Service`; controller only does parse → call → respond |
| `@Transactional` on controller methods | Transaction spans the HTTP serialisation phase — connection pool starvation | Place on `@Service` methods; controller is transaction-free |
| `@Transactional(propagation = REQUIRES_NEW)` everywhere | Loses outer-tx semantics; creates orphan saves on partial failure | Default `REQUIRED`; `REQUIRES_NEW` only for audit-log / outbox patterns |
| Catching `Exception` in handler and returning 500 | Hides real errors; client sees "Internal error" for validation failures | `@ControllerAdvice` with typed `@ExceptionHandler` per domain exception → `ProblemDetail` per RFC 9457 |
| `new RestTemplate()` per request | Connection pool exhaustion + DNS thrash | Inject `RestClient` (Spring 6.1+) or `WebClient` configured once at startup |
| `Optional<T>` as `@Entity` field or method parameter | Optional designed for return types only; serialisation breaks | Use nullable field; return `Optional<T>` from repository |
| `@Async` without explicit `Executor` bean | Spring uses `SimpleAsyncTaskExecutor` (unbounded threads) | Define `ThreadPoolTaskExecutor` bean with bounded queue + rejection policy |

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `http.csrf(c -> c.disable())` on stateful endpoint | CSRF attacks succeed against authenticated browser sessions | Enable CSRF (default in Spring Security 6); disable ONLY for stateless JWT-bearer APIs |
| `permitAll()` then `@PreAuthorize` per method | Easy to forget annotation; defaults to public | Deny-by-default in `SecurityFilterChain` (`.anyRequest().authenticated()`); explicit `permitAll()` for narrow public paths |
| `BCryptPasswordEncoder()` with default cost | Default cost (10) is below 2026 NIST guidance | `BCryptPasswordEncoder(13)` or migrate to `Argon2PasswordEncoder` (winner of PHC) |
| JWT with `HS256` and shared secret in `application.properties` | Symmetric key in source = key compromise | `RS256` / `ES256` with key from `Secrets Manager`; rotate via `JwtDecoders.fromIssuerLocation()` |
| Storing `JWT` in `localStorage` (frontend) | XSS exfiltrates the token | `HttpOnly` + `Secure` + `SameSite=Strict` cookie; or session-based auth |
| `@Secured("ROLE_ADMIN")` for fine-grained checks | Role-only; can't express "owner of resource" | `@PreAuthorize("@authz.canView(#id, principal)")` with a `@Component` authoriser bean |
| Exposing Actuator endpoints (`/actuator/*`) publicly | Leaks env / metrics / heap dumps | `management.endpoints.web.exposure.include=health,info` only; secure rest behind admin role |
| Logging the Authorization header / JWT | PII + credential disclosure | Sanitise via Logback `<jsonMessage>` patterns + explicit `MaskingConverter` |
