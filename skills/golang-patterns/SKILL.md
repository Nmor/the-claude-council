---
name: golang-patterns
description: Idiomatic Go patterns, best practices, and conventions for building robust, efficient, and maintainable Go applications.
paths:
  - "**/*.go"
  - "go.mod"
  - "go.sum"
  - "**/go.mod"
  - "**/go.sum"
---

# Go Development Patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> Before creating a new package, struct, interface, or helper
> function, sweep `pkg/`, `internal/`, `lib/`. One source of
> truth per concept (one `http.Client` factory, one
> `slog.Handler`, one config loader, one error-wrap helper). For
> shared behaviour across types, define a small interface and
> implement once. Extend with a constructor option (functional-
> options pattern) — never fork.

Idiomatic Go patterns and best practices for building robust, efficient, and maintainable
applications.

## When to Activate

- Writing new Go code
- Reviewing Go code
- Refactoring existing Go code
- Designing Go packages/modules

## Routing table

This skill uses progressive disclosure: the detail lives in `references/`, one
concern per file. Read the row you need — not the whole set.

| Topic | Read |
| --- | --- |
| Core principles (simplicity, useful zero value, accept interfaces / return structs), Go idiom quick-reference table, code-level anti-patterns to avoid | [`references/core-principles.md`](references/core-principles.md) |
| Error handling — wrapping with context, custom error types, `errors.Is` / `errors.As`, never ignoring errors | [`references/error-handling.md`](references/error-handling.md) |
| Concurrency — worker pools, `context` cancellation + timeouts, graceful shutdown, `errgroup`, goroutine-leak avoidance | [`references/concurrency.md`](references/concurrency.md) |
| Interface design — small focused interfaces, consumer-side definition, optional behaviour via type assertion | [`references/interface-design.md`](references/interface-design.md) |
| Package organization + struct design — standard layout, package naming, no package-level state, functional options, embedding | [`references/package-and-struct-design.md`](references/package-and-struct-design.md) |
| Memory + performance — slice preallocation, `sync.Pool`, string building in loops | [`references/memory-and-performance.md`](references/memory-and-performance.md) |
| Tooling + linter config — essential commands, recommended `.golangci.yml` | [`references/tooling.md`](references/tooling.md) |
| No-discards (Go) — the ten banned patterns, required Go lint gates, full `golangci-lint` settings, Go-side verification block | [`references/no-discards-go.md`](references/no-discards-go.md) |
| Migrated `rules-library/golang/` bodies — coding-style, hooks, patterns, security, testing | [`references/migrated-rules.md`](references/migrated-rules.md) |

## Purpose

Idiomatic Go patterns for production code: interface-where-consumed, error wrapping with context,
`context.Context` propagation, goroutine + channel discipline, table-driven tests, `staticcheck` +
`golangci-lint` alignment, and module-aware build configuration.

