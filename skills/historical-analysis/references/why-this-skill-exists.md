# historical-analysis: Why This Skill Exists

> The failure modes this skill prevents - folk history, Whig technology narratives, founding myths,
> cherry-picked analogies, presentism in post-mortems. Pointed at by the "Why This Skill Exists" row
> of the SKILL.md routing table.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Why This Skill Exists

Bad historical reasoning permeates technical and business contexts in identifiable patterns:

- **Folk history within organisations** — "we tried microservices in 2018 and it failed" with no
  document trail; the speaker was not there; the failure was actually a specific service's
  deployment misconfiguration, not microservices as architecture. Decisions get made on the folk
  story
- **Whig narratives of technology** — the inevitable march from monolith to SOA to microservices to
  serverless to whatever-is-next; this conceals the actual choices and trade-offs at each step and
  treats current architecture as the destination
- **Founding myths** — "we built this company to..." retrofitted to current strategy; the founding
  documents say something else; the difference is not embarrassment to suppress, it is data about
  institutional change
- **Cherry-picked analogies** — "this is the Munich moment" or "the iPhone moment" or "the Eastman
  Kodak moment" — invoked to short-circuit argument; the specific historical context that made
  Munich Munich is usually absent from the analogy
- **Anniversary content as marketing** — "ten years ago we shipped X" presented as history when it
  is brand promotion; the actual ten-years-ago archive often tells a different, messier story
- **Presentism in post-mortems** — "in retrospect we should have known"; in retrospect we always
  should have known; the question is what the available evidence + decision context supported at the
  time
- **Citation laundering** — "as the Romans knew" repeated from a Twitter quote that came from a
  self-help book that paraphrased a 19th-century historian who got it from Cicero (probably) but
  with an interpretation Cicero would not have recognised

Disciplined historical analysis rejects all of these. It treats the past as a foreign country,
demands evidence with provenance, holds counterfactuals open, presents argument with evidence
visible, and refuses to retrofit narratives to present preferences. The cost is more work and less
clean stories. The benefit is interpretations that survive contact with the archive — and decisions,
post-mortems, and strategies that engage with what actually happened rather than with what we wish
had happened.

The line from L. P. Hartley, used by David Lowenthal as the title of his 1985 study of historical
consciousness, holds: the past is a foreign country; they do things differently there. Engineering
organisations, startups, and policy bodies that pretend otherwise — that read the past as a mirror —
repeat its mistakes while believing they are learning from them.
