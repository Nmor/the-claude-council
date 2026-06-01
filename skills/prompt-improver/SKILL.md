---
name: prompt-improver
description: Transforms vague or under-specified prompts into actionable, research-grounded requests through systematic codebase + workspace + open-source + online research. Wires the user's directive flow into the Council Protocol Phase 0 and the global task-intake-due-diligence.md questionnaire. Invoked by the UserPromptSubmit hook when a prompt lacks specificity OR when a clear-but-significant prompt needs the full intake before execution.
---

# Prompt Improver Skill

> Sister to: `~/.claude/rules/common/task-intake-due-diligence.md`
> (the 29-question intake), `~/.claude/rules/common/reuse-first.md`
> (Q1 sweep), `~/.claude/rules/common/official-docs-first.md` (Q3
> + Q29), the Council Protocol Phase 0 in `~/.claude/CLAUDE.md`,
> `~/.claude/rules/common/plan-task-breakdown.md` (Q27 output),
> `~/.claude/rules/common/plan-execution-progress.md` (intake is
> the first progress update). The hook lives at
> `~/.claude/hooks/improve-prompt.py`.

## Purpose

Two responsibilities:

1. **Clarification** — when a prompt is vague (missing target,
   missing context, missing success criteria), research the
   project + ecosystem first, then ask 1-6 grounded questions to
   close the gap.

2. **Intake** — when a prompt is CLEAR but non-trivial (any
   feature, refactor, integration, plan), run the
   `task-intake-due-diligence.md` questionnaire to surface
   prior art, OSS alternatives, scalability, integration shape,
   and the cross-cutting concerns BEFORE any code is touched.

Both responsibilities run BEFORE the Council convenes. The
output of this skill is the substrate Council Phase 0 reads.

## When this skill activates

The UserPromptSubmit hook (`~/.claude/hooks/improve-prompt.py`)
evaluates every incoming prompt and routes it:

| Prompt shape | Routing |
| --- | --- |
| `*` prefix | Hook strips `*` and bypasses this skill (user opt-out) |
| `/` prefix (slash command) | Passes through unchanged |
| `#` prefix (memorize) | Passes through unchanged |
| Vague (no target, no action, no success criteria) | THIS SKILL: Clarification mode (research → 1-6 questions) |
| Clear + trivial (typo, single-line edit, config tweak) | Hook passes through; abbreviated intake (Q1 + Q2 + Q27 only) |
| Clear + non-trivial (feature, refactor, integration, plan) | THIS SKILL: Intake mode (full 29-question questionnaire) |

The hook trusts user intent by default. When in doubt, it
errs toward "let the skill ask" rather than "guess."

## Mode 1: Clarification (the prompt is vague)

A vague prompt is one where ANY of these is missing:

- **Target**: which file / module / feature / bug / area
- **Action**: what to do (fix / build / refactor / investigate /
  document)
- **Success criteria**: how the user will know the work is done

Examples of vague prompts that need clarification:

- "fix the bug"
- "make it faster"
- "add tests"
- "clean up that thing"
- "look at this"

### Phase 1 (Clarification): Research

Before asking any question, do the research. Skipping research
produces generic options that don't help the user — the goal is
options grounded in actual codebase + workspace + ecosystem
findings.

Research radius (in order — exhaust each before reaching the
next, per `reuse-first.md` rule 7):

1. **Conversation history** — what was just discussed; what
   the user was working on; what errors / files were mentioned.
2. **Codebase sweep** — `grep` / `glob` / Explore agent for
   the concept. Check `components/`, `lib/`, `services/`,
   `pkg/`, `utils/` per language.
3. **Workspace `.claude/` rules + memory** — project-specific
   conventions that frame the answer.
4. **Recent git history** — `git log --since="1 month ago"` +
   `git status` for current state.
5. **Failing tests / lint warnings / IDE diagnostics** — the
   bug being asked about may already be visible.
6. **`docs/`, `README`, `CHANGELOG`, runbook** — what the
   project already says about itself.
7. **Open-source + online** — when ambiguity persists, search
   GitHub / package registries / RFCs / vendor docs.

Document findings briefly. Each finding maps to an option in
the next phase.

### Phase 2 (Clarification): Generate questions

Based on research, formulate 1-6 questions. Each question:

- **Grounded** — every option comes from a research finding,
  not from imagination.
