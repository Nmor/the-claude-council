# Extreme Lint Policy (Always-On, Global)

> Auto-fires on every file. Sister to `sonarlint-checks.md`,
> `no-discards.md`, `no-silent-failures.md`, `no-silent-drops.md`,
> `done-criteria.md`, `proper-fixes-first.md`. This rule sets the
> CEILING for lint strictness — projects may not relax it, only
> match or exceed it.
>
> **Size budget: 19 KB** — `token-budget.mjs --check`.

## Core Principle

**Lint rules run at maximum strictness across every language. Every
finding — at every severity level — is a blocker. Zero suppressions.
Zero per-line `disable` directives. Zero `// nosec` / `# noqa` /
`@SuppressWarnings`. The lint config is part of the codebase's
contract with itself: it states what the code MUST look like, not
what it MAY look like.**

If a rule is wrong for the project, the project's lint CONFIG
changes (with a recorded rationale + reviewer sign-off). The CODE
never carries a per-line suppression to bypass the rule.

## Mandatory linters per language

Every project that includes a language MUST run every linter in
its row. Missing linters = the project is mis-configured, not the
code.

| Language | Mandatory linters | Mode |
| --- | --- | --- |
| TypeScript | `tsc --strict --noEmit`, `eslint` with `@typescript-eslint/strict-type-checked` + `@typescript-eslint/stylistic-type-checked` + `sonarjs/recommended` + project plugins, `prettier --check`, `biome check` (where Biome replaces ESLint) | `--max-warnings 0` |
| JavaScript | `eslint` with `sonarjs/recommended` + `eslint-plugin-import` + `eslint-plugin-promise` + `eslint-plugin-security` + `prettier --check` | `--max-warnings 0` |
| Go | `go vet ./...`, `staticcheck ./...`, `golangci-lint run` (with the full `linters: enable-all` set minus documented per-project exceptions), `errcheck`, `errorlint`, `goimports`, `gofmt -s`, `gosec`, `nilerr`, `revive`, `unparam`, `wastedassign` | All errors |
| Python | `ruff check --select=ALL` (every rule on), `mypy --strict`, `pyright --strict`, `pylint --enable=all`, `bandit -r .` | All errors |
| Java | `checkstyle` (strict), `pmd` (full ruleset), `spotbugs`, `errorprone` (`-Werror`) | All errors |
| Kotlin | `ktlint`, `detekt` (full ruleset + type-resolution), `androidLint` (where applicable) | All errors |
| Ruby | `rubocop -A --enable-pending-cops` (every cop on), `brakeman -A` | All errors |
| Rust | `cargo clippy --all-targets --all-features -- -D warnings -W clippy::pedantic -W clippy::nursery -W clippy::cargo`, `cargo audit`, `cargo deny check` | `-D warnings` |
| C / C++ | `clang-tidy` with `*` (every check), `clang-format` strict, `cppcheck --enable=all`, `-Wall -Wextra -Wpedantic -Werror -Wconversion -Wshadow`, address/thread/UB sanitizers in test runs | All errors |
| C# | `dotnet format --verify-no-changes`, `dotnet build /warnaserror`, Roslyn analyzers full ruleset, SonarAnalyzer, StyleCop | `/warnaserror` |
| Swift | `swiftlint` strict + `swiftformat --lint`, `SwiftFormat --lint --strict` | All errors |
| Dart / Flutter | `dart analyze --fatal-infos --fatal-warnings`, `dart format --set-exit-if-changed` | All findings |
| Lua | `luacheck --no-cache --std max+busted` | All errors |
| SQL | `sqlfluff lint --dialect=<dialect>` strict ruleset | All errors |
| Bash | `shellcheck -S style` (style severity to surface everything), `shfmt -d` | All findings |
| Dockerfile | `hadolint --no-fail` -- but THEN the project pre-flight fails on ANY hadolint finding | All findings |
| YAML | `yamllint -d "{extends: default, rules: {line-length: {max: 200}}}"` | All errors |
| Markdown | `markdownlint-cli2` with the project's `.markdownlint.jsonc` | All warnings |
| Terraform / HCL | `terraform fmt -check`, `tflint --strict`, `tfsec`, `checkov` | All findings |
| GitHub Actions | `actionlint` strict | All findings |

