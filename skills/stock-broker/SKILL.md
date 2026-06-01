---
name: stock-broker
description: Principal-level trade execution and broker workflow — order types, routing, transaction cost analysis (TCA), best execution duties, regulatory compliance (Reg NMS / MiFID II), suitability, and the operational discipline that turns a portfolio decision into actual settled positions.
---

# Stock Broker / Execution

## Purpose

The broker (registered representative on the retail side; execution trader on the institutional side) is the operational endpoint that converts an investment decision into actual settled positions in client accounts. The work spans pre-trade analysis (sizing, venue selection, expected market impact), live execution (order types, algos, dark pools, RFQs), post-trade reporting (TCA, settlement, reconciliation), regulatory compliance (best execution, suitability, KYC, AML, sanctions), and client communication. Done well, the broker minimises transaction costs (which compound destructively over portfolio horizon), executes within regulatory standards, and acts as a fiduciary to client interests. Done badly, the broker churns accounts, executes on conflicted venues, hides costs in spreads, and exposes the firm to regulatory enforcement and litigation.

This skill governs principal-level broker work: pre-trade cost estimation, venue + algorithm selection, live execution discipline, transaction cost analysis, settlement operations, regulatory compliance, suitability and KYC, and the broker-as-fiduciary mindset that builds long-term client relationships.

## Standards Cited

- **Securities Exchange Act of 1934 §11A + SEC Regulation NMS (Reg NMS, 17 CFR §242.600-612)** — National Market System, Order Protection Rule, Access Rule
- **FINRA Rule 5310 — Best Execution + Interpositioning** — broker's duty to seek best price + handling reasonable care
- **FINRA Rule 2111 — Suitability** — reasonable basis, customer-specific, quantitative suitability tests
- **FINRA Rule 2090 — Know Your Customer (KYC)**
- **SEC Rule 606 + Rule 605** — order routing disclosure + execution quality reporting
- **SEC Rule 15c3-5 — Market Access Rule** — pre-trade risk controls
- **MiFID II RTS 27 + RTS 28** — execution venue + top-5 venue disclosure (EU)
- **Bank Secrecy Act / USA PATRIOT Act + FinCEN AML Rule** — AML program, SARs, CTRs
- **OFAC sanctions lists** — pre-trade sanctions screening
- **NYSE Rule 80B + Reg SHO** — circuit breakers + short-sale locate / threshold lists
- **Almgren-Chriss (2000) "Optimal Execution of Portfolio Transactions"** — transaction cost modelling
- **Kissell + Glantz (2003) "Optimal Trading Strategies"** — implementation shortfall framework

## When to Fire

- Order ticket received from PM or client — execute today
- Block trade requested (size > 5% of ADV) — pre-trade impact analysis required
- New client account opening — KYC, AML, suitability documentation
- Portfolio rebalance with multiple line items — venue + algorithm selection
- Cross-border trade — additional regulatory + FX considerations
- Corporate action (rights, splits, mergers) processing
- Quarterly TCA review with clients
- Annual best execution review by best execution committee
- Trade error correction (mis-execution, mis-allocation)
- Regulatory exam preparation (SEC, FINRA, MAS, FCA, etc.)

## Core Patterns

### Pattern 1: Pre-trade workflow

