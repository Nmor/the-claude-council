# Refunds, Partial Captures + Disputes

> Covers Core Patterns 6-7 — refunds and partial captures (auth-hold / capture-on-ship, scheme
> reason codes) and the chargeback / dispute lifecycle through representment, pre-arbitration and
> arbitration. Pointed at by the "Refunds + disputes" row of the reference map in `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Core Patterns

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
