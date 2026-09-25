# design-systems: Core Patterns

> Covers **Core Patterns** for the `design-systems` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 18 KB** — `token-budget.mjs --check`.

## Core Patterns

### Pattern 1: Three-layer token architecture

Tokens are the source of truth. Three tiers:

```text
TIER 1: Core / primitive tokens
   --color-blue-500: #2563eb
   --space-4: 16px
   --font-size-base: 1rem

TIER 2: Semantic / alias tokens
   --color-action-primary: var(--color-blue-500)
   --color-text-emphasis: var(--color-slate-900)
   --space-form-field: var(--space-4)

TIER 3: Component tokens
   --button-primary-bg: var(--color-action-primary)
   --button-primary-text: var(--color-text-on-action)
   --button-padding-y: var(--space-form-field)
```

Why three tiers:

- **Tier 1** is the palette — refactor here changes the brand;
  don't reference Tier 1 directly in components.
- **Tier 2** is intent — "this colour means action"; rename the
  primitive without touching consumers.
- **Tier 3** is component-scoped overrides — when a button needs
  to differ from the global action colour, here is the place,
  not the component code.

Components consume Tier 3 (or Tier 2 if no override needed),
NEVER Tier 1 directly. This is the property that makes themes
swappable.

### Pattern 2: Token format that crosses platforms

Adopt the **W3C Design Tokens Community Group format**
(JSON-based). Style Dictionary transforms it into platform
artefacts:

```json
{
  "color": {
    "action": {
      "primary": {
        "$value": "{color.blue.500}",
        "$type": "color",
        "$description": "Primary action surfaces — buttons, links, focus rings."
      }
    }
  },
  "space": {
    "form": {
      "field": {
        "$value": "{space.4}",
        "$type": "dimension"
      }
    }
  }
}
```

Style Dictionary builds platform outputs:

- Web: CSS custom properties, Tailwind config, SCSS variables
- iOS: Swift extensions on `UIColor` / `UIFont`
- Android: XML resource files, Compose theme
- Flutter: Dart const expressions
- React Native: JS object
- Figma: Tokens Studio JSON

One source of truth → many platform artefacts. The cost of
"another platform" drops to "add an output transform."

### Pattern 3: Component API design

A component is an API. Apply API discipline:

| Property | Rule |
| --- | --- |
| **Names** | Express role, not appearance: `Button` not `BlueButton`; `Stack` not `Flexbox`. Per `coding-style.md` naming rules. |
| **Props** | Minimal viable surface. Each prop justifies its existence: needed by ≥3 callers OR essential for a11y / variants. |
| **Defaults** | Cover the 80% case. Disabled = false, loading = false, size = "medium". |
| **Variants** | Explicit enum, not boolean explosion. `<Button variant="primary" \| "secondary" \| "ghost" \| "destructive">` beats four booleans. |
| **Composition** | Prefer composition over configuration. `<Card><Card.Header>...</Card.Header></Card>` beats `<Card title=... subtitle=...>`. |
| **Slots** | Named children for flexible content: `<Modal trigger={...} title={...}>`. |
| **Escape hatches** | `className`, `style`, `data-*` allowed; document them as escape valves, not as the primary API. |
| **Refs** | Forward refs on every interactive component for focus management. |
| **a11y** | Accessibility props (aria-label, aria-describedby) FIRST-CLASS, not optional. |

### Pattern 4: Variant + size + state matrix

Every component has implicit dimensions; surface them
explicitly:

| Dimension | Examples |
| --- | --- |
| **Variant** | primary, secondary, ghost, destructive |
| **Size** | xs, sm, md, lg, xl |
| **State** | default, hover, focus, active, disabled, loading, error |
| **Density** | comfortable, compact (for data-dense UIs) |
| **Inversion** | on-light, on-dark, on-coloured |

Each cell of the matrix needs a token resolution + a Storybook
story. Storybook + Chromatic / Percy capture every cell as a
visual regression baseline.

### Pattern 5: Accessibility built in, not bolted on

Components must be accessible by default. The contract:

- **Semantic HTML** under the hood: `<button>`, not `<div
  role="button">`
- **Focus management**: visible focus, programmatic focus on
  reveal (modal, drawer)
- **Keyboard interaction model**: matches WAI-ARIA Authoring
  Practices for the pattern (tab list, combobox, menu, etc.)
- **ARIA**: only where semantic HTML insufficient; correct roles +
  states + properties
- **Colour contrast**: ≥ 4.5:1 for text, ≥ 3:1 for non-text UI
  (WCAG 2.2 §1.4.3 + §1.4.11) — tokens already pass
- **Touch targets**: ≥ 24 × 24 (WCAG 2.2 §2.5.8), recommended
  44/48 per platform
- **Motion respects `prefers-reduced-motion`**
- **i18n**: RTL-aware (logical properties); text expansion
  tolerated

