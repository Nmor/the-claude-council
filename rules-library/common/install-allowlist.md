# Install-Allowlist Rule (Global Default)

> Auto-fires on every file. Sister to `dependency-vulnerabilities.md`,
> `license-allowlist-gate.md`, `security-controls-org-wide.md`,
> `updated-frameworks.md`, `official-docs-first.md`.

## Core Principle

**No global install — of any package, extension, MCP, or runtime — happens
without an approval check against this allowlist. If the publisher is not on
the allowlist, the agent stops and asks the user. No silent installs, no
"npx -y" auto-runs, no curl-pipe-sh.**

This rule exists because the largest realised supply-chain attacks on
developer machines come not through application dependencies (caught by
the `dependency-vulnerabilities.md` CVE gate) but through global, IDE-level,
or shell-level installs where the user trusted the install command itself.
Examples include the `event-stream` npm package compromise, the `solana/
web3.js` 2024 backdoor, multiple VS Code marketplace extension take-overs
("Material Theme Free", "Solidity Visual Auditor", "ETHCode"), and the
recent wave of typosquatted MCP servers on uncurated registries.

The gate is preventive: it blocks the install BEFORE the compromised code
ever reaches the developer's machine.

## Hard rules

1. **No `npm install -g`, `pnpm add -g`, `pip install`, `pipx install`,
   `gem install`, `cargo install`, `go install`, or `brew install` runs
   without an explicit user approval.** All such commands are in the `ask`
   block of `~/.claude/settings.local.json`.

2. **No `npx -y <pkg>`, `pnpm dlx <pkg>`, `bunx -y <pkg>`, `pipx run --
   spec <pkg>`** — these auto-download and execute remote code. They are
   in the `deny` block of `~/.claude/settings.local.json`.

3. **No `curl … | sh` or `wget … | bash` installer pipes.** These are
   `deny`. Always download the script, read it, then run it.

4. **No VS Code / Cursor / Windsurf / Codex extension install runs
   silently.** `extensions.autoUpdate: false` is the default in
   `~/Library/Application Support/Code/User/settings.json`. Updates apply
   only after manual review.

5. **No new MCP server is registered without a publisher check.** See
   "MCP publisher allowlist" below. Adding an MCP from an unknown
   publisher requires:
   - Reading the source (the binary, the npm package, the git repo)
   - Confirming the publisher is verified (Anthropic, Docker, official
     vendor, well-known maintainer)
   - Documenting the decision in `~/.claude/plugins/installed_plugins.json`

6. **No `brew tap` for an unofficial tap without user approval.**
   Compromised third-party taps inject formulas the user did not request.

7. **Every install runs the corresponding vulnerability scan immediately
   after.** Per `dependency-vulnerabilities.md`. A successful install +
   skipped scan is not "done."

## Publisher allowlists

### npm / pnpm / yarn packages — DO-NOT-INSTALL list

These packages are abandoned, deprecated, or actively malicious. If a
project pulls them transitively, fix with `pnpm.overrides` (see
`dependency-overrides-not-exceptions.md`). Never install directly.

| Package | Replacement | Reason |
| --- | --- | --- |
| `request` | `undici`, `fetch`, `axios` | Archived 2020 |
| `node-sass` | `sass` (Dart Sass) | Deprecated |
| `aws-sdk` v1 | `aws-sdk-v2`, `@aws-sdk/*` | v1 EOL |
| `dgrijalva/jwt-go` (Go) | `golang-jwt/jwt/v5` | CVE-2020-26160 |
| `golang/mock` (Go) | `go.uber.org/mock` | Archived |
| `jinzhu/gorm` v1 (Go) | `gorm.io/gorm` v2 | Unmaintained |
| `moment` (npm) | `date-fns`, `dayjs`, `Temporal` | Maintenance mode |
| `buffers` (npm) | drop entirely | Repo deleted 2014 |
| `event-stream@>=3.3.6` (npm) | `Readable.from`, `node:stream` | 2018 backdoor |
| `flatmap-stream` (npm) | drop | Bundled the `event-stream` backdoor |
| `mafintosh/cli-progress-bar` | `cli-progress` | Account-take-over history |
| `chalk-template@1.x` | `chalk-template@1.0.0` (pinned) | 2025 supply-chain compromise of the chalk maintainer's npm token |

