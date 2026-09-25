---
name: design-systems
description: Principal-level design system practice — design tokens, multi-platform theming, component API design, accessibility built-in, versioning + governance, contribution model, documentation, and the discipline that turns "one team's component library" into a load-bearing capability for every product surface — including producing high-fidelity, NON-generic ("anti-AI-slop") UIs by building on the real system + curated blocks + design-MCP tooling (shadcn / 21st.dev / Figma).
---

# Design Systems

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> A design system is a product whose users are other engineers
> and designers. Treat it like one: roadmap, deprecation policy,
> documentation, SLA on bug fixes, telemetry on adoption. Do less
> than that and it becomes a maintenance graveyard the platform
> team is too embarrassed to admit was a strategic mistake.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Patterns | [`references/core-patterns.md`](references/core-patterns.md) |

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

- Raw colour literal in component file (per `~/.claude/rules-library/common/no-discards.md` —
  design-token weakening)
- New component built without searching shared `components/ui/` first (per
  `~/.claude/rules-library/common/reuse-first.md`)
- Component fork to add one variant instead of extending with prop (rule-of-three violation)
- Design tokens defined twice (CSS variable + JS const drift)
- Storybook story missing for a new component (docs / governance weakening)
- Component API surface bloat (every PR adds another optional prop — boolean-prop ratchet)
- Token semantic name leaks implementation (`color-blue-500` used everywhere instead of
  `color-primary`)
- Multi-platform token export out of sync (web tokens updated, iOS/Android not)
- Breaking change shipped without semver bump + migration guide
- Accessibility regression slips past axe-core in CI
- Hand-rolled primitive shipped when a design-system/shadcn one existed (anti-slop, Pattern 16)
- UI shipped with no named reference / no dark mode / stock (not custom) art (generic-mean
  regression)
- Fabricated testimonials/logos/metrics used to fill a design (honesty violation)
- A Figma design present but prompt-to-code used instead of the Figma Dev Mode MCP
- "Build green" claimed done without a visual (both-theme, responsive) check

**Refinement candidates**:

- New token category row when a new design dimension emerges (e.g., elevation, motion-duration
  scale)
- New cross-reference when a sister skill (frontend-patterns, wcag-accessibility,
  interaction-design) adds a design-system gate
- New versioning template when breaking-change discipline drifts
- Tightening of the platform-parity rule when token-drift recurs
