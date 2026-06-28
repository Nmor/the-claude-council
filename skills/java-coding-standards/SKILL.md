---
name: java-coding-standards
description: "Java coding standards for Spring Boot services: naming, immutability, Optional usage, streams, exceptions, generics, and project layout."
paths:
  - "**/*.java"
  - "pom.xml"
  - "**/pom.xml"
  - "**/*.gradle"
  - "**/*.gradle.kts"
  - "build.gradle"
  - "build.gradle.kts"
---

# Java Coding Standards

Standards for readable, maintainable Java (17+) code in Spring Boot services.

## When to Activate

- Writing or reviewing Java code in Spring Boot projects
- Enforcing naming, immutability, or exception handling conventions
- Working with records, sealed classes, or pattern matching (Java 17+)
- Reviewing use of Optional, streams, or generics
- Structuring packages and project layout

## Core Principles

- Prefer clarity over cleverness
- Immutable by default; minimize shared mutable state
- Fail fast with meaningful exceptions
- Consistent naming and package structure

## Naming

```java
// ✅ Classes/Records: PascalCase
public class MarketService {}
public record Money(BigDecimal amount, Currency currency) {}

// ✅ Methods/fields: camelCase
private final MarketRepository marketRepository;
public Market findBySlug(String slug) {}

// ✅ Constants: UPPER_SNAKE_CASE
private static final int MAX_PAGE_SIZE = 100;
```

## Immutability

```java
// ✅ Favor records and final fields
public record MarketDto(Long id, String name, MarketStatus status) {}

public class Market {
  private final Long id;
  private final String name;
  // getters only, no setters
}
```

## Optional Usage

```java
// ✅ Return Optional from find* methods
Optional<Market> market = marketRepository.findBySlug(slug);

// ✅ Map/flatMap instead of get()
return market
    .map(MarketResponse::from)
    .orElseThrow(() -> new EntityNotFoundException("Market not found"));
```

## Streams Best Practices

```java
// ✅ Use streams for transformations, keep pipelines short
List<String> names = markets.stream()
    .map(Market::name)
    .filter(Objects::nonNull)
    .toList();

// ❌ Avoid complex nested streams; prefer loops for clarity
```

## Exceptions

- Use unchecked exceptions for domain errors; wrap technical exceptions with context
- Create domain-specific exceptions (e.g., `MarketNotFoundException`)
- Avoid broad `catch (Exception ex)` unless rethrowing/logging centrally

```java
throw new MarketNotFoundException(slug);
```

## Generics and Type Safety

- Avoid raw types; declare generic parameters
- Prefer bounded generics for reusable utilities

```java
public <T extends Identifiable> Map<Long, T> indexById(Collection<T> items) { ... }
```

## Project Structure (Maven/Gradle)

```text
src/main/java/com/example/app/
  config/
  controller/
  service/
  repository/
  domain/
  dto/
  util/
src/main/resources/
  application.yml
src/test/java/... (mirrors main)
```

## Formatting and Style

- Use 2 or 4 spaces consistently (project standard)
- One public top-level type per file
- Keep methods short and focused; extract helpers
- Order members: constants, fields, constructors, public methods, protected, private

## Code Smells to Avoid

- Long parameter lists → use DTO/builders
- Deep nesting → early returns
- Magic numbers → named constants
- Static mutable state → prefer dependency injection
- Silent catch blocks → log and act or rethrow

## Logging

```java
private static final Logger log = LoggerFactory.getLogger(MarketService.class);
log.info("fetch_market slug={}", slug);
log.error("failed_fetch_market slug={}", slug, ex);
```

## Null Handling

- Accept `@Nullable` only when unavoidable; otherwise use `@NonNull`
- Use Bean Validation (`@NotNull`, `@NotBlank`) on inputs

## Testing Expectations

- JUnit 5 + AssertJ for fluent assertions
- Mockito for mocking; avoid partial mocks where possible
- Favor deterministic tests; no hidden sleeps

**Remember**: Keep code intentional, typed, and observable. Optimize for maintainability over micro-optimizations unless proven necessary.

## Purpose

Principal-level Java language idioms (Java 21 LTS): records for value types, sealed interfaces + pattern matching, Optional usage rules, immutability discipline, streams + collectors, null-safety annotations, exception hierarchy, modern concurrency (virtual threads, structured concurrency).

