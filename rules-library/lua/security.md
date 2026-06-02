# Lua Security

> Auto-fires on every `*.lua`, `*.rockspec`, `*.luacheckrc` file.
> Sister to `~/.claude/rules/common/security.md`. Lua is most
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
  `~/.claude/rules/common/install-allowlist.md`)

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

Per `~/.claude/rules/common/secrets-management.md`.

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

- `~/.claude/rules/common/security.md`
- `~/.claude/rules/common/secrets-management.md`
- `~/.claude/rules/common/install-allowlist.md`
- `~/.claude/rules/lua/no-discards.md`
- `~/.claude/rules/lua/coding-style.md`
- Lua 5.4 reference manual — sandboxing chapter
- OWASP Lua security guide
- OpenResty Best Practices
- Redis Lua scripting docs (redis.io/docs/interact/programmability/eval-intro/)
