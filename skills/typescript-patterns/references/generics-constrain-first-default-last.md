# typescript-patterns: Generics: Constrain First, Default Last

> Covers **Generics: Constrain First, Default Last** for the `typescript-patterns` skill. Routed
> from the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
