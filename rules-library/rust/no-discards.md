# Rust — No-Discards Extension

> Auto-fires on every `*.rs`, `Cargo.toml` file. Extends
> `~/.claude/rules/common/no-discards.md`. Tooling: `cargo clippy
> -- -D warnings -W clippy::pedantic -W clippy::nursery`,
> `cargo audit`, `cargo deny check`, `cargo fmt --check`.

## Core Principle

**No `unwrap()` outside tests; no `let _ = ...` discards; every
`Result` is `?`-propagated or matched; no `panic!` in library
code; no `unsafe` outside documented Safety blocks; every
`#[allow(...)]` carries a justification comment.**

## Banned patterns

### 1. `unwrap()` / `expect()` in production code

```rust
// FORBIDDEN — panics on None / Err
let user = repo.find(id).unwrap();
let url = Url::parse(input).unwrap();

// CORRECT — propagate via `?`
let user = repo.find(id)?
    .ok_or(Error::UserNotFound(id))?;
let url = Url::parse(input)
    .map_err(|e| Error::InvalidUrl(input.into(), e))?;

// CORRECT in tests — `expect` with reason
#[test]
fn it_works() {
    let v = some_call().expect("some_call should succeed in this test");
}
```

Clippy: `clippy::unwrap_used`, `clippy::expect_used` (pedantic).
ENFORCED outside tests.

### 2. `let _ = ...` to discard a Result

```rust
// FORBIDDEN — silently throws away the error
let _ = file.write_all(data);
let _ = tx.send(message);

// CORRECT
if let Err(e) = file.write_all(data) {
    tracing::warn!(error = ?e, "write failed");
}

// Or propagate
file.write_all(data)
    .map_err(|e| Error::Write(path.to_owned(), e))?;
```

Clippy: `clippy::let_underscore_must_use`. ENFORCED.

### 3. `panic!` / `todo!` / `unimplemented!` in production

```rust
// FORBIDDEN — production code panics
fn divide(a: u64, b: u64) -> u64 {
    if b == 0 { panic!("zero divisor") }
    a / b
}

// CORRECT — return Result
fn divide(a: u64, b: u64) -> Result<u64, DivisionError> {
    if b == 0 { return Err(DivisionError::ByZero) }
    Ok(a / b)
}
```

`#[deny(clippy::panic, clippy::todo, clippy::unimplemented)]` in
library crates.

### 4. Ignoring iterator-returned values

```rust
// FORBIDDEN — collect() into Result<Vec<_>, _> dropped
items.iter().map(|i| validate(i)).collect::<Result<Vec<_>, _>>();

// CORRECT — bind + handle
let validated: Vec<_> = items
    .iter()
    .map(|i| validate(i))
    .collect::<Result<_, _>>()?;
```

### 5. Undocumented `unsafe`

```rust
// FORBIDDEN
unsafe { *ptr = 5; }

// CORRECT — every unsafe block has SAFETY: docs
// SAFETY: caller guarantees `ptr` is non-null, properly aligned,
// and points to a valid `T` for the lifetime of this function.
unsafe { *ptr = 5; }
```

Crate root: `#![deny(unsafe_op_in_unsafe_fn)]` makes safety
review explicit at each operation.

### 6. `#[allow(...)]` without justification

```rust
// FORBIDDEN — silences the lint with no reason
#[allow(clippy::too_many_arguments)]
fn handle(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) { ... }

// CORRECT — refactor the function
fn handle(req: HandleRequest) { ... }

// CORRECT IF unavoidable — justify
// allow: HTTP handler signature is dictated by axum; cannot reduce
#[allow(clippy::too_many_arguments)]
fn axum_handler(...) { ... }
```

### 7. `clone()` to dodge the borrow checker

```rust
// FORBIDDEN — clone hiding a real lifetime issue
fn process(s: &String) -> String {
    let copy = s.clone();
    transform(copy)
}

// CORRECT — borrow correctly
fn process(s: &str) -> String {
    transform(s.to_owned())
}
```

Clippy: `clippy::redundant_clone`. ENFORCED.

### 8. `String::from("")` / `vec![]` allocations in hot paths

```rust
// FORBIDDEN in hot paths
let empty = String::from("");
let empty_vec: Vec<u8> = vec![];

// CORRECT
let empty = String::new();
let empty_vec: Vec<u8> = Vec::new();
```

