---
name: investor-due-diligence
description: Principal-level due-diligence methodology for evaluating fund managers, private company investments, and acquisition targets — operational, financial, legal, commercial, technology, ESG, and reference diligence with a structured red-flag scoring system.
---

# Investor Due Diligence

## Purpose

Due diligence is the structured verification step before committing capital — to a fund manager, a private company, an M&A target, a real estate purchase, or a strategic partnership. It tests the marketing narrative against independent evidence. Done well, diligence catches the deal-killer before close: the undisclosed customer concentration, the unsigned contract, the litigation timeline, the technology debt, the manager's prior fund's mark-to-myth NAV. Done badly, it produces a thick binder that nobody reads and an investment that blows up six months later from a risk that diligence would have surfaced with a single phone call.

Principal-level diligence is multi-disciplinary: operational, financial, commercial, legal, technical, regulatory, ESG, reference, and management diligence each producing findings; cross-functional integration of findings into a deal memo with explicit go/no-go criteria; clear documentation of unresolved risks at close (and the contractual mechanisms — reps, warranties, escrows, indemnifications — that handle them).

This skill governs the diligence lifecycle: scoping the work, organising the diligence workstream, executing each functional area with the right experts, integrating findings, identifying red flags, negotiating risk-mitigating deal terms, and producing the investment committee memo.

## Standards Cited

- **AICPA SOP 14-1** + **PCAOB AS 2110** — risk assessment standards informing financial diligence
- **CFA Institute Body of Knowledge — Alternative Investments + Private Markets** (2026 edition) — private fund + private company diligence framework
- **CFA Institute Asset Manager Code of Professional Conduct** — manager diligence standards
- **ILPA (Institutional Limited Partners Association) Due Diligence Questionnaire 2.0** — canonical LP-side DDQ for PE/VC manager selection
- **AIMA (Alternative Investment Management Association) DDQ** — hedge fund manager diligence
- **ABA Mergers and Acquisitions Committee — Model Stock Purchase Agreement** — reps and warranties framework
- **Bain "Mergers & Acquisitions Report"** + **McKinsey "M&A practice" research** — commercial diligence frameworks
- **FCPA / UK Bribery Act / OECD Anti-Bribery Convention** — anti-corruption diligence
- **OFAC / EU / UN sanctions lists** — sanctions screening
- **SOC 2 Type II reports + ISO 27001 certifications** — IT/security diligence
- **CFIUS / national-security review frameworks** (US) — cross-border deal review

## When to Fire

- Evaluating a new fund manager for LP allocation (PE, VC, hedge fund, private credit, real estate)
- Considering a direct investment in a private company (Series A through pre-IPO)
- M&A target acquisition (buyer-side diligence) or being acquired (seller-side preparation)
- Joint venture or strategic partnership evaluation
- Real estate acquisition (institutional asset)
- Strategic vendor onboarding (third-party risk management)
- Re-up decision on an existing manager (Fund III after Fund I + II)
- Secondary purchase of an LP interest in an existing fund

## Core Patterns

### Pattern 1: Diligence scoping — match depth to investment size + risk

```yaml
diligence_scope:
  investment_size: $25M
  target_type: growth_equity_minority
  risk_tier: medium_high  # private, illiquid, single-asset

  workstreams:
    commercial:
      depth: deep
      lead: deal_team
      external: third_party_consultant_for_market_sizing

    financial:
      depth: deep
      lead: deal_team_with_outside_accountants
      qoe_required: yes  # Quality of Earnings report
      audit_quality_review: yes

    legal:
      depth: deep
      lead: external_counsel
      scope: corp_records, contracts_top_20, IP, employment, litigation, regulatory

    tax:
      depth: standard
      lead: external_tax_specialist
      scope: structure, transfer_pricing, R&D_credits, IRC_409A

    technology:
      depth: deep  # SaaS target
      lead: technical_advisor
      scope: code_quality, infrastructure, security, scalability, technical_debt

    cyber:
      depth: standard
      lead: external_cyber_advisor
      scope: SOC2, pen_test_results, breach_history, vendor_risk

    operations:
      depth: standard
      lead: deal_team
      scope: process_maturity, key_person_risk, supply_chain

    HR_compensation:
      depth: standard
      lead: deal_team
      scope: org_chart, key_employee_agreements, equity_pool, compensation_benchmarks

    ESG:
      depth: standard
      lead: deal_team
      scope: governance, environmental_compliance, social_practices

    references:
      depth: deep
      lead: deal_team
      scope: 8_customers, 3_former_employees, 2_competitors, 1_supplier
```

