# HTML / CSS Patterns

> Auto-fires on every `*.html`, `*.css`, `*.scss`, `*.less`,
> `*.styl`, `*.module.css`, `*.css.ts`, `*.styled.ts`,
> `*.vue` `<style>` blocks, `*.svelte` `<style>` blocks file.
> Standards: **HTML Living Standard**, **CSS Snapshot 2026**,
> **WAI-ARIA Authoring Practices Guide (APG)**, **Material
> Design 3**, **Apple Human Interface Guidelines**, **Inclusive
> Components (Heydon Pickering)**, **Every Layout (Andy Bell +
> Heydon Pickering)**, **CUBE CSS (Andy Bell)**, **Design Tokens
> Community Group spec**.

## Core Principle

**Components compose from primitives; primitives compose from
tokens. Layout is a separate concern from theme — a Stack /
Cluster / Grid layout primitive doesn't know about colour, a
Button component doesn't know about spacing direction. The
design system owns the tokens; product code consumes them.
Accessibility is a CONSTRAINT, not a feature — every component
ships with keyboard + screen-reader support from day one.**

## Architectural patterns

### Pattern 1: Token tiers (primitive → semantic → component)

Three layers of CSS custom properties:

```css
/* tokens/primitives.css — raw values, no semantic meaning */
:root {
  --slate-50: oklch(98% 0.005 240);
  --slate-900: oklch(20% 0.015 240);
  --indigo-500: oklch(60% 0.18 264);
  --indigo-700: oklch(45% 0.20 264);

  --size-1: 0.25rem;
  --size-2: 0.5rem;
  --size-3: 0.75rem;
  --size-4: 1rem;
  --size-6: 1.5rem;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

/* tokens/semantic.css — names the role, references primitives */
:root {
  --color-bg-canvas: var(--slate-50);
  --color-bg-elevated: white;
  --color-text-default: var(--slate-900);
  --color-text-on-brand: white;

  --color-brand-default: var(--indigo-500);
  --color-brand-hover: var(--indigo-700);

  --space-inset-sm: var(--size-2);
  --space-inset-md: var(--size-3);
  --space-stack-md: var(--size-4);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-canvas: var(--slate-900);
    --color-bg-elevated: oklch(25% 0.015 240);
    --color-text-default: var(--slate-50);
  }
}

/* components/button.css — references semantic tokens */
.button {
  background: var(--color-brand-default);
  color: var(--color-text-on-brand);
  padding: var(--space-inset-sm) var(--space-inset-md);
}
.button:hover { background: var(--color-brand-hover); }
```

Dark mode + brand swaps + accessibility-mode (high-contrast)
change a handful of semantic tokens; the entire component tree
re-renders correctly.

### Pattern 2: Layout primitives (Every-Layout style)

Reusable layout components, each owning ONE composition rule:

```css
/* Stack — vertical rhythm with consistent gap */
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-stack-md);
}

/* Cluster — horizontal items with wrap */
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-inset-md);
  align-items: center;
}

/* Sidebar — content beside a sidebar that becomes vertical at narrow widths */
.sidebar-layout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}
.sidebar-layout > :first-child { flex-basis: 18rem; flex-grow: 1; }
.sidebar-layout > :last-child { flex-basis: 0; flex-grow: 999; min-inline-size: 50%; }

/* Center — horizontally-centred content with max-width */
.center {
  box-sizing: content-box;
  margin-inline: auto;
  max-inline-size: 60ch;
  padding-inline: var(--space-6);
}

/* Cover — full-viewport coverage with optional vertical centering */
.cover {
  display: flex;
  flex-direction: column;
  min-block-size: 100dvb;
}

/* Grid — auto-fitting responsive grid */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: var(--space-6);
}
```

Layout primitives are content-agnostic. A "Stack" doesn't know
if its children are paragraphs or cards. Composition stays
predictable.

### Pattern 3: Accessible component pattern (WAI-ARIA APG)

For every interactive component, follow the WAI-ARIA Authoring
Practices Guide pattern. Example: Disclosure / Accordion using
native HTML where possible:

