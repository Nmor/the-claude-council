---
name: payment-processing-patterns
description: Principal-level patterns for accepting card / bank / wallet / instant-rail payments — idempotency, 3DS2 + SCA, network tokenization, subscriptions, dunning, refunds + chargebacks, payouts, ledger reconciliation. Sister to pci-dss-patterns (compliance) and bookkeeping-patterns (double-entry).
---

# Payment Processing Patterns

> One-line mission: every dollar accepted, refunded, or paid out
> moves through an idempotent, auditable, scheme-compliant flow
> with explicit failure semantics — never a silent retry,
> never a double-charge, never an opaque "payment failed."

## Purpose

Principal-level guidance for building systems that accept payment
across cards (Visa / Mastercard / Amex / Discover / JCB / UPI /
Diners), bank rails (ACH NACHA, SEPA, FedNow / RTP, Faster
Payments, PIX, UPI), wallets (Apple Pay / Google Pay / PayPal /
Cash App / Venmo / Alipay / WeChat Pay), and instant transfer
networks. Covers checkout, recurring subscriptions, marketplace
split payments, payouts to merchants / sellers / 1099 contractors,
refunds, partial captures, dispute / chargeback lifecycle,
reconciliation against processor settlement files, and ledger
double-entry per `bookkeeping-patterns`.

**Out of scope (deliberate)**:

- PCI-DSS compliance mechanics — covered by `pci-dss-patterns`
- Double-entry bookkeeping mechanics — covered by `bookkeeping-patterns`
- Revenue recognition under IFRS 15 / ASC 606 — covered by `ifrs-gaap-reporting`
- Tax calculation (sales tax, VAT, GST) — separate vendor concern
- FX hedging / treasury — separate `fp-and-a` skill
- Crypto rails — separate concern (consult on-chain payment skill when added)

## Standards Cited

- **PCI-DSS v4.0.1** (2024) — `pci-dss-patterns` is the primary
  home; this skill assumes scope reduction via tokenization
- **PSD2** + **EBA RTS on SCA** (Reg EU 2018/389) — Strong
  Customer Authentication
- **3-D Secure 2.3** (EMVCo) — frictionless authentication
- **EMV Co Network Tokenization Framework** (2023) — VTS, MDES,
  AETS, DiscoverPay token services
- **ISO 20022** — message format for modern bank rails (SEPA Inst,
  FedNow, RTP, CHAPS, TARGET2)
- **ISO 8583** — legacy card-scheme message format
- **NACHA Operating Rules** (2025 release) — US ACH
- **SEPA Rulebook v1.0** (2025) — SCT, SCT Inst, SDD Core, B2B
- **Reg E** (12 CFR §1005) — US electronic funds transfer
  consumer protections
- **Reg Z** (12 CFR §1026) — US Truth in Lending (credit / chargebacks)
- **EFTA** (15 USC §1693) — Electronic Funds Transfer Act
- **Visa Core Rules + Visa Product and Service Rules** (latest
  edition; updated semi-annually)
- **Mastercard Chargeback Guide + Mastercard Rules**
- **American Express Merchant Reference Guide**
- **RFC 9111** — HTTP caching (idempotency-key cache semantics)
- **RFC 9110 §9.2.2** — HTTP method idempotency
- **Stripe API Reference** — `Idempotency-Key` header convention
  (de facto industry standard)
- **Open Banking UK Standard v3.1.11** — PSD2 UK implementation
- **FDX (Financial Data Exchange) v6.0** — US open banking
- **W3C Payment Request API + Payment Handler API** — browser
  surface
- **W3C Secure Payment Confirmation** — biometric SCA in-browser
- **FinCEN MSB Registration** (31 CFR §1022.380) — federal
  money-services-business registration for custodial escrow
- **NY DFS Part 200 + Part 417** — New York Money Transmitter
  - BitLicense for crypto custody
- **State Money Transmitter Licenses** — 48 US states + DC + PR;
  Conference of State Bank Supervisors (CSBS) one-stop NMLS
  filing
- **AMLD6** (Directive (EU) 2018/1673) — EU 6th Anti-Money
  Laundering Directive
