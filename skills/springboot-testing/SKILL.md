---
name: springboot-testing
description: Spring Boot testing discipline — TDD workflow with JUnit 5, @SpringBootTest slicing (@WebMvcTest, @DataJpaTest), MockMvc, Testcontainers, and the verification gates a Spring Boot change must pass before it ships (build, coverage floor, static analysis, integration checks). Use when writing Spring Boot tests or verifying a Spring Boot change is done.
paths:
  - "**/*Test.java"
  - "**/*Tests.java"
  - "**/*IT.java"
  - "**/*ITCase.java"
  - "**/src/test/**/*.java"
  - "**/src/test/**/*.kt"
  - "**/*Test.kt"
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

## When to Activate

- Before opening a pull request for a Spring Boot service
- After major refactoring or dependency upgrades
- Pre-deployment verification for staging or production
- Running full build → lint → test → security scan pipeline
- Validating test coverage meets thresholds

## Phase 1: Build

```bash
mvn -T 4 clean verify -DskipTests
# or
./gradlew clean assemble -x test
```

If build fails, stop and fix.

## Phase 2: Static Analysis

Maven (common plugins):

```bash
mvn -T 4 spotbugs:check pmd:check checkstyle:check
```

Gradle (if configured):

```bash
./gradlew checkstyleMain pmdMain spotbugsMain
```

## Phase 3: Tests + Coverage

```bash
mvn -T 4 test
mvn jacoco:report   # verify 70%+ coverage
# or
./gradlew test jacocoTestReport
```

Report:

- Total tests, passed/failed
- Coverage % (lines/branches)

### Unit Tests

Test service logic in isolation with mocked dependencies:

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private UserRepository userRepository;
  @InjectMocks private UserService userService;

  @Test
  void createUser_validInput_returnsUser() {
    var dto = new CreateUserDto("Alice", "alice@example.com");
    var expected = new User(1L, "Alice", "alice@example.com");
    when(userRepository.save(any(User.class))).thenReturn(expected);

    var result = userService.create(dto);

    assertThat(result.name()).isEqualTo("Alice");
    verify(userRepository).save(any(User.class));
  }

  @Test
  void createUser_duplicateEmail_throwsException() {
    var dto = new CreateUserDto("Alice", "existing@example.com");
    when(userRepository.existsByEmail(dto.email())).thenReturn(true);

    assertThatThrownBy(() -> userService.create(dto))
        .isInstanceOf(DuplicateEmailException.class);
  }
}
```

### Integration Tests with Testcontainers

Test against a real database instead of H2:

```java
@SpringBootTest
@Testcontainers
class UserRepositoryIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
      .withDatabaseName("testdb");

  @DynamicPropertySource
  static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  @Autowired private UserRepository userRepository;

  @Test
  void findByEmail_existingUser_returnsUser() {
    userRepository.save(new User("Alice", "alice@example.com"));

    var found = userRepository.findByEmail("alice@example.com");

    assertThat(found).isPresent();
    assertThat(found.get().getName()).isEqualTo("Alice");
  }
}
```

### API Tests with MockMvc

Test controller layer with full Spring context:

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

  @Autowired private MockMvc mockMvc;
  @MockBean private UserService userService;

  @Test
  void createUser_validInput_returns201() throws Exception {
    var user = new UserDto(1L, "Alice", "alice@example.com");
    when(userService.create(any())).thenReturn(user);

    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Alice", "email": "alice@example.com"}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Alice"));
  }

  @Test
  void createUser_invalidEmail_returns400() throws Exception {
    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Alice", "email": "not-an-email"}
                """))
        .andExpect(status().isBadRequest());
  }
}
```

## Phase 4: Security Scan

```bash
# Dependency CVEs
mvn org.owasp:dependency-check-maven:check
# or
./gradlew dependencyCheckAnalyze

# Secrets in source
grep -rn "password\s*=\s*\"" src/ --include="*.java" --include="*.yml" --include="*.properties"
grep -rn "sk-\|api_key\|secret" src/ --include="*.java" --include="*.yml"

# Secrets (git history)
git secrets --scan  # if configured
```

### Common Security Findings

```text
# Check for System.out.println (use logger instead)
grep -rn "System\.out\.print" src/main/ --include="*.java"

# Check for raw exception messages in responses
grep -rn "e\.getMessage()" src/main/ --include="*.java"

# Check for wildcard CORS
grep -rn "allowedOrigins.*\*" src/main/ --include="*.java"
```

## Phase 5: Lint/Format (optional gate)

```bash
mvn spotless:apply   # if using Spotless plugin
./gradlew spotlessApply
```

