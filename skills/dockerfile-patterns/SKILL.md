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

# dockerfile-patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules-library/dockerfile/` as part of the lazy-rules-loading
> plan. Phase H will delete the source files.
>
> Converted to progressive disclosure 2026-09-21: this file is a routing table; every
> word of the detail lives under `references/`, unchanged. This skill is `paths:`-gated,
> so its full weight was added to the always-on Floor on any Dockerfile or Compose edit.

## Purpose

Dockerfile + container discipline: how an image is authored, how that authoring is
enforced mechanically, which build patterns to reach for, how the image is hardened,
and how it is tested. Read the routing table, then open ONLY the reference file the
task needs — opening all five costs what the un-split file cost.

## Standards Cited

The container standards the references apply; detail and mappings live in them.

- **CIS Docker Benchmark 1.7**: host and image hardening controls (`references/security.md`)
- **NIST SP 800-190**: Application Container Security Guide (`references/security.md`)
- **OWASP Docker Top 10**: the container risk catalogue the security review maps to
- **SLSA Framework v1.0**: Build L3 provenance and reproducible builds (`references/patterns.md`)
- **OCI Distribution Spec 1.1** and the `org.opencontainers.image.*` annotations
- **FIPS 140-2 / 140-3**: validated cryptography for regulated base images

## Routing table

| Topic | Read | What is in it |
| --- | --- | --- |
| **Coding style** | [`references/coding-style.md`](references/coding-style.md) | The 15 mandatory authoring rules: multi-stage by default · pin base image to tag + `@sha256:` digest · non-root `USER` · `COPY` over `ADD` · chained install + cache cleanup in one `RUN` · explicit `WORKDIR` · exec-form `CMD`/`ENTRYPOINT` · layer ordering · `EXPOSE` documentary · `HEALTHCHECK` · OCI labels · `.dockerignore` · line length + formatting · `ENV` vs `ARG` · reproducibility. Plus the mandatory header, the Hadolint rule mapping table, standards cited, and why the rule exists. |
| **Hooks + enforcement pipeline** | [`references/hooks.md`](references/hooks.md) | The 6-layer pipeline and its scripts: pre-commit gate (layer 2) · pre-push build + structural test (layer 3) · CI workflow (layer 4) · deploy-time gate (layer 5) · runtime admission (layer 6). Plus `.hadolint.yaml` configuration and the developer-machine tooling install. |
| **Build patterns** | [`references/patterns.md`](references/patterns.md) | Patterns 1-14: minimal-runtime multi-stage · distroless/minimal base · BuildKit cache mounts · BuildKit secret mounts · SBOM + provenance attestation · heredoc `RUN` · build-time vs runtime config · one process per container · PID-1 signal forwarding · static binary on `scratch` · multi-platform (amd64 + arm64) · composable bases as stage-libraries · dependency-reflecting health endpoints · init-container / migration. Plus the 7 anti-patterns and the reuse-first sweep. |
| **Security** | [`references/security.md`](references/security.md) | Threat model · OWASP Docker Top 10 mapping · the 15 mandatory security rules (non-root, digest pinning, no secrets in image, CVE scanning, SBOM, Cosign signing, distroless, read-only rootfs, dropped capabilities, no `--privileged`, vulnerable defaults, egress documentation, layer minimisation, compromised-image detection, registry hardening) · per-stack hardening for Node.js, Python, Go, Rust, Java · Hadolint security rules. |
| **Testing** | [`references/testing.md`](references/testing.md) | The 5 test layers: image structure (container-structure-test, Goss) · smoke tests · Testcontainers integration · vulnerability + supply-chain scanning (Trivy, Dockle, Dive, Cosign verify) · compliance scans (CIS Docker, Pod Security Standards, FIPS). Plus CI gate composition, the 10 hard rules, and the tool table. |

### Fast routing by intent

| You are... | Start at |
| --- | --- |
| Writing or reviewing a `Dockerfile` | `coding-style.md`, then `patterns.md` for the build shape |
| Wiring the gates that enforce it | `hooks.md` |
| Hardening an image, or answering an audit finding | `security.md` |
| Adding tests, or a CI job failed | `testing.md` |
| Cutting image size or build time | `patterns.md` (cache mounts, distroless, scratch), then `testing.md` (Dive wasted-space rule) |
| Handling a secret at build time | `patterns.md` Pattern 4 + `security.md` rule 3 — never `ENV`/`ARG` |

## Cross-references

Each reference file carries its own `Standards cited`, `Cross-references`, `Why this
rule exists` and `Learning hooks` sections — they were not merged here, so the citation
travels with the guidance it supports.
