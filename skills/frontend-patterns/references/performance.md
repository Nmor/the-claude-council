# frontend-patterns: Performance Optimization

> Covers memoization, code splitting + lazy loading, and virtualization for long lists. Routed from
> the SKILL.md Reference map row **Performance optimisation**.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
