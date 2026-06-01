# Feature Flags Rule (Always-On, Global)

> Auto-fires on every file. Sister to `deprecation-lifecycle.md`
> (sister rollout pattern), `circuit-breaker.md` (kill switches),
> `observability.md` (flag metrics), `audit-logging.md` (flag changes
> are audited events), `task-intake-due-diligence.md` Q17 (rollback).
> Vendors: **Unleash** (OSS), **Flagsmith** (OSS), **OpenFeature**
> (CNCF spec), **GrowthBook** (OSS), **LaunchDarkly** (SaaS),
> **Statsig** (SaaS), **Optimizely** (SaaS).

## Core Principle

**Every code path whose behaviour might need to be changed without a
deploy — A/B experiments, gradual rollouts, kill switches, per-tenant
overrides, time-bombed migrations — sits behind a feature flag. The
flag's lifecycle is explicit: created, rolled out, observed, decided
on, and REMOVED. Flags that outlive their decision become technical
debt.**

A feature flag IS code that has not yet been deleted. The cost of a
flag is the test combinatorics it adds (every flag doubles the
state space), the cognitive load on readers, and the runtime cost
of the lookup. The benefit is decoupling release (the binary is
in production) from launch (users see the new behaviour).

## Flag categories

Different flag types have different lifecycles and risk profiles:

| Category | Lifecycle | Max age |
| --- | --- | --- |
| **Release toggle** | Hide in-progress features until ready; on for staging, off for prod | Days–weeks; removed at launch |
| **Experiment** | A/B/n test variants for a metric | Weeks; removed when stat-sig + decision |
| **Ops toggle / kill switch** | Disable a feature in incident response | Permanent (the flag stays, the value flips) |
| **Permission toggle** | Per-tenant / per-user feature gating | Permanent (lives with the entitlement system) |
| **Migration toggle** | Route reads to old vs new system during cutover | Weeks; removed when migration complete |

Mixing categories in the same flag is the leading cause of "we
can't remove this flag" debt. One flag, one purpose.

## Hard rules

### 1. Every flag has a documented owner + expiry

When the flag is created, the system records:

- **Name** — kebab-case, descriptive (`marketplace-checkout-v2`,
  NOT `flag1` or `temp`)
- **Owner** — a team or named engineer
- **Category** — release / experiment / ops / permission / migration
- **Created date**
- **Expiry date** — when the flag MUST be reviewed
- **Decision criteria** — what observation would flip / remove the
  flag (metrics + thresholds)
- **Removal task** — link to the ticket / TODO that will remove the
  flag

A flag without an owner + expiry is rejected at creation time
(linter / CI check on the flag registry).

### 2. Default-off, opt-in for rollouts

New behaviour defaults to OFF. Users opt IN by:

- **Internal cohort first** — staff accounts (`@yourcompany.com`)
- **Beta cohort** — opted-in users
- **Canary tenants** — small subset of paying customers
- **Percentage rollout** — 1% → 5% → 25% → 50% → 100% with
  observation between steps
- **Geographic rollout** — region-by-region for high-risk changes

The default-off rule is REVERSED for security or compliance fixes
— those default ON, with an opt-out flag for known-broken integrations.

### 3. Flags are evaluated at the boundary, not in the deep stack

```typescript
// WRONG — flag check buried in the data layer
async function getOrders(userId: string) {
  if (await flags.isEnabled('orders-v2', userId)) {
    return ordersV2.query(userId);
  }
  return ordersV1.query(userId);
}

// RIGHT — flag check at the handler / route, dispatching to
// implementation
async function handleGetOrders(req, res) {
  const useV2 = await flags.isEnabled('orders-v2', req.user.id);
  const orders = useV2
    ? await ordersV2Handler(req)
    : await ordersV1Handler(req);
  res.json(orders);
}
```

Boundary evaluation makes the diff between code paths visible at
the entry point and avoids scattering flag checks across the
codebase.

### 4. Flags carry context, not just boolean state

The flag SDK accepts an evaluation CONTEXT (user id, tenant id,
plan tier, country, device, app version) and returns either:

- A boolean (for simple toggles)
- A variant (for experiments — `control` / `variant_a` / `variant_b`)
- A typed config payload (for parameterised features — limits,
  thresholds, copy variants)

Context-driven evaluation lets one flag serve role-based access
("PRO tier only"), gradual rollouts ("10% of EU users"), and kill
switches simultaneously without coding each combination separately.

### 5. Server-side evaluation by default

