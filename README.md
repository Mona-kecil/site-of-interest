# Site of Interest

Site of Interest screens all 962 IDX companies in the Sectors snapshot assembled on 5 October 2026 on five fundamentals questions: does profit turn into cash, does the business earn well on its capital, can the balance sheet take a hit, is the price too high for what it earns, and are minority holders treated fairly. Ideas shows Worth a look and Red flags for companies worth at least IDR 1T, with the numbers behind each verdict. Company pages and the screener retain measurements, reporting gaps, peer ranks and source evidence. Company, owner and group pages draw who owns what as a network. Company pages also rate the statement pillars for each year from FY2021 and show FY2026 analyst estimates where Sectors has them. Fixed rules inherit provider errors and provide no investment advice or price targets.

Start at `/` on https://site-of-interest.vercel.app, a landing that shows the verdict tally, rates eight companies or any looked-up ticker, draws each rule's pass and flag lines, and traces Telkom's cash mark back to its Sectors rows. Open Ideas at `/ideas` for the screen's rules and company reasons, then open a company or the Screener at `/universe`. Filter companies by verdict, choose a lens, and open a measurement to see how it is calculated, its period, figures and source date. Follow a holder to its owner page, then compare members of a provider group. The [three-minute demo](docs/demo.md) gives exact clicks and snapshot values.

## One verdict, traced end to end

Telkom (TLKM) is Worth a look. Its Cash pillar shows how every verdict is built.

1. **Rows.** The sync stores TLKM's operating cash flow and earnings for 2023 to 2025 from the Sectors page recorded as `universe-03-800`, retrieved 2 October 2026 ([sources.json](data/universe/sources.json)).
2. **Calculation.** `build:checks` divides three years of operating cash flow by three years of earnings: (60,581 + 61,600 + 63,842) / (24,560 + 23,649 + 17,814) IDR bn = 2.82×. The stored result keeps all six inputs with their periods and source ID ([checks.mjs](src/universe/checks.mjs), [checks.json](data/universe/checks.json)).
3. **Rules.** Cash conversion passes at 0.8× or more and is flagged below 0.5×. FCF yield passes above 0%. A pillar passes only when every rule with a pass line has a number that clears it, so TLKM's Cash passes (`PILLARS` and `ratePillar` in [ideas-model.ts](src/features/ideas/ideas-model.ts)).
4. **Verdict.** A company is Worth a look when no pillar is flagged, its core pillars pass (cash and balance sheet; returns and balance sheet for financial companies) and at most one other pillar falls short. TLKM passes all five (`assess`, same file).
5. **Screen.** On TLKM's page, How it's calculated lists the six figures and "Source: Sectors, retrieved 2 Oct 2026."

The counterexample is Adaro Andalan (AADI), which has no 2023 operating cash flow in the snapshot. Its check stores a null with the gap `Not reported: operating_cash_flow[2023]` rather than a zero, so its Cash pillar can't pass. AADI is Mixed, and its page names the missing figure.

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

### What each stage guarantees

- **Budgeted sync.** [fields.mjs](src/universe/fields.mjs) defines 63 Sectors fields, which expand to 271 references across current, annual and quarterly figures. [groups.mjs](src/universe/groups.mjs) packs them into 10 batches, and each batch pages through the 962 companies 200 at a time. The sync requires a credit cap and serves repeated pages from a cache. If credits run out or the company count changes mid-run, it stops before replacing the stored snapshot, and it validates the merged snapshot before writing it ([sync.mjs](src/universe/sync.mjs), [files.mjs](src/universe/files.mjs)).
- **Checks keep their gaps.** [checks.mjs](src/universe/checks.mjs) defines 19 checks and stores 14,013 results. A missing input stays null and produces a named gap. A ratio with a missing or zero denominator gets a reason instead of a number, and checks that need a positive base also reject a negative one. Every input keeps its period and source ID, and peer ranks compare a company only with its own sub-sector.
- **Owner identity is conservative.** [owners.mjs](src/universe/owners.mjs) merges spellings of the same shareholder that differ in legal form, punctuation, case or spacing, plus six reviewed aliases. People, custodial accounts and ambiguous listed names stay separate rather than being guessed.
- **Validation and a guarded import.** [validate.mjs](src/universe/validate.mjs) checks types, finite numbers, periods and provenance on every source, company, annual, quarterly and holding row, and rejects duplicate sources, companies and company periods. The import recomputes the checks and refuses a stale checks.json, refuses arrays longer than its cap, and reaches production only with `--prod`.
- **Bounded reads.** [Convex queries](convex) read through indexes. Every stored read has a fixed bound and raises an error rather than hide rows. Graph caps change only the drawing; the tables beneath keep every row.
- **One verdict model.** [ideas-model.ts](src/features/ideas/ideas-model.ts) turns stored checks into pillar outcomes and verdicts in the browser. The track record reuses it with shifted fiscal windows. Browsing reads the imported snapshot from Convex and never calls Sectors.

