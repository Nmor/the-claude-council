# Rust Coding Style

> Auto-fires on every `*.rs`, `Cargo.toml`, `Cargo.lock` file.
> Standards: **The Rust API Guidelines**, **The Rustonomicon**,
> **RFC track**, **rustfmt default**, **clippy pedantic + nursery
> + cargo**.

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

- `~/.claude/rules/common/coding-style.md`
- `~/.claude/rules/rust/no-discards.md`
- `~/.claude/rules/rust/security.md`
- `~/.claude/rules/rust/testing.md`
- `~/.claude/rules/rust/patterns.md`
- The Rust API Guidelines
- The Rust Programming Language ("The Book")
- Rustonomicon (unsafe Rust)
