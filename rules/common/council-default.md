# Council-by-Default Rule (Always-On, Global)

> Auto-fires on every file. Sister to `~/.claude/CLAUDE.md` (the
> Council protocol), `council-triggers.md` (per-division engagement
> signals), `task-intake-due-diligence.md` (Phase 0 intake), every
> agent file under `~/.claude/agents/`.

## Core Principle

**The Council convenes on EVERY interaction, every request, every
comment on the coding environment. The Core Five Divisions
(Architecture, Implementation, Quality, Security, Testing) always
speak. The Extended Eleven (Compliance, Product/UX, Operations,
Data, Finance, Risk, Strategy, People, ESG, AI Ethics,
Communications) auto-fire per the trigger ruleset in
`council-triggers.md`. No request, comment, or
coding-environment interaction bypasses Council.**

The Council is the default mode. Not "use Council for big things";
the Council IS the operating mode. Trivial tasks get an abbreviated
Council; complex tasks get the full protocol. Zero tasks get zero
Council.

## What this rule replaces

Earlier versions of the Council protocol allowed:

- "Quick Council Check" mode that skipped divisions
- `*` prefix that bypassed Council entirely
- Implicit "small fix = no Council" judgment

Those are GONE. The new model:

| Task class | Council shape |
| --- | --- |
| **Trivial** (typo fix, single-line edit, doc tweak) | Abbreviated Council: each Core Division speaks in 1-2 sentences |
| **Standard** (bug fix, small feature, refactor) | Full Council Phase 0-1-2-3 protocol with terse responses |
| **Critical** (auth changes, payments, schema migrations, third-party integrations) | Extended Council: all relevant Extended Divisions also engage |
| **Strategic** (architecture decisions, vendor selection, new product surfaces) | Extended Council + ADR + user approval gate |

## Hard rules

### 1. Core Five always speak

Every task — every single task — gets at minimum a one-sentence
position from EACH of:

1. **Architecture & Planning** (architect + planner)
2. **Implementation & Build** (build-error-resolver,
   go-build-resolver, refactor-cleaner, database-reviewer,
   infra-reviewer when added)
3. **Quality & Review** (code-reviewer, go-reviewer,
   python-reviewer, java-reviewer + mobile-reviewer when added,
   doc-updater)
4. **Security** (security-reviewer)
5. **Testing & QA** (tdd-guide, e2e-runner,
   performance-reviewer when added)

Five sentences is the floor. Each must reflect real analysis,
not boilerplate ("looks fine").

### 2. Extended Eleven auto-fire on signals

Per `council-triggers.md`, the eleven Extended Divisions fire
when their trigger conditions match. No manual invocation
needed; the file content + change scope + keywords drive
engagement.

| # | Division | Auto-fires on |
| --- | --- | --- |
| 6 | Compliance & Legal | PII / GDPR / CCPA / HIPAA / PCI / SOC2 / payments / licensing |
| 7 | Product / UX / CX | UI files, copy changes, accessibility, error messages |
| 8 | Operations & Reliability | Runbook, SLO, deploy, on-call, monitoring |
| 9 | Data & Analytics | Schema, events, PII flows, analytics pipelines |
| 10 | Finance & FinOps | Cloud cost, unit economics, ROI, budget impact |
| 11 | Risk Management | BCP/DR, scenario planning, blast-radius, change risk |
| 12 | Strategy & Innovation | New features, market positioning, R&D, deprecation |
| 13 | People & Culture | Knowledge mgmt, hiring criteria, dev experience |
| 14 | Sustainability & ESG | Cloud carbon, ethical sourcing, ESG reporting |
| 15 | Ethics & Responsible AI | AI/ML work, model selection, bias, fairness |
| 16 | Communications & Documentation | Public artifacts, API docs, release notes |

### 3. `*` prefix narrowed in scope

The `*` prefix was previously a Council bypass. It is now:

- `*` prefix = skip the prompt-improver clarification step ONLY
- The Council still convenes
- The full Phase 0-1-2-3 protocol still runs
- Bypassing Council is impossible without org-admin override

### 4. Bypass attempts are logged

Per `audit-logging.md` — any attempt to bypass Council is
captured:

```jsonc
// ~/.claude/audits/bypass-log.jsonl
{
  "event": "council.bypass_attempted",
  "timestamp": "2026-05-26T14:32:18Z",
  "session_id": "...",
  "prompt": "<truncated>",
  "claimed_reason": "<user said this>",
  "actor": "user@example.com",
  "outcome": "denied — Council convened anyway"
}
```

Bypass attempts are not honoured; they're recorded so the
pattern is visible.

### 5. Tiebreaker matrix

When divisions disagree, named tiebreakers apply:

| Disagreement type | Decided by |
| --- | --- |
| Technical (architecture vs implementation) | **Division 1 (Architecture)** has casting vote |
| Security finding | **Division 4 (Security)** has VETO on BLOCKER |
| Regulatory finding | **Division 6 (Compliance)** has VETO on regulatory blocker |
| AI/ML safety | **Division 15 (Ethics)** has VETO on AI safety / fairness finding |
| Change scope > defined limit | **Division 11 (Risk)** has VETO on out-of-scope blast |
| Unresolved consensus | Escalate to user with named options |

Vetoes are explicit; they're documented in the Council
consensus block.

### 6. Speed mode is faster, not different

The "Abbreviated Council Check" mode is a SPEED option:

- Each division speaks in 2-3 sentences
- Phase 0 (intake) uses the compact table form per
  `task-intake-due-diligence.md`
