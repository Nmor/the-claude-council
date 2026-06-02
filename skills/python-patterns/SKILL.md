---
name: python-patterns
description: Pythonic idioms, PEP 8 standards, type hints, and best practices for building robust, efficient, and maintainable Python applications.
paths:
  - "**/*.py"
  - "**/*.pyi"
  - "pyproject.toml"
  - "**/pyproject.toml"
  - "requirements*.txt"
  - "**/requirements*.txt"
  - "Pipfile"
  - "**/Pipfile"
---

# Python Development Patterns

> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> Before creating a new class, function, or module, sweep
> `<pkg>/lib/`, `<pkg>/utils/`, `<pkg>/services/`, `<pkg>/dto/`.
> One source of truth per primitive (one HTTP client, one logger
> config, one Pydantic base model, one validator, one
> serializer). Extend via subclass / Protocol / dependency
> injection — never fork the module into a parallel variant.

Idiomatic Python patterns and best practices for building robust, efficient, and maintainable applications.

## When to Activate

- Writing new Python code
- Reviewing Python code
- Refactoring existing Python code
- Designing Python packages/modules

## Core Principles

### 1. Readability Counts

Python prioritizes readability. Code should be obvious and easy to understand.

```python
# Good: Clear and readable
def get_active_users(users: list[User]) -> list[User]:
    """Return only active users from the provided list."""
    return [user for user in users if user.is_active]


# Bad: Clever but confusing
def get_active_users(u):
    return [x for x in u if x.a]
```

### 2. Explicit is Better Than Implicit

Avoid magic; be clear about what your code does.

```python
# Good: Explicit configuration
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Bad: Hidden side effects
import some_module
some_module.setup()  # What does this do?
```

### 3. EAFP - Easier to Ask Forgiveness Than Permission

Python prefers exception handling over checking conditions.

```python
# Good: EAFP style
def get_value(dictionary: dict, key: str) -> Any:
    try:
        return dictionary[key]
    except KeyError:
        return default_value

# Bad: LBYL (Look Before You Leap) style
def get_value(dictionary: dict, key: str) -> Any:
    if key in dictionary:
        return dictionary[key]
    else:
        return default_value
```

## Type Hints

### Basic Type Annotations

```python
from typing import Optional, List, Dict, Any

def process_user(
    user_id: str,
    data: Dict[str, Any],
    active: bool = True
) -> Optional[User]:
    """Process a user and return the updated User or None."""
    if not active:
        return None
    return User(user_id, data)
```

### Modern Type Hints (Python 3.9+)

```python
# Python 3.9+ - Use built-in types
def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

# Python 3.8 and earlier - Use typing module
from typing import List, Dict

def process_items(items: List[str]) -> Dict[str, int]:
    return {item: len(item) for item in items}
```

### Type Aliases and TypeVar

```python
from typing import TypeVar, Union

# Type alias for complex types
JSON = Union[dict[str, Any], list[Any], str, int, float, bool, None]

def parse_json(data: str) -> JSON:
    return json.loads(data)

# Generic types
T = TypeVar('T')

def first(items: list[T]) -> T | None:
    """Return the first item or None if list is empty."""
    return items[0] if items else None
```

### Protocol-Based Duck Typing

```python
from typing import Protocol

class Renderable(Protocol):
    def render(self) -> str:
        """Render the object to a string."""

def render_all(items: list[Renderable]) -> str:
    """Render all items that implement the Renderable protocol."""
    return "\n".join(item.render() for item in items)
```

## Error Handling Patterns

### Specific Exception Handling

```python
# Good: Catch specific exceptions
def load_config(path: str) -> Config:
    try:
        with open(path) as f:
            return Config.from_json(f.read())
    except FileNotFoundError as e:
        raise ConfigError(f"Config file not found: {path}") from e
    except json.JSONDecodeError as e:
        raise ConfigError(f"Invalid JSON in config: {path}") from e

# Bad: Bare except
def load_config(path: str) -> Config:
    try:
        with open(path) as f:
            return Config.from_json(f.read())
    except:
        return None  # Silent failure!
```

