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
