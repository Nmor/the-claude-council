# edtech-patterns: Integrity and analytics

> Proctoring harms and minimisation, plus learning-analytics ethics and transparency. Pointed at by
> the SKILL.md rows "Pattern 12" and "Pattern 13".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 12: Proctoring — minimize, never weaponize

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

## Pattern 13: Learning analytics — ethics + transparency

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
