# System design

This document defines the target product contracts and identifies which parts exist in the repository. Read it before changing a data contract, route, collector, or product ticket.

## Implementation status

The repository has four working data paths.

The Empire path runs from `scripts/sync-sectors.mjs` to JSON under `data/empires/prajogo/`, then through `convex/seed.ts` into the Empire and company queries. React exposes `/empire/$slug` and `/empire/$empireSlug/company/$ticker`. The older `/company/$ticker` route remains for existing links and reads the Prajogo corpus.

The fundamental-signal path runs the rules in `src/features/today/fundamental-rules.ts` over parsed annual and valuation facts during the local corpus import. `convex/seed.ts` stores each value or gap in `fundamentalSignals`. `convex/fundamentalSignals.ts` serves the paginated feed, exact metric and period comparisons, source detail, and full company measurement list to `/happening`. The current corpus produces 350 signals for 10 listed companies. No provider call runs when a user opens the page.

The market-flow collector runs from `scripts/sync-market-flow.mjs` to immutable JSON under `data/market-flow/`. `src/market-flow.mjs` validates and reads those records. `scripts/build-broker-snapshot.mjs` derives daily broker buy-share measurements from all stored broker days. `scripts/build-market-snapshot.mjs` derives relative volume against the prior 20 stored trading days. Both builders use only local observations. The local seed imports 114 broker days, 114 broker measurements, 355 market days, and 100 market measurements across all 10 listed Prajogo companies. The feed and company view expose these records. An operator-only local command incrementally imports one broker window through an internal Convex mutation without replacing other Empire records.

The news path runs `scripts/sync-news.mjs` over a bounded Sectors IDX news window. `src/news-records.mjs` accepts only exact provider ticker matches. The local seed imports 97 September 2026 articles and their date-range coverage. The feed and company view display headlines, publication times, source URLs, and match rules. They omit sentiment tags and do not assign an event time.

A general event timeline, authentication, research cases, and multi-Empire import remain target contracts. The broker and Empire-context paths now work for the Prajogo corpus. Shared rules and read models must still accept an Empire key. The fundamental feed uses each provider fact's `asOf` date. It does not claim that a historical annual fact was newly reported on that date.

## Product boundary

Site of Interest maps imported records about Indonesian conglomerates and calculates reproducible comparisons across their listed companies. It reports facts, calculations, and gaps. The user decides what those values mean. The app does not recommend trades or classify a measurement as normal, abnormal, positive, negative, suspicious, or important.

A measured signal is the root of the target research flow. The user opens its company, source records, and Empire context. The Empire graph contains people, business groups, companies, assets, and relationships. Financial records, market observations, broker observations, events, news, and signals refer to graph entities. They are not graph edges.

Sectors is the only market-intelligence provider in the current implementation. A static geographic file may supply map geometry. It cannot supply a company, relationship, asset, production figure, financial value, market observation, broker observation, event, or news claim.

## Claim states

Every user-visible claim has one state:

- **Fact** contains a normalized provider value and at least one source reference.
- **Calculation** contains a deterministic result, cited inputs, and a formula version.
- **Gap** contains the unanswered question, the checked data area, and the check time.

Never convert a gap into a fact. Present a provider group label as an attributed provider fact, not as legal ownership. Do not derive an investor from a broker code or causation from the timing of news and market activity.

## Data flow

The target flow extends the implemented paths:

```text
Sectors API
    ↓ authenticated provider client
Boundary parser
    ↓ normalized provider facts
Snapshot importer or observation collector
    ↓ persisted records
Versioned signal rule
    ↓ measured signal
Route-specific Convex query
    ↓ bounded read model
React workspace
    ↓ authenticated user action
Research case
```

The provider client owns credentials, request budgets, caching, and HTTP failures. A boundary parser validates one provider response and returns a named domain record. Code after that boundary trusts the normalized record.

Convex stores records needed by React. Pure functions calculate metrics and signals from normalized inputs. React owns layout, selection, filters, and other session-only state. React does not parse provider responses or read Convex tables without a registered function.

## Routes

The current and target routes are:

| Research task | Current route | Target route |
| --- | --- | --- |
| Open the default application | Redirects to `/happening` | `/happening` |
| Inspect one Empire | `/empire/$slug` | `/empire/$empireSlug` |
| Inspect one listed company | `/empire/$empireSlug/company/$ticker`; legacy `/company/$ticker` | `/empire/$empireSlug/company/$ticker` |
| Inspect one research case | Not implemented | `/research/$caseId` |

The target company route includes `empireSlug` because one ticker may appear as a member or boundary entity in more than one imported Empire. Do not add a private-entity route until the Empire inspector can no longer complete a named private-company research task.

## Domain contracts

### Empire graph

The Empire domain owns:

- the manifest and coverage date;
- people, business groups, listed companies, private companies, operating companies, and assets;
- Empire membership and boundary status;
- ownership, control, and affiliation relationships;
- assertions that support or challenge each relationship; and
- source references and coverage gaps.

An affiliation relationship requires an assertion separate from an ownership relationship. A boundary entity connects to an Empire member but lacks evidence that establishes group membership.

The Sectors company screener's `affiliates` field seeds the listed-company universe for an Empire. The boundary parser preserves the returned affiliate label and source field. It emits provider-reported membership, not ownership or control. Company reports and ownership data may extend the universe or contradict the initial classification. The importer preserves both records when they disagree.

The graph does not store daily market rows, broker rows, user notes, or financial histories inside entity documents.

### Fundamentals

The Fundamentals domain owns provider financial records, provider valuation records, peer-set definitions, sector templates, and versioned calculations.

A sector template names every metric that the company view may compare. A calculation records its formula version, input references, reporting period, and calculation time. Provider facts remain unchanged when a formula changes.

The current corpus stores annual financial records, valuation periods, profile metrics, provider measurements, and data gaps in `companyFacts`. The importer stores calculated fundamental results separately in `fundamentalSignals` so the cross-company feed can use indexed queries. The current rule set covers annual revenue, earnings, operating cash flow, and free cash flow changes; operating cash flow divided by earnings; debt divided by assets; earnings divided by assets; and provider-reported P/E. Unknown sectors receive no template. Financial-sector templates exclude debt divided by assets.

The corpus has no defined peer set, daily price series, book value, EBITDA, or dividend inputs for these rules. The feed does not calculate peer rankings, P/BV, EV/EBITDA, or dividend yield.

### Market

The Market domain owns one observation per `ticker + tradingDate`. The current record contains open, high, low, close, volume, market capitalization, and source metadata. Add turnover, reference price, or an exchange limit only when the provider response supplies that field and the boundary parser validates it.

Market rules provide context for fundamental and broker research. They do not produce trade recommendations.

### Broker flow

The Flow domain owns one broker row per `brokerCode + ticker + tradingDate`. A row contains provider-reported buy values, sell values, buy volumes, sell volumes, net values, net volumes, and average prices.

The broker registry stores broker metadata separately from ticker activity. A rule may calculate a value and emit it when it crosses a threshold. It cannot assign a permanent investor type or trading role to a broker.

### Events and news

An event record represents a corporate action or another provider event with a defined event type. A news record represents one provider news item. Both records may refer to multiple entities.

An entity match stores the provider item, matched `entityId`, and exact match rule. Match rules may use a provider ID, ticker, legal name, or registered alias. A failed or ambiguous match becomes a gap. The importer does not select the closest display name.

The repository has a news schema for exact ticker matches from the Sectors IDX news response. It has no general corporate-event schema. Sectors news items in the imported window have no provider item ID or separate event time. The importer derives a stable app key from the source URL, title, and publication time. News does not establish a relationship unless the provider response states that relationship.

### Measured signals

The Signals domain owns stored results from versioned rules. The current fundamental rules define inputs, reporting period, formula, output unit, and a gap when an input is missing. Windows, thresholds, and expiry conditions apply to later broker and market rules.

The current fundamental signal stores:

- a deterministic `stableId`, `metricId`, and `ruleVersion`;
- `empireSlug`, `entityId`, and ticker;
- the reporting period and provider fact date;
- exact input record references;
- the calculated value and unit;
- either a numeric value or a named gap.

