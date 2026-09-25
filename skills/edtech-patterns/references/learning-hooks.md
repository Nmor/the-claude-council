# edtech-patterns: Learning hooks

> Signals to watch and refinement candidates for maintaining this skill. Pointed at by the SKILL.md
> row "Learning hooks".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- LTI 1.1 / 1.2 integration shipped in new code (rule 1 violation — LTI 1.3+ floor)
- LTI launch handler missing nonce one-time-use store (replay attack vector)
- LTI launch handler skipping JWKS verification + caching (key rotation + signature validation gap)
- AGS / NRPS access token minted per request rather than cached (rate-limit + cost issue)
- SCORM package missing min/max on `cmi.score.raw` (scoring drift across LMSs — Anti-Pattern 2)
- SCORM 2004 package only setting `lesson_status` (missing completion/success split)
- xAPI statement using raw email in `actor.mbox` (Anti-Pattern 3 — PII over wire)
- xAPI 2.0 statement missing `version` field (spec violation)
- OneRoster sync via direct DB credentials (Anti-Pattern 4)
- Roster demographics fetched without district consent (FERPA + COPPA violation)
- QTI items shipped without `<accessibility>` block (a11y default-off)
- Adaptive assessment without IRT validity evidence shipped (Anti-Pattern 7)
- Proctoring vendor selected without published bias audit (Pattern 12 weakening)
- Accommodation flag (IEP / 504) bypassed in proctor session (Section 504 violation)
- AI tutor / grader shipped without documented model provenance (Anti-Pattern 5)
- AI grader producing record-affecting outputs without human review gate (`ai-ethics` veto)
- Early-warning dashboard without closed intervention loop (Anti-Pattern 6)
- Open Badges 2.0 (baked-image) emitted for new credentials (Pattern 9 weakening)
- MOOC shipped without WCAG 2.2 AA (Anti-Pattern 10 — DOJ Title II / EAA)
- Hardcoded "A is 90+" grade scale (Anti-Pattern 11 — locale assumption)
- School-as-agent VPC claimed without DPA in place (Anti-Pattern 12 — FTC 2024-2025 finding pattern)
- Caliper + xAPI emitted in parallel without contract test (Anti-Pattern 9 — drift)

**Refinement candidates**:

- New row in Standards Cited when 1EdTech publishes a new spec
  major version (LTI 2.0, QTI 4.0, OneRoster 1.3, Caliper 2.0)
- Tightening of accommodation-passthrough verification when
  OCR / DOJ enforcement adds a specific failure pattern
- New row in Anti-Patterns when an FTC / OCR / DOJ enforcement
  action names a new edtech recurrence
- New cross-reference when EU AI Act conformity-assessment
  patterns become public (Aug 2026+)
- New pattern entry when a credentialing standard (CLR, EDC,
  EBSI digital wallet) ships a production binding
- Tightening of proctoring rules when bias-audit methodologies
  improve (NIST FRVT-style protocols for ed proctor)
- New row when state student-privacy laws expand (TX SB-820 II,
  IL SOPPA amendments, more state-MTLs-equivalent edtech laws)
