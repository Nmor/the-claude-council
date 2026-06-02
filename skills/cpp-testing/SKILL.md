---
name: cpp-testing
description: Use only when writing/updating/fixing C++ tests, configuring GoogleTest/CTest, diagnosing failing or flaky tests, or adding coverage/sanitizers.
---

# C++ Testing (Agent Skill)

Agent-focused testing workflow for modern C++ (C++17/20) using GoogleTest/GoogleMock with CMake/CTest.

## When to Use

- Writing new C++ tests or fixing existing tests
- Designing unit/integration test coverage for C++ components
- Adding test coverage, CI gating, or regression protection
- Configuring CMake/CTest workflows for consistent execution
- Investigating test failures or flaky behavior
- Enabling sanitizers for memory/race diagnostics

### When NOT to Use

- Implementing new product features without test changes
- Large-scale refactors unrelated to test coverage or failures
- Performance tuning without test regressions to validate
- Non-C++ projects or non-test tasks

## Core Concepts

- **TDD loop**: red → green → refactor (tests first, minimal fix, then cleanups).
- **Isolation**: prefer dependency injection and fakes over global state.
- **Test layout**: `tests/unit`, `tests/integration`, `tests/testdata`.
- **Mocks vs fakes**: mock for interactions, fake for stateful behavior.
- **CTest discovery**: use `gtest_discover_tests()` for stable test discovery.
- **CI signal**: run subset first, then full suite with `--output-on-failure`.

## TDD Workflow

Follow the RED → GREEN → REFACTOR loop:

1. **RED**: write a failing test that captures the new behavior
2. **GREEN**: implement the smallest change to pass
3. **REFACTOR**: clean up while tests stay green

```cpp
// tests/add_test.cpp
#include <gtest/gtest.h>

int Add(int a, int b); // Provided by production code.

TEST(AddTest, AddsTwoNumbers) { // RED
  EXPECT_EQ(Add(2, 3), 5);
}

// src/add.cpp
int Add(int a, int b) { // GREEN
  return a + b;
}

// REFACTOR: simplify/rename once tests pass
```

## Code Examples

### Basic Unit Test (gtest)

```cpp
// tests/calculator_test.cpp
#include <gtest/gtest.h>

int Add(int a, int b); // Provided by production code.

TEST(CalculatorTest, AddsTwoNumbers) {
    EXPECT_EQ(Add(2, 3), 5);
}
```

### Fixture (gtest)

```cpp
// tests/user_store_test.cpp
// Pseudocode stub: replace UserStore/User with project types.
#include <gtest/gtest.h>
#include <memory>
#include <optional>
#include <string>

struct User { std::string name; };
class UserStore {
public:
    explicit UserStore(std::string /*path*/) {}
    void Seed(std::initializer_list<User> /*users*/) {}
    std::optional<User> Find(const std::string &/*name*/) { return User{"alice"}; }
};

class UserStoreTest : public ::testing::Test {
protected:
    void SetUp() override {
        store = std::make_unique<UserStore>(":memory:");
        store->Seed({{"alice"}, {"bob"}});
    }

    std::unique_ptr<UserStore> store;
};

TEST_F(UserStoreTest, FindsExistingUser) {
    auto user = store->Find("alice");
    ASSERT_TRUE(user.has_value());
    EXPECT_EQ(user->name, "alice");
}
```

### Mock (gmock)

```cpp
// tests/notifier_test.cpp
#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <string>

class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void Send(const std::string &message) = 0;
};

class MockNotifier : public Notifier {
public:
    MOCK_METHOD(void, Send, (const std::string &message), (override));
};

class Service {
public:
    explicit Service(Notifier &notifier) : notifier_(notifier) {}
    void Publish(const std::string &message) { notifier_.Send(message); }

private:
    Notifier &notifier_;
};

TEST(ServiceTest, SendsNotifications) {
    MockNotifier notifier;
    Service service(notifier);

    EXPECT_CALL(notifier, Send("hello")).Times(1);
    service.Publish("hello");
}
```

