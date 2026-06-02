# Workspace Rules — Index

> Project-specific rules that extend global. Per
> `~/.claude/rules/common/rule-authoring-global-vs-project.md`.
> Workspace rules MAY raise thresholds (stricter) but MUST NOT
> lower them.

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
| `<rule.md>` | `<global rule.md>` | `<one-line>` |
