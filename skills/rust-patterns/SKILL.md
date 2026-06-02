---
name: rust-patterns
description: Rust idioms — ownership-first design; types encode invariants (newtype pattern for UserId / Cents / etc.); errors as values (Result<T, E> + thiserror for libs + anyhow for apps); enums for closed sets (exhaustive match); builders for many-optional inputs; protocol-style traits for ports (dependency inversion); DI via struct composition (Arc<dyn Trait>); async/await + tokio with structured concurrency (try_join! / JoinSet); no .unwrap() outside tests (use ? or expect with reason); no panic! in library code; cargo clippy --pedantic; cargo audit + cargo deny. Auto-fires on Rust source.
paths:
  - "**/*.rs"
  - "Cargo.toml"
  - "**/Cargo.toml"
  - "Cargo.lock"
  - "**/Cargo.lock"
  - "rust-toolchain.toml"
  - "**/rust-toolchain.toml"
  - "**/.cargo/config.toml"
---

> Migrated 2026-06-02 from `~/.claude/rules-library/rust/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# rust-patterns

<!-- ============================================================
     Section: rust/coding-style.md
     ============================================================ -->

# Rust Coding Style

> Auto-fires on every `*.rs`, `Cargo.toml`, `Cargo.lock` file.
> Standards: **The Rust API Guidelines**, **The Rustonomicon**,
> **RFC track**, **rustfmt default**, **clippy pedantic + nursery
>
> - cargo**.

## Core Principle

**Borrow checker is the contract; lifetimes are explicit when
necessary; `Result<T, E>` for fallible operations (NEVER panic in
library code); `Option<T>` for nullable; ownership transferred via
`move` where intent matters; rustfmt + clippy at maximum.**

## Naming

- Type: `PascalCase` — `OrderService`, `Money`
- Trait: `PascalCase` — `Display`, `Iterator`
- Function / method / variable: `snake_case` — `calculate_total`
- Constant: `SCREAMING_SNAKE_CASE` — `MAX_RETRIES`
- Module: `snake_case` — `payments::stripe`
- Lifetime: short, single-letter `'a`, `'b` — or named when meaningful

## Ownership + borrowing

```rust
// Take by value when you'll own
fn consume_order(order: Order) { ... }

// Borrow when you only read
fn display(order: &Order) { ... }

// Mutable borrow when you'll modify
fn ship(order: &mut Order) { ... }

// `Cow` (Clone-on-Write) when you might own
use std::borrow::Cow;
fn process(s: Cow<'_, str>) { ... }
```

## Error handling

```rust
// Prefer `Result<T, E>` for any fallible operation
pub fn parse_money(input: &str) -> Result<Money, ParseError> {
    let cents: u64 = input.parse().map_err(|e| ParseError::Invalid(e))?;
    Ok(Money::new(cents))
}

// thiserror for library errors (deriving Display + Error)
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("invalid number: {0}")]
    Invalid(#[from] std::num::ParseIntError),

    #[error("negative amount not allowed: {0}")]
    Negative(i64),
}

// anyhow for application errors (with context)
use anyhow::{Context, Result};

fn load_config(path: &Path) -> Result<Config> {
    let bytes = std::fs::read(path)
        .with_context(|| format!("reading config {}", path.display()))?;
    serde_json::from_slice(&bytes)
        .context("parsing config")
}
```

## Modules + visibility

```rust
// lib.rs
pub mod payments;
pub mod orders;

mod internal_helpers;  // not public

// orders/mod.rs (or orders.rs in newer modules)
mod service;
mod repository;

pub use service::OrderService;
pub use repository::OrderRepository;
```

## Idioms

```rust
// `if let` pattern matching
if let Some(user) = find_user(id) {
    process(user);
}

// `match` for closed enums
match status {
    Status::Pending => 0,
    Status::Paid => 1,
    Status::Shipped => 2,
}

// `?` for early-return propagation
fn process(req: Request) -> Result<Response, Error> {
    let user = validate(&req)?;
    let order = fetch_order(user.id)?;
    let receipt = charge(&order)?;
    Ok(Response::ok(receipt))
}