For fixed inputs and a fixed rule version, signal generation produces the same identity and value. A formula change requires a new rule version. `seed:replacePrajogo` replaces the stored Prajogo signal set in one transaction; a repeat import does not append duplicates. Supersession and expiry are future contracts.

A signal reports a measurement. It does not describe the result as normal, abnormal, positive, negative, suspicious, or important. It does not claim manipulation, insider activity, coordinated trading, or beneficial ownership.

### Research

The Research domain owns cases, notes, open questions, cited record references, watch conditions, and review states. Every query and mutation derives the user identity from Convex authentication. A client argument never determines record ownership.

User text cannot become a provider fact, relationship assertion, or calculation input. If a cited signal expires or is superseded, the case keeps the citation and displays that state.

Research tables and routes are blocked until the application has an authentication provider and `convex/auth.config.ts`.

## Stable identity

Use these keys at file, import, query, and route boundaries:

- Empire: `empireSlug`
- Entity within an Empire: `empireSlug + entityId`
- Relationship: `empireSlug + relationshipId`
- Listed company within an Empire: `empireSlug + ticker`
- Company fact: `empireSlug + factId`
- Market observation: `ticker + tradingDate`
- Broker observation: `brokerCode + ticker + tradingDate`
- Provider event: `provider + providerItemId` when the provider supplies an ID
- Current news item: hash of `provider + source URL + title + publication time`
- Signal: `ruleId + ruleVersion + empireSlug + subjectId + observationPeriod`
- Source within an Empire corpus: `empireSlug + sourceId`

Keep two records separate when two Empires contain the same display name, ticker, or provider name. Merge identity across Empires only after a separate identity process proves that both records refer to the same legal entity. The current design does not require that merge.

Convex `_id` values stay inside Convex functions. Routes, imported corpora, signals, and evidence references use domain keys.

## Data lifecycles

### Corpus snapshots

`scripts/sync-sectors.mjs` builds the checked-in Prajogo snapshot. The snapshot contains the manifest, entities, relationships, assertions, sources, company facts, and coverage records. `convex/seed.ts` replaces the imported Prajogo records by stable keys.

Each Empire import follows the same discovery sequence:

1. Query the company screener by an exact configured `affiliates` label.
2. Store every returned listed company as provider-reported membership.
3. Fetch company reports for the discovered tickers.
4. Add direct owners, listed descendants, and private corporate entities from cited ownership records.
5. Classify entities without separate group evidence as boundary entities.
6. Validate the complete snapshot before import.

The React application and Convex queries read the stored snapshot. They do not call the affiliate screener during a page request.

A corpus refresh is an explicit command because a cold sync spends Sectors credits. The command writes a complete validated snapshot. It does not mutate the previous JSON files one record at a time.

Before scheduled refreshes replace explicit commands, the design must add snapshot history or change records. Otherwise a refresh would erase the evidence needed to review an ownership change.

### Market and broker observations

`scripts/sync-market-flow.mjs` fetches bounded date ranges and creates one immutable partition per ticker and trading date. If a partition already contains the same facts, a rerun leaves it unchanged. If the facts differ, the writer reports a conflict and keeps the stored partition.

Daily valuation refresh must not assume one provider request per ticker. The preferred candidate is one structured `/v2/companies/` query for up to 200 registered tickers, returning `last_close_price` and `daily_close_change` for one credit. Verify the returned price fields and their date semantics with one bounded request before implementation. If that contract is insufficient, `/v2/close/` is the documented fallback: one dated full-universe close feed, paginated at 30 tickers and billed at one credit per page.

The current company workspace reads stored history and does not request Sectors data. An operator collects a bounded window with `--broker-only` and an explicit credit cap, then imports stored broker days into local Convex through an internal mutation. The provider client caches requests, and the importer matches identical retries without rewriting source days. First-release collection is limited to the listed Prajogo companies. Do not collect a 60-session broker baseline by default; broker-summary responses cover at most 14 calendar days per request.

Opening a company page does not start a backfill. Automatic or user-requested provider collection is not implemented. Any future fetch path must disclose the endpoint window and estimated cost before the request and enforce a credit cap.

