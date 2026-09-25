# Lua Coding Standards

> **Size budget: 8 KB** — `token-budget.mjs --check`.

Covers the Lua 5.4 checklist — locals over globals, metatable OO, `pcall`/`xpcall` error
handling, `table.concat` string building, the module-return pattern — and the three-step
verification. The detail behind the SKILL.md row **Coding style**.

<!-- ============================================================
     Section: lua/coding-style.md
     ============================================================ -->

---
paths:

- "**/*.lua"
- "**/*.rockspec"

---

> Auto-activates for Lua source files. Used by the call-center-product for scripting and
> configuration.

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
