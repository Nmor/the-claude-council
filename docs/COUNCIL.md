# The Council — 16-Division Reference

> Detailed reference for every division: lead agents, when each
> auto-fires, decision authority, output shape. Pair with
> [ARCHITECTURE.md](ARCHITECTURE.md) for the overall model and
> [AGENTS.md](AGENTS.md) for individual agent specs.

## Operating principle

**The Council is the default mode for every interaction.** Per
[`council-default.md`](../rules/common/council-default.md), no
bypass surface exists:

- The `*` prefix skips ONLY the prompt-improver clarification step.
  Council still convenes.
- "Quick Council Check" mode is replaced with "Abbreviated Council
  Check" — every division still engages and owns its domain; the
  risk-owning divisions go deep and no-concern divisions collapse to
  a one-line gated verdict. Never zero divisions.
- Bypass attempts are audit-logged to
  `~/.claude/audits/bypass-log.jsonl`.

Trigger model:

- **Core Five always engage — coverage is mandatory, depth is
  signal-gated.** Every division owns its domain and records a
  verdict; no domain is ever skipped. Output scales to what it found:
  a material finding or a cross-division conflict → deep analysis;
  nothing material → a one-line verdict with the one-clause reason it
  checked (never a bare "looks fine"). Deep analysis concentrates on
  the 2-3 divisions that own the change's risk surface. Per
  [`council-default.md`](../rules/common/council-default.md) rule 1.
- **Shared context in, structured findings out.** The target surface
  is read once and divisions reason over it in parallel (not N
  independent re-reads); findings are emitted as
  `severity · file:line · claim · owner` and deduped across divisions
  before synthesis.
- **Extended Eleven auto-fire on signals.** Per
  [`council-triggers.md`](../rules/common/council-triggers.md) —
  file patterns + keywords + change scope + plan-tier impact.
- **Any Division can request convening of any other** mid-discussion
  when scope crosses their domain.

## The Core Five — always speak

### Division 1: Architecture & Planning

| Lead agents | `architect` (opus), `planner` (opus) |
| ----------- | ------------------------------------ |
| **When** | Every task — sets strategic direction first |
| **Veto** | Casting vote on technical ties (Tiebreaker Matrix) |
| **Deliverables** | ADRs, architecture diagrams, phased implementation plans, trade-off analyses |
| **Principles** | Modularity, scalability, maintainability, security, performance |

Speaks first. Surfaces the system impact, recommended approach,
cloud-service selection, implementation plan, scalability concerns,
integration points, cost considerations, and risks.

### Division 2: Implementation & Build

| Lead agents | per-stack build resolvers (`build-error-resolver` TS/JS · `go-build-resolver` · `python-` / `rust-` / `java-` / `dotnet-` / `ruby-` / `php-` / `swift-build-resolver`), `refactor-cleaner`, `database-reviewer` |
| ----------- | ------------------------------------------------------------------------------------ |
| **When** | Every task that writes / modifies code |
| **Veto** | None (escalates to Architecture on cross-cutting build concerns) |
| **Deliverables** | Production-ready code, database migrations, build fixes, dependency management |
| **Principles** | SOLID, DRY, KISS, YAGNI, clean code |

Speaks second. Proposes the implementation, identifies build
concerns, names files to create/modify with reasons, names existing
code to reuse, lists new dependencies, captures database changes.

### Division 3: Quality & Review

| Lead agents | `code-reviewer`, `go-reviewer`, `python-reviewer`, `doc-updater` |
| ----------- | ---------------------------------------------------------------- |
| **When** | Every task that writes / modifies code OR docs |
| **Veto** | None (BLOCKER-severity findings must be fixed before merge) |
| **Deliverables** | Code review verdicts, PR reports, documentation updates, quality metrics |
| **Principles** | Constructive feedback, specific findings, educational review |

Speaks third. Defines quality requirements, consistency checks,
design quality (for frontend work — typography / colour / motion /
layout), review checkpoints, documentation needs, process
requirements.

### Division 4: Security

| Lead agent | `security-reviewer` (opus) |
| ----------- | -------------------------- |
| **When** | Every task — security is cross-cutting |
| **Veto** | **VETO on unresolved technical-exploit BLOCKER** |
| **Deliverables** | Vulnerability findings with CVSS scores, threat models, remediation code |
| **Principles** | Defence in depth, least privilege, fail securely, trust no input |

Speaks fourth. Runs the OWASP Top 10 + ASVS + STRIDE pass, names
attack vectors, classifies data sensitivity, prescribes cloud
security controls, names the security controls needed.

