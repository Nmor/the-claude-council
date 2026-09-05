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

Comprehensive coding standards for modern C++ (C++17/20/23) derived from the [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines). Enforces type safety, resource safety, immutability, and clarity.

## When to Use

- Writing new C++ code (classes, functions, templates)
- Reviewing or refactoring existing C++ code
- Making architectural decisions in C++ projects
- Enforcing consistent style across a C++ codebase
- Choosing between language features (e.g., `enum` vs `enum class`, raw pointer vs smart pointer)

### When NOT to Use

- Non-C++ projects
- Legacy C codebases that cannot adopt modern C++ features
- Embedded/bare-metal contexts where specific guidelines conflict with hardware constraints (adapt selectively)

## Cross-Cutting Principles

These themes recur across the entire guidelines and form the foundation:

1. **RAII everywhere** (P.8, R.1, E.6, CP.20): Bind resource lifetime to object lifetime
2. **Immutability by default** (P.10, Con.1-5, ES.25): Start with `const`/`constexpr`; mutability is the exception
3. **Type safety** (P.4, I.4, ES.46-49, Enum.3): Use the type system to prevent errors at compile time
4. **Express intent** (P.3, F.1, NL.1-2, T.10): Names, types, and concepts should communicate purpose
5. **Minimize complexity** (F.2-3, ES.5, Per.4-5): Simple code is correct code
6. **Value semantics over pointer semantics** (C.10, R.3-5, F.20, CP.31): Prefer returning by value and scoped objects

## Philosophy & Interfaces (P.*, I.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **P.1** | Express ideas directly in code |
| **P.3** | Express intent |
| **P.4** | Ideally, a program should be statically type safe |
| **P.5** | Prefer compile-time checking to run-time checking |
| **P.8** | Don't leak any resources |
| **P.10** | Prefer immutable data to mutable data |
| **I.1** | Make interfaces explicit |
| **I.2** | Avoid non-const global variables |
| **I.4** | Make interfaces precisely and strongly typed |
| **I.11** | Never transfer ownership by a raw pointer or reference |
| **I.23** | Keep the number of function arguments low |

### DO

```cpp
// P.10 + I.4: Immutable, strongly typed interface
struct Temperature {
    double kelvin;
};

Temperature boil(const Temperature& water);
```

### DON'T

```cpp
// Weak interface: unclear ownership, unclear units
double boil(double* temp);

// Non-const global variable
int g_counter = 0;  // I.2 violation
```

## Functions (F.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **F.1** | Package meaningful operations as carefully named functions |
| **F.2** | A function should perform a single logical operation |
| **F.3** | Keep functions short and simple |
| **F.4** | If a function might be evaluated at compile time, declare it `constexpr` |
| **F.6** | If your function must not throw, declare it `noexcept` |
| **F.8** | Prefer pure functions |
| **F.16** | For "in" parameters, pass cheaply-copied types by value and others by `const&` |
| **F.20** | For "out" values, prefer return values to output parameters |
| **F.21** | To return multiple "out" values, prefer returning a struct |
| **F.43** | Never return a pointer or reference to a local object |

### Parameter Passing

```cpp
// F.16: Cheap types by value, others by const&
void print(int x);                           // cheap: by value
void analyze(const std::string& data);       // expensive: by const&
void transform(std::string s);               // sink: by value (will move)

// F.20 + F.21: Return values, not output parameters
struct ParseResult {
    std::string token;
    int position;
};

ParseResult parse(std::string_view input);   // GOOD: return struct

// BAD: output parameters
void parse(std::string_view input,
           std::string& token, int& pos);    // avoid this
```

### Pure Functions and constexpr

```cpp
// F.4 + F.8: Pure, constexpr where possible
constexpr int factorial(int n) noexcept {
    return (n <= 1) ? 1 : n * factorial(n - 1);
}

static_assert(factorial(5) == 120);
```

### Anti-Patterns

- Returning `T&&` from functions (F.45)
- Using `va_arg` / C-style variadics (F.55)
- Capturing by reference in lambdas passed to other threads (F.53)
- Returning `const T` which inhibits move semantics (F.49)

