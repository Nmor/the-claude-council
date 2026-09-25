# django-testing: Learning hooks

> Covers the continuous-learning signals to watch and refinement candidates for this skill.
> Pointed at by the SKILL.md routing row "Learning hooks".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- View tested by mocking ORM instead of using `pytest-django` + factory_boy (mock-heavy weakening)
- Fixture re-creating DB state from scratch when shared `@pytest.fixture(scope="session")` would
  suffice (test runtime balloon)
- Test calling external API directly (network in tests — `responses` / `vcr` weakening)
- Settings overridden ad-hoc with `@override_settings` instead of dedicated test settings module
- Test depending on database row count (order-dependent) instead of querying for specific shape
- `transactional_db` not used when test needs to span transactions (TransactionTestCase replacement
  gap)
- Coverage missing on signal handlers / management commands / Celery tasks
- E2E browser test using direct DB writes instead of going through API (test isolation weakening)

**Refinement candidates**:

- New factory_boy pattern when a new model relationship emerges
- New cross-reference when a sister skill (django-patterns, django-testing, tdd-workflow) adds a TDD
  gate
- New fixture template when a recurring test-setup pattern emerges
- Tightening of the coverage gate per touched-file when project-wide coverage drops

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `python manage.py check --deploy` warnings ignored (security misconfig — A05)
- Migrations folder missing for an app that has model changes (migration drift)
- Pre-deploy gate not running `makemigrations --check --dry-run` (silent schema divergence)
- `collectstatic` not run in deploy pipeline (broken static assets in prod)
- Settings.py changes without re-running deploy check
- Coverage gate not enforced in CI for changed Django files
- Bandit / safety not wired in pre-push (per
  `~/.claude/rules-library/common/dependency-vulnerabilities.md`)
- New management command added without corresponding test
- Async view added without verifying ASGI server is in use

**Refinement candidates**:

- New verification step when a new Django release ships (e.g., async ORM checks)
- New cross-reference when a sister rule (deploy-failures-become-checks, done-criteria) adds a
  Django gate
- Tightening of the deploy-check warnings list when a recurring misconfig emerges
- New row in the verification matrix when a new Django ecosystem tool becomes standard (e.g.,
  django-stubs strict mode)
