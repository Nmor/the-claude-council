---
name: dockerfile-patterns
description: Dockerfile + container discipline — multi-stage builds (build → runtime); pinned base image with tag + sha256 digest; non-root USER mandatory; COPY over ADD (except verified tarball); chained apt-get install + cache cleanup in same RUN layer; explicit WORKDIR; exec-form CMD/ENTRYPOINT; layer ordering least-frequent → most-frequent change; EXPOSE documentary; HEALTHCHECK for long-running services; OCI labels (org.opencontainers.image.*); .dockerignore mandatory; Hadolint at strict ruleset; BuildKit secret mounts (--mount=type=secret) never ENV/ARG for secrets. Auto-fires on Dockerfile + Compose files.
paths:
  - "**/Dockerfile"
  - "**/Dockerfile.*"
  - "**/*.dockerfile"
  - "**/Containerfile"
  - "**/containerfile"
  - "**/docker-compose*.yml"
  - "**/docker-compose*.yaml"
  - "**/compose*.yml"
  - "**/compose*.yaml"
  - ".dockerignore"
  - "**/.dockerignore"
---

> Migrated 2026-06-02 from `~/.claude/rules-library/dockerfile/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# dockerfile-patterns


<!-- ============================================================
     Section: dockerfile/coding-style.md
     ============================================================ -->

# Dockerfile Coding Style

> Auto-fires on every `Dockerfile`, `Dockerfile.*`, `*.dockerfile`,
> `Containerfile`, and `*.containerfile` file. Standards: **Dockerfile
> reference (docs.docker.com)**, **OCI Image Specification 1.1.1**
> (Sept 2024), **BuildKit syntax 1.20+**, **Hadolint** lint rule
> catalogue, **CIS Docker Benchmark 1.7**, **NIST SP 800-190**
> (Application Container Security Guide).

## Core Principle

**Every Dockerfile is multi-stage by default; pins the base image
to a versioned tag plus `@sha256:` digest; runs as a non-root
user; declares an explicit `WORKDIR`; uses `COPY` over `ADD`;
chains `apt-get update` with `apt-get install` and cleans the
package cache in the same `RUN` layer; declares `HEALTHCHECK` and
the runtime contract via `EXPOSE` (documentary), `CMD` (default
command), and `ENTRYPOINT` (executable form); refuses `latest`
tags, root accounts, secrets at build time, shell-form RUN with
interpolated variables, and ADD with untrusted URLs.**

A Dockerfile is the recipe for every replica that will ever run
the service. Sloppy Dockerfiles produce 2 GB images, root-running
containers, mystery dependency versions, layers cached against
the wrong inputs, and security findings that block enterprise
adoption. The rules below are the floor; the project may tighten
further (distroless base images, scratch, Wolfi, Chainguard) but
may not relax.

## Mandatory header

Every Dockerfile starts with the BuildKit syntax directive plus
the documented base image source:

```dockerfile
# syntax=docker/dockerfile:1.20.2

# Base image: Node.js 22 LTS on Alpine 3.21 (smallest non-glibc base)
# Maintained by Docker Official Images team; CVE feed at
#   https://hub.docker.com/_/node/security
# Last verified: 2026-05-26
FROM node:22.4.0-alpine3.21@sha256:<digest> AS base
```

The `# syntax=` directive pins the BuildKit frontend version,
which unlocks features like `--mount=type=cache`, `--mount=type=
secret`, heredoc syntax, and `--mount=type=bind`. Without the
directive, BuildKit falls back to the v1.0 frontend that lacks
all of the above.

## Mandatory rules

### 1. Multi-stage builds by default

A Dockerfile that compiles or transpiles MUST have at least two
stages: a `build` stage with the full SDK and a `runtime` stage
with only the artefacts. Single-stage builds ship the compiler,
build tools, package manager caches, and source code to
production — a 10× size penalty plus a 10× attack surface
expansion.

```dockerfile
# syntax=docker/dockerfile:1.20.2

# ----- Stage 1: build -----
FROM node:22.4.0-alpine3.21@sha256:<digest> AS build
WORKDIR /build
COPY --link package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    corepack enable && pnpm install --frozen-lockfile
COPY --link . .
RUN pnpm build && pnpm prune --prod

# ----- Stage 2: runtime -----
FROM node:22.4.0-alpine3.21@sha256:<digest> AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /build/dist ./dist
COPY --from=build --chown=app:app /build/node_modules ./node_modules
COPY --from=build --chown=app:app /build/package.json ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/healthz || exit 1
CMD ["node", "dist/server.js"]
```

The `--link` flag (BuildKit 1.5+) enables better cache reuse:
each `COPY --link` writes to an independent layer that can be
reused even when earlier stages change.

### 2. Pin base images to tag + digest

Per [`common/dependency-pinning.md`](../common/dependency-pinning.md):

```dockerfile
# WRONG — tag floats
FROM node:22

# WRONG — only tag, no digest
FROM node:22.4.0-alpine3.21

# RIGHT — tag + digest pair
FROM node:22.4.0-alpine3.21@sha256:a1b2c3d4e5f6...
```

The tag is the human-readable contract; the digest is the
cryptographic identity. Renovate / Dependabot updates both
atomically. Tags can be force-pushed by the maintainer (a
supply-chain compromise vector); digests cannot.

### 3. Non-root user is mandatory

Every runtime stage MUST end with a `USER` directive naming a
non-root user. Containers running as root inherit host
capabilities even with default `--cap-drop=ALL` — escape paths
exist (kernel CVEs, mount escapes, capability bypasses).

```dockerfile
# Alpine
RUN addgroup -S app && adduser -S app -G app
USER app

# Debian / Ubuntu
RUN groupadd --system --gid 1001 app \
 && useradd --system --uid 1001 --gid app --shell /usr/sbin/nologin app
USER app:app

# Distroless (already non-root)
USER nonroot
```

For Kubernetes deployments, also set `runAsNonRoot: true` and
`runAsUser: 1001` on the pod's `securityContext` — defence in
depth against a Dockerfile that forgets `USER`.

### 4. Use `COPY`, never `ADD` (except for tarball extraction)

`ADD` has two superpowers that turn into footguns:

- Auto-extracts local tarballs (`.tar`, `.tar.gz`, `.tar.bz2`, `.tar.xz`, `.tgz`)
- Fetches remote URLs (`ADD https://...`) without integrity check

