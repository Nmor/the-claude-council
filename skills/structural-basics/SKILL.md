---
name: structural-basics
description: Structural engineering literacy — loads (dead / live / wind / seismic / snow), materials (steel / concrete / timber / masonry), structural systems (frame / shear-wall / braced / shell / cable), and code regimes (Eurocode, AISC, ACI, IBC, NBCC). Activates on AEC + civil work to identify what's negotiable, what isn't, and where a licensed Structural Engineer of Record (SEOR) must own the call.
---

# Structural Engineering Basics

> Understand the loads, materials, structural systems, and code
> regimes that keep buildings standing — so that decisions
> involving structure are made with awareness of what's
> negotiable, what isn't, and where a licensed Structural
> Engineer of Record (SEOR) must own the call.

## Purpose

Structural engineering is the discipline that ensures
buildings, bridges, towers, and other constructed assets
resist gravity, wind, seismic, snow, and use loads without
collapsing, deforming excessively, or vibrating
uncomfortably — and continue doing so for their intended
service life.

This skill provides principal-level literacy in the
structural disciplines without claiming to design structures.
The audience is: project managers running construction,
architects collaborating with SEORs, software engineers
working on BIM / structural-analysis tooling, real estate
operators assessing capacity for tenant fit-out, sustainability
practitioners interrogating embodied carbon, and anyone making
decisions that touch loads + structure.

This skill explicitly does NOT replace a licensed Structural
Engineer of Record (SEOR). Any actual structural design,
analysis, or modification requires a licensed PE / CEng /
equivalent who stamps the calcs and accepts professional
liability. The role of this skill is to make sure the
conversation between non-structural stakeholders and the
SEOR is informed and the right questions get asked at the
right time.

## Standards Cited

- **International Building Code (IBC)** + International
  Existing Building Code (IEBC) — adopted as base code by
  most US jurisdictions.
- **ASCE/SEI 7-22** — Minimum Design Loads and Associated
  Criteria for Buildings and Other Structures (the dominant
  US load standard).
- **AISC 360-22** — Specification for Structural Steel
  Buildings.
- **AISC 341-22** — Seismic Provisions for Structural Steel
  Buildings.
- **ACI 318-19** — Building Code Requirements for Structural
  Concrete.
- **TMS 402/602** — Building Code Requirements and
  Specification for Masonry Structures.
- **AWC NDS 2024** — National Design Specification for Wood
  Construction.
- **Eurocodes EN 1990 – EN 1999** — the European structural
  design family (Basis of design, Actions, Concrete, Steel,
  Composite, Timber, Masonry, Geotechnical, Seismic, Aluminium).
- **ASCE 41-23** — Seismic Evaluation and Retrofit of
  Existing Buildings (the dominant US existing-building
  seismic standard).
- **FEMA P-58** — Seismic Performance Assessment of
  Buildings (probabilistic loss assessment).
- **ISO 23601 / ISO 23932-1** — fire safety engineering.
- **NIST National Construction Safety Team reports** (WTC,
  Joplin tornado, Hard Rock Hotel collapse, Champlain Towers
  South) — failure investigation reference.
- **NCHRP / AASHTO LRFD Bridge Design Specifications** (US
  bridges).

## When to Fire

This skill engages when work involves:

- Load path discussions (gravity, lateral, seismic, wind)
- Building structural systems (frames, walls, shells,
  membranes)
- Tenant fit-out feasibility (slab capacity, MEP penetrations
  through structure)
- Existing building due diligence + condition assessment
- Adaptive reuse / change of occupancy (which often triggers
  full structural upgrade)
- Seismic risk evaluation
- Vibration / serviceability concerns (floor vibration from
  HVAC, gym, MRI, sensitive equipment)
- Embodied carbon analysis of structures
- Construction phase issues — temporary works, shoring,
  formwork, sequencing
- Coordination with MEP (penetration locations, hung loads,
  vibration isolation) — see [[mep-coordination]]
- BIM / 3D-model interoperability with structural analysis
  software (Revit ↔ Tekla ↔ ETABS / SAP2000 / RAM /
  STAAD.Pro / Robot)
