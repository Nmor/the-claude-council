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
- `sonarlint-checks.md` — linter-level rules. S1135 (TODO) and S125 (commented-out code) interact directly with Rule 1 above.
- `~/.claude/scripts/hooks/lib/no-discards-rules.js` — the PostToolUse hook that auto-blocks meta-comments, suppression directives, and TODO/FIXME placeholders before they reach disk.
