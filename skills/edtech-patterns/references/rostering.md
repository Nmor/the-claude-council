# edtech-patterns: Rostering

> OneRoster 1.2 as the SIS to LMS contract, including the demographics sensitivity rule. Pointed at
> by the SKILL.md row "Pattern 6".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 6: OneRoster 1.2 — the SIS ↔ LMS contract

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

- a battle-tested library (`@studentprivacy/oneroster-client`
for Node, `OneRosterPy` for Python) rather than hand-rolled
parsing.
