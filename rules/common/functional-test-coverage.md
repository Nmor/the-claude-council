# Functional-Test Coverage (Always-On, Global)

> Auto-fires on every code file, in every project and every workspace. Sister to
> `verify-before-claim.md` (the gate a claim runs), `done-criteria.md` (what "done"
> means), `no-overclaim.md` (coverage numbers are claims too),
> `diagnose-before-fixing.md` (a test that pins a defect is a diagnosis, not a fix),
> `wiring-and-usage-review.md` (a test is not wiring), `principal-level-mandate.md`
> (the depth bar), `no-silent-drops.md` (a found defect is never dropped).
>
> **Size budget: 18 KB** — `token-budget.mjs --check`.

## Core Principle

**Every project carries functional tests over ALL of its behaviour, and holds that
line. A test counts only if it exercises real behaviour and would FAIL if that
behaviour broke. Coverage percentage is the PROXY, never the goal: a suite at 100%
that asserts nothing is worth less than one test that catches a wrong number. When
testing reveals an omission, an unfinished flow, or a defect, that is the WORK — build
it, fix it, and test again — not a note for later.**

The target is total. "The critical paths are covered" is how the uncovered remainder
becomes the place every incident comes from.

## Hard rules

### 1. Measure before you claim, and report the real number

Coverage is a measurement, never an estimate. Run the tool, paste the number. A claim
about coverage without a same-turn measurement is an overclaim per `no-overclaim.md`.
Report the baseline BEFORE the work and the result AFTER, per surface, not as a single
blended figure that hides an untested subsystem behind a well-tested one.

### 2. A test names the defect it prevents

Every test's name or doc comment says, in plain words, what breaks if it fails. Not
"tests the handler" — "refuses a refund larger than the amount paid". A reviewer who
cannot tell what a test protects cannot tell whether deleting it is safe, and that is
how a suite rots into ballast.

### 3. Line-padding is not coverage

These do not count, and writing them to move a number is a rule violation: a test that
asserts a field it just set; a test that walks a getter; a test that re-states the
implementation; a snapshot nobody reads; a test whose assertions cannot fail. If
mutating the line under test would not fail the test, the test is decoration.

### 4. Cover the branches that carry consequence first

Order by blast radius, not by what is easy: money and billing arithmetic, authentication
and authorisation, data destruction, anything a regulator asks about, then the rest.
Every guard gets an ALLOW case AND a REFUSE case. Every typed error gets a test that
asserts the code, not the message. Every state machine gets its illegal transitions.

### 5. Separate finding from fixing, then fix

A test-writing pass reports the defects it uncovers rather than quietly patching them
mid-stride, so the findings survive as a list and are fixed with full context. But the
list is then WORKED, not filed. Per the owner's standing directive, finding a defect and
leaving it is the failure mode this rule exists to close.

### 6. A defect you must not fix yet is PINNED, never encoded as intent

When correct behaviour is a decision that is not yours (pricing, a product rule, an
external contract), write the test against CURRENT behaviour, mark it explicitly as
pinning a defect, say so in the doc comment and the assertion message, and put the
decision to the owner with a recommendation. Never let a bug enter the suite as though
it were the specification: that converts a defect into a requirement and the next
engineer will "fix" the test.

#### 6a. What does NOT qualify — the loophole this closes

A pin is legal only when the OWNER would answer differently from any competent engineer
reading the code and the UI. None of the following qualifies, and each is a deferral
wearing a pin's clothes:

| Not a qualifying reason | Why |
| --- | --- |
| "I do not yet know how to fix it" | Unfinished analysis. The answer is to do the analysis. |
| "It needs a design decision" — when the intent is already evident | If the code and the UI already express the intent, the decision is made; only the mechanism is open, and the mechanism is yours. |
| "It is bigger than this change" | Scope is a plan question, not a pin. Raise it, size it, schedule it. |
| "The fix is expensive" | Cost is input to the owner's decision — so BRING them the cost. A pin that never reaches them is not a decision, it is a silence. |
| "There is a follow-up task for it" | Filing is not fixing (rule 5). See `post-phase-retrospective-review.md` Step 5: a follow-up captures work DISCOVERED beyond the change's scope, never a defect found INSIDE it. |

**The test to apply**, in this order:

1. Can you state, concretely, what the correct behaviour is? If no — that is analysis, not
   a decision. Do the analysis.
