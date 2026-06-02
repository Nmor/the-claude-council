# Code of Conduct Rule (Always-On, Global)

> Auto-fires on every file. Sister to `documentation-requirements.md`,
> `security.md`, `audit-logging.md`. Standards: **Contributor
> Covenant v2.1** (most-adopted), **Django CoC**, **Mozilla
> Community Participation Guidelines**, **Geek Feminism Anti-
> Harassment Policy** (foundational). Legal: **EU EAA enforcement
> context**, **US Title VII / EEOC**, **GDPR Article 6** (reporter
> data lawful basis).

## Core Principle

**Every collaborative codebase, community, organisation, and
event has a published Code of Conduct that defines expected
behaviour, named unacceptable behaviour, an enforcement
mechanism, and a reporting path. The CoC is signed by every
contributor (PR template includes acknowledgement); enforcement
is consistent, transparent (in aggregate), and protective of
reporters.**

A repo without a CoC signals one of: "we don't host
contributors," "we don't know what we'd do if behaviour was a
problem," or "we tolerate behaviour we shouldn't." None of these
is acceptable.

## Why every project + organisation needs one

| Stakeholder | Why they care |
| --- | --- |
| **Contributors** | Know what's expected; know they're protected |
| **Maintainers** | Have a tool for hard decisions (banning, removing, escalating) |
| **Legal / HR** | CoCs document the "reasonable steps" required by anti-harassment law |
| **Customers / users** | A community that's safe to participate in is one they trust to give feedback |
| **Funders / sponsors** | Open-source funders require a CoC |
| **Enterprise procurement** | Vendor questionnaires ask about CoC + DEI |

## Hard rules

### 1. Adopt the Contributor Covenant (don't write your own)

Per `reuse-first.md` — there's a well-tested standard, used by
40,000+ open-source projects, including Python, Go, Linux Kernel
(adapted), Rust, Apache Foundation. Use it:

```
# CODE_OF_CONDUCT.md

# Contributor Covenant Code of Conduct

[Full Contributor Covenant 2.1 text]
[Or link to the canonical: https://www.contributor-covenant.org/version/2/1/code_of_conduct/]

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behaviour
may be reported to the community leaders responsible for enforcement
at: conduct@example.com

All complaints will be reviewed and investigated promptly and fairly.

All community leaders are obligated to respect the privacy and security
of the reporter of any incident.
```

DO add: project-specific contact + escalation path + clarifications
where the Covenant's general text isn't specific enough for your
context.

