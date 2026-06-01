---
name: backend-patterns
description: Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.
---

# Backend Development Patterns

Backend architecture patterns and best practices for scalable server-side applications.

> **Reuse-first** (per `~/.claude/rules/common/reuse-first.md`):
> Before creating a new service / repository / middleware /
> handler helper / validator / DTO, sweep the project's `lib/`,
> `services/`, `repositories/`, `middleware/`, `validators/`,
> `dto/` (or language-equivalent) directories. One source of
> truth per concept (one auth middleware, one error envelope, one
> pagination helper, one rate limiter, one DB client factory).
> Extend with a parameter — never fork.

## When to Activate

- Designing REST or GraphQL API endpoints
- Implementing repository, service, or controller layers
- Optimizing database queries (N+1, indexing, connection pooling)
- Adding caching (Redis, in-memory, HTTP cache headers)
- Setting up background jobs or async processing
- Structuring error handling and validation for APIs
- Building middleware (auth, logging, rate limiting)

## API Design Patterns

### RESTful API Structure

```typescript
// ✅ Resource-based URLs
GET    /api/markets                 # List resources
GET    /api/markets/:id             # Get single resource
POST   /api/markets                 # Create resource
PUT    /api/markets/:id             # Replace resource
PATCH  /api/markets/:id             # Update resource
DELETE /api/markets/:id             # Delete resource

// ✅ Query parameters for filtering, sorting, pagination
GET /api/markets?status=active&sort=volume&limit=20&offset=0
```

### Repository Pattern

```typescript
// Abstract data access logic
interface MarketRepository {
  findAll(filters?: MarketFilters): Promise<Market[]>
  findById(id: string): Promise<Market | null>
  create(data: CreateMarketDto): Promise<Market>
  update(id: string, data: UpdateMarketDto): Promise<Market>
  delete(id: string): Promise<void>
}

class SupabaseMarketRepository implements MarketRepository {
  async findAll(filters?: MarketFilters): Promise<Market[]> {
    let query = supabase.from('markets').select('*')

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data
  }

  // Other methods...
}
```

### Service Layer Pattern

```typescript
// Business logic separated from data access
class MarketService {
  constructor(private marketRepo: MarketRepository) {}

  async searchMarkets(query: string, limit: number = 10): Promise<Market[]> {
    // Business logic
    const embedding = await generateEmbedding(query)
    const results = await this.vectorSearch(embedding, limit)

    // Fetch full data
    const markets = await this.marketRepo.findByIds(results.map(r => r.id))

    // Sort by similarity
    return markets.sort((a, b) => {
      const scoreA = results.find(r => r.id === a.id)?.score || 0
      const scoreB = results.find(r => r.id === b.id)?.score || 0
      return scoreA - scoreB
    })
  }

  private async vectorSearch(embedding: number[], limit: number) {
    // Vector search implementation
  }
}
```

### Middleware Pattern

```typescript
// Request/response processing pipeline
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const user = await verifyToken(token)
      req.user = user
      return handler(req, res)
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}

// Usage
export default withAuth(async (req, res) => {
  // Handler has access to req.user
})
```

## Database Patterns

### Query Optimization

```typescript
// ✅ GOOD: Select only needed columns
const { data } = await supabase
  .from('markets')
  .select('id, name, status, volume')
  .eq('status', 'active')
  .order('volume', { ascending: false })
  .limit(10)

// ❌ BAD: Select everything
const { data } = await supabase
  .from('markets')
  .select('*')
```

### N+1 Query Prevention

```typescript
// ❌ BAD: N+1 query problem
const markets = await getMarkets()
for (const market of markets) {
  market.creator = await getUser(market.creator_id)  // N queries
}

// ✅ GOOD: Batch fetch
const markets = await getMarkets()
const creatorIds = markets.map(m => m.creator_id)
const creators = await getUsers(creatorIds)  // 1 query
const creatorMap = new Map(creators.map(c => [c.id, c]))

markets.forEach(market => {
  market.creator = creatorMap.get(market.creator_id)
})
```