Scope must match the cheque size. A $250K seed investment doesn't justify a $200K diligence bill; an $80M growth equity investment must justify $400-800K of advisor fees. The investment committee approves scope, not just the deal.

### Pattern 2: Quality of Earnings (QoE) — the central financial diligence

A QoE report independently re-derives the target's normalised EBITDA. The diligence accountant:

1. Confirms historical revenue with bank deposits, invoices, AR aging
2. Tests revenue recognition policy against ASC 606 / IFRS 15
3. Identifies one-time items (non-recurring revenue, restructuring charges, owner perks, related-party transactions)
4. Normalises EBITDA: remove non-recurring, add back add-backs management proposes
5. Re-derives working capital normalised level
6. Tests inventory completeness (FIFO/LIFO consistency, slow-moving reserves)
7. Audits gross-to-net revenue (rebates, returns, deductions)
8. Reviews customer concentration (top-10 customers, contract terms, renewal risk)
9. Tests deferred revenue (subscription accuracy, refund liability)
10. Reviews capex sustainability (maintenance vs growth)

Output:

```text
QoE REPORT — SUMMARY
                    Reported        Adjusted          Notes
Revenue             $48.2M          $46.8M            Removed $1.4M of related-party sales
EBITDA              $9.5M           $8.1M             Add-backs accepted: $0.3M; rejected: $1.7M (owner expenses, recurring nature)
EBITDA Margin       19.7%           17.3%
Working Cap         $2.1M           $3.4M             Normalised level higher than current

Adjustments Rejected: $1.7M of owner discretionary expenses (travel, family salaries)
Quality Score: B+  (one customer 22% concentration; otherwise clean)
```

A "B+" QoE is acceptable; "C" usually requires price reduction or escrow; "D" is grounds for walking away.

### Pattern 3: Commercial diligence — independent market view

Commercial diligence answers: is the market real, is it growing, can the company win?

| Workstream | Method | Output |
| --- | --- | --- |
| **Market sizing** | Triangulate bottoms-up (customer × spend × penetration) and tops-down (industry reports, government data) | TAM / SAM / SOM with 3 sources |
| **Competitive landscape** | Map every competitor by revenue, growth, positioning, pricing | Competitive matrix |
| **Customer voice** | 8-12 interviews (current customers, lost prospects, former customers) | Voice-of-customer report; NPS proxy; renewal probability |
| **Pricing power** | Win-loss analysis, price-elasticity from past renewals | Pricing model with sensitivity |
| **Sales productivity** | Quota attainment, ramp time, churn-to-quota ratio | Sales efficiency benchmark |
| **Channel partner health** | Partner concentration, partner economics | Channel risk assessment |
| **Substitute threats** | Adjacent technologies, vertical integration by customers | Substitute risk matrix |

Independent customer references are the highest-signal diligence output. Management's reference list is biased upward; lost-prospect interviews uncover the weaknesses management hides.

### Pattern 4: Manager diligence (LP allocating to a fund)

Per ILPA DDQ structure:

