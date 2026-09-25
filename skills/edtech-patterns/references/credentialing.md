# edtech-patterns: Credentialing

> Open Badges 3.0 as a W3C Verifiable Credential rather than a baked image. Pointed at by the
> SKILL.md row "Pattern 9".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 9: Open Badges 3.0 — Verifiable Credentials, not images

Open Badges 2.0 baked a badge into a PNG/SVG via image
metadata. Open Badges 3.0 is a W3C Verifiable Credential —
JSON-LD with a cryptographic proof. The badge is no longer
attached to an image; the image is a presentation artifact.

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  ],
  "id": "urn:uuid:91537dba-3f97-4e6f-9b8a-1234567890ab",
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": {
    "id": "https://issuer.example.edu",
    "type": ["Profile"],
    "name": "Example University"
  },
  "validFrom": "2026-05-30T00:00:00Z",
  "credentialSubject": {
    "id": "did:example:learner-abc123",
    "type": ["AchievementSubject"],
    "achievement": {
      "id": "https://issuer.example.edu/achievements/data-science-101",
      "type": ["Achievement"],
      "name": "Data Science Fundamentals",
      "criteria": { "narrative": "Completed all modules with score ≥ 80%." },
      "alignments": [{
        "targetFramework": "CASE",
        "targetCode": "DS.1.A.3",
        "targetName": "Statistical reasoning"
      }]
    }
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "created": "2026-05-30T00:00:00Z",
    "verificationMethod": "https://issuer.example.edu/keys/2026",
    "proofPurpose": "assertionMethod",
    "proofValue": "..."
  }
}
```

The cryptographic proof is verifiable WITHOUT calling back to
the issuer; the learner owns the credential and can present it
to employers, transfer institutions, and credential aggregators
(LinkedIn, Credly, EBSI).
