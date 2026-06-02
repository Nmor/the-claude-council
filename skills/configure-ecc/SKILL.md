---
name: configure-ecc
description: Interactive installer for Everything Claude Code — guides users through selecting and installing skills and rules to user-level or project-level directories, verifies paths, and optionally optimizes installed files.
---

# Configure Everything Claude Code (ECC)

An interactive, step-by-step installation wizard for the Everything Claude Code project. Uses `AskUserQuestion` to guide users through selective installation of skills and rules, then verifies correctness and offers optimization.

## When to Activate

- User says "configure ecc", "install ecc", "setup everything claude code", or similar
- User wants to selectively install skills or rules from this project
- User wants to verify or fix an existing ECC installation
- User wants to optimize installed skills or rules for their project

## Prerequisites

This skill must be accessible to Claude Code before activation. Two ways to bootstrap:

1. **Via Plugin**: `/plugin install everything-claude-code` — the plugin loads this skill automatically
2. **Manual**: Copy only this skill to `~/.claude/skills/configure-ecc/SKILL.md`, then activate by saying "configure ecc"

---

## Step 0: Clone ECC Repository

Before any installation, clone the latest ECC source to `/tmp`:

```bash
rm -rf /tmp/everything-claude-code
git clone https://github.com/affaan-m/everything-claude-code.git /tmp/everything-claude-code
```

Set `ECC_ROOT=/tmp/everything-claude-code` as the source for all subsequent copy operations.

If the clone fails (network issues, etc.), use `AskUserQuestion` to ask the user to provide a local path to an existing ECC clone.

---

## Step 1: Choose Installation Level

Use `AskUserQuestion` to ask the user where to install:

```text
Question: "Where should ECC components be installed?"
Options:
  - "User-level (~/.claude/)" — "Applies to all your Claude Code projects"
  - "Project-level (.claude/)" — "Applies only to the current project"
  - "Both" — "Common/shared items user-level, project-specific items project-level"
```

Store the choice as `INSTALL_LEVEL`. Set the target directory:

- User-level: `TARGET=~/.claude`
- Project-level: `TARGET=.claude` (relative to current project root)
- Both: `TARGET_USER=~/.claude`, `TARGET_PROJECT=.claude`

Create the target directories if they don't exist:

```bash
mkdir -p $TARGET/skills $TARGET/rules
```

---

## Step 2: Select & Install Skills

### 2a: Choose Skill Categories

There are 27 skills organized into 4 categories. Use `AskUserQuestion` with `multiSelect: true`:

```text
Question: "Which skill categories do you want to install?"
Options:
  - "Framework & Language" — "Django, Spring Boot, Go, Python, Java, Frontend, Backend patterns"
  - "Database" — "PostgreSQL, ClickHouse, JPA/Hibernate patterns"
  - "Workflow & Quality" — "TDD, verification, learning, security review, compaction"
  - "All skills" — "Install every available skill"
```

### 2b: Confirm Individual Skills

For each selected category, print the full list of skills below and ask the user to confirm or deselect specific ones. If the list exceeds 4 items, print the list as text and use `AskUserQuestion` with an "Install all listed" option plus "Other" for the user to paste specific names.

**Category: Framework & Language (16 skills)**

| Skill | Description |
|-------|-------------|
| `backend-patterns` | Backend architecture, API design, server-side best practices for Node.js/Express/Next.js |
| `coding-standards` | Universal coding standards for TypeScript, JavaScript, React, Node.js |
| `django-patterns` | Django architecture, REST API with DRF, ORM, caching, signals, middleware |
| `django-security` | Django security: auth, CSRF, SQL injection, XSS prevention |
| `django-tdd` | Django testing with pytest-django, factory_boy, mocking, coverage |
| `django-verification` | Django verification loop: migrations, linting, tests, security scans |
| `frontend-patterns` | React, Next.js, state management, performance, UI patterns |
| `golang-patterns` | Idiomatic Go patterns, conventions for robust Go applications |
| `golang-testing` | Go testing: table-driven tests, subtests, benchmarks, fuzzing |
| `java-coding-standards` | Java coding standards for Spring Boot: naming, immutability, Optional, streams |
| `python-patterns` | Pythonic idioms, PEP 8, type hints, best practices |
| `python-testing` | Python testing with pytest, TDD, fixtures, mocking, parametrization |
| `springboot-patterns` | Spring Boot architecture, REST API, layered services, caching, async |
| `springboot-security` | Spring Security: authn/authz, validation, CSRF, secrets, rate limiting |
| `springboot-tdd` | Spring Boot TDD with JUnit 5, Mockito, MockMvc, Testcontainers |
| `springboot-verification` | Spring Boot verification: build, static analysis, tests, security scans |

