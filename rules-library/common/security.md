# Security Umbrella (Always-On, Global)

> This is the canonical security baseline. It maps every relevant
> security control to its specific standard and to the sister
> rule that enforces it. Standards-cited references: **OWASP
> Top 10 (2021)**, **OWASP ASVS 4.0.3**, **NIST SP 800-53 Rev 5**,
> **ISO/IEC 27001:2022**, **CWE Top 25 (2026)**, **PCI-DSS v4.0**,
> **GDPR (EU 2016/679)**, **CCPA (Cal. Civ. Code §1798.100+)**.
>
> Sister rules (each enforces a slice of this umbrella):
>
> - `dependency-vulnerabilities.md` — CVE gate (MODERATE+ blocks)
> - `license-allowlist-gate.md` — SPDX allowlist + cross-check
> - `dependency-overrides-not-exceptions.md` — fix the tree, not
>   the exception list
> - `security-controls-org-wide.md` — 5-layer non-bypassable
>   enforcement
> - `secrets-management.md` — vault-first, never on disk in
>   cleartext, atomic rotation, scrub-after-rotate
> - `install-allowlist.md` — no silent global installs
> - `repo-setup-checklist.md` — 20-point first-touch checklist
> - `docker-localhost-binding.md` — every host port `127.0.0.1:`
> - `no-local-fs.md` — no local FS state on ephemeral platforms
> - `no-discards.md` (hook-enforced) — blocks hardcoded secrets
>   - weak crypto patterns on save
> - `extreme-lint-policy.md` — `gosec`, `bandit`, `eslint-
>   plugin-security` mandatory

## OWASP Top 10 mapping

Every project's security review walks ALL ten categories. The
table below names the standard, the specific check, and the
sister rule that enforces it.

| # | Category (OWASP Top 10 2021) | What to check | Enforced by |
| --- | --- | --- | --- |
| A01 | **Broken Access Control** | Authorization on every endpoint; deny-by-default; row-level (RLS) on multi-tenant tables; object-level checks before mutation. ASVS V4 (Access Control). | `extreme-lint-policy.md` (security plugin); per-handler reviews |
| A02 | **Cryptographic Failures** | TLS 1.2+ everywhere; AES-256-GCM at rest; argon2id / bcrypt for passwords; no MD5 / SHA-1 / DES; HSTS preload; certificate pinning where applicable. ASVS V6 (Stored Cryptography), V9 (Communication). | `no-discards.md` (Sonar S5547 weak-hash); `secrets-management.md` |
| A03 | **Injection** | Parameterised SQL (no string concat); ORM-validated input; `execFile` over `exec`; URL allowlists for SSRF. ASVS V5 (Validation, Sanitisation, Encoding). | `no-discards.md` (S2068, S2076 SSRF); `code-reviewer` agent |
| A04 | **Insecure Design** | Threat-model before code (STRIDE for new features); deny-by-default architecture; least-privilege IAM. NIST SP 800-53 SA-3, SA-8. | `task-intake-due-diligence.md` (Q5 + Q7); `architect` agent |
| A05 | **Security Misconfiguration** | Hardened defaults (no `debug=true` in prod); CSP / HSTS / SRI present; cookies `HttpOnly` + `Secure` + `SameSite`; minimal exposed ports; default-credentials check. ASVS V14 (Configuration). | `docker-localhost-binding.md`; `repo-setup-checklist.md` |
| A06 | **Vulnerable Components** | CVE gate green (CRITICAL / HIGH / MODERATE all block); abandoned dep gate; SBOM generated. ASVS V10 (Malicious Code). | `dependency-vulnerabilities.md`; `updated-frameworks.md`; `dependency-overrides-not-exceptions.md` |
| A07 | **Identification + Auth Failures** | Strong session mgmt; password length ≥12; rate-limited login; MFA for admin; refresh-token rotation w/ reuse detection; cell-bound JWTs in multi-region. ASVS V2 (Authentication), V3 (Session Mgmt). | `secrets-management.md`; `extreme-lint-policy.md` |
| A08 | **Software + Data Integrity Failures** | Signed releases (Sigstore / GPG); CI artifact provenance (SLSA Level ≥2); webhook signature verification + replay protection; subresource integrity for CDN scripts. ASVS V14.2 (Dependency). | `dependency-vulnerabilities.md` + signed-commit branch protection (see `security-controls-org-wide.md`) |
| A09 | **Security Logging + Monitoring Failures** | Security events logged with structured fields; no secrets in logs; RUM / APM wired; audit trail for sensitive ops; alerting on auth/authz anomalies. ASVS V8 (Data Protection), V7 (Error Handling + Logging). | `no-silent-failures.md`; `error-handling-with-context.md`; `observability-patterns` skill |
| A10 | **Server-Side Request Forgery (SSRF)** | URL validators (no private IPs, no IMDS, no localhost from prod); allowlist outbound destinations; restrict cloud metadata. ASVS V12.1, V13.1. | `no-discards.md` (S1313 hardcoded-IP + S2076 SSRF); `code-reviewer` |

