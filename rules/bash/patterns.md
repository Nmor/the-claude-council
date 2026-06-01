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

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/bash/coding-style.md`
- `~/.claude/rules/bash/no-discards.md`
- `~/.claude/rules/bash/security.md`
- Bash Hackers Wiki
- BashFAQ (mywiki.wooledge.org/BashFAQ)
- ShellCheck wiki
