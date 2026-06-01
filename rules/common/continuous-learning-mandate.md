# Continuous Learning Mandate (Always-On, Global)

> Auto-fires on every file. Sister to `rule-authoring-global-vs-project.md`
> (where new learnings land), `project-scoped-artifacts.md`
> (workspace-side learning loops), the `continuous-learning-v2`
> skill (implementation), the `learn` + `evolve` + `instinct-*`
> commands (operator interface).

## Core Principle

**The global rule + skill + agent surface is a LIVING SYSTEM.
Every Council-mediated task produces learning candidates;
candidates that prove valuable in 2+ contexts promote to global
artifacts; artifacts that prove contradictory in practice get
flagged for refresh. The system improves itself with every
interaction, so future-Claude operates on a sharper rule set
than past-Claude did.**

## Hard rules

### 1. Every Council-mediated task emits learning candidates

After every Phase 3 (Implementation) of the Council Protocol,
the assistant writes ≥ 1 learning-candidate event to:

- Workspace-level: `<workspace>/.claude/audits/learning-events.jsonl`
- Global-level: `~/.claude/audits/learning-events.jsonl`

Each event records:

```jsonc
{
  "timestamp": "2026-05-26T12:34:56Z",
  "session_id": "<uuid>",
  "workspace": "<absolute path>",
  "task_summary": "<one line>",
  "council_divisions_engaged": ["1", "2", "3", "4", "5", ...],
  "rules_applied": ["task-intake-due-diligence.md", "reuse-first.md", ...],
  "skills_applied": ["frontend-patterns", "vue3-patterns"],
  "agents_invoked": ["architect", "code-reviewer"],
  "what_worked": ["<bullet>", "<bullet>"],
  "what_failed": ["<bullet>", "<bullet>"],
  "candidate_refinement": {
    "target": "<rule/skill/agent path>",
    "kind": "add|update|remove|rename",
    "description": "<one paragraph>",
    "rationale": "<why this refinement>",
    "scope": "global|workspace",
    "confidence": 0.0
  }
}
```

### 2. Candidates are reviewed periodically — not silently
applied

The assistant does NOT silently mutate global / workspace
rules. Candidates accumulate; once per session (or on
explicit `/learn` invocation), the assistant batches them
and presents the high-confidence ones via AskUserQuestion.

Approval policy:

- **Confidence ≥ 0.8** AND **appeared in 2+ sessions**:
  recommended for application
- **Confidence ≥ 0.6** AND **appeared once**: recommended for
  review
- **Confidence < 0.6**: deferred (kept in the event log)

The user has the final say. Approved candidates update the
artifact in the same session; rejected candidates are marked
`status: rejected` in the event log.

### 3. Promotion: workspace → global (per
`rule-authoring-global-vs-project.md` rule 7)

A candidate that appears in 2+ workspaces is eligible for
promotion to global:

1. The agent detects the cross-workspace pattern (same
   refinement target shape across `<workspace>/.claude/audits/
   learning-events.jsonl` files).
2. Surfaces via AskUserQuestion: "Pattern observed in
   workspaces A and B. Promote to global?"
3. On approval: extract the generic principle (per the
   rule-authoring purity rules — no workspace names, no
   incident-specific dates); write to global.
4. Replace workspace copies with redirects.

### 4. Demotion: global → workspace (per
`rule-authoring-global-vs-project.md` rule 6)

A global rule that turns out to be workspace-specific gets
demoted. Same flow in reverse.

### 5. Contradictions trigger refresh review

When a rule is contradicted in practice (the agent overrides
it 5+ times in 30 days, the user vetoes it explicitly, two
rules disagree on the same point), the assistant:

1. Logs a `rule-contradiction` event.
2. Surfaces a review prompt: "Rule X has been contradicted N
   times. Refresh?"
3. On user approval: the rule is downgraded to "advisory"
   status pending revision; the body acquires a "Last
   contradicted: <date>; pending refresh" footer.

### 6. Every artifact has a `learning_hooks` section

Every rule + skill + agent acquires a short `learning_hooks`
section (or footer) naming:

