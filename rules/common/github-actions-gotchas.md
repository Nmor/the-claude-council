# GitHub Actions Gotchas (Global Default)

> Auto-fires on every file matching `.github/workflows/*.yml` or
> `.github/actions/**/action.yml`. Sister to
> `deploy-failures-become-checks.md`, `security-controls-org-wide.md`.

## Core Principle

**GitHub Actions has a handful of well-documented but rarely-named
gotchas that cause CI failures with confusing-looking symptoms.
This rule names each one so the second instance is recognised in
seconds rather than re-debugged for an hour.**

Each entry below is sourced from an actual production CI failure
that took non-trivial time to diagnose.

## Gotcha 1: `bash -e` defaults break `pipefail` filters

**Symptom**: A `run:` block with `set -uo pipefail` aborts the step
immediately when the command-being-piped exits non-zero, even
though the script has logic to recover from non-zero exits.

**Root cause**: GitHub Actions defaults shells to `bash --noprofile
--norc -eo pipefail {0}`. The `-e` flag is enabled. With pipefail
on, `cmd-that-exits-nonzero | filter` returns the non-zero exit,
which `-e` then catches and terminates the step — before your
recovery logic runs.

**Fix**: Override the shell on the offending step to drop `-e`:

```yaml
- name: Run scanner with filtered recovery
  shell: bash --noprofile --norc -o pipefail {0}  # NB: no -e
  run: |
    set -uo pipefail  # -u, pipefail OK; NOT -e
    osv-scanner scan ... | tee scan.log
    SCAN_EXIT=${PIPESTATUS[0]}
    if grep -qE 'pattern' scan.log; then exit 1; fi
    echo "::notice::clean"
```

Alternatives:
- Append `|| true` to the pipe: `osv-scanner ... | tee scan.log || true`
- Capture exit code separately: `osv-scanner ... > scan.log; rc=$?`

