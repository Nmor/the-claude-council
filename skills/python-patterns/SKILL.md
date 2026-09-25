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

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> Before creating a new class, function, or module, sweep
> `<pkg>/lib/`, `<pkg>/utils/`, `<pkg>/services/`, `<pkg>/dto/`.
> One source of truth per primitive (one HTTP client, one logger
> config, one Pydantic base model, one validator, one
> serializer). Extend via subclass / Protocol / dependency
> injection — never fork the module into a parallel variant.

Idiomatic Python patterns and best practices for building robust, efficient, and maintainable
applications.

## Purpose

Pythonic idioms and patterns for production code: dataclasses + `__slots__`, type hints under `mypy
--strict`, context managers, async/await with `asyncio`, comprehensions, `pathlib`, `pydantic` for
validation, `pytest` for testing, and dependency management with `uv` / Poetry.

**Negative scope**: NOT framework-specific (Django / FastAPI / Flask have their own skills). NOT
data-science / Jupyter patterns (different concerns). NOT machine-learning pipelines (use
`cost-aware-llm-pipeline`).

## When NOT to use

- Pure Bash / shell scripting tasks
- Performance-critical loops where Cython / Rust extension is the right answer
- Notebooks where reproducibility != production discipline
- Throw-away one-off scripts where mypy strictness is more friction than value

## Reference map

This SKILL.md is a routing table. Every pattern, code example, standard and
anti-pattern lives in `references/` and is read on demand — open only the row
the task actually touches.

| Topic | Read | Covers |
| --- | --- | --- |
| Core principles | [`references/core-principles.md`](references/core-principles.md) | When to activate; readability counts; explicit over implicit; EAFP over LBYL |
| Type hints | [`references/type-hints.md`](references/type-hints.md) | Basic annotations; modern 3.9+ built-in generics; type aliases + TypeVar; Protocol duck typing |
| Error handling | [`references/error-handling.md`](references/error-handling.md) | Specific exception handling; exception chaining with `from`; custom exception hierarchy |
| Context managers | [`references/context-managers.md`](references/context-managers.md) | Resource management; `@contextmanager`; context-manager classes (`__enter__` / `__exit__`) |
| Comprehensions + generators | [`references/comprehensions-generators.md`](references/comprehensions-generators.md) | List comprehensions and when to expand them; generator expressions; generator functions |
| Data classes + named tuples | [`references/dataclasses-namedtuples.md`](references/dataclasses-namedtuples.md) | `@dataclass`; validation via `__post_init__`; `NamedTuple` |
| Decorators | [`references/decorators.md`](references/decorators.md) | Function decorators with `functools.wraps`; parameterized decorators; class-based decorators |
| Concurrency | [`references/concurrency.md`](references/concurrency.md) | Threads for I/O-bound; processes for CPU-bound; `async` / `await` with `asyncio.gather` |
| Package organization | [`references/package-organization.md`](references/package-organization.md) | Standard `src/` layout; import order conventions; `__init__.py` exports and `__all__` |
| Memory + performance | [`references/memory-performance.md`](references/memory-performance.md) | `__slots__`; generators for large data; avoiding O(n^2) string concatenation |
| Tooling | [`references/tooling.md`](references/tooling.md) | black / isort / ruff / mypy / pytest / bandit / pip-audit commands; reference `pyproject.toml` |
| Idioms + anti-patterns | [`references/idioms-and-anti-patterns.md`](references/idioms-and-anti-patterns.md) | Quick-reference idiom table; mutable defaults, `type()` checks, `== None`, `import *`, bare except |
| No-discards (Python) | [`references/no-discards.md`](references/no-discards.md) | The 17 banned patterns, required linter gates, strict `pyproject.toml`, Python verification block |
| Migrated rules | [`references/migrated-rules.md`](references/migrated-rules.md) | Migrated `rules-library/python/` bodies: coding-style, hooks, patterns, security, testing |

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

- `~/.claude/rules-library/python/no-discards.md` — banned Python patterns (bare except, `# noqa`,
  mutable defaults)
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict ruff / mypy config
- `~/.claude/rules-library/common/no-discards.md` — universal discards (hardcoded creds, `print()`
  in product code)
- `~/.claude/skills/coding-quality-rules/SKILL.md` — language-agnostic floor
- `~/.claude/skills/django-patterns/SKILL.md` — Django framework specifics
- `~/.claude/skills/python-testing/SKILL.md` — pytest + factories + property-based testing
- `~/.claude/agents/python-reviewer.md` — PEP 8 + type hint + framework review

## Why this skill exists

Python's dynamic nature makes it easy to ship subtle bugs that types would catch. The recurring
failure modes:

- `except:` swallows every error including `KeyboardInterrupt` and `SystemExit` → uninterruptible /
  undebuggable code paths
- Mutable default args (`def f(items=[])`) share state across calls → spooky bugs that look like
  "the function changed itself"
- `Optional[T]` accessed without narrowing → `AttributeError: 'NoneType'` in production
- `print()` debug statements left in product code → no structure, no levels, no correlation
- `subprocess.run(cmd, shell=True)` with user input → command injection

Cost of typed-Python discipline (mypy strict + ruff ALL): minutes per module. Cost of skipping it:
incidents that look like Python bugs but are really developer-discipline gaps.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `except:` / `except Exception:` without specific type + log + rethrow (sister
  `python/no-discards.md` rules 1-2)
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

- New per-version idiom row when a new Python release ships (e.g., 3.13 free-threaded, structural
  pattern-matching improvements)
- Tightening of the strict-typing baseline when a Pydantic v3 / mypy improvement ships
- New cross-reference when a sister rule (python/no-discards, security) adds a banned pattern
- New error-handling template when a recurring exception class needs canonical wrapping
