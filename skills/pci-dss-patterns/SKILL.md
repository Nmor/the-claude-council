---
name: pci-dss-patterns
description: PCI-DSS v4.0 implementation patterns for systems that store, process, or transmit cardholder data — scope reduction via tokenization, SAQ selection, segmentation, encryption requirements, and the 12 PCI-DSS requirements mapped to concrete engineering controls.
---

# PCI-DSS Patterns

> Standards: **PCI-DSS v4.0.1** (effective 31 March 2025), **PCI-DSS v3.2.1** (sunset 31 March 2024), **PCI SSC Tokenization Product Security Guidelines**, **PA-DSS** (legacy — now PCI Software Security Framework), **EMVCo 3-D Secure 2.x**, **PSD2 SCA (Regulatory Technical Standards EU 2018/389)**, **NIST SP 800-63B** (auth), **NIST SP 800-53 Rev 5** (control mapping).

## Purpose

PCI-DSS (Payment Card Industry Data Security Standard) governs every system that stores, processes, or transmits cardholder data (CHD) or sensitive authentication data (SAD) on behalf of a merchant accepting Visa / Mastercard / American Express / Discover / JCB. Non-compliance results in card-brand fines (~$5K-$100K/month), increased per-transaction fees, loss of payment processing privileges, and personal liability for executives in the event of a breach.

This skill teaches the **scope-reduction-first** mindset: the cheapest way to be PCI-DSS compliant is to never touch cardholder data. Modern payment integrations (Stripe Elements, Adyen Components, Square SDK, Braintree Hosted Fields) tokenize cards in the browser/app so the merchant's servers never see a PAN. This collapses PCI scope from SAQ D (the hardest, ~400 controls) to SAQ A (the easiest, ~22 controls).

When tokenization isn't possible (in-person POS, voice IVR, direct card processing), this skill names the concrete controls required: network segmentation, encryption at rest with key management, strict access controls, vulnerability scanning, penetration testing, and audit logging.

## Standards Cited

- **PCI-DSS v4.0.1** §1-§12 (the 12 core requirements, effective 31 March 2025)
- **PCI-DSS v4.0** §3.2 — SAD must never be stored after authorization
- **PCI-DSS v4.0** §3.4 — PAN must be unreadable wherever stored (encryption, truncation, tokenization, or hashing)
- **PCI-DSS v4.0** §3.6 — Key management lifecycle (generation, distribution, storage, rotation, retirement)
- **PCI-DSS v4.0** §4.2 — Strong cryptography in transit (TLS 1.2 minimum; TLS 1.3 recommended; legacy SSL/early TLS prohibited)
- **PCI-DSS v4.0** §6.4.3 — Inventory + integrity verification of payment-page scripts (anti-Magecart)
- **PCI-DSS v4.0** §8.3.6 — Password minimum length increased from 7 to 12 characters
- **PCI-DSS v4.0** §10.7 — Log retention: 1 year minimum, 3 months immediately accessible
- **PCI-DSS v4.0** §11.3 — External vulnerability scans quarterly by ASV
- **PCI-DSS v4.0** §11.4 — Penetration testing at least annually
- **PCI-DSS v4.0** §12 — Information security policy + risk assessment
- **PCI SSC SAQ Instructions and Guidelines** — SAQ types A, A-EP, B, B-IP, C, C-VT, D, P2PE
- **EMVCo 3DS 2.2** — Frictionless authentication + SCA exemptions
- **PSD2 RTS for SCA** — EU strong customer authentication requirements
- **NIST SP 800-57 Part 1 Rev 5** — Key management recommendations

## When to Fire

- Any code that accepts, transmits, stores, or processes cardholder data (CHD = PAN + cardholder name + expiry + service code)
- Any code touching sensitive authentication data (SAD = full track data, CAV2/CVC2/CVV2/CID, PIN/PIN block) — note SAD MUST NOT be stored after authorization
- Selecting / integrating a payment processor (Stripe, Adyen, Braintree, Square, Authorize.Net, Worldpay, Checkout.com)
- Designing checkout flows (hosted page vs iframe vs direct API)
- Building card-on-file functionality (vault, recurring billing, one-click checkout)
- Setting up a POS system or terminal integration (P2PE)
- Quarterly ASV scans, annual pentest, annual ROC/SAQ submission
- Any change to the cardholder data environment (CDE): network segmentation, firewall rules, infrastructure-as-code touching payment-handling services
- Refund / chargeback / dispute handling flows
- Adding 3-D Secure 2.x for SCA compliance

