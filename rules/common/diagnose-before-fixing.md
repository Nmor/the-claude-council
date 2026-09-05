# Diagnose-Before-Fixing Rule (Always-On, Global)

> Auto-fires on every runtime-failure investigation. Sister to
> `proper-fixes-first.md` (root cause, not symptom — this rule is HOW you find the
> root cause), `verify-before-claim.md` (verify the CLAIM — this rule verifies the
> DIAGNOSIS), `validate-payloads-before-coding.md` (validate the real contract
> before coding — this rule generalises it to the whole live path),
> `no-silent-failures.md` (rule 9 absence-class detection — this rule pulls
> instrument-first earlier, to diagnosis time), `principal-level-mandate.md` (the
> depth bar), `no-overclaim.md` ("diagnosed" ≠ "fixed").

## Core Principle

**A fix requires a PROVEN root cause first. "Proven" means evidence gathered from
the LIVE execution path the system actually runs — not a convenient proxy, not a
plausible hypothesis, not "it compiles." When the failure is not visible in
existing telemetry, the FIRST action is to add instrumentation at the suspect
layer, NOT to deploy a speculative fix. You disprove your own leading hypothesis
before you code it, you change ONE thing at a time, and you confirm the fix by the
diagnostic signal actually changing.**

Guess-and-patch — deploying a plausible change to "see if it helps" without a
confirmed root cause — is the anti-pattern this rule exists to kill. It is junior
work: it burns days, stacks unattributable changes, and often makes the system
worse.

## Standards this rule implements

- **Scientific method** — hypothesis → prediction → test against reality →
  keep/reject. A fix is a hypothesis; deploying it untested is skipping the test.
- **Google SRE Workbook, "Effective Troubleshooting"** — examine, hypothesise,
  test, treat; the observed system is the source of truth.
- **Brendan Gregg, USE / RED methods** — measure the actual resource/request path
  before concluding; don't infer utilisation/latency from a proxy.
- **OpenTelemetry** — a per-request span/trace makes a single interaction's
  timeline inspectable; instrument so the failing unit is observable, not guessed.

## Hard rules

### 1. No fix without a proven root cause

Before editing code to fix a runtime failure, the root cause is established with
evidence and written down: the specific mechanism, the file:line / log / metric /
trace that demonstrates it, and why it produces the observed symptom. "It's
probably X" is a hypothesis, not a root cause. A change shipped on a hypothesis is
a guess — reject it.

### 2. Disprove your OWN leading hypothesis before coding it

The strongest debugging discipline is trying to REFUTE your current best guess,
not confirm it. Read the code path / run the probe that would prove the hypothesis
WRONG. Only a hypothesis that survives a genuine refutation attempt earns a code
change. (A leading hypothesis disproved by a five-minute read of the actual
implementation has saved a wasted deploy cycle more than once.)

### 3. Diagnose the LIVE path, not a proxy

Validate/observe the ACTUAL path the system executes in the failing environment —
not a stand-in that is merely convenient. Common proxies that DIVERGE from the
live path and mislead:

- a **recording / replay / captured fixture** vs the **live stream** the code
  actually consumes (a server-side recording can be complete while the live
  input the process receives is lossy/gapped);
- a **unit test** of a component vs the component **wired on the live path**
  (the unit can pass while nothing calls it, or calls it differently);
- **staging vs prod**, **one region vs another**, **cold vs warm**, **one
  carrier/tenant vs another** — environment divergence;
- **the code default** vs **the effective config actually loaded** (per
  `wiring-and-usage-review.md` inert-config trap).

Name the proxy and the live path explicitly; when they can differ on the axis you
care about, gather evidence from the LIVE path before concluding.

### 4. Instrument-first when blind — before any speculative fix

If the failure is not answerable from existing telemetry, the FIRST action is to
ADD observability at the suspect layer, then re-observe — NOT to deploy a change
and hope. The instrumentation is preferably **always-on, low-volume, and
PII-free** so it (a) survives the incident, (b) catches the next one, and (c)
needs no second redeploy. A blind spot at a layer is itself a defect (it is why
the failure took long to find); closing it is part of the fix.

