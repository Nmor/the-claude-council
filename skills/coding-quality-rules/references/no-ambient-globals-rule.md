# No Ambient Globals Rule (Always-On, Global)

> Auto-fires on every file. Sister to `coding-style.md`,
> `no-discards.md`, `error-handling-with-context.md`,
> `extreme-lint-policy.md`. Standards: **TypeScript strict mode**,
> **Go module-private**, **Python module discipline**, **Java
> package-private**, **dependency injection** (Fowler).

## Core Principle

**Code does not depend on ambient global state — process-wide
variables, monkey-patched modules, implicit configuration, or
"singletons that just exist." Every dependency is INJECTED:
passed as a parameter, available on a context object, or
explicitly resolved from a container. Test isolation and
production reasoning both depend on this discipline.**

Ambient globals are the leading source of "works in isolation,
breaks under concurrent load," "tests pass in one order, fail in
another," and "this function does X, but ALSO mutates Y over
there." They're invisible coupling.

## What counts as an ambient global

| Pattern | Why it's a problem |
| --- | --- |
| Module-level mutable state | Shared across all callers; changes from one caller affect others |
| Process-wide singletons (`Logger.global`) | One config for entire process; can't test with different configs |
| Environment variables read at call time | Behaviour depends on env at the moment of call, not at construction |
| `globalThis` / `window` / `global` / `os.environ` | Same as above, more obvious |
| Static-method-only classes | Hidden state inside the class |
| `requireUser()` that reads from thread-local | Hidden dependency on request context |
| Global event emitters / pub-sub buses | Listeners from anywhere; mutation by anyone |
| Monkey-patched standard library | Behaviour depends on import order |
| Implicit timezone / locale | Same code returns different results based on machine state |
| `Math.random()` without seed control | Can't reproduce; can't test deterministically |

## Hard rules

### 1. Dependencies are EXPLICIT parameters or context

```typescript
// WRONG — hidden dependency on global logger
import { logger } from './logger';
export async function fetchUser(id: string) {
  logger.info('fetching', { id });
  ...
}

// RIGHT — injected via context
interface RequestContext {
  logger: Logger;
  db: DBClient;
  user: User | null;
}
export async function fetchUser(ctx: RequestContext, id: string) {
  ctx.logger.info('fetching', { id });
  ...
}
```

The `RequestContext` pattern carries per-request state: logger
(with correlated request_id), DB connection from the pool,
authenticated user, feature flag evaluator, trace span. It's
constructed at the request boundary; functions receive it.

### 2. Configuration is resolved at startup, frozen, then passed

```typescript
// WRONG — env var read inside the function
export function getApiUrl() {
  return process.env.API_URL ?? 'http://localhost';
}

// RIGHT — config object built once at startup
export interface Config {
  readonly apiUrl: string;
  readonly dbUrl: string;
  readonly stripeKey: string;
}

export function buildConfig(): Config {
  return Object.freeze({
    apiUrl: requireEnv('API_URL'),
    dbUrl: requireEnv('DB_URL'),
    stripeKey: requireEnv('STRIPE_KEY'),
  });
}
```

`requireEnv` validates presence at startup (fail-fast, per
`error-handling-with-context.md`); the rest of the app reads from
the `Config` object, never from `process.env` directly.

### 3. Singletons are CONSTRUCTED at startup, not lazy-initialised

```go
// WRONG — lazy global, no error path, no test override
var db *sql.DB

func init() {
    db, _ = sql.Open("postgres", os.Getenv("DB_URL"))
}

// RIGHT — constructed in main(), passed via dependency
type Application struct {
    Config *Config
    DB     *sql.DB
    Logger *slog.Logger
}

func New(cfg *Config) (*Application, error) {
    db, err := sql.Open("postgres", cfg.DBURL)
    if err != nil {
        return nil, fmt.Errorf("connect db: %w", err)
    }
    return &Application{Config: cfg, DB: db, Logger: cfg.Logger}, nil
}

// Handlers carry the Application reference
func (a *Application) HandleUser(w http.ResponseWriter, r *http.Request) {
    user, err := repo.FindUser(a.DB, r.PathValue("id"))
    ...
}
```

Test code constructs a different `Application` with mocks.
Production constructs the real one. Same code, different inputs.

### 4. Time is not a global

```typescript
// WRONG — uses real wall clock; tests can't control time
function isExpired(token: Token) {
  return token.expiresAt < Date.now();
}

// RIGHT — clock is injected
interface Clock {
  now(): number;
}
function isExpired(clock: Clock, token: Token) {
  return token.expiresAt < clock.now();
}

const SystemClock: Clock = { now: () => Date.now() };
const TestClock = (fixed: number): Clock => ({ now: () => fixed });
```

Same for IDs (UUIDs / ULIDs — inject a generator), random
numbers (inject a seeded RNG), and other "implicit
non-determinism" sources.

