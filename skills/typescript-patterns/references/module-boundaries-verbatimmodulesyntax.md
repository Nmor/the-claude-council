# typescript-patterns: Module Boundaries: verbatimModuleSyntax

> Covers **Module Boundaries: `verbatimModuleSyntax`** for the `typescript-patterns` skill. Routed
> from the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Module Boundaries: `verbatimModuleSyntax`

Turn on `verbatimModuleSyntax` and use `import type` for type-only imports:

```ts
import type { User } from "./types.js";  // erased at runtime
import { saveUser } from "./users.js";   // emitted
```

Stops "value imports that are only used as types" from accidentally bundling, and surfaces dead
value imports immediately.
