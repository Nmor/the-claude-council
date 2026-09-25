# supply-chain-patterns: Core Patterns

> Covers **Core Patterns** for the `supply-chain-patterns` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 12 KB** — `token-budget.mjs --check`.

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
  - safety stock
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