**Negative scope** (NOT what this skill covers):

- Spring Boot framework patterns — see `springboot-patterns`
- JPA / persistence — see `jpa-patterns`
- Spring Security — see `springboot-security`
- Build pipeline + verification — see `springboot-verification`
- Generic code-quality (cyclomatic, naming, dead-code) — see `coding-standards`

## When NOT to use

- Kotlin / Scala projects (use language-native idioms)
- Pre-Java-11 codebases (some idioms regress; defer to per-version guidance)
- Android (Java + framework constraints; see Kotlin coding skills instead)

## Standards Cited

- **Java Language Specification (Java SE 21)** (`docs.oracle.com/javase/specs/jls/se21/html/`) — language semantics
- **Effective Java 3e (Joshua Bloch, 2018)** — 90 items, canonical reference
- **Java API Specification (Java 21)** (`docs.oracle.com/en/java/javase/21/docs/api/`) — JDK reference
- **JEP 395 (Records)** + **JEP 409 (Sealed Classes)** + **JEP 440 (Record Patterns)** + **JEP 444 (Virtual Threads)** + **JEP 453 (Structured Concurrency)** — modern feature specs
- **Google Java Style Guide** (`google.github.io/styleguide/javaguide.html`) — formatting + naming
- **JSR 305 (Nullness Annotations)** — `@Nullable`, `@Nonnull` semantics
- **Checker Framework Manual** — gradual nullness checking
- **OWASP ASVS 4.0.3 §5** — input validation + encoding

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `Optional<T>` as field or method parameter | Optional is for return types only (per Bloch Item 55) | Use nullable field + `@Nullable` annotation; OR pass a sentinel / overload |
| `null` returned where empty collection works | Caller must null-check before iterating | Return `Collections.emptyList()` / `List.of()` |
| Mutable `List` returned from getter | Caller can corrupt internal state | Return `List.copyOf()` (Java 10+) or `Collections.unmodifiableList()` |
| `catch (Exception e)` | Swallows runtime + checked alike, often loses context | Catch the specific checked type; let runtime propagate or wrap with cause |
| Static utility class with public constructor | Allows instantiation of utility-only class | Mark `final` + add `private` constructor that throws `AssertionError` |
| String concatenation in loops | Quadratic allocation | `StringBuilder` OR `String.join` OR `Collectors.joining` |
| `==` for object equality | Reference identity, not value | `Objects.equals(a, b)` |
| Raw types (`List` vs `List<String>`) | Defeats type system; runtime ClassCastException | Always parameterise generics |
| `new Date()` / `Calendar` | Pre-Java-8 API; mutable + timezone footguns | `java.time.Instant`, `LocalDate`, `ZonedDateTime` |
| `Thread t = new Thread(...)` | Pre-Java-21; doesn't scale, no virtual-thread benefits | `Thread.ofVirtual().start(...)` or `ExecutorService.newVirtualThreadPerTaskExecutor()` |

## Verification Checklist

- [ ] Records used for value carriers; classes only when behaviour / inheritance needed
- [ ] Sealed interfaces + pattern matching for closed-set hierarchies
- [ ] `Optional` only on return types; never field or parameter
- [ ] Collections returned via `List.copyOf` / `Collections.unmodifiable*`
- [ ] Specific exception types caught; no `catch (Exception)` without rationale
- [ ] `java.time.*` for all date/time (no `Date`, `Calendar`, `SimpleDateFormat`)
- [ ] `Objects.equals` / `Objects.hash` instead of `==` / `hashCode` reinventions
- [ ] Virtual threads for I/O-bound concurrency (Java 21+)
- [ ] `@Nullable` / `@NonNull` annotations at public-API boundaries
- [ ] Static-analysis clean: SpotBugs, ErrorProne, NullAway

## Cross-References

- `~/.claude/skills/springboot-patterns/SKILL.md` — Spring Boot framework
- `~/.claude/skills/springboot-security/SKILL.md` — security
- `~/.claude/skills/springboot-tdd/SKILL.md` — testing
- `~/.claude/skills/jpa-patterns/SKILL.md` — persistence
- `~/.claude/skills/coding-standards/SKILL.md` — cross-language baseline
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI patterns
- `~/.claude/rules-library/common/error-handling-with-context.md` — wrap with cause
- `~/.claude/agents/code-reviewer.md` — Java code review delegate

