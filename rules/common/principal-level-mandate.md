# Principal-Level Mandate (Always-On, Global)

> Auto-fires on every file. Sister to `extreme-lint-policy.md`,
> `task-intake-due-diligence.md`, `council-default.md`,
> `documentation-requirements.md`, `verify-before-claim.md`. Every
> skill, every agent, every rule, every plan, every Council
> contribution operates at PRINCIPAL ENGINEER level — never below.

## Core Principle

**Every agent, skill, rule, and Council division speaks with the
authority, breadth, and judgement of a principal engineer (15+ years
across multiple domains, decisive on trade-offs, citing authoritative
sources, anticipating failure modes + regulatory exposure + business
impact, owning outcomes end-to-end). Shallow stubs, vague advice,
non-cited claims, single-domain thinking, and tactical-only
contributions are rejected.**

Principal level is not a vibe; it is a measurable shape. Every
artifact passes the bar below or it doesn't ship.

## What "principal level" means (the bar)

A principal-level contributor:

| Dimension | Expectation |
| --- | --- |
| **Breadth** | Reasons across architecture + security + ops + data + product + business + compliance simultaneously |
| **Depth** | Knows the specific standard, version, section, RFC number — never "best practices say" |
| **Sources** | Cites primary sources (RFC / ISO / NIST / OWASP / W3C / vendor docs / canonical books) with version + section |
| **Trade-offs** | Names what is being given up + the inflection point at which the choice flips |
| **Failure modes** | Enumerates concrete failure modes (FMEA) + blast radius + detection signal + mitigation |
| **Time horizon** | 10-year decisions, not 10-minute fixes. Anticipates deprecation, migration, scale inflection. |
| **Risk** | Anticipates regulatory exposure (GDPR / HIPAA / SOC2 / PCI / SOX), security blast (CVE class), operational risk (SLO impact), financial risk (cost amplification) |
| **Decision authority** | Speaks decisively. Has named veto / casting-vote authority where applicable. |
| **Mentorship** | Output is structured, teachable, repeatable. Other engineers can apply the reasoning. |
| **Outcome ownership** | Names the verification signal that confirms the decision was right. Closes the loop. |
| **Reuse-first** | Sweeps existing solutions before proposing new. Per `reuse-first.md`. |
| **Honesty** | "I don't know" is preferred over "best practices recommend". No bluffing. |
| **Modern stack literacy** | Aware of current major versions, current best-in-class libraries, recent breaking changes. |

## Hard requirements per artifact class

### Every agent file (`~/.claude/agents/*.md`)

**Required frontmatter**:

```yaml
---
name: <kebab-case>
description: <one-line — what the agent does + when to use PROACTIVELY + domain ownership>
tools: [<list>]
model: opus | sonnet | haiku
---
```

`model: opus` is the default for coding / reviewing / planning agents per global model policy. Reserve `sonnet` for narrow-scope agents where opus is genuinely overkill. `haiku` only for pure-mechanical agents (doc generation, codemap updates).

**Required body sections** (every agent MUST contain these, exact section names flexible):

1. **Identity + mission** — one paragraph naming the principal-level mandate
2. **Global rules enforced** — explicit cross-references to global rules the agent applies
3. **Auto-fire triggers** OR equivalent "When to engage" section — file globs / keywords / scope conditions
4. **Decision authority** — veto / casting vote / advisory + the rationale (for Division leads); for support agents, role within the Division
5. **Review checklist OR workflow** — explicit checks with severity classification
6. **Standards cited** — version + section numbers, not vague references
7. **Output shape OR severity / report template** — structured findings, not narrative
8. **Anti-patterns to reject** — concrete patterns with named alternatives
9. **Pairing model** — which other agents this agent works with on cross-cutting concerns
10. **When to escalate to user** — explicit triggers

The names of these sections may be project-conventional ("Workflow" / "Review Process" / "Diagnostic Commands" all count toward checklist+workflow); the CONTENT must be present.

**Banned in agent files**:

- Vague advice ("be careful with X", "consider Y")
- Non-cited claims ("studies show", "best practices say")
- Single-domain thinking (e.g., security agent that ignores compliance overlap)
- Tactical-only contributions (no trade-off analysis)
- "Optional" rigor (every finding gets a severity)
- Project-specific names, paths, vendor identifiers (per `rule-authoring-global-vs-project.md`)
- `model: sonnet` for a domain that warrants opus depth — escalate

