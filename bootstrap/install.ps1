<#
.SYNOPSIS
    Bootstrap installer for the global Claude Code config (Windows / PowerShell).

.DESCRIPTION
    Installs the rules / skills / agents / commands / hooks surface into the
    user's $env:USERPROFILE\.claude directory and optionally integrates with
    installed IDEs (VS Code, Cursor, Windsurf, JetBrains family).

    Run from the repository root or from the bootstrap/ directory. Requires
    PowerShell 5.1+ (Windows 10/11 ships with this) or PowerShell Core 7+.

.PARAMETER Prefix
    Override the install destination. Default: $env:USERPROFILE\.claude

.PARAMETER NoIde
    Skip the IDE integration step.

.PARAMETER DryRun
    Print actions without modifying the filesystem.

.PARAMETER Force
    Overwrite an existing destination without creating a timestamped backup.

.EXAMPLE
    .\bootstrap\install.ps1
    Default install into $env:USERPROFILE\.claude

.EXAMPLE
    .\bootstrap\install.ps1 -Prefix C:\Tools\claude -NoIde
    Custom prefix, skip IDE integration
#>

[CmdletBinding()]
param(
    [string]$Prefix = (Join-Path $env:USERPROFILE '.claude'),
    [switch]$NoIde,
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir
$Timestamp = (Get-Date -Format 'yyyyMMddTHHmmssZ')

function Log-Info  { param([string]$Msg) Write-Host "[INFO]  $Msg" -ForegroundColor Cyan }
function Log-Warn  { param([string]$Msg) Write-Host "[WARN]  $Msg" -ForegroundColor Yellow }
function Log-Error { param([string]$Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red }

function Test-Prereqs {
    Log-Info 'checking prerequisites'

    if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
        Log-Warn 'claude CLI not on PATH — install from https://docs.claude.com/claude-code'
        Log-Warn 'global config will still install; claude CLI is a separate install'
    }

    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Log-Error "PowerShell 5.1+ required (found $($PSVersionTable.PSVersion))"
        exit 1
    }
}

function Backup-Existing {
    if (-not (Test-Path -LiteralPath $Prefix)) { return }

    if ($Force) {
        Log-Warn "--Force set; overwriting $Prefix without backup"
        if (-not $DryRun) {
            Remove-Item -LiteralPath $Prefix -Recurse -Force
        }
        return
    }

    $backup = "$Prefix.bak.$Timestamp"
    Log-Info "backing up existing $Prefix -> $backup"
    if ($DryRun) {
        Log-Info "(dry-run) would: Move-Item $Prefix $backup"
    } else {
        Move-Item -LiteralPath $Prefix -Destination $backup -Force
    }
}

function Copy-Payload {
    Log-Info "installing config surface into $Prefix"

    # Defensive exclude list — matches install.sh.  Covers VCS, docs,
    # CI surface, OS junk, every per-user RUNTIME directory
    # (gitignored everywhere), per-user plan / audit / memory state,
    # staging surfaces, and dev tooling artefacts.  When install
    # runs from a clean clone most of these don't exist; the entries
    # are defensive so a populated source dir cannot leak personal
    # content into the consumer's install.
    $excludes = @(
        # Version control + CI + docs
        '.git', '.github', 'bootstrap', 'tests', 'docs',
        'README.md', 'INSTALL.md', 'CHANGELOG.md',
        'CODE_OF_CONDUCT.md', 'SECURITY.md', 'LICENSE',
        '.gitignore', '.markdownlint.jsonc',
        # OS junk
        '.DS_Store', 'Thumbs.db',
        # Per-user / per-session RUNTIME directories
        'projects', 'sessions', 'session-env', 'telemetry',
        'statsig', 'file-history', 'shell-snapshots', 'todos',
        'ide', 'debug', 'cache', 'downloads', 'backups',
        'contexts', 'mcp-configs',
        # Per-user plan / audit / memory state
        'plans', 'audits', 'memory',
        # Per-user staging surfaces
        '.local', '.last-cleanup', '.claude-skipped',
        'mcp-needs-auth-cache.json',
        # Dev tooling artefacts
        'node_modules', '__pycache__', '.pytest_cache'
    )

    if ($DryRun) {
        Log-Info "(dry-run) would: copy $RepoRoot to $Prefix (excluding $($excludes -join ', '))"
        return
    }

    New-Item -ItemType Directory -Path $Prefix -Force | Out-Null

    Get-ChildItem -LiteralPath $RepoRoot -Force | Where-Object {
        $excludes -notcontains $_.Name
    } | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $Prefix -Recurse -Force
    }

    Log-Info 'config surface installed'
}

function Rewrite-Paths {
    # Belt-and-suspenders sweep: the global rule
    # ~/.claude/rules/common/rule-authoring-global-vs-project.md forbids
    # project-specific absolute paths from appearing in shipped config.
    # Authoring review should catch every leak, but a typo can slip past.
    # This pass scans the installed payload for the original author's
    # home path and rewrites it to use $env:USERPROFILE.
    Log-Info 'scanning installed payload for stray absolute paths'

    if ($DryRun) {
        Log-Info "(dry-run) would: scan $Prefix for stray author paths and rewrite"
        return
    }

    $authorPath = '/Users/APPLE/'
    $replacement = ($env:USERPROFILE -replace '\\', '/') + '/'

    $extensions = @(
        '*.md', '*.json', '*.js', '*.py', '*.sh',
        '*.ts', '*.tsx', '*.yaml', '*.yml', '*.toml', '*.xml'
    )

    $hits = Get-ChildItem -LiteralPath $Prefix -Recurse -File -Include $extensions `
        -ErrorAction SilentlyContinue | Where-Object {
            (Select-String -LiteralPath $_.FullName -SimpleMatch -Pattern $authorPath `
                -Quiet -ErrorAction SilentlyContinue)
        }

    if (-not $hits -or $hits.Count -eq 0) {
        Log-Info '  no stray author paths found'
        return
    }

    Log-Warn "found stray author paths in $($hits.Count) file(s); rewriting to `$env:USERPROFILE"
    foreach ($file in $hits) {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        $rewritten = $content.Replace($authorPath, $replacement)
        Set-Content -LiteralPath $file.FullName -Value $rewritten -NoNewline
    }
    Log-Info "  rewrite complete; $($hits.Count) file(s) now reference the installer's home"
}

