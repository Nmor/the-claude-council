# council-maintenance: Hooks council and depth

> Learning hooks for the Council-mechanism and depth-floor rules — who speaks, on what trigger, at
> which model tier, to what standard. Pointed at by the `## Per-rule learning hooks` routing table
> in `../SKILL.md`.
>
> **Size budget: 10 KB** — `token-budget.mjs --check`.

## `continuous-learning-mandate.md`

Per this very rule (self-referential):

**Signals to watch**:

- Council-mediated task ends without a `learning-candidate` event emitted (rule 1 violation)
- Candidate auto-applied without user review prompt (rule 2 violation — silent mutation)
- Candidate observed in 2+ workspaces but never promoted to global (rule 3 weakening — promotion
  gap)
- Global rule contradicted 5+ times in 30 days but not flagged for refresh (rule 5 weakening —
  demotion gap)
- New rule / skill / agent shipped without `## Learning hooks` section (rule 6 violation —
  meta-rule)
- `/learn` invoked but no candidate batch surfaced (continuous-learning-v2 skill drift)
- Council Phase 2 ends without "Learning signals expected" output (rule 9 weakening)
- Council Phase 3 ends without "Learning event emitted" confirmation (rule 9 weakening)
- Learning-events.jsonl accumulates > 100 unreviewed candidates (review cadence weakening)
- Rule downgraded to "advisory" but still cited as enforced in agents / skills (status drift)

**Refinement candidates**:

- Tightening of the confidence-threshold table when low-confidence approvals prove load-bearing
- New event-schema field when a recurring learning class needs additional context (e.g., session-id,
  parent-plan-slug, rule-affected list)
- New cross-reference when a sister rule changes the artifact shape the loop depends on
- Promotion of `/learn` from manual invocation to scheduled batch when the user's session cadence
  makes manual triggering miss candidates

## `council-default.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Task shipped without a Council verification block (Council bypass attempted)
- Core Five division speaks in boilerplate ("looks fine") instead of real analysis (rule 1
  weakening)
- Extended Division trigger matched but Division did not engage (council-triggers.md miscalibration)
- Tiebreaker invoked but the outcome contradicts the tiebreaker matrix (matrix needs review)
- Veto invoked without explicit documentation in the consensus block (rule 5 enforcement weak)
- Abbreviated mode degraded into zero-Council in practice (speed-mode discipline weak)
- Post-implementation review skipped on a Council-mediated task (rule 10 violation)

**Refinement candidates**:

- New trigger row in `council-triggers.md` when a Division consistently engages on a pattern that
  wasn't in its trigger ruleset
- Tightening of the tiebreaker matrix when an ambiguity surfaces in practice
- New row in the task-class table when a new shape of work needs its own Council pacing
- New cross-reference when Phase 0 / Phase 1 / Phase 2 / Phase 3 protocol gains a load-bearing
  artifact

## `council-triggers.md`

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

## `model-tier-selection.md`

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- A role hardcoded to a model instead of resolved via its ladder (rule violation)
- Fable selected for a `security-and-regulated-review` role (exclusion breached)
- Fable routed to mechanical / search / routine review (ladder-floor ignored — waste)
- A runtime model-unavailable / refusal handled by silent downgrade (no note)
- Availability config assumed present without the safe default fallback
- The same install repeatedly hitting a resolved model that isn't actually available (declaration
  drift — prompt the user to fix the config)

**Refinement candidates**:

- New ladder row when a new Council role class emerges
- New tier row when Anthropic ships a new model (re-cite + re-order capability)
- Tightening of an exclusion when a model class proves unfit for a role
- Promotion of a "metered/credits" nuance into the availability config if
  cost-throttling a gated model per-task proves load-bearing

## `principal-level-mandate.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New agent file written without all required body sections (depth-floor violation)
- New skill SKILL.md < 500 words (shallow-stub floor breached)
- Skill missing standards citations with version + section (rule "Standards Cited" weakening)
- "Best practices recommend" / "studies show" / "common patterns" used without primary source
  (non-cited claim recurrence)
- Council Division emits bare boilerplate ("looks fine") or fails to engage its domain — the
  coverage-guarantee violation (mere brevity is NOT a violation when the one-clause gated verdict
  shows real engagement)
- Tactical-only contribution shipped without trade-off + failure-mode + verification signal (breadth
  weakening)
- Single-domain reasoning on a cross-cutting topic (e.g., security agent ignoring compliance
  overlap)
- Project-specific names / paths / vendor identifiers found in a global artifact (rule "Banned in
  global" violation)
- Agent's `model:` is `sonnet` for a domain that warrants opus depth (depth-vs-model mismatch)
- Redirect stub left undocumented as such (implicit shallowness)

**Refinement candidates**:

- New required section in the agent / skill template when a recurring depth gap surfaces (e.g., new
  "Cost model" section, new "Rollback signal" section)
- Tightening of the word-count floor when 500-word skills consistently produce thin outputs
- New banned vocabulary entry when a non-cited claim shape recurs
- New cross-reference when a sister rule (rule-authoring-global-vs-project,
  continuous-learning-mandate, verify-before-claim) provides a gate the depth audit must run
- Model-tier reassignment when an agent's track record shows opus is genuinely warranted (or
  genuinely overkill)

## `task-intake-due-diligence.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Task shipped without the always-fire core (rule violation)
- A domain question's trigger matched but the question didn't fire (gating gap —
  the trigger map or `council-triggers` needs the link)
- A domain gap shipped (e.g. an a11y / compliance miss) whose trigger SHOULD have
  fired the question (trigger too narrow — broaden, per over-include principle)
- A core question consistently answered shallowly (depth needs reinforcement)
- N/A rows reappearing in intake output (gating not applied — the rewrite regressed)
- Online research (Q29) skipped on an external integration

**Refinement candidates**:

- Move a domain question into the always-fire core if it proves near-universal in
  practice (or the reverse — demote a core question to gated if it's often N/A)
- New domain question + trigger when a missed dimension recurs in 2+ retrospectives
- Tightening of a trigger when a domain question fires but is consistently N/A
- New cross-reference when a sister rule's gate is the proof a question depends on
