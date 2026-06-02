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

```text
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

```text
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

- Host port mapping without `127.0.0.1:` prefix on dev compose (per `~/.claude/rules-library/common/docker-localhost-binding.md`)
- Image tag floating (`:latest`, `:lts`, `:edge`) instead of digest-pinned (per `~/.claude/rules-library/common/dependency-pinning.md`)
- Container runs as root (no `USER` directive past production stage)
- Multi-stage build absent on an image containing compilers / SDKs (final-stage bloat + attack surface)
- Healthcheck missing on long-running service (orchestrator can't detect zombie)
- Healthcheck loosened (interval / timeout / retries bumped) to mask slow code (per `~/.claude/rules-library/common/proper-fixes-first.md`)
- Secret in `docker-compose.yml` or Dockerfile ENV instead of vault / runtime injection
- `COPY . .` pulling everything (no `.dockerignore` discipline) — bloats image + leaks
- Local FS write inside container without volume mount where state must persist (per `~/.claude/rules-library/common/no-local-fs.md`)
- Privileged mode used unnecessarily (least-privilege weakening)
- Image not scanned (`trivy image` / `grype`) on build (per `~/.claude/rules-library/common/dependency-vulnerabilities.md`)

**Refinement candidates**:

- New row in Dockerfile / compose best-practices when a new image runtime quirk emerges
- New cross-reference when a sister rule (docker-localhost-binding, no-local-fs, secrets-management) gains a Docker gate
- New base-image allowlist row when a new distroless / chiseled / wolfi variant becomes the canonical choice
- Tightening of the healthcheck rules when a recurring zombie-container incident surfaces

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/docker-localhost-binding.md`
- `rules-library/common/docker-deployment.md`

---

<!-- ============================================================
     Section: docker-localhost-binding.md (from rules/common/)
     ============================================================ -->

# Docker Localhost-Binding Rule (Global Default)

> Auto-fires on every `Dockerfile`, `docker-compose*.yml`, `compose*.yml`,
> and any service definition that publishes host ports. Sister to
> `no-local-fs.md`, `deploy-failures-become-checks.md`, and
> `docker-deployment.md`.

## Core Principle

**Every host port mapping in any docker-compose / Dockerfile on a
developer's local machine binds to `127.0.0.1` explicitly. Never bind
to `0.0.0.0` (the Docker default) or leave the host interface
unspecified.**

A bare `"5432:5432"` mapping binds to ALL host interfaces (`0.0.0.0`),
making the container reachable from every device on the local
network. On a coffee shop / hotel / coworking Wi-Fi that means
Redis, Postgres, MinIO, Ollama, Kafka, and every other dev-only
service is one `nmap` away from a stranger. Binding to
`127.0.0.1` restricts the listener to the loopback interface — host
processes still reach it normally, the LAN cannot.

The cost of the localhost prefix is zero (one IP prefix per
mapping). The cost of leaving it off is a complete dev-machine
attack surface every time the laptop joins a public network.

## Hard rules

1. **All host port mappings in `docker-compose*.yml` files include an
   explicit `127.0.0.1:` prefix.** The four canonical shapes that ARE
   allowed:

   ```yaml
   ports:
     - "127.0.0.1:8080:8080"               # bare numeric
     - "127.0.0.1:${HOST_PORT:-8080}:8080" # env-interpolated
     - "127.0.0.1:8080:8080/udp"           # UDP variant
     - "8080"                              # container-only (no host port at all)
   ```

   The five forbidden shapes:

   ```yaml
   ports:
     - "8080:8080"            # bare → binds 0.0.0.0
     - "${HOST_PORT}:8080"    # env-interpolated, no host
     - "0.0.0.0:8080:8080"    # explicit all-interfaces
     - "0.0.0.0:8080:8080/udp"
     - "8080:8080/udp"
   ```

2. **Both quote styles must be checked.** YAML accepts `"..."`,
   `'...'`, and unquoted strings. The sweep grep must cover all
   three:

   ```bash
   grep -nE '^\s+- (["\x27]|)(0\.0\.0\.0:[0-9]+|[0-9]+|\$\{[A-Z_]+):[0-9]+'
   ```

3. **Existing containers on the machine get recreated** after the
   compose patch. `docker compose up -d <service>` is enough; Docker
   detects the port-mapping change and recreates.

4. **The Dockerfile `EXPOSE` directive is documentation only** — it
   does NOT bind ports. `EXPOSE 8080` is fine; the actual binding
   happens at `docker run -p` or compose `ports:`.

5. **Production composes are a special case.** A compose file
   actually deployed to a server (vs run locally on a laptop) needs
   to bind to `0.0.0.0` for the server's traffic to reach it. The
   easiest path: use a `compose.override.yml` or `compose.local.yml`
   that adds the `127.0.0.1:` prefix for local-only runs, and keep
   the base compose unbound. When the same compose file IS used
   locally + deployed remotely (mixed usage), prefer a build-time
   var like `HOST_BIND=${HOST_BIND:-127.0.0.1}` and
   `"${HOST_BIND}:8080:8080"`.

6. **Exceptions** (rare but legitimate):
   - **Streaming / RTSP / RTMP / WebRTC**: if you intentionally
     need a phone or LAN device to connect to the dev Mac for media
     testing, those specific ports stay on `0.0.0.0`. Document the
     reason inline.
   - **Reverse proxy (traefik / nginx) on `80:80` / `443:443`**:
     same — if local-LAN testing is required, document inline.
   - **Public-facing development tunnel (ngrok et al)**: the ngrok
     binary handles exposure; the local port can still be
     `127.0.0.1`.

   Every exception carries a one-line YAML comment naming the
   reason. Example:

   ```yaml
   ports:
     - "0.0.0.0:1935:1935"   # RTMP — phone testing on LAN
   ```

## Detection grep (run on every new compose file)

```bash
# In any project root:
find . -maxdepth 4 \( -name 'docker-compose*.yml' -o -name 'compose*.yml' \) \
  | xargs grep -nE "^\s+- ['\"]?(0\.0\.0\.0:[0-9]+|[0-9]+|\\\$\{[A-Z_]+)[^/]*:[0-9]+" 2>/dev/null \
  | grep -vE "127\.0\.0\.1"
```

If that returns non-empty, the file has unbound port mappings.
Each match is a finding.

## Mechanical patch (the canonical fix)

For files using double-quoted port lines:

```bash
perl -i -pe '
  next if /^\s+- "(127\.0\.0\.1|\[::1\]|localhost):/;
  s|^(\s+)- "0\.0\.0\.0:([0-9]+:[0-9]+(/udp|/tcp)?)"(.*)$|$1- "127.0.0.1:$2"$4|;
  s|^(\s+)- "(\$\{[A-Z_]+:-[0-9]+\}:[0-9]+)"(.*)$|$1- "127.0.0.1:$2"$3|;
  s|^(\s+)- "([0-9]+:[0-9]+(/udp|/tcp)?)"(.*)$|$1- "127.0.0.1:$2"$4|;
' docker-compose.yml
```

Same regex for single-quoted lines — swap `"` for `'`.

After patching: `docker compose up -d <service>` on every changed
service to recreate the containers with new bindings.

## Port-conflict policy

When `127.0.0.1:N` collides with a host process or another
container (common with Postgres, Redis, MinIO when devs run native

- Docker copies), the resolution path is:

1. Pick an unused host port on the loopback (e.g. 5433/5434/5435 for
   Postgres clones).
2. Update both the compose mapping AND the `.env` / config that
   tells the app where to find the service.
3. Document the chosen port in the project's README or compose
   comment.

Never solve a conflict by switching back to `0.0.0.0` — that's the
problem this rule prevents.

## Verification step

Every project's local pre-flight script (or PR checklist) runs the
detection grep. If it returns non-empty, the PR/commit is blocked.

For projects with a local pre-flight script (e.g.
`infra/verify-local.sh`, `scripts/preflight.sh`), add this gate
inline so it fires on every commit and in CI.

## Why this rule exists

Device-wide audits routinely surface dozens of compose services
bound to `0.0.0.0` on developer machines:

- Postgres / MySQL / MongoDB dev containers on `:5432`, `:3306`,
  `:27017`
- LLM inference servers (Ollama, vLLM, llama.cpp) on `:11434`
- LocalStack / Minio / Typesense / Elasticsearch / Kafka /
  Redis on their default ports
- Streaming endpoints (RTSP, RTMP, WebRTC signalling) on `:1935`,
  `:8554`, etc.
- Total: 100+ unbound port mappings across 20-30 compose files

On any shared Wi-Fi (coffee shop, coworking, hotel), every one of
those services is discoverable + reachable. Many still have
default credentials because "it's local-only" — but it isn't.

The fix is mechanical: `127.0.0.1:` prefix on every host port
mapping. The dev surface becomes invisible to the LAN, no
container behaviour changes, and the gate is one grep wide.

## Cross-references

- `no-local-fs.md` — same "local machine is not a trusted boundary"
  principle applied to filesystem state.
- `docker-deployment.md` — broader Docker patterns; this rule is the
  binding-specific corollary.
- `deploy-failures-become-checks.md` — same family: every observed
  posture gap becomes a mechanical gate.
- `~/.claude/rules-library/common/auto-skills.md` — already maps Dockerfile
  - compose files to this rule via the `**/*` path.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New compose file shipped with bare `"5432:5432"` / `"6379:6379"` port mapping (Hard rule 1 violation)
- Existing `127.0.0.1:` prefix removed in a refactor (binding-scope regression)
- `0.0.0.0:` explicit binding on a developer-machine compose (forbidden shape #3-4)
- Unspecified-host env-interpolated mapping `"${HOST_PORT}:8080"` introduced (forbidden shape #2)
- Exception (streaming, reverse proxy, ngrok) lacks the inline rationale comment (rule 6 weakening)
- Detection grep absent from local pre-flight script (sister `deploy-failures-become-checks.md` weakening)
- Port conflict resolved by switching back to `0.0.0.0:` instead of picking an unused loopback port (rule-violation shortcut)

**Refinement candidates**:

- New entry in the allowed-exception list when a recurring legitimate cross-host need surfaces (e.g., new media-streaming protocol, new IoT-device pairing flow)
- Tightening of the detection grep when YAML formatting variants slip past (e.g., new compose v3.x syntax, Docker Bake)
- New cross-reference when a sister rule (no-local-fs, secrets-management) provides the broader "developer machine isn't a trusted boundary" baseline
- Promotion to enforced lint when a project's local-pre-flight gate has caught zero false-positives over 90 days

---

<!-- ============================================================
     Section: docker-deployment.md (from rules/common/)
     ============================================================ -->

---
paths:

- "**/Dockerfile"
- "**/Dockerfile.*"
- "**/.dockerignore"
- "**/docker-compose*.yml"
- "**/docker-compose*.yaml"
- "**/.github/workflows/**"
- "**/deploy/**"
- "**/k8s/**"
- "**/manifests/**"
- "**/*deploy*.yml"
- "**/*deploy*.yaml"

---

# Docker and Deployment Standards

> Auto-activates for Dockerfiles, compose files, CI/CD workflows, and K8s manifests. Chains with `docker-patterns` and `deployment-patterns` skills.

## Docker Checklist

- [ ] Multi-stage builds to minimize image size
- [ ] Non-root user in production images
- [ ] No secrets baked into images (use env vars or secrets manager)
- [ ] `.dockerignore` excludes node_modules, .git, .env
- [ ] Health check defined
- [ ] Pinned base image versions (no `latest` tag)

## Deployment Checklist

- [ ] Rollback strategy defined
- [ ] Health check endpoints verified
- [ ] Environment variables documented
- [ ] CI/CD pipeline runs tests before deploy
- [ ] Zero-downtime deployment pattern used

## Skill Chain

1. **docker-patterns** - Container security, networking, volumes, compose orchestration
2. **deployment-patterns** - CI/CD pipelines, health checks, rollback strategies
3. **security-review** - No exposed secrets, minimal attack surface

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Single-stage Dockerfile shipped (multi-stage rule weakening — image bloat)
- `USER root` in production image (non-root requirement violated)
- Secrets baked into image layer (`ENV API_KEY=...`, COPY of `.env`) — sister `secrets-management.md` weakening
- `.dockerignore` missing `node_modules` / `.git` / `.env` / `coverage` — image-content leakage
- `HEALTHCHECK` directive missing on long-running services
- Base image tagged `latest` / `master` / `edge` instead of pinned + digest (sister `dependency-pinning.md` weakening)
- Deployment without documented rollback procedure (sister `runbook-template.md` weakening)
- Health-check endpoint not exercised in CI before deploy
- Environment variables undocumented in `.env.example` / `docs/secrets.md`
- Non-zero-downtime deploy pattern adopted on a customer-facing service (rollout / canary skipped)

**Refinement candidates**:

- New row in the Docker checklist when a recurring image-bloat / supply-chain class emerges (e.g., missing `SBOM` generation, missing `LABEL` metadata)
- Tightening of the deployment checklist when a recurring rollout failure class recurs (e.g., DB migration races, feature-flag desync)
- New cross-reference when a sister rule (docker-localhost-binding, deploy-failures-become-checks, github-actions-gotchas) provides a deploy-time gate
- New "auto-activate paths" entry when a new IaC tool appears (Pulumi, CDK, Crossplane)

---
