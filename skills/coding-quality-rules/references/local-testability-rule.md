# Local-Testability Rule (Always-On, Global)

> Auto-fires on every file. Sister to `verify-before-claim.md`
> (verification requires local testability), `task-intake-due-diligence.md`
> (Q14 test strategy + the environment setup it requires), and
> `done-criteria.md` (the gate suite that local testability
> unlocks).

## Core Principle

**Every code change MUST be locally testable BEFORE the agent
writes it. If the prerequisites (build tools, dev DB, secrets,
mocks, env vars, dependencies) aren't in place, the agent
generates an explicit environment-setup request FIRST and pauses
for the user to confirm setup before writing code. No "I'll
write it and you can test later." Every code emit pairs with a
runnable test step.**

## Hard rules

### 1. Detect testability prerequisites BEFORE writing code

Before the first Edit / Write call on the work, run the
prerequisite check:

| Prerequisite | Detection signal | What to ensure |
| --- | --- | --- |
| Dependencies installed | `package.json` / `go.mod` / `requirements.txt` etc. consistent with the work | `pnpm install` / `go mod tidy` / `pip install -r` succeeds |
| Dev database running | Code touches the DB | `docker compose ps` shows the DB container healthy; or local Postgres/MySQL/etc. responds |
| Dev cache running | Code touches Redis / Memcached | Container or local process responds |
| Dev queue running | Code touches SQS / Kafka / RabbitMQ | LocalStack / Kafka / RabbitMQ container healthy |
| Secrets available | Code reads env vars | `.env` populated; secrets manager reachable |
| External mocks running | Code calls third-party | Mock server / fixture file / recorded responses present |
| Test runner installed | Tests will run | `vitest` / `pytest` / `go test` / `jest` available |
| Browser / device installed | E2E / mobile tests | Playwright browsers installed; iOS Simulator / Android emulator available |

If ANY prerequisite is missing, the agent's FIRST response is an
environment-setup request — not code.

### 2. Environment-setup request shape

When a prerequisite is missing, the agent emits an explicit
setup request before any code:

```markdown
## Environment setup required

Before I write this feature, the following must be set up locally:

1. **Dev Postgres** — currently not running.
   Run: `docker compose up -d postgres`
2. **`.env`** — `STRIPE_SECRET_KEY` is missing.
   Run: `aws-vault exec <profile> -- sh -c 'echo STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY >> .env'`
3. **Playwright browsers** — not installed.
   Run: `pnpm playwright install chromium`

Once these are in place, reply "ready" and I'll proceed.

Without these, the code I write cannot be locally tested; per
`~/.claude/rules-library/common/local-testability.md`, that's a blocker.
```

The agent does NOT proceed to write code until the user confirms
setup. No silent assumption that "the user will run it later."

### 3. Every code emit pairs with a runnable test step

After writing code, the agent's response includes the exact
command(s) the user runs to verify locally:

```markdown
## Verify locally

```bash
cd backend
pnpm test src/services/payment.test.ts
pnpm tsc --noEmit
pnpm build
```text

Expected output:

- Tests: 14/14 pass
- Type-check: 0 errors
- Build: clean

If anything fails, share the output and I'll fix.

```

The instructions are exact — no "run your usual test command"
ambiguity.

### 4. "I'll write it and you can test later" is BANNED

The pattern this rule prevents: code shipped to the user with
no local verification path. The user runs it, it fails for
reasons the agent could have caught locally. The agent says
"hmm, let me think about why" and starts debugging without the
evidence.

Replace with: prerequisites verified up front + verification
commands surfaced with the code + the user runs them
immediately.

### 5. Untestable code = NOT shippable

If the work is fundamentally untestable in the user's local
environment (e.g., requires production AWS, requires a real
Stripe live key, requires a physical device the user doesn't
have), the agent surfaces the gap explicitly + proposes one of:

- **Mock layer**: write the dependency behind an interface +
  stub the production-only path; test the stub locally.
- **Recorded fixtures**: capture a real response once + replay
  in tests (VCR-style cassettes; `requests-mock`; `nock`).
- **Staging environment**: explicitly defer verification to
  staging with a named gate + the rollback plan.
- **Pair-test session**: schedule live pair-testing when the
  user can run on the real environment.

Whatever the choice, it's named explicitly. The work is NOT
"done" until the chosen verification path runs green.

### 6. Pre-existing infrastructure is part of the prerequisite check

The check also includes whether infrastructure the work depends
on (DB schemas, queue topology, S3 buckets, IAM roles) is set
up in the dev environment. If a new feature requires a new DB
column, the migration must run locally BEFORE the code that
reads the column is written.

### 7. Cross-language local-testability matrix

