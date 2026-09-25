---
name: django-patterns
description: Django + Django REST Framework implementation discipline — project layout, model design, DRF serializers/viewsets, service layer, caching, signals, middleware, query performance, AND the full Django security surface (SECURE_* settings, authentication, authorization, SQL-injection and XSS prevention, CSRF, file-upload hardening, API security, security headers, secret handling, security event logging). Use when writing or reviewing any Django models.py, views.py, serializers.py, urls.py, settings.py, middleware or migration.
paths:
  - "**/models.py"
  - "**/views.py"
  - "**/viewsets.py"
  - "**/serializers.py"
  - "**/urls.py"
  - "**/admin.py"
  - "**/apps.py"
  - "**/forms.py"
  - "**/permissions.py"
  - "**/tasks.py"
  - "**/middleware.py"
  - "**/settings.py"
  - "**/settings/*.py"
  - "**/manage.py"
  - "**/migrations/*.py"
---

# Django Development Patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> One source of truth per Django concept — one base
> `ModelSerializer` per shared shape, one custom permission
> class per access rule, one mixin per cross-cutting view
> behaviour, one signal handler per event. Sweep `apps/<app>/`
> for existing primitives before adding new ones. Extend via
> subclass / mixin / Meta inheritance — never fork a serializer
> or view into a parallel near-duplicate.

Production-grade Django architecture patterns for scalable, maintainable applications.

## When to Activate

- Building Django web applications
- Designing Django REST Framework APIs
- Working with Django ORM and models
- Setting up Django project structure
- Implementing caching, signals, middleware

## How this skill is organised (read this first)

This skill is two disciplines — Django architecture AND the full Django security
surface — and carrying both inline made every edit of a `models.py`, `views.py`,
`serializers.py` or `settings.py` pay their whole weight before any work began.
Context is a quality resource, not only a cost one: a window spent on the twelve
topics a change does not touch is attention taken from the two it does.

So the gates that apply to every Django change stay here — Purpose, Standards,
Anti-Patterns, the Verification Checklist and both quick-reference tables — and
each topic's full text, with every code example intact, lives in `references/`.
**Read the reference file for any topic the current change actually touches**;
the routing table below says which. That is one Read, not the whole skill.

| Topic | Reference | What it holds |
| --- | --- | --- |
| Project Structure | [`project-structure.md`](references/project-structure.md) | Recommended layout; split settings (`base` / `development` / `production`) + logging |
| Model design | [`model-design.md`](references/model-design.md) | Model best practices, `Meta` indexes + constraints, custom QuerySets, manager methods |
| DRF serializers + viewsets | [`drf-patterns.md`](references/drf-patterns.md) | Serializer patterns + validation, ViewSet configuration, custom actions |
| Service layer | [`service-layer.md`](references/service-layer.md) | Business logic out of views; `@transaction.atomic` order creation, payment processing |
| Caching | [`caching.md`](references/caching.md) | View-level, template-fragment, low-level, and QuerySet caching |
| Signals + middleware | [`signals-and-middleware.md`](references/signals-and-middleware.md) | `post_save` receivers, `AppConfig.ready()` wiring, custom request/response middleware |
| Query performance | [`performance.md`](references/performance.md) | N+1 prevention, `select_related` / `prefetch_related`, indexing, bulk operations |
| Core security settings | [`security-settings.md`](references/security-settings.md) | Security activation triggers; `SECURE_*`, cookie flags, `SECRET_KEY`, password validators |
| Authentication | [`authentication.md`](references/authentication.md) | Custom user model, `PASSWORD_HASHERS` (Argon2), session configuration |
| Authorization | [`authorization.md`](references/authorization.md) | `Meta.permissions`, view mixins, DRF permission classes, RBAC |
| SQL injection + XSS | [`injection-prevention.md`](references/injection-prevention.md) | ORM + parameterised `raw()`, template escaping, `mark_safe` discipline, XSS headers |
| CSRF + file uploads | [`csrf-and-uploads.md`](references/csrf-and-uploads.md) | CSRF cookies + token usage + `csrf_exempt`, upload validators, secure media storage |
| API security + headers | [`api-security.md`](references/api-security.md) | DRF throttling, API authentication classes, Content Security Policy middleware |
| Secrets + security logging | [`secrets-and-logging.md`](references/secrets-and-logging.md) | `django-environ` / python-decouple, `.env` discipline, `django.security` log config |
| Learning hooks | [`learning-hooks.md`](references/learning-hooks.md) | Signals to watch + refinement candidates (architecture and security) |

