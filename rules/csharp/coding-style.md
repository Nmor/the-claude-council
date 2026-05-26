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
