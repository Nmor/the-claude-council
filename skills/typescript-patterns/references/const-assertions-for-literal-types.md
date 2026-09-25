# typescript-patterns: Const Assertions For Literal Types

> Covers **Const Assertions For Literal Types** for the `typescript-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Const Assertions For Literal Types

```ts
// type: string[]
const STATUSES = ["OPEN", "IN_PROGRESS", "DONE"];

// type: readonly ["OPEN", "IN_PROGRESS", "DONE"]
const STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;
type Status = (typeof STATUSES)[number]; // "OPEN" | "IN_PROGRESS" | "DONE"
```

Const-asserted arrays double as the type definition. Single source of truth.