Clippy: `clippy::manual_string_new`.

### 9. `mem::forget` (memory leak)

```rust
// FORBIDDEN — leaks the destructor
std::mem::forget(value);

// CORRECT — let it drop, or document why forget is intentional
drop(value);
```

Unless the type genuinely needs to outlive its scope (FFI
handles), forgetting is a leak.

### 10. Implicit `as` casts that lose precision

```rust
// FORBIDDEN — silent truncation
let n: i32 = large_u64 as i32;

// CORRECT — TryFrom + handle the error
let n: i32 = i32::try_from(large_u64)
    .map_err(|_| Error::Overflow(large_u64))?;
```

Clippy: `clippy::cast_possible_truncation`,
`clippy::cast_sign_loss`. ENFORCED (pedantic).

### 11. `println!` / `eprintln!` in product code

```rust
// FORBIDDEN
println!("processing: {}", id);

// CORRECT — tracing
use tracing::{info, debug};
info!(id, "processing");
```

CLI tools may use `println!` for stdout output (the product
contract); product libraries use `tracing`.

### 12. Hardcoded credentials

```rust
// FORBIDDEN
const STRIPE_KEY: &str = "sk_live_...";

// CORRECT
let stripe_key = std::env::var("STRIPE_KEY")
    .map_err(|_| Error::MissingEnv("STRIPE_KEY"))?;
```

The PostToolUse `no-discards` hook blocks edits introducing
known key prefixes.

### 13. `time::SystemTime` / `Instant::now()` without injection

Per `~/.claude/rules/common/no-ambient-globals.md` — inject a
`Clock` trait.

```rust
pub trait Clock: Send + Sync {
    fn now(&self) -> DateTime<Utc>;
}

pub struct SystemClock;
impl Clock for SystemClock {
    fn now(&self) -> DateTime<Utc> { Utc::now() }
}

pub struct FixedClock(DateTime<Utc>);
impl Clock for FixedClock {
    fn now(&self) -> DateTime<Utc> { self.0 }
}
```

### 14. Mutable static state

```rust
// FORBIDDEN
static mut COUNTER: u64 = 0;

// CORRECT — atomic or DI
use std::sync::atomic::{AtomicU64, Ordering};
static COUNTER: AtomicU64 = AtomicU64::new(0);
COUNTER.fetch_add(1, Ordering::Relaxed);
```

`#[deny(clippy::mut_static)]`.

### 15. Range-loop discards

```rust
// FORBIDDEN
for (_, v) in map.iter() { ... }

// CORRECT
for v in map.values() { ... }

// FORBIDDEN
for (_, item) in items.iter().enumerate() { ... }

// CORRECT
for item in items.iter() { ... }
```

## Required `Cargo.toml` lints

```toml
[lints.rust]
unsafe_code = "forbid"            # or "deny" if unsafe is genuinely required
missing_docs = "warn"
unsafe_op_in_unsafe_fn = "deny"
unreachable_pub = "warn"
unused_lifetimes = "warn"
unused_qualifications = "warn"

[lints.clippy]
all = "deny"
pedantic = "warn"
nursery = "warn"
cargo = "warn"

# Hard bans
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
todo = "deny"
unimplemented = "deny"
let_underscore_must_use = "deny"
mem_forget = "deny"
mut_mut = "deny"
cast_possible_truncation = "deny"
cast_possible_wrap = "deny"
cast_sign_loss = "deny"

# Allowed exceptions
module_name_repetitions = "allow"
missing_errors_doc = "warn"
missing_panics_doc = "warn"
```

Per-crate test override (tests may unwrap):

```rust
// In tests/ or #[cfg(test)] modules:
#![cfg_attr(test, allow(clippy::unwrap_used, clippy::expect_used))]
```

## Verification block

```text
Rust sweep (this turn):
  - cargo fmt --check: clean
  - cargo clippy --all-targets --all-features -- -D warnings: 0 issues
  - cargo test --all-features: PASS (coverage 88%)
  - cargo audit: no vulnerabilities
  - cargo deny check: clean
```

## Cross-references

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- `~/.claude/rules/common/error-handling-with-context.md`
- `~/.claude/rules/common/no-ambient-globals.md`
- `~/.claude/rules/rust/coding-style.md`
- `~/.claude/rules/rust/patterns.md`
- The Rust API Guidelines
- Clippy lint list (rust-lang.github.io/rust-clippy/master/)
