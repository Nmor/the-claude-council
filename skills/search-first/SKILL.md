---
name: search-first
description: Research-before-coding workflow. Search for existing tools, libraries, and patterns before writing custom code. Invokes the researcher agent.
---

# /search-first — Research Before You Code

Systematizes the "search for existing solutions before implementing" workflow.

## Trigger

Use this skill when:
- Starting a new feature that likely has existing solutions
- Adding a dependency or integration
- The user asks "add X functionality" and you're about to write code
- Before creating a new utility, helper, or abstraction

## Workflow

```
┌─────────────────────────────────────────────┐
│  1. NEED ANALYSIS                           │
│     Define what functionality is needed      │
│     Identify language/framework constraints  │
├─────────────────────────────────────────────┤
│  2. PARALLEL SEARCH (researcher agent)      │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│     │  npm /   │ │  MCP /   │ │  GitHub / │  │
│     │  PyPI    │ │  Skills  │ │  Web      │  │
│     └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────┤
│  3. EVALUATE                                │
│     Score candidates (functionality, maint, │
│     community, docs, license, deps)         │
├─────────────────────────────────────────────┤
│  4. DECIDE                                  │
│     ┌─────────┐  ┌──────────┐  ┌─────────┐  │
│     │  Adopt  │  │  Extend  │  │  Build   │  │
│     │ as-is   │  │  /Wrap   │  │  Custom  │  │
│     └─────────┘  └──────────┘  └─────────┘  │
├─────────────────────────────────────────────┤
│  5. IMPLEMENT                               │
│     Install package / Configure MCP /       │
│     Write minimal custom code               │
└─────────────────────────────────────────────┘
```

## Decision Matrix

| Signal | Action |
|--------|--------|
| Exact match, well-maintained, MIT/Apache | **Adopt** — install and use directly |
| Partial match, good foundation | **Extend** — install + write thin wrapper |
| Multiple weak matches | **Compose** — combine 2-3 small packages |
| Nothing suitable found | **Build** — write custom, but informed by research |

## How to Use

### Quick Mode (inline)

Before writing a utility or adding functionality, mentally run through:

1. Is this a common problem? → Search npm/PyPI
2. Is there an MCP for this? → Check `~/.claude/settings.json` and search
3. Is there a skill for this? → Check `~/.claude/skills/`
4. Is there a GitHub template? → Search GitHub

### Full Mode (agent)

For non-trivial functionality, launch the researcher agent:

```
Task(subagent_type="general-purpose", prompt="
  Research existing tools for: [DESCRIPTION]
  Language/framework: [LANG]
  Constraints: [ANY]

  Search: npm/PyPI, MCP servers, Claude Code skills, GitHub
  Return: Structured comparison with recommendation
")
```

## Search Shortcuts by Category

### Development Tooling
- Linting → `eslint`, `ruff`, `textlint`, `markdownlint`
- Formatting → `prettier`, `black`, `gofmt`
- Testing → `jest`, `pytest`, `go test`
- Pre-commit → `husky`, `lint-staged`, `pre-commit`

### AI/LLM Integration
- Claude SDK → Context7 for latest docs
- Prompt management → Check MCP servers
- Document processing → `unstructured`, `pdfplumber`, `mammoth`

### Data & APIs
- HTTP clients → `httpx` (Python), `ky`/`got` (Node)
- Validation → `zod` (TS), `pydantic` (Python)
- Database → Check for MCP servers first

### Content & Publishing
- Markdown processing → `remark`, `unified`, `markdown-it`
- Image optimization → `sharp`, `imagemin`

## Integration Points

### With planner agent
The planner should invoke researcher before Phase 1 (Architecture Review):
- Researcher identifies available tools
- Planner incorporates them into the implementation plan
- Avoids "reinventing the wheel" in the plan

### With architect agent
The architect should consult researcher for:
- Technology stack decisions
- Integration pattern discovery
- Existing reference architectures

