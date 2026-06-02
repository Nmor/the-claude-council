---
name: datacenter-ops
description: Principal-level datacenter operations — Uptime Institute tier model, BICSI / ANSI-TIA-942 structured cabling, power + cooling + space (PUE / WUE / CUE), physical security, capacity planning, change + incident management, vendor + SLA management, colocation strategy, and the operational discipline that keeps physical infrastructure running through grid events, hardware failures, and growth pressure.
auto_activate: true
---

# Datacenter Operations

## Purpose

Operate physical datacenter infrastructure — whether owned, leased
colocation, edge / micro-datacenter, or a hybrid stretching to
cloud — against the published standards (Uptime Institute Tier
Standard, ANSI/TIA-942-C, ISO/IEC 22237, EN 50600). The skill
covers the layers cloud abstractions hide: power feeds + UPS +
generators, cooling + airflow + containment, structured cabling +
patch management, physical security + access control, hardware
lifecycle + capacity planning, change management on hot
infrastructure, vendor + service level discipline, and the
disciplined incident response that gets a row of racks back online
without making things worse.

Most software engineers never see this layer. Most cloud workloads
sit on it. When a region goes down, when latency-sensitive
workloads need on-prem, when regulatory residency demands sovereign
infrastructure, when edge computing requires distributed
deployment, the datacenter operations discipline is what makes the
physical layer behave like the abstraction software was promised.

The skill activates when colocation contracts are being negotiated
or renewed, when a private DC is being designed or expanded, when
hybrid (cloud + on-prem) connectivity is being planned, when
incident response involves the physical layer (power event,
cooling failure, fibre cut), when capacity planning is on the
agenda, when change management on hot infrastructure is being
scheduled, and during compliance audits that include physical
security (SOC 2 CC6.4, ISO 27001 Annex A.7, PCI-DSS 9, HIPAA
§164.310).

## Standards Cited

- **Uptime Institute Tier Standard: Topology + Operational
  Sustainability (current revisions, 2023+)** — Tier I, II, III,
  IV definitions; the canonical reliability classification
