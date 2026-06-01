---
name: coding-standards
description: Universal coding standards, best practices, and patterns for TypeScript, JavaScript, React, React Native, Vue, Swift, Flutter/Dart, C++, C#, and Node.js development.
---

# Coding Standards & Best Practices

Universal coding standards applicable across all projects.

## When to Activate

- Starting a new project or module
- Reviewing code for quality and maintainability
- Refactoring existing code to follow conventions
- Enforcing naming, formatting, or structural consistency
- Setting up linting, formatting, or type-checking rules
- Onboarding new contributors to coding conventions

## Code Quality Principles

### 1. Readability First
- Code is read more than written
- Clear variable and function names
- Self-documenting code preferred over comments
- Consistent formatting

### 2. KISS (Keep It Simple, Stupid)
- Simplest solution that works
- Avoid over-engineering
- No premature optimization
- Easy to understand > clever code

### 3. DRY (Don't Repeat Yourself) — see also `~/.claude/rules/common/reuse-first.md`
- Extract common logic into functions
- Create reusable components
- Share utilities across modules
- Avoid copy-paste programming
- Apply the rule of three: implement inline on first occurrence;
  extract a shared primitive on the SECOND occurrence (the
  abstraction has paid for itself); never reach a third copy
- Extend the shared primitive with a prop / parameter — never
  fork it into a "slightly different" variant
- Defaults live at the primitive, not the call site
- One source of truth per conceptual unit (one Description
  editor, one currency formatter, one auth middleware, etc.)

### 4. YAGNI (You Aren't Gonna Need It)
- Don't build features before they're needed
- Avoid speculative generality
- Add complexity only when required
- Start simple, refactor when needed

## TypeScript/JavaScript Standards

### Variable Naming

```typescript
// ✅ GOOD: Descriptive names
const marketSearchQuery = 'election'
const isUserAuthenticated = true
const totalRevenue = 1000

// ❌ BAD: Unclear names
const q = 'election'
const flag = true
const x = 1000
```

### Function Naming

```typescript
// ✅ GOOD: Verb-noun pattern
async function fetchMarketData(marketId: string) { }
function calculateSimilarity(a: number[], b: number[]) { }
function isValidEmail(email: string): boolean { }

// ❌ BAD: Unclear or noun-only
async function market(id: string) { }
function similarity(a, b) { }
function email(e) { }
```

### Immutability Pattern (CRITICAL)

```typescript
// ✅ ALWAYS use spread operator
const updatedUser = {
  ...user,
  name: 'New Name'
}

const updatedArray = [...items, newItem]

// ❌ NEVER mutate directly
user.name = 'New Name'  // BAD
items.push(newItem)     // BAD
```

### Error Handling

```typescript
// ✅ GOOD: Comprehensive error handling
async function fetchData(url: string) {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch failed:', error)
    throw new Error('Failed to fetch data')
  }
}

// ❌ BAD: No error handling
async function fetchData(url) {
  const response = await fetch(url)
  return response.json()
}
```

### Async/Await Best Practices

```typescript
// ✅ GOOD: Parallel execution when possible
const [users, markets, stats] = await Promise.all([
  fetchUsers(),
  fetchMarkets(),
  fetchStats()
])

// ❌ BAD: Sequential when unnecessary
const users = await fetchUsers()
const markets = await fetchMarkets()
const stats = await fetchStats()
```

### Type Safety

```typescript
// ✅ GOOD: Proper types
interface Market {
  id: string
  name: string
  status: 'active' | 'resolved' | 'closed'
  created_at: Date
}

function getMarket(id: string): Promise<Market> {
  // Implementation
}

// ❌ BAD: Using 'any'
function getMarket(id: any): Promise<any> {
  // Implementation
}
```

## React Best Practices

### Component Structure

```typescript
// ✅ GOOD: Functional component with types
interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary'
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  )
}

// ❌ BAD: No types, unclear structure
export function Button(props) {
  return <button onClick={props.onClick}>{props.children}</button>
}
```

### Custom Hooks

```typescript
// ✅ GOOD: Reusable custom hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// Usage
const debouncedQuery = useDebounce(searchQuery, 500)
```

### State Management

