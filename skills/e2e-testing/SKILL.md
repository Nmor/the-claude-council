---
name: e2e-testing
description: Playwright E2E testing patterns — Page Object Model, configuration, CI/CD integration, artifact management, flaky test strategies, PLUS the decision-time patterns that come before the first test is written (black-box helper scripts, static-vs-dynamic routing, multi-server orchestration, reconnaissance-then-action, networkidle discipline).
---

# E2E Testing Patterns

Comprehensive Playwright patterns for building stable, fast, and maintainable E2E test suites.

## Purpose

End-to-end tests verify the system as a user encounters it — across the full HTTP stack, real browser engine, real DOM, real network round-trips to (mocked or real) backends. This skill captures the decision-time patterns + execution patterns + flake-management patterns that separate "we have e2e tests" from "our e2e suite catches real regressions without burning the on-call rotation".

What this skill does NOT cover:

- Unit tests + component tests (sister `tdd-workflow` skill; framework-specific helpers in `vue3-patterns`, `frontend-patterns`).
- API-only contract tests (sister `api-design` skill; `contract-testing.md` rule).
- Accessibility audits (sister `wcag-accessibility` skill — axe-core in CI is a different gate).
- Visual regression (separate tooling — Chromatic / Percy / Argos).
- Load + performance testing (k6 / Gatling / Locust — different category).

## When to use

- Adding a critical user journey (signup, checkout, payment, deletion-of-account, plan-tier upgrade).
- Verifying cross-system interactions (web ↔ API ↔ worker ↔ DB) that unit tests cannot reach.
- Reproducing a production bug whose surface is "user clicked X then Y broke" (the report shape that calls for browser-level repro).
- Establishing the smoke-test suite that gates every production deploy.

## When NOT to use

