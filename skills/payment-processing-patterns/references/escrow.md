# Escrow + Trust Accounts

> Covers Core Pattern 11 — escrow taxonomy and licensing, the Stripe Connect delayed-transfer
> shape, the escrow state machine, trust-account segregation, real-estate / M&A / 1031-QI
> specifics, goods-marketplace simple hold, reserves, cross-border FX, AML / KYC / KYB, and the
> dispute + reversal workflow. Pointed at by the "Escrow + trust accounts" row of the reference
> map in `SKILL.md`.
>
> **Size budget: 12 KB** — `token-budget.mjs --check`.

## Core Patterns

### Pattern 11: Escrow + trust-account separation

Escrow holds funds in a fiduciary account between buyer
payment + condition-of-release (delivery, milestone, dispute
resolution). Engineering escrow is principally a LICENSING +
LEDGER + STATE-MACHINE problem, not a code problem — get the
licensing wrong and the platform is operating an unlicensed
money-transmission business, criminal exposure in most US
states.

**11a. Escrow taxonomy.** Distinguish four shapes:

| Shape | Example | Holder of funds | Licensing |
| --- | --- | --- | --- |
| **Platform escrow (marketplace)** | Stripe Connect with delayed transfers, Adyen for Platforms, Square Multiparty | The processor (Stripe/Adyen/Square is licensed) | Platform inherits processor's licensing; usually NO platform MTL needed |
| **Simple hold + release** | Goods marketplaces (eBay-style) — authorise card on order, capture on shipment, refund on cancellation | Issuer (uncaptured auth) | None; no funds held by platform |
| **Custodial escrow** | Crypto trading custody, real-estate earnest money, M&A holdback | Platform holds beneficial title (or via partner bank) | State Money Transmitter Licenses (MTL) in 48 US states + NY BitLicense for crypto; FinCEN MSB registration; bonding requirements |
| **Third-party escrow agent** | Escrow.com (delegate), 1031-exchange Qualified Intermediary (QI), title-company closing escrow | External licensed entity | Platform integrates with licensed agent; agent holds; less licensing burden |

The decision: PREFER processor-as-holder (platform escrow)
over custodial escrow whenever possible. The licensing,
bonding, AML, IRS 1099-K, OFAC screening, and audit cost of
custodial escrow runs $500K-$2M/year per platform; platform
escrow inherits those for free from Stripe / Adyen.

**11b. Stripe Connect "delayed-transfer" pattern.** The
canonical engineering shape for marketplace escrow:

```typescript
// 1. Buyer pays — funds settle to PLATFORM Stripe account
const charge = await stripe.paymentIntents.create({
  amount: 10000, currency: 'usd',
  payment_method: 'pm_...', confirm: true,
  // NOT using transfer_data — that's "destination charge"
  // which transfers immediately. We want to HOLD.
  metadata: { order_id: 'ord_123', seller_account: 'acct_xxx' },
}, { idempotencyKey: orderIdempotencyKey });

// 2. Buyer confirms delivery — release to seller
const transfer = await stripe.transfers.create({
  amount: 9000, // 10000 - 1000 platform fee
  currency: 'usd',
  destination: 'acct_xxx', // connected seller account
  source_transaction: charge.latest_charge,
  metadata: { order_id: 'ord_123' },
}, { idempotencyKey: `release-${orderId}` });

// 3. Buyer disputes — refund (don't transfer)
const refund = await stripe.refunds.create({
  payment_intent: charge.id,
  metadata: { order_id: 'ord_123', reason: 'item_not_received' },
}, { idempotencyKey: `refund-${orderId}` });
```

Funds sit in the platform's Stripe balance — Stripe is the
licensed holder, NOT the platform. Adyen for Platforms ESCROW
account flag = equivalent. Square Multiparty `customer_id` +
hold pattern = equivalent.

**11c. Escrow state machine.** Every escrow operation has a
state machine with explicit transitions:

```text
created → funded → held → released | refunded | disputed → resolved
                                ↓
                            partial_released ← partial_refunded
```

- **created**: order placed; no funds yet
- **funded**: buyer charged; funds in platform balance
- **held**: in escrow window (timed: e.g., 14-day return window)
- **released**: condition-of-release met (delivery confirmed,
  milestone approved, deadline expired with no dispute)
- **refunded**: dispute resolved in buyer's favour
- **disputed**: pending resolution; SLA-bound
- **partial_released**: split between buyer + seller (e.g.,
  damaged-item partial-refund)

Each state-transition is an immutable journal entry per
`bookkeeping-patterns` — escrow is a TRUST account in
accounting terms; commingling escrow funds with operating
funds is a per-state criminal offense.

**11d. Trust-account segregation (when platform IS holder).**
For custodial escrow without a processor-holder, the platform
operates a TRUST ACCOUNT:

- **Separate bank account**: trust account is legally distinct
  from operating cash; the bank typically titles it "FBO
  customer name" (For Benefit Of) — NOT in the platform's
  general ledger as an asset, but as a liability owed to the
  beneficiary