## Why this skill exists

Java 21 LTS introduced records, sealed types, pattern matching, and virtual threads — but most Java code in production still uses Java-8 idioms (Optional misuse, `new Date()`, raw OS threads, mutable returned collections). The patterns above codify the modern Java baseline so new code benefits from records / virtual threads / sealed types while staying compatible with mainstream Spring / Hibernate / Maven ecosystems. The cost is one read of Effective Java; the benefit is code that passes a 2026 senior Java review without effort.

## Compliance & Standards Mapping

- **ISO/IEC 25010:2011 §6** — Product quality model (Functional
  Suitability, Reliability, Performance Efficiency, Usability,
  Security, Maintainability, Portability, Compatibility)
- **ISO/IEC/IEEE 12207:2017 §6.4** — Software construction +
  verification + validation processes
- **NIST SP 800-218 SSDF §PW** — Produce Well-Secured Software
  (applies to every code-authoring skill)
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing +
  evaluation
- **OWASP ASVS 4.0.3 §V1.1** — Secure SDLC requirements
- **OWASP ASVS 4.0.3 §V14.2** — Dependency lifecycle
- **CWE Top 25 (2026)** — Weakness classes the patterns in this
  skill prevent
- **SLSA Framework v1.0 Build L2+** — Provenance + integrity

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `Optional` field on entity instead of method return (Optional misuse)
- Returning `null` from collection-returning method (caller-must-null-check anti-pattern)
- `var` overuse hiding non-obvious type (style drift)
- Mutable static field without `final` (thread-safety + global state anti-pattern)
- `synchronized` on `this` / class literal instead of dedicated lock object
- `Thread.sleep` outside test code (use scheduler or `Duration.ofSeconds`)
- Date-time using `java.util.Date` / `Calendar` instead of `java.time` (legacy API)
- Equals / hashCode broken (one overridden but not the other) — `record` ideal
- `String.format` for SQL (per `~/.claude/rules-library/java/security.md`)
- Checked-exception wrapping `RuntimeException` (Exception-translation anti-pattern)
- `@SuppressWarnings("unchecked")` without justification

**Refinement candidates**:

- New Java-version row when JDK ships new feature (sealed records, pattern matching for switch)
- New cross-reference when a sister skill (springboot-patterns, jpa-patterns, java/no-discards) adds a related pattern
- Tightening of the immutability / `final` policy when a recurring mutation incident emerges
- New API-design row when a recurring shape question arises (e.g., builder vs constructor for ≥ 5 params)

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: ~/.claude/rules-library/java/
     ============================================================ -->

## Migrated rules (rules-library/java/, 2026-06-02)

Phase H will delete the source files at `rules-library/java/`. Content below preserves the original rule bodies for lazy-load via the `paths:` glob above.

---

<!-- ============================================================
     Section: java/coding-style.md
     ============================================================ -->

# Java Coding Style

> Auto-fires on every `*.java`, `pom.xml`, `*.gradle`, `*.gradle.kts`
> file. Standards: **Oracle Java SE 21 spec**, **Google Java Style
> Guide**, **Effective Java 3e (Bloch)**, **JSR-305** (nullability
> annotations), **PMD**, **Checkstyle**, **SpotBugs**, **ErrorProne**.

## Core Principle

**Modern Java (17+, prefer 21 LTS) idioms only. Immutability by
default (records, `final` everywhere); explicit nullability with
`Optional` + JSR-305 annotations; streams + functional patterns;
sealed types over `instanceof` chains; pattern matching where
applicable.**

## Naming + structure

```java
// Class: PascalCase, noun
public final class PaymentProcessor { ... }

// Method: camelCase, verb + noun
public Money calculateTotal(Order order) { ... }

// Variable: camelCase
String userEmail = ...;

// Constant: SCREAMING_SNAKE_CASE
public static final int MAX_RETRIES = 3;

// Package: lowercase.dotted
package com.example.payments;

// Record: immutable data carrier
public record Money(long amountCents, Currency currency) {
    public Money {
        if (amountCents < 0) throw new IllegalArgumentException("negative amount");
        Objects.requireNonNull(currency);
    }
}
```

## Immutability

