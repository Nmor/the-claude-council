# Phase Retrospective Sweep (Always-On, Global)

> Auto-fires on every file. Sister to
> `post-phase-retrospective-review.md` (the broader adversarial
>
> - multi-division retrospective discipline),
> `verify-before-claim.md` (current-phase verification gate),
> `plan-execution-progress.md` (per-phase progress reporting),
> `code-graph-validation.md` (wiring integrity),
> `principal-level-mandate.md` (depth floor),
> `no-overclaim.md` (claim discipline).

## Core Principle

**After every phase or task completes — before declaring it
done — the agent runs a five-step sweep: forward verification
of the current phase, retrospective re-verification of every
prior phase, wiring verification of touched + 2-hop closure,
principal-level audit of new work and any prior work it
touches, and capture of any follow-ups discovered. The sweep
is the discipline that keeps every prior delivery green as
new work lands on top — preventing "phase N broke phase N-3
silently," the failure mode that turns a 20-phase plan into
a 40-phase plan with cascading rework.**

This rule encodes the mechanics; `post-phase-retrospective-review.md`
encodes the broader adversarial reasoning and multi-division
audit shape. Run BOTH at every phase closeout. The sweep here
is the operational checklist; the retrospective-review is the
quality-of-judgment standard the sweep operates at.

## The five-step sweep

Every phase / task closeout, in order:

### Step 1 — Forward verification (current phase)

Run the current phase's verification block per
`verify-before-claim.md`. Required gates depend on the claim
class (see `verify-before-claim.md` rule 7 table), at minimum:

- Build / type-check / compile clean on touched code
- Test gate (unit + integration when applicable) green
- Lint gate green
- IDE diagnostics zero
- Manual verification (UI smoke / API probe / perf trace)
  when applicable
- Docs-sync gate per `docs-sync-with-code.md` when docs
  touched

The verification block is captured in the response BEFORE the
claim phrase (per `verify-before-claim.md` rule 2).

### Step 2 — Retrospective verification (every prior phase)

Re-run every prior phase's verification gate against the
CURRENT branch. The check uses a DIFFERENT gate than the prior
phase's own gate (per `post-phase-retrospective-review.md`
rule 2) — the prior gate is known to be sufficient for the
prior state but the current state has new code on top of it.

For each prior phase:

- Re-run the gate that prior phase declared as its
  verification predicate
- Add a different-angle gate: cross-file grep for the OLD
  pattern (must return 0); end-to-end trace through the
  user-visible surface; integration probe across the affected
  cross-repo seam

If any prior gate regresses, the current phase is NOT done.
Fix the regression in-stream before proceeding. Do not
silently skip the prior phase's gate; absent gates are
explicit ("Phase N-3 retrospective gate not available because
`<specific reason>`") with a follow-up captured in Step 5.

### Step 3 — Wiring verification (code-graph closure)

Run incremental code-graph validation per
`code-graph-validation.md` across the touched surface + 2-hop
closure:

- Every outbound import / call / route / handler / schema
  column / env var / IAM action / agent file / skill file /
  hook script / rule citation / docs link resolves
- Every touched file has at least one inbound edge OR is a
  documented entry point
- Cross-artifact graph closes: hook event → script path
  exists; agent in trigger files → file exists; skill in
  auto-skills → directory exists; command → agent exists
- No `BUG(unwired-<slug>)` markers left without the user
  being explicitly informed

The verification block names the counts:
`dangling: N, dead: M, unwired: K`. Zero on each row OR
explicit user-approved deferral with capture in Step 5.

### Step 4 — Principal-level audit

Re-confirm the principal-level mandate per
`principal-level-mandate.md` for the new work AND any prior
work the new work touches:

- **Breadth**: cross-cutting reasoning across
  architecture + security + ops + data + product + business
  - compliance
- **Depth**: standards cited with version + section, not
  vague references
- **Sources**: primary-source citations for any external
  integration (per `official-docs-first.md`)
- **Trade-offs**: what is being given up + the inflection
  point at which the choice flips
- **Failure modes**: concrete FMEA rows (failure / effect /
  severity / detection / mitigation) for new components
- **Outcome ownership**: verification signal that confirms
  the decision was right

For touched-prior work: re-confirm the prior phase's
principal-level depth still holds in the merged state — no
silent regressions of standards citations, failure modes,
or trade-off analyses.

For new work: pair with the multi-division adversarial audit
per `post-phase-retrospective-review.md` rule 8 (Council
divisions / specialized reviewers fire in parallel,
adversarial by default — find what's wrong, not confirm it
works).

### Step 5 — Capture follow-ups

Anything discovered during steps 1-4 that needs work becomes
a NEW task on the appropriate phase, never silently dropped
(per `no-silent-drops.md`). Each follow-up names:

- Which phase / area it belongs to
- The verification predicate when complete
- The owner (current session OR explicit defer)
- The cross-reference to the discovery (which step surfaced
  it)

Follow-ups land in:

- The active plan file's appropriate phase task list (per
  `plan-task-breakdown.md` rule 9 — plans grow during
  execution)
