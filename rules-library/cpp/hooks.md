# C / C++ Hooks

> Auto-fires on every `*.c`, `*.cpp`, `*.h`, `*.hpp`, `CMakeLists.txt`,
> `*.cmake`, `Makefile` file. Sister to `~/.claude/rules/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_cpp=$(git diff --cached --name-only --diff-filter=ACMR \
    | grep -E '\.(c|cpp|cc|cxx|h|hpp|hxx)$' || true)
[ -z "$staged_cpp" ] && exit 0

# Format
echo "$staged_cpp" | xargs clang-format --dry-run --Werror

# Lint (per-file; faster than full project)
for f in $staged_cpp; do
    clang-tidy "$f" --warnings-as-errors='*' -- -std=c++20
done
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Build + test + sanitizers
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug -DSANITIZERS=ON
cmake --build build/ --parallel
ctest --test-dir build/ --output-on-failure
```

## CMake hardening

`CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.27)
project(myapp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Strict warnings — treat as errors
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(
        -Wall -Wextra -Wpedantic -Wconversion
        -Wshadow -Wnon-virtual-dtor -Wold-style-cast
        -Wcast-align -Wsign-conversion -Wnull-dereference
        -Wdouble-promotion -Wformat=2 -Wformat-security
        -Wimplicit-fallthrough
        -Werror
    )
endif()

# Position-independent code + ASLR
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Sanitizers (toggle via -DSANITIZERS=ON)
option(SANITIZERS "Build with ASan + UBSan" OFF)
if(SANITIZERS)
    add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer)
    add_link_options(-fsanitize=address,undefined)
endif()

# LTO in Release
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    include(CheckIPOSupported)
    check_ipo_supported(RESULT lto_ok)
    if(lto_ok)
        set(CMAKE_INTERPROCEDURAL_OPTIMIZATION ON)
    endif()
endif()

# clang-tidy integration
set(CMAKE_CXX_CLANG_TIDY clang-tidy --warnings-as-errors='*')

# Testing
enable_testing()
add_subdirectory(tests)
```

## CI workflow

```yaml
name: C++ CI

on: [push, pull_request]

jobs:
  build:
    strategy:
      matrix:
        compiler: [gcc-14, clang-18]
        build_type: [Debug, Release]
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha>

      - name: Install
        run: |
          sudo apt-get update
          sudo apt-get install -y ${{ matrix.compiler }} cmake clang-tidy clang-format cppcheck

      - name: Configure
        run: |
          cmake -S . -B build \
            -DCMAKE_BUILD_TYPE=${{ matrix.build_type }} \
            -DSANITIZERS=ON

      - name: Build
        run: cmake --build build/ --parallel

      - name: Test
        run: ctest --test-dir build/ --output-on-failure

  static-analysis:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha>
      - run: |
          sudo apt-get install -y clang-tidy cppcheck
          clang-tidy --warnings-as-errors='*' src/*.cpp -- -std=c++20
          cppcheck --enable=all --inconclusive --error-exitcode=1 src/

  format:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha>
      - run: |
          find . -name '*.cpp' -o -name '*.h' | xargs clang-format --dry-run --Werror

  coverage:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha>
      - run: |
          cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug -DCOVERAGE=ON
          cmake --build build/
          ctest --test-dir build/
          lcov --capture --directory build/ --output-file coverage.info
          lcov --remove coverage.info '/usr/*' '*/tests/*' --output-file coverage.info
          genhtml coverage.info --output-directory coverage_html
      - uses: codecov/codecov-action@<sha>
        with: { files: coverage.info }
```

## `.clang-format`

```yaml
BasedOnStyle: Google
ColumnLimit: 100
IndentWidth: 4
AccessModifierOffset: -4
AllowShortFunctionsOnASingleLine: Empty
BinPackArguments: false
BinPackParameters: false
SortIncludes: CaseSensitive
SpaceBeforeParens: ControlStatements
```

## `.clang-tidy`

```yaml
Checks: >
  *,
  -fuchsia-*,
  -llvmlibc-*,
  -altera-*,
  -modernize-use-trailing-return-type,
  -cppcoreguidelines-pro-bounds-array-to-pointer-decay,
  -hicpp-*

WarningsAsErrors: '*'

HeaderFilterRegex: '.*'

CheckOptions:
  - { key: readability-identifier-naming.ClassCase,     value: CamelCase }
  - { key: readability-identifier-naming.FunctionCase,  value: camelBack }
  - { key: readability-identifier-naming.VariableCase,  value: camelBack }
  - { key: readability-identifier-naming.ConstantCase,  value: UPPER_CASE }
```

## Cross-references

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/cpp/no-discards.md`
- `~/.claude/rules/cpp/security.md`
- `~/.claude/rules/cpp/testing.md`
- clang-tidy docs (clang.llvm.org/extra/clang-tidy/)
- cppcheck manual (cppcheck.sourceforge.io)
