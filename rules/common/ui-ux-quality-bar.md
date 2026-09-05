# UI / UX / UX-Writing Quality Bar (Always-On, Global)

> Auto-fires on every file. Sister to `principal-level-mandate.md` (the depth bar this
> applies to the user-visible surface), `no-silent-failures.md` (rule 7 — every throw
> surfaces a user-visible signal), `verify-before-claim.md` (rule 9 — manual
> verification is mandatory for UI), `plan-task-breakdown.md` (rule 12 — UI/UX ships in
> the SAME plan as the feature), `done-criteria.md` (the gates a claim runs).

## Core Principle

**A user-facing change is not done when it works. It is done when a first-time user can
complete the task without guessing, is never left uncertain what happened, and can
recover from every failure the flow can produce. UI, interaction and the WORDS are one
deliverable with the feature — never a later polish pass, and never a separate ticket.**

The words carry as much of the experience as the layout. A correct screen with a
guessed label, an error that names an exception, or an empty state that says "No data"
is a defect in the same sense a wrong calculation is: the user cannot act on it.

## Standards this rule implements

- **WCAG 2.2 AA** (W3C Recommendation, Oct 2023) — §1.4.1 never colour alone, §1.4.3
  contrast 4.5:1 text / 3:1 large, §1.4.11 non-text contrast, §2.4.7 visible focus,
  §2.5.8 target size 24×24 CSS px, §3.3.1 error identification, §3.3.3 error suggestion.
- **ISO 9241-11:2018** — usability is effectiveness, efficiency AND satisfaction in a
  specified context. A flow that is technically completable but distressing fails it.
- **Nielsen's heuristics** — visibility of system status; match to the real world; error
  prevention over error messages; recognition over recall; help users recognise,
  diagnose and recover from errors.
- **WAI-ARIA Authoring Practices 1.2** — use the documented pattern for a widget before
  inventing one; a hand-rolled combobox is a keyboard trap.

## Hard rules

### 1. Every state ships, not just the happy one

A surface is incomplete until **empty, loading, error, partial and success** all render
deliberately. The empty state is the one most often skipped and the one a new user sees
first: it must say what goes here and how to add it, never "No records found."

### 2. Every failure the flow can produce has copy the user can act on

Per `no-silent-failures.md` rule 7, a throw without a user-visible surface is a
violation. This rule adds the CONTENT bar: the message names what happened, why, and
the next action. Banned: raw exceptions, status codes as prose, "Something went wrong"
where the server returned a typed `error_code`, and any message that blames the user for
a system fault.

### 3. The words are reviewed as code

Labels, buttons, errors, empty states, confirmations and toasts are part of the diff and
get the same scrutiny. Buttons name the ACTION ("Send invoice", not "Submit"). Nothing
is asked for without saying why it is needed when the reason is not obvious — a
third party's date of birth on a compliance form reads as intrusive until it says it
prevents a name-only match blocking the wrong person.

### 4. Destructive and irreversible actions are distinguishable before they happen

Confirm with the CONSEQUENCE named ("Delete 3 invoices? This cannot be undone"), never a
bare "Are you sure?". The confirm control describes the act, not "OK".

### 5. Accessibility is part of the definition of done, not an audit afterwards

Keyboard reachable in a sensible order; visible focus; labels tied to controls;
`aria-live` for async status; contrast met; targets ≥24×24; never colour alone. A
surface that fails these ships broken for people who rely on them.

### 6. i18n is designed in, not retrofitted

User-visible strings are externalised at write time with real translations for every
supported locale — not an init file and five keys. Plurals via ICU, dates/numbers/
currency via `Intl`, layouts that survive a 30% longer string and RTL. Money renders
through the project's money helper, never a raw division.

### 7. UI/UX is planned WITH the feature

Per `plan-task-breakdown.md` rule 12, a plan that changes user-visible behaviour carries
its screens, states, copy and a11y pass as atomic tasks in the SAME plan. "Backend now,
UI later" produces a feature that is done by the backend's definition and absent by the
user's.

### 8. Verified by USE, not by render

Per `verify-before-claim.md` rule 9, a UI claim requires the surface exercised: the
golden path plus at least one edge case, keyboard-only once, and every state visited.
"It compiles" and "the component renders" are not verification.