## Classes & Class Hierarchies (C.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **C.2** | Use `class` if invariant exists; `struct` if data members vary independently |
| **C.9** | Minimize exposure of members |
| **C.20** | If you can avoid defining default operations, do (Rule of Zero) |
| **C.21** | If you define or `=delete` any copy/move/destructor, handle them all (Rule of Five) |
| **C.35** | Base class destructor: public virtual or protected non-virtual |
| **C.41** | A constructor should create a fully initialized object |
| **C.46** | Declare single-argument constructors `explicit` |
| **C.67** | A polymorphic class should suppress public copy/move |
| **C.128** | Virtual functions: specify exactly one of `virtual`, `override`, or `final` |

### Rule of Zero

```cpp
// C.20: Let the compiler generate special members
struct Employee {
    std::string name;
    std::string department;
    int id;
    // No destructor, copy/move constructors, or assignment operators needed
};
```

### Rule of Five

```cpp
// C.21: If you must manage a resource, define all five
class Buffer {
public:
    explicit Buffer(std::size_t size)
        : data_(std::make_unique<char[]>(size)), size_(size) {}

    ~Buffer() = default;

    Buffer(const Buffer& other)
        : data_(std::make_unique<char[]>(other.size_)), size_(other.size_) {
        std::copy_n(other.data_.get(), size_, data_.get());
    }

    Buffer& operator=(const Buffer& other) {
        if (this != &other) {
            auto new_data = std::make_unique<char[]>(other.size_);
            std::copy_n(other.data_.get(), other.size_, new_data.get());
            data_ = std::move(new_data);
            size_ = other.size_;
        }
        return *this;
    }

    Buffer(Buffer&&) noexcept = default;
    Buffer& operator=(Buffer&&) noexcept = default;

private:
    std::unique_ptr<char[]> data_;
    std::size_t size_;
};
```

### Class Hierarchy

```cpp
// C.35 + C.128: Virtual destructor, use override
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;  // C.121: pure interface
};

class Circle : public Shape {
public:
    explicit Circle(double r) : radius_(r) {}
    double area() const override { return 3.14159 * radius_ * radius_; }

private:
    double radius_;
};
```

### Anti-Patterns

- Calling virtual functions in constructors/destructors (C.82)
- Using `memset`/`memcpy` on non-trivial types (C.90)
- Providing different default arguments for virtual function and overrider (C.140)
- Making data members `const` or references, which suppresses move/copy (C.12)

## Resource Management (R.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **R.1** | Manage resources automatically using RAII |
| **R.3** | A raw pointer (`T*`) is non-owning |
| **R.5** | Prefer scoped objects; don't heap-allocate unnecessarily |
| **R.10** | Avoid `malloc()`/`free()` |
| **R.11** | Avoid calling `new` and `delete` explicitly |
| **R.20** | Use `unique_ptr` or `shared_ptr` to represent ownership |
| **R.21** | Prefer `unique_ptr` over `shared_ptr` unless sharing ownership |
| **R.22** | Use `make_shared()` to make `shared_ptr`s |

### Smart Pointer Usage

```cpp
// R.11 + R.20 + R.21: RAII with smart pointers
auto widget = std::make_unique<Widget>("config");  // unique ownership
auto cache  = std::make_shared<Cache>(1024);        // shared ownership

// R.3: Raw pointer = non-owning observer
void render(const Widget* w) {  // does NOT own w
    if (w) w->draw();
}

render(widget.get());
```

### RAII Pattern

```cpp
// R.1: Resource acquisition is initialization
class FileHandle {
public:
    explicit FileHandle(const std::string& path)
        : handle_(std::fopen(path.c_str(), "r")) {
        if (!handle_) throw std::runtime_error("Failed to open: " + path);
    }

    ~FileHandle() {
        if (handle_) std::fclose(handle_);
    }

    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
    FileHandle(FileHandle&& other) noexcept
        : handle_(std::exchange(other.handle_, nullptr)) {}
    FileHandle& operator=(FileHandle&& other) noexcept {
        if (this != &other) {
            if (handle_) std::fclose(handle_);
            handle_ = std::exchange(other.handle_, nullptr);
        }
        return *this;
    }

private:
    std::FILE* handle_;
};
```

