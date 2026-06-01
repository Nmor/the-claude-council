---
name: deployment-patterns
description: Deployment workflows, CI/CD pipeline patterns, Docker containerization, health checks, rollback strategies, and production readiness checklists for web applications.
---

# Deployment Patterns

Production deployment workflows and CI/CD best practices.

## When to Activate

- Setting up CI/CD pipelines
- Dockerizing an application
- Planning deployment strategy (blue-green, canary, rolling)
- Implementing health checks and readiness probes
- Preparing for a production release
- Configuring environment-specific settings

## Deployment Strategies

### Rolling Deployment (Default)

Replace instances gradually — old and new versions run simultaneously during rollout.

```
Instance 1: v1 → v2  (update first)
Instance 2: v1        (still running v1)
Instance 3: v1        (still running v1)

Instance 1: v2
Instance 2: v1 → v2  (update second)
Instance 3: v1

Instance 1: v2
Instance 2: v2
Instance 3: v1 → v2  (update last)
```

**Pros:** Zero downtime, gradual rollout
**Cons:** Two versions run simultaneously — requires backward-compatible changes
**Use when:** Standard deployments, backward-compatible changes

### Blue-Green Deployment

Run two identical environments. Switch traffic atomically.

```
Blue  (v1) ← traffic
Green (v2)   idle, running new version

# After verification:
Blue  (v1)   idle (becomes standby)
Green (v2) ← traffic
```

**Pros:** Instant rollback (switch back to blue), clean cutover
**Cons:** Requires 2x infrastructure during deployment
**Use when:** Critical services, zero-tolerance for issues

### Canary Deployment

Route a small percentage of traffic to the new version first.

```
v1: 95% of traffic
v2:  5% of traffic  (canary)

# If metrics look good:
v1: 50% of traffic
v2: 50% of traffic

# Final:
v2: 100% of traffic
```

**Pros:** Catches issues with real traffic before full rollout
**Cons:** Requires traffic splitting infrastructure, monitoring
**Use when:** High-traffic services, risky changes, feature flags

## Docker

### Multi-Stage Dockerfile (Node.js)

```dockerfile
# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 3: Production image
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser

COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### Multi-Stage Dockerfile (Go)

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.19 AS runner
RUN apk --no-cache add ca-certificates
RUN adduser -D -u 1001 appuser
USER appuser

COPY --from=builder /server /server

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["/server"]
```

### Multi-Stage Dockerfile (Python/Django)

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app

RUN useradd -r -u 1001 appuser
USER appuser

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')" || exit 1
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### Docker Best Practices

```
# GOOD practices
- Use specific version tags (node:22-alpine, not node:latest)
- Multi-stage builds to minimize image size
- Run as non-root user
- Copy dependency files first (layer caching)
- Use .dockerignore to exclude node_modules, .git, tests
- Add HEALTHCHECK instruction
- Set resource limits in docker-compose or k8s

# BAD practices
- Running as root
- Using :latest tags
- Copying entire repo in one COPY layer
- Installing dev dependencies in production image
- Storing secrets in image (use env vars or secrets manager)
```

## CI/CD Pipeline

### GitHub Actions (Standard Pipeline)

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to production
        run: |
          # Platform-specific deployment command
          # Railway: railway up
          # Vercel: vercel --prod
          # K8s: kubectl set image deployment/app app=ghcr.io/${{ github.repository }}:${{ github.sha }}
          echo "Deploying ${{ github.sha }}"
```

### Pipeline Stages

```
PR opened:
  lint → typecheck → unit tests → integration tests → preview deploy

Merged to main:
  lint → typecheck → unit tests → integration tests → build image → deploy staging → smoke tests → deploy production
```

## Health Checks

### Health Check Endpoint

```typescript
// Simple health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Detailed health check (for internal monitoring)
app.get("/health/detailed", async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalApi: await checkExternalApi(),
  };

  const allHealthy = Object.values(checks).every(c => c.status === "ok");

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "unknown",
    uptime: process.uptime(),
    checks,
  });
});

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await db.query("SELECT 1");
    return { status: "ok", latency_ms: 2 };
  } catch (err) {
    return { status: "error", message: "Database unreachable" };
  }
}
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 2

startupProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 30    # 30 * 5s = 150s max startup time
```

## Environment Configuration

### Twelve-Factor App Pattern

```bash
# All config via environment variables — never in code
DATABASE_URL=postgres://user:pass@host:5432/db
REDIS_URL=redis://host:6379/0
API_KEY=${API_KEY}           # injected by secrets manager
LOG_LEVEL=info
PORT=3000

