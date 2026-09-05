# Model-Tier Selection Rule (Always-On, Global)

> Auto-fires on every Council-mediated task. Sister to `council-default.md`
> (the Council selects each agent's model via the ladders here at spawn time),
> `principal-level-mandate.md` (the quality bar the top rungs protect),
> `no-quality-compromise-on-cost` guidance (cut waste, never rigor),
> `no-silent-failures.md` (degradation is surfaced, never silent),
> `official-docs-first.md` (the tier facts below are primary-source-cited).

## Core Principle

**Every Council role draws from an ordered LADDER of models — best-for-this-job
first, down to a broadly-available floor. At spawn time the Council resolves the
ladder against the models actually AVAILABLE in this install and selects the
highest-ranked available one. A Max user fields Fable where it genuinely helps; a
Pro/Team/ZDR user automatically fields the next-best model for that same job. The
best set of soldiers you can field with what you have — and never a hard failure,
because every ladder ends in a model that ships on all paid plans.**

The ladder encodes BOTH the task's quality ceiling (don't under-provision the
hardest reasoning) AND its floor (don't over-provision a mechanical fix onto an
expensive model). Availability filters that ladder; it never inflates it.

## Role → ladder table

Each Council role maps to a ladder (best → floor). `exclude:` lists models a role
must never use regardless of availability.

| Role class | Council members (examples) | Ladder (best → floor) | exclude |
| --- | --- | --- | --- |
| `strategic-deep-reasoning` | `architect`, `planner` on Strategic / novel / high-blast-radius work; long-horizon migrations; hardest **non-security** debugging | `fable → opus → sonnet` | — |
| `security-and-regulated-review` | `security-reviewer`, `compliance-reviewer`, `payments/health/education-reviewer`, `risk-reviewer` on destructive ops | `opus → sonnet` | `fable` (classifiers refuse security; Anthropic routes defensive-security to Mythos, not Fable). `mythos` MAY top this ladder where present. |
| `deep-review-general` | `code-reviewer`, `database-reviewer`, `ai-ethics-reviewer`, deep non-security review | `opus → sonnet` | — |
| `standard-review` | language reviewers (`go/python/java/mobile`), `ux-reviewer`, `accessibility-reviewer`, quality | `opus → sonnet` | — |
| `mechanical-build-fix` | per-stack build resolvers (`build-error-resolver` TS/JS, `go-build-resolver`, `python-` / `rust-` / `java-` / `dotnet-` / `ruby-` / `php-` / `swift-build-resolver`), `refactor-cleaner` | `sonnet → haiku` | — |
| `search-explore` | `Explore`, `general-purpose` used for search/lookup | `haiku → sonnet` | — |
| `doc-codemap` | `doc-updater`, codemap generation | `haiku → sonnet` | — |

The ladders deliberately reserve **Fable for `strategic-deep-reasoning` only** —
the ~5% of work (novel architecture, long-horizon autonomous runs, first-shot
builds, hardest debugging) where first-shot correctness offsets the 2× premium.
Everywhere else the ceiling is Opus (quality-critical review) or Sonnet
(mechanical), so enabling Fable never silently inflates routine cost.

## Full text

The hard rules above are the always-on trigger — enough to know the rule applies and
what it demands. Their full text (worked examples, anti-patterns, tables, procedures)
lives in the **`council-rules`** skill, which fires on agent + plan files; the `model-ladder-gate.js` PreToolUse hook enforces the ladder mechanically at Agent spawn.

Read it before acting on this rule. Carrying the full body on the always-on Floor cost
every turn of every unrelated task for guidance that applies at one specific moment.

## Cross-references

- `council-default.md` — the Council resolves + applies these ladders at spawn
- `principal-level-mandate.md` — the quality bar the top rungs exist to protect
- `no-silent-failures.md` — every degradation is surfaced
- `official-docs-first.md` — tier facts are primary-source-cited + refreshed
- `project-scoped-artifacts.md` — `.local/` availability config is gitignored
- `no-bloat.md` — one ladder per role, no speculative tiers

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill, which auto-fires when you touch a rule, skill,
agent or CLAUDE.md — i.e. exactly when you are refining the framework. They are
instructions for maintaining THIS ARTIFACT, not for doing the task at hand, so
they load then rather than on every turn.
