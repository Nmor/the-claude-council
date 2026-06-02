---
name: continuous-learning-v2
description: Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and evolves them into skills/commands/agents.
version: 2.0.0
---

# Continuous Learning v2 - Instinct-Based Architecture

An advanced learning system that turns your Claude Code sessions into reusable knowledge through atomic "instincts" - small learned behaviors with confidence scoring.

## When to Activate

- Setting up automatic learning from Claude Code sessions
- Configuring instinct-based behavior extraction via hooks
- Tuning confidence thresholds for learned behaviors
- Reviewing, exporting, or importing instinct libraries
- Evolving instincts into full skills, commands, or agents

## What's New in v2

| Feature | v1 | v2 |
|---------|----|----|
| Observation | Stop hook (session end) | PreToolUse/PostToolUse (100% reliable) |
| Analysis | Main context | Background agent (Haiku) |
| Granularity | Full skills | Atomic "instincts" |
| Confidence | None | 0.3-0.9 weighted |
| Evolution | Direct to skill | Instincts → cluster → skill/command/agent |
| Sharing | None | Export/import instincts |

## The Instinct Model

An instinct is a small learned behavior:

```yaml
---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.7
domain: "code-style"
source: "session-observation"
---

# Prefer Functional Style

## Action
Use functional patterns over classes when appropriate.

## Evidence
- Observed 5 instances of functional pattern preference
- User corrected class-based approach to functional on 2025-01-15
```

**Properties:**

- **Atomic** — one trigger, one action
- **Confidence-weighted** — 0.3 = tentative, 0.9 = near certain
- **Domain-tagged** — code-style, testing, git, debugging, workflow, etc.
- **Evidence-backed** — tracks what observations created it

## How It Works

```text
Session Activity
      │
      │ Hooks capture prompts + tool use (100% reliable)
      ▼
┌─────────────────────────────────────────┐
│         observations.jsonl              │
│   (prompts, tool calls, outcomes)       │
└─────────────────────────────────────────┘
      │
      │ Observer agent reads (background, Haiku)
      ▼
┌─────────────────────────────────────────┐
│          PATTERN DETECTION              │
│   • User corrections → instinct         │
│   • Error resolutions → instinct        │
│   • Repeated workflows → instinct       │
└─────────────────────────────────────────┘
      │
      │ Creates/updates
      ▼
┌─────────────────────────────────────────┐
│         instincts/personal/             │
│   • prefer-functional.md (0.7)          │
│   • always-test-first.md (0.9)          │
│   • use-zod-validation.md (0.6)         │
└─────────────────────────────────────────┘
      │
      │ /evolve clusters
      ▼
┌─────────────────────────────────────────┐
│              evolved/                   │
│   • commands/new-feature.md             │
│   • skills/testing-workflow.md          │
│   • agents/refactor-specialist.md       │
└─────────────────────────────────────────┘
```

## Quick Start

### 1. Enable Observation Hooks

Add to your `~/.claude/settings.json`.

**If installed as a plugin** (recommended):

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/hooks/observe.sh pre"
      }]
    }],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/hooks/observe.sh post"
      }]
    }]
  }
}
```

**If installed manually** to `~/.claude/skills`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning-v2/hooks/observe.sh pre"
      }]
    }],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning-v2/hooks/observe.sh post"
      }]
    }]
  }
}
```

### 2. Initialize Directory Structure

The Python CLI will create these automatically, but you can also create them manually:

```bash
mkdir -p ~/.claude/homunculus/{instincts/{personal,inherited},evolved/{agents,skills,commands}}
touch ~/.claude/homunculus/observations.jsonl
```

### 3. Use the Instinct Commands

```bash
/instinct-status     # Show learned instincts with confidence scores
/evolve              # Cluster related instincts into skills/commands
/instinct-export     # Export instincts for sharing
/instinct-import     # Import instincts from others
```

## Commands

| Command | Description |
|---------|-------------|
| `/instinct-status` | Show all learned instincts with confidence |
| `/evolve` | Cluster related instincts into skills/commands |
| `/instinct-export` | Export instincts for sharing |
| `/instinct-import <file>` | Import instincts from others |

### Background observer (manual launch)

The observer agent runs on a schedule from the hook system. To
control it manually, use the CLI helper script:

```bash
bash agents/start-observer.sh         # Start observer in background
bash agents/start-observer.sh status  # Check if observer is running
bash agents/start-observer.sh stop    # Stop the running observer
```

