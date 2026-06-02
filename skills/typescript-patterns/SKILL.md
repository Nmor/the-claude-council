---
name: typescript-patterns
description: TypeScript-specific idioms, type-system patterns, narrowing techniques, generics, branded types, and strictness flags. Auto-fires for `.ts` and `.tsx` files alongside `coding-standards` to add TS-specific guidance the universal skill doesn't cover.
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.mts"
  - "**/*.cts"
  - "tsconfig*.json"
  - "**/tsconfig*.json"
---

# TypeScript Patterns

> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
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

- `~/.claude/rules-library/typescript/no-discards.md` — banned TS patterns
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict TS lint config
- `~/.claude/rules-library/common/no-discards.md` — `console.log`, hardcoded creds, banned discards
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

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: /Users/APPLE/.claude/rules-library/typescript/
     ============================================================ -->

## Migrated rules (rules-library/typescript/, 2026-06-02)

Phase H will delete the source files at `rules-library/typescript/`. Content below preserves the original rule bodies for lazy-load via the `paths:` glob above.

---

<!-- ============================================================
     Section: typescript/coding-style.md
     ============================================================ -->

---
paths:

- "**/*.ts"
- "**/*.tsx"
- "**/*.js"
- "**/*.jsx"

---

# TypeScript/JavaScript Coding Style

> This file extends [common/coding-style.md](../../rules-library/common/coding-style.md) with TypeScript/JavaScript specific content.

## Immutability

Use spread operator for immutable updates:

```typescript
// WRONG: Mutation
function updateUser(user, name) {
  user.name = name  // MUTATION!
  return user
}

// CORRECT: Immutability
function updateUser(user, name) {
  return {
    ...user,
    name
  }
}
```

## Error Handling

Use async/await with try-catch:

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error('Detailed user-friendly message')
}
```

## Input Validation

Use Zod for schema-based validation:

```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

const validated = schema.parse(input)
```

## Console.log

- No `console.log` statements in production code
- Use proper logging libraries instead
- See hooks for automatic detection

---

<!-- ============================================================
     Section: typescript/frontend-design.md
     ============================================================ -->

---
paths:

- "**/*.vue"
- "**/*.tsx"
- "**/*.jsx"
- "**/*.swift"
- "**/*.dart"
- "**/*.xaml"
- "**/views/**"
- "**/components/**"
- "**/pages/**"
- "**/layouts/**"
- "**/screens/**"
- "**/widgets/**"
- "**/*.css"
- "**/*.scss"
- "**/*.storyboard"
- "**/*.xib"

---

# Frontend Design Aesthetics

> Applies the visual-design quality bar to every UI surface. Works alongside `coding-style.md` and the `frontend-patterns` skill (which owns the visual-design guidelines in its "Visual design quality" section).

## Mandatory Design Checklist

When creating or modifying any visible UI:

- [ ] Intentional aesthetic direction chosen (not generic/default)
- [ ] Typography is distinctive (never Inter, Roboto, Arial, system-ui)
- [ ] Color palette is cohesive with CSS variables
- [ ] No cliched AI aesthetics (purple gradients on white, etc.)
- [ ] Layout has spatial intentionality (not cookie-cutter)
- [ ] Animations are purposeful and high-impact
- [ ] Visual details create atmosphere (not flat/lifeless)

## Skill Chain for Frontend Work

When working on frontend files, these skills activate together:

1. **frontend-patterns** — Component architecture, state management, hooks, performance, AND visual design quality (typography, color, motion, spatial composition)
2. **coding-standards** — Code quality, naming, structure, readability
3. **security-review** — XSS prevention in dynamic content/styling

All three must be satisfied before frontend work is considered complete.

---

<!-- ============================================================
     Section: typescript/hooks.md
     ============================================================ -->

---
paths:

- "**/*.ts"
- "**/*.tsx"
- "**/*.js"
- "**/*.jsx"

---

# TypeScript/JavaScript Hooks

> This file extends [common/hooks.md](../../rules-library/common/hooks.md) with TypeScript/JavaScript specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **Prettier**: Auto-format JS/TS files after edit
- **TypeScript check**: Run `tsc` after editing `.ts`/`.tsx` files
- **console.log warning**: Warn about `console.log` in edited files

## Stop Hooks

- **console.log audit**: Check all modified files for `console.log` before session ends

---

<!-- ============================================================
     Section: typescript/no-discards.md
     ============================================================ -->

# TypeScript / JavaScript — No-Discards Extension

> Auto-fires on every `*.ts`, `*.tsx`, `*.js`, `*.jsx`,
> `*.mts`, `*.cts`, `*.mjs`, `*.cjs` file. Extends
> `~/.claude/rules-library/common/no-discards.md` with TS/JS-specific
> patterns. Sister to `extreme-lint-policy.md`,
> `no-silent-failures.md`, `error-handling-with-context.md`.
> Tooling: `tsc --strict`, `eslint` with `@typescript-eslint/strict-
> type-checked` + `sonarjs/recommended`, `biome`, `prettier`.

## Core Principle (TS/JS-specific restatement)

**Every Promise has handlers; every return value is bound; every
catch block names + handles the error; every type assertion is
justified. The TypeScript type system + ESLint are configured at
maximum strictness, and per-line suppressions (`// @ts-ignore`,
`// eslint-disable-line`) are banned.**

