# org-design: Core Patterns

> Covers **Core Patterns** for the `org-design` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 14 KB** — `token-budget.mjs --check`.

## Core Patterns

### Pattern 1: Conway's Law — design for the org you want

"Any organization that designs a system... will produce a design
whose structure is a copy of the organization's communication
structure" — Melvin Conway, 1968.

Implications:

- Want a modular product? Build modular teams with explicit
  interfaces.
- Want a monolithic product? Let one team own everything.
- Want a platform + product split? Make the platform team an
  internal supplier with a documented contract.
- Want fast horizontal scaling? Stream-aligned teams owning
  end-to-end customer value.

The "inverse Conway manoeuvre" (Forsgren, Humble, Kim — DORA):
intentionally restructure teams to produce the architecture you
want. Done before the technical refactor, it works. Done after,
the political cost is enormous.

### Pattern 2: Team Topologies — four team types

Skelton + Pais — the modern canon:

| Type | Purpose | Typical size |
| --- | --- | --- |
| **Stream-aligned** | End-to-end ownership of a flow of work (a product, feature, journey, segment) | 5-9 (Dunbar's first ring) |
| **Platform** | Internal products that reduce cognitive load for stream-aligned teams (auth, infra, design system, CI/CD) | 5-9 per platform |
| **Enabling** | Time-boxed help; transfer skills to stream-aligned teams (DevEx, ML enablement, accessibility consulting) | 3-6, often part-time |
| **Complicated-subsystem** | Specialist subsystems requiring deep expertise (search, ranking, ML core, video codec) | 5-9 |

Three interaction modes:

- **Collaboration**: two teams work tightly together for a
  bounded period (creates capability, then split)
- **X-as-a-Service**: platform team provides an interface;
  consumer team self-serves
- **Facilitation**: enabling team helps for a sprint, then
  leaves

The interaction mode should be explicit per team-pair and
revisited quarterly.

### Pattern 3: Span of control — the right number of reports

Healthy span of control depends on the work:

| Work type | Span |
| --- | --- |
| Highly creative / strategic (e.g., founders, principals) | 3-5 direct reports |
| Engineering management (knowledge work, mentorship) | 5-9 |
| Operations / production (well-defined work) | 9-15 |
| Customer service (well-defined, monitored) | 15-25 |

Below 3: layer redundancy, unclear value. Above 9 for knowledge
work: insufficient 1:1 time, mentorship suffers, employees feel
unmanaged. The classic mistake: a senior IC promoted to manager,
keeps doing IC work, ends up with 12 reports and no time. Set
the limit; honour it.

### Pattern 4: Functional vs Divisional vs Matrix

| Structure | Strength | Weakness | Use when |
| --- | --- | --- | --- |
| **Functional** (engineering, product, design, sales as separate orgs) | Deep expertise, career ladders, economies of scale | Slow cross-functional execution | Early stage; one product; functional excellence matters more than speed |
| **Divisional** (full-stack BU per product / market) | Customer focus, autonomous, fast | Duplication, weaker functional depth | Multi-product, distinct customer segments, BU-level P&L |
| **Matrix** (people report to both function + product/region) | Balance | Two-boss problem, slow decisions | Conditional; needs strong DACI + senior leaders who manage matrix tensions |
| **Network / Holacracy** (role-based, no permanent boxes) | Adaptive, distributed authority | Cognitive overhead, ambiguity, hard to scale | Early or research-heavy; rarely scales beyond ~150 |

Most companies oscillate: start functional, decentralise to
divisional as products multiply, attempt matrix when
cross-cutting concerns dominate, sometimes formalise networks
for specific work (guilds, communities of practice).

### Pattern 5: Decision rights — DACI / RACI / RAPID

Confusion about who decides is the largest single source of
slow decisions. Adopt one framework consistently:

**DACI** (per decision):

- **D**river: drives the decision to closure
- **A**pprover: makes the final call (single person)
- **C**ontributor: gives input
- **I**nformed: notified after

**RACI** (per task):

- **R**esponsible: does the work
- **A**ccountable: owns the outcome
- **C**onsulted: two-way input
- **I**nformed: one-way update

**RAPID** (Bain):

- **R**ecommend, **A**gree, **P**erform, **I**nput, **D**ecide

Pick one. Document for every recurring decision class. The "two
A's" anti-pattern (two people both think they're accountable) is
the recipe for either deadlock or after-the-fact recrimination.

### Pattern 6: Dunbar's number + the law of nested teams

Robin Dunbar's research suggests social cohesion at ~150 with
nested rings:

```text
Inner circle:   ~5     (immediate team / family)
Close colleagues: ~15
Working group:   ~50    (your "department")
Acquaintances:  ~150    (everyone you'd recognize)
Wider network:  ~500    (extended professional)
Group identity: ~1500   (company-wide attempt fails above this)
```

Practical:

- Squads / pods: 5-9 people (the inner ring)
- Tribes / chapters: 30-60 people (the working-group ring)
- Business unit / function: ≤ 150 (the cohesion ring)
- Above 150: introduce sub-cultures intentionally; expect
  identity fragmentation

### Pattern 7: Operating rhythm — meetings + cadences

Without rhythm, decisions slip and dependencies stack. Common
cadences:

| Cadence | Purpose | Participants |
| --- | --- | --- |
| **Daily standup** | Surface blockers (15 min) | Team |
| **Weekly 1:1** | Career + project + relationship | Manager + report |
| **Weekly team meeting** | Coordination + alignment | Team |
| **Bi-weekly sprint** (if agile) | Plan + review + retro | Team |
| **Monthly business review** | Metrics + decisions | Function leadership |
| **Quarterly OKR review** | Goal recalibration | Function + cross-function |
| **Quarterly skip-level** | Pulse from N-2 | VP + skip-level reports |
| **Quarterly all-hands** | Strategy + culture | Whole org |
| **Annual strategy** | Direction-setting | Leadership |
| **Annual perf review** | Career, compensation | Manager + report + HR |

