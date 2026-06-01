---
name: valuation-models
description: Principal-level valuation methodologies — DCF, trading comparables, precedent transactions, LBO, sum-of-the-parts, venture capital method, real options. Cite valuation outputs as ranges with explicit assumption sensitivity, never a single point estimate.
---

# Valuation Models

## Purpose

Valuation translates a business into a price. Every M&A deal, fundraising round, employee option grant, impairment test, fair-value disclosure, and strategic divestiture relies on a defensible valuation. The discipline is not "compute a number" — it is to triangulate a defensible RANGE from multiple methods, document every assumption, run sensitivity around the high-leverage drivers, and explain why the range is the range. A valuation that produces a single number with no sensitivity is professional malpractice; the inputs are uncertain, so the output must be too.

This skill governs principal-level valuation work: choosing the right method for the asset class, building defensible models in spreadsheets or code, documenting assumptions in an audit-defensible footnote pack, and communicating the result honestly to the audience (board, acquirer, regulator, auditor, employee).

## Standards Cited

- **CFA Institute Body of Knowledge — Equity Investments + Corporate Issuers** (CFA Program Curriculum, 2026 edition) — canonical methodology for DCF, residual income, dividend discount, multiples
- **Damodaran "Investment Valuation" 3rd edition** (Wiley, 2012) + ongoing `pages.stern.nyu.edu/~adamodar/` datasets — sector betas, country risk premia, ERP estimates
- **Koller, Goedhart, Wessels "Valuation: Measuring and Managing the Value of Companies" 7e** (McKinsey, 2020) — ROIC-growth value driver framework, enterprise vs equity bridge
- **AICPA Accounting and Valuation Guide — Valuation of Privately-Held-Company Equity Securities Issued as Compensation** (2013, updated 2019) — 409A methodology
- **IRS Revenue Ruling 59-60** + **IRC §409A** — fair-market-value standard for tax purposes
- **IPEV (International Private Equity and Venture Capital) Valuation Guidelines** (December 2022) — quarterly fair-value reporting for PE/VC funds
- **IFRS 13 Fair Value Measurement** + **ASC 820 Fair Value Measurement** — Level 1/2/3 hierarchy, exit-price standard
- **AICPA Statement on Standards for Valuation Services (SSVS) No. 1** — engagement scope, conclusion vs calculation, restrictions
- **Kaplan + Ruback (1995, JF)** "The Valuation of Cash Flow Forecasts" — empirical evidence on DCF vs multiples
- **Mercer Capital "Buy-Sell Agreements" + AICPA discount studies** — DLOM (discount for lack of marketability) and DLOC (discount for lack of control) ranges

## When to Fire

- A new entity is being valued: company being acquired, divested, IPO'd, or 409A-priced for option grants
- A goodwill or intangible impairment test is due (annual or triggering event per ASC 350 / IAS 36)
- A fund's quarterly NAV requires Level 3 fair-value marks (per IFRS 13 / ASC 820 / IPEV)
- A fundraising round is pricing — pre-money and post-money valuation negotiation
- An LBO is being modelled — sponsor needs to know maximum bid for target IRR
- A break-up or sum-of-the-parts analysis is requested (activist defence, strategic review)
- An employee or founder requests a valuation conversation — option strike price, secondary sale, tender offer
- A regulator, auditor, or court requests a fair-value or solvency opinion

## Core Patterns

### Pattern 1: Triangulation, not single method

Every valuation triangulates THREE methods at minimum:

| Method | Best for | Why |
| --- | --- | --- |
| Discounted Cash Flow (DCF) | Mature businesses with predictable cash flows; cyclically-adjusted forecasts | Fundamental value, independent of market sentiment |
| Trading Comparables (Comps) | Sectors with public peers; calibrates to current market | Reflects what investors pay today for similar businesses |
| Precedent Transactions | M&A targets, control premium relevant | Reflects what acquirers paid recently for similar businesses |
| LBO Analysis | Sponsor-led deals, financial buyer perspective | Floor value from PE buyer's IRR requirement |
| Sum-of-the-Parts (SOTP) | Conglomerates, multi-segment businesses | Each segment valued in its own peer set |
| Venture Capital Method | Pre-revenue startups, no public comps | Backsolves entry price from exit assumption + target IRR |
| Asset-based | Distressed, liquidation scenarios | Floor when going-concern is questionable |
| Real Options | Optionality-heavy assets (mining, biotech, R&D-stage) | Captures value of waiting / abandoning / expanding |

Output is a "football field" chart: each method produces a range; the overlap zone is the defensible range. Outliers get explained, not dropped.

### Pattern 2: DCF — disciplined structure