function Ensure-RuntimeDirs {
    Log-Info 'ensuring runtime directories'
    $dirs = @(
        'audits', 'audits\archive',
        'plans', 'plans\archive', 'plans\tasks',
        'file-history', 'sessions', 'session-env', 'projects',
        'telemetry', 'statsig', 'ide', 'debug', 'cache'
    )
    foreach ($d in $dirs) {
        $full = Join-Path $Prefix $d
        if ($DryRun) {
            Log-Info "(dry-run) would: New-Item -ItemType Directory $full"
        } else {
            New-Item -ItemType Directory -Path $full -Force | Out-Null
        }
    }
}

function Detect-Ides {
    $found = @()
    if (Get-Command code     -ErrorAction SilentlyContinue) { $found += 'vscode' }
    if (Get-Command cursor   -ErrorAction SilentlyContinue) { $found += 'cursor' }
    if (Get-Command windsurf -ErrorAction SilentlyContinue) { $found += 'windsurf' }

    # JetBrains: look for the launcher binaries in common Program Files paths
    $jetbrainsPaths = @(
        "$env:LOCALAPPDATA\JetBrains\Toolbox\apps",
        "$env:ProgramFiles\JetBrains"
    )
    foreach ($p in $jetbrainsPaths) {
        if (Test-Path -LiteralPath $p) { $found += 'jetbrains'; break }
    }

    return $found
}

function Integrate-Ide-VSCode {
    $src = Join-Path $Prefix 'templates\ide-configs\vscode\extensions.json'
    if (-not (Test-Path -LiteralPath $src)) {
        Log-Warn 'no VS Code extensions template; skipping'
        return
    }

    Log-Info 'VS Code detected — saving recommended extensions list'
    $targetDir = Join-Path $env:USERPROFILE '.vscode'
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    $dest = Join-Path $targetDir 'extensions.recommended.json'

    if ($DryRun) {
        Log-Info "(dry-run) would: Copy-Item $src $dest"
    } else {
        Copy-Item -LiteralPath $src -Destination $dest -Force
        Log-Info "  saved to $dest (review + merge manually)"
    }
}

function Integrate-Ides {
    if ($NoIde) {
        Log-Info '-NoIde set; skipping IDE integration'
        return
    }

    $detected = Detect-Ides
    if ($detected.Count -eq 0) {
        Log-Info 'no supported IDEs detected; skipping IDE integration'
        return
    }

    Log-Info "integrating with detected IDEs: $($detected -join ', ')"
    foreach ($ide in $detected) {
        switch ($ide) {
            'vscode'    { Integrate-Ide-VSCode }
            'cursor'    { Log-Info "Cursor detected — see $Prefix\templates\ide-configs\cursor\" }
            'windsurf'  { Log-Info "Windsurf detected — see $Prefix\templates\ide-configs\windsurf\" }
            'jetbrains' { Log-Info "JetBrains family detected — install Claude Code plugin from Marketplace" }
        }
    }
}

function Print-PostInstall {
    @"

================================================================
✓ Global Claude config installed at $Prefix

Next steps:
  1. Run the self-test:        $ScriptDir\verify.ps1
  2. Read the council protocol: $Prefix\CLAUDE.md
  3. Open the docs:            $RepoRoot\docs\ARCHITECTURE.md

The 15 Floor rules, 160 Library rules, 121 skills, 32 agents,
33 commands, and 14 hooks are now active for every Claude Code
session. Floor rules + CLAUDE.md (~240 KB) load on every session;
the Library + skill bodies load on demand via skill paths:
triggers (lazy-load architecture, ~92% cold-load drop).

If you backed up an existing $Prefix, the backup is at:
  $Prefix.bak.$Timestamp

----------------------------------------------------------------
Forking this repo? Apply branch protection to your fork
----------------------------------------------------------------
Before contributors land their first PR, configure branch
protection on the default branch of your fork. The exact
required settings + audit commands are documented at:

  $RepoRoot\docs\branch-protection.md

Quick reference (run from a clone of your fork; requires
GitHub CLI authenticated as a maintainer):

  `$env:OWNER = '<your-org-or-user>'
  `$env:REPO  = '<your-repo-name>'
  gh api "repos/`$env:OWNER/`$env:REPO/branches/main/protection" --jq '{
    required_pull_request_reviews: .required_pull_request_reviews,
    required_status_checks:        .required_status_checks,
    enforce_admins:                .enforce_admins.enabled,
    restrictions:                  .restrictions
  }'

Per the Council Protocol ($Prefix\CLAUDE.md), no PR merges
to main without explicit CODEOWNER review approval.
================================================================
"@ | Write-Host
}

Test-Prereqs
Backup-Existing
Copy-Payload
Rewrite-Paths
Ensure-RuntimeDirs
Integrate-Ides

if ($DryRun) {
    Log-Info 'dry-run complete; no changes made'
} else {
    Print-PostInstall
}
