---
paths:

- "**/*.py"
- "**/*.pyi"

---

<!-- ============================================================
     Section: python/hooks.md
     ============================================================ -->

# Python Hooks

> This file extends [common/hooks.md](../../../rules-library/common/hooks.md) with Python specific
> content.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **black/ruff**: Auto-format `.py` files after edit
- **mypy/pyright**: Run type checking after editing `.py` files

## Warnings

- Warn about `print()` statements in edited files (use `logging` module instead)

---
