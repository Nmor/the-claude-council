# typescript-patterns: Strictness Baseline

> Covers **Strictness Baseline** for the `typescript-patterns` skill. Routed from the reference map
> in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Strictness Baseline

Every project should enable these in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true
  }
}
```

`strict` is non-negotiable. The other flags catch common bugs static analysis would otherwise miss;
turn them on at project start, not later.
