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
  [`dependency-pinning.md`](../common/dependency-pinning.md))
- `resources.requests` + `resources.limits` set on every
  container (FinOps + scheduling)
- `securityContext.runAsNonRoot: true` (per
  [`docker-deployment.md`](../common/docker-deployment.md))
- `readinessProbe` + `livenessProbe` declared
- `imagePullPolicy: IfNotPresent` (avoid `Always` in prod)

### Docker Compose

- `services.<svc>.ports` follow `127.0.0.1:HOST:CONTAINER` for
  local dev (per
  [`docker-localhost-binding.md`](../common/docker-localhost-binding.md))
- `services.<svc>.image` SHA-pinned for prod-shape composes
- `services.<svc>.healthcheck` declared on every long-running
  service
- No `command:` overrides that bypass the image's entrypoint
  unless explicitly required + documented

### GitHub Actions workflows

- `uses:` entries SHA-pinned with version comment (per
  [`security-controls-org-wide.md`](../common/security-controls-org-wide.md))
- `permissions:` declared at workflow root with least privilege
- `timeout-minutes:` set on every job
- `concurrency.group:` set to avoid duplicate runs on quick
  re-pushes
- `env:` does not contain secrets — use `${{ secrets.X }}`

### OpenAPI / AsyncAPI specs

- `openapi: "3.1.0"` (or AsyncAPI `asyncapi: "3.0.0"`) pinned
  string
- `info.version` follows
  [`semver.md`](../common/semver.md)
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

- [`common/coding-style.md`](../common/coding-style.md) — broader
  global comment + immutability rules apply to YAML's
  templating layer (Helm Go templates, Kustomize patches)
- [`common/extreme-lint-policy.md`](../common/extreme-lint-policy.md)
  — yamllint at strict ruleset is mandatory in CI
- [`common/dependency-pinning.md`](../common/dependency-pinning.md)
  — version pinning applies to every image / module / action
  reference inside YAML
- [`common/docker-localhost-binding.md`](../common/docker-localhost-binding.md)
  — `127.0.0.1:` prefix on every dev port
- [`common/docker-deployment.md`](../common/docker-deployment.md)
  — `securityContext.runAsNonRoot` + multi-stage build refs
- [`common/security-controls-org-wide.md`](../common/security-controls-org-wide.md)
  — SHA-pin every `uses:` in GitHub Actions
- [`common/secrets-management.md`](../common/secrets-management.md)
  — never inline real secret values; reference vault / env vars
- [`common/schema-evolution.md`](../common/schema-evolution.md)
  — OpenAPI / AsyncAPI evolution rules
- [`yaml/security.md`](./security.md) — security-specific YAML
  patterns + anti-patterns
- [`yaml/patterns.md`](./patterns.md) — architectural patterns
  (anchors, overlays, templating boundaries)
- [`yaml/hooks.md`](./hooks.md) — pre-commit + CI gates

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
