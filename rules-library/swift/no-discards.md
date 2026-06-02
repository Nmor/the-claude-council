# Swift — No-Discards Extension

> Auto-fires on every `*.swift`, `Package.swift`, `*.xcconfig` file.
> Extends `~/.claude/rules/common/no-discards.md`. Tooling: SwiftLint
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

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- Apple Swift API Design Guidelines
- swift.org coding style

## Why this rule exists

Swift's force-unwrap (`!`) was meant for clearly-safe cases but
became a habitual shortcut. `try!` even more so. Combined with
implicit unwraps and ignored Results, Swift code that "compiles
clean" can crash in production at the first nil. The rules
above + strict SwiftLint configuration close these patterns.
