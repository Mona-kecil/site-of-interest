# App architecture

React 19 renders the research routes through TanStack Router. Convex serves the imported snapshot. Vite+ runs development, formatting, linting, unit tests and builds. The browser uses read-only queries for the research surface; session filters, sort, selected lens and evidence disclosures stay in React.

## Routes and read models

| Route | Task | Convex query |
| --- | --- | --- |
| `/` | Landing: verdict tally, sample ratings, rule lines and one traced number | `universe.screen`, `universe.check` |
| `/ideas` | Ideas, fixed rules, Worth a look and Red flags with evidence | `universe.screen` |
| `/universe` | Search, filter by verdict, sort and inspect six check lenses | `universe.screen`, `universe.check` |
| `/company/$ticker` | Verdict, pillar evidence, annual/quarterly history, peers and holders | `companyProfile.get` |
| `/owners` | Search owners and filter listed company owners | `owners.list` |
| `/owner/$key` | Holdings, co-holders and one upstream level | `owners.get` |
| `/groups` | Browse Sectors business-group labels | `owners.groups` |
| `/group/$slug` | Member companies and check summaries | `owners.group` |

The company query accepts lowercase ticker input. Domain route keys use ticker, canonical owner key and provider-label slug. Convex document IDs remain storage references. TanStack Links connect screener symbols and names to companies, companies to owners, and directories to detail pages. Graph overflow nodes use page anchors.

## Module roles

| Module | Role |
| --- | --- |
| [router.tsx](../src/router.tsx) | App shell and route registration |
| [LandingPage.tsx](../src/features/landing/LandingPage.tsx) | Landing tally, ratings chart, ticker lookup, rule rulers and source trace |
| [IdeasPage.tsx](../src/features/ideas/IdeasPage.tsx) | Ideas lists, rules and registry-generated evidence text |
| [evidence.ts](../src/features/ideas/evidence.ts) | Outcome labels, verdict descriptions and measurement formats shared by the landing, Ideas and company pages |
| [ideas-model.ts](../src/features/ideas/ideas-model.ts) | Pure pillar rules, class-specific core pillars, verdict labels and assessment shared by all three surfaces |
| [UniversePage.tsx](../src/features/universe/UniversePage.tsx) | Screener, keyboard lens tabs and evidence panel |
| [universe-model.ts](../src/features/universe/universe-model.ts) | Pure filters, sort, lens order and number-format exports |
| [CompanyProfilePage.tsx](../src/features/company/CompanyProfilePage.tsx) | Company sections, history tables, holdings and evidence |
| [profile-model.ts](../src/features/company/profile-model.ts) | Section applicability, period slots, ranked peer strip and holding order |
| [owners-model.ts](../src/features/owners/owners-model.ts) | Owner filtering, sorting and capped graph layout |
| [OwnershipGraph.tsx](../src/features/owners/OwnershipGraph.tsx) | SVG nodes, reported stake edges and table anchors |
| [CheckInput.tsx](../src/features/universe/CheckInput.tsx) | Human input labels, unit formatting, raw values and source disclosure |
| [presentation.mjs](../src/universe/presentation.mjs) | Pure check states, gap text, input formatting and source summaries |
| [fields.mjs](../src/universe/fields.mjs) | Provider field registry, human labels, units and periods |
| [checks.mjs](../src/universe/checks.mjs) | Calculation registry and sub-sector percentiles |
| [owners.mjs](../src/universe/owners.mjs) | Canonical owner/group builders and custodian name hints |

Client types derive from Convex function return types. Pure model tests sit beside the modules. Node tests cover the file-based builders and display helpers; React tests mock queries without making backend calls.

## Stored read boundaries

The eight imported tables are companies, companyYears, companyQuarters, holdings, universeSources, checkResults, owners and businessGroups. Company rows include compact check summaries; evidence queries return full inputs and source rows on demand.

The owner read models use indexes and explicit bounds: 5,000 owners, 128 owner holdings, 64 holdings per company, 128 groups and 1,024 group members. An exceeded bound raises an error instead of hiding rows. The graph's eight-node limit affects the drawing only; the full detail list retains the returned rows.

The frontend imports the small manifest for period slots and source batch/range labels. It does not import the full snapshot into the application bundle. It fetches company data through registered queries. Refreshing JSON requires an operator import before the live UI reads the new values.

See [system design](system-design.md) for the pipeline and calculation contracts, and [design system](product-design-system.md) for display rules.
