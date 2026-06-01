# Java Hooks

> Auto-fires on every `*.java`, `pom.xml`, `build.gradle`,
> `build.gradle.kts` file. Sister to `~/.claude/rules/common/hooks.md`.

## Pre-commit / pre-push gates (mandatory)

Every Java repo's `.githooks/pre-commit` (or `pre-push`) runs:

```bash
#!/usr/bin/env bash
set -euo pipefail

mvn -B -q -Dgib.enabled=true \
    verify \
    spotbugs:check \
    pmd:check \
    checkstyle:check \
    dependency-check:check
```

Same gates run in CI; CI is the authoritative checkpoint.

## Maven lifecycle integration

Pin gates into `mvn verify` (so `mvn install` triggers them):

```xml
<plugin>
    <artifactId>maven-enforcer-plugin</artifactId>
    <executions>
        <execution>
            <id>enforce-versions</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <requireMavenVersion><version>[3.9.0,)</version></requireMavenVersion>
                    <requireJavaVersion><version>[21,)</version></requireJavaVersion>
                    <bannedDependencies>
                        <excludes>
                            <exclude>commons-logging:commons-logging</exclude>
                            <exclude>log4j:log4j:[1.0,2.0)</exclude>
                        </excludes>
                    </bannedDependencies>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

## Gradle equivalent

```kotlin
tasks.register("preCommit") {
    dependsOn("check", "spotbugsMain", "pmdMain", "dependencyCheckAnalyze")
}

tasks.named("build") {
    dependsOn("preCommit")
}
```

## CI workflow shape

```yaml
- name: Setup JDK
  uses: actions/setup-java@<sha>
  with:
    distribution: temurin
    java-version: 21
    cache: maven

- name: Build + verify
  run: mvn -B verify

- name: Coverage gate (JaCoCo)
  run: mvn -B jacoco:check

- name: Security scan
  run: |
    mvn org.owasp:dependency-check-maven:check \
      -DfailBuildOnCVSS=7

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@<sha>
```

## Cross-references

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/java/no-discards.md`
- `~/.claude/rules/java/testing.md`
