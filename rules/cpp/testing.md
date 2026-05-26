---
paths:
  - "**/*test*.cpp"
  - "**/*test*.hpp"
  - "**/*Test*.cpp"
  - "**/tests/**/*.cpp"
  - "**/test/**/*.cpp"
---

# C++ Testing Standards

> Auto-activates for C++ test files. Chains with `cpp-testing` skill for GoogleTest patterns and coverage.

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
