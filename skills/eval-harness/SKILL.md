---
name: eval-harness
description: Formal evaluation framework for Claude Code sessions implementing eval-driven development (EDD) principles
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Eval Harness Skill

A formal evaluation framework for Claude Code sessions, implementing eval-driven development (EDD) principles.

## When to Activate

- Setting up eval-driven development (EDD) for AI-assisted workflows
- Defining pass/fail criteria for Claude Code task completion
- Measuring agent reliability with pass@k metrics
- Creating regression test suites for prompt or agent changes
- Benchmarking agent performance across model versions

## Philosophy

Eval-Driven Development treats evals as the "unit tests of AI development":
- Define expected behavior BEFORE implementation
- Run evals continuously during development
- Track regressions with each change
- Use pass@k metrics for reliability measurement

## Eval Types

### Capability Evals
Test if Claude can do something it couldn't before:
```markdown
[CAPABILITY EVAL: feature-name]
Task: Description of what Claude should accomplish
Success Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2
  - [ ] Criterion 3
Expected Output: Description of expected result
```

### Regression Evals
Ensure changes don't break existing functionality:
```markdown
[REGRESSION EVAL: feature-name]
Baseline: SHA or checkpoint name
Tests:
  - existing-test-1: PASS/FAIL
  - existing-test-2: PASS/FAIL
  - existing-test-3: PASS/FAIL
Result: X/Y passed (previously Y/Y)
```

## Grader Types

### 1. Code-Based Grader
Deterministic checks using code:
```bash
# Check if file contains expected pattern
grep -q "export function handleAuth" src/auth.ts && echo "PASS" || echo "FAIL"

# Check if tests pass
npm test -- --testPathPattern="auth" && echo "PASS" || echo "FAIL"

# Check if build succeeds
npm run build && echo "PASS" || echo "FAIL"
```

### 2. Model-Based Grader
Use Claude to evaluate open-ended outputs:
```markdown
[MODEL GRADER PROMPT]
Evaluate the following code change:
1. Does it solve the stated problem?
2. Is it well-structured?
3. Are edge cases handled?
4. Is error handling appropriate?

Score: 1-5 (1=poor, 5=excellent)
Reasoning: [explanation]
```

### 3. Human Grader
Flag for manual review:
```markdown
[HUMAN REVIEW REQUIRED]
Change: Description of what changed
Reason: Why human review is needed
Risk Level: LOW/MEDIUM/HIGH
```

## Metrics

### pass@k
"At least one success in k attempts"
- pass@1: First attempt success rate
- pass@3: Success within 3 attempts
- Typical target: pass@3 > 90%

### pass^k
"All k trials succeed"
- Higher bar for reliability
- pass^3: 3 consecutive successes
- Use for critical paths

## Eval Workflow

### 1. Define (Before Coding)
```markdown
## EVAL DEFINITION: feature-xyz

### Capability Evals
1. Can create new user account
2. Can validate email format
3. Can hash password securely

### Regression Evals
1. Existing login still works
2. Session management unchanged
3. Logout flow intact

### Success Metrics
- pass@3 > 90% for capability evals
- pass^3 = 100% for regression evals
```

### 2. Implement
Write code to pass the defined evals.

### 3. Evaluate
```bash
# Run capability evals
[Run each capability eval, record PASS/FAIL]

# Run regression evals
npm test -- --testPathPattern="existing"

# Generate report
```

### 4. Report
```markdown
EVAL REPORT: feature-xyz
========================

Capability Evals:
  create-user:     PASS (pass@1)
  validate-email:  PASS (pass@2)
  hash-password:   PASS (pass@1)
  Overall:         3/3 passed

Regression Evals:
  login-flow:      PASS
  session-mgmt:    PASS
  logout-flow:     PASS
  Overall:         3/3 passed

Metrics:
  pass@1: 67% (2/3)
  pass@3: 100% (3/3)

Status: READY FOR REVIEW
```

## Integration Patterns

### Pre-Implementation
```
/eval define feature-name
```
Creates eval definition file at `.claude/evals/feature-name.md`

### During Implementation
```
/eval check feature-name
```
Runs current evals and reports status

### Post-Implementation
```
/eval report feature-name
```
Generates full eval report

## Eval Storage

Store evals in project:
```
.claude/
  evals/
    feature-xyz.md      # Eval definition
    feature-xyz.log     # Eval run history
    baseline.json       # Regression baselines
```

## Best Practices

1. **Define evals BEFORE coding** - Forces clear thinking about success criteria
2. **Run evals frequently** - Catch regressions early
3. **Track pass@k over time** - Monitor reliability trends
4. **Use code graders when possible** - Deterministic > probabilistic
5. **Human review for security** - Never fully automate security checks
6. **Keep evals fast** - Slow evals don't get run
7. **Version evals with code** - Evals are first-class artifacts

## Example: Adding Authentication

```markdown
## EVAL: add-authentication

### Phase 1: Define (10 min)
Capability Evals:
- [ ] User can register with email/password
- [ ] User can login with valid credentials
- [ ] Invalid credentials rejected with proper error
- [ ] Sessions persist across page reloads
- [ ] Logout clears session

Regression Evals:
- [ ] Public routes still accessible
- [ ] API responses unchanged
- [ ] Database schema compatible

### Phase 2: Implement (varies)
[Write code]

### Phase 3: Evaluate
Run: /eval check add-authentication

### Phase 4: Report
EVAL REPORT: add-authentication
==============================
Capability: 5/5 passed (pass@3: 100%)
Regression: 3/3 passed (pass^3: 100%)
Status: SHIP IT
```

## Purpose

