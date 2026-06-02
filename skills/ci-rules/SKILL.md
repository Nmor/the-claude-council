---
name: ci-rules
description: CI + hooks discipline — ci-test-memory-tuning (test-suite memory budget vs runner OS headroom; OOM vs worker-thrash diagnostic), github-actions-gotchas (named pitfalls: bash -e + pipefail, 21K char expression limit, SHA-pin actions, runner OOM, workerIdleMemoryLimit thrash, pull_request vs pull_request_target), hooks (lifecycle: SessionStart / PreToolUse / PostToolUse / PreCompact / Stop / SessionEnd). Auto-fires on CI workflow files + hook scripts.
paths:
  - ".github/workflows/**/*.yml"
  - ".github/workflows/**/*.yaml"
  - ".github/actions/**/*.yml"
  - ".github/actions/**/*.yaml"
  - ".gitlab-ci.yml"
  - ".gitlab/**"
  - "azure-pipelines.yml"
  - "azure-pipelines.yaml"
  - "Jenkinsfile"
  - "**/Jenkinsfile"
  - ".circleci/**"
  - "bitbucket-pipelines.yml"
  - ".githooks/**"
  - ".pre-commit-config.yaml"
  - "**/.github/workflows/**"
  - "**/.github/actions/**"
---

> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H will delete the source files to close the eager-load loop.

# ci-rules

## Standards Cited

- **GitHub Actions Workflow syntax** (docs.github.com/actions/using-workflows) — canonical spec for `on:` triggers, job graph, expressions
- **OWASP Top 10 CI/CD Security Risks** (owasp.org/www-project-top-10-ci-cd-security-risks) — CICD-SEC-01 through CICD-SEC-10
- **SLSA v1.0** (slsa.dev/spec/v1.0) — supply-chain levels; SHA-pinned actions satisfy Build L3
- **CWE-829** Inclusion of Functionality from Untrusted Control Sphere (action-by-tag = vulnerable)
- **CWE-1357** Reliance on Insufficiently Trustworthy Component (unpinned third-party action)
- **NIST SP 800-204D** Strategies for the Integration of Software Supply Chain Security in DevSecOps
- **OWASP Top 10 A05:2021** Security Misconfiguration — `pull_request_target` + checkout-of-PR-code is the canonical misconfiguration shape
- **Conventional Commits 1.0** (conventionalcommits.org) — commit-message contract for downstream changelog / semver automation
- **Semantic Versioning 2.0** (semver.org) — version-bump rules the CI release pipeline encodes

## Source files migrated

- `rules-library/common/ci-test-memory-tuning.md`
- `rules-library/common/github-actions-gotchas.md`
- `rules-library/common/hooks.md`

---

<!-- ============================================================
     Section: ci-test-memory-tuning.md (from rules/common/)
     ============================================================ -->

# CI Test Memory Tuning (Global Default)

> Auto-fires on every `.github/workflows/*.yml`, `jest.config.*`,
> `vitest.config.*`, `pytest.ini`, `phpunit.xml`, `go.mod` (test
> directories). Sister to `github-actions-gotchas.md` (especially
> gotchas 10 + 11), `done-criteria.md`.

## Core Principle

**Test-suite memory budget × worker count must leave the runner OS
real headroom. Test runners that hit their idle-memory-limit too
aggressively pay the worker-boot cost on every test file. Both
failure modes look like "tests are slow" or "tests crashed", but
the recognition signatures are precise and the fixes differ.**

## The two failure modes

Both surface as "Test job failed in CI" but have opposite
fixes — recognise the signature before tuning.

### Failure mode A: Runner OOM-killer preempt

**Symptoms**:

- Step cancels at a consistent point (often ~5 minutes)
- Post-cleanup steps report `skipped` (not `success`)
- No FAIL line in the test log — just `##[error]The operation was
  canceled.`
- The cancel time is well under the step's `timeout-minutes`

**Root cause**: Total heap budget (`max-old-space-size × workers`)
exceeded runner physical RAM. The kernel OOM-killer preempted
the process tree.

**Fix**: Reduce per-worker heap OR reduce worker count. Target
~75% of total runner RAM for headroom.

### Failure mode B: Worker thrash from over-aggressive idle limit

**Symptoms**:

- Step hits its `timeout-minutes` cap (e.g., 25-min step → 26-min
  job)
- Post-cleanup steps report `success`
- Test log shows tests passing but each one takes 60-90s (vs <10s
  locally)
- The completion time is genuinely longer, not preempted

