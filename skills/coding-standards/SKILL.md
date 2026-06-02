---
name: coding-standards
description: Redirect stub — superseded by `coding-quality-rules`. Universal coding-style + patterns + reuse-first + proper-fixes-first + no-silent-drops + no-silent-failures + no-discards + no-ambient-globals + no-local-fs + error-codes + error-handling-with-context + log-levels + semver + extreme-lint-policy + updated-frameworks + performance + testing + local-testability + local-dev-setup. Auto-fires on any code file across all supported languages.
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.mjs"
  - "**/*.cjs"
  - "**/*.mts"
  - "**/*.cts"
  - "**/*.py"
  - "**/*.pyi"
  - "**/*.go"
  - "**/*.rb"
  - "**/*.rake"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.kts"
  - "**/*.swift"
  - "**/*.dart"
  - "**/*.cs"
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.cxx"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.lua"
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.sql"
  - "**/*.vue"
  - "**/*.svelte"
---

# coding-standards — REDIRECT (consolidated 2026-06-02)

This skill has been consolidated into [`coding-quality-rules`](../coding-quality-rules/SKILL.md).

Both skills covered the same surface (universal code-quality discipline across every supported language). The merged body lives in `coding-quality-rules/SKILL.md` (≈ 226 KB) — it carries the full canonical content for:

- coding-style (naming, comments, file organisation, immutability, error handling)
- patterns (architectural patterns; repository / response envelope)
- reuse-first (sweep before write; rule of three)
- proper-fixes-first (root cause, never symptom)
- no-silent-drops, no-silent-failures, no-discards
- no-ambient-globals, no-local-fs
- error-codes, error-handling-with-context, log-levels
- semver (Conventional Commits + Keep a Changelog)
- extreme-lint-policy (cognitive complexity ≤ 10, lines ≤ 80, params ≤ 5)
- updated-frameworks, performance, testing, local-testability, local-dev-setup

## Why this stub still exists

External skills + docs reference `coding-standards` by name. The `paths:` frontmatter is preserved so the skill activates on code-file touches; the body is just this redirect so cold-load is minimal (~1.5 KB instead of 19 KB) and there is one source of truth for the discipline.

When `coding-standards` is invoked, **also load `coding-quality-rules`** — they're paired.

## Migration trail

| Date | Action |
| --- | --- |
| 2026-06-02 | Body content removed; redirected to coding-quality-rules per audit finding D1 (`lazy-rules-loading.md` Phase J) |

Cross-reference path target: [`coding-quality-rules`](../coding-quality-rules/SKILL.md).