### 5. Module-level mutable state is BANNED

```python
# WRONG — module-level mutable cache
CACHE = {}

def get_user(id):
    if id not in CACHE:
        CACHE[id] = db.query(id)
    return CACHE[id]

# RIGHT — cache is a service with a defined lifecycle
class UserCache:
    def __init__(self, db):
        self._db = db
        self._cache = {}

    def get(self, user_id):
        if user_id not in self._cache:
            self._cache[user_id] = self._db.query(user_id)
        return self._cache[user_id]

# Constructed in app startup; passed to handlers
```

Module-level state is hidden coupling. Different test files
share the cache; one test's "create user 1" pollutes another
test's "user 1 doesn't exist."

### 6. Logger is per-request, not global

```typescript
// WRONG — global logger, no per-request correlation
import { logger } from './logger';
logger.info('user signed in');

// RIGHT — request-scoped logger with correlation
interface RequestContext {
  logger: Logger;  // has trace_id, request_id bound
}

function handleSignin(ctx: RequestContext) {
  ctx.logger.info('user signed in');
  // log already includes trace_id, request_id, user_id from ctx
}
```

The logger that gets stored on the context has bound fields
(request_id, trace_id, span_id, user_id) so every log within
that request automatically correlates.

### 7. Database connections come from a pool, scoped to the request

```typescript
// WRONG — handler grabs a connection from a global pool
import { pool } from './db';
async function handle(req: Request) {
  const result = await pool.query('SELECT ...');
}

// RIGHT — connection is acquired at request entry,
// released on response (or via middleware / async-local-storage)
async function handle(ctx: RequestContext, req: Request) {
  const result = await ctx.db.query('SELECT ...');
}
```

The middleware constructs the per-request `ctx.db` from the
pool; the same connection handles the request's transaction
boundary.

### 8. Feature flags are per-request

Per `feature-flags.md` — flag evaluation depends on the user's
context (user_id, tenant_id, plan tier). Globals can't capture
that. The flag client is on the context:

```typescript
async function handler(ctx: RequestContext) {
  const useV2 = await ctx.flags.isEnabled('checkout-v2', {
    userId: ctx.user.id,
    tenantId: ctx.user.tenantId,
  });
  ...
}
```

### 9. Async-local-storage / context propagation for cross-cutting state

When passing the context explicitly through every function is
verbose:

| Language | Mechanism |
| --- | --- |
| Node.js | `AsyncLocalStorage` (built-in `async_hooks`) |
| Go | `context.Context` (idiomatic, passed everywhere) |
| Python | `contextvars` (built-in, asyncio-aware) |
| Java / Kotlin | `ThreadLocal` (sync) + `Reactor Context` (reactive) |
| Ruby | `RequestStore` gem |
| .NET | `AsyncLocal<T>` |

ALS is still injection — just plumbed through the runtime
instead of through parameter lists. It's NOT the same as a
global; the value is scoped to the request.

### 10. Test isolation is the proof

The acid test: can two tests run in PARALLEL with completely
different config / state / time / flags without interfering?

- If yes → no ambient globals
- If no → there's hidden state somewhere; find + inject it

Run the test suite with `--shuffle` (Go: `-shuffle`; Rust: native;
pytest: `--randomly-seed`); failure under shuffle = ambient
global.

## Per-language patterns

### TypeScript

- DI containers: `tsyringe`, `awilix`, `inversify`
- Lighter: factory functions returning closures over deps
- `AsyncLocalStorage` for request context in Node
- Tools: tsconfig `noImplicitAny: true`, `strict: true`

### Go

- `context.Context` is the idiom
- Pass struct dependencies (no DI container needed); methods
  receive `*Application` or per-domain `*Repository`
- Banned: `init()` for anything non-trivial; package-level vars
- Linter: `gochecknoinits`, `gochecknoglobals` (per
  `extreme-lint-policy.md`)

### Python

- DI containers: `dependency-injector`, `injector`
- Lighter: factory functions; pytest fixtures for testing
- `contextvars` for async request context (FastAPI, Starlette)
- Tools: `mypy --strict`, `pylint`

### Java / Kotlin

- Spring DI (Spring Boot)
- Constructor injection (preferred); avoid field injection
- Reactor `Context` for reactive flows

### Rust

- Pass `&AppState` everywhere; Axum / Actix-Web idiomatic
- Trait-based abstractions for testing (`impl Db for ...`)
- No globals via `lazy_static!` for mutable state — use `OnceCell`
  / `OnceLock` only for true immutable singletons (e.g., regex
  compilation)

## Anti-patterns

### Anti-pattern 1: "Just use the import"

```typescript
// In a handler
import { db } from '../db';
db.query(...);
```

The handler now depends on `../db`'s module state — including
which `db` got initialised when. Testing requires
monkey-patching. Use the context.

### Anti-pattern 2: Global singleton with reset method

