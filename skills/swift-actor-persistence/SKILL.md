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

- Generic Swift idioms — see `coding-quality-rules`
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
- `~/.claude/skills/coding-quality-rules/SKILL.md` — general Swift style
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI principles applied to Swift
- `~/.claude/rules-library/common/error-handling-with-context.md` — Swift error wrapping
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
- `try?` swallowing persistence error silently (per `~/.claude/rules-library/swift/no-discards.md`)
- Core Data / SwiftData write off the main context without scheduling correctly
- `UserDefaults` for sensitive data (use Keychain — A02)
- File I/O on main actor (UI hitch)

**Refinement candidates**:

- New persistence-pattern row when SwiftData ships a new feature
- New cross-reference when a sister skill (swift-protocol-di-testing, security-review) adds a Swift gate
- Tightening of the actor-isolation rule when a data-race incident recurs
- New migration-template row when schema-evolution incident emerges

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: ~/.claude/rules-library/swift/
     ============================================================ -->

## Migrated rules (rules-library/swift/, 2026-06-02)

Phase H will delete the source files at `rules-library/swift/`. Content below preserves the original rule bodies for lazy-load via the `paths:` glob above.

---

<!-- ============================================================
     Section: swift/coding-style.md
     ============================================================ -->

---
paths:

- "**/*.swift"
- "**/Package.swift"

---

# Swift Coding Style

> Extends `common/coding-style.md` with Swift-specific conventions.

## Naming Conventions

- Types/protocols: `UpperCamelCase` (e.g., `UserProfile`, `Fetchable`)
- Functions/properties/variables: `lowerCamelCase` (e.g., `fetchUser`, `userName`)
- Constants: `lowerCamelCase` (not SCREAMING_SNAKE)
- Enum cases: `lowerCamelCase`

## Immutability

Prefer `let` over `var`. Use value types (`struct`) over reference types (`class`) by default.

```swift
// CORRECT: Immutable struct
struct User {
    let id: UUID
    let name: String

    func withName(_ newName: String) -> User {
        User(id: id, name: newName)
    }
}
```

## Error Handling

Use Swift's typed error handling:

```swift
enum AppError: Error, LocalizedError {
    case networkFailure(underlying: Error)
    case invalidData(reason: String)

    var errorDescription: String? {
        switch self {
        case .networkFailure(let error): return "Network error: \(error.localizedDescription)"
        case .invalidData(let reason): return "Invalid data: \(reason)"
        }
    }
}
```

## SwiftUI Patterns

- Extract reusable views into separate files
- Use `@State` for local state, `@Binding` for parent-owned state
- Prefer `@Observable` (iOS 17+) over `@ObservableObject`
- Keep views small (<50 lines of body)

## Concurrency

- Use Swift Concurrency (`async/await`, `actor`) over GCD
- Mark shared mutable state with `@MainActor` or use actors
- Never use `DispatchQueue.main.async` in new code

---

<!-- ============================================================
     Section: swift/hooks.md
     ============================================================ -->

# Swift Hooks

> Auto-fires on every `*.swift`, `Package.swift`, `Package.resolved`,
> `*.xcconfig`, `*.xcodeproj/**`, `*.xcworkspace/**`,
> `Project.yml`, `*.swiftlint.yml`, `.swiftformat` file. Sister to
> `~/.claude/rules-library/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_swift=$(git diff --cached --name-only --diff-filter=ACMR \
    | grep -E '\.swift$' || true)
[ -z "$staged_swift" ] && exit 0

swiftformat --lint --strict $staged_swift
swiftlint lint --strict --quiet $staged_swift
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# SwiftPM packages
if [ -f Package.swift ]; then
    swift test --enable-code-coverage --parallel
fi

# Xcode projects
if find . -maxdepth 2 -name '*.xcodeproj' -print -quit | grep -q .; then
    xcodebuild test \
        -scheme "${SCHEME:-MyApp}" \
        -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
        -enableCodeCoverage YES \
        -resultBundlePath /tmp/test-results.xcresult
fi
```

## CI workflow

