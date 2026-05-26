# Proper-Fixes-First Rule (Strict, Always-On, Global)

> Auto-fires on every file. Sister to `done-criteria.md`,
> `no-overclaim.md`, `no-silent-failures.md`, `official-docs-first.md`,
> and `deploy-failures-become-checks.md`. This is one of the strictest
> rules in the global set: the user has named it explicitly with
> "nothing simple please" and "clean, extensive and proper fixes
> always". Every shortcut taken is a rule violation, even when the
> user is waiting for output.

## Core Principle

**Every fix must address the root cause. Never apply a shortcut that
hides the symptom while the cause remains.**

Workarounds are appropriate ONLY when (1) the root cause has already
been identified, AND (2) the workaround is the documented-temporary
bridge to the proper fix, AND (3) a follow-up to land the proper
fix exists and is named in the verification block. Anything else is
a rule violation.

## Banned shortcut patterns (each is a HARD violation)

### 1. Killing a healthy service to free resources

```
# BANNED
docker stop unvamp-nominatim   # "to free CPU for Infisical"

# REQUIRED
# 1. Diagnose: which container is event-loop-blocking which?
# 2. Fix: add `cpus: "1.0"` and `mem_limit: "1g"` to the noisy
#    neighbour, OR raise Docker Desktop allocation, OR move the
#    noisy workload off the dev box entirely.
# 3. Document the limit choice + the math (peak heap × workers).
```

If a service is genuinely abandoned, `docker compose down <svc>` +
remove from compose, not `docker stop`. A `stop` leaves the service
state inconsistent and the next compose up brings it back.

### 2. Loosening a healthcheck to mask a slow code path

```yaml
# BANNED — hides event-loop blocks
healthcheck:
  interval: 30s    # was 15s
  timeout: 25s     # was 5s
  retries: 12      # was 8
  start_period: 120s   # was 60s
```

A healthcheck represents "service can do useful work in N seconds".
Bumping the timeout doesn't fix the work being slow — it teaches the
orchestrator to wait longer for slow work. The root-cause questions
are:

- What's the p99 event-loop block?
- What's the underlying I/O pattern (Docker Desktop fsync? noisy
  neighbour? connection-pool exhaustion?)?
- Can the work be offloaded to a worker / background queue / cron?

Healthcheck tuning is appropriate ONLY after the underlying cause is
documented and the tuning is a measured trade-off, not a panic
response.

### 3. Editing config without reading the canonical docs first

```ruby
# BANNED — guessed at the env var name, hit "Access denied" at runtime
POSTAL_MAIN_DB_HOST: postal-mariadb        # wrong: no POSTAL_ prefix
POSTAL_MAIN_DB_PASSWORD: ${POSTAL_MARIADB_PASSWORD}

# REQUIRED — read the source / docs FIRST
# https://postalserver.io/config-v2 + Postal source uses Konfig.
# Konfig's Environment source: `[:main_db, :host]` → MAIN_DB_HOST,
# NOT POSTAL_MAIN_DB_HOST. The `:postal` group prefix is reserved
# for postal-namespace keys, not a global prefix.
MAIN_DB_HOST: postal-mariadb
MAIN_DB_PASSWORD: ${POSTAL_MARIADB_PASSWORD:?}
```

Per `official-docs-first.md`, primary-source citations come BEFORE
the first edit. Three failed attempts is not iteration — it's three
violations of the same rule.

### 4. Storing secret values without validating expected format

```bash
# BANNED — Infisical stored a bare hex token, Unleash expects
# `<project>:<environment>.<secret>` and crashed at startup
UNLEASH_ADMIN_TOKEN=895b3a27...      # missing `*:*.` prefix
UNLEASH_FRONTEND_TOKEN=54e4b3df...   # missing `default:development.` prefix
UNLEASH_CLIENT_TOKEN=8302639d...     # missing `default:development.` prefix

# REQUIRED — validate at push time
infisical secrets set "UNLEASH_ADMIN_TOKEN=*:*.${hex}" ...
```

Every secret stored in a vault has an expected format. The
push-step MUST run a format-validation function before the secret
lands. Repos must carry a `secrets-format.json` (or equivalent)
that declares the regex for every key.

### 5. Rotating a credential non-atomically

