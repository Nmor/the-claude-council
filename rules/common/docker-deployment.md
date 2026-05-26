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
