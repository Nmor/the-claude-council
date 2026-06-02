# HTML / CSS Coding Style

> Auto-fires on every `*.html`, `*.htm`, `*.css`, `*.scss`,
> `*.sass`, `*.less`, `*.module.css`, `*.styl`,
> `*.postcssrc`, `*.stylelintrc*`, `*.css.ts`, `*.styled.ts`
> file. Standards: **HTML Living Standard (WHATWG, last updated
> 28 May 2026)**, **CSS Snapshot 2026** (W3C — Cascading Style
> Sheets specifications), **WCAG 2.2** (W3C Recommendation, Oct
> 2023), **ARIA 1.2**, **stylelint 17.11.0** with
> **stylelint-config-standard 40.0.0**, **HTMLHint** (current),
> **Prettier 3.x** (formatting only).

## Core Principle

**Semantic HTML first; CSS handles presentation; ARIA fills the
gaps semantic HTML cannot. Every element exists for a reason a
screen reader can articulate. Every CSS value comes from a token
(custom property), never an inline literal. Every interactive
element is keyboard-reachable, focus-visible, hit-target ≥ 24×24
CSS pixels (WCAG 2.2 §2.5.8). Layout via Flexbox / Grid /
intrinsic-sizing functions; never via tables, never via absolute
positioning for layout. CSS is cascading + specificity-managed;
the design system owns the cascade root and components extend
it.**

## Hard rules

### 1. Semantic HTML, never `<div>` soup

Every interactive element uses the HTML element that names its
role. ARIA is the LAST resort (per WAI-ARIA Authoring Practices
"First Rule of ARIA: don't").

```html
<!-- WRONG — div soup with role attribute -->
<div onclick="submitForm()" role="button" tabindex="0">Submit</div>

<!-- RIGHT — native button -->
<button type="submit">Submit</button>

<!-- WRONG — div as heading -->
<div class="heading-1">Page title</div>

<!-- RIGHT — h1 -->
<h1>Page title</h1>

<!-- WRONG — span as link -->
<span onclick="navigate('/about')">About</span>

<!-- RIGHT — anchor -->
<a href="/about">About</a>
```

Mapping:

| Semantic element | Use for |
| --- | --- |
| `<button>` | Triggers an action on the current page |
| `<a href>` | Navigates to a new URL or same-page anchor |
| `<input>` / `<textarea>` / `<select>` | Form data entry |
| `<label>` | Associated with a form control via `for=` |
| `<fieldset>` / `<legend>` | Grouping related form controls |
| `<nav>` | Primary / secondary navigation |
| `<main>` | The page's primary content (one per page) |
| `<article>` | Self-contained content (post, card) |
| `<aside>` | Tangential content (callout, sidebar) |
| `<section>` | Thematic grouping with a heading |
| `<header>` / `<footer>` | Page or section header / footer |
| `<details>` / `<summary>` | Disclosure widget (native, no JS) |
| `<dialog>` | Modal or non-modal dialog (with `showModal()`) |
| `<table>` + `<thead>` / `<tbody>` / `<tfoot>` / `<caption>` | TABULAR DATA ONLY; never layout |
| `<figure>` / `<figcaption>` | Image / chart with caption |
| `<time datetime="...">` | Machine-readable timestamp |
| `<address>` | Contact info for the nearest article / page |

### 2. One `<h1>` per page; heading hierarchy never skips levels

Screen-reader users navigate by headings (NVDA + JAWS bind `H`
to next heading; VoiceOver iOS uses the rotor). Skipping levels
(h1 → h3) breaks document outline.

```html
<!-- CORRECT -->
<h1>Article title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
<h3>Subsection</h3>
<h2>Section</h2>

<!-- WRONG — visual hierarchy via CSS, semantic disconnect -->
<div class="title-xl">Article title</div>
<div class="title-lg">Section</div>
```

### 3. Every form input has an associated label

```html
<!-- WRONG -->
<input type="email" placeholder="Email" />

<!-- RIGHT — explicit label/for -->
<label for="email">Email</label>
<input type="email" id="email" name="email" autocomplete="email" required />

<!-- RIGHT — implicit (wrapped) -->
<label>
  Email
  <input type="email" name="email" autocomplete="email" required />
</label>
```

Placeholder text is NOT a label substitute (disappears on focus;
fails colour contrast; not announced as a name by older AT).

Required attributes on every form input:

- `name` — for form submission
- `id` (if used by `<label for>`)
- `type` — narrow as possible (`email`, `tel`, `url`, `number`,
  `date`, `time`, `search`)
