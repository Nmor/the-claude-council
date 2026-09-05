# Task Intake — Due Diligence (Always-On, Global)

> Auto-fires on every file. Sister to `reuse-first.md`, `official-docs-first.md`,
> `patterns.md`, `proper-fixes-first.md`, `council-triggers.md` (the intake's
> domain questions fire on the SAME triggers as the Extended divisions). Companion
> to the Council Protocol's Phase 0 — this rule defines the FIRST sub-step of
> Phase 0 every task completes.
>
> **Trigger-gated 2026-07-23.** The intake was "answer all 29 questions on every
> non-trivial task, mark the ~18 inapplicable ones N/A." That is the opposite of
> Anthropic's context-engineering guidance — *"find the smallest set of high-signal
> tokens that maximize the likelihood of your desired outcome"*
> ([effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).
> A 29-row table two-thirds "N/A" buries the load-bearing rows. Now: an
> always-fire CORE of high-signal questions + domain questions that fire
> just-in-time on the same triggers as the Extended divisions. No question was
> removed — every one still fires when its trigger matches; the depth goes where
> the task actually reaches. Sharper due-diligence, fewer tokens.

## Core Principle

**Every task or plan begins with a structured prior-art / due-diligence intake.
The intake surfaces the HIGH-SIGNAL questions for THIS task — the always-fire core
that applies to any non-trivial change, plus the domain questions whose triggers
match — answered in writing BEFORE implementation. Skipping the intake is a
violation of the same severity as skipping `official-docs-first` or `reuse-first`;
so is padding it with N/A rows that bury the questions that matter.**

The user-named directive (verbatim): *"every task or plan must start with a has it
been done before? who did it? who built it? can it be done better? is it scalable?
what to do and all other things in that plan or request and you are always free to
look online."*

## How the intake runs (trigger-gated)

### Always-fire CORE — every non-trivial task (11 questions)

These are high-signal for any non-trivial change; they always appear:

| # | Question | Essence | Depth in |
| --- | --- | --- | --- |
| 1 | Prior art | Swept codebase + sister workspaces + OSS (GitHub/npm/PyPI/…) + vendors; answer is a list with links, not "found nothing" | `reuse-first.md` |
| 2 | Who did it (provenance) | Internal `git blame`/`log --follow` so intent is askable; external maintainer + last-release date (abandoned = not acceptable) | `reuse-first.md` |
| 5 | Can it be done better? | SOTA scan (papers/RFCs/talks, last 12-24mo); verdict: (a) canonical still best, (b) documented improvement, (c) known issue we work around | `official-docs-first.md` |
| 6 | Scalable? | Holds at 10×/100×/1000×? Failure modes at scale (rate limits, pools, backpressure, fan-out); cost shape; named inflection point | — |
| 7 | Integration map | Upstream callers + downstream consumers + shared infra; contracts NOT to break; new integration points; deploy order; rollback shape; observability + docs footprint | `wiring-and-usage-review.md` |
| 8 | FMEA | Per non-trivial component: what fails / user-visible effect / blast radius / detection signal / mitigation | — |
| 9 | Security (STRIDE) | Spoofing/Tampering/Repudiation/Info-disclosure/DoS/Elevation; + supply chain (CVE gate, license gate, publisher allowlist) | `security.md` |
| 14 | Test strategy | unit + integration + contract + e2e as applicable; coverage ≥90% touched / ≥80% project; +property/load/chaos/security/a11y/perf when triggered | `testing.md`, `tdd-workflow` |
| 20 | Documentation footprint | feature page + README + runbook (per new failure mode) + ADR (non-trivial arch) + provider-research (external integration) + changelog | `docs-sync-with-code.md` |
| 27 | What to do (action plan) | Atomic task list per `plan-task-breakdown.md`; explicit reuse/extend/create decision; primary-source citations | `plan-task-breakdown.md` |
| 29 | Online research | Mandatory, no permission needed (WebSearch/WebFetch/Agent); primary sources only (provider docs / RFC / standard), never SO/README as sole ref | `official-docs-first.md` |

### Trigger-gated DOMAIN questions — fire when the trigger matches (18 questions)

Each fires on the SAME trigger that fires its Extended division (per
`council-triggers.md` / the `council-rules` skill) — one trigger system drives
both division engagement AND intake depth. When the trigger doesn't match, the
question is genuinely not applicable and does NOT appear (no N/A row).

| # | Question | Fires when | Division |
| --- | --- | --- | --- |
| 3 | Canonical reference | external integration or a new pattern is introduced | 1 |
| 4 | OSS-vs-custom option | adding a dependency / capability (license + maintained + CVE-clean + adopted + tested + documented → use over custom) | 6 |
| 10 | Data lifecycle | task touches PII / personal / clinical / student data (classification, provenance, storage, transport, retention, access, residency) | 6 / 9 |
| 11 | Compliance | regulated surface (GDPR/CCPA/HIPAA/PCI/SOC2/SOX/FERPA/…): applicable articles + evidence + responsible role | 6 |
| 12 | Accessibility | any UI surface — WCAG 2.2 AA: keyboard, screen-reader, contrast, motion, focus, 24×24 targets, cognitive | 7 |
| 13 | i18n / l10n | UI / user-visible copy: locale coverage, string externalization, RTL, ICU plural, `Intl` formatting, currency, collation | 7 |
| 15 | Observability | new service / hot path: metrics (p50/95/99), structured logs, traces, alerts (each w/ responder), dashboards, explicit SLO | 8 |
| 16 | Cost model | cloud resource of note: compute/storage/network/3p-fees delta; per-tenant scaling; inflection point (forecast today vs 10×) | 10 |
| 17 | Rollback / DR | deploy / migration / destructive op: procedure, feature-flag kill switch, backcompat window, migration reversibility, RPO/RTO | 11 |
| 18 | Deprecation lifecycle | change removes/renames something: announce → soft → hard → remove, with calendar minimums | 12 |
| 19 | UX writing | user-facing copy: tone, clarity, action-oriented labels, specific errors + remedy, a11y, i18n-ready, edge-state copy | 7 |
| 21 | Risk register | destructive op / blast radius beyond one service: top-5 risks (desc/likelihood/impact/mitigation/owner/escalation trigger) | 11 |
| 22 | Success criteria | new feature: outcome metric + guardrail metrics + measurement window + decision criteria + instrumentation | 12 |
| 23 | Post-launch watch | anything deployed: watch period, on-call, tightened thresholds, explicit rollback predicate, scheduled retro | 8 |
| 24 | AI / ML ethics | any ML/AI/LLM/generative/automated-decision surface: use case, model choice, training-data provenance, bias eval, failure mode, human-in-loop, disclosure (EU AI Act), audit log, right-to-explanation | 15 |
| 25 | Vendor / IP / license | new vendor/dependency: TOS+DPA, license compat (`license-allowlist-gate.md`), IP ownership, patent + trademark scan | 6 |
| 26 | Operational handoff | new failure modes / new service: runbook, on-call brief, knowledge transfer (bus-factor ≥ 2), escalation path, vendor SLA contacts | 8 / 13 |
| 28 | All other things | any out-of-band factor: team capacity, release blackouts, cross-team dependencies, marketing/sales/CS coordination, l10n lead time | 12 / 16 |

The full per-question depth (worked examples, exhaustive sub-checklists) lives in
the `prompt-improver` skill, which is the intake's execution arm (invoked by the
UserPromptSubmit hook and Council Phase 0). This rule is the always-on catalog +
trigger map; the skill loads the deep guidance just-in-time when the intake runs.

