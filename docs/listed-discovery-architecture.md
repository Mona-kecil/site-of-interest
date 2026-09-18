# Listed ownership discovery

## Problem

The previous sync finished listed-company discovery before CUAN's mining response introduced PTRO. It never searched for companies owned by PTRO, so it missed SINI even though Sectors exposes the direct shareholding.

## Usage

```js
const discovery = await discoverListedOwnership({
  seeds: [...directPrajogoCompanies, ...listedMiningCompanies],
  maxDepth: 6,
  maxCompanies: 50,
  expand: findListedChildren
});
```

The caller receives deduplicated companies, direct ownership relationships, discovery sources, and a `truncated` flag.

## Shape

`discoverListedOwnership()` owns one breadth-first queue. Every listed company found by any Sectors adapter enters that queue. The function tracks visited symbols, processes each symbol once, stops at explicit limits, and returns domain records rather than API response shapes.

The Sectors adapter validates exact owner symbols and percentages before returning relationships. The queue trusts those records. This keeps API parsing at the boundary and traversal policy in a pure, testable module.

## Synthesis decision

Two shapes were considered. A stateful crawler object could accept discoveries at any time, but callers would need to understand its lifecycle. A bounded breadth-first function hides the queue and limits behind one call, so it is the selected design.

## Tradeoffs accepted

- We accept breadth-first API batches in exchange for predictable depth and fewer requests than one query per company.
- We accept a hard company limit in exchange for protection against unexpectedly broad ownership networks.
- We keep private-company upstream links unresolved unless Sectors provides ownership evidence.

## Alternatives considered

An event-driven graph reducer would make future adapters easy to plug in. It lost because it adds event types, reducer state, and lifecycle rules for a sync that currently has two discovery inputs.

## Open questions and risks

- Could one exact-name batch exceed the Sectors query-length limit when a frontier becomes large?
- Should future private-company endpoints enter the same queue or use a separate ownership traversal?

## Next implementation step

Make the SINI regression test pass, then replace the phased listed loop in the sync script.
