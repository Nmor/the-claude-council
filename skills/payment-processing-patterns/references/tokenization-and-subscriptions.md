# Network Tokenization + Subscriptions

> Covers Core Patterns 4-5 — network tokenization (VTS / MDES / AETS, device vs cloud tokens) and
> the subscription / dunning lifecycle with Account Updater and retry cadence. Pointed at by the
> "Tokenization + subscriptions" row of the reference map in `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Core Patterns

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