```yaml
pre_trade_checklist:
  order_received:
    client: "Acme Family Office"
    account: "ACT-12345"
    side: BUY
    ticker: ACME
    qty: 100000
    order_type: limit
    limit_price: 142.50
    time_in_force: DAY
    benchmark: "VWAP"
    handling_instructions: "no display; minimise impact"

  pre_trade_checks:
    - kyc_current: confirmed (last refresh 2025-11-12)
    - aml_status: clear
    - sanctions_screen: clear (UBO checked against OFAC + EU + UN)
    - suitability: confirmed (concentration test: position will be 4.0% of portfolio; client max 5%)
    - cash_or_margin_available: $14.3M cash available; required $14.25M
    - sec_15c3_5_pre_trade_risk: passed
    - order_size_vs_adv: 100000 / 850000 = 11.8% of 30-day ADV — block trade
    - locate_required: N/A (buy order)
    - short_sale_threshold_list: N/A
    - reg_sho_close_out: N/A

  pre_trade_analysis:
    - estimated_implementation_shortfall: 18 bps (model: Almgren-Chriss with current vol)
    - participation_rate_recommendation: 8-12% of volume (avoid > 15% per Kissell)
    - execution_window: 10:00 - 15:30 (avoid open + close auction)
    - venue_selection:
        - 60% lit (NYSE primary + ARCA + IEX)
        - 30% dark (UBS-A, SuperX, Sigma X)
        - 10% block (BIDS, Liquidnet, IPO-Ross blocks)
    - algorithm: VWAP with passive-aggressive logic; min child size 200 shares
    - urgency: NORMAL (no thesis-break catalyst this week)

  approval_for_block: confirmed by trading desk head
```

### Pattern 2: Order types — pick the right tool

| Order Type | When | Trade-off |
| --- | --- | --- |
| **Market** | Tiny size, urgent fill, deep liquidity | No price control; pays spread + market impact |
| **Limit** | Price-sensitive entry, willing to wait | May not fill |
| **Limit on Close (LOC) / Market on Close (MOC)** | Index inclusion, end-of-day rebalance | Auction price uncertainty |
| **Stop / Stop-Limit** | Trigger fill on price move | Slippage on gap; stop-loss can be hunted |
| **Trailing Stop** | Lock in gains as price moves | Trailing offset trade-off |
| **VWAP algo** | Match a volume-weighted benchmark over a window | Subject to intraday volatility |
| **TWAP algo** | Match a time-weighted execution | Inferior to VWAP usually; predictable for adversaries |
| **POV (Participation rate)** | Stay at X% of volume | Tracks volume but explicit signal |
| **Implementation Shortfall (IS)** | Minimise cost vs decision price | Most sophisticated; needs vol forecast |
| **Dark / Mid-Point Peg** | Hide intent; capture spread midpoint | Slower fills; cross venue when block matches |
| **RFQ (request for quote)** | Block trade in OTC / fixed income | Information leakage risk; multiple dealer competition mitigates |

The choice of order type is the broker's primary lever for managing transaction cost. Misuse: market orders for large blocks (impact crushes fill), stop orders that trigger on noise (whipsaw), VWAP across the entire day for an urgent order (carries overnight risk).

### Pattern 3: Transaction Cost Analysis (TCA)

```python
def implementation_shortfall_bps(
    decision_price: float,
    average_fill_price: float,
    side: Literal["BUY", "SELL"],
) -> float:
    if side == "BUY":
        shortfall = (average_fill_price - decision_price) / decision_price
    else:
        shortfall = (decision_price - average_fill_price) / decision_price
    return shortfall * 10_000

def tca_report(trade: dict) -> dict:
    spread_at_decision = trade["ask_at_decision"] - trade["bid_at_decision"]
    spread_bps = spread_at_decision / trade["decision_price"] * 10_000

    impact_bps = implementation_shortfall_bps(
        trade["decision_price"], trade["average_fill_price"], trade["side"]
    )

    timing_bps = implementation_shortfall_bps(
        trade["decision_price"], trade["vwap_during_execution"], trade["side"]
    )

    opportunity_cost_bps = 0
    if trade["filled_qty"] < trade["target_qty"]:
        unfilled = trade["target_qty"] - trade["filled_qty"]
        post_close_price = trade["close_price"]
        opportunity_cost_bps = (
            implementation_shortfall_bps(
                trade["decision_price"], post_close_price, trade["side"]
            )
            * (unfilled / trade["target_qty"])
        )

    return {
        "spread_bps": spread_bps,
        "impact_bps_total": impact_bps,
        "timing_bps": timing_bps,
        "opportunity_cost_bps": opportunity_cost_bps,
        "total_cost_bps": impact_bps + opportunity_cost_bps,
        "vs_vwap_bps": (trade["average_fill_price"] - trade["vwap_during_execution"]) / trade["vwap_during_execution"] * 10_000,
    }
```

