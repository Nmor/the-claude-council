# SonarJS ESLint setup

> Covers wiring `eslint-plugin-sonarjs` into a TS/JS repo, the stylistic rules to disable, per-file
> overrides, the `eqeqeq` + null exception, Vue/React parsers, and the silent-failure ESLint
> guardrails. Pointed at by the SKILL.md rows "Wiring SonarJS into a TS/JS repo" and "ESLint
> guardrails".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Wiring SonarJS into a TypeScript / JavaScript repo (mandatory step)

Native SonarLint runs in the IDE only. CI and the Council's verification-loop need an automated
SonarJS check. For every TS/JS repo Claude touches, ensure the project's ESLint config includes
`eslint-plugin-sonarjs` (the official SonarSource plugin — same rule names as SonarLint, ~270
rules):

```bash
pnpm add -D eslint-plugin-sonarjs
```

```js
// eslint.config.js
import sonarjsPlugin from "eslint-plugin-sonarjs";

export default [
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    plugins: { sonarjs: sonarjsPlugin },
    rules: {
      ...sonarjsPlugin.configs.recommended.rules,
      "sonarjs/no-unused-vars": "off", // duplicates @typescript-eslint
    },
  },
];
```

If the repo lints clean against `sonarjs/recommended`, SonarLint in the IDE will be quiet too. They
share the rule set.

### Stylistic rules to disable when they cause more churn than value

Most SonarJS rules are bug-class. A handful are pure style and should be turned off project-wide
rather than papered-over per-line:

| Rule | Why turn off |
| ---- | ------------ |
| `sonarjs/prefer-regexp-exec` | `String.match` vs `RegExp.exec` is a style call |
| `sonarjs/concise-regex` | `[0-9]` vs `\d` — both correct |
| `sonarjs/single-character-alternation` | `a\|b` vs `[ab]` — both correct |
| `sonarjs/single-char-in-character-classes` | `[a]` vs `a` — both correct |
| `sonarjs/regex-complexity` | length-bounded regex still fires; `slow-regex` is the bug-class one |
| `sonarjs/no-nested-template-literals` | reasonable in render-text contexts |
| `sonarjs/no-nested-functions` | composables nest by design |
| `sonarjs/use-type-alias` | alias-vs-inline is a style call |
| `sonarjs/function-return-type` | discriminated unions trip this |
| `sonarjs/void-use` | `void promise` IS the explicit-fire-and-forget idiom |
| `sonarjs/no-selector-parameter` | boolean params are sometimes the right shape |
| `sonarjs/no-redundant-optional` | false-positives on `T \| undefined \| null` |
| `sonarjs/deprecation` | duplicates `@typescript-eslint/no-deprecated` |

### Per-file overrides for legitimate exceptions

| Surface | Rule | Reason |
| ------- | ---- | ------ |
| Test files | `sonarjs/no-clear-text-protocols` | Tests deliberately exercise http:// and private-IP rejection |
| SSRF validators | `sonarjs/no-hardcoded-ip` | The validator's job is to literally know the AWS IMDS IP `169.254.169.254` |
| Domain noun "todo" | `sonarjs/todo-tag` | The product feature uses the word; the rule targets `// TODO:` markers |
| Stream dispatchers / migrations | `sonarjs/cognitive-complexity` ≥ 25 | Dispatch over many cases is structural |

### Eqeqeq + null

When SonarJS `different-types-comparison` flags a `!== null` / `=== null` against a TS-narrowed type
that the runtime can still hold null for, the canonical fix is `!= null` / `== null` (matches both
null and undefined). Update the project's `eqeqeq` config to allow this exception:

```js
eqeqeq: ["error", "always", { null: "ignore" }],
```

### Vue / React projects

Add the framework parser too:

```js
import vueParser from "vue-eslint-parser";
// for *.vue files, set parser: vueParser, parserOptions.parser: tsParser
```

## ESLint guardrails for every TS/JS project

Add to `eslint.config.js` (frontend AND backend) alongside SonarJS:

```js
const SILENT_FAILURE_GUARDRAILS = {
  "no-console": "error",
  "no-empty": ["error", { allowEmptyCatch: false }],
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "CallExpression[callee.property.name='catch'][arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='BlockStatement'][arguments.0.body.body.length=0]",
      message: "Empty .catch() swallows errors silently.",
    },
    {
      selector:
        "CallExpression[callee.property.name='catch'][arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='Literal']",
      message: "Returning a literal from .catch() is a silent fallback.",
    },
    {
      selector:
        "CallExpression[callee.property.name='catch'][arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='Identifier'][arguments.0.body.name='undefined']",
      message: "Returning undefined from .catch() is a silent fallback.",
    },
    {
      selector: "CatchClause:not(:has(CallExpression))",
      message: "catch block has no function call — silent failure.",
    },
  ],
};
```

Allowlist only the project's logger module for `no-console`; never add
per-line `eslint-disable` directives.
