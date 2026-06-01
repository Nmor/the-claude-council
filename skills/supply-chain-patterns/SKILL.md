---
name: supply-chain-patterns
description: End-to-end orchestration of materials, information, and money across suppliers, manufacturers, distributors, and customers — SCOR model (Plan / Source / Make / Deliver / Return / Enable), demand sensing, S&OP, inventory positioning (safety stock, MOQ, EOQ), supplier risk management, resilience design (dual-sourcing, near-shoring, buffers), Incoterms 2020, customs + trade compliance. Sister to lean-manufacturing (in-house flow).
---

# Supply Chain Patterns

> Design and operate the end-to-end flow of materials,
> information, and money across suppliers, manufacturers,
> distributors, and customers so the right thing arrives at the
> right place at the right time at the right cost — even when
> a tsunami, a chip shortage, or a sanctions order hits.

## Purpose

Supply chain management is the discipline of orchestrating
flows across organizations that don't share a boss. The work
involves planning (what to make / buy / move when), sourcing
(who supplies what), making (production strategy), delivering
(logistics + distribution), returning (reverse logistics +
warranty), and enabling (technology + data + people +
governance) — all simultaneously, all with cost / service /
risk / sustainability trade-offs.

This skill covers the principal-level patterns: how to apply
the SCOR reference model, how to design inventory policies
that don't accumulate either stock-outs or warehouses full of
unsellable inventory, how to assess and manage supplier risk,
how to choose between push and pull replenishment, how to
think about resilience after a decade in which supply chains
have repeatedly failed publicly (COVID, Suez Canal, semiconductor
shortage, geopolitical decoupling, climate disruption).

This skill does NOT cover deep operations research (linear
programming for vehicle routing, queueing theory for warehouses)
— those are specialist domains. It frames the decisions that
specialists then optimize.

## Standards Cited

- **APICS / ASCM body of knowledge** — CPIM (Certified in
  Planning and Inventory Management) and CSCP (Certified Supply
  Chain Professional) syllabi, the canonical practitioner
  references.
- **Supply Chain Operations Reference (SCOR) model** — ASCM/
  APICS process reference model: Plan / Source / Make / Deliver
  / Return / Enable.
- **ISO 28000:2022** — Security and resilience — Security
  management systems for the supply chain.
- **ISO 22301:2019** — Security and resilience — Business
  continuity management systems.
- **ISO 31000:2018** — Risk management.
- **Sunil Chopra + Peter Meindl, *Supply Chain Management:
  Strategy, Planning and Operation*** (7th ed 2019) — the
  canonical academic / practitioner text.
- **Hau Lee, *The Triple-A Supply Chain*** (HBR 2004) —
  Agility, Adaptability, Alignment.
- **Marshall Fisher, *What Is the Right Supply Chain for Your
  Product?*** (HBR 1997) — functional vs innovative products,
  efficient vs responsive supply chains.
- **Yossi Sheffi, *The Resilient Enterprise*** (2005) and *The
  Power of Resilience* (2015) — supply chain risk + resilience.
- **CIPS Procurement and Supply Cycle** — Chartered Institute
  of Procurement and Supply body of knowledge.
- **Incoterms 2020** (ICC) — the 11 trade terms governing
  cost / risk / responsibility transfer between buyer + seller.
- **UN/CEFACT** — trade facilitation standards.
- **US CISA Supply Chain Risk Management** + **NIST SP 800-161
  Rev. 1** (2022) — Cybersecurity Supply Chain Risk Management
  Practices.

## When to Fire

This skill engages when work involves:

- Supplier selection, qualification, or risk assessment
- Inventory policy design (ROP, EOQ, safety stock, MOQ, ABC
  classification)
- Demand forecasting (statistical, judgmental, machine learning,
  collaborative)
- S&OP / IBP (Sales + Operations Planning / Integrated Business
  Planning) processes
- Push vs pull replenishment decisions
- Make-to-stock vs make-to-order vs assemble-to-order vs
  engineer-to-order strategy
- Distribution network design (number / location of warehouses,
  hub-and-spoke vs point-to-point)
