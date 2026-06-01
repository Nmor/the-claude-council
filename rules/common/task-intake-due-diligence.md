# Task Intake — Due Diligence (Always-On, Global)

> Auto-fires on every file. Sister to `reuse-first.md`,
> `official-docs-first.md`, `patterns.md`,
> `proper-fixes-first.md`. Companion to the Council Protocol's
> Phase 0 (Deep Research) — this rule defines the FIRST sub-step
> of Phase 0 every task must complete.

## Core Principle

**Every task or plan begins with a structured prior-art /
due-diligence intake — a fixed set of questions answered BEFORE
any implementation discussion starts. Skipping the intake is a
violation of the same severity as skipping `official-docs-first`
or `reuse-first` — it leads to reinventing wheels, missing better
approaches, and shipping solutions that don't scale.**

The user-named directive (verbatim): *"every task or plan must
start with a has it been done before? who did it? who built it?
can it be done better? is it scalable? what to do and all other
things in that plan or request and you are always free to look
online."*

## The intake questionnaire

Every task / plan / Council convening answers ALL of the following
in writing (in the plan file's Context, or in Council Phase 0,
or in the assistant's first response on a free-standing task):

### 1. Has it been done before?

- Within THIS codebase — `grep` for the concept, related names,
  synonyms; check `components/`, `lib/`, `services/`, `pkg/`,
  per language convention (per `reuse-first.md`).
- Within the user's other workspaces — when the same user
  operates multiple projects, check sister projects via
  filesystem walk.
- Within open-source — search GitHub (`https://github.com/search`),
  npm / PyPI / crates.io / Maven Central / RubyGems / Go pkg
  for projects solving the same problem.
- Within commercial vendors — check Stripe / Twilio / Auth0 /
  Cloudflare / AWS Marketplace / GCP Marketplace etc. for
  vendor solutions if applicable.

The answer is a list with links, not "I looked and didn't find
anything."

### 2. Who did it?

- Name the implementers (project authors, library maintainers,
  industry teams) when known. People matter — a well-maintained
  library by a known-trustworthy maintainer (with current
  releases) beats a copy of the same algorithm written from
  scratch.
- For internal projects, name the original engineer (via
  `git log --follow` / blame) so the next author can ask them
  before diverging.
- For open-source, note the maintainer org (Anthropic, Vercel,
  Stripe, etc.) and last release date — abandoned projects are
  not acceptable inputs.

### 3. Who built it (well)?

- Identify the CANONICAL reference implementation (or paper, or
  specification) — what is the version of this idea that the
  field has converged on?
- Note the patterns / idioms that the canonical implementation
  uses. The task starts from that baseline; deviations need
  explicit justification.
- If multiple canonical references exist (vendor A vs vendor B
  vs RFC), document why one is chosen over the others.

### 4. Is there a safe + maintained + commercially-free OSS option?

Before writing new code, exhaustively check whether a permissively-
licensed open-source project already covers the use case. The
acceptance criteria for "use this OSS instead":

- **License is commercially compatible** — MIT, Apache-2.0,
  BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, CC0-1.0, 0BSD, or
  similar (per `license-allowlist-gate.md`). Out: GPL / AGPL /
  SSPL / BUSL / Commons Clause unless legal explicitly approves.
- **Actively maintained** — release within the last 12 months,
  open + closed issues / PRs show recent maintainer activity, no
  "looking for new maintainer" notice.
- **Security posture** — passes the CVE gate (per `dependency-
  vulnerabilities.md` — zero MODERATE+ open CVEs); has a
  documented security disclosure policy.
- **Sufficient adoption** — package downloads / GitHub stars /
  enterprise users sufficient to give signal-of-survival.
- **Tested** — visible test suite + CI status badge green.
- **Documented** — README + at minimum API docs.

If a qualifying OSS option exists, the default is to use it (per
`reuse-first.md` rule 7 radius escalation). Custom code is the
last resort when:
- No qualifying OSS option exists, OR
- The OSS option requires more integration glue than re-
  implementation, OR
- The OSS option's surface is a tiny subset of what's needed and
  pulls in disproportionate dependency weight

When choosing OSS over custom, the install passes through
`install-allowlist.md`. When choosing custom over OSS, the
decision is documented (in the intake's Q9 below) with the
specific OSS options considered and rejected.

### 5. Can it be done better?

- What's the SOTA (state of the art) on this problem TODAY?
  Search for recent papers, blog posts, conference talks, RFCs
  (last 12-24 months).
- What new techniques have emerged since the previous solution
  was published?
- What did the canonical implementation NOT cover (edge cases,
  performance, security, accessibility, i18n, observability)
  that this task could improve?
- The answer is one of: (a) the canonical is still the best;
  (b) here's a documented improvement worth pursuing; (c) the
  canonical has known issues we will work around.

### 6. Is it scalable?

- Will the approach hold at 10× / 100× / 1000× current load?
- What are the failure modes at scale (rate limits, memory
  pressure, connection pool exhaustion, queue backpressure,
  fan-out amplification)?
- What's the operational shape (cold start, warm path, p99
  latency, peak QPS)?
- What's the cost shape (compute, storage, egress, third-party
  API fees, license seats)?