```dockerfile
# WRONG — fetches untrusted URL; no integrity verification
ADD https://example.com/installer.sh /tmp/

# RIGHT — explicit download with checksum verification
RUN wget --quiet -O /tmp/installer.sh https://example.com/installer.sh \
 && echo "abc123...  /tmp/installer.sh" | sha256sum --check \
 && sh /tmp/installer.sh \
 && rm /tmp/installer.sh

# RIGHT — COPY for local files (default choice)
COPY --chown=app:app config.json /app/config.json
```

`ADD` is reserved for the narrow case of extracting a verified
local tarball; everything else uses `COPY`.

### 5. Chain package installs and cache cleanup in the same layer

Each `RUN` produces a layer; the package manager cache lives in
that layer forever even if a later `RUN` deletes it. Chain the
install + cleanup in one layer:

```dockerfile
# WRONG — apt cache in image forever (~50 MB+)
RUN apt-get update
RUN apt-get install -y curl ca-certificates
RUN rm -rf /var/lib/apt/lists/*

# RIGHT — single layer; cache wiped before commit
RUN apt-get update \
 && apt-get install --no-install-recommends -y \
      curl=8.10.1-* \
      ca-certificates=20241121 \
 && rm -rf /var/lib/apt/lists/* \
 && apt-get clean

# Alpine — apk add --no-cache implies cleanup
RUN apk add --no-cache curl=8.10.1-r0 ca-certificates=20241121-r0

# RHEL / UBI — dnf clean
RUN dnf install -y --setopt=install_weak_deps=False \
      curl-8.10.1 ca-certificates-2024.12 \
 && dnf clean all
```

Pin every installed package version. `apt-get install curl`
without a version lets a CVE-fixing upstream rebuild silently
change behaviour between two builds of the same Dockerfile.

### 6. `WORKDIR` is explicit

Never `RUN cd /app && ...` — `cd` doesn't persist across `RUN`
instructions. Use `WORKDIR`:

```dockerfile
# WRONG
RUN cd /app && npm install

# RIGHT
WORKDIR /app
RUN pnpm install --frozen-lockfile
```

`WORKDIR` creates the directory if it doesn't exist and applies
to every subsequent `RUN`, `CMD`, `COPY`, `ADD`, `ENTRYPOINT`.

### 7. Exec form for `CMD` and `ENTRYPOINT`

The shell form (`CMD node server.js`) wraps the command in `/bin/
sh -c`, which means signals (SIGTERM, SIGINT) hit the shell, not
the application — graceful shutdown breaks. Use the exec form:

```dockerfile
# WRONG — shell form; SIGTERM doesn't reach node
CMD node server.js

# RIGHT — exec form; signals delivered directly
CMD ["node", "dist/server.js"]

# RIGHT — with ENTRYPOINT for wrapper scripts
COPY --chown=app:app docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
```

The shell form is acceptable only when shell expansion is
genuinely needed (env-var interpolation in the command line) —
and even then `dumb-init` or `tini` is preferred as `ENTRYPOINT`
to forward signals properly.

### 8. Layer ordering: cache invalidation is intentional

Layers are cached by their inputs. Order from least-frequent
change to most-frequent change so a code change doesn't bust the
dependency-install cache:

```dockerfile
# WRONG — every code change reinstalls every dependency
COPY . .
RUN pnpm install --frozen-lockfile

# RIGHT — manifest copy first; cache reused across code-only changes
COPY --link package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --link . .
RUN pnpm build
```

Layer ordering also matters for security scanning. Place the
base image upgrade (`apt-get update && apt-get upgrade -y` on
Debian; or use a Wolfi / Chainguard auto-rebuilding base) at the
top so CVE fixes propagate immediately.

### 9. `EXPOSE` is documentary, not functional

`EXPOSE 3000` does NOT publish a port — it documents the
intended port for orchestrators (Compose, Kubernetes) and for
humans reading the file. Always declare it for every port the
application listens on:

```dockerfile
EXPOSE 3000/tcp
EXPOSE 8080/tcp
EXPOSE 9090/tcp   # metrics
```

The actual port-publishing happens at `docker run -p` / `compose
ports:` / Kubernetes `Service` (per [`common/docker-localhost-
binding.md`](../common/docker-localhost-binding.md)).

### 10. `HEALTHCHECK` is mandatory for long-running services

Without `HEALTHCHECK`, orchestrators rely on TCP-port-open
checks which lie when the application has crashed but the
listener hasn't been reaped. Define application-level health:

```dockerfile
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=15s \
            --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/healthz || exit 1
```

`--start-period` (Docker 17.05+) gives the application time to
warm up before failures count. For Lambda / serverless /
short-lived containers, `HEALTHCHECK` is omitted.

### 11. Labels follow OCI conventions

Per the **OCI Image Specification 1.1.1** `org.opencontainers.
image.*` namespace:

```dockerfile
LABEL org.opencontainers.image.title="orders-api" \
      org.opencontainers.image.description="Customer order management API" \
      org.opencontainers.image.version="1.4.2" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.source="https://github.com/example/orders-api" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.vendor="Example Corp" \
      org.opencontainers.image.created="${BUILD_DATE}"
```

These labels surface in `docker inspect`, image-registry UIs,
SBOM tooling, and CVE scanners. The `${GIT_SHA}` and
`${BUILD_DATE}` come from CI build args:

```dockerfile
ARG GIT_SHA
ARG BUILD_DATE
```

### 12. `.dockerignore` is mandatory

Every Dockerfile has a sibling `.dockerignore` excluding the
build-context entries that should never enter the image:

```gitignore
.git
.github
.vscode
.idea
.env
.env.*
node_modules
__pycache__
*.pyc
.pytest_cache
.mypy_cache
.ruff_cache
target/
build/
dist/
coverage/
*.log
.DS_Store
README.md  # unless docs ship in the image
LICENSE
*.md
docs/
tests/
spec/
__tests__/
.dockerignore
Dockerfile*
docker-compose*
```

The `.dockerignore` reduces the build context, speeds up
`docker build`, prevents accidental secret inclusion (`.env`,
`.aws/credentials`), and keeps the final image lean.

### 13. Line length and formatting

- Line length ≤ 120 characters (consistent with the project's
  markdown / source-code caps)
