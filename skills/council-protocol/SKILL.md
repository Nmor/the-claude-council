---
name: council-protocol
description: Council Conversation Protocol — Phase 0 Deep Research (29-question intake + codebase exploration + online research), Phase 1 Council Discussion (5 Core + 11 Extended divisions), Phase 2 Consensus (GO/NO-GO + vetoes), Phase 3 Implementation, and Post-Implementation Review templates. Plus Research Requirements by Task Type and Conversation Rules (order of speaking, disagreement protocol, escalation). Use when running Council Protocol against any non-trivial task, when authoring plans/ADRs/runbooks, or when delegating to specialized agents in a structured multi-phase flow.
paths:
  - "~/.claude/plans/**/*.md"
  - "**/.claude/plans/**/*.md"
  - "docs/adr/**/*.md"
  - "**/docs/adr/**/*.md"
  - "~/.claude/agents/**/*.md"
  - "**/.claude/agents/**/*.md"
  - "docs/runbook*.md"
  - "**/runbook.md"
  - "**/runbook-*.md"
---

# Council Conversation Protocol

> Migrated 2026-06-02 from `~/.claude/CLAUDE.md` lines 338-921 as
> part of the lazy-rules-loading plan. The Council Protocol's
> "always-on" contract lives in Floor (`council-default.md`,
> `principal-level-mandate.md`); the FULL phase templates +
> per-task research requirements + conversation rules + post-
> implementation review live HERE and lazy-load when a
> plan / ADR / agent / runbook file is touched.

## When to activate

This skill fires when:

- Any plan file under `~/.claude/plans/` or
  `<workspace>/.claude/plans/` is opened or edited
- Any ADR file under `docs/adr/` is opened or edited
- Any agent file under `~/.claude/agents/` is opened or edited
- Any runbook file (e.g. `docs/runbook.md`) is opened or edited

The Floor rule `council-default.md` keeps the Council always-
convening; this skill provides the FULL TEMPLATES so the
assistant doesn't have to reconstruct them from memory.

## Phase 0: Deep Research (MANDATORY before any discussion)

Before divisions can speak, conduct exhaustive research. Phase 0
begins with the 29-question task intake from
`~/.claude/rules/common/task-intake-due-diligence.md` (Floor)
— this populates the prior-art / OSS-option / scalability /
integration / failure-mode / security / data-lifecycle /
compliance / accessibility / i18n / test-strategy /
observability / cost / rollback / deprecation / UX-writing /
docs / risk / success-criteria / monitoring / AI-ethics /
vendor-IP / handoff fields that the divisions then discuss in
Phase 1. Online research is mandatory (per `~/.claude/rules/
common/official-docs-first.md`). Skipping the intake is a
violation of the same severity as skipping the divisions.

