# Rust Hooks

> Auto-fires on every `*.rs`, `Cargo.toml`, `Cargo.lock` file.
> Sister to `~/.claude/rules/common/hooks.md`.

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

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/common/license-allowlist-gate.md`
- `~/.claude/rules/rust/no-discards.md`
- `~/.claude/rules/rust/testing.md`
- cargo-deny docs (embarkstudios.github.io/cargo-deny)
