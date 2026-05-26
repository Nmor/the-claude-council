# Security Guidelines

> This is the umbrella OWASP/secrets/authz baseline. For the
> supply-chain + CI side of security, see also:
>
> - `dependency-vulnerabilities.md` — CVE gate (CRITICAL, HIGH,
>   MODERATE block; LOW reported)
> - `license-allowlist-gate.md` — SPDX allowlist + Trove cross-check
> - `dependency-overrides-not-exceptions.md` — `pnpm.overrides` as
>   the canonical CVE-mitigation tool; replace before excepting
> - `security-controls-org-wide.md` — 5-layer non-bypassable
>   enforcement + centralize allowlists in org repo
> - `github-actions-gotchas.md` — bash -e + pipefail, 21K limit,
>   runner OOM, etc.
> - `ci-test-memory-tuning.md` — Jest heap × workers sizing

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data
- [ ] Dependency CVE gate green (MODERATE+ blocks per
      `dependency-vulnerabilities.md`)
- [ ] License-allowlist gate green (per `license-allowlist-gate.md`)
- [ ] Any security exception lives in the org's `.github` repo,
      NOT in this consumer repo (per `security-controls-org-wide.md`)

## Secret Management

- NEVER hardcode secrets in source code
- ALWAYS use environment variables or a secret manager
- Validate that required secrets are present at startup
- Rotate any secrets that may have been exposed

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues
