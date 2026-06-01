---
name: security-review
description: Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns.
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
+ [`pci-dss-patterns`](../pci-dss-patterns/SKILL.md). Payment
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
detection. Tie to `~/.claude/rules/common/rate-limiting.md`
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
  + IaC + monitoring deep-dive (361-line checklist for AWS, Vercel,
  Railway, Cloudflare, Terraform, GitHub Actions)
- `~/.claude/skills/owasp-asvs/SKILL.md` — ASVS catalogue
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — privacy lens
- `~/.claude/skills/iso27001-controls/SKILL.md` — ISMS Annex A
- `~/.claude/skills/soc2-readiness/SKILL.md` — TSC mapping
- `~/.claude/skills/pci-dss-patterns/SKILL.md` — payment data scope
- `~/.claude/rules/common/security.md` — global umbrella
- `~/.claude/rules/common/secrets-management.md` — secrets posture
- `~/.claude/rules/common/dependency-vulnerabilities.md` — CVE gate
- `~/.claude/rules/common/rate-limiting.md` — throttle defence
- `~/.claude/rules/common/audit-logging.md` — auditable actions
- `~/.claude/rules/common/error-handling-with-context.md` — error
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
+ public endpoint. Teams that adopt these ship features without
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