**Wrong fix** (don't): `continue-on-error: true` on the step. That
hides ALL errors, not just the one you wanted to handle.

## Gotcha 2: 21,000-character expression limit on `run:` blocks

**Symptom**: GitHub UI reports `Exceeded max expression length 21000`
on a `run:` block that contains a long inline bash script.

**Root cause**: GitHub Actions interpolates `${{ ... }}` expressions
into `run:` blocks at parse time. The post-interpolation total
length is capped at 21,000 characters. Long inline scripts +
matrix variables + secrets interpolated multiple times hit this
without warning during local development.

**Fix**: Split the script into multiple steps, passing state via
files:

```yaml
- name: Scan
  run: |
    osv-scanner ... > /tmp/scan.json
- name: Parse violations
  run: |
    jq '...' /tmp/scan.json > /tmp/violations.json
- name: Decide pass/fail
  run: |
    [ "$(jq length /tmp/violations.json)" -eq 0 ] || exit 1
```

State passes via `/tmp/*.json` (workflow steps share the runner
filesystem). Smaller per-step expressions stay under the limit.

**Alternative** (more invasive): move the script into a
checked-in `.github/scripts/<name>.sh` and `run: bash .github/scripts/
<name>.sh`. But this complicates required-workflows that can't
access source-repo files.

## Gotcha 3: Required workflows can't read source-repo files

**Symptom**: An org-level required workflow that tries to read a
file from the consumer repo (e.g., a relative-path script or
`curl https://raw.githubusercontent.com/...`) silently fails or
returns 404.

**Root cause**: Required workflows run in the org's context with
the org's permissions, not the consumer's. They can clone the
consumer's source via `actions/checkout@<sha>`, but external
scripts they need must be inlined OR fetched from a public,
well-known location.

**Fix**: Inline everything across multiple steps. Use the
`{multiple-steps + /tmp shared state}` pattern from Gotcha 2.
Pin every action to a full SHA, not a tag (for supply-chain
safety).

## Gotcha 4: `bash set -u` + empty array fails

**Symptom**: `${array[@]}` errors with `unbound variable` when the
array is empty under `set -u`.

**Root cause**: `set -u` treats expansion of an unset variable as
an error. Empty arrays count as unset in this context.

**Fix**: Use the empty-default expansion:

```bash
my_array=()
some_command "${my_array[@]+"${my_array[@]}"}"  # safe even if empty
```

The `+` operator returns the alternate (`"${my_array[@]}"`) only
if set, otherwise expands to nothing.

## Gotcha 5: `echo "$json" | jq` mangles JSON with literal newlines

**Symptom**: `jq` reports a parse error on JSON that's valid when
read from a file.

**Root cause**: API responses (PyPI metadata, GitHub License API,
etc.) often contain literal newlines in `description` / `long_description`
fields. Bash `echo "$var"` doesn't quote-escape these, so the
shell breaks them into multiple lines before jq sees them.

**Fix**: Write the response to a temp file with `mktemp` and
`curl -o`, then `jq -f` against the file:

```bash
tmp=$(mktemp)
curl -sf "https://pypi.org/pypi/$pkg/json" -o "$tmp"
spdx=$(jq -r '.info.license // "null"' "$tmp")
rm -f "$tmp"
```

Never pipe API responses through `echo "$var" | jq` — always
file-buffer them.

## Gotcha 6: `actions/*` Node 20 → 24 deprecation

**Symptom**: Workflow logs warn:
> Node.js 20 actions are deprecated. Actions will be forced to run
> with Node.js 24 by default starting June 2nd, 2026.

**Root cause**: GitHub is migrating runner-hosted actions from Node
20 to Node 24. Actions pinned to versions that bundle Node 20
will need to be updated.

**Fix**: Bump every `actions/*` reference to its latest SHA-pinned
version regularly. Use `dependabot` (it covers Actions deps) or
`renovate`. Test the bump in a non-prod workflow before merging.

## Gotcha 7: YAML 1.2 vs 1.1 `on:` parsing

**Symptom** (false alarm): Some YAML parsers (Ruby's YAML.load
with `YAML 1.1`) parse the workflow's `on:` field as boolean
`true`. This used to be a real issue in pre-GHA tooling.

**Reality**: GitHub Actions itself uses YAML 1.2, which parses
`on:` as a string key correctly. If you see this in YAML lint
output, it's the linter using YAML 1.1, not a GHA bug. Configure
the linter to use 1.2 or ignore the specific rule.

## Gotcha 8: Concurrency `cancel-in-progress` can mask real failures

**Symptom**: A CI run shows "cancelled" instead of a real
pass/fail. The user assumes infrastructure flake.

**Root cause**: When `concurrency: cancel-in-progress: true` is
set and a new push happens, the older in-progress run is killed.
Some teams treat "cancelled" as transient, when actually the
cancellation was deliberate and the new run carries the real
result.

**Fix**: Always look at the LATEST run on the HEAD commit, not
the most-recently-displayed run. `gh run list --branch <branch>
--limit 1 --json databaseId,headSha` gives you the right one.

## Gotcha 9: Step timeout vs job timeout vs runner timeout

Three different timeouts exist; each has different defaults:

| Level | Default | Override |
| --- | --- | --- |
| Step | (none) | `timeout-minutes: N` on the step |
| Job | 360 min (6 hr) | `timeout-minutes: N` on the job |
| Runner-hosted | varies by plan | not user-configurable |

If your step has `timeout-minutes: 25` and the job has no override,
the step kills at 25 min, the job continues to the next step.
If the step is the last meaningful work, the job conclusion
reflects the step failure.

Make the relationship explicit: set `timeout-minutes` on BOTH the
job and the step you care about, with the job set ~10% higher
than the step.

## Gotcha 10: Runner OOM-killer preempts at total RAM

**Symptom**: A test job cancels at exactly the ~5-minute mark with
post-cleanup steps showing `skipped` (not the normal `success`).

**Root cause**: The job's combined memory budget exceeded the
runner's physical RAM, and the kernel OOM-killer preempted the
process tree. Post-cleanup steps don't run because the runner
agent itself was killed.

**Recognition**: post-cleanup `skipped` is the signature. Normal
Jest / test failures leave post-cleanup `success` because the
test framework exited cleanly.

**Fix**: Size your heap × workers below total runner RAM with
headroom. Standard ubuntu-latest is 16 GB. Don't aim for 16 GB
peak heap — aim for ~12 GB (leaves 4 GB for OS, Docker daemon,
runner agent, framework overhead).

For Jest:
```yaml
env:
  NODE_OPTIONS: --max-old-space-size=6144  # 6 GB per worker
run: pnpm test -- --maxWorkers=2 --workerIdleMemoryLimit=4500MB
# 6 GB × 2 workers = 12 GB peak heap; 4 GB OS headroom
# workerIdleMemoryLimit=4500MB recycles only on genuine leaks
```

See `ci-test-memory-tuning.md` for the full Jest tuning policy.

## Gotcha 11: `--workerIdleMemoryLimit` too low = worker thrash

**Symptom**: Jest tests complete individually but the overall suite
takes 4-5× longer than local, hitting the step timeout.

**Root cause**: `--workerIdleMemoryLimit=<N>` tears down + restarts
any worker whose RSS exceeds N between test files. If N is set
below the natural module-graph load (~1.5-2 GB for a typical TS
project with mocks), every test file recycles the worker — and
worker boot costs 60-90 seconds.

**Fix**: Size the limit ABOVE normal heap, only above genuine
leaks. For a project with ~6 GB heap ceiling, 4500 MB (4.5 GB
RSS) recycle threshold is a reasonable floor.

## Gotcha 12: SHA-pin every third-party action

**Symptom** (not an immediate failure, but a real risk): a
third-party action like `some/action@v1` silently changes
behaviour when the maintainer re-tags `v1` to a new commit. In
the worst case (compromise), the new behaviour exfiltrates
secrets.

**Fix**: Pin every third-party action to a full commit SHA, with
a comment naming the version for human readers:

```yaml
- uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1
- uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320 # v4.4.0
- uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
```

Use `dependabot` or `renovate` to bump the SHAs on a regular
schedule (weekly is fine for non-security; immediately for
security advisories).

## Gotcha 13: `pull_request` vs `pull_request_target` permissions

**Symptom**: An action that needs `secrets.GITHUB_TOKEN` to comment
on PRs from forks gets a permissions error.

**Root cause**: `pull_request` events from forks run with
restricted token permissions (read-only on the source repo).
`pull_request_target` runs with full token permissions but
executes against the BASE ref (the target branch's code), not the
PR's code — which means it doesn't pick up the PR's changes.

**Fix**: Use `pull_request` for CI that operates on the PR's code
(tests, lint, build) — accept the restricted permissions. Use
`pull_request_target` for actions that comment, label, or assign
on the PR — these don't need the PR's code.

Never use `pull_request_target` to RUN code from the PR — that's
the documented arbitrary-code-execution vector (Tj-actions etc.).

## Verification block

When CI tuning lands, the PR's verification block should explicitly
name which gotchas were addressed:

```
GitHub Actions tuning (this turn):
  - Gotcha 1 (bash -e + pipefail): added `shell:` override on
    osv-scanner step so the LOW-filter grep can run.
  - Gotcha 10 (runner OOM): dropped NODE_OPTIONS heap from 8 GB
    → 6 GB per worker; total 12 GB peak vs 16 GB runner RAM.
  - Gotcha 11 (workerIdleMemoryLimit): bumped 1500MB → 4500MB
    to stop per-file worker thrash.
```

## Cross-references

- `deploy-failures-become-checks.md` — same family: every
  documented platform limit becomes a pre-deploy check
- `security-controls-org-wide.md` — required-workflow + SHA-pin
  ruleset patterns
- `ci-test-memory-tuning.md` — full Jest CI memory policy
- `done-criteria.md` — verification block format

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Pipe + recovery logic shipped with default `bash -eo pipefail` shell (Gotcha 1 recurrence)
- `run:` block hitting the 21,000-char expression limit (Gotcha 2 — needs split)
- Required workflow accesses consumer-repo files directly (Gotcha 3 violation)
- `set -u` + empty array expansion crashes a step (Gotcha 4 recurrence)
- `echo "$json" | jq` produces parse error on API response with literal newlines (Gotcha 5 recurrence)
- `actions/*` pinned to a tag instead of full commit SHA (Gotcha 12 — supply-chain risk)
- Job conclusion shows "cancelled" but the run was intentionally preempted (Gotcha 8 — concurrency mis-read)
- Step has `timeout-minutes` but job doesn't (Gotcha 9 — mismatched timeout)
- Runner OOM-killed step with post-cleanup `skipped` (Gotcha 10 — sister `ci-test-memory-tuning.md`)
- `--workerIdleMemoryLimit` set too low causing worker thrash (Gotcha 11 recurrence)
- `pull_request_target` used to RUN code from a fork's PR (Gotcha 13 — RCE class)

**Refinement candidates**:
- New numbered gotcha when a recurring CI-platform surprise surfaces (e.g., new GitHub limit, new action deprecation cycle)
- Tightening of the SHA-pin enforcement when a recurring third-party action proves volatile
- New cross-reference when a sister rule (deploy-failures-become-checks, security-controls-org-wide) adds a CI-side gate
- Promotion of a "documented gotcha" into a hard lint when its recurrence rate justifies mechanical enforcement
