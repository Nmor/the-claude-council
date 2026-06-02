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

- `~/.claude/rules/common/coding-style.md` — universal baseline
- `~/.claude/rules/java/no-discards.md` — banned patterns
- `~/.claude/rules/java/security.md` — Spring Security + OWASP
- `~/.claude/rules/java/testing.md` — JUnit 5 + Mockito + Testcontainers
- `~/.claude/rules/common/extreme-lint-policy.md` — strict gates
- Effective Java (Joshua Bloch, 3rd edition)
- Google Java Style Guide