### Trivial work — abbreviated intake

Single-line fix / typo / config tweak: answer Q1 (has this been fixed before? —
`git log` related commits), Q2 (`git blame` for original intent), Q27 (1-line
action). Everything else is genuinely N/A. The intake is never skipped entirely.

## Intake output shape

Surface the CORE rows always + one row per FIRED domain question. Do NOT emit rows
for domain questions whose trigger didn't match — their absence IS the signal that
the domain doesn't apply.

```markdown
## Task intake (per `task-intake-due-diligence.md`)

Core (always):
| # | Question | Answer summary |
| 1 | Prior art | <findings + links> |
| 2 | Provenance | <internal blame + external maintainer> |
| 5 | Better? | <SOTA verdict> |
| 6 | Scalable? | <QPS target, failure modes at 10×, inflection> |
| 7 | Integration map | <upstream / downstream / shared infra / contracts> |
| 8 | FMEA | <top failure modes + mitigations> |
| 9 | Security (STRIDE) | <summary + supply-chain gates> |
| 14 | Test strategy | <unit/integration/e2e + triggered extras> |
| 20 | Documentation | <feature page + README + runbook + ADR> |
| 27 | Action plan | <reference to plan file or inline atomic TODO> |
| 29 | Online sources | <table: source / URL / read date / key finding> |

Domain (fired this task): <e.g. 12 a11y, 13 i18n, 19 UX — user-facing UI change>
| # | Question | Answer summary |
| … | … | … |

Divisions engaged: Core Five + <Extended that fired> (same triggers as the
domain questions above).
```