```yaml
name: Swift CI

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    strategy:
      matrix:
        xcode: ['16.1', '16.2']
    steps:
      - uses: actions/checkout@<sha>
      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_${{ matrix.xcode }}.app

      - name: Cache SwiftPM
        uses: actions/cache@<sha>
        with:
          path: |
            .build
            ~/Library/Developer/Xcode/DerivedData/SourcePackages
          key: ${{ runner.os }}-spm-${{ hashFiles('Package.resolved') }}

      - name: Format check
        run: |
          brew install swiftformat
          swiftformat --lint --strict .

      - name: Lint
        run: |
          brew install swiftlint
          swiftlint lint --strict --reporter github-actions-logging

      - name: Build
        run: swift build -Xswiftc -warnings-as-errors

      - name: Test
        run: swift test --enable-code-coverage --parallel

      - name: Coverage gate
        run: |
          xcrun llvm-cov report \
            .build/debug/MyAppPackageTests.xctest/Contents/MacOS/MyAppPackageTests \
            -instr-profile=.build/debug/codecov/default.profdata \
            > coverage.txt
          coverage=$(grep -E '^TOTAL' coverage.txt | awk '{print $NF}' | tr -d '%')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% < 80%"
            exit 1
          fi

      - uses: codecov/codecov-action@<sha>
        with: { files: coverage.txt }

  ios-build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@<sha>
      - name: Build iOS
        run: |
          xcodebuild build-for-testing \
            -scheme "${SCHEME:-MyApp}" \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
            -configuration Debug \
            -enableCodeCoverage YES \
            CODE_SIGNING_ALLOWED=NO

      - name: Test iOS
        run: |
          xcodebuild test-without-building \
            -scheme "${SCHEME:-MyApp}" \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
            -resultBundlePath /tmp/test-results.xcresult

  security:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@<sha>
      - name: Resolve dependencies
        run: swift package resolve

      - name: License audit
        run: |
          # Check Package.resolved doesn't pull non-allowlisted licenses
          # (via a license-checker step keyed by SPDX identifiers)
          ./scripts/verify-licenses.sh
```

## Required tools

```bash
brew install swiftformat       # formatter
brew install swiftlint          # linter
brew install xcbeautify          # nicer xcodebuild output
brew install --cask xcodes       # Xcode version management
```

## `.swiftformat` (project root)

```ini
--swiftversion 5.9
--indent 4
--maxwidth 120
--wraparguments before-first
--wrapparameters before-first
--wrapcollections before-first
--commas inline
--semicolons never
--trailingclosures
--exclude .build,Pods,Carthage
--enable isEmpty
--enable redundantSelf
--enable redundantReturn
--enable redundantParens
--enable redundantInit
--enable redundantNilInit
--enable redundantBackticks
--enable redundantBreak
--enable redundantClosure
--enable strongOutlets
--enable trailingClosures
--enable trailingCommas
--enable typeSugar
--enable wrapMultilineStatementBraces
```

## `.swiftlint.yml` (already covered in `swift/no-discards.md`)

See `~/.claude/rules-library/swift/no-discards.md` for the strict config:

- `force_unwrapping: error`
- `force_try: error`
- `empty_catch: error`
- `implicitly_unwrapped_optional: error`
- Cyclomatic complexity: warn 7, error 10
- Function body length: warn 50, error 80
- File length: warn 400, error 500
- Line length: warn 120, error 160

## `Package.swift` strict baseline

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MyApp",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "MyApp", targets: ["MyApp"])],
    dependencies: [
        .package(url: "https://github.com/apple/swift-log.git", from: "1.5.0"),
    ],
    targets: [
        .target(
            name: "MyApp",
            dependencies: [
                .product(name: "Logging", package: "swift-log"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableUpcomingFeature("ExistentialAny"),
                .enableUpcomingFeature("BareSlashRegexLiterals"),
                .enableUpcomingFeature("DisableOutwardActorInference"),
                .unsafeFlags(["-warnings-as-errors"], .when(configuration: .release)),
            ]
        ),
        .testTarget(
            name: "MyAppTests",
            dependencies: ["MyApp"],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]
        ),
    ]
)
```

`Package.resolved` MUST be committed to lock transitive dep
versions.

## Xcode project hardening

`*.xcconfig`:

```text
// Treat warnings as errors
SWIFT_TREAT_WARNINGS_AS_ERRORS = YES
GCC_TREAT_WARNINGS_AS_ERRORS = YES

