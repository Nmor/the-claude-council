# C / C++ Security

> Auto-fires on every `*.c`, `*.cpp`, `*.cc`, `*.cxx`, `*.h`,
> `*.hpp`, `*.hxx` file. Sister to `~/.claude/rules/common/security.md`.
> Standards: **CERT C / C++ Coding Standard**, **MISRA C 2023 /
> MISRA C++ 2023**, **OWASP C / C++ Top 10**, **CWE Top 25 (2026)**,
> **C++ Core Guidelines (Stroustrup + Sutter)**.

## Core Principle

**C/C++ vulnerabilities are CWE Top-25 dominant: buffer
overflows, use-after-free, double-free, integer overflow,
format-string bugs, time-of-check-time-of-use (TOCTOU). The
mitigations: RAII; smart pointers; bounds-checked containers
(`std::array`, `std::vector`, `std::span`); compiler hardening
flags; sanitizers in CI; static analysis at full strictness.**

## OWASP / CWE — C/C++ specifics

### CWE-787 Out-of-bounds Write (#1 in CWE Top 25)

```cpp
// FORBIDDEN — C-style buffer ops
char buf[64];
strcpy(buf, user_input);     // overflow if user_input > 63 bytes
sprintf(buf, "%s", user_input);

// CORRECT (C++) — std::string / std::format
std::string buf = std::format("{}", user_input);

// CORRECT (C, when std::string not available) — bounded
char buf[64];
if (snprintf(buf, sizeof(buf), "%s", user_input) >= (int)sizeof(buf)) {
    fprintf(stderr, "input truncated");
    return -1;
}
```

### CWE-416 Use After Free

```cpp
// FORBIDDEN
Foo* p = new Foo();
delete p;
p->method();          // UAF

// CORRECT — smart pointer
auto p = std::make_unique<Foo>();
p->method();
// Destructed automatically; can't UAF
```

### CWE-415 Double Free

```cpp
// FORBIDDEN
free(p);
free(p);              // double free

// CORRECT — set to nullptr after free; or use smart pointer
std::unique_ptr<Foo> p = std::make_unique<Foo>();
// no manual delete; no double-free possible
```

### CWE-190 Integer Overflow

```cpp
// FORBIDDEN — silent wraparound
size_t total = a + b;     // overflows -> tiny number -> small malloc -> UB

// CORRECT (C++) — std::numeric_limits + check
if (a > std::numeric_limits<size_t>::max() - b) {
    throw std::overflow_error("integer overflow");
}
size_t total = a + b;

// CORRECT — use checked arithmetic (C++26: <stdckdint.h>)
size_t total;
if (ckd_add(&total, a, b)) {
    throw std::overflow_error("integer overflow");
}
```

### CWE-134 Format String

```cpp
// FORBIDDEN — user controls the format string
printf(user_input);

// CORRECT — fixed format
printf("%s", user_input);

// CORRECT (C++20) — std::format
std::cout << std::format("{}", user_input);
```

### CWE-367 TOCTOU (file race)

```cpp
// FORBIDDEN — gap between check + use
if (access(path, W_OK) == 0) {
    fp = fopen(path, "w");
    // attacker can swap file in this window
}

// CORRECT — open then check, or use openat with file descriptor
int fd = open(path, O_WRONLY | O_CREAT | O_NOFOLLOW | O_EXCL, 0600);
if (fd < 0) { /* handle */ }
```

### CWE-78 OS Command Injection

```cpp
// FORBIDDEN
system(std::format("ls {}", user_input).c_str());

// CORRECT — execvp with argv array
const char* argv[] = {"ls", user_input.c_str(), nullptr};
execvp("ls", const_cast<char* const*>(argv));
```

### CWE-22 Path Traversal

```cpp
// FORBIDDEN — `..` escapes base directory
auto path = base_dir / user_input;
std::ifstream f(path);

// CORRECT — canonicalise + prefix-check
auto requested = std::filesystem::weakly_canonical(base_dir / user_input);
auto base = std::filesystem::weakly_canonical(base_dir);
if (requested.string().rfind(base.string(), 0) != 0) {
    throw std::runtime_error("path traversal attempt");
}
std::ifstream f(requested);
```