- Prefer `record` for data carriers (Java 16+)
- `final` on every field that can be `final`
- `final` on every local variable that doesn't reassign
- Defensive copy when accepting / returning collections:
  `List.copyOf(input)` (Java 10+) or `Collections.unmodifiableList`
- Use `List.of` / `Map.of` / `Set.of` factories for immutable
  literals

```java
public record Order(
    String id,
    List<LineItem> items,
    Money total
) {
    public Order {
        items = List.copyOf(items);  // defensive
    }
}
```

## Null safety

```java
// WRONG — possibly-null returned without signal
public User findUser(String id) { ... }

// RIGHT — Optional signals possibility
public Optional<User> findUser(String id) { ... }

// Caller pattern
findUser(id).ifPresentOrElse(
    user -> render(user),
    () -> renderNotFound()
);

// Annotations on parameters that MUST NOT be null
public void processOrder(@NonNull Order order) { ... }
```

JSR-305 (`@Nullable`, `@NonNull`, `@CheckForNull`) at every API
boundary; tooling (ErrorProne, NullAway) enforces.

## Modern collections / streams

```java
// Stream pipeline
var totalRevenue = orders.stream()
    .filter(o -> o.status() == Status.PAID)
    .map(Order::total)
    .reduce(Money.ZERO, Money::plus);

// Collectors
var byCustomer = orders.stream()
    .collect(Collectors.groupingBy(Order::customerId));

// Switch expression (Java 14+)
return switch (status) {
    case PENDING -> "Pending";
    case PAID -> "Paid";
    case CANCELLED -> "Cancelled";
};

// Pattern matching for instanceof (Java 16+)
if (obj instanceof Customer customer && customer.isActive()) {
    return customer.name();
}

// Sealed types (Java 17+)
public sealed interface Event permits OrderEvent, PaymentEvent, RefundEvent {}
```

## File organisation

- One top-level public class per `.java` file (compiler enforces)
- Package structure mirrors logical organisation
- Imports: explicit (no `import com.example.*`); ordered (java →
  jakarta → javax → org → com → static)
- File length ≤ 500 lines per `extreme-lint-policy.md`

## Comments

Per `coding-style.md` — comments explain WHY when non-obvious.
Banned in comments: linter rule IDs, ticket numbers,
"legacy"/"new" framing, suppression directives.

Required Javadoc on every public type + method:

```java
/**
 * Calculates the order total including taxes and discounts.
 *
 * @param order the order, must not be null
 * @return the calculated total, never null
 * @throws CalculationException if any line item is invalid
 */
public Money calculateTotal(Order order) { ... }
```

## Required tooling

- Maven: `mvn verify` runs Checkstyle + PMD + SpotBugs + tests
- Gradle: equivalent via `gradle-spotbugs-plugin`, `gradle-pmd-plugin`,
  Checkstyle plugin
- ErrorProne + NullAway: compile-time bug-class checks
- Modernizer-maven-plugin: flags pre-Java-9 idioms

## Cross-references

- `~/.claude/rules-library/common/coding-style.md` — universal baseline
- `~/.claude/rules-library/java/no-discards.md` — banned patterns
- `~/.claude/rules-library/java/security.md` — Spring Security + OWASP
- `~/.claude/rules-library/java/testing.md` — JUnit 5 + Mockito + Testcontainers
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict gates
- Effective Java (Joshua Bloch, 3rd edition)
- Google Java Style Guide

---

<!-- ============================================================
     Section: java/hooks.md
     ============================================================ -->

# Java Hooks

> Auto-fires on every `*.java`, `pom.xml`, `build.gradle`,
> `build.gradle.kts` file. Sister to `~/.claude/rules-library/common/hooks.md`.

## Pre-commit / pre-push gates (mandatory)

Every Java repo's `.githooks/pre-commit` (or `pre-push`) runs:

```bash
#!/usr/bin/env bash
set -euo pipefail

mvn -B -q -Dgib.enabled=true \
    verify \
    spotbugs:check \
    pmd:check \
    checkstyle:check \
    dependency-check:check
```

Same gates run in CI; CI is the authoritative checkpoint.

## Maven lifecycle integration

Pin gates into `mvn verify` (so `mvn install` triggers them):

