# council-rules: Conversation Rules

> Council conversation rules: order of speaking, per-division research-depth minimums, disagreement
> protocol and the escalation-to-user format. Pointed at by the SKILL.md routing row "Conversation
> rules".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Conversation Rules

### 1. Order of Speaking

1. **Research Phase** first (codebase + online)
2. **Architecture & Planning** speaks first (sets strategic direction)
3. **Implementation & Build** speaks second (proposes implementation + identifies build concerns)
4. **Quality & Review** speaks third (defines quality requirements)
5. **Security** speaks fourth (identifies vulnerabilities + threat model)
6. **Testing & QA** speaks last (defines test-first plan + staging readiness)

### 2. Research Depth Requirements

```text
MINIMUM RESEARCH BEFORE SPEAKING:

Architecture & Planning (architect, planner) must have:
- Reviewed system architecture files
- Identified all integration points
- Examined config/infrastructure files
- Reviewed cloud service options
- Assessed phased delivery approach

Implementation & Build must have:
- Read all potentially affected source files
- Identified existing patterns to follow
- Found utilities to reuse
- Reviewed SDK usage in codebase
- Checked database schema implications
- Identified build/compilation impact

Quality & Review must have:
- Reviewed existing code patterns and conventions
- Checked documentation standards
- Examined CI/CD configurations
- Identified language-specific review criteria

Security must have:
- Reviewed auth/authz implementations
- Checked existing security middleware
- Examined input validation patterns
- Reviewed API docs for security requirements
- Checked IAM/permissions and security configs
- Assessed OWASP Top 10 relevance

Testing & QA must have:
- Reviewed existing test suites and coverage
- Identified test patterns used in project
- Examined CI/CD test pipeline
- Identified edge cases and regression risks
- Planned test-first approach (what tests to write before code)
- Assessed staging/production readiness criteria
```

### 3. Disagreement Protocol

If divisions disagree:

```text
DISAGREEMENT DETECTED

[Division 1] position: [Their view]
[Division 2] position: [Their view]

ADDITIONAL RESEARCH NEEDED: [What to look up to resolve]

RESOLUTION: [How the team resolves this - compromise/escalate to user]
```

### 4. Escalation to User

Escalate to user when:

- Research reveals multiple valid approaches
- Cloud service selection needs business decision
- Cost implications are significant
- Divisions cannot reach consensus
- Security identifies blocking concerns
- Architecture decision requires business input
- Requirements are unclear

Format:

```text
COUNCIL QUESTION FOR USER

Based on our research, we need your input on:

RESEARCH FINDINGS:
[Summary of what we found]

DECISION NEEDED:
1. [Question 1]
2. [Question 2]

Options:
A) [Option A - with pros/cons from research]
B) [Option B - with pros/cons from research]

TEAM RECOMMENDATION: [Option X] because [reason based on research]
```
