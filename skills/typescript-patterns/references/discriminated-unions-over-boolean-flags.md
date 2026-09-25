# typescript-patterns: Discriminated Unions Over Boolean Flags

> Covers **Discriminated Unions Over Boolean Flags** for the `typescript-patterns` skill. Routed
> from the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Discriminated Unions Over Boolean Flags

Replace state objects with overlapping optional fields with a discriminated union. Each variant
becomes a single shape, and the compiler enforces exhaustiveness.

```ts
// WRONG — every consumer has to remember which fields go together
interface Result {
  ok: boolean;
  data?: User;
  error?: string;
  retryAfterMs?: number;
}

// RIGHT — one shape per state; the compiler narrows on tag check
type Result =
  | { kind: "ok"; data: User }
  | { kind: "error"; error: string }
  | { kind: "throttled"; retryAfterMs: number };

function render(r: Result): string {
  switch (r.kind) {
    case "ok": return r.data.name;
    case "error": return r.error;
    case "throttled": return `retry in ${r.retryAfterMs}ms`;
    // No default — TS flags any new variant added later (S6486 equivalent).
  }
}
```
