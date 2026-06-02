---
name: lua-patterns
description: Lua 5.x discipline — module pattern (local M = {}; return M); local-everywhere (no global pollution); pcall/xpcall for protected calls with proper handler; safe loadstring (text-only via load(s, 'chunk', 't')); OO via metatables when needed; coroutines for cooperative concurrency; embedding-specific patterns (OpenResty cosockets, Neovim vim.api, Redis EVAL determinism); luacheck strict + stylua format-check; NEVER setfenv on untrusted code; NEVER load with bytecode flag from network. Auto-fires on Lua source.
paths:
  - "**/*.lua"
  - "**/*.rockspec"
  - "**/luarocks/*"
  - "**/.luacheckrc"
  - "**/.stylua.toml"
---

> Migrated 2026-06-02 from `~/.claude/rules-library/lua/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# lua-patterns

## Standards Cited

- **Lua 5.4 Reference Manual** (lua.org/manual/5.4) — lexical scope, metatables, coroutines, `pcall`/`xpcall` protected calls
- **Lua 5.4 §3.4.1** — operators + precedence (no operator overload outside metamethods)
- **Lua 5.4 §3.4.4** — `load` / `loadstring` with mode flag (`'t'` text-only, never `'b'` bytecode from untrusted)
- **LuaRocks 3.x** (luarocks.org/manual) — rockspec format + lockfile discipline
- **OWASP Top 10 A03:2021** — injection (the `loadstring` family is the Lua-side surface for the same class as RCE)
- **CWE-94** — Improper Control of Generation of Code (`load` on attacker-controlled string)
- **CWE-95** — Eval Injection (the `setfenv` + `load` combination is the Lua-side eval-injection shape)
- **ISO/IEC 19514** — UML conceptual reference for the module pattern (M-table-and-return shape)

<!-- ============================================================
     Section: lua/coding-style.md
     ============================================================ -->

---
paths:
  - "**/*.lua"
  - "**/*.rockspec"
---

# Lua Coding Standards

> Auto-activates for Lua source files. Used by the call-center-product for scripting and configuration.

## Checklist

- [ ] Lua 5.4 standard
- [ ] Local variables preferred over globals (`local` keyword)
- [ ] Metatables used correctly for OOP patterns
- [ ] Error handling via `pcall`/`xpcall` (not bare `error()` in production paths)
- [ ] String concatenation via `table.concat` for performance (not `..` in loops)
- [ ] Module pattern: return table of exports at file end

## Verification

```text
STEP 1: luac -p path/to/file.lua (syntax check)
STEP 2: luacheck path/to/file.lua (lint, if available)
STEP 3: Run test suite
```

---

<!-- ============================================================
     Section: lua/hooks.md
     ============================================================ -->

# Lua Hooks

> Auto-fires on every `*.lua`, `*.rockspec`, `*.luacheckrc` file.
> Sister to `~/.claude/rules-library/common/hooks.md`.

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

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/lua/no-discards.md`
- `~/.claude/rules-library/lua/testing.md`
- `~/.claude/rules-library/lua/security.md`
- luacheck (github.com/mpeterv/luacheck)
- stylua (github.com/JohnnyMorganz/StyLua)
- busted (lunarmodules.github.io/busted/)
- luacov (keplerproject.github.io/luacov/)
- hererocks (github.com/mpeterv/hererocks)

---

<!-- ============================================================
     Section: lua/no-discards.md
     ============================================================ -->

# Lua — No-Discards Extension

> Auto-fires on every `*.lua`, `*.rockspec`, `*.luacheckrc` file.
> Extends `~/.claude/rules-library/common/no-discards.md`. Tooling: `luacheck`,
> `stylua`, `busted`.

## Core Principle

**Every function return is bound; `pcall` / `xpcall` wraps every
operation that can error; nil checks before access; no globals
(local everywhere); luacheck runs at max strictness.**

## Banned patterns

### 1. Ignored multi-return

```lua
-- FORBIDDEN — second return (err) dropped
local result = doThing()
process(result)

-- CORRECT
local result, err = doThing()
if err ~= nil then
    log.warn("doThing failed", err)
    return nil, err
end
process(result)
```

