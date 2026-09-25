# typescript-patterns: Mapped Types For Bulk Transformations

> Covers **Mapped Types For Bulk Transformations** for the `typescript-patterns` skill. Routed from
> the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Mapped Types For Bulk Transformations

```ts
type Nullable<T> = { [K in keyof T]: T[K] | null };
type Patch<T>    = { [K in keyof T]?: T[K] };
type Readonly<T> = { readonly [K in keyof T]: T[K] };
```

Don't write 30 mostly-similar interfaces by hand. Map them.
