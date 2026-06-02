# Swift Hooks

> Auto-fires on every `*.swift`, `Package.swift`, `Package.resolved`,
> `*.xcconfig`, `*.xcodeproj/**`, `*.xcworkspace/**`,
> `Project.yml`, `*.swiftlint.yml`, `.swiftformat` file. Sister to
> `~/.claude/rules/common/hooks.md`.

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

See `~/.claude/rules/swift/no-discards.md` for the strict config:

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
`~/.claude/rules/common/secrets-management.md`), NEVER from a
checked-in file.

## Cross-references

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/common/secrets-management.md`
- `~/.claude/rules/swift/no-discards.md`
- `~/.claude/rules/swift/testing.md`
- SwiftLint docs (realm.github.io/SwiftLint)
- SwiftFormat docs (github.com/nicklockwood/SwiftFormat)
- Swift Package Manager docs (swift.org/package-manager)
