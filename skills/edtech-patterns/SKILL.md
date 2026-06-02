---
name: edtech-patterns
description: Principal-level patterns for K-12 + higher-ed + corporate-learning platforms — LTI 1.3 / LTI Advantage, xAPI 2.0 (IEEE 9274.1.1-2023), cmi5, SCORM 1.2 + 2004 (4th Ed), OneRoster 1.2, Caliper Analytics 1.2, QTI 3.0, Common Cartridge 1.3, Open Badges 3.0 (W3C VC), AccessForAll 3.0, IRT-based adaptive assessment, UDL 3.0, WCAG 2.2 AAA for learners, proctoring + integrity, learning-analytics ethics. Sister to ferpa-coppa-compliance (regulation), wcag-accessibility (a11y), interaction-design (UX).
---

# EdTech Platform Patterns

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

## Standards Cited

**Interoperability (1EdTech / IMS Global)**
- **LTI 1.3 + LTI Advantage** (Learning Tools Interoperability —
  1EdTech Final Spec) — OAuth 2.0 + OIDC + JWT-based launch,
  replaces LTI 1.1's shared-secret model; Names + Role Provisioning
  (NRPS), Assignment + Grade Services (AGS), Deep Linking 2.0.
  LTI 1.1 / 1.2 deprecated; new integrations MUST be 1.3+.
- **OneRoster 1.2** (1EdTech) — Roster sync for SIS ↔ LMS ↔
  tool; users / classes / enrollments / courses / academic
  sessions / demographics; CSV and REST API bindings; replaces
  PowerSchool's PSCB SIF where possible.
- **Caliper Analytics 1.2** (1EdTech) — Learning event vocabulary
  (Sensor API + Event model); contrasts with xAPI in that
  Caliper is opinionated about LMS-flavoured events while xAPI
  is open vocabulary.
- **QTI 3.0** (Question + Test Interoperability — 1EdTech) —
  XML-based item + test format, replaces QTI 2.x; widely used
  in K-12 + higher-ed assessment.
- **Common Cartridge 1.3** (1EdTech) — Package format for course
  content (HTML + LTI links + assessment + discussion-forum +
  web-link); the IMS Thin Common Cartridge variant is the
  practical floor.

**Experience tracking**
- **xAPI 2.0 / IEEE 9274.1.1-2023** — Statement-based "Actor →
  Verb → Object" event model with LRS (Learning Record Store)
  backing; supersedes SCORM for tracking learning outside the
  LMS (simulations, VR, mobile, workplace).
- **cmi5** (ADL) — xAPI profile that defines a SCORM-replacement
  contract (course structure + AU launch + completion +
  satisfaction); the deployable answer when an org wants xAPI
  benefits with SCORM-like packaging.
- **SCORM 2004 4th Edition** (ADL) — Legacy but still dominant in
  corporate L&D; complete in scope (sequencing + navigation +
  rollup); strict packaging via Content Aggregation Model.
- **SCORM 1.2** (ADL) — Older but still ubiquitous; simpler
  (no sequencing); minimum support for any platform that ingests
  external content.

**Credentialing**
- **Open Badges 3.0 / W3C Verifiable Credentials** (W3C
  Recommendation, 2023+ alignment) — Cryptographically signed
  credentials with JSON-LD; replaces Open Badges 2.0's
  baked-image model with a VC envelope; aligns with EBSI
  (European Blockchain Services Infrastructure) and CLR
  (Comprehensive Learner Record).
- **CLR Standard 2.0** (1EdTech) — Verifiable record of
  competencies + achievements; envelope for Open Badges + skill
  + assertion data.

**Accessibility (learner-specific)**
- **WCAG 2.2 AA + AAA** (W3C, Oct 2023) — Floor for any
  learning surface. AAA recommended for assessment paths (the
  educational record depends on the learner being able to
  demonstrate knowledge, not on whether the UI happens to work).
- **AccessForAll 3.0** (ISO/IEC 24751) — Personal needs +
  preferences (PNP) framework; lets learners declare
  accommodations (preferred-modality, captions, audio
  description, alt-text density, signing avatars, reading
  speed) and the system delivers matching DRD (Digitally
  Resource Description) variants.
