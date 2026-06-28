# Service-Migration Done-Criteria (Strict Verification Flow)

> Auto-fires whenever you claim a service is "done", "fully migrated", "fully
> backed by X", or "stripped of Y". DO NOT declare any of those phrases until
> every check below passes. Apply this checklist BEFORE saying "done" — never
> after, never as an afterthought.

## Why this exists

Saying "service X is fully Kafka-backed" or "SQS code stripped" without
running every check below has caused regressions. Half-finished migrations
break consumers downstream and leave dead env vars / docs / tests rotting in
the repo. The user's directive: **be 100% sure before saying anything is done**.

This file is the single source of truth for what "done" means on a service-
level refactor / migration / strip / port. If a check is impossible to run,
say so explicitly — never silently skip.

## The Strict Checklist

### 1. Source-tree audit (no leftover references)

Run these greps from the service root. EACH must return zero non-doc lines:

```bash
# Removed dependency must not appear in code paths
grep -rn "<old-package-import>" --include='*.go'

# Removed types / functions must have zero call-sites
grep -rn "<OldType>\|<oldFunc>(" --include='*.go'

# Removed env vars must have zero references in *.go AND *.env*
grep -rn "<OLD_ENV_VAR>" --include='*.go'
grep -n "<OLD_ENV_VAR>" .env .env.example .env.local 2>/dev/null
```

If a doc-string still names the legacy thing, that is fine ONLY if the
comment explicitly says "replaces the legacy X" — never a stray reference.

### 2. Build green

```bash
go mod tidy
go build ./...        # zero output
go vet ./...          # zero output
```

If any of these emit warnings, FIX THEM. Do not proceed.

### 3. Static analysis green (zero tolerance)

```bash
staticcheck ./...                    # zero issues
golangci-lint run ./...              # 0 issues
```

If your tooling lives at `~/go/bin/ (or $(go env GOPATH)/bin/)`, prepend that path. SonarLint
warnings shown by the IDE count as real findings — fix every one.

For language-agnostic Sonar / SonarLint patterns, run the sweep documented in
[`sonarlint-checks.md`](../../rules-library/common/sonarlint-checks.md) on every touched file. That
rule auto-fires on `**/*` already; this entry exists to make the requirement
explicit at done-time. Report sweep results in the verification block.

### 4. Tests pass with race detection

```bash
go test ./... -count=1 -race -timeout 120s
```

Every package must end in `ok` or `[no test files]`. A `FAIL` is a blocker.

If you removed a test that referenced the removed code, replace it with a
test for the new code. Never "delete and move on" — write the equivalent
coverage for the new path.

### 5. Mock / interface alignment

```bash
# Find any mock that still implements an old interface method
grep -rn "Mock<OldInterface>\|<OldImplStruct>" --include='*.go'
```

If you renamed an interface method, regenerate or hand-patch the mock so
unit tests don't compile against a stale shape.

### 6. Bootstrap / DI wiring

```bash
# Every constructor that created the OLD dependency must now create the new one
grep -rn "New<OldThing>\b" --include='*.go'

# Every place the old field was referenced in the struct literal must have
# either been removed or replaced
grep -rn "\.<oldField>\b" --include='*.go'
```

### 7. Env / secrets / config files

- `.env`, `.env.example`, `.env.local` — strip dead vars
- `config.go` — remove the struct field
- `load.config.go` — remove the `helpers.GetEnv("...")` line
- `config_test.go` — remove the field from the test fixture struct literal
- Helm / Terraform / serverless.yml — remove the `<OLD_VAR>` deployment block
- README / docs that document the env vars — update or remove the section

### 8. Cross-service contract

If the service produced or consumed the removed channel:

- Replacement topic / endpoint provisioned in infra (terraform / docker-
  compose / kafka-init)
- Consumer on the other side switched (or running in dual-consume during
  the migration window)
- Schema documented (event-types, payload shape, partition key)

### 9. Worktree cleanliness

```bash
git status              # confirm only files you intended changed
git diff --stat         # confirm change footprint matches the work
```

No stray `.swp`, `.bak`, `.orig`, `.disabled` files. No half-committed binary.

### 10. Repeat for every service in the migration set

A migration that touches 7 services is NOT done after service 1. Repeat
1–9 for each. Maintain a checklist with each service's status; only mark
the migration done when every entry in the set is green.

### 11. Docs are in sync (docs-sync gate)

Per `docs-sync-with-code.md`, every change touching user-visible
behaviour requires:

- [ ] Feature page under `docs/` exists and reflects what shipped.
- [ ] `README.md` lists the feature accurately (no in-flight features
      advertised).
- [ ] `CLAUDE.md` (or project equivalent) reflects current
      architecture.
- [ ] Marketing surfaces (landing pages, public site) describe only
      working features.
