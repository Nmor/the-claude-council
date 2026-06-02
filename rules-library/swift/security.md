---
paths:
  - "**/*.swift"
---

# Swift Security

> Extends `common/security.md` with Swift/iOS-specific security.

## Keychain for Secrets

Never store tokens/passwords in UserDefaults. Use Keychain Services.

## App Transport Security

Never disable ATS globally. Use per-domain exceptions only when absolutely necessary.

## Input Validation

Validate all user input and external data before processing. Use `Codable` with strict validation.

## Biometric Auth

Use `LAContext` with proper error handling. Always provide a passcode fallback.