### VS Code / Cursor extensions — Known-bad and "do-not-install"

| Publisher / extension | Reason |
| --- | --- |
| `MaterialTheme-Free.material-theme` | 2024 malware variant pulled from marketplace |
| `tintinweb.solidity-visual-auditor` (variants) | 2023 backdoored copy circulated on open-vsx |
| `SimonSiefke.prettier-vscode` (typo) | Typosquat of `esbenp.prettier-vscode` |
| `Microsoft.CodeRunner` (typo) | Typosquat of `formulahendry.code-runner` |
| `chinwobble.ethcode` and copies | 2024 supply-chain compromise of ETHcode |
| Any publisher not on the allowlist below | Unknown → ask user before installing |

**Allowlist of trusted VS Code / Cursor publishers**
(install without per-extension approval — but Council still reviews
the specific extension):

- `ms-*` (Microsoft official, e.g., `ms-python.python`, `ms-azuretools.*`)
- `github.*` (GitHub official)
- `anthropic.*` (Anthropic)
- `amazonwebservices.*` (AWS)
- `hashicorp.*` (HashiCorp)
- `redhat.*` (Red Hat)
- `google.*`, `googlecloudtools.*` (Google)
- `shopify.*` (Shopify)
- `sonarsource.*` (SonarSource)
- `vue.*` (Vue.js core team)
- `dbaeumer.*` (Dirk Bäumer — ESLint maintainer)
- `esbenp.*` (Esben Petersen — Prettier maintainer)
- `eamodio.*` (Eric Amodio — GitLens maintainer)
- `editorconfig.editorconfig`
- `charliermarsh.ruff` (Astral / ruff)
- `golang.go`
- `oxc.oxc-vscode` (Oxc / Boshen)
- `vitest.explorer` (Vitest core team)
- `bierner.*` (Matt Bierner — Microsoft)
- `davidanson.vscode-markdownlint`
- `mtxr.sqltools*`, `ultram4rine.sqltools-clickhouse-driver`
- `vscodevim.vim`
- `ryanluker.vscode-coverage-gutters`
- `mikestead.dotenv`
- `mechatroner.rainbow-csv`
- `sumneko.lua`

Any publisher not on this list → STOP and ask the user before
installing. Single-author publishers (`cweijan.*`, `fanruten.*`, etc.)
are higher risk by default because the take-over surface is one
person's npm/marketplace credentials.

### MCP servers — Publisher allowlist

| Publisher | Status | Notes |
| --- | --- | --- |
| Anthropic (claude.ai-hosted Gmail/Calendar/Drive/etc.) | ALLOWED | OAuth-scoped; review scopes on connect |
| Docker (`docker mcp gateway run`) | ALLOWED | Docker Desktop's MCP gateway |
| Modelcontextprotocol official servers (github.com/modelcontextprotocol/servers) | ALLOWED | Read source before each version bump |
| Third-party MCPs from unknown publishers | ASK USER | No silent install |
| MCPs that bundle binary executables (not source) | ASK USER + verify SHA | Supply-chain substitution risk |
| MCPs that exec arbitrary shell on start | ASK USER + read the exec line | Most-attacked surface |

### Homebrew taps — Allowlist

| Tap | Status |
| --- | --- |
| `homebrew/core` | ALLOWED (default) |
| `homebrew/cask` | ALLOWED (default) |
| Vendor-official taps (`hashicorp/tap`, `aws/tap`, `mongodb/brew`, `github/gh`) | ALLOWED |
| Any other tap | ASK USER |

## What to do when the rule fires

### "User asked me to install `<X>`"

