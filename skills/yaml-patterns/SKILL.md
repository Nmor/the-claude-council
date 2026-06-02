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

> Migrated 2026-06-02 from `~/.claude/rules-library/yaml/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# yaml-patterns

<!-- ============================================================
     Section: yaml/coding-style.md
     ============================================================ -->

# YAML Coding Style

> Auto-fires on every `*.yml`, `*.yaml` file (Kubernetes manifests,
> docker-compose, GitHub Actions workflows, OpenAPI specs, Helm
> chart values, GitLab CI, CircleCI, Ansible playbooks, dbt
> profiles, mkdocs config, frontmatter blocks, AsyncAPI, JSON
> Schema in YAML form). Standards: **YAML 1.2.2 specification**
> (W3C-style spec, 1 October 2021 erratum revision —
> [yaml.org/spec/1.2.2](https://yaml.org/spec/1.2.2/)),
> **yamllint 1.38.0** (canonical linter), the per-ecosystem
> schemas catalogued at [JSON Schema Store](https://www.schemastore.org/).

## Core Principle

**Every YAML file is parseable by the strictest mode of the
target consumer's YAML 1.2.2 parser. Block style is the default;
flow style is reserved for short, single-line collections.
Indentation is two spaces, NEVER tabs. Every file declares its
schema (via `# yaml-language-server: $schema=...` or
`$schema:` key when the consumer supports it). Every file
passes `yamllint -c .yamllint.yaml` with zero warnings. Implicit
typing (`yes`, `no`, `on`, `off`, `1.0`, `null` in unquoted
position) is avoided — explicit quoting / typing wins because
the 1.1-vs-1.2 boolean coercion ambiguity is a long-tail source
of production incidents.**

YAML is a configuration surface, not a programming language. The
fewer surprises a parser produces, the longer the configuration
stays trustworthy. Every rule below biases toward "what you see
is what the consumer parses."

## Why YAML drift causes incidents

The most-cited YAML production failures all share the same shape:
implicit coercion at parse time turning a string into something
else.

- **The "Norway problem"**: a country list with `NO` (Norway's
  ISO-3166-1 alpha-2 code) parsed as boolean `false` under
  YAML 1.1 semantics. The fix is explicit quoting (`"NO"`) AND
  a parser pinned to YAML 1.2 / 1.2.2.
- **GitHub Actions version pin drift**: `python-version: 3.10`
  was parsed as the float `3.1` (trailing zero discarded), so
  the runner installed Python 3.1 — which doesn't exist. The fix
  is quoting all version strings: `python-version: "3.10"`.
- **Kubernetes manifest accidentally exposing a port**:
  `port: 0o22` (octal `22`) instead of decimal because the
  author wrote `port: 022`. YAML 1.1 parsed `022` as octal `18`;
  YAML 1.2 made this an error. The fix is decimal-only via
  `yamllint`'s `octal-values` rule.
- **Helm chart parsing strings as bools**: `enabled: yes`
  rendering as `enabled: true` in one chart version and as the
  string `"yes"` in another. Quote explicitly.

The defensive posture below assumes the user does not control
which parser version downstream consumers use.

## Hard rules

### 1. Two-space indentation, no tabs

YAML 1.2.2 §6.1 specifies that indentation is space-only; tabs
inside content are reserved for future use and most parsers
reject them outright at indentation positions.

```yaml
# CORRECT — two-space indent
services:
  api:
    image: ghcr.io/example/api:v1.4.2
    ports:
      - "127.0.0.1:8080:8080"

# WRONG — four-space indent (allowed but creates per-team drift)
services:
    api:
        image: ghcr.io/example/api:v1.4.2

# WRONG — tabs (rejected by most parsers)
services:
\tapi:
\t\timage: ghcr.io/example/api:v1.4.2
```

yamllint `indentation: spaces=2`. ENFORCED at lint time.

### 2. Quote every string-like scalar that could be coerced

Implicit YAML 1.1 typing is the leading silent-bug source.
Quote eagerly for any scalar that is or could become:

- A version string (`"3.10"`, `"1.0"`, `"v1.4.2"`)
- A two-letter country code (`"NO"`, `"NL"`, `"DE"`, `"FR"`)
- A digit-string masquerading as a number (`"0123"`, `"022"`,
  `"0o755"`)
- A boolean-looking string (`"yes"`, `"no"`, `"on"`, `"off"`,
  `"true"`, `"false"`)
- An email / URL (`"user@example.com"`, `"https://..."`)
- A regex (`"^v\\d+\\.\\d+$"`)
- A glob (`"*.log"`)
- A timestamp (`"2026-05-26T14:32:18Z"`)

Block scalars (`|`, `>`) carry their own typing rules — the
content stays a string.

```yaml
# WRONG — every line is a coercion landmine
versions:
  python: 3.10           # float 3.1 (trailing zero dropped)
  node: 22.4.0           # parses as string by accident
country: NO              # YAML 1.1 boolean false
build_id: 022            # YAML 1.1 octal 18
debug: yes               # YAML 1.1 boolean true

# CORRECT — quoted; meaning is exactly what is written
versions:
  python: "3.10"
  node: "22.4.0"
country: "NO"
build_id: "022"
debug: "yes"             # if you mean the string
debug: true              # if you mean the boolean
```

yamllint `quoted-strings: required: only-when-needed` is the
default in many configs; this rule tightens it to `required:
true` for the categories above via per-key allow-listing.

### 3. Block style by default; flow style for short collections only

YAML supports two styles for collections: BLOCK (newline-indented)
and FLOW (`[...]` / `{...}`).

```yaml
# Block — preferred for everything multi-line
labels:
  - production
  - europe-west1
  - team-platform

# Flow — acceptable when the collection fits on one line + has
# fewer than 5 elements
tags: [a, b, c]
```

Flow style nested inside block style is acceptable. Block style
nested inside flow style is a parser ambiguity zone — avoid.

### 4. Document start marker (`---`) is required for multi-document files

YAML supports concatenated documents separated by `---`. Single-
document files do not require the marker, but adopting it
universally helps:

- Some parsers (older `PyYAML`) treat the absence as "stream of
  scalars" mode for files starting with a scalar value.
- Tools that concatenate YAML (Kubernetes manifests via
  `kubectl apply -f`) expect the marker between resources.
- Front-matter blocks in markdown files use `---` as the open
  and close fence — same character, different semantics; keep
  the project consistent.

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  log_level: info
---
apiVersion: v1
kind: Service
metadata:
  name: app-svc
```

yamllint `document-start: present: true`. ENFORCED for K8s and
manifest-style files; OFF for single-document config files where
the marker adds noise.

### 5. Document end marker (`...`) only when ambiguity warrants

`...` ends a document explicitly. Most files do not need it.
Use it only when:

- The file is appended to by tooling (CI logs, audit streams).
- The file ends with a folded / literal block scalar whose
  end is otherwise ambiguous.

yamllint `document-end: present: false` (the default).

### 6. Line length ≤ 120 characters

Long lines force horizontal scrolling and break diff tools.
yamllint `line-length: max: 120 level: error`.

For unavoidable long values (URLs, long ARNs, long base64
secrets), prefer:

- Block scalar (`|` literal or `>` folded) splitting across
  lines.
- Anchor + alias to define once, reference many times.

### 7. No trailing whitespace

Trailing whitespace on YAML lines is invisible in editors and
creates ghost diffs. yamllint `trailing-spaces: level: error`.

### 8. One newline at EOF; no multiple consecutive blank lines

`yamllint` `new-line-at-end-of-file: enable` +
`empty-lines: max: 1 max-end: 1`. EOF-without-newline trips
POSIX text-processing tools.

### 9. Comment style

```yaml
# Comments use `# ` (hash + single space).
# Sentences end with a period in long-form blocks.

