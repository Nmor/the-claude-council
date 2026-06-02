---
name: springboot-tdd
description: Test-driven development for Spring Boot using JUnit 5, Mockito, MockMvc, Testcontainers, and JaCoCo. Use when adding features, fixing bugs, or refactoring.
---

# Spring Boot TDD Workflow

TDD guidance for Spring Boot services with 70%+ coverage (unit + integration).

## When to Use

- New features or endpoints
- Bug fixes or refactors
- Adding data access logic or security rules

## Workflow

1) Write tests first (they should fail)
2) Implement minimal code to pass
3) Refactor with tests green
4) Enforce coverage (JaCoCo)

## Unit Tests (JUnit 5 + Mockito)

```java
@ExtendWith(MockitoExtension.class)
class MarketServiceTest {
  @Mock MarketRepository repo;
  @InjectMocks MarketService service;

  @Test
  void createsMarket() {
    CreateMarketRequest req = new CreateMarketRequest("name", "desc", Instant.now(), List.of("cat"));
    when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Market result = service.create(req);

    assertThat(result.name()).isEqualTo("name");
    verify(repo).save(any());
  }
}
```

Patterns:

- Arrange-Act-Assert
- Avoid partial mocks; prefer explicit stubbing
- Use `@ParameterizedTest` for variants

## Web Layer Tests (MockMvc)

```java
@WebMvcTest(MarketController.class)
class MarketControllerTest {
  @Autowired MockMvc mockMvc;
  @MockBean MarketService marketService;

  @Test
  void returnsMarkets() throws Exception {
    when(marketService.list(any())).thenReturn(Page.empty());

    mockMvc.perform(get("/api/markets"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray());
  }
}
```