```xml
<plugin>
    <artifactId>maven-enforcer-plugin</artifactId>
    <executions>
        <execution>
            <id>enforce-versions</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <requireMavenVersion><version>[3.9.0,)</version></requireMavenVersion>
                    <requireJavaVersion><version>[21,)</version></requireJavaVersion>
                    <bannedDependencies>
                        <excludes>
                            <exclude>commons-logging:commons-logging</exclude>
                            <exclude>log4j:log4j:[1.0,2.0)</exclude>
                        </excludes>
                    </bannedDependencies>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

## Gradle equivalent

```kotlin
tasks.register("preCommit") {
    dependsOn("check", "spotbugsMain", "pmdMain", "dependencyCheckAnalyze")
}

tasks.named("build") {
    dependsOn("preCommit")
}
```

## CI workflow shape

```yaml
- name: Setup JDK
  uses: actions/setup-java@<sha>
  with:
    distribution: temurin
    java-version: 21
    cache: maven

- name: Build + verify
  run: mvn -B verify

- name: Coverage gate (JaCoCo)
  run: mvn -B jacoco:check

- name: Security scan
  run: |
    mvn org.owasp:dependency-check-maven:check \
      -DfailBuildOnCVSS=7

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@<sha>
```

## Cross-references

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/java/no-discards.md`
- `~/.claude/rules-library/java/testing.md`

---

<!-- ============================================================
     Section: java/no-discards.md
     ============================================================ -->

# Java — No-Discards Extension

> Auto-fires on every `*.java` file. Extends
> `~/.claude/rules-library/common/no-discards.md`. Tooling: ErrorProne,
> SpotBugs, PMD, Checkstyle, NullAway, SonarJava.

## Core Principle

**Every checked exception is handled or declared; every `Future`
is `.get()`-ed or composed; every `try-with-resources` wraps an
AutoCloseable; nullability is annotated and verified by NullAway;
ignored return values are flagged by `@CheckReturnValue` +
ErrorProne; no `e.printStackTrace()`.**

## Banned patterns

### 1. Empty catch

```java
// FORBIDDEN
try { thing(); } catch (Exception e) { }

// CORRECT
try {
    thing();
} catch (IOException e) {
    log.warn("thing failed", e);
    throw new ServiceException("thing failed", e);
}
```

SpotBugs: `DE_MIGHT_IGNORE`. PMD: `EmptyCatchBlock`.

### 2. `e.printStackTrace()` in production

```java
// FORBIDDEN
} catch (Exception e) {
    e.printStackTrace();
}

// CORRECT
} catch (Exception e) {
    log.error("operation failed", e);
    throw new ServiceException("operation failed", e);
}
```

### 3. Catching `Throwable` / `Error`

```java
// FORBIDDEN — Error includes OutOfMemoryError, StackOverflowError; let JVM die
try { thing(); } catch (Throwable t) { ... }

// CORRECT — catch specific exception types
try { thing(); } catch (IOException | TimeoutException e) { ... }
```

### 4. Bare `throw new RuntimeException(...)`

```java
// FORBIDDEN — generic; no specificity
throw new RuntimeException("user not found");

// CORRECT — specific
throw new UserNotFoundException(userId);
```

### 5. Resource not in try-with-resources

```java
// FORBIDDEN — leak on exception
InputStream in = new FileInputStream(path);
return in.read();  // no close

// CORRECT
try (InputStream in = new FileInputStream(path)) {
    return in.read();
}
```

SpotBugs: `RR_NOT_CHECKED`. PMD: `CloseResource`.

### 6. Returning `null` from collection-returning methods

```java
// FORBIDDEN — caller must null-check; ergonomic disaster
public List<Order> findOrders(...) {
    if (notFound) return null;
    return list;
}

// CORRECT — return empty collection
public List<Order> findOrders(...) {
    if (notFound) return List.of();
    return list;
}
```

### 7. Mutable static state

```java
// FORBIDDEN
public class Cache {
    public static final Map<String, User> USERS = new HashMap<>();
}

// CORRECT — encapsulated, concurrent-safe
public class UserCache {
    private final Map<String, User> users = new ConcurrentHashMap<>();
    // ... DI-injected, scoped lifecycle
}
```

Per `~/.claude/rules-library/common/no-ambient-globals.md`.

### 8. `==` for object comparison

