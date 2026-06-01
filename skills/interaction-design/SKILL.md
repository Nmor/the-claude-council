---
name: interaction-design
description: Principal-level interaction design — affordances, signifiers, feedback, mappings, constraints, error prevention, recovery, gesture + input model design, microcopy, motion as functional language, and the discipline that turns flows into experiences users complete without thinking and don't have to recover from.
---

# Interaction Design

> Good interaction design is invisible; bad interaction design
> is the reason support tickets exist. Treat every screen as a
> contract: the system tells the user what it can do and what
> happens next, and the user tells the system what they want
> without translating their intent into the system's vocabulary.

## Purpose

Interaction design covers the conversation between user and
system across screens, gestures, voice, and physical input. Its
job is to make the available actions perceivable, the right ones
obvious, the consequences predictable, errors preventable, and
recovery effortless when prevention fails. The medium changes
(web, mobile, desktop, voice, AR/VR, ATM keypad, watch face);
the principles do not.

This skill covers the canonical principles (Norman's seven
stages, Nielsen's heuristics, Fitts's law, Hick's law, Gestalt
grouping), the application of those principles across input
modalities, the structure of microcopy and motion as functional
language, error prevention and recovery patterns, the discipline
that makes the difference between a flow that takes 30 seconds
and the same flow that takes three minutes plus a support
ticket.

NOT in scope: visual design system tokens (see `design-systems`);
research methods that surface what to design (see `ux-research`);
accessibility-specific patterns (see `wcag-accessibility` +
`accessible-forms`); pure brand expression and illustration
style.

## Standards Cited

- **ISO 9241-110:2020** — Interaction principles (suitability for
  the task, self-descriptiveness, conformity with user
  expectations, learnability, controllability, error tolerance,
  individualisation)
- **ISO 9241-210:2019** — Human-centred design process
- **Norman D. (2013)** — "The Design of Everyday Things",
  revised edition (affordances, signifiers, mappings, feedback,
  conceptual models, seven stages of action)
- **Nielsen J. (1994, updated 2024)** — "10 Usability
  Heuristics for User Interface Design"
- **Fitts P. (1954)** — "The information capacity of the human
  motor system" (target size + distance → acquisition time)
- **Hick W., Hyman R. (1953)** — Hick-Hyman law (choice
  reaction time scales with log of number of options)
- **Tognazzini B. (2003+)** — "First Principles of Interaction
  Design"
- **Apple Human Interface Guidelines** + **Material Design 3**
  + **Microsoft Fluent 2** — platform-specific instantiations
- **Wroblewski L. (2008)** — "Web Form Design: Filling in the
  Blanks"
- **Cooper A., Reimann R., Cronin D., Noessel C. (2014)** —
  "About Face: The Essentials of Interaction Design", 4e
- **WCAG 2.2 §2.5 Input Modalities** — pointer + touch + speech
  constraints
- **W3C Working Group Note** — Pointer Events Level 3
- **NN/g articles** — heuristic application, microcopy, error
  recovery
- **Mullet K., Sano D. (1995)** — "Designing Visual Interfaces"
  (Gestalt grouping)
- **Tufte E. (1990, 2001)** — "Envisioning Information" +
  "The Visual Display of Quantitative Information"

## When to Fire

- Designing or critiquing any user-facing flow
- Stakeholder requests to "make it more intuitive" (translates
  to: apply principles below)
- High drop-off rates on a known funnel
- Recurring support tickets for the same action
- Multi-step processes (checkout, signup, configuration wizards)
- Form-heavy surfaces (search, filter, settings, onboarding)
- Notifications, modals, and other interruption patterns
- Cross-platform feature parity (web + mobile + watch + voice)
- Migration from desktop to mobile UX or vice versa
- Adding new input modality (voice, gesture, AR)

Pairs with `ux-research` (surfaces problems to solve),
`design-systems` (where component patterns live),
`wcag-accessibility` (accessibility is correctness, not a
feature), `accessible-forms` (forms-specific patterns),
`frontend-patterns` (implementation), `i18n.md` (microcopy
internationalisation), `error-codes.md` (error recovery UX
maps to stable error codes), `task-intake-due-diligence.md`
Q12 + Q19 (UX writing).

## Core Patterns

### Pattern 1: Norman's seven stages of action — the diagnostic frame

Every interaction crosses these stages:

