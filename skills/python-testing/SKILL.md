---
name: python-testing
description: Python testing strategies using pytest, TDD methodology, fixtures, mocking, parametrization, and coverage requirements.
---

# Python Testing Patterns

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`

Comprehensive testing strategies for Python applications using pytest, TDD methodology, and best
practices.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Testing Philosophy | [`references/core-testing-philosophy.md`](references/core-testing-philosophy.md) |
| pytest Fundamentals | [`references/pytest-fundamentals.md`](references/pytest-fundamentals.md) |
| Fixtures | [`references/fixtures.md`](references/fixtures.md) |
| Parametrization | [`references/parametrization.md`](references/parametrization.md) |
| Markers and Test Selection | [`references/markers-and-test-selection.md`](references/markers-and-test-selection.md) |
| Mocking and Patching | [`references/mocking-and-patching.md`](references/mocking-and-patching.md) |
| Testing Async Code | [`references/testing-async-code.md`](references/testing-async-code.md) |
| Testing Exceptions | [`references/testing-exceptions.md`](references/testing-exceptions.md) |
| Testing Side Effects | [`references/testing-side-effects.md`](references/testing-side-effects.md) |
| Test Organization | [`references/test-organization.md`](references/test-organization.md) |
| Best Practices | [`references/best-practices.md`](references/best-practices.md) |
| Common Patterns | [`references/common-patterns.md`](references/common-patterns.md) |
| pytest Configuration | [`references/pytest-configuration.md`](references/pytest-configuration.md) |
| Running Tests | [`references/running-tests.md`](references/running-tests.md) |
| Quick Reference | [`references/quick-reference.md`](references/quick-reference.md) |
| Compliance & Standards Mapping | [`references/compliance-standards-mapping.md`](references/compliance-standards-mapping.md) |

## When to Activate

- Writing new Python code (follow TDD: red, green, refactor)
- Designing test suites for Python projects
- Reviewing Python test coverage
- Setting up testing infrastructure

## Purpose

Principal-level pytest methodology: fixtures + scopes + parametrize, hypothesis (property-based),
pytest-mock + responses, async testing via pytest-asyncio, snapshot tests via syrupy, coverage via
pytest-cov + branch coverage.

**Negative scope** (NOT what this skill covers):

- Django-specific testing — see `django-testing`
- Python language idioms — see `python-patterns`
- TDD methodology — see `tdd-workflow`
- Generic test taxonomy — see `testing.md` rule
- Performance / load testing — see `observability-patterns`

## When NOT to use

- unittest-style legacy test suites (defer to gradual migration; document with a `pytest
  --collect-only` audit)
- Notebook-style data-science checks (use nbval / papermill)

## Standards Cited

- **pytest 8+ User Guide** (`docs.pytest.org/en/stable/`) — fixture system, parametrize, marks
- **pytest-asyncio 0.24+** — async test support
- **pytest-mock 3.14+** — mocker fixture
- **hypothesis 6.x** (`hypothesis.readthedocs.io`) — property-based testing
- **responses 0.25+** — HTTP mocking
- **freezegun 1.5+** — time freezing
- **coverage.py 7+** — branch coverage instrumentation
- **PEP 484 / PEP 695** — type hints for typed assertions
- **PEP 8 / PEP 257** — test code style

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `time.sleep()` for async waits | Flaky; non-deterministic | `pytest.timeout` + Awaitility-like polling |
| Per-test DB recreation | Slow suite | Transactional fixtures (`@pytest.fixture(scope="session")` + rollback per test) |
| Mocking the object under test | Tests the mock, not the code | Mock collaborators only; inject via DI |
| `assert result.foo == 1 and result.bar == 2` | Failure message: "False is not True" | Separate asserts OR use `assert_dict_equal` / `pytest.approx` |
| Skipping tests without reason | Hidden bugs accumulate | `@pytest.mark.skip(reason="ticket #...")` with fix deadline |
| `try/except` in tests to "make them pass" | Hides regressions | Let exception propagate; use `pytest.raises` for expected exceptions |
| Importing test fixtures cross-file | Implicit dependencies | `conftest.py` at appropriate scope |
| Coupling tests to test order | Order-dependent failures | Run with `pytest --random-order`; isolate state per test |
| Hand-rolling fixtures instead of factory_boy / model_bakery | Boilerplate; brittle | Factories with traits |
| Using real network in tests | Flaky + slow + dangerous | `responses` library + recorded fixtures |

## Verification Checklist

- [ ] pytest config (`pyproject.toml` `[tool.pytest.ini_options]`) sets `--strict-markers
  --strict-config`
- [ ] `pytest-cov` with branch coverage on; ≥ 90% touched-file coverage
- [ ] Async tests use `pytest-asyncio` (not bare `asyncio.run`)
- [ ] Property tests via hypothesis for parsers / validators / state machines
- [ ] No `time.sleep`; no order-dependence (run with `--random-order` clean)
- [ ] No real network (mocked via `responses` / `aioresponses`)
- [ ] Time-dependent tests use `freezegun`
- [ ] Tests assert on observable behaviour, not internal calls
- [ ] Fixtures use minimum-needed scope (function < class < module < session)
- [ ] `pyproject.toml` declares dev deps in `[project.optional-dependencies]`

## Cross-References

- `~/.claude/skills/python-patterns/SKILL.md` — language idioms
- `~/.claude/skills/django-testing/SKILL.md` — Django-specific
- `~/.claude/skills/tdd-workflow/SKILL.md` — RED-GREEN-REFACTOR
- `~/.claude/rules-library/common/testing.md` — coverage thresholds
- `~/.claude/rules-library/common/no-ambient-globals.md` — Clock / RNG injection
- `~/.claude/rules-library/python/no-discards.md` — pytest pattern hooks
- `~/.claude/agents/python-reviewer.md` — Python code review delegate
- `~/.claude/agents/tdd-guide.md`

## Why this skill exists

Python test suites scale or stall depending on three early decisions: fixture scope choice
(function-vs-session), real-network-vs-mocks for external calls, and
clock-injection-vs-`time.sleep`. The patterns above codify the principal-level defaults:
session-scoped DB fixtures, `responses` for HTTP, `freezegun` for time, hypothesis for invariants.
The result is suites that run in seconds instead of minutes AND catch invariant violations that
hand-rolled examples miss.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `@pytest.mark.skip` introduced without ticket + fix deadline
- Shared mutable fixture (module / session scope) causing test-order coupling
- `mock.patch` used at the wrong import path (mock not applied — silent test passing)
- Real network call in unit / integration tests (responses / vcrpy / httpx mock absent)
- `tmp_path` not used — tests write to `/tmp/...` and leak across runs
- Parametrize cases that duplicate the test body (parametrize abused as copy-paste)
- `pytest-asyncio` async tests using real `asyncio.sleep` instead of mocked time
- Coverage < 90% on touched files (canonical floor breach per `extreme-lint-policy.md`)
- Test asserts on exception `message` not type / `error_code` (brittle to copy edits)

**Refinement candidates**:

- New fixture-pattern row when a recurring setup class emerges (e.g., new test DB factory, new
  event-loop helper)
- New cross-reference when a sister rule (python/no-discards, testing, local-testability) adds a
  verification surface
- Tightening of the coverage floor on packages flagged as critical
- New per-framework testing template when a recurring stack (FastAPI, Django REST, Litestar) needs
  canonical patterns
