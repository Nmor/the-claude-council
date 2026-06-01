---
name: portfolio-theory
description: Principal-level portfolio construction — Markowitz mean-variance optimisation, CAPM, factor models, risk budgeting, rebalancing discipline, drawdown and tail-risk management. Diversification is the only free lunch; respect transaction costs and behavioural traps.
---

# Portfolio Theory

## Purpose

Portfolio theory translates the universe of available investments into a coherent allocation that meets an investor's objectives (return target, risk tolerance, liquidity needs, time horizon, tax constraints, regulatory framework). The work spans strategic asset allocation (10-year policy weights), tactical asset allocation (12-month tilts), security selection within each asset class, rebalancing discipline, and risk-budgeting/factor exposure monitoring. Done well, portfolio construction captures the diversification premium — Markowitz's "only free lunch in finance" — while controlling for transaction costs, tax drag, and behavioural temptation. Done badly, it concentrates idiosyncratic risk, paying active fees for closet-index returns, and rebalances reactively after losses are realised.

This skill governs principal-level portfolio work: building defensible policy portfolios with documented assumptions, monitoring factor and risk exposures over time, executing rebalancing trades with cost awareness, attributing performance honestly, and protecting against the tail-risk and drawdown events that destroy compounding.

## Standards Cited

- **Markowitz (1952), Journal of Finance** "Portfolio Selection" — mean-variance optimisation, efficient frontier
- **Sharpe (1964), Journal of Finance** "Capital Asset Prices" — CAPM, market portfolio, security market line
- **Fama-French (1993, 2015)** three-factor + five-factor models — size, value, profitability, investment premia
- **Carhart (1997)** four-factor model adding momentum
- **CFA Institute Body of Knowledge — Portfolio Management** (2026 edition) — IPS, strategic vs tactical, performance attribution
- **CFA Institute Global Investment Performance Standards (GIPS) 2020** — composite construction, presentation
- **Ang (2014) "Asset Management: A Systematic Approach to Factor Investing"** — factor risk premia, smart beta
- **Antti Ilmanen "Expected Returns" (2011, Wiley)** + **"Investing Amid Low Expected Returns" (2022)** — empirical return decomposition
- **DALBAR Quantitative Analysis of Investor Behavior (QAIB)** annual report — behavioural gap between fund returns and investor returns
- **Vanguard "Principles for Investing Success"** + **Bogle "Common Sense on Mutual Funds"** — costs matter, simplicity wins
- **Basel III risk-weighted capital framework** — for bank portfolios; IFRS 9 SPPI test for held-to-collect

## When to Fire

- An Investment Policy Statement (IPS) is being drafted or refreshed for a client / fund / treasury portfolio
- Strategic asset allocation is being reviewed (annual board meeting, change in liabilities, change in horizon)
- Tactical positioning decisions — overweight/underweight an asset class for the next 6-18 months
- Portfolio construction within an asset class — equity sleeves, fixed income sleeves, alternatives sleeves
- Rebalancing triggers — calendar (quarterly/annual) or tolerance band (±5%) breached
- Performance attribution requested — explain returns vs benchmark
- Risk budgeting / factor decomposition for a multi-strategy fund
- Drawdown event triggers a review (e.g., portfolio down >15%)
- A new asset class is being added (cryptocurrency, private credit, infrastructure)
- ESG/sustainability constraints are being introduced or modified

## Core Patterns

### Pattern 1: Investment Policy Statement (IPS) — the contract

```yaml
investment_policy_statement:
  client: "Acme Family Office"
  effective_date: 2026-01-01
  review_cadence: annual
  next_review: 2027-01-01

  objectives:
    return_target_nominal: 7.5%      # long-term annualised
    return_target_real: 5.0%         # after inflation
    liquidity_floor: 5%              # cash + equivalents
    tax_status: taxable              # affects after-tax planning

  constraints:
    time_horizon: 25_years
    risk_tolerance:
      max_drawdown_tolerance: 25%
      var_99_monthly_pct: 6%
    liquidity_needs:
      annual_spend: 4.5%             # of corpus
      unexpected_buffer: 2_years_spend
    legal_regulatory:
      regulator: SEC_registered
      tax_jurisdiction: US_federal_plus_NY
    ethical_constraints:
      excludes: [tobacco, controversial_weapons, thermal_coal]
      esg_minimum_score: 6/10
    other:
      no_single_security_above_pct: 5
      no_single_manager_above_pct: 20
      no_unlisted_above_pct: 25

  strategic_allocation:
    global_equity: 55%
    developed_market_equity: 35%
    emerging_market_equity: 10%
    private_equity: 10%
    global_fixed_income: 25%
    investment_grade: 15%
    high_yield: 5%
    inflation_linked: 5%
    real_assets: 12%
    real_estate: 7%
    infrastructure: 5%
    cash: 8%

  tolerance_bands_pct:
    global_equity: 5
    global_fixed_income: 3
    real_assets: 2
    cash: 3

  rebalancing_policy: tolerance_band_with_quarterly_review
  performance_benchmarks:
    composite: 55/25/12/8_with_custom_indexes_per_sleeve
    public_equity_sleeve: MSCI_ACWI_IMI
    fixed_income_sleeve: Bloomberg_Global_Agg_USD_Hedged
    real_assets_sleeve: 50_FTSE_NAREIT_50_Custom_Infra
```