// Iterator chains over imperative loops
let total: u64 = items.iter()
    .filter(|i| i.taxable)
    .map(|i| i.price)
    .sum();

// Builder pattern for many-optional inputs
let req = HttpRequest::builder()
    .method(Method::POST)
    .url("https://api.example.com/orders")
    .header("authorization", token)
    .body(body)
    .build()?;
```

## Async (tokio)

```rust
#[tokio::main]
async fn main() -> Result<()> {
    let order = fetch_order(1).await?;
    process(order).await?;
    Ok(())
}

// Concurrent execution
use tokio::try_join;
let (orders, payments) = try_join!(
    fetch_orders(user_id),
    fetch_payments(user_id)
)?;
```

## Required `Cargo.toml` setup

```toml
[package]
name = "myapp"
version = "0.1.0"
edition = "2021"
rust-version = "1.83"  # MSRV

[lints.rust]
unsafe_code = "forbid"
missing_docs = "warn"

[lints.clippy]
all = "deny"
pedantic = "warn"
nursery = "warn"
cargo = "warn"

# explicit overrides
module_name_repetitions = "allow"   # often noisy
missing_errors_doc = "warn"
missing_panics_doc = "warn"
```

## rustfmt.toml

```toml
edition = "2021"
max_width = 100
hard_tabs = false
tab_spaces = 4
newline_style = "Unix"
use_field_init_shorthand = true
use_try_shorthand = true
```

## Required tooling

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
cargo audit
cargo deny check
cargo doc --no-deps --all-features
```

## Cross-references

- `~/.claude/rules-library/common/coding-style.md`
- `~/.claude/rules-library/rust/no-discards.md`
- `~/.claude/rules-library/rust/security.md`
- `~/.claude/rules-library/rust/testing.md`
- `~/.claude/rules-library/rust/patterns.md`
- The Rust API Guidelines
- The Rust Programming Language ("The Book")
- Rustonomicon (unsafe Rust)

---

<!-- ============================================================
     Section: rust/hooks.md
     ============================================================ -->

# Rust Hooks

> Auto-fires on every `*.rs`, `Cargo.toml`, `Cargo.lock` file.
> Sister to `~/.claude/rules-library/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Run only on staged Rust files for speed
staged_rust=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.rs$' || true)

if [ -n "$staged_rust" ]; then
    cargo fmt -- --check
    cargo clippy --all-targets --all-features -- -D warnings
fi

# Cargo.toml change triggers dep checks
if git diff --cached --name-only | grep -qE '^Cargo\.(toml|lock)$'; then
    cargo audit
    cargo deny check
fi
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cargo test --all-features
```

## CI workflow

```yaml
name: Rust CI

on: [push, pull_request]

env:
  CARGO_TERM_COLOR: always
  RUSTFLAGS: "-D warnings"

jobs:
  fmt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: dtolnay/rust-toolchain@<sha>
        with: { toolchain: stable, components: rustfmt }
      - run: cargo fmt --all -- --check

  clippy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: dtolnay/rust-toolchain@<sha>
        with: { toolchain: stable, components: clippy }
      - uses: Swatinem/rust-cache@<sha>
      - run: cargo clippy --all-targets --all-features -- -D warnings

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: dtolnay/rust-toolchain@<sha>
        with: { toolchain: stable }
      - uses: Swatinem/rust-cache@<sha>
      - run: cargo test --all-features
      - run: cargo install cargo-llvm-cov
      - run: cargo llvm-cov --workspace --fail-under-lines 80 --lcov --output-path lcov.info
      - uses: codecov/codecov-action@<sha>
        with: { files: lcov.info }

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: dtolnay/rust-toolchain@<sha>
        with: { toolchain: stable }
      - run: cargo install cargo-audit cargo-deny
      - run: cargo audit --deny warnings
      - run: cargo deny check

  msrv:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: dtolnay/rust-toolchain@<sha>
        with: { toolchain: "1.83" }  # MSRV from Cargo.toml
      - run: cargo build --workspace --all-features
```

