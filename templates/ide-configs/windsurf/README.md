# Windsurf IDE setup

> Windsurf is a VS Code fork by Codeium with built-in AI features
> (Cascade chat + Supercomplete inline AI). Most VS Code patterns
> apply identically; this directory holds the Windsurf-specific
> delta.
>
> Per `~/.claude/rules/common/install-allowlist.md`, every extension
> install passes through publisher review. The recommendations in
> `extensions.json` are all from verified publishers; bypass requires
> explicit user approval.

## 1. Install Anthropic Claude Code (recommended)

Windsurf supports the Claude Code extension via the Microsoft
Marketplace or Open-VSX.

```bash
# CLI install
windsurf --install-extension anthropic.claude-code

# Verify
windsurf --list-extensions | grep claude-code
```

Default keybinding once installed: **Cmd+Esc** (macOS) / **Ctrl+Esc**
(Windows / Linux) opens the Claude Code sidebar.

## 2. Apply the curated extensions list

Two options:

**Per-workspace** (recommended for shared repos):

```bash
mkdir -p .windsurf
cp ~/.claude/templates/ide-configs/windsurf/extensions.json .windsurf/
```

Windsurf will prompt to install missing recommendations on next
open.

**Global** (your machine, one-shot):

```bash
# Reads extensions.json + installs each "recommendation" entry
jq -r '.recommendations[]' \
    ~/.claude/templates/ide-configs/windsurf/extensions.json \
    | while read ext; do
        windsurf --install-extension "$ext"
      done
```

## 3. Apply the hardened settings

Merge the contents of `settings.json` into your user settings:

| Platform | Path |
| --- | --- |
| macOS   | `~/Library/Application Support/Windsurf/User/settings.json` |
| Linux   | `~/.config/Windsurf/User/settings.json` |
| Windows | `%APPDATA%\Windsurf\User\settings.json` |

```bash
# macOS one-shot (after backing up your existing settings.json)
SRC=~/.claude/templates/ide-configs/windsurf/settings.json
DST="$HOME/Library/Application Support/Windsurf/User/settings.json"

cp "$DST" "$DST.bak.$(date +%Y%m%d-%H%M%S)"
# Merge JSONC manually (use a JSONC-aware merger; do NOT use plain jq
# because Windsurf's settings file is JSONC, not JSON).
```

The settings.json hardening covers:

- Workspace trust + extension governance (per
  `~/.claude/rules/common/install-allowlist.md`)
- Git safety — no `--no-verify`, no force push, signed commits (per
  `~/.claude/rules/common/git-workflow.md` +
  `~/.claude/rules/common/plan-completion-before-push.md`)
- Telemetry off — both VS Code side AND Codeium side (per
  `~/.claude/rules/common/secrets-management.md`)
- Format-on-save + per-language formatters (per
  `~/.claude/rules/common/extreme-lint-policy.md`)
- SonarLint strict thresholds (cognitive ≤ 10, function lines ≤ 80,
  function params ≤ 5, file lines ≤ 500, nested depth ≤ 3, boolean
  operators ≤ 2, magic numbers flagged) (per
  `~/.claude/rules/common/sonarlint-checks.md`)

## 4. Disable Windsurf's built-in AI when running Claude Code

`settings.json` ships with:

```jsonc
"windsurf.cascade.enabled": false,
"windsurf.supercomplete.enabled": false,
"codeium.enableCodeLens": false
```

This avoids three AI suggestion popups overlapping in the editor
(Cascade + Supercomplete + Claude Code). Pick ONE AI per workspace.
If a specific workspace prefers Cascade, override locally:

```jsonc
// <workspace>/.windsurf/settings.json
{
  "windsurf.cascade.enabled": true,
  "windsurf.supercomplete.enabled": true
}
```

## 5. Codeium privacy posture

Codeium's free tier opts users into training-data sharing by
default. The hardened settings file flips:

```jsonc
"codeium.telemetry.telemetryLevel": "off",
"codeium.telemetry.optOut": true
```

For regulated workspaces (PHI / PCI scope / classified), add
per-language opt-outs under `codeium.enableConfig`:

```jsonc
"codeium.enableConfig": {
  "*": false,
  "markdown": true  // example: allow on docs only
}
```

Per `~/.claude/rules/common/gdpr-ccpa.md` data-minimisation
principle, default to OFF and opt IN per-workspace only when the
data class is non-sensitive AND the legal review is documented.

## 6. Workspace-trust posture

```jsonc
"security.workspace.trust.enabled": true,
"security.workspace.trust.untrustedFiles": "prompt",
"security.workspace.trust.startupPrompt": "always"
```

The first time you open any new workspace, Windsurf prompts.
Default to "Don't trust" until you've verified the repo (per
`~/.claude/rules/common/repo-setup-checklist.md` 20-point first-
touch checklist).

## 7. Disable noisy / known-bad extensions

`extensions.json` lists `unwantedRecommendations`:

- `MaterialTheme-Free.material-theme` — 2024 malware variant
- `tintinweb.solidity-visual-auditor` — backdoor history
- `SimonSiefke.prettier-vscode` — typosquat
- `Microsoft.CodeRunner` — typosquat
- `chinwobble.ethcode` — supply-chain compromise
- `github.copilot` + `github.copilot-chat` — redundant with Cascade
  AND Claude Code (pick one); consciously remove from
  `unwantedRecommendations` to use it

## 8. Verify the setup

```bash
# Confirm extensions installed
windsurf --list-extensions

# Confirm settings applied (look for the keys we set)
grep -E '"codeium.telemetry.optOut"|"security.workspace.trust.enabled"|"git.allowNoVerifyCommit"' \
  "$HOME/Library/Application Support/Windsurf/User/settings.json"

# Confirm hardening (should all return the expected values)
# - codeium.telemetry.optOut: true
# - security.workspace.trust.enabled: true
# - git.allowNoVerifyCommit: false
```

## 9. References

- `~/.claude/rules/common/install-allowlist.md` — publisher
  allowlist + known-bad denylist
- `~/.claude/rules/common/extreme-lint-policy.md` — strictness
  thresholds the IDE inspections enforce
- `~/.claude/rules/common/secrets-management.md` — telemetry off,
  no auto-update of extensions
- `~/.claude/rules/common/git-workflow.md` — signed commits +
  no-verify blocked
- `~/.claude/rules/common/plan-completion-before-push.md` — push
  gate (active plan complete before any `git push`)
- `~/.claude/rules/common/sonarlint-checks.md` — SonarLint rule
  config the settings.json wires
- `~/.claude/rules/common/gdpr-ccpa.md` — data-minimisation
  default for Codeium telemetry
- `~/.claude/rules/common/repo-setup-checklist.md` — 20-point first-
  touch checklist (run on every new workspace)
- `~/.claude/templates/ide-configs/vscode/settings.json` — base
  VS Code settings this file extends
- Windsurf / Codeium documentation:
  [codeium.com/windsurf/docs](https://codeium.com/windsurf/docs)
