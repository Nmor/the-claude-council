# C# / .NET — No-Discards Extension

> Auto-fires on every `*.cs`, `*.csx`, `*.cshtml`, `*.razor`,
> `*.csproj`, `*.sln` file. Extends `~/.claude/rules/common/no-discards.md`.
> Sister to `extreme-lint-policy.md`. Tooling: Roslyn analyzers,
> StyleCop, SonarAnalyzer.CSharp, `dotnet format`.

## Core Principle (C#-specific restatement)

**Every `Task` is awaited; every `IDisposable` lives in a `using`
statement; nullable reference types are enforced; `_ = expr`
discards require explicit justification; every `try/catch` filters
specific exceptions + preserves stack via `throw;` not `throw ex;`.**

## Banned patterns

### 1. Unawaited Tasks

```csharp
// FORBIDDEN — fire-and-forget loses exceptions
DoAsync();

// CORRECT
await DoAsync();

// OR with explicit fire-and-forget AND error handling:
_ = DoAsync().ContinueWith(
    t => _logger.LogWarning(t.Exception, "DoAsync failed"),
    TaskContinuationOptions.OnlyOnFaulted);
```

Analyzer: `CS4014` (await missing). ENFORCED.

### 2. `_ = expression` without justification

```csharp
// FORBIDDEN — discards return; if it's intentional, comment WHY
_ = service.DoWork();

// CORRECT
var result = service.DoWork();
if (!result.IsSuccess) {
    _logger.LogWarning("DoWork failed: {Error}", result.Error);
}
```

The C# `_` discard is sometimes necessary (out-parameters,
deconstruction); justify each usage in a comment OR delete.

### 3. Empty catch

```csharp
// FORBIDDEN
try { Thing(); } catch { }
try { Thing(); } catch (Exception) { }

// CORRECT — specific exception + log + rethrow with context
try {
    Thing();
} catch (IOException ex) {
    _logger.LogWarning(ex, "Thing failed: {Operation}", op);
    throw new ServiceException("Thing failed", ex);
}
```

### 4. `throw ex;` (loses stack)

```csharp
// FORBIDDEN — resets the stack trace
catch (Exception ex) {
    Log(ex);
    throw ex;
}

// CORRECT — preserves stack
catch (Exception ex) {
    _logger.LogError(ex, "operation failed");
    throw;
}

// OR wrap with `throw new ... (..., ex)`:
catch (Exception ex) {
    throw new ServiceException("op failed", ex);
}
```

### 5. `IDisposable` not in `using`

```csharp
// FORBIDDEN — leak on exception
var stream = File.Open(path, FileMode.Open);
var data = stream.Read();
stream.Dispose();

// CORRECT
using var stream = File.Open(path, FileMode.Open);
var data = stream.Read();
// disposal automatic at scope exit

// OR
await using var stream = ...;  // for IAsyncDisposable
```

### 6. Nullable reference types disabled

```csharp
// FORBIDDEN — opts out of null safety
#nullable disable

// CORRECT — enable globally in .csproj
<Nullable>enable</Nullable>
```

In code, narrow nullables explicitly:

```csharp
public string Display(User? user) {
    return user?.Name ?? "Anonymous";
    // or:
    if (user is null) return "Anonymous";
    return user.Name;
}
```

### 7. `string.Format` for SQL

```csharp
// FORBIDDEN — SQL injection
var sql = string.Format("SELECT * FROM users WHERE id = '{0}'", userId);

// CORRECT — parameterised
using var cmd = new SqlCommand("SELECT * FROM users WHERE id = @id", conn);
cmd.Parameters.AddWithValue("@id", userId);
```

### 8. `Result` not checked

```csharp
// FORBIDDEN — IActionResult-like type whose error path goes unhandled
var result = client.SendAsync(request);

// CORRECT
var result = await client.SendAsync(request);
result.EnsureSuccessStatusCode();  // throws on non-2xx
// or
if (!result.IsSuccessStatusCode) {
    _logger.LogWarning("Request failed: {Status}", result.StatusCode);
    return Result.Failure("request failed");
}
```

### 9. `Task.Result` / `Task.Wait()` (deadlocks)

```csharp
// FORBIDDEN — synchronous wait on async; deadlocks in UI / ASP.NET
var data = DoAsync().Result;
DoAsync().Wait();

// CORRECT — async all the way
var data = await DoAsync();
```

### 10. `#pragma warning disable` for non-trivial scope

```csharp
// FORBIDDEN
#pragma warning disable CS8602  // dereference possibly-null
return user.Name;

// CORRECT — fix the null check
if (user is null) throw new ArgumentNullException(nameof(user));
return user.Name;
```

## Required configuration

`.editorconfig`:

```ini
[*.cs]
# Analyzer + style
dotnet_diagnostic.CS4014.severity = error    # unawaited Task
dotnet_diagnostic.CS8602.severity = error    # nullable dereference
dotnet_diagnostic.CS8603.severity = error    # nullable return
dotnet_diagnostic.CA1062.severity = error    # validate args
dotnet_diagnostic.CA1822.severity = error    # mark static
dotnet_diagnostic.CA2007.severity = none     # ConfigureAwait — app-level decision
dotnet_diagnostic.CA2016.severity = error    # forward CancellationToken
```

`.csproj`:

```xml
<PropertyGroup>
  <TargetFramework>net9.0</TargetFramework>
  <Nullable>enable</Nullable>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <WarningsAsErrors />
  <AnalysisLevel>latest-all</AnalysisLevel>
  <AnalysisMode>All</AnalysisMode>
  <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  <CodeAnalysisTreatWarningsAsErrors>true</CodeAnalysisTreatWarningsAsErrors>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="SonarAnalyzer.CSharp" Version="..." PrivateAssets="all" />
  <PackageReference Include="StyleCop.Analyzers" Version="..." PrivateAssets="all" />
  <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="..." PrivateAssets="all" />
</ItemGroup>
```

## Verification block

```text
.NET build (this turn):
  - dotnet build /warnaserror: 0 warnings, 0 errors
  - dotnet format --verify-no-changes: clean
  - dotnet test --collect:"XPlat Code Coverage": PASS (92%)
  - SonarAnalyzer: 0 issues
```

## Cross-references

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- Microsoft Framework Design Guidelines
- .NET Coding Conventions

## Why this rule exists

C#'s `async/await` model makes unawaited tasks ergonomically
easy AND production-dangerous: the task runs, throws, and
nobody hears it. Combined with old-style `throw ex;` losing
stack traces, debugging async failures is a nightmare. The
Nullable Reference Types (NRT) feature shipped with C# 8
specifically to address null deref classes; opting out of NRT
in 2026 is a regression. The rules above enforce the modern
idioms.
