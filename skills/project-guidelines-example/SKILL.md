---
name: project-guidelines-example
description: Template for authoring a project-specific skill in `<workspace>/.claude/skills/`. Demonstrates the canonical shape — Architecture / File Structure / Code Patterns / Testing Requirements / Deployment Workflow / Critical Rules — that workspace skills follow when they extend global guidance with project-specific specifics. Use this file as a starting point; copy + customise per the project's actual stack.
---

# Project Guidelines Skill (Template)

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> Template skill — NOT a global guidance source. The example
> sections below show the SHAPE of a workspace-specific skill;
> the content is illustrative. Per
> `~/.claude/rules/common/rule-authoring-global-vs-project.md`,
> project-specific guidance lives in `<workspace>/.claude/skills/`
> and `<workspace>/.claude/rules/`, never in global. Per
> `~/.claude/rules/common/project-scoped-artifacts.md`, every
> project's first significant Council-mediated task auto-spawns
> a `<workspace>/.claude/` scaffold; this template is one of the
> things that scaffold can copy from.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| EXAMPLE CONTENT — copy + customise everything below | [`references/example-content-copy-customise-everything-below.md`](references/example-content-copy-customise-everything-below.md) |
| Standards + references | [`references/standards-references.md`](references/standards-references.md) |

## Purpose

A workspace-specific skill captures:

- The project's tech stack (runtime + language + framework + DB
  - queue + cache + CDN + auth provider) at PINNED versions
- The project's file layout
- Project-specific code patterns + reuse-first primitives
- Testing requirements that EXTEND global (`extreme-lint-policy.md`
  - `testing.md`) with project-specific thresholds
- Deployment workflow + env vars
- Critical rules that EXTEND global (never relax)
- Cross-references to the project's `CLAUDE.md` + sister
  workspace files

This skill is the canonical shape. Copy it, rename it (e.g.,
`<project>-patterns`), and replace the illustrative content with
your project's actual specifics.

## When to use this template

- A new project is being scaffolded (per
  `~/.claude/rules/common/project-scoped-artifacts.md`)
- An existing project lacks a workspace-skill summary
- A project's onboarding doc has drifted from reality and needs
  re-anchoring to current source
- A project's stack has changed (framework major bump, DB swap,
  cloud migration) and the workspace skill needs a refresh

## When NOT to use

- For UNIVERSAL guidance (every project's coding standards, every
  language's lint rules, every cloud's deploy pattern) — that
  lives in `~/.claude/skills/` + `~/.claude/rules/common/`
- For one-off project notes that aren't pattern-shaped (those go
  in the project's Claude memory, per
  `~/.claude/rules/common/project-memory.md`)
- For temporary in-flight decisions awaiting commit — those go
  in `<workspace>/.claude/plans/<slug>.md` per
  `~/.claude/rules/common/plan-task-breakdown.md`

---

## Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Copying this template verbatim without customising | Replace every `<placeholder>` and illustrative version pin with the project's real values |
| Workspace skill lowering a global threshold (e.g., "this project only requires 60% coverage") | Workspace rules can RAISE thresholds, never LOWER them per `rule-authoring-global-vs-project.md` rule 4 |
| Pinning a Claude model ID literal in code | Source from env / config so model upgrades roll forward without code changes |
| Pinning an EOL runtime (Python 3.11, Node 18) | Use current LTS per `~/.claude/rules-library/common/updated-frameworks.md` |
| Restating global rules verbatim in the workspace skill | Workspace skill should ADD project-specifics; cross-reference global rather than duplicate |
| Skipping the `.env.example` placeholder list | Every env var the app reads must appear in `.env.example` with a placeholder value per `~/.claude/rules-library/common/local-dev-setup.md` |
| Coverage threshold stuck at 70% (older `tdd-workflow` default) | Match `~/.claude/rules-library/common/extreme-lint-policy.md` — 80% project / 90% touched / 95% critical paths |

## Verification checklist

When using this template for a new project, confirm:

- [ ] Every `<placeholder>` (`<your-app>`, `<your-cloud>`,
      `<your-domain>`) replaced with the project's actual value
- [ ] Stack section reflects current installed versions
      (`package.json`, `pyproject.toml`, `go.mod`)
- [ ] File structure matches actual repo layout
- [ ] Code patterns match the actual project's reuse-first
      primitives (per `~/.claude/rules-library/common/reuse-first.md`)
- [ ] Coverage thresholds ≥ global floors (80 / 90 / 95)
- [ ] Critical rules EXTEND global; do NOT lower any threshold
- [ ] `.env.example` lists every env var
- [ ] Deployment commands tested on a fresh clone
- [ ] Workspace `CLAUDE.md` cross-references this skill
- [ ] Workspace's `<workspace>/.claude/skills/` index updated

## Cross-references

- `~/.claude/rules/common/rule-authoring-global-vs-project.md` —
  classification of new rules (global vs project)
- `~/.claude/rules/common/project-scoped-artifacts.md` —
  workspace `.claude/` scaffold creation on first significant
  work
- `~/.claude/rules-library/common/reuse-first.md` — project's
  reuse-first sweep before adding new primitives
- `~/.claude/rules-library/common/extreme-lint-policy.md` — coverage +
  complexity thresholds the workspace inherits
- `~/.claude/rules-library/common/testing.md` — test types + coverage
  floors
- `~/.claude/rules-library/common/error-codes.md` +
  `~/.claude/rules-library/common/error-handling-with-context.md` —
  stable error envelope conventions