- Performance-based design discussions
- Forensic investigation / failure analysis
- Building information modelling (BIM) — LOD definitions
  affecting structural deliverables
- Permit + code review on a structural permit set
- Disputes between Architect / Owner / Contractor about
  structural responsibility

It does NOT engage for actual structural design work — that
requires a licensed SEOR with appropriate jurisdictional
authority.

## Core Patterns

### Loads — the inputs to design

Per ASCE 7 (or Eurocode 1), every structure must resist
combinations of:

| Load type | Description |
| --- | --- |
| **Dead (D)** | Self-weight of structure + permanent fixtures |
| **Live (L)** | Occupancy loads — people, furniture, movable equipment |
| **Roof live (Lr)** | Maintenance / installation loads on roof |
| **Snow (S)** | Site-specific, code-mapped, accounting for drifting and unbalanced |
| **Rain (R)** | Ponding loads — drainage failure scenarios |
| **Wind (W)** | Site + height + exposure category + topography |
| **Seismic (E)** | Site class + Risk Category + spectral acceleration |
| **Earth pressure (H)** | Retaining walls, basement walls |
| **Fluid pressure (F)** | Tanks, swimming pools, water tables |
| **Self-straining (T)** | Thermal, shrinkage, creep, settlement |
| **Flood (Fa)** | Hydrostatic + hydrodynamic + impact |

Load combinations (e.g., 1.2D + 1.6L + 0.5W) are specified
by code; they reflect the unlikely simultaneity of maximum
values. Strength design (LRFD in steel, USD in concrete)
uses factored loads + factored resistances; allowable stress
design (ASD) uses unfactored loads + allowable stresses.

### Load path — the discipline of "where does the load go"

Every applied load must follow a continuous path through
structural elements to the foundation:

| Load source | Travels through | Ends at |
| --- | --- | --- |
| Person on floor | Floor decking → joists → beams → girders → columns → foundations | Soil bearing |
| Lateral wind | Cladding → wall panels → diaphragm (floor / roof) → lateral system (shear walls, braced frames, moment frames) → foundations | Soil shear / overturning |
| Seismic inertia | Distributed mass → diaphragm → lateral system → foundation → soil | Soil-structure interaction |

A load path is a continuous, complete chain. A break in the
load path (missing connection, missing element, accidental
removal) is a structural failure mode. The architect's
"let's just remove this column" requires the SEOR to confirm
the redistributed load path works — and often it doesn't
without significant rework.

### Structural materials

| Material | Strengths | Weaknesses | Typical use |
| --- | --- | --- | --- |
| **Reinforced concrete** | Compression, fire, durability, mass damping | Tension (needs rebar), embodied carbon, schedule | Slabs, columns, walls, foundations |
| **Structural steel** | Strength, speed, ductility, recyclable | Fireproofing required, corrosion | Frames, long spans |
| **Engineered wood (glulam, CLT, LVL, PSL)** | Carbon storage, fast erection, lightweight | Moisture vulnerability, mid-rise limits | Mass timber construction (Type IV-A/B/C per IBC) |
| **Masonry (brick, CMU, stone)** | Compression, fire, durability | Tension (needs reinforcement), seismic ductility | Walls, low-rise, historic |
| **Aluminium** | Lightweight, corrosion-resistant | Cost, low elastic modulus, fatigue | Façades, lightweight structures |
| **Fibre-reinforced polymer (FRP)** | Strength-to-weight, corrosion | Cost, brittle, code maturity | Strengthening, niche |

Selection drivers: span, occupancy, height, cost, schedule,
embodied carbon, fire rating, seismicity, jurisdictional
practice, supply-chain availability.

### Structural systems — primary gravity + lateral

**Gravity systems** (carry vertical loads):

- **One-way slab + beam + girder + column** (concrete or
  steel) — flexible, ubiquitous
- **Two-way flat plate** (concrete) — uniform soffit; punching
  shear governs at columns
- **Waffle / coffered slab** — long spans, exposed soffit
- **Composite metal deck on steel** — fast, light, common
- **Mass timber + steel** — emerging mid-rise + high-rise
  category (Mjøstårnet, Ascent, Hyperion)
- **Joist + truss** — long-span roofs, gyms, warehouses

**Lateral systems** (resist wind + seismic):

