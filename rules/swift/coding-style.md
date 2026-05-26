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