For very large plans the rows expand into per-question subsections with bullets.

## Enforcement (hook-backed, not documentation-only)

The intake is salient AND mechanically backed — three layers, so it is not left
to per-turn discretion:

1. **`improve-prompt.py`** (UserPromptSubmit, global — fires in every workspace)
   injects the INTAKE-MODE routing on every non-bypass prompt, requiring the intake
   block as the first response before implementation.
2. **`intake-gate.js`** (PreToolUse `Edit|Write|MultiEdit`) fires at the
   file-mutation boundary — the exact point "dove straight into editing" drift
   happens. If a project SOURCE file is about to change with no intake/plan
   recorded this session, it surfaces a reminder (default) or hard-blocks
   (`CLAUDE_INTAKE_GATE=block`; `=off` disables). It skips framework files
   (`/.claude/`), non-source files, and stays quiet once a plan exists.
3. **`intake-marker.js`** (PostToolUse `TodoWrite`) records the intake/plan as
   engaged — producing a TodoWrite plan is the observable proxy for the Phase-0
   intake, and it satisfies the gate for the session.

A hard block on "did the model WRITE the intake prose" is not mechanically
possible (it is model text, not a tool call); the gate enforces the observable
proxy — a plan precedes code mutation on non-trivial work — which converts silent
skips into a visible signal (or a block) at the boundary. All three ship in every
install (the installer copies `settings.json` + `scripts/hooks/` + `hooks/`
wholesale), so the enforcement travels with the rule.

## Cross-references

- `council-triggers.md` — the domain questions fire on the SAME triggers as the
  Extended divisions (one trigger system, not two)
- `reuse-first.md` — Q1 sweep + Q4 OSS-before-custom escalation
- `official-docs-first.md` — Q3 + Q5 + Q29 require primary-source citations
- `plan-task-breakdown.md` — Q27 is the granular task list
- `docs-sync-with-code.md` — Q7's integration map drives the docs / runbook / ADR
- `license-allowlist-gate.md` — Q4 + Q25 license checks
- `prompt-improver` skill — the intake's execution arm; holds the deep per-question
  guidance loaded just-in-time
- Council Protocol Phase 0 (`CLAUDE.md`) — the canonical home for the intake
- `verify-before-claim.md` — the intake is verified before implementation

## Why this rule exists

Without a structured intake, tasks default to "start coding from the description"
— which reliably misses existing primitives, better techniques, scaling failure
modes, and compliance / accessibility / security gaps. But forcing all 29
questions on every task produced a second failure: the load-bearing answers drowned
in ~18 "N/A — no payment surface" rows, and the ritual cost real tokens on every
task. Trigger-gating restores signal: the high-signal core always fires; each
domain question fires exactly when its (conservative, over-include) trigger
matches — the same triggers already tuned for the Extended divisions. The cost of
the intake is now proportional to the task's actual risk surface, and the answers
that appear are the ones that matter.

User directive (verbatim): **"every task or plan must start with a has it been done
before? who did it? who built it? can it be done better? is it scalable? what to do
and all other things in that plan or request and you are always free to look
online."**

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Task shipped without the always-fire core (rule violation)
- A domain question's trigger matched but the question didn't fire (gating gap —
  the trigger map or `council-triggers` needs the link)
- A domain gap shipped (e.g. an a11y / compliance miss) whose trigger SHOULD have
  fired the question (trigger too narrow — broaden, per over-include principle)
- A core question consistently answered shallowly (depth needs reinforcement)
- N/A rows reappearing in intake output (gating not applied — the rewrite regressed)
- Online research (Q29) skipped on an external integration

**Refinement candidates**:

- Move a domain question into the always-fire core if it proves near-universal in
  practice (or the reverse — demote a core question to gated if it's often N/A)
- New domain question + trigger when a missed dimension recurs in 2+ retrospectives
- Tightening of a trigger when a domain question fires but is consistently N/A
- New cross-reference when a sister rule's gate is the proof a question depends on
