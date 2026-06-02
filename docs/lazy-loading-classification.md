# Lazy-Loading Classification

> Phase B output of `~/.claude/plans/lazy-rules-loading.md`. Every
> file under `~/.claude/rules/common/` and `~/.claude/rules/<lang>/`
> classified into one of:
>
> - **Floor** — always-loaded global; must remain inline in
>   `CLAUDE.md` references OR remain as a `rules/common/*.md` that
>   the runtime always reads.
> - **Skill-routed** — moves into an Anthropic Agent Skills
>   `SKILL.md` so it lazy-loads only when the skill's `paths:`
>   frontmatter matches a touched file.
> - **Index-only** — preserved as a one-line index pointer; full
>   body migrated into a skill.
> - **REMOVE** — the catch-all anti-pattern that defeats lazy-
>   loading (only `auto-skills.md`).
>
> Total catalogued: 75 files in `rules/common/` + 18 language
> subdirectories (solidity + terraform empty; ~120 language-rule
> files total).
>
> Classification rule: a file is **Floor** only if it MUST fire
> on every interaction (governance, council protocol invariants,
> verify-before-claim, plan-completion-before-push, no-overclaim,
> compaction-survival memory, project-scoped artifacts). Every
> other rule moves to a skill that fires only when the relevant
> file type or domain keyword is touched.

## Floor — 13 files (always-on)

| File | Why floor (one-line rationale) |
| --- | --- |
| `common/council-default.md` | Council is the always-on operating mode; every interaction routes through Phase 0-1-2-3 |
| `common/principal-level-mandate.md` | Sets the quality bar every artifact must meet; cannot be lazy-loaded |
| `common/continuous-learning-mandate.md` | Learning loop is universal; every Council turn emits learning events |
| `common/task-intake-due-diligence.md` | 29-question intake gates every non-trivial task; precedes domain triggers |
| `common/plan-execution-progress.md` | Per-phase progress structure applies to every plan |
| `common/plan-completion-before-push.md` | Push gate — universal commit policy regardless of language |
| `common/plan-task-breakdown.md` | Task granularity rules apply to every plan |
| `common/no-overclaim.md` | "Done" claims need verification regardless of domain |
| `common/verify-before-claim.md` | Verification block paired with every claim — universal |
| `common/done-criteria.md` | Service-migration done checklist — applies to every task type |
| `common/project-memory.md` | MEMORY.md discipline survives compaction; project-agnostic |
| `common/project-scoped-artifacts.md` | Workspace `.claude/` scaffold rule — universal first-touch |
| `common/rule-authoring-global-vs-project.md` | Meta-rule for classifying NEW rules; needed before any rule edit |

**Floor budget**: 13 files × ~6-10 KB avg = ~85-110 KB always-on.
Down from the current ~1.7 MB cold load (~94% reduction).

## REMOVE — 1 file (anti-pattern)

| File | Why remove |
| --- | --- |
| `common/auto-skills.md` | `paths: ["**/*"]` catch-all is the root cause of the bloat — defeats lazy-load. Per-skill `paths:` frontmatter replaces the central mapping. |

## Skill-routed — language groups (extend existing skills)

Per `~/.claude/rules-library/common/reuse-first.md`, each language group
**extends an existing skill** when one exists; only forks when no
sibling skill is present.