```
Enterprise Value (EV) =
  Σ [FCFF_t / (1 + WACC)^t]    for t = 1 to T (explicit forecast)
  + Terminal Value / (1 + WACC)^T

where:
  FCFF_t = EBIT × (1 - tax_rate) + D&A - CapEx - ΔWorking Capital
  Terminal Value = FCFF_{T+1} / (WACC - g)     (Gordon growth)
                OR Exit Multiple × EBITDA_T

Equity Value = EV - Net Debt - Minority Interest - Preferred Equity
             + Investments in Associates + Excess Cash
```

**Forecast period rule of thumb**: 5-10 years for mature businesses; 10-15 years for high-growth where the steady-state isn't reached early. The forecast period must extend until the business has reached a sustainable competitive equilibrium (ROIC ≈ WACC + steady-state spread).

**Terminal value sanity checks**:

- g (perpetual growth) must NOT exceed long-run nominal GDP growth (currently ~3.5% USD; ~2% EUR)
- Terminal value should NOT be > 75% of enterprise value (otherwise the model is mostly a guess about the perpetuity)
- Compute implied exit multiple (TV / EBITDA_T): should be within 0.5x-1.5x of trading comp range
- Compute implied ROIC at terminal year: should NOT meaningfully exceed WACC (otherwise the firm is creating value forever, which competition would erode)

**WACC composition (Koller §11)**:

```
WACC = (E/V) × Re + (D/V) × Rd × (1 - t)

Re (cost of equity) via CAPM = Rf + β × ERP + country_risk
  where:
    Rf = long-term government bond yield in same currency
    β  = sector beta, re-levered to target's capital structure
    ERP = equity risk premium (Damodaran ~5.5-6.5% for developed markets in 2026)
    country_risk = country-specific spread for emerging markets
```

The single highest-impact assumption is usually WACC — a 100 bps WACC change can shift EV by 15-25%. Sensitivity table is mandatory.

### Pattern 3: Trading comparables — calibrate to market

```sql
-- Build the peer set first; the peers ARE the valuation
SELECT
    company,
    market_cap,
    enterprise_value,
    revenue_ttm,
    ebitda_ttm,
    revenue_fwd_1y,
    ebitda_fwd_1y,
    ev / revenue_ttm     AS ev_revenue_ttm,
    ev / revenue_fwd_1y  AS ev_revenue_fwd,
    ev / ebitda_ttm      AS ev_ebitda_ttm,
    ev / ebitda_fwd_1y   AS ev_ebitda_fwd,
    market_cap / earnings_ttm AS pe_ttm
FROM peer_universe
WHERE sector_code = '...'
  AND market_cap > 100000000  -- avoid micro-caps; illiquidity distorts multiples
  AND NOT in_distress         -- distressed multiples are meaningless
ORDER BY market_cap DESC;
```

Peer selection rules:

- 6-12 peers is the sweet spot; <5 is unreliable, >15 is unfocused
- Same sub-sector AND similar business model (subscription SaaS peers ≠ on-premise software peers even in same SIC)
- Comparable size (within 0.5x-3x market cap range typically)
- Similar growth profile (SaaS at 30% growth has very different multiple than SaaS at 5%)
- Same accounting regime (IFRS vs US GAAP — adjust EBITDA for lease treatment per IFRS 16 vs ASC 842)
- Recent financials (latest 10-K + most recent quarter)

Apply the median or mean multiple to the target's metric. Discount for: smaller size (size premium), private status (DLOM 15-30%), key-person dependence, single-customer concentration.

### Pattern 4: LBO — solve for the bid

```typescript
interface LBOAssumptions {
  entry_ebitda: number;             // LTM or run-rate
  entry_multiple: number;           // EV / EBITDA at entry
  exit_year: number;                // typically 5
  exit_ebitda_growth: number;       // CAGR over hold period
  exit_multiple: number;            // multiple expansion / contraction
  debt_to_ebitda_at_entry: number;  // 5-7x typical leverage today
  interest_rate: number;            // weighted cost of debt
  amortisation_schedule: number[];  // % of debt repaid per year
  target_irr: number;               // sponsor's hurdle, typically 20-25%
}

function maximumBid(assumptions: LBOAssumptions): number {
  // Forward-solve: what entry EV produces 20% IRR?
  let entryEv = assumptions.entry_ebitda * assumptions.entry_multiple;
  const debt = assumptions.entry_ebitda * assumptions.debt_to_ebitda_at_entry;
  const equity = entryEv - debt;

  // Project exit
  const exitEbitda = assumptions.entry_ebitda *
    Math.pow(1 + assumptions.exit_ebitda_growth, assumptions.exit_year);
  const exitEv = exitEbitda * assumptions.exit_multiple;

  // Debt paydown from FCF over hold period
  let remainingDebt = debt;
  for (let t = 1; t <= assumptions.exit_year; t++) {
    const interestExpense = remainingDebt * assumptions.interest_rate;
    const fcfAvailable = assumptions.entry_ebitda * Math.pow(1.05, t) * 0.55
                       - interestExpense;
    const paydown = Math.min(fcfAvailable, remainingDebt * 0.1);
    remainingDebt -= paydown;
  }

  const exitEquity = exitEv - remainingDebt;
  const moic = exitEquity / equity;
  const irr = Math.pow(moic, 1 / assumptions.exit_year) - 1;

  if (irr < assumptions.target_irr) {
    // Lower entry multiple until IRR clears hurdle
    return entryEv * (assumptions.target_irr / irr);
  }
  return entryEv;
}
```

