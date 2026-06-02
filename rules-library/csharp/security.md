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
