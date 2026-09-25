# ferpa-coppa-compliance: Consent and age gating

> Verifiable parental consent, per-member-state GDPR ages, and age-gate design. Pointed at by the
> SKILL.md rows "Pattern 4", "Pattern 5" and "Pattern 8".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 4: Verifiable Parental Consent (VPC) methods

COPPA §312.5(b) allows specific VPC mechanisms; the FTC publishes an updated list. Permitted methods
(highest assurance first):

| Method | Description | When practical |
| --- | --- | --- |
| **Government-issued ID + facial-match** | Photo of driver's license + selfie + automated match | High-stakes; child-financial / biometric |
| **Credit card / debit card with transaction verification** | $0.01-$0.50 charge that parent must verify in their statement | Sufficient for most cases; standard |
| **Knowledge-based authentication (KBA)** | Questions from public records (former addresses, mortgage values) | Cheap; lower assurance |
| **Phone call to parent** | Trained operator confirms identity + consent | Manual; works for low volume |
| **Signed consent form (mail / fax / e-sign)** | Mailed-back / scanned consent | Slowest; used when others fail |
| **Email + post-confirmation step** ("email plus") | Email to parent + delayed activation + follow-up | DEPRECATED — no longer sufficient on its own under 2025 Rule |
| **In-person at school** | Teacher / counsellor witnesses + records consent | Common for school-deployed products via DPA |
| **School-as-agent-of-parent** | LEA contractually consents on parent's behalf; only for school-purpose uses (not for ads) | Standard for B2G/B2S edtech |

**The school-consent path is the dominant practical pattern**: an LEA signs a DPA agreeing to act as
parent's agent for educational purposes; the vendor never directly obtains parental consent because
the school did via enrollment paperwork. Limitations: only educational purposes; not advertising;
not non-essential third-party disclosure.

## Pattern 5: GDPR Article 8 — children's age varies by member state

GDPR Art 8 sets the digital-consent age between 13 and 16, with member states choosing. As of 2026:

| Country | Age of digital consent |
| --- | --- |
| **France, Germany, Hungary, Ireland, Italy, Lithuania, Luxembourg, Malta, Netherlands, Romania, Slovakia, Slovenia** | 16 |
| **Austria, Bulgaria, Czechia, Cyprus, Denmark, Estonia, Latvia, Poland, Portugal, Spain, Sweden** | 14-15 (various) |
| **Belgium, Finland** | 13 |
| **UK (UK GDPR + Age-Appropriate Design Code)** | 13 |

Below the age of digital consent, parental consent required. Above, the child can consent — though
best practice is parallel notice to parents.

## Pattern 8: Age-gating + age-verification

For COPPA-covered services, design the age-gate carefully:

- **Neutral age screen** (DOB or age range) — required by FTC; ASK age, don't infer; design to
  PREVENT re-attempt after rejection (cookie + IP record)
- **Below-13 path** — kids under 13 require VPC before ANY collection beyond minimal contact
  (parent's email for VPC purposes only)
- **13-17 path** — many state laws (Connecticut, NY) add restrictions even after 13; UK AADC applies
  under 18
- **18+ path** — adult flow

For "general audience" services that may have minor users, set up an AGE-FLAGGING workflow: if
signals indicate a user might be under 13 (DOB in their profile, school grade, classroom context),
trigger the under-13 protections automatically.
