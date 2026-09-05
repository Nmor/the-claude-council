# Competitive-Parity Per Phase (Always-On, Global)

> Auto-fires on every file. Sister to
> `post-phase-retrospective-review.md` (the five-step retrospective this
> rule extends by ONE step), `task-intake-due-diligence.md` (Q1 prior-art
> sweep + Q5 SOTA scan — this rule turns them into an ongoing per-phase
> discipline, not a one-shot at intake), `no-silent-drops.md` (missed
> parity dimensions are silent drops of user-visible value),
> `principal-level-mandate.md` (a principal-level artefact ships
> discoverable, not just built).

## Core Principle

**At every phase / wave / release boundary, run a competitive-parity
check as Step 6 of the retrospective sweep: audit what we just shipped
against what the leading competitors already have, and file the gaps as
tracked tasks in the next wave. A wave that closes without a parity
scan is incomplete — parity work that ships without discovery filters
is invisible. The scan runs light per phase and deep per wave; the
reference competitor set refreshes annually (or immediately on a
material market shift).**

## Standards this rule implements

- **SWOT / competitive gap analysis** (Porter 1980, standard MBA
  strategic-planning discipline) applied at engineering release
  cadence rather than annual review — matches the 2026 shift toward
  compressed release cycles.
- **Discoverability requirement** — WCAG 2.2 §3.3.5 (help /
  discoverability) applied to feature findability, not just accessible
  UI.
- **RFC 9700 + OAuth 2.1 patterns** — the same "don't ship yesterday's
  spec" discipline this rule enforces at the feature level (competitors'
  current shipments = today's spec).

## Hard rules

### 1. Competitive-parity check is Step 6 of the retrospective

Every phase / wave / release boundary that runs the five-step retro
per `post-phase-retrospective-review.md` also runs a sixth step —
**parity scan**. Skipping it equals skipping any other step: the
phase is not closed.

### 2. Output shape (durable in the plan's change log)

```text
Competitive parity (this phase/wave):
  Just shipped: <one-line summary>
  Competitor scan:
    - <competitor> — <feature they ship / we don't>
    - <competitor> — <feature they ship / we don't>
  New parity tasks:
    - <ID>: <short description> → landed in <wave/phase>
  Backlog (deferred with rationale):
    - <ID>: <feature> → deferred to <wave> because <why>
```

Absent output = absent step. The check produces a written artefact,
not a "we thought about it" claim.

### 3. Cadence — light per phase, deep per wave, refresh per year

- **Per phase** (inside a wave): light-touch scan — did we ship the
  phase's parity commitments? What did competitors ship since the wave
  started that we noticed in trade press / release notes?
- **Per wave-close**: deep scan — full competitor sweep across the
  wave's domain; gap list flows into the NEXT wave's task list.
- **Per year**: refresh the reference competitor set — some sink
  (Vine, Meerkat), others rise (Kick, Substack, TikTok Live). Frozen
  sets go stale.
- **Ad-hoc**: when a major competitor ships a headline feature the
  same day, treat as an unplanned parity trigger — file as a
  follow-up regardless of the retro cadence.

### 4. Reference competitor set is domain-specific + locked per plan

Every project plan declares its reference set at plan-authoring time
(a table by domain). Locked = doesn't change mid-wave. Refresh at
wave-close or annually. Example shape from Unvamp:

| Domain | Reference competitors (2026) |
| --- | --- |
| Ticketing | Eventbrite, DICE, Ticketmaster, Universe, RA |
| Streaming | Twitch, YouTube Live, Kick, Mux, MediaMTX |
| Payments | Stripe, Adyen, Paystack |
| Discovery | Bandsintown, Songkick, Eventbrite Explore |
| Wallets | Apple Wallet, Google Wallet |
| Compliance | Stripe Tax, TaxJar, Avalara |

### 5. Sources are primary — competitors' own docs, not press summaries

Per `official-docs-first.md`, cite:

- Competitor help centres + product pages (Ticketmaster Help,
  Eventbrite features page, DICE help centre).
- Standards + RFCs the competitors implement (LL-HLS specification,
  OAuth 2.1 draft, EU VAT Directive Art. 226, etc.).
