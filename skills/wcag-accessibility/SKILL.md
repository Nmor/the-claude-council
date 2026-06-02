---
name: wcag-accessibility
description: WCAG 2.2 AA + AAA accessibility patterns for every user-facing surface — semantic HTML, ARIA 1.2, keyboard navigation, screen reader support, color contrast, motion preferences, and the 9 new SCs introduced in WCAG 2.2. Also lazy-loads a11y.md content migrated from rules/common/ on 2026-06-02.
paths:
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.jsx"
  - "**/*.tsx"
  - "**/*.html"
  - "**/*.htm"
  - "**/*.hbs"
  - "**/*.ejs"
  - "**/*.liquid"
  - "**/*.astro"
  - "**/*.mdx"
  - "**/components/**"
  - "**/views/**"
  - "**/pages/**"
  - "**/layouts/**"
  - "**/screens/**"
  - "**/widgets/**"
  - "**/forms/**"
  - "**/a11y/**"
  - "**/accessibility/**"
  - "**/aria*"
  - "**/wcag*"
---

# WCAG Accessibility

Production patterns for meeting WCAG 2.2 Level AA on every UI surface and Level AAA on critical paths (auth, payment, account management, account deletion). Pairs with the global `a11y.md` rule.

## Purpose

Accessibility is not retrofit work. It is the design contract that says: every user can perceive, operate, understand, and interact with the product. Inaccessible UIs are legal liabilities (EAA 2025, ADA Title III, AODA, Section 508), commercial losses (enterprise procurement requires VPATs), and engineering failures (the bugs you only see when you test with real assistive tech).

This skill encodes the patterns that pass WCAG 2.2 audits + screen-reader smoke tests + keyboard walkthroughs. It does NOT cover the rule-level enforcement — that lives in `~/.claude/rules-library/common/a11y.md`. This skill is the IMPLEMENTATION arm.

## Standards Cited

- **WCAG 2.2** (W3C Recommendation, October 2023) — Level A, AA, AAA success criteria
- **WAI-ARIA 1.2** (W3C Recommendation, June 2023) — roles, states, properties
- **ARIA Authoring Practices Guide (APG)** (W3C) — keyboard interaction patterns per widget
- **EN 301 549 v3.2.1** (ETSI, EU public-sector + EAA basis)
- **EAA — European Accessibility Act 2019/882** — effective 28 June 2025
- **Section 508** (US, 36 CFR §1194) — federal procurement
- **ADA Title III** (US, 42 USC §12181) — public accommodations
- **AODA** (Ontario Regulation 191/11) — Canadian provincial
- **ISO/IEC 40500:2012** — international adoption of WCAG 2.0 (current baseline; WCAG 2.2 adoption in progress)

## When to Fire

- Any `.vue`, `.tsx`, `.jsx`, `.svelte`, `.astro` file
- Any HTML / CSS template under `views/`, `components/`, `pages/`, `layouts/`, `screens/`, `widgets/`
- Any Email template, push notification, SMS template
- Any PDF generation, document export
- Any iOS / Android / SwiftUI / Flutter UI work (mobile a11y mirrors WCAG via platform APIs)
- Any new public API that returns localised user-facing strings

## Core Patterns

### Semantic HTML before ARIA

ARIA Rule 1: don't use ARIA when semantic HTML works. The element gives the role for free; ARIA adds nothing but maintenance burden + screen-reader announcement bugs.

```html
<!-- WRONG — div doing button work; screen reader announces nothing -->
<div class="btn" onClick="submit()" role="button" tabindex="0"
     onKeyDown="if (e.key === 'Enter' || e.key === ' ') submit()">
  Submit
</div>

<!-- RIGHT — native button -->
<button type="submit" onClick="submit()">Submit</button>
```

Native elements bring keyboard handling, focus management, form semantics, disabled state propagation, and ARIA role for free.

### The 9 WCAG 2.2 NEW success criteria (most-missed)

