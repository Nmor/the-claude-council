# Anti-Patterns + Verification Checklist

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the privacy anti-patterns to reject and the pre-ship verification
checklist. Pointed at by the SKILL.md reference-map row "Anti-patterns +
verification checklist".

## Anti-Patterns

- **"Consent" via continued use of the site** — not consent under GDPR
- **Single "I agree to everything" checkbox** — fails granularity
- **Pre-ticked consent boxes** — illegal (CJEU Planet49)
- **"Reject all" smaller / less prominent than "Accept all"** — fails CJEU equivalence
- **Storing IP in plaintext in EU jurisdictions** — Article 5 violation unless lawful basis +
  retention limit
- **Logging full email, phone, password (hashed or not) in app logs** — per `security.md` A09
- **DSAR endpoint authenticated by cookie alone** — re-authentication required
- **"We don't sell data" but Facebook Pixel ships PII to Meta** — CCPA defines "sale" broadly;
  ad-tech sharing counts
- **Consent at signup never refreshed** — material processing changes require re-consent
- **30-day backup window not disclosed in privacy notice** — users have right to know retention
  timing

## Verification Checklist

- [ ] `docs/ropa.md` exists and is current
- [ ] Every data field has lawful_basis metadata
- [ ] Consent banner: granular toggles, default OFF for non-essential, "Reject all" equivalent
  prominence
- [ ] Consent records logged with timestamp + policy version + IP hash
- [ ] DSAR endpoint requires re-authentication
- [ ] DSAR endpoint rate-limited (5/month/user)
- [ ] DSAR worker cascades to all stores + processors
- [ ] Deletion cascades to backups within documented window
- [ ] Cookie banner blocks non-essential cookies until consent
- [ ] No PII in logs (IP hashed, email truncated to `j***@example.com`, no passwords/tokens)
- [ ] Cross-border transfer mechanism documented per destination
- [ ] DPIA written for new high-risk features
- [ ] Breach runbook lists 72-hour clock + DPO + affected-users query
- [ ] Privacy notice up-to-date with retention windows + processors + DSAR contact
- [ ] Material processing changes trigger consent re-prompt
- [ ] No "Do Not Sell" gap if any ad-tech is wired
- [ ] Children's age gate present (if applicable)