The IPS is the contract between investor and manager. It anchors every subsequent decision — when the market falls 25% and instinct says "sell everything," the IPS says "rebalance back to target." Discipline beats prediction.

### Pattern 2: Mean-variance optimisation — disciplined, not blind

```python
import numpy as np
from scipy.optimize import minimize

def markowitz_optimise(
    expected_returns: np.ndarray,
    covariance_matrix: np.ndarray,
    target_return: float,
    bounds: list[tuple[float, float]],
    sum_to_one: bool = True,
) -> np.ndarray:
    n = len(expected_returns)
    initial_weights = np.ones(n) / n

    def portfolio_variance(w: np.ndarray) -> float:
        return w @ covariance_matrix @ w

    constraints = []
    if sum_to_one:
        constraints.append({"type": "eq", "fun": lambda w: np.sum(w) - 1})
    constraints.append({
        "type": "eq",
        "fun": lambda w: w @ expected_returns - target_return,
    })

    result = minimize(
        portfolio_variance,
        initial_weights,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"ftol": 1e-10, "disp": False},
    )
    if not result.success:
        raise ValueError(f"optimisation failed: {result.message}")
    return result.x
```

Mean-variance gives the EFFICIENT FRONTIER (locus of minimum-variance portfolios for each return level). The tangency portfolio (highest Sharpe ratio) is the theoretical optimum.

**Critical caveat**: pure mean-variance is unstable. Small changes in expected-return inputs produce wild changes in weights ("error maximisation," per Michaud 1989). Mitigations:

- **Black-Litterman (1992)** — combine market-implied equilibrium with investor views
- **Robust optimisation** — input expected returns as ranges, not point estimates
- **Resampled efficient frontier** — Monte Carlo over input distributions; average the weights
- **Constraints** — no-short, sector caps, max weight per security; constraints regularise the optimiser
- **Risk parity** — equal RISK contribution from each asset class (not equal weights, not mean-variance)

### Pattern 3: Risk decomposition (factor model)

```python
def factor_decomposition(
    returns: pd.DataFrame,           # T × N (portfolio + factors)
    factor_columns: list[str],
    portfolio_column: str,
) -> dict:
    import statsmodels.api as sm

    y = returns[portfolio_column]
    X = returns[factor_columns]
    X_with_const = sm.add_constant(X)
    model = sm.OLS(y, X_with_const).fit()

    return {
        "alpha_annualised": model.params["const"] * 252,
        "factor_betas": model.params.drop("const").to_dict(),
        "factor_t_stats": model.tvalues.drop("const").to_dict(),
        "r_squared": model.rsquared,
        "residual_vol_annualised": np.sqrt(model.mse_resid * 252),
        "tracking_error_to_benchmark": np.std(model.resid) * np.sqrt(252),
    }
```

Decompose portfolio returns into factor exposures (market, size, value, momentum, quality, low-vol) + alpha. The alpha + R² tell you whether the manager is generating idiosyncratic skill or simply tilting toward known factor premia. Factor tilts can be replicated cheaply via smart-beta ETFs; alpha cannot.

### Pattern 4: Rebalancing — tolerance band beats calendar

Strict calendar (rebalance every quarter regardless) is simple but inefficient — generates trading costs even when allocations are near target. Strict tolerance-band-only never rebalances in stable markets but rebalances aggressively in volatile ones. The hybrid:

```
1. Check allocations at the end of every quarter
2. If any asset class is outside its tolerance band (e.g., ±5% absolute or ±25% relative), rebalance THAT asset class back to target
3. If all classes are inside bands, skip rebalancing (no trading costs)
4. Use cash inflows and outflows opportunistically — direct contributions to underweight assets, withdrawals from overweight assets
5. Tax-loss harvest at year-end before rebalancing decisions
```

Trade execution: minimise market impact via VWAP/TWAP for large orders; use ETFs with high primary-market liquidity over thinly-traded mutual funds; for OTC fixed income, use RFQ workflows + multiple dealer quotes.

### Pattern 5: Tail risk management

Mean-variance assumes returns are normally distributed. Reality: equity returns have fat tails (kurtosis > 3) and negative skew. Mean-variance UNDERSTATES tail risk by ~30-50% during crises.

