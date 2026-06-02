# Branch protection — exact settings

> Cross-references:
> [`CONTRIBUTING.md`](CONTRIBUTING.md) ("Maintainer review required
> before merge"),
> [`../CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) ("Pull-request
> review gate"),
> [`../.github/CODEOWNERS`](../.github/CODEOWNERS) (review routing).

## Why this file exists

The PR review gate is enforced in three places that must agree:

1. The conduct + contributing docs name  as the required reviewer.
2. [`../.github/CODEOWNERS`](../.github/CODEOWNERS) routes every path
   to  (default `* ` plus explicit per-path entries).
3. **GitHub branch protection** on `main` is what GitHub actually
   enforces at merge time.

If branch protection is misconfigured, items 1 + 2 are policy
without teeth. This file is the exact configuration the repo runs +
the commands to verify it.

## Required settings on `main`

These match the contract in
[`CONTRIBUTING.md`](CONTRIBUTING.md#maintainer-review-required-before-merge)
and
[`../CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md#pull-request-review-gate).

| Setting | Value | Why |
| --- | --- | --- |
| Require a pull request before merging | **ON** | No direct pushes to `main` |
| Require approvals | **1** | Maintainer review gate |
| Dismiss stale pull request approvals when new commits are pushed | **ON** | Approval reflects what's actually merging |
| Require review from Code Owners | **ON** | Routes the approval to  via [CODEOWNERS](../.github/CODEOWNERS) |
| Restrict who can dismiss pull request reviews | **ON** —  only | Prevents contributors from clearing their own block |
| Allow specified actors to bypass required pull requests | **OFF** (empty list) | No bypass, including for the maintainer's own PRs |
| Require status checks to pass before merging | **ON** | CI + verifiers must be green |
| Require branches to be up to date before merging | **ON** | Rebase before merge so checks reflect the merged state |
| Require conversation resolution before merging | **ON** | No unresolved review threads at merge time |
| Require signed commits | **ON** (recommended; toggle when contributors are GPG-set-up) | Supply-chain integrity |
| Require linear history | **ON** (recommended) | Easier history reading + reverts |
| Require deployments to succeed before merging | **OFF** (no deploy target) | N/A for a config repo |
| Lock branch | **OFF** | `main` is active |
| Do not allow bypassing the above settings | **ON** | Even admins cannot bypass; the org-admin override is the only escape and it audit-logs |
| Restrict who can push to matching branches | **ON** —  only (and CI bot if a release workflow needs it) | Only the maintainer (or named release automation) pushes |
| Allow force pushes | **OFF** | No history rewrites on `main` |
| Allow deletions | **OFF** | `main` cannot be deleted |

### Required status checks (exact names)

Pin the following job names from
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (verify
the actual names with the audit command in the next section before
committing them to the ruleset):

- `markdownlint`
- `verify` (the canonical `bootstrap/verify.sh` job)
- `link-check`
- Any future security / license / CVE gates added under the same
  workflow

If a check is renamed, update both the workflow AND this list AND
the GitHub UI selection — the three must agree.

## Recommended: also use a Repository Ruleset

GitHub Rulesets (the modern successor to classic Branch Protection)
let you express the same gate as committed configuration. Both
flavors are supported. If you adopt a Ruleset:

- Scope: `main`
- Bypass list: **empty**
- Rules: pull_request (1 approval, dismiss stale, require codeowner
  review, require last-push approval), required_status_checks (the
  jobs above, strict), required_signatures, required_linear_history,
  non_fast_forward (block force-push), deletion (block deletion)

Rulesets can be SHA-pinned via the `.github` org repo for fleet-wide
enforcement (per
[`../rules-library/common/security-controls-org-wide.md`](../rules-library/common/security-controls-org-wide.md));
for this single repo, configuring the Ruleset at the repo level is
sufficient.

## Audit — verify the live config matches this file

Run before every release. Requires `gh` authenticated with a token
that has admin read on this repo.

```bash
# Replace OWNER/REPO with your fork's path if you mirrored it.
OWNER=nmor
REPO=the-claude-council

# 1) Branch protection on main
gh api "repos/$OWNER/$REPO/branches/main/protection" \
  --jq '{
    required_pull_request_reviews: .required_pull_request_reviews,
    required_status_checks:        .required_status_checks,
    enforce_admins:                .enforce_admins.enabled,
    required_signatures:           .required_signatures.enabled,
    required_linear_history:       .required_linear_history.enabled,
    allow_force_pushes:            .allow_force_pushes.enabled,
    allow_deletions:               .allow_deletions.enabled,
    restrictions:                  .restrictions,
    required_conversation_resolution: .required_conversation_resolution.enabled
  }'

# 2) Rulesets (if you use the newer Rulesets surface)
gh api "repos/$OWNER/$REPO/rulesets" --jq '.[] | {id, name, enforcement, target}'
gh api "repos/$OWNER/$REPO/rulesets/<RULESET_ID>" \
  --jq '{name, enforcement, bypass_actors, rules}'

# 3) CODEOWNERS resolves the way you expect
gh api "repos/$OWNER/$REPO/codeowners/errors" \
  --jq '{errors}'
# Empty errors object = the CODEOWNERS file parses cleanly.
```

Expected output for #1 (key fields):

```text
required_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews:           true
  require_code_owner_reviews:      true
  require_last_push_approval:      true
  dismissal_restrictions:
    users: [nmor]
    teams: []
required_status_checks:
  strict:   true
  contexts: [markdownlint, verify, link-check, ...]
enforce_admins:               true
required_signatures:          true   # if you've turned this on
required_linear_history:      true   # if you've turned this on
allow_force_pushes:           false
allow_deletions:              false
restrictions:
  users: [nmor]
  teams: []
required_conversation_resolution: true
```

Any divergence between the expected output and the live response is
a finding. Fix immediately — a relaxed gate that nobody notices is
worse than no gate (it gives a false sense of safety).

## Apply / re-apply the ruleset via `gh api`

If you want to make the live config reproducible, commit a JSON
template alongside this file (e.g., `docs/branch-protection.json`)
and apply with:

```bash
gh api -X PUT \
  "repos/$OWNER/$REPO/branches/main/protection" \
  --input docs/branch-protection.json
```

Treat the JSON template as security-sensitive: every change to it
needs the same CODEOWNER review as a rule change (the file is
already under the default `* ` route in
[`../.github/CODEOWNERS`](../.github/CODEOWNERS)).

## Symmetry note (the maintainer's own PRs)

The contract is symmetric:  cannot self-approve a substantive
PR. For solo collaboration this means either:

- The maintainer requests review from a trusted external reviewer
  (per [`../CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) "Conflict
  of interest"), OR
- The change is small + auditable enough that the post-merge audit
  trail is the review (status checks + signed commit + linear
  history + visible diff), AND the PR description explicitly notes
  "self-merged: low-risk class — see audit trail" so future
  reviewers can spot the case in `git log`.

The bypass list MUST stay empty. The org-admin override remains
available for genuine emergencies (a stuck CI bot, a malicious
contributor inside an in-flight PR) and every use of it is logged
in the GitHub audit log; treat each entry as something to be
explained at the next review.

## Drift signals (per `continuous-learning-mandate.md`)

Watch for:

- Status-check name mismatch between CI workflow + branch protection
  (a renamed job that wasn't propagated)
- Bypass list growing beyond empty
- "Restrict who can push" disabled "temporarily" and never re-enabled
- Force-push toggled on without the same-day toggle off
- CODEOWNERS routing a path to no owner (orphan ownership)

Each drift signal is a PR-priority fix.

## When this file evolves

Any change here is a contract change. PRs that modify this file go
through the standard review gate AND must include the new audit
output in the PR description, proving the live config matches the
new contract before the PR merges.
