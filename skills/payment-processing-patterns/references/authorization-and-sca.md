# Authorization + SCA

> Covers Core Patterns 2-3 — the PaymentIntent state machine (never infer success from HTTP 200)
> and 3DS2 + PSD2 SCA with frictionless-first authentication. Pointed at by the "Authorization +
> SCA" row of the reference map in `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Core Patterns

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