## `deny.toml` (the cargo-deny policy)

```toml
[graph]
all-features = true

[advisories]
db-path = "~/.cargo/advisory-db"
vulnerability = "deny"
unmaintained = "deny"
notice = "warn"
yanked = "deny"

[bans]
multiple-versions = "warn"
deny = [
    { name = "openssl-sys", reason = "prefer rustls" },
    { name = "time", version = "<0.3", reason = "0.1 / 0.2 are EOL" },
]

[licenses]
allow = [
    "MIT", "Apache-2.0", "Apache-2.0 WITH LLVM-exception",
    "BSD-2-Clause", "BSD-3-Clause", "ISC",
    "Unicode-DFS-2016", "0BSD", "MPL-2.0", "CC0-1.0",
    "Zlib", "BlueOak-1.0.0",
]
deny = ["GPL-3.0", "AGPL-3.0", "SSPL-1.0", "BUSL-1.1"]
confidence-threshold = 0.93

[sources]
unknown-registry = "deny"
unknown-git = "deny"
allow-registry = ["https://github.com/rust-lang/crates.io-index"]
```

## `rust-toolchain.toml`

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy", "rust-src"]
profile = "minimal"
```

## Cross-references

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/common/license-allowlist-gate.md`
- `~/.claude/rules-library/rust/no-discards.md`
- `~/.claude/rules-library/rust/testing.md`
- cargo-deny docs (embarkstudios.github.io/cargo-deny)

---

<!-- ============================================================
     Section: rust/no-discards.md
     ============================================================ -->

# Rust — No-Discards Extension

> Auto-fires on every `*.rs`, `Cargo.toml` file. Extends
> `~/.claude/rules-library/common/no-discards.md`. Tooling: `cargo clippy
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

Per `~/.claude/rules-library/common/no-ambient-globals.md` — inject a
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

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- `~/.claude/rules-library/common/error-handling-with-context.md`
- `~/.claude/rules-library/common/no-ambient-globals.md`
- `~/.claude/rules-library/rust/coding-style.md`
- `~/.claude/rules-library/rust/patterns.md`
- The Rust API Guidelines
- Clippy lint list (rust-lang.github.io/rust-clippy/master/)

---

<!-- ============================================================
     Section: rust/patterns.md
     ============================================================ -->

# Rust Patterns

> Auto-fires on every `*.rs` file. Standards: **Rust API Guidelines**,
> **Rust Design Patterns book (rust-unofficial)**, **Tokio Tutorial**,
> **The Rustonomicon**, **Effective Rust (David Drysdale)**.

## Core Principle

**Ownership-first design; types encode invariants; errors are values
(`Result<T, E>`), not exceptions; iterators over loops; async via
tokio with structured concurrency; no premature abstraction via
traits (concrete first, generic later).**

## Module + workspace layout

```text
my-app/
├── Cargo.toml                # workspace root
├── crates/
│   ├── domain/               # pure domain types (no I/O)
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── infra/                # adapters (DB, HTTP client)
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── web/                  # HTTP handlers (axum / actix)
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── app/                  # binary
│       ├── Cargo.toml
│       └── src/main.rs
└── deny.toml                 # cargo-deny policy
```

Domain depends on NOTHING. Infra depends on domain. Web depends on
domain + infra. App depends on everything; wires the graph.

## Newtype pattern (encode invariants in types)

```rust
// WRONG — primitive obsession
fn charge(amount: u64, user_id: String) -> Result<(), Error> { ... }

// RIGHT — newtype each domain concept
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UserId(pub uuid::Uuid);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Cents(u64);

impl Cents {
    pub fn new(c: u64) -> Self { Self(c) }
    pub fn value(self) -> u64 { self.0 }
}