```yaml
manager_diligence:
  organisation:
    - history, ownership structure, key personnel bios
    - team retention (5-year history of departures with reasons)
    - succession plan, key person provisions
    - AUM growth + capacity discipline

  strategy:
    - investment focus, geography, stage, sector, cheque size range
    - sourcing channels + win rate
    - value creation thesis (operational vs financial engineering)
    - portfolio construction (number of investments, concentration, hold period)

  process:
    - sourcing → screening → diligence → IC → execution
    - IC composition, voting structure
    - portfolio monitoring + value-add resources
    - exit process

  track_record:
    - fund-by-fund: gross / net IRR, gross / net MOIC, DPI, TVPI
    - vs benchmark (Cambridge, Preqin, MSCI Private Capital)
    - vs vintage peers
    - mark-to-market vs realised (realisation discipline)
    - loss ratio, write-down history
    - top 5 deals: what worked, what didn't
    - PME comparison

  governance:
    - fund terms (mgmt fee, carry, hurdle, catchup, GP commit)
    - alignment of interest (GP commitment vs personal wealth)
    - co-invest policy
    - LPAC composition + powers
    - ESG / responsible investing policy
    - cybersecurity + business continuity
    - regulatory + compliance program (ADV, AIFMD, etc.)

  references:
    - 5+ existing LPs (multiple vintages, multiple sizes)
    - 3+ portfolio company CEOs
    - 2+ co-investors (other GPs)
    - 2+ former employees
    - 2+ service providers (auditor, fund admin)
```

The "PME comparison" (Public Market Equivalent) — Kaplan-Schoar 2005 methodology — adjusts manager IRR for the public-market return the LP could have earned with the same cash flow timing. Many "top-quartile" managers fail PME tests once adjusted for beta exposure.

### Pattern 5: Technology + cybersecurity diligence (for tech targets)

```yaml
technology_diligence:
  code_review:
    - languages, frameworks, age of major systems
    - test coverage (CI report)
    - documentation quality
    - technical debt (architectural decisions document, refactor backlog)
    - dependency CVE scan
    - code-ownership concentration (bus factor)

  infrastructure:
    - cloud provider, regions, multi-region capability
    - cost per customer, cost per transaction
    - scalability (load test results, peak vs steady-state)
    - reliability (SLO, error budget, incident history)

  security:
    - SOC 2 Type II report (12+ months)
    - ISO 27001 certification (if international)
    - penetration test reports (last 2)
    - vulnerability management (SLA + recent remediation)
    - access controls (RBAC, MFA, JIT)
    - incident response history (breaches disclosed)
    - vendor risk management
    - GDPR / CCPA / HIPAA compliance posture

  product:
    - feature set vs roadmap
    - velocity (releases per month, lead time)
    - bug backlog quality
    - customer satisfaction (CSAT, support volume)

  team:
    - engineering org chart, key role coverage
    - voluntary attrition by role
    - hiring pipeline + offer acceptance rate
    - compensation benchmarks
```

A SaaS target's technology diligence drives both the deal price (technical debt = required investment = lower EBITDA) and the integration plan post-close.

### Pattern 6: Red-flag scoring + go/no-go decision

```python
class RedFlag:
    severity: Literal["BLOCKER", "MATERIAL", "MINOR", "INFORMATIONAL"]
    workstream: str
    description: str
    mitigation: str | None
    impact_on_valuation: float | None
    impact_on_terms: str | None

def evaluate_deal(red_flags: list[RedFlag]) -> dict:
    blockers = [r for r in red_flags if r.severity == "BLOCKER"]
    material = [r for r in red_flags if r.severity == "MATERIAL"]

    if blockers:
        return {"decision": "NO_GO", "reason": [b.description for b in blockers]}

    if len(material) > 5:
        return {"decision": "RE_NEGOTIATE", "reason": f"{len(material)} material findings"}

    return {
        "decision": "GO",
        "mitigations_required": [r.mitigation for r in material if r.mitigation],
        "price_adjustment": sum(r.impact_on_valuation or 0 for r in red_flags),
        "term_adjustments": [r.impact_on_terms for r in red_flags if r.impact_on_terms],
    }
```

Examples of severity classification:

- **BLOCKER**: fraud detected; undisclosed material litigation; sanctions hit on UBO; CFIUS-rejectable; auditor going-concern qualification
- **MATERIAL**: customer concentration > 25% with no contractual protections; tech debt requiring 20%+ of revenue in next 2 years; pending regulatory action with material exposure; key person not contractually committed
- **MINOR**: documentation gaps (resolvable post-close); minor compliance findings; non-critical SOC2 exceptions
- **INFORMATIONAL**: nice-to-knows; cultural insights; integration considerations