The script lives at
[`agents/start-observer.sh`](agents/start-observer.sh) and writes
its PID to `${CONFIG_DIR}/.observer.pid`. The observer agent
definition is at [`agents/observer.md`](agents/observer.md).

## Configuration

Edit `config.json`:

```json
{
  "version": "2.0",
  "observation": {
    "enabled": true,
    "store_path": "~/.claude/homunculus/observations.jsonl",
    "max_file_size_mb": 10,
    "archive_after_days": 7
  },
  "instincts": {
    "personal_path": "~/.claude/homunculus/instincts/personal/",
    "inherited_path": "~/.claude/homunculus/instincts/inherited/",
    "min_confidence": 0.3,
    "auto_approve_threshold": 0.7,
    "confidence_decay_rate": 0.05
  },
  "observer": {
    "enabled": true,
    "model": "haiku",
    "run_interval_minutes": 5,
    "patterns_to_detect": [
      "user_corrections",
      "error_resolutions",
      "repeated_workflows",
      "tool_preferences"
    ]
  },
  "evolution": {
    "cluster_threshold": 3,
    "evolved_path": "~/.claude/homunculus/evolved/"
  }
}
```

## File Structure

```text
~/.claude/homunculus/
├── identity.json           # Your profile, technical level
├── observations.jsonl      # Current session observations
├── observations.archive/   # Processed observations
├── instincts/
│   ├── personal/           # Auto-learned instincts
│   └── inherited/          # Imported from others
└── evolved/
    ├── agents/             # Generated specialist agents
    ├── skills/             # Generated skills
    └── commands/           # Generated commands
```

## Integration with Skill Creator