**Root cause**: `--workerIdleMemoryLimit=<N>` (Jest) tears down

- restarts workers whose RSS exceeds N between test files. If N
is below normal heap, every test file pays the worker-boot cost
(~60-90s including module re-resolution).

**Fix**: Raise the idle limit above normal heap, only above
genuine leaks.

## Runner RAM reference table

| Runner | Total RAM | Recommended peak heap | Recommended worker count |
| --- | --- | --- | --- |
| `ubuntu-latest` | 16 GB | 12 GB | 2 |
| `ubuntu-22.04` | 16 GB | 12 GB | 2 |
| `windows-latest` | 16 GB | 11 GB | 2 |
| `macos-latest` (M1+) | 14 GB | 10 GB | 2 |
| Custom 32 GB self-hosted | 32 GB | 24 GB | 4 |

**Recommended peak heap** = `max-old-space-size` × worker count.
Subtract 4 GB for OS + Docker + runner agent + test-framework
overhead.

## Jest tuning (canonical)

The combination that works on `ubuntu-latest` for ~2000-test
TypeScript projects:

```yaml
- name: Backend tests
  timeout-minutes: 25
  env:
    # 6 GB heap per worker. With --maxWorkers=2 the peak heap is
    # 12 GB, which leaves 4 GB headroom on the 16 GB runner for OS
    # / Docker / runner agent. Previous value (8 GB) summed to 16 GB
    # with zero headroom → kernel OOM-killer preempt at ~5 min.
    NODE_OPTIONS: --max-old-space-size=6144
    # Forces Jest to emit per-file progress to stdout; otherwise a
    # worker crash with buffered output looks like "test passed
    # silently then died".
    CI: "true"
  # --workerIdleMemoryLimit=4500MB: recycle workers above 4.5 GB RSS.
  # ABOVE the natural module-graph load (~1.5-2 GB per worker), so
  # warm workers persist across normal test files (no boot cost).
  # Recycles only on genuine memory leaks. Previous value (1500MB)
  # tripped on every test file → worker thrash → 26-min step timeout.
  run: |
    cd backend && pnpm test -- \
      --maxWorkers=2 \
      --workerIdleMemoryLimit=4500MB \
      --ci \
      --runInBand=false
```

### Sizing the idle limit

The right `--workerIdleMemoryLimit` depends on the project's natural
heap consumption per test file. Quick diagnostic:

```bash
# Locally, run Jest with heap logging:
pnpm test -- --maxWorkers=1 --logHeapUsage 2>&1 | grep -E "^PASS.*MB heap"
```

The output shows per-file peak heap. Set the limit to:

- The 75th percentile of normal peaks, PLUS
- 50% headroom for transient spikes

For most TS projects: 4000-5000 MB is a sane floor.

### Diagnostic recipe — which mode hit you?

```bash
# Get the latest CI run on the branch
RUN_ID=$(gh run list --workflow=ci.yml --branch=<branch> \
  --limit 1 --json databaseId --jq '.[0].databaseId')

# Job metadata
gh run view "$RUN_ID" --json jobs --jq '.jobs[] |
  select(.name == "Test") |
  {duration: (.completedAt + " - " + .startedAt),
   conclusion,
   lastStep: (.steps[-2].name + " → " + (.steps[-2].conclusion // "null"))}'
```

If `lastStep` ends in `skipped` → mode A (OOM preempt).
If `lastStep` ends in `success` AND duration ≈ step timeout → mode B
(worker thrash).
If `lastStep` ends in `failure` AND there's a FAIL in the log → real
test failure, not memory.

## Vitest tuning

Vitest uses Vite-style worker management. Same principle applies:

```yaml
env:
  NODE_OPTIONS: --max-old-space-size=6144
run: |
  pnpm vitest run \
    --pool=threads \
    --poolOptions.threads.maxThreads=2 \
    --poolOptions.threads.singleThread=false \
    --reporter=verbose
```

Vitest's `singleThread=false` is equivalent to Jest's
`--runInBand=false`. There's no direct `workerIdleMemoryLimit`
equivalent — Vitest's worker lifecycle is shorter by default,
which mitigates the leak class but also means warm-worker reuse
isn't as critical.

## pytest tuning

```yaml
env:
  PYTEST_XDIST_AUTO_NUM_WORKERS: 2
run: |
  pytest -n 2 --maxfail=5 --tb=short
```

