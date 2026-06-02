---
name: kotlin-patterns
description: Kotlin 2.0+ discipline — null safety (no !! force-unwrap; safe call + Elvis), immutability (val over var; data class + copy), sealed classes for closed hierarchies, scope functions (let/run/apply/also/with) used purposefully, structured concurrency via coroutines (no GlobalScope.launch; supervisor scopes + Job cancellation), CoroutineExceptionHandler for unhandled errors, ktlint + detekt at strict ruleset, expression bodies for one-liners, KDoc on public API. Auto-fires on Kotlin source.
paths:
  - "**/*.kt"
  - "**/*.kts"
  - "build.gradle.kts"
  - "settings.gradle.kts"
  - "**/build.gradle.kts"
---

> Migrated 2026-06-02 from `~/.claude/rules-library/kotlin/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# kotlin-patterns


<!-- ============================================================
     Section: kotlin/coding-style.md
     ============================================================ -->

# Kotlin Coding Style

> Auto-fires on every `*.kt`, `*.kts`, `build.gradle.kts` file.
> Standards: **Kotlin Coding Conventions (jetbrains.com)**,
> **Effective Kotlin (Marcin Moskała)**, **Android Kotlin Style
> Guide** (when applicable), **Jetpack Compose Style** (when
> applicable). Tooling: **ktlint**, **detekt**, **kotlin compiler
> -progressive -Werror**.

## Core Principle

**Idiomatic Kotlin (2.0+) — null safety enforced, immutability
preferred (`val` over `var`), expression bodies for simple
functions, scope functions (`let` / `apply` / `with` / `also` /
`run`) used purposefully, no `!!` force-unwrap, sealed classes
for closed hierarchies, data classes for value carriers,
coroutines + structured concurrency, NO Java-isms (factory
methods named `getInstance`, builder patterns where data classes
suffice).**

## Naming

- Class / interface / object / enum: PascalCase — `OrderService`
- Function / method / property / variable: camelCase —
  `calculateTotal`, `userEmail`
- Constant (top-level / companion): SCREAMING_SNAKE_CASE —
  `MAX_RETRIES`
- Package: lowercase.dot.separated — `com.example.payments`
- File: PascalCase when one top-level class; lowercase otherwise

## Null safety

```kotlin
// WRONG — `!!` force-unwrap kills the program
val name = user!!.name

// RIGHT — let / safe call / Elvis
val name = user?.name ?: "Anonymous"

// RIGHT — early return / require
fun process(user: User?) {
    val u = user ?: return
    println(u.name)
}

// RIGHT — `requireNotNull` for invariants
fun load(id: String) {
    val cfg = requireNotNull(getConfig()) { "config must be loaded by now" }
    process(cfg)
}
```

## Immutability

- `val` over `var` (compiler enforces; ktlint warns)
- `listOf` / `mapOf` / `setOf` over `mutableListOf` etc.
- `data class` with `val` fields; never `var`
- `copy()` for non-destructive updates

```kotlin
data class Order(
    val id: OrderId,
    val customerId: UserId,
    val items: List<LineItem>,
    val total: Money,
) {
    init {
        require(items.isNotEmpty()) { "order must have items" }
    }
}

val updated = order.copy(total = order.total + tax)
```

## Sealed classes for closed hierarchies

```kotlin
sealed interface OrderEvent {
    data class Placed(val orderId: OrderId, val total: Money) : OrderEvent
    data class Paid(val orderId: OrderId, val chargeId: String) : OrderEvent
    data class Shipped(val orderId: OrderId, val tracking: String) : OrderEvent
    data class Cancelled(val orderId: OrderId, val reason: String) : OrderEvent
}

