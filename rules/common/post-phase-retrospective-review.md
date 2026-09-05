# Post-Phase Retrospective Review Rule (Always-On, Global)

> **Canonical, consolidated 2026-07-23.** This rule absorbs and replaces
> `principal-level-review-after-each-phase.md` and `phase-retrospective-sweep.md`
> (both now redirect stubs). It is the single source of truth for what happens at
> every phase / task boundary. Sister to `verify-before-claim.md` (current-phase
> gates), `plan-execution-progress.md` (per-phase progress block),
> `done-criteria.md` (the per-language gates), `principal-level-mandate.md` (depth
> floor), `code-graph-validation.md` (wiring integrity), `no-overclaim.md` (claim
> discipline), `no-silent-drops.md` (follow-up capture), `council-default.md`
> (the divisions that run the adversarial audit).

## Core Principle

**Every phase / task boundary closes with a five-step sweep, run BEFORE any
"done" claim: (1) forward verification of the current phase, (2) retrospective
re-verification of prior phases — a cheap mechanical sweep across all, plus a deep
different-gate audit of the ones the change actually reaches, (3) wiring verification
across the touched surface + 2-hop closure, (4) a multi-division adversarial
principal-level audit of the new work and any prior work it touches, and (5)
capture of every follow-up discovered. The current phase's own green gates are
necessary but NEVER sufficient — "CI green" proves only what CI exercises. The
sweep proves the phase is correct + fully wired AND that prior phases still hold
after the new changes landed. This is a top-level job; skipping it equals
skipping verification per `verify-before-claim.md`.**

## Why this rule exists

The failure mode: **"phase N broke phase N-3 silently."** A phase ships with
green current-phase gates; weeks later the user finds an earlier phase's
behaviour regressed because the new work touched a shared seam. Rework cost =
original effort + regression diagnosis + re-fix + trust loss. Recurring incident
classes, each CI-green with the bug in a layer the gates never exercised:

1. **UI fix that passes CI but renders wrong** — a CSS override pulled the
   element off-viewport; gates never rendered the live component. Surfaced by a
   human on a real screen, PRs later.
2. **Rename verified only at the edited sites** — the diff sites were fixed, but
   a whole-file / repo re-grep would have surfaced other call paths still on the
   old name.
3. **Round-after-round static-analysis mitigation** — each sanitiser looked
   right in isolation; a retrospective on round N before drafting N+1 would have
   surfaced the recurring wrong assumption earlier.
4. **Green phase hiding inert controls** — full green gates + "100% complete",
   yet a multi-division audit found in that same code: a CRITICAL security
   control **never wired** (unit-tested, but nothing on the live path called it);
   clients **opened but never closed** (leaks); a "consent-gated" flow with **no
   consent check in code**; an undocumented cross-border PII transfer; a
   swallowed crash. Unit tests covered units, not the activation path /
   lifecycle / cross-repo contracts.

In every case the CURRENT phase's verification was green; the bug lived in a
layer the gates didn't exercise. The sweep is the discipline that catches it.

## The five-step sweep (the operational spine)

Every phase / task closeout, in order. The Hard Rules below qualify the DEPTH
each step runs at. Steps 1-5 run at every phase/task boundary; **Step 6**
(competitive-parity, per `competitive-parity-per-phase.md`) is the sixth step,
run deep at each wave/part-close (light per interior phase).

### Step 1 — Forward verification (current phase)

Run the current phase's verification block per `verify-before-claim.md` rule 7
(gates depend on claim class); at minimum: build / type-check clean on touched
code; test gate green; lint green; IDE diagnostics zero; manual verification (UI
smoke / API probe / perf trace) when applicable; docs-sync gate when docs
touched. The block is captured BEFORE the claim phrase.

### Step 2 — Retrospective verification (dependency-scoped: deep where the change reaches + cheap sweep across all)

Re-auditing EVERY prior phase *deeply* at every boundary is O(n²) and spreads
attention thin — which produces rubber-stamping ("audit fatigue"), the opposite of
what the retrospective is for. Scope by dependency instead, so no phase is
unaudited but the deep attention lands where a regression is actually possible:

