# IDX universe data

The stored snapshot covers 962 IDX companies and was assembled on 5 October 2026 from source pages retrieved between 2 and 5 October 2026. Sectors is the only company-data provider. React reads imported records through Convex and derives presentation at render time; browsing a company spends no Sectors credits.

## Pipeline and credits

```text
sync:universe → build:checks → build:owners → validate:universe → convex:import-universe
```

| Command | Reads/writes | Sectors credits |
| --- | --- | --- |
| `npm run sync:universe -- --max-credits=50` | Fetches or reuses cached pages; validates before replacing the six base snapshot files | Uncached pages cost one each; cached pages cost zero |
| `npm run build:checks` | Reads the snapshot; writes `checks.json` | Zero |
| `npm run build:owners` | Reads companies/holdings; writes `owners.json` and `groups.json` | Zero |
| `npm run validate:universe` | Checks stored base rows and provenance | Zero |
| `npm run convex:import-universe` | Validates base rows and check freshness; writes JSONL and replaces eight dev Convex tables | Zero; writes to Convex |

Sync requires an explicit credit cap. `--dry-run` prints the plan without requests. `--refresh` bypasses `.cache/sectors/`; `--max-credits=0` uses cached pages only. The manifest has ten field batches and five pages of up to 200 rows per batch, so a cold sync uses 50 requests. The checked-in manifest records five credits. Adding the forecast fields changed the tenth batch, so its five pages were fetched again and the other 45 came from the cache. A cache hit keeps its original retrieval date.

The ten batches carry 271 field references. Field groups have at most 28 references and a 2,000-character where clause. A 1,983-character clause worked in probes; a 6,521-character clause returned an HTML error page. Missing query keys, failed pages, duplicate symbols or count changes abort replacement instead of becoming null fields.

Import requires a deployed schema and `.env.local` with a `local:`, `anonymous:` or `dev:` deployment. The guard rejects production, preview, deploy keys in the file or environment, and conflicting deployment overrides. `--prod` is an explicit exception: with the dev deployment still named in `.env.local`, it imports into that project's production deployment. It replaces only the eight universe tables. Each table is imported separately. `node scripts/import-universe.mjs --dry-run` validates and writes temporary JSONL without calling Convex; it can run without `.env.local`, with no deployment selected. Deployment, import, code generation and browser verification belong to the operator.

Before writing JSONL, import checks every array column against a 256-element cap. A breach stops the import and names the table, column, row key and length. Convex permits 8,192 elements per array; this snapshot's maxima are `companies.indices` 13, `companies.affiliates` 4, `companies.checks` 15, `checkResults.inputs` 12, `owners.holdings` 14 and `businessGroups.symbols` 20. The dry run prints these maxima for all eight tables, including those without array columns.

`owners.holdings[].reportedName` is required. Existing owner documents without this field fail the new schema until re-imported. The operator must stage the schema and import migration.

## Files and provenance

All files live in [data/universe](../data/universe/).

| File | Shape and role |
| --- | --- |
| `companies.json` | 962 rows: symbol, name, classification, listing fields, indices, affiliates, current values and `sourceIds[groupId]` |
| `years.json` | 5,982 rows: symbol, year, `values[fieldKey]` and group source IDs; 2019 through 2025 |
| `quarters.json` | 6,643 rows: symbol, quarter, values and group source IDs; Q3-2024 through Q2-2026 |
| `holdings.json` | 4,633 rows: symbol, raw holder name/key/kind, percentage, shares, value and source ID |
| `sources.json` | 50 rows: ID, provider, raw title, full endpoint, retrieval time and credits charged for that run |
| `manifest.json` | Provider, assembly time, company count, field batches, years, quarters, credits and schema version |
| `checks.json` | Version, source retrieval time, 19 definitions and 14,013 applicable results with inputs, gaps and peers |
| `owners.json` | 3,186 canonical entity owners, kind, listed-symbol match, raw source holdings with reported names and aggregate counts/values |
| `groups.json` | 24 provider-label groups, slug, member symbols and summed reported market cap |

[fields.mjs](../src/universe/fields.mjs) owns internal keys, human labels, provider field codes, units, scopes and periods. A year reference expands to a code such as `operating_cash_flow[2023]`. The manifest maps that code to a field batch; the row maps that batch to `sources.json`. Holdings have a direct `sourceId`.