fn charge(amount: Cents, user_id: UserId) -> Result<(), ChargeError> { ... }
```

Mixing up `UserId` and `OrgId` becomes a compile error, not a runtime
mystery.

## Enums for closed sets

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum OrderStatus {
    Pending,
    Paid,
    Shipped,
    Cancelled { reason: CancellationReason },
}

// Exhaustive match — compiler enforces every case
pub fn next_state(status: OrderStatus) -> Option<OrderStatus> {
    match status {
        OrderStatus::Pending => Some(OrderStatus::Paid),
        OrderStatus::Paid => Some(OrderStatus::Shipped),
        OrderStatus::Shipped => None,
        OrderStatus::Cancelled { .. } => None,
    }
}
```

## Builder pattern

```rust
pub struct OrderQuery {
    customer_id: Option<UserId>,
    status: Option<OrderStatus>,
    since: Option<DateTime<Utc>>,
}

impl OrderQuery {
    pub fn new() -> Self {
        Self { customer_id: None, status: None, since: None }
    }
    pub fn customer(mut self, id: UserId) -> Self {
        self.customer_id = Some(id); self
    }
    pub fn status(mut self, s: OrderStatus) -> Self {
        self.status = Some(s); self
    }
    pub fn since(mut self, t: DateTime<Utc>) -> Self {
        self.since = Some(t); self
    }
}
```

## Traits for ports (dependency inversion)

```rust
// domain — defines the port
pub trait OrderRepository: Send + Sync {
    async fn save(&self, order: &Order) -> Result<(), RepoError>;
    async fn find(&self, id: OrderId) -> Result<Option<Order>, RepoError>;
}

// infra — implements the port
pub struct PgOrderRepository {
    pool: sqlx::PgPool,
}

#[async_trait::async_trait]
impl OrderRepository for PgOrderRepository {
    async fn save(&self, order: &Order) -> Result<(), RepoError> {
        sqlx::query!(...).execute(&self.pool).await
            .map_err(|e| RepoError::Storage(e.to_string()))?;
        Ok(())
    }
    // ...
}
```

## Dependency injection via struct composition

```rust
#[derive(Clone)]
pub struct AppState {
    pub orders: Arc<dyn OrderRepository>,
    pub payments: Arc<dyn PaymentGateway>,
    pub clock: Arc<dyn Clock>,
}

#[axum::async_trait]
pub async fn place_order(
    State(state): State<AppState>,
    Json(req): Json<PlaceOrderRequest>,
) -> Result<Json<Order>, ApiError> {
    let order = Order::new(req, state.clock.now())?;
    state.orders.save(&order).await?;
    Ok(Json(order))
}
```

## Async (tokio idioms)

```rust
// Spawning + joining
let (orders, payments) = tokio::try_join!(
    fetch_orders(user_id),
    fetch_payments(user_id)
)?;

// Cancellation propagation
let handle = tokio::spawn(async move { do_work().await });
tokio::time::sleep(Duration::from_secs(30)).await;
handle.abort();  // cancels via drop

// Structured concurrency — JoinSet
use tokio::task::JoinSet;
let mut set = JoinSet::new();
for id in ids {
    set.spawn(process_one(id));
}
while let Some(res) = set.join_next().await {
    res??;
}
```

## Reuse-first (per `~/.claude/rules-library/common/reuse-first.md`)

| Use case | Canonical crate |
| --- | --- |
| HTTP server | axum, actix-web |
| HTTP client | reqwest, hyper |
| Async runtime | tokio |
| SQL (postgres) | sqlx |
| Serialisation | serde + serde_json |
| Error handling | thiserror (libraries) + anyhow (apps) |
| Logging | tracing + tracing-subscriber |
| CLI | clap |
| TOML | toml |
| Date/time | chrono OR jiff |
| UUID | uuid |
| Async trait | async-trait |
| Mocks | mockall |
| Snapshot tests | insta |
| Property tests | proptest |

## Anti-patterns

### Anti-pattern 1: `Rc<RefCell<T>>` everywhere

Avoid except in single-threaded UI code (egui, dioxus). Server code
uses `Arc<Mutex<T>>` or message passing.

