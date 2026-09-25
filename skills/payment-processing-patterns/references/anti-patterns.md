# Payment Anti-Patterns

> Covers the thirteen payment anti-patterns to reject, each with its named alternative — PAN
> storage, keyless retries, treating a processor 200 as settled money, unverified webhooks, silent
> auto-renew, hard-deleted history, hard-coded currency precision, leaked processor errors,
> commingled escrow, unlicensed custody, unbound idempotency keys, in-memory idempotency caches,
> and dispute-window-free escrow release. Pointed at by the "Anti-patterns" row of the reference
> map in `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