TCA quarterly report by trader, by algorithm, by venue, by symbol. Use to identify systematic patterns: algorithms that consistently underperform, venues with poor fill quality, traders who over-trade. Best-execution committee reviews TCA at minimum quarterly.

### Pattern 4: Best execution committee process

```yaml
best_execution_committee:
  members:
    - chief_compliance_officer (chair)
    - head_of_trading
    - head_of_research
    - independent_committee_member
  cadence: quarterly + ad hoc
  scope:
    - review tca by venue, algorithm, asset class
    - assess execution quality vs peers
    - review rule_606 (routing) + rule_605 (execution quality) reports
    - review payment_for_order_flow arrangements and conflicts
    - approve new venues / algos
    - review order routing changes
    - investigate execution quality outliers
    - approve venue routing policy
  documentation:
    - meeting minutes (formal)
    - decisions logged with rationale
    - 7+ year retention
```

Best execution is a duty, not a result. Even when a single trade gets a bad fill, the question is whether the FRAMEWORK is reasonable — venue selection process, algorithm choice, broker discretion. Documentation is the defence.

### Pattern 5: Suitability + KYC

```yaml
client_profile:
  account_id: ACT-12345
  client_type: institutional
  legal_structure: family_office_LLC
  domicile: NY_US
  tax_status: taxable

  investment_objectives:
    primary: capital_preservation
    secondary: long_term_growth
    income_required: 4_5_pct_annual

  risk_tolerance:
    self_reported: moderate
    objective_capacity: high  # large balance sheet, long horizon
    max_drawdown_tolerance: 25_pct

  time_horizon: 25_years
  liquidity_needs: 6_months_spending_in_cash

  financial_situation:
    net_worth: $480M
    investable_assets: $320M
    income_sources: diversified_business + investments

  investment_experience:
    years: 22
    sophistication: high
    prior_complex_products: yes

  restrictions:
    no_tobacco: true
    no_thermal_coal: true
    no_controversial_weapons: true
    single_security_max_pct: 5
    single_manager_max_pct: 20
    unlisted_max_pct: 25

  reviewed_by_advisor: Jane Doe, CFA — last review 2025-11-12
  next_review_due: 2026-11-12

suitability_check_per_trade:
  reasonable_basis: product appropriate for at least some investors (yes)
  customer_specific: matches THIS client's profile (yes — within concentration limits)
  quantitative: aggregate activity reasonable (turnover ratio 12%, well below excessive churning threshold)
```

KYC + suitability are mandatory pre-trade. Failure produces FINRA enforcement actions, customer arbitration awards, and reputational damage. Annual refresh; trigger refresh on material life events.

### Pattern 6: Block trade execution

Block trades (typically > 10% of ADV) require special handling — market impact can be catastrophic if displayed openly.

```
BLOCK EXECUTION PLAYBOOK

1. PRE-TRADE
   - Confirm urgency level (URGENT / NORMAL / PATIENT)
   - Run impact model (Almgren-Chriss or similar)
   - Determine execution window
   - Choose initial venue mix (lit / dark / block / RFQ)
   - Allocate cap by venue
   - Pre-allocate child orders to algorithms

2. EXECUTION
   - URGENT: Aggressive algo with higher participation; expect higher impact
   - NORMAL: VWAP or IS algo across the day; passive-aggressive logic
   - PATIENT: Dark only + block crossing networks; opportunistic only
   - Monitor in real-time:
     - Volume vs predicted volume
     - Spread vs predicted spread
     - Information leakage signals (correlated names moving)
     - News events
   - Pause if material market move OR news breaks
   - Halt and reassess if execution costs running 50% above pre-trade estimate

3. POST-TRADE
   - Generate TCA report within 24 hours
   - Document deviations from plan
   - Review with PM
   - Update model assumptions for next time
```

### Pattern 7: Settlement + operations

