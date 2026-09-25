---
name: gdpr-ccpa-compliance
description: GDPR + CCPA/CPRA implementation patterns — lawful basis documentation, data subject rights, consent management, cross-border transfers, breach notification, DPIA, and RoPA. Implementation arm of the gdpr-ccpa.md rule. Also lazy-loads data-retention.md / audit-logging.md content migrated from rules/common/ on 2026-06-02.
paths:
  - "**/privacy*"
  - "**/consent*"
  - "**/gdpr*"
  - "**/ccpa*"
  - "**/cpra*"
  - "**/dsar*"
  - "**/dpa*"
  - "**/dpia*"
  - "**/ropa*"
  - "**/cookie*"
  - "**/terms*"
  - "**/pii*"
  - "**/retention*"
  - "**/audit*log*"
  - "**/audit-trail*"
  - "**/data-subject*"
  - "**/data-export*"
  - "**/data-deletion*"
  - "**/right-to-be-forgotten*"
  - "**/user-data/**"
  - "**/legal/**"
  - "**/compliance/**"
  - "**/users.*"
  - "**/accounts.*"
  - "**/customers.*"
---

# GDPR / CCPA / CPRA Compliance

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check

The privacy regulation landscape is mechanical at the code level. This skill encodes the patterns
that move a product from "we have a privacy policy" to "we can answer a regulator's questions with
evidence."

## Purpose

GDPR (EU), UK GDPR, CCPA + CPRA (California), LGPD (Brazil), POPIA (South Africa), PIPEDA (Canada),
APPI (Japan), PDPA (Singapore) — different regulators, similar shapes. The patterns below cover the
lowest-common-denominator implementation that satisfies all named regimes.

The expensive failures: GDPR fines up to €20M / 4% global turnover; CCPA $7,500/intentional
violation; class actions in jurisdictions that allow them; loss of customer trust + brand damage.

## When to Fire

- Any field collection touching personal data (signup, profile, KYC, contact form)
- Any analytics event capturing user behaviour
- Any cookie / local storage / tracker
- Any third-party processor (Stripe, Twilio, OpenAI, etc.)
- Any data export to another region
- Any account-deletion / data-export endpoint
- Any consent banner
- Any data-retention setting

## How this skill is organised (read this first)

This skill bundles the implementation patterns plus two full migrated rules. Carrying
all of it inline made this file 49 KB — loaded in full on **every** touch of **every**
file matching the `paths:` globs above, which is most of a codebase's privacy, legal,
user and audit surface. Context is a quality resource, not just a cost one: a window
spent on the breach runbook is attention taken from the consent banner being written.

So the routing table stays here, and the detail lives in `references/`. **Read the
reference file for the concern the current change actually touches** — that is one
Read, not the whole 49 KB.

| Reference | Topic | What it holds |
| --- | --- | --- |
| [`core-patterns.md`](references/core-patterns.md) | Standards cited | The 10 regulations + frameworks this skill implements, with version / effective dates |
| [`core-patterns.md`](references/core-patterns.md) | Core patterns | RoPA (Art 30), lawful basis at collection, consent management, CJEU-compliant cookie banner, DSAR (Art 15-22), cross-border transfers, DPIA (Art 35), breach notification (Art 33/34), pseudonymisation + anonymisation, children's data (Art 8 / COPPA) |
| [`verification.md`](references/verification.md) | Anti-patterns + verification checklist | The 10 privacy anti-patterns to reject; the 17-item pre-ship checklist |
| [`rationale-and-learning.md`](references/rationale-and-learning.md) | Rationale + learning hooks | Why this skill exists; the continuous-learning signals + refinement candidates |
| [`gdpr-ccpa-rule.md`](references/gdpr-ccpa-rule.md) | GDPR / CCPA / Global Privacy Rule (migrated) | The full rule: what counts as personal data, 10 hard rules, per-data-store enforcement, 7 mistakes to avoid, tooling, standards |
| [`data-retention-rule.md`](references/data-retention-rule.md) | Data Retention Rule (migrated) | The full rule: data classification, automated enforcement, real deletion + cascade, backups, k-anonymity, DSAR SLAs, legal hold, retention-by-regulation table |

## Cross-References

- `~/.claude/rules-library/common/gdpr-ccpa.md` — always-on rule (this skill is implementation)
- `~/.claude/rules-library/common/data-retention.md` — retention windows
- `~/.claude/rules-library/common/audit-logging.md` — DSAR audit trail
- `~/.claude/rules-library/common/secrets-management.md` — encryption keys
- `~/.claude/rules-library/common/runbook-template.md` — breach response
- `owasp-asvs` skill — overlaps V8 (data protection)
- `iso27001-controls` skill — overlaps Annex A.5.34 (privacy)
- `soc2-readiness` skill — overlaps Privacy criterion
- `compliance-reviewer` agent (Division 6) — opus

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the
lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/gdpr-ccpa.md`
- `rules-library/common/data-retention.md`
