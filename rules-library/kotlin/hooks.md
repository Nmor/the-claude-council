# Kotlin Hooks

> Auto-fires on every `*.kt`, `*.kts`, `build.gradle.kts`,
> `settings.gradle.kts` file. Sister to `~/.claude/rules/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_kt=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.kts?$' || true)

if [ -n "$staged_kt" ]; then
    ./gradlew ktlintCheck detekt --daemon
fi

if git diff --cached --name-only | grep -qE '(build\.gradle\.kts|settings\.gradle\.kts|gradle\.properties)$'; then
    ./gradlew dependencyCheckAnalyze --daemon
fi
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail
./gradlew test --daemon
```

## Gradle integration

`build.gradle.kts` (top-level):

```kotlin
plugins {
    id("org.jlleitschuh.gradle.ktlint") version "12.1.0"
    id("io.gitlab.arturbosch.detekt") version "1.23.6"
    id("org.owasp.dependencycheck") version "10.0.4"
    id("jacoco")
}

tasks.register("preCommit") {
    dependsOn("ktlintCheck", "detekt")
}

tasks.named("check") {
    dependsOn("preCommit")
}

ktlint {
    version.set("1.3.1")
    enableExperimentalRules.set(true)
}

detekt {
    config.setFrom(files("$rootDir/detekt-strict.yml"))
    buildUponDefaultConfig = true
    allRules = true
}

dependencyCheck {
    failBuildOnCVSS = 7.0f
    suppressionFile = "$rootDir/dependency-check-suppressions.xml"
}

jacoco {
    toolVersion = "0.8.12"
}

tasks.test {
    finalizedBy(tasks.jacocoTestReport)
    useJUnitPlatform()
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                counter = "LINE"
                minimum = "0.80".toBigDecimal()
            }
        }
    }
}
```

## CI workflow

```yaml
name: Kotlin CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-java@<sha>
        with:
          distribution: temurin
          java-version: '21'
      - uses: gradle/actions/setup-gradle@<sha>

      - run: ./gradlew ktlintCheck
      - run: ./gradlew detekt
      - run: ./gradlew test
      - run: ./gradlew jacocoTestCoverageVerification
      - run: ./gradlew dependencyCheckAnalyze -DfailBuildOnCVSS=7

      - uses: codecov/codecov-action@<sha>
        with:
          files: build/reports/jacoco/test/jacocoTestReport.xml
```

## Android-specific hooks

```yaml
# .github/workflows/android.yml
- name: Lint
  run: ./gradlew lintRelease

- name: Build
  run: ./gradlew assembleRelease

- name: Test
  run: ./gradlew testReleaseUnitTest

- name: Connected tests (if you have an emulator)
  uses: reactivecircus/android-emulator-runner@<sha>
  with:
    api-level: 34
    script: ./gradlew connectedReleaseAndroidTest
```

## Spring Boot-specific (server)

```bash
# In production CI, also run:
./gradlew bootBuildImage          # OCI image build
./gradlew nativeCompile             # GraalVM native if applicable
```

## Cross-references

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/kotlin/no-discards.md`
- `~/.claude/rules/kotlin/testing.md`
- ktlint docs (pinterest.github.io/ktlint)
- detekt docs (detekt.dev)