```text
===============================================================
                      PHASE 0: DEEP RESEARCH
===============================================================

TASK: [Restate the user's request clearly]

---------------------------------------------------------------
TASK INTAKE (per `task-intake-due-diligence.md`)
---------------------------------------------------------------

29 questions. Compact-table form for medium tasks; per-question
subsections for large plans; abbreviated (Q1 + Q2 + Q27) for
trivial work. Output documented and durable — the intake lives
in the plan file (`~/.claude/plans/<slug>.md` or
`<project>/.claude/plans/`) and is not redone for the same task
across sessions.

| # | Question | Answer summary |
| --- | --- | --- |
| 1 | Prior art (codebase) | <findings, paths> |
| 2 | Prior art (people) | <internal blame + external maintainers> |
| 3 | Canonical reference | <project/RFC, URL> |
| 4 | OSS option | USE / EXTEND / CUSTOM — <rationale> |
| 5 | SOTA scan | <findings + improvements OR "baseline accepted"> |
| 6 | Scalability | <QPS target, failure modes at 10x, inflection> |
| 7 | Integration map | <upstream / downstream / shared infra> |
| 8 | FMEA | <top 3-5 failure modes + mitigations> |
| 9 | Security (STRIDE) | <S/T/R/I/D/E summaries> |
| 10 | Data lifecycle | <PII class, retention, residency> |
| 11 | Compliance | <applicable regs + N/A items> |
| 12 | Accessibility | <WCAG level + checklist> |
| 13 | i18n | <locale coverage + RTL + plural> |
| 14 | Test strategy | <unit / integration / e2e / contract / load / sec / a11y> |
| 15 | Observability | <metrics + logs + traces + alerts + SLO> |
| 16 | Cost | <delta forecast: today vs 10x users> |
| 17 | Rollback / DR | <RPO + RTO + procedure> |
| 18 | Deprecation lifecycle | <announce → soft → hard → remove> |
| 19 | UX writing | <tone + clarity + edge-case copy> |
| 20 | Documentation | <feature page + README + runbook + ADR> |
| 21 | Risk register | <top 5 risks + owner + mitigation> |
| 22 | Success criteria | <outcome metric + guardrails + window> |
| 23 | Post-launch watch | <duration + on-call + rollback predicate> |
| 24 | AI / ML ethics | <bias eval + disclosure + human-in-loop> OR N/A |
| 25 | Vendor / IP / license | <new vendors + license check + IP review> |
| 26 | Operational handoff | <runbook + on-call brief + bus-factor ≥ 2> |
| 27 | Action plan | <reference to plan file or inline TODO list> |
| 28 | Other | <team capacity, blackouts, sales/CS coordination> |
| 29 | Online sources consulted | <URL, read date, key finding — table form> |

---------------------------------------------------------------
CODEBASE EXPLORATION (MANDATORY)
---------------------------------------------------------------

REPOSITORIES SCANNED:
- [Repo 1]: [X files examined]
- [Repo 2]: [X files examined]

RELEVANT FILES IDENTIFIED:
| File | Purpose | Relevance |
| ---- | ------- | --------- |
| path/to/file1 | [What it does] | [Why it matters] |
| path/to/file2 | [What it does] | [Why it matters] |

EXISTING PATTERNS FOUND:
- [Pattern 1]: Used in [files], will follow this pattern
- [Pattern 2]: Used in [files], will follow this pattern

EXISTING IMPLEMENTATIONS TO REUSE:
- [Utility/Service 1]: [How to reuse]
- [Utility/Service 2]: [How to reuse]

POTENTIAL CONFLICTS IDENTIFIED:
- [File/Pattern that might conflict]

---------------------------------------------------------------
ONLINE RESEARCH (MANDATORY for any external integration)
---------------------------------------------------------------

Per `~/.claude/rules/common/official-docs-first.md`, before ANY
integration code is written against an external provider:

- The Architecture & Planning division MUST cite primary-source
  provider documentation URLs in this section.
- The Implementation & Build division MUST refuse to begin until
  those citations exist.
- For business / commercial vs personal-tier providers, BOTH must
  be researched and the in-scope tier explicitly documented.
- `docs/provider-research/<provider>.md` must exist (or be refreshed
  if older than 6 months) before any handler / lib file is touched.

DOCUMENTATION REVIEWED (primary sources only — no Stack Overflow,
no npm README, no blog posts):

| Source | Canonical URL | Key Findings |
| ------ | ------------- | ------------ |
| Provider docs | [provider's own domain] | [auth model, scopes, rate limits, deprecations] |
| RFC | [datatracker.ietf.org URL] | [protocol invariants, e.g. RFC 4791 for CalDAV] |
| W3C spec | [w3.org URL] | [browser-side contract, e.g. Push API] |

PROVIDER-RESEARCH NOTE WRITTEN: docs/provider-research/<provider>.md

TIER SCOPE (commercial vs personal):

- IN: [e.g. Google Workspace, Microsoft 365 Business]
- OUT: [e.g. personal Gmail, personal Outlook.com, iCloud consumer]
- How OUT is rejected at runtime: [e.g. `tid` claim check, email-domain blocklist]

API SPECIFICATIONS:

- Base URL: [URL]
- Authentication: [Method]
- Rate Limits: [Limits]
- Key Endpoints:
  | Endpoint | Method | Purpose |
  | -------- | ------ | ------- |
  | /api/v1/... | POST | [Purpose] |

CLOUD SERVICE DETAILS (if applicable):

- Service: [Name]
- Provider: [AWS/GCP/Azure]
- Pricing model: [On-demand, reserved, etc.]
- Limits/Quotas: [Key limits]
- Permissions needed: [List]

---------------------------------------------------------------
INTEGRATION REQUIREMENTS
---------------------------------------------------------------

SERVICE: [Name]

- Type: [Cloud Managed / Open Source Self-Hosted]
- Documentation: [URL]
- API Version: [Version]
- Authentication: [Type]
- Rate Limits: [Details]
- Error Codes: [Key error codes to handle]
===============================================================
```

