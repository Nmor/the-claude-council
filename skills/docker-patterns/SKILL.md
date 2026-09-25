---
name: docker-patterns
description: Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration. Also lazy-loads docker-deployment.md / docker-localhost-binding.md content migrated from rules/common/ on 2026-06-02.
paths:
  - "Dockerfile"
  - "Dockerfile.*"
  - "**/Dockerfile"
  - "**/Dockerfile.*"
  - "**/*.dockerfile"
  - "Containerfile"
  - "**/Containerfile"
  - "docker-compose.yml"
  - "docker-compose.yaml"
  - "docker-compose*.yml"
  - "docker-compose*.yaml"
  - "compose.yml"
  - "compose.yaml"
  - "compose*.yml"
  - "**/docker-compose*.y*ml"
  - "**/compose*.y*ml"
  - ".dockerignore"
  - "**/.dockerignore"
---

# Docker Patterns

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`

Docker and Docker Compose best practices for containerized development.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Docker Compose for Local Development | [`references/docker-compose-for-local-development.md`](references/docker-compose-for-local-development.md) |
| Networking | [`references/networking.md`](references/networking.md) |
| Volume Strategies | [`references/volume-strategies.md`](references/volume-strategies.md) |
| Container Security | [`references/container-security.md`](references/container-security.md) |
| .dockerignore | [`references/dockerignore.md`](references/dockerignore.md) |
| Debugging | [`references/debugging.md`](references/debugging.md) |
| docker-localhost-binding (migrated rule) | [`references/docker-localhost-binding.md`](references/docker-localhost-binding.md) |
| docker-deployment (migrated rule) | [`references/docker-deployment.md`](references/docker-deployment.md) |

## When to Activate

- Setting up Docker Compose for local development
- Designing multi-container architectures
- Troubleshooting container networking or volume issues
- Reviewing Dockerfiles for security and size
- Migrating from local dev to containerized workflow

## Anti-Patterns

```text
# BAD: Using docker compose in production without orchestration
# Use Kubernetes, ECS, or Docker Swarm for production multi-container workloads

# BAD: Storing data in containers without volumes
# Containers are ephemeral -- all data lost on restart without volumes

# BAD: Running as root
# Always create and use a non-root user

# BAD: Using :latest tag
# Pin to specific versions for reproducible builds

# BAD: One giant container with all services
# Separate concerns: one process per container

