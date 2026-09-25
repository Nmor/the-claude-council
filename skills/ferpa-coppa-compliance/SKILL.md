---
name: ferpa-coppa-compliance
description: Principal-level guidance for FERPA (20 USC §1232g), COPPA (15 USC §6501-6506 + 16 CFR Part 312 + 2025 FTC Final Rule), GDPR-K (Art 8), CIPA, state student-privacy laws (SOPIPA, NY Ed Law 2-d, Student Privacy Pledge), and platform compliance for K-12 + higher-ed + edtech. Sister to gdpr-ccpa-compliance, hipaa-compliance (where school-based health), audit-logging, data-retention.
---

# FERPA / COPPA / Student Privacy Compliance

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Not legal advice. Engineering implementation of student-privacy regimes — operationalising the
> controls. Final interpretation rests with school district counsel, state attorneys-general
> guidance, FTC + Department of Education enforcement actions, and (for SEAs/LEAs) the institution's
> Senior Agency Official for Privacy.

## Purpose

US K-12 and higher-education software operates under the strictest student-data-privacy regime in
the United States: FERPA + COPPA + state laws + voluntary frameworks like the Student Privacy
Pledge. International expansions add GDPR-K (Art 8 children), UK Age-Appropriate Design Code, and
California AB-1584. This skill maps the regulatory surface to concrete engineering controls so a
product team building an edtech SaaS, a school-issued device, a tutoring platform, an LMS plug-in,
an after-school enrichment app, or a research-data-collection instrument can ship without (a) ED
investigation, (b) FTC consent decree, (c) state attorney-general enforcement, or (d) the
reputational damage of a single high-profile student-data incident.

This skill does NOT cover: general-purpose corporate privacy compliance (see
`gdpr-ccpa-compliance`), payment processing for school billing (see `payment-processing-patterns`),
or healthcare-on-campus (see `hipaa-compliance` — covers school nurses, counsellors, and IDEA /
Section 504 records that overlap).

## How to use this skill

This file is a ROUTING TABLE. The detail lives in `references/` and is read just-in-time
— open only the rows the task actually reaches, rather than carrying the whole regulatory
corpus on every turn.

| Topic | Read |
| --- | --- |
| **Standards Cited** + **Standards URLs** — every statute, regulation, framework and primary source | [`references/standards.md`](references/standards.md) |
| **When to Fire** — file globs, keyword triggers, change-scope triggers | [`references/triggers.md`](references/triggers.md) |
| **Anti-Patterns** — the eight recurring student-privacy failures + named alternatives | [`references/anti-patterns.md`](references/anti-patterns.md) |
| **Verification Checklist** — the checks to run when this skill activates | [`references/verification-checklist.md`](references/verification-checklist.md) |
| **Cross-References** — sister skills, global rules, paired agents | [`references/cross-references.md`](references/cross-references.md) |
| **Why This Skill Exists** — the enforcement record + cost of retrofit | [`references/why-this-skill-exists.md`](references/why-this-skill-exists.md) |
| **Learning hooks** — signals to watch, refinement candidates | [`references/learning-hooks.md`](references/learning-hooks.md) |

## Core Patterns

| Pattern | Topic | Read |
| --- | --- | --- |
| **Pattern 1** | FERPA scope — who is the regulated entity? | [`references/ferpa-records.md`](references/ferpa-records.md) |
| **Pattern 2** | COPPA scope — under 13 specifically | [`references/coppa-scope.md`](references/coppa-scope.md) |
| **Pattern 3** | COPPA 2025 Final Rule — what changed | [`references/coppa-scope.md`](references/coppa-scope.md) |
| **Pattern 4** | Verifiable Parental Consent (VPC) methods | [`references/consent-and-age-gating.md`](references/consent-and-age-gating.md) |
| **Pattern 5** | GDPR Article 8 — children's age varies by member state | [`references/consent-and-age-gating.md`](references/consent-and-age-gating.md) |
| **Pattern 6** | Educational record vs directory information | [`references/ferpa-records.md`](references/ferpa-records.md) |
| **Pattern 7** | Data Privacy Agreements (DPAs) | [`references/dpas-and-state-law.md`](references/dpas-and-state-law.md) |
| **Pattern 8** | Age-gating + age-verification | [`references/consent-and-age-gating.md`](references/consent-and-age-gating.md) |
| **Pattern 9** | PPRA — surveys + physical exams | [`references/ferpa-records.md`](references/ferpa-records.md) |
| **Pattern 10** | New York Education Law §2-d (the toughest state law) | [`references/dpas-and-state-law.md`](references/dpas-and-state-law.md) |

Two rules that survive without opening a reference: a school cannot lawfully hand you
student PII until a DPA is signed, and no behavioural advertising or cross-site tracking
SDK ever belongs on a student-facing screen.

---

*Last verified: 2026-05-30. Federal + state regulatory landscape updates: FTC publishes COPPA FAQ
updates quarterly; ED OPP publishes PTAC guidance bi-annually; state AGs publish enforcement actions
on rolling basis. Refresh cadence: 90 days for FTC, 180 days for ED, 30 days for state-AG
enforcement scan.*

*Not legal advice. Vendor-side engineering implementation guidance. Counsel + LEA Privacy Officer +
state-AG-coordinated regulatory advisory remain authoritative.*