// Strict concurrency
SWIFT_UPCOMING_FEATURE_STRICT_CONCURRENCY = YES
SWIFT_STRICT_CONCURRENCY = complete

// Other warnings → errors
CLANG_ANALYZER_NONNULL = YES
CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF = YES
CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES
CLANG_WARN_RANGE_LOOP_ANALYSIS = YES
CLANG_WARN_STRICT_PROTOTYPES = YES
CLANG_WARN_SUSPICIOUS_MOVE = YES
GCC_WARN_64_TO_32_BIT_CONVERSION = YES
GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR
GCC_WARN_UNDECLARED_SELECTOR = YES
GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE
GCC_WARN_UNUSED_FUNCTION = YES
GCC_WARN_UNUSED_VARIABLE = YES

// ATS — strict
NSAppTransportSecurity = (
    NSAllowsArbitraryLoads = NO,
    NSExceptionDomains = ()
)
```

## SwiftPM dependency hygiene

```bash
# List outdated
swift package show-dependencies

# Update transitive deps
swift package update

# Resolve to clean lock state
swift package resolve

# Audit for known CVEs (via OSV)
osv-scanner --lockfile=Package.resolved
```

## Pre-deployment iOS checklist

```bash
# Archive
xcodebuild -scheme MyApp -configuration Release archive \
    -archivePath ./build/MyApp.xcarchive

# Export
xcodebuild -exportArchive \
    -archivePath ./build/MyApp.xcarchive \
    -exportPath ./build/MyApp \
    -exportOptionsPlist ExportOptions.plist

# Validate
xcrun altool --validate-app -f ./build/MyApp/MyApp.ipa \
    -t ios --apiKey "$APP_STORE_API_KEY" --apiIssuer "$APP_STORE_ISSUER"

# Upload (separate step; never auto)
xcrun altool --upload-app -f ./build/MyApp/MyApp.ipa \
    -t ios --apiKey "$APP_STORE_API_KEY" --apiIssuer "$APP_STORE_ISSUER"
```

API key + issuer come from the vault (per
`~/.claude/rules-library/common/secrets-management.md`), NEVER from a
checked-in file.

## Cross-references

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/swift/no-discards.md`
- `~/.claude/rules-library/swift/testing.md`
- SwiftLint docs (realm.github.io/SwiftLint)
- SwiftFormat docs (github.com/nicklockwood/SwiftFormat)
- Swift Package Manager docs (swift.org/package-manager)

---

<!-- ============================================================
     Section: swift/no-discards.md
     ============================================================ -->

# Swift — No-Discards Extension

> Auto-fires on every `*.swift`, `Package.swift`, `*.xcconfig` file.
> Extends `~/.claude/rules-library/common/no-discards.md`. Tooling: SwiftLint
> (strict), SwiftFormat, swift-format (Apple), `xcrun swift build`.

## Core Principle

**Every `Result` is matched; every throwing function's `try` is in
a `do/catch` with specific Error types; no force-unwrap (`!`); no
implicit unwraps for non-IBOutlet types; `@discardableResult`
applied only with explicit intent.**

## Banned patterns

### 1. Force-unwrap

```swift
// FORBIDDEN
let user = response!.user
let url = URL(string: input)!

// CORRECT
guard let response = response else {
    logger.warning("response was nil")
    return
}
let user = response.user

if let url = URL(string: input) {
    fetch(url)
} else {
    logger.warning("invalid URL: \(input)")
}
```

SwiftLint: `force_unwrapping: error`.

### 2. Force-try (`try!`)

```swift
// FORBIDDEN
let data = try! JSONDecoder().decode(User.self, from: bytes)

// CORRECT
do {
    let data = try JSONDecoder().decode(User.self, from: bytes)
    process(data)
} catch DecodingError.dataCorrupted(let ctx) {
    logger.warning("decode failed: \(ctx.debugDescription)")
} catch {
    logger.error("unexpected decode error: \(error)")
    throw error
}
```

