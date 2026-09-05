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

```text
# BANNED
docker stop <noisy-container>   # "to free CPU for <service-under-pressure>"

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
# BANNED — guessed at the env-var name, hit "Access denied" at runtime
APP_PREFIX_MAIN_DB_HOST: db-host         # wrong: prefix shouldn't be there
APP_PREFIX_MAIN_DB_PASSWORD: ${DB_PASS}

# REQUIRED — read the source / docs FIRST
# The framework's config loader documents which env-var prefix it
# strips. Use the canonical name the loader expects, not a guess.
MAIN_DB_HOST: db-host
MAIN_DB_PASSWORD: ${DB_PASS:?}
```

Per `official-docs-first.md`, primary-source citations come BEFORE
the first edit. Three failed attempts is not iteration — it's three
violations of the same rule.

### 4. Storing secret values without validating expected format

```bash
# BANNED — vault stored a bare hex token; consumer expects a
# `<scope>:<environment>.<secret>` shape and crashes at startup
SERVICE_TOKEN=<bare-hex>              # missing `<scope>:<env>.` prefix

# REQUIRED — validate at push time
vault set "SERVICE_TOKEN=<scope>:<env>.${hex}" ...
```

Every secret stored in a vault has an expected format. The
push-step MUST run a format-validation function before the secret
lands. Repos must carry a `secrets-format.json` (or equivalent)
that declares the regex for every key.

### 5. Rotating a credential non-atomically

```text
# BANNED sequence:
# 1. Generated new DB password in memory
# 2. Pushed to vault
# 3. ALTER USER inside running DB
# 4. Attempted to recreate all consumers via runner →
#    Vault's own connection to the DB broke (it cached the OLD
#    password in its in-memory pool) → cascading recovery loop

# REQUIRED sequence:
# 1. Pre-flight: list every container with the old credential
# 2. Push new value to the vault
# 3. SHORT-CIRCUIT: write new value to a `.env.rotate` file
# 4. ALTER USER inside DB
# 5. Recreate the vault container FIRST so it has new creds for
#    the runner
# 6. Wait for vault health
# 7. Recreate every consumer via runner
# 8. Verify each consumer connected with new creds
# 9. Scrub `.env.rotate`
```

Rotation must be a single atomic operation script. The script lives
at `scripts/rotate-secret.sh <KEY>` in every project.

### 6. Suppressing a startup error by removing the offending feature

```yaml
# BANNED
# Service crashed on a malformed config value → "just remove that
# feature from the config so the service starts"

# REQUIRED
# 1. Read why the value is malformed
# 2. Fix the value at source (vault / config file)
# 3. Keep the feature so onboarding / downstream paths still work
```

"Remove the offending feature" is the same shape as "swallow the
error". Don't do either.

### 7. Half-completing a migration and walking away

```text
# BANNED: "service-a is up, service-b is failing — I'll come back
# to it". Walking away leaves the deployment broken-by-design.

# REQUIRED: a migration finishes or doesn't ship. If it can't
# finish in this session, every consumer of the half-state is
# documented + the partial deployment is reverted, not left running.
```

## The proper-fix audit (mandatory before reporting completion)

Every "done" claim must be paired with a self-audit answering ALL
of the following. The audit goes in the verification block — see
`done-criteria.md` and `no-overclaim.md`.

```text
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
  [ ] Code-graph integrity green this turn (per
      `code-graph-validation.md`): every dangling reference
      uncovered was resolved (wired, defined, or removed with
      user confirmation); no `BUG(unwired-<slug>)` markers left
      behind without explicit user awareness.
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
- `code-graph-validation.md` — a code-graph gap discovered
  mid-task gets a root-cause fix (wire it, define it, or
  delete it with user confirmation), never a `// TODO: wire
  later` marker.
- `official-docs-first.md` — primary-source citations BEFORE
  edits, not after failures.
- `deploy-failures-become-checks.md` — every failure mode
  observed becomes a mechanical pre-deploy check.

## Why this rule exists

Recurring incident classes that all share the same root pattern
("ship the symptom-fix, leave the cause"):

1. **Resource starvation under load** — a noisy container is
   killed instead of CPU/memory-limited, so the next time it boots
   it starves a different neighbour.
2. **Healthcheck drift** — bumped from 15s/5s to 30s/25s "because
   it kept failing", hiding the actual event-loop block.
3. **Config-by-guesswork** — env-var names guessed from the
   library README instead of the loader's source, producing
   repeated runtime failures of the same shape.
4. **Format-blind secret pushes** — bare hex tokens stored in a
   vault when the consumer requires a prefixed shape, surfacing
   only as a startup stack trace.
5. **Non-atomic credential rotation** — DB password rotated
   step-by-step instead of via a single atomic script, breaking
   the vault's own DB connection mid-flight.
6. **"Just remove the offending feature"** — silencing a startup
   error by dropping the config block that triggered it, instead
   of fixing the value the feature required.
7. **Half-finished migrations** — one of two paired services up,
   the other broken-by-design, with a verbal promise to "come
   back to it".

In every case the workaround cost MORE total time than the proper
fix would have: the workaround needed a follow-up, the follow-up
revealed a related issue, the related issue surfaced when the
team was rotating personnel, and so on. The proper-fix path is
cheaper in absolute hours even when it feels slower in the
moment.

User directive (verbatim): **"clean, extensive and proper fixes
always"** / **"nothing simple please"**.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Container `docker stop`-ed to "free resources" rather than CPU/memory-limited (banned pattern 1 recurrence)
- Healthcheck `timeout` / `retries` / `start_period` bumped without naming an underlying slow code path (banned pattern 2 recurrence)
- Config env-var name guessed from a README instead of canonical loader source (banned pattern 3 — `official-docs-first.md` weakening)
- Secret pushed to vault without format-validation against the consumer's expected shape (banned pattern 4 recurrence)
- Credential rotation done step-by-step rather than via an atomic script (banned pattern 5 recurrence)
- Startup error silenced by removing the offending config / feature instead of fixing the value (banned pattern 6 recurrence)
- Migration half-completed and left running; consumer of half-state undocumented (banned pattern 7 recurrence)
- Proper-fix audit rows ticked without verification this turn (audit weakening)
- "I'll come back to it next session" markers introduced (any TODO-shape silent defer)
- Time-pressure context used as justification to skip the audit (rule 8 "I'm being rushed" failure mode)

**Refinement candidates**:

- New row in the banned-pattern list when a new shortcut class recurs (e.g., `kubectl delete pod` to recover, `restart-loop` to mask leak, dependency downgrade to escape a bug)
- Tightening of the proper-fix audit when a row consistently gets ticked without real verification
- New cross-reference when a sister rule (no-silent-failures, no-overclaim, deploy-failures-become-checks) provides the underlying gate the shortcut bypassed
- New "atomic rotation" template when a new credential class (signing key, OAuth client, vault token) recurs

---

<!-- ============================================================
     Section: no-silent-drops.md (from rules/common/)
     ============================================================ -->
