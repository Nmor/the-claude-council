# Java — No-Discards Extension

> Auto-fires on every `*.java` file. Extends
> `~/.claude/rules/common/no-discards.md`. Tooling: ErrorProne,
> SpotBugs, PMD, Checkstyle, NullAway, SonarJava.

## Core Principle

**Every checked exception is handled or declared; every `Future`
is `.get()`-ed or composed; every `try-with-resources` wraps an
AutoCloseable; nullability is annotated and verified by NullAway;
ignored return values are flagged by `@CheckReturnValue` +
ErrorProne; no `e.printStackTrace()`.**

## Banned patterns

### 1. Empty catch

```java
// FORBIDDEN
try { thing(); } catch (Exception e) { }

// CORRECT
try {
    thing();
} catch (IOException e) {
    log.warn("thing failed", e);
    throw new ServiceException("thing failed", e);
}
```

SpotBugs: `DE_MIGHT_IGNORE`. PMD: `EmptyCatchBlock`.

### 2. `e.printStackTrace()` in production

```java
// FORBIDDEN
} catch (Exception e) {
    e.printStackTrace();
}

// CORRECT
} catch (Exception e) {
    log.error("operation failed", e);
    throw new ServiceException("operation failed", e);
}
```

### 3. Catching `Throwable` / `Error`

```java
// FORBIDDEN — Error includes OutOfMemoryError, StackOverflowError; let JVM die
try { thing(); } catch (Throwable t) { ... }

// CORRECT — catch specific exception types
try { thing(); } catch (IOException | TimeoutException e) { ... }
```

### 4. Bare `throw new RuntimeException(...)`

```java
// FORBIDDEN — generic; no specificity
throw new RuntimeException("user not found");

// CORRECT — specific
throw new UserNotFoundException(userId);
```

### 5. Resource not in try-with-resources

```java
// FORBIDDEN — leak on exception
InputStream in = new FileInputStream(path);
return in.read();  // no close

// CORRECT
try (InputStream in = new FileInputStream(path)) {
    return in.read();
}
```

SpotBugs: `RR_NOT_CHECKED`. PMD: `CloseResource`.

### 6. Returning `null` from collection-returning methods

```java
// FORBIDDEN — caller must null-check; ergonomic disaster
public List<Order> findOrders(...) {
    if (notFound) return null;
    return list;
}

// CORRECT — return empty collection
public List<Order> findOrders(...) {
    if (notFound) return List.of();
    return list;
}
```

### 7. Mutable static state

```java
// FORBIDDEN
public class Cache {
    public static final Map<String, User> USERS = new HashMap<>();
}

// CORRECT — encapsulated, concurrent-safe
public class UserCache {
    private final Map<String, User> users = new ConcurrentHashMap<>();
    // ... DI-injected, scoped lifecycle
}
```

Per `~/.claude/rules/common/no-ambient-globals.md`.

### 8. `==` for object comparison

```java
// FORBIDDEN — reference equality
if (a == b) ...
if (status == Status.ACTIVE) ...  // enum is OK; String is NOT

// CORRECT
if (Objects.equals(a, b)) ...
if ("active".equals(status)) ...
if (status == Status.ACTIVE) ...  // enum — OK
```

### 9. `Optional.get()` without `isPresent()` check

```java
// FORBIDDEN
return findUser(id).get();   // throws NoSuchElementException if empty

// CORRECT
return findUser(id).orElseThrow(() ->
    new UserNotFoundException(id));

// OR
return findUser(id)
    .map(this::process)
    .orElse(defaultValue);
```

### 10. `String.format` for SQL

Per `~/.claude/rules/java/security.md` § A03.

### 11. `Date` / `Calendar` (legacy)

```java
// FORBIDDEN — mutable, not thread-safe
Date now = new Date();
SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");

// CORRECT — java.time
Instant now = Instant.now();
LocalDate today = LocalDate.now();
DateTimeFormatter fmt = DateTimeFormatter.ISO_DATE;
```

### 12. `@SuppressWarnings("unchecked")` without justification

```java
// FORBIDDEN — silences without fixing
@SuppressWarnings("unchecked")
List<User> users = (List<User>) raw;

// CORRECT — fix the type
List<User> users = repo.findAll();  // properly typed all the way
```

### 13. `synchronized` on `this` / class literal

```java
// FORBIDDEN — exposes lock; external code can lock it
public synchronized void operation() { ... }

// CORRECT — private lock object
private final Object lock = new Object();
public void operation() {
    synchronized (lock) { ... }
}

// BETTER — prefer java.util.concurrent
private final ReentrantLock lock = new ReentrantLock();
```

### 14. `Thread.sleep()` in tests / production logic

```java
// FORBIDDEN — flaky
Thread.sleep(1000);
assertTrue(condition);

// CORRECT — Awaitility
await().atMost(5, SECONDS).until(() -> condition);
```

### 15. Discarded `Future` / `CompletableFuture`

```java
// FORBIDDEN
executor.submit(() -> doWork());

// CORRECT
CompletableFuture<Void> future = CompletableFuture
    .runAsync(this::doWork, executor)
    .exceptionally(t -> {
        log.error("doWork failed", t);
        return null;
    });
// Hold the future + .join() at appropriate point
```

ErrorProne: `FutureReturnValueIgnored`.

## Required tooling

```xml
<!-- ErrorProne in Maven -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <compilerArgs>
            <arg>-XDcompilePolicy=simple</arg>
            <arg>-Xplugin:ErrorProne -Xep:NullAway:ERROR -XepOpt:NullAway:AnnotatedPackages=com.example</arg>
        </compilerArgs>
        <annotationProcessorPaths>
            <path>
                <groupId>com.google.errorprone</groupId>
                <artifactId>error_prone_core</artifactId>
            </path>
            <path>
                <groupId>com.uber.nullaway</groupId>
                <artifactId>nullaway</artifactId>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>

<!-- SpotBugs + FindSecBugs -->
<plugin>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs-maven-plugin</artifactId>
    <configuration>
        <effort>Max</effort>
        <threshold>Low</threshold>
        <failOnError>true</failOnError>
        <plugins>
            <plugin>
                <groupId>com.h3xstream.findsecbugs</groupId>
                <artifactId>findsecbugs-plugin</artifactId>
            </plugin>
        </plugins>
    </configuration>
</plugin>
```

## Verification block

```text
Java build (this turn):
  - mvn verify: 0 warnings, 0 errors
  - ErrorProne (with NullAway): 0 issues
  - SpotBugs (Max effort): 0 bugs
  - PMD: 0 violations
  - Checkstyle: 0 violations
  - JaCoCo coverage: 92% line / 85% branch
  - SonarJava: 0 issues
```

## Cross-references

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- `~/.claude/rules/common/error-handling-with-context.md`
- `~/.claude/rules/java/coding-style.md`
- `~/.claude/rules/java/security.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
