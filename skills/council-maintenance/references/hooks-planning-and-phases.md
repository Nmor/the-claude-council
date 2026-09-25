# council-maintenance: Hooks planning and phases

> Learning hooks for the plan-authoring, plan-execution and phase-closeout rules. Pointed at by the
> `## Per-rule learning hooks` routing table in `../SKILL.md`.
>
> **Size budget: 9 KB** — `token-budget.mjs --check`.

## `competitive-parity-per-phase.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Phase / wave closed without the Step 6 parity output block (rule 1 +
  rule 2 violation)
- Reference competitor set unchanged for > 12 months (rule 8 signal)
- New feature dimension shipped without a discovery filter in the
  same wave (Discovery-parity rider violation)
- Parity backlog rows without a next-wave target (rule 7 violation)
- Press-summary citation used as sole source (rule 5 violation)
- Solo phase that touched user-visible surface skipped Step 6 as
  "abbreviated" (rule 9 weakening)

**Refinement candidates**:

- New reference-competitor row when a material new entrant emerges
- New Discovery-parity rider row when a feature class ships without
  a matching filter surface
- Tightening the cadence when a wave's parity gap re-opens because
  the scan didn't catch a competitor's shipment
- Promotion to a mechanical hook when the "did the wave-close block
  include Step 6?" check can be automated (grep the plan file for
  "Competitive parity (this")

## `plan-completion-before-push.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `git push` executed while plan phases still pending (rule 2 violation — push gate weakening)
- Active plan does not declare `commit-policy` in its Context (rule 1 violation — implicit policy
  drift)
- "Push" inferred from ambiguous user language ("ship", "ready", "looks good") without explicit
  confirmation (rule 10 weakening)
- Bug-fix exception claimed without an actual live-failure / explicit-override pair (rule 3 misuse)
- Multi-repo push approval reused across repos without per-repo confirmation (rule 7 weakening)
- `git push --tags` or PR creation done mid-plan without explicit per-action authorization (rules
  8 + 9 weakening)
- Verification block missing or stale at push time (rule 6 violation — claim without proof)
- `--no-verify` / `--no-gpg-sign` used to bypass hooks (rule 5 violation)

**Refinement candidates**:

- New row in the "exception" rule when a recurring time-pressure class (security incident, regulator
  deadline) emerges with documented user-side authorization shape
- Tightening of the ambiguous-language list when a new phrase ("let's go", "all good") proves to
  silently authorize pushes
- New cross-reference when a sister rule (no-overclaim, verify-before-claim, no-silent-drops)
  provides a pre-push gate
- New row in the push-decision response shape when multi-repo / multi-branch / multi-tag pushes
  recur

## `plan-execution-progress.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Phase-header announcement missing before first tool call of that phase (rule 1 weakening)
- Bulk change (5+ files, directory delete, large data move) reported without before/after counts
  (rule 2 violation)
- Verification block missing from a phase end (rule 3 violation)
- Phase progress update ends without an explicit next-step line (rule 4 weakening)
- Commit boundary reached without SHA + subject + branch + file count in the progress update (rule 5
  weakening)
- Blocker hit and surfaced as "something went wrong" without root cause + recovery direction (rule 6
  violation)
- Per-tool-call narration omits phase tag in long multi-phase sessions (rule 7 weakening)
- Plan file not updated after a phase completes (rule 8 weakening — frozen contract anti-pattern)
- Phase skipped or reordered without explicit user-visible justification (rule 10 violation)

**Refinement candidates**:

- New row in the canonical progress-update shape when a new artifact class (commit / tag / push /
  migration) needs reporting
- Tightening of the "bulk change" threshold (currently 5 files) when small-batch silent edits prove
  load-bearing
- New cross-reference when a sister rule (verify-before-claim, no-silent-drops) provides a per-phase
  gate
- New blocker-shape template when a recurring blocker class (auth-expired, dep-not-installed,
  env-not-set) emerges

## `plan-task-breakdown.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Phase header lacks a sub-step or task list (granularity rule violation)
- A "task" in the plan spans > 4 hours of work (atomic-task threshold breached)
- Plan has < 10 tasks for non-trivial work (rule 2 weakening)
- Tasks describe activity ("investigate X") instead of outcome ("identify Y; report count")
- Verification predicate missing from a task row (rule 4 weakening)
- Plan completes without a bloat-removal phase (rule 10 violation)
- Mid-execution work added without updating the plan + TodoWrite (rule 9 weakening)
- TodoWrite list has phase-level entries for a 50+-task plan with no task-level mirror

**Refinement candidates**:

- New row in the task-row shape table when a new artifact kind recurs (e.g., new IaC type, new
  schema migration template)
- Tightening of the atomic-task time threshold when 4h tasks consistently overrun
- New cross-reference when a sister rule (verify-before-claim, no-silent-drops, proper-fixes-first)
  provides a gate the task list must verify
- New bloat-class row in the rule 10 table when a recurring leftover class emerges from rebuilds
  (stub redirects, dead config keys, etc.)

## `post-phase-retrospective-review.md`

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