- Continuations use `\` at end of line; align flags vertically
  for readability
- One concept per `RUN` instruction; chain related concepts in
  one layer
- Comments above each `RUN` block explaining intent (only when
  non-obvious — per [`common/coding-style.md`](../common/coding-style.md))

```dockerfile
# Install build tools (removed in the final stage)
RUN apt-get update \
 && apt-get install --no-install-recommends -y \
      build-essential=12.10ubuntu1 \
      ca-certificates=20241121 \
      curl=8.10.1-1ubuntu1 \
 && rm -rf /var/lib/apt/lists/*
```

### 14. ENV vs ARG

| Directive | Persists in image? | Use for |
| --- | --- | --- |
| `ARG` | No (build-time only) | Build-time config (Git SHA, build date, optional features). Visible in `docker history`. |
| `ENV` | Yes (runtime) | Default runtime values; can be overridden at `docker run -e` or in `compose`. |

```dockerfile
# Build-time
ARG NODE_ENV=production
ARG GIT_SHA

# Runtime
ENV NODE_ENV=$NODE_ENV \
    PORT=3000 \
    LOG_LEVEL=info \
    TZ=UTC
```

NEVER use `ARG` for secrets — they appear in `docker history`.
Use BuildKit secrets (`--mount=type=secret`) instead.

### 15. Reproducibility

A Dockerfile built today and again next week from the same
inputs should produce byte-identical images:

- Pin every base image (rule 2)
- Pin every package version (rule 5)
- Pin Git submodule SHAs in COPY contexts
- Pin Node / Python / Ruby / Go / Rust versions via `.nvmrc` /
  `.python-version` / `.ruby-version` / `go.mod` / `rust-
  toolchain.toml`
- Avoid `RUN date >> /etc/build-date` (non-deterministic
  timestamp) — use the build-arg pattern

Reproducible builds are the bedrock of SLSA Level 3 attestation
and Sigstore signing workflows.

## Hadolint rule mapping

[Hadolint](https://github.com/hadolint/hadolint) is the canonical
Dockerfile linter. Project-wide, every rule defaults to error;
the rules below recur in real codebases and the table names them
with the fix recipe.

| Hadolint | Pattern | Fix |
| --- | --- | --- |
| **DL3000** | Use absolute WORKDIR | `WORKDIR /app`, not `WORKDIR app` |
| **DL3001** | `wget`, `curl`, `ssh`, `vim`, etc. in image | Drop the binary; install via package manager with pinned version |
| **DL3002** | Last USER is root | Add `USER app` before final `CMD` |
| **DL3003** | `cd` instead of WORKDIR | Use `WORKDIR` |
| **DL3004** | `sudo` in RUN | Build runs as root by default; drop `sudo` |
| **DL3006** | Tag missing in FROM | Pin tag plus digest |
| **DL3007** | `latest` tag | Pin a specific version |
| **DL3008** | apt-get package without version | Pin version |
| **DL3009** | apt-get cache not cleaned | Add `rm -rf /var/lib/apt/lists/*` |
| **DL3013** | pip without version pin | Pin via `requirements.txt` |
| **DL3015** | `apt-get install` without `--no-install-recommends` | Add the flag |
| **DL3018** | apk add without version | Pin version |
| **DL3020** | Use COPY, not ADD | Replace ADD with COPY (rule 4) |
| **DL3025** | JSON form CMD missing | Use exec form `["cmd", "arg"]` |
| **DL3027** | `apt` (vs `apt-get`) | `apt` is for humans; use `apt-get` in scripts |
| **DL3028** | gem without version | Pin version |
| **DL3045** | COPY without `--chown` | Add `--chown=app:app` |
| **DL3047** | `wget` without `--progress=dot` in CI | Add the flag |
| **DL3059** | Multiple RUN consecutive | Chain with `&&` |

## Standards cited

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [OCI Image Specification 1.1.1](https://github.com/opencontainers/image-spec/blob/main/spec.md) (Sept 2024)
- [BuildKit 1.20+ syntax](https://docs.docker.com/build/buildkit/)
- [CIS Docker Benchmark v1.7](https://www.cisecurity.org/benchmark/docker/)
- [NIST SP 800-190](https://csrc.nist.gov/publications/detail/sp/800-190/final) — Application Container Security Guide
- [SLSA Framework v1.0](https://slsa.dev/) — Reproducible builds
- [Hadolint rule list](https://github.com/hadolint/hadolint/wiki)

## Cross-references

- [`common/docker-localhost-binding.md`](../common/docker-localhost-binding.md) — port binding to loopback
- [`common/dependency-pinning.md`](../common/dependency-pinning.md) — tag + digest pinning
- [`common/secrets-management.md`](../common/secrets-management.md) — BuildKit secrets
- [`common/coding-style.md`](../common/coding-style.md) — universal style baseline
- [`common/extreme-lint-policy.md`](../common/extreme-lint-policy.md) — strict-by-default thresholds
- [`dockerfile/security.md`](./security.md) — supply chain, capabilities, secrets
- [`dockerfile/patterns.md`](./patterns.md) — multi-stage, distroless, build cache
- [`dockerfile/hooks.md`](./hooks.md) — pre-commit, CI, registry workflow
- [`dockerfile/testing.md`](./testing.md) — container-structure tests, smoke, integration

## Why this rule exists

A loose Dockerfile is a perpetual production hazard. Real-world
incidents traced to coding-style violations include:

- 4 GB images caused by including build SDKs in runtime (rule 1)
- 12-hour outages when `node:latest` retargeted to a new major (rule 2)
- CVE-2019-5736 container escape because containers ran as root (rule 3)
- Supply-chain compromise of an `ADD https://...` installer (rule 4)
- 50 MB apt cache shipped to every replica × 1000 replicas (rule 5)
- Graceful-shutdown bugs when SIGTERM died at `/bin/sh -c` (rule 7)
- Image-build times balloon from 30s to 12min when manifest-copy
  ordering broke the dependency-install cache (rule 8)

The cost of adopting this style is one Dockerfile template plus
a pre-commit Hadolint step. The cost of NOT adopting is each of
the above, on repeat.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

**Signals to watch**:

- New Dockerfile shipped without `# syntax=` directive (BuildKit features unavailable — rule "Mandatory header" weakening)
- Base image floats on a tag without digest (rule 2 violation — supply-chain vector reopens)
- Runtime stage missing `USER` directive (rule 3 violation — root container shipped)
- `ADD` used where `COPY` would suffice (rule 4 weakening)
- Package install without `--no-install-recommends` or version pin (rule 5 weakening)
- Shell form `CMD` shipped on a long-running service (rule 7 weakening — signal handling broken)
- `.dockerignore` absent or stale (rule 12 weakening — secrets leak into context)
- OCI labels missing from production images (rule 11 weakening — SBOM tooling blind)
- Hadolint rule disabled per-file rather than fixed (sister `extreme-lint-policy.md` violation)

**Refinement candidates**:

- New Hadolint rule row when a recurring image-build defect emerges
- Tightening of the base-image policy when distroless / Wolfi / Chainguard becomes the team standard
- New per-stack section when a new runtime (Bun, Deno, Mojo) gains adoption
- Promotion of a project-specific override (e.g. UBI base for healthcare workloads) to a documented exception

---

<!-- ============================================================
     Section: dockerfile/hooks.md
     ============================================================ -->

# Dockerfile + Container Hooks

> Auto-fires on every `Dockerfile`, `Dockerfile.*`, `*.dockerfile`,
> `docker-compose*.yml`, `compose*.yml`, `.dockerignore`,
> `containerfile`, `Containerfile`, and any path under `docker/`,
> `containers/`, `oci/`, `images/`. Sister to
> `~/.claude/rules-library/common/hooks.md`, `~/.claude/rules-library/dockerfile/
> coding-style.md`, `~/.claude/rules-library/dockerfile/security.md`,
> `~/.claude/rules-library/dockerfile/testing.md`. Standards: **Docker
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

- `~/.claude/rules-library/common/hooks.md` — universal hook framework
- `~/.claude/rules-library/dockerfile/coding-style.md` — what the hooks enforce
- `~/.claude/rules-library/dockerfile/security.md` — Cosign + Trivy + SBOM
- `~/.claude/rules-library/dockerfile/testing.md` — structure-test + Goss
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — CVE gate
- `~/.claude/rules-library/common/security-controls-org-wide.md` — 5-layer
- `~/.claude/rules-library/common/github-actions-gotchas.md` — Actions caveats
- `~/.claude/rules-library/common/deploy-failures-become-checks.md` — gate pattern

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

---

<!-- ============================================================
     Section: dockerfile/patterns.md
     ============================================================ -->

# Dockerfile Patterns

> Auto-fires on every `Dockerfile`, `Dockerfile.*`, `*.dockerfile`,
> `Containerfile`. Standards: **OCI Image Specification 1.1.1**,
> **BuildKit Frontend 1.20+**, **Distroless Containers (Google)**,
> **Wolfi OS** (Chainguard), **Twelve-Factor App** (Heroku).

## Core Principle

**Multi-stage by default; distroless or minimal-base (Alpine /
Wolfi / Chainguard) for runtime; build-time caching via BuildKit
`--mount=type=cache`; secrets via `--mount=type=secret`;
reproducible builds via pinned bases and lockfiles; one process
per container; the image is immutable infrastructure — every
config change rebuilds, never patches at runtime.**

A Dockerfile is the build plan; the patterns below are the
architectural primitives that compose into production-grade
images. Apply them by default; reach for alternatives only when
a documented constraint requires.

## Pattern 1: Multi-stage build with minimal runtime

The canonical Node.js application:

```dockerfile
# syntax=docker/dockerfile:1.20.2

# ----- Stage 1: dependencies (cacheable) -----
FROM node:22.4.0-alpine3.21@sha256:<digest> AS deps
WORKDIR /build
COPY --link package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    corepack enable && pnpm install --frozen-lockfile

# ----- Stage 2: build (compiles, transpiles) -----
FROM node:22.4.0-alpine3.21@sha256:<digest> AS build
WORKDIR /build
COPY --link --from=deps /build/node_modules ./node_modules
COPY --link package.json pnpm-lock.yaml ./
COPY --link . .
RUN --mount=type=cache,id=tsc,target=/build/.tsbuildcache \
    pnpm build

# ----- Stage 3: prod-deps (production-only deps) -----
FROM node:22.4.0-alpine3.21@sha256:<digest> AS prod-deps
WORKDIR /build
COPY --link package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    corepack enable && pnpm install --frozen-lockfile --prod

# ----- Stage 4: runtime (slimmest possible) -----
FROM gcr.io/distroless/nodejs22-debian12:nonroot@sha256:<digest> AS runtime
WORKDIR /app
COPY --from=build --chown=nonroot:nonroot /build/dist ./dist
COPY --from=prod-deps --chown=nonroot:nonroot /build/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /build/package.json ./
USER nonroot
EXPOSE 3000
CMD ["dist/server.js"]
```

Four stages, four caches, four independent rebuild triggers:

- Code-only change → `deps` + `prod-deps` cached; only `build` +
  `runtime` rebuild
- Dependency change → all stages rebuild but base image cached
- Base image bump → all stages rebuild from registry

## Pattern 2: Distroless / minimal-base runtime

Three credible options for the final stage:

| Base | Size | Shell | Package manager | When |
| --- | --- | --- | --- | --- |
| **distroless/nodejs:nonroot** | ~150 MB | None | None | Maximum hardening; no debug shell |
| **Wolfi / cgr.dev/chainguard/node** | ~80 MB | apk | apk | Chainguard FIPS / SBOM-first |
| **alpine:3.21** | ~7 MB base + runtime | sh, busybox | apk | Smallest; musl libc |
| **scratch** | 0 MB | None | None | Static binaries (Go, Rust) only |

Distroless removes the shell. That breaks `docker exec -it <ctr>
sh` for debugging but eliminates an entire class of attacks (RCE
through shell-injection, capability escalation through `sudo`).
For production, distroless wins; for development, Alpine or
debian-slim is acceptable.

## Pattern 3: BuildKit cache mounts

`--mount=type=cache` persists a directory across builds without
embedding it in the image:

```dockerfile
# pnpm store
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Go module cache
RUN --mount=type=cache,id=gomod,target=/go/pkg/mod \
    --mount=type=cache,id=gobuild,target=/root/.cache/go-build \
    go build -o /out/server ./cmd/server

# Cargo registry + target
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=cargo-target,target=/build/target \
    cargo build --release

# pip cache
RUN --mount=type=cache,id=pip,target=/root/.cache/pip \
    pip install --no-deps --requirement requirements.txt

# apt cache (rare — usually faster to bust)
RUN --mount=type=cache,id=apt,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install --no-install-recommends -y curl=8.10.1-1
```

The `id=` field shares the cache across CI runners (when the
runner exports it). The cache is NOT part of the image — it's a
build-time speedup.

## Pattern 4: BuildKit secret mounts

Secrets never enter the image. Use BuildKit secret mounts:

```dockerfile
# Stage builds with secret available only at this RUN
RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
    --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
```

Build invocation:

```bash
docker build \
  --secret id=npm_token,src=$HOME/.npmrc \
  --tag myapp:1.4.2 \
  .
```

The secret is mounted as a file at `target=` for the duration of
the `RUN`, then unmounted. It is NOT included in any layer, NOT
visible in `docker history`, NOT extractable from the final
image. Per [`common/secrets-management.md`](../common/secrets-management.md).

For CI: `--secret id=stripe_api_key,env=STRIPE_API_KEY` reads from
the runner's environment without writing the value to disk.

## Pattern 5: SBOM and provenance attestation

BuildKit 1.20+ produces SBOMs (Software Bill of Materials) and
SLSA provenance attestations automatically:

```bash
docker buildx build \
  --sbom=true \
  --provenance=mode=max \
  --tag registry.example.com/myapp:1.4.2 \
  --push \
  .
```

The SBOM ships alongside the image (OCI referrer pattern); CVE
scanners (Trivy, Grype, Snyk, Docker Scout) read it directly
without re-scanning. SLSA Level 3 attestation requires:

- Reproducible builds (rule 15 in [`coding-style.md`](./coding-style.md))
- Provenance attestation (mode=max)
- Builder isolation (GitHub Actions, dedicated runners)

## Pattern 6: Heredoc for multi-line shell scripts

BuildKit 1.5+ supports heredoc syntax in `RUN`:

```dockerfile
RUN <<EOF
set -euo pipefail

apt-get update
apt-get install --no-install-recommends -y \
  curl=8.10.1-1ubuntu1 \
  ca-certificates=20241121

# Cleanup
rm -rf /var/lib/apt/lists/*
apt-get clean
EOF

# COPY with heredoc — generate a file inline
COPY <<EOF /app/healthz.sh
#!/bin/sh
set -e
wget --quiet --tries=1 --spider http://localhost:3000/healthz
EOF
```

Heredoc avoids the `&& \` chaining noise and makes shell scripts
in Dockerfiles readable.

## Pattern 7: Build-time vs runtime configuration

```dockerfile
# Build-time: pinned versions, build identifiers
ARG NODE_ENV=production
ARG GIT_SHA
ARG BUILD_DATE
ARG VERSION

# Runtime: defaults overridable at `docker run -e`
ENV NODE_ENV=$NODE_ENV \
    PORT=3000 \
    LOG_LEVEL=info \
    LOG_FORMAT=json \
    TZ=UTC \
    METRICS_PORT=9090

LABEL org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.version="${VERSION}"
```

The application reads from `process.env`; the container
orchestrator (Compose, Kubernetes) overrides any value at deploy
time without rebuilding.

## Pattern 8: One process per container

The container's `CMD` runs ONE process. Multi-process containers
(application + cron + nginx) defeat orchestrator restart logic,
hide failure modes, and break log routing.

```dockerfile
# WRONG — supervisord runs nginx + node together
RUN apt-get install -y nginx supervisor
COPY supervisord.conf /etc/supervisor/conf.d/
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# RIGHT — separate images, separate concerns
# myapp-api:    serves the application
# myapp-proxy:  separate nginx image, separate Pod / Service
# myapp-cron:   separate Pod with its own schedule
```

The single-process rule has narrow exceptions: PID-1 supervisors
(`tini`, `dumb-init`) for signal forwarding, and sidecar
patterns where the orchestrator (Kubernetes) manages the
pairing.

## Pattern 9: PID-1 signal forwarding

Node.js, Python, Ruby do not behave correctly as PID 1 — they
don't reap zombie processes, don't forward SIGTERM/SIGINT, and
ignore certain signals. Wrap with `tini` or `dumb-init`:

```dockerfile
# Alpine
RUN apk add --no-cache tini=0.19.0-r3
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]

# Debian
RUN apt-get update \
 && apt-get install --no-install-recommends -y dumb-init=1.2.5-2 \
 && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

For Go / Rust / C++ binaries built statically, this is
unnecessary — the binary forwards signals correctly by default.

## Pattern 10: Static binary + scratch image

Go + Rust + C++ produce static binaries that need no OS runtime:

```dockerfile
# syntax=docker/dockerfile:1.20.2

# Build stage
FROM golang:1.24.0-alpine3.21@sha256:<digest> AS build
WORKDIR /build
COPY --link go.mod go.sum ./
RUN --mount=type=cache,id=gomod,target=/go/pkg/mod \
    go mod download
COPY --link . .
RUN --mount=type=cache,id=gomod,target=/go/pkg/mod \
    --mount=type=cache,id=gobuild,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags='-s -w' -o /out/server ./cmd/server

# Runtime: scratch (0 MB OS)
FROM scratch
COPY --from=build /out/server /server
# Copy CA bundle for HTTPS; otherwise scratch has no certs
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/server"]
```

Final image: ~10 MB (the binary). Attack surface: the binary.

## Pattern 11: Multi-platform builds (amd64 + arm64)

Apple Silicon, Graviton, Ampere — arm64 is mainstream:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/myapp:1.4.2 \
  --push \
  .
```

The Dockerfile itself usually needs no changes — base images
support both platforms via manifest lists. Cross-compilation
matters when the build stage compiles native code:

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.24-alpine AS build
ARG TARGETOS TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build ...
```

## Pattern 12: Composable bases via stages-as-libraries

A monorepo can share a base stage across services:

```dockerfile
# Dockerfile.base
FROM node:22.4.0-alpine3.21@sha256:<digest> AS base
RUN addgroup -S app && adduser -S app -G app
RUN apk add --no-cache tini=0.19.0-r3
ENTRYPOINT ["/sbin/tini", "--"]

# services/api/Dockerfile
FROM myorg/base:1.0.0 AS runtime
WORKDIR /app
COPY --chown=app:app . .
USER app
CMD ["node", "server.js"]
```

The base image is built once and versioned; every service
inherits the same hardening (non-root user, signal forwarding,
default labels).

## Pattern 13: Health endpoints reflect dependencies

The `HEALTHCHECK` script should verify the application can
serve traffic — including downstream dependency checks:

```javascript
// healthz handler in the app
app.get('/healthz', async (req, res) => {
  const checks = await Promise.all([
    db.query('SELECT 1').then(() => 'ok').catch(() => 'fail'),
    redis.ping().then(() => 'ok').catch(() => 'fail'),
  ]);
  const healthy = checks.every(c => c === 'ok');
  res.status(healthy ? 200 : 503).json({ db: checks[0], redis: checks[1] });
});
```

For shallow vs deep health checks: `/readyz` (deep, includes
deps) vs `/livez` (shallow, process alive). Kubernetes
`livenessProbe` uses `/livez` (don't restart on transient dep
failure); `readinessProbe` uses `/readyz` (route traffic only
when deps are reachable).

## Pattern 14: Init container / migration pattern

Database migrations run in a separate stage / image / Job, NOT
on every container start:

```dockerfile
# services/migrations/Dockerfile
FROM node:22.4.0-alpine3.21@sha256:<digest> AS migrations
WORKDIR /migrate
COPY --link package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY --link prisma ./prisma
USER node
ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]
```

Kubernetes runs this as a `Job` before rolling out the
application Deployment. The application container never embeds
migration logic at runtime.

## Anti-patterns

### Anti-pattern 1: Single-stage build with full SDK in production

The Dockerfile is one stage. The runtime image ships GCC, Maven,
node-gyp, build-essential, and Python headers. Final image: 2 GB.
Attack surface: every dev tool. Fix: pattern 1 (multi-stage).

### Anti-pattern 2: `latest` tag

`FROM node:latest` retargets every rebuild. A working image
today may fail tomorrow when `latest` points at a new major.
Fix: pin tag + digest (rule 2 in [`coding-style.md`](./coding-style.md)).

### Anti-pattern 3: Embedding secrets in ENV

```dockerfile
# WRONG — Stripe key in the image; visible in `docker inspect`
ENV STRIPE_SECRET_KEY=sk_live_...
```

Secrets reach the container via:

- Kubernetes Secret → env var or mounted volume
- Docker run `--env-file` (file outside the image)
- BuildKit `--mount=type=secret` (build-time only)

### Anti-pattern 4: `chmod -R 777`

```dockerfile
# WRONG — every file world-writable
RUN chmod -R 777 /app
```

The non-root user owns the files it needs to read (set via
`COPY --chown=app:app`); no permissions change required.

### Anti-pattern 5: Mounting host paths in production

```yaml
# WRONG in compose / Kubernetes — host filesystem leaked into container
volumes:
  - /var/lib/myapp:/data
```

Production data goes to persistent volume claims (PVC) backed
by managed storage (EBS, Persistent Disk, Azure Disk). The host
filesystem is for development only.

### Anti-pattern 6: `ENV PATH=/app/bin:$PATH` without rationale

`ENV PATH` modifications hide where binaries come from. If a
binary needs to be on PATH, install it via the package manager
(which puts it in `/usr/local/bin`) or document the PATH change
with a comment.

### Anti-pattern 7: `RUN curl ... | sh`

```dockerfile
# WRONG — fetch + execute untrusted script with no checksum
RUN curl -fsSL https://example.com/install.sh | sh
```

Fetch, verify checksum, then execute (rule 4 in [`coding-style.md`](./coding-style.md)).
Better: install via the package manager with a pinned version.

## Reuse-first

Per [`common/reuse-first.md`](../common/reuse-first.md):

- **Docker Official Images** (`node`, `python`, `golang`,
  `postgres`, `redis`) — maintained by upstream + Docker
- **Distroless** (gcr.io/distroless/*) — Google-maintained
- **Chainguard / Wolfi images** (cgr.dev/chainguard/*) —
  FIPS-compliant, daily-rebuilt
- **Red Hat UBI** (registry.access.redhat.com/ubi9/*) —
  enterprise support, FIPS
- **Bitnami** (bitnami/*) — application bundles

Don't roll a custom base image without a documented reason.

## Standards cited

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [OCI Image Specification 1.1.1](https://github.com/opencontainers/image-spec/blob/main/spec.md)
- [BuildKit Frontend syntax](https://docs.docker.com/build/buildkit/)
- [SLSA Framework v1.0](https://slsa.dev/)
- [Sigstore](https://www.sigstore.dev/) — image signing
- [Twelve-Factor App](https://12factor.net/) — config and processes
- [Distroless](https://github.com/GoogleContainerTools/distroless) — Google
- [Wolfi](https://github.com/wolfi-dev) — Chainguard linux distro

## Cross-references

- [`dockerfile/coding-style.md`](./coding-style.md) — style and layout
- [`dockerfile/security.md`](./security.md) — supply chain, CVE scan, capabilities
- [`dockerfile/hooks.md`](./hooks.md) — pre-commit, CI, registry workflow
- [`dockerfile/testing.md`](./testing.md) — container-structure tests, smoke
- [`common/docker-localhost-binding.md`](../common/docker-localhost-binding.md) — loopback binding
- [`common/dependency-pinning.md`](../common/dependency-pinning.md) — tag + digest discipline
- [`common/secrets-management.md`](../common/secrets-management.md) — BuildKit secrets

## Why this rule exists

The pattern catalogue distinguishes "container that runs in
production for years without incident" from "container that
caused last quarter's outage". Real-world incidents traced to
missing patterns:

- 4 GB images forced 8-minute pod startup (pattern 1)
- Container-escape CVE exploitable because the runtime had bash
  (pattern 2 — distroless would have prevented)
- 50% build-time regression after CI cache was wiped (pattern 3)
- Stripe key in `docker history` from `ENV STRIPE_KEY` (pattern
  4 — BuildKit secrets prevent)
- "Worked on my laptop" deploys broke under arm64 nodes (pattern
  11 — multi-platform build)
- SIGTERM didn't reach the Node process; Kubernetes force-killed
  pods after 30s grace (pattern 9 — PID-1 signal forwarding)

The cost of patterns is one Dockerfile template per language;
the cost of skipping them is each incident replayed across every
new project.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

**Signals to watch**:

- Single-stage Dockerfile shipped to production (pattern 1 weakening)
- Alpine + glibc compatibility issues recurring (pattern 2 — should consider Wolfi or Debian-slim)
- BuildKit cache mount missing on package-manager `RUN` (pattern 3 weakening)
- Secrets shipped in `ENV` rather than via `--mount=type=secret` (anti-pattern 3 — sister `secrets-management.md` violation)
- SBOM and provenance not produced on production builds (pattern 5 weakening — SLSA Level 3 gap)
- PID 1 signal forwarding absent on a Node / Python / Ruby image (pattern 9 weakening)
- Multi-platform build skipped when arm64 deployment exists (pattern 11 weakening)

**Refinement candidates**:

- New base-image row when an emerging distro (Wolfi 2.x, Bottlerocket, Talos) becomes the team standard
- New pattern entry when a recurring composition emerges (e.g. eBPF-based observability sidecar, supply-chain attestation chain)
- Tightening of the SBOM requirement when SLSA Level 3 becomes the baseline
- New cross-reference when a sister rule (k8s-patterns, helm-patterns, IaC) defines a complementary deployment surface

---

<!-- ============================================================
     Section: dockerfile/security.md
     ============================================================ -->

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

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

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

---

<!-- ============================================================
     Section: dockerfile/testing.md
     ============================================================ -->

# Dockerfile Testing

> Auto-fires on every `Dockerfile`, `Dockerfile.*`, `*.dockerfile`,
> `Containerfile`. Standards: **container-structure-test** (Google),
> **Goss** (image-level assertions), **Trivy / Grype** (CVE),
> **Dive** (layer analysis), **Dockle** (CIS / hadolint composite),
> **Testcontainers** (integration), **CIS Docker Benchmark v1.7**.

## Core Principle

**Container images are tested at three layers: image structure
(files, packages, permissions, labels, user, entrypoint), runtime
behaviour (smoke tests against the running container), and
integration (the container exercised against its real
dependencies). Every layer runs in CI before the image is signed
or promoted. The cost of an image-time test is seconds; the cost
of discovering a missing file or wrong user at deploy time is
hours.**

A Dockerfile that builds isn't a Dockerfile that works. Every
production image MUST pass every layer below.

## Layer 1: Image structure tests

Image-structure tests verify the static properties of the built
image: files present, packages installed, ports exposed,
labels set, user correct, entrypoint matches.

### container-structure-test (Google)

```yaml
# container-structure-test.yaml
schemaVersion: 2.0.0

commandTests:
  - name: "non-root user"
    command: "whoami"
    expectedOutput: ["app"]

  - name: "Node.js version"
    command: "node"
    args: ["--version"]
    expectedOutput: ["^v22\\.4\\.0$"]

  - name: "no shell in distroless runtime"
    command: "test"
    args: ["-x", "/bin/sh"]
    exitCode: 1

fileExistenceTests:
  - name: "application binary present"
    path: "/app/dist/server.js"
    shouldExist: true

  - name: "no .env file in image"
    path: "/app/.env"
    shouldExist: false

  - name: "no SSH keys"
    path: "/root/.ssh"
    shouldExist: false

fileContentTests:
  - name: "package.json declares production"
    path: "/app/package.json"
    expectedContents: ['"production"']

metadataTest:
  envVars:
    - key: "NODE_ENV"
      value: "production"
  exposedPorts: ["3000"]
  cmd: ["node", "dist/server.js"]
  workdir: "/app"
  user: "app"
  labels:
    - key: "org.opencontainers.image.title"
      value: "orders-api"
    - key: "org.opencontainers.image.licenses"
      value: "Apache-2.0"
```

Run with:

```bash
container-structure-test test \
  --image registry.example.com/myapp:1.4.2 \
  --config container-structure-test.yaml
```

### Goss

Alternative with health-check semantics built in:

```yaml
# goss.yaml
package:
  ca-certificates:
    installed: true
    versions:
      - "20241121"

user:
  app:
    exists: true
    uid: 1001
    gid: 1001
    groups:
      - app
    home: /home/app
    shell: /usr/sbin/nologin

port:
  tcp:3000:
    listening: true
    ip:
      - 0.0.0.0

http:
  http://localhost:3000/healthz:
    status: 200
    body:
      - "ok"
    timeout: 5000
```

Run inside the container:

```bash
docker run --rm --entrypoint /usr/local/bin/goss <image> validate
```

## Layer 2: Smoke tests

Start the container; verify it serves traffic; tear it down:

```bash
#!/usr/bin/env bash
# scripts/smoke-test.sh
set -euo pipefail

IMAGE="${1:-myapp:test}"
CONTAINER_ID=$(docker run -d --rm -p 127.0.0.1:3000:3000 "$IMAGE")
trap "docker stop $CONTAINER_ID" EXIT

# Wait for healthcheck
for i in $(seq 1 30); do
    if curl --silent --fail http://127.0.0.1:3000/healthz; then
        echo "Container healthy after ${i}s"
        break
    fi
    sleep 1
done

# Exercise the API
response=$(curl --silent --fail -X POST http://127.0.0.1:3000/api/echo \
    -H 'Content-Type: application/json' \
    -d '{"hello":"world"}')
echo "$response" | jq -e '.hello == "world"'

# Verify graceful shutdown
docker stop "$CONTAINER_ID"
```

## Layer 3: Integration tests via Testcontainers

The application's existing integration test suite runs against
the same image that ships to production:

```typescript
// integration.test.ts
import { GenericContainer, Wait } from 'testcontainers';

describe('orders-api integration', () => {
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await new GenericContainer('myapp:test')
      .withEnvironment({ NODE_ENV: 'test' })
      .withExposedPorts(3000)
      .withWaitStrategy(Wait.forHttp('/healthz', 3000).withStartupTimeout(30_000))
      .start();
  });

  afterAll(async () => {
    await container.stop();
  });

  it('places an order end-to-end', async () => {
    const baseUrl = `http://${container.getHost()}:${container.getMappedPort(3000)}`;
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ sku: 'X', quantity: 1 }] }),
    });
    expect(response.status).toBe(201);
  });
});
```

Testcontainers is multi-language: Java, Go, Python, .NET, Rust,
Ruby, Node.js. The same image is exercised in CI and in
production — no "works in dev, fails in prod" cliff.

## Layer 4: Vulnerability + supply-chain scanning

Per [`dockerfile/security.md`](./security.md) rule 4:

```bash
# CVE scan
trivy image --severity CRITICAL,HIGH,MEDIUM \
            --exit-code 1 \
            --ignore-unfixed false \
            registry.example.com/myapp:1.4.2

# Best-practice scan (composite of hadolint, CIS Docker, etc.)
dockle --exit-code 1 \
       --exit-level WARN \
       registry.example.com/myapp:1.4.2

# Layer waste analysis (catches accidentally shipped node_modules,
# build SDKs, etc.)
dive registry.example.com/myapp:1.4.2 \
     --ci \
     --highestUserWastedPercent 0.10  # max 10% wasted space

# Signature verification
cosign verify \
  --certificate-identity-regexp '^https://github.com/example/myapp/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  registry.example.com/myapp:1.4.2
```

## Layer 5: Compliance scans

For regulated workloads:

```bash
# CIS Docker Benchmark compliance (runtime + image)
docker-bench-security

# Pod Security Standards (Kubernetes)
kubectl auditor scan --image registry.example.com/myapp:1.4.2

# FIPS 140-2 / 140-3 compliance (Chainguard / UBI)
cosign attest --predicate fips-attestation.json \
              --type slsaprovenance \
              registry.example.com/myapp:1.4.2
```

## CI gate composition

```yaml
# .github/workflows/docker-build.yml
name: Docker build + test

on:
  pull_request:
    paths:
      - 'Dockerfile*'
      - 'src/**'

jobs:
  build-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # for Sigstore keyless signing
      packages: write   # for ghcr push
    steps:
      - uses: actions/checkout@<sha>

      - name: Lint Dockerfile
        uses: hadolint/hadolint-action@<sha>
        with:
          dockerfile: Dockerfile
          failure-threshold: error
          no-fail: false

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@<sha>

      - name: Build (multi-platform, with SBOM + provenance)
        uses: docker/build-push-action@<sha>
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          tags: myapp:test
          load: true
          provenance: mode=max
          sbom: true
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Image-structure test
        run: |
          curl -fsSL -o /tmp/cst https://storage.googleapis.com/container-structure-test/latest/container-structure-test-linux-amd64
          chmod +x /tmp/cst
          /tmp/cst test --image myapp:test --config container-structure-test.yaml

      - name: CVE scan (Trivy)
        uses: aquasecurity/trivy-action@<sha>
        with:
          image-ref: myapp:test
          severity: CRITICAL,HIGH,MEDIUM
          exit-code: 1
          format: sarif
          output: trivy.sarif

      - name: Layer waste analysis (Dive)
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            wagoodman/dive:latest \
            --ci \
            --highestUserWastedPercent 0.10 \
            myapp:test

      - name: Best-practice scan (Dockle)
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            goodwithtech/dockle:latest \
            --exit-code 1 \
            --exit-level WARN \
            myapp:test

      - name: Smoke test
        run: ./scripts/smoke-test.sh myapp:test

      - name: Integration tests
        run: pnpm test:integration

      - name: Upload Trivy results
        if: always()
        uses: github/codeql-action/upload-sarif@<sha>
        with:
          sarif_file: trivy.sarif
```

## Hard rules

### 1. Every Dockerfile has a sibling `container-structure-test.yaml`

The contract: the image MUST have a non-root user, MUST run with
a specific entrypoint, MUST expose specific ports, MUST not
include known-bad files. The test enforces.

### 2. Smoke test exercises the application's golden path

A health-check that returns 200 isn't enough. The smoke test
POSTs a payload, gets a response, asserts on the shape — the
application is actually serving traffic.

### 3. Integration tests use the same image as production

NEVER `Dockerfile.test` that diverges from `Dockerfile`. If
test-only deps are needed, add a `test` build stage in the same
Dockerfile.

### 4. CVE scan blocks the merge

MODERATE+ findings block the PR. Per [`common/dependency-vulnerabilities.md`](../common/dependency-vulnerabilities.md).

### 5. Dive's "wasted space" must be < 10%

Wasted space is files added in one layer and deleted in another
(common with `apt-get update && rm -rf /var/lib/apt/lists/*` in
separate `RUN` instructions). The threshold catches anti-pattern
5 in [`coding-style.md`](./coding-style.md).

### 6. Container-structure tests run on every PR

Hadolint catches Dockerfile-level issues; container-structure-
test catches image-level issues. Both are mandatory.

### 7. Multi-platform builds tested on both platforms

If the image deploys to amd64 + arm64, CI builds + tests both
platforms. The arm64 build catches platform-specific bugs
(unaligned access, native-module incompatibility) before
production.

### 8. Smoke test honours signal handling

The smoke test sends `docker stop` (SIGTERM) and asserts the
container exits cleanly within the grace period. Catches PID-1
signal-forwarding bugs (pattern 9 in [`patterns.md`](./patterns.md)).

### 9. Layer-1 tests cover 100% of production-critical properties

The structural test file lists every property the deploy
depends on. Adding a new ENV var, a new exposed port, a new
required file MUST add a test row.

### 10. CI same as local

The pre-push hook runs the same test stack:

```bash
# scripts/verify-local.sh
docker build -t myapp:test .
container-structure-test test --image myapp:test --config container-structure-test.yaml
trivy image --severity HIGH,CRITICAL --exit-code 1 myapp:test
./scripts/smoke-test.sh myapp:test
pnpm test:integration
```

## Tools

| Tool | Layer | Purpose |
| --- | --- | --- |
| **hadolint** | 0 (lint) | Dockerfile linting |
| **container-structure-test** | 1 | Image structure (Google) |
| **Goss** | 1-2 | Image-level assertions + HTTP checks |
| **Dive** | 1 | Layer analysis, wasted space |
| **Dockle** | 1 | CIS Docker + hadolint composite |
| **Trivy** | 1 | CVE + secret + IaC scan |
| **Grype** | 1 | CVE scan (Anchore) |
| **Docker Scout** | 1 | CVE + license (Docker official) |
| **Snyk Container** | 1 | CVE + license + best-practice |
| **Testcontainers** | 3 | Integration tests |
| **Sigstore Cosign** | 4 | Image signing + verification |
| **Syft** | 4 | SBOM generation |

## Cross-references

- [`dockerfile/coding-style.md`](./coding-style.md) — style enforced by hadolint
- [`dockerfile/patterns.md`](./patterns.md) — multi-stage, distroless
- [`dockerfile/security.md`](./security.md) — security gates this validates
- [`dockerfile/hooks.md`](./hooks.md) — CI integration
- [`common/testing.md`](../common/testing.md) — universal test taxonomy
- [`common/dependency-vulnerabilities.md`](../common/dependency-vulnerabilities.md) — CVE policy

## Why this rule exists

A Dockerfile that builds cleanly may still ship a broken image.
Real-world failure modes caught by image testing:

- Missing `COPY` of a built artifact — discovered only when the
  container crashed on startup (layer 1)
- Wrong USER after refactor — root container deployed (layer 1)
- node_modules layer 800 MB because devDependencies leaked
  (layer 4 — Dive)
- Health endpoint returns 200 but the DB connection is broken
  (layer 2 / 3 — needs deep health + smoke)
- amd64 image builds; arm64 missing native module (layer 0 +
  multi-platform CI)
- SIGTERM ignored; orchestrator force-kills after 30s grace
  (layer 2 — signal-handling smoke)

The cost of these tests is ~2 minutes of CI per build. The cost
of skipping them is each incident replayed on every release.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

**Signals to watch**:

- New Dockerfile shipped without a `container-structure-test.yaml` sibling (rule 1 weakening)
- Smoke test asserts only on `/healthz` 200 (rule 2 weakening — golden path not exercised)
- Test-only Dockerfile diverges from production Dockerfile (rule 3 violation — drift)
- Dive wasted-space threshold exceeded but ignored (rule 5 weakening)
- Multi-platform deployment without arm64 test coverage (rule 7 weakening)
- Container exits with non-zero on `docker stop` (rule 8 violation — PID-1 forwarding)

**Refinement candidates**:

- New tool row when a new container test framework gains adoption (e.g. Container Patrol, Trivenoy)
- Tightening of the wasted-space threshold when image bloat patterns recur
- New layer when a regulated workload (FIPS, FedRAMP) requires additional attestation
- New cross-reference when a sister rule (kubernetes-patterns, helm-patterns) defines orchestrator-level tests

---
