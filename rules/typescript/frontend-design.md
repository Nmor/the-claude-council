---
paths:
  - "**/*.vue"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.swift"
  - "**/*.dart"
  - "**/*.xaml"
  - "**/views/**"
  - "**/components/**"
  - "**/pages/**"
  - "**/layouts/**"
  - "**/screens/**"
  - "**/widgets/**"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.storyboard"
  - "**/*.xib"
---

# Frontend Design Aesthetics

> This rule ensures all frontend UI work follows the `frontend-design` skill guidelines automatically. Works alongside `coding-style.md` and the `frontend-patterns` skill.

## Mandatory Design Checklist

When creating or modifying any visible UI:

- [ ] Intentional aesthetic direction chosen (not generic/default)
- [ ] Typography is distinctive (never Inter, Roboto, Arial, system-ui)
- [ ] Color palette is cohesive with CSS variables
- [ ] No cliched AI aesthetics (purple gradients on white, etc.)
- [ ] Layout has spatial intentionality (not cookie-cutter)
- [ ] Animations are purposeful and high-impact
- [ ] Visual details create atmosphere (not flat/lifeless)

## Skill Chain for Frontend Work

When working on frontend files, these skills activate together:

1. **frontend-design** — Visual design quality, aesthetics, typography, color, motion
2. **frontend-patterns** — Component architecture, state management, hooks, performance
3. **coding-standards** — Code quality, naming, structure, readability
4. **security-review** — XSS prevention in dynamic content/styling

All four must be satisfied before frontend work is considered complete.
