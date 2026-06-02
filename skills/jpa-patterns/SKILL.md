---
name: jpa-patterns
description: JPA/Hibernate patterns for entity design, relationships, query optimization, transactions, auditing, indexing, pagination, and pooling in Spring Boot.
---

# JPA/Hibernate Patterns

Use for data modeling, repositories, and performance tuning in Spring Boot.

## When to Activate

- Designing JPA entities and table mappings
- Defining relationships (@OneToMany, @ManyToOne, @ManyToMany)
- Optimizing queries (N+1 prevention, fetch strategies, projections)
- Configuring transactions, auditing, or soft deletes
- Setting up pagination, sorting, or custom repository methods
- Tuning connection pooling (HikariCP) or second-level caching

## Entity Design

```java
@Entity
@Table(name = "markets", indexes = {
  @Index(name = "idx_markets_slug", columnList = "slug", unique = true)
})
@EntityListeners(AuditingEntityListener.class)
public class MarketEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, unique = true, length = 120)
  private String slug;

  @Enumerated(EnumType.STRING)
  private MarketStatus status = MarketStatus.ACTIVE;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant updatedAt;
}
```

Enable auditing:
```java
@Configuration
@EnableJpaAuditing
class JpaConfig {}
```

## Relationships and N+1 Prevention

```java
@OneToMany(mappedBy = "market", cascade = CascadeType.ALL, orphanRemoval = true)
private List<PositionEntity> positions = new ArrayList<>();
```

- Default to lazy loading; use `JOIN FETCH` in queries when needed
- Avoid `EAGER` on collections; use DTO projections for read paths

```java
@Query("select m from MarketEntity m left join fetch m.positions where m.id = :id")
Optional<MarketEntity> findWithPositions(@Param("id") Long id);
```

## Repository Patterns

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  Optional<MarketEntity> findBySlug(String slug);

  @Query("select m from MarketEntity m where m.status = :status")
  Page<MarketEntity> findByStatus(@Param("status") MarketStatus status, Pageable pageable);
}
```

- Use projections for lightweight queries:
```java
public interface MarketSummary {
  Long getId();
  String getName();
  MarketStatus getStatus();
}
Page<MarketSummary> findAllBy(Pageable pageable);
```

## Transactions

- Annotate service methods with `@Transactional`
- Use `@Transactional(readOnly = true)` for read paths to optimize
- Choose propagation carefully; avoid long-running transactions

```java
@Transactional
public Market updateStatus(Long id, MarketStatus status) {
  MarketEntity entity = repo.findById(id)
      .orElseThrow(() -> new EntityNotFoundException("Market"));
  entity.setStatus(status);
  return Market.from(entity);
}
```

## Pagination

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<MarketEntity> markets = repo.findByStatus(MarketStatus.ACTIVE, page);
```

For cursor-like pagination, include `id > :lastId` in JPQL with ordering.

## Indexing and Performance

- Add indexes for common filters (`status`, `slug`, foreign keys)
- Use composite indexes matching query patterns (`status, created_at`)
- Avoid `select *`; project only needed columns
- Batch writes with `saveAll` and `hibernate.jdbc.batch_size`

## Connection Pooling (HikariCP)

Recommended properties:
```
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.validation-timeout=5000
```

For PostgreSQL LOB handling, add:
```
spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation=true
```

## Caching

- 1st-level cache is per EntityManager; avoid keeping entities across transactions
- For read-heavy entities, consider second-level cache cautiously; validate eviction strategy

## Migrations

- Use Flyway or Liquibase; never rely on Hibernate auto DDL in production
- Keep migrations idempotent and additive; avoid dropping columns without plan

## Testing Data Access

- Prefer `@DataJpaTest` with Testcontainers to mirror production
- Assert SQL efficiency using logs: set `logging.level.org.hibernate.SQL=DEBUG` and `logging.level.org.hibernate.orm.jdbc.bind=TRACE` for parameter values

**Remember**: Keep entities lean, queries intentional, and transactions short. Prevent N+1 with fetch strategies and projections, and index for your read/write paths.

## Purpose

Principal-level JPA / Hibernate patterns: entity modelling, association fetching strategies (N+1 prevention), Criteria + JPQL query design, projections, second-level cache, transaction scoping, schema migration discipline.

**Negative scope** (NOT what this skill covers):
- Spring Boot wiring around the persistence layer — see `springboot-patterns`
- Raw SQL optimisation outside JPA — see `postgres-patterns`
- Schema migration safety (squawk, expand-contract) — see `schema-evolution.md` + `database-migrations`
- Test methodology for repositories — see `springboot-tdd`
- DynamoDB / NoSQL patterns — see `dynamodb-patterns`

## When NOT to use

