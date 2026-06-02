# Every deploy failure becomes a pre-deploy check (global)

## The rule

When a deployment fails on a documented platform limit (AWS, GCP,
Azure, Vercel, Cloudflare, Fly, Render, Kubernetes, anything with a
cap that ships in vendor docs), the next commit MUST add a local
pre-deploy check that would have caught it. The check goes wherever
the project runs its local-pre-flight script (typical names:
`infra/verify-local.sh`, `scripts/preflight.sh`, or a `predeploy`
npm script). CI runs the same script, so the check fires both
locally and in pre-deploy.

The check is part of the SAME commit that fixes the failure — never a
follow-up ticket. Without this, the same class of bug will hit again
the next time someone touches the same area.

## Why

Same-shape failures recur because the local environment doesn't run
the exact validation the cloud provider does. Every recurrence is a
20-minute deploy + a 5–10 minute rollback. Every check we add is
30 seconds locally and prevents an hour in CI.

## What counts as a "platform limit"

Any documented vendor constraint with a publicly-known number that
can be computed from a local artifact (built template, packaged
zip, manifest, lockfile) without calling the platform's API. Examples:

| Platform | Limit class | How to check locally |
| --- | --- | --- |
| AWS IAM | Managed-policy size 10,240 bytes | Read the JSON policy, byte-count it |
| AWS Lambda | Env-bag size 4,096 bytes / function | Parse packaged CFN, sum per-function env JSON |
| AWS Lambda | Package size 250 MB unzipped | `unzip -l` the package |
| AWS CloudFormation | 500 resources / stack | Count `Resources:` entries in template |
| AWS API Gateway | 600 routes / stage | Count event blocks |
| AWS DynamoDB | 20 GSIs / table | Count GSIs in CFN |
| AWS WAF v2 | 1,500 WCU / web-ACL | Sum rule WCU from CFN |
| AWS SQS | 256 KB message size | n/a (runtime, not deploy) |
| Vercel | 4.5 MB API response | n/a (runtime) |
| Cloudflare Workers | 1 MB script size | `ls -l dist/worker.js` |
| Kubernetes | 1 MB annotation size | YAML byte-count |
| Docker | 4 KB env per container (Lambda-equivalent) | parse `Dockerfile`/`compose.yml` env |

Runtime-only limits (request size, payload size, message size) are
not in scope for pre-deploy checks — those belong in test suites.
Pre-deploy checks target the **deploy-fail** class.

## Authoring the check

1. Read the packaged / built artifact (CFN template, K8s manifest,
   built worker bundle).
2. Walk the relevant resource type. Compute the size the same way the
   platform does (UTF-8 bytes, JSON serialisation rules, count of
   nested resources, etc).
3. Fail at a SOFT limit slightly below the documented cap to leave
   headroom for platform-managed reserved keys / template expansion.
4. Print the offending resource name + computed size + documented cap
   - a one-line "Fix:" hint pointing to the conventional remediation.
5. Add the check to the project's local-pre-flight script. CI runs
   the same script.

## When the check fires repeatedly

The check is the floor, not the ceiling. If a check fires more than
once in a quarter (or twice in a year), the underlying architectural
pattern that's filling the budget is the real problem. The proper
fix is to redesign so the budget isn't continuously approached.

For the Lambda env-bag specifically, the recurring filler is
per-table env vars in a multi-cell deployment — each cell can
carry dozens of table-name vars in `provider.environment`. The
architectural fix is to derive table names in code from a
cell-id + stage + known suffix pattern (a single
`lib/tableNames.ts`-style module), reducing the env-bag to a
small handful of vars. The project rule should name the
threshold at which the architectural fix becomes mandatory
(e.g. when headroom drops below one full env-var-row's worth on
the largest function).

## Sister rules

- `done-criteria.md` — the broader "done" checklist this slots into.
- `feedback_verify_local_before_push` (project-level memory) — never
  push without running the pre-flight script.

## Pattern: keep adding rows

Every new deploy failure → new row in the table above (or in the
project's local equivalent) → new check function. The list grows
with the codebase. Never assume "we won't hit that again" — assume
the opposite and codify it.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Deploy failure on a documented platform limit + no pre-deploy check added in the SAME commit as the fix (core rule violation)
- Same-shape failure recurs across deploys (codification never happened)
- Pre-deploy check exists locally but not in CI (local-CI parity gap)
- Pre-deploy check exists but threshold is soft (warns instead of fails) when failure mode is hard
- Same check fires more than once in a quarter without an architectural fix considered (rule "When the check fires repeatedly" weakening)
- Verification block reports "deploy green" without naming the pre-deploy checks that ran
- New platform / vendor adopted without canvassing its documented limits before first deploy

**Refinement candidates**:

- New row in the platform-limits table when a new vendor or service class adopted (e.g., new edge runtime, new K8s admission limit)
- Tightening of the soft limit when the gap to the documented cap shrinks (e.g., from 90% headroom to 50%)
- New cross-reference when a sister rule (done-criteria, no-overclaim, runbook-template) provides the verification surface
- New "architectural fix" template when an architectural pattern (e.g., env-var consolidation, sidecar shedding) recurs across services
