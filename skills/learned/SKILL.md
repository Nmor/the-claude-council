---
name: learned
description: Staging area for learning-loop outputs. Holds artifacts captured by continuous-learning-v2 + /learn + /evolve commands awaiting review, promotion, or demotion per the continuous-learning-mandate.md global rule.
---

# Learned — Learning-Loop Staging Area

This directory is the **staging area** for outputs of the continuous-learning loop defined in `~/.claude/rules/common/continuous-learning-mandate.md`. It is NOT a skill that auto-fires on file triggers; it is a holding pen for in-flight learnings that have not yet been promoted to a permanent rule / skill / agent / memory.

## What lives here

| Type | What it is | Lifecycle |
| --- | --- | --- |
| `candidate_<slug>.md` | A proposed refinement (new rule, new banned pattern, new cross-reference, threshold change) awaiting user review | review → approve/reject/defer |
| `cluster_<slug>.md` | A cross-workspace pattern detected by the loop (same shape in 2+ workspaces) eligible for promotion to global | promote → land in `rules/common/` or `skills/<name>/` |
| `demotion_<slug>.md` | A global rule / skill flagged for demotion to workspace because it carries workspace-specific content | demote → land in `<workspace>/.claude/rules/` |
| `contradiction_<slug>.md` | A rule contradicted in practice (overridden 5+ times in 30 days, vetoed by user, conflicting with another rule) | refresh-review → update rule or downgrade to advisory |

## Lifecycle states

1. **Captured** — emitted by an agent / `/learn` / `/evolve` to this directory
2. **Reviewed** — user inspected (via AskUserQuestion or manual review)
3. **Approved / Rejected / Deferred** — disposition recorded in the file's frontmatter
4. **Applied** — for approved candidates, the change is made to the target artifact
5. **Archived** — moved to `~/.claude/audits/learning-archive/<YYYY>/<MM>/` after disposition

## How candidates land here

Per `continuous-learning-mandate.md`:

- After every Council-mediated task, an agent emits a learning-candidate event to `~/.claude/audits/learning-events.jsonl`
- High-confidence candidates (confidence ≥ 0.8) appearing in 2+ sessions are batched + presented for review
- Approved candidates become files in this directory pending application to the target

## Operator interface

The following commands interact with this directory:

| Command | Action |
| --- | --- |
| `/learn` | Batch + review pending candidates; create files here for approved-but-not-yet-applied refinements |
| `/learn-eval` | Self-evaluate a candidate's quality + determine global vs project location |
| `/evolve` | Cluster related candidates into a draft skill / command / agent here |
| `/instinct-status` | Show current candidates here + their confidence + disposition state |
| `/instinct-export` | Bundle this directory's contents for sharing across teams / projects |
| `/instinct-import` | Import a learning bundle into this directory |

## Why this directory exists (not a regular skill)

Regular skills under `~/.claude/skills/<name>/` auto-fire on file triggers per `auto-skills.md`. This one does NOT — it is operator-facing infrastructure for the learning system. Its presence signals to agents that:

- Learning candidates have a defined home
- The loop is wired (not aspirational)
- The user can audit + control what enters the global rule / skill / agent surface
- Silent rule mutation is forbidden (per `continuous-learning-mandate.md` Anti-pattern 1)

## Cross-references

- `~/.claude/rules/common/continuous-learning-mandate.md` — the mandate that defines the loop
- `~/.claude/rules/common/rule-authoring-global-vs-project.md` — classification of approved candidates (global vs project)
- `~/.claude/rules/common/project-scoped-artifacts.md` — workspace-side learning loops
- `~/.claude/audits/learning-events.jsonl` — the canonical event log
- `~/.claude/audits/learning-archive/` — final disposition store for processed candidates
- `~/.claude/skills/continuous-learning-v2/SKILL.md` — the implementation arm of the loop

## Purpose

Final-disposition processor for learning candidates. Once
`continuous-learning-v2` has surfaced candidates and the user
has approved (or rejected / deferred) them, `learned` applies
the approved refinement to the target artifact, archives the
event with disposition + actor + timestamp, and closes the
loop.

**Negative scope** (NOT what this skill covers):

- Candidate emission — `continuous-learning-v2` owns that
- Batch review prompt — `continuous-learning-v2` orchestrates
- Authoring brand-new rules — see
  `rule-authoring-global-vs-project.md` and
  `principal-level-mandate.md`

## When NOT to use

