---
name: planning-rules
description: Planning + verification discipline for multi-phase work — code-graph-validation (incremental per-task + phase-boundary + pre-push sweeps), ADR template (MADR / Nygard format), runbook template (canonical incident-response structure). Auto-fires when plan files, ADR archives, or runbook files are touched.
paths:
  - "~/.claude/plans/**/*.md"
  - "**/.claude/plans/**/*.md"
  - "docs/adr/**/*.md"
  - "**/docs/adr/**/*.md"
  - "docs/runbook*.md"
  - "**/runbook.md"
  - "**/runbook-*.md"
  - "docs/architecture.md"
  - "**/docs/architecture.md"
---

> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H will delete the source files to close the eager-load loop.

# planning-rules

## Source files migrated

- `rules-library/common/code-graph-validation.md`
- `rules-library/common/adr-template.md`
- `rules-library/common/runbook-template.md`

---

<!-- ============================================================
     Section: code-graph-validation.md (from rules/common/)
     ============================================================ -->

# Code-Graph Validation Rule (Always-On, Global)

> Auto-fires on every file. Sister to `verify-before-claim.md`
> (verification paired with claim), `done-criteria.md` (the gates
> every "done" runs), `plan-task-breakdown.md` (every atomic task
> has a verification predicate), `plan-execution-progress.md`
> (per-phase verification block), `no-overclaim.md` (no claim
> without proof), `proper-fixes-first.md` (root-cause fixes), and
> `no-silent-drops.md` (don't bury broken wirings).

## Core Principle

**Every task, every todo, every commit, every phase, every claim
of completion is paired with a CODE-GRAPH VALIDATION run THIS
TURN against the touched surface. The graph is built
INCREMENTALLY — touched files + their inbound and outbound edges
— so the check is cheap (seconds, not minutes). A code-graph gap
(missing import, missing handler, missing schema column, missing
agent, missing skill, broken cross-reference, dangling hook
script, unwired feature) is a BUG-IN-WAITING; finding it at write
time costs minutes, finding it in production costs hours +
trust.**

User directive (verbatim, 2026-06-01): *"code graphing should be
part of the writing and building process and should be a practice
done incrementally. so let's update relevant rules. every task or
todo done must have this run against it. This will always help us
have properly written codes or implementations 100% of the
time."*

## What "code-graph" means

The code-graph is the LOAD-BEARING NETWORK of references in any
codebase or config surface. Every node (file, function, type,
route, schema, event, agent, skill, rule, hook, command,
permission, env var, secret, IAM action, queue, topic, table,
column, index) has inbound edges (who uses me) and outbound edges
(who I depend on). A healthy graph has no dangling references —
every used node is defined, every defined node is used (or
explicitly documented as future-use).

Code-graph validation tracks two failure classes:

| Class | Symptom |
| --- | --- |
| **Outbound broken** | Code references a thing that doesn't exist (import / call / route / schema column / agent / hook script / skill / rule / env var / IAM action / queue name / type / event name) |
| **Inbound dead** | Thing is defined but nothing references it (unused export, unwired route, orphan migration, dead config flag, abandoned agent, archived rule still cited, unrouted handler) |

Both classes are BUG-IN-WAITING. Outbound-broken bugs surface at
runtime (NPE, 404, "config key missing", "permission denied").
Inbound-dead bugs surface as confusion ("why does this file
exist?") and decay (the dead surface drifts behind the live one).

## Hard rules

### 1. Code-graph validation runs INCREMENTALLY on every task

The validation scope is the SET of files touched in the current
task + their immediate neighbors:

- **Outbound check**: for each touched file, verify every
  imported / called / referenced symbol resolves to a defined
  node (in-tree OR in a known external dependency).
- **Inbound check**: for each touched file, verify the file is
  referenced by something OR is a documented entry point.

Full-repo code-graph validation is NOT mandatory on every task;
incremental is. Full-repo validation runs at phase boundaries
(per `plan-execution-progress.md`) and pre-push gates (per
`plan-completion-before-push.md`).

### 2. Validation timing: BEFORE the claim, not after

The flow MUST be:

1. Touch the file (Write / Edit / new file).
2. Run the incremental code-graph check on the touched file +
   its immediate neighbors.
3. Resolve every dangling reference uncovered (either by
   adding the missing definition, removing the dangling
   reference, or documenting the deferred wiring with a
   `BUG(unwired-<slug>)` marker per `no-silent-drops.md` rule
   0).
4. Capture the validation output in the verification block.
5. THEN claim the task / phase / todo is done.

The validation runs THIS TURN — not "we'll run it later."

### 3. Surfaces that get code-graph validation

Every artifact class that has references gets checked. Per
language / per stack:

| Surface | Outbound checks | Inbound checks |
| --- | --- | --- |
| **TS / JS** | `tsc --noEmit`; `eslint --no-eslintrc --rule "import/no-unresolved: error"`; resolves every `import` | `ts-prune` / `knip` for unused exports; orphaned files |
| **Go** | `go build ./...` + `go vet ./...`; resolves every import / type / function | `staticcheck ./...` (U1000 dead code); unused exports |
| **Python** | `mypy --strict` + `pyright --strict` + `ruff check`; resolves every import | `vulture` for dead code; `ruff F401` unused imports |
| **Java / Kotlin** | `mvn verify` / `gradle build` resolves every import + reference | SpotBugs unused-private; `gradle dependencies` for unused deps |
| **Ruby** | `rubocop` Lint/UselessAssignment; `bundler` checks gem availability | `dead_end` for unreachable code; `unused-gems` audit |
| **Rust** | `cargo build` + `cargo clippy` resolves every use / fn | `cargo machete` for unused deps; clippy dead-code |
| **C / C++** | `clang-tidy` + linker resolves every symbol | `clang-tidy --checks="readability-redundant-*"` |
| **C#** | `dotnet build /warnaserror` resolves every using / reference | Roslyn analyzers for unused symbols |
| **Swift / Dart** | `swift build` / `dart analyze` resolves every import | analyzer unused-import |
| **SQL / migrations** | every column / table / index referenced exists in current schema | every defined column / table is referenced by code or documented |
| **Routes / handlers** | every route → registered handler; every handler → registered route | every defined handler has a route OR is documented as RPC |
| **Schemas / events** | every event payload field referenced by consumers exists in producer schema | every defined event has ≥ 1 consumer OR documented external sink |
| **Env vars** | every `process.env.X` / `os.environ["X"]` / `os.Getenv("X")` exists in `.env.example` AND documented in `docs/secrets.md` | every entry in `.env.example` is read by at least one code path |
| **IAM / permissions** | every action invoked has a granted permission in IaC | every granted permission is invoked or documented as future |
| **Queues / topics** | every publish target has a subscriber; every subscriber's topic is defined | every defined queue / topic has ≥ 1 producer + 1 consumer |
| **Webhook signatures** | every signed-event path verifies signature | every signing-key has a verifier on the receiver |
| **Cron / scheduled** | every cron expression maps to a registered handler | every scheduled handler has a registered cron entry |
| **Feature flags** | every flag read has a registry entry; every registry entry has a removal task (per `feature-flags.md`) | every defined flag is read OR has an expiry per `feature-flags.md` |
| **Docs surfaces** | every markdown link resolves; every code-block reference exists | every documented feature has a code path; every code path that's user-visible has a doc page (per `docs-sync-with-code.md`) |
| **Agents / skills / rules / hooks / commands (~/.claude/)** | every cited file exists; every named agent / skill / hook script / command is on disk | every defined artifact is referenced by at least one consumer (CLAUDE.md, auto-skills.md, council-triggers.md, settings.json) |
| **Tests** | every imported subject exists; every assertion's expected code path runs | every test file has ≥ 1 test; every public function has ≥ 1 test or documented as untested |

The matrix is exhaustive intentionally — the rule fires on
every artifact class, not just source code.

### 4. Discovery mechanism — graph the surface incrementally

When a file is touched:

1. **Outbound graph**: parse the file's imports / requires /
   uses / references. For each, resolve to a node.
   - In-tree resolution: file exists at the resolved path; or
     module is in `node_modules` / `go.sum` / `requirements.txt` /
     `Cargo.toml` / `Gemfile.lock`.
   - Missing → BUG: surface the dangling reference + either
     add the definition or remove the reference.

2. **Inbound graph**: grep for the touched file's exports +
   path across the workspace.
   - If references found → file is wired.
   - If zero references AND file isn't a documented entry
     point → BUG: either wire the file OR delete it.

3. **Cross-artifact graph** (the load-bearing networks beyond
   source code):
   - Hook event in `settings.json` → script path exists +
     executable.
   - Agent in `~/.claude/agents/` → frontmatter complete +
     model valid + tools available.
   - Skill in `~/.claude/skills/<name>/SKILL.md` → frontmatter
     has `name:` + `description:` per Anthropic Agent Skills
     v1.0 spec.
   - Rule citation across `~/.claude/rules/` → target file
     exists.
   - Council Division agent in `council-triggers.md` → agent
     file exists in `~/.claude/agents/`.
   - Command referencing agent → agent file exists.
   - `auto-skills.md` mapping → skill directory exists.
   - `CLAUDE.md` rule reference → rule file exists.

### 5. Per-language commands (canonical incremental check)

Each language ships an incremental code-graph check. Run the
relevant one(s) on touched files:

| Language | Incremental command |
| --- | --- |
| TypeScript | `tsc --noEmit && eslint <touched> --no-eslintrc --max-warnings 0 --rule "{import/no-unresolved:'error'}"` |
| Go | `go build ./<pkg>/... && go vet ./<pkg>/... && staticcheck ./<pkg>/...` |
| Python | `ruff check <touched> && mypy --strict <touched>` |
| Java | `mvn -pl <module> compile` |
| Kotlin | `gradle :<module>:compileKotlin` |
| Ruby | `bundle exec rubocop <touched> && ruby -c <touched>` |
| Rust | `cargo check --package <pkg>` |
| C / C++ | `cmake --build build --target <touched-target>` |
| C# | `dotnet build <project> /warnaserror` |
| Swift | `swift build` |
| Dart | `dart analyze <touched>` |
| SQL | `sqlfluff lint <touched>` |
| Markdown | `markdownlint <touched>` |
| Shell | `shellcheck <touched>` |
| Terraform | `terraform validate` |
| `~/.claude/` config surface | `bash ~/.claude/scripts/code-graph-validate.sh <touched>` (see "Reference implementation" below) |

### 6. Verification block includes code-graph status

Per `verify-before-claim.md`, the verification block for every
claim of completion includes a code-graph row:

```text
Verification (this turn):
- tsc --noEmit: 0 errors
- eslint <touched> --max-warnings 0: clean
- code-graph (touched files): all outbound refs resolve; all
  inbound refs present; 0 dangling, 0 dead
- IDE diagnostics: 0
```

If code-graph validation found and fixed gaps, the count goes
in the block ("3 dangling refs found + fixed; 1 dead file
deleted; 1 unwired feature documented as BUG(unwired-…)").

If validation was skipped (genuinely no relevant edges to
check), say so explicitly: "code-graph not run (doc-only edit,
no source touched)".

### 7. Every atomic task in a plan carries a code-graph

predicate

Per `plan-task-breakdown.md` rule 4 (every task has explicit
verification): the verification predicate for atomic tasks
SHOULD include a code-graph check when the task touches code,
config, or wiring. Example task rows:

```text
Task M.N.1 — Add `OrderService.placeOrder` method in
  src/services/OrderService.ts · verify: tsc clean +
  code-graph for OrderService + handler import resolves
Task M.N.2 — Wire `POST /orders` to OrderService.placeOrder
  in src/routes/orders.ts · verify: route registration
  resolves; e2e probe returns 201
Task M.N.5 — Add `STRIPE_KEY` env var to .env.example AND
  docs/secrets.md · verify: code-graph confirms every
  process.env.STRIPE_KEY callsite has an entry
```

The predicate is the same shape as any other verification
predicate (green/red, mechanical, fast).

### 8. Per-phase code-graph sweep

Per `plan-execution-progress.md`, each phase ends with a
verification block. For multi-phase plans, the phase's
verification block includes a SWEEP-WIDER code-graph check
beyond just touched files:

- Cross-phase boundary: did this phase create dangling
  references that another phase must resolve?
- New artifacts: do they have inbound edges (consumers, tests,
  docs)?

The phase-boundary sweep catches gaps that the per-task
incremental check missed because the task touched only one
side of the edge.

### 9. Pre-push full-graph validation

Per `plan-completion-before-push.md`, the push gate runs the
FULL code-graph validation across the touched-in-plan surface

- its inbound + outbound 2-hop closure. This is the safety
net before the work becomes visible to teammates / CI /
production.

Implementation: `~/.claude/scripts/code-graph-validate.sh
--scope=plan` (or repo-specific equivalent).

### 10. Code-graph gaps are NOT silent-drops

A discovered code-graph gap is a real bug. Per
`no-silent-drops.md`:

- An "unused" import that's actually a wiring gap → wire it,
  not delete it.
- A commented-out section that's actually a half-implemented
  feature → either implement OR ask the user, never silently
  delete.
- A defined-but-unused export that was meant to be wired →
  finish the wiring, not delete the export.

When uncertain whether a graph gap is a missing wiring vs
genuine dead code, ASK the user. Never silently choose.

### 11. Graph-aware refactor discipline

When refactoring (renaming, moving, extracting):

1. **Find all inbound edges** to the symbol being moved.
2. **Update all callers** in the same edit / commit.
3. **Verify the graph closes** before the claim of done.

Per `reuse-first.md` — extending an existing primitive instead
of forking it is a graph-aware refactor: the inbound edges all
keep working because the primitive's interface stays stable.

### 12. CI mirrors the local check

Per `local-dev-setup.md` rule 7 (verify script same as CI):
the same code-graph commands run locally and in CI. CI gate
fails on dangling refs or unresolved imports just like the
local incremental check.

## What this rule does NOT do

- **Does NOT replace per-language linters** (tsc, mypy,
  staticcheck, etc.). It's COMPOSED of them + cross-artifact
  checks they can't do alone.
- **Does NOT require building a full AST graph database**
  (Sourcegraph, LSIF, SCIP) — useful when available but not
  the minimum bar. Per-language linters + targeted greps
  cover the floor.
- **Does NOT block trivial edits** (single-line typo fix,
  config-only tweak) that have no graph implications. The
  rule fires on TASKS, not every keystroke; the task's
  verification block names whether a code-graph check was
  applicable.

## Reference implementation: `~/.claude/scripts/code-graph-validate.sh`

A canonical shell script that validates the `~/.claude/` config
surface (hook→script, agent frontmatter, skill frontmatter,
auto-skills.md mapping, council-triggers.md ↔ agent
consistency, command→agent refs, rule cross-references,
settings.json permission allowlists).

Each project's verify script extends this with its own
language-specific incremental checks (the table in rule 5).

The script is INCREMENTAL by default (`--scope=touched`) and
FULL on explicit invocation (`--scope=plan` or `--scope=full`).
Output is a green/red verdict + counts of dangling / dead /
unwired findings.

## Anti-patterns

### Anti-pattern 1: "It compiles, ship it"

A clean `tsc --noEmit` does NOT mean the graph is healthy. A
route handler exists, the type-check passes, but the route is
never registered → the endpoint 404s in production. Graph
validation catches this.

### Anti-pattern 2: "We'll wire it up later"

Defining a handler / agent / skill / rule without wiring it to
its registry is a dangling-inbound state. Per
`no-silent-drops.md` rule 0 — every commented or
half-implemented surface either ships wired OR is flagged with
a `BUG(unwired-<slug>)` marker the next session must address.

### Anti-pattern 3: Skipping validation on "small" changes

A one-line rename touches every inbound edge to that symbol. A
"small" change with broad graph implications is exactly the
class that benefits most from incremental validation.

### Anti-pattern 4: Full-repo validation only at the end

The push gate's full-repo validation catches gaps but at the
WORST time — after the work is presumed done. Incremental
per-task validation catches gaps at the cheapest possible
moment (the same minute they were introduced).

### Anti-pattern 5: Treating dangling-inbound as cleanup

An unused export looks like cleanup-fodder. It's often a
wiring gap. Per `no-silent-drops.md` rule 2 — verify before
delete; ask the user when ambiguous.

## Cross-references

- `verify-before-claim.md` — every claim of done attaches a
  verification block; code-graph row is part of it
- `done-criteria.md` — per-language verification suite
  includes the language's code-graph check
- `plan-task-breakdown.md` — every atomic task's verification
  predicate includes code-graph when relevant
- `plan-execution-progress.md` — per-phase verification block
  includes the phase-boundary code-graph sweep
- `plan-completion-before-push.md` — pre-push gate runs full
  code-graph validation
- `no-overclaim.md` — strong-completion phrases require
  code-graph green this turn
- `no-silent-drops.md` — graph gaps are not cleanup-fodder;
  verify before delete
- `proper-fixes-first.md` — a graph gap discovered mid-task
  gets a root-cause fix, not a `// TODO: wire later` marker
- `reuse-first.md` — refactor by extending the existing
  primitive (preserves inbound edges)
- `docs-sync-with-code.md` — docs surface is part of the
  graph; broken doc links are graph gaps
- `auto-skills.md` — the file-to-skill-and-agent mapping is
  itself a graph; entries must resolve to existing artifacts
- `council-triggers.md` — Division → agent edges must resolve
- `local-dev-setup.md` — CI runs the same code-graph checks
- `hooks.md` — hook event → script path edges must resolve
- `extreme-lint-policy.md` — strict linters power the
  per-language code-graph checks

## Why this rule exists

Code-graph validation IS the difference between code that
compiles + code that works. The incidents this rule prevents
have all happened in real sessions:

1. Refactored a service; left a caller pointing at the old
   name; type-check passed because the caller was in a file
   not touched by the refactor. 404s in production.
2. Added a new agent file; forgot to add it to
   `council-triggers.md`. The Council protocol never engaged
   the agent on its domain. Months of relevant tasks ran
   without that perspective.
3. Defined a new skill in `~/.claude/skills/<name>/SKILL.md`
   without frontmatter. The Anthropic Agent Skills v1.0 loader
   couldn't auto-discover it. The skill was inert from day
   one.
4. Added a `process.env.STRIPE_KEY` callsite without updating
   `.env.example`. Dev environments started crashing on fresh
   clones; nobody knew why for two days.
5. Created a route handler; forgot to register the route. The
   endpoint returned 404. The handler's tests passed.
6. Deleted a "dead" file that was actually the only inbound
   edge to a critical feature. The feature broke in production
   the next week.

In each case, the cost of code-graph validation at write time
is seconds. The cost of debugging the graph gap in production
is hours + customer trust + on-call sleep. This rule mandates
the cheap path.

User directive (verbatim, 2026-06-01): *"code graphing should
be part of the writing and building process and should be a
practice done incrementally. so let's update relevant rules.
every task or todo done must have this run against it. This
will always help us have properly written codes or
implementations 100% of the time."*

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Task / todo claimed done without a code-graph row in the
  verification block (rule 6 weakening)
- Dangling reference shipped (route → handler missing, import
  → file missing, agent → file missing) — incremental check
  skipped at write-time
- Dead file / unused export / orphan migration accumulates
  past the next phase boundary (rule 8 phase-sweep weakening)
- "Wire it later" / `// TODO: register` markers introduced
  (anti-pattern 2 violation — sister `no-silent-drops.md`)
- Refactor renamed a symbol but inbound callers not all
  updated (rule 11 weakening)
- Env var added in code without `.env.example` + `docs/
  secrets.md` entries (rule 3 env-var row violation)
- Skill / agent / rule / command created without
  cross-references in `auto-skills.md` / `council-triggers.md`
  / `CLAUDE.md` (rule 3 ~/.claude/ row violation)
- Code-graph CI gate diverges from local incremental check
  (rule 12 weakening — CI/local parity gap)
- Full-repo validation only at push time, no incremental
  checks during execution (anti-pattern 4 violation)
- Dead-code deletion proposed without verifying inbound edges
  (anti-pattern 5 violation)

**Refinement candidates**:

- New row in the per-language commands table when a stack
  emerges with its own incremental graph tooling (LSIF / SCIP
  / scip-typescript / scip-python adoption)
- Tightening of the validation scope when phase-boundary
  sweeps reveal recurring inter-phase dangling refs
- New surface row in rule 3 when a new artifact class (MCP
  tool, GraphQL schema, OpenAPI spec, ProtoBuf file, JSON
  Schema) gains presence in the codebase
- New cross-reference when a sister rule (verify-before-claim,
  proper-fixes-first, no-silent-drops, docs-sync-with-code)
  gains a graph-aware gate
- New BUG(unwired-*) marker template when a recurring
  half-finished-wiring class emerges (e.g., new agent without
  council trigger, new skill without auto-skills entry)

---

<!-- ============================================================
     Section: adr-template.md (from rules/common/)
     ============================================================ -->

# ADR Template Rule (Always-On, Global)

> Auto-fires on every file. Sister to `docs-sync-with-code.md`,
> `task-intake-due-diligence.md` Q20 (documentation footprint),
> `architect` agent. Standards: **Michael Nygard's ADR format**
> (2011, original definition), **MADR** (Markdown Any Decision
> Records) format.

## Core Principle

**Every non-trivial architectural decision is recorded as a
short Markdown file under `docs/adr/` BEFORE the
implementation lands. The ADR captures the trade-off, the
chosen path, and the consequences — so the next contributor
(or the same engineer six months later) understands WHY the
system is shaped this way, not just WHAT it does.**

## What counts as an "architectural decision"

Decisions that warrant an ADR:

- Adopting a new technology / framework / library (e.g.,
  "we use Postgres for everything except event streams,
  which use ClickHouse")
- Choosing between competing patterns (e.g., "REST vs gRPC
  for internal service-to-service", "monorepo vs polyrepo")
- Database schema design (e.g., "single-table DDB for
  multi-tenant data", "Postgres RLS on every multi-tenant
  table")
- Authentication / authorization shape (e.g., "JWT vs
  session cookies; cell-bound JWTs in multi-region")
- Async pattern (e.g., "SQS for outbox; SNS for fan-out;
  EventBridge for scheduling")
- Cross-cutting concern resolution (e.g., "structured logs
  via @logger module; metrics via EMF inline")
- Migration approach (e.g., "dual-write for 30 days then
  cutover")
- Compliance choice (e.g., "GDPR data deletion via DDB TTL
  - DB column tombstone")
- Tooling / build / deploy (e.g., "pnpm not npm; serverless-
  framework not SAM")

Decisions that do NOT need an ADR:

- Naming conventions (those live in `coding-style.md`)
- Per-PR design choices that don't cross service boundaries
- Library version bumps (those live in `CHANGELOG.md`)
- One-off bug fixes

## Required ADR structure

Every ADR follows this template (MADR-compatible):

```markdown
# ADR-NNNN: <short title>

**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-MMMM
**Date**: YYYY-MM-DD
**Deciders**: <names / roles>
**Tags**: <area1>, <area2>, <area3>

## Context

Why are we making this decision now? What forces are at play
(user load, regulatory requirement, vendor change, performance
ceiling, security incident, team capacity)?

## Decision drivers

Bullet list of the criteria that matter for this decision:

- [Criterion 1] — e.g., "cost at 10× current scale"
- [Criterion 2] — e.g., "complies with GDPR data residency"
- [Criterion 3] — e.g., "compatible with existing TS stack"

## Considered options

| Option | Pros | Cons |
| --- | --- | --- |
| A — <name> | <pros> | <cons> |
| B — <name> | <pros> | <cons> |
| C — <name> | <pros> | <cons> |

## Decision

Option <X> — <name>.

State the decision in present-tense first-person plural:
"We use Postgres + Row-Level Security for multi-tenant data."

## Rationale

Why this option over the others — keyed against the decision
drivers. Cite primary-source references (per
`official-docs-first.md`) where the trade-off relies on
external claims.

## Consequences

### Positive

- [What we gain by choosing this option]
- [Second-order benefit]

### Negative

- [What we give up]
- [Future risk this introduces]

### Neutral

- [Things that change but aren't strictly better or worse]

## Implementation footprint

Files / modules / services this decision affects. (Not the
implementation itself — that's the PR. The ADR names the
surface.)

## Migration / rollout plan

If this is a change from the current state, name the migration
shape (per `task-intake-due-diligence.md` Q17 — rollback / DR
plan):

- Step 1
- Step 2
- ...

## Compliance / regulatory considerations

Any compliance, accessibility, security, or regulatory
implications (per `security.md` compliance table + `a11y.md`
+ `task-intake-due-diligence.md` Q11).

## Related ADRs + references

- ADR-MMMM — <related decision>
- RFC <number> — <protocol reference>
- Vendor docs — <URL>
- Per `task-intake-due-diligence.md`, the intake's Q1-Q29
  populates this ADR's Context + Considered Options +
  Consequences.
```

## Hard rules

### 1. ADRs use a stable numbering scheme

Numbered sequentially from `0001`. Once assigned, an ADR
number is permanent — even if the ADR is deprecated /
superseded, its number stays. Filename:
`docs/adr/0042-postgres-row-level-security.md`.

### 2. Status changes are recorded inline

When an ADR is superseded, the original ADR's status changes
to "Superseded by ADR-MMMM" but the body is left intact for
historical record. The superseding ADR cross-references back.

### 3. ADRs are committed BEFORE the implementation PR

The ADR PR lands first (status: Proposed → Accepted on merge).
The implementation PR(s) reference the accepted ADR. This
order makes the decision reviewable separate from the
implementation, which is reviewable separate from the
architectural rationale.

### 4. ADRs are immutable after acceptance (mostly)

Once an ADR is Accepted, the body is immutable. Status +
"Related ADRs" can be amended; content cannot. To change the
decision, write a superseding ADR.

### 5. ADRs link to the code they govern

The implementation PR includes a comment in the touched files
referencing the ADR number when the architectural choice is
not self-evident. Example:

```typescript
// See ADR-0042 (Postgres RLS) for why every multi-tenant
// query goes through `withTenant(orgId)` instead of WHERE
// clauses on org_id.
```

But the comment is short — the ADR has the full context.

### 6. ADRs cite primary sources

Per `official-docs-first.md`, ADRs that depend on external
behaviour (vendor docs, RFCs, regulation text) cite the
canonical URL — never Stack Overflow / blog posts as the sole
source.

### 7. ADRs are part of every architectural Council Phase 0

Per the Council Protocol Phase 0, architectural decisions
produce an ADR draft as the output. The draft is reviewed by
Council divisions 1 (Architecture) + 4 (Security) + 6
(Compliance) at minimum.

### 8. Repository layout

```text
docs/
├── adr/
│   ├── README.md           # index + acceptance process
│   ├── template.md         # the canonical empty template
│   ├── 0001-record-architecture-decisions.md
│   ├── 0002-...
│   └── 0NNN-...
```

`docs/adr/README.md` lists every ADR with status + date +
title + tags, sorted by number.

### 9. ADRs use plain English

ADRs are read by future engineers (junior, senior, external
auditors, compliance officers). Avoid jargon when possible;
when unavoidable, link to a glossary.

### 10. Bad ADRs are worth more than no ADRs

A short, half-finished ADR that captures the decision +
rationale is better than no ADR. Iterate later. The risk is
losing the "why" — write it down NOW even if rough.

## Cross-references

- `docs-sync-with-code.md` — every architectural change ships
  with the ADR in the same PR
- `task-intake-due-diligence.md` Q20 (docs footprint) — ADR
  is part of the docs footprint
- `task-intake-due-diligence.md` Q9 + Q11 — STRIDE + compliance
  feed the ADR's Compliance section
- `architect` agent — produces ADR drafts during Council
  Phase 0
- `official-docs-first.md` — ADRs cite primary sources
- `done-criteria.md` — ADR is part of every "done" claim that
  introduces architectural change

## Standards cited

- **Michael Nygard's ADR format** (2011, "Documenting
  Architecture Decisions")
- **MADR — Markdown Any Decision Records** (adr.github.io)
- **ARC42** — architecture documentation framework (often
  references ADRs)
- **C4 Model** — Simon Brown — context / containers /
  components / code (architecture diagrams that
  ADRs reference)

## Why this rule exists

Without ADRs, architectural decisions live in:

- Slack threads (vanish after 90 days on free tier)
- PR descriptions (hard to find later)
- Tribal knowledge (vanishes when people leave)
- Implementation code (the WHAT is visible; the WHY isn't)

The cost of writing an ADR at decision time is 30-60 minutes.
The cost of re-deriving an architectural rationale from cold
code six months later is hours, and often produces a different
answer that contradicts the original (causing thrash).

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Architectural decision made without an ADR landing in the same PR (rule 3 weakening)
- ADR amended after acceptance (rule 4 violation — body is immutable; supersede instead)
- ADR not referenced from the code path that implements it (rule 5 weakening — discoverability gap)
- Sequential numbering broken / reused (rule 1 violation — stable numbering)
- Status not updated when an ADR is superseded (rule 2 weakening)
- ADR cites Stack Overflow / blog post as primary source (rule 6 violation per official-docs-first.md)
- Compliance / security implications missing from a regulated-domain ADR (template weakening)
- Council Phase 0 architectural output not crystallised into an ADR (council-default.md weakening)

**Refinement candidates**:

- New required-section row when an ADR class consistently lacks a load-bearing dimension
- Tightening of the "Considered options" requirement when ADRs ship with only one option compared
- New cross-reference when a sister rule (runbook-template, docs-sync-with-code) prescribes companion artifacts
- New tag taxonomy row when a recurring decision domain emerges (data, security, compliance, AI, etc.)

---

<!-- ============================================================
     Section: runbook-template.md (from rules/common/)
     ============================================================ -->

# Runbook Template Rule (Always-On, Global)

> Auto-fires on every file. Sister to `observability.md` (the
> signals runbooks act on), `docs-sync-with-code.md` (runbook
> kept in sync with code), `task-intake-due-diligence.md` Q26
> (operational handoff), `error-handling-with-context.md` (every
> error has a runbook entry referenced by `error_code`).

## Core Principle

**Every alert page, every observed failure mode, every
production-impacting class of bug has a corresponding runbook
entry that lets on-call resolve the incident WITHOUT reading
source code. The runbook is the operational interface to the
service; it lives at `docs/runbook.md` (or per-service
equivalent) and is updated in the SAME PR that introduces
the failure mode.**

## Required runbook structure

Every runbook entry follows this template:

```markdown
## <symptom-named entry id> — e.g., `auth_login_p99_latency_spike`

### What you'll see
- Alert: "[Service] login p99 > 2s sustained 5min"
- Pager: PagerDuty service: <name>
- Visible symptoms (user-side): login form spinner > 2s; users
  drop off

### Severity
P0 / P1 / P2 / P3 — with the SLO context (e.g., "P1: error
budget at 30% — burning fast").

### What's happening (background)
One paragraph naming the system shape + why this alert fires.
Reference the architecture doc OR the ADR if the architecture
is non-obvious.

### Diagnose
Ordered list of commands / dashboards / queries:
1. Open dashboard <URL>
2. Check metric `auth_login_duration_seconds{result="success"}`
3. Run `kubectl logs -n auth -l app=auth-service --tail=200`
4. Check upstream dep `db_connection_pool_used_count`

Each step has a specific signal that distinguishes the cause.

### Fix
Per-cause actions:
- **Cause A** (DB pool exhausted): scale connection pool;
  command: <exact command>; verification: <metric>
- **Cause B** (upstream provider down): flip the
  feature-flag kill-switch <name>; command: <exact command>;
  verification: <metric>
- **Cause C** (deploy regression): revert to last known good
  via `kubectl rollout undo deployment/auth -n auth`;
  verification: alert clears

### Verify recovery
Specific signals that confirm the incident is closed:
- `auth_login_duration_seconds{result="success"}` p99 < 500ms
  sustained 10min
- Error budget burn rate normalised

### Communicate
- Slack channel: #incident-comms
- Status page: <URL> — update once on diagnose, once on fix
- Internal post-mortem within 5 business days

### Related runbook entries
- <other-entry-id> — cross-reference
- <related-ADR> — architectural decision context
```

## Hard rules

### 1. Every alert has a runbook URL

Every PagerDuty service / Opsgenie team / etc. has the runbook
URL in the alert payload. On-call clicks the URL and lands at
the matching entry. No on-call should ever Google the alert.

### 2. Error codes link to runbook entries

Per `error-handling-with-context.md`, every `error_code` (e.g.,
`wrong_cell`, `wallet_insufficient_funds`) maps to a runbook
entry. The mapping lives in `docs/error-codes.md` (or
equivalent). The runbook entry explains what the code means +
how to recover when the user-facing path is failing.

### 3. Every new failure mode introduces a runbook entry in

the SAME PR

When a PR adds an alert, a new failure mode, or a new
error code, the runbook entry is part of the PR. Per
`docs-sync-with-code.md`, missing the runbook update is a
PR-blocker.

### 4. Diagnose steps name the SPECIFIC signal

Wrong:

```text
- Check the dashboard
- Look at the logs
- See if anything looks weird
```

Right:

```text
- Open https://grafana.example.com/d/auth-overview
- Check `auth_login_duration_seconds` (p99 panel, top-right)
- Run `aws logs tail /aws/lambda/auth-login --since 10m | jq 'select(.error_code)'`
- If `error_code` is `db_pool_exhausted` → see Cause A below
- If `error_code` is `upstream_timeout` → see Cause B below
- If neither → escalate to engineering on-call
```

Specificity is the point. On-call doesn't have time to "look
around."

### 5. Fix steps include verification

Every fix step ends with the signal that confirms it worked:

```text
1. Run `kubectl scale deployment/auth-service --replicas=10 -n auth`
2. Wait for pods to be Ready: `kubectl rollout status deployment/auth-service -n auth`
3. Verify: `auth_login_duration_seconds` p99 drops below 500ms
   within 5 minutes
```

Without verification, on-call can't tell if the fix worked.

### 6. Runbook entries name their assumptions

If the fix depends on a config (e.g., "must have flag
`feature_x` enabled"), say so. If the fix requires elevated
permissions, say which. If the fix has a known side-effect
(e.g., "increases AWS bill by ~$200/h until you scale back"),
say so.

### 7. Runbook entries are versioned

Each entry carries a `Last verified: <YYYY-MM-DD>` footer. If
the entry is older than 6 months + the underlying system has
changed, the entry is re-validated before being trusted.

### 8. Runbook covers the canonical incident classes

Every service's runbook has entries for at minimum:

- Service down (health endpoint failing)
- Latency spike (p99 > SLO)
- Error rate spike (5xx > 1%)
- Throughput drop (RPS < 50% baseline)
- Saturation (CPU / memory / connection pool > 80%)
- Cold-start storm (Lambda / serverless)
- Throttle / rate-limit (Lambda concurrency / API Gateway / DDB)
- Stream consumer lag (Kinesis / SQS / Kafka iterator-age)
- Webhook delivery failures (signature, retry, DLQ)
- DB read/write failures (connection, RLS, deadlock)
- Cache failures (Redis / Memcached)
- External-provider outage (Stripe / Twilio / etc.)
- Deploy regression (post-deploy alert)

## Cross-references

- `observability.md` — the signals runbooks act on
- `error-handling-with-context.md` — `error_code` maps to
  runbook entries
- `docs-sync-with-code.md` — runbook updates ship in the same
  PR as the failure-mode-introducing code
- `task-intake-due-diligence.md` Q20 (docs footprint) + Q26
  (operational handoff)
- `deploy-failures-become-checks.md` — every deploy failure
  becomes both a pre-deploy check AND a runbook entry
- `done-criteria.md` — runbook update is part of every "done"
  claim that introduces a failure mode

## Why this rule exists

Without a runbook, every incident requires the principal
engineer to be reachable + to remember the system's shape.
Mean-time-to-resolution stretches into hours. The runbook
externalises the institutional knowledge so on-call (any
engineer, not just the original author) can resolve incidents
in minutes.

The cost of writing the runbook entry at PR time (15-30
minutes) is repaid the first time on-call uses it.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New PagerDuty / Opsgenie alert created without a runbook URL in the payload (rule 1 violation)
- `error_code` (per `error-codes.md`) added without a corresponding runbook entry (rule 2 weakening)
- "Diagnose" steps say "check the dashboard" / "look at the logs" without naming the specific metric / query (rule 4 violation)
- "Fix" step missing the verification signal that confirms recovery (rule 5 weakening)
- Runbook entry's `Last verified:` footer > 6 months old + system has changed (rule 7 weakening — stale entry)
- New service deployed without entries for the canonical incident classes (rule 8 weakening)
- Runbook diff in the SAME PR as the failure-mode introduction missing (sister rule `docs-sync-with-code.md` weakening)
- On-call escalates an incident the runbook should have resolved without escalation (entry quality gap)

**Refinement candidates**:

- New row in the canonical incident-classes table when a recurring class (e.g., DNS-resolution flap, cert-rotation race, vector DB index-rebuild) emerges
- Tightening of the "specific signal" requirement when on-call's queries reveal common ambiguity
- New cross-reference when a sister rule (observability, error-codes, deploy-failures-become-checks) adds a metric / code the runbook must consume
- New "communicate" template when a recurring incident class needs specific stakeholder routing

---