### Transaction Pattern

```typescript
async function createMarketWithPosition(
  marketData: CreateMarketDto,
  positionData: CreatePositionDto
) {
  // Use Supabase transaction
  const { data, error } = await supabase.rpc('create_market_with_position', {
    market_data: marketData,
    position_data: positionData
  })

  if (error) throw new Error('Transaction failed')
  return data
}

// SQL function in Supabase
CREATE OR REPLACE FUNCTION create_market_with_position(
  market_data jsonb,
  position_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  -- Start transaction automatically
  INSERT INTO markets VALUES (market_data);
  INSERT INTO positions VALUES (position_data);
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

## Caching Strategies

### Redis Caching Layer

```typescript
class CachedMarketRepository implements MarketRepository {
  constructor(
    private baseRepo: MarketRepository,
    private redis: RedisClient
  ) {}

  async findById(id: string): Promise<Market | null> {
    // Check cache first
    const cached = await this.redis.get(`market:${id}`)

    if (cached) {
      return JSON.parse(cached)
    }

    // Cache miss - fetch from database
    const market = await this.baseRepo.findById(id)

    if (market) {
      // Cache for 5 minutes
      await this.redis.setex(`market:${id}`, 300, JSON.stringify(market))
    }

    return market
  }

  async invalidateCache(id: string): Promise<void> {
    await this.redis.del(`market:${id}`)
  }
}
```

### Cache-Aside Pattern

```typescript
async function getMarketWithCache(id: string): Promise<Market> {
  const cacheKey = `market:${id}`

  // Try cache
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Cache miss - fetch from DB
  const market = await db.markets.findUnique({ where: { id } })

  if (!market) throw new Error('Market not found')

  // Update cache
  await redis.setex(cacheKey, 300, JSON.stringify(market))

  return market
}
```

## Error Handling Patterns

### Centralized Error Handler

```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export function errorHandler(error: unknown, req: Request): Response {
  if (error instanceof ApiError) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: error.statusCode })
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: error.errors
    }, { status: 400 })
  }

  // Log unexpected errors
  console.error('Unexpected error:', error)

  return NextResponse.json({
    success: false,
    error: 'Internal server error'
  }, { status: 500 })
}

// Usage
export async function GET(request: Request) {
  try {
    const data = await fetchData()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return errorHandler(error, request)
  }
}
```

### Retry with Exponential Backoff

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (i < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, i) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

// Usage
const data = await fetchWithRetry(() => fetchFromAPI())
```

## Authentication & Authorization

### JWT Token Validation

```typescript
import jwt from 'jsonwebtoken'

interface JWTPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
}

export function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
    return payload
  } catch (error) {
    throw new ApiError(401, 'Invalid token')
  }
}

export async function requireAuth(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    throw new ApiError(401, 'Missing authorization token')
  }

  return verifyToken(token)
}

// Usage in API route
export async function GET(request: Request) {
  const user = await requireAuth(request)

  const data = await getDataForUser(user.userId)

  return NextResponse.json({ success: true, data })
}
```

### Role-Based Access Control

```typescript
type Permission = 'read' | 'write' | 'delete' | 'admin'

interface User {
  id: string
  role: 'admin' | 'moderator' | 'user'
}

const rolePermissions: Record<User['role'], Permission[]> = {
  admin: ['read', 'write', 'delete', 'admin'],
  moderator: ['read', 'write', 'delete'],
  user: ['read', 'write']
}

export function hasPermission(user: User, permission: Permission): boolean {
  return rolePermissions[user.role].includes(permission)
}

export function requirePermission(permission: Permission) {
  return (handler: (request: Request, user: User) => Promise<Response>) => {
    return async (request: Request) => {
      const user = await requireAuth(request)

      if (!hasPermission(user, permission)) {
        throw new ApiError(403, 'Insufficient permissions')
      }

      return handler(request, user)
    }
  }
}

// Usage - HOF wraps the handler
export const DELETE = requirePermission('delete')(
  async (request: Request, user: User) => {
    // Handler receives authenticated user with verified permission
    return new Response('Deleted', { status: 200 })
  }
)
```

