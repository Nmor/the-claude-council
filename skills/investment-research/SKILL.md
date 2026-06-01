---
name: investment-research
description: Principal-level investment research methodology — thesis development, primary research, financial modelling, valuation triangulation, risk identification, and the disciplined write-up that supports a buy / sell / hold recommendation.
---

# Investment Research

## Purpose

Investment research turns published filings, channel checks, expert interviews, and observable market data into a defensible thesis about a security's mispricing. The output is a research note: a one-line recommendation backed by 10-40 pages of analysis, model output, risk identification, and post-publication monitoring plan. Principal-level research is disciplined — every assertion is sourced, every model assumption is justified, every counter-argument is documented and addressed, and every recommendation is monitored for thesis breakage. Amateur research is conviction without sources, narrative without model, and entry without exit plan.

This skill governs the full research lifecycle: idea generation, hypothesis framing, primary + secondary data collection, financial modelling, valuation triangulation (via the `valuation-models` skill), risk register, counter-thesis enumeration, publication, and post-publication monitoring against the breakage indicators identified pre-trade.

## Standards Cited

- **CFA Institute Body of Knowledge — Equity Investments + Fixed Income** (2026 edition) — fundamental analysis framework, financial statement analysis
- **CFA Institute Code of Ethics + Standards of Professional Conduct** + **Asset Manager Code** — research independence, disclosure of conflicts, integrity of capital markets
- **SEC Regulation Fair Disclosure (Reg FD, 17 CFR §243.100-243.103)** — selective disclosure prohibition; equal access
- **MiFID II Article 24** — research unbundling; explicit research payments separated from execution
- **FINRA Rule 2241** — research analyst conflicts of interest, communication standards
- **AICPA SAS 145 + PCAOB AS 2110** — risk assessment in financial statements (informs analyst's audit-quality review)
- **Penman "Financial Statement Analysis and Security Valuation" 5e** — accruals, residual income, abnormal earnings
- **Greenblatt "You Can Be a Stock Market Genius"** + **Klarman "Margin of Safety"** — special-situation framework
- **Mauboussin "More Than You Know" + "The Success Equation"** — base rates, expectations investing
- **Damodaran "Narrative and Numbers"** (2017, Columbia Business School Press) — bridging story to spreadsheet

## When to Fire

- Idea generation triggered by screen, news event, sector rotation, or referral
- Initiation of coverage on a new name — first 30-60 day deep dive
- Earnings releases — model update, thesis re-check, post-print note
- Capital markets day, analyst day, investor day — multi-hour management presentations
- Strategic event — M&A announced, spin-off proposed, restructuring announced
- Industry event — major regulation, competitor's disruption, supply shock
- Risk event — short report published, accounting concern raised, executive departure, regulatory inquiry
- Quarterly portfolio review — re-rate every holding against current price
- Thesis-breakage trigger fired — pre-defined indicator (revenue miss, margin compression, customer concentration) materialised

## Core Patterns

### Pattern 1: Thesis structure — one page that fits on the elevator wall

```
RECOMMENDATION: BUY (TP $185, current $142, upside 30%)

THESIS (3 sentences max):
Acme Corp is the dominant North American distributor of widgets, with
40% market share, oligopolistic pricing power, and a 5% structural
ROIC advantage over peers. Street is modelling 4% organic revenue
growth versus management's 7-8% guidance and our channel-check-
backed 7% estimate, implying 25% earnings upside by year 3. Risks
are well-defined and historically transient.

KEY DATA POINTS (5-7 bullets):
- Pricing: +6% YoY realised pricing on contract renewals (channel checks)
- Volume: +1.5% YoY industry units (industry data)
- Margins: 280 bps gross margin expansion from procurement leverage
- Working capital: 22 days inventory vs 35 days for peers
- Capital allocation: 4% net buyback yield + 2% dividend yield
- Debt: Net debt / EBITDA 1.5x; investment grade BBB+
- Insider activity: 3 buys, 0 sells in last 6 months

VALUATION (range):
- Method 1: DCF — $172-$198 (WACC 8.5%, terminal growth 3%)
- Method 2: Trading comps — $165-$190 (peer median 18x P/E)
- Method 3: Precedent transactions — $190-$220 (last 3 strategic deals 13-15x EBITDA)
- Triangulated range: $170-$200
- Target price: $185 (midpoint)
- Upside to TP: 30%

KEY RISKS (and our view):
1. Recession reduces volume by 5-8% (we model 3% recession; downside case ~$125)
2. Loss of top-3 customer (we estimate 25% probability, ~$15 stock impact)
3. Regulatory pricing investigation (low probability; precedent suggests narrow scope)

THESIS BREAKERS (sell triggers):
- Two consecutive quarters of organic revenue growth < 3%
- Gross margin compression > 150 bps YoY in any quarter
- Loss of any top-5 customer
- Net debt / EBITDA above 3.0x

POSITION SIZE: 4% of portfolio (max 5% per IPS concentration limit)
ENTRY PLAN: 50% now, 25% at $135, 25% at $128
EXIT PLAN: Trim at $185 (target); sell at $200 (above range); sell at $115 (thesis-break)
```

The one-pager is the discipline. If the thesis can't be stated this concisely, the analyst doesn't understand it well enough to size it.

### Pattern 2: Primary research — go beyond filings

Read the 10-K, 10-Q, 8-K, proxy, annual reports of every issuer in scope. But filings are necessary, not sufficient. The differentiated edge comes from primary research:

| Source | What it gives |
| --- | --- |
| **Channel checks** | Customer / supplier / distributor calls — actual demand signals weeks ahead of reported numbers |
| **Industry experts (Tegus, GLG, Third Bridge, AlphaSights)** | Domain context, competitive landscape, technology shifts |
| **Conferences + trade shows** | Real-time product feedback, sentiment, hiring tone |
| **Job postings** (LinkedIn, company careers page) | Investment areas, geographic expansion, hiring slowdown |
| **Web traffic + app store data** (SimilarWeb, Sensor Tower) | Top-of-funnel demand signal |
| **Credit card panel data** (YipitData, Earnest Analytics) | Direct revenue indicator for consumer businesses |
| **Satellite imagery** (Orbital Insight, RS Metrics) | Store traffic, oil tank levels, agricultural yields |
| **Government data** (Census, BLS, Eurostat) | Macro tilt, sector trends |
| **Patent filings** (USPTO, EPO) | Tech direction, IP defensibility |
| **FOIA + regulatory submissions** | FDA approval timelines, drug trial data, environmental compliance |

Compliance: NEVER trade on Material Non-Public Information (MNPI). Channel checks must respect Reg FD — get information from the broader ecosystem (suppliers, customers, competitors) but never from a company insider who hasn't already publicly disclosed it. Document every expert call: source, date, topic, no MNPI signed off.

### Pattern 3: Financial model — audit-quality

```
SECTION 1: HISTORICAL FINANCIALS (5-10 year history)
- Income statement (revenue → net income with each line item)
- Balance sheet (every line item, with notes for unusual items)
- Cash flow (operating, investing, financing — reconciled to balance sheet)
- Segment breakdown (revenue + EBIT per segment)
- KPI panel (volume, ASP, gross margin per segment, capex/revenue, R&D/revenue)
- Restated for accounting changes (e.g., IFRS 15 / ASC 606 adoption, IFRS 16 / ASC 842)

SECTION 2: ASSUMPTIONS (explicit, sourced)
- Volume growth per segment (channel-check sourced)
- Pricing per segment (contract renewal data)
- Cost inflation (input costs, labour, freight)
- Capex schedule (announced projects + maintenance baseline)
- Working capital efficiency (DSO, DIO, DPO trends)
- Tax rate (statutory + actual normalised)
- Share count (buybacks per management guidance)

SECTION 3: PROJECTIONS (5-7 year forecast)
- Income statement
- Balance sheet (full reconciliation)
- Cash flow (free cash flow per year)
- Sensitivity panel (volume ±5%, pricing ±2%, margin ±100 bps)

SECTION 4: VALUATION (per `~/.claude/skills/valuation-models/SKILL.md`)
- DCF (with sensitivity)
- Trading multiples
- Precedent transactions
- Football field chart

SECTION 5: SCENARIOS
- Base case (analyst's central view)
- Upside (bullish but plausible)
- Downside (recession + key risks materialise)
- Probability-weighted expected value
```

Every cell in the spreadsheet should be auditable: blue cells are inputs (sourced), black cells are formulas, NO cells are hardcoded over formulas. Versions saved with date stamps; the live model is a SINGLE source of truth.

### Pattern 4: Risk register — name every risk before publication

```yaml
risks:
  - id: RISK-001
    category: macro
    description: US recession reduces industrial volumes 8-12%
    likelihood: 25%
    impact_on_thesis: ~$20/share downside
    mitigation: Position sized at 4% (not 7%); hedge via index puts
    monitoring_signal: ISM manufacturing PMI <48 for 2 months

  - id: RISK-002
    category: idiosyncratic
    description: Loss of top customer (15% of revenue)
    likelihood: 15%
    impact_on_thesis: ~$15/share downside; thesis-break event
    mitigation: Confirmed multi-year contract via channel checks
    monitoring_signal: Customer's industry filings; LinkedIn for customer's procurement team

  - id: RISK-003
    category: competitive
    description: New entrant compresses pricing 200 bps
    likelihood: 10%
    impact_on_thesis: ~$10/share; manageable, not thesis-break
    mitigation: Switching costs + IP moat
    monitoring_signal: Trade show competitive intelligence; web traffic

  - id: RISK-004
    category: regulatory
    description: FTC pricing investigation initiated
    likelihood: 5%
    impact_on_thesis: Headline risk + multiple compression
    mitigation: None — exogenous
    monitoring_signal: FTC docket; DOJ public statements

  - id: RISK-005
    category: management
    description: CFO departure (key thesis driver)
    likelihood: 10%
    impact_on_thesis: ~$8/share multiple compression
    mitigation: None
    monitoring_signal: 8-K filings; LinkedIn

  - id: RISK-006
    category: accounting
    description: Channel-stuffing or revenue recognition concerns
    likelihood: 5%
    impact_on_thesis: ~$40/share + thesis-break
    mitigation: DSO trending stable; auditor unchanged
    monitoring_signal: DSO above 75 days; auditor change; SEC comment letters
```

A research note without an explicit risk register is incomplete. Risks aren't disqualifiers — they're inputs to position sizing.

### Pattern 5: Counter-thesis — argue the other side

Every long thesis has a bear case; every short thesis has a bull case. The analyst must articulate the counter-thesis at the level of detail of someone who actually believes it. If the bear case can't be summarised in 5 bullets, the analyst hasn't done the work.

```
BEAR THESIS (Acme Corp):
1. Cyclical peak: 2024-2025 was anomalous demand from post-COVID stocking; normalised demand 15% lower
2. Margin mean-reversion: 280 bps GM expansion came from temporary input cost relief; 2026 inputs +6% YoY
3. Customer concentration: Top-3 customers 35% of revenue; mid-cycle they'll consolidate suppliers
4. Multiple compression: Trading at 18x P/E vs 12x long-run average; mean-revert to 14x
5. Management compensation tied to short-term EBITDA — incentive to reach into future quarters

OUR REBUTTAL:
1. We track unit volumes against pre-COVID 5-year average; 2026 estimate is 1.5% above (not a bubble)
2. Input cost relief partially structural (renegotiated supplier contracts, automation capex)
3. Customer concentration declining (top-3 was 42% in 2022); diversification continuing
4. Multiple expansion justified by ROIC improvement (8% → 14%) and earnings stability
5. Comp restructured 2024 to 50% long-term — alignment now appropriate
```

### Pattern 6: Post-publication monitoring

A research note is not a one-time event. Once published, monitor the leading indicators:

- Weekly: web traffic, app store rankings, hiring activity, insider transactions
- Monthly: credit card panel data, channel-check pulses, competitor disclosures
- Quarterly: earnings prints — model update, KPI track, thesis re-confirm
- Triggered: 8-K filings, news events, sector rotations, macro changes

When a thesis breaker fires, the recommendation is updated within 24 hours — not "let's see how next quarter plays out." Discipline.

## Anti-Patterns

### Anti-pattern 1: Confirmation bias

Once invested, the analyst seeks data confirming the thesis and ignores contradicting evidence. Mitigations: pre-commit thesis breakers in writing; have a sceptical peer review; rotate to a different sector annually to break psychological anchoring.

### Anti-pattern 2: Narrative over numbers

"The company is the leader in AI and trades at a premium because the future is AI" — vague narrative without specific demand, pricing, margin, capital model. Damodaran's "Narrative and Numbers" is the antidote: every narrative element should map to a model input.

### Anti-pattern 3: Inadequate primary research

Reading filings and a few sell-side notes ≠ research. Differentiated edge requires primary work — channel checks, expert calls, alternative data. Without it, the analyst is repeating consensus and paying active fees for index returns.

### Anti-pattern 4: Hidden conflicts of interest

Analyst's spouse owns the stock. Analyst's brokerage relationship with company. Analyst's investment in private placement. Per CFA Code + FINRA Rule 2241, conflicts must be disclosed at note level. Failure to disclose is career-ending.

### Anti-pattern 5: Recency bias on macro

Modelling next year's macro as last year's macro. Markets rotate; mean-reversion is the strongest empirical signal. Stress-test against historical recessions, expansions, oil shocks, rate-hike cycles.

### Anti-pattern 6: No exit plan

Buy at $142 with TP $185 but no published trim plan. When the stock rips to $200, the analyst rationalises holding. The pre-committed trim plan is what locks in gains.

### Anti-pattern 7: Anchoring to entry price

"I bought at $142; it's now $120; let me hold until it returns to my cost basis." The market does not care about your cost basis. Hold/sell decisions are made on prospective return from CURRENT price vs alternatives, not on prior decisions.

### Anti-pattern 8: Underestimating accounting complexity

Revenue recognition under ASC 606 / IFRS 15, lease accounting under ASC 842 / IFRS 16, equity-method investments, segment reporting changes, restructuring charges, one-time items. Misreading the financials produces wrong inputs to the model. When in doubt, read the actual accounting standard plus the auditor's report.

### Anti-pattern 9: Ignoring base rates

"This management team will execute the turnaround." Base rate for management turnarounds: ~20% success over 5 years. Build the bear case at base rate; require evidence to deviate from base rate.

### Anti-pattern 10: Failing to update on new information

Quarter prints; thesis-relevant data emerges; analyst doesn't update the model or the note. The stale note becomes a misleading artifact. Standard: every material event triggers a note update within 24-48 hours.

## Verification Checklist

- [ ] One-page thesis written before model
- [ ] Recommendation, TP, upside/downside, time horizon specified
- [ ] At least 3 primary research sources (not just filings + sell-side)
- [ ] Financial model auditable: inputs sourced, formulas not overwritten
- [ ] Valuation triangulated via at least 3 methods (per `~/.claude/skills/valuation-models/SKILL.md`)
- [ ] Risk register names 5-10 risks with likelihood, impact, monitoring signals
- [ ] Counter-thesis articulated with 5+ specific arguments
- [ ] Thesis breakers defined in writing — pre-trade
- [ ] Position sizing justified per IPS concentration limit
- [ ] Entry and exit plan written
- [ ] Conflicts of interest disclosed
- [ ] No MNPI in research process (channel checks Reg FD compliant)
- [ ] Reg FD / FINRA 2241 / MiFID II compliance check
- [ ] Peer reviewed by independent analyst (sanity + sceptic)
- [ ] Post-publication monitoring plan written
- [ ] Quarterly + event-driven update cadence committed

## Cross-References

- `~/.claude/skills/valuation-models/SKILL.md` — valuation framework consumed by Section 4
- `~/.claude/skills/portfolio-theory/SKILL.md` — position sizing within IPS context
- `~/.claude/skills/investor-due-diligence/SKILL.md` — manager / fund / private-company diligence
- `~/.claude/skills/financial-analyst/SKILL.md` — analyst workflow underlying the research note
- `~/.claude/skills/stock-broker/SKILL.md` — execution venue + transaction-cost analysis
- `~/.claude/skills/ifrs-gaap-reporting/SKILL.md` — accounting standards underlying financial statements
- `~/.claude/skills/fp-and-a/SKILL.md` — operating metrics consumed by the model
- `~/.claude/rules/common/no-overclaim.md` — recommendations are HYPOTHESES, not certainties

## Why This Skill Exists

Sell-side and buy-side research that is shallow, undisciplined, or conflicted destroys investor capital. Empirical evidence:

- Murphy + McCallum + Berton (2018, Journal of Financial Economics) — analyst recommendations have positive but modest predictive power; "buy" recommendations on conflicted broker pairs underperform
- SPIVA reports — most active funds underperform their benchmark over 10-year horizons; the underperformance is largely driven by costs that the research process should overcome but often doesn't
- Behavioural research (Kahneman, Tversky, Thaler) — analysts (like everyone) suffer from anchoring, recency, confirmation bias, overconfidence

The discipline of one-page thesis + primary research + audit-quality model + risk register + counter-thesis + thesis breakers + post-publication monitoring is what separates institutional research from speculation. Done at scale across hundreds of analysts, this discipline is how value-add active management exists. Without it, active management is just expensive index-tracking.

Edge in research is RARE. The analyst who doesn't believe edge is rare hasn't been in the business long enough.

## Compliance & Standards Mapping

- **IFRS §1 Presentation of Financial Statements** — IFRS
  Foundation; statutory baseline
- **US GAAP — ASC §606** (Revenue from Contracts with Customers)
  and **ASC §842** (Leases) — FASB
- **SOX §404** — Internal control over financial reporting
- **ISO/IEC 27001:2022 Annex A** — Information security controls
  (financial systems in scope)
- **NIST SP 800-53 Rev 5 §AU** — Audit + accountability
  (financial transaction logging)
- **NIST SP 800-53 Rev 5 §AC-6** — Least privilege (segregation
  of duties)
- **OWASP ASVS 4.0.3 §V7** — Error handling + logging (financial
  events audited per `audit-logging.md`)
- **OWASP ASVS 4.0.3 §V8** — Data protection
- **PCI-DSS v4.0 §10** — Track + monitor access to network
  resources + cardholder data
- **CFA Institute Code of Ethics + Standards of Professional
  Conduct** — analyst integrity
- **CWE-840** — Business Logic Errors (financial calculations
  exposed)

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Thesis stated without explicit thesis-breaker (no falsifiable predicate)
- Recommendation issued without counter-thesis review
- Model assumptions not stress-tested at 3 scenarios (bear / base / bull)
- Primary research absent — analyst relied on sell-side consensus only (no edge)
- Post-publication monitoring lapsed (no quarterly thesis review)
- Catalyst missing or vague ("eventually realises value")
- Position-sizing not linked to conviction × volatility
- Insider sales / unusual options activity unmonitored
- Management quality assessment skipped (governance flags ignored)
- Industry-cycle stage misidentified (peak misread as growth)

**Refinement candidates**:
- New thesis-template row when a new asset class becomes coverage
- New cross-reference when a sister skill (financial-analyst, valuation-models, investor-due-diligence) adds a research gate
- Tightening of the catalyst-discipline policy when soft-thesis regression recurs
- New post-publication monitoring template when stale-thesis pattern emerges