## Phase 6: Diff Review

```bash
git diff --stat
git diff
```

Checklist:

- No debugging logs left (`System.out`, `log.debug` without guards)
- Meaningful errors and HTTP statuses
- Transactions and validation present where needed
- Config changes documented

## Output Template

```text
VERIFICATION REPORT
===================
Build:     [PASS/FAIL]
Static:    [PASS/FAIL] (spotbugs/pmd/checkstyle)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (CVE findings: N)
Diff:      [X files changed]

Overall:   [READY / NOT READY]

Issues to Fix:
1. ...
2. ...
```

## Continuous Mode

- Re-run phases on significant changes or every 30–60 minutes in long sessions
- Keep a short loop: `mvn -T 4 test` + spotbugs for quick feedback

**Remember**: Fast feedback beats late surprises. Keep the gate strict—treat warnings as defects in production systems.

## Purpose

Principal-level Spring Boot test methodology: slice tests over full-context loads, JUnit 5 + Mockito + AssertJ idioms, Testcontainers for integration, contract testing for inter-service, mutation testing for safety-critical paths.

**Negative scope** (NOT what this skill covers):

- Generic Java testing without Spring — see `java-coding-standards`
- Frontend Java/Selenium E2E — out of scope (use Playwright per `frontend-patterns`)
- Performance / load testing — see `observability-patterns`
- Build pipeline + coverage gates — see `springboot-testing`
- Architecture review of code under test — see `springboot-patterns`

Principal-level Spring Boot build + verification: Maven / Gradle gate orchestration, dependency CVE scan, license allowlist, code coverage thresholds, mutation testing, OWASP Dependency-Check, Docker image hardening, deploy gates.

**Negative scope** (NOT what this skill covers):

- Code-level patterns — see `springboot-patterns`
- Security configuration — see `springboot-patterns`
- Test methodology — see `springboot-testing`
- JPA entity modelling — see `jpa-patterns`
- Generic dependency-pinning policy — see `dependency-pinning.md`

## When NOT to use

- Non-Spring JVM projects (use plain JUnit 5 / Spock / TestNG)
- Reactive WebFlux at scale (StepVerifier patterns differ — defer to project-specific guidance)
- BDD-style requirement docs (use Cucumber / Spock per project decision)

- Non-Spring JVM projects (use language-specific verification skills)
- Native-image GraalVM workflows that bypass standard Maven/Gradle gates (defer to project-specific guidance)

## Standards Cited

- **JUnit 5 (Jupiter) User Guide** (`junit.org/junit5/docs/current/user-guide/`) — annotations, lifecycle, parameterised tests
- **Mockito 5 Reference** (`javadoc.io/doc/org.mockito/mockito-core`) — `MockitoExtension`, strictness, `@MockBean` vs `@Mock`
- **AssertJ Documentation** (`assertj.github.io/doc/`) — fluent assertions, `extracting`, `usingRecursiveComparison`
- **Testcontainers for Java** (`java.testcontainers.org`) — JUnit 5 extension, Postgres + Kafka + Redis modules
- **Spring Boot Testing Reference** (`docs.spring.io/spring-boot/reference/testing/`) — `@SpringBootTest`, `@WebMvcTest`, `@DataJpaTest` slices
- **Pact (Consumer-Driven Contracts) v3+** — contract tests
- **PIT Mutation Testing** (`pitest.org`) — mutation score baseline
- **JaCoCo 0.8.12+** — coverage instrumentation

- **Maven Reference** (`maven.apache.org/ref`) — lifecycle phases, plugin binding
- **Gradle 8.x Reference** (`docs.gradle.org/current/userguide`) — task graph, dependency resolution
- **JaCoCo 0.8.12+ Manual** (`jacoco.org/jacoco/trunk/doc/`) — coverage instrumentation + check rule
- **SpotBugs 4.8+** + **FindSecBugs** — static analysis
- **PIT Mutation Testing** (`pitest.org`) — mutation score
- **OWASP Dependency-Check 10.x** — CVE scan
- **OSV-Scanner** (`google.github.io/osv-scanner`) — cross-ecosystem CVE
- **CycloneDX 1.6 / SPDX 2.3** — SBOM formats
- **SLSA Framework 1.0** — build provenance

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

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `mvn install -DskipTests` in CI | Defeats the purpose of CI | Tests gate the build; never skip |
| `mvn test` without `verify` phase | Skips integration tests + plugins that bind to `verify` | `mvn verify` runs the full lifecycle |
| Coverage threshold = 50% to "make it pass" | Coverage debt accumulates; no early signal | 90% touched-file / 80% project per `extreme-lint-policy.md` |
| `--no-snapshot-updates` on every CI run | Stale snapshot dependencies; reproducibility theatre | Lock dependency versions; `mvn versions:lock-snapshots` if absolutely needed |
| Suppressing OWASP-Dependency-Check findings without expiry | Permanent exception drift | `suppressions.xml` with `<until>` date; re-evaluate on expiry |
| Docker `FROM openjdk:latest` | Floating tag; CVE accumulation | `FROM eclipse-temurin:21.0.5_11-jre-alpine@sha256:...` (digest-pinned) |
| Gradle `dependencyResolutionManagement` without lockfile | Resolution differs between dev / CI / prod | `gradle.lockfile` committed |
| Plugins in `pom.xml` without `<version>` | Spring-Boot-parent overrides; behaviour shifts on Spring upgrade | Explicit version pin per plugin |

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

