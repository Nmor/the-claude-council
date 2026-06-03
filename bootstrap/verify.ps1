<#
.SYNOPSIS
    Post-install self-test for the global Claude config (Windows / PowerShell).

.DESCRIPTION
    Confirms the rules / skills / agents / commands / templates surface is
    present, well-formed, and free of broken cross-references. Mirrors the
    7 phases of bootstrap/verify.sh.

    Requires PowerShell 5.1+ (Windows 10/11 ships with this) or
    PowerShell Core 7+ on Windows / macOS / Linux.

.PARAMETER Prefix
    Override the install destination. Default: $env:USERPROFILE\.claude

.PARAMETER Verbose
    Show each check (passing and failing). Default shows failures only.

.EXAMPLE
    .\bootstrap\verify.ps1
    Run against the default install location.

.EXAMPLE
    .\bootstrap\verify.ps1 -Prefix C:\Tools\claude -Verbose
    Run against a custom prefix with per-check output.

.NOTES
    Exit codes:
      0  all checks pass
      1  one or more checks failed
#>

[CmdletBinding()]
param(
    [string]$Prefix = (Join-Path $env:USERPROFILE '.claude')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$script:PassCount = 0
$script:FailCount = 0
$script:FailedChecks = New-Object 'System.Collections.Generic.List[string]'

function Write-CheckPass {
    param([string]$Name, [string]$Detail)
    $script:PassCount++
    if ($PSBoundParameters.ContainsKey('Verbose') -or $VerbosePreference -ne 'SilentlyContinue') {
        Write-Host "  [PASS] $Name  ($Detail)" -ForegroundColor Green
    }
}

function Write-CheckFail {
    param([string]$Name, [string]$Detail)
    $script:FailCount++
    $script:FailedChecks.Add("${Name}: $Detail") | Out-Null
    Write-Host "  [FAIL] $Name  ($Detail)" -ForegroundColor Red
}

function Test-Check {
    <#
    .DESCRIPTION
        Compare $Actual against $Expected using the operator $Op
        (one of: -eq, -ge, -gt, -le). Records a pass or fail.
    #>
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][int]   $Actual,
        [Parameter(Mandatory)][ValidateSet('-eq','-ge','-gt','-le')][string]$Op,
        [Parameter(Mandatory)][int]   $Expected
    )

    $ok = switch ($Op) {
        '-eq' { $Actual -eq $Expected }
        '-ge' { $Actual -ge $Expected }
        '-gt' { $Actual -gt $Expected }
        '-le' { $Actual -le $Expected }
    }

    $detail = "got $Actual, expected $Op $Expected"
    if ($ok) { Write-CheckPass -Name $Name -Detail $detail }
    else     { Write-CheckFail -Name $Name -Detail $detail }
}

function Get-FileCount {
    param([string]$Path, [string]$Filter, [int]$Depth = 1)
    if (-not (Test-Path -LiteralPath $Path)) { return 0 }
    $items = Get-ChildItem -LiteralPath $Path -Filter $Filter -File -Depth ($Depth - 1) -ErrorAction SilentlyContinue
    if ($null -eq $items) { return 0 }
    return ($items | Measure-Object).Count
}

function Get-DirCount {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return 0 }
    $items = Get-ChildItem -LiteralPath $Path -Directory -ErrorAction SilentlyContinue
    if ($null -eq $items) { return 0 }
    return ($items | Measure-Object).Count
}

# ---------------------------------------------------------------
# Phase A: Layout exists
# ---------------------------------------------------------------
Write-Host "`n== Phase A: Layout exists =="

