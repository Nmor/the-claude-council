---
name: interaction-design
description: Principal-level interaction design — affordances, signifiers, feedback, mappings, constraints, error prevention, recovery, gesture + input model design, microcopy, motion as functional language, and the discipline that turns flows into experiences users complete without thinking and don't have to recover from.
---

# Interaction Design

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> Good interaction design is invisible; bad interaction design
> is the reason support tickets exist. Treat every screen as a
> contract: the system tells the user what it can do and what
> happens next, and the user tells the system what they want
> without translating their intent into the system's vocabulary.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Patterns | [`references/core-patterns.md`](references/core-patterns.md) |

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
  - **Microsoft Fluent 2** — platform-specific instantiations
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
| AI-sounding copy (em-dash filler, buzzwords, rule-of-three, "not just X but Y") | Reads generic + untrustworthy; users feel it | Pattern 16 — write like a person; read aloud; scan the tell-list |

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
- [ ] Copy passes the "never write like AI" scan (Pattern 16): no
      em-dash filler, no buzzwords, no rule-of-three padding, no
      "not just X but Y"; reads like a person aloud
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
- Destructive action (delete / cancel) without confirmation OR without undo (error-prevention
  weakening)
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
- New cross-reference when a sister skill (wcag-accessibility, accessible-forms, ux-research,
  design-systems) adds an IxD gate
- New microcopy template when a recurring error / empty-state shape emerges
- Tightening of the motion-design rule when vestibular-issue feedback recurs