- **FinCEN BOI Rule** (31 CFR §1010.380, effective Jan 1, 2024) —
  Beneficial Ownership Information reporting
- **IRC §1031** + **Treas. Reg. §1.1031(k)-1** — Qualified
  Intermediary requirements for tax-deferred exchange
- **OFAC SDN List** + EU CFSP + UN 1267 — sanctions screening
- **IRS Form 8300** + **CTR** (FinCEN Form 112) — cash-equivalent
  transaction reporting
- **Article 9 UCC** — secured transactions; auth-hold pattern
  uses pre-Article-9 issuer-bank contractual mechanism
- **NACHA Operating Rules — Same Day ACH + WEB Debit** — escrow
  release rails

## When to Fire

File path triggers:

- `**/payments/**`, `**/billing/**`, `**/invoices/**`,
  `**/checkout/**`, `**/orders/**`, `**/subscriptions/**`,
  `**/refunds/**`, `**/chargebacks/**`, `**/disputes/**`,
  `**/payouts/**`, `**/ledger/**`, `**/transfers/**`,
  `**/wallet/**`, `**/escrow/**`, `**/trust-account/**`,
  `**/marketplace/**`, `**/holdback/**`, `**/qi-1031/**`,
  `**/idempotency/**`
- Imports / SDK use: `stripe`, `@stripe/*`, `adyen`,
  `@adyen/*`, `braintree`, `@paypal/checkout-server-sdk`,
  `square`, `@square/web-sdk`, `paystack`, `flutterwave`,
  `razorpay`, `mollie`, `klarna`, `affirm`, `afterpay`,
  `@cashfreepayments/*`, `plaid`, `@plaid/*`

Keyword triggers:

- "idempotency", "PaymentIntent", "Charge", "Refund", "Capture",
  "3DS", "SCA", "PSD2", "tokenization", "PAN", "BIN",
  "chargeback", "dispute", "interchange", "ACH", "SEPA",
  "FedNow", "RTP", "Wire", "Payout", "Subscription", "Dunning",
  "MRR", "MMR", "reconciliation", "settlement file",
  "escrow", "trust account", "FBO", "money transmitter",
  "MTL", "BitLicense", "MSB", "Qualified Intermediary",
  "1031 exchange", "earnest money", "holdback", "indemnity escrow",
  "OFAC", "SDN", "BOI", "AMLD6", "KYB", "marketplace split"

Change-scope triggers:

- Any new payment processor integration
- Any change to checkout flow
- Any change to subscription billing logic
- Any change to refund / chargeback handling
- Any change to payout / transfer flow
- Any new currency / locale / market launch

## Core Patterns

### Pattern 1: Idempotency keys on every mutation

```typescript
// CORRECT — client generates UUID v4/v7; sends on every retry-eligible call
const idempotencyKey = crypto.randomUUID();
const intent = await stripe.paymentIntents.create({
  amount: 5000, currency: 'usd', customer: 'cus_...',
  payment_method: 'pm_...', confirm: true,
}, { idempotencyKey });
```

Per `~/.claude/rules-library/common/idempotency.md` + Stripe's
Idempotency-Key convention — every POST that moves money,
issues a refund, transfers funds, creates a payout, or
modifies a subscription carries an idempotency key. The
following sub-patterns make idempotency PRINCIPAL-LEVEL
correct, not just present.

**1a. Cache-key composition.** The server-side dedupe cache
key is NEVER the idempotency_key alone. It is the tuple:

```text
cache_key = sha256(tenant_id + ":" + endpoint + ":" + api_version + ":" + idempotency_key)
```

Reasons:

- **Multi-tenant isolation**: tenant A's key cannot collide
  with tenant B's (intentional or otherwise)
- **Endpoint scoping**: same key sent to `POST /charges` vs
  `POST /refunds` must NOT alias to the same result
- **API-version pinning**: a key replayed against a new API
  version with a different response shape is a different
  request; cache it separately to prevent shape drift
- **SHA-256 hash**: cache backends with key-length limits
  (Redis 512MB ceiling, DDB 2KB SK limit) stay safe

