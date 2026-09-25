# python-patterns: Context Managers

> Covers resource management with `with`, `@contextmanager`, and context-manager classes. Pointed at
> by the **Context managers** row in [`../SKILL.md`](../SKILL.md).
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
