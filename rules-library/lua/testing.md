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

Per `~/.claude/rules/common/no-ambient-globals.md`:

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

- `~/.claude/rules/common/testing.md`
- `~/.claude/rules/common/no-ambient-globals.md`
- `~/.claude/rules/lua/coding-style.md`
- `~/.claude/rules/lua/no-discards.md`
- busted docs (lunarmodules.github.io/busted/)
- luacov docs (keplerproject.github.io/luacov/)
- plenary.nvim docs (github.com/nvim-lua/plenary.nvim)