Sponsors care about IRR + MOIC (multiple of invested capital). Strategic buyers care about EPS accretion + synergies. The two valuations diverge — strategic buyers can typically pay more because they capture synergy NPV that the sponsor cannot.

### Pattern 5: Venture capital method (pre-revenue startups)

```
Exit Value = Exit Multiple × Exit Revenue (or EBITDA)
Present Value = Exit Value / (1 + IRR_target)^years_to_exit
Post-money Valuation = Present Value
Pre-money Valuation = Post-money - New Investment
Investor Ownership % = New Investment / Post-money
```

VC IRR hurdles: 30-40% for seed, 25-30% for Series A, 20-25% for later stages. Account for dilution from future rounds — a Series A investor expecting 25% ownership at IPO needs more like 35-40% at entry to survive Series B/C/D dilution.

### Pattern 6: Sum-of-the-Parts (conglomerates)

```typescript
interface BusinessSegment {
  name: string;
  revenue: number;
  ebitda: number;
  peer_ev_ebitda: number;
  peer_ev_revenue: number;
  corporate_overhead_allocation: number;
}

function sumOfTheParts(segments: BusinessSegment[]): {
  segmentValues: Map<string, number>;
  conglomerateDiscount: number;
  totalEv: number;
} {
  const segmentValues = new Map<string, number>();
  let gross = 0;
  for (const seg of segments) {
    // EV/EBITDA primary; EV/Revenue cross-check
    const evEbitda = seg.ebitda * seg.peer_ev_ebitda;
    const evRevenue = seg.revenue * seg.peer_ev_revenue;
    const segEv = (evEbitda + evRevenue) / 2;  // simple blend; refine per case
    const netSegEv = segEv - seg.corporate_overhead_allocation * 10;  // capitalise overhead
    segmentValues.set(seg.name, netSegEv);
    gross += netSegEv;
  }
  // Conglomerate discount: empirical 10-20% for diversified holding companies
  const conglomerateDiscount = 0.15;
  return {
    segmentValues,
    conglomerateDiscount,
    totalEv: gross * (1 - conglomerateDiscount),
  };
}
```

Use SOTP when segments are materially different (different growth, different multiples, different end markets). The conglomerate discount reflects investor preference for pure-play exposure plus the corporate-overhead cost of running the holding structure.

## Anti-Patterns

### Anti-pattern 1: Single point estimate without range

"Our valuation is $487M." → Wrong. The output is a RANGE ($420M-$540M) with explicit assumption sensitivity. The midpoint can be the headline, but the range MUST be reported.

### Anti-pattern 2: Hockey-stick forecasts with no justification

Year 1 revenue growth 15%, year 2 25%, year 3 45%, year 4 60% — with no explanation of why growth accelerates. Every step-change in the forecast requires a documented business reason (new product launch, geographic expansion, large contract win) tied to operational milestones.

### Anti-pattern 3: Terminal value dominating

If terminal value > 80% of EV, the DCF is mostly a guess about the perpetuity. Either extend the forecast period until ROIC stabilises near WACC, or admit the DCF is unreliable for this asset and lean on multiples.

### Anti-pattern 4: Picking peers that produce desired answer

"We need EV/Revenue of 8x to justify the deal" → cherry-pick peers with high multiples. The peer set must be objectively defined by sector, size, growth, business model — NOT by output multiple. Document the screen criteria; let the analyst find the same peer set independently.

### Anti-pattern 5: Ignoring net debt + equity bridge

Enterprise value ≠ equity value. Bridge: EV − Total Debt + Cash − Minority Interest − Preferred Equity + Investments in Associates = Equity Value. Skipping the bridge gives prices that are wrong by tens of percent.

### Anti-pattern 6: Using book value as proxy for fair value

Book value is a historical-cost number adjusted for depreciation. Market value can be 5x book or 0.5x book depending on the business. The only exceptions: pure financial institutions where book ≈ liquidation value, and asset-heavy businesses in liquidation.

### Anti-pattern 7: Modelling perpetual margin expansion

EBITDA margin in year 1: 12%. Year 10 terminal: 35%. → Wrong unless backed by documented operational levers. Competitive markets erode margins toward cost of capital; assume mean-reversion unless the moat is specifically defended.

