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

```text
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

Per `~/.claude/rules/common/reuse-first.md`.

## Cross-references

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/common/reuse-first.md`
- `~/.claude/rules/kotlin/coding-style.md`
- `~/.claude/rules/common/no-ambient-globals.md`
- Effective Kotlin (Moskała)
- Spring Boot Reference (when Spring)
- Jetpack Compose docs (when Android)
