# Dart / Flutter — No-Discards Extension

> Auto-fires on every `*.dart`, `pubspec.yaml`, `pubspec.lock`,
> `analysis_options.yaml` file. Extends
> `~/.claude/rules/common/no-discards.md`. Tooling: `dart analyze`,
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

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- Effective Dart guide (dart.dev/effective-dart)
- Flutter best practices

## Why this rule exists

Dart's optional null safety era ended with sound null safety
in 2.12 — yet `!` and `dynamic` still let codebases regress.
Unawaited futures are the leading source of "this works in dev,
crashes in prod under load." Lint at full strictness +
mandatory async-awaiting closes both.