fun describe(event: OrderEvent): String = when (event) {
    is OrderEvent.Placed -> "Placed: ${event.orderId}"
    is OrderEvent.Paid -> "Paid: ${event.chargeId}"
    is OrderEvent.Shipped -> "Shipped: ${event.tracking}"
    is OrderEvent.Cancelled -> "Cancelled: ${event.reason}"
}
```

The `when` is exhaustive — compiler enforces.

## Scope functions (use purposefully)

| Function | Receiver | Returns | Use when |
| --- | --- | --- | --- |
| `let` | `it` | last expression | nullable chain / scope-local val |
| `run` | `this` | last expression | configure + return result |
| `apply` | `this` | the object | configure + return same object |
| `also` | `it` | the object | side-effect on object (logging) |
| `with` | `this` | last expression | grouped operations on non-receiver |

```kotlin
// Configure-and-return
val order = Order(...).apply {
    customer = currentUser
    status = OrderStatus.PENDING
}

// Nullable chain
user?.let {
    notify(it.email)
}
```

## Expression bodies

```kotlin
// Multi-line block for non-trivial logic
fun compute(x: Int): Int {
    val a = x * 2
    val b = a + 1
    return b
}

// Expression body for one-liners
fun double(x: Int) = x * 2
fun greet(name: String) = "Hello, $name"
```

## Coroutines

```kotlin
import kotlinx.coroutines.*

// Structured concurrency — children cancelled when scope dies
suspend fun fetchAll(ids: List<UserId>): List<User> = coroutineScope {
    ids.map { id ->
        async { fetchUser(id) }
    }.awaitAll()
}

// CancellationException is OUR exception — never catch broadly
try {
    work()
} catch (e: CancellationException) {
    throw e  // never swallow
} catch (e: IOException) {
    logger.warn("work failed", e)
    throw ServiceException("work failed", e)
}
```

## Files

- One public top-level class per `.kt` file when the class is
  > 50 lines
- File length ≤ 500 lines (per `extreme-lint-policy.md`)
- Top-level extension functions live in a topical file:
  `OrderExtensions.kt`

## Comments + documentation

Per `coding-style.md` — KDoc on every public API:

```kotlin
/**
 * Calculates the order total including taxes and discounts.
 *
 * @param order the order to total; must have at least one item
 * @return the calculated total, never negative
 * @throws CalculationException if any line item is invalid
 */
fun calculateTotal(order: Order): Money { ... }
```

## Required tooling

- **ktlint** (Pinterest's, the canonical Kotlin linter): formats +
  lints
- **detekt**: static analysis + complexity + smells (run with
  `--config detekt-strict.yml`)
- **Kotlin compiler**: `-Werror -progressive -opt-in=...`
- **Spotless / Gradle**: format-on-build

## Cross-references

- `~/.claude/rules-library/common/coding-style.md`
- `~/.claude/rules-library/kotlin/no-discards.md`
- `~/.claude/rules-library/kotlin/security.md`
- `~/.claude/rules-library/kotlin/testing.md`
- `~/.claude/rules-library/kotlin/patterns.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- Kotlin Coding Conventions (kotlinlang.org/docs/coding-conventions.html)
- Effective Kotlin (Marcin Moskała)

---

<!-- ============================================================
     Section: kotlin/hooks.md
     ============================================================ -->

# Kotlin Hooks

> Auto-fires on every `*.kt`, `*.kts`, `build.gradle.kts`,
> `settings.gradle.kts` file. Sister to `~/.claude/rules-library/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_kt=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.kts?$' || true)

if [ -n "$staged_kt" ]; then
    ./gradlew ktlintCheck detekt --daemon
fi

if git diff --cached --name-only | grep -qE '(build\.gradle\.kts|settings\.gradle\.kts|gradle\.properties)$'; then
    ./gradlew dependencyCheckAnalyze --daemon
fi
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail
./gradlew test --daemon
```

## Gradle integration

`build.gradle.kts` (top-level):