### CMake/CTest Quickstart

```cmake
# CMakeLists.txt (excerpt)
cmake_minimum_required(VERSION 3.20)
project(example LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
# Prefer project-locked versions. If using a tag, use a pinned version per project policy.
set(GTEST_VERSION v1.17.0) # Adjust to project policy.
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/${GTEST_VERSION}.zip
)
FetchContent_MakeAvailable(googletest)

add_executable(example_tests
  tests/calculator_test.cpp
  src/calculator.cpp
)
target_link_libraries(example_tests GTest::gtest GTest::gmock GTest::gtest_main)

enable_testing()
include(GoogleTest)
gtest_discover_tests(example_tests)
```

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build -j
ctest --test-dir build --output-on-failure
```

## Running Tests

```bash
ctest --test-dir build --output-on-failure
ctest --test-dir build -R ClampTest
ctest --test-dir build -R "UserStoreTest.*" --output-on-failure
```

```bash
./build/example_tests --gtest_filter=ClampTest.*
./build/example_tests --gtest_filter=UserStoreTest.FindsExistingUser
```

## Debugging Failures

1. Re-run the single failing test with gtest filter.
2. Add scoped logging around the failing assertion.
3. Re-run with sanitizers enabled.
4. Expand to full suite once the root cause is fixed.

## Coverage

Prefer target-level settings instead of global flags.

```cmake
option(ENABLE_COVERAGE "Enable coverage flags" OFF)

