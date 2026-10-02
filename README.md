# Site of Interest

Site of Interest helps researchers inspect measured signals and sourced relationships across Indonesian conglomerates. The current build covers the Prajogo Pangestu Empire. **What's happening?** is the home page; Empire context sits behind its company records.

The application uses the Sectors REST API as its only company-data provider. The repository validator rejects every other source host.

Before adding a feature, read the [system design](docs/system-design.md), the
[product design system](docs/product-design-system.md), and the
[vertical product tickets](docs/tickets/README.md).

## Run the application

Install the dependencies and start Convex with the Vite+ development server:

```sh
npm install
npm run dev:full
```

Open `http://127.0.0.1:5173/happening`. Select a fundamental measurement to inspect
its inputs and source, then open the company and its Empire context. The feed also
includes matched news. Choose a date range to inspect stored records and coverage
gaps. Focus compares the listed companies using their stored fundamental facts.

Convex creates an anonymous local deployment when no cloud deployment is configured. Seed the checked-in Prajogo corpus after creating a fresh deployment. The command seeds the local, anonymous, or cloud dev deployment configured in `.env.local` and refuses production and deploy keys. It loads the corpus, fundamental measurements, and stored news without Sectors requests:

```sh
npm run convex:seed
```

Run the verification suite:

```sh
npm run check
npm test
npm run build
npm run validate
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

## Collect company news

`npm run sync:news` reads its ticker set from the stored Empire memberships and fetches at most four pages of Sectors IDX news for the date window configured in `scripts/sync-news.mjs`. The snapshot records the requested tickers, dates, returned count, and pagination coverage. Repeat runs use the Sectors response cache. After updating `data/news-snapshot.json`, run `npm run convex:seed` to seed the configured deployment.

## Repository map

```text
convex/schema.ts                 Convex tables and indexes
convex/empires.ts                Public Empire graph read model
convex/companies.ts              Public company-intelligence read model
convex/seed.ts                   Idempotent Prajogo corpus import
src/features/empire/             React graph and interaction model
src/features/today/              Fundamental measurements and news feed
src/features/focus/              Fundamental comparison board
src/features/company/           Reusable listed-company intelligence view
scripts/sync-sectors.mjs         Sectors API client and corpus generator
scripts/sync-news.mjs            Exact ticker news collector
data/empires/prajogo/            Generated Sectors-backed corpus
src/empire-corpus.mjs            Boundary validation and corpus queries
docs/                            Product and architecture decisions
```

The product provides information and analysis. It does not provide investment recommendations.
