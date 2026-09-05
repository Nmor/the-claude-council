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

**Coverage is mandatory; depth is signal-gated.** Every Core
division (and every triggered Extended division) still ENGAGES
and owns its domain — no domain is ever skipped, and each records
a verdict. But the division's OUTPUT scales to what it found:

- **Material finding or cross-division conflict → go deep.**
  Multi-sentence analysis carrying the trade-off / failure-mode /
  verification signal per `principal-level-mandate.md`. This is
  where generated tokens belong.
- **No material finding → one line, with the one-clause reason it
  checked** — never a bare "looks fine". E.g. "Testing: no
  test-impacting change; existing suite covers the touched path."
  The one-clause reason is the PROOF the division actually
  engaged; it replaces the filler the old fixed floor produced.

Concentrate the deep analysis on the 2-3 divisions that OWN the
change's risk surface (specialist-deep): a security-critical
change gets Security + Compliance at full depth; the rest give
the gated one-liner. Depth on the right owners — not breadth of
ceremony — is where Council quality comes from.

**Shared context in, structured findings out.** Read / distill
the target surface ONCE and fan the divisions out over that
shared context (parallel, single pass) — never N independent
subagents each re-reading the same files and re-paying the same
cold-load. Divisions reason about EACH OTHER'S findings; the
cross-cutting interactions (security × compliance, perf × data-
shape) are exactly where Council value concentrates and where
independent single-slice reviews miss. Each division emits
findings in a structured shape — `severity · file:line · claim ·
owner` — and findings are DEDUPED across divisions before
synthesis, so one issue found by three divisions is one finding
with one owner, not three counted thrice.

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

- Divisions apply the signal-gated discipline of rule 1: the
  risk-owning divisions go deep; no-concern divisions collapse to
  the one-line gated verdict (with the one-clause reason)
- Phase 0 (intake) is trigger-gated per
  `task-intake-due-diligence.md` — the always-fire core plus the
  domain questions whose triggers matched
- Phase 1 (discussion) is terse; depth only where there's a finding
- Phase 2 (consensus) is one paragraph
- Phase 3 (implementation) follows

It is NOT "skip divisions." Every division still ENGAGES and owns
its domain (the coverage guarantee of rule 1 is absolute); what
scales down is the output of divisions that found nothing material
— never the coverage.

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

### 11. Online research is MANDATORY across all three phases

Every Council-mediated task grounds its collection, planning, AND
implementation in CURRENT online research — never the model's prior
knowledge alone. The model has a training cutoff; online research is
how the Council stays recent. This is not optional and needs no
permission (`WebSearch` / `WebFetch` / research `Agent` are always
authorised). It reinforces existing gates — it does not replace them:

- **Phase 0 (collection / intake)** — the always-fire intake core
  per `task-intake-due-diligence.md`: Q29 (online research —
  primary sources only: provider docs / RFC / standard / spec,
  never a Stack Overflow answer or package README as sole ref),
  Q1 (prior-art sweep across OSS / GitHub / npm / PyPI), Q5 (SOTA
  scan of the last 12-24 months).
- **Planning** — before the plan is authored, verify the approach
  against the CURRENT state of the art: latest stable versions,
  recent breaking changes, deprecations, newer best-in-class
  libraries, live security advisories. A plan built on stale recall
  is a plan built to be reworked. Cite sources (URL + section +
  read-date) in the plan's research section.
- **Phase 3 (implementation)** — for any external contract
  (API / SDK / protocol / config / schema), read the primary-source
  docs for the exact surface BEFORE writing the code (per
  `official-docs-first.md`) and validate the real payload shape
  (per `validate-payloads-before-coding.md`).

"I recall X works this way" is NOT acceptable where a lookup
confirms the current truth. Insufficient / stale research is a
NO-GO per rule 9; the GO decision names the primary sources read
this turn. Citations land durably in the plan's research section
and the `docs/provider-research/<provider>.md` file — not in code
comments.

**Enforcement (not documentation-only).** Two layers back this rule: (1) a
`Research (this turn)` block is a completion-claim gate for integration /
external-contract / current-version work (per `verify-before-claim.md` rule 7 —
absent it, the claim is INCOMPLETE); and (2) the `research-gate.js` PreToolUse
hook emits a non-blocking nudge when integration-shaped source is edited before
any `WebSearch`/`WebFetch` runs this session (`research-marker.js` clears it once
research runs).

### 12. Model selection uses the capability-aware ladder