| SC | Level | Requirement |
| --- | --- | --- |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Focused element not fully hidden by sticky headers / modals / dialogs |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | Focused element not hidden AT ALL — partial obscuring also fails |
| 2.4.13 Focus Appearance | AAA | Focus indicator ≥ 2 CSS pixel thick perimeter, 3:1 contrast against the focused element |
| 2.5.7 Dragging Movements | AA | Drag-only interactions have a single-pointer alternative (drag + drop reorder also has up/down arrows) |
| 2.5.8 Target Size (Minimum) | AA | Touch targets ≥ 24×24 CSS pixels (exceptions: inline links in text, browser-controlled UI) |
| 3.2.6 Consistent Help | AA | Help mechanisms (contact, support, FAQ) in the same relative location on every page they appear |
| 3.3.7 Redundant Entry | AA | Forms don't re-ask info already provided in the same process (auto-fill OR show + edit, don't re-prompt) |
| 3.3.8 Accessible Authentication (Minimum) | AA | No cognitive function tests (memorising password) without an accessible alternative (passkey, magic link, biometric) |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | Same, but no exception for object recognition / personal content |

These ship in WCAG 2.2 (October 2023); WCAG 2.1 audits don't catch them.

### Keyboard interaction model (per widget)

| Widget | Required keys |
| --- | --- |
| Button | Enter + Space |
| Link | Enter only (NOT Space — Space scrolls the page) |
| Checkbox | Space toggles |
| Radio (within group) | Arrow keys move + select; Tab leaves the group |
| Select / combobox | Arrow keys, Enter, Esc, type-ahead |
| Tab list | Arrow keys within list; Home / End; Tab leaves to tab panel |
| Menu | Arrow keys, Enter, Esc, Home / End, type-ahead |
| Modal / dialog | Esc closes; Tab loops within; focus returns to opener on close |
| Tree | Arrow Up/Down for siblings; Left collapses; Right expands; Enter activates |
| Slider | Arrow keys; Home / End; PageUp / PageDown for larger steps |
| Date picker | Arrow keys move; PgUp/PgDn = month; Shift+PgUp/PgDn = year |

Custom widgets that don't implement the expected model are invisible to keyboard users + screen-reader users — they may render, but they don't WORK.

### Focus management invariants

- **Visible focus ring always** — never `outline: none` without a documented replacement at ≥ 3:1 contrast (WCAG 1.4.11)
- **Focus trap in modals** — Tab cycles within; focus returns to the trigger on close
- **Focus restoration on route change** — after async navigation, move focus to the new page's `<h1>` or designated landmark
- **Skip link** — first focusable element on every page is a "Skip to main content" link that becomes visible when focused

```tsx
// React example
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:bg-white focus:p-2 focus:z-50"
    >
      Skip to main content
    </a>
  );
}
```

### Color contrast (the ratios that matter)

| Element | AA | AAA |
| --- | --- | --- |
| Body text | 4.5:1 | 7:1 |
| Large text (18pt regular OR 14pt bold) | 3:1 | 4.5:1 |
| Non-text UI (borders, icons, focus rings) | 3:1 | — |
| Graphical objects + data viz | 3:1 | — |

Test with axe DevTools, Stark, or `contrast-ratio.com`. Test BOTH light + dark modes.

### Color is never the only signal

| Wrong | Right |
| --- | --- |
| Required field = red asterisk only | Red border + asterisk + "Required" text + `aria-required="true"` |
| Error state = red border only | Red border + error icon + descriptive text + `aria-invalid="true"` + `aria-describedby` |
| Status = green dot | Green dot + "Online" text |
| Chart line color encodes data | Color + pattern (dashed / dotted) + accessible legend |

### Motion respects `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Vestibular disorders are common (~1 in 5 adults experience some vestibular dysfunction in their lifetime). Auto-playing videos, parallax effects, and heavy CSS transitions cause real harm. Honour the OS-level setting.

### Status updates via `aria-live`