- **Specific** — "Login auth failure in `auth.py:145`" beats
  "an authentication issue."
- **Multiple-choice** — 2-4 concrete options per question;
  AskUserQuestion auto-adds "Other."
- **Focused** — one decision point per question; never
  combine "which file?" with "which approach?" in one question.
- **Trade-off-aware** — options carry brief descriptions of
  consequences.

Question count:

- **1-2 questions** — simple ambiguity (which file, which
  approach)
- **3-4 questions** — moderate complexity (scope + approach
  + validation)
- **5-6 questions** — complex (major feature with multiple
  decision points)

If research is sufficient to infer the user's intent with high
confidence, skip questions and proceed directly. Trust user
intent.

### Phase 3 (Clarification): Ask via AskUserQuestion

Present the questions using `AskUserQuestion`:

```yaml
- question: "Which bug are you referring to?"
  header: "Bug target"  # max 12 chars
  multiSelect: false
  options:
    - label: "Login auth failure"
      description: "auth.py:145 swallows exceptions; tests failing in test_auth.py"
    - label: "Session timeout"
      description: "session.py:89 has hardcoded 30s timeout; users report logouts"
    - label: "Other (specify)"
      description: "Different issue I'll describe"
```

For options requiring side-by-side comparison (UI mockups,
code snippets, diagram variations), add a `preview` field per
option (rendered as monospace block — single-select only).

### Phase 4 (Clarification): Execute

After the user answers, proceed with:

- The original intent
- The clarification answers
- The research findings
- The conversation history

If the clarified prompt is now non-trivial (feature, refactor,
integration), CHAIN into Mode 2 (Intake) before any code.

## Mode 2: Intake (the prompt is clear but non-trivial)

When the prompt is unambiguous AND the work is non-trivial,
this skill runs the full `task-intake-due-diligence.md` Q1-Q29
questionnaire BEFORE any implementation discussion. The output
populates Council Protocol Phase 0.

### Phase 1 (Intake): Codebase + workspace research

