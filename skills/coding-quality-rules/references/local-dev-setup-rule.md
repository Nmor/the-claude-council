# Local Dev Setup Rule (Always-On, Global)

> Auto-fires on every file. Sister to `local-testability.md`
> (every change must be locally testable BEFORE writing code),
> `secrets-management.md` (vault-based secrets), `docker-localhost-
> binding.md` (port binding), `documentation-requirements.md`
> (README + setup docs), `dependency-pinning.md` (reproducible
> versions), `task-intake-due-diligence.md` Q14.

## Core Principle

**A fresh-checkout developer must be running the system locally
within 30 minutes of `git clone`, using exclusively documented
commands. Setup is one script (or one container) — never a
multi-page README with surprise prerequisites. Local
configuration mirrors production wherever feasible; where it
differs, the differences are documented.**

A 4-hour setup ritual is a 4-hour productivity tax on every new
team member, every CI runner, every developer who switches
machines, and every contributor who tries the project. Frictionless
local dev pays for itself within weeks.

## Hard rules

### 1. One bootstrap command

The README's quick-start section ends with a single command that
produces a running system:

```bash
# Option A: dev container (preferred when available)
code . --reuse-window  # VS Code reopens in devcontainer

# Option B: bootstrap script
./scripts/bootstrap.sh

# Option C: package-manager-native
pnpm dev   # or `make dev`, `bun dev`, etc.
```

If the answer is "well, you also need to install X, Y, Z first,"
the script handles that — checking for presence + offering to
install (with user consent per `install-allowlist.md`).

### 2. Tool versions are pinned + enforced

Per `dependency-pinning.md`:

- `.nvmrc` / `.tool-versions` (asdf) / `.python-version` (pyenv)
- `Gemfile` Ruby version pin
- `go.mod` `go X.Y` directive
- `rust-toolchain.toml`
- `packageManager` field in `package.json` (Corepack)

Bootstrap script validates the active versions match the pinned
ones; if not, it warns + offers to switch via the version
manager.

### 3. Service dependencies via Docker Compose

Local DB, cache, queue, search index — all via `docker-compose.yml`
in the repo. Per `docker-localhost-binding.md`, every port is
loopback-bound:

```yaml
services:
  postgres:
    image: postgres:16.4-alpine@sha256:...
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_PASSWORD: dev-only-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.4-alpine@sha256:...
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

volumes:
  postgres_data:
```

`docker compose up -d` is the answer. `docker compose down -v`
resets state.

### 4. Secrets come from the vault, not from a checked-in file

Per `secrets-management.md`:

- `.env.example` lists every variable the app reads, with
  placeholder values
- `.env` is git-ignored
- `pnpm setup-env` / `make env` script:
  - For dev secrets: pulls from a shared dev vault (1Password,
    AWS Secrets Manager dev path, doppler)
  - For local-only secrets (DB password matching the
    docker-compose value): writes to `.env` with a comment
    explaining the origin
- `docs/secrets.md` documents every secret:
  - Local source (vault path / generated / Docker default)
  - Production source (per environment)
  - Rotation cadence

NEVER check in real secrets, even "for the demo." The dev
environment is no exception.

### 5. Database state is bootstrappable

`pnpm db:setup` (or equivalent) runs:

1. Apply all migrations
2. Seed reference data (lookup tables, plans, roles)
3. Seed demo data (a known set of users, orders, tenants for
   testing)

Seed scripts are idempotent (per `idempotency.md`); running
twice = same result.

For services with massive prod data, a "minimal" seed (smallest
set sufficient to exercise the system) plus an optional "rich"
seed (more representative). The README documents both.

### 6. Production parity where it matters; clear differences where it doesn't

| Aspect | Local | Production |
| --- | --- | --- |
| **Language runtime version** | Same (pinned) | Same |
| **OS** | Different (devs on macOS / Linux / Windows) | Linux |
| **Database engine** | Same (Postgres → Postgres) | Same |
| **DB tier** | Single container | Managed (RDS, Cloud SQL) |
| **Object store** | LocalStack S3 / MinIO | AWS S3 |
| **Cache** | Redis container | ElastiCache / Memorystore |
| **Search** | OpenSearch container | OpenSearch Service |
| **Auth** | Mock JWT issuer / Keycloak container | Cognito / Auth0 / Keycloak prod |
| **Email** | MailHog / Mailpit (catches outbound) | SES / SendGrid |
| **SMS** | Log-only adapter | Twilio |
| **Payments** | Stripe test mode | Stripe live |

