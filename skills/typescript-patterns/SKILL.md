---
name: typescript-patterns
description: TypeScript-specific idioms, type-system patterns, narrowing techniques, generics, branded types, and strictness flags. Auto-fires for `.ts` and `.tsx` files alongside `coding-standards` to add TS-specific guidance the universal skill doesn't cover.
---

# TypeScript Patterns

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
