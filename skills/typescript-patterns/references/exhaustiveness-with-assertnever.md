# typescript-patterns: Exhaustiveness With assertNever

> Covers **Exhaustiveness With `assertNever`** for the `typescript-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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

Adding a new variant later turns into a compile error at every switch — the type-system enforces
fan-out.
