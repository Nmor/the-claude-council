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

## Tier capability + availability (primary-source-cited)

Sources (read 2026-07-27): Anthropic Models Overview
(`platform.claude.com/docs/en/about-claude/models/overview`), Introducing Claude
Fable 5 (`.../models/introducing-claude-fable-5-and-claude-mythos-5`), Fable 5 on
your plan (`support.claude.com/en/articles/15424964`). **Claude Opus 5
(`claude-opus-5`) shipped 2026-07-24 as the new recommended default (unchanged
$5/$25 pricing); Opus 4.8 is now a legacy model.** Refresh per
`official-docs-first.md` cadence.

| Tier | Model ID | Capability | Price (in/out per MTok) | Availability |
| --- | --- | --- | --- | --- |
| 1 | `claude-fable-5` | Most capable; long-horizon agentic + hardest reasoning | $10 / $50 | **Gated** — included on Max/Team Premium; metered usage-credits on Pro/Team Standard; **unavailable under ZDR** (30-day-retention "Covered Model"); **safety classifiers can refuse** (esp. cyber/bio) |
| 2 | `claude-opus-5` | Anthropic's recommended default for complex agentic + enterprise work (supersedes the now-legacy `claude-opus-4-8`; same $5/$25) | $5 / $25 | Broadly available (all paid plans + API); default on Max, strongest on Pro |
| 3 | `claude-sonnet-5` | Best speed/intelligence balance; near-Opus on coding/agentic | $3 / $15 ($2/$10 intro → 2026-08-31) | Broadly available |
| 4 | `claude-haiku-4-5` | Fastest, near-frontier; mechanical + search | $1 / $5 | Broadly available |
| opt | `claude-mythos-5` | Fable-class WITHOUT refusal classifiers; for defensive-security | $10 / $50 | Project Glasswing invite-only — absent by default |

Capability order (descending): **fable ≥ mythos > opus > sonnet > haiku.**

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

## Resolution algorithm

At the moment the Council spawns an agent for a role R:

1. Read the install's **available set** A (see Availability config).
2. Walk `ladder(R)` from best to floor; return the first model `M` where
   `M ∈ A` AND `M ∉ exclude(R)`.
3. If the walk finds nothing (a maximally-constrained install), fall back to the
   single highest-capability model in `A`, and SURFACE a one-line note that the
   role ran below its ladder floor (per `no-silent-failures.md`).
4. Pass the resolved `M` as the `model` on the Agent tool call.

Because every ladder's floor (`sonnet` or `haiku`) is broadly available, step 3
is a safety net, not the normal path.

### Worked resolution examples

| Role | Max install (A ⊇ {fable,opus,sonnet,haiku}) | Pro-no-Fable install (A = {opus,sonnet,haiku}) | Sonnet-only install (A = {sonnet,haiku}) |
| --- | --- | --- | --- |
| `strategic-deep-reasoning` | **fable** | **opus** | **sonnet** |
| `security-and-regulated-review` | **opus** (fable excluded) | **opus** | **sonnet** |
| `mechanical-build-fix` | **sonnet** | **sonnet** | **sonnet** |
| `search-explore` | **haiku** | **haiku** | **haiku** |

Note the Max column: even with Fable available, security review stays on **Opus**
(exclusion) and mechanical/search stay on **Sonnet/Haiku** (ladder floor) — best
soldier for the job, not the most expensive one everywhere.

## Availability config (per-install, gitignored)

The install declares which models it can field in
`~/.claude/.local/model-availability` — one model alias per line
(`.local/` is gitignored per `project-scoped-artifacts.md`, so this per-user,
per-plan fact never enters git):

```text
opus
sonnet
haiku
fable        # add only if this install has Fable (Max/Team Premium, or Pro accepting credit cost)
mythos       # add only for Project Glasswing installs
```

- **Default when the file is absent**: `{opus, sonnet, haiku}` — the broadly-
  available floor. Fable is **opt-in**, so a fresh install never assumes a gated
  model exists.
- A comment (`#`) and blank lines are ignored; unknown tokens are ignored with a
  one-line warning.
- On **first-touch** of a workspace (per `project-scoped-artifacts.md`), if the
  file is absent the agent may ASK once "what's the top model tier available on
  this plan?" and write the file — or proceed on the safe default and let the
  user opt into Fable later.

## Graceful degradation at runtime (backstop)

The declared set can drift from reality (plan change, Fable temporarily pulled,
credit exhausted, a ZDR org). So the declaration is backed by a runtime backstop:

- If a resolved `M` spawn fails as **model-unavailable**, or a Fable call returns
  `stop_reason: "refusal"` with no fallback configured, **drop `M` from the
  available set for this session, re-resolve the ladder, spawn the next rung**,
  and surface a one-line note (per `no-silent-failures.md`) suggesting the user
  update `~/.claude/.local/model-availability`.
- Never silently succeed on a lower tier without saying so; never hard-fail while
  a floor model is still available.

## Interaction with agent frontmatter

