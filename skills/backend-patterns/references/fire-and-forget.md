
# Fire-and-Forget Side Effects

> Covers fire-and-forget side effects: the canonical helper, usage, when it is the wrong shape,
> and how to spot the bug. Pointed at by the "Fire-and-forget side effects" row of `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Fire-and-forget side effects

The canonical shape for "kick off this side effect but don't
block the user" — audit-log writes, analytics emits, optimistic
cache warms, peer-tab broadcasts, in-memory cache invalidations.

The bugs this prevents: `.catch(() => null)`, `.catch(() => undefined)`,
`.catch(() => {})`, `void store.save()` — all silent failures. A
fire-and-forget that loses its error is a bug that surfaces
hours later in production when an operator looks at the count
and can't find it.

### Canonical helper

```ts
// backend/src/lib/fireAndForget.ts
import { logError, stringifyError } from "./logger.js";

export function fireAndForget(name: string, p: Promise<unknown>): void {
  p.catch((err: unknown) => {
    logError(`fireAndForget(${name}) failed`, {
      operation: name,
      error: stringifyError(err),
    });
  });
}
```

```ts
// frontend/src/lib/fireAndForget.ts
import { log, stringifyError } from "./logger";

export function fireAndForget(name: string, p: Promise<unknown>): void {
  p.catch((err: unknown) => {
    log.warn(`fireAndForget(${name}) failed`, {
      operation: name,
      error: stringifyError(err),
    });
  });
}
```

### Usage

```ts
// WRONG — silent
void store.refreshAfterDelete();

// WRONG — silent fallback
store.refreshAfterDelete().catch(() => null);

// WRONG — partial: error captured but message is "[object Object]"
store.refreshAfterDelete().catch((err) => {
  log.warn("refresh failed", { error: String(err) });
});

// RIGHT — named, properly stringified, observable
fireAndForget("refreshAfterDelete", store.refreshAfterDelete());
```

### When fire-and-forget is the WRONG shape

If the side effect's outcome is user-visible, fire-and-forget is
the wrong shape — surface the result via toast / banner / typed
return instead.

- "Did the save succeed?" → user must know → await + toast.
- "Did the audit row get written?" → operational, surface via
  metric / log → fire-and-forget.
- "Did the cache warm?" → never user-visible → fire-and-forget.
- "Did the Slack DM go out?" → may matter operationally → outbox
  pattern (at-least-once delivery), not fire-and-forget.

### Spot the bug

- `void promise()` outside an explicit fire-and-forget wrapper.
- `.catch(() => null)` / `.catch(() => undefined)` / `.catch(() => false)` / `.catch(() => {})`.
- Inline `err instanceof Error ? err.message : String(err)` —
  produces `[object Object]` on plain-object errors; use
  `stringifyError` from the project logger.
- A try/catch that catches Error and logs without including the
  operation name + context.
- `setTimeout(() => x().catch(noop), 0)` — same shape, different
  syntax, same bug.