- **Moment frames** — beam-column connections resist rotation
- **Braced frames** — diagonals carry lateral forces
- **Shear walls** — concrete or masonry; high stiffness
- **Dual systems** — combine moment frames + shear walls /
  braces for redundancy
- **Buckling-restrained braces (BRBs)** — modern seismic
  detail
- **Base isolation** — decouple structure from ground motion
- **Outriggers + belt trusses** — high-rise efficiency
- **Diagrid** — perimeter triangulated frame; iconic
  high-rise (Hearst Tower, Gherkin)

### Risk Categories + Importance Factors

ASCE 7 classifies buildings by occupancy:

| Risk Cat | Examples | Importance factor (Ie) |
| --- | --- | --- |
| I | Agricultural, minor storage | 1.0 |
| II | Most residential / commercial | 1.0 |
| III | Schools, assembly > 300 people, jails | 1.25 |
| IV | Hospitals, emergency response, fire, designated shelters | 1.5 |

Higher categories get higher seismic + wind loads. A hospital
is designed for ~50% more lateral load than a commercial
office.

### Performance-based design

Beyond code minimums, performance-based design (PBD) targets
explicit performance objectives:

| Performance level | Description |
| --- | --- |
| **Operational** | Service interruption < 24h; full functionality post-event |
| **Immediate Occupancy** | Re-occupiable; minor repair |
| **Life Safety** | Code minimum; structural damage but no collapse |
| **Collapse Prevention** | Severe damage; near-collapse but no catastrophic loss |

Hospitals + critical infrastructure aim for Operational under
Design Basis Earthquake (DBE) and Life Safety under Maximum
Considered Earthquake (MCE). FEMA P-58 quantifies financial +
human + downtime losses probabilistically.

### Serviceability — the underrated half

Strength prevents collapse; serviceability prevents the
building being unusable:

- **Deflection limits** — floors L/240, L/360, L/480 depending
  on supported elements; cantilevers L/180; sloped roofs
  L/240
- **Vibration** — natural frequency typically > 5-8 Hz for
  office floors; lower for sensitive uses; SCI P354 + AISC
  Design Guide 11 govern
- **Drift limits** — wind: H/400 to H/500 typical; seismic:
  drift ratios per ASCE 7 (e.g., 2% for Risk II)
- **Cracking** — concrete + masonry crack control
- **Comfort** — wind-induced acceleration < 10-15 milli-g for
  residential, 20-25 for commercial (Davenport / Isyumov
  criteria)

The owner's complaint at year 2 ("the floor bounces under
foot traffic") is a serviceability failure even though
nothing is structurally unsafe.

### Foundations

Three primary types:

- **Shallow** — spread footings, mat slabs, strip footings —
  used when competent soil is near surface
- **Deep** — driven piles, drilled shafts (caissons),
  micropiles, augercast — used when bearing strata are deep
- **Soil improvement** — densification, grouting, geopiers,
  vibro-replacement — used to upgrade marginal soils

Foundation type is dictated by the geotechnical engineer's
report — a separate licensed discipline. Site classes (A
through F per ASCE 7) drive seismic design; soft soils (Site
Class E + F) amplify ground motions and may require base
isolation or special detailing.

### Existing buildings + retrofit

Existing buildings present:

- **Documentation gaps** — original drawings may be
  unavailable, incorrect, or superseded by undocumented
  changes
- **Condition assessment** — visual + non-destructive (rebound
  hammer, UPV, GPR) + destructive (cores, coupons) testing
- **Material uncertainty** — concrete strength, rebar grade,
  weld quality
- **Code-vintage gaps** — older buildings may not meet current
  load + seismic standards

When occupancy changes (e.g., warehouse → office),
jurisdiction often triggers either Compliance Method A
(prescriptive upgrade) or Compliance Method B (performance
upgrade per ASCE 41). Surprise budget items include
foundation upgrades, lateral-system additions, and
fire-protection retrofits.

### Seismic — the most complex code chapter

Seismic provisions are the most complex part of structural
codes because earthquakes are inherently uncertain. Modern
codes (ASCE 7, IBC) use:

- **Site-specific Maximum Considered Earthquake (MCE)** ground
  motions
