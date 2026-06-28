# Post-Phase Retrospective Review Rule (Always-On, Global)

> Auto-fires on every file. Sister to `verify-before-claim.md`,
> `plan-execution-progress.md`, `done-criteria.md`,
> `principal-level-mandate.md`, `code-graph-validation.md`. Companion
> to `no-overclaim.md`. Defines the brief retrospective every phase
> closes with — REVERIFYING all prior phases in the same work stream.

## Core Principle

**Every phase / task boundary closes with (a) a multi-division
principal-level audit of the CURRENT phase's own work + the
cross-repo seams it touches (rule 8), AND (b) a brief retrospective
that re-audits ALL prior phases in the same work stream (rules 1-7).
The current phase's own verification block is necessary but not
sufficient; the audit proves the phase is correct + fully wired,
and the retrospective confirms prior phases' fixes still hold after
the new changes land. "CI green" is not "everything works as
intended" — only the audit + retrospective prove it. This is a
top-level job, run at every phase boundary before "done".**

## Why this rule exists

Recurring incident classes — CI green, the bug in a layer the
gates never exercised:

1. **A UI fix that passes CI but renders wrong** — a component
   style change declared done because lint/type-check/tests/probes
   passed, but a CSS override pulled the element off-viewport; the
   gates never rendered the live component, so they could not catch
   it. Surfaced only by a human on a real screen, PRs later.
2. **A rename verified only at the edited sites** — a field rename
   fixed the sites in the diff, but a whole-file / repo re-grep
   would have surfaced other call paths still on the old name.
3. **Round-after-round static-analysis mitigation** — each
   sanitiser pattern looked correct in isolation; each next round
   revealed the prior one didn't match the analyser's actual
   recognition. A retrospective on round N before drafting round
   N+1 would have surfaced the recurring wrong assumption earlier.
4. **A green phase hiding inert controls** — a phase shipped with
   full green gates and "100% complete", but a multi-division
   principal audit found, in that same green code: a CRITICAL
   security control **never wired** (unit-tested in isolation, but
   nothing on the live path called it — inert); clients **opened
   but never closed** (resource leaks); a "consent-gated" flow with
   **no consent check in code**; an undocumented cross-border PII
   transfer; a swallowed crash. Unit tests covered units, not the
   activation path / lifecycle / cross-repo contracts. This drove
   rule 8 (the current-phase multi-division adversarial audit).

In every case the CURRENT phase's verification was green; the bug
lived in a layer the gates didn't exercise. A retrospective on
prior phases — even a brief one — would have surfaced it.

## Hard rules

### 1. Every phase end carries a retrospective block

Per `plan-execution-progress.md`, every phase ends with a
verification block. This rule appends a retrospective sub-block:

```text
Retrospective on prior phases:
- Phase N-2 (X): re-verified via <grep / probe / live test> — wired ✓
- Phase N-1 (Y): re-verified via <grep / probe / live test> — wired ✓
- Cross-phase invariant: <name> still holds — verified via <check>
```

The retrospective is the FINAL block before the next phase starts
or before the work stream ships. If the retrospective surfaces a
regression, the current phase isn't done; fix the regression
in-stream before proceeding.

### 2. The retrospective uses different gates than the current phase's verification

`verify-before-claim.md` mandates current-phase gates (build, test,
lint, code-graph). The retrospective adds:

- **Cross-file re-grep** for the OLD pattern that was supposedly
  removed in prior phase. Confirms the new pattern WINS, not
  coexists.
- **End-to-end trace** of the user-visible surface affected. For UI
  fixes: confirm the visual rendering on a live build or against a
  probe. For backend fixes: round-trip a request through the
  authoritative gate (cookie + body + audit + DB) and verify
  every layer.
- **Integration sanity** with the layer the prior phase touched.
  For backend renames: confirm callers + tests + docs all
  reference the new name. For frontend rules: confirm cascade
  order, bundle order, mount tree.

### 3. Treat user-reported regressions as evidence the retrospective was insufficient

When the user reports "the prior fix didn't actually work" or
"the bug is still there":

