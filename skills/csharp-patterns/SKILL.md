---
name: csharp-patterns
description: C# / .NET discipline — ASP.NET Core idioms, Minimal APIs / MVC controllers, async/await end-to-end (no .Result/.Wait()), records for value types, sealed types where inheritance unneeded, IOptions<T> for config, ILogger<T> structured logging, HttpClientFactory not new HttpClient(), EF Core async + AsNoTracking + projection patterns, IExceptionHandler for global errors, MediatR for CQRS. Auto-fires on C# / .NET project files.
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.cshtml"
  - "**/*.razor"
  - "**/*.csproj"
  - "**/*.sln"
  - "**/*.props"
  - "**/*.targets"
  - "global.json"
  - "Directory.Build.props"
---

> Migrated 2026-06-02 from `~/.claude/rules-library/csharp/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# csharp-patterns


<!-- ============================================================
     Section: csharp/coding-style.md
     ============================================================ -->

---
paths:
  - "**/*.cs"
  - "**/*.csproj"
  - "**/*.xaml"
---

# C# Coding Style

> Extends `common/coding-style.md` with C#-specific conventions.

## Naming Conventions

- Types/namespaces: `PascalCase`
- Public methods/properties: `PascalCase`
- Private fields: `_camelCase` with underscore prefix
- Local variables/parameters: `camelCase`
- Constants: `PascalCase` (not SCREAMING_SNAKE)
- Interfaces: `IPascalCase` (prefix with I)

## Immutability

Use `record` types and `readonly` properties. Prefer immutable data.

```csharp
// CORRECT: Immutable record
public record User(string Id, string Name, string Email)
{
    public User WithName(string newName) => this with { Name = newName };
}
```

## Error Handling

```csharp
try
{
    var result = await _userService.GetUserAsync(id, cancellationToken);
    return Ok(result);
}
catch (NotFoundException ex)
{
    _logger.LogWarning(ex, "User {UserId} not found", id);
    return NotFound(new { error = ex.Message });
}
catch (Exception ex)
{
    _logger.LogError(ex, "Failed to fetch user {UserId}", id);
    return StatusCode(500, new { error = "Internal server error" });
}
```

## Async Patterns

- Use `async/await` throughout; never `.Result` or `.Wait()`
- Accept `CancellationToken` on all async methods
- Use `ConfigureAwait(false)` in library code

## LINQ

- Prefer method syntax over query syntax for simple operations
- Use `var` for obvious types
- Chain LINQ operations for readability

---

<!-- ============================================================
     Section: csharp/hooks.md
     ============================================================ -->

# C# / .NET Hooks

> Auto-fires on every `*.cs`, `*.csx`, `*.csproj`, `*.sln`,
> `*.props`, `*.targets`, `global.json`, `Directory.Build.props`
> file. Sister to `~/.claude/rules-library/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_cs=$(git diff --cached --name-only --diff-filter=ACMR \
    | grep -E '\.(cs|csx)$' || true)
[ -z "$staged_cs" ] && exit 0

dotnet format --verify-no-changes --include "$staged_cs"
dotnet build /warnaserror /p:TreatWarningsAsErrors=true
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail
dotnet test --logger "console;verbosity=minimal" --collect:"XPlat Code Coverage"
```

## Directory.Build.props (strict baseline)

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <WarningsAsErrors />
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <AnalysisLevel>latest-all</AnalysisLevel>
    <AnalysisMode>All</AnalysisMode>
    <CodeAnalysisTreatWarningsAsErrors>true</CodeAnalysisTreatWarningsAsErrors>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);CS1591</NoWarn> <!-- missing XML doc on public — narrow exception -->
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="9.*" PrivateAssets="all" />
    <PackageReference Include="SonarAnalyzer.CSharp" Version="*" PrivateAssets="all" />
    <PackageReference Include="StyleCop.Analyzers" Version="*" PrivateAssets="all" />
    <PackageReference Include="Roslynator.Analyzers" Version="*" PrivateAssets="all" />
    <PackageReference Include="Roslynator.CodeAnalysis.Analyzers" Version="*" PrivateAssets="all" />
  </ItemGroup>
</Project>
```

## .editorconfig (strict)

