# Validate Payloads Before Coding (Always-On, Global)

> Auto-fires on every file. Sister to `official-docs-first.md` (read the
> primary-source docs first), `task-intake-due-diligence.md` (Q3 canonical
> reference, Q7 integration map), `verify-before-claim.md` (verify, don't
> assume), `proper-fixes-first.md` (root cause, not a guessed shape).

## Core Principle

**Before writing ANY code that produces or consumes an external payload — an API
request/response, an event/message body, a webhook, a DB row shape, a file
format, a third-party SDK return value — validate the ACTUAL payload against
ground truth: a live call to a non-production environment, a captured fixture, or
a primary-source schema. NEVER assume field names, nesting, types, or whether a
field is a list vs an object. The validated shape drives the code; the code is
written second.**

The pattern this rule prevents: writing a parser/builder from a plausible-looking
guess (a sibling system's shape, an older version, "it's probably a list of
items"), shipping it, and discovering at runtime that the real payload nests
differently or returns a single object where a list was assumed — silently
producing empty/wrong results.

## Hard rules

### 1. Ground-truth the shape FIRST

For each external payload the change touches, obtain the real shape from one of
(in order of preference):

1. **A live call to a non-prod tier** (dev/staging) with a known test fixture
   (e.g. a test customer / record), READ-ONLY where possible.
2. **A captured fixture / recorded response** committed as test data.
3. **The provider's primary-source schema** (OpenAPI/JSON-Schema/proto/`.d.ts`),
   per `official-docs-first.md`.

A README example or a sibling system's code is NOT ground truth — versions drift
and deployments differ. Confirm against 1–3.

### 2. Reads are validated live; writes are validated by shape, not by writing

- **Read payloads** (GET / consume): validate with a live read against non-prod.
  Read-only calls are safe to run.
- **Write payloads** (POST/PUT/publish): do NOT fire a test write at production
  to "see what happens" — that creates real records / side effects. Validate the
  request shape against the primary-source schema + a non-prod write or a
  recorded contract. When in doubt, confirm with the owner before writing.

### 3. Never write the parser/builder from an assumption

If the shape is unconfirmed, the code is BLOCKED, not guessed. Either obtain the
shape (rule 1) or surface the gap to the user. "I'll assume `data` is a list" is
the exact failure this rule exists to stop.

### 4. Capture the validated shape durably

The confirmed shape goes into:

- A **fixture / test** that encodes the real shape (so the parser is tested
  against ground truth, and a future contract change fails the test).
- A **provider-research / payload note** (per `official-docs-first.md`) or
  **project memory** when the shape is load-bearing and not obvious from code.

### 5. PII hygiene on probes

A live-validation probe that returns real PII (customer/account/health data) is
**read-only**, **minimal** (fetch only what's needed to confirm the shape), and
its script + output are **shredded/removed** after use — never committed, never
left in `/tmp`. Print structure + the load-bearing fields, not full PII dumps.

### 6. Re-validate on drift signals

Re-validate when: the provider announces a change; an unexpected error code
appears; a field reads empty when data is expected (a classic "shape changed /
was always wrong" signal); or it has been long enough that the contract may have
moved (per `official-docs-first.md` cadence).

## Verification block

A change that touched an external payload carries a payload-validation line:

```text
Payload validation (this turn):
- <endpoint/event>: shape confirmed via <live dev call | fixture | schema>
- key fields: <the load-bearing fields the code reads/writes>
- list-vs-object / nesting: <as confirmed> (not assumed)
- PII probe: <none | read-only, shredded>
```

## Anti-patterns

- **Assumed list/object** — `data` parsed as a list when the live shape is a
  single object (or vice versa) → silent empties.
- **README-shaped guess** — coding from a sibling repo / doc example without
  confirming the deployed contract.
- **Test-write to prod** — POSTing a throwaway record at production to learn the
  shape.
- **Probe left behind** — a PII-bearing validation script committed or left in
  `/tmp`.
- **"It compiles, ship it"** — the parser type-checks against the assumed shape;
  type-checking is not shape-validation.

## Cross-references

- `official-docs-first.md` — read the primary-source docs before integration
  (this rule adds: validate the ACTUAL payload, because docs drift / omit edges)
- `task-intake-due-diligence.md` — Q3 canonical reference, Q7 integration map
- `verify-before-claim.md` — verify before claiming; this rule is verify-before-
  *writing* for payloads
- `proper-fixes-first.md` — a guessed shape is a shortcut, not a proper fix
- `no-silent-failures.md` — a mis-parsed shape fails silently (empty results)

## Why this rule exists

User directive (verbatim): **"please validate all payloads before writing codes.
Please always do this so that you do not assume and add this to existing global
and project rule/hook and project memory."**

The triggering incident: an integration parser was about to be written assuming a
PTP-agreements endpoint returned `data` as a list of items; the live dev call
showed `data` is a single active-PTP object with a nested `meta` instalment list.
A pre-existing parser in the same codebase had made the same wrong assumption and
silently returned empty. The cost of a 30-second read-only live call is trivial;
the cost of a shape-guess is silent wrong behaviour discovered in production.

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill, which auto-fires when you touch a rule, skill,
agent or CLAUDE.md — i.e. exactly when you are refining the framework. They are
instructions for maintaining THIS ARTIFACT, not for doing the task at hand, so
they load then rather than on every turn.
