---
name: skill-create
description: Author a new Claude skill end-to-end — from git-history pattern extraction (local mode) through principal-level SKILL.md authoring (Progressive Disclosure + bundled-resources layout + description-optimisation + eval-harness). Sister to `~/.claude/rules/common/principal-level-mandate.md`, `~/.claude/rules-library/common/reuse-first.md`, `~/.claude/rules-library/common/extreme-lint-policy.md`.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob", "WebFetch"]
---

# /skill-create — Skill Authoring (Local Pattern Extraction + Principal-Level Authoring)

Build a new Claude skill that meets the global `principal-level-mandate.md` bar. Two modes:

| Mode        | Input                                | Output                                                                                                                                |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Extract** | Local git history of a project       | A `<project>/.claude/skills/<repo>-patterns/SKILL.md` capturing the team's conventions                                                |
| **Author**  | A target capability + open questions | A `~/.claude/skills/<name>/` directory with principal-level SKILL.md + optional `scripts/` + `references/` + `assets/` + eval harness |

Both modes ship a skill that passes the depth audit (≥ 500 words substantive content, ≥ 3 standards citations with version + section, ≥ 5 anti-patterns, ≥ 1 verification checklist, ≥ 3 cross-references, zero project-specific contamination in global skills, Learning hooks section present).

## When to use

- A recurring task pattern emerges in 2+ sessions and warrants a named, auto-discoverable skill (per `reuse-first.md` rule of three).
- Anthropic ships a new capability (memory, citations, batch, files API, etc.) that Claude Code projects should adopt with documented patterns.
- Domain expertise (compliance class, framework idiom, vendor integration) needs a written canonical answer the assistant loads on demand.
- A team is onboarding to a codebase whose conventions are non-obvious — extract-mode captures them from git.

## When NOT to use

- The pattern only appears once. Per `reuse-first.md`, implement inline; defer extraction until the second occurrence.
- The capability is already covered by an existing skill (run a sweep first: `ls ~/.claude/skills/`).
- The "skill" would just be a list of links — that's a doc page, not a skill (per `documentation-requirements.md` Diátaxis quadrants).
- The scope is project-specific. Per `rule-authoring-global-vs-project.md`, project skills land at `<workspace>/.claude/skills/`, not global.

## Standards cited

- **Anthropic Agent Skills v1.0** (Dec 2025 open standard) — SKILL.md frontmatter + Progressive Disclosure semantics
- **CommonMark 0.31.2** — SKILL.md body format
- **JSON Schema Draft 2020-12** — frontmatter schema validation
- **Diátaxis framework** (Procida) — `references/` content is reference + how-to, not tutorial
- `~/.claude/rules/common/principal-level-mandate.md` §"Every skill file" — the depth contract
- `~/.claude/rules-library/common/reuse-first.md` rule of three — extraction trigger
- `~/.claude/rules/common/continuous-learning-mandate.md` rule 6 — every artifact carries `Learning hooks`
- `~/.claude/rules/common/rule-authoring-global-vs-project.md` — global-vs-project classification
- `~/.claude/rules-library/common/no-discards.md` — no suppressions, no banned vocabulary in the new skill

## Mode selection

```bash
/skill-create                              # interactive — ask which mode
/skill-create --mode=extract               # local git-history pattern extraction
/skill-create --mode=extract --commits 100 # extract from last 100 commits
/skill-create --mode=author <name>         # author a new skill from scratch
/skill-create --mode=author <name> --eval  # author + scaffold eval harness
/skill-create --output <dir>               # custom output directory
/skill-create --instincts                  # also emit instincts for continuous-learning-v2
```

If no `--mode` is supplied, the command:

1. Detects whether the cwd is inside a git repo.
2. If yes AND `.git/` has > 10 commits, offers extract-mode.
3. Otherwise, defaults to author-mode and asks for the skill name.

## Extract mode (git-history pattern extractor)

Captures the project's conventions from its commit history. Output lives in `<project>/.claude/skills/<repo>-patterns/SKILL.md` (per `project-scoped-artifacts.md` — project-specific skills are workspace-side, never global).

### Step 1: gather

```bash
# Recent commits + file changes
git log --oneline -n ${COMMITS:-200} --name-only \
  --pretty=format:"%H|%s|%ad" --date=short

# File co-change frequency
git log --oneline -n 200 --name-only \
  | grep -v "^$" | grep -v "^[a-f0-9]" \
  | sort | uniq -c | sort -rn | head -20

# Commit message patterns
git log --oneline -n 200 | cut -d' ' -f2- | head -50
```

