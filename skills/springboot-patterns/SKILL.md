---
name: springboot-patterns
description: Spring Boot architecture patterns, REST API design, layered services, data access, caching, async processing, and logging. Use for Java Spring Boot backend work.
---

# Spring Boot Development Patterns

> **Reuse-first** (per `~/.claude/rules/common/reuse-first.md`):
> One source of truth per Spring concept — one `@ControllerAdvice`
> exception handler, one custom `Validator`, one common base
> entity, one shared `JpaRepository` interface per aggregate.
> Sweep `*Service`, `*Repository`, `dto/`, `mapper/` directories
> before adding new classes. Extend via interface / abstract base
> / `@Configuration` — never fork.

Spring Boot architecture and API patterns for scalable, production-grade services.

## When to Activate

- Building REST APIs with Spring MVC or WebFlux
- Structuring controller → service → repository layers
- Configuring Spring Data JPA, caching, or async processing
- Adding validation, exception handling, or pagination
- Setting up profiles for dev/staging/production environments
- Implementing event-driven patterns with Spring Events or Kafka

## REST API Structure

```java
@RestController
@RequestMapping("/api/markets")
@Validated
class MarketController {
  private final MarketService marketService;

  MarketController(MarketService marketService) {
    this.marketService = marketService;
  }

  @GetMapping
  ResponseEntity<Page<MarketResponse>> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<Market> markets = marketService.list(PageRequest.of(page, size));
    return ResponseEntity.ok(markets.map(MarketResponse::from));
  }

  @PostMapping
  ResponseEntity<MarketResponse> create(@Valid @RequestBody CreateMarketRequest request) {
    Market market = marketService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(MarketResponse.from(market));
  }
}
```

## Repository Pattern (Spring Data JPA)

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  @Query("select m from MarketEntity m where m.status = :status order by m.volume desc")
  List<MarketEntity> findActive(@Param("status") MarketStatus status, Pageable pageable);
}
```

## Service Layer with Transactions

```java
@Service
public class MarketService {
  private final MarketRepository repo;

  public MarketService(MarketRepository repo) {
    this.repo = repo;
  }

  @Transactional
  public Market create(CreateMarketRequest request) {
    MarketEntity entity = MarketEntity.from(request);
    MarketEntity saved = repo.save(entity);
    return Market.from(saved);
  }
}
```

## DTOs and Validation

```java
public record CreateMarketRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 2000) String description,
    @NotNull @FutureOrPresent Instant endDate,
    @NotEmpty List<@NotBlank String> categories) {}

public record MarketResponse(Long id, String name, MarketStatus status) {
  static MarketResponse from(Market market) {
    return new MarketResponse(market.id(), market.name(), market.status());
  }
}
```

## Exception Handling

```java
@ControllerAdvice
class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(ApiError.validation(message));
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> handleAccessDenied() {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of("Forbidden"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleGeneric(Exception ex) {
    // Log unexpected errors with stack traces
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of("Internal server error"));
  }
}
```

## Caching

Requires `@EnableCaching` on a configuration class.

```java
@Service
public class MarketCacheService {
  private final MarketRepository repo;

  public MarketCacheService(MarketRepository repo) {
    this.repo = repo;
  }

  @Cacheable(value = "market", key = "#id")
  public Market getById(Long id) {
    return repo.findById(id)
        .map(Market::from)
        .orElseThrow(() -> new EntityNotFoundException("Market not found"));
  }

  @CacheEvict(value = "market", key = "#id")
  public void evict(Long id) {}
}
```

## Async Processing

Requires `@EnableAsync` on a configuration class.

```java
@Service
public class NotificationService {
  @Async
  public CompletableFuture<Void> sendAsync(Notification notification) {
    // send email/SMS
    return CompletableFuture.completedFuture(null);
  }
}
```

## Logging (SLF4J)

```java
@Service
public class ReportService {
  private static final Logger log = LoggerFactory.getLogger(ReportService.class);

  public Report generate(Long marketId) {
    log.info("generate_report marketId={}", marketId);
    try {
      // logic
    } catch (Exception ex) {
      log.error("generate_report_failed marketId={}", marketId, ex);
      throw ex;
    }
    return new Report();
  }
}
```

## Middleware / Filters

```java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    long start = System.currentTimeMillis();
    try {
      filterChain.doFilter(request, response);
    } finally {
      long duration = System.currentTimeMillis() - start;
      log.info("req method={} uri={} status={} durationMs={}",
          request.getMethod(), request.getRequestURI(), response.getStatus(), duration);
    }
  }
}
```

## Pagination and Sorting

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<Market> results = marketService.list(page);
```

## Error-Resilient External Calls

```java
public <T> T withRetry(Supplier<T> supplier, int maxRetries) {
  int attempts = 0;
  while (true) {
    try {
      return supplier.get();
    } catch (Exception ex) {
      attempts++;
      if (attempts >= maxRetries) {
        throw ex;
      }
      try {
        Thread.sleep((long) Math.pow(2, attempts) * 100L);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        throw ex;
      }
    }
  }
}
```