- **ANSI/TIA-942-C (Telecommunications Infrastructure Standard for
  Data Centers, 2024 revision)** — structured cabling, redundancy,
  Rated-1 through Rated-4 (TIA's parallel to Uptime tiers)
- **ISO/IEC 22237 series (Information technology — Data centre
  facilities and infrastructures)** — international framework
  parts 1-7 covering general concepts, building construction,
  power, environmental control, telecommunications, security,
  management
- **EN 50600 series (European Standard for Data Centre Facilities
  and Infrastructures)** — European framework aligned with ISO
  22237
- **BICSI 002-2024 (Data Center Design and Implementation Best
  Practices)** — practitioner-focused; widely cited
- **ASHRAE TC 9.9 Thermal Guidelines (5th Edition, 2021)** —
  recommended + allowable environmental envelopes for IT
  equipment; the canonical reference for inlet temperature +
  humidity
- **The Green Grid PUE (Power Usage Effectiveness) + WUE (Water)
  - CUE (Carbon) metrics** — efficiency measurement
- **NIST SP 800-53 Rev 5 PE family (Physical and Environmental
  Protection)** — control catalogue for physical security
- **ISO/IEC 27001:2022 Annex A.7 (Physical controls)** — 14
  physical-security controls auditable in an ISMS
- **PCI-DSS v4.0 Requirement 9** — physical access controls for
  cardholder data environment
- **HIPAA §164.310 (Physical Safeguards)** — facility access,
  workstation use, device + media controls
- **NFPA 75 + NFPA 76 (Fire Protection of Information Technology
  Equipment + Telecommunications Facilities)** — fire codes
- **OSHA standards** — workplace safety in DC environments
- **The Site Reliability Engineering Book (Beyer et al)** — SLO
  framework applied to physical operations

## When to Fire

Auto-engage on these signals:

- Colocation contract negotiation or renewal
- Private datacenter or edge facility design / expansion
- Hybrid cloud-on-prem connectivity planning (Direct Connect,
  ExpressRoute, Interconnect, cross-connects, dark fibre)
- Hardware refresh planning (3-5 year cycles for compute;
  longer for network + power)
- Capacity planning crisis: "we're out of power" or "we're out
  of rack space" or "cooling is at capacity"
- Tier-upgrade evaluation (going from Tier II to Tier III, etc.)
- Compliance audit including physical-security scope (SOC 2
  CC6.4, ISO 27001 A.7, PCI 9, HIPAA Physical Safeguards)
- Incident response involving physical layer (UPS failure,
  generator failure, cooling failure, fibre cut, water event,
  fire suppression discharge, theft, unauthorised access)
- Change management on hot infrastructure (in-place UPS bypass,
  power transfer, switching cooling units, fibre re-termination)
- Vendor / SLA review — colocation provider, hardware vendor,
  smart-hands provider, fibre carrier, freight + logistics
- DCIM (Data Center Infrastructure Management) tool selection
  (Sunbird, Schneider EcoStruxure IT, nlyte, Vertiv, custom)
- DR / BCP planning where on-prem is in scope
- Edge computing / micro-datacenter deployment (5G MEC, retail
  edge, industrial)
- Sustainability / ESG reporting requiring DC carbon, water, +
  energy metrics
- M&A integration involving acquired physical infrastructure

## Core Patterns

### The Uptime Institute Tier Model

The single most-cited classification for DC reliability:

| Tier | Topology | Availability target | Annual downtime | Use |
| --- | --- | --- | --- | --- |
| **Tier I** | Single non-redundant path | 99.671% | ~28.8 h | Single-tenant SMB or non-critical |
| **Tier II** | Single path + redundant components | 99.741% | ~22 h | Some redundancy; still single path |
| **Tier III** | Multiple distribution paths, concurrently maintainable | 99.982% | ~1.6 h | Most enterprise prod workloads |
| **Tier IV** | Multiple active paths + fault tolerant | 99.995% | ~26 min | High-security, financial, critical |

The availability numbers are nameplate, not field. Concurrently
maintainable (Tier III) means you can take any component offline
for maintenance without affecting IT load; fault tolerant (Tier
IV) means any single component or distribution path can fail and
IT load is unaffected.

Tier ratings apply to the FACILITY topology, not to operations.
The Uptime Institute also offers Operational Sustainability
(Gold / Silver / Bronze) — a separate certification covering
running practices, training, change management. Tier III topology
with poor operations performs worse than Tier II with excellent
operations.

### Power

The fundamental rule: power is the lifeblood; every component is
designed redundantly.

| Layer | Component | Pattern |
| --- | --- | --- |
| **Utility** | Grid feed | Single (Tier I-II) or dual feeds from separate substations (Tier III-IV) |
| **Generators** | Diesel / gas | N (Tier I-II) or N+1 / 2N (Tier III-IV); 24h+ fuel; auto-start within seconds of utility loss |
| **ATS / STS** | Automatic Transfer Switch / Static Transfer Switch | Mechanical transfer between utility and generator (ATS); fast inverter-based transfer (STS) |
| **UPS** | Uninterruptible Power Supply (battery or flywheel) | Carries load during generator startup; 5-15 min capacity standard |
| **PDU** | Power Distribution Unit (room) + rack-PDU | Distribution to racks with metered + switched circuits |
| **Whip / Tail** | Final connection to equipment | Dual-corded equipment plugged into A + B feeds |

Power budgeting: rack density (kW/rack) varies wildly — legacy
< 5 kW, modern enterprise 7-12 kW, AI / HPC 30-100+ kW per rack.
Cooling capability must match. Stranded power (provisioned but
unused) and stranded cooling are the most common waste.

Maintenance pattern: monthly load-bank tests of generators;
quarterly UPS battery checks; semi-annual ATS exercise;
annual full transfer test. Every test is a planned incident
where things can go wrong — schedule with rollback ready.

### Cooling

ASHRAE TC 9.9 publishes the recommended + allowable envelopes for
IT equipment. Modern recommended range: 18-27°C (64-81°F) inlet
temperature, 60-65% RH (relative humidity), with a dew point
range that prevents condensation + static.

Cooling topologies:

- **Perimeter CRAC / CRAH** (computer room air conditioner /
  handler) — legacy hot/cold-aisle without containment; low
  efficiency
- **Cold-aisle / hot-aisle containment** — physical barriers
  separate intake from exhaust; PUE improves significantly
- **In-row cooling** — units between racks; high density
- **Rear-door heat exchangers** — water-cooled rear doors absorb
  heat at the rack
- **Direct-to-chip liquid cooling** — coldplate on CPU/GPU;
  required for >30 kW/rack densities (AI workloads)
- **Immersion cooling** — single-phase or two-phase fluid bath;
  extreme density + efficiency
- **Free cooling / economisers** — outside-air or water-side
  free cooling when ambient permits (huge efficiency win in
  cool climates)

Metrics:

- **PUE** = Total facility energy / IT energy. 1.0 is perfect;
  1.2 is best-in-class hyperscale; 1.5-1.8 is enterprise; 2.0+
  is legacy
- **WUE** = Water consumed / IT energy (L/kWh)
- **CUE** = CO2 emitted / IT energy (kgCO2eq/kWh)

Failures: cooling redundancy (N+1 minimum for Tier III; 2N for
Tier IV); chilled-water leak detection; hot-spot monitoring; the
canonical incident "cooling failed, rooms heated up faster than
expected, equipment thermal-shutdown cascaded".

### Space + Structured Cabling

ANSI/TIA-942 defines the layered cabling architecture:

- **MDA** (Main Distribution Area) — primary cross-connect, core
  network
- **HDA** (Horizontal Distribution Area) — distribution to ZDAs
- **ZDA** (Zone Distribution Area) — local distribution
- **EDA** (Equipment Distribution Area) — the rack itself

Cabling discipline: structured pathways (overhead or under-floor),
labelled at both ends, documented in DCIM, with sufficient bend
radius. Power + data physically separated to avoid EMI. Patch
panels documented with port-to-port mappings; ad-hoc cabling is
the dominant cause of "we don't know what that cable does"
during incidents.

Rack density: u-units of usable space per rack (42U standard;
48U for high-density); accounting for top-of-rack switches,
cable management, blanking panels, and equipment depth (deep
chassis = aisle constraint).

### Physical Security

Per ISO 27001 Annex A.7 + PCI-DSS 9 + NIST SP 800-53 PE family:

| Control | Pattern |
| --- | --- |
| **Perimeter** | Fencing, gates, vehicle barriers, lighting, CCTV |
| **Building access** | Mantrap + multi-factor (badge + biometric) |
| **Visitor management** | Logged, escorted, badged, time-bounded |
| **Cage / suite access** | Separate badge + biometric per tenant |
| **Rack access** | Locked cabinets; some compliance requires per-cabinet logging |
| **Smart hands** | Provider personnel with documented procedures; recorded sessions |
| **CCTV retention** | 90-day default; longer for PCI / regulated |
| **Tailgating prevention** | Mantrap + cameras + training |
| **Media handling** | Secure disposal (destruction, degaussing); NIST SP 800-88 |
| **Loading dock + delivery** | Separate from secure area; equipment inspected |
| **Environmental** | Smoke + water + temp + humidity sensors with alarming |
| **Fire suppression** | Pre-action (water) or clean-agent (FM-200, Novec 1230) per code |

### DCIM + Asset Management

A Data Center Infrastructure Management system tracks:

- Every asset (rack, server, switch, PDU, UPS) with serial,
  location, port mappings, power draw, life-cycle status
- Capacity utilisation (kW used vs available; U used vs
  available; cooling utilised; floor weight)
- Change records (every move/add/change tracked)
- Alarming (environmental + power + cooling)

Without DCIM, the DC becomes legend: "I think that server is in
row 7" turns into "the network team will know" turns into "let's
just trace it physically". A DC with > 100 racks operating
without DCIM is operating on heroics.

### Change Management on Hot Infrastructure

Physical infrastructure changes are different from software
changes:

- **Maintenance windows** with explicit GO/NO-GO criteria
- **Method of Procedure (MOP)** — step-by-step with rollback at
  every step
- **Peer review + approval** from operations, engineering, security
- **Pre-change checks** — verify redundancy is healthy BEFORE
  starting (don't begin a UPS swap with the other UPS already
  on bypass)
- **In-progress monitoring** — operations + remote-hands attentive
- **Post-change verification** — full system test before declaring
  success
- **Documentation** — DCIM updated, MOP archived for post-mortem

The canonical failure: "we'll just quickly swap this PDU" without
a MOP, without verifying the other feed, without monitoring; a
mistake brings down half the rack.

### Vendor + SLA Management

Colocation, hardware vendor, freight, smart-hands, fibre carrier
— each has an SLA. Track:

- **Uptime SLA** (e.g., 99.999% on power) with penalty schedule
- **Mean time to respond** + **mean time to repair**
- **Incident reporting** + post-mortem obligations
- **Maintenance windows** + notification requirements
- **Capacity guarantees** (e.g., "right to grow by 25% within 6
  months at quoted rate")

Vendor reviews quarterly; SLA breaches tracked + collected.
Don't sign a contract without exit terms (data migration,
notice period, asset removal).

### Capacity Planning

Three axes:

- **Power** (kW total, kW per rack, headroom for redundancy)
- **Cooling** (kW thermal capacity, hot-spot management)
- **Space** (U total, U per row, U per rack accounting for
  density limits)

Plus:

- Network port capacity at MDA / HDA
- Generator runtime at full load
- UPS battery life at full load

Forecast 18-36 months ahead. Lead time for facility expansion
(additional power feeds, cooling units, generators) is 6-18
months; for new colocation contract, 3-6 months; for build-out
of a private DC, 18-36 months. Decisions taken late become
forced + expensive.

### Sustainability + ESG

Modern DC ops include sustainability:

- **PUE / WUE / CUE reporting**
- **Renewable energy procurement** (PPAs, RECs)
- **Carbon-aware workload scheduling** (run batch in low-
  carbon regions / hours)
- **Water-positive operations** (especially in water-stressed
  regions)
- **Equipment refresh** including disposal pathway (e-waste,
  R2 / e-Stewards certified recyclers)
- **Reporting frameworks** — GHG Protocol, CDP, GRI, ISSB
  IFRS S2

### Hybrid + Edge

Modern infrastructure rarely sits in a single DC. Patterns:

- **On-prem + cloud hybrid** — Direct Connect / ExpressRoute /
  Cloud Interconnect; consistent identity, observability,
  security policy across both
- **Edge / micro-DC** — distributed computing closer to users
  / devices (5G MEC, retail in-store, industrial automation);
  fewer racks, simpler cooling, often unattended
- **Telco edge / colocation edge** — Equinix, Digital Realty,
  CoreSite, Cyxtera; carrier-hotel proximity for low-latency
  peering
- **Sovereign / regulated** — local DC requirement for data
  residency (specific countries / sectors)

## Anti-Patterns

- **Single feed everywhere.** Tier I disguised as Tier III; one
  utility outage takes everything down.
- **No tested generator transfer.** Generator starts on event,
  ATS doesn't transfer, UPS drains, blackout. Test monthly.
- **UPS at end of battery life.** Annual battery tests find the
  bad cells; ignoring them = next-event blackout.
- **No DCIM.** "We'll just track it in spreadsheets." Spreadsheets
  drift; reality wins at the worst moment.
- **Hot/cold aisle without containment.** Up to 30% cooling
  efficiency lost to mixing.
- **Rack density mismatch.** Customer ships AI server with 25 kW
  draw for a rack budgeted at 7 kW; thermal cascade.
- **Patch cable spaghetti.** Five years of unstructured cabling
  results in "we don't know what that cable does"; pulling one
  brings down a service.
- **No badge logging at rack level.** PCI / SOC 2 finding;
  remediation is expensive.
- **Smart-hands without MOP.** Technician improvises; cable
  pulled wrong; outage.
- **Maintenance during peak.** Generator test during traffic
  spike + something goes wrong; double impact.
- **No fire suppression compliance.** NFPA 75 violation; fire
  marshal shuts down the room.
- **Sole-source vendor.** One supplier holds you hostage at
  renewal; consolidation savings disappear.
- **No capacity model.** Run out of power on a Tuesday afternoon
  with no headroom; new growth blocked for 6-12 months.
- **Ignoring water risk.** Water-cooled DC in drought region with
  no diversification; water utility curtails, DC throttles.
- **No M&A integration plan.** Acquired DC stays separate, double
  operations, inconsistent compliance.
- **Trusting tier rating in isolation.** Tier IV facility, mediocre
  operations team, no MOPs; outages happen anyway.

## Verification Checklist

- [ ] Facility tier rating documented + matches workload
      requirements
- [ ] Power topology documented (utility / generator / UPS / PDU)
      with redundancy at the tier rating
- [ ] Generator monthly load test + annual full-transfer test
      schedule documented + executed
- [ ] UPS battery health monitored + replaced on schedule
- [ ] Cooling topology + redundancy documented (N+1, 2N, etc.)
- [ ] PUE / WUE / CUE measured + reported quarterly
- [ ] DCIM populated + maintained for all assets
- [ ] Physical security controls audited annually against ISO
      27001 A.7 / SOC 2 CC6 / PCI 9 / HIPAA §164.310
- [ ] Visitor + smart-hands access logged + reviewed
- [ ] Structured cabling documented; labelled both ends
- [ ] Change management requires MOP + peer review + post-change
      verification for hot infrastructure
- [ ] Capacity model (power / cooling / space) forecasts 18-36
      months
- [ ] Vendor SLAs tracked + reviewed quarterly
- [ ] Hardware lifecycle managed (refresh, decommission,
      certified-disposal pathway)
- [ ] Hybrid connectivity (cloud + on-prem) consistent in
      identity, security, observability
- [ ] Sustainability metrics reported (Scope 1 + 2 emissions,
      water, e-waste)
- [ ] DR / BCP includes physical-layer scenarios (power, cooling,
      fibre, fire, flood, seismic, civil)

## Cross-References

- `cloud-architecture` — the cloud side of hybrid; many on-prem
  workloads migrate to managed cloud
- `network-patterns` — DC networking (MDA, HDA, top-of-rack)
- `iso27001-controls`, `soc2-readiness`, `pci-dss-patterns` —
  compliance scopes that include physical security
- `runbook-template.md` — incident response for physical-layer
  events
- `observability-patterns` — environmental + power + cooling
  telemetry
- `audit-logging.md` — physical access logs are audit-grade
  records

## Why This Skill Exists

Without principal-level DC operations:

- A power event takes down what was sold as Tier III because
  the operations weren't actually Tier III
- Capacity runs out unexpectedly; growth gets blocked for
  months while expansion is procured
- A compliance audit finds physical-security gaps (no badge
  logs at rack level, CCTV retention too short, unescorted
  visitors); remediation is expensive and embarrassing
- A change to hot infrastructure causes an outage because the
  MOP wasn't written, peer-reviewed, or rolled back
- Stranded capacity (provisioned power not used; rack space
  empty) inflates cost
- Hardware refresh + disposal becomes a financial + ESG
  liability when no plan exists
- Vendors lock in unfavourable renewals because exit terms
  weren't negotiated

With principal-grade DC operations:

- The physical layer behaves like the abstraction software was
  promised: reliable, observable, secure, compliant
- Incidents are bounded, recovered from quickly, learned from
- Capacity grows ahead of demand, not behind it
- Compliance is by-product, not scramble
- Costs are predictable; sustainability reporting is honest +
  improving year-over-year
- The team can sleep through a thunderstorm because the
  generators, UPS, and operations procedures were all tested last
  month

The cost of doing DC ops well is investment in standards, DCIM,
trained staff, vendor management, and the disciplined operations
that compound. The cost of doing it poorly is the night when the
backup generator doesn't start, the cooling fails on the hottest
day of the year, the auditor finds the unescorted-visitor log
gap, or the data centre fills up six months before the planned
expansion is ready.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Generator load-bank test skipped or deferred past schedule (Tier-III/IV concurrent-maintainability weakening)
- UPS battery age past manufacturer's recommended replacement (silent SPOF accumulation)
- PUE creeping up quarter-over-quarter (cooling efficiency / airflow management drift)
- Cabling not labelled to BICSI / TIA-942 (operational MTTR balloon)
- Visitor / contractor unescorted-access exception log gap (compliance + physical-security weakening)
- Capacity headroom < 6 months without expansion plan
- Vendor SLA breach not actioned within contractual window
- DCIM data stale > 90 days (rack-level capacity reporting drift)
- Hot/cold aisle containment broken by ad-hoc cabling
- Fire-suppression test deferred (life-safety + insurance compliance)

**Refinement candidates**:

- New tier-mapping row when a customer SLA shifts tier requirement
- New cross-reference when a sister skill (cloud-architecture, esg-reviewer, ops-reviewer) adds a DC gate
- New operational-handoff checklist row when a recurring incident class emerges
- Tightening of the PUE / WUE / CUE target when ESG commitments tighten
