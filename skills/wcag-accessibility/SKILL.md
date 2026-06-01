---
name: wcag-accessibility
description: WCAG 2.2 AA + AAA accessibility patterns for every user-facing surface — semantic HTML, ARIA 1.2, keyboard navigation, screen reader support, color contrast, motion preferences, and the 9 new SCs introduced in WCAG 2.2.
---

# WCAG Accessibility

Production patterns for meeting WCAG 2.2 Level AA on every UI surface and Level AAA on critical paths (auth, payment, account management, account deletion). Pairs with the global `a11y.md` rule.

## Purpose

Accessibility is not retrofit work. It is the design contract that says: every user can perceive, operate, understand, and interact with the product. Inaccessible UIs are legal liabilities (EAA 2025, ADA Title III, AODA, Section 508), commercial losses (enterprise procurement requires VPATs), and engineering failures (the bugs you only see when you test with real assistive tech).

This skill encodes the patterns that pass WCAG 2.2 audits + screen-reader smoke tests + keyboard walkthroughs. It does NOT cover the rule-level enforcement — that lives in `~/.claude/rules/common/a11y.md`. This skill is the IMPLEMENTATION arm.

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

- `~/.claude/rules/common/a11y.md` — the always-on rule (this skill is the implementation)
- `~/.claude/skills/accessible-forms/SKILL.md` — sister skill for form-specific patterns
- `~/.claude/skills/frontend-patterns/SKILL.md` — broader frontend architecture + visual design quality
- `~/.claude/rules/common/i18n.md` — accessibility overlaps with i18n (RTL, text expansion, language announcements)
- `~/.claude/rules/common/documentation-requirements.md` — docs are accessibility too
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
