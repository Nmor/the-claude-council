---
name: dart-flutter-patterns
description: Dart 3.x / Flutter discipline — null safety mandatory; force-unwrap (!) banned outside justified narrow cases; const constructors everywhere possible; Riverpod / BLoC for state; freezed for immutable models + sealed unions; go_router for navigation; structured concurrency via async/await + Stream; Material 3 / Cupertino theming via tokens; analyser at fatal-infos + fatal-warnings. Auto-fires on Dart / Flutter project files.
paths:
  - "**/*.dart"
  - "pubspec.yaml"
  - "**/pubspec.yaml"
  - "pubspec.lock"
  - "**/pubspec.lock"
  - "analysis_options.yaml"
  - "**/analysis_options.yaml"
---

> Migrated 2026-06-02 from `~/.claude/rules-library/dart/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# dart-flutter-patterns

## Standards Cited

- **Dart Language Specification 3.x** (dart.dev/guides/language/spec) — null safety, sealed classes, records
- **Effective Dart** (dart.dev/effective-dart) — style + usage + design + documentation
- **Flutter Material Design 3** (m3.material.io) — token system + adaptive theming
- **WCAG 2.2 §1.4.11** (W3C Recommendation, October 2023) — non-text contrast 3:1 for UI components
- **WCAG 2.2 §2.5.8** (W3C Recommendation, October 2023) — target size minimum 24×24 CSS pixels (Flutter: 48dp)
- **OWASP Mobile Top 10 2024 M1** (owasp.org/www-project-mobile-top-10) — improper credential usage (Dart secure storage discipline)
- **CWE-798** — Use of Hard-coded Credentials (no API keys in source)
- **ECMAScript Internationalization API** — `intl` package follows the same locale model

<!-- ============================================================
     Section: dart/coding-style.md
     ============================================================ -->

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

---

<!-- ============================================================
     Section: dart/hooks.md
     ============================================================ -->

# Dart / Flutter Hooks

> Auto-fires on every `*.dart`, `pubspec.yaml`, `pubspec.lock`,
> `analysis_options.yaml`, `build.yaml` file. Sister to
> `~/.claude/rules-library/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_dart=$(git diff --cached --name-only --diff-filter=ACMR \
    | grep -E '\.dart$' || true)
[ -z "$staged_dart" ] && exit 0

dart format --set-exit-if-changed $staged_dart
dart analyze --fatal-infos --fatal-warnings
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail
flutter test --coverage      # OR `dart test` for pure-Dart packages
```

## CI workflow

```yaml
name: Flutter CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: subosito/flutter-action@<sha>
        with:
          channel: stable
          flutter-version-file: .fvmrc       # or pubspec.yaml
          cache: true

      - name: Pub get
        run: flutter pub get

      - name: Format
        run: dart format --set-exit-if-changed .

      - name: Analyze
        run: flutter analyze --fatal-infos --fatal-warnings

      - name: Generate code (build_runner)
        run: dart run build_runner build --delete-conflicting-outputs

      - name: Test
        run: flutter test --coverage --reporter expanded

      - name: Coverage gate
        run: |
          # Strip generated files from coverage
          lcov --remove coverage/lcov.info \
            'lib/generated/*' \
            '**/*.freezed.dart' \
            '**/*.g.dart' \
            -o coverage/lcov.cleaned.info

          coverage=$(lcov --summary coverage/lcov.cleaned.info 2>&1 \
            | grep -oP 'lines\.\.\.\.\.\.: \K[0-9.]+')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% < 80%"
            exit 1
          fi

      - name: Security scan
        run: |
          dart pub outdated --mode=null-safety --json > /tmp/outdated.json
          # Pana score (quality + maintenance)
          dart pub global activate pana
          pana --no-warning --json . > /tmp/pana.json

      - uses: codecov/codecov-action@<sha>
        with: { files: coverage/lcov.cleaned.info }

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: subosito/flutter-action@<sha>
        with: { channel: stable, cache: true }
      - run: flutter build apk --release
      - run: flutter build appbundle --release

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: subosito/flutter-action@<sha>
        with: { channel: stable, cache: true }
      - run: flutter build ios --release --no-codesign