When the Council spawns an agent for a task, it does NOT hardcode the
model — it resolves the agent's role to a model via the ladders in
`model-tier-selection.md` and passes the resolved model on the Agent
call. Each role has an ordered ladder (best-for-the-job → broadly-
available floor); the Council picks the highest-ranked model actually
AVAILABLE in this install (declared in
`~/.claude/.local/model-availability`; default `{opus, sonnet, haiku}`
when absent).

- **Best available, per role.** Strategic / long-horizon / hardest
  non-security work resolves `fable → opus → sonnet`; security &
  regulated review resolves `opus → sonnet` (**Fable excluded** — its
  classifiers refuse security work); mechanical fixes resolve
  `sonnet → haiku`; search resolves `haiku → sonnet`. A Max install
  fields Fable on the hardest work; a Pro / ZDR install automatically
  fields the next-best for that same job.
- **Graceful, audible degradation.** If a resolved model is
  unavailable at runtime (or Fable refuses with no fallback), drop to
  the next ladder rung and SURFACE it (per `no-silent-failures.md`) —
  never a silent downgrade, never a hard failure while a floor model
  is available.
- **No over-provisioning.** The ladder floors keep mechanical / search
  / routine work off the expensive tiers even when Fable is available.

The resolved model appears in the Council verification block
(`Model selection: <role> → <model> (ladder: <ladder>)`).

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

## Speed without skipping — token & context efficiency (research-grounded)

Council is always-on; the discipline is to spend the SMALLEST set of high-signal
tokens per task (Anthropic, *Effective context engineering for AI agents*).
Context is the scarce resource — model quality DEGRADES as the window fills, so a
lean working set is a QUALITY measure, not only a cost one. Rule 1 already defines
the in-Council levers (signal-gated depth, shared-context-in / structured-findings-
out, cross-division dedup, specialist-deep). This section adds the levers Rule 1
does not cover — none weakens a gate:

1. **Subagents are deliberate, not reflexive.** A subagent runs its own context
   and costs ~4× a chat turn; a multi-agent fan-out ~15× (Anthropic, *How we
   built our multi-agent research system*). Spawn one when the task genuinely
   needs a separate context window (reading many files without cluttering the main
   thread) or an adversarial fresh-eyes verifier (the retrospective's Rule 8
   audit) — not to restate analysis the orchestrator can do inline. Match model to
   task: **Opus** for the lead + deep-reasoning reviewers (architecture, security,
   compliance, AI-ethics, risk); **Sonnet** for most reviewers + broad search;
   **Haiku** for mechanical work (doc / codemap generation). An Opus-lead +
   Sonnet-subagent fleet outperformed single-Opus by 90.2% on Anthropic's research
   evals — tiering is a quality win, not a compromise.

2. **Trigger-gated intake + lazy catalogs.** Phase-0 fires its always-fire core +
   only the domain questions whose triggers match (per
   `task-intake-due-diligence.md`); the full per-division trigger / persona
   catalog loads just-in-time via the `council-rules` skill, never on the
   always-on floor. Load context when it's relevant, not before.

3. **Compact output + reuse.** Use the compact intake table + the terse
   abbreviated Council for trivial work; reuse a prior session's intake / research
   when a similar task was already scoped.

4. **Filter verbose command output at the source.** When `rtk` is installed
   (`command -v rtk`), route the commands where it MEASURABLY helps through it —
   chiefly directory listings, which are the worst offenders: a `ls -la` over a
   large package measured 17,595 -> 1,575 characters, a 91% reduction, on a real
   Go service. `rtk err <cmd>` and `rtk test <cmd>` likewise return only the
   failures, which is the part a turn actually needs.

   Scope it to the measured wins and nothing else. On the same codebase `rtk tree`
   over a flat directory and `rtk read` of a whole file returned NO reduction, so
   using them buys an extra process and a dependency for nothing. The published
   "60-90%" is a range across command classes, not a property of the tool — treat
   any new command as unmeasured until it is measured on the repo at hand.

   Never let it swallow signal: a full file the turn genuinely needs is read in
   full, and a diagnostic being read for its detail is read raw. Filtering exists
   to drop noise, not to hide the thing being diagnosed.

The through-line — and why none of this weakens the Council: quality was never
coming from breadth of ceremony; it comes from the right specialist reasoning
deeply, over shared context, on the cases that need judgment.

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
- `task-intake-due-diligence.md` — Phase 0 intake (trigger-gated:
  always-fire core + domain-triggered questions)
- Anthropic, *Effective context engineering for AI agents* —
  <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>
  (the "smallest high-signal token set" principle behind §Speed without skipping)
- Anthropic, *How we built our multi-agent research system* —
  <https://www.anthropic.com/engineering/multi-agent-research-system>
  (subagent ~4×/15× token cost + Opus-lead/Sonnet-subagent 90.2% finding)
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
