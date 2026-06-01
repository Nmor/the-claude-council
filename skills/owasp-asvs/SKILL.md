---
name: owasp-asvs
description: OWASP Application Security Verification Standard 4.0.3 — the canonical control catalogue for application security, mapped per L1 / L2 / L3 with implementation patterns and verification commands.
---

# OWASP ASVS

The OWASP Top 10 names risk classes; the ASVS names the CONTROLS that mitigate them. This skill turns the 286 ASVS 4.0.3 requirements into actionable engineering patterns mapped to the codebase, with verification commands per chapter.

## Purpose

Security audits driven by OWASP ASVS are the de-facto standard for B2B SaaS procurement, SOC 2 readiness, and enterprise penetration tests. The ASVS spans 14 chapters with three levels:

- **L1** (Opportunistic): minimum bar for any internet-facing app; achievable via automated tooling
- **L2** (Standard): default for apps holding sensitive business data; requires deliberate design
- **L3** (Advanced): apps handling high-value assets (banking, health, classified) or processing significant volumes of PII

This skill maps the controls to implementation patterns + verification gates so an engineer can answer "are we ASVS L2?" with evidence, not opinion.

## Standards Cited

- **OWASP ASVS 4.0.3** (October 2021) — current GA; the 286 numbered requirements
- **OWASP ASVS 5.0** (in draft as of 2025) — major restructure; check `github.com/OWASP/ASVS` for current state
- **OWASP Top 10 2021** — the risk classes ASVS controls map to
- **NIST SP 800-53 Rev 5** — federal control catalogue (ASVS controls map to NIST SC, AC, AU, IA families)
- **CIS Critical Security Controls v8** — operational complement
- **CWE Top 25 (2026)** — weakness types the ASVS prevents
- **RFC 7231, 7235, 9110** — HTTP authentication semantics
- **RFC 6749, 6750, 9700** — OAuth 2.0 + 2.1
- **NIST SP 800-63B** — Digital Identity Guidelines (authentication assurance levels)
- **PCI-DSS v4.0** — overlaps with V2 (Authentication) and V8 (Data Protection)

## When to Fire

- Any new authentication / authorization code
- Any new external-facing API endpoint
- Any code handling user input (V5 — Validation, Sanitization, Encoding)
- Any code handling secrets / cryptography
- Any session management or token issuance
- Before any pentest engagement (pre-flight self-assessment)
- Before any SOC 2 audit (controls evidence)
- Before any procurement security questionnaire

## Core Patterns

### V1 — Architecture, Design, and Threat Modeling

- **V1.1.2** — SDLC documented; threat modeling for every story touching auth / sensitive data
- **V1.1.4** — Trust boundaries documented in an architecture doc (DFD or C4)
- **V1.2.1-4** — Application uses unique, lowest-priv credentials for OS / DB / queue
- **V1.4.1** — Trusted enforcement points (gateway / handler middleware) — not enforcement at the UI layer alone
- **V1.5.1** — Centralised input/output handling (not scattered per-handler)
- **V1.14.1** — Components segregated (admin vs user vs public)

**Implementation:** ADR for every architectural decision (per `~/.claude/rules/common/adr-template.md`); STRIDE pass per `task-intake-due-diligence.md` Q9.

### V2 — Authentication