## Core Patterns

### Pattern 1: Scope reduction via tokenization (the prime directive)

Every PCI-DSS engineering decision starts with: **how do we keep cardholder data off our servers?**

| Approach | Merchant PCI scope | Implementation |
| --- | --- | --- |
| **Stripe Elements / Adyen Components / Braintree Hosted Fields** | SAQ A | Card data captured by iframe-served fields; PSP returns opaque token; merchant stores token only |
| **Stripe Checkout / Adyen Pay-by-Link / hosted payment page** | SAQ A | Full redirect to PSP-hosted page; merchant never sees card |
| **Stripe Terminal / Square Reader (P2PE-certified)** | SAQ P2PE | Card data encrypted at the reader; only PSP can decrypt |
| **Direct API integration** (card data POST to merchant server) | SAQ D | All ~300 PCI-DSS controls apply; rarely justified |

**Anti-pattern**: "We want full control over the checkout UX so we'll handle card data ourselves." The cost of SAQ D (segmented PCI environment, quarterly ASV scans, annual pentest, ~$200K/yr operational overhead, dedicated security engineers) almost never justifies the UX gain. Modern Elements/Components are visually customizable and meet 99% of UX requirements.

### Pattern 2: Never store sensitive authentication data (SAD)

PCI-DSS v4.0 §3.2 — SAD MUST NOT be stored after authorization, even if encrypted:

```typescript
// FORBIDDEN — storing CVV after authorization
interface PaymentRecord {
  pan: string;       // can be stored if encrypted/truncated/tokenized
  expiry: string;    // can be stored
  cvv: string;       // ❌ NEVER stored after auth — violation of §3.2
  trackData: string; // ❌ NEVER stored
  pin: string;       // ❌ NEVER stored
}

// CORRECT — keep only what's strictly required
interface PaymentRecord {
  stripePaymentMethodId: string;  // token from Stripe; not the actual card
  last4: string;                  // OK — for display
  brand: string;                  // OK — for display
  expiryMonth: number;            // OK — for retry logic
  expiryYear: number;             // OK
  // No CVV, no track data, no PIN — ever
}
```

The grep that proves it:

```bash
grep -rE "(cvv|cvc|cvv2|cvc2|cav2|track1|track2|pinblock)" \
  --include="*.{ts,js,py,rb,go,java,sql}" \
  --exclude-dir=node_modules .
# Must return zero matches in storage code (DB schemas, models, logs, snapshots)
```

### Pattern 3: SAQ selection (the operational reality)

| SAQ | Scope | Card data flow | Controls |
| --- | --- | --- | --- |
| **SAQ A** | E-commerce, fully outsourced | All CHD handling outsourced to PCI-DSS-validated TPSP (Stripe, etc.) | ~22 controls |
| **SAQ A-EP** | E-commerce, payment page partially controlled | Merchant page contains JS that affects payment page | ~191 controls |
| **SAQ B** | Imprint or standalone dial-out terminals | No electronic storage | ~41 controls |
| **SAQ B-IP** | Standalone IP-connected terminals | No electronic storage; IP-connected | ~83 controls |
| **SAQ C** | Payment app on internet-connected system | App processes CHD; segmented | ~160 controls |
| **SAQ C-VT** | Virtual terminal | Manual key-in; isolated | ~79 controls |
| **SAQ D** | All others | Stores/processes/transmits CHD | ~300+ controls |
| **SAQ P2PE** | P2PE-validated solution | Hardware-encrypted reader | ~33 controls |

Default goal: stay on **SAQ A**. Every architectural decision that pushes you toward SAQ A-EP or higher should require explicit business justification AND a documented scope-impact review.

### Pattern 4: PAN protection when storage is unavoidable

