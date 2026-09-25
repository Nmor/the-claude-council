# Rationale + Learning Hooks

> Covers why this skill exists (the failure modes a single payment defect produces) and the
> continuous-learning signals + refinement candidates for maintaining it. Pointed at by the
> "Rationale + learning hooks" row of the reference map in `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Why This Skill Exists

Payment is the rare domain where a single defect can:

- Charge customers twice (consumer complaints, scheme fines,
  CFPB enforcement)
- Double-pay sellers (financial loss + recovery effort)
- Leak PAN (PCI breach: average cost $4.5M per Verizon DBIR 2025)
- Fail SCA (EU regulators fine up to 4% global turnover)
- Auto-renew without notice (CA AB-390 + state AG enforcement)

Every one of those failure modes has been documented in real
production incidents at companies whose engineering teams were
otherwise excellent. The patterns above are the institutional
memory of two decades of payment-engineering scar tissue —
encoded so the next engineer doesn't relearn them at the cost
of customer money and brand trust.

Payment systems require principal-level depth because the
combinatorial surface — N processors × M card schemes × K bank
rails × J currencies × I regulatory regimes — exceeds what
intuitive engineering survives. Every shortcut becomes a CSV row
in a compliance audit two years later.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Payment POST shipped without `Idempotency-Key` header (rule violation; double-charge risk)
- Raw PAN written anywhere in source / logs / fixtures (Anti-pattern 1; immediate PCI scope blast)
- Processor 200 treated as money-moved without settlement reconciliation step (Anti-pattern 3)
- Webhook handler missing signature verification (Anti-pattern 4; forgery exposure)
- Subscription auto-renews without pre-renewal notification (CA / EU / UK regulatory exposure)
- Hard-coded currency precision (USD = 2 decimals assumption breaks JPY / KWD)
- Subscription dunning state machine has < 3 retry tiers (involuntary churn elevated)
- Network tokens not preferred over card-id (Account Updater value lost; auth rate drops)
- 3DS rich-data fields under-populated (frictionless rate drops below 70% benchmark)
- Refund state coupled to order state in same field (refund + delivered state can't co-exist)
- Marketplace flow lacks KYC/KYB gate (AML 6AMLD / FinCEN exposure)
- User-facing error leaks issuer state ("insufficient_funds" verbatim)
- Idempotency cache key uses only the key (no tenant + endpoint + api_version composition) — Pattern
  1a violation; cross-tenant / cross-endpoint collision risk
- In-progress idempotency collision returns 200 with stale response instead of 409 — Pattern 1b
  violation; double-execution under concurrent retry
- Payload-hash binding absent — same key + different body returns stale cached response
  (Anti-pattern 11; receipt-shape drift)
- Idempotency cache in-memory only (no durable backing) — Anti-pattern 12; cache wipes on Lambda
  restart / pod recycle
- TTL too short for operation class (e.g., 1h for payouts that have 5-day weekend retry windows) —
  Pattern 1d weakening
- Multi-region idempotency cache lacks cross-region consistency model — Pattern 1e weakening;
  duplicate execution during failover
- Server generates idempotency key instead of client — Pattern 1f violation; defeats purpose for
  crash-retry
- Webhook event-id dedupe missing — duplicate handler execution on provider retry; Pattern 1g
  weakening
- Custodial escrow shipped without MTL portfolio — Anti-pattern 10 violation; criminal exposure in
  NY / CA / TX
- Trust account commingled with operating cash — Anti-pattern 9 violation; license suspension
  trigger
- Escrow released immediately on payment confirmation (no hold window / dispute window) —
  Anti-pattern 13; fraud-loss exposure
- Platform-escrow not preferred over custodial when processor-as-holder is available — unnecessary
  licensing burden
- Marketplace 1099-K reporting absent for settlements ≥ $600 (IRS rule effective 2024) — compliance
  gap
- OFAC sanctions screening missing on fund-in OR fund-out — AML / OFAC violation; per-transaction
  max $1.7M penalty
- FinCEN BOI rule (effective Jan 2024) not implemented on platform's beneficial owners — federal
  reporting violation
- FX policy undocumented for cross-border escrow — CFTC scrutiny if forwards used; unhedged FX
  exposure
- Escrow dispute workflow lacks documented SLA + escalation to arbitration — buyer trust erosion
- 1031 QI integration treats funds as operating cash (vs trust) — Treas. Reg. §1.1031(k)-1
  violation; lost tax-deferral status

**Refinement candidates**:

- New processor / rail row when a new payment method gains adoption (e.g., FedNow merchant launch,
  PIX expansion outside Brazil, UPI international)
- 3DS frictionless-rate target update when EMVCo / EBA refine RTS guidance
- Network-token coverage update as VTS / MDES / AETS expand to new card types
- Reconciliation pattern addendum when a recurring discrepancy class (e.g., on-behalf-of fee
  allocation, dynamic-FX timing) surfaces in audits
- Multi-currency presentation update when new local-payment-method (LPM) launches require
  currency-specific flows
- Dispute-evidence template when scheme rules change (Visa VAMP, Mastercard FRMS, Amex Excessive
  Disputes Program thresholds)
- New idempotency-store backend row when a new durable / cross-region-consistent option emerges
  (e.g., FoundationDB, ScyllaDB Lightweight Transactions)
- New escrow taxonomy row when a recurring custody shape emerges (e.g., stablecoin escrow,
  on-chain-smart-contract escrow, BaaS-partner-bank custody)
- TTL-per-operation-class update when industry benchmarks shift (e.g., FedNow extends settlement
  window, SEPA Instant goes 24/7/365)
- State-MTL row update when a US state changes bonding / capital / examination requirements (CSBS
  publishes annual updates)
- Cross-border escrow FX policy update when CFTC / ESMA tightens forward-contract disclosure

---

*Last verified: 2026-05-30. Standards version refresh cadence: 6 months for processor APIs;
semi-annual for scheme rules; annual for PSD3 RTS proposals.*