### Step 2: detect patterns

| Pattern class       | Detection signal                                                                       |
| ------------------- | -------------------------------------------------------------------------------------- |
| Commit conventions  | Regex on commit messages (`feat:`, `fix:`, `chore:`, conventional commits prefix rate) |
| File co-changes     | Files that always change together (top-N pairs by frequency)                           |
| Workflow sequences  | Repeated file-change orderings (e.g. migration → model → handler → test)               |
| Architecture        | Folder structure + naming conventions inferred from tree                               |
| Testing patterns    | Test file locations + naming + co-change ratio with source files                       |
| Build / CI patterns | `.github/workflows/`, `Makefile`, `package.json` scripts                               |

### Step 3: emit the workspace skill

Output frontmatter follows the same shape as authored skills (see Author mode below). Body sections are populated from the detected patterns. The skill is workspace-scoped — keep project-specific names, vendor lists, file paths in the body where they belong.

### Step 4 (optional `--instincts`): emit instincts

For `continuous-learning-v2`, each detected pattern can also be written as an instinct:

```yaml
---
id: {repo}-commit-convention
trigger: "when writing a commit message in this repo"
confidence: 0.8
domain: git
source: local-repo-analysis
---
```

## Author mode (principal-level skill authoring)

This is the load-bearing mode. Produces a skill that meets the depth contract.

### Phase 1 — Plan + interview

Before writing anything, gather the inputs the depth contract requires:

| Field                              | Source                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Skill name (kebab-case)            | User                                                                                                                          |
| One-line description (frontmatter) | User → refined via the description-optimisation workflow below                                                                |
| Trigger conditions                 | User + sweep of `~/.claude/rules-library/common/auto-skills.md` for adjacent triggers                                                 |
| Standards citations                | Online research (mandatory per `official-docs-first.md`) — RFCs, ISO, OWASP, NIST, vendor primary docs with version + section |
| Anti-patterns                      | User + sweep of related Council retrospectives in `~/.claude/audits/learning-events.jsonl`                                    |
| Cross-references                   | Sister rules / skills / agents already loaded — at least 3                                                                    |
| Bundled resources needed           | Decide: scripts? references? assets?                                                                                          |

If the user can't answer all of these, the command pauses with a numbered list of open questions (per `prompt-improver` skill's Phase 2 pattern). Do NOT proceed to write SKILL.md with unknowns.

### Phase 2 — Progressive Disclosure layout

Anthropic Agent Skills v1.0 uses a 3-level loading model. The command scaffolds the directory accordingly:

```text
~/.claude/skills/<name>/
├── SKILL.md                # Level 2: full body, < 500 lines, loaded when triggered
├── scripts/                # Level 3: executable helpers, loaded on-demand
│   └── <helper>.{sh,py,ts} # Optional — only when the skill genuinely runs commands
├── references/             # Level 3: long-form docs, loaded on-demand
│   └── <topic>.md          # Optional — encyclopedic content that would bloat SKILL.md
├── assets/                 # Level 3: templates / fonts / icons / fixtures
│   └── <asset>             # Optional — non-text resources the skill ships
└── evals/                  # Optional: eval harness (when --eval)
    ├── evals.json
    ├── eval_metadata.json
    ├── grading.json
    └── benchmark.json
```

Loading semantics (the skill author MUST respect these):

| Level                    | Always-loaded?    | Content shape                                                                                                               | Max size                                            |
| ------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **L1 metadata**          | YES (always)      | Frontmatter `name` + `description` only                                                                                     | ~100 words                                          |
| **L2 SKILL.md body**     | When triggered    | Full skill body — Purpose / When to use / Standards / Patterns / Anti-patterns / Verification / Cross-refs / Learning hooks | < 500 lines (target 200-400)                        |
| **L3 bundled resources** | On explicit fetch | `scripts/` + `references/` + `assets/` — content the agent reads only when the task demands it                              | No global cap; per-file < 2000 lines as a guideline |

**Hard rule**: don't dump everything into SKILL.md. If the content is "the agent reads this when it actually does the task" (a long anti-pattern list, a regulation cross-reference, a code-style example library), it belongs in `references/<topic>.md` linked from SKILL.md. The SKILL.md body stays under 500 lines.

### Phase 3 — Description optimisation workflow

The `description:` frontmatter field is what the Claude harness routes against. A vague description = the skill doesn't fire when it should (false negative) or fires when it shouldn't (false positive). The optimisation loop:

#### Step 3.1: write 20 trigger-test prompts

Split:

- **10 should-trigger**: prompts where this skill is the right one to fire
- **10 should-not-trigger**: adjacent prompts that look similar but belong to a different skill (or no skill)

Write these BEFORE the description. The test set is the spec.

Example for an authored `payment-processing-patterns` skill:

```text
SHOULD TRIGGER:
1. "How do I make this Stripe checkout idempotent?"
2. "Wire 3DS2 into our payment flow"
3. "Why is my Adyen webhook signature failing?"
...

SHOULD NOT TRIGGER:
1. "How do I integrate Plaid for bank linking?"           # → fintech, not payments
2. "Our Stripe billing portal is broken"                  # → billing UI, not payment-processing
3. "Add a price column to the products table"             # → schema, not payments
...
```

#### Step 3.2: draft the description

Aim for ~30-60 words. Cover:

- **What** the skill does (verb + object)
- **When** to fire (concrete signals)
- **Sister rules / skills** it integrates with
- **What it does NOT cover** (negative scope shapes the routing decision)

#### Step 3.3: automated trigger evaluation

For each of the 20 prompts, run a fast headless Claude (`claude -p <prompt> --output-format=json`) with the candidate `description` injected and inspect whether the skill would fire. Record:

| Prompt      | Expected           | Actual         | Pass?               |
| ----------- | ------------------ | -------------- | ------------------- |
| `prompt 1`  | should-trigger     | should-trigger | ✅                  |
| `prompt 11` | should-not-trigger | should-trigger | ❌ (false positive) |

Target: ≥ 18/20 correct. Iterate the description until it converges.

#### Step 3.4: record the trigger-test set in evals/

Once the description converges, commit the 20 prompts to `~/.claude/skills/<name>/evals/triggers.json` so future descriptive tweaks can re-run the same test bed.

### Phase 4 — Eval harness (when --eval)

For skills that materially change agent behaviour (pattern guides, integration playbooks, compliance frameworks), scaffold a full eval harness. Layout:

```text
evals/
├── evals.json              # the test cases (input + expected behaviour)
├── eval_metadata.json      # version + skill-revision + test-bed-id
├── grading.json            # rubric: what counts as pass / partial / fail
├── benchmark.json          # baseline + with-skill comparison results
└── viewer/                 # optional: generate_review.py + index.html
```

#### Iteration discipline

For each candidate revision of the skill:

1. Spawn N **with-skill** subagents in parallel — each runs one `evals.json` case with the new SKILL.md content loaded.
2. Spawn the same N **baseline** subagents in parallel — same cases, no skill loaded.
3. Capture per-case: latency, tool-call count, output, pass/partial/fail per the rubric.
4. Aggregate into `benchmark.json`.
5. Run an analyst pass (a separate agent with the rubric + both result sets) to surface the deltas.
6. Present the diff for user review before promoting the new revision.

The harness is overkill for a small skill. Skip `--eval` when the skill is a thin reference card. Use it when the skill is asked to change downstream agent behaviour materially.

### Phase 5 — Principle of Lack of Surprise

The skill's behaviour MUST match its description. Banned patterns:

- A skill described as "patterns for X" that smuggles a tool call (e.g., runs `git push`) — the description promises content, not action.
- A skill described as "evaluate Y" that auto-applies the fix — evaluation is read-only.
- A skill that mutates user files when the description claims advisory scope.
- A skill that exfiltrates context (writes to `/tmp` or external URLs) without saying so.

This rule sits adjacent to security: the agent's downstream caller decides to load this skill based on the description. The skill cannot exceed that scope quietly. If real action is needed, name it explicitly in the description ("Builds X and runs the build; modifies files under `<path>`").

## SKILL.md template (canonical body shape)

```markdown
---
name: <kebab-case>
description: <30-60 words, optimised per Phase 3 above; names triggers + sister rules + negative scope>
---

# <Skill Name>

> Brief one-line mission statement.

## Purpose

Why this skill exists. What problem class it solves. What it does NOT solve (negative scope).

## When to use

Triggers: file globs, keywords, scope conditions, plan-tier impact.

## When NOT to use

Adjacent cases that route to a different skill (or no skill). Cross-references to the right destination.

## Standards cited

- <Standard> v<version> §<section> — <one-line purpose>
- <Standard> v<version> §<section> — <one-line purpose>
- <Standard> v<version> §<section> — <one-line purpose>

(≥ 3 required per the depth contract; primary sources only — no Stack Overflow / blog posts as the sole reference)

## Core patterns

<The principal-level patterns, with concrete examples, named trade-offs, inflection points.>

## Anti-patterns

| Anti-pattern | Why it's wrong | Named alternative |
| ------------ | -------------- | ----------------- |
| <pattern 1>  | <reason>       | <fix>             |
| <pattern 2>  | <reason>       | <fix>             |
| <pattern 3>  | <reason>       | <fix>             |
| <pattern 4>  | <reason>       | <fix>             |
| <pattern 5>  | <reason>       | <fix>             |

(≥ 5 required per the depth contract)

## Verification checklist

Concrete green/red predicates (not aspirational).

## Cross-references

- Sister rule: `~/.claude/rules/common/<rule>.md`
- Sister skill: `~/.claude/skills/<other-skill>/SKILL.md`
- Agent that pairs: `~/.claude/agents/<agent>.md`

(≥ 3 required per the depth contract)

## Why this skill exists

The failure mode this skill prevents. The cost of getting it wrong vs the cost of the rigour.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- <signal 1>
- <signal 2>
  ...

**Refinement candidates**:

- <candidate 1>
- <candidate 2>
  ...
```

