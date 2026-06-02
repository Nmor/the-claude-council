---
name: swift-protocol-di-testing
description: Protocol-based dependency injection for testable Swift code — mock file system, network, and external APIs using focused protocols and Swift Testing.
---

# Swift Protocol-Based Dependency Injection for Testing

Patterns for making Swift code testable by abstracting external dependencies (file system, network, iCloud) behind small, focused protocols. Enables deterministic tests without I/O.

## When to Activate

- Writing Swift code that accesses file system, network, or external APIs
- Need to test error handling paths without triggering real failures
- Building modules that work across environments (app, test, SwiftUI preview)
- Designing testable architecture with Swift concurrency (actors, Sendable)

## Core Pattern

### 1. Define Small, Focused Protocols

Each protocol handles exactly one external concern.

```swift
// File system access
public protocol FileSystemProviding: Sendable {
    func containerURL(for purpose: Purpose) -> URL?
}

// File read/write operations
public protocol FileAccessorProviding: Sendable {
    func read(from url: URL) throws -> Data
    func write(_ data: Data, to url: URL) throws
    func fileExists(at url: URL) -> Bool
}

// Bookmark storage (e.g., for sandboxed apps)
public protocol BookmarkStorageProviding: Sendable {
    func saveBookmark(_ data: Data, for key: String) throws
    func loadBookmark(for key: String) throws -> Data?
}
```

### 2. Create Default (Production) Implementations

```swift
public struct DefaultFileSystemProvider: FileSystemProviding {
    public init() {}

    public func containerURL(for purpose: Purpose) -> URL? {
        FileManager.default.url(forUbiquityContainerIdentifier: nil)
    }
}

public struct DefaultFileAccessor: FileAccessorProviding {
    public init() {}

    public func read(from url: URL) throws -> Data {
        try Data(contentsOf: url)
    }

    public func write(_ data: Data, to url: URL) throws {
        try data.write(to: url, options: .atomic)
    }

    public func fileExists(at url: URL) -> Bool {
        FileManager.default.fileExists(atPath: url.path)
    }
}
```

### 3. Create Mock Implementations for Testing

```swift
public final class MockFileAccessor: FileAccessorProviding, @unchecked Sendable {
    public var files: [URL: Data] = [:]
    public var readError: Error?
    public var writeError: Error?

    public init() {}

    public func read(from url: URL) throws -> Data {
        if let error = readError { throw error }
        guard let data = files[url] else {
            throw CocoaError(.fileReadNoSuchFile)
        }
        return data
    }

    public func write(_ data: Data, to url: URL) throws {
        if let error = writeError { throw error }
        files[url] = data
    }

    public func fileExists(at url: URL) -> Bool {
        files[url] != nil
    }
}
```

### 4. Inject Dependencies with Default Parameters

Production code uses defaults; tests inject mocks.

```swift
public actor SyncManager {
    private let fileSystem: FileSystemProviding
    private let fileAccessor: FileAccessorProviding

    public init(
        fileSystem: FileSystemProviding = DefaultFileSystemProvider(),
        fileAccessor: FileAccessorProviding = DefaultFileAccessor()
    ) {
        self.fileSystem = fileSystem
        self.fileAccessor = fileAccessor
    }

    public func sync() async throws {
        guard let containerURL = fileSystem.containerURL(for: .sync) else {
            throw SyncError.containerNotAvailable
        }
        let data = try fileAccessor.read(
            from: containerURL.appendingPathComponent("data.json")
        )
        // Process data...
    }
}
```

### 5. Write Tests with Swift Testing

```swift
import Testing

@Test("Sync manager handles missing container")
func testMissingContainer() async {
    let mockFileSystem = MockFileSystemProvider(containerURL: nil)
    let manager = SyncManager(fileSystem: mockFileSystem)

    await #expect(throws: SyncError.containerNotAvailable) {
        try await manager.sync()
    }
}

@Test("Sync manager reads data correctly")
func testReadData() async throws {
    let mockFileAccessor = MockFileAccessor()
    mockFileAccessor.files[testURL] = testData

    let manager = SyncManager(fileAccessor: mockFileAccessor)
    let result = try await manager.loadData()

    #expect(result == expectedData)
}

@Test("Sync manager handles read errors gracefully")
func testReadError() async {
    let mockFileAccessor = MockFileAccessor()
    mockFileAccessor.readError = CocoaError(.fileReadCorruptFile)

    let manager = SyncManager(fileAccessor: mockFileAccessor)

    await #expect(throws: SyncError.self) {
        try await manager.sync()
    }
}
```

## Best Practices

- **Single Responsibility**: Each protocol should handle one concern — don't create "god protocols" with many methods
- **Sendable conformance**: Required when protocols are used across actor boundaries
- **Default parameters**: Let production code use real implementations by default; only tests need to specify mocks
- **Error simulation**: Design mocks with configurable error properties for testing failure paths
- **Only mock boundaries**: Mock external dependencies (file system, network, APIs), not internal types

## Anti-Patterns to Avoid

- Creating a single large protocol that covers all external access
- Mocking internal types that have no external dependencies
- Using `#if DEBUG` conditionals instead of proper dependency injection
- Forgetting `Sendable` conformance when used with actors
- Over-engineering: if a type has no external dependencies, it doesn't need a protocol

## When to Use

- Any Swift code that touches file system, network, or external APIs
- Testing error handling paths that are hard to trigger in real environments
- Building modules that need to work in app, test, and SwiftUI preview contexts
- Apps using Swift concurrency (actors, structured concurrency) that need testable architecture

## Purpose

