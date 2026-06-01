<!--
Thank you for contributing to The Claude Council!

This template mirrors the Council Conversation Protocol from CLAUDE.md
plus the done-criteria.md gates that every change must clear before
merge. Fill in what applies; mark N/A explicitly for what doesn't.
-->

## Summary

<!-- 1-3 sentence description of WHAT this changes and WHY. Not a
     restatement of the diff — the diff speaks for itself. -->

## Change class

<!-- Tick exactly one. Drives which Extended Council Divisions
     auto-engage per ~/.claude/rules/common/council-triggers.md. -->

- [ ] **Trivial** — typo / doc tweak / single-file fix (Abbreviated Council)
- [ ] **Standard** — bug fix / small feature / refactor (Full Council)
- [ ] **Critical** — auth / payments / data migration / new integration (Extended Council + user approval)
- [ ] **Strategic** — architecture / vendor / new product surface (Extended Council + ADR)

## Council Phase 0 — research

<!-- Per ~/.claude/rules/common/task-intake-due-diligence.md.
     Compact-table form acceptable for medium tasks; expand to
     per-question subsections for large plans. -->

- **Prior art (codebase):**
- **OSS option (USE / EXTEND / CUSTOM):**
- **Canonical reference / primary-source URL:**
- **Failure modes (FMEA top 3):**
- **STRIDE summary:**
- **Compliance scope (applicable regs OR N/A):**
- **a11y level (WCAG 2.2 AA / AAA / N/A):**
- **Rollback plan:**

## Council Divisions engaged

<!-- Core Five always speak; Extended Eleven auto-fire per
     ~/.claude/rules/common/council-triggers.md.
     Tick every Division that engaged on this change. -->

**Core Five (always):**

- [ ] Division 1 — Architecture & Planning
- [ ] Division 2 — Implementation & Build
- [ ] Division 3 — Quality & Review
- [ ] Division 4 — Security
- [ ] Division 5 — Testing & QA

**Extended Eleven (auto-fired on signals):**

- [ ] Division 6 — Compliance & Legal (VETO)
- [ ] Division 7 — Product, UX & CX
- [ ] Division 8 — Operations & Reliability
- [ ] Division 9 — Data & Analytics
- [ ] Division 10 — Finance & FinOps
- [ ] Division 11 — Risk Management (VETO)
- [ ] Division 12 — Strategy & Innovation
- [ ] Division 13 — People & Culture
- [ ] Division 14 — Sustainability & ESG
- [ ] Division 15 — Ethics & Responsible AI (VETO)
- [ ] Division 16 — Communications & Documentation

## Verification block (this PR)

<!-- Per ~/.claude/rules/common/verify-before-claim.md — every claim
     of "ready" requires same-turn proof. Paste the actual output
     of the gates this branch ran. -->

```text
bootstrap/verify.sh:                <result>
tests/verify-link-integrity.sh:     <result>
tests/verify-no-orphans.sh:         <result>
tests/verify-standards-citations.sh: <result>
markdownlint-cli2:                  <result>
shellcheck -S style:                <result>
gitleaks detect:                    <result>
```

## Done-criteria checklist

<!-- Per ~/.claude/rules/common/done-criteria.md.
     Tick what applies; explicitly skip what doesn't. -->

- [ ] No hardcoded secrets (gitleaks clean; no `sk_live_`,
      `AKIA…`, `ghp_`, `Bearer eyJ…` prefixes)
- [ ] No per-line lint suppressions added (`// eslint-disable`,
      `//nolint`, `# noqa`, `<!-- markdownlint-disable -->` — see
      `~/.claude/rules/common/extreme-lint-policy.md`)
- [ ] No banned comment vocabulary (Sonar rule IDs, "legacy",
      "byte-identical", "previous form" — see
      `~/.claude/rules/common/coding-style.md` Comments section)
- [ ] Cross-references updated (any new rule / skill / agent
      file is referenced from at least one index / parent)
- [ ] CHANGELOG.md updated (Keep a Changelog format) when this
      changes user-visible behaviour
- [ ] README.md updated when this changes the install /
      bootstrap / verify flow
- [ ] Docs are in sync (per
      `~/.claude/rules/common/docs-sync-with-code.md`)
- [ ] Learning hooks present on any new rule / skill / agent
      (per `~/.claude/rules/common/continuous-learning-mandate.md`)

## Cross-platform check

<!-- macOS default bash is 3.2 — no `mapfile`, no associative
     arrays. CI runs on ubuntu-latest (bash 5.x); local-laptop
     verifiers must work on bash 3.2. -->

- [ ] Any new shell scripts are bash-3.2 compatible (tested on
      macOS default) OR explicitly require bash 4+ in a header
      comment
- [ ] PowerShell scripts (`.ps1`) parse-check on Windows OR are
      annotated as Linux/macOS-only
- [ ] No platform-specific binary assumptions (use `mktemp -d`,
      not `tempfile`; use `awk`/`sed` POSIX features only)

## Reviewer guidance

<!-- What should the reviewer look at most carefully? -->

-

## Linked discussions

<!-- Issue numbers, ADRs, design docs. -->

-

---

By submitting this PR, you confirm the change has been mediated by
the Council (per `~/.claude/CLAUDE.md`), every gate above has been
run on the current state of this branch (per
`~/.claude/rules/common/verify-before-claim.md`), and the
verification output is real (per
`~/.claude/rules/common/no-overclaim.md`).
