---
name: cpp-coding-standards
description: C++ coding standards based on the C++ Core Guidelines (isocpp.github.io). Use when writing, reviewing, or refactoring C++ code to enforce modern, safe, and idiomatic practices.
paths:
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.cxx"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.hxx"
  - "**/CMakeLists.txt"
  - "**/Makefile"
  - "**/*.cmake"
---

# C++ Coding Standards (C++ Core Guidelines)

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check

Comprehensive coding standards for modern C++ (C++17/20/23) derived from the [C++ Core
Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines). Enforces type safety,
resource safety, immutability, and clarity.

## When to Use

- Writing new C++ code (classes, functions, templates)
- Reviewing or refactoring existing C++ code
- Making architectural decisions in C++ projects
- Enforcing consistent style across a C++ codebase
- Choosing between language features (e.g., `enum` vs `enum class`, raw pointer vs smart pointer)

### When NOT to Use

- Non-C++ projects
- Legacy C codebases that cannot adopt modern C++ features
- Embedded/bare-metal contexts where specific guidelines conflict with hardware constraints (adapt
  selectively)

## Cross-Cutting Principles

These themes recur across the entire guidelines and form the foundation:

1. **RAII everywhere** (P.8, R.1, E.6, CP.20): Bind resource lifetime to object lifetime
2. **Immutability by default** (P.10, Con.1-5, ES.25): Start with `const`/`constexpr`; mutability is
   the exception
3. **Type safety** (P.4, I.4, ES.46-49, Enum.3): Use the type system to prevent errors at compile
   time
4. **Express intent** (P.3, F.1, NL.1-2, T.10): Names, types, and concepts should communicate
   purpose
5. **Minimize complexity** (F.2-3, ES.5, Per.4-5): Simple code is correct code
6. **Value semantics over pointer semantics** (C.10, R.3-5, F.20, CP.31): Prefer returning by value
   and scoped objects

## Reference Map

This file is the routing table. Each topic's full rule tables, code examples and
anti-patterns live in the reference file named below — read the row you need.

| Topic | Reference |
| --- | --- |
| Philosophy, interfaces, functions — P.\*, I.\*, F.\* | `references/philosophy-and-functions.md` |
| Classes, hierarchies, resource management — C.\*, R.\* (Rule of Zero / Five, RAII, smart pointers) | `references/classes-and-resources.md` |
| Expressions, error handling, immutability — ES.\*, E.\*, Con.\* | `references/expressions-errors-constants.md` |
| Concurrency & parallelism — CP.\* (safe locking, multiple mutexes) | `references/concurrency.md` |
| Templates, standard library, enums — T.\*, SL.\*, Enum.\* (C++20 concepts) | `references/templates-stdlib-enums.md` |
| Source files, naming, performance — SF.\*, NL.\*, Per.\* | `references/source-naming-performance.md` |
| Migrated: coding-style checklist | `references/migrated-coding-style.md` |
| Migrated: hooks, CMake hardening, CI | `references/migrated-hooks-and-ci.md` |
| Migrated: no-discards (banned patterns) | `references/migrated-no-discards.md` |
| Migrated: C/C++ patterns | `references/migrated-patterns.md` |
| Migrated: C/C++ security — CWE Top 25, hardening flags, sanitizers; CERT C/C++, MISRA C++ 2023, OWASP C/C++ Top 10 | `references/migrated-security.md` |
| Migrated: testing checklist | `references/migrated-testing.md` |

## Quick Reference Checklist

Before marking C++ work complete:

- [ ] No raw `new`/`delete` -- use smart pointers or RAII (R.11)
- [ ] Objects initialized at declaration (ES.20)
- [ ] Variables are `const`/`constexpr` by default (Con.1, ES.25)
- [ ] Member functions are `const` where possible (Con.2)
- [ ] `enum class` instead of plain `enum` (Enum.3)
- [ ] `nullptr` instead of `0`/`NULL` (ES.47)
- [ ] No narrowing conversions (ES.46)
- [ ] No C-style casts (ES.48)
- [ ] Single-argument constructors are `explicit` (C.46)
- [ ] Rule of Zero or Rule of Five applied (C.20, C.21)
- [ ] Base class destructors are public virtual or protected non-virtual (C.35)
- [ ] Templates are constrained with concepts (T.10)
- [ ] No `using namespace` in headers at global scope (SF.7)
- [ ] Headers have include guards and are self-contained (SF.8, SF.11)
- [ ] Locks use RAII (`scoped_lock`/`lock_guard`) (CP.20)
- [ ] Exceptions are custom types, thrown by value, caught by reference (E.14, E.15)
- [ ] `'\n'` instead of `std::endl` (SL.io.50)
- [ ] No magic numbers (ES.45)

## Purpose

Principal-level C++ coding standards (C++20 / C++23): RAII for every resource, smart pointers over
raw new/delete, concepts-constrained templates, deterministic destruction, value semantics over
pointer semantics, modern alternatives to legacy idioms, undefined-behaviour avoidance.

**Negative scope** (NOT what this skill covers):

- C++ test methodology — see `cpp-testing`
- CMake build configuration — see `deployment-patterns`
- Generic code-quality + naming — see `coding-quality-rules`
- C-only codebases (use MISRA C / CERT C rules instead — different idioms)
- Embedded systems with no-RTTI / no-exceptions constraints — defer to project-specific

## When NOT to use

- Game engine ECS code (data-oriented design overrides OO patterns)
- Realtime audio / DSP (allocator constraints; no exceptions in audio thread)
- Kernel-level / driver code (no STL; different rules)

## Standards Cited

