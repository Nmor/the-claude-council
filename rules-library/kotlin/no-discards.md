# Kotlin — No-Discards Extension

> Auto-fires on every `*.kt`, `*.kts` file. Extends
> `~/.claude/rules/common/no-discards.md`. Tooling: **detekt**
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

Per `~/.claude/rules/common/no-ambient-globals.md`.

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

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- `~/.claude/rules/common/error-handling-with-context.md`
- `~/.claude/rules/kotlin/coding-style.md`
- `~/.claude/rules/kotlin/patterns.md`
- detekt rules: detekt.dev/docs/rules/
- Effective Kotlin (Marcin Moskała)
