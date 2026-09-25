---
paths:

- "**/*.go"
- "**/go.mod"
- "**/go.sum"

---

<!-- ============================================================
     Section: golang/security.md
     ============================================================ -->

# Go Security

> This file extends [common/security.md](../../../rules-library/common/security.md) with Go specific
> content.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Secret Management

```go
apiKey := os.Getenv("OPENAI_API_KEY")
if apiKey == "" {
    log.Fatal("OPENAI_API_KEY not configured")
}
```

## Security Scanning

- Use **gosec** for static security analysis:

  ```bash
  gosec ./...
  ```

## Context & Timeouts

Always use `context.Context` for timeout control:

```go
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
```

---
