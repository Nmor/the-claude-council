# Council Trigger Ruleset (Always-On, Global)

> Auto-fires on every file. Sister to `council-default.md` (Council is the
> default mode), `~/.claude/CLAUDE.md` (Council protocol + the always-on division
> summary tables), every agent file under `~/.claude/agents/`.
>
> **Slimmed 2026-07-23.** The exhaustive per-division glob / keyword / change-scope
> catalog (all 11 Extended Divisions, ~326 globs, sub-clusters for
> payments / health / education) lived here AND in the `paths:`-gated
> `council-rules` skill — a full duplicate on the always-on floor. The catalog now
> lives ONLY in the skill (a verified superset — zero globs / keywords lost). This
> file keeps what must stay always-on: the trigger MECHANISM. No behaviour changed:
> the model still fires divisions mechanically from CLAUDE.md's always-on summary,
> and the exhaustive catalog loads exactly when Council work touches a matching
> file. ~21 KB off every session's cold-load.

## Core Principle

**Every Extended Division has a documented trigger ruleset — file patterns,
keywords, change scope, plan-tier impact, regulatory context. When the work
matches a trigger, that Division auto-engages alongside the Core Five. Triggers
are mechanical: the assistant detects them from the file paths, the diff, and the
task description — never from "should we consult X?" judgment calls. If the
trigger matches, the Division engages; if it doesn't, the Division is on standby.**

## Where the catalog lives (always-on summary vs full detail)

| Surface | Always-on? | Content |
| --- | --- | --- |
| `~/.claude/CLAUDE.md` — "The Core Five Divisions" table | yes (Floor) | The 5 divisions that always engage, no trigger needed |
| `~/.claude/CLAUDE.md` — "The Extended Eleven Divisions" table (`Auto-fires on` column) | yes (Floor) | Per-division one-line trigger summary — the decision aid used to fire divisions at task start |
| `~/.claude/skills/council-rules/SKILL.md` | lazy (`paths:`-gated) | The FULL per-division catalog: every file glob, keyword, change-scope trigger, sub-cluster (payments / health / education), veto authority, cross-cutting composition, agent rosters + personas |

The skill's `paths:` fire it whenever the work touches `**/.claude/agents/**`,
`**/.claude/plans/**`, `~/.claude/rules/common/council-*.md`, or `**/COUNCIL.md`
— i.e. exactly when precise trigger adjudication is needed. The always-on
CLAUDE.md summary is sufficient to fire the right divisions for the common case;
the skill adds exhaustive precision when a task is genuinely in a Division's domain.

## Core Five — always engaged (no trigger needed)

Architecture & Planning · Implementation & Build · Quality & Review · Security ·
Testing & QA. These speak on every task; the full always-on table is in
`CLAUDE.md`. Security is cross-cutting and always engages.

## How triggers are evaluated

At task entry, the assistant:

1. Reads the prompt, file paths, change scope.
2. Matches against each Division's trigger summary (CLAUDE.md always-on tables;
   full catalog via the `council-rules` skill when a matching file is touched).
3. Builds the list of engaged Divisions (Core Five + any Extended that matched).
4. Phase 0 includes each engaged Division's intake.
5. Phase 1 has each Division speak in order.
6. Phase 2 consensus accounts for all engaged Divisions.

The detection is mechanical; SURFACE which Divisions engage at the start of the
task so the user sees the trigger logic:

```text
Council engaged this turn:
  - Core Five (always)
  - Division 6 (Compliance) — GDPR consent UX change
  - Division 7 (UX) — modifying user-facing copy
  - Division 9 (Data) — adding a new analytics event
```

The default is INCLUSIVE: if a trigger matches, the Division engages. A
false-positive costs a few seconds of "nothing material to add"; a false-negative
costs an incident. When a task spans multiple domains, multiple Divisions fire
(e.g. a new payment integration → Security + Compliance + UX + Ops + Data +
Finance + Comms) — the full composition examples are in the `council-rules` skill.

## Cross-references

- `council-default.md` — Council is the default mode
- `~/.claude/CLAUDE.md` — Council protocol shape + the always-on Core Five /
  Extended Eleven summary tables (the decision aid this rule's mechanism uses)
- `~/.claude/skills/council-rules/SKILL.md` — the FULL per-division trigger
  catalog + veto authority + agent rosters + personas (lazy, `paths:`-gated)
- Every agent file under `~/.claude/agents/` — agents are Division members
- `task-intake-due-diligence.md` — Phase 0 intake

## Why this rule exists

Without a trigger ruleset, Extended Division engagement depends on variable
judgment — a task that should engage Compliance gets missed because "GDPR" wasn't
literally in the prompt, and a privacy gap ships. Mechanical triggers solve this
(file / keyword / scope match → Division engages), conservative by design
(over-include rather than under-include). Keeping the exhaustive catalog on the
always-on floor AND in the lazy skill was pure duplication — the mechanism belongs
on the floor; the encyclopedia belongs in the skill that fires when it's relevant.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Division should have engaged but no trigger matched (false-negative — the
  CLAUDE.md summary or skill catalog needs a broader trigger)
- Division engaged but had nothing material to add repeatedly (false-positive —
  trigger needs narrowing in the `council-rules` skill)
- The `council-rules` skill did NOT load when precise adjudication was needed
  (its `paths:` gating missed a domain — extend the globs)
- A new file pattern emerges that no Division claims (new trigger row — add to the
  skill catalog, and the summary in CLAUDE.md if decision-critical)

**Refinement candidates**:

- New trigger glob / keyword in the `council-rules` skill when a recurring pattern
  doesn't fire the right Division
- New `paths:` entry on the `council-rules` skill when a domain's precise catalog
  is needed but the skill didn't fire
- Promotion of a trigger from the skill's detail into the CLAUDE.md always-on
  summary when it proves decision-critical at task start