$layoutChecks = @(
    @{ Name = 'PREFIX is a directory';      Path = $Prefix;                                 Kind = 'Container' }
    @{ Name = 'CLAUDE.md present';          Path = (Join-Path $Prefix 'CLAUDE.md');         Kind = 'Leaf'      }
    @{ Name = 'rules\common\ directory';    Path = (Join-Path $Prefix 'rules\common');      Kind = 'Container' }
    @{ Name = 'rules-library\ directory';   Path = (Join-Path $Prefix 'rules-library');     Kind = 'Container' }
    @{ Name = 'skills\ directory';          Path = (Join-Path $Prefix 'skills');            Kind = 'Container' }
    @{ Name = 'agents\ directory';          Path = (Join-Path $Prefix 'agents');            Kind = 'Container' }
    @{ Name = 'commands\ directory';        Path = (Join-Path $Prefix 'commands');          Kind = 'Container' }
    @{ Name = 'hooks\ directory';           Path = (Join-Path $Prefix 'hooks');             Kind = 'Container' }
    @{ Name = 'templates\ directory';       Path = (Join-Path $Prefix 'templates');         Kind = 'Container' }
)
foreach ($c in $layoutChecks) {
    $present = if (Test-Path -LiteralPath $c.Path -PathType $c.Kind) { 1 } else { 0 }
    Test-Check -Name $c.Name -Actual $present -Op '-eq' -Expected 1
}

# ---------------------------------------------------------------
# Phase B: Inventory floors
# ---------------------------------------------------------------
Write-Host "`n== Phase B: Inventory floors =="

# Per the lazy-rules-loading architecture (v1.1.0):
#   - rules\common\           — Floor, always auto-walked
#   - rules-library\common\   — Library common, lazy-loaded
#   - rules-library\<lang>\   — Library language rules
$rulesFloor      = Get-FileCount -Path (Join-Path $Prefix 'rules\common')         -Filter '*.md'
$libraryTotal    = Get-FileCount -Path (Join-Path $Prefix 'rules-library')        -Filter '*.md' -Recurse
$libraryCommon   = Get-FileCount -Path (Join-Path $Prefix 'rules-library\common') -Filter '*.md'
# Language-specific Library subdirs = total Library subdirs minus the common\ subdir
$libraryAllDirs  = Get-DirCount  -Path (Join-Path $Prefix 'rules-library')
$libraryLangDirs = [Math]::Max(0, $libraryAllDirs - 1)
$skills          = Get-DirCount  -Path (Join-Path $Prefix 'skills')
$skillsWithPaths = 0
$skillsDir       = Join-Path $Prefix 'skills'
if (Test-Path -LiteralPath $skillsDir) {
    Get-ChildItem -LiteralPath $skillsDir -Directory | ForEach-Object {
        $skillFile = Join-Path $_.FullName 'SKILL.md'
        if (Test-Path -LiteralPath $skillFile) {
            $head = Get-Content -LiteralPath $skillFile -TotalCount 40 -ErrorAction SilentlyContinue
            if ($head -and ($head -join "`n") -match '(?m)^paths:') {
                $skillsWithPaths++
            }
        }
    }
}
$agents      = Get-FileCount -Path (Join-Path $Prefix 'agents')   -Filter '*.md'
$commands    = Get-FileCount -Path (Join-Path $Prefix 'commands') -Filter '*.md'
# Backwards-compat names for the summary line
$rulesCommon = $rulesFloor
$langDirs    = $libraryLangDirs

Test-Check -Name 'rules\common\*.md (Floor)   >= 10'  -Actual $rulesFloor      -Op '-ge' -Expected 10
Test-Check -Name 'rules-library\*.md          >= 100' -Actual $libraryTotal    -Op '-ge' -Expected 100
Test-Check -Name 'rules-library\common\       >= 40'  -Actual $libraryCommon   -Op '-ge' -Expected 40
Test-Check -Name 'rules-library\ lang dirs    >= 15'  -Actual $libraryLangDirs -Op '-ge' -Expected 15
Test-Check -Name 'skills\                     >= 90'  -Actual $skills          -Op '-ge' -Expected 90
Test-Check -Name 'skills with paths: trigger  >= 25'  -Actual $skillsWithPaths -Op '-ge' -Expected 25
Test-Check -Name 'agents\*.md                 >= 25'  -Actual $agents          -Op '-ge' -Expected 25
Test-Check -Name 'commands\*.md               >= 30'  -Actual $commands        -Op '-ge' -Expected 30

# ---------------------------------------------------------------
# Phase C: Agent frontmatter sanity
# ---------------------------------------------------------------
Write-Host "`n== Phase C: Agent frontmatter sanity =="

