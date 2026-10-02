# Market signals

Status: implemented for recent stored dates across all 10 listed Prajogo companies. The first rule compares each day's volume with the prior 20 stored trading days. Gaps appear when that baseline is incomplete or zero.

## Outcome

A researcher sees price and volume measurements against explicit historical baselines.

## User path

1. Filter **What's happening?** to market signals or open **Market** from a company.
2. Select a measured signal.
3. Inspect its current value, baseline, ratio or difference, period, coverage, formula, and sources.

## Vertical slice

- Import market-day records into Convex by `ticker + tradingDate`.
- Add relative volume against the prior 20 completed trading days as the first market rule.
- Exclude the observation day from its baseline.
- Store the input references, values, unit, coverage, and rule version.
- Display the result without a qualitative label.
- Apply the rule to every ticker with enough history.

## Acceptance criteria

- The rule calculates `current volume / prior 20-day average volume`.
- Fewer than 20 baseline days produces a gap.
- A zero baseline produces a gap and no ratio.
- The UI displays current volume, baseline values, average, ratio, and coverage.
- The UI does not use normal, abnormal, positive, negative, bullish, bearish, or important.
- Repeat execution produces the same record.

## Non-goals

- Drawing tools or technical pattern names
- Trading actions
- Ticker-specific rules

## Verification

- Test sufficient history, insufficient history, and zero baseline.
- Test deterministic identity and repeat execution.
- Browser-test one eligible signal selected from the feed.
- Run `npm run check`, `npm test`, `npm run test:e2e`, `npm run build`, and `npm run validate:flow`.

## Current implementation

`src/market-signals.mjs` calculates the versioned ratio. `scripts/build-market-snapshot.mjs` rebuilds the imported snapshot from validated local observations without an API call. The feed shows the ratio, observation volume, baseline average, all 20 baseline rows, and their source paths. The company view shows stored price and volume history.

The market collector used at most 10 credits for the 2026-08-01 through 2026-09-23 window. Sectors returned data through 2026-09-22. A 2026-10-02 refresh used 10 credits and extended market data through 2026-10-01. A provider disagreement on SINI's 2026-09-08 open, high, and low remains unresolved; both responses agree on close, volume, and market cap. See [the data-conflict record](../data-conflicts.md).
