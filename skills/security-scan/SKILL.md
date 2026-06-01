---
name: security-scan
description: Scan a Claude Code configuration surface (`.claude/` directory, `CLAUDE.md`, `settings.json`, MCP servers, hooks, agent definitions) for security vulnerabilities, misconfigurations, and prompt-injection risks using AgentShield (`ecc-agentshield`). Sister to `security-review` (broader OWASP / source-code audit). Use this skill when the target is the AGENT CONFIG, not the application source.
---

# Security Scan (AgentShield)

> Vendor-integration recipe for [AgentShield](https://github.com/affaan-m/agentshield).
> Sister to `~/.claude/skills/security-review/SKILL.md` (source-code
> audit — different scope), `~/.claude/skills/owasp-asvs/SKILL.md`
> (ASVS L1/L2/L3 verification), `~/.claude/rules/common/install-allowlist.md`
> (publisher review before adoption), `~/.claude/rules/common/secrets-management.md`
> (vault-first secret storage), `~/.claude/rules/common/repo-setup-checklist.md`
> (20-point first-touch checklist).

## Purpose

AgentShield audits a Claude Code configuration surface (the
`.claude/` directory + `CLAUDE.md` + MCP / hook / agent
definitions) for the security classes that matter at that
LAYER: hardcoded secrets in config, over-permissive allowlists,
auto-run / prompt-injection patterns, supply-chain risk in MCP
servers, command-injection in hooks, dangerous bypass flags.

This is DIFFERENT FROM auditing application source code (use the
`security-review` skill / `security-reviewer` agent for that)
and DIFFERENT FROM running OWASP ASVS controls (use
`owasp-asvs`). The agent-config layer has its own threat model;
this skill addresses it.

## When to use

- Setting up a new Claude Code project for the first time
  (per `~/.claude/rules/common/repo-setup-checklist.md`)
- After modifying `.claude/settings.json`, `CLAUDE.md`, or MCP
  configs
- Before committing configuration changes
- When onboarding to a new repository with existing Claude Code
  configs
- Periodic security-hygiene checks (quarterly recommended)
- Pre-deploy when a hook or agent change is in the diff

## When NOT to use

- Auditing application source code → use `security-review`
- Verifying OWASP ASVS controls → use `owasp-asvs`
- Pen-testing a deployed system → use a real DAST tool
  (OWASP ZAP, Burp Suite Pro, Nuclei)
- Dependency CVE scanning → use the sister gates in
  `~/.claude/rules/common/dependency-vulnerabilities.md`
  (`pnpm audit`, `npm audit`, `osv-scanner`, `govulncheck`,
  `pip-audit`, `cargo audit`, `bundler-audit`, `trivy`)
- License auditing → use `~/.claude/rules/common/license-allowlist-gate.md`
  workflow

## What it scans

| Target file | Checks |
| --- | --- |
| `CLAUDE.md` | Hardcoded secrets; auto-run instructions; prompt-injection patterns |
| `settings.json` / `settings.local.json` | Overly permissive allow lists, missing deny lists, dangerous bypass flags |
| `mcp.json` | Risky MCP servers, hardcoded env secrets, npx supply-chain risks |
| `hooks/**` | Command injection via interpolation, data exfiltration, silent error suppression |
| `agents/*.md` | Unrestricted tool access, prompt-injection surface, missing model specs |

## Prerequisites

**Per `~/.claude/rules/common/install-allowlist.md`:** Confirm
AgentShield's npm publisher (`affaan-m`) + recent release
cadence + signing posture before adoption. The tool is
single-author maintained; treat it as higher supply-chain risk
than verified-org publishers (`@microsoft/*`, `@anthropic-ai/*`,
`@github/*`).

After review + explicit user approval:

```bash
# Check installed version
npx ecc-agentshield --version

# Install globally (pin the version)
npm install -g ecc-agentshield@<pinned-version>

# Or run via npx with version pin (NOT bare `npx -y`)
npx ecc-agentshield@<pinned-version> scan .
```

The bare `npx -y` form is in the global deny list. Always pin
the version.

## Usage

### Basic scan

```bash
# Scan current project
npx ecc-agentshield scan

# Scan a specific path
npx ecc-agentshield scan --path /path/to/.claude

# Filter by minimum severity
npx ecc-agentshield scan --min-severity medium
```

### Output formats

```bash
# Terminal (default) — coloured report with grade
npx ecc-agentshield scan

# JSON — for CI integration
npx ecc-agentshield scan --format json

# Markdown — for documentation
npx ecc-agentshield scan --format markdown

# HTML — self-contained dark-theme report
npx ecc-agentshield scan --format html > security-report.html
```

### Auto-fix (review before applying)

```bash
npx ecc-agentshield scan --fix
```

Auto-fix applies only safe, well-defined fixes:

- Replaces hardcoded secrets with env-var references
- Tightens wildcard permissions to scoped alternatives
- Leaves manual-only suggestions untouched

**Always review the diff** before committing auto-fixes; per
`~/.claude/rules/common/proper-fixes-first.md`, never accept a
mechanical fix without verifying the root cause is addressed.

### Deep analysis (opus-backed adversarial agents)

```bash
# Requires ANTHROPIC_API_KEY in env (vault per secrets-management.md)
export ANTHROPIC_API_KEY="$(security find-generic-password \
  -a "$USER" -s ANTHROPIC_API_KEY -w)"
npx ecc-agentshield scan --opus --stream
```

Runs the three-agent pipeline:
1. **Attacker (Red Team)** — find attack vectors
2. **Defender (Blue Team)** — propose hardening
3. **Auditor (Final Verdict)** — synthesise both perspectives

### Initialise secure config

```bash
npx ecc-agentshield init
```

Scaffolds:
- `settings.json` with scoped permissions + deny list
- `CLAUDE.md` with security best practices
- `mcp.json` placeholder

Useful for new projects; per
`~/.claude/rules/common/repo-setup-checklist.md`, ALSO run the
20-point first-touch checklist in the same pass.

### GitHub Action

```yaml
- uses: affaan-m/agentshield@v1
  with:
    path: '.'
    min-severity: 'medium'
    fail-on-findings: true
```

**Per `~/.claude/rules/common/security-controls-org-wide.md` rule
on SHA-pinning third-party actions:** pin to a full commit SHA,
not `@v1`. Use Dependabot / Renovate to bump the SHA on a
documented cadence.

## Severity grades

| Grade | Score | Meaning |
| --- | --- | --- |
| A | 90-100 | Secure configuration |
| B | 75-89 | Minor issues |
| C | 60-74 | Needs attention |
| D | 40-59 | Significant risks |
| F | 0-39 | Critical vulnerabilities |

## Interpreting results

### Critical (fix immediately)

- Hardcoded API keys / tokens in config files
- `Bash(*)` in the allow list (unrestricted shell access)
- Command injection in hooks via `${file}` interpolation
- Shell-running MCP servers

### High (fix before production / merge)

- Auto-run instructions in `CLAUDE.md` (prompt-injection vector)
- Missing deny lists in permissions
- Agents with unnecessary `Bash` access

### Medium (recommended)

- Silent error suppression in hooks (`2>/dev/null`, `|| true`)
- Missing PreToolUse security hooks
- `npx -y` auto-install in MCP server configs

### Info (awareness)

- Missing descriptions on MCP servers
- Prohibitive instructions correctly flagged as good practice

## Core patterns

### Pattern 1: Run before every config-touching commit

Per `~/.claude/rules/common/hooks.md` PostToolUse philosophy,
treat AgentShield as part of the local pre-commit gate when the
diff touches `.claude/**`. Adds ~5 seconds; catches the entire
class of "I just dropped a secret into `mcp.json`."

### Pattern 2: Combine with the install-allowlist review

When `mcp.json` adds a new MCP server, AgentShield flags
supply-chain risk patterns (`npx -y` without pin, unknown
publisher). Pair with the manual review in
`~/.claude/rules/common/install-allowlist.md` for the full
adoption decision.

### Pattern 3: Treat auto-fix as a starting point

Auto-fix is mechanical. The proper fix often requires moving a
secret to a different vault path, restructuring the hook
script, or rewriting the agent's tools list. Review the diff;
extend the fix as needed.

### Pattern 4: Don't silence findings

Per `~/.claude/rules/common/no-discards.md` + `extreme-lint-policy.md`,
the answer to a finding is either a fix or a documented
exception with expiry — never a per-line suppression directive.

## Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| `npx -y ecc-agentshield` without version pin | Install pinned: `npx ecc-agentshield@<version>` |
| Treating an "A" grade as proof of secure config | Grade is one signal; combine with `security-review`, `owasp-asvs`, `repo-setup-checklist.md` |
| Running scan only at setup, never afterwards | Wire into pre-commit + pre-deploy + CI |
| Accepting auto-fix without review | Always diff-review per `proper-fixes-first.md` |
| Sole reliance on AgentShield for source-code security | This scans agent config; use `security-review` + `security-reviewer` agent + `owasp-asvs` for code |
| ANTHROPIC_API_KEY exported in shell history (for `--opus`) | Use vault retrieval per `secrets-management.md` |

## Verification checklist

After running a scan, confirm:

- [ ] Grade ≥ B (project may require A; document policy)
- [ ] Zero Critical findings
- [ ] Zero High findings open without documented exception +
      expiry
- [ ] All Medium findings either fixed or ticketed with owner
- [ ] No per-line suppressions added to silence findings
- [ ] If auto-fix applied: diff reviewed + tested
- [ ] If a hook was modified by auto-fix: command-injection
      vector confirmed closed
- [ ] If a permission was tightened: app-side functionality
      tested

## Standards + references

- **AgentShield** —
  [github.com/affaan-m/agentshield](https://github.com/affaan-m/agentshield),
  [npm ecc-agentshield](https://www.npmjs.com/package/ecc-agentshield)
- **OWASP Top 10 for LLM Applications** —
  [owasp.org/www-project-top-10-for-large-language-model-applications/](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- **MITRE ATLAS** (Adversarial Threat Landscape for AI Systems)
  — adversarial ML threat catalogue
- **NIST AI RMF** (AI 100-1) — AI risk management framework
- **Anthropic Agent Skills security guidance** — official
  Anthropic guidance on Claude Code config hardening

## Cross-references

- `~/.claude/skills/security-review/SKILL.md` — source-code
  security review (different scope)
- `~/.claude/skills/owasp-asvs/SKILL.md` — ASVS L1/L2/L3
  verification
- `~/.claude/rules/common/install-allowlist.md` — publisher
  review before MCP / agent / tool adoption
- `~/.claude/rules/common/secrets-management.md` — vault storage;
  no secrets in config files
- `~/.claude/rules/common/repo-setup-checklist.md` — 20-point
  first-touch checklist (includes a security-scan step)
- `~/.claude/rules/common/security-controls-org-wide.md` —
  SHA-pin third-party GitHub Actions
- `~/.claude/rules/common/no-discards.md` — don't silence
  findings
- `~/.claude/rules/common/proper-fixes-first.md` — auto-fix is
  a starting point, not a finished fix

## Why this skill exists

Agent configuration is its own attack surface:

- Hardcoded API keys in `mcp.json` leak just like keys in source
- An over-broad `Bash(*)` allowlist hands the agent an
  unrestricted shell
- A hook that interpolates `${file}` enables command injection
  the moment a filename contains a backtick
- An MCP server installed via `npx -y` from an unknown publisher
  re-runs whatever the publisher pushes today, not what was
  reviewed yesterday
- A `CLAUDE.md` with "always run X" instructions becomes a
  prompt-injection vector when an attacker controls a file the
  agent reads

Source-code audits (`security-review`, `security-reviewer`
agent) don't catch these. AgentShield is the tool for the
config layer; this skill names the guardrails around its use
so adoption itself stays safe.

## Standards Cited

- **OWASP ASVS 4.0.3** — Application Security Verification Standard
  (L1 / L2 / L3 control catalogue)
- **OWASP Top 10 (2021) + OWASP Top 10 for LLM Applications
  (2025) + OWASP API Security Top 10 (2023)** — Vulnerability
  taxonomies the scan maps to
- **NIST SP 800-53 Rev 5 §RA-5, §SI-2, §SA-11** — Vulnerability
  scanning + flaw remediation + developer testing
- **NIST SP 800-115** — Technical guide to information security
  testing + assessment
- **NIST SP 800-218 SSDF §PW.8 + §RV.1** — Test executable code
  + identify + confirm vulnerabilities
- **CWE Top 25 (2026)** — Most dangerous software weaknesses
  reference
- **ISO/IEC 27001:2022 Annex A.8.8 + A.8.29** — Management of
  technical vulnerabilities + security testing
- **ISO/IEC 27034:2011** — Application security
- **PCI-DSS v4.0 §6.3 + §11.3** — Software vulnerability + secure
  coding + penetration testing
- **CIS Critical Security Controls v8** — Control 7 (continuous
  vulnerability management) + Control 16 (application software
  security)
- **CVSS v3.1 / v4.0** — Vulnerability scoring system
- **`~/.claude/rules/common/dependency-vulnerabilities.md`** —
  CVE gate runs as part of every scan

## Cross-References

- `~/.claude/rules/common/security.md` — OWASP Top 10 umbrella +
  per-vulnerability sister-rule index
- `~/.claude/rules/common/secrets-management.md` — secret scan
  layer of the audit
- `~/.claude/rules/common/dependency-vulnerabilities.md` — CVE
  gate (MODERATE+ blocks)
- `~/.claude/rules/common/license-allowlist-gate.md` — SPDX
  license gate
- `~/.claude/rules/common/security-controls-org-wide.md` — 5-layer
  non-bypassable enforcement
- `~/.claude/agents/security-reviewer.md` — review the findings;
  classify severity; propose fixes
- `~/.claude/rules/common/audit-logging.md` — scan results
  audit-logged


## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Run scans only at release time | Defects accumulate; expensive late fixes | Pre-commit + PR + nightly + release; shift-left |
| Suppress CVE findings without expiry date | Backlog grows forever; real risks hide in noise | Every suppression carries owner + expiry; per `dependency-vulnerabilities.md` |
| Trust scanner output verbatim | False positives waste reviewer time; false negatives slip through | Triage every finding; document reasoning |
| Scan only production code, ignore dev / test deps | Build-time supply-chain attacks (e.g., compromised lint plugin) | Scan ALL declared deps including dev |
| One scanner only | Each tool has blind spots | Defence in depth: SAST + DAST + dep-scan + secret-scan + container-scan |
| Findings reported to Slack but never tracked | Visibility ≠ resolution | Ticket every finding above threshold; SLA per CVSS severity |
| `gitleaks` allowlist with regex (`.*test.*`) | Misses real secrets in test files; false negatives | Per-finding suppression with hash + reason |
| Scan results not in CI gating | Scans become advisory; nothing blocked | Gate per `security-controls-org-wide.md` 5-layer model |


## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New `mcp.json` server added without an AgentShield scan in the
  same commit (rule "When to use" weakening)
- Grade drops from A → B+ on a previously-clean config (something
  was relaxed; investigate)
- Auto-fix accepted without diff review (anti-pattern 4
  recurrence; sister `proper-fixes-first.md` weakening)
- ANTHROPIC_API_KEY exported in plain shell command for
  `--opus` mode (sister `secrets-management.md` weakening)
- AgentShield publisher rotates / signing key changes (re-trigger
  publisher review per `install-allowlist.md`)
- GitHub Action pinned by tag (`@v1`) instead of full SHA (sister
  `security-controls-org-wide.md` weakening)
- Finding silenced via per-line suppression instead of fixed
  (sister `no-discards.md` violation)
- Scan run ONLY at setup; no pre-commit / pre-deploy wiring
  (pattern 1 weakening)

**Refinement candidates**:
- New row in the "What it scans" table when AgentShield ships a
  new check class (e.g., subagent permission scan, plugin scan)
- New "tool alternative" entry under "When NOT to use" when a
  competing scanner (Anthropic-native, MITRE ATLAS-driven, etc.)
  becomes the team's primary choice
- Tightening of the publisher-review requirement when a supply-
  chain incident surfaces in this category
- New cross-reference when a sister rule / skill defines a
  guardrail this skill should chain into (e.g., new
  `prompt-injection-defense.md` rule when authored)
