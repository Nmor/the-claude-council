# Java Security

> Auto-fires on every `*.java`, `pom.xml`, `*.gradle` file. Sister
> to `~/.claude/rules/common/security.md`. Standards: **OWASP
> Java Top 10**, **OWASP ASVS 4.0**, **CERT Oracle Coding
> Standard**, **Spring Security 6**, **JEP 411** (deprecated
> SecurityManager).

## Core Principle

**Spring-Boot defaults are NOT secure-by-default. Auth + authz are
explicit; every input is validated at boundary; secrets via
environment / vault, never source code; cryptography uses
`java.security` modern APIs (no MD5 / SHA-1 / DES); dependency
scanning blocks vulnerable libraries.**

## OWASP Top 10 — Java specifics

### A01 — Broken Access Control

```java
// WRONG — IDOR; user can fetch any user's order
@GetMapping("/orders/{id}")
public Order getOrder(@PathVariable String id) {
    return orderRepo.findById(id).orElseThrow();
}

// RIGHT — verify ownership
@GetMapping("/orders/{id}")
public Order getOrder(@PathVariable String id,
                      @AuthenticationPrincipal UserDetails user) {
    Order order = orderRepo.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException(id));
    if (!order.customerId().equals(user.getUsername())) {
        throw new AccessDeniedException("not your order");
    }
    return order;
}

// BETTER — method security
@PreAuthorize("@orderSecurity.canView(#id, principal)")
@GetMapping("/orders/{id}")
public Order getOrder(@PathVariable String id) { ... }
```

### A02 — Cryptographic Failures

```java
// WRONG — MD5 / SHA-1 are broken
MessageDigest md5 = MessageDigest.getInstance("MD5");

// WRONG — DES is broken
Cipher des = Cipher.getInstance("DES/ECB/PKCS5Padding");

// RIGHT — SHA-256 for non-password hashing
MessageDigest sha256 = MessageDigest.getInstance("SHA-256");

// RIGHT — AES-GCM for symmetric encryption
Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
SecretKey key = ...;
byte[] iv = new byte[12];
SecureRandom.getInstanceStrong().nextBytes(iv);
GCMParameterSpec spec = new GCMParameterSpec(128, iv);
aes.init(Cipher.ENCRYPT_MODE, key, spec);

// RIGHT — passwords via Argon2 / BCrypt (Spring Security)
PasswordEncoder encoder = new Argon2PasswordEncoder(16, 32, 1, 65536, 3);
String hash = encoder.encode(password);
```

### A03 — Injection

```java
// WRONG — SQL injection
String sql = "SELECT * FROM users WHERE id = '" + userId + "'";
jdbcTemplate.query(sql, ...);

// RIGHT — parameterised
jdbcTemplate.queryForList(
    "SELECT * FROM users WHERE id = ?", userId);

// RIGHT — JPA Criteria / @Query
@Query("SELECT u FROM User u WHERE u.email = :email")
List<User> findByEmail(@Param("email") String email);

// XSS — Thymeleaf escapes by default
// JSP — use <c:out> / JSTL escaping; NEVER <%= %> raw
```

### A04 — Insecure Design

- Threat-model EVERY input boundary
- Default-deny in Spring Security config (not default-permit)
- Idempotency keys on payment endpoints (per
  `~/.claude/rules/common/idempotency.md`)

### A05 — Security Misconfiguration

```java
// application.yml — production
spring:
  jpa:
    show-sql: false           # never log SQL in prod
    open-in-view: false       # avoid lazy-load leaks
  jackson:
    serialization:
      INDENT_OUTPUT: false    # no pretty-print

# WRONG — H2 console exposed in prod
# spring.h2.console.enabled: true

server:
  error:
    include-stacktrace: never   # don't leak stacktrace
    include-message: never
```

### A06 — Vulnerable Components

- Run `mvn dependency:tree -DincludeTestScope=true | mvn versions:display-dependency-updates`
- OSV-Scanner against Maven coords; per
  `~/.claude/rules/common/dependency-vulnerabilities.md`
- `mvn dependency-check:aggregate` (OWASP Dependency Check
  plugin)

### A07 — Identification + Authentication

```java
// Spring Security: strong password encoder + brute-force protection
@Bean
public PasswordEncoder passwordEncoder() {
    return new Argon2PasswordEncoder(16, 32, 1, 65536, 3);
}

// Account lockout
public class LoginAttemptService {
    private static final int MAX_ATTEMPTS = 5;
    private static final Duration LOCKOUT = Duration.ofMinutes(15);
    // Track + reject after threshold
}
```

Per `~/.claude/rules/common/rate-limiting.md`.

### A08 — Software + Data Integrity

- Sign release artifacts; verify on deploy
- `jar` signing (jarsigner) for distributable libraries
- Maven Central deployment with PGP signing

### A09 — Logging + Monitoring

```java
// WRONG — logs password
log.info("login attempt: user={} password={}", user, password);

// RIGHT — never log credentials
log.info("login attempt: user={}", user);

// Log security events (auth success/fail, privilege change)
// Audit log per ~/.claude/rules/common/audit-logging.md
```

### A10 — SSRF

```java
// WRONG — fetches arbitrary URLs
String url = request.getParameter("url");
HttpResponse<String> resp = httpClient.send(
    HttpRequest.newBuilder(URI.create(url)).build(),
    HttpResponse.BodyHandlers.ofString());

// RIGHT — validate against allowlist
private static final Set<String> ALLOWED_HOSTS = Set.of(
    "api.partner.com", "uploads.example.com");
URI uri = URI.create(url);
if (!ALLOWED_HOSTS.contains(uri.getHost())) {
    throw new BadRequestException("host not allowed");
}
// + block AWS IMDS IPs, private networks
```

## Spring Security baseline

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.csrfTokenRepository(
                CookieCsrfTokenRepository.withHttpOnlyFalse()))
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
                .strictTransportSecurity(sts -> sts.maxAgeInSeconds(31536000))
                .frameOptions(f -> f.deny()))
            .authorizeHttpRequests(req -> req
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .build();
    }
}
```

## Secrets

- NEVER in `application.yml` for prod values
- Spring Cloud Config + Vault, or AWS Secrets Manager via SDK,
  or environment vars
- Per `~/.claude/rules/common/secrets-management.md`

## Required tooling

```bash
mvn verify                          # runs tests + checks
mvn dependency-check:aggregate      # OWASP Dependency Check
mvn spotbugs:check                  # SpotBugs static analysis
mvn pmd:check pmd:cpd-check         # PMD + copy-paste detector
mvn checkstyle:check                # style + many security rules
```

## Cross-references

- `~/.claude/rules/common/security.md` — universal baseline
- `~/.claude/rules/java/no-discards.md` — banned patterns
- `~/.claude/rules/java/coding-style.md` — naming + structure
- `~/.claude/rules/common/dependency-vulnerabilities.md` — CVE
  gate
- OWASP Java Cheat Sheet Series
- Spring Security 6 Reference
- CERT Oracle Coding Standard for Java