### Anti-pattern 2: Generic-over-everything

```rust
// WRONG — premature generic abstraction
fn process<T: Order + Send + Sync + 'static, R: Repo<T>>(...) { ... }

// RIGHT — concrete first
fn process(order: Order, repo: &dyn OrderRepository) { ... }
```

Add generics ONLY when a second concrete use case appears.

### Anti-pattern 3: `unwrap()` in production

Per `rust/no-discards.md` rule 1. Use `?` or `expect("reason")`.

### Anti-pattern 4: `Box<dyn Error>` everywhere

Library code uses concrete error enums (via thiserror); apps may
use anyhow at the top of the call stack only.

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/common/reuse-first.md`
- `~/.claude/rules-library/rust/coding-style.md`
- `~/.claude/rules-library/rust/no-discards.md`
- Rust Design Patterns book (rust-unofficial.github.io)
- Tokio Tutorial
- Effective Rust (Drysdale)

---

<!-- ============================================================
     Section: rust/security.md
     ============================================================ -->

# Rust Security

> Auto-fires on every `*.rs`, `Cargo.toml` file. Sister to
> `~/.claude/rules-library/common/security.md`. Tooling: `cargo audit`,
> `cargo deny`, `cargo geiger` (unsafe usage detector), `cargo
> outdated`.

## Core Principle

**`unsafe_code = "forbid"` at crate root unless explicitly
required; every `unsafe` block is documented with safety
invariants; dependencies vetted via `cargo-deny` policy; no
network in tests without `wiremock` stubbing; secrets in env / vault;
crypto via `ring`, `rustls`, or platform-native crates.**

## OWASP — Rust specifics

### A02 — Cryptographic Failures

```rust
// FORBIDDEN — `openssl` crate's MD5 / SHA-1 for security purposes
// CORRECT for hashing — use SHA-2/3
use sha2::{Sha256, Digest};
let mut hasher = Sha256::new();
hasher.update(b"input");
let result = hasher.finalize();

// CORRECT for passwords — Argon2id
use argon2::{Argon2, password_hash::{PasswordHasher, SaltString}};
use argon2::password_hash::rand_core::OsRng;

let salt = SaltString::generate(&mut OsRng);
let argon = Argon2::default();
let hash = argon.hash_password(password.as_bytes(), &salt)?.to_string();

// CORRECT for symmetric encryption — AES-256-GCM via `ring`
use ring::aead;
let key = aead::UnboundKey::new(&aead::AES_256_GCM, key_bytes)?;
let key = aead::LessSafeKey::new(key);
// nonce + AAD + sealing
```

### A03 — Injection

```rust
// SQL — always parameterised via sqlx / diesel
let user: User = sqlx::query_as!(User,
    "SELECT * FROM users WHERE id = $1", user_id)
    .fetch_one(&pool).await?;

// Command — never shell out with user input
// FORBIDDEN
Command::new("sh").args(["-c", &user_input]).output()?;

// CORRECT
Command::new("ls").arg(&user_input).output()?;
```

### A06 — Vulnerable Components

```bash
cargo audit                  # RustSec Advisory DB
cargo deny check advisories  # same + license + bans
cargo outdated --workspace   # what could be bumped
```

`deny.toml`:

```toml
[advisories]
db-path = "~/.cargo/advisory-db"
vulnerability = "deny"
unmaintained = "deny"
notice = "warn"
yanked = "deny"

[bans]
multiple-versions = "warn"
deny = [
    { name = "openssl-sys", reason = "prefer rustls or ring" },
]

[licenses]
allow = [
    "MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause",
    "ISC", "Unicode-DFS-2016", "0BSD", "MPL-2.0", "CC0-1.0"
]
deny = ["GPL-3.0", "AGPL-3.0", "SSPL-1.0", "BUSL-1.1"]
```

### A07 — Authentication

- JWT — `jsonwebtoken` crate with explicit algorithm validation
  (NEVER `none`)
- Argon2id for passwords
- OAuth — `oauth2` crate
- Session cookies: `__Host-` prefix, `Secure`, `HttpOnly`,
  `SameSite=Strict`

### A10 — SSRF

```rust
use std::net::IpAddr;