**Category: Database (3 skills)**

| Skill | Description |
|-------|-------------|
| `clickhouse-io` | ClickHouse patterns, query optimization, analytics, data engineering |
| `jpa-patterns` | JPA/Hibernate entity design, relationships, query optimization, transactions |
| `postgres-patterns` | PostgreSQL query optimization, schema design, indexing, security |

**Category: Workflow & Quality (8 skills)**

| Skill | Description |
|-------|-------------|
| `continuous-learning-v2` | Instinct-based learning with confidence scoring, evolves into skills/commands/agents (canonical) |
| `eval-harness` | Formal evaluation framework for eval-driven development (EDD) |
| `iterative-retrieval` | Progressive context refinement for subagent context problem |
| `security-review` | Security checklist: auth, input, secrets, API, payment features |
| `tdd-workflow` | Enforces TDD with 90% touched / 80% project coverage: unit, integration, E2E |
| `verification-loop` | Verification and quality loop patterns, plus strategic context-management at logical phase boundaries |

**Standalone**

| Skill | Description |
|-------|-------------|
| `project-guidelines-example` | Template for creating project-specific skills |

### 2c: Execute Installation

For each selected skill, copy the entire skill directory:

```bash
cp -r $ECC_ROOT/skills/<skill-name> $TARGET/skills/
```

Note: `continuous-learning` and `continuous-learning-v2` have extra files (config.json, hooks, scripts) — ensure the entire directory is copied, not just SKILL.md.

---

## Step 3: Select & Install Rules

Use `AskUserQuestion` with `multiSelect: true`:

```text
Question: "Which rule sets do you want to install?"
Options:
  - "Common rules (Recommended)" — "Language-agnostic principles: coding style, git workflow, testing, security, etc. (8 files)"
  - "TypeScript/JavaScript" — "TS/JS patterns, hooks, testing with Playwright (5 files)"
  - "Python" — "Python patterns, pytest, black/ruff formatting (5 files)"
  - "Go" — "Go patterns, table-driven tests, gofmt/staticcheck (5 files)"
```

Execute installation:

```bash
# Common rules (flat copy into rules/)
cp -r $ECC_ROOT/rules/common/* $TARGET/rules/

# Language-specific rules (flat copy into rules/)
cp -r $ECC_ROOT/rules-library/typescript/* $TARGET/rules/   # if selected
cp -r $ECC_ROOT/rules-library/python/* $TARGET/rules/        # if selected
cp -r $ECC_ROOT/rules-library/golang/* $TARGET/rules/        # if selected
```

**Important**: If the user selects any language-specific rules but NOT common rules, warn them:
> "Language-specific rules extend the common rules. Installing without common rules may result in incomplete coverage. Install common rules too?"

---

## Step 4: Post-Installation Verification

After installation, perform these automated checks:

### 4a: Verify File Existence

List all installed files and confirm they exist at the target location:

```bash
ls -la $TARGET/skills/
ls -la $TARGET/rules/
```

### 4b: Check Path References

Scan all installed `.md` files for path references:

```bash
grep -rn "~/.claude/" $TARGET/skills/ $TARGET/rules/
grep -rn "../common/" $TARGET/rules/
grep -rn "skills/" $TARGET/skills/
```

**For project-level installs**, flag any references to `~/.claude/` paths:

- If a skill references `~/.claude/settings.json` — this is usually fine (settings are always user-level)
- If a skill references `~/.claude/skills/` or `~/.claude/rules/` — this may be broken if installed only at project level
- If a skill references another skill by name — check that the referenced skill was also installed

### 4c: Check Cross-References Between Skills

Some skills reference others. Verify these dependencies:

- `django-tdd` may reference `django-patterns`
- `springboot-tdd` may reference `springboot-patterns`
- `continuous-learning-v2` references `~/.claude/homunculus/` directory
- `python-testing` may reference `python-patterns`
- `golang-testing` may reference `golang-patterns`
- Language-specific rules reference `common/` counterparts

### 4d: Report Issues

For each issue found, report:

1. **File**: The file containing the problematic reference
2. **Line**: The line number
3. **Issue**: What's wrong (e.g., "references ~/.claude/skills/python-patterns but python-patterns was not installed")
4. **Suggested fix**: What to do (e.g., "install python-patterns skill" or "update path to .claude/skills/")

---

