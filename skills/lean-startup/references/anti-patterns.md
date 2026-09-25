# Lean Startup — Anti-Patterns

> All thirteen anti-patterns and the correction for each — MVP-as-buggy-v1,
> vanity metrics, unfounded pivots, the Build Trap, wrong-problem-class
> misuse, and the rest. Pointed at by the **Anti-Patterns** row of the
> SKILL.md reference map.
>
> **Size budget: 9 KB** — `token-budget.mjs --check`.

## Anti-Patterns

### Anti-Pattern 1: MVP = Buggy v1

Far and away the most damaging misreading. Building a feature-
rich product with no polish, calling it MVP, and shipping it
to production is neither minimum nor viable. The MVP is the
SMALLEST artifact that produces VALIDATED LEARNING. Often
that's a landing page or a manual workflow — no code at all.

**Correction**: ask "what is the riskiest assumption?" and
build the smallest experiment that tests it. If the riskiest
assumption is "people want this," a smoke test is sufficient.
If it's "the operations scale," a concierge MVP is right. Only
build software when you must.

### Anti-Pattern 2: Vanity Metrics Theatre

Reporting total users, total downloads, total revenue,
cumulative-anything, or PR-mention counts as proof of
progress. These numbers always go up (it's arithmetic) and
they hide whether the engine is healthy.

**Correction**: per-cohort retention curves, per-cohort LTV /
CAC, activation rate by source, time-to-first-value. If you
can't show a cohort table, you're flying blind.

### Anti-Pattern 3: Pivot Without Validated Learning

A pivot driven by founder frustration, board pressure, or
"I read about X startup pivoting last week" is not a pivot —
it's a restart. Each pivot must be **structured falsification**
of a specific hypothesis. Ries Ch 8: a pivot is "a structured
course correction designed to test a new fundamental hypothesis
about the product, strategy, and engine of growth."

**Correction**: at the pivot-or-persevere meeting, name the
specific assumption that was falsified, the evidence, and the
new hypothesis. If you can't, you're not pivoting — you're
throwing things at the wall.

### Anti-Pattern 4: Build-Measure-Learn Run Once Then Abandoned

Teams run ONE loop, get a result, then return to traditional
plan-and-execute mode. The loop's power is compounding — its
value is in **velocity**.

**Correction**: institutionalise the loop. Weekly customer
interviews. Bi-weekly experiment reviews. Monthly pivot-or-
persevere meetings. The cadence is the methodology.

### Anti-Pattern 5: "Lean = Cheap"

Conflating Lean Startup with cost-cutting or bootstrapping.
Lean Startup is about VELOCITY OF LEARNING, not capital
efficiency per se (though it usually correlates). A team can
be lean while spending millions on the right experiments.

**Correction**: measure learnings per dollar (or per week),
not dollars saved. If you're spending $10M on an experiment
that will produce a clear PMF signal in a quarter, that's
lean. If you're spending $100K on six months of "we'll see
what users do" with no hypothesis, that's waste regardless of
dollar count.

### Anti-Pattern 6: Lean Startup Without Customer Development

Treating Lean Startup as "build small things fast" without
the customer-discovery + customer-interview discipline. Ries
acknowledges Blank's Customer Development as the foundation
— skipping it produces motion without learning.

**Correction**: every sprint has at least 5 customer
conversations (interviews, observations, usability tests).
"Get out of the building" is a daily practice, not a kickoff
phase.

### Anti-Pattern 7: Build Trap (Perri 2018)

Measuring product team success by **features shipped** instead
of **outcomes achieved**. Roadmaps as feature lists. OKRs as
output metrics ("ship X by Q3") instead of outcome metrics
("increase activation 20%").

**Correction**: roadmap = strategy + outcomes, not features.
OKRs measure customer + business outcomes. Discovery findings
drive what to build, not the other way around.

### Anti-Pattern 8: Applying Lean Startup to Known Problems

When the customer is known, the willingness to pay is proven,
the technology is mature, and the constraint is **execution
speed**, Lean Startup is the wrong lens. Use Agile delivery +
Lean Manufacturing instead.

**Correction**: ask "what's our uncertainty?" High uncertainty
about customer + value → Lean Startup. High uncertainty about
execution path → traditional Agile / Lean delivery. Don't
build customer-discovery sprints into projects whose customer
is the procurement team that already signed the contract.

### Anti-Pattern 9: Pivot Fatigue

The team burns out from pivoting before validating each thesis
properly. Each pivot is treated as a fresh start; learnings
from the previous loop are abandoned. Ries warns explicitly:
"failure to pivot when needed is a problem; pivoting too soon
or for the wrong reasons is also a problem."

**Correction**: each pivot carries forward what was learned.
The team writes down: "we learned X about customer A and the
pivot is to test if X is also true for customer B." If every
pivot is "abandon everything and start fresh," the team isn't
running Lean Startup — they're just thrashing.

### Anti-Pattern 10: MVP-Then-Stop

Treating the MVP as the goal rather than the first iteration.
Shipping the MVP, observing it doesn't catch fire, and walking
away (or worse, scaling the marketing of a non-PMF MVP) is the
opposite of Lean.

**Correction**: the MVP is loop 1 of N. The expectation is
that loop 1 produces learnings to inform loop 2's MVP, which
informs loop 3's, etc. PMF emerges at the END of N loops, not
out of the first MVP.

### Anti-Pattern 11: Founder Gut Substituting for Validated Learning

"I just know users want this" or "I have a vision." Lean
Startup explicitly works against this — the founder's vision
is the **starting hypothesis**, not the truth. The truth is
what customers do.

**Correction**: the founder's job is to articulate hypotheses
clearly enough that they can be tested. The team's job is to
test them. The data's job is to falsify or validate. When
founder vision and data disagree, data wins until proven
otherwise.

### Anti-Pattern 12: OKRs as Output Tracking Theatre

Setting OKRs that count outputs (deploys, features, blog
posts) instead of outcomes (activations, retention, revenue
per cohort). This is the Build Trap dressed up in OKR
language. Cagan + Doerr both warn against it.

**Correction**: every Objective is a customer or business
outcome. Every Key Result is a measurable change in that
outcome. "Ship feature X" is never a KR. "Increase activation
of segment Y by Z%" is.

### Anti-Pattern 13: Wrong-Problem-Class Misuse

Trying to use Lean Startup for academic research, government
policy design, infrastructure-as-mature-engineering work
(building a bridge, deploying a known electrical system),
mature regulated industries with fixed compliance paths.
These are not extreme-uncertainty problems and Lean Startup's
methods produce ceremony without value.

**Correction**: classify the problem first. Lean Startup
applies when (a) the customer is uncertain, (b) the value is
uncertain, (c) the willingness to pay is uncertain. If any
of those is known, dial back the Lean Startup intensity.