- **No commingling**: a single dollar of platform operating
  cash entering the trust account triggers regulatory penalty;
  ditto reverse
- **Reconciliation cadence**: daily three-way reconciliation
  (bank statement ↔ trust ledger ↔ beneficiary sub-accounts);
  state regulators audit
- **Per-state MTL requirements**: NY DFS Part 200 + 417 (for
  crypto: BitLicense), CA DFPI, TX DOB, FL OFR — each has its
  own bonding requirement ($25K-$10M), examination cycle,
  net-worth requirement, and reporting cadence
- **Federal FinCEN MSB registration** (31 CFR §1022.380)
  required if doing money-transmission across state lines
- **IRS 1099-K reporting** for marketplace settlements ≥ $600
  (since 2024)
- **OFAC sanctions screening** on every party — automated
  screening against SDN list at fund-in + fund-out

**11e. Real-estate + M&A escrow specifics.**

- **Earnest money in real estate**: held by title company or
  licensed escrow agent; released to seller on closing OR
  returned to buyer on contingency-failure; engineering shape
  is INTEGRATION with the agent's API (Qualia, SoftPro,
  ResWare), not custody
- **1031 exchange Qualified Intermediary (QI)**: IRC §1031
  requires a QI to hold funds between sale + purchase of
  like-kind property; tax-deferred basis transfer; QI rules
  are STRICT — bonded, segregated, time-limited (180 days)
- **M&A holdback / indemnity escrow**: portion of purchase
  price held 12-36 months post-close to satisfy reps-warranties
  claims; held by independent escrow agent (banks, JPMorgan,
  Citi Private, SRS Acquiom); engineering is data + reporting
  integration, not custody

**11f. Goods-marketplace simple-hold (Article 9 UCC).** When
selling tangible goods, the simplest "escrow" pattern is
authorise-without-capture:

```typescript
// On order placement: AUTHORISE (do NOT capture)
const intent = await stripe.paymentIntents.create({
  amount: 5000, currency: 'usd',
  payment_method: 'pm_...', confirm: true,
  capture_method: 'manual', // KEY: authorise, don't capture
}, { idempotencyKey: orderKey });

// On ship: CAPTURE within 7 days (auth-hold expiry varies by issuer)
await stripe.paymentIntents.capture(intent.id, {
  amount_to_capture: 5000, // can capture LESS for partial fulfilment
}, { idempotencyKey: `capture-${orderId}` });

// On cancel-before-ship: CANCEL the auth (no funds moved)
await stripe.paymentIntents.cancel(intent.id, {
}, { idempotencyKey: `cancel-${orderId}` });
```

Pros: no platform-side custody; no MTL; no commingling risk.
Cons: auth-holds expire (7 days typical, 30 days for some
issuers); not a true escrow (funds NEVER held by platform);
no protection against issuer-revocation between auth + capture.

**11g. Reserve + chargeback float.** Even with platform-escrow
(rule 11b), the processor holds back a RESERVE — typically
1-5% of rolling 60-90-day volume — against future chargebacks +
refunds. Document the reserve liability on the platform
balance sheet; release schedule per processor's terms.
Sellers' visible "available balance" must subtract their
share of the reserve, OR the platform bears the reserve
cost (commonly the case for trust + brand reasons).

**11h. Cross-border escrow + currency.** Escrow holding funds
in currency X for beneficiary expecting currency Y carries
FX risk:

- **Lock FX at release-time**: cheaper but buyer/seller bear
  exposure during hold
- **Lock FX at funding-time**: platform bears 1-N day FX risk
  during hold; hedge via FX-forward contracts
- **Document FX policy**: regulator audits this; CFTC if
  forward contracts involved

**11i. AML / KYC / KYB on escrow flows.** Every escrow
transaction triggers AML scrutiny:

- KYC on payer (already done at signup; refresh per AMLD6)
- KYB on beneficiary (business profile, beneficial-owner
  identification per FinCEN BOI rule effective Jan 2024)
- Transaction monitoring (sudden volume spike → SAR filing)
- Sanctions screening (OFAC SDN, EU CFSP, UK OFSI, UN 1267)
  at every fund-in AND fund-out
- Per-state cash-equivalent reporting (NY CTR equivalent, IRS
  Form 8300 for cash > $10K)

Per `~/.claude/skills/owasp-asvs` + GDPR-equivalent KYC data
retention (typically 5-7 years post-relationship close).

**11j. Escrow disputes + reversal.** Build a documented
DISPUTE WORKFLOW:

1. Buyer files dispute via UI (with evidence: photo, message
   logs, tracking)
2. Seller has documented SLA to respond (e.g., 72h)
3. Platform reviews; can request more evidence
4. Resolution: full-refund, partial-refund, release-to-seller,
   split (each is an explicit state transition)
5. Either party can escalate to ARBITRATION (third-party agent
   like American Arbitration Association, Modria, online
   dispute resolution platform)
6. Final outcome triggers ledger settlement + notifications

Per `~/.claude/rules-library/common/audit-logging.md` — every dispute
step is an immutable audit event; legal-hold blocks deletion
during active disputes.
