---
name: verification-loop
description: "A comprehensive verification system for Claude Code sessions."
---

# Verification Loop Skill

A comprehensive verification system for Claude Code sessions.

## When to Use

Invoke this skill:
- After completing a feature or significant code change
- Before creating a PR
- When you want to ensure quality gates pass
- After refactoring

## Verification Phases

### Phase 1: Build Verification
```bash
# Check if project builds
npm run build 2>&1 | tail -20
# OR
pnpm build 2>&1 | tail -20
```

If build fails, STOP and fix before continuing.

### Phase 2: Type Check
```bash
# TypeScript projects
npx tsc --noEmit 2>&1 | head -30

# Python projects
pyright . 2>&1 | head -30
```

Report all type errors. Fix critical ones before continuing.

### Phase 3: Lint Check
```bash
# JavaScript/TypeScript
npm run lint 2>&1 | head -30

# Python
ruff check . 2>&1 | head -30
```

### Phase 4: Test Suite
```bash
# Run tests with coverage
npm run test -- --coverage 2>&1 | tail -50

# Check coverage threshold
# Target: 70% minimum
```

Report:
- Total tests: X
- Passed: X
- Failed: X
- Coverage: X%

### Phase 5: Security Scan
```bash
# Check for secrets
grep -rn "sk-" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "api_key" --include="*.ts" --include="*.js" . 2>/dev/null | head -10

# Check for console.log
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10
```

### Phase 6: Diff Review
```bash
# Show what changed
git diff --stat
git diff HEAD~1 --name-only
```

Review each changed file for:
- Unintended changes
- Missing error handling
- Potential edge cases

## Output Format

After running all phases, produce a verification report:

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```

## Continuous Mode

For long sessions, run verification every 15 minutes or after major changes:

```markdown
Set a mental checkpoint:
- After completing each function
- After finishing a component
- Before moving to next task

Run: /verify
```

## Integration with Hooks

This skill complements PostToolUse hooks but provides deeper verification.
Hooks catch issues immediately; this skill provides comprehensive review.

## Cross-rule Gates (mandatory before "done")

These gates ride alongside the build/test/lint loop above. Each must
pass before any change is declared complete:

- **Docs-sync gate** (`~/.claude/rules-library/common/docs-sync-with-code.md`)
  — every feature page under `docs/` reflects what shipped; README,
  CLAUDE.md, landing page describe only working features;
  `docs/runbook.md` has an entry per new failure-mode.
- **Official-docs-first** (`~/.claude/rules/common/official-docs-first.md`)
  — every external integration touched in this change has a
  `docs/provider-research/<provider>.md` note that was read or
  refreshed THIS turn. The Council Phase 0 ONLINE RESEARCH block
  contains the canonical URLs.
- **No-overclaim** (`~/.claude/rules/common/no-overclaim.md`) —
  "done", "complete", "100%", "shipped" are reserved for states
  where every gate above has been verified THIS turn. Until then,
  the language is "in progress" / "next: <gate>". When the user
  challenges a "done" claim, re-run the verification before
  responding — never re-affirm without a re-run.

## Strategic context management

Long sessions hit context pressure. Auto-compaction triggers at
arbitrary points — often mid-task, losing important state.
Strategic compaction at LOGICAL boundaries preserves the right
context and frees the rest.

### When to compact (decision table)

| Phase transition | Compact? | Why |
| --- | --- | --- |
| Research → Planning | Yes | Research is bulky; plan is the distilled output |
| Planning → Implementation | Yes | Plan lives in TodoWrite / plan file; free context for code |
| Implementation → Testing | Maybe | Keep if tests reference recent code; compact if switching focus |
| Debugging → Next feature | Yes | Debug traces pollute context for unrelated work |
| Mid-implementation | No | Losing variable names, file paths, partial state is costly |
| After a failed approach | Yes | Clear dead-end reasoning before trying a new one |

### What survives compaction

| Persists | Lost |
| --- | --- |
| `CLAUDE.md` instructions | Intermediate reasoning + analysis |
| TodoWrite task list | File contents previously read |
| Memory files (`~/.claude/memory/`) | Multi-step conversation context |
| Git state (commits, branches) | Tool-call history + counts |
| Files on disk | Verbally-stated user preferences |

### Best practices

1. **Compact after planning** — once plan is finalised in
   TodoWrite, compact to start fresh on implementation.
2. **Compact after debugging** — clear error-resolution context
   before continuing.
3. **NEVER compact mid-implementation** — preserve context for
   related changes in the same edit.
4. **Write before compacting** — save important context to files
   or memory before compacting.
5. **Use `/compact` with a summary** — `/compact Focus on
   implementing auth middleware next` carries forward intent.

### Optional hook (operator-installed, not default)

Operators who want suggestion-on-threshold can add to
`~/.claude/settings.json`:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Edit",  "hooks": [{ "type": "command", "command": "node ~/.claude/scripts/hooks/suggest-compact.js" }] },
      { "matcher": "Write", "hooks": [{ "type": "command", "command": "node ~/.claude/scripts/hooks/suggest-compact.js" }] }
    ]
  }
}
```

Threshold via `COMPACT_THRESHOLD` env var (default: 50 tool calls).

## Related skills

- `provider-research` — workflow for the official-docs-first
  primary-source citations.
- `api-design` ("Response-shape contracts" section) — pin
  response shapes so backend / frontend don't silently drift
  apart.
- `backend-patterns` ("Fire-and-forget side effects" section) —
  canonical shape for side effects that don't block the user but
  must still log on failure.

## Purpose

