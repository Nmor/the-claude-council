#!/usr/bin/env python3
"""
Claude Code Prompt Improver Hook

Evaluates every incoming user prompt and routes it through the
prompt-improver skill when it needs clarification OR when it is
clear-but-non-trivial and requires the full task-intake due-
diligence questionnaire.

Sister:
- ~/.claude/skills/prompt-improver/SKILL.md (the workflow)
- ~/.claude/rules/common/task-intake-due-diligence.md (the
  29-question questionnaire)
- ~/.claude/rules/common/reuse-first.md (Q1 sweep)
- ~/.claude/rules/common/official-docs-first.md (Q3 + Q29)
- ~/.claude/CLAUDE.md Council Protocol Phase 0

Bypass prefixes (unchanged):
- '*' explicit user opt-out from skill (strip and pass through)
- '/' slash command (pass through unchanged)
- '#' memorize feature (pass through unchanged)
"""
import json
import sys


def output_json(text: str) -> None:
    """Emit UserPromptSubmit JSON to stdout."""
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": text,
        }
    }))


def main() -> int:
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(f"Error: Invalid JSON input: {exc}", file=sys.stderr)
        return 1

    prompt = input_data.get("prompt", "")

    # Bypass conditions
    if prompt.startswith("*"):
        # User explicit opt-out — strip * prefix and pass through.
        # Skips clarification AND intake. The user knows what
        # they want and accepts responsibility for skipping
        # research.
        output_json(prompt[1:].strip())
        return 0

    if prompt.startswith("/"):
        # Slash command — pass through unchanged.
        output_json(prompt)
        return 0

    if prompt.startswith("#"):
        # Memorize feature — pass through unchanged.
        output_json(prompt)
        return 0

    # Escape quotes for safe embedding in the wrapping prompt.
    escaped_prompt = prompt.replace("\\", "\\\\").replace('"', '\\"')

    wrapped_prompt = f"""PROMPT EVALUATION

Original user request: \"{escaped_prompt}\"

Route this prompt through the correct mode:

== CLARIFICATION MODE ==
If the prompt is VAGUE (any of: missing target, missing action,
missing success criteria; or generic phrases like \"fix the bug\",
\"make it faster\", \"add tests\" without context):

1. Briefly note: \"Hey! The Prompt Improver Hook flagged your
   prompt as a bit vague because [specific reason: ambiguous
   scope / missing context / unclear target / etc].\"
2. Invoke the `prompt-improver` skill — it runs codebase +
   workspace + ecosystem research first, then asks 1-6
   grounded questions via AskUserQuestion.

== INTAKE MODE ==
If the prompt is CLEAR but NON-TRIVIAL (any feature, refactor,
integration, multi-file change, new endpoint, new dependency,
performance work, security work, schema change, design change):

Before any implementation discussion, run the
`~/.claude/rules/common/task-intake-due-diligence.md` trigger-gated
intake (the always-fire high-signal core + the domain questions
whose triggers match). The intake output populates Council Protocol
Phase 0. Surface it FIRST, then proceed.

Either invoke the `prompt-improver` skill (which automates the
intake) OR produce the intake block inline as your first response.

== MANDATORY ONLINE RESEARCH (every non-trivial / INTAKE task) ==
Online research is REQUIRED — during collection, planning, AND
implementation — and needs no permission. Do NOT plan or write code
from training-cutoff recall alone.

- Run WebSearch / WebFetch (or a research Agent) THIS turn on: the
  current primary-source docs for any API / SDK / protocol / config
  touched; the latest stable versions + recent breaking changes +
  deprecations; and live security advisories (last 12-24 months).
- Primary sources only (provider docs / RFC / standard / spec) —
  never a Stack Overflow answer or a package README as the sole ref.
- Surface a \"Research (this turn)\" block — each source as
  title, URL, read-date, key finding — BEFORE the plan / GO decision.
- Per `council-default.md` rule 11 + `official-docs-first.md` +
  `validate-payloads-before-coding.md`, a plan or implementation
  without current cited research is INCOMPLETE — a NO-GO.

== TRIVIAL MODE ==
If the prompt is CLEAR and TRIVIAL (typo fix, single-line edit,
config tweak, comment update):

Run only the abbreviated intake (Q1 prior-art sweep + Q2
provenance + Q27 action plan, 1-2 sentences each). Proceed
immediately afterwards. Trust user intent.

== DECISION HEURISTICS ==
- Default: trust user intent; check conversation history first
- Conversation history already has the relevant context? Skip
  re-asking; surface the intake answers from history.
- The task touches user-visible behaviour, security, data
  shape, scalability, or external integration? → INTAKE.
- Non-trivial (INTAKE) task? → online research is MANDATORY this
  turn (see MANDATORY ONLINE RESEARCH above); never plan or
  implement from memory alone. Cite sources before the plan / GO.
- The task is a single-line correction or a stated typo fix?
  → TRIVIAL.
- The task description is missing target / action / success?
  → CLARIFICATION.

Per the Council Protocol, intake output goes into Phase 0
before Phase 1 (division discussion). Per
`~/.claude/rules/common/plan-execution-progress.md`, the intake
is the first progress update of any non-trivial plan."""

    output_json(wrapped_prompt)
    return 0


if __name__ == "__main__":
    sys.exit(main())