```ini
root = true

[*.cs]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

# C# style
dotnet_style_qualification_for_field = false:warning
dotnet_style_qualification_for_property = false:warning
dotnet_style_qualification_for_method = false:warning
dotnet_style_qualification_for_event = false:warning

# Var
csharp_style_var_for_built_in_types = true:warning
csharp_style_var_when_type_is_apparent = true:warning
csharp_style_var_elsewhere = true:warning

# Expression-bodied members
csharp_style_expression_bodied_methods = when_on_single_line:warning
csharp_style_expression_bodied_properties = true:warning

# Strict diagnostics
dotnet_diagnostic.CS4014.severity = error    # unawaited Task
dotnet_diagnostic.CS8602.severity = error    # nullable dereference
dotnet_diagnostic.CS8603.severity = error    # nullable return
dotnet_diagnostic.CA1062.severity = error    # validate args
dotnet_diagnostic.CA1822.severity = error    # mark static
dotnet_diagnostic.CA2007.severity = none     # ConfigureAwait — app-level
dotnet_diagnostic.CA2016.severity = error    # forward CancellationToken
```

## CI workflow

```yaml
name: .NET CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-dotnet@<sha>
        with:
          dotnet-version: '9.0.x'

      - name: Restore
        run: dotnet restore

      - name: Format check
        run: dotnet format --verify-no-changes

      - name: Build
        run: dotnet build --no-restore --configuration Release /warnaserror

      - name: Test
        run: |
          dotnet test --no-build --configuration Release \
            --collect:"XPlat Code Coverage" \
            --results-directory ./TestResults \
            --logger "trx;LogFileName=test-results.trx"

      - name: Coverage gate
        run: |
          dotnet tool install -g dotnet-reportgenerator-globaltool
          reportgenerator \
            -reports:"./TestResults/**/coverage.cobertura.xml" \
            -targetdir:"./coverage-report" \
            -reporttypes:"HtmlInline_AzurePipelines;Cobertura;TextSummary"
          coverage=$(grep -oP 'Line coverage: \K[0-9.]+' coverage-report/Summary.txt)
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% < 80%"
            exit 1
          fi

      - name: Security scan
        run: dotnet list package --vulnerable --include-transitive | tee /tmp/vuln.log
        # Fail if any vulnerability listed
        # post-step: grep -q 'vulnerable' /tmp/vuln.log && exit 1 || true

      - uses: codecov/codecov-action@<sha>
        with: { directory: ./coverage-report }
```

## `global.json` (SDK pinning)

```json
{
  "sdk": {
    "version": "9.0.100",
    "rollForward": "patch",
    "allowPrerelease": false
  }
}
```

## NuGet config (lockfile mode)

```xml
<!-- All .csproj files: -->
<PropertyGroup>
  <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
  <RestoreLockedMode Condition="'$(ContinuousIntegrationBuild)' == 'true'">true</RestoreLockedMode>
</PropertyGroup>
```

CI sets `ContinuousIntegrationBuild=true` so `dotnet restore`
uses the lockfile strictly; lockfile drift fails the build.

## Banned package list

Maintain at `nuget-banned.txt` (audited via CODEOWNERS):

```
# Abandoned / replaced
Newtonsoft.Json          # prefer System.Text.Json
RestSharp                # prefer HttpClient + System.Text.Json
log4net                  # prefer Serilog / Microsoft.Extensions.Logging
Castle.Core              # prefer DispatchProxy when possible
```

`Directory.Packages.props` rejects banned packages:

```xml
<ItemGroup>
  <PackageReference Update="Newtonsoft.Json" Version="0.0.0" />
  <PackageVersion Update="Newtonsoft.Json" Version="0.0.0" />
</ItemGroup>
```

## Cross-references

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/csharp/no-discards.md`
- `~/.claude/rules-library/csharp/security.md`
- `~/.claude/rules-library/csharp/testing.md`
- .NET Code Style (Microsoft Learn)
- Roslynator (github.com/dotnet/roslynator)
- SonarAnalyzer.CSharp

---

<!-- ============================================================
     Section: csharp/no-discards.md
     ============================================================ -->

# C# / .NET — No-Discards Extension

> Auto-fires on every `*.cs`, `*.csx`, `*.cshtml`, `*.razor`,
> `*.csproj`, `*.sln` file. Extends `~/.claude/rules-library/common/no-discards.md`.
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

```
.NET build (this turn):
  - dotnet build /warnaserror: 0 warnings, 0 errors
  - dotnet format --verify-no-changes: clean
  - dotnet test --collect:"XPlat Code Coverage": PASS (92%)
  - SonarAnalyzer: 0 issues
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
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

---

<!-- ============================================================
     Section: csharp/patterns.md
     ============================================================ -->

# C# / .NET Patterns

> Auto-fires on every `*.cs`, `*.csx`, `*.csproj`, `*.sln` file.
> Standards: **.NET Framework Design Guidelines (Cwalina + Abrams)**,
> **C# Language Reference**, **Microsoft .NET application
> architecture guides**, **Effective C# (Wagner)**.

## Core Principle