| Language / framework | Minimum local-testability requirements |
| --- | --- |
| Node / TS | `package.json` consistent, `pnpm install`, `vitest` / `jest` runs |
| Go | `go.mod` consistent, `go mod tidy`, `go test ./...` runs |
| Python | venv / poetry installed, `pytest` runs |
| Java / Spring Boot | `gradle build` / `mvn verify` runs; Testcontainers ready (Docker daemon up) |
| Ruby / Rails | `bundle install`, `bundle exec rspec` runs |
| Rust | `cargo build` + `cargo test` run |
| .NET | `dotnet build` + `dotnet test` run |
| Swift / iOS | Xcode installed; iOS Simulator runs; `xcodebuild test` works |
| Dart / Flutter | Flutter SDK installed; emulator / device available; `flutter test` runs |
| C / C++ | CMake build green; `ctest` runs |
| Frontend (any) | Dev server starts; browser / Playwright loads the page |
| Database | Local Postgres / MySQL / etc. up; migrations applied |
| IaC (Terraform) | `terraform validate` + `tflint` + `tfsec` run locally before any apply |

### 8. CI is not a substitute for local testability

A workflow where the agent writes code + the user pushes + CI
runs the tests is NOT acceptable under this rule. CI is a
secondary check; local-testability is the primary one. Reasons:

- CI feedback loop is 5-20× slower than local
- CI failures expose the broken state to teammates
- CI runs cost money + time; iterating in CI is expensive
- Per `plan-completion-before-push.md`, no push until plan is
  complete + verified — meaning local verification precedes
  the push, not follows it

### 9. The intake's Q14 (test strategy) feeds this rule

When the `task-intake-due-diligence.md` Q14 is filled, it names
the test types the work requires. THIS rule ensures those test
types are ACTUALLY runnable locally before code lands. The
intake plans; this rule enforces.

### 10. Verification commands go in the plan file or session notes

For multi-session work, the verification commands live in the
plan file under `## Local verification` so the next session
resumes by running the same commands first.

## Anti-pattern: write-and-hope

```text

Agent: <writes 200 lines of payment-processing code>
Agent: "Done!"
User: <tries to run> "It crashes — Stripe key missing."
Agent: "Oh, add STRIPE_SECRET_KEY to .env."
User: <adds, runs again> "Now it crashes on the DB."
Agent: "Run the migration first."

```

Should have been:

```text

Agent: "Before I write the payment code, I need to confirm:
        1. STRIPE_SECRET_KEY is in your .env
        2. The migration `add_payment_intents` has been run
        3. Stripe test mode is enabled (sk_test_…)
        Reply 'ready' when these are in place."
User: <does the setup> "ready"
Agent: <writes 200 lines + the test command>
        "Run: `pnpm test src/services/payment.test.ts`
         Expected: 14/14 pass.
         If anything fails, share output."

```

## Cross-references

- `verify-before-claim.md` — verification is paired with the
  claim; that requires local testability
- `task-intake-due-diligence.md` Q14 — test strategy planned
  upfront
- `done-criteria.md` — the per-language gate suite that
  verification runs against
- `no-overclaim.md` — never claim done without proof
- `plan-completion-before-push.md` — local verification
  precedes push
- `proper-fixes-first.md` — when something doesn't work
  locally, fix the root cause (often a missing setup step,
  not a code bug)

## Why this rule exists

The user's directive: every coding request must be testable
locally. Without this rule, the implicit flow becomes:

1. Agent writes code
2. Code ships
3. User runs into errors (often setup-related, not code-bug
   related)
4. Multiple back-and-forth rounds to discover the actual setup
   gap
5. Eventual fix that was preventable by asking up front

The fix is to invert the flow: surface setup requirements
first, then write code paired with the exact verification
command.

User directive (verbatim): **"Always verify before claims and
for every coding request they must be able to run locally if
they can't there must be request for environment setup so that
every code that is written must be testable."**

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Code written before prerequisite check ran (rule 1 violation — "write-and-hope")
- Missing prerequisite discovered post-edit instead of pre-edit (env-setup request not issued in time)
- "I'll write it and you can test later" pattern recurrence (rule 4 violation)
- Code emit without paired verification command (rule 3 weakening)
- Untestable code shipped without one of {mock layer, recorded fixture, staging deferral, pair-test} chosen (rule 5 weakening)
- Pre-existing infrastructure assumed present without verification (rule 6 weakening — implicit prereq)
- CI used as primary verification surface rather than local (rule 8 violation)
- Verification commands in plan file but not surfaced in the per-code-emit response (rule 9 weakening)

**Refinement candidates**:

- New row in the prerequisite-check table when a recurring tool / runtime / service emerges (e.g., new vector DB, new auth provider, new package manager)
- Tightening of the prereq-detection heuristic when missing-prereq incidents recur for the same shape
- New cross-language entry in the local-testability matrix when a new framework / stack appears
- New "deferred verification" template when a recurring untestable class (real Stripe live key, physical device dependency) emerges

---

<!-- ============================================================
     Section: local-dev-setup.md (from rules/common/)
     ============================================================ -->