### Division 5: Testing & QA

| Lead agents | `tdd-guide`, `e2e-runner` |
| ----------- | ------------------------- |
| **When** | Every task that writes / modifies code |
| **Veto** | None (insufficient coverage blocks merge per `extreme-lint-policy.md`) |
| **Deliverables** | Test suites, coverage reports, staging validation, release sign-off |
| **Principles** | Test-first (TDD), comprehensive edge cases, staging readiness |

Speaks last. Defines the TDD approach (tests written FIRST), the
test plan (unit / integration / E2E / contract / load / security /
a11y), edge cases, regression risks, coverage target (≥90% touched
/ ≥80% project per `extreme-lint-policy.md`), staging readiness.

## The Extended Eleven — auto-fire on triggers

Each Extended Division auto-fires when its trigger ruleset matches.
Triggers are mechanical — file pattern, keyword, change scope.
Details: [`council-triggers.md`](../rules/common/council-triggers.md).

### Division 6: Compliance & Legal

| Lead | `compliance-reviewer` (opus) |
| ---- | ---------------------------- |
| **Domain sub-leads** | `payments-reviewer` (opus), `health-reviewer` (opus), `education-reviewer` (opus) |
| **Auto-fires on** | PII / GDPR / CCPA / HIPAA / PCI-DSS / SOC 2 / payments / billing / licensing / IP / contracts / KYC / AML / regulatory work |
| **Veto** | **VETO on any unresolved regulatory finding** |

Sub-leads engage alongside `compliance-reviewer` on triggered
sub-domain work and share the Division 6 veto within their scope:

- **payments-reviewer** — PCI-DSS BLOCKER, PSD2 bypass, webhook
  signature absence, idempotency missing on state-mutating
  endpoint, MTL absence on custodial flow, sanctions screening
  bypass, reconciliation gap
- **health-reviewer** — HIPAA Privacy / Security BLOCKER, 42 CFR
  Part 2 violation, clinical-safety BLOCKER, FDA SaMD
  classification breach, breach-clock miss, BAA absence
- **education-reviewer** — COPPA / FERPA / NY §2-d / 2025 COPPA
  Final Rule BLOCKER, WCAG 2.2 AA on assessment paths,
  Section 504 / IDEA accommodation bypass, proctoring without
  bias audit, AI grader without human review, LTI 1.1 in new
  code, DPA absence when school-as-agent claimed

### Division 7: Product, UX & Customer Experience

| Lead | `ux-reviewer` (sonnet), `accessibility-reviewer` (opus) |
| ---- | ------------------------------------------------------- |
| **Auto-fires on** | UI files (`.vue` / `.tsx` / `.jsx` / `.swift` / `.dart`), views / components / pages dirs, copy + i18n + locale files, email templates, push / SMS notifications, accessibility / WCAG / ARIA work, forms, error UX |
| **Veto** | None — BLOCKER-severity findings (WCAG violation, error UX that violates user rights) escalate to Compliance |

### Division 8: Operations & Reliability

| Lead | `ops-reviewer` (sonnet) |
| ---- | ----------------------- |
| **Auto-fires on** | Runbooks, SLO/SLA/SLI files, on-call config, observability dashboards, CI/CD workflows, IaC (Terraform / CDK / Helm), Dockerfile / compose, deploy / release configs, incident comms, monitoring rules |
| **Veto** | None (invokes Risk for prod-posture-affecting changes) |

### Division 9: Data & Analytics

| Lead | `data-reviewer` (sonnet) |
| ---- | ------------------------ |
| **Auto-fires on** | Schema migrations, DB models, event tracking, analytics pipelines, ETL/ELT/dbt models, data warehouse work, PII flow surfaces, schema registry entries |
| **Veto** | None (invokes Compliance when PII is touched) |

### Division 10: Finance & FinOps

| Lead | `finance-reviewer` (sonnet) |
| ---- | --------------------------- |
| **Auto-fires on** | Pricing / plan-tier / billing changes, cloud-cost-sensitive resources (Lambda, RDS, S3, CloudFront, DynamoDB), instance sizing / replica count / autoscaling bounds, data transfer pattern changes, unit-economics models |
| **Veto** | None (invokes Strategy for material economic impact) |

### Division 11: Risk Management

| Lead | `risk-reviewer` (sonnet) |
| ---- | ------------------------ |
| **Auto-fires on** | Destructive operations (DROP TABLE, DELETE FROM, file unlink, `rm -rf`), backup / restore / DR config, multi-region / SPOF changes, blast-radius-extending changes, deploys touching > 10% of services |
| **Veto** | **VETO on changes whose blast radius exceeds defined scope** |