## Step 5: Optimize Installed Files (Optional)

Use `AskUserQuestion`:

```text
Question: "Would you like to optimize the installed files for your project?"
Options:
  - "Optimize skills" — "Remove irrelevant sections, adjust paths, tailor to your tech stack"
  - "Optimize rules" — "Adjust coverage targets, add project-specific patterns, customize tool configs"
  - "Optimize both" — "Full optimization of all installed files"
  - "Skip" — "Keep everything as-is"
```

### If optimizing skills

1. Read each installed SKILL.md
2. Ask the user what their project's tech stack is (if not already known)
3. For each skill, suggest removals of irrelevant sections
4. Edit the SKILL.md files in-place at the installation target (NOT the source repo)
5. Fix any path issues found in Step 4

### If optimizing rules

1. Read each installed rule .md file
2. Ask the user about their preferences:
   - Test coverage target (default 70%)
   - Preferred formatting tools
   - Git workflow conventions
   - Security requirements
3. Edit the rule files in-place at the installation target

**Critical**: Only modify files in the installation target (`$TARGET/`), NEVER modify files in the source ECC repository (`$ECC_ROOT/`).

---

## Step 6: Installation Summary

Clean up the cloned repository from `/tmp`:

```bash
rm -rf /tmp/everything-claude-code
```

Then print a summary report:

```text
## ECC Installation Complete

### Installation Target
- Level: [user-level / project-level / both]
- Path: [target path]

### Skills Installed ([count])
- skill-1, skill-2, skill-3, ...

### Rules Installed ([count])
- common (8 files)
- typescript (5 files)
- ...

### Verification Results
- [count] issues found, [count] fixed
- [list any remaining issues]

### Optimizations Applied
- [list changes made, or "None"]
```

---

## Troubleshooting

### "Skills not being picked up by Claude Code"

- Verify the skill directory contains a `SKILL.md` file (not just loose .md files)
- For user-level: check `~/.claude/skills/<skill-name>/SKILL.md` exists
- For project-level: check `.claude/skills/<skill-name>/SKILL.md` exists

### "Rules not working"

- Rules are flat files, not in subdirectories: `$TARGET/rules/coding-style.md` (correct) vs `$TARGET/rules-library/common/coding-style.md` (incorrect for flat install)
- Restart Claude Code after installing rules

### "Path reference errors after project-level install"

- Some skills assume `~/.claude/` paths. Run Step 4 verification to find and fix these.
- For `continuous-learning-v2`, the `~/.claude/homunculus/` directory is always user-level — this is expected and not an error.

## Purpose

Operate the install / sync / update lifecycle for `~/.claude/`
artifacts (skills, agents, rules, commands, plans, hooks) across
machines and IDEs. Configure-ECC keeps the global config
reproducible: clone the canonical repo, run `bootstrap.sh`, and
the user's Claude Code (and Cursor / JetBrains / Windsurf via
shims) operates with the same rule-set everywhere.

**Negative scope** (NOT what this skill covers):

- Authoring new skills / rules / agents — see
  `rule-authoring-global-vs-project.md` for placement, the
  `principal-level-mandate.md` for depth contract
- Project-specific configuration — workspace `.claude/`
  directories per `project-scoped-artifacts.md`
- Secret distribution — `secrets-management.md` covers vault-
  based secret flow
- Per-IDE deep settings — see `ide-integrations/` in the
  shareable repo (Phase 14)

## When NOT to use