Any language not in this table that the project uses MUST have the
equivalent strictest-available linter wired with the same "all
findings block" posture.

## Mandatory threshold settings (override the defaults DOWN)

The defaults that ship with most linters are calibrated for
gradual adoption. This rule overrides them to extreme settings:

| Threshold | Default | Extreme |
| --- | --- | --- |
| Cognitive complexity (Sonar S3776) | 15 | 10 |
| Cyclomatic complexity | 10 | 7 |
| Function lines (Sonar S138) | 200 | 80 |
| Function parameters (Sonar S107) | 7 | 5 |
| File lines (Sonar S104) | 1000 | 500 |
| Class members (NCount) | 50 | 25 |
| Nested control-flow depth (Sonar S134) | 4 | 3 |
| Max line length (markdown / non-table) | varies | 100 |
| Coverage minimum (touched files) | varies | 90% |
| Coverage minimum (project) | varies | 80% |
| Boolean expression operators (Sonar S1067) | 3 | 2 |
| Single-character variables outside `i, j, k, _` | allowed | disallowed |
| Magic-number tolerance (Sonar S109) | builtin allowlist | 0, 1, -1, 2 only |

When a project's existing code can't yet meet these thresholds,
the project's lint config carries an EXPLICIT temporary override
in `.lint-debt.md` (or equivalent) listing every relaxed rule + its
target date for re-tightening. Per-line suppressions remain
forbidden.

## Zero suppression directives — anywhere

Every form of "shut the linter up for this line" is banned:

| Language | Banned tokens |
| --- | --- |
| TypeScript / JavaScript | `// eslint-disable*`, `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck`, `/* eslint-disable */`, `// biome-ignore *`, `// prettier-ignore` |
| Go | `//nolint*`, `//nosec*`, `//revive:disable*`, `//goerr113:noinspection` |
| Python | `# noqa*`, `# type: ignore*`, `# pylint: disable*`, `# pragma: no cover*`, `# bandit: skip*` |
| Ruby | `# rubocop:disable*`, `# brakeman:ignore*`, `# sorbet:ignore*` |
| Java | `@SuppressWarnings`, `// CHECKSTYLE:OFF`, `// PMD-NoSqlInjectionPMDCheck` |
| Kotlin | `@Suppress`, `@SuppressWarnings`, `// noinspection *`, `@SuppressLint` |
| C# | `#pragma warning disable*`, `[SuppressMessage]`, `// ReSharper disable*` |
| Swift | `// swiftlint:disable*`, `// swiftformat:disable*` |
| Rust | `#[allow(*)]`, `#[allow(clippy::*)]`, `#[cfg_attr(*, allow(*))]` |
| C / C++ | `#pragma clang diagnostic ignored`, `#pragma GCC diagnostic ignored`, `// NOLINT*`, `// NOSONAR` |
| Dart | `// ignore: *`, `// ignore_for_file: *` |
| SQL / sqlfluff | `-- noqa: *`, `-- sqlfluff:*` |
| Bash / shell | `# shellcheck disable=*` |
| Markdown | `<!-- markdownlint-disable* -->` |

When the linter is wrong for the project: fix the project lint
config and document the change. When the code is wrong: fix the
code. Never suppress.

## When the linter rule itself is wrong

