# communication-patterns: When to Fire

> File globs, keyword triggers and conversation signals that fire this skill, plus the
> internal-thinking exclusion. Pointed at by the SKILL.md row "When to Fire".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## When to Fire

This skill activates on file patterns, keywords, and conversation
signals.

**File patterns**:

- `**/*.md` (any markdown file is a communication artefact)
- `**/docs/**`, `**/README*`, `**/CHANGELOG*`, `**/CONTRIBUTING*`
- `**/rfcs/**`, `**/adrs/**`, `**/proposals/**`
- `**/decks/**`, `**/presentations/**`, `**/slides/**`,
  `**/*.pptx`, `**/*.key`
- `**/memos/**`, `**/all-hands/**`, `**/board-update*`
- `**/postmortem*`, `**/incident-report*`, `**/rca-*`
- `**/blog/**`, `**/press-release*`, `**/marketing/**`
- `**/onboarding/**`, `**/training/**`, `**/playbook*`
- `**/customer-comms/**`, `**/status-page/**`
- `**/perf-review*`, `**/1-on-1*`, `**/feedback*`

**Keyword triggers**:

- "memo", "doc", "RFC", "ADR", "proposal", "deck", "slides"
- "all-hands", "board", "investor", "exec", "leadership"
- "blog post", "press release", "announcement"
- "incident report", "postmortem", "RCA", "status update"
- "presentation", "talk", "demo", "pitch"
- "difficult conversation", "feedback", "PIP", "termination"
- "performance review", "1:1", "1-on-1"
- "explain", "summarise", "TL;DR", "executive summary"
- "audience", "tone", "framing", "narrative"
- "slack thread", "email to", "comms"

**Conversation signals**:

- A senior stakeholder needs context on a complex topic fast
- An external public-facing artefact is being drafted
- A difficult interpersonal conversation needs preparation
- A presentation needs to land with a specific decision
- Customer / partner / press needs reassuring during a crisis
- A cross-team initiative needs alignment narrative
- A junior engineer needs feedback that lands without crushing
- A status page or incident needs public messaging
- An offer letter or rejection note needs drafting

If the work is **internal thinking** (notes-to-self, scratch
work), this skill is not engaged. It fires when the artefact has
an audience.