### 5. Change ONE thing at a time; attribute the outcome

Do not stack multiple speculative changes into one deploy/observation — a mixed
result cannot be attributed, and a regression cannot be isolated. One hypothesis,
one change, one measured outcome. (Stacking three speculative component swaps into
one cycle makes "did it help, and which part?" unanswerable.)

### 6. Design the observability for the QUESTION being asked

Instrumentation must be able to answer the question it exists for:

- A metric whose PURPOSE is to compare across a dimension MUST carry that
  dimension as a **label** (a cross-backend / cross-variant SLO with no
  backend/variant label collapses both populations into one indistinguishable
  series — it cannot do the one job it was created for).
- A failure mode you need to detect must have a signal that REVEALS it
  (a per-request timeline via a span/trace; a per-interaction health line;
  a dead-man/no-data alert for absence-class failures per
  `no-silent-failures.md` rule 9).
- Keep it low-cardinality + PII-free so it can be always-on.

### 7. Prove the fix by the SIGNAL changing, not by belief

Confirm the failure is observable BEFORE the fix (reproduce / capture the bad
signal) and GONE AFTER (the same signal now good), on the live path. "It should
work now" is not proof; the diagnostic signal flipping is (per
`verify-before-claim.md`). Until then it is "fix attempted", not "fixed".

## Verification block

A completion claim on a runtime-failure fix carries a `Diagnosis (this turn)`
block, BEFORE the fix claim:

```text
Diagnosis (this turn):
- symptom: <observed, from the live path>
- root cause: <mechanism> — evidence: <file:line | log | metric | trace on the LIVE path>
- hypotheses ruled OUT: <each + the evidence that refuted it>
- live-path vs proxy: <how the observation was taken on the live path, not a proxy>
- instrument added (if was blind): <always-on/low-volume/PII-free signal>
- fix proven by: <the signal that was bad before + is good after>
```

Absent a proven root cause, the claim downgrades to "fix ATTEMPTED — root cause
not yet proven" and the next step is diagnosis (instrument / probe the live path),
not another speculative edit.

## Anti-patterns

- **Guess-and-patch** — deploying a plausible change to "see if it helps" with no
  confirmed root cause.
- **Validate-the-proxy** — concluding from a recording/replay/unit-test that
  diverges from the live path.
- **Confirmation-only** — seeking evidence FOR the hypothesis, never trying to
  refute it.
- **Change-stacking** — several speculative changes in one cycle; outcome
  unattributable.
- **Deploy-to-diagnose** — using production deploys as the debugging loop instead
  of adding observability.
- **Blind comparison metric** — a metric meant to compare variants that lacks the
  variant label.
- **"It compiles / looks right / should be fine"** — belief substituted for the
  signal (also `no-overclaim.md`).

## Why this rule exists

The recurring, expensive incident: a runtime failure is "fixed" repeatedly by
swapping plausible-looking components, each change validated against a convenient
proxy (a recording, a unit test, the code default) rather than the live path the
system actually runs — so none of the changes address the real mechanism, days are
lost, unattributable changes pile up, and the product regresses. Every one of
those cycles would have been replaced by a single act of instrumenting the live
layer and reading one signal. The cost of the discipline is minutes (a probe, a
log line, a read to refute a guess); the cost of guess-and-patch is days plus lost
trust. Diagnosis is not overhead before the fix — diagnosis IS the fix; the code
edit is just the last, cheap step.

## Learning hooks

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

## Provenance

User directive (2026-07-26): after a multi-day runtime-failure investigation was
repeatedly set back by deploying plausible fixes validated against a proxy (a
server-side recording) instead of the live execution path, and by stacking
speculative component swaps without a proven root cause — "we are never doing
junior engineer quality work" and "claude council/global rule needs update of
rules." Classified GLOBAL (pure diagnosis discipline, no project specifics) per
`rule-authoring-global-vs-project.md`.