```

## `pubspec.yaml` pinning

```yaml
name: myapp
description: ...
publish_to: 'none'

environment:
  sdk: ^3.5.0
  flutter: ^3.24.0

dependencies:
  flutter:
    sdk: flutter

  # Pinned to caret-range; specific minors / patches via lockfile
  freezed_annotation: ^2.4.4
  json_annotation: ^4.9.0
  riverpod: ^2.5.1
  go_router: ^14.2.7

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  build_runner: ^2.4.13
  freezed: ^2.5.7
  json_serializable: ^6.8.0
  mocktail: ^1.0.4
```

Lockfile (`pubspec.lock`) committed to git.

## `analysis_options.yaml` (strict)

```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
  errors:
    unused_import: error
    unused_local_variable: error
    unawaited_futures: error
    empty_catches: error
    avoid_catches_without_on_clauses: error
    avoid_print: error
    prefer_const_constructors: error
    avoid_dynamic_calls: error
    discarded_futures: error
    missing_provider_scope: error    # if using provider
  exclude:
    - '**/*.g.dart'
    - '**/*.freezed.dart'
    - 'build/**'

linter:
  rules:
    - always_declare_return_types
    - always_use_package_imports
    - avoid_relative_lib_imports
    - cancel_subscriptions
    - close_sinks
    - prefer_final_locals
    - prefer_final_fields
    - prefer_const_declarations
    - prefer_const_constructors
    - prefer_const_constructors_in_immutables
    - prefer_const_literals_to_create_immutables
    - require_trailing_commas
    - sort_pub_dependencies
    - test_types_in_equals
    - throw_in_finally
    - unawaited_futures
    - unsafe_html
    - use_super_parameters
    - use_decorated_box
    - use_colored_box
    - sized_box_for_whitespace
    - use_named_constants
    - prefer_typing_uninitialized_variables
```

## `dart_code_metrics` (deeper analysis)

```yaml
# analysis_options.yaml (or .metrics.yaml)
dart_code_metrics:
  metrics:
    cyclomatic-complexity: 7
    maximum-nesting-level: 3
    number-of-parameters: 5
    source-lines-of-code: 80
    halstead-volume: 200
  rules:
    - no-boolean-literal-compare
    - no-empty-block
    - no-equal-then-else
    - no-magic-number
    - no-object-declaration
    - prefer-conditional-expressions
    - prefer-correct-identifier-length
    - prefer-correct-type-name
    - prefer-extracting-callbacks
    - prefer-trailing-comma
    - avoid-cascade-after-if-null
    - avoid-collection-methods-with-unrelated-types
    - avoid-dynamic
    - avoid-global-state
    - avoid-late-keyword
    - avoid-nested-conditional-expressions
    - avoid-non-null-assertion
    - avoid-unrelated-type-assertions
    - prefer-async-await
    - prefer-immediate-return
    - prefer-iterable-of
    - prefer-match-file-name
    - tag-name
    - prefer-correct-edge-insets-constructor
    - avoid-returning-widgets
    - avoid-shrink-wrap-in-lists
    - avoid-wrapping-in-padding
    - prefer-correct-image-clip
    - prefer-extracting-callbacks
    - prefer-single-widget-per-file
```

## Cross-references

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/dart/no-discards.md`
- `~/.claude/rules-library/dart/testing.md`
- Effective Dart guide
- Flutter Lints (pub.dev/packages/flutter_lints)
- dart_code_metrics (pub.dev/packages/dart_code_metrics)

---

<!-- ============================================================
     Section: dart/no-discards.md
     ============================================================ -->

# Dart / Flutter — No-Discards Extension

> Auto-fires on every `*.dart`, `pubspec.yaml`, `pubspec.lock`,
> `analysis_options.yaml` file. Extends
> `~/.claude/rules-library/common/no-discards.md`. Tooling: `dart analyze`,
> `dart format`, `flutter analyze`, `dart_code_metrics`.

## Core Principle