## Rate Limiting

### Simple In-Memory Rate Limiter

```typescript
class RateLimiter {
  private requests = new Map<string, number[]>()

  async checkLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []

    // Remove old requests outside window
    const recentRequests = requests.filter(time => now - time < windowMs)

    if (recentRequests.length >= maxRequests) {
      return false  // Rate limit exceeded
    }

    // Add current request
    recentRequests.push(now)
    this.requests.set(identifier, recentRequests)

    return true
  }
}

const limiter = new RateLimiter()

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  const allowed = await limiter.checkLimit(ip, 100, 60000)  // 100 req/min

  if (!allowed) {
    return NextResponse.json({
      error: 'Rate limit exceeded'
    }, { status: 429 })
  }

  // Continue with request
}
```

## Background Jobs & Queues

### Simple Queue Pattern

```typescript
class JobQueue<T> {
  private queue: T[] = []
  private processing = false

  async add(job: T): Promise<void> {
    this.queue.push(job)

    if (!this.processing) {
      this.process()
    }
  }

  private async process(): Promise<void> {
    this.processing = true

    while (this.queue.length > 0) {
      const job = this.queue.shift()!

      try {
        await this.execute(job)
      } catch (error) {
        console.error('Job failed:', error)
      }
    }

    this.processing = false
  }

  private async execute(job: T): Promise<void> {
    // Job execution logic
  }
}

// Usage for indexing markets
interface IndexJob {
  marketId: string
}

const indexQueue = new JobQueue<IndexJob>()

export async function POST(request: Request) {
  const { marketId } = await request.json()

  // Add to queue instead of blocking
  await indexQueue.add({ marketId })

  return NextResponse.json({ success: true, message: 'Job queued' })
}
```

## Logging & Monitoring

### Structured Logging

```typescript
interface LogContext {
  userId?: string
  requestId?: string
  method?: string
  path?: string
  [key: string]: unknown
}

class Logger {
  log(level: 'info' | 'warn' | 'error', message: string, context?: LogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    }

    console.log(JSON.stringify(entry))
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, error: Error, context?: LogContext) {
    this.log('error', message, {
      ...context,
      error: error.message,
      stack: error.stack
    })
  }
}

const logger = new Logger()

// Usage
export async function GET(request: Request) {
  const requestId = crypto.randomUUID()

  logger.info('Fetching markets', {
    requestId,
    method: 'GET',
    path: '/api/markets'
  })

  try {
    const markets = await fetchMarkets()
    return NextResponse.json({ success: true, data: markets })
  } catch (error) {
    logger.error('Failed to fetch markets', error as Error, { requestId })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

## Fire-and-forget side effects

The canonical shape for "kick off this side effect but don't
block the user" — audit-log writes, analytics emits, optimistic
cache warms, peer-tab broadcasts, in-memory cache invalidations.

The bugs this prevents: `.catch(() => null)`, `.catch(() => undefined)`,
`.catch(() => {})`, `void store.save()` — all silent failures. A
fire-and-forget that loses its error is a bug that surfaces
hours later in production when an operator looks at the count
and can't find it.

### Canonical helper

```ts
// backend/src/lib/fireAndForget.ts
import { logError, stringifyError } from "./logger.js";

export function fireAndForget(name: string, p: Promise<unknown>): void {
  p.catch((err: unknown) => {
    logError(`fireAndForget(${name}) failed`, {
      operation: name,
      error: stringifyError(err),
    });
  });
}
```

```ts
// frontend/src/lib/fireAndForget.ts
import { log, stringifyError } from "./logger";

