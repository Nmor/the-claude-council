# HTML / CSS Testing

> Auto-fires on every `*.html`, `*.css`, `*.test.{ts,tsx,jsx,js}`,
> `*.spec.{ts,tsx,jsx,js}`, `*.e2e.{ts,tsx,jsx,js}`,
> `*.stories.{ts,tsx,jsx,js}`, `playwright.config.*`,
> `cypress.config.*` file. Standards: **W3C Web Platform Tests**,
> **axe-core 4.x** (Deque), **Pa11y**, **Playwright** (current),
> **Vitest** / **Jest** for component tests, **Testing Library**
> family (React / Vue / Svelte / DOM), **Lighthouse**, **Chrome
> User Experience Report**, **Core Web Vitals**.

## Core Principle

**Frontend testing is layered: unit tests verify component
behaviour in isolation; visual regression catches CSS drift;
accessibility tests gate WCAG 2.2 AA at PR time; E2E tests
verify the critical user journeys end-to-end against a real
browser. Every interactive component ships with a keyboard test,
a screen-reader-friendly assertion, and a visual snapshot.
Coverage isn't a number — it's "did we test the keyboard path,
the error path, the empty state, and the reduced-motion path?"**

## The frontend testing pyramid

| Layer | Tool | Coverage scope |
| --- | --- | --- |
| **Unit** (DOM + component logic) | Vitest / Jest + Testing Library | Render output; user events; reducer / hook logic |
| **Accessibility** (axe-core) | axe-core / pa11y / @axe-core/playwright | WCAG 2.2 AA violations |
| **Visual regression** | Chromatic / Percy / Playwright snapshot / Storybook test runner | Pixel + DOM diff per component / story |
| **Storybook interactions** | @storybook/test (Vitest-based) | Component behaviour in dev environment |
| **E2E** (browser) | Playwright / Cypress / WebdriverIO | Critical user journeys |
| **Performance** | Lighthouse CI / WebPageTest | Core Web Vitals; bundle size |
| **Cross-browser matrix** | Playwright with multiple `projects` | Chromium / Firefox / WebKit |
| **Real-device** | BrowserStack / SauceLabs / Lambda Test | Critical paths on iOS Safari / Android Chrome |

Per [`common/testing.md`](../common/testing.md) — the unit
floor is 90% touched / 80% project. The other layers are
journey-scoped, not coverage-scoped.

## Hard rules

### 1. Testing Library, not Enzyme / `wrapper.find('div.foo')`

Testing Library queries by ROLE, LABEL, TEXT — what a user (or
screen reader) sees:

```typescript
// WRONG — implementation-coupled
expect(wrapper.find('.btn-primary').text()).toBe('Submit');

// RIGHT — user-facing
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('submits the form', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();
  render(<LoginForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
  await user.type(screen.getByLabelText(/password/i), 'supersecret');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'alice@example.com',
    password: 'supersecret',
  });
});
```

Query priority (Testing Library docs):

1. `getByRole` — what assistive tech sees
2. `getByLabelText` — forms
3. `getByPlaceholderText` — fallback when no label exists (note:
   placeholder as label is an a11y violation per coding-style.md
   rule 3)
4. `getByText` — non-interactive content
5. `getByDisplayValue` — form value
6. `getByAltText` — images
7. `getByTitle`
8. `getByTestId` — LAST RESORT; surface a real label instead

`getByTestId` is an escape hatch; using it more than once per
component file usually indicates missing semantic HTML.

### 2. Test the keyboard path