- If scale isn't an immediate concern, NAME the inflection
  point beyond which the approach must be revisited.

### 7. How does it tie and integrate to everything else?

- What other systems / services / modules does this work touch
  (upstream callers, downstream consumers, shared databases,
  shared queues, shared caches)?
- What contracts exist that this work must not break (API
  shapes, schema columns, event payloads, public method
  signatures, observability metric names, log field names)?
- What new integration points does this work create (new
  endpoints, new events, new schema fields, new env vars, new
  IAM policies, new feature flags)?
- What's the deploy ordering — does anything else need to ship
  first / simultaneously / after?
- What's the rollback shape — if this needs to revert, what's
  the safe procedure and who else does it affect?
- What's the observability shape — what metrics + logs + traces
  + alerts let on-call know if this is healthy?
- What's the documentation footprint — which `docs/`, `README`,
  runbook, ADR, landing-page entries change (per
  `docs-sync-with-code.md`)?

The answer is a diagram (mental or actual) of inputs +
outputs + neighbours + contracts + rollback. The work is not
isolated; every change touches a network of consumers, and the
intake names them up front.

### 8. What are the failure modes? (FMEA)

For every component / data flow / external call, enumerate:

- **What can fail?** Network timeout, dependency unavailable,
  malformed input, race condition, exhausted quota, expired
  credential, stale cache, partial write, double-spend.
- **What's the user-visible effect?** Failed request, stale
  data, duplicate side-effect, silent drop, corrupted state.
- **What's the blast radius?** One user / one tenant / one
  region / the entire system.
- **What's the detection signal?** Metric spike, alert, log
  pattern, user report, downstream consumer's complaint.
- **What's the mitigation?** Retry-with-jitter, circuit
  breaker, fallback path, dead-letter queue, idempotency key,
  feature flag kill-switch, manual runbook step.

The output is a short FMEA table (Failure / Effect / Severity /
Detection / Mitigation) per non-trivial component.

### 9. What's the security posture?

Apply STRIDE to the design (per `security.md`):

- **S**poofing: identity verification gaps?
- **T**ampering: integrity protection on stored + in-transit
  data?
- **R**epudiation: audit log + non-repudiation signature?
- **I**nformation disclosure: PII / secrets / internals
  exposure?
- **D**enial of service: rate-limit + queue backpressure +
  resource caps?
- **E**levation of privilege: authz checks on every action?

Plus supply chain: new dependencies pass CVE gate (per
`dependency-vulnerabilities.md`), license gate (per
`license-allowlist-gate.md`), publisher allowlist (per
`install-allowlist.md`).

### 10. What's the data lifecycle?

For every piece of data the change touches:

- **Classification**: public / internal / confidential / PII /
  sensitive PII (health, payment, biometric, religious, etc.).
- **Provenance**: who owns it (user / org / system); how it
  enters the system; chain of custody.
- **Storage**: where it lives (DB / cache / object store /
  cold storage); encryption at rest; key management.
- **Transport**: encrypted in transit (TLS 1.2+); end-to-end
  encryption when applicable.
- **Retention**: how long is it kept; what triggers deletion;
  automated TTL or manual purge.
- **Access**: who can read / write / delete; audit trail of
  access.
- **Residency**: which regions / jurisdictions can hold this
  data (GDPR, China data law, Russia data law, etc.).
- **Anonymisation / pseudonymisation**: when used for
  analytics, training data, or telemetry.

### 11. What's the compliance + regulatory impact?

Per `security.md`'s compliance table — check applicability of:

