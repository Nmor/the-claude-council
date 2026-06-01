# Repo Setup Checklist (Global Default)

> Auto-fires on every file. Triggered explicitly when a new repo is
> cloned, initialised, or first-touched by Claude. Sister to
> `secrets-management.md`, `docker-localhost-binding.md`,
> `dependency-vulnerabilities.md`, `license-allowlist-gate.md`, and
> `done-criteria.md`.

## Core Principle

**Before any real work happens in a freshly cloned repo, run the
20-point setup-time security & posture checklist. Every item is
either green or gets remediated in the same session.** A repo that
fails any item is not "ready to work in" — it's "broken on arrival,
fix first."

The cost of these checks at clone-time is ~3 minutes. The cost of
discovering a tracked `.env` or an unbound port after a week of
edits is hours of git-history surgery and credential rotation.

## When this rule fires

- A new repo is cloned (`git clone <url>` or similar).
- An existing-but-never-touched repo is opened for the first time
  in this Claude Code session.
- A repo whose last touch was > 30 days ago — re-run since posture
  drifts (dep CVEs accumulate, .env patterns evolve).
- Explicitly: any time the user says "set up this repo" / "start
  working on X" / "let's audit repo Y".

## The checklist (20 items)

### Tracked-state hygiene (5 items)

1. **`.gitignore` covers secret patterns.** Required entries:
   `.env`, `.env.*` (with `!.env.example` whitelist), `*.pem`,
   `*.key`, `id_rsa*`, `id_ed25519*`, `.aws/credentials`,
   `*.postman_environment.json`, `.vault-token`, `.netrc`. See
   `secrets-management.md` for the full list.

2. **No `.env` tracked by git.**
   `git ls-files | grep -E "^\.env(\.|$)" | grep -v example`
   must return empty. Any match → `git rm --cached <file>` + add
   to `.gitignore`.

3. **No `*.pem` / `*.key` / `id_*` tracked by git** EXCEPT:
   - `*.pub` (public material — verify the file is genuinely public)
   - `.example`-suffixed placeholders with a 1-line "this is a
     generated test fixture" comment at top

4. **No Postman / Insomnia / Bruno collection with real response
   bodies.** Open each `*.postman_collection.json` and verify:
   - No `AKIA[A-Z0-9]{16}` (AWS Access Key)
   - No `ghp_` / `gho_` / `xoxb-` / `sk-` / `sk_live_` prefixes in
     `response` blocks
   - All auth tokens reference `{{variable}}` placeholders

5. **No commited `Secret` manifest with raw base64 data.**
   `grep -rn "kind: Secret" --include='*.yml' --include='*.yaml'`
   then verify each is a `SealedSecret`, `ExternalSecret`, or has
   `stringData:` populated by a deploy-time tool.

### Dependency posture (4 items)

6. **CVE gate passes.**
   - Node: `pnpm audit --audit-level=moderate` (or `npm audit`)
     returns exit 0
   - Go: `go run golang.org/x/vuln/cmd/govulncheck@latest ./...`
     returns "No vulnerabilities found"
   - Python: `pip-audit -r requirements.txt` exit 0
   - Ruby: `gem exec bundler-audit check` exit 0

7. **License-allowlist gate passes** (`osv-scanner --licenses=<list>`)
   per `license-allowlist-gate.md`.

8. **No abandoned-dep flags.** Per `updated-frameworks.md`, the
   known-bad list (`request`, `node-sass`, `aws-sdk` v1,
   `dgrijalva/jwt-go`, `golang/mock`, `jinzhu/gorm` v1, etc.) is
   absent.

9. **Lockfile present and committed.** `package-lock.json` /
   `pnpm-lock.yaml` / `go.sum` / `Pipfile.lock` / `poetry.lock` /
   `Gemfile.lock` / `Cargo.lock` is present.

### Infra posture (4 items)

10. **Docker compose ports loopback-bound.** Per
    `docker-localhost-binding.md`, every `ports:` entry in every
    `docker-compose*.yml` is `127.0.0.1:` prefixed (or uses a
    `${PUBLIC_BIND:-127.0.0.1}` env-var pattern for prod-aware repos).

11. **Dockerfile uses a non-root user** for production stages.
    `grep "^USER" Dockerfile` must show a non-root identity.

12. **Health checks declared** for every long-running service.
    Compose entries have `healthcheck:` blocks; Dockerfiles use
    `HEALTHCHECK CMD`.

13. **Multi-stage builds** for any image that includes a compiler
    or full SDK. The final stage carries only the binary +
    runtime deps.

### Secrets posture (3 items)

14. **`.env.example` exists** at the repo root (or service root in
    a monorepo) and lists every env var the app reads, with
    placeholder values (`changeme`, `your-token-here`,
    `EXAMPLE_VALUE`).

15. **`docs/secrets.md`** (or equivalent) documents where each
    real secret comes from in production AND in dev:
    - "STRIPE_SECRET_KEY: prod = AWS Secrets Manager `prod/stripe`;
       local = `aws-vault exec <profile> -- pnpm dev`"

