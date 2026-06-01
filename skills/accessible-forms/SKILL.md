---
name: accessible-forms
description: Production form accessibility — labels, errors, autocomplete, validation timing, multi-step flows, file inputs, date pickers, and the WCAG 2.2 Redundant Entry + Accessible Authentication SCs.
---

# Accessible Forms

The form is where accessibility most often breaks. Visual designers prioritise clean layouts; engineers reach for `placeholder` as a label; validation surfaces errors at submit; keyboard users get trapped in modal flows; screen-reader users discover required fields after submission. This skill encodes the patterns that pass real audits.

## Purpose

Forms are conversion-critical (signup, checkout, contact, KYC) AND accessibility-critical (auth, payment, account management are AAA paths per `wcag-accessibility`). The patterns below cover every input type, every state transition, every validation pattern, and the two new WCAG 2.2 SCs that specifically target authentication forms.

## Standards Cited

- **WCAG 2.2 §1.3.1** — Info and Relationships (label association)
- **WCAG 2.2 §1.3.5** — Identify Input Purpose (autocomplete tokens)
- **WCAG 2.2 §2.4.6** — Headings and Labels (descriptive)
- **WCAG 2.2 §3.3.1** — Error Identification
- **WCAG 2.2 §3.3.2** — Labels or Instructions
- **WCAG 2.2 §3.3.3** — Error Suggestion
- **WCAG 2.2 §3.3.4** — Error Prevention (Legal, Financial, Data)
- **WCAG 2.2 §3.3.7** — Redundant Entry (NEW in 2.2)
- **WCAG 2.2 §3.3.8** — Accessible Authentication Minimum (NEW in 2.2)
- **WCAG 2.2 §3.3.9** — Accessible Authentication Enhanced (NEW in 2.2)
- **HTML Living Standard** — `<label>`, `<input>`, `autocomplete` attribute, constraint validation API
- **WAI-ARIA 1.2** — `aria-required`, `aria-invalid`, `aria-describedby`, `aria-errormessage`
- **WHATWG Autocomplete tokens** — `username`, `current-password`, `new-password`, `one-time-code`, `email`, etc.

## When to Fire

- Any `<form>`, `<input>`, `<select>`, `<textarea>`, `<button type="submit">`
- Any signup / login / password reset / 2FA flow
- Any checkout / billing / payment flow
- Any KYC / identity verification flow
- Any multi-step wizard
- Any inline editing pattern (double-click to edit, etc.)

## Core Patterns

### Every input has a real `<label>`

```html
<!-- WRONG — placeholder is not a label -->
<input type="email" placeholder="Email address" />

<!-- WRONG — visually hidden but no association -->
<label>Email address</label>
<input type="email" />

<!-- RIGHT — `for` matches input `id` -->
<label for="signup-email">Email address</label>
<input
  type="email"
  id="signup-email"
  name="email"
  autocomplete="email"
  required
  aria-required="true"
/>

<!-- RIGHT (alternative) — label wraps input -->
<label>
  Email address
  <input type="email" name="email" autocomplete="email" required />
</label>
```

When the label must be visually hidden (e.g., search input in a header), use the `sr-only` pattern — NOT `aria-label` (which loses the visible label when AT switches to braille / sound only):

```html
<form role="search">
  <label for="search" class="sr-only">Search articles</label>
  <input type="search" id="search" name="q" placeholder="Search" />
  <button type="submit">Search</button>
</form>
```

### Autocomplete tokens (WCAG 1.3.5)

Browsers + password managers + autofill need to identify input purpose. Use the WHATWG token list:

