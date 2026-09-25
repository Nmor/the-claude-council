# Payouts, Reconciliation + Multi-Currency

> Covers Core Patterns 8-10 — marketplace payouts and splits, reconciliation against processor
> settlement files with double-entry journals, and multi-currency presentment vs settlement.
> Pointed at by the "Payouts, reconciliation + currency" row of the reference map in `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Core Patterns

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