2. Can you state what the fix would BE? If no — same. A pin whose fix is unknown is a
   deferral, because nobody can tell whether the owner's answer would even change it.
3. Would a competent engineer reading the code and the UI reach a DIFFERENT answer than
   the owner? If no — it is a fix, not a decision.

Only if you pass all three is it the owner's call.

#### 6b. A pin carries its justification, in the code

A pin is written so the next reader can audit the decision rather than infer it:

```text
decision-owner:  <who must decide>
decision-needed: <what they must decide>
recommendation:  <what you advise, and why>
```

And it is PUT TO the owner in the same turn — writing it down is not putting it to them.
A pin nobody was asked about is a defect with a comment on it.

**Mechanically enforced.** `deferral-gate.js` (PreToolUse, `Edit|Write|MultiEdit`) blocks a
deferral marker in source or test files that lacks `decision-owner:` and `decision-needed:`
within twelve lines. Markdown is exempt — plans and ADRs discuss deferral legitimately. A
bare `TODO` does not fire; only explicit deferral vocabulary does. Modes:
`CLAUDE_DEFERRAL_GATE=block` (default) | `warn` | `off`.

**Provenance (2026-09-21).** This subsection exists because the rule above was loaded in
context, said plainly that a defect found while testing is FIXED not filed, and was still
not followed. A provider query filter that the vendor silently ignores — so one company's
picker showed every company's data — was pinned rather than fixed, justified as "needs a
design decision", when the truth was that the mechanism had not been worked out yet. The
rule was present. Prose alone did not bind it. That is why 6a is a test rather than a
principle, and why 6b has a gate.

### 7. Never weaken a test to make something pass

Deleting an assertion, loosening a matcher, widening a tolerance or skipping a case to
get green is falsifying the gate. If an existing test fails, either the change is wrong
or the test encoded a defect (rule 6) — decide which, in writing.

### 8. Tests obey every rule production code obeys

No discarded return values, no suppression directives, no secrets, no ambient state, no
sleeping to fix a race. A test file is source. Shared setup is factored once; a
copy-pasted fixture drifts and then lies.

### 9. Ratchet the floor so it cannot regress

Once a surface reaches its level, the gate enforces it: the build fails when coverage
drops. A floor that lives in someone's memory is not a floor. Prove the ratchet with a
positive control — deliberately drop coverage once and watch the gate fail — because an
unproven gate is usually a misconfigured one.

### 10. Untested does not mean unimportant — it usually means unexamined

A package with no test file is a finding in itself, not a gap to schedule. The reason it
has none is almost always that nobody has read it recently, which is also why it is
where the defects are.

### 11. A test is what tells UNFINISHED apart from UNUSED — never delete on "no caller" alone

From the outside, a half-built feature and genuine waste look identical: no caller, never
reached, nothing fails when you remove it. Reading cannot separate them, because reading
only asks what the code DOES. A test asks what it was SUPPOSED to do, and that is the
question that separates them.

So an uncovered symbol with no caller is a BUILD candidate first and a removal candidate
last, per `wiring-and-usage-review.md` rule 9. Write the test that states the intended
behaviour before deciding anything. If the test cannot be written because the intent is
unknowable, that is the finding, and it goes to the owner — it is not licence to delete.

The failure mode this closes: an audit labels something dead, the deletion reads as tidy
cleanup, no test fails because there were none, and the requirement disappears with the
code. Nobody notices until a user asks for the feature.

Incident, 2026-09-20: two hooks at 0% coverage were investigated by reading and written
up as "dead code, removal is the only follow-up". Tests over them showed the unreached
branch was gated on one variable equalling two different values at once — a feature
somebody intended and mis-wrote, charging the base total where a negotiated total was
meant to go. The delete would have erased the only evidence the requirement existed.

### 12. The enforcement layer is in scope — it does not exempt itself

Hooks, gates, CI scripts and generators are CODE. They decide whether every other rule holds,
so an untested one is the highest-leverage untested thing in a project.

Exempt framework PROSE (rules, skills, agents, docs) from test requirements. Never exempt
framework EXECUTABLES by living in the same directory. The distinction is file type, not path.

**Provenance (2026-09-21).** `test-coverage-gate.js` carried `/\.claude\//` in its
NOT_PRODUCT exclusion. The intent was sound — markdown rules should not demand tests — but
the exclusion was path-based, so it silently swallowed 34 executable hooks. The result: zero
tests across the entire enforcement layer, and two hooks that were defeatable by accident for
an unknown length of time (a read-only `grep` satisfied the "a gate ran" marker; any markdown
table satisfied the "verification block present" test). Nothing detected either, because the
gate that would have asked for their tests treated them as prose.