### Anti-Patterns

- Naked `new`/`delete` (R.11)
- `malloc()`/`free()` in C++ code (R.10)
- Multiple resource allocations in a single expression (R.13 -- exception safety hazard)
- `shared_ptr` where `unique_ptr` suffices (R.21)

## Expressions & Statements (ES.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **ES.5** | Keep scopes small |
| **ES.20** | Always initialize an object |
| **ES.23** | Prefer `{}` initializer syntax |
| **ES.25** | Declare objects `const` or `constexpr` unless modification is intended |
| **ES.28** | Use lambdas for complex initialization of `const` variables |
| **ES.45** | Avoid magic constants; use symbolic constants |
| **ES.46** | Avoid narrowing/lossy arithmetic conversions |
| **ES.47** | Use `nullptr` rather than `0` or `NULL` |
| **ES.48** | Avoid casts |
| **ES.50** | Don't cast away `const` |

### Initialization

```cpp
// ES.20 + ES.23 + ES.25: Always initialize, prefer {}, default to const
const int max_retries{3};
const std::string name{"widget"};
const std::vector<int> primes{2, 3, 5, 7, 11};

// ES.28: Lambda for complex const initialization
const auto config = [&] {
    Config c;
    c.timeout = std::chrono::seconds{30};
    c.retries = max_retries;
    c.verbose = debug_mode;
    return c;
}();
```

### Anti-Patterns

- Uninitialized variables (ES.20)
- Using `0` or `NULL` as pointer (ES.47 -- use `nullptr`)
- C-style casts (ES.48 -- use `static_cast`, `const_cast`, etc.)
- Casting away `const` (ES.50)
- Magic numbers without named constants (ES.45)
- Mixing signed and unsigned arithmetic (ES.100)
- Reusing names in nested scopes (ES.12)

## Error Handling (E.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **E.1** | Develop an error-handling strategy early in a design |
| **E.2** | Throw an exception to signal that a function can't perform its assigned task |
| **E.6** | Use RAII to prevent leaks |
| **E.12** | Use `noexcept` when throwing is impossible or unacceptable |
| **E.14** | Use purpose-designed user-defined types as exceptions |
| **E.15** | Throw by value, catch by reference |
| **E.16** | Destructors, deallocation, and swap must never fail |
| **E.17** | Don't try to catch every exception in every function |

### Exception Hierarchy

```cpp
// E.14 + E.15: Custom exception types, throw by value, catch by reference
class AppError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

class NetworkError : public AppError {
public:
    NetworkError(const std::string& msg, int code)
        : AppError(msg), status_code(code) {}
    int status_code;
};

void fetch_data(const std::string& url) {
    // E.2: Throw to signal failure
    throw NetworkError("connection refused", 503);
}

void run() {
    try {
        fetch_data("https://api.example.com");
    } catch (const NetworkError& e) {
        log_error(e.what(), e.status_code);
    } catch (const AppError& e) {
        log_error(e.what());
    }
    // E.17: Don't catch everything here -- let unexpected errors propagate
}
```

### Anti-Patterns

- Throwing built-in types like `int` or string literals (E.14)
- Catching by value (slicing risk) (E.15)
- Empty catch blocks that silently swallow errors
- Using exceptions for flow control (E.3)
- Error handling based on global state like `errno` (E.28)

## Constants & Immutability (Con.*)

### All Rules

| Rule | Summary |
|------|---------|
| **Con.1** | By default, make objects immutable |
| **Con.2** | By default, make member functions `const` |
| **Con.3** | By default, pass pointers and references to `const` |
| **Con.4** | Use `const` for values that don't change after construction |
| **Con.5** | Use `constexpr` for values computable at compile time |