Every meeting has an owner, an agenda, a decision-log, and the
explicit right to be cancelled when there's nothing to discuss.
Recurring meetings without value drain morale faster than almost
any other organisational dysfunction.

### Pattern 8: Coordination cost — Brooks's Law math

For N people, coordination paths grow as N × (N - 1) / 2:

- 5 people → 10 paths
- 10 people → 45 paths
- 50 people → 1225 paths

This is why "just add more engineers" produces slower delivery.
Mitigations:

- Cap effective team size at 9 (Amazon's "two-pizza rule")
- Define interfaces between teams as strictly as between
  services (API contracts, on-call rotations, SLAs)
- Make platform teams that absorb coordination cost (auth,
  infra, design system, observability)
- Reduce dependencies before adding headcount

### Pattern 9: Decision speed vs decision quality

Different decision types deserve different processes:

| Decision type | Process |
| --- | --- |
| **Reversible, low blast** (Bezos's "Type 2") | One person decides fast |
| **Irreversible, high blast** (Type 1) | Senior review, written memo, deliberate |
| **Routine operational** | Documented playbook |
| **Strategic / directional** | Workshop + ADR + board if needed |
| **People** (hire / fire / role change) | Hiring committee / promo committee / manager + skip + HR |

Mismatching: treating Type 2 as Type 1 wastes time; treating
Type 1 as Type 2 creates strategic accidents.

### Pattern 10: Scaling stages — what breaks at each threshold

| Stage | Headcount | What breaks | Add |
| --- | --- | --- | --- |
| Founding | 1-10 | Nothing — everyone knows everything | Stay small; document decisions for later |
| Tribal | 10-50 | Founder bottleneck; informal decisions don't scale | First management layer; written values; basic processes |
| Scaling | 50-150 | Cross-team dependencies; first culture fragmentation | Functional structure; OKRs; 1:1s; engineering management ladder |
| Mid-size | 150-500 | Functional silos; misalignment across BUs | Divisional structure; platform teams; matrix overlays; people-ops infrastructure |
| Large | 500-1500 | Decision velocity drops; bureaucracy creeps | Decentralisation; explicit decision rights; strong principal-IC track |
| Enterprise | 1500+ | Innovation slows; organisational inertia | Internal "skunkworks"; dual-system org per Kotter |

Each transition rewrites parts of the org. Anticipate; don't
react.

### Pattern 11: CODEOWNERS + RACI as code

Map team ownership to the code:

```text
# .github/CODEOWNERS
/services/auth/         @team-platform-auth
/services/billing/      @team-payments
/web/components/ui/     @team-design-system
/.github/workflows/     @team-platform-cicd @team-security
```

Combined with a `docs/ownership.md` that names team purpose,
on-call, SLA, escalation paths, this is the operational
manifest of the org structure. When a CODEOWNERS file is stale,
the org chart is stale.

### Pattern 12: Career ladders that mirror the structure

Two tracks (IC + manager) at parallel levels:

| Level | IC | Manager |
| --- | --- | --- |
| L3 | Engineer | — |
| L4 | Senior Engineer | — |
| L5 | Staff Engineer | Engineering Manager |
| L6 | Senior Staff | Senior EM |
| L7 | Principal | Director |
| L8 | Distinguished | Senior Director |
| L9 | Fellow | VP |

Compensation bands parallel. Promotions to manager are a job
change, not a reward. Demotions from manager back to IC are
possible without stigma. Without this discipline, the org
becomes managed by people who didn't want the job, while the
best technical leaders are blocked from progression.

### Pattern 13: Psychological safety as enabling condition

Amy Edmondson's research (and Google's Project Aristotle) — the
strongest predictor of team performance is psychological safety:
the belief that the team is safe for interpersonal risk-taking.
Engineering implication: a team that can say "I don't know",
"I made a mistake", "this design has a flaw" early ships better
software than a team that hides those signals until they
explode. Org design enables safety via:

- Stable team membership (relationships need time)
- Blameless post-mortems (per `runbook-template.md`)
- Managers trained in active listening + non-defensive response
- Explicit norms around dissent + disagreement
- 1:1 time prioritised

### Pattern 14: Dual-system organisations (Kotter)

Established companies need both a hierarchy (running the
business today) and a network (inventing what's next).
Practical instantiations:

- Founder-mode + scaled-mode distinction
- Innovation lab / horizon-3 team with separate budget +
  governance
- 20% time / hack weeks (real, not theatre)
- Internal incubators with kill-criteria and graduation paths
- M&A as innovation source

The risk: the network gets crushed by the hierarchy when budgets
tighten. Protect it with executive sponsorship and outcome-
focused (not output-focused) metrics.

### Pattern 15: Remote, hybrid, in-person — design for the mode

Each mode has different org-design implications:

- **In-person**: high-bandwidth coordination by proximity;
  political dynamics by location; favour smaller teams
- **Remote-first**: written communication is mandatory; async
  decision-making; time-zone overlap is the scarce resource;
  favour smaller, fully-aligned-time-zone teams
- **Hybrid**: the hardest. Risks: in-person bias, two-track
  meetings (in-room + on-screen). Mitigate via "remote-first"
  norms even when most people are in-room

Don't pretend the mode is the same. Each requires distinct
operating norms.
