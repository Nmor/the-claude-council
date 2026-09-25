---
name: ruby-rails-patterns
description: Ruby 3.3+ / Rails 7-8 discipline — Sandi Metz rules (classes ≤ 100 LOC, methods ≤ 5 LOC, ≤ 4 args), frozen_string_literal mandatory, RuboCop at strict (cyclomatic ≤ 7, AbcSize ≤ 15), modern Ruby idioms (endless methods, pattern matching, hash shorthand, numbered block params), service objects + form objects + query objects + value objects, Rails 8 Solid Queue / Solid Cache / Solid Cable defaults, no monkey-patching outside Refinements / Module#prepend, Brakeman + bundler-audit + RSpec at strict. Auto-fires on Ruby / Rails project files.
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/*.gemspec"
  - "**/Gemfile"
  - "**/Gemfile.lock"
  - "**/Rakefile"
  - "**/config.ru"
  - "**/.rspec"
  - "**/spec/**/*.rb"
---

# ruby-rails-patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules-library/ruby/` as part of the lazy-rules-loading plan.
> Phase H will delete the source files.

## Purpose

Ruby 3.3+ / Rails 7-8 discipline for production code: small classes and methods per Sandi
Metz, frozen string literals, RuboCop at a strict baseline, the four Rails object patterns
(service / form / query / value), OWASP-mapped Rails security, and RSpec at strict. The
bodies below were migrated from `~/.claude/rules-library/ruby/`.

## Routing table

This skill uses progressive disclosure: the detail lives in `references/`, one concern per
file. Read the row you need — not the whole set.

| Topic | Read |
| --- | --- |
| Coding style — naming, Sandi Metz rules, frozen string literals, modern Ruby idioms (endless methods, pattern matching, hash shorthand, numbered block params), class structure, modules + mixins, Rails-specific style, strict `.rubocop.yml` | [`references/coding-style.md`](references/coding-style.md) |
| Hooks + CI — pre-commit gates on staged Ruby files, Rails initializer hooks (security headers, parameter filtering), the CI workflow | [`references/hooks.md`](references/hooks.md) |
| No-discards (Ruby) — the fifteen banned patterns (bare `rescue`, `rescue nil`, `send` with user input, `eval`, suppressions, unsynchronised `Hash#[]=`, `puts`, `Time.now`, deep `ENV`, monkey-patching, unordered `find_each`, `update_columns`, `for ... in`, discarded multiple assignment), required tooling, verification block | [`references/no-discards.md`](references/no-discards.md) |
| Rails object patterns — service objects, form objects, query objects, value objects, concerns vs inheritance, ActiveRecord pitfalls, reuse-first | [`references/patterns.md`](references/patterns.md) |
| Security — OWASP Top 10 mapped to Rails (A01-A10), CSRF + strong parameters, secrets, required security tooling | [`references/security.md`](references/security.md) |
| Testing — Rails test pyramid, RSpec idioms, FactoryBot, WebMock + VCR, Capybara + Cuprite system tests, the ten hard rules | [`references/testing.md`](references/testing.md) |
