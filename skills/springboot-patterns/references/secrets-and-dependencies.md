# Secrets, Dependencies and PII

> Covers externalising credentials, CVE gates and keeping PII out of logs. Pointed at by the
> "Secrets + dependencies" row in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Secrets Management

- No secrets in source; load from env or vault
- Keep `application.yml` free of credentials; use placeholders
- Rotate tokens and DB credentials regularly

```yaml
# BAD: Hardcoded in application.yml
spring:
  datasource:
    password: mySecretPassword123

# GOOD: Environment variable placeholder
spring:
  datasource:
    password: ${DB_PASSWORD}

# GOOD: Spring Cloud Vault integration
spring:
  cloud:
    vault:
      uri: https://vault.example.com
      token: ${VAULT_TOKEN}
```

## Dependency Security

- Run OWASP Dependency Check / Snyk in CI
- Keep Spring Boot and Spring Security on supported versions
- Fail builds on known CVEs

## Logging and PII

- Never log secrets, tokens, passwords, or full PAN data
- Redact sensitive fields; use structured JSON logging
