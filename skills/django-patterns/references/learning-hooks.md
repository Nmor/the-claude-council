# Django - Learning Hooks

> Covers the continuous-learning signals to watch and refinement candidates for
> this skill (architecture and security). Pointed at by the **Learning hooks**
> row of the `SKILL.md` routing table.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- ORM N+1 pattern (query in template / loop) — `select_related` / `prefetch_related` weakening
- Fat view: business logic in view handler instead of service / model method (skinny-views
  weakening)
- Signal handler doing heavy lifting (move to Celery task or service layer)
- DRF serializer reading model instance with all fields when only a few are needed (over-fetch)
- `get_or_create` race condition (no unique constraint to back it up)
- Generic CBV used when explicit FBV would be clearer / more testable
- New app added without migrations / admin / tests scaffolding
- Settings.py with environment-specific values hardcoded (per
  `~/.claude/rules-library/common/no-ambient-globals.md`)
- Mixed sync/async views (calling sync ORM from async view causes thread-pool exhaustion)

**Refinement candidates**:

- New pattern row when a Django version ships new built-ins (e.g., async ORM, GeneratedField)
- New cross-reference when a sister skill (django-patterns, django-testing, jpa-patterns,
  postgres-patterns) adds a related pattern
- Tightening of the skinny-views rule when fat-view recurrence is observed
- New caching template when a new cache layer (Redis / per-view / per-fragment) becomes appropriate

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- View without `@login_required` / `LoginRequiredMixin` (broken access control — A01)
- Raw SQL via `cursor.execute` with string interpolation (SQL injection — A03)
- `mark_safe` / `|safe` on user-controlled HTML (XSS — A03)
- `CSRF_COOKIE_SECURE = False` or `SESSION_COOKIE_SECURE = False` in prod settings
- `DEBUG = True` reaching production (info disclosure)
- `SECRET_KEY` hardcoded in settings (Sonar S2068)
- `ALLOWED_HOSTS = ['*']` in production
- File upload via `FileField` without size + content-type validation
- Authentication endpoint without `django-ratelimit` / equivalent (A07)
- `urlopen` / `requests.get` on user-controlled URL without allowlist (SSRF — A10)
- Custom auth backend that doesn't extend Django's password hashers (weak crypto — A02)

**Refinement candidates**:

- New OWASP A01-A10 row when a recurring Django anti-pattern emerges
- New cross-reference when a sister skill (security-review, owasp-asvs, gdpr-ccpa-compliance) adds a
  Django-specific gate
- New `django-csp` / security middleware row when a new Django security library ships
- Tightening of the settings.py hardening checklist when a new vulnerability class surfaces
