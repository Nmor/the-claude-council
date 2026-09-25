# Lean Startup — Core Patterns

> All twelve core patterns in full: build–measure–learn, validated learning,
> MVP taxonomy, innovation accounting, the ten pivot types, Customer
> Development, the canvases, engines of growth, the three stages, continuous
> discovery, small batches, and the Five Whys. Pointed at by the **Core
> Patterns** row of the SKILL.md reference map.
>
> **Size budget: 17 KB** — `token-budget.mjs --check`.

## Core Patterns

### Pattern 1: The Build–Measure–Learn Loop

The central engine of Lean Startup. Mis-read versions of this
loop fail because they invert the order:

```text
       IDEAS
         │
         ▼
       BUILD  ──────► CODE
         │
         ▼
      MEASURE ─────► DATA
         │
         ▼
       LEARN
         │
         ▼
    (Pivot or Persevere)
         │
         └──► back to IDEAS
```

**Critical inversion**: the loop is *planned* in reverse —
start with what you need to learn, derive what to measure,
then derive what to build. People build first and figure out
later what they learned, which guarantees waste.

**Loop velocity is the metric.** A startup that runs the loop
weekly outlearns one that runs it quarterly by an order of
magnitude. This is why **continuous deployment** + **small
batches** are lean enablers (Ries Ch 9): they shorten the loop.

### Pattern 2: Validated Learning

Validated learning is the unit of progress for a startup. It
is NOT:

- A successful launch
- A feature shipped
- A milestone hit
- A round raised
- Press coverage

It IS: rigorous demonstration that a previously-uncertain
business-model hypothesis is true (or false), backed by
real-customer behavioural evidence. Every loop should produce
at least one piece of validated learning.

A common failure: teams treat *opinions strengthened* as
validated learning. Ries: "learning is the oldest excuse in the
book for a failure of execution" — to count as validated
learning, the hypothesis must have been **testable**, the test
must have been **run**, and the result must have been
**observed in customer behaviour** (not just self-reported).

### Pattern 3: The MVP — Minimum AND Viable

The single most damaging misreading: "MVP = buggy first
version." Ries's actual definition: **the version of the
product that enables a full turn of the build–measure–learn
loop with the minimum amount of effort and the least amount of
development time.** It must be minimum (cheap) AND viable
(produces learning). A buggy v1 is neither: it's expensive AND
it produces noise rather than signal.

The MVP taxonomy:

| Type | What it tests | Example |
| --- | --- | --- |
| **Smoke test / landing page** | Demand signal — does anyone click "Get Started"? | A page describing the product with a sign-up form; nothing built behind it |
| **Concierge MVP** | Whether your solution solves the problem when delivered manually for ONE customer | Founders manually do the job by hand for the first user; no software |
| **Wizard of Oz** | Whether automated-looking product is desired — but it's secretly humans behind it | User sees a product UI; backend is a person doing the work |
| **Piecemeal MVP** | Whether assembled-from-existing-services product solves the job | Stitch together Stripe + Calendly + email — no custom code |
| **Single-feature MVP** | Whether ONE clear feature is enough value | Strip the product to one feature; test that alone |
| **Video MVP** | Whether a complex/risky-to-build idea is worth building | Dropbox 2008: 3-minute video showed the concept; 75k waitlist signups; built later |
| **Pre-order / Kickstarter** | Whether customers will pay before the thing exists | Pebble: $10M pledged before product existed |

Choosing the MVP type follows the question: **what's the
RISKIEST assumption?** If it's demand → smoke test. If it's
willingness to pay → pre-order. If it's whether the solution
works at all → concierge. If it's whether the operations
scale → Wizard of Oz.

### Pattern 4: Innovation Accounting

Standard accounting fails for startups because growth happens
in steps, not curves, and revenue lags learning by months.
Innovation Accounting (Ries Ch 7) replaces vanity metrics
(total users, total downloads, page views) with actionable
metrics:

| Vanity (banned) | Actionable (required) |
| --- | --- |
| Total registered users | Activation rate per cohort |
| Total page views | Retention curves per cohort |
| Press mentions | Sign-up funnel conversion by source |
| Total revenue | LTV per cohort vs CAC |
| Total downloads | DAU/MAU ratio (stickiness) |
| GMV | Net revenue retention per cohort |