- **GDPR** / **CCPA / CPRA** / **POPIA** / **PIPEDA** (privacy)
- **HIPAA** / **HITECH** (health)
- **PCI-DSS v4.0** (payment cards)
- **SOC 2 Type II** (service-org controls)
- **ISO/IEC 27001:2022** + **ISO/IEC 27701** (ISMS + privacy)
- **SOX** (financial reporting controls)
- **Industry-specific**: FFIEC (banking), FERPA (education),
  FedRAMP (US gov), GxP (life sciences), MiCA (EU crypto-asset)
- **Accessibility law**: ADA (US), EAA (EU), AODA (Ontario)

For each applicable regulation: what specific articles /
sections apply, what evidence + documentation are required,
who is the responsible role (DPO, CISO, Privacy Officer).

### 12. What's the accessibility commitment?

Per WCAG 2.2 (W3C Recommendation):

- **Compliance level**: AA (the global default) or AAA (when
  user-set higher bar applies)?
- **Keyboard navigation**: every interactive element reachable
  + actionable without mouse?
- **Screen reader**: ARIA labels + roles + live regions wired
  for every component?
- **Color contrast**: text 4.5:1, large text 3:1, non-text UI
  3:1 minimum?
- **Motion**: respects `prefers-reduced-motion`?
- **Focus management**: visible focus ring, focus-trap in
  modals, focus return on dialog close?
- **Touch targets**: 24×24 CSS pixels minimum (WCAG 2.2 §2.5.8)?
- **Cognitive accessibility**: clear language, error
  prevention + recovery, no time limits without extend option?

The intake's a11y subsection names every non-trivial UI surface
this work touches + the WCAG criteria each meets.

### 13. What's the i18n / localisation strategy?

- **Locale coverage**: which locales must be supported at
  launch + at year-1?
- **Text externalisation**: all user-visible strings in a
  translation file (no inline strings)?
- **RTL support**: layout mirrors correctly for Arabic / Hebrew
  / Persian?
- **Pluralisation**: ICU MessageFormat or equivalent for
  multi-plural-form languages (Russian, Arabic, Polish)?
- **Date / time / number formatting**: locale-aware (`Intl` or
  equivalent)?
- **Currency**: per-locale symbol + decimal placement?
- **Sort order**: locale-aware collation?
- **Domain considerations**: name fields (mononym, multi-part,
  Han/Latin/Arabic scripts), address fields (per-country
  shape), phone numbers (libphonenumber).

When the project's current i18n coverage doesn't apply, name
the gap and document the deferred work.

### 14. What's the test strategy?

Per `testing.md` + `tdd-workflow` skill:

- **Unit tests**: every pure function / pure logic branch;
  coverage ≥ 90% touched + ≥ 80% project (per `extreme-lint-
  policy.md`).
- **Integration tests**: every external boundary (DB, queue,
  cache, third-party API mocked or recorded).