$badAgents = 0
$agentsDir = Join-Path $Prefix 'agents'
if (Test-Path -LiteralPath $agentsDir) {
    Get-ChildItem -LiteralPath $agentsDir -Filter '*.md' -File | ForEach-Object {
        $head = Get-Content -LiteralPath $_.FullName -TotalCount 10 -ErrorAction SilentlyContinue
        if ($null -eq $head) { $head = @() }
        $headText = ($head -join "`n")
        $hasName = $headText -match '(?m)^name:'
        $hasDesc = $headText -match '(?m)^description:'
        $hasMode = $headText -match '(?m)^model:'
        if (-not ($hasName -and $hasDesc -and $hasMode)) {
            $badAgents++
            if ($VerbosePreference -ne 'SilentlyContinue') {
                Write-Host "    bad: $($_.FullName)" -ForegroundColor Yellow
            }
        }
    }
}
Test-Check -Name 'agents missing required frontmatter' -Actual $badAgents -Op '-eq' -Expected 0

# ---------------------------------------------------------------
# Phase D: Skill SKILL.md presence
# ---------------------------------------------------------------
Write-Host "`n== Phase D: Skill SKILL.md presence =="

$skillNoFile = 0
$skillsDir = Join-Path $Prefix 'skills'
if (Test-Path -LiteralPath $skillsDir) {
    Get-ChildItem -LiteralPath $skillsDir -Directory | ForEach-Object {
        $skillFile = Join-Path $_.FullName 'SKILL.md'
        if (-not (Test-Path -LiteralPath $skillFile -PathType Leaf)) {
            $skillNoFile++
            if ($VerbosePreference -ne 'SilentlyContinue') {
                Write-Host "    missing: $skillFile" -ForegroundColor Yellow
            }
        }
    }
}
Test-Check -Name 'skills missing SKILL.md' -Actual $skillNoFile -Op '-eq' -Expected 0

# ---------------------------------------------------------------
# Phase E: Hook executability
# ---------------------------------------------------------------
# Windows filesystems (NTFS / ReFS) do not carry a +x bit; the executable
# attribute is decided by extension association. Verify the hooks exist
# and are readable; the bash equivalent's +x check is N/A here.
Write-Host "`n== Phase E: Hook readability (Windows-native; no +x bit) =="

$hookMissing = 0
$hooksDir = Join-Path $Prefix 'hooks'
if (Test-Path -LiteralPath $hooksDir) {
    $patterns = @('*.py', '*.sh', '*.ps1')
    foreach ($pat in $patterns) {
        Get-ChildItem -LiteralPath $hooksDir -Filter $pat -File -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $null = Get-Content -LiteralPath $_.FullName -TotalCount 1 -ErrorAction Stop
            } catch {
                $hookMissing++
                if ($VerbosePreference -ne 'SilentlyContinue') {
                    Write-Host "    unreadable: $($_.FullName)" -ForegroundColor Yellow
                }
            }
        }
    }
}
Test-Check -Name 'hooks unreadable' -Actual $hookMissing -Op '-eq' -Expected 0

# ---------------------------------------------------------------
# Phase F: Broken cross-references
# ---------------------------------------------------------------
Write-Host "`n== Phase F: Broken cross-references =="

$rulePattern = 'rules(-library)?/(common|golang|typescript|python|cpp|csharp|dart|java|kotlin|lua|rust|ruby|swift|bash|sql|markdown|yaml|dockerfile|terraform|html-css|solidity)/[a-z][a-z0-9-]*\.md'

$refsRoots = @(
    (Join-Path $Prefix 'rules'),
    (Join-Path $Prefix 'rules-library'),
    (Join-Path $Prefix 'skills'),
    (Join-Path $Prefix 'CLAUDE.md'),
    (Join-Path $Prefix 'agents')
) | Where-Object { Test-Path -LiteralPath $_ }

$referenced = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($root in $refsRoots) {
    $files = if (Test-Path -LiteralPath $root -PathType Container) {
        Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue
    } else {
        Get-Item -LiteralPath $root -ErrorAction SilentlyContinue
    }
    foreach ($f in $files) {
        try {
            $matches = Select-String -LiteralPath $f.FullName -Pattern $rulePattern -AllMatches -ErrorAction SilentlyContinue
        } catch {
            continue
        }
        if ($null -eq $matches) { continue }
        foreach ($line in $matches) {
            foreach ($m in $line.Matches) {
                $null = $referenced.Add($m.Value)
            }
        }
    }
}