- **ISO/IEC 14882:2023** — C++ Language Specification (C++23)
- **C++ Core Guidelines** (`isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines`) — Stroustrup +
  Sutter; the canonical reference
- **MISRA C++ 2023** — safety-critical subset (ISO 26262 / IEC 61508)
- **CERT C++ Coding Standard** — security-focused subset
- **Effective Modern C++ (Scott Meyers, 2014)** + **Effective C++ 3e (Meyers, 2005)** — pre-C++20
  reference
- **The C++ Programming Language 4e (Stroustrup, 2013)** — language reference
- **CWE Top 25 (2026)** — CWE-787 (out-of-bounds write), CWE-416 (use-after-free), CWE-119 (buffer
  overflow)
- **OWASP C/C++ Top 10**

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Raw `new` / `delete` | Manual lifetime → use-after-free, double-free, leaks | `std::unique_ptr<T>` / `std::make_unique<T>()` |
| Owning raw pointer in field | Ownership unclear; RAII broken | `unique_ptr` (sole owner) / `shared_ptr` (shared) |
| `delete` on derived through base pointer without virtual destructor | UB; partial destruction | Mark base destructor `virtual` OR design hierarchy `protected` non-virtual |
| `using namespace std;` in header | Pollutes every translation unit | Fully-qualify in headers; `using` only in `.cpp` |
| C-style cast `(T)x` | Silent narrowing / reinterpret | `static_cast<T>(x)` / `dynamic_cast` / `const_cast` / `reinterpret_cast` — explicit |
| `std::endl` in loops | Flushes stream every call → IO syscall | `'\n'` (no flush) |
| C-array as function parameter (decays to pointer) | Loses size information; OOB writes | `std::span<T>` (C++20) / `std::array<T, N>&` |
| `strcpy` / `sprintf` | Buffer overflow if dest too small | `std::string` / `std::format` (C++20) / `snprintf` |
| Catching `(...)` and ignoring | Silent failure; UB on rethrow | Catch specific types; rethrow with context |
| Multiple threads sharing `int counter` without atomic | Data race → UB | `std::atomic<int>` OR `std::mutex` + `scoped_lock` |
| Magic numbers / strings inline | Brittle, untestable, undocumented | `constexpr` constants at scope |
| `auto* p = ...` then dereference without null check | UB if function can return nullptr | `if (auto* p = ...; p != nullptr)` OR throw |

## Verification Checklist

- [ ] Every owned resource via RAII (smart pointer / lock_guard / scoped_lock)
- [ ] No raw `new` / `delete` (use `make_unique` / `make_shared`)
- [ ] Base classes have virtual destructor OR protected non-virtual
- [ ] No C-style casts; explicit cast kind chosen
- [ ] Templates constrained with `concept` (C++20)
- [ ] Headers self-contained with `#pragma once` or include guards
- [ ] No `using namespace` in headers
- [ ] Sanitisers enabled: AddressSanitizer + UndefinedBehaviorSanitizer + ThreadSanitizer in CI
- [ ] clang-tidy runs with C++ Core Guidelines checks enabled
- [ ] Cyclomatic complexity ≤ 10 per function (per `extreme-lint-policy.md`)

## Cross-References

- `~/.claude/skills/cpp-testing/SKILL.md` — GoogleTest + sanitisers
- `~/.claude/skills/coding-quality-rules/SKILL.md` — cross-language baseline
- `~/.claude/skills/security-review/SKILL.md` — memory-safety review
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict thresholds
- `~/.claude/rules-library/cpp/no-discards.md` — banned C++ patterns
- `~/.claude/rules-library/cpp/security.md` — memory safety
- `~/.claude/agents/security-reviewer.md` — Council Division 4 (memory safety)
- `~/.claude/agents/code-reviewer.md`

## Why this skill exists

C++ rewards discipline and punishes its absence — use-after-free, buffer overflows, and data races
are silent in development and catastrophic in production. The C++ Core Guidelines (Stroustrup +
Sutter) codify a modern, safe subset; this skill applies the principal-level subset to every C++
file Claude touches, with sanitisers + clang-tidy + concepts enforced. The cost is using
`unique_ptr` instead of `new`; the benefit is C++ code that doesn't appear in the next CVE.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Raw `new` / `delete` in code (RAII / smart-pointer weakening)
- Pointer where reference would suffice (Core Guidelines F.7)
- C-style cast `(T)x` instead of `static_cast<T>(x)` / `dynamic_cast<T>(x)` /
  `reinterpret_cast<T>(x)`
- `std::endl` in hot loop (forced flush — perf cost; use `'\n'`)
- Uninitialised member in constructor (use of garbage memory)
- Missing `noexcept` on move ops (perf regression — STL containers fall back to copy)
- Header without include guard / `#pragma once`
- Implicit narrowing (e.g., `int x = some_long;` without `static_cast`)
- Manual lock (mutex.lock / unlock) instead of `std::scoped_lock`
- Exception thrown by pointer (slicing risk)
- `using namespace std;` in a header (namespace pollution)

**Refinement candidates**:

- New rule row when a new C++ standard ships (C++23 `std::expected`, C++26 reflection)
- New cross-reference when a sister skill (cpp-testing, security-review) adds a C++ gate
- Tightening of the magic-number rule when domain-specific constant patterns recur
- New row in concurrency checklist when a new sync primitive becomes idiomatic

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: ~/.claude/rules-library/cpp/
     ============================================================ -->

## Migrated rules (rules-library/cpp/, 2026-06-02)

Phase H will delete the source files at `rules-library/cpp/`. Content below preserves the original
rule bodies for lazy-load via the `paths:` glob above.

Those rule bodies now live under `references/migrated-*.md`; see the Reference Map above.