- **Contract tests**: producer / consumer schema agreements
  (per the `api-design` skill's "Response-shape contracts" section).
- **E2E tests**: every critical user journey (Playwright /
  Cypress / Detox / XCUITest per platform).
- **Property-based tests**: invariants for parsers, validators,
  state machines.
- **Load tests**: when the change touches a hot path or new
  service.
- **Chaos / fault-injection**: when the system claims
  resilience (retries, circuit breakers, failover).
- **Security tests**: SAST + DAST + dependency-CVE + secret-
  scan in CI.
- **Accessibility tests**: axe-core / pa11y / equivalent for
  every UI surface.
- **Performance tests**: Lighthouse / Web Vitals for client;
  k6 / locust / vegeta for server.

### 15. What's the observability shape?

Per `observability-patterns` skill:

- **Metrics**: per-operation latency (p50/p95/p99), throughput,
  error-rate, saturation (utilisation, queue depth). Naming
  convention: `<service>_<op>_<unit>` (e.g.
  `auth_login_duration_seconds`).
- **Logs**: structured (JSON), with request_id + trace_id +
  user_id + org_id auto-stamped (per `error-handling-with-
  context.md`).
- **Traces**: OpenTelemetry spans across every external call;
  baggage propagation for cross-service context.
- **Alerts**: every SLO has an alert with a defined
  responder. Page-on-call only for user-facing breakage;
  ticket-on-call for warning-level deviations.
- **Dashboards**: a default per-service dashboard with the
  USE method (Utilisation, Saturation, Errors) + RED (Rate,
  Errors, Duration).
- **SLO**: explicit per-feature target (e.g.
  "99.5% of login requests < 500ms p95 over 30d").

### 16. What's the cost model?

- **Compute**: how does this change CPU / memory / Lambda-
  invocations / container-hours?
- **Storage**: how many GB of DB / object-store / cache?
- **Network**: egress bytes, cross-region traffic, CDN cache-
  miss volume?
- **Third-party fees**: API per-call cost (Stripe, Twilio,
  OpenAI, Anthropic, SendGrid)?
- **Per-tenant breakdown**: which costs scale with active
  users vs total users vs requests?
- **Inflection point**: at what scale does the cost shape
  change (move to reserved capacity, negotiate enterprise
  pricing, swap vendors)?

When the cost change is non-trivial, an explicit forecast
table accompanies the intake (`$X/mo at Y users today, $Z/mo
at 10Y users`).

### 17. What's the rollback + disaster recovery plan?

- **Rollback procedure**: exact commands / steps to revert if
  the change ships and fails. Document who runs them, what
  signals trigger them.
- **Feature-flag kill switch**: when applicable, ship the
  change behind a flag that on-call can flip without a deploy.
- **Backwards-compatibility window**: how long does the old
  shape stay supported alongside the new? (per `deprecation-
  lifecycle` planned rule).
- **Data-migration reversibility**: can the migration roll
  back without data loss?
- **DR scope**: RPO + RTO for the affected service. If
  multi-region, what's the failover sequence?

### 18. What's the deprecation lifecycle?

When the change deprecates something existing:

- **Announce**: communicate the deprecation timeline to
  affected consumers (changelog, in-app notice, email).
- **Soft-deprecate**: emit warnings; old path still works.
- **Hard-deprecate**: old path errors but is still routed.
- **Remove**: code + docs + DB columns + IAM perms gone.

Each step has a calendar minimum (e.g. 30 days soft → 60 days
hard → remove). Skipping steps requires explicit user override.

### 19. What's the user-facing copy / UX writing strategy?

For every user-visible string this work introduces:

- **Tone**: matches the product's voice + brand.
- **Clarity**: plain language, no jargon, reading-level
  appropriate (Grade 8 default).
- **Action-oriented**: button labels are verbs ("Save changes"
  not "OK"); error messages name the action to take.
- **Specificity**: error messages name the specific failure +
  remedy ("Card declined: please use a different card" not
  "Something went wrong").
- **Accessibility**: works for screen readers (no purely
  visual cues).
- **i18n-ready**: in the translation file, not hardcoded.
- **Edge cases**: empty states, loading states, partial-
  success states each have explicit copy.

For non-trivial UX writing, the intake names the copy strategy
even if final copy comes later (per `task-intake-due-
diligence.md` Q22).

### 20. What's the documentation footprint?

Per `docs-sync-with-code.md`:

- **Feature page**: `docs/<feature>.md` describing what it
  does + user-visible behaviour + plan-tier gate.
- **API reference**: OpenAPI / Swagger entries for new
  endpoints.
- **README**: handlers table, plan-tier matrix, integrations
  list updated.
- **Runbook**: `docs/runbook.md` entry for every new failure
  mode introduced.
- **ADR**: architecture decision record for non-trivial
  architectural choices (per `adr-template` planned rule).
- **Provider research note**: `docs/provider-research/
  <provider>.md` for any new external integration (per
  `official-docs-first.md`).
- **Changelog**: `CHANGELOG.md` entry.
- **Landing / marketing**: only features that work end-to-end.

### 21. What's the risk register?

Top 5 risks for this work, ranked. For each:

- **Risk description**: what could go wrong.
- **Likelihood**: low / medium / high.
- **Impact**: low / medium / high / critical.
- **Mitigation**: what we're doing pre-emptively.
- **Owner**: who's responsible for the mitigation.
- **Trigger to escalate**: what signal means "the risk is
  materialising — invoke the contingency."

### 22. What's the success criteria + measurement plan?

- **Outcome metric**: the single number that says "this
  worked" (e.g. conversion rate, p95 latency, churn rate,
  NPS).
- **Guardrail metrics**: numbers that must NOT regress (cost,
  error rate, accessibility audit pass rate, support volume).
- **Measurement window**: how long until we have signal (7d
  / 30d / 90d).