**Every Future is awaited or explicitly handled; null safety is
non-negotiable; no `_` in catch parameters that swallow errors;
analyzer runs at strictest level with every recommended_lint and
flutter_lints rule enforced.**

## Banned patterns

### 1. Unawaited futures

```dart
// FORBIDDEN
void handle() {
  doAsync();  // fire-and-forget; error lost
}

// CORRECT
Future<void> handle() async {
  await doAsync();
}

// OR explicit + handled
void handle() {
  unawaited(doAsync().catchError((err, st) {
    log.warning('doAsync failed', err, st);
  }));
}
```

Lint: `unawaited_futures: error`. ENFORCED.

### 2. Empty catch / catch with `_` swallow

```dart
// FORBIDDEN
try { thing(); } catch (_) {}
try { thing(); } on Exception { }

// CORRECT
try {
  thing();
} on SpecificException catch (err, st) {
  log.warning('thing failed', err, st);
  rethrow;
}
```

Lint: `empty_catches: error`, `avoid_catches_without_on_clauses: error`.

### 3. Null assertion `!` without justification

```dart
// FORBIDDEN — bang propagates type holes
var name = user!.name;

// CORRECT
if (user == null) {
  return 'Anonymous';
}
return user.name;

// OR — null-aware
return user?.name ?? 'Anonymous';
```

### 4. `dynamic` type

```dart
// FORBIDDEN
dynamic parse(String json) => jsonDecode(json);

// CORRECT — typed return
Map<String, Object?> parse(String json) =>
    jsonDecode(json) as Map<String, Object?>;
```

### 5. `print()` in production code

```dart
// FORBIDDEN
print('debug: $x');

// CORRECT
import 'package:logging/logging.dart';
final _log = Logger('MyService');
_log.fine('debug', x);
```

Lint: `avoid_print: error`.

### 6. Unfreezable mutable state

```dart
// FORBIDDEN — public mutable list leaks
class Service {
  List<String> items = [];
}

// CORRECT — sealed access
class Service {
  final List<String> _items = [];
  List<String> get items => List.unmodifiable(_items);
  void addItem(String i) => _items.add(i);
}
```

### 7. Missing `const` on widgets (Flutter)

```dart
// FORBIDDEN — rebuilds unnecessarily
Text('Hello');

// CORRECT
const Text('Hello');
```

Lint: `prefer_const_constructors: error`.

### 8. setState during build (Flutter)

```dart
// FORBIDDEN — assertion failure at runtime
@override
Widget build(BuildContext ctx) {
  setState(() => x++);
  return ...;
}

// CORRECT — schedule for post-frame
@override
Widget build(BuildContext ctx) {
  WidgetsBinding.instance.addPostFrameCallback((_) {
    if (mounted) setState(() => x++);
  });
  return ...;
}
```

## Required `analysis_options.yaml`

```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
  errors:
    # Treat warnings as errors
    unused_import: error
    unused_local_variable: error
    unawaited_futures: error
    empty_catches: error
    avoid_catches_without_on_clauses: error
    avoid_print: error
    prefer_const_constructors: error
    avoid_dynamic_calls: error
    discarded_futures: error

linter:
  rules:
    - always_declare_return_types
    - always_use_package_imports
    - avoid_relative_lib_imports
    - cancel_subscriptions
    - close_sinks
    - prefer_final_locals
    - prefer_final_fields
    - prefer_const_declarations
    - require_trailing_commas
    - sort_pub_dependencies
    - test_types_in_equals
    - throw_in_finally
    - unawaited_futures
    - unsafe_html
    - use_super_parameters
```

## Verification block

