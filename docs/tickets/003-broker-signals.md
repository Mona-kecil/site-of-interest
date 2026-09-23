# Broker flow signals

Status: implemented for stored observations. Broker days for all 10 listed Prajogo companies appear in **What's happening?** and the company view. A 60-session comparison remains a coverage gap until that many prior sessions have been collected for a ticker.

## Outcome

A researcher compares broker activity measurements for a listed company without assigning intent or investor identity.

## User path

1. Filter **What's happening?** to broker signals or open **Broker flow** from a company.
2. Select a date range.
3. Compare buy value, sell value, net value, lots, average prices, and activity share.
4. Open a signal to inspect its period, baseline, formula, coverage, and source rows.

## Vertical slice

- Move normalized broker-day and broker-registry records into Convex.
- Keep each row at `brokerCode + ticker + tradingDate`.
- Add a protected fetch for one ticker and one provider window.
- Reuse the cache, request coalescing, parser, and immutable-write behavior.
- Add versioned rules for broker shares and period comparisons.
- Display every numerator, denominator, period, unit, and source.
- Keep broker metadata separate from measured activity.

## Acceptance criteria

- The API key never reaches the browser.
- A stored window costs no additional provider credit on reload.
- A broker signal applies only to one ticker and period.
- Missing trading dates appear in coverage.
- The UI assigns no investor identity or intent.
- Each value can be reproduced from displayed broker rows.
- Shared logic contains no ticker check.

## Non-goals

- Smart-money, retail, accumulation, or distribution labels
- Coordination or beneficial-ownership claims
- Automatic historical backfills
- AI classification

## Verification

- Port parser, idempotency, concurrency, retry, and cache tests to Convex storage.
- Test period calculations with multiple brokers.
- Browser-test feed navigation, date selection, signal detail, and reload.
- Run `npm run check`, `npm test`, `npm run test:e2e`, `npm run build`, and `npm run validate:flow`.

## Current implementation and remaining work

`scripts/build-broker-snapshot.mjs` reads all validated local broker days and builds a deterministic snapshot. `convex/seed.ts` imports one bounded document per ticker and day, plus the largest observed broker buy-share measurement for each day with a nonzero denominator. The feed opens that measurement's full broker-day rows. The company view aggregates buy value, sell value, net value, lots, active days, and buy share across a selected stored date range. It compares each broker's selected-period share with its share across exactly 60 prior stored sessions, in percentage points. It also shows the provider's daily average prices in the source-day table.

The stored snapshot contains 114 broker days across all 10 listed Prajogo companies. `scripts/sync-market-flow.mjs --broker-only` collects bounded 14-day endpoint windows into immutable local files, with an explicit per-run credit cap that defaults to zero. `scripts/import-broker-days.mjs` previews or imports one local 14-calendar-day window into Convex. Its internal mutation checks Empire membership, matches retries without writing, and rejects conflicts. The import command accepts only a local deployment and makes no Sectors request. The old and new windows were tested with both a new-day import and a no-op retry.

No ticker yet has 60 prior stored broker sessions for the displayed window. The interface does not show a percentage-point comparison until 60 prior stored sessions exist; it states the exact count and date span instead. Collecting that history consumes provider credits and remains an explicit operator decision.
