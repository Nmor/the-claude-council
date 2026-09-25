---
name: payment-processing-patterns
description: Principal-level patterns for accepting card / bank / wallet / instant-rail payments — idempotency, 3DS2 + SCA, network tokenization, subscriptions, dunning, refunds + chargebacks, payouts, ledger reconciliation. Sister to pci-dss-patterns (compliance) and bookkeeping-patterns (double-entry).
---

# Payment Processing Patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
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

## How this skill is organised (read this first)

This skill is `paths:`-gated, so when a glob above matches, whatever is in this file is
added to the always-on context Floor IN FULL. Carrying every pattern inline made it
43 KB — paid before a single line of the actual change is written. Context is a quality
resource, not only a cost one: a window spent on escrow licensing is attention taken
from the idempotency key being written three files away.

So the routing table stays here and the detail lives in `references/`. **Read the
reference file for the concern the current change actually touches** — that is one
Read, not the whole 43 KB. Nothing was dropped in the split; every pattern, code
example, table, standard and anti-pattern below has a row.

| Reference | Topic | What it holds |
| --- | --- | --- |
| [`idempotency.md`](references/idempotency.md) | Idempotency | Pattern 1 (1a-1h): cache-key composition (`tenant + endpoint + api_version + key`), in-progress collision (HTTP 409), payload-hash binding (HTTP 422), TTL per operation class, multi-region key-store consistency, client-side key generation, webhook event-id dedupe, idempotency observability metrics |
| [`authorization-and-sca.md`](references/authorization-and-sca.md) | Authorization + SCA | Patterns 2-3: the PaymentIntent state machine (never infer success from HTTP 200), 3DS2 + PSD2 SCA frictionless-first, exemptions (TRA, low-value, MIT, corporate), rich-data fields, per-BIN fail-rate tracking |
| [`tokenization-and-subscriptions.md`](references/tokenization-and-subscriptions.md) | Tokenization + subscriptions | Patterns 4-5: network tokens (VTS / MDES / AETS) over PAN, device vs cloud tokens, subscription + dunning state machine, retry cadence, Account Updater (Visa AU / Mastercard ABU / Amex Cardrefresher), failed-payment recovery copy |
| [`refunds-and-disputes.md`](references/refunds-and-disputes.md) | Refunds + disputes | Patterns 6-7: auth-hold / capture-on-ship, partial captures, refund state decoupled from order state, scheme refund reason codes, chargeback lifecycle (inquiry → representment → pre-arbitration → arbitration), VCR / MDR / Amex taxonomies and SLAs |
| [`payouts-and-reconciliation.md`](references/payouts-and-reconciliation.md) | Payouts, reconciliation + currency | Patterns 8-10: marketplace splits (Stripe Connect / Adyen for Platforms / Square Multiparty), payout rails and SLAs, KYC/KYB gating, daily settlement-file reconciliation with double-entry journals, presentment vs settlement currency, DCC disclosure rules |
| [`escrow.md`](references/escrow.md) | Escrow + trust accounts | Pattern 11 (11a-11j): the four escrow shapes and their licensing, Stripe Connect delayed-transfer code, escrow state machine, trust-account segregation (FBO, no commingling, three-way reconciliation, MTL / FinCEN / 1099-K / OFAC), real-estate + M&A + 1031-QI specifics, simple-hold pattern, reserves, cross-border FX, AML / KYC / KYB, dispute + reversal workflow |
| [`anti-patterns.md`](references/anti-patterns.md) | Anti-patterns | The 13 anti-patterns to reject, each with its named alternative — PAN storage, keyless retries, processor-200-as-settled, unverified webhooks, silent auto-renew, hard-deleted history, hard-coded currency precision, leaked processor errors, commingled escrow, unlicensed custody, unbound idempotency keys, in-memory idempotency caches, dispute-window-free escrow release |
| [`verification-checklist.md`](references/verification-checklist.md) | Verification checklist | The full pre-ship checklist across payments, subscriptions, disputes, payouts, reconciliation, multi-currency, idempotency and escrow |
| [`rationale-and-learning.md`](references/rationale-and-learning.md) | Rationale + learning hooks | Why this skill exists (what one payment defect costs); the continuous-learning signals to watch and refinement candidates |

## Anti-Patterns

The thirteen anti-patterns this skill rejects — and the named alternative for each —
live in [`references/anti-patterns.md`](references/anti-patterns.md). Read it before
writing the code, not during review: every one of them ships green.

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
