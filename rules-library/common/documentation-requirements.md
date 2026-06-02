# Documentation Requirements Rule (Always-On, Global)

> Auto-fires on every file. Sister to `docs-sync-with-code.md`
> (docs stay in sync), `adr-template.md` (architectural decisions),
> `runbook-template.md` (incident response), `official-docs-first.md`
> (research before writing), `task-intake-due-diligence.md` Q20.
> Standards: **Diátaxis framework**, **CommonMark**, **OpenAPI 3.1**,
> **Conventional Comments**, **arc42**, **C4 Model**.

## Core Principle

**Every shipped feature ships with documentation. Every documented
surface follows the Diátaxis four-quadrant model so users can find
what they need: a tutorial when learning, a how-to when doing, a
reference when looking up, an explanation when understanding.
Documentation is code's peer — it's reviewed, versioned, tested,
and deployed together.**

A feature without docs isn't done. Code without docs is undocumented
debt; docs without code is fiction. They ship together or neither
ships.

## The Diátaxis quadrant

The framework (diataxis.fr — Daniele Procida) splits docs into
FOUR distinct types, each serving a different user need:

| Type | When user needs | Style |
| --- | --- | --- |
| **Tutorials** | Learning by doing — first contact | Lessons, step-by-step, narrative |
| **How-to guides** | Doing a specific task | Goal-oriented, "to do X, do Y" |
| **Reference** | Looking something up | Exhaustive, accurate, terse |
| **Explanation** | Understanding | Discursive, "why" + "how it relates" |

Mixing types in one doc confuses readers. A tutorial that pivots
into reference loses learners. A how-to that explains theory
loses experts. Each artifact picks ONE type.

## Documentation surfaces (what + where)

### Code-level

| Surface | Standard | Required |
| --- | --- | --- |
| **Function / method docstring** | JSDoc, godoc, docstring (Python), Javadoc, rustdoc | Public APIs always; private when non-obvious |
| **Module / package README** | Markdown at repo / package root | Every package has one |
| **Type definitions** | TypeScript types, OpenAPI, Proto IDL | Generated docs reflect canonical schema |
| **Inline comments** | `// why this is shaped this way` | Only when non-obvious (per `coding-style.md`) |

### Project-level

| Surface | Standard | Required |
| --- | --- | --- |
| **README.md** | CommonMark | Every repo |
| **CHANGELOG.md** | Keep a Changelog 1.1.0 | Every released package |
| **CONTRIBUTING.md** | Markdown | Open-source repos |
| **CODE_OF_CONDUCT.md** | Contributor Covenant | Open-source repos |
| **LICENSE** | SPDX-named license | Every repo |
| **SECURITY.md** | GitHub-recognised | Repos with security implications |
| **`docs/architecture.md`** | arc42 or C4 | Non-trivial projects |
| **`docs/runbook.md`** | Internal runbook template | Production services |
| **`docs/adrs/`** | ADR per `adr-template.md` | Every architectural decision |
| **`docs/api/`** | OpenAPI / GraphQL SDL / Proto | Every external API |
| **`docs/provider-research/`** | per `official-docs-first.md` | Every external integration |

### User-facing

| Surface | Standard | Required |
| --- | --- | --- |
| **Product documentation** | Diátaxis-organised | Every customer-facing feature |
| **API reference** | Generated from OpenAPI / GraphQL SDL | Every public API |
| **SDK reference** | Generated from typedoc / godoc / sphinx | Every SDK |
| **Tutorials / getting started** | Step-by-step | Every product |
| **Release notes** | Per release | Every release |
| **Migration guides** | Per major version | Per `deprecation-lifecycle.md` |
| **Status page** | Status communication | Every customer-facing system |

## Hard rules

### 1. Documentation lives in source control alongside code

`docs/` directory in the repo. NOT a separate wiki, NOT
Confluence, NOT Notion. (Status pages, marketing pages, and
similar surfaces can live elsewhere — but technical docs are in
the repo.)

Reasons:

