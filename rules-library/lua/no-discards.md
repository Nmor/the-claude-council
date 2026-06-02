# Lua — No-Discards Extension

> Auto-fires on every `*.lua`, `*.rockspec`, `*.luacheckrc` file.
> Extends `~/.claude/rules/common/no-discards.md`. Tooling: `luacheck`,
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

```text
Lua sweep (this turn):
  - luac -p *.lua: 0 syntax errors
  - luacheck --no-cache --std max+busted .: 0 warnings
  - stylua --check .: clean
  - busted -v: PASS (88% coverage)
```

## Cross-references

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- Lua 5.4 reference manual
- Olivine Labs' Lua style guide

## Why this rule exists

Lua's "errors are just multi-return" convention makes ignored
errors trivially easy. Combined with implicit globals (the
default), Lua codebases routinely contain hidden coupling +
silent failures. The rules above + luacheck at max enforce
explicit error handling + local-by-default scoping.