```kotlin
plugins {
    id("org.jlleitschuh.gradle.ktlint") version "12.1.0"
    id("io.gitlab.arturbosch.detekt") version "1.23.6"
    id("org.owasp.dependencycheck") version "10.0.4"
    id("jacoco")
}

tasks.register("preCommit") {
    dependsOn("ktlintCheck", "detekt")
}

tasks.named("check") {
    dependsOn("preCommit")
}

ktlint {
    version.set("1.3.1")
    enableExperimentalRules.set(true)
}

detekt {
    config.setFrom(files("$rootDir/detekt-strict.yml"))
    buildUponDefaultConfig = true
    allRules = true
}

dependencyCheck {
    failBuildOnCVSS = 7.0f
    suppressionFile = "$rootDir/dependency-check-suppressions.xml"
}

jacoco {
    toolVersion = "0.8.12"
}

tasks.test {
    finalizedBy(tasks.jacocoTestReport)
    useJUnitPlatform()
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                counter = "LINE"
                minimum = "0.80".toBigDecimal()
            }
        }
    }
}
```

## CI workflow

```yaml
name: Kotlin CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-java@<sha>
        with:
          distribution: temurin
          java-version: '21'
      - uses: gradle/actions/setup-gradle@<sha>

      - run: ./gradlew ktlintCheck
      - run: ./gradlew detekt
      - run: ./gradlew test
      - run: ./gradlew jacocoTestCoverageVerification
      - run: ./gradlew dependencyCheckAnalyze -DfailBuildOnCVSS=7

      - uses: codecov/codecov-action@<sha>
        with:
          files: build/reports/jacoco/test/jacocoTestReport.xml
```

## Android-specific hooks

```yaml
# .github/workflows/android.yml
- name: Lint
  run: ./gradlew lintRelease

- name: Build
  run: ./gradlew assembleRelease

- name: Test
  run: ./gradlew testReleaseUnitTest

- name: Connected tests (if you have an emulator)
  uses: reactivecircus/android-emulator-runner@<sha>
  with:
    api-level: 34
    script: ./gradlew connectedReleaseAndroidTest
```

## Spring Boot-specific (server)

```bash
# In production CI, also run:
./gradlew bootBuildImage          # OCI image build
./gradlew nativeCompile             # GraalVM native if applicable
```

## Cross-references

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/kotlin/no-discards.md`
- `~/.claude/rules-library/kotlin/testing.md`
- ktlint docs (pinterest.github.io/ktlint)
- detekt docs (detekt.dev)

---

<!-- ============================================================
     Section: kotlin/no-discards.md
     ============================================================ -->

# Kotlin — No-Discards Extension

> Auto-fires on every `*.kt`, `*.kts` file. Extends
> `~/.claude/rules-library/common/no-discards.md`. Tooling: **detekt**
> with full config, **ktlint --strict**, **Kotlin compiler
> -Werror -progressive**.

## Core Principle

**No `!!` force-unwrap; no broad `catch (e: Exception)`; every
nullable is narrowed; coroutines respect cancellation; `runCatching`
not used as silent-swallow; every `@Suppress` carries a
justification.**

## Banned patterns

### 1. `!!` force-unwrap

```kotlin
// FORBIDDEN
val name = user!!.name

// CORRECT
val name = user?.name ?: "Anonymous"
// or
val u = user ?: throw IllegalStateException("user must be set")
val name = u.name
```

detekt: `UnsafeCallOnNullableType`. ENFORCED.

### 2. Broad catch

```kotlin
// FORBIDDEN
try { thing() } catch (e: Exception) { ... }
try { thing() } catch (t: Throwable) { ... }

// CORRECT — specific exception types + always rethrow CancellationException
try {
    thing()
} catch (e: CancellationException) {
    throw e  // structured concurrency invariant
} catch (e: IOException) {
    logger.warn("thing failed", e)
    throw ServiceException("thing failed", e)
}
```

detekt: `TooGenericExceptionCaught`, `SwallowedException`.
ENFORCED.

### 3. `runCatching` as silent catch

```kotlin
// FORBIDDEN — drops the failure
runCatching { thing() }