# BAD: Putting secrets in docker-compose.yml
# Use .env files (gitignored) or Docker secrets
```

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `FROM <image>:latest` | Non-reproducible; surprise upgrades | Pin to immutable digest `@sha256:...` |
| Running as `root` | Container escape ⇒ host privilege | `USER appuser` with explicit UID:GID |
| `COPY . /app` without `.dockerignore` | Ships secrets, `.git`, node_modules | Minimal `.dockerignore` + explicit COPY |
| Secrets via `ENV STRIPE_KEY=...` | Baked into image layer; leaks via `docker history` | BuildKit `--mount=type=secret` or runtime env injection |
| Single-stage image with build toolchain | Image carries gcc / npm-dev — huge attack surface | Multi-stage: build in `builder`, copy artefact to `runtime` |
| `apt-get install` without `--no-install-recommends` + cleanup | Bloated image; cached package lists | `--no-install-recommends && rm -rf /var/lib/apt/lists/*` |
| No `HEALTHCHECK` | Orchestrator can't detect unhealthy pod | Define `HEALTHCHECK CMD` with realistic probe |
| Compose `ports: "5432:5432"` on dev machine | Exposes Postgres on LAN | `127.0.0.1:5432:5432` per `docker-localhost-binding.md` |
| `chmod -R 777` to fix permissions | Defeats every Linux DAC control | Fix the actual UID:GID in COPY/RUN |
| Missing `--init` for PID 1 | Zombie processes, signal forwarding broken | `docker run --init` or `tini` entrypoint |
| Volume mount over container path with files | Existing image content hidden by empty mount | Document mount semantics; use named volumes |
| Build-arg used for secret | `docker history` reveals the value | NEVER use ARG for secrets; use BuildKit secrets |

## Purpose

Principal-level container engineering: minimal multi-stage images,
non-root runtime, deterministic + reproducible builds via digest
pinning + BuildKit cache mounts, supply-chain integrity (SBOM,
Sigstore Cosign signing, vulnerability scanning), layer order for
cache hit rate, security context (capabilities drop, seccomp,
AppArmor, read-only rootfs), healthchecks + graceful shutdown,
loopback-only port binding on developer machines, network +
volume isolation, secrets via runtime injection (never bake-in),
and the `dockerignore` + build-context discipline that keeps
images out of the danger zone.

**Negative scope** (NOT what this skill covers):

- Kubernetes orchestration — see `deployment-patterns` + cloud-
  native sister skills
- Serverless / Lambda image runtime — see `aws-serverless-patterns`
- Docker Swarm production deployment (effectively deprecated)
- Windows containers — divergent toolchain

## When NOT to use

- Single-binary distribution where the runtime has no external deps
  (statically-linked Go binary on a VM)
- Maximum-performance HPC workloads — bare metal or Singularity
- Local-only one-off dev scripts — container overhead is friction

## Standards Cited

- **OCI Image Spec v1.1** (opencontainers.org) — image format
- **OCI Runtime Spec v1.2** — container runtime contract
- **Docker BuildKit Documentation** — build cache, multi-stage,
  secret mounts (`--mount=type=secret`)
- **CIS Docker Benchmark v1.7** — hardening reference
- **NIST SP 800-190** — Application Container Security Guide
- **OWASP Docker Top 10** (owasp.org/www-project-docker-top-10/)
- **`~/.claude/rules-library/common/docker-localhost-binding.md`** —
  loopback-only port binding on dev machines
- **`~/.claude/rules-library/common/secrets-management.md`** — secrets via
  vault, never baked into image
- **SLSA Framework v1.0** — supply-chain integrity levels

## Verification Checklist

- [ ] Base image pinned to `@sha256:` digest, not floating tag
- [ ] Multi-stage build keeps build tools out of final image
- [ ] Final image runs as non-root (UID ≥ 10000)
- [ ] `HEALTHCHECK` defined OR explicit reason documented
- [ ] `.dockerignore` excludes `.git`, `node_modules`, `.env*`, secrets
- [ ] No secrets in ENV / ARG / image layers (`docker history` clean)
- [ ] Trivy / Grype scan returns 0 HIGH+CRITICAL CVEs
- [ ] SBOM emitted (`syft`) + signed (`cosign attest`)
- [ ] Image signed with Cosign keyless / KMS-backed
- [ ] Compose ports loopback-bound on dev machines
- [ ] Read-only rootfs where feasible (`--read-only` + tmpfs for /tmp)
- [ ] Capabilities dropped (`--cap-drop=ALL` + selective add-back)
- [ ] Resource limits set (`--memory`, `--cpus`)

## Cross-References

- `~/.claude/skills/deployment-patterns/SKILL.md` — orchestration
- `~/.claude/skills/aws-serverless-patterns/SKILL.md` — Lambda
  container image runtime
- `~/.claude/rules-library/common/docker-localhost-binding.md` — loopback
  binding mandate
- `~/.claude/rules-library/common/secrets-management.md` — vault-side
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — Trivy
  gate in CI
- `~/.claude/agents/security-reviewer.md` — Council Division 4
- `~/.claude/agents/infra-reviewer.md` — Council Division 2 reviewer

## Why this skill exists

Containers are the unit of deployment for most modern services and
the leading source of supply-chain risk. The patterns above codify
the principal-level posture: pinned digests, multi-stage builds,
non-root runtime, secrets out-of-image, SBOM + signing, scan-then-
ship. Teams that adopt these ship with predictable security
properties; teams that don't ship images with `root` + `latest` +
`.env` baked in + 30 unpatched CVEs, and discover it during the
incident review.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Host port mapping without `127.0.0.1:` prefix on dev compose (per
  `~/.claude/rules-library/common/docker-localhost-binding.md`)
- Image tag floating (`:latest`, `:lts`, `:edge`) instead of digest-pinned (per
  `~/.claude/rules-library/common/dependency-pinning.md`)
- Container runs as root (no `USER` directive past production stage)
- Multi-stage build absent on an image containing compilers / SDKs (final-stage bloat + attack
  surface)
- Healthcheck missing on long-running service (orchestrator can't detect zombie)
- Healthcheck loosened (interval / timeout / retries bumped) to mask slow code (per
  `~/.claude/rules-library/common/proper-fixes-first.md`)
- Secret in `docker-compose.yml` or Dockerfile ENV instead of vault / runtime injection
- `COPY . .` pulling everything (no `.dockerignore` discipline) — bloats image + leaks
- Local FS write inside container without volume mount where state must persist (per
  `~/.claude/rules-library/common/no-local-fs.md`)
- Privileged mode used unnecessarily (least-privilege weakening)
- Image not scanned (`trivy image` / `grype`) on build (per
  `~/.claude/rules-library/common/dependency-vulnerabilities.md`)

**Refinement candidates**:

- New row in Dockerfile / compose best-practices when a new image runtime quirk emerges
- New cross-reference when a sister rule (docker-localhost-binding, no-local-fs, secrets-management)
  gains a Docker gate
- New base-image allowlist row when a new distroless / chiseled / wolfi variant becomes the
  canonical choice
- Tightening of the healthcheck rules when a recurring zombie-container incident surfaces

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the
lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/docker-localhost-binding.md`
- `rules-library/common/docker-deployment.md`

---