- `~/.claude/rules-library/common/local-dev-setup.md` — 30-minute
  fresh-clone bootstrap
- `~/.claude/rules-library/common/secrets-management.md` — vault-based
  secrets
- `~/.claude/rules-library/common/docs-sync-with-code.md` — docs ship in
  the same PR as code
- `~/.claude/rules-library/common/performance.md` — Claude model
  selection policy (opus default, haiku for mechanical)
- `~/.claude/skills/coding-quality-rules/` — universal coding
  standards
- `~/.claude/skills/api-design/` — REST API design patterns
- `~/.claude/skills/backend-patterns/` — backend patterns
- `~/.claude/skills/frontend-patterns/` — frontend patterns
- `~/.claude/skills/tdd-workflow/` — TDD methodology
- `~/.claude/skills/claude-api/` — Claude SDK / model migration

## Why this skill exists

A project without a workspace-specific skill makes every new
contributor re-discover the project's stack, conventions, and
critical paths. The workspace skill is the SAME shape across
projects (architecture / structure / patterns / testing /
deployment / rules) so a contributor who knows one project's
shape can navigate any project's shape immediately. The
project-specific CONTENT changes; the SHAPE doesn't.

This template encodes the shape. Per
`~/.claude/rules/common/project-scoped-artifacts.md`, every
project's `.claude/` scaffold can copy this template when
spawning its workspace skill on first significant work.

## Standards Cited

- **ISO/IEC/IEEE 12207:2017** — Software life cycle processes
  (project guidelines fit within §6.4 implementation process)
- **ISO/IEC 25010:2011** — Quality model (project guidelines
  enforce maintainability + reliability + security)
- **NIST SP 800-218 SSDF §PO.1 + §PO.3** — Define security
  requirements + implement supporting toolchains
- **NIST SP 800-53 Rev 5 §SA-15** — Development process,
  standards, and tools
- **OWASP ASVS 4.0.3 §V1.1** — Secure software development
  lifecycle
- **CWE-1059** — Insufficient technical documentation
- **`~/.claude/rules/common/rule-authoring-global-vs-project.md`** —
  Classification (global guidance vs project specifics)
- **`~/.claude/rules/common/project-scoped-artifacts.md`** —
  Project-bound `.claude/` scaffold

## Cross-References

- `~/.claude/rules/common/rule-authoring-global-vs-project.md` —
  classification of project-specific guidance
- `~/.claude/rules/common/project-scoped-artifacts.md` — workspace
  `.claude/` scaffold structure
- `~/.claude/rules-library/common/auto-skills.md` — skill auto-fire
  registry
- `configure-ecc` skill — installs project-scoped Claude config
- `~/.claude/CLAUDE.md` — Council protocol the project guidelines
  inherit
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strictness
  baseline a project guidelines example illustrates

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Project guidelines duplicate global rule content | Drift over time; contradictions when global updates | Reference global rule; add only project-specific overlays |
| Project rule LOWERS a global threshold | "strictest wins" principle violated | Project rules can only RAISE thresholds, never lower |
| Project `.claude/` scattered across multiple subdirs | Discoverability broken; agents miss context | Single `<workspace>/.claude/` scaffold per `project-scoped-artifacts.md` |
| Guidelines written in prose narrative without rules | Hard to enforce; hard to verify | Each guideline = one testable rule + verification |
| New rule landed without classification (global vs project) | Project specifics pollute global surface | Classify before writing per `rule-authoring-global-vs-project.md` |
| Sample project rule references internal tickets / PR numbers | Rots over time; tracker drift | Plain-English why-only; tracker refs belong in PR description |
| Project-specific vendor list in global `CLAUDE.md` | Pollutes global; other projects see irrelevant context | Vendor list in `<workspace>/.claude/CLAUDE.md` |
| Project guidelines not version-controlled with code | Out-of-sync with codebase; review-bypass | Guidelines live in repo; reviewed in PRs |

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New workspace `.claude/skills/` created without using this
  template (template adoption gap — surface to surface the
  scaffold flow per `project-scoped-artifacts.md`)
- Workspace skill that LOWERS a global threshold (rule-authoring
  rule 4 violation — strictest wins)
- Project-skill restating global rules verbatim instead of
  extending (DRY violation; should cross-reference global)
- Pinned EOL runtime version in a workspace skill (sister
  `updated-frameworks.md` weakening)
- Hardcoded Claude model ID literal in workspace code samples
  (sister `claude-api` skill + `performance.md` weakening)
- Coverage threshold left at 70% in a workspace skill (this
  template's previous default — needs update to 80/90/95)
- Workspace skill missing the `.env.example` reference
- Cross-reference list in this template gets stale relative to
  the global rules catalogue

**Refinement candidates**:

- New illustrative section when a recurring stack shape emerges
  across 3+ workspaces (e.g., Tauri desktop, Solidity contracts,
  Flutter mobile, Electron + Rust core)
- Tightening of the verification checklist when a recurring
  template-customisation miss surfaces in retrospectives
- New cross-reference when a sister rule (project-scoped-
  artifacts, rule-authoring-global-vs-project, continuous-
  learning-mandate) prescribes a workspace-skill behaviour this
  template should encode
- Promotion of a workspace-specific pattern to global when the
  same shape appears in 2+ workspaces (per
  `rule-authoring-global-vs-project.md` rule 7 promotion path)