- Logistics provider (3PL / 4PL) selection
- Lead-time + cycle-time analysis
- Bullwhip effect diagnosis
- Reverse logistics + returns processing
- Trade compliance (export control, customs, sanctions, tariffs,
  origin rules)
- Procurement strategy (single / dual / multi sourcing; spot vs
  contract; vertical integration vs outsourcing)
- Supply chain risk management (geopolitical, financial,
  operational, cyber, climate, reputational)
- Supply chain transparency + traceability (food, pharma,
  conflict minerals, forced labor)
- Sustainability + scope-3 emissions in the supply chain
- Last-mile delivery design
- Cold chain (temperature-controlled logistics)

It does NOT engage when the question is about software
deployment pipelines — those use the word "supply chain"
metaphorically; this skill is about physical / material supply
chains. (The sister `dependency-vulnerabilities` rule covers
software supply chain security.)

## Core Patterns

### The SCOR model — six top-level processes

The standard reference framework decomposes supply chain into:

| Process | Activities |
| --- | --- |
| **Plan** | Demand forecasting, supply planning, S&OP, capacity planning, inventory targeting |
| **Source** | Supplier selection, sourcing strategy, procurement, receiving, supplier performance management |
| **Make** | Production scheduling, manufacturing execution, quality control, packaging |
| **Deliver** | Order management, warehousing, transportation, distribution, customer delivery |
| **Return** | Returns authorization, reverse logistics, warranty, recycling, disposal |
| **Enable** | Strategy, performance management, data, talent, technology, risk, regulatory |

Practitioners use SCOR for benchmarking + process design. The
model goes 4-5 levels deep with standard metrics at each level
(perfect order fulfillment, cash-to-cash cycle time, supply
chain costs).

### Fisher's framework — match supply chain to product type

Marshall Fisher's 1997 framework remains the strategic anchor:

| Product type | Demand characteristics | Right supply chain |
| --- | --- | --- |
| **Functional** (commodity, predictable demand, long PLC, low margin) | Stable | **Efficient** — low cost, high utilization, push, optimize for cost |
| **Innovative** (fashion, tech, short PLC, high margin, volatile demand) | Volatile | **Responsive** — flexible, fast, pull, optimize for service |

The misalignment failure: running an efficient supply chain for
an innovative product (lost sales + obsolete inventory) or a
responsive supply chain for a functional product (excess cost
with no service benefit).

### Hau Lee's Triple-A — for the long term

Beyond efficiency, supply chains need:

- **Agility** — respond to short-term demand / supply changes;
  buffer / postpone / dual-source / share information
- **Adaptability** — restructure over time as markets, products,
  technologies evolve; willingness to migrate
- **Alignment** — incentives aligned across partners; everyone
  benefits from system-wide optimization

All three matter; companies that focus only on cost achieve
short-term efficiency at the cost of long-term competitiveness.

### Demand forecasting — multiple methods, combine

| Method | When |
| --- | --- |
| **Naïve / simple average** | Stable demand, low value |
| **Moving average, exponential smoothing, Holt-Winters** | Stable + seasonal trends |
| **Causal models (regression, econometric)** | When external drivers are known + measurable |
| **ARIMA / state-space** | When time-series structure is rich |
| **Machine learning (gradient boosting, neural)** | High-dimensional, large data |
| **Judgmental + Delphi** | New product, no history |
| **Collaborative forecasting (CPFR)** | Major customers willing to share forecasts |

Best practice: combine forecasts (ensemble); track forecast
accuracy (MAPE, WMAPE, bias); separate baseline from promotion /
event uplift. Forecast accuracy is the constraint on inventory
levels; better forecasts allow lower safety stock.

### Inventory policy fundamentals

The core trade-off: holding cost (capital, storage, obsolescence,
shrinkage) vs shortage cost (lost sales, expediting, customer
churn).

Key formulas + concepts:

- **EOQ (Economic Order Quantity)** = √(2DS/H) where D = annual
  demand, S = order cost, H = holding cost per unit per year
