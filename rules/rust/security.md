# Rust Security

> Auto-fires on every `*.rs`, `Cargo.toml` file. Sister to
> `~/.claude/rules/common/security.md`. Tooling: `cargo audit`,
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
- Per `~/.claude/rules/common/secrets-management.md`

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

- `~/.claude/rules/common/security.md`
- `~/.claude/rules/common/secrets-management.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/rust/no-discards.md`
- `~/.claude/rules/rust/coding-style.md`
- RustSec Advisory Database
- Secure Rust Guidelines (ANSSI)