- **Section 504** (29 USC §794 + 34 CFR Part 104) — US
  prohibition on disability discrimination in federally-funded
  programs; reasonable accommodations required.
- **IDEA** (Individuals with Disabilities Education Act, 20 USC
  §1400+) — IEP (Individualized Education Program) + 504 Plan
  compliance for K-12.
- **DOJ Title II Web Accessibility Final Rule** (April 2024,
  effective dates 2026-2027) — Mandates WCAG 2.1 AA for state +
  local government public-facing AND learner-facing digital
  content; bigger districts (≥50,000) effective Apr 24, 2026.
- **EAA** (European Accessibility Act 2019/882, effective Jun
  28, 2025) — Mandates WCAG 2.1 AA for ed-tech sold to EU.

**Pedagogy + Universal Design**
- **UDL 3.0** (Universal Design for Learning — CAST) — Multiple
  means of engagement / representation / action + expression;
  the framework that turns "accessibility add-on" into
  "designed-in flexibility".
- **IRT 2PL / 3PL / Rasch** (Item Response Theory) — Psychometric
  foundation for adaptive testing; replaces "raw score / total"
  with item-difficulty + learner-ability latent estimation.
- **Bloom's Revised Taxonomy** (Anderson + Krathwohl, 2001) — The
  cognitive-process dimension that learning objectives align to.

**Proctoring / Integrity**
- **NCME Standards for Educational + Psychological Testing** (AERA
  / APA / NCME, 2014 + supplements) — Validity + reliability +
  fairness floor.
- **ABA Model Rules** (for legal-ed remote bar exam) — Strict
  identity-verification + monitoring rules adopted post-COVID.

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

## Core Patterns

### Pattern 1: LTI 1.3 launch — OIDC + JWT, never the LTI 1.1 shared secret

LTI 1.1 / 1.2 used OAuth 1.0a HMAC-SHA1 with a shared secret.
LTI 1.3 replaces this with OpenID Connect + asymmetric JWT.
Every new tool integration MUST be 1.3+; legacy 1.1 only
acceptable when the platform (LMS) doesn't yet support 1.3 AND
the integration is documented as transitional.

**LTI 1.3 launch flow** (high level):

1. **Resource link request** — LMS sends `iss`, `login_hint`,
   `target_link_uri`, `lti_message_hint`, `lti_deployment_id`
   to the tool's OIDC login init endpoint.
2. **OIDC auth request** — Tool redirects to the LMS auth
   endpoint with `response_type=id_token`, `scope=openid`,
   `nonce`, `state`, `prompt=none`, plus the LTI-specific
   `login_hint` echo.
3. **ID Token (LTI launch JWT)** — LMS POSTs a JWT to the tool's
   target_link_uri. JWT is signed with the LMS's RSA private
   key; tool verifies via the LMS's published JWKS endpoint.
4. **Claims validation**:
   - `iss` matches the registered platform
   - `aud` matches the tool's client_id
   - `nonce` matches the value sent in step 2 (replay
     protection)
   - `iat` within ±5 minutes (clock skew tolerance)
   - `https://purl.imsglobal.org/spec/lti/claim/message_type` is
     `LtiResourceLinkRequest` (or `LtiDeepLinkingRequest`)
   - `https://purl.imsglobal.org/spec/lti/claim/version` is
     `1.3.0`
   - `https://purl.imsglobal.org/spec/lti/claim/deployment_id`
     matches the registered deployment

**Reference implementation sketch** (TypeScript):

```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose';

const jwks = createRemoteJWKSet(new URL(platform.jwksUri));

const { payload } = await jwtVerify(launchJwt, jwks, {
  issuer: platform.issuer,
  audience: tool.clientId,
  algorithms: ['RS256'],
  clockTolerance: '5m',
});

// Validate LTI-specific claims
if (payload['https://purl.imsglobal.org/spec/lti/claim/version'] !== '1.3.0') {
  throw new LtiError('lti_version_unsupported');
}
if (payload['https://purl.imsglobal.org/spec/lti/claim/deployment_id'] !== platform.deploymentId) {
  throw new LtiError('lti_deployment_mismatch');
}
// Nonce verification: look up `payload.nonce` in your one-time-use store; reject if reused
const nonceRecord = await nonceStore.consumeOnce(payload.nonce);
if (!nonceRecord) throw new LtiError('lti_nonce_replay_or_missing');
```

