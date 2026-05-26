---
name: error-shape-contract-testing
description: Ensure response shapes match between backend handlers and frontend stores. Prevents the class of bug where a feature ships broken because the server returns {items} and the client reads {events}.
---

# Error-Shape Contract Testing

Companion skill to the no-silent-failures and no-discards rules.
Activates whenever a backend handler's response shape changes OR a
frontend store consumes a new API endpoint.

## When to Activate

- Adding a new backend route that returns a payload the frontend
  consumes.
- Changing the response shape of an existing route (renaming a key,
  adding pagination, splitting one field into many).
- Adding a frontend store action that calls a backend route.
- Reviewing a calendar / settings / integration feature claimed
  "complete" — these are high-risk for shape mismatches.

## What this skill prevents

A recurring bug class: the backend returns `{ items: [...] }` and the
frontend reads `res.events`, or backend returns `{ buckets: { uid:
[...] } }` and frontend reads `res.members`. The feature compiles, the
backend tests pass, and the frontend renders an empty array — looking
"empty" rather than "broken". The user finds it weeks later when they
expected data.

Recent real instances (StewardBot):

- Calendar connections list — server returned `{ items: [...] }`,
  client read `res.connections`. Settings page permanently empty.
- Calendar events list — server returned `{ items: [...] }`, client
  read `res.events`. Calendar grid permanently empty.
- Free/busy — server returned `{ buckets: { [userId]: [...] } }`,
  client read `res.members`. Team availability dashboard empty.

## The contract

For every endpoint the frontend consumes:

1. **A shared typed shape lives in `lib/types.ts`** (or per-project
   equivalent). Backend and frontend both reference it via
   `import type`. Renaming a key changes the type at both call sites
   simultaneously — neither can drift without the other.

2. **The backend test pins the response key explicitly.** Not just
   the status code:
   ```ts
   expect(statusOf(res)).toBe(200);
   const body = parseBody(res);
   expect(Array.isArray(body.items)).toBe(true);
   expect(body.next_cursor).toBeNull();
   ```
   Tests that only assert `statusCode === 200` are blind to shape
   drift.

3. **The frontend store test mocks the canonical shape.** The mock
   payload comes from the same shared type, so a backend rename
   breaks the frontend test before any user sees the empty view.

4. **Shared discriminated `Result<T>` shape.** Stores return
   `{ ok: true, value: T } | { ok: false; reason: string; status?: number }`
   so callers can't accidentally consume an error as a success.

## Workflow

When adding or changing an endpoint:

1. Edit the shared type FIRST (`lib/types.ts` + frontend mirror).
   The compiler tells you every backend handler + every frontend
   store that needs to update.
2. Update the backend handler to write the new shape.
3. Update the frontend store to read the new shape.
4. Add a backend test that pins the exact key shape (`Array.isArray
   (body.items)`, etc.) — not just `statusCode`.
5. Add a frontend store test that mocks the canonical payload and
   asserts the parsed result matches the type.
6. Re-run both test suites in the same turn.

## Spot the bug

Patterns that hint at silent shape drift:

- A `parseBody(res)` followed by `body.someKey` without a typed cast.
- A `.then((res) => res.<some-key>)` that doesn't error on missing.
- A `?? []` fallback in the store action — fine for explicit-empty,
  but if it covers a key-name mismatch the UI silently shows empty.
- A frontend feature shipped "ready" with zero data observed in
  staging. Always re-run the contract test before claiming done.

## Cross-references

- `~/.claude/rules/common/no-silent-failures.md` — false-positive
  success states.
- `~/.claude/rules/common/no-discards.md` — `as any` casts that
  hide shape drift.
- `~/.claude/rules/common/done-criteria.md` — "done" requires the
  contract test to pin the shape.