**1b. In-progress collision (HTTP 409).** When a second
request with the SAME key arrives while the FIRST is still
processing (network retry mid-flight; concurrent click), the
server MUST NOT execute twice. The pattern:

```typescript
// Atomic INSERT ... ON CONFLICT DO NOTHING with status='in_progress'
const inserted = await db.query(`
  INSERT INTO idempotency_log (cache_key, status, request_hash, started_at)
  VALUES ($1, 'in_progress', $2, NOW())
  ON CONFLICT (cache_key) DO NOTHING
  RETURNING id
`, [cacheKey, requestHash]);

if (inserted.rowCount === 0) {
  // Lookup existing entry
  const existing = await db.query(
    'SELECT status, response_body, request_hash FROM idempotency_log WHERE cache_key=$1',
    [cacheKey]);
  if (existing.rows[0].status === 'in_progress') {
    return res.status(409).json({
      error_code: 'idempotency_in_progress',
      message: 'A request with this key is currently processing.',
      retry_after_ms: 500,
    });
  }
  if (existing.rows[0].request_hash !== requestHash) {
    // Same key, different payload — reject hard
    return res.status(422).json({
      error_code: 'idempotency_key_payload_mismatch',
      message: 'This idempotency key was previously used with a different request body.',
    });
  }
  // Replay — return cached response
  return res.json(JSON.parse(existing.rows[0].response_body));
}

// First-time execution path
try {
  const result = await processPayment(req.body);
  await db.query(
    'UPDATE idempotency_log SET status=$1, response_body=$2, finished_at=NOW() WHERE cache_key=$3',
    ['succeeded', JSON.stringify(result), cacheKey]);
  return res.json(result);
} catch (err) {
  await db.query(
    'UPDATE idempotency_log SET status=$1, response_body=$2 WHERE cache_key=$3',
    ['failed', JSON.stringify({ error_code: err.code }), cacheKey]);
  throw err;
}
```

**1c. Payload-hash binding.** Stripe's convention: when a
client reuses an Idempotency-Key with a DIFFERENT payload,
the server returns an error rather than silently returning
the cached result for the old payload. Hash the canonical
JSON of the request body (sorted keys, normalised numbers)
and store alongside the cache entry. On replay, compare
hashes; on mismatch, return HTTP 422 `idempotency_key_payload_mismatch`.

**1d. Replay-attack window (TTL).** The cache lives for a
bounded period AFTER which the same key executes fresh:

| Operation class | TTL | Rationale |
| --- | --- | --- |
| Default (Stripe) | 24 hours | Covers 99.9% of legitimate retry windows |
| Payments / withdrawals / payouts | 7 days | Covers weekend + holiday delivery delays |
| Refunds / chargebacks | 30 days | Bank-side processing windows |
| Marketplace fund transfers | 14 days | Cross-jurisdiction settlement delays |
| One-off Bulk operations | 90 days | Compliance + reconciliation window |

After expiry, the same key with the same payload WILL execute
again. Clients that need beyond-TTL retries MUST generate a
new key. Document the TTL in API docs.

**1e. Multi-region key-store consistency.** The cache MUST
provide cross-region consistency at the latency tier that
matches the call frequency:

| Backend | Consistency model | When to use |
| --- | --- | --- |
| **DynamoDB Global Tables** | Last-writer-wins, eventually consistent (~1s cross-region) | Default; sufficient for 24h TTL |
| **Aurora Global Database** | Single-region writer + 1-second cross-region replication | When join with payment state required |
| **Redis Active-Active (CRDT)** | Cluster-side CRDT merge | When sub-100ms in-region SLA needed AND tenant-pinned routing acceptable |
| **Spanner / CockroachDB** | Strong consistency, multi-region | Highest stakes; financial regulators require atomic single-truth |

Pin the cache backend ONLINE during a deploy / failover; if
two regions process the same key before replication catches
up, the second region returns the cached result from the
slow stream — which may be a "succeeded" duplicate, not the
first-region's failure. Mitigation: short-circuit via a single
write-region for idempotency log, OR use a sticky-region cookie
on every retry from the same client.

