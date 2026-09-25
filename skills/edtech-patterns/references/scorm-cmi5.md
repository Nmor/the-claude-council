# edtech-patterns: Scorm cmi5

> SCORM packaging + runtime API, and cmi5 as the deployable SCORM replacement. Pointed at by the
> SKILL.md rows "Pattern 3" and "Pattern 5".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 3: SCORM packaging + the manifest contract

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

## Pattern 5: cmi5 — the SCORM replacement that actually deploys

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