Before an explicit collection run, report the ticker set, requested range, and worst-case credit cost. Report cache hits and actual credits on completion. The current collector's cap defaults to zero. Adding another Empire does not automatically add its tickers to a daily broker or market refresh.

### Signal generation

Generate a signal only after all input records exist. A rule reads normalized records, evaluates its versioned calculation, and upserts the result. It never edits a source record.

Recompute a signal when an input record changes, when a new observation completes its period, or when a new rule version replaces the old version. Preserve the old result with a superseded state when a research case cites it.

### User state

Research cases, notes, watch conditions, and review states change independently of provider records. Store them in user-owned tables. Check the authenticated identity on every read and write.

## Read models

Every Convex query uses an index and either a fixed maximum or pagination. A query must state its ordering when the product depends on that order.

The Empire query returns at most 500 records from each of entities, relationships, assertions, and sources. It requests one extra row and fails if any group exceeds that limit. A second Empire with a larger graph needs pagination before import.

The target Empire view supplies context after the user opens it from a signal, company, or news item. It reads the graph, a fixed number of recent signals, and a fixed number of timeline items. It does not read market or broker history for every listed company.

The target company view reads the stable profile and bounded summaries for fundamentals, market activity, broker activity, events, news, and Empire membership. Each historical series uses pagination or a documented maximum.

The target **What's happening?** view reads paginated signal summaries in reverse observation-time order for a bounded date range. Today and Yesterday are presets over the same date-range contract. Filters use indexed fields. Signal detail loads cited inputs after the user opens one signal.

## Evidence access

Never send `SECTORS_API_KEY` or an authenticated Sectors URL to the browser.

For a provider fact, calculation, or gap, show:

- the claim state;
- the provider and source title;
- the reporting or observation period;
- the retrieval time;
- the API path without credentials; and
- the provider field locator when the claim refers to one response field.

For a calculation, also show its input record references and formula version.

## Module ownership

The current modules are:

```text
convex/empires.ts
convex/companies.ts
src/features/empire/
src/features/company/
src/market-flow.mjs
src/on-demand-flow.mjs
```

Add target modules only with the vertical slice that uses them:

```text
convex/fundamentals.ts
convex/market.ts
convex/flow.ts
convex/events.ts
convex/news.ts
convex/signals.ts
convex/research.ts
src/features/today/
src/features/research/
```

Provider clients and boundary parsers stay outside React. Pure functions own calculations, signal rules, ranking, and transformations into display records. JSX owns layout and interaction. Client types derive from Convex function return types when those types already describe the record.

## Vertical delivery contract

A ticket is complete only when one research task works through the full data path. The ticket includes:

1. a provider response or existing normalized record;
2. a boundary parser with failure tests;
3. an indexed storage record when the task needs persistence;
4. a bounded Convex query or mutation with argument and return validators;
5. a reachable React route;
6. visible sources, calculations, and gaps;
7. a browser test of the research task;
8. type checks, unit tests, a production build, and corpus validation; and
9. a statement of the provider credits spent by the tested path.

Do not split one research task into separate frontend, backend, and database tickets. Those are implementation steps within one ticket.

## Prototype rule

Build data contracts and product work in the production application. Use a disposable prototype only to compare interaction designs.

Before writing a prototype, record one question, the alternatives, and a time limit. Do not put a provider client, domain record, or persistence code in the prototype. After the comparison, record the selected interaction, implement it in the production feature, and delete the prototype.

Do not maintain a second frontend. Git retains discarded experiments.

## Design constraints

- Bound every new Convex query with an index and a fixed maximum or pagination.
- Add argument and return validators to every new Convex function.
- Make imports, collectors, and signal generation safe to rerun.
- Store provider facts before calculations.
- Version every signal rule and calculation formula.
- Keep each broker observation specific to one ticker and trading date.
- Keep daily observations separate from stable entity records.
- Display the coverage date and every known gap.
- Make every signal reproducible from displayed inputs.
- Read the applicable exchange limit from a validated record.
- Complete one research task before starting another route.