```html
<details class="disclosure">
  <summary class="disclosure__trigger">
    What is included in the plan?
  </summary>
  <div class="disclosure__content">
    <p>Plan includes unlimited storage, …</p>
  </div>
</details>

<!-- Custom disclosure (when <details> doesn't fit) -->
<div class="disclosure">
  <button
    type="button"
    aria-expanded="false"
    aria-controls="panel-1"
    id="trigger-1"
    class="disclosure__trigger">
    Section title
  </button>
  <div id="panel-1" role="region" aria-labelledby="trigger-1" hidden>
    Section content
  </div>
</div>
```

Tab interaction pattern requires:

- `role="tablist"` on container
- `role="tab"` on each tab; `aria-selected="true"` on active
- `role="tabpanel"` with `aria-labelledby="<tab-id>"`
- Arrow keys (Left/Right or Up/Down) switch tabs
- Home/End jump to first/last tab
- Tab key moves into the panel content

Per [`common/a11y.md`](../common/a11y.md) — keyboard model must
match the APG-specified interaction.

### Pattern 4: Container queries for component-aware design

```css
.product-card {
  container-type: inline-size;
  container-name: card;
}

.product-card__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@container card (inline-size > 32rem) {
  .product-card__layout {
    grid-template-columns: 1fr 2fr;
  }
}
```

Container queries replace responsive design driven by viewport
media queries when the trigger is the component's available
space (e.g., card layout in a grid varies by grid column width).

### Pattern 5: Compound components (React / Vue / Svelte)

The compound-component pattern lets consumers compose semantic
HTML structure inside a styled wrapper:

```tsx
// React example
<Card>
  <Card.Header>
    <Card.Title>Order #12345</Card.Title>
    <Card.Actions>
      <Button variant="ghost">Edit</Button>
    </Card.Actions>
  </Card.Header>
  <Card.Body>
    {/* content */}
  </Card.Body>
  <Card.Footer>
    <Button>Submit</Button>
  </Card.Footer>
</Card>
```

The wrapper applies token-driven styling; the sub-components
emit semantic HTML (`<header>`, `<h3>`, `<footer>`).

### Pattern 6: Form pattern (label + input + hint + error)

```html
<div class="form-field">
  <label for="email" class="form-field__label">Email</label>
  <input
    id="email"
    name="email"
    type="email"
    autocomplete="email"
    required
    aria-describedby="email-hint email-error"
    aria-invalid="false"
    class="form-field__input"
  />
  <p id="email-hint" class="form-field__hint">
    We'll use this to send your receipt.
  </p>
  <p id="email-error" class="form-field__error" role="alert" hidden>
    Enter a valid email address.
  </p>
</div>
```

On error:

- `aria-invalid="true"` on the input
- `hidden` removed from the error element
- Focus moves to the FIRST invalid field on submit failure
- Per-field validation triggers on blur, not on every keystroke
  (no noisy AT announcements)

### Pattern 7: Dialog / modal pattern

Modern HTML provides `<dialog>` natively:

```html
<button type="button" id="open-dialog">Confirm deletion</button>

<dialog id="confirm-delete">
  <form method="dialog" class="confirm-dialog">
    <h2 id="confirm-title">Delete order?</h2>
    <p id="confirm-desc">
      This will permanently remove order #12345 and cannot be undone.
    </p>
    <div class="confirm-dialog__actions">
      <button type="submit" value="cancel">Cancel</button>
      <button type="submit" value="confirm" class="button--danger">Delete</button>
    </div>
  </form>
</dialog>

<script>
  const dialog = document.getElementById('confirm-delete');
  const trigger = document.getElementById('open-dialog');

  trigger.addEventListener('click', () => {
    dialog.showModal();             // native focus trap + backdrop
  });

  dialog.addEventListener('close', () => {
    trigger.focus();                // return focus to trigger
    if (dialog.returnValue === 'confirm') { /* perform action */ }
  });
</script>
```

`<dialog>` provides:

- Native focus trap (no library required)
- Backdrop via `::backdrop` pseudo-element
- Escape-key dismissal
- `inert`-style "rest of page" behaviour

For older browsers / specific UX needs, the React Aria / Radix
UI / Headless UI libraries provide accessible dialog primitives.

### Pattern 8: Skeleton / loading state pattern

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-skeleton-base) 0%,
    var(--color-bg-skeleton-shimmer) 50%,
    var(--color-bg-skeleton-base) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes skeleton-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
