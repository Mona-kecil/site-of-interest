# Empire corpus design

## Usage

The sync script is the only production path into the corpus:

```sh
npm run sync:sectors
```

Application code then loads the generated records:

```js
const corpus = await loadEmpireCorpus("data/empires/prajogo");
const path = corpus.findPath("prajogo", "ptro");
const profile = corpus.getEntityProfile("cuan");
```

## Data boundary

`scripts/sync-sectors.mjs` discovers the reachable graph, fetches the required Sectors sections, derives normalized facts, validates the complete corpus, and only then writes JSON. API responses are cached so verification reruns do not consume credits.

Every source record must have:

- `provider: "sectors"`
- `kind: "api_response"`
- `authority: "data_provider"`
- an HTTPS URL on `api.sectors.app`

The manifest must declare `dataPolicy: "sectors_only"`. `validateCorpus()` rejects violations. This is a hard boundary, not a documentation promise.

## Shape

The corpus uses normalized collections:

- `manifest.json` declares scope, date, and the Sectors-only policy.
- `entities.json` stores people, business-group classifications, and legal entities returned by Sectors. Private and listed entities may carry an `empire` or `boundary` scope role.
- `relationships.json` stores ownership, group-membership, and inferred-affiliation edges with their corresponding scope.
- `assertions.json` attaches each edge to a Sectors response field.
- `facts.json` stores profile metrics, annual financials, valuation periods, derived signals, and data gaps.
- `sources.json` records the exact API requests.
- `coverage.json` records checked areas and the next Sectors request to make.

## Design decision

Two integration shapes were considered.

The first was a runtime backend proxy. It would always return fresh data, but it would add secret management, deployment failure modes, and API-credit usage during every demo.

The selected design is a reproducible sync command. It keeps the API key out of the browser, gives the demo stable data, and lets judges regenerate every displayed value. The tradeoff is that freshness depends on running the sync.

## Measurements and comparisons

Each listed profile keeps available leverage, cash-flow margin, quarterly growth, and valuation history with Sectors source locators. The company view calculates annual changes from two cited financial periods using a versioned formula. It shows the inputs, result, formula, and missing baselines without assigning a company stage or quality label.

Corporate shareholders are extracted conservatively from legal-name markers in Sectors company reports. Public float, treasury stock, people, and already-listed holders are excluded from this private-entity pass. Legal names are normalized for deduplication, while the Sectors display name is preserved.

Listed shareholders found in company reports receive the same boundary treatment when Sectors does not classify them with the selected group. The graph can therefore show RAJA's reported control of RATU without claiming that RAJA belongs to the Prajogo empire.
