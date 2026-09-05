---
name: coding-quality-rules
description: Universal coding-quality discipline that fires on every code file — coding-style, patterns, reuse-first (rule of three), proper-fixes-first (no symptom-only patches), no-silent-drops (no orphan TODOs / suppression directives), no-silent-failures (every failure surfaces), no-discards (every value bound), no-ambient-globals (DI everywhere), no-local-fs, error-codes (stable codes), error-handling-with-context (operation + ids), log-levels (canonical FATAL/ERROR/WARN/INFO/DEBUG/TRACE), semver (Conventional Commits + Keep a Changelog), extreme-lint-policy (cognitive complexity ≤ 10, lines ≤ 80, params ≤ 5, zero per-line suppressions), updated-frameworks, performance, testing (90% touched / 80% project), local-testability (env-setup before write), local-dev-setup. Auto-fires on any code file across all supported languages.
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.mjs"
  - "**/*.cjs"
  - "**/*.mts"
  - "**/*.cts"
  - "**/*.py"
  - "**/*.pyi"
  - "**/*.go"
  - "**/*.rb"
  - "**/*.rake"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.kts"
  - "**/*.swift"
  - "**/*.dart"
  - "**/*.cs"
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.cxx"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.lua"
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.sql"
  - "**/*.vue"
  - "**/*.svelte"
---

# Coding Quality Rules — Universal Discipline

> Migrated 2026-06-02 from 19 files in `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H will delete the originals to close the eager-load loop. Each section below preserves the full content of one source rule; section headings name the rule file of origin.

This skill bundles 19 cross-cutting rules that apply to every code file. Loading is gated by `paths:` — when ANY code file is touched, this skill activates and the disciplines below apply.

## Section index

1. coding-style — naming, comments, file organisation, immutability, error handling
2. patterns — broader architectural patterns; repository / response envelope
3. reuse-first — sweep before write; rule of three
4. proper-fixes-first — root cause, never symptom; banned shortcut patterns
5. no-silent-drops — no orphan TODOs; no suppression directives; no meta-comments
6. no-silent-failures — every failure produces signal at user + server
7. no-discards — every value bound; every error wrapped with context
8. no-ambient-globals — DI everywhere; no module-level mutable state
9. no-local-fs — no local-FS state on ephemeral platforms
10. error-codes — stable snake_case codes; mapped to HTTP + UX + i18n + runbook
11. error-handling-with-context — operation + ids + wrapped cause chain
12. log-levels — FATAL/ERROR/WARN/INFO/DEBUG/TRACE canonical semantics
13. semver — Semantic Versioning 2.0.0 + Conventional Commits 1.0.0 + Keep a Changelog 1.1.0
14. extreme-lint-policy — strictest thresholds; zero per-line suppressions
15. updated-frameworks — latest stable; no abandoned / EOL dependencies
16. performance — model selection; opus for coding/reviewing/planning; context discipline
17. testing — 90% touched / 80% project; TDD red-green-refactor; multiple test types
18. local-testability — code must be locally testable BEFORE writing
19. local-dev-setup — one bootstrap command; 30-min first-run target; vault-based secrets

---

<!-- ============================================================
     Section: coding-style.md (from rules/common/)
     ============================================================ -->

# Coding Style

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate existing ones:

```text
// Pseudocode
WRONG:  modify(original, field, value) → changes original in-place
CORRECT: update(original, field, value) → returns new copy with change
```

Rationale: Immutable data prevents hidden side effects, makes debugging easier, and enables safe concurrency.

## File Organization

MANY SMALL FILES > FEW LARGE FILES:

- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from large modules
- Organize by feature/domain, not by type

## Error Handling

ALWAYS handle errors comprehensively:

- Handle errors explicitly at every level
- Provide user-friendly error messages in UI-facing code
- Log detailed error context on the server side
- Never silently swallow errors

## Input Validation

ALWAYS validate at system boundaries:

- Validate all user input before processing
- Use schema-based validation where available
- Fail fast with clear error messages
- Never trust external data (API responses, user input, file content)

## Code Quality Checklist

Before marking work complete:

- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No hardcoded values (use constants or config)
- [ ] No mutation (immutable patterns used)

## Comments — what they DO and DO NOT contain

Comments document the WHY when it isn't obvious from the code: hidden
constraints, subtle invariants, surprising shape choices, workarounds for
specific bugs.

Comments DO NOT contain:

- The current task, fix, or callers ("used by X", "added for the Y flow",
  "handles the case from issue #123") — those belong in the PR description.
- External tracker pointers: plan IDs (`plan B2`, `Initiative I10`,
  `punch-list X`), Linear / Jira / GitHub issue numbers, doc section
  numbers, lint rule codes (`Sonar S1192`). They rot as the codebase
  and the tracker drift apart. **This includes mentioning rules in
  prose** — phrases like "to satisfy Sonar", "keeps the linter
  happy", "Sonar S6551 flags this" all violate the rule. Comments
  describe what the code is doing AS CODE, not how it relates to a
  lint rule. Banned tokens in comments (case-insensitive, as whole
  words or substrings): `Sonar`, `SonarLint`, `SonarQube`, `Sonarjs`,
  `ESLint flags`, `to satisfy <linter>`, `linter happy`, `to dodge`,
  `to satisfy <rule>`, `S\d{3,4}` (any 3-4 digit S-prefixed code).
- Placeholder markers (T-O-D-O / F-I-X-M-E / X-X-X). Open a real ticket
  or implement the change. The codebase is not a backlog.
- Suppression directives: `//nolint`, `// eslint-disable`,
  `// @ts-ignore`, `// @ts-expect-error`, `# noqa`, `# type: ignore`,
  `# pragma: no cover`, `# rubocop:disable`. Fix the code, not the rule.
- **Refactor-history / "legacy" framing.** Build as if the codebase is
  being written fresh today. The reader cares about what the code does
  now and what invariants it must preserve — not where it came from.
  Banned vocabulary in comments:
  - "legacy", "legacy code", "legacy inline", "legacy version",
    "legacy caller", "legacy contract", "legacy column queries",
    "legacy switch", "legacy monolith", "legacy fallback"
  - "byte-identical", "byte-preserved", "preserved across refactor",
    "preserved from inline", "behaviour preserved", "behaviour byte-preserved"
  - "previous N-parameter form", "previous form", "previous shape",
    "the previous monolithic body", "the original implementation",
    "the original signature", "the original 11-positional-argument",
    "matches the historical", "matches the legacy"
  - "the historical inline", "historical caller contract",
    "historical IP allowlist", "historical typo", "historically",
    "the historical else-branch", "historical drift"
  - "monolith", "the monolithic body", "decomposed from"
  - "this is the legacy version of", "kept for back-compat",
    "back-compat shim", "back-compat with anything", "for back-compat"
  - "post-decomposition", "pre-decomposition", "post-extraction",
    "pre-extraction"

  Write the rule, the constraint, or the invariant — not its provenance.
  If you need the reader to be aware of a known bug, use a `BUG(<short
  id>):` marker that describes the *current* incorrect behaviour, never
  one that says "preserved from earlier code". The PR description and
  the commit message are the right home for migration narrative.

  Worked example (Go):

  ```go
  // GOOD: describes the invariant
  // Credits the user's withdrawable balance and, when the source
  // transaction is escrow-channel, increments EscrowBalance by the
  // same amount. The unconditional second CreateBalance write is
  // tracked as a known idempotency gap — see BUG(B2).
  func (c *Controller) creditInstantBalance(...) error { ... }

  // BAD: describes provenance, not behaviour
  // Credits the user's withdrawable balance. Body is byte-identical
  // to the pre-decomposition inline form lifted out of the legacy
  // monolith; the dual-write quirk is preserved across the refactor.
  func (c *Controller) creditInstantBalance(...) error { ... }
  ```

## Mechanically Banned Patterns (zero tolerance, hook-enforced)

The PostToolUse hook at `~/.claude/scripts/hooks/post-edit-no-discards.js`
rejects edits that introduce any of the following. Enforcement is
unconditional — see `~/.claude/docs/no-discards.md` for the full
manifest and the layered enforcement strategy.

DO NOT WRITE:

- `_, err :=` / `, _ :=` / `_ = …` — **every return value must be
  bound to a real identifier and handled** (used, asserted, logged,
  or propagated). Test files are NOT an exception; bind the value
  and assert on it so a regression that changes the dropped slot
  fails the test. The same rule applies to method receivers,
  function parameters, and channel reads. The hook treats every
  `_` left-hand-side as a discard.
- `for _, v := range slice` and other range-loop discards. Iterate
  by index instead: `for i := range slice { v := slice[i]; ... }`.
  For maps: `for k := range m { v := m[k]; ... }`. For channels:
  `for v := range ch`. **There is no canonical-idiom exception** —
  every value Go returns is part of the contract and must be bound.
- `defer file.Close()` and `defer func() { _ = x.Close() }()` —
  Close errors must be logged. Correct shape:

  ```go
  defer func() {
      if err := file.Close(); err != nil {
          log.Warn().Err(err).Str("path", path).Msg("close failed")
      }
  }()
  ```

- Comparing errors with `==` instead of `errors.Is` / `errors.As`.
  Wrapped errors do not pass `==`. The Go `errorlint` linter rejects
  every `==` against a sentinel.
- Returning bare `err` from a function. Every propagation wraps with
  context via `fmt.Errorf("op X: %w", err)` so `errors.Is` /
  `errors.As` work at every depth.
- Empty `catch` blocks, fire-and-forget `.catch(() => null)` /
  `.catch(() => undefined)` / `.catch(() => false)` /
  `.catch(() => {})` in TS/JS — log and rethrow or surface to the user.
- `except: pass`, `except Exception: pass`, `except Exception: return None`
  in Python — log with `exc_info=True` and rethrow.
- `do { try thing() } catch { }` in Swift — log and rethrow.
- `Result<_, _>` with `_` capture or `let _ = thing()` in Rust — bind
  and handle.
- Placeholder markers in code or comments (see "Comments" above).
- Suppression comments (see "Comments" above).
- External tracker pointers in comments (see "Comments" above).
- Raw color literals in UI component files: hex (`#abc`, `#aabbcc`),
  `rgb()`/`rgba()`, `hsl()`/`hsla()`, `oklch()`, `oklab()`. Including
  inside Tailwind arbitrary-value brackets (`bg-[#fff]`). Tokens must
  come from the design system.
- `console.log` in production source. Use a real logger.
- Hardcoded credentials in any production source. Common prefixes
  the hook flags: `sk-proj-`, `sk_live_`, `ghp_`, `xoxb-`,
  `AKIA…`, `Bearer eyJ…`, `-----BEGIN PRIVATE KEY-----`. Use env
  vars or a secrets manager.
- Go test functions with underscore in the name (`TestFoo_Bar`).
  Use `t.Run("sub test name", …)` subtests.
- Leftover merge-conflict markers.

The hook also warns (non-blocking) on:

- `!important` in CSS / Tailwind class strings — let the design system win.
- Files past 800 LOC.

When the hook fires, the edit is rejected with exit status 2. Fix every
violation in the file (Rule 5: "Fix all issues in touched files"), not
just the one introduced — pre-existing violations are now in scope too.

Operator override (humans only, never the agent):
`export CLAUDE_NO_DISCARDS_HOOK=off`.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Mutation on an existing object instead of returning a new copy (Immutability rule violation)
- Files past 800 LOC introduced (file-organization warning)
- Functions > 50 lines / files > 800 lines created (size discipline weakening)
- Deep nesting (> 4 levels) recurring in new code
- User input not validated at system boundary (validation-at-boundary weakening)
- Errors swallowed in UI-facing code (no user-friendly message surfaced)
- Comment introduced with banned tokens (Sonar rule IDs, ticket numbers, "legacy" / "byte-identical" / "preserved" framing)
- TODO / FIXME / XXX markers introduced (banned per Comments section)
- Suppression directive (`// nolint`, `// eslint-disable`, `# noqa`, `@ts-ignore`) attempted (PostToolUse hook blocked)
- Hardcoded credential prefix detected (hook blocked: `sk-proj-`, `sk_live_`, `ghp_`, `AKIA…`, `Bearer eyJ…`)
- Raw color literal added to UI source (hook blocked: hex / rgb / hsl / oklch)

**Refinement candidates**:

- New row in the "banned vocabulary" comment table when a new refactor-history phrasing recurs
- Tightening of the file-LOC warning threshold (currently 800) when small files consistently produce cleaner reviews
- New cross-reference when a sister rule (no-discards, no-silent-failures, no-silent-drops) provides the canonical home for a banned pattern
- New hardcoded-credential prefix entry when a new vendor's key shape appears (e.g., new OAuth provider, new cloud)

---

<!-- ============================================================
     Section: patterns.md (from rules/common/)
     ============================================================ -->

# Common Patterns

> **First check: does it already exist?** Per
> `~/.claude/rules-library/common/reuse-first.md`, every new component /
> function / class / module starts with a sweep of the existing
> codebase + vetted dependencies. Hand-rolling a parallel
> implementation of an existing primitive is the most common
> source of maintenance debt. Apply the rule of three: implement
> inline on the first occurrence; extract a shared primitive on
> the second; never reach the third.

## Skeleton Projects

When implementing new functionality:

1. Search for battle-tested skeleton projects
2. Use parallel agents to evaluate options:
   - Security assessment
   - Extensibility analysis
   - Relevance scoring
   - Implementation planning
3. Clone best match as foundation
4. Iterate within proven structure

## Design Patterns

### Repository Pattern

Encapsulate data access behind a consistent interface:

- Define standard operations: findAll, findById, create, update, delete
- Concrete implementations handle storage details (database, API, file, etc.)
- Business logic depends on the abstract interface, not the storage mechanism
- Enables easy swapping of data sources and simplifies testing with mocks

### API Response Format

Use a consistent envelope for all API responses:

- Include a success/status indicator
- Include the data payload (nullable on error)
- Include an error message field (nullable on success)
- Include metadata for paginated responses (total, page, limit)

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New component / function / class introduced without sweep against `reuse-first.md` (existing primitive missed)
- Rule of three violated — third occurrence of same shape without extraction (parallel implementations growing)
- Response envelope inconsistent across handlers (different success indicators, different error shapes)
- Repository pattern implemented as one giant class instead of per-aggregate interface (pattern misuse)
- Skeleton-project evaluation skipped on a non-trivial new feature (sub-agent parallelisation gap)
- Pattern catalog gap: a recurring shape (e.g., outbox, saga, CQRS, fanout) absent from this file

**Refinement candidates**:

- New pattern entry when a recurring architectural shape (event-sourcing, sidecar, ambassador, anti-corruption layer) emerges
- Tightening of the rule-of-three threshold when twin parallel implementations cause defect drift
- New response-envelope field when a recurring metadata need (rate-limit headers, request-id, deprecation notice) emerges
- New cross-reference when a sister rule (api-design skill, error-codes, idempotency) provides the canonical envelope shape

---

<!-- ============================================================
     Section: reuse-first.md (from rules/common/)
     ============================================================ -->

# Reuse-First Rule (Always-On, Global)

> Auto-fires on every file. Sister to `patterns.md`, `coding-style.md`,
> `proper-fixes-first.md`, `no-silent-drops.md`. The user-named
> directive: **"always build with reusable components or functions
> or objects."**

## Core Principle