- Docs version with code (a v1 doc is the v1 codebase's doc)
- PR review covers docs (no "I'll do the docs later" — see
  `docs-sync-with-code.md`)
- Search + diff + history work
- Branches expose proposed doc changes

### 2. Every PR that changes user-visible behaviour updates docs

Per `docs-sync-with-code.md`. The PR's checklist enforces it.

### 3. Generated reference docs are generated, not handwritten

API reference is generated from OpenAPI/GraphQL SDL/Proto/
typedoc/sphinx. Hand-written reference docs DRIFT — within a
year, the reference describes a different API than the running
code.

Generated docs are CI-built; the doc deploy fails if the
generation fails.

### 4. The README is the front door

Every README MUST cover:

```markdown
# <Project Name>

> One-line tagline.

[Badges: build, coverage, license, version, npm/pypi]

## What is this?

A paragraph explaining what the project does + who it's for.

## Quick start

```bash
# 5 lines max — get to first success
git clone ...
pnpm install
pnpm dev
```text

## Documentation

- [Tutorial](docs/tutorial.md) — first time
- [How-to guides](docs/how-to/) — task-specific
- [Reference](docs/reference/) — exhaustive
- [Explanation](docs/explanation/) — deep dives

## Status

What's stable, what's beta, what's experimental.

## License

SPDX identifier + LICENSE link.

```

The reader decides in 30 seconds whether to use the project.
Make those 30 seconds count.

### 5. Examples are tested

Code examples in docs MUST be tested. Otherwise they rot:

- **doctest** (Python): docstrings are executable tests
- **rustdoc**: tests embedded in doc comments run via `cargo test`
- **godoc Examples**: `func ExampleFoo() { ... }` runs as a test
- **MDX + Vitest** / **Jest snapshot from markdown**: extract +
  run code blocks
- **CI deploy preview**: run README's quick-start against a
  fresh container

Examples that diverge from the code are worse than no examples
— they teach wrong patterns.

### 6. Documentation has owners

Every doc page has a frontmatter owner:

```markdown
---
owner: team-payments
last-reviewed: 2026-05-26
review-cadence: quarterly
applies-to: api/v2/payments
---
```

Reviews are scheduled. Stale docs are flagged. Owners are
accountable.

### 7. Documentation is accessible (per `a11y.md`)

- Semantic markdown (headings, lists, tables — not screenshot-
  of-text)
- Alt text on every image (mandatory for content images;
  empty `alt=""` for decorative)
- Code blocks have language tags (`​```typescript`) so screen
  readers can announce + syntax highlight
- Sufficient contrast in custom-styled docs
- Search functionality is keyboard-accessible

### 8. Documentation is internationalised (per `i18n.md`)

For public-facing docs:

- Source language (typically English) is canonical
- Localised versions are stored under `docs/<locale>/`
- Locale fallback: if `docs/fr/api.md` doesn't exist, render
  `docs/en/api.md` with a "Translation pending" banner
- Translation memory + glossary apply (per `i18n.md`)

### 9. The doc deploy is automated

Every commit to `main` (or per-PR for preview):

- Build the docs site (Docusaurus, MkDocs, Sphinx, Astro Starlight,
  Nextra, VitePress)
- Run link-checker (lychee, markdown-link-check)
- Run accessibility check (Lighthouse)
- Deploy to docs.example.com / GitHub Pages / Netlify / Vercel
- Generate API reference from the live schemas

Manual doc deploys = stale docs.

### 10. Documentation has its own quality metrics

| Metric | Target |
| --- | --- |
| **Coverage**: features with docs / total features | 100% |
| **Currency**: % of docs reviewed in last 90 days | ≥ 80% |
| **Broken links** | 0 |
| **Search success**: % of queries returning a useful result | ≥ 90% |
| **Time to first action**: from arrival to first command run | < 5 minutes |
| **Reading level**: Flesch reading ease | ≥ 50 (for technical content) |
| **Image alt-text coverage** | 100% |

These are tracked + published. Doc debt is visible like code
debt.

## Reference architectures + templates

### arc42 — software architecture documentation

12 sections, broadly applicable. Use `architecture.md` template:

1. Introduction + Goals
2. Architecture Constraints
3. System Scope + Context
4. Solution Strategy
5. Building Block View (C4 levels)
6. Runtime View
7. Deployment View
8. Cross-cutting Concepts
9. Architectural Decisions (ADR index)
10. Quality Requirements
11. Risks + Technical Debt
12. Glossary

### C4 Model — architecture diagrams

Four nested views:

- **C1 Context**: system + external entities
- **C2 Container**: applications + datastores
- **C3 Component**: modules within a container
- **C4 Code**: classes (often skipped — code is the doc)

Tools: PlantUML, Structurizr, Mermaid C4 diagrams.

### ADRs — Architecture Decision Records

Per `adr-template.md`. Every non-trivial architectural decision
gets an ADR. Format (MADR or Nygard):

- Title + ID
- Status (proposed / accepted / deprecated / superseded)
- Context
- Decision
- Consequences
- Alternatives considered

### Runbooks

Per `runbook-template.md`. Every production service has a
runbook covering common incidents.

## Per-language doc tools

| Language | Tool |
| --- | --- |
| **TypeScript / JavaScript** | TypeDoc, JSDoc, API Extractor |
| **Python** | Sphinx + autodoc; pdoc; mkdocs + mkdocstrings |
| **Go** | godoc / pkg.go.dev (built into the language) |
| **Rust** | rustdoc (built into cargo) |
| **Java** | Javadoc (built into JDK) |
| **C# / .NET** | XML docs + DocFX |
| **Ruby** | YARD; RDoc |
| **Swift** | DocC |
| **Dart** | dartdoc |
| **Multi-language** | Docusaurus, MkDocs, Astro Starlight, VitePress, Nextra, Hugo |

## OpenAPI / GraphQL documentation

- **Redoc** / **Swagger UI** / **Stoplight Elements** — OpenAPI
- **GraphiQL** / **GraphQL Playground** / **Apollo Studio** —
  GraphQL
- Both ship inside the docs site for one-click try-it

## Anti-patterns

### Anti-pattern 1: "The code is self-documenting"

Self-documenting code documents WHAT it does. Documentation
explains WHY, WHEN, and HOW IT FITS. Even perfectly-named
functions need usage context.

### Anti-pattern 2: Bullet-point firehose

Documentation that's nothing but bullet points has no narrative
flow. Tutorials need narrative; how-tos need order; reference
needs structure beyond lists.

### Anti-pattern 3: Outdated screenshots

Every UI screenshot is a snapshot that goes stale. Either:

- Generate screenshots in CI on a baseline UI
- Use animated GIFs for complex flows (with text describing
  every step for accessibility)
- Skip screenshots and rely on text + a live demo link

### Anti-pattern 4: One giant document

The "complete guide" that's 50 pages long teaches no-one. Split
into Diátaxis quadrants; let users find the doc that matches
their goal.

### Anti-pattern 5: Marketing pretending to be docs

"Beautiful, blazing-fast, enterprise-grade" — that's marketing
copy. Docs need actual content: types, parameters, examples,
limits, gotchas.

### Anti-pattern 6: TODO-littered docs

`<!-- TODO: explain this -->` markers in published docs are
broken promises. Either finish the section or remove it.

## Documentation as code

Like code, documentation:

- Is version-controlled
- Is reviewed in PRs
- Has tests (link checks, example validations, accessibility)
- Has CI/CD (preview deploys, production deploys)
- Has owners
- Has metrics
- Has style guides (tone, voice, terminology — see also
  `i18n.md` glossary)

## Cross-references

- `docs-sync-with-code.md` — PRs update docs together
- `adr-template.md` — architectural decisions
- `runbook-template.md` — incident response
- `official-docs-first.md` — primary-source research recorded
- `api-versioning.md` — versioned docs for versioned APIs
- `deprecation-lifecycle.md` — migration guides
- `a11y.md` — docs are accessible
- `i18n.md` — docs are localisable
- `task-intake-due-diligence.md` Q20 (documentation)
- `repo-setup-checklist.md` — README required at setup time

## Standards cited

- **Diátaxis** (diataxis.fr) — Procida four-quadrant framework
- **CommonMark** — Markdown specification
- **Keep a Changelog 1.1.0** — keepachangelog.com
- **OpenAPI 3.1** — API reference generation
- **arc42** — software architecture template
- **C4 Model** — Brown's architecture visualization
- **MADR** — Markdown Architecture Decision Records
- **ISO/IEC/IEEE 26515** — Developing user documentation
- **Conventional Comments** — code-review tone

## Why this rule exists

Undocumented features fail in predictable ways:

- New team members spend weeks learning what could have been
  learned in days
- Customers cannot adopt features they don't understand
- Support burden scales with adoption because answers aren't
  written down
- Bug reports describe "broken" features that work as designed
  but weren't documented
- Refactors break implicit contracts that nobody knew about

Documented features fail less. The cost: one PR's worth of
markdown per feature, generated reference from schemas,
runbooks at on-call time. The benefit: features that actually
get used + a team that scales without re-explaining the same
things forever.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Feature shipped without a doc page (docs-sync-with-code.md violation — feature is not done)
- Diátaxis quadrants mixed in a single artifact (tutorial pivots into reference, etc.) — rule 1 weakening
- Reference doc hand-written instead of generated (rule 3 violation — drift inevitable)
- README missing the canonical sections (rule 4 weakening)
- Doc examples not tested (rule 5 weakening — examples rot)
- Doc lacks an owner / last-reviewed metadata (rule 6 weakening)
- Image without alt text shipped to docs (rule 7 a11y weakening)
- Time-to-first-action > 5 minutes for a quick-start (rule 10 metric drift)
- Broken-link count rises in CI (rule 10 metric drift)

**Refinement candidates**:

- New required README section when a recurring user need surfaces as a question on day one
- Tightening of the "examples are tested" enforcement when documentation rot is observed
- New cross-reference when a sister rule (adr-template, runbook-template) defines an artifact this rule references
- New row in the per-language doc-tools table when a tool becomes the team's choice
