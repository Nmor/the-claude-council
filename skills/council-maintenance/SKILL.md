---
name: council-maintenance
description: Learning hooks for every Council rule — the per-rule "signals to watch" (what observation means a rule is being weakened or missed) and "refinement candidates" (what kind of change that rule accepts). Use when refining, auditing or authoring a Council rule / skill / agent / CLAUDE.md, when running the continuous-learning batch (/learn, /evolve), when deciding whether an observed failure warrants a rule change, or when promoting a workspace pattern to global.
---

# Council Maintenance — Learning Hooks

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> The self-improvement surface for the Council's own rules. Sister to
> `continuous-learning-mandate.md` (the loop these feed),
> `rule-authoring-global-vs-project.md` (where a refinement lands),
> `principal-level-mandate.md` (the depth a refinement must hold).

## Standards Cited

- **ISO 9001:2015 §10.3** — *Continual improvement*: the organisation shall
  continually improve the suitability, adequacy and effectiveness of the system.
  These hooks are that mechanism for the rule corpus: each rule declares how its
  own effectiveness is observed.
- **ISO/IEC 27001:2022 §10.1** — *Continual improvement*, paired with §10.2
  *Nonconformity and corrective action*. A fired signal is a nonconformity; a
  refinement candidate is the bounded corrective action it may take.
- **NIST SP 800-53 Rev. 5, CA-7** — *Continuous Monitoring*: define metrics and
  the frequency of assessment. Each rule's "signals to watch" is its metric set;
  the phase boundary is its assessment frequency.
- **ISO/IEC/IEEE 12207:2017** — *Systems and software engineering — Software life
  cycle processes*, which places process improvement inside the life cycle rather
  than beside it. Same argument for why upkeep guidance is versioned with the
  rules it maintains.

## Purpose