- **Response Modification factor (R)** quantifying system
  ductility — higher R = lower design force but more
  detailing
- **Capacity design** — force ductile yielding to occur in
  selected locations (beam plastic hinges, brace yielding),
  protect brittle elements
- **Detailing requirements** — confinement, anchorage,
  connection capacity (Special / Intermediate / Ordinary
  moment frames)
- **Diaphragm + collector** continuity

The most common seismic failures occur at connections, in
torsional irregularities, and from soft-story behaviour
(weak ground level under heavy upper levels).

### Embodied carbon

Structural systems often dominate building embodied carbon
(40-70% of upfront embodied):

- Concrete + cement: ~5-8% of global CO₂; Portland cement is
  the carbon hotspot
- Steel: high embodied carbon, but high recycled content
  (90%+ for structural steel from EAF mills)
- Mass timber: stores sequestered carbon; sourcing matters
  (FSC / SFI / PEFC)

Reduction strategies: low-carbon concrete mixes (SCMs — fly
ash, slag, calcined clay), reduced cement content, fewer
columns / longer spans, reuse of existing structures, mass
timber substitution, electric steel production.

### Construction phase

Many failures occur during construction, not service:

- **Shoring** — temporary support during construction
- **Formwork** — concrete formwork failure during placement
- **Sequence** — out-of-sequence work that bypasses load path
- **Imposed loads** — material storage on partially-cured
  structures
- **Crane loads** — tower crane loads + tie-ins
- **Demolition** — pre-demolition surveys, asbestos / lead /
  silica abatement

Construction-phase issues are typically the contractor's
means + methods (and liability), but SEOR coordination is
required.

### BIM + tooling

Modern structural workflow:

- Architecture in Revit / ArchiCAD
- Structure in Revit + Tekla / SAP2000 / ETABS / RAM /
  STAAD.Pro / Robot
- Analysis ↔ documentation round-tripping
- IFC interoperability (ISO 16739)
- Clash detection in Navisworks / Solibri
- LOD definitions per AIA E202 + BIMForum

Software-engineering decisions touching structural deliverables
need to understand LOD ladders, design assumption preservation,
and that "the model = the calc" is rarely true — calculations
are typically separate documents.

## Anti-Patterns

### Treating the architect as the structural authority

An architect can sketch a feasible scheme, but only the SEOR
can confirm it. When the architect promises an unsupported
column-removed scheme to the owner, then asks the SEOR to
"make it work," the project takes the rework cost. Engage
the SEOR before promising structural feasibility.

### "We have the drawings, so we know the structure"

Original drawings often diverge from as-built reality (field
changes, undocumented modifications, deterioration).
Condition assessment is mandatory before relying on archived
drawings for capacity / modification work.

### Skipping the geotechnical investigation

"We'll just use standard footings." Soil conditions vary
hugely site-to-site; bad soil + standard footings produces
differential settlement, structural cracking, and expensive
remediation.

### Ignoring serviceability

Floor vibration, drift, deflection — these aren't safety
issues but are tenant-experience issues that surface 6-24
months after occupancy. Specify the use case (sensitive
equipment, gym, residential) early so the SEOR designs to
the right serviceability target.

### "Just add stiffness"

Adding stiffness changes natural frequency, attracts more
seismic load, and may make the problem worse. Damping is
often the right intervention. Vibration consultants are a
specialty practice.

### Penetrations through structural elements

Cutting through beams, columns, shear walls, or post-tension
slabs is a structural modification requiring SEOR review +
calc + repair detail. Routine MEP / tenant fit-out can
accidentally violate this (see [[mep-coordination]]).

### Buy-American + sole sourcing failures

Specifying a single supplier for a critical element (special
seismic detail, fabrication-intensive component) without
backup creates schedule + supply-chain risk. Build redundancy
into the supplier base.

### Performance-based design without rigour

"Performance-based" must mean explicit objectives,
peer-reviewed analysis, and acceptance by the Authority
Having Jurisdiction (AHJ). PBD applied without rigour is
worse than code-minimum.

### Disregarding existing-building code paths

Adaptive reuse projects often discover that they trigger
seismic upgrade requirements they hadn't budgeted. Engage the
SEOR + AHJ early to map the code path (Chapter 34 IEBC vs
Chapter 8 IBC, etc.).

