---
name: typescript-patterns
description: TypeScript-specific idioms, type-system patterns, narrowing techniques, generics, branded types, and strictness flags. Auto-fires for `.ts` and `.tsx` files alongside `coding-quality-rules` to add TS-specific guidance the universal skill doesn't cover.
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.mts"
  - "**/*.cts"
  - "tsconfig*.json"
  - "**/tsconfig*.json"
---

# TypeScript Patterns

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> One source of truth per type. If `User`, `ApiError`,
> `PaginatedResponse<T>` already exists in `types/` / `lib/`,
> import it — never redeclare or redefine. Extend with a
> generic parameter, conditional type, or branded subtype —
> never fork the type into a near-duplicate. The same applies to
> runtime utilities: one `fetch` wrapper, one schema validator
> entry-point, one error envelope, one HTTP client factory.

TypeScript-specific patterns that go beyond universal `coding-quality-rules`. Use when the
type-system shape of the code is the question — discriminated unions, narrowing, branded types,
conditional types, exhaustiveness.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Strictness Baseline | [`references/strictness-baseline.md`](references/strictness-baseline.md) |
| Discriminated Unions Over Boolean Flags | [`references/discriminated-unions-over-boolean-flags.md`](references/discriminated-unions-over-boolean-flags.md) |
| Exhaustiveness With `assertNever` | [`references/exhaustiveness-with-assertnever.md`](references/exhaustiveness-with-assertnever.md) |
| Branded Types For Domain IDs | [`references/branded-types-for-domain-ids.md`](references/branded-types-for-domain-ids.md) |
| Narrowing Without `as` | [`references/narrowing-without-as.md`](references/narrowing-without-as.md) |
| `unknown`, Not `any`, In Catch Blocks | [`references/unknown-not-any-in-catch-blocks.md`](references/unknown-not-any-in-catch-blocks.md) |
| Const Assertions For Literal Types | [`references/const-assertions-for-literal-types.md`](references/const-assertions-for-literal-types.md) |
| Generics: Constrain First, Default Last | [`references/generics-constrain-first-default-last.md`](references/generics-constrain-first-default-last.md) |
| `satisfies` Over Annotations | [`references/satisfies-over-annotations.md`](references/satisfies-over-annotations.md) |
| Mapped Types For Bulk Transformations | [`references/mapped-types-for-bulk-transformations.md`](references/mapped-types-for-bulk-transformations.md) |
| Module Boundaries: `verbatimModuleSyntax` | [`references/module-boundaries-verbatimmodulesyntax.md`](references/module-boundaries-verbatimmodulesyntax.md) |
| Don't Re-Export Implementation As Types | [`references/don-t-re-export-implementation-as-types.md`](references/don-t-re-export-implementation-as-types.md) |
| Common Smells | [`references/common-smells.md`](references/common-smells.md) |
| Compliance & Standards Mapping | [`references/compliance-standards-mapping.md`](references/compliance-standards-mapping.md) |
| typescript/coding-style (migrated rule) | [`references/typescript-coding-style.md`](references/typescript-coding-style.md) |
| typescript/frontend-design (migrated rule) | [`references/typescript-frontend-design.md`](references/typescript-frontend-design.md) |
| typescript/hooks (migrated rule) | [`references/typescript-hooks.md`](references/typescript-hooks.md) |
| typescript/no-discards (migrated rule) | [`references/typescript-no-discards.md`](references/typescript-no-discards.md) |
| typescript/patterns (migrated rule) | [`references/typescript-patterns.md`](references/typescript-patterns.md) |
| typescript/security (migrated rule) | [`references/typescript-security.md`](references/typescript-security.md) |
| typescript/testing (migrated rule) | [`references/typescript-testing.md`](references/typescript-testing.md) |

## When to Activate

- Authoring or refactoring `.ts` / `.tsx` files
- Designing a public API surface (types are the contract)
- Eliminating `any` / `unknown` usage in legacy code
- Reviewing type-system safety on PRs
- Setting strictness flags in `tsconfig.json`

## Skill Chain

1. **coding-quality-rules** — universal naming, error handling, immutability
2. **typescript-patterns** — this skill (TS-specific)
3. **frontend-patterns** or **backend-patterns** — runtime shape (Vue / Node)
4. **security-review** — auth, input validation, secret hygiene

## Purpose

TypeScript-specific idioms for type-safety-first code: discriminated unions, branded types,
narrowing, generics, `satisfies`, never-narrowing, exhaustiveness checks, strict mode, and tooling
alignment (`tsc`, typescript-eslint, biome).

**Negative scope**: NOT framework-specific patterns (React / Vue / Next each have their own skill).
NOT runtime validation library catalogue (Zod / Valibot belong in `api-design` or
`backend-patterns`). NOT JavaScript-only patterns (use `coding-quality-rules`).

## When NOT to use

- Pure JavaScript projects with no migration plan
- Greenfield projects where adopting a stricter alternative (Effect-TS, ReScript, Gleam) is being
  evaluated
