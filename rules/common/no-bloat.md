# No-Bloat Rule (Always-On, Global)

> Auto-fires on every file. Sister to `wiring-and-usage-review.md` (no inert
> code), `reuse-first.md` (sweep before writing), `proper-fixes-first.md` (root
> cause, not accretion), `plan-task-breakdown.md` (every plan ends with a
> bloat-removal phase), `principal-level-mandate.md` (depth, not volume).

## Core Principle

**Write the least code that fully solves the problem. Every line, file,
function, field, parameter, dependency, abstraction, endpoint, and config flag
must earn its place by serving a present, demonstrated need. Speculative
generality ("we might need it"), duplicated logic, dead/unwired code, redundant
wrappers, and files that grow without bound are bloat — they are defects, not
neutral. When adding capability, prefer extending or collapsing over
accreting.**

Bloat is not a style preference; it is accumulated carrying cost: more to read,
test, secure, migrate, and get wrong. The bar is YAGNI (You Aren't Gonna Need
It) + DRY (Don't Repeat Yourself) + minimal surface area, applied at write time.

## Hard rules

### 1. YAGNI — build for the present need, not an imagined future

- No speculative parameters, config flags, interfaces, or extension points added
  "for later." Add them when the second caller actually exists.
- No public API / endpoint / method shipped without a present consumer (this is
  also the inert-code ban in `wiring-and-usage-review.md`).
- No "framework" or generic abstraction introduced for a single use site. Two
  concrete copies are cheaper than one wrong abstraction; abstract on the third.

### 2. Collapse before you accrete

When a new operation is mechanically the same as an existing one with different
intent (e.g. "promote" and "rollback" are both "make version N active"), expose
ONE primitive, not N near-duplicates. Distinct user-facing labels do not require
distinct code paths.

### 3. DRY — one home for each piece of logic

- Repeated blocks (3+ occurrences of the same shape) extract to one helper.
- A new method that duplicates an existing one's body shares the body.
- Copy-paste with a small delta is a smell: parameterize the delta.

### 4. Minimal surface area

- Prefer the narrowest interface that callers need (interface segregation): a
  small focused interface beats widening a broad one (and avoids forcing every
  existing implementer / mock to grow).
- Functions take the fewest parameters that express the need; pass a struct only
  when the parameter list genuinely warrants it, not pre-emptively.
- Return the least the caller uses; don't return values "in case."

### 5. Keep files within the size cap; split by cohesion, not by line-count panic

- Source files stay under the language's soft cap (the mechanical gate is the
  hook's `file-too-large` soft warn). When a file crosses it, split along
  COHESION seams (one type / one concern per file), not arbitrary line cuts.
- New methods on an existing oversized type go in a NEW cohesive file in the same
  package, rather than growing the over-cap file further.
- Splitting is structural improvement, not churn — but only split real seams; do
  not shard a cohesive unit just to dodge the warning.

### 6. Remove what the change obsoletes — same change, not "later"

Per `plan-task-breakdown.md` (bloat-removal phase) and
`wiring-and-usage-review.md`: when a change supersedes code, delete the dead
path in the SAME change — stale wrappers, now-unused exports, dead config keys,
redundant helpers, commented-out blocks, superseded docs. "We'll clean it up
later" is how bloat accumulates.

### 7. Dependencies earn their weight

- No new dependency for what the standard library / an already-present dependency
  does adequately. A one-function utility is not worth a transitive tree (per
  `reuse-first.md` + the dependency CVE/license gates).
- Remove a dependency when the change removes its last consumer.

### 8. Comments and docs: signal, not volume

Comments explain WHY (non-obvious intent, trade-off, hazard), never restate the
code or narrate the obvious. Delete comments the code now makes self-evident.
Documentation tracks the code; obsolete prose is bloat too.

### 9. Tests cover behaviour, not line-count theatre

Test meaningful behaviour + edge cases; do not pad with near-identical cases
that exercise the same path. Shared test setup goes in one helper (DRY applies
to tests). Coverage is a floor on behaviour exercised, not a target to inflate.

## Anti-patterns

- **Speculative generality** — an interface/flag/param with one (or zero) real
  users, justified by "might need it."
- **Parallel near-duplicates** — `promoteX` + `rollbackX` with identical bodies;
  two handlers that differ by one literal.
- **Accretion over refactor** — adding a fourth special-case branch instead of
  rethinking the shape.
- **Inert surface** — an exported function / endpoint / method nothing calls
  (cross-ref `wiring-and-usage-review.md`).
- **Wrapper-for-a-wrapper** — a pass-through that adds no behaviour.
- **Ever-growing god file** — appending to a file already past the cap because
  it's where similar code happens to live.
- **Defer-the-cleanup** — leaving the superseded path in "for now."
- **Dependency for a one-liner** — pulling a package to avoid five lines.
- **Comment narration** — `// increment i` over `i++`; restating the signature.

## Verification block

A change's verification (per `verify-before-claim.md`) includes a no-bloat line
when it added or moved code:

```text
No-bloat (this turn):
  - new surface has present consumers: yes (no speculative API/flag/param)
  - duplication: none introduced (shared helper / collapsed N→1 where applicable)
  - obsoleted code removed in this change: <list, or "none">
  - file sizes: touched files under cap (or split along cohesion seam)
  - new dependencies: 0 (or justified: <reason, gates passed>)
```

## Tooling

`ponytail` (plugin, MIT) enforces this rule's core in-session: the laziest solution
that works, stdlib before dependency, no unrequested abstraction. It is a live
constraint rather than a rule the model must remember to apply — useful precisely
because speculative generality is written by default, not by decision.

## Cross-references

- `wiring-and-usage-review.md` — every symbol wired to a live consumer (inert
  code is a bloat subclass)
- `reuse-first.md` — sweep for an existing solution before writing new
- `proper-fixes-first.md` — root-cause fix, not accreted symptom patches
- `plan-task-breakdown.md` — every plan ends with a bloat-removal phase
- `principal-level-mandate.md` — depth and correctness, never volume
- `dependency-rules` skill — CVE / license / pinning gates a new dependency runs
- `done-criteria.md` — the dead-code / unused-symbol detectors a "done" claim
  runs (the mechanical no-bloat gate)

## Why this rule exists

Code is a liability before it is an asset: every line is read far more than
written, must be tested, secured, migrated, and reasoned about. Speculative
abstractions guess wrong and calcify; duplicated logic drifts out of sync;
inert surface misleads readers into thinking it's used; god files become
un-navigable. The cost of the discipline is a moment's restraint at write time
("does this earn its place?"). The cost of bloat is paid forever, by everyone
who touches the system after.

User directive (verbatim): **"do not introduce bloats and do not introduce any
bloats"** — codified across plan, project rules, global rules, and the
edit-time hook.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New interface / flag / parameter / endpoint added with no present consumer
  (rule 1 violation — speculative generality)
- Two methods / handlers with near-identical bodies shipped instead of one
  primitive (rule 2 — collapse missed)
- Same block duplicated 3+ times without extraction (rule 3 — DRY)
- A broad interface widened (forcing all implementers/mocks to grow) where a
  narrow new interface would do (rule 4 — segregation missed)
- Append to a file already past the soft cap instead of a cohesion split
  (rule 5 weakening)
- Superseded code left in "for now" in a change that obsoleted it (rule 6)
- New dependency added for standard-library-equivalent functionality (rule 7)
- Comment restates the code / obsolete prose retained (rule 8)
- Padded near-duplicate test cases exercising one path (rule 9)

**Refinement candidates**:

- New anti-pattern entry when a recurring bloat shape appears
- Tightening of the size-cap split guidance when god-file growth recurs
- New cross-reference when a sister rule provides a gate the no-bloat audit
  depends on
- A mechanical detector promoted to the edit-time hook when a bloat class proves
  catchable without false positives
