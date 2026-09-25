---
paths:

- "**/*.cpp"
- "**/*.hpp"
- "**/*.cc"
- "**/*.hh"
- "**/*.c"
- "**/*.h"
- "**/CMakeLists.txt"
- "**/*.cmake"

---

<!-- ============================================================
     Section: cpp/coding-style.md
     ============================================================ -->

# C++ Coding Standards

> Covers the migrated `rules-library/cpp/coding-style.md` rule — the C/C++ source + CMake checklist
> and the skill chain. The "Migrated: coding-style checklist" row in ../SKILL.md points here.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.
---

> Auto-activates for C/C++ source files and CMake build files. Chains with `cpp-coding-standards`
> skill for C++ Core Guidelines.

## Checklist

- [ ] C++17 standard or later
- [ ] RAII for resource management (smart pointers over raw)
- [ ] No manual memory management (no raw `new`/`delete` in application code)
- [ ] `const` correctness enforced
- [ ] No undefined behavior (bounds checking, null checks)
- [ ] CMake targets properly defined
- [ ] Warnings treated as errors (`-Wall -Wextra -Werror`)

## Skill Chain

1. **cpp-coding-standards** - C++ Core Guidelines, modern idioms, safety
2. **cpp-testing** - GoogleTest, CTest, sanitizers, coverage
3. **security-review** - Buffer overflows, injection, memory safety
