---
name: ci-rules
description: CI + hooks discipline — ci-test-memory-tuning (test-suite memory budget vs runner OS headroom; OOM vs worker-thrash diagnostic), github-actions-gotchas (named pitfalls: bash -e + pipefail, 21K char expression limit, SHA-pin actions, runner OOM, workerIdleMemoryLimit thrash, pull_request vs pull_request_target), hooks (lifecycle: SessionStart / PreToolUse / PostToolUse / PreCompact / Stop / SessionEnd). Auto-fires on CI workflow files + hook scripts.
paths:
  - ".github/workflows/**/*.yml"
  - ".github/workflows/**/*.yaml"
  - ".github/actions/**/*.yml"
  - ".github/actions/**/*.yaml"
  - ".gitlab-ci.yml"
  - ".gitlab/**"
  - "azure-pipelines.yml"
  - "azure-pipelines.yaml"
  - "Jenkinsfile"
  - "**/Jenkinsfile"
  - ".circleci/**"
  - "bitbucket-pipelines.yml"
  - ".githooks/**"
  - ".pre-commit-config.yaml"
  - "**/.github/workflows/**"
  - "**/.github/actions/**"
---

# ci-rules

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H
> will delete the source files to close the eager-load loop.

## Standards Cited

- **GitHub Actions Workflow syntax** (docs.github.com/actions/using-workflows) — canonical spec for
  `on:` triggers, job graph, expressions
- **OWASP Top 10 CI/CD Security Risks** (owasp.org/www-project-top-10-ci-cd-security-risks) —
  CICD-SEC-01 through CICD-SEC-10
- **SLSA v1.0** (slsa.dev/spec/v1.0) — supply-chain levels; SHA-pinned actions satisfy Build L3
- **CWE-829** Inclusion of Functionality from Untrusted Control Sphere (action-by-tag = vulnerable)
- **CWE-1357** Reliance on Insufficiently Trustworthy Component (unpinned third-party action)
- **NIST SP 800-204D** Strategies for the Integration of Software Supply Chain Security in DevSecOps
- **OWASP Top 10 A05:2021** Security Misconfiguration — `pull_request_target` + checkout-of-PR-code
  is the canonical misconfiguration shape
- **Conventional Commits 1.0** (conventionalcommits.org) — commit-message contract for downstream
  changelog / semver automation
- **Semantic Versioning 2.0** (semver.org) — version-bump rules the CI release pipeline encodes

## Source files migrated

- `rules-library/common/ci-test-memory-tuning.md`
- `rules-library/common/github-actions-gotchas.md`
- `rules-library/common/hooks.md`

## Purpose

Routing table for the CI + hooks discipline. This file is
`paths:`-gated, so it is added to the always-on context Floor in full
whenever a CI workflow or hook file is touched — the detail therefore
lives in `references/`, loaded only when the topic is actually in play.
Read the row you need; each reference file carries the complete,
unchanged guidance for its topic.

## Topic map

| Topic | Read |
| --- | --- |
| **CI test memory tuning** — OOM-preempt vs worker-thrash failure modes, runner RAM reference table, Jest / Vitest / pytest / Go tuning, diagnostic recipe, verification block | [`references/ci-test-memory-tuning.md`](references/ci-test-memory-tuning.md) |
| **GitHub Actions gotchas** — the 13 named pitfalls: `bash -e` + pipefail, 21K expression limit, required-workflow file access, `set -u` + empty array, `echo \| jq` newline mangling, Node 20→24 deprecation, YAML 1.1 `on:`, `cancel-in-progress`, the three timeouts, runner OOM, `workerIdleMemoryLimit` thrash, SHA-pinning, `pull_request` vs `pull_request_target` | [`references/github-actions-gotchas.md`](references/github-actions-gotchas.md) |
| **Hook lifecycle, mandatory hooks, permissions, TodoWrite** — SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / PreCompact / Stop / SessionEnd, the mandatory global hooks, auto-accept policy, TodoWrite practices | [`references/hooks-lifecycle.md`](references/hooks-lifecycle.md) |
| **Per-language PostToolUse gates** — Go, TS/JS, Python, Java/Kotlin, Ruby, Rust, C/C++, Swift, Dart, C#, Markdown, Infrastructure, SQL, Bash | [`references/hooks-per-language-gates.md`](references/hooks-per-language-gates.md) |

## Cross-references

- [ci-test-memory-tuning](references/ci-test-memory-tuning.md) — sister to
  gotchas 10 + 11
- [github-actions-gotchas](references/github-actions-gotchas.md) — sister to
  `deploy-failures-become-checks.md`, `security-controls-org-wide.md`
- [hooks-lifecycle](references/hooks-lifecycle.md) — sister to
  `auto-skills.md`, `no-discards.md`
- [hooks-per-language-gates](references/hooks-per-language-gates.md) — sister
  to `done-criteria.md`, `extreme-lint-policy.md`
