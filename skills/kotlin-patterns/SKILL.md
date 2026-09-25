---
name: kotlin-patterns
description: Kotlin 2.0+ discipline — null safety (no !! force-unwrap; safe call + Elvis), immutability (val over var; data class + copy), sealed classes for closed hierarchies, scope functions (let/run/apply/also/with) used purposefully, structured concurrency via coroutines (no GlobalScope.launch; supervisor scopes + Job cancellation), CoroutineExceptionHandler for unhandled errors, ktlint + detekt at strict ruleset, expression bodies for one-liners, KDoc on public API. Auto-fires on Kotlin source.
paths:
  - "**/*.kt"
  - "**/*.kts"
  - "build.gradle.kts"
  - "settings.gradle.kts"
  - "**/build.gradle.kts"
---

# kotlin-patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules-library/kotlin/` as part of the lazy-rules-loading plan.
> Phase H will delete the source files.

## Purpose

Kotlin 2.0+ discipline for any `*.kt` / `*.kts` / Gradle-Kotlin-DSL file: null
safety, immutability, sealed hierarchies, structured concurrency, strict
ktlint + detekt, and the security / testing / CI gates that go with them.

This file is a ROUTING TABLE. It is `paths:`-gated, so it is added to the
always-on Floor in full every time one of its globs matches — the detail
therefore lives in `references/`, and you read only the row you need.

## Reference map

| Topic | Read | It holds |
| --- | --- | --- |
| **Coding style** | [`references/coding-style.md`](references/coding-style.md) | Naming · null safety (no `!!`) · immutability (`val`, `data class`, `copy()`) · sealed classes · scope-function table (`let`/`run`/`apply`/`also`/`with`) · expression bodies · coroutine basics · file length · KDoc · ktlint/detekt/compiler flags |
| **No-discards + detekt baseline** | [`references/no-discards.md`](references/no-discards.md) | The 13 banned patterns with detekt rule names · the strict `detekt.yml` (complexity, empty-blocks, exceptions, potential-bugs, style, coroutines) · the Kotlin sweep verification block |
| **Architecture patterns** | [`references/patterns.md`](references/patterns.md) | Hexagonal layering (Spring Boot / Ktor) · `Result<T, E>` types · builder vs DSL · constructor DI · Flow / StateFlow · MVI for Compose · `@JvmInline value class` · common-pitfalls table · reuse-first library shortlist |
| **Security** | [`references/security.md`](references/security.md) | OWASP A02/A03/A05/A07/A09/A10 in Kotlin · Spring Security 6 filter chain · Android network-security config, secrets, Lint checks · server + mobile secret storage · tooling commands |
| **Testing** | [`references/testing.md`](references/testing.md) | Test pyramid · JUnit 5 + MockK · Kotest · parameterised tests · `runTest` virtual time · Testcontainers (no H2) · property tests · Compose UI tests · five hard rules incl. coverage gates |
| **Hooks, Gradle + CI** | [`references/hooks-and-ci.md`](references/hooks-and-ci.md) | `.githooks/pre-commit` + `pre-push` · `build.gradle.kts` wiring for ktlint / detekt / dependency-check / jacoco · GitHub Actions workflow · Android + Spring Boot additions |

## Fast path

Writing or reviewing Kotlin source → **Coding style** + **No-discards**.
Designing a service or screen → **Architecture patterns**. Touching auth,
crypto, HTTP egress or secrets → **Security**. Writing tests or a coverage
gate → **Testing**. Touching `build.gradle.kts`, a git hook or CI →
**Hooks, Gradle + CI**.
