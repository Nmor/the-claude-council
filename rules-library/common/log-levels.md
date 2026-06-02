# Log Levels Rule (Always-On, Global)

> Auto-fires on every file. Sister to `observability.md` (the
> structured-logging foundation), `error-handling-with-context.md`
> (logs carry the wrapped chain), `no-silent-failures.md` (every
> failure has a log entry), `security.md` (no PII in logs).

## Core Principle

**Every log entry has a level that signals SEVERITY +
INTENDED ACTION. Levels are not subjective — they map to
operational decisions: alert? ticket? aggregate? ignore-but-
keep-for-audit?  Misusing levels destroys their utility:
everything is INFO means nothing is INFO; everything is ERROR
means alerts never fire.**

## Level definitions (canonical)

| Level | Operational meaning | When to emit | Production filter |
| --- | --- | --- | --- |
| **FATAL / CRITICAL** | Service is dying; process about to exit | Process panic; unrecoverable startup failure; corrupt-state detected | ALWAYS logged; ALWAYS pages |
| **ERROR** | Genuine handler failure; user request didn't complete | Caught exception that propagates out; failed external call after retries; constraint violated when invariant assumed | ALWAYS logged; aggregated to alert if rate > threshold (per `observability.md` SLO) |
| **WARN** | Recoverable failure OR audit-worthy event | Transient error followed by retry; RBAC denial; deprecated API used; format mismatch routed to typed result | ALWAYS logged; tracked for trends; alert if rate spikes |
| **INFO** | Non-failure lifecycle / audit signal | Service-started; user logged in; audit-action-committed; outbox-published | ALWAYS logged at INFO+; dashboarded |
| **DEBUG** | Diagnostic detail for incident review | Cache-hit / cache-miss; per-step state transitions; SQL query parameters (sanitised) | OFF in production by default; toggle per-request via header (with auth) or per-deploy via env var |
| **TRACE** | Very-fine-grained per-call detail | Function entry / exit; loop iteration; every hash computation | OFF except in active debugging sessions |

## Hard rules

### 1. ERROR is reserved for "an alert should fire"

If you wouldn't want an alert when this happens, it isn't an
ERROR.

- A 500 from a handler? ERROR.
- A failed retry that then succeeded? WARN.
- A request validation failure? WARN (the client did
  something wrong; not a server bug).
- An expected branch in a retry loop? DEBUG.

Per `observability.md` rule 4 — alerts fire on SLO breach,
which is driven by ERROR-level rate. Mis-using WARN as ERROR
makes the SLO unmeasurable.

### 2. WARN is for "we recovered, but document it"

WARN is the most-mis-used level. The rule:

- Did the operation eventually succeed (after retry, fallback,
  alternate path)? → WARN
- Did the operation fail, but we mapped it to a typed result
  the caller knows how to handle (e.g., `validation_failed`,
  `not_found`)? → WARN
- Is this an audit signal (RBAC denial, deprecated-API use,
  format mismatch)? → WARN

NOT WARN:

- A bug we're going to fix soon (just an ERROR)
- A typo in a config (this is a FATAL at startup; if it
  surfaces at runtime it's an ERROR)

### 3. INFO is for "a thing happened that's part of normal

operation"

INFO is the audit + lifecycle level:

- Service started / stopped
- User logged in / logged out
- Order placed / payment received
- Cron tick executed
- Outbox published / consumed

INFO is high-volume; aggregate via metrics for trends, but
keep individual entries for audit.

### 4. DEBUG is for incident review, not active monitoring

DEBUG is OFF in production by default. When an incident
happens, on-call has TWO recovery paths to enable DEBUG:

- **Per-request**: `?debug=1` header (with admin auth) emits
  DEBUG for that request
- **Per-deploy**: environment variable flips DEBUG on for a
  named log scope (e.g., `LOG_LEVEL_AUTH=debug`); rolled
  back after the incident

NEVER enable DEBUG globally in production for routine work —
it floods the log pipeline + costs $$$.

### 5. Every log line includes structured fields

Per `observability.md` rule 2 — every log line is JSON with
required fields (`timestamp`, `level`, `service`, `version`,
`environment`, `request_id`, `trace_id`, `span_id`,
`user_id?`, `organization_id?`, `error_code?`, `error?`).

No freeform `console.log("hi")` — banned by `no-discards.md`.

### 6. Library-specific level mapping

| Stack | Level names |
| --- | --- |
| **Node.js (pino, winston)** | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| **Go (slog, zerolog, zap)** | `Error`, `Warn`, `Info`, `Debug` (no Fatal in slog by default — use `log.Fatal` or panic) |
| **Python (logging)** | `CRITICAL`, `ERROR`, `WARNING`, `INFO`, `DEBUG`, `NOTSET` |
| **Java / Kotlin (SLF4J / Logback)** | `ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE` |
| **Ruby (Rails Logger)** | `FATAL`, `ERROR`, `WARN`, `INFO`, `DEBUG` |
| **Rust (tracing)** | `ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE` |
| **Swift (os.log, swift-log)** | `fault`, `error`, `info`, `debug` |
| **.NET (Microsoft.Extensions.Logging)** | `Critical`, `Error`, `Warning`, `Information`, `Debug`, `Trace` |

The mapping is consistent enough that cross-language logs in
the same pipeline aggregate cleanly. Configure the project's
logger to emit the canonical names (lowercase recommended)
regardless of library quirks.

### 7. Sampling at TRACE / DEBUG

When TRACE is enabled in production (rare; should be per-
request), apply sampling:

- 1% of requests get TRACE
- Targeted by request_id (sticky once chosen)
- Sampling rate increases on alert (e.g., 50% during an
  active incident on the affected service)

### 8. Log volume is a cost; budget it

Per `observability.md` + `task-intake-due-diligence.md` Q16
(cost) — log ingestion costs $5-15 per GB depending on
vendor. Common offenders:

- INFO logs on every line of a tight loop (use metrics
  instead)
- DEBUG enabled globally (gate per scope)
- Stack traces on every WARN (only on ERROR)
- Verbose third-party library logs (filter at the source)

The budget is per-service, monitored, alerted when exceeded.

### 9. Never log secrets / PII

Per `security.md` A09 + `secrets-management.md`:

- Banned at every level: passwords, tokens, API keys, JWTs,
  cookies, full credit-card numbers, SSNs, full email
  addresses, IP addresses (in EU/GDPR jurisdictions —
  truncate)
- The PostToolUse `no-discards` hook blocks edits introducing
  these patterns
- Library-level redaction (e.g., pino's `redact` paths) is
  configured at logger init

### 10. Level escalation on retry

A failure that retries successfully:

```text
attempt 1: WARN "transient failure; retrying" + error_code
attempt 2: WARN
attempt N (success): INFO "succeeded after retries" + attempts: N
attempt N (final failure): ERROR
```

This gives operations visibility into retry storms without
firing alerts on transient blips.

## Anti-patterns

### Anti-pattern 1: Everything is ERROR

Routine validation failures logged as ERROR fire alerts +
exhaust the team's attention. Alerts stop being trusted.

### Anti-pattern 2: Everything is INFO

A real ERROR (handler crash, data corruption) is hidden in
the noise. SLOs can't fire because the signal can't be
extracted.

### Anti-pattern 3: WARN dumping ground

"It's not really an error, but it's not nothing" → WARN.
Result: WARN volume drowns the trend signals. WARN should
be SPECIFIC (recovery / audit / deprecation).

### Anti-pattern 4: DEBUG always on in production

Storage / ingestion cost balloons. Real signal gets lost.

### Anti-pattern 5: Free-text log messages

`log.info("user did the thing successfully")` — useless for
search, aggregation, or alerting. Use structured fields:
`log.info("user.action.completed", { user_id, action,
duration_ms })`.

## Cross-references

- `observability.md` rule 6 — log levels carry SLO + cost
  implications
- `error-handling-with-context.md` — every log entry's shape
- `no-silent-failures.md` — every failure has a log entry
- `security.md` A09 — no PII in logs
- `secrets-management.md` — no secrets in logs
- `extreme-lint-policy.md` — `no-console` rule enforces
  structured logger usage
- `no-discards.md` — `console.log` in production source is
  hook-rejected

## Why this rule exists

Levels are the protocol between dev (who emits) and ops
(who consumes). Without a stable level discipline:

- Alerts fire on routine events (ops loses sleep, then mutes
  alerts)
- Real errors hide in INFO noise (the next incident takes
  hours to root-cause)
- Cost balloons because DEBUG is on (every WARN dumps a stack
  trace)

Stable levels = predictable cost + alert fidelity + on-call
sanity.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- ERROR fired without an alert routing to on-call (rule 1 weakening — "ERROR reserved for alerts")
- WARN volume growing > N/min on a service without trend signal (rule 2 dumping-ground anti-pattern)
- INFO used for genuine handler failure (rule 3 violation — real error hidden)
- DEBUG enabled globally in production without per-scope gating (rule 4 violation)
- TRACE-level sampling absent in incident response (rule 7 weakening)
- Log line lacks the required structured fields (rule 5 weakening — sister `error-handling-with-context.md`)
- PII / secrets present in log entries (rule 9 violation)
- Retry storm produces only ERROR (no escalation from WARN through INFO on eventual success) — rule 10 weakening
- `console.log` / `print` / freeform `slog` introduced in product code (rule 5 violation — sister `no-discards.md`)
- Log ingestion cost crosses per-service budget without action (rule 8 weakening)

**Refinement candidates**:

- New per-library mapping row when a new logger surfaces (e.g., new structured logger in a niche language)
- Tightening of the WARN-vs-ERROR boundary when a recurring "what level is this?" decision class emerges
- New PII-redaction entry when a new sensitive field shape recurs (e.g., new identifier format, new biometric)
- New cross-reference when a sister rule (observability, audit-logging, error-codes) consumes the level taxonomy