DO NOT: water down the Covenant, add "free speech" carve-outs, or
write a custom CoC from scratch (you will miss things; lawyers
review the Covenant; your draft won't be).

### 2. CoC applies to ALL project spaces

The CoC's scope is explicit:

- Code repositories (issues, PRs, commits, code comments, review
  comments)
- Mailing lists, Discord, Slack, Discourse, Matrix
- Conference talks + booths + parties
- Online + offline events the project hosts
- Social media when representing the project
- 1:1 communication between contributors when project-related

The scope statement is in the CoC. NO ambiguity about "is the
Discord covered." It IS covered.

### 3. Enforcement is a documented process

Three documented states (Contributor Covenant Enforcement Guidelines):

| Severity | Behaviour example | Consequence |
| --- | --- | --- |
| **1. Correction** | Inappropriate language; unprofessional behaviour | Private warning + public apology if needed |
| **2. Warning** | Single incident or series of actions | Warning with consequences; no interaction with people involved for specified time |
| **3. Temporary ban** | Serious violation; sustained inappropriate behaviour | Temporary ban from all interaction (length specified) |
| **4. Permanent ban** | Pattern of violation; harassment; aggression toward classes of individuals | Permanent ban from all interaction |

Each escalation has a published criteria. The committee
documents the decision (privately); reporters get a status
update.

### 4. Reports are handled by a TEAM, not the founder

Single-person enforcement creates:

- Founder being the violator → no recourse
- Founder being the violator's friend → bias
- Founder absent / unresponsive → reports lost
- Burnout / single-point-of-failure

Establish a CoC Committee:

- 3+ members, diverse demographics where possible
- Trained in trauma-informed response
- Documented confidentiality rules (Chatham House at minimum)
- Documented conflict-of-interest recusal process
- Rotating membership (1-2 year terms)

For small projects: pair maintainers with an external advisor
(another OSS maintainer; the foundation hosting the project).

### 5. Reporting paths are visible + multiple

Every CoC names at least 2 reporting paths:

- Email address (`conduct@example.com`) — checked by the
  committee, not the founder personally
- Web form (per-incident structured intake)
- Anonymous reporting option (with the caveat that anonymous
  reports may limit investigation)
- For events: an in-person contact

Reporting documented + visible:

- On the website
- In the README
- In the CoC document
- In conference badges
- In Slack/Discord pinned messages
- At event registration

### 6. Reporters are protected

The CoC explicitly states:

- Reporter identity is confidential to the extent possible
- No retaliation against reporters (a separate violation if it
  happens)
- Reports are not held against the reporter (even if the report
  doesn't result in action, the reporter doesn't suffer)
- The reporter is informed of the outcome (within reason — the
  alleged violator's privacy also matters)

Retaliation is a separate, severe CoC violation. Most reporting
fears are about retaliation; address it explicitly.

### 7. Pre-publication action: train + simulate

Before publishing the CoC:

- Committee members receive harassment-response training (online
  courses; Project Include's resources; AlterConf material)
- Tabletop simulations: "A senior contributor publicly mocks a
  newcomer's question. What do you do?" "An attendee at our
  conference reports a sexual harassment incident. What do you
  do?"
- Decision trees documented for common scenarios
- Tools set up: a private repository for committee
  communications; secure file storage; access controls

A CoC published without preparation is a promise the project
can't keep.

### 8. Audit logging without doxxing

Per `audit-logging.md` — moderation actions ARE audited:

- Action taken (warning, ban, removal)
- Date
- Scope (which platform / repo / event)
- Severity tier
- Decision rationale (private)

NOT:

- The reporter's name (separately, in restricted committee notes)
- The full report contents in public logs
- Personal details about the violator beyond what's necessary

Aggregate stats CAN be published (annual transparency reports):
"In 2026 we received N reports, took action on M, banned K
contributors permanently." Counts only; no identifying details.

### 9. The CoC is reviewed annually

Communities change; norms evolve; legal landscape shifts. Each
year:

- Committee reviews the CoC text
- Reviews the year's incidents (anonymised)
- Updates the document if needed
- Re-trains committee members
- Publishes a transparency report

A CoC last updated in 2018 is a CoC that doesn't reflect 2026
norms.

### 10. CoC applies to everyone including leadership

If the project's lead developer harasses contributors, the CoC
applies to them too. This is the hardest enforcement scenario;
it's also the most important. Plans:

- Lead steps aside during investigation
- Independent reviewers (external committee, foundation-level
  escalation) handle the case
- Outcomes are PUBLIC if the lead is sanctioned (people need to
  know the project is safer; transparency builds trust)

No-one is above the CoC. The CoC has teeth or it has nothing.

## Common pitfalls

### Pitfall 1: "We don't need one, we're a small team"

When you grow + when an incident happens, you'll need one. The
CoC isn't there for the 99% of interactions that go fine — it's
there for the 1% that don't.

### Pitfall 2: "Code of Conduct? You mean restricting free speech?"

Free speech protects you from the government; it doesn't
require any community to host any expression. A CoC defines the
community's terms; participation is voluntary; everyone benefits
from clarity.

### Pitfall 3: Vague enforcement

"Be excellent to each other" — what does that mean in practice?
The CoC names specific behaviours: harassment, doxxing, slurs,
sexual imagery in shared spaces, sustained disruption.
Specificity protects reporters AND alleged violators (they know
what crossed the line).

### Pitfall 4: Enforcement only against newcomers

Long-standing contributors who violate the CoC must be held to
the same standard. The most damaging CoC failure mode: "But
they've been here forever; they don't really mean it." Yes,
they do, and they must follow the rules anyway.

### Pitfall 5: Reading the CoC as the only deliverable

Adopting Contributor Covenant takes 30 minutes. The hard work is
the enforcement infrastructure (committee, training, channels,
record-keeping, transparency reports). The document is the
START.

## Adapted for organisations (not just OSS)

Companies need internal equivalents:

- **Anti-harassment policy** (legally required in most
  jurisdictions)
- **Code of business conduct + ethics**
- **DEI policy**
- **Whistleblower policy** (Dodd-Frank in US for finance;
  similar in EU)
- **Workplace investigations process**

The mechanics are the same: published policy, trained team,
reporting channels, protected reporters, documented enforcement.

## Cross-references

- `documentation-requirements.md` — CoC is one of the required
  repo files
- `security.md` A09 — logging; CoC actions logged appropriately
- `audit-logging.md` — moderation audit trail
- `gdpr-ccpa.md` — reporter data lawful basis (Article 6(1)(f)
  legitimate interest, or 6(1)(c) legal obligation for
  workplace harassment)
- `repo-setup-checklist.md` — CODE_OF_CONDUCT.md required at
  setup time
- `task-intake-due-diligence.md` Q13 (i18n — CoC translates),
  Q26 (operational handoff)
- `secrets-management.md` — committee tools / channels have
  proper access controls

## Standards cited

- **Contributor Covenant v2.1** (contributor-covenant.org)
- **Mozilla Community Participation Guidelines**
- **Django Code of Conduct** (django-coc.com — first major
  open-source CoC, 2013)
- **Geek Feminism Anti-Harassment Policy** (foundational
  template)
- **Project Include** (projectinclude.org — startup-focused
  guidance)
- **ISO/IEC 30134** (workplace conduct frameworks)
- **EEOC Guidelines** (US) — Title VII workplace harassment
- **Equality Act 2010** (UK)
- **EU Equal Treatment Directive 2000/78/EC**

## Why this rule exists

Projects + organisations WITHOUT CoCs lose contributors,
attract bad actors, and face liability when incidents happen.
Projects + organisations WITH well-enforced CoCs build trust,
attract diverse contributors, and have a tool to make hard
calls.

The Contributor Covenant adoption pattern across major OSS
(Linux Kernel, Python, Go, Rust, Node, React, Vue, Kubernetes)
isn't an accident — it works. Projects that adopt+enforce see:

- More diverse contributor bases
- Higher contributor retention
- Lower drama / less time spent on conflict management
- Clearer paths through difficult situations

Projects that don't:
- Lose contributors silently (they don't tell you why they
  leave)
- Develop "missing stair" patterns (everyone knows person X is
  toxic, no-one says anything publicly)
- Face public-relations crises when incidents go viral

The cost of a CoC + enforcement infrastructure: a few days of
setup + ongoing committee time. The cost of NOT having one:
people, trust, and sometimes the entire project.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New OSS repo created without `CODE_OF_CONDUCT.md` (rule 1 violation)
- CoC text watered down vs Contributor Covenant baseline (rule 1 weakening)
- Scope statement missing or ambiguous about specific spaces (Discord, conf parties, social media) — rule 2 weakening
- Enforcement guidelines not documented (the four-tier escalation absent)
- Single-person enforcement (no committee) — rule 4 violation
- Reporting paths < 2 OR not visible on website / README / event badges (rule 5 weakening)
- No documented retaliation-protection clause (rule 6 weakening)
- Pre-publication training / tabletop simulations skipped (rule 7 weakening)
- Moderation actions taken without audit log entry (rule 8 weakening)
- CoC last reviewed > 12 months ago (rule 9 weakening — stale norms)
- Long-standing contributor's CoC violation handled differently from newcomer's (rule 10 violation)

**Refinement candidates**:
- New row in the published-Covenant adoptions when a new major OSS or org joins (e.g., new foundation, new vendor)
- Tightening of the committee composition criteria when conflict-of-interest patterns recur
- New cross-reference when a sister rule (audit-logging, gdpr-ccpa) provides the moderation-record contract
- New scenario in the tabletop-simulation library when a recurring incident class emerges (e.g., DM harassment, doxxing via screenshot, AI-generated impersonation)
