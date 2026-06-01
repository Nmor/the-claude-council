# Bash / Shell — No-Discards Extension

> Auto-fires on every `*.sh`, `*.bash`, `*.zsh` file. Extends
> `~/.claude/rules/common/no-discards.md`. Tooling: **ShellCheck
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

Per `~/.claude/rules/common/secrets-management.md`.

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

```
Bash sweep (this turn):
  - shellcheck -S style: 0 findings
  - shfmt -d -i 4 -ci -bn -sr: clean
  - bats tests/: PASS
  - All scripts start with `set -euo pipefail`
```

## Cross-references

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- `~/.claude/rules/common/secrets-management.md`
- `~/.claude/rules/bash/coding-style.md`
- `~/.claude/rules/bash/security.md`
- ShellCheck wiki (github.com/koalaman/shellcheck/wiki)
- Bash Pitfalls (mywiki.wooledge.org/BashPitfalls)
