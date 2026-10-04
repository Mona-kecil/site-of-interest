# Site of Interest

Site of Interest is a fundamentals research tool for all 962 IDX companies in the Sectors snapshot retrieved on 2 October 2026. It shows measurements, reporting gaps, sub-sector peer percentiles, holders of record and provider business-group labels. It provides no investment advice, ratings or price targets.

Start at `/universe`. Filter companies, choose a lens, and open a measurement to inspect its formula, period, inputs and source. Open a company, follow a holder to its owner page, then compare members of a provider group. The [three-minute demo](docs/demo.md) gives exact clicks and snapshot values.

## Run locally

Install dependencies with `npm install`. For an existing configured and imported dev deployment, run `npm run dev` and open `http://127.0.0.1:5173/universe`. Vite reads `CONVEX_URL` from `.env.local`; the frontend uses `VITE_CONVEX_URL` at build time.

For a fresh local setup, an operator runs `npm run dev:full` to start Convex and Vite together. Convex writes its deployment settings to `.env.local`. After the schema is deployed, import the checked-in universe with `npm run convex:import-universe`. The import replaces eight universe tables and refuses production, preview deployments, deploy keys and environment overrides unless `--prod` is passed. Keep credentials out of Git.

## Deploy

The live app is https://site-of-interest.vercel.app. Its backend is the project's production Convex deployment.

1. `npx convex deploy` pushes the schema and functions to production.
2. `node scripts/import-universe.mjs --prod` replaces the eight universe tables in production. `--prod` is the only way the import reaches production; `.env.local` must still name the project's dev deployment.
3. `npx vercel deploy --prod` builds the frontend with `npm run build`. Vercel's production `CONVEX_URL` points at the production Convex URL. `.vercelignore` keeps `.env*` files out of the upload, and `vercel.json` rewrites app routes to `index.html`.

## Data pipeline

```text
sync:universe → build:checks → build:owners → validate:universe → convex:import-universe
```

Only an uncached Sectors sync spends provider credits. The current manifest has 10 field batches and five pages per batch, or 50 requests for a cold sync. The stored run records zero credits because it used cached responses. Offline builders and validation make no provider requests; importing writes to the selected dev Convex deployment.

An operator sets `SECTORS_API_KEY` in `.env.local` and runs:

```sh
npm run sync:universe -- --max-credits=50 --dry-run
npm run sync:universe -- --max-credits=50
npm run build:checks
npm run build:owners
npm run validate:universe
npm run convex:import-universe
```

The dry run prints a plan. `--refresh` bypasses the cache; `--max-credits=0` permits cached pages only. Import is an explicit operator action. See the [data contract](docs/universe-data.md) for provenance, nulls, percentile rules and known limits.

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