```java
// FORBIDDEN — reference equality
if (a == b) ...
if (status == Status.ACTIVE) ...  // enum is OK; String is NOT

// CORRECT
if (Objects.equals(a, b)) ...
if ("active".equals(status)) ...
if (status == Status.ACTIVE) ...  // enum — OK
```

### 9. `Optional.get()` without `isPresent()` check

```java
// FORBIDDEN
return findUser(id).get();   // throws NoSuchElementException if empty

// CORRECT
return findUser(id).orElseThrow(() ->
    new UserNotFoundException(id));

// OR
return findUser(id)
    .map(this::process)
    .orElse(defaultValue);
```

### 10. `String.format` for SQL

Per `~/.claude/rules-library/java/security.md` § A03.

### 11. `Date` / `Calendar` (legacy)

```java
// FORBIDDEN — mutable, not thread-safe
Date now = new Date();
SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");

// CORRECT — java.time
Instant now = Instant.now();
LocalDate today = LocalDate.now();
DateTimeFormatter fmt = DateTimeFormatter.ISO_DATE;
```

### 12. `@SuppressWarnings("unchecked")` without justification

```java
// FORBIDDEN — silences without fixing
@SuppressWarnings("unchecked")
List<User> users = (List<User>) raw;

// CORRECT — fix the type
List<User> users = repo.findAll();  // properly typed all the way
```

### 13. `synchronized` on `this` / class literal

```java
// FORBIDDEN — exposes lock; external code can lock it
public synchronized void operation() { ... }

// CORRECT — private lock object
private final Object lock = new Object();
public void operation() {
    synchronized (lock) { ... }
}

// BETTER — prefer java.util.concurrent
private final ReentrantLock lock = new ReentrantLock();
```

### 14. `Thread.sleep()` in tests / production logic

```java
// FORBIDDEN — flaky
Thread.sleep(1000);
assertTrue(condition);

// CORRECT — Awaitility
await().atMost(5, SECONDS).until(() -> condition);
```

### 15. Discarded `Future` / `CompletableFuture`

```java
// FORBIDDEN
executor.submit(() -> doWork());

// CORRECT
CompletableFuture<Void> future = CompletableFuture
    .runAsync(this::doWork, executor)
    .exceptionally(t -> {
        log.error("doWork failed", t);
        return null;
    });
// Hold the future + .join() at appropriate point
```

ErrorProne: `FutureReturnValueIgnored`.

## Required tooling

```xml
<!-- ErrorProne in Maven -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <compilerArgs>
            <arg>-XDcompilePolicy=simple</arg>
            <arg>-Xplugin:ErrorProne -Xep:NullAway:ERROR -XepOpt:NullAway:AnnotatedPackages=com.example</arg>
        </compilerArgs>
        <annotationProcessorPaths>
            <path>
                <groupId>com.google.errorprone</groupId>
                <artifactId>error_prone_core</artifactId>
            </path>
            <path>
                <groupId>com.uber.nullaway</groupId>
                <artifactId>nullaway</artifactId>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>

<!-- SpotBugs + FindSecBugs -->
<plugin>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs-maven-plugin</artifactId>
    <configuration>
        <effort>Max</effort>
        <threshold>Low</threshold>
        <failOnError>true</failOnError>
        <plugins>
            <plugin>
                <groupId>com.h3xstream.findsecbugs</groupId>
                <artifactId>findsecbugs-plugin</artifactId>
            </plugin>
        </plugins>
    </configuration>
</plugin>
```

## Verification block