# Environment-specific behavior
NODE_ENV=production          # or staging, development
APP_ENV=production           # explicit app environment
```

### Configuration Validation

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// Validate at startup — fail fast if config is wrong
export const env = envSchema.parse(process.env);
```

## Rollback Strategy

### Instant Rollback

```bash
# Docker/Kubernetes: point to previous image
kubectl rollout undo deployment/app

# Vercel: promote previous deployment
vercel rollback

# Railway: redeploy previous commit
railway up --commit <previous-sha>

# Database: rollback migration (if reversible)
npx prisma migrate resolve --rolled-back <migration-name>
```

### Rollback Checklist

- [ ] Previous image/artifact is available and tagged
- [ ] Database migrations are backward-compatible (no destructive changes)
- [ ] Feature flags can disable new features without deploy
- [ ] Monitoring alerts configured for error rate spikes
- [ ] Rollback tested in staging before production release

## Production Readiness Checklist

Before any production deployment:

### Application
- [ ] All tests pass (unit, integration, E2E)
- [ ] No hardcoded secrets in code or config files
- [ ] Error handling covers all edge cases
- [ ] Logging is structured (JSON) and does not contain PII
- [ ] Health check endpoint returns meaningful status

### Infrastructure
- [ ] Docker image builds reproducibly (pinned versions)
- [ ] Environment variables documented and validated at startup
- [ ] Resource limits set (CPU, memory)
- [ ] Horizontal scaling configured (min/max instances)
- [ ] SSL/TLS enabled on all endpoints

### Monitoring
- [ ] Application metrics exported (request rate, latency, errors)
- [ ] Alerts configured for error rate > threshold
- [ ] Log aggregation set up (structured logs, searchable)
- [ ] Uptime monitoring on health endpoint

### Security
- [ ] Dependencies scanned for CVEs
- [ ] CORS configured for allowed origins only
- [ ] Rate limiting enabled on public endpoints
- [ ] Authentication and authorization verified
- [ ] Security headers set (CSP, HSTS, X-Frame-Options)

### Operations
- [ ] Rollback plan documented and tested
- [ ] Database migration tested against production-sized data
- [ ] Runbook for common failure scenarios
- [ ] On-call rotation and escalation path defined

## Purpose

Principal-level deployment engineering: progressive delivery
(blue/green, canary, rolling), feature-flag-decoupled releases,
health-check gating (liveness vs readiness vs startup), automated
rollback predicates, deploy-time idempotency, CI/CD pipeline
discipline (build once, deploy many), artefact provenance (SLSA),
deployment audit + traceability, and the migration-deploy decoupling
that turns schema changes from outage candidates into routine.

**Negative scope** (NOT what this skill covers):
- Application code patterns — see `backend-patterns` /
  `frontend-patterns`
- Container image construction — see `docker-patterns`
- Schema migration mechanics — see `database-migrations`
- AWS-specific serverless deploy — see `aws-serverless-patterns`
- Observability after deploy — see `observability-patterns`

## When NOT to use

- Pure local dev where there is no remote deployment target
- One-off scripts run by a single operator on a workstation
- Single-user single-instance hobby projects

## Standards Cited

