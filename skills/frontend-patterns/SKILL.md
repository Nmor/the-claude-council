---
name: frontend-patterns
description: Frontend development patterns for React, React Native, Vue, Next.js, SwiftUI, Flutter, state management, performance optimization, and UI best practices.
---

# Frontend Development Patterns

Modern frontend patterns for React, React Native, Vue, Next.js, SwiftUI, Flutter, and performant user interfaces.

> **Reuse-first** (per `~/.claude/rules/common/reuse-first.md`):
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
  tokens (per `~/.claude/rules/common/no-discards.md` — raw hex /
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
  + effects justified
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

- `~/.claude/rules/common/a11y.md` — WCAG 2.2 floor + critical-path AAA
- `~/.claude/rules/common/i18n.md` — Intl APIs, RTL, ICU MessageFormat
- `~/.claude/rules/common/no-discards.md` — banned discard patterns (`as any` casts, empty catches)
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