```
Dart analyze (this turn):
  - dart analyze: 0 errors, 0 warnings
  - dart format --set-exit-if-changed: clean
  - flutter test --coverage: PASS (90%)
  - dart_code_metrics: 0 issues
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- Effective Dart guide (dart.dev/effective-dart)
- Flutter best practices

## Why this rule exists

Dart's optional null safety era ended with sound null safety
in 2.12 — yet `!` and `dynamic` still let codebases regress.
Unawaited futures are the leading source of "this works in dev,
crashes in prod under load." Lint at full strictness +
mandatory async-awaiting closes both.

---

<!-- ============================================================
     Section: dart/patterns.md
     ============================================================ -->

# Dart / Flutter Patterns

> Auto-fires on every `*.dart`, `pubspec.yaml`, `pubspec.lock`,
> `analysis_options.yaml` file. Standards: **Effective Dart**
> (dart.dev/effective-dart), **Flutter Architecture Guide**,
> **Flutter Performance Best Practices**, **Material 3 / Cupertino
> design guidelines**.

## Core Principle

**Const-everywhere for widgets (every constructor that CAN be
const IS const); separate widget tree (build) from app state
(provider / Riverpod / BLoC / GetX); immutable models; Sound
null safety enforced; async via Future + Stream; never block the
event loop; widgets are cheap, rebuilds are cheap when state is
scoped.**

## Project layout

```
lib/
├── main.dart
├── src/
│   ├── app.dart                     # MaterialApp + routing
│   ├── domain/                      # Pure Dart, no Flutter imports
│   │   ├── models/
│   │   ├── repositories/            # interfaces only
│   │   └── usecases/
│   ├── data/                        # Flutter-free where possible
│   │   ├── repositories/            # implementations
│   │   ├── sources/
│   │   │   ├── remote/              # http client
│   │   │   └── local/               # sqflite / hive
│   │   └── dtos/
│   └── presentation/
│       ├── features/
│       │   └── orders/
│       │       ├── controller/
│       │       ├── views/
│       │       └── widgets/
│       └── shared/
└── test/
    └── ...
```

## State management — pick ONE per project

| Library | When to use |
| --- | --- |
| **Riverpod** | New projects (recommended; compile-safe, testable) |
| **BLoC / flutter_bloc** | Event-stream + state-stream paradigm; complex state machines |
| **Provider** | Older codebases; simple cases |
| **GetX** | Avoid — couples routing / state / DI; obscures dependency graph |
| **Redux** | Only if your team is from a Redux-heavy background |

Riverpod example:

```dart
@riverpod
class OrderController extends _$OrderController {
  @override
  Future<List<Order>> build() async {
    final repo = ref.read(orderRepositoryProvider);
    return repo.listAll();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(orderRepositoryProvider);
      return repo.listAll();
    });
  }
}

// Widget consumes via Consumer or ConsumerWidget
class OrderListView extends ConsumerWidget {
  const OrderListView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(orderControllerProvider);
    return orders.when(
      data: (data) => ListView(/* ... */),
      loading: () => const CircularProgressIndicator(),
      error: (e, st) => ErrorView(message: '$e'),
    );
  }
}
```

## Immutable models — `freezed`

```dart
@freezed
class Order with _$Order {
  const factory Order({
    required String id,
    required String customerId,
    required List<LineItem> items,
    required Money total,
    @Default(OrderStatus.pending) OrderStatus status,
  }) = _Order;

  factory Order.fromJson(Map<String, Object?> json) => _$OrderFromJson(json);
}
```

`freezed` generates: `==`, `hashCode`, `copyWith`, JSON
serialisation, sealed-union variants.

## Sealed unions for state

```dart
@freezed
sealed class OrderState with _$OrderState {
  const factory OrderState.loading() = OrderLoading;
  const factory OrderState.loaded(Order order) = OrderLoaded;
  const factory OrderState.error(String message) = OrderError;
}

// Exhaustive switch
String describe(OrderState state) => switch (state) {
  OrderLoading() => 'loading',
  OrderLoaded(:final order) => 'loaded ${order.id}',
  OrderError(:final message) => 'error: $message',
};
```

## Widget construction — const everywhere possible

```dart
// WRONG — rebuilds child every parent rebuild
class Parent extends StatelessWidget {
  const Parent({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Hello'),     // not const
    );
  }
}