```
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

## Anti-Patterns

| Anti-pattern | Why bad | Fix |
| --- | --- | --- |
| Hover-only controls | Fails touch + keyboard | Always-visible signifiers |
| Mystery meat icons (no labels) | Recall over recognition | Icon + label OR label-only |
| Generic error messages | Recovery impossible | Specific cause + actionable next step |
| Disabled buttons with no explanation | User can't fix | Show WHY disabled + how to enable |
| Long single-page form | Cognitive overload + lost work | Multi-step with progress + autosave |
| Validation only on submit | Late discovery of errors | Inline validation on blur |
| Modal stacking | Modal-on-modal traps users | One modal at a time; use side panels for parallel work |
| Auto-advance on input | Surprises user, breaks expectations | Manual progression unless explicitly opted in |
| Carousel hero on homepage | Average user sees one slide; analytics back this | Static hero + content below |
| Infinite scroll without anchors | Can't return, can't share | Pagination + URL state |
| Skeleton loaders that lie about content | Trains user to ignore real loading | Match skeleton to actual layout |
| Notifications without dismiss / settings | Train users to ignore | Always provide control |
| "Are you sure?" on every action | Habituation defeats safety | Confirm only destructive + irreversible |
| Microcopy in feature jargon | User doesn't translate | User vocabulary; test with real users |

## Verification Checklist

- [ ] Every interactive element has a perceivable signifier in
      its default state
- [ ] Every action has feedback within its modality's
      perception window
- [ ] Touch targets meet platform minimum (24 / 44 / 48 per
      platform)
- [ ] Primary action obvious; destructive distinct
- [ ] Inline validation on every form field; errors specific +
      actionable
- [ ] Optimistic UI rolls back on failure (per
      `no-silent-failures.md`)
- [ ] Loading states present for any action > 100 ms
- [ ] Empty states explain why + what next
- [ ] Microcopy in user vocabulary; verbs on buttons
- [ ] Every error_code has a microcopy entry (per
      `error-codes.md`); messages reviewed by writer
- [ ] Motion respects `prefers-reduced-motion`
- [ ] Keyboard reachable everywhere touch is reachable
- [ ] Focus order matches reading order
- [ ] Confirmation dialogs reserved for destructive +
      irreversible
- [ ] Undo / cancel paths visible
- [ ] Defaults match research-grounded most-likely user choice
- [ ] Progressive disclosure: complexity revealed when needed
- [ ] Hick: choices ≤ 7 per group; search escape for long tails
- [ ] Gestalt grouping: visible structure matches information
      architecture
- [ ] Cross-platform behaviour consistent OR platform-conventional
- [ ] i18n: every string in catalog; ICU plurals; RTL mirrored
- [ ] a11y audit passes (per `wcag-accessibility`)

## Cross-References

- `ux-research` — surfaces what to design; quantitative
  usability tests + qualitative findings
- `design-systems` — token-level + component patterns that
  implement these principles consistently
- `wcag-accessibility` — accessibility is correctness, not
  optional
- `accessible-forms` — forms-specific patterns
- `frontend-patterns` — implementation patterns
- `i18n.md` — microcopy internationalisation; RTL mirroring
- `error-codes.md` — stable codes that map to error UX copy
- `no-silent-failures.md` — optimistic UI rollback on failure
- `feature-flags.md` — gradual rollout of new interactions
- `gdpr-ccpa.md` — consent UX (don't bias toward opt-in)
- `task-intake-due-diligence.md` Q12 (a11y) + Q19 (UX writing)
- `documentation-requirements.md` — design decisions in ADRs

## Why This Skill Exists

A well-designed flow disappears from the user's awareness. They
complete the task and move on. A poorly designed flow lodges in
the user's memory as a moment of friction, surfaces in support
tickets, NPS detractors, churn, and the slow attrition of trust
that no growth lever recovers. The principles in this skill are
not opinions — they are the converged learning of seventy years
of human-computer interaction research, instantiated across
millions of products.

Most design problems aren't from designers not knowing the
principles; they're from time pressure, stakeholder churn,
copying patterns without understanding why they worked
elsewhere, or shipping the first design that the team can agree
on rather than the one users can use. The discipline this skill
describes — diagnose with Norman's seven stages, audit with
Nielsen's heuristics, size targets per Fitts, group per Gestalt,
prevent errors before recovering them, write microcopy as part
of the interaction, and verify across modalities — is the
operational pattern that turns design opinion into design
practice.

The cost: a slower first draft (because the checklist actually
gets applied) and a willingness to delete the cute idea when it
fails an audit. The benefit: flows users complete without
support, accessibility that comes for free because keyboard +
touch + screen-reader were considered from the start,
microcopy that explains itself, and a product that gets better
the more it's used — instead of worse the more it accretes.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Interaction without clear feedback (user clicks, nothing visible happens — feedback weakening)
- Destructive action (delete / cancel) without confirmation OR without undo (error-prevention weakening)
- Error message blames the user ("you entered the wrong format") instead of explaining what's needed
- Modal dialog without explicit dismiss affordance (keyboard / button — escape gap)
- Animation runs > 5s without skip / reduced-motion respect (`prefers-reduced-motion`)
- Critical CTA buried below the fold without visual anchor
- Disabled state without explanation of why (UX dead-end)
- Loading state without progress indicator (perceived-time balloon)
- Empty state without action prompt (cul-de-sac)
- Microcopy uses jargon / domain-internal terms (clarity weakening)
- Click target hidden by hover-only affordance on touch device

**Refinement candidates**:
- New affordance / signifier pattern row when a new UI primitive becomes common
- New cross-reference when a sister skill (wcag-accessibility, accessible-forms, ux-research, design-systems) adds an IxD gate
- New microcopy template when a recurring error / empty-state shape emerges
- Tightening of the motion-design rule when vestibular-issue feedback recurs