Same as Clarification Phase 1, with broader scope. The intake
answers Q1 ("Has it been done before? — in this codebase / in
sister workspaces") via this research.

### Phase 2 (Intake): External research

For Q3 (canonical reference), Q4 (OSS option), Q5 (SOTA scan),
Q24 (AI/ML ethics when applicable), Q25 (vendor/IP/license),
do online research:

- **WebSearch** for SOTA scans, recent papers, RFC drafts.
- **WebFetch** for primary-source vendor docs (per
  `official-docs-first.md`).
- **GitHub search** for prior implementations.
- **Package registries** (npm, PyPI, crates.io, Maven Central,
  RubyGems, Go pkg) for OSS candidates.
- **Standards bodies** (W3C, IETF, ISO, NIST, OWASP) for
  authoritative specs.

Document each consulted source in the intake's Q29 table
(URL + read date + key finding).

### Phase 3 (Intake): Fill the questionnaire

Walk Q1-Q28 from `task-intake-due-diligence.md`. For each
question, produce a short answer with the relevant findings.
For questions that are N/A for this task, mark explicitly and
state why in one line.

The output is the intake block — a table or per-question
section that becomes Phase 0 of the Council discussion (or
the Context section of a plan file under
`~/.claude/plans/<slug>.md` or `<project>/.claude/plans/`).

### Phase 4 (Intake): Propose plan or chain to Council

After the intake:

- **Small task** (atomic, ≤ 4h work): proceed to
  implementation with the intake as Council Phase 0.
- **Medium task** (multi-file, 4-40h): create or update a
  plan file per `plan-task-breakdown.md` (long list of small
  atomic tasks) and run Council Phase 0-2.
- **Large task** (multi-phase, 40+ h): create a multi-phase
  plan file and route through ExitPlanMode for user approval
  before any code.

## Anti-patterns (what NOT to do)

### Anti-pattern 1: Generic options

Wrong:

```
Q: Which approach do you want?
- Approach A
- Approach B
- Other
```

Right:

```
Q: How should `getUserById` handle missing users?
- Return `null` (matches existing `getOrgById` shape at lib/org.ts:42)
- Throw `NotFoundError` (matches new error policy in PR #142)
- Return `Result<User, UserNotFoundError>` (matches `lib/auth.ts` pattern)
```

### Anti-pattern 2: Asking for information the codebase already has

Wrong: "What test framework should I use?" when `package.json`
already declares `vitest`.

Right: research first; only ask when the codebase is silent or
when multiple options coexist.

### Anti-pattern 3: Re-asking what the user already said

Wrong: re-prompting for context the user already provided in
the same prompt or in conversation history.

Right: check conversation history BEFORE generating questions;
treat what the user already wrote as definitive.

### Anti-pattern 4: Skipping the intake on "clear" prompts

Wrong: "the prompt is clear, no need for intake" → start coding
a new feature without checking prior art / OSS / scalability.

Right: clarity ≠ non-trivial. Clear + non-trivial still
requires the full intake (Mode 2).

### Anti-pattern 5: Too many questions

Wrong: 8 questions for a small ambiguity → user fatigue.

Right: cap at 6; if more decisions are needed, ship the
clarification in stages OR convert to ExitPlanMode for
structured plan review.

### Anti-pattern 6: Options the research doesn't support

Wrong: inventing options to fill out the AskUserQuestion's
2-4 option requirement.

Right: when research surfaces only one or two real options,
ask with 2-3 options + "Other" rather than fabricate. If
research surfaces zero options, the question is wrong —
re-research.

### Anti-pattern 7: Bypassing the intake because the user seems impatient

Wrong: user says "just do it" → skip intake → ship something
that duplicates an existing primitive / misses scalability.

Right: even under time pressure, run the abbreviated intake
(Q1 + Q2 + Q27) and surface findings in the response. The
user can override; the agent never silently skips.

## Cross-references

- `~/.claude/rules/common/task-intake-due-diligence.md` — the
  29-question questionnaire this skill drives
- `~/.claude/rules/common/reuse-first.md` — Q1 sweep
- `~/.claude/rules/common/official-docs-first.md` — Q3 + Q29
  primary-source citations
- `~/.claude/rules/common/plan-task-breakdown.md` — Q27 action
  plan format
- `~/.claude/rules/common/plan-execution-progress.md` — the
  intake is the first progress update
- `~/.claude/rules/common/no-overclaim.md` — never claim the
  prompt is "clear" without verification
- `~/.claude/CLAUDE.md` Council Protocol Phase 0 — the
  canonical home for the intake output
- `references/research-strategies.md` — deeper research
  patterns
- `references/question-patterns.md` — question templates
- `references/examples.md` — comprehensive examples

## Output expectation

After this skill runs (in either mode), the assistant's response
to the user includes:

1. **If Clarification mode**: the AskUserQuestion call with
   research-grounded options. The skill pauses for the user's
   answer.
2. **If Intake mode**: the intake block (Q1-Q29 summary table
   or per-question subsections), then either:
   - The Council Phase 0 output (proceeding to Phase 1-3), OR
   - The plan file path that captures the intake + action
     plan, OR
   - The ExitPlanMode call for user approval.

The intake block is durable — it lives in the plan file (or
the Council Phase 0 output) and is not redone for the same
task across sessions.

## Why this skill exists

Without the intake step, every non-trivial task defaults to
"start coding based on the user's description." This reliably:

- Misses existing primitives → produces duplicates
- Misses OSS / vendor options → reinvents wheels
- Misses scalability concerns → hits walls at customer scale
- Misses compliance / accessibility / observability → ships
  with technical debt
- Misses the integration map → breaks contracts downstream
- Misses the documentation footprint → ships work the next
  contributor can't understand

The intake's cost is 15-60 minutes per task. The cost of
discovering any of the above misses AFTER shipping is days of
rework plus reviewer trust loss.

This skill enforces the intake mechanically — when the hook
detects a vague or non-trivial prompt, the skill runs; the
agent's first response is the intake output, not the start of
implementation.

User directive flow (verbatim):

- *"every task or plan must start with a has it been done
  before? who did it? who built it? can it be done better?
  is it scalable? is there a safe and maintained commercially
  free to use opensource to use? how does it tie and integrate
  to everything else? what to do and all other things in that
  plan or request and you are always free to look online."*
- *"add more due deligence questions to ask to attain extreme
  quality"*
- *"there is a rule/agent that helps improve requests/question
  can that be reviewed and improved as well?"*

The skill's depth matches the rule's depth — every non-trivial
prompt gets the full 29-question intake.

## Standards Cited

- **NIST AI RMF 1.0** — AI risk management framework (Govern / Map /
  Measure / Manage functions; MEASURE 2 covers model evaluation)
- **NIST SP 800-218A SSDF for AI** — Secure Software Development
  Framework profile for AI models (§PW.4, §PW.6, §PW.8)
- **NIST SP 800-53 Rev 5 §SI-4, §SI-7** — Information system
  monitoring + software integrity (applies to model + dataset
  artifacts)
- **ISO/IEC 23053:2022 §7** — Framework for AI systems using ML
- **ISO/IEC 23894:2023** — AI risk management
- **ISO/IEC 42001:2023** — AI management system requirements
- **OWASP Top 10 for LLM Applications (2025)** — LLM01 Prompt
  Injection, LLM02 Sensitive Information Disclosure, LLM06
  Excessive Agency, LLM09 Misinformation, LLM10 Unbounded
  Consumption
- **OWASP ML Top 10 (2023)** — ML01-ML10 (adversarial inputs,
  data poisoning, model inversion, etc.)
- **CWE-1039** — Automated recognition mechanism with inadequate
  detection or handling of adversarial input perturbations
- **CWE-1426** — Improper validation of generative AI output
- **EU AI Act (Regulation 2024/1689)** — risk-based obligations
  for general-purpose AI models + high-risk systems
- **`~/.claude/rules/common/council-triggers.md`** (Division 15) — bias,
  fairness, dataset provenance, human-in-the-loop gates


## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Ask 10 clarifying questions for every prompt | User abandons; loses trust | Cap at 3-6; only when truly ambiguous |
| Treat every prompt as "clear, no questions needed" | Implements wrong thing; wastes work | Lower the bar to ask when ambiguity surfaces |
| Generate clarifying questions before reading the codebase | Questions are uninformed; user has to re-explain context | Phase 1 research first; Phase 2 questions grounded in findings |
| Ask the same clarifying question twice in different forms | User feels not-listened-to | Track asked dimensions; vary across runs |
| Skip prompt-improver for `*`-prefixed prompts but ALSO skip Council | `*` is clarification-bypass, NOT Council-bypass | Council still convenes |
| Hard-coded questions regardless of project context | Generic / unhelpful | Research-grounded; per Phase 0 task intake |
| Present questions without recommended defaults | User has to think harder than necessary | Suggest a default for each; user accepts or overrides |
| Lose the original prompt content after clarification | Information lost in transit | Carry forward the enriched prompt verbatim |

## Cross-References

- `~/.claude/CLAUDE.md` — Council protocol the prompt-improver feeds into
- `~/.claude/hooks/improve-prompt.py` — UserPromptSubmit hook entry
- `~/.claude/rules/common/task-intake-due-diligence.md` — 29-question intake the improver pre-populates
- `~/.claude/rules/common/council-default.md` — Council convenes regardless of clarification
- `iterative-retrieval` skill — phase-1 codebase research uses this pattern
- `search-first` skill — also engaged during prompt research


## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Vague prompt slipped past the hook and reached implementation without clarification (router heuristic gap)
- Clear-but-non-trivial prompt skipped Mode 2 intake (rule weakening — sister `task-intake-due-diligence.md`)
- Generic option offered to user instead of research-grounded option (anti-pattern 1 recurrence)
- Question fabricated when research surfaced zero real options (anti-pattern 6)
- Re-asked context already provided in conversation history (anti-pattern 3 — trust history)
- "Just do it" override accepted without abbreviated intake (anti-pattern 7 — sister `proper-fixes-first.md`)
- More than 6 questions issued in a single AskUserQuestion (rule cap exceeded — should stage or convert to ExitPlanMode)
- Intake Q29 (online sources) empty on an external-integration task (sister `official-docs-first.md` violation)
- Trivial-mode used for a task that touched user-visible behaviour / security / data shape (router miscategorisation)

**Refinement candidates**:
- New row in the routing table when a recurring prompt shape doesn't fit current modes
- New anti-pattern entry when a question-style failure recurs across 2+ sessions
- Tightening of the trivial-mode definition when "small" prompts later prove non-trivial
- New research-radius row (per Phase 1 Clarification) when a new source class (e.g., partner-portal docs, internal RFC archive) becomes load-bearing
- Promotion of an inline citation pattern to a dedicated "Standards Cited" subsection when a regulatory / RFC anchor recurs across intakes