Client-side flag evaluation (web / mobile) leaks the entire flag
state to anyone with browser devtools — including flags for
unreleased features. Defaults:

- **Server-side**: evaluate on the backend, send only the resolved
  values to the client (this user, right now)
- **Client-side**: only for non-sensitive UI flags (color scheme,
  experimental layout) where leakage is acceptable

For high-security features (payment flow changes, auth changes,
admin-only views), NEVER use client-side flags.

### 6. Flag SDK is fault-tolerant

The flag evaluation MUST not fail open or fail closed without
explicit configuration. Required:

- **Timeout** — flag evaluation < 100ms; fall back to default on
  timeout
- **Default value** — every flag check has an explicit fallback if
  the SDK is unreachable
- **Local cache** — flag values cached at process start +
  refreshed every 30-60 seconds
- **Circuit breaker** — if the flag service is down, the cached
  values persist; new flags evaluate to defaults

The Octopus principle: when in doubt, the safe behaviour wins.
Defaults are chosen so a flag service outage doesn't break the
product.

### 7. Flag changes are audit-logged

Per `audit-logging.md` — every flag change emits an event:

```json
{
  "event": "feature_flag.changed",
  "flag": "marketplace-checkout-v2",
  "actor": "alice@example.com",
  "before": { "enabled": false, "rollout": 0 },
  "after": { "enabled": true, "rollout": 5 },
  "reason": "Begin canary rollout per launch plan",
  "timestamp": "2026-05-26T14:32:18Z"
}
```

Changes by automation (auto-rollback on error spike) carry the
script id as the actor.

### 8. Kill switches are pre-built, not improvised

For every external dependency (per `circuit-breaker.md`) AND every
risky internal feature, a kill switch flag exists from day one:

- `kill_switch_stripe_payments` — disables payment routing
- `kill_switch_marketplace` — disables the marketplace feature
- `kill_switch_ai_suggestions` — disables AI-generated suggestions

The runbook (per `runbook-template.md`) names which switch to flip
for which incident class. When the kill switch fires, the user
sees explicit "feature unavailable" UX — not a silent failure
(per `no-silent-failures.md`).

### 9. Experiments have a stop rule and a decision deadline

A/B experiments cannot run forever. Required up-front:

- **Sample size** — pre-computed for the target effect size +
  significance level (typically α = 0.05, power = 0.80)
- **Stop rule** — minimum days OR minimum sample (whichever later)
  to avoid peeking bias
- **Decision deadline** — when the experiment ends regardless of
  result; either ship the winner or kill the variant
- **Guardrail metrics** — secondary metrics that must NOT regress
  (latency, error rate, retention) — experiment auto-pauses if
  guardrails breach

Inconclusive experiments at deadline are killed (default = revert
to control), not extended indefinitely.

### 10. Flag cleanup is part of the launch checklist

When an experiment / release flag reaches 100% and stays there for
the bake period (typically 14 days), it MUST be removed:

1. The losing code path is deleted
2. The flag check is removed; the new code becomes unconditional
3. The flag entry is removed from the flag service
4. Tests covering the flag's old behaviour are deleted

The cleanup is a separate PR with its own review. It's tracked in
the launch retrospective; if cleanup hasn't happened by D+30, the
on-call rotation gets the chore.

## Anti-patterns

### Anti-pattern 1: Flag spaghetti

Multiple nested flag checks for related behaviour:

```typescript
if (await flags.isEnabled('new-checkout', user)) {
  if (await flags.isEnabled('new-checkout-stripe', user)) {
    if (await flags.isEnabled('new-checkout-stripe-3ds', user)) {
      // ...
    }
  }
}
```

This is exponential complexity. Either consolidate (one flag with
typed payload selecting variant) OR finish + remove the dependent
flags before adding the next layer.

### Anti-pattern 2: "Just leave the flag in case"

A flag at 100% rollout for 6+ months is dead code wrapped in an
`if (true)`. Remove it. If you need a kill switch, that's a
different (named, owned, documented) flag.

### Anti-pattern 3: Flag-as-config

Flags are not the config system. Static configuration (cache TTL,
log level, batch size) belongs in environment variables or a
config service. Flags are for behaviour that changes during the
process lifetime without redeploy.

### Anti-pattern 4: Flag-coupling tests

A test that runs only when a specific flag is on is a flaky test
in production. Either:

- Test both branches explicitly with the flag mocked
- Move the flag-specific assertion to an integration test that
  controls the flag state

Never assume the prod flag state in tests.