Genuine cases exist (linter false positive, framework-required
pattern, language idiom the linter doesn't yet understand). The
fix is:

1. **Confirm** the rule is wrong by minimal reproduction (the
   smallest snippet that triggers the rule + the rationale for
   why the snippet is correct).
2. **Disable globally in the project config** with a comment
   block naming the rule id, the reason, the reviewer, and a
   re-evaluation date.
3. **Never disable per-line.** Even when "just this one place
   needs it" — that's a code-smell signal that either:
   - the rule needs a project-wide override, OR
   - the code can be restructured to comply, OR
   - the linter has a config option (e.g., allowlist) that
     handles the case without disabling.

## CI integration

Every project's CI:

- Runs every linter in this rule
- Fails on ANY finding (no `continue-on-error: true`, no
  `--exit-zero`)
- Surfaces the failure as a required status check (per
  `security-controls-org-wide.md`)
- Caches the linter binaries to keep runtime fast
- Re-runs the linter in the deploy pipeline as a pre-deploy gate
  (per `deploy-failures-become-checks.md`)

CI configuration that masks lint findings is itself a lint
violation. Reviewers reject `continue-on-error` on lint steps.

## Pre-commit hook

Every repo has a `.githooks/pre-commit` (enabled via `git config
core.hooksPath .githooks`) that runs the SAME lint commands CI
runs, scoped to the changed files. The hook is mandatory; bypass
via `--no-verify` is forbidden per the global rule on actions.

## Editor integration

Every supported IDE (VS Code, Cursor, JetBrains family, Windsurf,
Neovim, Emacs) gets a `.vscode/settings.json` / `.idea/inspection
profile.xml` / equivalent that:

- Points at the project's lint config
- Surfaces every finding inline
- Sets format-on-save = on (so format-blockers don't accumulate)
- Disables the IDE's "auto-suppress" features

## The sweep is REPO-WIDE, not diff-scoped

**The unit of compliance is the repository, not the file you happened
to open.** Run every mandatory linter across the whole tree — not
`eslint <touched files>`, not `staticcheck ./internal/thing/...` —
because a finding's severity has nothing to do with whether today's
task went near it. A defect in a file nobody touched this week is
still a defect; scoping the sweep to the diff simply moves the
backlog out of view and lets it compound.

This does NOT mean every task must end with the whole repo at zero —
a codebase adopting these thresholds may start with hundreds of
findings, and demanding they all clear before any feature lands is
how a policy gets abandoned. It means the repo-wide number is
**measured, stated, and monotonically decreasing**:

### 1. No net-new findings, ever

The repo-wide count after your change is **≤** the count before.
A change that adds one finding while removing none is rejected, no
matter how clean its own diff looks.

### 2. State the count; never state it and walk on

Reporting "170 pre-existing discards across the repo" and proceeding
is not compliance — it is the violation, written down. Whenever a
sweep surfaces a pre-existing backlog, the same turn either:

- **burns it down** (whole class fixed — usually the right call for
  mechanical classes: a rename, an import, a loop form), or
- **burns down a named slice** and records the remaining count with
  the specific next slice, or
- **explains why the class cannot be fixed mechanically** and what
  would make it fixable.

"Pre-existing" is an explanation of origin. It is never a
disposition.

### 3. Prefer whole-class fixes to per-file fixes

Lint findings arrive in classes, not as individuals. When a class
has N occurrences, fixing the three in your diff leaves N-3 and
guarantees the next author meets the same trap. Fix the class:
mechanical classes are usually a single scripted pass plus one
careful review of the exceptions.

### 4. The backlog is visible, not implicit

A repository not yet at zero carries its current counts in a
checked-in artifact (a lint-baseline file, a CI summary, or the
project's docs) with the trend. An invisible backlog is
indistinguishable from a clean repo right up until someone measures
it — which is how a codebase discovers 170 of something.

### 5. New rules are adopted at full strength, with a burn-down

Turning on a linter that surfaces 400 findings is correct. What is
not correct is enabling it with the findings suppressed, or scoping
it to changed files "for now" — both make the rule permanently
decorative (see `no-discards.md` on suppression, and the
inert-control shape in `wiring-and-usage-review.md`).

## Verification block

Every completion claim names the lint sweep result, and the counts
are **repo-wide** unless explicitly labelled otherwise:

```text
Lint sweep (this turn, repo-wide):
- tsc --strict --noEmit: 0 errors
- eslint src/ --max-warnings 0: 0 warnings (sonarjs + strict-type-checked)
- staticcheck ./... : 0
- golangci-lint run ./... : 0 issues
- IDE diagnostics: 0
- pre-existing backlog: <class>: N remaining (was M) — next slice: <what>
```

A line of "looks clean" or "lint passes" without the explicit
counts is NOT a lint sweep — it's an aspiration. Counts scoped to
the touched files, presented as if they were the repo's, are worse:
they read as proof while measuring the one region guaranteed to be
clean.

## Cross-references

- `sonarlint-checks.md` — the 269 SonarJS rules + cross-language
  equivalents (this rule mandates the strict subset of those)
- `no-discards.md` — discarded values are themselves a lint
  violation; the hook enforces them server-side
- `no-silent-failures.md` — empty catches, swallowed promises,
  silent fallbacks are lint violations
- `no-silent-drops.md` — TODO/FIXME/XXX, suppression directives,
  meta-comments are lint violations
- `done-criteria.md` — every "done" claim runs the full lint
  sweep this turn
- `proper-fixes-first.md` — never silence a lint finding to make
  the symptom go away
- `security-controls-org-wide.md` — the 5-layer enforcement
  pattern this rule plugs into

## Why this rule exists

Lint defaults are calibrated for gradual adoption — they tolerate
patterns that produce real defects (cognitive complexity 15,
function length 200 lines, parameters 7) because too-strict-by-
default would alienate existing codebases. A codebase building
new today does not need the gradual-adoption pacing; it benefits
from extreme defaults that catch defects at the earliest possible
moment.

User directive (verbatim): **"update lint rules extremely"**.

**Amended 2026-09-06** after the diff-scoped reading of this policy
failed in practice. A session swept a four-repo workspace, found 170
range-loop discards, 31 tracker-ID comments and 4 outstanding
`golangci-lint` findings, fixed only the handful that fell inside
files it had already opened, reported the remaining counts, and moved
on — all of which the touch-scoped wording permitted. The counts were
accurate and the work was still wrong: an accurate number attached to
no action is a backlog with better documentation.

User directive (verbatim, 2026-09-06): **"picking up lint and issues
should not only be when a file is touched. Update rule"**. The unit of
compliance is now the repository, and a stated count carries an
obligation to reduce it.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Per-line suppression attempted (`// eslint-disable`, `//nolint`,
  `# noqa`, etc.) — rule violation
- Linter config change that loosens a threshold instead of fixing
  code (escape-hatch pattern)
- Same lint class recurring across PRs in 30 days (developer-pattern
  signal — needs surfaced)
- New language entering the rebuild without a mandatory-linters row
  in the table (rule extension needed)
- Coverage threshold drift below 80% project / 90% touched
  (extreme-lint enforcement weak)
- CI lint step set to `continue-on-error` (rule violation — surface
  in `security-controls-org-wide.md` enforcement)
- Threshold (cognitive complexity, function length, parameters) creep
  above the strict cap on a class of functions (architectural smell)
- A sweep reported repo-wide as scoped-to-touched-files, or a
  pre-existing count stated with no burn-down in the same turn (the
  2026-09-06 failure this rule was amended for)
- A repo-wide count that stops decreasing across consecutive sessions
  (the backlog has become permanent furniture)

**Refinement candidates**:

- New mandatory-linters row when a language gains presence in the
  rebuild
- New strict-threshold value when a default proves too loose for a
  class of bugs
- Tightening of the suppression-detection sweep when bypass patterns
  evolve
- New cross-reference when a sister rule's enforcement is the better
  home for a finding class
