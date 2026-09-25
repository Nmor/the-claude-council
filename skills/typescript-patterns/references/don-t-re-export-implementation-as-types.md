# typescript-patterns: Don't Re-Export Implementation As Types

> Covers **Don't Re-Export Implementation As Types** for the `typescript-patterns` skill. Routed
> from the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Don't Re-Export Implementation As Types

```ts
// WRONG — public surface accidentally exposes internal class
export { UserRepository } from "./repo";

// RIGHT — split: `User` is the public type; `UserRepository` stays internal
export type { User } from "./types";
import { UserRepository } from "./repo";
```

Library consumers should import types, never your implementation classes.