- Single-machine setup with no plans to share / sync
- Working inside a workspace `.claude/` (those don't sync via
  ECC; they're per-repo)
- Editing global rules in-place rather than via the canonical
  repo workflow

## Standards Cited

- **POSIX shell** (IEEE Std 1003.1-2024) — bootstrap script
  portability requirement
- **Semantic Versioning 2.0.0** — per `semver.md`, the
  shareable repo versions follow MAJOR.MINOR.PATCH semantics
- **Keep a Changelog 1.1.0** — every release ships with
  CHANGELOG.md entries
- **NIST SP 800-218 SSDF §PO.1** — Documented + automated
  configuration management; configure-ecc IS the
  implementation
- **NIST SP 800-53 Rev 5 §CM-2** — Baseline configuration
- **OWASP ASVS 4.0.3 §14.1** — Build pipeline integrity
- **SLSA Framework v1.0 Build L2** — Reproducible
  configuration deployment
- **`~/.claude/rules-library/common/install-allowlist.md`** — Every
  install passes the publisher allowlist
- **`~/.claude/rules-library/common/dependency-pinning.md`** — Lockfile
  - digest pinning applies to ECC's dependencies
- **CWE-829** — Inclusion of Functionality from Untrusted
  Control Sphere (relevant when ECC pulls remote artifacts)

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Editing `~/.claude/` files directly without going through the repo | Drift between machines; lost work on next sync | Edit in the repo's working tree, commit, push, pull on each machine |
| Hardcoded `~/.claude/` paths inside skill / rule content | Breaks on machines where `$HOME` differs (e.g., shared dev hosts) | Use placeholders (`<claude-home>`) or env-var expansion |
| `curl https://... \| sh` for bootstrap | Supply-chain risk; no integrity verification | Download → verify SHA → execute (per `install-allowlist.md`) |
| Sync mechanism that overwrites local edits silently | Loses unmerged work | Three-way merge with clear "local vs remote" prompt |
| Skipping `verify-repo-setup.sh` after bootstrap | First-touch posture gaps go undetected | Bootstrap runs the 20-point checklist; failures block |
| Manual `pnpm install -g` of ECC's runtime deps | Each install pulls latest; non-reproducible | Pin via lockfile; `pnpm install --frozen-lockfile` |
| `git push --force` to the shared repo | Overwrites teammates' updates | Use branch + PR; never force-push to `main` |
| ECC bootstrap runs as root | Excessive privilege; supply-chain blast radius | Run as user; sudo only for explicit steps the user approves |

## Verification Checklist

- [ ] Bootstrap script runs cleanly on a fresh machine
      (`./bootstrap.sh` exits 0)
- [ ] Post-install verify script (`./verify.sh`) reports all
      sub-system checks green
- [ ] No hardcoded `~/.claude/` paths in skill content (run
      `grep -r "~/.claude" skills/ rules/ | grep -v <claude-home>`)
- [ ] Per-IDE integration shims installed where the user has
      the IDE (VS Code / Cursor / JetBrains / Windsurf)
- [ ] CHANGELOG.md updated for the release
- [ ] Tag matches semver (`vMAJOR.MINOR.PATCH`)
- [ ] Lockfile committed; `pnpm install --frozen-lockfile`
      succeeds in CI

## Cross-References

- `~/.claude/rules-library/common/install-allowlist.md` — publisher gate
- `~/.claude/rules-library/common/dependency-pinning.md` — lockfile +
  digest discipline
- `~/.claude/rules-library/common/repo-setup-checklist.md` — first-touch
  posture (configure-ecc invokes this on bootstrap)
- `~/.claude/rules/common/project-scoped-artifacts.md` —
  workspace `.claude/` lifecycle (separate from global ECC)
- `~/.claude/rules/common/rule-authoring-global-vs-project.md`
  — promotion / demotion path between workspace + global
- `~/.claude/rules-library/common/secrets-management.md` — ECC never
  carries plaintext secrets

## Why this skill exists

The global Claude config rebuild created a comprehensive
ruleset spanning 60+ rules, 50+ skills, 20+ agents, and 30+
commands. Without an install / sync mechanism, every
contributor's machine drifts from the canonical state within
weeks: someone edits a rule locally, another machine never
sees it; an agent gets updated centrally, an old version
persists on a teammate's laptop. Configure-ECC closes the
drift loop by making the canonical repo the source of truth
and `bootstrap.sh` the deterministic install path. Cost: one
script + one PR per change. Benefit: cross-machine, cross-IDE
consistency that compounds over time.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Skill installed without Step 4 verification (hardcoded `~/.claude/` paths break in project-level install)
- Cross-project skill duplication (same skill installed in N projects instead of promoted to global per `~/.claude/rules/common/rule-authoring-global-vs-project.md`)
- Project-level install of a skill that should be global (universal applicability misread)
- Global install of a skill that should be project-specific (vendor / domain pollution into global surface)
- `$TARGET/rules/common/` subdirectory used instead of flat `$TARGET/rules/` (project-vs-global install shape confusion)
- Restart after install skipped — skill auto-discovery doesn't pick up new file
- `homunculus/` directory created at project level (should be user-level only)
- Install command misuses `--global` flag when project install was intended (or vice versa)

**Refinement candidates**:

- New installer flag when a recurring install pattern (e.g., bulk-install from a manifest, sync from a shared repo) needs codification
- Promotion path automation (workspace → global) per `rule-authoring-global-vs-project.md` rule 7
- Demotion path documentation when global skill turns out workspace-specific
- Pre-install validator that flags hardcoded `~/.claude/` paths before the copy step