## Verify

```sh
npx tsc -b
npm run check
npm test
npm run build
npm run validate:universe
```

Unit tests use fixtures and the stored snapshot. Browser verification reads the imported dev deployment configured in `.env.local`. Push the current functions with `npx convex dev --once`, then run `npm run test:e2e`; it starts Vite itself when no server is running. The browser specs cover sources, gaps, navigation, graph caps, custodians and containment at 390 px.

| Claim                                                          | Test                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A missing input stays missing and is never counted as zero     | "nulls remain inputs and produce a named gap instead of zero" in [checks.test.mjs](src/universe/checks.test.mjs); "keeps Cash mixed when cash conversion is missing and FCF yield passes" in [ideas-model.test.ts](src/features/ideas/ideas-model.test.ts) |
| Undefined ratios give a reason, not a number                   | "undefined ratios and nonpositive required denominators give reasons" in [checks.test.mjs](src/universe/checks.test.mjs)                                                                                                                                   |
| The committed checks match a rebuild, with every input sourced | "real snapshot coverage, finite values, complete provenance and committed output" in [checks.test.mjs](src/universe/checks.test.mjs)                                                                                                                       |
| A sync that fails before writing leaves stored files intact    | "total_count change between groups stops without replacing stored files" and "credit exhaustion stops before another fetch and before any writes" in [sync.test.mjs](src/universe/sync.test.mjs)                                                                     |
| Every owner holding is assigned once and keeps its source      | "real snapshot assigns every entity row once and preserves all holding sources" in [owners.test.mjs](src/universe/owners.test.mjs)                                                                                                                         |
| The track record's FY2025 ratings match today's pillars        | "matches current FY2025 pillar outcomes and stored readings across the universe" in [history-model.test.ts](src/features/company/history-model.test.ts)                                                                                                    |
| Graph caps never hide rows from the tables                     | "caps Bank of Singapore's nine downstream companies and identifies its account role" in [owners.spec.ts](e2e/owners.spec.ts)                                                                                                                               |
| A read over its bound fails instead of truncating             | "throws instead of returning a truncated result above the bound" in [read-bounds.test.ts](src/test/read-bounds.test.ts) |

### Limits

- Verdicts reflect the 5 October 2026 snapshot, which is refreshed by hand, and inherit any provider errors or outliers.
- The pass and flag lines are fixed defaults for a first pass. They are not calibrated against returns, and nothing here is a backtest.
- Insurance, financing and investment-service companies can't be Worth a look: the balance sheet is a core pillar and has no rules for them. They can still be Mixed or show Red flags.
- Price and owners are rated for today only. The track record covers cash, returns and the balance sheet.
- The import replaces tables one at a time, so a failed import can leave a partial update. Rerun it to finish.

## Project map

- [Product brief](docs/product-brief.md): research flow, lenses and registry-derived checks.
- [System design](docs/system-design.md): data flow, calculations and storage boundaries.
- [App architecture](docs/real-app-architecture.md): routes, query surfaces and module roles.
- [Design system](docs/product-design-system.md): cell states, evidence, graphs and accessibility.
- [Delivery checklist](docs/tickets/README.md): current scope and known follow-ups.
