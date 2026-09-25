# council-rules: The Extended Eleven Divisions

> Extended Eleven division summaries, leads, auto-fire signals and veto authority (Divisions 6-16).
> Pointed at by the SKILL.md routing row "Extended Eleven — leads + veto authority".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## The Extended Eleven Divisions

The Core Five always speak. The Extended Eleven auto-fire on
file-pattern / keyword / change-scope triggers per
`~/.claude/rules/common/council-triggers.md`. Engagement is
mechanical, not judgmental — if a trigger matches, the
Division engages.

### Division 6: Compliance & Legal

**Lead**: `compliance-reviewer` (opus)

**Auto-fires on**: PII / GDPR / CCPA / HIPAA / PCI-DSS / SOC 2
/ payments / billing / licensing / IP / contracts / KYC / AML
/ regulatory documents.

**Veto authority**: Yes — on any unresolved regulatory
finding (GDPR, CCPA, HIPAA, PCI, SOC2, etc.).

### Division 7: Product, UX & Customer Experience

**Leads**: `ux-reviewer` (sonnet), `accessibility-reviewer`
(opus)

**Auto-fires on**: UI files (`.vue` / `.tsx` / `.jsx` /
`.swift` / `.dart`), views/components/pages/screens dirs,
copy / strings / microcopy / i18n / locale files, email
templates, push / SMS notifications, accessibility / a11y /
WCAG / ARIA work, forms, error UX.

**Veto authority**: No — but BLOCKER-severity findings (WCAG
violation, error UX that violates user rights) escalate to
Compliance.

### Division 8: Operations & Reliability

**Lead**: `ops-reviewer` (sonnet)

**Auto-fires on**: Runbooks, SLO/SLA/SLI files, on-call /
PagerDuty / Opsgenie config, observability dashboards,
CI/CD workflows, IaC (Terraform / CDK / Helm), Dockerfile /
compose, deploy / release configs, incident comms,
monitoring / alerting rules.

**Veto authority**: No (invokes Risk for prod-posture-
affecting changes).

### Division 9: Data & Analytics

**Lead**: `data-reviewer` (sonnet)

**Auto-fires on**: Schema migrations, DB models, event
tracking, analytics pipelines, ETL / ELT / dbt models,
data warehouse work, PII flow surfaces, schema registry
entries.

**Veto authority**: No (invokes Compliance when PII is
touched).

### Division 10: Finance & FinOps

**Lead**: `finance-reviewer` (sonnet)

**Auto-fires on**: Pricing / plan-tier / billing changes,
cloud-cost-sensitive resources (Lambda, RDS, S3, CloudFront,
DynamoDB), instance sizing / replica count / autoscaling
bounds, data transfer pattern changes, unit-economics models.

**Veto authority**: No (invokes Strategy for material
economic impact).

### Division 11: Risk Management

**Lead**: `risk-reviewer` (sonnet)

**Auto-fires on**: Destructive operations (DROP TABLE, DELETE
FROM, file unlink, `rm -rf`), backup / restore / DR config,
multi-region / SPOF changes, blast-radius-extending changes,
deploys touching > 10% of services.

**Veto authority**: Yes — on changes whose blast radius
exceeds the defined scope.

### Division 12: Strategy & Innovation

**Lead**: `strategy-reviewer` (sonnet)

**Auto-fires on**: New features / surfaces / markets, ADRs /
RFCs, roadmap / vision / strategy docs, deprecation / sunset
/ EOL work, vendor selection, build-vs-buy decisions,
experiments / A/B tests / MVPs / spikes.

**Veto authority**: No (advisory).

### Division 13: People & Culture

**Lead**: `people-reviewer` (sonnet)

**Auto-fires on**: CONTRIBUTING / CODE_OF_CONDUCT / CODEOWNERS
changes, onboarding / hiring / career docs, team-structure /
org-chart docs, dev-experience tooling, bus-factor-affecting
changes.

**Veto authority**: No (advisory).

### Division 14: Sustainability & ESG

**Lead**: `esg-reviewer` (sonnet)

**Auto-fires on**: ESG / sustainability / carbon-footprint
docs, cloud-region selection (carbon intensity varies),
always-on workload introduction, supplier ethics + ISO
14001 / ISO 9001:2026 work.

**Veto authority**: No (advisory).

### Division 15: Ethics & Responsible AI

**Lead**: `ai-ethics-reviewer` (opus)

**Auto-fires on**: ML / AI / LLM / model / inference /
training files, prompts / embeddings / RAG / fine-tune work,
openai/anthropic/bedrock/vertex SDK use, recommendation /
personalization / ranking / scoring features, automated-
decision systems (GDPR Article 22), model cards / datasheets.

**Veto authority**: Yes — on AI safety / fairness / bias
findings.

### Division 16: Communications & Documentation

**Leads**: `doc-updater` (haiku), `comms-reviewer` (sonnet)

**Auto-fires on**: Any public-facing artifact, README /
CHANGELOG / RELEASE_NOTES, API docs (OpenAPI / GraphQL SDL /
Proto), blog / marketing / press files, status-page +
incident-comms templates.

**Veto authority**: No — but BLOCKER on misleading / non-
compliant comms (escalates to Compliance + Strategy).
