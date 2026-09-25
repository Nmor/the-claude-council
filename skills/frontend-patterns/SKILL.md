---
name: frontend-patterns
description: Frontend development patterns for React, React Native, Vue, Next.js, SwiftUI, Flutter, state management, performance optimization, and UI best practices.
paths:
  - "**/*.html"
  - "**/*.htm"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.sass"
  - "**/*.less"
  - "**/*.styl"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/components/**"
  - "**/views/**"
  - "**/pages/**"
  - "**/layouts/**"
---

# Frontend Development Patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check

Modern frontend patterns for React, React Native, Vue, Next.js, SwiftUI, Flutter, and performant
user interfaces.

> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> Before creating a new component / hook / composable / store /
> service, sweep the project's `components/`, `composables/`,
> `hooks/`, `lib/`, `stores/`, `services/` directories for an
> existing primitive. One source of truth per primitive (one
> button, one modal, one toast, one form field, one currency
> formatter, one API client). Extend with a prop — never fork.

## When to Activate

- Building React components (composition, props, rendering)
- Managing state (useState, useReducer, Zustand, Context)
- Implementing data fetching (SWR, React Query, server components)
- Optimizing performance (memoization, virtualization, code splitting)
- Working with forms (validation, controlled inputs, Zod schemas)
- Handling client-side routing and navigation
- Building accessible, responsive UI patterns

## Reference map

This skill is `paths:`-gated, so whatever lives here is added to the always-on
context Floor in full whenever a frontend file is touched. The detail therefore
lives in `references/`; read the row you need, not the whole set.

| Topic | Reference file |
| --- | --- |
| **Component patterns** — composition over inheritance, compound components, render props | [`references/component-patterns.md`](references/component-patterns.md) |
| **Hooks + state management** — state hook, async data-fetching hook, debounce hook, Context + Reducer | [`references/hooks-and-state.md`](references/hooks-and-state.md) |
| **Performance optimisation** — memoization, code splitting + lazy loading, virtualization for long lists | [`references/performance.md`](references/performance.md) |
| **Forms + error boundaries** — controlled form with validation, error boundary pattern | [`references/forms-and-errors.md`](references/forms-and-errors.md) |
| **Animation** — Framer Motion animation patterns | [`references/animation.md`](references/animation.md) |
| **Accessibility patterns** — keyboard navigation, focus management | [`references/accessibility-patterns.md`](references/accessibility-patterns.md) |
| **Visual design quality** — design thinking before coding, typography, colour + theme, motion, spatial composition, visual details, implementation-complexity matching, never-ship anti-patterns | [`references/visual-design-quality.md`](references/visual-design-quality.md) |
| **HTML / CSS coding style** — the 16 hard rules (semantic HTML through cleanroom modern CSS) plus the required stylelint + HTMLHint configs | [`references/html-css-coding-style.md`](references/html-css-coding-style.md) |
| **HTML / CSS hooks + CI gates** — pre-commit gates, pre-push gates, the GitHub Actions workflow, IDE integration, pre-deployment checklist | [`references/html-css-hooks.md`](references/html-css-hooks.md) |
| **HTML / CSS patterns** — the 8 architectural patterns, CSS architecture conventions, 7 anti-patterns, reuse-first libraries | [`references/html-css-patterns.md`](references/html-css-patterns.md) |
| **HTML / CSS security** — OWASP Top 10 alignment, strict CSP, SRI, security headers, CSS-specific attacks, form + upload hardening | [`references/html-css-security.md`](references/html-css-security.md) |
| **HTML / CSS testing** — the testing pyramid, 10 hard rules, 5 anti-patterns, required tooling, CI workflow shape | [`references/html-css-testing.md`](references/html-css-testing.md) |

## Related Skills

This skill provides **architectural + visual patterns** for
frontend development.

- **coding-quality-rules** — code quality: naming, structure,
  readability, immutability
- **security-review** — XSS prevention in dynamic content + styling
- **vue3-patterns**, **typescript-patterns** — framework-specific
  depth
- **a11y.md** (rule) — WCAG 2.2 AA floor + AAA on critical paths

**Remember**: Modern frontend patterns enable maintainable,
performant user interfaces. Choose patterns that fit your project
complexity. Pair architecture (above) with the visual design
quality discipline so the UI is visually excellent, not just
architecturally sound.

## Purpose

Frontend architecture patterns for React, React Native, Vue 3, Next.js, SwiftUI, and Flutter:
component composition, state management, data fetching, form handling, performance optimisation,
accessibility, and visual design quality (typography, color, motion, spatial composition).

**Negative scope**: NOT CSS framework recommendations. NOT generic JS/TS coding style (use
`coding-quality-rules`). NOT API contract design (use `api-design`). NOT framework-specific deep
idioms (use `vue3-patterns` for Vue, dedicated Swift/Flutter skills).

## When NOT to use

- Pure backend services (no UI surface)
- Static-only documentation sites with no client-side state
- CLI tools / scripts
- Native mobile work that uses a non-listed framework (Kotlin/Compose, native Android XML, native
  iOS UIKit-only)
- When the answer is a one-line CSS tweak

## Standards Cited

- **WCAG 2.2** (W3C Recommendation, Oct 2023) §1.4.3 (Contrast Minimum), §2.4.7 (Focus Visible),
  §2.5.8 (Target Size Minimum 24×24 CSS px)
- **WAI-ARIA 1.2** — semantic role + state attributes
- **React Documentation (react.dev)** — Hooks rules, Strict Mode, Server Components contract
- **Vue 3.5 Reactivity Fundamentals** — `ref` / `reactive` / `computed` / `watch` semantics
- **Web Content Accessibility Guidelines (WCAG) 2.2 Quick Reference**
- **OWASP Top 10 (2021)** A03 (Injection) — XSS / DOM sinks
- **Core Web Vitals (web.dev)** — LCP < 2.5s, INP < 200ms, CLS < 0.1

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Array index as React `key` | Re-render mis-association on reorder; lost DOM state (focus, video position) | Stable ID from data (`item.id`) |
| `dangerouslySetInnerHTML` with user input | XSS injection (OWASP A03) | `textContent` / framework auto-escape; `DOMPurify` if rich HTML required |
| Stale-closure setter (`setCount(count + 1)` in async) | Returns wrong value on fast updates | Functional setter: `setCount(prev => prev + 1)` |
| `useEffect` with no dep array for fetch | Fetches on every render → infinite loop | `useEffect(..., [stableDeps])` OR React Query / SWR |
| Context value object recreated each render | Forces every consumer to re-render | `useMemo(() => ({ ... }), [deps])` for context value |
| `<div onClick={…}>` instead of `<button>` | Inaccessible; keyboard navigation broken; screen readers miss it | Semantic HTML: `<button>`, `<a>`, `<dialog>` |
| `outline: none` on focus without alt indicator | WCAG 2.4.7 violation; keyboard users can't see focus | Keep visible focus ring (custom OK as long as visible + 3:1 contrast) |
| Auto-playing video / motion without `prefers-reduced-motion` check | Vestibular triggers; accessibility regression | `@media (prefers-reduced-motion: reduce) { animation: none; }` |

## Verification Checklist

- [ ] Every interactive element reachable + actionable via keyboard (Tab, Enter, Space, Esc)
- [ ] Visible focus indicator with ≥ 3:1 contrast (WCAG 2.4.7 + 1.4.11)
- [ ] All images have meaningful `alt` (or `alt=""` for decorative)
- [ ] Forms have `<label>` associated via `htmlFor` / `id`; errors via `aria-describedby`
- [ ] Touch targets ≥ 24×24 CSS pixels (WCAG 2.5.8)
- [ ] Color is not the only signal (red + icon + text)
- [ ] `prefers-reduced-motion` honoured on animation
- [ ] No `console.log` in shipped bundle
- [ ] LCP < 2.5s, INP < 200ms, CLS < 0.1 on critical pages
- [ ] Bundle audited: no duplicate React, no `moment` (use date-fns / dayjs), tree-shaken icons

## Cross-References

- `~/.claude/rules-library/common/a11y.md` — WCAG 2.2 floor + critical-path AAA
- `~/.claude/rules-library/common/i18n.md` — Intl APIs, RTL, ICU MessageFormat
- `~/.claude/rules-library/common/no-discards.md` — banned discard patterns (`as any` casts, empty
  catches)
- `~/.claude/skills/vue3-patterns/SKILL.md` — Vue 3.5 specifics
- `~/.claude/skills/typescript-patterns/SKILL.md` — TS idioms for components
- `~/.claude/agents/accessibility-reviewer.md` — WCAG audit
- `~/.claude/agents/ux-reviewer.md` — copy, microcopy, error states

## Why this skill exists

Frontend is where users meet the product. The recurring failure modes:

- Inaccessible UI (no keyboard nav, no focus ring, screen-reader empty) → 15-20% of users excluded;
  legal exposure under ADA / EAA / AODA
- XSS through `dangerouslySetInnerHTML` → session theft, account takeover
- Stale-closure bugs in async updates → counters drift, double-submits, lost data
- Visual design that screams "AI-generic" (purple gradients, cookie-cutter layouts) → trust +
  conversion suffer
- Performance regressions (LCP > 4s on mobile) → bounce rate + SEO impact

Cost of accessible + secure + performant components at write time: minutes per component. Cost of
retrofit: quarters + legal exposure + lost conversion.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Generic AI aesthetic detected (purple gradients, cookie-cutter card layout, no distinctive
  typography)
- Inter / Roboto / Arial used as the primary font without rationale (visual-design generic drift)
- Animations purposeless / decorative without functional intent
- Raw color literals (hex / rgb / hsl / oklch) introduced — hook-blocked per `no-discards.md`
- `!important` introduced in CSS / Tailwind arbitrary value (hook-warned)
- Component prop list > 5 (sister `extreme-lint-policy.md` S107) — should be Options object
- Array index used as list key (S6479)
- Context `value` not memoized (S6481) — causes cascading re-renders
- Inline form / onSubmit without `event.preventDefault()` (broken in SPA)
- Accessibility regression: missing `aria-*` on custom widget, missing focus ring on interactive
  element

**Refinement candidates**:

- New design-quality row when a recurring "looks AI-generated" feedback class emerges
- Tightening of the typography / color / motion bars when a new design-system standard ships
  (Material 4, Apple HIG update)
- New cross-reference when a sister skill (vue3-patterns, wcag-accessibility, interaction-design)
  adds a frontend-relevant gate
- New canonical component template when a recurring UI primitive (data table, command palette,
  multi-step form) gains adoption

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: ~/.claude/rules-library/html-css/
     ============================================================ -->

## Migrated rules (rules-library/html-css/, 2026-06-02)

Phase H will delete the source files at `rules-library/html-css/`. Content below preserves the
original rule bodies for lazy-load via the `paths:` glob above.

Those five rule bodies now live under `references/html-css-*.md` — see the
Reference map above. The 2026-09-21 progressive-disclosure split moved them out
of this file so the `paths:` glob no longer loads ~112 KB before any work
begins; nothing was dropped.

---
