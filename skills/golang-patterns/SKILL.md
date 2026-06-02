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

> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> Before creating a new package, struct, interface, or helper
> function, sweep `pkg/`, `internal/`, `lib/`. One source of
> truth per concept (one `http.Client` factory, one
> `slog.Handler`, one config loader, one error-wrap helper). For
> shared behaviour across types, define a small interface and
> implement once. Extend with a constructor option (functional-
> options pattern) — never fork.

Idiomatic Go patterns and best practices for building robust, efficient, and maintainable applications.

## When to Activate

- Writing new Go code
- Reviewing Go code
- Refactoring existing Go code
- Designing Go packages/modules

## Core Principles

### 1. Simplicity and Clarity

Go favors simplicity over cleverness. Code should be obvious and easy to read.

```go
// Good: Clear and direct
func GetUser(id string) (*User, error) {
    user, err := db.FindUser(id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}

// Bad: Overly clever
func GetUser(id string) (*User, error) {
    return func() (*User, error) {
        if u, e := db.FindUser(id); e == nil {
            return u, nil
        } else {
            return nil, e
        }
    }()
}
```

### 2. Make the Zero Value Useful

Design types so their zero value is immediately usable without initialization.

```go
// Good: Zero value is useful
type Counter struct {
    mu    sync.Mutex
    count int // zero value is 0, ready to use
}

func (c *Counter) Inc() {
    c.mu.Lock()
    c.count++
    c.mu.Unlock()
}

// Good: bytes.Buffer works with zero value
var buf bytes.Buffer
buf.WriteString("hello")

// Bad: Requires initialization
type BadCounter struct {
    counts map[string]int // nil map will panic
}
```

### 3. Accept Interfaces, Return Structs

Functions should accept interface parameters and return concrete types.

```go
// Good: Accepts interface, returns concrete type
func ProcessData(r io.Reader) (*Result, error) {
    data, err := io.ReadAll(r)
    if err != nil {
        return nil, err
    }
    return &Result{Data: data}, nil
}

// Bad: Returns interface (hides implementation details unnecessarily)
func ProcessData(r io.Reader) (io.Reader, error) {
    // ...
}
```

## Error Handling Patterns

### Error Wrapping with Context

```go
// Good: Wrap errors with context
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config %s: %w", path, err)
    }

    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config %s: %w", path, err)
    }

    return &cfg, nil
}
```

### Custom Error Types

```go
// Define domain-specific errors
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Sentinel errors for common cases
var (
    ErrNotFound     = errors.New("resource not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrInvalidInput = errors.New("invalid input")
)
```

### Error Checking with errors.Is and errors.As

```go
func HandleError(err error) {
    // Check for specific error
    if errors.Is(err, sql.ErrNoRows) {
        log.Println("No records found")
        return
    }

    // Check for error type
    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        log.Printf("Validation error on field %s: %s",
            validationErr.Field, validationErr.Message)
        return
    }

    // Unknown error
    log.Printf("Unexpected error: %v", err)
}
```

### Never Ignore Errors

```go
// Bad: Ignoring error with blank identifier
result, _ := doSomething()

// Good: Handle or explicitly document why it's safe to ignore
result, err := doSomething()
if err != nil {
    return err
}

// Acceptable: When error truly doesn't matter (rare)
_ = writer.Close() // Best-effort cleanup, error logged elsewhere
```

## Concurrency Patterns

### Worker Pool

```go
func WorkerPool(jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup

    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }

    wg.Wait()
    close(results)
}
```

### Context for Cancellation and Timeouts