## Purpose

Principal-level Django architecture: app structure, settings split by environment, fat-model /
thin-view layering, ORM optimisation (`select_related` / `prefetch_related`), DRF view + serializer
patterns, middleware order, signals over inheritance, async views (Django 4+).

**Negative scope** (NOT what this skill covers):

- Django security configuration — see `django-patterns`
- Django test methodology — see `django-testing`
- Build / coverage / deployment gates — see `django-testing`
- Generic Python idioms — see `python-patterns`
- Generic Python testing — see `python-testing`

Principal-level Django security: SECRET_KEY rotation, auth (django.contrib.auth + django-allauth +
OAuth2), CSRF posture, SQL injection prevention via ORM, XSS prevention in templates, file-upload
safety, rate limiting (django-ratelimit), security headers, secrets management.

**Negative scope** (NOT what this skill covers):

- Django architecture / app structure — see `django-patterns`
- Test methodology (including security tests) — see `django-testing`
- Deployment / dependency CVE gates — see `django-testing`
- Cryptographic primitives at large — see `owasp-asvs`
- Frontend XSS / CSP — see `frontend-patterns`

## When NOT to use

- FastAPI / Starlette / Flask (different middleware + ASGI model)
- Pure REST API services (consider Django Ninja or FastAPI for less ORM coupling)
- High-throughput async event processors (Celery + FastAPI is leaner)

- Non-Django Python stacks (use FastAPI security patterns)
- Pure REST services (DRF token / OAuth — overlap but DRF-specific)

## Standards Cited

- **Django 5.1 Documentation** (`docs.djangoproject.com/en/5.1/`) — canonical reference
- **Django REST Framework 3.15** (`www.django-rest-framework.org/`) — DRF generic views, serializers
- **PEP 8 / PEP 257 / PEP 484 / PEP 695** — Python style + types
- **OWASP Top 10 2021** — A01-A10 mapping
- **OWASP ASVS 4.0.3 §1, §5, §13** — architecture + validation + API
- **Twelve-Factor App** — config via env, dependencies declared
- **RFC 7807 / RFC 9457 (Problem Details for HTTP APIs)** — DRF custom exception handlers
- **Two Scoops of Django 3.x (Greenfeld + Roy)** — community-canonical patterns

- **OWASP ASVS 4.0.3** — §2 (Auth), §3 (Session), §4 (Access), §5 (Validation), §7 (Errors), §13
  (API)
- **OWASP Top 10 2021** — A01-A10
- **Django Security Reference** (`docs.djangoproject.com/en/5.1/topics/security/`) — built-in
  protections
- **RFC 6749 (OAuth 2.0)** + **RFC 7519 (JWT)** + **RFC 8725 (JWT BCP)** + **OpenID Connect Core
  1.0**