### With iterative-retrieval skill
Combine for progressive discovery:
- Cycle 1: Broad search (npm, PyPI, MCP)
- Cycle 2: Evaluate top candidates in detail
- Cycle 3: Test compatibility with project constraints

## Examples

### Example 1: "Add dead link checking"
```
Need: Check markdown files for broken links
Search: npm "markdown dead link checker"
Found: textlint-rule-no-dead-link (score: 9/10)
Action: ADOPT — npm install textlint-rule-no-dead-link
Result: Zero custom code, battle-tested solution
```

### Example 2: "Add HTTP client wrapper"
```
Need: Resilient HTTP client with retries and timeout handling
Search: npm "http client retry", PyPI "httpx retry"
Found: got (Node) with retry plugin, httpx (Python) with built-in retry
Action: ADOPT — use got/httpx directly with retry config
Result: Zero custom code, production-proven libraries
```

### Example 3: "Add config file linter"
```
Need: Validate project config files against a schema
Search: npm "config linter schema", "json schema validator cli"
Found: ajv-cli (score: 8/10)
Action: ADOPT + EXTEND — install ajv-cli, write project-specific schema
Result: 1 package + 1 schema file, no custom validation logic
```

## Anti-Patterns

- **Jumping to code**: Writing a utility without checking if one exists
- **Ignoring MCP**: Not checking if an MCP server already provides the capability
- **Over-customizing**: Wrapping a library so heavily it loses its benefits
- **Dependency bloat**: Installing a massive package for one small feature

## Purpose

Sweep the codebase, sister workspaces, vetted dependencies,
and the broader OSS ecosystem BEFORE writing new code. Pairs
with `reuse-first.md` as its execution arm: reuse-first says
"don't rewrite," search-first says "here's how you find what
exists." Covers the 4-radius escalation (in-file → in-module
→ in-project → in-workspace → in-ecosystem) and the
adoption gate (license + CVE + maintenance + tests).

**Negative scope** (NOT what this skill covers):
- Authoring net-new code when the search comes up empty —
  that's the language-specific patterns skill
- Authoring new rules — see `rule-authoring-global-vs-project.md`
- Vendor selection at the org level — see `strategy-reviewer`
  + `task-intake-due-diligence.md`

## When NOT to use

- Trivial fix in an existing function (no new abstraction)
- The user explicitly says "write a custom one for learning"
- Reach-out is genuinely unavailable (air-gapped env, etc.)

## Standards Cited

- **NIST SP 800-218 SSDF §PO.3** — Implement supporting
  toolchains (the search-first sweep IS the toolchain
  pre-step)
- **NIST SP 800-53 Rev 5 §SA-15** — Development process,
  standards, and tools (search before write enforces
  toolchain awareness)
- **ISO/IEC 25010:2011 §6.6** — Maintainability (reuse
  reduces maintenance surface)
- **OWASP ASVS 4.0.3 §V14.2** — Dependency
  (search-first identifies the dep before adding)
- **OWASP Dependency-Check** — applies to anything found
  via search-first per `dependency-vulnerabilities.md`
- **SLSA Framework v1.0** — Trusted source for adopted
  dependencies
- **SPDX License List** (spdx.org/licenses) — license
  compatibility check before adoption
