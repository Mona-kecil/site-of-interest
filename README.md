# Site of Interest

Site of Interest maps evidence-backed relationships across Indonesian conglomerates. `Empire` is the first production route. It currently maps the Sectors-backed Prajogo Pangestu network through React and Convex.

The application uses the Sectors REST API as its only market-data provider. The repository validator rejects every other source host.

## Run the application

Install the dependencies and start Convex with the Vite+ development server:

```sh
npm install
npm run dev:full
```

Open `http://127.0.0.1:5173/empire/prajogo`.

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

The retained collector fetches the latest 14-day broker-summary window and stores each returned trading day under `data/market-flow/brokers/`. The Flow interface has not moved to React and Convex yet.

Open a ticker's Flow view at least once every 14 days to retain continuous broker history. The loader records gaps instead of spending extra credits on an automatic backfill.

Use the batch collector only for an intentional backfill:

```sh
npm run sync:flow
```

The default batch window is the latest 14 calendar days. For longer history, pass start and end dates. The collector splits OHLCV into 90-day requests and broker summaries into 14-day requests:

```sh
node scripts/sync-market-flow.mjs --tickers=SINI,PTRO,CUAN --start=2026-03-01 --end=2026-09-17
```

The command caches each request and writes each trading day separately. You can rerun the same range after a failure without spending credits on completed requests.

The collector writes immutable partitions under `data/market-flow/`. Market observations use `(ticker, trading date)`. Broker rows remain independent at `(broker code, ticker, trading date)`. The collector stores no owner, smart-money, retail, affiliation, or market-phase inference.

Validate the retained observations without making API calls:

```sh
npm run validate:flow
```

## Repository map

```text
convex/schema.ts                 Convex tables and indexes
convex/empires.ts                Public Empire read model
convex/seed.ts                   Idempotent Prajogo corpus import
src/features/empire/             React graph and interaction model
scripts/sync-sectors.mjs       Sectors API client and corpus generator
scripts/sync-market-flow.mjs   Daily OHLCV and broker-flow collector
data/empires/prajogo/         Generated Sectors-backed corpus
data/market-flow/              Immutable ticker-date market observations
src/empire-corpus.mjs         Boundary validation and corpus queries
src/market-flow.mjs           Market-flow boundary and storage contract
docs/                         Product and architecture decisions
```

The product provides information and analysis. It does not provide investment recommendations.