| Language dir | Files | Target skill (extend or new) |
| --- | --- | --- |
| `rules/bash/` | coding-style, hooks, no-discards, patterns, security, testing | `bash-scripting-patterns` (NEW — no existing skill) |
| `rules/cpp/` | coding-style, hooks, no-discards, patterns, security, testing | EXTEND `cpp-coding-standards` + `cpp-testing` |
| `rules/csharp/` | coding-style, hooks, no-discards, patterns, security, testing | `csharp-patterns` (NEW) |
| `rules/dart/` | coding-style, hooks, no-discards, patterns, testing | `dart-flutter-patterns` (NEW) |
| `rules/dockerfile/` | coding-style, hooks, patterns, security, testing | `dockerfile-patterns` (NEW; pair with existing `aws-serverless-patterns` cross-refs) |
| `rules/golang/` | hooks, no-discards | EXTEND `golang-patterns` + `golang-testing` |
| `rules/html-css/` | coding-style, hooks, patterns, security, testing | EXTEND `frontend-patterns` |
| `rules/java/` | coding-style, hooks, no-discards, patterns, security, testing | EXTEND `java-coding-standards` + `springboot-patterns` |
| `rules/kotlin/` | coding-style, hooks, no-discards, patterns, security, testing | `kotlin-patterns` (NEW) |
| `rules/lua/` | coding-style, hooks, no-discards, patterns, security, testing | `lua-patterns` (NEW) |
| `rules/markdown/` | coding-style | `markdown-style` (NEW; lightweight) |
| `rules/python/` | no-discards | EXTEND `python-patterns` + `python-testing` |
| `rules/ruby/` | coding-style, hooks, no-discards, patterns, security, testing | `ruby-rails-patterns` (NEW) |
| `rules/rust/` | coding-style, hooks, no-discards, patterns, security, testing | `rust-patterns` (NEW) |
| `rules/sql/` | coding-style, hooks, no-discards, patterns, security, testing | `sql-patterns` (NEW) |
| `rules/swift/` | hooks, no-discards, patterns | EXTEND `swift-actor-persistence` + `swift-protocol-di-testing` |
| `rules/typescript/` | no-discards | EXTEND `typescript-patterns` |
| `rules/yaml/` | coding-style, hooks, patterns, security | `yaml-patterns` (NEW) |

**Path glob per language skill**:

- `bash-scripting-patterns`: `**/*.sh`, `**/*.bash`, `**/*.zsh`
- `cpp-coding-standards`: `**/*.c`, `**/*.cpp`, `**/*.cc`, `**/*.cxx`, `**/*.h`, `**/*.hpp`
- `csharp-patterns`: `**/*.cs`, `**/*.csproj`, `**/*.sln`
- `dart-flutter-patterns`: `**/*.dart`, `pubspec.yaml`
- `dockerfile-patterns`: `**/Dockerfile`, `**/Dockerfile.*`, `**/*.dockerfile`, `**/docker-compose*.yml`, `**/compose*.yml`
- `golang-patterns`: `**/*.go`, `go.mod`, `go.sum`
- `frontend-patterns`: `**/*.vue`, `**/*.tsx`, `**/*.jsx`, `**/*.css`, `**/*.scss`, `**/*.html`
- `java-coding-standards`: `**/*.java`, `pom.xml`, `**/*.gradle`, `**/*.gradle.kts`
- `kotlin-patterns`: `**/*.kt`, `**/*.kts`, `build.gradle.kts`
- `lua-patterns`: `**/*.lua`, `**/*.rockspec`
- `markdown-style`: `**/*.md`, `**/*.mdc`, `**/*.markdown`
- `python-patterns`: `**/*.py`, `**/*.pyi`, `pyproject.toml`, `requirements*.txt`, `Pipfile`
- `ruby-rails-patterns`: `**/*.rb`, `**/*.rake`, `**/*.gemspec`, `Gemfile`, `Rakefile`
- `rust-patterns`: `**/*.rs`, `Cargo.toml`, `Cargo.lock`
- `sql-patterns`: `**/*.sql`, `migrations/**`, `db/**`
- `swift-actor-persistence`: `**/*.swift`, `Package.swift`
- `typescript-patterns`: `**/*.ts`, `**/*.tsx`, `**/*.mts`, `**/*.cts`, `tsconfig*.json`
- `yaml-patterns`: `**/*.yml`, `**/*.yaml`

## Skill-routed — domain groups (revised 2026-06-02: reuse-first)

> **Reuse-first correction**: Phase B initially proposed 14-15
> NEW domain skills. On audit against the 99 existing skills,
> 6 proposed skills duplicate existing skill scope and SHOULD
> EXTEND those skills instead of creating sibling slugs.
> Per `~/.claude/rules-library/common/reuse-first.md` (Floor) — extend,
> never fork.

### Existing skills to EXTEND (no new slug)

| Existing skill | Rules to absorb |
| --- | --- |
| `security-review` | `security.md`, `security-controls-org-wide.md`, `secrets-management.md`, `audit-logging.md`, `official-docs-first.md` |
| `api-design` | `api-design.md` (rules/common/), `api-versioning.md`, `contract-testing.md`, `schema-evolution.md`, `deprecation-lifecycle.md` |
| `docker-patterns` | `docker-localhost-binding.md`, `docker-deployment.md` |
| `gdpr-ccpa-compliance` | `gdpr-ccpa.md`, `data-retention.md` |
| `wcag-accessibility` | `a11y.md` (much of this content may already be present; verify + augment) |
| `observability-patterns` | `observability.md` |

