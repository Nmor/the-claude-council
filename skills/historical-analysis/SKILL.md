---
name: historical-analysis
description: Principal-level historical analysis — primary-source critique, archival methodology, periodisation, oral history, cliometrics, historiography, and the fallacies (presentism, Whig history, anachronism, hindsight bias) that turn the past into a mirror of present preoccupations rather than a foreign country worth understanding on its own terms.
---

# Historical Analysis

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check

## Purpose

Historical analysis is the disciplined reconstruction of past events, structures, mentalities, and
contingencies from imperfect, partial, and biased evidence. It is not chronicle (a list of what
happened) and not myth (a story we tell ourselves about origins). It is a rigorous craft governed by
source criticism, contextual reading, transparent argument, and explicit awareness of the
historian's own position relative to the past.

This skill exists because most "historical" reasoning that appears in business, policy, technology,
and engineering contexts is bad history. Common failure modes: cherry-picking analogies ("this is
the Munich moment"), reading the present into the past (presentism), treating the past as inevitable
march toward our world (Whig history), citing secondary syntheses as if they were evidence, ignoring
provenance and chain of custody, mistaking digitised sources for originals, and using historical
narrative to ratify a conclusion that was reached on other grounds. Good historical analysis treats
the past as a foreign country (L. P. Hartley), interrogates every source, holds counterfactuals
open, and presents argument with the evidence visible.

What this skill does NOT do: it does not produce predictions of the future (history is not
predictive); it does not provide moral lessons (the past is not a Sunday school); it does not
adjudicate present political disputes (though it can illuminate them); it does not equate the
historian's interpretation with what "really happened" (all historical writing is interpretation
grounded in evidence).

## When to Fire

Engage historical-analysis when work involves:

- Citing precedent ("we did this in 2018 and it failed") — verify the analogy holds
- Drawing lessons from a prior incident, project, deployment, regime, or era
- Writing post-mortems, retrospectives, or institutional histories
- Reasoning about long-run change (architectural evolution, regulatory drift, market formation)
- Producing public-facing historical content (anniversaries, founding stories, brand heritage)
- Building or maintaining archives (organisational, technical, documentary)
- Conducting oral history (interviews with founders, retirees, witnesses)
- Citing historical figures, events, or texts in argument
- Building counterfactual analysis ("what if we had chosen the other architecture")
- Conducting longitudinal research that crosses regime change, organisational restructure, or
  technology shifts
- Any claim about cause and effect across decades

Do NOT engage when:

- The question is about current state (use observability, not history)
- The question is genuinely predictive (history is not a forecasting tool)
- "History" is being used rhetorically to ratify a present decision (call this out)

## Core Patterns

Routing table. Each pattern's full text — with its standards, examples and
engineering analogues — lives in the reference file named here. Read the row you
need; do not load the whole set.

| # | Pattern | Reference file |
| --- | --- | --- |
| 1 | Source typology + source criticism | [`references/source-criticism.md`](references/source-criticism.md) |
| 2 | Primary, secondary, tertiary — and the "primary" trap | [`references/source-criticism.md`](references/source-criticism.md) |
| 3 | Archival methodology + ISAD(G) | [`references/archival-methodology.md`](references/archival-methodology.md) |
| 4 | Periodisation as interpretive choice | [`references/periodisation-and-temporality.md`](references/periodisation-and-temporality.md) |
| 5 | The three temporalities (Braudel) | [`references/periodisation-and-temporality.md`](references/periodisation-and-temporality.md) |
| 6 | Oral history methodology | [`references/oral-history.md`](references/oral-history.md) |
| 7 | Cliometrics + quantitative history | [`references/cliometrics.md`](references/cliometrics.md) |
| 8 | Counterfactual analysis (disciplined) | [`references/counterfactual-analysis.md`](references/counterfactual-analysis.md) |
| 9 | Historiography (knowing the conversation) | [`references/historiography-and-citation.md`](references/historiography-and-citation.md) |
| 10 | Citation discipline (Chicago notes-bibliography) | [`references/historiography-and-citation.md`](references/historiography-and-citation.md) |

## Reference map (remaining sections)

| Section | Contents | Reference file |
| --- | --- | --- |
| Standards Cited | Bloch, Braudel, Carr, Tosh, Ritchie, Portelli, Ginzburg, Ferguson, Chicago 17th, ISAD(G), DACS, EAD3, SAA + OHA ethics, UNESCO MoW — plus the cross-cutting research + documentation standards (ISO 690, PRISMA, GRADE, NIST, CWE) | [`references/standards-cited.md`](references/standards-cited.md) |
| Anti-Patterns | Presentism, Whig history, anachronism, single-source reliance, hindsight bias, confirmation bias, citation laundering, ignoring provenance, digitised-as-original, undisciplined counterfactual, oral-history absolutism, chronicle-as-analysis, past-for-validation, ignoring historiography | [`references/anti-patterns.md`](references/anti-patterns.md) |
| Verification Checklist | The 18 checks a historical claim runs before it ships | [`references/verification-checklist.md`](references/verification-checklist.md) |
| Why This Skill Exists | Folk history, Whig technology narratives, founding myths, cherry-picked analogies, anniversary marketing, presentism in post-mortems, citation laundering | [`references/why-this-skill-exists.md`](references/why-this-skill-exists.md) |
| Learning hooks | Signals to watch + refinement candidates for maintaining this skill | [`references/learning-hooks.md`](references/learning-hooks.md) |

## Cross-References

- `research-methods` (sister skill): general research methodology — historical methods are a
  specialisation; source criticism, triangulation, bias awareness, citation discipline all transfer
- `communication-patterns`: presenting historical findings — answer-first structure, audience
  analysis, edit-ruthlessly; historical writing demands narrative + analysis simultaneously
- `negotiation-patterns`: post-mortem and institutional history often surface decisions that affect
  ongoing relationships; tactical empathy applies
- `documentation-requirements.md` (rule): organisational archives are themselves *fonds* requiring
  multi-level description; ADRs are primary sources for future historians of the codebase
- `audit-logging.md` (rule): the audit log is the *fonds* of the system — provenance-preserved,
  chain-of-custody verified, append-only; same archival principles apply
- `data-retention.md` (rule): retention policy decides what survives + what is destroyed — the
  archive of the future is built by today's deletion decisions
- `task-intake-due-diligence.md` (rule): Q1 (prior art) and Q2 (people) draw on institutional
  memory + organisational history; historical-analysis governs how that memory is reconstructed
- `proper-fixes-first.md` (rule): "this has been done before" claims require source-critical
  verification, not vibes
- `no-overclaim.md` (rule): historical claims are claims of evidence; "we tried this in 2018"
  requires citable evidence, not folklore
- `plan-task-breakdown.md` (rule): plan files are themselves primary sources for future histories of
  the project; write them with future historians in mind