Lint rule: components without accessibility test coverage cannot
be promoted to stable.

### Pattern 6: Theming + multi-brand

A theme is a token override layered on the canonical token set.
Common needs:

- **Dark / light mode** — toggle via media query +
  user preference
- **High contrast** — for users who need ≥ 7:1 (WCAG AAA)
- **Per-brand white label** — partner / OEM theming
- **Per-tenant override** — enterprise customers brand the app
- **Density modes** — comfortable / compact

Implementation: themes are token sets; switching is a runtime
swap of the CSS custom property values, not a rebuild. Test
matrix runs across themes.

### Pattern 7: Governance + contribution model

Without governance, a design system fragments — three teams ship
three slightly different Card components and call it a day.
Governance answers:

- **Who decides what gets in?** A core team or rotating council;
  decisions logged as ADRs.
- **How do contributors propose changes?** A proposal template
  with research evidence, a11y plan, mock-up, code prototype.
- **What's the review SLA?** Stated explicitly; missing it is
  the system team's problem, not the contributor's.
- **What's the bar for promotion?** Experimental → Beta →
  Stable, with criteria for each.

Three stages of component maturity:

```text
experimental:
  - in the system; opt-in via flag
  - breaking changes allowed
  - not for production use yet

beta:
  - production-acceptable for non-critical surfaces
  - breaking changes batched, communicated
  - missing some variants OR a11y completeness

stable:
  - production-ready everywhere
  - semver discipline applies; no breaking changes without
    deprecation lifecycle per `deprecation-lifecycle.md`
  - full a11y + i18n + theming + test coverage
```

### Pattern 8: Versioning + deprecation lifecycle

Apply `semver.md` strictly. The hard part is breaking changes:

- **Patch**: bug fixes, visual tweaks within tokens, internal
  refactor
- **Minor**: new components, new props with sensible defaults,
  new tokens
- **Major**: removed components, renamed props, contract
  changes (e.g., children → slot)

Deprecation per `deprecation-lifecycle.md`:

1. **Announce** — Changelog + docs banner + migration guide
2. **Soft-deprecate** — Component still works, console warning
   on dev builds, deprecation in JSDoc
3. **Hard-deprecate** — Compile-time warning, codemod available
4. **Remove** — Next major version

Skipping stages erodes trust. Consumers will fork to escape an
unreliable upstream.

### Pattern 9: Documentation that engineers + designers

both actually use

Docs are a deliverable, not an afterthought. Apply Diátaxis:

- **Tutorial**: "Building a settings page with our system" —
  end-to-end
- **How-to**: "Theme for white label", "Make a custom Button",
  "Set up Storybook"
- **Reference**: every component, every prop, every token —
  auto-generated where possible from TypeScript / Swift / Kotlin
  sources
- **Explanation**: the philosophy, the token architecture, the
  contribution model

For every component:

- Live demo
- Props table (auto from types)
- Variant gallery
- Accessibility notes
- Do's and don'ts with screenshots
- Code examples for every supported framework
- Related components

Tools: **Storybook** (web), **Compose Preview** (Android),
**SwiftUI Preview** (iOS), **zeroheight** / **Supernova** for
cross-discipline browsing.

### Pattern 10: Testing — visual + interaction + a11y + token

contract

Components ship with four classes of test:

- **Visual regression** (Chromatic / Percy / Reg-CLI): every
  variant × state × theme; PRs gate on diff approval
- **Interaction** (Playwright Component Testing / Storybook
  Interactions / @testing-library): click, type, keyboard
  navigation, expected DOM state
- **Accessibility** (axe-core / Playwright a11y / IBM Equal
  Access): zero serious violations in any story
- **Token contract**: tokens referenced in components must exist
  in the token set; CI fails when components reference removed
  tokens

### Pattern 11: Adoption telemetry — make the invisible visible

"Are people using the system?" should not be a guess. Build
adoption telemetry:

- **Static analysis**: ESLint / SwiftLint / detekt rule
  detecting import of design-system components; count usages per
  repo, per route, per team
- **Runtime telemetry** (optional, privacy-respecting): emit a
  beacon when a stable component renders; aggregate
- **Visual diff**: snapshot a competitor surface vs the
  system-built surface; drift = adoption gap
- **Issue volume**: support volume for "I built a custom X
  because the system one didn't fit" reveals API gaps

Report adoption per surface, per team, per quarter to leadership.
Without this, the design system team is invisible until budget
cuts.

### Pattern 12: Cross-platform parity — accept platform

conventions

A common failure: forcing one platform's idioms onto another. A
Material-style FAB on iOS feels wrong; a UIKit-style segmented
control on Android feels wrong. Strategies:

- **Same TOKENS, platform-native COMPONENTS**: shared brand
  expression, platform-idiomatic interaction
- **Cross-platform layout primitives** (Stack, Grid) align;
  controls (segmented control, picker) diverge