```cpp
// Con.1 through Con.5: Immutability by default
class Sensor {
public:
    explicit Sensor(std::string id) : id_(std::move(id)) {}

    // Con.2: const member functions by default
    const std::string& id() const { return id_; }
    double last_reading() const { return reading_; }

    // Only non-const when mutation is required
    void record(double value) { reading_ = value; }

private:
    const std::string id_;  // Con.4: never changes after construction
    double reading_{0.0};
};

// Con.3: Pass by const reference
void display(const Sensor& s) {
    std::cout << s.id() << ": " << s.last_reading() << '\n';
}

// Con.5: Compile-time constants
constexpr double PI = 3.14159265358979;
constexpr int MAX_SENSORS = 256;
```

## Concurrency & Parallelism (CP.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **CP.2** | Avoid data races |
| **CP.3** | Minimize explicit sharing of writable data |
| **CP.4** | Think in terms of tasks, rather than threads |
| **CP.8** | Don't use `volatile` for synchronization |
| **CP.20** | Use RAII, never plain `lock()`/`unlock()` |
| **CP.21** | Use `std::scoped_lock` to acquire multiple mutexes |
| **CP.22** | Never call unknown code while holding a lock |
| **CP.42** | Don't wait without a condition |
| **CP.44** | Remember to name your `lock_guard`s and `unique_lock`s |
| **CP.100** | Don't use lock-free programming unless you absolutely have to |

### Safe Locking

```cpp
// CP.20 + CP.44: RAII locks, always named
class ThreadSafeQueue {
public:
    void push(int value) {
        std::lock_guard<std::mutex> lock(mutex_);  // CP.44: named!
        queue_.push(value);
        cv_.notify_one();
    }

    int pop() {
        std::unique_lock<std::mutex> lock(mutex_);
        // CP.42: Always wait with a condition
        cv_.wait(lock, [this] { return !queue_.empty(); });
        const int value = queue_.front();
        queue_.pop();
        return value;
    }

private:
    std::mutex mutex_;             // CP.50: mutex with its data
    std::condition_variable cv_;
    std::queue<int> queue_;
};
```

### Multiple Mutexes

```cpp
// CP.21: std::scoped_lock for multiple mutexes (deadlock-free)
void transfer(Account& from, Account& to, double amount) {
    std::scoped_lock lock(from.mutex_, to.mutex_);
    from.balance_ -= amount;
    to.balance_ += amount;
}
```

### Anti-Patterns

