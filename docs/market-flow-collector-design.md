# Market flow collector design

## Problem

Site of Interest needs a Sectors-only daily record of price, volume, and broker activity. The load-bearing identity is `broker code × ticker × trading date`. A broker's behavior on one ticker must not affect its classification on another ticker. The Sectors endpoints expose bounded windows, so the repository must retain observations without turning the ownership corpus into shared mutable state.

## Usage

Open **Flow** in the running prototype to collect the latest broker window only for the focused ticker. The browser calls this server route:

```text
GET /api/flow/<ticker>
```

Run the batch collector only for an intentional backfill:

```sh
npm run sync:flow
```

Run a bounded probe or backfill:

```sh
node scripts/sync-market-flow.mjs --tickers=SINI,PTRO,CUAN --start=2026-09-04 --end=2026-09-17
```

Validate stored observations without network access:

```sh
npm run validate:flow
```

## Shape

The public domain module owns three validated observation forms:

```js
parseMarketDays(rawResponse, { ticker, endpoint, retrievedAt }) -> MarketDay[]
parseBrokerDays(rawResponse, { ticker, endpoint, retrievedAt }) -> BrokerDay[]
parseBrokerRegistry(rawResponse, { endpoint, retrievedAt }) -> BrokerRegistry
observationPath(root, observation) -> string
writeObservation(root, observation) -> "created" | "unchanged"
validateStoredFlow(root) -> FlowInventory
loadBrokerHistory(root, ticker) -> BrokerDay[]
createOnDemandBrokerFlow({ directory, sectors, now }).load(ticker) -> BrokerFlowResult
```

`MarketDay` is stored at `data/market-flow/market/<ticker>/<date>.json`.

`BrokerDay` is stored at `data/market-flow/brokers/<ticker>/<date>.json`. Its `brokers` array contains independent broker rows for that ticker and date. It does not contain roles, affiliations, phase labels, or scores.

`BrokerRegistry` is stored at `data/market-flow/registry/<retrieved-date>.json`. Static broker metadata may be joined later, but it cannot alter ticker-scoped observations.

The parser validates Sectors wire data at the network boundary. Internal functions receive normalized domain records. The writer creates each partition once. A retry with equivalent facts returns `unchanged`; conflicting facts fail instead of overwriting evidence. This applies boundary discipline and idempotent operations.

The Sectors client owns authentication, response parsing, credit accounting, and request caching. Both corpus sync and flow sync call the same client so transport policy has one owner.

The on-demand loader requests the latest 14 calendar days from the broker-summary endpoint. It persists each returned day before it responds. The response includes all stored broker days for the ticker, so the UI does not need to know how Sectors paginates data.

Lazy collection does not guarantee continuous history. A ticker can develop a gap when nobody opens its Flow view for more than 14 days. The loader does not backfill that gap automatically because one page visit must spend at most one credit.

The server keeps the API key out of the browser. Requests for the same ticker and window share one in-flight operation. The persistent Sectors response cache prevents a repeated request from spending another credit after a server restart.

## Synthesis decision

Candidate A stored one mutable history file per ticker. It made reads simple, but every run rewrote prior observations and serialized all writers through one file. It also coupled market and broker retention windows.

Candidate B stored immutable files by domain, ticker, and trading date. It became the base because the storage key matches the research unit, interrupted runs can resume, and market and broker endpoints can advance independently. The single-command caller experience from Candidate A was retained.

For browser collection, Candidate A called Sectors from the browser. It exposed the API key and could issue duplicate requests. Candidate B added a server route over the existing client and immutable writer. Candidate B won because one server operation owns authentication, request deduplication, persistence, and credit accounting.

The design rejects a database for this phase. A database would improve analytical queries but add a dependency before the observation contract has stabilized. The partitioned JSON files can later feed SQLite, DuckDB, or another analytical store without changing ingestion.

## Tradeoffs accepted

- We accept many small files in exchange for independent, reviewable observations.
- We accept scan-based validation in exchange for no database dependency.
- We fail on corrected historical facts instead of silently replacing them. A future revision ledger can handle provider corrections explicitly.
- We store raw normalized facts only. Phase and actor-role inference belongs to a later analysis module.

## Alternatives considered

- A mutable JSON history per ticker exposed merge and locking rules to every writer, so it lost on interface depth and retry safety.
- A single SQLite database hid file management but introduced schema migration and concurrent-write policy before the domain shape was settled.

## Open questions and risks

- Should a later provider correction create a revision record or require a manual reconciliation command?
- How many historical days are available for new broker-summary subscribers beyond the documented request window?
- Which scheduling time reliably represents a completed IDX trading day?

## Next implementation step

Implement the pure parsers and immutable writer, then place the CLI and shared Sectors client around that boundary.
