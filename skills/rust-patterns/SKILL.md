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


# rust-patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules-library/rust/` as part of the lazy-rules-loading plan.
> Phase H will delete the source files.

## Purpose

Routing table for the Rust discipline. Every rule, code example, citation and
anti-pattern lives in `references/` — read the row that matches the work rather
than the whole surface, because this skill is `paths:`-gated and whatever stays
here is paid on every edit to every `*.rs` / `Cargo.toml` file.

## Routing table

| Row | Read this | It holds |
| --- | --- | --- |
| **Coding style** | [`references/coding-style.md`](references/coding-style.md) | Core principle · Naming · Ownership + borrowing · Error handling · Modules + visibility · Idioms · Async (tokio) · Required `Cargo.toml` setup · `rustfmt.toml` · Required tooling · Cross-references |
| **Hooks + CI gates** | [`references/hooks.md`](references/hooks.md) | Pre-commit gates · CI workflow · `deny.toml` (the cargo-deny policy) · `rust-toolchain.toml` · Cross-references |
| **No-discards extension** | [`references/no-discards.md`](references/no-discards.md) | The 15 banned patterns — `unwrap()`/`expect()` · `let _ =` · `panic!`/`todo!` · ignored iterator values · undocumented `unsafe` · unjustified `#[allow(...)]` · `clone()` to dodge the borrow checker · hot-path allocations · `mem::forget` · lossy `as` casts · `println!` in product code · hardcoded credentials · uninjected clocks · mutable statics · range-loop discards. Plus required `Cargo.toml` lints and the verification block |
| **Architecture patterns** | [`references/patterns.md`](references/patterns.md) | Module + workspace layout · Newtype · Enums for closed sets · Builder · Traits for ports · DI via struct composition · Async (tokio idioms) · Reuse-first · Anti-patterns 1-4 |
| **Security** | [`references/security.md`](references/security.md) | OWASP A02 crypto · A03 injection · A06 vulnerable components · A07 authentication · A10 SSRF · `unsafe` discipline · Secrets · Required tooling |
| **Testing** | [`references/testing.md`](references/testing.md) | Test layout · Property-based (proptest) · Async testing · HTTP mocking · Snapshot (insta) · Mocking traits (mockall) · Coverage gates · Hard rules 1-5 |

Start with **Coding style** when the work is a plain `*.rs` edit; add the other
rows only as the change reaches them.
