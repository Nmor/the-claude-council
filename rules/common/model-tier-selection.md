# Model-Tier Selection Rule (Always-On, Global)

> Auto-fires on every Council-mediated task. Sister to `council-default.md`
> (the Council selects each agent's model via the ladders here at spawn time),
> `principal-level-mandate.md` (the quality bar the top rungs protect),
> `no-quality-compromise-on-cost` guidance (cut waste, never rigor),
> `no-silent-failures.md` (degradation is surfaced, never silent),
> `official-docs-first.md` (the tier facts below are primary-source-cited).
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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

## Hard rule: an unavailable rung falls UP, never down

Availability filters the ladder at spawn. A rung that is *listed* but fails at
run time (overloaded, timed out, rate-limited, refused with no fallback) is a
different case: the next attempt takes the **next more capable rung that is
available**, never a lesser one, and says so. A mechanical spawn whose Sonnet
rung times out runs on Opus, not Haiku. Quality is never the variable that
absorbs an outage; cost is.

The same direction holds in the IDE. `fallbackModel` in `~/.claude/settings.json`
is the session-model chain (`["opus", "sonnet"]` under a Fable session); the
auto-mode permission classifier has no model setting of its own (Sonnet 5 by
default; the session's model, or Opus under Fable, only when the `availableModels`
allowlist excludes Sonnet), so a classifier timeout is **retried after a moment**,
never routed around with a weaker check.

**A plan limit is not an outage to Claude Code.** `fallbackModel` never fires on rate-limit
or billing errors, and no hook can switch the model or retry (docs `model-config`, `hooks`,
read 2026-09-25). So `model-exhaustion-marker.js` records a tier when an error NAMES it
("You've hit your Fable limit") and clears it on the next success. The ladder gate then
resolves around it and DENIES a spawn that asks for it, naming the rung to re-spawn on:
the Council switches with no human step. A session or weekly limit covers every model and
marks nothing. The SESSION model still needs `/model`; no mechanism exists to switch it.

Owner directive (2026-09-21), verbatim: "if no sonnet we should use opus and this
should be in the ide and claude council config design."

## Full text

The hard rules above are the always-on trigger — enough to know the rule applies and
what it demands. Their full text (worked examples, anti-patterns, tables, procedures)
lives in the **`council-rules`** skill; invoke it, since it does not load by itself.

Read it before acting on this rule. Carrying the full body on the always-on Floor cost
every turn of every unrelated task for guidance that applies at one specific moment.

## Enforcement — what the hook can and cannot do

`model-ladder-gate.js` runs on two events, and the split matters because a hook cannot do
what an earlier version of this section claimed:

- **`PreToolUse` on `Agent`** — resolves the spawn's `subagent_type` to its role, resolves
  the ladder against the models available here, and states which rung that is. It **advises**;
  it does not substitute. A PreToolUse hook cannot rewrite `tool_input` — the API offers
  allow, deny or `additionalContext` and nothing else — so "silently pass the right model" is
  available to no hook. `CLAUDE_MODEL_LADDER=strict` turns an under-provisioned strategic
  spawn into a refusal; `CLAUDE_MODEL_AVAILABILITY` overrides the availability file.
- **`PreModelSwitch`** — **blocks** a switch to Fable during security / regulated work, the
  one case where the wrong rung buys a refusal rather than capability.

**Provenance (2026-09-21).** This replaces the sentence "the `model-ladder-gate.js` PreToolUse
hook enforces the ladder mechanically at Agent spawn", which was false three ways at once: the
hook was registered on `PreModelSwitch` only, `settings.json` had no `PreToolUse` matcher for
`Agent` at all, and the hook held no selection logic — only a refusal. So this install could
DENY Fable and never FIELD it. `.local/model-availability` listed `fable`, the live catalog
carried `claude-fable-5-1`, the Agent tool's own schema accepted it, and the only executable
in the install that mentioned Fable was the one saying no. The user noticed before any gate
did. A rule asserting that a hook enforces something is not enforcement — and this rule was
asserting it about its own hook.

## Cross-references

- `council-default.md` — the Council resolves + applies these ladders at spawn
- `principal-level-mandate.md` — the quality bar the top rungs exist to protect
- `no-silent-failures.md` — every degradation is surfaced
- `official-docs-first.md` — tier facts are primary-source-cited + refreshed
- `project-scoped-artifacts.md` — `.local/` availability config is gitignored
- `no-bloat.md` — one ladder per role, no speculative tiers

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill. Invoke it when refining this rule: it does not load
by itself. They are instructions for maintaining THIS ARTIFACT, not for doing
the task at hand, so they are not carried on every turn.