| Approach | What | When |
| --- | --- | --- |
| **Diversification** | Multiple asset classes with low correlation in normal markets | Always — baseline |
| **Tail hedge** (put options, vol products, trend-following CTAs) | Pay premium during normal markets, payoff during crises | When LIABILITY structure requires no drawdown beyond X |
| **Volatility targeting** | Scale exposure down when realised vol rises, up when falls | Systematic strategies |
| **Stop-loss rules** | Reduce risk when portfolio crosses drawdown threshold | Behavioural discipline; mechanically enforced |
| **Static cash buffer** | Hold cash to spend during drawdowns (avoid selling at lows) | Retirees, endowments with hard spending floors |

Correlations among risky assets RISE during crises — the very moment diversification is needed most, it weakens. Stress-test the portfolio against historical crises (1987, 2000-2002, 2008-2009, 2020-Q1, 2022 bond/equity selloff) to see how it WOULD have behaved.

### Pattern 6: Performance attribution

```sql
WITH benchmark_weights AS (
    SELECT asset_class, weight AS bench_weight FROM benchmark_weights_q
),
portfolio_weights AS (
    SELECT asset_class, weight AS port_weight, return_pct FROM portfolio_returns_q
),
benchmark_returns AS (
    SELECT asset_class, return_pct AS bench_return FROM benchmark_returns_q
)
SELECT
    pw.asset_class,
    pw.port_weight,
    bw.bench_weight,
    pw.port_weight - bw.bench_weight                  AS active_weight,
    pw.return_pct                                     AS port_return,
    br.bench_return,
    pw.return_pct - br.bench_return                   AS active_return_within,
    (pw.port_weight - bw.bench_weight) * br.bench_return AS allocation_effect,
    bw.bench_weight * (pw.return_pct - br.bench_return) AS selection_effect,
    (pw.port_weight - bw.bench_weight) * (pw.return_pct - br.bench_return) AS interaction
FROM portfolio_weights pw
JOIN benchmark_weights bw USING (asset_class)
JOIN benchmark_returns br USING (asset_class);
```

Brinson-Hood-Beebower attribution decomposes excess return into:
- **Allocation effect**: did we overweight asset classes that outperformed?
- **Selection effect**: did our security picks within each class beat the asset class benchmark?
- **Interaction**: cross-term (small in well-attributed portfolios)

Plus currency effect, factor exposure attribution, alpha vs beta decomposition. Honest attribution prevents claiming credit for beta exposure that any index fund could have delivered.

## Anti-Patterns

### Anti-pattern 1: Single-stock concentration

50% of net worth in employer stock — common, catastrophic. Concentration risk dwarfs diversifiable risk; one earnings miss can erase a decade of returns. Soft cap: no single security > 5% of portfolio; no single employer (job + equity) > 15% of household net worth.

### Anti-pattern 2: Performance chasing

"Top-performing fund last 5 years" — empirical evidence (Carhart 1997, Morningstar persistence studies) shows past performance has weak-to-zero predictive power except in costs (low-cost funds outperform high-cost funds on average). Investing in last year's winner usually means buying high and underperforming as the strategy's tailwind reverses.

### Anti-pattern 3: Rebalancing reactively after losses

The instinct: "stocks down 30%, let me sell more and buy bonds." This crystallises the loss and forfeits the recovery. The discipline: rebalance INTO the underweight (the stocks that fell), funding from the now-overweight (bonds). It feels wrong; that's why it works.

### Anti-pattern 4: Ignoring cost compounding

A 1.5% expense ratio over 30 years compounds to ~33% less terminal wealth vs a 0.1% fee. Most active managers do not deliver enough alpha to cover their fees (SPIVA reports consistently show 60-90% of active funds underperform their benchmark over 10-year windows). Costs include: expense ratios, trading costs, bid-ask spread, market impact, tax drag from turnover, advisor fees.

### Anti-pattern 5: Home-country bias

US investors typically hold 70-80% US equity despite US being ~60% of global market cap. Japanese investors hold ~80% Japanese equity despite Japan being ~7% global. Home bias forfeits diversification and concentrates exposure to one country's policy and growth risks.

### Anti-pattern 6: Misusing leverage

Leverage amplifies returns AND drawdowns. The investor who can stomach 30% drawdowns unleveraged often blows up at 60% drawdowns leveraged 2x — the same proportional loss but a different psychological experience. Use leverage only when (a) the investor has explicit risk tolerance, (b) the cost of leverage is below the risk premium, (c) margin call dynamics are modeled.

### Anti-pattern 7: Treating volatility as risk

Volatility ≠ risk. Risk is permanent loss of capital. Two assets can have the same volatility but very different risk — a high-quality bond fund vs leveraged single-stock ETF. Drawdown, maximum loss, recovery time, fundamentals all matter.