SwiftLint: `force_try: error`.

### 3. Empty catch

```swift
// FORBIDDEN
do { try thing() } catch { }

// CORRECT
do {
    try thing()
} catch let err as SpecificError {
    logger.warning("thing failed", metadata: ["err": "\(err)"])
    throw ServiceError.thingFailed(cause: err)
} catch {
    logger.error("unexpected error: \(error)")
    throw error
}
```

SwiftLint: `empty_catch: error`.

### 4. Ignored discardable + ignored throws

```swift
// FORBIDDEN — return ignored
service.fetch(id: x)   // returns Result; dropped

// CORRECT
let result = service.fetch(id: x)
switch result {
case .success(let item):
    use(item)
case .failure(let err):
    logger.warning("fetch failed: \(err)")
}
```

### 5. `@discardableResult` without justification

```swift
// FORBIDDEN if the result actually matters
@discardableResult
func save(_ item: Item) -> Bool { ... }

// CORRECT — annotate only when truly fluent / chainable
@discardableResult
func with(_ flag: Bool) -> Self {
    self.flag = flag
    return self
}
```

### 6. Implicitly unwrapped optionals

```swift
// FORBIDDEN — outside of IBOutlets / lifecycle-managed properties
class Service {
    var client: APIClient!
}

// CORRECT
class Service {
    let client: APIClient
    init(client: APIClient) { self.client = client }
}
```

SwiftLint: `implicitly_unwrapped_optional: error` (allow
IBOutlets via configuration).

### 7. `Any` as return type

```swift
// FORBIDDEN
func parse() -> Any { ... }

// CORRECT — typed return
func parse() throws -> User { ... }
// or
func parse() -> Result<User, ParseError> { ... }
```

### 8. Print in production

```swift
// FORBIDDEN
print("debug: \(x)")

// CORRECT — os.log / swift-log
import OSLog
let logger = Logger(subsystem: "app", category: "Service")
logger.debug("processing \(x, privacy: .public)")
```

### 9. `Notification` observers not removed

```swift
// FORBIDDEN — leak; observer fires after deinit
NotificationCenter.default.addObserver(self,
    selector: #selector(handle), name: .myEvent, object: nil)

// CORRECT — block-based + token
class C {
    var token: NSObjectProtocol?
    func subscribe() {
        token = NotificationCenter.default.addObserver(
            forName: .myEvent, object: nil, queue: .main) { [weak self] _ in
                self?.handle()
        }
    }
    deinit {
        if let token = token {
            NotificationCenter.default.removeObserver(token)
        }
    }
}
```

### 10. Strong self in closures (retain cycles)

```swift
// FORBIDDEN
viewModel.onChange = { newValue in
    self.update(newValue)  // strong; retain cycle
}

// CORRECT
viewModel.onChange = { [weak self] newValue in
    guard let self else { return }
    self.update(newValue)
}
```

## Required `.swiftlint.yml`

```yaml
opt_in_rules:
  - array_init
  - attributes
  - closure_end_indentation
  - closure_spacing
  - collection_alignment
  - contains_over_filter_count
  - convenience_type
  - empty_collection_literal
  - empty_count
  - empty_string
  - explicit_init
  - fatal_error_message
  - first_where
  - flatmap_over_map_reduce
  - force_unwrapping
  - implicitly_unwrapped_optional
  - last_where
  - legacy_random
  - literal_expression_end_indentation
  - multiline_arguments
  - multiline_function_chains
  - multiline_literal_brackets
  - multiline_parameters
  - operator_usage_whitespace
  - overridden_super_call
  - pattern_matching_keywords
  - prefer_self_type_over_type_of_self
  - private_action
  - prohibited_super_call
  - redundant_nil_coalescing
  - sorted_first_last
  - static_operator
  - toggle_bool
  - unavailable_function
  - unowned_variable_capture
  - untyped_error_in_catch
  - vertical_parameter_alignment_on_call
  - vertical_whitespace_closing_braces
  - vertical_whitespace_opening_braces
  - yoda_condition

disabled_rules: []

force_cast: error
force_try: error
force_unwrapping: error
empty_catch: error
implicitly_unwrapped_optional: error

cyclomatic_complexity:
  warning: 7
  error: 10

function_body_length:
  warning: 50
  error: 80

file_length:
  warning: 400
  error: 500

line_length:
  warning: 120
  error: 160
```