fn validate_url(url: &Url) -> Result<(), Error> {
    let host = url.host_str().ok_or(Error::InvalidHost)?;

    // Resolve + check
    let ips: Vec<IpAddr> = (host, 0).to_socket_addrs()?
        .map(|a| a.ip())
        .collect();

    for ip in &ips {
        if ip.is_private() || ip.is_loopback() || ip.is_link_local() {
            return Err(Error::PrivateNetwork);
        }
        // also block 169.254.169.254 (AWS IMDS)
        if let IpAddr::V4(v4) = ip {
            if v4.octets() == [169, 254, 169, 254] {
                return Err(Error::ImdsBlocked);
            }
        }
    }
    Ok(())
}
```

## `unsafe` discipline

```rust
// FORBIDDEN — undocumented unsafe
unsafe {
    let p = some_ptr;
    *p = 5;
}

// CORRECT — every `unsafe` block carries Safety: docs
/// # Safety
///
/// The caller must ensure:
/// - `ptr` is non-null and properly aligned for `T`
/// - `ptr` points to a valid `T` for the lifetime `'a`
/// - No other reference to `*ptr` exists for the duration
unsafe fn deref_ptr<'a, T>(ptr: *const T) -> &'a T {
    // SAFETY: caller guaranteed pointer validity (see fn docs)
    unsafe { &*ptr }
}
```

`#[deny(unsafe_op_in_unsafe_fn)]` makes safety review explicit.

## Secrets

- `dotenvy` for dev; env vars for prod
- `secrecy` crate — wraps secrets in `Secret<T>` that won't print
  via Debug
- Per `~/.claude/rules-library/common/secrets-management.md`

## Required tooling

```bash
cargo audit
cargo deny check
cargo geiger
cargo clippy -- -D warnings
cargo fmt --check
cargo test
```

## Cross-references

- `~/.claude/rules-library/common/security.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/rust/no-discards.md`
- `~/.claude/rules-library/rust/coding-style.md`
- RustSec Advisory Database
- Secure Rust Guidelines (ANSSI)

---

<!-- ============================================================
     Section: rust/testing.md
     ============================================================ -->

# Rust Testing

> Auto-fires on every `tests/**`, `src/**/*test*`, `benches/**`,
> `examples/**` file. Standards: built-in `cargo test`, **proptest**,
> **insta** (snapshot), **mockall** (mocks), **tokio-test**,
> **wiremock**, **criterion** (bench).

## Core Principle

**Tests in `#[cfg(test)] mod tests` for unit; `tests/` directory for
integration; `proptest` / `quickcheck` for properties; `insta` for
snapshot tests; `tokio::test` for async; coverage via
`cargo-tarpaulin` or `cargo-llvm-cov`.**

## Test layout

```rust
// src/lib.rs or src/<module>.rs
pub fn calculate_total(items: &[Item]) -> u64 {
    items.iter().map(|i| i.price).sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_items_total_zero() {
        assert_eq!(calculate_total(&[]), 0);
    }

    #[test]
    fn sums_prices() {
        let items = vec![item(100), item(200)];
        assert_eq!(calculate_total(&items), 300);
    }

    fn item(price: u64) -> Item {
        Item { price, ..Default::default() }
    }
}
```

```rust
// tests/integration_test.rs — separate crate; only public API visible
use myapp::OrderService;

#[tokio::test]
async fn places_an_order() {
    let svc = OrderService::new(test_db().await);
    let order = svc.place(order_request()).await.unwrap();
    assert_eq!(order.status, Status::Pending);
}
```