```typescript
test('disclosure expands on Enter + Space; closes on Escape', async () => {
  const user = userEvent.setup();
  render(<Disclosure summary="What's included?">Details here</Disclosure>);

  const trigger = screen.getByRole('button', { name: /what's included/i });
  trigger.focus();
  expect(trigger).toHaveFocus();

  await user.keyboard('{Enter}');
  expect(screen.getByText('Details here')).toBeVisible();
  expect(trigger).toHaveAttribute('aria-expanded', 'true');

  await user.keyboard('{Space}');
  expect(screen.queryByText('Details here')).not.toBeVisible();

  await user.keyboard('{Enter}');
  expect(screen.getByText('Details here')).toBeVisible();
  await user.keyboard('{Escape}');
  expect(screen.queryByText('Details here')).not.toBeVisible();
});
```

Per [`common/a11y.md`](../common/a11y.md) — every interactive
component has a keyboard test.

### 3. Test the error + empty + loading state

```typescript
describe('OrderList', () => {
  test('loading state announces "Loading orders"', () => {
    render(<OrderList status="loading" orders={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading orders/i);
  });

  test('empty state renders the CTA', () => {
    render(<OrderList status="success" orders={[]} />);
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /shop now/i })).toBeInTheDocument();
  });

  test('error state announces the failure + retry button', () => {
    const onRetry = vi.fn();
    render(<OrderList status="error" errorCode="orders_fetch_failed" onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/couldn't load orders/i);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  test('reduced-motion respected', () => {
    // userMediaQuery emulates prefers-reduced-motion
    setReducedMotion(true);
    render(<OrderList status="loading" orders={[]} />);
    const skeleton = screen.getByTestId('order-list-skeleton');
    expect(window.getComputedStyle(skeleton).animationDuration).toBe('0.01ms');
  });
});
```

Per [`common/error-codes.md`](../common/error-codes.md) — the
test asserts on the `error_code` mapping, not the copy.

### 4. axe-core in unit + E2E

```typescript
// Component-level axe assertion (Vitest + jest-axe)
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend({ toHaveNoViolations });

test('LoginForm has no a11y violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

```typescript
// Playwright E2E axe scan
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('login page passes axe scan', async ({ page }) => {
  await page.goto('/login');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

Run axe in BOTH layers:

- Component-level catches violations early (per-component
  scope, faster feedback)
- E2E-level catches integration violations (e.g., colour
  contrast against a theme the component doesn't know about)

### 5. Visual regression on every component + story

Storybook + Chromatic / Percy / Playwright snapshot is the
de-facto standard:

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    chromatic: {
      modes: {
        'light-mobile': { viewport: { width: 375 }, theme: 'light' },
        'light-desktop': { viewport: { width: 1280 }, theme: 'light' },
        'dark-desktop': { viewport: { width: 1280 }, theme: 'dark' },
        'reduced-motion': { motion: 'reduce' },
      },
    },
  },
};

export default meta;

export const Primary: StoryObj<typeof Button> = {
  args: { variant: 'primary', children: 'Sign in' },
};

export const PrimaryWithIcon: StoryObj<typeof Button> = {
  args: { variant: 'primary', leadingIcon: 'arrow-right', children: 'Continue' },
};

export const Loading: StoryObj<typeof Button> = {
  args: { variant: 'primary', loading: true, children: 'Signing in' },
};

export const Disabled: StoryObj<typeof Button> = {
  args: { variant: 'primary', disabled: true, children: 'Sign in' },
};
```

Every story is one visual-regression test. Chromatic / Percy
diff against the baseline; CI fails if pixels change.

### 6. E2E covers the critical user journey

```typescript
// e2e/checkout.spec.ts
test('shopper completes checkout end-to-end', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /shop now/i }).click();

  await page.getByRole('button', { name: /add to cart/i }).click();
  await expect(page.getByRole('status')).toContainText(/added to cart/i);

  await page.getByRole('link', { name: /cart/i }).click();
  await expect(page).toHaveURL(/\/cart/);

  await page.getByRole('button', { name: /checkout/i }).click();
  await page.getByLabel('Email').fill('shopper@example.com');
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  // … rest of payment flow with test cards …

  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();

  // Assert no a11y violations on the confirmation
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Critical journeys per project: signup, login, primary
conversion (checkout / submit / publish), account deletion,
core admin task.