The dynamic shape of JS makes silent failures easy: a promise
without `await` runs anyway; a discarded value is just a
sub-expression; `any` propagates type holes. TypeScript + strict
ESLint + the rules below close these failure modes.

## Banned patterns

### 1. Destructuring discards

```typescript
// FORBIDDEN — `,` skips a position
const [, second] = pair;
const [first, , third] = triple;
const { unused: _, ...rest } = obj;

// CORRECT
const [first, second] = pair;
const { wanted, ...rest } = obj;
const second = pair[1];  // explicit indexing if only one slot needed
```

### 2. Empty / silent catch blocks

```typescript
// FORBIDDEN
try { thing(); } catch {}
try { thing(); } catch (_) {}
try { thing(); } catch { /* fall back */ }

// CORRECT
try {
  thing();
} catch (err) {
  log.warn('thing failed', { error: String(err) });
  throw new ApplicationError('thing failed', { cause: err });
}
```

### 3. Silent `.catch()` returns

```typescript
// FORBIDDEN — all forms silently swallow errors
foo().catch(() => {});
foo().catch(() => null);
foo().catch(() => undefined);
foo().catch(() => false);
foo().catch(() => '');

// CORRECT
foo().catch((err) => {
  log.warn('foo failed', { error: String(err) });
});
```

If the error is user-actionable, route to toast + state per
`no-silent-failures.md`.

### 4. Fire-and-forget `void`

```typescript
// FORBIDDEN — discards both the success AND the rejection
void store.save();
void someAsync();

// CORRECT — handle rejection
store.save().catch((err) => log.warn('save failed', { error: String(err) }));

// CORRECT — effect cleanup pattern
useEffect(() => {
  let cancelled = false;
  store.save().catch((err) => {
    if (!cancelled) log.warn('save failed', { error: String(err) });
  });
  return () => { cancelled = true; };
}, []);
```

### 5. `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck`

NEVER. The TypeScript compiler is right; the code is wrong. Fix
the type or the code.

```typescript
// FORBIDDEN
// @ts-ignore
const result = riskyCast(input);

// CORRECT — narrow with a runtime guard
function isExpectedShape(x: unknown): x is ExpectedShape {
  return typeof x === 'object' && x !== null && 'field' in x;
}

if (isExpectedShape(input)) {
  const result = input.field;
}
```

### 6. `// eslint-disable*`

NEVER. If the lint rule is wrong for the project, change the
project config (per `extreme-lint-policy.md`). NEVER per-line.

### 7. `any` type

```typescript
// FORBIDDEN — `any` propagates type holes
function process(data: any) { ... }

// CORRECT — explicit `unknown` + narrow
function process(data: unknown) {
  if (!isExpectedShape(data)) {
    throw new TypeError(`expected ExpectedShape, got ${typeof data}`);
  }
  // data is now narrowed to ExpectedShape
  return data.field;
}
```

`@typescript-eslint/no-explicit-any: error` enforced.

### 8. Unsafe type assertions