- [ ] `docs/runbook.md` has an entry for every new failure-mode.
- [ ] `CHANGELOG.md` (when the project keeps one) has an entry.

For external integrations, additionally:

- [ ] `docs/provider-research/<provider>.md` exists and was read /
      refreshed against primary-source URLs this turn (see
      `official-docs-first.md`).

Missing any item means the change is NOT done.

### 12. Lint sweep precedes file exit

Before reporting completion, every touched file is swept against the
language-specific linters AND the IDE diagnostics from this turn:

- TypeScript / JavaScript: `tsc --noEmit` (0 errors),
  `eslint <touched files> --max-warnings 0`, IDE Sonar diagnostics
  empty.
- Go: `go build ./... && go vet ./... && staticcheck ./... &&
  golangci-lint run ./...` all clean.
- Python: `ruff check`, `mypy` clean.
- Markdown: `markdownlint` warnings 0 (MD040, MD031, MD032, MD022,
  MD009 zero; MD013 only tolerated on unbreakable table rows).
- SonarLint IDE diagnostics across S100..S8479 — zero.

If the file's diagnostics cannot be brought to zero in the same pass,
the agent surfaces the blocker explicitly ("X file has Y diagnostics
I cannot fix in this pass because Z") instead of proceeding. The
agent NEVER silently leaves diagnostics behind, and NEVER moves to
the next file with the previous one still warning.

### 13. Proper-fix audit (see `proper-fixes-first.md`)

The proper-fix audit must pass before any "done" claim. Every row
returns yes:

- [ ] Every observed failure has a documented root cause.
- [ ] No service was killed to free resources for another.
- [ ] No healthcheck was loosened to hide slow code paths.
- [ ] Every external-provider integration cites primary-source docs.
- [ ] Every secret value was format-validated before push.
- [ ] Every credential rotation was an atomic script.
- [ ] No migration was left in a half-state.
- [ ] No "we'll fix it next session" / "TODO: do this properly"
      markers were introduced.

A `[ ]` in any row blocks the claim. Resolve each by landing the
proper fix THIS turn or reverting the half-finished change.

### 14. Strong-completion language requires verification this turn

Per `no-overclaim.md`, "done", "complete", "100%", "fully migrated",
"ready to ship", "shipped" are reserved for states where every gate
in this checklist has been verified THIS turn. Until then, use
"in progress" / "next: `<gate>`" / "`<X>` finished; `<Y>` pending".

When the user challenges a completion claim, re-run the verification
before responding. Do NOT re-affirm without a re-run.

### 15. Code-graph validation (see `code-graph-validation.md`)

Every "done" claim runs the incremental code-graph check against
the touched surface this turn. The verification block names the
result. Required findings:

- [ ] Every outbound reference resolves (imports / calls / routes
      / handlers / schema columns / env vars / IAM actions / agent
      files / skill files / hook scripts / rule citations / docs
      links).
- [ ] Every touched file has at least one inbound edge OR is a
      documented entry point.
- [ ] Cross-artifact graph closes: hook event → script path
      exists; agent in `council-triggers.md` → file exists;
      skill in `auto-skills.md` → directory exists; command →
      agent exists.
- [ ] No `BUG(unwired-<slug>)` markers left behind without the
      user being explicitly informed.

A `[ ]` in any row blocks the claim. Per `verify-before-claim.md`,
the verification block captures the counts: `dangling: N,
dead: M, unwired: K`. Zero on each row OR explicit user-approved
deferral.

## Done means done

You may only say "done" / "fully X-backed" / "X stripped" / "complete" when
every check above passes. If even one item is not verified, use language
like "in progress", "next: `<item>`", or "needs `<verification>`".

## Failure handling

If a check fails AFTER you've claimed done:

1. Acknowledge explicitly (no hand-waving).
2. Describe what was missed and why.
3. Fix it.
4. Re-run the full checklist before re-claiming done.

This is the global rule: never skip the verification, never skip the
acknowledgment when it goes wrong.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- "Done" claims later proven incomplete (the checklist had a gap — capture which row was missed)
- Re-claiming "done" after the same gate failed in the prior turn (verification discipline weak)
- Verification block missing on a completion claim (no-overclaim.md enforcement weak)
- New language / runtime added to the project without a per-language section here (rule needs extension)
- Same gate repeatedly fired across services on different bug classes (gate name + scope might need split)
- Migration / refactor declared "done" then a follow-up reveals leftover references (mechanical sweep step needs reinforcement)

**Refinement candidates**:

- New per-language verification suite row when a language gains presence in the rebuild
- New checklist row when a missed dimension appears in 2+ retrospectives
- Tightening of any threshold (coverage, complexity, lint) when chronic miss observed
- New cross-reference when a sister rule's gate becomes part of every "done" decision
