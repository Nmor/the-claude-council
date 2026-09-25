# Cross-language Sonar coverage

> Covers the per-language equivalents of the same Sonar intents — Go (SonarGo / golangci-lint),
> Python (SonarPy / ruff), Java (SonarJava), C# (SonarC#), Swift (SwiftLint), Rust (clippy). Pointed
> at by the SKILL.md row "Cross-language Sonar coverage".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Cross-language Sonar coverage

The same intent shows up under different rule IDs per language. When
touching a file, run the equivalent linter and fix every finding. Treat
silent-failure rules as hard errors per `no-silent-failures.md`.

### Go (SonarGo / golangci-lint)

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| S1854 | Dead store | Delete. |
| S2068 | Hardcoded credential | Move to env / Secrets Manager. |
| S3776 | Cognitive complexity > 15 | Extract helpers. |
| errcheck | Unchecked error return | Bind + log + propagate. |
| errorlint | `err == io.EOF` instead of `errors.Is` | Use `errors.Is`. |
| ineffassign | Assignment never used | Delete. |

### Python (SonarPy / ruff)

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| BLE001 | Blind `except Exception:` | Catch specific type or rethrow with context. |
| S110 | `except: pass` | Log + rethrow. |
| TRY400 | `logging.error` inside except | Use `logging.exception` (captures stack). |
| S105 | Hardcoded password string | Move to env. |
| S5527 | Disabled SSL cert verification | Re-enable. |

### Java (SonarJava)

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| S108 | Empty method block | Throw or document. |
| S1166 | Caught exception not logged or rethrown | Log + wrap. |
| S2147 | Catching `Exception`/`Throwable` | Catch specific types. |
| S6437 | `Random` for security | Use `SecureRandom`. |

### C# (SonarC#)

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| S2486 | Empty catch block | Log + propagate. |
| S2823 | `volatile` not enough for thread safety | Use proper sync. |

### Swift (SwiftLint)

| Rule | Fix |
| ---- | --- |
| `empty_catch` | Log + rethrow. |
| `force_unwrapping` | Bind safely. |
| `force_try` | Use `do/catch`. |

### Rust (clippy)

| Rule | Fix |
| ---- | --- |
| `let_underscore_must_use` | Bind + handle. |
| `unwrap_used` (pedantic) | Use `?` or `expect("reason")`. |