```

Skeletons render with `aria-hidden="true"` + an
`aria-live="polite"` region above announcing loading state.

## CSS architecture conventions

### CUBE CSS (Andy Bell)

```text
C — Composition: layout primitives (Stack, Cluster, Sidebar, Grid)
U — Utilities: single-purpose classes (.flow, .visually-hidden)
B — Block: named components with isolated styles
E — Exceptions: data-attribute-based variants (data-state="open")
```

### BEM (Block Element Modifier)

```text
.user-profile           — block
.user-profile__avatar   — element of block
.user-profile--admin    — modifier
.user-profile__avatar--large  — element with modifier
```

### Utility-first (Tailwind-shaped)

```html
<div class="flex items-center gap-3 rounded-lg bg-brand-500 p-4 text-white">
  …
</div>
```

Project's CSS architecture document picks ONE — mixed-and-matched
within a file is the anti-pattern.

## Anti-patterns

### Anti-pattern 1: ID selectors in CSS

```css
/* WRONG — specificity 0,1,0,0 — wins everything */
#main-nav { color: blue; }

/* RIGHT */
.main-nav { color: blue; }
```

`stylelint`'s `selector-max-id: 0` enforces.

### Anti-pattern 2: Nested deep selectors

```css
/* WRONG — fragile to DOM changes */
.card .header .title-row .title h2 { font-size: 1.25rem; }

/* RIGHT — direct class */
.card__title { font-size: 1.25rem; }
```

`stylelint`'s `selector-max-compound-selectors: 4`.

### Anti-pattern 3: Style attribute in HTML

```html
<!-- WRONG -->
<div style="color: red; font-size: 18px;">Error</div>

<!-- RIGHT -->
<div class="error-message">Error</div>
```

Inline styles break CSP (per [`html-css/security.md`](./security.md)),
defeat caching, defeat dark mode, defeat theming.

### Anti-pattern 4: Tab indices > 0

```html
<!-- WRONG — manually-set tabindex breaks the natural focus order -->
<button tabindex="1">First</button>
<button tabindex="2">Second</button>
<button tabindex="3">Third</button>

<!-- RIGHT — natural DOM order = natural focus order -->
<button>First</button>
<button>Second</button>
<button>Third</button>

<!-- Acceptable — tabindex="-1" makes element focusable programmatically -->
<div tabindex="-1" id="focus-target">Skip target</div>
```

### Anti-pattern 5: Click handler on non-button element

```html
<!-- WRONG -->
<div class="card" onclick="navigate('/order/12345')">…</div>

<!-- RIGHT — make the whole card a link or wrap the title -->
<article class="card">
  <h2><a href="/order/12345" class="card__link-overlay">Order #12345</a></h2>
  …
</article>

<style>
  .card { position: relative; }
  .card__link-overlay::after {
    content: "";
    position: absolute;
    inset: 0;
  }
</style>
```

The `::after` pseudo-element makes the entire card clickable
while keeping the semantic anchor.

### Anti-pattern 6: CSS-in-JS without static extraction

Runtime CSS-in-JS (styled-components, emotion in some configs)
inflates JS bundle + slows first paint. Modern alternatives
extract CSS at build time:

- vanilla-extract (TypeScript-safe, build-time extracted)
- Linaria (CSS-in-JS with zero runtime)
- Panda CSS (static, build-time)
- StyleX (Meta's, static)
- CSS Modules (most boring, most predictable)

Per `common/reuse-first.md` — pick one and stick.

### Anti-pattern 7: Custom checkbox / radio that breaks keyboard

```html
<!-- WRONG — visually-styled div as checkbox -->
<div class="checkbox" data-checked="false" onclick="toggle(this)">…</div>

<!-- RIGHT — native input visually styled via CSS -->
<label class="checkbox">
  <input type="checkbox" name="agree" required />
  <span class="checkbox__mark" aria-hidden="true"></span>
  <span class="checkbox__label">I agree to the terms</span>
</label>

<style>
  .checkbox input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    inline-size: 1px;
    block-size: 1px;
  }
  .checkbox__mark { /* styled visually */ }
  .checkbox input:focus-visible + .checkbox__mark {
    outline: 2px solid var(--color-focus-ring);
  }
  .checkbox input:checked + .checkbox__mark::before {
    content: "";
    /* checkmark */
  }
