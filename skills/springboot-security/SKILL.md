---
name: springboot-security
description: Spring Security best practices for authn/authz, validation, CSRF, secrets, headers, rate limiting, and dependency security in Java Spring Boot services.
---

# Spring Boot Security Review

Use when adding auth, handling input, creating endpoints, or dealing with secrets.

## When to Activate

- Adding authentication (JWT, OAuth2, session-based)
- Implementing authorization (@PreAuthorize, role-based access)
- Validating user input (Bean Validation, custom validators)
- Configuring CORS, CSRF, or security headers
- Managing secrets (Vault, environment variables)
- Adding rate limiting or brute-force protection
- Scanning dependencies for CVEs

## Authentication

- Prefer stateless JWT or opaque tokens with revocation list
- Use `httpOnly`, `Secure`, `SameSite=Strict` cookies for sessions
- Validate tokens with `OncePerRequestFilter` or resource server

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring(7);
      Authentication auth = jwtService.authenticate(token);
      SecurityContextHolder.getContext().setAuthentication(auth);
    }
    chain.doFilter(request, response);
  }
}
```

## Authorization

- Enable method security: `@EnableMethodSecurity`
- Use `@PreAuthorize("hasRole('ADMIN')")` or `@PreAuthorize("@authz.canEdit(#id)")`
- Deny by default; expose only required scopes

```java
@RestController
@RequestMapping("/api/admin")
public class AdminController {

  @PreAuthorize("hasRole('ADMIN')")
  @GetMapping("/users")
  public List<UserDto> listUsers() {
    return userService.findAll();
  }

  @PreAuthorize("@authz.isOwner(#id, authentication)")
  @DeleteMapping("/users/{id}")
  public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
```

## Input Validation

- Use Bean Validation with `@Valid` on controllers
- Apply constraints on DTOs: `@NotBlank`, `@Email`, `@Size`, custom validators
- Sanitize any HTML with a whitelist before rendering

```java
// BAD: No validation
@PostMapping("/users")
public User createUser(@RequestBody UserDto dto) {
  return userService.create(dto);
}

// GOOD: Validated DTO
public record CreateUserDto(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotNull @Min(0) @Max(150) Integer age
) {}

@PostMapping("/users")
public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserDto dto) {
  return ResponseEntity.status(HttpStatus.CREATED)
      .body(userService.create(dto));
}
```

## SQL Injection Prevention

- Use Spring Data repositories or parameterized queries
- For native queries, use `:param` bindings; never concatenate strings

```java
// BAD: String concatenation in native query
@Query(value = "SELECT * FROM users WHERE name = '" + name + "'", nativeQuery = true)

// GOOD: Parameterized native query
@Query(value = "SELECT * FROM users WHERE name = :name", nativeQuery = true)
List<User> findByName(@Param("name") String name);

// GOOD: Spring Data derived query (auto-parameterized)
List<User> findByEmailAndActiveTrue(String email);
```

## Password Encoding

- Always hash passwords with BCrypt or Argon2 — never store plaintext
- Use `PasswordEncoder` bean, not manual hashing

```java
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder(12); // cost factor 12
}

// In service
public User register(CreateUserDto dto) {
  String hashedPassword = passwordEncoder.encode(dto.password());
  return userRepository.save(new User(dto.email(), hashedPassword));
}
```

## CSRF Protection

- For browser session apps, keep CSRF enabled; include token in forms/headers
- For pure APIs with Bearer tokens, disable CSRF and rely on stateless auth

```java
http
  .csrf(csrf -> csrf.disable())
  .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
```

## Secrets Management

- No secrets in source; load from env or vault
- Keep `application.yml` free of credentials; use placeholders
- Rotate tokens and DB credentials regularly

```yaml
# BAD: Hardcoded in application.yml
spring:
  datasource:
    password: mySecretPassword123

# GOOD: Environment variable placeholder
spring:
  datasource:
    password: ${DB_PASSWORD}

# GOOD: Spring Cloud Vault integration
spring:
  cloud:
    vault:
      uri: https://vault.example.com
      token: ${VAULT_TOKEN}
```

## Security Headers

```java
http
  .headers(headers -> headers
    .contentSecurityPolicy(csp -> csp
      .policyDirectives("default-src 'self'"))
    .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
    .xssProtection(Customizer.withDefaults())
    .referrerPolicy(rp -> rp.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)));
