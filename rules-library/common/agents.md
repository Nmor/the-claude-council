# Agent Orchestration

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

## Immediate Agent Usage

No user prompt needed:
1. Complex feature requests - Use **planner** agent
2. Code just written/modified - Use **code-reviewer** agent
3. Bug fix or new feature - Use **tdd-guide** agent
4. Architectural decision - Use **architect** agent

## Parallel Task Execution

ALWAYS use parallel Task execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Agent not delegated to when its description matches the work (Immediate Agent Usage rule weakening)
- Sequential agent calls when parallel was possible (Parallel Task Execution rule weakening)
- Complex feature shipped without `planner` agent producing a phased plan
- Code shipped without `code-reviewer` / language-specific reviewer pass
- TDD-eligible task started without `tdd-guide` agent invocation
- Security-sensitive change shipped without `security-reviewer` audit
- Multi-perspective analysis skipped on a complex / ambiguous problem (single-perspective bias risk)
- Agent invoked without the required context (description, file paths, expected output shape)

**Refinement candidates**:
- New row in the "Available Agents" table when a new specialist agent ships (e.g., `accessibility-reviewer`, `data-reviewer`)
- Tightening of the "Immediate Agent Usage" criteria when an agent's expertise proves load-bearing in retrospectives
- New parallel-execution template when a recurring fan-out pattern emerges (e.g., three-language security audit)
- New cross-reference when a sister rule (council-default, council-triggers, performance) defines when an agent must engage
