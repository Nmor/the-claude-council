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
