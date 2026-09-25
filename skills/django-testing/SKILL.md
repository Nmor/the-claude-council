---
name: django-testing
description: Django testing discipline — TDD workflow for Django/DRF (RED-GREEN-REFACTOR against models, views, serializers, permissions), pytest-django and factory patterns, database and transaction handling in tests, API client testing, AND the verification gates a Django change must pass before it ships (migrations check, coverage floor, lint/type gates, deployment checks). Use when writing Django tests or verifying a Django change is done.
paths:
  - "**/test_*.py"
  - "**/*_test.py"
  - "**/tests/**/*.py"
  - "**/conftest.py"
  - "**/factories.py"
---

# Django Testing with TDD

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check

Test-driven development for Django applications using pytest, factory_boy, and Django REST
Framework.

## Reference Map

This skill uses progressive disclosure: the routing table below is what loads when the
`paths:` globs match. Read the reference file for the topic you are actually working on.

| Topic | Reference file |
| --- | --- |
| TDD workflow for Django (RED-GREEN-REFACTOR) | `references/tdd-and-setup.md` |
| Setup: pytest config, test settings, conftest | `references/tdd-and-setup.md` |
| Factory Boy | `references/factories-and-models.md` |
| Model testing | `references/factories-and-models.md` |
| View testing | `references/views-and-api.md` |
| DRF API testing (serializers, ViewSets) | `references/views-and-api.md` |
| Mocking and patching (external services, email) | `references/mocking-and-integration.md` |
| Integration testing (full flow) | `references/mocking-and-integration.md` |
| Testing best practices (DO / DON'T) | `references/practices-coverage-compliance.md` |
| Coverage configuration + goals | `references/practices-coverage-compliance.md` |
| Quick reference (testing) | `references/practices-coverage-compliance.md` |
| Compliance & standards mapping | `references/practices-coverage-compliance.md` |
| Verification pipeline (Phases 1-12) | `references/verification-pipeline.md` |
| Verification output template + pre-deployment checklist | `references/verification-pipeline.md` |
| Continuous integration (GitHub Actions) + quick reference | `references/verification-pipeline.md` |
| Learning hooks | `references/learning-hooks.md` |

## When to Activate

- Writing new Django applications
- Implementing Django REST Framework APIs
- Testing Django models, views, and serializers
- Setting up testing infrastructure for Django projects

## Purpose

Principal-level Django test methodology: pytest-django + factory_boy + freezegun + pytest-mock +
responses; transaction isolation via `pytest.mark.django_db`; reusable fixtures via session scope;
DRF APIClient patterns; coverage gates.

**Negative scope** (NOT what this skill covers):

- Django architecture under test — see `django-patterns`
- Security testing patterns — see `django-patterns`
- Deployment / coverage / build gates — see `django-testing`
- Generic Python testing — see `python-testing`
- TDD methodology (RED-GREEN-REFACTOR) — see `tdd-workflow`

Principal-level Django verification: migration safety, `manage.py check --deploy`, dependency CVE
scan, license gate, coverage thresholds, `collectstatic` validation, static analysis (ruff + mypy +
bandit), Docker image hardening, deploy gates.

**Negative scope** (NOT what this skill covers):

- Code-level patterns — see `django-patterns`
- Security config — see `django-patterns`
- Test methodology — see `django-testing`
- Generic Python verification — see `python-testing`
- Generic dependency pinning — see `dependency-pinning.md`

## When NOT to use

- Non-Django Python tests (use generic `python-testing`)
- DRF-only APIs without Django models (still mostly applies; lighter setup)
- Async-first Django ASGI tests (different fixture model — `asgi_application` fixture)

- Non-Django Python projects (use language-level verification skills)
- Native binary deploys (skip Django-specific gates)

## Standards Cited

- **pytest 8+ Documentation** (`docs.pytest.org/en/stable/`) — core fixture system
- **pytest-django 4.9+** (`pytest-django.readthedocs.io`) — Django integration
- **factory_boy 3.3** (`factoryboy.readthedocs.io`) — fixture factories
- **freezegun 1.5+** — clock control in tests
- **responses 0.25+** + **pytest-mock** — HTTP / function mocking
- **Django Test Reference** (`docs.djangoproject.com/en/5.1/topics/testing/`)
- **DRF Testing** (`www.django-rest-framework.org/api-guide/testing/`)
- **coverage.py 7+** — coverage instrumentation

- **Django Deployment Checklist** (`docs.djangoproject.com/en/5.1/howto/deployment/checklist/`) —
  canonical pre-deploy gates
- **PEP 517 / 518 / 621 / 660** — Python packaging standards
- **ruff 0.7+ Documentation** — fast Python linter / formatter
- **mypy 1.13+ Strict Mode** — type checking
- **bandit 1.7+** — Python security linter
- **pip-audit / safety** — dependency CVE
- **OSV-Scanner** — cross-ecosystem CVE
- **CycloneDX 1.6 / SPDX 2.3** — SBOM
- **SLSA Framework 1.0** — build provenance

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Tests that mock the ORM | Brittle; doesn't catch query / migration regressions | Use real DB via `@pytest.mark.django_db`; transactions rolled back per test |
| Hardcoded test data inline | Duplicated across tests; brittle | factory_boy `DjangoModelFactory` with traits |
| `time.sleep(...)` in async / Celery tests | Flaky | `freezegun.freeze_time(...)` for time; `CELERY_TASK_ALWAYS_EAGER = True` for tasks |
| `self.assertEqual(..., len(qs))` after DB write | Caches query — second eval is stale | Use `assert qs.count() == N` (forces fresh query) |
| Mocking `User.objects` instead of using factory | Reimplementing the ORM | `UserFactory.create_batch(3)` |
| Tests that read `settings.DEBUG` directly | Settings frozen at import; override needs `@override_settings` | `@override_settings(DEBUG=True)` decorator |
| Skipping `pytest.mark.django_db` for "fast" tests | Database access errors at runtime | Mark explicitly; use `transaction=False` for non-mutating tests |
| Sharing factory instances between tests via module-level | Order-dependent | Per-test factories OR `@pytest.fixture` with explicit scope |

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `python manage.py check` without `--deploy` | Skips production-only checks (SSL redirect, HSTS, etc.) | `python manage.py check --deploy --fail-level WARNING` in CI |
| Skipping migrations validation | Migration drift between branches → merge conflicts in prod | `python manage.py makemigrations --check --dry-run` |
| `pip install -r requirements.txt` without hashes | Reproducibility theatre | `pip install --require-hashes -r requirements.txt`; pin via `pip-compile --generate-hashes` |
| `requirements.txt` only (no `requirements-dev.txt`) | Test deps in prod image | Separate files; multi-stage Docker drops dev deps in final stage |
| `collectstatic` failure ignored | Missing assets in prod 404 | Run in CI; fail build on missing static files |
| Coverage threshold 50% | No safety net | 90% touched-file / 80% project |
| Floating Docker tag `python:latest` | CVE accumulation | `FROM python:3.12.7-slim-bookworm@sha256:...` |
| Suppressing `bandit` findings without expiry | Permanent exception | `# nosec` with expiry comment OR config file with `until` date |

## Verification Checklist

- [ ] `pytest-django` configured with `DJANGO_SETTINGS_MODULE=myapp.settings.test`
- [ ] factory_boy factories for every model used in tests
- [ ] DB tests marked `@pytest.mark.django_db`; transactions rolled back
- [ ] Time-dependent tests use `freezegun`
- [ ] External HTTP mocked via `responses` library
- [ ] Coverage ≥ 90% on touched files (per `extreme-lint-policy.md`)
- [ ] DRF API tests use `APIClient` with auth helpers
- [ ] Migrations tested: `pytest --create-db --migrations`
- [ ] No `time.sleep`; no order-dependence (run with `pytest --random-order`)
- [ ] Fixtures use `scope="session"` for read-only test data

- [ ] `python manage.py check --deploy` returns 0 warnings
- [ ] `python manage.py makemigrations --check --dry-run` clean
- [ ] `ruff check + ruff format --check` clean
- [ ] `mypy --strict` (or `pyright --strict`) clean
- [ ] `bandit -r .` no MEDIUM+ findings
- [ ] `pip-audit` / `safety check` no MODERATE+ CVEs
- [ ] Coverage ≥ 90% on touched files
- [ ] `collectstatic --noinput --dry-run` succeeds
- [ ] Docker image digest-pinned + multi-stage + non-root user
- [ ] SBOM (CycloneDX) generated + uploaded to artifact

## Cross-References

- `~/.claude/skills/django-patterns/SKILL.md` — code under test
- `~/.claude/skills/django-patterns/SKILL.md` — security testing
- `~/.claude/skills/django-testing/SKILL.md` — coverage + CI gates
- `~/.claude/skills/python-testing/SKILL.md` — pytest baseline
- `~/.claude/skills/tdd-workflow/SKILL.md` — RED-GREEN-REFACTOR
- `~/.claude/rules-library/common/testing.md` — coverage thresholds
- `~/.claude/rules-library/common/no-ambient-globals.md` — Clock / RNG injection
- `~/.claude/agents/tdd-guide.md` — test-first delegate

- `~/.claude/skills/django-patterns/SKILL.md`
- `~/.claude/skills/django-patterns/SKILL.md`
- `~/.claude/skills/django-testing/SKILL.md`
- `~/.claude/skills/python-testing/SKILL.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/common/license-allowlist-gate.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules/common/done-criteria.md`

## Why this skill exists

Django tests can become unusable through three predictable failures: mocking the ORM (tests pass,
queries break), Thread.sleep() for async work (flaky), and fixture re-creation per test (slow
suite). pytest-django + factory_boy + freezegun + session-scoped fixtures keep the suite fast AND
faithful to production. Django's `assertRedirects`, `assertTemplateUsed`, `mail.outbox` give
expressive integration assertions for free.

Django apps regress most often at the deploy boundary: `DEBUG = True` left on, missed migrations,
missing `collectstatic`, CVE-laden transitive dependency. Each is a documented Django check or
pip-audit invocation away from being caught. The verification pipeline mechanically gates all of
them so the Django app passes both the framework's own deployment checklist AND OWASP ASVS L2.
