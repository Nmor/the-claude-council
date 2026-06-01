---
name: typescript-patterns
description: TypeScript-specific idioms, type-system patterns, narrowing techniques, generics, branded types, and strictness flags. Auto-fires for `.ts` and `.tsx` files alongside `coding-standards` to add TS-specific guidance the universal skill doesn't cover.
---

# TypeScript Patterns

> **Reuse-first** (per `~/.claude/rules/common/reuse-first.md`):
> One source of truth per type. If `User`, `ApiError`,
> `PaginatedResponse<T>` already exists in `types/` / `lib/`,
> import it — never redeclare or redefine. Extend with a
> generic parameter, conditional type, or branded subtype —
> never fork the type into a near-duplicate. The same applies to
> runtime utilities: one `fetch` wrapper, one schema validator
> entry-point, one error envelope, one HTTP client factory.

TypeScript-specific patterns that go beyond universal `coding-standards`. Use when the type-system shape of the code is the question — discriminated unions, narrowing, branded types, conditional types, exhaustiveness.

## When to Activate

- Authoring or refactoring `.ts` / `.tsx` files
- Designing a public API surface (types are the contract)
- Eliminating `any` / `unknown` usage in legacy code
- Reviewing type-system safety on PRs
- Setting strictness flags in `tsconfig.json`

## Strictness Baseline

Every project should enable these in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true
  }
}
```

`strict` is non-negotiable. The other flags catch common bugs static analysis would otherwise miss; turn them on at project start, not later.

## Discriminated Unions Over Boolean Flags

Replace state objects with overlapping optional fields with a discriminated union. Each variant becomes a single shape, and the compiler enforces exhaustiveness.

```ts
// WRONG — every consumer has to remember which fields go together
interface Result {
  ok: boolean;
  data?: User;
  error?: string;
  retryAfterMs?: number;
}

// RIGHT — one shape per state; the compiler narrows on tag check
type Result =
  | { kind: "ok"; data: User }
  | { kind: "error"; error: string }
  | { kind: "throttled"; retryAfterMs: number };

function render(r: Result): string {
  switch (r.kind) {
    case "ok": return r.data.name;
    case "error": return r.error;
    case "throttled": return `retry in ${r.retryAfterMs}ms`;
    // No default — TS flags any new variant added later (S6486 equivalent).
  }
}
```

## Exhaustiveness With `assertNever`

When a switch must cover every variant, anchor it with a never-returning helper:

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}

switch (event.type) {
  case "created": return handleCreated(event);
  case "updated": return handleUpdated(event);
  case "deleted": return handleDeleted(event);
  default: return assertNever(event);
}
```

Adding a new variant later turns into a compile error at every switch — the type-system enforces fan-out.

## Branded Types For Domain IDs

Two strings of different meaning shouldn't be interchangeable. Brand them:

```ts
type OrgId = string & { readonly __brand: "OrgId" };
type UserId = string & { readonly __brand: "UserId" };

function makeOrgId(s: string): OrgId { return s as OrgId; }

function deleteUser(orgId: OrgId, userId: UserId): void { /* ... */ }

// deleteUser(userId, orgId); // ← compile error: argument order swapped
```

Cheap (no runtime cost), high-leverage (catches ID-mixup bugs at compile time).

## Narrowing Without `as`

Avoid `as` casts. They're unsound — TypeScript trusts you and stops checking. Narrow via control flow instead:

```ts
// WRONG
const user = req.body as User;

// RIGHT — use a runtime validator (Zod, Valibot, ArkType)
const user = UserSchema.parse(req.body); // throws on invalid; type is User

// RIGHT — type guard for in-process narrowing
function isUser(x: unknown): x is User {
  return typeof x === "object" && x !== null && "user_id" in x;
}
if (isUser(payload)) { /* `payload` is User here */ }
```

The single legitimate `as` is the brand-cast helper above. Treat every other one as a code smell.

## `unknown`, Not `any`, In Catch Blocks