### Anti-pattern 5: Per-flag service-down behaviour

When the flag SDK is unreachable, the answer for EVERY flag should
be deterministic + safe. Not "this flag fails open, that flag
fails closed." Set defaults explicitly at the call site.

## Per-language SDKs

| Language | Library | OpenFeature compliance |
| --- | --- | --- |
| Node.js / TypeScript | `@openfeature/server-sdk` + provider | Yes |
| Browser | `@openfeature/web-sdk` | Yes |
| Go | `github.com/open-feature/go-sdk` | Yes |
| Java | `dev.openfeature.sdk` | Yes |
| Python | `openfeature-sdk` | Yes |
| Ruby | `openfeature-sdk` | Yes |
| Swift / Kotlin | `openfeature-swift` / `openfeature-kotlin` | Yes |
| .NET | `OpenFeature` | Yes |

**OpenFeature** (CNCF) is the standard interface — pick a provider
(Unleash, Flagsmith, GrowthBook, LaunchDarkly) and the call sites
stay portable.

## Flag registry shape

The flag service (or a flag registry file in IaC) carries:

```yaml
flags:
  marketplace-checkout-v2:
    owner: payments-team
    category: release
    created: 2026-05-01
    expiry: 2026-08-01
    decision_criteria:
      - "conversion_rate_v2 >= conversion_rate_v1"
      - "checkout_latency_p99_v2 <= checkout_latency_p99_v1 + 100ms"
      - "guardrail_metrics: error_rate, refund_rate"
    rollout:
      default: false
      rules:
        - segment: internal_staff
          enabled: true
        - segment: beta_users
          enabled: true
        - segment: paid_tier
          enabled: true
          percentage: 5
    removal_task: PAYMENTS-1234
```

## Cross-references

- `deprecation-lifecycle.md` — sister rollout pattern; deprecations
  use the same gradual cohort approach
- `circuit-breaker.md` — kill switches integrate with circuit
  breakers for external deps
- `observability.md` — flag exposure events emitted as metrics +
  events; `feature_flag_exposure{flag, variant}` counter
- `audit-logging.md` — flag changes are audited events
- `task-intake-due-diligence.md` Q17 (rollback) — every non-trivial
  feature has a flag-based rollback
- `no-silent-failures.md` — flag-disabled state is communicated to
  the user explicitly, never silently
- `task-intake-due-diligence.md` Q22 (success criteria) — flag
  decision_criteria mirror the launch success criteria

## Standards cited

- **OpenFeature specification** (CNCF) — vendor-neutral flag API
- **Statistical hypothesis testing** for experiments — common
  practice: α = 0.05, power = 0.80
- **CAP-aware fallback** — flag SDK failure modes documented per
  the resilient-software best practices

## Why this rule exists

Feature flags solve a real problem: shipping risky changes safely
without a release-engineering bottleneck. The cost is
combinatorial state space + cognitive overhead + dead flags that
nobody dares to remove. The user-facing impact when flags rot:

- Experiments running for years past their decision deadline,
  polluting analytics
- Kill switches that are themselves broken (nobody tested the
  off-path in months)
- Tenant-permission flags overlapping with the entitlements
  system, with neither team owning the conflict
- Customer-reported bugs that depend on flag combinations the
  team didn't know were possible

The fix is mechanical: every flag has an owner, an expiry, a
decision criteria, and a removal task. Treat flags like FIFO —
first in, first out.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Flag created without owner / expiry / decision criteria (rule 1 weakening)
- Flag at 100% rollout for > 14 days without cleanup PR (rule 10 weakening — flag spaghetti accumulating)
- Flag evaluation buried in the data layer instead of at boundary (rule 3 violation)
- Client-side flag used for a security / payment / admin path (rule 5 violation — leaks via devtools)
- Flag SDK timeout / fallback missing (rule 6 weakening — fault tolerance gap)
- Multiple nested flag checks for related behaviour (anti-pattern 1 — flag spaghetti)
- Flag-as-config use case found (anti-pattern 3 — config belongs elsewhere)
- Experiment past decision deadline without ship / kill action (rule 9 weakening)
- Kill switch flipped for the first time during an incident (rule 8 weakening — not pre-tested)

**Refinement candidates**:
- New flag-category row when a recurring use case doesn't fit the current 5 categories
- Tightening of the cleanup-by-D+14 SLA when stale flags accumulate
- New cross-reference when a sister rule (graceful-degradation, audit-logging) defines the surface a flag depends on
- New vendor row when an OpenFeature provider gains adoption
