---
name: edtech-patterns
description: Principal-level patterns for K-12 + higher-ed + corporate-learning platforms — LTI 1.3 / LTI Advantage, xAPI 2.0 (IEEE 9274.1.1-2023), cmi5, SCORM 1.2 + 2004 (4th Ed), OneRoster 1.2, Caliper Analytics 1.2, QTI 3.0, Common Cartridge 1.3, Open Badges 3.0 (W3C VC), AccessForAll 3.0, IRT-based adaptive assessment, UDL 3.0, WCAG 2.2 AAA for learners, proctoring + integrity, learning-analytics ethics. Sister to ferpa-coppa-compliance (regulation), wcag-accessibility (a11y), interaction-design (UX).
---

# EdTech Platform Patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Auto-fires on every file. Sister skills: `ferpa-coppa-compliance`
> (regulation), `wcag-accessibility` (the learner is the user),
> `interaction-design` (learning experience design),
> `gdpr-ccpa-compliance` (when learners are EU/CA minors),
> `prompt-engineering` + `rag-design` (when AI tutors are involved).

## Purpose

Engineers building learning platforms (LMSs, MOOCs, K-12 tools,
corporate training, adaptive tutors, assessment engines,
credentialing systems) routinely re-invent interoperability,
ship inaccessible-to-learners content, mis-model assessment, or
import learning-analytics dashboards that quietly profile minors
without parental knowledge. The cost of getting it wrong is
high: a single integration break (Canvas → publisher → SIS) can
take an entire district offline at exam time; an inaccessible
assessment locks blind students out of their education; a
biased proctoring system targets disabled or non-white learners
disproportionately and lands the vendor in DOJ + OCR complaints.

This skill exists to make the standards-cited, accessibility-
first, ethics-aware path the default — and to name the
anti-patterns that turn well-intentioned edtech into
discriminatory infrastructure.

**Not legal advice; not pedagogical advice for any specific
learner.** Pair with district / institution / accreditor counsel
on Section 504, IDEA, OCR + DOJ Title II/III obligations, and
with learning scientists on assessment validity.

## How to use this skill

This file is a ROUTING TABLE. The detail lives in `references/` and is read
just-in-time — open only the rows the task actually reaches, rather than
carrying the whole corpus on every turn.

| Topic | Read |
| --- | --- |
| **Standards Cited** — every spec + version + issuing body (1EdTech, ADL, W3C, ISO, CAST, AERA/APA/NCME, DOJ, EAA) | [`references/standards.md`](references/standards.md) |
| **When to Fire** — file globs, keyword triggers, scope triggers | [`references/triggers.md`](references/triggers.md) |
| **Anti-Patterns** — the twelve recurring edtech failures + named alternatives | [`references/anti-patterns.md`](references/anti-patterns.md) |
| **Verification Checklist** — the checks to run when this skill activates | [`references/verification-checklist.md`](references/verification-checklist.md) |
| **Cross-References** — sister skills, global rules, paired agents | [`references/cross-references.md`](references/cross-references.md) |
| **Why This Skill Exists** — the enforcement + litigation record | [`references/why-this-skill-exists.md`](references/why-this-skill-exists.md) |
| **Learning hooks** — signals to watch, refinement candidates | [`references/learning-hooks.md`](references/learning-hooks.md) |

## Core Patterns

| Pattern | Topic | Read |
| --- | --- | --- |
| **Pattern 1** | LTI 1.3 launch — OIDC + JWT, never the LTI 1.1 shared secret | [`references/lti.md`](references/lti.md) |
| **Pattern 2** | LTI Advantage services — Names + Roles, Assignment + Grade, Deep Linking | [`references/lti.md`](references/lti.md) |
| **Pattern 3** | SCORM packaging + the manifest contract | [`references/scorm-cmi5.md`](references/scorm-cmi5.md) |
| **Pattern 4** | xAPI 2.0 — Actor / Verb / Object statement model | [`references/xapi-caliper.md`](references/xapi-caliper.md) |
| **Pattern 5** | cmi5 — the SCORM replacement that actually deploys | [`references/scorm-cmi5.md`](references/scorm-cmi5.md) |
| **Pattern 6** | OneRoster 1.2 — the SIS ↔ LMS contract | [`references/rostering.md`](references/rostering.md) |
| **Pattern 7** | Caliper Analytics — opinionated learning events | [`references/xapi-caliper.md`](references/xapi-caliper.md) |
| **Pattern 8** | QTI 3.0 — assessment items + tests | [`references/assessment.md`](references/assessment.md) |
| **Pattern 9** | Open Badges 3.0 — Verifiable Credentials, not images | [`references/credentialing.md`](references/credentialing.md) |
| **Pattern 10** | AccessForAll + UDL — accommodations as a first-class capability | [`references/accessibility-udl.md`](references/accessibility-udl.md) |
| **Pattern 11** | Adaptive testing — IRT, not "more wrong → harder" | [`references/assessment.md`](references/assessment.md) |
| **Pattern 12** | Proctoring — minimize, never weaponize | [`references/integrity-and-analytics.md`](references/integrity-and-analytics.md) |
| **Pattern 13** | Learning analytics — ethics + transparency | [`references/integrity-and-analytics.md`](references/integrity-and-analytics.md) |

Always-pair rule that survives without opening a reference: any system
touching minors auto-engages the `ferpa-coppa-compliance` skill, and any
AI tutor / grader / proctor adds `ai-ethics-reviewer`.
