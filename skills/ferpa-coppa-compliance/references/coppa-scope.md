# ferpa-coppa-compliance: Coppa scope

> COPPA applicability and what the 2025 FTC Final Rule changed. Pointed at by the SKILL.md rows
> "Pattern 2" and "Pattern 3".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 2: COPPA scope — under 13 specifically

COPPA applies to commercial operators of websites + online services DIRECTED to children under 13,
OR services with ACTUAL KNOWLEDGE that they are collecting personal information from children
under 13. Key elements:

- **"Directed to children" test** — totality-of-circumstances: subject matter, visual content,
  animated characters, child-oriented activities + incentives, language, advertising, presence of
  celebrities / models, age of actual visitors (FTC empirical evidence)
- **"Actual knowledge"** — if you don't market to kids but registration data (DOB, school grade)
  reveals a user is < 13, you have actual knowledge
- **"Personal information"** — broad: name, address, phone, email, screen name, persistent
  identifier (cookie, device ID, IP), geolocation, photo/video/audio of a child, ANY information
  that PERMITS IDENTIFICATION of a child
- **"Operator"** — anyone who operates a website or online service collecting children's PI;
  includes apps, SDKs, plugins, smart speakers, IoT toys

## Pattern 3: COPPA 2025 Final Rule — what changed

FTC released the COPPA Final Rule effective April 22, 2025. Material changes:

- **New definition of "personal information"** explicitly includes biometric identifiers (facial
  recognition, voiceprints, fingerprints), location data with sub-700m precision, and
  "screen-or-device-name" that is reasonably linkable to a child
- **Explicit consent for third-party disclosures** — even if you have VPC for collection, separate
  consent required to share with third parties for non-essential purposes (ads, analytics with
  cross-site tracking)
- **Retention limits** — covered information cannot be retained "for longer than reasonably
  necessary"; mandatory periodic review; explicit written data-retention policy
- **Data-security program** — written info-sec program, including risk assessment, vendor
  management, training, incident response
- **Biometric protections** — special VPC for biometric, retention limits, deletion on request
  without parent intervention
- **Notice updates** — direct notice to parent more detailed; categories of third parties to whom
  info is disclosed

The 2025 Rule effectively imports many GDPR-K + UK AADC concepts into US law.