**1f. Idempotency-key generation requirements.** The CLIENT
generates the key (NEVER the server, which would defeat the
purpose for retried requests). Requirements:

- **Format**: UUID v4 (random) or UUID v7 (time-ordered;
  better index locality)
- **Length**: 128 bits minimum; Stripe accepts up to 255 chars
- **Lifetime**: ONE key per LOGICAL operation. NOT per HTTP
  retry — the retry MUST reuse the same key. Documenting this
  in client SDK is non-negotiable.
- **Storage**: client persists the key with the operation
  intent BEFORE making the call; on retry (after crash,
  network failure), the SAME key is replayed

**1g. Webhook idempotency.** Per `idempotency.md` rule 3 —
the webhook handler is itself a retry-prone surface. The
provider redelivers on 5xx, on timeouts, and on receiver-
side errors. Every handler:

1. Verifies signature (per Anti-pattern 4)
2. Extracts the EVENT ID (Stripe `evt_...`, Adyen `eventCode`+`pspReference`)
3. Looks up event id in `webhook_processed_events` table
4. If first-time: execute handler in same DB transaction as
   insert into `webhook_processed_events`
5. If replay: return 200 immediately (provider stops retrying)
6. TTL: 30 days for Stripe, 90 days for Adyen

**1h. Idempotency observability.** Track + alert on:

- `idempotency_replay_rate{endpoint}` — high replay rate signals
  client retry storm
- `idempotency_collision_rate{endpoint}` — HTTP 409 rate;
  high means concurrent click-spam or retry-without-key-rotation
- `idempotency_payload_mismatch_rate` — should be near zero;
  spike means either client bug or replay attack
- `idempotency_cache_miss_after_failure_rate` — re-execution
  after the cache entry's TTL expired but the operation already
  ran; surfaces TTL mis-sizing

### Pattern 2: PaymentIntent state machine (not raw Charge)

Modern payment APIs are state machines (`requires_payment_method`
→ `requires_confirmation` → `requires_action` (3DS) → `processing`
→ `succeeded` | `requires_payment_method` (failed; retry) |
`canceled`). Always reason about the state machine; never assume
`succeeded` from a 200 HTTP response — read `intent.status` AND
`intent.latest_charge.status`.

### Pattern 3: 3DS2 + SCA — frictionless first

PSD2 SCA Article 97 requires two-of-three factors (knowledge /
possession / inherence) for EEA cardholder-not-present
transactions above €30 (with exemptions: TRA, low-value, MIT,
allowlisted-merchant, corporate). The 3DS2 flow lets the issuer
attempt frictionless authentication using device + behavioural
signals; only escalates to challenge (OTP, biometric) when
required. Send rich data fields (browser fingerprint, IP, device
binding, shipping = billing flag, prior transaction with
merchant) to maximise frictionless-rate. Track issuer 3DS
fail-rate per BIN range and surface to product.

### Pattern 4: Network tokenization

Store the **network token** (Visa Token Service / Mastercard
Digital Enablement Service), not the PAN. Network tokens:

- Survive card re-issuance (lower involuntary churn)
- Authorize at higher rates (issuers trust them more)
- Reduce PCI scope (token is non-sensitive)
- Required for Apple Pay / Google Pay device-bound tokens
The processor handles network-tokenization; your job is to
prefer the token-id over the raw card-id in every downstream
operation (subscriptions, MIT, account-updater).

### Pattern 5: Subscription / dunning lifecycle

```text
draft → active → past_due → unpaid → canceled
                     ↓                 ↑
                  retry × N            ↓
                     ↓                 ↓
                  succeeded ←→ failed_terminal
```

Dunning sequence: 3-day, 7-day, 14-day retries with Smart Retries
(Stripe) or scheme-recommended cadence. Update payment method via
**Account Updater** (Visa AU, Mastercard ABU, Amex Cardrefresher)
to catch BIN changes + re-issuance silently. Failed-payment email
sequence (in-app + email + push) per `~/.claude/rules-library/common/i18n.md`
(locale-aware copy) — never just "payment failed" with no
recovery action.

