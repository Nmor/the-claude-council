# Java Testing

> Auto-fires on every `*Test.java`, `*Tests.java`, `*IT.java`, `*Spec.java`
> file. Sister to `~/.claude/rules/common/testing.md`. Standards:
> **JUnit 5 (Jupiter)**, **AssertJ**, **Mockito 5**, **Testcontainers**,
> **Spring Boot Test**, **JaCoCo**.

## Core Principle

**JUnit 5 with parameterized tests for every input space; AssertJ
for readable assertions; Mockito for unit-level fakes;
Testcontainers for integration tests against real services; no
flaky / time-dependent / order-dependent tests; coverage ≥ 90% on
touched files (per `extreme-lint-policy.md`).**

## Test pyramid (Java)

| Layer | Tool | Scope |
| --- | --- | --- |
| Unit | JUnit 5 + Mockito | Single class, mocked deps |
| Integration | JUnit 5 + Spring Boot Test + Testcontainers | Service + real DB / queue / Redis |
| Contract | Pact (CDC) | Producer + consumer agreement |
| E2E | RestAssured / Selenium / Playwright | Full system, real network |
| Performance | JMeter / Gatling | Load / stress |
| Mutation | PIT (pitest) | Tests' ability to detect mutations |

## Hard rules

### 1. Use JUnit 5, not 4

```java
// CORRECT
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;

@DisplayName("Order calculation")
class OrderCalculationTest {
    @Test
    @DisplayName("zero items totals to zero")
    void zeroItemsTotalsToZero() {
        var order = new Order(List.of(), Money.ZERO);
        assertThat(calculator.totalOf(order)).isEqualTo(Money.ZERO);
    }
}
```

### 2. AssertJ over Hamcrest / JUnit assertions

```java
// WRONG — Hamcrest
assertThat(list, hasItems("a", "b"));

// CORRECT — AssertJ (fluent, chainable, rich)
assertThat(list)
    .hasSize(2)
    .contains("a", "b")
    .doesNotContain("c");

// Object assertions
assertThat(user)
    .extracting(User::email, User::name)
    .containsExactly("alice@example.com", "Alice");
```

### 3. Parameterized tests for input coverage

```java
@ParameterizedTest
@CsvSource({
    "0,    USD, 0",
    "100,  USD, 100",
    "1000, USD, 1000"
})
void totalMatchesInput(long amount, String currency, long expected) {
    var order = new Order(List.of(new LineItem(amount, Currency.valueOf(currency))));
    assertThat(calculator.totalOf(order).amountCents()).isEqualTo(expected);
}

@ParameterizedTest
@MethodSource("invalidInputs")
void rejectsInvalidInput(String input) {
    assertThatThrownBy(() -> validator.validate(input))
        .isInstanceOf(ValidationException.class);
}
static Stream<String> invalidInputs() {
    return Stream.of("", " ", null, "a".repeat(1000));
}
```

### 4. Mockito for unit-test fakes

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock OrderRepository repo;
    @Mock PaymentClient payment;
    @InjectMocks OrderService service;

    @Test
    void placeOrderChargesAndPersists() {
        var order = new Order(...);
        when(payment.charge(any())).thenReturn(PaymentResult.success("ch_123"));

        service.place(order);

        verify(repo).save(argThat(o -> o.status() == Status.PAID));
        verify(payment).charge(order.total());
    }
}
```

NO `Mockito.spy()` on production code — use real instances or
test doubles.

### 5. Testcontainers for integration

```java
@Testcontainers
@SpringBootTest
class OrderIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("test")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void roundtripsOrder() { ... }
}
```

NO H2 / HSQLDB substitute for PostgreSQL — different SQL
dialects produce false positives + negatives.

### 6. No flaky tests

- No `Thread.sleep()` — use `Awaitility`:
  ```java
  await().atMost(5, SECONDS).untilAsserted(() ->
      assertThat(repo.findById(id)).isPresent());
  ```
- No real-clock dependencies — inject `Clock` (per `no-ambient-globals.md`)
- No order-dependent tests; assume random execution order
- Mark known-flaky tests with `@Disabled("CI-flaky: ticket #...")`
  with a fix deadline

### 7. Coverage gates

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <executions>
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>check</id>
            <goals><goal>check</goal></goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit><counter>LINE</counter><minimum>0.80</minimum></limit>
                            <limit><counter>BRANCH</counter><minimum>0.75</minimum></limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

Touched-file coverage ≥ 90% per `extreme-lint-policy.md`.

### 8. Mutation testing for critical paths

```bash
mvn org.pitest:pitest-maven:mutationCoverage
```

PIT mutates code (boolean flips, conditional swaps); tests must
DETECT the mutations. Coverage ≥ 80% mutation score on
business-logic packages.

### 9. Test naming conveys behaviour

```java
// WRONG — describes the method
@Test void test1() { ... }
@Test void calculateTotal() { ... }

// RIGHT — describes the EXPECTATION
@Test void totalReturnsZeroForEmptyOrder() { ... }
@Test void totalAddsTaxOnTaxableItems() { ... }
@Test void totalThrowsWhenLineItemIsInvalid() { ... }
```

Per `~/.claude/rules/golang/no-discards.md` S100-equivalent —
the test name IS documentation.

### 10. Test resources separate from production

`src/test/resources/` (Maven layout) holds test fixtures + test
configuration. NEVER `src/main/resources` with a "skip in test"
profile.

## Cross-references

- `~/.claude/rules/common/testing.md` — universal baseline
- `~/.claude/rules/common/extreme-lint-policy.md` — coverage
  thresholds
- `~/.claude/rules/java/coding-style.md` — naming
- `~/.claude/rules/common/no-ambient-globals.md` — inject Clock /
  RNG
- `~/.claude/rules/common/contract-testing.md` — Pact for Java
- JUnit 5 User Guide
- AssertJ documentation
- Testcontainers documentation