### 2. Unprotected calls that can error

```lua
-- FORBIDDEN — error inside causes program crash
require("missing_module")
something_that_can_throw()

-- CORRECT — pcall wraps + handles
local ok, err = pcall(function()
    require("optional_module")
end)
if not ok then
    log.warn("optional module unavailable", err)
end
```

### 3. Global variables

```lua
-- FORBIDDEN — global by default
count = 0
function increment() count = count + 1 end

-- CORRECT
local count = 0
local function increment() count = count + 1 end
return { increment = increment, get = function() return count end }
```

luacheck rule: `--no-allow-defined-globals`.

### 4. Nil access without check

```lua
-- FORBIDDEN
return user.name  -- crashes if user is nil

-- CORRECT
if user == nil then
    return "Anonymous"
end
return user.name
```

### 5. Empty error handlers

```lua
-- FORBIDDEN
local ok, err = pcall(thing)
-- err discarded

-- CORRECT
local ok, err = pcall(thing)
if not ok then
    log.warn("thing failed", err)
end
```

### 6. `print()` in product code

```lua
-- FORBIDDEN
print("debug: " .. x)

-- CORRECT — use a real logger
local log = require("logger")
log.debug("debug", { x = x })
```

### 7. `loadstring` / `load` with user input

```lua
-- FORBIDDEN — RCE
load(user_input)()

-- CORRECT — use a real parser; e.g., dkjson
local json = require("dkjson")
local data, _, err = json.decode(user_input)
if err then return nil, err end
```

### 8. Missing return at error path

```lua
-- FORBIDDEN — falls through to success path
local function process(x)
    if x == nil then
        log.warn("nil x")
    end
    return doWork(x)  -- crashes when x is nil
end

-- CORRECT
local function process(x)
    if x == nil then
        return nil, "x is required"
    end
    return doWork(x)
end
```

## Required `.luacheckrc`

```lua
std = "max+busted"
codes = true
ranges = true
files["**/*_spec.lua"] = { std = "max+busted" }
files["**/*.lua"] = {
    max_line_length = 120,
    max_cyclomatic_complexity = 10,
    max_returns = 4,
    max_arguments = 5,
    allow_defined_globals = false,
    allow_defined_top = false,
}
ignore = {
    -- justify each ignored rule HERE
}
```

## Verification block

```
Lua sweep (this turn):
  - luac -p *.lua: 0 syntax errors
  - luacheck --no-cache --std max+busted .: 0 warnings
  - stylua --check .: clean
  - busted -v: PASS (88% coverage)
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- Lua 5.4 reference manual
- Olivine Labs' Lua style guide

## Why this rule exists

Lua's "errors are just multi-return" convention makes ignored
errors trivially easy. Combined with implicit globals (the
default), Lua codebases routinely contain hidden coupling +
silent failures. The rules above + luacheck at max enforce
explicit error handling + local-by-default scoping.

---

<!-- ============================================================
     Section: lua/patterns.md
     ============================================================ -->

# Lua Patterns

> Auto-fires on every `*.lua`, `*.rockspec` file. Standards:
> **Programming in Lua (Ierusalimschy)**, **Lua 5.4 reference
> manual**, **Olivine Labs style guide**, **OpenResty best
> practices** (when applicable), **plenary.nvim style** (when
> Neovim).

## Core Principle

**Lua is a glue language for embedding — patterns differ by
host. For OpenResty: cosockets + non-blocking; for Neovim:
event-driven + vim.loop; for game engines: coroutine-driven
state machines; for Redis scripts: deterministic + atomic. Across
all: tables-as-objects via metatables, module-via-table-return,
explicit local-everywhere.**

## Module pattern (Lua 5.1+)

```lua
-- myapp/order.lua
local M = {}

local function calculate_total(items)
    local sum = 0
    for _, item in ipairs(items) do
        sum = sum + item.price
    end
    return sum
end

