# council-maintenance: Hooks code and surface quality

> Learning hooks for the rules governing what the code and the user-visible surface may contain —
> bloat, inert wiring, silent failure, external contracts, UX. Pointed at by the `## Per-rule
> learning hooks` routing table in `../SKILL.md`.
>
> **Size budget: 9 KB** — `token-budget.mjs --check`.

## `no-bloat.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New interface / flag / parameter / endpoint added with no present consumer
  (rule 1 violation — speculative generality)
- Two methods / handlers with near-identical bodies shipped instead of one
  primitive (rule 2 — collapse missed)
- Same block duplicated 3+ times without extraction (rule 3 — DRY)
- A broad interface widened (forcing all implementers/mocks to grow) where a
  narrow new interface would do (rule 4 — segregation missed)
- Append to a file already past the soft cap instead of a cohesion split
  (rule 5 weakening)
- Superseded code left in "for now" in a change that obsoleted it (rule 6)
- New dependency added for standard-library-equivalent functionality (rule 7)
- Comment restates the code / obsolete prose retained (rule 8)
- Padded near-duplicate test cases exercising one path (rule 9)

**Refinement candidates**:

- New anti-pattern entry when a recurring bloat shape appears
- Tightening of the size-cap split guidance when god-file growth recurs
- New cross-reference when a sister rule provides a gate the no-bloat audit
  depends on
- A mechanical detector promoted to the edit-time hook when a bloat class proves
  catchable without false positives

## `no-silent-failures.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- False-positive success toast where the optional sub-step actually failed (rule 1 violation
  pattern)
- Async op left in "pending forever" terminal state (rule 2 violation)
- Optimistic UI update without rollback on failure (rule 3 weakening)
- Webhook handler returning 200 OK while DLQ-routing failures silently (rule 4 weakening)
- Polling loop with no timeout escalation surfacing as "stuck spinner" UX (rule 6)
- Confirmation flow mutation that didn't actually apply but reported success (rule 5)
- Same partial-success pattern recurring across handlers (taxonomy needs new code class)
- `throw` / `reject` / `raise` shipped in a user-facing path without an accompanying toast / inline
  validation / banner / state transition (rule 7 violation — the strongest form)
- Generic ErrorBoundary catch-all relied on as the FIRST UX surface instead of per-action UX (rule 7
  weakening)
- Server returns a typed `error_code` + `message` but the client renders generic "Something went
  wrong" (rule 7 banned-shape — the `useApiError` composable / hook isn't mapping the code)
- Sync handler `throw new ValidationError(...)` not caught + surfaced inline on a form (rule 7
  sync-path violation)
- Server controller `throw` without centralised exception-mapping middleware turning into a generic
  500 (rule 7 server-side weakening)

**Refinement candidates**:

- New rule when a new false-positive success shape appears in 2+ incidents
- New cross-reference when a sister rule (no-discards, error-handling-with-context) covers a pattern
  previously thought unique to this rule
- Tightening of the "every async op has a known status" rule when a new state-machine gap is
  observed
- New entry in the optimistic-rollback pattern table when a new domain case surfaces

## `official-docs-first.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `docs/provider-research/<provider>.md` missing for an integration that shipped (rule violation
  pattern)
- Provider-research note > 6 months stale and integration touched without refresh (cadence rule
  needs reinforcement)
- Integration shaped from npm README / Stack Overflow instead of provider docs (Phase 0 discipline
  weak)
- Personal-tier vs commercial-tier scope unclear — boundary missing (rule needs new section example)
- Auth model assumed instead of cited (recurring shortcut pattern)
- Deprecation notice from provider arrived but integration not re-read (cadence rule needs
  reinforcement)
- Same provider integrated by multiple agents independently (candidate for shared provider-research
  template)

**Refinement candidates**:

- New canonical-doc-surface entry when a provider's docs need named anchor (table extension)
- New anti-pattern entry when a shortcut recurs across 2+ integrations
- Tightening of the 6-month refresh cadence when provider deprecations get missed
- New pairing entry when sister rules consistently catch what this rule misses

## `ui-ux-quality-bar.md`

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- A user-facing change shipped with no UI/UX verification block (rule 8)
- An empty / loading / error state missing from a surface that can reach it (rule 1)
- A raw exception, status code, or generic message shown to a user (rules 2 + 3)
- A destructive action confirmed without naming its consequence (rule 4)
- An a11y failure found AFTER ship that a keyboard pass would have caught (rule 5)
- Strings hardcoded with i18n deferred to a later phase (rule 6)
- A backend feature marked done with its UI tracked separately (rule 7)
- "Scaffold" used as a finish line on a user-facing feature

**Refinement candidates**:

- New anti-pattern row when a copy failure recurs across surfaces
- New state in rule 1 when a flow class needs one the list omits
- Promotion of a recurring check into an automated probe (contrast, focus, target size)
- Tightening of rule 6 when a locale gap ships despite the rule

## `wiring-and-usage-review.md`

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- A new symbol shipped with no live-path consumer (rule 1 violation)
- A control unit-tested but not called on the live path (rule 2 — inert validator)
- A resource opened without a wired teardown (rule 3 — lifecycle asymmetry)
- A completion claim without the wiring + usage line (rule 5 weakening)
- The dead-code detector not run in the gate on a touched file (rule 6 weakening)
- A cross-artifact reference (runbook→alert, CLI→command, doc→path) that dangles
  (rule 7 violation)
- "Wire it next phase" deferral that ships an inert symbol (anti-pattern)
- Found-inert code deleted without per-item wire-vs-delete classification or live-path
  verification — esp. a batch/agent fan-out treating a trace as a delete-list (rule 9
  violation); a deliberately-authored-but-unwired feature deleted instead of wired

**Refinement candidates**:

- New detector row when a language/artifact class gains an unused-symbol tool
- New anti-pattern entry when a recurring inert-code shape appears
- Tightening of the "documented entry point" exception when it's used to excuse
  genuinely-orphan code