## Post-write verification (mandatory before reporting done)

Run all of the following on the new skill's SKILL.md:

```bash
# 1. Word count floor
wc=$(wc -w < ~/.claude/skills/<name>/SKILL.md)
[ "$wc" -ge 500 ] || echo "FAIL: < 500 words"

# 2. Standards citations present
cited=$(grep -cE "(RFC [0-9]+|ISO/IEC|NIST|OWASP|WCAG|W3C|§|PEP [0-9]+|CommonMark)" \
  ~/.claude/skills/<name>/SKILL.md)
[ "$cited" -ge 3 ] || echo "FAIL: < 3 citations"

# 3. Required sections present (accept naming variants)
for re in "^## (Purpose|When to)" "^## Anti.Pattern" "^## (Cross.References|See Also|Related)" "^## Learning hooks"; do
    grep -qE "$re" ~/.claude/skills/<name>/SKILL.md \
        || echo "FAIL: missing section matching $re"
done

# 4. No project-specific contamination (global skills only)
# Token list lives at ~/.claude/.local/project-tokens (gitignored,
# one regex per line — user maintains it with their own workspace /
# repo / vendor names). Global skills must mention none of them.
tokens="${HOME}/.claude/.local/project-tokens"
if [ -s "$tokens" ] && grep -iEf "$tokens" ~/.claude/skills/<name>/SKILL.md >/dev/null 2>&1; then
    echo "FAIL: project contamination"
fi

# 5. No banned vocabulary (per coding-style.md)
grep -iE "(legacy|byte-identical|preserved|monolith|TODO:|FIXME:|XXX:)" \
    ~/.claude/skills/<name>/SKILL.md \
    && echo "FAIL: banned comment vocabulary"

# 6. Markdown lint clean
markdownlint-cli2 ~/.claude/skills/<name>/SKILL.md

# 7. Frontmatter valid (name + description present)
head -10 ~/.claude/skills/<name>/SKILL.md | grep -qE "^name:" \
    || echo "FAIL: missing name"
head -10 ~/.claude/skills/<name>/SKILL.md | grep -qE "^description:" \
    || echo "FAIL: missing description"
```

A `FAIL` in any check blocks the "skill authored" claim. Fix and re-run.

## Anti-patterns when authoring skills

| Anti-pattern                                        | Why it fails                                                     | Correct shape                                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Stub-only SKILL.md (< 500 words)                    | Caller can't act on it; pollutes the skill index                 | Expand to the depth floor or fold into an existing skill                            |
| Description is a slogan                             | Doesn't disambiguate from adjacent skills; routing breaks        | Description names triggers + sister skills + negative scope                         |
| Author-mode "skill" that just lists links           | That's a doc page, not a skill                                   | Use `documentation-requirements.md` Diátaxis instead                                |
| Standards citations without version + section       | Drifts as the standard evolves; cannot be re-verified            | Cite `WCAG 2.2 §1.4.11`, not "WCAG accessibility"                                   |
| Anti-patterns table without named alternative       | Tells the agent to avoid X but not what to do instead            | Every anti-pattern row carries its fix                                              |
| SKILL.md > 500 lines                                | Breaks Progressive Disclosure L2 budget; bloats every load       | Move encyclopedic content to `references/<topic>.md`                                |
| Bundled scripts that ship without `--help`          | Forces the agent to read source — context-window cost            | Every script supports `--help`, treated as black-box                                |
| Project-specific names in a global skill            | Pollutes the global guidance surface                             | Relocate to `<workspace>/.claude/skills/` per `rule-authoring-global-vs-project.md` |
| Skill that runs side effects not in the description | Violates "Principle of Lack of Surprise" — caller didn't consent | Either restrict to advisory + read-only, or name the action in the description      |
| No `Learning hooks` section                         | Violates `continuous-learning-mandate.md` rule 6                 | Add signals-to-watch + refinement-candidates before completion                      |

