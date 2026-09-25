# typescript-patterns: Narrowing Without as

> Covers **Narrowing Without `as`** for the `typescript-patterns` skill. Routed from the reference
> map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Narrowing Without `as`

Avoid `as` casts. They're unsound — TypeScript trusts you and stops checking. Narrow via control
flow instead:

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
