# Product brief

Site of Interest screens all 962 IDX companies in the stored Sectors snapshot with a Ricky Ho-style fundamentals screen. It presents cash, returns on capital, balance-sheet obligations, price against the company's own history and holders of record. Verdicts cite the measurements behind their rules. Measurements carry sub-sector peer percentiles and source inputs.

The application provides no investment advice, trade recommendations, price targets or claims of beneficial ownership. It is not affiliated with or endorsed by Ricky Ho. Verdicts inherit provider errors. Provider group labels remain attributed to Sectors.

## Verdicts

[ideas-model.ts](../src/features/ideas/ideas-model.ts) owns the five ordered pillars, bounds, core pillars and assessment. Banks use the bank rules; Insurance, Financing Service and Investment Service use other-financial rules; all remaining sub-sectors, including unreported ones, use non-financial rules. Percent thresholds below are fractions; multiples and counts retain their units. `pe_ttm` is current P/E.

| Pillar | Non-financial | Bank | Other financial |
| --- | --- | --- | --- |
| Cash | cash_conversion pass >= 0.8, fail < 0.5; fcf_yield pass > 0 | Does not apply | Does not apply |
| Returns | roic pass >= 0.12, fail < 0.05 | roe pass >= 0.12, fail < 0.05 | Same as bank |
| Balance sheet | net_debt_to_ebitda pass <= 2, fail > 4; interest_coverage pass >= 4, fail < 1.5 | npl_ratio pass <= 0.03, fail > 0.05; capital_adequacy pass >= 0.18, fail < 0.14; loan_to_deposit pass <= 0.95, fail > 1.1 | Does not apply |
| Price | pe_vs_history pass <= 1, fail > 1.5; fcf_yield pass >= 0.05; pe_ttm fail > 50 | pb_vs_history pass <= 1, fail > 1.5; pe_vs_history pass <= 1, fail > 1.5; pe_ttm fail > 50 | Same as bank |
| Owners | share_dilution pass <= 0.05, fail > 0.25; dividend_years pass >= 4; free_float fail < 0.10 | Same as non-financial | Same as non-financial |

A reported rule fails when its fail bound holds, passes when its pass bound holds or it has no pass bound, and is neutral otherwise. Null values add no evidence. A pillar with no rules is not applicable; one with no reported values is unknown. Any failed evidence fails the pillar, all passing evidence passes it, and the remaining cases are mixed.

Apply verdicts in this order, with the first match winning:

1. Red flags: any pillar fails.
2. Not enough data: fewer than three pillars are pass, mixed or fail.
3. Worth a look: every core pillar passes and at most one pillar that applies is mixed or unknown.
4. Mixed: all remaining cases.

Core pillars are cash and balance sheet for non-financial companies, returns and balance sheet for banks and other financial companies. Other financial companies can never be Worth a look because their balance pillar does not apply. A partially reported pillar can pass from its reported evidence.

Ideas lists companies with market cap >= IDR 1T: Worth a look sorts by passing pillar count then market cap, Red flags by market cap. Each starts with twelve cards and can expand to the full list. Company pages show all five pillars; the screener's verdict filter covers all 962 companies, including smaller ones.

## Research path

Start at / with Ideas, its rules and company reasons. Open a company for its verdict and pillar evidence, or use /universe to search, filter by verdict and choose a lens. Open a measurement's formula, reporting period, human input labels, raw field codes and source disclosure. Follow the company link for annual and quarterly history, ranked peer dots and reported holders. Open an owner for its stakes, co-holders and upstream list. Open Groups to compare members of a Sectors business-group label.

The company, owner and group pages retain gaps. A name-pattern label marks possible custodian or nominee accounts and states that they may hold for clients. A largest reported stake is a measurement of the entity rows, not proof of control. The [demo](demo.md) follows this path with stored values.

## Lenses and checks

This table was generated from the exported definitions in [checks.mjs](../src/universe/checks.mjs), lens membership in [universe-model.ts](../src/features/universe/universe-model.ts), and result periods in [checks.json](../data/universe/checks.json). Units are storage units: percent values stay fractions until display; multiples render with × and counts as integers. The bank checks extend the checks that apply to all companies. Non-financial checks exclude Banks, Insurance, Financing Service and Investment Service.

