---
name: security-review
description: Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns. Also lazy-loads the security.md / security-controls-org-wide.md / secrets-management.md content migrated from rules/common/ on 2026-06-02.
paths:
  - "**/auth/**"
  - "**/login*"
  - "**/signup*"
  - "**/sso*"
  - "**/oauth*"
  - "**/saml*"
  - "**/jwt*"
  - "**/session*"
  - "**/security/**"
  - "**/secrets/**"
  - "**/.env*"
  - "**/vault*"
  - "**/keychain*"
  - "**/routes/**"
  - "**/handlers/**"
  - "**/controllers/**"
  - "**/middleware/**"
  - "**/api/**"
  - "**/webhook*"
  - "**/payment*"
  - "**/billing*"
  - "**/checkout*"
  - "**/stripe*"
  - "**/encryption*"
  - "**/crypto*"
  - "**/csrf*"
  - "**/cors*"
  - "**/cookies*"
  - "**/permissions*"
  - "**/authorization*"
---

# Security Review Skill

This skill ensures all code follows security best practices and identifies potential vulnerabilities.

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Implementing payment features (always; see § 11 Payment Security)
- Implementing escrow / trust-account / marketplace-split flows
- Implementing webhook receivers (payment / identity / messaging)
- Implementing open-banking / FAPI integrations
- Storing or transmitting sensitive data (PII, PHI, payment card,
  health, financial, biometric)
- Integrating third-party APIs

## Security Checklist

### 1. Secrets Management

#### ❌ NEVER Do This

```typescript
const apiKey = "sk-proj-xxxxx"  // Hardcoded secret
const dbPassword = "password123" // In source code
```

#### ✅ ALWAYS Do This

```typescript
const apiKey = process.env.OPENAI_API_KEY
const dbUrl = process.env.DATABASE_URL

// Verify secrets exist
if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

#### Verification Steps

- [ ] No hardcoded API keys, tokens, or passwords
- [ ] All secrets in environment variables
- [ ] `.env.local` in .gitignore
- [ ] No secrets in git history
- [ ] Production secrets in hosting platform (Vercel, Railway)

### 2. Input Validation

#### Always Validate User Input

```typescript
import { z } from 'zod'

// Define validation schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150)
})

// Validate before processing
export async function createUser(input: unknown) {
  try {
    const validated = CreateUserSchema.parse(input)
    return await db.users.create(validated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    throw error
  }
}
```

#### File Upload Validation

```typescript
function validateFileUpload(file: File) {
  // Size check (5MB max)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File too large (max 5MB)')
  }

  // Type check
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type')
  }

  // Extension check
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error('Invalid file extension')
  }

  return true
}
```

#### Verification Steps

- [ ] All user inputs validated with schemas
- [ ] File uploads restricted (size, type, extension)
- [ ] No direct use of user input in queries
- [ ] Whitelist validation (not blacklist)
- [ ] Error messages don't leak sensitive info

### 3. SQL Injection Prevention

#### ❌ NEVER Concatenate SQL

```typescript
// DANGEROUS - SQL Injection vulnerability
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
await db.query(query)
```

#### ✅ ALWAYS Use Parameterized Queries

```typescript
// Safe - parameterized query
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail)

// Or with raw SQL
await db.query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
)
```

#### Verification Steps

- [ ] All database queries use parameterized queries
- [ ] No string concatenation in SQL
- [ ] ORM/query builder used correctly
- [ ] Supabase queries properly sanitized

### 4. Authentication & Authorization

#### JWT Token Handling

```typescript
// ❌ WRONG: localStorage (vulnerable to XSS)
localStorage.setItem('token', token)

// ✅ CORRECT: httpOnly cookies
res.setHeader('Set-Cookie',
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
```

#### Authorization Checks

```typescript
export async function deleteUser(userId: string, requesterId: string) {
  // ALWAYS verify authorization first
  const requester = await db.users.findUnique({
    where: { id: requesterId }
  })

  if (requester.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }

  // Proceed with deletion
  await db.users.delete({ where: { id: userId } })
}
```

#### Row Level Security (Supabase)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only view their own data
CREATE POLICY "Users view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can only update their own data
CREATE POLICY "Users update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

#### Verification Steps

- [ ] Tokens stored in httpOnly cookies (not localStorage)
- [ ] Authorization checks before sensitive operations
- [ ] Row Level Security enabled in Supabase
- [ ] Role-based access control implemented
- [ ] Session management secure

### 5. XSS Prevention

#### Sanitize HTML

```typescript
import DOMPurify from 'isomorphic-dompurify'

// ALWAYS sanitize user-provided HTML
function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: []
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

#### Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://api.example.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
]
```

#### Verification Steps

- [ ] User-provided HTML sanitized
- [ ] CSP headers configured
- [ ] No unvalidated dynamic content rendering
- [ ] React's built-in XSS protection used

### 6. CSRF Protection

#### CSRF Tokens

```typescript
import { csrf } from '@/lib/csrf'

