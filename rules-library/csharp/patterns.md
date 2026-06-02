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

```text
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

Per `~/.claude/rules/common/reuse-first.md`.

## Cross-references

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/common/reuse-first.md`
- `~/.claude/rules/csharp/coding-style.md`
- `~/.claude/rules/csharp/no-discards.md`
- `~/.claude/rules/csharp/security.md`
- .NET Framework Design Guidelines
- ASP.NET Core architecture guide
- Effective C# (Bill Wagner)
