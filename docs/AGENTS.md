# Agents Catalog

> Index of every agent shipped with The Claude Council. Agents are
> delegatable specialists — the Council protocol delegates to them
> when their expertise is needed. Total: 32 agents organised across
> the 16 Council Divisions. Pair with [COUNCIL.md](COUNCIL.md) for
> division detail.

## Each agent follows the principal-level template

Per
[`principal-level-mandate.md`](../rules/common/principal-level-mandate.md),
every agent file carries:

- **Frontmatter**: `name`, `description`, `tools`, `model`
- **Identity + mission** — principal-level statement
- **Global rules enforced** — explicit cross-references
- **Auto-fire triggers** — file globs / keywords / scope conditions
- **Decision authority** — veto / casting vote / advisory + rationale
- **Review checklist or workflow** — explicit checks with severity
- **Standards cited** — version + section numbers
- **Output shape** — structured findings, not narrative
- **Anti-patterns to reject** — concrete patterns with named alternatives
- **Pairing model** — which other agents this works with
- **When to escalate to user** — explicit triggers

## Model selection

Per [`performance.md`](../rules/common/performance.md):

- **opus** — coding / reviewing / planning / security / compliance /
  ethics work where quality and broad coverage matter
- **sonnet** — narrow-scope reviewers, verification-loop agents
- **haiku** — mechanical doc work (codemaps, README maintenance)

## Agents by Council Division

### Division 1: Architecture & Planning

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`architect`](../agents/architect.md) | opus | System design; scalability analysis; technical trade-offs; ADRs |
| [`planner`](../agents/planner.md) | opus | Implementation plans; phased delivery; dependency analysis; risk assessment |

### Division 2: Implementation & Build

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`build-error-resolver`](../agents/build-error-resolver.md) | opus | Fix TypeScript/JavaScript build failures; type errors; module resolution |
| [`go-build-resolver`](../agents/go-build-resolver.md) | opus | Fix Go compilation errors; vet warnings; golangci-lint issues; module deps |
| [`refactor-cleaner`](../agents/refactor-cleaner.md) | opus | Dead code removal; unused exports; duplicate detection; dependency cleanup |
| [`database-reviewer`](../agents/database-reviewer.md) | opus | PostgreSQL query audit; schema design; RLS; indexing; connection pooling |
| [`infra-reviewer`](../agents/infra-reviewer.md) | sonnet | Dockerfile; Terraform; CI/CD review |

### Division 3: Quality & Review

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`code-reviewer`](../agents/code-reviewer.md) | opus | Cross-language code review; severity-based findings (BLOCKER → SUGGESTION) |
| [`go-reviewer`](../agents/go-reviewer.md) | opus | Go-specific review: idioms; error handling; goroutine safety; race detection |
| [`python-reviewer`](../agents/python-reviewer.md) | opus | Python-specific review: PEP 8; type hints; framework patterns; security |
| [`java-reviewer`](../agents/java-reviewer.md) | sonnet | Java / Spring code review |
| [`mobile-reviewer`](../agents/mobile-reviewer.md) | sonnet | Swift + Dart/Flutter review |
| [`doc-updater`](../agents/doc-updater.md) | haiku | Documentation generation; codemaps; README maintenance |

### Division 4: Security

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`security-reviewer`](../agents/security-reviewer.md) | opus | OWASP Top 10; secrets detection; input validation; auth/authz; dependency CVEs — **VETO on BLOCKER** |

### Division 5: Testing & QA

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`tdd-guide`](../agents/tdd-guide.md) | opus | Test-first methodology; Red-Green-Refactor; 90% touched / 80% project coverage |
| [`e2e-runner`](../agents/e2e-runner.md) | opus | End-to-end tests; Playwright; critical user journeys; flaky test management |
| [`performance-reviewer`](../agents/performance-reviewer.md) | sonnet | Profiling; load testing; performance budgets |

### Division 6: Compliance & Legal

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`compliance-reviewer`](../agents/compliance-reviewer.md) | opus | GDPR; CCPA; HIPAA; PCI-DSS; SOC 2; ISO 27001 — **VETO on regulatory finding** |
| [`payments-reviewer`](../agents/payments-reviewer.md) | opus | Payments / escrow / open-banking / PCI-DSS / PSD2 / MTL / AML — VETO within payments scope |
| [`health-reviewer`](../agents/health-reviewer.md) | opus | HIPAA / 42 CFR Part 2 / FDA SaMD / FHIR / clinical-data / state telehealth — VETO within health scope |
| [`education-reviewer`](../agents/education-reviewer.md) | opus | FERPA / COPPA / state student-privacy / LTI / SCORM / xAPI / proctoring / edtech — VETO within edtech scope |

### Division 7: Product, UX & Customer Experience

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`ux-reviewer`](../agents/ux-reviewer.md) | sonnet | Information architecture; usability; copy |
| [`accessibility-reviewer`](../agents/accessibility-reviewer.md) | opus | WCAG 2.2 + ARIA audit |

### Division 8: Operations & Reliability

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`ops-reviewer`](../agents/ops-reviewer.md) | sonnet | Runbooks; SLO/SLA/SLI; on-call; deploy posture; monitoring |

### Division 9: Data & Analytics

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`data-reviewer`](../agents/data-reviewer.md) | sonnet | Schema governance; event taxonomy; PII flows; analytics pipelines |

### Division 10: Finance & FinOps

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`finance-reviewer`](../agents/finance-reviewer.md) | sonnet | Cloud cost; unit economics; pricing impact; ROI |

### Division 11: Risk Management

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`risk-reviewer`](../agents/risk-reviewer.md) | sonnet | BCP/DR; scenario planning; blast-radius; change risk — **VETO on out-of-scope blast** |

