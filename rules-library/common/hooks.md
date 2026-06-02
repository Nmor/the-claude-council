# Hooks System (Always-On, Global)

> Auto-fires on every file. Sister to `auto-skills.md` (the
> file-to-skill mapping), `no-discards.md` (the canonical
> hook-enforced rule), `done-criteria.md` (the per-language
> verification suite each hook runs), and `extreme-lint-policy.md`
> (the strictness thresholds the hooks enforce).

## Core Principle

**Hooks are the mechanical enforcement layer that makes every
other rule unskippable.** Where a rule says "the agent SHOULD
verify X", a hook enforces "X is verified, the agent cannot
proceed otherwise." Hooks are the difference between a guideline
and a contract.

## Hook lifecycle (Claude Code)

| Hook | When | What it does |
| --- | --- | --- |
| **SessionStart** | First message of a session | Load workspace `CLAUDE.md`, prior memory, project state; surface workspace rules; prime context |
| **UserPromptSubmit** | Each user prompt | Evaluate clarity, expand vague prompts via `prompt-improver` skill; fast-path bypass for `/`, `*`, `#` prefixes |
| **PreToolUse** | Before each tool call | Validate parameters, enforce allow/deny lists, ask user for risky actions, secrets-pattern detection, network egress check |
| **PostToolUse** | After each tool call | Auto-format, lint, run gates on touched files, IDE-diagnostic capture, hook-enforced rule checks |
| **PreCompact** | Before context compaction | Persist running plan + intermediate state to durable memory; plan snapshot; TODO state |
| **Stop** | End of an agent turn | Final verification of touched files, surface remaining gaps, "uncommitted changes" notice |
| **SessionEnd** | End of session | Persist learnings, evaluate patterns, log telemetry, audit log entry |

Each project may add hooks in `~/.claude/settings.json`
(global) or `<project>/.claude/settings.json` (workspace).

## Mandatory hooks (global default)

| Hook | File | What it enforces |
| --- | --- | --- |
| UserPromptSubmit | `~/.claude/hooks/improve-prompt.py` | Prompt-clarity evaluation; routes vague prompts through `prompt-improver` skill |
| PostToolUse (Edit/Write) | `~/.claude/scripts/hooks/post-edit-no-discards.js` | Rejects edits introducing discards, suppressions, hardcoded credentials, `console.log` in product source, weak-crypto patterns, raw colour literals, merge-conflict markers |
| PostToolUse (touched files) | Project-level | Auto-format + lint + IDE-diagnostic capture per language |

Adding a new hook requires updating this file with the rule it
enforces; the rule and the hook stay in lockstep.

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

## Auto-accept permissions (PreToolUse policy)

Use with extreme caution:

- **Enable** ONLY for trusted, well-defined plans (e.g.,
  read-only research, sandboxed FS edits within the project)
- **Disable** for anything destructive, anything that touches
  the network, anything that writes outside the working tree
- **NEVER** use `--dangerously-skip-permissions`
- **Configure** `allowedTools` in `~/.claude/settings.json` or
  workspace settings instead of bypassing the permission prompt

Per `install-allowlist.md`, global installs always ask. Per
`secrets-management.md`, vault operations ask before mutating.

## TodoWrite practices (the agent's progress surface)

The `TodoWrite` tool is mandatory whenever:

- A task has 3+ distinct steps
- A multi-phase plan is in execution (per `plan-execution-
  progress.md`)
- The user explicitly asks for tracking

What the TodoWrite list reveals:

- **Out-of-order steps** — caught at planning time
- **Missing items** — gaps surface
- **Extra unnecessary items** — pruned before any code
- **Wrong granularity** — too coarse vs too fine
- **Misinterpreted requirements** — user corrects before
  any keystrokes

Exactly ONE task `in_progress` at any time. Tasks move to
`completed` IMMEDIATELY on finishing. The list mirrors the
plan file's task hierarchy (per `plan-task-breakdown.md`).

## Cross-references

- `auto-skills.md` — file-to-skill mapping fired by PostToolUse
- `no-discards.md` — the canonical PostToolUse hook
- `done-criteria.md` — the per-language verification suite
- `extreme-lint-policy.md` — the strict thresholds enforced
- `plan-execution-progress.md` — TodoWrite is the live surface
- `install-allowlist.md` — PreToolUse install gating
- `secrets-management.md` — PreToolUse vault gating

## Why this rule exists

Without mechanical hooks, every rule depends on the agent
remembering to enforce it. Memory is unreliable; hooks are
deterministic. The hook layer makes "did the agent check X" a
non-question — if the hook fires, X is checked; if X failed,
the hook blocks the edit. The agent then either fixes the
failure or surfaces it explicitly; silent bypass is not an
option.

Hooks are the floor, not the ceiling — they catch the routine
violations so the agent's attention stays on the design-level
questions.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New rule shipped without corresponding hook enforcement when mechanical enforcement is feasible (drift toward "guideline-only")
- PostToolUse hook bypassed via `CLAUDE_NO_DISCARDS_HOOK=off` by the agent (operator-only override misused)
- New language adopted without its PostToolUse gate wired (per-language hook gap)
- `--no-verify` used to bypass pre-commit / pre-push hook (sister `proper-fixes-first.md` weakening)
- Auto-accept permissions enabled for destructive / network tools (PreToolUse policy weakening)
- TodoWrite not invoked on a 3+-step task (rule "TodoWrite practices" weakening)
- Multiple TodoWrite items `in_progress` simultaneously (one-in-progress invariant violated)
- Stop hook surfaces uncommitted changes but the agent proceeds to next task anyway (Stop hook ignored)

**Refinement candidates**:
- New row in the lifecycle table when a new hook event surfaces (e.g., new IDE plugin event, new MCP gateway hook)
- New per-language gate row when a new stack adopts (e.g., new build system, new test runner)
- Tightening of the auto-accept policy when a destructive false-positive recurs
- New cross-reference when a sister rule (no-discards, install-allowlist, secrets-management) introduces a hook the rule depends on