**Never rewrite anything that already exists. If a component,
function, class, module, or service has been built once anywhere
in the project (or in the project's vetted dependencies), it is
reused everywhere it is needed — never re-implemented, never
copied, never forked. New code is written ONLY for genuinely new
behaviour that no existing primitive covers.**

The four-step gate before ANY new code:

1. **Sweep** — grep the project for the OUTCOME name + the
   canonical directories (`components/`, `lib/`, `services/`,
   `utils/`, `hooks/`, `composables/`, etc.) + the dependency
   tree.
2. **Match** — does an existing primitive cover this use case?
   - **Yes, exactly** → use it. Stop. No new code.
   - **Yes, with a small gap** → extend the existing primitive
     with a prop / parameter / option. Stop. No new file.
   - **No** → proceed to step 3.
3. **Confirm novelty** — is this conceptually a new unit, or am I
   missing an existing primitive because of naming / location?
   Search for synonyms; ask the user when ambiguous.
4. **Write** — only after steps 1-3 confirm genuine novelty.

This rule is uncompromising. The user-named directive: *"We
should never rewrite anything that exists and can be built once
and reused every where it is needed."* Forking, copy-pasting, or
hand-rolling a component / function / object that already has a
canonical implementation is forbidden.

The pattern this rule prevents: parallel implementations of the
same conceptual unit (the same UI primitive in 8 places, the
same HTTP helper in 4 places, the same shape-validation function
inlined into 20 handlers). Parallel implementations drift, mask
defects, and triple the maintenance surface.

## Hard rules

### 1. Check first, write second

Before adding any new component / function / class / module:

```bash
# Sweep the project for existing matches BEFORE creating new code:
grep -r "<concept>" src/    # textual / name match
ls components/ functions/ lib/ utils/    # canonical directories
git log --diff-filter=A --name-only --pretty=format:"" | sort -u | grep -i "<concept>"
```

If a shared primitive matches the use case, use it. If a close-
but-not-quite match exists, extend it with a prop / parameter /
option — never copy + modify.

### 2. The rule of three (extract on second occurrence)

A single implementation is fine. A second occurrence triggers an
immediate extraction:

| Occurrences | Action |
| --- | --- |
| 1 | Implement inline; defer abstraction (per `coding-style.md`'s "no premature abstraction") |
| 2 | EXTRACT NOW into a shared primitive. The second caller updates to use the extracted version in the SAME commit. |
| 3+ | The third caller MUST find the existing primitive. If it didn't, the project's discovery affordances (file naming, index, README) are broken — fix them. |

This is the only exception to "three similar lines is better than
a premature abstraction" — once the same conceptual unit appears
twice, the abstraction has paid for itself.

### 3. Extend, don't fork

When a shared primitive is close-but-not-quite:

- Add a prop / parameter / option to the shared primitive.
- Update all call sites to either pass the new default OR opt-in
  to the new behaviour.
- Never copy the primitive into a one-off variant.

If extending the shared primitive risks breaking other call
sites, surface the trade-off explicitly. Forking is the last
resort and requires the user's awareness.

### 4. One source of truth per primitive

Every conceptual unit lives in exactly one file:

- One Description editor (not 8 textarea variants).
- One Currency formatter (not 4 inlined `.toFixed(2)` calls).
- One Date parser (not `new Date(s)` scattered across handlers).
- One Auth middleware (not 3 token-decoder copies).
- One Database client factory (not per-handler `new Pool(...)`).
- One Logger (not `console.log` mixed with the structured logger).
- One Error envelope shape (not three different error JSON shapes).

If you find duplicates, consolidate. Consolidation is itself a
unit of work and lands as its own commit boundary.

### 5. Defaults live at the primitive, not the call site

If every call site passes the same option value, the default
should move to the primitive. Per-call overrides are reserved
for genuine layout / context constraints — never for "I want this
slightly different here."

### 6. Naming + discoverability are part of the rule

A reusable primitive that nobody can find isn't reusable. Every
shared component / function / module:

- Lives in a conventional directory (`components/`, `lib/`,
  `utils/`, `services/`, `hooks/`, `composables/`, `middleware/`,
  per language convention).
- Carries a name that describes its OUTCOME (`DescriptionEditor`,
  not `TextareaWithToolbar3`).
- Is indexed in the project's component / function / module
  inventory (often a `README.md` or `index.md` in the directory).
- Has a one-line description that a `grep` for the OUTCOME name
  finds.

### 7. Reusable across what?

Reuse spans multiple radii. Apply in this order:

| Radius | Source of truth | Example |
| --- | --- | --- |
| Within the file | Local function / constant | One regex compiled once at module scope, used 5 times |
| Within the module | Module-private helper | A shared validator across handlers of the same domain |
| Within the project | Shared `lib/` / `components/` | The project's `DescriptionEditor`, `apiClient`, `logger` |
| Within the workspace | Workspace-level shared package | Multi-repo monorepo's `packages/shared/` |
| Within the ecosystem | Vetted external library | `date-fns`, `zod`, `axios`, `vue-sonner` (per `install-allowlist.md`) |

Never reach for radius N+1 before exhausting radius N. A new npm
dep is the LAST resort, not the first.

### 8. Cross-language patterns

The principle applies in every language. Specific shapes:

- **React / Vue / Angular**: shared components in `components/ui/`;
  composables / hooks for reusable behaviour; no duplicate
  primitives.
- **Go**: shared types in `pkg/` or `internal/`; helper functions in
  `lib/`; no duplicate `http.Client` configurations.
- **Python**: shared classes in `<pkg>/lib.py` or
  `<pkg>/utils.py`; dataclasses for shared shapes; no duplicate
  request-validator definitions.
- **Java / Kotlin / C#**: shared services in `*Service` /
  `*Repository` classes; DTOs in `dto/`; no duplicate mapper
  logic.
- **Ruby**: shared concerns in `app/models/concerns/`; shared
  service objects in `app/services/`; no duplicate validators.
- **Rust**: shared types in `lib.rs` / `mod.rs`; traits for
  reusable behaviour; no duplicate error enums.
- **SQL**: views / functions / stored procedures for shared
  query logic; no duplicate aggregation expressions.
- **Terraform / HCL**: modules for reusable infra; no duplicate
  resource blocks.

### 9. Verification

Every PR's reviewer checklist MUST include:

- [ ] Did this PR add a new component / function / class that
      duplicates an existing one? → reject; route through the
      existing primitive.
- [ ] Did this PR fork an existing primitive? → reject; extend
      with a prop / parameter.
- [ ] Did this PR set the same option value at every call site?
      → ask whether the default should move to the primitive.
- [ ] Did this PR introduce a textarea / modal / toast / dropdown
      / button / icon / chart WITHOUT routing through the shared
      primitive? → reject.

The `refactor-cleaner` agent surfaces duplicate-symbol findings;
the `code-reviewer` agent surfaces the forks.

### 10. Project rules carry the inventory

Per `rule-authoring-global-vs-project.md`, the GLOBAL rule (this
file) states the principle; PROJECT rules under `<project>/.claude/
rules/reusable-components.md` list the canonical primitives that
exist in that project (the "DescriptionEditor", the "apiClient",
the "validators"). Workspace files own the inventory; global owns
the principle.

## When to defer extraction

A single occurrence does NOT need extraction. Premature
abstraction is itself a defect (per `coding-style.md`: "Three
similar lines is better than a premature abstraction"). The rule
fires on the SECOND occurrence, not the first.

If the second occurrence is in a different context (different
domain, different scaling profile, different dependency surface),
the right shape may be TWO purpose-specific primitives rather
than one shared one. Surface this trade-off to the user when
ambiguous.

## Cross-references

- `patterns.md` — broader pattern catalog (repository, response
  envelope) where reuse-first applies
- `coding-style.md` — "no premature abstraction" caveat that
  bounds this rule (rule fires on 2nd occurrence, not 1st)
- `proper-fixes-first.md` — forking a primitive instead of
  extending it is a shortcut, not a proper fix
- `no-silent-drops.md` — removing a duplicate primitive without
  migrating its call sites is a silent drop of behaviour
- `rule-authoring-global-vs-project.md` — global rule states
  principle, project rules carry the specific inventory
- `refactor-cleaner` agent — finds duplicates; runs on every
  cleanup task
- `code-reviewer` agent — rejects PRs that introduce duplicates
  or forks

## Why this rule exists

Without an explicit reuse-first rule, codebases accumulate
parallel implementations of the same conceptual unit. The cost
grows quadratically: every parallel implementation can drift,
every drift can mask a defect, and every defect can require
fixing in N places. Catching the duplication at the second
occurrence keeps the cost linear.

User directive (verbatim): **"update relevant rules and skills
and agent to always build with reusable components or functions
or objects."**

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Parallel implementation of an existing primitive shipping (sweep step skipped — rule violation pattern)
- Same primitive appearing in 2+ projects (rule-of-three trigger — promote to global shared package)
- Fork of a shared primitive instead of extend-with-prop (rule violation — log + reinforce)
- Default value set at every call site instead of moved to primitive (defaults-at-primitive rule weakening)
- Shared primitive without index entry / README (discoverability gap — even reusable code isn't reusable if unfindable)
- Reach for npm dep before exhausting in-project radii (radius escalation discipline weak)
- "Cleanup PR" deletes a primitive without migrating call sites (silent-drop class — surface to `no-silent-drops.md`)

**Refinement candidates**:

- New canonical-radius row when a new shared layer emerges (workspace package, monorepo internal lib)
- New anti-pattern entry when a duplication shortcut recurs across 2+ PRs
- Tightening of the rule-of-three trigger when duplicates accumulate before extraction
- New pairing entry when `refactor-cleaner` / `code-reviewer` consistently catches what this rule should have flagged earlier

---

<!-- ============================================================
     Section: proper-fixes-first.md (from rules/common/)
     ============================================================ -->

# Proper-Fixes-First Rule (Strict, Always-On, Global)

> Auto-fires on every file. Sister to `done-criteria.md`,
> `no-overclaim.md`, `no-silent-failures.md`, `official-docs-first.md`,
> and `deploy-failures-become-checks.md`. This is one of the strictest
> rules in the global set: the user has named it explicitly with
> "nothing simple please" and "clean, extensive and proper fixes
> always". Every shortcut taken is a rule violation, even when the
> user is waiting for output.

## Core Principle

**Every fix must address the root cause. Never apply a shortcut that
hides the symptom while the cause remains.**

Workarounds are appropriate ONLY when (1) the root cause has already
been identified, AND (2) the workaround is the documented-temporary
bridge to the proper fix, AND (3) a follow-up to land the proper
fix exists and is named in the verification block. Anything else is
a rule violation.

## Banned shortcut patterns (each is a HARD violation)

### 1. Killing a healthy service to free resources

```text
# BANNED
docker stop <noisy-container>   # "to free CPU for <service-under-pressure>"

# REQUIRED
# 1. Diagnose: which container is event-loop-blocking which?
# 2. Fix: add `cpus: "1.0"` and `mem_limit: "1g"` to the noisy
#    neighbour, OR raise Docker Desktop allocation, OR move the
#    noisy workload off the dev box entirely.
# 3. Document the limit choice + the math (peak heap × workers).
```

If a service is genuinely abandoned, `docker compose down <svc>` +
remove from compose, not `docker stop`. A `stop` leaves the service
state inconsistent and the next compose up brings it back.

### 2. Loosening a healthcheck to mask a slow code path

```yaml
# BANNED — hides event-loop blocks
healthcheck:
  interval: 30s    # was 15s
  timeout: 25s     # was 5s
  retries: 12      # was 8
  start_period: 120s   # was 60s
```

A healthcheck represents "service can do useful work in N seconds".
Bumping the timeout doesn't fix the work being slow — it teaches the
orchestrator to wait longer for slow work. The root-cause questions
are:

- What's the p99 event-loop block?
- What's the underlying I/O pattern (Docker Desktop fsync? noisy
  neighbour? connection-pool exhaustion?)?
- Can the work be offloaded to a worker / background queue / cron?

Healthcheck tuning is appropriate ONLY after the underlying cause is
documented and the tuning is a measured trade-off, not a panic
response.

### 3. Editing config without reading the canonical docs first

```ruby
# BANNED — guessed at the env-var name, hit "Access denied" at runtime
APP_PREFIX_MAIN_DB_HOST: db-host         # wrong: prefix shouldn't be there
APP_PREFIX_MAIN_DB_PASSWORD: ${DB_PASS}

# REQUIRED — read the source / docs FIRST
# The framework's config loader documents which env-var prefix it
# strips. Use the canonical name the loader expects, not a guess.
MAIN_DB_HOST: db-host
MAIN_DB_PASSWORD: ${DB_PASS:?}
```

Per `official-docs-first.md`, primary-source citations come BEFORE
the first edit. Three failed attempts is not iteration — it's three
violations of the same rule.

### 4. Storing secret values without validating expected format

```bash
# BANNED — vault stored a bare hex token; consumer expects a
# `<scope>:<environment>.<secret>` shape and crashes at startup
SERVICE_TOKEN=<bare-hex>              # missing `<scope>:<env>.` prefix

# REQUIRED — validate at push time
vault set "SERVICE_TOKEN=<scope>:<env>.${hex}" ...
```

Every secret stored in a vault has an expected format. The
push-step MUST run a format-validation function before the secret
lands. Repos must carry a `secrets-format.json` (or equivalent)
that declares the regex for every key.

### 5. Rotating a credential non-atomically

```text
# BANNED sequence:
# 1. Generated new DB password in memory
# 2. Pushed to vault
# 3. ALTER USER inside running DB
# 4. Attempted to recreate all consumers via runner →
#    Vault's own connection to the DB broke (it cached the OLD
#    password in its in-memory pool) → cascading recovery loop

# REQUIRED sequence:
# 1. Pre-flight: list every container with the old credential
# 2. Push new value to the vault
# 3. SHORT-CIRCUIT: write new value to a `.env.rotate` file
# 4. ALTER USER inside DB
# 5. Recreate the vault container FIRST so it has new creds for
#    the runner
# 6. Wait for vault health
# 7. Recreate every consumer via runner
# 8. Verify each consumer connected with new creds
# 9. Scrub `.env.rotate`
```

Rotation must be a single atomic operation script. The script lives
at `scripts/rotate-secret.sh <KEY>` in every project.

### 6. Suppressing a startup error by removing the offending feature

```yaml
# BANNED
# Service crashed on a malformed config value → "just remove that
# feature from the config so the service starts"

# REQUIRED
# 1. Read why the value is malformed
# 2. Fix the value at source (vault / config file)
# 3. Keep the feature so onboarding / downstream paths still work
```

"Remove the offending feature" is the same shape as "swallow the
error". Don't do either.

### 7. Half-completing a migration and walking away

```text
# BANNED: "service-a is up, service-b is failing — I'll come back
# to it". Walking away leaves the deployment broken-by-design.

# REQUIRED: a migration finishes or doesn't ship. If it can't
# finish in this session, every consumer of the half-state is
# documented + the partial deployment is reverted, not left running.
```

## The proper-fix audit (mandatory before reporting completion)

Every "done" claim must be paired with a self-audit answering ALL
of the following. The audit goes in the verification block — see
`done-criteria.md` and `no-overclaim.md`.

```text
Proper-fix audit (this turn):
  [ ] Every observed failure has a documented root cause.
  [ ] No service was killed to free resources for another.
  [ ] No healthcheck was loosened to hide slow code paths.
  [ ] Every external-provider integration cites primary-source docs.
  [ ] Every secret value was format-validated before push.
  [ ] Every credential rotation was an atomic script.
  [ ] No migration was left in a half-state.
  [ ] No "we'll fix it next session" / "TODO: do this properly"
      markers were introduced.
  [ ] Code-graph integrity green this turn (per
      `code-graph-validation.md`): every dangling reference
      uncovered was resolved (wired, defined, or removed with
      user confirmation); no `BUG(unwired-<slug>)` markers left
      behind without explicit user awareness.
```

A `[ ]` in any row blocks the "done" claim. Resolve each row by
either landing the proper fix THIS turn or reverting the
half-finished change.

## The "I'm being rushed" failure mode

When the user is actively waiting (password reset stuck, page won't
load, etc.), the temptation is to ship the fastest possible patch.
That's the worst time to skip the audit. The user named this
explicitly: "nothing simple please".

In time-pressure situations:

1. Acknowledge the time pressure verbally ("doing the proper fix,
   ETA ~5min" rather than silent fast-patching).
2. Run the audit IN PARALLEL with the fix, not after.
3. If the proper fix genuinely can't ship within the user's
   patience window, ship the workaround AND open a tracked
   follow-up in the same turn (NEVER "I'll do this later").

The follow-up is a code change in the same PR, not a verbal
promise. A verbal promise costs zero accountability and rots
silently.

## Cross-references

- `done-criteria.md` — every "done" runs the proper-fix audit.
- `no-overclaim.md` — never claim "done" without the audit.
- `no-silent-failures.md` — workarounds that hide errors are
  silent failures.
- `no-silent-drops.md` — half-finished work that's marked "done"
  is a silent drop.
- `code-graph-validation.md` — a code-graph gap discovered
  mid-task gets a root-cause fix (wire it, define it, or
  delete it with user confirmation), never a `// TODO: wire
  later` marker.
- `official-docs-first.md` — primary-source citations BEFORE
  edits, not after failures.
- `deploy-failures-become-checks.md` — every failure mode
  observed becomes a mechanical pre-deploy check.

## Why this rule exists

Recurring incident classes that all share the same root pattern
("ship the symptom-fix, leave the cause"):

1. **Resource starvation under load** — a noisy container is
   killed instead of CPU/memory-limited, so the next time it boots
   it starves a different neighbour.
2. **Healthcheck drift** — bumped from 15s/5s to 30s/25s "because
   it kept failing", hiding the actual event-loop block.
3. **Config-by-guesswork** — env-var names guessed from the
   library README instead of the loader's source, producing
   repeated runtime failures of the same shape.
4. **Format-blind secret pushes** — bare hex tokens stored in a
   vault when the consumer requires a prefixed shape, surfacing
   only as a startup stack trace.
5. **Non-atomic credential rotation** — DB password rotated
   step-by-step instead of via a single atomic script, breaking
   the vault's own DB connection mid-flight.
6. **"Just remove the offending feature"** — silencing a startup
   error by dropping the config block that triggered it, instead
   of fixing the value the feature required.
7. **Half-finished migrations** — one of two paired services up,
   the other broken-by-design, with a verbal promise to "come
   back to it".

In every case the workaround cost MORE total time than the proper
fix would have: the workaround needed a follow-up, the follow-up
revealed a related issue, the related issue surfaced when the
team was rotating personnel, and so on. The proper-fix path is
cheaper in absolute hours even when it feels slower in the
moment.

User directive (verbatim): **"clean, extensive and proper fixes
always"** / **"nothing simple please"**.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Container `docker stop`-ed to "free resources" rather than CPU/memory-limited (banned pattern 1 recurrence)
- Healthcheck `timeout` / `retries` / `start_period` bumped without naming an underlying slow code path (banned pattern 2 recurrence)
- Config env-var name guessed from a README instead of canonical loader source (banned pattern 3 — `official-docs-first.md` weakening)
- Secret pushed to vault without format-validation against the consumer's expected shape (banned pattern 4 recurrence)
- Credential rotation done step-by-step rather than via an atomic script (banned pattern 5 recurrence)
- Startup error silenced by removing the offending config / feature instead of fixing the value (banned pattern 6 recurrence)
- Migration half-completed and left running; consumer of half-state undocumented (banned pattern 7 recurrence)
- Proper-fix audit rows ticked without verification this turn (audit weakening)
- "I'll come back to it next session" markers introduced (any TODO-shape silent defer)
- Time-pressure context used as justification to skip the audit (rule 8 "I'm being rushed" failure mode)

**Refinement candidates**:

- New row in the banned-pattern list when a new shortcut class recurs (e.g., `kubectl delete pod` to recover, `restart-loop` to mask leak, dependency downgrade to escape a bug)
- Tightening of the proper-fix audit when a row consistently gets ticked without real verification
- New cross-reference when a sister rule (no-silent-failures, no-overclaim, deploy-failures-become-checks) provides the underlying gate the shortcut bypassed
- New "atomic rotation" template when a new credential class (signing key, OAuth client, vault token) recurs

---

<!-- ============================================================
     Section: no-silent-drops.md (from rules/common/)
     ============================================================ -->

# No-Silent-Drops Rule (Always-On, Global)

> Auto-fires on every file. Companion to `done-criteria.md` (service-migration checklist) and `sonarlint-checks.md` (linter rules).

## Core Principle

**Never remove. Always fully implement across every layer.**

If the codebase says "this is missing", "this is broken", or "this needs to happen later", you do not get to make that statement go away by deleting the marker. Either implement the underlying work to 100% — backend, frontend, AND infrastructure — or leave the marker in place. Both silent deletion and silent skip are prohibited.

When restoring or building a feature, verify all three layers are wired before declaring done:

1. **Backend** — controller method, interface entry, mock, route, handler, tests.
2. **Frontend** — API client function, component consumer, navigation/wiring to a user-visible surface.
3. **Infrastructure** — swagger/OpenAPI spec, environment variable docs, deployment config (serverless.yml, Helm, Terraform, .env.example), and observability (log keys, metrics names).

A "fix" that touches only one layer leaves the other two as silent gaps.

## Specific Rules

### 0. Commented-out code is the same as a TODO — implement it, don't leave it

When you encounter commented-out code (`// const x = …`, `{/* <Component … /> */}`, etc.), it represents a feature that was started, disabled, or stubbed. The rule is identical to TODO/FIXME handling:

- **Implement it fully** across BE + FE + infra so the commented block becomes live code, OR
- **Leave it commented and surface it to the user** with the question "is this still wanted?"

You do not get to silently delete a commented block. If the commented block is a verbatim duplicate of live code (e.g. a typo'd older version that was replaced), call that out explicitly when removing the comment so the user can confirm — do not delete silently.

When implementing a commented block:

- If the comment hides UI (a `<div>`, a `<FormControlLabel>`, a route): uncomment it and verify it renders correctly given current state.
- If the comment hides validation: uncomment it AND check the surrounding state defaults so the validation actually fires.
- If the comment hides a state hook: uncomment it AND wire the state to a visible UI signal (style, label, behaviour).

This rule is the FIRST rule, ahead of TODO handling, because commented-out code is by far the most common form of silently-buried work in the wild.

### 1. Removing a TODO/FIXME/XXX requires 100% implementation

A `// TODO: …` comment is a breadcrumb pointing at missing work. Deleting the comment does not complete the work — it silently buries it.

**When you encounter a TODO/FIXME/XXX in a file you are editing:**

- If you can implement the underlying work in this session (and the user authorized it): **do so**, then remove the marker.
- If you cannot (out of scope, requires user direction, requires external coordination): **leave the marker in place** and surface it to the user as a tracked deliverable.
- Never delete the marker as a way to satisfy a "no TODO comments" rule. Both deletions and silent skips are prohibited.

This rule overrides any linter directive (e.g., SonarLint S1135) that might suggest removal without specifying the underlying-work path.

### 2. Removing an "unused" symbol requires verifying it isn't a wiring gap

Linter diagnostics for unused imports, unused variables, and unused exports may indicate either:

- **Genuinely dead code** (safe to remove), OR
- **A missing wiring** — a route that was never registered, a feature that was never linked to navigation, a callback that was never bound.

**Before removing a flagged unused symbol:**

- Search the entire repo for any reference to the symbol's source file (e.g., for an "unused" component import, check whether the component file is referenced anywhere).
- If the source file exists and contains real implementation, the import being unused is a **wiring gap**, not dead code. Wire it up properly (add the missing route, add the navigation entry, etc.) — do not delete.
- Only when the source file is itself unused (or the symbol is verifiably never referenced in any product flow) is removal correct.

This rule applies in particular to React Routes, Vue components, route handlers, webhook bindings, scheduled jobs, and any registration-based wiring.

### 3. No meta-comments referencing linter rules, refactor phases, or process tracking

Source-code comments must explain the *purpose* of the code or the *business invariant* it preserves. They must NOT reference:

- Linter rule IDs (e.g., `S1192`, `S3776`, `// satisfies S1192`, `// per Sonar`)
- Sonar / SonarLint / SonarQube by name
- Refactor phase markers (e.g., `// Phase 1`, `// extracted in Phase 2`)
- Process metadata (e.g., `// see plan B2`, `// per the engineering brief`, `// see the plan`)
- TODO/FIXME/XXX placeholders (covered by Rule 1 above)

Process metadata belongs in plans (`~/.claude/plans/`) and PR descriptions, not in source files. The hook lib at `~/.claude/scripts/hooks/lib/no-discards-rules.js` already enforces this on save (rule id `task-pointer`); this entry codifies the intent.

When editing a file, scan it for pre-existing meta-comments and remove them as part of the edit. Replace them with plain descriptive comments that explain *what* the symbol is for, not *why a refactor introduced it*.

### 4. No suppression of warnings

Never use `// nolint`, `// eslint-disable`, `// @ts-ignore`, `// @ts-expect-error`, `# noqa`, `# type: ignore`, `# pragma: no cover`, `# rubocop:disable`, or any other linter-silencing directive.

If a linter rule is wrong for the project, change the project's lint config. If the code is wrong, fix the code. Per-line suppression is prohibited.

### 5. No silent test deletion

If you remove code that was covered by a test, write equivalent coverage for the replacement code before merging. Deleting both the code and the test is permitted only when the feature itself is being removed and the user has confirmed the removal.

### 6. "Don't delete, fully implement" — applies to the work, not just comments

The principle generalises: when a feature is partially wired, half-built, or behind a stub, the right move is to complete it (with user authorization) — not to delete the partial work. Delete only when:

- The user has explicitly authorized deletion of the feature, OR
- You have verified the partial work is truly unused and will not be needed (using Rule 2's verification step).

### 7. Audit recent deletions — restore if they represented functionality

When the user asks for a refactor pass or sweep, take the opportunity to scan the project's git history for recent file deletions and verify each was intentional. Run:

```bash
git log --diff-filter=D --name-only --pretty=format:"--- %h %s ---" --since="6 months ago"
```

For every deleted file:

- If the deletion was an **intentional architectural change** (consolidation, migration to a different shape, vendor swap), confirm the replacement is wired and document the migration so the deletion has a forwarding pointer.
- If the deletion **silently dropped a feature** (no replacement, no user sign-off), restore it and wire it up across BE + FE + infra per the Core Principle.
- If unsure, **ask the user** before either restoring or accepting the deletion.

The audit is part of every "C — everything" / "fix all the things" task. Do not declare a sweep done if the audit hasn't run.

### 8. Three-layer verification on restoration

Whenever you restore a deleted feature OR catch one mid-deletion (e.g. an "unused" import that was actually a wiring gap), the implementation is not done until all three layers are touched:

| Layer | Minimum evidence of wiring |
|-------|---------------------------|
| Backend | Method on the public interface, mock updated to match, HTTP route registered, handler implemented, godoc comment for swagger generation |
| Frontend | API client function exported, component consumer renders the data on at least one route, no dead-only-import |
| Infrastructure | Swagger spec includes the new path, env vars documented in `.env.example` (if any), deploy config exposes the route (if any), log/metric names reserved (if any) |

If a layer doesn't apply to the specific change (e.g. a pure-internal helper has no FE), state that explicitly — never silently skip.

## Why this rule exists

Tasks like "fix the lint warnings" can degrade into "make the warnings go away" — which silently buries real work the codebase was tracking. The user's directive is to be honest about completion: if the work isn't done, the breadcrumb stays; if the breadcrumb is gone, the work is done.

This rule was elevated to global status after a session where:

- An "unused" `AppealHome` import was almost deleted (it was actually a missing route registration; the page existed and was a key feature surface).
- A `// Todo: delete cookie on logout` comment was deleted without implementing logout (silently buried a real auth gap).
- `// TODO` placeholders for unsupported gorm dialects were deleted without confirming the dialects would never be used (correct removal, but only after verification).

The cost of pausing to verify is low; the cost of silently dropping product work is high.

## Reference

- `done-criteria.md` — the service-migration "done" checklist that complements this principle for large refactors.
- `code-graph-validation.md` — graph gaps (dangling-inbound "unused"
  imports, commented-out half-implementations, defined-but-unused
  exports) are NOT silent-drop cleanup fodder. The incremental
  code-graph check runs BEFORE any delete decision; verify before
  removing; ask the user when a graph edge's intent is ambiguous;
  every uncovered gap is wired, defined, or removed with explicit
  confirmation — never silently. `BUG(unwired-<slug>)` markers are
  the documented-deferral form per Rule 0 above.
- `sonarlint-checks.md` — linter-level rules. S1135 (TODO) and S125 (commented-out code) interact directly with Rule 1 above.
- `~/.claude/scripts/hooks/lib/no-discards-rules.js` — the PostToolUse hook that auto-blocks meta-comments, suppression directives, and TODO/FIXME placeholders before they reach disk.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Commented-out code deleted without user confirmation (Rule 0 violation pattern)
- TODO / FIXME / XXX marker removed without implementing the underlying work (Rule 1 violation)
- "Unused" import deleted that was actually a wiring gap (Rule 2 enforcement weak)
- Three-layer (BE + FE + infra) restoration shipping with only one layer touched (Rule 8 weakening)
- Recent deletion audit skipped on a "fix everything" sweep (Rule 7 weakening)
- Suppression directive added to silence a warning rather than fix the underlying code (Rule 4 violation)
- Same "we'll do this later" pattern recurring across PRs (taxonomy needs new banned shape)

**Refinement candidates**:

- New entry in the "Specific Rules" list when a new silent-drop shape recurs across 2+ incidents
- Tightening of the three-layer-restoration evidence requirements when a layer is consistently missed
- New cross-reference when a sister rule (no-discards, no-overclaim) covers a pattern previously thought unique to this rule
- New hook integration when the PostToolUse rule could mechanically catch what currently requires manual review

---

<!-- ============================================================
     Section: no-silent-failures.md (from rules/common/)
     ============================================================ -->

# No-Silent-Failures Rule (Always-On, Global)

> Auto-fires on every file. Sister to `no-discards.md` (the
> hook-enforced canonical), `error-handling-with-context.md`
> (every error wraps with operation + ids), `no-silent-drops.md`
> (don't bury work), `verify-before-claim.md` (no claim of
> success without proof).
>
> **De-duplication note**: the discard / empty-catch / silent
> `.catch` / `console.log` / `as`-cast bans live in `no-discards.md`
> (hook-enforced). This rule focuses on the UNIQUE patterns that
> sister rules don't cover: false-positive success reporting,
> async state-transition completeness, optimistic-rollback, and
> partial-success surfacing in webhook / queue handlers.

## Core Principle

**Every error is a status. Every status the user is waiting on
must visibly resolve. Operations whose user-visible outcome
doesn't match what actually happened are false-positive
successes — bugs in slow motion. The user can't act on what
they can't see; on-call can't debug what wasn't surfaced.**

## Unique rules (not covered by sister rules)

### 1. No false-positive success

The user-visible outcome must reflect what actually happened —
across cascading operations, batch operations, optional
sub-steps, retries, and partial-success boundaries.

```ts
// WRONG — success toast fires even when the optional sub-step
// (clipboard write) failed
await store.share(id);
await navigator.clipboard.writeText(url).catch(() => null);
toast.success("Share link copied");

// RIGHT — separate the outcomes
await store.share(id);
let copied = true;
try { await navigator.clipboard.writeText(url); }
catch { copied = false; }
if (copied) toast.success("Share link copied", { description: url });
else toast.info("Share link ready (clipboard blocked)", { description: url });
```

Applies to:

- **Cascading deletes / batch operations**: if some children
  failed, the response says so ("deleted 7 of 10").
- **Partial sync results**: "synced N of M items" not "Sync
  complete."
- **Idempotent retries**: "already done" distinct from "did it
  now."
- **Optional sub-steps**: if the optional step failed, the
  toast names that explicitly.
- **Multi-tenant fan-out**: per-tenant success vs failure
  reported.

### 2. Every async op has a known status

When the user is actively waiting on an async operation, the
UI MUST visibly transition through:

- **idle → pending** (button disabled, spinner, optimistic
  state)
- **pending → success** (toast / state update / navigation)
- **pending → error** (toast.error + actionable copy + rollback
  of any optimistic state)

The transition fires on EVERY code path:

- Thrown exceptions
- Network timeouts
- AbortController cancellations
- Browser tab-close / navigation away
- Server-sent retry-after responses

The state machine has NO terminal "unknown" — every leaf is
success or error, never "pending forever."

### 3. Optimistic updates roll back on failure

When the client updates state BEFORE the server confirms, the
update reverses if the server returns an error:

```ts
// WRONG — leaves the UI showing read=true when the API call
// failed
notification.read_at = new Date().toISOString();
unreadCount--;
await apiPost("/notifications/mark-read", ...).catch(() => {});

// RIGHT — snapshot, update, rollback on failure
const snapshot = { read_at: notification.read_at, unreadCount };
notification.read_at = new Date().toISOString();
unreadCount--;
try {
  await apiPost("/notifications/mark-read", { id });
} catch (err) {
  notification.read_at = snapshot.read_at;
  unreadCount = snapshot.unreadCount;
  log.warn("mark-read failed; rolled back", { error: String(err) });
  toast.error("Couldn't mark as read — try again");
}
```

Pattern by pattern:

- **List add**: rollback removes the optimistic item; toast
  the failure.
- **List remove**: rollback re-inserts at the original index;
  toast.
- **Counter increment / decrement**: rollback restores the
  prior count.
- **Form-field update**: rollback restores the prior value;
  re-focuses the field.
- **Status transition** (draft → published): rollback restores
  draft.

### 4. Webhook / queue handlers report partial success

A webhook handler that processes 10 events where 3 fail MUST:

1. **Acknowledge** the original webhook (200 to the platform)
   so the platform doesn't retry the whole batch.
2. **DLQ-route** the 3 failures with full context (event id,
   payload, failure reason, retry-count).
3. **Emit a metric** for the partial-failure count
   (`webhook_event_partial_failures{provider="stripe",
   reason="..."}`).
4. **Log** each failure individually with structured fields
   (per `error-handling-with-context.md`).

A 200 OK from a handler that silently dropped 3 of 10 is a
false-positive success — the platform thinks delivery
succeeded; downstream consumers never see the 3 events.

### 5. Confirmation-required mutations cannot fail silently

When a mutation requires explicit user confirmation
(delete account, transfer funds, publish post), the
confirmation flow ensures:

- **Pre-flight check**: server validates the user is in the
  expected state BEFORE asking confirmation.
- **Confirmation token**: server issues a short-lived token
  the client passes back; prevents replay.
- **Post-mutation verification**: server-side check that the
  mutation actually applied; client re-reads to confirm.

A confirmation that "succeeded" but didn't actually mutate
the state is a false-positive success.

### 6. Polling loops report timeout as failure, not "no data"

When a polling loop waits for an external state to converge
(e.g., webhook to arrive, job to finish):

- **Bounded retry** — every polling loop has a max attempt
  count + a timeout.
- **Timeout** is a distinct status from "still pending."
- **Timeout escalates** — the user sees an explicit timeout
  message + the suggested recovery (refresh, retry, contact
  support); not a perpetual spinner.

### 7. Every throw surfaces a user-visible signal (sync + async)

The strongest form of the rule, generalising rule 2 from
async-only to ANY code path the user is waiting on:

**Every `throw`, every `reject(err)`, every `raise`, every
async failure that reaches a code path the user is waiting on
MUST emit a user-visible surface in the same code path that
handles it.** Throwing into a generic error boundary,
`window.onerror`, or framework-level catch-all is the LAST
resort, never the first.

Acceptable user-visible surfaces (pick one that matches the
context):

| Surface | When |
| --- | --- |
| `toast.error` / `toast.warning` / `toast.info` | Transient feedback after an explicit action (submit / save / send) |
| Inline validation error anchored to the offending field | Form input that failed validation; ARIA-wired (`aria-describedby`, `aria-invalid`); focus moves to first invalid field |
| Banner at top of route / section | Cross-cutting failure (network down, auth expired, plan-tier gate, geo-blocked) |
| Empty / error state swap | List / grid / panel where the failure obviates the content |
| Status indicator transitioning to "error" | Long-running operations (upload, transcode, polling); paired with actionable copy + retry affordance |
| Modal / dialog | Destructive or confirmation-bound failure that the user MUST acknowledge before continuing |

Banned shapes (each is a rule violation, even when the error
is logged correctly):

- Silent catch + early return — no UX surface ever fires
- Returning `null` / `undefined` / `false` / empty-result to
  the caller without the caller surfacing the failure
- `console.error` / `log.warn` as the ONLY signal — those are
  developer signals, not user signals
- Generic ErrorBoundary catch-all WITHOUT a per-action UX
  before the boundary fires
- A spinner that never resolves
- A success toast fired before the failure-path branch runs
  (per rule 1 false-positive success ban)
- A "Something went wrong" generic message when the server
  returned a real `error_code` + `message` (per
  `error-codes.md` — codes map to specific UX copy + i18n key)
- A `throw` inside a Promise chain WITHOUT a downstream
  `.catch` that routes to UX
- A `raise` inside a Rails controller / FastAPI handler /
  Spring controller WITHOUT a centralised exception handler
  that maps to a typed response envelope the client renders
- Returning a 4xx / 5xx with body `null` or `""` — the body
  MUST carry the typed envelope per
  `error-handling-with-context.md` rule 4

**Sync paths count too.** A form-submit handler's `throw new
ValidationError(...)` MUST be caught and surfaced inline; a
service-object's `raise InsufficientFunds` MUST flow up to the
controller / view where it becomes a banner or toast. The
throw itself is fine — the unsurfaced throw is not.

**Mobile + Swift + Dart apply the same rule**: snackbar /
alert / inline error + log + rollback. The platform's idioms
differ; the contract is identical.

**Server-side handlers count too.** A handler that throws
without a centralised exception-mapping middleware turns into
a generic 500 with no `error_code`; the client renders
"Something went wrong"; the user is stuck. Per
`error-handling-with-context.md` rule 4, the server's response
envelope is the bridge between thrown error and rendered UX —
both ends MUST be wired.

**Why this rule exists** (in addition to rule 1's
"false-positive success" framing): the most-damaging incident
class is "the user thought it succeeded; the system thinks it
failed." Logs reveal the truth weeks later — usually via
support tickets, sometimes via legal complaints in regulated
contexts (failed payment, failed signup, failed consent
capture, failed deletion). The cost of pairing every throw
with a UX surface is one toast / one `aria-describedby` per
handler. The cost of NOT pairing is silent data loss the user
can't act on.

User directive (verbatim, 2026-06-01): **"Throwing errors
without surfacing a user facing toast or validation error. Is
not acceptable."**

## Cross-references for ancillary discard / silence patterns

These patterns are NOT in this rule (to avoid duplication).
See:

| Pattern | Canonical rule |
| --- | --- |
| `_` discards (`_, err :=`, `let _ = ...`) | `no-discards.md` (hook-enforced) |
| Empty `catch` / `catch (_)` | `no-discards.md` rule 4 + `error-handling-with-context.md` rule 1 |
| Silent fire-and-forget `.catch(() => null)` etc. | `no-discards.md` rule 5 |
| Raw `console.*` in product source | `no-discards.md` rule 12 (hook-enforced) |
| `as` casts hiding parse failures | `no-discards.md` rule 26 (S6571) |
| Empty function body | `no-discards.md` rule 38 (S108) |
| Useless rethrow | `no-discards.md` rule 39 (S2737) |
| Wrapping errors with context (`%w`, `from err`, `cause`) | `error-handling-with-context.md` rules 1-7 |
| Structured logging fields | `error-handling-with-context.md` rule 2 |
| Lint enforcement (eslint, gosec, bandit, etc.) | `extreme-lint-policy.md` |
| Commented-out code / TODO removal | `no-silent-drops.md` |

## Why this rule exists

A handful of recurring bugs in production traced back to the
same shape: an exception was caught, no one logged it, the
user saw a success state, and the broken state only surfaced
hours later when a downstream consumer noticed. Sister rules
(`no-discards.md`, `error-handling-with-context.md`) cover the
mechanical patterns. This rule covers the SEMANTIC shape: the
user's experience matches what actually happened, end-to-end,
across cascades + batches + optional sub-steps + retries +
async state machines.

The cost of one extra logged warning + one accurate toast is
zero; the cost of an undebuggable false-positive success is
hours of incident response.

User directive (verbatim): **"Always verify before claims"** /
**"no half-finishes"** — this rule enforces those at the
user-experience layer.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- False-positive success toast where the optional sub-step actually failed (rule 1 violation pattern)
- Async op left in "pending forever" terminal state (rule 2 violation)
- Optimistic UI update without rollback on failure (rule 3 weakening)
- Webhook handler returning 200 OK while DLQ-routing failures silently (rule 4 weakening)
- Polling loop with no timeout escalation surfacing as "stuck spinner" UX (rule 6)
- Confirmation flow mutation that didn't actually apply but reported success (rule 5)
- Same partial-success pattern recurring across handlers (taxonomy needs new code class)
- `throw` / `reject` / `raise` shipped in a user-facing path without an accompanying toast / inline validation / banner / state transition (rule 7 violation — the strongest form)
- Generic ErrorBoundary catch-all relied on as the FIRST UX surface instead of per-action UX (rule 7 weakening)
- Server returns a typed `error_code` + `message` but the client renders generic "Something went wrong" (rule 7 banned-shape — the `useApiError` composable / hook isn't mapping the code)
- Sync handler `throw new ValidationError(...)` not caught + surfaced inline on a form (rule 7 sync-path violation)
- Server controller `throw` without centralised exception-mapping middleware turning into a generic 500 (rule 7 server-side weakening)

**Refinement candidates**:

- New rule when a new false-positive success shape appears in 2+ incidents
- New cross-reference when a sister rule (no-discards, error-handling-with-context) covers a pattern previously thought unique to this rule
- Tightening of the "every async op has a known status" rule when a new state-machine gap is observed
- New entry in the optimistic-rollback pattern table when a new domain case surfaces

---

<!-- ============================================================
     Section: no-discards.md (from rules/common/)
     ============================================================ -->

# No-Discards Rule (Strict, Always-On, Global)

> Auto-fires on every file. Sister to `no-silent-failures.md` (don't swallow errors), `no-silent-drops.md` (don't bury work), and `sonarlint-checks.md` (linter rule reference). This rule is **hook-enforced** by `~/.claude/scripts/hooks/lib/no-discards-rules.js` — edits that introduce a discard pattern are rejected with exit status 2.

## Core principle

**Every value must be bound, every error must be wrapped with context, and every failure must produce an actionable message on both the server side (logs, traces, metrics) AND the client side (toast, banner, status, retry affordance).**

A discard is any place where a meaningful value position is filled with `_` (Go), `,` with omission (JS destructuring), `void` casts, or other ignore-this-value patterns. Discards bury information that the caller either needed but threw away, or didn't need but couldn't be bothered to think about. Both are bugs in slow motion.

A *silent failure* is worse: an error is caught, the user sees a "success" state, and the broken state only surfaces hours later when a downstream consumer notices. The cost of one extra logged warning is zero; the cost of an undebuggable failure is hours of incident response.

The rule applies to: production source, tests, scripts, generated code wrappers, anything Claude or any agent writes. Test files have **no exemption** — bind the index, name the subtest, use the position.

## Error-message contract (server + client)

For every failure path the codebase must produce **all three** of:

1. **Server log entry** — structured (slog/zerolog/etc.), includes the operation name, the relevant ids (user_id, event_id, request_id), and the wrapped error chain. Never just `log.Error(err)`. Always include context that helps oncall reproduce the failure without re-reading the source.

2. **API response payload** — when the request originated from a client, the response body must include a stable error `code` (e.g. `ERR_PAY_001`) and a human-readable `message` that the client can render verbatim. The HTTP status must match the semantics (`400` for client error, `409` for conflict, `422` for validation, `500` only for genuine server bugs).

3. **Client surface** — the frontend must turn the error code into a toast/banner/inline message with actionable copy. The message tells the user *what* went wrong and *what to do next* (retry, contact support, fill the missing field). Optimistic UI updates roll back on failure (see `no-silent-failures.md`, rule 6).

A failure that produces only one of these three is a regression even if the code "works" in the happy path.

### Server-side (Go) — wrapping and logging

```go
// BAD — log dump with no actionable info
if err != nil {
    slog.Error("failed", "err", err)
    return err
}

// GOOD — wrapped error chain + structured fields + return wrapped
tag, err := r.db.Exec(ctx, `UPDATE events SET ...`, eventID)
if err != nil {
    slog.Error("event update failed",
        "event_id", eventID,
        "organiser_id", organiserID,
        "error", err)
    return fmt.Errorf("update event %s: %w", eventID, err)
}
if tag.RowsAffected() == 0 {
    return fmt.Errorf("event not found: %s", eventID)
}
```

### Server-side (Go) — HTTP handler response envelope

```go
// Every handler routes errors through a single response helper that
// maps the wrapped error chain to an envelope the client can render.
type errorEnvelope struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Detail  string `json:"detail,omitempty"`
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    body, err := json.Marshal(errorEnvelope{Code: code, Message: msg})
    if err != nil {
        slog.Error("marshal error envelope failed", "code", code, "err", err)
        return
    }
    if _, werr := w.Write(body); werr != nil {
        slog.Warn("error envelope write failed", "code", code, "err", werr)
    }
}

// At the handler:
if errors.Is(err, ErrEventNotFound) {
    writeError(w, http.StatusNotFound, "ERR_EVT_001", "Event not found")
    return
}
if errors.Is(err, ErrInsufficientFunds) {
    writeError(w, http.StatusConflict, "ERR_WAL_002", "Insufficient wallet balance")
    return
}
slog.Error("unexpected handler error", "path", r.URL.Path, "err", err)
writeError(w, http.StatusInternalServerError, "ERR_GEN_003", "Service unavailable, try again shortly")
```

### Client-side (TS/React) — service layer to UI

```ts
// Service layer: parse the envelope, surface a typed error
async function postOffer(listingId: string, amount: number) {
  const res = await api.post(`/marketplace/${listingId}/offers`, { amount });
  if (!res.success) {
    throw new ApiError(res.error?.code ?? "ERR_GEN_003", res.error?.message ?? "Unknown error");
  }
  return res.data;
}

// Component: catch typed error, log via shared logger, surface to user
async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
  e.preventDefault();
  try {
    await postOffer(listingId, amount);
    toast.success("Offer placed");
  } catch (err) {
    const code = err instanceof ApiError ? err.code : "ERR_GEN_003";
    const msg = extractErrorMessage(err, "Couldn't place offer. Try again.");
    log.warn("place offer failed", { listing_id: listingId, code, error: String(err) });
    toast.error(msg);  // shows the message returned by the server
  }
}
```

The client never says "Something went wrong" when the server provided a real message. If no message is available, the fallback string must be actionable ("Couldn't place offer. Try again.") not generic ("Error occurred").

### Mobile-side (Swift / Dart) — same contract

The same three obligations apply. The mobile client surfaces the server message via a snackbar / alert / inline error, logs the failure via the project logger, and rolls back any optimistic UI state. Generic "Network error" banners are forbidden when the server returned a real code.

## Go (mechanically banned)

### Function/method results

```go
// FORBIDDEN
_, err := r.db.Exec(ctx, sql, args...)
n, _ := io.WriteString(w, payload)
_ = file.Close()
defer func() { _ = file.Close() }()

// CORRECT
tag, err := r.db.Exec(ctx, sql, args...)
if err != nil { return fmt.Errorf("exec: %w", err) }
if tag.RowsAffected() == 0 {
    return ErrNotFound // for UPDATE/DELETE-by-PK
}
// or: slog.Debug("exec ok", "table", "...", "rows", tag.RowsAffected())

n, werr := io.WriteString(w, payload)
if werr != nil {
    slog.Warn("write failed", "n", n, "err", werr)
}

defer func() {
    if closeErr := file.Close(); closeErr != nil {
        slog.Warn("file close failed", "path", path, "err", closeErr)
    }
}()
```

### Range loops

```go
// FORBIDDEN — _ in destructured position
for _, v := range slice { ... }
for k, _ := range m { ... }

// CORRECT — slice value-iteration: bind the index, index the slice
for i := range slice {
    v := slice[i]
    // ...
}

// CORRECT — map value-iteration: bind the key, look up the value
for k := range m {
    v := m[k]
    // ...
}

// CORRECT — already single-variable (no discard)
for v := range channel { ... }   // channel — single value
for i := range slice { ... }     // index only
for k := range m { ... }         // map keys only

// EXCEPTION — string rune iteration (only place `_` survives)
// String range over runes yields (byteOffset, rune). If the byte
// offset is irrelevant AND you need runes (not bytes), the only Go
// form that preserves rune semantics is `for _, r := range str`.
// Use this ONLY for rune iteration. For byte iteration use
// `for i := range str { b := str[i] }`.
for _, r := range str { // documented exception: rune iteration
    if r == '/' { ... }
}
```

### Receivers / parameters

```go
// FORBIDDEN
func (_ *Repository) helper() { ... }
func handler(_ http.ResponseWriter, r *http.Request) { ... }

// CORRECT — name everything, even when "unused"
func (r *Repository) helper() { ... }  // receiver named for symmetry
func handler(w http.ResponseWriter, r *http.Request) {
    // w may be unused in this handler; that is fine — the parameter
    // is bound. Interface implementations require named parameters.
}
```

### Type assertions

```go
// FORBIDDEN
v, _ := iface.(*Concrete)

// CORRECT
v, ok := iface.(*Concrete)
if !ok {
    return fmt.Errorf("expected *Concrete, got %T", iface)
}
```

### Test files — NO EXEMPTION

```go
// FORBIDDEN — even in _test.go
for _, tc := range cases {
    t.Run(tc.name, func(t *testing.T) { ... })
}

// CORRECT
for i := range cases {
    tc := cases[i]
    t.Run(tc.name, func(t *testing.T) { ... })
}
```

## TypeScript / JavaScript (mechanically banned)

### Destructuring discards

```ts
// FORBIDDEN — `,` skips a position
const [, second] = pair;
const [first, , third] = triple;
const { unused: _, ...rest } = obj;

// CORRECT
const [first, second] = pair;
const { wanted, ...rest } = obj;
// or use explicit indexing if you only need one slot
const second = pair[1];
```

### Catch with `_`

```ts
// FORBIDDEN — empty catch is a silent failure (also covered by no-silent-failures.md)
try { thing(); } catch { ... }
try { thing(); } catch (_) { ... }

// CORRECT
try {
  thing();
} catch (err) {
  log.warn("thing failed", { error: String(err) });
}
```

### `void` cast for fire-and-forget

```ts
// FORBIDDEN — discards the promise rejection
void store.save();
void someAsync();

// CORRECT
store.save().catch((err) => log.warn("save failed", { error: String(err) }));

// or, in component effects:
useEffect(() => {
  let cancelled = false;
  store.save()
    .catch((err) => {
      if (!cancelled) log.warn("save failed", { error: String(err) });
    });
  return () => { cancelled = true; };
}, []);
```

### Unused parameters

```ts
// FORBIDDEN — silencing via `_` prefix
function handler(_event: SubmitEvent) { ... }

// CORRECT — name the parameter; if truly unused, document why
function handler(event: SubmitEvent) {
  event.preventDefault();
}

// Interface compliance with unused params is acceptable — name them anyway:
function onClick(event: MouseEvent) {
  doThing();
}
```

### Type assertions that mask discards

```ts
// FORBIDDEN — assertion hides that the parse may have failed
return JSON.parse(maybe) as T;
return (input as T).field;

// CORRECT
const parsed = parseJson<T>(maybe);
if (!parsed.ok) {
  log.warn("parse failed", { error: parsed.error });
  return null;
}
return parsed.value;
```

## Cross-language

### Suppression directives — NEVER write these

| Language | Forbidden |
| -------- | --------- |
| TS/JS | `// eslint-disable*`, `// @ts-ignore`, `// @ts-expect-error` |
| Go | `//nolint`, `//nolint:gosec`, `//nolint:errcheck`, etc. |
| Python | `# noqa`, `# type: ignore`, `# pragma: no cover` |
| Ruby | `# rubocop:disable` |
| Java | `@SuppressWarnings` (except where genuinely necessary at framework boundaries) |
| C# | `#pragma warning disable` |

If a linter rule is wrong for the project, change the project's lint config — never suppress per-line. If the code triggers the rule, fix the code.

### Empty catch / silent fail patterns

Covered in `no-silent-failures.md`. Summary:

- No empty `catch` blocks in any language.
- No `.catch(() => {})`, `.catch(() => null)`, `.catch(() => undefined)`, `.catch(() => false)`, `.catch(() => "")`.
- No `try { ... } catch { /* fall back */ }` without logging.
- Every async operation must transition through a visible state (idle → pending → success/error).

### Comments — no tracker pointers

Covered in `no-silent-drops.md`. Comments must NOT contain:

- Sonar rule IDs (`S1192`, `S3776`, etc.)
- Phase markers (`Phase A`, `Phase 1`)
- Plan IDs (`plan B2`, `Initiative I10`)
- Linear / Jira / GitHub issue numbers
- `TODO` / `FIXME` / `XXX` placeholders — implement or open a ticket
- Lint rule codes inline as justification

Comments describe WHY non-obvious code is shaped that way. Tracker references rot.

## SonarLint rule reference (consolidated)

These rules have surfaced in real code. Every one of them MUST be addressed when SonarLint flags them — see `sonarlint-checks.md` for the comprehensive table. The fixes below summarize the canonical patterns.

### Discard-related Sonar codes

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S1172** | Unused function parameter | Name it. Remove only if interface allows. Never `_arg`. |
| **S1481** | Unused local variable | Delete it OR use it. |
| **S1854** | Dead store (assigned then reassigned without read) | Delete the dead assignment. |
| **S6535** | Unused `eslint-disable` directive | Delete the directive. The fact that it's unused means the rule no longer triggers — celebrate, don't paper over. |
| **S125** | Commented-out code | Delete. Git remembers. |
| **S1128** | Unused import | Delete. |

### Silence / hide-information codes

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S2486** | Empty `catch` block | Log via `log.warn`. Empty catch is forbidden. |
| **S108** | Empty function body | Implement or document; an explicit no-op needs a comment. |
| **S2737** | `catch (e) { throw e }` (useless rethrow) | Drop the try/catch OR add real handling. |
| **S1166** | Caught exception used only for `instanceof`, never logged | Always log. |
| **S6571** | `as` cast widens a typed value | Narrow type OR runtime guard. Type assertions are not error handling. |
| **S4325** | Unnecessary `as` assertion | Remove the assertion; TS already narrowed. |
| **S6551** | `String(v)` on an `unknown` that could be an object | Type-narrow before stringifying; handle each `typeof` branch. |
| **S1874** | Deprecated API | Replace with the recommended alternative (e.g., React 19 `FormEvent` → `SubmitEvent`). |
| **S7741** | `typeof x === "undefined"` | `x === undefined`. |
| **S6754** | `useState` setter not named `setX` for value `x` | Either rename setter to convention OR merge the wrapper into an effect. |
| **S6759** | Component props not `Readonly<>` | Wrap `Readonly<...>` around the props type. |
| **S6481** | Context provider `value` changes every render | Wrap value in `useMemo` with the right deps. |
| **S6479** | Array index used as React/Vue list key | Use a stable id from the data; if none exists, derive one. |

### Style / clarity codes

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S1192** | String literal repeated 3+ times | Extract to a `const` at module scope. |
| **S1067** | Boolean expression with > 3 operators | Extract a named predicate. |
| **S1117** | Local variable shadows an outer binding | Rename one. |
| **S3358** | Nested ternary | Extract to helper function or `if/else if`. JSX/template leaves are tolerable. |
| **S3776** | Cognitive complexity > 15 | Extract helpers, inline early-return guards. |
| **S138** | Function body > 200 lines | Decompose. |
| **S107** | Function with > 7 parameters | Group into an options object. |
| **S109** | Magic number literals | Extract to named `const`. |
| **S101** | Class name not PascalCase | Rename. |
| **S100** | Function name not camelCase | Rename. No underscores in test names — use `t.Run("sub test", ...)`. |
| **S6582** | `if (!x \|\| !x.foo)` | Optional chain: `if (!x?.foo)`. |
| **S7735** | Negated condition in ternary `!cond ? a : b` | Flip to `cond ? b : a`. |
| **S6606** | `Object.prototype.hasOwnProperty.call(obj, k)` | `Object.hasOwn(obj, k)`. |
| **S7773** | Bare `parseInt(s)` / `parseFloat(s)` | `Number.parseInt(s, 10)` / `Number.parseFloat(s)`. |
| **S7781** | `.replace(/literal/g, x)` | `.replaceAll("literal", x)` for literals; keep `.replaceAll(/regex/g, x)` for character classes. |
| **S7780** | Backslash-heavy regex source | `String.raw\`...\``. |
| **S6594** | `String.match(/regex/g)` | `[...s.matchAll(/regex/g)]` or `regex.exec(s)`. |
| **S2871** | `[1, 2, 10].sort()` (string compare on numbers) | Pass a comparator. |
| **S4043** | `[...arr].sort()` | `arr.toSorted(...)` or `arr.slice().sort(...)`. |
| **S4323** | Inline union used as alias | Extract `type` declaration. |
| **S7764** | Bare `window.` / `document.` | `globalThis.window.` / `globalThis.document.`. |
| **S2137** | `Map` used as variable/function name | Rename to `MapView`, `mapInstance`, etc. Built-ins are reserved. |
| **S3923** | All branches of `if/else` or `switch` produce same value | Drop the conditional. |
| **S7758** | Spread inside loop: `acc = [...acc, x]` | Push or concat once outside (O(n²) → O(n)). |
| **S6644** | `Array.from(generator)` where `[...gen]` works | Use spread. |
| **S2138** | Useless explicit `return undefined` | Drop. |
| **S4144** | Two functions in same scope with identical bodies | DRY: keep one. |

### Security codes

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S2068** | Hardcoded credential | Env var or secrets manager. Hook-enforced. |
| **S5547** | Weak hash (MD5, SHA-1, DES) | SHA-256+, argon2/bcrypt for passwords. |
| **S5876** | Login endpoint without rate limit | Wire per-IP rate check. |
| **S1313** | Hardcoded IP literal | Use config. SSRF validators are explicit exceptions. |
| **S5693** | Missing request body size limit | Cap body size. |
| **S2755** | XML parsing without XXE protection | Disable external entities. |

### React-specific deprecation codes (React 19)

| Code | Pattern | Fix |
| ---- | ------- | --- |
| **S1874 / FormEvent** | `React.FormEvent<HTMLFormElement>` for onSubmit | `SubmitEvent<HTMLFormElement>` (import from `react`). |
| **react-hooks/set-state-in-effect** | `setState` inside `useEffect` | Tracked-deps render-time pattern or `useEffectEvent` to read latest closure. |
| **react-hooks/exhaustive-deps** | `useEffect` missing a dep | Add the dep OR restructure with `useRef` / `useEffectEvent`. Never `// eslint-disable-next-line`. |
| **react-hooks/refs** | Ref mutated during render | Move to effect or use `useEffectEvent`. |

## Sweep procedure (when this rule fires)

After every edit:

1. Run the project's lint command. Fix every reported issue.
2. Grep for `_,` / `_ =` / `// eslint-disable` / `// @ts-ignore` / `//nolint` / `# noqa` in the touched file and any referenced file. Fix every hit.
3. Check IDE diagnostics for any of the SonarLint codes listed above. Address each one.
4. Run the no-discards hook locally if it exists; verify the edit passes.

## Touched-file audit workflow (MANDATORY — read this before editing any file)

The most common way agents reintroduce a previously-fixed issue is by
focusing narrowly on the requested change and skipping the broader sweep
the file already deserves. This workflow makes the sweep explicit so
the failure mode can't slip past.

### When this applies

Every time you `Read` or `Edit` a file, before you mark the task
involving that file as complete, run **all five** steps below for
that file. There is no exception for "small" edits — the same hooks
that catch new violations don't catch pre-existing ones, so the audit
is the only safety net.

### The five steps

1. **Inventory duplicated literals (S1192).** For Go / TS / Python:

   ```bash
   grep -oE '"[^"]{8,}"' <file> | sort | uniq -c | sort -rn | awk '$1 >= 3'
   ```

   Every line in the output is a violation. If you decide to extract,
   do **declare + replace in the SAME edit** — never declare a
   const and stop, that produces the unused-const warning state the
   hook flags. If a duplicate is genuinely inside a doc comment
   (e.g., swagger `// @Param ...`), note it as a known Sonar
   false-positive in the response but do not extract.

2. **Inventory discards.** Run the relevant grep set for the file's
   language from the "Pre-delivery self-audit checklist" section
   below. Fix every hit. Common offenders in Go:

   ```bash
   grep -nE '\bfor [_, ]+_[, ]* := range\b' <file>
   grep -nE '_, err :=|, _ :=|^\s*_ =' <file>
   grep -nE 'defer [a-zA-Z_.]+\.Close\(\)$' <file>
   ```

3. **Inventory silent failures.** Look for any of the SonarLint
   shape patterns from `no-silent-failures.md`: empty catch blocks,
   fire-and-forget `.catch(() => null)`, `c.Data()` /
   `response.end()` inside a per-row loop (this terminates the
   response stream — every later iteration silently fails). One
   `c.Data` inside a loop has happened twice in this codebase
   already; treat it as a known-bad pattern.

4. **Run the project's lint + static-analysis chain on the file.**
   Go: `go build`, `go vet`, `staticcheck`, `golangci-lint run`
   (all must be zero). TS: `tsc --noEmit`, `eslint --max-warnings 0`.
   If any tool reports anything, fix it before marking done.

5. **Re-check IDE diagnostics for the file** (the PostToolUse hook
   reports them — read every entry). The IDE is the source of truth
   for SonarLint warnings the linters above don't catch (e.g.,
   `go:S1192`, `go:S3776`, `go:S107`). Address each one or, if the
   warning is a genuine false-positive (swagger comment etc.),
   document why in the response and do NOT introduce a per-line
   suppression.

6. **Commented-out code audit (no-silent-drops.md Rule 0).** Grep the
   file for commented-out source:

   ```bash
   grep -nE '^\s*//\s*(if|for|switch|return|err|var|const|func|import|package|[a-zA-Z_]+[ \t]*[:=]|c\.|i\.|a\.|h\.|k\.)' <file>
   ```

   Every match is one of three things:
   - **A genuine TODO marker** — leave it OR open a real ticket and
     remove it. Either way, surface it to the user.
   - **A verbatim duplicate of live code adjacent to it** (typo'd
     older copy that wasn't cleaned up) — name it explicitly in the
     response and ASK before deleting. Never silently delete.
   - **An unwired feature** (the path was started, stubbed, or
     disabled) — mark with `BUG(unwired-<short-name>)` and a
     reader-facing question: "is this still wanted? if yes, here's
     the implementation gap." Restore the block verbatim; do not
     delete to make the linter pass.

   The gocritic `commentedOutCode` warning is NOT permission to
   delete. It's permission to ASK. Deleting a commented block to
   silence the linter is a no-silent-drops violation regardless of
   what the linter says.

### Declare-and-stop is forbidden

If you decide to extract a constant or a helper:

- The same edit MUST replace every usage.
- Or revert the declaration before reporting done.

The half-finished "I declared the const, replacement is next turn"
state is itself a no-discards violation: it leaves the file with
unused-symbol warnings that block any reasonable "is this done?"
check.

### Same-pattern reintroduction is forbidden

If the codebase has ever extracted a constant for `"Content-Type"`,
`"text/csv"`, etc., and you write new code that hardcodes the same
literal, that is the violation the user has named multiple times.
Before adding a new string literal to a file, grep the file for
existing `const`s and use them. If the const doesn't exist yet but
the literal will repeat, add the const in the SAME edit and use it.

### Why this workflow exists

This section was added after a session where the agent fixed an S107
finding by extracting a constant, then immediately wrote new code
nearby that introduced four MORE duplicate-literal violations of the
same shape — visible to the IDE Sonar plugin but invisible to the
PostToolUse hook because the hook only checks the diff, not the file
as a whole. The user's correct critique:

> you fix an issue and when you write some more code you introduce
> the same issue even though these entire avoidance flow should be
> in the project and global rules. Is there a reason why you can't
> follow them or update them when you find a need issue

The rules were there. The agent wasn't running them. This section
exists so the workflow is explicit and the failure cannot recur as
"I forgot to audit."

## Pre-delivery self-audit checklist (MANDATORY)

**Before reporting any code change as complete, run this checklist against every file you touched.** This rule exists because the user has repeatedly observed agents reintroducing lint violations that the codebase already fixed. *Never* deliver code that contains a pattern from this list.

| # | Pattern to scan for | How to find it | What to do |
| - | ------------------- | -------------- | ---------- |
| 1 | `_` as a value position (Go, JS destructure, type assertion) | `grep -nE "\b_\b" file \| grep -E "_\s*[:=,)]"` | Bind to a named identifier and use it |
| 2 | `_, err :=`, `_, ok :=`, `if _, x :=` | `grep -nE "_,\s*\w+\s*:?=" file` | Bind first return |
| 3 | `_ = expr` | `grep -nE "^\s*_\s*=" file` | Bind and use |
| 4 | Empty catch `catch {` or `catch (_)` | `grep -nE "catch\s*(\(\s*\)\|\(\s*_\s*\)\|\{)" file` | Bind err, log via shared logger |
| 5 | `.catch(() => null/undefined/false/{}/"")` | `grep -nE "\.catch\(\(\)\s*=>\s*(null\|undefined\|false\|\{\s*\}\|\"\")" file` | Log + propagate |
| 6 | `void promise()` fire-and-forget | `grep -nE "void\s+\w+\(\)" file` | `.catch((err) => log.warn(...))` |
| 7 | `// eslint-disable*`, `// @ts-ignore`, `// @ts-expect-error`, `//nolint`, `# noqa`, `# type: ignore`, `# pragma: no cover`, `# rubocop:disable`, `@SuppressWarnings` | `grep -nE "(eslint-disable\|@ts-ignore\|@ts-expect-error\|//nolint\|noqa\|type: ignore\|pragma: no cover\|rubocop:disable\|SuppressWarnings)"` | Fix underlying issue; never suppress |
| 8 | Sonar IDs in comments (`S1192`, `S3776`, `S3358`, etc.) | `grep -nE "S[0-9]{3,4}" file \| grep "//"` | Describe invariant; never reference rule IDs |
| 9 | Phase markers (`Phase A`, `Phase 1`, `Initiative I10`, plan IDs) | `grep -niE "phase\s+[a-z0-9]\|plan\s+\w[0-9]"` | Move to PR description; remove from code |
| 10 | TODO / FIXME / XXX placeholders | `grep -nE "TODO\|FIXME\|XXX"` | Implement now or open a real ticket |
| 11 | Commented-out code blocks | Visual review | Delete; git remembers |
| 12 | `console.log/warn/error/info/debug` in product source | `grep -nE "console\.(log\|warn\|error\|info\|debug)"` | Route through `lib/log.ts` |
| 13 | Repeated string literal ≥ 3× (S1192) | `grep -oE "\"[^\"]{8,}\"" file \| sort \| uniq -c \| awk '$1 >= 3'` | Extract to module-level `const` |
| 14 | Cognitive complexity > 15 (S3776) | Visual: function > ~50 lines with nested if/for/switch | Extract helpers, dispatch via lookup, inline early-return guards |
| 15 | Nested ternary `a ? b : c ? d : e` (S3358) | `grep -nE "\?\s*[^:]+:\s*[^?]+\?"` | Extract a tone/state helper |
| 16 | Array index as React key (S6479) | `grep -nE "key=\`[^\`]*\$\{i\}" file` | Use a stable id from data |
| 17 | Component props not `Readonly<>` (S6759) | Visual: `({ ... }: { ... })` without `Readonly` | Wrap props type |
| 18 | Context provider `value` without `useMemo` (S6481) | `grep -nB2 "Context.Provider value="` | Wrap value in `useMemo` |
| 19 | Bare `parseInt`/`parseFloat` (S7773) | `grep -nE "\bparseInt\(\|\bparseFloat\("` | `Number.parseInt(s, 10)` / `Number.parseFloat(s)` |
| 20 | `.replace(/literal/g, ...)` (S7781) | `grep -nE "\.replace\(/[^/{]+/g,"` | `.replaceAll("literal", ...)` for literals |
| 21 | `.match(/regex/g)` (S6594) | `grep -nE "\.match\(/[^/]+/g\)"` | `[...s.matchAll(...)]` or `regex.exec(s)` |
| 22 | `Object.prototype.hasOwnProperty.call` (S6606) | `grep -nE "hasOwnProperty\.call"` | `Object.hasOwn(obj, k)` |
| 23 | `typeof x === "undefined"` (S7741) | `grep -nE "typeof\s+\w+\s*==[=]?\s*[\"']undefined" file` | `x === undefined` |
| 24 | Bare `window.` / `document.` in SSR-safe code (S7764) | `grep -nE "(^\|\W)window\." file`, same for document | `globalThis.window.` / `globalThis.document.` |
| 25 | `[...arr].sort()` (S4043) | `grep -nE "\[\.\.\.[^\]]+\]\.sort"` | `arr.toSorted(...)` or `arr.slice().sort(...)` |
| 26 | `as` cast widening typed value (S6571) | Visual after type predicates / narrowing | Use type predicate, narrow naturally |
| 27 | Unnecessary `as` after narrowing (S4325) | IDE diagnostics | Remove the assertion |
| 28 | Unused parameter (S1172) or unused local (S1481) | `go vet` / `tsc --noEmit` / IDE | Remove or use; never `_`-prefix |
| 29 | Magic numbers (S109) | Visual: large numeric literals inline | Extract to named `const` |
| 30 | `Map` / built-in name shadow (S2137) | `grep -nE "const\s+Map\b\|function\s+Map\b"` | Rename to `MapView`, `mapInstance`, etc. |
| 31 | Useless `return undefined` (S2138) | `grep -nE "return\s+undefined\s*;"` | Drop |
| 32 | Hardcoded credential (S2068) | Hook-enforced. Common prefixes: `sk-proj-`, `sk_live_`, `ghp_`, `xoxb-`, `AKIA`, `Bearer eyJ`, `BEGIN PRIVATE KEY` | Env var / secrets manager |
| 33 | Weak hash (S5547) — `md5`, `sha1`, `des` | `grep -nE "createHash\(\"(md5\|sha1)\"\|createCipheriv\(\"(des\|3des)\""` | SHA-256+, argon2/bcrypt for passwords |
| 34 | Login endpoint without rate limit (S5876) | Visual review of `/auth/*` handlers | Wire per-IP rate check |
| 35 | Hardcoded IP in production (S1313) | `grep -nE "([0-9]{1,3}\.){3}[0-9]{1,3}" file` | Config; SSRF validators allowlist |
| 36 | Missing body-size limit on handler (S5693) | Visual | Cap via middleware |
| 37 | XML parsing without XXE protection (S2755) | `grep -nE "xml\."` | Disable external entities |
| 38 | Empty function body (S108) | `grep -nE "\{\s*\}"` | Implement or document why |
| 39 | `catch (e) { throw e }` useless rethrow (S2737) | Visual | Drop the try/catch or add real handling |
| 40 | Caught exception used only for `instanceof`, never logged (S1166) | Visual | Always log on the way through |
| 41 | `throw` / `reject` / `raise` in a user-facing path WITHOUT a paired user-visible surface (toast / inline validation / banner / state transition / modal) — `no-silent-failures.md` rule 7 | Visual + grep for `throw` / `reject(` / `raise` in views / handlers / form-submit / API client; confirm each is caught + surfaced | Pair every throw in a user-facing path with toast.error / inline error / banner / status transition. NEVER rely on a generic ErrorBoundary as the first UX surface. Server-side throws route through a centralised exception handler that emits a typed `{error_code, message, details}` envelope per `error-handling-with-context.md` rule 4 |

### How to run the audit

For every file you touched in this turn, run **every** grep in the table above. If even one returns a match (other than the documented rune-iteration exception), the change is **not done** — fix the violation and re-run.

For Go: also run `go vet ./...`, `staticcheck ./...`, and `golangci-lint run ./...` and require all three to pass with zero output.

For TS/JS: also run `npx tsc --noEmit` and `npx eslint <file> --max-warnings 0`.

For test files: also run the test (`go test ./<pkg>/... -count=1 -race` or `npx jest --testPathPattern=...`) and require pass.

### The "we have fixed this before" rule

If a SonarLint or build warning has been fixed anywhere in this repo before, your new code MUST NOT reintroduce the same pattern. Before delivering any new function, sweep it for the patterns above — this is not optional. The user explicitly tracks recurrence and treats it as a contract violation.

## Hook enforcement

The PostToolUse hook at `~/.claude/scripts/hooks/lib/no-discards-rules.js` rejects edits introducing:

- `_, err :=` / `, _ :=` / `_ = …` in Go
- `// eslint-disable*`, `// @ts-ignore`, `// @ts-expect-error` in TS/JS
- `//nolint` in Go
- Sonar IDs, Phase markers, tracker pointers in comments
- TODO/FIXME/XXX placeholders
- Raw `console.log/warn/error/info/debug` in production TS/JS source
- Hardcoded credentials (key prefixes)
- Underscore-prefixed Go test function names (e.g., `TestFoo_Bar`)
- Merge-conflict markers

Operator override (humans only, never the agent):
`export CLAUDE_NO_DISCARDS_HOOK=off`.

## Cross-references

- `no-silent-failures.md` — empty catches, silent fire-and-forget promises, false-positive success reporting.
- `no-silent-drops.md` — TODO/FIXME removal, suppression directives, meta-comments.
- `sonarlint-checks.md` — exhaustive SonarLint rule table with per-rule fix recipes.
- `done-criteria.md` — service-migration done checklist.
- `coding-style.md` — broader code style (comments, file organization, immutability).

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Hook rejection on a new pattern not in the current rule list (candidate for promotion to documented pattern)
- Discard pattern shipping despite the hook (hook coverage gap — refine the regex / AST query)
- Suppression directive (`// eslint-disable`, `//nolint`, `# noqa`) attempted (rule violation — log + reinforce)
- Same SonarLint code (S1192, S3776, S6571, etc.) recurring across PRs in 30 days (lint config or developer-pattern signal)
- New language added to the rebuild without a per-language `no-discards.md` extension (rule needs extension)
- Pre-delivery self-audit checklist row repeatedly missed (rule discipline weak — needs sharpening)
- Hardcoded credential prefix appearing in source despite hook (new prefix pattern to add to the hook)

**Refinement candidates**:

- New banned-pattern entry when a class recurs across 2+ services
- New hook check when a pattern bypass surfaces
- Tightening of complexity / length / parameter caps when chronic violation observed
- New per-language `no-discards.md` extension when a language enters the rebuild

---

<!-- ============================================================
     Section: no-ambient-globals.md (from rules/common/)
     ============================================================ -->

# No Ambient Globals Rule (Always-On, Global)

> Auto-fires on every file. Sister to `coding-style.md`,
> `no-discards.md`, `error-handling-with-context.md`,
> `extreme-lint-policy.md`. Standards: **TypeScript strict mode**,
> **Go module-private**, **Python module discipline**, **Java
> package-private**, **dependency injection** (Fowler).

## Core Principle

**Code does not depend on ambient global state — process-wide
variables, monkey-patched modules, implicit configuration, or
"singletons that just exist." Every dependency is INJECTED:
passed as a parameter, available on a context object, or
explicitly resolved from a container. Test isolation and
production reasoning both depend on this discipline.**

Ambient globals are the leading source of "works in isolation,
breaks under concurrent load," "tests pass in one order, fail in
another," and "this function does X, but ALSO mutates Y over
there." They're invisible coupling.

## What counts as an ambient global

| Pattern | Why it's a problem |
| --- | --- |
| Module-level mutable state | Shared across all callers; changes from one caller affect others |
| Process-wide singletons (`Logger.global`) | One config for entire process; can't test with different configs |
| Environment variables read at call time | Behaviour depends on env at the moment of call, not at construction |
| `globalThis` / `window` / `global` / `os.environ` | Same as above, more obvious |
| Static-method-only classes | Hidden state inside the class |
| `requireUser()` that reads from thread-local | Hidden dependency on request context |
| Global event emitters / pub-sub buses | Listeners from anywhere; mutation by anyone |
| Monkey-patched standard library | Behaviour depends on import order |
| Implicit timezone / locale | Same code returns different results based on machine state |
| `Math.random()` without seed control | Can't reproduce; can't test deterministically |

## Hard rules

### 1. Dependencies are EXPLICIT parameters or context

```typescript
// WRONG — hidden dependency on global logger
import { logger } from './logger';
export async function fetchUser(id: string) {
  logger.info('fetching', { id });
  ...
}

// RIGHT — injected via context
interface RequestContext {
  logger: Logger;
  db: DBClient;
  user: User | null;
}
export async function fetchUser(ctx: RequestContext, id: string) {
  ctx.logger.info('fetching', { id });
  ...
}
```

The `RequestContext` pattern carries per-request state: logger
(with correlated request_id), DB connection from the pool,
authenticated user, feature flag evaluator, trace span. It's
constructed at the request boundary; functions receive it.

### 2. Configuration is resolved at startup, frozen, then passed

```typescript
// WRONG — env var read inside the function
export function getApiUrl() {
  return process.env.API_URL ?? 'http://localhost';
}

// RIGHT — config object built once at startup
export interface Config {
  readonly apiUrl: string;
  readonly dbUrl: string;
  readonly stripeKey: string;
}

export function buildConfig(): Config {
  return Object.freeze({
    apiUrl: requireEnv('API_URL'),
    dbUrl: requireEnv('DB_URL'),
    stripeKey: requireEnv('STRIPE_KEY'),
  });
}
```

`requireEnv` validates presence at startup (fail-fast, per
`error-handling-with-context.md`); the rest of the app reads from
the `Config` object, never from `process.env` directly.

### 3. Singletons are CONSTRUCTED at startup, not lazy-initialised

```go
// WRONG — lazy global, no error path, no test override
var db *sql.DB

func init() {
    db, _ = sql.Open("postgres", os.Getenv("DB_URL"))
}

// RIGHT — constructed in main(), passed via dependency
type Application struct {
    Config *Config
    DB     *sql.DB
    Logger *slog.Logger
}

func New(cfg *Config) (*Application, error) {
    db, err := sql.Open("postgres", cfg.DBURL)
    if err != nil {
        return nil, fmt.Errorf("connect db: %w", err)
    }
    return &Application{Config: cfg, DB: db, Logger: cfg.Logger}, nil
}

// Handlers carry the Application reference
func (a *Application) HandleUser(w http.ResponseWriter, r *http.Request) {
    user, err := repo.FindUser(a.DB, r.PathValue("id"))
    ...
}
```

Test code constructs a different `Application` with mocks.
Production constructs the real one. Same code, different inputs.

### 4. Time is not a global

```typescript
// WRONG — uses real wall clock; tests can't control time
function isExpired(token: Token) {
  return token.expiresAt < Date.now();
}

// RIGHT — clock is injected
interface Clock {
  now(): number;
}
function isExpired(clock: Clock, token: Token) {
  return token.expiresAt < clock.now();
}

const SystemClock: Clock = { now: () => Date.now() };
const TestClock = (fixed: number): Clock => ({ now: () => fixed });
```

Same for IDs (UUIDs / ULIDs — inject a generator), random
numbers (inject a seeded RNG), and other "implicit
non-determinism" sources.

### 5. Module-level mutable state is BANNED

```python
# WRONG — module-level mutable cache
CACHE = {}

def get_user(id):
    if id not in CACHE:
        CACHE[id] = db.query(id)
    return CACHE[id]

# RIGHT — cache is a service with a defined lifecycle
class UserCache:
    def __init__(self, db):
        self._db = db
        self._cache = {}

    def get(self, user_id):
        if user_id not in self._cache:
            self._cache[user_id] = self._db.query(user_id)
        return self._cache[user_id]

# Constructed in app startup; passed to handlers
```

Module-level state is hidden coupling. Different test files
share the cache; one test's "create user 1" pollutes another
test's "user 1 doesn't exist."

### 6. Logger is per-request, not global

```typescript
// WRONG — global logger, no per-request correlation
import { logger } from './logger';
logger.info('user signed in');

// RIGHT — request-scoped logger with correlation
interface RequestContext {
  logger: Logger;  // has trace_id, request_id bound
}

function handleSignin(ctx: RequestContext) {
  ctx.logger.info('user signed in');
  // log already includes trace_id, request_id, user_id from ctx
}
```

The logger that gets stored on the context has bound fields
(request_id, trace_id, span_id, user_id) so every log within
that request automatically correlates.

### 7. Database connections come from a pool, scoped to the request

```typescript
// WRONG — handler grabs a connection from a global pool
import { pool } from './db';
async function handle(req: Request) {
  const result = await pool.query('SELECT ...');
}

// RIGHT — connection is acquired at request entry,
// released on response (or via middleware / async-local-storage)
async function handle(ctx: RequestContext, req: Request) {
  const result = await ctx.db.query('SELECT ...');
}
```

The middleware constructs the per-request `ctx.db` from the
pool; the same connection handles the request's transaction
boundary.

### 8. Feature flags are per-request

Per `feature-flags.md` — flag evaluation depends on the user's
context (user_id, tenant_id, plan tier). Globals can't capture
that. The flag client is on the context:

```typescript
async function handler(ctx: RequestContext) {
  const useV2 = await ctx.flags.isEnabled('checkout-v2', {
    userId: ctx.user.id,
    tenantId: ctx.user.tenantId,
  });
  ...
}
```

### 9. Async-local-storage / context propagation for cross-cutting state

When passing the context explicitly through every function is
verbose:

| Language | Mechanism |
| --- | --- |
| Node.js | `AsyncLocalStorage` (built-in `async_hooks`) |
| Go | `context.Context` (idiomatic, passed everywhere) |
| Python | `contextvars` (built-in, asyncio-aware) |
| Java / Kotlin | `ThreadLocal` (sync) + `Reactor Context` (reactive) |
| Ruby | `RequestStore` gem |
| .NET | `AsyncLocal<T>` |

ALS is still injection — just plumbed through the runtime
instead of through parameter lists. It's NOT the same as a
global; the value is scoped to the request.

### 10. Test isolation is the proof

The acid test: can two tests run in PARALLEL with completely
different config / state / time / flags without interfering?

- If yes → no ambient globals
- If no → there's hidden state somewhere; find + inject it

Run the test suite with `--shuffle` (Go: `-shuffle`; Rust: native;
pytest: `--randomly-seed`); failure under shuffle = ambient
global.

## Per-language patterns

### TypeScript

- DI containers: `tsyringe`, `awilix`, `inversify`
- Lighter: factory functions returning closures over deps
- `AsyncLocalStorage` for request context in Node
- Tools: tsconfig `noImplicitAny: true`, `strict: true`

### Go

- `context.Context` is the idiom
- Pass struct dependencies (no DI container needed); methods
  receive `*Application` or per-domain `*Repository`
- Banned: `init()` for anything non-trivial; package-level vars
- Linter: `gochecknoinits`, `gochecknoglobals` (per
  `extreme-lint-policy.md`)

### Python

- DI containers: `dependency-injector`, `injector`
- Lighter: factory functions; pytest fixtures for testing
- `contextvars` for async request context (FastAPI, Starlette)
- Tools: `mypy --strict`, `pylint`

### Java / Kotlin

- Spring DI (Spring Boot)
- Constructor injection (preferred); avoid field injection
- Reactor `Context` for reactive flows

### Rust

- Pass `&AppState` everywhere; Axum / Actix-Web idiomatic
- Trait-based abstractions for testing (`impl Db for ...`)
- No globals via `lazy_static!` for mutable state — use `OnceCell`
  / `OnceLock` only for true immutable singletons (e.g., regex
  compilation)

## Anti-patterns

### Anti-pattern 1: "Just use the import"

```typescript
// In a handler
import { db } from '../db';
db.query(...);
```

The handler now depends on `../db`'s module state — including
which `db` got initialised when. Testing requires
monkey-patching. Use the context.

### Anti-pattern 2: Global singleton with reset method

```typescript
class GlobalConfig {
  private static instance: Config;
  static get() { return GlobalConfig.instance; }
  static reset(newConfig: Config) { GlobalConfig.instance = newConfig; }
}
```

The `reset` method is an admission that the global breaks tests.
Stop bandaging — inject.

### Anti-pattern 3: Service locator

```typescript
const userService = ServiceLocator.get<UserService>('UserService');
```

The service locator is itself a global; you've moved the
dependency from explicit to hidden inside the locator. True DI
passes the dependency directly.

### Anti-pattern 4: `init()` with side effects (Go)

```go
func init() {
    db = connectToDatabase()
    log.SetOutput(os.Stdout)
    http.HandleFunc("/", handler)
}
```

`init()` runs before `main()`; you cannot test the side effects,
cannot defer them, cannot order them. Move to `main()`.

### Anti-pattern 5: Environment variables read deep in the stack

```python
def calculate_tax(amount):
    rate = float(os.environ.get('TAX_RATE', '0.08'))
    return amount * rate
```

`TAX_RATE` is now a hidden input to every test of
`calculate_tax`. Pass the rate as a parameter or carry it on the
config.

## Acceptable "globals"

Not every global is bad. These are OK:

| Pattern | Why OK |
| --- | --- |
| **Immutable constants** (`const MAX_RETRIES = 3`) | Frozen at compile time; safe to share |
| **Pure function modules** (`Math.max`, `crypto.hash`) | No state, deterministic |
| **Logger interface (not instance)** | The interface is global; the instance is injected |
| **Type definitions / classes** | Schemas, not state |
| **Stable runtime singletons via OnceLock** | Truly one-time initialisation that never changes |

The line: if it has STATE that CHANGES across calls, it
shouldn't be global.

## Cross-references

- `coding-style.md` — broader code-style baseline
- `no-discards.md` — every value bound; every error wrapped
- `error-handling-with-context.md` — errors carry operation +
  ids from the context
- `extreme-lint-policy.md` — globals linted out
- `local-testability.md` — testable code requires injection
- `idempotency.md` — deterministic operations require seeded
  randomness
- `task-intake-due-diligence.md` Q14 (testability)
- `feature-flags.md` — per-request context
- `audit-logging.md` — per-request actor

## Standards cited

- **Dependency Injection** — Fowler 2004
  (martinfowler.com/articles/injection.html)
- **Twelve-Factor App** — Config in environment, parsed once at
  startup
- **Hexagonal Architecture** — Cockburn 2005 (Ports + Adapters)
- **Clean Architecture** — Martin 2017

## Why this rule exists

Ambient globals cause failures that are HARD to debug:

1. **Test order dependency** — Test A sets a global; test B reads
   it; reordering = breakage
2. **Concurrent state corruption** — Two requests hit the same
   global cache; race condition; data leaked across users
3. **Configuration drift** — Different parts of the app read env
   vars at different times; one part has stale config
4. **"Works in production, fails in staging"** — Staging
   missing an env var the dev forgot to document
5. **Refactoring resistance** — Touching a function requires
   tracing every global it transitively reads/writes

Injection-based code is:

- Testable in isolation (mock the deps)
- Parallel-safe (no shared state)
- Self-documenting (signature shows the dependencies)
- Refactor-friendly (the dependency graph is explicit)

The cost: more characters in function signatures. The benefit:
debuggable, testable, scalable code.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New module-level mutable state introduced (singleton cache, shared dict, lazy-init holder) — rule 1 weakening
- `process.env` / `os.environ` read deep in the call stack instead of at startup (rule 2 violation)
- `init()` (Go) / `__init__.py` with side effects beyond pure assignment — rule 3 violation
- `Date.now()` / `time.Now()` called directly in product code (rule 4 — Clock not injected)
- `Math.random()` / `crypto.randomUUID()` invoked without a seeded RNG injection layer (rule 4 weakening)
- Logger imported as a module-level singleton instead of bound to the request context (rule 6 violation)
- DB connection grabbed from a global pool inside a handler instead of context-acquired (rule 7 weakening)
- Feature flag client read globally rather than per-request context (rule 8 weakening)
- Test failures appear under `--shuffle` / `-shuffle` (rule 10 violation — ambient global exists)
- `gochecknoglobals` / `gochecknoinits` lint disabled in golangci-lint config

**Refinement candidates**:

- New per-language DI pattern row when a new framework's idiom emerges (e.g., new async-local-storage shape, new effect system)
- Tightening of the test-shuffle gate when randomised order isn't enforced in CI
- New cross-reference when a sister rule (no-discards, local-testability, idempotency) depends on DI for verification
- New "acceptable global" entry when a recurring genuinely-stateless pattern (interned strings, compiled regex catalog) needs the carve-out

---

<!-- ============================================================
     Section: no-local-fs.md (from rules/common/)
     ============================================================ -->

# No-Local-Filesystem Rule (Global Default)

> Auto-fires on every file. Companion to `done-criteria.md`,
> `no-discards.md`, and `deploy-failures-become-checks.md`.

## Core Principle

**Production code MUST NOT write to, or rely on, the local filesystem
for state that outlives the request that created it.**

Ephemeral container platforms — AWS ECS Fargate, Lambda, GCP Cloud Run,
Heroku, Render, Fly, Kubernetes pods, mobile Expo Web — give each
process a writable local disk that is destroyed when the container
restarts or is rescheduled. Code that assumes "I'll write a CSV here
and read it back later" silently breaks in production every time the
pod recycles. Even within a single request, writing to local FS:

- Forces sticky-session affinity (one pod must service follow-up reads).
- Cross-leaks state between concurrent requests if paths are not
  request-scoped.
- Slows cold starts (re-mounting / re-creating directories).
- Blocks horizontal scaling (every replica needs its own copy of the
  data it just wrote).

The rule is on by default. It bans local FS writes in production
source. Reads from baked-in static assets are fine; writes are not.

## Hard rules

1. **No `os.Create`, `os.OpenFile(... O_WRONLY|O_CREATE ...)`,
   `os.WriteFile`, `os.MkdirAll`, `ioutil.WriteFile`, `os.Rename`,
   `os.Remove*`** in production source.

2. **No `fs.writeFileSync`, `fs.writeFile`, `fs.createWriteStream`,
   `fs.promises.writeFile`, `fs.appendFile*`, `fs.mkdir*`,
   `fs.rename`, `fs.unlink*`, `fs.rm`** in production TS/JS.

3. **No Python `open(path, "w"|"a"|"x"|"r+")`, `os.makedirs`,
   `os.remove`, `os.rename`, `shutil.copy*`, `shutil.move`,
   `pathlib.Path.write_*`, `pathlib.Path.mkdir`, `pathlib.Path.rename`,
   `pathlib.Path.unlink`** in production source.

4. **No equivalent FS-write patterns in any other language**: Ruby
   `File.write`, Java `Files.write` / `Files.createDirectories`, C#
   `File.WriteAllText` / `Directory.CreateDirectory`, Swift
   `FileManager.default.createFile`, Rust `fs::write` /
   `fs::create_dir_all`, PHP `file_put_contents` / `mkdir`,
   Dart `File(...).writeAsString`.

## Where to write instead

| Use case | Replace local FS with |
| -------- | --------------------- |
| User uploads (avatars, KYC docs, attachments) | Object storage (S3, GCS, Azure Blob, R2) directly; the upload route returns a signed URL the client uploads to, or proxies the multipart body through to the bucket without touching local disk. |
| Generated reports / exports (CSV, PDF, XLSX) | Stream the bytes to `http.ResponseWriter` (download), or write to an in-memory buffer (`bytes.Buffer`, `Buffer.from`, `io.BytesIO`) and PUT to object storage with a signed download URL. |
| Server-rendered images (OG cards, charts) | Render to in-memory buffer; serve from response or cache in object storage / CDN. |
| Email attachments | Build in-memory; pass bytes to the email SDK. |
| Logs | Structured logger to stdout/stderr; CloudWatch / Loki / Datadog collects from the stream. Never `os.Create("app.log")`. |
| Caches | Redis, ElastiCache, Memorystore, or in-process LRU. Never a local file. |
| Database snapshots / backups | Cloud-native backup (RDS automated backup, S3 export). Never `pg_dump > /tmp/dump.sql` from app code. |
| Session storage | Redis or signed cookies. Never a local session file. |
| Sticky local cache for hot reads | OK if (a) request-scoped under `os.TempDir()`, AND (b) cleaned up in a `defer`/`finally`, AND (c) tolerant of being absent on the next pod. |

## Allowed exceptions (narrow, documented)

These cases legitimately touch the local filesystem and are NOT
violations:

1. **`os.TempDir()` for genuinely transient request-scoped work** —
   for example, a video transcoder that needs a temp working file for
   FFmpeg. Rules:
   - Use `os.CreateTemp("", "prefix-*.ext")` so the name is unique.
   - Clean up via `defer os.Remove(path)` / `try/finally` /
     `with tempfile.NamedTemporaryFile(...)`.
   - The result MUST be moved to object storage before the request
     returns.
   - Never write to `/tmp` with hard-coded paths.

2. **Build / CI / migration tooling** in `cmd/`, `scripts/`,
   `tools/`, `migrations/`. These run once, off the hot path.

3. **CLI tools** (Go binaries under `cmd/cli`, Node tools under
   `bin/`, Python `__main__` scripts). End users invoke them on
   their own machines.

4. **Test fixtures** in `*_test.go`, `__tests__/`, `tests/`,
   `spec/`. Tests use temp dirs freely.

5. **Local development scripts** explicitly gated by an env-var
   check (`if os.Getenv("ENV") == "local"`). Production paths must
   not enter the local-FS branch.

6. **Reading baked-in static assets** — embedded via `go:embed`,
   webpack's `import file from './static.png'`, Python's
   `importlib.resources`. The bytes are baked into the binary /
   bundle; you are not writing to the FS.

## When you encounter a violation

If the file you're touching already writes to local FS in production
code, the fix is part of the work — do not leave it:

1. Identify the data being persisted.
2. Pick the right replacement from the table above (most often: S3
   - in-memory buffer for exports; object storage + signed URLs for
   uploads).
3. Stream where possible — pipe `io.Reader` → S3 PutObject with
   multipart, not load-all-then-write. Memory is also bounded.
4. Update the call site so the response no longer references a
   local path. URLs go in the response body.
5. Update tests. If they relied on reading from local FS, they
   should now mock the object store or use a local MinIO container.

## Mechanical gate

A grep that fails the build catches almost every case. Add this to
the project's pre-commit / CI:

```bash
# Go
grep -rE 'os\.(Create|WriteFile|MkdirAll)|ioutil\.WriteFile' \
  --include='*.go' --exclude-dir=cmd --exclude-dir=tools \
  --exclude-dir=scripts --exclude='*_test.go' .

# TypeScript / JavaScript
grep -rE 'fs\.(writeFile|writeFileSync|createWriteStream|appendFile|mkdir|rename|unlink|rm[A-Z])' \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --exclude-dir=scripts --exclude-dir=tests --exclude-dir=__tests__ \
  --exclude-dir=node_modules src/

# Python
grep -rE "open\([^)]*['\"]\s*[wax][+b]?\s*['\"]|os\.makedirs|os\.remove|os\.rename|shutil\.(copy|move)" \
  --include='*.py' --exclude-dir=tests --exclude-dir=scripts \
  --exclude-dir=migrations .
```

Any non-zero exit fails the build. The user can pre-allowlist
genuine exceptions via a per-project skip list, but no per-file
suppression.

## Why this rule exists

Recurring failure mode on ephemeral container platforms:

1. Engineer writes "save CSV to /tmp, return path".
2. Works on laptop and in CI (long-lived containers).
3. Production runs on Fargate / Lambda / ECS / Cloud Run — pod
   recycles, file gone, follow-up read 404s.
4. Worse: load balancer routes the follow-up read to a different
   replica that never saw the file in the first place.
5. Even worse: a `.tmp` file written during request N is read
   during request N+1 from a different pod, leaking data across
   tenants when paths aren't request-scoped.

The cost of fixing the pattern proactively is one object-store
PutObject call and one in-memory buffer. The cost of finding it in
production is a P1 incident.

Sister failure modes worth naming:

- **Sticky-session affinity required** — once a session-id has to
  pin to a specific pod because of local FS state, horizontal
  scaling stops working.
- **Cold-start tax** — re-mounting / re-creating "cache" dirs at
  boot adds seconds to every cold start.
- **Disk-full incidents** — long-lived (non-FaaS) containers fill
  their writable layer with logs / exports / temp files and crash
  the runtime.

## Cross-references

- `done-criteria.md` — "service-migration done" check includes the
  no-local-FS sweep.
- `deploy-failures-become-checks.md` — every deploy failure
  becomes a pre-deploy check; the local-FS class is one of them.
- `no-discards.md` — discarding the error from `os.Remove(path)` is
  a separate violation that compounds with this one.
- `secrets-management.md` — credential material on local disk is a
  sister problem; never write a token to `/tmp`.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `os.Create` / `os.WriteFile` / `fs.writeFile` / `open(path, "w")` introduced in production source (Hard rules 1-4 violation)
- Generated artifact (CSV, PDF, image) written to local FS instead of streamed / object-store-uploaded (use-case mapping violation)
- Local cache directory created without request-scoped TTL + cleanup (allowed-exception 1 weakening)
- Session storage on local FS (rule scope violation — should be Redis / signed cookies)
- `os.TempDir()` artifact left behind without `defer os.Remove(path)` / `try/finally` cleanup
- Tests rely on local FS read-back rather than mocked object store / MinIO container (test-isolation drift)
- Mechanical grep gate missing from CI / pre-commit (rule "Mechanical gate" weakening)
- Sticky-session affinity required because of local FS state (horizontal-scaling block introduced)

**Refinement candidates**:

- New row in the "where to write instead" table when a new artifact class recurs (e.g., generated PDFs needing fonts cache, ML inference temp files)
- Tightening of the allowlist-exception criteria when transient request-scoped writes prove load-bearing
- New language entry in the Hard rules when a new ecosystem appears (e.g., Bun's filesystem APIs, Deno's permissions model)
- New cross-reference when a sister rule (no-discards, secrets-management, idempotency) adds a write-path consumer

---

<!-- ============================================================
     Section: error-codes.md (from rules/common/)
     ============================================================ -->

# Error Codes Rule (Always-On, Global)

> Auto-fires on every file. Sister to `error-handling-with-context.md`
> (the wrapping + structured logging), `runbook-template.md`
> (runbook entries indexed by error code), `no-silent-failures.md`
> (every failure surfaces a stable code), `api-versioning.md`
> (codes evolve under a contract).

## Core Principle

**Every error path emits a stable `error_code` string that is
part of the API contract. Codes are SHORT, MACHINE-READABLE,
NEVER CHANGE once published, and map to runbook entries +
client-side UX behavior. Status code (HTTP / RPC) is the
class; `error_code` is the SPECIFIC reason.**

## Canonical envelope

Every error response (HTTP / RPC / WebSocket) carries:

```jsonc
{
  "error_code": "wallet_insufficient_funds",
  "message": "Not enough balance to complete this purchase.",
  "details": {
    "required": 5000,
    "available": 3200,
    "currency": "USD"
  },
  "request_id": "<correlation id>"
}
```

Per `error-handling-with-context.md` rule 4 — `message` is
human-readable (or i18n key), `details` is optional structured
payload, `request_id` lets the user pass the failure to
support.

## Hard rules

### 1. Codes are snake_case + stable

```text
wrong_cell
wallet_insufficient_funds
auth_invalid_token
auth_2fa_required
auth_session_revoked
plan_gate_pro_required
rate_limited
validation_failed
duplicate_resource
not_found
internal_error
```

- **snake_case** (consistent with metric / log field names)
- **Stable** — once published, NEVER change the spelling
- **Short** — ≤ 40 characters
- **Descriptive** — the code names the FAILURE, not the
  endpoint

### 2. Codes form a flat namespace, not a tree

Wrong (nested): `auth.token.invalid` / `wallet.balance.insufficient`
Right (flat): `auth_invalid_token` / `wallet_insufficient_funds`

The reasoning: flat codes are easier to map to runbook
entries, alert rules, and i18n keys. Nesting invites
inconsistency.

### 3. Codes map to HTTP status, not the other way around

| HTTP status | Class | Example codes |
| --- | --- | --- |
| 400 | Client bad input | `validation_failed`, `bad_json`, `malformed_id` |
| 401 | Authentication | `auth_missing_token`, `auth_invalid_token`, `auth_expired_token` |
| 403 | Authorization | `forbidden`, `plan_gate`, `role_required`, `tenant_isolation_violated` |
| 404 | Not found | `not_found`, `<resource>_not_found` |
| 409 | Conflict | `duplicate_resource`, `idempotency_in_progress`, `version_conflict` |
| 410 | Gone | `deprecated`, `resource_archived` |
| 412 | Precondition | `etag_mismatch`, `if_match_failed` |
| 422 | Unprocessable | `business_rule_violated`, `state_machine_violation` |
| 429 | Rate limit | `rate_limited`, `quota_exceeded` |
| 451 | Legal | `geo_blocked`, `compliance_blocked` |
| 5xx | Server error | `internal_error`, `dependency_down_<name>`, `timeout` |

The HTTP status tells the CLIENT how to react at the transport
layer; the `error_code` tells the CLIENT how to react at the
UX layer.

### 4. Every code maps to UX + runbook + i18n

The canonical code registry lives at `docs/error-codes.md`
(per project) with this shape:

| Code | HTTP | UX behaviour | i18n key | Runbook entry |
| --- | --- | --- | --- | --- |
| `wrong_cell` | 421 | Toast "Account not available on this region." No retry. | `errors.wrong_cell` | `runbook.md#wrong-cell` |
| `auth_2fa_required` | 403 | Redirect to `/settings/security?enroll=true` | `errors.auth_2fa_required` | `runbook.md#auth-2fa` |
| `rate_limited` | 429 | Toast "Slow down — try again in a moment." Honour `Retry-After` header. | `errors.rate_limited` | `runbook.md#rate-limited` |
| `wallet_insufficient_funds` | 422 | Inline error on amount field; "Required X, available Y" | `errors.wallet_insufficient_funds` | `runbook.md#wallet-insufficient` |

The registry is the source of truth shared by BE + FE + ops.

### 5. New codes go through review

Adding a code is a contract change. The PR adds:

- The code to `docs/error-codes.md` (registry entry)
- The runbook entry it maps to
- The i18n key (default copy + locale stubs)
- The client-side UX handler (per `useApiError` composable
  pattern or equivalent)
- Tests that assert the code at the boundary (BE returns it
  - FE handles it per spec)

### 6. Codes never carry sensitive data

The `error_code` is logged + emitted to metrics + visible to
the client. It MUST NOT contain:

- User identifiers (use `details.user_id` if needed)
- Resource ids (use `details.resource_id`)
- Internal state details (use the runbook entry to explain)
- Stack traces or file paths

Per `error-handling-with-context.md` rule 8 — server log keeps
the full chain; client response stays sanitised.

### 7. Tests assert on code, not message

Per `error-handling-with-context.md` rule 10 — the test
contract is the code, not the copy:

```ts
// WRONG — brittle
expect(err.message).toBe("Not enough balance to complete this purchase.");

// RIGHT — survives copy edits
expect(err.code).toBe("wallet_insufficient_funds");
expect(err.details?.required).toBe(5000);
```

Copy iterates frequently; the code is the contract.

### 8. Deprecation lifecycle (per `deprecation-lifecycle`

rule, when authored)

When a code is deprecated:

1. **Announce** (release notes + email + in-product notice).
2. **Soft-deprecate** — server starts emitting both old and
   new codes for a window (default 30 days).
3. **Hard-deprecate** — server stops emitting the old code;
   clients still requesting old code get a new
   `code_deprecated` error pointing at the replacement.
4. **Remove** — the code is removed from the registry +
   runbook (with a "Superseded by `<new code>`" link).

Each step has a calendar minimum; clients need time to
update.

### 9. Per-language enforcement

The error envelope is implemented once per platform:

- **TypeScript (server)**: a single `APIError` class with
  `code`, `message`, `details`, `status`. Thrown from
  handlers; mapped to HTTP response by middleware.
- **Go (server)**: a single `APIError` type implementing
  `error`; mapped to HTTP via a single response helper.
- **Frontend (any)**: a single `useApiError` composable / hook
  that maps codes to UX behaviour.

Per `reuse-first.md` — ONE class / type / hook per concept.
No duplicate error envelopes across handlers.

### 10. Codes are the integration point between BE, FE, ops

support

When a customer reports a problem with `request_id` X:

1. Support pastes X into the log search
2. Sees `error_code: rate_limited`
3. Looks up `rate_limited` in `docs/error-codes.md` (or
   runbook)
4. Sees the user-facing copy + the recovery path
5. Tells the customer the right thing IMMEDIATELY

Without stable codes, this chain breaks at every step.

## Cross-references

- `error-handling-with-context.md` rule 3 — codes are part of
  the API contract; rule 10 — tests assert on code
- `no-silent-failures.md` — every failure surfaces a code
- `runbook-template.md` — runbook entries map FROM codes
- `api-versioning.md` — codes evolve under the API contract
- `i18n.md` — code → i18n key mapping
- `task-intake-due-diligence.md` Q7 (integration map) names
  the codes a feature emits

## Why this rule exists

Without stable codes, debugging spans:

- The frontend ("the toast said 'something went wrong'")
- The backend ("the log shows a 500")
- The database ("a constraint violated, somewhere")

Three people, three vocabularies, no shared signal. With
stable codes:

- The toast says `wallet_insufficient_funds`
- The log shows `wallet_insufficient_funds`
- The metric has a `result="wallet_insufficient_funds"` tag
- The runbook explains it
- The i18n file translates it
- The customer says "I saw this code" — support knows the
  path

The cost of adding the code at write time is one extra string

- one registry entry. The cost of debugging without codes is
hours per incident.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New code shipped without an entry in `docs/error-codes.md` registry (rule 4 violation)
- Same `error_code` reused with different semantics across services (taxonomy drift)
- Code spelling changed after publication (rule 1 violation — codes are stable)
- Code with sensitive data in the string (rule 6 violation — codes are sanitised)
- Test asserts on `message` instead of `code` (rule 7 violation; per `error-handling-with-context.md` rule 10)
- HTTP status disagrees with the code's class table (rule 3 mismatch)
- New code introduced without UX behaviour + i18n key + runbook entry simultaneously (rule 4 weakening)

**Refinement candidates**:

- New code class entry when a recurring failure shape needs a stable code
- New row in the HTTP-status-to-code class table when a new RFC status gains common use
- Tightening of the deprecation lifecycle steps when soft / hard windows prove too short in practice
- New cross-reference when a sister rule (runbook-template, i18n) defines artifacts that codes must align to

---

<!-- ============================================================
     Section: error-handling-with-context.md (from rules/common/)
     ============================================================ -->

# Error Handling With Context (Always-On, Global)

> Auto-fires on every file. Sister to `no-discards.md`,
> `no-silent-failures.md`, `no-silent-drops.md`,
> `observability-patterns` skill. Companion to language-specific
> error handling guidance in each language's rule subdirectory.

## Core Principle

**Every error path carries enough context for the on-call engineer
to reproduce the failure without re-reading the source. Errors
are WRAPPED with operation context, ENRICHED with structured
fields (request_id, user_id, organization_id, resource ids, the
inputs that produced the failure), and PROPAGATED through the
call stack without losing the originating cause. The client gets
a stable error code + actionable message; the server log gets
the full structured chain.**

Context-free errors (`return err`, `throw e`, `log.error("failed")`)
are bugs in slow motion — they pass review, ship to production,
and then waste the on-call engineer's first hour just figuring out
WHERE the error happened, WHAT was being attempted, and WHY.

## Hard rules

### 1. Wrap at every layer with operation context

Every layer that catches or returns an error MUST wrap it with a
short operation name + the relevant ids it had in scope. Per-
language idiom:

- **Go**: `fmt.Errorf("doThing<userID=%s>: %w", userID, err)` —
  the `%w` preserves `errors.Is` / `errors.As` chain walking.
- **Python**: `raise OperationError("doThing failed", user_id=…)
  from err` — the `from err` preserves the cause chain.
- **TypeScript / JavaScript**: `throw new OperationError("doThing
  failed", { cause: err, userId, … })` — the `cause` field is
  standardised (Error options bag, ES2022+).
- **Java / Kotlin**: `throw new OperationException("doThing
  failed: " + ctx, e)` — pass the cause as the second argument.
- **Ruby**: `raise OperationError.new("doThing failed: #{ctx}"),
  cause: e` — preserves backtrace.
- **Rust**: use `anyhow::Context` or `thiserror` — `result.context(||
  format!("doThing user={}", user_id))?`.
- **Swift**: throw a typed error case with associated values:
  `throw .doThingFailed(userId: userId, underlying: error)`.

Every wrap names:

- The operation (verb + noun: `doThing`, `commitTx`, `parseRequest`)
- The ids in scope (the smallest set that lets oncall reproduce)
- The cause (preserved, never stringified-and-lost)

### 2. Structured logging fields are mandatory

Every error log entry includes:

| Field | Purpose |
| --- | --- |
| `level` | `error` / `warn` (per severity) |
| `message` | Short operation-named description |
| `error_code` | Stable code (e.g. `wallet_insufficient_funds`, `auth_invalid_token`) |
| `error` | The wrapped chain (`String(err)` / `err.stack`) |
| `request_id` | Correlation across services |
| `trace_id` / `span_id` | When OTel is wired |
| `user_id` | When in user context |
| `organization_id` / `tenant_id` | When in multi-tenant context |
| `resource_id` | The id of the entity being operated on |
| `duration_ms` | When the failure is timing-sensitive |
| `attempt` | When inside a retry loop |

Banned: `log.error("failed")`, `log.error(err)`, `console.log(e)`.
Required: the field set above, populated from the AsyncLocalStorage
/ context.Context / trace span the request created.

### 3. The error code is a stable contract

`error_code` is part of the API contract. Clients map codes to UX:

- `wrong_cell` → toast + no retry
- `2fa_required` → redirect to enrollment
- `plan_gate` → upgrade dialog
- `rate_limited` → backoff toast
- `validation_failed` → inline field error with `details`

Once published, codes don't change. New cases get new codes. The
list of codes lives in the project's `docs/error-codes.md` (or
equivalent) so frontend + backend agree on every code.

### 4. The user-visible message is actionable

The HTTP response body (or RPC response, or websocket frame)
carries the shape:

```jsonc
{
  "error_code": "wallet_insufficient_funds",
  "message": "Not enough balance to complete this purchase.",
  "details": { "required": 5000, "available": 3200, "currency": "USD" }
}
```

`message` is plain English (or i18n key) the client can render
verbatim. `details` is optional structured payload the client uses
to enrich the UI ("required X, you have Y"). The frontend NEVER
renders a generic "Something went wrong" when the server provided
a real message.

### 5. Server side: the THREE deliverables on every failure

Per `no-silent-failures.md`, every server-side failure produces ALL
THREE of:

1. **Structured log entry** (per rule 2)
2. **EMF / Prometheus / OTel metric** with the same `error_code`
   tag (for alerting and dashboards)
3. **Typed HTTP / RPC response** with the error envelope above

Missing any one of the three = the failure is hidden from a
class of observers (logs, metrics, or users).

### 6. Client side: the THREE deliverables on every failure

Per `no-silent-failures.md` rule 7, every client-side caller in a
user-facing path produces ALL THREE of:

1. **Browser / RUM log entry** with the `error_code` + relevant
   request context (route, action, user-visible ids)
2. **User-visible surface** (mandatory — pick one that matches
   the context):
   - `toast.error` / `toast.warning` — transient feedback after
     an explicit action
   - **Inline validation error** anchored to the offending field,
     ARIA-wired (`aria-describedby`, `aria-invalid`), focus moves
     to the first invalid field
   - **Banner** at the top of the route / section — cross-cutting
     failure (auth expired, network down, plan-tier gate)
   - **Empty / error state swap** in the affected list / grid /
     panel
   - **Status indicator** transitioning visibly out of `pending`
     into `error` with actionable copy + retry affordance
   - **Modal / dialog** for destructive or confirmation-bound
     failures
3. **Typed return** (boolean / discriminated result) so the view
   can branch (success path vs failure path) instead of guessing

**Banned shapes** (each is a rule violation, even when the log
entry exists):

- Catching the error + returning early without surface
- Rendering "Something went wrong" when the server provided a
  real `error_code` + `message` (per `error-codes.md` — codes
  map to specific i18n copy via the central `useApiError`
  composable / hook)
- A spinner that never resolves
- ErrorBoundary catch-all as the FIRST surface — it's the last
  resort, not the per-action UX
- A `throw` inside a Promise chain with no downstream `.catch`
  routing to the UX

The same rule applies to **mobile + Swift + Dart** clients:
snackbar / alert / inline error + log + rollback.

### 7. Never lose the cause chain

Wrapping an error must PRESERVE the original — never
`fmt.Errorf("failed: %v", err)` (no `%w`), never
`raise NewError("failed: " + str(e))` (no `from`), never
`throw new Error("failed")` (no `cause`). The downstream handler
needs `errors.Is` / `errors.As` / `instanceof` / `try/except` to
work at every depth.

### 8. Inner errors are sanitized at the boundary

The server log keeps the full wrapped chain including stack
traces and any sensitive data (file paths, internal usernames,
DB error messages). The client response strips all of that — the
client sees only `error_code` + `message` + sanitized `details`.
Never leak internal stack traces, DB error messages, or file
paths through the HTTP response.

### 9. Per-language enforcement

| Language | Tooling | What it catches |
| --- | --- | --- |
| Go | `errcheck`, `errorlint`, `wrapcheck` | Bare `return err` without wrap; `==` against sentinel errors |
| TypeScript / JavaScript | `eslint-plugin-promise`, `no-throw-literal` | Throwing non-Error values; missing `cause:` on rethrow |
| Python | `ruff` rules `TRY003`, `TRY400`, `BLE001` | Blind except, missing `from err`, `logging.error` without `exc_info` |
| Java / Kotlin | `errorprone`, `pmd` | Swallowed exceptions, missing cause in wrapping constructor |
| Ruby | `rubocop-rails` `Lint/RescueException` | Bare rescue, missing `cause:` |
| Rust | `clippy::map_err_ignore` | Swallowed `Result::Err` via `_` ignore |

The lint command runs in CI (per `extreme-lint-policy.md`); a
context-free error path fails the build.

### 10. Tests assert on the error code, not the message

```ts
// WRONG — brittle, breaks on copy edits
expect(err.message).toBe("Not enough balance to complete this purchase.");

// RIGHT — stable across copy edits
expect(err.code).toBe("wallet_insufficient_funds");
expect(err.details?.required).toBe(5000);
```

Tests against `error_code` survive UX copy changes; tests against
`message` break every time a writer edits the wording.

## Canonical Go handler shape

```go
func (h *Handler) DoThing(ctx context.Context, in DoThingInput) (DoThingOutput, error) {
    log := slog.With(
        "request_id", ctx.Value(requestIDKey),
        "user_id", in.UserID,
        "organization_id", in.OrgID,
        "operation", "DoThing",
    )

    if err := validate(in); err != nil {
        log.Warn("validation failed", "error", err, "error_code", "validation_failed")
        return DoThingOutput{}, errors.Wrap(err, "DoThing<userID=%s>: validate", in.UserID)
    }

    out, err := h.repo.Insert(ctx, in)
    if err != nil {
        if errors.Is(err, repo.ErrDuplicate) {
            log.Warn("duplicate", "error", err, "error_code", "duplicate_resource")
            return DoThingOutput{}, &APIError{Code: "duplicate_resource", Message: "Resource already exists", Status: 409}
        }
        log.Error("insert failed", "error", err, "error_code", "internal")
        return DoThingOutput{}, fmt.Errorf("DoThing<userID=%s>: insert: %w", in.UserID, err)
    }
    return out, nil
}
```

## Canonical TypeScript handler shape

```ts
export async function doThing(input: DoThingInput): Promise<DoThingOutput> {
  const log = logger.child({
    request_id: requestContext.id,
    user_id: input.userId,
    organization_id: input.orgId,
    operation: "doThing",
  });

  const validation = validate(input);
  if (!validation.ok) {
    log.warn("validation failed", { error: validation.error, error_code: "validation_failed" });
    throw new APIError("validation_failed", "Some fields are invalid.", 400, validation.details);
  }

  try {
    return await repo.insert(input);
  } catch (err) {
    if (err instanceof DuplicateError) {
      log.warn("duplicate", { error: err.message, error_code: "duplicate_resource" });
      throw new APIError("duplicate_resource", "Resource already exists.", 409, { cause: err });
    }
    log.error("insert failed", { error: String(err), stack: err instanceof Error ? err.stack : undefined, error_code: "internal" });
    throw new APIError("internal", "Something went wrong. Try again in a moment.", 500, { cause: err });
  }
}
```

## Cross-references

- `no-discards.md` — discards that drop errors are a context loss
- `no-silent-failures.md` — silent failures are this rule's
  inverse: no logging + no surfacing + no return signal
- `no-silent-drops.md` — half-finished error paths are silent
  drops of the failure case
- `observability-patterns` skill — structured logging + EMF +
  request-id propagation are the substrate this rule sits on
- `proper-fixes-first.md` — never silence an error path to make
  the symptom disappear
- `extreme-lint-policy.md` — error-handling lints are mandatory

## Why this rule exists

Error paths without context produce undebuggable production
failures. The on-call engineer's first hour goes to "where did
this happen, what was being attempted, what were the inputs" —
none of which the bare `error: failed` message answers. The cost
of adding context at write-time is one log line per layer; the
cost of adding it at debug-time is hours per incident.

User directive (verbatim): **"include error handling for with
context."**

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Bare `return err` / `raise X` / `throw e` without context wrap shipping (wrapping discipline weakening)
- Error chain lost on the way through a layer (`%v` instead of `%w`, no `from err`, no `cause:`)
- Test asserting on `message` instead of `error_code` (rule 10 enforcement weak)
- Error code drift — new codes added without updating `docs/error-codes.md` (registry-of-truth discipline weak)
- Sensitive data leaking through the client response envelope (sanitization at boundary missing)
- Same `error_code` reused with different semantics across services (taxonomy needs review)
- Log entry without `request_id` / `trace_id` / `error_code` (structured-fields discipline weak)

**Refinement candidates**:

- New error-code class entry when a recurring failure shape needs a stable code
- New required-field entry when a context dimension proves load-bearing in production debugging
- Tightening of the EXP test rubric on `error_code` assertions when chronic copy-fragile tests observed
- New per-language wrapping example when a language enters the rebuild

---

<!-- ============================================================
     Section: log-levels.md (from rules/common/)
     ============================================================ -->

# Log Levels Rule (Always-On, Global)

> Auto-fires on every file. Sister to `observability.md` (the
> structured-logging foundation), `error-handling-with-context.md`
> (logs carry the wrapped chain), `no-silent-failures.md` (every
> failure has a log entry), `security.md` (no PII in logs).

## Core Principle

**Every log entry has a level that signals SEVERITY +
INTENDED ACTION. Levels are not subjective — they map to
operational decisions: alert? ticket? aggregate? ignore-but-
keep-for-audit?  Misusing levels destroys their utility:
everything is INFO means nothing is INFO; everything is ERROR
means alerts never fire.**

## Level definitions (canonical)

| Level | Operational meaning | When to emit | Production filter |
| --- | --- | --- | --- |
| **FATAL / CRITICAL** | Service is dying; process about to exit | Process panic; unrecoverable startup failure; corrupt-state detected | ALWAYS logged; ALWAYS pages |
| **ERROR** | Genuine handler failure; user request didn't complete | Caught exception that propagates out; failed external call after retries; constraint violated when invariant assumed | ALWAYS logged; aggregated to alert if rate > threshold (per `observability.md` SLO) |
| **WARN** | Recoverable failure OR audit-worthy event | Transient error followed by retry; RBAC denial; deprecated API used; format mismatch routed to typed result | ALWAYS logged; tracked for trends; alert if rate spikes |
| **INFO** | Non-failure lifecycle / audit signal | Service-started; user logged in; audit-action-committed; outbox-published | ALWAYS logged at INFO+; dashboarded |
| **DEBUG** | Diagnostic detail for incident review | Cache-hit / cache-miss; per-step state transitions; SQL query parameters (sanitised) | OFF in production by default; toggle per-request via header (with auth) or per-deploy via env var |
| **TRACE** | Very-fine-grained per-call detail | Function entry / exit; loop iteration; every hash computation | OFF except in active debugging sessions |

## Hard rules

### 1. ERROR is reserved for "an alert should fire"

If you wouldn't want an alert when this happens, it isn't an
ERROR.

- A 500 from a handler? ERROR.
- A failed retry that then succeeded? WARN.
- A request validation failure? WARN (the client did
  something wrong; not a server bug).
- An expected branch in a retry loop? DEBUG.

Per `observability.md` rule 4 — alerts fire on SLO breach,
which is driven by ERROR-level rate. Mis-using WARN as ERROR
makes the SLO unmeasurable.

### 2. WARN is for "we recovered, but document it"

WARN is the most-mis-used level. The rule:

- Did the operation eventually succeed (after retry, fallback,
  alternate path)? → WARN
- Did the operation fail, but we mapped it to a typed result
  the caller knows how to handle (e.g., `validation_failed`,
  `not_found`)? → WARN
- Is this an audit signal (RBAC denial, deprecated-API use,
  format mismatch)? → WARN

NOT WARN:

- A bug we're going to fix soon (just an ERROR)
- A typo in a config (this is a FATAL at startup; if it
  surfaces at runtime it's an ERROR)

### 3. INFO is for "a thing happened that's part of normal

operation"

INFO is the audit + lifecycle level:

- Service started / stopped
- User logged in / logged out
- Order placed / payment received
- Cron tick executed
- Outbox published / consumed

INFO is high-volume; aggregate via metrics for trends, but
keep individual entries for audit.

### 4. DEBUG is for incident review, not active monitoring

DEBUG is OFF in production by default. When an incident
happens, on-call has TWO recovery paths to enable DEBUG:

- **Per-request**: `?debug=1` header (with admin auth) emits
  DEBUG for that request
- **Per-deploy**: environment variable flips DEBUG on for a
  named log scope (e.g., `LOG_LEVEL_AUTH=debug`); rolled
  back after the incident

NEVER enable DEBUG globally in production for routine work —
it floods the log pipeline + costs $$$.

### 5. Every log line includes structured fields

Per `observability.md` rule 2 — every log line is JSON with
required fields (`timestamp`, `level`, `service`, `version`,
`environment`, `request_id`, `trace_id`, `span_id`,
`user_id?`, `organization_id?`, `error_code?`, `error?`).

No freeform `console.log("hi")` — banned by `no-discards.md`.

### 6. Library-specific level mapping

| Stack | Level names |
| --- | --- |
| **Node.js (pino, winston)** | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| **Go (slog, zerolog, zap)** | `Error`, `Warn`, `Info`, `Debug` (no Fatal in slog by default — use `log.Fatal` or panic) |
| **Python (logging)** | `CRITICAL`, `ERROR`, `WARNING`, `INFO`, `DEBUG`, `NOTSET` |
| **Java / Kotlin (SLF4J / Logback)** | `ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE` |
| **Ruby (Rails Logger)** | `FATAL`, `ERROR`, `WARN`, `INFO`, `DEBUG` |
| **Rust (tracing)** | `ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE` |
| **Swift (os.log, swift-log)** | `fault`, `error`, `info`, `debug` |
| **.NET (Microsoft.Extensions.Logging)** | `Critical`, `Error`, `Warning`, `Information`, `Debug`, `Trace` |

The mapping is consistent enough that cross-language logs in
the same pipeline aggregate cleanly. Configure the project's
logger to emit the canonical names (lowercase recommended)
regardless of library quirks.

### 7. Sampling at TRACE / DEBUG

When TRACE is enabled in production (rare; should be per-
request), apply sampling:

- 1% of requests get TRACE
- Targeted by request_id (sticky once chosen)
- Sampling rate increases on alert (e.g., 50% during an
  active incident on the affected service)

### 8. Log volume is a cost; budget it

Per `observability.md` + `task-intake-due-diligence.md` Q16
(cost) — log ingestion costs $5-15 per GB depending on
vendor. Common offenders:

- INFO logs on every line of a tight loop (use metrics
  instead)
- DEBUG enabled globally (gate per scope)
- Stack traces on every WARN (only on ERROR)
- Verbose third-party library logs (filter at the source)

The budget is per-service, monitored, alerted when exceeded.

### 9. Never log secrets / PII

Per `security.md` A09 + `secrets-management.md`:

- Banned at every level: passwords, tokens, API keys, JWTs,
  cookies, full credit-card numbers, SSNs, full email
  addresses, IP addresses (in EU/GDPR jurisdictions —
  truncate)
- The PostToolUse `no-discards` hook blocks edits introducing
  these patterns
- Library-level redaction (e.g., pino's `redact` paths) is
  configured at logger init

### 10. Level escalation on retry

A failure that retries successfully:

```text
attempt 1: WARN "transient failure; retrying" + error_code
attempt 2: WARN
attempt N (success): INFO "succeeded after retries" + attempts: N
attempt N (final failure): ERROR
```

This gives operations visibility into retry storms without
firing alerts on transient blips.

## Anti-patterns

### Anti-pattern 1: Everything is ERROR

Routine validation failures logged as ERROR fire alerts +
exhaust the team's attention. Alerts stop being trusted.

### Anti-pattern 2: Everything is INFO

A real ERROR (handler crash, data corruption) is hidden in
the noise. SLOs can't fire because the signal can't be
extracted.

### Anti-pattern 3: WARN dumping ground

"It's not really an error, but it's not nothing" → WARN.
Result: WARN volume drowns the trend signals. WARN should
be SPECIFIC (recovery / audit / deprecation).

### Anti-pattern 4: DEBUG always on in production

Storage / ingestion cost balloons. Real signal gets lost.

### Anti-pattern 5: Free-text log messages

`log.info("user did the thing successfully")` — useless for
search, aggregation, or alerting. Use structured fields:
`log.info("user.action.completed", { user_id, action,
duration_ms })`.

## Cross-references

- `observability.md` rule 6 — log levels carry SLO + cost
  implications
- `error-handling-with-context.md` — every log entry's shape
- `no-silent-failures.md` — every failure has a log entry
- `security.md` A09 — no PII in logs
- `secrets-management.md` — no secrets in logs
- `extreme-lint-policy.md` — `no-console` rule enforces
  structured logger usage
- `no-discards.md` — `console.log` in production source is
  hook-rejected

## Why this rule exists

Levels are the protocol between dev (who emits) and ops
(who consumes). Without a stable level discipline:

- Alerts fire on routine events (ops loses sleep, then mutes
  alerts)
- Real errors hide in INFO noise (the next incident takes
  hours to root-cause)
- Cost balloons because DEBUG is on (every WARN dumps a stack
  trace)

Stable levels = predictable cost + alert fidelity + on-call
sanity.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- ERROR fired without an alert routing to on-call (rule 1 weakening — "ERROR reserved for alerts")
- WARN volume growing > N/min on a service without trend signal (rule 2 dumping-ground anti-pattern)
- INFO used for genuine handler failure (rule 3 violation — real error hidden)
- DEBUG enabled globally in production without per-scope gating (rule 4 violation)
- TRACE-level sampling absent in incident response (rule 7 weakening)
- Log line lacks the required structured fields (rule 5 weakening — sister `error-handling-with-context.md`)
- PII / secrets present in log entries (rule 9 violation)
- Retry storm produces only ERROR (no escalation from WARN through INFO on eventual success) — rule 10 weakening
- `console.log` / `print` / freeform `slog` introduced in product code (rule 5 violation — sister `no-discards.md`)
- Log ingestion cost crosses per-service budget without action (rule 8 weakening)

**Refinement candidates**:

- New per-library mapping row when a new logger surfaces (e.g., new structured logger in a niche language)
- Tightening of the WARN-vs-ERROR boundary when a recurring "what level is this?" decision class emerges
- New PII-redaction entry when a new sensitive field shape recurs (e.g., new identifier format, new biometric)
- New cross-reference when a sister rule (observability, audit-logging, error-codes) consumes the level taxonomy

---

<!-- ============================================================
     Section: semver.md (from rules/common/)
     ============================================================ -->

# Semantic Versioning Rule (Always-On, Global)

> Auto-fires on every file. Sister to `api-versioning.md` (when
> authored), `deprecation-lifecycle.md` (when authored),
> `updated-frameworks.md`, `dependency-vulnerabilities.md`,
> `docs-sync-with-code.md` (CHANGELOG kept current). Standards:
> **Semantic Versioning 2.0.0** (semver.org), **Conventional
> Commits 1.0.0** (drives version bumps), **Keep a Changelog 1.1.0**
> (release-notes format).

## Core Principle

**Every package, library, service, API, and tool that ships
versions follows Semantic Versioning 2.0.0 — three numbers
`MAJOR.MINOR.PATCH` carrying explicit promises about backwards
compatibility. Consumers can upgrade with confidence within a
major version and know to brace for change at a major bump.**

## What each number means

```text
MAJOR.MINOR.PATCH

MAJOR — breaking changes to the public API (consumers MUST update)
MINOR — backwards-compatible feature additions
PATCH — backwards-compatible bug fixes
```

Pre-release suffix: `1.2.3-rc.1`, `2.0.0-beta.4`, `3.1.0-alpha.7`
Build metadata: `1.2.3+20260526.git.abc1234` (does not affect
precedence)

## Hard rules

### 1. Version 0.x is special

Pre-1.0 releases (`0.x.y`) signal "API is unstable." Bumps can
break consumers at ANY level. Consumers depending on a 0.x
package MUST pin exact versions; range pins (`^0.5.2`) are
risky because npm/cargo/etc. interpret 0.x ranges
inconsistently.

When the public API stabilises, release `1.0.0`. Don't stay on
0.x indefinitely "because it's pre-stable" — the version
signals trust to consumers.

### 2. Bump rules (the contract)

| Change | Bump |
| --- | --- |
| Remove a public function / type / endpoint | MAJOR |
| Rename a public function / type / endpoint | MAJOR |
| Change a function signature (new required param, removed param, reordered params) | MAJOR |
| Change a public response shape (remove field, change field type) | MAJOR |
| Tighten a parameter constraint that previously allowed valid values | MAJOR |
| Drop support for a runtime / OS / browser version | MAJOR |
| Change default behaviour in a way callers can observe | MAJOR |
| Add a new public function / type / endpoint | MINOR |
| Add an optional parameter (with a default) | MINOR |
| Add a new field to a response | MINOR (per JSON additivity convention) |
| Loosen a constraint (accept more valid inputs) | MINOR |
| Deprecate (but don't remove) a public API | MINOR |
| Bug fix that doesn't change the documented contract | PATCH |
| Performance optimisation with no behaviour change | PATCH |
| Internal refactor with no public-API change | PATCH |
| Documentation-only update | PATCH (or no release, if not user-visible) |
| Security fix that doesn't change the contract | PATCH |

When a security fix REQUIRES a breaking change, ship the
patch fix on the OLD major + the breaking fix on the NEW
major; communicate the choice clearly.

### 3. Conventional Commits drive the version bump

Per the **Conventional Commits 1.0.0** spec, commit messages
have a structured prefix that maps to a version bump:

```text
feat: <description>          → MINOR bump
fix: <description>           → PATCH bump
docs: <description>          → PATCH (no release if internal)
style: <description>         → no release
refactor: <description>      → PATCH (internal refactor)
perf: <description>          → PATCH
test: <description>          → no release
chore: <description>         → no release
build: <description>         → PATCH if affects consumers
ci: <description>            → no release

feat!: <description>         → MAJOR bump (note the `!`)
fix!: <description>          → MAJOR bump
<type>(<scope>): description → same rules with optional scope
```

`BREAKING CHANGE:` in the commit body OR `!` after the type
triggers a MAJOR bump regardless of the type prefix.

This convention enables `semantic-release` (npm),
`release-please` (Google's tool), `cargo-release` (Rust), etc.
to auto-compute the next version from commit history.

### 4. CHANGELOG.md is the human-readable record

Per **Keep a Changelog 1.1.0**, every published release has a
CHANGELOG entry:

```markdown
# Changelog

## [Unreleased]

### Added
- Feature description.

### Changed
- Behaviour change description.

### Deprecated
- API marked deprecated; removal in MAJOR 3.0.0.

### Removed
- API removed (breaking).

### Fixed
- Bug description with issue / PR link.

### Security
- CVE-2026-XXXXX patched.

## [1.4.0] — 2026-05-26
### Added
- `getUserPreferences(userId, options)` — new options.includeArchived flag.

### Fixed
- Race condition in `flushCache()` when called concurrently.

[Unreleased]: https://github.com/example/proj/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/example/proj/compare/v1.3.0...v1.4.0
```

Sections (Added / Changed / Deprecated / Removed / Fixed /
Security) are standardised so tooling + humans can scan
predictably.

### 5. Pre-release identifiers are ordered

Per semver §11: `1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-beta <
1.0.0-rc.1 < 1.0.0`. Use the conventional sequence:

- `alpha.N` — internal testing
- `beta.N` — external beta testers
- `rc.N` — release candidate (no new features, only fixes)
- `final` — the released version (no suffix)

Skip `alpha` for low-risk features; `beta` for high-risk.

### 6. Build metadata is informational only

`+20260526.git.abc1234` doesn't affect precedence; it's a
human-readable build identifier. Useful for CI build numbers,
git SHAs, build dates. NOT for runtime feature gating.

### 7. Internal versioning for services

For services (not libraries), the version is usually:

- `MAJOR.MINOR.PATCH+<build>` where MAJOR.MINOR.PATCH follows
  semver based on the public API
- OR `<deploy-date>.<sequential>` for deploy tracking

Either works; the requirement is that the running service
exposes its version at `/version` or `/build-info`.

### 8. Pinning strategies for consumers

| Range | Behaviour | Recommended for |
| --- | --- | --- |
| `1.2.3` | Exact pin | Production lockfiles (auto-generated by `pnpm` etc.) |
| `~1.2.3` | Latest PATCH within 1.2.x | Security fixes auto-flow |
| `^1.2.3` | Latest MINOR within 1.x | Default for most deps |
| `*` | Latest anything | NEVER — drifts uncontrollably |
| `1.x` / `>=1.2.3 <2.0.0` | Equivalent to `^1.2.3` | Same |
| `>=1.2.3` | Anywhere including MAJOR bumps | NEVER outside lockfile |

For applications (top-level): `^1.2.3` for active deps;
lockfile pins exact. For libraries (mid-level): the
`peerDependencies` and `dependencies` ranges should be as
permissive as possible (`^1.2.3`) so they don't fight
consumers' resolutions.

### 9. Tagging + git workflow

Releases are git-tagged: `v1.2.3` (with the `v` prefix is
convention). Tags are signed (per `git-workflow.md` rule on
signed commits). The release notes from CHANGELOG are
duplicated into the GitHub Release for visibility.

Tag protection rules in branch protection prevent
unauthorized retagging.

### 10. Deprecation lifecycle precedes removal

Per the upcoming `deprecation-lifecycle.md`:

1. **Announce** — MINOR bump introducing deprecation notice
2. **Soft-deprecate** — emit warnings (runtime + lint), but
   the API still works. Calendar minimum 30 days.
3. **Hard-deprecate** — runtime errors but a clear "use X
   instead" message. Calendar minimum 60 days from soft.
4. **Remove** — MAJOR bump.

Going from Announce to Remove takes a MAJOR bump (or 2). Skip
steps only with explicit user override.

## Anti-patterns

### Anti-pattern 1: "Internal-only" versioning

A monorepo's internal packages aren't free from versioning —
even internal callers benefit from clear semver. Use
`workspace:*` references in pnpm for internal pinning, but
still maintain CHANGELOG + version numbers.

### Anti-pattern 2: MAJOR bump for "feels like a big release"

Marketing's "v2.0" is not the same as semver's `2.0.0`. Semver
is contractual; marketing version is editorial. They can match,
but the technical version must follow semver semantics
regardless of marketing.

### Anti-pattern 3: Quietly breaking changes inside a MINOR

or PATCH

Once a thing is in MINOR, you cannot change it in PATCH.
Strictly. Even one undocumented breaking change destroys
consumer trust + bumps the cost of the next upgrade.

### Anti-pattern 4: Skipping CHANGELOG for "minor releases"

Every published version has a CHANGELOG entry. Even patches.
If the entry is "no user-visible change," that's still an
entry.

### Anti-pattern 5: Releasing on a Friday

Per industry convention (and your on-call's preference):
release MAJOR bumps Mon-Wed. Don't ship breaking changes
before a weekend.

## Cross-references

- `updated-frameworks.md` — use latest STABLE; semver tells you
  whether a dep bump is safe
- `dependency-vulnerabilities.md` — security fixes follow
  semver (PATCH or MAJOR depending on whether contract changes)
- `dependency-overrides-not-exceptions.md` — `pnpm.overrides`
  uses semver ranges; choose `>= X.Y.Z` not exact pins
- `docs-sync-with-code.md` — CHANGELOG updated in same PR as
  the release
- `git-workflow.md` — release tags are signed; conventional
  commits drive bump computation
- `task-intake-due-diligence.md` Q18 (deprecation lifecycle)
  — deprecations follow semver

## Standards cited

- **Semantic Versioning 2.0.0** — semver.org
- **Conventional Commits 1.0.0** — conventionalcommits.org
- **Keep a Changelog 1.1.0** — keepachangelog.com
- **PEP 440** (Python) — compatible-with-semver variant
- **Go modules** — `+incompatible` suffix for pre-modules tags

## Why this rule exists

Without semver, every dependency bump is a leap of faith.
Consumers either pin exact (and miss security fixes) or accept
range pins (and get broken in random builds). With semver,
consumers know:

- `1.x.y` → safe; auto-merge
- `2.0.0` → breaking; read CHANGELOG; plan migration

The cost of adhering to semver is one decision per release
("does this change the public contract?"). The cost of
ignoring it is broken consumers + lost trust.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Breaking change shipped as MINOR or PATCH (rule 2 violation — consumers silently broken)
- 0.x version pinned with caret range by consumers (0.x semantics misunderstanding)
- CHANGELOG missing entry for a published release (rule 4 weakening — anti-pattern 4)
- Conventional Commits convention violated (rule 3 weakening — auto-bump tooling breaks)
- Marketing "v2.0" published as semver `2.0.0` without genuine breaking changes (anti-pattern 2)
- Release tagged on a Friday for a MAJOR bump (anti-pattern 5)
- Pre-release suffix non-canonical (rule 5 violation — alpha / beta / rc ordering broken)
- Internal package treated as exempt from semver (anti-pattern 1)

**Refinement candidates**:

- New bump-rule row when an emerging change class is ambiguous (e.g., enum addition in serialised form)
- Tightening of the "release notes published with every version" requirement when CHANGELOGs drift
- New cross-reference when a sister rule (deprecation-lifecycle, api-versioning) prescribes companion semantics
- New ecosystem row when a language's range syntax gains adoption

---

<!-- ============================================================
     Section: extreme-lint-policy.md (from rules/common/)
     ============================================================ -->

# Extreme Lint Policy (Always-On, Global)

> Auto-fires on every file. Sister to `sonarlint-checks.md`,
> `no-discards.md`, `no-silent-failures.md`, `no-silent-drops.md`,
> `done-criteria.md`, `proper-fixes-first.md`. This rule sets the
> CEILING for lint strictness — projects may not relax it, only
> match or exceed it.

## Core Principle

**Lint rules run at maximum strictness across every language. Every
finding — at every severity level — is a blocker. Zero suppressions.
Zero per-line `disable` directives. Zero `// nosec` / `# noqa` /
`@SuppressWarnings`. The lint config is part of the codebase's
contract with itself: it states what the code MUST look like, not
what it MAY look like.**

If a rule is wrong for the project, the project's lint CONFIG
changes (with a recorded rationale + reviewer sign-off). The CODE
never carries a per-line suppression to bypass the rule.

## Mandatory linters per language

Every project that includes a language MUST run every linter in
its row. Missing linters = the project is mis-configured, not the
code.

| Language | Mandatory linters | Mode |
| --- | --- | --- |
| TypeScript | `tsc --strict --noEmit`, `eslint` with `@typescript-eslint/strict-type-checked` + `@typescript-eslint/stylistic-type-checked` + `sonarjs/recommended` + project plugins, `prettier --check`, `biome check` (where Biome replaces ESLint) | `--max-warnings 0` |
| JavaScript | `eslint` with `sonarjs/recommended` + `eslint-plugin-import` + `eslint-plugin-promise` + `eslint-plugin-security` + `prettier --check` | `--max-warnings 0` |
| Go | `go vet ./...`, `staticcheck ./...`, `golangci-lint run` (with the full `linters: enable-all` set minus documented per-project exceptions), `errcheck`, `errorlint`, `goimports`, `gofmt -s`, `gosec`, `nilerr`, `revive`, `unparam`, `wastedassign` | All errors |
| Python | `ruff check --select=ALL` (every rule on), `mypy --strict`, `pyright --strict`, `pylint --enable=all`, `bandit -r .` | All errors |
| Java | `checkstyle` (strict), `pmd` (full ruleset), `spotbugs`, `errorprone` (`-Werror`) | All errors |
| Kotlin | `ktlint`, `detekt` (full ruleset + type-resolution), `androidLint` (where applicable) | All errors |
| Ruby | `rubocop -A --enable-pending-cops` (every cop on), `brakeman -A` | All errors |
| Rust | `cargo clippy --all-targets --all-features -- -D warnings -W clippy::pedantic -W clippy::nursery -W clippy::cargo`, `cargo audit`, `cargo deny check` | `-D warnings` |
| C / C++ | `clang-tidy` with `*` (every check), `clang-format` strict, `cppcheck --enable=all`, `-Wall -Wextra -Wpedantic -Werror -Wconversion -Wshadow`, address/thread/UB sanitizers in test runs | All errors |
| C# | `dotnet format --verify-no-changes`, `dotnet build /warnaserror`, Roslyn analyzers full ruleset, SonarAnalyzer, StyleCop | `/warnaserror` |
| Swift | `swiftlint` strict + `swiftformat --lint`, `SwiftFormat --lint --strict` | All errors |
| Dart / Flutter | `dart analyze --fatal-infos --fatal-warnings`, `dart format --set-exit-if-changed` | All findings |
| Lua | `luacheck --no-cache --std max+busted` | All errors |
| SQL | `sqlfluff lint --dialect=<dialect>` strict ruleset | All errors |
| Bash | `shellcheck -S style` (style severity to surface everything), `shfmt -d` | All findings |
| Dockerfile | `hadolint --no-fail` -- but THEN the project pre-flight fails on ANY hadolint finding | All findings |
| YAML | `yamllint -d "{extends: default, rules: {line-length: {max: 200}}}"` | All errors |
| Markdown | `markdownlint-cli2` with the project's `.markdownlint.jsonc` | All warnings |
| Terraform / HCL | `terraform fmt -check`, `tflint --strict`, `tfsec`, `checkov` | All findings |
| GitHub Actions | `actionlint` strict | All findings |

Any language not in this table that the project uses MUST have the
equivalent strictest-available linter wired with the same "all
findings block" posture.

## Mandatory threshold settings (override the defaults DOWN)

The defaults that ship with most linters are calibrated for
gradual adoption. This rule overrides them to extreme settings:

| Threshold | Default | Extreme |
| --- | --- | --- |
| Cognitive complexity (Sonar S3776) | 15 | 10 |
| Cyclomatic complexity | 10 | 7 |
| Function lines (Sonar S138) | 200 | 80 |
| Function parameters (Sonar S107) | 7 | 5 |
| File lines (Sonar S104) | 1000 | 500 |
| Class members (NCount) | 50 | 25 |
| Nested control-flow depth (Sonar S134) | 4 | 3 |
| Max line length (markdown / non-table) | varies | 100 |
| Coverage minimum (touched files) | varies | 90% |
| Coverage minimum (project) | varies | 80% |
| Boolean expression operators (Sonar S1067) | 3 | 2 |
| Single-character variables outside `i, j, k, _` | allowed | disallowed |
| Magic-number tolerance (Sonar S109) | builtin allowlist | 0, 1, -1, 2 only |

When a project's existing code can't yet meet these thresholds,
the project's lint config carries an EXPLICIT temporary override
in `.lint-debt.md` (or equivalent) listing every relaxed rule + its
target date for re-tightening. Per-line suppressions remain
forbidden.

## Zero suppression directives — anywhere

Every form of "shut the linter up for this line" is banned:

| Language | Banned tokens |
| --- | --- |
| TypeScript / JavaScript | `// eslint-disable*`, `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck`, `/* eslint-disable */`, `// biome-ignore *`, `// prettier-ignore` |
| Go | `//nolint*`, `//nosec*`, `//revive:disable*`, `//goerr113:noinspection` |
| Python | `# noqa*`, `# type: ignore*`, `# pylint: disable*`, `# pragma: no cover*`, `# bandit: skip*` |
| Ruby | `# rubocop:disable*`, `# brakeman:ignore*`, `# sorbet:ignore*` |
| Java | `@SuppressWarnings`, `// CHECKSTYLE:OFF`, `// PMD-NoSqlInjectionPMDCheck` |
| Kotlin | `@Suppress`, `@SuppressWarnings`, `// noinspection *`, `@SuppressLint` |
| C# | `#pragma warning disable*`, `[SuppressMessage]`, `// ReSharper disable*` |
| Swift | `// swiftlint:disable*`, `// swiftformat:disable*` |
| Rust | `#[allow(*)]`, `#[allow(clippy::*)]`, `#[cfg_attr(*, allow(*))]` |
| C / C++ | `#pragma clang diagnostic ignored`, `#pragma GCC diagnostic ignored`, `// NOLINT*`, `// NOSONAR` |
| Dart | `// ignore: *`, `// ignore_for_file: *` |
| SQL / sqlfluff | `-- noqa: *`, `-- sqlfluff:*` |
| Bash / shell | `# shellcheck disable=*` |
| Markdown | `<!-- markdownlint-disable* -->` |

When the linter is wrong for the project: fix the project lint
config and document the change. When the code is wrong: fix the
code. Never suppress.

## When the linter rule itself is wrong

Genuine cases exist (linter false positive, framework-required
pattern, language idiom the linter doesn't yet understand). The
fix is:

1. **Confirm** the rule is wrong by minimal reproduction (the
   smallest snippet that triggers the rule + the rationale for
   why the snippet is correct).
2. **Disable globally in the project config** with a comment
   block naming the rule id, the reason, the reviewer, and a
   re-evaluation date.
3. **Never disable per-line.** Even when "just this one place
   needs it" — that's a code-smell signal that either:
   - the rule needs a project-wide override, OR
   - the code can be restructured to comply, OR
   - the linter has a config option (e.g., allowlist) that
     handles the case without disabling.

## CI integration

Every project's CI:

- Runs every linter in this rule
- Fails on ANY finding (no `continue-on-error: true`, no
  `--exit-zero`)
- Surfaces the failure as a required status check (per
  `security-controls-org-wide.md`)
- Caches the linter binaries to keep runtime fast
- Re-runs the linter in the deploy pipeline as a pre-deploy gate
  (per `deploy-failures-become-checks.md`)

CI configuration that masks lint findings is itself a lint
violation. Reviewers reject `continue-on-error` on lint steps.

## Pre-commit hook

Every repo has a `.githooks/pre-commit` (enabled via `git config
core.hooksPath .githooks`) that runs the SAME lint commands CI
runs, scoped to the changed files. The hook is mandatory; bypass
via `--no-verify` is forbidden per the global rule on actions.

## Editor integration

Every supported IDE (VS Code, Cursor, JetBrains family, Windsurf,
Neovim, Emacs) gets a `.vscode/settings.json` / `.idea/inspection
profile.xml` / equivalent that:

- Points at the project's lint config
- Surfaces every finding inline
- Sets format-on-save = on (so format-blockers don't accumulate)
- Disables the IDE's "auto-suppress" features

## Verification block

When a file is touched, the verification block names the lint
sweep result:

```text
Lint sweep (this turn):
- tsc --strict --noEmit: 0 errors
- eslint <files>: 0 warnings (sonarjs + strict-type-checked)
- biome check: 0 warnings
- prettier --check: clean
- IDE diagnostics: 0
```

A line of "looks clean" or "lint passes" without the explicit
counts is NOT a lint sweep — it's an aspiration.

## Cross-references

- `sonarlint-checks.md` — the 269 SonarJS rules + cross-language
  equivalents (this rule mandates the strict subset of those)
- `no-discards.md` — discarded values are themselves a lint
  violation; the hook enforces them server-side
- `no-silent-failures.md` — empty catches, swallowed promises,
  silent fallbacks are lint violations
- `no-silent-drops.md` — TODO/FIXME/XXX, suppression directives,
  meta-comments are lint violations
- `done-criteria.md` — every "done" claim runs the full lint
  sweep this turn
- `proper-fixes-first.md` — never silence a lint finding to make
  the symptom go away
- `security-controls-org-wide.md` — the 5-layer enforcement
  pattern this rule plugs into

## Why this rule exists

Lint defaults are calibrated for gradual adoption — they tolerate
patterns that produce real defects (cognitive complexity 15,
function length 200 lines, parameters 7) because too-strict-by-
default would alienate existing codebases. A codebase building
new today does not need the gradual-adoption pacing; it benefits
from extreme defaults that catch defects at the earliest possible
moment.

User directive (verbatim): **"update lint rules extremely"**.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Per-line suppression attempted (`// eslint-disable`, `//nolint`, `# noqa`, etc.) — rule violation
- Linter config change that loosens a threshold instead of fixing code (escape-hatch pattern)
- Same lint class recurring across PRs in 30 days (developer-pattern signal — needs surfaced)
- New language entering the rebuild without a mandatory-linters row in the table (rule extension needed)
- Coverage threshold drift below 80% project / 90% touched (extreme-lint enforcement weak)
- CI lint step set to `continue-on-error` (rule violation — surface in `security-controls-org-wide.md` enforcement)
- Threshold (cognitive complexity, function length, parameters) creep above the strict cap on a class of functions (architectural smell)

**Refinement candidates**:

- New mandatory-linters row when a language gains presence in the rebuild
- New strict-threshold value when a default proves too loose for a class of bugs
- Tightening of the suppression-detection sweep when bypass patterns evolve
- New cross-reference when a sister rule's enforcement is the better home for a finding class

---

<!-- ============================================================
     Section: updated-frameworks.md (from rules/common/)
     ============================================================ -->

# Always-Updated Frameworks Rule (Global Default)

> Auto-fires on every file. Companion to `done-criteria.md`,
> `no-discards.md`, `no-silent-failures.md`, and `sonarlint-checks.md`.

## Core Principle

**Use the latest stable, security-supported, actively-maintained
version of every dependency in every file you touch. Never pin to a
deprecated, archived, EOL, or known-vulnerable version.**

Frameworks evolve to close CVEs, ship breaking-change deprecations, and
align with the surrounding ecosystem. A project that drifts a year
behind accumulates compounding hazards: known CVEs, missing
performance work, removed APIs the runtime no longer supports.

This rule is on by default. When you add an import, declare a
dependency, or pin a version, the chosen version MUST be the current
stable line. When you touch an existing pin, audit it — if it has
slipped behind, bump it as part of the work.

## Hard rules

1. **No archived packages.** If a package's repo is archived or the
   maintainer has tagged the project deprecated, switch to its
   community-maintained successor. Examples:
   - `github.com/dgrijalva/jwt-go` → `github.com/golang-jwt/jwt/v5`
     (CVE-2020-26160; original archived).
   - `github.com/golang/mock` → `go.uber.org/mock` (Uber maintains
     the fork; the original is archived).
   - `github.com/aws/aws-sdk-go` v1 → `github.com/aws/aws-sdk-go-v2`
     (v1 is deprecated; v2 is mandatory).
   - `github.com/jinzhu/gorm` v1 → `gorm.io/gorm` v2.
   - `node-sass` → `sass` (Dart Sass; node-sass is deprecated).
   - `request` (npm) → `undici` / `fetch` / `axios`.

2. **No EOL runtimes.** Go ≤ 1.21, Node ≤ 18, Python ≤ 3.9, Java ≤ 11,
   PHP ≤ 8.0, Ruby ≤ 3.1 are EOL or near-EOL. New code MUST target a
   currently-supported runtime. If you touch a file in a project on an
   EOL runtime, surface the migration to the user explicitly rather
   than silently writing code that depends on EOL features.

3. **No CVE-flagged versions.** Before pinning, check `govulncheck`,
   `npm audit`, `pip-audit`, `bundler-audit`, `composer audit`, or the
   equivalent for the language. Any HIGH or CRITICAL CVE must block
   the pin.

4. **Latest stable, not latest pre-release.** Pin to the most recent
   GA release of the current major. Do not pin to alpha / beta / RC /
   nightly unless the user explicitly asked for it AND the reason is
   documented in a comment near the pin.

5. **One major behind is the maximum drift.** If the ecosystem is on
   N, you may be on N-1 with a justification, but never N-2 or older.
   The justification lives in a project doc (`docs/dependencies.md`
   or `CHANGELOG.md`), not in code comments.

6. **Lock files are committed.** `go.sum`, `package-lock.json`,
   `pnpm-lock.yaml`, `yarn.lock`, `Pipfile.lock`, `poetry.lock`,
   `Gemfile.lock`, `composer.lock`, `Cargo.lock` — all checked in. CI
   fails if missing.

7. **Renovate / Dependabot enabled.** Every repo has automated
   dependency-update PRs on a weekly cadence. Security-tagged updates
   merge fast-track.

## What the rule applies to

| Layer | What "updated" means |
| ----- | -------------------- |
| Language runtime | Latest LTS / GA. Go 1.24+, Node 22 LTS, Python 3.12+, Java 21 LTS, .NET 8+, Ruby 3.3+, PHP 8.3+, Swift 5.9+, Rust stable |
| Web framework | Current stable: Next.js 16, React 19, Vue 3.5+, Nuxt 4, Angular 18+, Astro 5+, SvelteKit 2+ |
| Backend framework | Gin v1.10+, Echo v4+, Fastify v5, Express 5, Spring Boot 3, FastAPI ≥ 0.115, Django 5 LTS, Rails 7+ |
| Build tool | Vite 8+, Turbopack/Webpack 5, Rspack, Rollup 4, esbuild 0.24+, Vitest 2+ |
| Style framework | Tailwind v4, MUI v9, shadcn/ui current, Bootstrap 5.3+ |
| Database driver | `pgx/v5` over `lib/pq`; `mongo-go-driver` v2; latest `prisma`; latest `sqlx` |
| Test framework | `testing` + `testify` (Go), Vitest (TS), pytest (Py), JUnit 5 (Java), XCTest / swift-testing (Swift) |
| ORM / Query builder | GORM v2, Drizzle, Prisma 5+, SQLAlchemy 2, Hibernate 6, Diesel 2 |
| Cloud SDK | AWS SDK v2 (Go/Node/Python), Google Cloud SDK current, Azure SDK current |
| Container base image | Alpine current, Debian stable (bookworm+), distroless current; pinned by digest |
| Linter / formatter | `golangci-lint` v2+, `staticcheck` current, `ruff` current, `eslint` 9+, `prettier` 3+, `biome` 1.9+ |
| Type checker | `tsc` 5.5+, `pyright` current, `mypy` 1.x current |
| Browser engine | Playwright current, Puppeteer current (drop Selenium for new work unless cross-browser/Selenium-specific need) |
| Mobile | React Native 0.75+, Expo SDK 52+, Flutter stable, Kotlin Multiplatform stable |

## When you encounter a stale pin

The protocol:

1. **Investigate before bumping.** Read the changelog between current
   and latest. Are there breaking changes? Migration guides?
   Deprecations that affect call sites?

2. **Update as a discrete commit / PR.** Bump + adjust + tests. Do
   not bundle a dependency bump into an unrelated feature commit.

3. **Run the project's full test suite** (`-race` for Go,
   `--coverage` for TS) before pushing.

4. **Surface the migration to the user** when it's non-trivial. If
   the bump rewrites public types or removes APIs, the user should
   know — describe the blast radius and the affected files.

5. **Update CI matrix.** If CI tests against multiple language
   versions and the dependency drops support for an older one, update
   the matrix or add a justification.

## When the rule needs an exception

Genuine exceptions exist (a customer pin, an SDK that hasn't shipped
a 2.x yet, a deprecation that hasn't been migrated platform-wide).
The exception is documented:

- A short note in the project's `docs/dependencies.md` explains *why*
  this pin is pinned and *when* the migration will happen.
- The user is informed at the moment you discover the constraint —
  never silently work around it.

A `// keep on v1` comment in code is NOT documentation. The
justification lives where humans look for it.

## Cross-references

- `done-criteria.md` — every "done" claim runs the dep-CVE check.
- `sonarlint-checks.md` — S2068 (hardcoded credential), S5547 (weak
  hash), S5527 (disabled SSL cert verification) overlap with the
  CVE-flagged-versions rule.
- `security.md` — the dep-CVE gate sits in the same family as the
  broader OWASP / supply-chain hardening rules.
- `dependency-overrides-not-exceptions.md` — when a transitive
  dep is archived / abandoned, use overrides to force-upgrade the
  consumer; only request a documented exception as a last resort.

## How this rule pairs with workspace rules

This global rule states the principle (latest stable + no
abandoned deps). Workspace `CLAUDE.md` files codify the
project-specific pins + incidents that motivated each choice
(e.g., "JWT lib must be the maintained fork, not the archived
original"). The split keeps global guidance reusable across
workspaces while letting workspace files carry the concrete
package names a given codebase has burned on.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Archived / deprecated package added or kept on first-touch (Hard rule 1 violation)
- EOL runtime (Go ≤ 1.21, Node ≤ 18, Python ≤ 3.9) targeted by new code (Hard rule 2 violation)
- HIGH / CRITICAL CVE present in pinned version (Hard rule 3 violation — sister `dependency-vulnerabilities.md` gate weakening)
- Pre-release (alpha / beta / RC / nightly) pinned without documented user request (Hard rule 4 violation)
- Drift > 1 major behind ecosystem current (Hard rule 5 violation)
- Lockfile missing in committed tree (Hard rule 6 violation)
- Renovate / Dependabot not enabled on repo (Hard rule 7 violation — security PRs lag)
- "We'll bump it later" markers introduced (deferred-bump anti-pattern)

**Refinement candidates**:

- New row in the abandoned-deps table when a new archive surfaces (e.g., `node-postgres` ↔ `pg`, new SDK retirements)
- Tightening of the "one major behind maximum" cap when N-1 versions consistently carry security debt
- New cross-reference when a sister rule (dependency-overrides-not-exceptions, install-allowlist) provides the replacement workflow
- New layer row in the "what rule applies to" table when a new artifact class (browser extension, edge worker, IoT runtime) emerges

---

<!-- ============================================================
     Section: performance.md (from rules/common/)
     ============================================================ -->

# Performance + Model Selection (Always-On, Global)

> Auto-fires on every file. Sister to `model-tier-selection.md` (the CANONICAL
> model-selection policy) and the Council agent definitions in `~/.claude/agents/`.
> Model selection defers to `model-tier-selection.md`.

## Model selection → canonical in `model-tier-selection.md`

Model selection is owned by `model-tier-selection.md` — the capability-aware
ladders (role → best → floor), per-install availability with graceful
degradation, the Fable exclusions (security), and alias-vs-version behavior. Do
NOT maintain a second agent-model table here; that duplication is what went
stale. Sources of truth: that rule + each agent's `model:` frontmatter.

Alias-level summary (see the rule for the full ladders):

| Work | Tier alias |
| --- | --- |
| Strategic / long-horizon / hardest non-security | `fable → opus → sonnet` |
| Security & regulated review; deep + standard review; planning | `opus → sonnet` (Fable excluded from security) |
| Mechanical build/compile fixes + refactor | `sonnet → haiku` (the build-resolvers + `refactor-cleaner` are **sonnet**) |
| Search / docs / codemaps | `haiku → sonnet` |

Aliases (`opus` / `sonnet` / `haiku` / `fable`) auto-resolve to the current model
of each tier — today `opus` → `claude-opus-5`. Never pin a dated ID.

## Per-task escalation

Even with opus-by-default, some sessions benefit from explicit
escalation:

- **Architectural pivot mid-task**: stay on opus.
- **Cross-language migration** (e.g., Python → Rust port): opus,
  with extended-thinking budget raised.
- **Security incident response**: opus (`security-reviewer`).
- **Compliance / regulatory review**: opus (multi-step legal +
  technical analysis).
- **AI / ML ethics review**: opus.

## Context Window Management

Avoid the last 20% of the context window for:

- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower-context-sensitivity tasks (safe in the last 20%):

- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

When context fills, prefer:

1. **Strategic compaction** (per the `verification-loop` skill's
   "Strategic context management" section) at logical phase
   boundaries.
2. **Sub-agent delegation** — spawn an Agent (Explore / general-
   purpose) to do the next chunk in its own context window.
3. **Plan-file persistence** — write progress + state to
   `~/.claude/plans/<slug>.md` so the next session resumes
   without re-deriving context.

## Extended Thinking + Plan Mode

Extended thinking is enabled by default, reserving up to 31,999
tokens for internal reasoning.

Control extended thinking via:

- **Toggle**: Option+T (macOS) / Alt+T (Windows/Linux)
- **Config**: Set `alwaysThinkingEnabled` in `~/.claude/settings.json`
- **Budget cap**: `export MAX_THINKING_TOKENS=10000` (lift to
  31,999 for opus-heavy work)
- **Verbose mode**: Ctrl+O to see thinking output

For complex tasks:

1. Ensure extended thinking is enabled (on by default).
2. Enable **Plan Mode** for structured approach.
3. Use multiple critique rounds for thorough analysis.
4. Use split-role sub-agents for diverse perspectives.

## Build Troubleshooting

If build fails:

1. Use `build-error-resolver` (TS/JS/TSX) or `go-build-resolver`
   (Go) agent — both on opus.
2. Analyse error messages.
3. Fix incrementally per `proper-fixes-first.md` — root cause,
   not symptom.
4. Verify after each fix; never batch fixes that mask each other.

## Cross-references

- `~/.claude/agents/*.md` — every agent declares its `model:`
  in frontmatter
- `task-intake-due-diligence.md` Q16 (cost model) — task-level
  cost is part of the intake; opus-by-default sits in the
  context of the user's quality-first preference
- `extreme-lint-policy.md` — strictness thresholds the agents
  enforce
- `proper-fixes-first.md` — never trade quality for symptom-only
  fixes

## Why this rule exists

Multi-stack development (Go + TypeScript + Python + Java + SQL +
IaC) within a single session benefits from opus's broader
knowledge surface — quality drops between languages are visible
when a session pivots from one stack to another. Cost is a
secondary consideration; the user's explicit preference is quality
first, and the rule codifies that.

User directive (verbatim): **"use different models for things
they are good at and make code writing high quality but not too
expensive"** AND **"I prefer opus for the coding, reviewing and
planning. also remember we are dealing with multiple stacks /
languages"** — resolved as opus-by-default for coding / reviewing
/ planning agents, haiku for doc / codemap work, sonnet rarely
used.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New coding / reviewing / planning agent created with `model: sonnet` (opus-default policy weakening)
- New agent on `model: haiku` for non-mechanical work (haiku scope violation)
- Cross-language session pivots show quality drop (opus's broader knowledge surface not engaged)
- Context window > 80% full and no strategic compaction taken (context discipline weakening)
- Sub-agent delegation skipped when context filling rapidly
- Plan-file persistence skipped at logical phase boundaries (plan re-derivation cost incurred)
- Extended-thinking budget hit ceiling repeatedly without escalation to higher tier
- Build failure not delegated to `build-error-resolver` / `go-build-resolver` agent

**Refinement candidates**:

- New agent role row when a recurring expertise gap surfaces (e.g., Solidity reviewer, Terraform refactor specialist)
- Tightening of the haiku scope when a doc-class artifact proves to need depth (codemap quality drops)
- New escalation row when an agent's track record on a domain warrants per-task model bump (e.g., security-incident response → opus by default)
- New cross-reference when a sister rule (council-default, verification-loop skill) provides the canonical delegation flow

---

<!-- ============================================================
     Section: testing.md (from rules/common/)
     ============================================================ -->

# Testing Requirements (Always-On, Global)

> Auto-fires on every file. Sister to `done-criteria.md`,
> `extreme-lint-policy.md`, `tdd-workflow` skill, `tdd-guide`
> agent, `task-intake-due-diligence.md` (Q14 test strategy).

## Coverage thresholds (canonical)

Per `extreme-lint-policy.md` — the strictest values win across
all global rules:

- **Touched files**: ≥ **90%** line + branch coverage
- **Project total**: ≥ **80%** line + branch coverage
- **Critical paths** (auth, payments, data-mutation, multi-tenant
  isolation): ≥ **95%**

Previous global guidance used 70% (the gradual-adoption default
shipped with most frameworks). The strict version is now the
canonical baseline. Workspace-specific overrides may not relax
these — only raise them.

## Test types (ALL required for non-trivial work)

Per `task-intake-due-diligence.md` Q14:

1. **Unit tests** — every pure function / pure logic branch.
2. **Integration tests** — every external boundary (DB, queue,
   cache, third-party API mocked or recorded).
3. **Contract tests** — producer / consumer schema agreements
   (per the `api-design` skill's "Response-shape contracts" section).
4. **E2E tests** — every critical user journey (Playwright,
   Cypress, Detox, XCUITest per platform).
5. **Property-based tests** — invariants for parsers,
   validators, state machines.
6. **Load / performance tests** — for hot paths or new
   services.
7. **Chaos / fault-injection** — when the system claims
   resilience (retries, circuit breakers, failover).
8. **Security tests** — SAST + DAST + dependency-CVE + secret-
   scan in CI.
9. **Accessibility tests** — axe-core / pa11y / equivalent for
   every UI surface.

## Test-Driven Development (mandatory workflow)

Per `tdd-workflow` skill:

1. **RED** — write the failing test FIRST.
2. **VERIFY RED** — run the test; it must fail for the right
   reason (assertion fails, not import error).
3. **GREEN** — write the minimal implementation that makes the
   test pass.
4. **VERIFY GREEN** — run the test; it passes.
5. **REFACTOR** — improve the implementation; tests stay green.
6. **VERIFY COVERAGE** — coverage meets the threshold above.

Tests document intent. A passing test suite without code is a
specification; code without tests is a black box.

## Troubleshooting test failures

Per `proper-fixes-first.md`:

1. Delegate to `tdd-guide` agent.
2. Check test isolation (no shared state across tests).
3. Verify mocks are correct (they don't lie).
4. Fix the IMPLEMENTATION, not the test — unless the test is
   testing the wrong thing (rare).
5. If a test is genuinely flaky, quarantine + investigate;
   never weaken the assertion to make it green.

## Test files have NO exemption

Per `no-discards.md`, every value bound + every error handled
applies in test files too. Iterate by index (not range-over with
`_`), name every variable, assert on `error_code` not `message`
(per `error-handling-with-context.md` rule 10).

## Agent support

- **tdd-guide** — proactively for new features; enforces
  RED-GREEN-REFACTOR + the 90% / 80% coverage gate above
- **e2e-runner** — Playwright / equivalent E2E flows
- **code-reviewer** — flags missing tests in PR review

## Cross-references

- `extreme-lint-policy.md` — canonical coverage thresholds
- `done-criteria.md` — every "done" claim runs the test gate
- `tdd-workflow` skill — RED-GREEN-REFACTOR methodology
- `task-intake-due-diligence.md` Q14 — test strategy planned
  in the intake
- `api-design` skill ("Response-shape contracts" section) —
  contract tests between BE + FE shapes
- `error-handling-with-context.md` — assertions on
  `error_code`, not on copy-edit-fragile messages

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Coverage on touched files < 90% (canonical threshold violation)
- Project coverage < 80% (sister `extreme-lint-policy.md` weakening)
- Critical-path coverage < 95% (auth / payments / data-mutation / multi-tenant isolation)
- TDD RED-VERIFY skipped — test never confirmed to fail for the right reason (workflow weakening)
- Mocked external boundary used instead of recorded fixture / contract test (integration-test contract drift)
- Property-based test absent for a parser / validator / state machine (test-type gap)
- E2E test absent for a critical user journey (test-type gap)
- Test asserts on `message` instead of `error_code` (sister-rule violation — copy-edit fragility)
- Test file added with discards / suppression directives (no-discards weakening in test files)
- Flaky test quarantined without root-cause fix (TDD discipline weakening)

**Refinement candidates**:

- New test-type row when a recurring test class emerges (e.g., chaos test, fuzzing target, snapshot regression)
- Tightening of the critical-path coverage floor when a regression slips past 95%
- New cross-reference when a sister skill (django-tdd, springboot-tdd, swift-protocol-di-testing) extends test-type taxonomy
- New "test isolation" failure-mode template when a recurring shared-state contamination class appears

---

<!-- ============================================================
     Section: local-testability.md (from rules/common/)
     ============================================================ -->

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

# Local Dev Setup Rule (Always-On, Global)

> Auto-fires on every file. Sister to `local-testability.md`
> (every change must be locally testable BEFORE writing code),
> `secrets-management.md` (vault-based secrets), `docker-localhost-
> binding.md` (port binding), `documentation-requirements.md`
> (README + setup docs), `dependency-pinning.md` (reproducible
> versions), `task-intake-due-diligence.md` Q14.

## Core Principle

**A fresh-checkout developer must be running the system locally
within 30 minutes of `git clone`, using exclusively documented
commands. Setup is one script (or one container) — never a
multi-page README with surprise prerequisites. Local
configuration mirrors production wherever feasible; where it
differs, the differences are documented.**

A 4-hour setup ritual is a 4-hour productivity tax on every new
team member, every CI runner, every developer who switches
machines, and every contributor who tries the project. Frictionless
local dev pays for itself within weeks.

## Hard rules

### 1. One bootstrap command

The README's quick-start section ends with a single command that
produces a running system:

```bash
# Option A: dev container (preferred when available)
code . --reuse-window  # VS Code reopens in devcontainer

# Option B: bootstrap script
./scripts/bootstrap.sh

# Option C: package-manager-native
pnpm dev   # or `make dev`, `bun dev`, etc.
```

If the answer is "well, you also need to install X, Y, Z first,"
the script handles that — checking for presence + offering to
install (with user consent per `install-allowlist.md`).

### 2. Tool versions are pinned + enforced

Per `dependency-pinning.md`:

- `.nvmrc` / `.tool-versions` (asdf) / `.python-version` (pyenv)
- `Gemfile` Ruby version pin
- `go.mod` `go X.Y` directive
- `rust-toolchain.toml`
- `packageManager` field in `package.json` (Corepack)

Bootstrap script validates the active versions match the pinned
ones; if not, it warns + offers to switch via the version
manager.

### 3. Service dependencies via Docker Compose

Local DB, cache, queue, search index — all via `docker-compose.yml`
in the repo. Per `docker-localhost-binding.md`, every port is
loopback-bound:

```yaml
services:
  postgres:
    image: postgres:16.4-alpine@sha256:...
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_PASSWORD: dev-only-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.4-alpine@sha256:...
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

volumes:
  postgres_data:
```

`docker compose up -d` is the answer. `docker compose down -v`
resets state.

### 4. Secrets come from the vault, not from a checked-in file

Per `secrets-management.md`:

- `.env.example` lists every variable the app reads, with
  placeholder values
- `.env` is git-ignored
- `pnpm setup-env` / `make env` script:
  - For dev secrets: pulls from a shared dev vault (1Password,
    AWS Secrets Manager dev path, doppler)
  - For local-only secrets (DB password matching the
    docker-compose value): writes to `.env` with a comment
    explaining the origin
- `docs/secrets.md` documents every secret:
  - Local source (vault path / generated / Docker default)
  - Production source (per environment)
  - Rotation cadence

NEVER check in real secrets, even "for the demo." The dev
environment is no exception.

### 5. Database state is bootstrappable

`pnpm db:setup` (or equivalent) runs:

1. Apply all migrations
2. Seed reference data (lookup tables, plans, roles)
3. Seed demo data (a known set of users, orders, tenants for
   testing)

Seed scripts are idempotent (per `idempotency.md`); running
twice = same result.

For services with massive prod data, a "minimal" seed (smallest
set sufficient to exercise the system) plus an optional "rich"
seed (more representative). The README documents both.

### 6. Production parity where it matters; clear differences where it doesn't

| Aspect | Local | Production |
| --- | --- | --- |
| **Language runtime version** | Same (pinned) | Same |
| **OS** | Different (devs on macOS / Linux / Windows) | Linux |
| **Database engine** | Same (Postgres → Postgres) | Same |
| **DB tier** | Single container | Managed (RDS, Cloud SQL) |
| **Object store** | LocalStack S3 / MinIO | AWS S3 |
| **Cache** | Redis container | ElastiCache / Memorystore |
| **Search** | OpenSearch container | OpenSearch Service |
| **Auth** | Mock JWT issuer / Keycloak container | Cognito / Auth0 / Keycloak prod |
| **Email** | MailHog / Mailpit (catches outbound) | SES / SendGrid |
| **SMS** | Log-only adapter | Twilio |
| **Payments** | Stripe test mode | Stripe live |

Production-specific behaviour (real card processing, real SMS
delivery) is OFF locally; the code paths are exercised against
mock adapters that record + assert.

### 7. The verify script is one command

Per `done-criteria.md` + `extreme-lint-policy.md`:

```bash
pnpm verify   # OR: ./scripts/verify-local.sh
```

This runs:

1. Lint (every linter per `extreme-lint-policy.md`)
2. Type check
3. Unit tests
4. Integration tests
5. Build
6. License gate (per `license-allowlist-gate.md`)
7. CVE gate (per `dependency-vulnerabilities.md`)
8. Markdown lint
9. Security scan (gitleaks)
10. Docs link-check

The same script runs in CI. Local-vs-CI parity prevents "passes
locally, fails in CI" surprises.

### 8. Dev container as the canonical option

When the project supports a `.devcontainer/`:

- VS Code / Cursor / Codespaces / JetBrains Gateway open the
  project in the container
- The container has every tool pre-installed at the pinned
  versions
- Setup time → seconds (after first pull)
- Consistent across all developers; no "my machine is special"

Configuration:

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "myapp",
  "build": { "dockerfile": "Dockerfile" },
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "pnpm install && pnpm db:setup",
  "postStartCommand": "pnpm dev",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-azuretools.vscode-docker"
      ]
    }
  }
}
```

### 9. Cross-platform support

Developers on macOS, Linux, Windows (WSL2). Bootstrap script:

- Detects platform; routes to platform-specific steps
- Uses cross-platform tools (`pnpm`, `cargo`, `go`, `python`) —
  not Bash-only scripts that break on Windows native cmd
- Tests run on every platform in CI (matrix builds)

For Windows native (non-WSL2): document the WSL2-recommendation
or provide native instructions; don't leave it to the developer.

### 10. The setup is itself tested

CI includes a "fresh-clone bootstrap" job:

```yaml
- name: Test bootstrap
  run: |
    git clone . /tmp/fresh
    cd /tmp/fresh
    ./scripts/bootstrap.sh
    ./scripts/verify-local.sh
```

If bootstrap breaks, CI catches it BEFORE the next developer
tries to clone.

## Per-stack templates

### Node.js / TypeScript

```text
.
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
├── .nvmrc                  # node version
├── .npmrc                  # registry config
├── .gitignore
├── .env.example
├── docker-compose.yml      # dependent services
├── package.json
│   └── packageManager: "pnpm@10.4.0"
├── pnpm-lock.yaml
├── scripts/
│   ├── bootstrap.sh        # one-shot setup
│   ├── verify-local.sh     # same as CI
│   └── db-seed.ts
└── README.md
```

### Go

```text
.
├── .devcontainer/...
├── .tool-versions          # asdf-managed go version
├── .gitignore
├── .env.example
├── docker-compose.yml
├── go.mod
├── go.sum
├── Makefile                # bootstrap, dev, test, verify targets
└── README.md
```

`Makefile`:

```makefile
.PHONY: dev test verify bootstrap

bootstrap:
 @./scripts/bootstrap.sh
dev:
 @docker compose up -d
 @go run ./cmd/server
test:
 @go test -race -count=1 ./...
verify:
 @go vet ./...
 @staticcheck ./...
 @golangci-lint run ./...
 @govulncheck ./...
 @make test
```

### Python

```text
.
├── .devcontainer/...
├── .python-version         # pyenv
├── pyproject.toml          # poetry-managed
├── poetry.lock
├── docker-compose.yml
├── scripts/
│   ├── bootstrap.sh
│   └── verify-local.sh
└── README.md
```

### Mobile (React Native / Flutter)

- Native dev tools required (Xcode for iOS, Android Studio + SDK
  for Android)
- Bootstrap script checks for SDK presence + version
- Simulators / emulators documented (specific images, sizes)
- Bridging native module versions to JS via `Podfile.lock` (iOS)
  and `gradle.properties` (Android)

## Anti-patterns

### Anti-pattern 1: README that's a wiki

A README with 20 sections, each describing a different setup
quirk for a different OS / IDE / language version, is no
substitute for a script. The user reads the script, the script
HANDLES the quirks.

### Anti-pattern 2: Shared dev database

"Just connect to the staging DB for local dev" — no. Local must
be fully local-state. Reasons: data destruction risk in
staging, accidental PII access, network dependency for offline
work, parallel developer state corruption.

### Anti-pattern 3: Mock that's only-the-happy-path

Mock email adapter that just returns success teaches developers
to expect success — they never test the failure path. Mocks
should be configurable: success / failure / latency / specific
errors.

### Anti-pattern 4: Setup that requires production access

Bootstrap that calls a real cloud API (real S3 bucket, real
Auth0 tenant, real Stripe account) requires every developer to
have credentials + costs money + risks production. Use
LocalStack / MinIO / mock servers instead.

### Anti-pattern 5: 5-minute timer that's really 5 hours

If bootstrap claims "5 minutes" but actually takes 5 hours (long
docker pulls, OS-specific quirks, hidden post-install steps),
measure + publish the real time. The expectation gap is more
damaging than the duration.

### Anti-pattern 6: No teardown

`docker compose down -v` for full reset. `pnpm clean` for build
artifacts. `pnpm db:reset` for DB. Without these, devs end up
with "weird state" they can't diagnose.

## Documentation

The README's "Local development" section:

```markdown
## Local development

### Prerequisites

- Docker Desktop (or compatible Linux Docker)
- Node 22.4+ (we recommend `nvm`: `nvm use`)
- 4GB free disk + 4GB free RAM

### Setup

```bash
git clone https://github.com/example/repo.git
cd repo
./scripts/bootstrap.sh   # ~5 minutes on first run
pnpm dev                 # starts the app + dependencies
open http://localhost:3000
```text

### Common tasks

- `pnpm dev` — run with hot reload
- `pnpm test` — run the test suite
- `pnpm verify` — run everything CI runs
- `pnpm db:reset` — wipe + reseed the DB
- `docker compose down -v` — full teardown

### Troubleshooting

See [docs/local-dev-troubleshooting.md](docs/local-dev-troubleshooting.md).

```

## Cross-references

- `local-testability.md` — code must be locally testable BEFORE
  writing (this rule makes that possible)
- `secrets-management.md` — vault-based secret distribution
- `docker-localhost-binding.md` — loopback-bound ports
- `documentation-requirements.md` — README + setup docs
- `dependency-pinning.md` — version pinning
- `repo-setup-checklist.md` — first-touch checklist
- `done-criteria.md` — verify script gate
- `extreme-lint-policy.md` — lint gates
- `task-intake-due-diligence.md` Q14 (test strategy depends on
  local-testability)

## Standards cited

- **Dev Containers Specification** (containers.dev)
- **Twelve-Factor App** — Factor X (Dev/prod parity)
- **CommonMark** — README format
- **POSIX shell** — for portable bootstrap scripts

## Why this rule exists

A team's productivity is bounded by its slowest-onboarding
process. Local dev setup that takes weeks instead of hours
costs:

- Direct: new hires sit idle; existing devs lose time
  troubleshooting
- Indirect: the team avoids touching components that are hard to
  spin up; technical debt concentrates in the un-touched
  components
- Strategic: contributors don't contribute; OSS PRs stall;
  customers can't self-serve

Investment in local dev pays back perpetually. The bootstrap
script that takes one engineer-week to write saves five
engineer-weeks per quarter forever.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New repo's bootstrap takes > 30 minutes for a fresh-clone developer (rule 1 violation — frictionful first-run)
- Tool version not pinned via `.nvmrc` / `.tool-versions` / equivalent (rule 2 weakening)
- Service dependency not in `docker-compose.yml` (rule 3 weakening — implicit local install)
- Real cloud credentials required for local dev (rule 4 violation — secrets-on-disk drift)
- Secret checked-in to `.env` instead of populated from vault (rule 4 + `secrets-management.md` weakening)
- DB seed script not idempotent (rule 5 weakening)
- Local-vs-CI gate divergence (`pnpm verify` ≠ CI gate set) — rule 7 violation
- Dev container `postCreateCommand` broken on a fresh pull (rule 8 weakening)
- "Setup that requires production access" anti-pattern recurrence
- Bootstrap script not tested in CI (rule 10 weakening — fresh-clone CI job missing)

**Refinement candidates**:

- New row in the prod-parity table when a recurring service class (vector DB, search engine, ML model server) emerges
- Tightening of the bootstrap time budget when 30-min target consistently slips
- New cross-language template when a stack (React Native, Flutter, Tauri, Solidity) needs platform-specific bootstrap
- New "mock adapter" entry when a recurring external dep (real Stripe / Twilio / SendGrid) needs a documented local substitute

---
