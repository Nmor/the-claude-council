# Rules Catalog

> Index of every rule shipped with The Claude Council. Rules are the
> principles the Council enforces — every Council-mediated task
> applies the rules that match its file types and scope. Per
> [`rule-authoring-global-vs-project.md`](../rules/common/rule-authoring-global-vs-project.md),
> these are pure guidance; project specifics live in
> `<workspace>/.claude/rules/`.

## Counts

- **`rules/common/`** — 22 Floor rules (always-loaded every session)
- **`rules-library/common/`** — 60 lazy-loaded universal rules
- **`rules-library/<lang>/`** — 100 language rules across 20 subfolders
  (bash, cpp, csharp, dart, dockerfile, golang, html-css, java, kotlin,
  lua, markdown, python, ruby, rust, solidity, sql, swift, terraform,
  typescript, yaml)

The clusters below catalog the Floor + the lazy-loaded common rules;
language rules are listed under
[Language-specific rules](#language-specific-rules).

## Common rules — by cluster

### Council + protocol

| Rule | Purpose |
| ---- | ------- |
| [`council-default.md`](../rules/common/council-default.md) | Council is the default mode; no bypass surface |
| [`council-triggers.md`](../rules/common/council-triggers.md) | Per-division engagement signals for the Extended Eleven |
| [`agents.md`](../rules-library/common/agents.md) | Agent orchestration + parallel-task execution |
| [`auto-skills.md`](../rules-library/common/auto-skills.md) | File-to-skill-and-agent mapping (auto-fire on file type) |
| [`hooks.md`](../rules-library/common/hooks.md) | Hook lifecycle — Session/Prompt/PreTool/PostTool/PreCompact/Stop/SessionEnd |
| [`principal-level-mandate.md`](../rules/common/principal-level-mandate.md) | Every agent + skill + rule operates at principal level |
| [`performance.md`](../rules-library/common/performance.md) | Model selection policy (opus default for coding / reviewing / planning) |

### Planning + verification

| Rule | Purpose |
| ---- | ------- |
| [`task-intake-due-diligence.md`](../rules/common/task-intake-due-diligence.md) | 29-question intake before any non-trivial task |
| [`plan-task-breakdown.md`](../rules/common/plan-task-breakdown.md) | Long list of small atomic tasks; mandatory bloat-removal phase |
| [`plan-execution-progress.md`](../rules/common/plan-execution-progress.md) | Structured per-phase progress updates |
| [`plan-completion-before-push.md`](../rules/common/plan-completion-before-push.md) | Active plan declares commit-policy; no push until plan complete |
| [`verify-before-claim.md`](../rules/common/verify-before-claim.md) | Every completion claim preceded by same-turn verification |
| [`validate-payloads-before-coding.md`](../rules/common/validate-payloads-before-coding.md) | Validate any external payload against the real contract before writing the code that produces / consumes it |
| [`no-overclaim.md`](../rules/common/no-overclaim.md) | Reserve "done" / "shipped" / "complete" for verified states |
| [`post-phase-retrospective-review.md`](../rules/common/post-phase-retrospective-review.md) | Every phase re-audits ALL prior phases via different gates + a multi-division audit of its own work |
| [`phase-retrospective-sweep.md`](../rules/common/phase-retrospective-sweep.md) | The five-step mechanical sweep run at every phase boundary |
| [`principal-level-review-after-each-phase.md`](../rules/common/principal-level-review-after-each-phase.md) | Backward review of every prior phase for principal-level depth + intact cross-phase wiring |
| [`local-testability.md`](../rules-library/common/local-testability.md) | Every change locally testable BEFORE writing |
| [`done-criteria.md`](../rules/common/done-criteria.md) | Service-migration done checklist |
| [`proper-fixes-first.md`](../rules-library/common/proper-fixes-first.md) | Root-cause fixes; no shortcuts |

### Code quality + style

| Rule | Purpose |
| ---- | ------- |
| [`coding-style.md`](../rules-library/common/coding-style.md) | Universal code style baseline |
| [`patterns.md`](../rules-library/common/patterns.md) | Architectural patterns (repository, response envelope, etc.) |
| [`reuse-first.md`](../rules-library/common/reuse-first.md) | Sweep before write; rule of three; extend never fork |
| [`extreme-lint-policy.md`](../rules-library/common/extreme-lint-policy.md) | Strictest linters; thresholds tightened beyond defaults |
| [`sonarlint-checks.md`](../rules-library/common/sonarlint-checks.md) | Every SonarJS rule (~270) + cross-language equivalents |
| [`no-discards.md`](../rules-library/common/no-discards.md) | Bind every value; hook-enforced; pre-delivery 40-pattern audit |
| [`no-silent-failures.md`](../rules/common/no-silent-failures.md) | Floor: failures produce log + metric + typed response; observable best-effort swallows; absence-class detection |
| [`wiring-and-usage-review.md`](../rules/common/wiring-and-usage-review.md) | Floor: every new symbol has a live consumer; NETWORK + INFRA path is part of the live path (no inert validators / dead config) |
| [`no-bloat.md`](../rules/common/no-bloat.md) | Floor: least code that solves the problem; no speculative or inert surface; bloat-removal phase per plan |
| [`no-silent-drops.md`](../rules-library/common/no-silent-drops.md) | Never silently delete; complete or surface |
| [`no-ambient-globals.md`](../rules-library/common/no-ambient-globals.md) | DI everywhere; no module-level mutable state |
| [`no-local-fs.md`](../rules-library/common/no-local-fs.md) | No FS state on ephemeral containers; object store + buffers |
| [`error-handling-with-context.md`](../rules-library/common/error-handling-with-context.md) | Wrap with operation + ids; structured logs; client envelope |
| [`error-codes.md`](../rules-library/common/error-codes.md) | Stable codes; flat namespace; HTTP-status + UX + i18n + runbook |
| [`log-levels.md`](../rules-library/common/log-levels.md) | FATAL / ERROR / WARN / INFO / DEBUG / TRACE — ERROR reserved for alerts |

### Security

| Rule | Purpose |
| ---- | ------- |
| [`security.md`](../rules-library/common/security.md) | OWASP Top 10 umbrella; STRIDE; CVSS severity |
| [`security-controls-org-wide.md`](../rules-library/common/security-controls-org-wide.md) | 5-layer non-bypassable enforcement |
| [`secrets-management.md`](../rules-library/common/secrets-management.md) | Vault-first; no disk plaintext; atomic rotation |
| [`install-allowlist.md`](../rules-library/common/install-allowlist.md) | Publisher allowlist for npm / VS Code / MCP / Homebrew |
| [`dependency-vulnerabilities.md`](../rules-library/common/dependency-vulnerabilities.md) | CVE gate (MODERATE+ blocks) |
| [`dependency-overrides-not-exceptions.md`](../rules-library/common/dependency-overrides-not-exceptions.md) | Fix the tree via overrides; exceptions are last resort |
| [`dependency-pinning.md`](../rules-library/common/dependency-pinning.md) | Lockfiles + digest pinning + SHA-pinned actions |
| [`license-allowlist-gate.md`](../rules-library/common/license-allowlist-gate.md) | SPDX allowlist + Trove cross-check |
| [`updated-frameworks.md`](../rules-library/common/updated-frameworks.md) | Latest stable; no EOL; no abandoned deps |
| [`docker-localhost-binding.md`](../rules-library/common/docker-localhost-binding.md) | `127.0.0.1:` prefix on every dev port |
| [`docker-deployment.md`](../rules-library/common/docker-deployment.md) | Container security + multi-stage build patterns |
| [`repo-setup-checklist.md`](../rules-library/common/repo-setup-checklist.md) | 20-point first-touch security checklist |

### Resilience + ops

| Rule | Purpose |
| ---- | ------- |
| [`idempotency.md`](../rules-library/common/idempotency.md) | Retry-safe operations; Stripe-pattern keys |
| [`rate-limiting.md`](../rules-library/common/rate-limiting.md) | Multi-layer; per-endpoint defaults; RFC 6585 |
| [`circuit-breaker.md`](../rules-library/common/circuit-breaker.md) | Per-dependency breaker; timeout-bounded; observable |
| [`graceful-degradation.md`](../rules-library/common/graceful-degradation.md) | Criticality tiers; explicit degraded UX |
| [`feature-flags.md`](../rules-library/common/feature-flags.md) | Owner + expiry + decision criteria + removal task |
| [`observability.md`](../rules-library/common/observability.md) | 3 pillars + Four Golden Signals + W3C trace context |
| [`audit-logging.md`](../rules-library/common/audit-logging.md) | Append-only; hash-chain integrity; regulation-driven retention |
| [`runbook-template.md`](../rules-library/common/runbook-template.md) | Canonical incident-response structure |
| [`ci-test-memory-tuning.md`](../rules-library/common/ci-test-memory-tuning.md) | Jest / Vitest worker memory tuning for CI |
| [`github-actions-gotchas.md`](../rules-library/common/github-actions-gotchas.md) | 13 recurring CI platform surprises + recognition signatures |
| [`deploy-failures-become-checks.md`](../rules-library/common/deploy-failures-become-checks.md) | Every deploy failure becomes a pre-deploy check |

### API + data evolution

| Rule | Purpose |
| ---- | ------- |
| [`api-design.md`](../rules-library/common/api-design.md) | API surface design; response envelope; pagination |
| [`api-versioning.md`](../rules-library/common/api-versioning.md) | Tolerant reader / strict writer; parallel versions during deprecation |
| [`schema-evolution.md`](../rules-library/common/schema-evolution.md) | Additive, reversible, idempotent, zero-downtime migrations |
| [`contract-testing.md`](../rules-library/common/contract-testing.md) | CDC (Pact) + schema-based; producer's deploy gated |
| [`deprecation-lifecycle.md`](../rules-library/common/deprecation-lifecycle.md) | 4-stage calendar-anchored; RFC 8594 Sunset header |
| [`semver.md`](../rules-library/common/semver.md) | SemVer 2.0.0 + Conventional Commits 1.0.0 + Keep a Changelog 1.1.0 |

### Compliance + a11y + i18n

| Rule | Purpose |
| ---- | ------- |
| [`gdpr-ccpa.md`](../rules-library/common/gdpr-ccpa.md) | RoPA + lawful basis + 7 DSR rights + 72h breach notification |
| [`data-retention.md`](../rules-library/common/data-retention.md) | TTL + deletion path; automation-enforced; per-regulation minimums |
| [`a11y.md`](../rules-library/common/a11y.md) | WCAG 2.2 AA minimum; AAA for critical paths |
| [`i18n.md`](../rules-library/common/i18n.md) | ICU MessageFormat; Intl APIs; BCP 47 locales; RTL mirroring |
| [`code-of-conduct.md`](../rules-library/common/code-of-conduct.md) | Contributor Covenant v2.1; enforcement team + reporting |

### Documentation

| Rule | Purpose |
| ---- | ------- |
| [`documentation-requirements.md`](../rules-library/common/documentation-requirements.md) | Diátaxis four-quadrant model; docs as code |
| [`docs-sync-with-code.md`](../rules-library/common/docs-sync-with-code.md) | Docs update in the same PR as the code |
| [`adr-template.md`](../rules-library/common/adr-template.md) | Architecture Decision Records (MADR / Nygard) |
| [`official-docs-first.md`](../rules/common/official-docs-first.md) | Primary-source citations before any integration code |

### Workspace + dev experience

| Rule | Purpose |
| ---- | ------- |
| [`local-dev-setup.md`](../rules-library/common/local-dev-setup.md) | One bootstrap command; 30-minute first-run target |
| [`project-scoped-artifacts.md`](../rules/common/project-scoped-artifacts.md) | Workspace `.claude/` scaffold on first significant work |
| [`rule-authoring-global-vs-project.md`](../rules/common/rule-authoring-global-vs-project.md) | Classify global vs project before writing |
| [`continuous-learning-mandate.md`](../rules/common/continuous-learning-mandate.md) | Every artifact has a learning loop |
| [`git-workflow.md`](../rules-library/common/git-workflow.md) | Per-org git identity; conventional commits; PR workflow |
| [`testing.md`](../rules-library/common/testing.md) | Coverage targets; test types; TDD mandate |

## Language-specific rules

Each language subfolder contains the same five files: `coding-style.md`,
`no-discards.md`, `security.md`, `testing.md`, `patterns.md`. Some
also carry `hooks.md`. Each language rule **extends** the common
rule with language-specific banned patterns and linter configs.

### Backend + systems languages

- [`golang/`](../rules-library/golang/) — Effective Go + Uber Style Guide;
  `errcheck`, `errorlint`, `staticcheck`, `golangci-lint`, `gosec`,
  `govulncheck`
- [`python/`](../rules-library/python/) — PEP 8 + PEP 484 + PEP 561; `ruff`,
  `mypy --strict`, `pyright --strict`, `bandit`
- [`java/`](../rules-library/java/) — Effective Java 3e; Checkstyle, PMD,
  SpotBugs, ErrorProne; Spring Boot patterns
- [`kotlin/`](../rules-library/kotlin/) — Effective Kotlin; ktlint, detekt;
  coroutines + Sendable
- [`csharp/`](../rules-library/csharp/) — Framework Design Guidelines;
  Roslyn analyzers, StyleCop, SonarAnalyzer; ASP.NET Core
- [`ruby/`](../rules-library/ruby/) — Ruby Style Guide + Sandi Metz Rules;
  RuboCop, Brakeman, bundler-audit; Rails patterns
- [`rust/`](../rules-library/rust/) — Rust API Guidelines + Effective Rust;
  `cargo clippy -- -D warnings -W clippy::pedantic`, `cargo audit`,
  `cargo deny`
- [`cpp/`](../rules-library/cpp/) — C++ Core Guidelines + Effective Modern
  C++; clang-tidy + cppcheck + sanitizers
- [`swift/`](../rules-library/swift/) — Swift API Design Guidelines;
  SwiftLint + SwiftFormat; `Sendable` + `actor` for concurrency
- [`dart/`](../rules-library/dart/) — Effective Dart + Flutter Architecture
  Guide; analyzer at max strictness
- [`lua/`](../rules-library/lua/) — Programming in Lua + OpenResty practices;
  luacheck

### Web frontend languages

- [`typescript/`](../rules-library/typescript/) — TS strict mode +
  @typescript-eslint/strict-type-checked + sonarjs/recommended;
  React 19 + Vue 3 patterns

### Data + infra languages

- [`sql/`](../rules-library/sql/) — SQL:2023 + PostgreSQL Style Guide;
  sqlfluff strict; squawk for Postgres migration safety
- [`markdown/`](../rules-library/markdown/) — CommonMark spec + markdownlint
- [`bash/`](../rules-library/bash/) — Bash Reference Manual + Google Shell
  Style Guide; `set -euo pipefail`; ShellCheck `-S style`

## How rules are applied

1. **Always-on global rules** load on every file touch. The
   [`auto-skills.md`](../rules-library/common/auto-skills.md) rule lists
   the "global rules that auto-load on EVERY repo touch" section
   explicitly.
2. **File-type-mapped rules** load per the file-to-rule mapping in
   `auto-skills.md`. Touching a `*.go` file loads the `golang/*`
   rule set; touching a `*.tsx` file loads the `typescript/*` rule
   set; etc.
3. **Workspace rules** in `<workspace>/.claude/rules/` layer on top
   ADDITIVELY. Workspace rules may **raise** thresholds (stricter)
   but never **lower** them (looser). When layers conflict, the
   strictest wins.

## How rules are enforced

Rules are enforced through three mechanisms:

1. **Hooks** at the `PostToolUse` event — `no-discards`, hardcoded
   credentials, raw colour literals, merge-conflict markers — block
   the edit and return the violation to the agent.
2. **Linters** at extreme strictness — every language's strictest
   available linters with thresholds tightened beyond defaults per
   [`extreme-lint-policy.md`](../rules-library/common/extreme-lint-policy.md).
3. **Council review** — every Council-mediated task verifies the
   rules that match its scope. The agents enforce the rules via
   their decision authority and veto powers.

Per-line suppressions (`// eslint-disable`, `// @ts-ignore`,
`# noqa`, `//nolint`, etc.) are **banned everywhere**. If a rule is
wrong for the project, the project config changes — never the
per-line directive.

## See also

- [SKILLS.md](SKILLS.md) — the skills catalog
- [AGENTS.md](AGENTS.md) — the agents catalog
- [ARCHITECTURE.md](ARCHITECTURE.md) — how rules compose with
  skills + agents
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to add a rule
- [`../rules/common/rule-authoring-global-vs-project.md`](../rules/common/rule-authoring-global-vs-project.md)
  — global vs project classification
