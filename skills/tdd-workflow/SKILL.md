---
name: tdd-workflow
description: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 70%+ coverage including unit, integration, and E2E tests.
---

# Test-Driven Development Workflow

This skill ensures all code development follows TDD principles with comprehensive test coverage.

## When to Activate

- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding API endpoints
- Creating new components

## Core Principles

### 1. Tests BEFORE Code

ALWAYS write tests first, then implement code to make tests pass.

### 2. Coverage Requirements

- Minimum 70% coverage (unit + integration + E2E)
- All edge cases covered
- Error scenarios tested
- Boundary conditions verified

### 3. Test Types

#### Unit Tests

- Individual functions and utilities
- Component logic
- Pure functions
- Helpers and utilities

#### Integration Tests

- API endpoints
- Database operations
- Service interactions
- External API calls

#### E2E Tests (Playwright)

- Critical user flows
- Complete workflows
- Browser automation
- UI interactions

## TDD Workflow Steps

### Step 1: Write User Journeys

```text
As a [role], I want to [action], so that [benefit]

Example:
As a user, I want to search for markets semantically,
so that I can find relevant markets even without exact keywords.
```

### Step 2: Generate Test Cases

For each user journey, create comprehensive test cases:

```typescript
describe('Semantic Search', () => {
  it('returns relevant markets for query', async () => {
    // Test implementation
  })

  it('handles empty query gracefully', async () => {
    // Test edge case
  })

  it('falls back to substring search when Redis unavailable', async () => {
    // Test fallback behavior
  })

  it('sorts results by similarity score', async () => {
    // Test sorting logic
  })
})
```

### Step 3: Run Tests (They Should Fail)

```bash
npm test
# Tests should fail - we haven't implemented yet
```

### Step 4: Implement Code

Write minimal code to make tests pass:

```typescript
// Implementation guided by tests
export async function searchMarkets(query: string) {
  // Implementation here
}
```

### Step 5: Run Tests Again

```bash
npm test
# Tests should now pass
```

### Step 6: Refactor

Improve code quality while keeping tests green:

- Remove duplication
- Improve naming
- Optimize performance
- Enhance readability

### Step 7: Verify Coverage

```bash
npm run test:coverage
# Verify 70%+ coverage achieved
```

## Testing Patterns

### Unit Test Pattern (Jest/Vitest)

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### API Integration Test Pattern

```typescript
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/markets', () => {
  it('returns markets successfully', async () => {
    const request = new NextRequest('http://localhost/api/markets')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('validates query parameters', async () => {
    const request = new NextRequest('http://localhost/api/markets?limit=invalid')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('handles database errors gracefully', async () => {
    // Mock database failure
    const request = new NextRequest('http://localhost/api/markets')
    // Test error handling
  })
})
```

### E2E Test Pattern (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test('user can search and filter markets', async ({ page }) => {
  // Navigate to markets page
  await page.goto('/')
  await page.click('a[href="/markets"]')

  // Verify page loaded
  await expect(page.locator('h1')).toContainText('Markets')

  // Search for markets
  await page.fill('input[placeholder="Search markets"]', 'election')

  // Wait for debounce and results
  await page.waitForTimeout(600)

  // Verify search results displayed
  const results = page.locator('[data-testid="market-card"]')
  await expect(results).toHaveCount(5, { timeout: 5000 })

  // Verify results contain search term
  const firstResult = results.first()
  await expect(firstResult).toContainText('election', { ignoreCase: true })

  // Filter by status
  await page.click('button:has-text("Active")')

  // Verify filtered results
  await expect(results).toHaveCount(3)
})

