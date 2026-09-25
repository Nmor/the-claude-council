# performance-management: Core Patterns

> Covers **Core Patterns** for the `performance-management` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 13 KB** — `token-budget.mjs --check`.

## Core Patterns

### The Three Conversations — Separated

Bock's seminal insight at Google: most performance management
fails because three fundamentally different conversations are
collapsed into one review meeting where none of them happen well.
Separate them:

1. **Performance conversation** — backward-looking; did the work
   deliver the expected outcomes? Cadence: continuous, with a
   formal recap quarterly or semi-annually
2. **Compensation conversation** — backward-looking + market;
   what changes to comp reflect the performance + market
   movement? Cadence: annual, on a defined comp cycle
3. **Development conversation** — forward-looking; where is the
   person going, what skills do they need, what experiences do
   they need to seek? Cadence: ongoing, with quarterly explicit
   check-ins

When these three are in the same meeting, the comp question
dominates ("what's my number?"), the performance honest-talk gets
diluted (nobody wants to say something honest right before
discussing money), and development gets squeezed to the last 5
minutes. Separated, each gets the time + tone it needs.

### Feedback Cadence — Continuous + Formal

The performance system is the formal scaffolding on top of a
high-frequency feedback culture. The cadence:

| Cadence | Conversation |
| --- | --- |
| **Real-time** | Specific feedback in the moment of the work (or within 24h) — what worked, what didn't |
| **Weekly 1:1** | 30-60 min manager-IC; structured check-in covering work + obstacles + development |
| **Monthly** | Lightweight goal check + course correction |
| **Quarterly** | Formal performance reflection + development discussion |
| **Semi-annual** | Mid-year performance check + calibration |
| **Annual** | Formal performance review + comp + level discussion |
| **360 feedback** | Annually or per major project; peer + cross-functional + direct-report feedback |

Annual-only reviews are the dominant anti-pattern: a year of
unsaid things compressed into a 60-minute meeting where the
employee can't process and the manager can't deliver. The fix is
weekly + monthly + quarterly — the annual is just the official
summary of conversations the employee has already had.

### Ratings or No Ratings — The Live Debate

The 2015-2020 era saw many large organisations (Adobe, Deloitte,
GE, Microsoft) move away from numeric / ordinal ratings. The
arguments:

**For abolishing ratings**:

- Forced-distribution ratings (the "stack rank") produce political
  behaviour, internal competition, and rating drift toward the
  median
- Ratings collapse multi-dimensional performance into one number
  and lose information
- Ratings + compensation coupling produces sandbagging on goals
- Ratings-as-management-by-fear damage psychological safety

**For keeping ratings**:

- Compensation distribution requires SOME differentiation signal;
  if not ratings, then something else
- Promotion calibration needs comparative judgement; without
  ratings the calibration is implicit and harder to audit
- "Did this person meet the bar?" is the question every manager
  has to answer; ratings just formalise it
- Without ratings, low performers are harder to surface objectively

The pragmatic middle:

- Keep meaningful performance categories (e.g., "below expectations"
  / "meets" / "exceeds" / "outstanding") for differentiation +
  compensation + legal defensibility
- Decouple ratings from goals (OKRs are separate; ratings reflect
  overall performance not OKR scores)
- Use words not numbers (people react to "outstanding" differently
  than "5")
- Add direction over time, not just point ratings ("trending up",
  "consistent", "trending down")
- Avoid forced distribution percentages

The right answer depends on org size, maturity, regulatory
environment, and compensation philosophy. Organisations with
heavy fixed comp + low variable comp can lean further toward
"no ratings"; those with high variable comp or competitive
compensation against benchmarks usually need some categorisation.

### The Performance Distribution

In a high-functioning team, performance roughly distributes:

| Category | Approx % | Action |
| --- | --- | --- |
| **Outstanding** | 5-15% | Promote, retain at all costs, give stretch opportunity, equity refresh, attention |
| **Exceeds** | 20-30% | Develop, expand scope, comp competitively, succession candidate |
| **Meets** (strong middle) | 50-60% | Comp at market, target growth assignments, recognise contribution |
| **Below** | 5-10% | Coaching plan; if no improvement, PIP or move-on conversation |
| **Significantly below** | <5% | PIP with exit on the table; managed exit if no improvement |