- **CWE-1357** — Reliance on Insufficiently Trustworthy
  Component (search-first's adoption gate prevents this)
- **`~/.claude/rules/common/reuse-first.md`** — the policy
  this skill executes
- **`~/.claude/rules/common/install-allowlist.md`** —
  publisher allowlist gate on adoption
- **`~/.claude/rules/common/dependency-vulnerabilities.md`**
  — CVE gate on adoption
- **`~/.claude/rules/common/license-allowlist-gate.md`** —
  SPDX gate on adoption

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Jump to code without grep | Reinvent existing utility | Sweep first per `reuse-first.md` 4-step gate |
| Search only the current file | Misses module-level / project-level primitives | Escalate radii in order: file → module → project → workspace → ecosystem |
| Adopt OSS without license + CVE + maintenance check | Inherit unfixable debt | Adoption gate: SPDX allowlist + CVE clean + recent maintenance + tests + docs |
| Adopt because "the README looks good" | README ≠ code quality | Read source; check publish history; check open + closed issues |
| Fork the library to fix one thing | Maintenance burden compounds | Send the patch upstream first; fork only as last resort |
| Wrap an entire library in a thin adapter | Loses library benefits; doubles surface | Extend with prop / parameter / option per `reuse-first.md` rule 3 |
| Install a 5MB package for one small function | Bundle bloat; supply-chain exposure | Copy the small function with attribution OR write inline |
| Search only English / official sources | Misses major non-English ecosystems (Chinese / Japanese / Russian OSS) | Multi-language search when the domain is global |
| Skip the adoption gate "just for a prototype" | Prototype becomes prod; debt entrenches | Same gate for prototype + prod |

## Verification Checklist

- [ ] 4-radius sweep run (in-file / module / project /
      workspace / ecosystem) and findings documented
- [ ] Adoption gate passed: license SPDX-allowlisted, CVE
      clean, maintained < 12mo, tests present, docs
      sufficient
- [ ] Publisher allowlist check per
      `~/.claude/rules/common/install-allowlist.md`
- [ ] If extending existing primitive: rule of three honored
      (extract on 2nd occurrence; never fork on 3rd)
- [ ] Rationale documented (reuse / extend / custom — and
      why)

## Cross-References

- `~/.claude/rules/common/reuse-first.md` — the policy
- `~/.claude/rules/common/install-allowlist.md` — adoption
  publisher gate
- `~/.claude/rules/common/dependency-vulnerabilities.md` —
  adoption CVE gate
- `~/.claude/rules/common/license-allowlist-gate.md` —
  adoption license gate
- `~/.claude/rules/common/dependency-pinning.md` — pin
  what's adopted
- `~/.claude/rules/common/updated-frameworks.md` — adopt
  current stable, not abandoned
- `~/.claude/rules/common/task-intake-due-diligence.md` Q1,
  Q3, Q4 — search-first is the intake's prior-art arm
- `~/.claude/skills/iterative-retrieval/SKILL.md` —
  subagent-driven cross-codebase search

## Why this skill exists

Every line of net-new code is a line of net-new maintenance
debt. Existing primitives — in the codebase, in vetted deps,
in mature OSS — solve most problems already. Search-first
disciplines the agent to find them before writing parallel
implementations. Cost: a few greps + an adoption-gate check.
Benefit: maintenance surface stays flat; security posture
inherits from the adopted lib's track record; team
onboarding stays simple because the codebase uses canonical
patterns rather than parallel home-rolled variants.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New component / function / module written without a codebase sweep first (sister `reuse-first.md` rule 1 violation)
- Same conceptual unit implemented twice in same project (rule of three violated at occurrence 2)
- Existing primitive copied + modified instead of extended via prop / option / parameter (forking anti-pattern)
- Dependency installed for one small feature when an internal helper exists (dependency-bloat)
- MCP capability re-implemented as custom code when an existing server provides it
- Search query too narrow — primitive missed due to naming variance (search heuristic gap)
- Selection criteria skipped on a new OSS adoption (no license / maintenance / security gate)

**Refinement candidates**:
- New scoring axis when a recurring evaluation gap appears (e.g., bundle size, cold-start cost, accessibility built-in)
- New OSS-vs-custom heuristic row when a recurring tradeoff class emerges
- Tightening of the "rule of three" trigger threshold when twin implementations consistently drift
- New cross-reference when a sister rule (reuse-first, install-allowlist, dependency-vulnerabilities) provides the canonical adoption gate