## Cross-references

- `~/.claude/rules/common/principal-level-mandate.md` — the depth contract this command enforces
- `~/.claude/rules-library/common/reuse-first.md` — the rule-of-three extraction trigger
- `~/.claude/rules/common/continuous-learning-mandate.md` — Learning hooks section is mandatory
- `~/.claude/rules/common/rule-authoring-global-vs-project.md` — global-vs-project classification
- `~/.claude/rules/common/project-scoped-artifacts.md` — workspace-side skill storage
- `~/.claude/rules-library/common/auto-skills.md` — file-to-skill mapping the new skill must register with
- `~/.claude/rules-library/common/extreme-lint-policy.md` — markdownlint thresholds the SKILL.md must pass
- `~/.claude/rules-library/common/no-discards.md` — banned vocabulary the SKILL.md cannot contain
- `~/.claude/rules-library/common/documentation-requirements.md` — Diátaxis distinction (skill vs doc page)
- `~/.claude/rules/common/official-docs-first.md` — primary-source research before authoring
- `~/.claude/skills/mcp-builder/SKILL.md` — sister skill for building MCP servers (skill-level adjacency)
- `~/.claude/skills/continuous-learning-v2/SKILL.md` — sister skill that consumes the optional `--instincts` output
- `/instinct-import` / `/instinct-status` / `/evolve` — operator interface for the learning loop
- `/learn-eval` — self-evaluates an authored skill's quality before save

## Related commands

- `/instinct-import` — Import generated instincts into the learning loop
- `/instinct-status` — View learned instincts + their confidence levels
- `/evolve` — Cluster instincts into skills / commands / agents
- `/learn` — Manual review of pending learning candidates
- `/learn-eval` — Self-evaluate skill quality + classify global vs project location

## Why this command exists

Without a single, opinionated authoring path, skills accumulate in three failure modes:

1. **Shallow stubs** — author writes a few paragraphs, never returns; the skill doesn't pull weight when triggered.
2. **Wrong location** — global skill contains project-specific vendor names; project skill duplicates a global one.
3. **Mis-routed triggers** — `description` is vague; the skill fires on the wrong prompts or doesn't fire when it should.

This command makes each of those mechanical:

- The depth contract is checked at write time (verification block).
- Progressive Disclosure forces splitting encyclopedic content into `references/`.
- The description-optimisation workflow is a 20-prompt eval against the test set.
- The Principle of Lack of Surprise gates side-effecting behaviour.
- The Learning hooks section pulls every new skill into the continuous-learning loop.

User directive (verbatim): **"Ensure all skills and agents are principal level"**.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New skill authored without running the description-optimisation 20-prompt eval (Phase 3 weakening — routing risk)
- SKILL.md > 500 lines without `references/` split (Progressive Disclosure L2 budget breached)
- Bundled script ships without `--help` flag (black-box helper rule weakening)
- Skill carries side effects not named in its description (Principle of Lack of Surprise violation)
- Author-mode invoked but post-write verification block skipped
- Project-specific name introduced into a global skill (sister `rule-authoring-global-vs-project.md` weakening)
- Standards citation without version + section (depth-audit rule 4 violation)
- Extract-mode used to produce a "skill" with < 3 detected patterns (insufficient signal — should be inline note instead)
- Stub language ("coming soon", "TBD", "placeholder") shipped in a new SKILL.md
- `Learning hooks` section omitted from a newly-authored skill (rule violation per `continuous-learning-mandate.md` rule 6)
- Description recycles vocabulary that already routes to a different skill (false-positive trigger)
- New skill duplicates an existing one (sister `reuse-first.md` weakening — sweep was skipped)

**Refinement candidates**:

- New row in the verification block when a depth-floor pattern recurs across audits
- Tightening of the description word-count band (currently ~30-60 words) when routing accuracy data suggests a different sweet spot
- New cross-reference when a sister command (`/learn-eval`, `/evolve`) gains a load-bearing role in the authoring pipeline
- New bundled-resource template (`scripts/`, `references/`, `assets/`) when a recurring skill shape needs a starter scaffold
- Promotion of the 20-prompt trigger-test set from optional to mandatory when description-routing errors recur
- New Mode entry when a recurring authoring shape (e.g., compliance-framework, vendor-integration, regulation-tracker) deserves its own scaffold