Forced distributions ("we must give 10% an outstanding rating; we
must give 10% a below rating") are universally damaging and often
legally risky. The right pattern is a SUGGESTED distribution as
calibration sanity check ("if all 10 of your reports are
outstanding, let's look together at the evidence"), not a hard
quota.

### Calibration

Calibration is the meeting where managers compare ratings across
teams to ensure consistency. Without it, the easy-grading manager's
"meets expectations" looks the same as the hard-grading manager's
"outstanding". With it, comp + promotion outcomes are fair across
the org.

Calibration mechanics:

- Managers come pre-prepared with proposed ratings + evidence for
  each report
- Discussion centres on specific examples ("Jamal shipped X, led
  Y, recovered Z — is this exceeds or outstanding?")
- A neutral chair or HR partner facilitates
- Outcome: agreed distribution + documented rationale per report

Failure modes: calibration becomes politics (alliances form,
favours traded), or calibration becomes hours of debate over
ratings the employee will never see anyway. The fix is structured
calibration with clear criteria, time-boxed discussion, and a
strong chair.

### Career Frameworks + Leveling

A career framework defines the expectations at each level of the
organisation — what an L3 engineer does differently from an L4,
L5, L6, L7. Without a framework, leveling debates become "I think
they're an L5" vs "I think they're an L4" with no shared
definition.

A good framework:

- **Two tracks** — IC + Manager — with parity at every level
  (an L6 IC and an L6 manager are equivalent in scope, comp,
  influence, and respect)
- **Multi-dimensional** — typically: technical / craft, impact /
  scope, leadership / influence, communication, decision-making
- **Behavioural** — describes observable patterns, not abstract
  traits ("Drives initiatives across multiple teams" not
  "leadership")
- **Cumulative** — higher levels include all expectations of
  lower levels; the addition is what changes
- **Public + transparent** — every employee can read the framework
  and self-assess

Examples worth studying (publicly documented): GitLab handbook,
CircleCI engineering ladder, Square, Buffer, Stripe.

Per `org-design`, leveling guides also calibrate hiring; the
candidate at L5 in another company doesn't automatically become an
L5 in yours.

### Promotion

Promotion is a separate process from performance review, though
they're related. A promotion answers: has this person been
operating at the next level for long enough + consistently enough
that we should now formally recognise it?

Patterns:

- **Promotion at level you're already operating at** — the right
  rule. Promotion confirms a state already reached, not a state
  hoped for
- **Promotion committee** — for L5+ and especially manager
  promotions, a cross-team committee evaluates the case to
  prevent local boss-bias
- **Promotion packet** — written case for the promotion: scope
  delivered, evidence of next-level operation, peer feedback,
  manager assessment
- **Time at level** — a minimum (e.g., 18 months at L5 before
  L6 consideration) prevents rocket promotions that fail at the
  next level
- **Down-leveling is rare but exists** — sometimes a promotion
  doesn't stick; honest organisations have a path to acknowledge
  this

### The Performance Improvement Plan (PIP)

The most legally-loaded and culturally-toxic surface of
performance management. A PIP is a formal, documented program to
help a struggling employee return to acceptable performance —
or, if they don't, to provide documented basis for termination.

Done well, a PIP is:

- **Specific** — names exact behaviours / outputs that must change
- **Measurable** — clear success criteria
- **Time-bound** — typically 30-90 days
- **Supported** — manager commits to specific coaching, training,
  resources
- **Honest** — both parties know that the PIP is the off-ramp
  before exit; pretending otherwise is corrosive
- **Documented** — every check-in is recorded; the paper trail
  exists for legal defense
- **Equitable** — PIPs are issued consistently across demographic
  groups; uneven issuance is a legal red flag

Done badly, a PIP is:

- Used as a paperwork formality before a pre-decided termination
  (a "managed exit" disguised as a development opportunity) —
  ethically dubious + legally exposed
- Sprung without prior feedback ("I had no idea I was struggling")
- Without manager support — set up to fail
- Used selectively on certain demographics (legal risk)

The honest "let's part ways" conversation is often kinder than a
months-long PIP both parties know will fail. When the answer is
"this isn't going to work", supportive exit (severance, transition
help, reference) often beats forcing the process.

### 360 Feedback

Multi-source feedback — peer, direct-report, cross-functional,
self — adds dimensions that direct manager feedback can't reach.
Useful for senior IC + manager development. Cautions:

- Anonymous 360 feedback can become weaponised (especially when
  combined with comp / promotion impact)
- Survey fatigue is real — limit cadence
- Pure 360 is for development; tying 360 to comp / promotion
  changes the incentives + dynamics

### Compensation Philosophy

Compensation is the loudest signal the system sends about what's
valued. Patterns:

| Approach | Trade-off |
| --- | --- |
| **Pay for performance** (variable comp tied to ratings) | Strong differentiation; sandbagging + political behaviour |
| **Pay for role** (band by role/level; minimal variable) | Stable, transparent; less individual upside |
| **Pay for skills** (skills matrix drives band) | Encourages growth; complex to administer |
| **Profit share / equity** | Aligns to outcomes; volatile |
| **Combination** | Most large orgs |

Whatever approach, transparency about the philosophy + bands
reduces anxiety and increases trust. Opacity feeds suspicion.