**ASP.NET Core for web; Minimal APIs for small services, MVC /
Controllers for larger; `async`/`await` end-to-end (no `Result.GetAwaiter()`
mixing); records for value types; sealed types where inheritance
not needed; DI via the built-in `Microsoft.Extensions.DependencyInjection`;
`IOptions<T>` for config; `ILogger<T>` for logging;
`HttpClientFactory` not raw `new HttpClient()`.**

## Project layout

```
src/
├── MyApp.Domain/              # POCOs, value objects, domain logic
│   ├── Order.cs
│   └── Money.cs
├── MyApp.Application/         # Use cases / commands / queries (CQRS or vertical slice)
│   ├── Orders/
│   │   ├── PlaceOrder/
│   │   │   ├── PlaceOrderCommand.cs
│   │   │   ├── PlaceOrderHandler.cs
│   │   │   └── PlaceOrderValidator.cs
│   │   └── GetOrder/
│   └── Common/
├── MyApp.Infrastructure/      # EF Core, external clients
│   ├── Persistence/
│   └── External/
└── MyApp.Web/                 # ASP.NET Core entry
    ├── Program.cs
    └── Endpoints/
```

Domain depends on NOTHING. Application on Domain. Infrastructure
on both. Web on all three.

## Records for value types

```csharp
// Immutable value carrier
public record Money(long AmountCents, Currency Currency)
{
    public static Money Zero(Currency c) => new(0, c);

    public static Money operator +(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException("currency mismatch");
        return new Money(a.AmountCents + b.AmountCents, a.Currency);
    }
}

// `with` expression for non-destructive updates
var newOrder = order with { Status = OrderStatus.Paid };
```

## Sealed by default

```csharp
// CORRECT — sealed unless designed for inheritance
public sealed class OrderService
{
    // ...
}

// CORRECT — abstract base when polymorphism is the point
public abstract class Notification
{
    public abstract Task SendAsync(CancellationToken ct);
}
```

The .NET runtime can optimise sealed classes (devirtualisation).

## DI registration (Program.cs / Minimal API)

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<StripeOptions>()
    .Bind(builder.Configuration.GetSection("Stripe"))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
builder.Services.AddScoped<IPaymentClient, StripePaymentClient>();

builder.Services.AddHttpClient<StripePaymentClient>((sp, client) =>
{
    var opts = sp.GetRequiredService<IOptions<StripeOptions>>().Value;
    client.BaseAddress = new Uri(opts.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
})
.AddPolicyHandler(GetRetryPolicy());

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();
app.MapEndpoints();
app.Run();
```

## Minimal API endpoints

```csharp
public static class OrderEndpoints
{
    public static void MapEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");

        group.MapGet("/{id:guid}", GetOrder)
            .WithName(nameof(GetOrder));

        group.MapPost("/", PlaceOrder)
            .WithName(nameof(PlaceOrder));
    }

    private static async Task<Results<Ok<Order>, NotFound>> GetOrder(
        Guid id,
        IOrderRepository repo,
        CancellationToken ct)
    {
        var order = await repo.FindAsync(id, ct);
        return order is null ? TypedResults.NotFound() : TypedResults.Ok(order);
    }
}
```

## CQRS via MediatR (optional, but common)

```csharp
public record PlaceOrderCommand(Guid CustomerId, IReadOnlyList<LineItem> Items)
    : IRequest<Result<Order>>;

public class PlaceOrderHandler(
    IOrderRepository repo,
    IPaymentClient payment,
    ILogger<PlaceOrderHandler> log)
    : IRequestHandler<PlaceOrderCommand, Result<Order>>
{
    public async Task<Result<Order>> Handle(PlaceOrderCommand cmd, CancellationToken ct)
    {
        var order = Order.Create(cmd.CustomerId, cmd.Items);
        await repo.SaveAsync(order, ct);
        log.LogInformation("order placed: {OrderId}", order.Id);
        return order;
    }
}
```

## Async/await end-to-end

```csharp
// WRONG — blocks the thread (deadlock risk in UI / classic ASP.NET)
var data = service.GetAsync().Result;
service.WorkAsync().Wait();

// RIGHT
var data = await service.GetAsync();
await service.WorkAsync();

// CancellationToken propagation
public async Task<Order> GetAsync(Guid id, CancellationToken ct)
{
    return await _repo.FindAsync(id, ct);
}
```

## Error handling pattern

```csharp
// Result pattern — explicit success / failure
public sealed record Result<T>
{
    public bool IsSuccess { get; init; }
    public T? Value { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }

    public static Result<T> Success(T value) =>
        new() { IsSuccess = true, Value = value };
    public static Result<T> Failure(string code, string msg) =>
        new() { IsSuccess = false, ErrorCode = code, ErrorMessage = msg };
}

