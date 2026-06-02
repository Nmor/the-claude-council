---
name: springboot-verification
description: "Verification loop for Spring Boot projects: build, static analysis, tests with coverage, security scans, and diff review before release or PR."
---

# Spring Boot Verification Loop

Run before PRs, after major changes, and pre-deploy.

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

Principal-level Spring Boot build + verification: Maven / Gradle gate orchestration, dependency CVE scan, license allowlist, code coverage thresholds, mutation testing, OWASP Dependency-Check, Docker image hardening, deploy gates.

**Negative scope** (NOT what this skill covers):

- Code-level patterns — see `springboot-patterns`
- Security configuration — see `springboot-security`
- Test methodology — see `springboot-tdd`
- JPA entity modelling — see `jpa-patterns`
- Generic dependency-pinning policy — see `dependency-pinning.md`

## When NOT to use

- Non-Spring JVM projects (use language-specific verification skills)
- Native-image GraalVM workflows that bypass standard Maven/Gradle gates (defer to project-specific guidance)

## Standards Cited

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
| `mvn install -DskipTests` in CI | Defeats the purpose of CI | Tests gate the build; never skip |
| `mvn test` without `verify` phase | Skips integration tests + plugins that bind to `verify` | `mvn verify` runs the full lifecycle |
| Coverage threshold = 50% to "make it pass" | Coverage debt accumulates; no early signal | 90% touched-file / 80% project per `extreme-lint-policy.md` |
| `--no-snapshot-updates` on every CI run | Stale snapshot dependencies; reproducibility theatre | Lock dependency versions; `mvn versions:lock-snapshots` if absolutely needed |
| Suppressing OWASP-Dependency-Check findings without expiry | Permanent exception drift | `suppressions.xml` with `<until>` date; re-evaluate on expiry |
| Docker `FROM openjdk:latest` | Floating tag; CVE accumulation | `FROM eclipse-temurin:21.0.5_11-jre-alpine@sha256:...` (digest-pinned) |
| Gradle `dependencyResolutionManagement` without lockfile | Resolution differs between dev / CI / prod | `gradle.lockfile` committed |
| Plugins in `pom.xml` without `<version>` | Spring-Boot-parent overrides; behaviour shifts on Spring upgrade | Explicit version pin per plugin |

## Verification Checklist

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

- `~/.claude/skills/springboot-patterns/SKILL.md`
- `~/.claude/skills/springboot-security/SKILL.md`
- `~/.claude/skills/springboot-tdd/SKILL.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/common/license-allowlist-gate.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules/common/done-criteria.md`
- `~/.claude/agents/code-reviewer.md`

## Why this skill exists

A Spring Boot app that passes `mvn test` can still ship CVE-laden dependencies, MIT-incompatible transitive licenses, and unsigned Docker images. The verification pipeline closes those gaps mechanically: CVE scan blocks MODERATE+, license gate blocks GPL/AGPL, mutation score keeps tests honest, digest-pinned images block supply-chain substitution, SBOM enables downstream audit. The cost is a one-time pipeline build; the benefit is shipping software you can actually defend in a security review.

## Learning hooks

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