// CORRECT — handle both branches
runCatching { thing() }
    .onFailure { e -> logger.warn("thing failed", e) }
    .getOrNull()
```

### 4. `@Suppress` without justification

```kotlin
// FORBIDDEN
@Suppress("UNCHECKED_CAST")
val list = raw as List<User>

// CORRECT — fix the cast
val list = raw.filterIsInstance<User>()

// CORRECT IF unavoidable — justify
// @Suppress: framework callback expects Any?; runtime type is asserted upstream
@Suppress("UNCHECKED_CAST")
val list = raw as List<User>
```

### 5. `print` / `println` in product code

```kotlin
// FORBIDDEN
println("debug: $x")

// CORRECT — SLF4J / Kotlin Logging
import io.github.oshai.kotlinlogging.KotlinLogging
private val logger = KotlinLogging.logger {}
logger.debug { "processing $x" }
```

CLI tools may use `println` for stdout (the product contract).

### 6. Mutable top-level state

```kotlin
// FORBIDDEN
var counter = 0
fun increment() { counter++ }

// CORRECT — encapsulate
object Counter {
    private val count = AtomicInteger(0)
    fun increment(): Int = count.incrementAndGet()
}
```

Per `~/.claude/rules-library/common/no-ambient-globals.md`.

### 7. `lateinit` outside DI / lifecycle frameworks

```kotlin
// FORBIDDEN in plain code
class Service {
    lateinit var client: ApiClient
}

// CORRECT — constructor injection
class Service(private val client: ApiClient) { ... }

// EXCEPTION — Android / Spring with documented lifecycle
class MyActivity : Activity() {
    private lateinit var binding: ActivityMainBinding
    override fun onCreate(savedInstanceState: Bundle?) {
        binding = ActivityMainBinding.inflate(layoutInflater)
    }
}
```

### 8. `Any` type widening

```kotlin
// FORBIDDEN
fun process(data: Any): Any = ...

// CORRECT — typed
fun process(data: UserPayload): User = ...
```

### 9. `Object.equals` / `hashCode` not overridden on value types

```kotlin
// FORBIDDEN — class used as a map key without equals/hashCode
class UserKey(val tenantId: String, val userId: String)

// CORRECT — use `data class` for value semantics
data class UserKey(val tenantId: String, val userId: String)
```

### 10. Ignored `Job` / `Deferred`

```kotlin
// FORBIDDEN — fire-and-forget loses exceptions
scope.launch { doWork() }

// CORRECT — handle errors via CoroutineExceptionHandler or supervisor
val handler = CoroutineExceptionHandler { _, e ->
    logger.error("background task failed", e)
}
scope.launch(handler) { doWork() }
```

### 11. `GlobalScope.launch`

```kotlin
// FORBIDDEN — unbounded lifetime; leaks
GlobalScope.launch { doWork() }

// CORRECT — bind to a real scope
class MyService(private val scope: CoroutineScope) {
    fun start() = scope.launch { doWork() }
}
```

detekt: `GlobalCoroutineUsage`. ENFORCED.

### 12. `Thread.sleep` in suspend functions

```kotlin
// FORBIDDEN — blocks the thread
suspend fun pollUntilReady() {
    while (!ready) {
        Thread.sleep(100)  // blocks!
    }
}

// CORRECT — use delay
suspend fun pollUntilReady() {
    while (!ready) {
        delay(100)
    }
}
```

### 13. `Random()` in production

```kotlin
// FORBIDDEN — predictable seed
val r = java.util.Random()

// CORRECT — SecureRandom for security; Random.Default for tests with seed
val secure = java.security.SecureRandom()
// or for deterministic tests
val test = kotlin.random.Random(seed = 42L)
```

## Required `detekt.yml` (strict baseline)

```yaml
build:
  maxIssues: 0