- **SRE Workbook (Google, O'Reilly 2018)** — error budgets,
  progressive rollout, change-management
- **Accelerate (Forsgren, Humble, Kim 2018)** — DORA metrics
  (deployment frequency, lead time, MTTR, change-failure rate)
- **DORA State of DevOps 2024** — empirical baselines
- **SLSA Framework v1.0** — supply-chain integrity for build artefacts
- **NIST SP 800-218 (SSDF)** — secure software development framework
- **OWASP CI/CD Security Top 10**
- **Kubernetes Deployment API v1** — rolling-update semantics
- **`~/.claude/rules/common/deploy-failures-become-checks.md`** —
  every deploy failure becomes a pre-deploy gate
- **`~/.claude/rules/common/plan-completion-before-push.md`** —
  push gate after plan completion
- **`~/.claude/rules/common/feature-flags.md`** — decoupling release
  from deploy

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `kubectl apply -f` from a developer laptop to production | No audit trail, no review, no provenance | GitOps (Argo CD / Flux) reads from immutable git ref |
| Deploy that also runs migrations atomically | Coupling: migration failure rolls back code, leaves DB intact | Migrate first (separately) → deploy code that reads new schema |
| Big-bang deploy of all services together | Failure surface = entire system | Independent deploy per service; contract tests gate the cross |
| No automated rollback | Manual rollback during incident = MTTR blowup | Health-check + SLO predicate triggers auto-rollback |
| Promotion via "rebuild from main" | Different artefact in prod vs staging | Build once, promote the SAME image / artefact through environments |
| Floating image tag (`:latest`, `:main`) | Drift between deploy intent and runtime | Digest-pinned image references |
| Health check that hits `/` instead of `/healthz` | Reports healthy on cached static page | Dedicated readiness probe touches real dependencies |
| Readiness probe = liveness probe | Restart loops when deps are slow | Separate liveness (am I alive?) from readiness (am I serving?) |
| Deploy without canary on a P0 service | Bug hits 100% of traffic at once | 1% → 5% → 25% → 100% with SLO gate at each step |
| Disabling rollback "to ship the fix" | Locks you into broken state | Roll forward via the same pipeline; never disable rollback |
| Manual config drift via console / kubectl | Cannot reproduce; cannot audit | IaC source of truth (Terraform / Pulumi / CDK) |
| Deploy that requires "stop the world" | Forces calendared outage windows | Zero-downtime rolling update + connection draining |

## Verification Checklist

- [ ] Pipeline is reproducible (build once, promote artefact)
- [ ] Artefacts signed (Cosign / Sigstore) + SBOM attached
- [ ] Progressive delivery (canary OR blue/green) on every P0 service
- [ ] Health probes: separate liveness / readiness / startup
- [ ] Auto-rollback predicate defined + tested
- [ ] DB migration deploy is decoupled from code deploy
- [ ] Pre-deploy gate runs the same checks as CI (no parity gap)
- [ ] Feature flag exists for risky changes (decouple release)
- [ ] DORA metrics tracked: frequency, lead time, MTTR, failure rate
- [ ] Audit log captures who-deployed-what-when-from-which-commit
- [ ] Rollback path tested in non-prod within last 30 days
- [ ] On-call rotation has runbook for each deploy class
- [ ] Connection draining configured (`terminationGracePeriodSeconds`)

## Cross-References

- `~/.claude/skills/docker-patterns/SKILL.md` — image construction
- `~/.claude/skills/aws-serverless-patterns/SKILL.md` — Lambda
  alias-based canary
- `~/.claude/skills/database-migrations/SKILL.md` — migrate-first
  decoupling
- `~/.claude/skills/observability-patterns/SKILL.md` — SLO + alerting
  feeds rollback predicate
- `~/.claude/rules/common/deploy-failures-become-checks.md` —
  every failure becomes a gate
- `~/.claude/rules/common/plan-completion-before-push.md` — push
  gate enforcement
- `~/.claude/rules/common/feature-flags.md` — release vs deploy
- `~/.claude/agents/ops-reviewer.md` — Council Division 8

## Why this skill exists

Deployment is the most-failed boundary in software engineering:
DORA's research shows that low performers fail 46-60% of deploys
versus high performers' 0-15%. The gap is mechanical: high
performers decouple release from deploy via flags, promote a
single artefact through environments, gate canary on SLO predicates,
and auto-rollback on failure. The patterns above codify those
disciplines so deploys move from calendared events to background
hum.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Deploy without rollback path tested in staging (per `~/.claude/rules/common/deploy-failures-become-checks.md`)
- Canary stage skipped on a high-risk change (blast-radius weakening — Division 11 Risk concern)
- Pre-deploy gate (CVE scan, license gate, schema migration dry-run) bypassed (per `~/.claude/rules/common/security-controls-org-wide.md`)
- Deploy succeeds without post-deploy health check verification (false-positive success)
- Database migration shipped in same deploy as code that reads new shape (atomicity violation — per `~/.claude/rules/common/schema-evolution.md`)
- Feature flag introduced without owner / expiry / removal-task (per `~/.claude/rules/common/feature-flags.md`)
- Production deploy on Friday afternoon / before weekend without explicit override
- Deploy that touches > 10% of services without Risk Division engagement
- Blue-green / canary metric thresholds set arbitrarily (without observed-baseline justification)
- Rollback drill not run on a quarterly cadence (muscle-memory atrophy)

**Refinement candidates**:
- New deploy-strategy row when a new pattern emerges (e.g., progressive delivery via service mesh)
- Tightening of the canary metrics / bake time when a deploy-related incident recurs
- New cross-reference when a sister skill (aws-serverless-patterns, docker-patterns, ops-reviewer) adds a deploy gate
- New rollback-procedure template per service class (stateless web, stateful DB, queue consumer, scheduled job)
