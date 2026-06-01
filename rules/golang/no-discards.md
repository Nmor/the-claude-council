# Go — No-Discards Extension

> Auto-fires on every `*.go` file. Extends `~/.claude/rules/common/no-discards.md`
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

```
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

- `~/.claude/rules/common/no-discards.md` — the umbrella rule
- `~/.claude/rules/common/no-silent-failures.md` — silent failure
  patterns
- `~/.claude/rules/common/error-handling-with-context.md` —
  wrapping with operation + ids
- `~/.claude/rules/common/extreme-lint-policy.md` — strict lint
  config
- `~/.claude/rules/common/no-ambient-globals.md` — DI patterns
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
