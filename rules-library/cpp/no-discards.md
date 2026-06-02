# C / C++ — No-Discards Extension

> Auto-fires on every `*.c`, `*.cpp`, `*.cc`, `*.cxx`, `*.h`,
> `*.hpp`, `*.hxx`, `*.inl` file. Extends
> `~/.claude/rules/common/no-discards.md`. Sister to
> `extreme-lint-policy.md`. Tooling: `clang-tidy`, `clang-format`,
> `cppcheck`, AddressSanitizer / UndefinedBehaviorSanitizer /
> ThreadSanitizer.

## Core Principle (C/C++-specific restatement)

**Every return value of every function that's marked `[[nodiscard]]`
MUST be used; every allocation has a matching deallocation (or
better: RAII); every pointer is checked for nullness before
dereference; every error code is propagated, never ignored.
Modern C++ (C++20+) features (smart pointers, `std::expected`,
RAII, references over pointers) are mandatory.**

C/C++ silent failures are uniquely dangerous because they
compile fine + run fine until they CORRUPT MEMORY or LEAK.

## Banned patterns

### 1. Ignoring `[[nodiscard]]` returns

```cpp
// FORBIDDEN — compiler warns; we treat as error
file.open(path);  // returns [[nodiscard]] bool

// CORRECT
if (!file.open(path)) {
    spdlog::error("open failed: {}", path);
    return ErrorCode::OpenFailed;
}
```

`-Werror=unused-result` makes this a build failure.

### 2. Raw `new` / `delete`

```cpp
// FORBIDDEN — leak risk; manual management
Foo* p = new Foo();
use(p);
delete p;  // may not run on exception

// CORRECT — RAII via smart pointer
auto p = std::make_unique<Foo>();
use(*p);
// Destruction is automatic + exception-safe
```

### 3. Raw `malloc` / `free` in C++

```cpp
// FORBIDDEN in C++ (raw memory ops without RAII)
char* buf = (char*)malloc(1024);
// ... possibly leak on early return
free(buf);

// CORRECT
std::vector<char> buf(1024);
// destructor frees automatically
```

In pure C: use `goto cleanup` patterns + paired malloc/free.

### 4. Out-pointer / out-reference unused

```cpp
// FORBIDDEN — caller dropped the value
size_t bytes_written;
write_to_buffer(data, &bytes_written);
// `bytes_written` never read

// CORRECT
size_t bytes_written = 0;
if (!write_to_buffer(data, &bytes_written) || bytes_written < expected) {
    return std::unexpected{ErrorCode::WriteShort};
}
```

### 5. Casting away `const` / signedness

```cpp
// FORBIDDEN
const int* read_only = get_const_data();
int* mutable_ptr = const_cast<int*>(read_only);
*mutable_ptr = 42;  // UB if underlying is genuinely const

// CORRECT — don't fight the type system; pass non-const if you need mutation
```

### 6. C-style casts

```cpp
// FORBIDDEN
int x = (int)y;
Foo* p = (Foo*)ptr;

// CORRECT — explicit cast kind
int x = static_cast<int>(y);
auto* p = static_cast<Foo*>(ptr);  // when safe
auto* d = dynamic_cast<Derived*>(base);
if (d == nullptr) { /* handle */ }
```

### 7. Uninitialised variables

```cpp
// FORBIDDEN — undefined behavior if read
int count;
if (some_branch) count = 1;
return count;  // UB if some_branch false

// CORRECT — always initialise
int count = 0;
if (some_branch) count = 1;
return count;

// CORRECT (C++17+)
auto count = some_branch ? 1 : 0;
```

### 8. Pointer arithmetic on raw pointers in C++

```cpp
// FORBIDDEN — bounds errors
int arr[10];
int* p = arr + 20;  // UB

// CORRECT — use containers + iterators / std::span
std::array<int, 10> arr;
auto it = arr.begin() + 5;  // bounded by container semantics
```

### 9. `printf` family with user input

```cpp
// FORBIDDEN — format string injection
printf(user_input);

// CORRECT
printf("%s", user_input);
// or modern C++:
fmt::print("{}", user_input);
```

### 10. Magic strings / numbers + raw concatenation

```cpp
// FORBIDDEN — buffer overflow risk
char buf[64];
strcpy(buf, name);
strcat(buf, "@example.com");

// CORRECT
std::string buf = fmt::format("{}@example.com", name);
```

## Required compiler flags

```bash
g++ -std=c++20 \
    -Wall -Wextra -Wpedantic -Wconversion -Wshadow \
    -Wnon-virtual-dtor -Wold-style-cast -Woverloaded-virtual \
    -Wcast-align -Wsign-conversion -Wnull-dereference \
    -Wdouble-promotion -Wformat=2 -Wimplicit-fallthrough \
    -Werror -O2 -g
```

With sanitizers in debug:

```bash
g++ -std=c++20 -fsanitize=address,undefined -g -O1
```

## Required static analysis

```bash
clang-tidy --checks='*,-fuchsia-*,-llvmlibc-*,-modernize-use-trailing-return-type' \
  --warnings-as-errors='*' \
  --header-filter='.*' \
  *.cpp

cppcheck --enable=all --inconclusive --error-exitcode=1 .
```

## Verification block

```
C++ build (this turn):
  - cmake --build build/ -- -Werror: 0 errors / 0 warnings
  - clang-tidy: 0 issues
  - cppcheck --enable=all: 0 issues
  - ASan: clean
  - UBSan: clean
  - ctest --verbose: PASS (coverage 88%)
```

## Cross-references

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- `~/.claude/rules/common/error-handling-with-context.md`
- C++ Core Guidelines (Stroustrup + Sutter)
- MISRA C++ (safety-critical)

## Why this rule exists

C++ silent failures cause memory corruption + UB:
- Ignored `[[nodiscard]]` from `open()` → write to closed fd
- Forgotten `delete` → leak; with `new[]` without `delete[]` →
  heap corruption
- Pointer arithmetic past end → UB; sometimes crashes, sometimes
  silently corrupts neighbouring data
- C-style cast hiding sign mismatch → integer overflow → security
  bug

RAII + smart pointers + sanitisers + strict warnings close
nearly all of these.
