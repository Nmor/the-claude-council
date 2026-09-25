# cpp-coding-standards: Classes & Class Hierarchies (C.)

> Covers the Core Guidelines rule tables, examples and anti-patterns for Classes & Class Hierarchies
> (C.*) and Resource Management (R.*) — Rule of Zero, Rule of Five, RAII, smart pointers. The
> "Classes, hierarchies, resource management" row in ../SKILL.md points here.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
