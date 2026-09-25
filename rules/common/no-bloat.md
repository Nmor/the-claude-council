# No-Bloat Rule (Always-On, Global)

> Auto-fires on every file. Sister to `wiring-and-usage-review.md` (no inert
> code), `reuse-first.md` (sweep before writing), `proper-fixes-first.md` (root
> cause, not accretion), `plan-task-breakdown.md` (every plan ends with a
> bloat-removal phase), `principal-level-mandate.md` (depth, not volume).
>
> **Size budget: 16 KB.** Check with `wc -c`; check the whole Floor with
> `node ~/.claude/scripts/token-budget.mjs`. This file is always-on, so every byte is
> paid on every turn of every task: it is a per-use cost under rule 10, and it states
> its own budget under rule 5.

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
- **Every file states its own size budget, in the file.** A cap that lives in a policy
  document somewhere else is attached to nothing: the person adding the next 200 lines
  never reads it. Put the number where the growth happens — a header line naming the
  budget and the command that checks it — so exceeding it shows up in the diff instead
  of in an audit nobody runs. A file whose budget cannot be stated has no budget
  (rule 10).

### 6. Remove what the change obsoletes — same change, not "later"

Per `plan-task-breakdown.md` (bloat-removal phase) and
`wiring-and-usage-review.md`: when a change supersedes code, delete the dead
path in the SAME change — stale wrappers, now-unused exports, dead config keys,
redundant helpers, commented-out blocks, superseded docs. "We'll clean it up
later" is how bloat accumulates.

#### 6a. SUPERSEDE PROOF — the replacement must be a strict superset

**A deletion justified by "something newer replaces it" is only legal once the
replacement is PROVEN to carry every capability the deleted code had, plus its
new ones. Prove it before the delete lands — never assume the newer thing is
better because it is newer.** A supersede that silently drops a field, an
error branch, a config knob, a status code, an auth check, or a callback is not
a cleanup: it is a regression wearing a cleanup's clothes, and it ships green
because the deleted code took its own tests with it.

Before deleting X in favour of Y, enumerate and check off, in writing:

| Axis | The question the proof must answer |
| --- | --- |
| **Inputs** | Every parameter / field / query-arg / header X accepted, Y also accepts (or the change explicitly and deliberately drops it, and the drop is named). |
| **Outputs** | Every field / status code / header / error code X emitted, Y also emits. A reshape (flattened → nested, renamed key) is a BREAKING output change — enumerate the mapping, and update every consumer in the same change. |
| **Error branches** | Every failure mode X handled — not-found, forbidden, conflict, validation, provider-down — Y handles with at least the same specificity. Collapsing four typed errors into one 500 is a loss. |
| **Side effects** | Audit-log writes, metric increments, cache invalidations, notifications, ledger posts X performed, Y performs. |
| **Guards** | Every authz / ownership / rate-limit / idempotency check X enforced, Y enforces. **Never** supersede a guarded path with an unguarded one. |
| **Consumers** | Every caller of X is migrated to Y IN THE SAME CHANGE, across every repo — grep the symbol AND the route/path string, not just the symbol. |
| **Tests** | X's tests either migrate to Y or are replaced by equivalent-or-better coverage. Deleting a path's only tests alongside the path is how the regression hides. |

If any axis cannot be checked off, the correct move is **not** to delete: either
extend Y until it genuinely covers X (the preferred outcome — make the superior
thing actually superior), or keep both and deprecate X on a documented window
per `deprecation-lifecycle.md`. "Y is roughly equivalent" is not a proof.

The proof is durable, not verbal. It lands as a `SUPERSEDE PROOF` comment on Y
naming what it replaced and what it carries forward, and as a `Supersede proof`
line in the verification block:

```text
Supersede proof (this turn):
  removed:      <symbol / route / file>
  replaced by:  <symbol / route / file>
  inputs:       <every input carried forward | deliberate drop + why>
  outputs:      <every output carried forward | reshape mapping + consumers updated>
  error paths:  <every branch carried forward>
  side effects: <audit / metric / cache / notify carried forward>
  guards:       <authz / ownership / rate-limit / idempotency carried forward>
  consumers:    <N migrated, across <repos>; grep: symbol + path string>
  tests:        <migrated | replaced with equivalent-or-better>
```

Provenance: caught in-flight 2026-09-06 — a bare-cart handler was deleted in
favour of an enriched one on the same route, and the replacement had silently
dropped a nullable `resolved_at` field and reshaped the payload from flat to
nested without a consumer sweep. The delete looked like tidy no-bloat work and
was a latent data-loss bug. The rule now demands the proof, and the
`supersede-proof.js` PreToolUse hook flags a same-change delete-plus-replace
that lacks one.

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

### 10. Name the multiplier: a per-use cost needs a budget you can measure

Some costs are paid ONCE, when the thing is written. Others are paid on EVERY use,
forever, by someone who is not the author — which is exactly why they go uncorrected.
Before adding the second kind, say in one line which kind it is.

| Paid once | Paid per use, forever |
| --- | --- |
| A migration script | A query without an index |
| A build step | A dependency in the runtime image |
| Writing a doc | The images that doc ships to every reader |
| Authoring a rule file | A rule file loaded into every turn's context |
| Defining a metric | A label on it whose values come from user data |
| Writing a handler | A payload it returns unpaginated |

Three things make a per-use budget real, and all three are required:

- **A number** — a threshold with a unit, not "keep it small".
- **A command** — the one thing that measures it, written beside the number. A budget
  nobody can run is a wish, and it will be broken silently.
- **A gate** — something mechanical that fails when it is exceeded. A documented limit
  with no gate is exceeded by most of its population, and the people exceeding it do
  not know they have.

**Lazy is not free.** Something that loads "only when needed" still costs its full
weight every time it IS needed. The question is not whether it is deferred, but what it
weighs when it fires multiplied by how often it fires.

**Measure before claiming compliance.** A figure quoted from memory is wrong more often
than not, because the thing grows while the sentence describing it does not. Run the
command, paste the output (per `verify-before-claim.md`).

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
- **The unmeasurable budget** — a threshold in a document with no command that checks
  it.
- **The unenforced cap** — a documented limit with no gate. Expect most of the
  population to exceed it, silently.
- **Quoted-from-memory compliance** — "we are well under the limit", with nothing
  measured this turn.
- **Unbounded per-use cost** — a collection endpoint with no pagination, a call per row
  instead of per page, a poll where a push exists, a log line in a hot path, a metric
  label taken from user data. Each is invisible to its author and paid by everyone
  after.

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
  - per-use costs added: <none | what it is, its budget, the command, the gate>
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

**Rule 10's evidence, measured on this install 2026-09-21.** A policy required any
skill file over 25 KB to use progressive disclosure. It was written down, correct, and
enforced by nothing: **58 of 119 skills exceeded the cap**, two used progressive
disclosure, one edit to a frontend file loaded **99,953 tokens** before any work began,
and the always-on floor had drifted from a documented "~65,000" to a measured 72,039
because quoting it was easier than running the command. Nobody noticed for years,
because nobody pays a per-use cost at write time — it surfaces later as degraded output
quality and gets attributed to the model rather than to the file.

The same shape, in the same estate, had already produced integrations that were correct
and expensive: a receipt parser correlating on a field the provider never sends, senders
handing a provider an unaddressed callback URL for a route served only in its addressed
form, an email adapter recording a provider's refusal as success, and click-to-dial
posting to an endpoint that does not exist in the provider's API. Each was minutes of
reading away (`official-docs-first.md` rule 7); each shipped and was paid for months.

User directive (verbatim): **"do not introduce bloats and do not introduce any
bloats"** — codified across plan, project rules, global rules, and the
edit-time hook.

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill. Invoke it when refining this rule: it does not load
by itself. They are instructions for maintaining THIS ARTIFACT, not for doing
the task at hand, so they are not carried on every turn.
