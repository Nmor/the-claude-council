# edtech-patterns: Verification Checklist

> The checks to run when this skill activates. Pointed at by the SKILL.md row "Verification
> Checklist".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Verification Checklist

When this skill activates, verify:

- [ ] LTI 1.3+ (not 1.1) for new integrations; LTI 1.1 only
      with documented transition plan
- [ ] LTI launch JWT validated against platform JWKS with
      `iss`, `aud`, `nonce` (one-time-use), `iat` (≤5min skew),
      `version`, `deployment_id` all checked
- [ ] AGS / NRPS / Deep Linking 2.0 tokens cached + refreshed
      near expiry, not minted per request
- [ ] SCORM 1.2 packages set both `cmi.core.lesson_status` AND
      a numeric `cmi.core.score.raw` with min/max
- [ ] SCORM 2004 packages set `cmi.completion_status` +
      `cmi.success_status` separately; `cmi.suspend_data` bounded
      ≤64 KB
- [ ] xAPI statements include `version: "2.0.0"`,
      stable opaque actor identifiers (no raw email in `mbox`),
      `context.registration` UUID, ISO-8601 timestamps
- [ ] xAPI LRS conforms to ADL Conformance Test Suite OR is a
      certified vendor (Yet Analytics, Learning Locker, Veracity)
- [ ] cmi5 AUs emit `launched`, `initialized`, `passed`/`failed`,
      `completed`, `terminated` lifecycle statements
- [ ] OneRoster 1.2 sync uses REST API (not direct DB or CSV
      where possible); demographics endpoint OFF by default
- [ ] QTI 3.0 items declare `<accessibility>` block + match
      AccessForAll PNP profiles
- [ ] Open Badges 3.0 credentials are W3C VC JSON-LD with
      `DataIntegrityProof` (not OB 2.0 baked images)
- [ ] All assessment surfaces meet WCAG 2.2 AA minimum
      (AAA for high-stakes paths)
- [ ] Accommodations (IEP / 504 / institution-set) flow through
      to player / proctor / time limits without manual
      intervention
- [ ] Proctoring vendor has published bias audit (TPR/FPR by
      skin tone, gender, age, disability)
- [ ] AI grader / AI tutor has documented model + training-data
      provenance + human-review gate on any record-affecting
      output
- [ ] Adaptive assessment is IRT-backed (not branching tree)
      OR labeled "practice only, no record impact"
- [ ] Learning-analytics dashboards have closed intervention
      loop + bias audit + learner-challenge pathway
- [ ] FERPA + COPPA + 2-d compliance checked via
      `ferpa-coppa-compliance` skill in parallel
- [ ] DPA in place with district when school-as-agent VPC
      exception is used
- [ ] Demographics + IEP / 504 data flagged "high sensitivity"
      in data classification; access audit-logged
- [ ] Grade scales typed `GradingSchemeRef`, locale-aware
- [ ] Content packages tested across multiple LMSs (Canvas +
      Schoology + Moodle + Blackboard + D2L) for scoring parity
- [ ] OCR / DOJ Title II / EAA accessibility deadlines tracked
      per jurisdiction
- [ ] Section 504 + IDEA accommodation flow exercised in QA
      with assistive technology (screen reader, switch
      control, voice control)
- [ ] Captions + audio description + tactile / haptic
      equivalents available for media content
- [ ] STEM content uses MathML (not images of equations) for
      AT compatibility
- [ ] Online research conducted on the specific LMS / vendor /
      standard version BEFORE writing integration code (per
      `official-docs-first.md`)
