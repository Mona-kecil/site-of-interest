# Empire interface design

## Interaction contract

The graph and intelligence panel share one selection state:

```js
selectNode("cuan");
selectRelationship("prajogo-cuan");
traceSini();
```

Selecting a node opens its Company Profile. Selecting an edge opens the Sectors-backed relationship evidence. `Trace SINI` isolates the three-step ownership path from Prajogo through CUAN and PTRO.

## Layout

The interface derives graph positions from the ownership data. It does not store presentation coordinates in the corpus. Wide subsidiary layers wrap across visual rows so the CUAN branch remains readable.

Users can drag and pin nodes, release them with Reflow, switch to a focus orbit, and filter for controlling or minority positions.

## Company Profile

Each listed-company profile groups normalized Sectors facts into:

- current and previous P/E values;
- latest profile and financial metrics;
- five annual financial periods;
- year-over-year annual changes with their formula and source periods;
- provider-reported ratios and quarterly growth values;
- explicit gaps in Sectors coverage;
- research coverage, relationships, and exact API sources.

The analysis command exports the same numeric fields for each listed company. It does not assign cycle stages or order companies by a hidden score.

Profiles for operating entities that have not been synced remain sparse. The interface shows the next API action rather than filling empty sections with outside research.

## Source visibility

Every visible fact or relationship resolves to a `sources.json` record and field locator. The UI identifies Sectors as the data provider. The corpus validator prevents another host from appearing in this list.
