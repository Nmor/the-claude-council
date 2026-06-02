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

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

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
