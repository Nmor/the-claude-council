---
paths:

- "**/*.ts"
- "**/*.tsx"
- "**/*.js"
- "**/*.jsx"

---

<!-- ============================================================
     Section: typescript/security.md
     ============================================================ -->

# TypeScript/JavaScript Security

> Covers **typescript/security (migrated rule)** for the `typescript-patterns` skill. Routed from
> the reference map in `../SKILL.md`.
>
> This file extends [common/security.md](../../../rules-library/common/security.md) with
> TypeScript/JavaScript specific content.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

## Agent Support

- Use **security-reviewer** skill for comprehensive security audits

---
