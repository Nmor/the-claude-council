# Council working instructions

> Size budget: 5 KB.

Use engineering judgment with architecture, implementation, quality, security and
verification in view. The default is focused work in the main session, not a meeting
of every division. User scope and higher-priority instructions govern; do not repeat
approval already granted. These current working rules govern the procedural examples
retained in detailed references.

## Work at the required depth

- Routine edits and status questions: act directly, verify proportionately, answer briefly.
- Substantive changes: inspect relevant implementation once, identify material risks,
  implement, review and run the required checks. Use the existing plan for multi-step work.
- High-risk changes: explicitly examine security, data migration, financial or operational
  failure modes as applicable. Use a specialist only for a concrete independent task.
- Do not print five division speeches, repeat intake questionnaires, research unchanged
  contracts, or re-audit all previous phases after every small change.
- Stop expanding the scope when the requested acceptance criteria and required checks pass.
  Keep actual failures and uncertainties visible; never substitute process for evidence.

## Delegate deliberately

Default to no subagents for work the main session can finish efficiently. When a
specialist adds independent evidence or owns a separable deliverable, give it the
objective, exact paths, relevant excerpts, acceptance check and a concise output limit.
Use at most one helper at a time by default. Do not recursively delegate or start
large dynamic workflows unless the user asks for a larger team or the task justifies
an explicit bounded exception. Queue additional useful work instead of launching
several overlapping reviews. Reuse an existing helper; stop it when its task ends.
Keep tool I/O parallel where useful without inventing more model sessions.

Respect the user's main model. Use suitable cheaper helpers for bounded mechanical
work when available; difficult design/security review needs adequate reasoning.
Do not copy the whole conversation, historical plan or Council library into a helper.

## Keep context useful

Read the current handoff and relevant sections of the single authoritative plan.
Search before opening large files; read only the needed reference sections. Keep
verbose test/log output in files and return results, failure details and evidence paths.
After a meaningful milestone, update the existing plan with worktree/commit, decisions,
verified results, pending checks and next action. Use that checkpoint for compaction.
Compact before a long-running task accumulates a large history; when switching to
unrelated work, start a fresh session from its own handoff. Do not claim to have
compacted or cleared a session without the runtime actually doing it. Never discard
uncommitted work or kill the user's other sessions to reduce usage.

## Load detail only when needed

`rules/common/` contains the short standing rules. Complete detailed standards and
examples live in `rules-library/council-detail/` and the existing language/domain
skills. Follow links only for the task's actual subject. Detailed material is available,
not automatically required reading. `paths:` is a rule-scoping mechanism; do not claim
skill bodies automatically load simply because a file matches a custom frontmatter key.

Use `skills/council-protocol/SKILL.md` for a requested deep review or a high-risk plan,
and `skills/council-rules/SKILL.md` for division expertise when selecting a specialist.
Use `docs/CONTEXT.md` for context budgets, cost controls and runtime limitations.
The full original doctrine remains in `rules-library/council-detail/council-doctrine.md`.

## Verification and permissions

Preserve repository-required tests and security controls. Report real results, skips
and scope; reuse evidence only while the code and relevant environment remain unchanged.
Hooks supplement permissions and review; they are not proof tests passed. Keep one plan,
preserve others' edits and follow the user's commit/push/deployment boundaries.