export function fireAndForget(name: string, p: Promise<unknown>): void {
  p.catch((err: unknown) => {
    log.warn(`fireAndForget(${name}) failed`, {
      operation: name,
      error: stringifyError(err),
    });
  });
}
```

### Usage

```ts
// WRONG — silent
void store.refreshAfterDelete();

// WRONG — silent fallback
store.refreshAfterDelete().catch(() => null);

// WRONG — partial: error captured but message is "[object Object]"
store.refreshAfterDelete().catch((err) => {
  log.warn("refresh failed", { error: String(err) });
});

// RIGHT — named, properly stringified, observable
fireAndForget("refreshAfterDelete", store.refreshAfterDelete());
```

### When fire-and-forget is the WRONG shape

If the side effect's outcome is user-visible, fire-and-forget is
the wrong shape — surface the result via toast / banner / typed
return instead.

- "Did the save succeed?" → user must know → await + toast.
- "Did the audit row get written?" → operational, surface via
  metric / log → fire-and-forget.
- "Did the cache warm?" → never user-visible → fire-and-forget.
- "Did the Slack DM go out?" → may matter operationally → outbox
  pattern (at-least-once delivery), not fire-and-forget.

### Spot the bug

- `void promise()` outside an explicit fire-and-forget wrapper.
- `.catch(() => null)` / `.catch(() => undefined)` / `.catch(() => false)` / `.catch(() => {})`.
- Inline `err instanceof Error ? err.message : String(err)` —
  produces `[object Object]` on plain-object errors; use
  `stringifyError` from the project logger.
- A try/catch that catches Error and logs without including the
  operation name + context.
- `setTimeout(() => x().catch(noop), 0)` — same shape, different
  syntax, same bug.

## Content-hash file caching

Cache expensive file processing results (PDF parsing, text
extraction, image analysis) using SHA-256 content hashes as
cache keys. Unlike path-based caching, this approach survives
file moves / renames and auto-invalidates when content changes.

Use when: file processing pipelines, CLI tools that benefit from
`--cache / --no-cache`, batch processing where the same files
recur, adding caching to existing pure functions without
modifying them.

Avoid when: data must always be fresh (real-time feeds); cache
entries would be extremely large (stream instead); results
depend on parameters beyond file content (e.g., different
extraction configs).

### Content-hash cache key

```python
import hashlib
from pathlib import Path

_HASH_CHUNK_SIZE = 65536  # 64KB chunks for large files

def compute_file_hash(path: Path) -> str:
    """SHA-256 of file contents (chunked for large files)."""
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(_HASH_CHUNK_SIZE)
            if not chunk:
                break
            sha256.update(chunk)
    return sha256.hexdigest()
```

File rename / move = cache hit (content identity preserved).
Content change = automatic invalidation. No index file needed.

### Frozen cache entry + file storage

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class CacheEntry:
    file_hash: str
    source_path: str
    document: ExtractedDocument  # The cached result
```

Each cache entry is stored as `{hash}.json` — O(1) lookup by
hash, no index file.

```python
import json

def write_cache(cache_dir: Path, entry: CacheEntry) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{entry.file_hash}.json"
    data = serialize_entry(entry)
    cache_file.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

def read_cache(cache_dir: Path, file_hash: str) -> CacheEntry | None:
    cache_file = cache_dir / f"{file_hash}.json"
    if not cache_file.is_file():
        return None
    try:
        raw = cache_file.read_text(encoding="utf-8")
        data = json.loads(raw)
        return deserialize_entry(data)
    except (json.JSONDecodeError, ValueError, KeyError):
        return None  # Treat corruption as cache miss
```

### Service-layer wrapper (SRP)

Processing function stays pure. Caching is a separate concern.

