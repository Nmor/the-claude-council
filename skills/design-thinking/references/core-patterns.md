# design-thinking: Core Patterns

> Covers **Core Patterns** for the `design-thinking` skill. Routed from the reference map in `../SKILL.md`.
>
> **Size budget: 12 KB** — `token-budget.mjs --check`.

## Core Patterns

### The five modes (Stanford d.school)

| Mode | Purpose | Key activities |
| --- | --- | --- |
| **Empathize** | Understand the people you're designing for | Interviews, ethnography, shadowing, user diaries, journey mapping |
| **Define** | Frame an actionable problem statement | Point-of-View statement, How Might We (HMW) questions, jobs-to-be-done, problem framing |
| **Ideate** | Generate a wide range of solutions | Brainstorming, sketching, lateral thinking, analogies, SCAMPER |
| **Prototype** | Make ideas tangible | Paper, wireframes, role-play, code spikes, Wizard-of-Oz, service blueprints |
| **Test** | Learn from real users | Usability tests, concept tests, field pilots, A/B tests |

The modes are NOT a linear waterfall. Mature practice
iterates non-linearly — testing surfaces empathy gaps;
ideation surfaces framing problems; prototyping surfaces
ideation gaps.

### Other process models (largely compatible)

- **IDEO's three-phase Inspiration / Ideation / Implementation**
- **Double Diamond** (UK Design Council 2005, refreshed
  2019): Discover / Define / Develop / Deliver — alternating
  divergent + convergent phases
- **Darden's four-question model**: What is? / What if? /
  What wows? / What works?

All share the same DNA: divergent + convergent thinking
alternating, user-centred research informing problem framing,
multiple solutions prototyped + tested before committing.

### Empathy — done properly

This is the most-faked phase. Cheap design thinking
substitutes "personas synthesized from sales data" for actual
user research. Real empathy requires:

- **Field research** — observe in context (not in conference
  rooms)
- **Open-ended interviews** — semi-structured at most;
  follow the user's narrative
- **Ride-alongs / shadowing** — observe actions, not just
  answers
- **Diary studies** — capture in-context behaviour over time
- **Co-creation sessions** — users participating in design,
  not just being researched
- **Extreme users + edge cases** — design for the extremes
  to serve the mainstream
- **Stakeholder mapping** — multiple constituencies' needs
- **Cultural probes** (Gaver, Dunne, Pacenti 1999) — when
  direct observation is too obtrusive

Sample sizes: 5-30 users is typical for qualitative empathy
work. The point isn't statistical generalization (that's
UX research's job — see [[ux-research]]); it's depth of
understanding sufficient to frame the problem.

### Problem framing

After empathy, before ideation. The Point-of-View statement:

> [User] needs [need] because [insight]

Done well, it forces:

- Specificity about who you're designing for
- Articulation of unmet need (not feature request)
- Causal insight ("because") that justifies the need

Then convert POV to How Might We (HMW) questions:

> How might we [enable / improve / create] [outcome] for
> [user] in [context]?

The HMW form is generative: it implies multiple solutions exist
and invites ideation. Bad HMWs are too narrow (constrain the
answer) or too broad (don't focus thinking).

The discipline: a great HMW question is the most leveraged
output of design thinking. Wrong question, right answer
remains wrong.

### Jobs-to-be-Done (JTBD)

Clayton Christensen's complementary frame (*Competing Against
Luck* 2016): customers "hire" products to do a "job":

- **Functional job** — the task they're trying to complete
- **Emotional job** — how they want to feel
- **Social job** — how they want to be perceived

JTBD asks: what circumstances cause the user to "hire" this
solution? What would they "fire" it for? What are they
"hiring" now (often a non-obvious competitor or workaround)?

JTBD and personas are complementary — personas describe
people; JTBD describes situations.

### Ideation — the divergent phase

Brainstorming rules (Osborn 1953, refined endlessly since):

- Defer judgment
- Encourage wild ideas
- Build on the ideas of others
- Stay focused on the topic
- One conversation at a time
- Be visual
- Go for quantity (target: 100+ ideas in 60 minutes)

Techniques to escape obvious answers:

- **Worst-possible-idea** — frees creativity; sometimes
  produces good ideas inverted
- **SCAMPER** — Substitute / Combine / Adapt / Modify-
  Magnify-Minify / Put to other use / Eliminate / Reverse
- **Analogies + biomimicry** — how does nature solve this?
  how do other industries solve a structurally similar
  problem?
- **Constraints inversion** — what if we had 10x the budget?
  10% of it?