- **Signals to watch**: what observations matter for refining
  this artifact (e.g., "every time S3776 fires, log the
  function name + complexity score; if same function names
  keep firing, the rule's complexity cap needs review")
- **Refinement candidates**: what kinds of refinement this
  artifact accepts (e.g., "new banned pattern", "new
  cross-reference", "updated threshold")

For newly-authored artifacts, the section is part of the
initial draft. Existing artifacts acquire the section during the
next routine touch.

### 7. The `continuous-learning-v2` skill is the implementation
arm

The skill at `~/.claude/skills/continuous-learning-v2/` handles:

- Hook events (PostToolUse, SessionEnd, SessionStart)
- Candidate emission (writing to the .jsonl)
- Candidate clustering (same-shape across workspaces)
- Batched review prompts
- Approved-refinement application

This rule mandates the BEHAVIOUR; the skill implements the
MECHANICS.

### 8. Operator interface: `/learn`, `/evolve`, `/instinct-*`

Operator-facing commands wired to this loop:

| Command | Purpose |
| --- | --- |
| `/learn` | Batch + review pending learning candidates in the current workspace |
| `/learn-eval` | Self-evaluate quality of a candidate before saving + determine global vs project location |
| `/evolve` | Cluster related candidates into a new skill / command / agent draft |
| `/instinct-export` | Export learnings as a shareable bundle (for teammates / other projects) |
| `/instinct-import` | Import learnings from a bundle |
| `/instinct-status` | Show current candidates + their confidence levels |

These commands exist (under `~/.claude/commands/`) and are
the user's manual override interface to the learning loop.

### 9. Council integration

The Council Protocol carries learning hooks:

- **Council Phase 2** (Consensus) acquires a new output:
  "Learning signals expected" — what observation, if seen
  later, will confirm the decision was right.
- **Council Phase 3** (Implementation) closes with: "Learning
  event emitted" — confirming the audit entry exists.

### 10. The learning surface is auditable

The `audits/learning-events.jsonl` file is human-readable +
greppable + version-controlled (gitignored in the working
tree but kept as durable per-workspace state). The user can
audit ANY past learning candidate's lifecycle:

- When it emitted
- What confidence it carried
- When it was reviewed
- Whether it was approved / rejected / deferred
- What artifact it eventually affected

Silent learning (where the system mutates without an audit
trail) is forbidden.

## Anti-patterns

### Anti-pattern 1: silent rule mutation

The agent updates a global rule based on one session's
observation. Wrong — requires confidence ≥ 0.8, 2+
sessions, AND explicit user approval.

### Anti-pattern 2: rule sprawl

Every minor observation becomes a new rule. Wrong —
candidates cluster into existing rules first; new rules are
created only when the principle is genuinely new.

### Anti-pattern 3: candidate hoarding

Candidates accumulate forever, never reviewed. Wrong — the
learning batch fires at every session boundary by default.

### Anti-pattern 4: low-confidence approval

The agent approves a candidate the user hasn't explicitly
greenlit. Wrong — user has the final say on every approval.

### Anti-pattern 5: forgetting to demote

A rule contradicted repeatedly stays at "Accepted" status
silently. Wrong — contradictions trigger refresh review per
rule 5.

## Cross-references

- `rule-authoring-global-vs-project.md` — classification of
  refinements (global vs project)
- `project-scoped-artifacts.md` — workspace-side learning
  loop
- `plan-execution-progress.md` — learning candidates emit as
  part of phase-end progress reporting
- `continuous-learning-v2` skill — implementation arm
- `/learn`, `/evolve`, `/instinct-*` commands — operator
  interface
- Council Protocol — Phase 2 (Consensus) emits "Learning signals
  expected"; Phase 3 (Implementation) emits "Learning event
  emitted"

## Why this rule exists

A static rule set degrades over time:

- New languages, frameworks, vendors emerge — rules don't
  cover them
- Incident classes evolve — rules optimised for last year's
  bugs miss this year's
- Cross-project patterns surface — they should be hoisted to
  global once observed twice
- Project specifics drift INTO global silently — they should
  be demoted

Without an explicit learning loop, the rule set becomes a
museum: fine for past sessions, stale for current ones. The
loop makes the rule set a living system that gets sharper
with every interaction.

User directive (verbatim): **"Continous leanring should be
baked into all agents, the council, skils and rules."**

## Learning hooks

Per this very rule (self-referential):

**Signals to watch**:
- Council-mediated task ends without a `learning-candidate` event emitted (rule 1 violation)
- Candidate auto-applied without user review prompt (rule 2 violation — silent mutation)
- Candidate observed in 2+ workspaces but never promoted to global (rule 3 weakening — promotion gap)
- Global rule contradicted 5+ times in 30 days but not flagged for refresh (rule 5 weakening — demotion gap)
- New rule / skill / agent shipped without `## Learning hooks` section (rule 6 violation — meta-rule)
- `/learn` invoked but no candidate batch surfaced (continuous-learning-v2 skill drift)
- Council Phase 2 ends without "Learning signals expected" output (rule 9 weakening)
- Council Phase 3 ends without "Learning event emitted" confirmation (rule 9 weakening)
- Learning-events.jsonl accumulates > 100 unreviewed candidates (review cadence weakening)
- Rule downgraded to "advisory" but still cited as enforced in agents / skills (status drift)

**Refinement candidates**:
- Tightening of the confidence-threshold table when low-confidence approvals prove load-bearing
- New event-schema field when a recurring learning class needs additional context (e.g., session-id, parent-plan-slug, rule-affected list)
- New cross-reference when a sister rule changes the artifact shape the loop depends on
- Promotion of `/learn` from manual invocation to scheduled batch when the user's session cadence makes manual triggering miss candidates