- High-write event-stream workloads (consider direct JDBC / R2DBC or specialised ORMs)
- Single-table DynamoDB design (use `dynamodb-patterns`)
- Reporting / OLAP queries (use ClickHouse / Snowflake via JDBC, not JPA)
- Bulk imports (use `INSERT ... SELECT` or `COPY`; JPA's flush overhead kills throughput)

## Standards Cited

- **JSR 338 — Jakarta Persistence 3.1** (`jakarta.ee/specifications/persistence/3.1`) — core specification
- **Hibernate ORM 6.6 User Guide** (`docs.jboss.org/hibernate/orm/6.6/userguide/`) — implementation reference
- **Spring Data JPA 3.4 Reference** (`docs.spring.io/spring-data/jpa/reference`) — repository abstractions
- **SQL:2023 (ISO/IEC 9075)** — query semantics
- **Effective Java 3e — Item 50, Item 17** — defensive copies, immutability for entities
- **Vlad Mihalcea's High-Performance Java Persistence** (canonical reference; matches Hibernate 6.x)
- **OWASP ASVS 4.0.3 §5.3 (Output Encoding) + §13.3 (SOAP/Webservice/SQL)** — query parameterisation

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `@OneToMany(fetch = EAGER)` | Loads the entire collection on every parent load; N+1 cascade | Default `LAZY`; use `@EntityGraph` or `JOIN FETCH` for known access |
| `@OneToMany` without `mappedBy` | Hibernate creates join table even with FK column present | Always `mappedBy = "parentField"` on the owning side |
| Repository method returning entity for read-only display | Hibernate dirty-checks every loaded entity = unnecessary work | Use DTO projection: `interface OrderSummary { Long getId(); String getStatus(); }` |
| `entity.equals(other)` without overriding `equals/hashCode` | Default Object identity; breaks `Set<Entity>` semantics | Override `equals/hashCode` on natural key OR business-key; never on `@Id` (changes after persist) |
| `@Transactional` on read methods | Acquires write-lock connection from pool | `@Transactional(readOnly = true)` — Hibernate skips dirty-check, uses read replica if configured |
| `CascadeType.ALL` on `@ManyToMany` | Cascade DELETE blows away shared entities | `CascadeType.PERSIST + MERGE` only; never CASCADE on shared associations |
| `findAll()` for paginated UI | Loads entire table | `Pageable` with `Page<T>` OR cursor-based pagination |
| Hibernate auto-DDL (`hbm2ddl.auto=update`) in prod | Silent schema drift; production-only columns | Flyway / Liquibase / Atlas; auto-DDL is dev-only |

## Verification Checklist

- [ ] All `@OneToMany` / `@ManyToMany` are LAZY (default) unless eager use documented
- [ ] N+1 queries detected via `hibernate-statistics` or Hypersistence Optimizer
- [ ] DTO projections used for read-only views
- [ ] `equals/hashCode` overridden on natural / business key (NOT `@Id`)
- [ ] `@Transactional(readOnly = true)` on query-only services
- [ ] No `CascadeType.ALL` on shared associations
- [ ] Pagination via `Pageable` or cursor; no unbounded `findAll()`
- [ ] Schema migrations via Flyway / Liquibase; `hbm2ddl.auto=validate` in prod
- [ ] Slow-query log enabled (`spring.jpa.properties.hibernate.session.events.log.LOG_QUERIES_SLOWER_THAN_MS=200`)

## Cross-References

- `~/.claude/skills/springboot-patterns/SKILL.md` — service / transaction wiring
- `~/.claude/skills/springboot-tdd/SKILL.md` — `@DataJpaTest` with Testcontainers
- `~/.claude/skills/database-migrations/SKILL.md` — Flyway / Liquibase patterns
- `~/.claude/skills/postgres-patterns/SKILL.md` — index design + EXPLAIN
- `~/.claude/skills/java-coding-standards/SKILL.md` — record / Optional / immutability
- `~/.claude/rules-library/common/schema-evolution.md` — expand-contract migration
- `~/.claude/rules-library/common/observability.md` — slow-query metrics
- `~/.claude/agents/database-reviewer.md` — Council Division 9 delegate

## Why this skill exists

JPA's "object-relational mapping" abstraction is leaky in two directions: developers who treat entities as plain Java objects encounter N+1 queries, accidental EAGER cascades, and `LazyInitializationException`; developers who treat it as raw SQL miss out on caching, dirty-checking, and identity-map benefits. The patterns above strike the principal-level balance: lean entities, intentional fetches, DTO projections for reads, transactional discipline, migrations in version control. Apps following these defaults survive 10× load without rewriting the persistence layer.

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
- N+1 query pattern (`@OneToMany` accessed in loop without `JOIN FETCH`)
- `FetchType.EAGER` on `@OneToMany` / `@ManyToMany` (default-eager weakening)
- Entity returned from controller (entity-vs-DTO leakage; serialization triggers lazy-load LazyInitializationException)
- `@Transactional` not on service / handler but on repository (TX boundary anti-pattern)
- `@Modifying` query without `clearAutomatically = true` (stale persistence context)
- Native query with string-concat parameter (per `~/.claude/rules-library/sql/no-discards.md`)
- Long-running transaction (TX span > 5s — DB connection held; pool exhaustion)
- Generated SQL not reviewed via Hibernate SQL logging in dev
- Missing index on FK column (Postgres doesn't auto-index FKs — cascade-delete becomes Seq Scan)
- Optimistic locking (`@Version`) not used on concurrent-edit entities

**Refinement candidates**:
- New entity-relation pattern row when a new modeling shape recurs
- New cross-reference when a sister skill (postgres-patterns, database-migrations, springboot-patterns) adds a JPA gate
- Tightening of the fetch-strategy default when N+1 incidents recur
- New row in the indexing checklist per workload class (read-heavy vs write-heavy)