Principal-level Swift testability: protocol-based dependency
injection, test doubles via in-memory protocol implementations
(stub / spy / fake), `swift-testing` framework (Swift 6+) +
XCTest legacy, async testing patterns with structured
concurrency, time injection via `Clock` protocol, `Sendable` +
actor-isolation for concurrent test setup, `@MainActor` test
boundaries, and the protocol-witness pattern (a struct of
closures) for cases where a protocol-with-extension is heavy.

**Negative scope** (NOT what this skill covers):
- Actor + persistence patterns — see `swift-actor-persistence`
- Generic Swift coding style — see `~/.claude/rules-library/swift/`
- UI testing (XCUITest) — out
- Snapshot testing — out (separate library: pointfree's
  `swift-snapshot-testing`)

## When NOT to use

- Pure-Foundation utility code with no external dependencies
- Throwaway experiments / Swift Playgrounds
- iOS app where the test target is genuinely absent (legacy
  Objective-C codebases sometimes)

## Standards Cited

- **Swift Language Reference 5.10 / 6.0** (docs.swift.org)
- **Swift Evolution SE-0306 (Actors)**
- **Swift Evolution SE-0302 (Sendable)**
- **Swift Evolution SE-0337 (Sendable strict)**
- **Swift Evolution SE-0401 (Remove preconcurrency)**
- **swift-testing framework** (github.com/swiftlang/swift-testing) —
  modern testing framework (Swift 6+)
- **XCTest** — legacy testing framework
- **Point-Free `swift-dependencies`** — community DI library
- **WWDC 2024: Meet swift-testing** — canonical introduction
- **OWASP ASVS 4.0.3 §1.4 (Architectural Documentation)** — DI
  pattern as architectural decision

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Direct `URLSession.shared` in business logic | Untestable; can't simulate network failures | Inject `URLSessionProtocol` |
| Singleton `Database.shared` | Single test pollutes the next | Inject `DatabaseProtocol` per test |
| `Date()` / `Date.now` in domain code | Time-dependent tests are flaky | Inject `Clock` (Swift 6) or `() -> Date` closure |
| `Bundle.main` inside reusable module | Coupled to app context | Inject `BundleProtocol` or pass URLs explicitly |
| `Task { ... }` without test scheduler | Async tests can't deterministically order completion | Use `swift-testing` confirmations + virtual time |
| Force-unwrapping in tests | Crashes obscure the real assertion | `#expect(value != nil)` then unwrap |
| Test setup repeated in every test case | DRY violation; refactor risk | Test fixtures / helpers per test target |
| Concrete class in production = concrete class in test | Test changes touch every test file | Protocol abstraction with `Test` and `Live` implementations |
| Hidden static state in protocol extension | Defaults that test can't override | Pure-instance protocol; defaults in initialiser |
| `XCTAssertEqual(result, expectedValue)` without async waiting | Asserts on stale state | `await fulfillment(of: ...)` OR swift-testing `#expect` with async |

## Verification Checklist

- [ ] Every external boundary (network, disk, time, RNG) has a
      protocol abstraction
- [ ] `Sendable` conformance on every type crossing actor
      boundaries
- [ ] Strict concurrency checking enabled (Swift 6 default)
- [ ] `Clock` protocol injected for any time-dependent logic
- [ ] Test target uses `swift-testing` (Swift 6+) OR XCTest
      consistently
- [ ] No force-unwrap (`!`) in test code outside explicit
      setup-time assertion
- [ ] Test isolation verified (random-order runs pass)
- [ ] Coverage ≥ 90% on touched files (per `extreme-lint-policy.md`)
- [ ] SwiftLint clean (force_unwrapping / force_try / empty_catch:
      error)
- [ ] No production singletons; all dependencies injected via
      initialiser
- [ ] Protocol-witness pattern considered for closure-heavy
      protocols
- [ ] `@MainActor` annotation on UI-touching code only

## Cross-References

- `~/.claude/skills/swift-actor-persistence/SKILL.md` — sister
  Swift concurrency skill
- `~/.claude/skills/coding-standards/SKILL.md` — universal baseline
- `~/.claude/rules-library/swift/no-discards.md` — discards / force-unwrap
  bans
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI principle
- `~/.claude/rules-library/common/local-testability.md` — testable-before-
  write mandate
- `~/.claude/agents/code-reviewer.md` — Council Division 3
- `~/.claude/agents/tdd-guide.md` — Council Division 5
- Swift Forums — Testing topic (forums.swift.org)

## Why this skill exists

Swift codebases that depend directly on `URLSession.shared`,
`Date()`, `Bundle.main`, and singleton databases become testable
only via heavy mocking libraries (or not at all). The protocol-
based DI pattern lets the codebase ship the same code that runs
in production, in tests, and in SwiftUI previews — with each
environment supplying its own implementation. The patterns above
codify the principal-level posture: protocol abstraction at every
boundary, time injection, structured concurrency in tests,
swift-testing for the modern API. Teams that adopt these have
fast, deterministic, parallel test suites; teams that don't ship
flaky tests that get disabled and then forgotten.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Concrete dependency hardcoded in initializer (testability weakening — protocol-DI absent)
- Mock missing protocol conformance (test doesn't compile when protocol evolves)
- Test using singleton-shared `URLSession.shared` instead of injected `URLProtocol` stub
- Preview crashes because protocol has no preview-friendly mock
- `@Mockable` macros / Mockingbird absent — manual mock duplication
- Test for error path missing because mock can only return success
- DI container (Resolver / Factory / Needle) used inconsistently across modules

**Refinement candidates**:
- New protocol-DI pattern row when SwiftUI / async/await ships a new feature
- New cross-reference when a sister skill (swift-actor-persistence, tdd-workflow) adds a Swift gate
- New mock-template row when a recurring stub shape emerges
- Tightening of the protocol-first rule when concrete-deps regression recurs
