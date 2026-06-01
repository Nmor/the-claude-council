# Docs-Sync-With-Code Rule (Always-On, Global)

> Auto-fires on every file. Sister to `done-criteria.md`,
> `official-docs-first.md`, and `no-overclaim.md`.

## Core Principle

**Every PR that adds or changes user-visible behaviour MUST update the
corresponding doc page in the same PR. Doc pages cannot lag code
across deploys.**

The pattern this rule prevents: code ships, doc lags by one deploy,
the next contributor reads the stale doc, repeats the bug or misuses
the new API, and the loop continues. The user has explicitly named
this as a recurring problem: "many document pages and landing are
still multiple deployments stale and the rules around these updates
are clear or should be very clear project and global wise."

The rule is on by default, global, on every project.

## Hard rules

Every PR's reviewer checklist MUST include:

- [ ] Every new feature has a doc page under `docs/`.
- [ ] Every behaviour change to an existing feature updates that
      feature's doc page.
- [ ] `README.md` lists every shipped feature accurately. Features
      that don't exist (yet) are NOT listed.
- [ ] `CLAUDE.md` (or project-equivalent) reflects the current
      architecture for the area touched.
- [ ] Marketing surfaces (landing pages, public site) describe only
      features that work today, not features in flight.
- [ ] `docs/runbook.md` (or project equivalent) has an entry for every
      new failure-mode the change introduces.
- [ ] Provider-research notes under `docs/provider-research/` are
      added or refreshed when external integrations change (see
      `official-docs-first.md`).
- [ ] `CHANGELOG.md` (when project keeps one) has an entry.

## What "doc page exists" means

The doc page IS the feature. A feature without a doc page is
unfinished. The doc page:

- States what the feature does in product terms (not implementation
  terms).
- Names the plan-tier gate (FREE / STANDARD / PRO / PRO_MAX, or
  equivalent).
- States the supported scope and the rejected scope (e.g. "business
  email providers only — personal Gmail / Outlook.com / iCloud /
  Yahoo / Proton are blocked at signup").
- Names the failure modes a user can encounter and what they mean.
- Cites the canonical provider docs (via the provider-research file).

## Mechanical gate

Every project's local preflight script
(`infra/verify-local.sh` / `scripts/preflight.sh` / `predeploy`) must
include a docs-sync gate. The gate greps the touched feature name in:

- `docs/`
- `README.md`
- `CLAUDE.md` (or project equivalent)
- The marketing landing page (e.g. `views/LandingView.vue`)

Missing references fail the gate. The gate runs locally AND in CI.

For repos that don't have a verify script yet, the docs-sync gate is
the FIRST script the next docs-touching PR should add. The check is
~30 lines of shell.

### Minimal gate shape (illustrative)

```bash
#!/usr/bin/env bash
# infra/verify-docs-sync.sh
set -euo pipefail

FEATURE="${1:?Usage: $0 <feature-keyword>}"

missing=()
grep -ri "$FEATURE" docs/ >/dev/null   || missing+=("docs/")
grep -i  "$FEATURE" README.md >/dev/null || missing+=("README.md")
grep -i  "$FEATURE" CLAUDE.md >/dev/null || missing+=("CLAUDE.md")
grep -ri "$FEATURE" frontend/src/views/LandingView.vue >/dev/null \
    || missing+=("LandingView.vue")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "FAIL: feature '$FEATURE' missing from: ${missing[*]}"
  exit 1
fi
echo "OK: feature '$FEATURE' is documented across all surfaces"
```

The PR that adds a new feature must add a call to this gate (one
line) for its feature keyword.

## When the doc lags AND the user has reported it

The user has explicitly flagged this rule with: docs / landing are
multiple deploys stale. When you encounter a stale doc surface while
working on something else:

1. The doc fix lands in the SAME PR as the work touching that area —
   not a follow-up.
2. If the doc gap is larger than the in-flight work (e.g. an entire
   feature page is missing), the in-flight PR adds at least a
   placeholder doc page and a `BUG(docs-gap-<short-id>)` marker
   pointing at what's missing. The next PR completes it.
3. Never silently move on. The "I'll do the docs next" pattern is
   how doc drift happens.

## What lives where

The provider-research files
(`docs/provider-research/<provider>.md`) carry primary-source URLs
and the *durable* technical contract — auth model, scope deprecation
cadence, rate limits, retry semantics. The runbook
(`docs/runbook.md`) carries failure-mode procedures. The feature doc
(`docs/<feature>.md`) carries the product-facing description. The
README + CLAUDE.md + landing carry the elevator-pitch / index.

When a feature changes, every layer it appears in is updated.

## Why this rule exists

The user has explicitly named documentation drift as a
trust-eroding pattern. Recurring instances:

- Feature pages described features that didn't work end-to-end.
- Landing copy advertised features that were broken from a fresh
  clone.
- Runbook entries existed for an old architecture and were never
  updated when the architecture changed.
- Provider integration code shipped without any
  `docs/provider-research/<provider>.md` file, so the next
  contributor had no record of what was supposed to be true.

The cost of writing the doc in the same PR is low. The cost of
debugging "is the docs lying or is the code lying" is high.

## Cross-references

- `done-criteria.md` — "done" requires the docs are in sync.
- `official-docs-first.md` — every external integration requires a
  `docs/provider-research/<provider>.md` file before any handler is
  written.
- `no-overclaim.md` — never claim "done" when the docs are stale.
- `no-silent-drops.md` — silently letting docs drift behind code is
  itself a silent drop of the work the doc was supposed to capture.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Feature PR merged without corresponding `docs/<feature>.md` update (rule 1 violation)
- README lists a feature that doesn't work end-to-end from fresh clone (advertised-but-broken pattern)
- Marketing / landing page references a feature that isn't shipped yet
- Provider integration ships without `docs/provider-research/<provider>.md` (sister-rule `official-docs-first.md` weakening)
- Runbook entry stale > 6 months yet still referenced by alerts (decay pattern)
- "I'll do the docs next" markers introduced (deferred-docs anti-pattern)
- Docs-sync gate missing from local pre-flight script in a docs-touching repo
- New failure-mode shipped without `docs/runbook.md` entry in the same PR
- CHANGELOG.md entry missing on releases that change user-visible behaviour

**Refinement candidates**:
- New row in the doc surface table when a recurring artifact class (status page, partner portal, ToS update) emerges
- Tightening of the docs-sync gate's grep scope when a new surface (e.g., `docs/api/` for OpenAPI) appears
- New cross-reference when a sister rule (deprecation-lifecycle, runbook-template, adr-template) provides the canonical home for a docs artifact
- Promotion of `BUG(docs-gap-*)` markers to real tickets when they accumulate past N per service
