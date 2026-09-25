# mep-coordination: Core Patterns

> Covers **Core Patterns** for the `mep-coordination` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 13 KB** — `token-budget.mjs --check`.

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
