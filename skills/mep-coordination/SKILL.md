---
name: mep-coordination
description: Mechanical, Electrical, Plumbing (plus Fire Protection, Telecommunications, AV, Security, BMS) coordination through design, BIM-modelling, clash-detection, fabrication, and commissioning. Activates on building-services design, ISO 19650 BIM workflows, ASHRAE / BICSI / NFPA standards, multi-discipline AEC coordination.
---

# MEP Coordination

> Coordinate Mechanical, Electrical, Plumbing (and Fire
> Protection, Telecommunications, AV, Security, BMS) systems
> with each other and with Architecture + Structure — through
> the design, BIM-modelling, clash-detection, fabrication, and
> commissioning lifecycle — so the building actually works the
> way the design said it would.

## Purpose

MEP coordination is the discipline that turns parallel design
disciplines into a single buildable + operable building. Each
discipline (mechanical / electrical / plumbing / fire protection /
telecom / AV / security / building management systems) generates
its own routes, equipment, ceiling-zone demands, vibration +
acoustic isolation requirements, access + maintenance needs, and
power + heat loads. When their work is reconciled only on the
construction site, the result is rework, schedule slippage, hard
hat clashes, and an operable building that still doesn't perform.

This skill provides principal-level literacy in MEP coordination
for decision-makers: project managers, architects, structural
engineers, design technology leads, BIM managers, owner's reps,
and software engineers building or integrating BIM / clash
detection / IoT / building-performance tooling.

This skill does NOT cover deep MEP engineering design — those
are licensed disciplines (PE, CEng, or equivalent). It frames
the cross-discipline orchestration problem.

## Standards Cited

- **ASHRAE 90.1-2022** — Energy Standard for Buildings Except
  Low-Rise Residential.
- **ASHRAE 62.1-2022** — Ventilation for Acceptable Indoor Air
  Quality.
- **ASHRAE 62.2-2022** — Ventilation and Acceptable Indoor Air
  Quality in Residential Buildings.
- **ASHRAE 55-2023** — Thermal Environmental Conditions for
  Human Occupancy.
- **NFPA 70 (NEC) 2023** — National Electrical Code.
- **NFPA 13 / 13R / 13D** — Standards for the Installation of
  Sprinkler Systems.
- **NFPA 72 (2022)** — National Fire Alarm and Signaling Code.
- **IAPMO Uniform Plumbing Code** / **ICC International
  Plumbing Code** — plumbing standards (jurisdiction-specific).
- **ISO 19650-1:2018 + -2:2018 + -3:2020 + -4:2022 + -5:2020**
  — Organization and digitization of information about
  buildings and civil engineering works, including building
  information modelling (BIM).
- **AIA E202-2008 / G202-2013** + **BIMForum LOD Specification
  2024** — Level of Development (LOD) standards (100 / 200 / 300
  / 350 / 400 / 500).
- **BSRIA BG 6/2018** — A Design Framework for Building
  Services.
- **CIBSE Guides** — Chartered Institution of Building Services
  Engineers reference works.
- **ASHRAE Guideline 0** — The Commissioning Process.
- **ANSI/ASHRAE/IES 90.1 Appendix G** — Performance Rating
  Method.
- **WELL Building Standard v2**, **LEED v4.1**, **BREEAM**
  — sustainability + occupant-experience frameworks.

## When to Fire

This skill engages when work involves:

- BIM coordination workflow + tooling (Revit, Navisworks,
  Solibri, Tekla BIMsight, BIM 360 Coordinate, Trimble Connect)
- LOD specifications + BIM execution plan (BEP) per ISO 19650
- Clash detection — hard, soft, workflow clashes
- Discipline-to-discipline coordination (M+E+P+FP+ST+AR)
- Plenum / ceiling zone allocation (ductwork vs piping vs
  conduit vs structure depth vs lighting)
- MEP penetrations through structure
- Equipment lay-down + maintenance access
- Vibration + acoustic isolation
- Electrical load calculations + panel scheduling
- Mechanical load (heating + cooling + ventilation) calculations
- Plumbing fixture counts + DFU/WSFU calculations
- Fire-protection design (sprinklers, alarms, suppression)
- Datacenter MEP — power + cooling + redundancy + monitoring
- Healthcare MEP — pressure regimes, isolation rooms, medical
  gases, redundancy