### Pattern 6: Refunds + partial captures

Authorize for one amount, capture for a smaller amount (auth-hold

- capture-on-ship pattern) — common in e-commerce. Refunds are
async on most rails (5-10 business days to settle). Track refund
state separately from order state; the order can be `delivered`
- `partially_refunded` simultaneously. Refund reasons must map
to scheme codes (Visa CR-30 / 40 / 41, Mastercard 4853 / 4854).

### Pattern 7: Chargeback / dispute lifecycle

```text
inquiry (retrieval) → chargeback (Visa 1st presentment) →
representment (merchant submits evidence) → pre-arbitration →
arbitration → final ruling (issuer/network)
```

Each scheme has its own reason-code taxonomy: Visa Claims
Resolution (VCR), Mastercom Dispute Resolution (MDR), Amex
Chargeback Process. Time limits (typically 7-30 days per stage)
are non-negotiable; missed deadline = automatic loss. Build a
dispute-management workflow: ingest chargeback notification
webhook → fetch evidence from CRM / shipping / device-binding →
submit representment within SLA → track outcome.

### Pattern 8: Payouts + marketplace splits

Marketplace platforms (Stripe Connect, Adyen for Platforms, Square
Multiparty, PayPal Marketplaces) split a single buyer charge into
multiple seller credits + platform fee. Compliance burden differs
by model (Custom / Express / Standard for Stripe; OSP for Adyen;
fully-controlled vs facilitated for Square). Payouts to sellers
follow the rails' SLA (1-2 business day default; instant payout
with fee available). KYC/KYB per AML Sixth EU Directive +
FinCEN CIP rules — separate from payment-processing skill but
ALWAYS gates onboarding.

### Pattern 9: Reconciliation against settlement files

The processor settles funds T+1 to T+3 with a daily settlement
file (Stripe Balance Transactions, Adyen Settlement Detail Report,
Visa VSS, Mastercard Net Settlement Statement). Reconcile every
authorized charge / refund / chargeback / fee against the
processor's record AND against your ledger. Discrepancies (timing

- fee + currency-conversion + on-behalf-of) need named owners
- resolution SLA. Per `bookkeeping-patterns` — every payment is a
double-entry journal: Dr. Cash-clearing-account, Cr. Revenue (gross);
on settlement: Dr. Bank, Cr. Cash-clearing-account, Dr. Processor-fees.

### Pattern 10: Multi-currency + presentment

Present prices in the buyer's currency (presentment currency);
charge in the buyer's currency (settle the FX with the processor);
deposit in the seller's currency (settlement currency). Dynamic
Currency Conversion (DCC) at the card terminal is regulated —
disclosure rules under EU Cross-Border Payments Regulation
(2019/518). For digital goods, prefer charging in customer's
local currency (higher approval rate, lower decline-by-issuer).

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

## Anti-Patterns

### Anti-pattern 1: Storing PAN

Never store the Primary Account Number (PAN) — even encrypted.
Tokenize at the boundary (Stripe.js / Adyen Drop-in / Square Web
Payments SDK) and store the token. Storing PAN puts you in PCI
SAQ-D scope ($$$ + audit cost).

### Anti-pattern 2: Retrying on transient failure without idempotency-key

A retry without an idempotency key creates a duplicate charge.
Every retry-eligible POST to the payment processor MUST carry the
SAME idempotency key as the original attempt.

### Anti-pattern 3: Treating processor 200 as "money moved"

A 200 response from the processor means the API request was
accepted, NOT that the funds settled. Track the authorization +
capture + settlement separately. Money is "real" only after
settlement (T+1 to T+3 for cards; instant for FedNow / RTP / PIX).

### Anti-pattern 4: Webhook signature ignored

Every webhook (Stripe, Adyen, Braintree, Square) is signed.
Verifying the signature is non-negotiable — without it, an
attacker can forge a `charge.succeeded` event and trigger
fulfilment. Sister: `pci-dss-patterns` Req 11.5, OWASP A08.

