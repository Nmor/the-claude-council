# typescript-patterns: Common Smells

> Covers **Common Smells** for the `typescript-patterns` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