```tsx
// Use `polite` for routine updates (filter results, save success)
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>

// Use `assertive` ONLY for urgent (error, time-sensitive)
<div aria-live="assertive" role="alert" aria-atomic="true">
  {errorMessage}
</div>
```

Loading spinners + skeletons MUST announce loading state. Toast notifications MUST be in a live region OR called via `role="status"`.

### Text alternatives (`alt` attribute discipline)

| Image kind | `alt` value |
| --- | --- |
| Content image (informative) | Describes the content + function (e.g., "Customer support agent on phone") |
| Decorative | `alt=""` (empty, NOT missing) |
| Image inside a link | Describes the link target, not the image |
| Icon-only button | `aria-label` on the button (not the icon) |
| Complex chart / diagram | Short `alt` + long description via `aria-describedby` OR `<figure><figcaption>` |
| Logo | Company / product name |
| User-uploaded (UGC) | Prompt user for alt; fall back to file metadata; never auto-generate without consent |

### Form a11y

```html
<!-- WRONG — placeholder as label; invisible when filled; disappears for screen readers in some browsers -->
<input type="email" placeholder="Email" />

<!-- RIGHT — explicit label + input -->
<label for="email">Email</label>
<input
  type="email"
  id="email"
  name="email"
  required
  aria-required="true"
  aria-invalid="false"
  aria-describedby="email-help email-error"
/>
<p id="email-help" class="hint">We'll never share your email.</p>
<p id="email-error" class="error" role="alert">{errorMessage}</p>
```

See the sister skill `accessible-forms` for the full form patterns.

## Anti-Patterns

### Anti-pattern 1: Click handlers on `<div>`

The most common a11y failure. The div is not focusable, the keyboard doesn't activate it, screen readers don't announce it as actionable, and you've reinvented `<button>` without any of its benefits. Always use a native interactive element.

### Anti-pattern 2: `<a href="#">` for buttons

Links navigate; buttons act. A link with `href="#"` or `href="javascript:void(0)"` confuses the keyboard model (Enter activates a link via navigation, not action) and breaks assistive-tech expectations.

### Anti-pattern 3: ARIA-fixing semantic HTML

```html
<!-- WRONG — fighting native semantics with ARIA -->
<button role="link">Read more</button>

<!-- RIGHT — use the right element -->
<a href="/articles/123">Read more</a>
```

### Anti-pattern 4: Hiding focus with `outline: none`

Removes the keyboard-user's only navigation indicator. If the default browser ring is ugly, REPLACE it (custom box-shadow, custom outline) — don't remove it.

### Anti-pattern 5: `tabindex="-1"` everywhere

`tabindex="-1"` removes an element from tab order BUT keeps it programmatically focusable. Useful for modal containers + landmark-focus on route change. NEVER use as a workaround to hide "broken" focusable elements.

### Anti-pattern 6: Auto-playing video with sound

