# Lua Hooks

> Auto-fires on every `*.lua`, `*.rockspec`, `*.luacheckrc` file.
> Sister to `~/.claude/rules/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_lua=$(git diff --cached --name-only --diff-filter=ACMR \
    | grep -E '\.lua$' || true)
[ -z "$staged_lua" ] && exit 0

# Syntax check
for f in $staged_lua; do
    luac -p "$f"
done

# Lint
luacheck --no-cache --std max+busted $staged_lua

# Format (stylua)
stylua --check $staged_lua
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Run busted tests on every supported Lua version
if [ -d spec/ ]; then
    busted -v
fi

# Coverage gate
if [ -f .luacov ]; then
    busted --coverage
    luacov
    coverage=$(grep -oP 'Total.*\K[0-9.]+(?=%)' luacov.report.out)
    if (( $(echo "$coverage < 80" | bc -l) )); then
        echo "Lua coverage $coverage% < 80%"
        exit 1
    fi
fi
```

## CI workflow

```yaml
name: Lua CI

on: [push, pull_request]

jobs:
  lint-and-test:
    strategy:
      matrix:
        lua: ["5.1", "5.2", "5.3", "5.4", "luajit"]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>

      - name: Install Lua + LuaRocks via hererocks
        run: |
          pip install hererocks
          hererocks .lua --${{ matrix.lua }} --luarocks=latest

      - name: Activate Lua
        run: source .lua/bin/activate

      - name: Install dev deps
        run: |
          luarocks install luacheck
          luarocks install busted
          luarocks install luacov
          luarocks install luacov-html

      - name: Syntax check
        run: |
          find . -name '*.lua' -not -path './.lua/*' \
            -exec luac -p {} +

      - name: Lint
        run: luacheck --no-cache --std max+busted .

      - name: Test
        run: busted --coverage spec/

      - name: Coverage
        run: |
          luacov
          coverage=$(grep -oP 'Total.*\K[0-9.]+(?=%)' luacov.report.out)
          if (( $(echo "$coverage < 80" | bc -l) )); then
              echo "Coverage $coverage% < 80%"
              exit 1
          fi

      - uses: codecov/codecov-action@<sha>
        with: { files: luacov.report.out }

  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - name: Install stylua
        run: |
          curl -sSL https://github.com/JohnnyMorganz/StyLua/releases/latest/download/stylua-linux-x86_64.zip \
            -o /tmp/stylua.zip
          unzip /tmp/stylua.zip -d /usr/local/bin/
      - run: stylua --check .
```

## `.luacheckrc` (strict baseline)

```lua
std = "max+busted"
codes = true
ranges = true

max_line_length = 120
max_cyclomatic_complexity = 7        -- per extreme-lint-policy
max_returns = 4
max_arguments = 5

allow_defined_globals = false
allow_defined_top = false

files["**/*_spec.lua"] = { std = "max+busted" }
files["**/*.lua"] = {
    max_line_length = 120,
    max_cyclomatic_complexity = 7,
    max_returns = 4,
    max_arguments = 5,
}

ignore = {
    -- ignored rule, document inline why
}
```

## `stylua.toml`

```toml
column_width = 100
line_endings = "Unix"
indent_type = "Spaces"
indent_width = 4
quote_style = "AutoPreferDouble"
call_parentheses = "Always"
```

## OpenResty-specific

```bash
# Nginx config syntax check (when Lua is embedded)
nginx -t -c /path/to/nginx.conf

# Static security scan
gixy /path/to/nginx.conf
```

## Neovim plugin-specific

```bash
# Headless busted run
nvim --headless -c "PlenaryBustedDirectory tests/ {minimal_init = 'tests/minimal_init.lua'}"

# Run :checkhealth + Lua diagnostics
nvim --headless -c "checkhealth" -c "qa"
```

## Cross-references

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/lua/no-discards.md`
- `~/.claude/rules/lua/testing.md`
- `~/.claude/rules/lua/security.md`
- luacheck (github.com/mpeterv/luacheck)
- stylua (github.com/JohnnyMorganz/StyLua)
- busted (lunarmodules.github.io/busted/)
- luacov (keplerproject.github.io/luacov/)
- hererocks (github.com/mpeterv/hererocks)
