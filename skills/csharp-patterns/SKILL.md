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

# csharp-patterns

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> Migrated 2026-06-02 from `~/.claude/rules-library/csharp/` as part of the lazy-rules-loading plan.
> Phase H will delete the source files.

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| csharp/coding-style (migrated rule) | [`references/csharp-coding-style.md`](references/csharp-coding-style.md) |
| csharp/hooks (migrated rule) | [`references/csharp-hooks.md`](references/csharp-hooks.md) |
| csharp/no-discards (migrated rule) | [`references/csharp-no-discards.md`](references/csharp-no-discards.md) |
| csharp/patterns (migrated rule) | [`references/csharp-patterns.md`](references/csharp-patterns.md) |
| csharp/security (migrated rule) | [`references/csharp-security.md`](references/csharp-security.md) |
| csharp/testing (migrated rule) | [`references/csharp-testing.md`](references/csharp-testing.md) |

## Standards Cited

- **ECMA-334** (ecma-international.org/publications-and-standards/standards/ecma-334) — C# Language
  Specification baseline
- **ECMA-335** Common Language Infrastructure (CLI) — runtime semantics
- **Microsoft .NET 8 Documentation** (learn.microsoft.com/dotnet) — Minimal APIs, IOptions, ILogger,
  HttpClientFactory, EF Core 8 patterns
- **OWASP ASVS 4.0.3 §5.1** — Input Validation (model binding + DataAnnotations)
- **OWASP ASVS 4.0.3 §8.3** — Sensitive Data Protection (Data Protection API patterns)
- **OWASP Top 10 A01:2021** Broken Access Control — `[Authorize]` + policy-based authorization
- **OWASP Top 10 A03:2021** Injection — parameterised queries (`FromSqlInterpolated` not
  `FromSqlRaw`)
- **CWE-89** SQL Injection — EF Core LINQ-to-SQL safety contract
- **CWE-352** Cross-Site Request Forgery — `[ValidateAntiForgeryToken]` discipline
- **Semantic Versioning 2.0** (semver.org) — NuGet package versioning
