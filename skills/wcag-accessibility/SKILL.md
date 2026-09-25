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

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`

Production patterns for meeting WCAG 2.2 Level AA on every UI surface and Level AAA on critical
paths (auth, payment, account management, account deletion). Pairs with the global `a11y.md` rule.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Patterns | [`references/core-patterns.md`](references/core-patterns.md) |
| a11y (migrated rule) | [`references/a11y.md`](references/a11y.md) |

## Purpose

Accessibility is not retrofit work. It is the design contract that says: every user can perceive,
operate, understand, and interact with the product. Inaccessible UIs are legal liabilities (EAA
2025, ADA Title III, AODA, Section 508), commercial losses (enterprise procurement requires VPATs),
and engineering failures (the bugs you only see when you test with real assistive tech).

This skill encodes the patterns that pass WCAG 2.2 audits + screen-reader smoke tests + keyboard
walkthroughs. It does NOT cover the rule-level enforcement — that lives in
`~/.claude/rules-library/common/a11y.md`. This skill is the IMPLEMENTATION arm.

## Standards Cited

- **WCAG 2.2** (W3C Recommendation, October 2023) — Level A, AA, AAA success criteria
- **WAI-ARIA 1.2** (W3C Recommendation, June 2023) — roles, states, properties
- **ARIA Authoring Practices Guide (APG)** (W3C) — keyboard interaction patterns per widget
- **EN 301 549 v3.2.1** (ETSI, EU public-sector + EAA basis)
- **EAA — European Accessibility Act 2019/882** — effective 28 June 2025
- **Section 508** (US, 36 CFR §1194) — federal procurement
- **ADA Title III** (US, 42 USC §12181) — public accommodations
- **AODA** (Ontario Regulation 191/11) — Canadian provincial
- **ISO/IEC 40500:2012** — international adoption of WCAG 2.0 (current baseline; WCAG 2.2 adoption
  in progress)

## When to Fire

- Any `.vue`, `.tsx`, `.jsx`, `.svelte`, `.astro` file
- Any HTML / CSS template under `views/`, `components/`, `pages/`, `layouts/`, `screens/`,
  `widgets/`
- Any Email template, push notification, SMS template
- Any PDF generation, document export
- Any iOS / Android / SwiftUI / Flutter UI work (mobile a11y mirrors WCAG via platform APIs)
- Any new public API that returns localised user-facing strings

## Anti-Patterns

### Anti-pattern 1: Click handlers on `<div>`

The most common a11y failure. The div is not focusable, the keyboard doesn't activate it, screen
readers don't announce it as actionable, and you've reinvented `<button>` without any of its
benefits. Always use a native interactive element.

### Anti-pattern 2: `<a href="#">` for buttons

Links navigate; buttons act. A link with `href="#"` or `href="javascript:void(0)"` confuses the
keyboard model (Enter activates a link via navigation, not action) and breaks assistive-tech
expectations.

### Anti-pattern 3: ARIA-fixing semantic HTML

```html
<!-- WRONG — fighting native semantics with ARIA -->
<button role="link">Read more</button>

<!-- RIGHT — use the right element -->
<a href="/articles/123">Read more</a>
```

### Anti-pattern 4: Hiding focus with `outline: none`

Removes the keyboard-user's only navigation indicator. If the default browser ring is ugly, REPLACE
it (custom box-shadow, custom outline) — don't remove it.

### Anti-pattern 5: `tabindex="-1"` everywhere

`tabindex="-1"` removes an element from tab order BUT keeps it programmatically focusable. Useful
for modal containers + landmark-focus on route change. NEVER use as a workaround to hide "broken"
focusable elements.

### Anti-pattern 6: Auto-playing video with sound

WCAG 1.4.2 — auto-playing audio > 3 seconds must have a user-accessible mute control. Auto-play +
sound is also a quality bug (annoying) and a privacy bug (it triggers connection patterns the user
didn't consent to).

### Anti-pattern 7: Toast notifications without ARIA

The toast renders visually but assistive tech doesn't announce it. The user thinks their action did
nothing. Use `role="status"` (polite) or `role="alert"` (assertive) wrappers.

### Anti-pattern 8: Form errors only at submit

Inline validation as the user types (debounced) + descriptive error messages + `aria-invalid` +
`aria-describedby` — not "errors at the top of the form after submit" with no field association.

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
- `~/.claude/skills/frontend-patterns/SKILL.md` — broader frontend architecture + visual design
  quality
- `~/.claude/rules-library/common/i18n.md` — accessibility overlaps with i18n (RTL, text expansion,
  language announcements)
- `~/.claude/rules-library/common/documentation-requirements.md` — docs are accessibility too
- `accessibility-reviewer` agent — opus-model agent that audits per this skill
- `ux-reviewer` agent — Council Division 7

## Why This Skill Exists

WCAG 2.2 audits routinely surface 50-200 violations per medium-sized application — most of which
were preventable at write time. The cost of accessibility-aware development is small (semantic HTML,
focus management, ARIA where needed). The cost of retrofit + legal exposure is large:

- EAA penalties vary by Member State; some allow class actions
- ADA lawsuits in the US: $50K-$500K typical settlement; thousands filed annually
- Enterprise procurement: VPAT (Voluntary Product Accessibility Template) increasingly required;
  missing VPAT = lost deal
- SEO: semantic HTML + alt text improves search ranking
- Quality: a11y bugs surface UX bugs (label associations, error messaging, focus order) that benefit
  all users

The patterns in this skill cover ≥ 80% of WCAG 2.2 AA conformance. The remaining 20% requires user
testing with people who use assistive tech — schedule it.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `<div onClick>` / `<span onClick>` instead of `<button>` (WCAG 2.1.1 keyboard + 4.1.2
  name/role/value)
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
- New cross-reference when a sister skill (accessible-forms, interaction-design, frontend-patterns)
  adds an a11y gate
- New automated-test rule row when axe-core ships a new rule
- Tightening of the AA → AAA boundary when a critical-path surface upgrades

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the
lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/a11y.md`

---