</style>
```

The hidden native input keeps every form / a11y / autofill /
spellcheck behaviour intact.

## Reuse-first libraries

| Use case | Library |
| --- | --- |
| Accessible components (React) | React Aria, Radix UI, Headless UI |
| Accessible components (Vue) | Reka UI, Vuetensils |
| Accessible components (Svelte) | Bits UI, Melt UI |
| Accessible components (Solid) | Kobalte |
| Accessible components (vanilla) | Web Awesome (Shoelace), Material Web |
| CSS reset | modern-normalize, the new CSS reset (Josh W Comeau) |
| Layout primitives | Every Layout (paste-in CSS) |
| Form validation | Zod + react-hook-form / VeeValidate / Felte / Conform |
| Icons | Lucide, Heroicons, Phosphor Icons, Tabler Icons |
| Animation | Motion (was Framer Motion), GSAP, View Transitions API |
| Charts | D3 (low-level), Visx, Recharts, ECharts, Plot |
| Code highlighting | Shiki (build-time), highlight.js (runtime) |
| Markdown rendering | MDX (React/JS), unified/remark + rehype |
| Date/time picker | react-aria-components, react-day-picker, Cally web component |

Per [`common/reuse-first.md`](../common/reuse-first.md) — sweep
before building.

## Cross-references

- [`html-css/coding-style.md`](./coding-style.md) — naming +
  semantic HTML + tokens
- [`html-css/security.md`](./security.md) — CSP + XSS + form
  hardening
- [`html-css/testing.md`](./testing.md) — visual regression +
  axe-core + Playwright
- [`html-css/hooks.md`](./hooks.md) — stylelint + htmlhint + CI
- [`common/a11y.md`](../common/a11y.md) — WCAG 2.2 mandates
- [`common/i18n.md`](../common/i18n.md) — RTL + locale-aware
- [`common/patterns.md`](../common/patterns.md) — broader
  architectural patterns (response envelope, etc.)
- [`common/reuse-first.md`](../common/reuse-first.md) — extract
  on second occurrence; never fork primitives
- [`typescript/coding-style.md`](../typescript/coding-style.md)
  — React 19 + Vue 3 idioms
- frontend-patterns skill (auto-activates for `.vue` / `.tsx` /
  `.jsx`) — visual design quality

## Why this rule exists

Modern web UI is component-shaped; without a pattern catalog,
each component re-invents accessibility from scratch and gets
~80% of it right. The 20% is the part screen-reader users hit
first. The patterns above are the WAI-ARIA APG codified plus
the modern CSS architecture choices (CSS Custom Properties,
layout primitives, Cascade Layers) that have proven durable
across 2024-2026 frontends.

Recurring incidents averted:

- Modal that traps keyboard focus inside but never returns it
  to the trigger on close (Pattern 7 — `<dialog>` close listener)
- Form validation that announces every keystroke and exhausts
  screen-reader users (Pattern 6 — blur-triggered)
- Token mismatch between light + dark mode because raw colours
  were used in components (Pattern 1 — semantic tier)
- Container that breaks at unexpected viewport widths because
  responsive design used `min-width` instead of container
  queries (Pattern 4)

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- New interactive component shipped without an APG-aligned
  keyboard model (Pattern 3 weakening)
- Raw colour literal in a component file (Pattern 1 tier
  bypass)
- `<dialog>` not used when shipping a modal in a modern target
  browser matrix (Pattern 7 — re-implementing focus trap)
- `style=` attribute introduced in HTML (Anti-pattern 3)
- `tabindex > 0` shipped (Anti-pattern 4)
- Click handler on `<div>` / `<span>` for action that should
  be `<button>` (Anti-pattern 5 — rule 1 from coding-style)
- Multiple CSS architectures mixed in one project (CUBE plus BEM
  plus utilities) — architectural drift

**Refinement candidates**:

- New layout-primitive row when a recurring composition pattern
  emerges (e.g., Switcher, Reel, Imposter)
- New library row when a maintained accessible-component
  library gains adoption
- Tightening of the token-tier separation when leakage between
  primitive + semantic recurs
- New cross-reference when a sister rule (a11y, frontend-patterns
  skill) prescribes a complementary contract
