# Kotlin Testing

> Auto-fires on every `*Test.kt`, `*Spec.kt`, `src/test/**`,
> `src/androidTest/**` file. Sister to `~/.claude/rules/common/testing.md`.
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

Per `~/.claude/rules/common/no-ambient-globals.md` — inject
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

- `~/.claude/rules/common/testing.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- `~/.claude/rules/kotlin/coding-style.md`
- `~/.claude/rules/common/no-ambient-globals.md`
- JUnit 5 User Guide
- Kotest documentation (kotest.io)
- MockK documentation (mockk.io)
- Testcontainers for JVM