- **Reframing the user** — what would a kid do? a
  grandmother? a thief? an alien?

After ideation, convergence: dot-voting, criteria matrix,
NUF (Novel / Useful / Feasible), 2x2 prioritization. The
shift from divergent to convergent is decisive — without it,
ideation produces volume without direction.

### Prototyping — make to think

The point of a prototype is to surface what you don't know,
fast and cheap. Fidelity matches the question:

| Fidelity | Use when |
| --- | --- |
| **Paper / sketches** | Concept clarity, basic flow |
| **Wireframes / clickable** | Information architecture, navigation |
| **Storyboards / role-play** | Service interactions, multi-actor flows |
| **Wizard of Oz** | Test value proposition before building backend |
| **Lookalike prototype (visual high-fi, fake behaviour)** | Desirability testing |
| **Functional prototype (code spike)** | Technical feasibility |
| **MVP (per Lean Startup)** | Real user behaviour, market signal |
| **Pilot in market** | Operational learning |

The trap: jumping to high fidelity too soon. A polished
wireframe is harder to change than a sketch and triggers
"approval mode" instead of "exploration mode." Match
fidelity to question.

### Testing — honest signal

Testing should DISCONFIRM hypotheses, not validate them.
Common patterns:

- **Concept testing** — 5-8 users react to lookalike concept
  - describe what they think it does + would they use it
- **Usability testing** — 5-8 users attempt tasks; observe
  - record (Nielsen's "5 users find 80% of issues" — see
  [[ux-research]] for the rigorous version of this claim)
- **Comparative testing** — show variants side by side
- **Field pilots** — deploy to a real subset of users +
  observe + interview
- **Diary studies** — week+ of in-context use

The discipline: test against the riskiest assumptions
first. If desirability is the risk, test desirability before
building anything. If feasibility is the risk, build a code
spike before testing desirability.

### The double diamond — alternating divergence + convergence

```text
Discover (diverge) → Define (converge) → Develop (diverge) → Deliver (converge)
```

This shape — wide then narrow, twice — is the rhythm of all
design thinking processes. Teams that converge too quickly
solve the wrong problem; teams that never converge produce
volume without commitment.

### Wicked problems

Rittel + Webber 1973 — characteristics:

- No definitive formulation
- No stopping rule (no obvious "done")
- Solutions are not true/false but good/bad
- No immediate or ultimate test of solution
- Every solution is a "one-shot operation" — no chance to learn
  via trial and error without consequence
- No exhaustive list of admissible solutions

Climate change, homelessness, healthcare reform are textbook
wicked. Design thinking is not a solution for wicked problems
but a more honest engagement with them than pretending they
can be planned.

### Innovation portfolio + horizons

Not every effort needs design thinking. McKinsey's Three
Horizons framing:

| Horizon | Time | Focus | Process |
| --- | --- | --- | --- |
| **H1** | Now | Defending + extending core business | Lean + Six Sigma |
| **H2** | 18-36 months | Emerging adjacencies | Lean Startup + agile |
| **H3** | 3-10 years | Future bets, breakthrough | Design thinking + corporate venturing |

Design thinking pays the highest dividend for H2 + H3 work
where the problem isn't well-defined and the user need is
uncertain.

### Combination with other methods

- **Design thinking + Lean Startup** — DT frames the problem
  - opportunity; LS validates the business model via
  build/measure/learn (see [[lean-startup]])
- **Design thinking + Agile** — DT discovers what to build;
  Agile builds it iteratively
- **Design thinking + Strategy** — Roger Martin's strategy
  choice cascade integrates with DT
- **Design thinking + Service design** — service design is
  DT applied to multi-touchpoint experiences
- **Design thinking + TRIZ** — TRIZ contributes structured
  contradiction-resolution to ideation (see [[triz-patterns]])
- **Design thinking + Systems thinking** — for wicked
  problems where intervention points must be chosen wisely

### Common artefacts

- **Empathy map** — what users say / do / think / feel
- **Journey map** — stages of an experience over time, with
  pain points + opportunities
- **Service blueprint** — journey map + front-stage
  interactions + back-stage processes + supporting systems
- **Persona** — synthesized user archetype (with care
  re: stereotyping risk)
- **Storyboard** — scenes showing the user experience
- **Concept poster / pitch** — one-page statement of the
  idea, its rationale, its key features
- **Affinity diagram** — observations grouped + labelled
- **2x2 matrix** — for prioritization / segmentation
- **System map** — actors + flows in a complex situation