An agent file's `model:` frontmatter is its **default for a direct, non-Council
spawn**. When the **Council** spawns an agent for a resolved role, the ladder
result is the source of truth and is passed explicitly on the Agent call —
overriding the frontmatter upward (to Fable for a Strategic task) or downward
(to the available floor). Frontmatter defaults SHOULD equal each agent's ladder
floor so a direct spawn is always sane.

## Alias resolution & version currency

Ladders and agent frontmatter use the bare tier ALIAS (`opus`, `sonnet`,
`haiku`, `fable`) — never a dated ID. The Claude Code harness resolves the alias
to the CURRENT model of that tier, so the Council auto-tracks new releases: when
Anthropic shipped Opus 5, the `opus` alias began resolving to `claude-opus-5`
with no config change. The dated IDs in the tier table above are the concrete
models the aliases currently resolve to — cited for pricing / capability /
exclusion facts and refreshed per `official-docs-first.md` when a new model
ships; they are NOT selection pins.

Two things are therefore independent:

- **Framework model selection** (this rule) — alias-based, auto-current.
- **The IDE session model** (`/model` in Claude Code) — a per-user client choice
  saved as the default. A running session keeps the model it LAUNCHED with, and a
  saved choice does NOT auto-migrate when a newer version ships UNLESS it is an
  ALIAS. Refresh with `/model <alias>` or start a new session.

**Making "always the most recent" the default** (per Claude Code
`code.claude.com/docs/en/model-config.md`, read 2026-07-27): the `settings.json`
`model` field and `/model` accept either a tier ALIAS (`opus`/`sonnet`/`haiku`/
`fable` — auto-resolves to the current latest of that tier per provider, upgrading
as new versions ship) or a full dated ID (`claude-opus-5` — PINNED). Both
`settings.json` and subagent frontmatter accept a dated ID to pin; the alias is the
auto-latest form (pinning is available, not API-only). Special aliases: `default`
(account-recommended latest — Opus 5 on Max), `best` (Fable where available, else
latest Opus), `opusplan` (Opus in plan mode → Sonnet in execution),
`opus[1m]`/`sonnet[1m]` (1M context).

**Directive:** model selection ALWAYS uses the most-recent version of the chosen
tier — configure with the ALIAS form, never a pinned dated ID. This rule's ladders
and every agent's `model:` frontmatter already use bare aliases (so per-task and
subagent selection is auto-latest). For the session default, set `settings.json`
`"model"` to an alias (e.g. `"default"` or `"opus"`). Pinning a dated ID is a
deliberate, documented exception (reproducibility), never the default.

## Anti-patterns

- **Assuming Fable exists.** Hardcoding `model: fable` in a role without the
  availability check breaks every non-Max / ZDR install (Fable 400s / refuses).
- **Fable for security.** Its classifiers refuse cyber/bio; use Opus (or Mythos
  where present). Excluded in the table above — don't route around it.
- **Fable everywhere for a Max user.** 2× cost with no quality gain on mechanical
  / search / routine review; the ladder floors prevent this — respect them.
- **Silent downgrade.** Degrading a tier without surfacing it hides a capability
  drop the user should know about (`no-silent-failures.md`).
- **Over-provisioning the floor.** A mechanical build-fix on Opus/Fable is waste;
  the `mechanical-build-fix` ladder tops at Sonnet by design.

## Cross-references

- `council-default.md` — the Council resolves + applies these ladders at spawn
- `principal-level-mandate.md` — the quality bar the top rungs exist to protect
- `no-silent-failures.md` — every degradation is surfaced
- `official-docs-first.md` — tier facts are primary-source-cited + refreshed
- `project-scoped-artifacts.md` — `.local/` availability config is gitignored
- `no-bloat.md` — one ladder per role, no speculative tiers

## Why this rule exists

The Council's value comes from the right specialist reasoning at the right depth.
Applied to models, that means the best-AVAILABLE model for each job — but model
availability is not uniform: Fable is included on Max, metered on Pro, absent
under ZDR, refuses security work, and has itself been pulled and redeployed. A
fixed `model:` assignment either under-serves Max users (never reaching Fable on
the hardest work) or breaks everyone else (assuming a model they can't field).
The ladder + availability-resolution makes the choice adaptive: everyone fields
the strongest soldier they actually have for that specific job, degrading
gracefully and audibly, never over-provisioning routine work.

User directive (verbatim): **"whatever you have you would have the best set of
soldiers … if not then the next available best for that type of task is use. Very
smart selection"** — and the constraint that not every installer has Max, so
Fable-tier must degrade cleanly.

## Learning hooks

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- A role hardcoded to a model instead of resolved via its ladder (rule violation)
- Fable selected for a `security-and-regulated-review` role (exclusion breached)
- Fable routed to mechanical / search / routine review (ladder-floor ignored — waste)
- A runtime model-unavailable / refusal handled by silent downgrade (no note)
- Availability config assumed present without the safe default fallback
- The same install repeatedly hitting a resolved model that isn't actually available (declaration drift — prompt the user to fix the config)

**Refinement candidates**:

- New ladder row when a new Council role class emerges
- New tier row when Anthropic ships a new model (re-cite + re-order capability)
- Tightening of an exclusion when a model class proves unfit for a role
- Promotion of a "metered/credits" nuance into the availability config if
  cost-throttling a gated model per-task proves load-bearing
