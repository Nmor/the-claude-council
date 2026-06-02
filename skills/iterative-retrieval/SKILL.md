---
name: iterative-retrieval
description: Pattern for progressively refining context retrieval to solve the subagent context problem
---

# Iterative Retrieval Pattern

Solves the "context problem" in multi-agent workflows where subagents don't know what context they need until they start working.

## When to Activate

- Spawning subagents that need codebase context they cannot predict upfront
- Building multi-agent workflows where context is progressively refined
- Encountering "context too large" or "missing context" failures in agent tasks
- Designing RAG-like retrieval pipelines for code exploration
- Optimizing token usage in agent orchestration

## The Problem

Subagents are spawned with limited context. They don't know:

- Which files contain relevant code
- What patterns exist in the codebase
- What terminology the project uses

Standard approaches fail:

- **Send everything**: Exceeds context limits
- **Send nothing**: Agent lacks critical information
- **Guess what's needed**: Often wrong

## The Solution: Iterative Retrieval

A 4-phase loop that progressively refines context:

```text
┌─────────────────────────────────────────────┐
│                                             │
│   ┌──────────┐      ┌──────────┐            │
│   │ DISPATCH │─────▶│ EVALUATE │            │
│   └──────────┘      └──────────┘            │
│        ▲                  │                 │
│        │                  ▼                 │
│   ┌──────────┐      ┌──────────┐            │
│   │   LOOP   │◀─────│  REFINE  │            │
│   └──────────┘      └──────────┘            │
│                                             │
│        Max 3 cycles, then proceed           │
└─────────────────────────────────────────────┘
```

### Phase 1: DISPATCH

Initial broad query to gather candidate files:

```javascript
// Start with high-level intent
const initialQuery = {
  patterns: ['src/**/*.ts', 'lib/**/*.ts'],
  keywords: ['authentication', 'user', 'session'],
  excludes: ['*.test.ts', '*.spec.ts']
};

// Dispatch to retrieval agent
const candidates = await retrieveFiles(initialQuery);
```

### Phase 2: EVALUATE

Assess retrieved content for relevance:

```javascript
function evaluateRelevance(files, task) {
  return files.map(file => ({
    path: file.path,
    relevance: scoreRelevance(file.content, task),
    reason: explainRelevance(file.content, task),
    missingContext: identifyGaps(file.content, task)
  }));
}
```

Scoring criteria:

- **High (0.8-1.0)**: Directly implements target functionality
- **Medium (0.5-0.7)**: Contains related patterns or types
- **Low (0.2-0.4)**: Tangentially related
- **None (0-0.2)**: Not relevant, exclude

### Phase 3: REFINE

Update search criteria based on evaluation:

```javascript
function refineQuery(evaluation, previousQuery) {
  return {
    // Add new patterns discovered in high-relevance files
    patterns: [...previousQuery.patterns, ...extractPatterns(evaluation)],

    // Add terminology found in codebase
    keywords: [...previousQuery.keywords, ...extractKeywords(evaluation)],

    // Exclude confirmed irrelevant paths
    excludes: [...previousQuery.excludes, ...evaluation
      .filter(e => e.relevance < 0.2)
      .map(e => e.path)
    ],

    // Target specific gaps
    focusAreas: evaluation
      .flatMap(e => e.missingContext)
      .filter(unique)
  };
}
```

### Phase 4: LOOP

Repeat with refined criteria (max 3 cycles):

```javascript
async function iterativeRetrieve(task, maxCycles = 3) {
  let query = createInitialQuery(task);
  let bestContext = [];

  for (let cycle = 0; cycle < maxCycles; cycle++) {
    const candidates = await retrieveFiles(query);
    const evaluation = evaluateRelevance(candidates, task);

    // Check if we have sufficient context
    const highRelevance = evaluation.filter(e => e.relevance >= 0.7);
    if (highRelevance.length >= 3 && !hasCriticalGaps(evaluation)) {
      return highRelevance;
    }

    // Refine and continue
    query = refineQuery(evaluation, query);
    bestContext = mergeContext(bestContext, highRelevance);
  }

  return bestContext;
}
```

