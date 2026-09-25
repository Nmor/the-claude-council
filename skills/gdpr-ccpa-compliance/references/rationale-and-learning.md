# Rationale + Learning Hooks

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers why this skill exists and the continuous-learning signals /
refinement candidates for maintaining it. Pointed at by the SKILL.md
reference-map row "Rationale + learning hooks".

## Why This Skill Exists

Privacy regulations are not aspirational — they are operational requirements with measurable
controls + named penalties. The cost of building consent banners, DSAR endpoints, RoPA, and DPIA
into the product at design time: a few sprints. The cost of retrofitting after a regulator's
investigation: engineering quarters + outside counsel + brand damage.

Treat every collection point as if a regulator is reading the code, because eventually one will.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New data-collection point without entry in RoPA (Article 30 weakening)
- Consent obtained via pre-ticked checkbox (CJEU Planet49 violation)
- "Do Not Sell" link absent on US homepage when CCPA scope applies
- Cookie set before consent on EU traffic (PECR / ePrivacy violation)
- DSAR processed > 30 days (Article 12 deadline miss)
- Cross-border transfer without SCC / adequacy mechanism (Schrems II violation)
- DPIA absent on high-risk processing (Article 35 — new biometric / large-scale automated decision)
- Breach not notified within 72h (Article 33 deadline miss)
- Children's data collected without verifiable parental consent (Article 8 / COPPA)
- IP / email logged in plain text in EU jurisdiction (PII handling weakening)
- Right-to-be-forgotten executed via soft-delete only (incomplete erasure — Article 17)

**Refinement candidates**:

- New regulation row when a new privacy law passes (LGPD / POPIA / India DPDPA / state laws)
- New cross-reference when a sister skill (iso27001-controls, soc2-readiness, security-review) adds
  a privacy gate
- New DSAR workflow row when a new data category becomes subject to access right
- Tightening of the cross-border transfer rule when adequacy / SCC landscape shifts