- Phase 1 (discussion) is terse
- Phase 2 (consensus) is one paragraph
- Phase 3 (implementation) follows

It is NOT "skip divisions." Every division still speaks. The
shape is preserved; only the verbosity changes.

### 7. The Council mediates EVERY external surface

When work touches:

- Customer-facing UI
- Public API
- Marketing copy
- Email templates
- Push / SMS notifications
- Documentation
- Status page

— Divisions 7 (UX), 16 (Comms), 6 (Compliance — if claims are
regulated) all engage. The user-facing surface is the most
visible artifact of the team; it gets the full review.

### 8. The Council mediates EVERY internal surface that scales

When work touches:

- Database schema
- Event payload
- Service-to-service API
- Authentication mechanism
- Logging format
- Deploy configuration
- Build pipeline

— Divisions 1 (Architecture), 2 (Implementation), 4 (Security),
8 (Operations) engage. Internal surfaces compound; getting them
right matters for years.

### 9. Council is the source of GO/NO-GO

Implementation does not begin until:

- All relevant divisions have spoken
- Consensus reached (per the tiebreaker matrix)
- Explicit GO decision recorded

NO-GO outcomes:

- Insufficient research (Phase 0 incomplete)
- Security veto active
- Compliance veto active
- Ethics veto active
- Risk veto active
- Divisions cannot reach consensus → escalate to user

### 10. Post-implementation Council reconvenes

After implementation, per `~/.claude/CLAUDE.md`:

- Architecture & Planning: matches approved design
- Implementation & Build: code clean, tests pass
- Quality & Review: code quality + documentation
- Security: no new vulnerabilities
- Testing & QA: tests pass + coverage met
- Plus any Extended Divisions that fired on the way in

Each verifies its column of the post-implementation review. The
"FINAL VERDICT" (APPROVED / CHANGES REQUIRED / BLOCKED) is the
Council's collective output.

## Why this rule replaces the bypass model

The earlier model assumed Council was "overhead" that could be
opted out of for small tasks. In practice:

- "Small" tasks frequently revealed security / compliance /
  regulatory implications mid-execution (a "one-line config
  change" updates GDPR consent UX)
- The Quick Check mode degraded into "skip Council and move
  fast"
- Bypass attempts proliferated; trust in Council eroded
- Real failures happened in tasks that "shouldn't have needed"
  Council

The new model: Council ALWAYS convenes. The COST of convening
is small (the divisions are agents; calling them is automatic).
The VALUE is consistent — every task gets every relevant
perspective.

## Speed without skipping

To keep velocity high while keeping Council always-on:

- **Use the abbreviated mode** for trivial work
- **Use the compact intake table** instead of per-question
  subsections
- **Parallelise division analysis** — divisions don't run
  sequentially; they all analyse the same context concurrently
- **Cache prior findings** — if a similar task was done last
  session, the intake + research are reusable
- **Delegate to specialised agents** when their expertise is
  needed (per the Agent Delegation Guide in CLAUDE.md)

## Verification block

Every Council-mediated task ends with:

```text
Council (this turn):
  - Division 1 (Architecture): <position>
  - Division 2 (Implementation): <position>
  - Division 3 (Quality): <position>
  - Division 4 (Security): <position>
  - Division 5 (Testing): <position>
  Extended fired: 6 (Compliance — GDPR consent UI), 7 (UX — copy review)
  Consensus: GO
  Tiebreaker invoked: N/A
  Bypass attempts: 0
```

A task that lacks this block is a task that didn't pass through
Council. That's a violation.

## Cross-references

- `~/.claude/CLAUDE.md` — the Council protocol (this rule is the
  meta-rule defining when it fires)
- `council-triggers.md` — per-division engagement signals
- `task-intake-due-diligence.md` — Phase 0 intake (29 questions)
- `audit-logging.md` — bypass attempts logged
- `verify-before-claim.md` — completion claims tied to Council
  verification
- `plan-execution-progress.md` — Council output structures
  progress updates
- Every agent file — agents are Council members; the Council
  rule defines when they speak

## Why this rule exists

Council-as-default is the cultural commitment: every interaction
benefits from the full team's expertise; no task is "too small"
to consult; no contributor is "too trusted" to skip review. The
Council is not friction — it's the system's intelligence,
applied consistently.

User directive (verbatim): "Council must be the default for
every request / ask / comment on the coding environment. Close
every bypass — no more `*`-prefix skip, no more 'quick check'
shortcut."

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Task shipped without a Council verification block (Council bypass attempted)
- Core Five division speaks in boilerplate ("looks fine") instead of real analysis (rule 1 weakening)
- Extended Division trigger matched but Division did not engage (council-triggers.md miscalibration)
- Tiebreaker invoked but the outcome contradicts the tiebreaker matrix (matrix needs review)
- Veto invoked without explicit documentation in the consensus block (rule 5 enforcement weak)
- Abbreviated mode degraded into zero-Council in practice (speed-mode discipline weak)
- Post-implementation review skipped on a Council-mediated task (rule 10 violation)

**Refinement candidates**:

- New trigger row in `council-triggers.md` when a Division consistently engages on a pattern that wasn't in its trigger ruleset
- Tightening of the tiebreaker matrix when an ambiguity surfaces in practice
- New row in the task-class table when a new shape of work needs its own Council pacing
- New cross-reference when Phase 0 / Phase 1 / Phase 2 / Phase 3 protocol gains a load-bearing artifact
