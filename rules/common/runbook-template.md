# Runbook Template Rule (Always-On, Global)

> Auto-fires on every file. Sister to `observability.md` (the
> signals runbooks act on), `docs-sync-with-code.md` (runbook
> kept in sync with code), `task-intake-due-diligence.md` Q26
> (operational handoff), `error-handling-with-context.md` (every
> error has a runbook entry referenced by `error_code`).

## Core Principle

**Every alert page, every observed failure mode, every
production-impacting class of bug has a corresponding runbook
entry that lets on-call resolve the incident WITHOUT reading
source code. The runbook is the operational interface to the
service; it lives at `docs/runbook.md` (or per-service
equivalent) and is updated in the SAME PR that introduces
the failure mode.**

## Required runbook structure

Every runbook entry follows this template:

```markdown
## <symptom-named entry id> — e.g., `auth_login_p99_latency_spike`

### What you'll see
- Alert: "[Service] login p99 > 2s sustained 5min"
- Pager: PagerDuty service: <name>
- Visible symptoms (user-side): login form spinner > 2s; users
  drop off

### Severity
P0 / P1 / P2 / P3 — with the SLO context (e.g., "P1: error
budget at 30% — burning fast").

### What's happening (background)
One paragraph naming the system shape + why this alert fires.
Reference the architecture doc OR the ADR if the architecture
is non-obvious.

### Diagnose
Ordered list of commands / dashboards / queries:
1. Open dashboard <URL>
2. Check metric `auth_login_duration_seconds{result="success"}`
3. Run `kubectl logs -n auth -l app=auth-service --tail=200`
4. Check upstream dep `db_connection_pool_used_count`

Each step has a specific signal that distinguishes the cause.

### Fix
Per-cause actions:
- **Cause A** (DB pool exhausted): scale connection pool;
  command: <exact command>; verification: <metric>
- **Cause B** (upstream provider down): flip the
  feature-flag kill-switch <name>; command: <exact command>;
  verification: <metric>
- **Cause C** (deploy regression): revert to last known good
  via `kubectl rollout undo deployment/auth -n auth`;
  verification: alert clears

### Verify recovery
Specific signals that confirm the incident is closed:
- `auth_login_duration_seconds{result="success"}` p99 < 500ms
  sustained 10min
- Error budget burn rate normalised

### Communicate
- Slack channel: #incident-comms
- Status page: <URL> — update once on diagnose, once on fix
- Internal post-mortem within 5 business days

### Related runbook entries
- <other-entry-id> — cross-reference
- <related-ADR> — architectural decision context
```

## Hard rules

### 1. Every alert has a runbook URL

Every PagerDuty service / Opsgenie team / etc. has the runbook
URL in the alert payload. On-call clicks the URL and lands at
the matching entry. No on-call should ever Google the alert.

### 2. Error codes link to runbook entries

Per `error-handling-with-context.md`, every `error_code` (e.g.,
`wrong_cell`, `wallet_insufficient_funds`) maps to a runbook
entry. The mapping lives in `docs/error-codes.md` (or
equivalent). The runbook entry explains what the code means +
how to recover when the user-facing path is failing.

### 3. Every new failure mode introduces a runbook entry in
the SAME PR

When a PR adds an alert, a new failure mode, or a new
error code, the runbook entry is part of the PR. Per
`docs-sync-with-code.md`, missing the runbook update is a
PR-blocker.

### 4. Diagnose steps name the SPECIFIC signal

Wrong:
```
- Check the dashboard
- Look at the logs
- See if anything looks weird
```

Right:
```
- Open https://grafana.example.com/d/auth-overview
- Check `auth_login_duration_seconds` (p99 panel, top-right)
- Run `aws logs tail /aws/lambda/auth-login --since 10m | jq 'select(.error_code)'`
- If `error_code` is `db_pool_exhausted` → see Cause A below
- If `error_code` is `upstream_timeout` → see Cause B below
- If neither → escalate to engineering on-call
```