$broken = 0
foreach ($rel in $referenced) {
    $relWin = $rel -replace '/', '\'
    $full = Join-Path $Prefix $relWin
    # Per the lazy-rules-loading architecture (v1.1.0), a reference of the
    # shape `rules\<lang>\<name>.md` may resolve in EITHER the Floor
    # (`rules\<lang>\<name>.md`) OR the Library (`rules-library\<lang>\<name>.md`).
    # Try the Floor form first; fall back to the Library form.
    if (Test-Path -LiteralPath $full -PathType Leaf) { continue }
    if ($relWin -like 'rules\*') {
        $libraryForm = 'rules-library\' + $relWin.Substring('rules\'.Length)
        $libraryFull = Join-Path $Prefix $libraryForm
        if (Test-Path -LiteralPath $libraryFull -PathType Leaf) { continue }
    }
    $broken++
    if ($VerbosePreference -ne 'SilentlyContinue') {
        Write-Host "    broken: $rel" -ForegroundColor Yellow
    }
}
Test-Check -Name 'broken rule cross-references' -Actual $broken -Op '-eq' -Expected 0

# ---------------------------------------------------------------
# Phase G: No project contamination
# ---------------------------------------------------------------
Write-Host "`n== Phase G: No project contamination =="

# Per-user token list lives at $Prefix\.local\project-tokens (gitignored).
# One regex per line; lines starting with # are comments.
# If the file is missing or empty, this check is skipped (treated as pass).
$tokensFile = Join-Path $Prefix '.local\project-tokens'
$contamCount = 0

if ((Test-Path -LiteralPath $tokensFile -PathType Leaf) -and ((Get-Item -LiteralPath $tokensFile).Length -gt 0)) {
    $tokenLines = Get-Content -LiteralPath $tokensFile |
        Where-Object { $_ -and ($_ -notmatch '^\s*#') -and ($_.Trim().Length -gt 0) }

    if ($tokenLines -and $tokenLines.Count -gt 0) {
        $combinedPattern = ($tokenLines | ForEach-Object { $_.Trim() }) -join '|'

        $scanRoots = @(
            (Join-Path $Prefix 'rules\common'),
            (Join-Path $Prefix 'skills'),
            (Join-Path $Prefix 'agents')
        ) | Where-Object { Test-Path -LiteralPath $_ }

        $allowFile = 'principal-level-mandate.md'

        foreach ($root in $scanRoots) {
            Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
                if ($_.Name -eq $allowFile) { return }
                try {
                    $hit = Select-String -LiteralPath $_.FullName -Pattern $combinedPattern -CaseSensitive:$false -Quiet -ErrorAction SilentlyContinue
                } catch {
                    $hit = $false
                }
                if ($hit) {
                    $contamCount++
                    if ($VerbosePreference -ne 'SilentlyContinue') {
                        Write-Host "    contaminated: $($_.FullName)" -ForegroundColor Yellow
                    }
                }
            }
        }
    }
} else {
    Write-Host "  [SKIP] no token list at $tokensFile (create one to enable this check)" -ForegroundColor DarkYellow
}

Test-Check -Name 'files with workspace contamination' -Actual $contamCount -Op '-eq' -Expected 0

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
Write-Host "`n================================================================"
Write-Host 'VERIFICATION SUMMARY'
Write-Host '================================================================'
Write-Host ("Inventory: {0} rules.common, {1} lang subfolders, {2} skills, {3} agents, {4} commands" -f `
    $rulesCommon, $langDirs, $skills, $agents, $commands)
Write-Host ("Checks:    {0} passed, {1} failed" -f $script:PassCount, $script:FailCount)

if ($script:FailCount -gt 0) {
    Write-Host "`nFailed checks:" -ForegroundColor Red
    foreach ($entry in $script:FailedChecks) {
        Write-Host "  - $entry" -ForegroundColor Red
    }
    Write-Host "`n[FAIL]" -ForegroundColor Red
    exit 1
}

Write-Host "`n[PASS] global Claude config is healthy." -ForegroundColor Green
exit 0