| Lens | Check | Unit | Applies to | Period | Registry formula |
| --- | --- | --- | --- | --- | --- |
| Cash | Cash conversion (`cash_conversion`) | multiple | Non-financial sub-sectors | FY2023–FY2025 | sum(operating_cash_flow[2023..2025]) / sum(earnings[2023..2025]); requires all inputs and positive earnings sum |
| Cash | FCF yield (`fcf_yield`) | percent | Non-financial sub-sectors | FY2025 / current | free_cash_flow[2025] / current market_cap |
| Cash | Reinvestment rate (`reinvestment_rate`) | percent | Non-financial sub-sectors | FY2023–FY2025 | sum(\|capital_expenditure[2023..2025]\|) / sum(operating_cash_flow[2023..2025]); capex is an outflow reported with either sign (the provider's free_cash_flow equals CFO − \|capex\| either way), so its absolute value is used; requires all inputs and positive CFO sum |
| Returns | ROIC (`roic`) | percent | Non-financial sub-sectors | FY2025 | ebit[2025] × (1 − t) / (total_debt[2025] + total_equity[2025] − cash_and_equivalents[2025]); t = tax[2025] / earnings_before_tax[2025] when EBT > 0 and 0 ≤ t ≤ 1, otherwise t = 0.22 (Indonesian statutory fallback); requires positive invested capital |
| Returns | ROE (`roe`) | percent | All companies | FY2025 / average FY2024–FY2025 | earnings[2025] / ((total_equity[2024] + total_equity[2025]) / 2) |
| Returns | Revenue CAGR (`revenue_cagr`) | percent | All companies | FY2020–FY2025 | (revenue[2025] / revenue[2020])^(1/5) − 1; requires both revenues > 0 |
| Balance sheet | Interest coverage (`interest_coverage`) | multiple | Non-financial sub-sectors | FY2025 | Provider-reported interest_coverage_ratio[2025] |
| Balance sheet | Net debt / EBITDA (`net_debt_to_ebitda`) | multiple | Non-financial sub-sectors | FY2025 | (total_debt[2025] − cash_and_equivalents[2025]) / ebitda[2025]; requires positive EBITDA |
| Balance sheet | Current ratio (`current_ratio`) | multiple | Non-financial sub-sectors | FY2025 | current_assets[2025] / current_liabilities[2025] |
| Balance sheet | Share dilution (`share_dilution`) | percent | All companies | FY2020–FY2025 | outstanding_shares[2025] / outstanding_shares[2020] − 1 |
| Price | P/E / history (`pe_vs_history`) | multiple | All companies | TTM Q3-2025..Q2-2026 / FY2020–FY2025 | pe_ttm / median(positive pe[2020..2025]); requires positive pe_ttm and at least 3 positive reported years; TTM = Q3-2025..Q2-2026 |
| Price | P/B / history (`pb_vs_history`) | multiple | All companies | MRQ Q2-2026 / FY2020–FY2025 | pb_mrq / median(positive pb[2020..2025]); requires positive pb_mrq and at least 3 positive reported years |
| Price | Dividend years (`dividend_years`) | count | All companies | FY2020–FY2025 | count(total_dividend[2020..2025] > 0); a null year counts as not reported, not as a reported zero dividend |
| Owners | Free float (`free_float`) | percent | All companies | current | Provider-reported free_float (fraction) |
| Owners | Largest holder (`largest_holder`) | percent | All companies | current | max(percentage among holdings with holderKind = entity); excludes public and treasury; requires every entity percentage |
| Banks | NPL ratio (`npl_ratio`) | percent | Banks | FY2025 | non_performing_loan[2025] / gross_loan[2025] |
| Banks | Loan / deposit (`loan_to_deposit`) | percent | Banks | FY2025 | Provider-reported loan_to_deposit_ratio[2025] |
| Banks | Capital adequacy (`capital_adequacy`) | percent | Banks | FY2025 | Provider-reported capital_adequacy_ratio[2025] |
| Banks | Net interest margin (`net_interest_margin`) | percent | Banks | FY2025 | Provider-reported net_interest_margin[2025] |

## Nulls, peers and evidence

A measured result shows its value, percentile and reported peer count. With fewer than five reported peers it shows the value and peer count without a percentile. Missing inputs produce Not reported; undefined bases produce Not meaningful; short positive valuation histories produce Too little history. Excluded checks show Does not apply without a button. Gap cells have no peer line. Unknown reason patterns retain their raw text.

Null inputs remain Not reported and never become zero. A reported zero remains a number. Percentiles compare only reported, applicable results for the same check and sub-sector, including the subject. Ties share their midrank. The rank-based company strip uses the same reported peer set and a diamond for the subject; it exposes each dot's symbol and value without assigning a rating.

Evidence puts the human field label and fiscal period before the provider code. IDR inputs use billions except for dividends per share, with exact raw values available in titles. A source line shows provider, endpoint path, field batch, row range and retrieval date; a disclosure preserves the full endpoint. The [data contract](universe-data.md) specifies capex signs, ROIC tax handling, ownership names and known provider limits.

## Current scope

The app covers Ideas, the screener, company verdicts, history and checks, owners and business-group labels. It reads a stored snapshot through bounded Convex queries. It does not refresh provider data during navigation. Authentication, saved research notes and automated refresh are outside the current surface. The [delivery checklist](tickets/README.md) lists the current scope and known follow-ups.
