# Dockerfile + Container Hooks

> Auto-fires on every `Dockerfile`, `Dockerfile.*`, `*.dockerfile`,
> `docker-compose*.yml`, `compose*.yml`, `.dockerignore`,
> `containerfile`, `Containerfile`, and any path under `docker/`,
> `containers/`, `oci/`, `images/`. Sister to
> `~/.claude/rules/common/hooks.md`, `~/.claude/rules/dockerfile/
> coding-style.md`, `~/.claude/rules/dockerfile/security.md`,
> `~/.claude/rules/dockerfile/testing.md`. Standards: **Docker
> Build Cloud**, **BuildKit 1.20+**, **OCI Image Spec 1.1.1**,
> **SLSA Framework v1.0**, **Sigstore Cosign**, **Hadolint
> v2.13+**, **GitHub Actions docker/build-push-action v6**.

## Core Principle

**Every container image is built, scanned, signed, and shipped
through an enforced pipeline. Pre-commit hooks catch the obvious
defects locally; CI gates catch what slipped past; deploy gates
catch what slipped past CI; signature verification at runtime
catches everything else. The pipeline is defense-in-depth: no
single layer is the only line of defense, and every layer is
non-bypassable for routine work.**

A container image without a signed provenance attestation, a
verified SBOM, and a passing CVE scan is not deployable. A
Dockerfile that hasn't passed Hadolint + a multi-stage build
verification is not mergeable. The hooks below make these
non-negotiable.

## The 6-layer pipeline

| Layer | Where | What it catches | Bypass cost |
| --- | --- | --- | --- |
| **1. Editor / IDE** | VS Code Docker extension, JetBrains Docker plugin | Syntax errors, basic Hadolint lint | Trivially bypassable (close warning) |
| **2. Pre-commit hook** | `.githooks/pre-commit` | Hadolint, `.dockerignore` presence, no secrets in source | `--no-verify` flag |
| **3. Pre-push hook** | `.githooks/pre-push` | Local build success, basic structural test | `--no-verify` flag |
| **4. CI on PR** | GitHub Actions / GitLab CI | Hadolint, build, SBOM gen, CVE scan, structural test, signature gen | Branch protection prevents merge |
| **5. CD before deploy** | Same workflow as CI, plus signature verify | Cosign verify, policy gate (Kyverno / OPA), final structure test | Deploy-time gate; cannot be bypassed at runtime |
| **6. Runtime admission** | Kubernetes admission controller, AWS IRSA + ECR scan | Signature verification, severity threshold, registry allowlist | Cluster-level enforcement; org-admin override only |

A change that violates layer 1 may still ship if the developer
ignores the IDE; layer 2 forces a hook bypass; layer 3 forces a
hook bypass; layer 4 fails the PR check; layer 5 fails the
deploy job; layer 6 fails the cluster admission. Bypassing all
six requires multiple deliberate actions, each audit-logged.

## Pre-commit hooks (layer 2)

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
# Pre-commit gate for Dockerfile + compose changes.
# Installed via: git config core.hooksPath .githooks
set -euo pipefail

staged_docker=$(git diff --cached --name-only --diff-filter=ACMR \
    | grep -E '(^|/)(Dockerfile|Containerfile|.+\.dockerfile|docker-compose.*\.ya?ml|compose.*\.ya?ml)$' \
    || true)

if [[ -z "${staged_docker}" ]]; then
    exit 0
fi

# Track staged files to restore on hook failure (defence against
# partial commits that leave the working tree inconsistent).
mapfile -t staged_files < <(echo "${staged_docker}")
echo "Pre-commit: scanning ${#staged_files[@]} Dockerfile-related files"

