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

```
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

## Reuse-first (per `~/.claude/rules/common/reuse-first.md`)

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

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/common/reuse-first.md`
- `~/.claude/rules/rust/coding-style.md`
- `~/.claude/rules/rust/no-discards.md`
- Rust Design Patterns book (rust-unofficial.github.io)
- Tokio Tutorial
- Effective Rust (Drysdale)