- `autocomplete` — see WCAG 2.2 §1.3.5 + WHATWG autofill values
- `required` / `aria-required` when required
- `inputmode` — guides mobile keyboard

### 4. Every image has `alt` text

```html
<!-- Content image -->
<img src="payments-chart-q2.svg" alt="Q2 payments volume: $4.2M, up 18% from Q1" />

<!-- Decorative image (no information conveyed) -->
<img src="divider.svg" alt="" role="presentation" />

<!-- Image with surrounding caption -->
<figure>
  <img src="payments-chart-q2.svg" alt="" />
  <figcaption>Q2 payments volume: $4.2M, up 18% from Q1</figcaption>
</figure>
```

`alt=""` (empty string) is REQUIRED for decorative images — NOT
omitted. Missing `alt` attribute (vs `alt=""`) is a screen-reader
fallback to the filename.

### 5. `lang` attribute on every page; per-region overrides

```html
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page title — Site</title>
  </head>
  <body>
    <main>
      <p>Most content in English.</p>
      <p lang="fr">Une citation en français.</p>
    </main>
  </body>
</html>
```

WCAG 2.2 §3.1.1 (Language of Page) + §3.1.2 (Language of Parts).

### 6. CSS custom properties (variables) as design tokens

Every value used in 3+ places lives as a custom property.
Tokens cascade from `:root` (or a design-system root selector).

```css
/* WRONG — raw values scattered */
.button-primary {
  background: #4f46e5;
  color: #ffffff;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
}
.card-shadow {
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
}

/* RIGHT — tokens at root, components reference them */
:root {
  --color-brand-500: #4f46e5;
  --color-brand-50: #eef2ff;
  --color-text-on-brand: #ffffff;

  --space-3: 0.75rem;     /* 12px @ 16px root */
  --space-6: 1.5rem;      /* 24px */

  --font-size-base: 1rem;
  --font-size-md: 1.0625rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;

  --shadow-md: 0 4px 12px hsl(238 84% 60% / 0.15);

  --duration-fast: 150ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
}

.button-primary {
  background: var(--color-brand-500);
  color: var(--color-text-on-brand);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-base);
  border-radius: var(--radius-md);
}
.card { box-shadow: var(--shadow-md); }
```

Per the post-edit hook on UI files (no-discards.md), raw colour
literals (`#fff`, `rgb(...)`, `hsl(...)`, `oklch(...)`) inside
component CSS are REJECTED. Tokens live in the design-system
file (`tokens.css`, `theme.css`); components reference.

### 7. Layout via Flexbox / Grid / intrinsic; never via tables

```css
/* CORRECT — Grid for two-column layout */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: var(--space-6);
}

/* CORRECT — Flexbox for one-axis composition */
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* CORRECT — intrinsic sizing */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: var(--space-6);
}
```

`<table>` is for tabular data only. Multi-column form layouts
use CSS Grid `grid-template-columns: auto 1fr` (with form
controls).

### 8. Logical properties (RTL-ready)

Per [`common/i18n.md`](../common/i18n.md) — RTL languages
mirror layout. Use CSS logical properties to support mirror
automatically:

```css
/* WRONG — physical properties; LTR-only */
.menu {
  margin-left: var(--space-3);
  padding-right: var(--space-6);
  text-align: left;
  border-left: 1px solid var(--color-border);
}

/* RIGHT — logical properties; auto-mirrors in RTL */
.menu {
  margin-inline-start: var(--space-3);
  padding-inline-end: var(--space-6);
  text-align: start;
  border-inline-start: 1px solid var(--color-border);
}
```

Property map:

| Physical | Logical |
| --- | --- |
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-top` | `padding-block-start` |
| `padding-bottom` | `padding-block-end` |
| `width` | `inline-size` |
| `height` | `block-size` |
| `left` | `inset-inline-start` |
| `top` | `inset-block-start` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |

### 9. Focus indicator: always visible, never `outline: none` alone

```css
/* WRONG — removes keyboard accessibility entirely */
button:focus { outline: none; }

/* CORRECT — replace with a visible focus ring */
button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* CORRECT — focus ring uses CSS custom property */
:root {
  --color-focus-ring: oklch(60% 0.18 240); /* visible on light + dark */
}
```

WCAG 2.2 §2.4.7 (Focus Visible) + §2.4.11 (Focus Not Obscured —
new in 2.2). The focus ring must meet 3:1 contrast (§1.4.11
Non-Text Contrast).

### 10. Touch target ≥ 24×24 CSS pixels (WCAG 2.2 §2.5.8)

```css
/* Minimum interactive area */
.button {
  min-block-size: 2.5rem;    /* 40px @ 16px root — well above 24px */
  min-inline-size: 2.5rem;
}

