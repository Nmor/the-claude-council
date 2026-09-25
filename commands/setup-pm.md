---
name: setup-pm
description: Configure your preferred package manager (npm/pnpm/yarn/bun)
disable-model-invocation: true
---

# Package Manager Setup

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Configure your preferred package manager for this project or globally.

## Usage

```bash
# Detect current package manager
node scripts/setup-package-manager.js --detect

# Set global preference
node scripts/setup-package-manager.js --global pnpm

# Set project preference
node scripts/setup-package-manager.js --project bun

# List available package managers
node scripts/setup-package-manager.js --list
```

## Detection Priority

When determining which package manager to use, the following order is checked:

1. **Environment variable**: `CLAUDE_PACKAGE_MANAGER`
2. **Project config**: `.claude/package-manager.json`
3. **package.json**: `packageManager` field
4. **Lock file**: pnpm-lock.yaml, bun.lock (bun.lockb before Bun 1.2), yarn.lock or
   package-lock.json, checked in that order
5. **Global config**: `~/.claude/package-manager.json`
6. **Fallback**: npm. Nothing is probed on the machine: spawning a lookup per manager
   froze session start on Windows.

## Configuration Files

### Global Configuration

```json
// ~/.claude/package-manager.json
{
  "packageManager": "pnpm"
}
```

### Project Configuration

```json
// .claude/package-manager.json
{
  "packageManager": "bun"
}
```

### package.json

```json
{
  "packageManager": "pnpm@8.6.0"
}
```

## Environment Variable

Set `CLAUDE_PACKAGE_MANAGER` to override all other detection methods:

```bash
# Windows (PowerShell)
$env:CLAUDE_PACKAGE_MANAGER = "pnpm"

# macOS/Linux
export CLAUDE_PACKAGE_MANAGER=pnpm
```

## Run the Detection

To see current package manager detection results, run:

```bash
node scripts/setup-package-manager.js --detect
```
