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
| `/group/$slug` | Member graph, member companies and check summaries | `owners.group` |

The company query accepts lowercase ticker input. Domain route keys use ticker, canonical owner key and provider-label slug. Convex document IDs remain storage references. TanStack Links connect screener symbols and names to companies, companies to owners, and directories to detail pages. Graph nodes are SVG links routed through the TanStack history, so they navigate client-side; an owner graph's +N more node points to the holdings table anchor.

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
| [CompanyProfilePage.tsx](../src/features/company/CompanyProfilePage.tsx) | Company sections, current-section navigation, history tables, ownership network, holdings and evidence |
| [profile-model.ts](../src/features/company/profile-model.ts) | Section applicability, period slots, ranked peer strip and holding order |
| [owners-model.ts](../src/features/owners/owners-model.ts) | Owner filtering, sorting and type labels |
| [network.ts](../src/features/owners/network.ts) | Company, owner and group networks and their radial layout |
| [NetworkGraph.tsx](../src/features/owners/NetworkGraph.tsx) | SVG network drawing, legend and client-side node links |
| [check-copy.ts](../src/features/universe/check-copy.ts) | Plain calculation sentences, better direction and peer rank sentences |
| [CheckCalculation.tsx](../src/features/universe/CheckCalculation.tsx) | Calculation sentence, labelled input values and source date |
| [presentation.mjs](../src/universe/presentation.mjs) | Pure check states, gap text, input formatting and source summaries |
| [fields.mjs](../src/universe/fields.mjs) | Provider field registry, human labels, units and periods |
| [checks.mjs](../src/universe/checks.mjs) | Calculation registry and stored sub-sector percentiles |
| [owners.mjs](../src/universe/owners.mjs) | Canonical owner/group builders and custodian name hints |

Client types derive from Convex function return types. Pure model tests sit beside the modules. Node tests cover the file-based builders and display helpers; React tests mock queries without making backend calls.

## Stored read boundaries

The eight imported tables are companies, companyYears, companyQuarters, holdings, universeSources, checkResults, owners and businessGroups. Company rows include compact check summaries; evidence queries return full inputs and source rows on demand.

The owner read models use indexes and explicit bounds: 5,000 owners, 64 holdings per company and 128 groups. An exceeded bound raises an error instead of hiding rows. Owner holdings and group members are stored arrays, which the import caps at 256 elements. Graph caps affect the drawing only: eight shareholders and eight holdings around a company, six shareholders and eight holdings around an owner, and two shareholders per group member. The tables below each graph keep every returned row. [companyNetwork.ts](../convex/companyNetwork.ts) reads a company's shareholders, their other holdings and the company's own holdings in one query. Its stored bound is 100 shareholder rows, with an error on overflow; it returns up to four other holdings per shareholder and eight of the company's own holdings.

The frontend imports the small manifest for period slots and the source retrieval date. It does not import the full snapshot into the application bundle. It fetches company data through registered queries. Refreshing JSON requires an operator import before the live UI reads the new values.

See [system design](system-design.md) for the pipeline and calculation contracts, and [design system](product-design-system.md) for display rules.