Quantitative evaluation harness for agent / prompt / skill
changes. Pairs pass@k (capability — does it work at least once
in k tries?) with pass^k (regression — does it work k-of-k
tries reliably?). Without eval-harness, "this prompt feels
better" is the only signal; with it, ship/no-ship is a number.

**Negative scope** (NOT what this skill covers):
- Manual UX testing — see `e2e-runner` agent / `e2e-testing`
  skill for browser-driven flows
- Unit tests of code — see `tdd-workflow`
- A/B testing in production — see `feature-flags.md`
  guardrail metrics

## When NOT to use

- Prompt tweaks too small to warrant a full eval pass (just
  ship + monitor)
- Code-only changes with no LLM behaviour in scope
- One-off scripts the user explicitly says don't need to
  pass regression bars

## Standards Cited

- **NIST AI Risk Management Framework (AI RMF 1.0) §MEASURE**
  — Trustworthiness measurement (pass@k + pass^k are MEASURE
  artifacts)
- **NIST SP 800-160 v2 §3.4** — Evaluation as an engineering
  practice
- **ISO/IEC 23053:2022 §7.4** — AI system evaluation
- **ISO/IEC 25010:2011 §6.5** — Reliability quality
  characteristic (pass^k measures it)
- **OWASP LLM Top 10 (2025) LLM09** — Misinformation / unsafe
  outputs caught by capability evals
- **OWASP ASVS 4.0.3 §V11.1.4** — Resource-intensive
  operations rate-limited (the eval harness respects per-tenant
  budgets per `cost-aware-llm-pipeline`)
- **CWE-697** — Incorrect Comparison (pass-rate computation
  must use the same scorer for capability + regression)
- **Anthropic Eval Best Practices** — pass@k methodology
- **OpenAI Evals Framework** — open-source reference
  implementation
- **`~/.claude/rules-library/common/contract-testing.md`** — evals as
  the contract between intent + behaviour

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| pass@1 only (single shot) | Hides non-determinism; one lucky run = "shipped" | pass@3 minimum; pass^3 for regression confidence |
| Same prompt eval after eval (drift not caught) | Improvement masked by prompt-tuning vs real capability | Hold the prompt constant; eval the change |
| Rubric written by the same person who wrote the change | Reviewer bias | External rubric defined BEFORE the change |
| Capability evals only; no regression eval | Improvement at the cost of breaking old workflows | Always run BOTH capability + regression on every change |
| pass^k threshold below 100% on critical paths | Flaky behaviour in production | 100% pass^k required for auth / payments / data-mutation |
| Scoring by manual judgment when automated check exists | Subjective; doesn't scale | Use exact-match / structured-output / LLM-judge with rubric |
| Eval dataset never updated | Stale signal; new failure modes invisible | Add the failure case to the suite WHEN it surfaces in prod |
| LLM-judge bias unchecked | Same model judging itself overestimates | Use a different model as judge OR a deterministic scorer |
| Cost-blind eval runs | Single eval pass costs $$$ | Budget per eval-run; alert on overrun (`cost-aware-llm-pipeline`) |

## Verification Checklist

- [ ] Capability suite has ≥ 5 distinct scenarios per
      capability
- [ ] Regression suite has every shipped failure case
- [ ] pass^k threshold defined per criticality (e.g., 100%
      auth / 95% UX / 90% nice-to-have)
- [ ] Same eval dataset + scorer used before / after the
      change
- [ ] Cost per eval-run within budget (per
      `cost-aware-llm-pipeline`)
- [ ] Eval report committed to repo (reproducibility)
- [ ] LLM-judge (if used) is a different model from the
      one being evaluated

## Cross-References

- `~/.claude/skills/tdd-workflow/SKILL.md` — eval is the
  test-driven approach applied to LLM behaviour
- `~/.claude/skills/cost-aware-llm-pipeline/SKILL.md` — keeps
  eval-run cost bounded
- `~/.claude/skills/iterative-retrieval/SKILL.md` — paired with
  evals for retrieval-quality measurement
- `~/.claude/rules-library/common/contract-testing.md` — capability +
  regression are LLM contracts
- `~/.claude/rules-library/common/feature-flags.md` — guardrail
  metrics + eval thresholds
- Anthropic Cookbook eval examples + OpenAI Evals repo for
  reference

## Why this skill exists

Subjective "this prompt is better" is the universal failure
mode of prompt engineering. Without a number, every change
ships on vibes; regressions are detected by customer
complaints; iteration speed is bounded by manual judgment.
Eval-harness puts a number on it: capability (does it work?)
+ regression (does it keep working?). Once a team has eval
infrastructure, the question becomes "did the metric move"
instead of "did it feel better" — and that turns
LLM-shipping from an art into engineering.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Skill / rule / agent shipped without a capability eval (no pass@k baseline)
- Regression suite missing for a previously-shipped capability (regression coverage gap)
- pass@k computed on n=1 sample (statistical-significance theatre — need n≥3 typically, n≥10 for high-stakes)
- Eval prompt drift — eval cases evolve without versioning (apples-vs-oranges across runs)
- Capability eval green but production behaviour degrades (eval-vs-reality gap; rubric needs sharpening)
- Eval cases overlap with training / few-shot examples (data leakage inflates scores)
- "SHIP IT" status applied without verification block from `~/.claude/rules/common/verify-before-claim.md`
- Eval rubric assesses surface form (string match) instead of semantic correctness

**Refinement candidates**:
- New eval class when a recurring capability surfaces that needs its own pass@k baseline (e.g., security-fix eval, refactor-safety eval)
- Rubric tightening when capability evals plateau at 100% but real-world performance shows residual gaps
- Regression suite expansion when a shipped change causes user-reported regression (add the failure case to the suite)
- pass^k tightening (e.g., pass^5 instead of pass^3) when high-stakes capabilities need stricter regression confidence