```typescript
// ✅ GOOD: Proper state updates
const [count, setCount] = useState(0)

// Functional update for state based on previous state
setCount(prev => prev + 1)

// ❌ BAD: Direct state reference
setCount(count + 1)  // Can be stale in async scenarios
```

### Conditional Rendering

```typescript
// ✅ GOOD: Clear conditional rendering
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data && <DataDisplay data={data} />}

// ❌ BAD: Ternary hell
{isLoading ? <Spinner /> : error ? <ErrorMessage error={error} /> : data ? <DataDisplay data={data} /> : null}
```

## API Design Standards

### REST API Conventions

```
GET    /api/markets              # List all markets
GET    /api/markets/:id          # Get specific market
POST   /api/markets              # Create new market
PUT    /api/markets/:id          # Update market (full)
PATCH  /api/markets/:id          # Update market (partial)
DELETE /api/markets/:id          # Delete market

# Query parameters for filtering
GET /api/markets?status=active&limit=10&offset=0
```

### Response Format

```typescript
// ✅ GOOD: Consistent response structure
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}

// Success response
return NextResponse.json({
  success: true,
  data: markets,
  meta: { total: 100, page: 1, limit: 10 }
})

// Error response
return NextResponse.json({
  success: false,
  error: 'Invalid request'
}, { status: 400 })
```

### Input Validation

```typescript
import { z } from 'zod'

// ✅ GOOD: Schema validation
const CreateMarketSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  endDate: z.string().datetime(),
  categories: z.array(z.string()).min(1)
})

export async function POST(request: Request) {
  const body = await request.json()

  try {
    const validated = CreateMarketSchema.parse(body)
    // Proceed with validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
  }
}
```

## File Organization

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── markets/           # Market pages
│   └── (auth)/           # Auth pages (route groups)
├── components/            # React components
│   ├── ui/               # Generic UI components
│   ├── forms/            # Form components
│   └── layouts/          # Layout components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configs
│   ├── api/             # API clients
│   ├── utils/           # Helper functions
│   └── constants/       # Constants
├── types/                # TypeScript types
└── styles/              # Global styles
```

### File Naming

```
components/Button.tsx          # PascalCase for components
hooks/useAuth.ts              # camelCase with 'use' prefix
lib/formatDate.ts             # camelCase for utilities
types/market.types.ts         # camelCase with .types suffix
```

## Comments & Documentation

### When to Comment

```typescript
// ✅ GOOD: Explain WHY, not WHAT
// Use exponential backoff to avoid overwhelming the API during outages
const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)

// Deliberately using mutation here for performance with large arrays
items.push(newItem)

// ❌ BAD: Stating the obvious
// Increment counter by 1
count++

// Set name to user's name
name = user.name
```

### JSDoc for Public APIs

```typescript
/**
 * Searches markets using semantic similarity.
 *
 * @param query - Natural language search query
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of markets sorted by similarity score
 * @throws {Error} If OpenAI API fails or Redis unavailable
 *
 * @example
 * ```typescript
 * const results = await searchMarkets('election', 5)
 * console.log(results[0].name) // "Trump vs Biden"
 * ```
 */
export async function searchMarkets(
  query: string,
  limit: number = 10
): Promise<Market[]> {
  // Implementation
}
```

## Performance Best Practices

### Memoization

```typescript
import { useMemo, useCallback } from 'react'

// ✅ GOOD: Memoize expensive computations
const sortedMarkets = useMemo(() => {
  return markets.sort((a, b) => b.volume - a.volume)
}, [markets])

// ✅ GOOD: Memoize callbacks
const handleSearch = useCallback((query: string) => {
  setSearchQuery(query)
}, [])
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react'

// ✅ GOOD: Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'))

export function Dashboard() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyChart />
    </Suspense>
  )
}
```

### Database Queries

```typescript
// ✅ GOOD: Select only needed columns
const { data } = await supabase
  .from('markets')
  .select('id, name, status')
  .limit(10)

// ❌ BAD: Select everything
const { data } = await supabase
  .from('markets')
  .select('*')