- **Cheap mechanical sweep across ALL prior phases** — Step 3's code-graph closure
  already covers this near-free (dangling / dead / unwired across the whole
  surface). Every prior phase gets this baseline integrity check.
- **Deep, different-gate retrospective on the dependency-connected set** — the
  prior phases the current change actually REACHES: shared files, shared schema /
  events / API contracts, upstream callers, downstream consumers (via the
  code-graph). A phase the current change cannot reach cannot have been regressed
  by it; spend the deep audit where a regression is possible. If the dependency
  graph is uncertain, WIDEN the deep set (over-include, per the trigger philosophy
  in `council-triggers.md`).

For each phase in the deep set: re-run its declared predicate AND add a
different-angle gate (Hard Rule 2) — cross-file grep for the OLD pattern (must
return 0), end-to-end trace through the user-visible surface, or an integration
probe across the affected cross-repo seam. If any prior gate regresses, the
current phase is NOT done: fix in-stream before proceeding. Absent gates are
stated explicitly ("Phase N-3 retrospective gate unavailable because `<reason>`")
with a follow-up captured in Step 5 — never silently skipped. A user-reported
regression in a phase you scoped OUT of the deep set means the dependency graph
was wrong — widen it and re-run (Hard Rule 3).

### Step 3 — Wiring verification (code-graph closure)

Run incremental code-graph validation per `code-graph-validation.md` across the
touched surface + 2-hop closure:

- Every outbound reference resolves — import / call / route / handler / schema
  column / env var / IAM action / agent file / skill file / hook script / rule
  citation / docs link.
- Every touched file has ≥1 inbound edge OR is a documented entry point.
- Cross-artifact graph closes: hook event → script exists; agent in trigger
  files → file exists; skill in auto-skills → directory exists; command → agent
  exists.
- No `BUG(unwired-<slug>)` markers left without the user being told.

Report counts: `dangling: N, dead: M, unwired: K` — zero on each OR explicit
user-approved deferral captured in Step 5.

### Step 4 — Multi-division principal-level audit

Re-confirm the principal-level mandate for the new work AND any prior work it
touches, via a **multi-reviewer, adversarial** audit (Hard Rules 6 + 8) — not a
single self-review. Depth axes per `principal-level-mandate.md`: breadth
(architecture + security + ops + data + product + business + compliance);
depth (standards cited with version + section); sources (primary-source
citations per `official-docs-first.md`); trade-offs (what's given up + the
inflection point); failure modes (concrete FMEA rows); outcome ownership (the
signal that confirms the decision was right). For touched-prior work: confirm the
prior phase's depth still holds in the merged state — no silent regression of
citations, failure modes, or trade-off analyses.

### Step 5 — Capture follow-ups

Anything discovered in Steps 1-4 that needs work becomes a NEW tracked task,
never silently dropped (per `no-silent-drops.md`). Each names: the phase / area,
the completion predicate, the owner (this session OR explicit defer), and the
cross-reference to the discovery. Follow-ups land in the active plan's phase task
list, the TodoWrite list, and `<workspace>/.claude/audits/learning-events.jsonl`
when a learning candidate. "I'll handle it later" without a durable record is
forbidden.

### Step 6 — Competitive-parity scan (per `competitive-parity-per-phase.md`)

At a phase / wave / part close, audit what the phase just shipped against what the
leading competitors already have, and file the gaps as tracked tasks in the next
wave. Light per phase, deep per wave-close, cumulative against ALL prior phases (not
just the latest), with the reference competitor set locked per plan. The scan
produces a durable `Competitive parity (this phase/wave)` block (Just shipped →
Competitor scan → New parity tasks → Backlog-with-rationale); absent block = absent
step. New feature dimensions ship their discovery/filter surfaces in the SAME wave
(the Discovery-parity rider) — built-but-hidden parity work delivers zero value. The
full trigger, cadence, reference-set, and output-shape rules live in
`competitive-parity-per-phase.md`; this step is its entry point in the sweep.

## Hard rules (the depth + discipline each sweep step runs at)

### 1. The sweep fires at EVERY phase boundary

