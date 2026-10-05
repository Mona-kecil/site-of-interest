# Site of Interest

Site of Interest screens all 962 IDX companies in the Sectors snapshot assembled on 5 October 2026 on five fundamentals questions: does profit turn into cash, does the business earn well on its capital, can the balance sheet take a hit, does the price assume perfection, and are minority holders treated fairly. Ideas shows Worth a look and Red flags for companies worth at least IDR 1T, with the numbers behind each verdict. Company pages and the screener retain measurements, reporting gaps, peer ranks and source evidence. Company, owner and group pages draw who owns what as a network. Company pages also rate the statement pillars for each year from FY2021 and show FY2026 analyst estimates where Sectors has them. Fixed rules inherit provider errors and provide no investment advice or price targets.

Start at `/`, a landing that shows the verdict tally, rates eight companies or any looked-up ticker, draws each rule's pass and flag lines, and traces Telkom's cash mark back to its Sectors rows. Open Ideas at `/ideas` for the screen's rules and company reasons, then open a company or the Screener at `/universe`. Filter companies by verdict, choose a lens, and open a measurement to see how it is calculated, its period, figures and source date. Follow a holder to its owner page, then compare members of a provider group. The [three-minute demo](docs/demo.md) gives exact clicks and snapshot values.

## Run locally

Install dependencies with `npm install`. For an existing configured and imported dev deployment, run `npm run dev` and open `http://127.0.0.1:5173/`. Vite reads `CONVEX_URL` from `.env.local`; the frontend uses `VITE_CONVEX_URL` at build time.

For a fresh local setup, an operator runs `npm run dev:full` to start Convex and Vite together. Convex writes its deployment settings to `.env.local`. After the schema is deployed, import the checked-in universe with `npm run convex:import-universe`. The import replaces eight universe tables and refuses production, preview deployments, deploy keys and environment overrides unless `--prod` is passed. Keep credentials out of Git.

## Deploy

The live app is https://site-of-interest.vercel.app. Its backend is the project's production Convex deployment.

1. `npx convex deploy` pushes the schema and functions to production.
2. `node scripts/import-universe.mjs --prod` replaces the eight universe tables in production. `--prod` is the only way the import reaches production; `.env.local` must still name the project's dev deployment.
3. Vercel's GitHub integration builds every push: `main` deploys to production and other branches get preview URLs. `npx vercel deploy --prod` deploys the local tree instead. Both build with `npm run build`. Vercel's production `CONVEX_URL` points at the production Convex URL. `.vercelignore` keeps `.env*` files out of the upload, and `vercel.json` rewrites app routes to `index.html`.

## Data pipeline

```text
sync:universe → build:checks → build:owners → validate:universe → convex:import-universe
```

Only an uncached Sectors sync spends provider credits. The current manifest has 10 field batches and five pages per batch, or 50 requests for a cold sync. The stored run records five credits. The forecast fields changed one batch, and the other pages came from the cache. Offline builders and validation make no provider requests; importing writes to the selected dev Convex deployment.

An operator sets `SECTORS_API_KEY` in `.env.local` and runs:

```sh
npm run sync:universe -- --max-credits=50 --dry-run
npm run sync:universe -- --max-credits=50
npm run build:checks
npm run build:owners
npm run validate:universe
npm run convex:import-universe
```

The dry run prints a plan. `--refresh` bypasses the cache; `--max-credits=0` permits cached pages only. Import is an explicit operator action. See the [data contract](docs/universe-data.md) for provenance, nulls, peer rules and known limits.

## Verify

```sh
npx tsc -b
npm run check
npm test
npm run build
npm run validate:universe
```

Unit tests use fixtures and the stored snapshot. Browser verification reads the imported dev deployment configured in `.env.local`. Push the current functions with `npx convex dev --once`, then run `npm run test:e2e`; it starts Vite itself when no server is running. The browser specs cover sources, gaps, navigation, graph caps, custodians and containment at 390 px.

## Project map

- [Product brief](docs/product-brief.md): research flow, lenses and registry-derived checks.
- [System design](docs/system-design.md): data flow, calculations and storage boundaries.
- [App architecture](docs/real-app-architecture.md): routes, query surfaces and module roles.
- [Design system](docs/product-design-system.md): cell states, evidence, graphs and accessibility.
- [Delivery checklist](docs/tickets/README.md): current scope and known follow-ups.
