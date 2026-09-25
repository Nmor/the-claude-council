# edtech-patterns: Anti-Patterns

> The twelve edtech anti-patterns and the named alternative for each. Pointed at by the SKILL.md row
> "Anti-Patterns".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
