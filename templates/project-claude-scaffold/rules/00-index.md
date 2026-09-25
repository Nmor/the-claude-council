# Workspace Rules — Index

> Project-specific rules that extend global. Per
> `~/.claude/rules/common/rule-authoring-global-vs-project.md`.
> Workspace rules MAY raise thresholds (stricter) but MUST NOT
> lower them.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Conventions

- One rule per file
- File name is kebab-case + descriptive (e.g.,
  `payments-idempotency.md`, `customer-id-format.md`)
- Each rule cites the global rule it extends (if any) at the top
- Each rule includes a "Why this rule exists" section naming the
  specific project failure mode it prevents

## Index

| Rule | Extends global | Purpose |
| --- | --- | --- |
| `functional-test-coverage.md` | `functional-test-coverage.md` | The project's measured coverage baseline, the exact commands that measure it, and the surfaces where a gap costs money. REQUIRED in every project: the global rule sets the discipline, this file carries the specifics. |
| `<rule.md>` | `<global rule.md>` | `<one-line>` |
