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

Per `~/.claude/rules/common/no-ambient-globals.md` — pass the
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

Per `~/.claude/rules/common/reuse-first.md`.

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

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/common/reuse-first.md`
- `~/.claude/rules/lua/coding-style.md`
- `~/.claude/rules/lua/no-discards.md`
- `~/.claude/rules/lua/security.md`
- Programming in Lua (Roberto Ierusalimschy)
- OpenResty Best Practices
- plenary.nvim (Neovim plugin scaffolding)