complexity:
  CognitiveComplexMethod:
    threshold: 10                # per extreme-lint-policy
  CyclomaticComplexMethod:
    threshold: 7
  LongMethod:
    threshold: 30
  LongParameterList:
    functionThreshold: 5
    constructorThreshold: 5
  TooManyFunctions:
    thresholdInClasses: 15
  LargeClass:
    threshold: 400

empty-blocks:
  EmptyCatchBlock:
    active: true
  EmptyFunctionBlock:
    active: true

exceptions:
  TooGenericExceptionCaught:
    active: true
  SwallowedException:
    active: true
    ignoredExceptionTypes:
      - InterruptedException
      - NumberFormatException
      - ParseException
      - MalformedURLException
  NotImplementedDeclaration:
    active: true
  ThrowingExceptionFromFinally:
    active: true

potential-bugs:
  UnsafeCallOnNullableType:
    active: true
  UnsafeCast:
    active: true
  NullableToStringCall:
    active: true

style:
  ForbiddenComment:
    active: true
    values: ['TODO:', 'FIXME:', 'STOPSHIP:']
  MagicNumber:
    active: true
    ignoreNumbers: ['-1', '0', '1', '2']
  ReturnCount:
    max: 3
  WildcardImport:
    active: true
  UnusedPrivateMember:
    active: true
  UnusedParameter:
    active: true

coroutines:
  GlobalCoroutineUsage:
    active: true
  RedundantSuspendModifier:
    active: true
  SuspendFunWithFlowReturnType:
    active: true
```

## Verification block

```
Kotlin sweep (this turn):
  - ktlint -F: clean
  - detekt --config detekt-strict.yml: 0 issues
  - kotlinc -Werror -progressive: 0 warnings
  - gradle test: PASS (coverage 91%)
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- `~/.claude/rules-library/common/error-handling-with-context.md`
- `~/.claude/rules-library/kotlin/coding-style.md`
- `~/.claude/rules-library/kotlin/patterns.md`
- detekt rules: detekt.dev/docs/rules/
- Effective Kotlin (Marcin Moskała)

---

<!-- ============================================================
     Section: kotlin/patterns.md
     ============================================================ -->

# Kotlin Patterns

> Auto-fires on every `*.kt`, `*.kts` file. Standards: **Effective
> Kotlin (Marcin Moskała)**, **Spring Boot 3.x reference**, **Ktor
> docs**, **Android Architecture Components**, **Jetpack Compose
> guidelines**.

## Core Principle

**Hexagonal-style layering for server (domain at the centre);
MVI / unidirectional data flow for UI; data classes for value
carriers; sealed classes for closed states; sealed result types
for explicit success/failure; coroutines + Flow for async
streams; DI via constructor injection (Hilt / Koin / manual).**

## Layered architecture (Spring Boot / Ktor)

```
com.example.app/
├── domain/               # Pure Kotlin, no framework deps
│   ├── Order.kt
│   ├── OrderRepository.kt
│   └── OrderService.kt
├── application/          # Use cases — orchestrate domain
│   └── PlaceOrderUseCase.kt
├── infrastructure/
│   ├── persistence/
│   │   ├── JpaOrderRepository.kt
│   │   └── OrderEntity.kt
│   ├── web/
│   │   ├── OrderController.kt
│   │   └── OrderRequest.kt
│   └── external/
│       └── PaymentClient.kt
└── config/               # Spring / Koin module wiring
    └── Beans.kt
```

Domain depends on NOTHING. Application on domain. Infrastructure
on both.

## Result types (explicit success / failure)

```kotlin
sealed interface Result<out T, out E> {
    data class Success<T>(val value: T) : Result<T, Nothing>
    data class Failure<E>(val error: E) : Result<Nothing, E>
}

inline fun <T, E, R> Result<T, E>.map(transform: (T) -> R): Result<R, E> =
    when (this) {
        is Result.Success -> Result.Success(transform(value))
        is Result.Failure -> this
    }

inline fun <T, E, R> Result<T, E>.flatMap(transform: (T) -> Result<R, E>): Result<R, E> =
    when (this) {
        is Result.Success -> transform(value)
        is Result.Failure -> this
    }
```