function M.new(opts)
    opts = opts or {}
    local self = {
        items = {},
        clock = opts.clock or os.time,
    }
    return setmetatable(self, { __index = M })
end

function M:add_item(item)
    if item.price < 0 then
        error("price must be non-negative")
    end
    table.insert(self.items, item)
end

function M:total()
    return calculate_total(self.items)
end

return M
```

Usage:

```lua
local Order = require("myapp.order")
local order = Order.new()
order:add_item({ price = 100 })
```

## OO via metatables

```lua
local Animal = {}
Animal.__index = Animal

function Animal.new(name, sound)
    return setmetatable({ name = name, sound = sound }, Animal)
end

function Animal:speak()
    return self.name .. " says " .. self.sound
end

-- Inheritance
local Dog = setmetatable({}, { __index = Animal })
Dog.__index = Dog

function Dog.new(name)
    local self = Animal.new(name, "woof")
    return setmetatable(self, Dog)
end

function Dog:fetch()
    return self.name .. " fetches"
end

local d = Dog.new("Rex")
print(d:speak())     -- "Rex says woof"
print(d:fetch())     -- "Rex fetches"
```

## Pcall for error handling

```lua
local ok, result = pcall(function()
    return risky_operation(input)
end)

if not ok then
    log.warn("risky_operation failed", { error = result })
    return nil, result
end
return result
```

`xpcall` lets you customise the error message handler (e.g.,
attach a traceback):

```lua
local function trace_handler(err)
    return debug.traceback(err, 2)
end

local ok, result = xpcall(function() ... end, trace_handler)
```

## Coroutines (state machines / cooperative concurrency)

```lua
-- Producer / consumer pattern
local function producer()
    for i = 1, 10 do
        coroutine.yield(i)
    end
end

local co = coroutine.create(producer)
while true do
    local ok, value = coroutine.resume(co)
    if not ok or value == nil then break end
    print(value)
end

-- OpenResty uses coroutines for non-blocking I/O
local sock = ngx.socket.tcp()
sock:settimeout(1000)
local ok, err = sock:connect("api.example.com", 443)
if not ok then ngx.log(ngx.ERR, "connect failed: ", err); return end
```

## Variadics

```lua
local function log(level, fmt, ...)
    local msg = string.format(fmt, ...)
    print(string.format("[%s] %s", level, msg))
end

log("INFO", "user %s logged in from %s", username, ip)
```

## String building

```lua
-- FORBIDDEN — O(n²) due to string immutability
local s = ""
for i = 1, 1000 do
    s = s .. tostring(i) .. ","
end