## Practical Examples

### Example 1: Bug Fix Context

```text
Task: "Fix the authentication token expiry bug"

Cycle 1:
  DISPATCH: Search for "token", "auth", "expiry" in src/**
  EVALUATE: Found auth.ts (0.9), tokens.ts (0.8), user.ts (0.3)
  REFINE: Add "refresh", "jwt" keywords; exclude user.ts

Cycle 2:
  DISPATCH: Search refined terms
  EVALUATE: Found session-manager.ts (0.95), jwt-utils.ts (0.85)
  REFINE: Sufficient context (2 high-relevance files)

Result: auth.ts, tokens.ts, session-manager.ts, jwt-utils.ts
```

### Example 2: Feature Implementation

```text
Task: "Add rate limiting to API endpoints"

Cycle 1:
  DISPATCH: Search "rate", "limit", "api" in routes/**
  EVALUATE: No matches - codebase uses "throttle" terminology
  REFINE: Add "throttle", "middleware" keywords

Cycle 2:
  DISPATCH: Search refined terms
  EVALUATE: Found throttle.ts (0.9), middleware/index.ts (0.7)
  REFINE: Need router patterns

Cycle 3:
  DISPATCH: Search "router", "express" patterns
  EVALUATE: Found router-setup.ts (0.8)
  REFINE: Sufficient context

Result: throttle.ts, middleware/index.ts, router-setup.ts
```

## Integration with Agents

Use in agent prompts:

```markdown
When retrieving context for this task:
1. Start with broad keyword search
2. Evaluate each file's relevance (0-1 scale)
3. Identify what context is still missing
4. Refine search criteria and repeat (max 3 cycles)
5. Return files with relevance >= 0.7
```

## Best Practices

1. **Start broad, narrow progressively** - Don't over-specify initial queries
2. **Learn codebase terminology** - First cycle often reveals naming conventions
3. **Track what's missing** - Explicit gap identification drives refinement
4. **Stop at "good enough"** - 3 high-relevance files beats 10 mediocre ones
5. **Exclude confidently** - Low-relevance files won't become relevant

## Related

- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - Subagent orchestration section
- `continuous-learning-v2` skill - For patterns that improve over time (instinct-based learning with confidence scoring)
- Agent definitions in `~/.claude/agents/`

## Purpose

Subagent orchestration pattern: spawn read-only Explore /
general-purpose agents to traverse a large codebase / large
context, return synthesised findings to the main agent, and
let the main agent compose decisions without burning its
own context window. Used for "find all consumers of X",
deep code archaeology, cross-repo audits, multi-file research.

**Negative scope** (NOT what this skill covers):

- Writing code via subagents — they're read-only here
- One-shot questions answered by direct grep — that's faster
  in-line
- Subagent-spawned-subagent recursion (depth limited per
  global Council rules)

## When NOT to use

- Question scope is < 3 file reads (direct tools faster)
- Subagent would duplicate work the main agent already did
- Time-sensitive interactive context — main agent's
  latency-aware path is better

## Standards Cited

- **NIST SP 800-53 Rev 5 §AC-6** — Least privilege (subagents
  receive only the brief, not the full session context)
- **NIST SP 800-218 SSDF §PW.6** — Configure compilation,
  interpreter, and build processes to improve executable
  security (apply to agent prompts as build artifacts)
- **ISO/IEC 27001:2022 Annex A.8.2** — Privileged access
  rights (subagents inherit only what their brief requires)
- **OWASP ASVS 4.0.3 §V13.1** — Generic web service security
  (subagent ↔ main agent contract is an API)
- **CWE-1284** — Improper Validation of Specified Quantity
  in Input (subagent briefs validate scope before fan-out)
- **W3C Trace Context** — `traceparent` propagates from main
  → subagent for telemetry