If you genuinely must store PAN (rare with modern PSPs), §3.4 requires one of:

- **One-way hash** (with strong cryptographic hash + per-record salt) — usable for matching, not display
- **Truncation** (max 6 leading + 4 trailing digits, e.g., `424242******4242`) — usable for display
- **Strong encryption** (AES-256-GCM with KEK in HSM/KMS) — usable for retrieval
- **Tokenization** (random surrogate value; PSP holds the PAN)

```python
# CORRECT — AES-256-GCM with envelope encryption via AWS KMS
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

kms = boto3.client('kms')

def encrypt_pan(pan: str, key_id: str) -> dict:
    """Encrypt PAN with envelope encryption. KEK in KMS, DEK ephemeral."""
    # Generate a fresh data-encryption key per record
    response = kms.generate_data_key(KeyId=key_id, KeySpec='AES_256')
    dek_plaintext = response['Plaintext']
    dek_ciphertext = response['CiphertextBlob']

    aes = AESGCM(dek_plaintext)
    nonce = os.urandom(12)
    ciphertext = aes.encrypt(nonce, pan.encode(), associated_data=None)

    # Wipe plaintext DEK from memory (best-effort in Python)
    del dek_plaintext

    return {
        'ciphertext': ciphertext,
        'nonce': nonce,
        'wrapped_dek': dek_ciphertext,
        'kek_id': key_id,
        'algorithm': 'AES-256-GCM',
        'created_at': datetime.utcnow().isoformat(),
    }
```

Key rotation requirement (§3.6.4): KEK rotation at least annually OR at suspected/known compromise. Re-encrypt all data under the new KEK; retain old KEK only long enough to decrypt remaining data; destroy old KEK afterward.

### Pattern 5: Cardholder data environment (CDE) segmentation

§1.4 — Network segmentation between CDE and out-of-scope networks must be demonstrable. Pentest must confirm segmentation effectiveness (§11.4.5).

```hcl
# Terraform — CDE in a dedicated VPC with strict egress
resource "aws_vpc" "cde" {
  cidr_block = "10.100.0.0/16"
  tags = {
    PCIScope    = "in-scope"
    Environment = "production"
  }
}

# CDE has NO direct internet egress — all outbound via inspected proxy
resource "aws_security_group" "cde_egress" {
  vpc_id = aws_vpc.cde.id

  egress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.outbound_proxy.id]
    description     = "Only to PCI-approved proxy; proxy enforces destination allowlist (Stripe, KMS, log sink)"
  }

  # No 0.0.0.0/0 egress. Period.
}

# Outbound destinations allowlist (proxy-enforced)
locals {
  cde_egress_allowlist = [
    "api.stripe.com",
    "kms.us-east-1.amazonaws.com",
    "logs.us-east-1.amazonaws.com",
    # Every entry justified + reviewed quarterly
  ]
}
```

The CDE has separate IAM, separate logging pipeline, separate monitoring, separate change-control. Engineers who don't need CDE access don't get CDE access (§7.1 least privilege).

### Pattern 6: Script integrity for payment pages (§6.4.3, new in v4.0)

Magecart attacks compromised major merchants (British Airways, Ticketmaster) by injecting JS into payment pages. v4.0 mandates:

- Inventory of every script loaded on payment pages
- Authorization for each script's inclusion
- Integrity assurance for each script (SRI hash OR CSP + monitoring)

```html
<!-- CORRECT — every external script has SRI -->
<script
  src="https://js.stripe.com/v3/"
  integrity="sha384-..."
  crossorigin="anonymous"></script>

<!-- CSP enforces script source allowlist -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'self' https://js.stripe.com;
  connect-src 'self' https://api.stripe.com;
  frame-src https://js.stripe.com https://hooks.stripe.com;
  style-src 'self' 'unsafe-inline';
  base-uri 'none';
  form-action 'self';
  report-uri https://csp-reports.example.com/payment;
">
```

Note: Stripe doesn't currently support SRI on `js.stripe.com/v3/` (the URL serves dynamic content). Compensating controls: strict CSP + per-page-load script inventory check + SIEM alerts on CSP violations from payment pages.

