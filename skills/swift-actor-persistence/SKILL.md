---
name: swift-actor-persistence
description: Thread-safe data persistence in Swift using actors — in-memory cache with file-backed storage, eliminating data races by design.
paths:
  - "**/*.swift"
  - "Package.swift"
  - "**/Package.swift"
  - "**/Package.resolved"
---

# Swift Actors for Thread-Safe Persistence

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check

Patterns for building thread-safe data persistence layers using Swift actors. Combines in-memory
caching with file-backed storage, leveraging the actor model to eliminate data races at compile
time.

## When to Activate

- Building a data persistence layer in Swift 5.5+
- Need thread-safe access to shared mutable state
- Want to eliminate manual synchronization (locks, DispatchQueues)
- Building offline-first apps with local storage

## Purpose

Principal-level Swift concurrency + persistence: `actor` for thread-safe shared state, `Sendable`
conformance, structured concurrency via `async`/`await` + `TaskGroup`, persistence via Core Data /
SwiftData / SQLite under actor isolation, cancellation propagation.

**Negative scope** (NOT what this skill covers):

- Generic Swift idioms — see `coding-quality-rules`
- Protocol-based DI + test doubles — see `swift-protocol-di-testing`
- iOS-specific UI patterns — out of scope here
- Cross-platform Swift Server (Vapor) patterns — defer to project-specific

## Standards Cited

- **Swift Language Reference (5.10 / 6.0)** (`docs.swift.org/swift-book/`) — concurrency model
- **Swift Evolution SE-0306 (Actors)** + **SE-0302 (Sendable)** + **SE-0337 (Sendable strict)** +
  **SE-0401 (Remove preconcurrency)** — formal specs
- **WWDC 2021–2024 Concurrency sessions** — Apple's canonical guidance
- **Core Data Reference** + **SwiftData Reference** — persistence APIs
- **Effective Swift** (community-canonical patterns)
- **OWASP Mobile Top 10 M2 (Insecure Data Storage)** — persistence security
- **Compliance mapping** (`references/concurrency-standards.md`): ISO/IEC 25010:2011,
  ISO/IEC/IEEE 12207:2017, NIST SP 800-218 SSDF, NIST SP 800-53 Rev 5, OWASP ASVS 4.0.3,
  CWE Top 25, SLSA Framework v1.0

## When NOT to use

- Single-threaded scripts (actor overhead unnecessary)
- Read-only configuration (use immutable struct)
- Legacy Objective-C-bridged code that can't adopt Sendable

## Routing table

The detail lives in `references/`. Read the row that matches the work; do not load the rest.

| Topic | Reference |
| --- | --- |
| **Actor-based repository — the core pattern**: `LocalRepository` actor, usage, `@Observable` ViewModel, key design decisions, best practices, anti-patterns to avoid, when to use | [`references/actor-repository.md`](references/actor-repository.md) |
| **Anti-patterns, verification checklist**: the concurrency + Core Data anti-pattern table, the verification checklist, cross-references, why this skill exists, compliance mapping, learning hooks | [`references/concurrency-standards.md`](references/concurrency-standards.md) |
| **Swift coding style**: naming, immutability, typed error handling, SwiftUI, concurrency conventions | [`references/coding-style.md`](references/coding-style.md) |
| **Hooks, CI + tooling config**: pre-commit / pre-push gates, GitHub Actions workflow, required tools, `.swiftformat`, strict `Package.swift` baseline, `.xcconfig` hardening, SwiftPM dependency hygiene, pre-deployment iOS checklist | [`references/hooks-and-ci.md`](references/hooks-and-ci.md) |
| **No-discards — banned patterns + SwiftLint config**: force-unwrap, `try!`, empty catch, ignored results, `@discardableResult`, implicitly unwrapped optionals, `Any` returns, `print`, unremoved observers, retain cycles, required `.swiftlint.yml`, verification block | [`references/no-discards.md`](references/no-discards.md) |
| **Swift patterns — architecture + concurrency + SwiftUI**: project layout, value types, `Sendable` + `actor`, `async let` / `TaskGroup`, protocols with associated types, `Result`, SwiftUI, DI, Combine vs AsyncSequence, reuse-first libraries | [`references/patterns.md`](references/patterns.md) |
| **Swift security**: Keychain, App Transport Security, input validation, biometric auth | [`references/security.md`](references/security.md) |
| **Swift testing**: 70% coverage floor, Swift Testing (`@Test` / `#expect`), protocol-based mocking | [`references/testing.md`](references/testing.md) |

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: ~/.claude/rules-library/swift/
     ============================================================ -->

## Migrated rules (rules-library/swift/, 2026-06-02)

Phase H will delete the source files at `rules-library/swift/`. Content below preserves the original
rule bodies for lazy-load via the `paths:` glob above.

Those rule bodies now live in `references/` — the routing table above names the file for each.