### 7. Cross-browser matrix in CI

Playwright `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
  retries: 2,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['github'],
  ],
});
```

CI runs all 5 projects; failures attach video + trace artefacts
per [`common/local-dev-setup.md`](../common/local-dev-setup.md).

### 8. Performance budget gates

Lighthouse CI configuration:

```jsonc
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000", "http://localhost:3000/checkout"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 1 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

LCP < 2.5s, INP < 200ms, CLS < 0.1 — Core Web Vitals "Good"
thresholds.

### 9. Bundle size budget

```jsonc
// size-limit config in package.json
{
  "size-limit": [
    { "name": "main bundle", "path": "dist/main.*.js", "limit": "150 KB" },
    { "name": "main CSS", "path": "dist/main.*.css", "limit": "50 KB" },
    { "name": "route /checkout", "path": "dist/route-checkout.*.js", "limit": "60 KB" }
  ]
}
```

CI runs `pnpm size-limit` (or `bundlewatch`); regressing a
budget by > N% fails the build.

### 10. Mutation testing for critical logic

`Stryker Mutator` (stryker-js) mutates source + runs tests;
tests that don't catch mutations are weak.

```bash
pnpm stryker run
```

Critical-path logic targets ≥ 70% mutation score; surface UI
targets are exempt (component test coverage handles it).

## What NOT to do

### Anti-pattern 1: Snapshot tests instead of behaviour tests

Jest / Vitest `toMatchSnapshot()` on a giant DOM tree is
brittle and meaningless. Snapshots that the team blindly
regenerates with `--update-snapshots` are no test at all.

Reserve snapshots for:

- Small, stable data shapes (error envelopes, formatters)
- Rendered email HTML (transactional templates)

For UI, use behaviour tests + visual regression instead.

### Anti-pattern 2: Testing private implementation details

```typescript
// WRONG — tests internal state
expect(component.state.activeTab).toBe(1);

// RIGHT — tests user-visible behaviour
expect(screen.getByRole('tab', { name: /details/i })).toHaveAttribute(
  'aria-selected',
  'true',
);
```

Implementation details change; user contract doesn't.

### Anti-pattern 3: 100% coverage from `it.todo`

```typescript
// USELESS
test.todo('handles error state');
test.todo('handles empty state');
```

`it.todo` shows in the test report as a not-implemented test.
Either implement it or remove the placeholder.

### Anti-pattern 4: E2E flakes silenced via `await page.waitForTimeout(...)`

```typescript
// WRONG — fixed sleep masks the real timing issue
await page.click('#submit');
await page.waitForTimeout(2000);
await expect(page.getByText('Confirmed')).toBeVisible();

// RIGHT — wait for the actual signal
await page.click('#submit');
await expect(page.getByText('Confirmed')).toBeVisible();
// (Playwright auto-waits for the element to appear)
```

Flake-suppressing sleeps slow tests + hide real regressions
that surface as intermittent failures under load.

### Anti-pattern 5: Mocked browser APIs that diverge from real ones

```typescript
// jsdom doesn't implement IntersectionObserver — common mock
beforeEach(() => {
  global.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  }));
});
```

If your tests rely on mocked-out browser APIs, run the SAME
tests as a Playwright E2E to confirm the real browser behaviour
matches. Mocking + reality divergence is a class of bug
component tests can't catch.

## Required tooling

```bash
# Unit + component tests
pnpm vitest --coverage          # Vitest + V8 coverage
pnpm jest --coverage             # Jest fallback

# Accessibility
pnpm test:a11y                   # jest-axe + custom
pnpm exec axe-core http://localhost:3000

# E2E
pnpm playwright test
pnpm cypress run                 # Cypress fallback

# Visual regression
pnpm chromatic
pnpm exec percy snapshot ./snapshots

# Performance
pnpm exec lhci autorun

# Bundle size
pnpm size-limit