## Verification block

```text
Swift build (this turn):
  - swift build -Xswiftc -warnings-as-errors: 0 warnings
  - swiftlint lint --strict: 0 violations
  - swiftformat --lint --strict: clean
  - swift test --enable-code-coverage: PASS (91%)
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- Apple Swift API Design Guidelines
- swift.org coding style

## Why this rule exists

Swift's force-unwrap (`!`) was meant for clearly-safe cases but
became a habitual shortcut. `try!` even more so. Combined with
implicit unwraps and ignored Results, Swift code that "compiles
clean" can crash in production at the first nil. The rules
above + strict SwiftLint configuration close these patterns.

---

<!-- ============================================================
     Section: swift/patterns.md
     ============================================================ -->

# Swift Patterns

> Auto-fires on every `*.swift`, `Package.swift`, `Project.yml`,
> `*.xcconfig` file. Standards: **Swift API Design Guidelines
> (swift.org)**, **Apple Developer Documentation**, **Swift
> Evolution proposals**, **Modern Concurrency Manifesto**,
> **Composable Architecture (TCA) / The SwiftUI Lab**.

## Core Principle

**Value semantics by default (`struct` over `class`); protocol-
oriented design with associated types; `Sendable` + `actor` for
shared mutable state; `async`/`await` + structured concurrency
(no callback pyramids); `@Observable` (Swift 5.9+) for UI state;
explicit error types via `Result<Success, Failure>` OR `throws`;
dependency injection via protocol composition.**

## Project layout

```text
MyApp/
├── Package.swift                      # SwiftPM manifest
├── Sources/
│   ├── MyAppCore/                     # Pure Swift (no UIKit / SwiftUI)
│   │   ├── Models/
│   │   │   └── Order.swift
│   │   ├── Services/
│   │   │   └── OrderService.swift
│   │   └── Repositories/
│   │       └── OrderRepository.swift
│   ├── MyAppData/                     # Persistence (Core Data / SwiftData / SQLite)
│   ├── MyAppNetworking/               # URLSession wrappers, API clients
│   └── MyApp/                         # SwiftUI / UIKit entry
│       ├── Features/
│       │   └── Orders/
│       │       ├── OrderListView.swift
│       │       └── OrderViewModel.swift
│       └── App.swift
└── Tests/
    └── MyAppCoreTests/
```

Core depends on NOTHING. Data + Networking on Core. App on
everything.

## Value types — `struct` over `class`

```swift
// CORRECT — value type; cheap copy; thread-safe by default
struct Order: Identifiable, Sendable, Hashable {
    let id: UUID
    let customerId: UUID
    var items: [LineItem]
    var status: OrderStatus

    var total: Money {
        items.reduce(.zero) { $0 + $1.price }
    }
}

// CORRECT — reference type when identity matters
final class OrderViewModel: ObservableObject {
    @Published var orders: [Order] = []
    // ...
}
```

Default: `struct`. Reach for `class` only when:

- Identity matters (`===` comparison)
- Deinitializer needed (resource cleanup)
- Reference semantics required (shared mutable state)
- Inheriting from Apple frameworks (`UIView`, `NSWindow`)

## Sendable + actor for concurrency

```swift
// `Sendable` — safe to cross actor boundaries
struct OrderUpdate: Sendable {
    let orderId: UUID
    let newStatus: OrderStatus
}

// `actor` — isolates mutable state; serialises access
actor OrderCache {
    private var cache: [UUID: Order] = [:]

    func get(_ id: UUID) -> Order? {
        cache[id]
    }

    func set(_ order: Order) {
        cache[order.id] = order
    }
}