A phase boundary is any of: a wave / phase completion; a task ticked in TodoWrite
or the plan file; a commit milestone; a push gate; a Council Phase 2 → Phase 3
transition. Every one closes with the five-step sweep + the sweep block below.

### 2. The retrospective uses DIFFERENT gates than the current phase

The prior gate is known sufficient for the prior state; the current state has new
code on top. Add cross-file re-grep for the removed pattern (confirm the new
pattern WINS, not coexists), an end-to-end trace of the affected user-visible
surface (UI: render on a live build / probe; backend: round-trip through the
authoritative path — cookie + body + audit + DB), and an integration-sanity
check on the touched layer (callers + tests + docs on a rename; cascade / bundle
/ mount order on frontend).

### 3. User-reported regressions mean the retrospective was insufficient

When the user reports "the prior fix didn't work" / "the bug is still there":
STOP the current phase; re-run the retrospective for the named prior phase with a
DIFFERENT gate (the prior gate is proven insufficient); identify the layer that
gate missed and add an automated check (lint rule, probe, build assertion) that
would have caught it; only then resume. NEVER argue "CI was green so the fix must
be correct" — CI green proves what CI exercises, nothing more.

### 4. Mechanical cross-phase wiring checklist

Beyond Step 3's graph closure, mechanically confirm the phase-to-phase seams:
Phase N's declared "consumers" actually exist; N's "produces" matches the
downstream expected input; N's data structures are consumed correctly by N+1;
event names match producer + consumer; API contracts match downstream callers;
schema migrations don't break a prior phase's queries.

### 5. Findings taxonomy — fix ❌ before the next phase

Every reviewed phase gets one of: **✅** verified principal-level + wired
correctly; **⚠️** drift requiring re-work; **❌** wiring broken / phase BLOCKED.
❌ blocks the next phase until fixed. ⚠️ becomes top-of-todo for the next phase.
Severity from the adversarial audit (Rule 8) gates the same way: CRITICAL / HIGH
open → phase NOT done; MEDIUM / LOW → deferred only as an explicit tracked task;
risk-accepting a CRITICAL / HIGH needs the USER's written acceptance recorded in
the plan.

### 6. Principal-level is the floor for the retrospective itself

The retrospective names the SPECIFIC layer each prior phase's gate did NOT
exercise, and the SPECIFIC check (gate / probe / lint / build assertion) that
closes the gap. It cites file:line where each prior change lives and where the
retrospective confirmed it still holds. It never uses vague verbs ("looks fine",
"seems wired"). "All prior phases verified ✓" without naming what was checked is
a violation.

### 7. Council Phase 2 consensus re-check

For each materially-touched prior phase, re-run the Council Phase 2 question: does
the original GO/NO-GO still hold given new information? Did a veto-able finding
emerge later? Are the tiebreakers still valid? A prior GO that no longer holds is
a ❌ blocker.

### 8. Multi-division adversarial audit of the CURRENT phase's own work

Before the current phase is marked done / committed, it passes a **parallel,
adversarial** audit — each reviewer's job is to find what's wrong, not confirm it
works. Delegate to the relevant Council divisions / specialized reviewers per
`council-default.md`: architecture + security ALWAYS; code / async-quality on any
code; compliance / privacy / residency on PII / regulated / cross-border;
AI/ML ethics on any ML / LLM / automated-decision surface; infra / ops on IaC /
deploy; data + cost as triggered. **"Everything wired" is an explicit objective**
(per `code-graph-validation.md`): every control the design CLAIMS is actually
called on the live path (no inert validators, no prompt-only gates, no dead
security code); every resource opened in construction is closed on shutdown
(lifecycle symmetry); every producer↔consumer contract matches across repos;
nothing was silently dropped in a lift / refactor (diff against the source of
truth). Passing lint + type-check + tests is necessary but NEVER sufficient —
green gates routinely co-exist with non-functional controls, dropped wiring,
resource leaks, and compliance gaps no linter sees.

### 9. The retrospective stays OPEN through the user-verification window