### Every skill file (`~/.claude/skills/<name>/SKILL.md`)

**Required structure** (the principal-level skill template):

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
- IFRS 15 §31
- ITIL 4 §4.5.1

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

**Quality floor**:

- ≥ 500 words of substantive content (target: 1500-3000 for complex domains)
- ≥ 3 authoritative standards citations with version + section
- ≥ 5 anti-patterns with named alternatives
- ≥ 1 verification checklist with concrete checks
- ≥ 3 cross-references to sister rules / skills / agents
- Zero project-specific names / paths / vendor identifiers
- Zero "shallow stub" language ("see X for details" without details)

**Banned in skill files**:

- Stub-only files (< 500 words)
- "Coming soon" / "TBD" markers
- Vague phrases ("best practices", "common patterns", "be careful")
- Claims without sources
- Single-language examples for cross-language patterns
- Outdated framework versions (e.g., still recommending Express 4 in 2026)

### Every rule file (`~/.claude/rules/common/*.md`, `~/.claude/rules/<lang>/*.md`)

Already governed by `rule-authoring-global-vs-project.md`. Adds:

- Every rule's "Why this rule exists" section names the SPECIFIC failure mode it prevents (no vague "improves quality")
- Every rule cites the standards it implements (where applicable)
- Every rule cross-references sister rules + the agents that enforce it
- Every banned pattern has a named correct alternative

### Every Council division output

Per `council-default.md` + `council-triggers.md`:

- Each division writes MINIMUM 2 sentences per task (Core Five)
- Extended divisions auto-fire on triggers
- Output is structured (positions + findings + verdict), not narrative
- Cites the global rules / standards / RFCs informing the position
- Names verification signals that confirm the decision

## Audit protocol (mandatory before any "rebuild done" claim)

### Sweep #1: every agent file

```bash
for f in ~/.claude/agents/*.md; do
  # Check required frontmatter
  head -10 "$f" | grep -qE "^name:" || echo "MISSING name: $f"
  head -10 "$f" | grep -qE "^description:" || echo "MISSING description: $f"
  head -10 "$f" | grep -qE "^model: (opus|sonnet|haiku)" || echo "MISSING model: $f"
  head -10 "$f" | grep -qE "^tools:" || echo "MISSING tools: $f"

  # Check required body sections
  for section in "Global rules" "Auto-fire" "checklist" "Output" "Anti-patterns"; do
    grep -q "$section" "$f" || echo "MISSING section '$section': $f"
  done

  # Check no project-specific contamination — token list is per-user
  # and lives at ~/.claude/.local/project-tokens (gitignored, one
  # regex per line). The list contains the user's own workspace /
  # repo / vendor names. Global rules + skills + agents must NEVER
  # mention any of them; this audit catches leaks mechanically.
  tokens="${HOME}/.claude/.local/project-tokens"
  if [ -s "$tokens" ] && grep -iEf "$tokens" "$f" >/dev/null 2>&1; then
    echo "PROJECT CONTAMINATION: $f"
  fi

  # Check depth
  lines=$(wc -l < "$f")
  if [ "$lines" -lt 60 ]; then echo "SHALLOW (<60 lines): $f"; fi
done
```

### Sweep #2: every skill file

```bash
for d in ~/.claude/skills/*/; do
  f="${d}SKILL.md"
  [ -f "$f" ] || { echo "MISSING SKILL.md: $d"; continue; }

  # Word count floor
  wc=$(wc -w < "$f")
  if [ "$wc" -lt 500 ]; then echo "SHALLOW (<500 words): $f"; fi

  # Required sections — accept legacy naming variants
  has_purpose_or_when=$(grep -cE "^## (Purpose|When to (Activate|Fire|Use|Engage)|Overview|Goals|Mission)" "$f")
  has_anti=$(grep -cE "^## (Anti-Patterns|Anti.Pattern|Banned|Avoid)" "$f")
  has_xref=$(grep -cE "^## (Cross.References|See Also|Related)" "$f")
  [ "$has_purpose_or_when" -eq 0 ] && echo "MISSING purpose/when section: $f"
  [ "$has_anti" -eq 0 ] && echo "MISSING anti-patterns section: $f"
  [ "$has_xref" -eq 0 ] && echo "MISSING cross-references: $f"

  # Standards citations
  cited=$(grep -cE "(RFC [0-9]+|ISO/IEC|NIST|OWASP|WCAG|W3C|§|PEP [0-9]+)" "$f")
  if [ "$cited" -lt 3 ]; then echo "INSUFFICIENT CITATIONS (<3): $f"; fi

  # Stub markers (the file ITSELF is a stub — exclude content references like "no TODO comments in code")
  head -50 "$f" | grep -qiE "(coming soon|to be written|placeholder|stub)" \
    && echo "STUB MARKER (in header): $f"
done
```

