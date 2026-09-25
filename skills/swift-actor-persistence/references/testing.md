---
paths:

- "**/*Tests.swift"
- "**/*Test.swift"
- "**/Tests/**/*.swift"

---

<!-- ============================================================
     Section: swift/testing.md
     ============================================================ -->

# Swift Testing

> Covers Swift testing: the 70% coverage floor, the Swift Testing framework (`@Test` / `#expect`)
> and protocol-based mocking. Pointed at by the SKILL.md routing row **Swift testing**.
>
> Extends `common/testing.md` with Swift-specific testing conventions.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
