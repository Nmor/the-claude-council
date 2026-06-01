---
name: swift-actor-persistence
description: Thread-safe data persistence in Swift using actors — in-memory cache with file-backed storage, eliminating data races by design.
---

# Swift Actors for Thread-Safe Persistence

Patterns for building thread-safe data persistence layers using Swift actors. Combines in-memory caching with file-backed storage, leveraging the actor model to eliminate data races at compile time.

## When to Activate

- Building a data persistence layer in Swift 5.5+
- Need thread-safe access to shared mutable state
- Want to eliminate manual synchronization (locks, DispatchQueues)
- Building offline-first apps with local storage

## Core Pattern

### Actor-Based Repository

The actor model guarantees serialized access — no data races, enforced by the compiler.

```swift
public actor LocalRepository<T: Codable & Identifiable> where T.ID == String {
    private var cache: [String: T] = [:]
    private let fileURL: URL

    public init(directory: URL = .documentsDirectory, filename: String = "data.json") {
        self.fileURL = directory.appendingPathComponent(filename)
        // Synchronous load during init (actor isolation not yet active)
        self.cache = Self.loadSynchronously(from: fileURL)
    }

    // MARK: - Public API

    public func save(_ item: T) throws {
        cache[item.id] = item
        try persistToFile()
    }

    public func delete(_ id: String) throws {
        cache[id] = nil
        try persistToFile()
    }

    public func find(by id: String) -> T? {
        cache[id]
    }

    public func loadAll() -> [T] {
        Array(cache.values)
    }

    // MARK: - Private

    private func persistToFile() throws {
        let data = try JSONEncoder().encode(Array(cache.values))
        try data.write(to: fileURL, options: .atomic)
    }

    private static func loadSynchronously(from url: URL) -> [String: T] {
        guard let data = try? Data(contentsOf: url),
              let items = try? JSONDecoder().decode([T].self, from: data) else {
            return [:]
        }
        return Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })
    }
}
```

### Usage

All calls are automatically async due to actor isolation:

```swift
let repository = LocalRepository<Question>()

// Read — fast O(1) lookup from in-memory cache
let question = await repository.find(by: "q-001")
let allQuestions = await repository.loadAll()

// Write — updates cache and persists to file atomically
try await repository.save(newQuestion)
try await repository.delete("q-001")
```

### Combining with @Observable ViewModel