// Usage
let cache = OrderCache()
await cache.set(order)
let fetched = await cache.get(order.id)
```

`@unchecked Sendable` is a violation unless documented with the
synchronisation contract (e.g., wraps a `DispatchQueue`).

## Async/await + structured concurrency

```swift
// CORRECT — `async let` for parallel work
func loadDashboard(userId: UUID) async throws -> Dashboard {
    async let orders = orderService.fetch(customerId: userId)
    async let stats = analyticsService.summary(userId: userId)
    async let notifications = notificationService.unread(userId: userId)

    return try await Dashboard(
        orders: orders,
        stats: stats,
        notifications: notifications
    )
}

// CORRECT — TaskGroup for dynamic fan-out
func fetchOrders(ids: [UUID]) async throws -> [Order] {
    try await withThrowingTaskGroup(of: Order.self) { group in
        for id in ids {
            group.addTask { try await orderService.fetch(id: id) }
        }
        return try await group.reduce(into: []) { $0.append($1) }
    }
}

// CORRECT — Task with explicit priority
Task(priority: .userInitiated) {
    try await refreshOrders()
}
```

Cancellation propagates automatically through structured tasks.
Check `Task.isCancelled` in long loops.

## Protocols + associated types

```swift
protocol Repository {
    associatedtype Entity: Identifiable & Sendable
    associatedtype Query: Sendable

    func find(_ id: Entity.ID) async throws -> Entity?
    func query(_ q: Query) async throws -> [Entity]
    func save(_ entity: Entity) async throws
}

struct OrderRepository: Repository {
    typealias Entity = Order
    typealias Query = OrderQuery
    // ...
}

// Generic services consume any conforming type
struct CachedRepository<R: Repository>: Repository {
    let upstream: R
    let cache: Cache<R.Entity.ID, R.Entity>

    func find(_ id: R.Entity.ID) async throws -> R.Entity? {
        if let cached = await cache.get(id) { return cached }
        let entity = try await upstream.find(id)
        if let entity = entity { await cache.set(entity, for: id) }
        return entity
    }
    // ...
}
```

## Result type for explicit failure (alternative to throws)

```swift
enum FetchError: Error, Sendable {
    case notFound(UUID)
    case unauthorized
    case network(URLError)
}

// Explicit success / failure type in the signature
func fetchOrder(_ id: UUID) async -> Result<Order, FetchError> {
    do {
        let order = try await client.get(id: id)
        return .success(order)
    } catch let err as URLError {
        return .failure(.network(err))
    } catch {
        return .failure(.unauthorized)
    }
}

// Usage
switch await fetchOrder(id) {
case .success(let order):
    display(order)
case .failure(.notFound):
    showNotFound()
case .failure(.unauthorized):
    redirectToLogin()
case .failure(.network(let err)):
    showError(err.localizedDescription)
}
```

Prefer `throws` for unrecoverable; `Result` when the caller
routinely branches on multiple failure modes.

## SwiftUI patterns

```swift
// @Observable (Swift 5.9+) — replaces @Published / @ObservedObject
@Observable
final class OrderListViewModel {
    var orders: [Order] = []
    var isLoading = false
    var error: Error?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            orders = try await orderService.fetchAll()
        } catch {
            self.error = error
        }
    }
}

struct OrderListView: View {
    @State private var viewModel = OrderListViewModel()

    var body: some View {
        List(viewModel.orders) { order in
            OrderRow(order: order)
        }
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .overlay { if viewModel.isLoading { ProgressView() } }
        .alert("Error", isPresented: .constant(viewModel.error != nil)) {
            Button("OK") { viewModel.error = nil }
        }
    }
}
```

## Dependency injection (no framework)

```swift
// Protocol-based composition
struct AppDependencies {
    let orderService: any OrderService
    let paymentClient: any PaymentClient
    let clock: any Clock
    let logger: Logger
}

// Production
let prod = AppDependencies(
    orderService: LiveOrderService(),
    paymentClient: StripePaymentClient(apiKey: env.stripeKey),
    clock: SystemClock(),
    logger: Logger(subsystem: "app", category: "main")
)

