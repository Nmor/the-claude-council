# frontend-patterns: Visual design quality

> Covers design thinking before coding, typography, colour + theme, motion, spatial composition,
> visual detail, implementation-complexity matching, and the never-ship anti-patterns. Routed from
> the SKILL.md Reference map row **Visual design quality**.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Visual design quality

Architecture without aesthetics ships generic UI. This section
covers the design-quality discipline that complements every
pattern above. Apply BEFORE writing UI code — choose the
aesthetic direction with intent.

### Design thinking (before coding)

Commit to a clear aesthetic direction:

- **Purpose** — what problem does this interface solve? Who uses it?
- **Tone** — pick a clear direction: brutally minimal, luxury /
  refined, soft / pastel, industrial / utilitarian, editorial /
  magazine, playful, retro-futuristic, organic, art deco, or any
  intentional aesthetic.
- **Differentiation** — what makes this interface memorable? What
  will users notice in 5 seconds?

**Key principle**: intentionality > intensity. Bold maximalism +
refined minimalism BOTH work — execute the chosen vision with
precision.

### Typography rules

- **DO** — choose fonts that are beautiful, unique, characterful.
  Pair a distinctive display font with a refined body font.
- **NEVER** — `Inter`, `Roboto`, `Arial`, `system-ui`, or other
  generic overused fonts. Every project deserves a distinctive
  typographic identity. (Also avoid converging on the same
  "interesting" choice — `Space Grotesk`, `Manrope` — across every
  project.)

### Color + theme rules

- Commit to a cohesive color system using CSS variables / design
  tokens (per `~/.claude/rules-library/common/no-discards.md` — raw hex /
  rgb / hsl / oklch literals in component files are hook-rejected).
- Dominant colors with sharp accents outperform timid, evenly-
  distributed palettes.
- **NEVER** — purple gradients on white backgrounds, or other
  cliched AI-generated colour schemes (mint-green + lavender,
  Stripe-purple, etc.).
- Vary between light + dark themes across projects — don't
  converge on one default.

### Motion + animation

- **High-impact moments** — one well-orchestrated page load with
  staggered reveals creates more delight than scattered
  micro-interactions.
- **CSS-first** for HTML / Vue / simple components.
- **Motion library** (or Framer Motion) for React when richer
  control is genuinely needed.
- **Respect `prefers-reduced-motion`** (per `a11y.md`).
- Scroll-triggering + hover states that surprise.

### Spatial composition

- Unexpected layouts: asymmetry, overlap, diagonal flow, grid-
  breaking elements.
- Generous negative space OR controlled density — both valid; the
  middle ground is forgettable.
- Avoid predictable, cookie-cutter component arrangements
  (centre-aligned hero + 3-column features + 2-column CTA — the
  default-AI shape).

### Visual details + atmosphere

Create depth + atmosphere rather than defaulting to solid colours:

- Gradient meshes, noise textures, geometric patterns
- Layered transparencies, dramatic shadows, decorative borders
- Grain overlays, custom cursors, contextual effects
- Match visual effects to the overall aesthetic direction

### Implementation complexity matching

- **Maximalist designs** — elaborate code with extensive animations
  - effects justified
- **Minimalist designs** — restraint, precision, careful spacing +
  typography
- **Elegance = executing the vision well**, not adding more effects

### Anti-patterns (NEVER ship)

- Generic font families (`Inter`, `Roboto`, `Arial`, system fonts)
- Cliched colour schemes (purple gradient on white)
- Predictable layouts + component arrangements
- Cookie-cutter design that lacks context-specific character
- Same aesthetic across every project
- Raw colour literals in component files (per `no-discards.md`
  hook — design-token-only)
