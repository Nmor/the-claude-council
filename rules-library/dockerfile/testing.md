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