- **Reorder Point (ROP)** = (average demand during lead time)
  + safety stock
- **Safety stock** = z × σ_LT × √L where z = service-level
  z-score, σ_LT = std-dev of demand during lead time, L = lead
  time. (More complex when both demand + lead time are variable.)
- **Cycle service level** vs **fill rate** — the distinction
  matters; fill rate is what customers experience
- **ABC analysis** — Pareto classification, A items get tight
  control, C items get loose control

Service levels mature from 90% (loose) to 99.5%+ (premium /
medical / aerospace). Each step up requires geometrically more
safety stock; specifying the right level by item segment is
the core inventory design decision.

### Push vs pull

- **Push** — produce based on forecast, deliver to inventory,
  customer pulls from inventory
- **Pull** — produce only when actual demand signals (kanban,
  customer order)

Most real supply chains are **push-pull**: push to a decoupling
point (e.g., assemble-to-order: components pushed to assembly
buffer; assembly pulled by orders). The decoupling point design
is strategic.

Make-to-stock / make-to-order / assemble-to-order / engineer-to-
order is the same dimension viewed from manufacturing:

| Strategy | Decoupling point | Customer wait | Forecast risk |
| --- | --- | --- | --- |
| Make-to-stock (MTS) | Finished goods | Shortest | All finished SKUs |
| Assemble-to-order (ATO) | Component | Medium | Components only |
| Make-to-order (MTO) | Raw material | Long | Raw materials |
| Engineer-to-order (ETO) | Design | Longest | None at SKU level |

### The bullwhip effect

Demand variability amplifies up the supply chain — small changes
at retail cause big swings at manufacturers. Drivers:
- Demand forecasting based on orders rather than end-customer
  sell-through
- Lead-time variability
- Batch ordering (EOQ-induced)
- Price fluctuations (promotional buying)
- Rationing + shortage gaming

Mitigations: information sharing (POS data, VMI), reduce lead
times, smaller order batches, everyday low pricing, allocation
rules in shortages.

### S&OP / IBP — the planning rhythm

Sales + Operations Planning is the monthly cross-functional
process that aligns demand, supply, inventory, and financial
plans. Integrated Business Planning (IBP) is the evolution:
adding strategy, finance, product, and scenario planning.

Mature S&OP / IBP includes:
- Product / portfolio review
- Demand review (consensus forecast)
- Supply review (capacity, materials, constraints)
- Reconciliation (gaps, options, scenarios)
- Executive S&OP (decisions, escalations, financial
  validation)

The output is one set of numbers that finance, sales,
operations, and supply all work to.

### Supplier strategy

Strategic decisions per category:

- **Number of suppliers** — single (deepest partnership but
  highest risk), dual (most common, balance), multi (commodity)
- **Sourcing geography** — local / regional / global; near-
  shore vs off-shore
- **Contract structure** — spot, fixed-price, cost-plus,
  vested, partnership / JV, vertical integration
- **Supplier development** — invest in supplier capability or
  switch
- **Risk-managed sourcing** — diversification across geographies
  /currencies / regulatory regimes

The Kraljic Portfolio Matrix segments by supply risk × profit
impact:

| Category | Strategy |
| --- | --- |
| **Leverage** (low risk, high impact) | Exploit power; aggressive negotiation; multi-source |
| **Strategic** (high risk, high impact) | Long-term partnership; joint development |
| **Bottleneck** (high risk, low impact) | Secure supply; redundancy; substitution |
| **Routine** (low risk, low impact) | Efficient transactions; e-procurement |

### Logistics

Modes of transport with different cost / speed / capacity:

| Mode | Cost | Speed | Use |
| --- | --- | --- | --- |
| **Ocean** | Lowest | Slowest (weeks) | High-volume / non-urgent / global |
| **Rail** | Low | Slow (days) | Long-haul domestic, bulk |
| **Trucking** | Medium | Medium (days) | Last-mile + regional |
| **Air** | Highest | Fastest (hours-days) | High-value / urgent |
| **Pipeline** | Low | Continuous | Liquids + gases |
| **Parcel** | Per-unit high | Fast | E-commerce, small parcels |