// Use IExceptionHandler (.NET 8+) for global errors at the boundary
public class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (status, code) = ex switch
        {
            ValidationException => (400, "validation_failed"),
            NotFoundException   => (404, "not_found"),
            UnauthorizedException => (401, "unauthorized"),
            _                   => (500, "internal_error"),
        };
        await Results.Problem(
            statusCode: status,
            title: code,
            detail: ex.Message).ExecuteAsync(ctx);
        return true;
    }
}
```

## EF Core idioms

```csharp
// Async + cancellation always
var orders = await _ctx.Orders
    .Where(o => o.CustomerId == customerId)
    .OrderByDescending(o => o.CreatedAt)
    .AsNoTracking()                 // read-only queries
    .Take(20)
    .ToListAsync(ct);

// Avoid N+1
var orders = await _ctx.Orders
    .Include(o => o.Items)
    .Include(o => o.Customer)
    .ToListAsync(ct);

// Projection (don't pull entire entity)
var summaries = await _ctx.Orders
    .Where(o => o.Status == OrderStatus.Paid)
    .Select(o => new OrderSummary(o.Id, o.Total, o.CreatedAt))
    .ToListAsync(ct);

// Compiled queries for hot paths
private static readonly Func<AppDbContext, Guid, Task<Order?>> _findOrder =
    EF.CompileAsyncQuery((AppDbContext ctx, Guid id) =>
        ctx.Orders.FirstOrDefault(o => o.Id == id));
```

## Reuse-first

| Use case | Library |
| --- | --- |
| HTTP client | `HttpClientFactory` (built-in) |
| Resilience (retry / circuit-breaker) | `Microsoft.Extensions.Http.Resilience` (Polly built-in) |
| Validation | FluentValidation |
| Mapping | Mapster, AutoMapper |
| Logging | Serilog (with structured sinks) |
| Metrics | OpenTelemetry.NET + Prometheus exporter |
| Testing | xUnit + FluentAssertions + Bogus + Testcontainers |
| JSON | `System.Text.Json` (built-in; prefer over Newtonsoft) |
| DB | EF Core, Dapper for raw |
| CLI | Spectre.Console.Cli, System.CommandLine |
| Background jobs | Hangfire, Quartz.NET, BackgroundService |

Per `~/.claude/rules-library/common/reuse-first.md`.

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/common/reuse-first.md`
- `~/.claude/rules-library/csharp/coding-style.md`
- `~/.claude/rules-library/csharp/no-discards.md`
- `~/.claude/rules-library/csharp/security.md`
- .NET Framework Design Guidelines
- ASP.NET Core architecture guide
- Effective C# (Bill Wagner)

---

<!-- ============================================================
     Section: csharp/security.md
     ============================================================ -->

---
paths:
  - "**/*.cs"
---

# C# Security

> Extends `common/security.md` with C#/.NET-specific security.

## SQL Injection

Always use parameterized queries or EF Core. Never concatenate SQL strings.

## Input Validation

Use DataAnnotations or FluentValidation. Validate at API boundaries.

## Authentication

Use ASP.NET Core Identity or JWT Bearer authentication. Never roll custom auth.

## Secrets

Use `IConfiguration` with User Secrets (dev) or Azure Key Vault / AWS Secrets Manager (prod). Never hardcode in source.

## CSRF

Enable anti-forgery tokens for MVC forms. API endpoints use bearer tokens (CSRF-immune).

---

<!-- ============================================================
     Section: csharp/testing.md
     ============================================================ -->

---
paths:
  - "**/*Tests.cs"
  - "**/*Test.cs"
  - "**/Tests/**/*.cs"
---

# C# Testing

> Extends `common/testing.md` with C#-specific testing conventions.

## Minimum Test Coverage: 70%

## Testing Frameworks

- Unit tests: xUnit (preferred) or NUnit
- Mocking: Moq or NSubstitute
- Assertions: FluentAssertions

```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepo = new();
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _sut = new UserService(_mockRepo.Object);
    }

    [Fact]
    public async Task GetUser_WithValidId_ReturnsUser()
    {
        // Arrange
        var expected = new User("1", "Alice", "alice@test.com");
        _mockRepo.Setup(r => r.GetByIdAsync("1", default))
                 .ReturnsAsync(expected);

        // Act
        var result = await _sut.GetUserAsync("1");

        // Assert
        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetUser_WithInvalidId_ThrowsNotFoundException()
    {
        _mockRepo.Setup(r => r.GetByIdAsync("bad", default))
                 .ReturnsAsync((User?)null);

        var act = () => _sut.GetUserAsync("bad");

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
```

---
