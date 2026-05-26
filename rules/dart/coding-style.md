---
paths:
  - "**/*.dart"
  - "**/pubspec.yaml"
---

# Dart/Flutter Coding Style

> Extends `common/coding-style.md` with Dart/Flutter-specific conventions.

## Naming Conventions

- Classes/enums/typedefs: `UpperCamelCase`
- Libraries/packages/directories/files: `lowercase_with_underscores`
- Variables/functions/parameters: `lowerCamelCase`
- Constants: `lowerCamelCase` (not SCREAMING_SNAKE)
- Private members: prefix with `_`

## Immutability

Use `final` by default. Prefer immutable widgets and data classes.

```dart
// CORRECT: Immutable data class
@immutable
class User {
  final String id;
  final String name;

  const User({required this.id, required this.name});

  User copyWith({String? id, String? name}) =>
      User(id: id ?? this.id, name: name ?? this.name);
}
```

## Flutter Widget Patterns

- Extract widgets into methods only when reusing; prefer separate widget classes
- Keep `build()` methods small (<40 lines)
- Use `const` constructors wherever possible
- Prefer `StatelessWidget` over `StatefulWidget` when possible
- Use Riverpod/Bloc/Provider for state management (not raw `setState`)

## Error Handling

```dart
try {
  final result = await apiClient.fetchUser(id);
  return Result.success(result);
} on SocketException catch (e) {
  return Result.failure(AppError.network(e));
} on FormatException catch (e) {
  return Result.failure(AppError.parse(e));
}
```

## Effective Dart

- Follow Effective Dart guidelines
- Use `dart format` for formatting
- Use `dart analyze` for static analysis
- Prefer `async/await` over raw Futures
