<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Late addition: agents.md (Phase B classified it here but
     initial SKILL.md author missed appending the source).
     ============================================================ -->

# Agent Orchestration

> Agent orchestration: the available-agents table, immediate-agent-usage rules, parallel Task
> execution, multi-perspective analysis, and its learning hooks. Pointed at by the SKILL.md routing
> row "Agent delegation + orchestration".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Agent Delegation Guide (migrated from rules-library/common/agents.md)

## Available Agents

Located in `~/.claude/agents/`:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code review | After writing code |
| security-reviewer | Security analysis | Before commits |
| build-error-resolver | Fix build errors | When build fails |
| e2e-runner | E2E testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation | Updating docs |

## Deliberate delegation

Work in the main session by default. A specialist is useful when it owns a concrete
independent investigation or review that improves the result. A matching role name
alone is not a reason to launch an agent.

Use one helper at a time by default; queue further tasks. Parallel tool reads do not
require separate model sessions. Avoid recursive delegation and overlapping reviews.
Give a helper the objective, exact paths, relevant excerpts, acceptance criterion and
a concise output bound. Reuse a suitable existing helper and finish it when done.

Read only the active handoff and relevant plan sections. Do not copy the full history
or load every rule. Scale specialist depth to risk and preserve required security and
verification checks. Explicit user requests for a larger team can override this default.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- An expensive delegation produced no independent evidence or duplicated parent work
- Parallel agents multiplied context without reducing a meaningful dependency
- Complex work lacked useful dependencies or acceptance criteria in its existing plan
- Code shipped without `code-reviewer` / language-specific reviewer pass
- Changed behavior lacked meaningful verification
- Security-sensitive change shipped without `security-reviewer` audit
- Multi-perspective analysis skipped on a complex / ambiguous problem (single-perspective bias risk)
- Agent invoked without the required context (description, file paths, expected output shape)

**Refinement candidates**:

- New row in the "Available Agents" table when a new specialist agent ships (e.g.,
  `accessibility-reviewer`, `data-reviewer`)
- Tightening of delegation criteria when an agent's expertise proves load-bearing
  in retrospectives
- New parallel-execution template when a recurring fan-out pattern emerges (e.g., three-language
  security audit)
- New cross-reference when a sister rule (council-default, council-triggers, performance) defines
  when an agent must engage

---