```typescript
// FORBIDDEN
return JSON.parse(maybe) as ExpectedShape;
return (input as ExpectedShape).field;

// CORRECT — validated parsing
import { z } from 'zod';

const ExpectedShape = z.object({ field: z.string() });
const parsed = ExpectedShape.safeParse(JSON.parse(maybe));
if (!parsed.success) {
  log.warn('parse failed', { error: parsed.error });
  return null;
}
return parsed.data.field;
```

### 9. Unhandled promises

```typescript
// FORBIDDEN — promise just floats away
async function handler() {
  riskyAsync();   // forgotten await
  return ok;
}

// CORRECT
async function handler() {
  await riskyAsync();
  return ok;
}

// OR with deliberate fire-and-forget:
async function handler() {
  riskyAsync().catch((err) => log.warn('riskyAsync failed', { error: String(err) }));
  return ok;
}
```

`@typescript-eslint/no-floating-promises: error` enforced.

### 10. `console.*` in product code

```typescript
// FORBIDDEN in production source
console.log('debug');
console.error('something');

// CORRECT — use the structured logger
import { log } from '@/lib/logger';
log.debug('debug message', { context });
log.error('operation failed', err, { operation: 'op', ids: { userId } });
```

`no-console` ESLint rule enforced; only the logger module is
allowlisted.

### 11. Unused parameters / variables

```typescript
// FORBIDDEN — silencing with `_` prefix
function handler(_event: SubmitEvent) { ... }

// CORRECT — name the parameter; use it OR delete it
function handler(event: SubmitEvent) {
  event.preventDefault();
}

// Interface implementations that genuinely don't use a param:
// name it; if linter complains, the interface is over-specified
// — refactor the interface.
```

### 12. Hardcoded credentials

```typescript
// FORBIDDEN
const STRIPE_KEY = 'sk_live_4eC39Hq...';
const API_TOKEN = 'ghp_xxxxxxxxxxxx';

// CORRECT
import { config } from '@/config';
const STRIPE_KEY = config.stripe.secretKey;  // loaded from env / vault
```

The PostToolUse hook blocks edits introducing recognised key
prefixes.

### 13. `parseInt` / `parseFloat` without explicit base

```typescript
// FORBIDDEN
const n = parseInt(s);  // base ambiguous
const f = parseFloat(s);

// CORRECT
const n = Number.parseInt(s, 10);
const f = Number.parseFloat(s);

// OR
const n = Number(s);    // strictest — fails on non-numeric
```

### 14. `Array.prototype.sort()` without comparator on numbers

```typescript
// FORBIDDEN — string compare yields [1, 10, 2]
[1, 2, 10].sort();

// CORRECT
[1, 2, 10].sort((a, b) => a - b);

// CORRECT for arrays of strings (default sort is OK)
['banana', 'apple'].sort();
```

### 15. React-specific (when `*.tsx`)

```typescript
// FORBIDDEN — array index as key
{items.map((item, i) => <Item key={i} {...item} />)}

// CORRECT
{items.map((item) => <Item key={item.id} {...item} />)}

// FORBIDDEN — context value re-creates every render
<Context.Provider value={{ user, setUser }}>...</Context.Provider>

// CORRECT
const ctx = useMemo(() => ({ user, setUser }), [user]);
<Context.Provider value={ctx}>...</Context.Provider>

// FORBIDDEN — useState setter buried in useEffect for reset
useEffect(() => { setX(prop); }, [prop]);

// CORRECT — derived value with tracked prop
const x = useTrackedProp(prop);

// FORBIDDEN — readonly props
function MyComp({ items }: { items: Item[] }) { ... }

// CORRECT
function MyComp({ items }: Readonly<{ items: Item[] }>) { ... }

// FORBIDDEN — React.FormEvent (deprecated in React 19)
function onSubmit(e: React.FormEvent<HTMLFormElement>) { ... }

// CORRECT
function onSubmit(e: SubmitEvent<HTMLFormElement>) { ... }
```

## Required linters (TS/JS-side gates)

Per `extreme-lint-policy.md`:

```bash
tsc --noEmit                         # zero errors
eslint . --max-warnings 0            # zero warnings
prettier --check .                   # formatting
biome check . --error-on-warnings    # alternative to eslint
```

