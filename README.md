# Site of Interest

Site of Interest helps researchers inspect measured signals and sourced relationships across Indonesian conglomerates. The current build covers the Prajogo Pangestu Empire. **What's happening?** is the home page; Empire context sits behind its company records.

The application uses the Sectors REST API as its only market-data provider. The repository validator rejects every other source host.

Before adding a feature, read the [system design](docs/system-design.md), the
[product design system](docs/product-design-system.md), and the
[vertical product tickets](docs/tickets/README.md).

## Run the application

Install the dependencies and start Convex with the Vite+ development server:

```sh
npm install
npm run dev:full
```

Open `http://127.0.0.1:5173/happening`. Select a fundamental, broker, or market
measurement to inspect its inputs and source, then open the company and its Empire
context. The feed also includes matched September 2026 news. Recent stored broker
and market days cover all 10 listed Prajogo companies.
Selected date ranges without stored days show a coverage gap.

Convex creates an anonymous local deployment when no cloud deployment is configured. Seed the checked-in Prajogo corpus after creating a fresh deployment:

```sh
npm run convex:seed
```

Run the verification suite:

```sh
npm run check
npm test
npm run build
npm run validate
npm run validate:flow
```

## Sync the data

Create `.env.local` with your API key:

```text
SECTORS_API_KEY=your-key
```

Then regenerate the complete corpus:

```sh
npm run sync:sectors
```

The sync starts from Sectors' Barito affiliations and conglomerate-group labels, audits them against direct ownership, traverses listed descendants and CUAN's mining ownership, extracts private corporate shareholders, fetches the supporting group-link news record, validates the result, and writes JSON under `data/empires/prajogo/`. Private group entities appear in the default Empire view; outside corporate owners remain available under All owners. The current cold sync uses 53 Sectors credits. Responses are cached under `.cache/sectors/`, so an unchanged rerun uses zero credits. Pass `--refresh` only when you intentionally want fresh API responses. Never commit `.env.local`.

## Collect market flow

To rebuild the imported broker snapshot from already stored files without calling Sectors, run:

```sh
npm run build:broker-snapshot
npm run build:market-snapshot
npm run convex:seed
```

The snapshot keeps the latest 14-calendar-day window per ticker. It does not claim
that an uncollected ticker had no broker activity.

The market snapshot keeps up to 40 stored days per ticker and generates recent
volume comparisons against the prior 20 stored trading days. The original SINI
observation for 2026-09-08 differs from a later provider response in open, high,
and low only. See [the data-conflict record](docs/data-conflicts.md).

The collector fetches bounded broker-summary windows and stores each returned trading day under `data/market-flow/brokers/`. The React interface reads Convex records. Opening a company page does not call Sectors. The checked-in snapshot contains all 114 stored broker days, and an operator-only command can import later local windows without replacing the Empire.

From a company page, **Flow** opens `/flow/$ticker` and shows stored broker days beside stored market price and volume. The page makes no Sectors request until the researcher selects **Load latest 14 days**. It shows the exact Jakarta-date window, broker-summary endpoint, and maximum one-credit cost before that action. Live retrieval requires both `SECTORS_API_KEY` and `FLOW_FETCH_ENABLED=true` in the Convex deployment environment; neither value enters the browser. Without both, the page reads stored data but does not fetch. The page permits one request attempt per visit, and the backend caps each ticker and window at two attempts across visits. A completed window, including an empty response, is reused on later visits. The action fetches broker activity only; price and volume still come from the stored market observations. Reimporting the Prajogo corpus preserves fetched broker days and rejects a conflicting snapshot row.

To refresh only price and volume history, pass `--market-only` to the collector. For broker data alone, pass `--broker-only`. Remote calls require an explicit `--max-credits=N`; the default is zero. If a provider response conflicts with an immutable stored row, the collector stops. After inspecting the conflict, pass `--skip-conflicts` to keep the original row and continue with the other dates.

## Collect company news

`npm run sync:news` fetches at most four pages for the 10 listed Prajogo tickers, covering 2026-09-01 through 2026-09-23. The current import contains all 97 returned articles and used four credits. The command uses the Sectors response cache on repeat runs. After updating `data/news-snapshot.json`, run `npm run convex:seed` against the intended local development deployment.

Use the batch collector only for an intentional backfill:

```sh
npm run sync:flow -- --broker-only --start=2026-09-17 --end=2026-09-23 --max-credits=0
```

The default batch window is the latest 14 calendar days. For longer history, pass start and end dates. The collector splits OHLCV into 90-day requests and broker summaries into 14-day requests:

```sh
node scripts/sync-market-flow.mjs --tickers=SINI,PTRO,CUAN --start=2026-03-01 --end=2026-09-17 --max-credits=0
```

The command shows the worst-case request cost before calling Sectors and stops before it exceeds the run cap. Cached responses can be replayed with a zero-credit cap. Set a nonzero cap only for an intentional provider fetch. The collector writes each trading day separately, so a rerun reuses completed requests.

Preview an incremental local broker import, then apply it to the local Convex deployment:

```sh
npm run import:broker -- --start=2026-09-17 --end=2026-09-23 --tickers=BRPT
npm run import:broker -- --start=2026-09-17 --end=2026-09-23 --tickers=BRPT --apply
```

The import makes no Sectors call, rejects provider conflicts, and preserves matching days on retry. It rebuilds `data/broker-snapshot.json` so a later local code push and reseed retain the imported history. The company view calculates each broker's buy-share change against exactly 60 prior stored sessions. Until those sessions are present, it shows the count and date span as a coverage gap.

The collector writes immutable partitions under `data/market-flow/`. Market observations use `(ticker, trading date)`. Broker rows remain independent at `(broker code, ticker, trading date)`. The collector stores no owner, smart-money, retail, affiliation, or market-phase inference.

Validate the retained observations without making API calls:

```sh
npm run validate:flow
```

## Repository map

```text
convex/schema.ts                 Convex tables and indexes
convex/empires.ts                Public Empire graph read model
convex/companies.ts              Public company-intelligence read model
convex/seed.ts                   Idempotent Prajogo corpus import
src/features/empire/             React graph and interaction model
src/features/company/            Reusable listed-company intelligence view
scripts/sync-sectors.mjs         Sectors API client and corpus generator
scripts/sync-market-flow.mjs     Daily OHLCV and broker-flow collector
data/empires/prajogo/            Generated Sectors-backed corpus
data/market-flow/                Immutable ticker-date market observations
src/empire-corpus.mjs            Boundary validation and corpus queries
src/market-flow.mjs              Market-flow boundary and storage contract
docs/                            Product and architecture decisions
```

The product provides information and analysis. It does not provide investment recommendations.
