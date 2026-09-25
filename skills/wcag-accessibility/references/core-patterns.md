# wcag-accessibility: Core Patterns

> Covers **Core Patterns** for the `wcag-accessibility` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 9 KB** — `token-budget.mjs --check`.

## Core Patterns

### Semantic HTML before ARIA

ARIA Rule 1: don't use ARIA when semantic HTML works. The element gives the role for free; ARIA adds
nothing but maintenance burden + screen-reader announcement bugs.

```html
<!-- WRONG — div doing button work; screen reader announces nothing -->
<div class="btn" onClick="submit()" role="button" tabindex="0"
     onKeyDown="if (e.key === 'Enter' || e.key === ' ') submit()">
  Submit
</div>

<!-- RIGHT — native button -->
<button type="submit" onClick="submit()">Submit</button>
```

Native elements bring keyboard handling, focus management, form semantics, disabled state
propagation, and ARIA role for free.

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

Custom widgets that don't implement the expected model are invisible to keyboard users +
screen-reader users — they may render, but they don't WORK.

### Focus management invariants

- **Visible focus ring always** — never `outline: none` without a documented replacement at ≥ 3:1
  contrast (WCAG 1.4.11)
- **Focus trap in modals** — Tab cycles within; focus returns to the trigger on close
- **Focus restoration on route change** — after async navigation, move focus to the new page's
  `<h1>` or designated landmark
- **Skip link** — first focusable element on every page is a "Skip to main content" link that
  becomes visible when focused

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

Vestibular disorders are common (~1 in 5 adults experience some vestibular dysfunction in their
lifetime). Auto-playing videos, parallax effects, and heavy CSS transitions cause real harm. Honour
the OS-level setting.

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

Loading spinners + skeletons MUST announce loading state. Toast notifications MUST be in a live
region OR called via `role="status"`.

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