## Rate Limiting (Filter + Bucket4j)

**Security Note**: The `X-Forwarded-For` header is untrusted by default because clients can spoof it.
Only use forwarded headers when:
1. Your app is behind a trusted reverse proxy (nginx, AWS ALB, etc.)
2. You have registered `ForwardedHeaderFilter` as a bean
3. You have configured `server.forward-headers-strategy=NATIVE` or `FRAMEWORK` in application properties
4. Your proxy is configured to overwrite (not append to) the `X-Forwarded-For` header

When `ForwardedHeaderFilter` is properly configured, `request.getRemoteAddr()` will automatically
return the correct client IP from the forwarded headers. Without this configuration, use
`request.getRemoteAddr()` directly—it returns the immediate connection IP, which is the only
trustworthy value.

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  /*
   * SECURITY: This filter uses request.getRemoteAddr() to identify clients for rate limiting.
   *
   * If your application is behind a reverse proxy (nginx, AWS ALB, etc.), you MUST configure
   * Spring to handle forwarded headers properly for accurate client IP detection:
   *
   * 1. Set server.forward-headers-strategy=NATIVE (for cloud platforms) or FRAMEWORK in
   *    application.properties/yaml
   * 2. If using FRAMEWORK strategy, register ForwardedHeaderFilter:
   *
   *    @Bean
   *    ForwardedHeaderFilter forwardedHeaderFilter() {
   *        return new ForwardedHeaderFilter();
   *    }
   *
   * 3. Ensure your proxy overwrites (not appends) the X-Forwarded-For header to prevent spoofing
   * 4. Configure server.tomcat.remoteip.trusted-proxies or equivalent for your container
   *
   * Without this configuration, request.getRemoteAddr() returns the proxy IP, not the client IP.
   * Do NOT read X-Forwarded-For directly—it is trivially spoofable without trusted proxy handling.
   */
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    // Use getRemoteAddr() which returns the correct client IP when ForwardedHeaderFilter
    // is configured, or the direct connection IP otherwise. Never trust X-Forwarded-For
    // headers directly without proper proxy configuration.
    String clientIp = request.getRemoteAddr();

    Bucket bucket = buckets.computeIfAbsent(clientIp,
        k -> Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    }
  }
}
```

## Background Jobs

Use Spring’s `@Scheduled` or integrate with queues (e.g., Kafka, SQS, RabbitMQ). Keep handlers idempotent and observable.

## Observability

- Structured logging (JSON) via Logback encoder
- Metrics: Micrometer + Prometheus/OTel
- Tracing: Micrometer Tracing with OpenTelemetry or Brave backend

## Production Defaults

- Prefer constructor injection, avoid field injection
- Enable `spring.mvc.problemdetails.enabled=true` for RFC 7807 errors (Spring Boot 3+)
- Configure HikariCP pool sizes for workload, set timeouts
- Use `@Transactional(readOnly = true)` for queries
- Enforce null-safety via `@NonNull` and `Optional` where appropriate

**Remember**: Keep controllers thin, services focused, repositories simple, and errors handled centrally. Optimize for maintainability and testability.

## Purpose

Principal-level Spring Boot architecture: layered separation (controller / service / repository), constructor injection, transactional boundaries, centralised exception handling, observability, caching, and async boundaries.

**Negative scope** (NOT what this skill covers):
- Spring Boot AUTH / security flows — see `springboot-security`
- Spring Boot TEST methodology — see `springboot-tdd`
- JPA entity modelling + queries — see `jpa-patterns`
- Java language idioms (Optional, records, streams) — see `java-coding-standards`
- Build / CI / coverage gates — see `springboot-verification`

## When NOT to use

- Non-Spring JVM frameworks (Quarkus, Micronaut, Helidon — different DI / startup model)
- Kotlin coroutines-first servers (see Ktor patterns)
- Reactive WebFlux at high scale (defer to project-specific reactive guidance — back-pressure semantics differ from MVC)

## Standards Cited

- **Spring Framework 6.2 Reference** (`docs.spring.io/spring-framework/reference`) — DI, transactions, AOP, MVC
- **Spring Boot 3.4 Reference** (`docs.spring.io/spring-boot/reference`) — auto-config, actuator, observability
- **JSR 380 (Jakarta Bean Validation 3.0)** — `@Valid`, `@NotNull`, `@Email` semantics
- **RFC 7807 (Problem Details for HTTP APIs)** — Spring 6 `ProblemDetail` API
- **RFC 9457 (Problem Details — successor)** — current standard
- **OpenAPI 3.1** — `springdoc-openapi` integration
- **OWASP ASVS 4.0.3 §1, §4, §13** — architecture + access-control + API surface
- **Effective Java 3e (Bloch)** — Item 17 (immutability), Item 18 (composition), Item 50 (defensive copies)

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `@Autowired` field injection | Hidden deps, untestable without reflection, mutable | Constructor injection (Spring 4.3+ auto-wires single-constructor) |
| Business logic in `@RestController` | Couples HTTP to domain; can't reuse from CLI / scheduled job / queue consumer | Move to `@Service`; controller only does parse → call → respond |
| `@Transactional` on controller methods | Transaction spans the HTTP serialisation phase — connection pool starvation | Place on `@Service` methods; controller is transaction-free |
| `@Transactional(propagation = REQUIRES_NEW)` everywhere | Loses outer-tx semantics; creates orphan saves on partial failure | Default `REQUIRED`; `REQUIRES_NEW` only for audit-log / outbox patterns |
| Catching `Exception` in handler and returning 500 | Hides real errors; client sees "Internal error" for validation failures | `@ControllerAdvice` with typed `@ExceptionHandler` per domain exception → `ProblemDetail` per RFC 9457 |
| `new RestTemplate()` per request | Connection pool exhaustion + DNS thrash | Inject `RestClient` (Spring 6.1+) or `WebClient` configured once at startup |
| `Optional<T>` as `@Entity` field or method parameter | Optional designed for return types only; serialisation breaks | Use nullable field; return `Optional<T>` from repository |
| `@Async` without explicit `Executor` bean | Spring uses `SimpleAsyncTaskExecutor` (unbounded threads) | Define `ThreadPoolTaskExecutor` bean with bounded queue + rejection policy |

## Verification Checklist

- [ ] All `@Service`/`@Repository`/`@Controller` use constructor injection (no `@Autowired` fields)
- [ ] Controllers do NO business logic (parse → service → respond only)
- [ ] `@Transactional` on service layer only, never controllers
- [ ] `@ControllerAdvice` handles ALL domain exceptions with `ProblemDetail` (RFC 9457)
- [ ] `RestClient` / `WebClient` beans configured at startup, not constructed per request
- [ ] `@Async` methods use an explicit bounded `Executor`
- [ ] HikariCP pool size + connection timeout tuned for load
- [ ] Actuator endpoints (`/actuator/health`, `/actuator/metrics`) secured behind admin auth
- [ ] OpenAPI spec generated via `springdoc-openapi` and served at `/v3/api-docs`

## Cross-References

- `~/.claude/skills/springboot-security/SKILL.md` — Spring Security 6 + OAuth2 + CSRF
- `~/.claude/skills/springboot-tdd/SKILL.md` — JUnit 5 + Mockito + Testcontainers
- `~/.claude/skills/springboot-verification/SKILL.md` — Maven / Gradle build gates
- `~/.claude/skills/jpa-patterns/SKILL.md` — Hibernate query optimisation
- `~/.claude/skills/java-coding-standards/SKILL.md` — language idioms
- `~/.claude/skills/api-design/SKILL.md` — REST contract design
- `~/.claude/skills/observability-patterns/SKILL.md` — Micrometer + OTel
- `~/.claude/rules/common/no-ambient-globals.md` — DI is the substrate
- `~/.claude/rules/common/error-handling-with-context.md` — RFC 9457 mapping
- `~/.claude/agents/code-reviewer.md` — Java code-review delegate

## Why this skill exists

Spring Boot's "convention over configuration" + auto-config saves time at the cost of subtle defaults: `SimpleAsyncTaskExecutor` is unbounded, default `RestTemplate` shares no pool, `@Transactional` placement determines connection-pool exhaustion under load, `@ControllerAdvice` placement determines whether validation errors leak stacktraces. The patterns above codify the production-ready defaults so Spring Boot apps survive the second deploy.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Field injection via `@Autowired` on private field (constructor injection weakening — testability cost)
- Fat controller (business logic in `@RestController` instead of `@Service`)
- `@Transactional` on public method called via `this.method()` (proxy bypass — TX not applied)
- HikariCP defaults left in place when QPS profile suggests tuning needed
- `@ControllerAdvice` missing for exception translation (per `~/.claude/rules/common/error-handling-with-context.md`)
- Bean cycle / circular `@Autowired` — startup-time signal of architectural smell
- DTO returned from repository (entity-vs-DTO leakage)
- Application properties hardcoded instead of using `@ConfigurationProperties` + validation
- Async method called within same class (proxy-bypass — `@Async` not applied)
- Reactive (`Mono`/`Flux`) mixed with blocking JDBC in same chain (thread-pool starvation)

**Refinement candidates**:
- New pattern row when Spring Boot ships a new feature (e.g., Spring Boot 4 GraalVM AOT)
- New cross-reference when a sister skill (springboot-security, springboot-tdd, jpa-patterns) adds a related pattern
- Tightening of the `@Transactional` guidance when a recurring TX-bypass incident emerges
- New testability gate when constructor-injection regression recurs
