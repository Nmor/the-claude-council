# Code of Conduct

The Claude Council adopts the **Contributor Covenant**, version
**2.1**, as its Code of Conduct.

- **Canonical text**: <https://www.contributor-covenant.org/version/2/1/code_of_conduct/>
- **Enforcement Guidelines** (four-tier escalation):
  <https://www.contributor-covenant.org/version/2/1/code_of_conduct/#enforcement-guidelines>
- **Translations**: <https://www.contributor-covenant.org/translations>
- **Adoption rationale**: per `rules-library/common/code-of-conduct.md`
  rule 1 — reuse the standard, do not roll a custom version.

## Scope

This Code of Conduct applies to all project spaces, including but
not limited to:

- This GitHub repository (issues, pull requests, discussions,
  reviews, releases, the wiki, code comments)
- Any chat / forum / mailing list the project hosts or
  officially endorses
- Conference talks, booths, workshops, meet-ups, and online or
  in-person events where contributors represent the project
- Social media when a contributor is acting in their project
  capacity
- One-to-one communication between contributors when the topic
  is project-related

The Code applies equally to contributors, reviewers, maintainers,
and visitors. Long-standing contributors are held to the same
standard as first-time visitors — there is no seniority carve-out.

## Reporting

Two reporting channels are supported:

1. **GitHub Security Advisories** (private, recommended for
   sensitive reports):
   <https://github.com/Nmor/the-claude-council/security/advisories/new>
   (note: this surface accepts conduct reports in addition to
   security reports — flag the advisory as "Conduct" in the
   first line of the report)
2. **Direct contact** with the maintainer: the canonical email
   is published in the maintainer's GitHub profile
   (<https://github.com/nmor>). Use the subject
   `[CONDUCT] <one-line summary>`.

Anonymous reports are accepted but limit our ability to follow
up. Where possible, please share at least a pseudonymous contact
so we can ask clarifying questions.

## What to include

A useful report names:

1. **What happened** — facts, in your own words. Quote messages
   when possible.
2. **Where + when** — the specific space (issue link, PR link,
   event, channel) and timestamps (UTC preferred).
3. **Who was involved** — handles of the people you observed.
   If you are unsure of someone's full identity, share what
   you saw.
4. **Impact** — what effect the behaviour had on you or on the
   community.
5. **Evidence** — screenshots, links, log entries. Redact your
   own private information when possible; we will work with what
   you provide.
6. **What you would like to happen** — a private apology, a
   warning to the participant, a ban, an outcome update from us,
   or no specific request (your call).

## Confidentiality + reporter protections

The maintainer commits to:

- Treating your identity as confidential. We share information
  with parties named in the report only when investigation
  requires it, and we tell you before we do.
- Not retaliating against good-faith reporters, and not
  permitting other contributors to do so. Retaliation is itself
  a Code of Conduct violation, treated at the highest severity.
- Not sharing your identity with third parties (employers,
  other communities, public posts) without your explicit
  consent.
- Telling you the outcome of the investigation, within the limits
  of the alleged violator's privacy.

## Response process + timeline

| Step | Target |
| --- | --- |
| Acknowledgement of receipt | 72 hours from report. |
| Initial triage (severity, scope, conflict-of-interest check) | 7 days. |
| Investigation + outcome decision | 30 days for most reports; longer with notice for complex cases requiring multiple parties' input. |
| Outcome communicated to reporter + (if action taken) to the participant | Same day as decision. |
| Aggregate transparency log entry | Next quarterly report. |

The four-tier consequence ladder follows the Contributor Covenant
Enforcement Guidelines (Correction → Warning → Temporary Ban →
Permanent Ban). Each tier names the criteria + the response;
see the Enforcement Guidelines URL above for the full text.

## Conflict of interest

The repo is currently single-maintainer (). If a report
concerns the maintainer themselves, please escalate to one of
the following external channels:

- **Open Source Diversity Outreach** (org-level mediation):
  <https://opendiv.org/>
- **The Contributor Covenant maintainer's office hours**:
  <https://www.contributor-covenant.org/>
- **A trusted external community member** of your choice; the
  project will cooperate with any external mediator the
  reporter brings.

As the project grows, this section will be updated to name an
internal Code of Conduct Committee (minimum three members,
rotating membership, documented recusal process).

## Decisions + review

Conduct decisions are final from the maintainer's chair, with
two exceptions:

1. Bans of 30+ days carry an automatic 12-month review on the
   anniversary; the banned person may request reinstatement
   with a written reflection on the events.
2. Decisions concerning the maintainer themselves route through
   an external mediator per the Conflict of Interest section.

## Pull-request review gate

Every pull request to this repository requires explicit review
approval from the maintainer () before it may merge.

- CODEOWNERS (`.github/CODEOWNERS`) routes every path to .
- Branch protection on `main` requires:
  - At least one approval from a CODEOWNER
  - Dismiss stale pull request approvals when new commits land
  - Restrict who may dismiss pull request reviews to the
    maintainer
  - Require status checks to pass before merging
  - No auto-merge bypassing the maintainer
  - No force-pushes to `main`
- Contributors who repeatedly attempt to bypass the review gate
  (e.g., merging via admin override on their own PR, force-
  pushing to `main`, creating a separate branch protection
  exception) are in violation of this Code in addition to the
  repository's technical controls.

The review gate is a substantive part of how the repo stays
trustworthy. It is not a formality.

## Transparency

Once per year, the maintainer publishes an aggregate report in
`docs/transparency/<year>.md` (created when the first report
ships) covering:

- Number of reports received
- Number of actions taken at each tier (Correction, Warning,
  Temporary Ban, Permanent Ban)
- Number of reports declined and the high-level reasoning
- Any policy updates that resulted from the year's reports

No identifying details about reporters or alleged violators
appear in the public report. Internal records are retained for
two years from the date of the report, then minimised per
`rules-library/common/data-retention.md`.

## Acknowledgements

This document adopts the [Contributor Covenant](https://www.contributor-covenant.org)
version 2.1, available at
<https://www.contributor-covenant.org/version/2/1/code_of_conduct/>.

The enforcement framework follows the Contributor Covenant
Enforcement Guidelines.

For answers to common questions about this code of conduct, see
the FAQ at
<https://www.contributor-covenant.org/faq>.

Translations are available at
<https://www.contributor-covenant.org/translations>.

---

This adoption file is licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) to
align with the Contributor Covenant's license.