Python's memory model is different (no V8-style heap cap); the
constraint is usually total RSS. `pytest-xdist` workers don't
have an idle-recycle option, but you can run a single worker with
periodic process restarts via `pytest -n 0 --restart-on-each-file`
when leaks are suspected.

## Go test tuning

Go tests are typically single-process with goroutine concurrency.
Memory pressure manifests as runtime panics rather than runner
preempts:

```yaml
env:
  GOMEMLIMIT: 12GiB  # soft limit; Go GC targets this
run: |
  go test -race -timeout 30m -p 4 ./...
```

`-p N` controls test-package parallelism. `GOMEMLIMIT` (Go 1.19+)
makes the GC target a soft limit rather than running until physical
RAM exhaustion.

## Verification block

```text
CI test memory tuning (this turn):
  - Mode: A (OOM preempt) — diagnosed via post-cleanup "skipped"
    + ~5min cancel pattern
  - NODE_OPTIONS: --max-old-space-size 8192 → 6144 (-2 GB per worker)
  - --workerIdleMemoryLimit: (none) → 4500MB
  - Peak heap: 16 GB → 12 GB (4 GB OS headroom on 16 GB runner)
  - Test duration on retry: 14m17s (within 25-min step cap)
```

## Cross-references

- `github-actions-gotchas.md` (gotchas 10 + 11) — the symptom
  pattern documentation
- `done-criteria.md` — every "done" claim verifies tests pass in
  CI, not just locally
- `deploy-failures-become-checks.md` — every CI failure mode
  becomes a documented check

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- CI test job cancelled at consistent ~5-min mark with post-cleanup `skipped` (Mode A: runner OOM preempt — diagnostic recipe applies)
- CI test job hits its `timeout-minutes` cap with post-cleanup `success` (Mode B: worker thrash — `--workerIdleMemoryLimit` too aggressive)
- `--max-old-space-size × --maxWorkers > 0.75 × runner_total_RAM` (OS headroom budget violated)
- Diagnostic recipe not run before tuning (mode-recognition skipped → wrong fix applied)
- `--workerIdleMemoryLimit` set below natural per-test heap (~1.5-2 GB for TS) — recycle thrash
- Single-process Go tests panic with OOM on `ubuntu-latest` (GOMEMLIMIT not set)
- Verification block missing the before/after heap × workers math after a tuning change

**Refinement candidates**:

- New runner row in the RAM reference table when GitHub Actions ships a new runner size (e.g., 32 GB linux-large, M4 mac)
- New per-framework tuning section when a new test runner adopts worker recycling (e.g., Vitest worker memory limits, pytest-xdist process recycling)
- Tightening of the OS-headroom percentage when 75% proves too tight on a recurring stack
- New cross-reference when a sister rule (github-actions-gotchas, deploy-failures-become-checks) adds a CI symptom pattern

---

<!-- ============================================================
     Section: github-actions-gotchas.md (from rules/common/)
     ============================================================ -->

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

```text
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

---

<!-- ============================================================
     Section: hooks.md (from rules/common/)
     ============================================================ -->

# Hooks System (Always-On, Global)

> Auto-fires on every file. Sister to `auto-skills.md` (the
> file-to-skill mapping), `no-discards.md` (the canonical
> hook-enforced rule), `done-criteria.md` (the per-language
> verification suite each hook runs), and `extreme-lint-policy.md`
> (the strictness thresholds the hooks enforce).

## Core Principle

**Hooks are the mechanical enforcement layer that makes every
other rule unskippable.** Where a rule says "the agent SHOULD
verify X", a hook enforces "X is verified, the agent cannot
proceed otherwise." Hooks are the difference between a guideline
and a contract.

## Hook lifecycle (Claude Code)

| Hook | When | What it does |
| --- | --- | --- |
| **SessionStart** | First message of a session | Load workspace `CLAUDE.md`, prior memory, project state; surface workspace rules; prime context |
| **UserPromptSubmit** | Each user prompt | Evaluate clarity, expand vague prompts via `prompt-improver` skill; fast-path bypass for `/`, `*`, `#` prefixes |
| **PreToolUse** | Before each tool call | Validate parameters, enforce allow/deny lists, ask user for risky actions, secrets-pattern detection, network egress check |
| **PostToolUse** | After each tool call | Auto-format, lint, run gates on touched files, IDE-diagnostic capture, hook-enforced rule checks |
| **PreCompact** | Before context compaction | Persist running plan + intermediate state to durable memory; plan snapshot; TODO state |
| **Stop** | End of an agent turn | Final verification of touched files, surface remaining gaps, "uncommitted changes" notice |
| **SessionEnd** | End of session | Persist learnings, evaluate patterns, log telemetry, audit log entry |

