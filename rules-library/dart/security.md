---
paths:
  - "**/*.dart"
---

# Dart/Flutter Security

> Extends `common/security.md` with Dart/Flutter-specific security.

## Secure Storage

Use `flutter_secure_storage` for tokens and secrets. Never store in SharedPreferences.

## Network Security

- Use HTTPS only
- Pin certificates for sensitive APIs
- Validate all server responses with Codable/JSON serialization

## Input Validation

Validate all user input before API calls. Use form validators and sanitize HTML content.

## Platform Channels

Validate all data crossing platform channel boundaries. Never trust native-side input.