services:
  api:
    image: ghcr.io/example/api:v1.4.2 # inline comment OK
```

yamllint `comments: require-starting-space: true min-spaces-from-content: 2`.

Inline comments adjacent to a value get TWO spaces between the
value and the `#`. Block comments above the value get a single
space after `#`.

### 10. Anchor / alias discipline

Anchors (`&name`) and aliases (`*name`) are powerful but
foot-guns when overused. Rules:

- Anchors live at the top of the file (or top of their section)
  for discoverability.
- Anchor names are descriptive (`&prod-resources` not `&a1`).
- Merge keys (`<<: *anchor`) are LEGAL YAML 1.1 syntax; YAML
  1.2.2 specifies they are NOT part of the core spec. Many
  parsers still support them as an extension; check the
  consumer before relying on them.

```yaml
# CORRECT — anchor at top, named after intent
defaults: &prod-defaults
  replicas: 3
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"

services:
  api:
    <<: *prod-defaults          # YAML 1.1 merge-key extension
    image: ghcr.io/example/api:v1.4.2
  worker:
    <<: *prod-defaults
    image: ghcr.io/example/worker:v1.4.2
```

For Helm / Kustomize, prefer the tool's overlay mechanism over
YAML anchors — anchors confuse downstream diff tooling.

### 11. Schema reference at the top of every file

Modern editors honour the `# yaml-language-server: $schema=...`
directive (Red Hat YAML extension, JetBrains IDEs). Add it at
the top of every file the project maintains:

```yaml
# yaml-language-server: $schema=https://json.schemastore.org/github-workflow.json
name: CI
on:
  push:
    branches: [main]
```