Post-write verification protocol: every file edit pairs with
language-specific build / lint / type-check / test runs THIS
turn, IDE-diagnostic capture, and a verification block in the
response. Also owns strategic context-management at compaction
boundaries: persist plan state, mark phase complete, hand off
cleanly so the next session resumes without re-derivation.

**Negative scope** (NOT what this skill covers):
- Authoring tests — that's `tdd-workflow`
- Test-result analysis depth — that's the per-language reviewer
  agent
- Production verification (deploy probes) — that's
  `deployment-patterns`

## When NOT to use

- No file was edited (read-only sessions)
- Trivial doc-only edits where the gate is markdownlint alone
- Mid-session work that's still in RED phase of TDD (run gates
  before the GREEN claim)

## Standards Cited

- **NIST SP 800-218 SSDF §PW.7 + §PW.8** — Review and / or
  analyse human-readable code, test executable code
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing and
  evaluation
- **ISO/IEC 25010:2011 §6.6** — Maintainability + reliability
  (verification gates protect both)
- **ISO/IEC/IEEE 12207:2017 §6.4.4** — Software verification
  process
- **OWASP ASVS 4.0.3 §V14.1** — Build pipeline (lint + test
  gates are pipeline-aware)
- **OWASP ASVS 4.0.3 §V1.1.4** — Verified secure development
  lifecycle (verify-before-claim IS the verification step)
- **CWE-1357** — Reliance on insufficiently trustworthy
  component (verification gate catches transitive issues)
- **SLSA Framework v1.0 Build L1+** — Provenance of build
  artifacts (verification produces evidence the build is
  reproducible)
- **`~/.claude/rules/common/verify-before-claim.md`** — the
  policy this skill implements at file-edit granularity
- **`~/.claude/rules/common/done-criteria.md`** — the
  per-language gate suite this skill runs
- **`~/.claude/rules-library/common/extreme-lint-policy.md`** —
  strict thresholds the gates enforce

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| "Looks clean, shipping it" | Aspiration, not verification | Run the per-language gate THIS turn; quote the result |
| Verification gate ran 3 turns ago; file unchanged since | Stale; new edits invalidate prior runs | Re-run when ANY file in scope has changed since last run |
| Run only the test for the file you edited | Misses regressions in callers | Full test suite for the service; per-file just for spot-check |
| Skip IDE diagnostics ("it builds") | SonarLint / type-checker / a11y catch what the compiler doesn't | Read every diagnostic the IDE surfaced; fix or document |
| `continue-on-error: true` in CI | Gate becomes advisory; ship-blocks turn into warnings | Hard fail; treat warnings as errors per `extreme-lint-policy.md` |
| Compaction without state persistence | Next session re-derives from scratch | Snapshot plan file + TodoWrite state before compaction |
| Verification block missing from the response | User can't audit completion | Explicit block: tool ran, command ran, exit-code observed |
| Tests pass locally but CI is different | Local-CI parity gap | Run the same command CI runs (`pnpm verify` / `make verify`) |
| Coverage drift from 90% to 70% silently | Test debt accumulates | Coverage threshold enforced per `extreme-lint-policy.md`: ≥90% touched / ≥80% project |

## Verification Checklist

- [ ] Per-language gate run THIS turn (build, lint,
      type-check, test, coverage)
- [ ] IDE diagnostics empty for touched files
- [ ] Cross-file regressions checked (test suite, not just
      the changed test)
- [ ] Verification block in response includes tool name +
      command + exit code / output summary
- [ ] No `--no-verify` / `--no-pre-commit` shortcuts used
- [ ] If context > 80% full: strategic compaction triggered
      with plan-state snapshot
- [ ] CI runs the same command set the local gate runs
      (`pnpm verify` / `make verify` parity)

## Cross-References

- `~/.claude/rules/common/verify-before-claim.md` — policy
  the skill implements
- `~/.claude/rules/common/done-criteria.md` — per-language
  gate suite
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strict
  thresholds
- `~/.claude/rules/common/no-overclaim.md` — never claim
  done without same-turn proof
- `~/.claude/rules-library/common/local-testability.md` — every
  change must be locally testable (verification gate runs
  locally)
- `~/.claude/skills/tdd-workflow/SKILL.md` — TDD RED-GREEN
  cycle within which verification fires
- `~/.claude/skills/eval-harness/SKILL.md` — LLM-behaviour
  verification (sister harness)

## Why this skill exists

"Looks good" is the worst kind of feedback in a multi-turn
agent loop: it ships partial state to the user, who then
discovers the regression hours later. Verification-loop
forces the every-turn gate: edited a file? Run the gate.
Saw diagnostics? Address them. Approaching context limit?
Snapshot state. The gate is mechanical; the discipline is
to run it every turn rather than reasoning about whether to
run it. Cost: 30 seconds per edit. Benefit: regressions
caught at write-time instead of merge-time or production.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Build / lint / test gate skipped on a touched file (sister `done-criteria.md` weakening)
- Verification block missing from a "done" claim (sister `no-overclaim.md` rule 2 violation)
- Gate result is stale (ran earlier this session, files changed since, not re-run)
- Strategic compaction skipped at logical phase boundary (context discipline weakening)
- Plan-file state not refreshed at phase boundaries
- Verification "passed" claimed without re-running this turn after edits
- Local-vs-CI gate divergence (CI fails after local says clean)
- IDE diagnostic captures ignored in PostToolUse hook output

**Refinement candidates**:
- New per-language gate row when a new ecosystem emerges (new test runner, new lint chain)
- Tightening of the compaction threshold (currently 50 tool calls) when context-loss incidents recur
- New cross-reference when a sister rule (verify-before-claim, local-testability) adds a verification surface
- New strategic-compaction trigger when a recurring "context filled mid-task" pattern surfaces
