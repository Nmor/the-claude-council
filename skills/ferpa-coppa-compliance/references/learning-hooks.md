# ferpa-coppa-compliance: Learning hooks

> Signals to watch and refinement candidates for this skill. Pointed at by the SKILL.md row
> "Learning hooks".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Edtech vendor begins collecting student data without DPA signed — Pattern 7 violation; ED +
  state-AG exposure
- "Directed to children" service ships without VPC workflow — COPPA §312.5 violation
- Age-gate retried after rejection (user re-submits older DOB) without IP/cookie prevention —
  Pattern 8 weakening
- Biometric (face, voice, fingerprint) collected from under-13 without elevated VPC — COPPA 2025
  Rule violation
- Behavioural advertising / cross-site tracking SDK appears on student-facing screen — Anti-pattern
  3 violation
- Parent retains access to records after student turns 18 / post-secondary — Anti-pattern 4 FERPA
  violation
- AI tutoring forwards student work to third-party LLM without DPA sub-processor amendment —
  Anti-pattern 8 violation
- "Aggregated" student data sold / used for non-educational purpose — Anti-pattern 6 SOPIPA / §2-d
  violation
- Directory-information opt-out not respected at runtime — Pattern 6 weakening
- PPRA survey deployed in school without parent notice + opt-out — Pattern 9 violation
- NY §2-d Parent Bill of Rights not distributed to parents at contract execution — §2-d violation
- Background check missing on vendor employee with student-data access — Anti-pattern 7 state-law
  violation
- Retention period not configured per LEA's DPA — Pattern 7 weakening
- Breach notification SLA missed (NY 7-day, varies by state) — §2-d violation
- COPPA 2025 retention review not performed — Pattern 3 weakening

**Refinement candidates**:

- New state-law row when a new state passes student-privacy legislation (NJ A1493, MA H.4154, IL
  SB1463 currently in flight)
- New AI-in-education guidance row when ED OPP / FTC issues policy clarification on AI tutoring +
  student data
- New consent-method row when FTC approves a new VPC mechanism
- New DPA-template row when SDPC NDPA releases an updated version
- New cross-reference when a sister skill (hipaa-compliance for school-health, audit-logging) adds a
  control
- Tightening of biometric protections when state laws (IL BIPA expansion, TX CUBI, WA H.B. 1493) add
  to the floor