Common schema URLs live at [SchemaStore.org](https://www.schemastore.org/json/).
Project-private schemas live under `schemas/` in the repo.

### 12. Key naming follows the ecosystem

YAML has no opinion on key casing; each consumer does:

| Ecosystem | Convention | Example |
| --- | --- | --- |
| Kubernetes | `camelCase` | `apiVersion`, `nodeSelector` |
| Docker Compose | `snake_case` for top-level keys; `lowercase-dashes` for service-level extension keys | `depends_on`, `x-deploy-target` |
| GitHub Actions | `snake_case` for top-level; `kebab-case` for action inputs | `runs_on`, `working-directory` |
| Ansible | `snake_case` | `become_user` |
| Helm `values.yaml` | `camelCase` (Helm convention; chart-author-controlled) | `serviceAccount.create` |
| OpenAPI | `camelCase` | `operationId`, `requestBody` |
| AsyncAPI | `camelCase` | `defaultContentType` |
| dbt | `snake_case` | `materialized`, `cluster_by` |

Match the ecosystem. Never mix casing in one file.

## Per-ecosystem checklists

### Kubernetes manifests

- `apiVersion` + `kind` + `metadata` + `spec` always present
- `metadata.name` ≤ 63 characters (DNS-1123 subdomain rule)
- Container images SHA-pinned (per
  [`dependency-pinning.md`](../../rules-library/common/dependency-pinning.md))
- `resources.requests` + `resources.limits` set on every
  container (FinOps + scheduling)
- `securityContext.runAsNonRoot: true` (per
  [`docker-deployment.md`](../../rules-library/common/docker-deployment.md))
- `readinessProbe` + `livenessProbe` declared
- `imagePullPolicy: IfNotPresent` (avoid `Always` in prod)

### Docker Compose

- `services.<svc>.ports` follow `127.0.0.1:HOST:CONTAINER` for
  local dev (per
  [`docker-localhost-binding.md`](../../rules-library/common/docker-localhost-binding.md))
- `services.<svc>.image` SHA-pinned for prod-shape composes
- `services.<svc>.healthcheck` declared on every long-running
  service
- No `command:` overrides that bypass the image's entrypoint
  unless explicitly required + documented

### GitHub Actions workflows

- `uses:` entries SHA-pinned with version comment (per
  [`security-controls-org-wide.md`](../../rules-library/common/security-controls-org-wide.md))
- `permissions:` declared at workflow root with least privilege
- `timeout-minutes:` set on every job
- `concurrency.group:` set to avoid duplicate runs on quick
  re-pushes
- `env:` does not contain secrets — use `${{ secrets.X }}`

### OpenAPI / AsyncAPI specs

- `openapi: "3.1.0"` (or AsyncAPI `asyncapi: "3.0.0"`) pinned
  string
- `info.version` follows
  [`semver.md`](../../rules-library/common/semver.md)
- Every operation has `operationId`, `summary`, `tags`,
  `responses.4xx`, `responses.5xx`, `security`
- Per-resource schemas live in `components.schemas`, never
  inlined repeatedly

## Required `.yamllint.yaml` (strict baseline)

```yaml
# .yamllint.yaml
---
extends: default

rules:
  braces:
    max-spaces-inside: 1
    min-spaces-inside: 0
  brackets:
    max-spaces-inside: 1
    min-spaces-inside: 0
  comments:
    require-starting-space: true
    min-spaces-from-content: 2
    ignore-shebangs: true
  document-end: disable
  document-start:
    present: true
  empty-lines:
    max: 1
    max-end: 1
    max-start: 0
  indentation:
    spaces: 2
    indent-sequences: consistent
    check-multi-line-strings: false
  key-duplicates: enable
  line-length:
    max: 120
    level: error
  new-line-at-end-of-file: enable
  octal-values:
    forbid-implicit-octal: true
    forbid-explicit-octal: false
  quoted-strings:
    quote-type: any
    required: only-when-needed
  trailing-spaces: enable
  truthy:
    allowed-values: ["true", "false"]
    check-keys: true

ignore: |
  node_modules/
  vendor/
  .terraform/
  .venv/
  build/
  dist/
```

The `truthy` rule forbids unquoted `yes` / `no` / `on` / `off`
— the Norway-problem fence.

## Cross-references

- [`common/coding-style.md`](../../rules-library/common/coding-style.md) — broader
  global comment + immutability rules apply to YAML's
  templating layer (Helm Go templates, Kustomize patches)
- [`common/extreme-lint-policy.md`](../../rules-library/common/extreme-lint-policy.md)
  — yamllint at strict ruleset is mandatory in CI
- [`common/dependency-pinning.md`](../../rules-library/common/dependency-pinning.md)
  — version pinning applies to every image / module / action
  reference inside YAML
- [`common/docker-localhost-binding.md`](../../rules-library/common/docker-localhost-binding.md)
  — `127.0.0.1:` prefix on every dev port
- [`common/docker-deployment.md`](../../rules-library/common/docker-deployment.md)
  — `securityContext.runAsNonRoot` + multi-stage build refs
- [`common/security-controls-org-wide.md`](../../rules-library/common/security-controls-org-wide.md)
  — SHA-pin every `uses:` in GitHub Actions
- [`common/secrets-management.md`](../../rules-library/common/secrets-management.md)
  — never inline real secret values; reference vault / env vars
- [`common/schema-evolution.md`](../../rules-library/common/schema-evolution.md)
  — OpenAPI / AsyncAPI evolution rules
- [`yaml/security.md`](../../rules-library/yaml/security.md) — security-specific YAML
  patterns + anti-patterns
- [`yaml/patterns.md`](../../rules-library/yaml/patterns.md) — architectural patterns
  (anchors, overlays, templating boundaries)
- [`yaml/hooks.md`](../../rules-library/yaml/hooks.md) — pre-commit + CI gates

## Why this rule exists

YAML's permissive syntax is its appeal and its trap. The same
file parses differently across YAML 1.1, 1.2, and 1.2.2; across
PyYAML, libyaml, snakeyaml, js-yaml, go-yaml. Without a strict
project posture, drift accumulates: one config file uses tabs,
another mixes flow + block style, a third quietly relies on the
YAML 1.1 boolean coercion that breaks the day someone upgrades
the parser. Adopting yamllint at the strict ruleset above kills
~95% of these failure modes before they reach review.

Beyond syntactic correctness, ecosystem-aware authoring matters:
a Kubernetes manifest missing `resources.requests` looks fine to
yamllint but causes FinOps + scheduling pain in production. The
per-ecosystem checklists above codify those operational learnings.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- Unquoted `yes` / `no` / `on` / `off` / two-letter country code
  appears in a tracked YAML file (rule 2 violation — Norway-class
  bug shipping)
- Tab character at an indentation position (rule 1 violation —
  parser-rejection risk)
- New ecosystem adopted without a SchemaStore reference at file
  top (rule 11 weakening)
- Anchor named non-descriptively (`&a1`, `&x`) — discoverability
  weakening (rule 10)
- Merge key (`<<:`) used in a parser that doesn't support it
  (compatibility gap — rule 10 caveat)
- File exceeds 120 chars on a line without unavoidable URL / ARN
  justification (rule 6 weakening)
- Casing convention mixed within one file (rule 12 violation —
  ecosystem-consistency drift)

**Refinement candidates**:

- New per-ecosystem checklist entry when a recurring K8s /
  Compose / Actions gap surfaces
- Tightening of `quoted-strings.required` from `only-when-needed`
  to `true` when implicit-coercion incidents recur
- New cross-reference when a sister rule (security-controls,
  dependency-pinning) adds a YAML-side gate
- New schema reference entry when a project ecosystem ships a
  canonical SchemaStore-eligible spec

---

<!-- ============================================================
     Section: yaml/hooks.md
     ============================================================ -->

# YAML Hooks

> Auto-fires on every `*.yml`, `*.yaml`, `.yamllint.yaml`,
> `.yamllint.yml`, `.yamllint`, `.spectral.yaml`,
> `kustomization.yaml`, `values.yaml`, `Chart.yaml` file.
> Sister to [`common/hooks.md`](../../rules-library/common/hooks.md). Tooling:
> **yamllint 1.38.0**, **kubeconform**, **helm lint**,
> **spectral**, **actionlint**, **conftest** (OPA / Rego),
> **trivy config**, **gitleaks**.

## Pre-commit gates

`.githooks/pre-commit` (or `.pre-commit-config.yaml` for the
pre-commit framework):

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_yaml=$(git diff --cached --name-only --diff-filter=ACMR \
  | grep -E '\.(yml|yaml)$' || true)

if [ -z "$staged_yaml" ]; then
  exit 0
fi

# 1. Lint
echo "$staged_yaml" | xargs yamllint -c .yamllint.yaml

# 2. Schema validation — scoped by path
for f in $staged_yaml; do
  case "$f" in
    k8s/*|deploy/*|charts/*/templates/*)
      kubeconform -strict -summary -ignore-missing-schemas "$f"
      ;;
    .github/workflows/*)
      actionlint "$f"
      ;;
    docker-compose*.yml|docker-compose*.yaml|compose*.yml|compose*.yaml)
      docker compose -f "$f" config --quiet
      ;;
    openapi*.yaml|*-openapi.yaml|api/openapi.yaml)
      spectral lint --ruleset .spectral.yaml "$f"
      ;;
  esac
done

# 3. Secret scan inside YAML
echo "$staged_yaml" | xargs gitleaks detect --no-git --source --redact
```

`.pre-commit-config.yaml` equivalent:

```yaml
---
repos:
  - repo: https://github.com/adrienverge/yamllint
    rev: v1.38.0
    hooks:
      - id: yamllint
        args: ["-c", ".yamllint.yaml"]
        files: \.(ya?ml)$

  - repo: https://github.com/rhysd/actionlint
    rev: v1.7.6
    hooks:
      - id: actionlint
        files: ^\.github/workflows/.+\.(ya?ml)$

  - repo: https://github.com/yannh/kubeconform
    rev: v0.6.7
    hooks:
      - id: kubeconform
        args: ["-strict", "-summary", "-ignore-missing-schemas"]
        files: ^(k8s|deploy|charts)/.+\.(ya?ml)$

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.4
    hooks:
      - id: gitleaks
```

## Pre-push gates

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Run the full local CI gate before allowing a push
bash infra/verify-local.sh
```

`infra/verify-local.sh` carries the yamllint + schema + secret
scan + policy gates. Per
[`common/local-dev-setup.md`](../../rules-library/common/local-dev-setup.md), the
same script runs in CI — local-CI parity prevents "passes
locally, fails in CI" surprises.

## CI workflow (GitHub Actions example)

```yaml
# .github/workflows/yaml-ci.yml
---
name: YAML CI

on:
  pull_request:
    paths:
      - "**/*.yml"
      - "**/*.yaml"
      - ".yamllint.yaml"
      - ".spectral.yaml"

permissions:
  contents: read

jobs:
  yamllint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: actions/setup-python@e797f83bcb11b83ae66e0230d6156d7c80228e7c # v6.0.0
        with:
          python-version: "3.13"
      - run: pip install yamllint==1.38.0
      - run: yamllint -c .yamllint.yaml .

  actionlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - name: actionlint
        run: |
          curl -sSfL https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash \
            | bash
          ./actionlint -color

  kubeconform:
    runs-on: ubuntu-latest
    if: hashFiles('k8s/**/*.yaml', 'k8s/**/*.yml', 'deploy/**/*.yaml') != ''
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - name: kubeconform
        run: |
          curl -sSL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz \
            | tar xz
          ./kubeconform -strict -summary -ignore-missing-schemas k8s/

  helm-lint:
    runs-on: ubuntu-latest
    if: hashFiles('charts/**/Chart.yaml') != ''
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: azure/setup-helm@b9e51907a09c216f16ebe8536097933489208112 # v4.3.0
      - name: helm lint + template + kubeconform
        run: |
          for chart in charts/*/; do
            helm lint "$chart"
            helm template "$chart" | kubeconform -strict -
          done

  spectral:
    runs-on: ubuntu-latest
    if: hashFiles('**/openapi*.yaml', '**/openapi*.yml') != ''
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with: { node-version: "22" }
      - run: |
          npm install -g @stoplight/spectral-cli
          spectral lint --ruleset .spectral.yaml '**/openapi*.yaml'

  trivy-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: aquasecurity/trivy-action@<sha-pinned> # vN.N.N
        with:
          scan-type: config
          format: sarif
          output: trivy-results.sarif
          severity: HIGH,CRITICAL
          exit-code: 1
      - uses: github/codeql-action/upload-sarif@<sha-pinned> # vN.N.N
        if: always()
        with: { sarif_file: trivy-results.sarif }

  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - name: gitleaks
        run: |
          curl -sSL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz \
            | tar xz
          ./gitleaks detect --no-git --source . --redact --exit-code 2 --verbose
```

All third-party actions are SHA-pinned per
[`common/security-controls-org-wide.md`](../../rules-library/common/security-controls-org-wide.md).

## IDE integration

### VS Code / Cursor / Windsurf

Recommended extensions:

- `redhat.vscode-yaml` — YAML language server with schema
  support; honours `# yaml-language-server: $schema=...`
  directives
- `ms-azuretools.vscode-docker` — Compose + Dockerfile schemas
- `github.vscode-github-actions` — Actions schema + intellisense
- `tim-koehler.helm-intellisense` — Helm template helpers (use
  the SHA-pinned tag)

`.vscode/settings.json`:

```jsonc
{
  "yaml.format.enable": true,
  "yaml.format.bracketSpacing": true,
  "yaml.completion": true,
  "yaml.hover": true,
  "yaml.validate": true,
  "yaml.schemas": {
    "https://json.schemastore.org/github-workflow.json": ".github/workflows/*.{yml,yaml}",
    "https://json.schemastore.org/github-action.json": ".github/action.{yml,yaml}",
    "https://json.schemastore.org/chart.json": "charts/**/Chart.yaml",
    "https://raw.githubusercontent.com/compose-spec/compose-spec/master/schema/compose-spec.json": "docker-compose*.{yml,yaml}",
    "kubernetes": "k8s/**/*.{yml,yaml}"
  },
  "yaml.customTags": [
    "!And sequence",
    "!Equals sequence",
    "!If sequence",
    "!Not sequence",
    "!Or sequence",
    "!Ref scalar",
    "!Sub scalar"
  ]
}
```

The `customTags` list enables CloudFormation intrinsic functions
(`!Ref`, `!Sub`, etc.) without yaml-language-server flagging
them as unknown.

### JetBrains IDEs

- Settings → Editor → File Types → YAML: associate `.yaml.j2`
  and `.yaml.tpl` (Helm + Jinja templates)
- Settings → Languages & Frameworks → Schemas and DTDs → JSON
  Schema Mappings: map file globs to schema URLs
- Plugin: Kubernetes — runs `kubeconform`-equivalent inline

## Pre-deployment checklist

Before pushing or opening a PR that touches YAML:

```bash
# 1. Lint
yamllint -c .yamllint.yaml .

# 2. Schema validation per file class
kubeconform -strict -summary -ignore-missing-schemas k8s/
actionlint .github/workflows/*.yml
docker compose -f docker-compose.yaml config --quiet
spectral lint openapi.yaml

# 3. Policy (when policies/ exists)
conftest test k8s/ --policy policies/

# 4. Config scan
trivy config .

# 5. Secret scan
gitleaks detect --source . --redact

# 6. Render check (Helm)
for chart in charts/*/; do
  helm lint "$chart"
  helm template "$chart" | kubeconform -strict -
done
```

`infra/verify-local.sh` wraps all of these — running it ONCE
should be the only thing you need.

## Verification block

After every YAML edit, attach the verification block to the
"done" claim:

```text
YAML sweep (this turn):
  - yamllint: 0 warnings
  - kubeconform: 47/47 manifests valid
  - actionlint: clean
  - spectral: 0 issues
  - trivy config: 0 HIGH / 0 CRITICAL
  - gitleaks: clean
  - helm template | kubeconform: clean
```

Per [`common/verify-before-claim.md`](../../rules/common/verify-before-claim.md).

## Cross-references

- [`yaml/coding-style.md`](../../rules-library/yaml/coding-style.md) — formatting +
  schema-reference directives
- [`yaml/patterns.md`](../../rules-library/yaml/patterns.md) — composition + overlay
  patterns
- [`yaml/security.md`](../../rules-library/yaml/security.md) — security-specific gates
- [`common/hooks.md`](../../rules-library/common/hooks.md) — broader hook
  lifecycle
- [`common/extreme-lint-policy.md`](../../rules-library/common/extreme-lint-policy.md)
  — strict linter posture
- [`common/security-controls-org-wide.md`](../../rules-library/common/security-controls-org-wide.md)
  — SHA-pinned third-party actions; 5-layer enforcement
- [`common/local-dev-setup.md`](../../rules-library/common/local-dev-setup.md)
  — local-CI parity via shared verify script
- [`common/verify-before-claim.md`](../../rules/common/verify-before-claim.md)
  — same-turn verification block
- [`common/deploy-failures-become-checks.md`](../../rules-library/common/deploy-failures-become-checks.md)
  — every YAML-side deploy failure becomes a documented gate

## Why this rule exists

A linter that runs in the IDE catches half the YAML problems;
the other half show up only when a different consumer (CI
runner, GitOps controller, cluster admission webhook) parses
the file. The CI gates above run the consumers' equivalent
checks PRE-DEPLOY: kubeconform catches deprecated apiVersions
before they reach the cluster, actionlint catches workflow
syntax before a push, spectral catches API design drift before
SDK regeneration. Each gate costs seconds; each catch saves
hours of incident response.

Per `deploy-failures-become-checks.md`, every YAML-driven
deploy failure ever observed becomes a row in the CI workflow.
The shape above is the floor — projects add to it; they do not
shrink it.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- New CI job adopted for a YAML consumer that wasn't in the
  workflow (project YAML class missing a gate)
- yamllint pre-commit hook skipped via `--no-verify` (gate
  bypass weakening)
- Action SHA pin missing in CI workflow file (rule-set drift)
- Trivy config gate not wired in a new YAML-heavy project
  (rule 7 weakening)
- Schema validation passes but kubectl apply fails (schema
  registry stale — needs refresh)
- IDE settings file missing the SchemaStore mappings (DX
  weakening — devs author without inline validation)
- Helm template + kubeconform step skipped on chart-only
  changes (anti-pattern 6 from `yaml/patterns.md`)
- `helm template | kubeconform` red but `helm lint` green
  (Helm's lint isn't a substitute for rendered-output
  validation)

**Refinement candidates**:

- New CI job row when a YAML consumer (Pulumi YAML, Crossplane,
  Tekton, Argo Workflows) gains team adoption
- New pre-commit hook entry when an emerging policy engine
  (Kyverno, OPA Gatekeeper) supplements conftest
- Tightening of the gitleaks scope when a new secret format
  surfaces inside YAML
- New IDE setting when a maintained extension provides better
  schema inference than the current set

---

<!-- ============================================================
     Section: yaml/patterns.md
     ============================================================ -->

# YAML Patterns

> Auto-fires on every `*.yml`, `*.yaml` file. Standards: **YAML
> 1.2.2 specification (Oct 2021 erratum)**, **JSON Schema Draft
> 2020-12** (the schema language most YAML consumers validate
> against), **Kubernetes API conventions**, **Compose
> Specification**, **OpenAPI 3.1**, **AsyncAPI 3.0**,
> **GitHub Actions workflow syntax**, **Helm Chart authoring
> best practices**.

## Core Principle

**Treat YAML files as data, never as code. Templating (Helm,
Kustomize, Jinja, Sprig) is necessary in narrow cases but its
output goes through a strict schema validator BEFORE consumers
see it. Reusability comes through composition (anchors, overlays,
referenced schemas) rather than duplication. Every file is
discoverable: a fresh contributor can name its purpose + consumer
from the first 30 lines.**

## Architectural patterns

### Pattern 1: Single source of truth + overlay

Most YAML configuration projects have a base file + per-
environment overrides. The right shape:

```text
config/
├── base.yaml                 # shared defaults
├── envs/
│   ├── dev.yaml              # overrides only
│   ├── staging.yaml
│   └── prod.yaml
└── render.sh                 # merges base + env into a single file
```

The renderer outputs ONE file per environment; consumers see a
flat, fully-resolved YAML. Drift between envs becomes a small
diff against `base.yaml` instead of three full configs out of
sync.

Tooling: Kustomize for Kubernetes, Helm for chart-shaped
deployments, `yq` (mikefarah) for general merges, `jq + json2yaml`
when JSON Schema validation is the gate.

### Pattern 2: Schema-first authoring

```yaml
# yaml-language-server: $schema=./schemas/app-config.json
---
service:
  name: payments
  port: 8080
  replicas: 3
```

The schema lives alongside the YAML. CI runs:

```bash
ajv validate -s schemas/app-config.json -d 'config/**/*.yaml'
```

This catches structural drift at PR time — far cheaper than a
runtime parse failure on the live consumer.

Common public schemas:

- Kubernetes: published per-version at the API server
- Compose: [`compose-spec/compose-spec`](https://github.com/compose-spec/compose-spec)
- GitHub Actions: [`SchemaStore github-workflow.json`](https://json.schemastore.org/github-workflow.json)
- OpenAPI: [`OAI/OpenAPI-Specification`](https://github.com/OAI/OpenAPI-Specification)
- AsyncAPI: [`asyncapi/spec-json-schemas`](https://github.com/asyncapi/spec-json-schemas)

### Pattern 3: Anchor + alias for shared scalars

When the same value appears in 3+ places, anchor it:

```yaml
constants:
  image_registry: &registry "ghcr.io/example"
  image_tag: &tag "v1.4.2"
  log_level: &log_level "info"

services:
  api:
    image: "*registry/api:*tag"   # WRONG — aliases inside string don't interpolate
    image: !join [ *registry, "/api:", *tag ]   # depends on parser tag support
  worker:
    image: ghcr.io/example/worker:v1.4.2   # duplication; prefer renderer
```

In practice, YAML anchors only substitute whole-value scalars,
not partial-string interpolation. For string composition, use
Helm / Kustomize / `envsubst` / `gomplate` rather than fighting
the anchor system.

### Pattern 4: Multi-document files

Concatenate related resources in one file with `---` separators:

```yaml
# k8s/payments.yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: payments-config
data:
  log_level: info
---
apiVersion: v1
kind: Service
metadata:
  name: payments
spec:
  selector: { app: payments }
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
spec:
  replicas: 3
  selector:
    matchLabels: { app: payments }
  template:
    metadata:
      labels: { app: payments }
    spec:
      containers:
        - name: api
          image: ghcr.io/example/payments:v1.4.2
```

`kubectl apply -f payments.yaml` applies all three resources in
order; rollback is `kubectl delete -f payments.yaml`.

### Pattern 5: Frontmatter blocks

Markdown files, MDX, static-site generators (Hugo, Jekyll,
Eleventy, Astro) use YAML frontmatter:

```markdown
---
title: "Release Notes — v1.4.2"
date: 2026-05-26
tags: [release, payments]
draft: false
---

# v1.4.2

Released 2026-05-26. ...
```

The same yamllint rules apply to the block between the `---`
fences. CI configs that lint markdown should also lint the
embedded YAML — e.g., `markdownlint-cli2` + a yamllint
pre-commit hook scoped to the frontmatter region.

### Pattern 6: Refs vs inlining (OpenAPI / AsyncAPI / JSON Schema)

For schema-heavy YAML, prefer JSON-Pointer `$ref` over inlining
the same schema repeatedly:

```yaml
# CORRECT — referenced + reusable
components:
  schemas:
    Order:
      type: object
      properties:
        id: { type: string, format: uuid }
        total: { $ref: "#/components/schemas/Money" }
    Money:
      type: object
      required: [amount, currency]
      properties:
        amount: { type: integer, minimum: 0 }
        currency: { type: string, enum: [USD, EUR, GBP] }

paths:
  /orders:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Order"
```

JSON Pointer `$ref` works across files too:
`$ref: "./schemas/order.yaml#/components/schemas/Order"`.

## Composition idioms

### Compose Specification (docker-compose)

```yaml
---
services:
  api:
    image: ghcr.io/example/api:v1.4.2
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:8080"
    healthcheck:
      test: ["CMD", "curl", "--fail", "--silent", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: "512M"

  postgres:
    image: postgres:16.4-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "app"]

secrets:
  postgres_password:
    file: ./secrets/postgres_password
```

Notice: secrets via `secrets:` block + file mount, NEVER
inlined. Healthchecks declared on every service. CPU + memory
limits set on the `api` service (`postgres` left unlimited as
local dev needs the head-room — production composes pin both).

### Kubernetes overlay (Kustomize)

```yaml
# base/deployment.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:v1.4.2
```

```yaml
# overlays/prod/kustomization.yaml
---
resources:
  - ../../base
patchesStrategicMerge:
  - deployment-prod.yaml
```

```yaml
# overlays/prod/deployment-prod.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: api
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "1Gi"
```

`kubectl apply -k overlays/prod` renders + applies.

### Helm chart values

```yaml
# charts/payments/values.yaml — defaults
---
replicaCount: 3

image:
  repository: ghcr.io/example/payments
  tag: ""                # defaults to .Chart.AppVersion
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

env:
  - name: LOG_LEVEL
    value: "info"
```

Per-environment override:

```yaml
# values.prod.yaml — overrides only
---
replicaCount: 5

autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20

env:
  - name: LOG_LEVEL
    value: "warn"
```

`helm template . -f values.yaml -f values.prod.yaml` renders the
final manifests.

## Anti-patterns

### Anti-pattern 1: God-file

A 4000-line YAML file containing every config option for every
service, every environment, every cron job. Split into focused
files; per-file responsibility matches per-consumer audience.

### Anti-pattern 2: Hand-edited generated YAML

When the YAML is generated by a tool (Helm template, Terraform
plan, OpenAPI generator), hand-edits get blown away on next
generation. Either commit only the source AND `.gitignore` the
output, OR convince the tool to write the value via config.

### Anti-pattern 3: Empty key shorthand confusion

```yaml
# CONFUSING — is `cache` a literal null or an empty mapping?
cache:
options:
  redis: true
```

vs.

```yaml
# CLEAR — empty map declared explicitly
cache: {}
options:
  redis: true
```

Some parsers treat `key:` with nothing after as `null`; others
as the start of a nested mapping. Use explicit `{}` / `[]` /
`null` / `~` for empty values.

### Anti-pattern 4: Smart-quote contamination

Markdown editors auto-convert `"` to `"` and `'` to `'`. YAML
parsers reject smart quotes. The fix is editor configuration
(disable smart-quote substitution in code-editing modes).

### Anti-pattern 5: Comments inside flow collections

```yaml
# BAD — many parsers drop comments inside flow style
tags: [a, # b dropped, c]

# GOOD
tags:
  - a
  # b skipped because ...
  - c
```

Comments inside `[...]` / `{...}` are spec-legal but
parser-dependent. Block style preserves them everywhere.

### Anti-pattern 6: Templating + schema validation skipped

A Helm chart whose rendered output isn't piped through
`kubectl apply --dry-run=server` or `kubeconform` ships
manifests that pass `helm lint` but fail at cluster apply. The
gate is the validator running against the RENDERED output.

### Anti-pattern 7: YAML as source-of-truth for runtime state

Config files describe DESIRED state. Runtime state (current
replica count, last deploy time, latest config-map version)
belongs in the consumer (Kubernetes, etcd, Vault) — not in a
versioned YAML file.

## Reuse-first

Per [`common/reuse-first.md`](../../rules-library/common/reuse-first.md). Common
libraries:

- [yq](https://github.com/mikefarah/yq) — jq-like YAML processor
- [Kustomize](https://kustomize.io/) — Kubernetes overlay tool
  (built into kubectl)
- [Helm](https://helm.sh/) — Kubernetes package manager
- [gomplate](https://docs.gomplate.ca/) — general templating
- [envsubst](https://www.gnu.org/software/gettext/manual/html_node/envsubst-Invocation.html)
  — environment-variable substitution
- [ajv-cli](https://github.com/ajv-validator/ajv-cli) — JSON
  Schema validator
- [kubeconform](https://github.com/yannh/kubeconform) — fast
  Kubernetes manifest validator
- [yamllint](https://yamllint.readthedocs.io/) — strict syntax
  and style linter
- [yamlfix](https://github.com/lyz-code/yamlfix) — opinionated
  formatter
- [yamale](https://github.com/23andMe/Yamale) — schema validator
  that uses YAML schemas (not JSON Schema)
- [Speccy](https://github.com/wework/speccy) — OpenAPI linter +
  resolver
- [Spectral](https://stoplight.io/open-source/spectral) —
  OpenAPI + AsyncAPI linter

## Cross-references

- [`yaml/coding-style.md`](../../rules-library/yaml/coding-style.md) — naming + format
- [`yaml/security.md`](../../rules-library/yaml/security.md) — secret handling +
  schema validation gates
- [`yaml/hooks.md`](../../rules-library/yaml/hooks.md) — pre-commit + CI integration
- [`common/patterns.md`](../../rules-library/common/patterns.md) — repository +
  envelope patterns inform schema design
- [`common/schema-evolution.md`](../../rules-library/common/schema-evolution.md)
  — OpenAPI / AsyncAPI versioning
- [`common/secrets-management.md`](../../rules-library/common/secrets-management.md)
  — vault-bound secrets, never inlined
- [`common/dependency-pinning.md`](../../rules-library/common/dependency-pinning.md)
  — SHA-pinned image refs inside Compose / K8s
- [`common/extreme-lint-policy.md`](../../rules-library/common/extreme-lint-policy.md)
  — yamllint mandatory; Spectral / kubeconform when applicable

## Why this rule exists

YAML is everywhere: deploy manifests, CI workflows, API
specifications, message-broker schemas, configuration for every
modern tool. Without a pattern catalog, projects accumulate
inconsistent shapes — one team uses Helm, another uses
Kustomize, a third uses raw kubectl + sed. The patterns above
codify the choices that have proven durable across 10+ years of
production YAML at scale. Reuse-first applies here too: prefer
existing tooling (Helm, Kustomize, Compose Specification) over
hand-rolled renderers.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- New consumer-format adopted without a schema entry (anti-pattern
  6 — schema validation skipped)
- God-file > 1000 lines accumulating without split (anti-pattern 1)
- Hand-edits on generated YAML producing diff churn (anti-pattern 2)
- Mixed Helm + Kustomize + raw manifest in one project (pattern
  drift — pick one)
- Anchor + alias used as a substitute for templating in a project
  that already has Helm / Kustomize (rule-of-three trigger)
- `$ref` not adopted in OpenAPI / AsyncAPI when same schema
  appears 3+ times (pattern 6 violation — duplication)
- Frontmatter YAML linted differently from standalone YAML in
  the same project (pattern 5 weakening)

**Refinement candidates**:

- New ecosystem row in the "Composition idioms" section when a
  new consumer (e.g., Pulumi YAML programs, Terragrunt) gains
  team adoption
- New anti-pattern entry when a recurring YAML mis-use class
  emerges
- New tool row in the reuse-first list when a maintained
  alternative surfaces (e.g., `dyff` for semantic YAML diff)
- Tightening of the overlay-vs-anchor recommendation when
  anchor confusion incidents recur

---

<!-- ============================================================
     Section: yaml/security.md
     ============================================================ -->

# YAML Security

> Auto-fires on every `*.yml`, `*.yaml` file. Standards: **OWASP
> Top 10 — A05 Security Misconfiguration**, **OWASP API Security
> Top 10 — API8 Security Misconfiguration**, **NIST SP 800-190**
> (container security), **CIS Kubernetes Benchmark**, **CIS Docker
> Benchmark**, **OWASP Configuration Security Cheat Sheet**,
> **YAML 1.2.2 spec** (specifically §10 on schema + tag
> resolution), **OWASP Deserialization Cheat Sheet** (the YAML
> parser substitution class of attack).

## Core Principle

**YAML files are configuration; configuration files are part of
the attack surface. Every YAML file is treated as "data, not
code" — no parser-side code-execution tags (`!!python/object`,
`!!java`, `!!ruby/object`), every secret comes from a vault not
from an inlined value, every embedded image / module / action
reference is SHA-pinned (so the bytes the consumer fetches are
the bytes the author reviewed), every YAML file is signature-
checked when it is the source of truth for a security-relevant
control. `safe_load` is the parser default; `load` is forbidden.**

## Hard rules

### 1. Use safe YAML parsers only

The single highest-impact YAML security fix: never use
`yaml.load()` in Python. Use `yaml.safe_load()`. Why:

```python
# CATASTROPHIC — yaml.load with the default Loader executes
# arbitrary Python via the `!!python/object` tag.
import yaml
data = yaml.load(open("config.yaml"), Loader=yaml.Loader)

# Malicious config.yaml:
#   !!python/object/apply:os.system [rm -rf /]
# When PyYAML's full Loader sees this, it CALLS os.system.

# CORRECT — safe_load rejects code-execution tags
data = yaml.safe_load(open("config.yaml"))
```

Equivalent rule in other ecosystems:

- **Ruby**: `YAML.load_file` is unsafe (Psych < 4); use
  `YAML.safe_load_file` (Psych ≥ 4 default is safe).
- **Java SnakeYAML**: use `new Yaml(new SafeConstructor())`,
  never the default `new Yaml()`.
- **Go**: `gopkg.in/yaml.v3` is safe by default; never use
  unsafe wrappers.
- **JavaScript js-yaml**: `safeLoad` was the safe API in pre-4.x
  versions; in v4+ `load` is safe by default but check the
  `schema` option.
- **Rust serde_yaml**: safe by default.

CodeQL / Semgrep / Bandit ship rules for `yaml.load` detection.
CI runs the security linter; finding the pattern fails the
build.

### 2. Never inline secrets

```yaml
# CATASTROPHIC
services:
  api:
    environment:
      STRIPE_KEY: "REPLACE_WITH_VAULT_REF"
      DB_PASSWORD: "REPLACE_WITH_VAULT_REF"
```

Every secret comes from a vault or from a runtime injection
(per [`common/secrets-management.md`](../../rules-library/common/secrets-management.md)).
Acceptable shapes:

```yaml
# Docker Compose — reference file-mounted secret
services:
  api:
    environment:
      STRIPE_KEY_FILE: /run/secrets/stripe_key
    secrets:
      - stripe_key

secrets:
  stripe_key:
    file: ${STRIPE_KEY_FILE:?}
```

```yaml
# Kubernetes — reference Secret object (which itself is sealed)
apiVersion: v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: api
          envFrom:
            - secretRef:
                name: api-secrets
```

```yaml
# GitHub Actions — reference repository / org secret
env:
  STRIPE_KEY: ${{ secrets.STRIPE_KEY }}
```

NEVER:

- Plain values in committed YAML
- Base64-encoded values in committed YAML (Kubernetes Secret
  `data:` block with real values — base64 is encoding, not
  encryption)
- `op://` / `vault://` references in committed YAML without
  the corresponding vault permission gate

Use [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets),
[External Secrets Operator](https://external-secrets.io/),
[SOPS](https://github.com/getsops/sops), or a runtime sidecar
(Vault Agent, AWS Secrets Manager injector) for the secret
materialisation.

### 3. SHA-pin every external reference

Per [`common/dependency-pinning.md`](../../rules-library/common/dependency-pinning.md) and
[`common/security-controls-org-wide.md`](../../rules-library/common/security-controls-org-wide.md),
every image / action / module reference inside a YAML file is
pinned to an immutable identifier:

```yaml
# Kubernetes / Compose
image: ghcr.io/example/api:v1.4.2@sha256:a1b2c3...

# GitHub Actions
uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3

# Helm dependency
dependencies:
  - name: postgresql
    version: "16.4.0"
    repository: "oci://registry-1.docker.io/bitnamicharts"
    digest: "sha256:7c8a..."

# Terraform module
module "vpc" {
  source = "git::https://github.com/terraform-aws-modules/terraform-aws-vpc.git?ref=v5.13.0"
}
```

Tags (`:v1`, `:latest`, `@v4`) are mutable and re-target without
notice. SHA digests + commit hashes are immutable.

### 4. RBAC + ServiceAccount least-privilege

For Kubernetes manifests:

```yaml
# WRONG — default ServiceAccount with cluster-wide visibility
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:v1.4.2@sha256:...
      # serviceAccountName omitted → uses `default` SA

---
# CORRECT — dedicated SA with explicit Role
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payments-api
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: payments-api
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["payments-config"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payments-api
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: payments-api
subjects:
  - kind: ServiceAccount
    name: payments-api
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      serviceAccountName: payments-api
      automountServiceAccountToken: false  # if the pod doesn't need API access
      containers:
        - name: api
          image: ghcr.io/example/api:v1.4.2@sha256:...
```

`automountServiceAccountToken: false` is the secure default
when the pod doesn't need the Kubernetes API. Most pods don't.

### 5. Pod security: non-root, read-only filesystem, drop all capabilities

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        runAsGroup: 10001
        fsGroup: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/example/api:v1.4.2@sha256:...
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /app/cache
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
```

Per CIS Kubernetes Benchmark §5.x. Containers that need write
access mount `emptyDir` volumes for the specific paths.

### 6. Network policy default-deny

Empty selector + no rules = default-deny. Apply per namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: payments
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Then add explicit allow rules per service. The default-deny
catches forgotten egress controls (a payments service
accidentally reaching the public internet).

### 7. GitHub Actions: explicit permissions

```yaml
# Workflow root — least privilege default
permissions:
  contents: read           # checkout only

jobs:
  publish:
    permissions:
      contents: read
      packages: write      # only this job needs to publish
      id-token: write      # for OIDC to cloud
```

Without `permissions:`, GitHub uses the repository default,
which can include broad `write` on every scope. Per-workflow +
per-job permission narrowing is mandatory.

### 8. Validate against schema at CI time

The most common YAML-side security regression is "fields the
spec doesn't recognise are silently ignored." A misspelled
`securtyContext` (typo) under a Pod spec silently drops the
hardening. The fix: schema validation in CI.

```bash
# Kubernetes manifests
kubeconform -strict -summary -ignore-missing-schemas k8s/**/*.yaml

# OpenAPI specs
spectral lint --ruleset spectral.yaml openapi.yaml

# GitHub Actions workflows
actionlint .github/workflows/*.yml

# Compose
docker compose -f docker-compose.yaml config --quiet

# Helm charts
helm lint ./charts/payments
helm template ./charts/payments | kubeconform -strict -
```

Per [`common/extreme-lint-policy.md`](../../rules-library/common/extreme-lint-policy.md),
every project carries these gates in CI and pre-commit.

### 9. No YAML billion-laughs amplification

The "billion laughs" attack abuses anchor expansion:

```yaml
# DANGEROUS — anchors expand exponentially in naive parsers
a: &a ["lol","lol","lol","lol","lol","lol","lol","lol","lol"]
b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]
c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]
d: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]
# ... ten levels deep produces ~10^10 nodes ...
```

Mitigations:

- Use parsers with anchor-expansion limits (PyYAML 6.0+,
  snakeyaml 1.30+, go-yaml v3 all cap expansion by default).
- Reject untrusted YAML uploads above a size threshold (~1 MB).
- Validate that anchor count + max alias depth fit a policy.

For internal config files this is rarely an issue; for any
endpoint that ACCEPTS YAML uploads from users (issue templates,
plugin manifests, API), enforce hard limits.

### 10. Provenance: signed YAML for security-critical configs

When the YAML is the source of truth for a security control
(IAM policy, network policy, secrets-mount config), sign the
file:

```bash
# Cosign signs files (Sigstore)
cosign sign-blob --key cosign.key k8s/network-policies.yaml \
  --output-signature k8s/network-policies.yaml.sig

# Verify in CI before apply
cosign verify-blob --key cosign.pub \
  --signature k8s/network-policies.yaml.sig \
  k8s/network-policies.yaml
```

GitOps controllers (Flux, ArgoCD) integrate with Sigstore /
Cosign + reject unsigned manifests when configured.

## Per-ecosystem security checklists

### Kubernetes manifests (CIS-aligned)

- [ ] `apiVersion` pinned (no aliasing through deprecated API
      groups)
- [ ] Container `image:` SHA-pinned
- [ ] `securityContext.runAsNonRoot: true`
- [ ] `securityContext.readOnlyRootFilesystem: true`
- [ ] `securityContext.allowPrivilegeEscalation: false`
- [ ] `securityContext.capabilities.drop: [ALL]`
- [ ] `securityContext.seccompProfile.type: RuntimeDefault`
- [ ] `resources.requests` + `resources.limits` set
- [ ] `serviceAccountName` explicit + `automountServiceAccountToken: false`
      unless API access needed
- [ ] `NetworkPolicy` covers the namespace
- [ ] No `hostNetwork: true` / `hostPID: true` / `hostIPC: true`
- [ ] No `privileged: true`
- [ ] Secrets via `secretRef` / `envFrom.secretRef`, never
      `env.value` with sensitive content
- [ ] `imagePullSecrets` references a Sealed Secret / External
      Secret

### Docker Compose

- [ ] Ports `127.0.0.1:` bound for local dev
- [ ] `secrets:` block (file-mounted) for credentials
- [ ] `read_only: true` on stateless services
- [ ] `user: <non-root>` set
- [ ] `cap_drop: [ALL]` baseline
- [ ] `healthcheck:` on every long-running service
- [ ] `deploy.resources.limits.{cpus,memory}` set

### GitHub Actions

- [ ] `permissions:` at workflow root (least privilege)
- [ ] `uses:` SHA-pinned with version comment
- [ ] `secrets.GITHUB_TOKEN` permission narrowed per job
- [ ] OIDC (`id-token: write`) over long-lived cloud creds
- [ ] `timeout-minutes:` set on every job
- [ ] No `secrets.PAT_TOKEN` from a personal account — use
      org-bound Apps
- [ ] `concurrency.cancel-in-progress` set for non-deploy
      workflows
- [ ] Workflow runs on `pull_request` (not
      `pull_request_target`) unless explicit need + review

### OpenAPI / AsyncAPI

- [ ] `security` defined globally + per-operation
- [ ] `securitySchemes` does not embed actual secrets
- [ ] No `additionalProperties: true` on request bodies
      (allowlist explicitly)
- [ ] `4xx` + `5xx` responses defined for every operation
- [ ] Rate-limit semantics documented (per
      [`common/rate-limiting.md`](../../rules-library/common/rate-limiting.md))

## Required tooling

```bash
# YAML lint
yamllint -c .yamllint.yaml .

# Kubernetes manifest validation
kubeconform -strict -summary -ignore-missing-schemas k8s/**/*.yaml

# Helm chart lint + render-and-validate
helm lint ./charts/<chart>
helm template ./charts/<chart> | kubeconform -strict -

# GitHub Actions workflow lint
actionlint .github/workflows/*.yml

# Compose validation
docker compose -f docker-compose.yaml config --quiet

# OpenAPI lint
spectral lint --ruleset .spectral.yaml openapi.yaml

# Secret scan inside YAML
gitleaks detect --no-git --source . --redact

# Open Policy Agent / conftest (policy-as-code)
conftest test k8s/ --policy policies/

# Trivy YAML config scan (CIS-aligned)
trivy config k8s/
```

## Cross-references

- [`yaml/coding-style.md`](../../rules-library/yaml/coding-style.md) — formatting +
  quoting + key naming
- [`yaml/patterns.md`](../../rules-library/yaml/patterns.md) — composition + overlay
  patterns
- [`yaml/hooks.md`](../../rules-library/yaml/hooks.md) — pre-commit + CI gates
- [`common/security.md`](../../rules-library/common/security.md) — OWASP Top 10
  umbrella
- [`common/secrets-management.md`](../../rules-library/common/secrets-management.md)
  — vault-first; no inlined secrets
- [`common/security-controls-org-wide.md`](../../rules-library/common/security-controls-org-wide.md)
  — 5-layer non-bypassable enforcement
- [`common/dependency-pinning.md`](../../rules-library/common/dependency-pinning.md)
  — SHA-pin everything
- [`common/dependency-vulnerabilities.md`](../../rules-library/common/dependency-vulnerabilities.md)
  — CVE gate (Trivy / OSV)
- [`common/install-allowlist.md`](../../rules-library/common/install-allowlist.md)
  — publisher allowlist applies to image registries
- [`common/docker-deployment.md`](../../rules-library/common/docker-deployment.md)
  — container security patterns
- [`common/docker-localhost-binding.md`](../../rules-library/common/docker-localhost-binding.md)
  — `127.0.0.1:` for dev ports
- [`dockerfile/security.md`](../../rules-library/dockerfile/security.md) —
  Dockerfile-side hardening (consumer of compose YAML)

## Why this rule exists

A single misconfigured YAML file is the source of more
production incidents than most other artifact types. The
top recurring failure modes:

1. **Hardcoded secret in `values.yaml`** — committed, indexed,
   forever in git history; rotation involves rewriting history.
2. **`apiVersion` typo or deprecated API group** — manifest
   "applies" but Kubernetes silently ignores fields the new API
   doesn't recognise.
3. **Missing `securityContext`** — pod runs as root, full
   capabilities, with a writable rootfs. CVE in the application
   becomes container escape.
4. **`uses:` floating tag in GitHub Actions** — action
   maintainer retargets the tag; malicious code runs with the
   workflow's secrets.
5. **`yaml.load()` against untrusted input** — RCE via
   `!!python/object`.
6. **`NetworkPolicy` absent** — pods talk to anything; a
   compromised pod exfiltrates data to the internet.
7. **`automountServiceAccountToken: true` (default)** — every
   pod has API access; lateral movement is one curl call away.

The rules above + the CI gates close each pattern at PR time.
Cost: a few lines per file + an extra CI step. Benefit:
incidents that don't happen.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- Unsafe `yaml.load` / `YAML.load` / unsafe-constructor surfaced
  in security scan (rule 1 violation)
- Inlined secret detected by gitleaks in a YAML file (rule 2
  violation — incident-grade)
- Image / action / module reference without SHA digest in a
  tracked YAML (rule 3 weakening)
- New K8s deployment shipped without the rule 5 securityContext
  block (CIS-Benchmark weakening)
- GitHub Actions workflow without root-level `permissions:`
  (rule 7 weakening)
- YAML file accepted from untrusted input without size + anchor
  limits (rule 9 weakening — billion-laughs exposure)
- Security-critical YAML (IAM / NetworkPolicy) deployed
  unsigned in a project that adopted Cosign (rule 10 weakening)
- Schema validation step skipped in CI for a YAML class
  (rule 8 weakening)

**Refinement candidates**:

- New per-ecosystem checklist when a new YAML-driven control
  surface emerges (e.g., new IaC tool, new GitOps controller)
- Tightening of the SHA-pin gate when a tag-retargeting incident
  is observed
- New cross-reference when a sister rule (gdpr-ccpa, audit-logging)
  adds a YAML-side requirement
- New tooling row when a maintained scanner enters the team's
  workflow (e.g., new Kubernetes admission controller, new
  policy-as-code engine)

---
