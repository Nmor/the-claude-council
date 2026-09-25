# communication-patterns: Mode and memos

> Choosing the medium and writing the decision document: mode-selection matrix and the Bezos
> 6-pager. Pointed at by the SKILL.md rows "Pattern 5" and "Pattern 6".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 5: Mode Selection — Written vs Verbal vs Visual

Different content types have natural modes; mismatches produce
friction:

| Content type | Best mode | Why |
| --- | --- | --- |
| Decision needing buy-in | Written memo (Bezos 6-pager) + sync meeting for Q&A | Forces clear thinking; everyone gets the same context |
| Complex technical proposal | RFC / ADR | Async + permanent + amendable + reviewable |
| Status update on routine work | Async written (Slack thread, doc) | Sync meeting wastes time |
| Difficult interpersonal conversation | Sync verbal (in person if possible) | Tone + body language carry the weight |
| Sensitive personnel news | Sync verbal first, written follow-up | Recipients need processing time + a record |
| Crisis update to many people | Written first, then live Q&A | Consistent message + opportunity to clarify |
| Architecture diagram | Visual + written explanation | Visual carries structure; text carries reasoning |
| Numbers + trends | Visual (chart) with annotation | Chart shows pattern; annotation explains |
| Persuasive narrative | Verbal + visual (talk) OR long written piece | Both engage emotionally |
| Reference material | Written (web, wiki) | Must be searchable + browsable |
| Onboarding | Written + interactive (videos / exercises) | Different learners need different modes |

Default for tech work: **lean async + written**. Sync meetings
are expensive — high coordination cost across timezones, hard to
record-and-reference, and pull people from focus time. Reserve
sync for what genuinely needs it (decision under uncertainty;
sensitive conversations; building trust with new collaborators).

## Pattern 6: The Bezos 6-Pager

Amazon's standard for substantive decision documents:

- 6 pages maximum (forces ruthless prioritisation)
- Narrative prose, not bullet points
- Self-contained — works without the author present
- Read silently for the first 10-30 minutes of the meeting
- Followed by discussion + decision

Why it works: bullet points let writers hide weak thinking
behind structure ("we'll just make a slide for it"). Narrative
prose exposes weak thinking — sentences need verbs, claims need
support, transitions need logic. Writing a 6-pager that survives
executive scrutiny clarifies your own thinking in the process.

Required sections (vary by team):

1. **Header**: title, author, date, status, key dates
2. **Executive summary**: governing thought + 3-5 key claims
3. **Background / context**: situation + complication
4. **Proposal / decision needed**: the answer
5. **Detail**: the supporting MECE arguments
6. **Risks + mitigations**: what could go wrong
7. **FAQ / Appendix**: anticipated questions