## Phase 1: Council Discussion (All divisions speak with research context)

After research is complete, each division provides analysis.
Delegate to specialized subagents when deep expertise is
needed:

```text
===============================================================
                        THE COUNCIL DISCUSSION
===============================================================

TASK: [Restate the user's request clearly]

RESEARCH SUMMARY:
- Files examined: [X total across Y repos]
- External docs reviewed: [X sources]
- APIs analyzed: [List]
- Cloud services identified: [List]

---------------------------------------------------------------
DIVISION 1: ARCHITECTURE & PLANNING
[architect + planner]
---------------------------------------------------------------
**Codebase findings**:
- [Relevant existing architecture patterns]
- [Services that already exist and can be leveraged]

**System Impact**: [How this affects the overall architecture]
**Recommended Approach**: [High-level design]
**Cloud Services to Use**: [Which services and why]
**Implementation Plan**: [Phased delivery approach]
**Scalability Concerns**: [Any scaling considerations]
**Integration Points**: [What this connects to - with file references]
**Cost Considerations**: [Cloud cost implications]
**Risks Identified**: [Architectural + implementation risks]

---------------------------------------------------------------
DIVISION 2: IMPLEMENTATION & BUILD
[build-error-resolver, go-build-resolver, refactor-cleaner, database-reviewer]
---------------------------------------------------------------
**Codebase findings**:
- [Existing utilities to reuse]
- [Similar implementations to follow]
- [Build/compilation considerations]
- [Database schema implications]

**Files to Create/Modify**:
| File | Action | Reason |
| ---- | ------ | ------ |
| [path] | Create/Modify | [Why] |

**Existing Code to Reuse**:
| Existing | Reuse For |
| -------- | --------- |
| [path/file:function] | [Purpose] |

**Dependencies Needed**: [New packages]
**Database Changes**: [Migrations, schema, indexes]
**Build Impact**: [Compilation, module changes]
**Cleanup Opportunities**: [Dead code, unused deps to remove]
**Technical Challenges**: [Anticipated difficulties]

---------------------------------------------------------------
DIVISION 3: QUALITY & REVIEW
[code-reviewer, go-reviewer, python-reviewer, doc-updater]
[frontend-patterns skill auto-activates for UI work — covers component + visual design]
---------------------------------------------------------------
**Codebase findings**:
- [Existing quality standards]
- [Documentation patterns]
- [Test coverage expectations]
- [Language-specific conventions]

**Quality Requirements**: [Standards to meet]
**Consistency Check**: [How this matches existing code style]
**Design Quality** (if frontend work):
- Typography: [Distinctive font choices, not generic]
- Color/Theme: [Cohesive palette with CSS variables]
- Motion: [Purposeful animations]
- Layout: [Intentional spatial composition]
**Review Checkpoints**: [When to review]
**Documentation Needs**: [What to document]
**Process Requirements**: [Git workflow, PR process]

---------------------------------------------------------------
DIVISION 4: SECURITY
[security-reviewer, with support from language-specific reviewers]
---------------------------------------------------------------
**Codebase findings**:
- [Existing security patterns]
- [Auth/authz implementations to follow]
- [Input validation patterns]

**OWASP Assessment**: [Relevant OWASP Top 10 items]
**Threat Assessment**: [Security implications]
**Attack Vectors**: [Potential vulnerabilities]
**Data Sensitivity**: [What data is involved]
**Cloud Security**: [IAM, encryption, network controls]
**Security Controls Needed**: [Mitigations required]

---------------------------------------------------------------
DIVISION 5: TESTING & QA
[tdd-guide, e2e-runner]
---------------------------------------------------------------
**Codebase findings**:
- [Existing test patterns]
- [Current coverage levels]
- [Testing frameworks used]
- [CI/CD test pipeline configs]

**TDD Approach**: [Tests to write FIRST before implementation]
**Test Plan**:
| Test Type | Scope | Priority | Agent |
| --------- | ----- | -------- | ----- |
| Unit | [scope] | P0 | tdd-guide |
| Integration | [scope] | P0 | tdd-guide |
| E2E | [scope] | P1 | e2e-runner |

**Edge Cases**: [Boundary conditions, error scenarios, race conditions]
**Regression Risks**: [Existing functionality that might break]
**Coverage Target**: [Minimum coverage for this change]
**Staging Readiness**: [Deployment validation steps]

===============================================================
```