### Division 12: Strategy & Innovation

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`strategy-reviewer`](../agents/strategy-reviewer.md) | sonnet | Market positioning; build-vs-buy; deprecation; vendor selection |

### Division 13: People & Culture

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`people-reviewer`](../agents/people-reviewer.md) | sonnet | Knowledge mgmt; hiring criteria; dev experience |

### Division 14: Sustainability & ESG

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`esg-reviewer`](../agents/esg-reviewer.md) | sonnet | Carbon footprint; region carbon intensity; ESG reporting |

### Division 15: Ethics & Responsible AI

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`ai-ethics-reviewer`](../agents/ai-ethics-reviewer.md) | opus | AI safety; fairness; bias; dataset provenance — **VETO on AI safety / fairness / bias** |

### Division 16: Communications & Documentation

| Agent | Model | Role |
| ----- | ----- | ---- |
| [`comms-reviewer`](../agents/comms-reviewer.md) | sonnet | Public-facing artifact review; crisis comms; brand consistency |

## Agent delegation guide

Use this reference to know when to delegate work to specialised
subagents:

| Situation | Delegate to | Why |
| --------- | ----------- | --- |
| Planning a complex feature | `planner` | Creates phased implementation plans with exact file paths |
| Designing system architecture | `architect` | Evaluates trade-offs; creates ADRs |
| TypeScript/JS build errors | `build-error-resolver` | Surgical fixes; no refactoring |
| Go build/vet/lint errors | `go-build-resolver` | Go-specific compilation fixes |
| Dead code / unused deps | `refactor-cleaner` | Safe batch removal with tests |
| Database schema review | `database-reviewer` | PostgreSQL queries; RLS; indexing |
| Code review (any language) | `code-reviewer` | Severity-based review: BLOCKER → SUGGESTION |
| Go code review | `go-reviewer` | Idioms; goroutine safety; race detection |
| Python code review | `python-reviewer` | PEP 8; type hints; framework patterns |
| Java / Spring review | `java-reviewer` | Effective Java; Spring patterns |
| Mobile (Swift / Dart / Flutter) review | `mobile-reviewer` | iOS / Android / Flutter idioms |
| Documentation updates | `doc-updater` | Codemaps; READMEs; guides |
| Security audit | `security-reviewer` | OWASP Top 10; secrets; auth bypass |
| TDD test-first | `tdd-guide` | Red-Green-Refactor; coverage gate |
| E2E test creation / runs | `e2e-runner` | Playwright; critical user journeys |
| Performance profiling | `performance-reviewer` | Load testing; perf budgets |
| Infra (Docker / Terraform) review | `infra-reviewer` | IaC; CI/CD; container security |
| GDPR / HIPAA / PCI / SOC 2 review | `compliance-reviewer` | Regulatory veto |
| Payments / escrow / open-banking review | `payments-reviewer` | PCI / PSD2 / MTL / AML veto |
| Healthcare / clinical review | `health-reviewer` | HIPAA / 42 CFR / FDA SaMD veto |
| Education / student-data review | `education-reviewer` | FERPA / COPPA / NY §2-d / WCAG 2.2 AA veto |
| UX / copy / IA review | `ux-reviewer` | Usability; microcopy |
| Accessibility (WCAG / ARIA) audit | `accessibility-reviewer` | WCAG 2.2 AA + AAA; ARIA 1.2 |
| Ops / SLO / runbook review | `ops-reviewer` | Reliability; on-call posture |
| Data / schema / events review | `data-reviewer` | Schema governance; PII flows |
| Cloud cost / pricing review | `finance-reviewer` | FinOps; unit economics |
| Blast-radius / BCP review | `risk-reviewer` | Veto on out-of-scope changes |
| Vendor / market / deprecation review | `strategy-reviewer` | Build-vs-buy; competitive |
| Org / hiring / DX review | `people-reviewer` | Knowledge mgmt; bus factor |
| Carbon / ESG review | `esg-reviewer` | Sustainability reporting |
| AI / ML / model review | `ai-ethics-reviewer` | Bias; fairness; safety veto |
| Public-facing artifact review | `comms-reviewer` | Brand consistency; crisis comms |

## Auto-delegation via auto-skills.md

The
[`auto-skills.md`](../rules/common/auto-skills.md) rule maps file
types to both skills AND agents. When you touch a file, the
matching agents auto-engage silently — no slash command, no
explicit delegation needed.

For example, touching a `*.go` file auto-engages `go-reviewer`,
`go-build-resolver`, `tdd-guide`, `security-reviewer`. Touching a
`payments/charge.ts` file auto-engages `payments-reviewer`,
`compliance-reviewer`, `security-reviewer`, `finance-reviewer`,
`risk-reviewer`, `code-reviewer`.

## Parallel agent execution

Per the user's standing directive: agents run at most 2 in
parallel. Heavier fan-out is sequential to keep output legible and
keep the user's review surface tractable.

When agents are dispatched in parallel, send them in a single
message with multiple tool calls. When agents depend on each
other's output (e.g., `code-reviewer` reviews the result of
`build-error-resolver`'s fix), they run sequentially.

## See also

- [COUNCIL.md](COUNCIL.md) — the 16-division reference
- [RULES.md](RULES.md) — the rules catalog
- [SKILLS.md](SKILLS.md) — the skills catalog
- [ARCHITECTURE.md](ARCHITECTURE.md) — how agents compose with
  rules + skills
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to add an agent
- [`../rules/common/auto-skills.md`](../rules/common/auto-skills.md)
  — file-to-skill-and-agent mapping
- [`../rules/common/principal-level-mandate.md`](../rules/common/principal-level-mandate.md)
  — depth bar every agent meets
- [`../rules/common/performance.md`](../rules/common/performance.md)
  — model selection policy
