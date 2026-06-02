# Python — No-Discards Extension

> Auto-fires on every `*.py`, `*.pyi` file. Extends
> `~/.claude/rules/common/no-discards.md` with Python-specific
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

- `~/.claude/rules/common/no-discards.md` — umbrella rule
- `~/.claude/rules/common/no-silent-failures.md` — silent failure
  patterns
- `~/.claude/rules/common/error-handling-with-context.md` —
  wrapping with operation + ids
- `~/.claude/rules/common/extreme-lint-policy.md` — strict lint
  config
- `~/.claude/rules/common/no-ambient-globals.md` — DI patterns;
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