### Pattern 7: Logging + monitoring (§10)

PCI-DSS §10 requires audit trails for:

- All individual user access to CHD
- All actions by privileged users (root, admin, DB admin)
- All access to audit logs themselves
- Invalid logical access attempts
- Use + changes to authentication credentials
- Initialization, stopping, pausing of audit logs
- Creation + deletion of system-level objects

```typescript
// Structured logging that meets §10.2 requirements
interface PciAuditEvent {
  timestamp: string;          // §10.6 — ISO 8601 with timezone
  user_id: string;            // §10.2.1 — who
  event_type: string;         // §10.2 — what kind
  action: string;             // §10.2 — what they did
  resource: string;           // §10.2 — what they did it to
  source_ip: string;          // §10.2.5 — where from
  user_agent: string;
  outcome: 'success' | 'failure';
  reason?: string;
  pci_scope: 'cde' | 'connected' | 'out-of-scope';
  // PAN is NEVER in this event — only the last4 or token
  card_token?: string;
  card_last4?: string;
}
```

Logs retained: 1 year minimum, 3 months immediately accessible (§10.7). Log integrity protected via append-only storage + offsite copy + daily integrity check.

## Anti-Patterns

### Anti-Pattern 1: "We're using Stripe so we're not in PCI scope at all"

Wrong. Even SAQ A merchants are in PCI scope — just with a smaller control set. SAQ A requires controls around the redirect to Stripe (e.g., no merchant-side JS that handles CHD), TLS for the redirect, written information security policy, awareness training, vendor management of Stripe. You still complete an annual SAQ.

### Anti-Pattern 2: "We'll just truncate CVV before logging"

CVV/CVC/CVV2/CAV2 MUST NOT be stored after authorization — full stop. There's no "truncated CVV" allowance. Filter it out of logs before they hit the log sink, redact it at the application layer, and audit every log path that touches the auth response.

### Anti-Pattern 3: Self-rolled tokenization

Building your own tokenization service ("we generate a UUID and map it to a PAN in our DB") puts the PAN-token mapping table in scope — and that table is now PCI-DSS SAQ D scope, plus PCI SSC Tokenization Product Security Guidelines. Almost always cheaper to use the PSP's vault (Stripe Customer + PaymentMethod, Adyen Stored Payment Method).

### Anti-Pattern 4: TLS 1.0/1.1 anywhere in the CDE

§4.2 prohibits SSL and "early TLS" (1.0/1.1). TLS 1.2 minimum; prefer TLS 1.3. Includes internal connections, not just internet-facing. Includes admin tools, monitoring agents, log shippers.

### Anti-Pattern 5: Shared accounts in the CDE

§8.2.1 — every user has unique credentials. No shared "admin" account, no shared service account used by multiple humans. Service-to-service uses dedicated machine identities (IAM roles, mTLS certs); humans use SSO-backed individual identities.

### Anti-Pattern 6: Annual SAQ rubber-stamp

Submitting a SAQ A every year because "nothing changed" without actually re-verifying that nothing changed is a control failure. New scripts on payment pages, new vendors, new integrations, new acquired companies — all change scope. Annual re-validation includes actively re-checking each control.

### Anti-Pattern 7: Pentest by an internal engineer who built the system

§11.4.1 — pentest performed by qualified internal resource OR qualified external third-party with organisational independence from the management of the target system. The engineer who built the checkout flow cannot pentest it.

## Verification Checklist