// RIGHT — const child = same instance every rebuild = no rebuild
class Parent extends StatelessWidget {
  const Parent({super.key});
  @override
  Widget build(BuildContext context) {
    return const Container(
      child: Text('Hello'),
    );
  }
}
```

Lint `prefer_const_constructors: error` enforces.

## Theme + design system

```dart
// theme/app_theme.dart
class AppTheme {
  static ThemeData light() => ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
    useMaterial3: true,
    textTheme: GoogleFonts.interTextTheme(),
  );

  static ThemeData dark() => ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.indigo,
      brightness: Brightness.dark,
    ),
    useMaterial3: true,
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
  );
}

// Use semantic tokens, NEVER raw hex / RGB in widgets
Container(
  color: Theme.of(context).colorScheme.primary,
  child: Text(
    'Hello',
    style: Theme.of(context).textTheme.titleMedium,
  ),
)
```

## Routing

```dart
// go_router — the modern Flutter standard
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (ctx, state) => const HomeView(),
    ),
    GoRoute(
      path: '/orders/:id',
      builder: (ctx, state) => OrderView(id: state.pathParameters['id']!),
    ),
  ],
);
```

## Async patterns

```dart
// Always await Futures
Future<User> fetchUser(String id) async {
  final response = await http.get(Uri.parse('/users/$id'));
  if (response.statusCode != 200) {
    throw HttpException('user fetch failed: ${response.statusCode}');
  }
  return User.fromJson(jsonDecode(response.body));
}

// Cancellation via cancellation tokens (with cancellation_token package)
// or via http.Client.close() / StreamSubscription.cancel()

// Stream for incremental data
Stream<Order> watchOrders() async* {
  while (true) {
    final batch = await fetchBatch();
    for (final order in batch) yield order;
    await Future.delayed(const Duration(seconds: 5));
  }
}
```

## Reuse-first

| Use case | Library |
| --- | --- |
| State management | Riverpod, BLoC |
| HTTP client | Dio, http |
| JSON | dart:convert + json_serializable / freezed |
| Local storage | drift (SQLite), hive, isar |
| Network image cache | cached_network_image |
| Logging | logger, talker |
| DI | get_it, Riverpod (built-in) |
| Forms | flutter_form_builder, reactive_forms |
| Animations | Rive, Lottie |
| i18n | flutter_localizations + intl |
| Maps | google_maps_flutter, flutter_map |
| Push | firebase_messaging, OneSignal Flutter |
| Auth | firebase_auth, supabase_flutter, auth0 |
| Bottom sheets / modals | Flutter built-in (ModalBottomSheet, Dialog) |

Per `~/.claude/rules-library/common/reuse-first.md`.

## Performance

```dart
// Use ListView.builder for long lists (lazy)
ListView.builder(
  itemCount: items.length,
  itemBuilder: (ctx, i) => OrderTile(order: items[i]),
)

// const constructors prevent rebuild
// RepaintBoundary for isolated repaints
// Profile mode (flutter run --profile) before optimising
// flutter_inspector to find heavy widgets
```

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/common/reuse-first.md`
- `~/.claude/rules-library/dart/coding-style.md`
- `~/.claude/rules-library/dart/no-discards.md`
- `~/.claude/rules-library/dart/security.md`
- Effective Dart (dart.dev/effective-dart)
- Flutter Architecture (docs.flutter.dev/data-and-backend/state-mgmt/options)
- Riverpod docs (riverpod.dev)
- freezed (pub.dev/packages/freezed)

---

<!-- ============================================================
     Section: dart/security.md
     ============================================================ -->

---
paths:
  - "**/*.dart"
---

# Dart/Flutter Security

> Extends `common/security.md` with Dart/Flutter-specific security.

## Secure Storage

Use `flutter_secure_storage` for tokens and secrets. Never store in SharedPreferences.

## Network Security

- Use HTTPS only
- Pin certificates for sensitive APIs
- Validate all server responses with Codable/JSON serialization

## Input Validation

Validate all user input before API calls. Use form validators and sanitize HTML content.

## Platform Channels

Validate all data crossing platform channel boundaries. Never trust native-side input.

---

<!-- ============================================================
     Section: dart/testing.md
     ============================================================ -->

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

---
