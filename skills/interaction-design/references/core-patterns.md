# interaction-design: Core Patterns

> Covers **Core Patterns** for the `interaction-design` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 18 KB** — `token-budget.mjs --check`.

## Core Patterns

### Pattern 1: Norman's seven stages of action — the diagnostic frame

Every interaction crosses these stages:

```text
USER side                         SYSTEM side
─────────                         ───────────
1. Goal                           4. Specify action sequence
                                  5. Execute
2. Plan
                                  6. Perceive state of world
3. Specify how to act
                                  7. Interpret perception

                                  → Compare to goal → repeat
```

Two **gulfs** open between them:

- **Gulf of Execution** — between user's intent and what the
  system accepts. Bridged by: affordances, signifiers, sensible
  defaults, forgiving input, in-context guidance.
- **Gulf of Evaluation** — between system state and what user
  perceives. Bridged by: visible state, clear feedback,
  meaningful labels, consistent mappings.

Most usability problems live in one of the two gulfs. When
diagnosing a flow, name which gulf is failing and at which
stage.

### Pattern 2: Affordances vs signifiers

- **Affordance**: what an object actually allows (a button can
  be pressed; a slider can be dragged; a link can be activated)
- **Signifier**: the perceivable cue that announces the
  affordance (the visual shape, label, icon, motion)

A "button" that looks like text and doesn't change on hover has
the affordance but lacks the signifier. A "link" with an icon
that looks like a button mismatches signifier and affordance.

Rules:

- Every interactive element MUST have a signifier visible at the
  default state — never rely on hover-only discovery (breaks on
  touch + keyboard users)
- Signifiers should be consistent across the product
- When in doubt, make affordances explicit through labels rather
  than implicit through visual style

### Pattern 3: Nielsen's 10 heuristics (operational checklist)

| # | Heuristic | Operational check |
| --- | --- | --- |
| 1 | Visibility of system status | Loading states, progress, save state visible? |
| 2 | Match between system and real world | Labels in user vocabulary, not internal jargon? |
| 3 | User control and freedom | Undo / cancel / back paths visible? |
| 4 | Consistency and standards | Same action means the same thing across the product + platform conventions? |
| 5 | Error prevention | Confirmations on destructive; inline validation before submit? |
| 6 | Recognition rather than recall | User sees options, doesn't memorise them? |
| 7 | Flexibility and efficiency | Power users have shortcuts; novices have guided paths? |
| 8 | Aesthetic and minimalist design | Every element earns its place; no clutter? |
| 9 | Help users recognise, diagnose, recover | Errors plain English, in user vocabulary, with named recovery? |
| 10 | Help and documentation | Accessible from context when needed |

Run these as a checklist on every flow before user testing.

### Pattern 4: Feedback discipline

Every user action gets feedback within the perception window:

| Feedback type | Window | Examples |
| --- | --- | --- |
| **Instant** (touch / click) | < 100 ms | Button press visual change |
| **Confirmation** (action taken) | < 1 s | Toast, save indicator, page transition |
| **Progress** (long action) | Continuous | Determinate or indeterminate progress |
| **Result** (task complete) | When ready | Success state, summary, next step |
| **Error** (action failed) | Immediate | Specific, actionable, recoverable message |

Anti-pattern: optimistic UI without rollback — user sees
"saved" but the server failed silently. Per
`no-silent-failures.md`, optimistic updates MUST roll back +
surface error on failure.

### Pattern 5: Fitts's law — target acquisition

Time to acquire a target ≈ a + b × log₂(distance / size + 1).
Implications:

- **Bigger targets** = faster + more accurate
- **Closer targets** = faster
- **Edges + corners** = effectively infinite size (Fitts edge
  trick); platform menus on macOS top edge are this
- **Touch minimum target size**: 24 × 24 CSS px (WCAG 2.2
  §2.5.8); 44 × 44 px (Apple HIG); 48 × 48 dp (Material 3)
- **Primary action**: the most likely action gets the largest +
  closest target
- **Destructive action**: usually further or visually distinct
  to prevent accidental selection

### Pattern 6: Hick's law — choice complexity

Decision time scales with log of the number of options. Practical:

- **5 ± 2 items per group** (Miller's number) for menus +
  navigation
- **Progressive disclosure**: surface the common, hide the rare
- **Smart defaults**: the right answer for 80% of users selected
- **Search beats browse** when options exceed ~20

Don't dump every option on screen because "the user might need
it". Curate ruthlessly; provide an escape hatch (search,
"more", "advanced") for the long tail.