- The TodoWrite list (mirrored per
  `plan-execution-progress.md` rule 9)
- `<workspace>/.claude/audits/learning-events.jsonl` (per
  `continuous-learning-mandate.md` rule 1) when the
  follow-up is a learning candidate

Silent absorption of follow-ups into "I'll handle it later"
is forbidden. Either land them this turn or capture them
explicitly with a re-run date.

## The sweep block

Every phase / task closeout's verification block appends a
sweep summary:

```text
Phase retrospective sweep (this turn):
  Step 1 (forward): <gates passed this turn>
  Step 2 (retrospective): N-1 ✓ via <gate>; N-2 ✓ via <gate>;
                          N-3 REGRESSED — fixed in <commit>
  Step 3 (wiring): outbound N/N resolve; inbound 0 orphans;
                   cross-artifact integrity green
  Step 4 (principal audit): breadth ✓ depth ✓ sources cited;
                            multi-division verdict: PASS
  Step 5 (follow-ups): <count> captured (see plan §<phase>)
```

A phase that lacks this block is a phase that didn't close
properly. That is an `no-overclaim.md` violation.

## When the sweep escalates

The sweep escalates to STOP-THE-LINE when any of:

- A prior phase's gate regresses AND the cause is not in the
  current phase's changes (touched files unrelated)
  → indicates an upstream dependency drifted; surface the
  drift to the user before continuing
- The principal-level audit finds CRITICAL or HIGH severity
  in new OR prior work (per
  `post-phase-retrospective-review.md` rule 8 severity gate)
  → fix + re-audit; risk-accept needs the user's written
  acceptance recorded in the plan
- The wiring check finds a control claimed by the design
  that is NOT called on the live path (inert validator,
  prompt-only gate, dead security code)
  → phase NOT done; wire the control or surface the gap
- Follow-ups exceed the capacity of the current session
  → batch the deferred follow-ups into a new phase or task
  group with explicit user awareness

NEVER silently proceed past an escalation signal. The cost
of stopping the line is one turn of surfacing; the cost of
proceeding past a regression is cascading rework.

## Anti-patterns

### Anti-pattern 1: skipping step 2

The forward verification (step 1) passes, agent claims
phase done without re-running prior phases. The next phase's
changes silently regress phase N-2. Caught only when the
user reports a regression weeks later.

### Anti-pattern 2: same-gate retrospective

Step 2 runs the same gate the prior phase already passed,
finds it still green, declares the prior phase re-verified.
The gate was already known sufficient for the prior state —
the current state needs a different angle. The retrospective
must use a different gate per
`post-phase-retrospective-review.md` rule 2.

### Anti-pattern 3: principal audit as rubber-stamp

Step 4 says "principal-level audit ✓" without naming what
was checked. Per
`post-phase-retrospective-review.md` rule 6, that's a
violation of the principal-level floor. The audit names
the specific layer each prior phase's gate did NOT exercise
and the specific check that would close the gap.

### Anti-pattern 4: silent follow-up drop

