# Bash / Shell Hooks

> Auto-fires on every `*.sh`, `*.bash`, `*.zsh` file. Sister to
> `~/.claude/rules/common/hooks.md`.

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

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- `~/.claude/rules/common/secrets-management.md`
- `~/.claude/rules/bash/no-discards.md`
- `~/.claude/rules/bash/testing.md`
- ShellCheck (shellcheck.net)
- shfmt (github.com/mvdan/sh)
- bats-core (bats-core.readthedocs.io)
