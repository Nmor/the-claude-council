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

Per `~/.claude/rules/common/reuse-first.md`.

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

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/common/reuse-first.md`
- `~/.claude/rules/cpp/coding-style.md`
- `~/.claude/rules/cpp/no-discards.md`
- C++ Core Guidelines
- Effective Modern C++ (Meyers)
- C++ Concurrency in Action (Williams)
