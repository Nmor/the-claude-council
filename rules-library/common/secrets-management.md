# Secrets Management Rule (Global Default)

> Auto-fires on every file. Sister to `no-discards.md` (which already
> blocks hardcoded creds on save), `docker-localhost-binding.md`, and
> `security-controls-org-wide.md`.

## Core Principle

**No secret ever lives on disk in cleartext in a developer machine or
in any git history. Every secret is held in a secrets vault
(macOS Keychain via aws-vault, AWS Secrets Manager, Vault, 1Password
CLI, doppler, etc.) and surfaced to the process at runtime via env
vars / credential_process / sidecar.**

The four canonical failure modes this rule prevents:

1. A secret in `~/.aws/credentials` (or equivalent) plaintext, mode 644,
   readable by any process on the laptop.
2. A secret in a tracked `.env` / `.env.production` file in git
   history, fetchable by any past, present, or future contributor.
3. A secret in an example payload (Postman collection, fixture file,
   sample request) committed to a repo for convenience.
4. A secret echoed in CI logs, Slack messages, or screenshots.

Each is the leading cause of a real-world cloud breach over the past
decade. The fix in every case is the same shape: vault the secret,
reference it via env var at runtime, and gate the path with the
checks in this rule.

## Hard rules

### 1. Cloud credentials: vault, never disk

- AWS keys: `~/.aws/credentials` MUST NOT contain a long-term `AKIA…`
  key. The canonical pattern is:
  - The IAM key lives in macOS Keychain via `aws-vault add <profile>`.
  - `~/.aws/config` carries `credential_process = aws-vault exec
    --no-session --json <profile>` (or `--no-session` dropped when MFA
    is set up).
  - AWS CLI / SDK reads the key from Keychain transparently.
- Google Cloud: `gcloud auth login` (interactive) or short-lived
  workload-identity. Service-account JSON keys never on developer
  laptops.
- Azure: `az login` (interactive) or managed identity.
- GitHub: `gh auth login` stores the token in macOS Keychain (which
  `gh` uses by default since 2.x). Never paste a PAT into `.netrc`.

### 2. App-level secrets: env vars + secrets manager

For the application's own runtime secrets (Stripe, Twilio, OpenAI,
JWT signing keys, DB passwords, OAuth client secrets):

- **Production**: AWS Secrets Manager (preferred for AWS workloads),
  GCP Secret Manager, Vault, Doppler, or 1Password Secrets Automation.
  Service reads at startup via the cloud's IAM-bound credentials.
- **Local dev**: `.env` file (gitignored), populated from the same
  secrets manager via `aws secretsmanager get-secret-value` (or
  equivalent) on first checkout. Never check the populated `.env`
  into git.
- **Local LocalStack mocks** (where applicable): seed the same secrets
  into LocalStack Secrets Manager via the project's `init.sh` script.
  The app then reads from `host.docker.internal:4566` in development
  and from AWS in prod — same code path.

### 3. Gitignore patterns (mandatory in every repo)

Every project's root `.gitignore` MUST cover at least:

```gitignore
# Runtime secrets
.env
.env.*
!.env.example
!.env.template

# Cloud credentials
.aws/credentials
*.pem
*.key
*_rsa
*_rsa.pub        # public keys are safer than private but still personal
*_ed25519
*_ed25519.pub
id_rsa*
id_ed25519*

# Secrets managers
.vault-token
.netrc

# IDE per-user config
.idea/workspace.xml
.vscode/settings.json   # only if it has been seen to hold tokens

# Postman / Insomnia collections may carry per-environment responses
*.postman_environment.json
```

A repo MUST also `git ls-files | grep -E "^\.env(\.|$)"` empty. Any
`.env` tracked is a finding to fix.

### 4. Pre-commit secret scanning

Every repo runs `gitleaks` (or `trufflehog`) on `pre-commit` AND in
CI. The minimum config:

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/gitleaks/gitleaks
  rev: v8.21.4
  hooks:
    - id: gitleaks
```

CI step:

```yaml
- name: Secret scan
  uses: gitleaks/gitleaks-action@v2.3.9
  with:
    config-path: .gitleaks.toml