```swift
@Observable
final class QuestionListViewModel {
    private(set) var questions: [Question] = []
    private let repository: LocalRepository<Question>

    init(repository: LocalRepository<Question> = LocalRepository()) {
        self.repository = repository
    }

    func load() async {
        questions = await repository.loadAll()
    }

    func add(_ question: Question) async throws {
        try await repository.save(question)
        questions = await repository.loadAll()
    }
}
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Actor (not class + lock) | Compiler-enforced thread safety, no manual synchronization |
| In-memory cache + file persistence | Fast reads from cache, durable writes to disk |
| Synchronous init loading | Avoids async initialization complexity |
| Dictionary keyed by ID | O(1) lookups by identifier |
| Generic over `Codable & Identifiable` | Reusable across any model type |
| Atomic file writes (`.atomic`) | Prevents partial writes on crash |

## Best Practices

- **Use `Sendable` types** for all data crossing actor boundaries
- **Keep the actor's public API minimal** — only expose domain operations, not persistence details
- **Use `.atomic` writes** to prevent data corruption if the app crashes mid-write
- **Load synchronously in `init`** — async initializers add complexity with minimal benefit for local files
- **Combine with `@Observable`** ViewModels for reactive UI updates

## Anti-Patterns to Avoid

- Using `DispatchQueue` or `NSLock` instead of actors for new Swift concurrency code
- Exposing the internal cache dictionary to external callers
- Making the file URL configurable without validation
- Forgetting that all actor method calls are `await` — callers must handle async context
- Using `nonisolated` to bypass actor isolation (defeats the purpose)

## When to Use

- Local data storage in iOS/macOS apps (user data, settings, cached content)
- Offline-first architectures that sync to a server later
- Any shared mutable state that multiple parts of the app access concurrently
- Replacing legacy `DispatchQueue`-based thread safety with modern Swift concurrency

## Purpose

Principal-level Swift concurrency + persistence: `actor` for thread-safe shared state, `Sendable` conformance, structured concurrency via `async`/`await` + `TaskGroup`, persistence via Core Data / SwiftData / SQLite under actor isolation, cancellation propagation.

**Negative scope** (NOT what this skill covers):
- Generic Swift idioms — see `coding-standards`
- Protocol-based DI + test doubles — see `swift-protocol-di-testing`
- iOS-specific UI patterns — out of scope here
- Cross-platform Swift Server (Vapor) patterns — defer to project-specific

## When NOT to use

- Single-threaded scripts (actor overhead unnecessary)
- Read-only configuration (use immutable struct)
- Legacy Objective-C-bridged code that can't adopt Sendable

## Standards Cited

- **Swift Language Reference (5.10 / 6.0)** (`docs.swift.org/swift-book/`) — concurrency model
- **Swift Evolution SE-0306 (Actors)** + **SE-0302 (Sendable)** + **SE-0337 (Sendable strict)** + **SE-0401 (Remove preconcurrency)** — formal specs
- **WWDC 2021–2024 Concurrency sessions** — Apple's canonical guidance
- **Core Data Reference** + **SwiftData Reference** — persistence APIs
- **Effective Swift** (community-canonical patterns)
- **OWASP Mobile Top 10 M2 (Insecure Data Storage)** — persistence security

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Shared mutable class without actor | Data race UB | `actor` for shared mutable; `Sendable` + immutable for shared read-only |
| `nonisolated` to bypass actor | Defeats isolation | If sync access needed, model as immutable data passed across boundary |
| `await` inside `actor`-isolated function that re-enters self | Reentrancy reveals partial state | Design for reentrancy OR use serial executor + explicit sync state |
| `Task { ... }` without cancellation handling | Leak; runaway tasks | Use `task` modifier in SwiftUI OR explicit `Task` stored + cancelled on deinit |
| `DispatchQueue.main.async { ... }` from `actor` | Mixing GCD + actors | `await MainActor.run { ... }` |
| Core Data without `viewContext` / `newBackgroundContext()` split | Main-thread DB writes | Read via `viewContext`; write via background context; merge via notification |
| `try?` on Core Data save | Silent persistence failure | `try ctx.save()` with explicit error handling |
| Force-unwrap optional fetched from Core Data | Crash on schema-drift | `guard let` + reset / migration path |

## Verification Checklist

- [ ] All shared mutable state in `actor` types
- [ ] `Sendable` conformance on every type crossing actor boundaries
- [ ] `Strict Concurrency Checking` build setting = "Complete"
- [ ] Core Data writes on background context; reads on viewContext
- [ ] Persistence errors handled (no `try?` on save)
- [ ] Task lifecycle managed (cancellation on deinit / view disappear)
- [ ] `MainActor` annotation on UI-touching code
- [ ] Migration plan for schema changes (Core Data lightweight migration OR custom)
- [ ] Tests use deterministic actor harness (no real-time sleeps)

## Cross-References

- `~/.claude/skills/swift-protocol-di-testing/SKILL.md` — protocol-based DI + tests
- `~/.claude/skills/coding-standards/SKILL.md` — general Swift style
- `~/.claude/rules/common/no-ambient-globals.md` — DI principles applied to Swift
- `~/.claude/rules/common/error-handling-with-context.md` — Swift error wrapping
- `~/.claude/agents/code-reviewer.md` — Swift code review delegate
- `~/.claude/agents/security-reviewer.md` — iOS keychain + data-at-rest review

## Why this skill exists

Swift's concurrency model (actors + structured concurrency) eliminates entire classes of data-race bugs that plagued GCD-era iOS apps — IF developers adopt it consistently. Mixing `DispatchQueue.main.async` with `await MainActor.run`, bypassing actor isolation via `nonisolated`, and silent Core Data save failures are the patterns that re-introduce the bugs the new model was designed to fix. The verification checklist gates each one so the app benefits from Swift 6's strict concurrency checking instead of fighting it.

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
- Shared mutable state without `actor` isolation (data race risk)
- `@MainActor` on a method that doesn't need main-thread isolation (perf overhead)
- `Task.detached` used where `Task` would inherit context correctly
- `await` on a non-cancellable long operation (cancellation propagation gap)
- `nonisolated` annotation hiding a data race
- `try?` swallowing persistence error silently (per `~/.claude/rules/swift/no-discards.md`)
- Core Data / SwiftData write off the main context without scheduling correctly
- `UserDefaults` for sensitive data (use Keychain — A02)
- File I/O on main actor (UI hitch)

**Refinement candidates**:
- New persistence-pattern row when SwiftData ships a new feature
- New cross-reference when a sister skill (swift-protocol-di-testing, security-review) adds a Swift gate
- Tightening of the actor-isolation rule when a data-race incident recurs
- New migration-template row when schema-evolution incident emerges