### Division 12: Strategy & Innovation

| Lead | `strategy-reviewer` (sonnet) |
| ---- | ---------------------------- |
| **Auto-fires on** | New features / surfaces / markets, ADRs / RFCs, roadmap / vision / strategy docs, deprecation / sunset / EOL work, vendor selection, build-vs-buy decisions, experiments / A/B tests / MVPs / spikes |
| **Veto** | None (advisory) |

### Division 13: People & Culture

| Lead | `people-reviewer` (sonnet) |
| ---- | -------------------------- |
| **Auto-fires on** | CONTRIBUTING / CODE_OF_CONDUCT / CODEOWNERS changes, onboarding / hiring / career docs, team-structure / org-chart docs, dev-experience tooling, bus-factor-affecting changes |
| **Veto** | None (advisory) |

### Division 14: Sustainability & ESG

| Lead | `esg-reviewer` (sonnet) |
| ---- | ----------------------- |
| **Auto-fires on** | ESG / sustainability / carbon-footprint docs, cloud-region selection (carbon intensity varies), always-on workload introduction, supplier ethics + ISO 14001 / ISO 9001:2026 work |
| **Veto** | None (advisory) |

### Division 15: Ethics & Responsible AI

| Lead | `ai-ethics-reviewer` (opus) |
| ---- | --------------------------- |
| **Auto-fires on** | ML / AI / LLM / model / inference / training files, prompts / embeddings / RAG / fine-tune work, openai/anthropic/bedrock/vertex SDK use, recommendation / personalization / ranking / scoring features, automated-decision systems (GDPR Article 22), model cards / datasheets |
| **Veto** | **VETO on AI safety / fairness / bias findings** |

### Division 16: Communications & Documentation

| Lead | `doc-updater` (haiku), `comms-reviewer` (sonnet) |
| ---- | ------------------------------------------------ |
| **Auto-fires on** | Any public-facing artifact, README / CHANGELOG / RELEASE_NOTES, API docs (OpenAPI / GraphQL SDL / Proto), blog / marketing / press files, status-page + incident-comms templates |
| **Veto** | None — BLOCKER on misleading or non-compliant comms (escalates to Compliance + Strategy) |

## Tiebreaker Matrix

When divisions disagree, named tiebreakers apply:

| Disagreement type | Decided by |
| ----------------- | ---------- |
| Technical (architecture vs implementation) | **Division 1 (Architecture)** — casting vote |
| Security BLOCKER | **Division 4 (Security)** — VETO |
| Regulatory BLOCKER (GDPR / CCPA / HIPAA / PCI / SOC2) | **Division 6 (Compliance)** — VETO |
| AI safety / fairness / bias | **Division 15 (Ethics)** — VETO |
| Blast radius exceeds defined scope | **Division 11 (Risk)** — VETO |
| Unresolved consensus | Escalate to user with named options |

Vetoes are explicit; they are documented in the Council consensus
block.

## Model selection — capability-aware ladders

Per [`model-tier-selection.md`](../rules/common/model-tier-selection.md),
the Council does not hardcode a model per agent — it resolves each
agent's ROLE to a ladder of models (best-for-the-job → broadly-
available floor) and spawns the highest-ranked model AVAILABLE in
this install (declared in `~/.claude/.local/model-availability`;
default `{opus, sonnet, haiku}` when the file is absent).

| Role class | Ladder (best → floor) | Notes |
| ---------- | --------------------- | ----- |
| Strategic / long-horizon / hardest non-security work | `fable → opus → sonnet` | Fable only here — where first-shot correctness offsets its ~2× cost |
| Security & regulated review | `opus → sonnet` | **Fable excluded** — its safety classifiers refuse security work |
| Deep + standard review | `opus → sonnet` | Deep reviewers stay on Opus |
| Mechanical build / refactor | `sonnet → haiku` | Deterministic fixes — Sonnet ceiling, never over-provisioned |
| Search / doc / codemap | `haiku → sonnet` | Cheapest model that does the job |

Capability order: **fable ≥ mythos > opus > sonnet > haiku** (source:
Anthropic Models Overview, read 2026-07-24). A Max install fields
Fable on the hardest work; a Pro / Team / ZDR install automatically
fields the next-best model for that same job. Resolution degrades
gracefully and AUDIBLY — a runtime-unavailable model (or a Fable
refusal without fallback) drops to the next ladder rung and is
surfaced, never silently downgraded, and never a hard failure while a
floor model is available.

