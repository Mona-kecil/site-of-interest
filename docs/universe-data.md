# IDX universe data

`npm run sync:universe -- --max-credits=50 --dry-run` prints the plan without requests; remove `--dry-run` to sync, use `--refresh` to bypass `.cache/sectors`, or set a cap of 0 to use only cached pages.
The CLI validates all pages before replacing `data/universe/`; `npm run validate:universe` checks the stored snapshot.

- `sources.json`: `[{ id, title, provider: "sectors", endpoint, retrievedAt, credits }]`, one source per page, with credits charged for this run (cache hits cost 0 and keep the cache file time as `retrievedAt`).
- `companies.json`: `[{ symbol, name, sector, subSector, industry, subIndustry, listingBoard, listingDate, indices, affiliates, current: { marketCap, freeFloat, peTtm, pbMrq, psTtm, roeTtm, roaTtm, yieldTtm, dividendTtm, payoutRatio, totalAssetsMrq, totalEquityMrq, totalRevenueMrq, earningsMrq, employees }, sourceIds: { [groupId]: sourceId } }]`.
- `years.json`: `[{ symbol, year, values: { [yearFieldKey]: number | null }, sourceIds: { [groupId]: sourceId } }]` for 2019 through 2025.
- `quarters.json`: `[{ symbol, quarter, values: { [quarterFieldKey]: number | null }, sourceIds: { [groupId]: sourceId } }]` for Q3-2024, Q4-2024, Q1-2025, Q2-2025, Q3-2025, Q4-2025, Q1-2026, Q2-2026.
- `holdings.json`: `[{ symbol, holderName, holderKey, holderKind: "entity" | "public" | "treasury", percentage, shares, value, sourceId }]`; percentages are fractions, and public and treasury rows stay in the data.
- `manifest.json`: `{ provider: "sectors", retrievedAt, companyCount, groups: [{ id, fields: [...] }], years: [2019..2025], quarters: [...], credits, schemaVersion: 1 }`.

Every stored value traces to `sources.json` through its row's `sourceIds[groupId]` (or `sourceId` for holdings) and the registry's provider field name, with symbol and name present on each company page.
Null means not reported; it stays null, including missing lists, and period rows with only null values are omitted after merging.
Company and period rows sort by symbol; period rows then sort by time.

Value keys, provider field names, units and periods come from `src/universe/fields.mjs`, which follows the [screener field list](https://docs.sectors.app/api-references/v2/indonesia/screener/companies).
Query groups hold at most 28 references and a 2,000-character `where` clause; a 1,983-character clause worked in probes and a 6,521-character clause returned an HTML error page.
Missing query keys abort the sync, so an unsupported field cannot turn into a null gap.
Fixtures trim the supplied probes; tests supply nulls for unprobed fields and synthetic quarter values, without calling Sectors or Convex.
The full snapshot is written by the operator after review; the fixtures are not a universe snapshot.