**Negative scope**: NOT framework-specific patterns (Gin / Fiber / Echo each have specifics). NOT
cloud-SDK choreography (use `aws-serverless-patterns`). NOT cgo / unsafe-pointer work. NOT generic
data-structure design (Go's stdlib + generics cover almost all real needs).

## When NOT to use

- Pure performance-sensitive numerical work where Rust / C++ is the better fit
- Scripts that would be simpler in Python or Bash (build tooling, one-shot data munging)
- Code that needs deep OO inheritance hierarchies (Go composes via interface + embedding)
- WASM frontend (Go's WASM is large; TinyGo or Rust+wasm-bindgen often better)

## Standards Cited

- **The Go Programming Language Specification** (current)
- **Effective Go (golang.org/doc/effective_go)** — idioms + naming
- **Go Code Review Comments (github.com/golang/go/wiki/CodeReviewComments)**
- **Go 1.24 release notes** — current language features (range-over-func, generic type aliases)
- **Uber Go Style Guide (github.com/uber-go/guide)** — production patterns
- **staticcheck.io** rule documentation — SA1xxx, SA4xxx series
- **golangci-lint v1.62+** — composite linter
- **OWASP ASVS 4.0.3 §5** — validation
- **CWE Top 25 (2026)** — CWE-20 (Validation), CWE-89 (SQL Injection), CWE-77 (Command Injection)

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Interface-pollution (`type UserService interface` on the producer side) | Premature abstraction; couples implementations to a fictional shared interface | Define interfaces on the CONSUMER side; producer returns concrete types |
| `panic()` for control flow | Crashes the process; can't be caught reliably; defeats Go's explicit error model | Return `error`; document sentinel errors |
| `init()` with side effects (DB connect, ENV read) | Order is implicit; untestable; runs in test imports | Explicit `New(...) (*T, error)` constructors |
| Stringly-typed enums (`status string`) | No exhaustiveness check; typos compile fine | `type Status int` + `const ( Pending Status = iota; Paid; Shipped )` |
| Naked `return` in a function > 5 lines | Reader has to scan back for variable names; review friction | Explicit `return foo, bar, nil` |
| `for _, v := range slice` value discard outside rune iteration | Loses index; defeats sister `no-discards.md` rule 2 | `for i := range slice { v := slice[i] }` |
| Goroutine without explicit termination signal | Leaks; eventual OOM | Pass `context.Context`; check `ctx.Done()` |
| `time.Sleep` in production retry loop | Wastes goroutines; not cancellable | Use `time.After` + `select` over `ctx.Done()` |

## Verification Checklist

- [ ] `go build ./...` exits 0
- [ ] `go vet ./...` exits 0
- [ ] `staticcheck ./...` exits 0
- [ ] `golangci-lint run ./...` exits 0
- [ ] All errors wrapped with `fmt.Errorf("%w", err)` or sentinel
- [ ] `errors.Is` / `errors.As` used for comparisons (never `==`)
- [ ] `context.Context` passed as first argument to every blocking call
- [ ] Every goroutine has explicit termination (context, channel close, sync.WaitGroup)
- [ ] Table-driven tests with `t.Run("sub test name", …)` subtests
- [ ] No `init()` functions with side effects
- [ ] Module pinned to a Go version (`go 1.24` in go.mod)

## Cross-References

- `~/.claude/rules-library/golang/no-discards.md` — banned Go patterns (`_, err :=` outside binding,
  `for _, v := range` discards)
- `~/.claude/rules-library/golang/coding-style.md` — naming, project layout, file organisation
- `~/.claude/rules-library/golang/security.md` — Go-specific security patterns
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict Go linter config
- `~/.claude/skills/golang-testing/SKILL.md` — table-driven tests, benchmarks, fuzz
- `~/.claude/skills/coding-quality-rules/SKILL.md` — language-agnostic floor
- `~/.claude/agents/go-reviewer.md` — Go review (idioms, goroutine safety, race detection)
- `~/.claude/agents/go-build-resolver.md` — Go build / vet / lint failure fixes

## Why this skill exists

Go is designed to be boring in the best way: predictable, consistent, easy to read at 3 AM. The
patterns that drift Go away from that are:

- Interface pollution: producer-side interfaces that nobody actually consumes → unnecessary
  abstraction tax forever
- `panic()` for control flow: Go's error model is explicit for a reason; panic short-circuits it
- `init()` side effects: imports become magic; tests can't isolate
- Discarded errors (`_, err :=` patterns): the canonical Go bug class — silent failures that surface
  hours later
- Goroutine leaks: each leaked goroutine holds its stack (~8KB minimum); thousands accumulate over a
  Lambda's lifetime → OOM kill

Cost of disciplined Go: minutes per file. Cost of skipping it: incidents where the bug was the
absence of a `ctx.Done()` check three releases ago.

## Compliance & Standards Mapping

- **ISO/IEC 25010:2011 §6** — Product quality model (Functional
  Suitability, Reliability, Performance Efficiency, Usability,
  Security, Maintainability, Portability, Compatibility)
- **ISO/IEC/IEEE 12207:2017 §6.4** — Software construction +
  verification + validation processes
- **NIST SP 800-218 SSDF §PW** — Produce Well-Secured Software
  (applies to every code-authoring skill)
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing +
  evaluation
- **OWASP ASVS 4.0.3 §V1.1** — Secure SDLC requirements
- **OWASP ASVS 4.0.3 §V14.2** — Dependency lifecycle
- **CWE Top 25 (2026)** — Weakness classes the patterns in this
  skill prevent
- **SLSA Framework v1.0 Build L2+** — Provenance + integrity

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `_, err :=` / `, _ :=` / `_ = …` introduced (sister `golang/no-discards.md` rule 1 violation)
- `for _, v := range ...` outside rune-iteration exception (sister rule 2 violation)
- `defer file.Close()` without error-handling closure (sister rule 3 violation)
- `errors.Is` / `errors.As` not used for sentinel-error comparison (sister rule 4 violation)
- `init()` function with non-trivial side effects (sister rule "init() with side effects" +
  `no-ambient-globals.md`)
- Package-level mutable global introduced (gochecknoglobals weakening)
- Mixed pointer / value receivers on the same type without rationale comment
- `interface{}` / `any` used where a concrete type would work (interface-segregation drift)
- Test function with underscore (`TestFoo_Bar`) — sister S100 violation

**Refinement candidates**:

- New idiom row when a new Go release ships (e.g., `range` over int — Go 1.22, new iter pattern in
  1.23+)
- Tightening of the "boring is best" thresholds when over-clever generics / type-params recur
- New cross-reference when a sister rule (golang/no-discards, error-handling-with-context) adds a
  banned pattern
- New error-wrapping template when a new error class recurs across services