Set `useUnknownInCatchVariables: true`. Then narrow:

```ts
try {
  await risky();
} catch (err) {
  // err is `unknown`
  const message = err instanceof Error ? err.message : String(err);
  logError("risky-failed", { message });
}
```

`any` would let you call `err.foo.bar.baz` and crash at runtime. `unknown` forces narrowing.

## Const Assertions For Literal Types

```ts
// type: string[]
const STATUSES = ["OPEN", "IN_PROGRESS", "DONE"];

// type: readonly ["OPEN", "IN_PROGRESS", "DONE"]
const STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;
type Status = (typeof STATUSES)[number]; // "OPEN" | "IN_PROGRESS" | "DONE"
```

Const-asserted arrays double as the type definition. Single source of truth.

## Generics: Constrain First, Default Last

```ts
// BAD — `T` could be anything; cast required at every call site
function pick<T>(rows: T[], key: string): T[K] { /* ... */ }

// GOOD — `K` constrained to keyof T; return type inferred
function pick<T, K extends keyof T>(rows: T[], key: K): T[K][] {
  return rows.map((r) => r[key]);
}

// pick(users, "name") — TS infers K, returns string[]
```

Constraints make generics useful. Defaults (`<T = unknown>`) only after constraints fail.

## `satisfies` Over Annotations

Use `satisfies` to validate a value matches a type without widening:

```ts
const colors = {
  ok: "green",
  error: "red",
} satisfies Record<string, "green" | "red" | "blue">;

colors.ok; // type: "green" — narrow literal preserved
```

A plain annotation (`: Record<...>`) widens `colors.ok` to `"green" | "red" | "blue"`. `satisfies` keeps the literal while still validating shape.

## Mapped Types For Bulk Transformations

```ts
type Nullable<T> = { [K in keyof T]: T[K] | null };
type Patch<T>    = { [K in keyof T]?: T[K] };
type Readonly<T> = { readonly [K in keyof T]: T[K] };
```

Don't write 30 mostly-similar interfaces by hand. Map them.

## Module Boundaries: `verbatimModuleSyntax`

Turn on `verbatimModuleSyntax` and use `import type` for type-only imports:

```ts
import type { User } from "./types.js";  // erased at runtime
import { saveUser } from "./users.js";   // emitted
```

Stops "value imports that are only used as types" from accidentally bundling, and surfaces dead value imports immediately.

## Don't Re-Export Implementation As Types

```ts
// WRONG — public surface accidentally exposes internal class
export { UserRepository } from "./repo";

// RIGHT — split: `User` is the public type; `UserRepository` stays internal
export type { User } from "./types";
import { UserRepository } from "./repo";
```

Library consumers should import types, never your implementation classes.

## Common Smells

| Smell | Fix |
| ----- | --- |
| `any` in a public signature | Replace with `unknown` + narrowing, or a generic |
| `as` cast that isn't a brand | Add a type guard or runtime validator |
| Two `string` params order matters but compiler can't tell | Brand them |
| `if (typeof x === "object")` without null check | `typeof x === "object" && x !== null` |
| `Object.keys(obj)` typed as `string[]` | Use `(Object.keys(obj) as Array<keyof typeof obj>)` only when you OWN the object |
| `// @ts-ignore` / `// @ts-expect-error` | Almost always fixable; if truly unfixable, use `@ts-expect-error` (it errors when no longer needed) |
| `Function` type | Use the precise signature: `(arg: T) => R` |

## Skill Chain

1. **coding-standards** — universal naming, error handling, immutability
2. **typescript-patterns** — this skill (TS-specific)
3. **frontend-patterns** or **backend-patterns** — runtime shape (Vue / Node)
4. **security-review** — auth, input validation, secret hygiene

## Purpose

TypeScript-specific idioms for type-safety-first code: discriminated unions, branded types, narrowing, generics, `satisfies`, never-narrowing, exhaustiveness checks, strict mode, and tooling alignment (`tsc`, typescript-eslint, biome).