## Integration Tests (SpringBootTest)

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MarketIntegrationTest {
  @Autowired MockMvc mockMvc;

  @Test
  void createsMarket() throws Exception {
    mockMvc.perform(post("/api/markets")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"name":"Test","description":"Desc","endDate":"2030-01-01T00:00:00Z","categories":["general"]}
        """))
      .andExpect(status().isCreated());
  }
}
```

## Persistence Tests (DataJpaTest)

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestContainersConfig.class)
class MarketRepositoryTest {
  @Autowired MarketRepository repo;

  @Test
  void savesAndFinds() {
    MarketEntity entity = new MarketEntity();
    entity.setName("Test");
    repo.save(entity);

    Optional<MarketEntity> found = repo.findByName("Test");
    assertThat(found).isPresent();
  }
}
```

## Testcontainers

- Use reusable containers for Postgres/Redis to mirror production
- Wire via `@DynamicPropertySource` to inject JDBC URLs into Spring context

## Coverage (JaCoCo)

Maven snippet:

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.14</version>
  <executions>
    <execution>
      <goals><goal>prepare-agent</goal></goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>verify</phase>
      <goals><goal>report</goal></goals>
    </execution>
  </executions>
</plugin>
```

## Assertions

- Prefer AssertJ (`assertThat`) for readability
- For JSON responses, use `jsonPath`
- For exceptions: `assertThatThrownBy(...)`

## Test Data Builders

```java
class MarketBuilder {
  private String name = "Test";
  MarketBuilder withName(String name) { this.name = name; return this; }
  Market build() { return new Market(null, name, MarketStatus.ACTIVE); }
}
```

## CI Commands

- Maven: `mvn -T 4 test` or `mvn verify`
- Gradle: `./gradlew test jacocoTestReport`

**Remember**: Keep tests fast, isolated, and deterministic. Test behavior, not implementation details.

## Purpose

Principal-level Spring Boot test methodology: slice tests over full-context loads, JUnit 5 + Mockito + AssertJ idioms, Testcontainers for integration, contract testing for inter-service, mutation testing for safety-critical paths.

**Negative scope** (NOT what this skill covers):

- Generic Java testing without Spring — see `java-coding-standards`
- Frontend Java/Selenium E2E — out of scope (use Playwright per `frontend-patterns`)
- Performance / load testing — see `observability-patterns`
- Build pipeline + coverage gates — see `springboot-verification`
- Architecture review of code under test — see `springboot-patterns`

## When NOT to use

- Non-Spring JVM projects (use plain JUnit 5 / Spock / TestNG)
- Reactive WebFlux at scale (StepVerifier patterns differ — defer to project-specific guidance)
- BDD-style requirement docs (use Cucumber / Spock per project decision)

## Standards Cited

- **JUnit 5 (Jupiter) User Guide** (`junit.org/junit5/docs/current/user-guide/`) — annotations, lifecycle, parameterised tests
- **Mockito 5 Reference** (`javadoc.io/doc/org.mockito/mockito-core`) — `MockitoExtension`, strictness, `@MockBean` vs `@Mock`
- **AssertJ Documentation** (`assertj.github.io/doc/`) — fluent assertions, `extracting`, `usingRecursiveComparison`
- **Testcontainers for Java** (`java.testcontainers.org`) — JUnit 5 extension, Postgres + Kafka + Redis modules
- **Spring Boot Testing Reference** (`docs.spring.io/spring-boot/reference/testing/`) — `@SpringBootTest`, `@WebMvcTest`, `@DataJpaTest` slices
- **Pact (Consumer-Driven Contracts) v3+** — contract tests
- **PIT Mutation Testing** (`pitest.org`) — mutation score baseline
- **JaCoCo 0.8.12+** — coverage instrumentation

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `@SpringBootTest` for every test | Full context load (5-30s) × N tests = unusable suite | Use `@WebMvcTest`, `@DataJpaTest`, `@JsonTest` slices; full context only for E2E |
| H2 in tests + Postgres in prod | Dialect drift; `JSONB`, partial indexes, RLS missing | Testcontainers Postgres; same image as prod |
| `@MockBean` everywhere | Each `@MockBean` invalidates the application context cache → suite slow | `@Mock` + `@InjectMocks` in slice tests; reserve `@MockBean` for genuine context-bean replacement |
| `Thread.sleep()` in async tests | Flaky; non-deterministic timing | Awaitility `await().atMost(...).until(...)` with conditions |
| Asserting on `getMessage()` of exceptions | Brittle to copy edits | Custom exception type + `instanceof` + assert on error_code field |
| Tests sharing state via static fields | Order-dependent failures | Each test gets fresh `@BeforeEach` setup; static state forbidden |
| Mocking value objects / DTOs | Adds nothing; the value object IS the data | Construct real instances; mock only collaborators (services, repos, clients) |
| `verify(mock, times(N))` without behaviour assertion | Tests internal call sequence, not behaviour | Assert on observable outcome (return value, persisted state, emitted event) |

## Verification Checklist

- [ ] Slice tests (`@WebMvcTest` / `@DataJpaTest` / `@JsonTest`) used where applicable
- [ ] Integration tests use Testcontainers with same image tag as production
- [ ] `@MockBean` count minimised (each one breaks context cache)
- [ ] No `Thread.sleep()` — Awaitility for async conditions
- [ ] Tests assert on observable behaviour, not internal calls
- [ ] Coverage ≥ 90% on touched files (per `extreme-lint-policy.md`)
- [ ] Mutation score ≥ 75% on critical paths (PIT)
- [ ] No order-dependence (run `mvn test -Dsurefire.runOrder=random` clean)
- [ ] Contract tests (Pact) gate producer deploy when inter-service API touched

## Cross-References

- `~/.claude/skills/springboot-patterns/SKILL.md` — code under test architecture
- `~/.claude/skills/springboot-security/SKILL.md` — security testing patterns
- `~/.claude/skills/springboot-verification/SKILL.md` — build + coverage gates
- `~/.claude/skills/jpa-patterns/SKILL.md` — repository testing
- `~/.claude/skills/tdd-workflow/SKILL.md` — RED-GREEN-REFACTOR methodology
- `~/.claude/rules-library/common/testing.md` — coverage thresholds
- `~/.claude/rules-library/common/no-ambient-globals.md` — Clock / RNG injection for determinism
- `~/.claude/agents/tdd-guide.md` — test-first delegate

## Why this skill exists

Spring Boot test suites become unusable through two predictable failures: `@SpringBootTest` everywhere (5-30s × thousands of tests = 30-minute CI), and H2-substituted-for-Postgres (passes locally, breaks on the JSONB query in prod). Slice tests + Testcontainers + Awaitility + minimal `@MockBean` keeps the suite fast AND faithful to production. The cost is one test-class-design decision; the benefit is a CI that finishes in 5 minutes instead of 50.

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

- `@SpringBootTest` used when a slice test (`@WebMvcTest`, `@DataJpaTest`) would suffice (slow-test suite balloon)
- Mockito mocks on `@Service` from a `@WebMvcTest` instead of using `@MockBean` correctly
- `@Transactional` test rolling back when test asserts on committed state (false-positive pass)
- Testcontainers absent for DB-touching integration tests (H2 substitute — false-positive pass)
- `@DirtiesContext` overused (kills Spring context cache; test runtime balloon)
- `Thread.sleep` in tests instead of Awaitility's polling assertion (flaky test)
- Coverage gate via Jacoco missing threshold enforcement
- Test data builders absent — tests duplicate setup verbatim (DRY weakening)

**Refinement candidates**:

- New slice-test row when a new Spring Boot test annotation ships
- New cross-reference when a sister skill (springboot-patterns, jpa-patterns, tdd-workflow) adds a Spring-test gate
- New Testcontainers template per service (Postgres, Kafka, Redis, Localstack)
- Tightening of the coverage threshold when project-wide coverage rises naturally
