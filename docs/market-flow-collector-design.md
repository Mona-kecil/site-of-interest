# Market flow collection

## Purpose

Flow shows stored price, volume, and broker observations for listed Prajogo companies. The browser reads Convex records and never calls Sectors. A paid provider request happens only when an operator runs the collector with an explicit credit cap.

The observation identity is `ticker + trading date` for market days and `broker code + ticker + trading date` for broker rows. A broker's activity on one ticker does not define its role on another.

## Operator workflow

Choose a completed broker window of days 1–14 or 15–28. Days 29–31 are outside broker coverage. Preview and run a bounded collection:

```sh
npm run sync:flow -- --broker-only --start=2026-09-01 --end=2026-09-14 --max-credits=0
```

The default cap is zero. Cached responses can be replayed without spending credits. To make a new request, set `--max-credits` to the approved budget for that run. The collector prints its ticker set, range, maximum credits, cache hits, and actual usage. It stores each returned day under `data/market-flow/brokers/<ticker>/<date>.json`.

Validate and build the snapshot without provider calls:

```sh
npm run validate:flow
npm run build:broker-snapshot
```

Import one stored window into the local Convex deployment:

```sh
npm run import:broker -- --start=2026-09-01 --end=2026-09-14
npm run import:broker -- --start=2026-09-01 --end=2026-09-14 --apply
```

The first import command is a dry run. The importer rejects a non-local deployment, compares stored broker facts, and adds missing days and signals in small batches. `npm run convex:seed` imports the checked-in snapshot into a fresh local deployment without calling Sectors.

## Data boundaries

`src/market-flow.mjs` parses provider responses into market days, broker days, and a separate broker registry. `src/sectors-client.mjs` owns the API key, response cache, and credit cap. An immutable day partition is reused when its facts match; conflicting facts stop collection for review.

The broker registry contains static exchange-member metadata. Broker-day rows contain reported buy and sell values, lots, frequency, net values, and average prices. Neither record asserts investor identity, affiliation, intent, or market phase. An unidentified neutral aggregate from Sectors is retained as a day with no identifiable broker rows, so it cannot produce a broker signal.

`data/broker-snapshot.json` contains all stored broker days and derived buy-share signals. `data/market-snapshot.json` contains recent market days and relative-volume signals. The Flow query reads bounded stored history from Convex, and the page labels missing records as coverage gaps.
