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
(per [`common/secrets-management.md`](../common/secrets-management.md)).
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

Per [`common/dependency-pinning.md`](../common/dependency-pinning.md) and
[`common/security-controls-org-wide.md`](../common/security-controls-org-wide.md),
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

Per [`common/extreme-lint-policy.md`](../common/extreme-lint-policy.md),
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
      [`common/rate-limiting.md`](../common/rate-limiting.md))

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

- [`yaml/coding-style.md`](./coding-style.md) — formatting +
  quoting + key naming
- [`yaml/patterns.md`](./patterns.md) — composition + overlay
  patterns
- [`yaml/hooks.md`](./hooks.md) — pre-commit + CI gates
- [`common/security.md`](../common/security.md) — OWASP Top 10
  umbrella
- [`common/secrets-management.md`](../common/secrets-management.md)
  — vault-first; no inlined secrets
- [`common/security-controls-org-wide.md`](../common/security-controls-org-wide.md)
  — 5-layer non-bypassable enforcement
- [`common/dependency-pinning.md`](../common/dependency-pinning.md)
  — SHA-pin everything
- [`common/dependency-vulnerabilities.md`](../common/dependency-vulnerabilities.md)
  — CVE gate (Trivy / OSV)
- [`common/install-allowlist.md`](../common/install-allowlist.md)
  — publisher allowlist applies to image registries
- [`common/docker-deployment.md`](../common/docker-deployment.md)
  — container security patterns
- [`common/docker-localhost-binding.md`](../common/docker-localhost-binding.md)
  — `127.0.0.1:` for dev ports
- [`dockerfile/security.md`](../dockerfile/security.md) —
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

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

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
