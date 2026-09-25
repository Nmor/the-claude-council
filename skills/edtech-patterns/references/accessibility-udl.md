# edtech-patterns: Accessibility udl

> UDL planes, AccessForAll PNP/DRD matching, and the accommodation pass-through rules. Pointed at by
> the SKILL.md row "Pattern 10".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 10: AccessForAll + UDL — accommodations as a first-class capability

UDL (CAST) frames accessibility as three planes:

1. **Multiple means of engagement** — recruit + sustain interest;
   self-regulation; choice; relevance.
2. **Multiple means of representation** — perception; language +
   symbols; comprehension (multiple media; captions; AD; signed
   video; tactile equivalents).
3. **Multiple means of action + expression** — physical action;
   expression + communication; executive function (multiple
   response modes; assistive-tech support; scaffolding).

AccessForAll (ISO/IEC 24751) operationalizes UDL by letting
learners declare PNP (Personal Needs + Preferences) once; the
system delivers DRD (Digitally Resource Description) variants
that match. Example PNP entries: `display: high-contrast`,
`color: blue-yellow`, `audio: required-captions`, `reading-rate:
slow`, `signing: ASL`, `input: switch-control`.

For assessment specifically, ALL accommodations from the IEP /
504 Plan MUST be honored:

- Extended time (1.5×, 2×, unlimited)
- Read-aloud (screen reader OR human reader)
- Scribe (typing assistance)
- Calculator (basic / scientific / graphing)
- Frequent breaks
- Separate setting (proctor-only)
- Magnification, color overlay, large print

Hard rules:

- Accommodation flags are stored ON the learner's profile, NOT
  in the assessment URL.
- Accommodation determination is the school's responsibility,
  NOT the platform's — but the platform MUST faithfully apply
  what the school has set.
- An assessment that ignores a declared accommodation is a
  Section 504 / ADA violation AND an academic-record-integrity
  violation (the score reflects the disability, not the
  knowledge).
