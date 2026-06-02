# Git Workflow

## Per-org git identity (set before the first commit)

When a developer or agent works across multiple GitHub organisations
with distinct email identities (personal account, employer org, side
project org, client orgs), the canonical shape is:

1. **Global default** in `~/.gitconfig` — set to the most-used or
   least-sensitive identity (typically personal).
2. **Per-org override** via `[includeIf
   "hasconfig:remote.*.url:https://github.com/<org>/**"]` blocks
   loading a `~/.gitconfig-<org>` snippet that pins `user.name`,
   `user.email`, AND `user.signingkey`.
3. **Per-org signing key** registered as a *Signing Key* (not just
   an Authentication Key) on the matching GitHub account.
4. **First-touch protocol**: on first clone / first edit of a repo
   from a new org, the agent verifies `git config user.email`
   matches the org's identity BEFORE the first commit. Mismatched
   commits create attribution accidents; never rewrite already-
   pushed history without explicit user authorization.
5. **Per-workspace specifics** (exact identities, signing-key paths,
   path-coverage globs) live in that workspace's `.claude/rules/`,
   not in global. Global states only the principle.

## Commit Message Format

```text
<type>: <description>

<optional body>
```

Types: feat, fix, refactor, docs, test, chore, perf, ci

Note: Attribution disabled globally via ~/.claude/settings.json.

## Pull Request Workflow

When creating PRs:

1. Analyze full commit history (not just latest commit)
2. Use `git diff [base-branch]...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch

## Feature Implementation Workflow

1. **Plan First**
   - Use **planner** agent to create implementation plan
   - Identify dependencies and risks
   - Break down into phases

2. **TDD Approach**
   - Use **tdd-guide** agent
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 70%+ coverage

3. **Code Review**
   - Use **code-reviewer** agent immediately after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Commit authored with wrong identity for the target org (per-org `includeIf` block missing or misconfigured)
- Commit unsigned when the repo's policy requires signing (signing-key not registered for that org's identity)
- First-touch protocol skipped — agent commits before verifying `git config user.email` matches the org (rule "First-touch protocol" weakening)
- PR created from only the latest commit's diff instead of the full divergence diff vs base (PR workflow violation)
- Branch pushed without `-u` flag on first push (workflow weakening — upstream tracking missing)
- TDD coverage gate of 70% used instead of canonical 90% touched / 80% project (sister rule `extreme-lint-policy.md` weakening — stale threshold)
- Already-pushed history rewritten without explicit user authorization
- Conventional-commits type misused (e.g., `feat:` for a pure refactor; `fix:` for a feature)

**Refinement candidates**:

- New conventional-commit type row when a recurring change class needs distinct labelling (e.g., `revert:`, `deps:`, `i18n:`)
- Tightening of the per-org first-touch check when identity mismatches recur in retrospectives
- New cross-reference when a sister rule (plan-completion-before-push, no-overclaim) provides a pre-push gate
- New PR template row when a recurring section (security checklist, accessibility checklist) belongs in every PR body