Incoterms 2020 governs cost + risk transfer:
- EXW (Ex Works) — buyer takes all risk + cost from seller's
  premises
- FCA / FOB — risk transfers at named place
- CIF / CIP — seller pays freight + insurance to named place
- DDP — seller delivers door-to-door with duties paid
- 7 others in between

### Risk management

Supply chain risks categorized:

| Category | Examples |
| --- | --- |
| **Operational** | Supplier failure, quality, lead-time variability |
| **Financial** | FX, commodity prices, supplier bankruptcy |
| **Geopolitical** | Sanctions, tariffs, war, export controls |
| **Climate / natural** | Hurricane, flood, earthquake, drought |
| **Cyber** | Supplier ransomware, IP theft, integrity attacks |
| **Reputational** | Forced labor, child labor, environmental damage exposed |
| **Regulatory** | New environmental, safety, transparency rules |

Resilience strategies:

- **Redundancy** — multiple suppliers, multiple sites
- **Flexibility** — multipurpose facilities, agile workforce
- **Visibility** — multi-tier supplier mapping
- **Risk pooling** — centralization, postponement, common
  components
- **Collaboration** — joint planning, joint risk management
- **Stress-testing** — scenarios, war games

### Sustainability + ESG

Increasingly material:

- **Scope 3 emissions** typically dominate corporate footprint
  (60-90% for most companies)
- **Forced labor + modern slavery** (UK Modern Slavery Act, US
  UFLPA) require supplier transparency
- **Conflict minerals** (Dodd-Frank §1502, EU 2017/821)
- **Deforestation** (EUDR 2024)
- **Reusable + recycled content** (Circular Economy regulations)

Engineering side: supplier ESG data collection, traceability
systems (blockchain for high-stakes domains), substance
declaration platforms.

## Anti-Patterns

### Single-sourcing critical components for cost only

The Toyota brake pedal recall, the Renesas semiconductor fire,
the Suez Canal grounding — each demonstrated that single sourcing
optimized for cost creates catastrophic exposure. The fix isn't
always dual-sourcing (sometimes uneconomical); it's deliberate
risk acceptance with mitigations (safety stock, qualified
backups, scenario plans).

### Forecast as commitment