Production-specific behaviour (real card processing, real SMS
delivery) is OFF locally; the code paths are exercised against
mock adapters that record + assert.

### 7. The verify script is one command

Per `done-criteria.md` + `extreme-lint-policy.md`:

```bash
pnpm verify   # OR: ./scripts/verify-local.sh
```

This runs:

1. Lint (every linter per `extreme-lint-policy.md`)
2. Type check
3. Unit tests
4. Integration tests
5. Build
6. License gate (per `license-allowlist-gate.md`)
7. CVE gate (per `dependency-vulnerabilities.md`)
8. Markdown lint
9. Security scan (gitleaks)
10. Docs link-check

The same script runs in CI. Local-vs-CI parity prevents "passes
locally, fails in CI" surprises.

### 8. Dev container as the canonical option

When the project supports a `.devcontainer/`:

- VS Code / Cursor / Codespaces / JetBrains Gateway open the
  project in the container
- The container has every tool pre-installed at the pinned
  versions
- Setup time → seconds (after first pull)
- Consistent across all developers; no "my machine is special"

Configuration:

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "myapp",
  "build": { "dockerfile": "Dockerfile" },
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "pnpm install && pnpm db:setup",
  "postStartCommand": "pnpm dev",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-azuretools.vscode-docker"
      ]
    }
  }
}
```

### 9. Cross-platform support

Developers on macOS, Linux, Windows (WSL2). Bootstrap script:

- Detects platform; routes to platform-specific steps
- Uses cross-platform tools (`pnpm`, `cargo`, `go`, `python`) —
  not Bash-only scripts that break on Windows native cmd
- Tests run on every platform in CI (matrix builds)

For Windows native (non-WSL2): document the WSL2-recommendation
or provide native instructions; don't leave it to the developer.

### 10. The setup is itself tested

CI includes a "fresh-clone bootstrap" job:

```yaml
- name: Test bootstrap
  run: |
    git clone . /tmp/fresh
    cd /tmp/fresh
    ./scripts/bootstrap.sh
    ./scripts/verify-local.sh
```

If bootstrap breaks, CI catches it BEFORE the next developer
tries to clone.

## Per-stack templates

### Node.js / TypeScript

```text
.
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
├── .nvmrc                  # node version
├── .npmrc                  # registry config
├── .gitignore
├── .env.example
├── docker-compose.yml      # dependent services
├── package.json
│   └── packageManager: "pnpm@10.4.0"
├── pnpm-lock.yaml
├── scripts/
│   ├── bootstrap.sh        # one-shot setup
│   ├── verify-local.sh     # same as CI
│   └── db-seed.ts
└── README.md
```

### Go

```text
.
├── .devcontainer/...
├── .tool-versions          # asdf-managed go version
├── .gitignore
├── .env.example
├── docker-compose.yml
├── go.mod
├── go.sum
├── Makefile                # bootstrap, dev, test, verify targets
└── README.md
```

`Makefile`:

```makefile
.PHONY: dev test verify bootstrap

bootstrap:
 @./scripts/bootstrap.sh
dev:
 @docker compose up -d
 @go run ./cmd/server
test:
 @go test -race -count=1 ./...
verify:
 @go vet ./...
 @staticcheck ./...
 @golangci-lint run ./...
 @govulncheck ./...
 @make test
```

### Python

```text
.
├── .devcontainer/...
├── .python-version         # pyenv
├── pyproject.toml          # poetry-managed
├── poetry.lock
├── docker-compose.yml
├── scripts/
│   ├── bootstrap.sh
│   └── verify-local.sh
└── README.md
```

### Mobile (React Native / Flutter)

- Native dev tools required (Xcode for iOS, Android Studio + SDK
  for Android)
- Bootstrap script checks for SDK presence + version
- Simulators / emulators documented (specific images, sizes)
- Bridging native module versions to JS via `Podfile.lock` (iOS)
  and `gradle.properties` (Android)

## Anti-patterns

### Anti-pattern 1: README that's a wiki

A README with 20 sections, each describing a different setup
quirk for a different OS / IDE / language version, is no
substitute for a script. The user reads the script, the script
HANDLES the quirks.

### Anti-pattern 2: Shared dev database

"Just connect to the staging DB for local dev" — no. Local must
be fully local-state. Reasons: data destruction risk in
staging, accidental PII access, network dependency for offline
work, parallel developer state corruption.

### Anti-pattern 3: Mock that's only-the-happy-path

Mock email adapter that just returns success teaches developers
to expect success — they never test the failure path. Mocks
should be configurable: success / failure / latency / specific
errors.

### Anti-pattern 4: Setup that requires production access

Bootstrap that calls a real cloud API (real S3 bucket, real
Auth0 tenant, real Stripe account) requires every developer to
have credentials + costs money + risks production. Use
LocalStack / MinIO / mock servers instead.

### Anti-pattern 5: 5-minute timer that's really 5 hours

If bootstrap claims "5 minutes" but actually takes 5 hours (long
docker pulls, OS-specific quirks, hidden post-install steps),
measure + publish the real time. The expectation gap is more
damaging than the duration.

### Anti-pattern 6: No teardown

`docker compose down -v` for full reset. `pnpm clean` for build
artifacts. `pnpm db:reset` for DB. Without these, devs end up
with "weird state" they can't diagnose.

## Documentation

The README's "Local development" section:

```markdown
## Local development