# Mutation
pnpm exec stryker run

# Cross-browser via real-device
pnpm exec playwright test --project=safari-iphone
```

## CI workflow shape

```yaml
# .github/workflows/frontend-ci.yml
---
name: Frontend CI

on: pull_request

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: pnpm/action-setup@<sha>
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest --coverage
      - uses: codecov/codecov-action@<sha>

  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@<sha>
      - uses: pnpm/action-setup@<sha>
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps ${{ matrix.project }}
      - run: pnpm exec playwright test --project=${{ matrix.project }}

  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: pnpm/action-setup@<sha>
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:a11y

  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: pnpm/action-setup@<sha>
      - run: pnpm install --frozen-lockfile
      - run: pnpm chromatic --exit-zero-on-changes  # or Percy

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: pnpm/action-setup@<sha>
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm exec lhci autorun
```

## Cross-references

- [`html-css/coding-style.md`](./coding-style.md) — semantic
  HTML is testable
- [`html-css/patterns.md`](./patterns.md) — accessible
  components are testable
- [`html-css/security.md`](./security.md) — XSS-resistant
  rendering is testable (snapshot of escaped output)
- [`html-css/hooks.md`](./hooks.md) — lint + format + axe gates
- [`common/testing.md`](../common/testing.md) — broader test
  strategy
- [`common/a11y.md`](../common/a11y.md) — WCAG 2.2 AA = test
  gate
- [`common/error-codes.md`](../common/error-codes.md) — assert
  on codes, not copy
- [`common/extreme-lint-policy.md`](../common/extreme-lint-policy.md)
  — coverage floor 90% touched / 80% project
- [`common/local-dev-setup.md`](../common/local-dev-setup.md)
  — same script runs locally + CI

## Why this rule exists

Frontend bugs differ from backend bugs in one critical way:
users see them. A backend bug fires a metric; a frontend bug
breaks the conversion funnel. The testing layers above each
catch a class:

- **Unit + Testing Library** — catches logic regressions
- **axe-core** — catches accessibility regressions (which are
  also legal exposure per [`common/a11y.md`](../common/a11y.md))
- **Visual regression** — catches CSS / design-system drift
  (the "we changed a token, what broke?" question)
- **E2E** — catches the journey-level break (everything works
  in isolation but the wire-up is wrong)
- **Lighthouse / Core Web Vitals** — catches perf regressions
  before they reach the SEO / conversion metrics
- **Bundle-size** — catches dep-bloat creep
- **Mutation** — catches tests that look comprehensive but
  don't actually exercise the assertion

No single layer is sufficient; together they form the gate.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

**Signals to watch**:

- Component shipped without a Testing Library test (rule 1
  weakening)
- Keyboard test absent on a new interactive component (rule 2
  weakening — sister `common/a11y.md`)
- Error / empty / loading state untested for a new feature
  (rule 3 weakening)
- axe-core not invoked at either unit or E2E layer for a new
  page (rule 4 violation)
- Visual regression story not added for a new component
  (rule 5 weakening)
- E2E coverage missing on a critical user journey (rule 6
  weakening)
- Cross-browser matrix dropped to chromium-only (rule 7 — single
  engine bias)
- Lighthouse CI score regresses past the threshold without
  rollback (rule 8 weakening)
- Bundle size grows past the budget without justification
  (rule 9 weakening)
- `waitForTimeout` introduced to mask flake (Anti-pattern 4)
- Snapshot tests dominating UI suite (Anti-pattern 1 drift)

**Refinement candidates**:

- New layer row when a new testing tool (Storybook test runner,
  Vitest browser mode, real-browser axe runner) gains team
  adoption
- Tightening of the Lighthouse threshold when product hits
  consistent green scores
- New cross-reference when a sister rule (a11y, i18n,
  frontend-patterns skill) prescribes a test contract
- New anti-pattern entry when a recurring flake / false-pass
  shape emerges
