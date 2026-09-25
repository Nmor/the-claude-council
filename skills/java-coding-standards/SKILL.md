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

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check

Standards for readable, maintainable Java (17+) code in Spring Boot services.

## When to Activate

- Writing or reviewing Java code in Spring Boot projects
- Enforcing naming, immutability, or exception handling conventions
- Working with records, sealed classes, or pattern matching (Java 17+)
- Reviewing use of Optional, streams, or generics
- Structuring packages and project layout

## Reference map

This skill is `paths:`-gated, so whatever it carries is added to the always-on
context Floor in full whenever a Java or build file is touched. The detail
therefore lives in `references/`; read the row you need, not the whole set.

| Topic | Read |
| --- | --- |
| Core language standards — naming, immutability, `Optional`, streams, exceptions, generics, project layout, formatting, code smells, logging, null handling, testing expectations | `references/core-standards.md` |
| Coding style (full rule) — naming + structure, immutability, null safety, modern collections / streams, file organisation, comments, required tooling | `references/coding-style.md` |
| Hooks + build gates — pre-commit / pre-push gates, Maven lifecycle, Gradle equivalent, CI workflow shape | `references/hooks-and-gates.md` |
| No-discards (banned patterns) — the 15 banned patterns, required tooling, verification block | `references/no-discards.md` |
| Architecture patterns — layered Spring Boot, records, sealed types, builders, constructor DI, exception handling, WebFlux, reuse-first | `references/patterns.md` |
| Security — OWASP Top 10 Java specifics (A01–A10), Spring Security baseline, secrets, required tooling | `references/security.md` |
| Testing — the Java test pyramid + 10 hard rules (JUnit 5, AssertJ, parameterized, Mockito, Testcontainers, flakiness, coverage gates, mutation testing, naming, test resources) | `references/testing.md` |

## Purpose

Principal-level Java language idioms (Java 21 LTS): records for value types, sealed interfaces +
pattern matching, Optional usage rules, immutability discipline, streams + collectors, null-safety
annotations, exception hierarchy, modern concurrency (virtual threads, structured concurrency).

**Negative scope** (NOT what this skill covers):

- Spring Boot framework patterns — see `springboot-patterns`
- JPA / persistence — see `jpa-patterns`
- Spring Security — see `springboot-patterns`
- Build pipeline + verification — see `springboot-testing`
- Generic code-quality (cyclomatic, naming, dead-code) — see `coding-quality-rules`

## When NOT to use

- Kotlin / Scala projects (use language-native idioms)
- Pre-Java-11 codebases (some idioms regress; defer to per-version guidance)
- Android (Java + framework constraints; see Kotlin coding skills instead)

## Standards Cited

- **Java Language Specification (Java SE 21)** (`docs.oracle.com/javase/specs/jls/se21/html/`) —
  language semantics
- **Effective Java 3e (Joshua Bloch, 2018)** — 90 items, canonical reference
- **Java API Specification (Java 21)** (`docs.oracle.com/en/java/javase/21/docs/api/`) — JDK
  reference
- **JEP 395 (Records)** + **JEP 409 (Sealed Classes)** + **JEP 440 (Record Patterns)** + **JEP 444
  (Virtual Threads)** + **JEP 453 (Structured Concurrency)** — modern feature specs
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
- `~/.claude/skills/springboot-patterns/SKILL.md` — security
- `~/.claude/skills/springboot-testing/SKILL.md` — testing
- `~/.claude/skills/jpa-patterns/SKILL.md` — persistence
- `~/.claude/skills/coding-quality-rules/SKILL.md` — cross-language baseline
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI patterns
- `~/.claude/rules-library/common/error-handling-with-context.md` — wrap with cause
- `~/.claude/agents/code-reviewer.md` — Java code review delegate

## Why this skill exists

Java 21 LTS introduced records, sealed types, pattern matching, and virtual threads — but most Java
code in production still uses Java-8 idioms (Optional misuse, `new Date()`, raw OS threads, mutable
returned collections). The patterns above codify the modern Java baseline so new code benefits from
records / virtual threads / sealed types while staying compatible with mainstream Spring / Hibernate
/ Maven ecosystems. The cost is one read of Effective Java; the benefit is code that passes a 2026
senior Java review without effort.

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
- New cross-reference when a sister skill (springboot-patterns, jpa-patterns, java/no-discards) adds
  a related pattern
- Tightening of the immutability / `final` policy when a recurring mutation incident emerges
- New API-design row when a recurring shape question arises (e.g., builder vs constructor for ≥ 5
  params)

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: ~/.claude/rules-library/java/
     ============================================================ -->

## Migrated rules (rules-library/java/, 2026-06-02)

Phase H will delete the source files at `rules-library/java/`. Content below preserves the original
rule bodies for lazy-load via the `paths:` glob above.

Those bodies now live under `references/` (the `coding-style`, `hooks-and-gates`,
`no-discards`, `patterns`, `security`, and `testing` rows of the reference map
above), byte-for-byte as migrated.
