---
paths:

- "**/*.ts"
- "**/*.tsx"
- "**/*.js"
- "**/*.jsx"

---

<!-- ============================================================
     Section: typescript/hooks.md
     ============================================================ -->

# TypeScript/JavaScript Hooks

> Covers **typescript/hooks (migrated rule)** for the `typescript-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> This file extends [common/hooks.md](../../../rules-library/common/hooks.md) with
> TypeScript/JavaScript specific content.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **Prettier**: Auto-format JS/TS files after edit
- **TypeScript check**: Run `tsc` after editing `.ts`/`.tsx` files
- **console.log warning**: Warn about `console.log` in edited files

## Stop Hooks

- **console.log audit**: Check all modified files for `console.log` before session ends

---