```yaml
trade_lifecycle:
  T_zero:
    - Execution at venue(s)
    - Trade reported to consolidated tape within Reg NMS time window
    - Pre-allocation to client accounts (omnibus or per-account)
    - Allocation methodology documented (average price, FIFO, pro-rata)

  T_zero_plus_minutes:
    - Confirmation messages issued
    - Position reconciliation begins
    - Compliance pre-allocation review

  T_plus_one (DTCC affirmation deadline):
    - Affirmation by client custodian
    - Pre-settlement matching
    - FX conversion if cross-currency
    - Margin call processing if applicable

  T_plus_two (DTCC settlement deadline for most US equities now T+1 as of May 2024):
    - Settlement at DTCC / Euroclear / Clearstream / equivalent CSD
    - Cash and securities movement
    - Confirmation to client

  T_plus_thirty:
    - Monthly statement issued
    - TCA report (quarterly)
    - Reconciliation with custodian

  Quarterly:
    - 13F filing if institutional advisor (US > $100M AUM)
    - Rule 606 + Rule 605 reports
    - Best execution committee review

  Annually:
    - Form ADV filing (US advisor)
    - Suitability review with each client
    - AML risk assessment review
```

US equity settlement is T+1 as of May 28, 2024 (per SEC Rule 15c6-1 amendment). Other markets vary (T+2 in EU until October 2027 transition).

## Anti-Patterns

### Anti-pattern 1: Front-running client orders

The broker's own account (or affiliated proprietary trader) buys ahead of a known client order. FINRA Rule 5270 prohibits this. Career and firm-ending — both criminal and regulatory exposure.

### Anti-pattern 2: Pre-arranged trading / wash sales

Trading designed to create artificial volume or move price (e.g., to trigger client stop orders, or to support a position the firm holds). Both SEC enforcement and criminal exposure.

### Anti-pattern 3: Churning client accounts

Excessive trading that generates commissions but doesn't fit client objectives. FINRA Rule 2111 quantitative suitability test (turnover ratio, cost-to-equity ratio). Reps measured on commission income alone produce churning patterns.

### Anti-pattern 4: Hidden mark-ups

OTC bonds, IPO allocations, and structured products historically had hidden mark-ups (broker buys at $99, sells to client at $102 without disclosing). MSRB + FINRA now require disclosed mark-ups for many trades. Hiding mark-ups is fraud.

### Anti-pattern 5: Ignoring PFOF (Payment for Order Flow) conflicts

If the broker routes orders to a market maker that pays for flow, the broker has an incentive to route there regardless of execution quality. PFOF must be disclosed per Rule 606; the broker still owes best execution. Robinhood paid $65M SEC settlement (2020) on PFOF disclosure issues.

### Anti-pattern 6: Stale KYC / suitability

Client's circumstances changed (job loss, retirement, divorce, inheritance) but the file shows their state from 2018. Annual refresh + event-triggered refresh is mandatory. Stale KYC is the most common AML enforcement deficiency.

### Anti-pattern 7: Inadequate sanctions screening