1. STOP the current phase.
2. RE-RUN the retrospective for the named prior phase. Use a
   DIFFERENT gate than the prior phase used. The prior gate is
   already known to be insufficient — pick another.
3. Identify the layer the prior gate missed. Add an automated
   check (lint rule, probe script, build assertion) that would
   have caught it.
4. Only after the layer is identified + checked may the current
   phase resume.

NEVER argue with the user that "CI was green so the prior fix
must be correct". CI green proves what CI exercises — nothing more.

### 4. Multi-PR work streams accumulate retrospective scope

When a work stream spans multiple PRs, the retrospective re-audits
EVERY prior PR in the same stream — not just the prior phase.
Across 3+ PRs, build a one-line "what was verified vs not" map:

```text
Stream retrospective (PR-a … PR-d — one user-visible surface):
- PR-a (sync): tree match with the base confirmed via diff stat ✓
- PR-b (style + static-analysis): analyser finding cleared ✓
                          override reaches the bundle ✓
                          BUT the rendered layer NOT verified
                          (no live render gate); FIXED in PR-d
- PR-c (field rename): verified at the edited site only; SHOULD
                       have re-grepped the whole file
- PR-d (final fix): override + build ✓; live render gate: pending
                    user verify
```

The map exposes what's not yet verified. The user-visible surface
needed a live render gate that an earlier PR's verification lacked
— and the missing gate is itself a refinement candidate (per
`continuous-learning-mandate.md`).

### 5. Add a check for every recurring miss

When the retrospective surfaces the SAME class of miss across
multiple phases, the rule's response is to add an AUTOMATED
check that catches it:

- Recurring CSS-override miss → add a build assertion that the
  override file is imported AFTER the file it overrides
- Recurring audit-field forbidden-pattern miss → add an eslint
  rule that forbids `_token_` / `_secret_` / etc. in audit
  details bag keys
- Recurring static-analyser false-positive sanitiser pattern →
  document what the analyser actually accepts for that rule class
- Recurring "rendered element not visible" → add a UI probe (e.g.
  a headless-browser test) that triggers the element on a known
  surface and asserts a visible DOM node appears

The check converts a one-off retrospective find into a permanent
guard.

### 6. Principal-level is the floor for the retrospective itself

Per `principal-level-mandate.md`, every artifact operates at
principal-engineer depth. The retrospective is no exception:

- It names the SPECIFIC layer each prior phase's gate did NOT
  exercise
- It names the SPECIFIC test (gate, probe, lint, build assertion)
  that would close the gap
- It does NOT use vague verbs like "looks fine" or "seems wired"
- It cites the file:line where each prior phase's change lives
  - the file:line where the retrospective verified the change
  is still in effect

A retrospective that reads "all prior phases verified ✓" without
naming what was checked is a violation of this rule's principal-
level floor.

### 7. The retrospective extends through the user-verification window

Per `verify-before-claim.md`, claims of completion ("done",
"shipped") are paired with same-turn verification. This rule
extends: when the work stream is user-facing AND the prior
phase shipped a user-visible fix, the retrospective stays OPEN
until the user explicitly confirms the fix in the user-visible
surface.

The retrospective block carries an open state:

```text
Retrospective state: OPEN (awaiting user verify of <surface>)
```

Until the user verifies, the prior phase is not "fully complete"
in the rule's sense — the gates exercised are the agent's
verification gates, but the surface the user cares about is the
ground truth.

### 8. Every phase also runs a multi-division principal audit of ITS OWN work

The retrospective (rules 1-7) re-verifies PRIOR phases. This rule adds the
forward half: before the CURRENT phase is marked done / committed / called
"complete", it passes a **multi-reviewer, adversarial, principal-level audit of
its own artifacts AND the cross-repo seams it touches** — not a single
self-review.

- **Delegate in parallel** to the relevant Council divisions / specialized
  reviewers (per `council-default.md`), each adversarial (job = find what's
  wrong, not confirm it works). Dimensions fire by content: architecture +
  security ALWAYS; code/async-quality on any code; compliance/privacy/residency
  on PII/regulated/cross-border; AI/ML ethics on any ML/LLM/automated-decision
  surface; infra/ops on IaC/deploy; data + cost as triggered.
