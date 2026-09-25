---
name: security-review
description: Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns. Also lazy-loads the security.md / security-controls-org-wide.md / secrets-management.md content migrated from rules/common/ on 2026-06-02.
paths:
  - "**/auth/**"
  - "**/login*"
  - "**/signup*"
  - "**/sso*"
  - "**/oauth*"
  - "**/saml*"
  - "**/jwt*"
  - "**/session*"
  - "**/security/**"
  - "**/secrets/**"
  - "**/.env*"
  - "**/vault*"
  - "**/keychain*"
  - "**/routes/**"
  - "**/handlers/**"
  - "**/controllers/**"
  - "**/middleware/**"
  - "**/api/**"
  - "**/webhook*"
  - "**/payment*"
  - "**/billing*"
  - "**/checkout*"
  - "**/stripe*"
  - "**/encryption*"
  - "**/crypto*"
  - "**/csrf*"
  - "**/cors*"
  - "**/cookies*"
  - "**/permissions*"
  - "**/authorization*"
---

# Security Review Skill

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`

This skill ensures all code follows security best practices and identifies potential
vulnerabilities.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Security Checklist | [`references/security-checklist.md`](references/security-checklist.md) |
| Security Testing | [`references/security-testing.md`](references/security-testing.md) |
| Pre-Deployment Security Checklist | [`references/pre-deployment-security-checklist.md`](references/pre-deployment-security-checklist.md) |
| security (migrated rule) | [`references/security.md`](references/security.md) |
| security-controls-org-wide (migrated rule) | [`references/security-controls-org-wide.md`](references/security-controls-org-wide.md) |
| secrets-management (migrated rule) | [`references/secrets-management.md`](references/secrets-management.md) |
| audit-logging (migrated rule) | [`references/audit-logging.md`](references/audit-logging.md) |
| official-docs-first (migrated rule) | [`references/official-docs-first.md`](references/official-docs-first.md) |

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Implementing payment features (always; see § 11 Payment Security)
- Implementing escrow / trust-account / marketplace-split flows
- Implementing webhook receivers (payment / identity / messaging)
- Implementing open-banking / FAPI integrations
- Storing or transmitting sensitive data (PII, PHI, payment card,
  health, financial, biometric)
- Integrating third-party APIs

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/security)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [Web Security Academy](https://portswigger.net/web-security)

## Purpose

Principal-level security review: OWASP Top 10 (2021) coverage,
OWASP ASVS 4.0.3 mapping (L1/L2/L3), STRIDE threat modelling at
design time, secure-by-default coding patterns (parameterised
queries, output encoding, deny-by-default authz, CSP / HSTS /
SameSite cookies), secret management discipline (vault-only, never
on disk), dependency CVE gating, supply-chain integrity (SBOM,
signing, SLSA), webhook signature verification, rate limiting on
auth + sensitive endpoints, audit logging (per `audit-logging.md`),
PII redaction in logs (per `gdpr-ccpa.md`), incident response
flow (rotate FIRST, scrub LATER), and the cross-language security
checks every reviewer applies before approving a merge.

**Negative scope** (NOT what this skill covers):

- Penetration testing methodology (engage external pentesters)
- Red-team / offensive security (different discipline)
- Cryptographic protocol design (use vetted primitives; don't
  invent)
- Compliance certifications (SOC 2 / ISO 27001 audit) — separate
  workflow

## When NOT to use

- Pure-static documentation changes
- Throwaway scripts with no user input + no network exposure
- Local-only dev tooling that never reaches production

## Standards Cited

- **OWASP Top 10 (2021)** — owasp.org/Top10
- **OWASP ASVS 4.0.3** — Application Security Verification Standard
- **OWASP API Security Top 10 (2023)** — API-specific risks
- **OWASP Cheat Sheet Series** — implementation-level guides
- **NIST SP 800-53 Rev 5** — security + privacy controls
- **NIST SP 800-218 (SSDF)** — Secure Software Development Framework
- **NIST SP 800-63B** — Digital Identity Guidelines
- **CWE Top 25 (2026)** — most dangerous weaknesses
- **CVSS v3.1 / v4.0** — vulnerability scoring
- **SLSA Framework v1.0** — supply-chain integrity levels
- **CIS Benchmarks** — hardening references per platform
- **PCI-DSS v4.0** — cardholder-data security
- **GDPR Articles 5, 25, 32, 33, 34** — security + breach notification
- **RFC 6749 (OAuth 2.0)**, **RFC 7636 (PKCE)**, **RFC 8725 (JWT BCP)**

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| SQL with string concatenation | A03 Injection (CWE-89) | Parameterised queries / ORM-bound input |
| `eval()` / `exec()` with user input | A03 RCE (CWE-78 / CWE-95) | Allowlist dispatch; never eval user input |
| `dangerouslySetInnerHTML` / `v-html` on user content | A03 XSS (CWE-79) | textContent OR DOMPurify-sanitised |
| Forgotten authn middleware | A01 Broken Access Control (CWE-862) | Deny-by-default; every route gates auth |
| IDOR on resource lookup | A01 (CWE-639) | Scope query by current user / tenant id |
| Hardcoded secret in source | A02 / A08 (CWE-798) | Vault + env injection; PostToolUse hook blocks the prefix |
| MD5 / SHA-1 / DES for security | A02 Cryptographic Failures (CWE-327) | SHA-256+ / Argon2id / AES-GCM |
| Login endpoint without rate limit | A07 Auth Failures (CWE-307) | Per-IP + per-account + global throttle |
| JWT with `alg: none` accepted | A02 + A07 (CWE-345) | Strict allowlist of algorithms; verify signature |
| CSRF protection disabled | A01 (CWE-352) | Double-submit cookie OR `SameSite=Strict` + Origin check |
| Path traversal via `path.join(base, user_input)` | A01 (CWE-22) | Canonicalise + check prefix |
| `fetch(user_url)` from server | A10 SSRF (CWE-918) | Allowlist hosts; block private IPs + IMDS |
| Stack trace returned in API response | A04 Information Disclosure | Sanitised error envelope (per `error-handling-with-context.md`) |
| No webhook signature verification | A08 Software + Data Integrity | Verify HMAC / signature per provider's docs |
| `npm install` without `--frozen-lockfile` in CI | A06 Vulnerable Components | Lockfile-strict + `pnpm audit` + `osv-scanner` |
| Secrets in CI logs | A09 Logging Failures | Filter secrets in logger config; treat any leak as P0 |
| MFA disabled by default for admins | A07 | MFA required on admin role; refuse weak auth |
| Long-lived refresh tokens without rotation | A07 | Rotate on use + reuse-detection |
| Plaintext PII in logs | GDPR Article 5 + 32; A09 | Hash / truncate / redact at logger config |

## Verification Checklist

- [ ] OWASP Top 10 (2021) reviewed for the change
- [ ] STRIDE applied to any new feature touching user data
- [ ] All input validated at boundary (length / type / format /
      allowlist)
- [ ] All output encoded for context (HTML / SQL / shell / JSON)
- [ ] AuthN + AuthZ verified on every changed endpoint
- [ ] Rate limit on every public + auth endpoint (per
      `rate-limiting.md`)
- [ ] CSRF protection on every state-changing request
- [ ] Secrets via vault (per `secrets-management.md`); none in
      source / lockfiles / CI logs
- [ ] No weak crypto (MD5 / SHA-1 / DES / RC4)
- [ ] JWT validates allowlisted algorithm + audience + issuer +
      expiry
- [ ] Dependency CVE gate green (MODERATE+ blocks per
      `dependency-vulnerabilities.md`)
- [ ] License gate green (per `license-allowlist-gate.md`)
- [ ] SBOM emitted + image signed (SLSA L2+)
- [ ] Webhook signatures verified
- [ ] Error responses sanitised; no stack trace / DB error /
      internal path leakage
- [ ] PII redacted from logs (per `gdpr-ccpa.md`)
- [ ] Audit log for sensitive actions (per `audit-logging.md`)
- [ ] Incident-response runbook references the change's failure
      modes

## Cross-References

- [`cloud-infrastructure-security.md`](cloud-infrastructure-security.md)
  — sister document within this skill: cloud platform + IAM + CI/CD
  - IaC + monitoring deep-dive (361-line checklist for AWS, Vercel,
  Railway, Cloudflare, Terraform, GitHub Actions)
- `~/.claude/skills/owasp-asvs/SKILL.md` — ASVS catalogue
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — privacy lens
- `~/.claude/skills/iso27001-controls/SKILL.md` — ISMS Annex A
- `~/.claude/skills/soc2-readiness/SKILL.md` — TSC mapping
- `~/.claude/skills/pci-dss-patterns/SKILL.md` — payment data scope
- `~/.claude/rules-library/common/security.md` — global umbrella
- `~/.claude/rules-library/common/secrets-management.md` — secrets posture
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — CVE gate
- `~/.claude/rules-library/common/rate-limiting.md` — throttle defence
- `~/.claude/rules-library/common/audit-logging.md` — auditable actions
- `~/.claude/rules-library/common/error-handling-with-context.md` — error
  envelope sanitisation
- `~/.claude/agents/security-reviewer.md` — Council Division 4
- `~/.claude/agents/compliance-reviewer.md` — Council Division 6

## Why this skill exists

Security defects ship to production because review is implicit:
each reviewer brings their own (incomplete) mental checklist; gaps
appear at the seams between languages, layers, and teams. Making
the review structured + OWASP-mapped + ASVS-anchored means the
review can't be skipped silently. The patterns above codify the
production-ready posture: STRIDE at design, ASVS-mapped controls
in code, vault-first secrets, CVE gate at every PR, sanitised
errors, audit log for sensitive actions, rate limit on every auth

- public endpoint. Teams that adopt these ship features without
shipping incidents; teams that don't burn engineering quarters
on incident response.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- User input handler ships without input validation / sanitisation (A03 weakening)
- Authentication endpoint without rate-limit (A07 + Sonar S5876)
- Hardcoded credential reaches a commit (A02 + Sonar S2068; hook should have caught it)
- File-upload handler without size + content-type validation
- New external integration without OWASP threat-model review (Phase 0 weakening)
- IDOR pattern recurring (handler reads resource by id without ownership check) — A01
- SQL string-concat / format-string injection (A03)
- Weak crypto (MD5/SHA-1/DES) appears in code (A02 + Sonar S5547)
- Sensitive data in logs (A09; PII leaks via console.log / structured logger)
- Missing security headers (CSP / HSTS / X-Frame-Options) on new pages (A05)
- Vulnerable dep CVE reaches main (A06; dependency-vulnerabilities.md gate bypassed)
- Payment webhook handler missing signature verification (§ 11; replay-attack exposure)
- Payment webhook accepts events outside 5-min timestamp window (§ 11 replay-protection weakening)
- PAN reaches application server (§ 11 tokenization-at-edge violation; PCI scope blast)
- Card-testing velocity limit absent on checkout (§ 11; BIN-attack fraud)
- Refund pathway permits non-original-payment-method targets without explicit policy (§ 11;
  refund-laundering exposure)
- Open-banking integration ships without FAPI 2.0 conformance (§ 11; mTLS / DPoP / PAR missing)
- Idempotency-bypass detection absent on payment endpoints (§ 11; double-spend / replay exposure)
- Same-IP key-rotation anomaly unobserved on payment endpoints (card-testing fraud signal)
- Trust-account / escrow ledger NOT append-only (§ 11; audit failure + commingling risk)
- OFAC / sanctions screening missing at fund-in OR fund-out (§ 11; per-tx OFAC penalty up to $1.7M)
- Custodial escrow shipped without MTL portfolio (§ 11 + payment-processing-patterns
  Anti-pattern 10)
- 4-eyes principle absent on manual escrow release above threshold (§ 11; insider-risk exposure)
- mTLS not enforced for service-to-service inside CDE (§ 11; PCI-DSS Req 4 weakening)

**Refinement candidates**:

- New row in OWASP A01-A10 checklist when a recurring pattern surfaces in the codebase
- Threat-model template extended when a new attack class emerges (e.g., AI prompt injection,
  supply-chain typosquats)
- Cross-reference added when a sister skill (owasp-asvs, gdpr-ccpa-compliance, pci-dss-patterns,
  payment-processing-patterns, hipaa-compliance) adds a security gate
- Per-stack security checklist row when a new framework / cloud service joins the codebase
- New § 11 sub-section when a new payment-security threat class emerges (e.g., quantum-resistant
  payment crypto, post-quantum SCA, stablecoin custody attack class)
- New FAPI 2.0 conformance row when OpenID FAPI WG releases a profile update
- New OFAC / sanctions-screening vendor row when a new screening provider gains adoption (Refinitiv,
  ComplyAdvantage, Chainalysis, Sardine, Alloy)

---

**Remember**: Security is not optional. One vulnerability can compromise the entire platform. When
in doubt, err on the side of caution.

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the
lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/security.md`
- `rules-library/common/security-controls-org-wide.md`
- `rules-library/common/secrets-management.md`
- `rules-library/common/audit-logging.md`
- `rules/common/official-docs-first.md`

---