Per `ferpa-coppa-compliance.md`, NEVER ship LTI tools that
default to "public roster"; respect the `NRPS` scope only when
the platform admin has granted it, and treat the roster as
educational records.

### Pattern 2: LTI Advantage services — Names + Roles, Assignment + Grade, Deep Linking

LTI Advantage builds three services on top of 1.3:

- **NRPS (Names + Role Provisioning Services)**: fetch the
  context's member list (course roster). Scope:
  `https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly`.
  Returns members with `user_id`, `name`, `email`, `roles`
  (`http://purl.imsglobal.org/vocab/lis/v2/membership#Learner`,
  `Instructor`, `ContentDeveloper`, etc.).
- **AGS (Assignment + Grade Services)**: create line items in
  the LMS gradebook + post scores. Three sub-scopes: lineitem
  read/write, results read, score post.
- **Deep Linking 2.0**: lets the tool return content selections
  to the LMS in a JWT signed by the tool; LMS embeds the
  selected items.

For each service:
1. Tool requests an access token from the platform's token
   endpoint using `client_credentials` + a signed
   `client_assertion` JWT (assertion JWT signed by the tool's
   private key; platform verifies via tool's published JWKS).
2. Platform returns a short-lived bearer token (typically 1
   hour TTL).
3. Tool calls the AGS / NRPS REST endpoint with the bearer
   token in `Authorization: Bearer <token>`.

Tokens MUST be cached + reused until near expiry; minting a new
token per request thrashes both sides.

### Pattern 3: SCORM packaging + the manifest contract

SCORM packages are ZIP files containing `imsmanifest.xml` at
the root. The manifest describes the content organization, the
resources, and the SCORM CAM (Content Aggregation Model)
metadata.

**SCORM 1.2 manifest minimum**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-1" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>Course Title</title>
      <item identifier="ITEM-1" identifierref="RES-1">
        <title>Module 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent"
      adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
```

**Runtime API**:
- SCORM 1.2: `LMSInitialize`, `LMSGetValue("cmi.core.lesson_status")`,
  `LMSSetValue`, `LMSCommit`, `LMSFinish`.
- SCORM 2004: `Initialize`, `GetValue("cmi.completion_status")`,
  `SetValue`, `Commit`, `Terminate` + sequencing extensions
  (`cmi.exit`, `cmi.suspend_data`, `cmi.location`).

Common pitfalls:
- `suspend_data` ≤ 64 KB (SCORM 2004); content authors routinely
  exceed this on save → silent data loss. Compress + bound at
  the authoring tool level.
- Score scaling: SCORM 1.2 uses 0-100; SCORM 2004 uses
  `cmi.score.scaled` (−1 to 1) + `cmi.score.raw`. Mixing
  conventions causes gradebooks to show 0.83 when the learner
  earned 83.
- `lesson_status` vs `completion_status` + `success_status` —
  SCORM 1.2 mashes them; 2004 splits. Map carefully when
  importing 1.2 content into a 2004-native player.

### Pattern 4: xAPI 2.0 — Actor / Verb / Object statement model

xAPI describes any learning event as `{actor, verb, object,
result?, context?, timestamp, authority, version}`. Statements
flow to a Learning Record Store (LRS) over HTTPS POST
`/xAPI/statements`.

**Canonical statement**:

```json
{
  "actor": {
    "objectType": "Agent",
    "account": {
      "homePage": "https://lms.example.edu",
      "name": "user-abc123"
    }
  },
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/completed",
    "display": { "en-US": "completed" }
  },
  "object": {
    "objectType": "Activity",
    "id": "https://courses.example.edu/biology-101/module-3",
    "definition": {
      "name": { "en-US": "Cellular Respiration" },
      "type": "http://adlnet.gov/expapi/activities/module"
    }
  },
  "result": {
    "completion": true,
    "success": true,
    "score": { "scaled": 0.87, "raw": 87, "min": 0, "max": 100 },
    "duration": "PT22M15S"
  },
  "context": {
    "registration": "9f6c3e2a-1b4d-4e8f-a2c7-1234567890ab",
    "contextActivities": {
      "parent": [{ "id": "https://courses.example.edu/biology-101" }],
      "grouping": [{ "id": "https://courses.example.edu/biology-101/cohort-fall-2026" }]
    }
  },
  "timestamp": "2026-05-30T14:32:00Z",
  "version": "2.0.0"
}
```

**xAPI 2.0 / IEEE 9274.1.1-2023 key changes from 1.0.3**:
- `version` field MUST appear in statements.
- IRI-based identifiers normalized (strict comparison).
- Signed statements use JWS over the statement JSON.
- Removed the implicit `1.0.x` versioning fuzziness.

**LRS conformance**: any LRS claiming compliance MUST pass the
ADL LRS Conformance Test Suite. Self-built LRS is rarely the
right answer — use Yet Analytics, Learning Locker (Apereo
Foundation), Veracity, or build on a managed service.

Per `ferpa-coppa-compliance.md`, xAPI statements about minors
ARE educational records under FERPA when sent to a school-
official LRS, AND parental-consent-controlled under COPPA when
sent from a directed-to-children service. The LRS retention
policy MUST honor both regimes.

### Pattern 5: cmi5 — the SCORM replacement that actually deploys

cmi5 sits on top of xAPI and standardizes the SCORM-shaped
contract: a course is a CMI5 package containing `cmi5.xml`
listing AUs (Assignable Units); the LMS launches each AU with
`?endpoint=`, `?fetch=`, `?actor=`, `?registration=`,
`?activityId=` query params; the AU then POSTs xAPI statements
to the LRS.

Minimum required statements per AU lifecycle:
1. `launched` — when the LMS launches the AU.
2. `initialized` — when the AU finishes loading.
3. `passed` / `failed` — pass/fail per the AU's mastery score.
4. `completed` — when completion criteria are met.
5. `terminated` — when the AU is closed by the learner or LMS.

The pass / completed distinction is the killer feature SCORM
1.2 lacked: a learner can complete (finished the content)
without passing (didn't reach mastery), and vice versa.

### Pattern 6: OneRoster 1.2 — the SIS ↔ LMS contract

OneRoster (REST API binding preferred; CSV fallback for legacy
SIS) defines the canonical roster vocabulary:

- `users` — students, teachers, administrators, parents,
  guardians; with `identifier`, `givenName`, `familyName`,
  `email`, `username`, `role`, `enabledUser`, `dateLastModified`,
  `metadata`.
- `orgs` — districts, schools, departments.
- `classes` — class sections (an instance of a course).
- `courses` — the course catalog entry.
- `enrollments` — relationship table linking users to classes
  with a role (student, teacher).
- `academicSessions` — terms / semesters / grading periods.
- `demographics` — separate endpoint, opt-in, FERPA-sensitive.

**REST endpoints**: paginated, last-modified-since
incremental sync, OAuth 2.0 client credentials.

Per `ferpa-coppa-compliance.md` Pattern 6, the **demographics**
endpoint is the highest-sensitivity surface: it carries
race / ethnicity / disability / English-learner status. Default
visibility is OFF; granted only via explicit district consent.

Reuse-first: every roster integration uses the OneRoster spec
+ a battle-tested library (`@studentprivacy/oneroster-client`
for Node, `OneRosterPy` for Python) rather than hand-rolled
parsing.

### Pattern 7: Caliper Analytics — opinionated learning events

Caliper differs from xAPI by being more prescriptive: ~25
predefined Event types (NavigationEvent, AssessmentEvent,
GradeEvent, MessageEvent, etc.) with strict schemas. Vendors
emit Caliper events via a Sensor SDK to an Event Store.

When to choose Caliper over xAPI:
- The data consumers are exclusively LMSs / LMS analytics → Caliper
  (interop with Canvas Data, Schoology Learning Analytics).
- The data consumers include workplace learning, simulations,
  mobile, VR, informal learning → xAPI (broader vocabulary).
- Both → emit Caliper for LMS, xAPI for everything else,
  bridge at the LRS / Event Store.

### Pattern 8: QTI 3.0 — assessment items + tests

QTI 3.0 (2022 release) is the modern format for portable
assessment content. An item is XML defining:
- `<itemBody>` — the prompt (rich HTML + MathML + media).
- `<responseDeclaration>` — the expected response type
  (choice / textEntry / inlineChoice / order / match / hotspot /
  drawing / mediaInteraction / etc.).
- `<outcomeDeclaration>` — scoring outcomes (SCORE, MAXSCORE).
- `<responseProcessing>` — scoring rules (template or
  custom XML).

A QTI test is a collection of items + a `<testPart>` with
`<assessmentSection>`s controlling sequencing, time limits,
shuffling, and adaptive routing.

QTI 3.0 mandates WCAG 2.1 AA for items; `<accessibility>` block
declares the item's accommodation needs + variants. Per
AccessForAll, learners with declared PNP automatically receive
the matching DRD variant.

### Pattern 9: Open Badges 3.0 — Verifiable Credentials, not images

Open Badges 2.0 baked a badge into a PNG/SVG via image
metadata. Open Badges 3.0 is a W3C Verifiable Credential —
JSON-LD with a cryptographic proof. The badge is no longer
attached to an image; the image is a presentation artifact.

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  ],
  "id": "urn:uuid:91537dba-3f97-4e6f-9b8a-1234567890ab",
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": {
    "id": "https://issuer.example.edu",
    "type": ["Profile"],
    "name": "Example University"
  },
  "validFrom": "2026-05-30T00:00:00Z",
  "credentialSubject": {
    "id": "did:example:learner-abc123",
    "type": ["AchievementSubject"],
    "achievement": {
      "id": "https://issuer.example.edu/achievements/data-science-101",
      "type": ["Achievement"],
      "name": "Data Science Fundamentals",
      "criteria": { "narrative": "Completed all modules with score ≥ 80%." },
      "alignments": [{
        "targetFramework": "CASE",
        "targetCode": "DS.1.A.3",
        "targetName": "Statistical reasoning"
      }]
    }
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "created": "2026-05-30T00:00:00Z",
    "verificationMethod": "https://issuer.example.edu/keys/2026",
    "proofPurpose": "assertionMethod",
    "proofValue": "..."
  }
}
```