# 1. Hadolint — strict mode (warnings are errors)
for file in "${staged_files[@]}"; do
    case "${file}" in
        Dockerfile*|*.dockerfile|Containerfile)
            if ! command -v hadolint >/dev/null 2>&1; then
                echo "ERROR: hadolint not installed. Install: brew install hadolint" >&2
                exit 1
            fi
            hadolint --no-fail "${file}" \
                | tee /tmp/hadolint-${file//\//_}.out
            if [[ -s /tmp/hadolint-${file//\//_}.out ]]; then
                echo "Hadolint findings in ${file}; treat as errors per extreme-lint-policy.md" >&2
                exit 1
            fi
            ;;
        *compose*.yml|*compose*.yaml)
            if command -v docker >/dev/null 2>&1; then
                docker compose -f "${file}" config --quiet \
                    || { echo "compose config invalid in ${file}" >&2; exit 1; }
            fi
            ;;
    esac
done

# 2. .dockerignore presence — every dir containing a Dockerfile
#    MUST have a .dockerignore alongside.
for file in "${staged_files[@]}"; do
    if [[ "${file}" == */Dockerfile* || "${file}" == */*.dockerfile ]]; then
        dir=$(dirname "${file}")
        if [[ ! -f "${dir}/.dockerignore" ]]; then
            echo "Missing .dockerignore alongside ${file}" >&2
            echo "Create ${dir}/.dockerignore to prevent context bloat" >&2
            exit 1
        fi
    fi
done

# 3. No secret patterns in Dockerfile (paranoia layer; the no-discards
#    hook should already block these).
for file in "${staged_files[@]}"; do
    if grep -E "(AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{40,}|password\s*=\s*['\"])" \
        "${file}" >/dev/null 2>&1; then
        echo "Suspected secret in ${file}" >&2
        echo "Use BuildKit secret mounts: --mount=type=secret,id=..." >&2
        exit 1
    fi
done

# 4. No `latest` tag in FROM directives (must be pinned + digest per
#    coding-style.md rule 2).
for file in "${staged_files[@]}"; do
    if grep -E '^FROM .+:latest' "${file}" >/dev/null 2>&1; then
        echo "FROM ...:latest in ${file}" >&2
        echo "Pin to a specific version + digest: FROM image:1.2.3@sha256:..." >&2
        exit 1
    fi
done

# 5. No USER root in production stages (allowed in build stages only).
for file in "${staged_files[@]}"; do
    if [[ "${file}" == */Dockerfile* || "${file}" == */*.dockerfile ]]; then
        # Find the final stage (last FROM ... AS <name>) and check
        # for USER directives after it.
        awk '
            /^FROM/ { stage++; in_final = 0 }
            /^FROM/ && match($0, /AS [a-z]+$/) { last_stage = stage }
            END { exit (last_stage > 0 ? 0 : 1) }
        ' "${file}"
        # Simpler approach: any USER root anywhere in production
        # files is suspect; full final-stage analysis lives in CI.
        if grep -E '^USER\s+(root|0)\b' "${file}" >/dev/null 2>&1; then
            echo "USER root detected in ${file}" >&2
            echo "Production stages must run as non-root user" >&2
            exit 1
        fi
    fi
done

echo "Pre-commit gate green for Docker artifacts"
```

## Pre-push hooks (layer 3)

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
# Pre-push gate: actual build + structural test.
set -euo pipefail

# Only run if Dockerfile-related changes are about to be pushed.
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "")
if [[ -z "${upstream}" ]]; then
    range="HEAD"
else
    range="${upstream}..HEAD"
fi

changed_docker=$(git diff --name-only "${range}" \
    | grep -E '(^|/)(Dockerfile|.+\.dockerfile|docker-compose.*\.ya?ml)$' \
    || true)

if [[ -z "${changed_docker}" ]]; then
    exit 0
fi

echo "Pre-push: validating Dockerfile changes via local build"

# Build every changed Dockerfile (no push to registry)
for dockerfile in ${changed_docker}; do
    case "${dockerfile}" in
        */Dockerfile|*.dockerfile|Dockerfile)
            ctx=$(dirname "${dockerfile}")
            image_tag="prepush-$(basename "${dockerfile}")-${USER}"
            echo "Building ${dockerfile} in ${ctx}"
            if ! docker build \
                --file "${dockerfile}" \
                --tag "${image_tag}" \
                --progress=plain \
                "${ctx}"; then
                echo "Build failed for ${dockerfile}" >&2
                exit 1
            fi

            # Quick structural smoke (per testing.md layer-1).
            if [[ -f "${ctx}/container-structure-test.yaml" ]]; then
                container-structure-test test \
                    --image "${image_tag}" \
                    --config "${ctx}/container-structure-test.yaml" \
                    || { echo "structure test failed for ${image_tag}" >&2; exit 1; }
            fi
            ;;
    esac
done

echo "Pre-push gate green; pushing"
```

## CI workflow (layer 4)

`.github/workflows/docker.yml`:

```yaml
name: Docker

on:
  pull_request:
    paths:
      - 'Dockerfile*'
      - '**/Dockerfile*'
      - '**/*.dockerfile'
      - 'docker-compose*.yml'
      - 'compose*.yml'
      - '.dockerignore'
  push:
    branches: [main]
    paths:
      - 'Dockerfile*'
      - '**/Dockerfile*'
      - '**/*.dockerfile'
      - 'docker-compose*.yml'
      - 'compose*.yml'

permissions:
  contents: read
  id-token: write     # for Cosign keyless OIDC signing
  packages: write     # for ghcr.io push
  attestations: write # for SLSA + SBOM attestations

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    name: Hadolint (strict)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - name: Hadolint
        uses: hadolint/hadolint-action@<sha>
        with:
          dockerfile: Dockerfile
          failure-threshold: warning
          no-fail: false

  build-and-push:
    name: Build + push + sign
    needs: lint
    runs-on: ubuntu-latest
    outputs:
      digest: ${{ steps.build.outputs.digest }}
      image-uri: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@<sha>

      # Multi-arch: amd64 + arm64 per patterns.md
      - name: Set up QEMU
        uses: docker/setup-qemu-action@<sha>

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@<sha>
        with:
          driver-opts: |
            image=moby/buildkit:v0.20.2

      - name: Log in to registry
        uses: docker/login-action@<sha>
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@<sha>
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=sha-,format=long
          labels: |
            org.opencontainers.image.title=${{ github.event.repository.name }}
            org.opencontainers.image.description=${{ github.event.repository.description }}
            org.opencontainers.image.source=${{ github.event.repository.html_url }}
            org.opencontainers.image.revision=${{ github.sha }}
            org.opencontainers.image.licenses=${{ github.event.repository.license.spdx_id }}

      - name: Build + push
        id: build
        uses: docker/build-push-action@<sha>
        with:
          context: .
          file: Dockerfile
          push: true
          platforms: linux/amd64,linux/arm64
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha,scope=${{ github.workflow }}
          cache-to: type=gha,mode=max,scope=${{ github.workflow }}
          provenance: mode=max
          sbom: true

  scan:
    name: CVE scan (Trivy + Grype)
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>

      - name: Trivy scan
        uses: aquasecurity/trivy-action@<sha>
        with:
          image-ref: ${{ needs.build-and-push.outputs.image-uri }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH,MEDIUM
          exit-code: 1
          ignore-unfixed: false

      - name: Upload Trivy results
        if: always()
        uses: github/codeql-action/upload-sarif@<sha>
        with:
          sarif_file: trivy-results.sarif
          category: trivy

      - name: Grype scan (defence in depth)
        uses: anchore/scan-action@<sha>
        with:
          image: ${{ needs.build-and-push.outputs.image-uri }}
          severity-cutoff: medium
          fail-build: true

  structure-test:
    name: Container Structure Test
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - name: Pull image
        run: docker pull ${{ needs.build-and-push.outputs.image-uri }}
      - name: Install container-structure-test
        run: |
          curl -L https://storage.googleapis.com/container-structure-test/latest/container-structure-test-linux-amd64 \
            -o /usr/local/bin/container-structure-test
          chmod +x /usr/local/bin/container-structure-test
      - name: Run structure tests
        run: |
          container-structure-test test \
            --image ${{ needs.build-and-push.outputs.image-uri }} \
            --config container-structure-test.yaml

  dockle:
    name: Dockle (CIS Docker Benchmark)
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: goodwithtech/dockle-action@<sha>
        with:
          image: ${{ needs.build-and-push.outputs.image-uri }}
          format: sarif
          output: dockle-results.sarif
          exit-code: 1
          exit-level: warn

  sign:
    name: Cosign signing
    needs: [build-and-push, scan, structure-test, dockle]
    runs-on: ubuntu-latest
    steps:
      - name: Install Cosign
        uses: sigstore/cosign-installer@<sha>
        with:
          cosign-release: v2.4.1
      - name: Sign image (keyless OIDC)
        run: |
          cosign sign --yes \
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ needs.build-and-push.outputs.digest }}
      - name: Generate SBOM attestation
        run: |
          syft ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ needs.build-and-push.outputs.digest }} \
            -o spdx-json > sbom.spdx.json
          cosign attest --yes \
            --predicate sbom.spdx.json \
            --type spdxjson \
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ needs.build-and-push.outputs.digest }}
```

## Deploy-time gate (layer 5)

The deploy workflow re-runs signature verification, fails if the
image was rebuilt without going through the signing job:

```yaml
deploy:
  name: Deploy to ${{ inputs.environment }}
  runs-on: ubuntu-latest
  steps:
    - name: Verify signature
      uses: sigstore/cosign-installer@<sha>
    - name: Cosign verify
      run: |
        cosign verify \
          --certificate-identity-regexp '^https://github.com/${{ github.repository }}/' \
          --certificate-oidc-issuer https://token.actions.githubusercontent.com \
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ inputs.digest }}

    - name: Verify SBOM attestation
      run: |
        cosign verify-attestation \
          --type spdxjson \
          --certificate-identity-regexp '^https://github.com/${{ github.repository }}/' \
          --certificate-oidc-issuer https://token.actions.githubusercontent.com \
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ inputs.digest }}

    - name: Re-scan latest CVE database
      uses: aquasecurity/trivy-action@<sha>
      with:
        image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ inputs.digest }}
        severity: CRITICAL,HIGH
        exit-code: 1