### Anti-pattern 5: Subscription auto-renew without email reminder

EU PSD2 + UK FCA + California AB-390 + many state laws require
pre-renewal notification for subscriptions (typically 7-30 days
before renewal). US FTC Negative Option Rule applies. Build the
reminder cadence into the subscription state machine.

### Anti-pattern 6: Hard-deleting payment history

You CANNOT delete payment records to satisfy GDPR right-to-
erasure if you have a legal retention obligation (tax records,
AML records 5+ years per FATF Recommendation 11). Document the
conflict in your RoPA per `gdpr-ccpa-compliance`; redact PII
fields while retaining transaction shape.

### Anti-pattern 7: Hard-coding currency / amount precision

USD has 2 decimals; JPY has 0; KWD has 3; BTC has 8. Always
use minor-units (integer cents / yen / fils / satoshi). Store
amount + currency together; never an `amount` field with implicit
currency.

### Anti-pattern 8: Surfacing raw processor error to user

"card_declined / insufficient_funds" leaks issuer state. Map to
user-friendly + actionable language per `error-codes.md` —
"Your card was declined. Try a different card or contact your
bank." Log the raw processor error server-side (per
`error-handling-with-context.md`).

### Anti-pattern 9: Commingling escrow + operating funds

A single transfer of escrowed funds into the platform's
operating account triggers state-regulator examination
findings AND federal AML scrutiny. Once commingled, the
trust account is no longer "in trust" — it becomes a
general-creditor pool in bankruptcy. Every state with an
MTL has specific commingling penalties; NY DFS suspends the
license on first violation. The fix is structural: trust
account at a different bank, separate signatory, separate
chart-of-accounts ledger, automated reconciliation; NEVER a
"we'll be careful" policy.

### Anti-pattern 10: Holding custodial funds without an MTL

A platform that holds buyer money for ANY period (even an hour)
before remitting to seller is engaging in money transmission
under most state laws. Holding without the appropriate MTL is
a felony in many states (NY Banking Law §640). The fix: use
processor-as-holder (Stripe Connect, Adyen for Platforms) so
the LICENSED party holds funds; the platform never touches
custody. If the business requires platform-side custody,
build the MTL portfolio FIRST (12-24 month process, $1-3M
in legal + bonding + capital), don't ship and apologise.

### Anti-pattern 11: Idempotency key without payload hash

Storing only the key + response (no request-hash) means a
client bug that reuses a key with a different payload
silently returns the prior response. The buyer paid for X;
the system returns the receipt for Y. Always hash the
canonical request body and bind it to the cache entry; on
payload mismatch, return HTTP 422
`idempotency_key_payload_mismatch`.

### Anti-pattern 12: In-memory idempotency cache

A Lambda restart, pod recycle, or rolling deploy wipes the
cache; the next retry processes again. The cache MUST be
durable + cross-region-consistent (DDB Global Tables, Redis
Active-Active, Aurora Global Database, Spanner). In-memory
LRU is acceptable ONLY as an in-region read-through cache
in FRONT of a durable backing store.

### Anti-pattern 13: Auto-release escrow without dispute window

Releasing funds on payment confirmation (immediately on
buyer "pay" button) without a hold window invites fraud:
buyer pays → seller ships nothing → seller withdraws funds
→ buyer disputes → platform absorbs the loss. The fix: a
documented HOLD WINDOW (3-14 days typical for digital
goods, longer for physical), buyer-initiated early-release
option, and a documented dispute escalation path before
auto-release fires.

## Verification Checklist

- [ ] Every payment-creating POST carries an `Idempotency-Key` header
- [ ] Idempotency-key store is durable (Redis with persistence /
      Postgres / DDB) with documented TTL
- [ ] PaymentIntent / equivalent state machine modelled in code
      (not bool `succeeded`)
- [ ] 3DS2 fields populated (browser data + device + IP) to
      maximise frictionless rate
- [ ] PSD2 SCA exemptions tracked + applied (TRA, low-value, MIT,
      corporate)
- [ ] Network token stored, NOT PAN
- [ ] Apple Pay / Google Pay device tokens distinguished from
      cloud tokens
