# HTML / CSS Hooks

> Auto-fires on every `*.html`, `*.htm`, `*.css`, `*.scss`,
> `*.sass`, `*.less`, `*.styl`, `*.module.css`, `*.postcssrc`,
> `*.stylelintrc*`, `*.htmlhintrc`, `tailwind.config.*`,
> `postcss.config.*`, `vite.config.*` file. Sister to
> [`common/hooks.md`](../common/hooks.md). Tooling:
> **stylelint 17.11.0** + **stylelint-config-standard 40.0.0**,
> **HTMLHint** (current), **Prettier 3.x**, **@axe-core/playwright**,
> **Lighthouse CI**, **pa11y-ci**, **size-limit** /
> **bundlewatch**, **autoprefixer** (via PostCSS).

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_files=$(git diff --cached --name-only --diff-filter=ACMR)
staged_html=$(echo "$staged_files" | grep -E '\.(html?|hbs|ejs|liquid)$' || true)
staged_css=$(echo "$staged_files" | grep -E '\.(css|scss|sass|less|styl|module\.css)$' || true)

# Format check
if [ -n "$staged_html$staged_css" ]; then
  echo "$staged_html $staged_css" | xargs pnpm exec prettier --check
fi

# CSS lint
if [ -n "$staged_css" ]; then
  echo "$staged_css" | xargs pnpm exec stylelint
fi

# HTML lint
if [ -n "$staged_html" ]; then
  echo "$staged_html" | xargs pnpm exec htmlhint
fi
```

`.pre-commit-config.yaml` equivalent (pre-commit framework):

```yaml
---
repos:
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.6.0
    hooks:
      - id: prettier
        types_or: [html, css, scss, sass, less, javascript, typescript]

  - repo: https://github.com/thibaudcolas/pre-commit-stylelint
    rev: v17.11.0
    hooks:
      - id: stylelint
        additional_dependencies:
          - "stylelint@17.11.0"
          - "stylelint-config-standard@40.0.0"
          - "stylelint-config-recess-order@7.4.0"
          - "stylelint-a11y@2.0.0"

  - repo: local
    hooks:
      - id: htmlhint
        name: htmlhint
        entry: pnpm exec htmlhint
        language: node
        files: \.(html?|hbs|ejs|liquid)$
```

## Pre-push gates

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Build + type-check + tests + a11y in CI parity
bash infra/verify-local.sh
```

`infra/verify-local.sh` (excerpt):

```bash
#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm exec prettier --check '**/*.{html,css,scss,ts,tsx}'
pnpm exec stylelint '**/*.{css,scss,module.css}' --max-warnings 0
pnpm exec htmlhint '**/*.html'
pnpm exec tsc --noEmit
pnpm exec eslint --max-warnings 0
pnpm vitest run --coverage
pnpm test:a11y                              # jest-axe
pnpm build
pnpm exec lhci autorun                      # Lighthouse + a11y / perf budgets
pnpm exec size-limit                        # bundle budgets
```

Same script runs in CI per [`common/local-dev-setup.md`](../common/local-dev-setup.md).

## CI workflow (GitHub Actions)