When you use the [Skill Creator GitHub App](https://skill-creator.app), it now generates **both**:

- Traditional SKILL.md files (for backward compatibility)
- Instinct collections (for v2 learning system)

Instincts from repo analysis have `source: "repo-analysis"` and include the source repository URL.

## Confidence Scoring

Confidence evolves over time:

| Score | Meaning | Behavior |
|-------|---------|----------|
| 0.3 | Tentative | Suggested but not enforced |
| 0.5 | Moderate | Applied when relevant |
| 0.7 | Strong | Auto-approved for application |
| 0.9 | Near-certain | Core behavior |

**Confidence increases** when:

- Pattern is repeatedly observed
- User doesn't correct the suggested behavior
- Similar instincts from other sources agree

**Confidence decreases** when:

- User explicitly corrects the behavior
- Pattern isn't observed for extended periods
- Contradicting evidence appears

## Why Hooks vs Skills for Observation?

> "v1 relied on skills to observe. Skills are probabilistic—they fire ~50-80% of the time based on Claude's judgment."

Hooks fire **100% of the time**, deterministically. This means:

- Every tool call is observed
- No patterns are missed
- Learning is comprehensive

## Backward Compatibility

v2 is fully compatible with v1:

- Existing `~/.claude/skills/learned/` skills still work
- Stop hook still runs (but now also feeds into v2)
- Gradual migration path: run both in parallel

## Privacy

- Observations stay **local** on your machine
- Only **instincts** (patterns) can be exported
- No actual code or conversation content is shared
- You control what gets exported

## Related

- [Skill Creator](https://skill-creator.app) - Generate instincts from repo history
- [Homunculus](https://github.com/humanplane/homunculus) - Inspiration for v2 architecture
- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - Continuous learning section

---

*Instinct-based learning: teaching Claude your patterns, one observation at a time.*

## Purpose

Implementation arm of the continuous-learning-mandate: emit
`learning-candidate` events on every Council-mediated task,
score them with calibrated confidence, batch them for user
review, and apply approved refinements to global / workspace
rules / skills / agents. Closes the loop that makes the
ruleset sharper over time instead of stale.

**Negative scope** (NOT what this skill covers):

- Authoring new rules from scratch — see
  `rule-authoring-global-vs-project.md`
- Workspace-side learning bootstrap — see
  `project-scoped-artifacts.md`
- Manual rule edits without going through the candidate
  workflow

## When NOT to use

- One-off observations the user explicitly says don't
  generalise
- Trivial preferences already covered by an existing rule
  (just cite the rule)
- Cross-vendor (Gemini / Codex) — out of current scope

## Standards Cited

- **NIST SP 800-53 Rev 5 §SI-4** — Information system
  monitoring (the learning-event stream IS the monitoring
  surface for rule efficacy)
- **NIST SP 800-218 SSDF §PO.4** — Implement and maintain
  secure development practices (continuous improvement)
- **ISO/IEC 27001:2022 Annex A.5.36** — Compliance with
  policies, rules and standards (audit + refinement loop)
- **ISO/IEC 27005:2022** — Information security risk
  management (refinement candidates are risk-treatment
  outputs)
- **OWASP SAMM v2 — Education + Guidance** — Continuous
  improvement of organisational knowledge
- **CWE-1059** — Insufficient Technical Documentation
  (learning hooks ARE living documentation)
- **`~/.claude/rules/common/continuous-learning-mandate.md`**
  — the rule this skill implements
- **`~/.claude/rules/common/rule-authoring-global-vs-project.md`**
  — promotion / demotion classification

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Auto-applying candidates without user review | Silent rule mutation; surprise effects | Batch + AskUserQuestion approval gate |
| Logging every micro-observation | Signal-to-noise drops; review fatigue | Confidence threshold ≥ 0.6 to log; ≥ 0.8 to recommend |
| One-session rule promotion | Premature generalisation | Require 2+ sessions / workspaces before global promotion |
| Hoarding candidates indefinitely | User loses context; candidates rot | Session-end batch review by default; `/learn` for manual |
| Same candidate fires every session without resolution | Approval-rate metric drift | Auto-archive `deferred` candidates older than 30 days |
| Project-specific learning written to global path | Pollutes global ruleset | Classify via `rule-authoring-global-vs-project.md` first |
| Demotion never happens | Stale global rules linger | Track contradiction count; flag refresh review at 5+ |
| Learning event has no `target` field | Can't apply refinement automatically | Schema enforced: `target: <path>` required |

## Verification Checklist

- [ ] Every Council Phase 3 emits at least one learning-event
      (or explicit "none — no signal")
- [ ] `learning-events.jsonl` schema-validated (required
      fields present)
- [ ] Confidence scoring documented + calibrated against
      user approval rates
- [ ] `/learn` batch review surface works end-to-end
- [ ] Promotion path tested on at least one cross-workspace
      pattern this rebuild
- [ ] Demotion path documented for the next contradicted
      rule

## Cross-References

- `~/.claude/rules/common/continuous-learning-mandate.md` —
  the policy this skill enforces
- `~/.claude/rules/common/rule-authoring-global-vs-project.md`
  — classification of approved refinements
- `~/.claude/rules/common/project-scoped-artifacts.md` —
  workspace-side learning loop
- `~/.claude/skills/learned/SKILL.md` — final-disposition
  archival pattern
- `~/.claude/audits/learning-events.jsonl` — the event store
- `/learn`, `/learn-eval`, `/evolve`, `/instinct-status`
  commands — operator interface

## Why this skill exists

A static ruleset degrades. Languages change, vendors retire
APIs, incident classes evolve, cross-workspace patterns
surface only after multiple incidents. Without an explicit
learning loop, the rules optimised for last quarter's bugs
miss this quarter's. Continuous-learning-v2 turns the
ruleset into a living system: every Council task emits
signals, the signals cluster into refinement candidates,
candidates with track record promote to active rules. Cost:
one batch-review prompt per session. Benefit: a ruleset that
grows sharper rather than stale.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Council-mediated task finishes without a `learning-candidate` event written to `audits/learning-events.jsonl` (mandate rule 1 weakening)
- Candidate emitted with `confidence < 0.6` but auto-applied anyway (review-policy violation)
- Candidate with same shape emitted 5+ times across sessions without surfacing for promotion (workspace → global promotion gap)
- Approved refinement landed without updating the targeted artifact in the same session (loop-closure gap)
- Contradicted rule (`rule-contradiction` event) accumulating ≥ 5 contradictions without refresh review (mandate rule 5 weakening)
- Confidence scoring drifts (same pattern oscillates between 0.5 and 0.85 across sessions — calibration needed)
- Hook events (PostToolUse, SessionEnd, SessionStart) firing without producing candidates (instrumentation gap)
- Operator commands (`/learn`, `/evolve`, `/instinct-*`) failing silently or returning empty batches

**Refinement candidates**:

- New event shape when a recurring learning class (e.g., cross-tool failure correlation, latent rule conflict) needs its own schema
- Confidence-calibration update when scoring proves systematically too-high or too-low against user approval rates
- Promotion / demotion automation when the manual review batches stay stuck for > 4 weeks
- New operator command when a recurring manual workflow surfaces (e.g., `/learn-cluster` to group candidates by target artifact)
