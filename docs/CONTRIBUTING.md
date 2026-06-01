# Contributing to The Claude Council

> How to add a rule, skill, or agent — or improve an existing one.
> Every contribution follows the principal-level mandate and passes
> through the same Council protocol it enforces.

## Quick start

```bash
# 1. Fork + clone
git clone https://github.com/<your-fork>/the-claude-council.git
cd the-claude-council

# 2. Install hooks (cross-platform; reads .githooks/)
git config core.hooksPath .githooks 2>/dev/null || true

# 3. Run the local verifier suite — the same gate CI runs
bash bootstrap/verify.sh --prefix "$PWD" --verbose
bash tests/verify-link-integrity.sh
bash tests/verify-no-orphans.sh
bash tests/verify-standards-citations.sh

# 4. Markdown + shell lint (CI runs the same)
npx --yes markdownlint-cli2 "**/*.md" "#node_modules" "#sessions" \
    "#projects" "#file-history"
shellcheck -S style bootstrap/*.sh tests/*.sh
```

All four verifiers must pass before you open the PR. CI re-runs them
and will block the merge if anything is red.

## Choosing what to file

| Kind of change | Use this template |
| --- | --- |
| Something is broken | `bug_report.yml` |
| Existing rule / skill / agent needs an enhancement | `feature_request.yml` |
| New rule / skill / agent / command (or major rewrite) | `skill_proposal.yml` |
| Security vulnerability | [`SECURITY.md`](../SECURITY.md) (private channel) |
| Open-ended discussion / idea | GitHub Discussions |

**No blank issues.** Templates collect the fields the maintainer
needs to decide (standards citations, Council triggers, blast
radius, rollback). A blank issue is a longer round-trip.

## Before you start

Read these three docs first:

1. [ARCHITECTURE.md](ARCHITECTURE.md) — understand how rules /
   skills / agents / hooks compose
2. [COUNCIL.md](COUNCIL.md) — understand which division your
   contribution falls under
3. [`../rules/common/principal-level-mandate.md`](../rules/common/principal-level-mandate.md)
   — the depth bar every artifact meets

## Decide global vs project

Per
[`rule-authoring-global-vs-project.md`](../rules/common/rule-authoring-global-vs-project.md):

| Question | Answer → goes in |
| -------- | ---------------- |
| Is this guidance applicable to every codebase you work on? | Global (`rules/common/`, `skills/`, `agents/`) |
| Is this guidance tied to a specific project's stack, vendor, architecture, or domain model? | Project (`<workspace>/.claude/rules/` etc.) |
| Could it be split into a generic principle + a project-specific config? | Both — global principle + project config (canonical shape) |

When in doubt: write the principle in global, the specifics in
project.

## Adding a rule

### Step 1: Pick the location

- **Universal guidance** → `rules/common/<name>.md`
- **Language-specific extension** → `rules/<lang>/<name>.md`
- **Project-specific** → `<workspace>/.claude/rules/<name>.md`

### Step 2: Follow the rule template

Every rule carries:

````markdown
# <Rule Name>

> One-line summary. Companion to <sister rules>.

## Core Principle

**One paragraph stating the principle in bold + the why.**

## Hard rules

### 1. <Banned pattern or required pattern>

Example showing WRONG and CORRECT shapes side-by-side.

### 2. <Next pattern>

...

## Verification block

```text
<Rule name> sweep (this turn):
  - <check 1>: <result>
  - <check 2>: <result>
```

## Cross-references

- [`<sister rule>.md`](<path>) — <one-line why>
- ...

## Why this rule exists

The failure mode this rule prevents. The cost of getting it wrong
vs the cost of the rigor.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- <observable signal that the rule is weakening>
- ...

**Refinement candidates**:
- <change that would strengthen the rule>
- ...
````

### Step 3: Banned content for global rules

Per the rule-authoring rules:

- **No project / workspace / vendor names** — use abstract placeholders
  (`<workspace>`, `<project>`, `<vendor>`)
- **No per-project file paths** — `frontend/src/components/SpecificComponent.vue`
  is forbidden in global; abstract to the pattern
- **No session-specific dates** — "session 2026-05-26", "Q4 incident"
  are forbidden in global
- **No incident details that name a specific service / container /
  vendor / runtime** in a way that ties the rule to one codebase
- **No vendor brand names from a specific project's vendor list** (vs
  broadly-available tools the rule must name to give guidance)

### Step 4: Cite primary sources

Every rule that depends on external standards cites the primary
source with version + section:

- `WCAG 2.2 §1.4.3` (W3C Recommendation, Oct 2023)
- `OWASP ASVS 4.0.3 §2.1.7`
- `ISO/IEC 27001:2022 Annex A.8.7`
- `RFC 9110 §9.3.1`
- `IFRS 15 §31`
- `ITIL 4 §4.5.1`