```go
func FetchWithTimeout(ctx context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("fetch %s: %w", url, err)
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

### Graceful Shutdown

```go
func GracefulShutdown(server *http.Server) {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    <-quit
    log.Println("Shutting down server...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server exited")
}
```

### errgroup for Coordinated Goroutines

```go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([][]byte, len(urls))

    for i, url := range urls {
        i, url := i, url // Capture loop variables
        g.Go(func() error {
            data, err := FetchWithTimeout(ctx, url)
            if err != nil {
                return err
            }
            results[i] = data
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Avoiding Goroutine Leaks

```go
// Bad: Goroutine leak if context is cancelled
func leakyFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte)
    go func() {
        data, _ := fetch(url)
        ch <- data // Blocks forever if no receiver
    }()
    return ch
}

// Good: Properly handles cancellation
func safeFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte, 1) // Buffered channel
    go func() {
        data, err := fetch(url)
        if err != nil {
            return
        }
        select {
        case ch <- data:
        case <-ctx.Done():
        }
    }()
    return ch
}
```

## Interface Design

### Small, Focused Interfaces

```go
// Good: Single-method interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

// Compose interfaces as needed
type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}
```

### Define Interfaces Where They're Used

```go
// In the consumer package, not the provider
package service

// UserStore defines what this service needs
type UserStore interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

type Service struct {
    store UserStore
}

// Concrete implementation can be in another package
// It doesn't need to know about this interface
```

### Optional Behavior with Type Assertions

```go
type Flusher interface {
    Flush() error
}

func WriteAndFlush(w io.Writer, data []byte) error {
    if _, err := w.Write(data); err != nil {
        return err
    }

    // Flush if supported
    if f, ok := w.(Flusher); ok {
        return f.Flush()
    }
    return nil
}
```

## Package Organization

### Standard Project Layout

```text
myproject/
├── cmd/
│   └── myapp/
│       └── main.go           # Entry point
├── internal/
│   ├── handler/              # HTTP handlers
│   ├── service/              # Business logic
│   ├── repository/           # Data access
│   └── config/               # Configuration
├── pkg/
│   └── client/               # Public API client
├── api/
│   └── v1/                   # API definitions (proto, OpenAPI)
├── testdata/                 # Test fixtures
├── go.mod
├── go.sum
└── Makefile
```

### Package Naming

```go
// Good: Short, lowercase, no underscores
package http
package json
package user

// Bad: Verbose, mixed case, or redundant
package httpHandler
package json_parser
package userService // Redundant 'Service' suffix
```

### Avoid Package-Level State

```go
// Bad: Global mutable state
var db *sql.DB

func init() {
    db, _ = sql.Open("postgres", os.Getenv("DATABASE_URL"))
}

// Good: Dependency injection
type Server struct {
    db *sql.DB
}

func NewServer(db *sql.DB) *Server {
    return &Server{db: db}
}
```

## Struct Design

### Functional Options Pattern

```go
type Server struct {
    addr    string
    timeout time.Duration
    logger  *log.Logger
}

type Option func(*Server)

func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

func WithLogger(l *log.Logger) Option {
    return func(s *Server) {
        s.logger = l
    }
}

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{
        addr:    addr,
        timeout: 30 * time.Second, // default
        logger:  log.Default(),    // default
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
server := NewServer(":8080",
    WithTimeout(60*time.Second),
    WithLogger(customLogger),
)
```

### Embedding for Composition

```go
type Logger struct {
    prefix string
}

func (l *Logger) Log(msg string) {
    fmt.Printf("[%s] %s\n", l.prefix, msg)
}

type Server struct {
    *Logger // Embedding - Server gets Log method
    addr    string
}

func NewServer(addr string) *Server {
    return &Server{
        Logger: &Logger{prefix: "SERVER"},
        addr:   addr,
    }
}

// Usage
s := NewServer(":8080")
s.Log("Starting...") // Calls embedded Logger.Log
```

## Memory and Performance

### Preallocate Slices When Size is Known

```go
// Bad: Grows slice multiple times
func processItems(items []Item) []Result {
    var results []Result
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}

// Good: Single allocation
func processItems(items []Item) []Result {
    results := make([]Result, 0, len(items))
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}
```

### Use sync.Pool for Frequent Allocations

```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func ProcessRequest(data []byte) []byte {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufferPool.Put(buf)
    }()

    buf.Write(data)
    // Process...
    return buf.Bytes()
}
```

### Avoid String Concatenation in Loops

```go
// Bad: Creates many string allocations
func join(parts []string) string {
    var result string
    for _, p := range parts {
        result += p + ","
    }
    return result
}

// Good: Single allocation with strings.Builder
func join(parts []string) string {
    var sb strings.Builder
    for i, p := range parts {
        if i > 0 {
            sb.WriteString(",")
        }
        sb.WriteString(p)
    }
    return sb.String()
}

// Best: Use standard library
func join(parts []string) string {
    return strings.Join(parts, ",")
}
```

## Go Tooling Integration

### Essential Commands

```bash
# Build and run
go build ./...
go run ./cmd/myapp

# Testing
go test ./...
go test -race ./...
go test -cover ./...

# Static analysis
go vet ./...
staticcheck ./...
golangci-lint run

# Module management
go mod tidy
go mod verify

# Formatting
gofmt -w .
goimports -w .
```

### Recommended Linter Configuration (.golangci.yml)

```yaml
linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - misspell
    - unconvert
    - unparam

linters-settings:
  errcheck:
    check-type-assertions: true
  govet:
    check-shadowing: true

issues:
  exclude-use-default: false
```

## Quick Reference: Go Idioms

| Idiom | Description |
|-------|-------------|
| Accept interfaces, return structs | Functions accept interface params, return concrete types |
| Errors are values | Treat errors as first-class values, not exceptions |
| Don't communicate by sharing memory | Use channels for coordination between goroutines |
| Make the zero value useful | Types should work without explicit initialization |
| A little copying is better than a little dependency | Avoid unnecessary external dependencies |
| Clear is better than clever | Prioritize readability over cleverness |
| gofmt is no one's favorite but everyone's friend | Always format with gofmt/goimports |
| Return early | Handle errors first, keep happy path unindented |

## Anti-Patterns to Avoid

```go
// Bad: Naked returns in long functions
func process() (result int, err error) {
    // ... 50 lines ...
    return // What is being returned?
}

// Bad: Using panic for control flow
func GetUser(id string) *User {
    user, err := db.Find(id)
    if err != nil {
        panic(err) // Don't do this
    }
    return user
}

// Bad: Passing context in struct
type Request struct {
    ctx context.Context // Context should be first param
    ID  string
}

// Good: Context as first parameter
func ProcessRequest(ctx context.Context, id string) error {
    // ...
}

// Bad: Mixing value and pointer receivers
type Counter struct{ n int }
func (c Counter) Value() int { return c.n }    // Value receiver
func (c *Counter) Increment() { c.n++ }        // Pointer receiver
// Pick one style and be consistent
```

**Remember**: Go code should be boring in the best way - predictable, consistent, and easy to understand. When in doubt, keep it simple.

## Purpose

Idiomatic Go patterns for production code: interface-where-consumed, error wrapping with context, `context.Context` propagation, goroutine + channel discipline, table-driven tests, `staticcheck` + `golangci-lint` alignment, and module-aware build configuration.

**Negative scope**: NOT framework-specific patterns (Gin / Fiber / Echo each have specifics). NOT cloud-SDK choreography (use `aws-serverless-patterns`). NOT cgo / unsafe-pointer work. NOT generic data-structure design (Go's stdlib + generics cover almost all real needs).

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

- `~/.claude/rules-library/golang/no-discards.md` — banned Go patterns (`_, err :=` outside binding, `for _, v := range` discards)
- `~/.claude/rules-library/golang/coding-style.md` — naming, project layout, file organisation
- `~/.claude/rules-library/golang/security.md` — Go-specific security patterns
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict Go linter config
- `~/.claude/skills/golang-testing/SKILL.md` — table-driven tests, benchmarks, fuzz
- `~/.claude/skills/coding-standards/SKILL.md` — language-agnostic floor
- `~/.claude/agents/go-reviewer.md` — Go review (idioms, goroutine safety, race detection)
- `~/.claude/agents/go-build-resolver.md` — Go build / vet / lint failure fixes

## Why this skill exists

Go is designed to be boring in the best way: predictable, consistent, easy to read at 3 AM. The patterns that drift Go away from that are:

- Interface pollution: producer-side interfaces that nobody actually consumes → unnecessary abstraction tax forever
- `panic()` for control flow: Go's error model is explicit for a reason; panic short-circuits it
- `init()` side effects: imports become magic; tests can't isolate
- Discarded errors (`_, err :=` patterns): the canonical Go bug class — silent failures that surface hours later
- Goroutine leaks: each leaked goroutine holds its stack (~8KB minimum); thousands accumulate over a Lambda's lifetime → OOM kill

Cost of disciplined Go: minutes per file. Cost of skipping it: incidents where the bug was the absence of a `ctx.Done()` check three releases ago.

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
- `init()` function with non-trivial side effects (sister rule "init() with side effects" + `no-ambient-globals.md`)
- Package-level mutable global introduced (gochecknoglobals weakening)
- Mixed pointer / value receivers on the same type without rationale comment
- `interface{}` / `any` used where a concrete type would work (interface-segregation drift)
- Test function with underscore (`TestFoo_Bar`) — sister S100 violation

**Refinement candidates**:

- New idiom row when a new Go release ships (e.g., `range` over int — Go 1.22, new iter pattern in 1.23+)
- Tightening of the "boring is best" thresholds when over-clever generics / type-params recur
- New cross-reference when a sister rule (golang/no-discards, error-handling-with-context) adds a banned pattern
- New error-wrapping template when a new error class recurs across services

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: /Users/APPLE/.claude/rules-library/golang/
     ============================================================ -->

## Migrated rules (rules-library/golang/, 2026-06-02)

Phase H will delete the source files at `rules-library/golang/`. Content below preserves the original rule bodies for lazy-load via the `paths:` glob above.

---

<!-- ============================================================
     Section: golang/coding-style.md
     ============================================================ -->

---
paths:

- "**/*.go"
- "**/go.mod"
- "**/go.sum"

---

# Go Coding Style

> This file extends [common/coding-style.md](../../rules-library/common/coding-style.md) with Go specific content.

## Formatting

- **gofmt** and **goimports** are mandatory — no style debates

## Design Principles

- Accept interfaces, return structs
- Keep interfaces small (1-3 methods)

## Error Handling

Always wrap errors with context:

```go
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}
```

## Reference

See skill: `golang-patterns` for comprehensive Go idioms and patterns.

---

<!-- ============================================================
     Section: golang/hooks.md
     ============================================================ -->

---
paths:

- "**/*.go"
- "**/go.mod"
- "**/go.sum"

---

# Go Hooks

> This file extends [common/hooks.md](../../rules-library/common/hooks.md) with Go specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **gofmt/goimports**: Auto-format `.go` files after edit
- **go vet**: Run static analysis after editing `.go` files
- **staticcheck**: Run extended static checks on modified packages

---

<!-- ============================================================
     Section: golang/no-discards.md
     ============================================================ -->

# Go — No-Discards Extension

> Auto-fires on every `*.go` file. Extends `~/.claude/rules-library/common/no-discards.md`
> with Go-specific patterns. Sister to `extreme-lint-policy.md`,
> `no-silent-failures.md`, `error-handling-with-context.md`.
> Tooling: `errcheck`, `errorlint`, `nilerr`, `staticcheck`,
> `golangci-lint`, `revive`.

## Core Principle (Go-specific restatement)

**Every value Go returns is part of the function's contract. Bind
every return; handle every error with `errors.Is` / `errors.As` +
context wrapping; never use `_` to discard a value. Test files
have no exemption.**

Go's multi-return convention makes discards visually invisible:
`_, err := ...` looks tidy but throws away half of the function's
output. Idiomatic Go BINDS every return.

## Banned patterns

### 1. Bare `_` in value position

```go
// FORBIDDEN
_, err := r.db.Exec(ctx, sql, args...)
n, _ := io.WriteString(w, payload)
_ = file.Close()
v, _ := iface.(*Concrete)

// CORRECT
tag, err := r.db.Exec(ctx, sql, args...)
if err != nil {
    return fmt.Errorf("exec %s: %w", op, err)
}
if tag.RowsAffected() == 0 {
    return ErrNotFound
}

n, werr := io.WriteString(w, payload)
if werr != nil {
    slog.Warn("write failed", "bytes_written", n, "err", werr)
}

if err := file.Close(); err != nil {
    slog.Warn("close failed", "path", path, "err", err)
}

v, ok := iface.(*Concrete)
if !ok {
    return fmt.Errorf("expected *Concrete, got %T", iface)
}
```

### 2. Range loops with `_` in destructured position

```go
// FORBIDDEN
for _, v := range slice { ... }
for k, _ := range m { ... }
for _, x := range cases { ... }   // even in tests

// CORRECT — slice value iteration
for i := range slice {
    v := slice[i]
    // ...
}

// CORRECT — map value iteration
for k := range m {
    v := m[k]
    // ...
}

// CORRECT — already single-variable, no discard
for v := range channel { ... }
for i := range slice { ... }  // index-only OK
for k := range m { ... }      // map keys OK

// EXCEPTION — string rune iteration ONLY
// Go has no other syntax that iterates runes (vs bytes).
// `_` is permitted here AND ONLY here.
for _, r := range "héllo" {  // r is rune
    fmt.Println(r)
}
```

The rune-iteration exception is the only place `_` survives.
Every other range-discard is a violation.

### 3. Defer Close without error handling

```go
// FORBIDDEN
defer file.Close()
defer func() { _ = x.Close() }()

// CORRECT
defer func() {
    if err := file.Close(); err != nil {
        slog.Warn("close failed",
            "path", path,
            "err", err)
    }
}()

// CORRECT — named return + assignment
func read(path string) (data []byte, err error) {
    f, oerr := os.Open(path)
    if oerr != nil {
        return nil, fmt.Errorf("open %s: %w", path, oerr)
    }
    defer func() {
        if cerr := f.Close(); cerr != nil && err == nil {
            err = fmt.Errorf("close %s: %w", path, cerr)
        }
    }()
    return io.ReadAll(f)
}
```

### 4. Error comparison with `==`

```go
// FORBIDDEN
if err == io.EOF { ... }
if err == sql.ErrNoRows { ... }

// CORRECT
if errors.Is(err, io.EOF) { ... }
if errors.Is(err, sql.ErrNoRows) { ... }

// CORRECT — for type assertion
var pathErr *fs.PathError
if errors.As(err, &pathErr) {
    slog.Warn("path error", "path", pathErr.Path, "op", pathErr.Op)
}
```

Wrapped errors do NOT pass `==`. `errorlint` enforces this.

### 5. Bare `return err` without wrapping

```go
// FORBIDDEN — caller has no context
func saveUser(ctx context.Context, u User) error {
    if err := db.Exec(ctx, sql, u); err != nil {
        return err
    }
    return nil
}

// CORRECT — wrap with operation + identifying ids
func saveUser(ctx context.Context, u User) error {
    if err := db.Exec(ctx, sql, u); err != nil {
        return fmt.Errorf("save user %s: %w", u.ID, err)
    }
    return nil
}
```

Per `error-handling-with-context.md` — every return wraps with
operation + ids so the caller sees the chain.

### 6. Unnamed receivers / parameters

```go
// FORBIDDEN
func (_ *Repository) helper() { ... }
func handler(_ http.ResponseWriter, r *http.Request) { ... }

// CORRECT — every receiver / parameter named, even when unused
func (r *Repository) helper() { ... }
func handler(w http.ResponseWriter, r *http.Request) {
    // w unused in THIS handler; interface contract requires it
    fmt.Fprint(w, "ok")  // or similar real usage
}
```

### 7. Test function names with underscore

```go
// FORBIDDEN — S100 violation; underscore prohibited in Go names
func TestUserService_GetByID(t *testing.T) { ... }

// CORRECT — subtests
func TestUserService(t *testing.T) {
    t.Run("get by id", func(t *testing.T) { ... })
    t.Run("not found", func(t *testing.T) { ... })
}
```

### 8. `init()` with side effects

Per `no-ambient-globals.md` — `init()` runs before `main()`;
side effects cannot be tested, cannot be ordered, cannot be
deferred:

```go
// FORBIDDEN
var db *sql.DB
func init() {
    db, _ = sql.Open("postgres", os.Getenv("DB_URL"))
}

// CORRECT — constructor invoked from main()
type Application struct {
    DB *sql.DB
}

func New(cfg *Config) (*Application, error) {
    db, err := sql.Open("postgres", cfg.DBURL)
    if err != nil {
        return nil, fmt.Errorf("connect db: %w", err)
    }
    return &Application{DB: db}, nil
}
```

`gochecknoinits` linter forbids `init()` outside of narrow cases
(registering with a framework's required init pattern, e.g.,
`expvar`).

### 9. Package-level mutable globals

```go
// FORBIDDEN
var (
    requestCount int
    cache        map[string]User
)

// CORRECT — encapsulated in a service
type Service struct {
    mu           sync.RWMutex
    requestCount int64
    cache        map[string]User
}
```

`gochecknoglobals` linter flags package-level `var` blocks
containing mutable state. Constants + true singletons (e.g., a
default logger interface) are exempt.

### 10. Pointer dereferenced before nil check

```go
// FORBIDDEN
func handle(u *User) {
    fmt.Println(u.Name)  // panic if u is nil
}

// CORRECT
func handle(u *User) {
    if u == nil {
        return
    }
    fmt.Println(u.Name)
}
```

`nilerr` + `staticcheck` SA5011 catch this.

## Required linters (Go-side gates)

Per `extreme-lint-policy.md`:

```bash
go vet ./...
staticcheck ./...
golangci-lint run ./...
govulncheck ./...
```

`golangci-lint` configuration (`.golangci.yml`):

```yaml
run:
  go: "1.24"
  timeout: 5m

linters:
  enable-all: true
  disable:
    - exhaustruct       # tedious; over-enforces
    - depguard          # use only with a real policy
    - varnamelen        # too noisy for idiomatic Go
    - wsl               # cosmetic
    - nlreturn          # cosmetic

linters-settings:
  errcheck:
    check-type-assertions: true
    check-blank: true                 # blocks `_, err :=`
  errorlint:
    errorf: true
    asserts: true
    comparison: true
  gocognit:
    min-complexity: 10                # per extreme-lint-policy
  cyclop:
    max-complexity: 7                 # per extreme-lint-policy
  funlen:
    lines: 80                         # per extreme-lint-policy
    statements: 50
  lll:
    line-length: 120
  revive:
    rules:
      - name: unused-receiver
      - name: unused-parameter
      - name: error-return
      - name: error-strings
      - name: errorf
      - name: var-declaration
      - name: context-as-argument
      - name: dot-imports
      - name: blank-imports
      - name: confusing-naming
      - name: confusing-results
      - name: deep-exit
      - name: empty-block
      - name: superfluous-else
  staticcheck:
    checks: ["all"]
  nilerr:
    enable: true
  wastedassign:
    enable: true
  unparam:
    enable: true
  gosec:
    severity: low
    confidence: low
  exhaustive:
    default-signifies-exhaustive: false
  gochecknoinits:
    enable: true
  gochecknoglobals:
    enable: true

issues:
  exclude-use-default: false
  max-issues-per-linter: 0
  max-same-issues: 0
```

## Verification block (Go-side)

When a Go file is touched:

```text
Go lint sweep (this turn):
  - go build ./...: 0 errors
  - go vet ./...: 0 issues
  - staticcheck ./...: 0 issues
  - golangci-lint run ./...: 0 issues
  - govulncheck ./...: no vulnerabilities
  - go test -race -count=1 ./pkg/...: PASS (coverage 92%)
```

A line of "Go looks clean" without these counts isn't a sweep —
it's an aspiration.

## Cross-references

- `~/.claude/rules-library/common/no-discards.md` — the umbrella rule
- `~/.claude/rules-library/common/no-silent-failures.md` — silent failure
  patterns
- `~/.claude/rules-library/common/error-handling-with-context.md` —
  wrapping with operation + ids
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict lint
  config
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI patterns
- `~/.claude/rules/common/done-criteria.md` — verification block

## Why this rule exists

Go's expressive multi-return convention makes discards feel
natural — `_, err := ...` is muscle memory for many Go
developers. But every `_` is a contract violation. The
historical bugs from this pattern in Go codebases:

- Network calls whose bytes-written was discarded; logs show
  "wrote 0 bytes" but the connection actually died at byte
  10000
- File closes that failed silently, then the next read got
  stale data
- Type assertions that silently produced `nil`, then crashed
  3 functions later when the nil was dereferenced
- Range loops that drop the index `i` and lose track of
  position, then can't report "failed at item N"

The fix: bind every value, handle every error, wrap every
return. Go's tooling enforces this (errcheck, errorlint,
staticcheck); the rule is to keep that enforcement on at full
strictness.

---

<!-- ============================================================
     Section: golang/patterns.md
     ============================================================ -->

---
paths:

- "**/*.go"
- "**/go.mod"
- "**/go.sum"

---

# Go Patterns

> This file extends [common/patterns.md](../../rules-library/common/patterns.md) with Go specific content.

## Functional Options

```go
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

## Small Interfaces

Define interfaces where they are used, not where they are implemented.

## Dependency Injection

Use constructor functions to inject dependencies:

```go
func NewUserService(repo UserRepository, logger Logger) *UserService {
    return &UserService{repo: repo, logger: logger}
}
```

## Reference

See skill: `golang-patterns` for comprehensive Go patterns including concurrency, error handling, and package organization.

---

<!-- ============================================================
     Section: golang/security.md
     ============================================================ -->

---
paths:

- "**/*.go"
- "**/go.mod"
- "**/go.sum"

---

# Go Security

> This file extends [common/security.md](../../rules-library/common/security.md) with Go specific content.

## Secret Management

```go
apiKey := os.Getenv("OPENAI_API_KEY")
if apiKey == "" {
    log.Fatal("OPENAI_API_KEY not configured")
}
```

## Security Scanning

- Use **gosec** for static security analysis:

  ```bash
  gosec ./...
  ```

## Context & Timeouts

Always use `context.Context` for timeout control:

```go
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
```

---

<!-- ============================================================
     Section: golang/testing.md
     ============================================================ -->

---
paths:

- "**/*.go"
- "**/go.mod"
- "**/go.sum"

---

# Go Testing

> This file extends [common/testing.md](../../rules-library/common/testing.md) with Go specific content.

## Framework

Use the standard `go test` with **table-driven tests**.

## Race Detection

Always run with the `-race` flag:

```bash
go test -race ./...
```

## Coverage

```bash
go test -cover ./...
```

## Reference

See skill: `golang-testing` for detailed Go testing patterns and helpers.

---