```typescript
class GlobalConfig {
  private static instance: Config;
  static get() { return GlobalConfig.instance; }
  static reset(newConfig: Config) { GlobalConfig.instance = newConfig; }
}
```

The `reset` method is an admission that the global breaks tests.
Stop bandaging — inject.

### Anti-pattern 3: Service locator

```typescript
const userService = ServiceLocator.get<UserService>('UserService');
```

The service locator is itself a global; you've moved the
dependency from explicit to hidden inside the locator. True DI
passes the dependency directly.

### Anti-pattern 4: `init()` with side effects (Go)

```go
func init() {
    db = connectToDatabase()
    log.SetOutput(os.Stdout)
    http.HandleFunc("/", handler)
}
```

`init()` runs before `main()`; you cannot test the side effects,
cannot defer them, cannot order them. Move to `main()`.

### Anti-pattern 5: Environment variables read deep in the stack

```python
def calculate_tax(amount):
    rate = float(os.environ.get('TAX_RATE', '0.08'))
    return amount * rate
```

`TAX_RATE` is now a hidden input to every test of
`calculate_tax`. Pass the rate as a parameter or carry it on the
config.

## Acceptable "globals"

Not every global is bad. These are OK:

| Pattern | Why OK |
| --- | --- |
| **Immutable constants** (`const MAX_RETRIES = 3`) | Frozen at compile time; safe to share |
| **Pure function modules** (`Math.max`, `crypto.hash`) | No state, deterministic |
| **Logger interface (not instance)** | The interface is global; the instance is injected |
| **Type definitions / classes** | Schemas, not state |
| **Stable runtime singletons via OnceLock** | Truly one-time initialisation that never changes |

The line: if it has STATE that CHANGES across calls, it
shouldn't be global.

## Cross-references

- `coding-style.md` — broader code-style baseline
- `no-discards.md` — every value bound; every error wrapped
- `error-handling-with-context.md` — errors carry operation +
  ids from the context
- `extreme-lint-policy.md` — globals linted out
- `local-testability.md` — testable code requires injection
- `idempotency.md` — deterministic operations require seeded
  randomness
- `task-intake-due-diligence.md` Q14 (testability)
- `feature-flags.md` — per-request context
- `audit-logging.md` — per-request actor

## Standards cited

- **Dependency Injection** — Fowler 2004
  (martinfowler.com/articles/injection.html)
- **Twelve-Factor App** — Config in environment, parsed once at
  startup
- **Hexagonal Architecture** — Cockburn 2005 (Ports + Adapters)
- **Clean Architecture** — Martin 2017

## Why this rule exists

Ambient globals cause failures that are HARD to debug:

1. **Test order dependency** — Test A sets a global; test B reads
   it; reordering = breakage
2. **Concurrent state corruption** — Two requests hit the same
   global cache; race condition; data leaked across users
3. **Configuration drift** — Different parts of the app read env
   vars at different times; one part has stale config
4. **"Works in production, fails in staging"** — Staging
   missing an env var the dev forgot to document
5. **Refactoring resistance** — Touching a function requires
   tracing every global it transitively reads/writes

Injection-based code is:

- Testable in isolation (mock the deps)
- Parallel-safe (no shared state)
- Self-documenting (signature shows the dependencies)
- Refactor-friendly (the dependency graph is explicit)

The cost: more characters in function signatures. The benefit:
debuggable, testable, scalable code.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New module-level mutable state introduced (singleton cache, shared dict, lazy-init holder) — rule 1 weakening
- `process.env` / `os.environ` read deep in the call stack instead of at startup (rule 2 violation)
- `init()` (Go) / `__init__.py` with side effects beyond pure assignment — rule 3 violation
- `Date.now()` / `time.Now()` called directly in product code (rule 4 — Clock not injected)
- `Math.random()` / `crypto.randomUUID()` invoked without a seeded RNG injection layer (rule 4 weakening)
- Logger imported as a module-level singleton instead of bound to the request context (rule 6 violation)
- DB connection grabbed from a global pool inside a handler instead of context-acquired (rule 7 weakening)
- Feature flag client read globally rather than per-request context (rule 8 weakening)
- Test failures appear under `--shuffle` / `-shuffle` (rule 10 violation — ambient global exists)
- `gochecknoglobals` / `gochecknoinits` lint disabled in golangci-lint config

**Refinement candidates**:

- New per-language DI pattern row when a new framework's idiom emerges (e.g., new async-local-storage shape, new effect system)
- Tightening of the test-shuffle gate when randomised order isn't enforced in CI
- New cross-reference when a sister rule (no-discards, local-testability, idempotency) depends on DI for verification
- New "acceptable global" entry when a recurring genuinely-stateless pattern (interned strings, compiled regex catalog) needs the carve-out

---

<!-- ============================================================
     Section: no-local-fs.md (from rules/common/)
     ============================================================ -->
