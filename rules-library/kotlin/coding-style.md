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

- `~/.claude/rules/common/coding-style.md`
- `~/.claude/rules/kotlin/no-discards.md`
- `~/.claude/rules/kotlin/security.md`
- `~/.claude/rules/kotlin/testing.md`
- `~/.claude/rules/kotlin/patterns.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- Kotlin Coding Conventions (kotlinlang.org/docs/coding-conventions.html)
- Effective Kotlin (Marcin Moskała)