WCAG 1.4.2 — auto-playing audio > 3 seconds must have a user-accessible mute control. Auto-play + sound is also a quality bug (annoying) and a privacy bug (it triggers connection patterns the user didn't consent to).

### Anti-pattern 7: Toast notifications without ARIA

The toast renders visually but assistive tech doesn't announce it. The user thinks their action did nothing. Use `role="status"` (polite) or `role="alert"` (assertive) wrappers.

### Anti-pattern 8: Form errors only at submit

Inline validation as the user types (debounced) + descriptive error messages + `aria-invalid` + `aria-describedby` — not "errors at the top of the form after submit" with no field association.

## Verification Checklist

Before declaring any UI surface complete:

- [ ] Tab through the entire flow — every interactive element reachable
- [ ] Shift+Tab through — focus order is reversible + sensible
- [ ] Esc closes every modal / dropdown / overlay
- [ ] Focus visible at every step (don't squint — it should be obvious)
- [ ] Test with VoiceOver (macOS): Cmd+F5 to toggle, navigate with VO+arrow
- [ ] Test with NVDA (Windows): start NVDA, navigate with Tab + arrows
- [ ] Test at 200% browser zoom — no horizontal scroll, no clipped content (WCAG 1.4.10)
- [ ] Test with `prefers-reduced-motion: reduce` enabled in OS — animations disabled
- [ ] Color-blind simulator pass (Sim Daltonism on macOS, browser DevTools elsewhere)
- [ ] axe DevTools scan: 0 violations
- [ ] Lighthouse Accessibility audit: ≥ 95
- [ ] Pa11y CI report: 0 errors
- [ ] Mobile screen-reader smoke (TalkBack / VoiceOver iOS): swipe through the screen
- [ ] Forms: every input has a real `<label>`; errors are programmatically associated
- [ ] Images: every `<img>` has `alt`; decorative ones use `alt=""`
- [ ] Headings: one `<h1>`; no skipped levels; structure conveys document outline

## Cross-References

- `~/.claude/rules-library/common/a11y.md` — the always-on rule (this skill is the implementation)
- `~/.claude/skills/accessible-forms/SKILL.md` — sister skill for form-specific patterns
- `~/.claude/skills/frontend-patterns/SKILL.md` — broader frontend architecture + visual design quality
- `~/.claude/rules-library/common/i18n.md` — accessibility overlaps with i18n (RTL, text expansion, language announcements)
- `~/.claude/rules-library/common/documentation-requirements.md` — docs are accessibility too
- `accessibility-reviewer` agent — opus-model agent that audits per this skill
- `ux-reviewer` agent — Council Division 7

## Why This Skill Exists

WCAG 2.2 audits routinely surface 50-200 violations per medium-sized application — most of which were preventable at write time. The cost of accessibility-aware development is small (semantic HTML, focus management, ARIA where needed). The cost of retrofit + legal exposure is large:

- EAA penalties vary by Member State; some allow class actions
- ADA lawsuits in the US: $50K-$500K typical settlement; thousands filed annually
- Enterprise procurement: VPAT (Voluntary Product Accessibility Template) increasingly required; missing VPAT = lost deal
- SEO: semantic HTML + alt text improves search ranking
- Quality: a11y bugs surface UX bugs (label associations, error messaging, focus order) that benefit all users

The patterns in this skill cover ≥ 80% of WCAG 2.2 AA conformance. The remaining 20% requires user testing with people who use assistive tech — schedule it.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- `<div onClick>` / `<span onClick>` instead of `<button>` (WCAG 2.1.1 keyboard + 4.1.2 name/role/value)
- `<img>` without `alt` attribute (1.1.1 non-text content)
- Color contrast < 4.5:1 for body / < 3:1 for large text (1.4.3)
- Focus indicator removed via `outline: none` without replacement (2.4.7 focus visible)
- Keyboard trap in modal / dialog (2.1.2)
- Form field without `<label for>` or `aria-label` (1.3.1 + 3.3.2)
- `<a>` used as `<button>` without `role="button"` (or vice versa)
- `tabindex > 0` (focus order anti-pattern — 2.4.3)
- Live region update without `aria-live="polite"` (4.1.3 status messages)
- Touch target < 24×24 CSS px (WCAG 2.2 §2.5.8)
- Sticky header / modal covering focused element (WCAG 2.2 §2.4.11)
- Drag-only interaction without keyboard alternative (WCAG 2.2 §2.5.7)
- Required `data-testid` for axe-core E2E missing on new component

**Refinement candidates**:
- New row in checklist when WCAG ships new SC (e.g., WCAG 3.0)
- New cross-reference when a sister skill (accessible-forms, interaction-design, frontend-patterns) adds an a11y gate
- New automated-test rule row when axe-core ships a new rule
- Tightening of the AA → AAA boundary when a critical-path surface upgrades

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/a11y.md`

---

<!-- ============================================================
     Section: a11y.md (from rules/common/)
     ============================================================ -->

# Accessibility (a11y) Rule (Always-On, Global)

> Auto-fires on every file. Sister to `security.md`,
> `task-intake-due-diligence.md` Q12 (a11y commitment),
> `frontend-patterns` skill (which owns visual design quality
> + component patterns).
> Standards: **WCAG 2.2 (W3C Recommendation, Oct 2023)**,
> **ARIA 1.2 (W3C Recommendation)**, **Section 508** (US),
> **EAA — European Accessibility Act** (effective Jun 2025),
> **ADA Title III** (US), **AODA** (Ontario), **EN 301 549**
> (EU public sector).

## Core Principle

**Every user-facing interface meets WCAG 2.2 Level AA at
minimum, with AAA for critical paths (auth, payment, account
management). Accessibility is not a "phase-2 polish" item — it
is a launch-blocker. Inaccessible UIs are legal liabilities in
the EU (EAA), US (ADA), Canada (AODA), and increasingly
elsewhere.**

## Hard rules

### 1. WCAG 2.2 Level AA is the floor

Every UI surface meets all 50 Level A + AA success criteria.
The most-violated in practice (the "everyday a11y" checklist):

| Criterion | Requirement |
| --- | --- |
| **1.1.1 Non-text Content** | Every `<img>` has `alt`; decorative images use `alt=""` |
| **1.3.1 Info and Relationships** | Semantic HTML — `<button>`, `<nav>`, `<main>`, `<form>`, `<label for>` — not `<div onClick>` |
| **1.4.3 Contrast (Minimum)** | Text: 4.5:1; large text (18pt+): 3:1; non-text UI: 3:1 |
| **1.4.10 Reflow** | Content reflows at 320 CSS pixels wide without horizontal scroll |
| **1.4.11 Non-text Contrast** | Borders, icons, focus rings: 3:1 |
| **1.4.12 Text Spacing** | User can override line-height, letter-spacing, word-spacing, paragraph-spacing without content overlap |
| **2.1.1 Keyboard** | Every interactive element reachable + actionable via keyboard |
| **2.1.2 No Keyboard Trap** | Focus can leave every region via Tab / Shift+Tab |
| **2.4.3 Focus Order** | Tab order matches visual order |
| **2.4.7 Focus Visible** | Visible focus indicator on every focusable element |
| **2.4.11 Focus Not Obscured** (WCAG 2.2 NEW) | Focused element not covered by sticky headers / modals |
| **2.5.7 Dragging Movements** (WCAG 2.2 NEW) | Drag-only interactions have a single-pointer alternative |
| **2.5.8 Target Size (Minimum)** (WCAG 2.2 NEW) | Touch targets ≥ 24×24 CSS pixels |
| **3.1.1 Language of Page** | `<html lang="en">` (or applicable locale) |
| **3.2.6 Consistent Help** (WCAG 2.2 NEW) | Help mechanisms (contact, support, FAQ) appear in the same place on every page |
| **3.3.1 Error Identification** | Errors named in text, not just colour |
| **3.3.7 Redundant Entry** (WCAG 2.2 NEW) | Forms don't re-ask info already provided in the same process |
| **3.3.8 Accessible Authentication (Minimum)** (WCAG 2.2 NEW) | No cognitive function tests (e.g., remembering a password) without an accessible alternative |
| **4.1.2 Name, Role, Value** | Every interactive element has accessible name + role + state |
| **4.1.3 Status Messages** | Status changes (loading, error, success) announced via `aria-live` |

WCAG 2.2 SCs marked NEW are post-2.1 — easy to miss if the
project was audited under 2.1.

### 2. AAA for critical paths

The five new WCAG 2.2 SCs apply at AA; AAA pushes further.
Critical paths (login, signup, payment, password reset,
account deletion, accessibility settings) meet:

| AAA criterion | Requirement |
| --- | --- |
| **1.4.6 Contrast (Enhanced)** | Text: 7:1; large text: 4.5:1 |
| **2.4.8 Location** | Breadcrumbs / sitemap show user where they are |
| **2.4.10 Section Headings** | Each section has a heading |
| **3.3.5 Help** | Context-sensitive help available for forms |
| **3.3.6 Error Prevention (All)** | Submissions are reversible / checked / confirmed |

### 3. Semantic HTML is mandatory; ARIA is the fallback

**First Rule of ARIA**: don't use ARIA when semantic HTML
works. The element gives the role for free:

```html
<!-- WRONG — div doing button work -->
<div onClick={onSubmit} role="button" tabIndex={0}
  onKeyDown={...}>Submit</div>

<!-- RIGHT — native button -->
<button onClick={onSubmit}>Submit</button>
```

When semantic HTML is insufficient (custom widgets — tabs,
combobox, tree, listbox, etc.), use ARIA per the **WAI-ARIA
Authoring Practices Guide** (APG):

- Match the role to the widget pattern
- Implement the keyboard interaction model the role expects
- Manage `aria-expanded` / `aria-selected` / `aria-current` /
  `aria-busy` / `aria-disabled` per state
- Announce state changes via `aria-live` (`polite` for
  routine, `assertive` for urgent)

### 4. Keyboard interaction model

Every interactive element responds to:

| Element | Required keyboard |
| --- | --- |
| Button | Enter + Space |
| Link | Enter (NOT Space) |
| Checkbox | Space |
| Radio | Arrow keys (within group) + Space |
| Select / combobox | Arrow keys, Enter, Esc, type-ahead |
| Tab list | Arrow keys (within list), Home, End |
| Menu | Arrow keys, Enter, Esc, Home, End, type-ahead |
| Modal / dialog | Esc closes; Tab loops within; focus returns to opener on close |
| Tree | Arrow keys (Up/Down for siblings, Left/Right for collapse/expand) |
| Slider | Arrow keys, Home, End, PageUp, PageDown |

Custom widgets that don't implement the expected model are
invisible to keyboard users + screen-reader users.

### 5. Focus management

- **Visible focus ring** — never `outline: none` without a
  replacement; the replacement meets 3:1 contrast (WCAG 1.4.11)
- **Focus trap in modals** — Tab loops within the modal; focus
  returns to the trigger element on close
- **Focus restoration** — after async navigation, focus moves
  to the new page's main heading (or a designated landmark)
- **Skip link** — at the top of every page, a "Skip to main
  content" link that becomes visible on focus

### 6. Screen reader support

- Test with VoiceOver (macOS) + NVDA (Windows) + JAWS (Windows
  enterprise) + TalkBack (Android) + iOS Safari + VoiceOver
- ARIA live regions for dynamic updates
- Headings hierarchy is meaningful (one `<h1>` per page; no
  skipped levels)
- Form fields use `<label for>` — never `placeholder` as the
  only label
- Error messages are programmatically associated with the
  field (`aria-describedby`, `aria-invalid`)

### 7. Color is never the only signal

- Required-field indicators: red border AND text "Required"
- Status (success / warning / error): icon AND colour AND text
- Charts: distinct shapes / patterns, not just colour
- Tested under colour-blind simulators (deuteranopia,
  protanopia, tritanopia)

### 8. Motion respects user preferences

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Vestibular disorders are common; auto-playing videos +
parallax + heavy animation cause real harm.

### 9. Automated + manual testing

| Type | Tool | What it catches |
| --- | --- | --- |
| Automated | **axe-core** (Deque) | ~30-40% of issues — color contrast, missing alt, missing labels |
| Automated | **Pa11y** | CLI for axe-core; CI-friendly |
| Automated | **Lighthouse Accessibility audit** | Quick check during dev |
| Manual | Keyboard-only walkthrough | The other 60-70% — keyboard traps, focus order, modal escape |
| Manual | Screen reader walkthrough | Semantic + ARIA correctness |
| Manual | Browser-zoom test (200% / 400%) | Reflow, content overlap, hidden controls |
| Manual | Color-blind simulator | Color-only signals |
| User testing | Disabled users | The most valuable signal |

Automated tools catch the floor; manual + user testing catch
the rest.

### 10. CI gates a11y like it gates lint

Every PR runs:

- `axe-core` against every changed page / component
- Storybook a11y addon (component-level)
- Visual regression on focus / hover / disabled states
- Build fails on new HIGH a11y violations

A11y debt is tracked + budgeted, never accepted silently.

## EU Accessibility Act (EAA) compliance (effective Jun 2025)

EAA applies to many digital products + services sold to EU
consumers: e-commerce, banking, transport ticketing, e-books,
audiovisual media services, communication tools. The standard
referenced is **EN 301 549**, which incorporates WCAG 2.1 AA
(WCAG 2.2 alignment is in flight).

Required deliverables:

- **Accessibility statement** on every public website
  (URL, contact, compliance level, known gaps + remediation
  timeline, enforcement-body contact)
- **Reporting mechanism** for users to report a11y issues
- **Conformance evidence** — automated audit + manual audit +
  user testing artifacts retained

The penalty for non-conformance varies by Member State; some
allow class actions.

## Cross-references

- `task-intake-due-diligence.md` Q12 — a11y commitment named
  in every task intake
- `security.md` — accessibility is part of compliance (EAA,
  ADA, AODA)
- `frontend-patterns` skill — component patterns with
  keyboard + ARIA built in, plus visual design quality
  (typography, color, motion) that meets WCAG contrast +
  reduced-motion requirements
- `done-criteria.md` — every "done" claim runs the a11y gate
- `testing.md` Q14 — accessibility tests are part of every
  test plan

## Standards cited

- **WCAG 2.2** (W3C, Oct 2023) — Level A, AA, AAA
- **WAI-ARIA 1.2** (W3C, Jun 2023)
- **ARIA Authoring Practices Guide** (W3C)
- **Section 508** (US 36 CFR §1194)
- **EN 301 549 v3.2.1** (ETSI, EU public-sector + EAA)
- **EAA** — European Accessibility Act 2019/882 (effective
  28 Jun 2025)
- **ADA Title III** (US 42 USC §12181)
- **AODA** (Ontario Reg 191/11)

## Why this rule exists

Inaccessible UIs exclude users with disabilities (15-20% of
the population, World Bank estimate). Beyond ethics:

- **Legal**: ADA / EAA / AODA carry penalties + class-action
  exposure
- **Commercial**: enterprise procurement increasingly requires
  VPATs (Voluntary Product Accessibility Templates); failing
  a11y costs deals
- **SEO**: semantic HTML + alt text + headings improve search
  ranking
- **Quality**: a11y bugs surface UX bugs (label associations,
  keyboard flows, error messaging) that non-disabled users
  also benefit from

The cost of a11y at design + build time is small; the cost of
a retrofit + legal exposure is huge.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- WCAG 2.2 NEW success criterion (2.4.11 / 2.5.7 / 2.5.8 / 3.2.6 / 3.3.7 / 3.3.8) missed on a UI surface (rule 1 weakening)
- ARIA used where semantic HTML would have worked (rule 3 violation — "First Rule of ARIA")
- Custom widget shipped without the expected keyboard interaction model (rule 4 weakening)
- `outline: none` shipped without a visible focus-ring replacement (rule 5 weakening)
- Color used as sole signal (rule 7 violation — colour-blind exclusion)
- `prefers-reduced-motion` not honoured on a new animation (rule 8 weakening)
- axe-core finding shipped to production (CI gate weak per rule 10)
- New form pattern shipped without screen-reader smoke (rule 6 weakening)
- EAA / ADA / AODA scope expanded but accessibility-statement not updated

**Refinement candidates**:
- New required-criterion row when WCAG releases a new SC
- New "critical paths" entry when a new auth / payment / account flow gains regulatory criticality
- Tightening of the AAA list when a recurring regulatory finding suggests AA is insufficient for a path
- New cross-reference when a sister rule (i18n, frontend-patterns) prescribes a complementary a11y constraint

---