- **NIST SP 800-63B** — password + MFA
- **OWASP CSRF Cheat Sheet** + **OWASP XSS Cheat Sheet**
- **CWE Top 25 (2026)** — CWE-79, CWE-89, CWE-287, CWE-352, CWE-862
- **django-allauth / django-axes / django-ratelimit** — community-canonical packages

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Business logic in views | Couples HTTP to domain; impossible to reuse from CLI / management command / Celery task | Service layer functions (or methods on model managers); views thin |
| Fat `Model.objects` chains in templates | N+1 queries on render | `select_related` for FK forward; `prefetch_related` for M2M / reverse FK |
| `Model.objects.filter(...).exists()` followed by `.get(...)` | Two queries; race window | Use `.first()` or `try/except DoesNotExist` |
| Inheriting from `models.Model` deep hierarchies | Multi-table inheritance generates JOINs on every query | Composition via OneToOne or `abstract = True` base |
| `signals` for cross-app side effects | Hidden coupling; hard to test | Explicit method calls in service functions; signals only for framework events |
| Settings without env split | Secrets in git; dev / prod drift | `settings/base.py` + `local.py` + `production.py`; secrets via env / `django-environ` |
| Custom middleware that doesn't call `get_response(request)` | Breaks chain silently | Always call `self.get_response(request)` and return its result |
| Sync DB calls in async view | Django warns + serialises through thread | `sync_to_async` wrapper OR fully async ORM (Django 5.1+ partial) |

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `SECRET_KEY` in `settings.py` | Source-code disclosure = session forgery | `os.environ["SECRET_KEY"]`; rotate via `django.core.signing.TimestampSigner` for in-flight sessions |
| `DEBUG = True` in prod | Stacktraces + settings leak | `DEBUG = False` + `ALLOWED_HOSTS`; checked in deploy gate |
| Raw SQL with string formatting | SQL injection | `Model.objects.raw("SELECT ... WHERE x = %s", [val])` parameterised; OR ORM |
| `safe` / `mark_safe` template filter on user input | XSS | Never `mark_safe(user_data)`; rely on Django's auto-escape |
| `csrf_exempt` on state-changing view | CSRF attack succeeds | Keep CSRF; for stateless API use DRF + token auth + `csrf_exempt` only on JSON endpoints validated by token |
| `User.objects.get(email=...)` without normalisation | Case-sensitive duplicate accounts | Custom UserManager with `email.lower()` + unique constraint |
| Storing password hashes via `make_password` without cost tuning | Default Argon2 OK; verify version + parallelism for hardware | Use latest `PASSWORD_HASHERS = ["django.contrib.auth.hashers.Argon2PasswordHasher"]` with reviewed cost |
| Direct file save from `request.FILES` | Path traversal + malicious file | Validate `FileExtensionValidator`, sanitise filename, use S3 + signed URLs |
| Sessions in DB without timeout | Session fixation | `SESSION_COOKIE_AGE` set; `SESSION_EXPIRE_AT_BROWSER_CLOSE = True` where applicable |

## Verification Checklist

- [ ] Views < 30 lines (business logic moved to services / managers)
- [ ] All FK / M2M accesses use `select_related` / `prefetch_related`
- [ ] Settings split per environment (`base`, `local`, `staging`, `production`)
- [ ] Secrets via env vars (django-environ); never in `settings.py`
- [ ] `DEBUG = False` in production with `ALLOWED_HOSTS` set
- [ ] CSRF middleware enabled (default); disabled only with documented stateless rationale
- [ ] Migrations atomic + reversible (per `schema-evolution.md`)
- [ ] Custom exception handler maps DRF exceptions to RFC 9457 envelope
- [ ] Async views use `sync_to_async` for ORM calls (Django 4-5.0) or native async ORM (5.1+)
- [ ] Logging configured with structured JSON output

- [ ] `SECRET_KEY` from env; rotation procedure documented
- [ ] `DEBUG = False` in production; verified in deploy gate
- [ ] CSRF middleware enabled (default); disabled only with documented rationale
- [ ] All queries use ORM or parameterised raw queries
- [ ] All templates rely on auto-escape; no `mark_safe(user_data)`
- [ ] Password hasher = Argon2 (django.contrib.auth.hashers.Argon2PasswordHasher)
- [ ] Rate limiting via `django-ratelimit` on auth + sensitive endpoints
- [ ] Security headers via `django.middleware.security.SecurityMiddleware` + CSP middleware
- [ ] HSTS preload-eligible: `SECURE_HSTS_SECONDS >= 31536000`, `SECURE_HSTS_PRELOAD = True`
- [ ] Dependency CVE scan green (`safety check` / `pip-audit`)
- [ ] django-axes installed for login throttling / lockout
- [ ] File uploads validated + stored on object store (S3) with signed URLs

