# api-design: Response-shape contracts

> The BE/FE response-shape drift bug class, the four-part contract that prevents it, the
> add/change-an-endpoint workflow and the drift tells. Pointed at by the "Response-shape contracts
> (BE/FE drift)" row of `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Response-shape contracts

The canonical bug class an API design must prevent: the server
returns `{ items: [...] }` and the client reads `res.events`, or
backend returns `{ buckets: { uid: [...] } }` and frontend reads
`res.members`. The feature compiles, the backend test passes, and
the frontend renders an empty array — looking *empty* rather
than *broken*. Users find it weeks later when they expected data.

Common shapes this has happened in:

- Connections list — server returns `{ items: [...] }`, client
  reads `res.connections`. Settings page permanently empty.
- Events list — server returns `{ items: [...] }`, client reads
  `res.events`. List view permanently empty.
- Bucketed lookup — server returns `{ buckets: { [keyId]: [...] } }`,
  client reads `res.members`. Dashboard permanently empty.

### The contract

For every endpoint the frontend consumes:

1. **A shared typed shape lives in `lib/types.ts`** (or per-project
   equivalent). Backend and frontend both reference it via
   `import type`. Renaming a key changes the type at both call
   sites simultaneously — neither can drift without the other.

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

3. **The frontend store test mocks the canonical shape.** The
   mock payload comes from the same shared type, so a backend
   rename breaks the frontend test before any user sees the empty
   view.

4. **Shared discriminated `Result<T>` shape.** Stores return
   `{ ok: true, value: T } | { ok: false; reason: string; status?: number }`
   so callers can't accidentally consume an error as a success.

### Workflow when adding or changing an endpoint

1. Edit the shared type FIRST (`lib/types.ts` + frontend mirror).
   The compiler tells you every backend handler + every frontend
   store that needs to update.
2. Update the backend handler to write the new shape.
3. Update the frontend store to read the new shape.
4. Add a backend test that pins the exact key shape
   (`Array.isArray(body.items)`, etc.) — not just `statusCode`.
5. Add a frontend store test that mocks the canonical payload and
   asserts the parsed result matches the type.
6. Re-run both test suites in the same turn.

### Spot the bug — patterns that hint at silent shape drift

- A `parseBody(res)` followed by `body.someKey` without a typed
  cast.
- A `.then((res) => res.<some-key>)` that doesn't error on
  missing.
- A `?? []` fallback in the store action — fine for
  explicit-empty, but if it covers a key-name mismatch the UI
  silently shows empty.
- A frontend feature shipped "ready" with zero data observed in
  staging. Always re-run the contract test before claiming done.

### Cross-references

- `~/.claude/rules-library/common/no-silent-failures.md` —
  false-positive success states.
- `~/.claude/rules-library/common/no-discards.md` — `as any` casts that
  hide shape drift.
- `~/.claude/rules/common/done-criteria.md` — "done" requires
  the contract test to pin the shape.
- `~/.claude/rules-library/common/contract-testing.md` — broader CDC
  (Pact) + schema-based (OpenAPI / GraphQL / Proto) discipline.