- [ ] Card data is captured by PSP iframe/SDK, never by merchant-controlled fields
- [ ] No CVV/CVC/track/PIN stored in any DB, log, snapshot, backup, or queue
- [ ] PAN (if stored at all) is encrypted (AES-256-GCM), truncated (`424242******4242`), hashed, or tokenized
- [ ] KEK lives in HSM/KMS, rotated annually, never exported as plaintext
- [ ] CDE network segmented from non-CDE; pentest validates segmentation
- [ ] CDE egress goes through inspected proxy with destination allowlist
- [ ] TLS 1.2 minimum (prefer 1.3) on every connection, internal and external
- [ ] Payment page CSP restricts script sources; every external script has SRI or compensating control
- [ ] Audit logs cover all CHD access, all privileged actions, all auth events
- [ ] Logs retained 1 year, 3 months hot, with integrity protection
- [ ] Quarterly ASV scans run + remediation tracked
- [ ] Annual pentest by independent qualified party
- [ ] SAQ completed annually with each control re-verified
- [ ] Unique credentials per human user; MFA on all CDE access (v4.0 §8.4.2)
- [ ] Vulnerability scan + patch within 30 days of critical/high CVE disclosure (§6.3.3)
- [ ] Anti-malware on all systems commonly affected by malware (§5)
- [ ] Written information security policy, reviewed annually (§12.1)
- [ ] Annual risk assessment (§12.3)
- [ ] Incident response plan documented + tested annually (§12.10)
- [ ] Vendor list maintained with PCI compliance status for each (§12.8)

## Cross-References

- `~/.claude/skills/owasp-asvs/SKILL.md` — V3 session mgmt, V8 data protection, V9 cryptography, V11 logging overlap with PCI §3, §8, §10
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — when payment data is also EU PII, both regimes apply
- `~/.claude/rules-library/common/secrets-management.md` — KEK + DEK handling
- `~/.claude/rules-library/common/security.md` — broader OWASP/encryption baseline
- `~/.claude/rules-library/common/audit-logging.md` — log shape, retention, integrity
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — CVE gate maps to §6.3.3
- `~/.claude/rules-library/common/no-discards.md` — no CVV/PAN in logs; no `console.log` of payment requests
- Council Division 6 (Compliance & Legal) — auto-engages on any payment-touching change
- PCI SSC: pcisecuritystandards.org (official documents library, SAQ instructions, prioritized approach worksheet)

## Why This Skill Exists

Payment processing is the highest-stakes engineering surface most product teams ever touch. A single PCI-DSS breach involves card-brand fines, mandatory PFI forensic investigation (~$50K-$500K), customer notification, ongoing assessor monitoring, and often loss of payment processing privileges entirely. Recent breaches at major retailers cost $100M-$500M each between fines, settlements, infrastructure remediation, and lost business.

The cost of doing PCI-DSS right at design time: ~1-2 sprints to integrate Stripe Elements properly + ~1 sprint to write the SAQ + ongoing quarterly scans + annual pentest. The cost of doing it wrong: existential risk to the business.

This skill operationalizes scope reduction. Every architectural choice that keeps cardholder data off your servers compresses PCI work by an order of magnitude. The teams that succeed at PCI-DSS aren't the ones with the biggest security budgets — they're the ones who recognized early that the cheapest PCI control is the one you never have to implement because the data never touched your system.

When tokenization isn't enough — POS terminals, IVR, niche processors, legacy migrations — this skill gives you the specific control numbers (§3.4, §4.2, §8.3.6, §11.4) and concrete patterns (envelope encryption, network segmentation, CSP + SRI for payment pages, structured audit logs) that auditors actually verify against. Knowing the requirements is half the battle; knowing how to implement them in code is the other half.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New payment flow ships without scope-reduction analysis (tokenization-first weakening)
- Cardholder data logged in plain text (§3.4 + §10.7 violation)
- Payment page without `Content-Security-Policy` + Subresource Integrity on third-party scripts (§6.4.3, §11.6.1)
- Network segmentation control (§1.x) bypassed via flat network
- Service-account credentials shared across services (§8.x — unique IDs)
- Encryption-at-rest key not rotated per policy (§3.6 / §3.7)
- Quarterly ASV scan skipped (§11.4)
- Penetration test annual cadence missed (§11.4)
- Vendor list (§12.8) not updated when new processor added
- Audit log not immutable + retained 1 year + 3 months readily-available (§10.7)
- Privileged action without MFA (§8.4.2)

**Refinement candidates**:
- New control mapping row when PCI-DSS v4 customised approach is used
- New cross-reference when a sister skill (security-review, soc2-readiness, iso27001-controls) adds a payments gate
- New scope-reduction pattern row when a new tokenisation provider emerges
- Tightening of the network-segmentation rule when scope-creep recurs