Or use the stdlib `Result<T>` with care (it doesn't capture the
error type at compile time).

## Builder vs DSL

```kotlin
// Builder for many-optional params; data class with defaults usually wins
data class OrderQuery(
    val customerId: UserId? = null,
    val status: OrderStatus? = null,
    val from: Instant? = null,
    val to: Instant? = null,
)

// DSL for declarative configurations
val server = embeddedServer(Netty, port = 8080) {
    routing {
        get("/orders") {
            call.respond(orders)
        }
    }
}
```

## Dependency injection (constructor)

```kotlin
// CORRECT — constructor injection, immutable
@Service
class OrderService(
    private val repo: OrderRepository,
    private val payment: PaymentClient,
    private val clock: Clock,
)

// WRONG — field injection (untestable, mutable)
@Service
class OrderService {
    @Autowired lateinit var repo: OrderRepository
}
```

For Android: prefer Hilt (DI via `@Inject` constructor) or Koin
(KMP-friendly).

## Coroutines + Flow

```kotlin
// Flow for streams of values
fun orderUpdates(orderId: OrderId): Flow<OrderUpdate> = flow {
    while (currentCoroutineContext().isActive) {
        emit(fetchUpdate(orderId))
        delay(1.seconds)
    }
}

// Hot vs cold — StateFlow / SharedFlow for hot
class OrderViewModel {
    private val _state = MutableStateFlow<OrderState>(OrderState.Loading)
    val state: StateFlow<OrderState> = _state.asStateFlow()
}
```

## MVI for UI (Compose / Android)

```kotlin
sealed interface OrderIntent {
    data class Load(val id: OrderId) : OrderIntent
    data object Refresh : OrderIntent
    data object Submit : OrderIntent
}

sealed interface OrderState {
    data object Loading : OrderState
    data class Loaded(val order: Order) : OrderState
    data class Error(val message: String) : OrderState
}

class OrderViewModel : ViewModel() {
    private val _state = MutableStateFlow<OrderState>(OrderState.Loading)
    val state: StateFlow<OrderState> = _state.asStateFlow()

    fun onIntent(intent: OrderIntent) = when (intent) {
        is OrderIntent.Load -> load(intent.id)
        OrderIntent.Refresh -> refresh()
        OrderIntent.Submit -> submit()
    }

    private fun load(id: OrderId) = viewModelScope.launch {
        _state.value = OrderState.Loading
        _state.value = try {
            OrderState.Loaded(repo.find(id))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            OrderState.Error(e.message ?: "unknown")
        }
    }
}
```

## Inline classes (value classes)

```kotlin
@JvmInline
value class UserId(val value: String)

@JvmInline
value class Cents(val value: Long)

// At runtime: just a String / Long — no boxing
// At compile time: strongly typed
fun charge(amount: Cents, user: UserId) { ... }
```

## Common pitfalls

| Pitfall | Fix |
| --- | --- |
| `data class` with `var` properties | Use `val`; copy() instead of mutation |
| `companion object` for static utilities | Use top-level functions |
| `object` for singletons + state | Inject via DI |
| `lateinit` outside framework lifecycle | Constructor inject |
| Mutable `Collection` exposed publicly | Expose `List<X>` (read-only view) |
| Returning `T?` when failure has meaning | Use `Result<T, E>` |

## Reuse-first

- Server: Spring Boot, Ktor, Vert.x
- DI: Hilt (Android), Koin (KMP), Spring (server)
- HTTP client: Ktor Client, OkHttp + Retrofit
- DB: Spring Data, Exposed (Kotlin-native), JOOQ
- Serialisation: kotlinx.serialization
- Date / time: kotlinx-datetime
- Logging: KotlinLogging (over SLF4J)
- Tests: JUnit 5 + MockK + Kotest