- **Anthropic Multi-Agent Patterns** (docs.anthropic.com) —
  parallel + sequential subagent patterns
- **`~/.claude/rules-library/common/no-silent-failures.md`** —
  subagent results MUST surface back; never silently dropped
- **`~/.claude/rules-library/common/error-handling-with-context.md`**
  — subagent failures wrapped with operation context for
  main-agent retry

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Vague brief ("look at the codebase") | Subagent flails; main agent burns turns clarifying | Specific question + scope: file globs + acceptance criteria |
| Spawning a subagent for a single file read | Setup cost > work | Use `Read` directly; subagent is for breadth, not depth |
| Subagent writes code | Tool-permission expansion; review surface explodes | Subagent reads only; main agent writes |
| No convergence criterion | Subagent loops forever | Brief includes "stop when X" predicate |
| Main agent ignores subagent's "I couldn't find X" signal | False-negative finding bubbles up | Treat empty result as a signal; ask follow-up |
| Sequential subagents when parallel would work | Latency × N | Spawn independent subagents in one Agent block (parallel) |
| Subagent inherits secrets via context | Privilege expansion | Brief carries only the question + scope, never tokens |
| Subagent result quoted verbatim into prod artifact | Bypass review; potential prompt-injection content | Synthesise + validate before promotion |

## Verification Checklist

- [ ] Each subagent brief is self-contained (no implicit
      context the subagent can't see)
- [ ] Scope limited (file globs / max-file-count) to prevent
      runaway traversal
- [ ] Convergence criterion in brief ("stop when X found" or
      "max N iterations")
- [ ] Subagent output budget (≤ 500 words back to main agent
      unless explicitly larger)
- [ ] Subagent failures surface back to main; never silent
- [ ] Independent subagents spawned in parallel (single
      Agent tool block with multiple calls)

## Cross-References

- `~/.claude/skills/search-first/SKILL.md` — when to search vs
  build; iterative-retrieval is the search-execution arm
- `~/.claude/skills/verification-loop/SKILL.md` — main-agent
  context management; complementary
- `~/.claude/rules-library/common/no-silent-failures.md` — subagent
  failure-surfacing contract
- `~/.claude/rules-library/common/error-handling-with-context.md` —
  subagent error envelope
- Anthropic docs on Agent / sub-agent orchestration

## Why this skill exists

The main agent's context window is finite + valuable.
Reading every file in a 1000-file repo to answer "where is
X used?" costs the main agent its context budget, which it
then can't spend on judgment. Subagents (Explore /
general-purpose) take the file traversal off the main agent's
context, summarise the answer, and return only the synthesis.
Result: main agent stays sharp for the decisions; subagents
handle the breadth. Cost: one extra tool call. Benefit:
multi-hour research compressed into minutes, with the main
agent retaining full context for the actual problem.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Subagent dispatched with overly-broad query (entire codebase) where targeted glob would suffice (context window waste)
- Subagent results not synthesised before next dispatch (linear chain instead of iterative refinement)
- Same subagent spawned in parallel with overlapping scope (duplicate work, redundant token cost)
- Subagent returns ambiguous result + main agent proceeds without follow-up dispatch (premature consolidation)
- Subagent description / prompt assumes context the subagent doesn't have (cold-start brief inadequate)
- Synthesis step delegated to subagent instead of done by main agent (main loses ground truth of the work)
- Iterative-retrieval pattern used where a single Read / Grep would have answered the question (over-engineering)
- Subagent loop count > 5 without convergence (the question is mis-framed; restate before continuing)

**Refinement candidates**:

- New dispatch pattern when a recurring class of question (e.g., "find all consumers of X function") surfaces
- Convergence-criterion update when subagent loops fail to terminate (add explicit "I've found enough" predicate)
- Brief-template improvement when subagents repeatedly ask for clarification (main agent's brief is under-specified)
- Synthesis-back-to-main pattern when subagent outputs need structured aggregation