The cryptographic proof is verifiable WITHOUT calling back to
the issuer; the learner owns the credential and can present it
to employers, transfer institutions, and credential aggregators
(LinkedIn, Credly, EBSI).

### Pattern 10: AccessForAll + UDL — accommodations as a first-class capability

UDL (CAST) frames accessibility as three planes:
1. **Multiple means of engagement** — recruit + sustain interest;
   self-regulation; choice; relevance.
2. **Multiple means of representation** — perception; language +
   symbols; comprehension (multiple media; captions; AD; signed
   video; tactile equivalents).
3. **Multiple means of action + expression** — physical action;
   expression + communication; executive function (multiple
   response modes; assistive-tech support; scaffolding).

AccessForAll (ISO/IEC 24751) operationalizes UDL by letting
learners declare PNP (Personal Needs + Preferences) once; the
system delivers DRD (Digitally Resource Description) variants
that match. Example PNP entries: `display: high-contrast`,
`color: blue-yellow`, `audio: required-captions`, `reading-rate:
slow`, `signing: ASL`, `input: switch-control`.

For assessment specifically, ALL accommodations from the IEP /
504 Plan MUST be honored:
- Extended time (1.5×, 2×, unlimited)
- Read-aloud (screen reader OR human reader)
- Scribe (typing assistance)
- Calculator (basic / scientific / graphing)
- Frequent breaks
- Separate setting (proctor-only)
- Magnification, color overlay, large print