Specificity is the point. On-call doesn't have time to "look
around."

### 5. Fix steps include verification

Every fix step ends with the signal that confirms it worked:

```
1. Run `kubectl scale deployment/auth-service --replicas=10 -n auth`
2. Wait for pods to be Ready: `kubectl rollout status deployment/auth-service -n auth`
3. Verify: `auth_login_duration_seconds` p99 drops below 500ms
   within 5 minutes
```

Without verification, on-call can't tell if the fix worked.

### 6. Runbook entries name their assumptions

If the fix depends on a config (e.g., "must have flag
`feature_x` enabled"), say so. If the fix requires elevated
permissions, say which. If the fix has a known side-effect
(e.g., "increases AWS bill by ~$200/h until you scale back"),
say so.

### 7. Runbook entries are versioned

Each entry carries a `Last verified: <YYYY-MM-DD>` footer. If
the entry is older than 6 months + the underlying system has
changed, the entry is re-validated before being trusted.

### 8. Runbook covers the canonical incident classes

Every service's runbook has entries for at minimum:

- Service down (health endpoint failing)
- Latency spike (p99 > SLO)
- Error rate spike (5xx > 1%)
- Throughput drop (RPS < 50% baseline)
- Saturation (CPU / memory / connection pool > 80%)
- Cold-start storm (Lambda / serverless)
- Throttle / rate-limit (Lambda concurrency / API Gateway / DDB)
- Stream consumer lag (Kinesis / SQS / Kafka iterator-age)
- Webhook delivery failures (signature, retry, DLQ)
- DB read/write failures (connection, RLS, deadlock)
- Cache failures (Redis / Memcached)
- External-provider outage (Stripe / Twilio / etc.)
- Deploy regression (post-deploy alert)

## Cross-references

- `observability.md` — the signals runbooks act on
- `error-handling-with-context.md` — `error_code` maps to
  runbook entries
- `docs-sync-with-code.md` — runbook updates ship in the same
  PR as the failure-mode-introducing code
- `task-intake-due-diligence.md` Q20 (docs footprint) + Q26
  (operational handoff)
- `deploy-failures-become-checks.md` — every deploy failure
  becomes both a pre-deploy check AND a runbook entry
- `done-criteria.md` — runbook update is part of every "done"
  claim that introduces a failure mode

## Why this rule exists

Without a runbook, every incident requires the principal
engineer to be reachable + to remember the system's shape.
Mean-time-to-resolution stretches into hours. The runbook
externalises the institutional knowledge so on-call (any
engineer, not just the original author) can resolve incidents
in minutes.

The cost of writing the runbook entry at PR time (15-30
minutes) is repaid the first time on-call uses it.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New PagerDuty / Opsgenie alert created without a runbook URL in the payload (rule 1 violation)
- `error_code` (per `error-codes.md`) added without a corresponding runbook entry (rule 2 weakening)
- "Diagnose" steps say "check the dashboard" / "look at the logs" without naming the specific metric / query (rule 4 violation)
- "Fix" step missing the verification signal that confirms recovery (rule 5 weakening)
- Runbook entry's `Last verified:` footer > 6 months old + system has changed (rule 7 weakening — stale entry)
- New service deployed without entries for the canonical incident classes (rule 8 weakening)
- Runbook diff in the SAME PR as the failure-mode introduction missing (sister rule `docs-sync-with-code.md` weakening)
- On-call escalates an incident the runbook should have resolved without escalation (entry quality gap)

**Refinement candidates**:
- New row in the canonical incident-classes table when a recurring class (e.g., DNS-resolution flap, cert-rotation race, vector DB index-rebuild) emerges
- Tightening of the "specific signal" requirement when on-call's queries reveal common ambiguity
- New cross-reference when a sister rule (observability, error-codes, deploy-failures-become-checks) adds a metric / code the runbook must consume
- New "communicate" template when a recurring incident class needs specific stakeholder routing
