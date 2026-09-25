# Plan-Completion-Before-Push Rule (Always-On, Global)

> Auto-fires on every file. Sister to `plan-execution-progress.md`
> (how to execute) and `plan-task-breakdown.md` (how to author).
> Companion to `done-criteria.md`, `no-overclaim.md`, and
> `verify-before-claim.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Core Principle

**Never push to a remote (`git push`, `git push --tags`, or any
equivalent that moves commits out of the local repo) until the
ENTIRE plan is complete and verified. The only exception: a bug
fix the user has EXPLICITLY requested AND has explicitly authorized
to break this rule for.**

The pattern this rule prevents: pushing mid-plan, which puts
partial / half-finished state in front of teammates / CI / cloud
deploy pipelines / external observers — exactly when the work is
NOT ready to be observed.

## Hard rules (summary)

1. Commit policy is set per plan, not by default
2. `git push` is gated on plan completion
3. The "bug fix" exception is narrow
4. Permission stands for the scope specified, not beyond
5. Branch protection still applies
6. Plan completion is verified, not declared
7. Multi-repo pushes need explicit per-repo authorization
8. PR creation falls under the same gate
9. Tagging is gated too
10. The agent surfaces the push decision
11. No AI-attribution trailer in any commit or PR
12. No commit and no push carries code without docs — or a `Docs:` line in the message
    recording why none are needed ("Docs: none — internal refactor, no behaviour change").
    The line is the decision made visible; silence is how docs go stale one commit at a time.
13. No commit carries code newer than the plan: tick the task in the plan, then commit
    (`plan-execution-progress.md` rule 8).

**Enforced at both boundaries, from git's own record.** `commit-gate.js` checks rules 12 and
13 against what is staged; `pre-push-gate.js` checks rule 12 against every commit no remote
has yet, which also catches commits made in a terminal or with the commit gate switched off.
A change made through Bash is seen exactly like an Edit. One-off override:
`CLAUDE_DOCS_SYNC=off <push>` or `CLAUDE_COMMIT_GATE=off <commit>`, with the reason written
into the PR or commit body.

## Full text

The hard rules above are the always-on trigger — enough to know the rule applies and
what it demands. Their full text (worked examples, anti-patterns, tables, procedures)
lives in the
**`planning-rules`** skill (invoke it: it does not load by itself); the `pre-push-gate.js`
PreToolUse hook enforces the gate mechanically at `git push`, with no bypass.

Read it before acting on this rule. Carrying the full body on the always-on Floor cost
every turn of every unrelated task for guidance that applies at one specific moment.

## Cross-references

- `plan-execution-progress.md` — per-phase progress reporting
- `plan-task-breakdown.md` — granular task structure that
  determines "plan complete"
- `done-criteria.md` — what "done" means
- `code-graph-validation.md` — pre-push gate runs the full-graph
  validation across the touched-in-plan surface + 2-hop closure
- `no-overclaim.md` — never claim done without verification
- `verify-before-claim.md` — verification paired with claim
- `proper-fixes-first.md` — bug fixes are the only exception;
  they must be PROPER (root-cause) fixes, not workarounds
- Global rule on "Executing actions with care" — destructive,
  hard-to-reverse, visible-to-others actions need explicit user
  approval

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill. Invoke it when refining this rule: it does not load
by itself. They are instructions for maintaining THIS ARTIFACT, not for doing
the task at hand, so they are not carried on every turn.
