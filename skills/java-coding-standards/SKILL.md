---
name: java-coding-standards
description: "Java coding standards for Spring Boot services: naming, immutability, Optional usage, streams, exceptions, generics, and project layout."
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

```
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
- `~/.claude/rules/common/no-ambient-globals.md` — DI patterns
- `~/.claude/rules/common/error-handling-with-context.md` — wrap with cause
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
- `String.format` for SQL (per `~/.claude/rules/java/security.md`)
- Checked-exception wrapping `RuntimeException` (Exception-translation anti-pattern)
- `@SuppressWarnings("unchecked")` without justification

**Refinement candidates**:
- New Java-version row when JDK ships new feature (sealed records, pattern matching for switch)
- New cross-reference when a sister skill (springboot-patterns, jpa-patterns, java/no-discards) adds a related pattern
- Tightening of the immutability / `final` policy when a recurring mutation incident emerges
- New API-design row when a recurring shape question arises (e.g., builder vs constructor for ≥ 5 params)