- **"Everything wired" is an explicit objective** (per `code-graph-validation.md`):
  every control the design CLAIMS is actually called on the live path (no inert
  validators, no prompt-only "gates", no dead security code); every resource
  opened in construction is closed on shutdown (lifecycle symmetry); every
  producer↔consumer contract matches across repos; nothing was silently dropped
  in a lift/refactor (diff against the source of truth).
- **Severity gates the phase**: CRITICAL/HIGH open → phase NOT done (fix +
  re-audit). MEDIUM/LOW → defer ONLY as an explicit tracked task. Risk-accepting
  a CRITICAL/HIGH needs the USER's written acceptance, recorded in the plan.
- **Audit verdict goes in the phase's verify-before-claim block** — the floor of
  "gates pass" is reported as exactly that, never restated as "done":

```text
Post-phase audit (this turn):
  reviewers: architecture, security, quality, compliance, <as triggered>
  findings:  CRITICAL 0 / HIGH 0 / MEDIUM 3 (tracked) / LOW 5 (tracked)
  wiring:    controls-on-path ✓  lifecycle-symmetry ✓  cross-repo contracts ✓
  verdict:   PASS   (or BLOCKED — N CRITICAL/HIGH open)
```

A phase claim without this audit block is an overclaim (per `no-overclaim.md`).
This is a top-level job: passing lint + type-check + tests is necessary but
NEVER sufficient — green gates routinely co-exist with non-functional controls,
dropped wiring, resource leaks, and compliance gaps no linter sees.

## Hard requirement on per-phase retrospective

When the work stream is a multi-PR sequence, the retrospective
appears in the PR description of every PR after the first. Format:

```markdown
## Retrospective on prior PRs in this stream

- **PR #N (title)**: <what changed> — verified via <gate/probe>.
  Status: <closed/open-awaiting-verify/regressed-fixed-here>.
- **PR #N+1 (title)**: <what changed> — verified via <gate/probe>.
  Status: <…>.

## Recurring miss class

If this PR is correcting a layer a prior PR's verification did
NOT exercise, name the layer + name the automated check this PR
adds (or that should be added in a follow-up).
```

## Cross-references

- `verify-before-claim.md` — current-phase verification; this rule
  extends to prior-phase re-verification
- `plan-execution-progress.md` — verification block per phase; this
  rule appends the retrospective sub-block
- `done-criteria.md` — the per-language gates the verification block
  runs; this rule defines what to re-run on prior phases
- `principal-level-mandate.md` — floor for every artifact including
  retrospectives
- `no-overclaim.md` — never claim done without proof; this rule
  defines what proof spans
- `code-graph-validation.md` — incremental graph validation paired
  with verification + retrospective
- `continuous-learning-mandate.md` — recurring misses surfaced by
  retrospectives become learning candidates + rule refinements

## Learning hooks

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- Phase closed without a retrospective block (rule 1 violation)
- Prior-phase re-verification used the SAME gate as the prior phase
  (rule 2 violation — different gates required)
- User reports a regression that the prior phase's gates "passed"
  (rule 3 weakening — prior gate was insufficient)
- Multi-PR stream with no accumulated retrospective map (rule 4
  weakening)
- Same class of miss across 3+ phases without a check added
  (rule 5 weakening — recurring-miss escalation)
- Retrospective uses vague verbs ("looks fine", "seems wired")
  (rule 6 violation — principal-level floor)
- User-visible fix marked "done" before user confirms (rule 7
  weakening)

**Refinement candidates**:

- New entry in the recurring-miss-class table when 3+ phases hit
  the same class without a check
- Tightening of the "different gate" requirement when same-gate
  re-runs prove repeatedly insufficient
- New cross-reference when a sister rule's gate becomes the
  retrospective's go-to check
- New automated check the rule mandates be added when a recurring
  miss class becomes load-bearing