- Candidates that haven't been approved yet
- Direct rule edits the user makes outside the candidate
  workflow (those don't need the archival step)

## Standards Cited

- **NIST SP 800-92** — Log management (archive retention +
  integrity)
- **NIST SP 800-53 Rev 5 §AU-9** — Protection of audit
  information (learning-archive is append-only with
  integrity)
- **ISO/IEC 27001:2022 Annex A.5.28** — Collection of
  evidence (archived events are evidence of rule evolution)
- **ISO/IEC 27037:2012** — Digital evidence handling
- **OWASP ASVS 4.0.3 §V7.1** — Log content (timestamp +
  actor + event-id required on every archived candidate)
- **CWE-117** — Improper Output Neutralization for Logs
  (archive entries sanitised before write)
- **`~/.claude/rules-library/common/audit-logging.md`** — applies to
  learning-archive structure
- **`~/.claude/rules/common/continuous-learning-mandate.md`**
  — the umbrella rule

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Apply candidate without archiving the disposition | Loses provenance; can't audit rule evolution | Archive THEN apply; both in one atomic op |
| Archive without sanitisation | Sensitive content (paths / tokens) leaks into audit log | Strip secrets per `audit-logging.md` Rule 4 |
| Mutable archive entries | Tamper risk; provenance invalid | Append-only `learning-archive/` directory; never edit past entries |
| Batched candidate apply without per-target rationale | One PR commits 10 unrelated rule edits; hard to revert | One candidate = one logical commit; rationale in commit message |
| Approved candidates linger un-applied | Drift between intent + state | Apply within the same session that approved |
| Skip the disposition state | Future debug can't tell "rejected" from "missed" | Every event has `disposition: applied \| rejected \| deferred \| superseded` |
| Archive grows unbounded | Disk + cognitive load | Rotation policy: per-year subdirectory, compress > 1 year old |

## Verification Checklist

- [ ] Approved candidate applied to the correct target path
- [ ] Archived event includes timestamp + actor +
      disposition + diff-summary
- [ ] No secrets / PII in archive content
- [ ] Append-only enforcement on `learning-archive/`
      (file-system permissions or git protected branch)
- [ ] Disposition states defined: applied / rejected /
      deferred / superseded
- [ ] Annual rotation policy active (per-year subdirectory)
- [ ] Cross-reference from archived event back to the
      candidate's source session

## Cross-References

- `~/.claude/skills/continuous-learning-v2/SKILL.md` —
  emission + review (this skill is the apply + archive arm)
- `~/.claude/rules/common/continuous-learning-mandate.md` —
  the policy umbrella
- `~/.claude/rules-library/common/audit-logging.md` —
  learning-archive obeys the audit-log shape
- `~/.claude/rules/common/rule-authoring-global-vs-project.md`
  — applies before the `learned` apply step (classification)
- `~/.claude/audits/learning-events.jsonl` — input source
- `~/.claude/audits/learning-archive/` — output sink

## Why this skill exists

Approved candidates that don't get applied are wishful
thinking; applied candidates without provenance can't be
audited. `learned` closes both gaps: it APPLIES the
refinement (so intent matches state) AND archives the event
(so evolution is auditable). Cost: one archival write per
approved candidate. Benefit: a ruleset whose evolution is
itself a first-class artifact, queryable + reviewable
years later.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Approved learning candidate not reflected in the targeted artifact (loop-closure gap — file edit step skipped)
- Candidate marked `applied` but the file diff doesn't contain the refinement (false-positive status)
- Candidate disposition (`applied` / `rejected` / `deferred`) absent — events stay in pending limbo
- Multiple candidates with same target artifact processed individually instead of batched (edit-conflict + churn risk)
- `learning-archive/` grows without rotation (archive bloat — needs periodic pruning policy)
- Cross-workspace promotion candidate not surfaced after 2+ workspaces show same shape (per `rule-authoring-global-vs-project.md` rule 7)
- Project-specific candidate landed in global (rule-authoring purity violation — `learned` skill should classify before applying)
- Operator (user) approves candidate but next-session-Claude doesn't see the refinement (the artifact edit didn't happen this turn)

**Refinement candidates**:

- New disposition state when a recurring outcome (e.g., "queued for next major version", "blocked on external dep") doesn't fit existing slots
- Archive-rotation policy when `learning-archive/` exceeds size threshold
- Batched-edit protocol when multiple candidates target the same file
- Auto-classification per `rule-authoring-global-vs-project.md` when candidate text contains project-specific tokens (regex-match for known workspace names)
