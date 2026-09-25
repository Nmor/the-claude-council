---
name: yaml-patterns
description: YAML 1.2.2 discipline — 2-space indent (never tabs), quote every coerce-prone scalar (version strings, country codes, booleans-as-strings), block style by default (flow only for short collections), document start --- when multi-document, schema reference via # yaml-language-server: $schema=...; ecosystem-aware key casing (camelCase for K8s, snake_case for Compose/GitHub Actions, kebab-case for action inputs); the Norway problem (NO parsing as boolean) requires explicit quoting; yamllint at strict baseline (document-start present, line-length 120, octal-values forbid-implicit). Auto-fires on YAML sources.
paths:
  - "**/*.yml"
  - "**/*.yaml"
  - "**/.yamllint"
  - "**/.yamllint.yaml"
  - "**/.yamllint.yml"
---

# yaml-patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules-library/yaml/` as part of the lazy-rules-loading plan.
> Phase H will delete the source files.

## Purpose

Routing table for YAML discipline across the four concerns YAML work splits
into: how a file is written, how it is gated, how it is composed, and how it is
attacked. The detail lives in `references/`; read the row that matches the work
rather than the whole surface.

This skill is `paths:`-gated on every `*.yml` / `*.yaml`, so its weight is paid
on every YAML edit. Keeping the routing table here and the depth in
`references/` is what keeps that cost proportional to the task.

## Routing table

| Topic | Read | What it holds |
| --- | --- | --- |
| **Coding style** — syntax, quoting, the Norway problem | [`references/coding-style.md`](references/coding-style.md) | 12 hard rules (2-space indent, quote coerce-prone scalars, block-by-default, `---` markers, line length, trailing whitespace, EOF newline, comment style, anchor discipline, schema reference, ecosystem key casing); per-ecosystem checklists (K8s, Compose, Actions, OpenAPI/AsyncAPI); the strict `.yamllint.yaml` baseline; why YAML drift causes incidents |
| **Hooks + gates** — enforcement | [`references/hooks.md`](references/hooks.md) | Pre-commit gates (lint, path-scoped schema validation, secret scan); pre-push gate; the GitHub Actions CI workflow; VS Code / Cursor / Windsurf and JetBrains IDE integration; the 6-step pre-deployment checklist; the verification block |
| **Architecture + composition** — structure and reuse | [`references/patterns.md`](references/patterns.md) | 6 architectural patterns (base+overlay, schema-first, anchors for shared scalars, multi-document files, frontmatter, `$ref` vs inlining); composition idioms for Compose / Kustomize / Helm values; 7 anti-patterns (god-file, hand-edited generated YAML, empty-key shorthand, smart quotes, comments in flow collections, skipped schema validation, YAML as runtime state); reuse-first tooling |
| **Security** — YAML as attack surface | [`references/security.md`](references/security.md) | 10 hard rules (safe parsers only, never inline secrets, SHA-pin every external reference, RBAC least-privilege, pod securityContext, default-deny NetworkPolicy, explicit Actions `permissions:`, CI schema validation, billion-laughs limits, Cosign provenance); per-ecosystem security checklists (CIS-aligned K8s, Compose, Actions, OpenAPI); required tooling |

Standards cited across the references: **YAML 1.2.2** (Oct 2021 erratum),
**yamllint 1.38.0**, **JSON Schema Draft 2020-12**, **JSON Schema Store**,
**OWASP Top 10 A05**, **OWASP API Security Top 10 API8**, **NIST SP 800-190**,
**CIS Kubernetes Benchmark**, **CIS Docker Benchmark**, **Compose
Specification**, **OpenAPI 3.1**, **AsyncAPI 3.0**, **Kubernetes API
conventions**.

Each reference file carries its own Core Principle, Cross-references,
Why-this-rule-exists and Learning-hooks sections, unchanged from before the
split.
