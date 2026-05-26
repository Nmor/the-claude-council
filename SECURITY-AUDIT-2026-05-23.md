# Security Audit & Hardening — 2026-05-23

Conducted by Council multi-agent audit. See conversation log for full findings.

## Completed (this session)

### Permissions / file modes
- `chmod 600 ~/.docker/config.json ~/.ssh/known_hosts.old ~/.npmrc`
- `~/.aws/credentials` and `~/.aws/config` — DEFERRED until IAM key rotation

### VS Code + Cursor hardening
- `security.workspace.trust.untrustedFiles: prompt` (was `open`)
- `security.workspace.trust.emptyWindow: false` (was `true`)
- `security.workspace.trust.startupPrompt: always`
- `extensions.autoUpdate: false` — reviews required before applying
- `telemetry.telemetryLevel: off`
- `task.allowAutomaticTasks: off`
- `git.allowForcePush: false`, `git.allowNoVerifyCommit: false`

### VS Code extensions removed
- `cweijan.vscode-postgresql-client2` (untrusted publisher, broad activation,
  plaintext DB creds)
- `fanruten.clickhouse-light` (obscure publisher, pre-alpha 0.0.6)
- 8 stale duplicate dirs in `~/.cursor/extensions/`

### Claude permissions narrowed
- `~/.claude/settings.local.json`: 28 allow / 25 ask / 14 deny
- DENY: `curl|sh`, `wget|sh`, `npx --yes`, `pnpm dlx`, `bunx --yes`,
  `--dangerously-skip-permissions`, `rm -rf /`, `chmod 777`,
  `brew install --HEAD`
- ASK: every global install (`brew`, `npm -g`, `pip`, `pipx`, `gem`,
  `cargo`, `go`), `curl`, `wget`, `gh api`, `gh auth`, `gh secret`,
  `docker pull`, `docker run`, `git push`, `git reset`, `git rebase`
- Narrowed `gh:*` to `gh pr/issue/repo view/workflow view/run`

### MCP / plugin templates
- Renamed `~/.claude/mcp-configs/mcp-servers.json` → `mcp-servers.json.example`
  (it contained placeholder secrets adjacent to live config dir)
- Extended `~/.claude/plugins/blocklist.json` with known-bad publishers
  (material-theme-free, ethcode, solidity-visual-auditor, unknown-marketplace)

### Brew (66 formulas upgraded)
Notable critical patches:
- `git 2.51.2 → 2.54.0`
- `openssl@3 3.6.1 → 3.6.2`
- `postgresql@17 17.7 → 17.10`
- `gh 2.86.0 → 2.92.0`
- `terraform 1.14.0 → 1.15.4`
- `node 25.2.1 → 26.0.0` (unversioned)
- `node@24 24.13.0 → 24.16.0` (LTS)
- `redis 8.2.3 → 8.6.3`
- `rust 1.92.0 → 1.95.0`
- `helm 4.1.3 → 4.2.0`
- `mongosh 2.5.10 → 2.8.3`

Removed (EOL):
- `openssl@1.1` (EOL Sep 2023; multiple unpatched CVEs)
- `openjdk@11` (EOL Oct 2024)
- `icu4c@77` (deprecated; via `brew cleanup`)
- Leftover `/opt/homebrew/etc/openssl@1.1/` config dir

Kept (with notes):
- `node@25` — required transitively by `mongosh` + `mongodb-atlas-cli`

### Docker images refreshed
New images pulled (containers still need to be manually swapped):
- `postgres:17-alpine` (replaces `postgres:15` — EOL Nov 2025)
- `nginx:1.28-alpine` (replaces `1.27-alpine`)
- `crowdsecurity/crowdsec:v1.7.8` (replaces `v1.6.4`)
- `localstack/localstack:4.14` (replaces `3.8`)
- `ollama/ollama:latest`

### npm globals
- `npm 11.6.2 → 11.12.1`
- `@playwright/test 1.58.2 → 1.60.0`

### Global config files
- `~/.npmrc`: `ignore-scripts=true`, `audit-level=moderate`, `fund=false`,
  `yes=false` (blocks bare `npx -y`), explicit HTTPS registry
- `~/.config/pnpm/rc`: `ignore-scripts=true`, `audit=true`,
  `prefer-frozen-lockfile=true`, `strict-peer-dependencies=true`

### New global rule
- `~/.claude/rules/common/install-allowlist.md` — publisher allowlist
  for npm packages, VS Code extensions, MCP servers, Homebrew taps;
  no silent installs from unknown publishers

### Shell hygiene
- `~/.zprofile` deduplicated (was `eval brew shellenv` twice)
- Removed `~/.zprofile.macports-saved_2025-06-09_at_09:34:18` backup
- Added `CLAUDE_BYPASS_PERMISSIONS=0` belt-and-suspenders env var

## Pending — requires user

1. **AWS IAM key rotation (CRITICAL)**
   - Old key: `AKIA…/moses@bfree.africa` in `~/.aws/credentials` (mode 644)
   - User in process of rotating in AWS console
   - After rotation: `chmod 600 ~/.aws/credentials ~/.aws/config`,
     install + configure `aws-vault` so plaintext key never sits on disk

2. **Anthropic OAuth connectors audit**
   - Three claude.ai-hosted MCPs (Gmail, Calendar, Drive) hold delegated
     Google tokens
   - Review at claude.ai settings → revoke any not actively used

3. **Containers using old images**
   - Run `docker compose down && docker compose pull && docker compose up -d`
     in each project that referenced the old tags

4. **Powershell cask deprecated** (brew doctor warning)
   - `brew uninstall --cask powershell` and follow Microsoft's distribution
     migration if PowerShell is still needed

5. **Unbrewed node headers in `/usr/local/include/node/`** (brew doctor)
   - Leftover from old Node install; `sudo rm -rf /usr/local/include/node`
     if no longer needed

6. **GrowthBook `tengu_disable_bypass_permissions_mode`** (server-side flag)
   - Cannot be toggled from .claude.json directly; the deny rule for
     `--dangerously-skip-permissions` in settings.local.json is the
     local belt-and-suspenders

## Standing controls (now active)

- Any new `brew install`, `npm -g`, `pip`, `pipx`, `gem`, `cargo`,
  `go install`, `gh api`, `gh secret` runs through an explicit ASK prompt
- Any `curl|sh`, `wget|sh`, `npx -y`, `pnpm dlx`, `bunx -y` is DENIED
  outright
- VS Code + Cursor never auto-update extensions
- Workspace trust is enforced on every new workspace + untrusted file
- npm postinstall scripts blocked globally (`ignore-scripts=true`)
- Console telemetry off in both editors