- [ ] CI runs `mvn verify` (full lifecycle, not just `test`)
- [ ] JaCoCo coverage rule enforces 80% line + 75% branch project-wide
- [ ] SpotBugs + FindSecBugs run on every build; findings = build failure
- [ ] OWASP Dependency-Check (or OSV-Scanner) on every PR; MODERATE+ blocks
- [ ] SBOM generated (CycloneDX) and uploaded to deploy artifact
- [ ] Container image is digest-pinned base + multi-stage build
- [ ] `mvn versions:display-dependency-updates` reviewed quarterly
- [ ] Build produces SLSA Level 2+ provenance
- [ ] Lockfile (`gradle.lockfile` / `pom.xml` with explicit versions) committed

## Cross-References

- `~/.claude/skills/springboot-patterns/SKILL.md` — code under test architecture
- `~/.claude/skills/springboot-patterns/SKILL.md` — security testing patterns
- `~/.claude/skills/springboot-testing/SKILL.md` — build + coverage gates
- `~/.claude/skills/jpa-patterns/SKILL.md` — repository testing
- `~/.claude/skills/tdd-workflow/SKILL.md` — RED-GREEN-REFACTOR methodology
- `~/.claude/rules-library/common/testing.md` — coverage thresholds
- `~/.claude/rules-library/common/no-ambient-globals.md` — Clock / RNG injection for determinism
- `~/.claude/agents/tdd-guide.md` — test-first delegate

- `~/.claude/skills/springboot-patterns/SKILL.md`
- `~/.claude/skills/springboot-patterns/SKILL.md`
- `~/.claude/skills/springboot-testing/SKILL.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/common/license-allowlist-gate.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules/common/done-criteria.md`
- `~/.claude/agents/code-reviewer.md`

## Why this skill exists

Spring Boot test suites become unusable through two predictable failures: `@SpringBootTest` everywhere (5-30s × thousands of tests = 30-minute CI), and H2-substituted-for-Postgres (passes locally, breaks on the JSONB query in prod). Slice tests + Testcontainers + Awaitility + minimal `@MockBean` keeps the suite fast AND faithful to production. The cost is one test-class-design decision; the benefit is a CI that finishes in 5 minutes instead of 50.

A Spring Boot app that passes `mvn test` can still ship CVE-laden dependencies, MIT-incompatible transitive licenses, and unsigned Docker images. The verification pipeline closes those gaps mechanically: CVE scan blocks MODERATE+, license gate blocks GPL/AGPL, mutation score keeps tests honest, digest-pinned images block supply-chain substitution, SBOM enables downstream audit. The cost is a one-time pipeline build; the benefit is shipping software you can actually defend in a security review.

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

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `mvn verify` succeeds while spotbugs / pmd / checkstyle warnings ignored (gate-strictness weakening)
- `dependency-check-maven` / OWASP Dependency-Check disabled or set to non-blocking (per `~/.claude/rules-library/common/dependency-vulnerabilities.md`)
- Jacoco coverage gate set below `extreme-lint-policy.md` thresholds
- `@SpringBootApplication` startup fails in CI but passes locally (env-config drift)
- Native-image / GraalVM build broken without prod plan to ship native
- Test profile pulling production secrets (test-isolation weakening)
- New module added without entry in build verification matrix

**Refinement candidates**:

- New verification step when a new Spring Boot tooling lands (e.g., `spring-boot-buildpacks` rotation)
- New cross-reference when a sister rule (deploy-failures-become-checks, done-criteria) adds a Java gate
- Tightening of the warnings-as-errors policy when a recurring escape surfaces
- New CI matrix row when a new JDK LTS becomes the target