## The Council Conversation Protocol

Detailed in [`CLAUDE.md`](../CLAUDE.md) — short form here:

### Phase 0: Deep Research

Mandatory before any discussion. Runs the trigger-gated
[task-intake-due-diligence](../rules/common/task-intake-due-diligence.md)
intake — an always-fire high-signal core (prior art, provenance,
better?, scalable?, integration map, FMEA, STRIDE, test strategy,
docs, action plan, online research) plus the domain questions whose
triggers match (compliance, a11y, i18n, data lifecycle, cost,
rollback, deprecation, AI / ML ethics, vendor / IP / license, …).
Online research is MANDATORY across collection, planning, AND
implementation — per
[`council-default.md`](../rules/common/council-default.md) rule 11
and [`official-docs-first.md`](../rules/common/official-docs-first.md):
current primary sources (provider docs / RFC / standard), cited with
read-dates, never training-cutoff recall alone.

### Phase 1: Council Discussion

The Core Five speak in order: Architecture → Implementation →
Quality → Security → Testing. Extended Divisions interject when
their triggers fire.

### Phase 2: Council Consensus

Agreed approach, cloud services to use, files to be touched, agents
to delegate to, implementation checklist, concerns raised, GO/NO-GO
decision.

### Phase 3: Implementation

Only after consensus. Implementation order: tdd-guide writes tests
first → implementation writes code → refactor-cleaner cleans up →
security-reviewer scans → code-reviewer reviews → e2e-runner
validates → doc-updater documents.

### Post-Implementation Review

Divisions reconvene. Final verdict: APPROVED / CHANGES REQUIRED /
BLOCKED.

## Task classification

### Abbreviated Council Check (NEVER zero divisions)

For trivial work (single-file bug fix, typo, config tweak), the
Council still convenes — every division engages and owns its domain,
but output is signal-gated: no-concern divisions give a one-line
verdict with a one-clause reason, and only a division with a material
finding goes deep. Extended Eleven auto-fire only when their trigger
ruleset hits.

### Standard tasks (full Council protocol)

New features, API changes, database changes, internal refactors.
Full Phase 0-1-2-3 protocol.

### Critical tasks (Extended Council + user approval)

Cloud service integrations, third-party integrations (MUST review
all API docs), authentication/authorization changes,
payment/financial features, data migrations, infrastructure
changes, security-sensitive features.

Require:

1. Complete API/cloud documentation review.
2. Full Council discussion across all divisions.
3. Written implementation plan (delegate to `planner`).
4. User approval before proceeding.
5. Security sign-off (delegate to `security-reviewer`).

## Council output expectations

Every Council-mediated task ends with a verification block:

```text
Council (this turn):
  - Division 1 (Architecture): <deep — owns this change>
  - Division 2 (Implementation): <position>
  - Division 3 (Quality): <one-line gated verdict — no concern>
  - Division 4 (Security): <deep — owns this change>
  - Division 5 (Testing): <one-line gated verdict — no concern>
  Extended fired: 6 (Compliance — GDPR consent UI), 7 (UX — copy review)
  Research (this turn): <source · URL · read-date · key finding>
  Model selection: <role> → <model> (ladder: <ladder>)
  Consensus: GO
  Tiebreaker invoked: N/A
  Bypass attempts: 0
```

At every phase boundary the task also closes with the five-step
retrospective sweep per
[`post-phase-retrospective-review.md`](../rules/common/post-phase-retrospective-review.md)
— forward verify → retrospective re-verify prior phases → wiring
closure → multi-division adversarial audit → capture follow-ups.

A task that lacks this block is a task that did not pass through
Council. That is a rule violation per
[`council-default.md`](../rules/common/council-default.md).

## See also

- [`CLAUDE.md`](../CLAUDE.md) — the Council orchestrator (full
  Phase 0-1-2-3 protocol)
- [`council-default.md`](../rules/common/council-default.md) —
  always-on rule
- [`council-triggers.md`](../rules/common/council-triggers.md) —
  per-division engagement signals
- [`task-intake-due-diligence.md`](../rules/common/task-intake-due-diligence.md)
  — Phase 0 intake
- [`principal-level-mandate.md`](../rules/common/principal-level-mandate.md)
  — depth bar every agent meets
- [`model-tier-selection.md`](../rules/common/model-tier-selection.md)
  — capability-aware model ladders per Council role
- [`post-phase-retrospective-review.md`](../rules/common/post-phase-retrospective-review.md)
  — the five-step sweep at every phase boundary
- [AGENTS.md](AGENTS.md) — the agent catalog