```

## Testing Standards

### Test Structure (AAA Pattern)

```typescript
test('calculates similarity correctly', () => {
  // Arrange
  const vector1 = [1, 0, 0]
  const vector2 = [0, 1, 0]

  // Act
  const similarity = calculateCosineSimilarity(vector1, vector2)

  // Assert
  expect(similarity).toBe(0)
})
```

### Test Naming

```typescript
// ✅ GOOD: Descriptive test names
test('returns empty array when no markets match query', () => { })
test('throws error when OpenAI API key is missing', () => { })
test('falls back to substring search when Redis unavailable', () => { })

// ❌ BAD: Vague test names
test('works', () => { })
test('test search', () => { })
```

## Code Smell Detection

Watch for these anti-patterns:

### 1. Long Functions
```typescript
// ❌ BAD: Function > 50 lines
function processMarketData() {
  // 100 lines of code
}

// ✅ GOOD: Split into smaller functions
function processMarketData() {
  const validated = validateData()
  const transformed = transformData(validated)
  return saveData(transformed)
}
```

### 2. Deep Nesting
```typescript
// ❌ BAD: 5+ levels of nesting
if (user) {
  if (user.isAdmin) {
    if (market) {
      if (market.isActive) {
        if (hasPermission) {
          // Do something
        }
      }
    }
  }
}

// ✅ GOOD: Early returns
if (!user) return
if (!user.isAdmin) return
if (!market) return
if (!market.isActive) return
if (!hasPermission) return

// Do something
```

### 3. Magic Numbers
```typescript
// ❌ BAD: Unexplained numbers
if (retryCount > 3) { }
setTimeout(callback, 500)

// ✅ GOOD: Named constants
const MAX_RETRIES = 3
const DEBOUNCE_DELAY_MS = 500