## Phase 2: Council Consensus

After all divisions speak, reach consensus:

```text
===============================================================
                        COUNCIL CONSENSUS
===============================================================

AGREED APPROACH:
[Summary of the approach all divisions agree on]

CLOUD SERVICES TO USE:
| Service | Purpose | Justification |
| ------- | ------- | ------------- |
| [Service] | [Purpose] | [Why this service] |

FILES TO BE TOUCHED:
| File | Action | Division |
| ---- | ------ | -------- |
| [path] | Create/Modify/Delete | Implementation |

AGENTS TO DELEGATE TO:
| Agent | Task | When |
| ----- | ---- | ---- |
| planner | Create detailed implementation plan | Before coding |
| tdd-guide | Write tests first | Before implementation |
| security-reviewer | Review security | After implementation |
| code-reviewer | Final review | Before PR |

RESEARCH CONFIRMS:
- [X] All relevant existing code examined
- [X] No duplicate implementations will be created
- [X] Follows existing project patterns
- [X] API documentation fully reviewed
- [X] Cloud/open source solutions selected appropriately

IMPLEMENTATION CHECKLIST:
1. [ ] [First step]
2. [ ] [Second step]
3. [ ] [Third step]

CONCERNS RAISED:
- [Architecture & Planning]: [Any concerns]
- [Implementation & Build]: [Any concerns]
- [Quality & Review]: [Any concerns]
- [Security]: [Any concerns]
- [Testing & QA]: [Any concerns]

GO/NO-GO DECISION:
[GO - Proceed with implementation] OR [NO-GO - Need clarification]

IF NO-GO, REASON:
[What additional research or clarification is needed]
===============================================================
```

## Phase 3: Implementation (Only after consensus)

Only proceed to write code after:

- All 5 divisions have provided their analysis
- Deep research has been completed
- All relevant files have been examined
- API documentation has been reviewed (if applicable)
- Cloud services have been identified and justified
- Testing & QA has approved the test-first plan
- Consensus has been reached across all divisions
- GO decision has been made
- Any NO-GO concerns have been resolved with the user

**Implementation Order**:

1. **tdd-guide** writes tests first (Red phase)
2. **Implementation** writes code to pass tests (Green phase)
3. **frontend-patterns** skill validates UI aesthetics + component patterns (if frontend work)
4. **refactor-cleaner** cleans up (Refactor phase)
5. **security-reviewer** scans for vulnerabilities
6. **code-reviewer** (or language-specific reviewer) does final review
7. **e2e-runner** validates critical user journeys
8. **doc-updater** updates documentation

## Research Requirements by Task Type

### Any New Feature

- [ ] Search entire codebase for similar implementations
- [ ] Identify all files that might be affected
- [ ] Find existing utilities/helpers to reuse
- [ ] Document existing patterns to follow

### Cloud Service Integration

- [ ] Read official cloud documentation
- [ ] Review SDK usage in codebase
- [ ] Check for existing cloud integrations
- [ ] Verify permissions/IAM needed
- [ ] Understand service limits and quotas
- [ ] Review pricing implications
- [ ] Check multi-region requirements

### Third-Party Integration

- [ ] Read official API documentation completely
- [ ] Review SDK/library source code
- [ ] Check for existing integrations in codebase
- [ ] Verify rate limits and quotas
- [ ] Understand error handling requirements
- [ ] Review webhook specifications
- [ ] Confirm authentication requirements

### Database Changes

- [ ] Review all existing migrations
- [ ] Check for related models/entities
- [ ] Identify dependent queries
- [ ] Review existing indexes
- [ ] Check foreign key relationships
- [ ] Delegate to `database-reviewer` for audit

