---
name: negotiation-patterns
description: Principal-level negotiation methodology — interest-based negotiation (Harvard Method), BATNA + ZOPA + reservation values, tactical empathy (Voss), preparation discipline, multi-issue tradeoff design, cross-cultural patterns, and the discipline that turns adversarial bargaining into joint problem-solving with durable outcomes.
---

# Negotiation Patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Auto-fires on: vendor selection, contract redlining, salary + compensation conversations, hiring
> offer construction, partnership term sheets, M&A discussions, customer success-driven price
> negotiations, dispute resolution, internal cross-team conflict (resourcing, ownership boundaries),
> board / investor negotiations, equity-split conversations, debt + credit-line discussions,
> settlement negotiations, conflict mediation. Sister to `communication-patterns` (delivery),
> `comms-reviewer` agent (Council Division 16), `compliance-reviewer` agent (legal review),
> `okr-framework` (outcome-aligned bargaining), `research-methods` (preparation discipline).
> Standards: Fisher + Ury + Patton 1981/2011, Lax + Sebenius 1986/2006, Susskind 1985/2014, Voss +
> Raz 2016, Malhotra + Bazerman 2007, Mnookin + Peppet + Tulumello 2000, Galinsky + Schweitzer 2015,
> Hofstede 1980/2010, Brett 2014.

## Purpose

Negotiation is the process by which parties with differing interests
reach agreements without resorting to dictation or warfare. Every
non-trivial professional decision — what to build, who to hire, who
gets credit, what a contract says, what a vendor charges, where the
data centre lives — passes through some form of negotiation.

Most people negotiate badly because they conflate negotiation with
**bargaining over a single number** (price). Principal-level
negotiation is structurally different: it identifies the underlying
**interests** behind stated positions, discovers value-creating
**tradeoffs** across multiple issues, sets explicit **walkaway
points** before entering the room, and uses **tactical empathy** to
keep counterparties engaged through difficult conversations.

This skill provides:

1. Interest-based (integrative) negotiation — the Harvard Method
2. BATNA / ZOPA / reservation value preparation discipline
3. The two dimensions: claiming value vs creating value
4. Multi-issue tradeoff design + scoring systems
5. Tactical empathy + the Chris Voss methodology
6. Anchoring + reciprocity + commitment + framing — and when each backfires
7. Cross-cultural negotiation patterns (Hofstede, Brett)
8. Negotiation ethics + what's never acceptable
9. Common manipulation tactics and how to neutralise them
10. Internal-vs-external negotiation differences

It is NOT a script for "winning" — at the principal level, the goal
is durable value-creating agreements that both sides perform on.

## Standards Cited

- **ISO 9001:2015 + 2026 revision** — Quality management systems
  (process approach, risk-based thinking, leadership)
- **ISO 9004:2018** — Quality management — quality of an
  organization (sustained success)
- **ISO 31000:2018** — Risk management guidelines
- **ISO 14001:2015** — Environmental management
- **ISO 45001:2018** — Occupational health and safety
- **ASQ Body of Knowledge — Six Sigma Black Belt** — DMAIC, DMADV,
  SIPOC, Cp/Cpk, DOE, control charts
- **APICS CPIM / CSCP Body of Knowledge** — Supply chain operations
  reference, S&OP, demand planning, SCOR model
- **PMBOK Guide 7th Edition + PMI Standard for Project
  Management** — Project + portfolio + program management
- **Lean Enterprise Institute — Toyota Production System** — JIT,
  jidoka, kanban, kaizen, value-stream mapping, takt time
- **Eurocode 0/1/2/3 + AISC 360 + ACI 318** — Structural
  engineering basis (when civil / structural scope)
- **ASHRAE Handbook + ISO 19650 (BIM)** — Building services + MEP
  - digital coordination (when AEC scope)
- **TRIZ — Altshuller's 40 Inventive Principles + Contradiction
  Matrix** — Systematic innovation methodology
- **Stanford d.school + IDEO Field Guide** — Design thinking
  process (Empathise / Define / Ideate / Prototype / Test)
- **The Lean Startup (Ries 2011) + Customer Development (Blank)** —
  Build-measure-learn loop, MVP taxonomy, pivot types
- **Team Topologies (Skelton + Pais 2019)** — Stream-aligned /
  platform / enabling / complicated-subsystem teams + interaction
  modes
- **OKRs — Measure What Matters (Doerr 2018)** + **Andy Grove's
  HPM** — Objectives + Key Results, CFR, stretch goals
- **The Five Dysfunctions of a Team (Lencioni)** + **High Output
  Management (Grove)** — People + culture frameworks