- Lab MEP — fume hoods, exhaust make-up air, special hazards
- High-rise MEP — pumping schemes, smoke control, riser
  shafts
- Commissioning + retro-commissioning programs
- Owner's project requirements (OPR) + basis of design (BOD)
- Construction sequencing + trade hand-offs
- O&M handover (record drawings, asset registers, BMS
  configuration)
- Performance issues post-occupancy (the "soft commissioning"
  loop)

It does NOT engage for actual licensed MEP engineering design
— those calculations and stamped drawings require licensed
practitioners.

## Core Patterns

### The MEP disciplines + their concerns

| Discipline | Primary concerns |
| --- | --- |
| **Mechanical (HVAC)** | Heating, cooling, ventilation, exhaust, refrigerant, smoke control |
| **Electrical (power + lighting + low-voltage)** | Service entry, switchgear, distribution, branch circuits, lighting, controls, emergency systems |
| **Plumbing** | Domestic water, drainage, vents, storm, natural gas, medical gases, compressed air |
| **Fire Protection** | Sprinklers, standpipes, fire pumps, special suppression (clean agent, water mist, foam), fire alarm |
| **Telecommunications / Data** | Pathways, cable trays, IDF/MDF closets, structured cabling, wireless |
| **Audio-Visual (AV)** | Displays, sound systems, conferencing, control |
| **Security** | Access control, video, intrusion, public address |
| **Building Management System (BMS)** | Sensors, controllers, integration, analytics |

These disciplines often operate as separate firms or
departments, with separate design models, separate scopes,
and separate accountability — yet they share the same physical
space.

### Why coordination is hard

The ceiling plenum is contested space. Within ~12-30 inches
between the structural floor / roof slab and the finished
ceiling, you must route:

- Ductwork (large; needs slope for condensate; needs access
  to dampers + VAVs + smoke dampers)
- Chilled / hot water / steam piping (with insulation;
  expansion joints; valves; air vents)
- Domestic + sanitary piping (sloped; vents; access to
  cleanouts)
- Sprinkler piping + heads
- Electrical conduit + cable tray (clearance from data;
  bend radius)
- Data + telecom (low voltage; bend radius; access to splice
  cases)
- Lighting fixtures + their controls
- Smoke detectors + alarm devices
- Smoke dampers, fire dampers
- BMS sensors + transmitters + actuators
- Structural beams + braces

Plus access for installation + maintenance, with the ceiling
plan still architecturally satisfying. Without coordination,
sequencing places one trade in the space, the next has no
room.

### Level of Development (LOD)

BIMForum LOD ladder:

| LOD | Definition |
| --- | --- |
| **100** | Generic concept — symbol, area, single line |
| **200** | Generalized object — approximate size + location, schematic |
| **300** | Specific object — accurate size, location, orientation, connection |
| **350** | Coordination-grade — interfaces with other systems modelled |
| **400** | Fabrication-grade — model includes fabrication detail |
| **500** | Field-verified — model represents as-built |

MEP coordination requires LOD 350 minimum. Below that, clash
detection misses real conflicts; above that, the model carries
too much premature precision. The BEP (BIM Execution Plan)
defines which discipline reaches which LOD by which design
milestone.

### Clash detection — three categories