```

Findings block the commit / PR. False positives go to `.gitleaksignore`
with a one-line justification.

### 5. Postman / Insomnia / Bruno / API client collections

Two patterns are common pitfalls:

- **Example response bodies** containing real AWS presigned URLs (which
  include the AKIA key ID), real JWTs, real session cookies.
- **Environment files** with real prod tokens "for convenience".

Mandatory:

- Strip example responses before commit (`Postman → Save → Save without
  responses`). Or set the request to "Don't save responses".
- Use Postman `{{variable}}` syntax for tokens. The actual values live
  in an `*.postman_environment.json` that is **gitignored** by default.
- `.gitignore` MUST cover `*.postman_environment.json` and the
  `_history/` directories.

### 6. RSA / ed25519 private keys

NO private key ever enters git. Period.

Test fixtures that need a key pair (e.g. JWT signing tests, mTLS tests,
SSH host-key tests) MUST generate the key at test setup time:

```go
func TestJWTSigning(t *testing.T) {
    priv, err := rsa.GenerateKey(rand.Reader, 2048)
    require.NoError(t, err)
    // use priv during the test, discard at exit
}
```

The only key files allowed in a repo:

- `.pub` files (public material, used to verify signatures or pin
  hosts). These are not secret but they leak project shape — scrutinise
  why they need to be checked in.
- `.example` / `.template` placeholder PEMs with a 1-line "this is a
  generated test fixture, regenerate with X" comment at top.

### 7. Kubernetes secrets

Never commit a `Secret` manifest with `data:` base64-encoded creds in
plaintext. Patterns that ARE acceptable:

- **Sealed Secrets** (`bitnami-labs/sealed-secrets`): the
  `SealedSecret` CRD encrypts the value with the cluster's controller
  public key. Anyone can read the manifest, only the cluster can decrypt.
- **External Secrets Operator** (`external-secrets/external-secrets`):
  the `ExternalSecret` CRD references AWS Secrets Manager / Vault /
  GCP and the operator hydrates a `Secret` at runtime.
- **HashiCorp Vault sidecar** / Vault Agent Injector: pod annotations
  cause Vault to mount secrets into the container at boot.

If you see a `Secret` manifest with raw `data:` in any repo, it's a
finding.

### 8. Secret rotation policy

- AWS IAM long-term keys: rotated every 90 days at minimum. Audit via
  `aws iam list-access-keys --user-name <u> --query 'AccessKeyMetadata[?CreateDate<=`2025-02-01`]'`.
  Prefer IAM Identity Center (SSO) over long-term keys entirely.
- JWT signing keys: rotated quarterly, with an in-flight overlap
  window so existing tokens stay valid until expiry.
- Stripe live keys: rotated only on incident or staff turnover (Stripe
  doesn't recommend prophylactic rotation; their guidance is to rotate
  on compromise signal).
- OAuth client secrets: rotated when a team member with access leaves.
- DB passwords: rotated via secrets-manager versioning, app rolls on
  next deploy.

### 9. When a secret is suspected exposed

The recovery flow (in this exact order):

1. **Rotate FIRST**, scrub LATER. Generate a new credential and
   deactivate / delete the old one in the issuer's console. The window
   between "I think it leaked" and "the old key still works" is the
   real risk; cutting that window to minutes is the highest-leverage
   move.
2. **Audit access logs** for the exposed credential's use during the
   exposure window. AWS CloudTrail, GitHub audit log, Stripe Dashboard
   → Logs, etc.
3. **Scrub the git history** with `git filter-repo --invert-paths
   --path <file>` (or BFG Repo Cleaner). Force-push the rewritten
   history (coordinate with team — everyone needs to re-clone).
4. **Document** the incident in `docs/security-incidents.md` (or the
   project equivalent) with date, scope, evidence of misuse (or none),
   and remediation timeline.

NEVER skip step 1. Scrubbing without rotating is theatre.

## What this rule means for new repos

Every new repo Claude creates (or first-touches) follows the checklist
in `repo-setup-checklist.md` § "Secrets surface", which includes:

- `.gitignore` covers .env, *.pem, *.key, etc.
- Pre-commit hook with gitleaks
- `.env.example` exists with placeholders (no real values)
- `docs/secrets.md` documents where each secret comes from (AWS
  Secrets Manager / aws-vault / etc.)
- CI runs a secret-scan job

## Cross-references

- `repo-setup-checklist.md` — the "first contact with a repo" checklist
- `no-discards.md` — the PostToolUse hook already rejects edits that
  introduce hardcoded credentials with the canonical prefixes
- `docker-localhost-binding.md` — ports-side counterpart to this rule
- `security-controls-org-wide.md` — 5-layer enforcement pattern
- `no-overclaim.md` — never claim "done" on a security task without
  the rotation + history scrub steps both completed

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Long-term AWS access key (`AKIA...`) found in `~/.aws/credentials` (rule 1 violation — Keychain via aws-vault required)
- `.env` tracked by git (rule 3 violation)
- Private key (`*.pem`, `*.key`, `id_rsa*`) found in repo (rule 6 violation)
- Postman / Insomnia collection committed with real response bodies (rule 5 violation)
- Kubernetes `Secret` manifest with raw `data:` (rule 7 violation — Sealed/External Secrets required)
- Rotation done step-by-step instead of via atomic script (per `proper-fixes-first.md`)
- Suspected exposure: scrub attempted before rotation (rule 9 violation — rotate FIRST)
- Pre-commit hook missing or not catching the leak in CI
- Secret format-validation skipped on push to vault

**Refinement candidates**:
- New vault provider row when a new secrets manager gains adoption
- Tightening of the rotation cadence table when a regulator (PCI / SOC2) updates frequency requirements
- New banned-pattern entry when a new credential prefix shape recurs
- New cross-reference when a sister rule (no-discards, install-allowlist) provides complementary hook enforcement