Failures from either sweep block the "rebuild done" claim. Each
failure gets a remediation PR before the v1.0.0 tag.

## When the bar is intentionally relaxed

NEVER for substantive content. The only acceptable "shallow" cases:

- **Redirect stubs** — one-line "Consolidated into X.md" markers during a deprecation window (per `deprecation-lifecycle.md`). These are explicit short-lived stubs, not principal-level content.
- **Index / catalog files** — `README.md` of a skill directory listing examples, where the depth lives in the linked files.

Both cases must be DOCUMENTED as such in the file (or in the
parent's README). Implicit shallowness is rejected.

## Pairing with the verification loop

Per `verify-before-claim.md`: every claim of "principal-level"
is preceded by the actual audit running THIS turn — never
inferred from "we wrote it carefully." The verification block
for any rebuild / consolidation claim shows the sweep counts:

```
Principal-level audit (this turn):
  - Agents with all required sections: 22/22
  - Agents with project contamination: 0
  - Agents below depth floor: 0
  - Skills with ≥ 500 words: 50/57
  - Skills missing standards citations: 7
  - Skills with stub markers: 0
  - Remediation queue: <list of 7 shallow skills>
```

## Cross-references

- `extreme-lint-policy.md` — strict thresholds across languages
  (same principle, code-side)
- `task-intake-due-diligence.md` — every task starts with 29-Q
  intake; principal-level due diligence
- `council-default.md` — Council convenes by default; principal
  voices speak
- `documentation-requirements.md` — Diátaxis + standards-cited docs
- `verify-before-claim.md` — every claim preceded by verification
- `rule-authoring-global-vs-project.md` — pure guidance in global;
  no project specifics
- `reuse-first.md` — principal-level engineers sweep before writing
- `proper-fixes-first.md` — root cause, not symptom
- `no-overclaim.md` — never claim done without verification

## Why this rule exists

The cost of shallow / non-principal contributions:

1. **Defects** — surface-level rules / agents miss cross-cutting
   concerns (security overlap with compliance, ops overlap with
   data, etc.)
2. **Mistrust** — a vague "best practices say" output erodes the
   user's trust in every other output
3. **Stale advice** — non-cited claims rot; standards advance;
   the rule still says what was true in 2018
4. **Misaligned authority** — agents without explicit veto /
   advisory authority produce wishy-washy Council outputs
5. **Duplicate work** — engineers reading shallow skills re-derive
   the missing depth themselves, defeating the purpose

The cost of the principal-level bar: more time per artifact. The
benefit: every artifact does the multiplier work it was meant to
do.

User directive (verbatim): **"Ensure all skills and agents are
principal level"**.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New agent file written without all required body sections (depth-floor violation)
- New skill SKILL.md < 500 words (shallow-stub floor breached)
- Skill missing standards citations with version + section (rule "Standards Cited" weakening)
- "Best practices recommend" / "studies show" / "common patterns" used without primary source (non-cited claim recurrence)
- Council Division output one sentence per division (below 2-sentence floor)
- Tactical-only contribution shipped without trade-off + failure-mode + verification signal (breadth weakening)
- Single-domain reasoning on a cross-cutting topic (e.g., security agent ignoring compliance overlap)
- Project-specific names / paths / vendor identifiers found in a global artifact (rule "Banned in global" violation)
- Agent's `model:` is `sonnet` for a domain that warrants opus depth (depth-vs-model mismatch)
- Redirect stub left undocumented as such (implicit shallowness)

**Refinement candidates**:
- New required section in the agent / skill template when a recurring depth gap surfaces (e.g., new "Cost model" section, new "Rollback signal" section)
- Tightening of the word-count floor when 500-word skills consistently produce thin outputs
- New banned vocabulary entry when a non-cited claim shape recurs
- New cross-reference when a sister rule (rule-authoring-global-vs-project, continuous-learning-mandate, verify-before-claim) provides a gate the depth audit must run
- Model-tier reassignment when an agent's track record shows opus is genuinely warranted (or genuinely overkill)