### Software model = structural reality

The Revit / BIM model isn't the structural calc. Members
shown in BIM may differ from analyzed members; connections
shown in BIM may be approximate. Always defer to stamped
structural calcs + drawings for code review.

## Verification Checklist

For a project involving structural decisions:

- [ ] SEOR is identified, licensed in jurisdiction, and
      engaged per scope.
- [ ] Risk Category + Importance Factor set per occupancy
      class.
- [ ] Geotechnical report dated + suitable for site + scope.
- [ ] Loads per current code, including site-specific seismic
      + wind.
- [ ] Load combinations per ASCE 7 / Eurocode + LRFD or ASD
      consistent throughout.
- [ ] Load path documented + continuous for gravity + lateral
      + seismic.
- [ ] Lateral system selected with appropriate R + detailing
      requirements.
- [ ] Serviceability targets identified (deflection,
      vibration, drift).
- [ ] Foundation type matches geotechnical recommendations.
- [ ] Existing building: condition assessment, code path,
      retrofit / upgrade scope agreed.
- [ ] MEP coordination: penetrations, hung loads, vibration
      isolation accounted for.
- [ ] Embodied carbon assessment if sustainability target
      applies.
- [ ] Construction sequencing reviewed for shoring + temporary
      works.
- [ ] Permit + AHJ review path identified.
- [ ] Peer review / SER engaged if performance-based design or
      complex project.

## Cross-References

- [[mep-coordination]] — MEP penetrations + hung loads +
  vibration isolation require structural coordination
- [[datacenter-ops]] — floor loading, equipment weights,
  raised access floors, building-as-Faraday-cage
- [[cloud-architecture]] — physical infrastructure resilience
  depends on structural integrity
- [[design-thinking]] — empathy phase informs serviceability
  targets (who uses the space, for what)
- [[supply-chain-patterns]] — structural materials supply
  chain affects schedule + cost
- [[risk-reviewer]] — natural-hazard risk to physical assets

## Why This Skill Exists

Structural failures are rare but catastrophic. The visible
historical examples — Champlain Towers South (Surfside FL
2021, 98 dead), Hard Rock Hotel (New Orleans 2019, 3 dead),
Plasco Building (Tehran 2017, 26 dead), Hyatt Regency walkway
(Kansas City 1981, 114 dead), Ronan Point (London 1968, 4
dead, progressive collapse) — each reveal that codes,
inspection, peer review, and competent engineering all
matter.

Daily structural decisions are far smaller stakes:

- Can this slab carry an MRI room (3-5 tons concentrated
  load)?
- Can we remove this column to open the floor plate?
- Is this 1960s warehouse safe to convert to apartments?
- Does our datacenter floor support 6 kW/rack PDU + dense
  storage?

Each requires structural literacy at the decision-making
level + a licensed SEOR for the actual call. This skill exists
to make non-structural stakeholders capable participants in
the conversation — asking the right questions, recognising the
load path, understanding when an SEOR opinion is needed,
acknowledging when an SEOR's "no" is final.

The cost of getting it wrong scales from "ugly cracks" through
"unusable building" to "people die." The cost of asking the
SEOR earlier rather than later is minor by comparison.

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
  - digital coordination (when AEC scope)
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

- Load path not explicitly verified end-to-end (gravity + lateral)
- Soft-storey detected in lateral system without remediation
- Diaphragm rigidity assumption used where actual behaviour is flexible
- Seismic detailing skipped because "site is low seismicity" (without code verification)
- Tolerance stack-up unmodelled (member fits assume zero variance)
- Hold-down / anchor design omitted on light-frame seismic projects
- Long-span deflection criteria misapplied (live-load vs total)
- Vibration / serviceability check absent on long-span floors
- Connection design deferred to fabricator without spec
- Existing structure modification without forensic assessment of as-built

**Refinement candidates**:

- New code-edition row when Eurocode / AISC / ACI ships major update
- New cross-reference when a sister skill (mep-coordination) adds a structural gate
- New connection-template row when a recurring detail emerges
- Tightening of the SEOR-consult policy when judgment calls recur