16. **No long-term AWS key on disk.** `cat ~/.aws/credentials` shows
    no `aws_access_key_id = AKIA...` lines. The IAM key lives in
    Keychain via `aws-vault`; `.aws/config` uses
    `credential_process`.

### CI / quality gates (4 items)

17. **CI runs the same gates the local pre-flight script runs.**
    `.github/workflows/*.yml` (or equivalent) includes:
    - CVE scan (gitleaks + dep-audit + license-check)
    - Build
    - Test with coverage threshold
    - Static analysis (eslint / staticcheck / ruff / rubocop)

18. **Pre-commit hook installed.** `.pre-commit-config.yaml` exists
    OR `.githooks/pre-commit` is enabled via `git config
    core.hooksPath .githooks`. Hooks must include gitleaks and
    the dep-CVE gate.

19. **Test runner configured and passing.** `pnpm test` / `go test
    ./...` / `pytest` / `bundle exec rspec` succeeds on a fresh
    checkout.

20. **Branch protection on the default branch** (when GitHub /
    GitLab repo). Requires PR review + status checks before merge,
    blocks force-push to default, requires signed commits.

## Mechanical sweep script (the canonical pattern)

A one-shot script that runs all 20 checks in order. Each project's
local pre-flight script (`infra/verify-local.sh`,
`scripts/preflight.sh`, or equivalent) should embed this.

Minimal shape:

```bash
#!/usr/bin/env bash
# infra/verify-repo-setup.sh
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FAILED=()

echo "── Tracked-state hygiene ──"
if git -C "$REPO_ROOT" ls-files | grep -qE "^\.env(\.|$)" | grep -vq example; then
  FAILED+=(".env tracked by git")
fi

# ... etc, one section per item

if [ ${#FAILED[@]} -eq 0 ]; then
  echo "✓ repo setup green"
else
  printf "✗ %s\n" "${FAILED[@]}"
  exit 1
fi
```

The full script + per-language adaptations live at
`docs/security-templates/verify-repo-setup.sh` in the org's
`.github` repo (when present).

## What happens when this rule fires

Claude (or any agent) presented with a new repo MUST:

1. State explicitly: "Running repo-setup checklist on `<repo>` per
   `~/.claude/rules/common/repo-setup-checklist.md`."
2. Run each of the 20 checks (or the subset that applies to the
   repo's stack).
3. Report findings grouped by section.
4. Remediate the safe items automatically (gitignore additions,
   `git rm --cached` of tracked .env, etc.).
5. Surface the unsafe items (key rotation needed, history scrub
   needed) for user action.
6. Do not begin substantive feature work until the checklist is
   green OR the user has explicitly accepted a finding as
   documented technical debt.

## Why this rule exists

Repository security drifts over time. A repo that was green a year
ago accumulates:

- `.env.prod` checked in "just for a moment" that nobody reverted
- A Postman collection with a presigned-URL example response that
  carries a real AKIA key
- A test fixture private key that's been "fine for years" until a
  vulnerability scanner finds it
- Docker compose ports exposed on `0.0.0.0` because the original
  author "ran it on a server"
- Dep CVEs accumulated past `MODERATE+` because nobody renamed the
  audit-ignore list
- A CI workflow that runs tests but not the secret-scan step

Each of those is a 30-second fix at clone-time, OR a 4-hour
incident-response at discovery-time. This checklist is the cheap
side of that trade.

## Cross-references

- `secrets-management.md` — the secret-handling rule this enforces
  at setup time
- `dependency-vulnerabilities.md` — CVE gate item 6
- `license-allowlist-gate.md` — license gate item 7
- `updated-frameworks.md` — abandoned-dep list for item 8
- `docker-localhost-binding.md` — port binding item 10
- `done-criteria.md` — the full "ready to ship" gate; this
  checklist is the "ready to start" complement
- `no-overclaim.md` — never claim "repo is ready" until all 20
  items are green

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New repo opened without the 20-point checklist run on first touch (rule "When this rule fires" weakening)
- `.env` found tracked in git on first-touch (item 2 violation)
- Private key (`*.pem`, `*.key`, `id_rsa*`) found tracked (item 3 violation)
- Postman / Insomnia collection with real response bodies committed (item 4 violation)
- `Secret` manifest with raw base64 found (item 5 violation)
- Lockfile missing on first-touch (item 9 violation)
- Compose ports on `0.0.0.0` discovered on a developer machine (item 10 violation — sister rule `docker-localhost-binding.md`)
- Container running as root in production stage (item 11 violation)
- `.env.example` missing or stale relative to `application.yml` / `config.go` (item 14 weakening)
- CI gates diverge from local pre-flight (item 17 weakening)
- Branch protection missing on default branch (item 20 violation)

**Refinement candidates**:
- New checklist row when a recurring posture gap surfaces (e.g., `dependabot.yml` missing, `CODEOWNERS` missing, secret-scan CI step missing)
- Tightening of the 30-day re-check cadence when posture drift is observed sooner
- New cross-reference when a sister rule (secrets-management, install-allowlist, docker-localhost-binding) adds a new mechanical check
- Per-language addendum when a stack-specific item (e.g., `pnpm-lock.yaml` vs `package-lock.json`, `go.sum` integrity) recurs