-- CORRECT — table.concat is O(n)
local parts = {}
for i = 1, 1000 do
    parts[#parts + 1] = tostring(i)
end
local s = table.concat(parts, ",")
```

## Iteration patterns

```lua
-- Array (ipairs — ordered, stops at first nil)
for i, v in ipairs(arr) do ... end

-- Map (pairs — unordered)
for k, v in pairs(map) do ... end

-- Map with sorted keys
local keys = {}
for k in pairs(map) do keys[#keys + 1] = k end
table.sort(keys)
for _, k in ipairs(keys) do
    print(k, map[k])
end

-- Custom iterator
local function range(start, stop, step)
    step = step or 1
    local i = start - step
    return function()
        i = i + step
        if i <= stop then return i end
    end
end

for i in range(1, 10) do print(i) end
```

## Configuration via tables

```lua
local config = {
    server = {
        host = "0.0.0.0",
        port = 8080,
    },
    database = {
        url = os.getenv("DATABASE_URL") or "localhost",
        pool_size = 10,
    },
    logging = {
        level = "info",
        format = "json",
    },
}

return config
```

Per `~/.claude/rules-library/common/no-ambient-globals.md` — pass the
config to constructors; don't `require` it deep in code.

## Reuse-first

| Use case | Library |
| --- | --- |
| Testing | busted |
| Coverage | luacov |
| HTTP client | lua-resty-http (OpenResty), socket.http, lua-curl |
| JSON | cjson (OpenResty), dkjson, lua-cjson |
| Date / time | lua-cosmo, timekit, or stdlib |
| Logging | logging, lua-resty-logger-socket |
| Concurrency | coroutines (built-in), copas |
| Crypto | luaossl, lua-resty-jwt |
| Pattern matching (better than `string.match`) | lpeg, lpeg_re |
| Web framework (server) | OpenResty, Lapis, Sailor |
| Web framework (Roblox-style) | host-provided |

Per `~/.claude/rules-library/common/reuse-first.md`.

## Embedding-specific patterns

### OpenResty (nginx + LuaJIT)

```lua
-- Use ngx.shared.DICT for cross-worker state (limited)
local cache = ngx.shared.app_cache

local function get_cached(key)
    return cache:get(key)
end

local function set_cached(key, value, ttl)
    cache:set(key, value, ttl)
end

-- Non-blocking HTTP
local httpc = require("resty.http").new()
httpc:set_timeout(2000)
local res, err = httpc:request_uri("https://api.example.com/data", {
    method = "GET",
    headers = { ["Authorization"] = "Bearer " .. token },
})
```

### Neovim plugin

```lua
-- lua/myplugin/init.lua
local M = {}

function M.setup(opts)
    opts = opts or {}
    M.config = vim.tbl_deep_extend("force", {
        default_option = true,
    }, opts)

    vim.api.nvim_create_user_command("MyCommand", M.handle_command, {})
end

function M.handle_command()
    -- ...
end

return M
```

### Redis Lua script

```lua
-- All KEYS via KEYS[N]; all values via ARGV[N]
-- Script must be deterministic for replication
local key = KEYS[1]
local value = ARGV[1]
local ttl = tonumber(ARGV[2])

local existing = redis.call("GET", key)
if existing then
    return cjson.encode({ existed = true, value = existing })
end

redis.call("SET", key, value, "EX", ttl)
return cjson.encode({ existed = false })
```

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/common/reuse-first.md`
- `~/.claude/rules-library/lua/coding-style.md`
- `~/.claude/rules-library/lua/no-discards.md`
- `~/.claude/rules-library/lua/security.md`
- Programming in Lua (Roberto Ierusalimschy)
- OpenResty Best Practices
- plenary.nvim (Neovim plugin scaffolding)

---

<!-- ============================================================
     Section: lua/security.md
     ============================================================ -->

# Lua Security

> Auto-fires on every `*.lua`, `*.rockspec`, `*.luacheckrc` file.
> Sister to `~/.claude/rules-library/common/security.md`. Lua is most
> commonly embedded (Redis scripts, OpenResty / nginx, Neovim,
> Roblox, game engines, WoW addons, embedded devices). Each
> embedding context has its own threat model.

## Core Principle

**Lua's compactness + dynamic typing make it an attack surface
in every embedding. The host application's sandboxing
discipline is what matters most. Globals are dangerous; sandboxing
is via `_ENV` (Lua 5.2+) / `setfenv` (5.1); never load untrusted
bytecode (`load`/`loadstring`); cryptographic operations belong in
the host language, not Lua.**

## OWASP — Lua specifics

### Code injection via `load` / `loadstring` / `loadfile`

```lua
-- FORBIDDEN — RCE; user input becomes executable code
local f = load(user_input)
f()

-- CORRECT — never load user-supplied code
-- For dynamic dispatch, use an explicit allowlist:
local handlers = {
    add = function(a, b) return a + b end,
    sub = function(a, b) return a - b end,
}
local cmd = handlers[user_command]
if not cmd then return nil, "unknown command" end
return cmd(a, b)
```

luacheck rule: `globals = {}` + `read_globals = {}` flags any
`load*` usage.

### Untrusted bytecode

```lua
-- FORBIDDEN — load() will execute precompiled bytecode by default
load(network_data)

-- CORRECT — restrict to text mode (5.2+)
load(network_data, "chunk", "t")  -- "t" = text only, no bytecode

-- Bytecode can contain crafted byte sequences that crash the VM
-- or escape the sandbox; text mode forces lexing + parsing
```

### Sandboxing via `_ENV`

```lua
-- Lua 5.2+ — each chunk has its own _ENV
-- Strip dangerous globals before running user code
local sandbox = setmetatable({
    -- Safe stdlib subset:
    pairs = pairs,
    ipairs = ipairs,
    tostring = tostring,
    tonumber = tonumber,
    string = { upper = string.upper, lower = string.lower },
    math = math,
    table = { insert = table.insert, remove = table.remove },
    -- NOT exposed: io, os, debug, package, load, require
}, { __index = function() return nil end })

local function run_user_code(code)
    local chunk, err = load(code, "user", "t", sandbox)
    if not chunk then return nil, err end
    return pcall(chunk)
end
```

For Lua 5.1 (still widely used in WoW + OpenResty's LuaJIT),
use `setfenv`:

```lua
local chunk = loadstring(code)
setfenv(chunk, sandbox)
return pcall(chunk)
```

### `io.*` + `os.*` are file-system / process access

```lua
-- DANGEROUS in any context where Lua scripts come from untrusted sources
io.open(path)              -- read/write arbitrary files
os.execute(cmd)            -- shell exec
os.getenv("AWS_SECRET")    -- exfiltrate secrets
os.remove(path)            -- delete files
```

In sandboxes, REMOVE `io` and `os` from `_ENV` entirely. If
limited file I/O is needed, expose a controlled wrapper:

```lua
local function safe_read(rel_path)
    -- Canonicalise + ensure within allowed prefix
    local full = base_dir .. "/" .. rel_path
    if full:find("%.%.") then return nil, "path traversal" end
    local f = io.open(full, "r")
    if not f then return nil, "not found" end
    local content = f:read("*a")
    f:close()
    return content
end
sandbox.read_file = safe_read
```

### `string.format` is NOT format-string-safe

Unlike C's `printf`, Lua's `string.format` returns a string —
it doesn't run code. However, `%q` quotes strings as Lua
literals; if the resulting string is later `load()`-ed, you can
get injection. Don't `load` template output.

### `require` loads arbitrary modules

```lua
-- FORBIDDEN — user controls which module is loaded
require(user_input)

-- CORRECT — explicit dispatch
local allowed = { ["foo"] = true, ["bar"] = true }
if not allowed[user_input] then return nil end
require(user_input)
```

In sandboxes, `require` is removed from `_ENV`.

### Random number generation

```lua
-- WRONG — predictable seed; non-cryptographic
math.randomseed(os.time())
local key = string.format("%08x", math.random(0, 0xffffffff))

-- CORRECT — for cryptographic randomness, use the host
-- (OpenSSL / libsodium / system /dev/urandom via host wrapper)
-- Lua's math.random is a PRNG; never use it for tokens / keys / IDs
```

OpenResty: `resty.random` provides `bytes(n, strong)`.

## Embedding-specific concerns

### Redis Lua scripts (EVAL / EVALSHA)

```lua
-- Redis scripts run in a sandbox; many globals already removed
-- But beware:
-- - SCRIPT_NAME etc. (no luvit / openresty extras)
-- - No `os`, `io`, `debug`
-- - `redis.call("EVAL", ...)` lets you nest scripts — be careful
-- - Scripts must be deterministic (NO `redis.call("TIME")` after writes)

-- Replicate scripts via EVALSHA for performance; never include user
-- input verbatim in the script body
local function fetch_user(redis, user_id)
    -- WRONG: vulnerable to injection
    return redis.call("EVAL",
        "return redis.call('GET', '" .. user_id .. "')",
        0)
    -- CORRECT: parameterised via KEYS / ARGV
    return redis.call("EVAL",
        "return redis.call('GET', KEYS[1])",
        1, "user:" .. user_id)
end
```

### OpenResty (nginx + LuaJIT)

```lua
-- ngx.req.get_body_data() can be enormous; check ngx.req.read_body() return
ngx.req.read_body()
local body = ngx.req.get_body_data()
if not body or #body > 1024 * 1024 then
    ngx.log(ngx.WARN, "body too large")
    ngx.exit(413)
end

-- Always escape user input that goes back into URLs / headers
local escaped = ngx.escape_uri(user_input)
ngx.var.target = "/path?q=" .. escaped

-- Use resty.cookie / resty.session with HMAC for cookies
-- Never trust ngx.var.cookie_* without verification
```

### Neovim / Vim plugins

- Plugins run with full user privileges — they can read every
  file the user can
- Be paranoid about `vim.fn.system()` / `io.popen` with user input
- Treat marketplace plugins like npm packages (per
  `~/.claude/rules-library/common/install-allowlist.md`)

### Game engines (Defold, LÖVE, Roblox)

- Multiplayer servers should validate ALL client-supplied scripts /
  data
- Roblox `loadstring` is OFF by default — keep it off
- Use server-authoritative state for any value that grants
  in-game advantage

## Secrets

- Embed secrets in the HOST application's secret store
- Lua should receive secrets via opaque handles (`db_handle`,
  `signing_key_id`), not the raw values
- For OpenResty: `lua_shared_dict` is process-shared but visible
  to every worker — DO NOT store long-lived secrets there

Per `~/.claude/rules-library/common/secrets-management.md`.

## Required tooling

```bash
luacheck --std max+busted .         # lint
brakeman-equivalent: none widely-adopted for Lua
# Use luarocks audit if available, or manual review

# OpenResty / nginx config
nginx -t                            # config syntax
gixy nginx.conf                     # security analyser
```

## Cross-references

- `~/.claude/rules-library/common/security.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/common/install-allowlist.md`
- `~/.claude/rules-library/lua/no-discards.md`
- `~/.claude/rules-library/lua/coding-style.md`
- Lua 5.4 reference manual — sandboxing chapter
- OWASP Lua security guide
- OpenResty Best Practices
- Redis Lua scripting docs (redis.io/docs/interact/programmability/eval-intro/)

---

<!-- ============================================================
     Section: lua/testing.md
     ============================================================ -->

# Lua Testing

> Auto-fires on every `*_spec.lua`, `*_test.lua`, `tests/**/*.lua`,
> `spec/**/*.lua` file. Standards: **busted**, **LuaUnit**,
> **plenary.nvim** (Neovim plugins), **luacov** (coverage).

## Core Principle

**busted is the canonical BDD-style Lua test framework; LuaUnit
the JUnit-style alternative. Coverage via luacov. Mocks via
busted's spy / stub / mock. Tests run on every Lua version the
project supports (5.1 / 5.2 / 5.3 / 5.4 / LuaJIT).**

## busted idioms

```lua
-- spec/order_spec.lua
describe("Order", function()
    local Order = require("myapp.order")

    describe("total()", function()
        it("returns 0 for no items", function()
            local order = Order.new()
            assert.are.equal(0, order:total())
        end)

        it("sums item prices", function()
            local order = Order.new()
            order:add_item({ price = 100 })
            order:add_item({ price = 200 })
            assert.are.equal(300, order:total())
        end)
    end)

    describe("validation", function()
        it("rejects negative prices", function()
            local order = Order.new()
            assert.has_error(function()
                order:add_item({ price = -1 })
            end, "price must be non-negative")
        end)
    end)

    describe("with mocked payment client", function()
        local payment_mock

        before_each(function()
            payment_mock = mock({
                charge = function() return { id = "ch_123" } end,
            }, true)
        end)

        it("calls charge with total", function()
            local order = Order.new(payment_mock)
            order:add_item({ price = 500 })
            order:checkout()
            assert.spy(payment_mock.charge).was_called_with(payment_mock, 500)
        end)
    end)
end)
```

Run with:

```bash
busted -v
busted --coverage spec/
```

## Mocks: stub / spy / mock

```lua
-- Stub — replace a function entirely
stub(io, "open").returns(nil, "not found")

-- Spy — wrap, track calls, original still runs
spy.on(logger, "warn")
do_thing()
assert.spy(logger.warn).was_called(1)

-- Mock — create a fake table
local fake_db = mock({
    query = function() return { id = 1 } end,
    close = function() end,
}, true)
```

`true` parameter on `mock` makes it auto-stub (returns nil
unless overridden).

## Property-based testing

`lust-lua`, `quickcheck-lua`, or hand-rolled:

```lua
describe("calculate_total", function()
    it("is non-negative for non-negative prices", function()
        for _ = 1, 100 do
            local items = {}
            for _ = 1, math.random(0, 50) do
                table.insert(items, { price = math.random(0, 10000) })
            end
            assert.is_true(calculate_total(items) >= 0)
        end
    end)
end)
```

For real property-based: use `lua-quickcheck`.

## Coverage with luacov

```bash
luarocks install luacov
busted --coverage spec/
luacov                                  # generates luacov.report.out

# Console summary:
luacov -r summary | tail -20

# HTML report:
luarocks install luacov-html
luacov -r html
open luacov-html/index.html
```

`.luacov` config:

```lua
return {
    include = { "src/" },
    exclude = { "spec/", "lua_modules/" },
    runreport = true,
    deletestats = false,
    codefromstrings = false,
}
```

## Multi-version testing

`.luacheckrc`-style matrix in CI:

```yaml
strategy:
  matrix:
    lua: ["5.1", "5.2", "5.3", "5.4", "luajit"]
```

For local dev: `hererocks` installs each:

```bash
hererocks --lua 5.4 ./.lua-5.4
source ./.lua-5.4/bin/activate
luarocks install busted luacov
busted spec/
```

## Neovim plugin testing (plenary)

For Neovim plugins, `plenary.nvim` provides a busted-compatible
runner:

```lua
-- tests/myplugin_spec.lua
describe("myplugin", function()
    local myplugin

    before_each(function()
        myplugin = require("myplugin")
    end)

    it("setup registers commands", function()
        myplugin.setup({})
        assert.is_not_nil(vim.fn.exists(":MyCommand"))
    end)
end)
```

Run via:

```bash
nvim --headless -c "PlenaryBustedDirectory tests/ {minimal_init = 'tests/minimal_init.lua'}"
```

## Hard rules

### 1. No real network / filesystem in tests

Mock `io`, `os.execute`, network clients. Use temp files only.

### 2. Tests reset global state

```lua
before_each(function()
    -- Reset modules that cache state
    package.loaded["myapp.config"] = nil
    package.loaded["myapp.cache"] = nil
end)
```

### 3. No `Time.now` / `os.time` directly — inject

Per `~/.claude/rules-library/common/no-ambient-globals.md`:

```lua
function MyService.new(opts)
    opts = opts or {}
    return setmetatable({
        clock = opts.clock or function() return os.time() end,
        rng   = opts.rng   or function() return math.random() end,
    }, MyService)
end

-- In tests
local fake_time = 1716729600
local svc = MyService.new({ clock = function() return fake_time end })
```

### 4. Test exit codes for CLI tools

```lua
describe("cli", function()
    it("exits 1 on missing argument", function()
        local handle = io.popen("./mytool 2>&1; echo exit=$?")
        local output = handle:read("*a")
        handle:close()
        assert.matches("exit=1", output)
    end)
end)
```

### 5. Coverage gate

```yaml
- name: Coverage check
  run: |
    lua_cov=$(grep -oP 'Total.*\K[0-9.]+%' luacov.report.out)
    if (( $(echo "${lua_cov%\%} < 80" | bc -l) )); then
      echo "Coverage below 80%"
      exit 1
    fi
```

### 6. Test naming as behaviour

```lua
-- WRONG
it("test1", ...)
it("calculate_total", ...)

-- RIGHT — describe expectation
it("returns 0 for no items", ...)
it("rejects negative prices", ...)
```

## Cross-references

- `~/.claude/rules-library/common/testing.md`
- `~/.claude/rules-library/common/no-ambient-globals.md`
- `~/.claude/rules-library/lua/coding-style.md`
- `~/.claude/rules-library/lua/no-discards.md`
- busted docs (lunarmodules.github.io/busted/)
- luacov docs (keplerproject.github.io/luacov/)
- plenary.nvim docs (github.com/nvim-lua/plenary.nvim)

---