- Vanilla scripts / build tools where types add friction without payoff
- Library publishing where DTS-bundling decisions dominate (api-extractor, dts-bundle-generator)

## Standards Cited

- **TypeScript 5.6 Handbook** — `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Effective TypeScript 2e (Vanderkam, 2024)** — Item 13 (apparent type), Item 38 (any escape
  hatches)
- **typescript-eslint v8** — `strict-type-checked` preset
- **ECMAScript 2024 (ES15)** — language baseline TypeScript compiles to
- **TC39 Proposal: Records & Tuples (Stage 2)** — informs immutability discipline
- **OWASP ASVS 4.0.3 §5** — validation requires types at the boundary

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `any` as escape hatch | Disables type checking transitively; spreads through call chains | `unknown` + type guard; discriminated union |
| `as` cast hiding shape drift | Bypasses compiler; silent break when source shape changes | Type predicate `function isFoo(x: unknown): x is Foo` |
| Optional everywhere (`name?: string`) | Forces null-check noise downstream; types lie about reality | Make required when always present; discriminated union for "loaded vs not" |
| `Function` type or `() => any` | Loses argument + return types | Specific signature `(input: T) => U` |
| Numeric `enum` instead of string literal union | Larger output, harder to debug, can't tree-shake | `type Status = "pending" \| "paid" \| "shipped"` |
| `// @ts-ignore` / `// @ts-expect-error` without comment | Hides real errors; rots silently | Fix the underlying type; if unavoidable, comment with reason + ticket |
| `Object` / `{}` for "any object" | Includes primitives; allows anything | `Record<string, unknown>` or specific shape |
| Mutable types on shared state | Type system can't catch accidental mutation | `readonly` modifiers; `Readonly<T>`; `as const` literals |

## Verification Checklist

- [ ] `tsc --noEmit` exits 0 with `strict: true` + `noUncheckedIndexedAccess: true`
- [ ] Zero `any` types in shipped code (use `unknown` + narrow)
- [ ] No `as` casts except where a type predicate isn't possible
- [ ] Discriminated unions for "one of N states"
- [ ] Exhaustiveness check via `assertNever` in every closed `switch`
- [ ] Public API surface uses branded types for IDs (`UserId`, `OrgId`)
- [ ] `satisfies` used for config objects (preserves literal types AND validates shape)
- [ ] No `@ts-ignore` / `@ts-expect-error` without a ticket reference + removal date

## Cross-References

- `~/.claude/rules-library/typescript/no-discards.md` — banned TS patterns
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict TS lint config
- `~/.claude/rules-library/common/no-discards.md` — `console.log`, hardcoded creds, banned discards
- `~/.claude/skills/coding-quality-rules/SKILL.md` — language-agnostic floor
- `~/.claude/skills/frontend-patterns/SKILL.md` — TS in React / Vue context
- `~/.claude/skills/api-design/SKILL.md` — response-shape contracts via shared types
- `~/.claude/agents/code-reviewer.md` — TS review with severity findings

## Why this skill exists

TypeScript exists to catch shape bugs at compile time. Without disciplined strict-mode use, the type
system devolves into documentation that doesn't run:

- `any` spreads through call chains, silently invalidating downstream types
- `as` casts hide shape drift between backend + frontend (server returns `items`, code reads
  `events` → empty UI)
- Numeric enums emit runtime code that breaks tree-shaking
- Optional-everywhere types force null-check noise that hides the genuine "this is optional" cases
- Type predicates skipped → manual narrowing → `as` casts proliferate

Cost of strict-mode discipline: minutes per type definition. Cost of stale types pretending to
validate code: incidents that look like backend bugs but are frontend reading the wrong key.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `any` introduced where `unknown` + narrowing would work (sister `typescript/no-discards.md`
  rule 7)
- Type assertion `as T` used where a runtime guard / Zod schema would catch malformed input (rule 8)
- `// @ts-ignore` / `// @ts-expect-error` / `// @ts-nocheck` introduced (rule 5 violation)
- `tsconfig.json` strict-mode flags loosened (`noImplicitAny: false`, etc.)
- Discriminated union missing exhaustiveness check (`never` default branch absent)
- Branded type pattern abandoned where domain identity matters (e.g., `UserId` vs `OrgId` mixed)
- `Promise<any>` returned from public API
- `Readonly<>` wrapper missing on React props (sister `S6759`)

**Refinement candidates**:

- New strictness flag row when a new TS release ships (e.g., `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`)
- Tightening of the branded-type adoption when ID-confusion bugs recur
- New cross-reference when a sister rule (typescript/no-discards, sonarlint-checks) adds a
  TS-specific check
- New discriminated-union template when a recurring state-machine shape benefits from it

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: ~/.claude/rules-library/typescript/
     ============================================================ -->

## Migrated rules (rules-library/typescript/, 2026-06-02)

Phase H will delete the source files at `rules-library/typescript/`. Content below preserves the
original rule bodies for lazy-load via the `paths:` glob above.

---
