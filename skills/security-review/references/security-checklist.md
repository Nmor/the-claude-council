# security-review: Security Checklist

> Covers **Security Checklist** for the `security-review` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 20 KB** — `token-budget.mjs --check`.

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

Sister skills: [`payment-processing-patterns`](../../payment-processing-patterns/SKILL.md)

- [`pci-dss-patterns`](../../pci-dss-patterns/SKILL.md). Payment
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
