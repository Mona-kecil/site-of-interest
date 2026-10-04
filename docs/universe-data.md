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

`npm run build:checks` builds `checks.json` from the stored snapshot without requests. The ordered registry in `src/universe/checks.mjs` also supplies the definitions used by Convex and `/universe`. Every applicable check has a result, including missing inputs and undefined ratios. Percent values stay fractions. ASII's FY2025 capex is a positive outflow: CFO of 44,694bn less capex of 28,176bn equals FCF of 16,518bn. FY2025 has 727 positive, 70 negative, 7 zero and 76 null capex reports among stored year rows. ADES reports capex as a negative outflow. Either way the provider's FCF equals CFO less the absolute capex, so the reinvestment rate uses absolute capex.

Peers are the applicable, non-null results for the same check and sub-sector. With `n` peers, `below` counts values strictly below the subject and `equal` counts equal values including the subject. The percentile is `(below + 0.5 * (equal - 1)) / (n - 1)`, or null when `n < 5`. Untied extrema are 0 and 1; tied extrema take their shared midrank. Gaps retain the group's reported peer count. ROIC's tax input label records the effective rate or the 0.22 fallback; both tax and EBT inputs retain their reported values and sources. An omitted all-null year traces to the company row's source for that manifest group.

`node scripts/import-universe.mjs --dry-run` writes eight JSONL files in a temp directory and prints counts and import commands. It can run without `.env.local`; in that case no deployment is selected. `npm run convex:import-universe` requires the same local/anonymous/dev deployment guard as the existing seed script and replaces only the eight universe tables. Existing model tables stay intact. Deploy the schema before importing. The operator runs deployment, import, codegen and the universe and owners e2e tests.

## Owners and business groups

`npm run build:owners` builds sorted `owners.json` and `groups.json` from the stored snapshot without requests or added timestamps. Owner keys normalize Unicode, case, punctuation and spacing, strip leading PT and trailing PT/Tbk/Persero/Ltd/Limited, and retain core names and account qualifiers. Display names use the most common spelling, with a lexical tie break. Only entity rows become owners; `Afiliasi` and `Afiliasi Pengendali` are explicit bucket labels found by inspecting generic holder names in the snapshot. Exact canonical company-name matches yield a listed symbol; ambiguous matches stay holders. Each raw entity row stays a separate holding with its source, competition rank (1, 1, 3 for ties), and largest-stake flag. Missing percentages have no rank. Company counts and largest-holder counts count distinct symbols; sums include reported values and stay null when none exist.

Groups retain Sectors `affiliates` labels and sorted member symbols, with reported market caps summed. Labels can overlap and do not verify control. `/owners`, `/owner/$key`, `/groups` and `/group/$slug` expose these measurements. The owner graph shows reported holdings and, for a listed owner, one level of its own entity holders; multiple source rows show separate percentages on one edge. `owners.forCompany({ symbol })` returns each raw company holding with a canonical `ownerKey` for entity rows and null for public/treasury rows, for company-page links. Reads use indexes and explicit bounds (5,000 owners, 128 owner holdings, 64 holdings per company, 128 groups, 1,024 group members); exceeding a bound raises an error instead of hiding rows.
