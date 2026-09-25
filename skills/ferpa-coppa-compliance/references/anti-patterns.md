# ferpa-coppa-compliance: Anti-Patterns

> The eight student-privacy anti-patterns to reject, each with its named alternative. Pointed at by
> the SKILL.md row "Anti-Patterns".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Anti-Patterns

### Anti-pattern 1: Treating FERPA as a privacy policy

FERPA is a CONTRACTUAL + REGULATORY framework, not a privacy policy. Writing "we respect FERPA" in
your TOS does NOT grant you School Official status. Without a signed DPA, schools cannot lawfully
give you student data — period.

### Anti-pattern 2: "We don't ask for age, so COPPA doesn't apply"

FTC's "actual knowledge" doctrine: if any signal (DOB, school grade, profile bio, classroom context,
parental-account linkage, school-issued device login) reveals a user is under 13, COPPA applies.
Designing-to-ignore is willful blindness; the 2025 Rule makes this riskier — explicit penalty
enhancement for evasive design.

### Anti-pattern 3: Using student data for ads / marketing

Even with VPC, COPPA + Student Privacy Pledge + every state student-privacy law bans behavioural
advertising to children. Cross-context tracking, ad targeting, look-alike audience building from
student data — all prohibited. This includes Google Analytics, Facebook Pixel, and similar SDKs on
student-facing screens.

### Anti-pattern 4: Letting parents access ALL student records

FERPA gives PARENTS the right to access student records UNTIL the student turns 18 OR enters
post-secondary education (whichever first). After that, the "eligible student" holds the rights, and
parents need consent. Many platforms incorrectly give parents life-time access; this is itself a
FERPA violation.

### Anti-pattern 5: Indefinite retention for "alumni records"

Once a student leaves an institution, retention should be governed by the institution's
records-retention schedule — typically state-mandated (e.g., NY 7-year retention for transcripts).
Vendors holding alumni records "forever" without a written retention policy violate COPPA 2025 +
state laws.

### Anti-pattern 6: Aggregating + deidentifying then selling

"We aggregate the data" is NOT a free pass. The Cambridge Analytica + many other incidents have
shown deidentified data is re-identifiable. Under SOPIPA + NY §2-d + the Student Privacy Pledge,
even aggregated/deidentified student data CANNOT be sold or used for purposes outside the
educational scope.

### Anti-pattern 7: Skipping background checks on vendor employees

Many states require K-12 vendor employees with access to student data to undergo background checks
(often fingerprint-based). NY (§3035), Illinois, Florida, Texas, California, and others have
specific requirements. Failing this can void the DPA and trigger state-AG action.

### Anti-pattern 8: Forwarding to third-party AI providers without consent

Many edtech platforms integrate ChatGPT / Claude / Gemini / Vertex AI for tutoring, essay feedback,
etc. Forwarding student work to a third-party AI vendor requires explicit consent + a sub-processor
amendment to the DPA. Several state AGs (TX, CT, MA) have opened investigations into edtech AI
integrations in 2024-2025.