```

The deploy-time scan catches CVEs disclosed AFTER the PR's
build, which is the highest-leverage window: a critical CVE
published yesterday should not deploy today even if CI was
green a week ago.

## Runtime admission (layer 6)

For Kubernetes clusters, a Kyverno or OPA Gatekeeper policy
enforces signature verification at admission time:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: verify-cosign-signature
      match:
        any:
          - resources:
              kinds: [Pod]
      verifyImages:
        - imageReferences:
            - "ghcr.io/myorg/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/myorg/*"
                    issuer: "https://token.actions.githubusercontent.com"
```

For AWS ECS / EKS without Kyverno, ECR's "image scanning on
push" + the `ImageScanningConfiguration` block on the repo
provides the equivalent.

## Hadolint configuration

`.hadolint.yaml` at repo root:

```yaml
# Treat warnings as errors per extreme-lint-policy.md
failure-threshold: warning

# Explicit rule severities
override:
  error:
    - DL3025  # JSON form for CMD / ENTRYPOINT
    - DL3007  # No `latest` tag
    - DL3002  # No USER root in final stage
    - DL3024  # No FROM ... AS name conflict
    - DL3045  # COPY into separate dir
    - DL3059  # Multiple consecutive RUN

  warning:
    - DL3008  # Pin apt-get versions
    - DL3009  # Apt-get rm /var/lib/apt/lists
    - DL3015  # Apt-get --no-install-recommends
    - DL3018  # Apk add --no-cache
    - DL3033  # Yum install -y --setopt

# Allowlisted base images (registries the org trusts)
trusted-registries:
  - "docker.io"
  - "ghcr.io"
  - "gcr.io"
  - "registry.k8s.io"
  - "public.ecr.aws"
  - "cgr.dev"

# Project-specific exceptions; each must carry a comment explaining why.
ignored:
  []
```