Never Stack Overflow, never npm READMEs, never blog posts as the
sole reference. Per
[`official-docs-first.md`](../rules/common/official-docs-first.md).

### Step 5: Add the auto-load entry

If your rule should auto-load on first-touch of every repo (vs only
on matching file types), add it to
[`auto-skills.md`](../rules/common/auto-skills.md) under "Global
rules that auto-load on EVERY repo touch."

If it's language-specific, add it to the file-to-skill-and-agent
mapping section for that language.

## Adding a skill

### Step 1: Pick the cluster

Skills live under `skills/<name>/SKILL.md`. The 13 clusters are:

- code-quality
- accessibility
- security-compliance
- finance-accounting
- investment
- AI/ML
- design
- org/management
- infrastructure
- industrial
- structural engineering
- innovation
- interpersonal / research / history

Pick the cluster that best matches; if none fits, propose a new
cluster in your PR.

### Step 2: Follow the principal-level skill template

```markdown
# <Skill Name>

> Brief one-line mission statement.

## Purpose

Why this skill exists. What problem class it solves. What it does
NOT solve (negative scope is as important as positive scope).

## Standards Cited

Authoritative references with version + section:
- WCAG 2.2 §1.4.11 (W3C Recommendation, Oct 2023)
- OWASP ASVS 4.0.3 §2.2.1
- ISO/IEC 27001:2022 Annex A.8.7
- RFC 9110 §9.3.1

## When to Fire

Triggers: file globs, keywords, scope conditions, plan-tier impact.

## Core Patterns

The principal-level patterns, with concrete examples, named
trade-offs, inflection points.

## Anti-Patterns

What to reject + why + the named alternative.

## Verification Checklist

Concrete checks (not aspirational). Each check has a green/red
predicate.

## Cross-References

Sister rules, sister skills, agents that pair with this skill.

## Why This Skill Exists

The failure mode this skill prevents. The cost of getting it
wrong vs the cost of the rigor.
```

### Step 3: Quality floor

- ≥ 500 words of substantive content (target 1500-3000 for complex
  domains)
- ≥ 3 authoritative standards citations with version + section
- ≥ 5 anti-patterns with named alternatives
- ≥ 1 verification checklist with concrete checks
- ≥ 3 cross-references to sister rules / skills / agents
- Zero project-specific names / paths / vendor identifiers
- Zero "shallow stub" language ("see X for details" without details)

### Step 4: Add the file-type mapping

If your skill should auto-fire on specific file types, add a row to
[`auto-skills.md`](../rules/common/auto-skills.md) under the
relevant file-type section.

## Adding an agent

### Step 1: Frontmatter

```yaml
---
name: <kebab-case-name>
description: <one-line — what the agent does + when to use PROACTIVELY + domain ownership>
tools: [<list>]
model: opus | sonnet | haiku
---
```

Model selection per [`performance.md`](../rules/common/performance.md):

- **opus** — default for coding / reviewing / planning
- **sonnet** — narrow-scope reviewers, verification-loop
- **haiku** — mechanical doc work only

### Step 2: Required body sections

Every agent's body MUST contain:

1. **Identity + mission** — one paragraph naming the principal-level
   mandate
2. **Global rules enforced** — explicit cross-references to global
   rules the agent applies
3. **Auto-fire triggers** OR "When to engage" section — file globs /
   keywords / scope conditions
4. **Decision authority** — veto / casting vote / advisory + the
   rationale (for Division leads); for support agents, role within
   the Division
5. **Review checklist or workflow** — explicit checks with severity
   classification
6. **Standards cited** — version + section numbers, not vague
   references
7. **Output shape or severity / report template** — structured
   findings, not narrative
8. **Anti-patterns to reject** — concrete patterns with named
   alternatives
9. **Pairing model** — which other agents this works with on
   cross-cutting concerns
10. **When to escalate to user** — explicit triggers

### Step 3: Add the file-type mapping

If your agent should auto-engage on specific file types, add a row
to [`auto-skills.md`](../rules/common/auto-skills.md) under the
relevant file-type section's "Agents:" subsection.

### Step 4: Register with the Council Division

Update [COUNCIL.md](COUNCIL.md) and the relevant Division section
in [`../CLAUDE.md`](../CLAUDE.md) to list the new agent.

## Adding a workspace `.claude/`

When you're working in a new project that does not yet have its
own scaffold, the agent will surface the bootstrap prompt on first
non-trivial Council-mediated work. The scaffold lives at
`~/.claude/templates/project-claude-scaffold/` and is copied into
`<workspace>/.claude/` on confirmation.

See [PROJECT-BOOTSTRAP.md](PROJECT-BOOTSTRAP.md) for the full flow.

## Code style for contributions

