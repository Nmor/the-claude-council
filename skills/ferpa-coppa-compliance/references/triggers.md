# ferpa-coppa-compliance: When to Fire

> File-path globs, keyword triggers and change-scope triggers that fire this skill. Pointed at by
> the SKILL.md row "When to Fire".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## When to Fire

File path triggers:

- `**/students/**`, `**/grades/**`, `**/transcripts/**`, `**/enrollment/**`, `**/parents/**`,
  `**/guardians/**`, `**/iep/**`, `**/504-plan/**`, `**/disabilities/**`
- `**/coppa/**`, `**/ferpa/**`, `**/parental-consent/**`, `**/age-gate/**`, `**/minor/**`,
  `**/under-13/**`
- `**/school/**`, `**/district/**`, `**/lea/**`, `**/sea/**`, `**/classroom/**`, `**/tutor/**`,
  `**/mentor/**`
- `**/sis/**` (Student Information System), `**/lms/**` (Learning Management System), `**/lti/**`,
  `**/onefoster/**`, `**/oneroster/**`
- `**/edtech/**`, `**/k12/**`, `**/higher-ed/**`, `**/university/**`, `**/college/**`
- Imports: `@learning-tools/lti-1.3-tool`, `node-ims-lti`, `@instructure/canvas-api`,
  `@google/classroom`, `@microsoft/teams-edu`, `@schoology/api`, `@powerschool/api`, `@clever/sdk`,
  `@infinite-campus/api`

Keyword triggers:

- "student", "pupil", "minor", "child", "parent", "guardian", "school", "district"
- "FERPA", "COPPA", "PPRA", "IDEA", "Section 504", "IEP", "504 plan"
- "directory information", "educational record", "school official", "legitimate educational
  interest", "consent"
- "age gate", "verifiable parental consent", "VPC", "under 13", "under 16", "under 18"
- "LMS", "SIS", "LTI", "OneRoster", "Caliper", "QTI", "xAPI"
- "grade", "transcript", "report card", "attendance", "discipline", "expulsion", "suspension"
- "background check", "fingerprint check", "BGC", "Sterling", "Checkr", "GoodHire"

Change-scope triggers:

- Any new K-12 or higher-ed customer onboarding flow
- Any feature collecting data from users under 18
- Any feature that integrates with a school's SIS / LMS
- Any LTI tool registration
- Any state expansion (each state has its own student-privacy law overlay)
- Any analytics, ads, or third-party SDK introduction
- Any AI / ML feature that processes student work, voice, image, or biometric data
