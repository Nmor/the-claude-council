# structural-basics: Core Patterns

> Covers **Core Patterns** for the `structural-basics` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 13 KB** — `token-budget.mjs --check`.

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