Per `~/.claude/rules-library/common/reuse-first.md`.

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/common/reuse-first.md`
- `~/.claude/rules-library/kotlin/coding-style.md`
- `~/.claude/rules-library/common/no-ambient-globals.md`
- Effective Kotlin (Moskała)
- Spring Boot Reference (when Spring)
- Jetpack Compose docs (when Android)

---

<!-- ============================================================
     Section: kotlin/security.md
     ============================================================ -->

# Kotlin Security

> Auto-fires on every `*.kt`, `*.kts`, `build.gradle.kts` file.
> Sister to `~/.claude/rules-library/common/security.md`. Standards:
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

Per `~/.claude/rules-library/common/secrets-management.md`.

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

- `~/.claude/rules-library/common/security.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/kotlin/no-discards.md`
- `~/.claude/rules-library/kotlin/coding-style.md`
- OWASP Mobile Top 10 (owasp.org/www-project-mobile-top-10/)
- Spring Security Reference (when Spring)
- Android Security Best Practices (developer.android.com/topic/security)

---

<!-- ============================================================
     Section: kotlin/testing.md
     ============================================================ -->

# Kotlin Testing

> Auto-fires on every `*Test.kt`, `*Spec.kt`, `src/test/**`,
> `src/androidTest/**` file. Sister to `~/.claude/rules-library/common/testing.md`.
> Standards: **JUnit 5 (Jupiter)**, **Kotest**, **MockK**,
> **AssertJ / Strikt**, **Testcontainers**, **Coroutines-Test**,
> **Compose UI Test** (Android), **Roborazzi / Paparazzi**
> (Android snapshots).

## Core Principle

**JUnit 5 + Kotest are both acceptable; pick ONE per project and
stick. MockK for mocks (Mockito doesn't speak Kotlin's
final-by-default well); Testcontainers for real-DB integration;
`runTest` for coroutine tests with virtual time; coverage ≥ 90%
on touched files (per `extreme-lint-policy.md`).**

## Test pyramid

| Layer | Tool | Scope |
| --- | --- | --- |
| Unit | JUnit 5 / Kotest + MockK | One class, mocked deps |
| Integration | JUnit 5 + Testcontainers + Spring Boot Test | Service + real Postgres / Kafka / Redis |
| Contract | Pact | Producer / consumer schema |
| UI (Android) | Compose UI Test / Espresso | Per-screen interactions |
| Snapshot (Android) | Roborazzi / Paparazzi | Visual regression |
| E2E (Android) | UI Automator | Cross-app flows |
| Property | Kotest property testing | Invariants |

## JUnit 5 + MockK idioms

```kotlin
@ExtendWith(MockKExtension::class)
class OrderServiceTest {
    @MockK lateinit var repo: OrderRepository
    @MockK(relaxUnitFun = true) lateinit var payment: PaymentClient
    @InjectMockKs lateinit var service: OrderService

    @Test
    fun `placing an order charges and persists`() {
        val order = order(total = 5000)
        every { payment.charge(any()) } returns PaymentResult.Success("ch_123")

        service.place(order)

        verify(exactly = 1) { repo.save(match { it.status == Status.PAID }) }
        verify(exactly = 1) { payment.charge(order.total) }
    }
}
```

## Kotest idioms (alternative)

```kotlin
class OrderSpec : StringSpec({
    "zero items totals to zero" {
        val order = Order(items = emptyList())
        order.total shouldBe Money.ZERO
    }

    "sums prices across items" {
        val order = Order(items = listOf(item(100), item(200)))
        order.total shouldBe Money.cents(300)
    }
})
```

## Parameterised tests (JUnit 5)

```kotlin
@ParameterizedTest
@CsvSource(
    "0,    USD, 0",
    "100,  USD, 100",
    "1000, USD, 1000"
)
fun `total matches input`(amount: Long, currency: String, expected: Long) {
    val order = Order(items = listOf(LineItem(amount, Currency.valueOf(currency))))
    Order.calculator.totalOf(order).amountCents shouldBe expected
}

@ParameterizedTest
@MethodSource("invalidInputs")
fun `rejects invalid input`(input: String) {
    shouldThrow<ValidationException> { validate(input) }
}
companion object {
    @JvmStatic
    fun invalidInputs() = listOf("", " ", "a".repeat(1000))
}
```

## Coroutine testing

```kotlin
import kotlinx.coroutines.test.runTest

class AsyncServiceTest {
    @Test
    fun `concurrent fetches succeed`() = runTest {
        val service = AsyncService(dispatcher = testScheduler)
        val results = service.fetchAll(listOf(1, 2, 3))
        results shouldHaveSize 3
    }
}
```

`runTest` provides virtual time; `delay(1.hours)` returns
immediately for testing.

## Testcontainers integration

```kotlin
@Testcontainers
@SpringBootTest
class OrderIntegrationTest {
    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine").apply {
            withDatabaseName("test")
            withUsername("test")
            withPassword("test")
        }

        @DynamicPropertySource
        @JvmStatic
        fun configure(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }

    @Test
    fun `round-trips an order`() { ... }
}
```

NO H2 substitute for PostgreSQL — dialect differences produce
false positives + negatives.

## Property tests (Kotest)

```kotlin
import io.kotest.property.checkAll

class CalculatorPropertyTest : StringSpec({
    "total is non-negative for non-negative prices" {
        checkAll(Arb.list(Arb.long(0..1_000_000), 0..100)) { prices ->
            val items = prices.map { LineItem(it, Currency.USD) }
            calculator.totalOf(Order(items)).amountCents shouldBeGreaterThanOrEqual 0
        }
    }
})
```

## Android UI tests (Compose)

```kotlin
@get:Rule
val composeTestRule = createComposeRule()

@Test
fun `submit button triggers callback`() {
    var clicked = false
    composeTestRule.setContent {
        OrderForm(onSubmit = { clicked = true })
    }
    composeTestRule.onNodeWithText("Submit").performClick()
    clicked shouldBe true
}
```

## Hard rules

### 1. No flaky time

```kotlin
// FORBIDDEN
Thread.sleep(1000)
assertTrue(condition)

// CORRECT — Awaitility
await().atMost(5, SECONDS).untilAsserted {
    repo.findById(id).shouldNotBeNull()
}
```

### 2. Clock / RNG injection

Per `~/.claude/rules-library/common/no-ambient-globals.md` — inject
`Clock` + `Random`.

### 3. Coverage gates

```kotlin
// build.gradle.kts
tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                counter = "LINE"
                minimum = "0.80".toBigDecimal()
            }
            limit {
                counter = "BRANCH"
                minimum = "0.75".toBigDecimal()
            }
        }
    }
}
```

Touched-file coverage ≥ 90% per `extreme-lint-policy.md`.

### 4. Test naming as behaviour

```kotlin
// WRONG
@Test fun test1() { ... }
@Test fun `calculate total`() { ... }

// RIGHT — describe expectation
@Test fun `total is zero for empty order`() { ... }
@Test fun `total adds tax when tax-rate is positive`() { ... }
```

Kotlin's backtick-quoted function names make this natural.

### 5. No `runBlocking` in test bodies

```kotlin
// FORBIDDEN — couples to real clock
@Test
fun foo() = runBlocking {
    val r = svc.work()
    r shouldBe ...
}

// CORRECT — runTest with virtual time
@Test
fun foo() = runTest {
    val r = svc.work()
    r shouldBe ...
}
```

## Cross-references

- `~/.claude/rules-library/common/testing.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules-library/kotlin/coding-style.md`
- `~/.claude/rules-library/common/no-ambient-globals.md`
- JUnit 5 User Guide
- Kotest documentation (kotest.io)
- MockK documentation (mockk.io)
- Testcontainers for JVM

---