- **Web is its own platform**: don't force a mobile component
  onto desktop or vice versa
- **Accept that motion + haptics + density** vary by platform

The goal is consistent BRAND, not identical PIXELS. Document the
trade-off.

### Pattern 13: Open-source-aware reuse

Per `reuse-first.md`. The system team's job is NOT to reimplement
every primitive:

- Focus + scroll lock on modals → use `radix-ui` /
  `react-aria` / `@headlessui` / `Ariakit` instead of hand-rolling
- Date pickers → curated wrapping of `react-day-picker` or
  similar
- Charts → wrap `Recharts` / `visx` / `Apache ECharts`, don't
  ship a charting framework
- Markdown → `markdown-it` + sanitiser
- Drag and drop → `dnd-kit` (web), `react-native-reanimated`
  (RN)

Wrap, theme, and document — don't re-create. Save your effort
for the parts that ARE differentiated.

### Pattern 14: Living style guide — not a frozen spec

A static style guide rots. A LIVING system updates itself when
the code or tokens change:

- Tokens defined in code; docs render the values at build
- Components rendered in docs from the same source the product
  uses
- Auto-generated prop tables
- Auto-deployed previews per PR
- Changelog generated from conventional commits

Manual maintenance of docs is the road to drift.

### Pattern 15: Migration tooling for breaking changes

Major version bumps without codemods strand consumers. Provide:

- **JS/TS**: `jscodeshift` codemods per breaking change
- **Swift**: structured patch instructions; `swift-syntax`
  refactors where feasible
- **CSS**: regex-replacement scripts where deterministic
- **Markdown migration guide** with before/after for every
  breaking change

A codemod that handles 90% of cases earns goodwill the next
breaking change will cash in.

### Pattern 16: High-fidelity, non-generic UIs (anti-"AI-slop") + design tooling

LLM-generated (and rushed human) UIs regress to a generic mean — samey hero +
three-card grid, hand-rolled buttons that don't match the system, raw `#hex` in
markup, no dark mode, stock art, sometimes fabricated testimonials. "AI-sloppy"
is a SOURCING failure, not a talent gap: the fix is what you build ON, in this
impact order.

1. **Build on the REAL design system, never from scratch (the #1 lever).** If a
   `components/ui/` set + tokens exist (in this or a sibling repo), USE them —
   port/share, don't reinvent. A hand-authored Button is the tell; the shared
   cva-variant, token-colored Button is invisible (in the good way). Search first
   (Pattern 13 + `reuse-first.md`); consume Tier-2/3 tokens; zero raw hex.
2. **Source polished sections from curated block libraries, then retheme to your
   tokens** — don't hand-build what a designer already did better: **Tailwind
   Plus** (official; highest quality; paid), **shadcn.io / shadcnblocks** (large
   catalog), **Aceternity UI** (animated SaaS landing; Framer Motion), **Magic
   UI**, **21st.dev**. Copy the block, swap raw values for your tokens, delete
   the unused.
3. **Make the MODEL source instead of invent — design MCP servers:**
   - **shadcn MCP** — reads the project's `components.json` + registry, installs
     REAL components. PROJECT-scoped: `pnpm dlx shadcn@latest mcp init --client
     claude` (run in a shadcn-initialised project; no API key for the public
     registry; a user/global add fails-connect outside a shadcn project).
   - **21st.dev "Magic" MCP** — `/ui <describe>` generates polished shadcn
     components (free API key).
   - **Figma Dev Mode MCP** (official; bidirectional Claude Code, 2026) — point
     at a real Figma frame for faithful, token-mapped code (Figma auth). If a
     design exists, design-to-code beats prompt-to-code every time. Or paste a
     screenshot as the visual target (no MCP needed). Auth/key MCPs are added
     interactively — `claude mcp list` to verify.
4. **Ground every build in a NAMED reference aesthetic** (e.g. "Stripe/Linear
   calm" vs "Vercel bold") — "make it look good" regresses to generic. Add
   CUSTOM brand assets (a bespoke SVG illustration system, real logo, real
   photography); generic stock/undraw undoes the uniqueness. Author illustrations
   in one cohesive visual language, token-colored so they theme in light/dark.
5. **Enforce constraints from line one:** three-tier tokens (Pattern 1), fixed
   spacing/type/radius/motion scales, light AND dark as a token swap (Pattern 6),
   WCAG 2.2 AA (Pattern 5). Constraints make independent sections read as ONE
   product.
6. **Verify VISUALLY + iterate:** build → serve → LOOK (both themes, mobile +
   desktop) → human eye → fix. One-shot high-fidelity is a myth; the review loop
   is the method (Storybook + visual regression, Pattern 10; paste screenshots
   for critique).

Honesty gate: never fabricate testimonials, logos, or metrics to fill a design —
use real trust signals + clearly-labelled placeholders.