if (retryCount > MAX_RETRIES) { }
setTimeout(callback, DEBOUNCE_DELAY_MS)
```

**Remember**: Code quality is not negotiable. Clear, maintainable code enables rapid development and confident refactoring.

## Purpose

Language-agnostic coding standards: naming conventions, immutability, error handling, type safety, file organisation, comment policy, performance heuristics, test structure, and code-smell detection. Applies across TypeScript, JavaScript, React, React Native, Vue, Swift, Flutter / Dart, C++, C#, Node.js.

**Negative scope**: NOT language-specific deep idioms (use `typescript-patterns`, `python-patterns`, `golang-patterns` etc.). NOT framework-specific patterns (use `springboot-patterns`, `django-patterns`, `vue3-patterns`). NOT static-analysis tooling configuration (use `extreme-lint-policy.md`).

## When NOT to use

- Domain-specific guidance — defer to per-language pattern skills
- Lint configuration — `~/.claude/rules/common/extreme-lint-policy.md` is the canonical home
- Project-specific overrides — those live in `<project>/.claude/rules/`
- Mature codebases with established conventions that already meet or exceed this floor

## Standards Cited

- **Robert C. Martin, *Clean Code* (2008)** — function length, naming, single-responsibility heuristics
- **Steve McConnell, *Code Complete 2e* (2004)** — file organisation + complexity caps
- **Effective Java 3e (Bloch, 2017)** — immutability + constructor patterns (cross-language applicable)
- **Effective TypeScript (Vanderkam, 2024)** — type safety idioms
- **PEP 8 / PEP 257** — Python style + docstrings
- **Effective Go (golang.org/doc/effective_go)** — error handling, naming, simplicity
- **OWASP ASVS 4.0.3 §5** — Validation, Sanitisation, Encoding
- **MISRA C++ 2023** (when applicable) — safety-critical C++ rules
- **Conventional Comments 1.0** — code review tone

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `any` / `dynamic` type for "I don't know yet" | Defeats type safety; pushes errors to runtime; spreads through callers | Narrow with discriminated unions; `unknown` + type guard if truly opaque |
| Direct mutation of incoming objects | Spooky action at a distance; React stale-closure bugs | Spread + return new object; pure functions |
| Boolean parameters as primary signal (`doThing(true)`) | Unclear at call site; explodes combinatorially | Options object: `doThing({ async: true })` |
| Magic numbers inline (`if (count > 3)`, `setTimeout(cb, 500)`) | Reader can't tell intent; refactor risk | Named const: `MAX_RETRIES = 3`; `DEBOUNCE_MS = 500` |
| Functions > 80 lines with deep nesting | Cognitive complexity > 10; untestable in isolation | Extract helpers; flip negation + early return |
| Single-letter vars outside `i, j, k, _` | Self-documenting code lost; review friction | Descriptive name: `userIndex`, `lineNumber` |
| Stale-state reference in async (`setCount(count + 1)`) | Returns wrong value under fast re-render | Functional setter: `setCount(prev => prev + 1)` |
| Comments stating WHAT the code does | Drift risk; reader can already read code | Comments explain WHY only; non-obvious invariants |

## Verification Checklist

- [ ] Functions ≤ 80 lines, ≤ 5 parameters, cognitive complexity ≤ 10 (per `extreme-lint-policy.md`)
- [ ] No `any` / `dynamic` types; `unknown` + narrowing where genuinely opaque
- [ ] Immutability: spread / `Object.freeze` / `readonly` on data structures
- [ ] Errors handled at every async boundary (no silent rejections)
- [ ] Magic numbers extracted to named constants (allowlist: `0, 1, -1, 2`)
- [ ] Naming: camelCase variables/functions, PascalCase types/classes, SCREAMING_SNAKE_CASE constants
- [ ] No `console.log` in production source — structured logger only
- [ ] Tests follow AAA (Arrange/Act/Assert) with descriptive names

## Cross-References

- `~/.claude/rules/common/coding-style.md` — file organisation + comment policy (deeper)
- `~/.claude/rules/common/reuse-first.md` — rule of three; extend never fork
- `~/.claude/rules/common/extreme-lint-policy.md` — strict-mode lint config + thresholds
- `~/.claude/rules/common/no-discards.md` — banned discard / suppression patterns
- `~/.claude/rules/common/no-silent-failures.md` — error handling shape
- `~/.claude/skills/typescript-patterns/SKILL.md` — TS-specific idioms
- `~/.claude/skills/python-patterns/SKILL.md` — Python-specific
- `~/.claude/skills/golang-patterns/SKILL.md` — Go-specific
- `~/.claude/agents/code-reviewer.md` — cross-language review with severity findings

## Why this skill exists

Coding standards are the floor below which review noise drowns out signal. Without a shared floor:

- Every PR review re-litigates naming, immutability, and error handling instead of business logic
- Test files diverge from production style; their bugs are harder to spot
- New contributors mimic the worst-style file they happen to read first; debt compounds
- Lint config is project-by-project; cross-team rotation is painful
- Code-smell detection becomes subjective ("I don't like this")

The cost of enforcing a clear floor: one shared doc + lint config. The cost of NOT enforcing it: every PR is a style debate AND a domain review at the same time, both done badly.

## Compliance & Standards Mapping

- **ISO/IEC 25010:2011 §6** — Product quality model (Functional
  Suitability, Reliability, Performance Efficiency, Usability,
  Security, Maintainability, Portability, Compatibility)
- **ISO/IEC/IEEE 12207:2017 §6.4** — Software construction +
  verification + validation processes
- **NIST SP 800-218 SSDF §PW** — Produce Well-Secured Software
  (applies to every code-authoring skill)
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing +
  evaluation
- **OWASP ASVS 4.0.3 §V1.1** — Secure SDLC requirements
- **OWASP ASVS 4.0.3 §V14.2** — Dependency lifecycle
- **CWE Top 25 (2026)** — Weakness classes the patterns in this
  skill prevent
- **SLSA Framework v1.0 Build L2+** — Provenance + integrity

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Magic-number literals introduced past the sister `extreme-lint-policy.md` allowed set (`0, 1, -1, 2`)
- Function > 80 lines or > 5 parameters introduced (sister `extreme-lint-policy.md` threshold violations)
- Cognitive complexity > 10 on a function (S3776 recurrence)
- Naming convention mismatch (camelCase / PascalCase / SCREAMING_SNAKE_CASE) in new code
- Comment introduced explaining WHAT instead of WHY (per coding-style sister rule)
- Boolean / nullable param treated as a primary signal instead of an explicit options object
- New code shipped without immutability discipline on data flow (per coding-style sister rule)

**Refinement candidates**:
- New language-specific naming row when a new ecosystem (e.g., Solidity, Zig, Gleam) is adopted
- Tightening of the magic-number allowlist when a recurring sentinel proves load-bearing
- New cross-reference when a sister rule (no-discards, no-silent-failures, extreme-lint-policy) provides the canonical pattern
