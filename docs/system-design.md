# System design

Site of Interest reads a stored Sectors snapshot through Convex. Page visits make no Sectors request. React derives display labels, gap categories, source summaries, peer ranks and graph caps at render time. The snapshot and backend contracts retain raw provider values.

## Data flow

```text
Sectors /v2/companies/
  → budgeted, cached sync and boundary validation
  → data/universe/ company, annual, quarterly, holding and source rows
  → offline checks and owner/group builders
  → offline snapshot validation
  → guarded dev-only import into eight Convex tables
  → indexed read models
  → React research routes
```

The command order is `sync:universe → build:checks → build:owners → validate:universe → convex:import-universe`. Cold syncs spend Sectors credits; cache hits retain the source retrieval date and spend zero. Builders and validation read local files. Import writes to Convex, requires a deployed schema, and spends no Sectors credits. Its eight table replacements run as separate imports, so an operator checks for a failed partial import before testing the app.

The import guard reads `.env.local` and accepts only `local:`, `anonymous:` or `dev:` deployment names. It rejects a missing name, production, preview, deploy keys in either the file or process environment, and a conflicting process deployment. It replaces the universe tables and leaves other tables alone.

## Calculation contract

[checks.mjs](../src/universe/checks.mjs) owns the ordered check definitions and deterministic calculations. Each applicable company/check pair has a numeric result or a gap, reporting period, cited inputs, peer count and optional percentile. [The check table](product-brief.md#lenses-and-checks) comes from that registry.

Null means not reported and never becomes a reported zero. A zero numerator can produce a measured zero; a zero denominator produces a gap. Calculations that require a positive base also reject negative bases. P/E and P/B history ratios require at least three positive annual reports. Dividend years count positive reported dividends; missing years remain null in the evidence, so zero years means no positive dividend reported rather than six reported zero dividends.

ROIC uses EBIT after tax divided by debt plus equity less cash. Its tax rate is tax divided by earnings before tax when the latter is positive and the rate lies from zero to one; other cases use 0.22. The input annotation states the selected rate and preserves the reported tax and earnings-before-tax inputs.

Capex can arrive with either sign. Reinvestment uses the absolute capex outflow. Provider free cash flow is stored as reported, rather than recalculated in React. See the [capex examples and limits](universe-data.md#calculation-and-display-rules).

## Peers and display states

Peers are reported, applicable values for the same check and sub-sector, including the subject. For `n` peers, percentile is `(below + 0.5 × (equal − 1)) / (n − 1)`, where below counts strictly smaller values and equal includes the subject. The percentile is null for fewer than five reported peers. Ties share their midrank; there is no direction or rating.

Measured cells show a value and percentile. Measured cells with fewer than five peers show a value and peer count without a percentile. Gap cells show Not reported, Not meaningful or Too little history and the human reason. Excluded checks show Does not apply, in quieter text without a button. Gaps have no peer line. The shared [presentation helper](../src/universe/presentation.mjs) applies these states to screener, company and group values.

The company peer strip uses rank positions across reported peers, with ties at their mean rank and a single peer at the center. Lowest and highest label the ends. A diamond outlines the subject; dot titles expose ticker and value. Rank spacing retains distinctions when raw values contain outliers.

## Ownership boundaries

Owner keys normalize legal-form variants while retaining core names and account qualifiers. Entity holdings remain separate source rows. Competition ranks compare reported entity stakes within each company and share ties. Missing percentages have no rank. Public and treasury holdings remain in company data but do not become owners or enter largest-entity-stake checks.

The graph has one center, one upstream holder level for listed owners, and downstream companies. Each column sorts by its largest reported stake, then name, with missing stakes last. Each column displays at most eight entities; a final +N more node links to its full list on the same page. Multiple source rows keep their percentages on one edge.

Custodian classification is a name hint about a holder of record. It does not resolve the beneficial owner. [The pattern rule](universe-data.md#custodian-rule) explains the matched institutions and account qualifiers. Provider business-group labels can overlap and do not establish control.

## Verification boundary

Type checks, lint/format checks, unit tests and production builds require no live provider data. Browser specs require a seeded dev deployment. An operator runs sync, backend deployment, import, code generation and browser tests. [App architecture](real-app-architecture.md) maps the routes and read models; [universe data](universe-data.md) defines the files and provenance.
