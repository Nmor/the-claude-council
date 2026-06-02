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

Per [`common/reuse-first.md`](../common/reuse-first.md). Common
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

- [`yaml/coding-style.md`](./coding-style.md) — naming + format
- [`yaml/security.md`](./security.md) — secret handling +
  schema validation gates
- [`yaml/hooks.md`](./hooks.md) — pre-commit + CI integration
- [`common/patterns.md`](../common/patterns.md) — repository +
  envelope patterns inform schema design
- [`common/schema-evolution.md`](../common/schema-evolution.md)
  — OpenAPI / AsyncAPI versioning
- [`common/secrets-management.md`](../common/secrets-management.md)
  — vault-bound secrets, never inlined
- [`common/dependency-pinning.md`](../common/dependency-pinning.md)
  — SHA-pinned image refs inside Compose / K8s
- [`common/extreme-lint-policy.md`](../common/extreme-lint-policy.md)
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

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

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