- `volatile` for synchronization (CP.8 -- it's for hardware I/O only)
- Detaching threads (CP.26 -- lifetime management becomes nearly impossible)
- Unnamed lock guards: `std::lock_guard<std::mutex>(m);` destroys immediately (CP.44)
- Holding locks while calling callbacks (CP.22 -- deadlock risk)
- Lock-free programming without deep expertise (CP.100)

## Templates & Generic Programming (T.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **T.1** | Use templates to raise the level of abstraction |
| **T.2** | Use templates to express algorithms for many argument types |
| **T.10** | Specify concepts for all template arguments |
| **T.11** | Use standard concepts whenever possible |
| **T.13** | Prefer shorthand notation for simple concepts |
| **T.43** | Prefer `using` over `typedef` |
| **T.120** | Use template metaprogramming only when you really need to |
| **T.144** | Don't specialize function templates (overload instead) |

### Concepts (C++20)

```cpp
#include <concepts>

// T.10 + T.11: Constrain templates with standard concepts
template<std::integral T>
T gcd(T a, T b) {
    while (b != 0) {
        a = std::exchange(b, a % b);
    }
    return a;
}

// T.13: Shorthand concept syntax
void sort(std::ranges::random_access_range auto& range) {
    std::ranges::sort(range);
}

// Custom concept for domain-specific constraints
template<typename T>
concept Serializable = requires(const T& t) {
    { t.serialize() } -> std::convertible_to<std::string>;
};

template<Serializable T>
void save(const T& obj, const std::string& path);
```

### Anti-Patterns

- Unconstrained templates in visible namespaces (T.47)
- Specializing function templates instead of overloading (T.144)
- Template metaprogramming where `constexpr` suffices (T.120)
- `typedef` instead of `using` (T.43)

## Standard Library (SL.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **SL.1** | Use libraries wherever possible |
| **SL.2** | Prefer the standard library to other libraries |
| **SL.con.1** | Prefer `std::array` or `std::vector` over C arrays |
| **SL.con.2** | Prefer `std::vector` by default |
| **SL.str.1** | Use `std::string` to own character sequences |
| **SL.str.2** | Use `std::string_view` to refer to character sequences |
| **SL.io.50** | Avoid `endl` (use `'\n'` -- `endl` forces a flush) |

```cpp
// SL.con.1 + SL.con.2: Prefer vector/array over C arrays
const std::array<int, 4> fixed_data{1, 2, 3, 4};
std::vector<std::string> dynamic_data;

// SL.str.1 + SL.str.2: string owns, string_view observes
std::string build_greeting(std::string_view name) {
    return "Hello, " + std::string(name) + "!";
}

// SL.io.50: Use '\n' not endl
std::cout << "result: " << value << '\n';
```

## Enumerations (Enum.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **Enum.1** | Prefer enumerations over macros |
| **Enum.3** | Prefer `enum class` over plain `enum` |
| **Enum.5** | Don't use ALL_CAPS for enumerators |
| **Enum.6** | Avoid unnamed enumerations |

```cpp
// Enum.3 + Enum.5: Scoped enum, no ALL_CAPS
enum class Color { red, green, blue };
enum class LogLevel { debug, info, warning, error };

// BAD: plain enum leaks names, ALL_CAPS clashes with macros
enum { RED, GREEN, BLUE };           // Enum.3 + Enum.5 + Enum.6 violation
#define MAX_SIZE 100                  // Enum.1 violation -- use constexpr
```

## Source Files & Naming (SF.*, NL.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **SF.1** | Use `.cpp` for code files and `.h` for interface files |
| **SF.7** | Don't write `using namespace` at global scope in a header |
| **SF.8** | Use `#include` guards for all `.h` files |
| **SF.11** | Header files should be self-contained |
| **NL.5** | Avoid encoding type information in names (no Hungarian notation) |
| **NL.8** | Use a consistent naming style |
| **NL.9** | Use ALL_CAPS for macro names only |
| **NL.10** | Prefer `underscore_style` names |

### Header Guard

```cpp
// SF.8: Include guard (or #pragma once)
#ifndef PROJECT_MODULE_WIDGET_H
#define PROJECT_MODULE_WIDGET_H

// SF.11: Self-contained -- include everything this header needs
#include <string>
#include <vector>

namespace project::module {

class Widget {
public:
    explicit Widget(std::string name);
    const std::string& name() const;

private:
    std::string name_;
};

}  // namespace project::module

#endif  // PROJECT_MODULE_WIDGET_H
```

### Naming Conventions

```cpp
// NL.8 + NL.10: Consistent underscore_style
namespace my_project {

constexpr int max_buffer_size = 4096;  // NL.9: not ALL_CAPS (it's not a macro)

class tcp_connection {                 // underscore_style class
public:
    void send_message(std::string_view msg);
    bool is_connected() const;

private:
    std::string host_;                 // trailing underscore for members
    int port_;
};

}  // namespace my_project
```

### Anti-Patterns

- `using namespace std;` in a header at global scope (SF.7)
- Headers that depend on inclusion order (SF.10, SF.11)
- Hungarian notation like `strName`, `iCount` (NL.5)
- ALL_CAPS for anything other than macros (NL.9)

## Performance (Per.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **Per.1** | Don't optimize without reason |
| **Per.2** | Don't optimize prematurely |
| **Per.6** | Don't make claims about performance without measurements |
| **Per.7** | Design to enable optimization |
| **Per.10** | Rely on the static type system |
| **Per.11** | Move computation from run time to compile time |
| **Per.19** | Access memory predictably |

### Guidelines

```cpp
// Per.11: Compile-time computation where possible
constexpr auto lookup_table = [] {
    std::array<int, 256> table{};
    for (int i = 0; i < 256; ++i) {
        table[i] = i * i;
    }
    return table;
}();

// Per.19: Prefer contiguous data for cache-friendliness
std::vector<Point> points;           // GOOD: contiguous
std::vector<std::unique_ptr<Point>> indirect_points; // BAD: pointer chasing
```

### Anti-Patterns

- Optimizing without profiling data (Per.1, Per.6)
- Choosing "clever" low-level code over clear abstractions (Per.4, Per.5)
- Ignoring data layout and cache behavior (Per.19)

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

Principal-level C++ coding standards (C++20 / C++23): RAII for every resource, smart pointers over raw new/delete, concepts-constrained templates, deterministic destruction, value semantics over pointer semantics, modern alternatives to legacy idioms, undefined-behaviour avoidance.

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
- **C++ Core Guidelines** (`isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines`) — Stroustrup + Sutter; the canonical reference
- **MISRA C++ 2023** — safety-critical subset (ISO 26262 / IEC 61508)
- **CERT C++ Coding Standard** — security-focused subset
- **Effective Modern C++ (Scott Meyers, 2014)** + **Effective C++ 3e (Meyers, 2005)** — pre-C++20 reference
- **The C++ Programming Language 4e (Stroustrup, 2013)** — language reference
- **CWE Top 25 (2026)** — CWE-787 (out-of-bounds write), CWE-416 (use-after-free), CWE-119 (buffer overflow)
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

C++ rewards discipline and punishes its absence — use-after-free, buffer overflows, and data races are silent in development and catastrophic in production. The C++ Core Guidelines (Stroustrup + Sutter) codify a modern, safe subset; this skill applies the principal-level subset to every C++ file Claude touches, with sanitisers + clang-tidy + concepts enforced. The cost is using `unique_ptr` instead of `new`; the benefit is C++ code that doesn't appear in the next CVE.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Raw `new` / `delete` in code (RAII / smart-pointer weakening)
- Pointer where reference would suffice (Core Guidelines F.7)
- C-style cast `(T)x` instead of `static_cast<T>(x)` / `dynamic_cast<T>(x)` / `reinterpret_cast<T>(x)`
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

Phase H will delete the source files at `rules-library/cpp/`. Content below preserves the original rule bodies for lazy-load via the `paths:` glob above.

---

<!-- ============================================================
     Section: cpp/coding-style.md
     ============================================================ -->

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

# C++ Coding Standards

> Auto-activates for C/C++ source files and CMake build files. Chains with `cpp-coding-standards` skill for C++ Core Guidelines.

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

---

<!-- ============================================================
     Section: cpp/hooks.md
     ============================================================ -->

# C / C++ Hooks

> Auto-fires on every `*.c`, `*.cpp`, `*.h`, `*.hpp`, `CMakeLists.txt`,
> `*.cmake`, `Makefile` file. Sister to `~/.claude/rules-library/common/hooks.md`.

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

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/cpp/no-discards.md`
- `~/.claude/rules-library/cpp/security.md`
- `~/.claude/rules-library/cpp/testing.md`
- clang-tidy docs (clang.llvm.org/extra/clang-tidy/)
- cppcheck manual (cppcheck.sourceforge.io)

---

<!-- ============================================================
     Section: cpp/no-discards.md
     ============================================================ -->

# C / C++ — No-Discards Extension

> Auto-fires on every `*.c`, `*.cpp`, `*.cc`, `*.cxx`, `*.h`,
> `*.hpp`, `*.hxx`, `*.inl` file. Extends
> `~/.claude/rules-library/common/no-discards.md`. Sister to
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

```text
C++ build (this turn):
  - cmake --build build/ -- -Werror: 0 errors / 0 warnings
  - clang-tidy: 0 issues
  - cppcheck --enable=all: 0 issues
  - ASan: clean
  - UBSan: clean
  - ctest --verbose: PASS (coverage 88%)
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- `~/.claude/rules-library/common/error-handling-with-context.md`
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

---

<!-- ============================================================
     Section: cpp/patterns.md
     ============================================================ -->

# C / C++ Patterns

> Auto-fires on every `*.c`, `*.cpp`, `*.h`, `*.hpp` file.
> Standards: **C++ Core Guidelines (Stroustrup + Sutter)**,
> **Effective C++ / Effective Modern C++ (Meyers)**, **C++
> Concurrency in Action (Williams)**, **Modern C++ Design
> (Alexandrescu)**.

## Core Principle

**RAII for every resource (memory, file, lock, socket, GPU
context); smart pointers over raw `new`/`delete`; value
semantics over pointer semantics where possible; concepts (C++20)
for generic constraints; templates for compile-time polymorphism,
virtual functions for runtime polymorphism; PIMPL for ABI
stability.**

## RAII (the foundational pattern)

```cpp
// File
{
    std::ifstream file(path);  // open
    process(file);
    // close automatic on scope exit, even on exception
}

// Lock
{
    std::lock_guard<std::mutex> lock(mu);
    shared_data++;
    // unlock on scope exit
}

// Custom — every resource needs a wrapper
class DatabaseHandle {
    DB* db;
public:
    explicit DatabaseHandle(const std::string& conn)
        : db(db_open(conn.c_str())) {
        if (!db) throw std::runtime_error("db_open failed");
    }
    ~DatabaseHandle() { db_close(db); }
    // Rule of 5: delete copy, define move
    DatabaseHandle(const DatabaseHandle&) = delete;
    DatabaseHandle& operator=(const DatabaseHandle&) = delete;
    DatabaseHandle(DatabaseHandle&& o) noexcept : db(o.db) { o.db = nullptr; }
    DatabaseHandle& operator=(DatabaseHandle&& o) noexcept {
        if (this != &o) { db_close(db); db = o.db; o.db = nullptr; }
        return *this;
    }
    DB* get() const { return db; }
};
```

## Smart pointers

| Pointer | Use when |
| --- | --- |
| `std::unique_ptr<T>` | Single owner; transfer via move; default choice |
| `std::shared_ptr<T>` | Shared ownership; ref-counted; thread-safe ref-count |
| `std::weak_ptr<T>` | Break cycles with shared_ptr; lock to access |
| Raw `T*` (non-owning) | Function parameter when ownership stays with caller; never owns |
| `gsl::owner<T*>` | Annotate raw pointer that owns (when C-API requires) |

```cpp
// Factory returning unique ownership
std::unique_ptr<Foo> make_foo(int x) {
    return std::make_unique<Foo>(x);
}

// Non-owning argument
void process(const Foo& foo) { ... }
void process(const Foo* foo) {
    if (!foo) return;
    ...
}
```

## Value types

```cpp
// CORRECT — pass by value for small + cheap-to-copy
void process(int x);
void process(std::string_view s);   // never owns
void process(std::span<const int> data);

// CORRECT — pass by const-ref for non-trivial
void process(const Order& order);

// CORRECT — pass by rvalue-ref to consume
void consume(Order&& order);

// Avoid passing by mutable-ref unless out-param
void update(Order& order, const UpdateRequest& req);
```

## Builder pattern

```cpp
class HttpRequestBuilder {
    std::string method_;
    std::string url_;
    std::vector<std::pair<std::string, std::string>> headers_;
    std::string body_;

public:
    HttpRequestBuilder& method(std::string m) { method_ = std::move(m); return *this; }
    HttpRequestBuilder& url(std::string u) { url_ = std::move(u); return *this; }
    HttpRequestBuilder& header(std::string k, std::string v) {
        headers_.emplace_back(std::move(k), std::move(v));
        return *this;
    }
    HttpRequestBuilder& body(std::string b) { body_ = std::move(b); return *this; }
    HttpRequest build() && {
        return HttpRequest{std::move(method_), std::move(url_),
                           std::move(headers_), std::move(body_)};
    }
};

auto req = HttpRequestBuilder()
    .method("POST")
    .url("https://api.example.com/orders")
    .header("authorization", token)
    .body(payload)
    .build();
```

## PIMPL (compilation firewall + ABI stability)

```cpp
// foo.h — public header
class Foo {
public:
    Foo();
    ~Foo();
    void bar();
private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

// foo.cpp — implementation
struct Foo::Impl {
    int state;
    std::vector<std::string> data;
};

Foo::Foo() : impl_(std::make_unique<Impl>()) {}
Foo::~Foo() = default;          // out-of-line; needs Impl complete
void Foo::bar() { impl_->state++; }
```

Changes to `Impl` don't trigger downstream recompilation; ABI
stays stable as long as `Foo`'s public surface doesn't change.

## Type erasure

```cpp
// Without type erasure: storing different shapes needs inheritance
class Shape { virtual void draw() = 0; };

// With type erasure: any callable with right signature
class Drawable {
    struct Concept {
        virtual ~Concept() = default;
        virtual void draw() const = 0;
        virtual std::unique_ptr<Concept> clone() const = 0;
    };
    template<typename T>
    struct Model : Concept {
        T obj;
        explicit Model(T x) : obj(std::move(x)) {}
        void draw() const override { obj.draw(); }
        std::unique_ptr<Concept> clone() const override {
            return std::make_unique<Model>(obj);
        }
    };
    std::unique_ptr<Concept> impl_;
public:
    template<typename T>
    Drawable(T x) : impl_(std::make_unique<Model<T>>(std::move(x))) {}
    void draw() const { impl_->draw(); }
};
```

## Concurrency

```cpp
// std::async (low-effort; less control)
auto fut = std::async(std::launch::async, do_work);
auto result = fut.get();

// std::thread + join
std::thread t(do_work);
t.join();

// std::jthread (C++20) — auto-joins + stop_token
std::jthread t([](std::stop_token st) {
    while (!st.stop_requested()) {
        do_work_chunk();
    }
});
// t goes out of scope; requests stop + joins

// std::atomic for lock-free counters
std::atomic<int64_t> counter{0};
counter.fetch_add(1, std::memory_order_relaxed);
```

## Reuse-first

| Use case | Library |
| --- | --- |
| Strings + algorithms | `std::` + Abseil if needed |
| JSON | nlohmann/json, simdjson |
| HTTP server | Drogon, Boost.Beast, cpp-httplib |
| HTTP client | libcurl, cpr |
| Async I/O | Boost.Asio, libuv |
| Logging | spdlog |
| Testing | GoogleTest, Catch2, doctest |
| CLI args | CLI11, argparse |
| YAML / TOML | yaml-cpp, toml++ |
| Date / time | std::chrono + date.h (Howard Hinnant) |

Per `~/.claude/rules-library/common/reuse-first.md`.

## Modern C++ over C-isms

| C-ism | Modern C++ |
| --- | --- |
| `char buf[64]; strcpy(...)` | `std::string` / `std::string_view` |
| `int arr[10]` + manual length | `std::array<int, 10>` / `std::span` |
| `new T()` / `delete` | `std::make_unique<T>()` |
| `malloc` / `free` | `std::vector<char>` / smart pointers |
| `printf` | `std::format` (C++20) / `std::print` (C++23) |
| `qsort` | `std::sort` with lambda |
| pointer iteration | range-for |
| NULL macro | `nullptr` |
| typedef | `using` |
| `enum E { ... }` | `enum class E { ... }` |

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/common/reuse-first.md`
- `~/.claude/rules-library/cpp/coding-style.md`
- `~/.claude/rules-library/cpp/no-discards.md`
- C++ Core Guidelines
- Effective Modern C++ (Meyers)
- C++ Concurrency in Action (Williams)

---

<!-- ============================================================
     Section: cpp/security.md
     ============================================================ -->

# C / C++ Security

> Auto-fires on every `*.c`, `*.cpp`, `*.cc`, `*.cxx`, `*.h`,
> `*.hpp`, `*.hxx` file. Sister to `~/.claude/rules-library/common/security.md`.
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
- Per `~/.claude/rules-library/common/secrets-management.md`

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

- `~/.claude/rules-library/common/security.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/cpp/no-discards.md`
- `~/.claude/rules-library/cpp/coding-style.md`
- CERT C / C++ Coding Standard (wiki.sei.cmu.edu/confluence/display/c/)
- MISRA C 2023 / MISRA C++ 2023
- OWASP C / C++ Top 10
- C++ Core Guidelines — GSL (Stroustrup + Sutter)
- CWE Top 25

---

<!-- ============================================================
     Section: cpp/testing.md
     ============================================================ -->

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

---
