---
name: dependency-rules
description: Dependency hygiene — dependency-pinning (lockfiles committed, image digest pins, Actions SHA-pinned), dependency-vulnerabilities (CVE gate: MODERATE+ blocks), dependency-overrides-not-exceptions (fix the tree first via pnpm.overrides), license-allowlist-gate (SPDX allowlist + Trove cross-check), install-allowlist (no silent global installs; publisher allowlist). Auto-fires on manifests + lockfiles across every ecosystem.
paths:
  - "**/package.json"
  - "**/pnpm-lock.yaml"
  - "**/package-lock.json"
  - "**/yarn.lock"
  - "**/go.mod"
  - "**/go.sum"
  - "**/Cargo.toml"
  - "**/Cargo.lock"
  - "**/pyproject.toml"
  - "**/poetry.lock"
  - "**/Pipfile"
  - "**/Pipfile.lock"
  - "**/requirements*.txt"
  - "**/Gemfile"
  - "**/Gemfile.lock"
  - "**/pom.xml"
  - "**/build.gradle*"
  - "**/*.csproj"
  - "**/*.sln"
  - "**/Package.swift"
  - "**/Package.resolved"
  - "**/pubspec.yaml"
  - "**/pubspec.lock"
  - "**/composer.json"
  - "**/composer.lock"
---

# dependency-rules

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H
> will delete the source files to close the eager-load loop.

## Purpose

Five dependency-hygiene rules behind one trigger surface. When a manifest or
lockfile in any ecosystem is touched, this skill fires and routes to the one
concern the change is actually about — pinning, CVEs, overrides, licenses, or
installs.

This file is a ROUTING TABLE, not the guidance. It is `paths:`-gated, so whatever
it contains is added to the always-on Floor every time a glob above matches; the
detail therefore lives in `references/` and is read on demand. Read the row you
need in full before acting on it — the reference file is the rule, and the
one-line summary below is not a substitute for it.

## Routing

| Concern | Read this | It covers |
| --- | --- | --- |
| **Pinning** — lockfile committed? caret or exact? digest on the image? SHA on the Action? | [`references/pinning.md`](references/pinning.md) | Pinning strategy per layer (application vs library), the 10 hard rules, per-ecosystem range syntax, container + CI + Renovate pinning, per-language specifics (pnpm / Go / Python / Rust / Docker), 6 anti-patterns, verification block, standards cited |
| **Vulnerability gate** — a CVE surfaced; what blocks and what ships? | [`references/vulnerability-gate.md`](references/vulnerability-gate.md) | The MODERATE+ floor and why it is non-negotiable, 11 hard rules including non-bypassable enforcement, the per-language scanner contract (pnpm / Go / Python / images), gate output shape, authoring the gate script, CI integration, Renovate security config, documented exceptions |
| **Overrides, not exceptions** — the gate failed on a transitive; now what? | [`references/overrides-not-exceptions.md`](references/overrides-not-exceptions.md) | The strict escalation order (replace → override → patch → except), 5 hard rules, the `pnpm.overrides` idiom and its npm / yarn / Go / Cargo / Maven / Gradle / pip equivalents, what to do when an override breaks the parent, the abandoned-consumer replacement table, the override-vs-exception fork worked through |
| **License allowlist** — an SPDX value is UNKNOWN or off-list | [`references/license-allowlist.md`](references/license-allowlist.md) | 7 hard rules, the default-safe SPDX allowlist and the review-required list (GPL / AGPL / SSPL / BUSL and friends), fail-closed on UNKNOWN, the Trove + GitHub License API cross-check, passing and failing gate output, authoring `verify-licenses.sh` |
| **Install allowlist** — about to install a package, extension, MCP or tap | [`references/install-allowlist.md`](references/install-allowlist.md) | 7 hard rules (no `-g` without approval, no `npx -y`, no curl-pipe-sh), the npm DO-NOT-INSTALL list, VS Code / Cursor known-bad and trusted-publisher allowlists, the MCP publisher allowlist, the Homebrew tap allowlist, what to do when the rule fires, editor settings and shell-level enforcement |

Cross-references and per-rule learning hooks live in each reference file, beside
the rule they belong to.

## Source files migrated

- `rules-library/common/dependency-pinning.md`
- `rules-library/common/dependency-vulnerabilities.md`
- `rules-library/common/dependency-overrides-not-exceptions.md`
- `rules-library/common/license-allowlist-gate.md`
- `rules-library/common/install-allowlist.md`