### Pattern 7: Gestalt grouping — visual structure

Users perceive groups before items. Use:

- **Proximity**: related items closer together than unrelated
- **Similarity**: same shape / colour / typography = same kind
- **Continuity**: aligned items read as a single set
- **Closure**: bounded regions read as a unit
- **Common region**: cards / panels carve out groups
- **Figure / ground**: foreground / background hierarchy

Every screen has implicit groups; designed screens have
intentional groups. Audit by squinting: do the groups match the
information architecture?

### Pattern 8: Error prevention before error recovery

Hierarchy:

1. **Make the error impossible** — disabled state, format
   constraint, single-choice picker
2. **Make it hard to make** — confirmation, default to safer
   option, undo
3. **Make it easy to fix** — inline validation with specific
   guidance
4. **Make it easy to recover** — undo, autosave, history,
   rollback

Examples:

- Date picker prevents impossible dates (no 32 January)
- "Delete account" requires typing the account name
- Phone field formats as you type (no "please use international
  format" guess)
- "Recently deleted" folder keeps deletes for 30 days
- Edit history lets you revert any past version

### Pattern 9: Error recovery UX — specific + actionable + kind

Bad error UX:

> "An error occurred. Please try again."

Good error UX:

> "Your card was declined by Visa. Try another card, or update
> the billing address — most declines clear with the correct
> ZIP. [Contact support]"

Pattern:

1. **Name what happened** in the user's terms, not the system's
2. **Name the cause** when known and not sensitive (security
   bans this for auth — see `security.md`)
3. **Name the recovery** with one primary path + one secondary
4. **Preserve the user's work** (don't clear the form)
5. **Avoid blame**: "your" / "you" framing only for things the
   user can fix; "we" / "the system" for things we own
6. **Tone**: human, brief, professional — not chirpy

Every `error_code` (per `error-codes.md`) maps to a copy entry
in the microcopy catalog. Tests assert on `error_code`, not on
the message string.

### Pattern 10: Microcopy as interaction

Words in the UI ARE interaction. Rules:

- **Buttons**: verbs, not nouns. "Save", "Send invitation",
  "Delete account" — not "OK", "Submit"
- **Headlines**: action-oriented, not topic-oriented. "Welcome
  back, Alex" not "Login screen"
- **Empty states**: explain WHY it's empty + WHAT to do next
- **Loading states**: name what's loading + estimate when
  possible
- **Confirmations**: future tense — "This will delete 5 items"
- **Validation**: positive when possible. "Looks good" beats
  silence
- **Tone**: appropriate to context. A bank doesn't say "Oopsie!"
  on a failed transfer

Microcopy is i18n'd per `i18n.md` — every string in the
translation catalog, no concatenation, ICU plurals.

### Pattern 11: Motion as functional language

Motion teaches the system. Functional uses:

- **Spatial continuity**: an element moves to its new location
  so the user tracks it instead of relocating
- **Causality**: an action's result animates from the cause
- **Hierarchy**: parents move before children
- **State**: a button compresses + relaxes to show "pressed"
- **Progress**: indeterminate progress hints "I'm working";
  determinate hints "I know how long"

Anti-patterns: gratuitous motion, anything > 400 ms for routine
transitions, parallax for parallax's sake, motion that ignores
`prefers-reduced-motion` (WCAG 2.3.3).

Timing reference:

- **Instant**: 100 ms
- **Quick**: 200-300 ms (most transitions)
- **Deliberate**: 400-500 ms (page changes)
- **Slow**: 500 ms+ (reserved for ceremonial moments —
  onboarding success, transactional finality)

### Pattern 12: Input modality discipline

Different modalities have different affordances:

| Modality | Strengths | Constraints |
| --- | --- | --- |
| Mouse + keyboard | Precise pointing, shortcuts, multi-select | Requires dexterity + flat surface |
| Touch | Direct manipulation, intuitive | No hover; fat-finger; one hand often |
| Voice | Hands-free, fast for known intents | No visual context; ambiguous queries; privacy concerns |
| Keyboard-only | Accessible, fast for power users | Requires focus order discipline + skip links |
| Stylus | Precision + pressure + tilt | Niche; requires the hardware |
| Gesture / AR | Spatial reasoning, hands-free | Discoverability + fatigue (gorilla arm) |
| Watch | Glanceable, immediate | Tiny screen + battery constraints |

Cross-modal: every action reachable on touch MUST be reachable
on keyboard (WCAG 2.1.1). Hover-only controls fail touch users;
hover-only tooltips fail keyboard + screen-reader users.

