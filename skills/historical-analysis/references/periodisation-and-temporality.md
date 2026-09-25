# historical-analysis: Periodisation and temporality

> Core Patterns 4-5: periodisation as an interpretive choice and Braudel three temporalities (longue
> duree / conjoncture / evenementielle). Pointed at by the "Periodisation + temporality" row of the
> SKILL.md routing table.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## 4. Periodisation as interpretive choice

Periodisation — dividing the past into named eras — is interpretive, not natural. "The Renaissance,"
"the Industrial Revolution," "the Cold War," "the dot-com era" are constructs that organise
narrative; they privilege some causes and obscure others. Common periodisation pitfalls:

- **Backward projection**: naming a period from its outcome ("the road to war"). The actors did not
  know what they were on the road to
- **Centre-of-the-world periodisation**: dating world events from Western European chronology
  ignores Chinese, Islamic, Indian, African parallel chronologies
- **Decadal thinking**: "the 1960s" as a coherent unit. The cultural 1960s in the US started ~1963
  and ended ~1974; calendar decades are administrative artifacts
- **Whig periodisation**: dividing history into "progress toward us" stages

Always disclose the periodisation choice and its alternatives. Different periodisations produce
different stories.

## 5. The three temporalities (Braudel)

Fernand Braudel's *On History* (1969) divides historical time into three planes:

- **Longue durée** (long duration): geographic, climatic, structural — change over centuries. The
  Mediterranean basin, the role of money, the slow expansion of literacy
- **Conjoncture** (medium term): economic cycles, demographic curves, political regimes — change
  over decades
- **Événementielle** (event history): wars, elections, scandals, individual decisions — surface foam
  on the deeper tides

A historical question may live mainly at one plane but is shaped by the others. The 2008 financial
crisis is an event; it sits on a conjuncture (financialisation since the 1970s); which sits on a
longue durée (the development of credit instruments since the Renaissance). Single-plane analysis
flattens the picture.

Engineering analogue: the same is true of architectural change. A specific bug fix is *événement*;
the deprecation cycle of a framework is *conjoncture*; the long-run convergence on RESTful
interfaces is *longue durée*.