### Exception Chaining

```python
def process_data(data: str) -> Result:
    try:
        parsed = json.loads(data)
    except json.JSONDecodeError as e:
        # Chain exceptions to preserve the traceback
        raise ValueError(f"Failed to parse data: {data}") from e
```

### Custom Exception Hierarchy

```python
class AppError(Exception):
    """Base exception for all application errors."""
    pass

class ValidationError(AppError):
    """Raised when input validation fails."""
    pass

class NotFoundError(AppError):
    """Raised when a requested resource is not found."""
    pass

# Usage
def get_user(user_id: str) -> User:
    user = db.find_user(user_id)
    if not user:
        raise NotFoundError(f"User not found: {user_id}")
    return user
```

## Context Managers

### Resource Management

```python
# Good: Using context managers
def process_file(path: str) -> str:
    with open(path, 'r') as f:
        return f.read()

# Bad: Manual resource management
def process_file(path: str) -> str:
    f = open(path, 'r')
    try:
        return f.read()
    finally:
        f.close()
```

### Custom Context Managers

```python
from contextlib import contextmanager

@contextmanager
def timer(name: str):
    """Context manager to time a block of code."""
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{name} took {elapsed:.4f} seconds")

# Usage
with timer("data processing"):
    process_large_dataset()
```

### Context Manager Classes

```python
class DatabaseTransaction:
    def __init__(self, connection):
        self.connection = connection

    def __enter__(self):
        self.connection.begin_transaction()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.connection.commit()
        else:
            self.connection.rollback()
        return False  # Don't suppress exceptions

# Usage
with DatabaseTransaction(conn):
    user = conn.create_user(user_data)
    conn.create_profile(user.id, profile_data)
```

## Comprehensions and Generators

### List Comprehensions

```python
# Good: List comprehension for simple transformations
names = [user.name for user in users if user.is_active]

# Bad: Manual loop
names = []
for user in users:
    if user.is_active:
        names.append(user.name)

# Complex comprehensions should be expanded
# Bad: Too complex
result = [x * 2 for x in items if x > 0 if x % 2 == 0]

# Good: Use a generator function
def filter_and_transform(items: Iterable[int]) -> list[int]:
    result = []
    for x in items:
        if x > 0 and x % 2 == 0:
            result.append(x * 2)
    return result
```

### Generator Expressions

```python
# Good: Generator for lazy evaluation
total = sum(x * x for x in range(1_000_000))

# Bad: Creates large intermediate list
total = sum([x * x for x in range(1_000_000)])
```

### Generator Functions

```python
def read_large_file(path: str) -> Iterator[str]:
    """Read a large file line by line."""
    with open(path) as f:
        for line in f:
            yield line.strip()

# Usage
for line in read_large_file("huge.txt"):
    process(line)
```

## Data Classes and Named Tuples

### Data Classes

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class User:
    """User entity with automatic __init__, __repr__, and __eq__."""
    id: str
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

# Usage
user = User(
    id="123",
    name="Alice",
    email="alice@example.com"
)
```

### Data Classes with Validation

```python
@dataclass
class User:
    email: str
    age: int

    def __post_init__(self):
        # Validate email format
        if "@" not in self.email:
            raise ValueError(f"Invalid email: {self.email}")
        # Validate age range
        if self.age < 0 or self.age > 150:
            raise ValueError(f"Invalid age: {self.age}")
```

### Named Tuples

```python
from typing import NamedTuple

class Point(NamedTuple):
    """Immutable 2D point."""
    x: float
    y: float

    def distance(self, other: 'Point') -> float:
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5

# Usage
p1 = Point(0, 0)
p2 = Point(3, 4)
print(p1.distance(p2))  # 5.0
```

## Decorators

### Function Decorators

```python
import functools
import time

def timer(func: Callable) -> Callable:
    """Decorator to time function execution."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)

# slow_function() prints: slow_function took 1.0012s
```

### Parameterized Decorators

```python
def repeat(times: int):
    """Decorator to repeat a function multiple times."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            results = []
            for _ in range(times):
                results.append(func(*args, **kwargs))
            return results
        return wrapper
    return decorator