- **Decision criteria**: what value of the outcome metric
  triggers "ship to 100%" vs "roll back" vs "iterate."
- **Instrumentation**: the analytics / metrics / experiment
  framework that captures the data.

### 23. What's the post-launch monitoring window?

- **Watch period**: how long after deploy do we actively watch
  for anomalies (typically 24h-7d).
- **On-call assignment**: who's primary + backup during the
  window.
- **Alert thresholds**: temporarily-tighter alerts during the
  watch (e.g. 2× sensitivity on error-rate alerts).
- **Rollback gate**: explicit predicate that triggers
  immediate rollback (e.g. "if error-rate > 1% sustained 5min,
  flip the flag").
- **Post-watch retro**: schedule the retrospective when the
  watch window closes.

### 24. What's the AI / ML ethics review? (when applicable)

When the change involves AI / ML / generative-AI features:

- **Use case**: what does the model do; what's the user-
  visible outcome.
- **Model choice**: vendor (OpenAI, Anthropic, etc.) or
  self-hosted; model version; cost per call.
- **Training data**: provenance (synthetic / scraped / opt-
  in user data / proprietary); consent + licensing.
- **Bias evaluation**: tested across demographic axes
  (gender, race, age, geographic, language)?
- **Failure mode**: what happens when the model is wrong /
  hallucinates / is unavailable?
- **Human-in-the-loop**: where in the flow does a human
  validate?
- **Disclosure**: does the user know AI is involved? (EU AI
  Act requires this for many use cases.)
- **Audit log**: every AI decision logged for review?
- **Right to explanation**: when AI affects a user decision,
  can the user request the reasoning (per GDPR Art 22)?

### 25. What's the vendor / IP / licensing review?

- **New vendors**: each new third-party dependency / SaaS /
  cloud service named, with TOS + privacy policy + DPA
  reviewed by legal.
- **License compatibility**: new deps pass `license-allowlist-
  gate.md`; out-of-allowlist deps require explicit org-legal
  sign-off.
- **IP ownership**: ensure code we write is owned by the org
  (no work-for-hire ambiguity); ensure derivative work
  complies with upstream licenses.
- **Patent risk**: search for patents covering the technique
  (USPTO + EPO + WIPO Patentscope) when the technique is
  novel.
- **Trademark**: any product / feature names checked against
  trademark databases?

### 26. What's the operational handoff plan?

- **Runbook**: lives at `docs/runbook.md` (or per-service
  equivalent); names the symptoms + diagnostic commands +
  remediation steps for every alert.
- **On-call training**: when the change introduces new
  failure modes, on-call rotation is briefed before the
  deploy.
- **Knowledge transfer**: principal author pairs with at
  least one teammate so the bus-factor is ≥ 2.
- **Escalation path**: who to call when on-call can't
  resolve; what their escalation path looks like.
- **Vendor contacts**: for new integrations, support contact
  + SLA + escalation procedure named.

### 27. What to do?

- The action plan, derived from steps 1-26.
- Per `plan-task-breakdown.md`: a long list of small atomic
  tasks, not a phase-level outline.
- Per `reuse-first.md`: explicit decision to use / extend /
  create primitives.
- Per `official-docs-first.md`: primary-source citations for
  every external integration.

### 28. All other things

The intake is not exhaustive. Surface any other consideration
the task surfaces:

- **Team capacity** + planned absences during the work window.
- **Dependencies on other teams / external schedules**.
- **Window blackouts** (release freezes, peak-season caution,
  customer-success blackouts).
- **PR-of-record / changelog audience** (engineers vs end-
  users vs investors).
- **Marketing coordination** (when a feature has external
  comms).
- **Sales enablement** (when reps need talking points).
- **Customer-success briefing** (when CS needs runbook
  updates).
- **Localisation deadline** (when translation pipeline has
  lead time).

### 29. Online research is mandatory, never optional

The intake REQUIRES online research. The assistant uses
WebSearch / WebFetch / Agent (with WebFetch) without asking
permission for routine research. Citations come from primary
sources (project's own docs, RFCs, vendor docs) — never from
Stack Overflow, npm READMEs, or blog posts as the sole reference
(per `official-docs-first.md`).

When the user explicitly says "no internet" or the environment
blocks it, the intake notes this and proceeds with codebase-only
research, flagging the gap as a risk.

## Intake output shape

Every task / plan produces an intake block. The minimum shape
mirrors questions 1-28 above. Compact-table form (use for
medium-sized tasks; expand to per-question subsections for large
plans):

```markdown
## Task intake (per `task-intake-due-diligence.md`)

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
| 14 | Test strategy | <unit/integration/e2e/contract/load/sec/a11y> |
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
| 26 | Operational handoff | <runbook + on-call brief + bus-factor ≥2> |
| 27 | Action plan | <reference to plan file or inline TODO list> |
| 28 | Other | <team capacity, blackouts, sales/CS coordination> |

### Online sources consulted (Q29)
| Source | URL | Read date | Key finding |
| --- | --- | --- | --- |
```

For very large plans, the table form is replaced with per-
question subsections each expanded with bullets / sub-tables.
For very small tasks (single-line fix, typo), use the
abbreviated form named in "Skipping the intake" below.

The intake block is part of the plan file (or Council Phase 0
output). It is NOT a separate deliverable — it lives at the
top of the plan / response and stays as the durable record of
WHY the task is being approached this way.

## Skipping the intake

The intake can be abbreviated for trivial work (single-line fix,
typo, config tweak) but cannot be skipped entirely. Even a
trivial fix asks "has this been fixed before?" (check git log
for related commits) and "who introduced the bug?" (`git blame`
the affected line so the next contributor knows the original
intent).

Abbreviated intake for trivial work:
- Q1 + Q2 + Q8 (Action plan) only (1-2 sentences each)
- The remaining questions marked N/A with a one-line reason

Anything non-trivial (new feature, integration, refactor, new
service) requires the FULL intake. Council Protocol Phase 0
is the natural home — the intake answers populate Phase 0
directly.

## Cross-references

- `reuse-first.md` — Q1 sweeps for existing primitives; Q4
  formalises the OSS-before-custom escalation
- `official-docs-first.md` — Q3 + Q10 require primary-source
  citations
- `patterns.md` — Q3 + Q5 leverage canonical references +
  skeleton projects
- `plan-task-breakdown.md` — Q8 is the granular task list
- `docs-sync-with-code.md` — Q7's integration map drives the
  docs / runbook / ADR updates that ship with the work
- `license-allowlist-gate.md` — Q4 license check uses the same
  allowlist as the dependency gate
- `plan-execution-progress.md` — the intake is the FIRST
  progress update of any plan
- `proper-fixes-first.md` — Q5's improvements must address
  root causes, not symptoms
- Council Protocol Phase 0 (`CLAUDE.md`) — the canonical home
  for the intake on Council-mediated tasks
- `verify-before-claim.md` — the intake is verified before any
  implementation work

## Why this rule exists

Without a structured intake, tasks default to "start coding
based on the user's description" — which reliably misses:
- Existing primitives (rediscovered as duplicates per
  `reuse-first.md` post-mortems)
- Better techniques published in the past year
- Scaling failure modes that only surface at customer scale
- Vendor solutions that would have shipped the work in days
  instead of weeks
- Compliance / accessibility / security gaps that block
  shipping

The cost of the intake is 15-60 minutes per task. The cost of
discovering an existing canonical implementation AFTER shipping
a parallel one is days of rework + reviewer trust loss.

User directive (verbatim): **"every task or plan must start
with a has it been done before? who did it? who built it? can
it be done better? is it scalable? what to do and all other
things in that plan or request and you are always free to look
online."**

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Task shipped without the 29-question intake (rule violation pattern)
- Intake question consistently answered "N/A" across many tasks (question may need re-scoping OR may genuinely not apply to a task class)
- Intake question that proved load-bearing in post-mortem was answered superficially (depth needs reinforcement)
- New question dimension recurring in retrospectives that the current 29 don't cover (new question candidate)
- Same prior-art (Q1) miss recurring (sweep tooling weak; need better discovery)
- OSS option (Q4) chosen as CUSTOM when a maintained option existed (Q4 discipline weak)
- Online research (Q29) skipped on an external integration (rule violation per `official-docs-first.md`)
- Scalability (Q6) inflection point hit earlier than predicted (heuristic miss)

**Refinement candidates**:
- New question when a missed dimension shows up in 2+ retrospectives
- Tightening of "skipping the intake" abbreviated form when trivial-classified work later proved non-trivial
- New compact-table row when a question consistently produces structured output that the current row doesn't capture
- Cross-reference deepening when a sister rule's gate is the proof an intake question depended on
