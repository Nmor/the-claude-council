# edtech-patterns: When to Fire

> File globs, keyword triggers and scope triggers that fire this skill. Pointed at by the SKILL.md
> row "When to Fire".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## When to Fire

**File globs**:

- `**/lti/**`, `**/*lti*`, `**/launch.{ts,py,rb,go}`, `**/jwks*`
- `**/scorm/**`, `**/imsmanifest.xml`, `**/cmi5*.json`
- `**/xapi/**`, `**/*xapi*`, `**/lrs/**`, `**/statements/**`
- `**/oneroster/**`, `**/csv-1.2/**` (OneRoster CSV format)
- `**/caliper/**`, `**/sensor*.{ts,py,rb,go}`
- `**/qti/**`, `**/*qti*`, `**/assessment-item-*.xml`
- `**/badge/**`, `**/credential/**`, `**/clr/**`,
  `**/openbadges/**`, `**/verifiable-credentials/**`
- `**/proctor*`, `**/proctoring/**`, `**/respondus/**`,
  `**/proctortrack/**`, `**/proctoru/**`
- `**/grade-passback/**`, `**/grade-sync/**`, `**/ags/**`
- `**/sis-sync/**`, `**/clever*/**`, `**/classlink*/**`
- `**/canvas-api/**`, `**/schoology-api/**`,
  `**/moodle-api/**`, `**/blackboard-api/**`,
  `**/d2l-api/**`, `**/brightspace-api/**`
- Per-platform: `**/lti-tool-provider*`, `**/lti-platform*`

**Keyword triggers** (in diff, ticket, or prompt):

- "LTI", "LTI 1.3", "LTI Advantage", "Deep Linking",
  "Names and Roles", "Assignment and Grade Services",
  "NRPS", "AGS"
- "xAPI", "Experience API", "TinCan", "LRS", "Learning Record
  Store", "cmi5", "AU launch"
- "SCORM", "SCORM 1.2", "SCORM 2004", "imsmanifest"
- "Caliper", "Sensor API", "Caliper event"
- "QTI", "assessment item", "test specification"
- "Common Cartridge", "thin cartridge"
- "OneRoster", "roster sync", "Clever sync", "ClassLink"
- "Open Badges", "Verifiable Credential", "CLR",
  "Comprehensive Learner Record"
- "proctoring", "remote proctor", "AI proctor", "ID verify",
  "session recording", "exam integrity"
- "adaptive learning", "CAT", "computerized adaptive test",
  "IRT", "Rasch", "ability estimation"
- "UDL", "Universal Design for Learning", "accommodations",
  "IEP", "504 plan", "AccessForAll"
- "MOOC", "LMS", "VLE", "LXP", "SIS", "Student Information
  System"
- "grade passback", "outcome service", "result service"
- "gradebook", "transcript", "academic record"
- "learning analytics", "early warning", "predictive
  analytics", "at-risk model"

**Scope triggers**:

- New integration with Canvas / Schoology / Moodle / Blackboard
  / D2L Brightspace / Google Classroom / Microsoft Teams for
  Education / Echo360 / Panopto
- Any system handling K-12 grades, IEPs, 504 plans, attendance
- Any assessment with academic-record consequence
- Any system targeting minors (ALWAYS auto-engage
  `ferpa-coppa-compliance` skill alongside)
- Adaptive / personalized learning algorithms
- Credential issuance (degrees, certificates, badges,
  micro-credentials)
- AI-tutor / AI-grader / AI-proctor (adds `ai-ethics-reviewer`)