Hard rules:
- Accommodation flags are stored ON the learner's profile, NOT
  in the assessment URL.
- Accommodation determination is the school's responsibility,
  NOT the platform's — but the platform MUST faithfully apply
  what the school has set.
- An assessment that ignores a declared accommodation is a
  Section 504 / ADA violation AND an academic-record-integrity
  violation (the score reflects the disability, not the
  knowledge).

### Pattern 11: Adaptive testing — IRT, not "more wrong → harder"

Adaptive testing means the next item depends on the learner's
prior performance. Naïve "tree of branches" implementations are
psychometrically meaningless; the validated approach is **Item
Response Theory** (Rasch / 2PL / 3PL):

- Each item has parameters: difficulty (b), discrimination (a),
  guessing (c).
- Each learner has a latent ability (θ).
- The probability of a correct response is a logistic function
  of (θ − b).
- After each response, the system updates the posterior
  estimate of θ via MLE / EAP / MAP, then selects the next
  item to MAXIMIZE information at the current θ (often
  Fisher Information Maximization).
- Termination: when SE(θ) drops below a threshold OR a fixed
  item count is reached.

CAT (Computerized Adaptive Testing) requires:
- A calibrated item bank (typically 5-10× the test length;
  items calibrated via field-testing with classical statistics
  + IRT).