```yaml
# .github/workflows/frontend-ci.yml
---
name: Frontend CI

on:
  pull_request:
    paths:
      - "**/*.html"
      - "**/*.css"
      - "**/*.scss"
      - "**/*.ts"
      - "**/*.tsx"
      - "package.json"
      - "pnpm-lock.yaml"

permissions:
  contents: read

jobs:
  lint-and-format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320 # v4.4.0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with: { node-version: "22", cache: pnpm }

      - run: pnpm install --frozen-lockfile

      - name: Prettier
        run: pnpm exec prettier --check '**/*.{html,css,scss,ts,tsx,js,jsx,json,md}'

      - name: stylelint
        run: pnpm exec stylelint '**/*.{css,scss,module.css}' --max-warnings 0

      - name: HTMLHint
        run: pnpm exec htmlhint '**/*.html'

      - name: Type-check
        run: pnpm exec tsc --noEmit

      - name: ESLint
        run: pnpm exec eslint --max-warnings 0

  unit-and-a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320 # v4.4.0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with: { node-version: "22", cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest run --coverage --reporter verbose
      - run: pnpm test:a11y                # jest-axe

      - uses: codecov/codecov-action@<sha-pinned> # vN.N.N
        with: { files: coverage/lcov.info }

  e2e:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        project: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320 # v4.4.0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with: { node-version: "22", cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps ${{ matrix.project }}
      - run: pnpm exec playwright test --project=${{ matrix.project }}

      - uses: actions/upload-artifact@<sha-pinned> # vN.N.N
        if: always()
        with:
          name: playwright-results-${{ matrix.project }}
          path: |
            playwright-report/
            test-results/
          retention-days: 30

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320 # v4.4.0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with: { node-version: "22", cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm exec lhci autorun

  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320 # v4.4.0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with: { node-version: "22", cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - name: Chromatic
        uses: chromaui/action@<sha-pinned> # vN.N.N
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          autoAcceptChanges: false
          exitZeroOnChanges: false

  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.3.3
      - uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320 # v4.4.0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with: { node-version: "22", cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm exec size-limit
```

## IDE integration

### VS Code / Cursor / Windsurf

`.vscode/settings.json`:

```jsonc
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": "explicit",
    "source.fixAll.eslint": "explicit"
  },
  "stylelint.validate": ["css", "scss", "vue", "svelte"],
  "stylelint.snippet": ["css", "scss"],
  "css.validate": false,
  "scss.validate": false,
  "less.validate": false,
  "html.format.enable": false,
  "files.associations": {
    "*.css": "css",
    "*.module.css": "css",
    "*.svelte": "svelte"
  }
}
```

`css.validate: false` disables VS Code's built-in CSS validator
so stylelint owns the lint surface. Otherwise diagnostics
duplicate.

### Recommended extensions

| Publisher | Extension | Purpose |
| --- | --- | --- |
| `esbenp.prettier-vscode` | Prettier | Format-on-save |
| `stylelint.vscode-stylelint` | Stylelint | CSS lint |
| `htmlhint.vscode-htmlhint` | HTMLHint | HTML lint |
| `dbaeumer.vscode-eslint` | ESLint | JS / TS / Vue / Svelte lint |
| `bradlc.vscode-tailwindcss` | Tailwind CSS IntelliSense | Tailwind autocomplete |
| `deque-systems.vscode-axe-linter` | axe Linter | Inline a11y warnings |
| `webhint.vscode-webhint` | webhint | WCAG + perf hints |
| `formulahendry.auto-rename-tag` | Auto Rename Tag | HTML tag rename pairs |

Per [`common/install-allowlist.md`](../common/install-allowlist.md)
— stick to verified publishers; `htmlhint.*` is the official
htmlhint VS Code extension (confirmed publisher).

### JetBrains IDEs (WebStorm / IntelliJ)

- Settings → Languages & Frameworks → Style Sheets → Code Quality
  Tools → Stylelint: enable
- Settings → Languages & Frameworks → JavaScript → Prettier:
  enable; run on save
- Settings → Languages & Frameworks → JavaScript → Code Quality
  Tools → ESLint: enable

## Pre-deployment checklist

Before pushing or opening a PR that touches HTML / CSS:

```bash
# 1. Format
pnpm exec prettier --check '**/*.{html,css,scss,ts,tsx}'

# 2. Lint
pnpm exec stylelint '**/*.{css,scss,module.css}' --max-warnings 0
pnpm exec htmlhint '**/*.html'

# 3. Type-check + JS / TS lint
pnpm exec tsc --noEmit
pnpm exec eslint --max-warnings 0

# 4. Unit + a11y
pnpm vitest run --coverage
pnpm test:a11y

# 5. E2E + cross-browser
pnpm exec playwright test

# 6. Visual regression
pnpm chromatic --exit-zero-on-changes

# 7. Performance + a11y budgets
pnpm exec lhci autorun

# 8. Bundle size
pnpm exec size-limit

# 9. Secret scan
gitleaks detect --source . --redact
```

