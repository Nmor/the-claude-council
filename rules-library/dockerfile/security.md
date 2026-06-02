# Dockerfile Security

> Auto-fires on every `Dockerfile`, `Dockerfile.*`, `*.dockerfile`,
> `Containerfile`. Standards: **CIS Docker Benchmark v1.7**, **NIST
> SP 800-190** (Application Container Security Guide), **OWASP Docker
> Top 10**, **SLSA Framework v1.0**, **OCI Distribution Spec 1.1**,
> **Sigstore Cosign**, **CNCF TAG-Security supply-chain guides**.

## Core Principle

**Containers are an attack surface that the OS, the application,
the registry, and the runtime each contribute to. Defence in
depth: minimal base image (distroless / Wolfi / Chainguard);
non-root user; read-only root filesystem; dropped capabilities;
no secrets in image layers; signed images via Sigstore Cosign;
SBOM produced + scanned on every build; pinned tag plus digest
on every reference; FROM source registries with provenance, not
arbitrary Docker Hub uploads.**

A vulnerable container image becomes a vulnerable container at
runtime, and a vulnerable container at runtime becomes a
breached host. The rules below are the floor.

## Threat model

The container security model has four layers:

1. **Build-time** — Dockerfile, base image, dependencies, secrets
2. **Image-time** — registry, SBOM, signing, scanning
3. **Runtime** — capabilities, seccomp, AppArmor / SELinux, namespaces
4. **Orchestration** — Kubernetes RBAC, PodSecurityStandards, NetworkPolicies

