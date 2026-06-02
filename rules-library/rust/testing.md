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

Per `~/.claude/rules/common/no-ambient-globals.md`.

### 5. CI same as local

```bash
cargo fmt --check
cargo clippy -- -D warnings
cargo test --all-features
cargo llvm-cov --workspace --fail-under-lines 80
```

## Cross-references

- `~/.claude/rules/common/testing.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- `~/.claude/rules/rust/coding-style.md`
- `~/.claude/rules/common/no-ambient-globals.md`
- The Rust Book — Testing chapter
- proptest docs
