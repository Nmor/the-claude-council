# communication-patterns: Crisis comms

> Incident, outage and breach communication: SCCT + Fink speed, ownership, cadence and postmortem
> patterns. Pointed at by the SKILL.md row "Pattern 13".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 13: Crisis + Incident Communication

When an outage, breach, or scandal hits, communication failures
multiply the damage. Coombs' SCCT + Fink:

- **Speed matters.** First public statement within minutes /
  hours, not days. Silence reads as cover-up.
- **What we know + what we're doing + when we'll update next.**
  Even when you don't know the cause, you can name those three.
- **Take responsibility proportional to attribution.** If it's
  your fault, say so unambiguously. If it's not, explain why
  briefly without sounding defensive.
- **Specific, not generic.** "We saw elevated error rates
  starting 14:32 UTC" beats "There was a brief issue."
- **One voice.** Multiple spokespeople with slightly different
  stories = chaos. One designated comms lead + everyone else
  routes through them.
- **Customer pain first.** Acknowledge the impact before
  explaining the technical detail.
- **Time-stamped updates.** Even "we're still investigating"
  is useful. Cadence: every 30 min during active incident,
  daily through resolution.
- **Postmortem published.** Internal + (often) external.
  Specific failure modes, specific fixes, specific timelines.
  See e.g., AWS, Cloudflare, GitLab postmortem patterns.
