# negotiation-patterns: Patterns deal design

> Deal design structures that create value across issues: multi-issue tradeoff
> scoring, MESO, contingency contracts, and post-settlement settlement.
> Pointed at by the SKILL.md rows "Pattern 6" through "Pattern 9".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 6: Multi-Issue Tradeoff Design

Single-issue negotiations (just price) are zero-sum. Multi-issue
negotiations create value through **differential valuation**: if
each side cares about different things, trades produce joint gains.

Practical process:

1. **List every issue** before the meeting — not just price. For
   a vendor deal: price, term, payment terms, SLA, exclusivity,
   IP, support, scope, change-request handling, renewal terms,
   termination clauses, MFN clauses, audit rights.
2. **Score your importance** of each issue (e.g., 0-100, summing
   to 100).
3. **Estimate the counterparty's importance** of each.
4. **Look for differences.** Where their importance > yours +
   yours is high on something they don't care about → trade.
5. **Package issues** in proposals instead of negotiating each in
   sequence. "Here's a package that addresses X, Y, Z — what do
   you think?"

This scoring discipline shifts the conversation from positional
to joint optimisation. Combined with MESO (multiple equivalent
simultaneous offers — Malhotra + Bazerman 2007), it surfaces
preferences quickly.

## Pattern 7: MESO — Multiple Equivalent Simultaneous Offers

Present 2-4 offers, all equally valuable to you, that differ
across issues. Example for a vendor:

| Offer | Price | Term | Payment | Exclusivity |
| --- | --- | --- | --- | --- |
| A | $100K | 1y | NET-30 | Non-exclusive |
| B | $85K | 2y | NET-60 | Non-exclusive |
| C | $75K | 2y | NET-30 | Region-exclusive |

The counterparty's choice reveals which issues they value most.
You then build the next iteration around that signal. Avoids the
"single offer rejected" trap.

## Pattern 8: Contingency Contracts (Resolve Disagreements About the Future)

When parties disagree about a future event ("the integration will
work" vs "the integration will fail"), a contingency contract
prices the disagreement instead of negotiating around it.

> Buyer thinks the SaaS migration will save $500K. Seller agrees but
> demands $400K. Buyer offers: $300K upfront + $200K when savings
> are independently audited at $400K+ in year 2.

The party with confidence in their forecast gets paid if it's
right; the other side is protected if it's wrong. The disagreement
becomes a tradeable parameter instead of a deal-killer (Malhotra +
Bazerman 2007).

## Pattern 9: Post-Settlement Settlement

After signing, propose: "Could we both do better?" Re-examine the
deal for unexplored joint gains, knowing each party can veto. Often
unlocks 5-15% incremental value because pre-signing competitive
dynamics gave way to post-signing alignment.