## Required tooling (developer machine)

```bash
# macOS via Homebrew
brew install hadolint dive dockle trivy cosign syft grype \
             container-structure-test

# Linux (Debian-derived)
apt-get install -y docker.io docker-compose-plugin
curl -L https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64 \
  -o /usr/local/bin/hadolint && chmod +x /usr/local/bin/hadolint

# Windows: WSL2 with the Linux instructions above, or Chocolatey
# (Docker Desktop required; native Windows containers out of scope here).
```

## Cross-references

- `~/.claude/rules/common/hooks.md` — universal hook framework
- `~/.claude/rules/dockerfile/coding-style.md` — what the hooks enforce
- `~/.claude/rules/dockerfile/security.md` — Cosign + Trivy + SBOM
- `~/.claude/rules/dockerfile/testing.md` — structure-test + Goss
- `~/.claude/rules/common/dependency-vulnerabilities.md` — CVE gate
- `~/.claude/rules/common/security-controls-org-wide.md` — 5-layer
- `~/.claude/rules/common/github-actions-gotchas.md` — Actions caveats
- `~/.claude/rules/common/deploy-failures-become-checks.md` — gate pattern

## Standards cited

- **Docker BuildKit 1.20+** — `--mount=type=secret`, attestation
- **OCI Image Spec 1.1.1** — labels, annotations, SBOM
- **SLSA Framework v1.0** — Build L3 provenance
- **Sigstore Cosign 2.4+** — keyless OIDC signing
- **CIS Docker Benchmark v1.7**
- **NIST SP 800-190** — Application Container Security Guide

## Why this rule exists

The Docker supply chain has been the source of multiple high-
profile incidents: Tj-actions retargeting (2025), the Docker
Hub crypto-mining base images (2024), and the SolarWinds-style
build-system compromise pattern (2020). Each shows the same
shape: a single layer of defense, no signature verification,
no SBOM, no policy gate at admission.

Defense-in-depth via 6 enforcement layers ensures that a single
compromised step (a malicious base image, a leaked CI token, a
forgotten `--no-verify` push) is caught at the next layer. The
cost of the pipeline at PR time is one job per layer (~3-5
minutes total); the cost of a compromised image in production
is days of incident response.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Pre-commit hook bypassed via `--no-verify` (rule 2 weakening)
- `.dockerignore` missing alongside a new Dockerfile (rule 2 violation)
- CI workflow lacks Cosign signing step on push to main
- Deploy job skips signature verification step
- Hadolint downgraded from "error" to "warning" without justification
- Image deployed to production without SBOM attestation
- Kyverno / OPA admission policy disabled for "convenience"
- Same CVE class appearing in 3+ images (base-image refresh overdue)

**Refinement candidates**:

- New layer in the pipeline when a new attack surface is documented
- Tightening of the Hadolint baseline when a recurring lint class is observed
- New cross-reference when a sister rule (deploy-failures-become-checks, github-actions-gotchas) prescribes a new gate
- Promotion of project-specific Hadolint exceptions to org-wide bans when they recur