Each project may add hooks in `~/.claude/settings.json`
(global) or `<project>/.claude/settings.json` (workspace).

## Mandatory hooks (global default)

| Hook | File | What it enforces |
| --- | --- | --- |
| UserPromptSubmit | `~/.claude/hooks/improve-prompt.py` | Prompt-clarity evaluation; routes vague prompts through `prompt-improver` skill |
| PostToolUse (Edit/Write) | `~/.claude/scripts/hooks/post-edit-no-discards.js` | Rejects edits introducing discards, suppressions, hardcoded credentials, `console.log` in product source, weak-crypto patterns, raw colour literals, merge-conflict markers |
| PostToolUse (touched files) | Project-level | Auto-format + lint + IDE-diagnostic capture per language |

Adding a new hook requires updating this file with the rule it
enforces; the rule and the hook stay in lockstep.

## Per-language hook gates

Every language a project uses ships a PostToolUse gate that runs
the language-specific verification suite from `done-criteria.md`
on every edited file.

### Go (`*.go`, `go.mod`, `go.sum`)

- **goimports / gofmt -s** — auto-format on save
- **`go vet ./...`** — zero output
- **`staticcheck ./...`** — zero issues
- **`golangci-lint run ./...`** — zero issues (full ruleset
  per `extreme-lint-policy.md`)
- **`go test ./<pkg>/...`** — when a test file or consumer
  changed
- **Optional**: `gosec ./...`, `govulncheck ./...`

### TypeScript / JavaScript (`*.ts`, `*.tsx`, `*.js`, `*.jsx`)

- **Prettier / Biome** — auto-format on save
- **`tsc --noEmit`** — zero type errors
- **`eslint <touched> --max-warnings 0`** — zero findings
  (`sonarjs/recommended` + `@typescript-eslint/strict-type-
  checked` + `eslint-plugin-security`)
- **Build check** (`pnpm build`) when shape-affecting changes
  touch a build-time consumer
- **Test** (`vitest` / `jest`) — when test or consumer changed
- **`console.log` audit at Stop** — warn on any production-
  source occurrence

### Python (`*.py`, `*.pyi`)

- **Black / Ruff format** — auto-format on save
- **`ruff check --select=ALL`** — zero findings
- **`mypy --strict`** OR **`pyright --strict`** — zero type
  errors
- **`pytest`** — when test or consumer changed
- **`bandit -r .`** — zero security findings
- **`print()` warning** — `print()` in non-CLI source warns;
  use `logging`

### Java / Kotlin (`*.java`, `*.kt`)

- **Spotless / ktlint** — auto-format on save
- **`gradle check` / `mvn verify`** — zero compile + lint
  errors (Checkstyle, PMD, SpotBugs, ErrorProne, detekt)
- **JUnit / Kotest** — when test or consumer changed

### Ruby (`*.rb`)

- **`rubocop -A`** — zero offenses
- **`rspec`** — when spec or consumer changed
- **`brakeman`** — zero security findings

### Rust (`*.rs`, `Cargo.toml`)

- **`cargo fmt --check`** — formatted
- **`cargo clippy --all-targets --all-features -- -D warnings -W
  clippy::pedantic`** — zero findings
- **`cargo test`** — when test or consumer changed
- **`cargo audit`** + **`cargo deny check`** — zero
  CVE / license issues

### C / C++ (`*.c`, `*.cpp`, `*.h`, `*.hpp`)

- **`clang-format`** — formatted
- **`clang-tidy <files>`** — zero findings (full ruleset)
- **`cmake --build build/`** with `-Wall -Wextra -Werror`
- **`ctest`** — when test or consumer changed
- Sanitizers (AddressSanitizer, UBSan, ThreadSanitizer) in CI

### Swift (`*.swift`, `Package.swift`)

- **`swiftformat --lint`** + **`swiftlint`** — formatted +
  zero findings
- **`swift build`** — zero compile warnings
- **`swift test`** — when test or consumer changed

### Dart / Flutter (`*.dart`, `pubspec.yaml`)

- **`dart format --set-exit-if-changed`** — formatted
- **`dart analyze --fatal-infos --fatal-warnings`** — zero
  findings
- **`flutter test`** — when test or consumer changed

### C# (`*.cs`, `*.csproj`)

