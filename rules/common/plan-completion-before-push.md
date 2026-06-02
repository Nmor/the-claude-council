# Plan-Completion-Before-Push Rule (Always-On, Global)

> Auto-fires on every file. Sister to `plan-execution-progress.md`
> (how to execute) and `plan-task-breakdown.md` (how to author).
> Companion to `done-criteria.md`, `no-overclaim.md`, and
> `verify-before-claim.md`.

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

## Hard rules

### 1. Commit policy is set per plan, not by default

The agent does NOT decide whether to commit per-phase, per-task, or
once-at-end. The active plan file declares the commit policy in its
`Context` section, OR the user states it before execution begins.

Three canonical policies, each valid:

| Policy | Shape | When to choose |
| --- | --- | --- |
| `commit-policy: single` | One commit at the end of the full plan. No intermediate commits. | The user wants the smallest possible history footprint for a long rebuild; intermediate state is uninteresting; rollback granularity is not needed because the final state is verified atomically. |
| `commit-policy: per-phase` | One commit at each phase boundary; push gated until plan done. | The default for large refactors. Gives rollback granularity, durable per-phase state, but the user only sees consolidated state at push time. |
| `commit-policy: per-task` | One commit at each atomic task boundary. | Rare. Use for very high-risk migrations where any single task may need to be reverted independently. |

If the active plan does not declare a policy AND the user has not
stated one, the agent uses `per-phase` as the safe default but
flags the policy choice to the user on first commit boundary.

`git commit` is local. The "no push until plan complete" gate
applies under EVERY policy — see rule 2.

### 2. `git push` is gated on plan completion

A push only happens when:

- ALL phases of the active plan are complete (every task ticked,
  every verification gate green per `done-criteria.md`)
- AND the final phase's verification block names the gates that
  passed (per `verify-before-claim.md`)
- AND the full-graph code-graph validation across the touched-
  in-plan surface + 2-hop closure is green this turn (per
  `code-graph-validation.md` rule 9)
- AND the user has not vetoed the push

The plan file is the source of truth. If the plan has unfinished
phases OR the code-graph has dangling references, no push.

### 3. The "bug fix" exception is narrow

A push during plan execution is allowed ONLY when ALL of the
following are true:

- The push is fixing a production bug (live failure, blocking
  incident, security exposure)
- The user explicitly says something like "push the fix now" /
  "push to staging" / "ship this bug fix" — the request is
  unambiguous
- The user explicitly acknowledges the plan is still incomplete
  (verbal or written: "yes I know the rebuild isn't done, push the
  hotfix anyway")
- The hotfix is a minimal-diff change, NOT a feature bundle

Pushing because "the work feels stable" or "to back up to remote"
is NOT a bug-fix exception. Backups go via the local file system
or via dedicated personal remotes — never via the project's
primary branch.

### 4. Permission stands for the scope specified, not beyond

A user approving one push during plan execution does NOT authorize
subsequent pushes. The next push needs a fresh explicit request.
Per the global rule on actions: "A user approving an action (like
a git push) once does NOT mean that they approve it in all
contexts."

### 5. Branch protection still applies

Even when a push is authorized, branch protection rules apply:

- No force-push to `main` / `master` / `production` / release
  branches
- No `--no-verify` to skip hooks
- No `--no-gpg-sign` if signing is required
- Commit signing per repo policy

### 6. Plan completion is verified, not declared

Per `no-overclaim.md`: "complete" requires re-running the
verification gates this turn, not relying on a verification from
an earlier session. Before pushing:

- Run the full `done-criteria.md` checklist
- Run the plan's defined verification (synthetic Council task,
  link-integrity grep, dep-CVE gate, license gate, etc.)
- Surface the verification block in the response

If the block is missing or incomplete, the push is blocked until
it's done.

### 7. Multi-repo pushes need explicit per-repo authorization

When a plan touches multiple repos, the user's "push" approval
applies only to the specific repo named. Pushing to a different
repo requires a separate approval.

