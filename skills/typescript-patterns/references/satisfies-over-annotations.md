# typescript-patterns: satisfies Over Annotations

> Covers **`satisfies` Over Annotations** for the `typescript-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## `satisfies` Over Annotations

Use `satisfies` to validate a value matches a type without widening:

```ts
const colors = {
  ok: "green",
  error: "red",
} satisfies Record<string, "green" | "red" | "blue">;

colors.ok; // type: "green" — narrow literal preserved
```

A plain annotation (`: Record<...>`) widens `colors.ok` to `"green" | "red" | "blue"`. `satisfies`
keeps the literal while still validating shape.