The exemption is now `/\.claude\/(?!scripts\/|hooks\/)/`, and the gate recognises
`__tests__/` and `tests/` layouts so a single suite covering many modules counts — checking
only for a sibling `foo.test.js` reported "no test" for every project using the dominant JS
layout, which is the false negative that trains a reader to ignore the hook.

## Enforcement (hook-backed, not documentation-only)

Three layers, so this is not left to per-turn discretion:

1. **`test-coverage-gate.js`** (PreToolUse `Edit|Write|MultiEdit`) fires at the moment a
   production source file is written with no companion test anywhere, naming the paths it
   looked for. It also fires once, late in a session, when a dozen source files have been
   edited and coverage has never been measured. Non-blocking by design: a hard block on a
   heuristic this broad trains people to switch it off, which is worse than the nudge.
   `CLAUDE_TEST_COVERAGE_HOOK=off` disables it.
2. **`test-coverage-marker.js`** (PostToolUse `Bash`) records that coverage was actually
   MEASURED this session and what number it produced, recognising the real output shapes
   of `go test`/`go tool cover`, vitest and istanbul, pytest-cov, nyc, c8, tarpaulin and
   phpunit. That marker is what makes rule 1 checkable rather than aspirational.
3. **The project's own gate** carries the ratchet (rule 9). A hook sees one file at a
   time; only the repo-wide gate can fail a build on a coverage drop.

A hard block on "did the model WRITE a functional test" is not mechanically possible — it
is a judgement about assertions, not a tool call. The hooks enforce the observable
proxies: a source file without a companion test, and a session that edited code without
ever measuring. Both were proven with positive AND negative controls when they landed,
per rule 9.

## Verification block

A claim about test work carries:

```text
Tests (this turn):
- baseline: <surface: measured % before, per surface>
- after:    <surface: measured % after>
- added:    <N tests; each names the defect it prevents>
- defects found: <list, with path:line>
- defects fixed: <list> | pinned: <list, with the decision put to the owner>
- gate: <the command run and its real final line>
- ratchet: <floor enforced at N%, positive control passed | not yet>
```

## Anti-patterns

- **Coverage theatre** — tests written to move a number, asserting nothing that can fail.
- **Critical-paths-only** — declaring the important parts covered; the remainder is where
  the incidents come from.
- **Found-and-filed** — a defect discovered by testing, recorded, and never worked.
- **Bug-as-specification** — pinning current wrong behaviour without marking it, so the
  defect becomes the contract.
- **Green-by-deletion** — an assertion removed, a case skipped, a tolerance widened.
- **Estimated coverage** — a percentage asserted without running the tool this turn.
- **Blended number** — one project-wide figure hiding a subsystem at zero.
- **Unproven ratchet** — a coverage gate nobody has ever seen fail.

## Why this rule exists

Measured baselines on real codebases sit near a third of statements while the team
believes the important parts are covered. What the uncovered two-thirds holds is not
hypothetical: a single afternoon of writing functional tests over a money path surfaced
an advertised, configurable fee that was added to one payment leg and subtracted from
another so it collected nothing; the same invoice billed a different total depending on
which code path last touched it; an accessor that returned a tax RATE where every caller
expected a tax AMOUNT; a rate rendered with a percent sign on a field holding money; and
a column read by a screen that the server had stopped sending, so the screen showed
nothing while still ranking by it.

Every one of those had been shipped, reviewed and running. None was found by reading the
code, because reading confirms what you already believe the code does. They were found by
writing down what the behaviour SHOULD be and watching the assertion fail.

The cost of the discipline is the time to write the test. The cost of skipping it is
paid by whoever is holding the incident, usually months later, usually in money.

User directive (verbatim): **"100% FE and BE functionality tests so that we have no bugs
carried over"** and **"ensure as you test you fully test and implement any ommissions and
fix all bugs and test again till you have full implementations with not bugs or dropped
features or funtionalities"**. Classified GLOBAL — pure discipline, no project specifics —
per `rule-authoring-global-vs-project.md`, and explicitly required to apply to every
project and every workspace.

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill. Invoke it when refining this rule: it does not load
by itself. They are instructions for maintaining THIS ARTIFACT, not for doing
the task at hand, so they are not carried on every turn.
