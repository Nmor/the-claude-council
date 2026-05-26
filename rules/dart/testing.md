---
paths:
  - "**/*_test.dart"
  - "**/test/**/*.dart"
---

# Dart/Flutter Testing

> Extends `common/testing.md` with Dart/Flutter-specific testing conventions.

## Minimum Test Coverage: 70%

## Testing Frameworks

- Unit tests: `package:test`
- Widget tests: `package:flutter_test`
- Integration tests: `package:integration_test`

```dart
// Unit test
test('User.copyWith creates new instance with updated name', () {
  final user = User(id: '1', name: 'Alice');
  final updated = user.copyWith(name: 'Bob');

  expect(updated.name, equals('Bob'));
  expect(updated.id, equals('1'));
  expect(identical(user, updated), isFalse);
});

// Widget test
testWidgets('LoginButton shows loading indicator', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: LoginButton()));
  await tester.tap(find.byType(ElevatedButton));
  await tester.pump();

  expect(find.byType(CircularProgressIndicator), findsOneWidget);
});
```

## Mocking

Use `mocktail` (preferred) or `mockito` for mocking:

```dart
class MockUserRepository extends Mock implements UserRepository {}
```
