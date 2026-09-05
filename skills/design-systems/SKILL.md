---
name: design-systems
description: Principal-level design system practice — design tokens, multi-platform theming, component API design, accessibility built-in, versioning + governance, contribution model, documentation, and the discipline that turns "one team's component library" into a load-bearing capability for every product surface — including producing high-fidelity, NON-generic ("anti-AI-slop") UIs by building on the real system + curated blocks + design-MCP tooling (shadcn / 21st.dev / Figma).
---

# Design Systems

> A design system is a product whose users are other engineers
> and designers. Treat it like one: roadmap, deprecation policy,
> documentation, SLA on bug fixes, telemetry on adoption. Do less
> than that and it becomes a maintenance graveyard the platform
> team is too embarrassed to admit was a strategic mistake.

## Purpose

A design system is the load-bearing infrastructure of consistent
product experience: design tokens (the atoms — colour, type,
space, motion, elevation), components (buttons, inputs, navs,
modals — the molecules and organisms), patterns (canonical
solutions for common problems), and the documentation +
governance that keeps them in sync across web, mobile, marketing,
internal tools, and partner integrations. Done well, a design
system collapses cross-team coordination cost, accelerates new
feature development, makes accessibility automatic, and keeps
brand expression coherent across years of organisational change.
Done poorly, it becomes a fork — your design system or the
shipping product, choose one.

This skill names the architecture (tokens → components →
patterns), the API design discipline for components, the
multi-platform theming model, the governance + contribution
patterns, the versioning + deprecation lifecycle, the
documentation that makes the system usable, and the adoption
telemetry that turns "we shipped a design system" into "the
product is built on it."

NOT in scope: research methods that surface what to design (see
`ux-research`); interaction principles (see `interaction-design`);
accessibility implementation (see `wcag-accessibility` +
`accessible-forms`); framework-specific implementation idioms
(see `frontend-patterns`, `vue3-patterns`, `swift-actor-persistence`).

## Standards Cited

- **W3C Community Group — Design Tokens Format Module
  (draft, 2024)** — interoperable JSON schema for tokens (the
  emerging standard backing Style Dictionary + Tokens Studio +
  Specify)
- **Frost B. (2016, ongoing)** — Atomic Design (atoms → molecules
  → organisms → templates → pages)
- **Material Design 3 (Google)** — token system, theming,
  components, motion
- **Apple Human Interface Guidelines** — platform-specific
  expectations
- **Microsoft Fluent 2** — multi-platform token + component
  architecture
- **GitHub Primer**, **Salesforce Lightning Design System
  (SLDS)**, **Shopify Polaris**, **IBM Carbon**, **Atlassian
  Design System**, **Adobe Spectrum** — reference systems
- **WCAG 2.2** — accessibility built into every component
- **WAI-ARIA Authoring Practices Guide** — component patterns
- **Storybook** — canonical documentation + testing platform
- **Style Dictionary** (Amazon) — token transformation pipeline
- **Tokens Studio for Figma** — design-side token authoring
- **Specify**, **Supernova**, **zeroheight** — design system
  platforms
- **Semantic Versioning 2.0.0** — versioning policy
- **Keep a Changelog 1.1.0** — release communication
- **Conventional Commits 1.0.0** — change classification
- **Diátaxis** — documentation structure (tutorials / how-to /
  reference / explanation)
- **ISO/IEC 25010** — software product quality model (applied to
  the system as a product)
- **shadcn/ui** — copy-in, you-own-the-code component model; registry +
  `components.json` (an ecosystem, not a dependency, as of 2026)
- **Tailwind CSS v4** — CSS-first `@theme` tokens (OKLCH)
- **Model Context Protocol (Anthropic, 2024)** — the standard the design MCP
  servers implement: **shadcn MCP** (registry), **21st.dev "Magic" MCP** (`/ui`),
  **Figma Dev Mode MCP** (official; Claude Code integration, 2026)