```

## CORS Configuration

- Configure CORS at the security filter level, not per-controller
- Restrict allowed origins — never use `*` in production

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
  CorsConfiguration config = new CorsConfiguration();
  config.setAllowedOrigins(List.of("https://app.example.com"));
  config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
  config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
  config.setAllowCredentials(true);
  config.setMaxAge(3600L);

  UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
  source.registerCorsConfiguration("/api/**", config);
  return source;
}

// In SecurityFilterChain:
http.cors(cors -> cors.configurationSource(corsConfigurationSource()));
```

## Rate Limiting

- Apply Bucket4j or gateway-level limits on expensive endpoints
- Log and alert on bursts; return 429 with retry hints

```java
// Using Bucket4j for per-endpoint rate limiting
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  private Bucket createBucket() {
    return Bucket.builder()
        .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
        .build();
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String clientIp = request.getRemoteAddr();
    Bucket bucket = buckets.computeIfAbsent(clientIp, k -> createBucket());

    if (bucket.tryConsume(1)) {
      chain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      response.getWriter().write("{\"error\": \"Rate limit exceeded\"}");
    }
  }
}
```

## Dependency Security

- Run OWASP Dependency Check / Snyk in CI
- Keep Spring Boot and Spring Security on supported versions
- Fail builds on known CVEs

## Logging and PII

- Never log secrets, tokens, passwords, or full PAN data
- Redact sensitive fields; use structured JSON logging

## File Uploads

- Validate size, content type, and extension
- Store outside web root; scan if required

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

## Purpose

Principal-level Spring Security 6 architecture: deny-by-default authorisation chains, OAuth2 / OIDC resource-server config, method security, CSRF + CORS posture, JWT / session strategy, password hashing, secrets management for Spring properties.

**Negative scope** (NOT what this skill covers):

- Spring Boot layered architecture — see `springboot-patterns`
- Cryptographic primitives at large — see `owasp-asvs`
- Java language idioms — see `java-coding-standards`
- Test methodology for security flows — see `springboot-tdd`
- Frontend XSS / CSP enforcement — see `frontend-patterns`

## When NOT to use

- Non-Spring stacks (use the framework-specific security guidance)
- Pure REST gateways without business logic — consider an API-gateway-native auth (Kong, Tyk, Apigee) before pulling Spring Security into a thin proxy

## Standards Cited

- **OWASP ASVS 4.0.3 §2 (Authentication), §3 (Session), §4 (Access Control), §7 (Error Handling), §13 (API)** — control catalogue
- **OWASP Top 10 2021** — A01 / A02 / A03 / A07 mapping
- **RFC 6749 (OAuth 2.0)**, **RFC 8252 (OAuth Native Apps)**, **RFC 9126 (PAR)**, **RFC 9700 (OAuth 2.0 Security BCP 2025)** — authorisation
- **RFC 7519 (JWT)**, **RFC 8725 (JWT Best Practices)** — token format + pitfalls
- **OpenID Connect Core 1.0** — OIDC flows
- **NIST SP 800-63B (Digital Identity)** — password + MFA guidance
- **Spring Security 6.4 Reference** (`docs.spring.io/spring-security/reference`) — config DSL, filter chain
- **CWE Top 25 (2026)** — CWE-22, CWE-79, CWE-89, CWE-287, CWE-862

## Anti-Patterns

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

## Verification Checklist

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

## Cross-References

- `~/.claude/skills/springboot-patterns/SKILL.md` — broader Spring Boot architecture
- `~/.claude/skills/owasp-asvs/SKILL.md` — full ASVS control catalogue
- `~/.claude/skills/api-design/SKILL.md` — REST contract / error envelope
- `~/.claude/rules-library/common/secrets-management.md` — vault, never properties
- `~/.claude/rules-library/common/audit-logging.md` — security-event audit log
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — CVE gate
- `~/.claude/agents/security-reviewer.md` — Council Division 4
- `~/.claude/agents/compliance-reviewer.md` — Council Division 6 (regulatory)

## Why this skill exists

Spring Security 6's defaults are sane, but its DSL gives developers many ways to silently disable protections (`csrf().disable()`, `permitAll()` on patterns that match too widely, shared HMAC keys in `application.properties`). Every one of those defaults has caused real production breaches at companies that thought they were "secured by Spring." This skill codifies the deny-by-default posture + asymmetric-key + Argon2 + audit-log baseline that survives an OWASP ASVS L2 audit.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Endpoint not protected by `@PreAuthorize` / `SecurityFilterChain` matcher (broken access control — A01)
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
- New cross-reference when a sister skill (springboot-patterns, owasp-asvs, security-review) adds a Spring gate
- New row in security checklist when Spring Security ships a new feature (e.g., OAuth 2.1 default)
- Tightening of the authorization matrix when a new role / privilege class is added
