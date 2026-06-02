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

```
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

Per `~/.claude/rules/common/reuse-first.md`.

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

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/common/reuse-first.md`
- `~/.claude/rules/swift/coding-style.md`
- `~/.claude/rules/swift/no-discards.md`
- `~/.claude/rules/swift/security.md`
- Swift API Design Guidelines (swift.org/documentation/api-design-guidelines)
- Apple Developer Documentation
- Swift Evolution proposals
- Composable Architecture (pointfreeco/swift-composable-architecture)