- Content balancing (the algorithm prefers high-information
  items, but the test still needs to cover the blueprint).
- Exposure control (Sympson-Hetter; randomesque) so popular
  items don't appear too often.
- Compromise detection (track which items have been seen by
  many learners in quick succession — possible cheating).

For competency-based microlearning, simpler models (knowledge
tracing, BKT, DKT) may be appropriate; for high-stakes
assessment, IRT is the floor.

### Pattern 12: Proctoring — minimize, never weaponize

Remote proctoring routinely produces these harms:
- **Bias against non-white learners** (face-detection models
  perform worse on darker skin tones; flagged for "looking
  away" disproportionately).
- **Bias against disabled learners** (tremor, eye-movement
  conditions, assistive-tech use flag as "suspicious").
- **Bias against learners in shared housing** (background noise
  flags; family member entering room flags).
- **Privacy harms** (recording a learner's bedroom; demanding
  360° room scan; logging keystrokes including passwords typed
  outside the exam window).
- **Data-protection harms** (biometric scans retained
  indefinitely; outside the FERPA / GDPR / BIPA / Illinois
  Biometric Information Privacy Act lawful basis).

Hard rules:
- Default to NO proctoring. Pivot to project-based assessment,
  open-book exams, oral defense, formative assessment, where
  feasible.
- When proctoring IS required, use the LEAST invasive method
  that achieves the validity goal:
  - Human proctor (live or async review) ≻ AI flags + human
    review ≻ AI auto-flag with no human review (NEVER use this).
- Bias-audit every proctoring vendor: demand published TPR/FPR
  by skin tone, gender, age, disability status; reject vendors
  who can't produce one.
- Biometric retention: 30 days max post-exam; explicit consent;
  separate from FERPA records (BIPA requires written informed
  consent in Illinois).
- Accommodations apply: extended time, breaks, separate setting
  ALL pass through to the proctor session.
- Learner has the right to challenge ANY proctoring flag
  before academic consequence.

### Pattern 13: Learning analytics — ethics + transparency

Learning analytics (LA) dashboards predicting "at risk"
learners are deployed widely. Hard rules:

- **Transparency**: the learner (and parent, for minors) MUST
  see what data is collected, what models are trained, what
  predictions are made about them, and how to challenge.
- **Purpose limitation**: data collected for engagement-
  monitoring CANNOT be used for admissions, scholarship, or
  disciplinary decisions without separate lawful basis.
- **Bias audit**: at-risk models trained on historic outcomes
  bake historic discrimination into the predictions. Audit
  TPR/FPR by protected class quarterly.
- **Action discipline**: a prediction of "at risk" must lead to
  SUPPORT (advisor outreach, tutoring offer), never to
  surveillance escalation or pre-emptive academic penalty.
- **GDPR Article 22 + automated-decision-making**: a prediction
  with "legal or similarly significant effect" requires human
  review + the right to obtain human intervention + the right
  to contest.

## Anti-Patterns

### Anti-Pattern 1: Shipping LTI 1.1 in 2026
The OAuth 1.0 HMAC-SHA1 model is end-of-life; tools that
require it will fail platform certification + lose customers as
LMSs deprecate 1.1 support (Canvas + Brightspace already
discourage; Moodle 4.x prefers 1.3+; Blackboard Ultra is
1.3-only). New tools MUST be 1.3+ from day one.

### Anti-Pattern 2: SCORM scoring drift across LMSs
The same SCORM 1.2 package scoring differently in different
LMSs is the most common bug. Causes: `cmi.core.lesson_status`
ambiguity between "completed" and "passed"; LMSs treating
SCORM_DOC's "completed" as "100/100"; content using `cmi.score.raw`
without min/max. Fix: always set min/max; emit both completion +
success status in 2004; test against the Rustici Cloud SCORM
Engine for canonical behavior.

### Anti-Pattern 3: xAPI statements pointing at user-typed
identifiers
`actor.mbox = mailto:user@example.com` works but leaks PII
across the wire. Use `actor.account` with a stable opaque
identifier instead; reserve `mbox`/`mbox_sha1sum` for
single-LMS deployments where the LRS is inside the FERPA
boundary.

### Anti-Pattern 4: Roster sync via direct DB access
SIS vendors sometimes offer "direct DB credentials" as a
faster path than OneRoster. NEVER take this path: it produces
zero schema stability, zero authorization controls, zero audit
trail, and the contract becomes "we sync everything in the SIS
including fields no one consented to share." Use OneRoster
1.2 REST OR Clever/ClassLink-mediated provisioning.

### Anti-Pattern 5: AI tutor / AI grader without dataset
provenance
Building a tutor or grader on a foundation model with no
clarity on what training data the model saw fails on two
fronts: (a) FERPA-protected data may have been in the training
set (the model can leak educational records); (b) the model
may have memorized copyrighted textbook content and reproduce
it. Use only models with documented training-data provenance;
prefer RAG over fine-tuning when grounding is essential; never
let the AI grader's score be the SOLE basis of a grade — always
require human review per `ai-ethics` veto.

### Anti-Pattern 6: Generic "early warning" dashboard with no
intervention pathway
Dashboards that flag learners as "at risk" without naming WHO
intervenes, WHAT the intervention is, and HOW the learner can
challenge the label produce surveillance theater + harm. Every
EWS implementation MUST have a closed intervention loop +
audit log of actions taken per flag.

### Anti-Pattern 7: Adaptive assessment with no validity evidence
"Our algorithm picks easier questions when you get one wrong"
is not adaptive assessment; it's a guessing-friendly UX.
Validated CAT requires a calibrated item bank, IRT modeling,
documented validity + reliability evidence. Without those, the
"adaptive score" has no psychometric meaning, MUST NOT
contribute to academic records, and MUST be labeled "for
practice only."

### Anti-Pattern 8: Proctoring without accommodation support
Proctoring vendors that don't expose accommodation flags
(extended time, frequent breaks, separate setting, scribe,
read-aloud) at the session level are not deployable in
American K-12 or higher-ed. The IEP / 504 / OCR audit trail
WILL find them.

### Anti-Pattern 9: Caliper + xAPI emitted from the same handler
without bridge
Running two parallel event pipelines, one for each
specification, produces drift: event counts differ between
LRS + Event Store, dashboards disagree, and reconciliation is
impossible. Emit canonically into ONE store + bridge to the
other format at read time, OR emit both from the same
source-of-truth event with a contract test that ensures
field-level parity.

### Anti-Pattern 10: Treating MOOCs as exempt from accessibility
"It's a free course on the open web, so accessibility is
nice-to-have." DOJ Title II Final Rule (April 2024) explicitly
applies to public-college MOOCs; ADA Title III applies to
private platforms offering courses to the US public; EAA
applies in Europe. The accessibility floor is not optional and
extends to AT-rendered video transcripts, captions, audio
description, MathML for STEM content, and PDF tagging.

### Anti-Pattern 11: Hardcoded grade scales + locale assumptions
"A is 90+" works in the US, not in Germany (1.0-5.0 inverted),
not in the UK (degree classifications), not in IB (1-7), not
in China (100-point with passing thresholds varying by school
type). Grade representation MUST be a typed
`GradingSchemeRef` with locale + institution context, NEVER a
freeform string assumed to be "A-F."

### Anti-Pattern 12: COPPA non-compliance via "school as agent"
without DPA
A vendor relying on the school-as-agent VPC exception (per
`ferpa-coppa-compliance` Pattern 4) WITHOUT a signed DPA that
documents the school's role + the vendor's data-handling +
ad-free + retention obligations is not actually using the
exception — the vendor is still on the hook for COPPA VPC.
This is the dominant K-12 audit finding in 2024-2025 FTC
investigations.

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

## Cross-References

- `~/.claude/skills/ferpa-coppa-compliance/SKILL.md` — student-
  privacy regulation; always paired with this skill for K-12
- `~/.claude/skills/wcag-accessibility/SKILL.md` — WCAG 2.2 AA
  + AAA implementation
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — when EU /
  CA minors are learners
- `~/.claude/skills/interaction-design/SKILL.md` — learning
  experience design discipline
- `~/.claude/skills/ux-research/SKILL.md` — formative + summative
  user research with learners (with IRB / parental consent)
- `~/.claude/skills/rag-design/SKILL.md` — when AI tutors
  ground answers in course materials
- `~/.claude/skills/prompt-engineering/SKILL.md` — AI-tutor
  system prompts
- `~/.claude/skills/ml-model-selection/SKILL.md` + `mlops-patterns`
  — adaptive engines + at-risk models
- `~/.claude/skills/security-review/SKILL.md` — LTI launch
  signature verification, JWT validation, OAuth client-credential
  rotation
- `~/.claude/skills/observability-patterns/SKILL.md` — Caliper
  + xAPI event pipelines
- `~/.claude/skills/api-design/SKILL.md` — designing additional
  REST endpoints alongside standards-mandated ones
- `~/.claude/skills/research-methods/SKILL.md` — validity +
  reliability evidence for assessment + adaptive engines
- `~/.claude/rules-library/common/a11y.md` — global WCAG floor rule
- `~/.claude/rules-library/common/security.md` — global security
  umbrella (LTI JWT, OAuth, JWKS rotation)
- `~/.claude/rules-library/common/audit-logging.md` — access to
  educational records is audit-logged
- `~/.claude/rules-library/common/data-retention.md` — minor-data
  retention bounded; biometric retention 30 days max
- `~/.claude/agents/accessibility-reviewer.md` — pairs on UI /
  assessment a11y review
- `~/.claude/agents/ai-ethics-reviewer.md` — AI tutor + grader
  + EWS bias review

## Why This Skill Exists

EdTech is the second-most-regulated software domain after
healthcare, with the additional twist that the user base is
disproportionately minors with reduced legal capacity to
consent or contest. Recent enforcement + litigation patterns
that this skill aims to prevent:

- **2024 DOJ Title II Final Rule** — class-action against
  community colleges and state universities for WCAG-non-
  conformant LMSs, captioning failures, and assessment
  platforms locking out blind students.
- **Edmodo FTC settlement ($6M, May 2023)** — COPPA + targeted
  advertising on student data; the kind of pattern that
  recurs across edtech if FERPA + COPPA aren't engineered
  defensively.
- **CDE / state-AG actions on proctoring vendors
  (2020-2024)** — bias against students of color, students
  with disabilities, and students in shared housing leading to
  refunds + injunctions.
- **HEOA + State Authorization Reciprocity Agreement
  (SARA) audits** — institutional liability when third-party
  course materials don't meet accessibility + verification of
  student identity standards.
- **District-AG investigations of "free-for-schools" tools**
  — vendors that monetized "free" K-12 use via behavioral
  advertising or data resale faced state AG + FTC + class-
  action exposure 2023-2025.
- **Open Badges 2.0 deprecation pressure** — credentials
  baked into images that can be tampered with, copied, or lose
  the linked-data context; W3C VC Open Badges 3.0 became the
  only credentialing pattern enterprise + government accepts
  by 2025+.
- **EU AI Act high-risk classification (effective Aug 2026)**
  — education + assessment systems classified as "high risk";
  mandates conformity assessment + risk management + bias
  testing + human oversight + transparency for AI graders,
  proctoring, and admissions tools.

The cost of getting this right: choosing standards-conformant
libraries + paying for accessibility audits + investing in IRT
modeling + signing DPAs + auditing AI components quarterly.
The cost of getting it wrong: losing district contracts,
class-action litigation, OCR investigations, DOJ consent
decrees, and — most importantly — locking learners out of
their own education for reasons unrelated to their knowledge
or capability.

> **Not legal advice. Not pedagogical advice for any specific
> learner.** This skill provides engineering patterns; the
> validity of any assessment, the appropriateness of any
> accommodation, and the legal sufficiency of any consent
> framework requires institution counsel, learning-science
> review, and (for assessment) psychometric expertise.

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