- **`dotnet format --verify-no-changes`** — formatted
- **`dotnet build /warnaserror`** — zero warnings
- **`dotnet test`** — when test or consumer changed

### Markdown (`*.md`, `*.mdc`)

- **`markdownlint-cli2`** — zero warnings (MD040 fenced code
  language, MD031 blanks around code, MD032 blanks around lists,
  MD022 blanks around headings; MD013 line-length tolerated only
  on unbreakable table rows)

### Infrastructure (`Dockerfile`, `*.yml`, `*.yaml`, `*.tf`)

- **Dockerfile**: `hadolint --no-fail` then PR-fail on any
  finding
- **YAML**: `yamllint -d "{extends: default}"`
- **Terraform**: `terraform fmt -check && terraform validate &&
  tflint --strict && tfsec && checkov`

### SQL (`*.sql`, `migrations/*`)

- **`sqlfluff lint --dialect=<project>`** — zero findings

### Bash (`*.sh`)

- **`shellcheck -S style`** — zero findings (style severity
  surfaces everything)
- **`shfmt -d`** — formatted

## Auto-accept permissions (PreToolUse policy)

Use with extreme caution:

- **Enable** ONLY for trusted, well-defined plans (e.g.,
  read-only research, sandboxed FS edits within the project)
- **Disable** for anything destructive, anything that touches
  the network, anything that writes outside the working tree
- **NEVER** use `--dangerously-skip-permissions`
- **Configure** `allowedTools` in `~/.claude/settings.json` or
  workspace settings instead of bypassing the permission prompt

Per `install-allowlist.md`, global installs always ask. Per
`secrets-management.md`, vault operations ask before mutating.

## TodoWrite practices (the agent's progress surface)

The `TodoWrite` tool is mandatory whenever:

- A task has 3+ distinct steps
- A multi-phase plan is in execution (per `plan-execution-
  progress.md`)
- The user explicitly asks for tracking

What the TodoWrite list reveals:

- **Out-of-order steps** — caught at planning time
- **Missing items** — gaps surface
- **Extra unnecessary items** — pruned before any code
- **Wrong granularity** — too coarse vs too fine
- **Misinterpreted requirements** — user corrects before
  any keystrokes

Exactly ONE task `in_progress` at any time. Tasks move to
`completed` IMMEDIATELY on finishing. The list mirrors the
plan file's task hierarchy (per `plan-task-breakdown.md`).

## Cross-references

- `auto-skills.md` — file-to-skill mapping fired by PostToolUse
- `no-discards.md` — the canonical PostToolUse hook
- `done-criteria.md` — the per-language verification suite
- `extreme-lint-policy.md` — the strict thresholds enforced
- `plan-execution-progress.md` — TodoWrite is the live surface
- `install-allowlist.md` — PreToolUse install gating
- `secrets-management.md` — PreToolUse vault gating

## Why this rule exists

Without mechanical hooks, every rule depends on the agent
remembering to enforce it. Memory is unreliable; hooks are
deterministic. The hook layer makes "did the agent check X" a
non-question — if the hook fires, X is checked; if X failed,
the hook blocks the edit. The agent then either fixes the
failure or surfaces it explicitly; silent bypass is not an
option.

Hooks are the floor, not the ceiling — they catch the routine
violations so the agent's attention stays on the design-level
questions.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New rule shipped without corresponding hook enforcement when mechanical enforcement is feasible (drift toward "guideline-only")
- PostToolUse hook bypassed via `CLAUDE_NO_DISCARDS_HOOK=off` by the agent (operator-only override misused)
- New language adopted without its PostToolUse gate wired (per-language hook gap)
- `--no-verify` used to bypass pre-commit / pre-push hook (sister `proper-fixes-first.md` weakening)
- Auto-accept permissions enabled for destructive / network tools (PreToolUse policy weakening)
- TodoWrite not invoked on a 3+-step task (rule "TodoWrite practices" weakening)
- Multiple TodoWrite items `in_progress` simultaneously (one-in-progress invariant violated)
- Stop hook surfaces uncommitted changes but the agent proceeds to next task anyway (Stop hook ignored)

**Refinement candidates**:

- New row in the lifecycle table when a new hook event surfaces (e.g., new IDE plugin event, new MCP gateway hook)
- New per-language gate row when a new stack adopts (e.g., new build system, new test runner)
- Tightening of the auto-accept policy when a destructive false-positive recurs
- New cross-reference when a sister rule (no-discards, install-allowlist, secrets-management) introduces a hook the rule depends on

---
