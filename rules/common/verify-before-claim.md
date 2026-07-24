# Verify-Before-Claim Rule (Always-On, Global)

> Auto-fires on every file. Sister to `no-overclaim.md` (the
> negative form: never claim done without proof), `done-criteria.md`
> (the gates that verification runs), `local-testability.md`
> (every code change is locally testable; the prerequisite for
> verification). Companion to `plan-execution-progress.md`
> (verification block per phase) and `error-handling-with-context.md`
> (test assertions on stable codes).

## Core Principle

**Every claim of completion ("done", "fixed", "shipped", "passes",
"working", "complete", "100% solid") MUST be preceded — in the
SAME turn — by a verification action that produced the evidence
backing the claim. The verification's output is captured in the
response BEFORE the claim phrase. If verification was not run
this turn, the claim is downgraded to "implemented — verification
deferred to <specific gate / window>" with an explicit unblock
task.**

The pattern this rule prevents: stale claims. An earlier turn ran
the tests, ten edits happened since, the agent says "tests still
pass." The verification is no longer valid — files have changed.

## Hard rules

### 1. Claim phrases require same-turn evidence

Banned without same-turn verification:

- "done"
- "complete"
- "fixed"
- "shipped"
- "working"
- "passes"
- "100% solid"
- "production-ready"
- "ready to ship"
- "bulletproof"
- "battle-tested"
- "all set"
- "looks good"
- "should be fine"
- "I'm confident"
- "I think it works"

Replace with one of:

- "implemented — `<verification gate name>` not run yet; running
  next"
- "implemented + verified this turn (`<gate>`: `<result>`)"
- "implemented, deferred verification to `<specific window>`
  because `<specific reason>` — tracked as `<follow-up task>`"

### 2. The verification block IS the proof

Every claim of completion attaches a verification block naming
the gates that ran this turn:

```text
Verification (this turn):
- tsc --noEmit: 0 errors
- eslint <touched files> --max-warnings 0: clean
- vitest run <touched>: 14/14 pass
- ide diagnostics: 0
- proper-fixes audit (per proper-fixes-first.md): green
- docs-sync gate: feature page exists; landing accurate
- code-graph (per code-graph-validation.md): outbound 47/47
  resolve; inbound: 0 orphans; cross-artifact: hooks/agents/
  skills/commands all wired
```

Missing gates are listed explicitly: "docs-sync gate not run
(no docs touched this turn)". No silent skip. The code-graph
row appears on every claim that touched code OR config —
omitted only on pure prose / non-graph edits, and that
omission is stated explicitly.

### 3. Time scope: THIS turn, not earlier in the session

A gate that passed in an earlier turn does NOT cover work in
the current turn. Re-run the gate when:

- Any source file has changed since the last run
- Any config / lockfile / dependency has changed
- Any environment variable / vault entry has changed
- Any docs file has been touched
- The user is about to act on the claim (request to deploy,
  request to push, request to mark a task done)

### 4. Verification is paired with the claim, not "later"

The flow MUST be:

1. Make the change.
2. Run the verification.
3. Capture the verification output.
4. Make the claim, including the output.

NOT:

1. Make the change.
2. Make the claim ("done!").
3. Hope the gate passes when someone else runs it.

### 5. Verification fails → claim is downgraded immediately

When the gate fails after a claim was about to be made:

- DO NOT make the claim.
- Surface the failure explicitly with the gate's actual output.
- Fix the underlying issue (per `proper-fixes-first.md` — root
  cause, not symptom).
- Re-run the gate.
- Only after green do we make the claim.

### 6. When the user challenges a claim, RE-VERIFY first

If the user says "are you sure?" / "no it isn't" / "doesn't
work" / "didn't run":

1. STOP defending the claim.
2. Re-run the verification THIS turn.
3. Report the actual current state honestly.
4. If the gate fails, acknowledge the earlier claim was
   premature.
5. Fix + re-verify before any new claim.

NEVER re-affirm a claim under challenge without re-verification.
The user has more signal at this point than the agent does.

### 7. Verification scopes by claim type