export async function POST(request: Request) {
  const token = request.headers.get('X-CSRF-Token')

  if (!csrf.verify(token)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  // Process request
}
```

#### SameSite Cookies

```typescript
res.setHeader('Set-Cookie',
  `session=${sessionId}; HttpOnly; Secure; SameSite=Strict`)
```

#### Verification Steps

- [ ] CSRF tokens on state-changing operations
- [ ] SameSite=Strict on all cookies
- [ ] Double-submit cookie pattern implemented

### 7. Rate Limiting

#### API Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests'
})

// Apply to routes
app.use('/api/', limiter)
```

#### Expensive Operations

```typescript
// Aggressive rate limiting for searches
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many search requests'
})

app.use('/api/search', searchLimiter)
```

#### Verification Steps

- [ ] Rate limiting on all API endpoints
- [ ] Stricter limits on expensive operations
- [ ] IP-based rate limiting
- [ ] User-based rate limiting (authenticated)

### 8. Sensitive Data Exposure

#### Logging

```typescript
// ❌ WRONG: Logging sensitive data
console.log('User login:', { email, password })
console.log('Payment:', { cardNumber, cvv })

// ✅ CORRECT: Redact sensitive data
console.log('User login:', { email, userId })
console.log('Payment:', { last4: card.last4, userId })
```

#### Error Messages

```typescript
// ❌ WRONG: Exposing internal details
catch (error) {
  return NextResponse.json(
    { error: error.message, stack: error.stack },
    { status: 500 }
  )
}

// ✅ CORRECT: Generic error messages
catch (error) {
  console.error('Internal error:', error)
  return NextResponse.json(
    { error: 'An error occurred. Please try again.' },
    { status: 500 }
  )
}
```

#### Verification Steps

- [ ] No passwords, tokens, or secrets in logs
- [ ] Error messages generic for users
- [ ] Detailed errors only in server logs
- [ ] No stack traces exposed to users

### 9. Blockchain Security (Solana)

#### Wallet Verification

```typescript
import { verify } from '@solana/web3.js'

async function verifyWalletOwnership(
  publicKey: string,
  signature: string,
  message: string
) {
  try {
    const isValid = verify(
      Buffer.from(message),
      Buffer.from(signature, 'base64'),
      Buffer.from(publicKey, 'base64')
    )
    return isValid
  } catch (error) {
    return false
  }
}
```

#### Transaction Verification

```typescript
async function verifyTransaction(transaction: Transaction) {
  // Verify recipient
  if (transaction.to !== expectedRecipient) {
    throw new Error('Invalid recipient')
  }

  // Verify amount
  if (transaction.amount > maxAmount) {
    throw new Error('Amount exceeds limit')
  }

  // Verify user has sufficient balance
  const balance = await getBalance(transaction.from)
  if (balance < transaction.amount) {
    throw new Error('Insufficient balance')
  }

  return true
}
```

#### Verification Steps

- [ ] Wallet signatures verified
- [ ] Transaction details validated
- [ ] Balance checks before transactions
- [ ] No blind transaction signing

### 10. Dependency Security

#### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

#### Lock Files

```bash
# ALWAYS commit lock files
git add package-lock.json

# Use in CI/CD for reproducible builds
npm ci  # Instead of npm install
```

#### Verification Steps

- [ ] Dependencies up to date
- [ ] No known vulnerabilities (npm audit clean)
- [ ] Lock files committed
- [ ] Dependabot enabled on GitHub
- [ ] Regular security updates

### 11. Payment Security

Sister skills: [`payment-processing-patterns`](../payment-processing-patterns/SKILL.md)

- [`pci-dss-patterns`](../pci-dss-patterns/SKILL.md). Payment
flows have a dedicated security envelope on top of the general
OWASP / ASVS surface — the threat model includes credential
stuffing on checkout, card-testing fraud, BIN-attack patterns,
chargeback abuse, money-laundering, account-takeover-driven
withdrawal fraud, refund-fraud, processor-impersonation via
webhook forgery, and idempotency-bypass attempts.

#### Webhook signature verification (NON-NEGOTIABLE)

```typescript
// CORRECT — verify Stripe webhook signature before processing
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_API_KEY!);

export async function handler(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // RAW body — NOT JSON-parsed
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    log.warn('webhook signature verification failed', {
      error_code: 'webhook_signature_invalid',
      remote_ip_hash: hashIP(req.ip),
    });
    return res.status(400).json({ error_code: 'webhook_signature_invalid' });
  }
  // Now safe to process event
}
```

Required for every payment webhook (Stripe, Adyen, Square,
PayPal, Braintree, Mollie, Razorpay, Paystack, Flutterwave):

- Raw body verification (never parse-then-verify; the signature
  is over the raw bytes)
- Replay-attack protection: webhook signature includes timestamp;
  reject events with `timestamp` older than 5 minutes
- Per-endpoint signing secrets (rotate on suspected compromise)
- Idempotency on event_id (per `payment-processing-patterns`
  Pattern 1g — provider retries are normal)

#### Idempotency-bypass attempt detection

Attackers probe payment endpoints to bypass idempotency for
double-spending or refund abuse. Watch for:

- Same payment payload, MANY different idempotency keys (key
  rotation attack)
- Same idempotency key, DIFFERENT payloads (HTTP 422
  `idempotency_key_payload_mismatch` per Pattern 11)
- Rapid replay-rate spike from single IP / user (credential
  stuffing on checkout)
- 409 collision spike (concurrent submission burst)

Emit metrics + alert: rate threshold + per-actor anomaly
detection. Tie to `~/.claude/rules-library/common/rate-limiting.md`
multi-layer (edge / gateway / app / DB).

#### Tokenization-at-the-edge (never-store-PAN)

Per `pci-dss-patterns` — PAN MUST NOT touch your application
server. Two patterns:

1. **Client-side tokenization (preferred)**: Stripe Elements,
   Adyen Drop-in, Square Web Payments SDK iframe the card form
   from the processor's domain; PAN never reaches your server;
   you receive a `pm_...` token
2. **Server-side tokenization (fallback)**: card data flows
   through a PCI-DSS Level 1 service (your processor); your
   server stores ONLY the token

```typescript
// WRONG — card data on your server (SAQ-D, $20M PCI scope)
const charge = await stripe.charges.create({
  amount: 1000,
  currency: 'usd',
  source: { number: req.body.card_number, exp_month: req.body.exp_month, ... },
});

// RIGHT — token from client (SAQ-A, minimal scope)
const charge = await stripe.charges.create({
  amount: 1000,
  currency: 'usd',
  source: req.body.stripe_token, // tok_... from Stripe.js
});
```

#### Card-testing + BIN-attack detection

Fraud rings test stolen cards by making small-value transactions
($1-5) to validate which still work. Defenses:

- Velocity limits: max N attempts per card / per IP / per
  device / per hour (per `rate-limiting.md`)
- BIN-range monitoring: anomalous distribution of issuer BINs
  triggers risk review
- Reverse-CAPTCHA + browser-fingerprint (FingerprintJS, Sift,
  Stripe Radar)
- 3DS2 challenge on high-risk transactions (Pattern 3 in
  payment-processing-patterns)

#### FAPI 2.0 + Open Banking security profile

For open-banking integrations (Plaid, Tink, Belvo, TrueLayer,
Yodlee), follow the **Financial-grade API Security Profile 2.0**
(OpenID Foundation FAPI WG, 2024):

- mTLS for client authentication
- DPoP (Demonstration of Proof-of-Possession; RFC 9449) or
  certificate-bound tokens
- PAR (Pushed Authorization Requests; RFC 9126)
- JARM (JWT Secured Authorization Response Mode)
- Short-lived access tokens (≤ 5 min); refresh-token rotation

#### Refund-fraud + chargeback-abuse patterns

- Friendly fraud: customer disputes legitimate charge after
  receiving goods/services. Defenses: shipping evidence,
  IP/device match at order time, signed delivery, repeat-customer
  history
- Refund laundering: gift-card / store-credit refund moves
  funds outside KYC trail. Defense: refunds ONLY to original
  payment method (PCI-DSS v4.0 Req 5.4.1 + Visa/MC rules)
- Triangulation fraud: bad actor receives goods on stolen card,
  customer disputes later. Defense: address verification (AVS),
  CVV check, 3DS2 enrollment

#### IAM segmentation for payment infrastructure

Per `pci-dss-patterns` + AWS Well-Architected Security pillar:

- Separate AWS account for PCI-CDE (Cardholder Data Environment)
- IAM roles per service (no shared roles); least-privilege
  read/write on payment tables + KMS keys
- KMS keys per-tenant for refund attestation + processor secrets;
  rotation per `secrets-management.md`
- VPC isolation: payment-handling services in private subnets;
  egress only to processor IP ranges
- mTLS for service-to-service inside CDE

#### Escrow / trust-account security

Per `payment-processing-patterns` Pattern 11:

- Separate AWS / GCP account for trust-account database (audit
  segmentation)
- Encryption at rest with per-tenant KMS keys (defense-in-depth
  if bucket policy fails)
- Append-only ledger writes (no UPDATE / DELETE on trust ledger
  rows; per `audit-logging.md`)
- OFAC / sanctions screening at every fund-in + fund-out;
  Vendor: Refinitiv World-Check, ComplyAdvantage, Chainalysis
  for crypto
- BOI (Beneficial Ownership Information) data encrypted + access-
  audit-logged per FinCEN rule
- 4-eyes principle on manual escrow release > $threshold

#### Verification Steps

- [ ] Webhook signature verification on every payment webhook
      endpoint
- [ ] Webhook timestamp window (≤ 5 min) enforced
- [ ] Webhook signing secrets in vault; rotation procedure
      documented
- [ ] Idempotency-bypass detection: payload-hash mismatch
      returns 422; key-rotation anomaly alerted
- [ ] PAN never stored / logged / fixture-d anywhere
- [ ] Tokenization at the edge (Stripe Elements / Adyen Drop-in /
      Square Web Payments SDK)
- [ ] Card-testing velocity limits per IP / card / device
- [ ] BIN-range anomaly detection
- [ ] FAPI 2.0 conformance for open-banking integrations
- [ ] Refunds ONLY to original payment method (no gift-card
      / store-credit refund pathways without explicit policy)
- [ ] IAM segmentation: separate cloud account for CDE
- [ ] mTLS for service-to-service inside CDE
- [ ] If escrow flow: trust account ledger append-only +
      OFAC/sanctions screening at fund-in/fund-out + 4-eyes on
      manual release
- [ ] If platform-as-custodian: MTL portfolio verified BEFORE
      shipping
- [ ] Idempotency cache key composed of `tenant_id + endpoint +
      api_version + idempotency_key` SHA-256 hash
- [ ] Idempotency cache backed by durable + cross-region-
      consistent store

## Security Testing

### Automated Security Tests

```typescript
// Test authentication
test('requires authentication', async () => {
  const response = await fetch('/api/protected')
  expect(response.status).toBe(401)
})

// Test authorization
test('requires admin role', async () => {
  const response = await fetch('/api/admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  })
  expect(response.status).toBe(403)
})

// Test input validation
test('rejects invalid input', async () => {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email' })
  })
  expect(response.status).toBe(400)
})

// Test rate limiting
test('enforces rate limits', async () => {
  const requests = Array(101).fill(null).map(() =>
    fetch('/api/endpoint')
  )

  const responses = await Promise.all(requests)
  const tooManyRequests = responses.filter(r => r.status === 429)

  expect(tooManyRequests.length).toBeGreaterThan(0)
})
```

## Pre-Deployment Security Checklist

Before ANY production deployment:

- [ ] **Secrets**: No hardcoded secrets, all in env vars
- [ ] **Input Validation**: All user inputs validated
- [ ] **SQL Injection**: All queries parameterized
- [ ] **XSS**: User content sanitized
- [ ] **CSRF**: Protection enabled
- [ ] **Authentication**: Proper token handling
- [ ] **Authorization**: Role checks in place
- [ ] **Rate Limiting**: Enabled on all endpoints
- [ ] **HTTPS**: Enforced in production
- [ ] **Security Headers**: CSP, X-Frame-Options configured
- [ ] **Error Handling**: No sensitive data in errors
- [ ] **Logging**: No sensitive data logged
- [ ] **Dependencies**: Up to date, no vulnerabilities
- [ ] **Row Level Security**: Enabled in Supabase
- [ ] **CORS**: Properly configured
- [ ] **File Uploads**: Validated (size, type)
- [ ] **Wallet Signatures**: Verified (if blockchain)

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/security)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [Web Security Academy](https://portswigger.net/web-security)

## Purpose

Principal-level security review: OWASP Top 10 (2021) coverage,
OWASP ASVS 4.0.3 mapping (L1/L2/L3), STRIDE threat modelling at
design time, secure-by-default coding patterns (parameterised
queries, output encoding, deny-by-default authz, CSP / HSTS /
SameSite cookies), secret management discipline (vault-only, never
on disk), dependency CVE gating, supply-chain integrity (SBOM,
signing, SLSA), webhook signature verification, rate limiting on
auth + sensitive endpoints, audit logging (per `audit-logging.md`),
PII redaction in logs (per `gdpr-ccpa.md`), incident response
flow (rotate FIRST, scrub LATER), and the cross-language security
checks every reviewer applies before approving a merge.

**Negative scope** (NOT what this skill covers):

- Penetration testing methodology (engage external pentesters)
- Red-team / offensive security (different discipline)
- Cryptographic protocol design (use vetted primitives; don't
  invent)
- Compliance certifications (SOC 2 / ISO 27001 audit) — separate
  workflow

## When NOT to use

- Pure-static documentation changes
- Throwaway scripts with no user input + no network exposure
- Local-only dev tooling that never reaches production

## Standards Cited

- **OWASP Top 10 (2021)** — owasp.org/Top10
- **OWASP ASVS 4.0.3** — Application Security Verification Standard
- **OWASP API Security Top 10 (2023)** — API-specific risks
- **OWASP Cheat Sheet Series** — implementation-level guides
- **NIST SP 800-53 Rev 5** — security + privacy controls
- **NIST SP 800-218 (SSDF)** — Secure Software Development Framework
- **NIST SP 800-63B** — Digital Identity Guidelines
- **CWE Top 25 (2026)** — most dangerous weaknesses
- **CVSS v3.1 / v4.0** — vulnerability scoring
- **SLSA Framework v1.0** — supply-chain integrity levels
- **CIS Benchmarks** — hardening references per platform
- **PCI-DSS v4.0** — cardholder-data security
- **GDPR Articles 5, 25, 32, 33, 34** — security + breach notification
- **RFC 6749 (OAuth 2.0)**, **RFC 7636 (PKCE)**, **RFC 8725 (JWT BCP)**

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| SQL with string concatenation | A03 Injection (CWE-89) | Parameterised queries / ORM-bound input |
| `eval()` / `exec()` with user input | A03 RCE (CWE-78 / CWE-95) | Allowlist dispatch; never eval user input |
| `dangerouslySetInnerHTML` / `v-html` on user content | A03 XSS (CWE-79) | textContent OR DOMPurify-sanitised |
| Forgotten authn middleware | A01 Broken Access Control (CWE-862) | Deny-by-default; every route gates auth |
| IDOR on resource lookup | A01 (CWE-639) | Scope query by current user / tenant id |
| Hardcoded secret in source | A02 / A08 (CWE-798) | Vault + env injection; PostToolUse hook blocks the prefix |
| MD5 / SHA-1 / DES for security | A02 Cryptographic Failures (CWE-327) | SHA-256+ / Argon2id / AES-GCM |
| Login endpoint without rate limit | A07 Auth Failures (CWE-307) | Per-IP + per-account + global throttle |
| JWT with `alg: none` accepted | A02 + A07 (CWE-345) | Strict allowlist of algorithms; verify signature |
| CSRF protection disabled | A01 (CWE-352) | Double-submit cookie OR `SameSite=Strict` + Origin check |
| Path traversal via `path.join(base, user_input)` | A01 (CWE-22) | Canonicalise + check prefix |
| `fetch(user_url)` from server | A10 SSRF (CWE-918) | Allowlist hosts; block private IPs + IMDS |
| Stack trace returned in API response | A04 Information Disclosure | Sanitised error envelope (per `error-handling-with-context.md`) |
| No webhook signature verification | A08 Software + Data Integrity | Verify HMAC / signature per provider's docs |
| `npm install` without `--frozen-lockfile` in CI | A06 Vulnerable Components | Lockfile-strict + `pnpm audit` + `osv-scanner` |
| Secrets in CI logs | A09 Logging Failures | Filter secrets in logger config; treat any leak as P0 |
| MFA disabled by default for admins | A07 | MFA required on admin role; refuse weak auth |
| Long-lived refresh tokens without rotation | A07 | Rotate on use + reuse-detection |
| Plaintext PII in logs | GDPR Article 5 + 32; A09 | Hash / truncate / redact at logger config |

## Verification Checklist

- [ ] OWASP Top 10 (2021) reviewed for the change
- [ ] STRIDE applied to any new feature touching user data
- [ ] All input validated at boundary (length / type / format /
      allowlist)
- [ ] All output encoded for context (HTML / SQL / shell / JSON)
- [ ] AuthN + AuthZ verified on every changed endpoint
- [ ] Rate limit on every public + auth endpoint (per
      `rate-limiting.md`)
- [ ] CSRF protection on every state-changing request
- [ ] Secrets via vault (per `secrets-management.md`); none in
      source / lockfiles / CI logs
- [ ] No weak crypto (MD5 / SHA-1 / DES / RC4)
- [ ] JWT validates allowlisted algorithm + audience + issuer +
      expiry
- [ ] Dependency CVE gate green (MODERATE+ blocks per
      `dependency-vulnerabilities.md`)
- [ ] License gate green (per `license-allowlist-gate.md`)
- [ ] SBOM emitted + image signed (SLSA L2+)
- [ ] Webhook signatures verified
- [ ] Error responses sanitised; no stack trace / DB error /
      internal path leakage
- [ ] PII redacted from logs (per `gdpr-ccpa.md`)
- [ ] Audit log for sensitive actions (per `audit-logging.md`)
- [ ] Incident-response runbook references the change's failure
      modes

## Cross-References

- [`cloud-infrastructure-security.md`](cloud-infrastructure-security.md)
  — sister document within this skill: cloud platform + IAM + CI/CD
  - IaC + monitoring deep-dive (361-line checklist for AWS, Vercel,
  Railway, Cloudflare, Terraform, GitHub Actions)
- `~/.claude/skills/owasp-asvs/SKILL.md` — ASVS catalogue
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — privacy lens
- `~/.claude/skills/iso27001-controls/SKILL.md` — ISMS Annex A
- `~/.claude/skills/soc2-readiness/SKILL.md` — TSC mapping
- `~/.claude/skills/pci-dss-patterns/SKILL.md` — payment data scope
- `~/.claude/rules-library/common/security.md` — global umbrella
- `~/.claude/rules-library/common/secrets-management.md` — secrets posture
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — CVE gate
- `~/.claude/rules-library/common/rate-limiting.md` — throttle defence
- `~/.claude/rules-library/common/audit-logging.md` — auditable actions
- `~/.claude/rules-library/common/error-handling-with-context.md` — error
  envelope sanitisation
- `~/.claude/agents/security-reviewer.md` — Council Division 4
- `~/.claude/agents/compliance-reviewer.md` — Council Division 6

## Why this skill exists

Security defects ship to production because review is implicit:
each reviewer brings their own (incomplete) mental checklist; gaps
appear at the seams between languages, layers, and teams. Making
the review structured + OWASP-mapped + ASVS-anchored means the
review can't be skipped silently. The patterns above codify the
production-ready posture: STRIDE at design, ASVS-mapped controls
in code, vault-first secrets, CVE gate at every PR, sanitised
errors, audit log for sensitive actions, rate limit on every auth

- public endpoint. Teams that adopt these ship features without
shipping incidents; teams that don't burn engineering quarters
on incident response.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- User input handler ships without input validation / sanitisation (A03 weakening)
- Authentication endpoint without rate-limit (A07 + Sonar S5876)
- Hardcoded credential reaches a commit (A02 + Sonar S2068; hook should have caught it)
- File-upload handler without size + content-type validation
- New external integration without OWASP threat-model review (Phase 0 weakening)
- IDOR pattern recurring (handler reads resource by id without ownership check) — A01
- SQL string-concat / format-string injection (A03)
- Weak crypto (MD5/SHA-1/DES) appears in code (A02 + Sonar S5547)
- Sensitive data in logs (A09; PII leaks via console.log / structured logger)
- Missing security headers (CSP / HSTS / X-Frame-Options) on new pages (A05)
- Vulnerable dep CVE reaches main (A06; dependency-vulnerabilities.md gate bypassed)
- Payment webhook handler missing signature verification (§ 11; replay-attack exposure)
- Payment webhook accepts events outside 5-min timestamp window (§ 11 replay-protection weakening)
- PAN reaches application server (§ 11 tokenization-at-edge violation; PCI scope blast)
- Card-testing velocity limit absent on checkout (§ 11; BIN-attack fraud)
- Refund pathway permits non-original-payment-method targets without explicit policy (§ 11; refund-laundering exposure)
- Open-banking integration ships without FAPI 2.0 conformance (§ 11; mTLS / DPoP / PAR missing)
- Idempotency-bypass detection absent on payment endpoints (§ 11; double-spend / replay exposure)
- Same-IP key-rotation anomaly unobserved on payment endpoints (card-testing fraud signal)
- Trust-account / escrow ledger NOT append-only (§ 11; audit failure + commingling risk)
- OFAC / sanctions screening missing at fund-in OR fund-out (§ 11; per-tx OFAC penalty up to $1.7M)
- Custodial escrow shipped without MTL portfolio (§ 11 + payment-processing-patterns Anti-pattern 10)
- 4-eyes principle absent on manual escrow release above threshold (§ 11; insider-risk exposure)
- mTLS not enforced for service-to-service inside CDE (§ 11; PCI-DSS Req 4 weakening)

**Refinement candidates**:

- New row in OWASP A01-A10 checklist when a recurring pattern surfaces in the codebase
- Threat-model template extended when a new attack class emerges (e.g., AI prompt injection, supply-chain typosquats)
- Cross-reference added when a sister skill (owasp-asvs, gdpr-ccpa-compliance, pci-dss-patterns, payment-processing-patterns, hipaa-compliance) adds a security gate
- Per-stack security checklist row when a new framework / cloud service joins the codebase
- New § 11 sub-section when a new payment-security threat class emerges (e.g., quantum-resistant payment crypto, post-quantum SCA, stablecoin custody attack class)
- New FAPI 2.0 conformance row when OpenID FAPI WG releases a profile update
- New OFAC / sanctions-screening vendor row when a new screening provider gains adoption (Refinitiv, ComplyAdvantage, Chainalysis, Sardine, Alloy)

---

**Remember**: Security is not optional. One vulnerability can compromise the entire platform. When in doubt, err on the side of caution.

<!-- ============================================================
     Migration appendix: 2026-06-02 lazy-rules-loading
     ============================================================ -->

## Migrated rules (2026-06-02)

The following rules were migrated from `~/.claude/rules/common/` into this skill as part of the lazy-rules-loading plan. Phase H will delete the source files.

- `rules-library/common/security.md`
- `rules-library/common/security-controls-org-wide.md`
- `rules-library/common/secrets-management.md`
- `rules-library/common/audit-logging.md`
- `rules/common/official-docs-first.md`

---

<!-- ============================================================
     Section: security.md (from rules/common/)
     ============================================================ -->

# Security Umbrella (Always-On, Global)

> This is the canonical security baseline. It maps every relevant
> security control to its specific standard and to the sister
> rule that enforces it. Standards-cited references: **OWASP
> Top 10 (2021)**, **OWASP ASVS 4.0.3**, **NIST SP 800-53 Rev 5**,
> **ISO/IEC 27001:2022**, **CWE Top 25 (2026)**, **PCI-DSS v4.0**,
> **GDPR (EU 2016/679)**, **CCPA (Cal. Civ. Code §1798.100+)**.
>
> Sister rules (each enforces a slice of this umbrella):
>
> - `dependency-vulnerabilities.md` — CVE gate (MODERATE+ blocks)
> - `license-allowlist-gate.md` — SPDX allowlist + cross-check
> - `dependency-overrides-not-exceptions.md` — fix the tree, not
>   the exception list
> - `security-controls-org-wide.md` — 5-layer non-bypassable
>   enforcement
> - `secrets-management.md` — vault-first, never on disk in
>   cleartext, atomic rotation, scrub-after-rotate
> - `install-allowlist.md` — no silent global installs
> - `repo-setup-checklist.md` — 20-point first-touch checklist
> - `docker-localhost-binding.md` — every host port `127.0.0.1:`
> - `no-local-fs.md` — no local FS state on ephemeral platforms
> - `no-discards.md` (hook-enforced) — blocks hardcoded secrets
>   - weak crypto patterns on save
> - `extreme-lint-policy.md` — `gosec`, `bandit`, `eslint-
>   plugin-security` mandatory

## OWASP Top 10 mapping

Every project's security review walks ALL ten categories. The
table below names the standard, the specific check, and the
sister rule that enforces it.

| # | Category (OWASP Top 10 2021) | What to check | Enforced by |
| --- | --- | --- | --- |
| A01 | **Broken Access Control** | Authorization on every endpoint; deny-by-default; row-level (RLS) on multi-tenant tables; object-level checks before mutation. ASVS V4 (Access Control). | `extreme-lint-policy.md` (security plugin); per-handler reviews |
| A02 | **Cryptographic Failures** | TLS 1.2+ everywhere; AES-256-GCM at rest; argon2id / bcrypt for passwords; no MD5 / SHA-1 / DES; HSTS preload; certificate pinning where applicable. ASVS V6 (Stored Cryptography), V9 (Communication). | `no-discards.md` (Sonar S5547 weak-hash); `secrets-management.md` |
| A03 | **Injection** | Parameterised SQL (no string concat); ORM-validated input; `execFile` over `exec`; URL allowlists for SSRF. ASVS V5 (Validation, Sanitisation, Encoding). | `no-discards.md` (S2068, S2076 SSRF); `code-reviewer` agent |
| A04 | **Insecure Design** | Threat-model before code (STRIDE for new features); deny-by-default architecture; least-privilege IAM. NIST SP 800-53 SA-3, SA-8. | `task-intake-due-diligence.md` (Q5 + Q7); `architect` agent |
| A05 | **Security Misconfiguration** | Hardened defaults (no `debug=true` in prod); CSP / HSTS / SRI present; cookies `HttpOnly` + `Secure` + `SameSite`; minimal exposed ports; default-credentials check. ASVS V14 (Configuration). | `docker-localhost-binding.md`; `repo-setup-checklist.md` |
| A06 | **Vulnerable Components** | CVE gate green (CRITICAL / HIGH / MODERATE all block); abandoned dep gate; SBOM generated. ASVS V10 (Malicious Code). | `dependency-vulnerabilities.md`; `updated-frameworks.md`; `dependency-overrides-not-exceptions.md` |
| A07 | **Identification + Auth Failures** | Strong session mgmt; password length ≥12; rate-limited login; MFA for admin; refresh-token rotation w/ reuse detection; cell-bound JWTs in multi-region. ASVS V2 (Authentication), V3 (Session Mgmt). | `secrets-management.md`; `extreme-lint-policy.md` |
| A08 | **Software + Data Integrity Failures** | Signed releases (Sigstore / GPG); CI artifact provenance (SLSA Level ≥2); webhook signature verification + replay protection; subresource integrity for CDN scripts. ASVS V14.2 (Dependency). | `dependency-vulnerabilities.md` + signed-commit branch protection (see `security-controls-org-wide.md`) |
| A09 | **Security Logging + Monitoring Failures** | Security events logged with structured fields; no secrets in logs; RUM / APM wired; audit trail for sensitive ops; alerting on auth/authz anomalies. ASVS V8 (Data Protection), V7 (Error Handling + Logging). | `no-silent-failures.md`; `error-handling-with-context.md`; `observability-patterns` skill |
| A10 | **Server-Side Request Forgery (SSRF)** | URL validators (no private IPs, no IMDS, no localhost from prod); allowlist outbound destinations; restrict cloud metadata. ASVS V12.1, V13.1. | `no-discards.md` (S1313 hardcoded-IP + S2076 SSRF); `code-reviewer` |

## Mandatory pre-commit security checks

Per `done-criteria.md`, every commit verifies (in order):

| # | Check | Standard | Enforcement |
| --- | --- | --- | --- |
| 1 | No hardcoded secrets (API keys, passwords, tokens, JWT signing keys, private keys, cloud IAM long-term keys) | ASVS V2.10, CWE-798 | PostToolUse `no-discards` hook; gitleaks pre-commit; CI gitleaks job |
| 2 | All user inputs validated (length, type, encoding, format, allowlist of acceptable chars) | ASVS V5.1, CWE-20 | Per-handler review; runtime schema validation (Zod / Pydantic / class-validator) |
| 3 | SQL injection prevention (parameterised queries, ORM-mediated input, no string concat) | ASVS V5.3.4, CWE-89 | `no-discards.md` S2077; ORM enforcement |
| 4 | XSS prevention (textContent over innerHTML, `Content-Security-Policy` + `nonce`-based scripts, sanitisation library for any user-rendered HTML) | ASVS V5.3.2, V14.4.3, CWE-79 | `no-discards.md` S6299 (Vue), S6481 (React); CSP header check |
| 5 | CSRF protection (double-submit cookie OR `SameSite=Lax`+`Secure` + Origin/Referer check on state-changing requests) | ASVS V4.2.1, CWE-352 | Per-handler review |
| 6 | Authentication / authorization verified on every endpoint (no "forgotten" middleware) | ASVS V4.1, CWE-862 | `code-reviewer` agent |
| 7 | Rate limiting on every public endpoint + every auth endpoint | ASVS V11.1, CWE-770 | Rate-limit middleware; `no-discards.md` S5876 |
| 8 | Error messages don't leak sensitive data (stack traces, file paths, DB error strings stripped before client response) | ASVS V7.4, CWE-209 | `error-handling-with-context.md` rule 8 |
| 9 | Dependency CVE gate green (MODERATE+ blocks) | OWASP Dependency-Check; ASVS V10 | `dependency-vulnerabilities.md` |
| 10 | License allowlist gate green (SPDX list + Trove cross-check) | Org legal policy | `license-allowlist-gate.md` |
| 11 | Security exceptions live in org's central `.github` repo, NOT consumer | Org governance | `security-controls-org-wide.md` |

## Secret management — the rules in one place

Per `secrets-management.md`:

1. **Vault, never disk** — AWS Secrets Manager / GCP Secret
   Manager / HashiCorp Vault / 1Password Secrets Automation /
   macOS Keychain via aws-vault. Never `~/.aws/credentials` in
   plaintext.
2. **`.env` files are LOCAL ONLY** — gitignored everywhere;
   populated from the vault on first checkout; never committed.
3. **`.env.example` exists** — placeholder values only;
   committed for documentation.
4. **`docs/secrets.md`** documents the SOURCE of each secret
   in prod + dev.
5. **Rotation is atomic** (per `proper-fixes-first.md`) — a
   single script that updates vault + DB + consumers in the
   right order; never step-by-step.
6. **On suspected exposure**: rotate FIRST, scrub history
   LATER. The window between "I think it leaked" and "the old
   key still works" is the real risk.
7. **No private keys in git EVER** — no `*.pem`, `*.key`,
   `id_rsa*`, `id_ed25519*`. Test fixtures generate keys at
   test-setup time.

## Threat modeling — STRIDE applied to every new feature

Per ISO/IEC 27001:2022 + NIST SP 800-30, every non-trivial
feature gets a STRIDE pass during Council Phase 0:

| Letter | Category | Question |
| --- | --- | --- |
| **S** | Spoofing | Can a user pretend to be another user / service? |
| **T** | Tampering | Can data be modified in transit or at rest in a way the receiver can't detect? |
| **R** | Repudiation | Can a user deny having performed an action we have no record of? |
| **I** | Information disclosure | What sensitive data could leak (PII, secrets, internals)? |
| **D** | Denial of service | What can an attacker do to exhaust resources or block legitimate users? |
| **E** | Elevation of privilege | Can a low-privilege user gain higher privileges? |

The STRIDE answers populate the task-intake's Q7 (Security)
field. For features that touch user data, the answers also
feed the GDPR / CCPA review.

## Compliance (privacy + regulatory)

When the project handles user data, the security review also
covers:

| Regulation | Scope | Mandatory checks |
| --- | --- | --- |
| **GDPR** (EU) | EU resident data | Lawful basis documented; data-subject rights (access, delete, port, rectify); DPO contact; cross-border transfer mechanism (SCC / adequacy); breach-notification within 72h; DPIA for high-risk processing |
| **CCPA / CPRA** (California) | California resident data | Notice-at-collection; opt-out of sale + sharing; right-to-delete; right-to-know; data-broker registration if applicable |
| **HIPAA** (US health) | Protected Health Information | BAA with every subprocessor; minimum-necessary access; audit logs immutable for 6y; encryption at rest + in transit |
| **PCI-DSS v4.0** | Payment card data | SAQ at minimum; no card-data storage outside Stripe / Adyen / similar PSP; quarterly ASV scans; pen test annually |
| **SOC 2 Type II** | Service org controls | Trust Service Criteria evidence; vendor-management policy; change-management process; access reviews quarterly |
| **ISO/IEC 27001:2022** | ISMS | Statement of Applicability; risk treatment plan; Annex A controls (93 of them); internal audit + management review annually |
| **POPIA** (South Africa) | South African resident data | Information officer registered; cross-border transfer notice; record of processing activities |

The applicable subset is named in the task-intake (per
`task-intake-due-diligence.md` Q7). Out-of-scope regulations
are explicitly marked N/A with a one-line reason.

## Security response protocol

When a security issue is found at any layer (lint, hook, code
review, post-merge, production incident, external report):

1. **STOP** the work that uncovered it. Do not "fix and continue."
2. **Triage severity** using CVSS v3.1:
   - CRITICAL (9.0–10.0) → fix immediately, no batching
   - HIGH (7.0–8.9) → fix within 24h
   - MEDIUM (4.0–6.9) → fix within 7d
   - LOW (0.1–3.9) → fix within 30d
3. **Delegate to `security-reviewer`** agent for the technical
   fix. The agent runs through OWASP Top 10 + ASVS to confirm no
   sibling issues.
4. **Rotate** any exposed secrets BEFORE scrubbing history (per
   `secrets-management.md` §9).
5. **Audit the entire codebase** for the same class of issue —
   one missing CSRF check usually means others.
6. **Document the incident** in `docs/security-incidents.md`
   (project) with date, scope, evidence of misuse (or none),
   remediation timeline, and lessons.
7. **Add a pre-deploy check** (per `deploy-failures-become-
   checks.md`) so the same class can't recur silently.

## Cross-references

- `dependency-vulnerabilities.md` — CVE gate (MODERATE+ blocks)
- `license-allowlist-gate.md` — SPDX allowlist + cross-check
- `dependency-overrides-not-exceptions.md` — fix the tree
- `security-controls-org-wide.md` — 5-layer non-bypassable
  enforcement
- `secrets-management.md` — vault-first; atomic rotation
- `install-allowlist.md` — no silent global installs
- `repo-setup-checklist.md` — 20-point first-touch checklist
- `docker-localhost-binding.md` — `127.0.0.1:` on every port
- `no-local-fs.md` — no FS state on ephemeral platforms
- `no-discards.md` (hook-enforced) — blocks hardcoded secrets
  - weak-crypto patterns on save
- `error-handling-with-context.md` — error responses sanitise
  internal details before reaching client
- `extreme-lint-policy.md` — `gosec`, `bandit`,
  `eslint-plugin-security`, clippy security lints mandatory
- `task-intake-due-diligence.md` Q7 — security is part of
  every task's intake
- `done-criteria.md` — security checks gate every "done"
  claim
- Council Protocol Phase 0 (`CLAUDE.md`) — `security-reviewer`
  is Division 4

## Why this rule exists

Security defects ship to production because the security review
is implicit and ad-hoc. Making the review structured (OWASP Top
10 mapping + STRIDE + compliance table + pre-commit gates) means
the review can't be skipped — every PR, every commit, every
deploy walks the same checklist.

The umbrella exists to point at the specific sister rule that
enforces each control. The sister rules carry the actual
machinery (hooks, lints, gates); this rule names the standards
they implement against (OWASP, ASVS, NIST, ISO 27001, CWE
Top 25, PCI-DSS, GDPR, CCPA, POPIA, HIPAA).

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New OWASP Top 10 release that changes category names or rankings (taxonomy needs update)
- New CVE class recurring across multiple repos (new sister rule candidate)
- New regulation (e.g., DORA, NIS2, EU AI Act) in scope but no compliance section in the umbrella (regulation row needed)
- STRIDE pass skipped on a non-trivial feature (rule weakening — Phase 0 discipline)
- Security finding triaged below its CVSS class (severity-SLA drift)
- Security review degraded into ad-hoc judgement vs structured checklist
- Sister rule's machinery not invoked in a Council pass that should have triggered it
- Compliance table row marked N/A without justification

**Refinement candidates**:

- New row in the compliance table when a regulation enters scope
- New cross-reference when a new sister rule covers a control the umbrella names but doesn't enforce
- Tightening of the pre-commit checklist when a new defence-in-depth gate emerges
- New OWASP-Top-10 mapping update when the spec releases a new version

---

<!-- ============================================================
     Section: security-controls-org-wide.md (from rules/common/)
     ============================================================ -->

# Org-Wide Security Controls (Global Default)

> Auto-fires on every file. Sister to `dependency-vulnerabilities.md`,
> `license-allowlist-gate.md`, `security.md`, `done-criteria.md`.

## Core Principle

**Security controls live at the org level and are non-bypassable from
the consumer side. A control that can be disabled by editing a
single file in a single consumer repo is not a control — it is a
suggestion.**

Every meaningful security gate (CVE allowlist, license allowlist,
required-status-check, branch protection, deploy preflight) is
implemented in five layers. Bypassing the gate requires bypassing
ALL five — which by design requires org-admin action AND generates
an audit trail.

## The Five-Layer Enforcement Pattern

For every security gate (CVE allowlist, license allowlist, secrets
scan, dep audit, signed-commits requirement, branch protection):

| Layer | Where it lives | What it catches |
| --- | --- | --- |
| **1. Local pre-push hook** | `.githooks/pre-push` enabled via `git config core.hooksPath .githooks` | Catches the violation BEFORE the push reaches the remote |
| **2. Required CI status check** | `.github/workflows/<gate>.yml` (per repo) OR a required-workflow ruleset pinned to the org's `.github` repo | Catches the violation on every PR; GitHub branch-protection ruleset blocks the merge button at the UI level |
| **3. Org-level required workflow** | `<org>/.github/.github/workflows/<gate>.yml` referenced by an org-level branch-protection ruleset SHA-pinned to a specific commit | Forces the gate on EVERY consumer repo; cannot be disabled in the consumer |
| **4. Pre-deploy gate** | The same script the CI runs, re-invoked as a step in every deploy workflow (staging + prod) | Catches a violation that somehow merged anyway (e.g., via an emergency admin override) — the deploy still aborts |
| **5. CODEOWNERS approval** | `.github/CODEOWNERS` requires security-team approval on every change to lockfiles, `package.json`, `.npmrc`, IaC files, gate scripts themselves | Prevents a single rogue PR from removing the gate |

A violation that bypasses layer 1 hits layer 2. A merged-anyway
violation that bypasses layers 1+2 hits layer 4. A change to the
gate itself hits layer 5. Bypassing all five requires multiple
org-admin actions, each audit-logged.

## Centralize controls in the org's `.github` repo

The canonical security gate (workflow + allowlists + cross-check
scripts) lives at:

```text
<org>/.github/
├── .github/
│   ├── workflows/
│   │   └── security-baseline.yml      # the actual gate
│   ├── CODEOWNERS                     # security-team owns gate edits
│   └── branch-protection-rulesets.md  # docs the org ruleset
└── docs/
    └── security-templates/            # consumer-repo templates
```

**Never put security allowlists in consumer repos.** A `docs/security-
exceptions.json` (or similar) in a consumer is a write-access bypass:
any contributor with push to that consumer can grant themselves
arbitrary exceptions. Allowlists + exceptions live in the org repo,
under CODEOWNERS approval by the security team.

This applies to:

- License-allowlist exceptions
- CVE-allowlist entries (LOW findings, unfixable advisories with
  documented non-exploitability)
- Secrets-scan allowlists (test fixtures, intentional public keys)
- Signed-commit bypass actors (none, ideally)
- Branch-protection bypass actors (none, ideally)

The org ruleset SHA-pins to a specific commit of `<org>/.github/main`
so a malicious push to `main` doesn't take effect until the SHA is
explicitly bumped (which requires security-team CODEOWNERS approval
on the ruleset config).

## Required-workflow SHA-pin lifecycle

1. New gate logic lands in `<org>/.github` via PR → security-team
   review → merge.
2. New `main` SHA on `<org>/.github` is calculated.
3. Org ruleset (e.g., `require-security-baseline`) is updated to pin
   the new SHA:

   ```bash
   gh api orgs/<org>/rulesets/<id> > /tmp/r.json
   jq '.rules[].parameters.workflows[0].sha = "<new-sha>"' \
     /tmp/r.json > /tmp/r-bumped.json
   gh api orgs/<org>/rulesets/<id> -X PUT --input /tmp/r-bumped.json
   ```

4. The next CI run on every consumer PR picks up the new gate
   logic. No consumer-side change needed.

## Gate-output contract

Every security gate produces a verification block the developer +
reviewer reads:

```text
Security baseline (this turn):
  pnpm audit (backend):        0 HIGH, 0 CRITICAL, 0 MODERATE
  pnpm audit (frontend):       0 HIGH, 0 CRITICAL, 0 MODERATE
  osv-scanner CVE scan:        0 MODERATE+ (1 LOW tracked)
  license-allowlist scan:      0 violations (4 carved out via cross-check)
  secrets scan:                clean
  signed commits:              all signed
  branch protection ruleset:   active

Status: PASS
```

A failing block names the specific blocker + the documented fix path:

```text
Security baseline (this turn):
  osv-scanner CVE scan:        1 MODERATE — qs@6.15.1 (CVSS 6.3)
                               Fix: pnpm.overrides "qs": ">=6.15.2"

Status: FAIL — blocking PR
```

## Documented exception flow

Real exceptions exist (an unpatched upstream, a transitive dep with
no exposure, a dev-only dep that never reaches production). The flow:

1. **Document in the org's `docs/security-advisories.md`** with:
   - The finding (CVE id, license value, secret pattern)
   - The affected package + version
   - The reachability analysis (why this isn't exploitable in our
     usage — code path, network exposure, runtime context)
   - The granting reviewer + date
   - An expiry date (typically 90 days)
2. **Add the corresponding allowlist entry** in the org workflow.
3. **PR review** by security-team CODEOWNERS — without their approval
   the exception cannot land (layer 5).
4. **On expiry**, the gate fails again until either the upstream
   patch lands or the exception is renewed with fresh justification.

## Reachability matters

Not every finding is a production risk. Document the reachability
analysis when an exception is justified:

- **Dev-only transitive** (e.g., a CLI tool's HTTP client): never
  runs in Lambda / browser; uses local credentials, not IMDS;
  documented as "dev tooling only."
- **Code-path unreachable** (e.g., a function we don't call): verified
  via CodeQL / staticcheck reachability; documented with the analysis.
- **Mitigated at runtime** (e.g., a SQL-injection risk in a function
  we always parameterize): documented + tested.

The exception document must enumerate the reachability path. "We
don't think it's exploitable" without analysis is not a documented
exception — it's wishful thinking.

## What the consumer repo carries

Consumer repos under this regime carry:

- A `.githooks/pre-push` symlink + the `git config core.hooksPath
  .githooks` setup documented in the README
- A `docs/security-advisories.md` listing the LOW findings tracked
  (NOT the exceptions — those are org-side)
- A `.github/CODEOWNERS` requiring security-team review on lockfile
  - IaC changes
- A `infra/verify-local.sh` (or equivalent) wiring the same gates CI
  runs, so `git push` triggers them locally

Consumers do NOT carry:

- The security-baseline workflow source (org repo owns it)
- Allowlist values (org repo owns them)
- Exception lists (org repo owns them)
- Ruleset SHA pins (org-level configuration)

## Cross-references

- `license-allowlist-gate.md` — license-check policy + Trove
  cross-check pattern
- `dependency-vulnerabilities.md` — CVE enforcement; 5-layer pattern
  applies to this gate too
- `security.md` — broader OWASP + secret-management baseline
- `done-criteria.md` — every "done" claim runs all 5 layers
- `deploy-failures-become-checks.md` — every deploy failure becomes
  a pre-deploy check (same family)
- `dependency-overrides-not-exceptions.md` — prefer fix-the-dep over
  add-an-exception

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Per-consumer security-exceptions file found (rule 2 violation — exceptions live in org repo)
- Layer skipped (e.g., pre-push hook bypassed via `--no-verify`) — defence-in-depth weakening
- Required-workflow ruleset's SHA pin not bumped after gate logic change (org-side drift)
- CODEOWNERS approval bypassed on a gate-script change (layer 5 weakening)
- Exception without expiry date (anti-pattern — permanent exception)
- New control class added but only enforced in 1-2 of 5 layers (rule needs broadening)
- Deploy pipeline running gates that differ from PR-time gates (CI vs deploy drift)
- Bypass actor allowlist non-empty for branch protection on `main` (configuration drift)

**Refinement candidates**:

- New row in the 5-layer table when a new enforcement surface emerges (e.g., MCP gateway, IDE plugin)
- Tightening of the SHA-pin lifecycle when a malicious-tag retargeting incident is observed
- New cross-reference when a sister rule (dependency-vulnerabilities, license-allowlist-gate) provides the gate this enforces
- New exception-flow row when a new exception class (vendor-pending-fix, etc.) recurs

---

<!-- ============================================================
     Section: secrets-management.md (from rules/common/)
     ============================================================ -->

# Secrets Management Rule (Global Default)

> Auto-fires on every file. Sister to `no-discards.md` (which already
> blocks hardcoded creds on save), `docker-localhost-binding.md`, and
> `security-controls-org-wide.md`.

## Core Principle

**No secret ever lives on disk in cleartext in a developer machine or
in any git history. Every secret is held in a secrets vault
(macOS Keychain via aws-vault, AWS Secrets Manager, Vault, 1Password
CLI, doppler, etc.) and surfaced to the process at runtime via env
vars / credential_process / sidecar.**

The four canonical failure modes this rule prevents:

1. A secret in `~/.aws/credentials` (or equivalent) plaintext, mode 644,
   readable by any process on the laptop.
2. A secret in a tracked `.env` / `.env.production` file in git
   history, fetchable by any past, present, or future contributor.
3. A secret in an example payload (Postman collection, fixture file,
   sample request) committed to a repo for convenience.
4. A secret echoed in CI logs, Slack messages, or screenshots.

Each is the leading cause of a real-world cloud breach over the past
decade. The fix in every case is the same shape: vault the secret,
reference it via env var at runtime, and gate the path with the
checks in this rule.

## Hard rules

### 1. Cloud credentials: vault, never disk

- AWS keys: `~/.aws/credentials` MUST NOT contain a long-term `AKIA…`
  key. The canonical pattern is:
  - The IAM key lives in macOS Keychain via `aws-vault add <profile>`.
  - `~/.aws/config` carries `credential_process = aws-vault exec
    --no-session --json <profile>` (or `--no-session` dropped when MFA
    is set up).
  - AWS CLI / SDK reads the key from Keychain transparently.
- Google Cloud: `gcloud auth login` (interactive) or short-lived
  workload-identity. Service-account JSON keys never on developer
  laptops.
- Azure: `az login` (interactive) or managed identity.
- GitHub: `gh auth login` stores the token in macOS Keychain (which
  `gh` uses by default since 2.x). Never paste a PAT into `.netrc`.

### 2. App-level secrets: env vars + secrets manager

For the application's own runtime secrets (Stripe, Twilio, OpenAI,
JWT signing keys, DB passwords, OAuth client secrets):

- **Production**: AWS Secrets Manager (preferred for AWS workloads),
  GCP Secret Manager, Vault, Doppler, or 1Password Secrets Automation.
  Service reads at startup via the cloud's IAM-bound credentials.
- **Local dev**: `.env` file (gitignored), populated from the same
  secrets manager via `aws secretsmanager get-secret-value` (or
  equivalent) on first checkout. Never check the populated `.env`
  into git.
- **Local LocalStack mocks** (where applicable): seed the same secrets
  into LocalStack Secrets Manager via the project's `init.sh` script.
  The app then reads from `host.docker.internal:4566` in development
  and from AWS in prod — same code path.

### 3. Gitignore patterns (mandatory in every repo)

Every project's root `.gitignore` MUST cover at least:

```gitignore
# Runtime secrets
.env
.env.*
!.env.example
!.env.template

# Cloud credentials
.aws/credentials
*.pem
*.key
*_rsa
*_rsa.pub        # public keys are safer than private but still personal
*_ed25519
*_ed25519.pub
id_rsa*
id_ed25519*

# Secrets managers
.vault-token
.netrc

# IDE per-user config
.idea/workspace.xml
.vscode/settings.json   # only if it has been seen to hold tokens

# Postman / Insomnia collections may carry per-environment responses
*.postman_environment.json
```

A repo MUST also `git ls-files | grep -E "^\.env(\.|$)"` empty. Any
`.env` tracked is a finding to fix.

### 4. Pre-commit secret scanning

Every repo runs `gitleaks` (or `trufflehog`) on `pre-commit` AND in
CI. The minimum config:

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/gitleaks/gitleaks
  rev: v8.21.4
  hooks:
    - id: gitleaks
```

CI step:

```yaml
- name: Secret scan
  uses: gitleaks/gitleaks-action@v2.3.9
  with:
    config-path: .gitleaks.toml
```

Findings block the commit / PR. False positives go to `.gitleaksignore`
with a one-line justification.

### 5. Postman / Insomnia / Bruno / API client collections

Two patterns are common pitfalls:

- **Example response bodies** containing real AWS presigned URLs (which
  include the AKIA key ID), real JWTs, real session cookies.
- **Environment files** with real prod tokens "for convenience".

Mandatory:

- Strip example responses before commit (`Postman → Save → Save without
  responses`). Or set the request to "Don't save responses".
- Use Postman `{{variable}}` syntax for tokens. The actual values live
  in an `*.postman_environment.json` that is **gitignored** by default.
- `.gitignore` MUST cover `*.postman_environment.json` and the
  `_history/` directories.

### 6. RSA / ed25519 private keys

NO private key ever enters git. Period.

Test fixtures that need a key pair (e.g. JWT signing tests, mTLS tests,
SSH host-key tests) MUST generate the key at test setup time:

```go
func TestJWTSigning(t *testing.T) {
    priv, err := rsa.GenerateKey(rand.Reader, 2048)
    require.NoError(t, err)
    // use priv during the test, discard at exit
}
```

The only key files allowed in a repo:

- `.pub` files (public material, used to verify signatures or pin
  hosts). These are not secret but they leak project shape — scrutinise
  why they need to be checked in.
- `.example` / `.template` placeholder PEMs with a 1-line "this is a
  generated test fixture, regenerate with X" comment at top.

### 7. Kubernetes secrets

Never commit a `Secret` manifest with `data:` base64-encoded creds in
plaintext. Patterns that ARE acceptable:

- **Sealed Secrets** (`bitnami-labs/sealed-secrets`): the
  `SealedSecret` CRD encrypts the value with the cluster's controller
  public key. Anyone can read the manifest, only the cluster can decrypt.
- **External Secrets Operator** (`external-secrets/external-secrets`):
  the `ExternalSecret` CRD references AWS Secrets Manager / Vault /
  GCP and the operator hydrates a `Secret` at runtime.
- **HashiCorp Vault sidecar** / Vault Agent Injector: pod annotations
  cause Vault to mount secrets into the container at boot.

If you see a `Secret` manifest with raw `data:` in any repo, it's a
finding.

### 8. Secret rotation policy

- AWS IAM long-term keys: rotated every 90 days at minimum. Audit via
  `aws iam list-access-keys --user-name <u> --query 'AccessKeyMetadata[?CreateDate<=`2025-02-01`]'`.
  Prefer IAM Identity Center (SSO) over long-term keys entirely.
- JWT signing keys: rotated quarterly, with an in-flight overlap
  window so existing tokens stay valid until expiry.
- Stripe live keys: rotated only on incident or staff turnover (Stripe
  doesn't recommend prophylactic rotation; their guidance is to rotate
  on compromise signal).
- OAuth client secrets: rotated when a team member with access leaves.
- DB passwords: rotated via secrets-manager versioning, app rolls on
  next deploy.

### 9. When a secret is suspected exposed

The recovery flow (in this exact order):

1. **Rotate FIRST**, scrub LATER. Generate a new credential and
   deactivate / delete the old one in the issuer's console. The window
   between "I think it leaked" and "the old key still works" is the
   real risk; cutting that window to minutes is the highest-leverage
   move.
2. **Audit access logs** for the exposed credential's use during the
   exposure window. AWS CloudTrail, GitHub audit log, Stripe Dashboard
   → Logs, etc.
3. **Scrub the git history** with `git filter-repo --invert-paths
   --path <file>` (or BFG Repo Cleaner). Force-push the rewritten
   history (coordinate with team — everyone needs to re-clone).
4. **Document** the incident in `docs/security-incidents.md` (or the
   project equivalent) with date, scope, evidence of misuse (or none),
   and remediation timeline.

NEVER skip step 1. Scrubbing without rotating is theatre.

## What this rule means for new repos

Every new repo Claude creates (or first-touches) follows the checklist
in `repo-setup-checklist.md` § "Secrets surface", which includes:

- `.gitignore` covers .env, *.pem,*.key, etc.
- Pre-commit hook with gitleaks
- `.env.example` exists with placeholders (no real values)
- `docs/secrets.md` documents where each secret comes from (AWS
  Secrets Manager / aws-vault / etc.)
- CI runs a secret-scan job

## Cross-references

- `repo-setup-checklist.md` — the "first contact with a repo" checklist
- `no-discards.md` — the PostToolUse hook already rejects edits that
  introduce hardcoded credentials with the canonical prefixes
- `docker-localhost-binding.md` — ports-side counterpart to this rule
- `security-controls-org-wide.md` — 5-layer enforcement pattern
- `no-overclaim.md` — never claim "done" on a security task without
  the rotation + history scrub steps both completed

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Long-term AWS access key (`AKIA...`) found in `~/.aws/credentials` (rule 1 violation — Keychain via aws-vault required)
- `.env` tracked by git (rule 3 violation)
- Private key (`*.pem`, `*.key`, `id_rsa*`) found in repo (rule 6 violation)
- Postman / Insomnia collection committed with real response bodies (rule 5 violation)
- Kubernetes `Secret` manifest with raw `data:` (rule 7 violation — Sealed/External Secrets required)
- Rotation done step-by-step instead of via atomic script (per `proper-fixes-first.md`)
- Suspected exposure: scrub attempted before rotation (rule 9 violation — rotate FIRST)
- Pre-commit hook missing or not catching the leak in CI
- Secret format-validation skipped on push to vault

**Refinement candidates**:

- New vault provider row when a new secrets manager gains adoption
- Tightening of the rotation cadence table when a regulator (PCI / SOC2) updates frequency requirements
- New banned-pattern entry when a new credential prefix shape recurs
- New cross-reference when a sister rule (no-discards, install-allowlist) provides complementary hook enforcement

---

<!-- ============================================================
     Section: audit-logging.md (from rules/common/)
     ============================================================ -->

# Audit Logging Rule (Always-On, Global)

> Auto-fires on every file. Sister to `observability.md` (operational
> logs ≠ audit logs), `log-levels.md` (audit is INFO+), `security.md`
> A09 (security logging), `gdpr-ccpa.md` (subject-access requests
> include audit history), `error-codes.md`, `runbook-template.md`.
> Standards: **NIST SP 800-92** (log management), **ISO/IEC 27001
> Annex A.8.15** (logging), **PCI-DSS 4.0 Requirement 10**,
> **SOC 2 Trust Services Criteria CC7**, **HIPAA §164.312(b)**.

## Core Principle

**Every security-relevant, compliance-relevant, or
state-changing event MUST be recorded in an immutable, tamper-
evident audit log that answers: WHO did WHAT on WHICH RESOURCE
WHEN FROM WHERE WITH WHAT OUTCOME. Audit logs are separate from
operational logs, retained on a different schedule, and have
stricter integrity controls.**

Operational logs answer "what is the system doing right now?"
Audit logs answer "what did this user / actor do, and can we
prove it in a regulator's office?"

## Operational logs vs audit logs

| Dimension | Operational logs | Audit logs |
| --- | --- | --- |
| **Purpose** | Debug, monitor, alert | Compliance, forensics, accountability |
| **Audience** | Engineers, on-call | Security team, auditors, courts |
| **Retention** | 7-90 days typical | Years (regulated: 7+ years often) |
| **Mutability** | Rotated, sometimes overwritten | Append-only, integrity-verified |
| **Severity scope** | DEBUG → FATAL | INFO (audit events are normal lifecycle) |
| **Schema** | Flexible, evolves | Fixed canonical structure |
| **Storage** | CloudWatch, Loki, Datadog | Dedicated audit store (separate access policy) |
| **Access** | Engineering team | Security/compliance team only |

The two streams MAY share infrastructure but MUST be logically
separated. Operational log retention policies cannot truncate
audit data.

## What MUST be audit-logged

### Authentication events

- Successful login (with auth method: password, OAuth, SAML, SSO)
- Failed login (with reason: bad credential, account locked, MFA
  failed, account disabled)
- Logout (explicit + session expiry)
- Password change / reset
- MFA enrollment, MFA bypass attempts
- API key / token issued, rotated, revoked
- Session hijack indicator (sudden IP/device change)

### Authorization events

- Permission grant / revoke (role, group, ACL change)
- Privilege elevation (sudo, admin assumption, impersonation
  start/end)
- Access denial (RBAC denial — actor tried but lacked permission)
- Resource sharing change (made public, made private, link shared)

### Data access — sensitive

- Read of personal data (per `gdpr-ccpa.md` — required for DSAR
  history)
- Read of payment data (per PCI-DSS)
- Read of health data (per HIPAA)
- Bulk export / download
- Search queries that return sensitive fields

### Data mutation

- Create / update / delete of business-critical entities
  (accounts, orders, invoices, customer records)
- Configuration changes (feature flags per `feature-flags.md`,
  service settings, security rules)
- Schema migrations
- Mass updates (bulk operations affecting >N records)

### Administrative actions

- User account create / disable / delete
- Role changes
- Billing changes (subscription, plan tier, payment method)
- System parameter changes
- Compliance setting changes (data residency, retention policy)

### Security-sensitive operations

- Encryption key creation / rotation / destruction
- Certificate provisioning / revocation
- Secret access (vault read)
- Cross-tenant data access (must be RARE + always-justified)
- Webhook signing-key rotation
- Anti-fraud rule changes

### External integrations

- OAuth grants (which app, which scopes)
- Webhook subscriptions created / modified
- API integrations linked
- Data exports to third parties

## Canonical audit event shape

Every audit event is a structured record with these fields:

```jsonc
{
  // Identity
  "event_id": "01HXXXXX...",            // ULID; globally unique
  "timestamp": "2026-05-26T14:32:18.342Z",  // RFC 3339, UTC, ms precision
  "event_type": "user.login.success",   // dotted namespace; see catalog
  "event_version": 1,                   // schema version of this event_type

  // Actor — WHO did the thing
  "actor": {
    "type": "user",                     // user | service | system | api_key
    "id": "usr_abc123",
    "display": "alice@example.com",
    "tenant_id": "org_xyz789",
    "session_id": "sess_qrs456"         // null if applicable
  },

  // Subject — WHAT was acted upon
  "subject": {
    "type": "order",
    "id": "ord_def456",
    "tenant_id": "org_xyz789"
  },

  // Action — WHAT was done
  "action": "update",                   // create | read | update | delete | invoke | grant | revoke
  "outcome": "success",                 // success | failure | partial
  "reason_code": null,                  // populated on failure — see error-codes.md

  // Change details — before / after for mutations
  "changes": {
    "fields": ["status", "shipping_address"],
    "before": {"status": "pending", "shipping_address": "..."},
    "after":  {"status": "shipped",  "shipping_address": "..."}
  },

  // Context — FROM WHERE + HOW
  "context": {
    "request_id": "req_ghi789",          // correlates to operational logs
    "trace_id": "abc123...",             // W3C trace context
    "ip_address_hash": "sha256:...",     // hashed per `gdpr-ccpa.md`
    "user_agent": "...",
    "geo": {"country": "US", "region": "CA"},
    "auth_method": "password+totp",
    "api_version": "v2"
  },

  // Integrity
  "prev_event_hash": "sha256:...",       // chain anchor — see Hash chaining below
  "event_hash": "sha256:..."             // SHA-256 of canonical JSON of this event
}
```

## Hard rules

### 1. Audit events are emitted IN the same transaction as the change

For database-backed mutations: insert the audit row in the same
DB transaction as the business-data write. If the transaction
rolls back, so does the audit row. Otherwise the audit log
becomes a lie ("we recorded the action that didn't happen").

For non-transactional systems: emit the audit event via
**outbox pattern** — write to a local outbox in the same
transaction, then a worker forwards to the audit store. Failure
modes are limited to "audit delivery delayed" (caught by
monitoring), not "audit lost."

### 2. Append-only storage

Audit records are NEVER updated or deleted. Append-only is enforced
at the storage layer:

- **PostgreSQL**: revoked UPDATE/DELETE grants on the audit table;
  trigger blocks any update; partition by month + only INSERT
  allowed
- **Dedicated audit DB**: AWS CloudWatch Logs (write-once),
  Datadog Audit Trail, Splunk Enterprise Security
- **Blockchain-anchored** (extreme regulated environments): hash
  daily summary to a public chain (Ethereum, Bitcoin) for
  tamper-evidence

### 3. Hash-chained integrity

Each event references the hash of the previous event for the same
tenant + event_type stream. Tampering with any event invalidates
the chain for every later event in that stream:

```text
event N:
  prev_event_hash = sha256(canonical_json(event N-1))
  event_hash = sha256(canonical_json(event N))
```

Daily / hourly Merkle-tree root commits provide bulk integrity
verification. Storage compromised? The chain breaks; alerts fire.

### 4. PII handling within audit logs

Audit logs DO need to identify subjects + actors. But:

- **Hash IP addresses** — `sha256(ip + per-tenant salt)` to allow
  same-actor correlation without storing the raw IP (per
  `gdpr-ccpa.md` EU restrictions)
- **Pseudonymise email** in display fields — store the user_id,
  resolve to email via the user table when generating reports
- **Never log credentials** — passwords, tokens, API keys, even
  hashed (forensics doesn't need them)
- **Mask sensitive change diffs** — for fields like SSN, credit
  card number, the diff records "field changed" but not the
  before/after values; the values are queryable from the source
  with separate access controls

### 5. Failed actions audit-log too

Successful operations are obvious; failures are arguably more
important. Failed login attempts, denied access, blocked
mutations — all logged. The `outcome: "failure"` + `reason_code`
fields capture the WHY.

### 6. Read access to sensitive data IS an event

Reads of GDPR-personal-data, PCI-payment-data, HIPAA-health-data
are audit events. The "I just searched for customers named
Smith" query against the CRM IS logged with the search criteria,
result count, and actor.

For high-volume systems where logging every read is impractical:
log at the access-path level (which endpoint was hit, with what
filters) instead of every record. Combined with per-tenant /
per-actor rate-limit metrics, this is acceptable.

### 7. Retention is regulation-driven

| Data class | Minimum retention |
| --- | --- |
| GDPR access logs (DSAR support) | 3 years |
| PCI-DSS log records | 1 year, 3 months online + archive |
| SOC 2 audit trail | 1 year |
| HIPAA audit records | 6 years |
| Financial records (SOX) | 7 years |
| Tax / billing audit | 7-10 years |

Retain at the LONGEST applicable. NEVER prune before the longest
retention requirement.

### 8. Access to audit logs is itself audit-logged

The audit log read endpoint is a sensitive resource. Reads of the
audit log emit `audit.access` events (in a separate
meta-audit stream that catches tampering attempts).

### 9. Standardised event type catalog

Every event_type follows a documented schema:

```yaml
event_type: user.login.success
schema_version: 1
description: Successful user authentication.
required_fields: [actor.id, context.auth_method, context.ip_address_hash]
retention_years: 3
compliance_tags: [gdpr, soc2]
```

The catalog lives at `docs/audit-events.md` (or equivalent) and
is updated in the SAME PR as the code that emits a new event
type.

### 10. Time-sync is critical

Audit logs MUST use UTC + millisecond precision + NTP-synced
clocks (every host syncs to a trusted source — AWS Time Sync
Service, Google Public NTP, internal NTP). Clock drift > 1
second is an alert; chain-of-custody depends on timestamp
ordering.

## Cross-tenant isolation

In a multi-tenant system:

- Every audit event carries `tenant_id` on BOTH actor + subject
- Cross-tenant access is rare + special — when it happens
  (admin support, cross-tenant report), the event MUST include
  both tenant IDs + a justification field (`reason: "support
  ticket SUP-12345"`)
- Tenants can query their own audit log (per `gdpr-ccpa.md`
  access right) but not others'
- Internal admins querying multi-tenant audit data MUST do so
  through a logged tool, not raw DB access

## Per-language implementation

| Language | Audit library / pattern |
| --- | --- |
| Node.js | OpenTelemetry events + dedicated `audit` logger via pino with redact paths |
| Go | `slog` with audit-specific handler + outbox writer |
| Python | `audit-logger` library OR custom structlog wrapper |
| Java | Spring Security `AuditEventRepository` + outbox |
| Ruby | `audited` gem + outbox forward to dedicated store |
| .NET | `Microsoft.Extensions.Logging` with an audit sink |

Per `reuse-first.md` — pick ONE audit framework per service; don't
emit ad-hoc events.

## Anti-patterns

### Anti-pattern 1: Operational log doubling as audit log

Routing audit events through CloudWatch Logs with a 30-day
retention defeats the point. Audit needs its own store, its own
retention, its own access policy.

### Anti-pattern 2: Logging only on success

The failed-action audit is often the most important one. Login
failures point at credential stuffing; access denials point at
privilege confusion; mutation rejections point at validation
bypass attempts.

### Anti-pattern 3: Mutable audit log

If anyone with DB access can `UPDATE audit_log SET ...`, the
audit log isn't an audit log — it's a chronicle. Enforce
append-only at the schema level.

### Anti-pattern 4: PII in audit fields

Storing raw IP, raw email, full DOB in audit records makes
the audit log a privacy hazard. Hash, tokenize, or reference
the canonical source.

### Anti-pattern 5: One audit stream for everything

When the audit log contains "user clicked a button" alongside
"admin granted root", finding the security signal in the noise
is impossible. Separate streams by event class:
authentication, authorization, data access, admin actions.

## Tooling

| Tool | Use |
| --- | --- |
| **AWS CloudTrail** | AWS API audit; mandatory for any AWS workload |
| **AWS Config** | Resource config history |
| **Datadog Audit Trail** | Dedicated audit store |
| **Splunk Enterprise Security** | Security + compliance audit |
| **Elastic Audit Beat** | Self-hosted audit collection |
| **OpenTelemetry Logs** | Standardised pipeline (vendor-neutral) |
| **Auth0 / Okta Audit** | Identity-side audit |
| **Sysdig / Falco** | Container + Kubernetes audit |

## Cross-references

- `observability.md` — operational vs audit log distinction
- `log-levels.md` — audit events are INFO+
- `security.md` A09 — security logging requirements
- `gdpr-ccpa.md` — audit logs support DSAR + breach investigations
- `error-codes.md` — `reason_code` field maps to stable error
  codes on failure
- `runbook-template.md` — incident response references audit log
- `feature-flags.md` — flag changes are audit events
- `task-intake-due-diligence.md` Q11 (compliance), Q15
  (observability)

## Standards cited

- **NIST SP 800-92** — Guide to Computer Security Log Management
- **ISO/IEC 27001:2022 Annex A.8.15** — Logging
- **PCI-DSS 4.0 Requirement 10** — Log + monitor access
- **SOC 2 Trust Services Criteria CC7** — Security incidents +
  evidence
- **HIPAA §164.312(b)** — Audit controls
- **GDPR Article 30** — Records of processing activities
- **SOX §404** — Internal controls (audit trail)
- **RFC 3339** — Timestamp format
- **W3C Trace Context** — `trace_id` propagation

## Why this rule exists

Audit logs are the difference between "we think this happened"
and "we can prove this happened." In every compliance audit,
breach investigation, and customer dispute, the audit log is the
primary evidence. Without it:

- Forensic teams cannot trace a breach back to its origin
- Regulators issue fines for missing controls (GDPR Article 30,
  SOX 404, PCI-DSS 10)
- Customers cannot get answers about who accessed their data
  (DSAR failure)
- Insider threats are invisible until they cause customer harm
- Legal disputes are decided on the other side's evidence

The cost of audit logging at design time is one outbox table + a
dedicated audit sink + retention policy. The cost of missing
audit logs is incidents you cannot investigate and fines you
cannot defend.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Audit event emitted on success but not on failure (rule 5 weakening — failed actions are often the most important)
- PII surfacing in audit fields (rule 4 PII-handling violation)
- Audit event not in the same DB transaction as the business write (rule 1 weakening — audit becomes a lie when txn rolls back)
- Mutable audit log discovered (append-only enforcement gap)
- New event class shipped without a schema entry in `docs/audit-events.md` (catalog discipline weak)
- Retention window too short for the applicable regulation (regulation-driven retention drift)
- Cross-tenant access without `reason` field justification (cross-tenant isolation weak)
- Clock drift > 1 second tolerated (chain-of-custody risk)

**Refinement candidates**:

- New event class in the catalog when a new security-relevant operation emerges
- New required field when forensics consistently needs a dimension the canonical shape lacks
- Tightening of retention minimums when a regulation update lengthens the floor
- New cross-reference when a sister rule (gdpr-ccpa, security A09) prescribes audit semantics not yet captured

---

<!-- ============================================================
     Section: official-docs-first.md (from rules/common/)
     ============================================================ -->

# Official-Docs-First Rule (Always-On, Global)

> Auto-fires on every file. Sister to `done-criteria.md`, `no-discards.md`,
> `no-silent-failures.md`, and `docs-sync-with-code.md`.

## Core Principle

**Before writing ANY integration code against an external provider, the
agent MUST read and cite the provider's canonical developer
documentation for the specific API surface being touched.**

"External provider" means anything the codebase calls out to that isn't
its own infrastructure: identity providers (OIDC, OAuth, SAML, LDAP),
calendar / mail / messaging APIs (Google, Microsoft, Zoho, Slack,
Twilio, SendGrid, SES), payment processors (Stripe, Adyen, Paystack,
Flutterwave), push services (FCM, APNs, web push / VAPID), object
stores (S3, GCS, Azure Blob, R2), ML / AI vendors (Bedrock, OpenAI,
Anthropic, Replicate), observability (Datadog, Honeycomb, Sentry,
Grafana Cloud), background-job platforms, mobile push platforms,
analytics SDKs.

The pattern this rule prevents: integration code that *looks* right
because it follows the npm package's README example but breaks in
production because the README and the provider's docs disagree, or
because the README is silent on an edge case that the official docs
spell out (token-rotation cadence, scope deprecations, tenant-policy
rejection codes, retry semantics, content-encoding requirements).

## Hard rules

1. **Locate and read the provider's CANONICAL developer documentation
   for the specific API surface.** Not Stack Overflow. Not a blog post.
   Not the README of an npm package wrapping the provider. The
   provider's own docs at the provider's own domain (e.g.
   `developers.google.com`, `learn.microsoft.com`, `stripe.com/docs`,
   `developer.apple.com`).

2. **Confirm the auth model from the official docs:** OAuth 2.0 / OIDC
   scopes (and which scopes are deprecated), app-specific passwords,
   service accounts, IAM federation, mTLS, signed JWT
   client-assertion. Token lifetime, refresh semantics, what
   `invalid_grant` actually means for *that* provider.

3. **Cite primary-source URLs in the implementation plan** before the
   first handler / lib file is written. Plan files live at
   `~/.claude/plans/` (or per-project equivalent) and must include an
   "ONLINE RESEARCH" section with at least one canonical URL + section
   per major integration point.

4. **For business / commercial vs personal-tier products, research
   BOTH and document which is supported.** Many providers split:
   - Google Workspace vs personal Gmail
   - Microsoft 365 commercial tenants vs personal Outlook.com / MSA
   - iCloud+ custom-domain vs personal `@icloud.com`
   - Zoho Workplace (business) vs `@zoho.com` (personal)
   - Slack Enterprise Grid vs free workspace
   - Fastmail Business vs personal Fastmail

   The auth model, available scopes, tenant-policy options, and
   billing differ. State explicitly which tier is in scope and how
   the code rejects the other.

5. **If primary-source docs are paywalled / restricted / unavailable,
   surface the risk to the user BEFORE writing code.** Don't guess
   from the npm package's example and ship.

6. **Stub or example code from the library's GitHub README is NOT a
   substitute for the official docs.** The provider's docs win on any
   behaviour question. The library may be out of date, may handle a
   scope the provider has since removed, may omit edge cases.

## What "canonical" looks like per common providers

The table below names the canonical doc surface — start here, then
deep-link as needed.

| Provider | Canonical entry point |
| --- | --- |
| Google Workspace APIs | `developers.google.com/workspace` (per-product subpages: Calendar, Drive, People, Admin SDK) |
| Microsoft Graph | `learn.microsoft.com/en-us/graph/` (resources, permissions, change notifications) |
| OpenID Connect | `openid.net/specs/openid-connect-core-1_0.html` (the spec itself; library docs second) |
| OAuth 2.1 / 2.0 | `datatracker.ietf.org/doc/html/rfc6749`, `datatracker.ietf.org/doc/html/rfc7636` (PKCE) |
| Apple ID + SSO | `developer.apple.com/documentation/signinwithapplerestapi` |
| Slack APIs | `api.slack.com/docs` |
| Stripe | `stripe.com/docs/api`, `stripe.com/docs/webhooks/signatures` |
| AWS | `docs.aws.amazon.com/<service>/latest/<APIReference,DeveloperGuide>/` |
| Web Push / VAPID | RFC 8030, RFC 8291, RFC 8292; W3C Push API spec |
| Zoho | `zoho.com/<product>/help/api` (Workplace, Mail, CRM each separate) |
| CalDAV | RFC 4791, RFC 6638 (scheduling); plus each server's deviation notes |
| CardDAV | RFC 6352 |
| iCal / iCalendar | RFC 5545, RFC 5546 (iTIP), RFC 6047 (iMIP) |
| FCM | `firebase.google.com/docs/cloud-messaging` |
| APNs | `developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server` |
| Twilio | `twilio.com/docs/api` |

When the provider names a specific RFC for an interoperable protocol
(CalDAV → 4791, OAuth → 6749), the RFC is the authoritative reference
even if the provider has its own quirks doc.

## Plan-file contract

Every plan that introduces a new integration must include a section:

```markdown
## ONLINE RESEARCH (per official-docs-first rule)

### <Provider name>
- **API surface**: Calendar Events, push notifications subscribe
- **Auth model**: OAuth 2.0 + offline_access for refresh tokens; PKCE recommended
- **Primary sources read**:
  - https://developers.google.com/calendar/api/guides/push (push channel TTL = 7 days)
  - https://developers.google.com/identity/protocols/oauth2/scopes#calendar (scope list)
  - https://developers.google.com/calendar/api/v3/reference/events/watch (subscribe request shape)
- **Risks identified**:
  - Push channel auto-expires every 7 days; need re-subscribe cron
  - Workspace admins can globally restrict the app via Marketplace policy
  - Personal Gmail accounts present but out of scope per business-only policy
```

Plan-mode work that lacks this section MUST NOT proceed to implementation.
The Architecture & Planning division refuses to sign Phase 0 without it.

## What we read does not stay implicit

The cited URLs go in:

1. The plan file (as above).
2. The `docs/provider-research/<provider>.md` file (one per provider) —
   so the citations survive after the plan archive rolls.
3. The PR description summary table.

Code comments do NOT carry the URLs (they rot — see `coding-style.md`
ban on tracker pointers in comments). The provider-research file is
the durable home.

## When to re-read the docs

- A new feature on an already-integrated provider — re-read the
  relevant subpage even if you wrote the integration last month.
- Provider deprecation notice received — re-read the migration guide
  before any change.
- Provider returns an unexpected error code — read the docs for that
  code before writing a retry / fallback.
- More than 6 months since the integration was authored — re-read
  before the next non-trivial change.

## Why this rule exists

A recent calendar / social-login feature was implemented against the
npm packages' READMEs without reading Google Workspace's actual scope
deprecation cadence, Microsoft Graph's commercial-vs-personal-tenant
`tid` claim, or Zoho Workplace's Application-Specific Password format.
The code looked right and passed local tests; production exposed
multiple edge cases the README didn't cover. The fix path was:

1. Stop the line.
2. Backfill `docs/provider-research/<provider>.md` with primary-source
   citations.
3. Re-derive the integration shape from the citations.
4. Re-write the code against the now-known contract.

The cost of reading the docs once at plan time is one hour. The cost
of debugging an integration built on guesses is days plus a P1
incident.

## Cross-references

- `done-criteria.md` — "done" claims require the provider-research
  file to exist and to be up to date.
- `docs-sync-with-code.md` — provider-research files are part of the
  docs-sync gate.
- `no-overclaim.md` — "the integration works" isn't done until the
  citations exist.
- Council protocol Phase 0 (`~/.claude/CLAUDE.md`) — Architecture &
  Planning division enforces this rule.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `docs/provider-research/<provider>.md` missing for an integration that shipped (rule violation pattern)
- Provider-research note > 6 months stale and integration touched without refresh (cadence rule needs reinforcement)
- Integration shaped from npm README / Stack Overflow instead of provider docs (Phase 0 discipline weak)
- Personal-tier vs commercial-tier scope unclear — boundary missing (rule needs new section example)
- Auth model assumed instead of cited (recurring shortcut pattern)
- Deprecation notice from provider arrived but integration not re-read (cadence rule needs reinforcement)
- Same provider integrated by multiple agents independently (candidate for shared provider-research template)

**Refinement candidates**:

- New canonical-doc-surface entry when a provider's docs need named anchor (table extension)
- New anti-pattern entry when a shortcut recurs across 2+ integrations
- Tightening of the 6-month refresh cadence when provider deprecations get missed
- New pairing entry when sister rules consistently catch what this rule misses

---