## Quick Reference

| Pattern | Description |
|---------|-------------|
| Split settings | Separate dev/prod/test settings |
| Custom QuerySet | Reusable query methods |
| Service Layer | Business logic separation |
| ViewSet | REST API endpoints |
| Serializer validation | Request/response transformation |
| select_related | Foreign key optimization |
| prefetch_related | Many-to-many optimization |
| Cache first | Cache expensive operations |
| Signals | Event-driven actions |
| Middleware | Request/response processing |

Remember: Django provides many shortcuts, but for production applications, structure and
organization matter more than concise code. Build for maintainability.

## Quick Security Checklist

| Check | Description |
|-------|-------------|
| `DEBUG = False` | Never run with DEBUG in production |
| HTTPS only | Force SSL, secure cookies |
| Strong secrets | Use environment variables for SECRET_KEY |
| Password validation | Enable all password validators |
| CSRF protection | Enabled by default, don't disable |
| XSS prevention | Django auto-escapes, don't use `&#124;safe` with user input |
| SQL injection | Use ORM, never concatenate strings in queries |
| File uploads | Validate file type and size |
| Rate limiting | Throttle API endpoints |
| Security headers | CSP, X-Frame-Options, HSTS |
| Logging | Log security events |
| Updates | Keep Django and dependencies updated |

Remember: Security is a process, not a product. Regularly review and update your security practices.

## Cross-References

- `~/.claude/skills/django-patterns/SKILL.md` — auth + CSRF + SQL injection
- `~/.claude/skills/django-testing/SKILL.md` — pytest-django + factory_boy
- `~/.claude/skills/django-testing/SKILL.md` — migrations + coverage + deploy
- `~/.claude/skills/python-patterns/SKILL.md` — language idioms
- `~/.claude/skills/api-design/SKILL.md` — REST contract design
- `~/.claude/skills/observability-patterns/SKILL.md` — structured logs
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI patterns in Django
- `~/.claude/agents/python-reviewer.md` — Django code review delegate

- `~/.claude/skills/django-patterns/SKILL.md` — architecture context
- `~/.claude/skills/owasp-asvs/SKILL.md` — full control catalogue
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — privacy + consent
- `~/.claude/rules-library/common/secrets-management.md` — vault, not settings.py
- `~/.claude/rules-library/common/audit-logging.md` — security event log
- `~/.claude/rules-library/common/rate-limiting.md` — multi-layer rate limits
- `~/.claude/agents/security-reviewer.md` — Council Division 4
- `~/.claude/agents/compliance-reviewer.md` — Council Division 6

## Why this skill exists

Django's batteries-included approach makes prototypes fast but production-grade Django requires
explicit discipline: settings split, service layers, ORM optimisation, async-DB-call awareness,
env-driven config. The defaults are good for hello-world but break under load (N+1 queries,
settings.py with secrets, untested signals). The patterns above codify the production-ready posture
so Django apps survive load testing without rewriting the data access layer.

Django ships with sensible defaults (auto-escape, CSRF middleware, Argon2 hasher) — but the deploy
step is where security regresses: `DEBUG = True` left on in staging-promoted-to-prod, `SECRET_KEY`
checked into version control, `csrf_exempt` added "temporarily" and never removed, file-upload
validators skipped. The verification checklist gates each of these mechanically so Django apps pass
an OWASP ASVS L2 review on first audit.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`: the signals to
watch and the refinement candidates for this skill live in
[`references/learning-hooks.md`](references/learning-hooks.md). They are
instructions for maintaining THIS ARTIFACT rather than for doing the Django
task at hand, so they load when the skill itself is being refined.