### Pattern 7: Investment committee memo

The IC memo is 15-25 pages plus appendices. Structure:

1. Executive summary (1 page — decision recommendation, key terms, valuation)
2. Investment thesis (2-3 pages)
3. Market overview (commercial diligence summary, 2-3 pages)
4. Business overview (target description, 2-3 pages)
5. Financial overview (QoE summary, model output, 3-4 pages)
6. Valuation (2-3 pages — triangulation per `~/.claude/skills/valuation-models/SKILL.md`)
7. Key risks (2-3 pages — red flags by severity)
8. Diligence summary by workstream (2-3 pages)
9. Recommended terms (1-2 pages — reps, warranties, indemnities, escrow, governance)
10. Integration / portfolio fit (1-2 pages)
11. Appendices: full QoE, commercial diligence, legal summary, tech report, reference call notes

## Anti-Patterns

### Anti-pattern 1: Confirmation diligence

"We already decided to do the deal; the diligence is just paperwork." Diligence MUST be empowered to kill the deal. The IC chair pre-commits: any BLOCKER finding triggers automatic re-vote; any 5+ MATERIAL findings trigger re-pricing.

### Anti-pattern 2: Management-provided references only

Management hands a curated list of customer references. ALL will say nice things. Independent references — from lost prospects, churned customers, former employees, competitors, and randomly-selected current customers — produce the differential signal.

### Anti-pattern 3: Skipping QoE on small deals

"It's only $5M; we'll skip QoE." A $5M deal that turns into a $5M loss is the same dollar impact as catching it pre-close on a $50M deal with a 10% adjustment. Right-size, don't skip.

### Anti-pattern 4: Underweighting cyber diligence

A target with poor cybersecurity is a liability. Post-close breach attribution can flow back to the acquirer; M&A regulatory framework now treats cyber as material. Cyber diligence is not optional for any tech-touching deal.

### Anti-pattern 5: Failing to verify "we are profitable"

Management says "we just turned EBITDA positive last quarter." QoE reveals one-time deferred revenue recognition pulled forward. Always re-derive quarterly trends from raw data, not management's reported numbers.

### Anti-pattern 6: Ignoring base rates on manager track record

Fund III performance after Fund I + II generates an attractive IRR. Empirical research (Kaplan-Schoar, Harris-Jenkinson-Kaplan): persistence of top-quartile performance from Fund N to Fund N+1 is ~30-40% in PE, lower in hedge funds. Pay for proven persistence skeptically.

### Anti-pattern 7: Heroic Synergy Assumptions in M&A

"We'll save $50M from procurement synergies." Empirical: 60-70% of announced synergies are never realised. Risk-weight every synergy line item; assume diss-synergies (revenue lost to customer churn during integration) at 5-15% of target revenue.

### Anti-pattern 8: Missing key-person commitments

The thesis depends on the founder. The founder isn't contractually committed beyond 24 months. After 24 months, the founder retires and the company underperforms. Insist on multi-year retention agreements with claw-back, escrow, or earn-out structures.

### Anti-pattern 9: Trusting unverified financial projections

Management's projection: 30% CAGR for 5 years. Triangulate: does the bottoms-up customer model support 30%? Does the sales capacity ramp support it? Does the channel partner program? Does the TAM allow it without market-share inflection? Numbers fall apart with any pressure.

### Anti-pattern 10: Sanctions + UBO screening skipped

PEP (politically exposed person), OFAC sanctions, UN sanctions, EU sanctions screening on all UBOs (ultimate beneficial owners) is mandatory. Failure to screen creates legal exposure for the investor regardless of intent. Use Refinitiv, Dow Jones, or similar databases.

## Verification Checklist