When the work stream is user-facing AND the prior phase shipped a user-visible
fix, the retrospective stays OPEN until the user confirms the fix in the
user-visible surface. The agent's gates are not the ground truth; the user's
surface is. Carry `Retrospective state: OPEN (awaiting user verify of <surface>)`
until confirmed.

### 10. Add a permanent check for every recurring miss

When the sweep surfaces the SAME class of miss across multiple phases, add an
AUTOMATED check that catches it — e.g. recurring CSS-override miss → build
assertion that the override imports AFTER the file it overrides; recurring
audit-field forbidden-pattern → eslint rule forbidding those keys; recurring
"rendered element not visible" → a headless-browser probe asserting a visible DOM
node. The check converts a one-off find into a permanent guard.

### 11. Multi-PR work streams accumulate retrospective scope

When a stream spans multiple PRs, the retrospective re-audits EVERY prior PR in
the stream, not just the prior phase, and builds a "verified vs not" map (see the
PR-description format below). The map exposes what's not yet verified; a missing
gate is itself a refinement candidate per `continuous-learning-mandate.md`.

### 12. The review's output is a durable artefact

The backward sweep writes to
`<workspace>/.claude/audits/phase-review-<wave-id>-<timestamp>.md` (gitignored
per `project-scoped-artifacts.md`). It records the just-completed phase's
verification summary, the per-prior-phase ✅/⚠️/❌ status with the gate used,
the ❌ blockers (with owner + ETA), the ⚠️ drift (with deferred plan), and the
✅ cleared list.

### 13. Plans declare an explicit Review step between waves

Multi-wave plans carry a "Review" step between each wave in the wave sequencing.
It runs the five-step sweep, updates the plan file with findings, and surfaces
any ❌ blockers via AskUserQuestion before the next wave starts.

## When the sweep escalates (STOP-THE-LINE)

Escalate — surface to the user before continuing — when any of:

- A prior phase's gate regresses AND the cause is not in the current phase's
  changes → an upstream dependency drifted.
- The audit finds CRITICAL or HIGH severity in new OR prior work → fix + re-audit;
  risk-accept needs the user's written acceptance in the plan.
- The wiring check finds a control the design CLAIMS but that is NOT called on the
  live path (inert validator, prompt-only gate, dead security code) → wire it or
  surface the gap; phase NOT done.
- Follow-ups exceed the current session's capacity → batch them into a new phase /
  task group with explicit user awareness.

NEVER silently proceed past an escalation signal. Stopping the line costs one turn
of surfacing; proceeding past a regression costs cascading rework.

## Output formats

### The sweep block (appended to every phase-closeout verification block)

```text
Phase retrospective sweep (this turn):
  Step 1 (forward):       <gates passed this turn>
  Step 2 (retrospective): N-1 ✓ via <gate>; N-2 ✓ via <gate>;
                          N-3 REGRESSED — fixed in <commit>
  Step 3 (wiring):        dangling 0 / dead 0 / unwired 0; cross-artifact green
  Step 4 (audit):         reviewers: architecture, security, <as triggered>;
                          CRITICAL 0 / HIGH 0 / MEDIUM 3 (tracked) / LOW 5 (tracked);
                          controls-on-path ✓ lifecycle-symmetry ✓ cross-repo ✓;
                          verdict: PASS   (or BLOCKED — N CRITICAL/HIGH open)
  Step 5 (follow-ups):    <count> captured (see plan §<phase>)
  Retrospective state:    CLOSED   (or OPEN — awaiting user verify of <surface>)
```

A phase-closeout that lacks this block didn't close properly — an
`no-overclaim.md` violation.

### PR-description retrospective (every PR after the first in a stream)

```markdown
## Retrospective on prior PRs in this stream
- **PR #N (title)**: <what changed> — verified via <gate/probe>.
  Status: <closed / open-awaiting-verify / regressed-fixed-here>.

## Recurring miss class
If this PR corrects a layer a prior PR's verification did NOT exercise, name the
layer + the automated check this PR adds (or a follow-up to add it).
```

## Anti-patterns

- **Forward-only verification** — Step 1 green, Steps 2-5 skipped because "prior
  phases were already verified." The prior verification was valid for the prior
  state; the current state needs the sweep.