1. **Look up the publisher** in the allowlist above.
2. **If allowed**: proceed; immediately after install, run the
   corresponding vulnerability scan (`brew audit`, `npm audit`,
   `pip-audit`, etc.).
3. **If not allowed**: STOP. Tell the user:
   - The publisher is not on the verified allowlist
   - What the install would do (binary location, network access, scopes)
   - The recommended alternative (if known)
   - Ask explicitly: "Proceed anyway?" with the install command quoted
4. **Never silently install** an unknown publisher, even if the user's
   prompt sounded urgent. The 30 seconds of approval friction is the
   product, not the bug.

### "Renovate / Dependabot opened a PR bumping `<X>`"

1. Read the changelog of the bump. If it crosses a major version,
   surface the breaking changes.
2. Run the project's full test suite + CVE gate + license gate.
3. If green on every gate, the bump is safe to merge.

### "I see a new MCP I might want to register"

1. Stop. Open the MCP's source (npm package, git repo).
2. Read `package.json` / `pyproject.toml` / `Cargo.toml`. Check the
   author, the repo URL, the publish history (`npm info`, `pip show`).
3. Read the actual transport code (stdio handler, sse server). Note
   what tools it registers and whether any of them shell out.
4. Bring findings to the user before adding.

## VS Code / Cursor settings that enforce this rule

Already applied in `~/Library/Application Support/Code/User/settings.json`:

```jsonc
{
  "security.workspace.trust.untrustedFiles": "prompt",
  "security.workspace.trust.emptyWindow": false,
  "security.workspace.trust.enabled": true,
  "security.workspace.trust.startupPrompt": "always",
  "extensions.autoCheckUpdates": true,
  "extensions.autoUpdate": false,
  "task.allowAutomaticTasks": "off",
  "git.allowNoVerifyCommit": false,
  "git.allowForcePush": false,
  "telemetry.telemetryLevel": "off"
}
```

The same shape applies to Cursor (`~/Library/Application Support/Cursor/
User/settings.json`) and Windsurf when they are present.

## Shell-level enforcement

Already applied in `~/.claude/settings.local.json`:

- `deny`: `curl … | sh`, `curl … | bash`, `wget … | sh`, `wget … | bash`,
  `npx --yes`, `bunx --yes`, `pnpm dlx`, `brew install --HEAD`,
  `--dangerously-skip-permissions`.
- `ask`: every `brew install`, `npm install -g`, `pnpm add -g`,
  `pip install`, `pipx install`, `gem install`, `cargo install`,
  `go install`, `gh api`, `gh auth login`, `gh release`, `gh secret`,
  `gh variable`.

## Cross-references

- `dependency-vulnerabilities.md` — every install runs the CVE gate
- `license-allowlist-gate.md` — every install runs the license gate
- `security-controls-org-wide.md` — 5-layer enforcement pattern
- `updated-frameworks.md` — use latest stable; pair this with the
  allowlist check
- `official-docs-first.md` — every new external integration requires
  primary-source provider research first
- `~/.claude/plugins/blocklist.json` — programmatic deny-list

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Auto-run install (`npx -y`, `pnpm dlx`, `curl … | sh`) attempted (rule 2 / 3 violation)
- Unknown-publisher VS Code / Cursor extension installed without ask (publisher allowlist breach)
- New MCP server registered without source review (rule 5 weakening)
- Homebrew install from unofficial tap without ask (rule 6 violation)
- New typosquat / supply-chain-compromise incident matches an existing extension publisher pattern
- "Allowed" publisher discovered to have rotated maintainer with new account-takeover risk (allowlist needs revalidation)
- Post-install CVE scan skipped (rule 7 weakening)

**Refinement candidates**:

- New package on the DO-NOT-INSTALL list when a supply-chain compromise emerges
- New verified publisher row when an org maintainer proves trustworthy across multiple extensions
- Tightening of the MCP publisher check when a new MCP-specific attack surface (binary substitution, etc.) is observed
- New cross-reference when a sister rule (dependency-vulnerabilities, security-controls-org-wide) provides the post-install gate