```python
def extract_with_cache(
    file_path: Path,
    *,
    cache_enabled: bool = True,
    cache_dir: Path = Path(".cache"),
) -> ExtractedDocument:
    if not cache_enabled:
        return extract_text(file_path)  # pure; no cache knowledge

    file_hash = compute_file_hash(file_path)

    cached = read_cache(cache_dir, file_hash)
    if cached is not None:
        logger.info("Cache hit: %s (hash=%s)", file_path.name, file_hash[:12])
        return cached.document

    logger.info("Cache miss: %s (hash=%s)", file_path.name, file_hash[:12])
    doc = extract_text(file_path)
    entry = CacheEntry(file_hash=file_hash, source_path=str(file_path), document=doc)
    write_cache(cache_dir, entry)
    return doc
```

### Anti-patterns

```python
# WRONG — path-based caching breaks on rename
cache = {"/path/to/file.pdf": result}

# WRONG — cache logic inside pure function (SRP violation)
def extract_text(path, *, cache_enabled=False, cache_dir=None):
    if cache_enabled:  # function now has two responsibilities
        ...

# WRONG — dataclasses.asdict() with nested frozen dataclasses
# (issues with complex nested types — use manual serialization)
data = dataclasses.asdict(entry)
```

### Best practices

- Hash content, not paths — paths change, content identity doesn't
- Chunk large files — avoid loading entire files into memory
- Keep processing functions pure — they know nothing about caching
- Log cache hit / miss with truncated hashes for debugging
- Handle corruption gracefully — treat invalid entries as misses,
  never crash

**Remember**: Backend patterns enable scalable, maintainable server-side applications. Choose patterns that fit your complexity level.

## Purpose

Server-side architecture patterns for Node.js / TypeScript / Next.js backends: handler structure, repository / service layering, validation, error envelopes, caching, background jobs, structured logging, and fire-and-forget side effects.

**Negative scope**: NOT REST contract design (see `~/.claude/skills/api-design/SKILL.md` — that owns URL shape, status codes, pagination). NOT database schema / migrations (separate skill). NOT cloud deployment patterns (`~/.claude/skills/aws-serverless-patterns/SKILL.md` covers Lambda specifics). NOT frontend state management.

## When NOT to use

- Stateless function-as-a-service workloads where Lambda + DynamoDB single-table covers the use case — use `aws-serverless-patterns`
- Pure database query optimisation — use `postgres-patterns` or `dynamodb-patterns`
- GraphQL servers (their middleware / resolver model differs)
- BFF (backend-for-frontend) layers that are thin pass-through — overengineering risk
- Embedded / batch / CLI workloads with no HTTP surface

## Standards Cited

- **RFC 9110** (HTTP Semantics, Jun 2022) §15 — status code semantics for handlers
- **RFC 9457** (Problem Details, Jul 2023) — error envelope shape
- **OWASP ASVS 4.0.3 §4** (Access Control), §5 (Validation, Sanitisation, Encoding), §7 (Error Handling + Logging)
- **OWASP API Security Top 10 (2023)** — API1 BOLA, API4 Resource Consumption, API8 Security Misconfiguration
- **The Twelve-Factor App (12factor.net)** — IV (Backing Services), VIII (Concurrency), XI (Logs)
- **Node.js LTS Documentation** (current LTS) — stream + async patterns
- **Repository / Unit-of-Work pattern** — Fowler, *Patterns of Enterprise Application Architecture* (2002)

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Fat handler (DB call + business logic + serialisation in one function) | Untestable; violates single-responsibility; couples HTTP to domain | Handler → service → repository layering |
| DB connection per request (no pool) | Connection exhaustion under load; latency spike on every request | Singleton pool injected at app start; per-request connection acquired from pool |
| Synchronous `for` loop calling DB | N+1 query pattern; serial latency stacks | Batch fetch with `IN (…)` + Map lookup OR JOIN |
| `console.log` for production logging | No structure, no correlation IDs, no filterable severity | Structured logger (pino, winston, slog) with `request_id` + `trace_id` |
| Fire-and-forget `void store.save()` or `.catch(() => null)` | Silent failure; error never surfaces; bug found by user, not on-call | `fireAndForget(name, promise)` helper that logs with operation + cause |
| Caching without TTL + invalidation strategy | Cache becomes permanent stale state; user sees outdated data | Explicit TTL + invalidation hook on mutation |
| Middleware order matters (auth after parsing JSON of any size) | DoS via 100MB body before auth fires | Auth + body-size limit FIRST in middleware chain |
| Webhook handler that mutates state on every retry | Provider retries → double-charge / double-create | Idempotency key + dedupe table (see `~/.claude/rules/common/idempotency.md`) |

