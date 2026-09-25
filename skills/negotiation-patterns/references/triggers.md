# negotiation-patterns: When to Fire

> File globs, keyword triggers and conversation signals that activate this
> skill, plus what does NOT activate it. Pointed at by the SKILL.md row "When
> to Fire".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## When to Fire

This skill activates on file patterns, keywords, and conversation
signals.

**File patterns**:

- `**/contracts/**`, `**/legal/**`, `**/agreements/**`,
  `**/redlines/**`
- `**/vendor-selection*`, `**/rfp-response*`, `**/sow-*`,
  `**/msa-*`
- `**/offers/**`, `**/comp-letter*`, `**/salary-band*`
- `**/term-sheet*`, `**/cap-table*`, `**/equity-grant*`
- `**/m-and-a/**`, `**/due-diligence*`
- `**/board-meeting*`, `**/investor-update*`
- `**/dispute*`, `**/settlement*`, `**/mediation*`

**Keyword triggers**:

- "negotiate", "negotiation", "bargain", "haggle"
- "BATNA", "ZOPA", "reservation value", "walkaway"
- "redline", "term sheet", "MSA", "SOW"
- "vendor proposal", "RFP response", "discount", "concession"
- "comp negotiation", "salary band", "offer letter"
- "anchor", "first offer", "counter-offer"
- "trade-off", "package", "bundle"
- "conflict", "dispute", "mediation", "arbitration"
- "cultural difference", "cross-border", "international deal"

**Conversation signals**:

- Vendor + customer pricing conversations
- Internal cross-team resource allocation disputes
- Hiring + offer construction conversations
- Investor + board negotiations
- Contract drafting + redlining
- Partnership + JV term sheets
- M&A discussions
- Disputed PR ownership conversations
- Roadmap prioritisation conflicts with senior stakeholders

If the work is **pure information exchange** (RFC review, code
review, status update), this skill is NOT engaged. It fires when
parties have differing interests and an agreement must be reached.