When forecasts are treated as commitments (or used to set sales
targets), forecasters game them. The supply chain runs on biased
data. Cure: separate forecast (best estimate) from plan (what
we'll do) from target (commitment); reward forecast accuracy
separately from sales performance.

### Optimizing locally, suboptimizing globally

Procurement optimizes purchase price; manufacturing optimizes
utilization; logistics optimizes truck fill — each locally
optimal, all jointly suboptimal. S&OP/IBP exists exactly to
correct this; without it, the silos win.

### "Just-in-time" without supplier capability

Pure JIT with zero inventory only works when suppliers are
short-lead-time + highly reliable. Globalized JIT in fragile
chains is "just-in-trouble." Post-COVID, many companies are
re-shoring or near-shoring + adding strategic buffer inventory.

### Ignoring tail risk

Supply chain planning often assumes Gaussian distributions for
demand + supply. Real distributions have fat tails. Once-per-
decade events happen more often than that.

### "Outsource everything except core"

A decade of aggressive outsourcing produced firms that couldn't
deliver during disruptions because they no longer owned the
capability. The pendulum swings; vertical integration of strategic
capabilities is back in some sectors (battery cells, advanced
semis).

### Procurement reports cost savings; supply chain pays the price

Claimed procurement savings often shift cost to other functions
(quality issues, expediting, customer impact). The savings are
real only when total landed cost + service impact + risk is
audited. Hence the rise of total cost of ownership (TCO) and
should-cost modelling.

### Transparency programs that gather data and do nothing

Tier-1 supplier ESG questionnaires that no one acts on are
paperwork. Real transparency programs lead to supplier development,
substitution, or de-listing.

### "Risk register" with no owners

Risks identified but not assigned to an accountable owner with
mitigation budget produce false comfort. The discipline: every
material risk has a single accountable owner, a mitigation plan,
a trigger that activates the plan, and review cadence.

### Ignoring reverse logistics

Returns, warranty, recycling, end-of-life — often handled as an
afterthought, costing 5-20% of supply chain spend. Proper design
of reverse logistics is increasingly mandatory (Extended Producer
Responsibility regulations, right-to-repair).

## Verification Checklist

For a supply chain capability or initiative:

- [ ] Product is classified (functional / innovative; commodity
      / differentiator) and supply chain is aligned to type.
- [ ] Demand forecast accuracy is measured (MAPE, bias) per item
      / customer / location.
- [ ] Inventory policy by item: service level target, ROP,
      safety stock formula, review cadence.
- [ ] S&OP / IBP runs monthly with cross-functional participation
      and outputs one shared plan.
- [ ] Suppliers segmented per Kraljic matrix; strategy per segment.
- [ ] Multi-tier supplier visibility for critical components
      (not just tier 1).
- [ ] Risk register with owners, mitigations, triggers.
- [ ] Resilience tested via scenario / war game in the last 12
      months.
- [ ] Total landed cost / TCO model used for major sourcing
      decisions, not just purchase price.
- [ ] Forecast accuracy + inventory turns + service level +
      cash-to-cash cycle time on the operations dashboard.
- [ ] Incoterms specified on every cross-border order.
- [ ] Sanctions + export-control screening at supplier onboarding
      and at order time.
- [ ] Reverse logistics process defined with metrics.
- [ ] Scope 3 emissions measured and reduction targets set.

## Cross-References

- [[lean-manufacturing]] — JIT depends on supplier capability;
  supplier development is part of TPS
- [[six-sigma]] — supplier process capability + measurement
  systems
- [[dependency-vulnerabilities]] — software supply chain (the
  metaphor; this skill is physical / material supply chain)
- [[esg-reviewer]] (agent) — supply chain emissions + forced
  labor + biodiversity
- [[risk-reviewer]] (agent) — supply chain risk classes
- [[finance-reviewer]] (agent) — TCO, working capital
- [[performance-management]] — supplier scorecards; supply
  chain team metrics
- [[org-design]] — supply chain function placement (CSCO
  reporting to CEO, COO, or CFO)
- [[compliance-reviewer]] (agent) — trade compliance, ESG
  regulation

## Why This Skill Exists

The 2020-2025 period was the largest stress test of modern
supply chains in 80 years. COVID-19, the Suez Canal blockage,
the semiconductor shortage, Russia's invasion of Ukraine,
Houthi attacks on Red Sea shipping, climate-driven port
closures — each exposed assumptions that had been quietly held
for decades:

- Just-in-time + lean inventory was always the right answer
- Globalization would continue to deepen
- Tail risks were too rare to plan for
- Single-source was acceptable if cheapest
- Tier-1 supplier visibility was sufficient
- Trade routes were free-flowing public goods

All of those assumptions are now actively in question.
Companies that had only embraced cost-efficient supply chains
saw revenue lost, customers churned, and reputations damaged.
Companies with resilience built in — through redundancy, regional
manufacturing, multi-tier visibility, buffer inventory, scenario
planning — recovered faster and emerged stronger.

The work going forward is balancing efficiency and resilience;
the right answer is not "build maximum inventory everywhere" or
"return to all-JIT." It's segmenting decisions per product
category, per geography, per risk class, and per strategic
priority — exactly the discipline this skill exists to support.

The cost of getting it wrong: stock-outs cost retail an
estimated $1.75T/year globally (IHL Group). The cost of
excess inventory: 25-35% of carrying cost per year. The cost
of major disruption: companies report 6-9 months of lost
revenue, brand damage, and customer churn. Principal-level
supply chain decisions are among the highest-stakes choices a
company makes; they deserve principal-level frameworks.

## Standards Cited

- **ISO 9001:2015 + 2026 revision** — Quality management systems
  (process approach, risk-based thinking, leadership)
- **ISO 9004:2018** — Quality management — quality of an
  organization (sustained success)
- **ISO 31000:2018** — Risk management guidelines
- **ISO 14001:2015** — Environmental management
- **ISO 45001:2018** — Occupational health and safety
- **ASQ Body of Knowledge — Six Sigma Black Belt** — DMAIC, DMADV,
  SIPOC, Cp/Cpk, DOE, control charts
- **APICS CPIM / CSCP Body of Knowledge** — Supply chain operations
  reference, S&OP, demand planning, SCOR model
- **PMBOK Guide 7th Edition + PMI Standard for Project
  Management** — Project + portfolio + program management
- **Lean Enterprise Institute — Toyota Production System** — JIT,
  jidoka, kanban, kaizen, value-stream mapping, takt time
- **Eurocode 0/1/2/3 + AISC 360 + ACI 318** — Structural
  engineering basis (when civil / structural scope)
- **ASHRAE Handbook + ISO 19650 (BIM)** — Building services + MEP
  + digital coordination (when AEC scope)
- **TRIZ — Altshuller's 40 Inventive Principles + Contradiction
  Matrix** — Systematic innovation methodology
- **Stanford d.school + IDEO Field Guide** — Design thinking
  process (Empathise / Define / Ideate / Prototype / Test)
- **The Lean Startup (Ries 2011) + Customer Development (Blank)** —
  Build-measure-learn loop, MVP taxonomy, pivot types
- **Team Topologies (Skelton + Pais 2019)** — Stream-aligned /
  platform / enabling / complicated-subsystem teams + interaction
  modes
- **OKRs — Measure What Matters (Doerr 2018)** + **Andy Grove's
  HPM** — Objectives + Key Results, CFR, stretch goals
- **The Five Dysfunctions of a Team (Lencioni)** + **High Output
  Management (Grove)** — People + culture frameworks
- **Getting to Yes (Fisher + Ury) + Never Split the Difference
  (Voss)** — Negotiation: BATNA / ZOPA / tactical empathy


### Cross-cutting engineering standards

- **ISO/IEC/IEEE 12207:2017** — Software life cycle processes
  (process-engineering applies to software-delivery workflows)
- **ISO/IEC 25010:2011 §6** — Quality model (process maturity
  feeds product quality characteristics)
- **ISO/IEC 33001:2015** — Process assessment concepts +
  vocabulary (foundation for SPICE / Automotive SPICE)
- **ISO/IEC 33020:2019** — Process measurement framework for
  process capability assessment
- **NIST SP 800-160 Vol 1 Rev 1 + Vol 2 Rev 1** — Engineering
  trustworthy secure systems + cyber resiliency
- **NIST SP 800-218 SSDF §PO** — Prepare the organization
  (process governance + role definitions)
- **NIST SP 800-53 Rev 5 §PM** — Program management controls
  (apply to any organisational process)
- **OWASP SAMM v2** — Software Assurance Maturity Model
  (process-maturity assessment framework)
- **CWE-1059** — Insufficient technical documentation (process
  workflows MUST be documented)


## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- S&OP cycle not run monthly (demand-supply alignment drift)
- Demand forecast accuracy (MAPE) > 30% sustained (poor signal quality)
- Bullwhip effect observed (variance amplifying upstream) without dampening
- Single-source dependency on tier-1+ supplier (geopolitical / disaster SPOF)
- Safety stock formula not updated when lead time / variability changes
- ABC / XYZ classification stale > 12 months
- Inventory turns degrading quarter-over-quarter
- Order-promising commits without ATP / CTP check
- Supplier scorecard reviewed annually instead of quarterly
- SCOR model metrics not benchmarked against peer set
- Sustainability / scope-3 emissions not tracked in supplier evaluation (per `~/.claude/rules/common/audit-logging.md`)

**Refinement candidates**:
- New supply-chain risk row when a new disruption class emerges (e.g., cyber attack on logistics)
- New cross-reference when a sister skill (lean-manufacturing, six-sigma, esg-reviewer) adds a SC gate
- Tightening of the dual-source policy when SPOF incident recurs
- New S&OP template row when a new demand pattern emerges