## Verification Checklist

- [ ] Handler delegates to service; service delegates to repository (3-layer)
- [ ] All input validated via schema (Zod / Joi / class-validator) at boundary
- [ ] Connection pool injected once at app start; never created per-request
- [ ] Structured logger with `request_id` propagated through async context
- [ ] Errors mapped to RFC 9457 envelope at boundary; no internal stack traces leaked
- [ ] No N+1 — every `forEach` over DB rows audited for batch alternative
- [ ] Fire-and-forget uses the canonical helper, never bare `void`/`.catch(() => null)`
- [ ] Cache keys carry version prefix so deploys can invalidate
- [ ] Rate limit + auth middleware fires BEFORE body parsing of unbounded size

## Cross-References

- `~/.claude/skills/api-design/SKILL.md` — REST contract design (URL, status, envelope)
- `~/.claude/rules/common/idempotency.md` — Idempotency-Key contract for mutating endpoints
- `~/.claude/rules/common/no-silent-failures.md` — fire-and-forget canonical shape
- `~/.claude/rules/common/error-handling-with-context.md` — wrap-with-context discipline
- `~/.claude/rules/common/rate-limiting.md` — middleware ordering + RateLimit-* headers
- `~/.claude/rules/common/no-ambient-globals.md` — connection pool injection vs module-level singleton
- `~/.claude/rules/common/reuse-first.md` — sweep before adding a new middleware / repository / DTO
- `~/.claude/skills/postgres-patterns/SKILL.md` — query optimisation
- `~/.claude/skills/observability-patterns/SKILL.md` — structured logging + trace propagation

## Why this skill exists

Backend handlers are where every customer-visible failure is born — and where the cost of correctness is lowest at write time. The recurring failure modes:

- A handler that bundles DB + logic + serialisation grows to 300 lines, becomes untestable, and accumulates dark corners where validation is missed
- A connection pool created per-request exhausts under modest load (200 concurrent users × 1s/request = 200 simultaneous connections; Postgres default `max_connections=100`)
- N+1 queries hide in `await Promise.all(items.map(i => fetch(i.id)))` patterns; latency P99 explodes as data grows
- Fire-and-forget side effects (audit logs, peer-tab broadcasts) lose their errors; on-call doesn't find out for hours
- Webhook handlers fire twice on every provider retry without an idempotency table → double-charges on Stripe, double-emails on SendGrid

Cost of the layered + structured-logger + idempotent + bounded-middleware pattern: minutes per handler at write time. Cost of debugging the unstructured version: hours per incident.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Fire-and-forget side effect without `.catch` / structured failure log (sister `no-silent-failures.md` violation)
- Handler shape duplicates middleware logic that already exists (reuse-first weakening)
- Connection pool created per-request instead of injected from the application root
- DB call inside a loop where a JOIN / batch would work (N+1 pattern)
- Background job triggered synchronously when an outbox + worker would be safer
- Cache without TTL + invalidation strategy (cache becomes permanent stale state)
- Webhook handler not idempotent on retry (sister `idempotency.md` violation)
- Cross-request mutable state introduced (sister `no-ambient-globals.md` violation)
- Content-hash cache used as a write-through path without corruption-as-miss handling

**Refinement candidates**:
- New pattern row when a recurring backend shape emerges (e.g., outbox + transactional events, CQRS read model, materialized view refresh)
- New cross-reference when a sister rule (idempotency, observability, error-handling-with-context) adds a server-side gate
- Tightening of the fire-and-forget pattern when async errors slip past structured logging
- New cache-eviction template when a recurring staleness incident class recurs
