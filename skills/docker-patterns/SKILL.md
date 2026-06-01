---
name: docker-patterns
description: Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration.
---

# Docker Patterns

Docker and Docker Compose best practices for containerized development.

## When to Activate

- Setting up Docker Compose for local development
- Designing multi-container architectures
- Troubleshooting container networking or volume issues
- Reviewing Dockerfiles for security and size
- Migrating from local dev to containerized workflow

## Docker Compose for Local Development

### Standard Web App Stack

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: dev                     # Use dev stage of multi-stage Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - .:/app                        # Bind mount for hot reload
      - /app/node_modules             # Anonymous volume -- preserves container deps
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app_dev
      - REDIS_URL=redis://redis:6379/0
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  mailpit:                            # Local email testing
    image: axllent/mailpit
    ports:
      - "8025:8025"                   # Web UI
      - "1025:1025"                   # SMTP

volumes:
  pgdata:
  redisdata:
```

### Development vs Production Dockerfile

```dockerfile
# Stage: dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage: dev (hot reload, debug tools)
FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Stage: build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

# Stage: production (minimal image)
FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### Override Files

```yaml
# docker-compose.override.yml (auto-loaded, dev-only settings)
services:
  app:
    environment:
      - DEBUG=app:*
      - LOG_LEVEL=debug
    ports:
      - "9229:9229"                   # Node.js debugger

# docker-compose.prod.yml (explicit for production)
services:
  app:
    build:
      target: production
    restart: always
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

```bash
# Development (auto-loads override)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Networking

### Service Discovery

Services in the same Compose network resolve by service name:
```
# From "app" container:
postgres://postgres:postgres@db:5432/app_dev    # "db" resolves to the db container
redis://redis:6379/0                             # "redis" resolves to the redis container
```

### Custom Networks

```yaml
services:
  frontend:
    networks:
      - frontend-net

  api:
    networks:
      - frontend-net
      - backend-net

  db:
    networks:
      - backend-net              # Only reachable from api, not frontend

networks:
  frontend-net:
  backend-net:
```

### Exposing Only What's Needed

```yaml
services:
  db:
    ports:
      - "127.0.0.1:5432:5432"   # Only accessible from host, not network
    # Omit ports entirely in production -- accessible only within Docker network
```

## Volume Strategies

```yaml
volumes:
  # Named volume: persists across container restarts, managed by Docker
  pgdata:

  # Bind mount: maps host directory into container (for development)
  # - ./src:/app/src

  # Anonymous volume: preserves container-generated content from bind mount override
  # - /app/node_modules
```

### Common Patterns

```yaml
services:
  app:
    volumes:
      - .:/app                   # Source code (bind mount for hot reload)
      - /app/node_modules        # Protect container's node_modules from host
      - /app/.next               # Protect build cache

  db:
    volumes:
      - pgdata:/var/lib/postgresql/data          # Persistent data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql  # Init scripts
```

## Container Security

### Dockerfile Hardening

```dockerfile
# 1. Use specific tags (never :latest)
FROM node:22.12-alpine3.20

# 2. Run as non-root
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
USER app

# 3. Drop capabilities (in compose)
# 4. Read-only root filesystem where possible
# 5. No secrets in image layers
```

### Compose Security

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /app/.cache
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE          # Only if binding to ports < 1024
```

### Secret Management

```yaml
# GOOD: Use environment variables (injected at runtime)
services:
  app:
    env_file:
      - .env                     # Never commit .env to git
    environment:
      - API_KEY                  # Inherits from host environment

# GOOD: Docker secrets (Swarm mode)
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  db:
    secrets:
      - db_password

# BAD: Hardcoded in image
# ENV API_KEY=sk-proj-xxxxx      # NEVER DO THIS
```

## .dockerignore

```
node_modules
.git
.env
.env.*
dist
coverage
*.log
.next
.cache
docker-compose*.yml
Dockerfile*
README.md
tests/
```

## Debugging

### Common Commands

```bash
# View logs
docker compose logs -f app           # Follow app logs
docker compose logs --tail=50 db     # Last 50 lines from db

# Execute commands in running container
docker compose exec app sh           # Shell into app
docker compose exec db psql -U postgres  # Connect to postgres

# Inspect
docker compose ps                     # Running services
docker compose top                    # Processes in each container
docker stats                          # Resource usage

# Rebuild
docker compose up --build             # Rebuild images
docker compose build --no-cache app   # Force full rebuild

# Clean up
docker compose down                   # Stop and remove containers
docker compose down -v                # Also remove volumes (DESTRUCTIVE)
docker system prune                   # Remove unused images/containers
```

### Debugging Network Issues

```bash
# Check DNS resolution inside container
docker compose exec app nslookup db

# Check connectivity
docker compose exec app wget -qO- http://api:3000/health

# Inspect network
docker network ls
docker network inspect <project>_default
```

## Anti-Patterns

```
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
- **`~/.claude/rules/common/docker-localhost-binding.md`** —
  loopback-only port binding on dev machines
- **`~/.claude/rules/common/secrets-management.md`** — secrets via
  vault, never baked into image
- **SLSA Framework v1.0** — supply-chain integrity levels

## Anti-Patterns

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
- `~/.claude/rules/common/docker-localhost-binding.md` — loopback
  binding mandate
- `~/.claude/rules/common/secrets-management.md` — vault-side
- `~/.claude/rules/common/dependency-vulnerabilities.md` — Trivy
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
- Host port mapping without `127.0.0.1:` prefix on dev compose (per `~/.claude/rules/common/docker-localhost-binding.md`)
- Image tag floating (`:latest`, `:lts`, `:edge`) instead of digest-pinned (per `~/.claude/rules/common/dependency-pinning.md`)
- Container runs as root (no `USER` directive past production stage)
- Multi-stage build absent on an image containing compilers / SDKs (final-stage bloat + attack surface)
- Healthcheck missing on long-running service (orchestrator can't detect zombie)
- Healthcheck loosened (interval / timeout / retries bumped) to mask slow code (per `~/.claude/rules/common/proper-fixes-first.md`)
- Secret in `docker-compose.yml` or Dockerfile ENV instead of vault / runtime injection
- `COPY . .` pulling everything (no `.dockerignore` discipline) — bloats image + leaks
- Local FS write inside container without volume mount where state must persist (per `~/.claude/rules/common/no-local-fs.md`)
- Privileged mode used unnecessarily (least-privilege weakening)
- Image not scanned (`trivy image` / `grype`) on build (per `~/.claude/rules/common/dependency-vulnerabilities.md`)

**Refinement candidates**:
- New row in Dockerfile / compose best-practices when a new image runtime quirk emerges
- New cross-reference when a sister rule (docker-localhost-binding, no-local-fs, secrets-management) gains a Docker gate
- New base-image allowlist row when a new distroless / chiseled / wolfi variant becomes the canonical choice
- Tightening of the healthcheck rules when a recurring zombie-container incident surfaces
