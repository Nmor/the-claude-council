# typescript-patterns: unknown, Not any, In Catch Blocks

> Covers **`unknown`, Not `any`, In Catch Blocks** for the `typescript-patterns` skill. Routed from
> the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