### Anti-pattern 8: Ignoring liquidity terms

A private equity allocation requires 10+ year capital lock-up. A liquidity-constrained investor who allocates 30% to PE may face a margin call or capital call they can't fund. Liquidity tier the portfolio: T+1 (cash, ETFs), T+30 (mutual funds), illiquid (PE, real estate).

### Anti-pattern 9: Currency mismatch

A US investor holding emerging-market debt unhedged has TWO bets: the credit and the FX. If the FX bet isn't intentional, hedge it. Conversely, hedging EVERY position costs basis points and forfeits diversification benefits — hedge selectively per IPS.

### Anti-pattern 10: Behavioural trap — selling at the bottom

DALBAR's annual study shows the average equity-fund investor earns ~3-4% below the funds they own — entirely from buying high (after rallies) and selling low (after crashes). The fix is mechanical: written IPS, pre-committed rebalancing, no discretionary selling during drawdowns.

## Verification Checklist

- [ ] IPS in place, signed, and reviewed within last 12 months
- [ ] Strategic allocation justified with documented expected returns + covariance
- [ ] Risk tolerance translated to MAX DRAWDOWN, not just volatility
- [ ] Tolerance bands defined for every asset class
- [ ] Rebalancing trigger documented (calendar + band hybrid)
- [ ] Factor decomposition computed quarterly; alpha vs beta separated
- [ ] Performance attribution by Brinson-Hood-Beebower quarterly
- [ ] Stress tests against 2008, 2020-Q1, 2022 scenarios
- [ ] Concentration limits enforced (no single security > 5%, no single manager > 20%)
- [ ] Cost transparency (expense ratios, trading costs, advisor fees, tax drag) tracked
- [ ] Liquidity tier of portfolio matches investor's cash needs
- [ ] Currency exposures intentional or hedged per IPS
- [ ] ESG / ethical constraints enforced at security-screen level
- [ ] Behavioural guardrails in place (no discretionary selling during drawdowns)

## Cross-References

- `~/.claude/skills/valuation-models/SKILL.md` — security-level fair-value inputs for portfolio construction
- `~/.claude/skills/investment-research/SKILL.md` — research process that produces position-level conviction
- `~/.claude/skills/investor-due-diligence/SKILL.md` — manager selection for delegated sleeves
- `~/.claude/skills/financial-analyst/SKILL.md` — analyst workflow underlying single-name picks
- `~/.claude/skills/stock-broker/SKILL.md` — execution venue + cost analysis
- `~/.claude/skills/fp-and-a/SKILL.md` — for institutional treasury portfolios with operational cash needs
- `~/.claude/rules/common/no-overclaim.md` — never claim alpha that's actually beta

## Why This Skill Exists

Bad portfolios destroy wealth in three predictable ways:

1. **Concentration** — single-stock or single-sector concentration produces tail outcomes. Employees of failed dot-coms (2000), Enron (2001), Lehman Brothers (2008), FTX (2022) saw decades of savings erased because portfolios held employer equity instead of diversifying.
2. **Behavioural gap** — DALBAR research shows individual investors earn ~3-4% LESS than the funds they hold, entirely from poor entry/exit timing. Over 30 years, that gap compounds to ~150% less terminal wealth.
3. **Cost drag** — 1% fee differential compounds to ~22% less terminal wealth over 30 years. High-cost active funds typically do not deliver enough alpha to overcome the cost.

The discipline of IPS + strategic allocation + tolerance-band rebalancing + cost minimisation + risk decomposition is what separates institutional portfolio management from speculation. None of it is glamorous. All of it works.

Markowitz called diversification "the only free lunch in finance" — meaning you can REDUCE risk without reducing expected return. The lunch is still on offer in 2026; most investors leave it on the table.

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
- Strategic allocation drifts past tolerance band without rebalance (band-drift)
- Single-name concentration > IPS limit (concentration risk)
- Factor exposure (value / quality / momentum) unintended — uncompensated risk
- Correlation matrix calibrated on bull-market data only (regime mismatch)
- VaR / CVaR computed but tail-risk hedge not in place
- Cost basis tracking incomplete (tax-loss harvest opportunity missed)
- Rebalancing cost not modelled (turnover-driven drag)
- Currency exposure not measured for multi-jurisdiction portfolio
- Benchmark drift (style drift) unmonitored vs IPS
- Liquidity tier not tagged (private + illiquid positions assumed liquid in stress)

**Refinement candidates**:
- New asset-class row when a new investable category emerges (e.g., tokenised RWAs)
- New cross-reference when a sister skill (investment-research, valuation-models, financial-analyst) adds a portfolio gate
- New rebalance-rule when transaction-cost regime shifts
- Tightening of the IPS adherence policy when drift recurs