Three innovation accounting stages:

1. **Establish baseline** — run an MVP, measure today's truth
   on the actionable metric (e.g., 0.5% trial-to-paid).
2. **Tune the engine** — every BML loop should move the metric
   measurably; if not, pivot.
3. **Pivot or persevere** — if multiple loops fail to move the
   metric, pivot; if they consistently move it, persevere.

**Cohort analysis is mandatory.** Per-cohort retention reveals
truth that aggregate metrics hide. A product where this month's
cohort retains worse than last month's is dying even if total
users is growing.

### Pattern 5: Pivot or Persevere (Ten Pivot Types)

After enough BML loops fail to move the actionable metric,
the team faces the pivot/persevere decision. Ries Ch 8
catalogues ten pivot types:

| # | Pivot type | What changes |
| --- | --- | --- |
| 1 | **Zoom-in** | A single feature of the product becomes the whole product |
| 2 | **Zoom-out** | The current product becomes one feature of a larger product |
| 3 | **Customer-segment** | The product is right but you're aiming at the wrong customer |
| 4 | **Customer-need** | You discovered a more pressing problem the same customer has |
| 5 | **Platform** | Application → platform or vice versa |
| 6 | **Business-architecture** | High-margin/low-volume ↔ low-margin/high-volume |
| 7 | **Value-capture** | Free-to-paid, ads → subscription, etc. |
| 8 | **Engine-of-growth** | Switch from viral to paid (or any other combination) |
| 9 | **Channel** | Direct sales → channel partners, retail → online |
| 10 | **Technology** | Different tech to achieve the same solution |

The decision should be made at a **pivot-or-persevere
meeting** (Ries Ch 8) on a regular cadence — not when someone
finally loses patience. The meeting reviews innovation
accounting, lists assumptions falsified vs validated, and the
team decides. Pivoting is NOT failure; it's the productivity
of the search.

### Pattern 6: Customer Development (Blank's Four Steps)

Blank's framework (predates Ries; Lean Startup is Blank +
Agile + lean manufacturing applied to it):

```text
SEARCH PHASE                          EXECUTION PHASE
─────────────────────────────────  │  ──────────────────────────────────
Customer Discovery → Customer Validation │ Customer Creation → Company Building
        │                  │       │       │                    │
        ▼                  ▼       │       ▼                    ▼
   Problem-           Product-     │   Demand           Functional org;
   solution           market       │   creation;        process; HR;
   fit                fit          │   scaling          M&A
```

**Customer Discovery** — find a problem worth solving. Get out
of the building. Test problem hypothesis via 100+ unstructured
interviews. The Mom Test (Rob Fitzpatrick 2013) gives
interview discipline: ask about specific past behaviour, not
hypothetical future actions.

**Customer Validation** — prove the solution works AND can
acquire customers repeatably. Pre-sales, paid pilots, signed
LOIs. The Pivot Decision happens between Discovery and
Validation if the problem is wrong.

**Customer Creation** — only AFTER PMF, scale demand
generation. Marketing, sales operations, growth team
formation.

**Company Building** — process, structure, departments. This
is where Lean Startup ENDS and execution discipline takes
over.

### Pattern 7: Business Model Canvas + Lean Canvas

**Business Model Canvas (Osterwalder + Pigneur 2010)** — 9
boxes on one page:

```text
┌─────────────────┬─────────────────┬─────────────────┐
│ Key Partners    │ Key Activities  │ Value           │
│                 │                 │ Propositions    │
│                 ├─────────────────┤                 │
│                 │ Key Resources   │                 │
├─────────────────┼─────────────────┼─────────────────┤
│ Cost Structure  │                 │ Revenue Streams │
│                 │                 │                 │
└─────────────────┴─────────────────┴─────────────────┘
                  ↓                ↑
        ┌─────────────────┬─────────────────┐
        │ Customer        │ Customer        │
        │ Relationships   │ Segments        │
        ├─────────────────┤                 │
        │ Channels        │                 │
        └─────────────────┴─────────────────┘
```

**Lean Canvas (Maurya 2010/2022)** — adapted from BMC for
early-stage startups. Replaces:

| BMC box | Lean Canvas box |
| --- | --- |
| Key Partnerships | Problem |
| Key Activities | Solution |
| Key Resources | Key Metrics |
| Customer Relationships | Unfair Advantage |

Lean Canvas emphasises the **problem first** because that's
what early-stage startups get wrong most often.

**Value Proposition Canvas (Osterwalder 2014)** zooms in on
the fit between Customer Segments and Value Propositions:

- **Customer Profile**: Jobs (functional, emotional, social),
  Pains, Gains
- **Value Map**: Products + Services, Pain Relievers, Gain
  Creators
- **Fit**: when value map elements address the highest-impact
  jobs/pains/gains

### Pattern 8: Engines of Growth

Every sustainable business has ONE dominant engine of growth
(Ries Ch 10). Mixing them is a sign of strategic confusion:

| Engine | How it works | Key metric | Examples |
| --- | --- | --- | --- |
| **Sticky** | Existing customers stay (low churn); growth = acquisition rate > churn rate | Net churn rate (negative = expanding); cohort retention | SaaS, telco, subscription |
| **Viral** | Existing customers refer new customers as a side-effect of using the product | Viral coefficient K > 1 (each user brings ≥1 new user) | Hotmail, Dropbox, PayPal (early), TikTok |
| **Paid** | Revenue from customers > customer acquisition cost; reinvest the margin in more acquisition | LTV / CAC > 3, payback period < 12 months | Most B2B, marketplaces, ecommerce |

Choose the engine BEFORE you tune metrics. A team optimising
for viral coefficient when their product is actually paid will
burn capital. A team optimising for CAC reduction when their
product is actually viral will miss the loop.

### Pattern 9: Three Stages — Problem-Solution Fit → PMF → Scale

| Stage | Question | Evidence | Right activity |
| --- | --- | --- | --- |
| **Problem-Solution Fit** | Is there a real problem? Does anyone notice? | Qualitative — customers describe the pain unprompted; willingness to pay signalled | Customer Discovery, Lean Canvas, problem interviews |
| **Product-Market Fit** | Does the product solve the problem well enough that customers pull it from us? | Quantitative — Sean Ellis 40% rule (≥40% say they'd be very disappointed if the product disappeared); retention curve flattens; organic growth | Customer Validation, cohort retention, MVP iteration |
| **Scale / Growth** | Can we grow the engine repeatably + profitably? | Unit economics positive; CAC payback < 12 months; growth loop sustainable | Customer Creation, growth team formation, scaling discipline |

The single biggest waste in startups is scaling **before** PMF.
Sales hires fired, marketing spend wasted, engineering scaled
to support a product that nobody pulls. **Don't hire marketing
until PMF.**

### Pattern 10: Continuous Discovery (Torres 2021)

The modern evolution of Customer Development for product teams
with existing products:

- **Weekly customer interviews** — minimum 2-3/week per product
  trio (PM + designer + tech lead)
- **Opportunity Solution Tree** — root = outcome; branches =
  opportunities; leaves = solutions; experiments at the leaves
- **Assumption mapping** — before any build, list assumptions
  by risk × evidence; test highest-risk-least-evidence first
- **Story-based interviewing** — ask about specific past
  events ("Walk me through the last time you…"), not
  generalities or hypotheticals

Pairs with Cagan's dual-track agile: discovery track (testing
ideas) runs in parallel with delivery track (building shipped
software), feeding each other every iteration.

### Pattern 11: Small Batches + Continuous Deployment

Lean Startup borrows from Toyota's Lean Manufacturing the
insight that **small batches reduce cycle time**. In software:

- Continuous deployment (multiple deploys per day, not weekly
  releases)
- Feature flags for in-production experiments
- Canary releases + automatic rollback
- Andon cord — anyone can halt the build for a regression

Small batches enable fast BML loops, which compound. The
cumulative learning advantage of weekly-vs-quarterly loops
is exponential, not linear.

### Pattern 12: The Five Whys (Root-Cause for Startups)

When a metric regresses or an experiment fails, Ries Ch 11
applies the Toyota Five Whys to find root cause — but adapts
it: at each "why?", make a **proportional investment** in
preventing the cause. Don't punish people for finding root
causes; reward it.
