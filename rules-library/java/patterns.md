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

## Reuse-first (per `~/.claude/rules/common/reuse-first.md`)

- Maven Central / mvnrepository.com before writing your own
- Apache Commons + Google Guava cover utilities
- Spring's `RestTemplate` / `WebClient` over hand-rolled HTTP
- Jackson over hand-rolled JSON parsing

## Cross-references

- `~/.claude/rules/common/patterns.md` — universal baseline
- `~/.claude/rules/common/reuse-first.md`
- `~/.claude/rules/java/coding-style.md`
- `~/.claude/rules/common/no-ambient-globals.md` — DI patterns
- Effective Java (Bloch)
- Spring Boot Reference
- Microservices Patterns (Richardson)