```html
<input type="text"     name="given-name"  autocomplete="given-name" />
<input type="text"     name="family-name" autocomplete="family-name" />
<input type="email"    name="email"       autocomplete="email" />
<input type="tel"      name="phone"       autocomplete="tel" />
<input type="password" name="password"    autocomplete="current-password" />
<input type="password" name="new-password" autocomplete="new-password" />
<input type="text"     name="otp"         autocomplete="one-time-code" />

<!-- Address -->
<input type="text" name="street"   autocomplete="street-address" />
<input type="text" name="city"     autocomplete="address-level2" />
<input type="text" name="region"   autocomplete="address-level1" />
<input type="text" name="postal"   autocomplete="postal-code" />
<input type="text" name="country"  autocomplete="country-name" />

<!-- Payment -->
<input type="text" name="cc-name"   autocomplete="cc-name" />
<input type="text" name="cc-number" autocomplete="cc-number" inputmode="numeric" />
<input type="text" name="cc-exp"    autocomplete="cc-exp" />
<input type="text" name="cc-csc"    autocomplete="cc-csc" inputmode="numeric" />
```

Disabling autocomplete (`autocomplete="off"`) on auth fields fails WCAG 1.3.5 AND fights password managers — banned outside narrow cases (e.g., shared kiosk).

### Validation timing — three correct moments

1. **On blur** for format checks ("Invalid email") — debounce 300ms; don't fire while user is typing
2. **On change** for cross-field checks ("Passwords don't match") — only after both fields blurred once
3. **On submit** for server-side checks (email unique, payment authorised)

Banned:
- **On every keystroke** — user types one character, sees "Required" — destroys flow
- **Only on submit** — user fills form, submits, sees 8 errors — has to scroll back through

### Error patterns (ARIA-anchored)

```html
<div class="field">
  <label for="email">Email address</label>
  <input
    type="email"
    id="email"
    name="email"
    autocomplete="email"
    required
    aria-required="true"
    aria-invalid="true"
    aria-describedby="email-help email-error"
  />
  <p id="email-help" class="hint">We'll never share your email.</p>
  <p id="email-error" class="error" role="alert">
    Enter a valid email address — e.g., name@example.com.
  </p>
</div>
```

- `aria-invalid="true"` flips when the field is invalid; flip back to `"false"` once corrected
- `aria-describedby` joins multiple ids (hint + error); the error message reads on focus
- `role="alert"` announces the error immediately when it appears (use `aria-live="polite"` if the error should NOT interrupt — e.g., for non-blocking warnings)

### Error message content

| Wrong | Right |
| --- | --- |
| "Invalid" | "Enter a valid email address — e.g., name@example.com" |
| "Field required" | "Enter your full legal name" |
| "Must be 8+ characters" | "Use 12+ characters including a number and a symbol" |
| "Password too weak" | "Add a number, a symbol, and increase length to 12+" |
| Red border, no text | Red border + text describing what's wrong + how to fix |

WCAG 3.3.3 — error messages MUST suggest a fix when feasible.

### WCAG 3.3.7 — Redundant Entry

```html
<!-- WRONG — re-asking the email at the end of a multi-step signup -->
Step 1: Enter email
Step 2: Choose plan
Step 3: Enter billing details
Step 4: Confirm email (AGAIN)

<!-- RIGHT — auto-fill from earlier step; show + allow edit -->
Step 4: Confirm
  Email: alice@example.com  [Edit]
  Plan: Pro
  Billing: ...
```

The user enters info ONCE per session. If you need confirmation, SHOW + allow edit; don't re-type.

### WCAG 3.3.8 — Accessible Authentication

Cognitive function tests (memorising passwords, solving puzzles, transcribing characters) must have an accessible alternative:

| Auth method | 3.3.8 (AA) status |
| --- | --- |
| Password | ✅ if password managers ALLOWED (don't block paste; honour `autocomplete`) |
| Password manager | ✅ canonical accessible alternative |
| Magic link | ✅ no memorisation required |
| Passkey / WebAuthn | ✅ device authentication |
| Biometric (Touch ID / Face ID) | ✅ no cognitive test |
| SMS OTP | ✅ if user can copy-paste the code |
| TOTP (Google Authenticator) | ⚠️ AA-passing if user can copy-paste; AAA needs alternative |
| CAPTCHA (text recognition) | ❌ FAILS 3.3.8 AA without alternative |
| Image puzzles ("find the bus") | ❌ FAILS unless alternative offered |
| Math problems | ❌ FAILS |

If you ship a CAPTCHA, provide an accessible alternative (audio CAPTCHA, email link, support contact).

### Required vs optional

```html
<!-- Mark REQUIRED visually + programmatically -->
<label for="name">
  Full name
  <span aria-hidden="true" class="required-mark">*</span>
</label>
<input
  type="text"
  id="name"
  name="name"
  required
  aria-required="true"
  autocomplete="name"
/>

<!-- Form-level legend explaining the asterisk -->
<p class="form-help">
  Fields marked <span aria-hidden="true">*</span><span class="sr-only">required</span> are required.
</p>
```

NEVER use only color (red border) to indicate required — WCAG 1.4.1.

### `<fieldset>` + `<legend>` for grouped inputs

```html
<fieldset>
  <legend>Shipping address</legend>
  <!-- street, city, postal — all inputs INSIDE this fieldset -->
</fieldset>

<fieldset>
  <legend>How should we contact you?</legend>
  <label><input type="radio" name="contact" value="email" /> Email</label>
  <label><input type="radio" name="contact" value="sms" /> SMS</label>
  <label><input type="radio" name="contact" value="phone" /> Phone call</label>
</fieldset>
```

Screen readers announce the legend before each input within the fieldset — context for what the field belongs to.

### Multi-step forms

- Show progress: "Step 2 of 4 — Billing details"
- Each step has its own `<h1>` or `<h2>` (focus moves on step transition)
- Allow back navigation; preserve already-entered data
- Save draft state if the form is long
- Use `aria-current="step"` on the active progress indicator

### File inputs

```html
<label for="resume">Upload resume (PDF, DOCX — max 10MB)</label>
<input
  type="file"
  id="resume"
  name="resume"
  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  aria-describedby="resume-help"
/>
<p id="resume-help" class="hint">We accept PDF and Word documents up to 10MB.</p>
```

After upload, announce the filename via `aria-live`:

```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {uploadedFileName ? `Uploaded: ${uploadedFileName}` : ''}
</div>
```

### Date pickers

Native `<input type="date">` is accessible by default. Custom date pickers (React DayPicker, etc.) MUST implement the APG dialog + grid keyboard model:

- Arrow keys move between days
- Page Up / Page Down = month
- Shift + Page Up / Page Down = year
- Home / End = start / end of week
- Esc closes
- Enter selects

If you ship a custom picker, also provide a typed input fallback: "Or type the date as YYYY-MM-DD".

### Submit button states

| State | Pattern |
| --- | --- |
| Idle | `<button type="submit">Submit</button>` |
| Submitting | `<button type="submit" disabled aria-busy="true">Submitting…</button>` |
| After error | Re-enable; focus the first invalid field; announce "Form has errors" via `role="alert"` |
| After success | Navigate to success page OR show inline success with focus moved to it |

Banned: spinner that spins forever with no announcement.

## Anti-Patterns

### Anti-pattern 1: Placeholder as label

Placeholders disappear when the field has a value. Users with cognitive disabilities, ADHD, or simply tabbing back to verify lose the field's purpose. Always use a real `<label>`.

### Anti-pattern 2: Disabling form fields without explanation

`<input disabled>` is invisible to most screen readers OR announced confusingly. If a field is conditionally available, prefer hiding it entirely (with `aria-live` announcing the change) or showing it readonly with explanation: "Country: United States (set during signup; contact support to change)".

### Anti-pattern 3: Errors at the top of the form only

Inline errors per-field are more actionable. If you ALSO show a summary, link from the summary to each field via `<a href="#field-id">`.

### Anti-pattern 4: Custom checkboxes without `:checked` state

```css
/* Hide native; style label */
input[type="checkbox"] { position: absolute; opacity: 0; }
input[type="checkbox"] + label::before { content: "□"; }
input[type="checkbox"]:checked + label::before { content: "■"; }

/* WRONG — also need :focus visible */

/* RIGHT */
input[type="checkbox"]:focus + label::before {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

### Anti-pattern 5: Honeypot fields without `aria-hidden`

Honeypot anti-spam fields MUST be `aria-hidden="true"` AND `tabindex="-1"` AND visually hidden — screen-reader users would otherwise fill them and be flagged as bots.

### Anti-pattern 6: Auto-advancing OTP inputs without paste support

The 6-digit OTP UI with 6 separate inputs that auto-advance breaks copy-paste from SMS auto-fill. Use a single `<input autocomplete="one-time-code" inputmode="numeric">` — iOS + Android auto-fill works natively.

## Verification Checklist

- [ ] Every `<input>` has a `<label for>` OR is wrapped in `<label>`
- [ ] No `placeholder`-as-label patterns
- [ ] `autocomplete` tokens set on every applicable field (per WHATWG list)
- [ ] Required fields: `required` + `aria-required="true"` + visible indicator + form-level legend explaining the indicator
- [ ] Errors: `aria-invalid` + `aria-describedby` pointing to error text + `role="alert"` on the error element
- [ ] Error messages SUGGEST a fix (per WCAG 3.3.3)
- [ ] Tab order matches visual order; Shift+Tab works in reverse
- [ ] Submit button shows submitting state via `aria-busy`
- [ ] Multi-step forms: progress indicator with `aria-current="step"`; focus moves between steps
- [ ] No CAPTCHA without accessible alternative
- [ ] Password fields: paste enabled, `autocomplete="current-password"` / `"new-password"` set
- [ ] OTP fields: single input with `autocomplete="one-time-code"` + `inputmode="numeric"`
- [ ] File inputs: describe accepted formats + size limits via `aria-describedby`
- [ ] Date inputs: native `<input type="date">` OR custom picker implements APG keyboard model
- [ ] Tested with VoiceOver + NVDA + keyboard-only
- [ ] Tested with password manager (1Password, Bitwarden) — fills correctly
- [ ] Tested at 200% zoom and 320px viewport — no clipped fields
- [ ] axe DevTools form audit: 0 violations

## Cross-References

- `wcag-accessibility` skill — broader WCAG patterns
- `~/.claude/rules/common/a11y.md` — always-on rule
- `~/.claude/rules/common/i18n.md` — form field localisation (labels, errors, formats)
- `~/.claude/rules/common/error-codes.md` — error codes drive error messages
- `~/.claude/rules/common/error-handling-with-context.md` — server-side errors map to client-rendered messages
- `~/.claude/skills/frontend-patterns/SKILL.md` — broader component patterns
- `accessibility-reviewer` agent — opus-model audit

## Why This Skill Exists

Form a11y failures cause:
- Abandoned signups (conversion loss)
- Failed checkouts (revenue loss)
- Failed support requests (the user can't reach support because the contact form excludes them)
- Legal exposure (forms are the most-litigated a11y surface — they're concrete, demonstrable, and the harm is easy to prove)
- Brand damage (publicly shamed for inaccessible signup)

The patterns are mechanical: real labels, autocomplete tokens, ARIA states, validation timing, accessible auth. The cost is one extra attribute per input + one extra div for errors. The benefit is conversions that wouldn't have happened.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- `placeholder` used as label (vanishes on focus — invisible to many users)
- `autocomplete` attribute missing on personal-info field (WCAG 1.3.5 + form fill UX)
- Error message colour-only (red border, no text — colour-only signal)
- Validation on every keystroke (premature error display — UX + a11y violation)
- Field error not associated via `aria-describedby` + `aria-invalid="true"`
- File-input without size + type constraint announced to screen reader
- Multi-step form without `aria-current="step"` + step indicator
- Required field marked only with `*` glyph (no text alternative)
- CAPTCHA without audio alternative / `prefers-reduced-motion`-friendly variant
- Re-entry of previously-entered info (WCAG 2.2 §3.3.7 — Redundant Entry)
- Password field without `autocomplete="current-password" | "new-password"`
- WCAG 2.2 §3.3.8 Accessible Authentication: cognitive function test without alternative

**Refinement candidates**:
- New input-pattern row when a new HTML autocomplete token / `inputmode` becomes useful
- New cross-reference when a sister skill (wcag-accessibility, interaction-design, frontend-patterns) adds a forms gate
- Tightening of the validation-timing rule when premature-validation incidents recur
- New row in the auth-accessibility checklist when new SSO / passkey UX emerges