```text
Java build (this turn):
  - mvn verify: 0 warnings, 0 errors
  - ErrorProne (with NullAway): 0 issues
  - SpotBugs (Max effort): 0 bugs
  - PMD: 0 violations
  - Checkstyle: 0 violations
  - JaCoCo coverage: 92% line / 85% branch
  - SonarJava: 0 issues
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- `~/.claude/rules-library/common/error-handling-with-context.md`
- `~/.claude/rules-library/java/coding-style.md`
- `~/.claude/rules-library/java/security.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`

---

<!-- ============================================================
     Section: java/patterns.md
     ============================================================ -->

# Java Patterns

> Auto-fires on every `*.java` file. Standards: **Effective Java
> 3e**, **Spring Boot 3.x reference**, **Microservices patterns
> (Richardson)**, **DDD (Evans)**, **Clean Architecture (Martin)**.

## Core Principle

**Architecture follows hexagonal / clean conventions: domain at
the centre with no infrastructure dependencies; adapters at the
boundary; Spring's DI wires the layers. Records for value
objects; sealed types for closed hierarchies; streams over
imperative loops.**

## Layered architecture (Spring Boot)

```text
com.example.app/
├── App.java                          # @SpringBootApplication
├── domain/                           # Business logic — pure Java; no Spring
│   ├── Order.java                    # Entity / Aggregate
│   ├── Money.java                    # Value object (record)
│   ├── OrderRepository.java          # Interface (port)
│   └── OrderService.java             # Domain service
├── application/                      # Use cases — orchestrate domain
│   ├── PlaceOrderUseCase.java
│   └── dto/
├── infrastructure/                   # Adapters — Spring + frameworks
│   ├── persistence/
│   │   ├── JpaOrderRepository.java   # Implements domain port
│   │   └── OrderEntity.java          # JPA entity
│   ├── web/
│   │   ├── OrderController.java      # REST adapter
│   │   └── OrderRequest.java         # DTO
│   ├── messaging/
│   │   └── OrderEventPublisher.java
│   └── external/
│       └── PaymentClient.java
└── config/                           # Spring configuration
    └── BeansConfig.java
```

Domain depends on NOTHING. Application depends on domain.
Infrastructure depends on application + domain. NEVER the reverse.

## Records for value objects

```java
public record Money(long amountCents, Currency currency)
    implements Comparable<Money> {

    public static final Money ZERO = new Money(0, Currency.USD);

    public Money {
        if (amountCents < 0) {
            throw new IllegalArgumentException("amount must be non-negative");
        }
        Objects.requireNonNull(currency);
    }

    public Money plus(Money other) {
        if (currency != other.currency) {
            throw new IllegalArgumentException("currency mismatch");
        }
        return new Money(amountCents + other.amountCents, currency);
    }

    @Override
    public int compareTo(Money other) {
        if (currency != other.currency) {
            throw new IllegalArgumentException("currency mismatch");
        }
        return Long.compare(amountCents, other.amountCents);
    }
}
```

## Sealed types for closed hierarchies

```java
public sealed interface OrderEvent
    permits OrderPlaced, OrderPaid, OrderShipped, OrderCancelled {}

public record OrderPlaced(String orderId, Money total) implements OrderEvent {}
public record OrderPaid(String orderId, String chargeId) implements OrderEvent {}
public record OrderShipped(String orderId, String trackingNumber) implements OrderEvent {}
public record OrderCancelled(String orderId, String reason) implements OrderEvent {}

// Exhaustive switch — compiler enforces
public String describe(OrderEvent event) {
    return switch (event) {
        case OrderPlaced p -> "Placed: " + p.orderId();
        case OrderPaid p -> "Paid: " + p.chargeId();
        case OrderShipped s -> "Shipped: " + s.trackingNumber();
        case OrderCancelled c -> "Cancelled: " + c.reason();
    };
}
```

## Builder pattern (when records aren't enough)

```java
public final class OrderQuery {
    private final String customerId;
    private final Status status;
    private final LocalDate from;
    private final LocalDate to;

    private OrderQuery(Builder b) { ... }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {
        private String customerId;
        private Status status;
        private LocalDate from;
        private LocalDate to;

        public Builder customerId(String id) { this.customerId = id; return this; }
        public Builder status(Status s) { this.status = s; return this; }
        public Builder dateRange(LocalDate from, LocalDate to) {
            this.from = from; this.to = to; return this;
        }
        public OrderQuery build() { return new OrderQuery(this); }
    }
}
```

## Dependency injection (constructor only)

```java
// CORRECT — constructor injection, immutable
@Service
public class OrderService {
    private final OrderRepository repo;
    private final PaymentClient payment;
    private final Clock clock;

    public OrderService(OrderRepository repo, PaymentClient payment, Clock clock) {
        this.repo = repo;
        this.payment = payment;
        this.clock = clock;
    }
}

// WRONG — field injection (untestable, mutable, hidden deps)
@Service
public class OrderService {
    @Autowired private OrderRepository repo;
    @Autowired private PaymentClient payment;
}
```

## Exception handling (per `error-handling-with-context.md`)

```java
// Domain-specific exception with context
public class OrderNotFoundException extends DomainException {
    private final String orderId;

