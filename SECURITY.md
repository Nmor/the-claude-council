# Security policy

Thank you for taking the time to disclose responsibly. This repo
ships rules, skills, and agents that thousands of engineers may
adopt into their global Claude Code configuration; a vulnerability
here can ripple into every consumer's local environment. Quiet,
coordinated disclosure protects them.

## Supported versions

| Tag / branch | Supported |
| --- | --- |
| `main` (rolling) | Yes — security fixes land here first. |
| Latest semver tag (`vX.Y.Z`) | Yes — bug-fix patch (`vX.Y.Z+1`) cut on every critical / high finding. |
| Older tags | No — upgrade to the latest tag. |

## Reporting a vulnerability

**Do NOT open a public issue.** Public issues are indexed by
search engines + LLM crawlers within minutes; a public proof of
concept against a deployed config is materially worse than the
original bug.

Use **GitHub Security Advisories** (private):

→ <https://github.com/Nmor/the-claude-council/security/advisories/new>

Or email the maintainer with the subject `[SECURITY] <one-line>`:
the canonical address is published in the maintainer's GitHub
profile.

## What to include

A useful report names:

1. **Surface** — which file / rule / skill / agent / verifier /
   install path is affected. Path under the repo root.
2. **Vulnerability class** — CWE id (e.g., CWE-78 Command
   Injection, CWE-94 Code Injection, CWE-22 Path Traversal,
   CWE-200 Info Disclosure, CWE-77 Command Injection in shell).
3. **Reproduction** — minimal steps. Ideally a `bash` /
   `pwsh` one-liner that demonstrates the issue against a
   clean clone.
4. **Impact** — what an attacker gains. Be specific (RCE on
   the consumer's laptop, exfil of `~/.aws/credentials`, etc.).
5. **CVSS v3.1 vector** (optional but appreciated).
6. **Suggested mitigation** (optional).
7. **Disclosure preference** — your preferred credit /
   coordinated-disclosure timing.

## What we triage

In scope:

- Code injection / RCE through `install.sh` / `install.ps1` /
  any `bootstrap/` script
- Command injection through verifier scripts under `tests/`
- Path-traversal in install / verify / template-copy logic
- Secrets exfil paths (any rule / skill that would teach an
  agent to log / transmit secrets)
- Supply-chain risk in GitHub Actions third-party action
  pins (SHA mis-pin, mutable tag in CI config)
- Rule / skill / agent content that, if followed verbatim,
  would weaken the consumer's security posture
  (e.g., advice to disable TLS verification, to suppress
  secret scanners)
- Cross-platform escalation paths (e.g., a bash script that's
  safe but its PowerShell sibling isn't)

Out of scope:

- Hardening suggestions without a concrete attack path
  (file these as feature requests via the issue template)
- Style / lint nits in published rules
  (file these as feature requests via the issue template)
- Reports against a downstream consumer's local config that
  forked our content (we can advise but cannot remediate
  there — file the issue with the downstream)
- Reports against Claude Code itself, Anthropic's APIs, or
  the upstream tools we cite (RFCs, OWASP, vendor docs) —
  please route those to the appropriate maintainer.

## Response process + SLA

| Step | Target |
| --- | --- |
| Acknowledgement | 72 hours from report. |
| Initial assessment (severity, scope) | 7 days. |
| Fix landed on `main` | CRITICAL / HIGH: 14 days. MEDIUM: 30 days. LOW: next scheduled release. |
| Tagged release with fix + advisory | Same day as fix on main for CRITICAL / HIGH. |
| Public advisory disclosure | After fix is released + a coordinated-disclosure window the reporter agreed to (default 30 days from fix). |

Severity follows CVSS v3.1. The maintainer makes the final call
when CVSS and operational impact disagree.

## What you get

- Credit in the published advisory (unless you prefer
  anonymous credit).
- A CVE id when GitHub assigns one (most CRITICAL / HIGH
  findings).
- A line in `CHANGELOG.md` under `### Security` for the
  release that fixes the finding.

## What we won't do

- Pay a bounty. This is a single-maintainer OSS repo without
  a sponsored bug-bounty program. Reports are appreciated;
  credit is the currency.
- Negotiate disclosure timing under pressure when the
  finding is being actively exploited. In that case we
  publish the fix + advisory immediately and notify reporters
  after the fact.

## Reporter protections

We will not:

- Retaliate against good-faith reports.
- Pursue legal action against researchers who follow this
  policy (no-CFAA-pursuit, in the US framing; equivalent in
  other jurisdictions).
- Share your identity with third parties without your
  explicit consent.

This policy is modelled on
<https://disclose.io/> and aligned with
[ISO/IEC 29147:2018](https://www.iso.org/standard/72311.html)
"Vulnerability disclosure" guidance.

## Related repo policies

- `rules/common/secrets-management.md` — what counts as a
  secret + how the config treats them.
- `rules/common/security-controls-org-wide.md` — 5-layer
  enforcement pattern this repo follows internally.
- `CODE_OF_CONDUCT.md` — reporter conduct + maintainer
  response expectations.

Thank you for keeping the ecosystem safer.
