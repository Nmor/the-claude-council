# council-maintenance: Hooks claims and diagnosis

> Learning hooks for the claim-discipline and diagnosis rules — what proves a claim, what proves a
> root cause. Pointed at by the `## Per-rule learning hooks` routing table in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## `diagnose-before-fixing.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- A code change shipped to fix a runtime failure without a written proven root
  cause (rule 1 violation — guess-and-patch)
- A hypothesis coded without a refutation attempt first (rule 2 weakening)
- A diagnosis taken from a recording/replay/unit-test/default that diverges from
  the live path (rule 3 violation — validate-the-proxy)
- A speculative fix deployed while the suspect layer had no observability (rule 4
  — should have instrumented first)
- Multiple speculative changes stacked in one deploy/observation (rule 5)
- A comparison/SLO metric shipped without the dimension it exists to compare
  (rule 6 — blind comparison metric)
- A "fixed" claim without the before/after signal on the live path (rule 7 +
  `no-overclaim.md`)

**Refinement candidates**:

- New proxy class in rule 3's list when a fresh live-vs-proxy divergence bites
- New observability shape in rule 6 when a failure mode proves unobservable
- Promotion of a recurring instrument-first pattern into a language/stack skill
- New cross-reference when a sister rule provides a gate this discipline depends on

## `done-criteria.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- "Done" claims later proven incomplete (the checklist had a gap — capture which row was missed)
- Re-claiming "done" after the same gate failed in the prior turn (verification discipline weak)
- Verification block missing on a completion claim (no-overclaim.md enforcement weak)
- New language / runtime added to the project without a per-language section here (rule needs
  extension)
- Same gate repeatedly fired across services on different bug classes (gate name + scope might need
  split)
- Migration / refactor declared "done" then a follow-up reveals leftover references (mechanical
  sweep step needs reinforcement)

**Refinement candidates**:

- New per-language verification suite row when a language gains presence in the rebuild
- New checklist row when a missed dimension appears in 2+ retrospectives
- Tightening of any threshold (coverage, complexity, lint) when chronic miss observed
- New cross-reference when a sister rule's gate becomes part of every "done" decision

## `no-overclaim.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- "Done" claim issued without a verification block this turn (rule violation pattern)
- User challenges a completion claim and finds it wrong (re-affirm discipline weak)
- Strong-completion language ("100%", "shipped", "bulletproof") used without proof
- Same rhetorical phrase ("looks clean", "should be fine") recurring across sessions
- Verification block missing a gate that later proved load-bearing (gate roster needs extension)
- Re-claim after the same gate failed in the prior turn (verify-before-claim discipline weak)

**Refinement candidates**:

- New banned-phrase entry when a rhetorical claim recurs without proof
- New verification gate when a missed dimension produces a false "done" in 2+ retrospectives
- Tightening of the "verified this turn" definition when stale-verification incidents recur
- New cross-reference when a sister rule's gate is the proof a "done" claim depended on

## `validate-payloads-before-coding.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Parser/builder written without a live/fixture/schema validation of the shape (rule 1/3 violation)
- `data`/payload assumed list-vs-object and proven wrong later (anti-pattern recurrence)
- Test-write fired at production to learn a shape (rule 2 violation)
- PII probe committed or left in `/tmp` (rule 5 violation)
- Field reads empty in prod where data expected → shape was guessed (rule 6 signal)
- Completion claim on an integration without the payload-validation block (verification weakening)

**Refinement candidates**:

- New ground-truth source row when a project provides a contract registry / recorded-cassette
  tooling
- Tightening of the write-payload validation guidance when a safe non-prod write path becomes
  standard
- New cross-reference when a sister rule provides the fixture/contract gate

## `verify-before-claim.md`

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Claim phrase issued without same-turn verification (rule 1 violation)
- Stale verification block (gate ran earlier turn; files have changed since)
- Re-affirm under user challenge without re-verification (rule 6 violation)
- Verification block missing a gate the claim class requires (rule 7 scope mismatch)
- Manual verification (UI smoke / accessibility / perf) skipped on a UI / a11y / perf change
- "No-op" claim made without confirming the diff scope is actually no-op
- Verifiable code change delegated to a sub-agent/tool that cannot run the gate (rule 11 violation)
- A delegate's edits accepted as "done" without the orchestrator running the gate on them this turn
  (rule 11)

**Refinement candidates**:

- New row in the "verification scopes by claim type" table when a claim class gains a load-bearing
  gate
- New banned claim phrase when a recurring rhetorical pattern slips past the rule
- Tightening of the "re-run when" triggers when stale verifications recur
- New cross-reference when a sister rule defines the gate a claim depends on