### Prerequisites

- Docker Desktop (or compatible Linux Docker)
- Node 22.4+ (we recommend `nvm`: `nvm use`)
- 4GB free disk + 4GB free RAM

### Setup

```bash
git clone https://github.com/example/repo.git
cd repo
./scripts/bootstrap.sh   # ~5 minutes on first run
pnpm dev                 # starts the app + dependencies
open http://localhost:3000
```text

### Common tasks

- `pnpm dev` — run with hot reload
- `pnpm test` — run the test suite
- `pnpm verify` — run everything CI runs
- `pnpm db:reset` — wipe + reseed the DB
- `docker compose down -v` — full teardown

### Troubleshooting

See [docs/local-dev-troubleshooting.md](docs/local-dev-troubleshooting.md).

```

## Cross-references

- `local-testability.md` — code must be locally testable BEFORE
  writing (this rule makes that possible)
- `secrets-management.md` — vault-based secret distribution
- `docker-localhost-binding.md` — loopback-bound ports
- `documentation-requirements.md` — README + setup docs
- `dependency-pinning.md` — version pinning
- `repo-setup-checklist.md` — first-touch checklist
- `done-criteria.md` — verify script gate
- `extreme-lint-policy.md` — lint gates
- `task-intake-due-diligence.md` Q14 (test strategy depends on
  local-testability)

## Standards cited

- **Dev Containers Specification** (containers.dev)
- **Twelve-Factor App** — Factor X (Dev/prod parity)
- **CommonMark** — README format
- **POSIX shell** — for portable bootstrap scripts

## Why this rule exists

A team's productivity is bounded by its slowest-onboarding
process. Local dev setup that takes weeks instead of hours
costs:

- Direct: new hires sit idle; existing devs lose time
  troubleshooting
- Indirect: the team avoids touching components that are hard to
  spin up; technical debt concentrates in the un-touched
  components
- Strategic: contributors don't contribute; OSS PRs stall;
  customers can't self-serve

Investment in local dev pays back perpetually. The bootstrap
script that takes one engineer-week to write saves five
engineer-weeks per quarter forever.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New repo's bootstrap takes > 30 minutes for a fresh-clone developer (rule 1 violation — frictionful first-run)
- Tool version not pinned via `.nvmrc` / `.tool-versions` / equivalent (rule 2 weakening)
- Service dependency not in `docker-compose.yml` (rule 3 weakening — implicit local install)
- Real cloud credentials required for local dev (rule 4 violation — secrets-on-disk drift)
- Secret checked-in to `.env` instead of populated from vault (rule 4 + `secrets-management.md` weakening)
- DB seed script not idempotent (rule 5 weakening)
- Local-vs-CI gate divergence (`pnpm verify` ≠ CI gate set) — rule 7 violation
- Dev container `postCreateCommand` broken on a fresh pull (rule 8 weakening)
- "Setup that requires production access" anti-pattern recurrence
- Bootstrap script not tested in CI (rule 10 weakening — fresh-clone CI job missing)

**Refinement candidates**:

- New row in the prod-parity table when a recurring service class (vector DB, search engine, ML model server) emerges
- Tightening of the bootstrap time budget when 30-min target consistently slips
- New cross-language template when a stack (React Native, Flutter, Tauri, Solidity) needs platform-specific bootstrap
- New "mock adapter" entry when a recurring external dep (real Stripe / Twilio / SendGrid) needs a documented local substitute

---