This rule covers layers 1 and 2 (the Dockerfile's responsibility);
[`common/security.md`](../common/security.md) covers application
security; project-level Kubernetes / orchestrator rules cover
layers 3-4.

## OWASP Docker Top 10 mapping

| # | Vulnerability | Dockerfile mitigation |
| --- | --- | --- |
| D01 | Insecure user mapping | `USER <non-root>` (rule 3 in [`coding-style.md`](./coding-style.md)) |
| D02 | Patch management strategy | Pinned base image + Renovate auto-bumps + CVE scan |
| D03 | Network segmentation | Loopback binding (sister `docker-localhost-binding.md`) |
| D04 | Secure default settings | Multi-stage, distroless, dropped capabilities |
| D05 | Maintenance security | Image signing + SBOM + provenance |
| D06 | Logging | Stdout / stderr only (12-factor) |
| D07 | Communications security | TLS 1.2+ between containers; mTLS in service mesh |
| D08 | Resource protection | CPU + memory limits in orchestrator |
| D09 | Image integrity | Digest pinning + Sigstore Cosign |
| D10 | Audit + traceability | OCI labels (rule 11 in [`coding-style.md`](./coding-style.md)) + SBOM |

## Mandatory rules

### 1. Non-root user (no exceptions in production)

Per [`coding-style.md`](./coding-style.md) rule 3. The Dockerfile
ends with `USER <non-root>`. Kubernetes `securityContext`
enforces a redundant check:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

CIS Docker Benchmark 4.1: "Ensure a user for the container has
been created." Failing this is a finding on every enterprise
audit.

### 2. Pinned base image with digest

Per [`coding-style.md`](./coding-style.md) rule 2 and
[`common/dependency-pinning.md`](../common/dependency-pinning.md):

```dockerfile
# WRONG — tag floats
FROM node:22

# WRONG — tag without digest
FROM node:22.4.0-alpine3.21

# RIGHT — tag + digest
FROM node:22.4.0-alpine3.21@sha256:a1b2c3d4...
```

Tag retargeting is a supply-chain attack vector (the upstream
maintainer's registry credentials are compromised; tag `22.4.0`
now points at a backdoored layer). Digest pinning makes this
impossible — the digest is the cryptographic identity.

### 3. No secrets in the image

Three places secrets must NEVER appear:

```dockerfile
# WRONG — secret in ENV (visible in `docker inspect`)
ENV STRIPE_SECRET_KEY=sk_live_...

# WRONG — secret in ARG (visible in `docker history`)
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > /root/.npmrc

# WRONG — secret committed to source then COPY'd
COPY .env /app/.env
```

The correct pattern:

```dockerfile
# RIGHT — BuildKit secret mount; not in any layer
RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
    pnpm install --frozen-lockfile
```

Per [`common/secrets-management.md`](../common/secrets-management.md).
Pre-commit hooks (gitleaks, trufflehog) catch secrets before they
enter git history.

### 4. CVE scanning in CI is mandatory

Per [`common/dependency-vulnerabilities.md`](../common/dependency-vulnerabilities.md):

```yaml
- name: Trivy image scan
  uses: aquasecurity/trivy-action@<sha>
  with:
    image-ref: registry.example.com/myapp:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH,MEDIUM'
    exit-code: '1'      # fail on findings
    ignore-unfixed: false
```

Tools: **Trivy** (Aqua), **Grype** (Anchore), **Docker Scout**,
**Snyk Container**. Multi-scanner is acceptable; single-scanner
is the floor. Findings of CRITICAL / HIGH / MEDIUM block the
build per [`common/security-controls-org-wide.md`](../common/security-controls-org-wide.md).

### 5. SBOM on every build

The Software Bill of Materials lists every component:

```bash
# Buildkit
docker buildx build --sbom=true --provenance=mode=max --push .

# Standalone (after build)
syft registry.example.com/myapp:1.4.2 -o spdx-json > sbom.json
```

The SBOM ships alongside the image (OCI referrer). When CVE-2026-
12345 is announced affecting `libxyz` versions ≤ 1.4, the SBOM
makes it trivial to identify every image needing rebuild.

### 6. Image signing (Sigstore Cosign)

Per [`common/security-controls-org-wide.md`](../common/security-controls-org-wide.md):

```bash
# Sign (CI uses OIDC keyless signing — no long-lived keys)
cosign sign --yes registry.example.com/myapp:1.4.2

# Verify at deploy time
cosign verify \
  --certificate-identity-regexp '^https://github.com/example/myapp/.github/workflows/.+@.+$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  registry.example.com/myapp:1.4.2
```

Kubernetes admission controllers (Sigstore Policy Controller,
Kyverno, OPA Gatekeeper) reject unsigned images. Sigstore's
transparency log makes signing-key compromise detectable.

### 7. Distroless or minimal-base for production

Per [`patterns.md`](./patterns.md) pattern 2. Distroless images:

- **No shell** → can't `docker exec sh` for live RCE
- **No package manager** → can't `apk add` malicious deps post-deploy
- **No common utilities** → smaller attack surface
- **Non-root user by default** (`nonroot`)
- **Minimal CVE exposure** → daily-rebuilt base by Google /
  Chainguard

For staging and production: distroless / Wolfi / Chainguard.
For development with debugging: Alpine or Debian-slim is
acceptable (separate Dockerfile or build target).

### 8. Read-only root filesystem at runtime

The container's root filesystem is read-only; writable paths are
explicit tmpfs / volume mounts:

```yaml
# Kubernetes
securityContext:
  readOnlyRootFilesystem: true
volumes:
  - name: tmp
    emptyDir: {}
volumeMounts:
  - name: tmp
    mountPath: /tmp
```

The Dockerfile must support read-only-root: no `RUN`-time
writable directories outside `/tmp`, `/var/log`, or explicit
mount points. Node.js requires `/tmp` writable for npm scratch
files; Python needs `/tmp` for `.pyc` cache (or set
`PYTHONDONTWRITEBYTECODE=1`).

### 9. Dropped capabilities at runtime

Linux capabilities are fine-grained privileges. Default Docker
gives ~14 capabilities; most applications need ZERO:

```yaml
# Kubernetes — drop ALL, add back only what's needed
securityContext:
  capabilities:
    drop: ["ALL"]
    add: []      # ← document why if non-empty
```

For applications binding to ports < 1024 (legacy): use
`CAP_NET_BIND_SERVICE` OR (better) bind to a high port and let a
proxy (Service, Ingress) front it.

### 10. No `--privileged` containers

Never. A `--privileged` container has all capabilities, sees all
devices, has unrestricted seccomp, can mount filesystems —
container isolation is effectively disabled. Per CIS Docker
Benchmark 5.4.

Exceptions (extreme): Docker-in-Docker for CI runners (`dind`
image), kernel-module debugging — both have documented
alternatives (`buildkit` for in-container builds; `crictl` for
debugging).

### 11. Vulnerable defaults disabled

```dockerfile
# Python — disable bytecode write (allows readOnlyRootFilesystem)
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# Node.js — disable npm telemetry
ENV NPM_CONFIG_LOGLEVEL=warn DISABLE_OPENCOLLECTIVE=1 \
    ADBLOCK=1 ADBLOCK_INSTALL=1

# Disable npm `package-lock.json` auto-regen (deterministic installs)
ENV CI=true
```

For Java: `-Djava.security.egd=file:/dev/./urandom` for fast
random number generation (otherwise the JVM blocks on entropy).

### 12. Network egress is documented

The Dockerfile's build-time network access:

- Pulling the base image — yes, from registry
- `apt-get update` — yes, from package mirror
- `pnpm install` — yes, from npm registry
- `RUN curl https://...` — DOCUMENTED + checksum-verified

CI runners should have egress allowlists; build steps that
exfiltrate data via DNS lookups or HTTPS POST to unexpected
hosts get caught. Tools: **Bandcamp** (CNCF), **Falco** (CNCF),
custom CI middleware.

### 13. Layer minimisation

Fewer layers = fewer attack surfaces + faster pulls + better
caching. Chain related operations (rule 5 in [`coding-style.md`](./coding-style.md)).
Recommended: ≤ 20 layers per stage.

```bash
docker history --no-trunc <image>
# count layers; if > 20 in a single stage, restructure
```

### 14. Compromised-image detection

The CI pipeline includes:

- Trivy / Grype on every PR (CVE)
- Cosign sign on every release (provenance)
- Docker Scout / Snyk on every release (license + CVE + secrets)
- Static analysis: `dockle`, `dive`, `container-structure-tests`

On the runtime side: **Falco** monitors syscalls for anomalous
behaviour (unexpected shell spawn, sensitive file access).

### 15. Registry hardening

The registry that holds the images is itself a security domain:

- Use a private registry (ECR, GAR, ACR, Harbor, Quay) — not
  Docker Hub for production
- Enable repository immutability (tag re-push forbidden)
- IAM-scoped pull credentials per environment
- Image-scanning at the registry layer (ECR Image Scanning,
  Harbor Trivy)
- Replication to disaster-recovery region
- Audit logs of every push / pull / tag-mutate

## Per-stack hardening

### Node.js

```dockerfile
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

# After npm install, prune dev deps
RUN pnpm prune --prod

# Disable HTTP/2 server push (reduces attack surface)
ENV NODE_NO_HTTP2=1
```

### Python

```dockerfile
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
```

### Go (static binary)

```dockerfile
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags='-s -w -buildid=' -o /server ./cmd/server
# -trimpath: remove file system paths from binary
# -s -w: strip debug symbols + DWARF
# -buildid=: deterministic build ID
```

### Rust

```dockerfile
RUN cargo build --release --locked
# --locked: ensure Cargo.lock matches; fail otherwise
```

### Java

```dockerfile
ENTRYPOINT ["java", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-XX:MaxRAMPercentage=75.0", \
            "-XX:+UseG1GC", \
            "-XX:+ExitOnOutOfMemoryError", \
            "-jar", "/app/app.jar"]
```

## Hadolint security rules

| Rule | Pattern | Fix |
| --- | --- | --- |
| **DL3002** | Last USER is root | Add `USER <non-root>` |
| **DL3004** | `sudo` in RUN | Drop — RUN executes as root by default |
| **DL3007** | `latest` tag | Pin specific version |
| **DL3008** | apt without version | Pin version |
| **DL3018** | apk without version | Pin version |
| **DL3019** | Apk add without `--no-cache` | Add `--no-cache` |
| **DL3020** | ADD where COPY suffices | Replace with COPY |
| **DL3023** | COPY --from to same alias | Fix alias |
| **DL3024** | FROM alias collisions | Rename one alias |
| **DL3025** | JSON CMD form missing | Use exec form |
| **DL3047** | wget without progress flag | Add `--progress=dot:giga` for CI |
| **DL4000** | MAINTAINER (deprecated) | Use OCI label `org.opencontainers.image.authors` |
| **DL4006** | Set SHELL with -o pipefail | `SHELL ["/bin/bash", "-o", "pipefail", "-c"]` |

## Standards cited

- [CIS Docker Benchmark v1.7](https://www.cisecurity.org/benchmark/docker/)
- [NIST SP 800-190](https://csrc.nist.gov/publications/detail/sp/800-190/final) — Application Container Security Guide
- [OWASP Docker Top 10](https://github.com/OWASP/Docker-Security)
- [SLSA Framework v1.0](https://slsa.dev/)
- [OCI Distribution Spec 1.1](https://github.com/opencontainers/distribution-spec)
- [Sigstore Cosign](https://docs.sigstore.dev/cosign/)
- [Pod Security Standards (Kubernetes)](https://kubernetes.io/docs/concepts/security/pod-security-standards/)

## Cross-references

- [`dockerfile/coding-style.md`](./coding-style.md) — style baseline
- [`dockerfile/patterns.md`](./patterns.md) — multi-stage, distroless
- [`dockerfile/hooks.md`](./hooks.md) — CI gates, signing workflow
- [`dockerfile/testing.md`](./testing.md) — container-structure tests
- [`common/security.md`](../common/security.md) — OWASP umbrella
- [`common/secrets-management.md`](../common/secrets-management.md) — BuildKit secrets
- [`common/dependency-vulnerabilities.md`](../common/dependency-vulnerabilities.md) — CVE gate
- [`common/security-controls-org-wide.md`](../common/security-controls-org-wide.md) — 5-layer enforcement
- [`common/docker-localhost-binding.md`](../common/docker-localhost-binding.md) — port binding

## Why this rule exists

Container security incidents traced to Dockerfile defects are
the leading cause of regulatory findings + customer trust loss
in container-native organisations. Real-world incidents:

- 2024 PyPI typosquat injected into base image; runtime
  exfiltrated AWS credentials (rule 4 — CVE scan would have
  flagged)
- 2023 SolarWinds-style compromise of an internal base image
  via tag-retarget (rule 2 — digest pinning would have prevented)
- 2022 container escape (CVE-2022-0185) — exploitable because
  the container ran as root (rule 1)
- 2021 Codecov bash uploader breach — the build script ran
  `curl | bash` (anti-pattern 7 in [`patterns.md`](./patterns.md))
- 2020 Kubernetes secret leakage via `ENV` (rule 3 — BuildKit
  secrets prevent)

The cost of this rule is hard but bounded: ~1 day to retrofit
a project from "Docker Hub `latest`" to "private registry +
signed + scanned + pinned". The cost of NOT adopting is each of
the above on repeat.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- Image deployed without Trivy/Grype CVE scan passing (rule 4 violation)
- SBOM not produced on a production release (rule 5 weakening)
- Image deployed without Sigstore signature (rule 6 weakening — admission controller bypass)
- New base image adopted from Docker Hub (rather than private registry) without justification (rule 15 weakening)
- Distroless rejected on "we need to debug in production" (rule 7 — should be addressed via separate debug image, not weakened production base)
- Read-only root filesystem disabled without documented write-path requirement (rule 8 weakening)
- Capabilities added back to `drop: ["ALL"]` without justification (rule 9 weakening)
- `--privileged` container shipped (rule 10 violation — escalate to security review)

**Refinement candidates**:

- New per-stack hardening row when a runtime adopts the codebase (e.g. Bun, Deno, Mojo, Crystal)
- Tightening of the CVE gate when a recurring class (zero-day disclosure window) shows MODERATE as insufficient floor
- New cross-reference when a sister rule (kubernetes-patterns, helm-patterns) defines the orchestrator layer
- Promotion of `dockle` / `dive` static analysis from optional to mandatory when image-bloat incidents recur