### Pattern 13: Progressive disclosure + onboarding

Reveal complexity as the user needs it:

- **Onboarding**: just enough to complete the first valuable
  action — NOT a feature tour
- **Empty states**: nudge toward the first action
- **Just-in-time tooltips**: explain features on first use, not
  upfront
- **Personalisation as adoption signal**: features unlock as
  use justifies them
- **Settings**: organise by frequency, not alphabetically

Anti-pattern: "Tour mode" that walks through every screen.
Nobody reads it. Build features that explain themselves.

### Pattern 14: Default states — recognition over recall

Choose defaults that:

- Match the user's most likely choice (research-grounded)
- Are safe (deletion confirmation NOT default to "Delete")
- Are reversible
- Honour user history (remember the last-used sort, filter,
  view)
- Don't bias inappropriate choices (default to "no" for
  marketing consent per `gdpr-ccpa.md`)

### Pattern 15: Confirmations — earn them

Confirmation dialogs are interruptions. Use sparingly:

- **Destructive AND irreversible** → confirm (delete account,
  send broadcast to 10k users)
- **Destructive AND reversible** → don't confirm; offer undo
  (delete email, archive thread)
- **Costly action** (paid, time-consuming) → confirm with the
  cost named
- **Permission grant** → confirm with the scope visible

Per-confirmation discipline avoids "click OK on the third dialog
because of habit" — the trained-blindness that defeats the
purpose.

### Pattern 16: Never write like AI — write like a person

Machine-generated copy has recognisable tells: it reads generic,
inflated, and slightly robotic, and users feel it even when they
can't name it. UX copy must sound like one person wrote it for
another. This applies to EVERY user-facing string AND to marketing
copy, docs, and release notes (per `comms-reviewer`). Grounded in
plain-language practice: **UK Government Digital Service content
design + A–Z style guide**, **NN/g "Plain Language"**, **Strunk &
White "omit needless words"**, **Hemingway** (short sentences,
strong verbs).

**The AI tells to eliminate (each with the fix):**

| AI tell | Fix |
| --- | --- |
| **Em-dash as a default connector** ("held in escrow — visible to both") | A period, comma, or colon. At most ~1 em-dash per screen, only where it genuinely beats a period. |
| **Adjective / adverb stacking** ("one calm, trustworthy flow", "simple, seamless, effortless") | Cut the adjectives; state the concrete benefit. |
| **Rule-of-three padding** ("fast, simple, and secure") | Keep only the words that carry meaning; two beats three, one beats two. |
| **"Not just X, but Y" / "It's not about X, it's Y"** contrast tic | State Y directly. |
| **Cute inversions / forced symmetry** ("moved by neither", "your work, your rules") | Say the plain thing. |
| **Inflated verbs + buzzwords**: unlock, elevate, empower, supercharge, streamline, leverage, harness, foster, delve, robust, seamless, effortless, cutting-edge, best-in-class, world-class, next-level, game-changing, revolutionary | A plain verb + a concrete noun. |
| **Filler + hedging**: simply, just, really, very, truly, actually, "in order to", "the ability to", "helps you to", "designed to", "allows you to" | Delete, or use the direct verb ("lets you" → the verb itself). |
| **Empty openers**: "In today's fast-paced world", "Whether you're X or Y", "Imagine a world where", "Say goodbye to X" | Lead with the concrete value in the first five words. |
| **Slogan cadence / Title Case Marketing** ("Get Paid. Stay Protected. Grow Faster.") | Sentence case; one honest sentence. |
| **Restating the label / over-explaining the obvious** | Trust the user; delete. |
| **Emoji as emphasis** in product copy (unless the brand voice genuinely is that) | Remove. |

**The positive standard:** specific over vague; concrete nouns +
strong verbs; short sentences, one idea each; second person; a
benefit the user can picture; the words a customer would actually
say out loud. Read every line aloud — if it sounds like a brochure
or a bot, rewrite it until it sounds like a person.

**Detection (run before shipping copy):** read it aloud; scan for
every entry in the table above; ask "would a smart colleague say
this to a customer?" A fast mechanical pass catches the worst tell:

```bash
# Em-dash / en-dash density + the buzzword list in user-facing copy
grep -rnE '—|–' src/**/*.{tsx,ts,vue,jsx} | grep -v node_modules
grep -rniE 'unlock|elevate|seamless|effortless|leverage|robust|supercharge|game-chang|best-in-class|world-class|delve|in today.?s (fast|world)' src
```

Human-sounding copy is a trust signal in itself: users who feel a
real person wrote the words trust the product with their money.
