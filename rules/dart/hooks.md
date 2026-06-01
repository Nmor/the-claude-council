# Dart / Flutter Hooks

> Auto-fires on every `*.dart`, `pubspec.yaml`, `pubspec.lock`,
> `analysis_options.yaml`, `build.yaml` file. Sister to
> `~/.claude/rules/common/hooks.md`.

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

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/dart/no-discards.md`
- `~/.claude/rules/dart/testing.md`
- Effective Dart guide
- Flutter Lints (pub.dev/packages/flutter_lints)
- dart_code_metrics (pub.dev/packages/dart_code_metrics)
