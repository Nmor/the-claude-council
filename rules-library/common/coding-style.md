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