- **Same-gate retrospective** — Step 2 re-runs the gate the prior phase already
  passed. That gate is known sufficient for the prior state; use a different angle.
- **Audit as rubber-stamp** — "principal-level audit ✓" without naming the layer
  each prior gate did NOT exercise and the check that closes the gap.
- **"We'll come back to it later"** — every drift item gets immediate remediation,
  a scheduled remediation wave, or an ADR explaining the deferral.
- **"We already verified that phase"** — past verification stays valid only if NO
  subsequent phase touched the artefact; if touched, re-verify.
- **Silent follow-up drop** — fixing the immediate symptom without capturing the
  underlying gap class; the same class recurs next phase.
- **Proceeding past an escalation signal silently** — see STOP-THE-LINE.

## Cross-references

- `verify-before-claim.md` — Step 1 forward gates; claim ↔ verification pairing
- `plan-execution-progress.md` — the per-phase progress block the sweep appends to
- `done-criteria.md` — the per-language gates Steps 1-2 run
- `code-graph-validation.md` — Step 3 wiring closure
- `principal-level-mandate.md` — Step 4 depth floor (Rules 6 + 8)
- `council-default.md` — the divisions the Rule 8 adversarial audit delegates to
- `no-overclaim.md` — the sweep block is part of the proof a phase is done
- `no-silent-drops.md` — Step 5 follow-up capture
- `plan-task-breakdown.md` — follow-ups land as new tasks in the active plan
- `plan-completion-before-push.md` — push gate after all sweeps green
- `project-scoped-artifacts.md` — the durable phase-review audit location (Rule 12)
- `continuous-learning-mandate.md` — recurring misses become learning candidates
- `official-docs-first.md` — primary-source citations in the Step 4 audit
- `adr-template.md` — ADR format for deferrals

## Provenance

User directive (verbatim, 2026-06-04): **"add this to the memory and update rules
to always do always do a review of all past phases/task after each phase/task to
ensure it is top/principal level job and everything is properly wired."**

Consolidated 2026-07-23 from three overlapping rules
(`post-phase-retrospective-review.md` + `principal-level-review-after-each-phase.md` +
`phase-retrospective-sweep.md`) into this single canonical rule, per the
duplicate-rule guidance in `rule-authoring-global-vs-project.md` (search-and-reuse
before authoring a sibling; consolidate into the existing canonical + redirect the
duplicates). No gate was dropped: the five-step sweep, the mechanical wiring
checklist, the ✅/⚠️/❌ taxonomy, the durable audit artefact, the Council Phase-2
re-check, the STOP-THE-LINE escalation, and the multi-division adversarial audit
are all preserved.

## Learning hooks

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- Phase closeout without the five-step sweep block (Rule 1 violation)
- Step 2 re-used the same gate as the prior phase's verification (Rule 2 violation)
- Step 3 (wiring) skipped on a phase touching cross-repo seams (Rule 4 weakening)
- Step 4 reported "PASS" without naming the layer each prior gate did NOT exercise
  (Rules 6 + 8 principal-floor weakening)
- Step 5 follow-up absorbed into "I'll handle it later" without a durable record
  (`no-silent-drops.md` violation)
- User reports a regression the prior phase's gates "passed" (Rule 3 weakening)
- Multi-PR stream with no accumulated retrospective map (Rule 11 weakening)
- Same miss class across 3+ phases without an automated check added (Rule 10)
- User-visible fix marked "done" before user confirms (Rule 9 weakening)
- Council Phase 2 re-check skipped on a materially-touched prior phase (Rule 7)
- Durable phase-review artefact not written (Rule 12 violation)
- STOP-THE-LINE signal proceeded past silently (escalation weakening)

**Refinement candidates**:

- New gate-roster row when a new artifact class needs a retrospective gate
- New recurring-miss-class entry when 3+ phases hit the same class without a check
- Tightening of the "different-angle gate" requirement when same-gate retros recur
- New STOP-THE-LINE signal when a recurring escalation condition surfaces
- New cross-reference when a sister rule provides a gate the sweep depends on
