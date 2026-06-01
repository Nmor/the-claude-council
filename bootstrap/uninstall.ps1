<#
.SYNOPSIS
    Remove the global Claude config installed by install.ps1 (Windows / PowerShell).

.DESCRIPTION
    By default this moves $env:USERPROFILE\.claude to a timestamped backup
    directory instead of deleting it outright. Pass -Purge to delete
    unconditionally (with confirmation).

    Requires PowerShell 5.1+ on Windows 10/11 or PowerShell Core 7+ on
    any platform.

.PARAMETER Prefix
    Override the install destination. Default: $env:USERPROFILE\.claude

.PARAMETER Purge
    Delete the install destination unconditionally instead of archiving it.
    Requires interactive confirmation (type "yes-delete").

.PARAMETER DryRun
    Print actions without modifying the filesystem.

.EXAMPLE
    .\bootstrap\uninstall.ps1
    Archive the install to a timestamped backup.

.EXAMPLE
    .\bootstrap\uninstall.ps1 -Purge
    Delete the install after confirmation.

.NOTES
    Exit codes:
      0  uninstall completed (or nothing to do)
      2  user aborted at confirmation prompt
#>

[CmdletBinding()]
param(
    [string]$Prefix = (Join-Path $env:USERPROFILE '.claude'),
    [switch]$Purge,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Test-Path -LiteralPath $Prefix)) {
    Write-Host "nothing to uninstall — $Prefix does not exist"
    exit 0
}

if ($Purge) {
    Write-Host "WARNING: -Purge will DELETE $Prefix and ALL its contents." -ForegroundColor Yellow
    Write-Host 'This includes per-project memory, session history, learning candidates.' -ForegroundColor Yellow
    $confirm = Read-Host 'Type "yes-delete" to confirm'
    if ($confirm -ne 'yes-delete') {
        Write-Host 'aborted.'
        exit 2
    }

    if ($DryRun) {
        Write-Host "(dry-run) would: Remove-Item -Recurse -Force $Prefix"
    } else {
        Remove-Item -LiteralPath $Prefix -Recurse -Force
        Write-Host "purged $Prefix"
    }
    exit 0
}

# Default: archive to timestamped backup
$timestamp = (Get-Date -Format 'yyyyMMddTHHmmssZ')
$backup    = "$Prefix.uninstalled.$timestamp"

if ($DryRun) {
    Write-Host "(dry-run) would: Move-Item $Prefix $backup"
} else {
    Move-Item -LiteralPath $Prefix -Destination $backup -Force
    Write-Host "archived $Prefix -> $backup"
    Write-Host "to restore: Move-Item $backup $Prefix"
    Write-Host "to purge:   Remove-Item -Recurse -Force $backup"
}