**Negative scope**: NOT framework-specific patterns (React / Vue / Next each have their own skill). NOT runtime validation library catalogue (Zod / Valibot belong in `api-design` or `backend-patterns`). NOT JavaScript-only patterns (use `coding-standards`).

## When NOT to use

- Pure JavaScript projects with no migration plan
- Greenfield projects where adopting a stricter alternative (Effect-TS, ReScript, Gleam) is being evaluated
- Vanilla scripts / build tools where types add friction without payoff
- Library publishing where DTS-bundling decisions dominate (api-extractor, dts-bundle-generator)

## Standards Cited

- **TypeScript 5.6 Handbook** — `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Effective TypeScript 2e (Vanderkam, 2024)** — Item 13 (apparent type), Item 38 (any escape hatches)
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

- `~/.claude/rules/typescript/no-discards.md` — banned TS patterns
- `~/.claude/rules/common/extreme-lint-policy.md` — strict TS lint config
- `~/.claude/rules/common/no-discards.md` — `console.log`, hardcoded creds, banned discards
- `~/.claude/skills/coding-standards/SKILL.md` — language-agnostic floor
- `~/.claude/skills/frontend-patterns/SKILL.md` — TS in React / Vue context
- `~/.claude/skills/api-design/SKILL.md` — response-shape contracts via shared types
- `~/.claude/agents/code-reviewer.md` — TS review with severity findings

## Why this skill exists

TypeScript exists to catch shape bugs at compile time. Without disciplined strict-mode use, the type system devolves into documentation that doesn't run:

- `any` spreads through call chains, silently invalidating downstream types
- `as` casts hide shape drift between backend + frontend (server returns `items`, code reads `events` → empty UI)
- Numeric enums emit runtime code that breaks tree-shaking
- Optional-everywhere types force null-check noise that hides the genuine "this is optional" cases
- Type predicates skipped → manual narrowing → `as` casts proliferate

Cost of strict-mode discipline: minutes per type definition. Cost of stale types pretending to validate code: incidents that look like backend bugs but are frontend reading the wrong key.

## Compliance & Standards Mapping

- **ISO/IEC 25010:2011 §6** — Product quality model (Functional
  Suitability, Reliability, Performance Efficiency, Usability,
  Security, Maintainability, Portability, Compatibility)
- **ISO/IEC/IEEE 12207:2017 §6.4** — Software construction +
  verification + validation processes
- **NIST SP 800-218 SSDF §PW** — Produce Well-Secured Software
  (applies to every code-authoring skill)
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing +
  evaluation
- **OWASP ASVS 4.0.3 §V1.1** — Secure SDLC requirements
- **OWASP ASVS 4.0.3 §V14.2** — Dependency lifecycle
- **CWE Top 25 (2026)** — Weakness classes the patterns in this
  skill prevent
- **SLSA Framework v1.0 Build L2+** — Provenance + integrity

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- `any` introduced where `unknown` + narrowing would work (sister `typescript/no-discards.md` rule 7)
- Type assertion `as T` used where a runtime guard / Zod schema would catch malformed input (rule 8)
- `// @ts-ignore` / `// @ts-expect-error` / `// @ts-nocheck` introduced (rule 5 violation)
- `tsconfig.json` strict-mode flags loosened (`noImplicitAny: false`, etc.)
- Discriminated union missing exhaustiveness check (`never` default branch absent)
- Branded type pattern abandoned where domain identity matters (e.g., `UserId` vs `OrgId` mixed)
- `Promise<any>` returned from public API
- `Readonly<>` wrapper missing on React props (sister `S6759`)

**Refinement candidates**:
- New strictness flag row when a new TS release ships (e.g., `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Tightening of the branded-type adoption when ID-confusion bugs recur
- New cross-reference when a sister rule (typescript/no-discards, sonarlint-checks) adds a TS-specific check
- New discriminated-union template when a recurring state-machine shape benefits from it
