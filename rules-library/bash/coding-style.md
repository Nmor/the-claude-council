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

Per `~/.claude/rules/common/extreme-lint-policy.md` — shell
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

- `~/.claude/rules/common/coding-style.md`
- `~/.claude/rules/bash/no-discards.md`
- `~/.claude/rules/bash/security.md`
- `~/.claude/rules/bash/testing.md`
- `~/.claude/rules/bash/patterns.md`
- Bash Reference Manual (gnu.org/software/bash/manual)
- Google Shell Style Guide
- ShellCheck wiki (github.com/koalaman/shellcheck/wiki)
