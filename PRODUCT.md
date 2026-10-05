# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Newcomers and Sectors hackathon judges (first priority until 8 October 2026).** They have never seen the app. On a first visit they need to learn what it does, that it runs on real Sectors data, and why its verdicts can be trusted.
- **Indonesian retail value investors.** They know ROIC, P/E and free float. They come back to scan the lists, compare companies and dig into the evidence.

## Product Purpose

Site of Interest screens all 962 companies listed on the Indonesia Stock Exchange (IDX) on five fundamentals questions. It checks five pillars: cash before profit, returns on capital, a balance sheet that can take a hit, a price that does not assume perfection, and fair treatment of minority holders. Fixed, published rules turn the measurements into verdicts: Worth a look, Mixed, Red flags and Not enough data. Success means a first-time visitor understands the screen and opens a company's evidence.

## Positioning

Every verdict shows its work. Each pillar outcome cites the measurement, the threshold and the source inputs behind it, and the user can trace any number back to the Sectors endpoint, field batch, row range and retrieval date. The thresholds are the app's own defaults and stay visible.

## Operating Context

- Data comes from a stored Sectors snapshot assembled on 5 October 2026 from pages retrieved 2 to 5 October: FY2025 annual reports and current market data. Navigation does not refresh it.
- Research path: landing, then Ideas (Worth a look and Red flags for companies with a market cap of at least IDR 1T), then a company's verdict and pillar evidence. The screener covers all 962 companies. Owners and Groups show holders of record.
- The rules, bounds and verdict order live in `src/features/ideas/ideas-model.ts` and are documented in `docs/product-brief.md`.

## Capabilities and Constraints

- English copy that keeps Indonesian market terms such as Tbk, IDR T and bn, IDX and saham tickers.
- Stack: React 19, TanStack Router, Convex and Vite+.
- No investment advice, trade recommendations, price targets or claims of beneficial ownership.
- Verdicts inherit provider errors.
- Provider group labels stay attributed to Sectors.
- A missing number can't earn a pass and is never counted as zero.
- Hackathon deadline: 8 October 2026.

## Brand Commitments

- The name is Site of Interest.
- The landing page sets the visual world for the whole app. Ideas, Screener, Company, Owners and Groups inherit its shell, tokens and type.

## Evidence on Hand

- Real verdict data for all 962 companies. As of the 5 October snapshot, 78 companies are Worth a look, 69 of them worth at least IDR 1T. Worked examples: TLKM is Worth a look with all five pillars passing, DCII has a price flag with a current P/E above 50, BBCA has an NPL ratio of 1.65% and its largest holder of record holds 54.94%.
- There are no testimonials, user counts, returns or performance claims, and none may be invented.

## Product Principles

1. Show the work. Every claim cites a number, a line and a source.
2. A plain question before a metric. For example, "Does profit turn into cash?" comes before cash conversion.
3. Gaps stay visible. Write "not reported" rather than guessing.
4. Rules, not opinions. A verdict is the output of a published rule, never a recommendation.