// Tests
let test = AppDependencies(
    orderService: MockOrderService(),
    paymentClient: MockPaymentClient(),
    clock: FixedClock(now: testDate),
    logger: Logger(subsystem: "app.test", category: "main")
)
```

For SwiftUI: pass via `@Environment` or pass `AppDependencies`
down the view tree.

## Combine vs AsyncSequence

| When | Choose |
| --- | --- |
| Single async value | `async` / `await` |
| Stream of values, modern code | `AsyncSequence` / `AsyncStream` |
| Existing Combine codebase | `Publisher` chains (interop with `.values`) |
| UI binding (older SwiftUI) | `@Published` + Combine |
| UI binding (Swift 5.9+) | `@Observable` |

New code prefers AsyncSequence over Combine; Combine remains in
maintenance mode.

## Reuse-first

| Use case | Library |
| --- | --- |
| Networking | URLSession + AsyncURLProtocol; Alamofire for legacy |
| Persistence | SwiftData (iOS 17+), Core Data, GRDB.swift |
| JSON | `Codable` (built-in) |
| Logging | `os.Logger` (built-in), swift-log |
| Date / time | `Foundation.Date` + `DateFormatter` / `ISO8601DateFormatter` |
| Testing | XCTest + swift-testing (Swift 6+) |
| UI components | SwiftUI built-ins; SnapKit (UIKit legacy) |
| State management | `@Observable`, TCA (Composable Architecture) |
| DI | Swift Dependencies (Point-Free), Factory, manual |
| Image loading | NukeUI, Kingfisher |
| Crypto | CryptoKit (built-in) |

Per `~/.claude/rules-library/common/reuse-first.md`.

## Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| `class` for value-like data | Use `struct` |
| `var` properties on data models | `let` + `with` methods for non-destructive update |
| Force-unwrap `!` outside test setup | `guard let` or `if let` |
| Force-try `try!` | `do/catch` |
| Singletons with mutable state | Inject via protocol; use `actor` for shared cache |
| `weak var self` everywhere | Use only when retain-cycle is real |
| `DispatchQueue.main.async` in async functions | `@MainActor` + `await MainActor.run` |
| Type erasure via `Any` | Generic + protocol with associated types |

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/common/reuse-first.md`
- `~/.claude/rules-library/swift/coding-style.md`
- `~/.claude/rules-library/swift/no-discards.md`
- `~/.claude/rules-library/swift/security.md`
- Swift API Design Guidelines (swift.org/documentation/api-design-guidelines)
- Apple Developer Documentation
- Swift Evolution proposals
- Composable Architecture (pointfreeco/swift-composable-architecture)

---

<!-- ============================================================
     Section: swift/security.md
     ============================================================ -->

---
paths:

- "**/*.swift"

---

# Swift Security

> Extends `common/security.md` with Swift/iOS-specific security.

## Keychain for Secrets

Never store tokens/passwords in UserDefaults. Use Keychain Services.

## App Transport Security

Never disable ATS globally. Use per-domain exceptions only when absolutely necessary.

## Input Validation

Validate all user input and external data before processing. Use `Codable` with strict validation.

## Biometric Auth

Use `LAContext` with proper error handling. Always provide a passcode fallback.

---

<!-- ============================================================
     Section: swift/testing.md
     ============================================================ -->

---
paths:

- "**/*Tests.swift"
- "**/*Test.swift"
- "**/Tests/**/*.swift"

---

# Swift Testing

> Extends `common/testing.md` with Swift-specific testing conventions.

## Minimum Test Coverage: 70%

## Testing Framework

Prefer Swift Testing (`@Test`, `#expect`) over XCTest for new code.

```swift
import Testing

@Test("User creation with valid data")
func userCreation() {
    let user = User(name: "Alice", email: "alice@example.com")
    #expect(user.name == "Alice")
    #expect(user.email == "alice@example.com")
}

@Test("Network fetch throws on invalid URL", .tags(.networking))
func invalidURLFetch() async throws {
    await #expect(throws: AppError.self) {
        try await networkService.fetch(from: "not-a-url")
    }
}
```

## Mocking

Use protocol-based dependency injection for testable code:

```swift
protocol UserRepository {
    func fetchUser(id: UUID) async throws -> User
}

struct MockUserRepository: UserRepository {
    var stubbedUser: User?

    func fetchUser(id: UUID) async throws -> User {
        guard let user = stubbedUser else { throw AppError.notFound }
        return user
    }
}
```

---