`continuous-learning-mandate.md` rule 6 requires every rule, skill and agent to
carry a `learning_hooks` section naming **signals to watch** ("what observations
matter for refining this artifact") and **refinement candidates** ("what kinds of
refinement this artifact accepts").

That content is addressed to whoever is **maintaining the Council** — not to the
agent doing the current task. Carried inline on all 24 always-on rules it cost
~30 KB of every single turn's context, on every task, forever, to serve the
rare turn that actually refines a rule. It is collected here instead, behind a
`paths:` gate that fires on exactly the artifacts a refinement touches.

Nothing was dropped: every rule's hooks are reproduced verbatim below, and each
rule retains a pointer to this skill.

## What this skill does NOT cover

The rules themselves. This is the maintenance layer — the normative content stays
in `~/.claude/rules/common/`, always on. If you are asking "what does the rule
require?", read the rule. If you are asking "how would I know this rule is being
weakened, and what change would fix it?", read below.

## How to use these hooks

1. **Observing** — when a task goes wrong, find the rule that should have caught
   it and read its *signals to watch*. A signal that fired is a
   learning-candidate event per `continuous-learning-mandate.md` rule 1.
2. **Refining** — a rule's *refinement candidates* bound what change it accepts.
   A refinement outside that list is usually a NEW rule, or belongs in a sister
   rule; check `rule-authoring-global-vs-project.md` before authoring either.
3. **Classifying** — global vs workspace per `rule-authoring-global-vs-project.md`
   rules 1-2. Confidence + session thresholds per
   `continuous-learning-mandate.md` rule 2. The user approves every change.
4. **Never mutate silently** — `continuous-learning-mandate.md` anti-pattern 1.

## Anti-Patterns

- **Silent rule mutation** — changing a rule on one session's observation. Needs
  confidence >= 0.8, 2+ sessions, and explicit user approval.
- **Rule sprawl** — a new rule per observation. Cluster into an existing rule
  first; a new sibling needs a genuinely new principle
  (`rule-authoring-global-vs-project.md` learning hooks record an incident where
  a duplicate rule was created because nobody grepped first).
- **Candidate hoarding** — candidates accumulating unreviewed. The batch fires at
  every session boundary.
- **Project specifics into global** — a workspace name, path or incident inside a
  global rule. `rule-authoring-global-vs-project.md` rule 2.
- **Refining the hook instead of the rule** — editing a signal so it stops firing,
  rather than fixing what it detected.
- **Treating a signal as proof** — a signal is an observation to investigate, not
  a verified defect. `verify-before-claim.md` still applies.

## Verification Checklist

- Refinement classified global vs workspace, with the rationale recorded
  (`rule-authoring-global-vs-project.md` rule 10). Green: the response names the
  path, the classification, and the rationale.
- Existing rules grepped for the concept before authoring a new one. Green:
  `ls`/`grep` of `rules/common/` ran this turn.
- The changed rule still carries its "Why this rule exists" naming a SPECIFIC
  failure mode. Green: not a vague "improves quality".
- Cross-references updated both ways. Green: `tests/verify-link-integrity.sh`.
- The rule's hooks below updated to match the change. Green: this file edited in
  the same commit as the rule.
- No project name / path / session date entered a global artifact. Green: the
  contamination sweep in `principal-level-mandate.md`.

## Cross-References

- `continuous-learning-mandate.md` — the loop these hooks feed (rule 6 mandates them)
- `rule-authoring-global-vs-project.md` — where a refinement lands; promotion + demotion
- `principal-level-mandate.md` — the depth bar a refined artifact must still meet
- `project-scoped-artifacts.md` — the workspace-side learning loop + audit log
- `post-phase-retrospective-review.md` — recurring misses become candidates here
- Skill `council-rules` — the Division catalog a trigger refinement edits
- Commands `/learn`, `/evolve`, `/instinct-status` — the operator interface

## Why This Skill Exists

Measured on a real install, `rules/common` cost ~74,000 tokens of every turn —
roughly 30x the entire 123-skill listing, and 2.3x the "~110-130 KB" cold-load
budget `CLAUDE.md` claims for itself. ~30 KB of that was learning hooks: guidance
for refining the framework, loaded on every turn of every unrelated task.

The framework already had the answer in its own file. `council-triggers.md` kept
the trigger MECHANISM always-on and moved its 326-glob catalog into the
`council-rules` skill, for exactly this reason. This applies the same split to
the maintenance layer: the rules stay on the Floor, their upkeep instructions
load when you are doing upkeep.

The failure mode it prevents is the one that motivated it — a context window
spent on instructions for a task nobody is doing, degrading the model's attention
on the task someone IS doing.

## Full rule text carried here

Two Floor rules keep only their hard-rule SUMMARY always-on and carry their full
text here, for the same reason as the hooks below: the detail is needed when you
are authoring or relocating a rule, not on every turn.

| Rule | Full text |
| --- | --- |
| `rule-authoring-global-vs-project.md` — classification, purity, promotion + demotion, the two anti-patterns | [`references/rule-authoring-global-vs-project.md`](references/rule-authoring-global-vs-project.md) |
| `project-scoped-artifacts.md` — first-touch detection, canonical scaffold, learning loop, gitignore hygiene, tech-stack auto-detection | [`references/project-scoped-artifacts.md`](references/project-scoped-artifacts.md) |

## Per-rule learning hooks

Every Floor rule's **signals to watch** + **refinement candidates**, grouped by the
family a refinement usually touches — sister rules get refined together, so the
file you open for one is the file you need for its neighbours. Find the rule, open
its file, read that rule's two lists.

| Rule | Learning hooks |
| --- | --- |
| `competitive-parity-per-phase.md` | [`references/hooks-planning-and-phases.md`](references/hooks-planning-and-phases.md) |
| `continuous-learning-mandate.md` | [`references/hooks-council-and-depth.md`](references/hooks-council-and-depth.md) |
| `council-default.md` | [`references/hooks-council-and-depth.md`](references/hooks-council-and-depth.md) |
| `council-triggers.md` | [`references/hooks-council-and-depth.md`](references/hooks-council-and-depth.md) |
| `diagnose-before-fixing.md` | [`references/hooks-claims-and-diagnosis.md`](references/hooks-claims-and-diagnosis.md) |
| `done-criteria.md` | [`references/hooks-claims-and-diagnosis.md`](references/hooks-claims-and-diagnosis.md) |
| `model-tier-selection.md` | [`references/hooks-council-and-depth.md`](references/hooks-council-and-depth.md) |
| `no-bloat.md` | [`references/hooks-code-and-surface-quality.md`](references/hooks-code-and-surface-quality.md) |
| `no-overclaim.md` | [`references/hooks-claims-and-diagnosis.md`](references/hooks-claims-and-diagnosis.md) |
| `no-silent-failures.md` | [`references/hooks-code-and-surface-quality.md`](references/hooks-code-and-surface-quality.md) |
| `official-docs-first.md` | [`references/hooks-code-and-surface-quality.md`](references/hooks-code-and-surface-quality.md) |
| `plan-completion-before-push.md` | [`references/hooks-planning-and-phases.md`](references/hooks-planning-and-phases.md) |
| `plan-execution-progress.md` | [`references/hooks-planning-and-phases.md`](references/hooks-planning-and-phases.md) |
| `plan-task-breakdown.md` | [`references/hooks-planning-and-phases.md`](references/hooks-planning-and-phases.md) |
| `post-phase-retrospective-review.md` | [`references/hooks-planning-and-phases.md`](references/hooks-planning-and-phases.md) |
| `principal-level-mandate.md` | [`references/hooks-council-and-depth.md`](references/hooks-council-and-depth.md) |
| `project-memory.md` | [`references/hooks-artifacts-and-memory.md`](references/hooks-artifacts-and-memory.md) |
| `project-scoped-artifacts.md` | [`references/hooks-artifacts-and-memory.md`](references/hooks-artifacts-and-memory.md) |
| `rule-authoring-global-vs-project.md` | [`references/hooks-artifacts-and-memory.md`](references/hooks-artifacts-and-memory.md) |
| `task-intake-due-diligence.md` | [`references/hooks-council-and-depth.md`](references/hooks-council-and-depth.md) |
| `ui-ux-quality-bar.md` | [`references/hooks-code-and-surface-quality.md`](references/hooks-code-and-surface-quality.md) |
| `validate-payloads-before-coding.md` | [`references/hooks-claims-and-diagnosis.md`](references/hooks-claims-and-diagnosis.md) |
| `verify-before-claim.md` | [`references/hooks-claims-and-diagnosis.md`](references/hooks-claims-and-diagnosis.md) |
| `wiring-and-usage-review.md` | [`references/hooks-code-and-surface-quality.md`](references/hooks-code-and-surface-quality.md) |

A rule that gains a `## Learning hooks` pointer to this skill gets its row here and
its two lists in the matching file, in the same commit as the rule
(`continuous-learning-mandate.md` rule 6).