Step 4 surfaces a gap; agent fixes the immediate symptom but
doesn't capture the underlying class of gap as a follow-up.
The same gap class recurs in the next phase. Per
`no-silent-drops.md`, every discovered follow-up gets a
durable record.

### Anti-pattern 5: forward-only verification

Phase ships with only step 1 (current phase gates) green;
steps 2-5 silently skipped because "the prior phases were
already verified." The verification was valid for the prior
state; the current state needs the sweep.

## Cross-references

- [`common/post-phase-retrospective-review.md`](./post-phase-retrospective-review.md)
  — broader adversarial retrospective discipline; multi-division audit shape
- [`common/verify-before-claim.md`](./verify-before-claim.md) —
  forward verification (step 1) requirement
- [`common/plan-execution-progress.md`](./plan-execution-progress.md)
  — phase-boundary progress reporting; sweep block appended
- [`common/code-graph-validation.md`](../../rules-library/common/code-graph-validation.md)
  — wiring verification (step 3)
- [`common/principal-level-mandate.md`](./principal-level-mandate.md)
  — depth floor for principal audit (step 4)
- [`common/no-overclaim.md`](./no-overclaim.md) — sweep block
  is part of the proof a phase is done
- [`common/no-silent-drops.md`](../../rules-library/common/no-silent-drops.md)
  — follow-up capture (step 5) discipline
- [`common/plan-task-breakdown.md`](./plan-task-breakdown.md)
  — follow-ups land as new tasks in the active plan
- [`common/continuous-learning-mandate.md`](./continuous-learning-mandate.md)
  — recurring sweep findings become learning candidates
- [`common/done-criteria.md`](./done-criteria.md) — the
  per-language gates the sweep runs
- [`common/official-docs-first.md`](./official-docs-first.md)
  — primary-source citations in step 4 audit

## Why this rule exists

The failure mode this prevents: "phase N broke phase N-3
silently." The agent ships a phase with green current-phase
gates, the user discovers weeks later that an earlier phase's
behavior regressed because the new work touched a shared
seam. The rework cost is the original phase's effort PLUS
the regression diagnosis PLUS the re-fix PLUS the trust loss.

The sweep cost is one turn of structured verification per
phase. The benefit is every prior phase stays green as new
work lands.

The user-stated directive (verbatim, 2026-06-04): **"add this
to the memory and update rules to always do always do a review
of all past phases/task after each phase/task to ensure it is
top/principal level job and everything is properly wired."**

This rule encodes that directive as a five-step mechanical
checklist; the broader judgment lives in
`post-phase-retrospective-review.md`. Run both at every
phase closeout.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](./continuous-learning-mandate.md):

**Signals to watch**:

- Phase closeout without the five-step sweep block (rule violation pattern)
- Step 2 (retrospective) used the same gate as the prior phase's verification (different-angle gate requirement weakening)
- Step 3 (wiring) skipped on a phase that touched cross-repo seams (code-graph-validation discipline weakening)
- Step 4 (principal audit) reported as "PASS" without naming the layer each prior phase's gate did NOT exercise (principal-level floor weakening)
- Step 5 (follow-ups) absorbed silently into "I'll handle it later" without capture in plan / TodoWrite / learning-events (no-silent-drops violation)
- Prior-phase regression discovered by the user (not by the sweep) — the sweep missed it (sweep gate-roster needs extension)
- Same regression class across 2+ phase boundaries without an automated check added (recurring-miss escalation per `post-phase-retrospective-review.md` rule 5)
- Stop-the-line signal proceeded past silently (escalation discipline weakening)
- Sweep block missing the prior phase's gate name (step 2 specificity weakening)

**Refinement candidates**:

- New gate-roster row when a new artifact class needs a retrospective gate (e.g., per-event-stream contract, per-locale UI string)
- Tightening of the "different-angle gate" requirement when same-gate retrospectives prove repeatedly insufficient
- New cross-reference when a sister rule provides a gate the sweep depends on
- New escalation signal when a recurring stop-the-line condition surfaces (currently 4 — may extend)
- Automated check the rule mandates be added when a recurring miss class becomes load-bearing (e.g., lint rule for inert validators, build assertion for resource-leak patterns)