- [ ] Subscription state machine has retry + dunning + recovery
      paths
- [ ] Account Updater enabled where supported by processor
- [ ] Refund state tracked separately from order state
- [ ] Dispute / chargeback workflow ingests webhook + submits
      representment within SLA
- [ ] Payout flows comply with marketplace KYC/KYB
- [ ] Daily settlement reconciliation against processor file
- [ ] Ledger double-entry per `bookkeeping-patterns`
- [ ] Multi-currency: minor-units + currency-code stored together
- [ ] Webhook signatures verified on every event
- [ ] Pre-renewal subscription notice cadence implemented
- [ ] User-facing error language mapped via `error-codes.md`; raw
      processor codes never leak
- [ ] Audit logs per `audit-logging.md` for every payment
      lifecycle event (immutable, append-only)
- [ ] PII redacted but transaction shape retained for legal hold
      / AML 5-year+ window
- [ ] Idempotency cache key composed of `tenant_id + endpoint +
      api_version + idempotency_key` SHA-256 hash
- [ ] Idempotency in-progress (HTTP 409) collision handling
      tested under concurrent retry
- [ ] Idempotency payload-hash binding rejects key reuse with
      different body (HTTP 422)
- [ ] Idempotency cache backed by durable + cross-region-
      consistent store (DDB Global Tables / Redis Active-Active
      / Aurora Global / Spanner)
- [ ] Idempotency observability metrics emit: replay-rate,
      collision-rate, payload-mismatch-rate
- [ ] If escrow flow: classified as platform-escrow / simple-
      hold / custodial / agent-mediated; licensing documented
- [ ] If platform-as-holder (custodial): MTL portfolio in place
      OR `[ ] BLOCKED — cannot ship`
- [ ] Trust account segregated at separate bank account from
      operating cash; FBO-titled
- [ ] Daily three-way reconciliation: bank ↔ trust ledger ↔
      beneficiary sub-accounts
- [ ] OFAC / sanctions screening on every fund-in + fund-out
- [ ] FinCEN BOI rule compliance for beneficial owners
- [ ] IRS Form 1099-K reporting wired for marketplace
      settlements ≥ $600
- [ ] Escrow state machine documented + tested (created →
      funded → held → released | refunded | disputed →
      resolved)
- [ ] Escrow hold window documented + enforced
- [ ] Dispute workflow ingests evidence + has SLA-bound
      resolution
- [ ] FX policy documented (lock-at-funding vs lock-at-release)
- [ ] Reserve liability tracked on platform balance sheet
      (processor hold-back)

## Cross-References

- `pci-dss-patterns` — PCI-DSS scope reduction + tokenization
- `bookkeeping-patterns` — double-entry ledger semantics; trust
  account ledger; escrow journal entries
- `ifrs-gaap-reporting` — revenue recognition (IFRS 15 / ASC 606);
  escrow funds as liability on platform balance sheet
- `gdpr-ccpa-compliance` — payment data privacy + lawful basis
- `hipaa-compliance` — for health-related payment flows (HSA,
  FSA, copay processing)
- `security-review` (skill) — payment-security cross-cutting
  checklist (webhook signatures, replay-attack detection,
  idempotency-bypass detection, tokenization-at-edge, never-
  store-PAN)
- `owasp-asvs` — application security verification framework
- `iso27001-controls` — ISMS for payment-handling orgs
- `soc2-readiness` — Trust Service Criteria for payment platforms
- `idempotency.md` (rule) — Stripe-pattern idempotency keys
- `error-codes.md` (rule) — user-facing error mapping
- `error-handling-with-context.md` (rule) — raw processor errors
  in server logs
- `audit-logging.md` (rule) — immutable payment audit trail;
  escrow state-transition events
- `data-retention.md` (rule) — AML retention (5-7 years) vs
  GDPR erasure; legal hold for active disputes
- `rate-limiting.md` (rule) — payment endpoints rate-limited
- `circuit-breaker.md` (rule) — processor outage isolation
- `graceful-degradation.md` (rule) — queued + retry on processor
  outage
