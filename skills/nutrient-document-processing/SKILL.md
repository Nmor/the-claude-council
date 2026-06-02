---
name: nutrient-document-processing
description: Process, convert, OCR, extract, redact, sign, and fill documents via the Nutrient DWS (Document Web Services) API. Supports PDF, DOCX, XLSX, PPTX, HTML, and image inputs through a single multipart endpoint. Use for document conversion, OCR of scanned content, PII redaction, watermarking, digital signing, and PDF form fill.
---

# Nutrient Document Processing

> Vendor-integration recipe for the [Nutrient DWS Processor API](https://www.nutrient.io/api/).
> Sister to `~/.claude/rules-library/common/install-allowlist.md` (publisher
> review before adopting any vendor SDK), `~/.claude/rules-library/common/secrets-management.md`
> (API key handling), `~/.claude/rules-library/common/data-retention.md`
> (document lifecycle), `~/.claude/rules-library/common/gdpr-ccpa.md` (when
> processing PII), `~/.claude/skills/payment-processing-patterns/SKILL.md`
> (if processing payment-related documents).

## Purpose

Nutrient DWS provides a single HTTPS endpoint that accepts a
document plus a JSON `instructions` payload, and returns the
transformed result. The same surface handles: format conversion,
text + table extraction, OCR, redaction, watermarking, digital
signatures, and PDF form fill. This skill captures the canonical
calling pattern + the security / compliance guardrails that
apply when documents contain user data.

## When to use

- Converting documents between formats (PDF ↔ DOCX / XLSX / PPTX
  / HTML / images)
- Extracting plain text or tabular data from PDFs
- OCR on scanned documents or images (100+ languages)
- Redacting PII before sharing documents (per
  `~/.claude/rules-library/common/gdpr-ccpa.md`)
- Adding watermarks to drafts or confidential documents
- Digitally signing contracts or agreements (CMS / PAdES)
- Filling PDF forms programmatically

## When NOT to use

- **Browser-side rendering** — Nutrient has a separate
  client-side SDK (Web SDK / `pspdfkit-web`); this skill is
  server-side only.
- **High-throughput batch pipelines without budgeting** — confirm
  per-call cost vs alternatives (Adobe PDF Services, AWS Textract,
  Google Document AI, Azure Document Intelligence) per
  `~/.claude/rules/common/task-intake-due-diligence.md` Q4 (OSS
  options) + Q16 (cost forecast).
- **Sole legal source of truth** — digital signatures generated
  here are CMS / PAdES-conformant but require the appropriate
  CA / TSA + signing-policy review per jurisdiction (eIDAS in EU,
  ESIGN Act + UETA in US). Not legal advice.

## Setup

Get a free API key at
[nutrient.io](https://dashboard.nutrient.io/sign_up/?product=processor).

```bash
# Store the key in the per-user secrets store (Keychain via
# aws-vault, 1Password CLI, doppler, etc.) — never in source
# control. Per ~/.claude/rules-library/common/secrets-management.md.
export NUTRIENT_API_KEY="$(security find-generic-password \
  -a "$USER" -s NUTRIENT_API_KEY -w)"
```

All requests go to `https://api.nutrient.io/build` as multipart
POST with an `instructions` JSON field.

## Operations

### Convert documents

```bash
# DOCX → PDF
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.docx=@document.docx" \
  -F 'instructions={"parts":[{"file":"document.docx"}]}' \
  -o output.pdf

# PDF → DOCX
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"output":{"type":"docx"}}' \
  -o output.docx

# HTML → PDF
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "index.html=@index.html" \
  -F 'instructions={"parts":[{"html":"index.html"}]}' \
  -o output.pdf
```

Supported inputs: PDF, DOCX, XLSX, PPTX, DOC, XLS, PPT, PPS,
PPSX, ODT, RTF, HTML, JPG, PNG, TIFF, HEIC, GIF, WebP, SVG, TGA,
EPS.

### Extract text + tables

```bash
# Plain text
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"output":{"type":"text"}}' \
  -o output.txt

# Tables → XLSX
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"output":{"type":"xlsx"}}' \
  -o tables.xlsx
```

### OCR scanned documents

```bash
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "scanned.pdf=@scanned.pdf" \
  -F 'instructions={"parts":[{"file":"scanned.pdf"}],"actions":[{"type":"ocr","language":"english"}]}' \
  -o searchable.pdf
```

Languages: ISO 639-2 codes (`eng`, `deu`, `fra`, `spa`, `jpn`,
`kor`, `chi_sim`, `chi_tra`, `ara`, `hin`, `rus`) OR full names
(`english`, `german`). Full list:
[Nutrient OCR languages](https://www.nutrient.io/guides/document-engine/ocr/language-support/).

### Redact sensitive information

```bash
# Preset patterns (SSN + email)
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"redaction","strategy":"preset","strategyOptions":{"preset":"social-security-number"}},{"type":"redaction","strategy":"preset","strategyOptions":{"preset":"email-address"}}]}' \
  -o redacted.pdf

# Regex
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"redaction","strategy":"regex","strategyOptions":{"regex":"\\b[A-Z]{2}\\d{6}\\b"}}]}' \
  -o redacted.pdf
```

Presets: `social-security-number`, `email-address`,
`credit-card-number`, `international-phone-number`,
`north-american-phone-number`, `date`, `time`, `url`, `ipv4`,
`ipv6`, `mac-address`, `us-zip-code`, `vin`.

### Watermarks

```bash
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"watermark","text":"CONFIDENTIAL","fontSize":72,"opacity":0.3,"rotation":-45}]}' \
  -o watermarked.pdf
```

### Digital signatures

```bash
# Self-signed CMS signature (for non-legally-binding contexts).
# For eIDAS / ESIGN compliance, use a qualified CA + TSA.
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"sign","signatureType":"cms"}]}' \
  -o signed.pdf
```

### PDF form fill

```bash
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "form.pdf=@form.pdf" \
  -F 'instructions={"parts":[{"file":"form.pdf"}],"actions":[{"type":"fillForm","formFields":{"name":"Jane Smith","email":"jane@example.com","date":"2026-02-06"}}]}' \
  -o filled.pdf
```

## MCP server (alternative)

Nutrient publishes an MCP server (`@nutrient-sdk/dws-mcp-server`).
**Per `~/.claude/rules-library/common/install-allowlist.md`:**

- `npx -y` auto-install is in the global deny list. Adoption
  requires explicit user approval after publisher review.
- Verify the package's npm publisher + signing key + recent
  release cadence before adoption.
- Pin the version (no `latest` tag) and lock to a specific
  install hash.

After review + user approval, the canonical config:

```json
{
  "mcpServers": {
    "nutrient-dws": {
      "command": "npx",
      "args": ["-y", "@nutrient-sdk/dws-mcp-server@<pinned-version>"],
      "env": {
        "NUTRIENT_DWS_API_KEY": "...",
        "SANDBOX_PATH": "/path/to/working/directory"
      }
    }
  }
}
```

## Core patterns

### Pattern 1: Always sandbox the working directory

Set `SANDBOX_PATH` (MCP) or pass file paths through a path-
traversal guard (curl). Documents may be untrusted; never let
the API + filesystem-access combo escape the intended directory.

### Pattern 2: Redact BEFORE storage

For any document containing PII / PHI / cardholder-data /
education records, run the appropriate redaction step BEFORE the
document lands in long-term storage. Per
`~/.claude/rules-library/common/data-retention.md` + the regulation-
specific compliance skills (`hipaa-compliance`,
`ferpa-coppa-compliance`, `pci-dss-patterns`).

### Pattern 3: OCR with explicit language

Auto-detection is convenient but loses accuracy on multilingual
documents. Pass the language explicitly when known.

### Pattern 4: Signature ≠ legal binding

CMS / PAdES signatures generated here are cryptographically
sound but may not satisfy local legal requirements (eIDAS
qualified electronic signatures in EU; ESIGN + UETA in US;
state-specific notarisation laws). Per
`~/.claude/rules/common/task-intake-due-diligence.md` Q11
(compliance), confirm the legal framework before claiming
non-repudiation.

### Pattern 5: Rate-limit + retry with jitter

Nutrient enforces per-key rate limits. Per
`~/.claude/rules-library/common/rate-limiting.md` + `circuit-breaker.md`,
wrap calls in a breaker + retry-with-jitter; respect
`Retry-After` headers; surface failures via
`~/.claude/rules-library/common/error-codes.md` envelope.

## Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| API key in source / committed `.env` | Vault / keychain per `secrets-management.md`; hook-enforced via `no-discards.md` |
| Skipping redaction "because users won't share" | Defense in depth — every PII-class document is redacted before any external touch |
| Sole reliance on preset regex for PII | Add domain-specific patterns; verify with a sample-based audit |
| `npx -y @nutrient-sdk/dws-mcp-server` without version pin | Pin version + verify publisher per `install-allowlist.md` |
| Treating CMS signature as eIDAS qualified | Confirm CA + TSA + signing-policy match the jurisdiction's qualified-signature requirements |
| Sending document bytes to logs / metrics | Per `audit-logging.md` rule 4, no document content in logs; hash + length only |

## Verification checklist

When integrating this API, confirm:

- [ ] API key loaded from vault, not from source
- [ ] No document content logged at any level
- [ ] PII / PHI / cardholder / education-record documents are
      redacted before storage (per applicable compliance skill)
- [ ] Rate-limit handling + circuit breaker wired
- [ ] Retry with jitter + `Retry-After` respect
- [ ] Output disposition documented (delete after processing? retain how long?)
- [ ] If signatures are user-visible: legal framework confirmed
      (eIDAS / ESIGN / UETA / local equivalent)
- [ ] OCR language explicit when known
- [ ] Failure paths emit stable error codes per
      `~/.claude/rules-library/common/error-codes.md`

## Standards + references

- **Nutrient DWS Processor API** —
  [API playground](https://dashboard.nutrient.io/processor-api/playground/),
  [full docs](https://www.nutrient.io/guides/dws-processor/)
- **OCR language support** —
  [ISO 639-2 table](https://www.nutrient.io/guides/document-engine/ocr/language-support/)
- **MCP server package** —
  [npm @nutrient-sdk/dws-mcp-server](https://www.npmjs.com/package/@nutrient-sdk/dws-mcp-server)
- **Open agent-skill repo** —
  [github.com/PSPDFKit-labs/nutrient-agent-skill](https://github.com/PSPDFKit-labs/nutrient-agent-skill)
- **PDF/A** — ISO 19005 (long-term archival format)
- **PAdES** — ETSI EN 319 142 (PDF Advanced Electronic Signatures)
- **CMS** — RFC 5652 (Cryptographic Message Syntax)
- **eIDAS Regulation** — EU 910/2014 (qualified electronic
  signatures)
- **ESIGN Act** — 15 USC §§ 7001-7031 (US electronic signatures)
- **UETA** — Uniform Electronic Transactions Act (state-by-state
  US)

## Cross-references

- `~/.claude/rules-library/common/install-allowlist.md` — review MCP
  server publisher before adoption
- `~/.claude/rules-library/common/secrets-management.md` — API key
  storage
- `~/.claude/rules-library/common/data-retention.md` — document lifecycle
- `~/.claude/rules-library/common/gdpr-ccpa.md` — PII handling
- `~/.claude/rules-library/common/rate-limiting.md` + `circuit-breaker.md`
  — vendor-call resilience
- `~/.claude/skills/hipaa-compliance/SKILL.md` — when documents
  contain PHI
- `~/.claude/skills/ferpa-coppa-compliance/SKILL.md` — when
  documents contain education records
- `~/.claude/skills/pci-dss-patterns/SKILL.md` — when documents
  contain cardholder data

## Why this skill exists

PDF / document processing is a recurring need (contracts, KYC
docs, invoices, scanned forms, regulatory filings) and reach for
a vendor SDK happens often. Without a guardrail, the typical
shortcut is "paste the curl from the README and ship." That
misses:

- Vault-based key storage
- Pre-storage redaction for PII / PHI / cardholder data
- Resilience (rate-limit + breaker)
- Legal-framework confirmation for signatures
- Audit-log hygiene (no document content in logs)
- Install-allowlist review for the MCP server variant

This skill names each guardrail + the sister rule that enforces
it, so Nutrient adoption lands secure-by-default.

## Standards Cited

- **PDF/A-1 (ISO 19005-1:2005) + PDF/A-2 (ISO 19005-2:2011) +
  PDF/A-3 (ISO 19005-3:2012)** — PDF archival format
- **ISO 32000-2:2020** — PDF 2.0 reference (the underlying format)
- **WCAG 2.2 §1.1.1 + PDF/UA-1 (ISO 14289-1:2014)** — Accessible
  PDFs (tagged structure, alternative text, reading order)
- **W3C Accessibility Conformance Testing (ACT)** — Rules for
  testing PDF accessibility
- **NIST SP 800-53 Rev 5 §SC-28** — Protection of information at
  rest (encryption-at-rest for processed documents)
- **NIST SP 800-53 Rev 5 §AU-2 + §AU-3** — Event logging + content
  (processing operations audit-logged)
- **OWASP ASVS 4.0.3 §V12.4 + §V13.2.3** — File handling + REST
  client validation (when calling external APIs)
- **CWE-22 (Path Traversal) + CWE-434 (Unrestricted File Upload) +
  CWE-918 (SSRF)** — File-processing security controls
- **GDPR Article 32 + ISO/IEC 27001:2022 Annex A.8.24** —
  Encryption-at-rest + in-transit when documents contain personal
  data
- **`~/.claude/rules-library/common/secrets-management.md`** — Nutrient API
  key in vault, never source

## Cross-References

- `~/.claude/rules-library/common/secrets-management.md` — API key handling
- `~/.claude/rules-library/common/dependency-vulnerabilities.md` — Nutrient
  SDK kept current; CVE gate enforced
- `~/.claude/rules-library/common/error-handling-with-context.md` —
  document-processing errors wrapped with file id + operation
- `~/.claude/rules-library/common/data-retention.md` — processed-document
  retention policy
- `~/.claude/rules-library/common/gdpr-ccpa.md` — when documents contain
  personal data
- `~/.claude/agents/security-reviewer.md` — file-upload + SSRF
  review for document-processing endpoints


## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Upload entire user PDF to Nutrient without size check | Cost + timeout exposure; potentially exposes large PII docs | Cap file size pre-upload; chunk if larger |
| Hardcode API key in source | Key in git history forever | Vault / env var per `secrets-management.md` |
| Process documents inline in request handler | Blocks the request; user waits seconds | Enqueue to background job; return status polling URL |
| No virus scan on uploaded documents | Malicious PDF uploads / embedded scripts | ClamAV or cloud AV gate before Nutrient processing |
| Retain processed documents indefinitely | GDPR + storage cost | TTL + scheduled deletion per `data-retention.md` |
| Skip PDF/A conformance for archival use | Documents unreadable in future archival systems | Validate PDF/A-1 / PDF/A-2 / PDF/A-3 conformance |
| Process unsigned / unverified document inputs | Path traversal + SSRF when document references external resources | Validate inputs; disable external-resource fetches |
| No fallback when Nutrient API is down | Single point of failure for document workflow | Circuit breaker + graceful degradation per sister rules |


## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- API key found in source / committed `.env` (sister rule
  `secrets-management.md` weakening — hook didn't fire)
- MCP server adopted via `npx -y` without version pin + publisher
  review (`install-allowlist.md` weakening)
- PII / PHI / cardholder document persisted before redaction
  (compliance-skill weakening — `gdpr-ccpa.md` / `hipaa-compliance`
  / `pci-dss-patterns`)
- CMS signature claimed as legally binding without jurisdictional
  CA + TSA confirmation
- Rate-limit / `Retry-After` ignored — vendor 429 surfacing as
  user-visible 500 (sister `circuit-breaker.md` weakening)
- Document content / extracted PII leaked into logs (sister
  `audit-logging.md` rule 4 weakening)
- OCR language auto-detect used on a multilingual document where
  accuracy matters (pattern 3 weakening)
- New Nutrient operation released (e.g., new redaction preset,
  new signature format) without inclusion here

**Refinement candidates**:
- New operation section when Nutrient ships a new
  `actions[].type` (e.g., `splitDocument`, `mergeDocuments`,
  `addPageNumbers`)
- New anti-pattern row when a recurring vendor-API misuse class
  appears
- Tightening of pre-storage-redaction enforcement when a PHI /
  cardholder leak incident surfaces in retrospectives
- New compliance cross-reference when a regulation prescribes a
  document-handling step this skill doesn't yet name (e.g., 21
  CFR Part 11 e-signatures, German UStG invoice rules, MTL
  recordkeeping)
- New "vendor alternative" entry under "When NOT to use" when a
  competing service (AWS Textract, Google Document AI, Adobe PDF
  Services, Azure Document Intelligence) becomes the team's
  primary choice for a recurring use case