- **V2.1.1** — Passwords ≥ 12 characters (L2), ≥ 8 (L1)
- **V2.1.2** — Allow passphrases up to 128 chars; DON'T arbitrarily limit
- **V2.1.5** — Allow paste in password fields (don't block clipboard)
- **V2.1.7** — Block compromised passwords against a breach corpus (HaveIBeenPwned k-anonymity API)
- **V2.1.9** — No composition rules (don't require "1 upper + 1 number + 1 symbol")
- **V2.2.1** — Anti-automation on auth (rate limit, CAPTCHA after N failures)
- **V2.2.3** — Secure communications (TLS) for all auth
- **V2.3.1** — Verifiable identity via established 2nd factor (TOTP / WebAuthn / SMS)
- **V2.5.4** — Default account passwords randomised per install
- **V2.7.1** — Out-of-band SMS deprecated for high-value accounts (NIST SP 800-63B)
- **V2.8.1** — TOTP secrets at rest are encrypted
- **V2.9.1-3** — WebAuthn / FIDO2 supported for L3
- **V2.10.1** — Service accounts use ephemeral credentials (OIDC federated, not long-lived keys)

**Verification:**
```bash
# Verify password policy
grep -rn "minLength\|MIN_PASSWORD_LENGTH" src/ — should ≥ 12
# Verify compromised-password check wired
grep -rn "hibp\|pwnedpasswords" src/
# Verify rate limit on auth endpoint
grep -rn "rateLimit\|throttle" src/auth/
```

### V3 — Session Management

- **V3.1.1** — Sessions are unique, unpredictable; ≥ 64 bits entropy (use crypto-random, not Math.random)
- **V3.2.1** — New session on auth; old session invalidated
- **V3.2.3** — Cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`
- **V3.3.1** — Logout invalidates the session server-side
- **V3.3.2** — Idle timeout (default 30 min for L2; 15 min for L3)
- **V3.3.3** — Absolute timeout (default 24h; sensitive ops require re-auth)
- **V3.4.1** — Cookie-based sessions use `__Host-` or `__Secure-` prefix
- **V3.5.1** — JWT verification: ALWAYS verify the signature; explicit `alg` allowlist (never accept `none`)
- **V3.5.2** — Reference tokens (opaque session id + server-side store) preferred over self-contained tokens for revocability
- **V3.7.1** — Session binding to client (IP / device fingerprint) on sensitive ops

### V4 — Access Control

- **V4.1.1** — Trusted enforcement: every protected endpoint goes through authz middleware
- **V4.1.3** — Principle of least privilege (default deny)
- **V4.1.5** — Access controls fail securely (closed)
- **V4.2.1** — Sensitive data + functions protected from direct object reference (IDOR)
- **V4.2.2** — CSRF protection for state-changing requests
- **V4.3.1** — Admin interfaces: MFA required; separate URL prefix; IP-allowlisted in L3

**Pattern:** Centralised authorize() middleware; row-level security (RLS) in PostgreSQL for multi-tenant data (per `~/.claude/skills/postgres-patterns/`).

### V5 — Validation, Sanitization, Encoding

- **V5.1.1** — All input is server-side validated against an allowlist
- **V5.1.3** — Parameterised queries (no string concat)
- **V5.1.4** — Structured data is strongly typed + validated (use Zod / Pydantic / class-validator)
- **V5.2.4** — HTML / DOM contexts use contextual encoding (textContent over innerHTML)
- **V5.3.1** — Output encoding for the right context (HTML, JS, URL, CSS)
- **V5.3.4** — SQL injection prevention via parameterisation
- **V5.5.2** — XML parsers configured to prevent XXE
- **V5.5.3** — Deserialization uses safe libraries (no `pickle.loads` on untrusted; no `unserialize()` in PHP)

### V6 — Stored Cryptography

- **V6.2.1** — All cryptographic modules fail securely
- **V6.2.3** — Industry-tested algorithms only (NIST-approved)
- **V6.2.5** — Known-insecure algorithms (MD5, SHA-1, DES, 3DES) not used
- **V6.2.7** — Authenticated encryption (AES-GCM, ChaCha20-Poly1305) for confidentiality + integrity
- **V6.3.1** — Random number generators are cryptographically secure (CSPRNG)
- **V6.4.1** — Secret material in HSM / KMS, not source code

### V7 — Error Handling and Logging

- **V7.1.1** — No sensitive info in error messages reaching the client
- **V7.1.2** — Server-side logs are structured (sister to `~/.claude/skills/observability-patterns/`)
- **V7.3.1** — Logs include success + failure of auth, access control, validation failures
- **V7.3.4** — Time sources synchronised (NTP)
- **V7.4.1** — Generic error message to user; full detail server-side

### V8 — Data Protection

- **V8.1.1** — Sensitive data classified (PII, PHI, financial, etc.) — see `~/.claude/rules/common/data-retention.md`
- **V8.2.2** — Browser-side caching disabled for sensitive responses (`Cache-Control: no-store`)
- **V8.3.1** — Sensitive form data has `autocomplete="off"` ONLY when truly necessary (mostly password managers should work)
- **V8.3.4** — Sensitive data is removed from memory ASAP after use

### V9 — Communications

- **V9.1.1** — TLS used for all communications, including internal
- **V9.1.2** — TLS configurations match current NIST / Mozilla recommendations (TLS 1.2+, modern ciphers, HSTS preload)
- **V9.2.1** — Connections to + from external systems use TLS

### V10 — Malicious Code

- **V10.2.1** — Application source code reviewed for malicious code (signed commits, branch protection)
- **V10.3.1** — Dependencies obtained from verified sources, signature verified (per `~/.claude/rules/common/install-allowlist.md`)
- **V10.3.2** — Application has integrity checks at runtime (subresource integrity for CDN scripts)

### V11 — Business Logic

- **V11.1.1** — Business logic flows process steps in order; race conditions handled
- **V11.1.2** — Business logic limits anomalous high volumes (rate-limited per `~/.claude/rules/common/rate-limiting.md`)
- **V11.1.4** — Anti-automation on business-critical flows (signup, checkout)

### V12 — Files and Resources

- **V12.1.1** — File uploads are size-limited
- **V12.1.2** — File upload formats are validated by magic bytes, not MIME header
- **V12.3.1** — Filenames are sanitized; no path traversal
- **V12.4.1** — Files stored outside webroot
- **V12.5.1** — Uploaded files served with the correct `Content-Type` + `Content-Disposition: attachment` for non-display

### V13 — API and Web Service

- **V13.1.1** — API uses TLS
- **V13.1.4** — Authorization on every endpoint (no implicit allow)
- **V13.2.1** — RESTful methods used correctly (GET = safe, no side effects)
- **V13.2.3** — JSON Schema validation on inputs
- **V13.3.1** — SOAP services: WS-Security correctly configured (legacy)
- **V13.4.1** — GraphQL depth + complexity limits

### V14 — Configuration

- **V14.1.1** — Build pipeline is automated + reproducible
- **V14.2.1** — Third-party deps from trusted source (per `dependency-vulnerabilities.md` + `install-allowlist.md`)
- **V14.2.4** — Each environment (dev / staging / prod) has its own config
- **V14.3.1** — Default error pages / debug interfaces removed in production
- **V14.4.1** — HTTP security headers configured (CSP, HSTS, X-Content-Type-Options, Referrer-Policy)
- **V14.5.1** — Cross-origin restricted via CORS allowlist

## Anti-Patterns

- **`alg: none` accepted in JWT verification** — V3.5.1 violation, trivial auth bypass
- **Password complexity rules WITHOUT length minimum** — composition rules harm UX without raising entropy
- **Session ID in URL** — V3.4.1 violation (leaks via referer, browser history, logs)
- **Trusting client-supplied user_id in API calls** — IDOR (V4.2.1); always derive from authenticated session
- **`SELECT * WHERE user_id = $1` without verifying $1 == session.user_id** — same IDOR class
- **`Math.random()` for security tokens** — V6.3.1 violation; use `crypto.randomBytes` / `secrets.token_urlsafe`
- **MD5 / SHA-1 for password hashing** — V6.2.5; use argon2id / bcrypt
- **Stack traces in production responses** — V7.4.1
- **CORS `*` with credentials** — disables same-origin protection
- **`autocomplete="off"` on login forms** — fights password managers, hurts a11y (per `accessible-forms`), violates ASVS V2.1.5

## Verification Checklist

```bash
# V2 — Auth
grep -rn "bcrypt\|argon2" src/auth/        # password hash used
grep -rn "rateLimit" src/auth/             # rate limit wired
# V3 — Session
grep -rn "HttpOnly.*Secure.*SameSite" src/ # cookie flags
grep -rn '"alg".*"none"' src/              # forbidden
# V5 — Input
grep -rn "innerHTML\s*=" src/              # XSS risk
grep -rn "eval(" src/                      # code-injection risk
# V6 — Crypto
grep -rn "createHash(.\"md5\"\|.\"sha1\"" src/   # weak hash
grep -rn "Math\.random" src/lib/crypto/     # CSPRNG usage
# V9 — TLS
grep -rn "rejectUnauthorized.*false" src/   # disabled TLS verify
# V14 — Config
grep -rn "Content-Security-Policy" src/middleware/  # CSP set
```

```bash
# Tools
zap-baseline.py -t https://staging.example.com   # OWASP ZAP automated
nuclei -u https://staging.example.com            # template-based
nikto -h https://staging.example.com             # legacy but useful
trivy fs --severity HIGH,CRITICAL .              # dep CVE
gitleaks detect                                  # secret scan
```

## Cross-References

- `~/.claude/rules/common/security.md` — OWASP Top 10 mapping
- `~/.claude/skills/security-review/SKILL.md` — checklist version
- `~/.claude/skills/observability-patterns/SKILL.md` — V7 logging
- `~/.claude/skills/postgres-patterns/SKILL.md` — V4 RLS
- `~/.claude/rules/common/secrets-management.md` — V6.4
- `~/.claude/rules/common/dependency-vulnerabilities.md` — V10.3
- `~/.claude/rules/common/install-allowlist.md` — V10.3
- `~/.claude/rules/common/rate-limiting.md` — V2.2, V11.1
- `gdpr-ccpa-compliance` skill — overlaps with V8 (data protection)
- `pci-dss-patterns` skill — overlaps with V2 (auth), V6 (crypto), V8 (data)
- `iso27001-controls` skill — ASVS controls map to ISO 27001 Annex A
- `soc2-readiness` skill — ASVS controls produce SOC 2 CC evidence
- `security-reviewer` agent — opus-model agent

## Why This Skill Exists

OWASP ASVS is the question security auditors ask in different words: "Show me your password policy / how do you hash it / how do you log auth events / how do you handle session expiry / how do you handle XSS / how do you handle SQL injection."

A team can either answer those questions in real-time during the audit (slow, expensive, looks unprepared) OR have the ASVS controls mapped to code with evidence (fast, professional, signals security maturity).

The patterns in this skill produce L2 conformance for a typical SaaS application. L3 requires additional design choices (HSM-backed keys, mTLS for service-to-service, no SMS 2FA, federated identity only) — surface those choices in the architecture doc.

The cost of implementing ASVS controls during development: a few extra middleware layers, structured logging, parameterised queries (you should be doing these anyway). The cost of retrofitting after a pentest finding: weeks of remediation + fines + lost deals.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- V2 (Authentication) control gap: password policy < 12 chars, no rate-limit on login, MFA optional for admin
- V3 (Session Management) control gap: session token leaked in URL / log / referrer
- V4 (Access Control) control gap: IDOR pattern reaches main (resource lookup without ownership check)
- V5 (Validation, Sanitisation, Encoding) control gap: handler accepts unvalidated input
- V6 (Stored Cryptography) control gap: SHA-1 / MD5 / DES / no-IV-cipher used for new feature
- V7 (Error Handling + Logging) control gap: stack trace returned to client; PII in logs
- V8 (Data Protection) control gap: secret in source / logs / API response
- V9 (Communication) control gap: HTTP listener / disabled TLS verification / weak cipher suite
- V10 (Malicious Code) control gap: archived / unmaintained dep introduced (per `updated-frameworks.md`)
- V11 (Business Logic) control gap: idempotency missing on a financial-effect endpoint
- V12 (Files + Resources) control gap: upload without size + MIME validation; path-traversal possible
- V13 (API + Web Service) control gap: missing rate-limit / missing CSRF / missing CORS allowlist
- V14 (Configuration) control gap: debug mode in prod, default credentials, exposed admin panel
- New L3 control becomes applicable (e.g., regulated workload added) without uplift

**Refinement candidates**:
- New control mapping row when a recurring control gap appears in production audit
- Tightening of the L1 → L2 → L3 boundary when the workload's regulatory scope changes
- New cross-reference when a sister skill (iso27001-controls, soc2-readiness, pci-dss-patterns) cites the same control under a different framework
- New verification command per control when a new tool / scanner becomes the authoritative check (e.g., Semgrep rule replacing manual review)