- Markdown follows
  [`markdown/coding-style.md`](../rules/markdown/coding-style.md):
  MD040 fenced code language, MD031 blanks around code, MD032
  blanks around lists, MD022 blanks around headings, MD013 line-
  length only tolerated on unbreakable table rows.
- No emojis unless the user explicitly requests them — applies to
  every committed file.
- Use markdown link syntax for file references: square brackets
  around the visible text, then parentheses around the relative
  path. Never bare bullet text or backtick-only references.
- Code blocks specify a language: `​```typescript`, `​```go`,
  `​```python`, `​```bash`, etc. — never bare `​````.
- Lists use `-` (dashes), not `*`. Consistent throughout.

## Verification before submitting

Run the local verifier:

```bash
bash bootstrap/verify.sh
```

Expected output: 17/17 checks pass.

If any check fails, the contribution is NOT ready. Fix the failure
first (per
[`proper-fixes-first.md`](../rules/common/proper-fixes-first.md)
— root cause, not workaround), re-run, confirm green.

## Verification block in your PR

Every PR includes a verification block per
[`verify-before-claim.md`](../rules/common/verify-before-claim.md):

```text
Verification (this PR):
- markdownlint: 0 warnings
- bootstrap/verify.sh: 17/17 pass
- Link integrity: every cross-reference resolves
- Standards citations: <count> primary sources cited
- IDE diagnostics: 0
```

## PR review

Your PR goes through the same Council protocol it strengthens.
Specifically:

- **Division 3 (Quality)** reviews structure + naming + cross-references
- **Division 4 (Security)** reviews any security implications
- **Division 6 (Compliance)** reviews any regulatory implications
- **Division 7 (UX)** reviews wording + microcopy
- **Division 16 (Communications)** reviews the public-facing
  artifact

Reviewers will name severity per
[`done-criteria.md`](../rules/common/done-criteria.md): BLOCKER /
CRITICAL / MAJOR / MINOR / SUGGESTION. BLOCKER + CRITICAL must be
fixed before merge.

## Maintainer review required before merge

**No PR merges to `main` without explicit  review approval.**
This is a hard gate, not a courtesy.

Mechanics:

- [`.github/CODEOWNERS`](../.github/CODEOWNERS) routes every path
  to `` (default `* `) plus explicit per-path ownership
  for the Council protocol, security-sensitive rules, compliance,
  verifiers / CI, install + cross-platform, and repo governance.
  Every PR therefore needs a CODEOWNER approval — that's .
- Branch protection on `main` enforces (configured in the GitHub
  UI; see [`docs/branch-protection.md`](branch-protection.md) for
  the exact settings + `gh api` commands to audit):
  - At least one approval from a CODEOWNER (i.e., )
  - Dismiss stale pull request approvals when new commits land
  - Restrict who may dismiss pull request reviews (maintainer only)
  - Require status checks (CI, verifiers) to pass before merging
  - Require branches to be up to date before merging
  - No auto-merge bypass for any actor
  - No force-pushes to `main`
  - No deletions of `main`
- Sustained attempts to bypass the review gate (e.g., merging via
  admin override on one's own PR, force-pushing to `main`,
  creating a separate branch-protection exception) are a
  violation of [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md)
  ("Pull-request review gate") in addition to the repository's
  technical controls.

Why this matters:

- Every rule, skill, agent, hook, and verifier in this repo is
  load-bearing for downstream consumers — a quietly-merged change
  ships to every engineer who clones the config. The review gate
  is how the maintainer keeps the bar.
- The gate is symmetric: it applies to every contributor including
  the maintainer's own PRs in the rare collaboration case. Self-
  approval is not a substitute for external review on those PRs;
  the maintainer should request review from a trusted external
  reviewer (see CODE_OF_CONDUCT.md "Conflict of interest").
- Speed comes from sharp PRs (small, well-described, with the
  verification block per
  [`verify-before-claim.md`](../rules/common/verify-before-claim.md)),
  not from skipping review.

If your change is urgent and the maintainer is slower than the
[review timeline](#review-timeline), the right move is to ping the
PR with a clear `blocked on: <gate-name>` comment — never to bypass.

## Conventional Commits

Per [`semver.md`](../rules/common/semver.md), commit messages
follow Conventional Commits 1.0.0:

- `feat: <description>` — MINOR bump (new rule / skill / agent)
- `fix: <description>` — PATCH bump (correction to existing)
- `docs: <description>` — PATCH (docs-only)
- `chore: <description>` — no release
- `feat!: <description>` — MAJOR bump (breaking change to a Council protocol)

`BREAKING CHANGE:` in the commit body OR `!` after the type
triggers a MAJOR bump regardless of the type prefix.

## CHANGELOG

Per [Keep a Changelog 1.1.0](https://keepachangelog.com), every
release has a CHANGELOG entry under the appropriate section:
**Added**, **Changed**, **Deprecated**, **Removed**, **Fixed**,
**Security**.

See [`../CHANGELOG.md`](../CHANGELOG.md) for the format.

## Cross-platform discipline

People who install this repo run macOS (Apple Silicon + Intel),
Linux (Ubuntu / Debian / Arch / Fedora / RHEL), and Windows 11
(PowerShell + WSL2). Every script we ship runs on every supported
platform OR explicitly declares its scope.

| Surface | Requirement |
| --- | --- |
| `bootstrap/install.sh`, `bootstrap/verify.sh`, `tests/*.sh` | **bash 3.2 compatible** (macOS default ships bash 3.2 forever for GPL3 reasons). No `mapfile`, no `declare -A`, no `[[ -v ]]`. CI also runs them under bash 5.x on Ubuntu — both must pass. |
| `bootstrap/install.ps1` | **PowerShell 5.1 + PowerShell 7+** parse-check. Avoid PS-7-only operators when a 5.1 user might run it. |
| `.github/workflows/*.yml` ci-summary jobs | Bash 5.x is fine — runners are `ubuntu-latest`. |
| Any new shell script | Header comment declares the bash floor (`# requires: bash 3.2`) AND the `set -euo pipefail` line. |
| Any new PowerShell script | `Set-StrictMode -Version Latest` + `$ErrorActionPreference = 'Stop'` at the top. |
| POSIX tools | Use POSIX-portable features only (`awk`, `sed`, `grep`, `find`). `gsed` / `gnu-find` are macOS Homebrew variants — never assume. |
| Temp files | `mktemp -d` (POSIX) — never `tempfile` (Linux-only). |

The PR template's Cross-platform check section captures this
discipline. Don't skip it.

## Review timeline

The maintainer is one person. Realistic expectations:

| PR class | Initial review | Merge target |
| --- | --- | --- |
| Trivial (typo, doc tweak) | 3 days | 1 week |
| Standard (single-rule change, additive skill) | 1 week | 3 weeks |
| Critical (auth / compliance / Council protocol) | 1 week | 4-8 weeks (needs careful read + may bounce back twice) |
| Strategic (architecture / vendor / new surface) | 2 weeks; usually preceded by an ADR draft | open-ended |

If a PR sits without movement for > 3 weeks past the target, ping
the issue (don't open a duplicate).

## Where to ask for help

| Question | Place |
| --- | --- |
| "How do I make my change conform to the principal-level bar?" | GitHub Discussions; tag `` if blocked. |
| "Is my interpretation of `<rule>` correct?" | GitHub Discussions. |
| "I think I found a bug." | `bug_report.yml` issue template. |
| "I think I found a security issue." | [`SECURITY.md`](../SECURITY.md) (private). |
| "Can I get write access?" | Open a `feature_request.yml` issue with a track record of merged PRs. |

## Code of Conduct

This repository follows the **Contributor Covenant v2.1**. The
adoption file at the repo root is
[`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) — it carries the
scope statement, reporting paths (GitHub Security Advisories +
maintainer email), confidentiality + reporter protections, the
response timeline (72h acknowledgement / 7d triage / 30d outcome),
the four-tier enforcement ladder, and the cross-link to the
pull-request review gate above.

The companion rule [`code-of-conduct.md`](../rules/common/code-of-conduct.md)
under `rules/common/` carries the engineering-side guidance for
authoring conduct policies (template structure + reuse-first
adoption pattern + audit-logging integration).

Both are in scope; the root file is what enforcement runs from.

## License

Contributions are licensed under the repository's license. See the
[LICENSE](../LICENSE) file for details.

## Questions?

Open a [GitHub Discussion](https://github.com/Nmor/the-claude-council/discussions)
or an issue. Public-facing comms follow the discipline of
[`comms-reviewer`](../agents/comms-reviewer.md) — clear, specific,
constructive.

## See also

- [ARCHITECTURE.md](ARCHITECTURE.md) — system architecture
- [COUNCIL.md](COUNCIL.md) — Council divisions + tiebreaker matrix
- [RULES.md](RULES.md) — rules catalog
- [SKILLS.md](SKILLS.md) — skills catalog
- [AGENTS.md](AGENTS.md) — agents catalog
- [PROJECT-BOOTSTRAP.md](PROJECT-BOOTSTRAP.md) — workspace scaffold
- [`../rules/common/principal-level-mandate.md`](../rules/common/principal-level-mandate.md)
  — depth bar
- [`../rules/common/rule-authoring-global-vs-project.md`](../rules/common/rule-authoring-global-vs-project.md)
  — global vs project classification
- [`../rules/common/continuous-learning-mandate.md`](../rules/common/continuous-learning-mandate.md)
  — learning loop
- [`../CHANGELOG.md`](../CHANGELOG.md) — release history
