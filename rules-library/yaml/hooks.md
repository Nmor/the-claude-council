# YAML Hooks

> Auto-fires on every `*.yml`, `*.yaml`, `.yamllint.yaml`,
> `.yamllint.yml`, `.yamllint`, `.spectral.yaml`,
> `kustomization.yaml`, `values.yaml`, `Chart.yaml` file.
> Sister to [`common/hooks.md`](../common/hooks.md). Tooling:
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
[`common/local-dev-setup.md`](../common/local-dev-setup.md), the
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
[`common/security-controls-org-wide.md`](../common/security-controls-org-wide.md).

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

Per [`common/verify-before-claim.md`](../common/verify-before-claim.md).

## Cross-references

- [`yaml/coding-style.md`](./coding-style.md) — formatting +
  schema-reference directives
- [`yaml/patterns.md`](./patterns.md) — composition + overlay
  patterns
- [`yaml/security.md`](./security.md) — security-specific gates
- [`common/hooks.md`](../common/hooks.md) — broader hook
  lifecycle
- [`common/extreme-lint-policy.md`](../common/extreme-lint-policy.md)
  — strict linter posture
- [`common/security-controls-org-wide.md`](../common/security-controls-org-wide.md)
  — SHA-pinned third-party actions; 5-layer enforcement
- [`common/local-dev-setup.md`](../common/local-dev-setup.md)
  — local-CI parity via shared verify script
- [`common/verify-before-claim.md`](../common/verify-before-claim.md)
  — same-turn verification block
- [`common/deploy-failures-become-checks.md`](../common/deploy-failures-become-checks.md)
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

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

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
