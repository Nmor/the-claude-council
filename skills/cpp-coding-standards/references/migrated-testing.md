---
paths:

- "**/*test*.cpp"
- "**/*test*.hpp"
- "**/*Test*.cpp"
- "**/tests/**/*.cpp"
- "**/test/**/*.cpp"

---

<!-- ============================================================
     Section: cpp/testing.md
     ============================================================ -->

# C++ Testing Standards

> Covers the migrated `rules-library/cpp/testing.md` rule — the C++ test-file checklist and its
> skill chain. The "Migrated: testing checklist" row in ../SKILL.md points here.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.
---

> Auto-activates for C++ test files. Chains with `cpp-testing` skill for GoogleTest patterns and
> coverage.

## Checklist

- [ ] GoogleTest framework used
- [ ] Test names are descriptive (`TEST(ClassName, MethodBehaviorExpected)`)
- [ ] Setup/teardown via fixtures, not repeated code
- [ ] Edge cases covered (null, empty, boundary values)
- [ ] Memory sanitizers enabled in test builds (ASan, UBSan)
- [ ] Coverage meets 70% minimum

## Skill Chain

1. **cpp-testing** - GoogleTest, CTest, fixtures, sanitizers, coverage
2. **tdd-workflow** - Red-Green-Refactor methodology

---
