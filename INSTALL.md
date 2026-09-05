# Installation Guide — The Claude Council

This guide walks through installing **The Claude Council** on
**macOS**, **Linux**, or **Windows**, then integrating it with
each supported IDE.

You don't need an organisation, a license key, or any cloud
account. Anyone can clone the repo and run the installer; the
result is a drop-in `~/.claude/` that Claude Code loads on the
next session.

> **TL;DR (macOS / Linux):**
>
> ```bash
> git clone https://github.com/Nmor/the-claude-council.git
> cd the-claude-council
> ./bootstrap/install.sh
> ./bootstrap/verify.sh
> ```
>
> **TL;DR (Windows / PowerShell — fully native, no WSL2 required):**
>
> ```powershell
> git clone https://github.com/Nmor/the-claude-council.git
> cd the-claude-council
> .\bootstrap\install.ps1
> .\bootstrap\verify.ps1
> ```

---

## Prerequisites

| Requirement | Minimum | How to install |
| --- | --- | --- |
| **`git`** | Any recent | macOS: `brew install git`. Linux: distro package. Windows: [git-scm.com](https://git-scm.com/) |
| **`bash`** *(macOS / Linux / WSL2)* | 4.0+ | macOS: `brew install bash` (the system bash is 3.2). Linux: usually present. Not needed on Windows-native — `*.ps1` scripts cover the full install / verify / uninstall flow. |
| **`claude` CLI** | Latest | Follow [Anthropic's install docs](https://docs.claude.com/claude-code) — separate from this repo |
| **`rsync`** *(macOS / Linux, optional)* | Any | Speeds up the install; falls back to `cp -R` if absent |
| **PowerShell** *(Windows only)* | 5.1+ | Ships with Windows 10/11; PowerShell Core 7+ also works on any OS |

Everything else (rules / skills / agents / commands / templates) ships in the repo.

---

## macOS

```bash
# 1. Clone the repo
git clone https://github.com/Nmor/the-claude-council.git
cd the-claude-council

# 2. Run the installer
./bootstrap/install.sh

# 3. Verify the install
./bootstrap/verify.sh

# 4. (Optional) Dry-run to see what would change without doing it
./bootstrap/install.sh --dry-run
```

What the installer does:

- Backs up any existing `~/.claude/` to `~/.claude.bak.<timestamp>` (unless `--force` is passed)
- Copies the config surface (rules / skills / agents / commands / hooks / templates / settings) to `~/.claude/`
- Creates the runtime directories Claude Code expects (`audits/`, `plans/`, `file-history/`, `sessions/`, etc.)
- Detects installed IDEs and offers per-IDE integration

**Bash version note**: macOS ships with bash 3.2 (the last GPL2-era release). The installer needs bash 4.0+. Install via `brew install bash` and either re-launch your terminal or invoke the installer with `/opt/homebrew/bin/bash bootstrap/install.sh`.

---

## Linux

```bash
# Same as macOS — the script is portable.
git clone https://github.com/Nmor/the-claude-council.git
cd the-claude-council
./bootstrap/install.sh
./bootstrap/verify.sh
```

Tested on Ubuntu 22.04+, Debian 12+, Fedora 39+, Arch (rolling).

---

## Windows

### Option A — Windows-native PowerShell (recommended)

The full install / verify / uninstall flow is native PowerShell — no
WSL2, Git Bash, or shell emulation required.

```powershell
# Open PowerShell as your user (NOT as Administrator)
git clone https://github.com/Nmor/the-claude-council.git
Set-Location the-claude-council

# Allow script execution for this session if your policy is restricted
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Install
.\bootstrap\install.ps1

# Verify
.\bootstrap\verify.ps1

# (Optional) Dry-run to see what would change without doing it
.\bootstrap\install.ps1 -DryRun

# (Optional) Verbose verify output (each pass + fail line)
.\bootstrap\verify.ps1 -Verbose
```

The PS installer places the config at `$env:USERPROFILE\.claude\`,
which is what `claude` CLI on Windows expects. The verifier runs
the same 7 phases as `verify.sh` (Layout / Inventory floors / Agent
frontmatter / Skill SKILL.md / Hook readability / Broken
cross-references / No project contamination) and prints a green or
red verdict identical in shape to the bash version.

### Option B — WSL2 only

If your Claude Code workflow lives entirely in WSL2, use the macOS /
Linux instructions inside your WSL distribution. The config lives
in the WSL filesystem (`/home/<you>/.claude/`), and the bash scripts
(`install.sh` / `verify.sh` / `uninstall.sh`) run unchanged.

---

## IDE integration

The installer auto-detects IDEs and copies recommended settings to opt-in locations. The installer NEVER overwrites your existing IDE settings — it copies templates as `*.recommended.json` for manual review.

### VS Code

Recommended extensions are saved to `~/.vscode/extensions.recommended.json`. Compare with your existing extensions and install any missing ones:

```bash
cat ~/.vscode/extensions.recommended.json \
  | jq -r '.recommendations[]' \
  | xargs -I {} code --install-extension {}
```

Recommended settings live in `templates/ide-configs/vscode/settings.json`. Merge any keys you want into:

- macOS: `~/Library/Application Support/Code/User/settings.json`
- Linux: `~/.config/Code/User/settings.json`
- Windows: `%APPDATA%\Code\User\settings.json`

### Cursor

Cursor uses the same extension format as VS Code. Settings live at:

- macOS: `~/Library/Application Support/Cursor/User/settings.json`
- Linux: `~/.config/Cursor/User/settings.json`
- Windows: `%APPDATA%\Cursor\User\settings.json`

```bash
cat templates/ide-configs/cursor/settings.json
```

Merge with your existing settings; do NOT overwrite.

### Windsurf

```bash
# Settings live at:
#   macOS:   ~/Library/Application Support/Windsurf/User/settings.json
#   Linux:   ~/.config/Windsurf/User/settings.json
#   Windows: %APPDATA%\Windsurf\User\settings.json
cat templates/ide-configs/windsurf/settings.json
```

### JetBrains (IntelliJ / GoLand / PyCharm / WebStorm / PhpStorm / RubyMine / RustRover / CLion)

Install Anthropic's **Claude Code [Beta]** plugin from the JetBrains Marketplace:

1. Open **Settings → Plugins → Marketplace**
2. Search for `Claude Code`
3. Install and restart the IDE
4. Open **Settings → Tools → Claude Code** and point it at the `claude` CLI binary (the plugin auto-detects in most cases)

The JetBrains template directory has a README with detailed walkthroughs:

```bash
cat templates/ide-configs/jetbrains/README.md
```

### Neovim / Emacs / other terminal-first editors

No IDE integration needed — `~/.claude/` is loaded by the `claude` CLI regardless of editor. Configure your editor to launch `claude` in a terminal pane or split.

---

## Verifying the install

```bash
# macOS / Linux / WSL2
./bootstrap/verify.sh --verbose
```

```powershell
# Windows-native
.\bootstrap\verify.ps1 -Verbose
```

A healthy install reports:

```text
== Phase A: Layout exists ==
== Phase B: Inventory floors ==
  ✓ rules/common/*.md   ≥ 60   (got 73, ...)
  ✓ rules/ subfolders   ≥ 20   (got 21, ...)
  ✓ skills/             ≥ 90   (got 99, ...)
  ✓ agents/*.md         ≥ 25   (got 32, ...)
  ✓ commands/*.md       ≥ 30   (got 33, ...)
== Phase C: Agent frontmatter sanity ==
== Phase D: Skill SKILL.md presence ==
== Phase E: Hook executability ==
== Phase F: Broken cross-references ==
== Phase G: No project contamination ==

VERIFICATION SUMMARY
Inventory: 24 rules.common, 20 lang subfolders, 118 skills, 39 agents, 33 commands
Checks:    21 passed, 0 failed

✓ PASS — global Claude config is healthy.
```

If any check fails:

1. Read the specific failure line ("rules/common/*.md ≥ 60 — got 0")
2. Confirm the install actually copied — `ls ~/.claude/rules/common/`
3. If the destination is empty, re-run `./bootstrap/install.sh --force`
4. If a specific check fails, open a [GitHub issue](https://github.com/Nmor/the-claude-council/issues) with the verbose log

---

## Upgrading

When the upstream repo gets a new release:

```bash
# macOS / Linux / WSL2
cd the-claude-council
git fetch && git checkout v2.x.y
./bootstrap/install.sh           # idempotent: backs up + reinstalls
./bootstrap/verify.sh
```

```powershell
# Windows-native
Set-Location the-claude-council
git fetch ; git checkout v2.x.y
.\bootstrap\install.ps1          # idempotent: backs up + reinstalls
.\bootstrap\verify.ps1
```

Both installers preserve runtime state (audits, learning events,
project memory under `projects/`, sessions) because those live in
directories the installer specifically excludes from overwrite.

---

## Uninstalling

```bash
# macOS / Linux / WSL2
./bootstrap/uninstall.sh
# Default: moves ~/.claude/ to ~/.claude.uninstalled.<timestamp>

# Or to delete outright (PROMPTS for "yes-delete" confirmation):
./bootstrap/uninstall.sh --purge
```

```powershell
# Windows-native
.\bootstrap\uninstall.ps1
# Default: moves $env:USERPROFILE\.claude to .claude.uninstalled.<timestamp>

# Or to delete outright (PROMPTS for "yes-delete" confirmation):
.\bootstrap\uninstall.ps1 -Purge
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `bash: bad substitution` on macOS | system bash is 3.2 | `brew install bash` and re-run |
| `verify.sh` reports broken cross-references | install was partial | `./bootstrap/install.sh --force` |
| IDE doesn't pick up the new config | IDE was running during install | restart the IDE |
| `claude` CLI not found | not installed | follow [Anthropic's install docs](https://docs.claude.com/claude-code) |
| `permission denied` on `bootstrap/*.sh` | scripts not executable | `chmod +x bootstrap/*.sh` |
| Existing `~/.claude/` had custom content | install backed it up | restore from `~/.claude.bak.<timestamp>` (macOS / Linux) or `.claude.bak.<timestamp>` (Windows) |
| Windows: *"running scripts is disabled"* | PowerShell execution policy | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| Windows: `verify.ps1` Phase G skipped | no `.local\project-tokens` file present | the check is opt-in — create `$env:USERPROFILE\.claude\.local\project-tokens` (one regex per line) to enable contamination scan |
| Windows: `verify.ps1` fails on rule cross-references | path separator mismatch in references | open an issue — the verifier normalises `/` to `\` but exotic refs may slip through |

If a symptom isn't listed, open an issue with:

- macOS / Linux / WSL2: output of `./bootstrap/verify.sh --verbose` + `bash --version`
- Windows-native: output of `.\bootstrap\verify.ps1 -Verbose` + `$PSVersionTable.PSVersion`
- Your OS + version (`uname -a` on Unix; `[System.Environment]::OSVersion` on Windows)
- The exact command that failed
