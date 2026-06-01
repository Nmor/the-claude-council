---
name: financial-analyst
description: Principal-level financial analyst workflow — earnings model maintenance, ratio analysis, accounting quality assessment, channel checks, sector-relative valuation, and producing the daily/weekly/quarterly analyst output that drives institutional investment decisions.
---

# Financial Analyst

## Purpose

The financial analyst is the workhorse of the investment process — building and maintaining models, distilling 10-Ks into thesis-relevant insight, conducting channel checks, watching for accounting irregularities, and producing the constant stream of notes, model updates, earnings reactions, and quarterly previews that institutional investors consume. The analyst who scales from junior to principal masters not just spreadsheet mechanics but judgement: which line items matter, which questions to ask management, which industry signals are leading vs lagging, when a thesis is broken vs simply tested. Principal-level analysts also mentor juniors, contribute to firm-wide research culture, and balance the workload of coverage + special projects + new ideas.

This skill governs the analyst's daily work: maintaining the coverage model, processing earnings, attending capital markets days, writing notes, tracking accounting quality, conducting checks, building sector-comparative analyses, and managing the relationship with portfolio managers.

## Standards Cited

- **CFA Institute Body of Knowledge — Financial Reporting and Analysis** (2026 edition) — DuPont, ratio analysis, quality of earnings
- **Penman "Financial Statement Analysis and Security Valuation" 5e** — residual income, accrual analysis
- **Schilit + Perler "Financial Shenanigans" 4e** — accounting red flags catalog
- **Beneish (1999, Financial Analysts Journal)** "Detecting GAAP Violation" — M-Score model
- **Altman (1968) Z-score + Ohlson (1980) O-score** — bankruptcy prediction
- **Damodaran "Investment Valuation" 3e** + sector-by-sector applied methods
- **AICPA SAS 145 + PCAOB AS 2110 + AS 2401** — auditor's risk assessment + fraud
- **FASB ASC 280 / IFRS 8** — segment reporting (analyst's primary disaggregation tool)
- **AICPA Trust Services Criteria** — informs analyst's understanding of management control environment
- **Bloomberg + FactSet + Refinitiv** — standard analyst data terminals

## When to Fire

- Earnings season — every quarterly print triggers note + model update
- Coverage initiation — 30-60 day deep-dive on a new name
- Industry conference or trade show
- Capital markets day, analyst day, investor day
- Strategic event — M&A, spin-off, restructuring, dividend change
- Management change — CEO, CFO, key executive
- Accounting concern — short report, restatement, auditor change
- Macro change — Fed move, sector rotation, commodity price shift
- Quarterly portfolio review — re-rate every coverage name
- Pre-publication of sector primer or thematic note

## Core Patterns

### Pattern 1: Quarterly earnings workflow

```
T-7 days: PRE-PRINT
  - Update model with latest channel checks
  - Refresh segment KPI panel
  - Write pre-print note: what to look for in this quarter
  - Discuss with PM: scenarios, position sizing implications
  - Re-read prior quarter's note and earnings transcript

T-0 (Print Day): EARNINGS RELEASE
  - 30 min pre-open: read 8-K and press release
  - Mark immediate variances vs model
  - Listen to earnings call (live)
  - Take notes: tone, KPI commentary, guidance changes, Q&A
  - Update model with reported numbers + guidance
  - Re-derive thesis: confirmed, tested, broken?
  - Write same-day flash note (1-2 pages)

T+1 to T+3: POST-PRINT DEEP DIVE
  - Read 10-Q (if filed) — footnotes, segment, cash flow
  - Compare reported segment KPIs vs sell-side consensus
  - Update full DCF, multiples, scenarios
  - Re-derive target price
  - Write full post-print note (5-10 pages)
  - Update sector comparative spreadsheet

T+5 to T+14: FOLLOW-UP RESEARCH
  - Channel checks: did pricing/volume commentary match field?
  - Competitor reactions on their earnings calls
  - Industry data triangulation
  - Customer / supplier conversations
  - Update thesis monitoring dashboard
```

### Pattern 2: Earnings flash note template

```markdown
# Acme Corp (ACME) — Q2 FY26 Flash

**Recommendation**: BUY (unchanged) | TP $185 → $192 | Upside 31%

## Quarter In Brief
- Revenue $1.42B, +9% YoY, +1% vs consensus $1.40B
- EBITDA $345M, +14% YoY, +3% vs consensus $335M
- EBITDA margin 24.3%, +110 bps YoY (consensus 23.9%)
- EPS $1.32, +18% YoY, +6% vs consensus $1.25
- FY26 guidance raised: revenue $5.85-5.95B (was $5.75-5.90B), EBITDA margin 24-24.5% (was 23.5-24%)

## Thesis Update
**Thesis confirmed.** Three pillars holding:
1. Pricing power: +6.2% YoY realised pricing in core segment (we had +5.5%)
2. Mix shift: Premium products grew 14%, +250 bps share gain (we had 11%)
3. Margin expansion: GM 38.1% (+90 bps YoY) and OpEx leverage drove EBITDA beat

## What Surprised Us (Positive)
- Premium segment growth accelerating, not decelerating (we expected normalisation)
- Working capital improvement: DSO 41 days (was 44), suggests collections discipline
- Buyback pace accelerated: $85M in Q2 vs ~$60M guided run-rate

## What Surprised Us (Negative)
- Industrial channel weakness: -3% volumes; management cited end-customer destocking
- FX headwind 50 bps more than we modelled

## Model Changes
- FY26 revenue $5.92B → $5.94B (+0.3%)
- FY26 EBITDA $1.42B → $1.45B (+2.1%)
- FY26 EPS $5.45 → $5.62 (+3.1%)
- FY27 EPS $6.10 → $6.30 (+3.3%)
- Target price $185 → $192 (5% increase, driven by higher FY27 EPS and unchanged 22x P/E)

## What We're Watching Next Quarter
- Industrial channel normalisation timing (key swing factor)
- Pricing renewal cohort: 40% of Q3 contracts up for renewal
- Premium segment penetration in EMEA (new GTM launching)

## Position
No change. 4% of portfolio. Trim band $200; thesis-break $115.

---
**Conflicts**: None to disclose. Analyst owns 0 shares.
**Compliance**: Reg FD compliant. No MNPI in this note.
```

### Pattern 3: Sector comparative dashboard

```sql
WITH coverage AS (
    SELECT
        ticker,
        company,
        sector,
        revenue_ttm,
        revenue_fwd_1y,
        revenue_fwd_2y,
        ebitda_ttm,
        ebitda_margin_ttm,
        ebitda_margin_fwd_1y,
        eps_ttm,
        eps_fwd_1y,
        eps_fwd_2y,
        net_debt_to_ebitda,
        roic_ttm,
        fcf_yield_ttm,
        price,
        market_cap,
        enterprise_value
    FROM analyst_coverage
    WHERE sector = 'INDUSTRIAL_DISTRIBUTION'
)
SELECT
    ticker,
    -- Growth
    (revenue_fwd_1y / revenue_ttm - 1) * 100 AS revenue_growth_fwd_1y_pct,
    (eps_fwd_1y / eps_ttm - 1) * 100         AS eps_growth_fwd_1y_pct,
    -- Profitability
    ebitda_margin_ttm,
    ebitda_margin_fwd_1y,
    roic_ttm,
    -- Capital structure
    net_debt_to_ebitda,
    fcf_yield_ttm,
    -- Valuation
    enterprise_value / ebitda_ttm     AS ev_ebitda_ttm,
    enterprise_value / ebitda_fwd_1y  AS ev_ebitda_fwd_1y,
    price / eps_fwd_1y                AS pe_fwd_1y,
    price / eps_fwd_2y                AS pe_fwd_2y,
    -- Quality screen
    CASE
        WHEN roic_ttm > 15 AND net_debt_to_ebitda < 2.5 THEN 'HIGH_QUALITY'
        WHEN roic_ttm > 10 AND net_debt_to_ebitda < 3.5 THEN 'MID_QUALITY'
        ELSE 'LOWER_QUALITY'
    END AS quality_tier
FROM coverage
ORDER BY ev_ebitda_fwd_1y;
```

Rank coverage names within sector by valuation, growth, quality, and risk. The cross-sectional view surfaces which names are mispriced relative to peers.

### Pattern 4: Accounting quality screen — Beneish M-Score

```python
def beneish_m_score(ttm: dict, prior_ttm: dict) -> tuple[float, str]:
    """
    Beneish (1999) — probability of accounting manipulation.
    M-Score > -1.78 suggests likely manipulator.
    """
    DSRI = (ttm["AR"] / ttm["revenue"]) / (prior_ttm["AR"] / prior_ttm["revenue"])
    GMI = (prior_ttm["gross_margin_pct"] / ttm["gross_margin_pct"])
    AQI = (
        (1 - (ttm["current_assets"] + ttm["ppe"]) / ttm["total_assets"])
        / (1 - (prior_ttm["current_assets"] + prior_ttm["ppe"]) / prior_ttm["total_assets"])
    )
    SGI = ttm["revenue"] / prior_ttm["revenue"]
    DEPI = (
        (prior_ttm["depreciation"] / (prior_ttm["depreciation"] + prior_ttm["ppe"]))
        / (ttm["depreciation"] / (ttm["depreciation"] + ttm["ppe"]))
    )
    SGAI = (ttm["sga"] / ttm["revenue"]) / (prior_ttm["sga"] / prior_ttm["revenue"])
    LVGI = (ttm["total_debt"] / ttm["total_assets"]) / (
        prior_ttm["total_debt"] / prior_ttm["total_assets"]
    )
    TATA = (
        (ttm["net_income"] - ttm["cfo"]) / ttm["total_assets"]
    )

    m_score = (
        -4.84
        + 0.92 * DSRI
        + 0.528 * GMI
        + 0.404 * AQI
        + 0.892 * SGI
        + 0.115 * DEPI
        - 0.172 * SGAI
        + 4.679 * TATA
        - 0.327 * LVGI
    )
    classification = "LIKELY_MANIPULATOR" if m_score > -1.78 else "UNLIKELY_MANIPULATOR"
    return m_score, classification
```

M-Score above -1.78 is not proof of manipulation — it's a signal to deepen forensic accounting work. Pair with: DSO trend, accrual quality (Sloan 1996), gross-to-net revenue trend, related-party transaction footnotes, audit firm changes, restatement history.

### Pattern 5: DuPont decomposition

```
ROE = (Net Income / Sales) × (Sales / Assets) × (Assets / Equity)
    = Profit Margin × Asset Turnover × Equity Multiplier

5-stage DuPont:
ROE = (Op Margin) × (Asset Turnover) × (Interest Burden) × (Tax Burden) × (Leverage)
    = (EBIT / Sales) × (Sales / Assets) × (EBT / EBIT) × (NI / EBT) × (Assets / Equity)
```

DuPont reveals what drives ROE — operational efficiency, asset productivity, financial structure, or tax rate. Compare to peers and over time. Declining ROE from declining margins is a quality concern; declining ROE from rising assets (capex investment) may be a growth story.

### Pattern 6: Channel-check discipline

```yaml
channel_check_log:
  date: 2026-Q2
  ticker: ACME
  purpose: pre_print_q2_validation

  checks_planned:
    - 5 distributor customers (volume + pricing)
    - 3 industry consultants (market sizing)
    - 2 former employees (sales pipeline, team retention)
    - 1 key supplier (raw material outlook)
    - 1 competitor's sales rep (competitive dynamics)

  reg_fd_compliance: confirmed_via_compliance
  mnpi_received: none
  insider_information_disclaimer: signed

  findings:
    - distributor_1:
        date: 2026-04-15
        contact: Sales VP, regional distributor (not insider; public-facing role)
        ordering_pace: up_5_to_8_pct_yoy_q2
        pricing_pressure: minimal; supplier-driven price increase 4-5% accepted
        product_mix: premium SKUs up 12%; standard flat
        outlook_q3: stable

    - industry_consultant_1:
        date: 2026-04-18
        contact: Independent industry research firm
        market_growth_2026e: 5%
        share_dynamics: ACME gaining share in premium; losing share in commodity
        end-market_health: strong industrial, weak retail

  thesis_implications:
    - pricing thesis confirmed
    - mix thesis confirmed (premium accelerating)
    - volume thesis at-risk in retail channel (small)
```

### Pattern 7: Forensic accounting watch-list

Quarterly screen for forensic red flags:

| Signal | Threshold | Action |
| --- | --- | --- |
| DSO increase | > 10% YoY | Investigate revenue quality; aging analysis |
| Inventory days increase | > 15% YoY | Slow-moving / obsolete risk; reserve adequacy |
| Capitalised costs as % of revenue | > 5% increase | R&D capitalisation games; cash flow disconnect |
| Cash flow vs net income gap | > 25% | Accrual quality concern (Sloan, 1996) |
| Restructuring charges every quarter | 3+ consecutive | Earnings management via "non-recurring" labels |
| One-time gains in operating income | Any classification game | Audit segment reporting + non-GAAP |
| Audit firm change | Any | High signal — review predecessor's last opinion |
| CFO departure < 2 yr tenure | Any | High signal — pair with auditor change check |
| SEC comment letters (US) | Recent or recurring | Read carefully; thematic issues |
| Restated financials | Any | Re-evaluate the entire history |
| Going-concern qualification | Any | Imminent risk; consider exit |
| Material weakness disclosure | Any | Internal-control failure; thesis-level concern |

## Anti-Patterns

### Anti-pattern 1: Confirmation bias model updates

Quarter prints; analyst's model is too optimistic by 8%. Analyst nudges several inputs +2-3% to bring model in line with print, preserving the bullish thesis. Should have asked: what does this miss tell me about my assumptions? When inputs are wrong, the thesis may be wrong.

### Anti-pattern 2: Following sell-side consensus

The consensus is the average of analysts who often share the same data, the same management calls, the same conferences. Differential edge requires differential view. The analyst who matches consensus has no value-add.

### Anti-pattern 3: Ignoring non-GAAP-to-GAAP bridge

Companies report adjusted EBITDA, adjusted EPS, etc. The bridge from GAAP to adjusted includes restructuring, stock-based comp, M&A costs, "non-recurring" items. Track every adjustment; flag recurring "non-recurring" items.

### Anti-pattern 4: Modelling without segment disaggregation

Aggregate revenue + margin tells you less than segment revenue + margin. If management reports 5 segments, model 5 segments. If management doesn't disaggregate, request it or model proxies from regulatory filings.

### Anti-pattern 5: Underweighting cash flow

Net income can be managed via accruals; cash flow from operations is harder to fake. Always compare NI vs CFO trend; the gap (Sloan 1996) is a leading indicator of trouble.

### Anti-pattern 6: Treating sell-side numbers as fact

Sell-side estimates are starting points, not ground truth. Build your own model from line-item assumptions; reference sell-side at the end for sanity check.

### Anti-pattern 7: Single-source channel checks

One distributor said "demand is strong." Conclusion: demand is strong. One source is anecdote; ten sources are signal. Always triangulate.

### Anti-pattern 8: Missing management's incentive structure

Reading the proxy (DEF 14A) tells you what management is paid to do. Comp tied to short-term EBITDA produces different behaviour than comp tied to long-term TSR. Adjust your read of management's tone and decisions accordingly.

### Anti-pattern 9: Ignoring footnotes

The footnotes contain everything material that didn't fit on the face of the financial statements. Lease commitments, off-balance-sheet items, related-party transactions, going-concern language, contingent liabilities. Read them quarterly.

### Anti-pattern 10: Overreliance on the latest model

A model that updates every day with new prices is noise. The thesis is the model; the model serves the thesis. Update inputs when underlying business reality changes, not when the stock price moves.

## Verification Checklist

- [ ] Model built bottom-up from segments + KPIs (not from aggregate guidance)
- [ ] Cash flow reconciled to balance sheet movements
- [ ] DuPont decomposition computed and tracked over time
- [ ] Accounting quality screen run (M-Score, accrual quality, DSO, DIO trends)
- [ ] Footnotes read in full (current + prior 2 years for new coverage)
- [ ] Segment reporting reviewed for changes
- [ ] Channel checks documented with sources, dates, Reg FD compliance
- [ ] Pre-print note written before earnings
- [ ] Post-print flash note within hours of release
- [ ] Full post-print note within 3 business days
- [ ] Model updated with reported numbers + guidance
- [ ] Sector comparative dashboard maintained
- [ ] Bull / bear cases articulated with specific drivers
- [ ] Conflicts of interest disclosed at note level
- [ ] No MNPI in research
- [ ] Compliance review on every published note
- [ ] Annual back-test of recommendation track record

## Cross-References

- `~/.claude/skills/investment-research/SKILL.md` — overarching research methodology
- `~/.claude/skills/valuation-models/SKILL.md` — valuation toolkit consumed daily
- `~/.claude/skills/portfolio-theory/SKILL.md` — how analyst output feeds PM decisions
- `~/.claude/skills/investor-due-diligence/SKILL.md` — private-side analyst workflow
- `~/.claude/skills/ifrs-gaap-reporting/SKILL.md` — accounting standards underlying the financials
- `~/.claude/skills/bookkeeping-patterns/SKILL.md` — how operating businesses produce their numbers
- `~/.claude/skills/fp-and-a/SKILL.md` — internal corporate-finance lens that mirrors analyst work
- `~/.claude/skills/stock-broker/SKILL.md` — execution + transaction cost analysis
- `~/.claude/rules/common/no-overclaim.md` — recommendations are hypotheses, not certainties

## Why This Skill Exists

The financial analyst is the human in the loop between data and decision. Without rigorous, disciplined analysts:

- Earnings surprises go unexplained
- Accounting irregularities go undetected (Enron, WorldCom, Wirecard, Luckin Coffee — all detected too late by analysts who weren't doing forensic work)
- Sector rotations get missed
- Mispriced securities stay mispriced

The career arc from junior analyst (5 names, 80% model maintenance) to senior analyst (15 names, 60% model maintenance + 40% thesis development) to principal analyst (sector leadership + new ideas + mentoring) is built on disciplined repetition of the workflow above. The principal analyst is not necessarily the smartest — but is the most disciplined. They run the model every quarter, document every channel check, read every footnote, ask every uncomfortable question.

Edge comes from the patience to do the work that others skip.

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
- Earnings model not updated within 48h of company filing (model-staleness)
- Channel check qualitative only, never quantified (vague "saw growth")
- Ratio analysis without peer-group benchmarking (context-free numbers)
- Accounting quality red flag (deferred-revenue spike, days-sales-outstanding lengthening) not investigated
- Footnote disclosure (related-party, contingent liability) glossed over
- Earnings call transcript not annotated for tone / hedging / new disclosure language
- Sector-relative valuation ignored (absolute multiples cited without sector context)
- Buy / sell / hold recommendation without explicit catalyst + invalidation
- Model-vs-consensus delta not surfaced (your model says X; sell-side says Y — why?)
- Position-sizing inconsistent with conviction level

**Refinement candidates**:
- New ratio template when a new sector becomes coverage (e.g., crypto-native, AI-infra)
- New cross-reference when a sister skill (valuation-models, investment-research, portfolio-theory) adds an analyst gate
- Tightening of the catalyst-discipline rule when soft-recommendation regression recurs
- New channel-check template when a recurring qualitative pattern emerges