### API Changes

- [ ] Review existing API patterns in codebase
- [ ] Check for versioning requirements
- [ ] Review error response patterns
- [ ] Check authentication middleware usage
- [ ] Review existing validation patterns

## Post-Implementation Review

After code is written, divisions reconvene. Delegate to specialized agents for deep review:

```text
===============================================================
                   POST-IMPLEMENTATION REVIEW
===============================================================

ARCHITECTURE & PLANNING REVIEW:
- [ ] Matches approved design
- [ ] No architectural drift
- [ ] Cloud services used correctly
- [ ] Follows existing patterns found in research
- Notes: [Any observations]

IMPLEMENTATION & BUILD REVIEW:
- [ ] Code compiles without errors or warnings
- [ ] Reused existing utilities as planned
- [ ] Database changes clean (migrations, indexes)
- [ ] No dead code introduced
- [ ] Dependencies minimal and vetted
- Notes: [Any observations]

QUALITY & REVIEW: (delegate to code-reviewer/go-reviewer/python-reviewer)
- [ ] Code quality standards met
- [ ] Language-specific conventions followed
- [ ] Frontend design quality verified (if UI work):
  - [ ] Typography distinctive (not generic Inter/Roboto/Arial)
  - [ ] Color palette cohesive with CSS variables
  - [ ] Animations purposeful and high-impact
  - [ ] Layout has intentional spatial composition
  - [ ] No generic AI aesthetics (purple gradients, cookie-cutter layouts)
- [ ] PR ready for merge
- [ ] Documentation updated (delegate to doc-updater)
- [ ] No blocking issues
- Notes: [Any observations]

SECURITY REVIEW: (delegate to security-reviewer)
- [ ] No new vulnerabilities introduced
- [ ] OWASP Top 10 checked
- [ ] No hardcoded secrets
- [ ] Auth/authz correct
- [ ] Input validation complete
- [ ] Follows existing security patterns
- Notes: [Any observations]

TESTING & QA REVIEW: (delegate to tdd-guide + e2e-runner)
- [ ] Tests written FIRST (TDD Red-Green-Refactor)
- [ ] Unit tests passing with coverage target met
- [ ] Integration tests cover new functionality
- [ ] E2E tests validate critical user journeys
- [ ] Edge cases tested
- [ ] Error scenarios handled
- [ ] Regression tests updated
- [ ] Staging deployment verified
- [ ] Performance acceptable
- Notes: [Any observations]

===============================================================
                    FINAL VERDICT
===============================================================
[APPROVED FOR MERGE] / [CHANGES REQUIRED] / [BLOCKED]

Remaining items:
- [Any remaining work]
===============================================================
```

## Cross-references

- `~/.claude/rules/common/council-default.md` — Floor: Council always convenes
- `~/.claude/rules/common/principal-level-mandate.md` — Floor: quality bar
- `~/.claude/rules/common/task-intake-due-diligence.md` — Floor: 29-question intake
- `~/.claude/rules/common/verify-before-claim.md` — Floor: verification block on every claim
- `~/.claude/rules/common/no-overclaim.md` — Floor: reserved completion language
- `~/.claude/rules/common/done-criteria.md` — Floor: service-migration done checklist
- `~/.claude/skills/council-rules/SKILL.md` — Division personas + Core Five + Extended Eleven detail + Conversation Rules

## Why this skill exists

The Council Protocol's Phase 0/1/2/3 templates + Research
Requirements + Post-Implementation Review are reference
material — they describe HOW to run the Council on a non-
trivial task. The Floor rule `council-default.md` keeps the
Council always-convening; the templates here lazy-load when
the work surface (plan / ADR / agent / runbook file) tells us
the templates will actually be used. For everyday coding work,
the assistant works the Council pattern from memory using the
Floor rules; the full templates load when constructing a
durable record (a plan file, an ADR, a runbook entry).

Migration provenance: lines 338-921 + lines 1416-1680 of
`~/.claude/CLAUDE.md` (pre-rebuild) moved into this skill +
the sister `council-rules` skill on 2026-06-02 as part of
the lazy-rules-loading plan.