/* Icon-only button — ensure clickable area */
.icon-button {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

24×24 is the AA floor; 44×44 is Apple HIG / 48×48 is Material
Design recommendation.

### 11. `prefers-reduced-motion` respected

```css
@keyframes slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.toast {
  animation: slide-in var(--duration-medium) var(--easing-default);
}

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

Per [`common/a11y.md`](../common/a11y.md) — vestibular disorders
are common; `prefers-reduced-motion` honored or animations
optional.

### 12. Colour contrast: AA minimum, AAA for critical paths

| Text class | WCAG AA | WCAG AAA |
| --- | --- | --- |
| Normal text (< 18pt) | 4.5:1 | 7:1 |
| Large text (≥ 18pt OR ≥ 14pt bold) | 3:1 | 4.5:1 |
| Non-text UI (borders, icons, focus rings) | 3:1 | n/a |

Tools: stylelint plugins, `axe-core`, Lighthouse, Chrome DevTools
Contrast Analyzer.

### 13. Naming: BEM + utility tiers OR pick-one

Two canonical conventions; PICK ONE per project:

```css
/* BEM — Block__Element--Modifier */
.card {}
.card__title {}
.card__title--large {}
.card--featured {}
.card--featured .card__title {}

/* Utility-first (Tailwind-shaped) — composable single-purpose classes */
.flex {}
.items-center {}
.gap-3 {}
.bg-brand-500 {}
.text-white {}
```

Project's CSS architecture document specifies the convention.
Mixed BEM-and-utility within one file is a smell.

### 14. CSS layer order

CSS Cascade Layers (CSS Cascade Level 5) let you order
specificity explicitly:

```css
@layer reset, tokens, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  /* modern reset rules */
}

@layer tokens {
  :root {
    --color-brand-500: #4f46e5;
    /* ... */
  }
}

@layer base {
  body { font-family: var(--font-body); }
  h1, h2, h3 { line-height: 1.2; }
}

@layer components {
  .button { /* ... */ }
}

@layer utilities {
  .sr-only { /* visually-hidden but screen-reader-accessible */ }
}
```

The layer order is declared once; subsequent rules in later
layers always win, regardless of specificity. This kills "I need
`!important` to override Bootstrap" scenarios.

### 15. No `!important` outside utility layer

Per [`common/coding-style.md`](../common/coding-style.md) — the
no-discards post-edit hook warns on `!important` in CSS. Allowed
ONLY in a utility-class layer where overrides are intentional.

```css
/* CORRECT — utility layer, explicit override */
@layer utilities {
  .hidden { display: none !important; }
  .sr-only {
    position: absolute !important;
    inline-size: 1px !important;
    /* ... */
  }
}

