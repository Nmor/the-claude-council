---
name: mep-coordination
description: Mechanical, Electrical, Plumbing (plus Fire Protection, Telecommunications, AV, Security, BMS) coordination through design, BIM-modelling, clash-detection, fabrication, and commissioning. Activates on building-services design, ISO 19650 BIM workflows, ASHRAE / BICSI / NFPA standards, multi-discipline AEC coordination.
---

# MEP Coordination

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> Coordinate Mechanical, Electrical, Plumbing (and Fire
> Protection, Telecommunications, AV, Security, BMS) systems
> with each other and with Architecture + Structure — through
> the design, BIM-modelling, clash-detection, fabrication, and
> commissioning lifecycle — so the building actually works the
> way the design said it would.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Core Patterns | [`references/core-patterns.md`](references/core-patterns.md) |

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
