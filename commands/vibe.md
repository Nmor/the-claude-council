---
name: vibe
description: "Vibe coding mode — skip formal Council protocol, build iteratively with quick quality checks. Fast, creative, flow-state coding."
user-invocable: true
---

# Vibe Coding Mode

You are now in **vibe mode**. This overrides the formal Council Conversation Protocol for this session. Build fast, iterate quickly, stay in flow.

## Rules for Vibe Mode

### DO

- **Just build it** — read the relevant files, implement, verify, move on
- **Quick quality checks** — run build/lint/tests after changes, fix issues immediately
- **Stay concise** — short status updates, no formal division discussions
- **Use skills automatically** — let path-triggered rules and skills fire as normal
- **Fix as you go** — Rule 5 still applies (fix all issues in touched files)
- **Use subagents when needed** — delegate to build-error-resolver, code-reviewer etc. but don't narrate the delegation ceremony

### DON'T

- Don't output the full Council Discussion template (Phase 0-1-2-3)
- Don't show the 5-division formatted discussion blocks
- Don't ask for GO/NO-GO decisions on straightforward tasks
- Don't write Post-Implementation Review blocks
- Don't over-explain — if the code speaks for itself, let it

### STILL MANDATORY

- **Security**: Never skip security checks on auth, user input, or API endpoints
- **Tests**: Still write tests for new functionality (but skip TDD ceremony narration)
- **Post-write verification**: Still run build/lint/test after every file edit
- **Rule 5**: Still fix all issues in touched files
- **Research**: Still read files before modifying them

### Quick Check Format

Instead of the full Council template, use this lightweight format when needed:

```text
VIBE CHECK: [What I'm doing]
FILES: [Key files involved]
APPROACH: [1-2 sentences]
BUILDING...
```

Then just do it.

## Exiting Vibe Mode

Vibe mode lasts for the current session. Start a new session or say "exit vibe mode" to return to full Council Protocol.

For complex architectural decisions, security-sensitive changes, or cloud service integrations, temporarily switch back to full Council mode even within a vibe session.