- Independent trade press ONLY for recent-shipment discovery (last
  12–24 months) — the primary source then follows up.

Never trust a Reddit thread or a Stack Overflow answer as the sole
citation for "competitor X ships feature Y."

### 6. Discovery-parity rider

**Parity work that isn't discoverable delivers zero user-visible
value.** When a phase ships new feature dimensions (wallet-pass,
reserved seating, BNPL, age gates, etc.), **discovery filters for
those dimensions ship in the SAME phase / wave.** A "we shipped it
but you can't find it" is a silent drop of the parity work — a rule
violation.

The filter surface lives at the search / discovery / explore layer;
each new feature emits a boolean facet (or numeric range where
applicable) the search UI can toggle.

### 7. Gaps flow to the next wave, not perpetual backlog

Every gap found in the scan is filed as a NEW task in the next wave
OR explicitly deferred to a named later wave with a written rationale
(cost, dependency, market not yet asking). "Backlog" alone is not a
disposition — every row lists its next-wave target.

### 8. The refresh signal

Refresh the reference competitor set annually AND when any of:

- A referenced competitor deprecates a whole product line
  (Vine 2017-style sunset).
- A material new entrant ships in the plan's domain (Kick vs Twitch;
  Substack Notes vs Twitter).
- A regulatory shift materially changes what "parity" means (EU AI
  Act, PSD3, Digital Services Act enforcement rounds).

Refresh is a plan edit that re-locks the set for the next 12 months.

### 9. The rule fires even at solo phases

Even a "typo fix" phase runs Step 6 in abbreviated form — usually a
one-line "no competitor delta; typo fix." A phase that touches a
user-visible surface never gets the abbreviated form.

## Anti-patterns

- **One-shot parity wave** — treating parity as a single "catch-up"
  wave rather than an ongoing per-phase discipline. Rule 1 violation.
- **Silent parity backlog** — a running list of "features competitors
  have" that nobody prioritises into a wave. Rule 7 violation.
- **Built-but-hidden** — new feature dimensions ship without discovery
  filters. Rule 6 (Discovery-parity rider) violation.
- **Frozen reference set** — using the 2020 competitor list in 2026.
  Rule 8 violation.
- **"We thought about it"** — verbal parity claim without the written
  artefact. Rule 2 violation.
- **Press-summary citation** — "TechCrunch says Competitor X ships Y"
  without the primary-source URL. Rule 5 violation.

## Cross-references

- `post-phase-retrospective-review.md` — this rule adds Step 6 to
  the retrospective sweep
- `task-intake-due-diligence.md` — Q1 prior-art + Q5 SOTA scan feed
  the initial reference set
- `no-silent-drops.md` — missed parity dimensions are silent drops
- `official-docs-first.md` — primary-source citations for competitor
  scans
- `principal-level-mandate.md` — a principal-level artefact ships
  discoverable, not just built
- `plan-execution-progress.md` — every phase's progress update
  carries the Step 6 output block

## Why this rule exists

**The one-shot parity wave anti-pattern.** Teams schedule a "catch up
to competitors" phase, ship it, and then drift back into feature-idea
work that ignores the competitive frontier. Six months later the same
competitors have shipped six more things and the parity gap re-opens.
The fix is discipline: every phase / wave ends with a scan. It's
cheap to run (an hour), costly to skip (a re-opening quarterly gap).

**The built-but-hidden anti-pattern.** A team ships wallet passes,
reserved seating, BNPL, age gates — and none of them are filter
options in the search UI. Attendees can't find the events using
these features. The parity work is invisible; the ROI approaches
zero. The Discovery-parity rider forces the filter to ship in the
same wave.

User directive (verbatim, 2026-08-15): *"update the consolidated plan
for all waves to have Competitive parity which where you look at what
was built in a phase and what had been built before that wave to see
what competitors have that we do not have and build them. This is to
be done along side followups and gap analysis at the end of every
part/phase/wave."*

## Learning hooks

Signals to watch + refinement candidates for this rule live in the
`council-maintenance` skill, which auto-fires when you touch a rule, skill,
agent or CLAUDE.md — i.e. exactly when you are refining the framework. They are
instructions for maintaining THIS ARTIFACT, not for doing the task at hand, so
they load then rather than on every turn.
