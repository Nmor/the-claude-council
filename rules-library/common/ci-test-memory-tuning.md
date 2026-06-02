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