### 8. PR creation falls under the same gate

`gh pr create` (and equivalents on GitLab, Bitbucket) moves work
into the public surface. Same rule: no PR until the plan is done,
unless the user explicitly says "open a PR for this hotfix now."

### 9. Tagging is gated too

`git tag` is local; `git push --tags` is not. The "no push until
plan complete" rule covers tag pushes.

### 10. The agent surfaces the push decision

When the user requests a push, the agent answers with:

- Whether the plan is complete (yes / no + which phases pending)
- Whether the exception applies (bug fix? Explicitly requested?)
- The exact `git push` command that would run
- Wait for explicit confirmation if any condition is ambiguous

NEVER `git push` reflexively, even on a clear-looking command.
The cost of pausing to confirm is one message; the cost of pushing
half-finished plan state is rollback + cleanup + public
embarrassment.

## Canonical correct push flow

```text
User: "push it"
Agent: "The active plan has <X>/<Y> phases complete. Phases
        <list> are still in progress.

        Per ~/.claude/rules/common/plan-completion-before-push.md
        I do not push mid-plan unless this is an explicit bug fix.

        Is this:
        (a) the plan is now ready to push (I will re-run
            done-criteria and the verification block first)
        (b) a bug fix with explicit override of the rule
        (c) something else
        ?"
User: "(a) — let's verify and push"
Agent: <runs full verification, presents block, then pushes>
```

## Anti-pattern: what NOT to do

```text
User: "ok looks good"
Agent: <silently runs git push> "Pushed."
```

This violates rules 2, 6, 10 simultaneously. The user said "looks
good," not "push." The agent inferred an action that crosses a
remote boundary without explicit authorization for THAT action.

## When this rule fires

- Any session containing a TodoWrite list with unfinished tasks
- Any session whose active plan file has phases pending
- Any session that has run `git commit` but not `git push`
- Any session where the user uses ambiguous language ("ship",
  "ready", "done", "let's go") — the agent re-confirms before
  pushing

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

## Why this rule exists

Multi-phase plans span days or weeks. The temptation during long
executions is to push intermediate state to remote — "for
backup," "so CI can see," "in case I lose work." Each premature
push:

- Triggers CI on incomplete state (red builds, false alerts)
- Confuses teammates pulling the branch (broken state)
- Locks the agent into supporting the partial shape (revert is
  harder once others have pulled)
- Pollutes the commit history visible to reviewers

Bug fixes are inherently disjoint from the plan — they fix
immediate live state, not advance the plan. They get their own
PR, their own approval cycle, and they don't piggyback on
plan-in-flight commits.

User directive (verbatim): "we always complete plan before any
push except if for a bug and is explicity requsted by user to
break the rule."

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `git push` executed while plan phases still pending (rule 2 violation — push gate weakening)
- Active plan does not declare `commit-policy` in its Context (rule 1 violation — implicit policy drift)
- "Push" inferred from ambiguous user language ("ship", "ready", "looks good") without explicit confirmation (rule 10 weakening)
- Bug-fix exception claimed without an actual live-failure / explicit-override pair (rule 3 misuse)
- Multi-repo push approval reused across repos without per-repo confirmation (rule 7 weakening)
- `git push --tags` or PR creation done mid-plan without explicit per-action authorization (rules 8 + 9 weakening)
- Verification block missing or stale at push time (rule 6 violation — claim without proof)
- `--no-verify` / `--no-gpg-sign` used to bypass hooks (rule 5 violation)

**Refinement candidates**:

- New row in the "exception" rule when a recurring time-pressure class (security incident, regulator deadline) emerges with documented user-side authorization shape
- Tightening of the ambiguous-language list when a new phrase ("let's go", "all good") proves to silently authorize pushes
- New cross-reference when a sister rule (no-overclaim, verify-before-claim, no-silent-drops) provides a pre-push gate
- New row in the push-decision response shape when multi-repo / multi-branch / multi-tag pushes recur