    public OrderNotFoundException(String orderId) {
        super("order not found: " + orderId);
        this.orderId = orderId;
    }

    public String orderId() { return orderId; }
}

// Centralised handler maps to HTTP
@ControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<ErrorResponse> handle(OrderNotFoundException e) {
        log.warn("order not found", kv("order_id", e.orderId()));
        return ResponseEntity.status(404).body(new ErrorResponse(
            "order_not_found",
            e.getMessage(),
            Map.of("order_id", e.orderId())));
    }
}
```

## Reactive (Spring WebFlux) — when to use

- High-concurrency I/O-bound workloads (chat, streaming, SSE)
- Long-lived connections
- Event-driven pipelines (RxJava / Project Reactor)

When NOT:

- CPU-bound workloads
- Existing code that's all sync (rewriting hurts more than helps)
- Team unfamiliar with reactive semantics (the debugging cost is
  real)

## Common framework patterns

| Framework | When |
| --- | --- |
| Spring Boot | Most server apps |
| Quarkus | Native-image / GraalVM, fast startup |
| Micronaut | Same niche as Quarkus |
| Helidon | Oracle-native, MicroProfile |
| Vert.x | Reactive, event-loop |
| Plain Java | Libraries, CLI tools, small services |

## Reuse-first (per `~/.claude/rules-library/common/reuse-first.md`)

- Maven Central / mvnrepository.com before writing your own
- Apache Commons + Google Guava cover utilities
- Spring's `RestTemplate` / `WebClient` over hand-rolled HTTP
- Jackson over hand-rolled JSON parsing

## Cross-references

- `~/.claude/rules-library/common/patterns.md` — universal baseline
- `~/.claude/rules-library/common/reuse-first.md`
- `~/.claude/rules-library/java/coding-style.md`
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI patterns
- Effective Java (Bloch)
- Spring Boot Reference
- Microservices Patterns (Richardson)

---

<!-- ============================================================
     Section: java/security.md
     ============================================================ -->

# Java Security

> Auto-fires on every `*.java`, `pom.xml`, `*.gradle` file. Sister
> to `~/.claude/rules-library/common/security.md`. Standards: **OWASP
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
  `~/.claude/rules-library/common/idempotency.md`)

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
  `~/.claude/rules-library/common/dependency-vulnerabilities.md`
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

Per `~/.claude/rules-library/common/rate-limiting.md`.

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
// Audit log per ~/.claude/rules-library/common/audit-logging.md
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
- Per `~/.claude/rules-library/common/secrets-management.md`

## Required tooling

```bash
mvn verify                          # runs tests + checks
mvn dependency-check:aggregate      # OWASP Dependency Check
mvn spotbugs:check                  # SpotBugs static analysis
mvn pmd:check pmd:cpd-check         # PMD + copy-paste detector
mvn checkstyle:check                # style + many security rules
```

## Cross-references

- `~/.claude/rules-library/common/security.md` — universal baseline
- `~/.claude/rules-library/java/no-discards.md` — banned patterns
- `~/.claude/rules-library/java/coding-style.md` — naming + structure
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — CVE
  gate
- OWASP Java Cheat Sheet Series
- Spring Security 6 Reference
- CERT Oracle Coding Standard for Java

---

<!-- ============================================================
     Section: java/testing.md
     ============================================================ -->

# Java Testing

> Auto-fires on every `*Test.java`, `*Tests.java`, `*IT.java`, `*Spec.java`
> file. Sister to `~/.claude/rules-library/common/testing.md`. Standards:
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

Per `~/.claude/rules-library/golang/no-discards.md` S100-equivalent —
the test name IS documentation.

### 10. Test resources separate from production

`src/test/resources/` (Maven layout) holds test fixtures + test
configuration. NEVER `src/main/resources` with a "skip in test"
profile.

## Cross-references

- `~/.claude/rules-library/common/testing.md` — universal baseline
- `~/.claude/rules-library/common/extreme-lint-policy.md` — coverage
  thresholds
- `~/.claude/rules-library/java/coding-style.md` — naming
- `~/.claude/rules-library/common/no-ambient-globals.md` — inject Clock /
  RNG
- `~/.claude/rules-library/common/contract-testing.md` — Pact for Java
- JUnit 5 User Guide
- AssertJ documentation
- Testcontainers documentation

---