```
# BANNED sequence (this session, May 25):
# 1. Generated new POSTGRES_PASSWORD in memory
# 2. Pushed to Infisical
# 3. ALTER USER inside running postgres
# 4. Attempted to recreate all consumers via runner →
#    Infisical's connection to postgres broke (it had OLD password
#    in its in-memory pool) → cascading recovery loop

# REQUIRED sequence:
# 1. Pre-flight: list every container with the old credential
# 2. Push new value to Infisical
# 3. SHORT-CIRCUIT: write new value to a `.env.rotate` file
# 4. ALTER USER inside DB
# 5. Recreate Infisical FIRST (so it has new creds for the runner)
# 6. Wait for Infisical health
# 7. Recreate every consumer via runner
# 8. Verify each consumer connected with new creds
# 9. Scrub `.env.rotate`
```

Rotation must be a single atomic operation script. The script lives
at `scripts/rotate-secret.sh <KEY>` in every project.

### 6. Suppressing a startup error by removing the offending feature

```yaml
# BANNED
# Unleash crashed on INIT_ADMIN_API_TOKENS format → "just remove it"

# REQUIRED
# 1. Read why the value is malformed
# 2. Fix the value at source (Infisical)
# 3. Keep the seeded-token feature so dev onboarding still works
```

"Remove the offending feature" is the same shape as "swallow the
error". Don't do either.

### 7. Half-completing a migration and walking away

```
# BANNED: "postal-web is up, postal-worker is failing — I'll come
# back to it". Walking away leaves the deployment broken-by-design.

# REQUIRED: a migration finishes or doesn't ship. If it can't
# finish in this session, every consumer of the half-state is
# documented + the partial deployment is reverted, not left running.
```

## The proper-fix audit (mandatory before reporting completion)

Every "done" claim must be paired with a self-audit answering ALL
of the following. The audit goes in the verification block — see
`done-criteria.md` and `no-overclaim.md`.

```
Proper-fix audit (this turn):
  [ ] Every observed failure has a documented root cause.
  [ ] No service was killed to free resources for another.
  [ ] No healthcheck was loosened to hide slow code paths.
  [ ] Every external-provider integration cites primary-source docs.
  [ ] Every secret value was format-validated before push.
  [ ] Every credential rotation was an atomic script.
  [ ] No migration was left in a half-state.
  [ ] No "we'll fix it next session" / "TODO: do this properly"
      markers were introduced.
```

A `[ ]` in any row blocks the "done" claim. Resolve each row by
either landing the proper fix THIS turn or reverting the
half-finished change.

## The "I'm being rushed" failure mode

When the user is actively waiting (password reset stuck, page won't
load, etc.), the temptation is to ship the fastest possible patch.
That's the worst time to skip the audit. The user named this
explicitly: "nothing simple please".

In time-pressure situations:

1. Acknowledge the time pressure verbally ("doing the proper fix,
   ETA ~5min" rather than silent fast-patching).
2. Run the audit IN PARALLEL with the fix, not after.
3. If the proper fix genuinely can't ship within the user's
   patience window, ship the workaround AND open a tracked
   follow-up in the same turn (NEVER "I'll do this later").

The follow-up is a code change in the same PR, not a verbal
promise. A verbal promise costs zero accountability and rots
silently.

## Cross-references

- `done-criteria.md` — every "done" runs the proper-fix audit.
- `no-overclaim.md` — never claim "done" without the audit.
- `no-silent-failures.md` — workarounds that hide errors are
  silent failures.
- `no-silent-drops.md` — half-finished work that's marked "done"
  is a silent drop.
- `official-docs-first.md` — primary-source citations BEFORE
  edits, not after failures.
- `deploy-failures-become-checks.md` — every failure mode
  observed becomes a mechanical pre-deploy check.

## Why this rule exists

Session 2026-05-25 hit five workaround patterns in a single sweep,
each masking a real root cause:

1. Killed `unvamp-nominatim` (CPU-hungry) to free resources for
   Infisical password-reset.
2. Bumped Infisical healthcheck 15s/5s → 30s/25s.
3. Migrated Postal v1 → v2 in three iterations because env-var
   names were guessed, not researched.
4. Stored Unleash tokens in Infisical without the
   `<project>:<environment>.` prefix, only catching the format at
   runtime through a stack trace.
5. Rotated POSTGRES_PASSWORD non-atomically, breaking Infisical's
   own DB connection mid-rotation and triggering a recovery
   cascade.

Each one cost more time to fix than doing it right would have. The
user's directive captures the pattern: **clean, extensive and
proper fixes always**.