`eslint.config.js` (minimum):

```js
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import importPlugin from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import unicorn from 'eslint-plugin-unicorn';
import security from 'eslint-plugin-security';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    files: ['**/*.{ts,tsx,js,jsx,mts,cts}'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      sonarjs.configs.recommended,
      importPlugin.configs.recommended,
      promise.configs.recommended,
      unicorn.configs.recommended,
      security.configs.recommended,
      jsxA11y.configs.strict,
    ],
    languageOptions: {
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      'no-console': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^$' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      'sonarjs/cognitive-complexity': ['error', 10],
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      'no-restricted-syntax': [
        'error',
        // silent .catch() patterns
        {
          selector: "CallExpression[callee.property.name='catch'][arguments.0.body.type='BlockStatement'][arguments.0.body.body.length=0]",
          message: 'Empty .catch() swallows errors silently.',
        },
        {
          selector: "CallExpression[callee.property.name='catch'][arguments.0.body.type='Literal']",
          message: 'Returning a literal from .catch() is a silent fallback.',
        },
        // `void` as fire-and-forget
        {
          selector: "UnaryExpression[operator='void'][argument.type='CallExpression']",
          message: 'void on a call discards the rejection; chain .catch() instead.',
        },
      ],
    },
  },
);
```

`tsconfig.json` strict mode:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## Verification block (TS/JS-side)

```text
TS lint sweep (this turn):
  - tsc --noEmit: 0 errors
  - eslint . --max-warnings 0: 0 warnings
  - prettier --check: clean
  - sonarjs/recommended: 0 issues
  - IDE diagnostics: 0
  - Test coverage on touched files: 92%
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md` — umbrella rule
- `~/.claude/rules-library/common/no-silent-failures.md` — silent failure
  shapes
- `~/.claude/rules-library/common/error-handling-with-context.md` —
  wrapping
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict lint
  config
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI patterns
- `~/.claude/rules-library/common/sonarlint-checks.md` — full SonarJS
  catalog

## Why this rule exists

TypeScript's escape hatches (`any`, type assertions, `@ts-ignore`)
make silent failures one keystroke away. The historical bug
classes:

- A promise without `await` rejected silently; downstream code
  read undefined where data should have been
- A type assertion `as User` hid that the API actually returned
  `null`; downstream NPE crashed the page
- An empty catch in a save flow showed success UX while the
  data never persisted
- A `console.log('debug')` left in production leaked PII into
  browser console + RUM tools
- A `(value as any)` propagated through 5 function calls before
  the type hole became a crash

Strict TypeScript + strict ESLint + the rules above close these
failure modes. The configuration is mechanical; the discipline
is to keep it at full strictness.

---

<!-- ============================================================
     Section: typescript/patterns.md
     ============================================================ -->

---
paths:

- "**/*.ts"
- "**/*.tsx"
- "**/*.js"
- "**/*.jsx"

---

# TypeScript/JavaScript Patterns

> This file extends [common/patterns.md](../../rules-library/common/patterns.md) with TypeScript/JavaScript specific content.

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

## Custom Hooks Pattern

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

## Repository Pattern

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```

---

<!-- ============================================================
     Section: typescript/security.md
     ============================================================ -->

---
paths:

- "**/*.ts"
- "**/*.tsx"
- "**/*.js"
- "**/*.jsx"

---

# TypeScript/JavaScript Security

> This file extends [common/security.md](../../rules-library/common/security.md) with TypeScript/JavaScript specific content.

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

## Agent Support

- Use **security-reviewer** skill for comprehensive security audits

---

<!-- ============================================================
     Section: typescript/testing.md
     ============================================================ -->

---
paths:

- "**/*.ts"
- "**/*.tsx"
- "**/*.js"
- "**/*.jsx"

---

# TypeScript/JavaScript Testing

> This file extends [common/testing.md](../../rules-library/common/testing.md) with TypeScript/JavaScript specific content.

## E2E Testing

Use **Playwright** as the E2E testing framework for critical user flows.

## Agent Support

- **e2e-runner** - Playwright E2E testing specialist

---