| Category | Description | Resolution |
| --- | --- | --- |
| **Hard clash** | Two objects occupy same space (duct through beam) | Re-route, redesign |
| **Soft clash** | Object too close to another — violates clearance, access, code (sprinkler within 18" of fluorescent fixture) | Re-route, re-specify |
| **Workflow / 4D clash** | Schedule conflict — discipline A installs before discipline B can route | Re-sequence |

Clash detection runs continuously during design (weekly /
biweekly), driving discipline-to-discipline coordination
meetings. Tools: Navisworks Manage (the dominant), Solibri,
Revizto, BIM 360 Coordinate, BIMcollab Zoom.

### Equipment maintenance access

Every piece of MEP equipment needs maintenance:

- **AHUs** — filter access; coil access; fan service
- **Pumps** — bearing service; seal replacement; motor lift
- **Boilers / chillers** — tube pull access; refrigerant
  service
- **Cooling towers** — fill replacement; sump access
- **Transformers / switchgear** — working clearances per NEC
  Article 110.26
- **VFDs** — heat rejection + service access
- **VAVs** — actuator access; coil access for reheats
- **Fan coils** — filter + coil access
- **Plumbing cleanouts** — ADA-accessible
- **Fire dampers** — annual / 4-year access
- **Smoke dampers** — annual / 4-year access
- **Valves** — operator access without working at height

Access requirements often determine ceiling zone allocation

- valve placement. "Service-side" access > "code minimum"
clearance, but is more space-hungry.

### Vibration + acoustic isolation

MEP equipment generates vibration + noise that propagates
through structure:

- AHUs, fans, pumps, compressors — spring isolators, inertia
  bases
- Generators — concrete pads with isolators; exhaust silencers
- Cooling towers — neoprene isolators; flex connectors
- Piping — riser isolators; flex connectors at equipment
- Ductwork — flex connections at fans
- Conduit + cable tray — isolated supports for sensitive
  occupancies (recording studios, MRI rooms, residences over
  mechanical)

Code minima (ASHRAE 90.1) + manufacturer requirements +
sensitive use considerations all stack. The acoustic
consultant is often a separate discipline.

### Electrical coordination

Power flow:

- Utility transformer → main switchgear → distribution panels
  → branch panels → loads
- Emergency power: ATS (automatic transfer switch) → generator
  → optional UPS
- Standby vs emergency vs critical (NEC Articles 700, 701, 702)

Coordination concerns:

- Panel locations + working clearance
- Conduit routing + bend radius
- Cable derating (NEC Annex B)
- Voltage drop (NEC 210.19 + 215.2 recommendations)
- Selective coordination (especially emergency systems)
- Arc-flash labelling + analysis (NFPA 70E)
- Grounding + bonding (NEC Article 250)

### Mechanical coordination

HVAC system types:

- **VAV (Variable Air Volume)** — central AHU; variable
  zone-level boxes; dominant US commercial
- **VRF / VRV** — variable refrigerant flow; modular; common
  international
- **Chilled water** — central plant; primary / secondary /
  variable primary; large commercial + institutional
- **DX (Direct Expansion)** — packaged units; small commercial
  - residential
- **Hydronic radiant** — embedded floor or ceiling; high
  comfort, slow response
- **Displacement** — low-velocity floor supply, ceiling
  return; clean industrial + high-bay

Selection depends on climate, occupancy, schedule, energy
performance targets, refrigerant regulations (R-410A phase-
down, R-32, R-454B, R-466A transitions per AIM Act + EU
F-Gas regulation).

### Plumbing coordination

Two parallel systems:

- Domestic water (cold + hot) — sized per DFU (Drainage
  Fixture Units) + WSFU (Water Supply Fixture Units) per UPC
  / IPC
- Drainage + vent — gravity-driven; slope + venting per code
- Plus: stormwater (gravity / siphonic), natural gas, medical
  gases (oxygen, vacuum, medical air, nitrogen, N2O, CO2),
  compressed air, special wastes (lab acid, blood, radioactive)

Risers concentrate plumbing into vertical chases; horizontal
distribution must coordinate with structure + other trades.

### Fire protection coordination

Sprinkler systems (NFPA 13 / 13R / 13D):

- Light, ordinary, extra hazard occupancy classifications
- Coverage area per head + spacing
- Density requirements (gpm/sqft)
- Wet vs dry vs preaction vs deluge systems

Fire alarm (NFPA 72):

- Smoke + heat detectors
- Pull stations
- Notification appliances (audio + visual)
- Mass notification systems (MNS)

Special suppression: clean agent (FM-200, NOVEC 1230, Inert
gases) for IT rooms; water mist for some hazards; foam for
flammable liquids.

Smoke control: pressurized stairwells, smoke evacuation,
elevator hoistway pressurization — major coordination items
in high-rise.

### Datacenter MEP

Particularly demanding:

- Power: utility + UPS + diesel-rotary or generator + ATS +
  STS; redundancy per Uptime Tier (see [[datacenter-ops]])
- Cooling: CRAC / CRAH / in-row / rear-door HX / direct-to-
  chip / immersion at high densities
- Containment: hot-aisle / cold-aisle; rear-door cooling
- Monitoring: DCIM integration with BMS
- Leak detection under raised floor + in liquid loops
- Vibration: avoid shared infrastructure with sensitive
  equipment
- Seismic restraint on all overhead infrastructure

### Healthcare MEP

Regulated heavily:

- Operating rooms: HEPA-filtered, positive pressure, ACH 20-25,
  redundant power
- AII rooms (Airborne Infection Isolation): negative pressure,
  ACH 12, HEPA exhaust
- Pharmacy USP <797> / <800>: ISO Class 5-8 cleanrooms
- Medical gas: 4-zone valves, alarm panels, source equipment
- Essential electrical: Type 1 EES per NFPA 99 (Life Safety,
  Critical, Equipment branches)
- BAS integration with infection-control monitoring

### Lab MEP

- Fume hood face velocity (typically 100 fpm) drives makeup
  air demand
- Variable air volume (VAV) fume hoods reduce exhaust
- Snorkels, canopy hoods, biosafety cabinets
- Special hazards: solvents, corrosives, biohazards, radioactive
- Process water (DI, RO), industrial gases

### Commissioning

ASHRAE Guideline 0 + Guideline 1.1 define the commissioning
process — verifying that systems are designed, installed,
tested, and operated per the Owner's Project Requirements
(OPR):

- Pre-design: OPR development
- Design: Basis of Design (BOD), design reviews, model + BIM
  reviews
- Construction: Submittal review, installation observation,
  pre-functional + functional testing
- Acceptance: Performance verification, training,
  documentation
- Occupancy + warranty: Seasonal testing, issue resolution,
  near-warranty commissioning

Cx is a separate discipline — Commissioning Agent (CxA), often
third-party. LEED + WELL require fundamental + enhanced
commissioning.

### Coordination meetings — the social ritual

Weekly or biweekly cross-discipline coordination meetings
through DD + CD phases:

- Review prior week's clash report
- Walk through unresolved clashes by zone
- Assign resolutions with owner + due date
- Update model + re-run clash detection
- Communicate to fabricators + erectors

The discipline of running these meetings — agenda, attendance,
decisions logged, follow-through verified — is what separates
projects that converge from projects that ship coordination
problems to the field.

### Trade fabrication + spool drawings

Mechanical + plumbing trades increasingly fabricate offsite.
Spool drawings derived from the coordinated BIM model drive
shop fabrication. The model becomes load-bearing in the
literal sense: fab errors propagate from BIM coordination
errors. Hence LOD 400 fabrication-grade modelling becomes
the contractor's responsibility for trades that fabricate.

## Anti-Patterns

### Coordination begins in the field

Coordination meetings start during construction; the design
team never resolved discipline conflicts. The result: GC
rework, schedule delay, RFI flood, claims. Cost ratio
documented at 5-30× the cost of resolving in design (depending
on stage of catch).

### "Cartoon" BIM — looks like a model, isn't coordinated

Architectural + structural + MEP each have their own Revit
file. They never federate or clash-detect. The model misleads
everyone into thinking coordination has happened.

### Ignoring access for maintenance

The design satisfies "fits in the space" but doesn't satisfy
"can be serviced." 2-3 years post-occupancy, FM teams discover
they can't access valves, replace filters, or pull tubes.
Retrofitting access is expensive + disruptive.

### Single-firm "design-build" without discipline expertise

Design-build can compress coordination if disciplines are
under one roof. Or it can hide coordination gaps under
contractual unity — until field installation reveals them.
Discipline expertise + coordination discipline both required.

### Owner's Project Requirements never written or updated

Without an OPR, every design decision is by default. Without
maintenance, the OPR is a relic of conceptual design that
doesn't reflect Owner's actual expectations. Mature programs
update OPR through design + post-occupancy.

### Commissioning compressed into the last week

"Just go through the checklist, GC needs to close out by
Friday." Real commissioning verifies sequences of operation
against design intent — takes weeks at minimum, runs across
seasons for HVAC. Compressed Cx becomes a paper exercise.

### Late-stage MEP scope additions

Owner adds requirements during CDs ("we need 100 more
workstations") that cascade: more power, more cooling, more
ventilation, more plumbing, more fire-alarm devices.
Coordination unravels. Either accept the delay/cost or
defer the addition.

### "Generic equipment" placeholders never updated

Schematic design uses generic equipment. CD design
substitutes specific equipment. Specific equipment has
different dimensions, weights, connections, clearances than
generic. Updates not propagated through coordination =
clashes at install.

### Vibration / acoustic isolation as afterthought

Equipment chosen for cost / efficiency without vibration +
acoustic specs. Residents over mechanical complain. Studios
adjacent to AHUs are unusable. Retrofit isolation is rarely
feasible.

### "Coordination is the contractor's problem"

If the design team ships uncoordinated drawings, the GC's
job becomes coordination — they aren't designers. RFIs,
schedule impact, change orders, sometimes design liability.
Get the design team to coordinate during design.

## Verification Checklist

For a project involving MEP coordination:

- [ ] BIM Execution Plan (BEP) per ISO 19650 in place naming
      LOD per discipline per milestone.
- [ ] All MEP disciplines + structure + architecture in
      federated model.
- [ ] Clash detection running weekly or biweekly through DD +
      CD.
- [ ] Clash log with owner + resolution + due date.
- [ ] Ceiling zone allocation documented for representative
      zones.
- [ ] Equipment access + maintenance clearances verified.
- [ ] Vibration + acoustic isolation specified per use case.
- [ ] OPR + BOD written + updated.
- [ ] Commissioning Agent engaged early, OPR-reviewed.
- [ ] All penetrations through structure on coordinated SEOR-
      reviewed drawings.
- [ ] Power calculations + panel schedules consistent across
      discipline-of-record + IT + AV + security + signage
      loads.
- [ ] Mechanical loads match architectural envelope + glazing
      + internal load assumptions.
- [ ] Plumbing fixture count satisfies occupancy + code.
- [ ] Fire protection sprinkler coverage + alarm device
      coverage modelled + verified.
- [ ] Trade fabrication LODs agreed if shop drawings are model-
      based.

## Cross-References

- [[structural-basics]] — structural penetrations + hung loads
  - vibration isolation interface
- [[datacenter-ops]] — MEP is the largest discipline in
  datacenter projects (power + cooling)
- [[design-systems]] — BIM execution plans + component
  libraries are design systems for buildings
- [[supply-chain-patterns]] — long-lead equipment (chillers,
  generators, switchgear) drives MEP schedule
- [[ux-research]] — occupant feedback (thermal, acoustic, IAQ)
  validates MEP performance
- [[performance-management]] — Cx process + post-occupancy
  evaluation are MEP performance management

## Why This Skill Exists

MEP rework is consistently cited as among the top three
construction cost overrun drivers. Studies (NIST GCR 04-867,
2004) estimate the cost of inadequate interoperability across
the US construction industry at $15.8B annually — the bulk
of which is MEP coordination loss. Modern BIM workflows have
reduced this dramatically when they're actually used; they're
not always actually used.

Beyond cost: uncoordinated MEP produces buildings that don't
perform as designed. The performance gap (designed-vs-actual
energy use) on US commercial buildings is documented at
25-100% (NBI / DOE studies). Most of that gap is operational +
controls + behaviour, but a significant share is
uncoordinated installation: airflow that can't reach designed
zones, control sequences that don't match installed dampers,
return paths that aren't sealed.

For the engineering / software stakeholder, MEP coordination
matters because:

- BIM tooling (Revit, Navisworks, Solibri, IFC, BCF) is the
  foundation
- Sensor + IoT + BMS data depends on as-built fidelity
- Energy + sustainability targets depend on system performance
- Datacenter + healthcare + lab + high-performance buildings
  all live or die on MEP

This skill exists to ensure that the cross-discipline
coordination conversation is informed at the principal level
— so the right tools are funded, the right meetings happen,
the right LODs are required, and the right commissioning
discipline is enforced.

The cost of getting it right at design time is a fraction of
the cost of catching it in the field — and a tiny fraction of
the cost of carrying it through 30-50 years of building
operation.

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

- Trade-by-trade design without coordination (clash discovered at install)
- BIM model LOD set too low for trade hand-off (LOD-300 used where LOD-400 needed)
- Maintenance access not designed (filter / valve / coil unreachable)
- Commissioning plan absent — system handed over without verification
- Energy model run only at design completion (vs iterative through schematic)
- ASHRAE 90.1 / Title 24 / Part L compliance verified at submission only (not by-design)
- Acoustic / IAQ requirements deferred (added cost on retrofit)
- Coordination drawings shipped without trade sign-off
- Spec / drawings conflict unresolved on bid documents
- O&M deliverables (manuals, AS-builts, training) skipped

**Refinement candidates**:

- New BIM/LOD row when ISO 19650 ships major update
- New cross-reference when a sister skill (structural-basics, datacenter-ops) adds an MEP gate
- New commissioning template when a recurring failure class emerges
- Tightening of the clash-detection rule when field rework recurs