### Anti-pattern 8: Forgetting taxes on terminal year

DCF FCFF should use NORMALISED tax rate, not the marginal rate of the terminal year. NOL carryforwards run out; effective rate trends toward statutory.

### Anti-pattern 9: Ignoring control premium / illiquidity discount

Control transactions trade 20-40% above minority blocks. Private companies trade 15-30% below comparable public peers (DLOM). Skipping these adjustments distorts the valuation by the full premium/discount.

### Anti-pattern 10: One scenario only

Base case is necessary but not sufficient. Always run: downside (recession, key customer loss, regulation), base (management plan), upside (synergies realised, market share gain). The valuation range is bounded by these scenarios, not just base.

## Verification Checklist

- [ ] At least three valuation methods triangulated (e.g., DCF + Comps + Precedent Transactions)
- [ ] Range reported, not single point
- [ ] DCF forecast period extends until ROIC stabilises near WACC
- [ ] Terminal value < 75% of enterprise value
- [ ] WACC sensitivity table (±100 bps WACC × ±50 bps terminal growth)
- [ ] Peer set documented with selection criteria; peer screen reproducible
- [ ] Net debt bridge from EV to Equity Value explicit
- [ ] Control premium / illiquidity discount applied where applicable
- [ ] Downside + base + upside scenarios modelled
- [ ] All assumptions documented in footnote pack with sources
- [ ] Football field chart produced for executive summary
- [ ] Cross-check: implied exit multiple from DCF ≈ trading comp range
- [ ] Cross-check: implied perpetual growth ≤ long-run nominal GDP
- [ ] Audit trail preserved: source files, dataset versions, spreadsheet immutable copy

## Cross-References

- `~/.claude/skills/fp-and-a/SKILL.md` — operating plan that feeds the DCF forecast
- `~/.claude/skills/ifrs-gaap-reporting/SKILL.md` — fair-value disclosure under IFRS 13 / ASC 820
- `~/.claude/skills/portfolio-theory/SKILL.md` — diversification implications of single-asset valuations
- `~/.claude/skills/investor-due-diligence/SKILL.md` — diligence inputs that validate or invalidate model assumptions
- `~/.claude/skills/financial-analyst/SKILL.md` — analyst workflow that produces these models
- `~/.claude/rules/common/task-intake-due-diligence.md` Q16 (cost model) + Q22 (success criteria)
- `~/.claude/rules/common/no-overclaim.md` — never present a valuation as a "fact"

## Why This Skill Exists

Bad valuations destroy capital. The historical record:

- **Overpayment in M&A**: empirical research (Moeller, Schlingemann, Stulz 2005; Officer 2003) shows acquirer shareholders lose $0.20-$0.40 per dollar overpaid in cash deals. Total US M&A overpayment 1998-2001 alone: estimated $240B in destroyed acquirer value. Most overpayments stem from valuations that triangulated only one method (usually a DCF with rosy assumptions) and ignored the precedent transaction premium signal.
- **Goodwill impairments**: every Q4 brings a wave of impairments where carrying values exceed fair values. Half could have been prevented if the original acquisition valuation had run downside scenarios.
- **409A grants priced wrong**: a 409A valuation that undershoots fair value at grant date creates IRC §409A penalty tax for the option-holder (20% federal + state surtax). Companies that DIY 409A end up with employee tax liabilities and rescissions.
- **Fund NAV marks gone wrong**: PE funds that mark Level 3 assets to a single point estimate without sensitivity get auditor pushback (AICPA SAS 145 risk assessment). Properly triangulated NAV marks with documented assumptions survive examination; lazy marks don't.

The discipline of triangulation + sensitivity + scenario + documentation is what separates principal-level valuation from spreadsheet theatre. Every assumption in the model is a hypothesis; the sensitivity table is the test of which hypotheses dominate; the range is the honest output.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- DCF model with single point estimate instead of range / sensitivity
- WACC assumed without documented basis (risk-free rate, ERP, beta source)
- Terminal-value > 75% of enterprise value (model brittleness — assumption-domination)
- Comps multiple chosen without size/growth/quality adjustment
- LBO model without leverage capacity test (IRR ignoring debt service feasibility)
- Synergies in M&A model claimed without integration-cost offset
- 409A computed without §409A safe-harbor methodology
- Level 3 fair value mark without sensitivity disclosure
- Cross-check missing: DCF, comps, precedent transactions not triangulated
- Currency mismatch in multi-jurisdiction valuation (FX assumption hidden)

**Refinement candidates**:
- New methodology row when a new approach becomes standard (e.g., real-options for early-stage)
- New cross-reference when a sister skill (financial-analyst, investment-research, ifrs-gaap-reporting) adds a valuation gate
- Tightening of the sensitivity-table requirement when single-point-estimate regression recurs
- New scenario template when a new macro regime emerges