Pre-push hook wraps all of these via `infra/verify-local.sh`.

## Verification block

After every HTML / CSS edit:

```text
Frontend sweep (this turn):
  - prettier --check: clean
  - stylelint --max-warnings 0: 0 warnings
  - htmlhint: 0 errors
  - tsc --noEmit: 0 errors
  - eslint --max-warnings 0: 0 warnings
  - vitest --coverage: 94% lines (touched files); 87% project
  - jest-axe: 0 violations
  - playwright (chromium + firefox + webkit): 47/47 pass
  - chromatic: 0 visual changes
  - lhci: perf 96, a11y 100, BP 100, SEO 100
  - size-limit: main bundle 142 KB (under 150 KB budget)
```

Per [`common/verify-before-claim.md`](../../rules/common/verify-before-claim.md).

## Cross-references

- [`html-css/coding-style.md`](./coding-style.md) — semantic
  HTML + token-driven CSS
- [`html-css/patterns.md`](./patterns.md) — component
  composition + APG patterns
- [`html-css/security.md`](./security.md) — CSP, Trusted Types,
  sanitisation gates
- [`html-css/testing.md`](./testing.md) — unit + a11y + visual +
  E2E + perf layers
- [`common/hooks.md`](../common/hooks.md) — hook lifecycle
- [`common/extreme-lint-policy.md`](../common/extreme-lint-policy.md)
  — strict lint posture
- [`common/security-controls-org-wide.md`](../common/security-controls-org-wide.md)
  — SHA-pinned actions
- [`common/local-dev-setup.md`](../common/local-dev-setup.md)
  — verify-local.sh + CI parity
- [`common/verify-before-claim.md`](../../rules/common/verify-before-claim.md)
  — same-turn verification block
- [`common/a11y.md`](../common/a11y.md) — WCAG 2.2 AA gate
- [`typescript/hooks.md`](../typescript/hooks.md) — JS / TS
  side of the same workflow
- `frontend-patterns` skill (auto-activates on UI files) —
  visual design quality bar

## Why this rule exists

Frontend CI without these gates ships:

- Inconsistent formatting (one team uses Prettier, another
  doesn't — diff churn)
- Stylelint warnings that turn into accepted noise
- HTML markup that passes review but fails htmlhint (missing
  alt attrs, duplicate ids, inline styles)
- Accessibility regressions that surface only after a customer
  complaint
- Visual regressions that the team didn't notice until a user
  reported a broken layout
- Bundle bloat from a casual dep import
- Perf regressions that move Core Web Vitals out of "Good"

Each gate adds CI seconds to minutes; each catch is hours of
incident response avoided.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- Stylelint pre-commit hook bypassed via `--no-verify`
  (gate weakening)
- New action used without SHA pin in workflow file
- Test:a11y job skipped or made conditional in a PR (rule §A03
  weakening — sister `common/a11y.md`)
- Lighthouse threshold regressed past the budget for > 1 PR
  cycle without rollback (perf budget drift)
- Visual regression baseline accepted without human review
  (rule weakening)
- Bundle size grows past the budget without justification
  (rule 9 weakening)
- IDE settings file missing the stylelint validate list (DX
  weakening — devs author without inline validation)

**Refinement candidates**:

- New CI job row when a new frontend tool (Biome, Oxlint,
  Rolldown) gains team adoption
- Tightening of the prettier scope when a recurring formatting
  drift class emerges (e.g., new file type)
- New IDE recommendation when a maintained extension provides
  better inline feedback
- New cross-reference when a sister rule (frontend-patterns
  skill, common/dependency-vulnerabilities) adds a gate the
  workflow must include