Null means not reported, including missing lists. All-null period rows are omitted; evidence for such a period uses the company's source for the manifest batch. Rows sort by symbol and then reporting time. The source summary derives provider, endpoint path without query, field-batch position, bounded row range and retrieval date from the source and manifest. The full endpoint remains available in a wrapped disclosure. Assembly and retrieval dates do not represent financial reporting dates.

## Calculation and display rules

The [check registry](../src/universe/checks.mjs) supplies formulas and applicability; the [product check table](product-brief.md#lenses-and-checks) is generated from its definitions. Percent checks remain fractions in storage. Ratios, monetary inputs and counts retain raw provider numbers; null never becomes zero.

Capex is an outflow that Sectors reports with either sign. Reinvestment uses the sum of absolute capex divided by operating cash flow for FY2023–FY2025. ASII FY2025 reports CFO of IDR 44,694 bn, capex of positive IDR 28,176 bn and provider FCF of IDR 16,518 bn. ADES reports capex with a negative sign. In these records FCF equals CFO less absolute capex. Among stored FY2025 rows, capex has 727 positive, 70 negative, seven zero and 76 null values. The app preserves each raw sign in evidence.

ROIC uses the reported effective tax rate when its inputs support a rate from zero to one, and uses 0.22 otherwise. The tax input annotation names the selected rate; reported tax and earnings before tax remain visible. P/E and P/B history use only positive reported annual values and require at least three such years. Dividend years count positive reported dividends and retain missing years in the evidence.

The company page also rates the cash, returns and balance-sheet pillars for each year from FY2021 through FY2025, using today's pass and flag lines. Each statement check takes a fiscal year. Cash conversion sums that year and the two before it, ROE averages equity over that year and the one before, and the other statement checks read that year alone. FCF yield needs today's market cap, so the yearly cash pillar uses free cash flow above zero for that year instead. Price and owners are rated for today only. Past share prices are not in the snapshot, and the owner checks already span 2020 through 2025. For every company with a reported market cap, the FY2025 marks match the current pillar outcomes. At least one pillar can be rated for 845 companies in FY2021 and 867 in FY2025. The yearly marks do not change the verdict.

Analyst estimates come from the Sectors forecast fields for FY2026: revenue and EPS estimates, their growth rates and forward P/E. Each estimate covers 101 companies and forward P/E covers 137. FY2027 and FY2028 are not stored. In a probe of the first 200 companies, 30 had FY2026 estimates, four had FY2027 estimates and none had FY2028 estimates. Growth rates are fractions against the provider's FY2025 base. Revenue growth matches stored FY2025 revenue for all 101 companies. EPS growth matches stored earnings per share within 3% for only 79 of 91 companies, so the page shows the provider's growth rate and computes none. When the estimate or the base it implies is not positive, the page shows no growth figure. A forward P/E at or below zero shows as Not meaningful. Estimates play no part in any check or verdict.

The provider field `total_dividend` is dividend per share in IDR. AALI reports 91, 255, 444, 401, 249 and 184 for 2020 through 2025. History and evidence show IDR per share; the dividend-years check still counts positive years.

Peers are applicable, non-null results for the same check and sub-sector. The subject belongs to the peer set. Percentile is `(below + 0.5 × (equal − 1)) / (n − 1)`; fewer than five reported peers yields null. Below counts strictly lower values and equal includes the subject. Untied extrema are zero and one; ties share a midrank. A gap retains its stored peer count but shows no peer line.

Measured cells show a value plus percentile and peer count. With fewer than five peers, they show a value plus `3 peers · no percentile`. Gaps show Not reported for missing inputs, Not meaningful for an undefined base, or Too little history. Excluded checks show Does not apply without a button. Human reasons replace known field codes and years; unknown patterns retain the raw reason. Inputs show human labels, provider codes and source references; IDR uses billions except for dividends per share, with the exact number in a title.

## Owners and groups

Owner keys normalize Unicode with NFKC, lowercase, remove periods, turn other punctuation into spaces and collapse spacing. They remove leading PT and trailing PT, Tbk, Persero, Ltd and Limited, while preserving core names and account qualifiers. After normalization, [ownerKey](../src/universe/owners.mjs) applies only these six reviewed aliases:

| Normalized variant | Canonical target | Reviewed records |
| --- | --- | --- |
| `equity developoment investment` | `equity development investment` | GSMF listed name; ASDM misspelling; BGTG target spelling |
| `batavia prosperindo international` | `batavia prosperindo internasional` | BPII listed name; BPTR and MTWI variants; BPFI target spelling |
| `indomobil sukses international` | `indomobil sukses internasional` | IMAS listed name; IMJS variant |
| `ptpanorama sentrawisata` | `panorama sentrawisata` | PANR listed name; PDES missing space; WEHA target spelling |
| `pollux properti indonesia` | `pollux properties indonesia` | POLL listed name; POLI variant |
| `edwin soeryadjaja` | `edwin soeryadjaya` | ADRO variant; MPMX, SRTG and TBIG target spelling |

There is no fuzzy matching. Gwie Gunadi Gunawan / Gwie Gunato Gunawan, PT Adaro Strategic Investment / PT Adaro Strategic Investments, Andrianto Oetomo / Arianto Oetomo and Jusuf Sutrisno / Jusup Sutrisno stay separate; their identities have not been established.

Display names use the most common raw spelling with a lexical tie break. Alias groups choose a raw target spelling, preferring the matching listed company's name. Only entity rows become owners. Afiliasi and Afiliasi Pengendali remain explicit bucket labels, not single controlling owners. Canonical company-name matches identify 102 listed owners; ambiguous matches stay holders. Company-page holder links use the same canonical key.

Every raw entity row stays a separate source holding. Each stores the provider's holder name as `reportedName`; the owner holdings table shows "Reported as …" when it differs from the owner display name, including legal-form differences. Rank compares entity percentages within the same company and uses competition ranks such as 1, 1, 3 for ties. Null percentages have no rank. Company and largest-holder counts count distinct symbols. Sums include reported amounts and stay null when none exist. Public and treasury rows remain on company pages but are excluded from owners and largest-entity-stake checks.

The graph combines duplicate canonical nodes while retaining source percentages on their edge. Upstream and downstream columns sort by largest reported stake then name, show at most eight entities and link +N more to the full page list. Listed owners expose one upstream entity-holder level. This graph does not trace ultimate control.

Groups preserve Sectors affiliates labels and sorted member symbols, summing reported market caps. Labels can overlap; parent and listed subsidiary values can both appear. They do not verify control. The API's explicit read bounds and routes are listed in [app architecture](real-app-architecture.md).

## Custodian rule

[isCustodianName](../src/universe/owners.mjs) flags these name patterns, ignoring case: Bank of Singapore, UOB Kay Hian, Julius Baer, DBS Bank (including the snapshot spelling Ddbs Bank), Citibank, BP2S (BNP Paribas Securities Services), The Bank of New York Mellon (a depositary), S/A or A/C qualifiers with optional spacing, and the words custodian, custody, safekeeping, nominee/nominees, omnibus, client/clients or the abbreviation Clt. It does not flag a generic bank or a name because it contains Singapore.

The label Custodian or nominee account identifies a possible holder of record for clients. It does not identify beneficial ownership, merge client-qualified accounts or change stake calculations. Brokers that hold client positions under their own name, such as Phillip Securities or CGS International Securities, are not flagged. Name patterns can miss unnamed intermediaries and can flag a name whose account role needs source review.

## Known limits

- FY2025 current assets are below 0.5% of total assets for 15 reported companies: ARTI, BIPI, BULL, GTBO, GTSI, HEXA, HITS, HUMI, IKBI, ITMA, KARW, MKNT, PSAB, TAMU and TGRA. The app shows these values as reported; it does not rescale them. The set spans market-cap sizes.
- Provider bank ratios contain outliers, including a loan/deposit value displayed near 92,037%. Rank spacing prevents that value from flattening other peer positions, but preserves its number.
- Annual coverage stops at FY2025; the quarter slots stop at Q2-2026. Analyst estimates cover FY2026 only. Missing periods remain gaps. Current market multiples and annual history use different periods, stated with each check.
- Holder names and business-group labels describe provider records. They do not prove ultimate ownership or control. Source retrieval times span the cached pages and can precede manifest assembly.
- Input evidence exposes provider codes and raw numbers so the researcher can inspect reporting differences. The app does not repair provider figures or fill missing reports.

## Local verification

Run `npx tsc -b`, `npm run check`, `npm test` and `npm run build` for implementation checks. `npm run validate:universe` validates the base snapshot. Tests use stored data and synthetic fixtures without live Sectors requests. Browser specs require the operator's imported dev deployment and `npm run test:e2e`. See [README](../README.md) for setup and [demo](demo.md) for the research path.