@repeat(times=3)
def greet(name: str) -> str:
    return f"Hello, {name}!"

# greet("Alice") returns ["Hello, Alice!", "Hello, Alice!", "Hello, Alice!"]
```

### Class-Based Decorators

```python
class CountCalls:
    """Decorator that counts how many times a function is called."""
    def __init__(self, func: Callable):
        functools.update_wrapper(self, func)
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"{self.func.__name__} has been called {self.count} times")
        return self.func(*args, **kwargs)

@CountCalls
def process():
    pass

# Each call to process() prints the call count
```

## Concurrency Patterns

### Threading for I/O-Bound Tasks

```python
import concurrent.futures
import threading

def fetch_url(url: str) -> str:
    """Fetch a URL (I/O-bound operation)."""
    import urllib.request
    with urllib.request.urlopen(url) as response:
        return response.read().decode()

def fetch_all_urls(urls: list[str]) -> dict[str, str]:
    """Fetch multiple URLs concurrently using threads."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_url = {executor.submit(fetch_url, url): url for url in urls}
        results = {}
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                results[url] = future.result()
            except Exception as e:
                results[url] = f"Error: {e}"
    return results
```

### Multiprocessing for CPU-Bound Tasks

```python
def process_data(data: list[int]) -> int:
    """CPU-intensive computation."""
    return sum(x ** 2 for x in data)

def process_all(datasets: list[list[int]]) -> list[int]:
    """Process multiple datasets using multiple processes."""
    with concurrent.futures.ProcessPoolExecutor() as executor:
        results = list(executor.map(process_data, datasets))
    return results
```

### Async/Await for Concurrent I/O

```python
import asyncio

async def fetch_async(url: str) -> str:
    """Fetch a URL asynchronously."""
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def fetch_all(urls: list[str]) -> dict[str, str]:
    """Fetch multiple URLs concurrently."""
    tasks = [fetch_async(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return dict(zip(urls, results))
```

## Package Organization

### Standard Project Layout

```
myproject/
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── main.py
│       ├── api/
│       │   ├── __init__.py
│       │   └── routes.py
│       ├── models/
│       │   ├── __init__.py
│       │   └── user.py
│       └── utils/
│           ├── __init__.py
│           └── helpers.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_api.py
│   └── test_models.py
├── pyproject.toml
├── README.md
└── .gitignore
```

### Import Conventions

```python
# Good: Import order - stdlib, third-party, local
import os
import sys
from pathlib import Path

import requests
from fastapi import FastAPI

from mypackage.models import User
from mypackage.utils import format_name

# Good: Use isort for automatic import sorting
# pip install isort
```

### __init__.py for Package Exports

```python
# mypackage/__init__.py
"""mypackage - A sample Python package."""

__version__ = "1.0.0"

# Export main classes/functions at package level
from mypackage.models import User, Post
from mypackage.utils import format_name

__all__ = ["User", "Post", "format_name"]
```

## Memory and Performance

### Using __slots__ for Memory Efficiency

```python
# Bad: Regular class uses __dict__ (more memory)
class Point:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

# Good: __slots__ reduces memory usage
class Point:
    __slots__ = ['x', 'y']

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y
```

### Generator for Large Data

```python
# Bad: Returns full list in memory
def read_lines(path: str) -> list[str]:
    with open(path) as f:
        return [line.strip() for line in f]

# Good: Yields lines one at a time
def read_lines(path: str) -> Iterator[str]:
    with open(path) as f:
        for line in f:
            yield line.strip()
```

### Avoid String Concatenation in Loops

```python
# Bad: O(n²) due to string immutability
result = ""
for item in items:
    result += str(item)

# Good: O(n) using join
result = "".join(str(item) for item in items)

# Good: Using StringIO for building
from io import StringIO

buffer = StringIO()
for item in items:
    buffer.write(str(item))
result = buffer.getvalue()
```

## Python Tooling Integration

### Essential Commands

```bash
# Code formatting
black .
isort .

# Linting
ruff check .
pylint mypackage/

# Type checking
mypy .

# Testing
pytest --cov=mypackage --cov-report=html

# Security scanning
bandit -r .

# Dependency management
pip-audit
safety check
```

### pyproject.toml Configuration

```toml
[project]
name = "mypackage"
version = "1.0.0"
requires-python = ">=3.9"
dependencies = [
    "requests>=2.31.0",
    "pydantic>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
    "mypy>=1.5.0",
]

[tool.black]
line-length = 88
target-version = ['py39']

[tool.ruff]
line-length = 88
select = ["E", "F", "I", "N", "W"]

[tool.mypy]
python_version = "3.9"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=mypackage --cov-report=term-missing"
```

## Quick Reference: Python Idioms

| Idiom | Description |
|-------|-------------|
| EAFP | Easier to Ask Forgiveness than Permission |
| Context managers | Use `with` for resource management |
| List comprehensions | For simple transformations |
| Generators | For lazy evaluation and large datasets |
| Type hints | Annotate function signatures |
| Dataclasses | For data containers with auto-generated methods |
| `__slots__` | For memory optimization |
| f-strings | For string formatting (Python 3.6+) |
| `pathlib.Path` | For path operations (Python 3.4+) |
| `enumerate` | For index-element pairs in loops |

## Anti-Patterns to Avoid

```python
# Bad: Mutable default arguments
def append_to(item, items=[]):
    items.append(item)
    return items

# Good: Use None and create new list
def append_to(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

# Bad: Checking type with type()
if type(obj) == list:
    process(obj)

# Good: Use isinstance
if isinstance(obj, list):
    process(obj)

# Bad: Comparing to None with ==
if value == None:
    process()

# Good: Use is
if value is None:
    process()

# Bad: from module import *
from os.path import *

# Good: Explicit imports
from os.path import join, exists

# Bad: Bare except
try:
    risky_operation()
except:
    pass

# Good: Specific exception
try:
    risky_operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
```

__Remember__: Python code should be readable, explicit, and follow the principle of least surprise. When in doubt, prioritize clarity over cleverness.

## Purpose

Pythonic idioms and patterns for production code: dataclasses + `__slots__`, type hints under `mypy --strict`, context managers, async/await with `asyncio`, comprehensions, `pathlib`, `pydantic` for validation, `pytest` for testing, and dependency management with `uv` / Poetry.

**Negative scope**: NOT framework-specific (Django / FastAPI / Flask have their own skills). NOT data-science / Jupyter patterns (different concerns). NOT machine-learning pipelines (use `cost-aware-llm-pipeline`).

## When NOT to use

- Pure Bash / shell scripting tasks
- Performance-critical loops where Cython / Rust extension is the right answer
- Notebooks where reproducibility != production discipline
- Throw-away one-off scripts where mypy strictness is more friction than value

## Standards Cited

- **PEP 8** — Style Guide for Python Code
- **PEP 257** — Docstring Conventions
- **PEP 484 / PEP 526 / PEP 604** — Type Hints (variable, parameter, union syntax `X | Y`)
- **PEP 604** — Union types `int | str` (Python 3.10+)
- **PEP 695** — Type Parameter Syntax (Python 3.12+)
- **PEP 8 / PEP 257** — Style + docstrings
- **mypy / pyright** — strict-mode type checkers
- **ruff 0.7+** — linter + formatter (Astral)
- **OWASP ASVS 4.0.3 §5** — validation
- **Effective Python 3e (Slatkin, 2024)** — idiomatic patterns

## Cross-References

- `~/.claude/rules-library/python/no-discards.md` — banned Python patterns (bare except, `# noqa`, mutable defaults)
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict ruff / mypy config
- `~/.claude/rules-library/common/no-discards.md` — universal discards (hardcoded creds, `print()` in product code)
- `~/.claude/skills/coding-standards/SKILL.md` — language-agnostic floor
- `~/.claude/skills/django-patterns/SKILL.md` — Django framework specifics
- `~/.claude/skills/python-testing/SKILL.md` — pytest + factories + property-based testing
- `~/.claude/agents/python-reviewer.md` — PEP 8 + type hint + framework review

## Why this skill exists

Python's dynamic nature makes it easy to ship subtle bugs that types would catch. The recurring failure modes:

- `except:` swallows every error including `KeyboardInterrupt` and `SystemExit` → uninterruptible / undebuggable code paths
- Mutable default args (`def f(items=[])`) share state across calls → spooky bugs that look like "the function changed itself"
- `Optional[T]` accessed without narrowing → `AttributeError: 'NoneType'` in production
- `print()` debug statements left in product code → no structure, no levels, no correlation
- `subprocess.run(cmd, shell=True)` with user input → command injection

Cost of typed-Python discipline (mypy strict + ruff ALL): minutes per module. Cost of skipping it: incidents that look like Python bugs but are really developer-discipline gaps.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- `except:` / `except Exception:` without specific type + log + rethrow (sister `python/no-discards.md` rules 1-2)
- `raise NewErr(...)` without `from err` (loses cause chain — rule 4)
- `logging.error(...)` inside `except` instead of `logging.exception(...)` (rule 5)
- `# noqa` / `# type: ignore` / `# pragma: no cover` introduced (rule 6 violation)
- Mutable default argument (`def f(items=[])`) — rule 7 violation
- `Optional[T]` accessed without narrowing (rule 8)
- `Any` type used where a TypedDict / dataclass / Pydantic model would work (rule 9)
- `print()` in production source (rule 10 — use `logging`)
- `assert` used in production code paths (rule 13 — strips under `python -O`)
- `subprocess.run(..., shell=True)` (rule 14 — command injection)

**Refinement candidates**:
- New per-version idiom row when a new Python release ships (e.g., 3.13 free-threaded, structural pattern-matching improvements)
- Tightening of the strict-typing baseline when a Pydantic v3 / mypy improvement ships
- New cross-reference when a sister rule (python/no-discards, security) adds a banned pattern
- New error-handling template when a recurring exception class needs canonical wrapping

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: /Users/APPLE/.claude/rules-library/python/
     ============================================================ -->

## Migrated rules (rules-library/python/, 2026-06-02)

Phase H will delete the source files at `rules-library/python/`. Content below preserves the original rule bodies for lazy-load via the `paths:` glob above.

---

<!-- ============================================================
     Section: python/coding-style.md
     ============================================================ -->

---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Python specific content.

## Standards

- Follow **PEP 8** conventions
- Use **type annotations** on all function signatures

## Immutability

Prefer immutable data structures:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

## Formatting

- **black** for code formatting
- **isort** for import sorting
- **ruff** for linting

## Reference

See skill: `python-patterns` for comprehensive Python idioms and patterns.

---

<!-- ============================================================
     Section: python/hooks.md
     ============================================================ -->

---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Python specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **black/ruff**: Auto-format `.py` files after edit
- **mypy/pyright**: Run type checking after editing `.py` files

## Warnings

- Warn about `print()` statements in edited files (use `logging` module instead)

---

<!-- ============================================================
     Section: python/no-discards.md
     ============================================================ -->

# Python — No-Discards Extension

> Auto-fires on every `*.py`, `*.pyi` file. Extends
> `~/.claude/rules-library/common/no-discards.md` with Python-specific
> patterns. Sister to `extreme-lint-policy.md`,
> `no-silent-failures.md`, `error-handling-with-context.md`.
> Tooling: `ruff` (select=ALL), `mypy --strict`,
> `pyright --strict`, `bandit`, `pylint`, `pytest`.

## Core Principle (Python-specific restatement)

**Every exception is caught with a SPECIFIC exception type and
handled by logging with `exc_info=True` then re-raising with
context. Every function has type hints; every `Optional` is
narrowed before access; every `# noqa` / `# type: ignore` is
banned. Mypy + Pyright are configured at maximum strictness.**

Python's dynamic typing + permissive defaults make silent
failures trivially easy to write. The combination of strict
linters + type checkers + the rules below close the gaps.

## Banned patterns

### 1. Bare `except:` / `except Exception:`

```python
# FORBIDDEN — blind catch swallows EVERY error including KeyboardInterrupt
try:
    do_thing()
except:
    pass

# FORBIDDEN — too-broad catch
try:
    do_thing()
except Exception:
    pass

# CORRECT — specific exception types, logged + re-raised with context
import logging
logger = logging.getLogger(__name__)

try:
    do_thing()
except ValueError as err:
    logger.warning("invalid input to do_thing", exc_info=True, extra={"context": context})
    raise InvalidInputError("do_thing failed") from err
```

`ruff` rules: `BLE001` (blind-except), `E722` (bare except).
ENFORCED.

### 2. `except: pass` / `except Exception: pass`

```python
# FORBIDDEN — silent swallow
try:
    cleanup()
except Exception:
    pass

# CORRECT — log even when "expected"
try:
    cleanup()
except OSError:
    logger.debug("cleanup failed; non-critical", exc_info=True)
```

`ruff` rule: `S110` (try-except-pass). ENFORCED.

### 3. `except: return None` (or other silent default)

```python
# FORBIDDEN
def get_user(user_id):
    try:
        return db.get(user_id)
    except Exception:
        return None

# CORRECT — typed result OR raise
def get_user(user_id: str) -> User | None:
    try:
        return db.get(user_id)
    except UserNotFound:
        return None  # this is a typed signal, not a swallow
    except DatabaseError as err:
        logger.error("db.get failed", exc_info=True, extra={"user_id": user_id})
        raise GetUserError(f"get user {user_id}") from err
```

### 4. Re-raising without `from`

```python
# FORBIDDEN — loses the original traceback chain
try:
    api_call()
except APIError as err:
    raise ServiceError("API failed")  # original `err` is hidden

# CORRECT — chain with `from` to preserve cause
try:
    api_call()
except APIError as err:
    raise ServiceError("API failed") from err
```

`ruff` rule: `B904` (raise from). ENFORCED.

### 5. `logging.error` inside except (instead of `.exception`)

```python
# FORBIDDEN — loses the stack trace
try:
    do_thing()
except SomeError as err:
    logger.error(f"failed: {err}")  # no traceback in log

# CORRECT
try:
    do_thing()
except SomeError:
    logger.exception("do_thing failed")   # captures stack
    raise
```

`ruff` rule: `TRY400`. ENFORCED.

### 6. `# noqa`, `# type: ignore`, `# pragma: no cover`

NEVER. These are escape hatches that hide real problems. Fix
the underlying issue.

```python
# FORBIDDEN
result = some_call()  # noqa: BLE001
value = config["key"]  # type: ignore[arg-type]
def helper():  # pragma: no cover
    ...

# CORRECT — fix the actual issue
try:
    result = some_call()
except SpecificError:
    handle()

value = config.get("key")
if value is None:
    raise ConfigurationError("'key' missing")

def helper():
    ...
# Then write a test for `helper()` that covers it.
```

### 7. Mutable default arguments

```python
# FORBIDDEN — Python's default arg is evaluated ONCE; mutations persist
def add_item(item, items=[]):
    items.append(item)
    return items

# CORRECT
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

`ruff` rule: `B006`. ENFORCED.

### 8. `Optional` without narrowing

```python
# FORBIDDEN — accessing attribute on possibly-None
def display_name(user: User | None) -> str:
    return user.name   # crashes if user is None

# CORRECT — explicit narrowing
def display_name(user: User | None) -> str:
    if user is None:
        return "Anonymous"
    return user.name
```

Mypy `--strict` + `pyright` catch this.

### 9. `Any` type / missing annotations

```python
# FORBIDDEN — Any propagates type holes
from typing import Any

def process(data: Any) -> Any:
    return data["field"]

# FORBIDDEN — no type hints at all
def process(data):
    return data["field"]

# CORRECT
from typing import TypedDict

class UserData(TypedDict):
    field: str

def process(data: UserData) -> str:
    return data["field"]
```

`mypy --strict` + `disallow_any_explicit = true` enforced.

### 10. `print()` in production code

```python
# FORBIDDEN
def handle_request(req):
    print(f"got request: {req.id}")

# CORRECT
import logging
logger = logging.getLogger(__name__)

def handle_request(req):
    logger.info("got request", extra={"request_id": req.id})
```

`ruff` rule: `T201` (print). ENFORCED. Allowlist: CLI tools
where `print` IS the output channel.

### 11. Hardcoded credentials

```python
# FORBIDDEN
STRIPE_KEY = "sk_live_4eC39Hq..."
DB_PASSWORD = "supersecret"

# CORRECT
import os
STRIPE_KEY = os.environ["STRIPE_KEY"]
DB_PASSWORD = os.environ["DB_PASSWORD"]

# BETTER — use a config object validated at startup (per no-ambient-globals.md)
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    stripe_key: str
    db_password: str

    class Config:
        env_file = ".env"

settings = Settings()
```

`bandit` + `ruff` `S105`/`S106`/`S107` rules. ENFORCED.

### 12. `eval()` / `exec()` with user input

```python
# FORBIDDEN — RCE vulnerability
result = eval(user_input)

# CORRECT — use a real parser
import json
data = json.loads(user_input)

# OR if expression evaluation is genuinely needed:
import ast
tree = ast.parse(user_input, mode="eval")
# walk + validate AST whitelist before eval
```

`ruff` rule: `S307`. ENFORCED.

### 13. `assert` in production code paths

```python
# FORBIDDEN — `python -O` strips asserts; production loses the check
def withdraw(account, amount):
    assert amount > 0, "Amount must be positive"
    ...

# CORRECT
def withdraw(account, amount):
    if amount <= 0:
        raise ValueError(f"amount must be positive: {amount}")
    ...
```

`ruff` rule: `S101`. Allowlist: tests + dev-only assertions.

### 14. `subprocess` with `shell=True`

```python
# FORBIDDEN — command injection
import subprocess
subprocess.run(f"ls {user_input}", shell=True)

# CORRECT
subprocess.run(["ls", user_input], check=True)
```

`ruff` rule: `S602`. ENFORCED.

### 15. Open without context manager

```python
# FORBIDDEN — file may not be closed
f = open("data.txt")
data = f.read()

# CORRECT
with open("data.txt", encoding="utf-8") as f:
    data = f.read()
```

`ruff` rule: `SIM115`. ENFORCED.

### 16. `requests` without timeout

```python
# FORBIDDEN — hangs forever on slow server
import requests
response = requests.get(url)

# CORRECT
response = requests.get(url, timeout=(5, 30))  # connect, read
```

`bandit` + per `circuit-breaker.md` (combine with breaker).

### 17. `pickle.loads(untrusted)`

```python
# FORBIDDEN — pickle deserialisation = RCE
import pickle
data = pickle.loads(user_input)

# CORRECT
import json
data = json.loads(user_input)
```

`bandit` `B301` / `B302`. ENFORCED.

## Required linters (Python-side gates)

Per `extreme-lint-policy.md`:

```bash
ruff check . --select=ALL --output-format=full   # all rules
ruff format --check .                            # formatting
mypy --strict .
pyright --strict .
bandit -r . -ll                                  # security
pytest -v --cov --cov-fail-under=80
```

`pyproject.toml`:

```toml
[tool.ruff]
target-version = "py312"
line-length = 100
extend-select = ["ALL"]
extend-ignore = [
  "D",          # docstrings — pydocstyle policy separately
  "ANN",        # use mypy for type checks
  "COM812",     # conflict with formatter
  "ISC001",     # conflict with formatter
]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101", "PLR2004"]  # assert + magic numbers OK in tests

[tool.ruff.lint.mccabe]
max-complexity = 7         # per extreme-lint-policy

[tool.ruff.lint.pylint]
max-args = 5               # per extreme-lint-policy
max-branches = 7
max-returns = 4
max-statements = 30

[tool.mypy]
strict = true
disallow_any_explicit = true
disallow_any_unimported = true
warn_unreachable = true
warn_no_return = true
warn_return_any = true
warn_unused_configs = true
warn_unused_ignores = true
no_implicit_optional = true

[tool.pyright]
typeCheckingMode = "strict"
reportMissingTypeStubs = "error"
reportUnknownMemberType = "error"
reportUnknownParameterType = "error"
reportUnknownVariableType = "error"
reportUnknownArgumentType = "error"
reportPrivateUsage = "error"
reportConstantRedefinition = "error"
reportIncompatibleMethodOverride = "error"
reportImplicitStringConcatenation = "error"

[tool.coverage.run]
branch = true
source = ["myapp"]

[tool.coverage.report]
exclude_lines = [
  "pragma: no cover",
  "raise NotImplementedError",
  "if TYPE_CHECKING:",
  "@overload",
]
fail_under = 80
show_missing = true
```

## Verification block (Python-side)

```
Python lint sweep (this turn):
  - ruff check . --select=ALL: 0 issues
  - ruff format --check: clean
  - mypy --strict .: 0 errors
  - pyright --strict .: 0 errors
  - bandit: 0 issues
  - pytest --cov: PASS (coverage 92%)
  - IDE diagnostics: 0
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md` — umbrella rule
- `~/.claude/rules-library/common/no-silent-failures.md` — silent failure
  patterns
- `~/.claude/rules-library/common/error-handling-with-context.md` —
  wrapping with operation + ids
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict lint
  config
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI patterns;
  pydantic-settings for config
- `~/.claude/rules/common/done-criteria.md` — verification block

## Why this rule exists

Python's "easy to write, easy to ship" ethos comes with silent-
failure ergonomics: `except: pass` is one line; `# noqa` silences
the linter; missing type hints let any value flow anywhere.
Historical bug classes:

- A Stripe webhook handler with `except Exception: pass` lost
  hundreds of payment events silently
- An ETL pipeline with `try: process(row); except: continue`
  dropped 12% of rows; nobody noticed for months
- A function that returned `None` on error was called from a
  page renderer; the page showed "None" to users
- `pickle.loads(request.body)` enabled remote code execution
- Type hints missing on a public API; consumers passed wrong
  shapes; failures only surfaced at runtime

Strict linters + strict type checkers + this rule's bans close
these gaps. The cost: more annotations, more specific
`except` clauses. The benefit: code that's actually debuggable
and refactorable.

---

<!-- ============================================================
     Section: python/patterns.md
     ============================================================ -->

---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Python specific content.

## Protocol (Duck Typing)

```python
from typing import Protocol

class Repository(Protocol):
    def find_by_id(self, id: str) -> dict | None: ...
    def save(self, entity: dict) -> dict: ...
```

## Dataclasses as DTOs

```python
from dataclasses import dataclass

@dataclass
class CreateUserRequest:
    name: str
    email: str
    age: int | None = None
```

## Context Managers & Generators

- Use context managers (`with` statement) for resource management
- Use generators for lazy evaluation and memory-efficient iteration

## Reference

See skill: `python-patterns` for comprehensive patterns including decorators, concurrency, and package organization.

---

<!-- ============================================================
     Section: python/security.md
     ============================================================ -->

---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Security

> This file extends [common/security.md](../common/security.md) with Python specific content.

## Secret Management

```python
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ["OPENAI_API_KEY"]  # Raises KeyError if missing
```

## Security Scanning

- Use **bandit** for static security analysis:
  ```bash
  bandit -r src/
  ```

## Reference

See skill: `django-security` for Django-specific security guidelines (if applicable).

---

<!-- ============================================================
     Section: python/testing.md
     ============================================================ -->

---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Testing

> This file extends [common/testing.md](../common/testing.md) with Python specific content.

## Framework

Use **pytest** as the testing framework.

## Coverage

```bash
pytest --cov=src --cov-report=term-missing
```

## Test Organization

Use `pytest.mark` for test categorization:

```python
import pytest

@pytest.mark.unit
def test_calculate_total():
    ...

@pytest.mark.integration
def test_database_connection():
    ...
```

## Reference

See skill: `python-testing` for detailed pytest patterns and fixtures.

---