- **Curated block libraries** — Tailwind Plus, shadcn.io / shadcnblocks,
  Aceternity UI, Magic UI, 21st.dev (retheme to your tokens; don't ship defaults)
- **Wathan & Schoger, _Refactoring UI_ (2018)** — spacing / hierarchy / contrast
  fundamentals that de-generic a layout

## When to Fire

- Founding or auditing a design system
- Adding a new component to the library
- Adding or refactoring tokens (colour palette change, type scale
  revision, spacing system change)
- Cross-platform parity — Web + iOS + Android + Watch
- Theming for white-label, dark mode, accessibility, or per-brand
  variants
- Migration from one design language to another (e.g., Bootstrap
  → custom system; Material 2 → Material 3)
- Adoption stalls — telemetry shows the system is under-used
- Governance is fuzzy — contributions blocked, breaking changes
  ship surprise-style

Pairs with `ux-research` (surfaces patterns to standardise),
`interaction-design` (informs component behaviour),
`wcag-accessibility` (components must be accessible by default),
`accessible-forms`, `frontend-patterns`, `i18n.md` (typography +
RTL across locales), `semver.md`, `deprecation-lifecycle.md`,
`docs-sync-with-code.md`, `task-intake-due-diligence.md` Q19.

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

## Anti-Patterns

| Anti-pattern | Why bad | Fix |
| --- | --- | --- |
| Components reference Tier 1 tokens directly | Theme swaps require touching every component | Tier 2 / Tier 3 indirection |
| One-off "ProductTeamX-Button" forks | Combinatorial explosion + divergence | Variant + slot on shared Button |
| Boolean props for variants | `isPrimary && isLarge && isInverted` = 8 states, undocumented | Enum variant + size; explicit |
| `className` as primary API | Style escapes; consumer locks into internals | Composable slots + tokens; className as escape hatch |
| Ship without a11y | Lawsuits + remediation cost | A11y in the acceptance criteria |
| Ship without docs | Adopters can't adopt | Docs as a release artefact |
| No version policy | Breaking changes surprise consumers | Semver + deprecation lifecycle |
| No deprecation runway | Forks to escape upstream | Announce → soft → hard → remove |
| No telemetry on adoption | Can't tell if the system is succeeding | Static + runtime + qualitative |
| Mobile components forced on web (or vice versa) | Idiomatic mismatch; user friction | Platform-respecting parity |
| Frozen Figma library not in sync with code | Designers and engineers diverge | Tokens + components from one source |
| Reinventing date picker / drag-and-drop / charts | Years of effort, ongoing maintenance | Wrap mature OSS per `reuse-first.md` |
| "Final form" — never deprecate anything | Backlog of un-used legacy | Sunset components after telemetry shows < N usages |
| Hand-rolling a primitive (Button/Card) when a design-system/shadcn one exists | generic, off-brand "AI-sloppy" UI | port/share the real primitive (Pattern 16.1) |
| Raw `#hex` / `rgb()` in component markup | can't theme; drifts from brand | semantic tokens only (Pattern 16.1) |
| "Make it modern" with no named reference | regresses to the generic mean | name a concrete reference aesthetic first (Pattern 16.4) |
| Generic stock / undraw illustrations | looks like every other template | bespoke, cohesive, token-colored brand assets (Pattern 16.4) |
| Fabricated testimonials / logos / metrics to fill a layout | dishonest + generic | real trust signals + labelled placeholders |
| Prompt-to-code when a Figma design exists | ignores the source of truth | Figma Dev Mode MCP / design-to-code (Pattern 16.3) |
| Shipping without light+dark | half-built; fails real use | dark mode as a token swap (Pattern 6) |

## Verification Checklist

- [ ] Tokens organised in three tiers (primitive, semantic,
      component); components reference tier 2/3 only
- [ ] W3C Design Tokens format adopted; Style Dictionary
      transforms outputs per platform
- [ ] Component API: minimal props, enum variants, named slots,
      forwarded refs, a11y props first-class
- [ ] Every component meets WCAG 2.2 AA by default; AAA where
      applicable
- [ ] Themes implemented as token overrides; dark / light /
      high-contrast supported
- [ ] Component maturity stages defined (experimental / beta /
      stable) with promotion criteria
- [ ] Contribution model documented; review SLA stated
- [ ] Semver applied; deprecation lifecycle per
      `deprecation-lifecycle.md`
- [ ] Changelog generated from conventional commits
- [ ] Codemods provided for major breaking changes
- [ ] Storybook (or platform equivalent) ships with every
      component + variant + state
- [ ] Visual regression baseline + interaction tests + a11y
      tests in CI
- [ ] Token contract test: components only reference existing
      tokens
- [ ] Documentation organised per Diátaxis: tutorial / how-to /
      reference / explanation
- [ ] Live demos + auto-generated prop tables; docs deploy per
      PR
- [ ] Adoption telemetry: static usage scan + runtime beacons
      (consent-respecting)
- [ ] Cross-platform parity: shared tokens, platform-idiomatic
      components
- [ ] OSS reuse: charts / pickers / DnD / lower-level a11y
      primitives wrapped, not reimplemented
- [ ] Anti-slop: new UI uses the real `components/ui/` primitives + tokens
      (searched sibling repos first); zero raw hex in markup
- [ ] Named visual reference chosen; brand assets custom (not stock); light+dark
      both intentional; verified VISUALLY (both themes, mobile+desktop), not just "build green"
- [ ] No fabricated testimonials/logos/metrics; honest trust signals + labelled placeholders
- [ ] Design MCP(s) stood up where they help (shadcn per-project / 21st.dev / Figma);
      curated blocks rethemed to tokens (not left at library defaults)
- [ ] Roadmap published; deprecation calendar communicated
- [ ] Governance ADRs logged for major decisions

## Cross-References

- `ux-research` — surfaces what to standardise
- `interaction-design` — informs component behaviour
- `wcag-accessibility` — a11y baseline that components must meet
- `accessible-forms` — forms-specific patterns
- `frontend-patterns` — implementation layer
- `vue3-patterns`, `typescript-patterns`, `swift-actor-persistence`,
  `swift-protocol-di-testing` — platform-specific implementation
- `coding-quality-rules` — naming + style baseline
- `reuse-first.md` — wrap mature OSS instead of reinventing
- `semver.md` — versioning policy
- `deprecation-lifecycle.md` — calendar-anchored deprecation
- `docs-sync-with-code.md` — docs ship with releases
- `documentation-requirements.md` — Diátaxis structure
- `i18n.md` — typography + RTL across locales
- `feature-flags.md` — experimental components flagged off by
  default
- `task-intake-due-diligence.md` Q12 (a11y), Q19 (UX writing)

## Why This Skill Exists

A design system is a multiplier — when it works. A consistent
component library that's accessible by default, themable across
brands, evolved with discipline, and adopted across the
product cuts new-feature time by weeks, makes accessibility
remediation a non-event, and lets the brand evolve without a
multi-year rebuild. When it doesn't work — when teams fork
because the upstream is unreliable, when components are
inconsistent, when the docs are stale, when there's no
versioning policy, when accessibility is a checkbox at the end
— the design system becomes a tax that everyone pays and nobody
benefits from.

The discipline this skill describes — three-tier tokens,
component-as-API thinking, accessibility built in, semver +
deprecation, codemods for breaking changes, Diátaxis
documentation, adoption telemetry — is what separates a design
system that earns its place from one that ages out into
"yeah we have one of those". None of the patterns are exotic;
they are the operational scaffolding that turns a library of
components into a platform.

The cost: a dedicated team (usually 3-8 people for a mid-size
product), a token pipeline, a docs site, a Storybook (or
equivalent) per platform, a release cadence, governance
overhead. The benefit: every feature team ships faster, every
brand refresh is a token swap instead of a rebuild, every
accessibility audit comes back clean by default, and the product
looks like a product instead of a collection of features that
happen to share a logo.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Raw colour literal in component file (per `~/.claude/rules-library/common/no-discards.md` — design-token weakening)
- New component built without searching shared `components/ui/` first (per `~/.claude/rules-library/common/reuse-first.md`)
- Component fork to add one variant instead of extending with prop (rule-of-three violation)
- Design tokens defined twice (CSS variable + JS const drift)
- Storybook story missing for a new component (docs / governance weakening)
- Component API surface bloat (every PR adds another optional prop — boolean-prop ratchet)
- Token semantic name leaks implementation (`color-blue-500` used everywhere instead of `color-primary`)
- Multi-platform token export out of sync (web tokens updated, iOS/Android not)
- Breaking change shipped without semver bump + migration guide
- Accessibility regression slips past axe-core in CI
- Hand-rolled primitive shipped when a design-system/shadcn one existed (anti-slop, Pattern 16)
- UI shipped with no named reference / no dark mode / stock (not custom) art (generic-mean regression)
- Fabricated testimonials/logos/metrics used to fill a design (honesty violation)
- A Figma design present but prompt-to-code used instead of the Figma Dev Mode MCP
- "Build green" claimed done without a visual (both-theme, responsive) check

**Refinement candidates**:

- New token category row when a new design dimension emerges (e.g., elevation, motion-duration scale)
- New cross-reference when a sister skill (frontend-patterns, wcag-accessibility, interaction-design) adds a design-system gate
- New versioning template when breaking-change discipline drifts
- Tightening of the platform-parity rule when token-drift recurs
