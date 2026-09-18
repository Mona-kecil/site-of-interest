## Outcome

A researcher can inspect recent price, volume, and broker participation for one ticker without pre-spending credits across the whole Empire.

## User path

1. Open a company-intelligence page.
2. Open **Flow** for that ticker.
3. Wait for the latest bounded Sectors window to load.
4. Compare daily price and volume with independent broker net activity.
5. Return later and see the stored history without another remote request for the same window.

## Vertical slice

- Add `/flow/$ticker` and enable the **Flow** navigation item when a ticker is in context.
- Move the existing `MarketDay` and `BrokerDay` contracts into Convex tables keyed by ticker and trading date.
- Keep broker rows at `brokerCode + ticker + tradingDate`.
- Add one protected Convex action that calls Sectors with the backend API key.
- Coalesce concurrent requests for the same ticker and window.
- Fetch at most the latest 14 calendar days on a page visit.
- Persist every returned trading day before returning the read model.
- Show price, volume, aggregate buy and sell values, and the broker table for the selected day.

## Acceptance criteria

- The API key never reaches the browser.
- One page visit spends at most one Sectors credit.
- Reloading an already stored window does not spend another credit.
- Each broker remains independent for each ticker.
- The UI does not label a broker as retail, smart money, foreign, or owner-affiliated.
- Missing days appear as a retention gap. The page does not auto-backfill them.
- A source record identifies the Sectors endpoint and retrieval time.
- The route works for at least CUAN and PTRO.

## Non-goals

- Accumulation or distribution classification.
- Cross-broker coordination claims.
- Automatic historical backfill.
- Scheduled collection.

## Verification

- Port the existing parser, idempotency, concurrency, and retry tests to the final storage path.
- Test that a repeated window performs no second remote call.
- Browser-test ticker selection, day selection, and retained data after reload.
- Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.