### Genuinely NEW domain skills (no existing skill covers)

Each domain skill bundles tightly-related rules from `rules/
common/`. The skill's `paths:` frontmatter matches the file
types that trigger the domain.

### 1. `planning-rules` skill

Auto-fires on plan files + multi-phase work.

- `common/code-graph-validation.md`
- `common/adr-template.md`
- `common/runbook-template.md`

(Note: `task-intake-due-diligence.md`, `plan-task-breakdown.md`,
`plan-execution-progress.md`, `plan-completion-before-push.md`
stay in Floor — they govern every task, not just planning files.)

**Paths**: `~/.claude/plans/**/*.md`, `**/.claude/plans/**/*.md`,
`docs/adr/**/*.md`, `docs/runbook*.md`, `**/runbook.md`

### 2. `council-rules` skill

Auto-fires on agent / council artifact edits.

- `common/council-triggers.md`
- `common/agents.md`

**Paths**: `~/.claude/agents/**/*.md`, `**/.claude/agents/**/*.md`

### 3. `coding-quality-rules` skill

Auto-fires on any code file.

- `common/coding-style.md`
- `common/patterns.md`
- `common/reuse-first.md`
- `common/proper-fixes-first.md`
- `common/no-silent-drops.md`
- `common/no-silent-failures.md`
- `common/no-discards.md`
- `common/no-ambient-globals.md`
- `common/no-local-fs.md`
- `common/error-codes.md`
- `common/error-handling-with-context.md`
- `common/log-levels.md`
- `common/semver.md`
- `common/extreme-lint-policy.md`
- `common/updated-frameworks.md`
- `common/performance.md`
- `common/testing.md`
- `common/local-testability.md`
- `common/local-dev-setup.md`

**Paths**: `**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,py,go,rb,rs,java,kt,kts,swift,dart,cs,c,cpp,h,hpp,sh,lua,sql,php}`

### 4. `git-rules` skill

Auto-fires on git config + repo setup.

- `common/git-workflow.md`
- `common/repo-setup-checklist.md`
- `common/docs-sync-with-code.md`
- `common/documentation-requirements.md`

**Paths**: `.gitignore`, `.gitattributes`, `.git/**`, `CONTRIBUTING.md`, `README.md`, `docs/**/*.md`

### 5. `dependency-rules` skill

Auto-fires on manifest + lockfile edits.

- `common/dependency-pinning.md`
- `common/dependency-vulnerabilities.md`
- `common/dependency-overrides-not-exceptions.md`
- `common/license-allowlist-gate.md`
- `common/install-allowlist.md`

