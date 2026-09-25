# Payment Verification Checklist

> Covers the full pre-ship verification checklist for payment, subscription, payout and escrow
> flows. Pointed at by the "Verification checklist" row of the reference map in `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
