# edtech-patterns: Xapi caliper

> The two learning-event pipelines: open-vocabulary xAPI 2.0 and prescriptive Caliper Analytics.
> Pointed at by the SKILL.md rows "Pattern 4" and "Pattern 7".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 4: xAPI 2.0 — Actor / Verb / Object statement model

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

## Pattern 7: Caliper Analytics — opinionated learning events

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
