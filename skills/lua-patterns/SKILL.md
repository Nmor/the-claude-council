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

# lua-patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules-library/lua/` as part of the lazy-rules-loading plan.
> Phase H will delete the source files.

## Purpose

Lua 5.x discipline for every `*.lua` / `*.rockspec` / `.luacheckrc` / `.stylua.toml` file. This page
is a routing table only: it names the topic and the file that holds it. Read the row you need — the
guidance, standards, code examples and anti-patterns live in `references/`, so a Lua edit pays for
the one concern it touches rather than the whole corpus.

## Standards Cited

- **Lua 5.4 Reference Manual** (lua.org/manual/5.4) — lexical scope, metatables, coroutines,
  `pcall`/`xpcall` protected calls
- **Lua 5.4 §3.4.1** — operators + precedence (no operator overload outside metamethods)
- **Lua 5.4 §3.4.4** — `load` / `loadstring` with mode flag (`'t'` text-only, never `'b'` bytecode
  from untrusted)
- **LuaRocks 3.x** (luarocks.org/manual) — rockspec format + lockfile discipline
- **OWASP Top 10 A03:2021** — injection (the `loadstring` family is the Lua-side surface for the
  same class as RCE)
- **CWE-94** — Improper Control of Generation of Code (`load` on attacker-controlled string)
- **CWE-95** — Eval Injection (the `setfenv` + `load` combination is the Lua-side eval-injection
  shape)
- **ISO/IEC 19514** — UML conceptual reference for the module pattern (M-table-and-return shape)

## Routing table

| Topic | Read | What it holds |
| --- | --- | --- |
| **Coding style** | `references/coding-style.md` | The Lua 5.4 checklist — locals over globals, metatables for OOP, `pcall`/`xpcall` over bare `error()`, `table.concat` over `..` in loops, module-returns-a-table — and the three-step `luac -p` / `luacheck` / test-suite verification |
| **No-discards (banned patterns)** | `references/no-discards.md` | The eight banned patterns — ignored multi-return, unprotected calls that can error, global variables, nil access without check, empty error handlers, `print()` in product code, `load` on user input, missing return at the error path — plus the required `.luacheckrc` and the Lua sweep verification block |
| **Patterns** | `references/patterns.md` | Module pattern (`local M = {}` … `return M`); OO and inheritance via metatables; `pcall` / `xpcall` with a traceback handler; coroutines for state machines and cooperative concurrency; variadics; `table.concat` string building; iteration (`ipairs` / `pairs` / sorted keys / custom iterators); table configuration; the reuse-first library table; OpenResty, Neovim and Redis embedding patterns |
| **Security** | `references/security.md` | Code injection via `load` / `loadstring` / `loadfile` (CWE-94, CWE-95); untrusted bytecode and the `"t"` text-only mode flag; `_ENV` and `setfenv` sandboxing; `io.*` / `os.*` as filesystem and process access; `string.format` and `%q`; `require` on user input; non-cryptographic `math.random`; the Redis / OpenResty / Neovim / game-engine threat models; secrets handling; required tooling |
| **Testing** | `references/testing.md` | busted idioms (`describe` / `it` / `before_each` / `assert.has_error`); stub, spy and mock; property-based testing; luacov coverage and `.luacov` config; multi-version testing via hererocks; plenary.nvim for Neovim plugins; the six hard rules — no real network or filesystem, reset global state, inject the clock, test exit codes, the coverage gate, behaviour-shaped test names |
| **Hooks + CI** | `references/hooks.md` | `.githooks/pre-commit` (syntax, luacheck, stylua) and `pre-push` (busted, coverage gate); the Lua CI workflow across 5.1 / 5.2 / 5.3 / 5.4 / LuaJIT via hererocks; the strict `.luacheckrc` and `stylua.toml` baselines; OpenResty (`nginx -t`, `gixy`) and Neovim (headless busted, `checkhealth`) commands |

## Cross-references

Each reference file carries its own cross-reference list and its own standards citations. The
always-on floor rules that pair with this skill are `~/.claude/rules/common/no-discards.md`,
`no-silent-failures.md`, `verify-before-claim.md` and `no-bloat.md`.
