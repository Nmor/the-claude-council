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

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

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