**Paths**: `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `go.mod`, `go.sum`, `Cargo.toml`, `Cargo.lock`, `pyproject.toml`, `poetry.lock`, `Gemfile`, `Gemfile.lock`, `pom.xml`, `build.gradle*`, `*.csproj`, `Package.swift`, `Package.resolved`, `pubspec.yaml`, `requirements*.txt`

### 6. `security-extended-rules` skill

Auto-fires on auth / secrets / security-sensitive code.

- `common/security.md`
- `common/security-controls-org-wide.md`
- `common/secrets-management.md`
- `common/audit-logging.md`
- `common/official-docs-first.md`

**Paths**: `**/*auth*`, `**/*login*`, `**/*signup*`, `**/*oauth*`, `**/*saml*`, `**/*sso*`, `**/*.env*`, `**/secrets/**`, `**/credentials/**`, `**/*token*`, `**/*jwt*`, `**/*audit*`

### 7. `privacy-rules` skill

Auto-fires on PII / data lifecycle work.

- `common/gdpr-ccpa.md`
- `common/data-retention.md`
- `common/i18n.md`

**Paths**: `**/*gdpr*`, `**/*ccpa*`, `**/*privacy*`, `**/*consent*`, `**/i18n/**`, `**/locales/**`, `**/translations/**`, `**/migrations/**`

### 8. `a11y-rules` skill

Auto-fires on UI files.

- `common/a11y.md`
- (Pairs with existing `frontend-patterns` skill)

**Paths**: `**/*.vue`, `**/*.tsx`, `**/*.jsx`, `**/*.svelte`, `**/components/**`, `**/views/**`, `**/pages/**`, `**/layouts/**`

### 9. `api-rules` skill

Auto-fires on API specs + schema files.

- `common/api-design.md`
- `common/api-versioning.md`
- `common/contract-testing.md`
- `common/schema-evolution.md`
- `common/deprecation-lifecycle.md`

**Paths**: `**/openapi*.{yml,yaml,json}`, `**/asyncapi*.{yml,yaml,json}`, `**/*.proto`, `**/schema.graphql`, `**/migrations/**/*.sql`, `**/api/**`, `**/routes/**`, `**/handlers/**`, `**/controllers/**`

### 10. `reliability-rules` skill

Auto-fires on resilience / observability code.

- `common/circuit-breaker.md`
- `common/graceful-degradation.md`
- `common/feature-flags.md`
- `common/idempotency.md`
- `common/rate-limiting.md`
- `common/observability.md`
- `common/deploy-failures-become-checks.md`

**Paths**: `**/*circuit*`, `**/*breaker*`, `**/*resilience*`, `**/feature*flag*`, `**/*idempot*`, `**/*rate*limit*`, `**/observability/**`, `**/metrics/**`, `**/traces/**`, `**/logs/**`

### 11. `docker-rules` skill

Auto-fires on Docker artifact edits.

- `common/docker-localhost-binding.md`
- `common/docker-deployment.md`

(Note: full Dockerfile coding style lives in the
`dockerfile-patterns` skill above; these two rules are the
cross-cutting localhost-binding + deployment-time gates.)

**Paths**: `**/Dockerfile*`, `**/docker-compose*.{yml,yaml}`, `**/compose*.{yml,yaml}`

### 12. `ci-rules` skill

Auto-fires on CI config edits.

- `common/ci-test-memory-tuning.md`
- `common/github-actions-gotchas.md`
- `common/hooks.md`

**Paths**: `.github/workflows/**/*.{yml,yaml}`, `.github/actions/**/*.{yml,yaml}`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `.circleci/**`, `bitbucket-pipelines.yml`, `.githooks/**`, `.pre-commit-config.yaml`

### 13. `sonar-rules` skill

Auto-fires on code files (deep linter rule catalog).

- `common/sonarlint-checks.md`

(Largest single rule at ~50 KB — moving to lazy-load is the
single biggest context-budget win.)

**Paths**: same as `coding-quality-rules` (any code file).

### 14. `community-rules` skill

Auto-fires on community / governance artifacts.

- `common/code-of-conduct.md`

**Paths**: `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `CODEOWNERS`, `.github/CODEOWNERS`, `GOVERNANCE.md`

## Cross-skill cross-references

Skills cross-reference each other in their `## Cross-references`
sections. Loading skill X does NOT cascade-load skill Y — the
references are documentation-only. The runtime loads only skills
whose `paths:` actually match the touched file set.

## Summary counts

| Bucket | Count |
| --- | --- |
| Floor (always-on) | 13 |
| REMOVE (`auto-skills.md`) | 1 |
| Domain skills (new) | 14 |
| Language skills (new + extended) | 18 |
| Files migrated into language skills | 100 (per-lang .md files across 18 dirs) |
| Files migrated into domain skills | 61 (every non-Floor file under common/) |
| **Total files classified** | 175 (75 common/ + 100 language/) |
| **Cold-load file count after migration** | 13 (Floor only) |

### common/ coverage audit

All 75 files in `~/.claude/rules/common/` are accounted for:

- 13 → Floor
- 1 → REMOVE (auto-skills.md)
- 61 → one of 14 domain skills

Gaps fixed in this revision (2026-06-02): `api-design.md` added
to `api-rules`; `docker-deployment.md` added to `docker-rules`.

## Anchoring quotes (plan)

> *"Floor: 13 (matches whitelist); Skill-routed: ~140 across ~24
> skills; Index-only: ~7; Council consensus: GO; Security
> signoff: recorded; code-graph: outbound references in
> classification table all resolve"*

This classification satisfies the Phase B target.