- **Getting to Yes (Fisher + Ury) + Never Split the Difference
  (Voss)** — Negotiation: BATNA / ZOPA / tactical empathy

### Cross-cutting engineering standards

- **ISO/IEC/IEEE 12207:2017** — Software life cycle processes
  (process-engineering applies to software-delivery workflows)
- **ISO/IEC 25010:2011 §6** — Quality model (process maturity
  feeds product quality characteristics)
- **ISO/IEC 33001:2015** — Process assessment concepts +
  vocabulary (foundation for SPICE / Automotive SPICE)
- **ISO/IEC 33020:2019** — Process measurement framework for
  process capability assessment
- **NIST SP 800-160 Vol 1 Rev 1 + Vol 2 Rev 1** — Engineering
  trustworthy secure systems + cyber resiliency
- **NIST SP 800-218 SSDF §PO** — Prepare the organization
  (process governance + role definitions)
- **NIST SP 800-53 Rev 5 §PM** — Program management controls
  (apply to any organisational process)
- **OWASP SAMM v2** — Software Assurance Maturity Model
  (process-maturity assessment framework)
- **CWE-1059** — Insufficient technical documentation (process
  workflows MUST be documented)

## How to use this skill

This file is a ROUTING TABLE. The detail lives in `references/` and is read
just-in-time — open only the rows the task actually reaches, rather than
carrying the whole corpus on every turn.

| Topic | Read |
| --- | --- |
| **Standards Cited** — the negotiation literature, with editions + ISBNs (Fisher/Ury/Patton, Voss, Lax + Sebenius, Raiffa, Susskind, Hofstede, Meyer, Brett, Shell, Lewicki) | [`references/standards.md`](references/standards.md) |
| **When to Fire** — file globs, keyword triggers, conversation signals, and what does NOT fire it | [`references/triggers.md`](references/triggers.md) |
| **Anti-Patterns** — the fourteen recurring negotiation failures + the named correction for each | [`references/anti-patterns.md`](references/anti-patterns.md) |
| **Verification Checklist** — preparation / process / outcome / ethics / relationship / applicability checks | [`references/verification-checklist.md`](references/verification-checklist.md) |
| **Cross-References** — sister skills + paired Council agents | [`references/cross-references.md`](references/cross-references.md) |
| **Why This Skill Exists** — the cost of bad negotiation + the verbatim standards-grounding list | [`references/why-this-skill-exists.md`](references/why-this-skill-exists.md) |
| **Learning hooks** — signals to watch, refinement candidates | [`references/learning-hooks.md`](references/learning-hooks.md) |

## Core Patterns

| Pattern | Topic | Read |
| --- | --- | --- |
| **Pattern 1** | The two dimensions — creating + claiming value | [`references/patterns-foundation.md`](references/patterns-foundation.md) |
| **Pattern 2** | BATNA, reservation value, ZOPA — the preparation triad | [`references/patterns-foundation.md`](references/patterns-foundation.md) |
| **Pattern 3** | Interest-based (principled) negotiation — the four prescriptions | [`references/patterns-foundation.md`](references/patterns-foundation.md) |
| **Pattern 4** | Tactical empathy + the Voss methodology (mirrors, labels, calibrated questions, Ackerman) | [`references/patterns-tactics.md`](references/patterns-tactics.md) |
| **Pattern 5** | Anchoring + the first-offer question | [`references/patterns-tactics.md`](references/patterns-tactics.md) |
| **Pattern 6** | Multi-issue tradeoff design | [`references/patterns-deal-design.md`](references/patterns-deal-design.md) |
| **Pattern 7** | MESO — multiple equivalent simultaneous offers | [`references/patterns-deal-design.md`](references/patterns-deal-design.md) |
| **Pattern 8** | Contingency contracts — pricing a disagreement about the future | [`references/patterns-deal-design.md`](references/patterns-deal-design.md) |
| **Pattern 9** | Post-settlement settlement | [`references/patterns-deal-design.md`](references/patterns-deal-design.md) |
| **Pattern 10** | The Voss-style "How" | [`references/patterns-tactics.md`](references/patterns-tactics.md) |
| **Pattern 11** | Cross-cultural negotiation | [`references/patterns-culture-ethics.md`](references/patterns-culture-ethics.md) |
| **Pattern 12** | Negotiation ethics — what's never acceptable | [`references/patterns-culture-ethics.md`](references/patterns-culture-ethics.md) |

The rule that survives without opening a reference: know your BATNA and your
reservation value BEFORE the conversation, and never misrepresent a material
fact.