## Compiler hardening flags

```bash
g++ -std=c++20 \
    -Wall -Wextra -Wpedantic -Wconversion \
    -Wformat=2 -Wformat-security \
    -Wnull-dereference -Wstack-usage=8192 \
    -Wstack-protector -fstack-protector-strong \
    -D_FORTIFY_SOURCE=3 \
    -fstack-clash-protection \
    -fPIE -pie \
    -Wl,-z,relro -Wl,-z,now \
    -fno-strict-aliasing \
    -Werror \
    -O2

# Clang adds:
# -fsanitize=cfi -flto -fvisibility=hidden
```

`_FORTIFY_SOURCE=3` enables compiler-inserted bounds checks for
glibc string/memory functions.

## Sanitizers (mandatory in CI)

```bash
# AddressSanitizer + UndefinedBehaviorSanitizer
g++ -fsanitize=address,undefined,leak -fno-omit-frame-pointer -g -O1 ...
./my_program       # ASan + UBSan + LSan active

# ThreadSanitizer (separate run; doesn't mix with ASan)
g++ -fsanitize=thread -g -O1 ...
./my_program

# MemorySanitizer (Clang only; uses different lib)
clang++ -fsanitize=memory -fno-omit-frame-pointer -g -O1 ...
```

Run unit tests with each sanitizer in CI. Failures block merge.

## Static analysis

```bash
# clang-tidy — full rule set
clang-tidy --checks='*,-fuchsia-*,-llvmlibc-*,-modernize-use-trailing-return-type' \
  --warnings-as-errors='*' \
  *.cpp -- -std=c++20

# cppcheck
cppcheck --enable=all --inconclusive --error-exitcode=1 --suppress=missingIncludeSystem .

# Coverity / Klocwork / PVS-Studio (commercial)
# For OSS: also run scan-build (Clang Static Analyzer)
scan-build --status-bugs make
```

## Memory hardening

| Feature | Compiler flag |
| --- | --- |
| ASLR | `-fPIE -pie` |
| Stack protector | `-fstack-protector-strong` |
| Stack clash | `-fstack-clash-protection` |
| RELRO | `-Wl,-z,relro -Wl,-z,now` |
| NX bit | `-Wl,-z,noexecstack` |
| Control Flow Integrity (Clang) | `-fsanitize=cfi -flto` |
| FORTIFY_SOURCE | `-D_FORTIFY_SOURCE=3` |
| Source fortification | `-Wstack-usage=8192` |

## Secrets

- NEVER hardcode in source
- Use environment variables, or platform key stores (macOS
  Keychain, Windows DPAPI, Linux libsecret)
- For embedded: PKCS#11 / HSM
- Per `~/.claude/rules/common/secrets-management.md`

## Dependencies (supply-chain)

```bash
# Conan dependency audit (when using Conan)
conan inspect <package>/<version>

# CMake dependency scan via OSV-Scanner
osv-scanner --lockfile=conan.lock

# Trivy on Docker image / binary
trivy filesystem .
```

## Required tooling

```bash
clang-format -i src/*.cpp                # format
clang-tidy --checks='*' src/*.cpp        # lint
cppcheck --enable=all src/               # static analysis
cmake -DCMAKE_BUILD_TYPE=Debug -DSANITIZERS=ON .. && make && ctest
osv-scanner --lockfile=conan.lock        # CVE scan
```

## Cross-references

- `~/.claude/rules/common/security.md`
- `~/.claude/rules/common/secrets-management.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/cpp/no-discards.md`
- `~/.claude/rules/cpp/coding-style.md`
- CERT C / C++ Coding Standard (wiki.sei.cmu.edu/confluence/display/c/)
- MISRA C 2023 / MISRA C++ 2023
- OWASP C / C++ Top 10
- C++ Core Guidelines — GSL (Stroustrup + Sutter)
- CWE Top 25