if(ENABLE_COVERAGE)
  if(CMAKE_CXX_COMPILER_ID MATCHES "GNU")
    target_compile_options(example_tests PRIVATE --coverage)
    target_link_options(example_tests PRIVATE --coverage)
  elseif(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    target_compile_options(example_tests PRIVATE -fprofile-instr-generate -fcoverage-mapping)
    target_link_options(example_tests PRIVATE -fprofile-instr-generate)
  endif()
endif()
```

GCC + gcov + lcov:

```bash
cmake -S . -B build-cov -DENABLE_COVERAGE=ON
cmake --build build-cov -j
ctest --test-dir build-cov
lcov --capture --directory build-cov --output-file coverage.info
lcov --remove coverage.info '/usr/*' --output-file coverage.info
genhtml coverage.info --output-directory coverage
```

Clang + llvm-cov:

```bash
cmake -S . -B build-llvm -DENABLE_COVERAGE=ON -DCMAKE_CXX_COMPILER=clang++
cmake --build build-llvm -j
LLVM_PROFILE_FILE="build-llvm/default.profraw" ctest --test-dir build-llvm
llvm-profdata merge -sparse build-llvm/default.profraw -o build-llvm/default.profdata
llvm-cov report build-llvm/example_tests -instr-profile=build-llvm/default.profdata
```

## Sanitizers

```cmake
option(ENABLE_ASAN "Enable AddressSanitizer" OFF)
option(ENABLE_UBSAN "Enable UndefinedBehaviorSanitizer" OFF)
option(ENABLE_TSAN "Enable ThreadSanitizer" OFF)

if(ENABLE_ASAN)
  add_compile_options(-fsanitize=address -fno-omit-frame-pointer)
  add_link_options(-fsanitize=address)
endif()
if(ENABLE_UBSAN)
  add_compile_options(-fsanitize=undefined -fno-omit-frame-pointer)
  add_link_options(-fsanitize=undefined)
endif()
if(ENABLE_TSAN)
  add_compile_options(-fsanitize=thread)
  add_link_options(-fsanitize=thread)
endif()
```

## Flaky Tests Guardrails

- Never use `sleep` for synchronization; use condition variables or latches.
- Make temp directories unique per test and always clean them.
- Avoid real time, network, or filesystem dependencies in unit tests.
- Use deterministic seeds for randomized inputs.

## Best Practices

### DO

- Keep tests deterministic and isolated
- Prefer dependency injection over globals
- Use `ASSERT_*` for preconditions, `EXPECT_*` for multiple checks
- Separate unit vs integration tests in CTest labels or directories
- Run sanitizers in CI for memory and race detection

### DON'T

- Don't depend on real time or network in unit tests
- Don't use sleeps as synchronization when a condition variable can be used
- Don't over-mock simple value objects
- Don't use brittle string matching for non-critical logs

### Common Pitfalls

- **Using fixed temp paths** → Generate unique temp directories per test and clean them.
- **Relying on wall clock time** → Inject a clock or use fake time sources.
- **Flaky concurrency tests** → Use condition variables/latches and bounded waits.
- **Hidden global state** → Reset global state in fixtures or remove globals.
- **Over-mocking** → Prefer fakes for stateful behavior and only mock interactions.
- **Missing sanitizer runs** → Add ASan/UBSan/TSan builds in CI.
- **Coverage on debug-only builds** → Ensure coverage targets use consistent flags.

## Optional Appendix: Fuzzing / Property Testing

Only use if the project already supports LLVM/libFuzzer or a property-testing library.

- **libFuzzer**: best for pure functions with minimal I/O.
- **RapidCheck**: property-based tests to validate invariants.

Minimal libFuzzer harness (pseudocode: replace ParseConfig):

```cpp
#include <cstddef>
#include <cstdint>
#include <string>

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    std::string input(reinterpret_cast<const char *>(data), size);
    // ParseConfig(input); // project function
    return 0;
}
```

## Alternatives to GoogleTest

- **Catch2**: header-only, expressive matchers
- **doctest**: lightweight, minimal compile overhead

## Purpose

Principal-level C++ test methodology: GoogleTest fixtures + parameterised tests, CTest integration, sanitiser-instrumented runs in CI, fuzz testing for parser/serializer paths, benchmark harness (Google Benchmark), code coverage via gcov / llvm-cov.

**Negative scope** (NOT what this skill covers):

- C++ language idioms — see `cpp-coding-standards`
- Build configuration — see `deployment-patterns`
- Cross-language testing concepts — see `tdd-workflow`
- Performance profiling (perf, vtune) — defer to project-specific

## When NOT to use

- C-only test suites (use Unity / CMock)
- Embedded / no-libstdc++ targets (use bare-metal test harnesses)
- Property-based testing as primary mode (use RapidCheck integration directly)

## Standards Cited

- **GoogleTest 1.15 User Manual** (`google.github.io/googletest/`) — fixture, parameterised, typed, death tests
- **Google Benchmark 1.9+** (`github.com/google/benchmark`) — microbenchmark harness
- **CTest 3.30+ Documentation** (`cmake.org/cmake/help/latest/manual/ctest.1.html`) — test orchestration
- **AddressSanitizer / UBSan / TSan / MSan documentation** (`clang.llvm.org/docs/AddressSanitizer.html`) — runtime instrumentation
- **libFuzzer / AFL++** — fuzz testing
- **OpenSSF Scorecard** — supply-chain checks
- **CWE-787 / CWE-416 / CWE-119** — memory-safety bug classes sanitisers detect

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Running tests without sanitisers | UB / UAF / leaks invisible | CI matrix: `Debug+ASan+UBSan`, `Debug+TSan`, `Release` |
| `EXPECT_EQ(ptr, nullptr)` instead of `ASSERT_EQ` | Subsequent dereference is UB | `ASSERT_EQ` halts on failure; `EXPECT_*` continues |
| Test fixtures sharing static state | Order-dependent failures | Per-fixture `SetUp` / `TearDown`; no statics |
| Mocking via macros without `MOCK_METHOD` | No verification of call shape | GoogleMock `MOCK_METHOD` + `EXPECT_CALL` |
| `EXPECT_TRUE(complicated_expression)` | Failure message says "false" — useless | Break into named bool + `EXPECT_TRUE(named)` OR use richer matcher |
| Death tests without `EXPECT_DEATH` regex | Matches ANY death | `EXPECT_DEATH(stmt, "expected error message regex")` |
| Sleeping `std::this_thread::sleep_for(...)` for race conditions | Flaky | `std::promise/future` synchronisation OR atomics with condition |
| Test depending on system locale / timezone | CI flake | Fix locale + tz via env vars in test setup |

## Verification Checklist

- [ ] AddressSanitizer + UBSan enabled in Debug build (CMake `-fsanitize=address,undefined`)
- [ ] ThreadSanitizer separately enabled for concurrency tests
- [ ] CTest runs via `ctest --output-on-failure --parallel N`
- [ ] Coverage via `llvm-cov gcov`; ≥ 90% on touched files
- [ ] Fuzz targets for parsers / deserializers (libFuzzer corpus committed)
- [ ] Benchmarks pinned via Google Benchmark with `--benchmark_min_time=1.0s`
- [ ] Death tests use specific regex match
- [ ] Tests deterministic (no `sleep_for`, locale-fixed, tz-fixed)
- [ ] CI matrix covers GCC + Clang + MSVC where applicable
- [ ] No static state between tests; `SetUp` / `TearDown` enforced

## Cross-References

- `~/.claude/skills/cpp-coding-standards/SKILL.md` — code idioms under test
- `~/.claude/skills/security-review/SKILL.md` — memory-safety review
- `~/.claude/skills/tdd-workflow/SKILL.md` — RED-GREEN-REFACTOR
- `~/.claude/rules-library/common/testing.md` — coverage thresholds
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI for testability
- `~/.claude/rules-library/cpp/testing.md` — C++-specific
- `~/.claude/agents/code-reviewer.md`
- `~/.claude/agents/security-reviewer.md`

## Why this skill exists

C++ tests that don't run with AddressSanitizer + UBSan are passing tests with hidden landmines — use-after-free + buffer overflow happen silently in production and present as crashes weeks later. CI-instrumented runs catch these at PR time. Add fuzz testing for parsers + GoogleBenchmark for perf-critical paths, and the suite serves both correctness AND regression detection. The cost is one CMake flag per build mode; the benefit is C++ code that doesn't ship the next memory-safety CVE.

## Compliance & Standards Mapping

- **ISO/IEC 25010:2011 §6** — Product quality model (Functional
  Suitability, Reliability, Performance Efficiency, Usability,
  Security, Maintainability, Portability, Compatibility)
- **ISO/IEC/IEEE 12207:2017 §6.4** — Software construction +
  verification + validation processes
- **NIST SP 800-218 SSDF §PW** — Produce Well-Secured Software
  (applies to every code-authoring skill)
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing +
  evaluation
- **OWASP ASVS 4.0.3 §V1.1** — Secure SDLC requirements
- **OWASP ASVS 4.0.3 §V14.2** — Dependency lifecycle
- **CWE Top 25 (2026)** — Weakness classes the patterns in this
  skill prevent
- **SLSA Framework v1.0 Build L2+** — Provenance + integrity

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- AddressSanitizer disabled in CI (use-after-free / heap-overflow caught at runtime)
- UndefinedBehaviorSanitizer disabled in CI (signed-overflow / null-deref escapes)
- ThreadSanitizer skipped on concurrent code (data race undetected)
- Test linking against production binary instead of test target (link-cycle issue)
- Mock framework abuse (over-mocking — testing the mock, not the code)
- Flaky test attributed to "timing" instead of root-cause fix (per `~/.claude/rules-library/common/proper-fixes-first.md`)
- Coverage gate not enforcing per-module minimum
- Death-test absent on assert-fail / abort-able paths
- `ASSERT_EQ` used where `EXPECT_EQ` would let later assertions run (test-stop weakening)
- Test using `sleep(N)` instead of synchronization primitive (flaky)

**Refinement candidates**:

- New sanitizer row when a new compiler sanitizer ships (e.g., MemorySanitizer on Clang)
- New cross-reference when a sister skill (cpp-coding-standards, tdd-workflow, security-review) adds a C++ test gate
- New mocking template when a recurring shape emerges (e.g., GMock for callback interfaces)
- Tightening of the test-runtime budget when slow tests recur
