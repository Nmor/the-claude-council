# Kotlin Security

> Auto-fires on every `*.kt`, `*.kts`, `build.gradle.kts` file.
> Sister to `~/.claude/rules/common/security.md`. Standards:
> **OWASP Kotlin / Android**, **OWASP ASVS 4.0**, **OWASP Mobile
> Top 10** (when Android), **Spring Security 6** (when Spring),
> **Android Lint security checks**.

## Core Principle

**Kotlin's null-safety closes one CVE class (NPE) but most OWASP
applies the same as Java. Spring / Ktor / Android each carry
framework-specific guardrails. Secrets via vault, never source;
TLS 1.2+; argon2id / bcrypt for passwords; parameterised DB
queries; CSP / HSTS / SameSite cookies; deny-by-default authz.**

## OWASP — Kotlin specifics

### A02 — Cryptographic Failures

```kotlin
// FORBIDDEN — MD5 / SHA-1
val md = java.security.MessageDigest.getInstance("MD5")

// CORRECT for hashing — SHA-256+
val md = java.security.MessageDigest.getInstance("SHA-256")

// CORRECT for passwords — Argon2id (BouncyCastle / spring-security-crypto)
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
val encoder = Argon2PasswordEncoder(16, 32, 1, 65536, 3)
val hash = encoder.encode(password)

// CORRECT for AES — GCM mode
import javax.crypto.Cipher
val cipher = Cipher.getInstance("AES/GCM/NoPadding")
```

### A03 — Injection

```kotlin
// SQL via Spring Data / Exposed / JOOQ — always parameterised
@Repository
class UserRepo(private val tpl: NamedParameterJdbcTemplate) {
    fun findByEmail(email: String): User? =
        tpl.queryForObject(
            "SELECT * FROM users WHERE email = :email",
            mapOf("email" to email),
            userRowMapper
        )
}

// FORBIDDEN
"SELECT * FROM users WHERE email = '$email'"
```

### A05 — Misconfiguration (Spring Boot)

```yaml
# application.yml — production
spring:
  jpa:
    show-sql: false
    open-in-view: false
server:
  error:
    include-stacktrace: never
    include-message: never
```

### A07 — Authentication (Spring Security)

```kotlin
@Configuration
@EnableWebSecurity
class SecurityConfig {
    @Bean
    fun chain(http: HttpSecurity): SecurityFilterChain = http
        .csrf { it.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()) }
        .headers { h ->
            h.contentSecurityPolicy { it.policyDirectives("default-src 'self'") }
            h.strictTransportSecurity { it.maxAgeInSeconds(31536000) }
            h.frameOptions { it.deny() }
        }
        .authorizeHttpRequests { auth ->
            auth.requestMatchers("/api/public/**").permitAll()
            auth.requestMatchers("/api/admin/**").hasRole("ADMIN")
            auth.anyRequest().authenticated()
        }
        .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
        .oauth2ResourceServer { it.jwt(Customizer.withDefaults()) }
        .build()
}
```

### A09 — Logging

```kotlin
// FORBIDDEN — logs credentials
logger.info("login: user=$user password=$password")

// CORRECT — never log credentials; structured fields
logger.info { "login attempt: user_id=${user.id}" }
```

### A10 — SSRF

```kotlin
private val ALLOWED_HOSTS = setOf("api.partner.com", "uploads.example.com")

fun fetchUrl(url: String): Response {
    val uri = URI(url)
    require(uri.host in ALLOWED_HOSTS) { "host not allowlisted: ${uri.host}" }
    // resolve + check IPs don't fall in private ranges
    val addr = InetAddress.getByName(uri.host)
    require(!addr.isSiteLocalAddress && !addr.isLoopbackAddress) {
        "private network blocked"
    }
    return httpClient.get(uri.toString())
}
```

## Android-specific

### Network security config

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

### Secrets

```kotlin
// FORBIDDEN — hardcoded in source
const val API_KEY = "sk_live_..."

// CORRECT — BuildConfig from secure local properties NOT in version control
// build.gradle.kts:
buildConfigField("String", "API_KEY", "\"${project.findProperty("API_KEY")}\"")
// gradle.properties (gitignored):
API_KEY=...
// Or use Android Keystore for sensitive runtime secrets
```

### Per Android Lint security checks

- `HardcodedDebugMode` — no `debuggable=true` in release
- `JavaScriptInterface` — guard against XSS in WebView
- `ExportedReceiver` — explicit intent filters
- `Insecure*` — TLS, file permissions, etc.

## Secrets — server + mobile

- Server: Spring Cloud Config + Vault OR AWS Secrets Manager
- Android: Android Keystore for cryptographic secrets; encrypted
  SharedPreferences via `androidx.security:security-crypto`
- iOS / KMP: Keychain

Per `~/.claude/rules/common/secrets-management.md`.

## Required tooling

```bash
# JVM-side
gradle ktlintCheck detekt test
gradle dependencyCheckAnalyze     # OWASP Dependency-Check
gradle clean build --warning-mode=all

# Android
gradle lintRelease                 # Android Lint
gradle :app:dependencyCheckAnalyze
```

## Cross-references

- `~/.claude/rules/common/security.md`
- `~/.claude/rules/common/secrets-management.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/kotlin/no-discards.md`
- `~/.claude/rules/kotlin/coding-style.md`
- OWASP Mobile Top 10 (owasp.org/www-project-mobile-top-10/)
- Spring Security Reference (when Spring)
- Android Security Best Practices (developer.android.com/topic/security)