## Mandatory pre-commit security checks

Per `done-criteria.md`, every commit verifies (in order):

| # | Check | Standard | Enforcement |
| --- | --- | --- | --- |
| 1 | No hardcoded secrets (API keys, passwords, tokens, JWT signing keys, private keys, cloud IAM long-term keys) | ASVS V2.10, CWE-798 | PostToolUse `no-discards` hook; gitleaks pre-commit; CI gitleaks job |
| 2 | All user inputs validated (length, type, encoding, format, allowlist of acceptable chars) | ASVS V5.1, CWE-20 | Per-handler review; runtime schema validation (Zod / Pydantic / class-validator) |
| 3 | SQL injection prevention (parameterised queries, ORM-mediated input, no string concat) | ASVS V5.3.4, CWE-89 | `no-discards.md` S2077; ORM enforcement |
| 4 | XSS prevention (textContent over innerHTML, `Content-Security-Policy` + `nonce`-based scripts, sanitisation library for any user-rendered HTML) | ASVS V5.3.2, V14.4.3, CWE-79 | `no-discards.md` S6299 (Vue), S6481 (React); CSP header check |
| 5 | CSRF protection (double-submit cookie OR `SameSite=Lax`+`Secure` + Origin/Referer check on state-changing requests) | ASVS V4.2.1, CWE-352 | Per-handler review |
| 6 | Authentication / authorization verified on every endpoint (no "forgotten" middleware) | ASVS V4.1, CWE-862 | `code-reviewer` agent |
| 7 | Rate limiting on every public endpoint + every auth endpoint | ASVS V11.1, CWE-770 | Rate-limit middleware; `no-discards.md` S5876 |
| 8 | Error messages don't leak sensitive data (stack traces, file paths, DB error strings stripped before client response) | ASVS V7.4, CWE-209 | `error-handling-with-context.md` rule 8 |
| 9 | Dependency CVE gate green (MODERATE+ blocks) | OWASP Dependency-Check; ASVS V10 | `dependency-vulnerabilities.md` |
| 10 | License allowlist gate green (SPDX list + Trove cross-check) | Org legal policy | `license-allowlist-gate.md` |
| 11 | Security exceptions live in org's central `.github` repo, NOT consumer | Org governance | `security-controls-org-wide.md` |

## Secret management — the rules in one place

Per `secrets-management.md`:

1. **Vault, never disk** — AWS Secrets Manager / GCP Secret
   Manager / HashiCorp Vault / 1Password Secrets Automation /
   macOS Keychain via aws-vault. Never `~/.aws/credentials` in
   plaintext.
2. **`.env` files are LOCAL ONLY** — gitignored everywhere;
   populated from the vault on first checkout; never committed.
3. **`.env.example` exists** — placeholder values only;
   committed for documentation.
4. **`docs/secrets.md`** documents the SOURCE of each secret
   in prod + dev.
5. **Rotation is atomic** (per `proper-fixes-first.md`) — a
   single script that updates vault + DB + consumers in the
   right order; never step-by-step.
6. **On suspected exposure**: rotate FIRST, scrub history
   LATER. The window between "I think it leaked" and "the old
   key still works" is the real risk.
7. **No private keys in git EVER** — no `*.pem`, `*.key`,
   `id_rsa*`, `id_ed25519*`. Test fixtures generate keys at
   test-setup time.

## Threat modeling — STRIDE applied to every new feature

Per ISO/IEC 27001:2022 + NIST SP 800-30, every non-trivial
feature gets a STRIDE pass during Council Phase 0:

| Letter | Category | Question |
| --- | --- | --- |
| **S** | Spoofing | Can a user pretend to be another user / service? |
| **T** | Tampering | Can data be modified in transit or at rest in a way the receiver can't detect? |
| **R** | Repudiation | Can a user deny having performed an action we have no record of? |
| **I** | Information disclosure | What sensitive data could leak (PII, secrets, internals)? |
| **D** | Denial of service | What can an attacker do to exhaust resources or block legitimate users? |
| **E** | Elevation of privilege | Can a low-privilege user gain higher privileges? |

The STRIDE answers populate the task-intake's Q7 (Security)
field. For features that touch user data, the answers also
feed the GDPR / CCPA review.

## Compliance (privacy + regulatory)

When the project handles user data, the security review also
covers:

| Regulation | Scope | Mandatory checks |
| --- | --- | --- |
| **GDPR** (EU) | EU resident data | Lawful basis documented; data-subject rights (access, delete, port, rectify); DPO contact; cross-border transfer mechanism (SCC / adequacy); breach-notification within 72h; DPIA for high-risk processing |
| **CCPA / CPRA** (California) | California resident data | Notice-at-collection; opt-out of sale + sharing; right-to-delete; right-to-know; data-broker registration if applicable |
| **HIPAA** (US health) | Protected Health Information | BAA with every subprocessor; minimum-necessary access; audit logs immutable for 6y; encryption at rest + in transit |
| **PCI-DSS v4.0** | Payment card data | SAQ at minimum; no card-data storage outside Stripe / Adyen / similar PSP; quarterly ASV scans; pen test annually |
| **SOC 2 Type II** | Service org controls | Trust Service Criteria evidence; vendor-management policy; change-management process; access reviews quarterly |
| **ISO/IEC 27001:2022** | ISMS | Statement of Applicability; risk treatment plan; Annex A controls (93 of them); internal audit + management review annually |
| **POPIA** (South Africa) | South African resident data | Information officer registered; cross-border transfer notice; record of processing activities |

The applicable subset is named in the task-intake (per
`task-intake-due-diligence.md` Q7). Out-of-scope regulations
are explicitly marked N/A with a one-line reason.

## Security response protocol

When a security issue is found at any layer (lint, hook, code
review, post-merge, production incident, external report):

1. **STOP** the work that uncovered it. Do not "fix and continue."
2. **Triage severity** using CVSS v3.1:
   - CRITICAL (9.0–10.0) → fix immediately, no batching
   - HIGH (7.0–8.9) → fix within 24h
   - MEDIUM (4.0–6.9) → fix within 7d
   - LOW (0.1–3.9) → fix within 30d
3. **Delegate to `security-reviewer`** agent for the technical
   fix. The agent runs through OWASP Top 10 + ASVS to confirm no
   sibling issues.
4. **Rotate** any exposed secrets BEFORE scrubbing history (per
   `secrets-management.md` §9).
5. **Audit the entire codebase** for the same class of issue —
   one missing CSRF check usually means others.
6. **Document the incident** in `docs/security-incidents.md`
   (project) with date, scope, evidence of misuse (or none),
   remediation timeline, and lessons.
7. **Add a pre-deploy check** (per `deploy-failures-become-
   checks.md`) so the same class can't recur silently.

## Cross-references

- `dependency-vulnerabilities.md` — CVE gate (MODERATE+ blocks)
- `license-allowlist-gate.md` — SPDX allowlist + cross-check
- `dependency-overrides-not-exceptions.md` — fix the tree
- `security-controls-org-wide.md` — 5-layer non-bypassable
  enforcement
- `secrets-management.md` — vault-first; atomic rotation
- `install-allowlist.md` — no silent global installs
- `repo-setup-checklist.md` — 20-point first-touch checklist
- `docker-localhost-binding.md` — `127.0.0.1:` on every port
- `no-local-fs.md` — no FS state on ephemeral platforms
- `no-discards.md` (hook-enforced) — blocks hardcoded secrets
  - weak-crypto patterns on save
- `error-handling-with-context.md` — error responses sanitise
  internal details before reaching client
- `extreme-lint-policy.md` — `gosec`, `bandit`,
  `eslint-plugin-security`, clippy security lints mandatory
- `task-intake-due-diligence.md` Q7 — security is part of
  every task's intake
- `done-criteria.md` — security checks gate every "done"
  claim
- Council Protocol Phase 0 (`CLAUDE.md`) — `security-reviewer`
  is Division 4

## Why this rule exists

Security defects ship to production because the security review
is implicit and ad-hoc. Making the review structured (OWASP Top
10 mapping + STRIDE + compliance table + pre-commit gates) means
the review can't be skipped — every PR, every commit, every
deploy walks the same checklist.

The umbrella exists to point at the specific sister rule that
enforces each control. The sister rules carry the actual
machinery (hooks, lints, gates); this rule names the standards
they implement against (OWASP, ASVS, NIST, ISO 27001, CWE
Top 25, PCI-DSS, GDPR, CCPA, POPIA, HIPAA).

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New OWASP Top 10 release that changes category names or rankings (taxonomy needs update)
- New CVE class recurring across multiple repos (new sister rule candidate)
- New regulation (e.g., DORA, NIS2, EU AI Act) in scope but no compliance section in the umbrella (regulation row needed)
- STRIDE pass skipped on a non-trivial feature (rule weakening — Phase 0 discipline)
- Security finding triaged below its CVSS class (severity-SLA drift)
- Security review degraded into ad-hoc judgement vs structured checklist
- Sister rule's machinery not invoked in a Council pass that should have triggered it
- Compliance table row marked N/A without justification

**Refinement candidates**:

- New row in the compliance table when a regulation enters scope
- New cross-reference when a new sister rule covers a control the umbrella names but doesn't enforce
- Tightening of the pre-commit checklist when a new defence-in-depth gate emerges
- New OWASP-Top-10 mapping update when the spec releases a new version