Client is sanctioned (or has UBO that's sanctioned). Trade executes. The firm has just violated OFAC. Pre-trade sanctions screening on every order; ongoing monitoring of book.

### Anti-pattern 8: Trading too aggressively in illiquid names

A name that trades 50,000 shares/day cannot absorb a 200,000 share buy in a single day without 100+ bps of impact. Multi-day execution with patient algos required. Block desks + dark pools may be the only paths.

### Anti-pattern 9: Forgetting tax considerations

Client tax status drives execution (e.g., year-end tax-loss harvesting). FIFO vs HIFO lot selection affects realised gains. Wash-sale rule (30-day) constrains certain repurchases. Brokers who ignore tax can lose clients real money.

### Anti-pattern 10: Trading the day's first / last 5 minutes for size

First 5 minutes (open auction): wide spreads, news catch-up, volatility. Last 5 minutes (close auction): indexers rebalancing, flow imbalance. Both are EXPENSIVE for size; use auctions deliberately, not by accident.

## Verification Checklist

- [ ] Pre-trade checks: KYC current, AML clear, sanctions clear, suitability confirmed
- [ ] Pre-trade risk controls (SEC Rule 15c3-5) passed
- [ ] Order size vs ADV evaluated; block protocol if >5% ADV
- [ ] Order type and algorithm appropriate for size + urgency
- [ ] Venue selection documented; PFOF conflicts disclosed
- [ ] Execution monitored in real-time; deviations flagged
- [ ] TCA report generated post-trade
- [ ] Best execution review quarterly by committee
- [ ] Rule 606 (routing) + Rule 605 (execution quality) reports filed quarterly
- [ ] Settlement T+1 (US equities) achieved
- [ ] Client confirmation issued
- [ ] Monthly statements issued
- [ ] Annual KYC + suitability refresh
- [ ] Form ADV (US advisor) filed annually
- [ ] AML program reviewed annually
- [ ] Best execution committee minutes retained 7+ years
- [ ] No proprietary trading ahead of client orders (Rule 5270 enforcement)
- [ ] Churning quantitative tests passed (turnover, cost-to-equity)

## Cross-References

- `~/.claude/skills/portfolio-theory/SKILL.md` — portfolio decisions that produce orders
- `~/.claude/skills/investment-research/SKILL.md` — research that drives decisions
- `~/.claude/skills/investor-due-diligence/SKILL.md` — diligence on the broker's own venues + counterparties
- `~/.claude/skills/financial-analyst/SKILL.md` — analyst output that feeds PM decisions
- `~/.claude/skills/valuation-models/SKILL.md` — fair-value reference for limit prices
- `~/.claude/skills/bookkeeping-patterns/SKILL.md` — settlement booking + ledger posting
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — client data privacy
- `~/.claude/skills/iso27001-controls/SKILL.md` — broker-dealer security controls
- `~/.claude/rules/common/audit-logging.md` — order + execution + allocation audit trail (FINRA recordkeeping)
- `~/.claude/rules/common/no-overclaim.md` — never promise "best price" — promise "best execution duty"

## Why This Skill Exists

Failures in broker execution destroy client capital and firm reputation in well-documented ways:

- **Knight Capital (August 2012)**: faulty algo deployment cost $460M in 45 minutes; firm acquired in distress
- **Robinhood (2020)**: SEC enforcement on PFOF disclosure inadequacy ($65M settlement) and execution quality
- **Charles Schwab (2022)**: $187M SEC settlement on robo-advisor disclosures and cash-allocation conflicts
- **Wells Fargo (multiple)**: Account-opening fraud + churning enforcement; billions in penalties
- **MF Global (2011)**: Client funds commingled with proprietary; bankruptcy + client losses

The discipline of pre-trade analysis + appropriate order types + TCA + best-execution governance + suitability + KYC + AML + settlement operations is what separates a fiduciary broker from a commission-extracting middleman. Costs that look invisible (a few basis points per trade) compound destructively across a portfolio's lifetime. Regulatory failures are enterprise-ending.

The broker who serves clients well — through transparency, fiduciary mindset, disciplined execution, and rigorous compliance — wins multi-decade relationships. The broker who treats clients as commission-source customers gets sued, fined, and barred. The choice is not subtle.

In a fragmented market with 16+ US equity exchanges, dozens of dark pools, retail wholesalers, and HFT market makers, the broker's ability to navigate is the differentiator. Operational excellence is the moat.

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
- Order routed to PFOF venue without best-ex documentation (Reg NMS Rule 605/606 gap)
- TCA report missing on institutional execution (Best Execution evidence gap)
- Suitability check skipped on a complex product (Reg BI violation risk)
- Margin call workflow not exercised quarterly (Reg T disaster waiting)
- Tape (FINRA OATS / CAT) submission gap detected (audit-trail breach)
- Reg NMS trade-through occurrence not investigated
- Client account agreement out of date with current product mix
- MiFID II reporting deadline miss (T+1 for transactions)
- Wash-sale detection missing on tax-loss-harvesting flows
- Pattern day trader rules misapplied (PDT designation drift)

**Refinement candidates**:
- New venue row when new exchange / dark pool comes online
- New cross-reference when a sister skill (portfolio-theory, investment-research, financial-analyst) adds a broker gate
- New compliance template when new regulation passes (e.g., SEC equity market structure rules)
- Tightening of the best-ex policy when execution-quality regression recurs
