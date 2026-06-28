# Principal-Level Review After Each Phase (Always-On, Global)

> Auto-fires on every phase / task boundary. Sister to
> `principal-level-mandate.md`, `verify-before-claim.md`,
> `plan-execution-progress.md`, `continuous-learning-mandate.md`.

## Core Principle

**After EVERY phase / task completion, run a backward-looking
review of every prior phase + the just-completed phase to ensure
(a) each phase meets principal-level quality, (b) every cross-phase
wiring is intact (no dangling references, no broken dependencies,
no half-wired integrations), (c) the cumulative artifact body is
internally consistent.**

The review is NOT optional. It runs every time. Skipping it is
equivalent to skipping verification per `verify-before-claim.md`.

## Hard rules

### 1. The review fires at every phase boundary

A phase boundary is any of:

- A wave / phase completion ("Wave X is done")
- A task ticked complete in TodoWrite or the plan file
- A commit milestone
- A push gate (Wave K-equivalent)
- Council Phase 2 → Phase 3 transition

### 2. The review covers ALL past phases, not just the most recent

The review re-reads every past phase's verification block,
artefact list, and wiring claims. New phase's outputs are checked
against past phases' dependencies.

### 3. The review checks principal-level quality per past phase

For each past phase, re-verify:

- All artefacts meet principal-level depth (per
  `principal-level-mandate.md`)
- No shortcuts retained ("we'll come back to this")
- All cross-references resolve
- All `BUG(unwired-*)` markers either resolved OR have a scheduled
  wave
- All ADRs land per `adr-template.md`
- All runbook entries land per `runbook-template.md`

### 4. The review checks cross-phase wiring

Mechanical checks:

- Phase N's "consumers" listed in Phase M actually exist
- Phase N's "produces" matches Phase M's expected input
- Phase N's data structures are consumed correctly by Phase M+1
- Phase N's event names match producer + consumer wiring
- Phase N's API contracts match downstream callers
- Phase N's schema migrations don't break Phase M's queries

### 5. Findings get fixed BEFORE the next phase starts

The review output is a list of:

- ✅ Verified-principal-level + wired-correctly
- ⚠️ Drift requiring re-work in past phase
- ❌ Wiring broken; new phase BLOCKED until fixed

❌ blocks the next phase. ⚠️ becomes top-of-todo for the next
phase.

### 6. The review's output is a durable artefact

The review writes to:
`<workspace>/.claude/audits/phase-review-<wave-id>-<timestamp>.md`

Format:

```text
# Phase Review — Wave <id> @ <timestamp>

## Wave <id> just completed

- <verification block summary>

## Backward sweep (Waves 1..N)

### Wave A — <status>
- Principal-level: ✅
- Wiring: ✅ (consumers reach producers; no dangling refs)

### Wave B — <status>
- Principal-level: ⚠️ (gap: <named depth gap>)
- Wiring: ✅

…

## ❌ Blockers
<list with remediation owner + ETA>

## ⚠️ Drift
<list with deferred remediation plan>

## ✅ Cleared
<list of confirmations>
```

### 7. The review applies the Council Protocol

For every past phase, run Council Phase 2 (Consensus re-check):

- Does the original GO/NO-GO still hold given new info?
- Did any veto-able finding emerge later?
- Are tiebreakers still valid?

### 8. The review uses the Code-Graph Validation tool

Per `code-graph-validation.md`, the review runs:

- Outbound: every reference in current phase resolves
- Inbound: every entity in past phases has at least one inbound
  edge OR is documented entry point
- Cross-artifact: hooks, agents, skills, commands all wire

### 9. The review is paired with the verification block

Per `verify-before-claim.md`, completion claims include the
review's findings:

```text
Verification (this turn):
…
Principal-level review (this turn, per
principal-level-review-after-each-phase.md):
- Wave A: ✅ ✅
- Wave B: ⚠️ (deferred drift item: <X>)
- Cross-phase wiring: ✅
- ❌ Blockers: 0
```

### 10. Plans with explicit per-wave reviews

Multi-wave plans declare a "Review" step between each wave in
`§7 — Wave sequencing`. The review step does:

- Run the §1-§9 checks
- Update plan file with findings
- Surface ❌ Blockers via AskUserQuestion before next wave

## Anti-patterns

### Anti-pattern 1: "We'll come back to it later"

Forbidden. Every drift item gets either:

- Immediate remediation
- A scheduled remediation wave (in plan)
- An ADR explaining the deferral

### Anti-pattern 2: "We already verified that phase"

The review is BACKWARD. Past verification stays valid only if NO
subsequent phase touched the artefact. If touched, re-verify.

### Anti-pattern 3: "Just check the new phase"

Forbidden. Review covers ALL past phases.

## Cross-references

- `principal-level-mandate.md` — depth bar per artefact
- `verify-before-claim.md` — claim ↔ verification pairing
- `plan-execution-progress.md` — per-phase progress reports
- `plan-completion-before-push.md` — push gate after all reviews
  green
- `continuous-learning-mandate.md` — learning candidates emit per
  review
- `code-graph-validation.md` — mechanical wiring checks
- `adr-template.md` — ADR format for deferrals

## Why this rule exists

Without per-phase backward review:

- Past phase decisions drift quietly
- Wiring breaks between phases (e.g., Phase L emits events Phase M
  consumes; without a review, a Phase L topic-name change would
  silently break Phase M)
- Principal-level depth degrades over a long plan
- "Done" claims aggregate to a false sense of completeness

The cost of the review is one tool call's worth of analysis per
phase. The cost of NOT reviewing is multi-wave drift discovered
only at Wave K plan-completion — late, expensive, and
trust-eroding.

User directive (verbatim, 2026-06-04): "add this to the memory and
update rules to always do always do a review of all past
phases/task after each phase/task to ensure it is top/principal
level job and everything is properly wired."

## Learning hooks

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- Phase completion without review artefact written (rule 6
  violation)
- Drift item left without remediation OR scheduled (rule 1
  anti-pattern)
- Past phase touched without re-verify (rule 2 violation)
- Wiring break discovered downstream that earlier review would
  have caught (rule 4 weakening)
- Council Phase 2 re-check skipped (rule 7 weakening)

**Refinement candidates**:

- New row in the review template when a recurring drift class
  emerges
- Tightening of the "review fires" trigger (rule 1) when
  missed-trigger cases recur
- New cross-reference when a sister rule provides a gate the
  review depends on