- `secrets-management.md` (rule) — processor API keys via vault;
  webhook signing secrets rotation
- `security.md` (rule) — OWASP umbrella; payment-specific A02
  - A07 + A09 controls
- `fp-and-a` — unit economics, payment cost as %GMV
- `valuation-models` — TAM modelling for escrow-volume-based
  marketplaces
- Agents: `payments-reviewer`, `compliance-reviewer`,
  `security-reviewer`, `finance-reviewer`, `risk-reviewer`

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
- Idempotency cache key uses only the key (no tenant + endpoint + api_version composition) — Pattern 1a violation; cross-tenant / cross-endpoint collision risk
- In-progress idempotency collision returns 200 with stale response instead of 409 — Pattern 1b violation; double-execution under concurrent retry
- Payload-hash binding absent — same key + different body returns stale cached response (Anti-pattern 11; receipt-shape drift)
- Idempotency cache in-memory only (no durable backing) — Anti-pattern 12; cache wipes on Lambda restart / pod recycle
- TTL too short for operation class (e.g., 1h for payouts that have 5-day weekend retry windows) — Pattern 1d weakening
- Multi-region idempotency cache lacks cross-region consistency model — Pattern 1e weakening; duplicate execution during failover
- Server generates idempotency key instead of client — Pattern 1f violation; defeats purpose for crash-retry
- Webhook event-id dedupe missing — duplicate handler execution on provider retry; Pattern 1g weakening
- Custodial escrow shipped without MTL portfolio — Anti-pattern 10 violation; criminal exposure in NY / CA / TX
- Trust account commingled with operating cash — Anti-pattern 9 violation; license suspension trigger
- Escrow released immediately on payment confirmation (no hold window / dispute window) — Anti-pattern 13; fraud-loss exposure
- Platform-escrow not preferred over custodial when processor-as-holder is available — unnecessary licensing burden
- Marketplace 1099-K reporting absent for settlements ≥ $600 (IRS rule effective 2024) — compliance gap
- OFAC sanctions screening missing on fund-in OR fund-out — AML / OFAC violation; per-transaction max $1.7M penalty
- FinCEN BOI rule (effective Jan 2024) not implemented on platform's beneficial owners — federal reporting violation
- FX policy undocumented for cross-border escrow — CFTC scrutiny if forwards used; unhedged FX exposure
- Escrow dispute workflow lacks documented SLA + escalation to arbitration — buyer trust erosion
- 1031 QI integration treats funds as operating cash (vs trust) — Treas. Reg. §1.1031(k)-1 violation; lost tax-deferral status

**Refinement candidates**:

- New processor / rail row when a new payment method gains adoption (e.g., FedNow merchant launch, PIX expansion outside Brazil, UPI international)
- 3DS frictionless-rate target update when EMVCo / EBA refine RTS guidance
- Network-token coverage update as VTS / MDES / AETS expand to new card types
- Reconciliation pattern addendum when a recurring discrepancy class (e.g., on-behalf-of fee allocation, dynamic-FX timing) surfaces in audits
- Multi-currency presentation update when new local-payment-method (LPM) launches require currency-specific flows
- Dispute-evidence template when scheme rules change (Visa VAMP, Mastercard FRMS, Amex Excessive Disputes Program thresholds)
- New idempotency-store backend row when a new durable / cross-region-consistent option emerges (e.g., FoundationDB, ScyllaDB Lightweight Transactions)
- New escrow taxonomy row when a recurring custody shape emerges (e.g., stablecoin escrow, on-chain-smart-contract escrow, BaaS-partner-bank custody)
- TTL-per-operation-class update when industry benchmarks shift (e.g., FedNow extends settlement window, SEPA Instant goes 24/7/365)
- State-MTL row update when a US state changes bonding / capital / examination requirements (CSBS publishes annual updates)
- Cross-border escrow FX policy update when CFTC / ESMA tightens forward-contract disclosure

---

*Last verified: 2026-05-30. Standards version refresh cadence: 6 months for processor APIs; semi-annual for scheme rules; annual for PSD3 RTS proposals.*