/* WRONG — fighting the cascade with !important inside components */
.card-title {
  color: red !important;  /* signal of architectural break */
}
```

### 16. Cleanroom modern CSS — no vendor prefixes by hand

Use `autoprefixer` (PostCSS plugin) configured via Browserslist.
The project's `.browserslistrc` declares the target browser
matrix; autoprefixer generates the necessary `-webkit-` /
`-moz-` / `-ms-` prefixes. Hand-written prefixes rot.

```text
# .browserslistrc
defaults
not IE 11
not Safari < 14
```

## Required `.stylelintrc.json`

```jsonc
{
  "extends": [
    "stylelint-config-standard",
    "stylelint-config-recess-order"
  ],
  "plugins": [
    "stylelint-order",
    "stylelint-a11y"
  ],
  "rules": {
    "color-no-invalid-hex": true,
    "color-named": "never",
    "color-no-hex": null,
    "no-duplicate-selectors": true,
    "selector-max-id": 0,
    "selector-max-class": 3,
    "selector-max-compound-selectors": 4,
    "selector-max-specificity": "0,4,0",
    "selector-no-qualifying-type": [true, { "ignore": ["attribute"] }],
    "declaration-no-important": [true, {
      "severity": "error"
    }],
    "max-nesting-depth": 3,
    "no-descending-specificity": true,
    "media-feature-range-notation": "context",
    "alpha-value-notation": "number",
    "color-function-notation": "modern",
    "hue-degree-notation": "angle",
    "value-no-vendor-prefix": [true, {
      "ignoreValues": ["box"]
    }],
    "property-no-vendor-prefix": true,
    "selector-no-vendor-prefix": true,
    "comment-empty-line-before": "always",
    "rule-empty-line-before": ["always", { "ignore": ["first-nested"] }],
    "function-no-unknown": [true, {
      "ignoreFunctions": ["theme", "v-bind"]
    }]
  }
}
```

## Required `.htmlhintrc`

```jsonc
{
  "tagname-lowercase": true,
  "attr-lowercase": true,
  "attr-value-double-quotes": true,
  "attr-value-not-empty": false,
  "attr-no-duplication": true,
  "doctype-first": true,
  "doctype-html5": true,
  "id-unique": true,
  "src-not-empty": true,
  "title-require": true,
  "alt-require": true,
  "head-script-disabled": true,
  "inline-script-disabled": false,
  "inline-style-disabled": true,
  "space-tab-mixed-disabled": "space",
  "id-class-ad-disabled": true,
  "href-abs-or-rel": false,
  "attr-unsafe-chars": true
}
```

## Naming

| Object | Convention | Example |
| --- | --- | --- |
| HTML id | `kebab-case` | `id="login-email"` |
| HTML data-attr | `kebab-case` | `data-test-id="cart-submit"` |
| HTML class | per-project (BEM or utility) | `.card__title`, `.flex` |
| CSS custom prop | `--kebab-case` with tier prefix | `--color-brand-500`, `--space-6` |
| CSS file | `kebab-case.css` | `button-primary.css` |
| CSS module | `<component>.module.css` | `Button.module.css` |
| BEM block | `kebab-case` | `.user-profile` |
| BEM element | `__kebab-case` | `.user-profile__avatar` |
| BEM modifier | `--kebab-case` | `.user-profile--featured` |

## Cross-references

- [`html-css/patterns.md`](./patterns.md) — component patterns
- [`html-css/security.md`](./security.md) — CSP, XSS, sanitisation
- [`html-css/testing.md`](./testing.md) — visual regression, axe
- [`html-css/hooks.md`](./hooks.md) — lint + format gates
- [`common/a11y.md`](../common/a11y.md) — WCAG 2.2 mandates
- [`common/i18n.md`](../common/i18n.md) — RTL + locale-aware
  number / date formatting
- [`common/coding-style.md`](../common/coding-style.md) — no
  raw colour literals; no `!important` outside utility layer
- [`common/no-discards.md`](../common/no-discards.md) — hook
  rejects raw colour literals in component CSS
- [`typescript/coding-style.md`](../typescript/coding-style.md)
  — React / Vue / Svelte component conventions
- [`common/documentation-requirements.md`](../common/documentation-requirements.md)
  — design-system documentation

## Why this rule exists

HTML + CSS are the most-consumed languages of any web product:
every user sees the output, including users with disabilities,
on poor networks, on small screens, in their second language.
Drift on semantic HTML breaks screen readers; drift on CSS
tokens breaks dark mode and theming; drift on focus styles
breaks keyboard users. The rules above codify the modern web
baseline.

Recurring incidents averted by this rule:

- A modal that traps screen readers because `<dialog>` was
  replaced with a `<div role="dialog">` without focus management
- A signup form that fails because `placeholder` is the only
  label and password managers can't autofill
- A button row that no keyboard user can reach because
  `outline: none` was applied without a replacement
- A dark-mode regression because a component hardcoded `#fff`
  instead of `var(--color-bg-elevated)`

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

**Signals to watch**:

- `<div role="button">` / `<span onclick>` shipped instead of
  native semantic element (rule 1 violation)
- `<h1>` count > 1 on a page OR heading levels skipped (rule 2)
- `placeholder` used as the only label on a form input (rule 3)
- Image without `alt` attribute (vs `alt=""`) shipped (rule 4)
- Raw colour literal in component CSS (rule 6 + hook trigger)
- `<table>` used for layout (rule 7)
- Physical CSS property used where logical exists (rule 8 — RTL
  blocker)
- `outline: none` without a replacement (rule 9 — keyboard
  accessibility broken)
- Touch target < 24×24 CSS px shipped (rule 10 — WCAG 2.2 §2.5.8)
- `!important` inside non-utility layer (rule 15 violation)

**Refinement candidates**:

- New CSS module / convention row when a new CSS feature lands
  in the snapshot
- Tightening of the WCAG contrast floor when AAA usage proves
  feasible
- New cross-reference when a sister rule (a11y, i18n,
  frontend-patterns skill) gains a constraint the style rule
  must honour
- New token-tier entry when a recurring design class needs its
  own naming convention (semantic vs primitive tokens)
