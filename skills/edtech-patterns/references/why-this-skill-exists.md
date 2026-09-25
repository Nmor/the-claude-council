# edtech-patterns: Why This Skill Exists

> The enforcement and litigation record this skill exists to prevent, plus the not-legal-advice
> boundary. Pointed at by the SKILL.md row "Why This Skill Exists".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