Different claims require different gates:

| Claim shape | Minimum gates this turn |
| --- | --- |
| "Bug fixed" | Lint clean + tests pass (touched + adjacent) + reproduction script no longer reproduces + code-graph clean on touched files (per `code-graph-validation.md`) |
| "Feature implemented" | Lint + type-check + unit + integration tests + manual smoke (UI features) or HTTP probe (API features) + code-graph clean on touched + neighbor surface |
| "Refactor complete" | Lint + type-check + full test suite + diff-vs-baseline behavioral equivalence + code-graph: every renamed / moved symbol's inbound edges updated, no dangling references |
| "Migration complete" | Schema diff applied + backfill ran + dual-write window passed + cutover verified + code-graph: every consumer of new schema validated; every consumer of old schema is migrated or documented deferred |
| "Deploy ready" | All `done-criteria.md` checks + `proper-fixes-first.md` audit + `docs-sync-with-code.md` audit + dep-CVE + license gates + full-graph validation on plan surface (per `code-graph-validation.md` rule 9) |
| "Production deployed" | Above + health endpoints 200 + smoke E2E green + metrics within SLO |
| "Plan complete" | Every phase's verification block green + bloat-removal phase ran + every TodoWrite item ticked |
| "Integration / external-contract / current-version work" | The applicable gates above **plus** a `Research (this turn)` block — each primary source as title · URL · read-date · key finding, per `council-default.md` rule 11 + `official-docs-first.md`. A claim on integration / SDK / API / provider / webhook / current-version work WITHOUT this block is INCOMPLETE (a NO-GO). |

**The `Research (this turn)` done-gate.** Any completion claim on work that
touches an external contract (API / SDK / protocol / webhook / config schema) or
that depends on a current version / recent breaking change MUST carry a
`Research (this turn)` block in the verification block:

```text
Research (this turn):
- <source> · <URL> · <read-date> · <key finding that shaped the change>
```

Absent it, the claim is downgraded to "implemented — research pending". The
`research-gate.js` PreToolUse hook is the mechanical belt-and-braces: a
non-blocking nudge fires when integration-shaped source is edited before any
`WebSearch`/`WebFetch` runs this session (the `research-marker.js` PostToolUse
hook clears it once research runs). Established-stable facts (a long-standing CLI
exists) need no fetch; current versions, provider contracts, and payload shapes do.

### 8. Test files have no exemption

Per `no-discards.md`, tests bind every value. Per
`error-handling-with-context.md` rule 10, tests assert on
`error_code` not `message`. Per this rule, when the test gate
runs, the agent reads the output — green doesn't mean "no
output is visible"; green means "the test runner exited 0 AND
the assertion count matches expected AND no warnings printed."

### 9. Manual verification counts (when machine verification is

insufficient)

For UI features, smoke tests, performance changes, accessibility
work, etc., manual verification is mandatory:

- **UI**: open the feature in a browser, exercise the golden
  path + at least one edge case, confirm the visible behaviour.
- **API**: hit the endpoint with a real request; inspect the
  response shape + status code + headers.
- **Performance**: capture before / after numbers; the
  improvement is in the numbers, not in the assertion.
- **Accessibility**: tab-through navigation + screen-reader
  smoke; axe-core scan; visible focus rings.

The manual-verification result goes in the verification block
just like the automated gates.

### 10. The "no-op" verification is still a verification

If a change is provably no-op (e.g., a doc-only edit, a comment
update), the verification block names that explicitly:

```text
Verification (this turn):
- diff scope: doc-only (no source changed)
- markdownlint: 0 warnings
- link integrity: clean
- (lint / type-check / tests not applicable — no source code
   touched)
```

The "not applicable" is verified — i.e., the agent confirmed
the diff scope before claiming N/A.

### 11. Delegated work is only "verified" when the gate actually ran

When code changes are delegated to a sub-agent / reviewer / tool, the change is
NOT verified until the verification gate has been RUN against it — by whoever can
run it. Therefore:

- **Check the delegate can run the gate before delegating a verifiable change.**
  A sub-agent that cannot execute the gate (e.g. Bash/test-runner unavailable to
  it) CANNOT satisfy this rule. Do not delegate gate-requiring code fixes to a
  delegate that cannot verify them — either grant it the capability, or keep the
  change in a context that can run the gate.
- **A delegate's unverified edits are accepted only after the orchestrator runs
  the gate** on them this turn and captures the block. "The sub-agent wrote it"
  is not verification; "the gate passed on what the sub-agent wrote" is.
- **A delegate that correctly refuses to claim done without running the gate is
  behaving correctly** — treat its refusal as the signal to re-route the work,
  not to override it.

Incident (2026-06-05): fix-work was delegated to background sub-agents that were
denied Bash; they could not run ruff/mypy/pytest and (correctly) refused to write
unverified security-critical code. The delegation produced zero verified output;
the fixes had to be done in a gate-capable context. Verify the delegate's
gate-capability up front.

## Anti-pattern: the stale-verification claim

```text
[Earlier turn]: agent ran tests, all 2094 passed.
[Current turn]: agent makes 8 edits, then says "tests still pass."
                But the test gate was NOT re-run.
```

This is a violation of rule 3. The earlier turn's verification
covers the earlier state; this turn's state needs this turn's
verification.

## Anti-pattern: the re-affirm under challenge

```text
User: "are you sure it works?"
Agent: "yes, definitely working."   ← no new verification ran
User: "show me the output."
Agent: <runs gate, gate fails> "ah, I see now..."
```

This is a violation of rule 6. The challenge should have
triggered re-verification BEFORE the re-affirm.

## Cross-references

- `no-overclaim.md` — the negative form; complementary
- `done-criteria.md` — the canonical per-language gate suites
- `code-graph-validation.md` — incremental graph validation
  paired with every verification block; outbound + inbound +
  cross-artifact integrity
- `local-testability.md` — verification requires the change to
  be locally testable; the prerequisite condition
- `proper-fixes-first.md` — when a gate fails, fix the root
  cause, never the symptom
- `plan-execution-progress.md` — verification block per phase
- `plan-completion-before-push.md` — pre-push verification gate
- `error-handling-with-context.md` rule 10 — test assertions on
  stable codes
- `docs-sync-with-code.md` — docs verification is part of every
  "done" claim
- Council Protocol Phase 3 (`CLAUDE.md`) — implementation phase
  ends with the verification block before the post-impl review

## Why this rule exists

Documented incidents in real sessions:

1. Agent claimed "100% solid" mid-session; on user challenge,
   verification found 9 calendar bugs + 10 silent-failure sites
   - 4 regressions + 25 UX gaps. The claim was wrong by
   hundreds of items.
2. Agent claimed a backend change was "shipped"; nothing had
   been pushed. The user discovered this when production
   behaviour didn't change.
3. Agent claimed a refactor "fully migrated"; a grep showed
   three files still on the old pattern. The "fully migrated"
   claim was wrong.

In every case, the cost of re-running the verification first
would have been minutes. The cost of the false claim was hours
of rework + user trust loss.

User directive (verbatim): **"Always verify before claims and
for every coding request they must be able to run locally."**

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Claim phrase issued without same-turn verification (rule 1 violation)
- Stale verification block (gate ran earlier turn; files have changed since)
- Re-affirm under user challenge without re-verification (rule 6 violation)
- Verification block missing a gate the claim class requires (rule 7 scope mismatch)
- Manual verification (UI smoke / accessibility / perf) skipped on a UI / a11y / perf change
- "No-op" claim made without confirming the diff scope is actually no-op
- Verifiable code change delegated to a sub-agent/tool that cannot run the gate (rule 11 violation)
- A delegate's edits accepted as "done" without the orchestrator running the gate on them this turn (rule 11)

**Refinement candidates**:

- New row in the "verification scopes by claim type" table when a claim class gains a load-bearing gate
- New banned claim phrase when a recurring rhetorical pattern slips past the rule
- Tightening of the "re-run when" triggers when stale verifications recur
- New cross-reference when a sister rule defines the gate a claim depends on
