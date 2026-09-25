# Hooks System — Per-Language Gates

> Covers the per-language PostToolUse gate each stack ships (Go, TS/JS,
> Python, Java/Kotlin, Ruby, Rust, C/C++, Swift, Dart, C#, Markdown, Infra,
> SQL, Bash). Pointed at by the SKILL.md routing row **Per-language
> PostToolUse gates**.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Per-language hook gates

Every language a project uses ships a PostToolUse gate that runs
the language-specific verification suite from `done-criteria.md`
on every edited file.

### Go (`*.go`, `go.mod`, `go.sum`)

- **goimports / gofmt -s** — auto-format on save
- **`go vet ./...`** — zero output
- **`staticcheck ./...`** — zero issues
- **`golangci-lint run ./...`** — zero issues (full ruleset
  per `extreme-lint-policy.md`)
- **`go test ./<pkg>/...`** — when a test file or consumer
  changed
- **Optional**: `gosec ./...`, `govulncheck ./...`

### TypeScript / JavaScript (`*.ts`, `*.tsx`, `*.js`, `*.jsx`)

- **Prettier / Biome** — auto-format on save
- **`tsc --noEmit`** — zero type errors
- **`eslint <touched> --max-warnings 0`** — zero findings
  (`sonarjs/recommended` + `@typescript-eslint/strict-type-
  checked` + `eslint-plugin-security`)
- **Build check** (`pnpm build`) when shape-affecting changes
  touch a build-time consumer
- **Test** (`vitest` / `jest`) — when test or consumer changed
- **`console.log` audit at Stop** — warn on any production-
  source occurrence

### Python (`*.py`, `*.pyi`)

- **Black / Ruff format** — auto-format on save
- **`ruff check --select=ALL`** — zero findings
- **`mypy --strict`** OR **`pyright --strict`** — zero type
  errors
- **`pytest`** — when test or consumer changed
- **`bandit -r .`** — zero security findings
- **`print()` warning** — `print()` in non-CLI source warns;
  use `logging`

### Java / Kotlin (`*.java`, `*.kt`)

- **Spotless / ktlint** — auto-format on save
- **`gradle check` / `mvn verify`** — zero compile + lint
  errors (Checkstyle, PMD, SpotBugs, ErrorProne, detekt)
- **JUnit / Kotest** — when test or consumer changed

### Ruby (`*.rb`)

- **`rubocop -A`** — zero offenses
- **`rspec`** — when spec or consumer changed
- **`brakeman`** — zero security findings

### Rust (`*.rs`, `Cargo.toml`)

- **`cargo fmt --check`** — formatted
- **`cargo clippy --all-targets --all-features -- -D warnings -W
  clippy::pedantic`** — zero findings
- **`cargo test`** — when test or consumer changed
- **`cargo audit`** + **`cargo deny check`** — zero
  CVE / license issues

### C / C++ (`*.c`, `*.cpp`, `*.h`, `*.hpp`)

- **`clang-format`** — formatted
- **`clang-tidy <files>`** — zero findings (full ruleset)
- **`cmake --build build/`** with `-Wall -Wextra -Werror`
- **`ctest`** — when test or consumer changed
- Sanitizers (AddressSanitizer, UBSan, ThreadSanitizer) in CI

### Swift (`*.swift`, `Package.swift`)

- **`swiftformat --lint`** + **`swiftlint`** — formatted +
  zero findings
- **`swift build`** — zero compile warnings
- **`swift test`** — when test or consumer changed

### Dart / Flutter (`*.dart`, `pubspec.yaml`)

- **`dart format --set-exit-if-changed`** — formatted
- **`dart analyze --fatal-infos --fatal-warnings`** — zero
  findings
- **`flutter test`** — when test or consumer changed

### C# (`*.cs`, `*.csproj`)

- **`dotnet format --verify-no-changes`** — formatted
- **`dotnet build /warnaserror`** — zero warnings
- **`dotnet test`** — when test or consumer changed

### Markdown (`*.md`, `*.mdc`)

- **`markdownlint-cli2`** — zero warnings (MD040 fenced code
  language, MD031 blanks around code, MD032 blanks around lists,
  MD022 blanks around headings; MD013 line-length tolerated only
  on unbreakable table rows)

### Infrastructure (`Dockerfile`, `*.yml`, `*.yaml`, `*.tf`)

- **Dockerfile**: `hadolint --no-fail` then PR-fail on any
  finding
- **YAML**: `yamllint -d "{extends: default}"`
- **Terraform**: `terraform fmt -check && terraform validate &&
  tflint --strict && tfsec && checkov`

### SQL (`*.sql`, `migrations/*`)

- **`sqlfluff lint --dialect=<project>`** — zero findings

### Bash (`*.sh`)

- **`shellcheck -S style`** — zero findings (style severity
  surfaces everything)
- **`shfmt -d`** — formatted