## Verification block

A completion claim on a user-facing change carries:

```text
UI/UX (this turn):
- states rendered: empty / loading / error / partial / success
- failure copy: <each failure the flow produces + the action it offers>
- keyboard pass: <tab order, focus visible, no trap>
- contrast + targets: <4.5:1 text, >=24x24 targets>
- i18n: <strings externalised; locales covered>
- exercised: <golden path + edge case actually driven, not just rendered>
```

## Anti-patterns

- **Backend-done** — feature complete server-side, no screen. Done for nobody.
- **Scaffold-as-finish** — "foundation + a couple of examples" shipped as the feature.
- **Exception-as-copy** — the user reads a stack trace, a status code, or a nil.
- **Generic-error** — "Something went wrong" while the server returned a typed code the
  client could have mapped to real guidance.
- **Empty-state-as-oversight** — "No data" where the first-run experience lives.
- **Colour-only state** — red/green with no text or icon.
- **Invented widget** — a hand-rolled combobox/dialog instead of the ARIA pattern.
- **Retrofit-i18n** — English hardcoded, extraction "later"; later never comes.
- **Ask-without-reason** — sensitive input requested with no explanation of why.
- **Confirm-without-consequence** — "Are you sure?" naming neither the act nor its scope.

## Relationship to the design plugin

`ui-ux-pro-max` supplies design KNOWLEDGE (tokens, styles, typography, component specs).
This rule supplies the BAR and holds the veto through `ux-reviewer` and
`accessibility-reviewer`. A plugin never overrides a Floor rule: knowledge that would
ship a surface failing WCAG 2.2 AA, or missing an empty/error state, is refused here.
The authority map in `~/.claude/CLAUDE.md` records the split.

## Cross-references

- `principal-level-mandate.md` — the depth bar; this applies it to the user-visible layer
- `no-silent-failures.md` r7 — every throw surfaces a signal; this sets the copy bar
- `verify-before-claim.md` r9 — manual verification is mandatory for UI
- `plan-task-breakdown.md` r12 — UI/UX ships in the same plan as the feature
- `done-criteria.md` — the gate a completion claim runs
- `competitive-parity-per-phase.md` — the Discovery-parity rider: a shipped capability
  the user cannot find delivers nothing
- Agents: `ux-reviewer` (writing + interaction), `accessibility-reviewer` (WCAG),
  `comms-reviewer` (public copy)
- Skills: `interaction-design`, `design-systems`, `wcag-accessibility`,
  `accessible-forms`, `ux-research`, `frontend-patterns`
- Plugin: `ui-ux-pro-max` (MIT) — design intelligence across styles, product
  profiles, font pairings and UX guidelines. This rule sets the BAR; that plugin
  supplies the knowledge to meet it, which is why they are listed together.

## Why this rule exists

The Council had three UX agents and seven UX skills and **no Floor rule**, so Division 7
engaged only when a trigger matched a file path. That is backwards for the layer the
user actually touches: the same change can be correct in every division's terms and
still be unusable, and nothing in the always-on Floor said so.

The cost of the discipline is writing the empty state and the error copy while the
feature is fresh. The cost of skipping it is a feature that passes review, ships, and
then generates support load — or one that a keyboard or screen-reader user simply
cannot complete, discovered after launch when it is most expensive to fix.

## Learning hooks

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- A user-facing change shipped with no UI/UX verification block (rule 8)
- An empty / loading / error state missing from a surface that can reach it (rule 1)
- A raw exception, status code, or generic message shown to a user (rules 2 + 3)
- A destructive action confirmed without naming its consequence (rule 4)
- An a11y failure found AFTER ship that a keyboard pass would have caught (rule 5)
- Strings hardcoded with i18n deferred to a later phase (rule 6)
- A backend feature marked done with its UI tracked separately (rule 7)
- "Scaffold" used as a finish line on a user-facing feature

**Refinement candidates**:

- New anti-pattern row when a copy failure recurs across surfaces
- New state in rule 1 when a flow class needs one the list omits
- Promotion of a recurring check into an automated probe (contrast, focus, target size)
- Tightening of rule 6 when a locale gap ships despite the rule
