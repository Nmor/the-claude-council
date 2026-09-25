# observability-patterns: Don't Log Secrets — Or PII By Default

> Covers **Don't Log Secrets — Or PII By Default** for the `observability-patterns` skill. Routed
> from the reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Don't Log Secrets — Or PII By Default

The single fastest way to leak credentials is a stack trace that includes
the request body. Defenses, in order:

1. **Allowlist** — log only fields you explicitly include. `log.info("event", { user_id, action })`
   is safe; `log.info("event", { req: req })` is not.
2. **Redact** — if you must log a body, run it through a redactor that masks
   any field matching `password`, `token`, `secret`, `key`, `authorization`,
   `card_number`, `ssn`, etc.
3. **Periodic scan** — a weekly CloudWatch Logs Insights query for
   `^(sk_live_|xoxb-|AKIA|Bearer eyJ)` is the floor. Hits page on-call.

PII (email, phone, name) deserves the same care for GDPR / HIPAA scope.
Use hashed identifiers in logs (`sha256(email)[:8]`) when you only need
"is this the same user?" not "who is this user?".
