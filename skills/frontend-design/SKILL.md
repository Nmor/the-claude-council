---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Automatically activates for any frontend UI work to ensure polished, memorable interfaces that avoid generic AI aesthetics.
---

# Frontend Design Aesthetics

Distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. This skill complements `frontend-patterns` (architecture) and `coding-standards` (code quality) by focusing on **visual design excellence**.

## When to Activate

- Building any UI component, page, view, or application screen
- Creating or modifying Vue/React/React Native/HTML templates with visual elements
- Working on SwiftUI views, UIKit screens, or Storyboard layouts
- Working on Flutter widgets, Dart UI files, or Material/Cupertino components
- Working on WPF/MAUI/Xamarin XAML layouts or C# UI code
- Working on landing pages, dashboards, or marketing pages
- Designing forms, modals, cards, tables, or any visible UI
- Adding CSS, Tailwind classes, StyleSheet, or styling to components
- Creating layouts, navigation, sidebars, or page structures
- Working on any file in `views/`, `components/`, `pages/`, `layouts/`, `screens/`, or `widgets/`
- User mentions design, aesthetics, look-and-feel, or visual quality
- Any task where the output will be seen by end users

## Design Thinking (Before Coding)

Before writing UI code, commit to a clear aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Choose a clear direction — brutally minimal, luxury/refined, soft/pastel, industrial/utilitarian, editorial/magazine, playful, retro-futuristic, organic, art deco, or any intentional aesthetic
- **Differentiation**: What makes this interface memorable? What will users notice?

**CRITICAL**: The key is intentionality, not intensity. Bold maximalism and refined minimalism both work — execute the chosen vision with precision.

## Typography Rules

**DO**: Choose fonts that are beautiful, unique, and characterful. Pair a distinctive display font with a refined body font.

**NEVER USE**: Inter, Roboto, Arial, system-ui, or other generic overused fonts. Every project deserves a distinctive typographic identity.

## Color & Theme Rules

- Commit to a cohesive color system using CSS variables
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes
- **NEVER USE**: Purple gradients on white backgrounds or other cliched AI-generated color schemes
- Vary between light and dark themes across projects — don't converge on one default

## Motion & Animation

- Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions
- Prioritize CSS-only animations for HTML/Vue/simple components
- Use Motion library for React when available
- Scroll-triggering and hover states that surprise

## Spatial Composition

- Unexpected layouts: asymmetry, overlap, diagonal flow, grid-breaking elements
- Generous negative space OR controlled density — both are valid
- Avoid predictable, cookie-cutter component arrangements

## Visual Details & Atmosphere

Create depth and atmosphere rather than defaulting to solid colors:

- Gradient meshes, noise textures, geometric patterns
- Layered transparencies, dramatic shadows, decorative borders
- Grain overlays, custom cursors, contextual effects
- Match visual effects to the overall aesthetic direction

## Implementation Complexity Matching

- **Maximalist designs**: Elaborate code with extensive animations and effects
- **Minimalist designs**: Restraint, precision, careful spacing and typography
- **Elegance = executing the vision well**, not adding more effects

## Integration with Other Skills

This skill works alongside:

- **frontend-patterns**: Provides the architectural patterns (components, state, hooks) — this skill provides the visual design quality
- **coding-standards**: Ensures code quality — this skill ensures visual quality
- **security-review**: Validates no XSS in dynamic styling/content
- **tdd-workflow**: Tests cover visual regressions and component rendering

## Anti-Patterns (NEVER DO)

- Generic font families (Inter, Roboto, Arial, system fonts)
- Cliched color schemes (purple gradients on white)
- Predictable layouts and component arrangements
- Cookie-cutter design that lacks context-specific character
- Converging on common choices (e.g., Space Grotesk) across projects
- Using the same aesthetic for every project