test('user can create a new market', async ({ page }) => {
  // Login first
  await page.goto('/creator-dashboard')

  // Fill market creation form
  await page.fill('input[name="name"]', 'Test Market')
  await page.fill('textarea[name="description"]', 'Test description')
  await page.fill('input[name="endDate"]', '2025-12-31')

  // Submit form
  await page.click('button[type="submit"]')

  // Verify success message
  await expect(page.locator('text=Market created successfully')).toBeVisible()

  // Verify redirect to market page
  await expect(page).toHaveURL(/\/markets\/test-market/)
})
```

## Test File Organization

```text
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx          # Unit tests
│   │   └── Button.stories.tsx       # Storybook
│   └── MarketCard/
│       ├── MarketCard.tsx
│       └── MarketCard.test.tsx
├── app/
│   └── api/
│       └── markets/
│           ├── route.ts
│           └── route.test.ts         # Integration tests
└── e2e/
    ├── markets.spec.ts               # E2E tests
    ├── trading.spec.ts
    └── auth.spec.ts
```

## Mocking External Services

### Supabase Mock

```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: [{ id: 1, name: 'Test Market' }],
          error: null
        }))
      }))
    }))
  }
}))
```

### Redis Mock

```typescript
jest.mock('@/lib/redis', () => ({
  searchMarketsByVector: jest.fn(() => Promise.resolve([
    { slug: 'test-market', similarity_score: 0.95 }
  ])),
  checkRedisHealth: jest.fn(() => Promise.resolve({ connected: true }))
}))
```

### OpenAI Mock

```typescript
jest.mock('@/lib/openai', () => ({
  generateEmbedding: jest.fn(() => Promise.resolve(
    new Array(1536).fill(0.1) // Mock 1536-dim embedding
  ))
}))
```

## Test Coverage Verification

### Run Coverage Report

```bash
npm run test:coverage
```

### Coverage Thresholds

```json
{
  "jest": {
    "coverageThresholds": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Common Testing Mistakes to Avoid

### ❌ WRONG: Testing Implementation Details

```typescript
// Don't test internal state
expect(component.state.count).toBe(5)
```

### ✅ CORRECT: Test User-Visible Behavior

```typescript
// Test what users see
expect(screen.getByText('Count: 5')).toBeInTheDocument()
```

### ❌ WRONG: Brittle Selectors

```typescript
// Breaks easily
await page.click('.css-class-xyz')
```

### ✅ CORRECT: Semantic Selectors

```typescript
// Resilient to changes
await page.click('button:has-text("Submit")')
await page.click('[data-testid="submit-button"]')
```

### ❌ WRONG: No Test Isolation

```typescript
// Tests depend on each other
test('creates user', () => { /* ... */ })
test('updates same user', () => { /* depends on previous test */ })
```

### ✅ CORRECT: Independent Tests

```typescript
// Each test sets up its own data
test('creates user', () => {
  const user = createTestUser()
  // Test logic
})

test('updates user', () => {
  const user = createTestUser()
  // Update logic
})
```

## Continuous Testing

### Watch Mode During Development

```bash
npm test -- --watch
# Tests run automatically on file changes
```

### Pre-Commit Hook

```bash
# Runs before every commit
npm test && npm run lint
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Run Tests
  run: npm test -- --coverage
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Best Practices

1. **Write Tests First** - Always TDD
2. **One Assert Per Test** - Focus on single behavior
3. **Descriptive Test Names** - Explain what's tested
4. **Arrange-Act-Assert** - Clear test structure
5. **Mock External Dependencies** - Isolate unit tests
6. **Test Edge Cases** - Null, undefined, empty, large
7. **Test Error Paths** - Not just happy paths
8. **Keep Tests Fast** - Unit tests < 50ms each
9. **Clean Up After Tests** - No side effects
10. **Review Coverage Reports** - Identify gaps

## Success Metrics

- 70%+ code coverage achieved
- All tests passing (green)
- No skipped or disabled tests
- Fast test execution (< 30s for unit tests)
- E2E tests cover critical user flows
- Tests catch bugs before production

---

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring, rapid development, and production reliability.

## Purpose

Principal-level TDD: Red-Green-Refactor cycle, test-first as a
design tool (not just a verification step), the test pyramid
(unit > integration > E2E), coverage targets (≥90% touched, ≥80%
project per `extreme-lint-policy.md`), property-based testing for
invariants, mutation testing for test-suite quality, contract tests
between services (per `contract-testing.md`), test isolation via
DI (per `no-ambient-globals.md`), deterministic test execution
(random order, virtual time, seeded RNG), and the
faster-feedback-loop disciplines that keep TDD enjoyable instead
of bureaucratic.

**Negative scope** (NOT what this skill covers):

- Language-specific testing patterns — see `golang-testing`,
  `python-testing`, `springboot-testing`, `django-testing`,
  `swift-protocol-di-testing`, `cpp-testing`
- E2E + browser automation — see `e2e-runner` agent
- Performance testing — different discipline
- Load testing — out

## When NOT to use

- Throwaway scripts (one-off ETL, prototype branch deleted within
  a week)
- Documentation-only changes
- Pure infrastructure changes where the test surface is the deploy
  pipeline itself
- Exploratory spike work (NOTE: any spike that crosses the line
  to "we're shipping this" gets the TDD discipline applied
  before merge)

## Standards Cited

- **Kent Beck — "Test-Driven Development: By Example" (2002)** —
  canonical reference
- **Martin Fowler — "Refactoring" 2e (2018)** — refactor-with-tests
  discipline
- **Michael Feathers — "Working Effectively with Legacy Code"
  (2004)** — adding tests to untested code
- **Test Pyramid (Mike Cohn, "Succeeding with Agile" 2009)** —
  unit > integration > E2E layering
- **ISO/IEC/IEEE 29119** — Software testing standard (parts 1-5
  cover concepts, processes, documentation, techniques)
- **ISO/IEC 25010:2011 §6** — Product quality model: functional
  suitability + reliability requires automated tests
- **NIST SP 800-218 SSDF §PW.7** — Review and/or analyse human-
  readable code (TDD is one mechanism)
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing + evaluation
- **OWASP ASVS 4.0.3 §1.1 (Secure Software Development Lifecycle)** —
  tests are part of SSDLC
- **OWASP ASVS 4.0.3 §V14.2** — Dependency testing (CDC + contract
  tests fall under tdd-workflow)
- **CWE-1059** — Insufficient Technical Documentation (test cases
  ARE the executable spec; TDD prevents the CWE)
- **PEP 8** + **JEP 158** — Style + JUnit/JVM-side TDD ergonomics
- **W3C Web Platform Tests (wpt.fyi)** — Reference TDD harness for
  browser-side contracts
- **`~/.claude/rules-library/common/testing.md`** — global testing rule
- **`~/.claude/rules-library/common/extreme-lint-policy.md`** — coverage
  threshold (≥90% touched / ≥80% project)
- **`~/.claude/rules-library/common/contract-testing.md`** — consumer-driven
  contract tests
- **`~/.claude/rules-library/common/no-ambient-globals.md`** — DI for
  test isolation
- **`~/.claude/rules-library/common/local-testability.md`** — testable-before-
  write mandate

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Writing tests after production code | Tests fit the code instead of driving design | RED-GREEN-REFACTOR; test first |
| Skipping the RED verification | Test may already pass — false-positive guard | Run the test BEFORE the implementation; confirm it fails for the right reason |
| Tests with `Thread.sleep` / `time.sleep` | Flaky under load | Awaitility / virtual time / event-based wait |
| Test that exercises the network / real DB | Slow + flaky | Stub at the boundary; integration tier uses Testcontainers / equivalent |
| `Math.random()` / `time.Now()` directly in tested code | Non-deterministic; can't reproduce | Inject `Random` / `Clock` (per `no-ambient-globals.md`) |
| One huge test that asserts everything | Hard to localise failure; rebuilds entire context | One assertion per behaviour; descriptive test names |
| Test name describes the method, not the behaviour | "test_login" tells you nothing on failure | "rejects_login_when_password_expired" describes the contract |
| Coverage gaming (touch every line with empty assertions) | Coverage % rises; bugs ship | Mutation testing catches it; coverage is a floor, not a goal |
| Tests dependent on each other's order | One change breaks 20 tests | Each test sets up + tears down its own state; randomise order |
| No contract tests between services | Producer changes break consumers in production | Pact-style consumer-driven contracts per `contract-testing.md` |
| Skipped tests with `@Disabled` / `xit` / `t.Skip` | Coverage drift; forgotten | Quarantine with deadline; fix or delete |
| Mock-heavy unit tests | Tests verify implementation, not behaviour | Stub external boundaries only; use real instances for everything else |

## Verification Checklist

- [ ] Test written + verified RED before implementation
- [ ] Test fails for the right reason (assertion fails, not import
      error)
- [ ] Implementation makes the test GREEN with minimal code
- [ ] Refactor pass keeps tests green
- [ ] Test name describes the behaviour, not the method
- [ ] Test isolation: random-order run passes
- [ ] No `sleep` / wall-clock dependencies (use virtual time)
- [ ] Coverage ≥ 90% on touched files (per `extreme-lint-policy.md`)
- [ ] Coverage ≥ 80% on the project as a whole
- [ ] Mutation score ≥ 80% on business-logic packages (where the
      ecosystem has a mutation tool — PIT for Java, Stryker for
      JS/TS, mutmut for Python)
- [ ] Test pyramid respected (unit > integration > E2E)
- [ ] Contract tests gate the producer's deploy (per
      `contract-testing.md`)
- [ ] No `@Disabled` / `xit` / `t.Skip` without a tracked deadline
- [ ] Test runs locally in < 30s (unit tier)

## Cross-References

- `~/.claude/skills/golang-testing/SKILL.md` — Go-specific
- `~/.claude/skills/python-testing/SKILL.md` — Python-specific
- `~/.claude/skills/springboot-testing/SKILL.md` — Spring Boot
- `~/.claude/skills/django-testing/SKILL.md` — Django
- `~/.claude/skills/swift-protocol-di-testing/SKILL.md` — Swift
- `~/.claude/skills/cpp-testing/SKILL.md` — C++
- `~/.claude/rules-library/common/testing.md` — global testing rule
- `~/.claude/rules-library/common/contract-testing.md` — CDC + schema
- `~/.claude/rules-library/common/local-testability.md` — testable-before-write
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI patterns
- `~/.claude/agents/tdd-guide.md` — Council Division 5

## Why this skill exists

TDD is not about coverage percentages — it's about design
feedback. Writing the test first forces the code to be testable,
which forces explicit dependencies, which forces interfaces, which
forces single-responsibility. Teams that adopt TDD properly ship
fewer bugs AND refactor more aggressively because the safety net
catches regressions. Teams that skip it (or do test-after) ship
the same bugs and stop refactoring because nothing catches the
regressions. The patterns above codify the principal-level
posture: RED-VERIFY before GREEN, test isolation, deterministic
time + RNG, descriptive names, mutation testing for test quality,
contract tests for service boundaries.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Production code written before its failing test (RED-VERIFY skipped — workflow violation)
- Test written that passes without the implementation (false-positive RED — flaky guard)
- "70%" coverage target cited (stale — canonical is 90% touched / 80% project per `extreme-lint-policy.md`)
- REFACTOR step skipped — code stays unmaintainable after GREEN
- Skipped / disabled test introduced without ticket reference + fix deadline
- Test asserts on `message` not `error_code` (sister `error-handling-with-context.md` rule 10 violation)
- Slow test (> 5s) added without justification + isolation
- Mock used where Testcontainers / real DB would catch the bug class

**Refinement candidates**:

- Tightening of the success-metrics coverage figures when the canonical floor moves
- New test-pyramid row when a recurring test class emerges (e.g., contract-pact, mutation testing, AI eval harness)
- New cross-reference when a sister rule (testing, verify-before-claim, local-testability) adds a verification surface
- New per-framework RED-GREEN-REFACTOR template when a new test runner gains adoption (Vitest 2+, JUnit 6, pytest 9)