- [ ] Diligence scope approved by IC pre-execution
- [ ] All workstreams complete with findings documented
- [ ] QoE report obtained (financial) with normalised EBITDA
- [ ] Independent customer references (≥8) conducted
- [ ] Former employee references (≥3) conducted
- [ ] Lost-prospect references (≥3) conducted
- [ ] Background checks on key principals complete
- [ ] Sanctions + PEP + UBO screening complete
- [ ] FCPA / Bribery Act risk assessment complete
- [ ] Legal diligence: corp records, contracts, IP, employment, litigation, regulatory
- [ ] Tax structure reviewed; 409A or equivalent verified
- [ ] Technology diligence (if tech target): code review, infra, security, team
- [ ] Cyber diligence: SOC 2, pentest, vulnerability mgmt, incident history
- [ ] ESG screening complete
- [ ] Insurance coverage verified (E&O, D&O, cyber)
- [ ] Red-flag inventory by severity (BLOCKER / MATERIAL / MINOR)
- [ ] Mitigations identified for every MATERIAL finding
- [ ] Reps, warranties, indemnities drafted to handle residual risk
- [ ] Escrow / holdback sized appropriately
- [ ] IC memo distributed 72+ hours before vote
- [ ] Independent IC vote (no veto by deal team)
- [ ] Post-close integration / 100-day plan documented

## Cross-References

- `~/.claude/skills/valuation-models/SKILL.md` — valuation outputs that feed deal pricing
- `~/.claude/skills/investment-research/SKILL.md` — public-market research methodology, partially reused for private
- `~/.claude/skills/portfolio-theory/SKILL.md` — portfolio context for sizing the commitment
- `~/.claude/skills/financial-analyst/SKILL.md` — financial analysis underlying the QoE
- `~/.claude/skills/ifrs-gaap-reporting/SKILL.md` — accounting standards driving QoE adjustments
- `~/.claude/skills/iso27001-controls/SKILL.md` — cyber/security control review framework
- `~/.claude/skills/soc2-readiness/SKILL.md` — SOC 2 attestations the target should hold
- `~/.claude/rules/common/no-overclaim.md` — diligence findings reported honestly, including unresolved risk

## Why This Skill Exists

Failed acquisitions are the most expensive mistakes in business — $500B+ of US M&A overpayment value-destruction documented in academic literature (Moeller-Schlingemann-Stulz 2005). Failed fund commitments destroy LP returns over decades. The root causes are nearly always identified by post-mortems as: insufficient or biased due diligence.

Specific failure patterns that proper diligence catches:

- **HP-Autonomy (2011)**: $11B write-down from accounting irregularities QoE would have detected
- **Bayer-Monsanto (2018)**: $63B deal; subsequent $11B Roundup litigation that environmental + legal diligence flagged but was deprioritised
- **Time Warner-AOL (2000)**: cultural + technology mismatch ignored; $99B in value destroyed
- **Theranos (multiple)**: customer references that were never independently verified
- **Madoff feeders**: operational diligence skipped on the audit firm (one-man shop)
- **Adam Neumann / WeWork**: governance red flags visible in pre-IPO process, ignored due to FOMO

The discipline of multi-workstream, independent-reference, red-flag-scoring diligence with empowered IC veto is what separates institutional capital allocators from amateurs. It costs 1-2% of deal size in fees. It saves multiples of deal size in avoided disasters.

Trust, but verify. Then verify again with a different source. Then write it down.

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

- Reference check using only references the founder provided (no independent off-list refs)
- QoE / financial diligence skipped on the basis of "we'll fix it post-close" (high regret rate)
- Legal diligence missing IP-ownership chain back to founders + contractors
- Tech diligence skipped on tech-heavy acquisition (architecture / security debt unsurfaced)
- Commercial diligence based on top-down TAM only (no bottom-up customer interviews)
- ESG / sanctions / OFAC screening skipped on cross-border deal
- Customer concentration > 20% from single account not flagged
- Working capital normalisation missing from purchase price
- Earn-out structure without measurable + verifiable milestones
- Background checks on key principals deferred

**Refinement candidates**:

- New diligence-workstream row when a new asset class emerges
- New cross-reference when a sister skill (financial-analyst, valuation-models, investment-research, soc2-readiness, pci-dss-patterns) adds a diligence gate
- New red-flag scoring rubric row when a recurring deal-breaker class emerges
- Tightening of the IC-veto criteria when post-close surprises recur
