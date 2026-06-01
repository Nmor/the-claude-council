# TypeScript / JavaScript — No-Discards Extension

> Auto-fires on every `*.ts`, `*.tsx`, `*.js`, `*.jsx`,
> `*.mts`, `*.cts`, `*.mjs`, `*.cjs` file. Extends
> `~/.claude/rules/common/no-discards.md` with TS/JS-specific
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

```
TS lint sweep (this turn):
  - tsc --noEmit: 0 errors
  - eslint . --max-warnings 0: 0 warnings
  - prettier --check: clean
  - sonarjs/recommended: 0 issues
  - IDE diagnostics: 0
  - Test coverage on touched files: 92%
```

## Cross-references

- `~/.claude/rules/common/no-discards.md` — umbrella rule
- `~/.claude/rules/common/no-silent-failures.md` — silent failure
  shapes
- `~/.claude/rules/common/error-handling-with-context.md` —
  wrapping
- `~/.claude/rules/common/extreme-lint-policy.md` — strict lint
  config
- `~/.claude/rules/common/no-ambient-globals.md` — DI patterns
- `~/.claude/rules/common/sonarlint-checks.md` — full SonarJS
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