- The target is pure backend HTTP — use `supertest` / `axios` / `requests` instead.
- The target is a CLI tool — use process-spawn assertions.
- The target is a pure function / module — unit test.
- The target is a static landing page with no JS — static-HTML parse (per Decision-time pattern #1 below).
- Coverage gap is at the unit / integration layer — fix THERE first; e2e is the slowest tier of the pyramid.

## Standards cited

- **Playwright** (Microsoft, latest stable line) — Locators API, `waitForLoadState`, `expect(locator).toBeVisible()` auto-retry semantics.
- **WCAG 2.2 §2.4.7 (Focus Visible)** + **§2.5.8 (Target Size Minimum)** — e2e tests for keyboard-only journeys + minimum-target-size verification on mobile viewports.
- **W3C WebDriver BiDi** — the protocol Playwright extends; understanding helps when debugging network-event timing.
- **CI/CD industry norms** — GitHub Actions / GitLab CI artifact retention (typically 30-90 days for test traces + videos + screenshots).
- `~/.claude/rules/common/testing.md` § "Test pyramid" + § "Critical-path coverage ≥ 95%" — the broader testing rule this skill operationalises.
- `~/.claude/rules/common/extreme-lint-policy.md` § "Coverage" — touched-file ≥ 90% applies to the test files themselves.
- `~/.claude/rules/common/proper-fixes-first.md` § "Healthcheck loosening" — same anti-pattern in test form (bumping test timeout to mask a real slow code path is BANNED).

## Decision-time patterns (BEFORE writing a single test)

These five patterns apply at task-entry — choosing the right approach is more impactful than choosing the right assertion.

### 1. Static-first decision tree

Not every "test this page" task needs a browser. Route the work:

```
User task → Is the target STATIC HTML?
    ├─ YES → Read the HTML file directly to identify selectors
    │         ├─ Success → Write test using those selectors
    │         └─ Fails / dynamic content present → Treat as dynamic (below)
    │
    └─ NO (dynamic webapp) → Is the dev server already running?
        ├─ NO → Use `with_server.py` (or equivalent) to manage server lifecycle
        │
        └─ YES → Reconnaissance-then-action pattern (see #3)
```

Static-first saves 95% of test boot time + sidesteps the entire browser-flake surface for cases that don't need a browser.

### 2. Black-box helper scripts (LLM context-window protection)

Helper scripts (`with_server.py`, `wait-for-port.sh`, `seed-test-data.py`, etc.) live in `tests/scripts/` or `tools/`. The rule:

```
✅ DO: Run the script with --help; treat it as a CLI black box.
❌ DON'T: Read the script source into context unless --help genuinely doesn't cover what you need.
```

Helper-script source can be hundreds of lines that pollute the working context. The script's `--help` output tells the agent exactly what flags exist; that's enough to use it. Only read source when behaviour is ambiguous AND the script needs modification.

### 3. Reconnaissance-then-action

For dynamic pages, never guess selectors. Always:

```typescript
// 1. Navigate + wait for the app to be in a stable state
await page.goto(url);
await page.waitForLoadState('networkidle');  // HARD REQUIREMENT — see #5

// 2. Inspect rendered DOM
await page.screenshot({ path: '/tmp/recon.png', fullPage: true });
const html = await page.content();
const buttons = await page.locator('button').all();
// inspect: console.log(await Promise.all(buttons.map(b => b.textContent())));

// 3. NOW write actions against discovered selectors
await page.locator('[data-testid="discovered-button"]').click();
```

Blind selector guessing produces the bulk of "works locally, flakes in CI" failures.

### 4. Multi-server orchestration

When the e2e suite needs backend + frontend + worker simultaneously, use a server-orchestration helper (canonical pattern: `with_server.py`):

```bash
python tests/scripts/with_server.py \
  --server "cd backend && uv run uvicorn app.main:app --port 3000" --port 3000 \
  --server "cd frontend && pnpm dev" --port 5173 \
  --server "cd worker && uv run python -m worker" --port 7000 \
  -- python tests/run_e2e.py
```

The helper starts every server, waits for each port to be ready, runs the test command, then tears down on exit (even on Ctrl+C / test failure). Your test code stays focused on Playwright logic — it never has to know how to launch the servers.

Avoid embedding multi-server lifecycle into `playwright.config.ts` `webServer` block when you have ≥ 3 servers — the config block doesn't sequence dependencies well + leaks processes on test crashes.

### 5. `networkidle` is a hard requirement before DOM inspection

This is the most common Playwright pitfall:

```typescript
// ❌ FORBIDDEN — DOM is not stable; selectors may not exist yet
await page.goto(url);
const button = page.locator('button.submit');
await button.click();  // flakes ~5-15% in CI

// ✅ REQUIRED
await page.goto(url);
await page.waitForLoadState('networkidle');  // wait for the SPA to hydrate
const button = page.locator('button.submit');
await button.click();
```

Apply this rule everywhere a page transitions: after `goto`, after navigation clicks, after dialog opens, after async fetch triggers.

### When NOT to use a browser at all

Skip Playwright entirely when:

- The target is purely an HTTP API → use `supertest` / `axios` / `requests`
- The target is a CLI → use process-spawn assertions
- The target is a pure function / module → unit test
- The target is a static landing page (no JS) → static-HTML parse (per #1)

E2E is the slowest, most-brittle layer of the test pyramid. Use it for true cross-system journeys, not for things faster layers cover.

## Test File Organization

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── logout.spec.ts
│   │   └── register.spec.ts
│   ├── features/
│   │   ├── browse.spec.ts
│   │   ├── search.spec.ts
│   │   └── create.spec.ts
│   └── api/
│       └── endpoints.spec.ts
├── fixtures/
│   ├── auth.ts
│   └── data.ts
└── playwright.config.ts
```

## Page Object Model (POM)

```typescript
import { Page, Locator } from '@playwright/test'

export class ItemsPage {
  readonly page: Page
  readonly searchInput: Locator
  readonly itemCards: Locator
  readonly createButton: Locator

  constructor(page: Page) {
    this.page = page
    this.searchInput = page.locator('[data-testid="search-input"]')
    this.itemCards = page.locator('[data-testid="item-card"]')
    this.createButton = page.locator('[data-testid="create-btn"]')
  }

  async goto() {
    await this.page.goto('/items')
    await this.page.waitForLoadState('networkidle')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForResponse(resp => resp.url().includes('/api/search'))
    await this.page.waitForLoadState('networkidle')
  }

  async getItemCount() {
    return await this.itemCards.count()
  }
}
```

## Test Structure

```typescript
import { test, expect } from '@playwright/test'
import { ItemsPage } from '../../pages/ItemsPage'

test.describe('Item Search', () => {
  let itemsPage: ItemsPage

  test.beforeEach(async ({ page }) => {
    itemsPage = new ItemsPage(page)
    await itemsPage.goto()
  })

  test('should search by keyword', async ({ page }) => {
    await itemsPage.search('test')

    const count = await itemsPage.getItemCount()
    expect(count).toBeGreaterThan(0)

    await expect(itemsPage.itemCards.first()).toContainText(/test/i)
    await page.screenshot({ path: 'artifacts/search-results.png' })
  })

  test('should handle no results', async ({ page }) => {
    await itemsPage.search('xyznonexistent123')

    await expect(page.locator('[data-testid="no-results"]')).toBeVisible()
    expect(await itemsPage.getItemCount()).toBe(0)
  })
})
```

## Playwright Configuration

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
    ['json', { outputFile: 'playwright-results.json' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

## Flaky Test Patterns

### Quarantine

```typescript
test('flaky: complex search', async ({ page }) => {
  test.fixme(true, 'Flaky - Issue #123')
  // test code...
})

test('conditional skip', async ({ page }) => {
  test.skip(process.env.CI, 'Flaky in CI - Issue #123')
  // test code...
})
```

### Identify Flakiness

```bash
npx playwright test tests/search.spec.ts --repeat-each=10
npx playwright test tests/search.spec.ts --retries=3
```

### Common Causes & Fixes

**Race conditions:**
```typescript
// Bad: assumes element is ready
await page.click('[data-testid="button"]')

// Good: auto-wait locator
await page.locator('[data-testid="button"]').click()
```

**Network timing:**
```typescript
// Bad: arbitrary timeout
await page.waitForTimeout(5000)

// Good: wait for specific condition
await page.waitForResponse(resp => resp.url().includes('/api/data'))
```

**Animation timing:**
```typescript
// Bad: click during animation
await page.click('[data-testid="menu-item"]')

// Good: wait for stability
await page.locator('[data-testid="menu-item"]').waitFor({ state: 'visible' })
await page.waitForLoadState('networkidle')
await page.locator('[data-testid="menu-item"]').click()
```

## Artifact Management

### Screenshots

```typescript
await page.screenshot({ path: 'artifacts/after-login.png' })
await page.screenshot({ path: 'artifacts/full-page.png', fullPage: true })
await page.locator('[data-testid="chart"]').screenshot({ path: 'artifacts/chart.png' })
```

### Traces

```typescript
await browser.startTracing(page, {
  path: 'artifacts/trace.json',
  screenshots: true,
  snapshots: true,
})
// ... test actions ...
await browser.stopTracing()
```

### Video

```typescript
// In playwright.config.ts
use: {
  video: 'retain-on-failure',
  videosPath: 'artifacts/videos/'
}
```

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          BASE_URL: ${{ vars.STAGING_URL }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Test Report Template

```markdown
# E2E Test Report

**Date:** YYYY-MM-DD HH:MM
**Duration:** Xm Ys
**Status:** PASSING / FAILING

## Summary
- Total: X | Passed: Y (Z%) | Failed: A | Flaky: B | Skipped: C

## Failed Tests

### test-name
**File:** `tests/e2e/feature.spec.ts:45`
**Error:** Expected element to be visible
**Screenshot:** artifacts/failed.png
**Recommended Fix:** [description]

## Artifacts
- HTML Report: playwright-report/index.html
- Screenshots: artifacts/*.png
- Videos: artifacts/videos/*.webm
- Traces: artifacts/*.zip
```

## Wallet / Web3 Testing

```typescript
test('wallet connection', async ({ page, context }) => {
  // Mock wallet provider
  await context.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === 'eth_requestAccounts')
          return ['0x1234567890123456789012345678901234567890']
        if (method === 'eth_chainId') return '0x1'
      }
    }
  })

  await page.goto('/')
  await page.locator('[data-testid="connect-wallet"]').click()
  await expect(page.locator('[data-testid="wallet-address"]')).toContainText('0x1234')
})
```

## Financial / Critical Flow Testing

```typescript
test('trade execution', async ({ page }) => {
  // Skip on production — real money
  test.skip(process.env.NODE_ENV === 'production', 'Skip on production')

  await page.goto('/markets/test-market')
  await page.locator('[data-testid="position-yes"]').click()
  await page.locator('[data-testid="trade-amount"]').fill('1.0')

  // Verify preview
  const preview = page.locator('[data-testid="trade-preview"]')
  await expect(preview).toContainText('1.0')

  // Confirm and wait for blockchain
  await page.locator('[data-testid="confirm-trade"]').click()
  await page.waitForResponse(
    resp => resp.url().includes('/api/trade') && resp.status() === 200,
    { timeout: 30000 }
  )

  await expect(page.locator('[data-testid="trade-success"]')).toBeVisible()
})
```

## Anti-patterns

| Anti-pattern | Why it's wrong | Named alternative |
| --- | --- | --- |
| `page.waitForTimeout(N)` to "wait for the UI" | Magic number; flakes when CI is 200 ms slower; passes locally + fails in CI | `waitForLoadState('networkidle')` after navigation; `expect(locator).toBeVisible({ timeout })` for elements |
| Locator built from a CSS class or `:nth-child(N)` | Breaks on any restyle / re-order; brittle | `data-testid` attribute OR `getByRole(role, { name })` / `getByLabel` / `getByText` |
| One huge test file that exercises every flow | Slow + impossible to debug a single failure | Split per journey; the file structure mirrors the user flow |
| Tests sharing fixtures via global state | Test order matters; parallel execution flakes | Per-test fixture creation via `test.beforeEach` or fixture factories |
| Test runs against shared staging DB | Data leaks across runs; concurrent CI corrupts state | Per-run database via Docker / containerised dev DB; truncate between tests |
| `page.click('button')` without prior recon | Selector resolves to the wrong button or no button | Reconnaissance-then-action (pattern #3) — inspect DOM first, then act |
| Bumping the test timeout to "fix" flake | Hides a real slow code path (per `proper-fixes-first.md`) | Root-cause the slowness OR quarantine + investigate; never raise the gate |
| Catch-and-swallow in test setup | Test reports green while the setup actually failed | Let setup failures propagate; per-test `beforeAll` cleanup runs on failure too |
| Embedding multi-server lifecycle in `playwright.config.ts` `webServer` for ≥ 3 servers | Leaks processes on test crashes; dependency ordering breaks | `with_server.py` (Decision-time pattern #4) — dedicated orchestrator with cleanup |
| Reading helper-script source into context to "understand it" | Pollutes the agent context window with code that has `--help` | Treat scripts as black boxes (pattern #2); read source ONLY when modification is required |

## Cross-references

- Sister rule: `~/.claude/rules/common/testing.md` — broader test pyramid, coverage thresholds (≥ 90% touched / ≥ 80% project / ≥ 95% critical-path).
- Sister rule: `~/.claude/rules/common/proper-fixes-first.md` — bumping a test timeout to mask slow code is the same shape as bumping a healthcheck timeout in prod; both are BANNED.
- Sister rule: `~/.claude/rules/common/extreme-lint-policy.md` — the test code itself must pass the same lint bar as product code.
- Sister rule: `~/.claude/rules/common/idempotency.md` — when an e2e test exercises a mutation, the test must be safe to re-run (per `RFC 9110 §9.2.2`).
- Sister skill: `~/.claude/skills/frontend-patterns/SKILL.md` — component-level testing patterns that sit one layer below e2e.
- Sister skill: `~/.claude/skills/vue3-patterns/SKILL.md` / `~/.claude/skills/typescript-patterns/SKILL.md` — framework-specific test idioms.
- Sister skill: `~/.claude/skills/wcag-accessibility/SKILL.md` — accessibility tests (axe-core) belong in a separate CI step.
- Sister skill: `~/.claude/skills/tdd-workflow/SKILL.md` — RED/GREEN/REFACTOR discipline for unit + integration layers below e2e.
- Agent that pairs: `~/.claude/agents/e2e-runner.md` — Council Division 5 (Testing & QA) lead for e2e orchestration.
- Agent that pairs: `~/.claude/agents/tdd-guide.md` — pairs on the test pyramid (writes unit + integration FIRST; this skill covers e2e on top).
- `/e2e` command — generates + runs e2e tests with artifact capture.

## Why this skill exists

Most e2e failure modes are predictable + repeating:

1. Selector built from CSS class → restyle breaks the test
2. No `networkidle` wait → race condition flakes 5-15% of CI runs
3. Shared staging DB → tests corrupt each other in parallel
4. Multi-server lifecycle embedded in playwright.config → orphan processes after crashes
5. `waitForTimeout(N)` magic numbers → passes locally + fails when CI is slower
6. One huge test file → can't isolate a single failure

The cost of doing it right (data-testid, reconnaissance-then-action, with_server.py, networkidle, per-journey files) is paid ONCE at suite-design time. The cost of doing it wrong is paid every CI run, every on-call rotation, every "flaky test" Slack message, and every regression that snuck past a yellow run nobody trusted.

This skill captures the decision-time patterns (the static-first decision tree, the black-box helper script discipline, the reconnaissance-then-action loop) ALONGSIDE the execution patterns (POM, fixtures, artifacts, CI integration), because the decisions made before the first test is written determine 80% of the suite's eventual quality.

## Standards Cited

- **W3C WebDriver BiDi Spec** — Bidirectional browser automation
  protocol (Playwright, Puppeteer, Selenium 4+ backend)
- **NIST SP 800-218 SSDF §PW.7 + §PW.8** — Code review +
  executable testing (E2E is the user-flow proof)
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing + evaluation
- **OWASP ASVS 4.0.3 §V14.1** — Build pipeline (E2E is the user-
  observable layer of the verification gate suite)
- **ISO/IEC/IEEE 29119** — Software testing standards (test
  process / documentation / techniques / keyword-driven)
- **ISO/IEC 25010:2011 §6.5** — Quality in use (effectiveness +
  efficiency + satisfaction + freedom from risk + context coverage)
- **WCAG 2.2 (W3C Recommendation Oct 2023)** — accessibility
  conformance criteria E2E flows must verify
- **CWE-1059** — Insufficient technical documentation (E2E flows
  ARE living docs of expected behaviour)
- **`~/.claude/rules/common/testing.md`** — Coverage thresholds
  (≥ 90% touched / ≥ 80% project; critical paths ≥ 95%)
- **`~/.claude/rules/common/local-testability.md`** — E2E must be
  runnable locally before declared green

## Cross-References

- `tdd-workflow` skill — unit-test counterpart; E2E is integration
  level
- `frontend-patterns` skill — component patterns E2E exercises
- `~/.claude/rules/common/testing.md` — coverage gates
- `~/.claude/rules/common/verify-before-claim.md` — E2E result IS
  the proof
- `~/.claude/agents/e2e-runner.md` — Playwright orchestration agent
- `~/.claude/rules/common/done-criteria.md` — E2E pass required
  before "done" claim


## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Hard-coded `sleep(5000)` for timing | Flaky on slow CI; wastes time on fast | Use Playwright's auto-waiting `expect()` matchers; pollUntil for explicit waits |
| One mega-test covering 12 user flows | One failure obscures all others; slow to diagnose | One test per user journey; share fixtures via `test.use` |
| E2E test depends on a previous test's mutation | Random-order runs fail; coupling between tests | Each test seeds its own data; teardown afterwards |
| Selectors via brittle CSS chains (`.row:nth-child(3) > div > span`) | Breaks on layout change | `data-testid` attribute; role-based selectors (`getByRole`) |
| Test runs against production DB | Pollutes prod; security risk | Dedicated test environment with seeded fixtures |
| Snapshot the whole page DOM | Every minor diff fails the snapshot | Targeted assertions on visible text + critical elements |
| Suite passes locally; fails in CI | Timezone / locale / viewport drift | CI mirrors local exactly: Docker image, browser version pinned |
| Re-run failed tests until they pass | Hides real flakes; trains team to ignore failures | Quarantine flaky tests; investigate root cause; fix or delete |


## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Critical user journey added without E2E coverage (sister `testing.md` rule)
- Locator uses CSS classes / xpath / `:nth-child` instead of `data-testid` / role / text (brittle locator pattern)
- `page.waitForTimeout(N)` used instead of `waitForResponse` / `waitForSelector` / `toBeVisible` (flaky timing)
- Test depends on prod data / shared fixtures (test-isolation drift)
- Network-mocking absent on external integrations (test couples to vendor uptime)
- Screenshot / trace artifacts not captured on failure (debugging surface missing)
- Same E2E test flakes > 3 times without quarantine + root-cause investigation
- E2E pyramid inverted (more E2E than unit / integration tests — slow + brittle pyramid)

**Refinement candidates**:
- New journey class row when a recurring critical flow emerges (e.g., new auth modality, new payment provider)
- Tightening of the locator standard when a new framework's testability API matures
- New cross-reference when a sister skill (frontend-patterns, wcag-accessibility) adds an E2E-relevant gate
- New flake-quarantine template when a recurring infra-flake class recurs