## Property-based testing

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn calculate_total_never_panics(prices in prop::collection::vec(0u64..1_000_000, 0..1000)) {
        let items: Vec<_> = prices.iter().map(|&p| Item { price: p, .. }).collect();
        calculate_total(&items);  // any panic = failure
    }

    #[test]
    fn calculate_total_equals_sum(prices in prop::collection::vec(0u64..1_000_000, 0..1000)) {
        let expected: u64 = prices.iter().sum();
        let items: Vec<_> = prices.iter().map(|&p| Item { price: p, .. }).collect();
        prop_assert_eq!(calculate_total(&items), expected);
    }
}
```

## Async testing (tokio)

```rust
#[tokio::test]
async fn fetches_user() {
    let svc = test_service().await;
    let user = svc.fetch_user(1).await.unwrap();
    assert_eq!(user.id, 1);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn concurrent_writes() {
    let pool = test_pool().await;
    let tasks: Vec<_> = (0..100).map(|i| {
        let p = pool.clone();
        tokio::spawn(async move { write_record(&p, i).await })
    }).collect();
    for t in tasks {
        t.await.unwrap().unwrap();
    }
}
```

## HTTP mocking

```rust
use wiremock::{Mock, MockServer, ResponseTemplate};
use wiremock::matchers::{method, path};

#[tokio::test]
async fn calls_external_api() {
    let mock = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/users/1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"id": 1})))
        .mount(&mock)
        .await;

    let client = ApiClient::new(&mock.uri());
    let user = client.fetch_user(1).await.unwrap();
    assert_eq!(user.id, 1);
}
```

## Snapshot tests (insta)

```rust
#[test]
fn formats_money_correctly() {
    let m = Money::from_cents(123_45, "USD");
    insta::assert_snapshot!(m.to_string(), @"USD 123.45");
}
```

## Mocking traits (mockall)

```rust
use mockall::automock;

#[automock]
trait UserRepository {
    fn fetch(&self, id: u64) -> Result<User, RepoError>;
}

#[test]
fn handles_repo_error() {
    let mut mock = MockUserRepository::new();
    mock.expect_fetch()
        .with(eq(1))
        .returning(|_| Err(RepoError::NotFound));

    let svc = UserService::new(mock);
    assert!(matches!(svc.get(1), Err(_)));
}
```

## Coverage gates

```bash
cargo install cargo-llvm-cov
cargo llvm-cov --workspace --fail-under-lines 80
cargo llvm-cov --workspace --html --output-dir coverage/
```

## Hard rules

### 1. Tests don't panic in library code; they `assert`

```rust
// WRONG — production code panics
pub fn divide(a: u64, b: u64) -> u64 {
    a / b   // panics if b == 0
}

// CORRECT
pub fn divide(a: u64, b: u64) -> Result<u64, DivisionError> {
    if b == 0 { return Err(DivisionError::ByZero) }
    Ok(a / b)
}

#[test]
fn returns_error_for_zero_divisor() {
    assert!(matches!(divide(10, 0), Err(DivisionError::ByZero)));
}
```

### 2. `#[should_panic]` only for genuine invariant violations

```rust
#[test]
#[should_panic(expected = "amount must be non-negative")]
fn negative_money_panics() {
    Money::new(-1);  // assert via panic from the constructor
}
```

### 3. No `unwrap()` in tests — use `?` or `expect`

```rust
// WRONG — unwrap with no context on failure
let v = some_call().unwrap();

// CORRECT
let v = some_call().expect("some_call should succeed in this test setup");

// OR — use `Result` for the test
#[test]
fn it_works() -> Result<(), Box<dyn std::error::Error>> {
    let v = some_call()?;
    Ok(())
}
```

### 4. Time / RNG / FS injected for determinism

Per `~/.claude/rules-library/common/no-ambient-globals.md`.

### 5. CI same as local

```bash
cargo fmt --check
cargo clippy -- -D warnings
cargo test --all-features
cargo llvm-cov --workspace --fail-under-lines 80
```

## Cross-references

- `~/.claude/rules-library/common/testing.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules-library/rust/coding-style.md`
- `~/.claude/rules-library/common/no-ambient-globals.md`
- The Rust Book — Testing chapter
- proptest docs

---
