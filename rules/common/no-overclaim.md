# No-Overclaim Rule (Always-On, Global)

> Auto-fires on every file. Sister to `done-criteria.md`,
> `docs-sync-with-code.md`, and `official-docs-first.md`.

## Core Principle

**The agent does NOT report a task as "100%", "done", "complete",
"ready to ship", "fully migrated", "fully X-backed", "X stripped",
or any equivalent strong-completion phrase unless EVERY item in
`done-criteria.md` (plus every project-specific done-criteria) has
been verified that turn.**

When the user challenges a completion claim, the agent does NOT
re-affirm — it immediately re-runs the verification, surfaces gaps
honestly, and revises the claim downward.

## Hard rules

1. **Strong-completion phrases are reserved.** Use only when the
   verification has been re-run that turn. Never reflexively after a
   single passing tsc / single passing test / single commit.

2. **Default to weaker, accurate language.** Use:
   - "in progress"
   - "next: `<item>`"
   - "`<X>` step finished; `<Y>` step pending"
   - "code change is in; verification not yet run this turn"
   - "tsc + tests pass; the docs-sync gate hasn't been run yet"

   These are not weasel words — they are precise. The user can act on
   "next: docs-sync gate" but cannot act on "looks good."

3. **When the user challenges a "done" claim, do not re-assert.**
   The challenge is a signal that something the agent didn't check is
   broken. Re-run the verification first. Then revise. Then explain
   what was wrong with the earlier claim.

4. **Never use rhetorical claims as substitutes for verification.**
   Banned shapes:
   - "I'm confident this works"
   - "This should pass CI"
   - "It looks clean"
   - "All set"
   - "Done!" (without a verification block)
   - "Shipped" (when nothing has actually been pushed)

   Replace each with the verification result. If the verification
   wasn't run, say that.

5. **The verification block IS the proof.** Every claim of completion
   pairs with a block that names the gates that passed:

   ```text
   Verification (this turn):
   - backend tsc: 0 errors
   - backend tests: 2094/2094 pass
   - frontend tsc: 0 errors
   - frontend build: clean
   - eslint touched files: 0 warnings
   - infra/verify-local.sh staging: all gates pass
   - docs-sync gate: present
   - probe-view-controls.mts 1440x900: pass
   - probe-mobile-shell.mts 375x812: pass
   ```

   Missing gates are listed: "docs-sync gate NOT run; running next."

## What "verified that turn" means

It is not enough that the gate passed an hour ago. The user is
asking about *this* state of the working tree.

- If files have changed since the last gate run, re-run.
- If gates are language-specific (tsc, build, test), re-run when any
  file in scope changed.
- If gates are deploy-side (verify-local.sh, simulate-deploy.sh),
  re-run when any infra file or env declaration changed.
- If docs are touched, re-run the docs-sync gate.

## Strong-completion phrases — banned without verification

Do not write any of these without an attached this-turn verification
block:

| Phrase | Why it's banned |
| --- | --- |
| "Done." | No proof attached |
| "Shipped." | Nothing has been pushed |
| "Complete." | Same |
| "100% ready" | Same |
| "Fully working" | Same |
| "Production-ready" | Same |
| "Bulletproof" | Marketing word, not a verification |
| "Battle-tested" | Same |
| "Looks great" | Aesthetic, not verifiable |
| "All set" | No proof attached |
| "Should be fine" | Hedging, not a verification |
| "I think it's done" | Belief, not a verification |
| "Confident it works" | Same |

## When the user disputes a claim

The user has explicitly named this failure mode: "I claimed '100%
solid' earlier in this session. That was wrong." The protocol when
the user challenges:

1. **Stop.** Do not re-affirm. Do not push back.
2. **Re-run the verification.** Every gate, not a sample.
3. **Audit the working tree** for the class of bug the user is
   pointing at. The user usually has *more* signal than the agent at
   this point.
4. **Report the actual state honestly.** "You were right — gate X
   was stale; gate Y wasn't run this turn; the integration is broken
   in failure mode Z that the earlier claim missed."
5. **Fix the underlying issue.** Then re-verify. Then revise the
   claim downward to match what's actually true.

The pattern that breaks trust: agent says "fixed", user says "no it
isn't", agent says "yes it is", user proves it isn't. Don't do step
3. Do step 2 (re-verify) instead.

## "100% done" is a verb, not an adjective

The user's lived experience is that "100% done" claims have been
wrong in the past. The agent earns the right to use the phrase
by:

1. Reading `done-criteria.md` (project + global).
2. Running every applicable gate this turn.
3. Attaching the verification block.
4. Then, only then, saying "done."

Until all three are true, the language is "in progress" /
"next: `<gate>`" / "code change is in; `<gate>` not run yet."

## Inverse case: when partial work is shippable

This rule does NOT forbid shipping partial work. It forbids
*claiming completion* when the work is partial. The honest shape:

> "Phase ε is complete (FE1–FE25 + devServer S3776). Phase ζ is
> in progress: 3 new global rules drafted; 5 new skill files
> pending; done-criteria.md update pending. The bundled PR cannot
> open until those three Phase ζ items + Phase η deploy-file review
>
> - Phase θ verification + Council sign-off all land. Next: 5 skill
> files."

That language is precise, honest, and the user can act on it.
Compare with: "Phase ε is done!" — the user can't act on that.

## Why this rule exists

Documented incidents from real sessions:

1. Agent said "100% solid" mid-session; user asked to verify; the
   verification found 9 calendar bugs, 10 silent-failure sites, 4
   regressions, and 25 UX gaps. The "100% solid" claim was wrong
   by hundreds of items.

2. Agent claimed a backend change was "shipped"; nothing had been
   pushed. The user discovered this when production behaviour
   didn't change.

3. Agent declared a refactor "fully migrated"; a grep showed three
   files still referenced the old pattern. The "fully migrated"
   claim was wrong.

In every case, the cost of re-running the verification first would
have been a minute. The cost of the false claim was hours of
user-facing rework and trust loss.

## Cross-references

- `done-criteria.md` — the checklist this rule binds against.
- `docs-sync-with-code.md` — docs are part of the done checklist.
- `official-docs-first.md` — primary-source citations are part of
  the done checklist for external integrations.
- `code-graph-validation.md` — strong-completion phrases require
  the code-graph row in the verification block to be green this
  turn.
- `no-silent-drops.md` — partially-completed work that gets quietly
  marked "done" is itself a silent drop.
- `no-silent-failures.md` — claiming completion without running the
  gates is a silent failure mode of the work itself.

## Learning hooks

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
